import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const clause = await prisma.clauseAnalysis.findFirst({
    where: { id },
    include: { contract: true },
  });

  if (
    !clause ||
    clause.contract.userId !== (session.user as { id: string }).id
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build update data — accept status, userRedline, userNote
  const data: Record<string, string> = {};
  if (typeof body.status === "string") {
    data.status = body.status.trim();
  }
  if (typeof body.userRedline === "string") {
    data.userRedline = body.userRedline.trim() || "";
  }
  if (typeof body.userNote === "string") {
    data.userNote = body.userNote.trim() || "";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.clauseAnalysis.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
