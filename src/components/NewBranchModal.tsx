import { useState } from "react";
import { GitBranch, X } from "lucide-react";
import type { Message, Model } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, modelId: string) => void;
  availableModels?: Model[];
}

export function NewBranchModal({ isOpen, onClose, onConfirm, availableModels = [] }: Props) {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState(availableModels[0]?.id || "nemotron");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (name.trim()) {
      onConfirm(name.trim(), modelId);
      setName("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center 
                    justify-center z-50 animate-fade-in">
      <div className="bg-[#111111] rounded-2xl p-6 w-[420px] max-w-[90vw]
                      border border-[#1e1e1e] shadow-2xl shadow-black/50
                      animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <GitBranch size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Create New Branch
              </h3>
              <p className="text-xs text-[#555555]">
                Explore a different direction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-[#555555] hover:text-white hover:bg-[#1f1f1f]
                       transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <div className="bg-[#1f1f1f]/50 rounded-xl p-3 mb-5 border border-[#1a1a1a]">
          <p className="text-sm text-[#888888] leading-relaxed">
            This will create a new branch from the selected message. The new 
            branch <span className="text-[#a0a0a0] font-medium">inherits full context</span> from 
            the parent — no information is lost.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-[#888888] mb-2 font-medium">
              Branch Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., alternative approach, deeper analysis..."
              className="input-field"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
            />
          </div>

          <div>
            <label className="block text-sm text-[#888888] mb-2 font-medium">
              Model
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="input-field bg-[#1f1f1f] border-[#222222] text-white"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <GitBranch size={16} />
            Create Branch
          </button>
        </div>
      </div>
    </div>
  );
}
