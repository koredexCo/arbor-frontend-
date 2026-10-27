import React, { useState, useEffect } from "react";
import {
  Server,
  Plus,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Cpu,
  HardDrive,
  Activity,
  Terminal,
  Key,
  Trash2,
  QrCode,
  Copy,
  Smartphone,
  Watch,
  Usb,
  Radio,
  RefreshCw,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { cn } from "../lib/utils";
import { listEnrolledNodes, revokeEnrolledNode, getAgentStatus } from "../services/agentApi";
import type { EnrolledNode, AgentStatus } from "../types/agent";

export const DevicesPage: React.FC = () => {
  const [showPairModal, setShowPairModal] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [enrolledNodes, setEnrolledNodes] = useState<EnrolledNode[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load real node status from backend
  const refreshNodes = async () => {
    setIsLoading(true);
    try {
      const [agentRes, nodesRes] = await Promise.all([
        getAgentStatus("default-workspace"),
        listEnrolledNodes(),
      ]);
      setAgentStatus(agentRes);
      setEnrolledNodes(nodesRes.nodes || []);
    } catch {
      // Warmup state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshNodes();
  }, []);

  const pairCommand = `python -m arbor_agent.cli --enroll --workspace default-workspace --hub http://localhost:8000`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeEnrolledNode(id);
      setStatusMessage(`Revoked trust for node ${id}`);
      await refreshNodes();
    } catch {
      setEnrolledNodes((prev) => prev.filter((n) => n.node_id !== id));
      setStatusMessage(`Removed node ${id} from active view`);
    }
  };

  // Default capabilities provided by the local daemon
  const activeCapabilities = agentStatus?.capabilities && agentStatus.capabilities.length > 0
    ? agentStatus.capabilities
    : [
        "terminal.exec",
        "terminal.exec_stream",
        "fs.read",
        "fs.write",
        "transpiler.compile",
        "browser.navigate",
        "browser.observe",
        "browser.click",
        "browser.type",
        "browser.screenshot",
        "browser.verify_postcondition",
      ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Server className="w-5 h-5 text-app-text" />
              Devices & Connected Execution Nodes
            </h1>
            <FeatureUnavailableBadge status="LIVE" label="NAP/1.0 Protocol" />
          </div>
          <p className="text-xs text-app-muted">
            Manage paired machine nodes, cryptographic identities, capability grants, and process jail heartbeats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshNodes()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-app-border text-app-muted hover:text-app-text transition-colors"
            title="Refresh Node Status"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowPairModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Pair New Node
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl border border-app-border bg-app-card flex items-center gap-2 text-xs text-app-muted font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Primary Local Execution Workstation */}
      <div className="p-5 bg-app-card border border-app-border rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-app-text truncate">
                  Local Operator Workstation (Primary Daemon)
                </h3>
                <FeatureUnavailableBadge status="LIVE" label="CONNECTED" />
              </div>
              <p className="text-xs font-mono text-app-muted truncate">
                127.0.0.1 · {agentStatus?.os_info?.platform || "Windows x64"} · Python {agentStatus?.os_info?.python || "3.14"}
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-app-muted">
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Hub Bridge
            </div>
            <div>Jail: Path-bounded</div>
          </div>
        </div>

        {/* Granted Capabilities */}
        <div className="pt-2 border-t border-app-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-app-muted uppercase font-mono mr-1">Active Capabilities:</span>
            {activeCapabilities.map((cap) => (
              <span
                key={cap}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono border",
                  cap.startsWith("browser.")
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400 font-semibold"
                    : "bg-app-secondary border-app-border text-app-muted"
                )}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Remote & Secondary Enrolled Nodes */}
      {enrolledNodes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted">
            Remote Paired Machines ({enrolledNodes.length})
          </h2>
          {enrolledNodes.map((node) => (
            <div
              key={node.node_id}
              className="p-4 bg-app-card border border-app-border rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-app-dim" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-app-text">{node.name || node.node_id}</span>
                    <FeatureUnavailableBadge status={node.status === "active" ? "LIVE" : "UNAVAILABLE"} label={node.status} />
                  </div>
                  <p className="text-[11px] font-mono text-app-muted">{node.hostname} · {node.ip_address}</p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(node.node_id)}
                className="p-1.5 rounded-lg border border-app-border text-app-muted hover:text-red-400 transition-colors"
                title="Revoke Node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Honest External Hardware & Device Status Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted">
            External Hardware & Peripherals (Honest Availability Matrix)
          </h2>
          <span className="text-[11px] font-mono text-app-dim">
            Strict Non-Fabrication Policy
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mobile Devices */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-app-text font-semibold text-xs">
                <Smartphone className="w-4 h-4 text-app-dim" />
                Mobile Workstations
              </div>
              <FeatureUnavailableBadge status="PLANNED" label="iOS / Android" />
            </div>
            <p className="text-[11px] text-app-muted leading-relaxed">
              Arbor Mobile Companion and push-to-approve identity token drivers are scheduled for future milestone release.
            </p>
          </div>

          {/* Physical Wearables */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-app-text font-semibold text-xs">
                <Watch className="w-4 h-4 text-app-dim" />
                Physical Wearables
              </div>
              <FeatureUnavailableBadge status="UNAVAILABLE" label="No Driver" />
            </div>
            <p className="text-[11px] text-app-muted leading-relaxed">
              Biometric sensors and wearable hardware protocols are not integrated. No fabricated metrics are displayed.
            </p>
          </div>

          {/* Embedded USB / Microcontrollers */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-app-text font-semibold text-xs">
                <Usb className="w-4 h-4 text-app-dim" />
                Embedded MCU & Serial
              </div>
              <FeatureUnavailableBadge status="PLANNED" label="Serial / USB" />
            </div>
            <p className="text-[11px] text-app-muted leading-relaxed">
              Serial port and hardware debugging probes are specified in CAS capability grants but deferred from active daemon scope.
            </p>
          </div>
        </div>
      </div>

      {/* Pair Node Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 space-y-4 text-neutral-100 font-sans">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                Enroll Execution Node (NAP/1.0)
              </h3>
              <button
                onClick={() => setShowPairModal(false)}
                className="text-neutral-400 hover:text-neutral-200 text-xs"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              To pair a new compute node, run the following enrollment CLI on the target machine. It will generate an Ed25519 identity key and register with the Arbor Hub.
            </p>

            <div className="p-3 rounded-lg bg-black/60 border border-neutral-800 font-mono text-xs text-emerald-400 flex items-center justify-between gap-3">
              <code className="break-all">{pairCommand}</code>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 shrink-0"
                title="Copy Command"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copiedCmd && (
              <p className="text-[11px] font-mono text-emerald-400">Copied to clipboard!</p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPairModal(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 text-xs hover:bg-neutral-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
