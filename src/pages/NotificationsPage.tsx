import React, { useState } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { EmptyState } from "../components/common/EmptyState";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  source: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "CRITICAL">("ALL");

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "ntf-1",
      title: "CAS Token Approval Required",
      message: "Orchestrator requested execution of high-risk shell command: clang++ -O3 -shared -fPIC server.cpp",
      severity: "CRITICAL",
      source: "Governance CAS Engine",
      timestamp: "5 mins ago",
      read: false,
      actionUrl: "/governance",
    },
    {
      id: "ntf-2",
      title: "Mission 84920 Completed",
      message: "Diagnose API Performance & C++ Transpilation completed successfully. Benchmark shows 12.4x speedup.",
      severity: "INFO",
      source: "Level 3 Orchestrator",
      timestamp: "20 mins ago",
      read: false,
      actionUrl: "/missions",
    },
    {
      id: "ntf-3",
      title: "Remote Node Disconnected",
      message: "Node 'Docker Jail (192.168.1.45)' missed 3 consecutive heartbeat leases.",
      severity: "WARNING",
      source: "Node Daemon Monitor",
      timestamp: "2 hours ago",
      read: true,
      actionUrl: "/devices",
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read;
    if (filter === "CRITICAL") return n.severity === "CRITICAL";
    return true;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-app-text" />
              Notifications & Security Events
            </h1>
            <span className="text-[10px] font-mono border border-app-border px-1.5 py-0.5 rounded text-app-muted">
              {notifications.filter((n) => !n.read).length} Unread
            </span>
          </div>
          <p className="text-xs text-app-muted">
            Cryptographic approval requests, node failure notifications, and mission completion events.
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border text-xs font-medium text-app-dim hover:text-app-text hover:bg-app-hover transition-colors self-start sm:self-auto"
        >
          <Check className="w-3.5 h-3.5" />
          Mark All Read
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 text-xs">
        {(["ALL", "UNREAD", "CRITICAL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-md transition-colors font-medium border",
              filter === f
                ? "bg-app-accent text-app-inverted border-app-accent font-semibold"
                : "border-app-border text-app-muted hover:text-app-text"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You are caught up on all system and mission alerts."
          />
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => n.actionUrl && navigate(n.actionUrl)}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer space-y-2",
                n.read
                  ? "bg-app-card border-app-border text-app-muted"
                  : "bg-app-card border-app-strong text-app-text shadow-sm"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      n.severity === "CRITICAL"
                        ? "bg-red-500"
                        : n.severity === "WARNING"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    )}
                  />
                  <span className="text-xs font-semibold text-app-text">{n.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-app-muted">
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>{n.timestamp}</span>
                </div>
              </div>

              <p className="text-xs text-app-dim leading-relaxed">{n.message}</p>

              {n.actionUrl && (
                <div className="pt-1 flex items-center gap-1 text-[11px] font-medium text-app-text">
                  <span>Review in {n.actionUrl.replace("/", "")}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
