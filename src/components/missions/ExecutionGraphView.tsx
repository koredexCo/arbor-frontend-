import React, { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Wrench,
  ShieldCheck,
  Search,
  Code2,
  Cpu,
  FileCheck2,
  Layers,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import type { PlanStepData } from "../../services/orchestratorApi";

interface StepNodeData {
  step: PlanStepData;
  isSelected: boolean;
  onSelect: (stepId: string) => void;
  [key: string]: unknown;
}

const getActionIcon = (action: string) => {
  const act = action.toLowerCase();
  if (act.includes("inspect") || act.includes("search")) return <Search className="w-3.5 h-3.5" />;
  if (act.includes("code") || act.includes("patch")) return <Code2 className="w-3.5 h-3.5" />;
  if (act.includes("compile") || act.includes("transpile") || act.includes("build"))
    return <Cpu className="w-3.5 h-3.5" />;
  if (act.includes("test") || act.includes("verify")) return <FileCheck2 className="w-3.5 h-3.5" />;
  if (act.includes("branch")) return <GitBranch className="w-3.5 h-3.5" />;
  return <Wrench className="w-3.5 h-3.5" />;
};

const getStatusBadge = (status: PlanStepData["status"]) => {
  switch (status) {
    case "completed":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
          <CheckCircle2 className="w-2.5 h-2.5" />
          DONE
        </span>
      );
    case "running":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-sky-400 bg-sky-950/60 border border-sky-800/60 px-1.5 py-0.5 rounded animate-pulse">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ACTIVE
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
          <XCircle className="w-2.5 h-2.5" />
          FAILED
        </span>
      );
    case "skipped":
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-750 px-1.5 py-0.5 rounded">
          SKIPPED
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
          <Circle className="w-2.5 h-2.5" />
          PENDING
        </span>
      );
  }
};

function StepNodeComponent({ data }: { data: StepNodeData }) {
  const { step, isSelected, onSelect } = data;

  return (
    <div
      onClick={() => onSelect(step.step_id)}
      className={`relative w-64 rounded-xl border p-3.5 shadow-md cursor-pointer transition-all duration-200 select-none ${
        isSelected
          ? "border-app-text bg-app-card ring-2 ring-app-accent/30 shadow-lg scale-[1.02]"
          : "border-app-border bg-app-card hover:border-app-strong hover:bg-app-secondary/50"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-app-border !border-app-strong"
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-app-secondary border border-app-border text-app-text">
            {getActionIcon(step.action)}
          </span>
          <span className="font-mono text-[10px] font-bold text-app-text uppercase tracking-wider">
            {step.step_id}
          </span>
        </div>
        {getStatusBadge(step.status)}
      </div>

      <div className="space-y-1 mb-2">
        <div className="text-xs font-medium text-app-text line-clamp-2 leading-snug">
          {step.description || step.action}
        </div>
        {step.tool_name && (
          <div className="text-[10px] font-mono text-app-muted truncate flex items-center gap-1">
            <span className="text-app-dim">tool:</span>
            <span>{step.tool_name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-app-subtle text-[10px] font-mono text-app-dim">
        <span className="uppercase">{step.action}</span>
        {step.requires_human_approval && (
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            CAS
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-app-border !border-app-strong"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  stepNode: StepNodeComponent,
};

interface ExecutionGraphViewProps {
  steps: PlanStepData[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  allowsBranching?: boolean;
}

export const ExecutionGraphView: React.FC<ExecutionGraphViewProps> = ({
  steps,
  selectedStepId,
  onSelectStep,
  allowsBranching = true,
}) => {
  // Check if graph edges / dependencies are declared
  const hasExplicitDependencies = useMemo(() => {
    return steps.some((s) => s.depends_on && s.depends_on.length > 0);
  }, [steps]);

  // Compute Topological Levels for DAG layout
  const { nodes, edges } = useMemo(() => {
    if (!steps || steps.length === 0) {
      return { nodes: [], edges: [] };
    }

    const stepIdSet = new Set(steps.map((s) => s.step_id));
    const stepMap = new Map(steps.map((s) => [s.step_id, s]));

    // Compute in-degree and dependents
    const levels = new Map<string, number>();

    if (hasExplicitDependencies) {
      // Kahn-like level computation
      const computeLevel = (stepId: string, visited: Set<string>): number => {
        if (levels.has(stepId)) return levels.get(stepId)!;
        if (visited.has(stepId)) return 0; // Avoid cycles

        visited.add(stepId);
        const step = stepMap.get(stepId);
        if (!step || !step.depends_on || step.depends_on.length === 0) {
          levels.set(stepId, 0);
          return 0;
        }

        const validDeps = step.depends_on.filter((d) => stepIdSet.has(d));
        if (validDeps.length === 0) {
          levels.set(stepId, 0);
          return 0;
        }

        const maxDepLevel = Math.max(
          ...validDeps.map((d) => computeLevel(d, new Set(visited)))
        );
        const lvl = maxDepLevel + 1;
        levels.set(stepId, lvl);
        return lvl;
      };

      steps.forEach((s) => computeLevel(s.step_id, new Set()));
    } else {
      // Default sequential linear positioning
      steps.forEach((s, idx) => levels.set(s.step_id, idx));
    }

    // Group steps by level for vertical stacking
    const levelGroups = new Map<number, PlanStepData[]>();
    steps.forEach((s) => {
      const lvl = levels.get(s.step_id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(s);
    });

    // Layout configuration constants
    const X_GAP = 320;
    const Y_GAP = 140;

    const computedNodes: Node[] = [];
    levelGroups.forEach((groupSteps, lvl) => {
      const totalInLevel = groupSteps.length;
      const startY = -((totalInLevel - 1) * Y_GAP) / 2;

      groupSteps.forEach((st, idx) => {
        computedNodes.push({
          id: st.step_id,
          type: "stepNode",
          position: {
            x: lvl * X_GAP + 40,
            y: startY + idx * Y_GAP + 100,
          },
          data: {
            step: st,
            isSelected: st.step_id === selectedStepId,
            onSelect: onSelectStep,
          },
        });
      });
    });

    // Generate DAG Edges
    const computedEdges: Edge[] = [];
    if (hasExplicitDependencies) {
      steps.forEach((st) => {
        if (st.depends_on) {
          st.depends_on.forEach((depId) => {
            if (stepIdSet.has(depId)) {
              computedEdges.push({
                id: `edge-${depId}->${st.step_id}`,
                source: depId,
                target: st.step_id,
                animated: st.status === "running",
                style: {
                  stroke: st.status === "completed" ? "var(--app-text)" : "var(--app-muted)",
                  strokeWidth: 1.5,
                  strokeDasharray: st.status === "pending" ? "4,4" : undefined,
                },
              });
            }
          });
        }
      });
    } else {
      // Generate linear sequence edges
      for (let i = 0; i < steps.length - 1; i++) {
        computedEdges.push({
          id: `edge-${steps[i].step_id}->${steps[i + 1].step_id}`,
          source: steps[i].step_id,
          target: steps[i + 1].step_id,
          animated: steps[i + 1].status === "running",
          style: {
            stroke: steps[i].status === "completed" ? "var(--app-text)" : "var(--app-muted)",
            strokeWidth: 1.5,
          },
        });
      }
    }

    return { nodes: computedNodes, edges: computedEdges };
  }, [steps, selectedStepId, onSelectStep, hasExplicitDependencies]);

  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-app-muted text-xs border border-app-border rounded-xl bg-app-card space-y-2">
        <Layers className="w-8 h-8 text-app-dim mb-1" />
        <p className="font-semibold text-app-text">No Execution Graph Available</p>
        <p className="text-[11px] text-app-dim">
          The selected mission does not contain an active plan or execution DAG.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[540px] bg-app-canvas border border-app-border rounded-xl overflow-hidden shadow-inner">
      {/* Topology Status Header */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-app-card/90 backdrop-blur border border-app-border px-3 py-1.5 rounded-lg text-xs font-mono">
        <span className="text-app-text font-bold">DAG Topology</span>
        <span className="text-app-muted">·</span>
        <span className="text-[11px] text-app-muted">
          {nodes.length} nodes · {edges.length} edges
        </span>
        {!hasExplicitDependencies && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-app-secondary border border-app-border text-app-dim">
            Linear Sequence
          </span>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: "smoothstep" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--app-border)" gap={20} size={1} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-app-card !border !border-app-border !fill-app-text !text-app-text [&>button]:!bg-app-card [&>button]:!border-app-border [&>button]:!fill-app-text" />
        <MiniMap
          nodeColor={() => "var(--app-muted)"}
          maskColor="rgba(0, 0, 0, 0.6)"
          className="!bg-app-card !border !border-app-border"
        />
      </ReactFlow>

      {/* Accessible Text Representation for Accessibility & Debugging */}
      <div className="sr-only" aria-label="Accessible Execution Graph Summary">
        <h4>Authoritative Execution Graph Steps</h4>
        <ol>
          {steps.map((st) => (
            <li key={st.step_id}>
              Step {st.step_id}: {st.description} (Action: {st.action}, Status: {st.status},
              Dependencies: {st.depends_on?.join(", ") || "None"})
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
