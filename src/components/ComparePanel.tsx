import React, { useState } from "react";
import { GitFork, Play, Sparkles, Check, Clock, Coins, ShieldCheck, Loader2 } from "lucide-react";
import { compareModelsTask } from "../services/orchestratorApi";

interface ComparePanelProps {
  workspaceId: string;
  branchId: string;
  onSelectBranch?: (branchId: string) => void;
}

const AVAILABLE_MODELS = [
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", tier: "High Reasoning" },
  { id: "gemini-2-5-pro", name: "Gemini 2.5 Pro", tier: "Deep Analysis" },
  { id: "gpt-4o", name: "GPT-4o", tier: "Multimodal" },
  { id: "gemini-flash", name: "Gemini Flash", tier: "Fast / Lite" },
  { id: "llama-3.1-70b", name: "Llama 3.1 70B", tier: "Open Source" },
];

export const ComparePanel: React.FC<ComparePanelProps> = ({ workspaceId, branchId, onSelectBranch }) => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["claude-3-5-sonnet", "gemini-2-5-pro"]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const toggleModel = (id: string) => {
    if (selectedModels.includes(id)) {
      if (selectedModels.length > 2) {
        setSelectedModels(selectedModels.filter((m) => m !== id));
      }
    } else {
      setSelectedModels([...selectedModels, id]);
    }
  };

  const handleRunCompare = async () => {
    if (!prompt.trim() || selectedModels.length < 2) return;
    setLoading(true);
    try {
      const res = await compareModelsTask({
        workspace_id: workspaceId,
        branch_id: branchId,
        prompt: prompt.trim(),
        models: selectedModels,
      });
      setCompareResult(res);
      if (res.recommendation) {
        const recBranch = res.branches.find((b: any) => b.model_id === res.recommendation);
        if (recBranch) setSelectedBranch(recBranch.branch_id);
      }
    } catch (err) {
      console.error("Comparison failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] border border-zinc-800 rounded-lg p-4 space-y-4 overflow-y-auto">
      {/* Configuration Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GitFork className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Multi-Model Compare</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Run identical prompts in parallel across models to generate isolated branches with comparative tradeoff evaluation.
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
          Select Candidates ({selectedModels.length})
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_MODELS.map((m) => {
            const isSelected = selectedModels.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModel(m.id)}
                className={`p-2 rounded-md border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? "bg-purple-950/30 border-purple-800/60 text-zinc-100"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div>
                  <p className="text-xs font-medium">{m.name}</p>
                  <p className="text-[10px] text-zinc-500">{m.tier}</p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter problem or architecture question to compare approaches across models..."
          className="w-full bg-[#18181b] border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-600 resize-none font-sans"
        />
        <button
          onClick={handleRunCompare}
          disabled={loading || !prompt.trim() || selectedModels.length < 2}
          className="mt-2 w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-md flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running Parallel Branches...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Compare Across {selectedModels.length} Models
            </>
          )}
        </button>
      </div>

      {/* Comparison Results */}
      {compareResult && (
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          {/* Evaluator Summary */}
          <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Arbor Tradeoff Synthesis
            </div>
            <p className="text-zinc-300 whitespace-pre-line text-[11px] leading-relaxed">
              {compareResult.evaluator_summary}
            </p>
          </div>

          {/* Side-by-Side Response Cards */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Generated Branch Solutions ({compareResult.branches.length})
            </label>
            {compareResult.branches.map((b: any) => {
              const isChosen = selectedBranch === b.branch_id;
              return (
                <div
                  key={b.branch_id}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    isChosen
                      ? "bg-zinc-900 border-purple-600 ring-1 ring-purple-600/50"
                      : "bg-zinc-900/50 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{b.model_id}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                        {b.branch_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {b.latency_ms}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-zinc-500" />
                        {b.token_count} toks
                      </span>
                    </div>
                  </div>

                  <div className="p-2 bg-[#09090b] rounded border border-zinc-800/80 text-[11px] text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap font-mono">
                    {b.content}
                  </div>

                  <div className="mt-2.5 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedBranch(b.branch_id);
                        if (onSelectBranch) onSelectBranch(b.branch_id);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isChosen
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isChosen ? "Active Branch" : "Continue with this branch"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
