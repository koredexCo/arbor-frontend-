import React from "react";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import {
  resolveNodeApprovalMode,
  resolveRequiresStrongConfirmation,
  type MissionApprovalDetail,
} from "../../services/orchestratorApi";

interface MissionApprovalCardProps {
  approvalDetail: MissionApprovalDetail;
  /** True when this detail was reconstructed after a refresh and lacks real parameters/plan_preview. */
  isPartial?: boolean;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  /** False disables Approve/Reject entirely (e.g. analysis missions, which cannot resume). */
  actionsEnabled?: boolean;
  disabledNote?: string;
}

/**
 * Task AB (B3): extracted from MissionRunnerModal so AnalysisRunnerModal's defensive
 * 412 handling renders the exact same approval card rather than a second, divergent copy.
 */
export const MissionApprovalCard: React.FC<MissionApprovalCardProps> = ({
  approvalDetail,
  isPartial = false,
  confirmText,
  onConfirmTextChange,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
  actionsEnabled = true,
  disabledNote,
}) => {
  const nodeApprovalMode = resolveNodeApprovalMode(approvalDetail.node_approval_mode);
  const requiresStrongConfirmation = resolveRequiresStrongConfirmation(
    approvalDetail.tool_name,
    approvalDetail.requires_strong_confirmation
  );
  const awaitingStep = approvalDetail.plan_preview?.find((s) => s.status === "awaiting_approval");
  const confirmationTargetId = awaitingStep?.step_id ?? approvalDetail.request_id ?? "";
  const confirmationSatisfied = !requiresStrongConfirmation || confirmText === confirmationTargetId;

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 font-semibold flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-400" />
        <span>
          Approval needed (mission {approvalDetail.mission_id}, request {approvalDetail.request_id})
        </span>
      </div>

      {isPartial && (
        <div className="p-2.5 bg-app-secondary border border-app-border rounded-lg text-[11px] text-app-dim">
          This approval was discovered after reopening the page -- the full parameters and plan
          preview from the original request are no longer available here, only the tool name below.
        </div>
      )}

      <div className="p-2.5 bg-app-secondary border border-app-border rounded-lg text-[11px] font-mono text-app-dim">
        Node approval:{" "}
        <span className="text-app-text font-bold">
          {nodeApprovalMode === "remote-receipt" ? "browser only (remote receipt)" : "local prompt"}
        </span>
      </div>

      {approvalDetail.plan_preview && approvalDetail.plan_preview.length > 0 ? (
        <div className="space-y-2">
          {approvalDetail.plan_preview.map((step) => {
            const isAwaiting = step.status === "awaiting_approval";
            return (
              <div
                key={step.step_id}
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  isAwaiting ? "bg-amber-500/10 border-amber-500/40" : "bg-app-secondary border-app-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-app-text">
                    [{step.status}] {step.step_id}: {step.action}
                  </span>
                  {isAwaiting && (
                    <span className="text-[10px] font-bold uppercase text-amber-400">Awaiting Approval</span>
                  )}
                </div>
                {isAwaiting && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-app-muted">
                      Tool: <span className="font-mono text-app-text">{approvalDetail.tool_name}</span>
                    </div>
                    <pre className="p-2.5 bg-app-secondary border border-app-border rounded text-[11px] font-mono text-app-text overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
                      {JSON.stringify(step.parameters ?? {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg text-xs space-y-2">
          <div className="text-[11px] text-app-muted">
            Tool: <span className="font-mono text-app-text">{approvalDetail.tool_name}</span>
          </div>
          {!isPartial && (
            <pre className="p-2.5 bg-app-secondary border border-app-border rounded text-[11px] font-mono text-app-text overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(approvalDetail.parameters ?? {}, null, 2)}
            </pre>
          )}
        </div>
      )}

      {approvalDetail.reviewer && (
        <div className="p-2.5 bg-app-secondary border border-app-border rounded-lg text-[11px] font-mono text-app-dim">
          Reviewer verdict: <span className="text-app-text">{approvalDetail.reviewer.verdict}</span> (status=
          {approvalDetail.reviewer.status})
        </div>
      )}

      {actionsEnabled && requiresStrongConfirmation && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-1.5">
          <label className="text-[11px] text-rose-300 font-semibold block">
            High-risk step -- type the exact step id (
            <span className="font-mono">{confirmationTargetId}</span>) to enable Approve:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder={confirmationTargetId}
            className="w-full px-3 py-1.5 bg-app-secondary border border-rose-500/40 rounded-lg text-xs font-mono text-app-text outline-none focus:border-rose-400 placeholder:text-app-muted"
            autoComplete="off"
          />
        </div>
      )}

      {!actionsEnabled && disabledNote && (
        <div className="p-2.5 bg-app-secondary border border-app-border rounded-lg text-[11px] text-app-dim">
          {disabledNote}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
        <button
          onClick={onReject}
          disabled={!actionsEnabled || isRejecting || isApproving}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>{isRejecting ? "Rejecting..." : "Reject"}</span>
        </button>
        <button
          onClick={onApprove}
          disabled={!actionsEnabled || isRejecting || isApproving || !confirmationSatisfied}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isApproving ? "Approving..." : "Approve"}</span>
        </button>
      </div>
    </div>
  );
};
