import React, { useState } from "react";
import { Package, Download, Copy, Check, FileCode, Layers, ExternalLink } from "lucide-react";

export interface WorkspaceArtifact {
  id: string;
  name: string;
  artifact_type: string;
  workspace_id: string;
  created_at: string;
  size_bytes?: number;
  content?: string;
  source_mission?: string;
}

interface ArtifactsPanelProps {
  workspaceId: string;
  artifacts: WorkspaceArtifact[];
  onOpenArtifact?: (artifact: WorkspaceArtifact) => void;
  className?: string;
}

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({
  workspaceId,
  artifacts,
  onOpenArtifact,
  className = "",
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Strictly filter artifacts to active workspace
  const scopedArtifacts = artifacts.filter((a) => a.workspace_id === workspaceId);

  const handleCopy = (art: WorkspaceArtifact) => {
    if (!art.content) return;
    navigator.clipboard.writeText(art.content);
    setCopiedId(art.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (art: WorkspaceArtifact) => {
    if (!art.content) return;
    const blob = new Blob([art.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = art.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-app-card border border-app-border rounded-xl p-3 flex flex-col text-app-text overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-app-border text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-app-muted shrink-0" />
          <span>Workspace Artifacts & Outputs</span>
        </div>
        <span className="text-[10px] font-mono text-app-dim">{scopedArtifacts.length} stored</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 space-y-2 text-xs">
        {scopedArtifacts.length === 0 ? (
          <div className="p-8 text-center text-app-dim space-y-1">
            <Package className="w-6 h-6 mx-auto text-app-muted opacity-40 mb-2" />
            <p>No artifacts generated in this workspace yet.</p>
            <p className="text-[11px]">Transpiled code, diff patches, and mission outputs will appear here.</p>
          </div>
        ) : (
          scopedArtifacts.map((art) => (
            <div
              key={art.id}
              className="p-2.5 bg-app-secondary border border-app-border rounded-lg space-y-1.5 font-mono"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <FileCode className="w-3.5 h-3.5 text-app-muted shrink-0" />
                  <span className="font-semibold text-app-text truncate">{art.name}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-app-card border border-app-subtle text-app-dim uppercase">
                  {art.artifact_type}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-app-dim font-sans">
                <span>{art.created_at}</span>
                {art.source_mission && <span>Mission: {art.source_mission.slice(0, 8)}</span>}
              </div>

              <div className="flex items-center justify-end gap-1 pt-1 border-t border-app-subtle">
                {art.content && (
                  <>
                    <button
                      onClick={() => handleCopy(art)}
                      className="px-2 py-0.5 rounded hover:bg-app-card text-app-muted hover:text-app-text text-[10px] flex items-center gap-1 transition"
                      title="Copy content"
                    >
                      {copiedId === art.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => handleDownload(art)}
                      className="px-2 py-0.5 rounded hover:bg-app-card text-app-muted hover:text-app-text text-[10px] flex items-center gap-1 transition"
                      title="Download file"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </>
                )}
                {onOpenArtifact && (
                  <button
                    onClick={() => onOpenArtifact(art)}
                    className="px-2 py-0.5 rounded hover:bg-app-card text-app-text text-[10px] flex items-center gap-1 font-medium transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
