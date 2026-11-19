import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Code,
  GitBranch,
  Zap,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Split,
  FolderTree,
  Box,
  Brain,
  ShieldAlert,
  Target,
  ExternalLink,
  Package
} from "lucide-react";

import { AgentStatusWidget } from "../components/AgentStatusWidget";
import { TerminalPanel } from "../components/TerminalPanel";
import { CodeEditorPanel } from "../components/CodeEditorPanel";
import { PlanViewer } from "../components/PlanViewer";
import { EngineeringPanel } from "../components/EngineeringPanel";
import { AdaptiveIntelligencePanel } from "../components/AdaptiveIntelligencePanel";
import { PermissionApprovalModal, type PermissionRequest } from "../components/PermissionApprovalModal";
import { CreateMissionModal } from "../components/chat/CreateMissionModal";

import { WorkspaceFileTree } from "../components/workspaces/WorkspaceFileTree";
import { GitChangesPanel } from "../components/workspaces/GitChangesPanel";
import { TranspilerWorkbench } from "../components/workspaces/TranspilerWorkbench";
import { ArtifactsPanel, type WorkspaceArtifact } from "../components/workspaces/ArtifactsPanel";

import { apiClient } from "../services/api";
import type { WorkspaceResponse } from "../types";
import { getBranchExecutions, getAgentStatus } from "../services/agentApi";
import { orchestrateTask, type ExecutionPlanData } from "../services/orchestratorApi";
import {
  getAuthoritativeWorkspaceId,
  setAuthoritativeWorkspaceId,
  subscribeToWorkspaceChanges,
  assertWorkspaceMatch
} from "../services/workspaceContext";
import type { ExecutionRecord, AgentStatus } from "../types/agent";

export const WorkspaceIDE: React.FC = () => {
  const { id: workspaceIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return workspaceIdParam || getAuthoritativeWorkspaceId();
  });

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<{ status: number; message: string } | null>(null);
  const [workspaceViolation, setWorkspaceViolation] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string>("main-branch");
  const [selectedFile, setSelectedFile] = useState<string | null>("server.py");
  const [rightTab, setRightTab] = useState<"chat" | "transpiler" | "git" | "artifacts" | "cad" | "plan">("chat");

  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [activePlan, setActivePlan] = useState<ExecutionPlanData | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAgentStatus(activeWorkspaceId)
      .then((st) => {
        if (isMounted) setAgentStatus(st);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeWorkspaceId]);

  const isReadOnly = Boolean(
    agentStatus?.read_only ||
    !agentStatus?.connected ||
    (agentStatus?.capabilities &&
      !agentStatus.capabilities.includes("fs.write") &&
      !agentStatus.capabilities.includes("terminal.exec"))
  );
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([
    {
      id: "art-initial-cpp",
      name: "server.cpp",
      artifact_type: "cpp_source",
      workspace_id: activeWorkspaceId,
      created_at: new Date().toLocaleTimeString(),
      content: `// Transpiled Arbor C++ Artifact
#include <iostream>
#include <cstdint>

int64_t calculate_fibonacci(int64_t n) {
    if (n <= 1) return n;
    int64_t a = 0, b = 1;
    for (int64_t i = 2; i <= n; ++i) {
        int64_t c = a + b;
        a = b;
        b = c;
    }
    return b;
}
`,
    },
  ]);

  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);

  // Copilot Chat state
  const [messages, setMessages] = useState<Array<{ role: string; content: string; type?: string }>>([
    {
      role: "assistant",
      content:
        "👋 Welcome to the **Arbor Workspaces & Code Workbench**.\nBacked by multi-model routing, sandboxed local node execution, and the authoritative Python-to-C++ Transpiler.",
      type: "message",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Authoritative backend workspace validation and metadata synchronization
  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      const targetParam = workspaceIdParam || getAuthoritativeWorkspaceId();
      if (!targetParam) {
        if (isMounted) {
          navigate("/workspaces", { replace: true });
        }
        return;
      }

      setLoadingWorkspace(true);
      setWorkspaceError(null);

      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetParam);
        let resolved: WorkspaceResponse | null = null;

        if (isUUID) {
          resolved = await apiClient.getWorkspace(undefined, targetParam);
        } else {
          // Resolve slug to authoritative UUID via authenticated list
          const authorized = await apiClient.listWorkspaces();
          const match = authorized.find((w: WorkspaceResponse) => w.slug === targetParam || w.id === targetParam);
          if (match) {
            resolved = match;
          } else {
            throw new Error(`API Error (404): Workspace '${targetParam}' not found.`);
          }
        }

        if (!isMounted) return;

        if (resolved) {
          setWorkspace(resolved);
          setActiveWorkspaceId(resolved.id);
          setAuthoritativeWorkspaceId(resolved.id);
          setWorkspaceViolation(null);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("403") || msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("not a member")) {
          setWorkspaceError({
            status: 403,
            message: `Forbidden: You are not an authorized member of workspace '${targetParam}'.`,
          });
        } else if (msg.includes("404") || msg.includes("422") || msg.toLowerCase().includes("not found")) {
          setWorkspaceError({
            status: 404,
            message: `Workspace '${targetParam}' not found or does not exist.`,
          });
        } else {
          setWorkspaceError({
            status: 500,
            message: `Failed to load workspace: ${msg}`,
          });
        }
      } finally {
        if (isMounted) {
          setLoadingWorkspace(false);
        }
      }
    }

    loadWorkspace();

    const unsubscribe = subscribeToWorkspaceChanges((newWs) => {
      if (newWs && newWs !== activeWorkspaceId) {
        setActiveWorkspaceId(newWs);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [workspaceIdParam, navigate]);

  // Invalidate file selection and execution plan on workspace switch
  useEffect(() => {
    setSelectedFile(null);
    setActivePlan(null);
  }, [activeWorkspaceId]);

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await getBranchExecutions(activeBranchId);
      setExecutions(res.executions);
    } catch {
      // Ignored in offline dev
    }
  }, [activeBranchId]);

  useEffect(() => {
    fetchExecutions();
    const interval = setInterval(fetchExecutions, 8000);
    return () => clearInterval(interval);
  }, [fetchExecutions]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isOrchestrating) return;

    const userPrompt = chatInput.trim();
    setChatInput("");
    setIsOrchestrating(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userPrompt },
      {
        role: "assistant",
        content: `⚡ **Dispatching task to authoritative orchestrator**...`,
      },
    ]);

    try {
      const response = await orchestrateTask({
        workspace_id: activeWorkspaceId,
        branch_id: activeBranchId,
        message: userPrompt,
        mode: "auto",
      });

      if (response.plan) {
        setActivePlan(response.plan);
        if (response.plan.steps.length > 1) {
          setRightTab("plan");
        }
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: response.output,
          type: response.plan ? "agent_plan" : "message",
        },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: `⚠️ Orchestration error: ${errMsg || "Failed to process request."}`,
        },
      ]);
    } finally {
      setIsOrchestrating(false);
      fetchExecutions();
    }
  };

  const handleArtifactSaved = (filePath: string) => {
    const newArt: WorkspaceArtifact = {
      id: `art-${Date.now()}`,
      name: filePath,
      artifact_type: filePath.endsWith(".cpp") ? "cpp_source" : "file",
      workspace_id: activeWorkspaceId,
      created_at: new Date().toLocaleTimeString(),
    };
    setArtifacts((prev) => [newArt, ...prev]);
  };

  // Loading state
  if (loadingWorkspace) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-app-card border border-app-border rounded-xl shadow-lg space-y-4 text-center">
          <div className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-bold tracking-tight text-app-text">Verifying Authoritative Workspace</h2>
          <p className="text-xs text-app-muted font-mono truncate">
            {workspaceIdParam || activeWorkspaceId}
          </p>
        </div>
      </div>
    );
  }

  // Error boundary state (403 or 404)
  if (workspaceError) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-app-card border border-rose-500/30 rounded-xl shadow-lg space-y-4 text-center">
          {workspaceError.status === 403 ? (
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          ) : (
            <FolderTree className="w-12 h-12 text-app-muted mx-auto" />
          )}
          <h2 className="text-base font-bold tracking-tight text-app-text">
            {workspaceError.status === 403 ? "Security Boundary Violation (403)" : "Workspace Not Found (404)"}
          </h2>
          <p className="text-xs text-app-muted leading-relaxed font-mono">
            {workspaceError.message}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/workspaces")}
              className="px-4 py-2 bg-app-accent text-app-inverted text-xs font-semibold rounded-lg hover:opacity-90 transition"
            >
              Return to Authorized Workspaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback violation guard
  if (workspaceViolation) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-app-card border border-app-border rounded-xl shadow-lg space-y-4 text-center">
          <ShieldAlert className="w-12 h-12 text-app-text mx-auto" />
          <h2 className="text-base font-bold tracking-tight">Security Boundary Violation (403)</h2>
          <p className="text-xs text-app-muted leading-relaxed font-mono">
            {workspaceViolation}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/workspaces")}
              className="px-4 py-2 bg-app-accent text-app-inverted text-xs font-semibold rounded-lg hover:opacity-90 transition"
            >
              Return to Authorized Workspaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-app-bg text-app-text overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-app-card border-b border-app-border shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-app-accent flex items-center justify-center font-bold text-app-inverted text-xs">
              A
            </div>
            <span className="font-bold text-xs tracking-wider">ARBOR WORKBENCH</span>
          </div>
          <span className="text-app-dim">/</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-medium text-app-text bg-app-secondary px-2 py-0.5 rounded border border-app-border">
              {activeWorkspaceId}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-secondary text-app-dim border border-app-subtle">
              JAILED
            </span>
          </div>
          <span className="text-app-dim">/</span>
          <div className="flex items-center gap-1 text-xs text-app-muted font-mono">
            <GitBranch className="w-3.5 h-3.5 text-app-dim" />
            <span>{activeBranchId}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMissionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-app-accent text-app-inverted rounded-lg text-xs font-semibold shadow-xs hover:opacity-90 transition"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Promote to Mission</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column IDE Workspace Grid */}
      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden min-h-0">
        {/* Left Column: Explorer, Branches & Node Daemon Widget (Col span 3) */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden min-h-0">
          <AgentStatusWidget workspaceId={activeWorkspaceId} onStatusLoaded={setAgentStatus} />

          <WorkspaceFileTree
            workspaceId={activeWorkspaceId}
            branchId={activeBranchId}
            selectedFile={selectedFile}
            onSelectFile={(f) => setSelectedFile(f)}
            className="flex-1 min-h-0"
          />
        </div>

        {/* Center Column: Code Editor & Sandboxed Terminal (Col span 5) */}
        <div className="col-span-5 flex flex-col gap-2 overflow-hidden min-h-0">
          <CodeEditorPanel
            workspaceId={activeWorkspaceId}
            branchId={activeBranchId}
            currentFile={selectedFile}
            className="flex-1 min-h-0"
            onFileSaved={(f) => handleArtifactSaved(f)}
            readOnly={isReadOnly}
          />
          <TerminalPanel
            workspaceId={activeWorkspaceId}
            branchId={activeBranchId}
            className="h-64 shrink-0"
            onRequireApproval={(req) => {
              setPermissionRequest(req);
              setApprovalModalOpen(true);
            }}
            readOnly={isReadOnly}
          />
        </div>

        {/* Right Column: Multi-Tab Workbench (Col span 4) */}
        <div className="col-span-4 flex flex-col bg-app-card border border-app-border rounded-xl overflow-hidden min-h-0 shadow-sm">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 px-2 pt-2 bg-app-bg border-b border-app-border select-none overflow-x-auto">
            <button
              onClick={() => setRightTab("chat")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
                rightTab === "chat"
                  ? "bg-app-card text-app-text border-app-border shadow-xs"
                  : "text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-app-muted" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setRightTab("transpiler")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
                rightTab === "transpiler"
                  ? "bg-app-card text-app-text border-app-border shadow-xs"
                  : "text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-app-muted" />
              <span>Transpiler</span>
            </button>
            <button
              onClick={() => setRightTab("git")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
                rightTab === "git"
                  ? "bg-app-card text-app-text border-app-border shadow-xs"
                  : "text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-app-muted" />
              <span>Git</span>
            </button>
            <button
              onClick={() => setRightTab("artifacts")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
                rightTab === "artifacts"
                  ? "bg-app-card text-app-text border-app-border shadow-xs"
                  : "text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <Package className="w-3.5 h-3.5 text-app-muted" />
              <span>Artifacts</span>
            </button>
            <button
              onClick={() => setRightTab("cad")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
                rightTab === "cad"
                  ? "bg-app-card text-app-text border-app-border shadow-xs"
                  : "text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <Box className="w-3.5 h-3.5 text-app-muted" />
              <span>CAD / Sim</span>
            </button>
            <button
              onClick={() => setRightTab("plan")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
                rightTab === "plan"
                  ? "bg-app-card text-app-text border-app-border shadow-xs"
                  : "text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-app-muted" />
              <span>Plan</span>
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {rightTab === "chat" ? (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Messages */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs leading-relaxed">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        msg.role === "user"
                          ? "bg-app-secondary border-app-border text-app-text ml-4"
                          : "bg-app-card border-app-border text-app-text mr-2"
                      }`}
                    >
                      <div className="font-semibold text-[11px] mb-1 text-app-muted flex items-center justify-between">
                        <span>{msg.role === "user" ? "You" : "Arbor Copilot"}</span>
                        {msg.type && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-app-secondary text-app-dim font-mono border border-app-subtle">
                            {msg.type}
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendChat}
                  className="p-2 bg-app-card border-t border-app-border flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Copilot to analyze, transpile, plan, or execute..."
                    disabled={isOrchestrating}
                    className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text placeholder-app-dim focus:outline-none focus:border-app-strong font-sans disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isOrchestrating}
                    className="p-2 bg-app-accent hover:opacity-90 disabled:opacity-40 text-app-inverted rounded-lg transition"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : rightTab === "transpiler" ? (
              <TranspilerWorkbench
                workspaceId={activeWorkspaceId}
                branchId={activeBranchId}
                currentFilePath={selectedFile || "server.py"}
                className="flex-1 border-0 rounded-none"
                onSavedToWorkspace={(f) => handleArtifactSaved(f)}
                readOnly={isReadOnly}
              />
            ) : rightTab === "git" ? (
              <GitChangesPanel
                workspaceId={activeWorkspaceId}
                branchId={activeBranchId}
                className="flex-1 border-0 rounded-none"
                readOnly={isReadOnly}
              />
            ) : rightTab === "artifacts" ? (
              <ArtifactsPanel
                workspaceId={activeWorkspaceId}
                artifacts={artifacts}
                className="flex-1 border-0 rounded-none"
              />
            ) : rightTab === "cad" ? (
              <div className="flex-1 overflow-auto p-2">
                <EngineeringPanel workspaceId={activeWorkspaceId} branchId={activeBranchId} />
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-2">
                <PlanViewer plan={activePlan} artifacts={artifacts.map((a) => ({ name: a.name, artifact_type: a.artifact_type }))} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permission Approval Security Modal (CAS Gating) */}
      <PermissionApprovalModal
        isOpen={approvalModalOpen}
        request={permissionRequest}
        onApproveOnce={() => setApprovalModalOpen(false)}
        onApproveSession={() => setApprovalModalOpen(false)}
        onDeny={() => setApprovalModalOpen(false)}
      />

      {/* Autonomous Mission Promotion Modal */}
      <CreateMissionModal
        isOpen={missionModalOpen}
        onClose={() => setMissionModalOpen(false)}
        workspaceId={activeWorkspaceId}
        branchId={activeBranchId}
        initialObjective={
          selectedFile
            ? `Investigate, verify, and transpile '${selectedFile}' in workspace ${activeWorkspaceId}`
            : `Audit and execute autonomous tasks in workspace ${activeWorkspaceId}`
        }
        availableModels={[
          {
            id: "gemini-2.5-pro",
            name: "Gemini 2.5 Pro",
            provider: "google",
            capabilities: ["code", "reasoning"],
          },
          {
            id: "claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            provider: "anthropic",
            capabilities: ["code", "analysis"],
          },
        ]}
        onMissionCreated={(res) => {
          setMissionModalOpen(false);
          navigate(`/missions?missionId=${res.plan?.plan_id || ""}`);
        }}
      />
    </div>
  );
};
