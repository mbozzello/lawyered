"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Contract {
  id: string;
  filename: string;
  contractType: string | null;
  status: string;
  createdAt: Date;
  summary: {
    overallRisk: string;
  } | null;
}

function riskBadgeVariant(risk: string) {
  switch (risk) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    case "low":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Reviewed";
    case "analyzing":
      return "Analyzing...";
    case "error":
      return "Error";
    default:
      return "Pending";
  }
}

export function RecentReviews({ contracts }: { contracts: Contract[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No contracts reviewed yet.
            </p>
            <Link
              href="/dashboard/review"
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Upload your first contract
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/dashboard/review/${contract.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{contract.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {contract.contractType || "Unknown type"} &middot;{" "}
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contract.summary && (
                    <Badge variant={riskBadgeVariant(contract.summary.overallRisk)}>
                      {contract.summary.overallRisk} risk
                    </Badge>
                  )}
                  <Badge variant="outline">{statusLabel(contract.status)}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
