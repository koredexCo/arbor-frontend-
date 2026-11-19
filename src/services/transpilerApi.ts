/**
 * Arbor Level 2 Milestone 1 Phase 3 — Python-to-C++ Transpiler REST API Client
 * Authoritative contracts:
 * - POST /api/v2/transpiler/inspect
 * - POST /api/v2/transpiler/transpile
 * - GET  /api/v2/transpiler/records/{record_id}
 */

import { getAccessToken } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface SourceDiagnostic {
  severity: "INFO" | "WARNING" | "ERROR";
  line: number;
  column?: number;
  message: string;
  rule?: string;
}

export interface SourceAnalysisReport {
  is_valid: boolean;
  source_manifest_hash: string;
  ast_node_count: number;
  functions: string[];
  classes: string[];
  imports: string[];
  unsupported_constructs: string[];
  diagnostics: SourceDiagnostic[];
}

export interface TranspilationProvenance {
  workspace_id: string;
  project_id?: string;
  mission_id?: string;
  session_id?: string;
  action_id?: string;
  source_path: string;
  source_manifest_hash: string;
  transpiler_version: string;
  ir_version: string;
  target_standard: string;
  required_compiler_flags: string[];
  generated_cpp_manifest_hash?: string;
  compiled_binary_hash?: string;
  toolchain?: string;
  compiler_version?: string;
}

export interface TranspilationRequest {
  workspace_id: string;
  source_file: string;
  source_code?: string;
  source_manifest_hash?: string;
  target_standard?: string;
  optimization_flags?: string[];
  project_id?: string;
  mission_id?: string;
  session_id?: string;
  action_id?: string;
  auto_compile?: boolean;
  auto_verify?: boolean;
  verification_fixtures?: Array<Record<string, unknown>>;
}

export interface VerificationResult {
  is_congruent: boolean;
  status: "PENDING" | "TRANSPILED" | "COMPILED" | "EMPIRICALLY_CONGRUENT" | "DIVERGENCE_DETECTED" | "FAILED";
  total_fixtures: number;
  passed_fixtures: number;
  divergent_fixture?: Record<string, unknown>;
  diagnostics: SourceDiagnostic[];
  evidence_hash?: string;
}

export interface TranspilationResult {
  success: boolean;
  record_id?: string;
  status: "PENDING" | "TRANSPILED" | "COMPILED" | "EMPIRICALLY_CONGRUENT" | "DIVERGENCE_DETECTED" | "FAILED";
  worker_stage: "PARSING_AST" | "EMITTING_IR" | "CODEGEN_CPP" | "COMPILING_NATIVE" | "VERIFYING_EQUIVALENCE";
  source_manifest_hash: string;
  generated_cpp_manifest_hash?: string;
  cpp_code?: string;
  header_code?: string;
  ir_dump?: string;
  required_compiler_flags: string[];
  provenance: TranspilationProvenance;
  diagnostics: SourceDiagnostic[];
  failure_classification?: string;
  error_message?: string;
  binary_path?: string;
  compiled_binary_hash?: string;
  verification_result?: VerificationResult;
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  let token = "";
  try {
    token = await getAccessToken();
  } catch {
    // In dev mode or unauthenticated fallback
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Transpiler API Error (${res.status}): ${errText || res.statusText}`);
  }

  return res;
}

/**
 * Statically analyzes Python source code, validating AST constructs and emitting diagnostics.
 */
export async function inspectSourceCode(
  sourceCode: string,
  filePath: string = "source.py",
  workspaceId?: string
): Promise<SourceAnalysisReport> {
  const headers: Record<string, string> = {};
  if (workspaceId) {
    headers["X-Workspace-ID"] = workspaceId;
  }

  const res = await fetchWithAuth("/api/v2/transpiler/inspect", {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      file_path: filePath,
    }),
  });

  return await res.json();
}

/**
 * Executes authoritative Python-to-C++ transpilation, native compilation, and equivalence verification pipeline.
 */
export async function executeTranspilation(
  request: TranspilationRequest
): Promise<TranspilationResult> {
  const headers: Record<string, string> = {
    "X-Workspace-ID": request.workspace_id,
  };

  const res = await fetchWithAuth("/api/v2/transpiler/transpile", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  return await res.json();
}

/**
 * Retrieves a durable transpilation record by ID.
 */
export async function getTranspilationRecord(
  recordId: string,
  workspaceId: string
): Promise<TranspilationResult> {
  const res = await fetchWithAuth(
    `/api/v2/transpiler/records/${encodeURIComponent(recordId)}?workspace_id=${encodeURIComponent(workspaceId)}`,
    {
      headers: {
        "X-Workspace-ID": workspaceId,
      },
    }
  );

  return await res.json();
}
