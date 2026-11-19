import React, { useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Lock,
  History,
  FileCheck,
  Zap,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { cn } from "../lib/utils";

interface ApprovalItem {
  id: string;
  action: string;
  scope: string;
  riskLevel: "HIGH" | "CRITICAL" | "MEDIUM";
  requester: string;
  parameterDigest: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export const GovernancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"APPROVALS" | "POLICIES" | "AUDIT" | "BREAK_GLASS">("APPROVALS");

  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: "apr-9941a",
      action: "terminal.exec (clang++ -O3 -shared -fPIC server.cpp)",
      scope: "d:/arbor-working",
      riskLevel: "HIGH",
      requester: "L3 Orchestrator Worker #2",
      parameterDigest: "sha256:4b89e...990f",
      createdAt: "3 mins ago",
      status: "PENDING",
    },
    {
      id: "apr-8812b",
      action: "fs.write (config/production_secrets.json)",
      scope: "d:/arbor-working/config",
      riskLevel: "CRITICAL",
      requester: "Level 2 Copilot Agent",
      parameterDigest: "sha256:7c12f...bb10",
      createdAt: "1 hour ago",
      status: "APPROVED",
    },
  ]);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "APPROVED" } : a))
    );
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "REJECTED" } : a))
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-app-text" />
              Governance & Cryptographic Approvals
            </h1>
            <FeatureUnavailableBadge status="SEALED" label="CAS Token Engine" />
          </div>
          <p className="text-xs text-app-muted">
            Cryptographic Content-Addressed Signature (CAS) approval inbox, dual-custody break-glass, and audit logs.
          </p>
        </div>

        <button
          onClick={() => setActiveTab("BREAK_GLASS")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Emergency Break-Glass
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-app-border text-xs">
        {[
          { id: "APPROVALS", label: "Approval Inbox" },
          { id: "POLICIES", label: "Constitutional Policies" },
          { id: "AUDIT", label: "Cryptographic Audit Chain" },
          { id: "BREAK_GLASS", label: "Dual-Custody Controls" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      {/* Approvals Inbox */}
      {activeTab === "APPROVALS" && (
        <div className="space-y-3">
          {approvals.map((app) => (
            <div
              key={app.id}
              className="p-5 bg-app-card border border-app-border rounded-xl shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-app-muted">{app.id}</span>
                  <span className="text-app-muted">·</span>
                  <span className="text-xs font-semibold text-app-text truncate">{app.action}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <FeatureUnavailableBadge
                    status={app.status === "APPROVED" ? "LIVE" : app.status === "PENDING" ? "DEGRADED" : "UNAVAILABLE"}
                    label={app.status}
                  />
                  <span className="text-[10px] font-mono border border-app-border px-1.5 py-0.5 rounded text-app-muted">
                    {app.riskLevel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-app-muted bg-app-secondary p-3 rounded-lg border border-app-subtle">
                <div>Scope: {app.scope}</div>
                <div>Requester: {app.requester}</div>
                <div className="sm:col-span-2 truncate">Digest: {app.parameterDigest}</div>
              </div>

              {app.status === "PENDING" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-subtle">
                  <button
                    onClick={() => handleReject(app.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-dim hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(app.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sign & Issue CAS Token
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Policies */}
      {activeTab === "POLICIES" && (
        <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm space-y-3">
          <span className="text-xs font-semibold text-app-text block mb-2">Constitutional Principles</span>
          {[
            { id: "C-01", name: "Axiomatic Alignment Preservation", status: "STABLE", desc: "No autonomous worker may bypass CAS tokens for high-risk operations." },
            { id: "C-02", name: "Information Topology & Tenant Isolation", status: "STABLE", desc: "Strict database RLS and filesystem path-jailing across all 20 tenants." },
            { id: "C-03", name: "Recursive Autonomy Bounds", status: "ENFORCED", desc: "Maximum 10 iteration depth per autonomous agent loop before checkpointing." },
          ].map((pol) => (
            <div key={pol.id} className="p-3 bg-app-secondary border border-app-border rounded-lg space-y-1">
              <div className="flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-app-text">{pol.id}: {pol.name}</span>
                <FeatureUnavailableBadge status="LIVE" label={pol.status} />
              </div>
              <p className="text-xs text-app-muted">{pol.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Audit & Break Glass */}
      {(activeTab === "AUDIT" || activeTab === "BREAK_GLASS") && (
        <div className="p-8 text-center bg-app-card border border-app-border rounded-xl space-y-3">
          <Shield className="w-8 h-8 text-app-muted mx-auto" />
          <h3 className="text-sm font-semibold text-app-text">
            {activeTab === "AUDIT" ? "Tamper-Evident SHA-256 Audit Chain" : "Dual-Custody Break-Glass Protocol"}
          </h3>
          <p className="text-xs text-app-muted max-w-md mx-auto">
            Governed by ARBOR_LEVEL2_M1_PHASE6_HUMAN_APPROVAL_CAS_SPECIFICATION.md §4 under immutable seal.
          </p>
          <FeatureUnavailableBadge status="SEALED" label="Compliant with AMEND-GOV-P7-003" />
        </div>
      )}
    </div>
  );
};
