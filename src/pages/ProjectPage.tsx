import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, GitBranch, MessageSquare, Plus, Loader2,
  ChevronRight, Users, FolderTree, Clock, Settings2,
} from "lucide-react";
import { getAccessToken } from "../services/api";

const API = import.meta.env.VITE_API_URL;

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || res.statusText);
  }
  return res.json();
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [trees, setTrees] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingConv, setCreatingConv] = useState<string | null>(null); // treeId being used
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [treesRes, convsRes, membersRes] = await Promise.all([
        authFetch(`/trees/project/${projectId}`),
        authFetch(`/conversations/?project_id=${projectId}&limit=100`).then((d: any) =>
          Array.isArray(d) ? d : (d.conversations ?? [])
        ),
        authFetch(`/projects/${projectId}/members`).catch(() => []),
      ]);

      // Try to get project info from the first tree or member context
      setTrees(treesRes || []);
      setConversations(convsRes || []);
      setMembers(membersRes || []);

      // Fetch project details separately (from projects list)
      try {
        const projectsRes = await authFetch(`/projects/`);
        const found = (Array.isArray(projectsRes) ? projectsRes : (projectsRes.projects ?? [])).find(
          (p: any) => p.id === projectId
        );
        if (found) setProject(found);
      } catch {
        // project details are optional
      }
    } catch (e: any) {
      setError(e.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConversation = (convId: string) => {
    navigate(`/chat/${convId}`);
  };

  const handleCreateConversation = async (treeId: string) => {
    setCreatingConv(treeId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API}/conversations/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Conversation",
          project_id: projectId,
          tree_id: treeId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const conv = await res.json();
      navigate(`/chat/${conv.id}`);
    } catch (e: any) {
      alert(`Failed to create conversation: ${e.message}`);
    } finally {
      setCreatingConv(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={32} className="text-[#a0a0a0] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => navigate("/dashboard?tab=team")} className="btn-ghost text-sm">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  // Group conversations by tree_id
  const convsByTree: Record<string, any[]> = {};
  for (const conv of conversations) {
    const key = conv.tree_id ?? "__none__";
    if (!convsByTree[key]) convsByTree[key] = [];
    convsByTree[key].push(conv);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navbar */}
      <nav className="bg-[#111111]/80 backdrop-blur-xl border-b border-[#1e1e1e] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard?tab=team")}
              className="p-2 rounded-xl text-[#888888] hover:text-white hover:bg-[#1f1f1f] transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333333] to-[#666666] flex items-center justify-center">
              <FolderTree size={15} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white">
                {project?.name ?? "Team Project"}
              </span>
              {project?.description && (
                <p className="text-xs text-[#555555] leading-none mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {members.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-[#222222]">
                <Users size={13} className="text-[#555555]" />
                <span className="text-xs text-[#888888]">{members.length} member{members.length !== 1 ? "s" : ""}</span>
              </div>
            )}
            <button
              onClick={() => navigate(`/team/${projectId}`)}
              className="p-2 rounded-xl text-[#888888] hover:text-white hover:bg-[#1f1f1f] transition-all"
              title="Manage team"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {trees.length === 0 ? (
          /* ── No trees yet ── */
          <div className="glass-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-6">
              <GitBranch size={28} className="text-[#444444]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No conversation trees yet</h2>
            <p className="text-[#555555] text-sm mb-8 max-w-sm mx-auto">
              This project doesn't have a main tree set up yet. A tree organises all branched conversations for your team.
            </p>
            <button
              onClick={async () => {
                try {
                  const res = await authFetch("/trees/", {
                    method: "POST",
                    body: JSON.stringify({ project_id: projectId, name: "Main Tree", shared_context: "" }),
                  });
                  setTrees([res]);
                } catch (e: any) {
                  alert(`Failed: ${e.message}`);
                }
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Main Tree
            </button>
          </div>
        ) : (
          /* ── Tree list ── */
          <div className="space-y-6">
            {trees.map((tree) => {
              const treeConvs = convsByTree[tree.id] ?? [];
              const isCreating = creatingConv === tree.id;

              return (
                <div key={tree.id} className="glass-card overflow-hidden">
                  {/* Tree header */}
                  <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between bg-[#111111]/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                        <GitBranch size={15} className="text-[#a0a0a0]" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white">{tree.name}</span>
                        {tree.is_default && (
                          <span className="ml-2 text-[10px] font-bold text-[#888888] bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5">
                            DEFAULT
                          </span>
                        )}
                        {tree.shared_context && (
                          <p className="text-xs text-[#555555] mt-0.5 max-w-md truncate">{tree.shared_context}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreateConversation(tree.id)}
                      disabled={isCreating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#333333] transition-all disabled:opacity-40"
                    >
                      {isCreating ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      New Conversation
                    </button>
                  </div>

                  {/* Conversations inside tree */}
                  {treeConvs.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <MessageSquare size={24} className="mx-auto text-[#333333] mb-3" />
                      <p className="text-sm text-[#444444]">No conversations yet.</p>
                      <p className="text-xs text-[#333333] mt-1">Click "New Conversation" to start one.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1a1a1a]">
                      {treeConvs.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleOpenConversation(conv.id)}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#111111]/60 transition-all group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 group-hover:bg-[#222222] transition-colors">
                              <MessageSquare size={13} className="text-[#555555] group-hover:text-[#888888]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate group-hover:text-[#e0e0e0]">
                                {conv.title || "Untitled Conversation"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock size={10} className="text-[#444444]" />
                                <span className="text-[10px] text-[#444444]">
                                  {new Date(conv.created_at).toLocaleDateString(undefined, {
                                    month: "short", day: "numeric", year: "numeric",
                                  })}
                                </span>
                                {conv.active_branch_id && (
                                  <span className="text-[10px] text-[#333333] font-mono">
                                    {conv.active_branch_id.slice(0, 6)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-[#333333] group-hover:text-[#666666] flex-shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
