import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch } from "lucide-react";

export function TermsPage() {
  const navigate = useNavigate();
  useEffect(() => { document.title = "Terms of Service · Arbor"; }, []);

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
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-[#555555] text-sm mb-10">
          Last updated: May 2026 · A Koredex product
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Acceptance</h2>
          <p className="text-[#888888]">
            By using this platform, you agree to these terms. If you don't agree, don't use the service.
            These terms may change — we'll notify users of significant changes.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">What you can do</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li>Use the platform for personal and commercial projects</li>
            <li>Invite team members to collaborate</li>
            <li>Use your own API keys from supported providers</li>
            <li>Export and own your conversation data</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">What you cannot do</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li>Use the platform for illegal activities</li>
            <li>Attempt to access other users' data</li>
            <li>Abuse the free tier to circumvent limits</li>
            <li>Resell access to the platform</li>
            <li>Use automated scripts to abuse the API</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Your content</h2>
          <p className="text-[#888888]">
            You own your conversations and data. We don't claim any rights to your content.
            You're responsible for what you input into AI models through our platform.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Service availability</h2>
          <p className="text-[#888888]">
            We aim for high availability but don't guarantee 100% uptime. We're a small team and the
            platform is in early access. We'll communicate downtime when possible.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Free tier limits</h2>
          <p className="text-[#888888]">
            Free tier includes platform API access up to 100 requests per day. Users who bring their own
            API keys (BYOK) have no platform limits. Limits may change with notice.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Limitation of liability</h2>
          <p className="text-[#888888]">
            The platform is provided as-is. We're not liable for decisions made based on AI outputs,
            data loss, or service interruptions. Always verify important information from AI.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
          <p className="text-[#888888]">
            Questions? Email{" "}
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
