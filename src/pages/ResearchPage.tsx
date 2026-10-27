import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Target,
  Sparkles,
  Layers,
  Download,
  Plus,
  RotateCcw,
  Clock,
  Shield,
  HelpCircle,
  GitBranch,
  Filter,
  Check,
  ChevronRight,
  ChevronDown,
  Trash2,
  BookOpen,
  ArrowRight,
  Scale,
  Percent,
  RotateCw,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { ErrorState } from "../components/common/ErrorState";
import { OfflineBanner } from "../components/common/OfflineBanner";
import { CreateMissionModal } from "../components/chat/CreateMissionModal";
import { useModels } from "../hooks/useModels";
import { useBranch } from "../hooks/useBranch";
import { useConversation } from "../hooks/useConversation";
import {
  executeResearchSynthesize,
  executeResearchSearch,
  loadDemonstrationSynthesisReport,
  getSavedResearchSessions,
  saveResearchSession,
  deleteResearchSession,
} from "../services/researchApi";
import { getAuthoritativeWorkspaceId } from "../services/workspaceContext";
import type {
  SearchResultItem,
  EvidenceItem,
  ConsensusPoint,
  ConflictItem,
  SynthesisReport,
  ResearchPlanStep,
  ResearchSessionRecord,
} from "../types/research";
import { cn } from "../lib/utils";

export const ResearchPage: React.FC = () => {
  const { models } = useModels();
  const { branches, activeBranchId, fetchBranches } = useBranch();
  const { conversations, fetchConversations } = useConversation();

  // Active Workspace from authoritative context
  const activeWorkspaceId = getAuthoritativeWorkspaceId();

  // Navigation / Tab state within Research
  const [activeTab, setActiveTab] = useState<"SYNTHESIS" | "EVIDENCE" | "CONTRADICTIONS" | "PLAN">("SYNTHESIS");

  // Research Query State
  const [objective, setObjective] = useState("");
  const [subqueriesInput, setSubqueriesInput] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("gemini-flash");
  const [researchScope, setResearchScope] = useState<"broad" | "deep" | "verified_only">("deep");

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isResumedSession, setIsResumedSession] = useState(false);
  const [savedSessions, setSavedSessions] = useState<ResearchSessionRecord[]>([]);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [planSteps, setPlanSteps] = useState<ResearchPlanStep[]>([]);
  const [synthesisReport, setSynthesisReport] = useState<SynthesisReport | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Mission Conversion Modal State
  const [createMissionOpen, setCreateMissionOpen] = useState(false);

  // 1. Initial Load: Load saved sessions and model default
  useEffect(() => {
    fetchConversations();
    const sessions = getSavedResearchSessions();
    setSavedSessions(sessions);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, fetchConversations]);

  // Load branches if conversation exists
  useEffect(() => {
    if (conversations.length > 0) {
      fetchBranches(conversations[0].id);
    }
  }, [conversations, fetchBranches]);

  // Reopen a saved session
  const handleOpenSession = (session: ResearchSessionRecord) => {
    setCurrentSessionId(session.id);
    setIsResumedSession(true);
    setObjective(session.topic);
    setPlanSteps(session.plan);
    setSynthesisReport(session.synthesis_report || null);
    if (session.model_id) setSelectedModelId(session.model_id);
    setExecutionError(null);
  };

  // Start fresh research session
  const handleStartFreshSession = () => {
    setCurrentSessionId(null);
    setIsResumedSession(false);
    setObjective("");
    setSubqueriesInput("");
    setPlanSteps([]);
    setSynthesisReport(null);
    setExecutionError(null);
  };

  // Delete a saved session
  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteResearchSession(id);
    setSavedSessions(getSavedResearchSessions());
    if (currentSessionId === id) {
      handleStartFreshSession();
    }
  };

  // Execute full research investigation
  const handleExecuteResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim() || isRunning) return;

    setIsRunning(true);
    setExecutionError(null);

    const sessionId = currentSessionId || `res-${Date.now()}`;
    setCurrentSessionId(sessionId);
    setIsResumedSession(false);

    // Parse subqueries or generate plan steps from objective
    const parsedSubqueries = subqueriesInput
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const initialSteps: ResearchPlanStep[] =
      parsedSubqueries.length > 0
        ? parsedSubqueries.map((sq, idx) => ({
            id: `step-${idx + 1}`,
            subquery: sq,
            status: "pending",
          }))
        : [
            {
              id: "step-1",
              subquery: objective.trim(),
              status: "pending",
            },
            {
              id: "step-2",
              subquery: `${objective.trim()} verification and trade-offs`,
              status: "pending",
            },
          ];

    setPlanSteps(initialSteps);

    const effectiveBranchId = activeBranchId || (branches[0] ? branches[0].id : "branch-default");

    try {
      // Update plan step state to searching
      setPlanSteps((prev) =>
        prev.map((step) => ({ ...step, status: "searching" }))
      );

      // Call authoritative backend synthesis tool
      const report = await executeResearchSynthesize(
        activeWorkspaceId,
        effectiveBranchId,
        objective.trim(),
        initialSteps.map((s) => s.subquery)
      );

      setSynthesisReport(report);

      // Mark all plan steps as completed
      const completedSteps = initialSteps.map((step) => ({
        ...step,
        status: "completed" as const,
        resultsCount: report.evidence_points?.length || 0,
      }));
      setPlanSteps(completedSteps);

      // Save session to history
      const sessionRecord: ResearchSessionRecord = {
        id: sessionId,
        topic: objective.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        workspace_id: activeWorkspaceId,
        branch_id: effectiveBranchId,
        model_id: selectedModelId,
        plan: completedSteps,
        synthesis_report: report,
        status: "completed",
      };
      saveResearchSession(sessionRecord);
      setSavedSessions(getSavedResearchSessions());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Research execution failed";
      setExecutionError(msg);
      setPlanSteps((prev) =>
        prev.map((step) => ({ ...step, status: "failed", error: msg }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Explicitly Load Sample Demo Report (Synthetic) - DEF-04
  const handleLoadSampleDemoReport = () => {
    const report = loadDemonstrationSynthesisReport(
      objective.trim() || "Algorithmic loop optimizations vs native C++17 SIMD transpilation",
      subqueriesInput
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );
    setSynthesisReport(report);
    setExecutionError(null);
    setPlanSteps([
      {
        id: "demo-step-1",
        subquery: "[Sample Demo] LLVM auto-vectorization bounds",
        status: "completed",
        resultsCount: report.evidence_points?.length || 0,
      },
      {
        id: "demo-step-2",
        subquery: "[Sample Demo] Memory bus saturation and cache limits",
        status: "completed",
        resultsCount: report.evidence_points?.length || 0,
      },
    ]);
  };

  // Export Markdown Report
  const handleDownloadMarkdown = () => {
    if (!synthesisReport) return;
    const blob = new Blob([synthesisReport.markdown_report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-report-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Evidence JSON
  const handleDownloadEvidenceJSON = () => {
    if (!synthesisReport) return;
    const data = {
      topic: synthesisReport.topic,
      consensus_score: synthesisReport.consensus_score,
      evidence_points: synthesisReport.evidence_points,
      conflicts_detected: synthesisReport.conflicts_detected,
      consensus_points: synthesisReport.consensus_points,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evidence-ledger-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy report to clipboard
  const handleCopyReport = async () => {
    if (!synthesisReport) return;
    try {
      await navigator.clipboard.writeText(synthesisReport.markdown_report);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-app-bg text-app-text">
      <OfflineBanner />

      {/* 1. Left Session History Rail */}
      <div className="w-64 border-r border-app-border bg-app-secondary flex flex-col shrink-0">
        <div className="p-3 border-b border-app-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            Investigations
          </span>
          <button
            onClick={handleStartFreshSession}
            className="p-1.5 rounded-lg bg-app-card border border-app-border text-app-text hover:bg-app-secondary transition-colors"
            title="Start New Investigation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-app-muted">
              No saved research sessions. Start an investigation to compile evidence.
            </div>
          ) : (
            savedSessions.map((s) => {
              const isActive = currentSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleOpenSession(s)}
                  className={cn(
                    "group relative flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer",
                    isActive
                      ? "bg-app-card text-app-text font-medium border border-app-border"
                      : "text-app-dim hover:bg-app-card/60 hover:text-app-text"
                  )}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                    <FlaskConical className="w-3.5 h-3.5 shrink-0 text-app-muted" />
                    <span className="truncate">{s.topic}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-app-muted hover:text-red-400 transition-opacity"
                    title="Delete investigation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Workspace Footer Indicator */}
        <div className="p-3 border-t border-app-border bg-app-secondary/80 text-[11px] font-mono text-app-dim flex items-center justify-between">
          <span>Scope: {activeWorkspaceId}</span>
          <FeatureUnavailableBadge status="LIVE" label="Jailed" />
        </div>
      </div>

      {/* 2. Main Research Workspace Viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        {/* Research Header */}
        <div className="p-6 border-b border-app-border bg-app-secondary/30 shrink-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-app-text" />
                  Research & Multi-Model Evidence Synthesis
                </h1>
                <FeatureUnavailableBadge status="LIVE" label="Native Engine" />
                {isResumedSession && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-card border border-app-border text-app-muted">
                    Resumed Session
                  </span>
                )}
              </div>
              <p className="text-xs text-app-muted">
                Investigate complex topics across verified web sources, cross-reference evidence, evaluate multi-model consensus, and isolate factual contradictions.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setCreateMissionOpen(true)}
                disabled={!synthesisReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                title="Convert this research into an authoritative Level 3 Mission"
              >
                <Target className="w-3.5 h-3.5" />
                Promote to Mission
              </button>
            </div>
          </div>

          {/* Research Objective Composer Form */}
          <form onSubmit={handleExecuteResearch} className="bg-app-card border border-app-border rounded-xl p-4 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block">
                Primary Research Objective / Question
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-app-muted" />
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    disabled={isRunning}
                    placeholder="e.g. Compare algorithmic loop optimizations vs native C++17 SIMD transpilation in numerical bottlenecks"
                    className="w-full pl-9 pr-4 py-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text placeholder:text-app-muted outline-none focus:border-app-strong transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRunning || !objective.trim()}
                  className="px-4 py-2 bg-app-accent text-app-inverted rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0 flex items-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{isRunning ? "Synthesizing..." : "Execute Investigation"}</span>
                </button>
              </div>
            </div>

            {/* Optional Subqueries / Constraints Drawer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-app-border text-xs">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-app-dim block mb-1">
                  Parallel Sub-Queries (One per line, optional)
                </label>
                <textarea
                  value={subqueriesInput}
                  onChange={(e) => setSubqueriesInput(e.target.value)}
                  disabled={isRunning}
                  rows={2}
                  placeholder="e.g.&#10;C++17 SIMD Vectorization benchmark&#10;Python recursive execution bottleneck"
                  className="w-full px-3 py-1.5 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text placeholder:text-app-muted outline-none focus:border-app-strong font-mono resize-none"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-app-dim block mb-1">
                    Model Gateway Evaluator
                  </label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-3 py-1.5 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none font-mono"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-app-muted font-mono">
                  <span>Engine: Multi-Source Web Adapter</span>
                  <span>·</span>
                  <span>Consensus: Strict Math Analysis</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Execution Error Banner (DEF-04) */}
        {executionError && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3 text-red-400">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-red-300">Live Empirical Research Unavailable</span>
                  <p className="text-red-400/90 leading-relaxed">{executionError}</p>
                </div>
              </div>
              <button
                onClick={() => setExecutionError(null)}
                className="text-xs text-red-300/80 hover:text-red-200 underline shrink-0"
              >
                Dismiss
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-500/20">
              <button
                type="button"
                onClick={(e) => handleExecuteResearch(e)}
                disabled={isRunning || !objective.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-medium transition-colors disabled:opacity-40"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Investigation</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleDemoReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors"
                title="Load deterministic synthetic evidence to evaluate interface layout"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Load Sample Demo Report (Synthetic)</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Plan Progress Banner */}
        {isRunning && (
          <div className="mx-6 mt-4 p-4 bg-app-card border border-app-border rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-app-text">
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-app-text border-t-transparent rounded-full animate-spin" />
                Executing Investigation Plan across Live Sources...
              </span>
              <span className="font-mono text-[11px] text-app-muted">
                {planSteps.length} planned subqueries
              </span>
            </div>
            <div className="space-y-1.5">
              {planSteps.map((step) => (
                <div
                  key={step.id}
                  className="p-2 rounded bg-app-secondary border border-app-border text-xs flex items-center justify-between font-mono"
                >
                  <span className="text-app-text truncate">{step.subquery}</span>
                  <span className="text-[10px] text-app-muted uppercase">{step.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research Results Workspace */}
        {synthesisReport ? (
          <div className="p-6 space-y-6">
            {/* Synthetic Demonstration Mode Banner (DEF-04) */}
            {(synthesisReport.is_offline_demonstration || synthesisReport.is_synthetic_demonstration) && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl font-mono flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>SYNTHETIC DEMONSTRATION DATA (MOCK):</strong>{" "}
                    {synthesisReport.offline_disclaimer
                      ? synthesisReport.offline_disclaimer.replace(/^SYNTHETIC DEMONSTRATION DATA \(MOCK\):\s*/i, "")
                      : "Backend research service was not reached. This report is generated from static fixtures for interface demonstration only and does NOT contain live empirical evidence."}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-[10px] font-bold tracking-wider rounded uppercase shrink-0">
                  SYNTHETIC MOCK
                </span>
              </div>
            )}

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Consensus Index */}
              <div className="p-4 bg-app-card border border-app-border rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-app-muted">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-app-text" />
                    Consensus Index
                  </span>
                  <FeatureUnavailableBadge
                    status={synthesisReport.consensus_score >= 0.8 ? "LIVE" : "DEGRADED"}
                    label={`${(synthesisReport.consensus_score * 100).toFixed(0)}%`}
                  />
                </div>
                <div className="text-2xl font-bold font-mono text-app-text">
                  {(synthesisReport.consensus_score * 100).toFixed(0)}%
                </div>
                <p className="text-[11px] text-app-dim">
                  {synthesisReport.consensus_score >= 0.8
                    ? "High factual agreement across retrieved sources."
                    : "Low consensus; conflicting claims penalize score."}
                </p>
              </div>

              {/* Evidence Points */}
              <div className="p-4 bg-app-card border border-app-border rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-app-muted">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-app-text" />
                    Evidence Points
                  </span>
                  <span className="font-mono text-xs text-app-dim">
                    {synthesisReport.evidence_points?.length || 0} claims
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-app-text">
                  {synthesisReport.evidence_points?.length || 0}
                </div>
                <p className="text-[11px] text-app-dim">
                  Verified claims extracted with citation provenance.
                </p>
              </div>

              {/* Contradictions Flagged */}
              <div className="p-4 bg-app-card border border-app-border rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-app-muted">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-app-text" />
                    Contradictions
                  </span>
                  <FeatureUnavailableBadge
                    status={synthesisReport.conflicts_detected?.length === 0 ? "LIVE" : "DEGRADED"}
                    label={`${synthesisReport.conflicts_detected?.length || 0} Flagged`}
                  />
                </div>
                <div className="text-2xl font-bold font-mono text-app-text">
                  {synthesisReport.conflicts_detected?.length || 0}
                </div>
                <p className="text-[11px] text-app-dim">
                  {synthesisReport.conflicts_detected?.length === 0
                    ? "Zero factual contradictions detected."
                    : "Material numerical or status disputes identified."}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-app-border text-xs">
              <div className="flex items-center gap-1">
                {[
                  { id: "SYNTHESIS", label: "Structured Synthesis Report" },
                  { id: "EVIDENCE", label: `Evidence Ledger (${synthesisReport.evidence_points?.length || 0})` },
                  { id: "CONTRADICTIONS", label: `Contradiction Matrix (${synthesisReport.conflicts_detected?.length || 0})` },
                  { id: "PLAN", label: `Research Plan (${planSteps.length})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={cn(
                      "px-3.5 py-2 font-medium border-b-2 transition-colors",
                      activeTab === t.id
                        ? "border-app-text text-app-text font-semibold"
                        : "border-transparent text-app-muted hover:text-app-text"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={handleCopyReport}
                  className="px-2.5 py-1 rounded bg-app-card border border-app-border text-[11px] text-app-text hover:bg-app-secondary transition-colors flex items-center gap-1"
                >
                  {copiedReport ? <Check className="w-3 h-3 text-emerald-400" /> : <FileText className="w-3 h-3" />}
                  <span>{copiedReport ? "Copied" : "Copy Report"}</span>
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1 rounded bg-app-card border border-app-border text-[11px] text-app-text hover:bg-app-secondary transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={handleDownloadEvidenceJSON}
                  className="px-2.5 py-1 rounded bg-app-card border border-app-border text-[11px] text-app-text hover:bg-app-secondary transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Structured Synthesis Report */}
            {activeTab === "SYNTHESIS" && (
              <div className="bg-app-card border border-app-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="prose prose-invert max-w-none text-xs leading-relaxed text-app-text whitespace-pre-wrap font-sans">
                  {synthesisReport.markdown_report}
                </div>
              </div>
            )}

            {/* TAB 2: Evidence Ledger */}
            {activeTab === "EVIDENCE" && (
              <div className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-app-border flex items-center justify-between bg-app-secondary/50 text-xs">
                  <span className="font-semibold text-app-text">
                    Verified Evidence Points with Source Provenance
                  </span>
                  <span className="text-app-muted font-mono text-[11px]">
                    {synthesisReport.evidence_points?.length || 0} claims
                  </span>
                </div>

                <div className="divide-y divide-app-border">
                  {synthesisReport.evidence_points?.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-app-secondary/30 transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-secondary border border-app-border text-app-muted">
                            {item.id}
                          </span>
                          <span className="text-[11px] font-mono text-app-dim">
                            Confidence: {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-app-dim hover:text-app-text underline truncate max-w-sm"
                        >
                          <span>{item.source_title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      <p className="text-xs text-app-text leading-relaxed font-sans">{item.claim}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Contradiction Matrix */}
            {activeTab === "CONTRADICTIONS" && (
              <div className="space-y-4">
                {synthesisReport.conflicts_detected?.length === 0 ? (
                  <div className="p-8 text-center bg-app-card border border-app-border rounded-xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h3 className="text-sm font-semibold text-app-text">Cross-Model Consensus Verified</h3>
                    <p className="text-xs text-app-muted max-w-md mx-auto">
                      No material contradictions or mutually exclusive assertions were detected across the gathered evidence points.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {synthesisReport.conflicts_detected?.map((c, idx) => (
                      <div
                        key={idx}
                        className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-app-border pb-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <h4 className="text-xs font-semibold text-app-text">
                              Aspect: {c.topic_aspect}
                            </h4>
                          </div>
                          <FeatureUnavailableBadge
                            status={c.severity === "high" ? "DEGRADED" : "PLANNED"}
                            label={`Severity: ${c.severity.toUpperCase()}`}
                          />
                        </div>

                        {/* Competing Claims Side-by-Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="p-3 bg-app-secondary border border-app-border rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-app-muted">
                              <span>Claim A</span>
                              <a
                                href={c.source_a}
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-app-text flex items-center gap-1"
                              >
                                Source <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className="text-app-text leading-relaxed">"{c.claim_a}"</p>
                          </div>

                          <div className="p-3 bg-app-secondary border border-app-border rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-app-muted">
                              <span>Claim B</span>
                              <a
                                href={c.source_b}
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-app-text flex items-center gap-1"
                              >
                                Source <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className="text-app-text leading-relaxed">"{c.claim_b}"</p>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                          <span className="font-semibold">Conflict Analysis: </span>
                          <span>{c.explanation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Research Plan & Execution Subqueries */}
            {activeTab === "PLAN" && (
              <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-app-border pb-3 text-xs">
                  <div>
                    <h4 className="font-semibold text-app-text">Authoritative Research Plan</h4>
                    <p className="text-[11px] text-app-muted">
                      Decomposition of primary research question into parallel search tasks.
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-app-dim">
                    {planSteps.length} tasks
                  </span>
                </div>

                <div className="space-y-2">
                  {planSteps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-3 bg-app-secondary border border-app-border rounded-lg flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-app-muted">#{idx + 1}</span>
                        <span className="text-app-text">{step.subquery}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.resultsCount !== undefined && (
                          <span className="text-[11px] text-app-dim">
                            {step.resultsCount} sources
                          </span>
                        )}
                        <FeatureUnavailableBadge
                          status={step.status === "completed" ? "LIVE" : step.status === "failed" ? "UNAVAILABLE" : "PLANNED"}
                          label={step.status.toUpperCase()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !isRunning && (
            <div className="p-8 max-w-xl mx-auto my-auto text-center space-y-4">
              <EmptyState
                icon={FlaskConical}
                title="Deep Evidence Synthesis"
                description="Enter an architectural question, algorithmic benchmark, or systems topic above to begin multi-source retrieval, contradiction identification, and consensus scoring."
                actionLabel="Try: Analyze SIMD vs Dynamic Programming"
                onAction={() => {
                  setObjective("Compare algorithmic loop caching vs native C++17 SIMD vectorization in numerical bottlenecks");
                  setSubqueriesInput("Algorithm dynamic programming caching\nC++17 SIMD vectorization benchmark");
                }}
              />
            </div>
          )
        )}
      </div>

      {/* 3. Explicit Create Mission Modal */}
      <CreateMissionModal
        isOpen={createMissionOpen}
        onClose={() => setCreateMissionOpen(false)}
        conversationId={conversations[0]?.id || ""}
        branchId={activeBranchId || (branches[0] ? branches[0].id : "branch-default")}
        workspaceId={activeWorkspaceId}
        initialObjective={
          synthesisReport
            ? `${(synthesisReport.is_synthetic_demonstration || synthesisReport.is_offline_demonstration) ? "[SYNTHETIC DEMO EVIDENCE - NOT EMPIRICAL]\n\n" : ""}Mission derived from Research: ${synthesisReport.topic}\n\nKey Findings:\n${synthesisReport.summary}`
            : objective
        }
        availableModels={models}
        currentModelId={selectedModelId}
        researchProvenance={
          synthesisReport
            ? {
                researchSessionId: currentSessionId || undefined,
                isSyntheticDemonstration: Boolean(synthesisReport.is_synthetic_demonstration || synthesisReport.is_offline_demonstration),
                sourceCount: synthesisReport.sources?.length || 0,
              }
            : undefined
        }
      />
    </div>
  );
};
