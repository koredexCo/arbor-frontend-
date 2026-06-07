import { useState } from "react";
import { Pin, PinOff, GitBranch, Copy, Check, Waypoints } from "lucide-react";
import type { Message, Source } from "../types";

interface Props {
  message: Message;
  sources?: Source[];
  onBranch: (nodeId: string) => void;
  onPin: (nodeId: string) => void;
  onUnpin: (nodeId: string) => void;
  onSourceClick?: (sourceId: string) => void;
  isBranchOrigin?: boolean;
  isInherited?: boolean;
  isLocal?: boolean;
  isForkOrigin?: boolean;
  hasSnapshot?: boolean;
}

export function MessageBubble({
  message,
  sources = [],
  onBranch,
  onPin,
  onUnpin,
  onSourceClick,
  isBranchOrigin = false,
  isInherited = false,
  isLocal = false,
  isForkOrigin = false,
  hasSnapshot = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If message is inherited and collapsed, show thin preview banner
  if (isInherited && !isExpanded) {
    return (
      <div className="flex items-center justify-between py-2 px-4 mb-3 mx-12 rounded 
                      bg-white border border-[#e8e8e8]  hover: transition-opacity">
        <div className="flex items-center gap-2 text-xs text-[#52504b] truncate flex-1 mr-4">
          <GitBranch size={12} className="rotate-180 text-[#52504b] flex-shrink-0" />
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#52504b]">
            {message.role === "user" ? "User" : "AI"}
          </span>
          <span className="truncate text-surface-450 italic">
            "{message.content}"
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-[#52504b] hover:text-[#52504b] font-semibold px-2.5 py-1 hover:bg-white rounded transition-colors"
        >
          Expand
        </button>
      </div>
    );
  }

  // Classification-based styling
  const inheritedClass = isInherited
    ? " border-l-2 border-l-surface-600"
    : "";
  const localClass = isLocal && !isUser
    ? "border-l-2 border-l-brand-500"
    : "";
  const forkOriginClass = isForkOrigin
    ? "border-l-2 border-l-amber-400 -border"
    : "";

  return (
    <>
      {/* Fork divergence separator */}
      {isForkOrigin && (
        <div className="flex items-center gap-3 py-3 my-2">
          <div className="flex-1 h-px bg-[#2a2a2a]" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded
                          bg-white border border-[#e8e8e8]">
            <Waypoints size={12} className="text-[#52504b]" />
            <span className="text-[10px] font-semibold text-[#52504b] uppercase tracking-wider">
              Branch diverges here
            </span>
          </div>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
        </div>
      )}

      <div
        id={`message-${message.id}`}
        className={`group flex ${isUser ? "justify-end" : "justify-start"} 
                    mb-4 animate-slide-up
                    ${isBranchOrigin ? "message-highlight-target" : ""}
                    ${inheritedClass} ${localClass} ${forkOriginClass}`}
      >
        {/* Avatar for assistant */}
        {!isUser && (
          <div className="flex flex-col items-center">
            <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center mr-3 mt-1
                            ${isInherited
                              ? "bg-white border border-[#e8e8e8] shadow-none"
                              : "bg-white border border-[#e8e8e8] shadow-lg"
                            }`}>
              <span className={`text-xs font-bold ${isInherited ? "text-[#52504b]" : "text-[#0a0a0a]"}`}>AI</span>
            </div>
            {message.metadata?.node_type !== "image" && (
              <span className="text-[8px] text-[#52504b] mt-1 mr-3 font-mono">
                {String(message.metadata?.model_id === "emini-flash" ? "gemini-flash" : (message.metadata?.model_id || "claude"))}
              </span>
            )}
          </div>
        )}

        <div
          className={`max-w-[80%] rounded px-4 py-3 relative
                      ${isUser
                        ? isInherited
                          ? "bg-white text-[#52504b] border border-[#e8e8e8] "
                          : "bg-white text-[#0a0a0a] border border-[#e8e8e8] shadow-lg"
                        : isInherited
                          ? "bg-white text-[#52504b] border border-[#e8e8e8] "
                          : "bg-white text-[#e0e0e0] border border-[#e8e8e8]"
                      }`}
        >
          {/* Inherited indicator */}
          {isInherited && (
            <div className="flex items-center justify-between text-[10px] text-[#52504b] mb-1.5 font-medium">
              <div className="flex items-center gap-1.5">
                <GitBranch size={10} className="rotate-180" />
                Inherited from ancestor
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-[10px] text-[#52504b] hover:text-[#52504b] font-semibold hover:underline px-1 py-0.5 rounded transition-colors"
              >
                Collapse
              </button>
            </div>
          )}

          {/* Fork origin indicator */}
          {isForkOrigin && (
            <div className="flex items-center gap-1.5 text-xs text-[#52504b] mb-2 font-medium">
              <Waypoints size={12} />
              ⑂ Fork origin
            </div>
          )}

          {/* Branch origin indicator */}
          {isBranchOrigin && !isForkOrigin && (
            <div className="flex items-center gap-1.5 text-xs text-[#666666] mb-2 font-medium">
              <GitBranch size={12} />
              Branch origin
            </div>
          )}

          {/* Pinned indicator */}
          {message.is_pinned && (
            <div className="flex items-center gap-1.5 text-xs text-[#0a0a0a] mb-2 font-medium">
              <Pin size={12} />
              Pinned
            </div>
          )}

          {/* Snapshot indicator (replay-ready) */}
          {hasSnapshot && (
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 rounded bg-white" title="Has inference snapshot" />
            </div>
          )}

          {/* Message content */}
          {(message.metadata?.node_type === "image") ? (
            <div className="rounded overflow-hidden border border-[#e8e8e8]">
              <img 
                src={message.content} 
                alt={String(message.metadata?.prompt || "Generated AI image")} 
                className="max-w-full h-auto object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%231a1a2e' width='400' height='300'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3EImage failed to load%3C/text%3E%3C/svg%3E";
                }}
              />
              {!!message.metadata?.prompt && (
                <div className="p-2 bg-white text-[10px] text-[#52504b] italic">
                  Prompt: {String(message.metadata.prompt)}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-surface-600/50">
              <p className="text-xs text-[#52504b] mb-1.5 font-medium">
                Context sources:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => onSourceClick?.(source.id)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors font-medium
                      ${source.type === "pinned"
                        ? "bg-white/20 text-[#0a0a0a] hover:bg-white/30 border border-[#e8e8e8]"
                        : source.type === "relevant"
                        ? "bg-white text-[#52504b] hover:bg-white border border-[#e8e8e8]"
                        : "bg-white text-[#52504b] hover:bg-surface-600 border border-surface-600"
                      }`}
                  >
                    {source.type === "pinned" ? "📌" : source.type === "relevant" ? "🔍" : "💬"}{" "}
                    #{source.sequence}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 mt-2  group-hover: transition-opacity duration-200">
            <button
              onClick={() => onBranch(message.id)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
                ${isUser
                  ? "text-[#0a0a0a]/60 hover:text-[#0a0a0a] hover:bg-white/10"
                  : "text-[#52504b] hover:text-[#0a0a0a] hover:bg-white/10"
                }`}
              title="Create branch from this message"
            >
              <GitBranch size={12} />
              Branch
            </button>

            {message.is_pinned ? (
              <button
                onClick={() => onUnpin(message.id)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
                  ${isUser
                    ? "text-[#0a0a0a]/60 hover:text-[#0a0a0a] hover:bg-white/10"
                    : "text-[#52504b] hover:text-[#0a0a0a] hover:bg-white"
                  }`}
                title="Unpin message"
              >
                <PinOff size={12} />
                Unpin
              </button>
            ) : (
              <button
                onClick={() => onPin(message.id)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
                  ${isUser
                    ? "text-[#0a0a0a]/60 hover:text-[#0a0a0a] hover:bg-white/10"
                    : "text-[#52504b] hover:text-[#0a0a0a] hover:bg-white"
                  }`}
                title="Pin message for persistent context"
              >
                <Pin size={12} />
                Pin
              </button>
            )}

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
                ${isUser
                  ? "text-[#0a0a0a]/60 hover:text-[#0a0a0a] hover:bg-white/10"
                  : "text-[#52504b] hover:text-[#52504b] hover:bg-white"
                }`}
              title="Copy message"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Avatar for user */}
        {isUser && (
          <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ml-3 mt-1
                          ${isInherited ? "bg-white" : "bg-white"}`}>
            <span className={`text-xs font-bold ${isInherited ? "text-[#52504b]" : "text-[#52504b]"}`}>U</span>
          </div>
        )}
      </div>
    </>
  );
}
