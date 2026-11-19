import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  GitBranch,
  Target,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  Copy,
  Check,
  RotateCcw,
  Square,
  AlertCircle,
  GitCompare,
  Trash2,
  Cpu,
  Clock,
  Shield,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useConversation } from "../hooks/useConversation";
import { useBranch } from "../hooks/useBranch";
import { useCognitiveGraph } from "../hooks/useCognitiveGraph";
import { useModels } from "../hooks/useModels";
import { useAuth } from "../hooks/useAuth";
import { sendMessageStream, api, getAccessToken } from "../services/api";
import { getAgentStatus } from "../services/agentApi";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { ErrorState } from "../components/common/ErrorState";
import { OfflineBanner } from "../components/common/OfflineBanner";
import { NewBranchModal } from "../components/chat/NewBranchModal";
import { BranchCompareModal } from "../components/chat/BranchCompareModal";
import { CreateMissionModal } from "../components/chat/CreateMissionModal";
import { ContextPanel } from "../components/chat/ContextPanel";
import type { AgentStatus } from "../types/agent";
import type { Message, Model } from "../types";
import { cn } from "../lib/utils";

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    loading: convLoading,
    error: convError,
    fetchConversations,
    createConversation,
    deleteConversation,
  } = useConversation();

  const {
    branches,
    activeBranch,
    activeBranchId,
    loading: branchLoading,
    fetchBranches,
    createBranch,
    updateBranch,
    switchBranch,
    setActiveBranchId,
  } = useBranch();

  const {
    graph,
    messages,
    inheritedNodeIds,
    forkOriginId,
    loading: graphLoading,
    error: graphError,
    fetchGraph,
  } = useCognitiveGraph();

  const { models, loading: modelsLoading } = useModels();

  // Local State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals & Panels State
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [newBranchModalOpen, setNewBranchModalOpen] = useState(false);
  const [selectedBranchNodeId, setSelectedBranchNodeId] = useState<string | null>(null);
  const [selectedBranchNodePreview, setSelectedBranchNodePreview] = useState<string>("");
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [createMissionModalOpen, setCreateMissionModalOpen] = useState(false);
  const [missionInitialObjective, setMissionInitialObjective] = useState("");
  const [missionOriginMessageId, setMissionOriginMessageId] = useState<string | undefined>();
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  // Streaming Abort Controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Fetch conversations
  useEffect(() => {
    fetchConversations();
    getAgentStatus("default-workspace").then(setAgentStatus).catch(() => {});
  }, [fetchConversations]);

  // 2. Select initial conversation if available
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // 3. When activeConversationId changes, load branches
  useEffect(() => {
    if (activeConversationId) {
      fetchBranches(activeConversationId).then((loadedBranches) => {
        if (loadedBranches && loadedBranches.length > 0) {
          setActiveBranchId(loadedBranches[0].id);
        }
      });
    }
  }, [activeConversationId, fetchBranches, setActiveBranchId]);

  // 4. When activeBranchId changes, load the authoritative graph
  useEffect(() => {
    if (activeBranchId) {
      fetchGraph(activeBranchId);
    }
  }, [activeBranchId, fetchGraph]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, isStreaming]);

  // Filter conversations by search term
  const filteredConversations = conversations.filter((c) =>
    (c.title || "Untitled Conversation").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create a brand new conversation
  const handleStartNewConversation = async () => {
    try {
      const defaultModel = models[0]?.id || "gemini-flash";
      const newConv = await createConversation("New Exploration", null, null, defaultModel);
      setActiveConversationId(newConv.id);
      if (newConv.active_branch_id) {
        setActiveBranchId(String(newConv.active_branch_id));
      }
    } catch (err) {
      console.error("Failed to start new conversation:", err);
    }
  };

  // Switch Model on active branch
  const handleModelChange = async (newModelId: string) => {
    if (!activeBranchId) return;
    try {
      await updateBranch(activeBranchId, {
        model_id: newModelId,
        user_initiated_model_change: true,
      });
      fetchGraph(activeBranchId);
    } catch (err) {
      console.error("Failed to update branch model:", err);
    }
  };

  // Send message with streaming
  const handleSendMessage = async () => {
    if (!inputText.trim() || isStreaming) return;

    let targetConvId = activeConversationId;
    let targetBranchId = activeBranchId;

    // If no active conversation exists, create one first
    if (!targetConvId || !targetBranchId) {
      try {
        const defaultModel = models[0]?.id || "gemini-flash";
        const newConv = await createConversation(
          inputText.trim().slice(0, 40) || "New Conversation",
          null,
          null,
          defaultModel
        );
        targetConvId = newConv.id;
        setActiveConversationId(newConv.id);

        const loadedBranches = await fetchBranches(newConv.id);
        if (loadedBranches && loadedBranches.length > 0) {
          targetBranchId = loadedBranches[0].id;
          setActiveBranchId(loadedBranches[0].id);
        }
      } catch (err: unknown) {
        setStreamError(err instanceof Error ? err.message : "Failed to initialize conversation");
        return;
      }
    }

    if (!targetBranchId) {
      setStreamError("Unable to identify active branch for execution.");
      return;
    }

    const contentToSend = inputText.trim();
    setInputText("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await sendMessageStream(
        targetBranchId,
        contentToSend,
        (chunk: string) => {
          setStreamingContent((prev) => prev + chunk);
        },
        (_node: any) => {
          setIsStreaming(false);
          setStreamingContent("");
          if (targetBranchId) {
            fetchGraph(targetBranchId);
          }
        },
        controller.signal
      );
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        // Stream deliberately canceled by user
        if (targetBranchId) fetchGraph(targetBranchId);
      } else {
        const msg = err instanceof Error ? err.message : "Streaming connection failed";
        setStreamError(msg);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenBranchModal = (nodeId: string, content: string) => {
    setSelectedBranchNodeId(nodeId);
    setSelectedBranchNodePreview(content);
    setNewBranchModalOpen(true);
  };

  const handleBranchConfirm = async (name: string, modelId: string) => {
    if (!activeConversationId || !selectedBranchNodeId) return;
    const newBranch = await createBranch(activeConversationId, selectedBranchNodeId, name, modelId);
    if (newBranch) {
      setActiveBranchId(newBranch.id);
      fetchGraph(newBranch.id);
    }
  };

  const handleOpenCreateMissionModal = (messageContent: string, messageId?: string) => {
    setMissionInitialObjective(messageContent);
    setMissionOriginMessageId(messageId);
    setCreateMissionModalOpen(true);
  };

  const activeModel = models.find((m) => m.id === (activeBranch?.model_id || "gemini-flash")) || null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-app-bg text-app-text">
      <OfflineBanner />

      {/* 1. Left Conversation Rail */}
      <div className="w-64 border-r border-app-border bg-app-secondary flex flex-col shrink-0">
        <div className="p-3 border-b border-app-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            Conversations
          </span>
          <button
            onClick={handleStartNewConversation}
            className="p-1.5 rounded-lg bg-app-card border border-app-border text-app-text hover:bg-app-secondary transition-colors"
            title="New Conversation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-2 border-b border-app-border">
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-app-card border border-app-border rounded-lg text-xs">
            <Search className="w-3.5 h-3.5 text-app-muted shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter threads..."
              className="w-full bg-transparent outline-none text-xs text-app-text placeholder:text-app-muted"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convLoading && conversations.length === 0 ? (
            <div className="p-3 space-y-2">
              <LoadingSkeleton variant="rect" count={4} />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-app-muted">
              {searchQuery ? "No matching conversations" : "No previous threads. Click '+' to start."}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = activeConversationId === c.id;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group relative flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer",
                    isActive
                      ? "bg-app-card text-app-text font-medium border border-app-border"
                      : "text-app-dim hover:bg-app-card/60 hover:text-app-text"
                  )}
                  onClick={() => setActiveConversationId(c.id)}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-app-muted" />
                    <span className="truncate">{c.title || "Untitled Conversation"}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation and its branch lineage?")) {
                        deleteConversation(c.id);
                        if (activeConversationId === c.id) {
                          setActiveConversationId(null);
                        }
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-app-muted hover:text-red-400 transition-opacity"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-app-bg">
        {/* Top Chat Bar: Branch Selector, Model Gateway, Actions */}
        <div className="h-12 px-4 border-b border-app-border bg-app-secondary/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Branch Switcher Dropdown */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <GitBranch className="w-3.5 h-3.5 text-app-muted shrink-0" />
              <select
                value={activeBranchId || ""}
                onChange={(e) => switchBranch(e.target.value)}
                className="bg-app-card border border-app-border text-app-text px-2 py-1 rounded-md text-xs outline-none font-mono"
              >
                {branches.length === 0 ? (
                  <option value="">main (default)</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </option>
                  ))
                )}
              </select>
            </div>

            <span className="text-app-muted">·</span>

            {/* Authoritative Model Gateway Selector */}
            <div className="flex items-center gap-1.5 text-xs text-app-dim font-mono">
              <Sparkles className="w-3.5 h-3.5 text-app-muted shrink-0" />
              <select
                value={activeBranch?.model_id || models[0]?.id || "gemini-flash"}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={modelsLoading}
                className="bg-transparent border-none text-app-text text-xs outline-none cursor-pointer font-mono"
                title="Authoritative Model Gateway selection"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-app-card text-app-text">
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2">
            {branches.length > 1 && (
              <button
                onClick={() => setCompareModalOpen(true)}
                className="px-2.5 py-1 rounded-md border border-app-border text-xs text-app-text hover:bg-app-card transition-colors flex items-center gap-1.5"
                title="Compare Reasoning Branches"
              >
                <GitCompare className="w-3.5 h-3.5 text-app-muted" />
                <span>Compare</span>
              </button>
            )}

            <button
              onClick={() => handleOpenCreateMissionModal(messages[messages.length - 1]?.content || "")}
              disabled={messages.length === 0}
              className="px-2.5 py-1 rounded-md border border-app-border text-xs text-app-text hover:bg-app-card disabled:opacity-40 transition-colors flex items-center gap-1.5"
              title="Promote Conversation to Level 3 Mission"
            >
              <Target className="w-3.5 h-3.5 text-app-muted" />
              <span>Create Mission</span>
            </button>

            <button
              onClick={() => setContextPanelOpen(!contextPanelOpen)}
              className={cn(
                "p-1.5 rounded-md border border-app-border transition-colors",
                contextPanelOpen
                  ? "bg-app-card text-app-text border-app-strong"
                  : "text-app-muted hover:text-app-text hover:bg-app-card"
              )}
              title="Toggle Live Authoritative Context Panel"
            >
              {contextPanelOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {streamError && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{streamError}</span>
            </div>
            <button
              onClick={() => setStreamError(null)}
              className="text-xs underline hover:no-underline text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Transcript Area */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {graphLoading && messages.length === 0 ? (
            <div className="py-8 space-y-4">
              <LoadingSkeleton variant="card" count={3} />
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <EmptyState
              title="Start an AI Exploration"
              description="Ask questions, explore architectural concepts, branch at any decision point, or convert insights into autonomous missions."
              actionLabel="Try: Analyze Architecture"
              onAction={() => {
                setInputText("Analyze our application architecture and propose performance optimizations.");
              }}
            />
          ) : (
            messages.map((m) => {
              const isUser = m.role === "user";
              const isInherited = inheritedNodeIds.has(m.id);
              const isForkOrigin = forkOriginId === m.id;

              return (
                <React.Fragment key={m.id}>
                  {/* Divergence Separator */}
                  {isForkOrigin && (
                    <div className="flex items-center gap-3 py-2 my-2">
                      <div className="flex-1 h-px bg-app-border" />
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-app-secondary border border-app-border text-[10px] font-mono text-app-dim uppercase">
                        <GitBranch className="w-3 h-3 text-app-muted" />
                        <span>Branch Diverges Here</span>
                      </div>
                      <div className="flex-1 h-px bg-app-border" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-1 group max-w-3xl",
                      isUser ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {/* Role & Lineage Header */}
                    <div className="flex items-center gap-2 px-1 text-[11px] text-app-muted font-mono">
                      <span>{isUser ? "You" : "Arbor Copilot"}</span>
                      {isInherited && (
                        <span className="text-[10px] px-1 rounded bg-app-secondary border border-app-subtle text-app-dim">
                          Inherited
                        </span>
                      )}
                      <span>·</span>
                      <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={cn(
                        "p-4 rounded-xl text-xs leading-relaxed border transition-colors",
                        isUser
                          ? "bg-app-accent text-app-inverted border-app-accent"
                          : isInherited
                          ? "bg-app-card/60 text-app-muted border-app-border/60 hover:text-app-text"
                          : "bg-app-card text-app-text border-app-border"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>

                    {/* Action Bar */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 pt-1 text-[11px]">
                      <button
                        onClick={() => handleCopyMessage(m.id, m.content)}
                        className="flex items-center gap-1 text-app-muted hover:text-app-text border border-app-border px-2 py-0.5 rounded bg-app-card"
                        title="Copy text"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {!isUser && (
                        <>
                          <button
                            onClick={() => handleOpenBranchModal(m.id, m.content)}
                            className="flex items-center gap-1 text-app-muted hover:text-app-text border border-app-border px-2 py-0.5 rounded bg-app-card"
                            title="Branch from this message"
                          >
                            <GitBranch className="w-3 h-3" />
                            <span>Branch Here</span>
                          </button>

                          <button
                            onClick={() => handleOpenCreateMissionModal(m.content, m.id)}
                            className="flex items-center gap-1 text-app-muted hover:text-app-text border border-app-border px-2 py-0.5 rounded bg-app-card"
                            title="Promote insight to Mission"
                          >
                            <Target className="w-3 h-3" />
                            <span>Create Mission</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Live Streaming Response Bubble */}
          {isStreaming && (
            <div className="flex flex-col gap-1 mr-auto items-start max-w-3xl">
              <div className="flex items-center gap-2 px-1 text-[11px] text-app-muted font-mono">
                <span>Arbor Copilot</span>
                <span>·</span>
                <span className="text-emerald-400 animate-pulse">Streaming...</span>
              </div>
              <div className="p-4 rounded-xl text-xs leading-relaxed border bg-app-card text-app-text border-app-border shadow-sm w-full">
                <div className="whitespace-pre-wrap">{streamingContent || "..."}</div>
              </div>
            </div>
          )}
        </div>

        {/* Message Input Box */}
        <div className="p-4 border-t border-app-border bg-app-secondary/40 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-app-card border border-app-border rounded-xl p-2 shadow-sm focus-within:border-app-strong transition-colors">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isStreaming}
                rows={2}
                placeholder={
                  isStreaming
                    ? "Arbor is streaming response... (press Stop to interrupt)"
                    : "Message Arbor Copilot... (Shift+Enter for newline, Enter to send)"
                }
                className="flex-1 bg-transparent text-xs text-app-text placeholder:text-app-muted resize-none outline-none px-2"
              />

              {isStreaming ? (
                <button
                  onClick={handleStopStreaming}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors shrink-0"
                  title="Stop generating"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isStreaming}
                  className="p-2 rounded-lg bg-app-accent text-app-inverted disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-app-muted px-1 font-mono">
              <div className="flex items-center gap-3">
                <span>Model: {activeModel?.name || activeBranch?.model_id || "gemini-flash"}</span>
                <span>·</span>
                <span>Tokens: ~{activeBranch?.token_budget || 2000}</span>
                <span>·</span>
                <span>Branch: {activeBranch?.name || "main"}</span>
              </div>
              <div className="hidden sm:block">Authoritative Model Gateway</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Context Drawer */}
      <ContextPanel
        isOpen={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        conversationId={activeConversationId}
        branch={activeBranch}
        workspaceId="default-workspace"
        selectedModel={activeModel}
        contextMeta={graph ? { total_messages: messages.length, branch_id: activeBranchId } : {}}
        agentStatus={agentStatus}
        messageCount={messages.length}
        inheritedCount={inheritedNodeIds.size}
      />

      {/* 4. Modals */}
      <NewBranchModal
        isOpen={newBranchModalOpen}
        onClose={() => setNewBranchModalOpen(false)}
        onConfirm={handleBranchConfirm}
        originNodeId={selectedBranchNodeId}
        originMessagePreview={selectedBranchNodePreview}
        availableModels={models}
        currentModelId={activeBranch?.model_id || undefined}
      />

      <BranchCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        branches={branches}
        initialBranchAId={activeBranchId}
      />

      <CreateMissionModal
        isOpen={createMissionModalOpen}
        onClose={() => setCreateMissionModalOpen(false)}
        conversationId={activeConversationId || ""}
        branchId={activeBranchId || ""}
        workspaceId="default-workspace"
        initialObjective={missionInitialObjective}
        originMessageId={missionOriginMessageId || undefined}
        availableModels={models}
        currentModelId={activeBranch?.model_id || undefined}
      />
    </div>
  );
};
