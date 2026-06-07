import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  GitBranch, Plus,
  Crown, Users, Settings, ShieldCheck, LineChart,
  ArrowLeft, ChevronRight, Trash2, Activity, Database, Key, UserX, RefreshCw
} from "lucide-react";
import { useConversation } from "../hooks/useConversation";
import { useProject } from "../hooks/useProject";
import { useAuth } from "../hooks/useAuth";
import { ConversationList } from "../components/ConversationList";
import { OnboardingOverlay } from "../components/OnboardingOverlay";
import { api, getAccessToken } from "../services/api";
import { supabase } from "../lib/supabase";
import { TreeSetupWizard } from "../components/TreeSetupWizard";

const PLATFORM_ADMIN_EMAIL = "chaturvediabhinav692@gmail.com";

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPlatformAdmin = user?.email === PLATFORM_ADMIN_EMAIL;
  const {
    conversations,
    loading,
    fetchConversations,
    createConversation,
    deleteConversation,
    renameConversation,
  } = useConversation();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get("tab") || "personal") as "personal" | "team" | "admin" | "insights";
  const setView = (tab: string) => setSearchParams({ tab });
  const { projects, loading: projectsLoading, fetchProjects, createProject: apiCreateProject, deleteProject: apiDeleteProject } = useProject();
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [storageMode, setStorageMode] = useState<string>("local");
  const [showWizard, setShowWizard] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleProjectClick = (project: any) => {
    navigate(`/project/${project.id}`);
  };

  // Admin panel state
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState<string | null>(null);

  // Insights state
  const [insightsData, setInsightsData] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const loadAdminData = async () => {
    if (!isPlatformAdmin) return;
    setAdminLoading(true);
    try {
      // Platform stats from Supabase directly
      const [usersRes, convoRes, projectsRes, healthRes] = await Promise.all([
        supabase.from("profiles").select("id, email, created_at, banned_until", { count: "exact" }),
        supabase.from("conversations").select("id, created_at", { count: "exact" }),
        supabase.from("projects").select("id", { count: "exact" }),
        api.getSystemHealth().catch(() => null),
      ]);

      // Active users last 7 days — conversations created in last 7 days, distinct user_ids
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const activeRes = await supabase
        .from("conversations")
        .select("user_id")
        .gte("created_at", sevenDaysAgo);

      const activeUserIds = new Set((activeRes.data || []).map((r: any) => r.user_id));

      setAdminStats({
        totalUsers: usersRes.count ?? 0,
        totalConversations: convoRes.count ?? 0,
        totalProjects: projectsRes.count ?? 0,
        activeUsers7d: activeUserIds.size,
      });
      setAdminUsers(usersRes.data || []);
      setSystemHealth(healthRes);
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string, isBanned: boolean) => {
    setSuspendingUser(userId);
    try {
      if (isBanned) {
        await supabase.from("profiles").update({ banned_until: null }).eq("id", userId);
      } else {
        const banUntil = new Date(Date.now() + 365 * 86400000 * 100).toISOString();
        await supabase.from("profiles").update({ banned_until: banUntil }).eq("id", userId);
      }
      await loadAdminData();
    } catch (err) {
      console.error("Suspend error:", err);
    } finally {
      setSuspendingUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAccessToken();

      if (!token) {
        navigate("/");
        return;
      }

      fetchConversations();
      fetchProjects();
      
      api.getSettings(token || "demo-token").then(s => {
        setStorageMode(s.storage_mode);
      }).catch(console.error);
    };

    checkAuth();
  }, [fetchConversations, fetchProjects, navigate]);

  useEffect(() => {
    if (view === "admin" && isPlatformAdmin) {
      loadAdminData();
    }
  }, [view, isPlatformAdmin]);

  useEffect(() => {
    if (view === "insights" && !insightsData && !insightsLoading) {
      setInsightsLoading(true);
      const load = async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch(`${import.meta.env.VITE_API_URL}/insights/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) setInsightsData(await res.json());
        } catch (err) {
          console.error("Insights load error:", err);
        } finally {
          setInsightsLoading(false);
        }
      };
      load();
    }
  }, [view]);

  const handleCreate = async (title: string) => {
    const payload = { title, project_id: selectedProject?.id || null };
    console.log("Creating conversation payload:", payload);
    try {
      const conv = await createConversation(title, selectedProject?.id || null);
      if (conv) {
        navigate(`/chat/${conv.id}`);
      }
    } catch (e) {
      console.error("Conversation creation failed:", e);
      throw e;
    }
  };

  const handleSelect = (id: string) => navigate(`/chat/${id}`);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      await apiCreateProject(newProjectName, newProjectDesc);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowNewProjectModal(false);
      setShowWizard(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this project? This cannot be undone and will delete all associated conversations.")) {
      const success = await apiDeleteProject(projectId);
      if (!success) {
        alert("Failed to delete project. You may not be the owner.");
      }
    }
  };

  const handleWizardComplete = async (data: { name: string; goal: string }) => {
    setIsCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      // 1. Create Project
      const project = await apiCreateProject(data.name, data.goal);
      if (!project) throw new Error("Failed to create project");

      // 2. Create Root Conversation
      // tree_id is intentionally omitted — the backend auto-resolves it from the project
      const conv = await createConversation("Project Initialization", project.id);
      
      if (conv) {
        setShowWizard(false);
        navigate(`/chat/${conv.id}`);
      }
    } catch (err: any) {
      console.error("Wizard failed during initialization:", err);
      const msg = err.message || "Unknown error";
      alert(`Failed to initialize project tree: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <OnboardingOverlay onComplete={() => {}} />
      
      {/* Navbar */}
      <nav className="bg-[#111111]/80 backdrop-blur-xl border-b border-[#1e1e1e] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/arbor.svg" alt="Arbor Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-base font-bold text-white">Arbor</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/settings")} className="p-2.5 rounded-xl bg-[#1f1f1f] text-[#888888] hover:text-white hover:bg-[#222222] transition-all" title="Settings">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* View Switcher */}
        <div className="flex gap-4 mb-8">
          {[
            { id: "personal", label: "Personal", icon: Crown },
            { id: "team", label: "Team", icon: Users },
            ...(isPlatformAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck }] : []),
            { id: "insights", label: "Insights", icon: LineChart },
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setView(t.id as any)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === t.id ? "bg-white text-black shadow-lg glow-brand" : "bg-[#111111] text-[#888888] hover:text-white"}`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {view === "personal" && (
          <div className="animate-fade-in">
             <h1 className="text-2xl font-bold text-white mb-8">Personal Dashboard</h1>
             <div className="glass-card overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  <ConversationList 
                    conversations={conversations.filter(c => !c.project_id)} 
                    activeConversationId={null} 
                    onSelect={handleSelect} 
                    onCreate={handleCreate} 
                    onDelete={deleteConversation}
                    onRename={renameConversation}
                    loading={loading} 
                  />
                </div>
             </div>
          </div>
        )}

        {view === "team" && (
          <div className="animate-fade-in">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedProject && (
                  <button 
                    onClick={() => setSelectedProject(null)}
                    className="p-2 rounded-xl bg-[#111111] text-[#888888] hover:text-white transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {selectedProject ? selectedProject.name : "Team Projects"}
                  </h1>
                  {selectedProject && <p className="text-sm text-[#555555]">{selectedProject.description}</p>}
                </div>
              </div>
              {!selectedProject && (
                <button onClick={() => setShowWizard(true)} className="text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors">
                  + New Project
                </button>
              )}
            </div>

            {selectedProject ? (
              <div className="animate-fade-in">
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-[#1e1e1e] flex justify-between items-center bg-[#111111]/30">
                    <span className="text-xs font-black text-[#555555] uppercase tracking-widest">Project Conversations</span>
                    <button 
                      onClick={() => handleCreate("New Project Conversation")}
                      className="text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
                    >
                      + New Conversation
                    </button>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto">
                    <ConversationList 
                      conversations={conversations.filter(c => c.project_id === selectedProject.id)} 
                      activeConversationId={null} 
                      onSelect={handleSelect} 
                      onCreate={handleCreate} 
                      onDelete={deleteConversation}
                      onRename={renameConversation}
                      loading={loading} 
                    />
                  </div>
                </div>
              </div>
            ) : projectsLoading && projects.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 h-32 animate-pulse bg-[#1f1f1f]/50" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Users size={48} className="mx-auto text-[#444444] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
                <p className="text-[#555555] mb-6">Create a project to collaborate with your team on branched conversations.</p>
                <button onClick={() => setShowWizard(true)} className="btn-primary inline-flex items-center gap-2">
                  <Plus size={16} /> Create First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project: any) => (
                  <div 
                    key={project.id} 
                    onClick={() => handleProjectClick(project)}
                    className="glass-card p-6 group hover:border-[#2a2a2a] transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="p-1 text-[#a0a0a0] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-[#a0a0a0]" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#a0a0a0] transition-colors">{project.name}</h3>
                    <p className="text-xs text-[#555555] mb-4 line-clamp-2">{project.description || "No description provided."}</p>
                    <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-[#555555]">
                      <span>{project.members || 1} members</span>
                      <span>{conversations.filter(c => c.project_id === project.id).length} conversations</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "insights" && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Your Insights</h1>
              <p className="text-[#555555]">Real stats from your conversations</p>
            </div>

            {insightsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 h-40 animate-pulse bg-[#1f1f1f]/50" />
                ))}
              </div>
            ) : !insightsData ? (
              <div className="glass-card p-12 text-center">
                <p className="text-[#555555]">No data yet. Start some conversations to see your insights.</p>
              </div>
            ) : (
              <>
                {/* Row 1 — Key numbers */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-4">Total Conversations</h3>
                    <p className="text-4xl font-black text-white">{insightsData.total_conversations}</p>
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-4">Branches Created</h3>
                    <p className="text-4xl font-black text-white">{insightsData.total_branches}</p>
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-4">Messages This Week</h3>
                    <p className="text-4xl font-black text-white">{insightsData.messages_this_week}</p>
                  </div>

                </div>

                {/* Row 2 — Detail cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Most active conversation */}
                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-6">Most Active Conversation</h3>
                    {insightsData.most_active_conversation ? (
                      <>
                        <p className="text-sm font-bold text-white truncate mb-1">
                          {insightsData.most_active_conversation.title}
                        </p>
                        <p className="text-xs text-[#555555]">
                          {insightsData.most_active_conversation.message_count} messages
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-[#444444]">No conversations yet</p>
                    )}
                  </div>

                  {/* Top models */}
                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-6">Models Used</h3>
                    {insightsData.top_models.length > 0 ? (
                      <div className="space-y-3">
                        {insightsData.top_models.map((m: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate max-w-[70%]">{m.model}</span>
                            <span className="text-xs text-[#555555] flex-shrink-0 ml-2">{m.count}×</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#444444]">Send some messages first</p>
                    )}
                  </div>

                  {/* Deepest branch */}
                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-6">Deepest Branch</h3>
                    <p className="text-4xl font-black text-white mb-1">{insightsData.max_branch_depth}</p>
                    <p className="text-xs text-[#555555]">
                      {insightsData.max_branch_depth === 0 ? "No branches yet" : "levels deep"}
                    </p>
                  </div>

                </div>
              </>
            )}
          </div>
        )}

        {view === "admin" && isPlatformAdmin && (
          <div className="animate-fade-in space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
              <button
                onClick={loadAdminData}
                disabled={adminLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111111] border border-[#1e1e1e] text-[#888888] hover:text-white text-sm transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={adminLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Platform Stats */}
            <div>
              <h2 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-4">Platform Stats</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: adminStats?.totalUsers ?? "—", icon: Users },
                  { label: "Total Conversations", value: adminStats?.totalConversations ?? "—", icon: Activity },
                  { label: "Total Projects", value: adminStats?.totalProjects ?? "—", icon: GitBranch },
                  { label: "Active (7d)", value: adminStats?.activeUsers7d ?? "—", icon: Crown },
                ].map(stat => (
                  <div key={stat.label} className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <stat.icon size={14} className="text-[#555555]" />
                      <span className="text-[10px] font-black text-[#555555] uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <p className="text-3xl font-black text-white">
                      {adminLoading ? <span className="animate-pulse text-[#333]" >...</span> : stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div>
              <h2 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-4">System Health</h2>
              <div className="glass-card p-6">
                {systemHealth ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-[#555555]" />
                        <span className="text-sm text-white font-medium">Backend Status</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        systemHealth.status === "HEALTHY" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        systemHealth.status === "DEGRADED" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>{systemHealth.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-[#555555]" />
                        <span className="text-sm text-white font-medium">Database</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        systemHealth.subsystems?.database === "ok" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>{systemHealth.subsystems?.database ?? "unknown"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={14} className="text-[#555555]" />
                        <span className="text-sm text-white font-medium">OpenRouter API</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        systemHealth.subsystems?.openrouter !== "error" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>{systemHealth.subsystems?.openrouter ?? "unknown"}</span>
                    </div>
                    <div className="pt-3 border-t border-[#1e1e1e] grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-lg font-black text-white">{systemHealth.metrics?.embedding_queue_depth ?? 0}</p>
                        <p className="text-[10px] text-[#555555] uppercase tracking-widest">Embed Queue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-white">{systemHealth.metrics?.snapshot_queue_depth ?? 0}</p>
                        <p className="text-[10px] text-[#555555] uppercase tracking-widest">Snapshot Queue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-white">{systemHealth.metrics?.failed_tasks ?? 0}</p>
                        <p className="text-[10px] text-[#555555] uppercase tracking-widest">Failed Tasks</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#555555] text-center py-4">
                    {adminLoading ? "Loading..." : "Health data unavailable"}
                  </p>
                )}
              </div>
            </div>

            {/* User Management */}
            <div>
              <h2 className="text-xs font-black text-[#555555] uppercase tracking-widest mb-4">User Management</h2>
              <div className="glass-card overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  {adminLoading ? (
                    <div className="space-y-2 p-4">
                      {[1,2,3,4].map(i => <div key={i} className="h-14 bg-[#1a1a1a] rounded-xl animate-pulse" />)}
                    </div>
                  ) : adminUsers.length === 0 ? (
                    <p className="text-sm text-[#555555] text-center py-8">No users found</p>
                  ) : (
                    adminUsers.map((u: any) => {
                      const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                      const isMe = u.email === PLATFORM_ADMIN_EMAIL;
                      return (
                        <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#111111]/50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {u.email || "(no email)"}
                              {isMe && <span className="ml-2 text-[10px] text-[#888888] bg-[#1a1a1a] px-1.5 py-0.5 rounded">you</span>}
                            </p>
                            <p className="text-[10px] text-[#444444] font-mono mt-0.5">{u.id}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {isBanned && (
                              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Suspended</span>
                            )}
                            {!isMe && (
                              <button
                                onClick={() => handleSuspendUser(u.id, isBanned)}
                                disabled={suspendingUser === u.id}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                                  isBanned
                                    ? "border-[#2a2a2a] text-[#888888] hover:text-green-400 hover:border-green-500/40"
                                    : "border-[#2a2a2a] text-[#888888] hover:text-red-400 hover:border-red-500/40"
                                }`}
                              >
                                <UserX size={11} />
                                {suspendingUser === u.id ? "..." : isBanned ? "Unsuspend" : "Suspend"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-[#444444] text-sm border-t border-[#1f1f1f]/50">
        <span>Arbor by Koredex</span>
        {' · '}
        <a href="/privacy" className="hover:text-[#888888] transition-colors">Privacy</a>
        {' · '}
        <a href="/terms" className="hover:text-[#888888] transition-colors">Terms</a>
        {' · '}
        <a href="mailto:hello@koredex.com" className="hover:text-[#888888] transition-colors">Contact</a>
      </footer>

      {/* Tree Setup Wizard */}
      {showWizard && (
        <TreeSetupWizard 
          onClose={() => setShowWizard(false)} 
          onComplete={handleWizardComplete} 
        />
      )}
    </div>
  );
}
