import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GitBranch, ArrowLeft, Network, PanelLeftClose, PanelLeft,
  Users, UserPlus, X, Trash2, Check, Copy, ChevronRight,
} from "lucide-react";
import { Chat } from "../components/Chat";
import { ChatInput } from "../components/ChatInput";
import { BranchSidebar } from "../components/BranchSidebar";
import { BranchTree } from "../components/BranchTree";
import { BranchMap } from "../components/BranchMap";
import { useBranch } from "../hooks/useBranch";
import { useMessages } from "../hooks/useMessages";
import { useCognitiveGraph } from "../hooks/useCognitiveGraph";
import { useModels } from "../hooks/useModels";
import { useSystemHealth } from "../hooks/useSystemHealth";
import { HealthIndicator } from "../components/HealthIndicator";
import { getAccessToken, sendMessageStream } from "../services/api";
import { api } from "../services/api";
import type { Conversation } from "../types";


type ViewMode = "chat" | "tree" | "branches";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [providerError, setProviderError] = useState(false);

  // --- Team Members Panel State ---
  const [members, setMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { health, loading: healthLoading, error: healthError, refresh: refreshHealth } = useSystemHealth();


  const {
    branches,
    activeBranch,
    activeBranchId,
    loading: branchesLoading,
    fetchBranches,
    createBranch,
    updateBranch,
    switchBranch,
    setActiveBranchId,
  } = useBranch();

  // Mutation layer
  const {
    sources,
    contextMeta,
    sending,
    sendMessage,
    pinMessage,
    unpinMessage,
    appendMessage,
  } = useMessages();

  // Authoritative Graph Layer (Data Source)
  const {
    graph,
    messages,
    inheritedNodeIds,
    forkOriginId,
    loading: graphLoading,
    error: graphError,
    fetchGraph,
    clearGraph,
  } = useCognitiveGraph();

  // Load conversation data
  useEffect(() => {
    if (!conversationId) return;

    const loadConversation = async () => {
      const token = await getAccessToken();

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const conv = await api.getConversation(token, conversationId);
        setConversation(conv);
        const branchList = await fetchBranches(conversationId);
        if (branchList.length > 0 && !activeBranchId) {
          setActiveBranchId(branchList[0].id);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      }
    };

    loadConversation();
  }, [conversationId, navigate, fetchBranches, setActiveBranchId]);

  // Get current user id
  useEffect(() => {
    getAccessToken().then(token => {
      if (token && token !== 'dev_token') {
        import('../lib/supabase').then(({ supabase }) => {
          supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setCurrentUserId(data.user.id);
          });
        });
      }
    });
  }, []);

  const API = import.meta.env.VITE_API_URL;

  const authFetch = async (path: string, options: RequestInit = {}) => {
    const token = await getAccessToken();
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || res.statusText);
    }
    return res.json();
  };

  const loadMembers = useCallback(async (projectId: string) => {
    setMembersLoading(true);
    try {
      const [mems, invs] = await Promise.all([
        authFetch(`/projects/${projectId}/members`),
        authFetch(`/invites/project/${projectId}`).catch(() => []),
      ]);
      setMembers(mems || []);
      setPendingInvites(invs || []);
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Load members when panel opens
  useEffect(() => {
    if (membersOpen && conversation?.project_id) {
      loadMembers(conversation.project_id);
    }
  }, [membersOpen, conversation?.project_id, loadMembers]);

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !conversation?.project_id) return;
    setInviting(true);
    setInviteError('');
    setInviteLink('');
    try {
      const res = await authFetch('/invites/', {
        method: 'POST',
        body: JSON.stringify({ project_id: conversation.project_id, email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteLink(res.invite_link || '');
      setInviteEmail('');
      if (conversation?.project_id) loadMembers(conversation.project_id);
    } catch (e: any) {
      setInviteError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!conversation?.project_id) return;
    if (!confirm('Remove this member from the project?')) return;
    try {
      await authFetch(`/projects/${conversation.project_id}/members/${userId}`, { method: 'DELETE' });
      loadMembers(conversation.project_id);
    } catch (e: any) { alert(e.message); }
  };

  const updateMemberRole = async (userId: string, role: string) => {
    if (!conversation?.project_id) return;
    setUpdatingRole(userId);
    try {
      await authFetch(`/projects/${conversation.project_id}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      loadMembers(conversation.project_id);
    } catch (e: any) {
      alert(`Failed to update role: ${e.message}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      await authFetch(`/invites/${inviteId}`, { method: 'DELETE' });
      if (conversation?.project_id) loadMembers(conversation.project_id);
    } catch {}
  };

  // Load graph when branch changes
  useEffect(() => {
    if (!activeBranchId) return;
    clearGraph();
    fetchGraph(activeBranchId);
  }, [activeBranchId, fetchGraph, clearGraph]);

  // Refresh health metrics shortly after a message is sent
  useEffect(() => {
    if (!sending && messages.length > 0) {
      const timer = setTimeout(() => {
        refreshHealth();
      }, 2000); // 2 second delay to give the background worker a head start
      return () => clearTimeout(timer);
    }
  }, [sending, messages.length, refreshHealth]);


  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeBranchId) return;
      
      const tempId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
      appendMessage({
        id: tempId,
        conversation_id: "",
        branch_id: activeBranchId,
        parent_id: null,
        role: "user",
        content: content,
        sequence: 0,
        is_pinned: false,
        created_at: new Date().toISOString()
      } as any);

      setIsStreaming(true);
      setStreamingContent("");
      
      try {
        await sendMessageStream(
          activeBranchId,
          content,
          (chunk) => {
            setStreamingContent(prev => prev + chunk);
          },
          (node) => {
            setIsStreaming(false);
            setStreamingContent("");
            fetchGraph(activeBranchId);
          }
        );
      } catch (err: any) {
        setIsStreaming(false);
        setStreamingContent("");
        if (err.message === "No model provider configured") {
          setProviderError(true);
        } else {
          alert(err.message || "Failed to send message");
        }
      }
    },
    [activeBranchId, appendMessage, fetchGraph]
  );

  const handleCreateBranch = useCallback(
    async (originNodeId: string, name: string, modelId: string) => {
      if (!conversationId) return;
      const branch = await createBranch(conversationId, originNodeId, name, modelId);
      if (branch) {
        await fetchBranches(conversationId);
        setViewMode("tree");
      }
    },
    [conversationId, createBranch, fetchBranches]
  );
  
  const handleUpdateModel = useCallback(
    async (modelId: string) => {
      if (!activeBranchId) return;
      await updateBranch(activeBranchId, { model_id: modelId, user_initiated_model_change: true });
      fetchGraph(activeBranchId);
    },
    [activeBranchId, updateBranch, fetchGraph]
  );

  // Handle pin/unpin
  const handlePin = useCallback(
    async (nodeId: string) => {
      if (!activeBranchId) return;
      await pinMessage(activeBranchId, nodeId);
      fetchGraph(activeBranchId);
    },
    [activeBranchId, pinMessage, fetchGraph]
  );

  const handleUnpin = useCallback(
    async (nodeId: string) => {
      if (!activeBranchId) return;
      await unpinMessage(activeBranchId, nodeId);
      fetchGraph(activeBranchId);
    },
    [activeBranchId, unpinMessage, fetchGraph]
  );

  const branchOriginId = activeBranch?.origin_node_id ?? null;
  const { models: availableModels } = useModels();

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="bg-white border-b border-[#1a1a1a]
                         flex items-center justify-between px-4 py-2.5 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-8 h-8 rounded flex items-center justify-center
                       text-[#52504b] hover:text-[#0a0a0a] hover:bg-white transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded flex items-center justify-center
                       text-[#52504b] hover:text-[#0a0a0a] hover:bg-white transition-colors
                       lg:hidden"
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          <div className="h-5 w-px bg-white hidden sm:block" />

          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-[#0a0a0a] truncate max-w-[200px] md:max-w-[400px]">
              {conversation?.title || "Loading..."}
            </h1>
            {activeBranch && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#52504b]">
                <GitBranch size={10} className="text-[#0a0a0a]" />
                {activeBranch.name}
                {activeBranch.depth > 0 && (
                  <span className="text-[#52504b]">
                    · depth {activeBranch.depth}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HealthIndicator
            health={health}
            loading={healthLoading}
            error={healthError}
            onRefresh={refreshHealth}
          />

          {/* Members button — only for team conversations */}
          {conversation?.project_id && (
            <button
              onClick={() => setMembersOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all border
                ${ membersOpen
                  ? 'bg-white text-black border-white'
                  : 'bg-white text-[#52504b] border-[#e8e8e8] hover:text-[#0a0a0a] hover:border-[#e8e8e8]'
                }`}
              title="Manage team members"
            >
              <Users size={12} />
              Members
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-white rounded p-1 border border-[#e8e8e8]">
          <button
            onClick={() => setViewMode("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
              ${viewMode === "chat"
                ? "bg-white text-black"
                : "text-[#52504b] hover:text-[#0a0a0a]"
              }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
              ${viewMode === "tree"
                ? "bg-white text-black"
                : "text-[#52504b] hover:text-[#0a0a0a]"
              }`}
          >
            <Network size={12} />
            Chat Tree
          </button>
          <button
            onClick={() => setViewMode("branches")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
              ${viewMode === "branches"
                ? "bg-white text-black"
                : "text-[#52504b] hover:text-[#0a0a0a]"
              }`}
          >
            ⎇ Branch Map
          </button>
        </div>
      </div>
    </header>

    {/* Members Panel — slides in from right */}
    {membersOpen && (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-white z-40"
          onClick={() => setMembersOpen(false)}
        />
        {/* Panel */}
        <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-[#e8e8e8]
                        z-50 flex flex-col shadow-md overflow-y-auto animate-slide-in-right">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e8e8] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#52504b]" />
              <h2 className="text-sm font-semibold text-[#0a0a0a]">Team Members</h2>
              <span className="text-xs text-[#52504b] bg-white px-2 py-0.5 rounded border border-[#e8e8e8]">
                {members.length}
              </span>
            </div>
            <button
              onClick={() => setMembersOpen(false)}
              className="text-[#52504b] hover:text-[#0a0a0a] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Members list */}
            <div className="space-y-2">
              {membersLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 rounded bg-white " />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <p className="text-xs text-[#52504b] text-center py-6">No members yet.</p>
              ) : (
                members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3
                                          bg-white border border-[#e8e8e8] rounded">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded bg-white border border-[#e8e8e8]
                                      flex items-center justify-center text-[#0a0a0a] text-xs font-bold flex-shrink-0">
                        {(m.email || m.full_name || m.user_id || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#0a0a0a] truncate">
                          {m.email || m.full_name || 'Member'}
                        </p>
                        <p className="text-[10px] text-[#52504b] font-mono">
                          {m.user_id?.slice(0,8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {m.role !== 'owner' && m.user_id !== currentUserId ? (
                        <select
                          value={m.role}
                          disabled={updatingRole === m.user_id}
                          onChange={e => updateMemberRole(m.user_id, e.target.value)}
                          className="bg-white border border-[#e8e8e8] rounded px-1.5 py-1
                                     text-[10px] text-[#52504b] outline-none cursor-pointer
                                     hover:border-[#e8e8e8] transition-colors"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="text-[10px] text-[#52504b] px-2 py-0.5 rounded
                                         border border-[#e8e8e8] capitalize">
                          {m.role}
                        </span>
                      )}
                      {m.role !== 'owner' && m.user_id !== currentUserId && (
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="text-[#333333] hover:text-red-400 transition-colors p-1"
                          title="Remove member"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#1a1a1a]" />

            {/* Invite new member */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#52504b] uppercase tracking-widest">Invite Member</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
                placeholder="teammate@company.com"
                className="w-full bg-white border border-[#e8e8e8] rounded px-3 py-2.5
                           text-sm text-[#0a0a0a] placeholder:text-[#333333] outline-none
                           focus:border-[#e8e8e8] transition-colors"
              />
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-white border border-[#e8e8e8] rounded px-3 py-2
                             text-sm text-[#52504b] outline-none cursor-pointer flex-shrink-0"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={sendInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 btn-primary text-sm
                             disabled: disabled:cursor-not-allowed"
                >
                  {inviting ? (
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded animate-spin" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  Send Invite
                </button>
              </div>

              {inviteError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20
                               rounded px-3 py-2">{inviteError}</p>
              )}

              {inviteLink && (
                <div className="flex items-center gap-2 p-3 bg-white border border-[#e8e8e8]
                                rounded">
                  <p className="text-[10px] text-[#52504b] flex-1 truncate font-mono">{inviteLink}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[#52504b] hover:text-[#0a0a0a] flex items-center gap-1 text-[10px]"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              <p className="text-[10px] text-[#333333]">
                An invite email will be sent. The link expires in 7 days.
              </p>
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <div className="space-y-2">
                <div className="border-t border-[#1a1a1a]" />
                <h3 className="text-xs font-semibold text-[#52504b] uppercase tracking-widest">Pending Invites</h3>
                {pendingInvites.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3
                                          bg-white border border-[#e8e8e8] rounded">
                    <div>
                      <p className="text-xs text-[#0a0a0a]">{inv.email}</p>
                      <p className="text-[10px] text-[#52504b]">
                        {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => cancelInvite(inv.id)}
                      className="text-[#333333] hover:text-red-400 transition-colors"
                      title="Cancel invite"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )}

      {/* Provider Error Modal */}
      {providerError && (
        <div className="fixed inset-0 bg-white backdrop- flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded p-6 w-[320px] border border-[#e8e8e8] text-center animate-scale-in shadow-md">
            <h3 className="text-base font-semibold text-[#0a0a0a] mb-2">No AI provider configured.</h3>
            <p className="text-sm text-[#52504b] mb-6 leading-relaxed">
              Add your OpenRouter or OpenAI API key in Settings to start chatting.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/settings')} className="btn-primary w-full py-2.5 flex justify-center items-center">
                Open Settings
              </button>
              <button onClick={() => setProviderError(false)} className="text-xs text-[#52504b] hover:text-[#52504b] transition-colors py-2 mt-1">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Branch sidebar */}
        {sidebarOpen && (
          <div className="flex-shrink-0 animate-slide-in-left">
            <BranchSidebar
              branches={branches}
              activeBranchId={activeBranchId}
              onBranchSelect={switchBranch}
              conversationId={conversationId}
              graph={graph}
            />
          </div>
        )}

        {/* Chat or Tree view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            {graphError && (
              <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-[#0a0a0a] text-xs py-2 px-4 flex justify-between items-center animate-fade-in">
                <span>Error: {graphError}</span>
                <button onClick={() => activeBranchId && fetchGraph(activeBranchId)} className="underline font-bold ml-4">Retry</button>
              </div>
            )}
            {viewMode === "chat" ? (
              <div className="flex flex-col h-full overflow-hidden">
                {health?.status === "DEGRADED" && (
                  <div className="bg-amber-500/10 border-b border-[#e8e8e8] px-4 py-2 text-xs text-[#52504b] flex items-center justify-between animate-fade-in flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded bg-amber-500 " />
                      <span>Cognition delay detected: Background processing backlog. Semantic search is running in eventually-consistent mode. Core chat & branching remain fully functional.</span>
                    </div>
                  </div>
                )}
                {health?.status === "OFFLINE" && (
                  <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-400/90 flex items-center justify-between animate-fade-in flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded bg-rose-500 " />
                      <span>Critical cognition disruption: Bootstrap substrate or database connection issues. Core operations may degrade, but we will best-effort retry all enqueued tasks.</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <Chat
                    messages={messages}
                    sources={sources}
                    contextMeta={contextMeta}
                    sending={sending}
                    loading={graphLoading || branchesLoading}
                    branchOriginId={branchOriginId}
                    inheritedNodeIds={inheritedNodeIds}
                    forkOriginId={forkOriginId}
                    onBranch={() => {}}
                    onPin={handlePin}
                    onUnpin={handleUnpin}
                    onCreateBranch={handleCreateBranch}
                    availableModels={availableModels}
                    isStreaming={isStreaming}
                    streamingContent={streamingContent}
                  />
                </div>
              </div>
            ) : viewMode === "tree" ? (
              <BranchTree
                graph={graph}
                activeBranchId={activeBranchId}
                onBranchSelect={switchBranch}
              />
            ) : (
              <BranchMap
                branches={branches}
                currentBranchId={activeBranchId}
                onBranchClick={(branchId) => {
                  switchBranch(branchId);
                  setViewMode("chat");
                }}
              />
            )}
          </div>
          {viewMode !== "branches" && (
            <ChatInput
              sending={sending}
              onSendMessage={handleSendMessage}
              onImageGenerated={appendMessage}
              activeBranchId={activeBranchId}
              activeModelId={activeBranch?.model_id}
              onModelChange={handleUpdateModel}
              messagesCount={messages.length}
              availableModels={availableModels}
            />
          )}
        </div>
      </div>
    </div>
  );
}

