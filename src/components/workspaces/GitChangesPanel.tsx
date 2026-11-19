import React, { useState, useEffect, useCallback } from "react";
import { GitBranch, GitCommit, RefreshCw, FileText, Check, AlertCircle, Plus, Minus, ShieldCheck, Lock } from "lucide-react";
import { getGitStatus, getGitDiff, commitGitChanges, getAgentStatus } from "../../services/agentApi";
import type { AgentStatus } from "../../types/agent";

interface GitChangesPanelProps {
  workspaceId: string;
  branchId: string;
  className?: string;
  onCommitSuccess?: () => void;
  readOnly?: boolean;
}

export const GitChangesPanel: React.FC<GitChangesPanelProps> = ({
  workspaceId,
  branchId,
  className = "",
  onCommitSuccess,
  readOnly: propReadOnly,
}) => {
  const [gitStatus, setGitStatus] = useState<string>("");
  const [gitDiff, setGitDiff] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  const fetchGitData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, diffRes, statusInfo] = await Promise.all([
        getGitStatus(workspaceId, branchId),
        getGitDiff(workspaceId, branchId),
        getAgentStatus(workspaceId),
      ]);
      setGitStatus(statusRes.stdout || "");
      setGitDiff(diffRes.stdout || "");
      setAgentStatus(statusInfo);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setGitStatus("");
      setGitDiff("");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, branchId]);

  useEffect(() => {
    fetchGitData();
  }, [fetchGitData]);

  const isReadOnly = Boolean(
    propReadOnly ??
    (agentStatus?.read_only ||
      (agentStatus?.connected &&
        !agentStatus.capabilities.includes("git.commit") &&
        !agentStatus.capabilities.includes("git")))
  );

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !commitMessage.trim() || committing) return;

    setCommitting(true);
    setCommitSuccess(null);
    try {
      const res = await commitGitChanges(workspaceId, branchId, commitMessage.trim());
      if (res.exit_code === 0) {
        setCommitSuccess(`Committed: ${commitMessage.trim()}`);
        setCommitMessage("");
        await fetchGitData();
        if (onCommitSuccess) onCommitSuccess();
        setTimeout(() => setCommitSuccess(null), 3000);
      } else {
        throw new Error(res.stderr || res.stdout || "Commit failed with non-zero exit code");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Commit Error: ${errMsg}`);
    } finally {
      setCommitting(false);
    }
  };

  const statusLines = gitStatus.split("\n").filter((l) => l.trim().length > 0);
  const hasChanges = statusLines.length > 0;

  return (
    <div className={`bg-app-card border border-app-border rounded-xl p-3 flex flex-col text-app-text overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-app-border text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-app-muted shrink-0" />
          <span>Git Changes & Working Tree</span>
          {isReadOnly && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold"
              data-testid="git-read-only-badge"
            >
              READ-ONLY
            </span>
          )}
        </div>
        <button
          onClick={fetchGitData}
          disabled={loading}
          className="p-1 hover:bg-app-secondary rounded text-app-muted hover:text-app-text transition"
          title="Refresh Git status"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-2 space-y-3 text-xs">
        {loading ? (
          <div className="p-4 text-center text-app-dim">Querying git status...</div>
        ) : error ? (
          <div className="p-3 bg-app-secondary border border-app-subtle rounded-lg text-app-dim space-y-1">
            <div className="flex items-center gap-1 text-app-muted font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Git Status Unavailable</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {error.includes("No active local agent")
                ? "Git inspection requires an active local Arbor agent daemon."
                : error}
            </p>
          </div>
        ) : !hasChanges ? (
          <div className="p-4 text-center text-app-dim">
            Working tree clean. No uncommitted modifications.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Modified files list */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-app-dim font-sans">
                Modified Files ({statusLines.length})
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {statusLines.map((line, idx) => {
                  const match = line.match(/^([ MADRCU?!]{1,2})\s+(.+)$/);
                  const flag = match ? match[1].trim() : line.slice(0, 2).trim();
                  const path = match ? match[2].trim() : line.slice(2).trim();
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1 bg-app-secondary border border-app-subtle rounded"
                    >
                      <span className="truncate text-app-text">{path}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          flag === "M"
                            ? "bg-app-card text-app-text border border-app-border"
                            : flag === "??"
                            ? "bg-app-card text-app-dim border border-app-subtle"
                            : "bg-app-card text-app-muted border border-app-border"
                        }`}
                      >
                        {flag === "??" ? "UNTRACKED" : flag === "M" ? "MODIFIED" : flag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Git Diff Preview */}
            {gitDiff && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-app-dim font-sans">
                  Working Tree Diff
                </div>
                <div className="p-2 bg-app-bg border border-app-border rounded font-mono text-[10px] text-app-text overflow-x-auto max-h-48 whitespace-pre">
                  {gitDiff}
                </div>
              </div>
            )}

            {/* Commit Form / Read-Only Explanation */}
            {isReadOnly ? (
              <div
                className="p-3 bg-app-secondary border border-app-border rounded-lg text-xs space-y-1.5"
                data-testid="read-only-git-notice"
              >
                <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Read-Only Session Active</span>
                </div>
                <p className="text-[11px] text-app-dim leading-relaxed">
                  Repository mutations (commit, stage, reset) are disabled in strict read-only mode.
                  Working tree status and unified diff inspection remain active.
                </p>
              </div>
            ) : !agentStatus?.connected ? (
              <div className="p-3 bg-app-secondary border border-app-border rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-app-muted font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Daemon Offline</span>
                </div>
                <p className="text-[11px] text-app-dim leading-relaxed">
                  Git commit requires an active local Arbor agent daemon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCommit} className="space-y-2 pt-2 border-t border-app-border" data-testid="git-commit-form">
                <div className="text-[10px] uppercase tracking-wider text-app-dim font-sans">
                  Commit Changes
                </div>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message (e.g. fix: optimize fibonacci algorithm)"
                  className="w-full bg-app-bg border border-app-border rounded px-2.5 py-1.5 text-xs text-app-text placeholder-app-dim focus:outline-none focus:border-app-strong font-mono"
                />
                <button
                  type="submit"
                  disabled={!commitMessage.trim() || committing}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-app-accent text-app-inverted text-xs font-semibold rounded hover:opacity-90 disabled:opacity-40 transition"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>{committing ? "Committing..." : "Commit Changes"}</span>
                </button>
                {commitSuccess && (
                  <div className="p-2 bg-app-secondary border border-app-border text-app-text rounded text-[11px] flex items-center gap-1.5 font-mono">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{commitSuccess}</span>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
