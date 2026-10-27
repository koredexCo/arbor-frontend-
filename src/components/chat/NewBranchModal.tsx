import React, { useState } from "react";
import { GitBranch, X, Layers, AlertCircle } from "lucide-react";
import type { Model } from "../../types";

interface NewBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, modelId: string) => Promise<void> | void;
  originNodeId: string | null;
  originMessagePreview?: string;
  availableModels: Model[];
  currentModelId?: string;
}

export const NewBranchModal: React.FC<NewBranchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originNodeId,
  originMessagePreview,
  availableModels,
  currentModelId,
}) => {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState(currentModelId || availableModels[0]?.id || "gemini-flash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(name.trim(), modelId);
      setName("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-app-card border border-app-border rounded-xl shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-app-secondary border border-app-border text-app-text">
              <GitBranch className="w-4 h-4 text-app-text" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-app-text">Branch Conversation</h3>
              <p className="text-[11px] text-app-muted">
                Fork an independent exploration lane from this exact message.
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

        {/* Origin Message Preview */}
        {originMessagePreview && (
          <div className="p-3 rounded-lg bg-app-secondary border border-app-border space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-app-dim flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Fork Origin Point (Node: {originNodeId ? originNodeId.slice(0, 8) : "root"})
            </span>
            <p className="text-xs text-app-muted line-clamp-3 italic">
              "{originMessagePreview}"
            </p>
          </div>
        )}

        {/* Context Inheritance Guarantee Notice */}
        <div className="text-[11px] text-app-muted leading-relaxed">
          The new branch preserves all ancestor messages prior to this node. The original conversation remains untouched.
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1.5">
              Branch Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. explore-caching-approach, test-gemini-reasoning"
              autoFocus
              className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none focus:border-app-strong placeholder:text-app-muted font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1.5">
              Model Assignment (Authoritative Model Gateway)
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none focus:border-app-strong font-mono"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-muted hover:text-app-text hover:bg-app-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create Branch"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
