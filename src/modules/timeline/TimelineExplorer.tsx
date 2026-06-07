import React from "react";
import { Clock } from "lucide-react";

export function TimelineExplorer() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Clock className="w-6 h-6 mr-3 text-white" />
            Epoch Timeline
          </h1>
          <p className="text-slate-400 mt-1">Multi-layer archaeological interface for civilization evolution.</p>
        </div>
      </div>

      <div className="flex-1 bg-[#141417] border border-[#2a2a2a] rounded-xl p-6 relative overflow-hidden">
         <div className="absolute top-0 bottom-0 left-32 w-px bg-[#1a1a1a]"></div>
         <div className="space-y-12 relative z-10 py-6">
            <TimelineEvent time="Epoch 14.492" title="Coalition Gamma Formed" color="bg-yellow-500" />
            <TimelineEvent time="Epoch 14.480" title="Recursive Drift Detected" color="bg-rose-500" />
            <TimelineEvent time="Epoch 14.415" title="Retrieval Context Expanded" color="bg-purple-500" />
            <TimelineEvent time="Epoch 14.000" title="Constitutional Amendment C-03" color="bg-white" />
         </div>
      </div>
    </div>
  );
}

function TimelineEvent({ time, title, color }: any) {
  return (
    <div className="flex items-start group">
       <div className="w-24 text-right pr-6 text-xs font-mono text-slate-500 pt-1 group-hover:text-white transition-colors">{time}</div>
       <div className="relative flex items-center justify-center w-8">
          <div className={`w-3 h-3 rounded-full ${color} shadow-[0_0_10px_currentColor] z-10 ring-4 ring-[#141417]`}></div>
       </div>
       <div className="pl-6 pt-0.5">
          <div className="text-slate-200 text-sm font-semibold">{title}</div>
          <div className="text-slate-500 text-xs mt-1">System automated milestone marker.</div>
       </div>
    </div>
  );
}
