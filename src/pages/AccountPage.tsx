import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Trash2, Key, BarChart2, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { api, getAccessToken } from '../services/api';

const API = import.meta.env.VITE_API_URL;

export function AccountPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [usage, setUsage] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadUsage();
    loadApiKeys();
  }, [user]);

  const loadProfile = async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile(data);
      setFullName(data.full_name || '');
    } catch {}
  };

  const loadUsage = async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API}/settings/usage?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsage(data);
    } catch {}
  };

  const loadApiKeys = async () => {
    try {
      const token = await getAccessToken();
      const keys = await api.listApiKeys(token);
      setApiKeys(keys);
    } catch {}
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: fullName, email: user.email }, { onConflict: 'id' });
      if (error) throw error;
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e: any) {
      setSaveMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    alert('Account deletion requires a backend admin endpoint. Contact support to delete your account.');
    setShowDeleteConfirm(false);
  };

  const removeApiKey = async (provider: string) => {
    const token = await getAccessToken();
    await api.removeApiKey(token, provider);
    setApiKeys(prev => prev.filter(k => k.provider !== provider));
  };

  return (
    <div className="min-h-screen bg-white text-[#e0e0e0]">
      {/* Header */}
      <div className="border-b border-[#e8e8e8] bg-white backdrop- sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded hover:bg-white transition-colors text-[#52504b] hover:text-[#0a0a0a]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#0a0a0a]">Account</h1>
            <p className="text-xs text-[#52504b]">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded bg-white hover:bg-white text-[#52504b] hover:text-[#0a0a0a] text-sm transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Profile */}
        <section className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
              <User size={16} className="text-[#52504b]" />
            </div>
            <h2 className="text-base font-semibold text-[#0a0a0a]">Profile</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-16 h-16 rounded object-cover ring-2 ring-surface-700"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-white  to-white flex items-center justify-center text-[#0a0a0a] font-bold text-xl">
                {(fullName || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">{fullName || 'No name set'}</p>
              <p className="text-xs text-[#52504b]">{user?.email}</p>
              <p className="text-xs text-[#52504b] mt-0.5">
                Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#52504b] uppercase tracking-wider mb-1 block">
                Display Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="input-field"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg && <p className="text-xs text-[#0a0a0a]">{saveMsg}</p>}
            </div>
          </div>
        </section>

        {/* Usage */}
        <section className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
              <BarChart2 size={16} className="text-[#52504b]" />
            </div>
            <h2 className="text-base font-semibold text-[#0a0a0a]">Usage (Last 30 Days)</h2>
          </div>
          {usage ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Requests', value: usage.total_requests ?? 0 },
                { label: 'Tokens Used', value: (usage.total_tokens ?? 0).toLocaleString() },
                { label: 'API Keys Stored', value: apiKeys.length },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded p-4">
                  <p className="text-2xl font-bold text-[#0a0a0a]">{stat.value}</p>
                  <p className="text-xs text-[#52504b] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#52504b]">Loading usage...</div>
          )}
        </section>

        {/* API Keys */}
        <section className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
              <Key size={16} className="text-[#52504b]" />
            </div>
            <h2 className="text-base font-semibold text-[#0a0a0a]">Stored API Keys</h2>
          </div>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-[#52504b]">
              No API keys stored. Add them in{' '}
              <button onClick={() => navigate('/settings')} className="text-[#52504b] hover:underline">
                Settings
              </button>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 bg-white rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0a0a0a] capitalize">{key.provider}</p>
                    <p className="text-xs text-[#52504b]">
                      Added {new Date(key.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeApiKey(key.provider)}
                    className="text-[#52504b] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6 border border-red-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={16} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-[#0a0a0a]">Danger Zone</h2>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm border border-red-500/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#52504b]">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="input-field border-red-500/30 focus:border-red-500/60"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== 'DELETE'}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled: text-[#0a0a0a] text-sm transition-colors"
                >
                  Delete My Account
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                  className="px-4 py-2 rounded bg-white hover:bg-white text-[#52504b] text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
