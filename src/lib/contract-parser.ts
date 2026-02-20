/* eslint-disable @typescript-eslint/no-require-imports */
import mammoth from "mammoth";

export async function parseContract(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    return parsePDF(buffer);
  } else if (ext === "docx" || ext === "doc") {
    return parseDOCX(buffer);
  } else if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload PDF, DOCX, or TXT files.`);
}

async function parsePDF(buffer: Buffer): Promise<string> {
  // pdf-parse v1 uses CommonJS default export
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return cleanText(data.text);
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return cleanText(result.value);
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
