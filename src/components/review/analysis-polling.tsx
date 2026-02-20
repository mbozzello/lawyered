"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

function stageLabel(stage: string | null | undefined): string {
  switch (stage) {
    case "classifying":
      return "Classifying contract type...";
    case "analyzing":
      return "Analyzing clauses with AI...";
    case "summarizing":
      return "Generating executive summary...";
    case "complete":
      return "Complete!";
    default:
      return "Analyzing contract...";
  }
}

export function AnalysisPolling({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Analyzing contract...");
  const [chunkInfo, setChunkInfo] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const contract = await res.json();

        setProgress(contract.analysisProgress || 0);
        setStage(stageLabel(contract.analysisStage));

        if (contract.totalChunks && contract.totalChunks > 1) {
          setChunkInfo({
            completed: contract.completedChunks || 0,
            total: contract.totalChunks,
          });
        }

        if (
          contract.status === "completed" ||
          contract.status === "error"
        ) {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // Silently retry on next interval
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [contractId, router]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
      <p className="text-lg font-medium">{stage}</p>
      <Progress value={progress} className="mt-4 w-full max-w-xs" />
      {chunkInfo && chunkInfo.total > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Analyzing section{" "}
          {Math.min(chunkInfo.completed + 1, chunkInfo.total)} of{" "}
          {chunkInfo.total}
        </p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        {chunkInfo && chunkInfo.total > 1
          ? "Large contract — analyzing in parallel sections."
          : "This may take a minute for longer contracts."}
      </p>
    </div>
  );
}
