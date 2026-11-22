import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Clock,
  Loader2,
  FileCheck2,
  FileText,
} from "lucide-react";
import {
  executeSimpleMissionStep,
  approveMissionRequest,
  rejectMissionRequest,
  verifyMissionSeal,
  listMissionArtifacts,
  resolveNodeApprovalMode,
  resolveRequiresStrongConfirmation,
  resolveResumingBannerText,
  type MissionApprovalDetail,
  type ExecuteSimpleFinalResponse,
  type MissionVerifySealResponse,
  type NodeApprovalMode,
} from "../../services/orchestratorApi";
import { MissionApprovalCard } from "./MissionApprovalCard";
import { saveMissionRun, removeMissionRun } from "../../services/missionRunStore";

/**
 * Task AB (B2): when set, the modal opens straight into the awaiting-approval phase using
 * this cached (or freshly re-verified) detail instead of starting a fresh run -- used to
 * resume a mission run that survived a page refresh. Never triggers a network call by
 * itself; Approve/Reject behave exactly as they would for a live 412.
 */
export interface MissionRunnerResumeState {
  clientRequestId: string;
  objective: string;
  approvalDetail: MissionApprovalDetail;
  approvalDetailIsPartial?: boolean;
}

interface MissionRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onMissionFinished?: (missionId: string) => void;
  resumeState?: MissionRunnerResumeState | null;
}

type RunPhase =
  | "form"
  | "running"
  | "awaiting_approval"
  | "resuming"
  | "rejected"
  | "error"
  | "done";

interface ErrorInfo {
  status: number;
  detailText: string;
}

export const MissionRunnerModal: React.FC<MissionRunnerModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onMissionFinished,
  resumeState,
}) => {
  const [objective, setObjective] = useState("");
  const [enableTwoStagePlanning, setEnableTwoStagePlanning] = useState(false);
  const [phase, setPhase] = useState<RunPhase>("form");

  const [clientRequestId, setClientRequestId] = useState<string | null>(null);
  const [approvalDetail, setApprovalDetail] = useState<MissionApprovalDetail | null>(null);
  const [approvalDetailIsPartial, setApprovalDetailIsPartial] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [finalResult, setFinalResult] = useState<ExecuteSimpleFinalResponse | null>(null);
  const [verifySeal, setVerifySeal] = useState<MissionVerifySealResponse | null>(null);
  const [verifySealError, setVerifySealError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [hasDeliverables, setHasDeliverables] = useState(false);
  const navigate = useNavigate();
  // Task U: captured from approvalDetail.node_approval_mode at the moment Approve is
  // clicked, since approvalDetail itself is cleared before the "resuming" banner renders.
  const [resumingNodeMode, setResumingNodeMode] = useState<NodeApprovalMode>("local-prompt");
  // Task AB (B2): never auto-approves or re-submits -- just seeds the form/awaiting_approval
  // state from a previously cached (and already re-verified by the caller) 412.
  const seededResumeKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resumeState) return;
    if (seededResumeKeyRef.current === resumeState.clientRequestId) return;
    seededResumeKeyRef.current = resumeState.clientRequestId;
    setObjective(resumeState.objective);
    setClientRequestId(resumeState.clientRequestId);
    setApprovalDetail(resumeState.approvalDetail);
    setApprovalDetailIsPartial(Boolean(resumeState.approvalDetailIsPartial));
    setConfirmText("");
    setErrorInfo(null);
    setPhase("awaiting_approval");
  }, [isOpen, resumeState]);

  if (!isOpen) return null;

  const resetRunState = () => {
    setPhase("form");
    setClientRequestId(null);
    setApprovalDetail(null);
    setApprovalDetailIsPartial(false);
    setErrorInfo(null);
    setFinalResult(null);
    setVerifySeal(null);
    setVerifySealError(null);
    setConfirmText("");
    setHasDeliverables(false);
  };

  const handleClose = () => {
    resetRunState();
    setObjective("");
    setEnableTwoStagePlanning(false);
    seededResumeKeyRef.current = null;
    onClose();
  };

  // Drives one execute_simple call (fresh or resumed with a CAS token) and classifies
  // the outcome: another 412 loops back to the approval card, a non-412 error stops the
  // run, and a 2xx response is the terminal mission result.
  const driveStep = async (reqId: string, casTokenId?: string) => {
    const outcome = await executeSimpleMissionStep({
      workspace_id: workspaceId,
      user_objective: objective,
      client_request_id: reqId,
      enable_two_stage_planning: enableTwoStagePlanning,
      timeout_seconds: 170,
      ...(casTokenId ? { cas_token_id: casTokenId } : {}),
    });

    if (outcome.kind === "approval_required") {
      setApprovalDetail(outcome.detail);
      setApprovalDetailIsPartial(false);
      setConfirmText("");
      setPhase("awaiting_approval");
      saveMissionRun({
        clientRequestId: reqId,
        workspaceId,
        kind: "simple",
        objective,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "awaiting_approval",
        missionId: outcome.detail.mission_id,
        enableTwoStagePlanning,
        approvalDetail: outcome.detail,
        approvalDetailIsPartial: false,
      });
      return;
    }

    if (outcome.kind === "error") {
      setErrorInfo({ status: outcome.status, detailText: outcome.detailText });
      setPhase("error");
      removeMissionRun(workspaceId, reqId);
      return;
    }

    setFinalResult(outcome.data);
    setPhase("done");
    removeMissionRun(workspaceId, reqId);
    onMissionFinished?.(outcome.data.mission_id);

    if (outcome.data.mission_id) {
      try {
        const seal = await verifyMissionSeal(outcome.data.mission_id, workspaceId);
        setVerifySeal(seal);
      } catch (e: unknown) {
        setVerifySealError(e instanceof Error ? e.message : "verify-seal request failed");
      }

      try {
        const artifactsOutcome = await listMissionArtifacts(outcome.data.mission_id, workspaceId);
        if (artifactsOutcome.kind === "success") {
          setHasDeliverables(artifactsOutcome.data.artifacts.length > 0);
        }
      } catch {
        // Non-critical -- the "View deliverables" link simply stays hidden.
      }
    }
  };

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim() || !workspaceId) return;

    resetRunState();
    const reqId = crypto.randomUUID();
    setClientRequestId(reqId);
    setPhase("running");
    saveMissionRun({
      clientRequestId: reqId,
      workspaceId,
      kind: "simple",
      objective,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phase: "running",
      enableTwoStagePlanning,
    });

    try {
      await driveStep(reqId);
    } catch (e: unknown) {
      setErrorInfo({ status: 0, detailText: e instanceof Error ? e.message : String(e) });
      setPhase("error");
      removeMissionRun(workspaceId, reqId);
    }
  };

  const handleApprove = async () => {
    if (!approvalDetail || !clientRequestId) return;
    if (requiresStrongConfirmation && confirmText !== confirmationTargetId) return;
    setIsApproving(true);
    try {
      setResumingNodeMode(resolveNodeApprovalMode(approvalDetail.node_approval_mode));
      const approveResp = await approveMissionRequest(
        approvalDetail.request_id,
        workspaceId,
        "approved via UI"
      );
      if (!approveResp.token_id) {
        setErrorInfo({
          status: 0,
          detailText: "Approval response did not include a token_id -- cannot resume the mission.",
        });
        setPhase("error");
        removeMissionRun(workspaceId, clientRequestId);
        return;
      }
      setApprovalDetail(null);
      setApprovalDetailIsPartial(false);
      setConfirmText("");
      setPhase("resuming");
      saveMissionRun({
        clientRequestId,
        workspaceId,
        kind: "simple",
        objective,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "running",
        missionId: approvalDetail.mission_id,
        enableTwoStagePlanning,
      });
      await driveStep(clientRequestId, approveResp.token_id);
    } catch (e: unknown) {
      setErrorInfo({ status: 0, detailText: e instanceof Error ? e.message : String(e) });
      setPhase("error");
      removeMissionRun(workspaceId, clientRequestId);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!approvalDetail || !clientRequestId) return;
    setIsRejecting(true);
    try {
      await rejectMissionRequest(approvalDetail.request_id, workspaceId, "declined via UI");
    } catch (e: unknown) {
      setErrorInfo({ status: 0, detailText: e instanceof Error ? e.message : String(e) });
      setPhase("error");
      setIsRejecting(false);
      return;
    }
    setIsRejecting(false);
    setApprovalDetail(null);
    setApprovalDetailIsPartial(false);
    setConfirmText("");
    setPhase("rejected");
    removeMissionRun(workspaceId, clientRequestId);
  };

  const handleViewDeliverables = () => {
    if (!finalResult?.mission_id) return;
    const missionId = finalResult.mission_id;
    handleClose();
    navigate(`/missions?missionId=${encodeURIComponent(missionId)}&tab=DELIVERABLES`);
  };

  const requiresStrongConfirmation = resolveRequiresStrongConfirmation(
    approvalDetail?.tool_name,
    approvalDetail?.requires_strong_confirmation
  );
  const awaitingStep = approvalDetail?.plan_preview?.find((s) => s.status === "awaiting_approval");
  const confirmationTargetId = awaitingStep?.step_id ?? approvalDetail?.request_id ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-app-card border border-app-border rounded-xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-app-secondary border border-app-border text-app-text">
              <Zap className="w-4 h-4 text-app-text" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-app-text">Execute Mission</h3>
              <p className="text-[11px] text-app-muted">
                Real-time execute_simple run against the orchestrator, with live CAS approval.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM */}
        {phase === "form" && (
          <form onSubmit={handleStartRun} className="space-y-4">
            <div className="p-3 bg-app-secondary border border-app-border rounded-lg text-[11px] font-mono text-app-dim">
              Workspace: <span className="text-app-text font-bold">{workspaceId || "(none selected)"}</span>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1.5">
                Mission Objective
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="Describe the bounded action for the orchestrator to execute..."
                className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none focus:border-app-strong placeholder:text-app-muted resize-none"
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-app-text cursor-pointer">
              <input
                type="checkbox"
                checked={enableTwoStagePlanning}
                onChange={(e) => setEnableTwoStagePlanning(e.target.checked)}
                className="rounded border-app-border"
              />
              <span>Two-stage planning (investigation pass before committing a plan)</span>
            </label>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-200/90 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Any mutating step will pause with an HTTP 412 and require an explicit Approve or
                Reject click here -- nothing is auto-approved.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!objective.trim() || !workspaceId}
                className="px-4 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run Mission</span>
              </button>
            </div>
          </form>
        )}

        {/* RUNNING */}
        {phase === "running" && (
          <div className="p-8 flex flex-col items-center gap-3 text-app-muted text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-app-text" />
            <span>Submitting execute_simple and waiting on the orchestrator...</span>
          </div>
        )}

        {/* AWAITING APPROVAL */}
        {phase === "awaiting_approval" && approvalDetail && (
          <MissionApprovalCard
            approvalDetail={approvalDetail}
            isPartial={approvalDetailIsPartial}
            confirmText={confirmText}
            onConfirmTextChange={setConfirmText}
            isApproving={isApproving}
            isRejecting={isRejecting}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* RESUMING -- post-approval banner about the separate node-local prompt */}
        {phase === "resuming" && (
          <div className="space-y-3">
            {resumingNodeMode === "remote-receipt" ? (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 font-semibold flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resolveResumingBannerText(resumingNodeMode)}</span>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-lg text-xs text-amber-200 font-semibold flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{resolveResumingBannerText(resumingNodeMode)}</span>
              </div>
            )}
            <div className="p-6 flex flex-col items-center gap-3 text-app-muted text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-app-text" />
              <span>Resuming mission with the approved CAS token...</span>
            </div>
          </div>
        )}

        {/* REJECTED */}
        {phase === "rejected" && (
          <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs text-rose-300">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle className="w-4 h-4" />
              <span>Step rejected. Mission run stopped.</span>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && errorInfo && (
          <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs text-rose-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Mission ended: HTTP {errorInfo.status || "(network error)"}</span>
            </div>
            <pre className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-[11px] font-mono text-rose-200 overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
              {errorInfo.detailText}
            </pre>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && finalResult && (
          <div className="space-y-4">
            <div className="p-4 bg-app-secondary border border-app-border rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-app-dim">status:</span>
                <span className="text-app-text font-bold">{finalResult.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-app-dim">lifecycle_state:</span>
                <span className="text-app-text">{finalResult.lifecycle_state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-app-dim">reconciliation_required:</span>
                <span className="text-app-text">{String(Boolean(finalResult.reconciliation_required))}</span>
              </div>
              {finalResult.cancellation_reason && (
                <div className="flex items-center justify-between">
                  <span className="text-app-dim">cancellation_reason:</span>
                  <span className="text-app-text">{finalResult.cancellation_reason}</span>
                </div>
              )}
            </div>

            {finalResult.step_results && finalResult.step_results.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-app-dim">
                  Per-step results
                </span>
                <div className="space-y-1">
                  {finalResult.step_results.map((r) => (
                    <div
                      key={r.step_id}
                      className="p-2 bg-app-secondary border border-app-border rounded text-[11px] font-mono flex items-center justify-between"
                    >
                      <span className="text-app-text">
                        {r.step_id} [{r.tool_name ?? "—"}]
                      </span>
                      <span className="text-app-dim">
                        {r.status} (exit_code={r.exit_code ?? "—"})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalResult.not_executed_steps && finalResult.not_executed_steps.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-app-dim">
                  Not executed
                </span>
                <div className="space-y-1">
                  {finalResult.not_executed_steps.map((s) => (
                    <div
                      key={s.step_id}
                      className="p-2 bg-app-secondary border border-app-border rounded text-[11px] font-mono text-app-dim"
                    >
                      {s.step_id}: {s.action ?? "—"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalResult.mission_failure_record && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-rose-400 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Mission failure record</span>
                </div>
                <div className="font-mono text-[11px] text-rose-200 space-y-1">
                  <div>failed_step_id: {finalResult.mission_failure_record.failed_step_id ?? "—"}</div>
                  <div>failed_tool_name: {finalResult.mission_failure_record.failed_tool_name ?? "—"}</div>
                  <div>exit_code: {finalResult.mission_failure_record.exit_code ?? "—"}</div>
                </div>
                {finalResult.mission_failure_record.output_tail && (
                  <pre className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-[11px] font-mono text-rose-200 overflow-x-auto overflow-y-auto max-h-48 whitespace-pre-wrap">
                    {finalResult.mission_failure_record.output_tail}
                  </pre>
                )}
              </div>
            )}

            <div className="p-4 bg-app-secondary border border-app-border rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-app-text font-semibold">
                <FileCheck2 className="w-4 h-4" />
                <span>verify-seal</span>
              </div>
              {verifySeal ? (
                <div className="font-mono text-[11px] text-app-muted space-y-1">
                  <div>
                    signature_valid:{" "}
                    <span className={verifySeal.signature_valid ? "text-emerald-400" : "text-rose-400"}>
                      {String(verifySeal.signature_valid)}
                    </span>
                  </div>
                  <div>step_count: {String(verifySeal.step_count ?? "—")}</div>
                  <div className="truncate">final_link_hash: {String(verifySeal.final_link_hash ?? "—")}</div>
                  <div>has_mission_failure_record: {String(Boolean(verifySeal.has_mission_failure_record))}</div>
                </div>
              ) : verifySealError ? (
                <div className="text-[11px] text-rose-400 font-mono">{verifySealError}</div>
              ) : (
                <div className="text-[11px] text-app-dim font-mono">Fetching...</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
              {finalResult.status === "COMPLETED" && hasDeliverables && (
                <button
                  onClick={handleViewDeliverables}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors mr-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View deliverables</span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text transition-colors"
              >
                Close
              </button>
              <button
                onClick={resetRunState}
                className="px-4 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Run Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
