import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Download, Loader2, AlertCircle } from "lucide-react";
import {
  listMissionArtifacts,
  getMissionArtifact,
  isMarkdownArtifact,
  type MissionArtifactSummary,
} from "../../services/orchestratorApi";
import { LoadingSkeleton } from "../common/LoadingSkeleton";
import { ErrorState } from "../common/ErrorState";

interface MissionArtifactsPanelProps {
  missionId: string;
  workspaceId: string;
  /**
   * DEF-REP-02: when the mission record already carries legacy `deliverables`/`output`
   * prose, this panel must not additionally claim "no artifacts" just because the REST
   * artifact list happens to be empty -- that prose already satisfies the user.
   */
  hasLegacyContent?: boolean;
}

function formatByteSize(bytes?: number | null): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MissionArtifactsPanel: React.FC<MissionArtifactsPanelProps> = ({
  missionId,
  workspaceId,
  hasLegacyContent = false,
}) => {
  const [listState, setListState] = useState<
    | { phase: "loading" }
    | { phase: "error"; status: number; message: string }
    | { phase: "loaded"; artifacts: MissionArtifactSummary[] }
  >({ phase: "loading" });

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [contentState, setContentState] = useState<
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "error"; status: number; message: string }
    | { phase: "loaded"; content: string; mimeType: string }
  >({ phase: "idle" });

  const requestSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const seq = ++requestSeqRef.current;
    setListState({ phase: "loading" });
    setSelectedName(null);
    setContentState({ phase: "idle" });

    listMissionArtifacts(missionId, workspaceId).then((outcome) => {
      if (cancelled || seq !== requestSeqRef.current) return;
      if (outcome.kind === "error") {
        setListState({ phase: "error", status: outcome.status, message: outcome.detailText });
      } else {
        setListState({ phase: "loaded", artifacts: outcome.data.artifacts });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [missionId, workspaceId]);

  const handleSelectArtifact = (name: string) => {
    setSelectedName(name);
    setContentState({ phase: "loading" });
    getMissionArtifact(missionId, name, workspaceId).then((outcome) => {
      if (outcome.kind === "error") {
        setContentState({ phase: "error", status: outcome.status, message: outcome.detailText });
      } else {
        setContentState({ phase: "loaded", content: outcome.content, mimeType: outcome.mimeType });
      }
    });
  };

  const handleDownload = (name: string) => {
    if (contentState.phase !== "loaded") return;
    const blob = new Blob([contentState.content], { type: contentState.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (listState.phase === "loading") {
    return (
      <div className="space-y-2">
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  if (listState.phase === "error") {
    return (
      <ErrorState
        title={`Failed to load artifacts (${listState.status})`}
        message={listState.message}
      />
    );
  }

  if (listState.artifacts.length === 0) {
    if (hasLegacyContent) return null;
    return (
      <div className="p-8 text-center text-app-dim text-xs">
        This mission produced no artifacts.
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-app-border space-y-3">
      <span className="text-xs font-semibold text-app-text">Generated Artifacts</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {listState.artifacts.map((art) => (
          <button
            key={art.name}
            type="button"
            onClick={() => handleSelectArtifact(art.name)}
            className={`p-3 text-left bg-app-secondary border rounded-lg space-y-1 font-mono text-xs transition-colors ${
              selectedName === art.name
                ? "border-app-strong"
                : "border-app-border hover:border-app-muted"
            }`}
          >
            <div className="flex items-center justify-between text-app-text">
              <span className="font-semibold truncate">{art.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-app-card text-app-dim shrink-0">
                {art.artifact_type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-app-muted">
              {art.mime_type && <span>{art.mime_type}</span>}
              {formatByteSize(art.byte_size) && <span>{formatByteSize(art.byte_size)}</span>}
              {art.created_at && <span>{new Date(art.created_at).toLocaleString()}</span>}
            </div>
          </button>
        ))}
      </div>

      {selectedName && (
        <div className="mt-3 p-4 bg-app-secondary border border-app-border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-app-text">
              <FileText className="w-3.5 h-3.5" />
              {selectedName}
            </span>
            {contentState.phase === "loaded" && (
              <button
                type="button"
                onClick={() => handleDownload(selectedName)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-app-hover text-app-text border border-app-border hover:bg-app-active transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
          </div>

          {contentState.phase === "loading" && (
            <div className="p-6 flex items-center justify-center gap-2 text-app-muted text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading artifact content...
            </div>
          )}

          {contentState.phase === "error" && (
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-app-muted">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>
                ({contentState.status}) {contentState.message}
              </span>
            </div>
          )}

          {contentState.phase === "loaded" &&
            (isMarkdownArtifact(selectedName, contentState.mimeType) ? (
              <div className="prose prose-invert max-w-none text-xs font-sans leading-relaxed text-app-text bg-app-card p-4 rounded-lg border border-app-border overflow-x-auto">
                <ReactMarkdown>{contentState.content}</ReactMarkdown>
              </div>
            ) : (
              <pre className="p-4 bg-app-card border border-app-border rounded-lg text-[11px] font-mono text-app-text overflow-x-auto whitespace-pre-wrap">
                {contentState.content}
              </pre>
            ))}
        </div>
      )}
    </div>
  );
};
