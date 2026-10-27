import { assertWorkspaceMatch } from "./workspaceContext";

const API_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:8000";
const MISSIONS_STORAGE_PREFIX = "arbor-authoritative-missions-ws-";

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  let token = "";
  try {
    const { getAccessToken } = await import("./api");
    token = await getAccessToken();
  } catch {
    // In local dev mode or offline
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
    throw new Error(`Orchestrator API Error (${res.status}): ${errText || res.statusText}`);
  }

  return res;
}

/**
 * Authoritative Mission Lifecycle Statuses as defined by Milestone 2 & Stage 6 contracts.
 */
export type AuthoritativeMissionStatus =
  | "QUEUED"
  | "RUNNING"
  | "PAUSED"
  | "AWAITING_APPROVAL"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN"
  | "UNAVAILABLE";

export interface SimpleMissionPayload {
  workspace_id: string;
  user_objective: string;
  client_request_id: string;
  cas_token_id?: string;
  timeout_seconds?: number;
  target_file?: string;
  model_id?: string;
  provider?: string;
}

export interface SimpleMissionResponseData {
  mission_id: string;
  status: string;
  tool_name?: string;
  lifecycle_state: string;
  exit_code?: number;
  reconciliation_required?: boolean;
  cancellation_reason?: string;
  sealed_mrr?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface StatusPresentation {
  status: AuthoritativeMissionStatus;
  label: string;
  variant: "default" | "info" | "warning" | "success" | "destructive" | "secondary";
  reconciliationRequired: boolean;
  canRetry: boolean;
  description: string;
}

/**
 * Resolves backend canonical lifecycle state into UI-safe AuthoritativeMissionStatus
 * and presentation metadata. Strictly enforces prohibition of blind retries when
 * reconciliation is required (INV-P7-020).
 */
export function resolveStatusPresentation(
  rawStatus: string,
  reconciliationRequired?: boolean
): StatusPresentation {
  const norm = (rawStatus || "").toUpperCase().trim();
  const isRecon = Boolean(reconciliationRequired || norm === "RECONCILING");

  switch (norm) {
    case "COMPLETED":
      return {
        status: "COMPLETED",
        label: "Completed",
        variant: "success",
        reconciliationRequired: false,
        canRetry: true,
        description: "Mission completed successfully and MRR sealed."
      };
    case "RUNNING":
      return {
        status: "RUNNING",
        label: "Running",
        variant: "info",
        reconciliationRequired: false,
        canRetry: false,
        description: "Action currently executing in isolated container."
      };
    case "DISPATCHED":
    case "COMMITTED":
    case "DRAFT":
    case "QUEUED":
      return {
        status: "QUEUED",
        label: norm === "DISPATCHED" ? "Dispatched" : norm === "COMMITTED" ? "Committed" : "Queued",
        variant: "default",
        reconciliationRequired: false,
        canRetry: false,
        description: "Mission queued or dispatched to agent."
      };
    case "PAUSED":
      return {
        status: "PAUSED",
        label: "Paused",
        variant: "warning",
        reconciliationRequired: false,
        canRetry: true,
        description: "Mission paused by operator."
      };
    case "AWAITING_APPROVAL":
      return {
        status: "AWAITING_APPROVAL",
        label: "Awaiting Approval",
        variant: "warning",
        reconciliationRequired: false,
        canRetry: false,
        description: "Human CAS token approval required before mutating action."
      };
    case "RECONCILING":
    case "RECOVERING":
      return {
        status: "RECOVERING",
        label: "Reconciliation Required",
        variant: "warning",
        reconciliationRequired: true,
        canRetry: false,
        description: "Execution halted with uncertain side effects. Manual intervention or rollback required (INV-P7-020)."
      };
    case "FAILED":
      if (isRecon) {
        return {
          status: "FAILED",
          label: "Failed (Reconciliation Required)",
          variant: "destructive",
          reconciliationRequired: true,
          canRetry: false,
          description: "Action failed with uncertain side effects. Retries disabled until reconciled."
        };
      }
      return {
        status: "FAILED",
        label: "Failed",
        variant: "destructive",
        reconciliationRequired: false,
        canRetry: true,
        description: "Mission execution failed."
      };
    case "CANCELLED":
      if (isRecon) {
        return {
          status: "CANCELLED",
          label: "Cancelled (Uncertain)",
          variant: "destructive",
          reconciliationRequired: true,
          canRetry: false,
          description: "Cancelled with uncertain side effects. Blind retry blocked by policy."
        };
      }
      return {
        status: "CANCELLED",
        label: "Cancelled",
        variant: "destructive",
        reconciliationRequired: false,
        canRetry: true,
        description: "Mission cleanly cancelled without side effects."
      };
    default:
      return {
        status: "UNKNOWN",
        label: rawStatus || "Unknown",
        variant: "secondary",
        reconciliationRequired: isRecon,
        canRetry: false,
        description: "Unrecognized mission status."
      };
  }
}

export interface PlanStepData {
  step_id: string;
  action: string;
  tool_name?: string | null;
  tool_params?: Record<string, unknown> | null;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  retry_count?: number;
  error?: string | null;
  depends_on?: string[];
  requires_human_approval?: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  output?: string | null;
}

export interface ExecutionPlanData {
  plan_id: string;
  workspace_id: string;
  branch_id: string;
  task_type: string;
  task_summary: string;
  steps: PlanStepData[];
  planner_model: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  iteration_count: number;
  max_iterations: number;
  allows_branching?: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface VerificationResultData {
  verified: boolean;
  verifier_model?: string;
  checks_performed: string[];
  passed_checks: string[];
  failed_checks: string[];
  evidence_artifacts?: string[];
  cryptographic_seal?: {
    algorithm: "ed25519";
    mrr_signature: string;
    sealed_at: string;
    verified_by_daemon: boolean;
    public_key?: string;
    canonical_hash?: string;
  };
}

export interface MissionCheckpointData {
  checkpoint_id: string;
  timestamp: string;
  step_id: string;
  label: string;
  hash?: string;
}

export interface MissionExecutionLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  step_id?: string;
  message: string;
}

export interface MissionRecord {
  id: string;
  workspace_id: string;
  branch_id: string;
  title: string;
  objective: string;
  status: AuthoritativeMissionStatus;
  planner_model: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  plan?: ExecutionPlanData | null;
  deliverables?: string;
  output?: string;
  artifacts?: Array<{
    name: string;
    artifact_type: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  verification?: VerificationResultData | null;
  sealed_mrr?: Record<string, unknown>;
  checkpoints?: MissionCheckpointData[];
  execution_logs?: MissionExecutionLog[];
  research_provenance?: {
    research_session_id?: string;
    is_synthetic_demonstration: boolean;
    source_count: number;
    warning?: string;
  };
  active_job_id?: string;
  graph_id?: string;
  error?: string | null;
}

export interface OrchestrationResponseData {
  request_id: string;
  mission_id?: string;
  workspace_id: string;
  branch_id: string;
  mode: string;
  task_classification: {
    primary_type: string;
    complexity: string;
    requires_tools: string[];
    confidence: number;
    reasoning: string;
  };
  routing_decision: {
    selected_model: string;
    alternatives: string[];
    confidence: number;
    reason: string;
    estimated_cost_tier: string;
    fallback_chain: string[];
  };
  plan?: ExecutionPlanData | null;
  artifacts: Array<{
    name: string;
    artifact_type: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  output: string;
  deliverables?: string;
  verification?: VerificationResultData | null;
  duration_ms: number;
  status: string;
}

export interface OrchestratePayload {
  workspace_id: string;
  branch_id: string;
  message: string;
  mode?: "auto" | "chat" | "agent" | "compare" | "research";
  override_model?: string;
  user_preferences?: Record<string, unknown>;
  compare_models?: string[];
}

/**
 * Submits a user task to the authoritative Arbor AI Orchestrator (/agent/orchestrate).
 */
export async function orchestrateTask(payload: OrchestratePayload): Promise<OrchestrationResponseData> {
  assertWorkspaceMatch(payload.workspace_id);

  const res = await fetchWithAuth("/agent/orchestrate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await res.json();
}

/**
 * Executes parallel multi-model comparison (/agent/compare).
 */
export async function compareModelsTask(payload: {
  workspace_id: string;
  branch_id: string;
  prompt: string;
  models: string[];
}) {
  assertWorkspaceMatch(payload.workspace_id);
  const res = await fetchWithAuth("/agent/compare", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await res.json();
}

/**
 * Cancels a running agent process tree (/agent/cancel).
 */
export async function cancelMissionJob(workspaceId: string, jobId: string): Promise<{ status: string; cancelled: boolean }> {
  assertWorkspaceMatch(workspaceId);

  const res = await fetchWithAuth("/agent/cancel", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: workspaceId,
      job_id: jobId,
    }),
  });
  return await res.json();
}

/**
 * Submits a signed human CAS authorization token to approve a safety-critical replan.
 */
export async function approveMissionReplan(payload: {
  workspace_id: string;
  graph_id: string;
  approval_token: string;
}): Promise<{ status: string; message: string }> {
  assertWorkspaceMatch(payload.workspace_id);

  const res = await fetchWithAuth("/agent/orchestrator/approve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await res.json();
}

/**
 * Fetches branch execution records from the backend (/agent/executions/{branch_id}).
 */
export async function getBranchExecutions(branchId: string): Promise<{ executions: unknown[] }> {
  const res = await fetchWithAuth(`/agent/executions/${encodeURIComponent(branchId)}`);
  return await res.json();
}

/**
 * Retrieves all missions bound to a specific workspace.
 * Reconciles local mission registry with multi-tenant workspace isolation.
 */
export function getWorkspaceMissions(workspaceId: string): MissionRecord[] {
  assertWorkspaceMatch(workspaceId);

  try {
    const raw = localStorage.getItem(`${MISSIONS_STORAGE_PREFIX}${workspaceId}`);
    if (!raw) return [];
    const parsed: MissionRecord[] = JSON.parse(raw);
    // Double-check workspace filter
    return parsed.filter((m) => m.workspace_id === workspaceId);
  } catch {
    return [];
  }
}

/**
 * Asynchronously fetches missions from PostgreSQL via GET /api/v1/missions,
 * reconciling server state into localStorage cache.
 */
export async function fetchWorkspaceMissions(workspaceId: string): Promise<MissionRecord[]> {
  assertWorkspaceMatch(workspaceId);
  try {
    const res = await fetchWithAuth(`/api/v1/missions?workspace_id=${encodeURIComponent(workspaceId)}`);
    if (res.ok) {
      const data = await res.json();
      const serverMissions: MissionRecord[] = data.missions || [];
      // DEF-FE-01: Server response is authoritative for this workspace. Replace cache completely.
      const authoritativeList = [...serverMissions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      localStorage.setItem(`${MISSIONS_STORAGE_PREFIX}${workspaceId}`, JSON.stringify(authoritativeList));
      return authoritativeList;
    }
  } catch (e: unknown) {
    if (e instanceof Error && (e.message.includes("(401)") || e.message.includes("(403)"))) {
      // DEF-FE-01: Prohibit silent fallback to cached success/mission state on auth/authz failure
      throw e;
    }
    console.warn("[ORCHESTRATOR API] Server mission retrieval fallback to cache:", e);
    return getWorkspaceMissions(workspaceId);
  }
  return getWorkspaceMissions(workspaceId);
}

/**
 * Persists an authoritative mission record within the workspace isolation boundary.
 */
export function saveWorkspaceMission(mission: MissionRecord): void {
  assertWorkspaceMatch(mission.workspace_id);

  try {
    const existing = getWorkspaceMissions(mission.workspace_id);
    const filtered = existing.filter((m) => m.id !== mission.id);
    const updated = [mission, ...filtered].slice(0, 50);
    localStorage.setItem(`${MISSIONS_STORAGE_PREFIX}${mission.workspace_id}`, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to persist mission record:", err);
  }
}

/**
 * Fetches a single mission by ID with strict workspace isolation.
 * Throws a 403 Security Exception if the mission does not belong to requested workspace.
 */
export function getMissionById(missionId: string, workspaceId: string): MissionRecord | null {
  assertWorkspaceMatch(workspaceId);

  const missions = getWorkspaceMissions(workspaceId);
  const found = missions.find((m) => m.id === missionId);
  if (!found) return null;

  if (found.workspace_id !== workspaceId) {
    throw new Error(
      `[SECURITY_VIOLATION_403] Mission '${missionId}' belongs to workspace '${found.workspace_id}', access denied from '${workspaceId}'.`
    );
  }

  return found;
}

/**
 * Level 3 Milestone 1: Executes a single bounded mission action synchronously
 * via POST /api/v1/missions/execute_simple.
 */
export async function executeSimpleMission(payload: SimpleMissionPayload): Promise<SimpleMissionResponseData> {
  assertWorkspaceMatch(payload.workspace_id);

  const res = await fetchWithAuth("/api/v1/missions/execute_simple", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return await res.json();
}

/**
 * Level 3 Milestone 1: Idempotently retrieves mission status and sealed MRR evidence
 * via GET /api/v1/missions/{missionId}.
 */
export async function getMissionStatus(
  workspaceId: string,
  missionId: string
): Promise<SimpleMissionResponseData> {
  assertWorkspaceMatch(workspaceId);

  const res = await fetchWithAuth(`/api/v1/missions/${encodeURIComponent(missionId)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
    method: "GET",
  });

  return await res.json();
}
