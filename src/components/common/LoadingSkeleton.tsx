import React from "react";
import { cn } from "../../lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle" | "card";
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = "rect",
  count = 1,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "text":
        return "h-4 w-full rounded";
      case "circle":
        return "h-10 w-10 rounded-full";
      case "card":
        return "h-32 w-full rounded-lg";
      case "rect":
      default:
        return "h-8 w-full rounded-md";
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-app-hover border border-app-subtle",
            getVariantStyles(),
            className
          )}
        />
      ))}
    </>
  );
};
