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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Pencil,
  Save,
  Loader2,
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
    userRedline: string | null;
    userNote: string | null;
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userRedline, setUserRedline] = useState(clause.userRedline || "");
  const [userNote, setUserNote] = useState(clause.userNote || "");
  const [savedRedline, setSavedRedline] = useState(clause.userRedline || "");
  const [savedNote, setSavedNote] = useState(clause.userNote || "");
  const violations = clause.playbookViolations as PlaybookViolation[];

  const hasUserEdits = savedRedline || savedNote;

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

  const handleStartEdit = () => {
    if (!userRedline && clause.redlineSuggestion) {
      setUserRedline(clause.redlineSuggestion);
    }
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setUserRedline(savedRedline);
    setUserNote(savedNote);
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/clause/${clause.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRedline, userNote }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedRedline(userRedline);
      setSavedNote(userNote);
      setEditing(false);
      toast.success("Your edits saved");
    } catch {
      toast.error("Failed to save edits");
    } finally {
      setSaving(false);
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
            {hasUserEdits && (
              <Badge
                variant="outline"
                className="text-xs border-blue-300 text-blue-600 dark:text-blue-400"
              >
                Edited
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                if (!expanded) setExpanded(true);
                handleStartEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
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

          {/* AI Suggested Redline */}
          {clause.redlineSuggestion && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  AI Suggestion
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

          {/* User's Saved Edits (read-only view when not editing) */}
          {!editing && savedRedline && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Your Redline
                </p>
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-500/5 p-3">
                  <p className="text-sm leading-relaxed">{savedRedline}</p>
                </div>
              </div>
            </>
          )}
          {!editing && savedNote && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Your Notes
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {savedNote}
              </p>
            </div>
          )}

          {/* Inline Edit Mode */}
          {editing && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                    Your Redline
                  </label>
                  <Textarea
                    value={userRedline}
                    onChange={(e) => setUserRedline(e.target.value)}
                    placeholder="Write your proposed revision for this clause..."
                    className="min-h-24 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                    Notes
                  </label>
                  <Textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Add notes or comments about this clause..."
                    className="min-h-16 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
