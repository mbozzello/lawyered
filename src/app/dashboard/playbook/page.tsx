"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Rule {
  id: string;
  name: string;
  category: string;
  description: string;
  condition: string;
  severity: string;
  enabled: boolean;
}

interface Profile {
  id: string;
  name: string;
  contractType: string | null;
  description: string | null;
  isDefault: boolean;
  rules: Rule[];
}

export default function PlaybookPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRule, setAddingRule] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    category: "",
    description: "",
    condition: "",
    severity: "warning",
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const res = await fetch("/api/playbook");
    const data = await res.json();
    setProfiles(data);
    if (data.length > 0 && !selectedProfile) {
      setSelectedProfile(data[0].id);
    }
    setLoading(false);
  };

  const toggleRule = async (profileId: string, ruleId: string, enabled: boolean) => {
    await fetch(`/api/playbook/${profileId}/rules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId, enabled }),
    });
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? {
              ...p,
              rules: p.rules.map((r) =>
                r.id === ruleId ? { ...r, enabled } : r
              ),
            }
          : p
      )
    );
  };

  const addRule = async () => {
    if (!selectedProfile || !newRule.name || !newRule.condition) {
      toast.error("Please fill in all required fields");
      return;
    }

    const res = await fetch(`/api/playbook/${selectedProfile}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    });

    if (res.ok) {
      toast.success("Rule added successfully");
      setAddingRule(false);
      setNewRule({
        name: "",
        category: "",
        description: "",
        condition: "",
        severity: "warning",
      });
      fetchProfiles();
    }
  };

  const deleteRule = async (profileId: string, ruleId: string) => {
    await fetch(`/api/playbook/${profileId}/rules?ruleId=${ruleId}`, {
      method: "DELETE",
    });
    toast.success("Rule deleted");
    fetchProfiles();
  };

  const activeProfile = profiles.find((p) => p.id === selectedProfile);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Playbook Manager</h1>
          <p className="text-muted-foreground">
            Configure the rules used to review contracts.
          </p>
        </div>
        <Dialog open={addingRule} onOpenChange={setAddingRule}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Playbook Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g., Payment Terms"
                  value={newRule.name}
                  onChange={(e) =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  placeholder="e.g., Payment, Liability, Privacy"
                  value={newRule.category}
                  onChange={(e) =>
                    setNewRule({ ...newRule, category: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of the rule"
                  value={newRule.description}
                  onChange={(e) =>
                    setNewRule({ ...newRule, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Condition</Label>
                <Textarea
                  placeholder="The specific condition to check for in the contract"
                  value={newRule.condition}
                  onChange={(e) =>
                    setNewRule({ ...newRule, condition: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={newRule.severity}
                  onValueChange={(v) =>
                    setNewRule({ ...newRule, severity: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addRule} className="w-full">
                Add Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No playbook profiles yet. Run the seed endpoint to create default
              rules.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={async () => {
                await fetch("/api/seed", { method: "POST" });
                fetchProfiles();
                toast.success("Default playbook created!");
              }}
            >
              Seed Default Playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Profile selector */}
          {profiles.length > 1 && (
            <div className="flex gap-2">
              {profiles.map((p) => (
                <Button
                  key={p.id}
                  variant={selectedProfile === p.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProfile(p.id)}
                >
                  {p.name}
                  {p.isDefault && (
                    <Badge variant="secondary" className="ml-2">
                      Default
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}

          {activeProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{activeProfile.name}</CardTitle>
                {activeProfile.description && (
                  <CardDescription>{activeProfile.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeProfile.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {rule.name}
                          </span>
                          <Badge
                            variant={
                              rule.severity === "critical"
                                ? "destructive"
                                : rule.severity === "warning"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rule.category}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {rule.condition}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) =>
                            toggleRule(activeProfile.id, rule.id, checked)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            deleteRule(activeProfile.id, rule.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
