import { useState, useEffect } from "react";
import { Info, X, GitBranch } from "lucide-react";

interface Props {
  onComplete: () => void;
}

export function OnboardingOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("cb_onboarding_complete");
    if (!hasSeen) {
      // Delay slightly so the UI can render first
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (step === 1) {
      complete();
    } else {
      setStep(s => s + 1);
    }
  };

  const complete = () => {
    localStorage.setItem("cb_onboarding_complete", "true");
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Dimmed background that blocks clicks except on the highlighted element */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-500" />
      
      <div className="relative z-50 glass-card p-6 w-full max-w-md pointer-events-auto animate-scale-up shadow-2xl border-[#2a2a2a]">
        <button onClick={complete} className="absolute top-4 right-4 text-[#555555] hover:text-white">
          <X size={16} />
        </button>

        {step === 0 && (
          <div className="text-center">
             <div className="w-12 h-12 bg-[#1a1a1a] text-[#a0a0a0] rounded-full flex items-center justify-center mx-auto mb-4">
               <GitBranch size={24} />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">Welcome to Arbor</h2>
             <p className="text-sm text-[#888888] mb-6 leading-relaxed">
               Unlike standard chat interfaces, here you can <strong>branch</strong> the conversation at any point. 
               Explore different ideas without losing your original context.
             </p>
             <button onClick={handleNext} className="btn-primary w-full py-3">
               Show me how
             </button>
          </div>
        )}

        {step === 1 && (
          <div className="text-center">
             <div className="w-12 h-12 bg-white text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
               <Info size={24} />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">How to Branch</h2>
             <p className="text-sm text-[#888888] mb-6 leading-relaxed">
               Hover over any message in the chat and click the <strong>Branch</strong> icon.
               A new timeline will be created starting from that exact point.
             </p>
             <button onClick={handleNext} className="btn-primary w-full py-3 bg-white hover:bg-white">
               Got it, let's go!
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
