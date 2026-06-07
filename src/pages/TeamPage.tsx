import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, ArrowLeft, Trash2, Shield,
  Eye, Copy, Check, Clock,
} from 'lucide-react';
import { getAccessToken } from '../services/api';

const API = import.meta.env.VITE_API_URL;

const ROLE_COLORS: Record<string, string> = {
  owner:  'text-white bg-white/10 border-[#2a2a2a]',
  admin:  'text-[#a0a0a0] bg-[#1a1a1a] border-[#2a2a2a]',
  member: 'text-[#888888] bg-[#141414] border-[#2a2a2a]',
  viewer: 'text-[#555555] bg-[#0f0f0f] border-[#1e1e1e]',
};

async function authFetch(path: string, options: RequestInit = {}) {
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
}

export function TeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject]   = useState<any>(null);
  const [members, setMembers]   = useState<any[]>([]);
  const [invites, setInvites]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('member');
  const [inviting, setInviting]       = useState(false);
  const [inviteLink, setInviteLink]   = useState('');
  const [copied, setCopied]           = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID on mount
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

  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mems, invs] = await Promise.all([
        authFetch(`/projects/${projectId}/members`),
        authFetch(`/invites/project/${projectId}`).catch(() => []),
      ]);
      setMembers(mems || []);
      setInvites(invs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteLink('');
    try {
      const res = await authFetch('/invites/', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteLink(res.invite_link);
      setInviteEmail('');
      loadAll();
    } catch (e: any) {
      setInviteError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await authFetch(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
      loadAll();
    } catch (e: any) { alert(e.message); }
  };

  const updateRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      await authFetch(`/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      loadAll();
    } catch (e: any) {
      alert(`Failed to update role: ${e.message}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      await authFetch(`/invites/${inviteId}`, { method: 'DELETE' });
      loadAll();
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      {/* Header */}
      <div className="border-b border-[#1f1f1f]/50 bg-[#111111]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors text-[#888888] hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{project?.name ?? 'Team'}</h1>
            <p className="text-xs text-[#555555]">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Members list */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
              <Users size={16} className="text-[#a0a0a0]" />
            </div>
            <h2 className="text-base font-semibold text-white">Members</h2>
          </div>

          <div className="space-y-2">
            {members.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 px-4 bg-[#1f1f1f]/40 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white text-sm font-bold">
                    {(m.email || m.user_id || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {m.email || m.full_name || 'Member'}
                    </p>
                    <p className="text-xs text-[#444444] font-mono">
                      {m.user_id?.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-[#555555]">
                      Joined {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Role selector for admins/owners — can't change own role or owner's */}
                  {m.role !== 'owner' && m.user_id !== currentUserId ? (
                    <select
                      value={m.role}
                      disabled={updatingRole === m.user_id}
                      onChange={e => updateRole(m.user_id, e.target.value)}
                      className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-2 py-1
                                 text-xs text-[#888888] outline-none cursor-pointer
                                 hover:border-[#3a3a3a] transition-colors"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>
                      {m.role}
                    </span>
                  )}
                  {m.role !== 'owner' && m.user_id !== currentUserId && (
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="text-[#444444] hover:text-red-400 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-[#444444] text-center py-6">No members yet.</p>
            )}
          </div>
        </section>

        {/* Invite form */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <UserPlus size={16} className="text-white" />
            </div>
            <h2 className="text-base font-semibold text-white">Invite Member</h2>
          </div>

          <div className="flex gap-3 mb-3 flex-wrap sm:flex-nowrap">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="input-field flex-1 min-w-0"
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="input-field w-32"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={sendInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
            >
              {inviting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Send Invite
            </button>
          </div>

          {inviteError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
              {inviteError}
            </p>
          )}

          {inviteLink && (
            <div className="flex items-center gap-2 p-3 bg-white/10 border border-[#2a2a2a] rounded-xl mb-3">
              <p className="text-xs text-white flex-1 truncate font-mono">{inviteLink}</p>
              <button
                onClick={copyLink}
                className="text-white hover:text-white flex items-center gap-1 text-xs whitespace-nowrap"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          <p className="text-xs text-[#444444]">
            An invite email will be sent. The link expires in 7 days.
          </p>
        </section>

        {/* Pending invites */}
        {invites.length > 0 && (
          <section className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                <Clock size={16} className="text-[#888888]" />
              </div>
              <h2 className="text-base font-semibold text-white">Pending Invites</h2>
            </div>
            <div className="space-y-2">
              {invites.map((inv, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-4 bg-[#1f1f1f]/40 rounded-xl"
                >
                  <div>
                    <p className="text-sm text-white">{inv.email}</p>
                    <p className="text-xs text-[#555555]">
                      {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelInvite(inv.id)}
                    className="text-[#444444] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Role guide */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
              <Shield size={16} className="text-[#a0a0a0]" />
            </div>
            <h2 className="text-base font-semibold text-white">Role Permissions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { role: 'Owner',  color: 'text-[#888888]',   perms: ['Full control', 'Billing', 'Delete project'] },
              { role: 'Admin',  color: 'text-[#a0a0a0]',   perms: ['Manage members', 'All conversations', 'Settings'] },
              { role: 'Member', color: 'text-white', perms: ['Create branches', 'Chat', 'View all'] },
              { role: 'Viewer', color: 'text-[#888888]', perms: ['Read only', 'No messaging', 'No branching'] },
            ].map((r, i) => (
              <div key={i} className="bg-[#1f1f1f]/40 rounded-xl p-3">
                <p className={`font-semibold mb-2 ${r.color}`}>{r.role}</p>
                <ul className="space-y-1">
                  {r.perms.map((p, j) => (
                    <li key={j} className="text-[#888888] flex items-center gap-1">
                      <Eye size={9} className="shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
