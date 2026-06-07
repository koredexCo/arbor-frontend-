import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Image as ImageIcon, Sparkles, Play, GitBranch } from "lucide-react";
import { CompareModal } from "./CompareModal";
import { getAccessToken } from "../services/api";
import { api } from "../services/api";
import type { Message, Model, UserSettings, StoredApiKey } from "../types";
import { AlertTriangle } from "lucide-react";

interface Props {
  sending: boolean;
  onSendMessage: (content: string) => void;
  onImageGenerated: (imageMessage: Message) => void;
  activeBranchId?: string | null;
  activeModelId?: string | null;
  onModelChange: (modelId: string) => void;
  messagesCount: number;
  availableModels?: Model[];
}

export function ChatInput({
  sending,
  onSendMessage,
  onImageGenerated,
  activeBranchId,
  activeModelId,
  onModelChange,
  messagesCount,
  availableModels = [],
}: Props) {
  const normalizedActiveModelId = activeModelId === "emini-flash" ? "gemini-flash" : activeModelId;
  const [input, setInput] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [storedKeys, setStoredKeys] = useState<StoredApiKey[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Close selector on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setModelSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch settings to determine BYOK state for model warnings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const [s, k] = await Promise.all([
          api.getSettings(token),
          api.listApiKeys(token),
        ]);
        setSettings(s);
        setStoredKeys(k);
      } catch (err) {
        console.error("[ChatInput] Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    onSendMessage(trimmed);
    setInput("");
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateImage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGeneratingImage) return;
    
    setIsGeneratingImage(true);
    try {
      let token = await getAccessToken();
      
      const imageUrl = await api.generateImage(token, trimmed, "openai", activeBranchId || undefined);

      const imageMessage: Message = {
        id: crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9),
        conversation_id: "",
        branch_id: activeBranchId || "",
        parent_id: null,
        role: "assistant",
        content: imageUrl,
        sequence: messagesCount + 1,
        is_pinned: false,
        metadata: { node_type: "image", prompt: trimmed },
        created_at: new Date().toISOString(),
      };
      onImageGenerated(imageMessage);

      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } catch (err) {
      console.error("[Chat] Failed to generate image:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
  };

  // Determine if there's a BYOK mismatch
  let byokWarning = null;
  if (settings?.api_mode === "byok" && normalizedActiveModelId) {
    const hasOpenRouterKey = storedKeys.some(k => k.provider === "openrouter");
    
    // Guess the required provider from the model ID
    let requiredDirectProvider = null;
    if (normalizedActiveModelId.includes("gemini")) requiredDirectProvider = "gemini";
    else if (normalizedActiveModelId.includes("claude")) requiredDirectProvider = "claude";
    else if (normalizedActiveModelId.includes("gpt")) requiredDirectProvider = "openai";
    else if (normalizedActiveModelId.includes("grok")) requiredDirectProvider = "grok";
    
    const hasDirectKey = requiredDirectProvider 
      ? storedKeys.some(k => k.provider === requiredDirectProvider)
      : false;

    // If they don't have the specific direct key, AND they don't have a fallback OpenRouter key
    if (!hasOpenRouterKey && !hasDirectKey) {
      const providerName = requiredDirectProvider 
        ? requiredDirectProvider.charAt(0).toUpperCase() + requiredDirectProvider.slice(1)
        : "OpenRouter";
        
      byokWarning = (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded border border-[#e8e8e8] animate-fade-in">
          <AlertTriangle size={12} />
          <span>
            You are using Your Own Keys (BYOK), but you don't have a {providerName} key stored. 
            Requests to {normalizedActiveModelId} may fail.
          </span>
        </div>
      );
    }
  }

  return (
    <>
      <div className="border-t border-[#141414] bg-white p-4 w-full">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {/* Main input row */}
          <div className="flex items-end gap-2 bg-white border border-[#e8e8e8] rounded px-4 py-3
                          focus-within:border-[#e8e8e8] transition-all duration-200">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={sending || isGeneratingImage}
              className="flex-1 bg-transparent text-[#0a0a0a] text-sm resize-none outline-none
                         placeholder:text-[#333333] min-h-[24px] max-h-[160px]
                         disabled:"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || isGeneratingImage}
              className="send-btn flex-shrink-0 ml-2"
            >
              {sending || isGeneratingImage ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-1">
            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setModelSelectorOpen(!modelSelectorOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-transparent
                           border border-[#e8e8e8] text-[10px] text-[#52504b]
                           hover:bg-white hover:text-[#52504b] hover:border-[#e8e8e8] transition-all"
              >
                <Sparkles size={10} />
                {availableModels.find(m => m.id === normalizedActiveModelId)?.name || normalizedActiveModelId || "Claude 3.5 Sonnet"}
              </button>

              {modelSelectorOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-52 bg-[#0d0d0d] border border-[#e8e8e8] rounded shadow-md overflow-hidden z-50 animate-scale-in">
                  <div className="p-2 border-b border-[#1a1a1a]">
                    <span className="text-[10px] font-semibold text-[#52504b] px-2 uppercase tracking-widest">Model</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setModelSelectorOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded text-[11px] transition-all
                          ${normalizedActiveModelId === model.id
                            ? "bg-white text-black font-medium"
                            : "text-[#52504b] hover:bg-white hover:text-[#0a0a0a]"}`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="input-toolbar-sep" />

            <button
              onClick={() => setCompareModalOpen(true)}
              title="Compare Models"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] text-[#52504b]
                         hover:text-[#52504b] hover:bg-white transition-all"
            >
              <GitBranch size={10} />
              Compare
            </button>

            <button
              onClick={handleGenerateImage}
              disabled={!input.trim() || isGeneratingImage}
              title="Generate Image"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] text-[#52504b]
                         hover:text-[#52504b] hover:bg-white transition-all disabled: disabled:cursor-not-allowed"
            >
              <ImageIcon size={10} />
              Image
            </button>

            <button
              onClick={() => setVideoModalOpen(true)}
              title="Generate Video"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] text-[#52504b]
                         hover:text-[#52504b] hover:bg-white transition-all"
            >
              <Play size={10} />
              Video
            </button>

            <span className="ml-auto text-[10px] text-[#2a2a2a]">⏎ send · ⇧⏎ newline</span>
          </div>

          {byokWarning}
        </div>
      </div>

      {/* Video coming soon modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 bg-white backdrop- flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded p-6 w-[320px] border border-[#e8e8e8] text-center animate-scale-in">
            <div className="w-12 h-12 rounded bg-white flex items-center justify-center mx-auto mb-4">
              <Play size={24} className="text-[#52504b]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Coming Soon</h3>
            <p className="text-sm text-[#52504b] mb-6">
              AI Video generation is currently in development and will be available in the next release.
            </p>
            <button onClick={() => setVideoModalOpen(false)} className="btn-primary w-full">
              Got it
            </button>
          </div>
        </div>
      )}

      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        branchId={activeBranchId || ""}
        onCompareComplete={() => {
          window.location.reload();
        }}
        availableModels={availableModels}
      />
    </>
  );
}
