import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MessageSquare, Terminal, Waypoints } from "lucide-react";
import type { VisibleGraph } from "../types/visibleGraph";

/* ============================================================
   Custom Node Component: MessageNode
   ============================================================ */

interface MessageNodeData extends Record<string, unknown> {
  role: string;
  content: string;
  isActive: boolean;
  inherited: boolean;
  local: boolean;
  fork_origin: boolean;
  onSelect?: (nodeId: string) => void;
}

function MessageNode({ data }: { data: MessageNodeData }) {
  const isAssistant = data.role === "assistant";
  
  return (
    <div
      className={`px-3 py-2 rounded border transition-all duration-200 min-w-[180px] max-w-[240px] relative
        ${data.fork_origin
          ? "bg-white border-[#e0e0e0] shadow-lg"
          : data.local
            ? "bg-white border-[#666666] shadow-md"
            : "bg-white border-[#e8e8e8] "
        }
        ${data.isActive ? "ring-2 ring-[#ffffff] ring-offset-2 ring-offset-[#0a0a0a]" : ""}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-surface-600 !w-1.5 !h-1.5 !border-0" />

      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {data.fork_origin ? (
            <Waypoints size={12} className="text-[#52504b]" />
          ) : isAssistant ? (
            <Terminal size={12} className="text-[#52504b]" />
          ) : (
            <MessageSquare size={12} className="text-[#52504b]" />
          )}
          <span className={`text-[10px] font-bold uppercase tracking-wider
            ${data.fork_origin ? "text-[#e0e0e0]" : isAssistant ? "text-[#0a0a0a]" : "text-[#52504b]"}`}>
            {data.fork_origin ? "Fork Origin" : data.role}
          </span>
        </div>
        {data.inherited && (
          <span className="text-[8px] bg-white text-[#52504b] px-1 rounded border border-[#e8e8e8]">
            INHERITED
          </span>
        )}
      </div>

      <p className={`text-[11px] line-clamp-2 leading-relaxed
        ${data.inherited ? "text-[#52504b]" : "text-[#e0e0e0]"}`}>
        {data.content}
      </p>

      {data.fork_origin && (
        <div className="mt-1.5 pt-1.5 border-t border-[#e8e8e8]">
          <span className="text-[8px] text-[#52504b] font-medium">Divergence Point</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-surface-600 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  message: MessageNode,
};

/* ============================================================
   Main BranchTree Component (DAG Renderer)
   ============================================================ */

interface Props {
  graph: VisibleGraph | null;
  activeBranchId: string | null;
  onBranchSelect?: (branchId: string) => void;
}

function GraphInternal({ graph, activeBranchId }: Props) {
  const { setCenter } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };

    const nodeList: Node<MessageNodeData>[] = [];
    const edgeList: Edge[] = [];

    // Layout configuration
    const X_GAP = 280;
    const Y_GAP = 120;

    // 1. Group nodes by branch to calculate swimlanes
    const branches = Array.from(new Set(graph.nodes.map(n => n.branch_id)));
    const branchXMap: Record<string, number> = {};
    
    // Put current branch in the center (0)
    if (activeBranchId) {
      branchXMap[activeBranchId] = 0;
      let leftCount = 1;
      let rightCount = 1;
      
      branches.forEach(bid => {
        if (bid === activeBranchId) return;
        // Simple heuristic: main on the left, others on the right
        if (bid === "main" || bid.length < activeBranchId.length) {
          branchXMap[bid] = -leftCount * X_GAP;
          leftCount++;
        } else {
          branchXMap[bid] = rightCount * X_GAP;
          rightCount++;
        }
      });
    } else {
      branches.forEach((bid, i) => {
        branchXMap[bid] = i * X_GAP;
      });
    }

    // 2. Map Nodes
    graph.nodes.forEach((n) => {
      nodeList.push({
        id: n.id,
        type: "message",
        position: n.position || { 
          x: branchXMap[n.branch_id] || 0, 
          y: n.node_sequence * Y_GAP 
        },
        data: {
          role: n.role,
          content: n.content,
          isActive: n.id === graph.fork_origin?.node_id,
          inherited: n.inherited,
          local: n.local,
          fork_origin: n.fork_origin,
        },
      });
    });

    // 3. Map Edges
    graph.edges.forEach((e) => {
      const targetNode = graph.nodes.find(n => n.id === e.target);
      const isLocalEdge = targetNode?.local;

      edgeList.push({
        id: `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: isLocalEdge,
        style: {
          stroke: isLocalEdge ? "#3385ff" : "#475569",
          strokeWidth: isLocalEdge ? 2 : 1,
          opacity: targetNode?.inherited ? 0.4 : 1,
        },
      });
    });

    return { nodes: nodeList, edges: edgeList };
  }, [graph, activeBranchId]);

  // Auto-focus on fork origin or latest local node
  useEffect(() => {
    if (nodes.length > 0) {
      const target = nodes.find(n => n.data.fork_origin) || nodes[nodes.length - 1];
      if (target) {
        setCenter(target.position.x + 100, target.position.y, { zoom: 0.8, duration: 800 });
      }
    }
  }, [nodes, setCenter]);

  if (!graph || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#52504b]">
        <div className="text-center">
          <Waypoints size={32} className="mx-auto mb-2  " />
          <p className="text-sm">Projecting cognitive graph...</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      minZoom={0.1}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Controls
        showInteractive={false}
        className="!bg-white !border-[#e8e8e8] !rounded"
      />
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#1e293b"
      />
    </ReactFlow>
  );
}

export function BranchTree(props: Props) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <GraphInternal {...props} />
      </ReactFlowProvider>
    </div>
  );
}

