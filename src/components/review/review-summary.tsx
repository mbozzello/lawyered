"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  FileWarning,
} from "lucide-react";

interface ReviewSummaryProps {
  summary: {
    overallRisk: string;
    executiveSummary: string;
    keyFindings: string[];
    missingClauses: string[];
  };
  contractType: string | null;
  paperType: string | null;
  clauseCount: number;
  highRiskCount: number;
  violationCount: number;
}

function riskIcon(risk: string) {
  switch (risk) {
    case "high":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "medium":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "low":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return null;
  }
}

function riskColor(risk: string) {
  switch (risk) {
    case "high":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
    case "medium":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    case "low":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    default:
      return "";
  }
}

export function ReviewSummary({
  summary,
  contractType,
  paperType,
  clauseCount,
  highRiskCount,
  violationCount,
}: ReviewSummaryProps) {
  const findings = summary.keyFindings as string[];
  const missing = summary.missingClauses as string[];

  return (
    <div className="space-y-4">
      {/* Risk Overview Card */}
      <Card className={`border-2 ${riskColor(summary.overallRisk)}`}>
        <CardContent className="flex items-start gap-4 pt-6">
          {riskIcon(summary.overallRisk)}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-lg font-bold capitalize">
                {summary.overallRisk} Risk
              </h3>
              <Badge variant="outline">{contractType}</Badge>
              {paperType && (
                <Badge variant="secondary">
                  {paperType === "internal" ? "Our Paper" : "External Paper"}
                </Badge>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <span>{clauseCount} clauses analyzed</span>
              <span className="text-red-600 dark:text-red-400">
                {highRiskCount} high risk
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {violationCount} playbook violations
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {summary.executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* Key Findings and Missing Clauses side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-4 w-4" />
              Key Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues found.</p>
            ) : (
              <ul className="space-y-2">
                {findings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {finding}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileWarning className="h-4 w-4" />
              Missing Clauses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All standard clauses are present.
              </p>
            ) : (
              <ul className="space-y-2">
                {missing.map((clause, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    {clause}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
