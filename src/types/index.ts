export interface ContractUpload {
  file: File;
  filename: string;
}

export interface ParsedContract {
  text: string;
  filename: string;
}

export interface ClauseData {
  clauseNumber: number;
  clauseType: string;
  originalText: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  playbookViolations: PlaybookViolation[];
  redlineSuggestion?: string;
  redlineExplanation?: string;
}

export interface PlaybookViolation {
  ruleName: string;
  category: string;
  severity: "critical" | "warning" | "info";
  description: string;
}

export interface ContractClassification {
  contractType: string;
  paperType: "internal" | "external";
  parties: string[];
  effectiveDate?: string;
  summary: string;
}

export interface ReviewSummaryData {
  overallRisk: "high" | "medium" | "low";
  executiveSummary: string;
  keyFindings: string[];
  missingClauses: string[];
}

export interface PlaybookRuleData {
  id?: string;
  name: string;
  category: string;
  description: string;
  condition: string;
  severity: "critical" | "warning" | "info";
  enabled: boolean;
}

export interface PlaybookProfileData {
  id?: string;
  name: string;
  contractType?: string;
  description?: string;
  isDefault: boolean;
  rules: PlaybookRuleData[];
}

export interface AnalysisProgress {
  stage: "uploading" | "parsing" | "classifying" | "analyzing" | "summarizing" | "complete" | "error";
  message: string;
  progress: number;
}

export interface DashboardStats {
  totalReviews: number;
  reviewsThisMonth: number;
  highRiskCount: number;
  avgClauses: number;
}
