import React, { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Play, Trash2, CheckCircle2, XCircle, Square, AlertCircle, RefreshCw, Lock } from "lucide-react";
import { executeAgentTool } from "../services/agentApi";

interface LogEntry {
  id: string;
  type: "stdout" | "stderr" | "system" | "command";
  text: string;
  exitCode?: number | null;
  durationMs?: number;
  timestamp: string;
}

interface TerminalPanelProps {
  workspaceId: string;
  branchId: string;
  className?: string;
  onRequireApproval?: (req: any) => void;
  readOnly?: boolean;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  workspaceId,
  branchId,
  className = "",
  onRequireApproval,
  readOnly = false,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      type: "system",
      text: "Arbor Authorized Terminal Ready. Commands execute safely in project jail.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleRunCommand = async (cmdToRun?: string) => {
    if (readOnly) {
      const blockedEntry: LogEntry = {
        id: Math.random().toString(),
        type: "system",
        text: "Notice: Terminal execution is disabled in strict read-only mode.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setLogs((prev) => [...prev, blockedEntry]);
      return;
    }
    const cmd = (cmdToRun || command).trim();
    if (!cmd || running) return;

    const cmdEntry: LogEntry = {
      id: Math.random().toString(),
      type: "command",
      text: `$ ${cmd}`,
      timestamp: new Date().toLocaleTimeString(),
    };

    setLogs((prev) => [...prev, cmdEntry]);
    if (!cmdToRun) setCommand("");
    setRunning(true);

    try {
      const res = await executeAgentTool({
        workspace_id: workspaceId,
        branch_id: branchId,
        tool_name: "terminal.exec",
        parameters: { command: cmd },
        risk_level: "execute",
      });

      if (res.status === "require_approval" && onRequireApproval) {
        onRequireApproval({
          toolName: "terminal.exec",
          command: cmd,
          riskTier: "execute",
          reason: res.result?.reason || "Execution requires confirmation",
        });
        setRunning(false);
        return;
      }

      const stdout = res.result?.stdout;
      const stderr = res.result?.stderr;
      const exitCode = res.result?.exit_code;
      const durationMs = res.duration_ms;

      if (stdout) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            type: "stdout",
            text: stdout,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }

      if (stderr) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            type: "stderr",
            text: stderr,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }

      const isOk = exitCode === 0;
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: "system",
          text: `Process finished with exit code ${exitCode} (${durationMs ? durationMs.toFixed(0) : 0}ms)`,
          exitCode,
          durationMs,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: "stderr",
          text: `Execution failed: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setRunning(false);
      setActiveJobId(null);
    }
  };

  const handleCancelProcess = async () => {
    if (!running) return;
    try {
      await executeAgentTool({
        workspace_id: workspaceId,
        branch_id: branchId,
        tool_name: "terminal.cancel",
        parameters: { execution_id: activeJobId || "" },
        risk_level: "safe",
      });
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: "system",
          text: "Cancellation signal sent to local agent daemon.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: "stderr",
          text: `Failed to cancel: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  return (
    <div className={`bg-app-card border border-app-border rounded-xl flex flex-col overflow-hidden text-app-text font-mono text-xs shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-app-bg border-b border-app-border select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-app-muted shrink-0" />
          <span className="text-xs font-semibold font-sans">Authorized Terminal & Task Runner</span>
          <span className="text-[10px] text-app-dim truncate">[{workspaceId}]</span>
          {readOnly && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold"
              data-testid="terminal-read-only-badge"
            >
              READ-ONLY
            </span>
          )}
        </div>

        {/* Task Shortcuts */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRunCommand("pytest -v")}
            disabled={readOnly || running}
            title={readOnly ? "Terminal execution disabled in read-only mode" : "Run Pytest in workspace jail"}
            className="px-2 py-0.5 rounded bg-app-secondary border border-app-subtle hover:bg-app-tertiary text-[10px] text-app-text transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Pytest
          </button>
          <button
            onClick={() => handleRunCommand("git status")}
            disabled={readOnly || running}
            title={readOnly ? "Terminal execution disabled in read-only mode" : "Run git status in workspace jail"}
            className="px-2 py-0.5 rounded bg-app-secondary border border-app-subtle hover:bg-app-tertiary text-[10px] text-app-text transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Git Status
          </button>
          <button
            onClick={() => setLogs([])}
            className="p-1 hover:bg-app-secondary rounded text-app-dim hover:text-app-text transition"
            title="Clear terminal logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Log Output Window */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-app-bg leading-relaxed">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <span className="select-none text-app-dim text-[10px] shrink-0 pt-0.5">
              {log.timestamp}
            </span>

            {log.type === "command" ? (
              <span className="text-app-text font-semibold break-all">{log.text}</span>
            ) : log.type === "stderr" ? (
              <span className="text-app-text font-medium opacity-90 break-all whitespace-pre-wrap">
                {log.text}
              </span>
            ) : log.type === "system" ? (
              <span className="text-app-muted italic break-all flex items-center gap-1">
                {log.exitCode !== undefined && log.exitCode !== null && (
                  log.exitCode === 0 ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-app-muted shrink-0" />
                  )
                )}
                {log.text}
              </span>
            ) : (
              <span className="text-app-text break-all whitespace-pre-wrap">{log.text}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRunCommand();
        }}
        className="flex items-center gap-2 p-2 bg-app-card border-t border-app-border"
      >
        <span className="select-none text-app-muted pl-1">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={readOnly ? "Terminal execution is disabled in strict read-only mode." : running ? "Command currently executing in sandbox..." : "Enter shell command to execute in project jail..."}
          disabled={readOnly || running}
          className="flex-1 bg-transparent text-xs text-app-text placeholder-app-dim focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          data-testid="terminal-command-input"
        />

        {running ? (
          <button
            type="button"
            onClick={handleCancelProcess}
            className="flex items-center gap-1 px-2.5 py-1 bg-app-secondary border border-app-border hover:bg-app-tertiary text-app-text text-xs rounded transition"
          >
            <Square className="w-3 h-3" />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={readOnly || !command.trim()}
            className="p-1.5 bg-app-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-app-inverted rounded transition"
            title={readOnly ? "Terminal execution disabled in read-only mode" : "Execute command"}
            data-testid="terminal-execute-button"
          >
            {readOnly ? <Lock className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3" />}
          </button>
        )}
      </form>
    </div>
  );
};
