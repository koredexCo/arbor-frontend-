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
    <div className="bg-white border border-[#e8e8e8] rounded shadow-sm p-4 animate-slide-up">
      <h4 className="text-xs font-semibold text-[#52504b] uppercase tracking-wider mb-3">
        Context Sources Used
      </h4>

      {pinnedSources.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-[#0a0a0a] font-medium mb-2">
            <Pin size={12} />
            Pinned ({pinnedSources.length})
          </div>
          <div className="space-y-1.5">
            {pinnedSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSourceClick?.(source.id)}
                className="w-full text-left text-xs p-2 rounded bg-white/10 
                           border border-[#e8e8e8] text-[#52504b]
                           hover:bg-white/15 transition-colors"
              >
                <span className="text-[#0a0a0a] font-medium">
                  [{source.role}] #{source.sequence}
                </span>
                <p className="mt-0.5 text-[#52504b] line-clamp-2">
                  {source.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {relevantSources.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-[#52504b] font-medium mb-2">
            <Search size={12} />
            Vector Similar ({relevantSources.length})
          </div>
          <div className="space-y-1.5">
            {relevantSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSourceClick?.(source.id)}
                className="w-full text-left text-xs p-2 rounded bg-white 
                           border border-[#e8e8e8] text-[#52504b]
                           hover:bg-white transition-colors"
              >
                <span className="text-[#52504b] font-medium">
                  [{source.role}] #{source.sequence}
                </span>
                {source.similarity && (
                  <span className="ml-2 text-[#52504b]">
                    {(source.similarity * 100).toFixed(0)}% match
                  </span>
                )}
                <p className="mt-0.5 text-[#52504b] line-clamp-2">
                  {source.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {recentSources.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#52504b] font-medium mb-2">
            <MessageSquare size={12} />
            Recent ({recentSources.length})
          </div>
          <p className="text-xs text-[#52504b]">
            {recentSources.length} messages from conversation history
          </p>
        </div>
      )}
    </div>
  );
}
