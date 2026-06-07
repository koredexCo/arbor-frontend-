import { useState } from "react";
import { X, Loader2, Sparkles, Check, GitBranch } from "lucide-react";
import { getAccessToken } from "../services/api";
import { api } from "../services/api";

import type { Message, Model } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onCompareComplete: () => void; // Trigger a refresh of branches/messages
  availableModels?: Model[];
}

export function CompareModal({ isOpen, onClose, branchId, onCompareComplete, availableModels = [] }: Props) {
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
    );
  };

  const handleCompare = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    setIsComparing(true);
    setError(null);
    setResults(null);
    
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      
      const res = await api.compareModels(token, prompt, selectedModels, branchId);
      setResults(res.results);
      onCompareComplete();
    } catch (err: any) {
      setError(err.message || "Failed to compare models.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleClose = () => {
    setPrompt("");
    setSelectedModels([]);
    setResults(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-up shadow-2xl border-[#2a2a2a]">
        <div className="flex justify-between items-center p-6 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a1a1a] text-[#a0a0a0] rounded-xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Compare Models</h2>
              <p className="text-xs text-[#888888]">Run a prompt against multiple models in parallel.</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-[#555555] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!results ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-[#555555] uppercase tracking-widest mb-2">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt to test across models..."
                  className="input-field w-full min-h-[120px] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#555555] uppercase tracking-widest mb-2">
                  Select Models (2-4)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableModels.map(model => {
                    const isSelected = selectedModels.includes(model.id);
                    return (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                          isSelected ? "border-[#444444] bg-[#1a1a1a]" : "border-[#222222] hover:border-[#333333] bg-[#111111]"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{model.name}</div>
                          <div className="text-xs text-[#555555]">{model.provider}</div>
                        </div>
                        {isSelected && <Check size={18} className="text-[#a0a0a0]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCompare}
                disabled={isComparing || !prompt.trim() || selectedModels.length === 0}
                className="btn-primary w-full py-4 text-base flex justify-center items-center gap-2"
              >
                {isComparing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Running parallel requests...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Compare {selectedModels.length > 0 ? selectedModels.length : ""} Models
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 h-full flex flex-col">
              <div className="p-4 rounded-xl bg-[#1f1f1f]/50 border border-[#1e1e1e]">
                <span className="text-xs font-black text-[#555555] uppercase tracking-widest mb-1 block">Prompt</span>
                <p className="text-sm text-white">{prompt}</p>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                {results.map((result, idx) => (
                  <div key={idx} className="glass-card flex flex-col overflow-hidden relative">
                    <div className="p-3 border-b border-[#1e1e1e] bg-[#111111] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white" />
                        <span className="text-sm font-bold text-white font-mono">{result.model}</span>
                      </div>
                      {result.error ? (
                        <span className="text-[10px] uppercase font-bold text-red-400">Failed</span>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-white">
                          <Check size={12} /> Success
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto text-sm text-[#c0c0c0] leading-relaxed custom-scrollbar">
                      {result.error ? (
                        <div className="text-red-400">{result.error}</div>
                      ) : (
                        <div className="whitespace-pre-wrap">{result.response}</div>
                      )}
                    </div>

                    {!result.error && result.branch_id && (
                      <div className="p-3 bg-[#111111] border-t border-[#1e1e1e]">
                        <div className="text-[10px] text-[#555555] flex items-center justify-center gap-1">
                          <GitBranch size={12} className="text-[#a0a0a0]" />
                          Branch created automatically
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button onClick={handleClose} className="btn-primary w-full py-3 mt-4">
                Close & View Branches
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
