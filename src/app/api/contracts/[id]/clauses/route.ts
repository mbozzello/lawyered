import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const contract = await prisma.contract.findFirst({
    where: { id, userId },
    select: {
      status: true,
      analysisProgress: true,
      analysisStage: true,
      totalChunks: true,
      completedChunks: true,
      clauses: {
        orderBy: { clauseNumber: "asc" },
      },
      summary: true,
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(contract);
}
