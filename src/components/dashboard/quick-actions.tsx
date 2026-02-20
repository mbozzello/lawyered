"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BookOpen, History } from "lucide-react";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full justify-start gap-2">
          <Link href="/dashboard/review">
            <Upload className="h-4 w-4" />
            Upload Contract
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Link href="/dashboard/playbook">
            <BookOpen className="h-4 w-4" />
            Manage Playbook
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Link href="/dashboard/history">
            <History className="h-4 w-4" />
            View History
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
