"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search } from "lucide-react";

interface Contract {
  id: string;
  filename: string;
  contractType: string | null;
  paperType: string | null;
  status: string;
  createdAt: string;
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

export default function HistoryPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((data) => {
        setContracts(data);
        setLoading(false);
      });
  }, []);

  const filtered = contracts.filter((c) => {
    const matchesSearch = c.filename
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRisk =
      riskFilter === "all" || c.summary?.overallRisk === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review History</h1>
        <p className="text-muted-foreground">
          All previously reviewed contracts.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risks</SelectItem>
            <SelectItem value="high">High risk</SelectItem>
            <SelectItem value="medium">Medium risk</SelectItem>
            <SelectItem value="low">Low risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {contracts.length === 0
                ? "No contracts reviewed yet."
                : "No contracts match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filtered.length} contract{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((contract) => (
              <Link
                key={contract.id}
                href={`/dashboard/review/${contract.id}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{contract.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {contract.contractType || "Unknown type"}
                      {contract.paperType && (
                        <>
                          {" "}
                          &middot;{" "}
                          {contract.paperType === "internal"
                            ? "Our Paper"
                            : "External Paper"}
                        </>
                      )}
                      {" "}&middot;{" "}
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contract.summary && (
                    <Badge
                      variant={riskBadgeVariant(contract.summary.overallRisk)}
                    >
                      {contract.summary.overallRisk} risk
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {contract.status === "completed"
                      ? "Reviewed"
                      : contract.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
