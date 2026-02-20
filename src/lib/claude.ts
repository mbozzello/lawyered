import Anthropic from "@anthropic-ai/sdk";
import type {
  ContractClassification,
  ClauseData,
  ReviewSummaryData,
  PlaybookRuleData,
} from "@/types";
import type { TextChunk } from "./chunker";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Check your environment variables.");
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are a senior legal AI assistant helping an experienced corporate counsel (16+ years, Harvard Law) review contracts.
You provide precise, business-practical legal analysis. Focus on:
- Identifying dealbreakers vs. nice-to-haves
- Flagging deviations from market-standard positions
- Providing actionable redline suggestions with legal reasoning
- Being concise but thorough

Always respond with valid JSON matching the requested schema. Do not wrap your response in markdown code fences.`;

function extractJSON(response: Anthropic.Message) {
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude response was truncated. The contract may be too long.");
  }

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}

export async function classifyContract(
  text: string
): Promise<ContractClassification> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this contract and classify it. Respond with JSON only:
{
  "contractType": "NDA" | "MSA" | "SaaS Agreement" | "Employment Agreement" | "Consulting Agreement" | "License Agreement" | "Services Agreement" | "Other",
  "paperType": "internal" | "external",
  "parties": ["Party A name", "Party B name"],
  "effectiveDate": "date if found or null",
  "summary": "1-2 sentence summary of the contract"
}

Determine "paperType" based on:
- "internal" = appears to be drafted by/favorable to the reviewing party (standard company template)
- "external" = appears to be drafted by/favorable to the counterparty

CONTRACT TEXT:
${text.slice(0, 8000)}`,
      },
    ],
  });

  return extractJSON(response);
}

export async function analyzeClausesWithPlaybook(
  text: string,
  contractType: string,
  rules: PlaybookRuleData[]
): Promise<ClauseData[]> {
  const enabledRules = rules.filter((r) => r.enabled);
  const rulesText = enabledRules
    .map(
      (r) =>
        `- [${r.severity.toUpperCase()}] ${r.name} (${r.category}): ${r.condition}`
    )
    .join("\n");

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this ${contractType} contract clause by clause. For each clause:
1. Identify the clause type
2. Assess risk level (high/medium/low)
3. Check against the playbook rules below
4. Provide a plain-language explanation
5. Suggest redline edits if needed

PLAYBOOK RULES:
${rulesText || "No custom rules — use standard corporate counsel best practices."}

Respond with a JSON array of clauses. IMPORTANT: Keep "originalText" to the first 300 characters of the clause (truncate with "..." if longer). Keep "redlineSuggestion" concise — summarize the key change rather than rewriting the entire clause.

[{
  "clauseNumber": 1,
  "clauseType": "Indemnification" | "Limitation of Liability" | "Termination" | "Confidentiality" | "IP Ownership" | "Data Privacy" | "Non-Compete" | "Payment Terms" | "Representations & Warranties" | "Governing Law" | "Assignment" | "Force Majeure" | "Insurance" | "Auto-Renewal" | "SLA" | "Other",
  "originalText": "first 300 chars of the clause text...",
  "riskLevel": "high" | "medium" | "low",
  "explanation": "plain-language explanation of what this clause does and any concerns",
  "playbookViolations": [{"ruleName": "...", "category": "...", "severity": "critical|warning|info", "description": "why this violates the rule"}],
  "redlineSuggestion": "concise suggested revision (null if clause is acceptable)",
  "redlineExplanation": "why this change is recommended (null if no redline)"
}]

CONTRACT TEXT:
${text}`,
      },
    ],
  });

  return extractJSON(response);
}

export async function generateSummary(
  text: string,
  contractType: string,
  clauses: ClauseData[]
): Promise<ReviewSummaryData> {
  const highRiskClauses = clauses.filter((c) => c.riskLevel === "high");
  const violations = clauses.flatMap((c) => c.playbookViolations);

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate an executive summary for this ${contractType} contract review.

High-risk clauses found: ${highRiskClauses.length}
Total playbook violations: ${violations.length}
Critical violations: ${violations.filter((v) => v.severity === "critical").length}

Clause analysis summary:
${clauses.map((c) => `- Clause ${c.clauseNumber} (${c.clauseType}): ${c.riskLevel} risk${c.playbookViolations.length > 0 ? ` — ${c.playbookViolations.length} violation(s)` : ""}`).join("\n")}

Respond with JSON:
{
  "overallRisk": "high" | "medium" | "low",
  "executiveSummary": "2-3 paragraph executive summary suitable for a busy GC, highlighting key concerns and recommendations",
  "keyFindings": ["finding 1", "finding 2", ...],
  "missingClauses": ["clause type that should be present but is missing", ...]
}

CONTRACT TEXT (first 4000 chars for context):
${text.slice(0, 4000)}`,
      },
    ],
  });

  return extractJSON(response);
}

// --- Chunked parallel analysis for large contracts ---

const CONCURRENCY_LIMIT = 4;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function buildRulesText(rules: PlaybookRuleData[]): string {
  return rules
    .filter((r) => r.enabled)
    .map(
      (r) =>
        `- [${r.severity.toUpperCase()}] ${r.name} (${r.category}): ${r.condition}`
    )
    .join("\n");
}

export async function analyzeChunk(
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
  contractType: string,
  rules: PlaybookRuleData[]
): Promise<ClauseData[]> {
  const rulesText = buildRulesText(rules);

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `You are analyzing section ${chunkIndex + 1} of ${totalChunks} of a ${contractType} contract. Analyze ONLY the clauses present in this section.

For each clause:
1. Identify the clause type
2. Assess risk level (high/medium/low)
3. Check against the playbook rules below
4. Provide a plain-language explanation
5. Suggest redline edits if needed

If a clause appears cut off at the beginning or end, still analyze what is present.

PLAYBOOK RULES:
${rulesText || "No custom rules — use standard corporate counsel best practices."}

Respond with a JSON array. Keep "originalText" to the first 300 characters (truncate with "..." if longer). Keep "redlineSuggestion" concise.

[{
  "clauseNumber": 1,
  "clauseType": "Indemnification" | "Limitation of Liability" | "Termination" | "Confidentiality" | "IP Ownership" | "Data Privacy" | "Non-Compete" | "Payment Terms" | "Representations & Warranties" | "Governing Law" | "Assignment" | "Force Majeure" | "Insurance" | "Auto-Renewal" | "SLA" | "Other",
  "originalText": "first 300 chars of the clause text...",
  "riskLevel": "high" | "medium" | "low",
  "explanation": "plain-language explanation",
  "playbookViolations": [{"ruleName": "...", "category": "...", "severity": "critical|warning|info", "description": "..."}],
  "redlineSuggestion": "concise suggested revision (null if acceptable)",
  "redlineExplanation": "why this change is recommended (null if no redline)"
}]

If no clauses are found in this section, return an empty array: []

CONTRACT SECTION:
${chunkText}`,
      },
    ],
  });

  return extractJSON(response);
}

async function analyzeChunkWithRetry(
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
  contractType: string,
  rules: PlaybookRuleData[]
): Promise<ClauseData[]> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await analyzeChunk(chunkText, chunkIndex, totalChunks, contractType, rules);
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw new Error("Unreachable");
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => runNext())
  );
  return results;
}

function deduplicateClauses(clauses: ClauseData[]): ClauseData[] {
  const seen = new Set<string>();
  return clauses.filter((clause) => {
    const key = clause.originalText.slice(0, 100).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyzeClausesChunked(
  chunks: TextChunk[],
  contractType: string,
  rules: PlaybookRuleData[],
  onChunkComplete?: (chunkIndex: number, clauses: ClauseData[]) => Promise<void>
): Promise<ClauseData[]> {
  const chunkResults: ClauseData[][] = [];

  const tasks = chunks.map((chunk) => async () => {
    const clauses = await analyzeChunkWithRetry(
      chunk.text,
      chunk.index,
      chunks.length,
      contractType,
      rules
    );
    chunkResults[chunk.index] = clauses;
    if (onChunkComplete) {
      await onChunkComplete(chunk.index, clauses);
    }
    return clauses;
  });

  await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

  // Flatten, deduplicate overlaps, renumber
  const allClauses = deduplicateClauses(chunkResults.flat());
  return allClauses.map((clause, idx) => ({
    ...clause,
    clauseNumber: idx + 1,
  }));
}
