/**
 * Task AB (B2): client-side persistence for in-flight execute_simple / execute_analysis
 * runs started from MissionRunnerModal / AnalysisRunnerModal, so a page refresh does not
 * silently lose track of a mission that is still running or paused for CAS approval.
 *
 * This is a UI convenience cache only -- the backend (public.missions / approval_requests)
 * is always the source of truth. Every entry here gets re-verified against the backend
 * before being shown as live (see MissionsPage's reconciliation), and nothing stored here
 * is ever used to skip or shortcut that verification.
 */

import type { MissionApprovalDetail } from "./orchestratorApi";

const RUN_STORAGE_PREFIX = "arbor-mission-runs-ws-";
const MAX_RUNS_PER_WORKSPACE = 25;

export type MissionRunKind = "simple" | "analysis";

export type MissionRunPhase = "running" | "awaiting_approval";

export interface StoredMissionRun {
  clientRequestId: string;
  workspaceId: string;
  kind: MissionRunKind;
  objective: string;
  startedAt: string;
  updatedAt: string;
  phase: MissionRunPhase;
  missionId?: string;
  enableTwoStagePlanning?: boolean;
  /** Only present when phase === "awaiting_approval"; the cached 412 detail. */
  approvalDetail?: MissionApprovalDetail;
  /**
   * True once we've confirmed (via listPendingApprovals) that approvalDetail's parameters
   * were NOT captured live from the real 412 -- e.g. discovered after a refresh via the
   * approvals list, which only exposes tool_name, not parameters/plan_preview. Callers
   * must show a "details unavailable" note rather than presenting a partial detail as
   * if it were the full original approval card.
   */
  approvalDetailIsPartial?: boolean;
}

function storageKey(workspaceId: string): string {
  return `${RUN_STORAGE_PREFIX}${workspaceId}`;
}

/**
 * Lists stored runs for a workspace. Never throws: an empty, missing, corrupt, or
 * inaccessible (private-browsing, storage disabled) localStorage all resolve to [].
 */
export function listMissionRuns(workspaceId: string): StoredMissionRun[] {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: only ever return entries that genuinely belong to this workspace,
    // even if the stored blob was tampered with or copied from elsewhere.
    return parsed.filter(
      (r): r is StoredMissionRun =>
        r && typeof r === "object" && r.workspaceId === workspaceId && typeof r.clientRequestId === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Upserts a run by (workspaceId, clientRequestId). Never throws -- a write failure
 * (quota exceeded, storage disabled) is swallowed since this cache is best-effort.
 */
export function saveMissionRun(run: StoredMissionRun): void {
  try {
    const existing = listMissionRuns(run.workspaceId);
    const prior = existing.find((r) => r.clientRequestId === run.clientRequestId);
    // Preserve the real original startedAt across re-saves (e.g. transitioning
    // running -> awaiting_approval -> running again after Approve) -- callers always
    // pass "now" and rely on this to keep the first write's value.
    const merged: StoredMissionRun = prior ? { ...run, startedAt: prior.startedAt } : run;
    const updated = [merged, ...existing.filter((r) => r.clientRequestId !== run.clientRequestId)].slice(
      0,
      MAX_RUNS_PER_WORKSPACE
    );
    localStorage.setItem(storageKey(run.workspaceId), JSON.stringify(updated));
  } catch {
    // Best-effort cache only; nothing to recover here.
  }
}

/** Removes one stored run (mission finished, was rejected, or was dropped as stale). */
export function removeMissionRun(workspaceId: string, clientRequestId: string): void {
  try {
    const remaining = listMissionRuns(workspaceId).filter((r) => r.clientRequestId !== clientRequestId);
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(remaining));
  } catch {
    // Best-effort cache only.
  }
}
