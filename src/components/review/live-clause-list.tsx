"use client";

import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClauseCard } from "./clause-card";
import { ReviewSummary } from "./review-summary";
import { RiskHeatmap } from "./risk-heatmap";
import { Loader2 } from "lucide-react";

interface PlaybookViolation {
  ruleName: string;
  category: string;
  severity: string;
  description: string;
}

interface ClauseRow {
  id: string;
  clauseNumber: number;
  clauseType: string;
  originalText: string;
  riskLevel: string;
  explanation: string;
  playbookViolations: PlaybookViolation[] | unknown;
  redlineSuggestion: string | null;
  redlineExplanation: string | null;
  userRedline: string | null;
  userNote: string | null;
  status: string;
}

interface SummaryRow {
  overallRisk: string;
  executiveSummary: string;
  keyFindings: string[] | unknown;
  missingClauses: string[] | unknown;
}

interface LiveClauseListProps {
  contractId: string;
  contractType: string | null;
  paperType: string | null;
  initialClauses: ClauseRow[];
  initialSummary: SummaryRow | null;
  initialStatus: string;
}

function stageLabel(stage: string | null | undefined): string {
  switch (stage) {
    case "classifying":
      return "Classifying contract type...";
    case "analyzing":
      return "Analyzing clauses with AI...";
    case "summarizing":
      return "Generating executive summary...";
    case "complete":
      return "Analysis complete";
    default:
      return "Processing...";
  }
}

const POLL_INTERVAL = 3000;

export function LiveClauseList({
  contractId,
  contractType,
  paperType,
  initialClauses,
  initialSummary,
  initialStatus,
}: LiveClauseListProps) {
  const [clauses, setClauses] = useState<ClauseRow[]>(initialClauses);
  const [summary, setSummary] = useState<SummaryRow | null>(initialSummary);
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(
    initialStatus === "completed" ? 100 : 0
  );
  const [stage, setStage] = useState(
    initialStatus === "completed" ? "complete" : "analyzing"
  );
  const [chunkInfo, setChunkInfo] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const isAnalyzing = status === "analyzing";

  const pollForUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/clauses`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();

      // Update clauses if we got new ones
      if (data.clauses && data.clauses.length > clauses.length) {
        setClauses(data.clauses);
      }

      setProgress(data.analysisProgress || 0);
      setStage(data.analysisStage || "analyzing");

      if (data.totalChunks && data.totalChunks > 1) {
        setChunkInfo({
          completed: data.completedChunks || 0,
          total: data.totalChunks,
        });
      }

      if (data.summary) {
        setSummary(data.summary);
      }

      if (data.status === "completed" || data.status === "error") {
        setStatus(data.status);
        // One final fetch to get all clauses with final numbering
        if (data.status === "completed") {
          setClauses(data.clauses);
          if (data.summary) setSummary(data.summary);
        }
      }
    } catch {
      // Silently retry on next interval
    }
  }, [contractId, clauses.length]);

  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(pollForUpdates, POLL_INTERVAL);
    // Poll immediately on mount too
    pollForUpdates();

    return () => clearInterval(interval);
  }, [isAnalyzing, pollForUpdates]);

  const highRiskCount = clauses.filter((c) => c.riskLevel === "high").length;
  const totalViolations = clauses.reduce(
    (acc, c) => acc + ((c.playbookViolations as unknown[]) || []).length,
    0
  );

  return (
    <Tabs defaultValue="clauses">
      <TabsList>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="clauses">
          Clauses ({clauses.length}
          {isAnalyzing ? "..." : ""})
        </TabsTrigger>
        <TabsTrigger value="heatmap">Risk Map</TabsTrigger>
      </TabsList>

      {/* Progress bar shown during analysis */}
      {isAnalyzing && (
        <div className="mt-4 flex flex-col items-center rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {stageLabel(stage)}
          </div>
          <Progress value={progress} className="mt-2 w-full max-w-sm" />
          {chunkInfo && chunkInfo.total > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Section {Math.min(chunkInfo.completed + 1, chunkInfo.total)} of{" "}
              {chunkInfo.total}
            </p>
          )}
        </div>
      )}

      <TabsContent value="summary" className="mt-4">
        {summary ? (
          <ReviewSummary
            summary={{
              overallRisk: summary.overallRisk,
              executiveSummary: summary.executiveSummary,
              keyFindings: summary.keyFindings as string[],
              missingClauses: summary.missingClauses as string[],
            }}
            contractType={contractType}
            paperType={paperType}
            clauseCount={clauses.length}
            highRiskCount={highRiskCount}
            violationCount={totalViolations}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Executive summary will appear when analysis completes.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can review clauses in the meantime.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="clauses" className="mt-4 space-y-3">
        {clauses.length === 0 && isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Clauses will appear here as they are analyzed...
            </p>
          </div>
        ) : (
          <>
            {clauses.map((clause) => (
              <ClauseCard
                key={clause.id}
                clause={{
                  ...clause,
                  playbookViolations:
                    clause.playbookViolations as PlaybookViolation[],
                }}
              />
            ))}
            {isAnalyzing && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Analyzing more clauses...
                </p>
              </div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="heatmap" className="mt-4">
        {clauses.length > 0 ? (
          <RiskHeatmap clauses={clauses} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Risk map will appear as clauses are analyzed.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
