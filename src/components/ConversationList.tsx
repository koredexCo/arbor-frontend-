import { MessageSquare, Trash2, Search, Pencil, Check, X, MoreHorizontal } from "lucide-react";
import { useState, useRef } from "react";
import type { Conversation } from "../types";
import { api, getAccessToken } from "../services/api";

interface Props {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  loading: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  loading,
}: Props) {
  const [search, setSearch] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const handleRename = async (convId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingId(null);
      return;
    }
    setRenamingId(convId);
    try {
      const token = await getAccessToken();
      await fetch(`${import.meta.env.VITE_API_URL}/conversations/${convId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (onRename) onRename(convId, newTitle.trim());
    } catch (e) {
      console.error("Rename failed:", e);
    } finally {
      setRenamingId(null);
      setEditingId(null);
    }
  };

  const handleDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation? This cannot be undone.")) {
      onDelete(id);
    }
  };


  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const title = newTitle.trim() || "New Conversation";
    onCreate(title);
    setNewTitle("");
    setShowNewInput(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1e1e1e]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#c0c0c0] uppercase tracking-wider">
            Conversations
          </h2>
          <button
            onClick={() => setShowNewInput(true)}
            className="text-sm text-gray-300 hover:text-white border border-gray-700
                       hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
          >
            + New Conversation
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#111111] text-sm text-[#a0a0a0] rounded-lg pl-9 pr-3 py-2
                       border border-[#1e1e1e] placeholder:text-[#444444]
                       focus:outline-none focus:border-[#444444] transition-colors"
          />
        </div>
      </div>

      {/* New conversation input */}
      {showNewInput && (
        <div className="p-3 border-b border-[#1a1a1a] animate-slide-up">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Conversation title..."
            className="input-field text-sm !py-2 mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowNewInput(false);
            }}
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary text-xs !px-3 !py-1.5 flex-1">
              Create
            </button>
            <button
              onClick={() => setShowNewInput(false)}
              className="btn-ghost text-xs !px-3 !py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#444444]">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {search ? "No matching conversations" : "No conversations yet"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = activeConversationId === conv.id;
            const isEditing = editingId === conv.id;
            const isHovered = hoveredId === conv.id;

            return (
              <div
                key={conv.id}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                            transition-all duration-200
                  ${isActive
                    ? "bg-[#1a1a1a] border-l-2 border-l-white border-y-0 border-r-0 rounded-l-none"
                    : "hover:bg-[#111111] border border-transparent"
                  }`}
                onClick={() => !isEditing && onSelect(conv.id)}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isActive
                    ? "bg-white text-black"
                    : "bg-[#1a1a1a] text-[#555555]"
                  }`}>
                  <MessageSquare size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => handleRename(conv.id, editTitle)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(conv.id, editTitle);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-transparent border-b border-[#444444] outline-none
                                   text-white text-sm py-0.5 min-w-0"
                      />
                      <button
                        onClick={() => handleRename(conv.id, editTitle)}
                        className="text-[#888888] hover:text-white p-0.5"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[#888888] hover:text-white p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-[#888888]"}`}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setEditingId(conv.id);
                        setEditTitle(conv.title);
                      }}
                      title="Double-click to rename"
                    >
                      {conv.title}
                    </p>
                  )}
                  <p className="text-[10px] text-[#444444] mt-0.5">
                    {formatDate(conv.created_at)}
                  </p>
                </div>

                {/* Action buttons — shown on hover, hidden when editing */}
                {!isEditing && isHovered && (
                  <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingId(conv.id);
                        setEditTitle(conv.title);
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center
                                 text-[#555555] hover:text-white hover:bg-[#2a2a2a] transition-all"
                      title="Rename"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={e => handleDeleteConfirm(e, conv.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center
                                 text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
