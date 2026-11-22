import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { X, Microscope, Loader2, AlertCircle, FileText } from "lucide-react";
import {
  executeAnalysisMission,
  approveMissionRequest,
  rejectMissionRequest,
  type AnalysisMissionResult,
  type MissionApprovalDetail,
} from "../../services/orchestratorApi";
import { MissionApprovalCard } from "./MissionApprovalCard";

interface AnalysisRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onAnalysisFinished?: (missionId: string) => void;
}

type AnalysisPhase = "form" | "running" | "approval_required" | "error" | "done";

interface ErrorInfo {
  status: number;
  detailText: string;
}

const DEFAULT_OBJECTIVE =
  "Conduct architectural analysis across active repositories and generate Level 3 development roadmap.";

/**
 * Task AB (B3): read-only architectural analysis via POST /api/v1/missions/execute_analysis.
 * Unlike MissionRunnerModal, this call never requires (or supports resuming after) CAS
 * approval -- AnalysisMissionRequest has no cas_token_id field. A 412 is handled defensively
 * (same approval card, Approve/Reject still work as generic approval-request actions) but is
 * not expected from this route today.
 */
export const AnalysisRunnerModal: React.FC<AnalysisRunnerModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onAnalysisFinished,
}) => {
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [phase, setPhase] = useState<AnalysisPhase>("form");
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [approvalDetail, setApprovalDetail] = useState<MissionApprovalDetail | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [result, setResult] = useState<AnalysisMissionResult | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const resetState = () => {
    setPhase("form");
    setErrorInfo(null);
    setApprovalDetail(null);
    setConfirmText("");
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    setObjective(DEFAULT_OBJECTIVE);
    onClose();
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setPhase("running");
    setErrorInfo(null);

    try {
      const outcome = await executeAnalysisMission({
        workspace_id: workspaceId,
        user_objective: objective.trim() || undefined,
        client_request_id: crypto.randomUUID(),
      });

      if (outcome.kind === "approval_required") {
        setApprovalDetail(outcome.detail);
        setPhase("approval_required");
        return;
      }

      if (outcome.kind === "error") {
        setErrorInfo({ status: outcome.status, detailText: outcome.detailText });
        setPhase("error");
        return;
      }

      setResult(outcome.data);
      setPhase("done");
      onAnalysisFinished?.(outcome.data.mission_id);
    } catch (e: unknown) {
      setErrorInfo({ status: 0, detailText: e instanceof Error ? e.message : String(e) });
      setPhase("error");
    }
  };

  // Defensive only: this route has no cas_token_id field, so approving here can never
  // resume the analysis. It still performs a real approve/reject against the generic
  // approval endpoint so the request doesn't dangle, and says so plainly.
  const handleApprove = async () => {
    if (!approvalDetail) return;
    setIsApproving(true);
    try {
      await approveMissionRequest(approvalDetail.request_id, workspaceId, "approved via UI");
      setErrorInfo({
        status: 0,
        detailText:
          "Approved. Architectural analysis has no resume path, so this run cannot continue automatically -- check the Missions list for the outcome.",
      });
      setPhase("error");
    } catch (e: unknown) {
      setErrorInfo({ status: 0, detailText: e instanceof Error ? e.message : String(e) });
      setPhase("error");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!approvalDetail) return;
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
    setPhase("error");
    setErrorInfo({ status: 0, detailText: "Analysis declined." });
  };

  const handleViewDeliverables = () => {
    if (!result?.mission_id) return;
    const missionId = result.mission_id;
    handleClose();
    navigate(`/missions?missionId=${encodeURIComponent(missionId)}&tab=DELIVERABLES`);
  };

  const canOpenDeliverablesTab = Boolean(result?.mission_id) && result?.persistence_status === "PERSISTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-app-card border border-app-border rounded-xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-app-secondary border border-app-border text-app-text">
              <Microscope className="w-4 h-4 text-app-text" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-app-text">Run Analysis</h3>
              <p className="text-[11px] text-app-muted">
                Read-only execute_analysis run -- no mutating action, no CAS approval expected.
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

        {phase === "form" && (
          <form onSubmit={handleRun} className="space-y-4">
            <div className="p-3 bg-app-secondary border border-app-border rounded-lg text-[11px] font-mono text-app-dim">
              Workspace: <span className="text-app-text font-bold">{workspaceId || "(none selected)"}</span>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1.5">
                Analysis Objective
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none focus:border-app-strong placeholder:text-app-muted resize-none"
                autoFocus
              />
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
                disabled={!workspaceId}
                className="px-4 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
              >
                <Microscope className="w-3.5 h-3.5" />
                <span>Run Analysis</span>
              </button>
            </div>
          </form>
        )}

        {phase === "running" && (
          <div className="p-8 flex flex-col items-center gap-3 text-app-muted text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-app-text" />
            <span>Running the multi-model architectural analysis...</span>
          </div>
        )}

        {phase === "approval_required" && approvalDetail && (
          <MissionApprovalCard
            approvalDetail={approvalDetail}
            confirmText={confirmText}
            onConfirmTextChange={setConfirmText}
            isApproving={isApproving}
            isRejecting={isRejecting}
            onApprove={handleApprove}
            onReject={handleReject}
            disabledNote="Architectural analysis has no resume path -- Approve/Reject only resolve the approval request itself."
          />
        )}

        {phase === "error" && errorInfo && (
          <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs text-rose-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Analysis ended: HTTP {errorInfo.status || "(network error)"}</span>
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

        {phase === "done" && result && (
          <div className="space-y-4">
            <div className="p-4 bg-app-secondary border border-app-border rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-app-dim">status:</span>
                <span className="text-app-text font-bold">{result.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-app-dim">inspected_repositories:</span>
                <span className="text-app-text">{result.inspected_repositories.join(", ") || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-app-dim">findings_count:</span>
                <span className="text-app-text">{result.findings_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-app-dim">critical_unresolved_count:</span>
                <span className="text-app-text">{result.critical_unresolved_count}</span>
              </div>
              {result.persistence_status && result.persistence_status !== "PERSISTED" && (
                <div className="flex items-center justify-between">
                  <span className="text-app-dim">persistence_status:</span>
                  <span className="text-amber-400">{result.persistence_status}</span>
                </div>
              )}
            </div>

            {result.deliverables ? (
              <div className="prose prose-invert max-w-none text-xs font-sans leading-relaxed text-app-text bg-app-secondary p-4 rounded-lg border border-app-border overflow-x-auto">
                <ReactMarkdown>{result.deliverables}</ReactMarkdown>
              </div>
            ) : (
              <div className="p-4 text-center text-app-dim text-xs">No report text was returned.</div>
            )}

            {result.persistence_status === "FAILED" && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-200/90">
                This report was not persisted to mission history ({result.persistence_error || "unknown error"}) --
                it is shown above from the direct response only; the Deliverables tab won't have it.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
              {canOpenDeliverablesTab && (
                <button
                  onClick={handleViewDeliverables}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors mr-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View in Deliverables tab</span>
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
