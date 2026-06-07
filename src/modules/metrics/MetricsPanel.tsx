import React from "react";
import { BarChart, Activity } from "lucide-react";

export function MetricsPanel() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <BarChart className="w-6 h-6 mr-3 text-white" />
            Telemetry & Metrics
          </h1>
          <p className="text-slate-400 mt-1">Production-grade cognition observability.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#141417] border border-[#2a2a2a] rounded-xl p-6 h-64 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center">
             <Activity className="w-4 h-4 mr-2 text-white" />
             Retrieval Latency
          </h3>
          <div className="flex-1 border border-[#2a2a2a] border-dashed rounded flex items-center justify-center text-slate-500 text-xs">
            [ Latency Streaming Graph ]
          </div>
        </div>

        <div className="bg-[#141417] border border-[#2a2a2a] rounded-xl p-6 h-64 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center">
             <Activity className="w-4 h-4 mr-2 text-rose-500" />
             Orchestration Throughput
          </h3>
          <div className="flex-1 border border-[#2a2a2a] border-dashed rounded flex items-center justify-center text-slate-500 text-xs">
            [ Throughput Graph ]
          </div>
        </div>
        
        <div className="col-span-2 bg-[#141417] border border-[#2a2a2a] rounded-xl p-6 h-64 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center">
             <Activity className="w-4 h-4 mr-2 text-white" />
             Consensus Quality & Graph Rendering Performance
          </h3>
          <div className="flex-1 border border-[#2a2a2a] border-dashed rounded flex items-center justify-center text-slate-500 text-xs">
            [ Combined Metrics Graph ]
          </div>
        </div>
      </div>
    </div>
  );
}
