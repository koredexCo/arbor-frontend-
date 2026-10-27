import React, { useState } from "react";
import {
  Brain,
  Layers,
  Sparkles,
  ShieldAlert,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Settings,
  Flame,
  Search,
  BookOpen,
  Zap,
  Code2
} from "lucide-react";
import { executeAgentTool } from "../services/agentApi";

interface AdaptiveIntelligencePanelProps {
  workspaceId: string;
  branchId: string;
  className?: string;
}

export const AdaptiveIntelligencePanel: React.FC<AdaptiveIntelligencePanelProps> = ({
  workspaceId,
  branchId,
  className = "",
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"knowledge" | "memory" | "antipatterns" | "skills" | "settings">("knowledge");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<string>("ALL");
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  // Settings Toggles
  const [settings, setSettings] = useState({
    projectLearning: true,
    internetResearch: true,
    antiPatternAvoidance: true,
    autoSkillCreation: true,
    modelAdaptation: true,
  });

  const [projectSummary, setProjectSummary] = useState({
    projectName: "Arbor Monorepo",
    primaryLanguage: "Python & TypeScript",
    frameworks: ["FastAPI", "React", "Vite", "TailwindCSS", "Pytest"],
    servicesCount: 18,
    dependenciesCount: 42,
    architectureStyle: "Layered Micro-Service & Modular Monolith",
  });

  const [memories, setMemories] = useState([
    {
      id: "mem-001",
      scope: "PROJECT",
      category: "architecture",
      title: "FastAPI Async Architecture",
      content: "All endpoints in backend/app/api/ use async def with non-blocking I/O. Use httpx.AsyncClient for external requests.",
      source: "codebase_ast (backend/app/main.py)",
      confidence: 0.98,
      status: "fresh",
    },
    {
      id: "mem-002",
      scope: "PROJECT",
      category: "frameworks",
      title: "State Management via Zustand & Context",
      content: "Frontend state uses custom reactive event listeners and WebSocket hooks. Avoid full-page refreshes.",
      source: "codebase_ast (src/pages/WorkspaceIDE.tsx)",
      confidence: 0.94,
      status: "fresh",
    },
    {
      id: "mem-003",
      scope: "USER",
      category: "convention",
      title: "Concise Type-Safe Code Style",
      content: "User prefers explicit Pydantic models in Python and strict TypeScript interfaces with 0 any types.",
      source: "user_explicit",
      confidence: 1.0,
      status: "fresh",
    },
    {
      id: "mem-004",
      scope: "PROJECT",
      category: "testing",
      title: "Pytest Async Fixtures",
      content: "Run backend tests with pytest -v. Async test functions require @pytest.mark.asyncio.",
      source: "test_scanner (tests/)",
      confidence: 0.96,
      status: "fresh",
    },
  ]);

  const [antiPatterns, setAntiPatterns] = useState([
    {
      id: "ap-001",
      problem: "Blocking file I/O in FastAPI async route",
      bad_approach: "open() inside async endpoint without run_in_threadpool",
      solution: "Use aiofiles or run blocking file operations in threadpool",
      occurrences: 3,
    },
    {
      id: "ap-002",
      problem: "N+1 Query in database loop",
      bad_approach: "Iterating over entities and querying relations individually",
      solution: "Use joinedload / selectinload in SQLAlchemy query",
      occurrences: 2,
    },
  ]);

  const [skills, setSkills] = useState([
    {
      id: "sk-001",
      name: "FastAPI Endpoint Scaffold & Test",
      domain: "coding",
      tier: "TRUSTED",
      successRate: 95,
      successCount: 24,
      steps: [
        "1. Define Pydantic request & response schemas",
        "2. Implement APIRouter async handler",
        "3. Wire into main.py app router",
        "4. Write pytest unit test and verify 100% pass",
      ],
    },
    {
      id: "sk-002",
      name: "React IDE Component Integration",
      domain: "frontend",
      tier: "LIKELY",
      successRate: 88,
      successCount: 8,
      steps: [
        "1. Create modular TSX component in src/components/",
        "2. Wire Lucide icons and Tailwind styles",
        "3. Mount inside WorkspaceIDE.tsx right-pane tabs",
        "4. Run npm run build to verify 0 TS errors",
      ],
    },
  ]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const res = await executeAgentTool({
        workspace_id: workspaceId,
        branch_id: branchId,
        tool_name: "adaptive.ingest_project",
        parameters: { path: "." },
        risk_level: "safe",
      });

      if (res.result) {
        setProjectSummary({
          projectName: res.result.project_name || "Arbor Project",
          primaryLanguage: res.result.primary_language || "Python",
          frameworks: res.result.frameworks || ["FastAPI"],
          servicesCount: res.result.services_count || 12,
          dependenciesCount: res.result.dependencies_count || 30,
          architectureStyle: "Modular Application",
        });
      }
    } catch {
      // Fallback
    } finally {
      setIngesting(false);
    }
  };

  const handleResetIntelligence = async () => {
    try {
      await executeAgentTool({
        workspace_id: workspaceId,
        branch_id: branchId,
        tool_name: "adaptive.reset_project_memory",
        parameters: {},
        risk_level: "safe",
      });
      setMemories(memories.filter((m) => m.scope === "USER"));
      setAntiPatterns([]);
      setSkills([]);
      setResetModalOpen(false);
    } catch {
      setResetModalOpen(false);
    }
  };

  const filteredMemories = memories.filter((m) => {
    const matchesScope = selectedScope === "ALL" || m.scope === selectedScope;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesScope && matchesSearch;
  });

  return (
    <div className={`flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden ${className}`}>
      {/* Top Header & Sub-Tabs */}
      <div className="flex items-center justify-between px-3 pt-2 bg-neutral-950 border-b border-neutral-800 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab("knowledge")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
              activeSubTab === "knowledge"
                ? "bg-neutral-900 border-neutral-800 text-emerald-400"
                : "bg-neutral-950 border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
          <button
            onClick={() => setActiveSubTab("memory")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
              activeSubTab === "memory"
                ? "bg-neutral-900 border-neutral-800 text-sky-400"
                : "bg-neutral-950 border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memory Store</span>
          </button>
          <button
            onClick={() => setActiveSubTab("antipatterns")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
              activeSubTab === "antipatterns"
                ? "bg-neutral-900 border-neutral-800 text-amber-400"
                : "bg-neutral-950 border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Anti-Patterns</span>
          </button>
          <button
            onClick={() => setActiveSubTab("skills")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
              activeSubTab === "skills"
                ? "bg-neutral-900 border-neutral-800 text-purple-400"
                : "bg-neutral-950 border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Learned Skills</span>
          </button>
          <button
            onClick={() => setActiveSubTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg font-semibold transition border-t border-x ${
              activeSubTab === "settings"
                ? "bg-neutral-900 border-neutral-800 text-neutral-300"
                : "bg-neutral-950 border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Governance</span>
          </button>
        </div>

        {/* Global Action: Ingest Project */}
        <div className="flex items-center gap-2 pb-1.5 pr-1">
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <FolderGit2 className={`w-3 h-3 ${ingesting ? "animate-spin" : ""}`} />
            <span>Ingest Project</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-3 overflow-y-auto font-sans text-xs">
        {/* Banner Info */}
        <div className="flex items-center justify-between p-2.5 mb-3 bg-neutral-950 border border-neutral-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-semibold text-neutral-200 text-xs">{projectSummary.projectName}</div>
              <div className="text-[10px] text-neutral-400">
                Primary Stack: <span className="text-neutral-300 font-mono font-semibold">{projectSummary.primaryLanguage}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
              Adaptive Layer Active
            </span>
          </div>
        </div>

        {activeSubTab === "knowledge" ? (
          /* Architecture & Project Knowledge */
          <div className="space-y-3">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
              <div className="text-neutral-200 font-semibold flex items-center justify-between">
                <span>Discovered Tech Stack & Frameworks</span>
                <span className="text-[10px] text-neutral-400 font-mono">{projectSummary.architectureStyle}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {projectSummary.frameworks.map((fw) => (
                  <span
                    key={fw}
                    className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-neutral-200 rounded text-[11px] font-mono flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3 text-sky-400" />
                    {fw}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                <div className="text-neutral-400 text-[10px] uppercase">Service & API Modules</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">{projectSummary.servicesCount}</div>
                <div className="text-[10px] text-neutral-500">FastAPI Routers, Workers, DB Models</div>
              </div>

              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                <div className="text-neutral-400 text-[10px] uppercase">Tracked Dependencies</div>
                <div className="text-lg font-bold text-sky-400 mt-0.5">{projectSummary.dependenciesCount}</div>
                <div className="text-[10px] text-neutral-500">Verified via pyproject & package.json</div>
              </div>
            </div>
          </div>
        ) : activeSubTab === "memory" ? (
          /* Scoped Memory Explorer */
          <div className="space-y-3">
            {/* Search & Scope Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search project memory & preferences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-lg">
                {["ALL", "PROJECT", "USER", "TASK"].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setSelectedScope(sc)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                      selectedScope === sc
                        ? "bg-neutral-800 text-neutral-200"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {/* Memory List */}
            <div className="space-y-2">
              {filteredMemories.map((mem) => (
                <div key={mem.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          mem.scope === "USER"
                            ? "bg-purple-950 text-purple-400 border border-purple-800"
                            : "bg-sky-950 text-sky-400 border border-sky-800"
                        }`}
                      >
                        {mem.scope}
                      </span>
                      <span className="font-semibold text-neutral-200">{mem.title}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                      <span>Conf: <strong className="text-emerald-400">{Math.round(mem.confidence * 100)}%</strong></span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                        {mem.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-neutral-300 text-xs leading-relaxed">{mem.content}</p>

                  <div className="text-[10px] text-neutral-500 font-mono">
                    Source: {mem.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeSubTab === "antipatterns" ? (
          /* Experience & Anti-Patterns */
          <div className="space-y-2">
            <div className="text-xs text-neutral-400 font-semibold mb-1">
              Active Anti-Patterns ("Failed Approach Avoidance"):
            </div>

            {antiPatterns.map((ap) => (
              <div key={ap.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{ap.problem}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[9px] font-mono font-bold">
                    Occurrences: {ap.occurrences}
                  </span>
                </div>

                <div className="text-neutral-400 text-xs">
                  <strong className="text-neutral-300">Bad Approach:</strong> {ap.bad_approach}
                </div>

                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded text-emerald-300 text-xs">
                  <strong>Recommended Alternative:</strong> {ap.solution}
                </div>
              </div>
            ))}
          </div>
        ) : activeSubTab === "skills" ? (
          /* Learned Skills */
          <div className="space-y-2">
            <div className="text-xs text-neutral-400 font-semibold mb-1">
              Learned Engineering Procedures & Evidence Ladder:
            </div>

            {skills.map((sk) => (
              <div key={sk.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-neutral-200">{sk.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      sk.tier === "TRUSTED"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-purple-950 text-purple-400 border border-purple-800"
                    }`}
                  >
                    {sk.tier} ({sk.successRate}% pass, {sk.successCount} runs)
                  </span>
                </div>

                <div className="space-y-1 bg-neutral-900/50 p-2.5 rounded font-mono text-[11px] text-neutral-300">
                  {sk.steps.map((st, i) => (
                    <div key={i}>{st}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Governance & Reset Controls */
          <div className="space-y-4">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
              <div className="font-semibold text-neutral-200 text-xs">Adaptive Intelligence Settings</div>

              <div className="space-y-2">
                {Object.entries(settings).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-neutral-900 last:border-0">
                    <span className="text-neutral-300 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <button
                      onClick={() => setSettings({ ...settings, [key]: !val })}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        val
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-neutral-900 text-neutral-500 border border-neutral-800"
                      }`}
                    >
                      {val ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone: Start Fresh / Reset */}
            <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <RotateCcw className="w-4 h-4" />
                <span>Start Fresh / Reset Project Intelligence</span>
              </div>
              <p className="text-neutral-400 text-xs">
                Clears all learned project memories, experiences, skills, and model performance history.
                <strong className="text-neutral-200"> Project source files and Git history remain 100% untouched.</strong>
              </p>
              <button
                onClick={() => setResetModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition"
              >
                Clear Project Intelligence
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Project Intelligence Reset</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to reset learned intelligence for this project?
              This will remove all project-scoped memories, anti-patterns, and derived skills.
              Your repository files, git commits, and global user preferences will not be modified.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResetModalOpen(false)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResetIntelligence}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
              >
                Yes, Reset Intelligence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
