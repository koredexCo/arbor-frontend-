import React from "react";
import { Activity, Zap, Server, ShieldAlert } from "lucide-react";

export function HealthDashboard() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] flex items-center">
            <Activity className="w-6 h-6 mr-3 text-[#0a0a0a]" />
            Civilization Health
          </h1>
          <p className="text-slate-400 mt-1">Real-time metrics, coherence, and stability dashboards.</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard title="System Coherence" value="98.2%" status="optimal" icon={Activity} />
        <MetricCard title="Gov. Stability" value="1.04" status="warning" icon={ShieldAlert} />
        <MetricCard title="Retrieval Precision" value="0.92" status="optimal" icon={Zap} />
        <MetricCard title="Orchestration Load" value="42%" status="optimal" icon={Server} />
      </div>

      <div className="grid grid-cols-2 gap-6">
         <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6 h-64 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Recursive Instability</h3>
            <div className="flex-1 border border-[#e8e8e8] border-dashed rounded flex items-center justify-center text-slate-500 text-xs">
               [ Instability Trend Graph ]
            </div>
         </div>
         <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6 h-64 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Ideological Drift</h3>
            <div className="flex-1 border border-[#e8e8e8] border-dashed rounded flex items-center justify-center text-slate-500 text-xs">
               [ Drift Vector Graph ]
            </div>
         </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, status, icon: Icon }: any) {
  const statusColors = {
    optimal: "text-[#0a0a0a]",
    warning: "text-yellow-400",
    critical: "text-rose-400"
  };
  return (
    <div className="bg-[#141417] border border-[#e8e8e8] rounded p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{title}</span>
        <Icon className={`w-4 h-4 ${statusColors[status as keyof typeof statusColors]}`} />
      </div>
      <span className={`text-2xl font-mono font-bold ${statusColors[status as keyof typeof statusColors]}`}>{value}</span>
    </div>
  );
}
