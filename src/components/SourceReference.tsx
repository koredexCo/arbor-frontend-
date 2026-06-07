import { Pin, Search, MessageSquare } from "lucide-react";
import type { Source } from "../types";

interface Props {
  sources: Source[];
  onSourceClick?: (sourceId: string) => void;
}

export function SourceReference({ sources, onSourceClick }: Props) {
  if (sources.length === 0) return null;

  const pinnedSources = sources.filter((s) => s.type === "pinned");
  const relevantSources = sources.filter((s) => s.type === "relevant");
  const recentSources = sources.filter((s) => s.type === "recent");

  return (
    <div className="glass-card p-4 animate-slide-up">
      <h4 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">
        Context Sources Used
      </h4>

      {pinnedSources.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-white font-medium mb-2">
            <Pin size={12} />
            Pinned ({pinnedSources.length})
          </div>
          <div className="space-y-1.5">
            {pinnedSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSourceClick?.(source.id)}
                className="w-full text-left text-xs p-2 rounded-lg bg-white/10 
                           border border-[#2a2a2a] text-[#c0c0c0]
                           hover:bg-white/15 transition-colors"
              >
                <span className="text-white font-medium">
                  [{source.role}] #{source.sequence}
                </span>
                <p className="mt-0.5 text-[#555555] line-clamp-2">
                  {source.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {relevantSources.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-[#a0a0a0] font-medium mb-2">
            <Search size={12} />
            Vector Similar ({relevantSources.length})
          </div>
          <div className="space-y-1.5">
            {relevantSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSourceClick?.(source.id)}
                className="w-full text-left text-xs p-2 rounded-lg bg-[#1a1a1a] 
                           border border-[#333333] text-[#c0c0c0]
                           hover:bg-[#1a1a1a] transition-colors"
              >
                <span className="text-[#a0a0a0] font-medium">
                  [{source.role}] #{source.sequence}
                </span>
                {source.similarity && (
                  <span className="ml-2 text-[#a0a0a0]">
                    {(source.similarity * 100).toFixed(0)}% match
                  </span>
                )}
                <p className="mt-0.5 text-[#555555] line-clamp-2">
                  {source.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {recentSources.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#888888] font-medium mb-2">
            <MessageSquare size={12} />
            Recent ({recentSources.length})
          </div>
          <p className="text-xs text-[#444444]">
            {recentSources.length} messages from conversation history
          </p>
        </div>
      )}
    </div>
  );
}
