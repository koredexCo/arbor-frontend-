import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  FlaskConical,
  Target,
  FolderTree,
  Monitor,
  Brain,
  Database,
  Wrench,
  Boxes,
  Cpu,
  Server,
  Shield,
  Activity,
  Settings,
  Sun,
  Moon,
  Plus,
  ArrowRight,
  Command,
  X,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: "Navigation" | "Actions" | "Preferences";
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // 13 Primary Navigation Routes
    {
      id: "nav-home",
      category: "Navigation",
      title: "Home — Chat & Conversations",
      description: "Parallel conversational AI cockpit and branch explorer",
      icon: MessageSquare,
      action: () => { navigate("/home"); onClose(); },
      keywords: ["chat", "conversation", "messages", "branch", "gpt", "claude"],
    },
    {
      id: "nav-research",
      category: "Navigation",
      title: "Research — Deep Evidence & Synthesis",
      description: "Multi-model research lanes, citations, and contradiction analysis",
      icon: FlaskConical,
      action: () => { navigate("/research"); onClose(); },
      keywords: ["research", "search", "web", "sources", "citations", "evidence"],
    },
    {
      id: "nav-missions",
      category: "Navigation",
      title: "Missions — Level 3 Orchestrator",
      description: "Autonomous task DAGs, event streams, and recovery checkpoints",
      icon: Target,
      action: () => { navigate("/missions"); onClose(); },
      keywords: ["missions", "tasks", "dag", "orchestration", "plan", "agent loop"],
    },
    {
      id: "nav-workspaces",
      category: "Navigation",
      title: "Workspaces — Code & Execution",
      description: "Sandboxed terminal, file tree, diff viewer, and C++ transpiler",
      icon: FolderTree,
      action: () => { navigate("/workspaces"); onClose(); },
      keywords: ["workspaces", "code", "terminal", "diff", "transpiler", "cpp"],
    },
    {
      id: "nav-computer",
      category: "Navigation",
      title: "Computer Operator",
      description: "Dedicated computer control, browser, and app automation cockpit",
      icon: Monitor,
      action: () => { navigate("/computer"); onClose(); },
      keywords: ["computer", "operator", "browser", "desktop", "automation"],
    },
    {
      id: "nav-intelligence",
      category: "Navigation",
      title: "Intelligence — Models & Routing",
      description: "Cognitive planner, Model Gateway, and codebase dependency graph",
      icon: Brain,
      action: () => { navigate("/intelligence"); onClose(); },
      keywords: ["intelligence", "router", "models", "compare", "cognitive graph"],
    },
    {
      id: "nav-memory",
      category: "Navigation",
      title: "Memory — Scoped Retrieval",
      description: "Adaptive semantic memory, context traces, and branch replay",
      icon: Database,
      action: () => { navigate("/memory"); onClose(); },
      keywords: ["memory", "adaptive", "retrieval", "provenance", "replay"],
    },
    {
      id: "nav-tools",
      category: "Navigation",
      title: "MCP & Tools — Server Registry",
      description: "Manage connected MCP servers, tool schemas, and server builder",
      icon: Wrench,
      action: () => { navigate("/tools"); onClose(); },
      keywords: ["mcp", "tools", "servers", "schemas", "builder", "plugins"],
    },
    {
      id: "nav-engineering",
      category: "Navigation",
      title: "Engineering — CAD & Simulation",
      description: "3D parametric model assembly, simulation telemetry, and BOM",
      icon: Boxes,
      action: () => { navigate("/engineering"); onClose(); },
      keywords: ["engineering", "cad", "simulation", "3d", "physics", "assembly", "bom"],
    },
    {
      id: "nav-devices",
      category: "Navigation",
      title: "Devices & Nodes — NAP Protocol",
      description: "Pair and manage connected execution nodes, daemon heartbeats",
      icon: Server,
      action: () => { navigate("/devices"); onClose(); },
      keywords: ["devices", "nodes", "agent", "pairing", "enrollment", "daemon"],
    },
    {
      id: "nav-governance",
      category: "Navigation",
      title: "Governance — CAS Approvals",
      description: "Cryptographic approval inbox, risk elevation, and audit logs",
      icon: Shield,
      action: () => { navigate("/governance"); onClose(); },
      keywords: ["governance", "approvals", "cas", "permissions", "audit", "security"],
    },
    {
      id: "nav-health",
      category: "Navigation",
      title: "System Health — Telemetry",
      description: "Mission reliability, node status, and provider latency metrics",
      icon: Activity,
      action: () => { navigate("/health"); onClose(); },
      keywords: ["health", "system", "status", "telemetry", "metrics", "latency"],
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: "Settings — Models & API Keys",
      description: "Configure providers, vault keys, model routing, and workspace",
      icon: Settings,
      action: () => { navigate("/settings"); onClose(); },
      keywords: ["settings", "api keys", "providers", "openai", "anthropic", "gemini"],
    },

    // Quick Actions
    {
      id: "act-theme",
      category: "Preferences",
      title: `Switch to ${theme === "dark" ? "Bright / Day" : "Monochrome Dark"} Mode`,
      description: "Toggle application theme palette",
      icon: theme === "dark" ? Sun : Moon,
      action: () => { toggleTheme(); onClose(); },
      keywords: ["theme", "dark", "light", "day", "night", "color", "mode"],
    },
    {
      id: "act-new-chat",
      category: "Actions",
      title: "New Conversation",
      description: "Start a fresh branched conversation thread",
      icon: Plus,
      action: () => { navigate("/home"); onClose(); },
      keywords: ["new", "conversation", "chat", "create"],
    },
    {
      id: "act-new-mission",
      category: "Actions",
      title: "Create Mission from Objective",
      description: "Dispatch objective to Level 3 orchestrator",
      icon: Target,
      action: () => { navigate("/missions?action=create"); onClose(); },
      keywords: ["create mission", "new mission", "dispatch"],
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const titleMatch = cmd.title.toLowerCase().includes(q);
    const descMatch = cmd.description?.toLowerCase().includes(q) ?? false;
    const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
    return titleMatch || descMatch || keywordMatch;
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-app-card border border-app-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-app-border gap-3 bg-app-secondary">
          <Search className="w-4 h-4 text-app-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to section... (e.g. 'missions', 'theme', 'tools')"
            className="w-full bg-transparent text-sm text-app-text placeholder:text-app-muted outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-app-muted hover:text-app-text p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-app-border text-app-muted shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-app-subtle">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-app-muted">
              No matching commands or routes found for <span className="font-semibold text-app-text">"{query}"</span>
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-left",
                    isSelected
                      ? "bg-app-hover border border-app-border"
                      : "hover:bg-app-secondary border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border",
                        isSelected
                          ? "bg-app-accent text-app-inverted border-app-accent"
                          : "bg-app-secondary text-app-dim border-app-subtle"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-app-text truncate">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-app-muted truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-mono text-app-muted uppercase px-1.5 py-0.5 rounded border border-app-subtle">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-app-text" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-app-subtle bg-app-secondary flex items-center justify-between text-[11px] text-app-muted">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Dismiss</span>
          </div>
          <div className="font-mono text-[10px]">Arbor Level 2</div>
        </div>
      </div>
    </div>
  );
};
