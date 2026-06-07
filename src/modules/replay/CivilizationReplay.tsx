import React, { useState } from "react";
import { History, Play, Pause, SkipBack, SkipForward, FastForward } from "lucide-react";

export function CivilizationReplay() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineLevel, setTimelineLevel] = useState("Commit");

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <History className="w-6 h-6 mr-3 text-white" />
            Branch Replay Engine
          </h1>
          <p className="text-slate-400 mt-1">Time-travel debugger for conversation branches.</p>
        </div>
        <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded p-1">
          {["Minute", "Hour", "Day", "Commit"].map(level => (
             <button 
               key={level}
               onClick={() => setTimelineLevel(level)}
               className={`px-3 py-1 text-xs rounded ${timelineLevel === level ? "bg-[#1a1a1a] text-white" : "text-slate-400 hover:text-slate-300"}`}
             >
               {level}
             </button>
          ))}
        </div>
      </div>

      <div className="flex-1 border border-[#2a2a2a] bg-[#141417] rounded-xl flex items-center justify-center mb-6 relative overflow-hidden">
         <div className="absolute top-4 left-4 text-xs font-mono text-slate-500 uppercase">Replay Engine Viewport</div>
         {/* Simulated Graph Replay Area */}
         <div className="w-64 h-64 rounded-full border border-[#2a2a2a] animate-[spin_60s_linear_infinite] flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border border-[#2a2a2a]/50 animate-[spin_40s_linear_infinite_reverse]"></div>
         </div>
      </div>

      {/* Scrubber Console */}
      <div className="bg-[#141417] border border-[#2a2a2a] rounded-xl p-6">
         <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-mono text-white">COMMIT_14.492</div>
            <div className="flex items-center space-x-4">
               <button className="text-slate-400 hover:text-white"><SkipBack className="w-5 h-5" /></button>
               <button 
                 onClick={() => setIsPlaying(!isPlaying)}
                 className="w-10 h-10 bg-white/20 text-white hover:bg-white/30 rounded-full flex items-center justify-center"
               >
                 {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
               </button>
               <button className="text-slate-400 hover:text-white"><FastForward className="w-5 h-5" /></button>
               <button className="text-slate-400 hover:text-white"><SkipForward className="w-5 h-5" /></button>
            </div>
            <div className="text-sm font-mono text-slate-500">LIVE</div>
         </div>
         
         <div className="relative h-2 bg-[#1a1a1a] rounded-full cursor-pointer">
            <div className="absolute top-0 left-0 h-full bg-white/50 rounded-full w-1/3"></div>
            <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] -translate-x-1/2 -translate-y-1/2"></div>
         </div>
         <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Genesis</span>
            <span>Current Commit</span>
         </div>
      </div>
    </div>
  );
}
