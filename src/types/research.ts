export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  score: number;
  source_provider: "tavily" | "perplexity" | "gemini" | "duckduckgo" | "fallback" | "web" | string;
  published_date?: string | null;
}

export interface EvidenceItem {
  id: string;
  source_title: string;
  source_url: string;
  claim: string;
  confidence: number;
  extracted_entities?: string[];
  status?: "VERIFIED" | "PARTIALLY_SUPPORTED" | "CONFLICTING" | "UNSUPPORTED";
}

export interface ConsensusPoint {
  statement: string;
  supporting_sources: string[];
  agreement_score: number;
  model_corroborations: number;
}

export interface ConflictItem {
  topic_aspect: string;
  claim_a: string;
  source_a: string;
  claim_b: string;
  source_b: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface SynthesisReport {
  topic: string;
  summary: string;
  evidence_points: EvidenceItem[];
  sources?: SearchResultItem[];
  consensus_score: number;
  consensus_points: ConsensusPoint[];
  conflicts_detected: ConflictItem[];
  markdown_report: string;
  is_offline_demonstration?: boolean;
  is_synthetic_demonstration?: boolean;
  offline_disclaimer?: string;
}

export interface ResearchPlanStep {
  id: string;
  subquery: string;
  status: "pending" | "searching" | "completed" | "failed";
  resultsCount?: number;
  error?: string;
}

export interface ResearchSessionRecord {
  id: string;
  topic: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  branch_id?: string;
  model_id?: string;
  plan: ResearchPlanStep[];
  synthesis_report?: SynthesisReport | null;
  status: "draft" | "in_progress" | "completed" | "failed";
}
