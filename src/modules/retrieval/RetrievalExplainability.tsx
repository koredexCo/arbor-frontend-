import React from "react";
import { Search, Database, Fingerprint, Activity } from "lucide-react";

export function RetrievalExplainability() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] flex items-center">
            <Search className="w-6 h-6 mr-3 text-[#0a0a0a]" />
            Memory Context Debugger
          </h1>
          <p className="text-slate-400 mt-1">Analyze vector similarity and branch-scoped token composition.</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white text-slate-300 rounded text-sm hover:bg-white">Pause Stream</button>
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Trace Log */}
        <div className="col-span-4 flex flex-col space-y-4">
          <div className="bg-[#141417] border border-[#e8e8e8] rounded p-4 flex-1">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-rose-400" />
              Live Assembly Traces
            </h3>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="p-3 bg-white rounded border border-[#e8e8e8] hover:border-[#e8e8e8] cursor-pointer">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#0a0a0a] font-mono">REQ_{Math.floor(Math.random()*9000)+1000}</span>
                    <span className="text-slate-500">23ms ago</span>
                  </div>
                  <div className="text-sm text-slate-300">Distributed Retrieval Optimization</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Score Breakdown */}
        <div className="col-span-8 flex flex-col space-y-6">
          <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-slate-100 font-semibold">Node: "Distributed Retrieval Optimization"</h2>
              <div className="px-3 py-1 bg-white/10 text-[#0a0a0a] border border-[#e8e8e8] rounded font-mono text-xl">
                2.12
              </div>
            </div>

            <div className="space-y-6">
              <ScoreRow label="Semantic Match" score={0.74} color="bg-white" />
              <ScoreRow label="Lineage Weight" score={1.00} color="bg-white" />
              <ScoreRow label="Recency Boost" score={0.85} color="bg-rose-500" />
              <ScoreRow label="Token Density" score={0.52} color="bg-yellow-500" />
              
              <div className="pt-4 mt-4 border-t border-[#e8e8e8] flex justify-between font-mono text-sm">
                <span className="text-slate-500">FINAL AGGREGATE</span>
                <span className="text-[#0a0a0a]">2.12</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#141417] border border-[#e8e8e8] rounded p-6 flex-1">
             <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center">
              <Database className="w-4 h-4 mr-2 text-[#52504b]" />
              Token Packing Contribution
            </h3>
            <div className="w-full h-32 bg-white rounded border border-[#e8e8e8] flex items-center justify-center text-slate-600">
               [ Packing Visualization Chart ]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, score, color }: { label: string, score: number, color: string }) {
  const percentage = Math.min((score / 1.5) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{score.toFixed(2)}</span>
      </div>
      <div className="h-2 w-full bg-white rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
