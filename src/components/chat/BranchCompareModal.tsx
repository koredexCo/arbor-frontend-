import React, { useState, useEffect } from "react";
import {
  GitCompare,
  X,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { api, getAccessToken } from "../../services/api";
import type { Branch } from "../../types";

interface BranchCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  initialBranchAId?: string | null;
  initialBranchBId?: string | null;
}

export const BranchCompareModal: React.FC<BranchCompareModalProps> = ({
  isOpen,
  onClose,
  branches,
  initialBranchAId,
  initialBranchBId,
}) => {
  const [branchAId, setBranchAId] = useState(initialBranchAId || branches[0]?.id || "");
  const [branchBId, setBranchBId] = useState(
    initialBranchBId || (branches.length > 1 ? branches[1].id : branches[0]?.id || "")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<any | null>(null);

  useEffect(() => {
    if (initialBranchAId) setBranchAId(initialBranchAId);
    if (initialBranchBId) setBranchBId(initialBranchBId);
  }, [initialBranchAId, initialBranchBId]);

  if (!isOpen) return null;

  const handleRunCompare = async () => {
    if (!branchAId || !branchBId || branchAId === branchBId) {
      setError("Please select two distinct branches to compare.");
      return;
    }

    setLoading(true);
    setError(null);
    setComparisonData(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const data = await api.compareBranches(token, branchAId, branchBId, true);
      setComparisonData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compare branches";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const branchA = branches.find((b) => b.id === branchAId);
  const branchB = branches.find((b) => b.id === branchBId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] bg-app-card border border-app-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-app-secondary border border-app-border text-app-text">
              <GitCompare className="w-4 h-4 text-app-text" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-app-text">Branch Comparison</h3>
              <p className="text-[11px] text-app-muted">
                Side-by-side lineage divergence, reasoning deltas, and semantic differences.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Branch Selectors & Compare Button */}
        <div className="p-4 bg-app-secondary border-b border-app-border shrink-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-app-dim block mb-1">
                Branch A (Base Lineage)
              </label>
              <select
                value={branchAId}
                onChange={(e) => setBranchAId(e.target.value)}
                className="w-full px-3 py-1.5 bg-app-card border border-app-border rounded-lg text-xs text-app-text outline-none font-mono"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (model: {b.model_id || "default"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-app-dim block mb-1">
                Branch B (Target Variant)
              </label>
              <select
                value={branchBId}
                onChange={(e) => setBranchBId(e.target.value)}
                className="w-full px-3 py-1.5 bg-app-card border border-app-border rounded-lg text-xs text-app-text outline-none font-mono"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (model: {b.model_id || "default"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-app-muted">
              {branchAId === branchBId
                ? "Select two different branches to evaluate reasoning deltas."
                : `Comparing ${branchA?.name || "A"} vs ${branchB?.name || "B"}`}
            </span>
            <button
              onClick={handleRunCompare}
              disabled={loading || !branchAId || !branchBId || branchAId === branchBId}
              className="px-4 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? "Analyzing Lineage..." : "Run Lineage Comparison"}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!comparisonData && !loading && (
            <div className="py-12 text-center space-y-2">
              <GitCompare className="w-8 h-8 text-app-muted mx-auto" />
              <p className="text-xs text-app-muted">
                Select two branches and run comparison to inspect side-by-side branch summaries, reasoning deltas, and divergence points.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-app-text border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-app-muted font-mono">
                Querying authoritative reasoning analyzer & inference snapshots...
              </p>
            </div>
          )}

          {comparisonData && (
            <div className="space-y-6">
              {/* Branch Summaries Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-app-secondary border border-app-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-2">
                    <span className="text-xs font-bold font-mono text-app-text">
                      Branch: {comparisonData.branch_a?.name || "Branch A"}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-card border border-app-border text-app-muted">
                      {comparisonData.branch_a?.model_id || "default"}
                    </span>
                  </div>
                  <p className="text-xs text-app-text leading-relaxed whitespace-pre-wrap">
                    {comparisonData.summary_a || "No textual summary generated for Branch A."}
                  </p>
                </div>

                <div className="p-4 bg-app-secondary border border-app-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-app-border pb-2">
                    <span className="text-xs font-bold font-mono text-app-text">
                      Branch: {comparisonData.branch_b?.name || "Branch B"}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-card border border-app-border text-app-muted">
                      {comparisonData.branch_b?.model_id || "default"}
                    </span>
                  </div>
                  <p className="text-xs text-app-text leading-relaxed whitespace-pre-wrap">
                    {comparisonData.summary_b || "No textual summary generated for Branch B."}
                  </p>
                </div>
              </div>

              {/* Reasoning Differences & Ranked Deltas */}
              {comparisonData.ranked_deltas && comparisonData.ranked_deltas.length > 0 && (
                <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-app-text flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-app-muted" />
                    Key Reasoning Deltas & Divergence
                  </h4>
                  <div className="space-y-2">
                    {comparisonData.ranked_deltas.map((delta: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-app-secondary border border-app-border rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-medium text-app-text">
                          <span>{delta.category || "Logical Progression"}</span>
                          {delta.significance && (
                            <span className="font-mono text-[10px] text-app-dim uppercase">
                              Significance: {delta.significance}
                            </span>
                          )}
                        </div>
                        <p className="text-app-muted text-[11px]">{delta.description || JSON.stringify(delta)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retrieval Comparison */}
              {comparisonData.retrieval_comparison && (
                <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-2 text-xs">
                  <h4 className="font-semibold text-app-text flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-app-muted" />
                    Retrieval & Context Comparison
                  </h4>
                  <p className="text-app-muted text-[11px]">
                    Shared Context Sources: {comparisonData.retrieval_comparison.shared_sources_count || 0} · Unique to A: {comparisonData.retrieval_comparison.unique_a_count || 0} · Unique to B: {comparisonData.retrieval_comparison.unique_b_count || 0}
                  </p>
                </div>
              )}

              {/* Governance & Architectural Disclaimer */}
              <div className="p-3 rounded-lg bg-app-secondary border border-app-border text-[11px] text-app-dim leading-relaxed flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-app-muted" />
                <span>
                  <strong>Architectural Contract:</strong> Branch comparison evaluates reasoning divergences side-by-side. Durable multi-parent DAG merging is not supported in Level 2; each branch preserves isolated lineage.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
