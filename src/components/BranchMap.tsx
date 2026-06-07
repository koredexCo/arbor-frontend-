import { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, TreePine } from "lucide-react";
import type { Branch } from "../types";

/* ============================================================
   Custom Node: BranchNode
   ============================================================ */

interface BranchNodeData {
  name: string;
  depth: number;
  isRoot: boolean;
  isActive: boolean;
  origin_preview?: string | null;
  [key: string]: unknown;
}

function BranchNode({ data }: { data: BranchNodeData }) {
  return (
    <div
      className={`relative rounded border transition-all duration-200 select-none`}
      style={{
        minWidth: 160,
        maxWidth: 200,
        background: data.isActive ? "#1f1f1f" : "#141414",
        border: data.isActive ? "1px solid #ffffff" : "1px solid #2a2a2a",
        boxShadow: data.isActive
          ? "0 0 0 2px rgba(255,255,255,0.25), 0 4px 24px rgba(255,255,255,0.12)"
          : "0 2px 8px rgba(0,0,0,0.4)",
        padding: "10px 14px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#334155", width: 8, height: 8, border: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: data.isActive ? "#e0e0e0" : "#94a3b8", flexShrink: 0 }}>
          {data.isRoot ? <TreePine size={13} /> : <GitBranch size={13} />}
        </span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: data.isActive ? "#93c5fd" : "#e2e8f0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.name}
        </span>
      </div>

      {data.depth > 0 && (
        <div
          style={{
            fontSize: 10,
            color: "#475569",
            marginTop: 4,
            paddingLeft: 19,
          }}
        >
          depth {data.depth}
        </div>
      )}

      {data.origin_preview && (
        <div
          style={{
            fontSize: 10,
            color: "#475569",
            marginTop: 2,
            paddingLeft: 19,
            fontStyle: "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.origin_preview}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#334155", width: 8, height: 8, border: "none" }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  branch: BranchNode,
};

/* ============================================================
   BranchMap Component
   ============================================================ */

interface Props {
  branches: Branch[];
  currentBranchId: string | null;
  onBranchClick: (branchId: string) => void;
}

const X_SPACING = 220;
const Y_SPACING = 150;

function BranchMapInternal({ branches, currentBranchId, onBranchClick }: Props) {
  const { nodes, edges } = useMemo(() => {
    if (!branches.length) return { nodes: [], edges: [] };

    // Group branches by depth for x-positioning
    const depthGroups: Record<number, Branch[]> = {};
    branches.forEach((b) => {
      const d = b.depth ?? 0;
      if (!depthGroups[d]) depthGroups[d] = [];
      depthGroups[d].push(b);
    });

    const flowNodes: Node<BranchNodeData>[] = branches.map((branch) => {
      const depth = branch.depth ?? 0;
      const group = depthGroups[depth];
      const indexInGroup = group.indexOf(branch);
      const totalInGroup = group.length;
      const xOffset = (indexInGroup - (totalInGroup - 1) / 2) * X_SPACING;

      return {
        id: branch.id,
        type: "branch",
        position: {
          x: xOffset,
          y: depth * Y_SPACING,
        },
        data: {
          name: branch.name,
          depth,
          isRoot: depth === 0,
          isActive: branch.id === currentBranchId,
          origin_preview: branch.origin_preview ?? null,
        },
      };
    });

    const flowEdges: Edge[] = branches
      .filter((b) => b.parent_branch_id)
      .map((branch) => ({
        id: `edge-${branch.parent_branch_id}-${branch.id}`,
        source: branch.parent_branch_id!,
        target: branch.id,
        type: "smoothstep",
        style: { stroke: "#334155", strokeWidth: 2 },
        animated: branch.id === currentBranchId,
      }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [branches, currentBranchId]);

  if (!branches.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#52504b]">
        <div className="text-center">
          <GitBranch size={32} className="mx-auto mb-2 " />
          <p className="text-sm">No branches yet</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onBranchClick(node.id)}
      fitView
      fitViewOptions={{ padding: 0.35 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Controls
        showInteractive={false}
        className="!bg-white !border-[#e8e8e8] !rounded"
      />
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#1e293b"
      />
      <MiniMap
        nodeColor={(node) =>
          (node.data as BranchNodeData).isActive ? "#e0e0e0" : "#1e293b"
        }
        maskColor="rgba(0,0,0,0.6)"
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 8,
        }}
      />
    </ReactFlow>
  );
}

export function BranchMap(props: Props) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <BranchMapInternal {...props} />
      </ReactFlowProvider>
    </div>
  );
}
