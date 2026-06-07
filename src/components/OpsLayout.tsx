import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Network, 
  History, 
  Search 
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { path: "/ops/graph", icon: Network, label: "Branch Lineage Viewer" },
  { path: "/ops/retrieval", icon: Search, label: "Memory Context Debugger" },
  { path: "/ops/replay", icon: History, label: "Branch Replay Engine" },
];

export function OpsLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-slate-300 font-mono text-sm overflow-hidden selection:bg-white selection:text-[#0a0a0a]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#e8e8e8] bg-[#0F0F11] flex flex-col z-20">
        <div className="h-14 flex items-center px-4 border-b border-[#e8e8e8] bg-[#141417]">
          <div className="w-6 h-6 rounded bg-white border border-[#e8e8e8] flex items-center justify-center mr-3">
            <Network className="w-4 h-4 text-[#0a0a0a]" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">WORKSPACE.IDE</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
            Workspace Tools
          </div>
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md transition-all duration-200 group",
                    active 
                      ? "bg-white text-[#0a0a0a] font-medium" 
                      : "text-slate-400 hover:bg-white hover:text-slate-200"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 mr-3 transition-colors", active ? "text-[#0a0a0a]" : "text-slate-500 group-hover:text-slate-400")} />
                  {item.label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded bg-white shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Status Bar Section */}
        <div className="p-4 border-t border-[#e8e8e8] bg-[#0F0F11]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Connection</span>
            <span className="flex items-center text-[#0a0a0a] font-medium">
              <span className="w-2 h-2 rounded bg-white mr-2 " />
              LIVE
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500">Sync State</span>
            <span className="text-slate-400">Stable v1.0.3</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col bg-[#0A0A0A]">
        {/* Top Header bar */}
        <header className="h-14 border-b border-[#e8e8e8] bg-[#0A0A0A]/80 backdrop- flex items-center px-6 justify-between z-10">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>root</span>
            <span>/</span>
            <span className="text-[#0a0a0a]">{location.pathname.split("/").pop()}</span>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="px-2 py-1 rounded bg-white border border-[#e8e8e8] text-xs flex items-center space-x-2">
                <Network className="w-3 h-3 text-[#0a0a0a]" />
                <span>Nodes: 24,192</span>
             </div>
             <Link to="/dashboard" className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-white rounded text-slate-300 transition-colors">
               Exit IDE
             </Link>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
