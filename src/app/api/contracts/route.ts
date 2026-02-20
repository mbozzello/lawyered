import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseContract } from "@/lib/contract-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to uploads directory
    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filepath = join(uploadsDir, `${Date.now()}-${file.name}`);
    await writeFile(filepath, buffer);

    // Parse the contract text
    const text = await parseContract(buffer, file.name);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract sufficient text from the document." },
        { status: 400 }
      );
    }

    // Create contract record
    const contract = await prisma.contract.create({
      data: {
        userId,
        filename: file.name,
        originalText: text,
        status: "pending",
      },
    });

    return NextResponse.json({ contractId: contract.id });
  } catch (error) {
    console.error("Contract upload error:", error);
    return NextResponse.json(
      { error: "Failed to process the uploaded file." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const contracts = await prisma.contract.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { summary: true },
  });

  return NextResponse.json(contracts);
}
