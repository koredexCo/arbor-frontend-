import React from "react";
import { WifiOff, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

interface OfflineBannerProps {
  isOffline?: boolean;
  message?: string;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline = false,
  message = "Network connection lost. You are currently viewing cached offline state.",
  className,
}) => {
  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "w-full px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs flex items-center justify-center gap-2",
        className
      )}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
      <span className="font-mono text-[10px] uppercase opacity-75 border border-yellow-500/30 px-1 py-0.2 rounded">
        Degraded
      </span>
    </div>
  );
};
