import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Code2,
  Zap,
  Save,
  Check,
  FileCode,
  Play,
  Copy,
  ArrowRight,
  GitCompare,
  Columns,
  List,
  RotateCcw,
  Plus,
  Minus,
  AlertCircle,
  X,
  Lock
} from "lucide-react";
import { executeAgentTool, readWorkspaceFile, writeWorkspaceFile } from "../services/agentApi";

export interface FileTab {
  name: string;
  language: string;
  content: string;
  baselineContent: string;
  isModified?: boolean;
}

interface DiffLine {
  type: "added" | "deleted" | "unchanged";
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface CodeEditorPanelProps {
  workspaceId: string;
  branchId: string;
  currentFile?: string | null;
  className?: string;
  onCodeExecuted?: (output: string) => void;
  onFileSaved?: (filePath: string) => void;
  readOnly?: boolean;
}

/**
 * Computes a line-by-line diff using Longest Common Subsequence (LCS).
 */
function computeLineDiff(originalText: string, modifiedText: string): DiffLine[] {
  const oldLines = originalText.split("\n");
  const newLines = modifiedText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;

  // LCS Matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const diff: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({
        type: "unchanged",
        text: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: "added",
        text: newLines[j - 1],
        newLineNumber: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({
        type: "deleted",
        text: oldLines[i - 1],
        oldLineNumber: i,
      });
      i--;
    }
  }

  return diff;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  workspaceId,
  branchId,
  currentFile,
  className = "",
  onCodeExecuted,
  onFileSaved,
  readOnly = false,
}) => {
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      name: "server.py",
      language: "python",
      baselineContent: `def calculate_fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)

def handle_request(n: int) -> dict:
    result = calculate_fibonacci(n)
    return {"status": "ok", "value": result}
`,
      content: `def calculate_fibonacci(n: int) -> int:
    if n <= 1:
        return n
    a = 0
    b = 1
    for i in range(2, n + 1):
        c = a + b
        a = b
        b = c
    return b

def handle_request(n: int) -> dict:
    result = calculate_fibonacci(n)
    return {"status": "ok", "value": result}
`,
      isModified: true,
    },
  ]);

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"edit" | "diff">("edit");
  const [diffLayout, setDiffLayout] = useState<"unified" | "split">("unified");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Clear open tabs when switching workspace to prevent cross-workspace buffer leakage
  useEffect(() => {
    setTabs([]);
    setActiveTabIndex(0);
    setViewMode("edit");
    setSaveError(null);
  }, [workspaceId]);

  // Load file dynamically when currentFile changes
  useEffect(() => {
    if (!currentFile) return;

    // Check if file is already open
    const existingIndex = tabs.findIndex((t) => t.name === currentFile);
    if (existingIndex >= 0) {
      setActiveTabIndex(existingIndex);
      return;
    }

    // Otherwise, fetch file content from workspace jail
    let cancelled = false;
    const loadFile = async () => {
      try {
        const fileData = await readWorkspaceFile(workspaceId, branchId, currentFile);
        if (cancelled) return;

        const lang = currentFile.endsWith(".py")
          ? "python"
          : currentFile.endsWith(".cpp") || currentFile.endsWith(".h")
          ? "cpp"
          : currentFile.endsWith(".json")
          ? "json"
          : "plaintext";

        const newTab: FileTab = {
          name: currentFile,
          language: lang,
          baselineContent: fileData.content,
          content: fileData.content,
          isModified: false,
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabIndex(tabs.length);
      } catch (err: unknown) {
        if (cancelled) return;
        // Non-blocking fallback if agent offline
        console.warn(`Could not read file '${currentFile}' from workspace:`, err);
      }
    };

    loadFile();
    return () => {
      cancelled = true;
    };
  }, [currentFile, workspaceId, branchId]);

  const activeTab = tabs[activeTabIndex] || tabs[0];

  const diffLines = useMemo(() => {
    if (!activeTab) return [];
    return computeLineDiff(activeTab.baselineContent, activeTab.content);
  }, [activeTab?.baselineContent, activeTab?.content]);

  const diffStats = useMemo(() => {
    let added = 0;
    let deleted = 0;
    for (const d of diffLines) {
      if (d.type === "added") added++;
      if (d.type === "deleted") deleted++;
    }
    return { added, deleted, hasChanges: added > 0 || deleted > 0 };
  }, [diffLines]);

  const handleContentChange = (newContent: string) => {
    setTabs((prev) =>
      prev.map((t, idx) =>
        idx === activeTabIndex
          ? {
              ...t,
              content: newContent,
              isModified: newContent !== t.baselineContent,
            }
          : t
      )
    );
  };

  const handleSaveToProject = async () => {
    if (readOnly || !activeTab) return;
    setSaving(true);
    setSaveError(null);
    try {
      await writeWorkspaceFile(workspaceId, branchId, activeTab.name, activeTab.content);

      setTabs((prev) =>
        prev.map((t, idx) =>
          idx === activeTabIndex
            ? { ...t, baselineContent: t.content, isModified: false }
            : t
        )
      );
      setSavedMessage(true);
      if (onFileSaved) onFileSaved(activeTab.name);
      setTimeout(() => setSavedMessage(false), 2500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setSaveError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleRevertChanges = () => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t, idx) =>
        idx === activeTabIndex
          ? { ...t, content: t.baselineContent, isModified: false }
          : t
      )
    );
  };

  const handleCloseTab = (indexToClose: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return; // Keep at least one tab
    const tabToClose = tabs[indexToClose];
    if (tabToClose.isModified) {
      const confirmClose = window.confirm(
        `File '${tabToClose.name}' has unsaved changes. Discard changes and close tab?`
      );
      if (!confirmClose) return;
    }

    const nextTabs = tabs.filter((_, idx) => idx !== indexToClose);
    setTabs(nextTabs);
    setActiveTabIndex(Math.min(activeTabIndex, nextTabs.length - 1));
  };

  if (!activeTab) {
    return (
      <div className={`bg-app-card border border-app-border rounded-xl p-8 text-center text-app-dim ${className}`}>
        No active file selected. Choose a file from the explorer.
      </div>
    );
  }

  return (
    <div className={`bg-app-card border border-app-border rounded-xl flex flex-col overflow-hidden text-app-text shadow-sm ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 pt-2 bg-app-bg border-b border-app-border select-none">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab, idx) => (
            <div
              key={tab.name}
              onClick={() => setActiveTabIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg font-mono cursor-pointer transition border-t border-x ${
                activeTabIndex === idx
                  ? "bg-app-card text-app-text font-semibold border-app-border shadow-sm"
                  : "bg-transparent text-app-muted hover:text-app-text border-transparent"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-app-dim" />
              <span className="truncate max-w-[120px]">{tab.name}</span>
              {tab.isModified && (
                <span className="w-1.5 h-1.5 rounded-full bg-app-accent ml-0.5" title="Unsaved changes" />
              )}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(idx, e)}
                  className="p-0.5 hover:bg-app-secondary rounded text-app-dim hover:text-app-text ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* View Mode Toggle: Edit vs Diff */}
        <div className="flex items-center gap-1 pb-1">
          <div className="flex items-center p-0.5 bg-app-secondary border border-app-border rounded">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-2 py-0.5 text-[11px] rounded transition font-medium ${
                viewMode === "edit"
                  ? "bg-app-card text-app-text shadow-xs"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode("diff")}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition font-medium ${
                viewMode === "diff"
                  ? "bg-app-card text-app-text shadow-xs"
                  : "text-app-muted hover:text-app-text"
              }`}
            >
              <GitCompare className="w-3 h-3" />
              <span>Diff</span>
              {diffStats.hasChanges && (
                <span className="text-[10px] text-app-dim font-mono">
                  (+{diffStats.added} -{diffStats.deleted})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Sub-Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-app-secondary border-b border-app-subtle text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-app-dim">Workspace Scope:</span>
          <span className="text-app-text font-semibold">{workspaceId}</span>
          <span className="text-app-dim">/</span>
          <span className="text-app-text">{activeTab.name}</span>
          {readOnly && (
            <span
              className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30"
              data-testid="editor-read-only-badge"
            >
              READ-ONLY
            </span>
          )}
          {activeTab.isModified ? (
            <span className="text-[10px] text-app-dim uppercase font-sans font-medium px-1.5 py-0.2 rounded bg-app-bg border border-app-border">
              UNSAVED BUFFER
            </span>
          ) : (
            <span className="text-[10px] text-app-dim uppercase font-sans px-1.5 py-0.2 rounded bg-app-bg border border-app-subtle">
              SAVED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "diff" && (
            <div className="flex items-center border border-app-border rounded overflow-hidden">
              <button
                onClick={() => setDiffLayout("unified")}
                className={`p-1 ${
                  diffLayout === "unified" ? "bg-app-card text-app-text" : "text-app-dim hover:text-app-text"
                }`}
                title="Unified Diff View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDiffLayout("split")}
                className={`p-1 ${
                  diffLayout === "split" ? "bg-app-card text-app-text" : "text-app-dim hover:text-app-text"
                }`}
                title="Side-by-Side Split Diff View"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab.isModified && (
            <button
              onClick={handleRevertChanges}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-app-muted hover:text-app-text text-xs rounded hover:bg-app-card border border-transparent hover:border-app-border transition"
              title="Discard unsaved buffer changes"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Discard</span>
            </button>
          )}

          {readOnly ? (
            <button
              disabled={true}
              title="File saving is disabled in strict read-only mode"
              className="inline-flex items-center gap-1 px-3 py-1 bg-app-secondary text-app-dim border border-app-border text-xs font-semibold rounded cursor-not-allowed opacity-60 shadow-xs"
              data-testid="editor-save-disabled-button"
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Read-Only</span>
            </button>
          ) : (
            <button
              onClick={handleSaveToProject}
              disabled={saving || !activeTab.isModified}
              className="inline-flex items-center gap-1 px-3 py-1 bg-app-accent text-app-inverted text-xs font-semibold rounded hover:opacity-90 disabled:opacity-40 shadow-xs transition"
              data-testid="editor-save-button"
            >
              <Save className={`w-3 h-3 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving..." : "Save File"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Error or Success Alert */}
      {saveError && (
        <div className="p-2 bg-app-secondary border-b border-app-border text-xs text-app-text flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 text-app-muted shrink-0" />
          <span className="truncate">Save failed: {saveError} (Buffer preserved safely)</span>
        </div>
      )}

      {savedMessage && (
        <div className="p-2 bg-app-secondary border-b border-app-border text-xs text-app-text flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Authoritative write confirmed: '{activeTab.name}' saved to disk.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-app-bg">
        {viewMode === "edit" ? (
          <textarea
            value={activeTab.content}
            readOnly={readOnly}
            onChange={(e) => !readOnly && handleContentChange(e.target.value)}
            className="flex-1 w-full p-3 font-mono text-xs bg-transparent text-app-text resize-none focus:outline-none leading-relaxed"
            placeholder={readOnly ? "File editing is disabled in strict read-only mode." : undefined}
            spellCheck={false}
          />
        ) : diffLayout === "unified" ? (
          /* Unified Diff Viewer */
          <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-0.5">
            {!diffStats.hasChanges ? (
              <div className="p-8 text-center text-app-dim">
                No differences between current buffer and saved disk baseline.
              </div>
            ) : (
              diffLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded leading-relaxed ${
                    line.type === "added"
                      ? "bg-app-secondary text-app-text font-medium"
                      : line.type === "deleted"
                      ? "bg-app-card text-app-dim line-through opacity-70"
                      : "text-app-muted"
                  }`}
                >
                  <span className="w-8 text-right select-none text-[10px] text-app-dim pr-2 shrink-0">
                    {line.oldLineNumber || line.newLineNumber}
                  </span>
                  <span className="w-4 select-none text-[11px] font-bold shrink-0">
                    {line.type === "added" ? "+" : line.type === "deleted" ? "-" : " "}
                  </span>
                  <span className="whitespace-pre flex-1">{line.text}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Split Side-by-Side Diff Viewer */
          <div className="flex-1 grid grid-cols-2 divide-x divide-app-border overflow-hidden">
            {/* Left: Baseline Original */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-3 py-1 bg-app-secondary text-[10px] font-mono text-app-dim border-b border-app-border">
                Saved Baseline
              </div>
              <div className="flex-1 overflow-auto p-2 font-mono text-xs whitespace-pre text-app-dim">
                {activeTab.baselineContent}
              </div>
            </div>

            {/* Right: Modified Buffer */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-3 py-1 bg-app-secondary text-[10px] font-mono text-app-dim border-b border-app-border">
                Current Buffer (Unsaved)
              </div>
              <div className="flex-1 overflow-auto p-2 font-mono text-xs whitespace-pre text-app-text">
                {activeTab.content}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
