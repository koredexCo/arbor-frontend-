import { useState, useRef, useEffect } from "react";
import { Send, Info, X } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { SourceReference } from "./SourceReference";
import { NewBranchModal } from "./NewBranchModal";
import type { Message, Source, Model } from "../types";

interface Props {
  messages: Message[];
  sources: Source[];
  contextMeta: Record<string, unknown>;
  sending: boolean;
  loading: boolean;
  branchOriginId?: string | null;
  inheritedNodeIds?: Set<string>;
  forkOriginId?: string | null;
  onBranch: (nodeId: string) => void;
  onPin: (nodeId: string) => void;
  onUnpin: (nodeId: string) => void;
  onCreateBranch: (originNodeId: string, name: string, modelId: string) => void;
  availableModels?: Model[];
  isStreaming?: boolean;
  streamingContent?: string;
}

export function Chat({
  messages,
  sources,
  contextMeta,
  sending,
  loading,
  branchOriginId,
  inheritedNodeIds = new Set(),
  forkOriginId = null,
  onBranch,
  onPin,
  onUnpin,
  onCreateBranch,
  availableModels = [],
  isStreaming = false,
  streamingContent = "",
}: Props) {
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchNodeId, setBranchNodeId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const handleBranch = (nodeId: string) => {
    setBranchNodeId(nodeId);
    setBranchModalOpen(true);
  };

  const handleBranchConfirm = (name: string, modelId: string) => {
    if (branchNodeId) {
      onCreateBranch(branchNodeId, name, modelId);
    }
    setBranchModalOpen(false);
    setBranchNodeId(null);
  };



  const currentBranchId = contextMeta.branch_id as string | undefined;
  const inheritedCount = inheritedNodeIds.size;
  const localCount = messages.length - inheritedCount;
  const contextCount = currentBranchId 
    ? messages.filter(m => m.branch_id === currentBranchId).length
    : (contextMeta.total_messages as number || messages.length);

  return (
    <div className="flex flex-col h-full">
      {/* Context meta bar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 
                        bg-[#0d0d0d] border-b border-[#141414]">
          <div className="flex items-center gap-4 text-xs text-[#52504b]">
            <span className="text-[#52504b]">{messages.length} nodes in scope</span>
            {inheritedCount > 0 && (
              <span className="text-[#52504b]">
                {inheritedCount} inherited
              </span>
            )}
            {localCount > 0 && (
              <span className="text-[#52504b] font-medium">
                {localCount} local
              </span>
            )}
            {contextMeta.pinned_count !== undefined && Number(contextMeta.pinned_count) > 0 && (
              <span className="text-[#52504b]">
                📌 {String(contextMeta.pinned_count)} pinned
              </span>
            )}
            {contextMeta.relevant_count !== undefined && Number(contextMeta.relevant_count) > 0 && (
              <span className="text-[#52504b]">
                🔍 {String(contextMeta.relevant_count)} relevant
              </span>
            )}
          </div>
          {sources.length > 0 && (
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-[#52504b]
                         hover:text-[#0a0a0a] transition-colors"
            >
              <Info size={12} />
              {showSources ? "Hide" : "Show"} sources
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {/* Sources panel (collapsible) */}
          {showSources && sources.length > 0 && (
            <div className="p-4 border-b border-[#1a1a1a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#52504b]">Context Sources</span>
                <button onClick={() => setShowSources(false)} className="text-[#52504b] hover:text-[#52504b]">
                  <X size={14} />
                </button>
              </div>
              <SourceReference sources={sources} />
            </div>
          )}

          {/* Messages */}
          <div className="p-4 space-y-1">
            {loading ? (
              // Loading skeletons
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <div className={`skeleton h-16 rounded ${i % 2 === 0 ? "w-[60%]" : "w-[70%]"}`} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-16 h-16 rounded bg-white border border-[#e8e8e8] flex items-center justify-center mb-4 animate-float">
                <Send size={24} className="text-[#666666]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">
                Start the conversation
              </h3>
              <p className="text-sm text-[#52504b] max-w-md">
                  Send a message to begin. You can branch the conversation at any
                  point to explore different directions.
                </p>
              </div>
            ) : (
              messages
                .filter(message => {
                  const is_inherited = inheritedNodeIds.has(message.id);
                  if (!is_inherited) return true;
                  return is_inherited && message.id === branchOriginId;
                })
                .map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    sources={
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1
                        ? sources
                        : []
                  }
                  onBranch={handleBranch}
                  onPin={onPin}
                  onUnpin={onUnpin}
                  isBranchOrigin={message.id === branchOriginId}
                  isInherited={inheritedNodeIds.has(message.id)}
                  isLocal={!inheritedNodeIds.has(message.id)}
                  isForkOrigin={message.id === forkOriginId}
                  hasSnapshot={!!message.metadata?._has_snapshot}
                />
              ))
            )}

            {/* Streaming message */}
            {isStreaming && (
              <div className="group flex justify-start mb-4 animate-slide-up">
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center mr-3 mt-1 bg-white border border-[#e8e8e8] shadow-lg">
                    <span className="text-xs font-bold text-[#0a0a0a]">AI</span>
                  </div>
                </div>
                <div className="max-w-[80%] rounded px-4 py-3 relative bg-white text-[#e0e0e0] border border-[#e8e8e8]">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {streamingContent}
                    <span className="cursor">▋</span>
                  </p>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {(sending && !isStreaming) && (
              <div className="flex justify-start mb-4 animate-fade-in">
                <div className="flex items-center gap-2 bg-white rounded px-4 py-3
                                border border-[#e8e8e8]">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded bg-[#666666] typing-dot" />
                    <div className="w-1.5 h-1.5 rounded bg-[#666666] typing-dot" />
                    <div className="w-1.5 h-1.5 rounded bg-[#666666] typing-dot" />
                  </div>
                  <span className="text-xs text-[#52504b] ml-2">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      {/* Branch modal */}
      <NewBranchModal
        isOpen={branchModalOpen}
        onClose={() => {
          setBranchModalOpen(false);
          setBranchNodeId(null);
        }}
        onConfirm={handleBranchConfirm}
        availableModels={availableModels}
      />
    </div>
  );
}
