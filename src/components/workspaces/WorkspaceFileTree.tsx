import React, { useState, useEffect, useCallback } from "react";
import {
  Folder,
  FileCode,
  FileText,
  RefreshCw,
  FolderTree,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  FilePlus,
  ArrowUp,
  File
} from "lucide-react";
import { listWorkspaceFiles, type FileEntry } from "../../services/agentApi";

interface WorkspaceFileTreeProps {
  workspaceId: string;
  branchId: string;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  className?: string;
}

export const WorkspaceFileTree: React.FC<WorkspaceFileTreeProps> = ({
  workspaceId,
  branchId,
  selectedFile,
  onSelectFile,
  className = "",
}) => {
  const [currentDir, setCurrentDir] = useState<string>(".");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWorkspaceFiles(workspaceId, branchId, currentDir);
      setEntries(res.entries);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, branchId, currentDir]);

  useEffect(() => {
    setCurrentDir(".");
  }, [workspaceId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleOpenFolder = (folderName: string) => {
    const nextDir = currentDir === "." ? folderName : `${currentDir}/${folderName}`;
    setCurrentDir(nextDir);
  };

  const handleGoUp = () => {
    if (currentDir === ".") return;
    const parts = currentDir.split("/");
    parts.pop();
    setCurrentDir(parts.length === 0 ? "." : parts.join("/"));
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".py")) return <FileCode className="w-3.5 h-3.5 text-app-text" />;
    if (fileName.endsWith(".cpp") || fileName.endsWith(".hpp") || fileName.endsWith(".h"))
      return <FileCode className="w-3.5 h-3.5 text-app-text" />;
    if (fileName.endsWith(".json") || fileName.endsWith(".md") || fileName.endsWith(".txt"))
      return <FileText className="w-3.5 h-3.5 text-app-dim" />;
    return <File className="w-3.5 h-3.5 text-app-dim" />;
  };

  return (
    <div className={`bg-app-card border border-app-border rounded-xl p-3 flex flex-col overflow-hidden text-app-text ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-app-border text-xs font-semibold">
        <div className="flex items-center gap-1.5 truncate">
          <FolderTree className="w-3.5 h-3.5 text-app-muted shrink-0" />
          <span className="truncate">Files & Directories</span>
        </div>
        <div className="flex items-center gap-1">
          {currentDir !== "." && (
            <button
              onClick={handleGoUp}
              className="p-1 hover:bg-app-secondary rounded text-app-muted hover:text-app-text transition"
              title="Go to parent directory"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="p-1 hover:bg-app-secondary rounded text-app-muted hover:text-app-text transition"
            title="Refresh files"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumb path */}
      <div className="py-1 px-1 text-[11px] font-mono text-app-dim truncate border-b border-app-subtle">
        Path: <span className="text-app-text">{currentDir}</span>
      </div>

      {/* Directory Content List */}
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5 text-xs font-mono">
        {loading ? (
          <div className="p-4 text-center text-app-dim text-xs">Scanning workspace jail...</div>
        ) : error ? (
          <div className="p-3 bg-app-secondary border border-app-subtle rounded-lg text-app-dim text-xs space-y-1">
            <div className="flex items-center gap-1 text-app-muted font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Jail Read Blocked / Offline</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {error.includes("No active local agent")
                ? "No local node daemon connected for this workspace. File listing requires an enrolled agent."
                : error}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-center text-app-dim text-xs">Directory is empty.</div>
        ) : (
          entries.map((entry) => {
            const entryPath = currentDir === "." ? entry.name : `${currentDir}/${entry.name}`;
            const isSelected = selectedFile === entryPath;

            return (
              <button
                key={entry.name}
                onClick={() => (entry.is_dir ? handleOpenFolder(entry.name) : onSelectFile(entryPath))}
                className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition ${
                  isSelected
                    ? "bg-app-accent text-app-inverted font-semibold"
                    : "text-app-text hover:bg-app-secondary"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {entry.is_dir ? (
                    <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-app-inverted" : "text-app-muted"} shrink-0`} />
                  ) : (
                    getFileIcon(entry.name)
                  )}
                  <span className="truncate">{entry.name}</span>
                </div>
                {!entry.is_dir && entry.size_bytes !== undefined && (
                  <span className={`text-[10px] font-mono ${isSelected ? "text-app-inverted/80" : "text-app-dim"}`}>
                    {(entry.size_bytes / 1024).toFixed(1)}k
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
