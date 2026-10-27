import React from "react";
import { Boxes, Compass, Download, ShieldCheck } from "lucide-react";
import { EngineeringPanel } from "../components/EngineeringPanel";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";

export const EngineeringPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-app-text" />
              Engineering & CAD / Physics Simulation
            </h1>
            <FeatureUnavailableBadge status="LIVE" label="Parametric CAD" />
          </div>
          <p className="text-xs text-app-muted">
            Hardware CAD assembly viewing, Factor-of-Safety stress analysis, simulation telemetry, and STEP/STL artifact exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-app-muted border border-app-border px-2.5 py-1 rounded bg-app-card">
            Grounding Status: Verified in Simulation
          </span>
        </div>
      </div>

      {/* Main Engineering Panel */}
      <div className="bg-app-card border border-app-border rounded-xl p-5 shadow-sm">
        <EngineeringPanel workspaceId="default-workspace" branchId="main-branch" />
      </div>
    </div>
  );
};
