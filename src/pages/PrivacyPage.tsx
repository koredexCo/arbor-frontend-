import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch } from "lucide-react";

export function PrivacyPage() {
  const navigate = useNavigate();
  useEffect(() => { document.title = "Privacy Policy · Arbor"; }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Minimal nav */}
      <nav className="border-b border-[#1f1f1f]/50 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 group">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src="/arbor.svg" alt="Arbor Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-[#888888] group-hover:text-white transition-colors">
              Arbor
            </span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 text-[#c0c0c0]">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-[#555555] text-sm mb-10">
          Last updated: May 2026 · A Koredex product
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">What we collect</h2>
          <p className="mb-3 text-[#888888]">We collect the minimum data necessary to provide the service:</p>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li>Your email address and name when you sign up</li>
            <li>Conversation content and branch data you create</li>
            <li>Usage statistics (message counts, models used)</li>
            <li>API keys you provide (stored encrypted, never readable by us)</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">What we don't do</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li>We do not sell your data to anyone</li>
            <li>We do not use your conversations to train AI models</li>
            <li>We do not share your data with third parties except the AI providers you choose to use</li>
            <li>We do not store your API keys in plaintext</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">How your data is stored</h2>
          <p className="text-[#888888]">
            Your data is stored in Supabase (PostgreSQL), hosted on secure cloud infrastructure.
            Conversation data is stored per your selected storage mode. API keys are encrypted using
            industry-standard Fernet encryption before storage.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">AI providers</h2>
          <p className="text-[#888888]">
            When you send messages, your content is sent to the AI provider you selected
            (OpenRouter, Anthropic, OpenAI, Google). Each provider has their own privacy policy.
            If you use your own API key (BYOK), you are billed directly by the provider and
            subject to their terms.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Your rights</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li>You can delete your account and all data at any time from Settings → Account</li>
            <li>You can export your conversations (coming soon)</li>
            <li>You can contact us to request data deletion: hello@koredex.com</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
          <p className="text-[#888888]">
            Questions about privacy? Email us at{" "}
            <a href="mailto:hello@koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
              hello@koredex.com
            </a>
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-[#444444] text-sm border-t border-[#1f1f1f]/50">
        <span>Arbor by Koredex</span>
        {' · '}
        <a href="/privacy" className="hover:text-[#888888] transition-colors">Privacy</a>
        {' · '}
        <a href="/terms" className="hover:text-[#888888] transition-colors">Terms</a>
        {' · '}
        <a href="mailto:hello@koredex.com" className="hover:text-[#888888] transition-colors">Contact</a>
      </footer>
    </div>
  );
}
