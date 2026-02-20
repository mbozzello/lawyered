import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewSummary } from "@/components/review/review-summary";
import { ClauseCard } from "@/components/review/clause-card";
import { RiskHeatmap } from "@/components/review/risk-heatmap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { AnalysisPolling } from "@/components/review/analysis-polling";

export default async function ReviewResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return notFound();

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const contract = await prisma.contract.findFirst({
    where: { id, userId },
    include: {
      clauses: { orderBy: { clauseNumber: "asc" } },
      summary: true,
    },
  });

  if (!contract) return notFound();

  const highRiskCount = contract.clauses.filter(
    (c) => c.riskLevel === "high"
  ).length;
  const totalViolations = contract.clauses.reduce(
    (acc, c) => acc + (c.playbookViolations as unknown[]).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/history">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{contract.filename}</h1>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {contract.contractType && (
                <Badge variant="outline">{contract.contractType}</Badge>
              )}
              {contract.paperType && (
                <Badge variant="secondary">
                  {contract.paperType === "internal"
                    ? "Our Paper"
                    : "External Paper"}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Reviewed{" "}
                {new Date(contract.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/export/pdf?id=${contract.id}`}>
              <Download className="mr-1 h-4 w-4" />
              Export PDF
            </a>
          </Button>
        </div>
      </div>

      {contract.status === "completed" && contract.summary ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="clauses">
              Clauses ({contract.clauses.length})
            </TabsTrigger>
            <TabsTrigger value="heatmap">Risk Map</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <ReviewSummary
              summary={{
                overallRisk: contract.summary.overallRisk,
                executiveSummary: contract.summary.executiveSummary,
                keyFindings: contract.summary.keyFindings as string[],
                missingClauses: contract.summary.missingClauses as string[],
              }}
              contractType={contract.contractType}
              paperType={contract.paperType}
              clauseCount={contract.clauses.length}
              highRiskCount={highRiskCount}
              violationCount={totalViolations}
            />
          </TabsContent>

          <TabsContent value="clauses" className="mt-4 space-y-3">
            {contract.clauses.map((clause) => (
              <ClauseCard
                key={clause.id}
                clause={{
                  ...clause,
                  playbookViolations:
                    clause.playbookViolations as unknown as {
                      ruleName: string;
                      category: string;
                      severity: string;
                      description: string;
                    }[],
                }}
              />
            ))}
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            <RiskHeatmap clauses={contract.clauses} />
          </TabsContent>
        </Tabs>
      ) : contract.status === "analyzing" ? (
        <AnalysisPolling contractId={contract.id} />
      ) : contract.status === "error" ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium text-destructive">
            Analysis failed
          </p>
          <p className="text-sm text-muted-foreground">
            There was an error analyzing this contract. Please try uploading
            again.
          </p>
        </div>
      ) : null}
    </div>
  );
}
