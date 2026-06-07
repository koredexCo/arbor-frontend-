import React from "react";
import { Box, Play, Beaker } from "lucide-react";

export function SandboxEnvironment() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Box className="w-6 h-6 mr-3 text-[#a0a0a0]" />
            Sandbox Environment
          </h1>
          <p className="text-slate-400 mt-1">Isolated civilization experimentation and mutation simulation.</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm flex items-center shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
           <Play className="w-4 h-4 mr-2" />
           Run Simulation
        </button>
      </div>

      <div className="flex-1 bg-[#141417] border border-[#2a2a2a] rounded-xl p-6 flex flex-col items-center justify-center text-slate-500">
         <Beaker className="w-12 h-12 mb-4 opacity-50" />
         <h2 className="text-lg font-semibold text-slate-300">No Active Simulation</h2>
         <p className="text-sm mt-2 max-w-md text-center">Configure a scenario such as "Coalition Capture" or "Recursive Spawning Collapse" from the sidebar to begin.</p>
      </div>
    </div>
  );
}
