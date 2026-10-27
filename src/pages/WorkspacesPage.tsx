import React, { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  Code2,
  GitBranch,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Folder,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  AlertCircle,
  X
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import type { WorkspaceResponse } from "../types";
import {
  getAuthoritativeWorkspaceId,
  setAuthoritativeWorkspaceId,
  subscribeToWorkspaceChanges,
} from "../services/workspaceContext";

export const WorkspacesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeWsId, setActiveWsId] = useState<string>(getAuthoritativeWorkspaceId());

  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Workspace Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createVisibility, setCreateVisibility] = useState<"private" | "workspace" | "shared">("private");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listWorkspaces();
      setWorkspaces(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    const unsubscribe = subscribeToWorkspaceChanges((id) => setActiveWsId(id));
    return () => unsubscribe();
  }, [fetchWorkspaces]);

  const handleSelectWorkspace = (ws: WorkspaceResponse) => {
    setAuthoritativeWorkspaceId(ws.id);
    navigate(`/workspace/${ws.id}`);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createSlug.trim() || creating) return;

    setCreating(true);
    setCreateError(null);
    try {
      const cleanSlug = createSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const created = await apiClient.createWorkspace(undefined, {
        name: createName.trim(),
        slug: cleanSlug,
        visibility: createVisibility,
      });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateSlug("");
      await fetchWorkspaces();
      handleSelectWorkspace(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-app-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-app-text" />
              Workspaces & Code Workbenches
            </h1>
            <FeatureUnavailableBadge status="LIVE" label="Path-Jailed" />
          </div>
          <p className="text-xs text-app-muted">
            Multi-tenant isolated filesystems, sandboxed terminal daemons, Git diff inspection, and native compiler integrations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-secondary hover:bg-app-card border border-app-border text-app-text text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Workspace</span>
          </button>

          {activeWsId && (
            <button
              onClick={() => navigate(`/workspace/${activeWsId}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-semibold hover:opacity-90 shadow-xs transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Open Active Workbench</span>
            </button>
          )}
        </div>
      </div>

      {/* State Renderers */}
      {loading ? (
        <div className="p-12 text-center bg-app-card border border-app-border rounded-xl space-y-3">
          <div className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-app-muted">Loading authoritative workspaces...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-app-card border border-rose-500/30 rounded-xl space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-semibold text-app-text">Failed to Load Workspaces</h3>
          <p className="text-xs text-app-muted max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchWorkspaces}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-app-secondary hover:bg-app-card border border-app-border text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="p-12 text-center bg-app-card border border-app-border rounded-xl space-y-4">
          <FolderTree className="w-10 h-10 text-app-muted mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-app-text">No Workspaces Found</h3>
            <p className="text-xs text-app-muted max-w-sm mx-auto">
              You are not currently enrolled in any workspace. Create a new workspace to start working.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-semibold hover:opacity-90 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Workspace</span>
          </button>
        </div>
      ) : (
        /* Workspaces Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => {
            const isActive = activeWsId === ws.id;

            return (
              <div
                key={ws.id}
                className={`p-5 bg-app-card border rounded-xl shadow-xs transition flex flex-col justify-between space-y-4 ${
                  isActive ? "border-app-strong ring-1 ring-app-strong" : "border-app-border hover:border-app-strong"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-xs text-app-muted truncate" title={ws.id}>
                        {ws.slug || ws.id.substring(0, 8)}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-app-secondary border border-app-border text-app-text font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <FeatureUnavailableBadge
                      status="LIVE"
                      label={ws.visibility.toUpperCase()}
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-app-text">{ws.name}</h3>
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] text-app-dim truncate bg-app-secondary px-2.5 py-1 rounded border border-app-subtle">
                      UUID: {ws.id}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-app-subtle text-xs">
                  <div className="flex items-center justify-between text-app-muted">
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <GitBranch className="w-3.5 h-3.5 text-app-dim" />
                      main-branch
                    </span>
                    <span className="text-[11px] font-mono">
                      Created: {new Date(ws.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {["fs.read", "fs.write", "fs.list_dir", "git.status", "compiler.transpile"].map((cap) => (
                      <span
                        key={cap}
                        className="px-1.5 py-0.5 rounded bg-app-secondary text-app-dim border border-app-subtle text-[10px] font-mono"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-app-muted font-mono">
                      Role: <span className="text-app-text uppercase font-semibold">{ws.role || "MEMBER"}</span>
                    </span>

                    <button
                      onClick={() => handleSelectWorkspace(ws)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-app-secondary hover:bg-app-card text-app-text border border-app-border rounded-lg text-xs font-medium transition"
                    >
                      <span>{isActive ? "Enter Workbench" : "Switch & Open"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Workspace Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-app-card border border-app-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h2 className="text-sm font-bold text-app-text">Create Authoritative Workspace</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-app-muted hover:text-app-text rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4 text-xs">
              {createError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-app-text">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Engineering Jail"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (!createSlug) {
                      setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));
                    }
                  }}
                  className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-app-text text-xs focus:outline-hidden focus:border-app-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-app-text">Workspace Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. primary-engineering-jail"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                  className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-app-text text-xs font-mono focus:outline-hidden focus:border-app-accent"
                />
                <p className="text-[10px] text-app-muted">Unique alphanumeric slug for URL routing.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-app-text">Cognition Visibility</label>
                <select
                  value={createVisibility}
                  onChange={(e) => setCreateVisibility(e.target.value as any)}
                  className="w-full px-3 py-2 bg-app-secondary border border-app-border rounded-lg text-app-text text-xs focus:outline-hidden focus:border-app-accent"
                >
                  <option value="private">Private (Restricted to creator)</option>
                  <option value="workspace">Workspace (All members of this workspace)</option>
                  <option value="shared">Shared (Project and workspace members)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-app-secondary border border-app-border text-xs font-medium hover:bg-app-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
