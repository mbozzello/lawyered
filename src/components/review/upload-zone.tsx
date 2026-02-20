"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

const POLL_INTERVAL = 2000;
const MAX_POLLS = 150; // 5 minutes max

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
      return "Processing...";
  }
}

export function UploadZone() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [chunkInfo, setChunkInfo] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (
        !ACCEPTED_TYPES.includes(file.type) &&
        !ACCEPTED_EXTENSIONS.includes(ext)
      ) {
        toast.error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 20MB.");
        return;
      }

      setUploading(true);
      setProgress(5);
      setStage("Uploading contract...");
      setChunkInfo(null);

      try {
        // Step 1: Upload
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/contracts", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }

        const { contractId } = await uploadRes.json();

        setProgress(8);
        setStage("Starting analysis...");

        // Step 2: Fire-and-forget analyze call
        fetch(`/api/contracts/${contractId}/analyze`, { method: "POST" });

        // Step 3: Poll for real progress
        let polls = 0;

        while (polls < MAX_POLLS) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          polls++;

          const statusRes = await fetch(`/api/contracts/${contractId}/status`, {
            cache: "no-store",
          });
          if (!statusRes.ok) continue;

          const contract = await statusRes.json();

          setProgress(contract.analysisProgress || 8);
          setStage(stageLabel(contract.analysisStage));

          if (contract.totalChunks && contract.totalChunks > 1) {
            setChunkInfo({
              completed: contract.completedChunks || 0,
              total: contract.totalChunks,
            });
          }

          if (contract.status === "completed") {
            setProgress(100);
            setStage("Complete!");
            toast.success("Contract analyzed successfully!");
            router.push(`/dashboard/review/${contractId}`);
            return;
          }

          if (contract.status === "error") {
            throw new Error("Analysis failed. Please try again.");
          }
        }

        throw new Error("Analysis timed out. Please check the review history.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        );
        setUploading(false);
        setProgress(0);
        setStage("");
        setChunkInfo(null);
      }
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (uploading) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="mb-2 text-lg font-medium">{stage}</p>
          <Progress value={progress} className="w-full max-w-xs" />
          {chunkInfo && chunkInfo.total > 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Analyzing section{" "}
              {Math.min(chunkInfo.completed + 1, chunkInfo.total)} of{" "}
              {chunkInfo.total}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {chunkInfo && chunkInfo.total > 1
              ? "Large contract detected — analyzing in parallel sections."
              : "This may take 30-60 seconds for longer contracts."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Upload Contract</CardTitle>
        <CardDescription>
          Upload a PDF, DOCX, or TXT file to analyze against your playbook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">
            Drag & drop your contract here
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            or click below to browse
          </p>
          <Button asChild>
            <label className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              Choose File
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleChange}
              />
            </label>
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">Supported formats:</p>
            <p>PDF, DOCX, TXT — Max 20MB</p>
            <p className="mt-1">
              Your contract will be analyzed clause-by-clause against your active
              playbook rules.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
