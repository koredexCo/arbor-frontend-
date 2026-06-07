import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch, ArrowLeft, Key, Database, BarChart3, Shield,
  Check, X, Plus, Trash2, ExternalLink, Loader2, HardDrive,
  Cloud, Server, AlertTriangle, Zap
} from "lucide-react";
import { api } from "../services/api";
import { getAccessToken } from "../services/api";
import type { UserSettings, StoredApiKey, UsageSummary, ApiMode, StorageMode } from "../types";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", hint: "sk-...", frozen: true },
  { id: "claude", name: "Anthropic (Claude)", hint: "sk-ant-...", frozen: true },
  { id: "gemini", name: "Google Gemini", hint: "AI...", frozen: true },
  { id: "grok", name: "xAI (Grok)", hint: "xai-...", frozen: true },
  { id: "openrouter", name: "OpenRouter", hint: "sk-or-v1-...", frozen: false },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"api" | "storage" | "usage">("api");

  // Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [storedKeys, setStoredKeys] = useState<StoredApiKey[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // API Key form
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState("");

  // Self-hosted endpoint
  const [endpointInput, setEndpointInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [endpointValid, setEndpointValid] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === "usage" && !usage) loadUsage();
  }, [tab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [s, k] = await Promise.all([
        api.getSettings(token),
        api.listApiKeys(token),
      ]);
      setSettings(s);
      setStoredKeys(k);
      if (s.self_hosted_endpoint) setEndpointInput(s.self_hosted_endpoint);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const u = await api.getUsageSummary(token);
      setUsage(u);
    } catch (err) {
      console.error("Failed to load usage:", err);
    }
  };

  const updateSetting = async (updates: Partial<UserSettings>) => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const updated = await api.updateSettings(token, updates);
      setSettings(updated);
      setMessage({ type: "success", text: "Settings updated" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = async (provider: string) => {
    if (!newKeyValue.trim()) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.addApiKey(token, provider, newKeyValue);
      setStoredKeys(prev => [...prev.filter(k => k.provider !== provider), { provider, created_at: new Date().toISOString() }]);
      setAddingKey(null);
      setNewKeyValue("");
      setMessage({ type: "success", text: `${provider} key stored securely` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add key";
      setMessage({ type: "error", text: msg });
    }
  };

  const handleRemoveKey = async (provider: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.removeApiKey(token, provider);
      setStoredKeys(prev => prev.filter(k => k.provider !== provider));
      setMessage({ type: "success", text: `${provider} key removed` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove key";
      setMessage({ type: "error", text: msg });
    }
  };

  const handleValidateEndpoint = async () => {
    if (!endpointInput.trim()) return;
    setValidating(true);
    setEndpointValid(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await api.validateEndpoint(token, endpointInput);
      setEndpointValid(result.valid);
      if (!result.valid) {
        setMessage({ type: "error", text: result.error || "Validation failed" });
      }
    } catch {
      setEndpointValid(false);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={32} className="text-[#52504b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white backdrop- border-b border-[#e8e8e8] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 rounded text-[#52504b] hover:text-[#0a0a0a] hover:bg-white transition-all">
              <ArrowLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded bg-white  to-white flex items-center justify-center shadow-lg shadow-none">
              <GitBranch size={16} className="text-[#0a0a0a]" />
            </div>
            <span className="text-base font-bold text-[#0a0a0a]">Settings</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Message Banner */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded text-sm font-medium flex items-center gap-2 animate-fade-in ${
            message.type === "success"
              ? "bg-white/10 border border-[#e8e8e8] text-[#0a0a0a]"
              : "bg-red-500/10 border border-red-500/30 text-red-300"
          }`}>
            {message.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8">
          {[
            { id: "api" as const, label: "API Keys", icon: Key },
            { id: "storage" as const, label: "Storage", icon: Database },
            { id: "usage" as const, label: "Usage", icon: BarChart3 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded text-sm font-bold transition-all flex items-center gap-2 ${
                tab === t.id
                  ? "bg-white text-black shadow-lg"
                  : "bg-white text-[#52504b] hover:text-[#0a0a0a] hover:bg-white"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* TAB: API Keys                                                     */}
        {/* ================================================================ */}
        {tab === "api" && (
          <div className="space-y-6 animate-fade-in">
            {/* API Mode Toggle */}
            <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">API Mode</h2>
              <p className="text-sm text-[#52504b] mb-6">Choose how AI requests are billed.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Platform Key — frozen */}
                <div
                  className="p-5 rounded border-2 border-[#1a1a1a] bg-[#0e0e0e] text-left  cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Shield size={20} className="text-[#333333]" />
                    <span className="font-bold text-[#52504b]">Platform Keys</span>
                    <span className="ml-auto text-[10px] font-bold text-[#52504b] border border-[#e8e8e8] rounded px-1.5 py-0.5">SOON</span>
                  </div>
                  <p className="text-xs text-[#52504b] leading-relaxed">
                    Use our API keys. Subject to free tier limits (100 req/day).
                  </p>
                </div>

                {/* BYOK */}
                <button
                  onClick={() => updateSetting({ api_mode: "byok" })}
                  className={`p-5 rounded border-2 text-left transition-all ${
                    settings?.api_mode === "byok"
                      ? "border-[#e8e8e8] bg-white"
                      : "border-[#e8e8e8] hover:border-[#e8e8e8]"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Key size={20} className={settings?.api_mode === "byok" ? "text-[#52504b]" : "text-[#52504b]"} />
                    <span className="font-bold text-[#0a0a0a]">Your Own Keys</span>
                    {settings?.api_mode === "byok" && (
                      <span className="ml-auto badge-success text-[10px]">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-[#52504b] leading-relaxed">
                    Bring your own API keys. No rate limits. Billed directly by providers.
                  </p>
                </button>
              </div>
            </div>

            {/* Key Management */}
            <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#0a0a0a]">Stored API Keys</h2>
                  <p className="text-xs text-[#52504b] mt-1 flex items-center gap-1">
                    <Shield size={12} /> Keys are encrypted at rest and never sent to your browser
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {PROVIDERS.map(provider => {
                  const stored = storedKeys.find(k => k.provider === provider.id);
                  const isAdding = addingKey === provider.id;

                  if (provider.frozen) {
                    return (
                      <div key={provider.id} className="p-4 rounded bg-[#0e0e0e] border border-[#191919]/50  cursor-not-allowed select-none">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded bg-[#333333]" />
                            <span className="text-sm font-bold text-[#52504b]">{provider.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#52504b] border border-[#e8e8e8] rounded px-1.5 py-0.5">COMING SOON</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={provider.id} className="p-4 rounded bg-white border border-[#e8e8e8]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded ${stored ? "bg-white" : "bg-surface-600"}`} />
                          <span className="text-sm font-bold text-[#0a0a0a]">{provider.name}</span>
                          {stored && (
                            <span className="text-[10px] text-[#52504b]">
                              Added {new Date(stored.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {stored ? (
                            <button
                              onClick={() => handleRemoveKey(provider.id)}
                              className="p-2 rounded text-red-400 hover:bg-red-500/10 transition-all"
                              title="Remove key"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setAddingKey(provider.id); setNewKeyValue(""); }}
                              className="px-3 py-1.5 rounded text-xs font-bold text-[#52504b] hover:bg-white transition-all flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Key
                            </button>
                          )}
                        </div>
                      </div>

                      {isAdding && (
                        <div className="mt-3 flex gap-2 animate-fade-in">
                          <input
                            autoFocus
                            type="password"
                            value={newKeyValue}
                            onChange={e => setNewKeyValue(e.target.value)}
                            placeholder={provider.hint}
                            className="input-field flex-1 text-sm py-2"
                            onKeyDown={e => e.key === "Enter" && handleAddKey(provider.id)}
                          />
                          <button onClick={() => handleAddKey(provider.id)} className="btn-primary py-2 px-4 text-xs">
                            Save
                          </button>
                          <button onClick={() => setAddingKey(null)} className="btn-ghost py-2 px-3 text-xs">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: Storage                                                      */}
        {/* ================================================================ */}
        {tab === "storage" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">Storage Mode</h2>
              <p className="text-sm text-[#52504b] mb-6">Choose where your conversation data is stored.</p>

              <div className="space-y-4">
                {/* Local */}
                <button
                  onClick={() => updateSetting({ storage_mode: "local" })}
                  className={`w-full p-5 rounded border-2 text-left transition-all ${
                    settings?.storage_mode === "local"
                      ? "border-[#e8e8e8] bg-white"
                      : "border-[#e8e8e8] hover:border-[#e8e8e8]"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <HardDrive size={20} className={settings?.storage_mode === "local" ? "text-[#52504b]" : "text-[#52504b]"} />
                    <span className="font-bold text-[#0a0a0a]">Local Only</span>
                    <span className="badge-success text-[10px]">FREE</span>
                    {settings?.storage_mode === "local" && <span className="ml-auto badge-brand text-[10px]">ACTIVE</span>}
                  </div>
                  <p className="text-xs text-[#52504b] leading-relaxed">
                    Private, no cross-device sync. Data is stored on this server only and is not shared externally.
                  </p>
                </button>

                {/* Cloud Sync — frozen */}
                <div
                  className="w-full p-5 rounded border-2 border-[#1a1a1a] bg-[#0e0e0e] text-left  cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Cloud size={20} className="text-[#333333]" />
                    <span className="font-bold text-[#52504b]">Cloud Sync</span>
                    <span className="text-[10px] font-bold text-[#52504b] border border-[#e8e8e8] rounded px-1.5 py-0.5">SOON</span>
                  </div>
                  <p className="text-xs text-[#52504b] leading-relaxed">
                    Synced across devices. Access from anywhere securely.
                  </p>
                </div>

                {/* Self-Hosted */}
                <div
                  className={`p-5 rounded border-2 text-left transition-all ${
                    settings?.storage_mode === "self_hosted"
                      ? "border-[#e8e8e8] bg-white"
                      : "border-[#e8e8e8]"
                  }`}
                >
                  <button
                    onClick={() => {
                      if (endpointValid && endpointInput) {
                        updateSetting({ storage_mode: "self_hosted", self_hosted_endpoint: endpointInput });
                      }
                    }}
                    className="w-full text-left"
                    disabled={settings?.storage_mode !== "self_hosted" && !endpointValid}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Server size={20} className={settings?.storage_mode === "self_hosted" ? "text-[#52504b]" : "text-[#52504b]"} />
                      <span className="font-bold text-[#0a0a0a]">Self-Hosted</span>
                      <span className="text-[10px] text-[#52504b] font-mono">ADVANCED</span>
                      {settings?.storage_mode === "self_hosted" && <span className="ml-auto badge-brand text-[10px]">ACTIVE</span>}
                    </div>
                    <p className="text-xs text-[#52504b] leading-relaxed">
                      Your server, full control. Must support our sync API.
                    </p>
                  </button>

                  {/* Endpoint input */}
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-black text-[#52504b] uppercase tracking-widest">Server Endpoint</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={endpointInput}
                        onChange={e => { setEndpointInput(e.target.value); setEndpointValid(null); }}
                        placeholder="https://my-server.com/api"
                        className="input-field flex-1 text-sm py-2"
                      />
                      <button
                        onClick={handleValidateEndpoint}
                        disabled={validating || !endpointInput.trim()}
                        className="btn-secondary py-2 px-4 text-xs flex items-center gap-1"
                      >
                        {validating ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        Validate
                      </button>
                    </div>
                    {endpointValid === true && (
                      <div className="flex items-center gap-2 text-xs text-[#0a0a0a]">
                        <Check size={14} /> Endpoint is healthy and reachable
                        <button
                          onClick={() => updateSetting({ storage_mode: "self_hosted", self_hosted_endpoint: endpointInput })}
                          className="ml-auto btn-primary py-1 px-3 text-[10px]"
                        >
                          Activate
                        </button>
                      </div>
                    )}
                    {endpointValid === false && (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <X size={14} /> Validation failed — check the URL and ensure /health returns 200
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: Usage                                                        */}
        {/* ================================================================ */}
        {tab === "usage" && (
          <div className="space-y-6 animate-fade-in">
            {/* Today's Usage */}
            {usage && (
              <>
                <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#0a0a0a] mb-6">Today&apos;s Usage</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Request Meter */}
                    <div>
                      <div className="flex justify-between text-xs font-bold text-[#52504b] mb-2">
                        <span>Requests</span>
                        <span>{usage.today.requests} / {usage.today.request_limit}</span>
                      </div>
                      <div className="h-3 bg-white rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-500 ${
                            usage.today.requests / usage.today.request_limit > 0.8
                              ? "bg-white from-amber-500 to-red-500"
                              : "bg-white  to-white"
                          }`}
                          style={{ width: `${Math.min(100, (usage.today.requests / usage.today.request_limit) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Token Meter */}
                    <div>
                      <div className="flex justify-between text-xs font-bold text-[#52504b] mb-2">
                        <span>Tokens</span>
                        <span>{usage.today.tokens.toLocaleString()} / {usage.today.token_limit.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-white rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-500 ${
                            usage.today.tokens / usage.today.token_limit > 0.8
                              ? "bg-white from-amber-500 to-red-500"
                              : "bg-white from-emerald-500 to-white"
                          }`}
                          style={{ width: `${Math.min(100, (usage.today.tokens / usage.today.token_limit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {settings?.api_mode === "byok" && (
                    <p className="mt-4 text-xs text-[#0a0a0a] flex items-center gap-1">
                      <Zap size={12} /> BYOK mode — platform rate limits do not apply
                    </p>
                  )}
                </div>

                {/* By Provider */}
                <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#0a0a0a] mb-4">By Provider ({usage.period_days}d)</h2>
                  {Object.keys(usage.by_provider).length === 0 ? (
                    <p className="text-sm text-[#52504b]">No usage data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(usage.by_provider).map(([prov, data]) => (
                        <div key={prov} className="flex items-center justify-between p-3 rounded bg-white border border-[#e8e8e8]">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded bg-white" />
                            <span className="text-sm font-bold text-[#0a0a0a] capitalize">{prov}</span>
                          </div>
                          <div className="flex gap-6 text-xs text-[#52504b]">
                            <span>{data.requests} requests</span>
                            <span>{data.tokens.toLocaleString()} tokens</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#0a0a0a] mb-4">Recent Activity</h2>
                  {usage.recent.length === 0 ? (
                    <p className="text-sm text-[#52504b]">No recent activity.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#52504b] border-b border-[#e8e8e8]">
                            <th className="text-left py-2 font-black uppercase tracking-widest">Provider</th>
                            <th className="text-left py-2 font-black uppercase tracking-widest">Model</th>
                            <th className="text-left py-2 font-black uppercase tracking-widest">Type</th>
                            <th className="text-right py-2 font-black uppercase tracking-widest">Tokens</th>
                            <th className="text-right py-2 font-black uppercase tracking-widest">Source</th>
                            <th className="text-right py-2 font-black uppercase tracking-widest">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usage.recent.map(entry => (
                            <tr key={entry.id} className="border-b border-[#e8e8e8] text-[#52504b]">
                              <td className="py-2 capitalize">{entry.provider}</td>
                              <td className="py-2 font-mono text-[10px]">{entry.model}</td>
                              <td className="py-2">
                                <span className={`badge text-[9px] ${
                                  entry.request_type === "chat" ? "badge-brand" :
                                  entry.request_type === "image" ? "badge-success" : "badge-warning"
                                }`}>
                                  {entry.request_type}
                                </span>
                              </td>
                              <td className="py-2 text-right">{entry.tokens_used.toLocaleString()}</td>
                              <td className="py-2 text-right">
                                <span className={`text-[10px] font-bold ${entry.key_source === "byok" ? "text-[#0a0a0a]" : "text-[#52504b]"}`}>
                                  {entry.key_source}
                                </span>
                              </td>
                              <td className="py-2 text-right text-[#52504b]">
                                {new Date(entry.created_at).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
            {!usage && (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-[#52504b] animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
