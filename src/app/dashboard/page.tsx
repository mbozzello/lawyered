import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentReviews } from "@/components/dashboard/recent-reviews";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id: string })?.id;

  const [totalReviews, reviewsThisMonth, highRiskCount, recentContracts] =
    await Promise.all([
      prisma.contract.count({
        where: { userId, status: "completed" },
      }),
      prisma.contract.count({
        where: {
          userId,
          status: "completed",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.reviewSummary.count({
        where: {
          contract: { userId },
          overallRisk: "high",
        },
      }),
      prisma.contract.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { summary: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here&apos;s your contract review overview.
        </p>
      </div>

      <StatsCards
        totalReviews={totalReviews}
        reviewsThisMonth={reviewsThisMonth}
        highRiskCount={highRiskCount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentReviews contracts={recentContracts} />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
