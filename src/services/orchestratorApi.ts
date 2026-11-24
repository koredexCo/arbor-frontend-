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
 * Raw fetch used by the real mission-execution contract (execute_simple, approvals,
 * verify-seal). Unlike fetchWithAuth, this never throws on a non-2xx response -- callers
 * need to see 412 (approval required) and other error statuses to drive the approval loop
 * and show the real backend error verbatim, rather than having them collapsed into a thrown
 * Error. Always attaches X-Workspace-ID, matching the reference client contract in
 * arbor-backend/backend/scripts/dev/arbor-run.ps1.
 */
async function fetchOrchestratorRaw(
  path: string,
  options: RequestInit,
  workspaceId: string
): Promise<Response> {
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
  if (!headers.has("X-Workspace-ID") && workspaceId) {
    headers.set("X-Workspace-ID", workspaceId);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
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
  enable_two_stage_planning?: boolean;
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
  // Task AK (live-test-findings-20261124) item 8: a FAILED execute_simple mission
  // never has verification/sealed_mrr (those are the older DAG-orchestrator path's
  // own fields) -- these are its own explanation, additive, None for every mission
  // that never failed this way.
  cancellation_reason?: string | null;
  mission_failure_record?: MissionFailureRecord | null;
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

// ---------------------------------------------------------------------------
// Real execute_simple contract: HTTP 412 CAS approval loop, approve/reject,
// and verify-seal. Mirrors arbor-backend/backend/scripts/dev/arbor-run.ps1,
// the live-verified reference client for this API.
// ---------------------------------------------------------------------------

export interface MissionPlanPreviewStep {
  step_id: string;
  status: string;
  action: string;
  parameters?: Record<string, unknown> | null;
}

export interface MissionApprovalReviewer {
  verdict?: string;
  status?: string;
}

/**
 * Task U (node-remote-receipt-mode-20261119): the node's approval mode as reported at
 * registration -- 'local-prompt' (default; node asks the human at its own terminal) or
 * 'remote-receipt' (headless/server; node never prompts, trusts only the backend's signed
 * receipt). Any other value (including missing/unknown) must degrade to 'local-prompt' for
 * display purposes -- see resolveNodeApprovalMode.
 */
export type NodeApprovalMode = "local-prompt" | "remote-receipt";

/**
 * Task U: the same set arbor_agent.permissions.HIGH_RISK_TOOLS classifies as high-risk,
 * duplicated here (frontend has no access to the Python module) so the UI can still demand
 * a strong confirmation for these tools even if a backend response omits
 * requires_strong_confirmation entirely.
 */
export const HIGH_RISK_TOOLS_LOCAL: ReadonlySet<string> = new Set([
  "terminal.execute",
  "terminal.exec",
  "fs.delete",
  "test.run",
]);

/**
 * Body of an HTTP 412 response from execute_simple: a step is awaiting human CAS approval.
 * Some backends wrap this in a top-level {detail: ...}; others return it as the top-level
 * object directly, so callers should treat `detail` as already unwrapped.
 */
export interface MissionApprovalDetail {
  mission_id: string;
  request_id: string;
  tool_name?: string;
  parameters?: Record<string, unknown> | null;
  plan_preview?: MissionPlanPreviewStep[];
  reviewer?: MissionApprovalReviewer;
  node_approval_mode?: string | null;
  requires_strong_confirmation?: boolean;
}

/**
 * Normalizes an arbitrary, possibly missing/unknown node_approval_mode value from the backend
 * into a known NodeApprovalMode for display wording. Unknown or missing degrades safely to
 * 'local-prompt' -- the UI never claims a node won't prompt unless the mode is explicitly
 * 'remote-receipt'.
 */
export function resolveNodeApprovalMode(raw: string | null | undefined): NodeApprovalMode {
  return raw === "remote-receipt" ? "remote-receipt" : "local-prompt";
}

/**
 * Whether the Approve action for this step should require a typed strong confirmation.
 * True when the backend says so explicitly, OR, when the backend omits/denies the field,
 * when the tool is one of the locally-known high-risk tools -- a missing backend flag must
 * never silently drop the confirmation requirement for tools we already know are high-risk.
 */
export function resolveRequiresStrongConfirmation(
  toolName: string | null | undefined,
  backendFlag: boolean | null | undefined
): boolean {
  if (backendFlag === true) return true;
  const norm = (toolName || "").trim().toLowerCase();
  return HIGH_RISK_TOOLS_LOCAL.has(norm);
}

/**
 * The post-approval banner text shown while execute_simple resumes with the approved CAS
 * token. Never claims the node will not prompt unless the mode is explicitly 'remote-receipt'
 * -- an unknown/missing mode (resolved to 'local-prompt' by resolveNodeApprovalMode) keeps the
 * original "answer the prompt in the NODE window" wording.
 */
export function resolveResumingBannerText(mode: NodeApprovalMode): string {
  return mode === "remote-receipt"
    ? "Approved. The node will execute automatically -- no action needed on the node."
    : "Now answer the prompt in the NODE window within 120s.";
}

export interface MissionStepResult {
  step_id: string;
  tool_name?: string;
  status: string;
  exit_code?: number | null;
}

export interface MissionNotExecutedStep {
  step_id: string;
  action?: string;
}

export interface MissionFailureRecord {
  failed_step_id?: string;
  failed_tool_name?: string;
  failure_error_code?: string;
  exit_code?: number | null;
  output_tail?: string;
}

/**
 * Task AK (live-test-findings-20261124) item 3/7: test.run's own dispatch result
 * (stdout/stderr/exit_code/duration_ms) -- present only when the mission's dispatched
 * tool was "test.run"; null/absent for every other tool.
 */
export interface MissionTestRunResult {
  stdout?: string | null;
  stderr?: string | null;
  exit_code?: number | null;
  duration_ms?: number | null;
}

export interface ExecuteSimpleFinalResponse {
  mission_id: string;
  status: string;
  lifecycle_state: string;
  tool_name?: string;
  reconciliation_required?: boolean;
  cancellation_reason?: string | null;
  step_results?: MissionStepResult[];
  not_executed_steps?: MissionNotExecutedStep[];
  mission_failure_record?: MissionFailureRecord | null;
  test_run_result?: MissionTestRunResult | null;
}

export type ExecuteSimpleOutcome =
  | { kind: "success"; data: ExecuteSimpleFinalResponse }
  | { kind: "approval_required"; detail: MissionApprovalDetail }
  | { kind: "error"; status: number; detailText: string };

/**
 * Submits (or resumes, with cas_token_id set) one execute_simple attempt and classifies
 * the raw HTTP response, WITHOUT throwing on 412 or other non-2xx statuses -- callers need
 * to see those to drive the approval loop and show the real backend error verbatim.
 */
export async function executeSimpleMissionStep(
  payload: SimpleMissionPayload
): Promise<ExecuteSimpleOutcome> {
  assertWorkspaceMatch(payload.workspace_id);

  const res = await fetchOrchestratorRaw(
    "/api/v1/missions/execute_simple",
    { method: "POST", body: JSON.stringify(payload) },
    payload.workspace_id
  );

  const bodyText = await res.text().catch(() => "");

  if (res.status === 412) {
    let parsed: unknown = {};
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      parsed = {};
    }
    const wrapper = parsed as { detail?: MissionApprovalDetail };
    const detail = wrapper.detail ?? (parsed as MissionApprovalDetail);
    return { kind: "approval_required", detail };
  }

  if (!res.ok) {
    let detailText = bodyText || res.statusText;
    try {
      const parsed = bodyText ? JSON.parse(bodyText) : null;
      if (parsed && typeof parsed === "object" && "detail" in parsed) {
        const d = (parsed as { detail: unknown }).detail;
        detailText = typeof d === "string" ? d : JSON.stringify(d);
      }
    } catch {
      // Not JSON -- show the raw body verbatim.
    }
    return { kind: "error", status: res.status, detailText };
  }

  const data = bodyText ? JSON.parse(bodyText) : {};
  return { kind: "success", data };
}

export interface MissionApprovalActionResponse {
  token_id?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * POST /api/v1/approvals/{request_id}/approve. Resolves to the token_id needed to resume
 * execute_simple as cas_token_id. Never call this without a deliberate user click.
 */
export async function approveMissionRequest(
  requestId: string,
  workspaceId: string,
  reason: string = "approved via UI"
): Promise<MissionApprovalActionResponse> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/approvals/${encodeURIComponent(requestId)}/approve`,
    { method: "POST", body: JSON.stringify({ reason }) },
    workspaceId
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Approval API Error (${res.status}): ${text || res.statusText}`);
  }
  return await res.json();
}

/**
 * POST /api/v1/approvals/{request_id}/reject.
 */
export async function rejectMissionRequest(
  requestId: string,
  workspaceId: string,
  reason: string = "declined via UI"
): Promise<MissionApprovalActionResponse> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/approvals/${encodeURIComponent(requestId)}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
    workspaceId
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Rejection API Error (${res.status}): ${text || res.statusText}`);
  }
  return await res.json();
}

export interface CancelMissionResponse {
  mission_id: string;
  lifecycle_state: string;
  previous_lifecycle_state: string;
  job_cancelled: boolean;
  job_confirmed: boolean;
  reconciliation_required: boolean;
  mission_failure_record?: MissionFailureRecord | null;
}

/**
 * Task AK (live-test-findings-20261124) item 2/9: POST /api/v1/missions/{id}/cancel --
 * stops a mission that is RUNNING/DISPATCHED (a node action in flight) or still
 * COMMITTED (awaiting approval). Throws with the backend's real detail text on a
 * non-2xx response (e.g. 409 MISSION_ALREADY_TERMINAL), never silently swallowed --
 * a caller closing a modal on a failed cancel must still know the mission is
 * still running.
 */
export async function cancelMission(
  missionId: string,
  workspaceId: string
): Promise<CancelMissionResponse> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/missions/${encodeURIComponent(missionId)}/cancel`,
    { method: "POST" },
    workspaceId
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cancel Mission API Error (${res.status}): ${text || res.statusText}`);
  }
  return await res.json();
}

// ---------------------------------------------------------------------------
// DEF-REP-02 / DEF-REP-03: mission artifact listing & retrieval
// (GET /api/v1/missions/{mission_id}/artifacts, GET .../artifacts/{artifact_name}).
// ---------------------------------------------------------------------------

export interface MissionArtifactSummary {
  name: string;
  artifact_type: string;
  byte_size?: number | null;
  mime_type?: string | null;
  created_at?: string | null;
  storage_location?: string | null;
  has_content: boolean;
}

export interface MissionArtifactListResponse {
  mission_id: string;
  workspace_id: string;
  artifacts: MissionArtifactSummary[];
}

export type MissionArtifactsOutcome =
  | { kind: "success"; data: MissionArtifactListResponse }
  | { kind: "error"; status: number; detailText: string };

async function extractErrorDetail(res: Response): Promise<{ status: number; detailText: string }> {
  const bodyText = await res.text().catch(() => "");
  let detailText = bodyText || res.statusText;
  try {
    const parsed = bodyText ? JSON.parse(bodyText) : null;
    if (parsed && typeof parsed === "object" && "detail" in parsed) {
      const d = (parsed as { detail: unknown }).detail;
      detailText = typeof d === "string" ? d : JSON.stringify(d);
    }
  } catch {
    // Not JSON -- show the raw body verbatim.
  }
  return { status: res.status, detailText };
}

/**
 * GET /api/v1/missions/{mission_id}/artifacts?workspace_id=... -- lists artifacts
 * recorded for the mission (database rows, inline spec artifacts, and the recorded
 * on-disk analysis report). Never throws on a non-2xx response; callers show the
 * backend's detail text verbatim (403/404/etc).
 */
export async function listMissionArtifacts(
  missionId: string,
  workspaceId: string
): Promise<MissionArtifactsOutcome> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/missions/${encodeURIComponent(missionId)}/artifacts?workspace_id=${encodeURIComponent(workspaceId)}`,
    { method: "GET" },
    workspaceId
  );

  if (!res.ok) {
    const { status, detailText } = await extractErrorDetail(res);
    return { kind: "error", status, detailText };
  }

  const bodyText = await res.text().catch(() => "");
  const data: MissionArtifactListResponse = bodyText
    ? JSON.parse(bodyText)
    : { mission_id: missionId, workspace_id: workspaceId, artifacts: [] };
  return { kind: "success", data };
}

export type MissionArtifactContentOutcome =
  | { kind: "success"; content: string; mimeType: string }
  | { kind: "error"; status: number; detailText: string };

/**
 * GET /api/v1/missions/{mission_id}/artifacts/{artifact_name}?workspace_id=... -- fetches
 * one artifact's raw content. `artifactName` is always URL-encoded via encodeURIComponent
 * before it reaches the request path, so path-traversal or separator characters in a name
 * (e.g. "../", encoded slashes) never reach the fetch URL raw.
 */
export async function getMissionArtifact(
  missionId: string,
  artifactName: string,
  workspaceId: string
): Promise<MissionArtifactContentOutcome> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/missions/${encodeURIComponent(missionId)}/artifacts/${encodeURIComponent(artifactName)}?workspace_id=${encodeURIComponent(workspaceId)}`,
    { method: "GET" },
    workspaceId
  );

  if (!res.ok) {
    const { status, detailText } = await extractErrorDetail(res);
    return { kind: "error", status, detailText };
  }

  const content = await res.text().catch(() => "");
  const mimeType = res.headers?.get?.("Content-Type") || "application/octet-stream";
  return { kind: "success", content, mimeType };
}

/**
 * Whether an artifact's content should be rendered as markdown prose rather than
 * preformatted plain text, based on its recorded MIME type or (as a fallback, since
 * storage_location=WORKSPACE_DISK rows may omit mime_type) its file extension.
 */
export function isMarkdownArtifact(name: string, mimeType?: string | null): boolean {
  if (mimeType && mimeType.toLowerCase().includes("markdown")) return true;
  return /\.(md|markdown)$/i.test(name || "");
}

export interface MissionVerifySealResponse {
  signature_valid: boolean;
  step_count?: number;
  final_link_hash?: string;
  has_mission_failure_record?: boolean;
  [key: string]: unknown;
}

/**
 * GET /api/v1/missions/{mission_id}/verify-seal?workspace_id=...
 */
export async function verifyMissionSeal(
  missionId: string,
  workspaceId: string
): Promise<MissionVerifySealResponse> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/missions/${encodeURIComponent(missionId)}/verify-seal?workspace_id=${encodeURIComponent(workspaceId)}`,
    { method: "GET" },
    workspaceId
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Verify-Seal API Error (${res.status}): ${text || res.statusText}`);
  }
  return await res.json();
}

// ---------------------------------------------------------------------------
// Task AB (B2): read-only approval-request lookups used to reconcile a mission
// run restored from localStorage against the backend's real, current state --
// never used to approve/resume anything by themselves.
// ---------------------------------------------------------------------------

export type ApprovalRequestStatusValue =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "CONSUMED";

export interface ApprovalRequestSummary {
  request_id: string;
  workspace_id: string;
  mission_id: string;
  tool_name: string;
  status: ApprovalRequestStatusValue;
  created_at: string;
  expires_at: string;
}

export type ApprovalRequestOutcome =
  | { kind: "success"; data: ApprovalRequestSummary }
  | { kind: "not_found" }
  | { kind: "error"; status: number; detailText: string };

/**
 * GET /api/v1/approvals/{request_id} -- used after a refresh to confirm a cached 412's
 * request_id is still genuinely PENDING before re-displaying it as "awaiting approval".
 * Never throws on 404/other errors; callers decide how to degrade.
 */
export async function getApprovalRequest(
  requestId: string,
  workspaceId: string
): Promise<ApprovalRequestOutcome> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/approvals/${encodeURIComponent(requestId)}`,
    { method: "GET" },
    workspaceId
  );

  if (res.status === 404) {
    return { kind: "not_found" };
  }
  if (!res.ok) {
    const { status, detailText } = await extractErrorDetail(res);
    return { kind: "error", status, detailText };
  }

  const data: ApprovalRequestSummary = await res.json();
  return { kind: "success", data };
}

export type ApprovalRequestListOutcome =
  | { kind: "success"; data: ApprovalRequestSummary[] }
  | { kind: "error"; status: number; detailText: string };

/**
 * GET /api/v1/approvals?status=PENDING -- used to discover a pending approval for a
 * resumed "running" mission run whose own 412 was never seen by this browser (e.g. a
 * later step's approval, or the original tab that received the 412 was closed before
 * persisting it). Only exposes tool_name, never parameters/plan_preview -- callers must
 * mark any approval card built from this as partial.
 */
export async function listPendingApprovals(workspaceId: string): Promise<ApprovalRequestListOutcome> {
  const res = await fetchOrchestratorRaw(
    `/api/v1/approvals?status=PENDING&limit=200`,
    { method: "GET" },
    workspaceId
  );

  if (!res.ok) {
    const { status, detailText } = await extractErrorDetail(res);
    return { kind: "error", status, detailText };
  }

  const data: ApprovalRequestSummary[] = await res.json();
  return { kind: "success", data };
}

// ---------------------------------------------------------------------------
// Task AB (B3): read-only architectural analysis mission (/agent execute_analysis).
// Mirrors executeSimpleMissionStep's non-throwing outcome classification so the UI can
// treat an (unexpected, since this path is read-only) 412 the same way, without a
// second code path -- see MissionApprovalCard.
// ---------------------------------------------------------------------------

export interface AnalysisMissionPayload {
  workspace_id: string;
  user_objective?: string;
  client_request_id: string;
  repositories?: string[];
  domains?: string[];
  evaluation_mode?: "single_model" | "two_model" | "tri_model_synthesis";
  timeout_seconds?: number;
}

export interface AnalysisMissionResult {
  mission_id: string;
  status: string;
  lifecycle_state: string;
  inspected_repositories: string[];
  inspected_domains: string[];
  inspected_files_count: number;
  findings_count: number;
  critical_unresolved_count: number;
  multi_model_result: Record<string, unknown>;
  analysis_artifact_path?: string | null;
  deliverables?: string | null;
  artifacts?: Array<Record<string, unknown>> | null;
  sealed_mrr?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  persistence_status?: "PERSISTED" | "NOT_PERSISTED" | "FAILED" | string;
  persistence_error?: string | null;
  error?: string | null;
}

export type AnalysisOutcome =
  | { kind: "success"; data: AnalysisMissionResult }
  | { kind: "approval_required"; detail: MissionApprovalDetail }
  | { kind: "error"; status: number; detailText: string };

/**
 * POST /api/v1/missions/execute_analysis. Read-only: no cas_token_id field exists on this
 * request, so there is no resume path -- a 412 here (not expected; the route does not
 * currently map CASApprovalRequiredError to one) can only ever be shown, never resumed.
 */
export async function executeAnalysisMission(payload: AnalysisMissionPayload): Promise<AnalysisOutcome> {
  assertWorkspaceMatch(payload.workspace_id);

  const res = await fetchOrchestratorRaw(
    "/api/v1/missions/execute_analysis",
    { method: "POST", body: JSON.stringify(payload) },
    payload.workspace_id
  );

  const bodyText = await res.text().catch(() => "");

  if (res.status === 412) {
    let parsed: unknown = {};
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      parsed = {};
    }
    const wrapper = parsed as { detail?: MissionApprovalDetail };
    const detail = wrapper.detail ?? (parsed as MissionApprovalDetail);
    return { kind: "approval_required", detail };
  }

  if (!res.ok) {
    let detailText = bodyText || res.statusText;
    try {
      const parsed = bodyText ? JSON.parse(bodyText) : null;
      if (parsed && typeof parsed === "object" && "detail" in parsed) {
        const d = (parsed as { detail: unknown }).detail;
        detailText = typeof d === "string" ? d : JSON.stringify(d);
      }
    } catch {
      // Not JSON -- show the raw body verbatim.
    }
    return { kind: "error", status: res.status, detailText };
  }

  const data = bodyText ? JSON.parse(bodyText) : {};
  return { kind: "success", data };
}
