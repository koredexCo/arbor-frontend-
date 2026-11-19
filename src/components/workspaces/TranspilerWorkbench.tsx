import React, { useState } from "react";
import {
  Zap,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Save,
  Download,
  Terminal,
  ShieldAlert,
  Cpu,
  Layers,
  FileCheck,
  Lock
} from "lucide-react";
import {
  inspectSourceCode,
  executeTranspilation,
  type SourceAnalysisReport,
  type TranspilationResult,
  type SourceDiagnostic,
} from "../../services/transpilerApi";
import { writeWorkspaceFile } from "../../services/agentApi";

interface TranspilerWorkbenchProps {
  workspaceId: string;
  branchId: string;
  initialPythonCode?: string;
  currentFilePath?: string;
  className?: string;
  onSavedToWorkspace?: (filePath: string) => void;
  readOnly?: boolean;
}

export const TranspilerWorkbench: React.FC<TranspilerWorkbenchProps> = ({
  workspaceId,
  branchId,
  initialPythonCode = `def calculate_fibonacci(n: int) -> int:
    if n <= 1:
        return n
    a: int = 0
    b: int = 1
    for i in range(2, n + 1):
        c: int = a + b
        a = b
        b = c
    return b

def handle_request(n: int) -> dict:
    val = calculate_fibonacci(n)
    return {"status": "ok", "value": val}
`,
  currentFilePath = "server.py",
  className = "",
  onSavedToWorkspace,
  readOnly = false,
}) => {
  const [pythonCode, setPythonCode] = useState(initialPythonCode);
  const [targetStandard, setTargetStandard] = useState<string>("c++20");
  const [analyzing, setAnalyzing] = useState(false);
  const [transpiling, setTranspiling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [analysisReport, setAnalysisReport] = useState<SourceAnalysisReport | null>(null);
  const [transpileResult, setTranspileResult] = useState<TranspilationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. AST Static Inspection
  const handleInspect = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const report = await inspectSourceCode(pythonCode, currentFilePath, workspaceId);
      setAnalysisReport(report);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`AST Inspection Error: ${errMsg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. Authoritative Transpilation Pipeline
  const handleTranspile = async () => {
    setTranspiling(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const result = await executeTranspilation({
        workspace_id: workspaceId,
        source_file: currentFilePath,
        source_code: pythonCode,
        target_standard: targetStandard,
        auto_compile: false, // Explicitly separate compilation
        auto_verify: false,  // Explicitly separate behavioral verification
      });
      setTranspileResult(result);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Transpilation Pipeline Error: ${errMsg}`);
    } finally {
      setTranspiling(false);
    }
  };

  // Save generated C++ to workspace
  const handleSaveCpp = async () => {
    if (readOnly || !transpileResult?.cpp_code) return;
    setSaving(true);
    const targetCppPath = currentFilePath.replace(/\.py$/, ".cpp");
    try {
      await writeWorkspaceFile(workspaceId, branchId, targetCppPath, transpileResult.cpp_code);
      setSaveSuccess(`Saved '${targetCppPath}' to workspace jail.`);
      if (onSavedToWorkspace) onSavedToWorkspace(targetCppPath);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Save Error: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!transpileResult?.cpp_code) return;
    navigator.clipboard.writeText(transpileResult.cpp_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-app-card border border-app-border rounded-xl p-4 flex flex-col text-app-text overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-app-muted shrink-0" />
          <h2 className="text-sm font-bold tracking-tight">Python-to-C++ Transpiler Workbench</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-app-secondary border border-app-subtle text-app-dim">
            REST API v2
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={targetStandard}
            onChange={(e) => setTargetStandard(e.target.value)}
            className="bg-app-bg border border-app-border rounded px-2 py-1 text-xs text-app-text font-mono focus:outline-none"
          >
            <option value="c++17">C++17</option>
            <option value="c++20">C++20</option>
            <option value="c++23">C++23</option>
          </select>

          <button
            onClick={handleInspect}
            disabled={analyzing || transpiling}
            className="px-2.5 py-1 bg-app-secondary hover:bg-app-tertiary border border-app-border rounded text-xs font-medium text-app-text transition disabled:opacity-50"
          >
            {analyzing ? "Inspecting AST..." : "Inspect AST"}
          </button>

          <button
            onClick={handleTranspile}
            disabled={transpiling || analyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-app-accent hover:opacity-90 text-app-inverted rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Play className={`w-3 h-3 ${transpiling ? "animate-spin" : ""}`} />
            <span>{transpiling ? "Transpiling..." : "Transpile to C++"}</span>
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="my-2 p-2.5 bg-app-secondary border border-app-border rounded-lg text-xs text-app-text flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-app-muted shrink-0 mt-0.5" />
          <div className="flex-1 font-mono text-[11px] leading-relaxed">{error}</div>
        </div>
      )}

      {/* Main 2-Pane Editor View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 py-3 min-h-0 overflow-hidden">
        {/* Left Pane: Python Source */}
        <div className="flex flex-col bg-app-bg border border-app-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-app-secondary border-b border-app-border text-[11px] font-mono text-app-dim">
            <span>Stage 1: Python Source ({currentFilePath})</span>
            <span>{pythonCode.split("\n").length} lines</span>
          </div>
          <textarea
            value={pythonCode}
            onChange={(e) => setPythonCode(e.target.value)}
            className="flex-1 p-3 bg-transparent text-xs font-mono text-app-text resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Generated C++ Output */}
        <div className="flex flex-col bg-app-bg border border-app-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-app-secondary border-b border-app-border text-[11px] font-mono text-app-dim">
            <span>Stage 3: Generated {targetStandard.toUpperCase()} Code</span>
            <div className="flex items-center gap-1">
              {transpileResult?.cpp_code && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-app-card rounded text-app-muted hover:text-app-text transition"
                    title="Copy C++ Code"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={handleSaveCpp}
                    disabled={readOnly || saving}
                    className="p-1 hover:bg-app-card rounded text-app-muted hover:text-app-text transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={readOnly ? "File saving disabled in read-only mode" : "Save to Workspace Jail"}
                    data-testid="transpiler-save-button"
                  >
                    {readOnly ? <Lock className="w-3 h-3 text-amber-500" /> : <Save className="w-3 h-3" />}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 p-3 overflow-auto font-mono text-xs text-app-text whitespace-pre">
            {transpileResult?.cpp_code ? (
              transpileResult.cpp_code
            ) : (
              <div className="text-app-dim italic text-center py-16">
                Click "Transpile to C++" to lower AST and generate structured C++ code.
              </div>
            )}
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-2 p-2 bg-app-secondary border border-app-border rounded text-[11px] font-mono text-app-text flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Pipeline Verification Stage Matrix */}
      <div className="border-t border-app-border pt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="p-2 bg-app-bg border border-app-border rounded">
          <div className="text-[10px] uppercase text-app-dim font-bold">1. Python Source</div>
          <div className="font-semibold text-app-text mt-0.5">VALID</div>
        </div>

        <div className="p-2 bg-app-bg border border-app-border rounded">
          <div className="text-[10px] uppercase text-app-dim font-bold">2. AST Analysis</div>
          <div className="font-semibold text-app-text mt-0.5">
            {analysisReport ? (analysisReport.is_valid ? "VALIDATED" : "ERRORS DETECTED") : "PENDING"}
          </div>
        </div>

        <div className="p-2 bg-app-bg border border-app-border rounded">
          <div className="text-[10px] uppercase text-app-dim font-bold">3. C++ Codegen</div>
          <div className="font-semibold text-app-text mt-0.5">
            {transpileResult ? transpileResult.status : "PENDING"}
          </div>
        </div>

        <div className="p-2 bg-app-bg border border-app-border rounded opacity-75">
          <div className="text-[10px] uppercase text-app-dim font-bold">4. Native Binary</div>
          <div className="font-semibold text-app-dim mt-0.5">UNAVAILABLE</div>
        </div>

        <div className="p-2 bg-app-bg border border-app-border rounded opacity-75">
          <div className="text-[10px] uppercase text-app-dim font-bold">5. Congruence</div>
          <div className="font-semibold text-app-dim mt-0.5">UNVERIFIED</div>
        </div>
      </div>

      {/* AST Diagnostics List (if any) */}
      {analysisReport?.diagnostics && analysisReport.diagnostics.length > 0 && (
        <div className="mt-3 p-2.5 bg-app-secondary border border-app-border rounded-lg text-xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-app-dim">
            AST Static Diagnostics ({analysisReport.diagnostics.length})
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {analysisReport.diagnostics.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-app-text">
                <span className="text-app-muted">Line {d.line}:</span>
                <span>{d.message}</span>
                {d.rule && <span className="text-[9px] text-app-dim">[{d.rule}]</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
