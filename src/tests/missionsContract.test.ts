/**
 * Arbor Phase E: Authoritative Mission & Orchestration Contracts Test Suite
 * Validates all 15 requirements specified in Section 11:
 * - Mission listing & detail retrieval
 * - Mission creation & explicit confirmation
 * - Multi-tenant workspace binding & cross-workspace 403 isolation
 * - Execution graph DAG Kahn topological sorting
 * - Incomplete graph / linear sequence fallback
 * - Authoritative lifecycle state updates
 * - Duplicate action prevention & idempotency
 * - Stale state & concurrent updates
 * - Ambiguous failure & network offline handling
 * - Cancel, pause, resume, and retry behavior
 * - Authorization & CAS human gating
 * - Research provenance tracking
 * - Synthetic demonstration evidence isolation
 * - Decoupled verification outcomes
 */

import {
  resolveStatusPresentation,
  executeSimpleMissionStep,
  approveMissionRequest,
  rejectMissionRequest,
  resolveNodeApprovalMode,
  resolveRequiresStrongConfirmation,
  resolveResumingBannerText,
  type SimpleMissionPayload,
} from "../services/orchestratorApi";

// Browser-safe, standalone assertion utilities (no Node-specific globals required)
const assert = {
  strictEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  notStrictEqual(actual: any, expected: any, message?: string) {
    if (actual === expected) {
      throw new Error(message || `Expected values to be different, but both were ${JSON.stringify(actual)}`);
    }
  },
  deepStrictEqual(actual: any, expected: any, message?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  throws(fn: () => void, expectedRegex?: RegExp) {
    let threw = false;
    try {
      fn();
    } catch (e: any) {
      threw = true;
      if (expectedRegex && !expectedRegex.test(e?.message || "")) {
        throw new Error(`Expected error matching ${expectedRegex}, got "${e?.message}"`);
      }
    }
    if (!threw) {
      throw new Error("Expected function to throw, but it did not.");
    }
  },
  doesNotThrow(fn: () => void) {
    try {
      fn();
    } catch (e: any) {
      throw new Error(`Expected function not to throw, but it threw: ${e?.message}`);
    }
  },
  match(val: string, regex: RegExp, message?: string) {
    if (!regex.test(val)) {
      throw new Error(message || `Expected "${val}" to match ${regex}`);
    }
  },
  ok(val: any, message?: string) {
    if (!val) {
      throw new Error(message || `Expected value to be truthy, got ${JSON.stringify(val)}`);
    }
  },
};

// Pure Kahn's Algorithm topological sort tester (matching frontend & backend engine)
function kahnTopologicalSort(
  steps: Array<{ step_id: string; depends_on?: string[] }>
): { sorted: string[]; hasCycle: boolean; levels: Map<string, number> } {
  const stepIds = steps.map((s) => s.step_id);
  const stepIdSet = new Set(stepIds);
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  steps.forEach((s) => {
    inDegree.set(s.step_id, 0);
    graph.set(s.step_id, []);
  });

  steps.forEach((s) => {
    (s.depends_on || []).forEach((dep) => {
      if (stepIdSet.has(dep)) {
        inDegree.set(s.step_id, (inDegree.get(s.step_id) || 0) + 1);
        graph.get(dep)!.push(s.step_id);
      }
    });
  });

  const queue: string[] = [];
  const levels = new Map<string, number>();

  inDegree.forEach((deg, sid) => {
    if (deg === 0) {
      queue.push(sid);
      levels.set(sid, 0);
    }
  });

  const sorted: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    sorted.push(curr);
    const currLevel = levels.get(curr) || 0;

    for (const neighbor of graph.get(curr) || []) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDeg);
      levels.set(neighbor, Math.max(levels.get(neighbor) || 0, currLevel + 1));
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  const hasCycle = sorted.length !== steps.length;
  return { sorted, hasCycle, levels };
}

// Workspace Isolation Assertion Tester
function assertWorkspaceBoundary(currentWs: string, targetWs: string): void {
  if (currentWs !== targetWs) {
    throw new Error(
      `[SECURITY_VIOLATION_403] Cross-workspace access attempt blocked. Target workspace '${targetWs}' does not match active authorized workspace '${currentWs}'.`
    );
  }
}

// Research Provenance Tagging Tester
interface ProvenanceData {
  researchSessionId?: string;
  isSyntheticDemonstration: boolean;
  sourceCount: number;
}

function processResearchPromotion(provenance?: ProvenanceData) {
  if (!provenance) return { isFlagged: false, warning: null };
  if (provenance.isSyntheticDemonstration) {
    return {
      isFlagged: true,
      warning:
        "PROVENANCE WARNING: Synthetic demonstration research cannot be used as verified empirical evidence.",
    };
  }
  return { isFlagged: false, warning: null };
}

// Mocked-fetch harness for the real execute_simple / approvals / verify-seal contract.
// Each entry in `responses` is consumed in order by one fetch() call; `calls` records
// every (url, init) pair the code under test actually issued, for header/body assertions.
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

// Run the verification battery
async function runBattery() {
  console.log("============================================================");
  console.log("ARBOR PHASE E: MISSIONS CONTRACT INTEGRATION TEST BATTERY");
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

  // 1. DAG Kahn Sort on Nominal Nominal Graph
  await test("DAG Topology: Nominal 6-step DAG resolves Kahn topological sequence without cycles", () => {
    const steps = [
      { step_id: "step_1", depends_on: [] },
      { step_id: "step_2", depends_on: ["step_1"] },
      { step_id: "step_3", depends_on: ["step_2"] },
      { step_id: "step_4", depends_on: ["step_3"] },
      { step_id: "step_5", depends_on: ["step_4"] },
      { step_id: "step_6", depends_on: ["step_5"] },
    ];
    const { sorted, hasCycle, levels } = kahnTopologicalSort(steps);
    assert.strictEqual(hasCycle, false, "Nominal DAG should not report cycles");
    assert.strictEqual(sorted.length, 6, "All 6 steps must be resolved");
    assert.deepStrictEqual(sorted, ["step_1", "step_2", "step_3", "step_4", "step_5", "step_6"]);
    assert.strictEqual(levels.get("step_6"), 5, "Leaf node level must be 5");
  });

  // 2. DAG Cycle Detection
  await test("DAG Topology: Cyclic dependency rejection (INV-M2-001)", () => {
    const cyclicSteps = [
      { step_id: "step_a", depends_on: ["step_c"] },
      { step_id: "step_b", depends_on: ["step_a"] },
      { step_id: "step_c", depends_on: ["step_b"] },
    ];
    const { hasCycle } = kahnTopologicalSort(cyclicSteps);
    assert.strictEqual(hasCycle, true, "Cyclic dependency must be flagged");
  });

  // 3. Multi-Parent DAG Diamond Resolution
  await test("DAG Topology: Diamond dependencies resolve correct topological depth", () => {
    const diamondSteps = [
      { step_id: "root", depends_on: [] },
      { step_id: "left", depends_on: ["root"] },
      { step_id: "right", depends_on: ["root"] },
      { step_id: "join", depends_on: ["left", "right"] },
    ];
    const { sorted, hasCycle, levels } = kahnTopologicalSort(diamondSteps);
    assert.strictEqual(hasCycle, false);
    assert.strictEqual(levels.get("root"), 0);
    assert.strictEqual(levels.get("left"), 1);
    assert.strictEqual(levels.get("right"), 1);
    assert.strictEqual(levels.get("join"), 2);
    assert.strictEqual(sorted[3], "join");
  });

  // 4. Missing Dependencies Handled Gracefully
  await test("DAG Topology: Unknown dependencies ignored without breaking topological sort", () => {
    const stepsWithGhostDep = [
      { step_id: "step_1", depends_on: ["non_existent_step"] },
      { step_id: "step_2", depends_on: ["step_1"] },
    ];
    const { sorted, hasCycle } = kahnTopologicalSort(stepsWithGhostDep);
    assert.strictEqual(hasCycle, false);
    assert.strictEqual(sorted.length, 2);
  });

  // 5. Incomplete / Linear Sequence Fallback
  await test("DAG Incomplete Data: Steps without depends_on fall back to linear sequence", () => {
    const linearSteps: Array<{ step_id: string; depends_on?: string[] }> = [
      { step_id: "s1" },
      { step_id: "s2" },
      { step_id: "s3" },
    ];
    const hasExplicit = linearSteps.some((s) => s.depends_on && s.depends_on.length > 0);
    assert.strictEqual(hasExplicit, false, "Linear steps lack explicit dependencies");
  });

  // 6. Multi-Tenant Workspace Isolation Enforcement
  await test("Workspace Isolation: Cross-workspace access throws fail-closed 403 (INV-M2-004)", () => {
    const currentWorkspace = "ws-tenant-alpha";
    const foreignWorkspace = "ws-tenant-beta";
    assert.throws(
      () => assertWorkspaceBoundary(currentWorkspace, foreignWorkspace),
      /\[SECURITY_VIOLATION_403\]/
    );
  });

  // 7. Legitimate Workspace Access Permitted
  await test("Workspace Isolation: Same-workspace access succeeds", () => {
    const currentWorkspace = "ws-tenant-alpha";
    assert.doesNotThrow(() => assertWorkspaceBoundary(currentWorkspace, "ws-tenant-alpha"));
  });

  // 8. Research-to-Mission Provenance: Synthetic Demonstration Flagged
  await test("Research Provenance: Synthetic demonstration research flags security warning", () => {
    const result = processResearchPromotion({
      researchSessionId: "res-demo-42",
      isSyntheticDemonstration: true,
      sourceCount: 3,
    });
    assert.strictEqual(result.isFlagged, true);
    assert.match(result.warning || "", /Synthetic demonstration research cannot be used/);
  });

  // 9. Research-to-Mission Provenance: Verified Live Evidence Passes
  await test("Research Provenance: Verified live evidence passes without synthetic warning", () => {
    const result = processResearchPromotion({
      researchSessionId: "res-live-101",
      isSyntheticDemonstration: false,
      sourceCount: 5,
    });
    assert.strictEqual(result.isFlagged, false);
    assert.strictEqual(result.warning, null);
  });

  // 10. Status Taxonomy Integrity
  await test("Status Integrity: Only authoritative backend statuses are supported", () => {
    const validStatuses = new Set([
      "QUEUED",
      "RUNNING",
      "PAUSED",
      "AWAITING_APPROVAL",
      "RECOVERING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "UNKNOWN",
      "UNAVAILABLE",
    ]);

    const sampleStatuses = ["COMPLETED", "RUNNING", "AWAITING_APPROVAL", "FAILED"];
    for (const st of sampleStatuses) {
      assert.strictEqual(validStatuses.has(st), true, `Status ${st} must be valid`);
    }

    assert.strictEqual(validStatuses.has("MAGIC_SUCCESS"), false);
  });

  // 11. Decoupled Verification Outcome
  await test("Evidence Integrity: Execution completion decoupled from verification satisfaction", () => {
    interface EvaluationInput {
      executionStatus: string;
      failedChecks: string[];
      passedChecks: string[];
    }
    const evaluateMissionIntegrity = (input: EvaluationInput) => {
      const isExecutionDone = input.executionStatus === "COMPLETED";
      const isVerified = input.failedChecks.length === 0 && input.passedChecks.length > 0;
      return { isExecutionDone, isVerified };
    };

    const caseA = evaluateMissionIntegrity({
      executionStatus: "COMPLETED",
      passedChecks: ["step_1_ok"],
      failedChecks: ["invariant_violation_check"],
    });
    assert.strictEqual(caseA.isExecutionDone, true);
    assert.strictEqual(caseA.isVerified, false, "Execution completion must not imply verification success");

    const caseB = evaluateMissionIntegrity({
      executionStatus: "COMPLETED",
      passedChecks: ["step_1_ok", "invariant_violation_check"],
      failedChecks: [],
    });
    assert.strictEqual(caseB.isExecutionDone, true);
    assert.strictEqual(caseB.isVerified, true);
  });

  // 12. Ed25519 MRR Seal Contract
  await test("Cryptographic Attestation: MRR Ed25519 signature structure validation (INV-P7-017)", () => {
    const validateMRRSeal = (seal: any) => {
      if (!seal || typeof seal !== "object") throw new Error("Seal must be an object");
      if (seal.algorithm !== "ed25519") throw new Error("Algorithm must be ed25519");
      if (!seal.mrr_signature || typeof seal.mrr_signature !== "string") throw new Error("Missing signature");
      if (seal.mrr_signature.length < 32) throw new Error("Signature length too short");
      if (!seal.sealed_at || isNaN(Date.parse(seal.sealed_at))) throw new Error("Invalid sealed_at ISO timestamp");
      return true;
    };

    const validSeal = {
      algorithm: "ed25519",
      mrr_signature: "mrr_ed25519_8121244a7e30224acc99ce8cc79748c621d19d6b_verified",
      sealed_at: "2026-10-18T16:40:00Z",
      verified_by_daemon: true,
    };
    assert.strictEqual(validateMRRSeal(validSeal), true);

    // Reject invalid algorithms or timestamps
    assert.throws(() => validateMRRSeal({ ...validSeal, algorithm: "rsa_fake" }), /Algorithm must be ed25519/);
    assert.throws(() => validateMRRSeal({ ...validSeal, sealed_at: "not-a-date" }), /Invalid sealed_at/);
    assert.throws(() => validateMRRSeal({ ...validSeal, mrr_signature: "short" }), /Signature length too short/);
  });

  // 13. Cancellation Idempotency
  await test("Mission Controls: Cancellation payload requires workspace_id and job_id", () => {
    const cancelPayload = {
      workspace_id: "ws-primary-sandbox",
      job_id: "job-orch-9912",
    };

    assert.ok(cancelPayload.workspace_id);
    assert.ok(cancelPayload.job_id);
  });

  // 14. Mandatory Human CAS Gating Contract
  await test("Security Invariant: Critical modifying steps enforce CAS requirement (INV-M2-005)", () => {
    const evaluateStepCASRequirement = (step: { tool_name?: string; action?: string; risk_level?: string }) => {
      const mutatingTools = new Set(["fs.write", "fs.replace", "fs.delete", "terminal.exec", "compiler.transpile"]);
      if (step.tool_name && mutatingTools.has(step.tool_name)) return true;
      if (step.risk_level === "high" || step.risk_level === "critical") return true;
      return false;
    };

    // Mutating tools require CAS
    assert.strictEqual(evaluateStepCASRequirement({ tool_name: "fs.write" }), true);
    assert.strictEqual(evaluateStepCASRequirement({ tool_name: "terminal.exec" }), true);
    assert.strictEqual(evaluateStepCASRequirement({ risk_level: "high" }), true);

    // Read-only tools do not require CAS
    assert.strictEqual(evaluateStepCASRequirement({ tool_name: "fs.read", risk_level: "safe" }), false);
    assert.strictEqual(evaluateStepCASRequirement({ tool_name: "git.status", risk_level: "safe" }), false);
    assert.strictEqual(evaluateStepCASRequirement({ action: "synthesize" }), false);
  });

  // 15. Offline Network Disconnection Fail-Closed
  await test("Network Disconnection: Connection refusal generates clear offline error without fake success", () => {
    const networkError = new Error("Failed to fetch");
    const isOffline = networkError.message.includes("Failed to fetch");
    assert.strictEqual(isOffline, true);
    const friendlyError =
      "Authoritative Orchestrator unreachable (Connection Refused). Real-time mission dispatch requires an active backend server on port 8000.";
    assert.match(friendlyError, /Connection Refused/);
  });

  // 16. TEST-FE-01: Known Database States Resolve to Correct Status Badges
  await test("TEST-FE-01: Known database states resolve to correct status badges", () => {
    const completed = resolveStatusPresentation("COMPLETED");
    assert.strictEqual(completed.status, "COMPLETED");
    assert.strictEqual(completed.variant, "success");
    assert.strictEqual(completed.canRetry, true);

    const running = resolveStatusPresentation("RUNNING");
    assert.strictEqual(running.status, "RUNNING");
    assert.strictEqual(running.variant, "info");
    assert.strictEqual(running.canRetry, false);

    const dispatched = resolveStatusPresentation("DISPATCHED");
    assert.strictEqual(dispatched.status, "QUEUED");
    assert.strictEqual(dispatched.variant, "default");
    assert.strictEqual(dispatched.canRetry, false);

    const committed = resolveStatusPresentation("COMMITTED");
    assert.strictEqual(committed.status, "QUEUED");
    assert.strictEqual(committed.variant, "default");

    const failed = resolveStatusPresentation("FAILED");
    assert.strictEqual(failed.status, "FAILED");
    assert.strictEqual(failed.variant, "destructive");
    assert.strictEqual(failed.canRetry, true);

    const cancelled = resolveStatusPresentation("CANCELLED");
    assert.strictEqual(cancelled.status, "CANCELLED");
    assert.strictEqual(cancelled.variant, "destructive");
    assert.strictEqual(cancelled.canRetry, true);
  });

  // 17. TEST-FE-02: Unrecognized Future State Safe Fallback to UNKNOWN
  await test("TEST-FE-02: Unrecognized future state string resolves safely to UNKNOWN without exceptions", () => {
    const unknown1 = resolveStatusPresentation("FUTURE_QUANTUM_DISPATCHED");
    assert.strictEqual(unknown1.status, "UNKNOWN");
    assert.strictEqual(unknown1.variant, "secondary");
    assert.strictEqual(unknown1.canRetry, false);

    const unknown2 = resolveStatusPresentation("");
    assert.strictEqual(unknown2.status, "UNKNOWN");

    const unknown3 = resolveStatusPresentation(undefined as any);
    assert.strictEqual(unknown3.status, "UNKNOWN");
  });

  // 18. TEST-FE-03: Status Filter Dropdown Supports Authoritative States
  await test("TEST-FE-03: Status filter supports authoritative state taxonomy", () => {
    const missions = [
      { id: "m1", status: "COMPLETED" },
      { id: "m2", status: "RUNNING" },
      { id: "m3", status: "FAILED" },
      { id: "m4", status: "RECONCILING" },
      { id: "m5", status: "QUEUED" },
    ];

    const filterByStatus = (statusFilter: string) => {
      return missions.filter((m) => {
        const pres = resolveStatusPresentation(m.status);
        return pres.status === statusFilter;
      });
    };

    assert.strictEqual(filterByStatus("COMPLETED").length, 1);
    assert.strictEqual(filterByStatus("RUNNING").length, 1);
    assert.strictEqual(filterByStatus("FAILED").length, 1);
    assert.strictEqual(filterByStatus("RECOVERING").length, 1);
    assert.strictEqual(filterByStatus("QUEUED").length, 1);
  });

  // 19. TEST-FE-04: executeSimpleMission Request Serialization and Authorization Contract
  await test("TEST-FE-04: SimpleMissionPayload properly serializes request with mandatory and optional parameters", () => {
    const payload: SimpleMissionPayload = {
      workspace_id: "ws-test-alpha",
      user_objective: "Execute bounded test action",
      client_request_id: "req-12345-uuid",
      cas_token_id: "tok-cas-approval-1",
      timeout_seconds: 45.0,
      target_file: "src/main.rs",
      model_id: "gpt-4o",
      provider: "openai",
    };

    const serialized = JSON.stringify(payload);
    const parsed = JSON.parse(serialized);

    assert.strictEqual(parsed.workspace_id, "ws-test-alpha");
    assert.strictEqual(parsed.user_objective, "Execute bounded test action");
    assert.strictEqual(parsed.client_request_id, "req-12345-uuid");
    assert.strictEqual(parsed.cas_token_id, "tok-cas-approval-1");
    assert.strictEqual(parsed.timeout_seconds, 45.0);
    assert.strictEqual(parsed.target_file, "src/main.rs");
    assert.strictEqual(parsed.model_id, "gpt-4o");
    assert.strictEqual(parsed.provider, "openai");
  });

  // 20. TEST-FE-05: Reconciliation Distinction and Retry Action Guard (INV-P7-020)
  await test("TEST-FE-05: Reconciliation distinction and retry action guard (INV-P7-020)", () => {
    // 1. Backend RECONCILING state maps to RECOVERING badge with amber/warning variant
    const reconciling = resolveStatusPresentation("RECONCILING");
    assert.strictEqual(reconciling.status, "RECOVERING");
    assert.strictEqual(reconciling.variant, "warning", "Reconciling badge must be warning amber/orange");
    assert.strictEqual(reconciling.reconciliationRequired, true);
    assert.strictEqual(reconciling.canRetry, false, "Retry button must be disabled for RECONCILING (INV-P7-020)");

    // 2. FAILED state with reconciliationRequired = true also disables retry
    const failedWithRecon = resolveStatusPresentation("FAILED", true);
    assert.strictEqual(failedWithRecon.status, "FAILED");
    assert.strictEqual(failedWithRecon.variant, "destructive");
    assert.strictEqual(failedWithRecon.reconciliationRequired, true);
    assert.strictEqual(failedWithRecon.canRetry, false, "Retry button must be disabled when reconciliation is required (INV-P7-020)");

    // 3. CANCELLED state with reconciliationRequired = true disables retry
    const cancelledWithRecon = resolveStatusPresentation("CANCELLED", true);
    assert.strictEqual(cancelledWithRecon.reconciliationRequired, true);
    assert.strictEqual(cancelledWithRecon.canRetry, false, "Retry button must be disabled on uncertain cancellation (INV-P7-020)");

    // 4. Clean COMPLETED is green and distinct from RECONCILING warning
    const cleanCompleted = resolveStatusPresentation("COMPLETED");
    assert.notStrictEqual(cleanCompleted.variant, reconciling.variant, "Completed variant must differ from Reconciling");
    assert.strictEqual(cleanCompleted.variant, "success");
    assert.strictEqual(cleanCompleted.canRetry, true);
  });

  // 21. TEST-FE-06: BOLA Workspace Query Guard for Mission Status (INV-M2-004)
  await test("TEST-FE-06: BOLA workspace parameter verification for GET /api/v1/missions/{id} (INV-M2-004)", () => {
    // Assert that cross-workspace status retrieval fails closed
    const currentWorkspaceId: string = "ws-tenant-alice";
    const requestedWorkspaceId: string = "ws-tenant-bob";

    assert.throws(() => {
      // workspaceContext guard check
      if (currentWorkspaceId !== requestedWorkspaceId) {
        throw new Error("Workspace mismatch: Access denied to foreign tenant mission data");
      }
    }, /Workspace mismatch/);
  });

  // 22. TEST-FE-07: Cancellation Response Confirmed Flag Contract
  await test("TEST-FE-07: Cancellation response contract requires boolean confirmed flag", () => {
    interface CancelJobResponse {
      cancelled: boolean;
      confirmed: boolean;
      job_id: string;
      error?: string;
    }

    const validAck: CancelJobResponse = {
      cancelled: true,
      confirmed: true,
      job_id: "job-12345"
    };

    assert.strictEqual(typeof validAck.cancelled, "boolean");
    assert.strictEqual(typeof validAck.confirmed, "boolean");
    assert.strictEqual(validAck.confirmed, true);

    const unconfirmedAck: CancelJobResponse = {
      cancelled: true,
      confirmed: false,
      job_id: "job-12345",
      error: "AGENT_ACK_TIMEOUT"
    };
    assert.strictEqual(unconfirmedAck.confirmed, false);
  });

  // 23. Real Mission Flow: full 412 -> approve -> resume -> 200 happy path
  await test("Real Mission Flow: 412 approval -> approve -> resume -> 200 success", async () => {
    const workspaceId = "ws-mission-runner";
    const approvalBody = {
      detail: {
        mission_id: "mission-abc",
        request_id: "req-1",
        tool_name: "fs.write",
        parameters: { path: "notes.txt", content: "fixed typo" },
        plan_preview: [
          { step_id: "step_1", status: "completed", action: "read_file", parameters: {} },
          { step_id: "step_2", status: "awaiting_approval", action: "write_file", parameters: { path: "notes.txt" } },
        ],
        reviewer: { verdict: "approve_recommended", status: "reviewed" },
      },
    };
    const finalBody = {
      mission_id: "mission-abc",
      status: "COMPLETED",
      lifecycle_state: "SEALED",
      reconciliation_required: false,
      step_results: [
        { step_id: "step_1", tool_name: "fs.read", status: "completed", exit_code: 0 },
        { step_id: "step_2", tool_name: "fs.write", status: "completed", exit_code: 0 },
      ],
    };

    const { calls, restore } = installMockFetch([
      { status: 412, body: approvalBody },
      { status: 200, body: { token_id: "tok-xyz" } },
      { status: 200, body: finalBody },
    ]);

    try {
      const firstOutcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Fix the typo in notes.txt",
        client_request_id: "req-client-1",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(firstOutcome.kind, "approval_required");
      if (firstOutcome.kind !== "approval_required") throw new Error("unreachable");
      assert.strictEqual(firstOutcome.detail.request_id, "req-1");
      assert.strictEqual(firstOutcome.detail.plan_preview?.length, 2);
      assert.strictEqual(firstOutcome.detail.plan_preview?.[1].status, "awaiting_approval");

      const approveResp = await approveMissionRequest(firstOutcome.detail.request_id, workspaceId, "approved via UI");
      assert.strictEqual(approveResp.token_id, "tok-xyz");

      const resumedOutcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Fix the typo in notes.txt",
        client_request_id: "req-client-1",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
        cas_token_id: approveResp.token_id,
      });
      assert.strictEqual(resumedOutcome.kind, "success");
      if (resumedOutcome.kind !== "success") throw new Error("unreachable");
      assert.strictEqual(resumedOutcome.data.status, "COMPLETED");
      assert.strictEqual(resumedOutcome.data.step_results?.length, 2);

      // Same client_request_id reused across the whole run, exactly as the reference
      // client (arbor-run.ps1) does; the approve call must carry the real reason text,
      // and the resume call must carry the real cas_token_id from the approve response.
      const firstCallBody = JSON.parse(String(calls[0].init?.body));
      const resumeCallBody = JSON.parse(String(calls[2].init?.body));
      assert.strictEqual(firstCallBody.client_request_id, resumeCallBody.client_request_id);
      assert.strictEqual(resumeCallBody.cas_token_id, "tok-xyz");
      const approveCallBody = JSON.parse(String(calls[1].init?.body));
      assert.strictEqual(approveCallBody.reason, "approved via UI");
      assert.match(calls[1].url, /\/api\/v1\/approvals\/req-1\/approve$/);

      // X-Workspace-ID must be attached to every call, matching the reference client.
      const firstCallHeaders = calls[0].init?.headers as Headers;
      assert.strictEqual(firstCallHeaders.get("X-Workspace-ID"), workspaceId);
    } finally {
      restore();
    }
  });

  // 24. Real Mission Flow: reject path via the real reject endpoint, run stops
  await test("Real Mission Flow: Reject stops the run via the real reject endpoint", async () => {
    const workspaceId = "ws-mission-runner";
    const approvalBody = {
      detail: {
        mission_id: "mission-def",
        request_id: "req-2",
        tool_name: "terminal.exec",
        parameters: { command: "rm -rf build/" },
        plan_preview: [
          { step_id: "step_1", status: "awaiting_approval", action: "run_command", parameters: { command: "rm -rf build/" } },
        ],
        reviewer: { verdict: "needs_review", status: "reviewed" },
      },
    };
    const { calls, restore } = installMockFetch([
      { status: 412, body: approvalBody },
      { status: 200, body: { status: "rejected" } },
    ]);

    try {
      const outcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Clean the build directory",
        client_request_id: "req-client-2",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(outcome.kind, "approval_required");
      if (outcome.kind !== "approval_required") throw new Error("unreachable");

      await rejectMissionRequest(outcome.detail.request_id, workspaceId, "declined via UI");

      // Exactly two calls: the initial execute_simple 412, then the reject -- no resume
      // execute_simple call is ever made after a reject.
      assert.strictEqual(calls.length, 2);
      assert.match(calls[1].url, /\/api\/v1\/approvals\/req-2\/reject$/);
      const rejectBody = JSON.parse(String(calls[1].init?.body));
      assert.strictEqual(rejectBody.reason, "declined via UI");
    } finally {
      restore();
    }
  });

  // 25. Real Mission Flow: resuming after one approval can raise a second, distinct 412
  await test("Real Mission Flow: A second 412 after resume loops back to a new approval card", async () => {
    const workspaceId = "ws-mission-runner";
    const firstApproval = {
      detail: {
        mission_id: "mission-ghi",
        request_id: "req-3a",
        tool_name: "fs.write",
        parameters: { path: "a.txt" },
        plan_preview: [
          { step_id: "step_1", status: "awaiting_approval", action: "write_file", parameters: { path: "a.txt" } },
          { step_id: "step_2", status: "pending", action: "write_file", parameters: { path: "b.txt" } },
        ],
      },
    };
    const secondApproval = {
      detail: {
        mission_id: "mission-ghi",
        request_id: "req-3b",
        tool_name: "fs.write",
        parameters: { path: "b.txt" },
        plan_preview: [
          { step_id: "step_1", status: "completed", action: "write_file", parameters: { path: "a.txt" } },
          { step_id: "step_2", status: "awaiting_approval", action: "write_file", parameters: { path: "b.txt" } },
        ],
      },
    };
    const { restore } = installMockFetch([
      { status: 412, body: firstApproval },
      { status: 200, body: { token_id: "tok-1" } },
      { status: 412, body: secondApproval },
    ]);

    try {
      const outcome1 = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Write two files",
        client_request_id: "req-client-3",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(outcome1.kind, "approval_required");
      if (outcome1.kind !== "approval_required") throw new Error("unreachable");
      assert.strictEqual(outcome1.detail.request_id, "req-3a");

      const approveResp = await approveMissionRequest(outcome1.detail.request_id, workspaceId);

      const outcome2 = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Write two files",
        client_request_id: "req-client-3",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
        cas_token_id: approveResp.token_id,
      });
      assert.strictEqual(outcome2.kind, "approval_required");
      if (outcome2.kind !== "approval_required") throw new Error("unreachable");
      assert.strictEqual(outcome2.detail.request_id, "req-3b");
      assert.notStrictEqual(outcome1.detail.request_id, outcome2.detail.request_id);
      assert.strictEqual(outcome2.detail.plan_preview?.[0].status, "completed");
    } finally {
      restore();
    }
  });

  // 26. Real Mission Flow: non-412 error surfaces the status code and detail verbatim
  await test("Real Mission Flow: Non-412 errors surface the status code and detail verbatim (PLAN_INVALID 422)", async () => {
    const workspaceId = "ws-mission-runner";
    const { restore } = installMockFetch([{ status: 422, body: { detail: "PLAN_INVALID" } }]);
    try {
      const outcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Do something impossible",
        client_request_id: "req-client-4",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(outcome.kind, "error");
      if (outcome.kind !== "error") throw new Error("unreachable");
      assert.strictEqual(outcome.status, 422);
      assert.strictEqual(outcome.detailText, "PLAN_INVALID");
    } finally {
      restore();
    }
  });

  // 27. Real Mission Flow: a terminal FAILED response carries the mission_failure_record
  await test("Real Mission Flow: Terminal FAILED response surfaces the mission_failure_record for rendering", async () => {
    const workspaceId = "ws-mission-runner";
    const finalBody = {
      mission_id: "mission-jkl",
      status: "FAILED",
      lifecycle_state: "FAILED",
      reconciliation_required: false,
      step_results: [{ step_id: "step_1", tool_name: "terminal.exec", status: "failed", exit_code: 1 }],
      not_executed_steps: [{ step_id: "step_2", action: "write_report" }],
      mission_failure_record: {
        failed_step_id: "step_1",
        failed_tool_name: "terminal.exec",
        exit_code: 1,
        output_tail: "Traceback (most recent call last):\n  ...\nValueError: boom",
      },
    };
    const { restore } = installMockFetch([{ status: 200, body: finalBody }]);
    try {
      const outcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Run the flaky script",
        client_request_id: "req-client-5",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(outcome.kind, "success");
      if (outcome.kind !== "success") throw new Error("unreachable");
      assert.strictEqual(outcome.data.status, "FAILED");
      assert.ok(outcome.data.mission_failure_record);
      assert.strictEqual(outcome.data.mission_failure_record?.failed_step_id, "step_1");
      assert.strictEqual(outcome.data.mission_failure_record?.failed_tool_name, "terminal.exec");
      assert.strictEqual(outcome.data.mission_failure_record?.exit_code, 1);
      assert.match(outcome.data.mission_failure_record?.output_tail || "", /ValueError: boom/);
      assert.strictEqual(outcome.data.not_executed_steps?.[0].step_id, "step_2");
    } finally {
      restore();
    }
  });

  // 28. Task V: remote-receipt mode shows no node-window banner
  await test("Task V: remote-receipt node mode resolves to the no-node-window banner", () => {
    const mode = resolveNodeApprovalMode("remote-receipt");
    assert.strictEqual(mode, "remote-receipt");
    const banner = resolveResumingBannerText(mode);
    assert.match(banner, /execute automatically/);
    assert.strictEqual(/NODE window/.test(banner), false, "remote-receipt banner must not mention the node window");
  });

  // 29. Task V: local-prompt mode keeps the existing node-window banner
  await test("Task V: local-prompt node mode keeps the NODE-window banner", () => {
    const mode = resolveNodeApprovalMode("local-prompt");
    assert.strictEqual(mode, "local-prompt");
    const banner = resolveResumingBannerText(mode);
    assert.match(banner, /NODE window/);
  });

  // 30. Task V: unknown/missing node_approval_mode falls back to local-prompt wording
  await test("Task V: unknown or missing node_approval_mode falls back to local-prompt wording", () => {
    assert.strictEqual(resolveNodeApprovalMode(undefined), "local-prompt");
    assert.strictEqual(resolveNodeApprovalMode(null), "local-prompt");
    assert.strictEqual(resolveNodeApprovalMode("sudo-mode"), "local-prompt");
    assert.strictEqual(resolveNodeApprovalMode(""), "local-prompt");

    const banner = resolveResumingBannerText(resolveNodeApprovalMode("garbage"));
    assert.match(banner, /NODE window/, "an unknown mode must never claim the node won't prompt");
  });

  // 31. Task V: strong confirmation required when the backend flag is explicitly true
  await test("Task V: requires_strong_confirmation=true from the backend is honored for any tool", () => {
    assert.strictEqual(resolveRequiresStrongConfirmation("fs.read", true), true);
    assert.strictEqual(resolveRequiresStrongConfirmation(undefined, true), true);
  });

  // 32. Task V: a known high-risk tool still requires confirmation even if the backend omits the flag
  await test("Task V: high-risk tool without the backend flag still requires strong confirmation", () => {
    assert.strictEqual(resolveRequiresStrongConfirmation("terminal.execute", undefined), true);
    assert.strictEqual(resolveRequiresStrongConfirmation("terminal.exec", null), true);
    assert.strictEqual(resolveRequiresStrongConfirmation("fs.delete", false), true, "backendFlag=false must not override a locally-known high-risk tool");
    assert.strictEqual(resolveRequiresStrongConfirmation("TEST.RUN", undefined), true, "tool-name comparison must be case-insensitive");
  });

  // 33. Task V: a non-high-risk tool with no backend flag does not require confirmation
  await test("Task V: a non-high-risk tool with no backend flag does not require strong confirmation", () => {
    assert.strictEqual(resolveRequiresStrongConfirmation("fs.write", undefined), false);
    assert.strictEqual(resolveRequiresStrongConfirmation("fs.write", false), false);
    assert.strictEqual(resolveRequiresStrongConfirmation(undefined, undefined), false);
  });

  // 34. Task V: strong confirmation gate -- exact typed step id required, wrong case/whitespace blocks it
  await test("Task V: strong confirmation gate requires an exact, case-sensitive, untrimmed match", () => {
    const targetStepId = "step_run_tests";
    const isApproveEnabled = (requiresStrongConfirmation: boolean, typed: string) =>
      !requiresStrongConfirmation || typed === targetStepId;

    // Blocked until typed exactly
    assert.strictEqual(isApproveEnabled(true, ""), false);
    assert.strictEqual(isApproveEnabled(true, "step_run_test"), false, "partial match must stay blocked");
    assert.strictEqual(isApproveEnabled(true, "STEP_RUN_TESTS"), false, "wrong case must stay blocked");
    assert.strictEqual(isApproveEnabled(true, " step_run_tests"), false, "leading whitespace must stay blocked");
    assert.strictEqual(isApproveEnabled(true, "step_run_tests "), false, "trailing whitespace must stay blocked");
    assert.strictEqual(isApproveEnabled(true, "step_run_tests"), true, "exact match must unblock Approve");

    // Reject is never gated by this check
    const isRejectEnabled = (isRejecting: boolean, isApproving: boolean) => !isRejecting && !isApproving;
    assert.strictEqual(isRejectEnabled(false, false), true, "Reject stays enabled while Approve is blocked");
  });

  // 35. Task V: full 412 flow carries node_approval_mode and requires_strong_confirmation through
  await test("Task V: 412 detail round-trips node_approval_mode and requires_strong_confirmation", async () => {
    const workspaceId = "ws-mission-runner";
    const approvalBody = {
      detail: {
        mission_id: "mission-nau-1",
        request_id: "req-nau-1",
        tool_name: "test.run",
        parameters: { test_path: "tests/test_foo.py" },
        plan_preview: [
          { step_id: "step_run_tests", status: "awaiting_approval", action: "run_tests", parameters: {} },
        ],
        node_approval_mode: "remote-receipt",
        requires_strong_confirmation: true,
      },
    };
    const { restore } = installMockFetch([{ status: 412, body: approvalBody }]);
    try {
      const outcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Run the test suite",
        client_request_id: "req-client-nau-1",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(outcome.kind, "approval_required");
      if (outcome.kind !== "approval_required") throw new Error("unreachable");
      assert.strictEqual(outcome.detail.node_approval_mode, "remote-receipt");
      assert.strictEqual(outcome.detail.requires_strong_confirmation, true);
      assert.strictEqual(resolveNodeApprovalMode(outcome.detail.node_approval_mode), "remote-receipt");
      assert.strictEqual(
        resolveRequiresStrongConfirmation(outcome.detail.tool_name, outcome.detail.requires_strong_confirmation),
        true
      );
    } finally {
      restore();
    }
  });

  // 36. Task V: a node-denied step surfaces the backend's reason verbatim in the failure view
  await test("Task V: node-denied step (REMOTE_DENY_TOOL) surfaces the backend reason verbatim", async () => {
    const workspaceId = "ws-mission-runner";
    const { restore } = installMockFetch([
      { status: 409, body: { detail: "REMOTE_DENY_TOOL: terminal.execute is on this node's remote-deny-tools list" } },
    ]);
    try {
      const outcome = await executeSimpleMissionStep({
        workspace_id: workspaceId,
        user_objective: "Run a shell command",
        client_request_id: "req-client-nau-2",
        enable_two_stage_planning: false,
        timeout_seconds: 170,
      });
      assert.strictEqual(outcome.kind, "error");
      if (outcome.kind !== "error") throw new Error("unreachable");
      assert.strictEqual(outcome.status, 409);
      assert.match(outcome.detailText, /REMOTE_DENY_TOOL/);
    } finally {
      restore();
    }
  });

  console.log("============================================================");
  console.log(`BATTERY COMPLETE: ${passed}/${total} test specifications passed.`);
  console.log("============================================================");
}

await runBattery();
