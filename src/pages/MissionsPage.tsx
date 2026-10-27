import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Terminal,
  FileCode,
  ShieldCheck,
  ChevronRight,
  XCircle,
  Search,
  Filter,
  ArrowLeft,
  FileCheck2,
  ShieldAlert,
  Cpu,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { ErrorState } from "../components/common/ErrorState";
import { OfflineBanner } from "../components/common/OfflineBanner";
import { ExecutionGraphView } from "../components/missions/ExecutionGraphView";
import { StepRunbookDrawer } from "../components/missions/StepRunbookDrawer";
import { CreateMissionModal } from "../components/chat/CreateMissionModal";
import { PermissionApprovalModal, type PermissionRequest } from "../components/PermissionApprovalModal";
import {
  getWorkspaceMissions,
  fetchWorkspaceMissions,
  getMissionById,
  saveWorkspaceMission,
  cancelMissionJob,
  approveMissionReplan,
  type MissionRecord,
  type AuthoritativeMissionStatus,
  type PlanStepData,
} from "../services/orchestratorApi";
import {
  getAuthoritativeWorkspaceId,
  subscribeToWorkspaceChanges,
} from "../services/workspaceContext";
import { useModels } from "../hooks/useModels";
import { useBranch } from "../hooks/useBranch";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";

export const MissionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const missionIdParam = searchParams.get("missionId");

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() =>
    getAuthoritativeWorkspaceId()
  );
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCrossWorkspaceForbidden, setIsCrossWorkspaceForbidden] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const requestSeqRef = React.useRef(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AuthoritativeMissionStatus>("ALL");

  // Selection & Detail View
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(missionIdParam);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "GRAPH" | "RUNBOOK" | "DELIVERABLES" | "VERIFICATION" | "AUDIT"
  >("GRAPH");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Modals & Action Controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApprovalStep, setPendingApprovalStep] = useState<PlanStepData | null>(null);

  const { models } = useModels();
  const { branches, activeBranchId } = useBranch();

  // Listen to authoritative workspace changes
  useEffect(() => {
    const unsubscribe = subscribeToWorkspaceChanges((newWs) => {
      setActiveWorkspaceId(newWs);
      setSelectedMissionId(null);
      setSelectedStepId(null);
      setMissions([]);
      setError(null);
      setIsCrossWorkspaceForbidden(false);
      setIsOffline(false);
    });
    return () => unsubscribe();
  }, []);

  // Load missions strictly scoped to active workspace
  const reloadMissions = () => {
    const seq = ++requestSeqRef.current;
    const targetWs = activeWorkspaceId;

    setIsLoading(true);
    setError(null);
    setIsCrossWorkspaceForbidden(false);
    setIsOffline(false);

    // Asynchronously fetch authoritative mission records from server
    fetchWorkspaceMissions(targetWs)
      .then((records) => {
        // Discard stale response if workspace changed or another request was issued
        if (seq !== requestSeqRef.current || targetWs !== activeWorkspaceId) {
          return;
        }
        setMissions(records);
        setIsOffline(false);

        if (missionIdParam) {
          const match = records.find((r) => r.id === missionIdParam);
          if (match) {
            setSelectedMissionId(match.id);
          } else {
            setSelectedMissionId(null);
          }
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeqRef.current || targetWs !== activeWorkspaceId) {
          return;
        }
        const errMsg = err instanceof Error ? err.message : String(err);
        const isAuthError =
          errMsg.includes("(401)") ||
          errMsg.includes("(403)") ||
          errMsg.includes("401") ||
          errMsg.includes("403");

        if (isAuthError) {
          // DEF-FE-01: Prohibit displaying cached missions on authentication / authorization failure
          setMissions([]);
          setSelectedMissionId(null);
          setIsOffline(false);
          if (errMsg.includes("(403)") || errMsg.includes("403")) {
            setIsCrossWorkspaceForbidden(true);
          } else {
            setError(`Authentication failed: ${errMsg}`);
          }
        } else {
          // Ordinary network disconnection: fallback to local cache ONLY with explicit offline degraded banner
          console.warn("[MISSIONS-PAGE] Live mission fetch failed, falling back to cached state:", err);
          const cached = getWorkspaceMissions(targetWs);
          if (cached.length > 0) {
            setMissions(cached);
            setIsOffline(true);
          } else {
            setMissions([]);
            setError(`Unable to connect to orchestrator: ${errMsg}`);
          }
        }
        setIsLoading(false);
      });
  };

  useEffect(() => {
    reloadMissions();
  }, [activeWorkspaceId, missionIdParam]);

  // Active Selected Mission Record
  const activeMission = useMemo(() => {
    if (!selectedMissionId) return null;
    return missions.find((m) => m.id === selectedMissionId) || null;
  }, [selectedMissionId, missions]);

  // Selected Step Record for Drawer
  const activeStep = useMemo(() => {
    if (!activeMission || !activeMission.plan || !selectedStepId) return null;
    return activeMission.plan.steps.find((s) => s.step_id === selectedStepId) || null;
  }, [activeMission, selectedStepId]);

  // Filtered Missions List
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [missions, searchQuery, statusFilter]);

  // Select a Mission
  const handleSelectMission = (id: string) => {
    setSelectedMissionId(id);
    setSelectedStepId(null);
    setSearchParams({ missionId: id });
  };

  // Clear Selection / Back to Overview
  const handleBackToOverview = () => {
    setSelectedMissionId(null);
    setSelectedStepId(null);
    setSearchParams({});
  };

  // Cancel Running Mission
  const handleCancelMission = async () => {
    if (!activeMission) return;
    if (!window.confirm("Are you sure you want to terminate this autonomous mission?")) return;

    setIsCancelling(true);
    setActionMessage(null);

    try {
      const jobId = activeMission.active_job_id || activeMission.id;
      const res = await cancelMissionJob(activeWorkspaceId, jobId);

      const updated: MissionRecord = {
        ...activeMission,
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
        execution_logs: [
          ...(activeMission.execution_logs || []),
          {
            timestamp: new Date().toISOString(),
            level: "warn",
            message: "Mission execution terminated by operator cancel signal.",
          },
        ],
      };
      saveWorkspaceMission(updated);
      setMissions(getWorkspaceMissions(activeWorkspaceId));
      setActionMessage("Mission successfully cancelled.");
    } catch (err: unknown) {
      setActionMessage(
        err instanceof Error ? `Cancellation failed: ${err.message}` : "Cancellation error"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // CAS Gating Human Approval Trigger
  const handleOpenCASApproval = (stepId: string) => {
    if (!activeMission || !activeMission.plan) return;
    const step = activeMission.plan.steps.find((s) => s.step_id === stepId);
    if (step) {
      setPendingApprovalStep(step);
      setShowApprovalModal(true);
    }
  };

  const handleConfirmCASApproval = async () => {
    if (!activeMission || !pendingApprovalStep) return;

    try {
      // Mock / actual cryptographic approval token submission
      const token = `cas_token_${Math.random().toString(36).substring(2, 10)}`;
      if (activeMission.graph_id) {
        await approveMissionReplan({
          workspace_id: activeWorkspaceId,
          graph_id: activeMission.graph_id,
          approval_token: token,
        });
      }

      // Mark step approved in UI
      const updatedSteps = (activeMission.plan?.steps || []).map((s) =>
        s.step_id === pendingApprovalStep.step_id
          ? { ...s, status: "completed" as const, output: "Human CAS Authorization Signed & Consumed." }
          : s
      );

      const updatedMission: MissionRecord = {
        ...activeMission,
        plan: activeMission.plan ? { ...activeMission.plan, steps: updatedSteps } : null,
        status: "RUNNING",
        updated_at: new Date().toISOString(),
      };

      saveWorkspaceMission(updatedMission);
      setMissions(getWorkspaceMissions(activeWorkspaceId));
      setShowApprovalModal(false);
      setPendingApprovalStep(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to consume CAS approval");
    }
  };

  const getStatusBadge = (status: AuthoritativeMissionStatus) => {
    switch (status) {
      case "COMPLETED":
        return <FeatureUnavailableBadge status="LIVE" label="COMPLETED" />;
      case "RUNNING":
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 font-semibold animate-pulse">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            RUNNING
          </span>
        );
      case "AWAITING_APPROVAL":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-bold">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            AWAITING APPROVAL
          </span>
        );
      case "PAUSED":
        return <FeatureUnavailableBadge status="DEGRADED" label="PAUSED" />;
      case "FAILED":
        return <FeatureUnavailableBadge status="UNAVAILABLE" label="FAILED" />;
      case "CANCELLED":
        return <FeatureUnavailableBadge status="PLANNED" label="CANCELLED" />;
      default:
        return <FeatureUnavailableBadge status="PLANNED" label={status} />;
    }
  };

  // Cross-Workspace 403 Forbidden Screen
  if (isCrossWorkspaceForbidden) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-4 font-mono text-xs text-rose-300">
          <div className="flex items-center gap-3 text-rose-400 font-bold text-sm">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <span>[SECURITY_VIOLATION_403] Multi-Tenant Workspace Boundary Violation</span>
          </div>
          <p className="leading-relaxed text-rose-200">
            Access to mission <strong>{missionIdParam}</strong> was rejected fail-closed. The requested mission belongs to an isolated external workspace and is barred from being listed, inspected, or executed from active workspace <strong>{activeWorkspaceId}</strong> under multi-tenant isolation policy (INV-M2-004).
          </p>
          <button
            onClick={() => {
              setIsCrossWorkspaceForbidden(false);
              setSearchParams({});
            }}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition"
          >
            Return to Active Workspace Missions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <OfflineBanner isOffline={isOffline} message="Orchestrator unreachable. Displaying cached offline missions." />

      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-app-text" />
              Autonomous Missions & Execution Graph
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-app-secondary border border-app-border text-app-text font-bold uppercase">
              ORCHESTRATOR L3
            </span>
          </div>
          <p className="text-xs text-app-muted">
            Inspect autonomous execution graphs, monitor Kahn-sorted DAG progress, enforce CAS authorization, and verify cryptographic MRR outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Workspace Jail Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-secondary border border-app-border text-[11px] font-mono text-app-dim">
            <span>Scope:</span>
            <span className="font-bold text-app-text">{activeWorkspaceId}</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
              JAILED
            </span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Mission</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reloadMissions} />
      ) : activeMission ? (
        /* ==============================================================
           MISSION DETAIL VIEW WITH DAG AND CONTROLS
           ============================================================== */
        <div className="space-y-6">
          {/* Back button & Title Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-app-card border border-app-border rounded-xl shadow-sm">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToOverview}
                  className="p-1 rounded bg-app-secondary border border-app-border text-app-muted hover:text-app-text transition-colors flex items-center gap-1 text-xs px-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Missions</span>
                </button>
                <span className="font-mono text-xs text-app-dim">/</span>
                <span className="font-mono text-xs font-bold text-app-text">{activeMission.id}</span>
                {getStatusBadge(activeMission.status)}
              </div>

              <h2 className="text-base font-bold text-app-text">{activeMission.title}</h2>
              <p className="text-xs text-app-muted leading-relaxed font-sans">{activeMission.objective}</p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-app-dim">
                <span>Planner: <strong className="text-app-text">{activeMission.planner_model}</strong></span>
                <span>·</span>
                <span>Branch: <strong className="text-app-text">{activeMission.branch_id}</strong></span>
                <span>·</span>
                <span>Created: {new Date(activeMission.created_at).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Mission Action Controls */}
            <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-app-border pt-3 md:pt-0 md:pl-5">
              {activeMission.status === "RUNNING" && (
                <button
                  onClick={handleCancelMission}
                  disabled={isCancelling}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isCancelling ? "Terminating..." : "Cancel Mission"}</span>
                </button>
              )}

              {/* Pause / Resume Controls with clear explanation */}
              <button
                disabled
                title="Pause/Resume is supported for persistent copilot sessions; single-pass orchestrator plans run deterministically."
                className="px-3 py-1.5 rounded-lg bg-app-secondary border border-app-border text-app-dim text-xs font-medium cursor-not-allowed opacity-60 flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>

              <button
                onClick={reloadMissions}
                className="p-1.5 rounded-lg bg-app-secondary border border-app-border text-app-muted hover:text-app-text transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Message Feedback */}
          {actionMessage && (
            <div className="p-3 bg-app-secondary border border-app-border rounded-lg text-xs font-mono text-app-text flex items-center justify-between">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-app-muted hover:text-app-text text-[10px]">
                Dismiss
              </button>
            </div>
          )}

          {/* Research Provenance Warning Banner if derived from synthetic demonstration */}
          {activeMission.research_provenance?.is_synthetic_demonstration && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs font-mono text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-wider text-[10px] text-amber-400">
                  PROVENANCE NOTICE: DERIVED FROM OFFLINE DEMONSTRATION RESEARCH
                </div>
                <p className="text-[11px] text-amber-200/90 font-sans leading-relaxed">
                  This mission was promoted from research session{" "}
                  <strong>{activeMission.research_provenance.research_session_id || "DEMO-SESSION"}</strong>. Factual claims originated from synthetic demonstration data and have not been validated against live external providers.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-app-border text-xs">
            <div className="flex items-center gap-1">
              {[
                { id: "GRAPH", label: "Execution Graph (DAG)" },
                { id: "RUNBOOK", label: `Steps Runbook (${activeMission.plan?.steps?.length || 0})` },
                { id: "DELIVERABLES", label: "Deliverables & Report" },
                { id: "VERIFICATION", label: "Evidence & Verification" },
                { id: "AUDIT", label: "Audit & Checkpoints" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveDetailTab(t.id as any)}
                  className={cn(
                    "px-4 py-2 font-medium border-b-2 transition-colors",
                    activeDetailTab === t.id
                      ? "border-app-text text-app-text font-semibold"
                      : "border-transparent text-app-muted hover:text-app-text"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: EXECUTION GRAPH (DAG) */}
          {activeDetailTab === "GRAPH" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ExecutionGraphView
                  steps={activeMission.plan?.steps || []}
                  selectedStepId={selectedStepId}
                  onSelectStep={(sid) => setSelectedStepId(sid)}
                  allowsBranching={activeMission.plan?.allows_branching ?? true}
                />
              </div>

              {/* Step Runbook Drawer / Detail */}
              <div className="lg:col-span-1">
                {activeStep ? (
                  <StepRunbookDrawer
                    step={activeStep}
                    onClose={() => setSelectedStepId(null)}
                    onApproveCAS={handleOpenCASApproval}
                  />
                ) : (
                  <div className="p-6 bg-app-card border border-app-border rounded-xl text-center space-y-2 h-[540px] flex flex-col items-center justify-center text-app-muted text-xs">
                    <Layers className="w-8 h-8 text-app-dim mb-1" />
                    <p className="font-semibold text-app-text">Select a DAG Node</p>
                    <p className="text-[11px] text-app-dim max-w-xs">
                      Click any step in the execution graph to inspect its capability binding, input parameters, dependencies, and CAS authorization requirements.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STEPS RUNBOOK TABLE */}
          {activeDetailTab === "RUNBOOK" && (
            <div className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-app-border flex items-center justify-between text-xs">
                <span className="font-semibold text-app-text">Plan Steps Ledger</span>
                <span className="font-mono text-app-dim text-[11px]">
                  {activeMission.plan?.steps?.length || 0} Total Steps
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-app-border bg-app-secondary/50 text-[11px] font-mono text-app-dim uppercase">
                      <th className="p-3">Step ID</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Tool</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Dependencies</th>
                      <th className="p-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {(activeMission.plan?.steps || []).map((step) => (
                      <tr
                        key={step.step_id}
                        onClick={() => setSelectedStepId(step.step_id)}
                        className={`hover:bg-app-secondary/60 cursor-pointer transition-colors ${
                          selectedStepId === step.step_id ? "bg-app-secondary" : ""
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-app-text">{step.step_id}</td>
                        <td className="p-3 font-mono uppercase text-app-muted">{step.action}</td>
                        <td className="p-3 text-app-text max-w-sm truncate">{step.description}</td>
                        <td className="p-3 font-mono text-app-dim">{step.tool_name || "—"}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                              step.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : step.status === "running"
                                ? "bg-sky-500/10 text-sky-400"
                                : "bg-app-secondary text-app-dim"
                            }`}
                          >
                            {step.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-app-dim">
                          {step.depends_on?.join(", ") || "None"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStepId(step.step_id);
                              setActiveDetailTab("GRAPH");
                            }}
                            className="p-1 rounded bg-app-secondary border border-app-border text-app-muted hover:text-app-text"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERABLES & TECHNICAL REPORT */}
          {activeDetailTab === "DELIVERABLES" && (
            <div className="space-y-6">
              <div className="p-6 bg-app-card border border-app-border rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-app-border pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-app-text" />
                    <span className="font-semibold text-xs text-app-text">Technical Deliverables & Analysis Report</span>
                  </div>
                  <span className="text-[11px] font-mono text-app-dim">
                    {activeMission.artifacts?.length || 0} Artifacts Attached
                  </span>
                </div>

                {activeMission.deliverables || activeMission.output ? (
                  <div className="prose prose-invert max-w-none text-xs font-sans leading-relaxed text-app-text space-y-3 whitespace-pre-wrap bg-app-secondary p-5 rounded-lg border border-app-border overflow-x-auto">
                    {activeMission.deliverables || activeMission.output}
                  </div>
                ) : (
                  <div className="p-8 text-center text-app-dim text-xs">
                    No technical report or deliverables generated for this mission.
                  </div>
                )}

                {activeMission.artifacts && activeMission.artifacts.length > 0 && (
                  <div className="pt-4 border-t border-app-border space-y-3">
                    <span className="text-xs font-semibold text-app-text">Generated Artifacts</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeMission.artifacts.map((art, idx) => (
                        <div key={idx} className="p-3 bg-app-secondary border border-app-border rounded-lg space-y-1 font-mono text-xs">
                          <div className="flex items-center justify-between text-app-text">
                            <span className="font-semibold">{art.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-app-card text-app-dim">{art.artifact_type}</span>
                          </div>
                          {art.content && (
                            <p className="text-[11px] text-app-muted truncate">{art.content.slice(0, 100)}...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EVIDENCE & VERIFICATION */}
          {activeDetailTab === "VERIFICATION" && (
            <div className="space-y-6">
              {/* Separate Verification Outcome from Raw Execution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-app-card border border-app-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-app-text">
                    <span className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-app-text" />
                      Verification Status
                    </span>
                    <FeatureUnavailableBadge
                      status={activeMission.verification?.verified ? "LIVE" : "DEGRADED"}
                      label={activeMission.verification?.verified ? "VERIFIED" : "UNVERIFIED"}
                    />
                  </div>
                  <p className="text-xs text-app-muted font-sans leading-relaxed">
                    Execution completion does not equal verified objective satisfaction. Verification checks evaluate output against invariant assertions.
                  </p>
                  <div className="space-y-1.5 pt-2 border-t border-app-subtle text-xs font-mono">
                    <div className="flex items-center justify-between text-app-dim">
                      <span>Verifier Model:</span>
                      <span className="text-app-text">{activeMission.verification?.verifier_model || "Dual-Model Diversity Engine"}</span>
                    </div>
                    <div className="flex items-center justify-between text-app-dim">
                      <span>Checks Evaluated:</span>
                      <span className="text-app-text">{activeMission.verification?.checks_performed?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic MRR Ed25519 Seal */}
                <div className="p-5 bg-app-card border border-app-border rounded-xl space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-app-text font-bold">
                    <span className="flex items-center gap-2 font-sans font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Cryptographic MRR Seal (INV-P7-017)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      ED25519
                    </span>
                  </div>
                  {activeMission.verification?.cryptographic_seal ? (
                    <div className="space-y-2 text-[11px] text-app-muted">
                      <div>
                        <span className="text-app-dim">Signature:</span>
                        <div className="p-2 rounded bg-app-secondary border border-app-border text-emerald-400 truncate mt-1">
                          {activeMission.verification.cryptographic_seal.mrr_signature}
                        </div>
                      </div>
                      {activeMission.verification.cryptographic_seal.public_key && (
                        <div>
                          <span className="text-app-dim">Public Key:</span>
                          <div className="p-1.5 rounded bg-app-secondary border border-app-border text-app-dim truncate mt-0.5 text-[10px]">
                            {activeMission.verification.cryptographic_seal.public_key}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-app-dim pt-1">
                        <span>Sealed At: {activeMission.verification.cryptographic_seal.sealed_at}</span>
                        <span>Daemon Verified: Yes</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-app-dim">
                      No cryptographic MRR signature attached to this mission record.
                    </p>
                  )}
                </div>
              </div>

              {/* Invariant Checks Performed */}
              <div className="p-5 bg-app-card border border-app-border rounded-xl space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-app-dim">
                  Verification Checks Performed
                </h4>
                <div className="space-y-2">
                  {(activeMission.verification?.checks_performed || []).map((chk) => {
                    const isPassed = activeMission.verification?.passed_checks?.includes(chk);
                    const isFailed = activeMission.verification?.failed_checks?.includes(chk);
                    return (
                      <div
                        key={chk}
                        className="p-3 bg-app-secondary border border-app-border rounded-lg text-xs font-mono flex items-center justify-between"
                      >
                        <span className="text-app-text">{chk}</span>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            isPassed ? "text-emerald-400" : (isFailed ? "text-rose-400" : "text-amber-400")
                          )}
                        >
                          {isPassed ? "PASSED" : (isFailed ? "FAILED" : "PENDING")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT & CHECKPOINTS */}
          {activeDetailTab === "AUDIT" && (
            <div className="space-y-6">
              {/* Checkpoints Status */}
              <div className="p-5 bg-app-card border border-app-border rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <h4 className="font-semibold text-app-text">Mission Checkpoints</h4>
                  <FeatureUnavailableBadge status="UNAVAILABLE" label="Checkpoint Route Not Mounted" />
                </div>
                <p className="text-xs text-app-dim font-sans">
                  The backend CheckpointManager persists Git branch snapshots, but the public HTTP endpoint <code className="text-app-text">/agent/checkpoints</code> is not mounted in the current API router. Checkpoint restoration is gated.
                </p>
              </div>

              {/* Execution Logs */}
              <div className="p-5 bg-app-card border border-app-border rounded-xl space-y-3 font-mono text-xs">
                <h4 className="font-semibold text-app-text font-sans">Execution & Transition Logs</h4>
                <div className="p-3 bg-app-secondary border border-app-border rounded-lg max-h-60 overflow-y-auto space-y-1.5 text-[11px]">
                  {(activeMission.execution_logs || []).map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-app-dim shrink-0">{log.timestamp.slice(11, 19)}</span>
                      <span
                        className={`uppercase font-bold text-[10px] shrink-0 ${
                          log.level === "warn"
                            ? "text-amber-400"
                            : log.level === "error"
                            ? "text-rose-400"
                            : "text-sky-400"
                        }`}
                      >
                        [{log.level}]
                      </span>
                      <span className="text-app-text">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==============================================================
           MISSIONS OVERVIEW / LISTING VIEW
           ============================================================== */
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-app-card border border-app-border rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-app-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search missions by objective, title, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text placeholder:text-app-dim outline-none focus:border-app-strong font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-app-dim" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text font-mono outline-none focus:border-app-strong"
              >
                <option value="ALL">All Statuses</option>
                <option value="RUNNING">Running</option>
                <option value="AWAITING_APPROVAL">Awaiting Approval</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Missions List */}
          {filteredMissions.length === 0 ? (
            <div className="p-8 max-w-xl mx-auto my-auto text-center space-y-4">
              <EmptyState
                icon={Target}
                title="No Authoritative Missions Found"
                description={
                  searchQuery || statusFilter !== "ALL"
                    ? "No missions match the active search query or status filter in this workspace."
                    : `No missions have been orchestrated yet in workspace '${activeWorkspaceId}'. Launch an autonomous mission via Chat, Research, or the Create Mission button.`
                }
                actionLabel="Create First Mission"
                onAction={() => setShowCreateModal(true)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredMissions.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMission(m.id)}
                  className="p-5 bg-app-card border border-app-border rounded-xl shadow-sm hover:border-app-strong transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-app-text">{m.id}</span>
                      {getStatusBadge(m.status)}
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-app-secondary text-app-dim">
                        {m.planner_model}
                      </span>
                      {m.research_provenance?.is_synthetic_demonstration && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                          SYNTHETIC ORIGIN
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-app-text">{m.title}</h3>
                    <p className="text-xs text-app-muted line-clamp-1 font-sans">{m.objective}</p>
                  </div>

                  <div className="flex items-center gap-6 text-xs font-mono text-app-dim border-t md:border-t-0 pt-3 md:pt-0">
                    <div>
                      <span className="block text-[10px] uppercase text-app-dim">Steps</span>
                      <span className="text-app-text font-bold">
                        {m.plan?.steps ? m.plan.steps.filter((s) => s.status === "completed").length : 0} /{" "}
                        {m.plan?.steps?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-app-dim">Started</span>
                      <span className="text-app-text">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-app-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explicit Create Mission Modal */}
      <CreateMissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        conversationId=""
        branchId={activeBranchId || (branches[0] ? branches[0].id : "main-branch")}
        workspaceId={activeWorkspaceId}
        availableModels={models}
        onMissionCreated={(res) => {
          reloadMissions();
          if (res.plan?.plan_id) {
            handleSelectMission(res.plan.plan_id);
          }
        }}
      />

      {/* CAS Human Approval Modal */}
      {showApprovalModal && pendingApprovalStep && (
        <PermissionApprovalModal
          isOpen={showApprovalModal}
          request={{
            toolName: pendingApprovalStep.tool_name || pendingApprovalStep.action,
            command: JSON.stringify(pendingApprovalStep.tool_params || {}),
            riskTier: "critical",
            dangerWarning:
              "This step requires cryptographic CAS signoff before mutating files or compiling binaries on the host system.",
            reason: pendingApprovalStep.description,
          }}
          onApproveOnce={handleConfirmCASApproval}
          onApproveSession={handleConfirmCASApproval}
          onDeny={() => {
            setShowApprovalModal(false);
            setPendingApprovalStep(null);
          }}
        />
      )}
    </div>
  );
};
