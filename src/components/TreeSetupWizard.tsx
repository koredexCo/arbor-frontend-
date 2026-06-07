import { useState } from "react";
import { GitBranch, Sparkles, Target, Users, ArrowRight, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onComplete: (data: any) => void;
}

export function TreeSetupWizard({ onClose, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    members: ""
  });

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="fixed inset-0 bg-white backdrop- z-50 flex items-center justify-center p-6">
      <div className="bg-white border border-[#e8e8e8] rounded w-full max-w-lg overflow-hidden shadow-md animate-scale-in">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#e8e8e8] flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[#52504b]">
               <GitBranch size={16} />
             </div>
             <h2 className="text-lg font-bold text-[#0a0a0a] uppercase tracking-wider">New Project Tree</h2>
          </div>
          <button onClick={onClose} className="text-[#52504b] hover:text-[#0a0a0a] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <label className="text-[10px] font-black text-[#52504b] uppercase tracking-widest mb-2 block">Project Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. AI Strategy 2026"
                  className="w-full bg-white border border-[#e8e8e8] rounded px-4 py-3 text-[#0a0a0a] outline-none focus:border-[#e8e8e8] transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <p className="text-xs text-[#52504b] mb-8 leading-relaxed">
                Give your project a clear name. This will be the root of your shared conversation tree.
              </p>
              <button 
                onClick={nextStep}
                disabled={!formData.name}
                className="w-full btn-primary flex items-center justify-center gap-2 group"
              >
                Define Mission <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <label className="text-[10px] font-black text-[#52504b] uppercase tracking-widest mb-2 block">Global Mission / Goal</label>
                <textarea 
                  autoFocus
                  placeholder="What is the shared objective of this tree?"
                  className="w-full bg-white border border-[#e8e8e8] rounded px-4 py-3 text-[#0a0a0a] outline-none focus:border-[#e8e8e8] transition-all min-h-[120px] resize-none"
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                />
              </div>
              <p className="text-xs text-[#52504b] mb-8 leading-relaxed">
                This mission will be injected as <strong>Tree Shared Context</strong> for all branches in this project.
              </p>
              <button 
                onClick={nextStep}
                disabled={!formData.goal}
                className="w-full btn-primary flex items-center justify-center gap-2 group"
              >
                Add Team <Users size={16} />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in text-center py-4">
              <div className="w-16 h-16 rounded bg-white flex items-center justify-center text-[#52504b] mx-auto mb-6">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#0a0a0a] mb-2">Ready to Branch!</h3>
              <p className="text-sm text-[#52504b] mb-8">
                Your team project is initialized. Members can now create isolated branches that inherit your project goal.
              </p>
              <button 
                onClick={() => onComplete(formData)}
                className="w-full btn-primary"
              >
                Launch Project Tree
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-8 pb-8">
          <div className="h-1 bg-white rounded overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
