import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classifyContract,
  analyzeClausesWithPlaybook,
  generateSummary,
} from "@/lib/claude";

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

  try {
    const contract = await prisma.contract.findFirst({
      where: { id, userId },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Update status to analyzing
    await prisma.contract.update({
      where: { id },
      data: { status: "analyzing" },
    });

    // Step 1: Classify the contract
    const classification = await classifyContract(contract.originalText);

    await prisma.contract.update({
      where: { id },
      data: {
        contractType: classification.contractType,
        paperType: classification.paperType,
      },
    });

    // Step 2: Get playbook rules for this contract type
    const playbookProfile = await prisma.playbookProfile.findFirst({
      where: {
        userId,
        OR: [
          { contractType: classification.contractType },
          { isDefault: true },
        ],
      },
      include: { rules: true },
      orderBy: { isDefault: "asc" }, // Prefer type-specific over default
    });

    const rules = (playbookProfile?.rules || []).map((r) => ({
      name: r.name,
      category: r.category,
      description: r.description,
      condition: r.condition,
      severity: r.severity as "critical" | "warning" | "info",
      enabled: r.enabled,
    }));

    // Step 3: Analyze clauses with playbook
    const clauseAnalysis = await analyzeClausesWithPlaybook(
      contract.originalText,
      classification.contractType,
      rules
    );

    // Save clause analysis
    await prisma.clauseAnalysis.createMany({
      data: clauseAnalysis.map((clause) => ({
        contractId: id,
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

    // Step 4: Generate summary
    const summary = await generateSummary(
      contract.originalText,
      classification.contractType,
      clauseAnalysis
    );

    await prisma.reviewSummary.create({
      data: {
        contractId: id,
        overallRisk: summary.overallRisk,
        executiveSummary: summary.executiveSummary,
        keyFindings: summary.keyFindings as string[],
        missingClauses: summary.missingClauses as string[],
      },
    });

    // Update status to completed
    await prisma.contract.update({
      where: { id },
      data: { status: "completed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analysis error:", error);

    const message =
      error instanceof Error ? error.message : "Analysis failed. Please try again.";

    await prisma.contract.update({
      where: { id },
      data: { status: "error" },
    });

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
