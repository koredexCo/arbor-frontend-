import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function PrivacyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Privacy Policy · Arbor";
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Sticky nav */}
      <nav className="border-b border-[#1f1f1f]/50 bg-[#0a0a0a]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 group"
          >
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
        <p className="text-[#555555] text-sm mb-2">
          Product: Arbor &nbsp;·&nbsp; Company: Koredex &nbsp;·&nbsp; Last Updated: June 8, 2025
        </p>
        <p className="text-[#555555] text-sm mb-10">
          Website:{" "}
          <a href="https://arbor.koredex.com" className="text-[#888888] hover:text-white transition-colors">
            arbor.koredex.com
          </a>
        </p>

        {/* 1 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
          <p className="text-[#888888] leading-relaxed">
            Koredex ("we," "us," or "our") operates Arbor, an AI-powered workspace platform available at
            arbor.koredex.com. This Privacy Policy explains what personal data we collect, why we collect it, how we
            use and protect it, and your rights regarding that data.
          </p>
          <p className="text-[#888888] leading-relaxed mt-3">
            By using Arbor, you agree to the practices described in this policy.
          </p>
        </section>

        {/* 2 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">2. Data We Collect</h2>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">2.1 Personal &amp; Identifying Information</h3>
          <p className="text-[#888888] leading-relaxed mb-2">
            When you register or sign in — including via OAuth providers like Google or GitHub — we collect:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[#888888] mb-4">
            <li>Full name</li>
            <li>Email address</li>
            <li>Avatar / profile picture URL</li>
          </ul>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">2.2 User Content &amp; Application Data</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="py-2 pr-4 text-[#555555] font-medium w-1/3">Data Type</th>
                  <th className="py-2 text-[#555555] font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-[#888888]">
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 pr-4 text-[#aaaaaa]">Conversation History</td>
                  <td className="py-2.5">Your chat messages, user prompts, system prompts, and AI-generated responses</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 pr-4 text-[#aaaaaa]">Memory &amp; Summaries</td>
                  <td className="py-2.5">Automatically generated summaries, key facts, decisions, and timeline extracts</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 pr-4 text-[#aaaaaa]">Vector Embeddings</td>
                  <td className="py-2.5">Mathematical representations of your messages used for semantic search</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 pr-4 text-[#aaaaaa]">Workspace Data</td>
                  <td className="py-2.5">Project names, descriptions, and custom shared contexts ("trees") you upload</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#aaaaaa]">Media Generation</td>
                  <td className="py-2.5">Text prompts for image/video generation and the resulting media URLs</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">2.3 User Settings &amp; API Credentials</h3>
          <ul className="list-disc pl-6 space-y-2 text-[#888888] mb-4">
            <li><span className="text-[#aaaaaa]">Platform preferences</span> — your default AI models, API modes, and storage location choices (cloud, local, or self-hosted)</li>
            <li><span className="text-[#aaaaaa]">Third-party API keys (BYOK)</span> — if you choose "Bring Your Own Key," your API credentials are stored in encrypted form</li>
          </ul>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">2.4 Telemetry, Usage &amp; Device Information</h3>
          <ul className="list-disc pl-6 space-y-2 text-[#888888] mb-4">
            <li><span className="text-[#aaaaaa]">API usage metrics</span> — which AI models you use, number of requests, and token consumption</li>
            <li><span className="text-[#aaaaaa]">Audit logs</span> — a record of actions performed within workspaces and projects</li>
            <li><span className="text-[#aaaaaa]">Timestamps</span> — when you signed up, accepted our Terms, created messages, and other activity timestamps</li>
          </ul>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">2.5 Collaboration &amp; Network Data</h3>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li><span className="text-[#aaaaaa]">Team structures</span> — who you invite to workspaces/projects and their assigned roles (owner, admin, member, viewer)</li>
            <li><span className="text-[#aaaaaa]">Referral data</span> — if you join the referral program: your contact details, referral codes, and signups attributed to your code</li>
          </ul>
        </section>

        {/* 3 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Data</h2>
          <p className="text-[#888888] leading-relaxed mb-3">We use the data we collect to:</p>
          <ol className="list-decimal pl-6 space-y-2 text-[#888888]">
            <li><span className="text-[#aaaaaa]">Provide the Service</span> — authenticate you, store your conversations and workspaces, and deliver AI-powered responses</li>
            <li><span className="text-[#aaaaaa]">Enable memory &amp; search</span> — generate summaries and vector embeddings so you can semantically search your own history</li>
            <li><span className="text-[#aaaaaa]">Facilitate collaboration</span> — manage workspace members, roles, and permissions</li>
            <li><span className="text-[#aaaaaa]">Operate the referral program</span> — track referrals and calculate commissions accurately</li>
            <li><span className="text-[#aaaaaa]">Improve reliability</span> — monitor API usage, diagnose issues, and maintain platform health</li>
            <li><span className="text-[#aaaaaa]">Comply with legal obligations</span> — retain records as required by applicable law</li>
            <li><span className="text-[#aaaaaa]">Communicate with you</span> — send product updates, security notices, and support responses</li>
          </ol>

          <div className="border border-[#2a2a2a] bg-[#111111] rounded-xl p-4 mt-5">
            <p className="text-[#888888] leading-relaxed">
              <span className="text-white font-medium">AI Model Training:</span> We have not finalized our policy on
              using your data for AI model training. Until a clear, published policy exists, your conversation data
              and prompts will not knowingly be used to train or fine-tune AI models without explicit prior notice.
              When we finalize this policy, we will notify you via email and in-app notice and give you a meaningful
              choice (opt-in or opt-out) before any such use begins.
            </p>
          </div>
        </section>

        {/* 4 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing &amp; Third-Party Subprocessors</h2>
          <p className="text-[#888888] leading-relaxed mb-4">
            We do not sell your personal data. We share data only as described below.
          </p>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">4.1 Third-Party AI/LLM Providers</h3>
          <p className="text-[#888888] leading-relaxed mb-4">
            To generate AI responses, your prompts and conversation context are transmitted to external large language
            model providers (e.g., Anthropic, OpenAI, and others). These providers process your data under their own
            privacy policies and terms of service.
          </p>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">4.2 Vector Database Providers</h3>
          <p className="text-[#888888] leading-relaxed mb-4">
            Your message embeddings are stored in a third-party vector database to power semantic search.
          </p>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">4.3 Infrastructure &amp; Hosting</h3>
          <p className="text-[#888888] leading-relaxed mb-4">
            We use cloud infrastructure providers (e.g., Supabase for authentication and database) to store and
            process your data securely.
          </p>

          <h3 className="text-base font-semibold text-[#cccccc] mb-2">4.4 Legal Requirements</h3>
          <p className="text-[#888888] leading-relaxed">
            We may disclose data if required to do so by law, court order, or government authority, or to protect the
            rights, property, or safety of Koredex, our users, or the public.
          </p>
          <p className="text-[#888888] leading-relaxed mt-2">
            A full list of subprocessors is available on request at{" "}
            <a href="mailto:support@koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
              support@koredex.com
            </a>.
          </p>
        </section>

        {/* 5 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="py-2 pr-4 text-[#555555] font-medium w-1/2">Data Type</th>
                  <th className="py-2 text-[#555555] font-medium">Retention Period</th>
                </tr>
              </thead>
              <tbody className="text-[#888888]">
                {[
                  ["Account profile", "Until account deletion + up to 30 days for backup purge"],
                  ["Conversation history & memory", "Until account deletion or manual deletion by user"],
                  ["Vector embeddings", "Deleted when the associated messages are deleted"],
                  ["API usage logs", "12 months rolling"],
                  ["Audit logs", "24 months or as required by law"],
                  ["Referral data", "Duration of referral program participation + 12 months"],
                  ["Encrypted API keys (BYOK)", "Deleted immediately upon removal by user or account deletion"],
                ].map(([type, period], i) => (
                  <tr key={i} className="border-b border-[#1a1a1a] last:border-0">
                    <td className="py-2.5 pr-4 text-[#aaaaaa]">{type}</td>
                    <td className="py-2.5">{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#888888] leading-relaxed mt-2">
            When you <span className="text-white">delete your account</span>, we will delete your profile,
            conversations, memory summaries, workspace data, and vector embeddings within 30 days; purge encrypted
            API keys immediately; and retain only anonymized/aggregated statistics or legally required records.
          </p>
        </section>

        {/* 6 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">6. Data Security</h2>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li><span className="text-[#aaaaaa]">Encryption in transit</span> — all data is transmitted over TLS/HTTPS</li>
            <li><span className="text-[#aaaaaa]">Encryption at rest</span> — sensitive fields (including BYOK API keys) are encrypted at rest</li>
            <li><span className="text-[#aaaaaa]">Access controls</span> — strict role-based access; staff access to user data is limited and logged</li>
            <li><span className="text-[#aaaaaa]">Authentication</span> — OAuth-based login with industry-standard security practices</li>
          </ul>
          <p className="text-[#888888] leading-relaxed mt-3">
            No security system is impenetrable. If you become aware of a security vulnerability, please report it to{" "}
            <a href="mailto:support@koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
              support@koredex.com
            </a>.
          </p>
        </section>

        {/* 7 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">7. Cookies &amp; Tracking</h2>
          <p className="text-[#888888] leading-relaxed mb-2">We use cookies and similar technologies to:</p>
          <ul className="list-disc pl-6 space-y-2 text-[#888888] mb-3">
            <li>Maintain your login session</li>
            <li>Remember your preferences</li>
            <li>Collect basic analytics on platform usage</li>
          </ul>
          <p className="text-[#888888] leading-relaxed">
            You can control cookies through your browser settings. Disabling certain cookies may affect your ability
            to use some features of the Service. We do not currently use third-party advertising cookies or sell
            browsing data to advertisers.
          </p>
        </section>

        {/* 8 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
          <p className="text-[#888888] leading-relaxed">
            Arbor is not directed at children under the age of 16. We do not knowingly collect personal data from
            children. If you believe a child under 16 has provided us with personal data, please contact us at{" "}
            <a href="mailto:support@koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
              support@koredex.com
            </a>{" "}
            and we will delete it promptly.
          </p>
        </section>

        {/* 9 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">9. Your Rights</h2>
          <p className="text-[#888888] leading-relaxed mb-3">
            Depending on your location, you may have the following rights regarding your personal data:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="py-2 pr-4 text-[#555555] font-medium w-1/4">Right</th>
                  <th className="py-2 text-[#555555] font-medium">What It Means</th>
                </tr>
              </thead>
              <tbody className="text-[#888888]">
                {[
                  ["Access", "Request a copy of the personal data we hold about you"],
                  ["Correction", "Ask us to correct inaccurate or incomplete data"],
                  ["Deletion", "Request deletion of your data (\"right to be forgotten\")"],
                  ["Portability", "Request your data in a machine-readable format"],
                  ["Restriction", "Ask us to limit how we process your data"],
                  ["Objection", "Object to processing based on legitimate interests"],
                  ["Withdraw consent", "Where processing is consent-based, withdraw consent at any time"],
                ].map(([right, meaning], i) => (
                  <tr key={i} className="border-b border-[#1a1a1a] last:border-0">
                    <td className="py-2.5 pr-4 text-[#aaaaaa] font-medium">{right}</td>
                    <td className="py-2.5">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#888888] leading-relaxed mt-3">
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:support@koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
              support@koredex.com
            </a>. We will respond within 30 days.
          </p>
        </section>

        {/* 10 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">10. International Data Transfers</h2>
          <p className="text-[#888888] leading-relaxed">
            If you are located outside the country where Koredex is based, your data may be transferred to and
            processed in a different jurisdiction. We take reasonable steps to ensure that such transfers comply with
            applicable data protection laws.
          </p>
        </section>

        {/* 11 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
          <p className="text-[#888888] leading-relaxed mb-2">We may update this Privacy Policy from time to time. When we do, we will:</p>
          <ul className="list-disc pl-6 space-y-2 text-[#888888]">
            <li>Update the "Last Updated" date at the top of this page</li>
            <li>Notify you via email or in-app notice for material changes</li>
            <li>Where required by law, seek your consent before the changes take effect</li>
          </ul>
        </section>

        {/* 12 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">12. Contact Us</h2>
          <p className="text-[#888888] leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out:
          </p>
          <div className="mt-3 text-[#888888]">
            <p className="font-medium text-white">Koredex — Arbor Privacy</p>
            <p>
              Email:{" "}
              <a href="mailto:support@koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
                support@koredex.com
              </a>
            </p>
            <p>
              Website:{" "}
              <a href="https://arbor.koredex.com" className="text-white underline hover:text-[#a0a0a0] transition-colors">
                arbor.koredex.com
              </a>
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-[#444444] text-sm border-t border-[#1f1f1f]/50">
        <span>Arbor by Koredex</span>
        {" · "}
        <a href="/privacy" className="hover:text-[#888888] transition-colors">Privacy</a>
        {" · "}
        <a href="/terms" className="hover:text-[#888888] transition-colors">Terms</a>
        {" · "}
        <a href="mailto:support@koredex.com" className="hover:text-[#888888] transition-colors">Contact</a>
      </footer>
    </div>
  );
}
