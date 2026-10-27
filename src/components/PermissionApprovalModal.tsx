import React from "react";
import { ShieldAlert, AlertTriangle, Check, X, Shield, Clock } from "lucide-react";

export interface PermissionRequest {
  toolName: string;
  command?: string;
  cwd?: string;
  riskTier: "read" | "modify" | "execute" | "destructive" | "critical";
  dangerWarning?: string;
  reason?: string;
}

interface PermissionApprovalModalProps {
  isOpen: boolean;
  request: PermissionRequest | null;
  onApproveOnce: () => void;
  onApproveSession: () => void;
  onDeny: () => void;
}

export const PermissionApprovalModal: React.FC<PermissionApprovalModalProps> = ({
  isOpen,
  request,
  onApproveOnce,
  onApproveSession,
  onDeny,
}) => {
  if (!isOpen || !request) return null;

  const isDestructive = request.riskTier === "destructive" || request.riskTier === "critical";

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "critical":
        return "bg-purple-950/80 text-purple-300 border-purple-800";
      case "destructive":
        return "bg-rose-950/80 text-rose-300 border-rose-800";
      case "execute":
        return "bg-amber-950/80 text-amber-300 border-amber-800";
      case "modify":
        return "bg-blue-950/80 text-blue-300 border-blue-800";
      default:
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 font-sans">
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDestructive ? "bg-rose-950/40 border-rose-900/60" : "bg-neutral-850 border-neutral-800"}`}>
          <div className={`p-2 rounded-xl ${isDestructive ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>
            {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span>{isDestructive ? "High-Risk Security Approval" : "Arbor Permission Required"}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${getTierBadge(request.riskTier)}`}>
                {request.riskTier}
              </span>
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              {request.reason || "The AI Copilot requested local terminal execution"}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Danger Banner if destructive */}
          {request.dangerWarning && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed font-medium">
                {request.dangerWarning}
              </div>
            </div>
          )}

          {/* Command Card */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Target Command
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-emerald-400 text-xs overflow-x-auto select-all">
              {request.command || request.toolName}
            </div>
          </div>

          {/* Directory Context */}
          {request.cwd && (
            <div className="flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-950/60 px-3 py-2 rounded-lg border border-neutral-800/80">
              <span className="text-neutral-500">Working Directory:</span>
              <span className="font-mono text-neutral-300 truncate max-w-[280px]">{request.cwd}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-950 border-t border-neutral-800 gap-2">
          <button
            onClick={onDeny}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Deny</span>
          </button>

          <div className="flex items-center gap-2">
            {!isDestructive && (
              <button
                onClick={onApproveSession}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition"
                title="Allow this command type for current workspace session"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Allow for Session</span>
              </button>
            )}
            <button
              onClick={onApproveOnce}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition ${
                isDestructive
                  ? "bg-rose-600 hover:bg-rose-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isDestructive ? "Approve Dangerously" : "Allow Once"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
