/**
 * Task AB (B2): Mission run persistence contract test suite.
 * Validates:
 * - localStorage restore: empty, throwing, and foreign-workspace entries
 * - Upsert preserves the original startedAt across phase transitions
 * - Reconciliation drops stale/nonexistent/terminal missions and never re-verifies
 *   cross-workspace entries
 * - Reconciliation never issues anything but GET requests -- no auto-approve, no
 *   re-submission of execute_simple, ever
 * - A still-pending approval survives reconciliation; a resolved-elsewhere one is
 *   downgraded instead of being shown as stale
 */

import {
  listMissionRuns,
  saveMissionRun,
  removeMissionRun,
  type StoredMissionRun,
} from "../services/missionRunStore";
import { reconcileMissionRuns } from "../services/missionRunReconciler";
import type { MissionApprovalDetail } from "../services/orchestratorApi";

const assert = {
  strictEqual(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  deepStrictEqual(actual: unknown, expected: unknown, message?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  ok(val: unknown, message?: string) {
    if (!val) {
      throw new Error(message || `Expected value to be truthy, got ${JSON.stringify(val)}`);
    }
  },
};

interface MockedResponse {
  status: number;
  statusText?: string;
  body: unknown;
}

interface MockFetchCall {
  url: string;
  init?: RequestInit;
}

function installMockFetch(responses: MockedResponse[]): { calls: MockFetchCall[]; restore: () => void } {
  const originalFetch = globalThis.fetch;
  const calls: MockFetchCall[] = [];
  let cursor = 0;

  const mockFetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const scripted = responses[cursor++];
    if (!scripted) {
      throw new Error(`Mock fetch invoked more times (call #${cursor}) than scripted (${responses.length})`);
    }
    const bodyText = typeof scripted.body === "string" ? scripted.body : JSON.stringify(scripted.body);
    return {
      ok: scripted.status >= 200 && scripted.status < 300,
      status: scripted.status,
      statusText: scripted.statusText ?? "",
      text: async () => bodyText,
      json: async () => JSON.parse(bodyText),
    } as unknown as Response;
  }) as unknown as typeof fetch;

  globalThis.fetch = mockFetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

// In-memory localStorage stand-in so tests can control throwing/empty/populated
// states precisely, independent of whatever environment tsx runs this under.
class FakeStorage {
  private store = new Map<string, string>();
  private throwOnAccess = false;

  setThrowing(v: boolean) {
    this.throwOnAccess = v;
  }
  getItem(key: string): string | null {
    if (this.throwOnAccess) throw new Error("Storage disabled (simulated private-browsing failure)");
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    if (this.throwOnAccess) throw new Error("Storage disabled (simulated private-browsing failure)");
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    if (this.throwOnAccess) throw new Error("Storage disabled (simulated private-browsing failure)");
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

interface StorageHolder {
  localStorage?: Storage;
}

function setGlobalStorage(storage: FakeStorage): void {
  (globalThis as unknown as StorageHolder).localStorage = storage as unknown as Storage;
}

function clearGlobalStorage(): void {
  delete (globalThis as unknown as StorageHolder).localStorage;
}

function sampleApprovalDetail(overrides: Partial<MissionApprovalDetail> = {}): MissionApprovalDetail {
  return {
    mission_id: "mission-1",
    request_id: "req-1",
    tool_name: "fs.write",
    parameters: { path: "notes.txt" },
    plan_preview: [],
    node_approval_mode: "local-prompt",
    requires_strong_confirmation: false,
    ...overrides,
  };
}

async function runBattery() {
  console.log("============================================================");
  console.log("ARBOR TASK AB (B2): MISSION PERSISTENCE CONTRACT TEST BATTERY");
  console.log("============================================================");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ TEST-${total.toString().padStart(2, "0")}: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ TEST-${total.toString().padStart(2, "0")}: ${name}`);
      console.error(`    Error: ${err?.message || err}`);
      throw err;
    }
  }

  // 1. Empty storage
  await test("listMissionRuns: missing/empty localStorage resolves to []", () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    try {
      assert.deepStrictEqual(listMissionRuns("ws-empty"), []);
    } finally {
      clearGlobalStorage();
    }
  });

  // 2. Throwing storage
  await test("listMissionRuns/saveMissionRun/removeMissionRun never throw when storage throws", () => {
    const fake = new FakeStorage();
    fake.setThrowing(true);
    setGlobalStorage(fake);
    try {
      assert.deepStrictEqual(listMissionRuns("ws-throwing"), []);
      saveMissionRun({
        clientRequestId: "req-x",
        workspaceId: "ws-throwing",
        kind: "simple",
        objective: "test",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "running",
      });
      removeMissionRun("ws-throwing", "req-x");
    } finally {
      clearGlobalStorage();
    }
  });

  // 3. Foreign-workspace entries filtered out
  await test("listMissionRuns: never returns entries tagged for a different workspace", () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    try {
      // Simulate a tampered/copied blob under workspace A's key containing an entry
      // actually tagged for workspace B.
      fake.setItem(
        "arbor-mission-runs-ws-ws-a",
        JSON.stringify([
          {
            clientRequestId: "req-foreign",
            workspaceId: "ws-b",
            kind: "simple",
            objective: "foreign",
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            phase: "running",
          },
        ])
      );
      assert.deepStrictEqual(listMissionRuns("ws-a"), []);
    } finally {
      clearGlobalStorage();
    }
  });

  // 4. Save + list round trip, then remove
  await test("saveMissionRun/listMissionRuns/removeMissionRun round-trip correctly", () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    try {
      const run: StoredMissionRun = {
        clientRequestId: "req-roundtrip",
        workspaceId: "ws-rt",
        kind: "simple",
        objective: "fix the typo",
        startedAt: "2026-11-20T10:00:00.000Z",
        updatedAt: "2026-11-20T10:00:00.000Z",
        phase: "running",
      };
      saveMissionRun(run);
      const listed = listMissionRuns("ws-rt");
      assert.strictEqual(listed.length, 1);
      assert.strictEqual(listed[0].clientRequestId, "req-roundtrip");

      removeMissionRun("ws-rt", "req-roundtrip");
      assert.deepStrictEqual(listMissionRuns("ws-rt"), []);
    } finally {
      clearGlobalStorage();
    }
  });

  // 5. Upsert preserves the original startedAt
  await test("saveMissionRun: re-saving the same clientRequestId preserves the original startedAt", () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    try {
      saveMissionRun({
        clientRequestId: "req-preserve",
        workspaceId: "ws-rt2",
        kind: "simple",
        objective: "x",
        startedAt: "2026-11-20T10:00:00.000Z",
        updatedAt: "2026-11-20T10:00:00.000Z",
        phase: "running",
      });
      saveMissionRun({
        clientRequestId: "req-preserve",
        workspaceId: "ws-rt2",
        kind: "simple",
        objective: "x",
        startedAt: "2026-11-20T10:05:00.000Z", // caller passes "now" again
        updatedAt: "2026-11-20T10:05:00.000Z",
        phase: "awaiting_approval",
        missionId: "mission-9",
      });
      const listed = listMissionRuns("ws-rt2");
      assert.strictEqual(listed.length, 1);
      assert.strictEqual(listed[0].startedAt, "2026-11-20T10:00:00.000Z", "startedAt must stay the original value");
      assert.strictEqual(listed[0].phase, "awaiting_approval");
    } finally {
      clearGlobalStorage();
    }
  });

  // 6. Reconciliation drops an entry with no missionId at all
  await test("reconcileMissionRuns: drops an entry that never got a mission_id, with zero network calls", async () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    const { calls, restore } = installMockFetch([]);
    try {
      saveMissionRun({
        clientRequestId: "req-no-id",
        workspaceId: "ws-recon-1",
        kind: "simple",
        objective: "interrupted before any response",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "running",
      });
      const result = await reconcileMissionRuns("ws-recon-1");
      assert.deepStrictEqual(result, []);
      assert.deepStrictEqual(listMissionRuns("ws-recon-1"), []);
      assert.strictEqual(calls.length, 0, "must not make any network call for an entry with no mission_id");
    } finally {
      restore();
      clearGlobalStorage();
    }
  });

  // 7. Reconciliation drops a mission the backend says doesn't exist (404-style error)
  await test("reconcileMissionRuns: drops a stale entry when the backend reports the mission is gone", async () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    const { restore } = installMockFetch([{ status: 404, body: { detail: "not found" } }]);
    try {
      saveMissionRun({
        clientRequestId: "req-stale",
        workspaceId: "ws-recon-2",
        kind: "simple",
        objective: "stale",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "running",
        missionId: "mission-stale",
      });
      const result = await reconcileMissionRuns("ws-recon-2");
      assert.deepStrictEqual(result, []);
      assert.deepStrictEqual(listMissionRuns("ws-recon-2"), []);
    } finally {
      restore();
      clearGlobalStorage();
    }
  });

  // 8. Reconciliation drops a terminal (COMPLETED) mission -- it belongs in the main list now
  await test("reconcileMissionRuns: drops an entry whose backend status is now terminal", async () => {
    const fake = new FakeStorage();
    setGlobalStorage(fake);
    const { restore } = installMockFetch([
      { status: 200, body: { mission_id: "mission-done", status: "COMPLETED", lifecycle_state: "COMPLETED" } },
    ]);
    try {
      saveMissionRun({
        clientRequestId: "req-done",
        workspaceId: "ws-recon-3",
        kind: "simple",
        objective: "finished while tab was closed",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: "running",
        missionId: "mission-done",
      });
      const result = await reconcileMissionRuns("ws-recon-3");
      assert.deepStrictEqual(result, []);
    } finally {
      restore();
      clearGlobalStorage();
    }
  });

  // 9. A genuinely still-pending approval survives reconciliation unchanged, and the check
  // is READ-ONLY -- no execute_simple / approve / reject call is ever made.
  await test(
    "reconcileMissionRuns: a still-PENDING approval is kept as awaiting_approval via GET-only calls",
    async () => {
      const fake = new FakeStorage();
      setGlobalStorage(fake);
      const approvalDetail = sampleApprovalDetail();
      const { calls, restore } = installMockFetch([
        { status: 200, body: { mission_id: "mission-1", status: "COMMITTED", lifecycle_state: "COMMITTED" } },
        {
          status: 200,
          body: {
            request_id: "req-1",
            workspace_id: "ws-recon-4",
            mission_id: "mission-1",
            tool_name: "fs.write",
            status: "PENDING",
            created_at: "2026-11-20T10:00:00.000Z",
            expires_at: "2026-11-20T10:10:00.000Z",
          },
        },
      ]);
      try {
        saveMissionRun({
          clientRequestId: "req-pending",
          workspaceId: "ws-recon-4",
          kind: "simple",
          objective: "awaiting approval across a refresh",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          phase: "awaiting_approval",
          missionId: "mission-1",
          approvalDetail,
        });
        const result = await reconcileMissionRuns("ws-recon-4");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].phase, "awaiting_approval");
        assert.strictEqual(result[0].approvalDetail?.request_id, "req-1");
        assert.strictEqual(result[0].approvalDetailIsPartial, undefined);

        // No auto-approve/re-submit: exactly the 2 read-only GETs scripted, nothing else,
        // and neither call's URL/method touches execute_simple, approve, or reject.
        assert.strictEqual(calls.length, 2, "must only issue the 2 read-only reconciliation GETs");
        for (const call of calls) {
          assert.strictEqual((call.init?.method || "GET").toUpperCase(), "GET", "must be a GET request");
          assert.strictEqual(/execute_simple|\/approve\b|\/reject\b/i.test(call.url), false, `must never resubmit or decide via ${call.url}`);
        }
      } finally {
        restore();
        clearGlobalStorage();
      }
    }
  );

  // 10. An approval resolved elsewhere (no longer PENDING) is downgraded, not shown stale
  await test(
    "reconcileMissionRuns: an approval resolved elsewhere is downgraded instead of shown as still-pending",
    async () => {
      const fake = new FakeStorage();
      setGlobalStorage(fake);
      const approvalDetail = sampleApprovalDetail();
      const { restore } = installMockFetch([
        { status: 200, body: { mission_id: "mission-1", status: "RUNNING", lifecycle_state: "RUNNING" } },
        {
          status: 200,
          body: {
            request_id: "req-1",
            workspace_id: "ws-recon-5",
            mission_id: "mission-1",
            tool_name: "fs.write",
            status: "APPROVED",
            created_at: "2026-11-20T10:00:00.000Z",
            expires_at: "2026-11-20T10:10:00.000Z",
          },
        },
        { status: 200, body: [] }, // listPendingApprovals: nothing pending for this mission
      ]);
      try {
        saveMissionRun({
          clientRequestId: "req-resolved",
          workspaceId: "ws-recon-5",
          kind: "simple",
          objective: "approved from another tab",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          phase: "awaiting_approval",
          missionId: "mission-1",
          approvalDetail,
        });
        const result = await reconcileMissionRuns("ws-recon-5");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].phase, "running", "must not keep presenting a resolved approval as pending");
      } finally {
        restore();
        clearGlobalStorage();
      }
    }
  );

  // 11. A "running" entry with no cached approval discovers a newly-raised pending one,
  // and marks it partial (since real parameters were never seen by this browser).
  await test(
    "reconcileMissionRuns: discovers a pending approval never seen locally and marks it partial",
    async () => {
      const fake = new FakeStorage();
      setGlobalStorage(fake);
      const { restore } = installMockFetch([
        { status: 200, body: { mission_id: "mission-2", status: "COMMITTED", lifecycle_state: "COMMITTED" } },
        {
          status: 200,
          body: [
            {
              request_id: "req-discovered",
              workspace_id: "ws-recon-6",
              mission_id: "mission-2",
              tool_name: "terminal.execute",
              status: "PENDING",
              created_at: "2026-11-20T10:00:00.000Z",
              expires_at: "2026-11-20T10:10:00.000Z",
            },
          ],
        },
      ]);
      try {
        saveMissionRun({
          clientRequestId: "req-discover",
          workspaceId: "ws-recon-6",
          kind: "simple",
          objective: "a later step paused, never seen by this tab",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          phase: "running",
          missionId: "mission-2",
        });
        const result = await reconcileMissionRuns("ws-recon-6");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].phase, "awaiting_approval");
        assert.strictEqual(result[0].approvalDetailIsPartial, true);
        assert.strictEqual(result[0].approvalDetail?.request_id, "req-discovered");
        // High-risk tool with no explicit backend flag still requires strong confirmation.
        assert.strictEqual(result[0].approvalDetail?.requires_strong_confirmation, true);
      } finally {
        restore();
        clearGlobalStorage();
      }
    }
  );

  // 12. Empty workspaceId never touches the network or storage
  await test("reconcileMissionRuns: an empty workspaceId resolves to [] without any network call", async () => {
    const { calls, restore } = installMockFetch([]);
    try {
      const result = await reconcileMissionRuns("");
      assert.deepStrictEqual(result, []);
      assert.strictEqual(calls.length, 0);
    } finally {
      restore();
    }
  });

  console.log("============================================================");
  console.log(`BATTERY COMPLETE: ${passed}/${total} test specifications passed.`);
  console.log("============================================================");
}

runBattery();
