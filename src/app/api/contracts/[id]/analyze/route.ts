import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classifyContract,
  analyzeClausesWithPlaybook,
  analyzeClausesChunked,
  generateSummary,
} from "@/lib/claude";
import { chunkContractText } from "@/lib/chunker";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const contract = await prisma.contract.findFirst({
    where: { id, userId },
  });

  if (!contract) {
    return NextResponse.json(
      { error: "Contract not found" },
      { status: 404 }
    );
  }

  // Mark as analyzing immediately
  await prisma.contract.update({
    where: { id },
    data: {
      status: "analyzing",
      analysisProgress: 0,
      analysisStage: "classifying",
    },
  });

  // Fire-and-forget: run the pipeline after the response is sent
  after(runAnalysisPipeline(id, contract.originalText, userId));

  return NextResponse.json({ status: "analyzing", contractId: id });
}

async function runAnalysisPipeline(
  contractId: string,
  text: string,
  userId: string
) {
  try {
    // Step 1: Classify the contract (~3s)
    const classification = await classifyContract(text);

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        contractType: classification.contractType,
        paperType: classification.paperType,
        analysisProgress: 10,
        analysisStage: "analyzing",
      },
    });

    // Step 2: Get playbook rules
    const playbookProfile = await prisma.playbookProfile.findFirst({
      where: {
        userId,
        OR: [
          { contractType: classification.contractType },
          { isDefault: true },
        ],
      },
      include: { rules: true },
      orderBy: { isDefault: "asc" },
    });

    const rules = (playbookProfile?.rules || []).map((r) => ({
      name: r.name,
      category: r.category,
      description: r.description,
      condition: r.condition,
      severity: r.severity as "critical" | "warning" | "info",
      enabled: r.enabled,
    }));

    // Step 3: Chunk and analyze
    const chunks = chunkContractText(text);
    const isSmallContract = chunks.length === 1;

    await prisma.contract.update({
      where: { id: contractId },
      data: { totalChunks: chunks.length },
    });

    let clauseAnalysis;
    let completedSoFar = 0;

    if (isSmallContract) {
      // Small contract: single-call path (same as before)
      clauseAnalysis = await analyzeClausesWithPlaybook(
        text,
        classification.contractType,
        rules
      );
      await prisma.contract.update({
        where: { id: contractId },
        data: { analysisProgress: 80, completedChunks: 1 },
      });
    } else {
      // Large contract: chunked parallel analysis
      clauseAnalysis = await analyzeClausesChunked(
        chunks,
        classification.contractType,
        rules,
        async (_chunkIndex) => {
          completedSoFar++;
          const progress = 10 + Math.round((completedSoFar / chunks.length) * 70);
          await prisma.contract.update({
            where: { id: contractId },
            data: {
              completedChunks: completedSoFar,
              analysisProgress: progress,
            },
          });
        }
      );
    }

    // Step 4: Save clause analysis
    await prisma.clauseAnalysis.createMany({
      data: clauseAnalysis.map((clause) => ({
        contractId,
        clauseNumber: clause.clauseNumber,
        clauseType: clause.clauseType,
        originalText: clause.originalText,
        riskLevel: clause.riskLevel,
        explanation: clause.explanation,
        playbookViolations: clause.playbookViolations as object[],
        redlineSuggestion: clause.redlineSuggestion || null,
        redlineExplanation: clause.redlineExplanation || null,
      })),
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: { analysisProgress: 85, analysisStage: "summarizing" },
    });

    // Step 5: Generate summary
    const summary = await generateSummary(
      text,
      classification.contractType,
      clauseAnalysis
    );

    await prisma.reviewSummary.create({
      data: {
        contractId,
        overallRisk: summary.overallRisk,
        executiveSummary: summary.executiveSummary,
        keyFindings: summary.keyFindings as string[],
        missingClauses: summary.missingClauses as string[],
      },
    });

    // Step 6: Mark complete
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "completed",
        analysisProgress: 100,
        analysisStage: "complete",
      },
    });
  } catch (error) {
    console.error("Analysis pipeline error:", error);
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "error",
        analysisStage: "error",
      },
    });
  }
}
