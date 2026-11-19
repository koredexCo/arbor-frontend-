import { executeAgentTool } from "./agentApi";
import type {
  SearchResultItem,
  EvidenceItem,
  ConsensusPoint,
  ConflictItem,
  SynthesisReport,
  ResearchSessionRecord,
} from "../types/research";

const RESEARCH_STORAGE_KEY = "arbor-research-sessions-v1";

/**
 * Executes multi-provider search via native research.search tool.
 */
export async function executeResearchSearch(
  workspaceId: string,
  branchId: string,
  query: string,
  maxResults: number = 5
): Promise<{ query: string; count: number; results: SearchResultItem[] }> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "research.search",
    parameters: {
      query,
      max_results: maxResults,
    },
    risk_level: "safe",
  });

  if (res.exit_code && res.exit_code !== 0) {
    throw new Error(res.output || res.stderr || "Search execution failed");
  }

  return res.result as { query: string; count: number; results: SearchResultItem[] };
}

export class ResearchUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchUnavailableError";
  }
}

/**
 * Performs full multi-step evidence synthesis, cross-source contradiction analysis,
 * and report generation via native research.synthesize tool.
 *
 * In accordance with DEF-04, this function fails closed when the backend research
 * agent is unreachable or errors. It does NOT silently fallback to synthetic data.
 */
export async function executeResearchSynthesize(
  workspaceId: string,
  branchId: string,
  topic: string,
  queries?: string[]
): Promise<SynthesisReport> {
  try {
    const res = await executeAgentTool({
      workspace_id: workspaceId,
      branch_id: branchId,
      tool_name: "research.synthesize",
      parameters: {
        topic,
        queries: queries && queries.length > 0 ? queries : [topic],
      },
      risk_level: "safe",
    });

    if (res.exit_code === 0 && res.result) {
      return res.result as SynthesisReport;
    }

    throw new ResearchUnavailableError(
      res.output || res.stderr || `Backend research service exited with code ${res.exit_code}`
    );
  } catch (err: unknown) {
    if (err instanceof ResearchUnavailableError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new ResearchUnavailableError(
      `Backend research service unavailable: ${msg}. Live empirical evidence could not be retrieved.`
    );
  }
}

/**
 * Explicitly loads a designated synthetic demonstration report with prominent
 * synthetic provenance labeling (DEF-04). Must only be invoked via explicit user opt-in.
 */
export function loadDemonstrationSynthesisReport(topic: string, queries?: string[]): SynthesisReport {
  return generateDemonstrationSynthesis(topic, queries);
}

function generateDemonstrationSynthesis(topic: string, queries?: string[]): SynthesisReport {
  const isSimd = /simd|vector|c\+\+|transpil/i.test(topic);

  const sources: SearchResultItem[] = isSimd
    ? [
        {
          title: "LLVM Auto-Vectorization and Loop Idiom Recognition (Demonstration Source)",
          url: "https://llvm.org/docs/Vectorizers.html",
          snippet: "LLVM contains two vectorizers: the Loop Vectorizer and the SLP Vectorizer. In dense contiguous loop kernels, AVX2 vectorization achieves 3.8x to 4.2x theoretical compute speedups.",
          score: 0.94,
          source_provider: "demonstration_synthetic",
          published_date: "2024-03-15",
        },
        {
          title: "Memory Bandwidth Limits on SIMD Numerical Acceleration (Demonstration Source)",
          url: "https://synthetic-benchmark.internal/memory-saturation",
          snippet: "On real-world workloads, memory bus bottlenecks and cache line misses reduce observed vectorization gains to 1.3x - 1.5x unless data structures are reorganized into Structure-of-Arrays (SoA).",
          score: 0.89,
          source_provider: "demonstration_synthetic",
          published_date: "2024-05-20",
        },
        {
          title: "Dynamic Programming Memoization vs Transpiled Numerical Loops (Demonstration Source)",
          url: "https://synthetic-benchmark.internal/algo-complexity",
          snippet: "Dynamic programming caches overlapping subproblems to drop algorithmic complexity from O(2^N) to O(N). Brute-force SIMD acceleration cannot overcome exponential complexity disparities.",
          score: 0.86,
          source_provider: "demonstration_synthetic",
          published_date: "2024-02-10",
        },
        {
          title: "C++17 SIMD Intrinsics and Alignment Guarantees (Demonstration Source)",
          url: "https://en.cppreference.com/w/cpp/experimental/simd",
          snippet: "Strict 32-byte or 64-byte memory alignment eliminates unaligned load penalties, enabling deterministic hardware instruction execution without dynamic CPU dispatch checks.",
          score: 0.91,
          source_provider: "demonstration_synthetic",
          published_date: "2024-06-01",
        },
      ]
    : [
        {
          title: `Technical Synthesis Overview: ${topic.slice(0, 40)}... (Demonstration Source)`,
          url: "https://synthetic-research.internal/synthesis-node-1",
          snippet: `Authoritative analysis of ${topic} across distributed systems documentation, empirical benchmarks, and architectural design specifications.`,
          score: 0.92,
          source_provider: "demonstration_synthetic",
          published_date: "2024-04-12",
        },
        {
          title: "Empirical System Benchmarking & Latency Constraints (Demonstration Source)",
          url: "https://synthetic-research.internal/synthesis-node-2",
          snippet: "Experimental verification indicates significant variability across execution environments, highlighting trade-offs between computational overhead and deterministic latency.",
          score: 0.87,
          source_provider: "demonstration_synthetic",
          published_date: "2024-05-18",
        },
      ];

  const evidencePoints: EvidenceItem[] = isSimd
    ? [
        {
          id: "ev-1",
          source_title: "LLVM Auto-Vectorization Guide",
          source_url: "https://llvm.org/docs/Vectorizers.html",
          claim: "AVX2 SIMD vectorization achieves 3.8x to 4.2x speedup on contiguous numerical loops when unrolled with stride-1 access patterns.",
          confidence: 0.94,
          status: "VERIFIED",
          extracted_entities: ["AVX2", "LLVM", "Stride-1", "Loop Vectorizer"],
        },
        {
          id: "ev-2",
          source_title: "Memory Bandwidth Limits on SIMD",
          source_url: "https://synthetic-benchmark.internal/memory-saturation",
          claim: "Observed vectorization speedups drop below 1.4x on memory-bound kernels unless transformed from Array-of-Structures (AoS) to Structure-of-Arrays (SoA).",
          confidence: 0.91,
          status: "CONFLICTING",
          extracted_entities: ["Memory Bus", "AoS vs SoA", "Cache Saturation"],
        },
        {
          id: "ev-3",
          source_title: "C++17 SIMD Intrinsics and Alignment",
          source_url: "https://en.cppreference.com/w/cpp/experimental/simd",
          claim: "Strict 32-byte alignment prevents pipeline stall cycles and guarantees zero unaligned-load penalties on modern x86-64 microarchitectures.",
          confidence: 0.92,
          status: "VERIFIED",
          extracted_entities: ["Alignment", "x86-64", "Pipeline", "Intrinsics"],
        },
        {
          id: "ev-4",
          source_title: "Dynamic Programming Memoization",
          source_url: "https://synthetic-benchmark.internal/algo-complexity",
          claim: "Algorithmic caching reduces total instruction count by orders of magnitude for recurrence relations, whereas SIMD only reduces cycles per instruction.",
          confidence: 0.88,
          status: "PARTIALLY_SUPPORTED",
          extracted_entities: ["Complexity", "Recurrence", "Instruction Count"],
        },
      ]
    : [
        {
          id: "ev-1",
          source_title: "Technical Synthesis Overview",
          source_url: "https://synthetic-research.internal/synthesis-node-1",
          claim: `Primary mechanisms in ${topic} depend heavily on deterministic memory layouts and execution boundaries.`,
          confidence: 0.91,
          status: "VERIFIED",
        },
        {
          id: "ev-2",
          source_title: "Empirical System Benchmarking",
          source_url: "https://synthetic-research.internal/synthesis-node-2",
          claim: "Latency variance increases exponentially under high contention without strict thread or connection pooling.",
          confidence: 0.85,
          status: "PARTIALLY_SUPPORTED",
        },
      ];

  const conflicts: ConflictItem[] = isSimd
    ? [
        {
          topic_aspect: "Compiler Auto-Vectorization Speedup Ratios",
          claim_a: "GCC and Clang auto-vectorizers achieve 3.8x to 4.2x compute acceleration on AVX2 without manual intrinsic rewriting [1].",
          source_a: "https://llvm.org/docs/Vectorizers.html",
          claim_b: "Real-world numerical kernels experience less than 1.4x speedup due to memory bus saturation and cache line thrashing [2].",
          source_b: "https://synthetic-benchmark.internal/memory-saturation",
          severity: "high",
          explanation: "Discrepancy stems from compute-bound synthetic benchmarks (assuming L1 cache residency) versus memory-bandwidth-bound production streaming workloads.",
        },
        {
          topic_aspect: "Dynamic Programming Memoization vs SIMD Loop Unrolling",
          claim_a: "Dynamic programming caches overlapping subproblems to drop time complexity from O(2^N) to O(N), outperforming SIMD [3].",
          source_a: "https://synthetic-benchmark.internal/algo-complexity",
          claim_b: "SIMD transpiled loops eliminate branch prediction penalties and achieve 2x lower wall-clock latency than cached hash tables [4].",
          source_b: "https://synthetic-benchmark.internal/transpiler-eval",
          severity: "medium",
          explanation: "Comparison conflates hash-table memoization (high pointer chasing overhead) with flat contiguous array dynamic programming lookups.",
        },
      ]
    : [
        {
          topic_aspect: "Architecture Execution Model",
          claim_a: "Decoupled asynchronous processing minimizes end-to-end latency under variable loads.",
          source_a: "https://synthetic-research.internal/synthesis-node-1",
          claim_b: "Synchronous deterministic pipelining guarantees bounded worst-case execution time.",
          source_b: "https://synthetic-research.internal/synthesis-node-2",
          severity: "medium",
          explanation: "Trade-off between average throughput under bursty traffic versus worst-case deterministic execution bounds.",
        },
      ];

  const consensusPoints: ConsensusPoint[] = isSimd
    ? [
        {
          statement: "Contiguous memory layout (Structure-of-Arrays) is mandatory for achieving near-linear SIMD vectorization speedups across AVX2 and AVX-512 architectures.",
          supporting_sources: ["https://llvm.org/docs/Vectorizers.html", "https://synthetic-benchmark.internal/memory-saturation"],
          agreement_score: 0.95,
          model_corroborations: 3,
        },
        {
          statement: "Algorithmic complexity optimizations (such as dynamic programming) must precede hardware vectorization, as algorithmic scaling dominates constant-factor SIMD gains.",
          supporting_sources: ["https://synthetic-benchmark.internal/algo-complexity"],
          agreement_score: 0.89,
          model_corroborations: 2,
        },
      ]
    : [
        {
          statement: `Rigorous architectural isolation and verifiable contracts provide deterministic guarantees for ${topic}.`,
          supporting_sources: ["https://synthetic-research.internal/synthesis-node-1"],
          agreement_score: 0.91,
          model_corroborations: 2,
        },
      ];

  const markdownReport = `# Multi-Model Evidence Synthesis: ${topic}

> **Provenance Notice:** Generated via Arbor Research Engine (Offline Demonstration Mode).
> Demonstrating multi-source evidence extraction, cross-model consensus scoring, and contradiction matrix.

## Executive Summary
An exhaustive multi-source evaluation was performed for **"${topic}"**. Synthesizing evidence across compiler documentation, empirical benchmarking papers, and architectural specifications reveals a **Consensus Index of 88%**, with **${conflicts.length} major factual contradiction(s)** isolated between synthetic benchmark claims and memory-constrained production reality.

## Key Architectural Findings
1. **Contiguous Vector Alignment [1]:** Modern SIMD vectorization on AVX2 architectures requires strict 32-byte alignment to prevent pipeline stalls and cache line split penalties.
2. **Compute vs Memory Bandwidth Bottlenecks [2]:** While synthetic loop kernels demonstrate up to 4.2x compute acceleration, practical workloads frequently saturate memory bus throughput, capping gains at 1.3x to 1.5x unless transposed to Structure-of-Arrays (SoA).
3. **Algorithmic Dominance [3]:** Reductions in asymptotic computational complexity (such as memoization or dynamic programming) supersede microarchitectural optimizations by orders of magnitude for recursive relations.

## Isolated Contradictions & Disputes
${conflicts.map((c, idx) => `### Conflict ${idx + 1}: ${c.topic_aspect} (Severity: ${c.severity.toUpperCase()})
- **Claim A:** ${c.claim_a}
  *Source:* [${c.source_a}](${c.source_a})
- **Claim B:** ${c.claim_b}
  *Source:* [${c.source_b}](${c.source_b})
- **Evaluation:** ${c.explanation}
`).join("\n")}

## Citations & Sources Ledger
${sources.map((s, idx) => `[${idx + 1}] **${s.title}**  
URL: ${s.url}  
Confidence Score: ${(s.score * 100).toFixed(0)}% · Provider: \`${s.source_provider}\``).join("\n\n")}
`;

  return {
    topic,
    summary: `[DEMONSTRATION ONLY] Multi-source synthetic evidence for "${topic}". Evaluated ${sources.length} mock sources, isolated ${conflicts.length} demonstration contradiction(s).`,
    evidence_points: evidencePoints,
    sources,
    consensus_score: 0.88,
    consensus_points: consensusPoints,
    conflicts_detected: conflicts,
    markdown_report: markdownReport,
    is_offline_demonstration: true,
    is_synthetic_demonstration: true,
    offline_disclaimer: "SYNTHETIC DEMONSTRATION DATA (MOCK): Backend research service was not reached. This report is generated from static mock fixtures for interface demonstration only and does NOT contain live empirical evidence.",
  };
}

/**
 * Evaluates cross-source consensus and flags conflicting factual claims
 * among extracted evidence points via native research.evaluate_consensus tool.
 */
export async function executeResearchEvaluateConsensus(
  workspaceId: string,
  branchId: string,
  topic: string,
  evidencePoints: EvidenceItem[]
): Promise<{
  topic: string;
  consensus_score: number;
  consensus_points: ConsensusPoint[];
  conflicts_detected: ConflictItem[];
}> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "research.evaluate_consensus",
    parameters: {
      topic,
      evidence_points: evidencePoints,
    },
    risk_level: "safe",
  });

  if (res.exit_code && res.exit_code !== 0) {
    throw new Error(res.output || res.stderr || "Consensus evaluation failed");
  }

  return res.result as {
    topic: string;
    consensus_score: number;
    consensus_points: ConsensusPoint[];
    conflicts_detected: ConflictItem[];
  };
}

/**
 * Storage helpers for local research session history.
 */
export function getSavedResearchSessions(): ResearchSessionRecord[] {
  try {
    const raw = localStorage.getItem(RESEARCH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveResearchSession(session: ResearchSessionRecord): void {
  try {
    const existing = getSavedResearchSessions();
    const filtered = existing.filter((s) => s.id !== session.id);
    const updated = [session, ...filtered].slice(0, 30);
    localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save research session to local storage:", err);
  }
}

export function deleteResearchSession(sessionId: string): void {
  try {
    const existing = getSavedResearchSessions();
    const filtered = existing.filter((s) => s.id !== sessionId);
    localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to delete research session from local storage:", err);
  }
}
