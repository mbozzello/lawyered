"use client";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Clause {
  clauseNumber: number;
  clauseType: string;
  riskLevel: string;
}

function riskColor(risk: string) {
  switch (risk) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
    default:
      return "bg-gray-300";
  }
}

export function RiskHeatmap({ clauses }: { clauses: Clause[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        Risk Heatmap
      </p>
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {clauses.map((clause) => (
            <Tooltip key={clause.clauseNumber}>
              <TooltipTrigger>
                <div
                  className={`h-6 w-6 rounded-sm ${riskColor(
                    clause.riskLevel
                  )} cursor-pointer transition-transform hover:scale-110`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  #{clause.clauseNumber}: {clause.clauseType} ({clause.riskLevel}{" "}
                  risk)
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-red-500" /> High
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-yellow-500" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-green-500" /> Low
        </span>
      </div>
    </div>
  );
}
