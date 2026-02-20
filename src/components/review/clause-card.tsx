"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface PlaybookViolation {
  ruleName: string;
  category: string;
  severity: string;
  description: string;
}

interface ClauseCardProps {
  clause: {
    id: string;
    clauseNumber: number;
    clauseType: string;
    originalText: string;
    riskLevel: string;
    explanation: string;
    playbookViolations: PlaybookViolation[];
    redlineSuggestion: string | null;
    redlineExplanation: string | null;
    status: string;
  };
}

function riskBadge(risk: string) {
  switch (risk) {
    case "high":
      return (
        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-500/20">
          <AlertTriangle className="mr-1 h-3 w-3" />
          High Risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-500/20">
          <AlertCircle className="mr-1 h-3 w-3" />
          Medium Risk
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-500/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Low Risk
        </Badge>
      );
    default:
      return null;
  }
}

function riskBorderColor(risk: string) {
  switch (risk) {
    case "high":
      return "border-l-red-500";
    case "medium":
      return "border-l-yellow-500";
    case "low":
      return "border-l-green-500";
    default:
      return "";
  }
}

export function ClauseCard({ clause }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(clause.riskLevel === "high");
  const [redlineStatus, setRedlineStatus] = useState(clause.status);
  const violations = clause.playbookViolations as PlaybookViolation[];

  const handleRedlineAction = async (action: "accepted" | "rejected") => {
    try {
      await fetch(`/api/contracts/clause/${clause.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      setRedlineStatus(action);
      toast.success(
        `Redline ${action === "accepted" ? "accepted" : "rejected"}`
      );
    } catch {
      toast.error("Failed to update redline status");
    }
  };

  return (
    <Card className={`border-l-4 ${riskBorderColor(clause.riskLevel)}`}>
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {clause.clauseNumber}
            </span>
            <CardTitle className="text-sm font-medium">
              {clause.clauseType}
            </CardTitle>
            {riskBadge(clause.riskLevel)}
            {violations.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {violations.length} violation{violations.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Original Text */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Contract Language
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
              {clause.originalText}
            </div>
          </div>

          {/* AI Explanation */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Analysis
            </p>
            <p className="text-sm leading-relaxed">{clause.explanation}</p>
          </div>

          {/* Playbook Violations */}
          {violations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Playbook Violations
              </p>
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Badge
                        variant={
                          v.severity === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {v.severity}
                      </Badge>
                      <span className="text-sm font-medium">{v.ruleName}</span>
                      <span className="text-xs text-muted-foreground">
                        ({v.category})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {v.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Redline Suggestion */}
          {clause.redlineSuggestion && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Suggested Redline
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-sm leading-relaxed">
                    {clause.redlineSuggestion}
                  </p>
                  {clause.redlineExplanation && (
                    <p className="text-xs italic text-muted-foreground">
                      {clause.redlineExplanation}
                    </p>
                  )}
                </div>
                {redlineStatus === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRedlineAction("accepted")}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRedlineAction("rejected")}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Redline {redlineStatus}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
