import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LiveClauseList } from "@/components/review/live-clause-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";

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
          {contract.status === "completed" && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/export/pdf?id=${contract.id}`}>
                <Download className="mr-1 h-4 w-4" />
                Export PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {contract.status === "error" ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium text-destructive">
            Analysis failed
          </p>
          <p className="text-sm text-muted-foreground">
            There was an error analyzing this contract. Please try uploading
            again.
          </p>
        </div>
      ) : (
        <LiveClauseList
          contractId={contract.id}
          contractType={contract.contractType}
          paperType={contract.paperType}
          initialClauses={contract.clauses.map((c) => ({
            ...c,
            playbookViolations: c.playbookViolations as unknown as {
              ruleName: string;
              category: string;
              severity: string;
              description: string;
            }[],
          }))}
          initialSummary={
            contract.summary
              ? {
                  overallRisk: contract.summary.overallRisk,
                  executiveSummary: contract.summary.executiveSummary,
                  keyFindings: contract.summary.keyFindings as string[],
                  missingClauses: contract.summary.missingClauses as string[],
                }
              : null
          }
          initialStatus={contract.status}
        />
      )}
    </div>
  );
}
