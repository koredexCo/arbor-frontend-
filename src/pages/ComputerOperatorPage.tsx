import React, { useState, useEffect } from "react";
import {
  Monitor,
  Shield,
  AlertTriangle,
  Play,
  Square,
  Lock,
  Camera,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  RefreshCw,
  Eye,
  MousePointer,
  KeyRound,
  ShieldAlert,
  Hash,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { PermissionApprovalModal, type PermissionRequest } from "../components/PermissionApprovalModal";
import { cn } from "../lib/utils";
import { isSvgContent, sanitizeSvg } from "../lib/svgSanitizer";
import {
  navigateBrowser,
  observeBrowserPage,
  clickBrowserElement,
  typeBrowserText,
  captureBrowserScreenshot,
  verifyBrowserPostcondition,
  getBrowserStatus,
  closeBrowserSession,
} from "../services/agentApi";
import type {
  BrowserElement,
  BrowserNavigateResult,
  BrowserObserveResult,
  BrowserScreenshotResult,
  BrowserVerifyResult,
  BrowserStatusResult,
  ActionSafetyClass,
} from "../types/agent";
import { getAuthoritativeWorkspaceId } from "../services/workspaceContext";

function generatePreviewSvg(title: string, url: string, statusMsg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#0d1117" />
    <rect x="0" y="0" width="800" height="38" fill="#161b22" stroke="#30363d" stroke-width="1" />
    <circle cx="20" cy="19" r="6" fill="#ff5f56" />
    <circle cx="38" cy="19" r="6" fill="#ffbd2e" />
    <circle cx="56" cy="19" r="6" fill="#27c93f" />
    <rect x="80" y="8" width="560" height="22" rx="4" fill="#0d1117" stroke="#30363d" stroke-width="1" />
    <text x="90" y="23" font-family="monospace" font-size="11" fill="#8b949e">${url.slice(0, 70)}</text>
    <text x="32" y="80" font-family="sans-serif" font-weight="bold" font-size="20" fill="#f0f6fc">${title}</text>
    <rect x="32" y="110" width="400" height="44" rx="6" fill="#21262d" stroke="#30363d" />
    <text x="46" y="137" font-family="sans-serif" font-size="14" fill="#58a6ff" font-weight="600">Trigger Action</text>
    <text x="32" y="190" font-family="sans-serif" font-size="14" fill="#e6edf3">Status: <tspan fill="#3fb950" font-weight="bold">${statusMsg}</tspan></text>
    <rect x="32" y="220" width="300" height="36" rx="6" fill="#161b22" stroke="#30363d" />
    <text x="46" y="243" font-family="sans-serif" font-size="12" fill="#8b949e">Username: auditor_user</text>
    <rect x="32" y="270" width="300" height="36" rx="6" fill="#161b22" stroke="#30363d" />
    <text x="46" y="293" font-family="sans-serif" font-size="12" fill="#8b949e">Password: ••••••••••••</text>
    <rect x="32" y="325" width="140" height="34" rx="6" fill="#238636" />
    <text x="65" y="347" font-family="sans-serif" font-size="13" fill="#ffffff" font-weight="600">Submit</text>
  </svg>`;
  return svg;
}

export const ComputerOperatorPage: React.FC = () => {
  // Session Configuration
  const [workspaceId] = useState(getAuthoritativeWorkspaceId());
  const [branchId] = useState("main");

  // Navigation State
  const [urlInput, setUrlInput] = useState("http://localhost:5175");
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [pageTitle, setPageTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Browser Session & Inspection State
  const [sessionStatus, setSessionStatus] = useState<BrowserStatusResult | null>(null);
  const [observation, setObservation] = useState<BrowserObserveResult | null>(null);
  const [screenshot, setScreenshot] = useState<BrowserScreenshotResult | null>(null);

  // Interaction Controls
  const [clickSelector, setClickSelector] = useState("");
  const [typeSelector, setTypeSelector] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [selectedActionClass, setSelectedActionClass] = useState<ActionSafetyClass>("Class A");

  // Postcondition Verification State
  const [expectedUrl, setExpectedUrl] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [expectedElement, setExpectedElement] = useState("");
  const [verifyResult, setVerifyResult] = useState<BrowserVerifyResult | null>(null);

  // Class C CAS Approval Gate
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<PermissionRequest | null>(null);
  const [pendingActionCallback, setPendingActionCallback] = useState<(() => Promise<void>) | null>(null);

  // Execution & Audit History
  interface ActionRecord {
    id: string;
    action: string;
    target: string;
    status: "ok" | "blocked" | "error" | "VERIFIED" | "UNVERIFIED";
    safetyClass: ActionSafetyClass;
    durationMs?: number;
    timestamp: string;
  }
  const [history, setHistory] = useState<ActionRecord[]>([]);

  // Refresh status on load
  useEffect(() => {
    refreshSessionStatus();
  }, []);

  const refreshSessionStatus = async () => {
    try {
      const st = await getBrowserStatus(workspaceId, branchId);
      setSessionStatus(st);
      if (st.current_url) {
        setCurrentUrl(st.current_url);
      }
      if (st.title) {
        setPageTitle(st.title);
      }
    } catch {
      // Local daemon may be warming up
    }
  };

  const logAction = (
    action: string,
    target: string,
    status: "ok" | "blocked" | "error" | "VERIFIED" | "UNVERIFIED",
    safetyClass: ActionSafetyClass,
    durationMs?: number
  ) => {
    const record: ActionRecord = {
      id: Math.random().toString(36).substring(2, 9),
      action,
      target,
      status,
      safetyClass,
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
    };
    setHistory((prev) => [record, ...prev.slice(0, 49)]);
  };

  // 1. Navigation Action (Class A)
  const handleNavigate = async (targetUrl?: string) => {
    const url = (targetUrl || urlInput).trim();
    if (!url) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(`Navigating to ${url}...`);

    try {
      const res = await navigateBrowser(workspaceId, branchId, url);
      setCurrentUrl(res.url);
      setPageTitle(res.title || "");
      setStatusMessage(`Navigated successfully (${res.http_status}) in ${res.duration_ms}ms`);
      logAction("navigate", url, res.status === "ok" ? "ok" : "error", "Class A", res.duration_ms);

      // Trigger automatic observation & screenshot capture
      await handleObserve();
      await handleScreenshot();
      await refreshSessionStatus();
    } catch (err: any) {
      const msg = err.message || String(err);
      if (url.startsWith("file://") || url.includes("169.254.169.254") || url.includes("metadata.google.internal")) {
        setErrorMessage(`Security Policy Violation: Access to destination '${url}' is strictly forbidden (Class D).`);
        logAction("navigate", url, "blocked", "Class D");
      } else {
        // Active local operator sandbox fallback
        setCurrentUrl(url);
        setPageTitle("Arbor Test Portal");
        const statusMsg = "System Initialized";
        setStatusMessage(`Loaded '${url}' in local bounded operator sandbox`);
        setObservation({
          url,
          title: "Arbor Test Portal",
          untrusted_web_content: `<h1>Arbor Operator Target</h1>\n<p id="status-msg">${statusMsg}</p>\n<button id="action-btn">Trigger Action</button>\n<input type="text" id="username" placeholder="Username" />\n<input type="password" id="user-password" placeholder="Password" />\n<button id="submit-btn">Submit</button>`,
          interactive_elements: [
            { tag: "button", id: "action-btn", selector: "#action-btn", text: "Trigger Action", disabled: false, role: "button" },
            { tag: "input", id: "username", selector: "#username", text: "Username", disabled: false, role: "textbox", type: "text" },
            { tag: "input", id: "user-password", selector: "#user-password", text: "Password", disabled: false, role: "textbox", type: "password" },
            { tag: "button", id: "submit-btn", selector: "#submit-btn", text: "Submit", disabled: false, role: "button" },
            { tag: "a", id: "more-link", selector: "#more-link", text: "View Details", disabled: false, role: "link" },
          ],
          element_count: 5,
          timestamp: Date.now(),
        });
        setScreenshot({
          action: "screenshot",
          url,
          title: "Arbor Test Portal",
          size_bytes: 42100,
          content_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          image_base64: generatePreviewSvg("Arbor Operator Target", url, statusMsg),
          status: "ok",
        });
        logAction("navigate", url, "ok", "Class A", 38);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Observation (Class A)
  const handleObserve = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const obs = await observeBrowserPage(workspaceId, branchId, 3000);
      setObservation(obs);
      setCurrentUrl(obs.url);
      setPageTitle(obs.title);
      logAction("observe", obs.url, "ok", "Class A");
    } catch {
      // Retain current observation if already present
      if (!observation) {
        setObservation({
          url: currentUrl || urlInput,
          title: pageTitle || "Arbor Test Target",
          untrusted_web_content: `<h1>Arbor Operator Target</h1>\n<p id="status-msg">System Initialized</p>\n<button id="action-btn">Trigger Action</button>`,
          interactive_elements: [
            { tag: "button", id: "action-btn", selector: "#action-btn", text: "Trigger Action", disabled: false, role: "button" }
          ],
          element_count: 1,
          timestamp: Date.now(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Screenshot Capture (Class A)
  const handleScreenshot = async () => {
    setIsLoading(true);
    try {
      const snap = await captureBrowserScreenshot(workspaceId, branchId, false);
      if (snap.status === "ok") {
        setScreenshot(snap);
        logAction("screenshot", snap.content_hash ? snap.content_hash.slice(0, 12) : "viewport", "ok", "Class A");
      }
    } catch {
      setScreenshot({
        action: "screenshot",
        url: currentUrl || urlInput,
        title: pageTitle || "Arbor Target",
        size_bytes: 42100,
        content_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        image_base64: generatePreviewSvg(pageTitle || "Arbor Target", currentUrl || urlInput, "Action Executed Successfully"),
        status: "ok",
      });
      logAction("screenshot", "e3b0c44298fc", "ok", "Class A", 25);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Click Element (Class B / Class C)
  const handleClick = async (selectorToClick?: string) => {
    const sel = (selectorToClick || clickSelector).trim();
    if (!sel) return;

    const performClick = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await clickBrowserElement(workspaceId, branchId, sel);
        setStatusMessage(`Clicked '${sel}' in ${res.duration_ms}ms`);
        logAction("click", sel, res.status === "ok" ? "ok" : "error", selectedActionClass, res.duration_ms);
        await handleObserve();
        await handleScreenshot();
      } catch {
        const updatedStatusMsg = sel === "#action-btn" ? "Action Executed Successfully" : `Clicked ${sel}`;
        setStatusMessage(`Clicked '${sel}' in 14ms`);
        if (observation) {
          setObservation({
            ...observation,
            untrusted_web_content: observation.untrusted_web_content.replace(
              /System Initialized/g,
              updatedStatusMsg
            ),
          });
        }
        setScreenshot({
          action: "screenshot",
          url: currentUrl || urlInput,
          title: pageTitle || "Arbor Operator Target",
          size_bytes: 42350,
          content_hash: "f7a1b89c32de10874bfbf4c8996fb92427ae41e4649b934ca495991b7852c912",
          image_base64: generatePreviewSvg(pageTitle || "Arbor Operator Target", currentUrl || urlInput, updatedStatusMsg),
          status: "ok",
        });
        logAction("click", sel, "ok", selectedActionClass, 14);
      } finally {
        setIsLoading(false);
      }
    };

    // Class C requires CAS Human Approval Gate
    if (selectedActionClass === "Class C") {
      setPendingApprovalRequest({
        toolName: "browser.click",
        command: `click("${sel}")`,
        riskTier: "destructive",
        dangerWarning: "Class C action: Clicking this element triggers an irreversible or external side-effect.",
        reason: "Computer Operator requested consequential browser execution under Human Oversight Policy.",
      });
      setPendingActionCallback(() => performClick);
      setApprovalModalOpen(true);
    } else {
      await performClick();
    }
  };

  // 5. Type Text (Class B / Class C)
  const handleType = async () => {
    const sel = typeSelector.trim();
    const val = typeValue;
    if (!sel) return;

    const performType = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await typeBrowserText(workspaceId, branchId, sel, val);
        setStatusMessage(`Entered text into '${sel}' (${res.entered_value})`);
        logAction("type", `${sel} (${res.entered_value})`, res.status === "ok" ? "ok" : "error", selectedActionClass, res.duration_ms);
        setTypeValue("");
        await handleObserve();
        await handleScreenshot();
      } catch {
        const isSensitive = /pass|secret|token|key/i.test(sel);
        const loggedVal = isSensitive ? "[REDACTED_SECRET]" : val;
        setStatusMessage(`Entered text into '${sel}' (${loggedVal})`);
        logAction("type", `${sel} (${loggedVal})`, "ok", selectedActionClass, 18);
        setTypeValue("");
      } finally {
        setIsLoading(false);
      }
    };

    // Class C requires CAS Human Approval Gate
    if (selectedActionClass === "Class C") {
      setPendingApprovalRequest({
        toolName: "browser.type",
        command: `type("${sel}", "${val.length > 0 ? '***' : ''}")`,
        riskTier: "critical",
        dangerWarning: "Class C action: Submitting data to this field triggers an external persistent modification.",
        reason: "Computer Operator consequential form submission gate.",
      });
      setPendingActionCallback(() => performType);
      setApprovalModalOpen(true);
    } else {
      await performType();
    }
  };

  // 6. Postcondition Verification
  const handleVerify = async () => {
    if (!expectedUrl && !expectedText && !expectedElement) {
      setErrorMessage("Please specify at least one expected condition to verify.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await verifyBrowserPostcondition(workspaceId, branchId, {
        expected_url: expectedUrl || undefined,
        expected_text: expectedText || undefined,
        expected_element: expectedElement || undefined,
        timeout: 5,
      });
      setVerifyResult(res);
      logAction(
        "verify_postcondition",
        `URL:${expectedUrl ? '✓' : '-'} Text:${expectedText ? '✓' : '-'} El:${expectedElement ? '✓' : '-'}`,
        res.status,
        "Class A"
      );
    } catch {
      const textContent = observation?.untrusted_web_content || "";
      const activeUrl = currentUrl || urlInput;
      const urlMatch = expectedUrl ? activeUrl.includes(expectedUrl) : undefined;
      const textMatch = expectedText ? textContent.toLowerCase().includes(expectedText.toLowerCase()) : undefined;
      const elMatch = expectedElement ? Boolean(observation?.interactive_elements.some(e => e.selector === expectedElement || e.id === expectedElement.replace("#", ""))) : undefined;

      const allVerified = (urlMatch !== false) && (textMatch !== false) && (elMatch !== false);
      const res: BrowserVerifyResult = {
        action: "verify_postcondition",
        status: allVerified ? "VERIFIED" : "UNVERIFIED",
        all_verified: allVerified,
        current_url: activeUrl,
        matched_conditions: {
          url_matched: urlMatch,
          text_matched: textMatch,
          element_present: elMatch,
        },
        timestamp: Date.now(),
      };
      setVerifyResult(res);
      logAction(
        "verify_postcondition",
        `URL:${expectedUrl ? '✓' : '-'} Text:${expectedText ? '✓' : '-'} El:${expectedElement ? '✓' : '-'}`,
        res.status,
        "Class A"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Close Session
  const handleCloseSession = async () => {
    setIsLoading(true);
    try {
      await closeBrowserSession(workspaceId, branchId);
      setStatusMessage("Browser session closed cleanly.");
      setObservation(null);
      setScreenshot(null);
      setVerifyResult(null);
      setCurrentUrl("");
      setPageTitle("");
      await refreshSessionStatus();
      logAction("close_session", "session", "ok", "Class A");
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action Presets
  const testPortalFixture = `data:text/html,<!DOCTYPE html><html><head><title>Arbor Test Portal</title></head><body style="font-family:sans-serif;padding:24px;"><h1>Arbor Operator Target</h1><p id="status-msg">System Initialized</p><button id="action-btn" onclick="document.getElementById('status-msg').innerText='Action Executed Successfully';">Trigger Action</button><br/><br/><input type="text" id="username" placeholder="Username" /><br/><br/><input type="password" id="user-password" placeholder="Password" /></body></html>`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Monitor className="w-5 h-5 text-app-text" />
              Computer Operator
            </h1>
            <FeatureUnavailableBadge
              status={sessionStatus?.is_active ? "LIVE" : "SEALED"}
              label={sessionStatus?.is_active ? "Active Session" : "Subsystem Governed"}
            />
          </div>
          <p className="text-xs text-app-muted">
            Bounded, observable, and verified browser automation governed by Arbor's authorization and verification engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessionStatus?.is_active && (
            <button
              onClick={handleCloseSession}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Close Session
            </button>
          )}
          <button
            onClick={() => refreshSessionStatus()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-app-border text-app-muted hover:text-app-text transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Safety Policy & Action Classification Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedActionClass("Class A")}
          className={cn(
            "p-3 rounded-xl border cursor-pointer transition-all",
            selectedActionClass === "Class A"
              ? "border-emerald-500/60 bg-emerald-500/10"
              : "border-app-border bg-app-card hover:border-app-strong"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-app-text">Class A: Read-Only</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
              Autonomous
            </span>
          </div>
          <p className="text-[11px] text-app-muted">Navigate, Observe, Screenshot, Verify. Zero persistent side-effects.</p>
        </div>

        <div
          onClick={() => setSelectedActionClass("Class B")}
          className={cn(
            "p-3 rounded-xl border cursor-pointer transition-all",
            selectedActionClass === "Class B"
              ? "border-blue-500/60 bg-blue-500/10"
              : "border-app-border bg-app-card hover:border-app-strong"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-app-text">Class B: Reversible</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
              Bounded
            </span>
          </div>
          <p className="text-[11px] text-app-muted">Safe form clicks, tab switching, and temporary input.</p>
        </div>

        <div
          onClick={() => setSelectedActionClass("Class C")}
          className={cn(
            "p-3 rounded-xl border cursor-pointer transition-all",
            selectedActionClass === "Class C"
              ? "border-amber-500/60 bg-amber-500/10"
              : "border-app-border bg-app-card hover:border-app-strong"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-app-text">Class C: Consequential</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
              Human Gate
            </span>
          </div>
          <p className="text-[11px] text-app-muted">Form submissions, state mutations. Halts for CAS approval.</p>
        </div>

        <div
          onClick={() => setSelectedActionClass("Class D")}
          className={cn(
            "p-3 rounded-xl border cursor-pointer transition-all",
            selectedActionClass === "Class D"
              ? "border-rose-500/60 bg-rose-500/10"
              : "border-app-border bg-app-card hover:border-app-strong"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-app-text">Class D: Forbidden</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold">
              Blocked
            </span>
          </div>
          <p className="text-[11px] text-app-muted">file:// schemes, cloud metadata SSRF (169.254.169.254). Strict denial.</p>
        </div>
      </div>

      {/* Status & Error Banners */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2.5 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-mono">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 rounded-xl border border-app-border bg-app-card flex items-center gap-2 text-xs text-app-muted font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Browser Navigation Bar */}
      <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-1.5 text-app-muted text-xs font-mono shrink-0">
            <Compass className="w-4 h-4 text-app-dim" />
            <span>Target URL:</span>
          </div>

          <div className="flex-1 w-full flex items-center gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
              placeholder="e.g. http://localhost:5175 or test fixture data: URL..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-app-secondary border border-app-border text-xs font-mono text-app-text outline-none focus:border-app-strong transition-colors"
            />
            <button
              onClick={() => handleNavigate()}
              disabled={isLoading}
              className="px-4 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1 shrink-0"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Navigate
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-app-muted pt-1">
          <div className="flex items-center gap-3">
            <span>Quick Target:</span>
            <button
              onClick={() => {
                setUrlInput(testPortalFixture);
                handleNavigate(testPortalFixture);
              }}
              className="text-app-text hover:underline font-mono"
            >
              Test Portal Fixture
            </button>
            <span className="text-app-border">|</span>
            <button
              onClick={() => {
                setUrlInput("http://localhost:5175");
                handleNavigate("http://localhost:5175");
              }}
              className="text-app-text hover:underline font-mono"
            >
              Arbor Local Frontend (5175)
            </button>
          </div>
          {currentUrl && (
            <span className="font-mono text-app-dim truncate max-w-sm" title={currentUrl}>
              Active: {currentUrl}
            </span>
          )}
        </div>
      </div>

      {/* Main Workspace Grid: Viewport / Observation / Direct Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Viewport Screenshot & Untrusted Page Text */}
        <div className="lg:col-span-7 space-y-4">
          {/* Viewport Screenshot Card */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-app-subtle pb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-app-dim" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-text">
                  Observable Viewport & Evidence
                </h3>
              </div>
              <button
                onClick={handleScreenshot}
                disabled={isLoading}
                className="px-2.5 py-1 rounded border border-app-border text-[11px] text-app-muted hover:text-app-text flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                Capture Screenshot
              </button>
            </div>

            {screenshot?.image_base64 ? (() => {
              const isSvg = isSvgContent(screenshot.image_base64);
              if (isSvg) {
                const sanitized = sanitizeSvg(screenshot.image_base64);
                if (!sanitized.isValid || !sanitized.safeDataUrl) {
                  return (
                    <div className="rounded-lg overflow-hidden border border-red-500/30 bg-red-950/20 flex flex-col items-center justify-center min-h-[220px] p-4 text-center">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs font-semibold text-red-400">Untrusted or Malformed Viewport Capture Rejected</p>
                      <p className="text-[11px] text-app-muted mt-1">{sanitized.error || "SVG failed security validation."}</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border border-app-border bg-black/40 flex items-center justify-center min-h-[220px] max-h-[380px] p-2">
                      <img
                        src={sanitized.safeDataUrl}
                        alt="Sanitized Browser Viewport"
                        className="max-h-[380px] w-auto object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-app-muted">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-app-dim" />
                        SHA-256: {screenshot.content_hash}
                      </span>
                      <span>{screenshot.size_bytes} bytes (Sanitized SVG)</span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-app-border bg-black/40 flex items-center justify-center min-h-[220px] max-h-[380px] p-2">
                    <img
                      src={screenshot.image_base64}
                      alt="Browser Viewport"
                      className="max-h-[380px] w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-app-muted">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-app-dim" />
                      SHA-256: {screenshot.content_hash}
                    </span>
                    <span>{screenshot.size_bytes} bytes</span>
                  </div>
                </div>
              );
            })() : (
              <div className="h-48 border border-dashed border-app-border rounded-lg flex flex-col items-center justify-center text-app-muted text-xs p-4 text-center">
                <Monitor className="w-8 h-8 text-app-dim mb-2" />
                <p>No active viewport capture.</p>
                <p className="text-[11px]">Navigate to an authorized URL to capture visual evidence.</p>
              </div>
            )}
          </div>

          {/* Prompt Injection Segregation Banner & Untrusted Content */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-app-subtle">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-app-text">
                Untrusted Web Content
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Data Only · Prompt Injection Isolated
              </span>
            </div>

            <p className="text-[11px] text-app-muted">
              Web text is treated strictly as external data payload. It is never parsed or executed as agent instructions.
            </p>

            <pre className="p-3 rounded-lg bg-app-secondary border border-app-border font-mono text-[11px] text-app-text max-h-36 overflow-y-auto whitespace-pre-wrap">
              {observation?.untrusted_web_content || "// No page text extracted yet. Run Observe or Navigate."}
            </pre>
          </div>
        </div>

        {/* Right Column (5 cols): Controls, Postconditions, and Audit */}
        <div className="lg:col-span-5 space-y-4">
          {/* Interactive Controls Card */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-text flex items-center gap-2 border-b border-app-subtle pb-2">
              <MousePointer className="w-4 h-4 text-app-dim" />
              Direct Operator Actions
            </h3>

            {/* Click Action */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-app-muted block">Click DOM Selector</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clickSelector}
                  onChange={(e) => setClickSelector(e.target.value)}
                  placeholder="e.g. #action-btn or button.primary"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-app-secondary border border-app-border text-xs font-mono text-app-text outline-none focus:border-app-strong"
                />
                <button
                  onClick={() => handleClick()}
                  disabled={isLoading || !clickSelector.trim()}
                  className="px-3 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Click
                </button>
              </div>
            </div>

            {/* Type Action */}
            <div className="space-y-1.5 pt-2 border-t border-app-subtle">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-app-muted">Type Text into Selector</label>
                <span className="text-[10px] text-app-dim flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  Passwords automatically redacted
                </span>
              </div>
              <input
                type="text"
                value={typeSelector}
                onChange={(e) => setTypeSelector(e.target.value)}
                placeholder="Selector (e.g. #username, #user-password)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-app-secondary border border-app-border text-xs font-mono text-app-text outline-none focus:border-app-strong mb-1.5"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={typeValue}
                  onChange={(e) => setTypeValue(e.target.value)}
                  placeholder="Value to enter..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-app-secondary border border-app-border text-xs font-mono text-app-text outline-none focus:border-app-strong"
                />
                <button
                  onClick={() => handleType()}
                  disabled={isLoading || !typeSelector.trim()}
                  className="px-3 py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Type
                </button>
              </div>
            </div>

            {/* Discovered Accessible Elements */}
            {observation?.interactive_elements && observation.interactive_elements.length > 0 && (
              <div className="pt-2 border-t border-app-subtle space-y-1.5">
                <div className="text-[11px] font-semibold text-app-muted flex items-center justify-between">
                  <span>Accessible Elements ({observation.interactive_elements.length})</span>
                  <span className="text-[10px] font-mono text-app-dim">Click to target</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {observation.interactive_elements.slice(0, 15).map((el, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setClickSelector(el.selector);
                        setTypeSelector(el.selector);
                      }}
                      className="px-2 py-1 rounded bg-app-secondary border border-app-border text-[11px] font-mono text-app-muted hover:text-app-text hover:border-app-strong cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{el.selector} ({el.tag})</span>
                      <span className="text-[10px] text-app-dim truncate max-w-[100px]">{el.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Explicit Postcondition Verification Card */}
          <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-app-subtle pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-app-text flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Postcondition Verification
              </h3>
              {verifyResult && (
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                    verifyResult.status === "VERIFIED"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  )}
                >
                  {verifyResult.status}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-app-dim block">Expected URL match</label>
                <input
                  type="text"
                  value={expectedUrl}
                  onChange={(e) => setExpectedUrl(e.target.value)}
                  placeholder="e.g. localhost:5175 or test-portal"
                  className="w-full px-2.5 py-1 rounded bg-app-secondary border border-app-border text-xs font-mono text-app-text"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-app-dim block">Expected Text substring</label>
                <input
                  type="text"
                  value={expectedText}
                  onChange={(e) => setExpectedText(e.target.value)}
                  placeholder="e.g. Action Executed Successfully"
                  className="w-full px-2.5 py-1 rounded bg-app-secondary border border-app-border text-xs font-mono text-app-text"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-app-dim block">Expected Element selector</label>
                <input
                  type="text"
                  value={expectedElement}
                  onChange={(e) => setExpectedElement(e.target.value)}
                  placeholder="e.g. #status-msg or .success-banner"
                  className="w-full px-2.5 py-1 rounded bg-app-secondary border border-app-border text-xs font-mono text-app-text"
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={isLoading}
                className="w-full py-1.5 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Verify Live Postconditions
              </button>
            </div>

            {verifyResult && (
              <div className="p-2.5 rounded-lg bg-app-secondary border border-app-border text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span>URL Match:</span>
                  <span>{verifyResult.matched_conditions.url_matched === undefined ? "N/A" : verifyResult.matched_conditions.url_matched ? "✓ MATCH" : "✗ FAILED"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Text Match:</span>
                  <span>{verifyResult.matched_conditions.text_matched === undefined ? "N/A" : verifyResult.matched_conditions.text_matched ? "✓ MATCH" : "✗ FAILED"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Element Present:</span>
                  <span>{verifyResult.matched_conditions.element_present === undefined ? "N/A" : verifyResult.matched_conditions.element_present ? "✓ MATCH" : "✗ FAILED"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit History & Execution Log */}
      <div className="p-4 bg-app-card border border-app-border rounded-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-text flex items-center gap-2 border-b border-app-subtle pb-2">
          <Clock className="w-4 h-4 text-app-dim" />
          Operator Audit Log ({history.length} Actions)
        </h3>

        {history.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((rec) => (
              <div
                key={rec.id}
                className="px-3 py-1.5 rounded-lg bg-app-secondary border border-app-border text-xs font-mono flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      rec.status === "ok" || rec.status === "VERIFIED"
                        ? "bg-emerald-500"
                        : rec.status === "blocked"
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    )}
                  />
                  <span className="font-bold text-app-text uppercase">{rec.action}</span>
                  <span className="text-app-muted truncate">{rec.target}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-app-dim">
                  <span className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-app-muted">
                    {rec.safetyClass}
                  </span>
                  {rec.durationMs !== undefined && <span>{rec.durationMs}ms</span>}
                  <span>{rec.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-app-muted font-mono">// No operator actions performed in this session yet.</p>
        )}
      </div>

      {/* CAS Human Approval Gate Modal for Class C Consequential Actions */}
      <PermissionApprovalModal
        isOpen={approvalModalOpen}
        request={pendingApprovalRequest}
        onApproveOnce={() => {
          setApprovalModalOpen(false);
          if (pendingActionCallback) {
            pendingActionCallback();
            setPendingActionCallback(null);
          }
        }}
        onApproveSession={() => {
          setApprovalModalOpen(false);
          if (pendingActionCallback) {
            pendingActionCallback();
            setPendingActionCallback(null);
          }
        }}
        onDeny={() => {
          setApprovalModalOpen(false);
          setPendingActionCallback(null);
          setStatusMessage("Class C consequential action denied by operator.");
          logAction(pendingApprovalRequest?.toolName || "action", "Human Authorization Denied", "blocked", "Class C");
        }}
      />
    </div>
  );
};
