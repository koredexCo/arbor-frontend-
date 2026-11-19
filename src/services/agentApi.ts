import { getAccessToken } from "./api";
import type {
  AgentStatus,
  ToolExecutePayload,
  ExecutionRecord,
  ToolExecuteResult,
  BrowserNavigateResult,
  BrowserObserveResult,
  BrowserClickResult,
  BrowserTypeResult,
  BrowserScreenshotResult,
  BrowserVerifyResult,
  BrowserStatusResult,
  EnrolledNode,
} from "../types/agent";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface FileEntry {
  name: string;
  is_dir: boolean;
  size_bytes: number;
}

export interface FsListResult {
  entries: FileEntry[];
  path: string;
}

export interface FsReadResult {
  content: string;
  path: string;
  size_bytes?: number;
}

export interface FsWriteResult {
  path: string;
  bytes_written?: number;
  success: boolean;
}

export interface GitStatusResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface GitDiffResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  let token = "";
  try {
    token = await getAccessToken();
  } catch {
    // In dev mode or bypass
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
    throw new Error(`Agent API Error (${res.status}): ${errText || res.statusText}`);
  }

  return res;
}

export async function getAgentStatus(workspaceId: string): Promise<AgentStatus> {
  try {
    const res = await fetchWithAuth(`/agent/status?workspace_id=${encodeURIComponent(workspaceId)}`);
    return await res.json();
  } catch {
    return {
      connected: false,
      workspace_id: workspaceId,
      capabilities: [],
    };
  }
}

export async function executeAgentTool(payload: ToolExecutePayload): Promise<ToolExecuteResult> {
  const res = await fetchWithAuth("/agent/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function getBranchExecutions(branchId: string): Promise<{ executions: ExecutionRecord[] }> {
  try {
    const res = await fetchWithAuth(`/agent/executions/${encodeURIComponent(branchId)}`);
    return await res.json();
  } catch {
    return { executions: [] };
  }
}

/**
 * Lists entries in a directory relative to the workspace jail.
 */
export async function listWorkspaceFiles(
  workspaceId: string,
  branchId: string,
  dirPath: string = "."
): Promise<FsListResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "fs.list_dir",
    parameters: { path: dirPath },
    risk_level: "safe",
  });

  if (res.status === "error" || res.status === "blocked") {
    throw new Error(res.result?.error || "Failed to list workspace files");
  }

  return {
    entries: (res.result?.entries || []) as FileEntry[],
    path: (res.result?.path || dirPath) as string,
  };
}

/**
 * Reads a text file within the workspace jail.
 */
export async function readWorkspaceFile(
  workspaceId: string,
  branchId: string,
  filePath: string,
  startLine?: number,
  endLine?: number
): Promise<FsReadResult> {
  const params: Record<string, unknown> = { path: filePath };
  if (startLine !== undefined) params.start_line = startLine;
  if (endLine !== undefined) params.end_line = endLine;

  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "fs.read",
    parameters: params,
    risk_level: "safe",
  });

  if (res.status === "error" || res.status === "blocked") {
    throw new Error(res.result?.error || `Failed to read file '${filePath}'`);
  }

  return {
    content: (res.result?.content || "") as string,
    path: filePath,
    size_bytes: res.result?.size_bytes as number | undefined,
  };
}

/**
 * Writes text content to a file within the workspace jail.
 */
export async function writeWorkspaceFile(
  workspaceId: string,
  branchId: string,
  filePath: string,
  content: string
): Promise<FsWriteResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "fs.write",
    parameters: { path: filePath, content },
    risk_level: "medium",
  });

  if (res.status === "error" || res.status === "blocked") {
    throw new Error(res.result?.error || `Failed to write file '${filePath}'`);
  }

  return {
    path: filePath,
    bytes_written: res.result?.bytes_written as number | undefined,
    success: true,
  };
}

/**
 * Deletes a file within the workspace jail.
 */
export async function deleteWorkspaceFile(
  workspaceId: string,
  branchId: string,
  filePath: string
): Promise<void> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "fs.delete",
    parameters: { path: filePath },
    risk_level: "high",
  });

  if (res.status === "error" || res.status === "blocked") {
    throw new Error(res.result?.error || `Failed to delete '${filePath}'`);
  }
}

/**
 * Retrieves working tree git status.
 */
export async function getGitStatus(
  workspaceId: string,
  branchId: string
): Promise<GitStatusResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "git.status",
    parameters: {},
    risk_level: "safe",
  });

  return {
    stdout: (res.result?.stdout || "") as string,
    stderr: (res.result?.stderr || "") as string,
    exit_code: (res.result?.exit_code ?? 0) as number,
  };
}

/**
 * Retrieves uncommitted working tree git diff.
 */
export async function getGitDiff(
  workspaceId: string,
  branchId: string
): Promise<GitDiffResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "git.diff",
    parameters: {},
    risk_level: "safe",
  });

  return {
    stdout: (res.result?.stdout || "") as string,
    stderr: (res.result?.stderr || "") as string,
    exit_code: (res.result?.exit_code ?? 0) as number,
  };
}

/**
 * Commits staged or modified files to git.
 */
export async function commitGitChanges(
  workspaceId: string,
  branchId: string,
  message: string
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "git.commit",
    parameters: { message },
    risk_level: "high",
  });

  return {
    stdout: (res.result?.stdout || "") as string,
    stderr: (res.result?.stderr || "") as string,
    exit_code: (res.result?.exit_code ?? 0) as number,
  };
}

// =========================================================================
// PHASE G: COMPUTER OPERATOR & DEVICE NODE APIs
// =========================================================================

/**
 * Lists enrolled execution nodes and machine devices.
 */
export async function listEnrolledNodes(): Promise<{ nodes: EnrolledNode[]; count: number }> {
  try {
    const res = await fetchWithAuth("/agent/nodes");
    const data = await res.json();
    return {
      nodes: Array.isArray(data) ? data : (data.nodes || []),
      count: Array.isArray(data) ? data.length : (data.count || 0),
    };
  } catch {
    return { nodes: [], count: 0 };
  }
}

/**
 * Revokes an enrolled node by ID.
 */
export async function revokeEnrolledNode(nodeId: string): Promise<any> {
  const res = await fetchWithAuth(`/agent/nodes/${encodeURIComponent(nodeId)}/revoke`, {
    method: "POST",
  });
  return await res.json();
}

/**
 * Navigates the workspace browser session to an authorized URL.
 */
export async function navigateBrowser(
  workspaceId: string,
  branchId: string,
  url: string,
  timeout: number = 30
): Promise<BrowserNavigateResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.navigate",
    parameters: { url, timeout },
    risk_level: "read",
  });

  if (res.status === "blocked") {
    throw new Error(res.result?.error || "Browser navigation blocked by security policy");
  }

  return res.result as BrowserNavigateResult;
}

/**
 * Observes page structure, interactive elements, and untrusted text.
 */
export async function observeBrowserPage(
  workspaceId: string,
  branchId: string,
  maxTextLength: number = 5000
): Promise<BrowserObserveResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.observe",
    parameters: { max_text_length: maxTextLength },
    risk_level: "safe",
  });

  return res.result as BrowserObserveResult;
}

/**
 * Clicks an accessible element in the browser page.
 */
export async function clickBrowserElement(
  workspaceId: string,
  branchId: string,
  selector: string,
  timeout: number = 10
): Promise<BrowserClickResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.click",
    parameters: { selector, timeout },
    risk_level: "modify",
  });

  return res.result as BrowserClickResult;
}

/**
 * Types text into an accessible element, automatically redacting sensitive secrets.
 */
export async function typeBrowserText(
  workspaceId: string,
  branchId: string,
  selector: string,
  text: string,
  clear: boolean = true
): Promise<BrowserTypeResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.type",
    parameters: { selector, text, clear },
    risk_level: "modify",
  });

  return res.result as BrowserTypeResult;
}

/**
 * Captures a screenshot of the active browser viewport or full page.
 */
export async function captureBrowserScreenshot(
  workspaceId: string,
  branchId: string,
  fullPage: boolean = false
): Promise<BrowserScreenshotResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.screenshot",
    parameters: { full_page: fullPage },
    risk_level: "safe",
  });

  return res.result as BrowserScreenshotResult;
}

/**
 * Verifies postconditions (URL, text, element) against live browser state.
 */
export async function verifyBrowserPostcondition(
  workspaceId: string,
  branchId: string,
  expectations: {
    expected_url?: string;
    expected_text?: string;
    expected_element?: string;
    timeout?: number;
  }
): Promise<BrowserVerifyResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.verify_postcondition",
    parameters: expectations,
    risk_level: "safe",
  });

  return res.result as BrowserVerifyResult;
}

/**
 * Gets live status and metrics for the workspace browser session.
 */
export async function getBrowserStatus(
  workspaceId: string,
  branchId: string
): Promise<BrowserStatusResult> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.status",
    parameters: {},
    risk_level: "safe",
  });

  return res.result as BrowserStatusResult;
}

/**
 * Cleanly terminates the workspace browser session.
 */
export async function closeBrowserSession(
  workspaceId: string,
  branchId: string
): Promise<{ closed: boolean }> {
  const res = await executeAgentTool({
    workspace_id: workspaceId,
    branch_id: branchId,
    tool_name: "browser.close_session",
    parameters: {},
    risk_level: "safe",
  });

  return (res.result || { closed: true }) as { closed: boolean };
}

