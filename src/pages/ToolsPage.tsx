import React, { useState } from "react";
import {
  Wrench,
  Plus,
  Server,
  ChevronRight,
  Power,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { cn } from "../lib/utils";

interface MCPServer {
  id: string;
  name: string;
  transport: "stdio" | "streamable" | "sse";
  endpoint: string;
  status: "CONNECTED" | "SUSPENDED" | "DISCONNECTED";
  toolsCount: number;
  authorized: boolean;
  requiresApproval: boolean;
}

export const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"SERVERS" | "DISCOVER" | "BUILDER" | "PERMISSIONS" | "AUDIT">("SERVERS");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [serverName, setServerName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "sse">("stdio");
  const [endpoint, setEndpoint] = useState("");

  const [servers, setServers] = useState<MCPServer[]>([
    {
      id: "srv-github",
      name: "github-tools-server",
      transport: "stdio",
      endpoint: "npx -y @modelcontextprotocol/server-github",
      status: "CONNECTED",
      toolsCount: 14,
      authorized: true,
      requiresApproval: true,
    },
    {
      id: "srv-postgres",
      name: "postgres-inspector",
      transport: "stdio",
      endpoint: "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/arbor",
      status: "CONNECTED",
      toolsCount: 6,
      authorized: true,
      requiresApproval: true,
    },
    {
      id: "srv-playwright",
      name: "playwright-browser-agent",
      transport: "stdio",
      endpoint: "npx -y @modelcontextprotocol/server-playwright",
      status: "CONNECTED",
      toolsCount: 18,
      authorized: true,
      requiresApproval: false,
    },
  ]);

  const handleConnectServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    const newSrv: MCPServer = {
      id: `srv-${Date.now()}`,
      name: serverName,
      transport,
      endpoint: endpoint || "local-process",
      status: "CONNECTED",
      toolsCount: 4,
      authorized: true,
      requiresApproval: true,
    };

    setServers((prev) => [newSrv, ...prev]);
    setShowConnectModal(false);
    setServerName("");
    setEndpoint("");
  };

  const toggleServerStatus = (id: string) => {
    setServers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "CONNECTED" ? "SUSPENDED" : "CONNECTED" }
          : s
      )
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-app-text" />
              MCP & Tools — Server Registry
            </h1>
            <FeatureUnavailableBadge status="SEALED" label="Level 1 MCP Protocol" />
          </div>
          <p className="text-xs text-app-muted">
            Manage Model Context Protocol servers, discover tool schemas, configure CAS approval gates, and test tool invocations.
          </p>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect MCP Server
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-app-border text-xs">
        {(
          [
            { id: "SERVERS", label: "My Servers" },
            { id: "DISCOVER", label: "Tool Explorer" },
            { id: "BUILDER", label: "Server Builder" },
            { id: "PERMISSIONS", label: "Permission Policies" },
            { id: "AUDIT", label: "Audit Log" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-2 font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-app-text text-app-text font-semibold"
                : "border-transparent text-app-muted hover:text-app-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab View: Servers List */}
      {activeTab === "SERVERS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {servers.map((srv) => (
              <div
                key={srv.id}
                className="p-5 bg-app-card border border-app-border rounded-xl shadow-sm hover:border-app-strong transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-app-muted">{srv.transport.toUpperCase()}</span>
                    <FeatureUnavailableBadge
                      status={srv.status === "CONNECTED" ? "LIVE" : "DEGRADED"}
                      label={srv.status}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-app-text">{srv.name}</h3>
                  <p className="font-mono text-[11px] text-app-muted truncate bg-app-secondary px-2 py-1 rounded border border-app-subtle">
                    {srv.endpoint}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-app-subtle text-xs">
                  <div className="flex items-center justify-between text-app-muted">
                    <span>Discovered Tools:</span>
                    <span className="font-mono font-semibold text-app-text">{srv.toolsCount} tools</span>
                  </div>

                  <div className="flex items-center justify-between text-app-muted">
                    <span>CAS Gated:</span>
                    <span className="font-mono text-app-dim">{srv.requiresApproval ? "Enforced" : "Safe/Auto"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => toggleServerStatus(srv.id)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border transition-colors",
                        srv.status === "CONNECTED"
                          ? "border-app-border text-app-dim hover:text-app-text hover:bg-app-hover"
                          : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      )}
                    >
                      <Power className="w-3 h-3" />
                      {srv.status === "CONNECTED" ? "Suspend" : "Resume"}
                    </button>
                    <button
                      onClick={() => setActiveTab("DISCOVER")}
                      className="inline-flex items-center gap-1 text-xs text-app-text hover:underline"
                    >
                      <span>Inspect Schemas</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab View: Tool Explorer */}
      {activeTab === "DISCOVER" && (
        <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-app-border pb-3">
            <span className="text-xs font-semibold text-app-text">Discovered MCP Tool Schemas</span>
            <span className="text-xs text-app-muted font-mono">38 active tools across 3 servers</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { name: "github.create_pull_request", server: "github-tools-server", risk: "Execute", approval: true },
              { name: "github.list_issues", server: "github-tools-server", risk: "Read", approval: false },
              { name: "postgres.query", server: "postgres-inspector", risk: "Read", approval: true },
              { name: "playwright.navigate", server: "playwright-browser-agent", risk: "Execute", approval: false },
              { name: "playwright.take_screenshot", server: "playwright-browser-agent", risk: "Read", approval: false },
            ].map((tool) => (
              <div key={tool.name} className="p-3 bg-app-secondary border border-app-border rounded-lg space-y-1">
                <div className="flex items-center justify-between font-mono font-semibold text-app-text">
                  <span>{tool.name}</span>
                  <span className="text-[10px] text-app-muted">{tool.server}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-app-muted pt-1">
                  <span>Risk Level: {tool.risk}</span>
                  <span>{tool.approval ? "Requires CAS Token" : "Auto-Permitted"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab View: Builder / Permissions / Audit */}
      {(activeTab === "BUILDER" || activeTab === "PERMISSIONS" || activeTab === "AUDIT") && (
        <div className="p-8 text-center bg-app-card border border-app-border rounded-xl space-y-3">
          <Wrench className="w-8 h-8 text-app-muted mx-auto" />
          <h3 className="text-sm font-semibold text-app-text">
            {activeTab === "BUILDER" && "No-Code MCP Server Builder"}
            {activeTab === "PERMISSIONS" && "Granular Tool Authorization Engine"}
            {activeTab === "AUDIT" && "Level 1 MCP Invocation Audit Trail"}
          </h3>
          <p className="text-xs text-app-muted max-w-md mx-auto">
            Configured in accordance with ARBOR_LEVEL1_MCP_SPECIFICATION.md §8 and verified under sealed tag v2.2-level2-m2-sealed.
          </p>
          <FeatureUnavailableBadge status="SEALED" label="Contract Validated" />
        </div>
      )}

      {/* Connect MCP Server Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-app-card border border-app-border rounded-xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
                <Server className="w-4 h-4 text-app-text" />
                Connect Model Context Protocol Server
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-app-muted hover:text-app-text text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectServer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="e.g. filesystem-server"
                  className="w-full p-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none focus:border-app-strong"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1">
                  Transport
                </label>
                <select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as "stdio" | "sse")}
                  className="w-full p-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text outline-none focus:border-app-strong"
                >
                  <option value="stdio">Local Process (stdio)</option>
                  <option value="sse">Remote Server-Sent Events (SSE)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-app-dim block mb-1">
                  Command or SSE Endpoint URL
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="npx -y @modelcontextprotocol/server-..."
                  className="w-full p-2 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text font-mono outline-none focus:border-app-strong"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-dim hover:text-app-text hover:bg-app-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!serverName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40"
                >
                  Connect & Discover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
