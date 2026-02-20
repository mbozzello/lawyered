import Anthropic from "@anthropic-ai/sdk";
import type {
  ContractClassification,
  ClauseData,
  ReviewSummaryData,
  PlaybookRuleData,
} from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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
  const response = await client.messages.create({
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

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
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

Respond with a JSON array of clauses:
[{
  "clauseNumber": 1,
  "clauseType": "Indemnification" | "Limitation of Liability" | "Termination" | "Confidentiality" | "IP Ownership" | "Data Privacy" | "Non-Compete" | "Payment Terms" | "Representations & Warranties" | "Governing Law" | "Assignment" | "Force Majeure" | "Insurance" | "Auto-Renewal" | "SLA" | "Other",
  "originalText": "exact text of the clause",
  "riskLevel": "high" | "medium" | "low",
  "explanation": "plain-language explanation of what this clause does and any concerns",
  "playbookViolations": [{"ruleName": "...", "category": "...", "severity": "critical|warning|info", "description": "why this violates the rule"}],
  "redlineSuggestion": "suggested revised text (null if clause is acceptable)",
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

  const response = await client.messages.create({
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
