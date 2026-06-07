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
    <div className="w-64 bg-[#0d0d0d] border-r border-[#e8e8e8] 
                    flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#e8e8e8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
              <TreePine size={14} className="text-[#0a0a0a]" />
            </div>
            <h3 className="text-sm font-semibold text-[#52504b] uppercase tracking-wider">
              Branches
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode(v => v === 'tree' ? 'list' : 'tree')}
              className={`p-1.5 rounded transition-all text-xs text-[#52504b] hover:text-[#0a0a0a] hover:bg-white border border-transparent`}
              title={viewMode === 'tree' ? "All Branches (List View)" : "Tree View"}
            >
              {viewMode === 'tree' ? <List size={14} /> : <TreePine size={14} />}
            </button>
            {branches.length >= 2 && (
              <button
                onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}
                className={`p-1.5 rounded transition-all text-xs ${
                  compareMode
                    ? "bg-white text-[#52504b] border border-[#e8e8e8]"
                    : "text-[#52504b] hover:text-[#0a0a0a] hover:bg-white"
                }`}
                title="Compare branches"
              >
                {compareMode ? <X size={14} /> : <GitCompareArrows size={14} />}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-[#52504b] mt-1.5">
          {compareMode
            ? `Select 2 branches to compare (${compareSelection.length}/2)`
            : `${branches.length} branch${branches.length !== 1 ? "es" : ""}`
          }
        </p>
      </div>

      {/* Compare Action Bar */}
      {compareMode && compareSelection.length === 2 && (
        <div className="p-3 border-b border-[#e8e8e8] bg-white">
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
                        ? "border-[#e8e8e8] bg-white"
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
                  className={`flex-1 text-left px-3 py-2.5 rounded transition-all duration-200 text-sm group
                    ${isActive && !compareMode
                      ? "bg-white text-[#0a0a0a] border-l-2 border-l-[#ffffff] border-y-transparent border-r-transparent rounded-l-none"
                      : isSelected
                      ? "bg-white text-[#52504b] border border-[#e8e8e8]"
                      : "text-[#52504b] hover:bg-white hover:text-[#e0e0e0] border border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Branch icon */}
                    <div className={`flex-shrink-0 ${isActive ? "text-[#52504b]" : isSelected ? "text-[#52504b]" : "text-[#52504b]"}`}>
                      <GitBranch size={14} />
                    </div>

                    {/* Branch name */}
                    <span className="truncate font-medium flex-1">
                      {branch.name}
                    </span>

                    {/* Active indicator */}
                    {isActive && !compareMode && (
                      <ChevronRight size={14} className="text-[#52504b] flex-shrink-0" />
                    )}
                  </div>
                </button>
                {/* PDF export — placed outside the branch button */}
                {isActive && !compareMode && (
                  <button
                    onClick={(e) => handleExportPDF(e, branch.id)}
                    disabled={isExporting}
                    className="flex-shrink-0 p-1.5 rounded hover:bg-white text-[#52504b] hover:text-[#0a0a0a] transition-colors"
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
                        ? "border-[#e8e8e8] bg-white"
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
                  className={`flex-1 text-left px-3 py-2.5 rounded transition-all duration-200 text-sm group
                    ${isActive && !compareMode
                      ? "bg-white text-[#0a0a0a] border-l-2 border-l-[#ffffff] border-y-transparent border-r-transparent rounded-l-none"
                      : isSelected
                      ? "bg-white text-[#52504b] border border-[#e8e8e8]"
                      : "text-[#52504b] hover:bg-white hover:text-[#e0e0e0] border border-transparent"
                    }`}
                  style={{ paddingLeft: `${(compareMode ? 0 : branch.depth * 16) + 12}px` }}
                >
                  <div className="flex items-center gap-2">
                    {/* Branch icon */}
                    <div className={`flex-shrink-0 ${isActive ? "text-[#52504b]" : isSelected ? "text-[#52504b]" : "text-[#52504b]"}`}>
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
                      <ChevronRight size={14} className="text-[#52504b] flex-shrink-0" />
                    )}
                  </div>

                  {/* Summary preview */}
                  {branch.summary && !compareMode && (
                    <p className={`text-xs mt-1 truncate
                      ${isActive ? "text-[#52504b]/60" : "text-[#52504b]"}`}
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
                          className={`w-1 h-1 rounded
                            ${isActive ? "bg-white" : "bg-white"}`}
                        />
                      ))}
                      <span className={`text-[10px] ml-1
                        ${isActive ? "text-[#52504b]/50" : "text-[#52504b]"}`}>
                        depth {branch.depth}
                      </span>
                    </div>
                  )}

                  {/* Origin preview */}
                  {branch.origin_preview && !compareMode && (
                    <p className={`text-[11px] mt-1 truncate italic
                      ${isActive ? "text-[#52504b]/60" : "text-[#52504b]"}`}
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
                    className="flex-shrink-0 p-1.5 rounded hover:bg-white text-[#52504b] hover:text-[#0a0a0a] transition-colors"
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
          <div className="text-center py-8 text-[#52504b]">
            <GitBranch size={24} className="mx-auto mb-2 " />
            <p className="text-xs">No branches yet</p>
          </div>
        )}
      </div>

      {/* Lineage Info Panel */}
      {activeBranch && graph && (
        <div className="p-4 bg-white border-t border-[#e8e8e8] space-y-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-[#52504b]" />
            <h4 className="text-[10px] font-bold text-[#52504b] uppercase tracking-widest">
              Cognitive Lineage
            </h4>
          </div>

          {/* Lineage Path */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-[#52504b] font-medium">Authoritative Path</span>
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              {graph.branch.lineage_path.map((name, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded border ${
                    i === graph.branch.lineage_path.length - 1
                      ? "bg-white border-[#e8e8e8] text-[#52504b]"
                      : "bg-white border-surface-600/50 text-[#52504b]"
                  }`}>
                    {name}
                  </span>
                  {i < graph.branch.lineage_path.length - 1 && (
                    <ArrowRight size={8} className="text-[#52504b]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Composition Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2 rounded border border-[#e8e8e8]">
              <span className="block text-[8px] text-[#666666] font-bold uppercase">Inherited</span>
              <span className="text-lg font-semibold text-[#52504b] leading-none">
                {graph.metadata.inherited_count}
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-[#e8e8e8]">
              <span className="block text-[8px] text-[#52504b]/70 font-bold uppercase">Local</span>
              <span className="text-lg font-semibold text-[#52504b] leading-none">
                {graph.metadata.local_count}
              </span>
            </div>
          </div>

          {/* Fork Origin Preview */}
          {graph.fork_origin && (
            <div className="p-2 bg-white border border-[#e0e0e0] rounded">
              <div className="flex items-center gap-1.5 mb-1">
                <Waypoints size={10} className="text-[#52504b]" />
                <span className="text-[9px] font-bold text-[#e0e0e0] uppercase tracking-wider">
                  Fork Origin
                </span>
              </div>
              <p className="text-[10px] text-[#52504b] line-clamp-2 italic">
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

