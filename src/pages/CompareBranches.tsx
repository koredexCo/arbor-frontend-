import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  GitBranch, ArrowLeft, Loader2, GitCompareArrows, Brain, Code2,
  Database, Clock, Activity, Sparkles, AlertTriangle, ChevronDown,
  ChevronUp, Layers, Target, Lightbulb, Shield, Crosshair,
  Scale, Cpu, Wrench, CheckCircle2
} from "lucide-react";
import { api, getAccessToken } from "../services/api";

// ============================================================
// Types
// ============================================================

interface BranchEpoch {
  epoch_id: string;
  mission_statement: string;
  start_node: string;
  end_node: string;
  start_turn: number;
  end_turn: number;
  dominant_priorities: string[];
  architectural_direction: string[];
}

interface BranchSummary {
  branch_id: string;
  branch_name: string;
  parent_branch_id: string | null;
  depth: number;
  created_at: string;
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  estimated_tokens: number;
  code_block_count: number;
  languages_used: string[];
  epochs?: BranchEpoch[];
}

type AmbiguitySignals = { tentative: number; exploratory: number; committed: number };
type TemporalEntry = string | { value: string; status: string; turn?: number; signals?: AmbiguitySignals };

interface TimelineEntry {
  node_id: string;
  role: string;
  content_preview: string;
  time: string;
}

interface ReasoningPoints {
  decisions: TemporalEntry[];
  assumptions: TemporalEntry[];
  priorities: TemporalEntry[];
  constraints: TemporalEntry[];
  goals: TemporalEntry[];
  tradeoffs: TemporalEntry[];
  code_summary: TemporalEntry[];
  architecture_patterns: TemporalEntry[];
  confidence: string;
  source: string;
  snapshot_count?: number;
  total_entries?: number;
  active_count?: number;
  superseded_count?: number;
}

interface CodeDiff {
  language: string;
  diff: string;
  lines_added: number;
  lines_removed: number;
}

interface EvolutionDelta {
  category: string;
  importance: number;
  weight: number;
  only_in_a: string[];
  only_in_b: string[];
  shared_count: number;
}

interface EvolutionTimelineEntry {
  turn: number;
  node_id: string;
  timestamp: string;
  confidence: string;
  dominant_categories: string[];
  entry_count: number;
  summary: string;
}

interface Interpretation {
  label: string;
  text: string;
  confidence: number;
  evidence: string[];
}

interface CompareResult {
  summary: { branch_a: BranchSummary; branch_b: BranchSummary };
  reasoning: { branch_a: ReasoningPoints; branch_b: ReasoningPoints };
  code_diffs: CodeDiff[];
  code_blocks: { branch_a_count: number; branch_b_count: number };
  memory: {
    branch_a: { has_context: boolean; message_count: number; semantic_count: number };
    branch_b: { has_context: boolean; message_count: number; semantic_count: number };
    shared_memories: number;
    unique_to_a: number;
    unique_to_b: number;
  };
  divergence: { score: number; similarity: number; confidence: string; sample_size: number };
  timeline: { branch_a: TimelineEntry[]; branch_b: TimelineEntry[] };
  evolution_timeline: { branch_a: EvolutionTimelineEntry[]; branch_b: EvolutionTimelineEntry[] };
  evolution: { 
    executive_summary: string;
    narrative: string; 
    confidence: number; 
    ranked_deltas: EvolutionDelta[];
    interpretations?: { primary: Interpretation; alternatives: Interpretation[] };
  };
  replay: {
    branch_a: { has_snapshot: boolean; model: string | null; system_prompt_preview: string | null };
    branch_b: { has_snapshot: boolean; model: string | null; system_prompt_preview: string | null };
  };
  ai_summary: string | null;
}

// ============================================================
// Divergence Badge
// ============================================================

function DivergenceBadge({ score, confidence }: { score: number; confidence: string }) {
  const pct = Math.round(score * 100);
  let color = "from-emerald-500 to-emerald-600";
  let label = "Similar";
  if (pct > 60) { color = "from-red-500 to-orange-500"; label = "Highly Divergent"; }
  else if (pct > 30) { color = "from-amber-500 to-yellow-500"; label = "Moderately Divergent"; }
  else if (pct > 10) { color = "from-gray-300 to-white"; label = "Slightly Divergent"; }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42"
            fill="transparent"
            stroke="url(#divergeGrad)"
            strokeWidth="8"
            strokeDasharray={`${pct * 2.64} 264`}
            strokeLinecap="round"
            className="drop-shadow-lg transition-all duration-1000"
          />
          <defs>
            <linearGradient id="divergeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={`text-${color.split(" ")[0].replace("from-", "")}`} stopColor="currentColor" />
              <stop offset="100%" className={`text-${color.split(" ")[1].replace("to-", "")}`} stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <span className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {label}
        </span>
        <p className="text-[10px] text-[#555555] mt-0.5">Confidence: {confidence}</p>
      </div>
    </div>
  );
}

// ============================================================
// Section Wrapper
// ============================================================

function Section({
  title, icon: Icon, children, defaultOpen = true, badge
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#1f1f1f]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
            <Icon size={18} className="text-[#a0a0a0]" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
          {badge}
        </div>
        {open ? <ChevronUp size={16} className="text-[#555555]" /> : <ChevronDown size={16} className="text-[#555555]" />}
      </button>
      {open && <div className="p-5 pt-0 border-t border-[#1a1a1a]">{children}</div>}
    </div>
  );
}

// ============================================================
// Reasoning List (Temporal Aware)
// ============================================================

function ReasoningList({ items, icon: Icon, label, color }: {
  items: TemporalEntry[];
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</span>
      </div>
      {items.map((item, i) => {
        const value = typeof item === "string" ? item : item.value;
        const status = typeof item === "string" ? "active" : item.status;
        const signals = typeof item === "string" ? undefined : item.signals;
        
        let ambiguity = "committed";
        if (signals) {
          if (signals.tentative > 0.5) ambiguity = "tentative";
          else if (signals.exploratory > 0.5) ambiguity = "exploratory";
        }
        
        let statusClasses = "text-[#c0c0c0]";
        let borderStyle = "border-l-2 border-[#222222]";
        
        if (status === "superseded") {
          statusClasses = "text-[#444444] line-through decoration-surface-500/50";
          borderStyle = "border-l-2 border-[#1f1f1f]";
        } else if (status === "reinforced") {
          statusClasses = "text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]";
        }

        if (status === "active" || status === "reinforced") {
          if (ambiguity === "tentative") {
            borderStyle = "border-l-2 border-dashed border-[#2a2a2a]";
            statusClasses += " italic";
          } else if (ambiguity === "exploratory") {
            borderStyle = "border-l-2 border-dotted border-[#333333]";
          }
        }

        return (
          <div key={i} className={`pl-5 py-1.5 ${borderStyle} text-xs leading-relaxed ${statusClasses}`}>
            {value}
            {status === "reinforced" && (
              <span className="ml-2 text-[8px] font-black uppercase tracking-wider text-[#555555] bg-[#1f1f1f] px-1.5 py-0.5 rounded-full">
                Reinforced
              </span>
            )}
            {status === "superseded" && (
              <span className="ml-2 text-[8px] font-black uppercase tracking-wider text-[#444444] bg-[#111111] px-1.5 py-0.5 rounded-full border border-[#1f1f1f]">
                Superseded
              </span>
            )}
            {status !== "superseded" && ambiguity === "tentative" && (
              <span className="ml-2 text-[8px] font-black uppercase tracking-wider text-[#555555] bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                Tentative
              </span>
            )}
            {status !== "superseded" && ambiguity === "exploratory" && (
              <span className="ml-2 text-[8px] font-black uppercase tracking-wider text-[#a0a0a0]/70 bg-[#1f1f1f] px-1.5 py-0.5 rounded-full">
                Exploratory
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function CompareBranches() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const branchAId = searchParams.get("a") || "";
  const branchBId = searchParams.get("b") || "";
  const convId = searchParams.get("conv") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [cognitiveStateOpen, setCognitiveStateOpen] = useState(false);
  
  // Fatigue Tracking
  const [fatigueCount, setFatigueCount] = useState(0);
  const [focusedMode, setFocusedMode] = useState(false);
  const [showFatiguePrompt, setShowFatiguePrompt] = useState(false);
  
  const [interpretationsOpen, setInterpretationsOpen] = useState(false);

  const toggleCognitiveState = () => {
    setCognitiveStateOpen(prev => !prev);
    // Track oscillation loops (rapid toggling is a sign of fatigue/confusion)
    setFatigueCount(c => c + 1);
  };
  
  useEffect(() => {
    if (fatigueCount > 3 && !focusedMode) {
      setShowFatiguePrompt(true);
    }
  }, [fatigueCount, focusedMode]);

  useEffect(() => {
    if (!branchAId || !branchBId) {
      setError("Both branch IDs are required.");
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");
        const data = await api.compareBranches(token, branchAId, branchBId, true);
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Comparison failed.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [branchAId, branchBId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#666666] to-violet-500 flex items-center justify-center shadow-2xl shadow-none animate-pulse">
            <GitCompareArrows size={28} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#a0a0a0]" />
            <p className="text-sm text-[#888888] font-medium">Analyzing branches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Comparison Failed</h2>
          <p className="text-sm text-[#888888] mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { summary, reasoning, code_diffs, memory, divergence, timeline, evolution_timeline, evolution, replay, ai_summary } = result;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="bg-[#111111]/80 backdrop-blur-xl border-b border-[#1e1e1e] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => convId ? navigate(`/chat/${convId}`) : navigate(-1)}
              className="p-2 rounded-xl bg-[#1f1f1f] text-[#888888] hover:text-white hover:bg-[#222222] transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#666666] to-violet-500 flex items-center justify-center shadow-lg shadow-none">
              <GitCompareArrows size={16} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white">Branch Compare</span>
              <p className="text-[10px] text-[#555555] uppercase tracking-widest">
                {summary.branch_a.branch_name} vs {summary.branch_b.branch_name}
              </p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {showFatiguePrompt && !focusedMode && (
          <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="text-[#a0a0a0]" size={20} />
              <p className="text-sm text-[#e0e0e0]">This comparison appears cognitively dense. Switch to Focused Mode?</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFatiguePrompt(false)} className="text-xs text-[#888888] hover:text-white transition-colors">Dismiss</button>
              <button 
                onClick={() => { setFocusedMode(true); setShowFatiguePrompt(false); setCognitiveStateOpen(false); }} 
                className="px-4 py-1.5 rounded-lg bg-white text-white text-xs font-bold hover:bg-white transition-colors"
              >
                Enable Focused Mode
              </button>
            </div>
          </div>
        )}

        {result && result.evolution?.executive_summary && (
          <div className="p-6 rounded-2xl bg-[#111111]/80 border border-[#222222] shadow-xl backdrop-blur-xl">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0] mb-2">Executive Summary</h2>
            <p className="text-base font-medium text-white leading-relaxed">
              {result.evolution.executive_summary}
            </p>
          </div>
        )}

        <Section title="Branch Summary" icon={GitBranch} badge={
          <span className="badge-brand ml-2">{Math.round(divergence.score * 100)}% divergent</span>
        }>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BranchCard summary={summary.branch_a} label="A" color="brand" isBranchA={true} />
            <div className="flex flex-col items-center justify-center py-4">
              <DivergenceBadge score={divergence.score} confidence={divergence.confidence} />
              <p className="text-[10px] text-[#444444] mt-3 text-center">
                Based on {divergence.sample_size} embedding comparisons
              </p>
            </div>
            <BranchCard summary={summary.branch_b} label="B" color="violet" isBranchA={false} />
          </div>
        </Section>

        {ai_summary && (
          <Section title="AI Comparison Summary" icon={Sparkles}>
            <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-[#666666]/5 to-violet-500/5 border border-[#2a2a2a]">
              <div className="text-sm text-[#c0c0c0] leading-relaxed whitespace-pre-wrap">
                {ai_summary}
              </div>
            </div>
          </Section>
        )}

        {evolution.narrative && (
          <Section title="Reasoning Evolution" icon={Activity} badge={
            <div className="flex items-center gap-2 ml-2">
              <span className="badge-brand">Temporal State</span>
              {evolution.confidence !== undefined && (
                <span className={`text-[10px] font-mono ${evolution.confidence > 0.7 ? "text-white" : "text-[#888888]"}`}>
                  Conf: {evolution.confidence.toFixed(2)}
                </span>
              )}
            </div>
          }>
            <div className="mb-4">
              <p className="text-[10px] text-[#888888] uppercase tracking-widest font-bold mb-1">Strategic Summary</p>
              <p className="text-xs text-[#555555] mb-4">This section highlights the most significant shifts in logic, tradeoffs, and architectural decisions that drove the branches apart over time.</p>
            </div>
            
            <div className="mt-4 p-5 rounded-xl bg-gradient-to-br from-[#666666]/5 to-violet-500/5 border border-[#2a2a2a]">
              <p className="text-sm text-[#e0e0e0] leading-relaxed">
                {evolution.narrative}
              </p>
            </div>
            
            {evolution.interpretations && evolution.interpretations.alternatives.length > 0 && (
              <div className="mt-4">
                <button 
                  onClick={() => setInterpretationsOpen(!interpretationsOpen)}
                  className="text-xs font-bold text-[#888888] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Layers size={14} />
                  {interpretationsOpen ? "Hide Interpretations" : "Compare Interpretations"}
                </button>
                
                {interpretationsOpen && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-[#1e1e1e] bg-[#1f1f1f]/30">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white mb-2 block">
                        {evolution.interpretations.primary.label} (Conf: {evolution.interpretations.primary.confidence})
                      </span>
                      <p className="text-xs text-[#c0c0c0] leading-relaxed">{evolution.interpretations.primary.text}</p>
                    </div>
                    {evolution.interpretations.alternatives.map((alt, i) => (
                      <div key={i} className="p-4 rounded-xl border border-[#1e1e1e] bg-[#1f1f1f]/30">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#888888] mb-2 block">
                          {alt.label} (Conf: {alt.confidence})
                        </span>
                        <p className="text-xs text-[#c0c0c0] leading-relaxed">{alt.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {!focusedMode && evolution.ranked_deltas.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="text-[10px] font-black text-[#888888] uppercase tracking-widest">Ranked Divergence Drivers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evolution.ranked_deltas.map((delta, i) => (
                    <div key={i} className="p-4 rounded-xl border border-[#1e1e1e] bg-[#111111]/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-white capitalize">{delta.category.replace("_", " ")}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#666666] to-violet-500" 
                              style={{ width: `${Math.min(100, delta.importance * 100)}%` }} 
                            />
                          </div>
                          <span className="text-[10px] text-[#555555]">{delta.importance.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {delta.only_in_a.length > 0 && (
                          <div>
                            <span className="text-[10px] font-black text-[#a0a0a0] uppercase">Only in A</span>
                            <p className="text-xs text-[#c0c0c0] mt-1 line-clamp-2 leading-relaxed">{delta.only_in_a[0]}</p>
                          </div>
                        )}
                        {delta.only_in_b.length > 0 && (
                          <div>
                            <span className="text-[10px] font-black text-[#a0a0a0] uppercase">Only in B</span>
                            <p className="text-xs text-[#c0c0c0] mt-1 line-clamp-2 leading-relaxed">{delta.only_in_b[0]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        <Section title="Detailed Cognitive State" icon={Brain} badge={
          <>
            {reasoning.branch_a.source === "structured" && (
              <span className="badge-success ml-2 text-[10px] flex items-center gap-1">
                <CheckCircle2 size={10} /> Structured Capture
              </span>
            )}
            {reasoning.branch_a.source === "heuristic" && (
              <span className="badge-warning ml-2 text-[10px]">Heuristic Fallback</span>
            )}
          </>
        }>
          <div className="mb-4">
            <p className="text-[10px] text-[#888888] uppercase tracking-widest font-bold mb-1">Strategic Summary</p>
            <p className="text-xs text-[#555555] mb-4">A complete mapping of active, tentative, and superseded assumptions within each branch's cognitive state.</p>
          </div>
          
          <button 
            onClick={toggleCognitiveState}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1f1f1f] hover:bg-[#222222] transition-colors text-xs font-bold text-[#c0c0c0] border border-[#222222]"
          >
            {cognitiveStateOpen ? "Hide Cognitive Metadata" : "Inspect Full Cognitive State"}
            {cognitiveStateOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {cognitiveStateOpen && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 rounded-xl border border-[#1e1e1e] bg-[#111111]/30">
              <ReasoningColumn reasoning={reasoning.branch_a} branchName={summary.branch_a.branch_name} color="brand" />
              <div className="lg:border-l lg:border-[#1a1a1a] lg:pl-6">
                <ReasoningColumn reasoning={reasoning.branch_b} branchName={summary.branch_b.branch_name} color="violet" />
              </div>
            </div>
          )}
        </Section>

        {/* ============================================================
            SECTION 3: Code Differences
            ============================================================ */}
        {code_diffs.length > 0 && (
          <Section title="Code Differences" icon={Code2} badge={
            <span className="badge-warning ml-2">{code_diffs.length} diff{code_diffs.length > 1 ? "s" : ""}</span>
          }>
            <div className="mt-4 space-y-4">
              {code_diffs.map((diff, i) => (
                <div key={i} className="rounded-xl border border-[#1e1e1e] overflow-hidden">
                  <div className="px-4 py-2 bg-[#1f1f1f]/50 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#c0c0c0]">{diff.language}</span>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="text-white">+{diff.lines_added}</span>
                      <span className="text-red-400">-{diff.lines_removed}</span>
                    </div>
                  </div>
                  <pre className="p-4 text-xs font-mono text-[#c0c0c0] overflow-x-auto bg-[#0a0a0a]/50 leading-relaxed">
                    {diff.diff.split("\n").map((line, j) => {
                      let cls = "text-[#555555]";
                      if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-white bg-white/5";
                      else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-red-400 bg-red-500/5";
                      else if (line.startsWith("@@")) cls = "text-white";
                      return <div key={j} className={`px-2 ${cls}`}>{line}</div>;
                    })}
                  </pre>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ============================================================
            SECTION 4: Memory Retrieval Differences
            ============================================================ */}
        <Section title="Memory Retrieval" icon={Database}>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Shared Memories" value={memory.shared_memories} sub="Retrieved by both branches" color="text-[#a0a0a0]" />
            <MetricCard label="Unique to A" value={memory.unique_to_a} sub={`${summary.branch_a.branch_name} only`} color="text-white" />
            <MetricCard label="Unique to B" value={memory.unique_to_b} sub={`${summary.branch_b.branch_name} only`} color="text-[#a0a0a0]" />
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#1f1f1f]/30 border border-[#1a1a1a]">
              <p className="text-[10px] font-black text-[#a0a0a0] uppercase tracking-widest mb-2">Branch A Context</p>
              <div className="flex items-center gap-4">
                <StatPill label="Messages" value={memory.branch_a.message_count} />
                <StatPill label="Semantic" value={memory.branch_a.semantic_count} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#1f1f1f]/30 border border-[#1a1a1a]">
              <p className="text-[10px] font-black text-[#a0a0a0] uppercase tracking-widest mb-2">Branch B Context</p>
              <div className="flex items-center gap-4">
                <StatPill label="Messages" value={memory.branch_b.message_count} />
                <StatPill label="Semantic" value={memory.branch_b.semantic_count} />
              </div>
            </div>
          </div>
        </Section>

        {/* ============================================================
            SECTION 5: Timeline / Replay
            ============================================================ */}
        <Section title="Replay Timeline" icon={Clock} defaultOpen={false}>
          <div className="mb-4">
            <p className="text-[10px] text-[#888888] uppercase tracking-widest font-bold mb-1">Strategic Summary</p>
            <p className="text-xs text-[#555555] mb-4">Navigable history of how the conversation evolved. Timeline markers isolate significant cognitive pivots (architecture, tradeoffs) while suppressing minor conversational noise.</p>
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimelineColumn entries={timeline.branch_a} evoTimeline={evolution_timeline.branch_a} label={summary.branch_a.branch_name} color="brand" replay={replay.branch_a} />
            <TimelineColumn entries={timeline.branch_b} evoTimeline={evolution_timeline.branch_b} label={summary.branch_b.branch_name} color="violet" replay={replay.branch_b} />
          </div>
        </Section>

      </div>
    </div>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function BranchCard({ summary, label, color, isBranchA: _isBranchA }: { summary: BranchSummary; label: string; color: string; isBranchA?: boolean }) {
  const colorMap: Record<string, string> = {
    brand: "from-[#666666]/15 to-white/5 border-[#2a2a2a]",
    violet: "from-violet-500/15 to-violet-600/5 border-[#333333]",
  };
  const textMap: Record<string, string> = {
    brand: "text-[#a0a0a0]",
    violet: "text-[#a0a0a0]",
  };
  return (
    <div className={`p-5 rounded-xl bg-gradient-to-br ${colorMap[color]} border`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-lg bg-[#1f1f1f] flex items-center justify-center text-xs font-black ${textMap[color]}`}>
          {label}
        </div>
        <h4 className="text-sm font-bold text-white truncate">{summary.branch_name}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[#555555]">Messages</p>
          <p className="font-bold text-white">{summary.message_count}</p>
        </div>
        <div>
          <p className="text-[#555555]">Depth</p>
          <p className="font-bold text-white">{summary.depth}</p>
        </div>
        <div>
          <p className="text-[#555555]">Code Blocks</p>
          <p className="font-bold text-white">{summary.code_block_count}</p>
        </div>
        <div>
          <p className="text-[#555555]">Est. Tokens</p>
          <p className="font-bold text-white">{summary.estimated_tokens.toLocaleString()}</p>
        </div>
      </div>
      {summary.languages_used.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.languages_used.map(lang => (
            <span key={lang} className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#1f1f1f] text-[#888888] border border-[#222222]">
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#1f1f1f]/30 border border-[#1a1a1a] text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs font-bold text-white mt-1">{label}</p>
      <p className="text-[10px] text-[#555555] mt-0.5">{sub}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-bold text-white">{value}</span>
      <span className="text-[10px] text-[#555555]">{label}</span>
    </div>
  );
}

function TimelineColumn({ entries, evoTimeline, label, color, replay }: {
  entries: TimelineEntry[];
  evoTimeline: EvolutionTimelineEntry[];
  label: string;
  color: string;
  replay: { has_snapshot: boolean; model: string | null; system_prompt_preview: string | null };
}) {
  const textColor = color === "brand" ? "text-[#a0a0a0]" : "text-[#a0a0a0]";
  const dotColor = color === "brand" ? "bg-white" : "bg-violet-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>{label}</h4>
        {replay.has_snapshot && (
          <span className="badge-success text-[10px]">Replay Available</span>
        )}
      </div>
      {replay.model && (
        <p className="text-[10px] text-[#555555] mb-3">Model: <span className="text-[#c0c0c0] font-mono">{replay.model}</span></p>
      )}
      <div className="space-y-0">
        {entries.slice(0, 20).map((entry, i) => {
          // Find matching evolution entry for this node if any
          const evo = evoTimeline.find(e => e.node_id === entry.node_id);
          
          return (
            <div key={i} className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full ${entry.role === "assistant" ? dotColor : "bg-surface-600"} mt-2 flex-shrink-0`} />
                {i < entries.length - 1 && <div className="w-px flex-1 bg-[#222222]/50" />}
              </div>
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${entry.role === "assistant" ? textColor : "text-[#555555]"}`}>
                    {entry.role}
                  </span>
                  <span className="text-[9px] text-[#444444] font-mono">
                    {new Date(entry.time).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">{entry.content_preview}</p>
                
                {/* Evolution marker for assistant messages */}
                {entry.role === "assistant" && evo && (
                  <div className="mt-2 p-2.5 rounded-lg bg-[#1f1f1f]/50 border border-[#1e1e1e]">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain size={12} className={textColor} />
                      <span className="text-[9px] font-bold text-[#c0c0c0] uppercase tracking-widest">Reasoning Turn {evo.turn}</span>
                    </div>
                    <p className="text-xs text-[#888888] line-clamp-1 italic">"{evo.summary}"</p>
                    <div className="mt-1.5 flex gap-1.5">
                      {evo.dominant_categories.map(cat => (
                        <span key={cat} className="text-[8px] uppercase font-bold text-[#555555] bg-[#111111] px-1.5 py-0.5 rounded">
                          {cat.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-xs text-[#555555] italic">No messages in this branch.</p>}
      </div>
    </div>
  );
}

function ReasoningColumn({ reasoning, branchName, color }: {
  reasoning: ReasoningPoints;
  branchName: string;
  color: string;
}) {
  const textColor = color === "brand" ? "text-[#a0a0a0]" : "text-[#a0a0a0]";

  const confColor = reasoning.confidence === "high"
    ? "text-white"
    : reasoning.confidence === "medium" ? "text-[#888888]" : "text-red-400";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>
          {color === "brand" ? "A" : "B"} — {branchName}
        </h4>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold ${confColor}`}>
            {reasoning.confidence} confidence
          </span>
          {reasoning.snapshot_count && reasoning.snapshot_count > 0 && (
            <span className="text-[10px] text-[#555555]">
              ({reasoning.snapshot_count} turns)
            </span>
          )}
        </div>
      </div>

      <ReasoningList items={reasoning.decisions || []} icon={Target} label="Decisions" color="text-white" />
      <ReasoningList items={reasoning.assumptions || []} icon={Lightbulb} label="Assumptions" color="text-[#888888]" />
      <ReasoningList items={reasoning.priorities || []} icon={Activity} label="Priorities" color="text-gray-300" />
      <ReasoningList items={reasoning.goals || []} icon={Crosshair} label="Goals" color="text-white" />
      <ReasoningList items={reasoning.constraints || []} icon={Shield} label="Constraints" color="text-red-400" />
      <ReasoningList items={reasoning.tradeoffs || []} icon={Scale} label="Trade-offs" color="text-[#a0a0a0]" />
      <ReasoningList items={reasoning.architecture_patterns || []} icon={Cpu} label="Architecture" color="text-teal-400" />
      <ReasoningList items={reasoning.code_summary || []} icon={Wrench} label="Code Summary" color="text-indigo-400" />
    </div>
  );
}
