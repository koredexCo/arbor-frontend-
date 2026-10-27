import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  FlaskConical,
  Target,
  FolderTree,
  Monitor,
  Brain,
  Database,
  Wrench,
  Boxes,
  Server,
  Shield,
  Activity,
  Settings,
  Search,
  Command,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { getAuthoritativeWorkspaceId, subscribeToWorkspaceChanges } from "../services/workspaceContext";
import { CommandPalette } from "./common/CommandPalette";
import { OfflineBanner } from "./common/OfflineBanner";
import { cn } from "../lib/utils";

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  level?: string;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    return getAuthoritativeWorkspaceId() || "default-workspace";
  });

  useEffect(() => {
    const unsub = subscribeToWorkspaceChanges((newWs) => {
      if (newWs) setCurrentWorkspace(newWs);
    });
    return () => unsub();
  }, []);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [systemHealth, setSystemHealth] = useState<"HEALTHY" | "DEGRADED" | "CHECKING">("HEALTHY");

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 13 Primary Navigation Sections from Specification
  const navigationItems: NavItem[] = [
    { id: "home", name: "Home", path: "/home", icon: MessageSquare },
    { id: "research", name: "Research", path: "/research", icon: FlaskConical },
    { id: "missions", name: "Missions", path: "/missions", icon: Target, badge: "L3" },
    { id: "workspaces", name: "Workspaces", path: "/workspaces", icon: FolderTree },
    { id: "computer", name: "Computer Operator", path: "/computer", icon: Monitor },
    { id: "intelligence", name: "Intelligence", path: "/intelligence", icon: Brain },
    { id: "memory", name: "Memory", path: "/memory", icon: Database },
    { id: "tools", name: "MCP & Tools", path: "/tools", icon: Wrench, badge: "MCP" },
    { id: "engineering", name: "Engineering", path: "/engineering", icon: Boxes },
    { id: "devices", name: "Devices & Nodes", path: "/devices", icon: Server },
    { id: "governance", name: "Governance", path: "/governance", icon: Shield, badge: "CAS" },
    { id: "health", name: "System Health", path: "/health", icon: Activity },
    { id: "settings", name: "Settings", path: "/settings", icon: Settings },
  ];

  const isCurrentRoute = (path: string) => {
    if (path === "/home" && (location.pathname === "/home" || location.pathname === "/")) {
      return true;
    }
    if (path === "/workspaces" && (location.pathname.startsWith("/workspace") || location.pathname === "/workspaces")) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  // Breadcrumbs generation
  const getBreadcrumbs = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return ["Arbor", "Home"];
    return ["Arbor", ...segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1))];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg text-app-text select-none">
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 1. PERSISTENT MONOCHROME SIDEBAR                                          */}
      {/* ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-app-border bg-app-secondary transition-all duration-200 z-30 shrink-0",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-app-border">
          <Link to="/home" className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-app-text text-app-inverted flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
              <GitBranch className="w-4 h-4 stroke-[2.2]" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm tracking-tight text-app-text truncate">
                  Arbor
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border border-app-border text-app-muted">
                  v2.2
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded text-app-muted hover:text-app-text hover:bg-app-hover transition-colors"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                sidebarCollapsed ? "" : "rotate-180"
              )}
            />
          </button>
        </div>

        {/* 13 Primary Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentRoute(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors relative group",
                  active
                    ? "bg-app-hover text-app-text font-semibold border border-app-border"
                    : "text-app-dim hover:bg-app-hover hover:text-app-text border border-transparent"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-app-text" : "text-app-muted group-hover:text-app-text"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1 py-0.2 rounded border",
                      active
                        ? "bg-app-text text-app-inverted border-app-text"
                        : "text-app-muted border-app-border"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-app-border bg-app-tertiary/50 text-[11px] text-app-muted">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate font-mono text-[11px]">{currentWorkspace}</span>
              </div>
              <span className="text-[10px] font-mono border border-app-border px-1 rounded">
                SECURE
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Workspace Connected" />
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION CONTENT AREA                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Offline notification banner */}
        <OfflineBanner isOffline={isOffline} />

        {/* ======================================================================= */}
        {/* TOP BAR                                                                 */}
        {/* ======================================================================= */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-app-border bg-app-secondary shrink-0 z-20 gap-3">
          {/* Left: Mobile Toggle & Breadcrumbs / Workspace Selector */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-app-muted hover:text-app-text hover:bg-app-hover"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Workspace Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono bg-app-card border border-app-border hover:bg-app-hover text-app-text transition-colors"
              >
                <FolderTree className="w-3.5 h-3.5 text-app-muted" />
                <span className="truncate max-w-[130px] font-semibold">{currentWorkspace}</span>
                <ChevronDown className="w-3 h-3 text-app-muted" />
              </button>

              {workspaceMenuOpen && (
                <div
                  className="absolute left-0 mt-1 w-56 bg-app-card border border-app-border rounded-lg shadow-xl py-1 z-50 text-xs animate-scale-in"
                  onClick={() => setWorkspaceMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-app-muted border-b border-app-border">
                    Available Workspaces
                  </div>
                  <button
                    onClick={() => setCurrentWorkspace("default-workspace")}
                    className="w-full px-3 py-2 text-left hover:bg-app-hover flex items-center justify-between"
                  >
                    <span>default-workspace</span>
                    {currentWorkspace === "default-workspace" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setCurrentWorkspace("personal-vault")}
                    className="w-full px-3 py-2 text-left hover:bg-app-hover flex items-center justify-between"
                  >
                    <span>personal-vault</span>
                    {currentWorkspace === "personal-vault" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </button>
                  <div className="border-t border-app-border mt-1 pt-1">
                    <button
                      onClick={() => navigate("/workspaces")}
                      className="w-full px-3 py-1.5 text-left text-app-dim hover:bg-app-hover flex items-center gap-1.5"
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                      Manage Workspaces...
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Breadcrumb Trail */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-app-muted font-mono truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="opacity-40">/</span>}
                  <span className={cn(idx === breadcrumbs.length - 1 && "text-app-text font-medium")}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Center: Command Palette Trigger Button */}
          <div className="flex-1 max-w-md hidden sm:block">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full h-8 px-3 rounded-lg bg-app-card border border-app-border hover:border-app-strong text-xs text-app-muted flex items-center justify-between transition-colors shadow-none"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5" />
                <span className="truncate">Search commands, missions, tools...</span>
              </div>
              <div className="flex items-center gap-0.5 text-[10px] font-mono border border-app-border px-1.5 py-0.2 rounded bg-app-secondary">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </button>
          </div>

          {/* Right: Telemetry, Notifications, Day/Night Toggle & Profile */}
          <div className="flex items-center gap-2">
            {/* System Health Pill */}
            <Link
              to="/health"
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono border border-app-border hover:bg-app-hover transition-colors"
              title="System Operational Status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-app-dim">HEALTHY</span>
            </Link>

            {/* Notifications Button */}
            <button
              onClick={() => navigate("/notifications")}
              className="p-2 rounded-lg text-app-dim hover:text-app-text hover:bg-app-hover border border-transparent hover:border-app-border transition-colors relative"
              title="Notifications & Approvals"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-app-text rounded-full" />
            </button>

            {/* DAY/NIGHT MONOCHROME THEME TOGGLE SWITCH */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-app-dim hover:text-app-text hover:bg-app-hover border border-app-border transition-colors"
              title={`Switch to ${theme === "dark" ? "Bright / Day" : "Monochrome Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-app-text transition-transform duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-app-text transition-transform duration-200" />
              )}
            </button>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-lg bg-app-card border border-app-border hover:bg-app-hover flex items-center justify-center font-bold text-xs text-app-text transition-colors"
                title={user?.email || "User Account"}
              >
                {user?.email ? user.email.charAt(0).toUpperCase() : "A"}
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-1 w-52 bg-app-card border border-app-border rounded-lg shadow-xl py-1 z-50 text-xs animate-scale-in"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-app-border">
                    <p className="font-semibold text-app-text truncate">{user?.email || "operator@arbor.local"}</p>
                    <p className="text-[10px] text-app-muted font-mono">Role: Operator</p>
                  </div>
                  <button
                    onClick={() => navigate("/settings")}
                    className="w-full px-3 py-2 text-left text-app-dim hover:bg-app-hover flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => navigate("/governance")}
                    className="w-full px-3 py-2 text-left text-app-dim hover:bg-app-hover flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Governance & Approvals
                  </button>
                  <div className="border-t border-app-border mt-1 pt-1">
                    <button
                      onClick={signOut}
                      className="w-full px-3 py-2 text-left text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-app-border bg-app-secondary p-3 space-y-1 animate-slide-up z-30">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isCurrentRoute(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    active
                      ? "bg-app-hover text-app-text font-semibold border border-app-border"
                      : "text-app-dim hover:bg-app-hover hover:text-app-text"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded border border-app-border text-app-muted">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ======================================================================= */}
        {/* MAIN BODY VIEWPORT                                                      */}
        {/* ======================================================================= */}
        <main className="flex-1 overflow-auto bg-app-bg text-app-text relative">
          {children}
        </main>
      </div>
    </div>
  );
};
