import React from "react";
import {
  Activity,
  PanelRightClose,
  GitBranch,
  Layers,
  Sparkles,
  Database,
  Cpu,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../common/FeatureUnavailableBadge";
import type { AgentStatus } from "../../types/agent";
import type { Model, Branch } from "../../types";

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  branch: Branch | null;
  workspaceId: string;
  selectedModel: Model | null;
  contextMeta: Record<string, unknown>;
  agentStatus: AgentStatus | null;
  messageCount: number;
  inheritedCount: number;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen,
  onClose,
  conversationId,
  branch,
  workspaceId,
  selectedModel,
  contextMeta,
  agentStatus,
  messageCount,
  inheritedCount,
}) => {
  if (!isOpen) return null;

  const localCount = messageCount - inheritedCount;
  const pinnedCount = typeof contextMeta?.pinned_count === "number" ? contextMeta.pinned_count : 0;
  const relevantCount = typeof contextMeta?.relevant_count === "number" ? contextMeta.relevant_count : 0;
  const tokenBudget = branch?.token_budget || 2000;
  const keySource = (contextMeta?.key_source as string) || "environment";

  return (
    <div className="w-80 border-l border-app-border bg-app-secondary p-4 flex flex-col gap-4 overflow-y-auto shrink-0 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-border pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-app-text">
            Authoritative Context
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-app-muted hover:text-app-text hover:bg-app-card transition-colors"
          title="Close Context Drawer"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Scope Identity Card */}
      <div className="p-3 bg-app-card border border-app-border rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-app-text">
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-app-muted" />
            Active Scope
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-secondary border border-app-border text-app-muted">
            v{branch?.version || 1}
          </span>
        </div>
        <div className="font-mono text-[11px] text-app-dim space-y-1">
          <div className="truncate">
            <span className="text-app-muted">Convo:</span> {conversationId || "None (Draft)"}
          </div>
          <div className="truncate">
            <span className="text-app-muted">Branch:</span> {branch?.name || "main"} ({branch?.id ? branch.id.slice(0, 8) : "None"})
          </div>
          <div className="truncate">
            <span className="text-app-muted">Workspace:</span> {workspaceId}
          </div>
          <div>
            <span className="text-app-muted">Lineage Depth:</span> {branch?.depth ?? 0}
          </div>
        </div>
      </div>

      {/* Authoritative Model Card */}
      <div className="p-3 bg-app-card border border-app-border rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-app-text">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-app-muted" />
            Model Gateway Routing
          </span>
          <FeatureUnavailableBadge status="LIVE" label="Authoritative" />
        </div>
        <div className="font-mono text-[11px] text-app-dim space-y-1">
          <div>
            <span className="text-app-muted">Model:</span> {selectedModel?.name || branch?.model_id || "gemini-flash"}
          </div>
          <div>
            <span className="text-app-muted">Provider:</span> {selectedModel?.provider || "google"}
          </div>
          <div>
            <span className="text-app-muted">Capabilities:</span> {selectedModel?.capabilities?.join(", ") || "chat"}
          </div>
          <div>
            <span className="text-app-muted">Token Ceiling:</span> {tokenBudget.toLocaleString()} tokens
          </div>
          <div>
            <span className="text-app-muted">Credential Source:</span> {keySource}
          </div>
        </div>
      </div>

      {/* Memory & Graph Nodes Assembly */}
      <div className="p-3 bg-app-card border border-app-border rounded-lg space-y-2.5 text-xs">
        <div className="flex items-center justify-between font-semibold text-app-text">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-app-muted" />
            Lineage Scope
          </span>
          <span className="font-mono text-[10px] text-app-dim">
            {messageCount} total nodes
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-app-muted">
            <span>Inherited Ancestor Nodes:</span>
            <span className="font-mono font-medium text-app-text">{inheritedCount}</span>
          </div>
          <div className="flex items-center justify-between text-app-muted">
            <span>Current Branch Local Nodes:</span>
            <span className="font-mono font-medium text-app-text">{localCount}</span>
          </div>
          <div className="flex items-center justify-between text-app-muted">
            <span>Pinned Context Nodes:</span>
            <span className="font-mono font-medium text-app-text">{pinnedCount}</span>
          </div>
        </div>
      </div>

      {/* Semantic Memory & Vector Retrieval */}
      <div className="p-3 bg-app-card border border-app-border rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-app-text">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-app-muted" />
            Retrieved Semantic Context
          </span>
          {relevantCount > 0 ? (
            <span className="text-[10px] font-mono text-emerald-400">{relevantCount} matches</span>
          ) : (
            <FeatureUnavailableBadge status="UNAVAILABLE" label="NONE" />
          )}
        </div>
        <p className="text-[11px] text-app-muted leading-relaxed">
          {relevantCount > 0
            ? `${relevantCount} semantic context chunk(s) injected from project vector index.`
            : "No external semantic memory chunks injected. Context is composed exclusively of conversation lineage."}
        </p>
      </div>

      {/* Execution Node Daemon */}
      <div className="p-3 bg-app-card border border-app-border rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-app-text">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-app-muted" />
            Local Node Daemon
          </span>
          {agentStatus?.connected ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ONLINE
            </span>
          ) : (
            <FeatureUnavailableBadge status="UNAVAILABLE" label="OFFLINE" />
          )}
        </div>
        <div className="font-mono text-[11px] text-app-dim space-y-1">
          <div>
            <span className="text-app-muted">Node ID:</span> {agentStatus?.agent_id || "Unenrolled Daemon"}
          </div>
          <div>
            <span className="text-app-muted">Capabilities:</span>{" "}
            {agentStatus?.capabilities?.length ? agentStatus.capabilities.join(", ") : "terminal, fs.read (Jailed)"}
          </div>
        </div>
      </div>

      {/* Invariant Footer */}
      <div className="p-3 bg-app-secondary border border-app-border rounded-lg text-[10px] text-app-dim leading-relaxed">
        <strong>Invariants:</strong> Model routing is authoritative via the Model Gateway. Consequential operations are gated by CAS approval.
      </div>
    </div>
  );
};
