import React from "react";
import { CheckCircle2, Circle, XCircle, Loader2, Wrench, ShieldCheck, ArrowRight } from "lucide-react";
import type { ExecutionPlanData, PlanStepData } from "../services/orchestratorApi";

interface PlanViewerProps {
  plan?: ExecutionPlanData | null;
  artifacts?: Array<{ name: string; artifact_type: string }>;
  durationMs?: number;
}

export const PlanViewer: React.FC<PlanViewerProps> = ({ plan, artifacts = [], durationMs }) => {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-500 text-sm">
        <Circle className="w-8 h-8 stroke-zinc-700 mb-2" />
        <p>No active execution plan.</p>
        <p className="text-xs text-zinc-600 mt-1">Submit an orchestrated agent task to generate a plan.</p>
      </div>
    );
  }

  const getStepIcon = (status: PlanStepData["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-600 shrink-0" />;
    }
  };

  const completedCount = plan.steps.filter((s) => s.status === "completed").length;
  const progressPct = Math.round((completedCount / (plan.steps.length || 1)) * 100);

  return (
    <div className="flex flex-col h-full bg-[#111113] border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200">Execution Plan</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-zinc-800 text-zinc-400">
              {plan.task_type}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950/60 text-sky-400 border border-sky-800/40">
              {plan.planner_model}
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate max-w-sm mt-0.5">{plan.task_summary}</p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-medium text-emerald-400">{progressPct}%</span>
          {durationMs !== undefined && (
            <p className="text-[10px] text-zinc-500 font-mono">{durationMs}ms</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-900 h-1">
        <div
          className="bg-gradient-to-r from-sky-500 to-emerald-500 h-1 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {plan.steps.map((step, idx) => (
          <div
            key={step.step_id}
            className={`p-2.5 rounded-md border text-xs transition-all ${
              step.status === "running"
                ? "bg-sky-950/20 border-sky-800/60"
                : step.status === "completed"
                ? "bg-zinc-900/40 border-zinc-800"
                : step.status === "failed"
                ? "bg-rose-950/20 border-rose-800/60"
                : "bg-zinc-900/20 border-zinc-800/40 opacity-70"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{getStepIcon(step.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-200 truncate">{step.description}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {step.action}
                  </span>
                </div>

                {step.tool_name && (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1 font-mono">
                    <Wrench className="w-3 h-3 text-amber-400/80" />
                    <span>{step.tool_name}</span>
                  </div>
                )}

                {step.error && (
                  <p className="text-[11px] text-rose-400 mt-1 bg-rose-950/40 p-1.5 rounded border border-rose-900/40">
                    {step.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Artifacts Footer */}
      {artifacts.length > 0 && (
        <div className="p-2.5 bg-[#141417] border-t border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Generated Artifacts ({artifacts.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {artifacts.map((a, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-emerald-300 border border-emerald-800/40 flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {a.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
