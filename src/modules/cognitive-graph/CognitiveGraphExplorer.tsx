import { useEffect, useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { ZoomIn, ZoomOut, Maximize, Filter, Search } from "lucide-react";

export function CognitiveGraphExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState("far"); // semantic LOD state
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, w: 100, h: 100 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize graphology graph
    const graph = new Graph();

    // Generate dummy civilization topology (1000 nodes)
    const clusters = ["consensus", "governance", "retrieval", "coalition", "memory"];
    const colors = {
      consensus: "#22d3ee", // cyan
      governance: "#f43f5e", // rose
      retrieval: "#a855f7", // purple
      coalition: "#eab308", // yellow
      memory: "#e0e0e0" // blue
    };

    for (let i = 0; i < 1000; i++) {
      const type = clusters[Math.floor(Math.random() * clusters.length)];
      graph.addNode(i.toString(), {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 2,
        color: colors[type as keyof typeof colors],
        label: `Node ${i} (${type})`
      });
    }

    // Add random edges
    for (let i = 0; i < 1500; i++) {
      const source = Math.floor(Math.random() * 1000).toString();
      const target = Math.floor(Math.random() * 1000).toString();
      if (source !== target && !graph.hasEdge(source, target)) {
        graph.addEdge(source, target, {
          size: Math.random() * 2,
          color: "#334155" // slate-700
        });
      }
    }

    setNodeCount(graph.order);

    // Layout
    forceAtlas2.assign(graph, { iterations: 100, settings: { gravity: 1.5 } });

    // Initialize Sigma
    const renderer = new Sigma(graph, containerRef.current, {
      renderLabels: false,
      enableEdgeEvents: true,
      defaultEdgeColor: "#334155",
    });

    // Semantic Topology LOD & Viewport Region Streaming Stub
    renderer.getCamera().on("updated", () => {
      const ratio = renderer.getCamera().ratio;
      let currentZoom = "far";
      if (ratio < 0.5) currentZoom = "close";
      else if (ratio < 1.5) currentZoom = "medium";
      
      setZoomLevel(currentZoom);
      // In production: Send websocket ping to topology_stream.py with bounding box coordinates
      // setViewportBounds({ ... }) to request hydration of visible nodes only
    });

    return () => {
      renderer.kill();
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#050505]">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-[#2a2a2a] bg-[#0A0A0A]/90 px-4 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search topology..." 
              className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-600 w-48"
            />
          </div>
          <button className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Topology</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-slate-500 mr-4 flex flex-col items-end">
            <span>Rendering {nodeCount} active nodes</span>
            <span className="text-[10px] text-white/70">LOD: {zoomLevel.toUpperCase()} | Region Streaming ACTIVE</span>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1a1a1a] rounded transition-colors"><ZoomIn className="w-4 h-4" /></button>
          <button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1a1a1a] rounded transition-colors"><ZoomOut className="w-4 h-4" /></button>
          <button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1a1a1a] rounded transition-colors"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0 cursor-move" />
        
        {/* Floating Legend */}
        <div className="absolute bottom-6 right-6 bg-[#0A0A0A]/90 border border-[#2a2a2a] rounded-lg p-3 backdrop-blur shadow-2xl">
          <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Lineage Legend</h4>
          <div className="space-y-1.5">
            {[
              { label: "Linear Context", color: "bg-[#1a1a1a]" },
              { label: "Divergence Point", color: "bg-rose-500" },
              { label: "Semantic Memory", color: "bg-purple-500" },
              { label: "Merged Branch", color: "bg-yellow-500" },
              { label: "Active Head", color: "bg-white" },
            ].map(item => (
              <div key={item.label} className="flex items-center text-xs text-slate-300">
                <span className={`w-2 h-2 rounded-full ${item.color} mr-2 shadow-[0_0_5px_currentColor]`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
