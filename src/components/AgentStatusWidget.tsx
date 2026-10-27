import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Copy, Check, Folder, Laptop, Terminal, AlertTriangle, ShieldCheck } from "lucide-react";
import { getAgentStatus } from "../services/agentApi";
import type { AgentStatus } from "../types/agent";

interface AgentStatusWidgetProps {
  workspaceId: string;
  onRefresh?: () => void;
  onStatusLoaded?: (status: AgentStatus) => void;
}

export const AgentStatusWidget: React.FC<AgentStatusWidgetProps> = ({ workspaceId, onRefresh, onStatusLoaded }) => {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAgentStatus(workspaceId);
      setStatus(res);
      if (onStatusLoaded) onStatusLoaded(res);
      if (onRefresh) onRefresh();
    } finally {
      setLoading(false);
    }
  }, [workspaceId, onRefresh, onStatusLoaded]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const cliCommand = `python -m arbor_agent.cli --workspace "${workspaceId}"`;

  const copyCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-app-card border border-app-border rounded-xl p-3 text-app-text shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status?.connected ? "bg-emerald-500 animate-pulse" : "bg-app-muted opacity-50"
            }`}
          />
          <span className="text-xs font-semibold tracking-wide">
            {status?.connected ? "Node Daemon Online" : "Node Daemon Offline"}
          </span>
          {status?.connected && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-secondary border border-app-border text-app-dim">
              JAILED
            </span>
          )}
          {status?.connected && Boolean(status?.read_only || !status.capabilities.includes("fs.write")) && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold"
              title="Agent session operating under strict read-only tool allowlist"
              data-testid="agent-read-only-badge"
            >
              READ-ONLY
            </span>
          )}
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="p-1 hover:bg-app-secondary rounded text-app-muted hover:text-app-text transition"
          title="Refresh Node Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {status?.connected ? (
        <div className="space-y-1.5 text-xs text-app-muted">
          <div className="flex items-center gap-1.5 truncate">
            <Folder className="w-3.5 h-3.5 text-app-dim shrink-0" />
            <span className="font-mono text-app-text text-[11px] truncate" title={status.project_path || ""}>
              {status.project_path || "."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <Laptop className="w-3.5 h-3.5 text-app-dim shrink-0" />
            <span>
              {status.os_info?.platform || "Host"} ({status.os_info?.shell || "shell"})
            </span>
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {status.capabilities.slice(0, 6).map((cap) => (
              <span
                key={cap}
                className="px-1.5 py-0.2 rounded bg-app-secondary border border-app-subtle text-app-dim text-[9px] font-mono"
              >
                {cap}
              </span>
            ))}
            {status.capabilities.length > 6 && (
              <span className="text-[9px] text-app-dim">+{status.capabilities.length - 6} tools</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-start gap-1.5 text-[11px] text-app-dim leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 text-app-muted shrink-0 mt-0.5" />
            <span>Filesystem and terminal require an active local Arbor agent daemon.</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-app-secondary border border-app-border rounded px-2 py-1 font-mono text-[10px] text-app-text">
            <span className="truncate">{cliCommand}</span>
            <button
              onClick={copyCommand}
              className="text-app-muted hover:text-app-text transition shrink-0"
              title="Copy Command"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
