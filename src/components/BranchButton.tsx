import { GitBranch } from "lucide-react";

interface Props {
  onClick: () => void;
  label?: string;
  size?: "sm" | "md";
}

export function BranchButton({ onClick, label = "Branch", size = "sm" }: Props) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium
                  text-white bg-white/10 border border-[#2a2a2a]
                  hover:bg-white/20 hover:border-[#2a2a2a]
                  active:bg-white/25
                  transition-all duration-200
                  ${size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3.5 py-1.5"}`}
      title="Create a new branch from this point"
    >
      <GitBranch size={size === "sm" ? 12 : 14} />
      {label}
    </button>
  );
}
