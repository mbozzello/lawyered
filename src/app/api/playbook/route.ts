import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const profiles = await prisma.playbookProfile.findMany({
    where: { userId },
    include: { rules: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();

  const profile = await prisma.playbookProfile.create({
    data: {
      userId,
      name: body.name,
      contractType: body.contractType || null,
      description: body.description || null,
      isDefault: body.isDefault || false,
    },
  });

  return NextResponse.json(profile);
}
