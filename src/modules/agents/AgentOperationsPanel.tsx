import React from "react";
import { Cpu, Zap } from "lucide-react";

export function AgentOperationsPanel() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] flex items-center">
            <Cpu className="w-6 h-6 mr-3 text-[#0a0a0a]" />
            Agent Operations
          </h1>
          <p className="text-slate-400 mt-1">Distributed cognition operations and agent trust tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
         {[
           { id: "A-1", type: "Architect", rep: 0.98, status: "Active" },
           { id: "O-3", type: "Optimizer", rep: 0.85, status: "Active" },
           { id: "R-2", type: "Research", rep: 0.72, status: "Idle" },
           { id: "G-1", type: "Governance", rep: 0.99, status: "Active" },
         ].map(agent => (
           <div key={agent.id} className="bg-[#141417] border border-[#e8e8e8] rounded p-5 hover:border-[#e8e8e8] transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-4">
                 <div className="w-10 h-10 rounded bg-white border border-[#e8e8e8] flex items-center justify-center text-[#0a0a0a] font-mono font-bold">
                    {agent.id}
                 </div>
                 <div className={`px-2 py-1 text-xs rounded border ${agent.status === 'Active' ? 'bg-white/10 border-[#e8e8e8] text-[#0a0a0a]' : 'bg-white border-[#e8e8e8] text-slate-400'}`}>
                    {agent.status}
                 </div>
              </div>
              <h3 className="text-[#0a0a0a] font-semibold">{agent.type} Agent</h3>
              <div className="flex items-center justify-between mt-4 text-sm">
                 <span className="text-slate-500">Reputation</span>
                 <span className="text-[#0a0a0a] font-mono">{agent.rep.toFixed(2)}</span>
              </div>
              <div className="w-full h-1 bg-white mt-2 rounded overflow-hidden">
                 <div className="h-full bg-white" style={{ width: `${agent.rep * 100}%` }}></div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
