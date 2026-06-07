import React from "react";
import { Users, Network } from "lucide-react";

export function CoalitionViewer() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] flex items-center">
            <Users className="w-6 h-6 mr-3 text-yellow-400" />
            Coalition Topology
          </h1>
          <p className="text-slate-400 mt-1">Observable synthetic social cognition and trust networks.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* Main Topology View */}
        <div className="col-span-8 bg-[#141417] border border-[#e8e8e8] rounded flex items-center justify-center relative overflow-hidden">
           <div className="absolute top-4 left-4 text-xs font-mono text-slate-500 uppercase">Trust Network Map</div>
           {/* Placeholder for Force-directed layout of coalitions */}
           <div className="text-slate-600 border border-dashed border-[#e8e8e8] p-8 rounded text-center">
             <Network className="w-8 h-8 mx-auto mb-2 " />
             <p className="text-sm">Force-Directed Trust Map Rendering...</p>
             <p className="text-xs mt-1 text-slate-500">Awaiting WebGL context</p>
           </div>
        </div>

        {/* Coalition Details Sidebar */}
        <div className="col-span-4 flex flex-col space-y-6">
          <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6 flex-1">
             <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Active Clusters</h3>
             <div className="space-y-4">
               {[
                 { name: "Alpha Coalition", members: 42, trust: 0.94, align: "Exploration" },
                 { name: "Beta Node-Group", members: 18, trust: 0.81, align: "Consolidation" },
                 { name: "Gamma Faction", members: 7, trust: 0.42, align: "Mutation" },
               ].map(c => (
                 <div key={c.name} className="p-3 border border-[#e8e8e8] rounded bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-200">{c.name}</span>
                      <span className="text-xs font-mono text-slate-500">{c.members} nodes</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Trust Index</span>
                      <span className={c.trust > 0.8 ? "text-[#0a0a0a]" : c.trust > 0.5 ? "text-yellow-400" : "text-rose-400"}>
                        {c.trust.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-white h-1.5 rounded overflow-hidden mb-2">
                       <div 
                         className={`h-full ${c.trust > 0.8 ? "bg-white" : c.trust > 0.5 ? "bg-yellow-500" : "bg-rose-500"}`} 
                         style={{ width: `${c.trust * 100}%` }} 
                       />
                    </div>
                    <div className="text-xs text-slate-500">Alignment: <span className="text-slate-300">{c.align}</span></div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
