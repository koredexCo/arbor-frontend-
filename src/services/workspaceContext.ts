/**
 * Arbor Workspace Context & Authorization Manager
 * Enforces multi-tenant workspace isolation and dynamic workspace resolution.
 */

const STORAGE_KEY = "arbor-authoritative-workspace-id";
const LEGACY_KEY = "arbor-current-workspace";
const CHANGE_EVENT = "arbor-workspace-changed";

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  is_jailed?: boolean;
}

/**
 * Returns the currently active authoritative workspace ID.
 * Returns empty string if no valid authoritative workspace has been selected.
 * Does not fall back to unverified static defaults.
 */
const isDevAuthBypass =
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env?.DEV) &&
  import.meta.env?.VITE_DEV_AUTH_BYPASS === "true";

export function getAuthoritativeWorkspaceId(): string {
  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (stored && stored.trim().length > 0 && stored.trim() !== "ws-primary-sandbox") {
    return stored.trim();
  }

  if (isDevAuthBypass) {
    return "01552e15-7d53-4ddc-9752-3389d0458632";
  }

  return "";
}

/**
 * Sets the active workspace ID and dispatches an event for cross-component synchronization.
 */
export function setAuthoritativeWorkspaceId(workspaceId: string): void {
  if (typeof window === "undefined") return;
  const cleanId = workspaceId.trim();
  localStorage.setItem(STORAGE_KEY, cleanId);
  localStorage.setItem(LEGACY_KEY, cleanId);

  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: { workspaceId: cleanId },
    })
  );
}

/**
 * Clears the active workspace ID.
 */
export function clearAuthoritativeWorkspaceId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);

  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: { workspaceId: "" },
    })
  );
}

/**
 * Subscribes to workspace changes across tabs and components.
 */
export function subscribeToWorkspaceChanges(callback: (workspaceId: string) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ workspaceId: string }>;
    if (customEvent.detail?.workspaceId !== undefined) {
      callback(customEvent.detail.workspaceId);
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      callback(e.newValue);
    }
  };

  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

/**
 * Validates whether an operation target workspace matches the current authoritative workspace.
 * Rejects cross-workspace access attempts fail-closed when an authoritative workspace is established.
 */
export function assertWorkspaceMatch(targetWorkspaceId: string): void {
  const current = getAuthoritativeWorkspaceId();
  if (current && targetWorkspaceId !== current) {
    throw new Error(
      `[SECURITY_VIOLATION_403] Cross-workspace access attempt blocked. Target workspace '${targetWorkspaceId}' does not match active authorized workspace '${current}'.`
    );
  }
}
