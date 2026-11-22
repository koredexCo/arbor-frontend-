/**
 * Task AB (B2): reconciles execute_simple runs cached in localStorage (missionRunStore)
 * against the backend's real, current state. Extracted out of MissionsPage so the "never
 * auto-approve or re-submit, only ever re-verify with GETs" contract can be tested directly
 * rather than only through the component.
 *
 * Every GET in here is read-only reconciliation: mission status, approval-request status,
 * and the pending-approvals list. Nothing in this module ever calls execute_simple,
 * approve, or reject -- those only ever happen from an explicit user click (MissionRunnerModal).
 */

import {
  getMissionStatus,
  getApprovalRequest,
  listPendingApprovals,
  resolveRequiresStrongConfirmation,
  type MissionApprovalDetail,
} from "./orchestratorApi";
import { listMissionRuns, removeMissionRun, saveMissionRun, type StoredMissionRun } from "./missionRunStore";

const TERMINAL_LIFECYCLE_STATES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export async function reconcileMissionRuns(workspaceId: string): Promise<StoredMissionRun[]> {
  if (!workspaceId) return [];

  const stored = listMissionRuns(workspaceId);
  const next: StoredMissionRun[] = [];

  for (const run of stored) {
    if (!run.missionId) {
      // Interrupted before the backend ever returned a mission_id -- nothing to
      // re-verify against, so there is nothing safe to resume or display.
      removeMissionRun(workspaceId, run.clientRequestId);
      continue;
    }

    let lifecycleState = "";
    try {
      const statusResult = await getMissionStatus(workspaceId, run.missionId);
      lifecycleState = (statusResult.lifecycle_state || statusResult.status || "").toUpperCase();
    } catch {
      // Mission no longer exists for this workspace (deleted, foreign tenant, or never
      // actually committed) -- drop the stale entry.
      removeMissionRun(workspaceId, run.clientRequestId);
      continue;
    }

    if (TERMINAL_LIFECYCLE_STATES.has(lifecycleState)) {
      // Terminal -- already visible via the authoritative missions list.
      removeMissionRun(workspaceId, run.clientRequestId);
      continue;
    }

    let workingRun: StoredMissionRun = run;

    // Re-verify a cached "awaiting approval" is still genuinely pending before showing
    // it again -- never present a stale approval card as current.
    if (workingRun.phase === "awaiting_approval" && workingRun.approvalDetail?.request_id) {
      try {
        const approvalOutcome = await getApprovalRequest(workingRun.approvalDetail.request_id, workspaceId);
        if (approvalOutcome.kind === "success" && approvalOutcome.data.status === "PENDING") {
          const refreshed: StoredMissionRun = { ...workingRun, updatedAt: new Date().toISOString() };
          saveMissionRun(refreshed);
          next.push(refreshed);
          continue;
        }
      } catch {
        // Fall through to re-discovery below.
      }
      // Resolved elsewhere, expired, or unverifiable -- downgrade and re-check.
      workingRun = { ...workingRun, phase: "running", approvalDetail: undefined, approvalDetailIsPartial: false };
    }

    // No confirmed pending approval -- see if one exists that this browser never saw
    // (e.g. raised after a resume from a different tab/session).
    try {
      const pendingOutcome = await listPendingApprovals(workspaceId);
      if (pendingOutcome.kind === "success") {
        const match = pendingOutcome.data.find((a) => a.mission_id === run.missionId);
        if (match) {
          const partialDetail: MissionApprovalDetail = {
            mission_id: match.mission_id,
            request_id: match.request_id,
            tool_name: match.tool_name,
            parameters: null,
            node_approval_mode: null,
            requires_strong_confirmation: resolveRequiresStrongConfirmation(match.tool_name, undefined),
          };
          const discovered: StoredMissionRun = {
            ...workingRun,
            phase: "awaiting_approval",
            approvalDetail: partialDetail,
            approvalDetailIsPartial: true,
            updatedAt: new Date().toISOString(),
          };
          saveMissionRun(discovered);
          next.push(discovered);
          continue;
        }
      }
    } catch {
      // Best-effort discovery only.
    }

    const stillRunning: StoredMissionRun = {
      ...workingRun,
      phase: "running",
      approvalDetail: undefined,
      approvalDetailIsPartial: false,
      updatedAt: new Date().toISOString(),
    };
    saveMissionRun(stillRunning);
    next.push(stillRunning);
  }

  return next;
}
