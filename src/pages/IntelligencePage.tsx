import React, { useState } from "react";
import {
  Brain,
  Cpu,
  Layers,
  Sparkles,
  GitCompare,
  Network,
  CheckCircle2,
  Activity,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";
import { FeatureUnavailableBadge } from "../components/common/FeatureUnavailableBadge";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

export const IntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"ROUTER" | "COMPARE" | "CODEBASE" | "ARBITER">("ROUTER");

  const modelProfiles = [
    {
      id: "anthropic/claude-3.5-sonnet",
      provider: "Anthropic / OpenRouter",
      context: "200k tokens",
      role: "High Reasoning & Architecture",
      status: "HEALTHY",
      costInput: "$3.00/M",
      costOutput: "$15.00/M",
    },
    {
      id: "google/gemini-2.5-pro",
      provider: "Google Gemini",
      context: "1M tokens",
      role: "Deep Code Analysis & Multimodal",
      status: "HEALTHY",
      costInput: "$1.25/M",
      costOutput: "$5.00/M",
    },
    {
      id: "openai/gpt-4o",
      provider: "OpenAI",
      context: "128k tokens",
      role: "General Synthesis & Tool Use",
      status: "HEALTHY",
      costInput: "$2.50/M",
      costOutput: "$10.00/M",
    },
    {
      id: "meta/llama-3.1-70b-instruct",
      provider: "Groq / Local",
      context: "128k tokens",
      role: "Lightweight & Fast Filtering",
      status: "HEALTHY",
      costInput: "$0.59/M",
      costOutput: "$0.79/M",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-app-text" />
              Intelligence & Model Gateway
            </h1>
            <FeatureUnavailableBadge status="SEALED" label="Router Active" />
          </div>
          <p className="text-xs text-app-muted">
            Deterministic Cognitive Router, multi-model comparison, codebase AST topologies, and Truth Arbiter.
          </p>
        </div>

        <button
          onClick={() => navigate("/compare")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-card border border-app-border text-xs font-medium text-app-text hover:bg-app-hover transition-colors"
        >
          <GitCompare className="w-3.5 h-3.5" />
          Open Comparison Studio
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-app-border text-xs">
        {[
          { id: "ROUTER", label: "Model Profiles & Gateway" },
          { id: "COMPARE", label: "Multi-Model Evaluation" },
          { id: "CODEBASE", label: "Codebase Graph & Impact" },
          { id: "ARBITER", label: "Truth Arbiter & Verification" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-3 py-2 font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-app-text text-app-text font-semibold"
                : "border-transparent text-app-muted hover:text-app-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "ROUTER" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelProfiles.map((m) => (
              <div
                key={m.id}
                className="p-4 bg-app-card border border-app-border rounded-xl shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Cpu className="w-4 h-4 text-app-muted shrink-0" />
                    <span className="font-semibold text-xs text-app-text truncate">{m.id}</span>
                  </div>
                  <FeatureUnavailableBadge status="LIVE" label={m.status} />
                </div>
                <div className="text-xs text-app-dim">{m.role}</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-app-subtle text-[11px] font-mono text-app-muted">
                  <div>Context: {m.context}</div>
                  <div>Provider: {m.provider}</div>
                  <div>In: {m.costInput}</div>
                  <div>Out: {m.costOutput}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "COMPARE" && (
        <div className="p-8 text-center bg-app-card border border-app-border rounded-xl space-y-3">
          <GitCompare className="w-8 h-8 text-app-muted mx-auto" />
          <h3 className="text-sm font-semibold text-app-text">Multi-Model Comparison Studio</h3>
          <p className="text-xs text-app-muted max-w-md mx-auto">
            Dispatch identical prompts in parallel across configured LLMs with latency and token comparison.
          </p>
          <button
            onClick={() => navigate("/compare")}
            className="px-4 py-2 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90"
          >
            Launch Comparison Studio
          </button>
        </div>
      )}

      {activeTab === "CODEBASE" && (
        <div className="p-8 text-center bg-app-card border border-app-border rounded-xl space-y-3">
          <Network className="w-8 h-8 text-app-muted mx-auto" />
          <h3 className="text-sm font-semibold text-app-text">Codebase Dependency Topology</h3>
          <p className="text-xs text-app-muted max-w-md mx-auto">
            WebGL graph of codebase AST functions, classes, and cross-module impact analysis.
          </p>
          <button
            onClick={() => navigate("/ops/graph")}
            className="px-4 py-2 rounded-lg bg-app-accent text-app-inverted text-xs font-medium hover:opacity-90"
          >
            Open Topology Explorer (24k Nodes)
          </button>
        </div>
      )}

      {activeTab === "ARBITER" && (
        <div className="p-8 text-center bg-app-card border border-app-border rounded-xl space-y-3">
          <Shield className="w-8 h-8 text-app-muted mx-auto" />
          <h3 className="text-sm font-semibold text-app-text">Truth Arbiter & Verification Gates</h3>
          <p className="text-xs text-app-muted max-w-md mx-auto">
            Independent outcome verification ensuring claimed tool results match real physical files and processes.
          </p>
          <FeatureUnavailableBadge status="SEALED" label="Verification Engine Active" />
        </div>
      )}
    </div>
  );
};
