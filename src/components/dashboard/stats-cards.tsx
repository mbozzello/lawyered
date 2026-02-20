"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileSearch, CalendarDays, AlertTriangle, Scale } from "lucide-react";

interface StatsCardsProps {
  totalReviews: number;
  reviewsThisMonth: number;
  highRiskCount: number;
}

export function StatsCards({
  totalReviews,
  reviewsThisMonth,
  highRiskCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Reviews",
      value: totalReviews,
      icon: FileSearch,
      description: "All time",
    },
    {
      title: "This Month",
      value: reviewsThisMonth,
      icon: CalendarDays,
      description: "Reviews completed",
    },
    {
      title: "High Risk",
      value: highRiskCount,
      icon: AlertTriangle,
      description: "Contracts flagged",
      className: highRiskCount > 0 ? "text-destructive" : "",
    },
    {
      title: "Playbook Active",
      value: "On",
      icon: Scale,
      description: "Auto-review enabled",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.className || ""}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
