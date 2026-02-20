import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY || "";
  const keyInfo = {
    starts: key.slice(0, 12),
    length: key.length,
    hasKey: !!key,
  };

  let apiTest: string;
  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 20,
      messages: [{ role: "user", content: "Reply with just: ok" }],
    });
    const content = response.content[0];
    apiTest = content.type === "text" ? content.text : `type: ${content.type}`;
  } catch (error) {
    apiTest = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  const envCheck = {
    DATABASE_URL: (process.env.DATABASE_URL || "").slice(0, 20),
    NEXTAUTH_SECRET: (process.env.NEXTAUTH_SECRET || "").length > 0,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
    NODE_ENV: process.env.NODE_ENV || "",
    envKeys: Object.keys(process.env).filter(k => k.includes("ANTHROPIC") || k.includes("NEXT") || k.includes("DATABASE")),
  };

  return NextResponse.json({ keyInfo, apiTest, envCheck });
}
