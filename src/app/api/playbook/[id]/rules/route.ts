import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const profile = await prisma.playbookProfile.findFirst({
    where: { id, userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();

  const rule = await prisma.playbookRule.create({
    data: {
      profileId: id,
      name: body.name,
      category: body.category,
      description: body.description,
      condition: body.condition,
      severity: body.severity || "warning",
      enabled: body.enabled !== false,
    },
  });

  return NextResponse.json(rule);
}

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

  // id here is the rule id for toggling
  if (body.ruleId) {
    const updated = await prisma.playbookRule.update({
      where: { id: body.ruleId },
      data: {
        enabled: body.enabled,
        ...(body.name && { name: body.name }),
        ...(body.category && { category: body.category }),
        ...(body.description && { description: body.description }),
        ...(body.condition && { condition: body.condition }),
        ...(body.severity && { severity: body.severity }),
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "ruleId required" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get("ruleId");

  if (!ruleId) {
    return NextResponse.json({ error: "ruleId required" }, { status: 400 });
  }

  await prisma.playbookRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ success: true });
}
