"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { CheckCircle, Shield, Cpu } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Account and application configuration.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-4 w-4" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{session?.user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-4 w-4" />
              AI Configuration
            </CardTitle>
            <CardDescription>
              Claude API is configured via environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Claude API</span>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-700"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Configured
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Primary Model</span>
              <Badge variant="secondary">claude-sonnet-4-5</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Deep Analysis Model</span>
              <Badge variant="secondary">claude-opus-4-6</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
