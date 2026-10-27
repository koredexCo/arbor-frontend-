export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "blocked" | "denied";

export interface ExecutionRecord {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  conversation_id?: string | null;
  branch_id: string;
  node_id?: string | null;
  job_id: string;
  tool_name: string;
  tool_provider: "native" | "mcp" | "extension";
  input_payload: Record<string, unknown>;
  output_payload?: Record<string, unknown> | null;
  exit_code?: number | null;
  status: ExecutionStatus;
  duration_ms?: number | null;
  action_signature?: string | null;
  created_at: string;
}

export interface AgentStatus {
  connected: boolean;
  workspace_id: string;
  agent_id?: string | null;
  project_path?: string | null;
  capabilities: string[];
  connected_at?: number | null;
  os_info?: {
    platform?: string;
    release?: string;
    arch?: string;
    python?: string;
    shell?: string;
  };
  read_only?: boolean;
}

export interface ToolExecutePayload {
  workspace_id: string;
  branch_id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
  risk_level?: "safe" | "medium" | "high" | "read" | "modify" | "execute" | "destructive" | "critical";
  timeout_seconds?: number;
}

export interface ToolExecuteResult {
  success?: boolean;
  exit_code?: number | null;
  output?: string;
  stdout?: string;
  stderr?: string;
  duration_ms?: number;
  result?: any;
  diagnostics?: any;
  recommendations?: any;
  decision?: any;
  transpiled_code?: string;
  [key: string]: any;
}

export type ActionSafetyClass = "Class A" | "Class B" | "Class C" | "Class D";

export interface BrowserElement {
  tag: string;
  id?: string;
  name?: string;
  type?: string;
  role?: string;
  text: string;
  disabled?: boolean;
  selector: string;
}

export interface BrowserNavigateResult {
  action: string;
  url: string;
  title?: string;
  http_status: number;
  duration_ms: number;
  timestamp: number;
  status: "ok" | "error";
  error?: string;
}

export interface BrowserObserveResult {
  url: string;
  title: string;
  untrusted_web_content: string;
  interactive_elements: BrowserElement[];
  element_count: number;
  timestamp: number;
}

export interface BrowserClickResult {
  action: string;
  selector: string;
  url_before?: string;
  url_after?: string;
  navigated?: boolean;
  duration_ms: number;
  status: "ok" | "error";
  error?: string;
}

export interface BrowserTypeResult {
  action: string;
  selector: string;
  character_count: number;
  entered_value: string;
  is_sensitive: boolean;
  duration_ms: number;
  status: "ok" | "error";
  error?: string;
}

export interface BrowserScreenshotResult {
  action: string;
  url?: string;
  title?: string;
  size_bytes?: number;
  content_hash?: string;
  image_base64?: string;
  status: "ok" | "error";
  error?: string;
}

export interface BrowserVerifyResult {
  action: string;
  status: "VERIFIED" | "UNVERIFIED";
  all_verified: boolean;
  current_url: string;
  matched_conditions: {
    url_matched?: boolean;
    text_matched?: boolean;
    element_present?: boolean;
  };
  timestamp: number;
}

export interface BrowserStatusResult {
  is_active: boolean;
  current_url?: string | null;
  title?: string | null;
  history_count: number;
  uptime_seconds: number;
}

export interface EnrolledNode {
  node_id: string;
  name?: string;
  hostname?: string;
  ip_address?: string;
  os?: string;
  status: "active" | "online" | "offline" | "revoked";
  capabilities?: string[];
  enrolled_at?: string;
  last_heartbeat_at?: string;
}

