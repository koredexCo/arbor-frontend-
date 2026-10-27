export interface Conversation {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  active_branch_id?: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Branch {
  id: string;
  conversation_id: string;
  parent_branch_id: string | null;
  origin_node_id: string | null;
  name: string;
  summary: string | null;
  depth: number;
  is_active?: boolean;
  token_budget?: number;
  version?: number;
  workspace_id?: string | null;
  model_id: string | null;
  origin_preview?: string | null;
  created_at: string;
}

export type NodeType =
  | "message"
  | "model_call"
  | "branch"
  | "agent_plan"
  | "tool_call"
  | "tool_result"
  | "mcp_call"
  | "file_change"
  | "terminal_execution"
  | "test_result"
  | "compiler_action"
  | "research_source"
  | "artifact"
  | "decision";

export interface Message {
  id: string;
  conversation_id: string;
  branch_id: string;
  parent_id: string | null;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  node_type?: NodeType | string;
  sequence: number;
  is_pinned: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export * from "./agent";

export interface Source {
  id: string;
  role: string;
  content: string;
  sequence: number;
  type: "pinned" | "recent" | "relevant";
  similarity?: number;
}

export interface ChatResponse {
  user_message: Message;
  assistant_message: Message;
  sources: Source[];
  context_meta: {
    total_messages: number;
    pinned_count: number;
    relevant_count: number;
    has_memory: boolean;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Usage {
  id: string;
  user_id: string;
  conversations_count: number;
  branches_count: number;
  messages_count: number;
  plan: "free" | "pro" | "team";
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
}

export interface ProjectMember {
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
}

export type ApiMode = "platform" | "byok";
export type StorageMode = "local" | "cloud" | "self_hosted";

export interface UserSettings {
  user_id: string;
  api_mode: ApiMode;
  storage_mode: StorageMode;
  self_hosted_endpoint: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoredApiKey {
  provider: string;
  created_at: string;
}

export interface UsageSummary {
  period_days: number;
  total_requests: number;
  total_tokens: number;
  by_provider: Record<string, { requests: number; tokens: number }>;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  today: {
    requests: number;
    tokens: number;
    request_limit: number;
    token_limit: number;
  };
  recent: Array<{
    id: string;
    provider: string;
    model: string;
    tokens_used: number;
    request_type: string;
    key_source: string;
    created_at: string;
  }>;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  visibility: "private" | "workspace" | "shared" | "public_readonly";
  created_at: string;
  role?: "owner" | "admin" | "member" | "viewer";
}

export interface WorkspaceMemberResponse {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
}
