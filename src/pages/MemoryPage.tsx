import React, { useState } from "react";
import {
  Database,
  Search,
  Filter,
  Trash2,
  Pin,
  Clock,
  Sparkles,
  ArrowRight,
  History,
  Activity,
  Layers,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

interface MemoryRecord {
  id: string;
  scope: "PROJECT" | "USER" | "WORKSPACE";
  content: string;
  provenance: string;
  createdAt: string;
  isStale: boolean;
  confidence: number;
}

export const MemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<"ALL" | "PROJECT" | "USER" | "WORKSPACE">("ALL");

  const [memories, setMemories] = useState<MemoryRecord[]>([
    {
      id: "mem-001",
      scope: "PROJECT",
      content: "Arbor Monorepo uses FastAPI for backend services and React 19 + Vite 8 for frontend cockpit.",
      provenance: "Codebase Discovery Daemon",
      createdAt: "3 days ago",
      isStale: false,
      confidence: 0.99,
    },
    {
      id: "mem-002",
      scope: "WORKSPACE",
      content: "Avoid recursive Fibonacci implementations without dynamic programming caching or C++17 compilation.",
      provenance: "Milestone 2 Milestone Mission 84920",
      createdAt: "Yesterday",
      isStale: false,
      confidence: 0.95,
    },
    {
      id: "mem-003",
      scope: "USER",
      content: "Operator prefers monochrome black-and-white theme with strict terminal execution sandboxing.",
      provenance: "User Preference Observation",
      createdAt: "1 hour ago",
      isStale: false,
      confidence: 0.92,
    },
  ]);

  const filteredMemories = memories.filter((m) => {
    const matchesScope = selectedScope === "ALL" || m.scope === selectedScope;
    const matchesQuery = !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesScope && matchesQuery;
  });

  const handleDelete = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-app-text" />
              Adaptive Memory & Retrieval
            </h1>
            <FeatureUnavailableBadge status="SEALED" label="Scoped Memory Active" />
          </div>
          <p className="text-xs text-app-muted">
            Tenant-isolated persistent memory, provenance tracking, retrieval traces, and branch replay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/ops/retrieval")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-card border border-app-border text-xs font-medium text-app-text hover:bg-app-hover transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            Context Debugger
          </button>
          <button
            onClick={() => navigate("/ops/replay")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-card border border-app-border text-xs font-medium text-app-text hover:bg-app-hover transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Branch Replay
          </button>
        </div>
      </div>

      {/* Search & Scope Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-app-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search persistent memories across scopes..."
            className="w-full pl-9 pr-4 py-2 bg-app-card border border-app-border rounded-lg text-xs text-app-text placeholder:text-app-muted outline-none focus:border-app-strong transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-app-card border border-app-border rounded-lg p-1 text-xs">
          {(["ALL", "PROJECT", "WORKSPACE", "USER"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedScope(s)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors font-medium",
                selectedScope === s
                  ? "bg-app-accent text-app-inverted font-semibold"
                  : "text-app-muted hover:text-app-text"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Memory List */}
      <div className="space-y-3">
        {filteredMemories.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No matching memories"
            description="Memories are captured semantically during conversations and missions."
          />
        ) : (
          filteredMemories.map((m) => (
            <div
              key={m.id}
              className="p-4 bg-app-card border border-app-border rounded-xl shadow-sm hover:border-app-strong transition-colors space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-app-border text-app-muted">
                    {m.scope}
                  </span>
                  <span className="text-app-muted text-xs">·</span>
                  <span className="text-[11px] font-mono text-app-muted">
                    Confidence: {(m.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-app-muted">{m.createdAt}</span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1 rounded text-app-muted hover:text-red-500 hover:bg-app-hover"
                    title="Invalidate / Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-app-text leading-relaxed">{m.content}</p>

              <div className="pt-2 border-t border-app-subtle text-[11px] text-app-muted font-mono flex items-center justify-between">
                <span>Provenance: {m.provenance}</span>
                <span>ID: {m.id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
