import React from "react";
import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-app-border bg-app-card/50",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-app-hover border border-app-border flex items-center justify-center mb-4 text-app-dim">
          <Icon className="w-6 h-6 stroke-[1.5]" />
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-app-text mb-1">{title}</h3>
      {description && <p className="text-xs text-app-muted max-w-sm mb-4 leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-app-accent text-app-inverted hover:opacity-90 transition-opacity border border-app-border"
        >
          {actionLabel}
        </button>
      )}
      {children}
    </div>
  );
};
