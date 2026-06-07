import { GitBranch, TreePine, ChevronRight, FileDown, Loader2, GitCompareArrows, X, Waypoints, Info, ArrowRight, List } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getAccessToken } from "../services/api";
import type { Branch } from "../types";
import type { VisibleGraph } from "../types/visibleGraph";

interface Props {
  branches: Branch[];
  activeBranchId: string | null;
  onBranchSelect: (branchId: string) => void;
  conversationId?: string;
  graph?: VisibleGraph | null;
}

export function BranchSidebar({
  branches,
  activeBranchId,
  onBranchSelect,
  conversationId,
  graph,
}: Props) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [isExporting, setIsExporting] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const handleExportPDF = async (e: React.MouseEvent, branchId: string) => {
    e.stopPropagation();
    setIsExporting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const blob = await api.exportPDF(token, branchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `branch-export-${branchId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCompareSelect = (branchId: string) => {
    setCompareSelection(prev => {
      if (prev.includes(branchId)) return prev.filter(id => id !== branchId);
      if (prev.length >= 2) return [prev[1], branchId]; // Replace oldest
      return [...prev, branchId];
    });
  };

  const handleCompare = () => {
    if (compareSelection.length === 2) {
      const params = new URLSearchParams({
        a: compareSelection[0],
        b: compareSelection[1],
        ...(conversationId ? { conv: conversationId } : {}),
      });
      navigate(`/compare?${params.toString()}`);
    }
  };

  const activeBranch = branches.find(b => b.id === activeBranchId);

  return (
    <div className="w-64 bg-[#0d0d0d] border-r border-[#2a2a2a] 
                    flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <TreePine size={14} className="text-white" />
            </div>
            <h3 className="text-sm font-semibold text-[#c0c0c0] uppercase tracking-wider">
              Branches
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode(v => v === 'tree' ? 'list' : 'tree')}
              className={`p-1.5 rounded-lg transition-all text-xs text-[#555555] hover:text-white hover:bg-[#1f1f1f] border border-transparent`}
              title={viewMode === 'tree' ? "All Branches (List View)" : "Tree View"}
            >
              {viewMode === 'tree' ? <List size={14} /> : <TreePine size={14} />}
            </button>
            {branches.length >= 2 && (
              <button
                onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}
                className={`p-1.5 rounded-lg transition-all text-xs ${
                  compareMode
                    ? "bg-[#1a1a1a] text-[#a0a0a0] border border-[#2a2a2a]"
                    : "text-[#555555] hover:text-white hover:bg-[#1f1f1f]"
                }`}
                title="Compare branches"
              >
                {compareMode ? <X size={14} /> : <GitCompareArrows size={14} />}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-[#555555] mt-1.5">
          {compareMode
            ? `Select 2 branches to compare (${compareSelection.length}/2)`
            : `${branches.length} branch${branches.length !== 1 ? "es" : ""}`
          }
        </p>
      </div>

      {/* Compare Action Bar */}
      {compareMode && compareSelection.length === 2 && (
        <div className="p-3 border-b border-[#2a2a2a] bg-[#111111]">
          <button
            onClick={handleCompare}
            className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2"
          >
            <GitCompareArrows size={14} />
            Compare Selected
          </button>
        </div>
      )}

      {/* Branch list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {viewMode === 'list' ? (
          branches.map((branch) => {
            const isActive = activeBranchId === branch.id;
            const isSelected = compareSelection.includes(branch.id);

            return (
              <div key={branch.id} className="flex items-center gap-1">
                {compareMode && (
                  <button
                    onClick={() => toggleCompareSelect(branch.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-[#444444] bg-[#1a1a1a]"
                        : "border-surface-600 hover:border-[#555555]"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-sm bg-white" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => compareMode ? toggleCompareSelect(branch.id) : onBranchSelect(branch.id)}
                  className={`flex-1 text-left px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group
                    ${isActive && !compareMode
                      ? "bg-[#1a1a1a] text-white border-l-2 border-l-[#ffffff] border-y-transparent border-r-transparent rounded-l-none"
                      : isSelected
                      ? "bg-[#1f1f1f] text-[#a0a0a0] border border-[#333333]"
                      : "text-[#888888] hover:bg-[#141414] hover:text-[#e0e0e0] border border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Branch icon */}
                    <div className={`flex-shrink-0 ${isActive ? "text-[#a0a0a0]" : isSelected ? "text-[#a0a0a0]" : "text-[#444444]"}`}>
                      <GitBranch size={14} />
                    </div>

                    {/* Branch name */}
                    <span className="truncate font-medium flex-1">
                      {branch.name}
                    </span>

                    {/* Active indicator */}
                    {isActive && !compareMode && (
                      <ChevronRight size={14} className="text-[#a0a0a0] flex-shrink-0" />
                    )}
                  </div>
                </button>
                {/* PDF export — placed outside the branch button */}
                {isActive && !compareMode && (
                  <button
                    onClick={(e) => handleExportPDF(e, branch.id)}
                    disabled={isExporting}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#222222] text-[#555555] hover:text-white transition-colors"
                    title="Export Branch PDF"
                  >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          branches.map((branch) => {
            const isActive = activeBranchId === branch.id;
            const isRoot = branch.depth === 0;
            const isSelected = compareSelection.includes(branch.id);

            return (
              <div key={branch.id} className="flex items-center gap-1">
                {compareMode && (
                  <button
                    onClick={() => toggleCompareSelect(branch.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-[#444444] bg-[#1a1a1a]"
                        : "border-surface-600 hover:border-[#555555]"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-sm bg-white" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => compareMode ? toggleCompareSelect(branch.id) : onBranchSelect(branch.id)}
                  className={`flex-1 text-left px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group
                    ${isActive && !compareMode
                      ? "bg-[#1a1a1a] text-white border-l-2 border-l-[#ffffff] border-y-transparent border-r-transparent rounded-l-none"
                      : isSelected
                      ? "bg-[#1f1f1f] text-[#a0a0a0] border border-[#333333]"
                      : "text-[#888888] hover:bg-[#141414] hover:text-[#e0e0e0] border border-transparent"
                    }`}
                  style={{ paddingLeft: `${(compareMode ? 0 : branch.depth * 16) + 12}px` }}
                >
                  <div className="flex items-center gap-2">
                    {/* Branch icon */}
                    <div className={`flex-shrink-0 ${isActive ? "text-[#a0a0a0]" : isSelected ? "text-[#a0a0a0]" : "text-[#444444]"}`}>
                      {isRoot ? (
                        <TreePine size={14} />
                      ) : (
                        <GitBranch size={14} />
                      )}
                    </div>

                    {/* Branch name */}
                    <span className="truncate font-medium flex-1">
                      {branch.name}
                    </span>

                    {/* Active indicator */}
                    {isActive && !compareMode && (
                      <ChevronRight size={14} className="text-[#a0a0a0] flex-shrink-0" />
                    )}
                  </div>

                  {/* Summary preview */}
                  {branch.summary && !compareMode && (
                    <p className={`text-xs mt-1 truncate
                      ${isActive ? "text-[#a0a0a0]/60" : "text-[#444444]"}`}
                       style={{ paddingLeft: `${22}px` }}
                    >
                      {branch.summary}
                    </p>
                  )}

                  {/* Depth indicator dots */}
                  {branch.depth > 0 && !compareMode && (
                    <div className="flex items-center gap-0.5 mt-1"
                         style={{ paddingLeft: `${22}px` }}>
                      {Array.from({ length: branch.depth }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full
                            ${isActive ? "bg-[#1a1a1a]" : "bg-[#222222]"}`}
                        />
                      ))}
                      <span className={`text-[10px] ml-1
                        ${isActive ? "text-[#a0a0a0]/50" : "text-[#444444]"}`}>
                        depth {branch.depth}
                      </span>
                    </div>
                  )}

                  {/* Origin preview */}
                  {branch.origin_preview && !compareMode && (
                    <p className={`text-[11px] mt-1 truncate italic
                      ${isActive ? "text-[#a0a0a0]/60" : "text-[#555555]"}`}
                       style={{ paddingLeft: `${22}px` }}
                    >
                      {branch.origin_preview}
                    </p>
                  )}
                </button>
                {/* PDF export — placed outside the branch button */}
                {isActive && !compareMode && (
                  <button
                    onClick={(e) => handleExportPDF(e, branch.id)}
                    disabled={isExporting}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#222222] text-[#555555] hover:text-white transition-colors"
                    title="Export Branch PDF"
                  >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  </button>
                )}
              </div>
            );
          })
        )}

        {branches.length === 0 && (
          <div className="text-center py-8 text-[#444444]">
            <GitBranch size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">No branches yet</p>
          </div>
        )}
      </div>

      {/* Lineage Info Panel */}
      {activeBranch && graph && (
        <div className="p-4 bg-[#1f1f1f]/50 border-t border-[#1e1e1e] space-y-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-[#a0a0a0]" />
            <h4 className="text-[10px] font-bold text-[#888888] uppercase tracking-widest">
              Cognitive Lineage
            </h4>
          </div>

          {/* Lineage Path */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#555555] font-medium">Authoritative Path</span>
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              {graph.branch.lineage_path.map((name, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded border ${
                    i === graph.branch.lineage_path.length - 1
                      ? "bg-[#1a1a1a] border-[#2a2a2a] text-[#a0a0a0]"
                      : "bg-[#222222]/50 border-surface-600/50 text-[#555555]"
                  }`}>
                    {name}
                  </span>
                  {i < graph.branch.lineage_path.length - 1 && (
                    <ArrowRight size={8} className="text-[#444444]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Composition Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#222222]">
              <span className="block text-[8px] text-[#666666] font-bold uppercase">Inherited</span>
              <span className="text-lg font-semibold text-[#888888] leading-none">
                {graph.metadata.inherited_count}
              </span>
            </div>
            <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#2a2a2a]">
              <span className="block text-[8px] text-[#a0a0a0]/70 font-bold uppercase">Local</span>
              <span className="text-lg font-semibold text-[#a0a0a0] leading-none">
                {graph.metadata.local_count}
              </span>
            </div>
          </div>

          {/* Fork Origin Preview */}
          {graph.fork_origin && (
            <div className="p-2 bg-[#1a1a1a] border border-[#e0e0e0] rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <Waypoints size={10} className="text-[#a0a0a0]" />
                <span className="text-[9px] font-bold text-[#e0e0e0] uppercase tracking-wider">
                  Fork Origin
                </span>
              </div>
              <p className="text-[10px] text-[#a0a0a0] line-clamp-2 italic">
                {graph.nodes.find(n => n.id === graph.fork_origin?.node_id)?.content || "Divergence point"}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[8px] text-[#666666]">
                <span>Seq {graph.fork_origin.node_sequence}</span>
                <span>•</span>
                <span className="truncate">ID {graph.fork_origin.node_id.slice(0, 8)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

