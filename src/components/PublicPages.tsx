import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle2, Shield, Cookie, FileText, Mail, Building2 } from 'lucide-react';
import { AppView } from '../types.ts';
import { openCookieSettings } from '../services/consentService.ts';
import { PremiumButton } from './ui/PremiumButton.tsx';

interface PublicPageProps {
  view: 'privacy' | 'cookies' | 'terms' | 'about' | 'contact';
  onNavigate: (view: AppView) => void;
}

export const PublicPages: React.FC<PublicPageProps> = ({ view, onNavigate }) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    const cleanName = contactName.trim();
    const cleanEmail = contactEmail.trim();
    const cleanMessage = contactMessage.trim();
    if (!cleanName || !cleanEmail || !cleanMessage) {
      setContactError('Please complete your name, email address, and message.');
      return;
    }

    setContactSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          company: contactCompany.trim(),
          message: cleanMessage,
          source: 'contact_page',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setContactError(data?.error || 'Unable to submit your message right now. Please try again later.');
        return;
      }
      setContactSubmitted(true);
    } catch {
      setContactError('Network error while sending your message. Please check your connection and try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 flex flex-col">
      {/* Top Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="w-6 h-6 rounded-md bg-white text-[#050505] flex items-center justify-center font-black text-xs">
            AW
          </span>
          <span>AI WORKFORCE</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="px-3.5 py-1.5 rounded-lg bg-[#111111] border border-white/10 hover:border-white/25 text-xs font-medium text-[#A1A1AA] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Content Container */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16 sm:py-24">
        {view === 'privacy' && (
          <article className="space-y-8 text-sm text-[#A1A1AA] leading-relaxed">
            <div className="space-y-3 border-b border-white/10 pb-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#71717A]">
                LEGAL DOCUMENTATION
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white">Privacy Policy</h1>
              <p className="text-xs font-mono text-[#71717A]">
                Last Updated: November 2026 · Operator: AI Workforce
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Introduction and Scope</h2>
              <p>
                This Privacy Policy explains how AI Workforce ("we", "us") collects, uses, stores, and processes information when you visit our website, use Alpha Experience Mode, or operate an authenticated AI Workforce account.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Information Collected</h2>
              <p>
                We distinguish between four categories of data: (a) Registered Customer Account Information, (b) Tenant Business & Company Brain Information, (c) End-Visitor / Customer Conversation Information, and (d) Temporary Anonymous Experience Mode Information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Account Information</h2>
              <p>
                When you sign in to AI Workforce using Google Authentication, we receive your name, email address, and authentication identifier (UID) from Firebase Authentication to provision and secure your workspace.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Business and Company Brain Information</h2>
              <p>
                Authenticated tenants may supply business descriptions, product catalogs, pricing rules, policies, and sales playbooks ("Company Brain") stored in Google Cloud Firestore to ground Alpha's responses.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Customer Conversation Information</h2>
              <p>
                When website visitors interact with an embedded AI Workforce widget, conversation messages, extracted lead details, and qualification scores are stored in Firestore under the respective tenant's isolated workspace.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">6. Guest Experience Mode Information</h2>
              <p>
                Alpha Experience Mode (`/experience`) operates without sign-in. Business details and conversation messages entered during a guest session are stored temporarily in server memory for up to 1 hour (or until you end/restart the demo) and are automatically purged. Guest Experience Mode data is never merged into permanent customer accounts.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">7. Technical and Diagnostic Information</h2>
              <p>
                Our servers process standard HTTP request metadata (such as IP addresses for rate limiting and abuse prevention, request correlation IDs, and error logs) to maintain service reliability and security.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">8. Purposes of Processing</h2>
              <p>
                We process information to provide conversational AI sales management, ground responses in verified business data, qualify inbound leads, prevent abuse, and maintain platform security.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">9. AI Processing and Gemini Usage</h2>
              <p>
                AI Workforce uses Google's Gemini API (`@google/genai`) on our backend servers to process onboarding interviews, classify intent, and generate grounded responses. Conversation inputs and relevant Company Brain context are transmitted to Google's Gemini API for inference.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">10. Data Storage and Security</h2>
              <p>
                Authenticated tenant data is stored in Google Cloud Firestore with tenant-isolated security rules. Guest Experience Mode sessions are protected by cryptographically random session identifiers and SHA-256 hashed capability tokens.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">11. Third-Party Service Providers</h2>
              <p>
                We rely on Google Cloud Platform, Firebase (Authentication & Firestore), and the Google Gemini API to operate the platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">12. Data Retention and Deletion</h2>
              <p>
                Temporary Experience Mode sessions expire automatically after 1 hour or upon explicit termination. Authenticated tenants may edit or delete their Company Brain and inquiry records from their workspace, or request account deletion by contacting support.aiworkforce@gmail.com.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">13. Cookies and Similar Technologies</h2>
              <p>
                We use essential browser storage (`localStorage` and `sessionStorage`) for authentication state, theme preferences, cookie consent records, and temporary Experience Mode session tokens. See our Cookie Policy for details.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">14. User Rights and Requests</h2>
              <p>
                Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. Contact support.aiworkforce@gmail.com to submit a request.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">15. International Data Processing</h2>
              <p>
                Your information may be processed in data centers operated by Google Cloud and Firebase in regions where our infrastructure is hosted.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">16. Children's Privacy</h2>
              <p>
                AI Workforce is a B2B platform not intended for individuals under 18 years of age.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">17. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Last Updated" date above.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">18. Contact Information</h2>
              <p>
                For privacy inquiries, contact AI Workforce at support.aiworkforce@gmail.com.
              </p>
            </section>
          </article>
        )}

        {view === 'cookies' && (
          <article className="space-y-8 text-sm text-[#A1A1AA] leading-relaxed">
            <div className="space-y-3 border-b border-white/10 pb-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#71717A]">
                LEGAL DOCUMENTATION
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white">Cookie & Storage Policy</h1>
              <p className="text-xs font-mono text-[#71717A]">
                Last Updated: November 2026
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Essential Storage</h2>
              <p>
                AI Workforce uses essential browser storage (`localStorage` and `sessionStorage`) required for core application functionality, including Firebase Authentication session persistence, theme selection, and temporary Experience Mode session capability tokens (`aw_exp_session_id`, `aw_exp_session_token`).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Preference & Consent Storage</h2>
              <p>
                We store your cookie consent choices in `localStorage` so your preferences are respected across visits.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Managing Your Preferences</h2>
              <p>
                You can review or update your cookie and storage preferences at any time using the button below.
              </p>
              <div className="pt-2">
                <PremiumButton variant="primary" size="md" onClick={() => openCookieSettings()}>
                  Manage Cookie Preferences
                </PremiumButton>
              </div>
            </section>
          </article>
        )}

        {view === 'terms' && (
          <article className="space-y-8 text-sm text-[#A1A1AA] leading-relaxed">
            <div className="space-y-3 border-b border-white/10 pb-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#71717A]">
                LEGAL DOCUMENTATION
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white">Terms of Service</h1>
              <p className="text-xs font-mono text-[#71717A]">
                Last Updated: November 2026 · Operator: AI Workforce
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
              <p>
                By accessing or using AI Workforce, you agree to be bound by these Terms of Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Description of AI Workforce</h2>
              <p>
                AI Workforce provides conversational AI employee software, including Alpha (AI Sales Manager), Company Brain grounding, lead qualification, and public demonstration tools.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Account Eligibility & Security</h2>
              <p>
                You are responsible for maintaining the security of your authenticated account and any API or widget configurations associated with your workspace.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. AI-Generated Output Limitations & Human Oversight</h2>
              <p>
                AI-generated responses are probabilistic and should be reviewed by qualified human personnel before being relied upon for binding commercial quotes, legal commitments, or critical business decisions.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">5. Acceptable Use</h2>
              <p>
                You agree not to use AI Workforce for unlawful, deceptive, or abusive purposes, or to attempt to bypass rate limits, session isolation, or security controls.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">6. Governing Law & Contact</h2>
              <p>
                These Terms are governed by the laws of our operating jurisdiction. For questions, contact AI Workforce at support.aiworkforce@gmail.com.
              </p>
            </section>
          </article>
        )}

        {view === 'about' && (
          <article className="space-y-8 text-sm text-[#A1A1AA] leading-relaxed">
            <div className="space-y-3 border-b border-white/10 pb-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#71717A]">
                ABOUT AI WORKFORCE
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white">
                From Software You Use to Employees That Work.
              </h1>
            </div>

            <p className="text-base text-white leading-relaxed">
              AI Workforce builds specialized AI employees designed to handle real operational workflows alongside human teams—starting with Alpha, our AI Sales Manager.
            </p>

            <p>
              Traditional website chatbots frustrate visitors with rigid decision trees or ungrounded guesses. Alpha is built around a structured Company Brain: it learns your verified products, pricing, policies, and sales process, engages visitors naturally, qualifies opportunities, and prepares structured briefs for human review.
            </p>

            <div className="pt-4">
              <PremiumButton variant="primary" size="lg" onClick={() => onNavigate('experience')}>
                BUILD MY ALPHA DEMO
              </PremiumButton>
            </div>
          </article>
        )}

        {view === 'contact' && (
          <div className="space-y-8">
            <div className="space-y-3 border-b border-white/10 pb-8">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#71717A]">
                CONTACT US
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white">Get in Touch</h1>
              <p className="text-sm text-[#A1A1AA]">
                Have questions about deploying Alpha for your business? Send us a message or reach out directly.
              </p>
            </div>

            {contactSubmitted ? (
              <div className="p-8 rounded-2xl bg-[#111111] border border-white/15 text-center space-y-4">
                <CheckCircle2 className="w-10 h-10 text-white mx-auto" />
                <h2 className="text-xl font-bold text-white">Message Received</h2>
                <p className="text-xs text-[#A1A1AA]">
                  Thank you, {contactName}. We have recorded your inquiry and will follow up at {contactEmail}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setContactSubmitted(false);
                    setContactMessage('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#171717] border border-white/10 text-xs font-semibold text-white cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 bg-[#111111] border border-white/10 p-6 sm:p-8 rounded-2xl">
                {contactError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200">
                    {contactError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full bg-[#050505] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full bg-[#050505] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-[#050505] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1.5">
                    How can we help? *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tell us about your business and what you're looking to automate..."
                    className="w-full bg-[#050505] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="pt-2">
                  <PremiumButton type="submit" variant="primary" size="lg" disabled={contactSubmitting} rightIcon={<Send className="w-4 h-4" />}>
                    {contactSubmitting ? 'Sending...' : 'Send Message'}
                  </PremiumButton>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
