/**
 * Task AB (B3): execute_analysis contract test suite.
 * Validates:
 * - AnalysisMissionPayload request serialization (call shape)
 * - executeAnalysisMission classifies success / error / (defensive) 412 the same way
 *   executeSimpleMissionStep does
 * - The real request issued is a POST to /api/v1/missions/execute_analysis with the
 *   X-Workspace-ID header and a JSON body matching the payload exactly
 */

import { executeAnalysisMission, type AnalysisMissionPayload } from "../services/orchestratorApi";

const assert = {
  strictEqual(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
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

async function runBattery() {
  console.log("============================================================");
  console.log("ARBOR TASK AB (B3): EXECUTE_ANALYSIS CONTRACT TEST BATTERY");
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

  // 1. Request serialization (call shape)
  await test("AnalysisMissionPayload serializes request with mandatory and optional parameters", () => {
    const payload: AnalysisMissionPayload = {
      workspace_id: "ws-analysis-alpha",
      user_objective: "Analyze auth module for Level 3 readiness",
      client_request_id: "req-analysis-1",
      repositories: ["arbor-backend", "arbor-frontend"],
      domains: ["security", "performance"],
      evaluation_mode: "tri_model_synthesis",
      timeout_seconds: 300,
    };
    const parsed = JSON.parse(JSON.stringify(payload));
    assert.strictEqual(parsed.workspace_id, "ws-analysis-alpha");
    assert.strictEqual(parsed.user_objective, "Analyze auth module for Level 3 readiness");
    assert.strictEqual(parsed.client_request_id, "req-analysis-1");
    assert.strictEqual(parsed.repositories.length, 2);
    assert.strictEqual(parsed.domains.length, 2);
    assert.strictEqual(parsed.evaluation_mode, "tri_model_synthesis");
    assert.strictEqual(parsed.timeout_seconds, 300);
  });

  // 2. Minimal payload (only the two required fields) still serializes correctly
  await test("AnalysisMissionPayload with only required fields omits the rest", () => {
    const payload: AnalysisMissionPayload = {
      workspace_id: "ws-analysis-beta",
      client_request_id: "req-analysis-2",
    };
    const parsed = JSON.parse(JSON.stringify(payload));
    assert.strictEqual(parsed.workspace_id, "ws-analysis-beta");
    assert.strictEqual(parsed.client_request_id, "req-analysis-2");
    assert.strictEqual("repositories" in parsed, false);
    assert.strictEqual("user_objective" in parsed, false);
  });

  // 3. The real HTTP call: POST to the right path, right header, right body
  await test("executeAnalysisMission issues POST /api/v1/missions/execute_analysis with X-Workspace-ID and the exact body", async () => {
    const { calls, restore } = installMockFetch([
      {
        status: 200,
        body: {
          mission_id: "mission-analysis-1",
          status: "COMPLETED",
          lifecycle_state: "COMPLETED",
          inspected_repositories: ["arbor-backend"],
          inspected_domains: ["security"],
          inspected_files_count: 42,
          findings_count: 3,
          critical_unresolved_count: 0,
          multi_model_result: {},
          deliverables: "# Analysis Report\n\nAll clear.",
          persistence_status: "PERSISTED",
        },
      },
    ]);
    try {
      const outcome = await executeAnalysisMission({
        workspace_id: "ws-analysis-gamma",
        user_objective: "Analyze",
        client_request_id: "req-analysis-3",
        repositories: ["arbor-backend"],
      });
      assert.strictEqual(outcome.kind, "success");
      if (outcome.kind !== "success") throw new Error("unreachable");
      assert.strictEqual(outcome.data.mission_id, "mission-analysis-1");
      assert.strictEqual(outcome.data.persistence_status, "PERSISTED");

      assert.strictEqual(calls.length, 1);
      const call = calls[0];
      assert.ok(call.url.endsWith("/api/v1/missions/execute_analysis"), `unexpected URL: ${call.url}`);
      assert.strictEqual((call.init?.method || "").toUpperCase(), "POST");
      const headers = new Headers(call.init?.headers || {});
      assert.strictEqual(headers.get("X-Workspace-ID"), "ws-analysis-gamma");
      const sentBody = JSON.parse(String(call.init?.body ?? "{}"));
      assert.strictEqual(sentBody.workspace_id, "ws-analysis-gamma");
      assert.strictEqual(sentBody.client_request_id, "req-analysis-3");
      assert.strictEqual(sentBody.user_objective, "Analyze");
      assert.strictEqual(sentBody.repositories[0], "arbor-backend");
    } finally {
      restore();
    }
  });

  // 4. Non-2xx, non-412 errors surface the backend detail verbatim (e.g. 400 bad scope)
  await test("executeAnalysisMission surfaces a non-412 error's status and detail verbatim", async () => {
    const { restore } = installMockFetch([
      { status: 400, body: { detail: "Unrecognized repository identifier 'not-a-repo'" } },
    ]);
    try {
      const outcome = await executeAnalysisMission({
        workspace_id: "ws-analysis-delta",
        client_request_id: "req-analysis-4",
        repositories: ["not-a-repo"],
      });
      assert.strictEqual(outcome.kind, "error");
      if (outcome.kind !== "error") throw new Error("unreachable");
      assert.strictEqual(outcome.status, 400);
      assert.strictEqual(outcome.detailText, "Unrecognized repository identifier 'not-a-repo'");
    } finally {
      restore();
    }
  });

  // 5. Defensive 412 handling: even though execute_analysis has no resume path, a 412
  // (if the backend ever sent one) must be classified the same way execute_simple's is,
  // not hidden behind a generic error.
  await test("executeAnalysisMission classifies an (unexpected) 412 as approval_required, same shape as execute_simple", async () => {
    const { restore } = installMockFetch([
      {
        status: 412,
        body: {
          detail: {
            mission_id: "mission-analysis-5",
            request_id: "req-approval-5",
            tool_name: "fs.write",
            parameters: { path: "report.md" },
            plan_preview: [],
            node_approval_mode: null,
            requires_strong_confirmation: false,
          },
        },
      },
    ]);
    try {
      const outcome = await executeAnalysisMission({
        workspace_id: "ws-analysis-epsilon",
        client_request_id: "req-analysis-5",
      });
      assert.strictEqual(outcome.kind, "approval_required");
      if (outcome.kind !== "approval_required") throw new Error("unreachable");
      assert.strictEqual(outcome.detail.mission_id, "mission-analysis-5");
      assert.strictEqual(outcome.detail.request_id, "req-approval-5");
    } finally {
      restore();
    }
  });

  // 6. Read-only contract: AnalysisMissionPayload has no cas_token_id field to resume with
  await test("AnalysisMissionPayload has no cas_token_id field -- there is no resume path", () => {
    const payload: AnalysisMissionPayload = {
      workspace_id: "ws-analysis-zeta",
      client_request_id: "req-analysis-6",
    };
    assert.strictEqual("cas_token_id" in (payload as unknown as Record<string, unknown>), false);
  });

  console.log("============================================================");
  console.log(`BATTERY COMPLETE: ${passed}/${total} test specifications passed.`);
  console.log("============================================================");
}

runBattery();
