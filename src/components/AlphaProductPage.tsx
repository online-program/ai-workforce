import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ShieldCheck,
  Brain,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Lock,
  Zap,
  Layers,
  ChevronRight,
  User,
  Bot,
} from 'lucide-react';
import { Logo } from './Logo.tsx';
import { ContactFooter } from './ContactFooter.tsx';
import { ThemeToggle } from '../context/ThemeContext.tsx';
import { AiOrbCanvas } from './ui/AiOrbCanvas.tsx';
import { AppView } from '../types.ts';

interface AlphaProductPageProps {
  onEnterExperience: () => void;
  onNavigate: (view: AppView) => void;
}

export const AlphaProductPage: React.FC<AlphaProductPageProps> = ({
  onEnterExperience,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'brain' | 'qualification' | 'handoff'>('brain');

  // SoftwareApplication & Product JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Alpha AI Sales Manager',
    'applicationCategory': 'BusinessApplication, SalesApplication',
    'operatingSystem': 'All (Web Embed)',
    'url': 'https://aiworkforce.ai.studio/alpha',
    'description': 'Alpha is a 24/7 conversational AI Sales Manager grounded in your verified Company Brain. It engages website visitors, answers commercial questions, qualifies buyer intent, and stages draft proposals for human review.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock',
    },
    'featureList': [
      '24/7 Inbound Website Visitor Engagement',
      'Verified Company Brain Grounding',
      'Deterministic Zero-Hallucination Guardrails',
      'HOT, WARM, COLD Intent Scoring',
      'Automated Lead Qualification',
      'Proposal Staging with 1-Click Human Approval',
      'Lightweight 1-Line Embed Script',
    ],
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black antialiased">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('landing');
            }}
            className="flex items-center gap-2.5 text-white whitespace-nowrap shrink-0"
          >
            <Logo size="sm" showText={true} inverted={true} />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-300">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => onNavigate('alpha')}
              className="text-white font-bold cursor-pointer"
            >
              Alpha Sales Manager
            </button>
            <button
              type="button"
              onClick={() => onNavigate('blog')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Knowledge Hub
            </button>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />
            <button
              type="button"
              onClick={onEnterExperience}
              className="px-4 py-2 text-xs font-bold rounded-lg text-black bg-white hover:bg-zinc-200 transition-all cursor-pointer shadow-md"
            >
              EXPERIENCE ALPHA
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-44 sm:pb-28 bg-[#050505] overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium tracking-widest text-zinc-300 uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>FLAGSHIP PRODUCT · AI SALES MANAGER</span>
          </div>

          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto relative mb-6">
            <AiOrbCanvas theme="alpha" className="w-full h-full" interactive={true} intensity={1.2} />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight max-w-4xl mx-auto text-balance">
            Alpha — Your 24/7 Autonomous AI Sales Manager
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto text-pretty">
            Alpha engages website visitors, answers complex commercial questions from verified Company Brain rules, qualifies lead readiness, and stages draft proposals for human review.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onEnterExperience}
              className="px-8 py-4 text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all rounded-xl shadow-xl cursor-pointer flex items-center gap-2"
            >
              <span>TEST ALPHA FOR YOUR BUSINESS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 border-t border-white/10 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-12 text-left">
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-2">
              CORE CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Designed for commercial precision.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-7 rounded-2xl bg-[#050505] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Company Brain 2.0</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Grounded strictly in your business rules, catalog pricing, service boundaries, and approved FAQs. Zero unverified promises.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#050505] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Intent Scoring Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Calculates objective buyer readiness (HOT, WARM, COLD) based on timeline urgency, budget fit, and decision authority.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#050505] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Human Oversight</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                High-intent proposals are staged in your workspace queue for 1-click review and approval before dispatching to prospects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Compatibility */}
      <section className="py-20 border-t border-white/10 bg-[#050505]">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Embeds on any website in under 2 minutes.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mb-8 max-w-xl mx-auto">
            Copy a single script line before your closing body tag. Fully compatible with Shopify, WordPress, Webflow, Framer, React, and custom HTML.
          </p>
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-white/10 text-left font-mono text-xs text-emerald-400 overflow-x-auto">
            <code>
              &lt;script src=&quot;https://aiworkforce.ai.studio/widget.js&quot; data-widget-id=&quot;your-widget-id&quot; async&gt;&lt;/script&gt;
            </code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050505] py-14 px-4 sm:px-8 text-left">
        <ContactFooter isPublicLanding={true} />
      </footer>
    </div>
  );
};
