import { useState, useRef, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, RefreshCw, ChevronDown, Activity } from "lucide-react";
import type { SystemHealthData } from "../hooks/useSystemHealth";

interface Props {
  health: SystemHealthData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function HealthIndicator({ health, loading, error, onRefresh }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Compute status colors and labels
  let statusColor = "text-[#555555] bg-[#141414] border-[#1e1e1e]";
  let dotColor = "bg-surface-500";
  let statusText = "Initializing";
  let StatusIcon = Activity;

  // Let's check if there is any "Recovery In Progress" (subsystems having success_count_since_failure > 0 but not yet HEALTHY)
  const isRecovering = health
    ? Object.values(health.subsystems).some(
        (sub) => sub.status !== "HEALTHY" && sub.success_count_since_failure > 0
      )
    : false;

  if (error) {
    statusColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    dotColor = "bg-rose-500 animate-pulse";
    statusText = "Connection Offline";
    StatusIcon = ShieldAlert;
  } else if (health) {
    if (health.status === "HEALTHY") {
      statusColor = "text-white bg-white/10 border-[#2a2a2a]";
      dotColor = "bg-white";
      statusText = "Cognition Active";
      StatusIcon = ShieldCheck;
    } else if (isRecovering) {
      statusColor = "text-[#a0a0a0] bg-[#1a1a1a] border-[#333333]";
      dotColor = "bg-white animate-spin";
      statusText = "Auto-Healing";
      StatusIcon = RefreshCw;
    } else if (health.status === "DEGRADED") {
      statusColor = "text-amber-400 bg-amber-500/10 border-[#2a2a2a]";
      dotColor = "bg-amber-500 animate-pulse";
      statusText = "Cognition Delayed";
      StatusIcon = AlertTriangle;
    } else if (health.status === "OFFLINE") {
      statusColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
      dotColor = "bg-rose-500 animate-pulse";
      statusText = "Connection Offline";
      StatusIcon = ShieldAlert;
    }
  }

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Pill Trigger */}
      <button
        onClick={toggleDropdown}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium 
                    transition-all duration-200 hover:brightness-110 active:scale-95 ${statusColor}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <StatusIcon size={12} className={loading ? "animate-spin" : ""} />
        <span>{statusText}</span>
        <ChevronDown size={12} className={`opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Observability Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#1e1e1e]
                        bg-[#0d0d0d] backdrop-blur-xl shadow-2xl p-4 space-y-4 text-xs text-[#888888]">
          
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
            <span className="font-semibold text-[#e0e0e0]">Cognition Runtime Observability</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="p-1 rounded hover:bg-[#1f1f1f] transition-colors text-[#888888] hover:text-[#e0e0e0]"
              disabled={loading}
              title="Refresh Health"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Subsystems Breakdown */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-[#555555] tracking-wider">Subsystems</span>
            
            {health ? (
              <div className="space-y-2">
                {/* Bootstrap (HIGH) */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-[#e0e0e0]">Bootstrap Substrate</span>
                    <span className="text-[10px] text-[#555555]">Core Availability (HIGH)</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    health.subsystems.bootstrap.status === "HEALTHY" 
                      ? "text-white bg-white/10" 
                      : "text-rose-400 bg-rose-500/10"
                  }`}>
                    {health.subsystems.bootstrap.status}
                  </span>
                </div>

                {/* Embeddings (LOW) */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-[#e0e0e0]">Semantic Embedding Service</span>
                    <span className="text-[10px] text-[#555555]">Search & Insights (LOW)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {health.subsystems.embeddings.success_count_since_failure > 0 && (
                      <span className="text-[10px] text-[#888888]">
                        ({health.subsystems.embeddings.success_count_since_failure}/3)
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      health.subsystems.embeddings.status === "HEALTHY" 
                        ? "text-white bg-white/10" 
                        : "text-amber-400 bg-amber-500/10"
                    }`}>
                      {health.subsystems.embeddings.status}
                    </span>
                  </div>
                </div>

                {/* Snapshots (MEDIUM) */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-[#e0e0e0]">Inference Snapshots</span>
                    <span className="text-[10px] text-[#555555]">Replay & Time travel (MEDIUM)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {health.subsystems.snapshots.success_count_since_failure > 0 && (
                      <span className="text-[10px] text-[#888888]">
                        ({health.subsystems.snapshots.success_count_since_failure}/3)
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      health.subsystems.snapshots.status === "HEALTHY" 
                        ? "text-white bg-white/10" 
                        : "text-amber-400 bg-amber-500/10"
                    }`}>
                      {health.subsystems.snapshots.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-[#555555] italic block">No status loaded yet</span>
            )}
          </div>

          {/* Metrics & Queues */}
          <div className="space-y-2.5 border-t border-[#1f1f1f] pt-3">
            <span className="text-[10px] uppercase font-bold text-[#555555] tracking-wider">Queue Metrics</span>
            
            {health ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1f1f1f]/40 p-2 rounded-xl border border-[#222222]/20">
                  <span className="text-[10px] text-[#555555] block">Embedding Backlog</span>
                  <span className="text-lg font-bold text-[#e0e0e0]">
                    {health.metrics.embedding_queue_depth}
                  </span>
                </div>
                <div className="bg-[#1f1f1f]/40 p-2 rounded-xl border border-[#222222]/20">
                  <span className="text-[10px] text-[#555555] block">Snapshot Backlog</span>
                  <span className="text-lg font-bold text-[#e0e0e0]">
                    {health.metrics.snapshot_queue_depth}
                  </span>
                </div>
                <div className="bg-[#1f1f1f]/40 p-2 rounded-xl border border-[#222222]/20 col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#555555] block">Pending Retry Tasks</span>
                    <span className="text-sm font-bold text-[#e0e0e0]">
                      {health.metrics.failed_tasks} failures
                    </span>
                  </div>
                  {health.metrics.failed_tasks > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              </div>
            ) : (
              <span className="text-[#555555] italic block">No metrics available</span>
            )}
          </div>

          {/* Diagnostic status details */}
          {health && Object.values(health.subsystems).some((s) => s.last_error) && (
            <div className="space-y-1.5 border-t border-[#1f1f1f] pt-3 text-[10px]">
              <span className="uppercase font-bold text-[#555555] tracking-wider block">Diagnostics</span>
              <div className="bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 text-rose-300/80 max-h-20 overflow-y-auto font-mono">
                {Object.entries(health.subsystems)
                  .filter(([_, sub]) => sub.last_error)
                  .map(([name, sub]) => (
                    <div key={name} className="mb-1">
                      <span className="font-bold text-rose-400 capitalize">{name}: </span>
                      {sub.last_error}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
