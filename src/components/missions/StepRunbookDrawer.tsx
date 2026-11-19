import React from "react";
import {
  X,
  Wrench,
  ShieldCheck,
  Clock,
  RotateCcw,
  AlertCircle,
  FileCode,
  Terminal,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import type { PlanStepData } from "../../services/orchestratorApi";

interface StepRunbookDrawerProps {
  step: PlanStepData | null;
  onClose: () => void;
  onApproveCAS?: (stepId: string) => void;
}

export const StepRunbookDrawer: React.FC<StepRunbookDrawerProps> = ({
  step,
  onClose,
  onApproveCAS,
}) => {
  if (!step) return null;

  return (
    <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-lg space-y-5 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-app-secondary border border-app-border text-app-text">
            <Wrench className="w-4 h-4 text-app-text" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-app-text">{step.step_id}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-app-secondary border border-app-border text-app-muted">
                {step.action}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                  step.status === "completed"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : step.status === "running"
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 animate-pulse"
                    : step.status === "failed"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-app-secondary text-app-muted border border-app-border"
                }`}
              >
                {step.status}
              </span>
            </div>
            <p className="text-[11px] text-app-muted">Execution Step Runbook Specification</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-app-dim uppercase tracking-wider">
          Action Description
        </label>
        <p className="text-xs text-app-text leading-relaxed bg-app-secondary/60 p-3 rounded-lg border border-app-border font-sans">
          {step.description || "No description provided."}
        </p>
      </div>

      {/* Dependencies Ledger */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-app-dim uppercase tracking-wider">
          Upstream DAG Dependencies
        </label>
        {step.depends_on && step.depends_on.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {step.depends_on.map((dep) => (
              <span
                key={dep}
                className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded bg-app-secondary border border-app-border text-app-text"
              >
                <ArrowRight className="w-3 h-3 text-app-dim" />
                {dep}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-app-dim font-mono italic">
            None (Root or independent DAG step)
          </p>
        )}
      </div>

      {/* Tool & Parameters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-app-dim uppercase tracking-wider">
          <span>Target Capability & Tool</span>
          <span className="font-mono text-app-text lowercase">{step.tool_name || "native.internal"}</span>
        </div>
        {step.tool_params && Object.keys(step.tool_params).length > 0 ? (
          <pre className="p-3 bg-app-secondary rounded-lg border border-app-border text-[11px] font-mono text-app-text overflow-x-auto max-h-40">
            {JSON.stringify(step.tool_params, null, 2)}
          </pre>
        ) : (
          <div className="p-2.5 bg-app-secondary/40 rounded border border-app-border text-[11px] text-app-dim font-mono">
            No dynamic tool arguments configured.
          </div>
        )}
      </div>

      {/* CAS Human Authorization Requirement */}
      {step.requires_human_approval && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              MANDATORY HUMAN CAS GATING (INV-M2-005)
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              SECURITY GATE
            </span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
            This step modifies system state (source files, binaries, or host shell). Physical execution authority requires an explicit cryptographic authorization signature before execution.
          </p>
          {onApproveCAS && step.status === "running" && (
            <button
              onClick={() => onApproveCAS(step.step_id)}
              className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Authorize Step Execution
            </button>
          )}
        </div>
      )}

      {/* Error Trace if Failed */}
      {step.error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1.5 text-xs text-rose-300 font-mono">
          <div className="flex items-center gap-1.5 font-bold text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Execution Failure Recorded
          </div>
          <p className="text-[11px] text-rose-200 whitespace-pre-wrap leading-relaxed">
            {step.error}
          </p>
          {step.retry_count !== undefined && step.retry_count > 0 && (
            <div className="text-[10px] text-rose-400/80 pt-1 border-t border-rose-500/20">
              Retries recorded: {step.retry_count}
            </div>
          )}
        </div>
      )}

      {/* Step Output Observations */}
      {step.output && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-app-dim uppercase tracking-wider">
            Step Execution Output / Observations
          </label>
          <pre className="p-3 bg-app-secondary rounded-lg border border-app-border text-[11px] font-mono text-app-text overflow-x-auto max-h-48 whitespace-pre-wrap">
            {step.output}
          </pre>
        </div>
      )}
    </div>
  );
};
