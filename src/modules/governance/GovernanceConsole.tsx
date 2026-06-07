import React from "react";
import { Shield, AlertTriangle, Lock, Activity } from "lucide-react";

export function GovernanceConsole() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] flex items-center">
            <Shield className="w-6 h-6 mr-3 text-rose-400" />
            Governance Console
          </h1>
          <p className="text-slate-400 mt-1">Civilization governance cockpit and constitutional controls.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 flex flex-col space-y-6">
          <div className="bg-[#141417] border border-rose-900/50 rounded p-6">
            <h2 className="text-lg font-semibold text-rose-400 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Active Governance Overrides
            </h2>
            <div className="space-y-3">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded flex justify-between items-center">
                <div>
                  <h4 className="text-rose-300 font-medium text-sm">Recursive Instability Containment</h4>
                  <p className="text-xs text-rose-400/70 mt-1">Spawning rate capped at 0.5/sec for Coalition Gamma</p>
                </div>
                <button className="px-3 py-1.5 bg-rose-500/20 text-rose-400 text-xs rounded hover:bg-rose-500/30">Revoke Override</button>
              </div>
            </div>
          </div>

          <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-slate-400" />
              Constitutional Principles
            </h2>
            <div className="space-y-2">
              {[
                { id: "C-01", desc: "Axiomatic Alignment Preservation", status: "STABLE" },
                { id: "C-02", desc: "Information Topology Integrity", status: "STABLE" },
                { id: "C-03", desc: "Recursive Autonomy Bounds", status: "WARN", color: "text-yellow-400" },
              ].map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 border border-[#e8e8e8] rounded bg-white">
                   <div className="flex items-center space-x-3">
                     <span className="font-mono text-xs text-slate-500">{c.id}</span>
                     <span className="text-sm text-slate-300">{c.desc}</span>
                   </div>
                   <span className={`text-xs font-mono font-bold ${c.color || "text-[#0a0a0a]"}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-4 flex flex-col space-y-6">
          <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6">
             <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Emergency Controls</h3>
             <div className="space-y-3">
               <button className="w-full py-3 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded flex items-center justify-center space-x-2 hover:bg-rose-500/20 transition-colors">
                 <Lock className="w-4 h-4" />
                 <span>Freeze Spawning</span>
               </button>
               <button className="w-full py-3 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded flex items-center justify-center space-x-2 hover:bg-yellow-500/20 transition-colors">
                 <Shield className="w-4 h-4" />
                 <span>Isolate Coalition</span>
               </button>
               <button className="w-full py-3 bg-white text-slate-300 border border-[#e8e8e8] rounded flex items-center justify-center space-x-2 hover:bg-white transition-colors">
                 <Activity className="w-4 h-4" />
                 <span>Limit Orchestration</span>
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
