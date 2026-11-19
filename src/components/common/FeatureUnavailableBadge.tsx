import React from "react";
import { cn } from "../../lib/utils";

export type FeatureStatus = "LIVE" | "PLANNED" | "UNAVAILABLE" | "DEGRADED" | "SEALED";

interface FeatureUnavailableBadgeProps {
  status: FeatureStatus;
  label?: string;
  className?: string;
}

export const FeatureUnavailableBadge: React.FC<FeatureUnavailableBadgeProps> = ({
  status,
  label,
  className,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case "LIVE":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "PLANNED":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "UNAVAILABLE":
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
      case "DEGRADED":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "SEALED":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border",
        getBadgeConfig(),
        className
      )}
    >
      {label || status}
    </span>
  );
};
