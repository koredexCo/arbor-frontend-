import React from "react";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

interface UnauthorizedStateProps {
  requiredRole?: string;
  requiredCapability?: string;
  reason?: string;
  className?: string;
}

export const UnauthorizedState: React.FC<UnauthorizedStateProps> = ({
  requiredRole,
  requiredCapability,
  reason = "You do not have the required permissions to access this capability.",
  className,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-xl border border-app-border bg-app-card max-w-lg mx-auto my-12",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-app-hover border border-app-border flex items-center justify-center mb-4 text-app-muted">
        <Lock className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-app-text mb-1">Access Restricted</h3>
      <p className="text-xs text-app-muted mb-4 leading-relaxed max-w-sm">{reason}</p>

      {(requiredRole || requiredCapability) && (
        <div className="w-full bg-app-secondary border border-app-border rounded-lg p-3 text-left mb-6 text-xs font-mono">
          {requiredRole && (
            <div className="flex justify-between py-0.5">
              <span className="text-app-muted">Required Role:</span>
              <span className="text-app-text font-bold">{requiredRole}</span>
            </div>
          )}
          {requiredCapability && (
            <div className="flex justify-between py-0.5">
              <span className="text-app-muted">Capability:</span>
              <span className="text-app-text font-bold">{requiredCapability}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md bg-app-hover text-app-text border border-app-border hover:bg-app-active transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go Back
        </button>
        <button
          onClick={() => navigate("/governance")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md bg-app-accent text-app-inverted hover:opacity-90 transition-opacity"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Request Permission
        </button>
      </div>
    </div>
  );
};
