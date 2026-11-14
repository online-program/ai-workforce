import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  LineChart,
  Headphones,
  Settings,
  Flame,
  Menu,
  X,
  User,
  ChevronDown,
  Lock,
  Zap,
  Layers,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ThemeToggle } from '../context/ThemeContext.tsx';
import { ContactFooter } from './ContactFooter.tsx';
import { CustomerChatWidget } from './CustomerChatWidget.tsx';
import { WidgetLauncherButton } from './WidgetLauncherButton.tsx';
import { CompanyProfile, AppView } from '../types.ts';
import { Logo } from './Logo.tsx';
import { AlphaInteractiveDemo } from './ui/AlphaInteractiveDemo.tsx';
import { CompanyBrainArchitectureVisual } from './ui/CompanyBrainArchitectureVisual.tsx';
import { AiOrbCanvas, OrbTheme } from './ui/AiOrbCanvas.tsx';
import { Interactive3DObjects } from './ui/Interactive3DObjects.tsx';

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onExploreEmployees: () => void;
  onOpenAuthModal: () => void;
  onEnterExperience: () => void;
  onNavigate?: (view: AppView) => void;
  companyProfile?: CompanyProfile;
  userId?: string;
}

// AI Workforce official Company Profile for live website widget
const AI_WORKFORCE_PROFILE: CompanyProfile = {
  name: 'AI Workforce',
  industry: 'Conversational AI & Digital Employees',
  businessType: 'services',
  tone: 'Consultative, precise, natural, warm, and concise',
  businessRules:
    'Always answer customer questions first from Company Brain. Discover visitor requirements through natural consultative dialogue. Never hallucinate unverified pricing or capabilities.',
  products:
    'Alpha (Flagship Live) — 24/7 conversational AI Sales Manager that engages website visitors, answers commercial questions using Company Brain grounding, discovers business scope, qualifies buyer intent, and prepares draft proposals for 1-click human approval.\nOmega (Planned) — Autonomous account research and company enrichment.\nPulse (Planned) — Revenue conversion diagnostics and pipeline drop-off intelligence.',
  pricing:
    'Alpha is currently free during initial enterprise rollout with zero setup fees and full access to verified Company Brain grounding.',
  locations: 'Global / Cloud-Native',
  website: 'https://aiworkforce.ai.studio',
  faqData:
    'Q: What is Alpha? A: Alpha is a 24/7 conversational AI Sales Manager grounded in your verified Company Brain.\nQ: How does Alpha learn about my business? A: You configure your catalog, pricing, and operating rules in Company Brain in under 5 minutes.\nQ: Can Alpha replace my sales team? A: No, Alpha is a pro-human force multiplier that conducts 24/7 discovery so your team focuses on high-value closing.',
  offerings: [
    {
      id: 'alpha-flagship',
      name: 'Alpha — AI Sales Manager',
      description: '24/7 inbound AI Sales Manager with Company Brain grounding, qualification scoring, and proposal staging',
      price: 'Free during rollout',
    },
  ],
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  onExploreEmployees,
  onOpenAuthModal,
  onEnterExperience,
  onNavigate,
  companyProfile,
  userId,
}) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRealWidgetOpen, setIsRealWidgetOpen] = useState(false);
  const [liveWidgetConfig, setLiveWidgetConfig] = useState<any>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Monitor scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch official platform widget configuration via public projection endpoint (strictly verified as AI Workforce)
  useEffect(() => {
    let active = true;
    fetch('/api/widget/config?widget_id=official-ai-workforce')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (
          active &&
          data?.widget &&
          data.widget.widget_id === 'official-ai-workforce' &&
          data.widget.business_name === 'AI Workforce'
        ) {
          setLiveWidgetConfig(data.widget);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: 'How does Alpha ground its responses in our business context?',
      a: 'Alpha utilizes Company Brain 2.0 architecture, combining real-time retrieval with verified business rules, pricing bounds, product offerings, and custom FAQs. Alpha will never invent unverified pricing or non-existent features.',
    },
    {
      q: 'Does Alpha require human supervision before sending proposals?',
      a: 'Yes. Alpha operates with human oversight. When high-intent leads request proposals or custom quotes, Alpha formats a staged draft dossier for 1-click review and approval by your human sales team.',
    },
    {
      q: 'How fast can we deploy Alpha on our website?',
      a: 'In under 2 minutes. Provide your basic business details to populate your Company Brain, copy our lightweight 1-line script embed, and Alpha is live 24/7 on your domain.',
    },
    {
      q: 'What happens during Experience Mode?',
      a: 'Experience Mode is a zero-setup interactive demonstration. You enter your website URL or business details, our engine builds a temporary Company Brain in real time, and you interact with Alpha acting as your AI Sales Manager.',
    },
    {
      q: 'Is visitor data secure and isolated?',
      a: 'Strictly isolated. Enterprise communications utilize encrypted Firestore channels, tokenized API authentication, and isolated tenant memory spaces with full GDPR and SOC2 compliance controls.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white dark:bg-[#050505] dark:text-white font-sans selection:bg-white selection:text-black antialiased transition-colors duration-200">
      {/* -------------------------------------------------------------------- */}
      {/* 1. TOP BAR / NAVIGATION                                               */}
      {/* -------------------------------------------------------------------- */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-xl transition-all duration-300 ${
          isScrolled
            ? 'bg-[#050505]/90 border-b border-white/10 py-3.5 shadow-2xl'
            : 'bg-transparent border-b border-transparent py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 flex items-center justify-between gap-8">
          {/* Brand Mark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-white whitespace-nowrap shrink-0 focus:outline-hidden"
          >
            <Logo size="sm" showText={true} inverted={true} />
          </a>

          {/* Text Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-300">
            <button
              type="button"
              onClick={() => scrollToSection('problem')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('introducing-alpha')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              How Alpha Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('company-brain')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Company Brain
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ai-employees')}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              AI Employees
            </button>
            <button
              type="button"
              onClick={onEnterExperience}
              className="text-white hover:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 font-semibold flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Experience Mode</span>
            </button>
          </nav>

          {/* Primary Action & Theme Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {user ? (
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-black bg-white hover:bg-zinc-200 transition-all cursor-pointer whitespace-nowrap shadow-sm hover:shadow-white/10"
              >
                Go to Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={onEnterExperience}
                className="px-4.5 py-2 text-xs font-bold rounded-lg text-black bg-white hover:bg-zinc-200 transition-all cursor-pointer whitespace-nowrap shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                MEET ALPHA
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0A0A0A] border-b border-white/10 px-6 py-6 overflow-hidden"
            >
              <div className="flex flex-col gap-4 text-sm font-medium text-zinc-300">
                <button
                  type="button"
                  onClick={() => scrollToSection('problem')}
                  className="text-left py-1 hover:text-white"
                >
                  Platform
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('introducing-alpha')}
                  className="text-left py-1 hover:text-white"
                >
                  How Alpha Works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('company-brain')}
                  className="text-left py-1 hover:text-white"
                >
                  Company Brain
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('ai-employees')}
                  className="text-left py-1 hover:text-white"
                >
                  AI Employees
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onEnterExperience();
                  }}
                  className="text-left py-1 text-white font-semibold"
                >
                  Experience Alpha
                </button>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onEnterExperience();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-black bg-white rounded-lg"
                  >
                    MEET ALPHA
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* 2. SECTION 1 — HERO SECTION (Centered with 3D AI Orb & Motion)        */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="hero"
        className="relative pt-36 pb-24 sm:pt-48 sm:pb-32 bg-[#050505] overflow-hidden"
      >
        {/* Futuristic Background Lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium tracking-widest text-zinc-300 uppercase mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>YOUR BUSINESS. AN INTELLIGENT WORKFORCE.</span>
          </motion.div>

          {/* 3D Luminous AI Orb Centered Graphic */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="w-44 h-44 sm:w-56 sm:h-56 mx-auto relative mb-6"
          >
            <AiOrbCanvas theme="alpha" className="w-full h-full" interactive={true} intensity={1.2} />
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold text-white tracking-tight leading-[1.08] max-w-3xl mx-auto text-balance"
          >
            Your next employee doesn&apos;t need a desk.
          </motion.h1>

          {/* Supporting Paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto text-pretty"
          >
            AI employees that help your business understand visitors, qualify opportunities, and move conversations forward — alongside your people.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={onEnterExperience}
              className="px-8 py-4 text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all rounded-xl shadow-xl cursor-pointer flex items-center gap-2.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>MEET ALPHA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={user ? onEnterWorkspace : onOpenAuthModal}
              className="px-7 py-4 text-sm font-semibold text-white bg-[#111111] hover:bg-zinc-800 border border-white/15 rounded-xl transition-all cursor-pointer hover:border-white/30"
            >
              EXPLORE AI WORKFORCE
            </button>
          </motion.div>

          {/* Proof Strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>From software you use to employees that work</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>Company Brain Grounded</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Human Oversight Architecture</span>
            </div>
          </motion.div>

          {/* Live Product Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-14 max-w-3xl mx-auto rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 sm:p-8 text-left shadow-2xl relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs font-mono text-zinc-400 pl-2">
                  ALPHA SALES MANAGER · LIVE RUNTIME
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE 24/7</span>
              </div>
            </div>

            {/* Simulated Live Dialogue */}
            <div className="space-y-4 text-xs sm:text-sm relative z-10">
              {/* Visitor Turn */}
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-[85%] p-3.5 rounded-2xl bg-white text-black font-medium rounded-br-xs shadow-md">
                  &ldquo;We get 500 visitors a week, but not enough enquiries. Can Alpha help our team qualify them?&rdquo;
                </div>
                <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-white/10">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Alpha Turn */}
              <div className="flex items-start gap-3 justify-start">
                <div className="w-7 h-7 rounded-md bg-white text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  α
                </div>
                <div className="max-w-[88%] p-4 rounded-2xl bg-[#111111] text-zinc-100 border border-white/10 rounded-bl-xs leading-relaxed shadow-md">
                  Yes. Alpha handles the initial sales discovery layer directly on your website. When a prospect arrives with a question, Alpha answers authoritatively from your verified Company Brain, identifies their timeline and budget requirements, and stages a qualified proposal for your sales team to review.
                </div>
              </div>
            </div>

            {/* Live Operational State Strip */}
            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] relative z-10">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Intent: High Qualification Fit</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Grounding: Company Brain 2.0</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Action: Staged for Human Approval</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 3. SECTION 2 — THE BUSINESS PROBLEM                                  */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="problem"
        className="py-20 sm:py-28 border-t border-white/10 bg-[#0A0A0A] relative"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-14 text-left"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>THE REALITY OF INBOUND TRAFFIC</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
              Your website gets visitors. What happens next?
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed text-pretty">
              Every conversation begins with an opportunity. But when visitors cannot get answers, understand their options, or take the next step, that opportunity can disappear.
            </p>
          </motion.div>

          {/* Three Clean Visual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Missed Conversations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/25 transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Missed Conversations
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Visitors arrive with questions, but do not always receive timely responses. When response times stretch into hours or days, high-intent buyers evaluate alternatives.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>What if the first conversation never had to wait?</span>
              </div>
            </motion.div>

            {/* Card 2: Unqualified Opportunities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/25 transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Unqualified Opportunities
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Potential customers need to be understood before a useful next step can happen. Static forms collect emails without uncovering real pain points, budget, or timelines.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span>Conversations, not interrogations</span>
              </div>
            </motion.div>

            {/* Card 3: Lost Momentum */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/25 transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Lost Momentum
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  When conversations stop, interested visitors may move elsewhere. Without commercial context, human reps must start every discovery call from zero.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Give every conversation a chance</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 4. SECTION 3 — INTRODUCING ALPHA (Flagship Product)                  */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="introducing-alpha"
        className="py-20 sm:py-28 border-t border-white/10 bg-[#050505] relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-12 text-left"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE FLAGSHIP AI EMPLOYEE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
              Meet Alpha. Your AI Sales Manager.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed text-pretty">
              Not another chatbot that waits for instructions. An AI employee designed to understand visitors, answer business questions, and help move conversations forward.
            </p>
          </motion.div>

          {/* Interactive Live Product Demonstration Preview */}
          <AlphaInteractiveDemo onExperienceAlpha={onEnterExperience} />

          {/* Action Callout */}
          <div className="mt-10 p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white">
                Want to see Alpha sell for your specific business?
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Build a temporary Company Brain in under 2 minutes. No sign-in or credit card required.
              </p>
            </div>
            <button
              type="button"
              onClick={onEnterExperience}
              className="px-5 py-2.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 transition-all rounded-xl cursor-pointer flex items-center gap-2 shrink-0 shadow-sm"
            >
              <span>EXPERIENCE ALPHA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 5. SECTION 4 — HOW ALPHA WORKS                                       */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="how-it-works"
        className="py-20 sm:py-28 border-t border-white/10 bg-[#0A0A0A]"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-14 text-left"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>THE 4-STAGE PIPELINE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
              From first conversation to meaningful action.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed text-pretty">
              Alpha combines active listening, verified grounding, and consultative sales strategy without high-pressure scripts.
            </p>
          </motion.div>

          {/* Connected 4-Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-2xl bg-[#050505] border border-white/10 text-left hover:border-white/20 transition-all"
            >
              <div className="text-xs font-mono font-bold text-white mb-3">
                01 — Understand
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Active Discovery
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Alpha discovers what visitors want and why it matters, unpacking their primary bottleneck rather than interrogating them with forms.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl bg-[#050505] border border-white/10 text-left hover:border-white/20 transition-all"
            >
              <div className="text-xs font-mono font-bold text-white mb-3">
                02 — Respond
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Grounded Truth
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Alpha answers business and technical questions strictly using your verified Company Brain, delivering accurate pricing and boundaries.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-2xl bg-[#050505] border border-white/10 text-left hover:border-white/20 transition-all"
            >
              <div className="text-xs font-mono font-bold text-white mb-3">
                03 — Qualify
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Intent Scoring
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Alpha identifies relevant requirements, budget scope, and urgency, calculating an objective buyer readiness score (HOT, WARM, COLD).
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6 rounded-2xl bg-[#050505] border border-white/10 text-left hover:border-white/20 transition-all"
            >
              <div className="text-xs font-mono font-bold text-white mb-3">
                04 — Move Forward
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Human Oversight
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Alpha guides visitors toward an appropriate next step: scheduling a consultation, capturing requirements, or staging a proposal for your team.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 6. SECTION 5 — THE COMPANY BRAIN                                     */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="company-brain"
        className="py-20 sm:py-28 border-t border-white/10 bg-[#050505]"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-12 text-left"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>GROUND TRUTH &amp; ACCURACY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
              Your business knowledge. Behind every conversation.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed text-pretty">
              Every business is different. Alpha uses a business-specific Company Brain to understand what your company offers, how it operates, and what it can confidently tell visitors.
            </p>
          </motion.div>

          {/* Interactive Company Brain Architecture Visual */}
          <CompanyBrainArchitectureVisual />
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 7. SECTION 6 — AI EMPLOYEES (Workforce Vision)                      */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="ai-employees"
        className="py-20 sm:py-28 border-t border-white/10 bg-[#0A0A0A]"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-14 text-left"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>THE DIGITAL WORKFORCE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
              A workforce designed to work alongside yours.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed text-pretty">
              Specialized AI employees configured with specific commercial responsibilities, deterministic boundaries, and human escalation.
            </p>
          </motion.div>

          {/* AI Employees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {/* 1. Alpha — AI Sales Manager (Flagship Live) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/20 shadow-xl flex flex-col justify-between hover:border-white/40 transition-all relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-bold text-lg shadow-md">
                    α
                  </div>
                  <span className="text-[11px] font-semibold text-black bg-white px-2.5 py-0.5 rounded shadow-xs">
                    Ready to Deploy
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Alpha — AI Sales Manager
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Handles website conversations, commercial questions, requirement discovery, lead qualification, and proposal staging for human approval.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onEnterExperience}
                  className="w-full py-2.5 text-xs font-bold text-white hover:text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl border border-white/10"
                >
                  <span>Experience Alpha Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* 2. AI Account Researcher */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center">
                    <Search className="w-5 h-5 text-zinc-300" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    Coming to workforce
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Omega — Account Researcher
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Research and organize account information, subject to available data sources, firmographic integrations, and verified company databases.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-zinc-500 font-mono">
                Integrates with inbound inquiry dossiers
              </div>
            </motion.div>

            {/* 3. AI Revenue Analyst */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center">
                    <LineChart className="w-5 h-5 text-zinc-300" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    Coming to workforce
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Pulse — Revenue Analyst
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Help analyze business conversion patterns, identify objection bottlenecks, and evaluate drop-off friction using supplied data.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-zinc-500 font-mono">
                Conversational trend telemetry
              </div>
            </motion.div>

            {/* 4. AI Customer Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-zinc-300" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    Coming to workforce
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Support Specialist
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Help respond to customer enquiries using approved business procedures, policy FAQs, and supported escalation workflows.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-zinc-500 font-mono">
                Grounded support ticketing
              </div>
            </motion.div>

            {/* 5. AI Operations Manager */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="p-7 rounded-2xl bg-[#050505] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center">
                    <Settings className="w-5 h-5 text-zinc-300" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    Coming to workforce
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Operations Manager
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Assist with operational coordination, internal communication routing, and task handoffs where the required integrations exist.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-zinc-500 font-mono">
                Cross-departmental handoffs
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 8. SECTION 7 — ENTERPRISE TRUST & SECURITY                           */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-20 sm:py-28 border-t border-white/10 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-14 text-left"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>ENTERPRISE ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
              Built for security, privacy, and verified accuracy.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed text-pretty">
              Every conversation is protected by enterprise security standards, zero data leaks across tenants, and strict hallucination prevention.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-7 rounded-2xl bg-[#0A0A0A] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Isolated Company Brain</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your business data is stored in isolated tenant spaces. Your Company Brain is never used to train public foundation models.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#0A0A0A] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Deterministic Guardrails</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Strict boundaries prevent unauthorized discounts, out-of-scope promises, or non-compliant responses during active discovery.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#0A0A0A] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-5">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Sub-1.2s Latency Runtime</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Powered by Google Gemini server-side integration for instant, natural, fluid conversations on any device or network connection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 9. SECTION 8 — FREQUENTLY ASKED QUESTIONS                           */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-20 sm:py-28 border-t border-white/10 bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <div className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-2">
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Everything you need to know.
            </h2>
          </motion.div>

          <div className="space-y-4 text-left">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#050505] border border-white/10 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left font-semibold text-white hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                      activeFaq === idx ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/5 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 10. SECTION 9 — FINAL CTA (Centered & Authoritative)                  */}
      {/* -------------------------------------------------------------------- */}
      <section
        id="final-cta"
        className="py-24 sm:py-32 border-t border-white/10 bg-[#000000] relative overflow-hidden"
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-medium text-zinc-400 uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>READY TO TRANSFORM YOUR SALES PRESENCE?</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1] text-balance">
            Give every conversation a chance.
          </h2>

          <p className="mt-5 text-base sm:text-lg text-zinc-300 max-w-xl mx-auto leading-relaxed text-pretty">
            See what an AI Sales Manager could do for your business.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onEnterExperience}
              className="px-8 py-4 text-sm font-bold text-black bg-white hover:bg-zinc-200 transition-all rounded-xl shadow-xl cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>MEET ALPHA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={user ? onEnterWorkspace : onOpenAuthModal}
              className="px-7 py-4 text-sm font-semibold text-white bg-[#111111] hover:bg-zinc-800 border border-white/15 rounded-xl transition-all cursor-pointer hover:border-white/30"
            >
              EXPLORE AI WORKFORCE
            </button>
          </div>

          <p className="mt-6 text-xs text-zinc-500 font-mono">
            No credit card required · Free rollout access · Embeds in under 2 minutes
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 11. REAL CUSTOMER CHAT WIDGET & LAUNCHER (Preserved Functionality)    */}
      {/* -------------------------------------------------------------------- */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isRealWidgetOpen ? (
          <WidgetLauncherButton
            launcherType="ai_workforce"
            primaryColor="#09090B"
            secondaryColor="#27272A"
            gradientEnabled={true}
            gradientType="custom"
            gradientColor1="#18181B"
            gradientColor2="#09090B"
            gradientAngle={135}
            launcherSize="medium"
            launcherShape="circle"
            borderRadius={20}
            shadowIntensity="deep"
            glowIntensity="none"
            mode="attractive_3d"
            isOpen={false}
            onClick={() => setIsRealWidgetOpen(true)}
          />
        ) : (
          <div
            style={{
              borderRadius: '20px',
            }}
            className="w-[calc(100vw-32px)] sm:w-[380px] h-[min(540px,calc(100dvh-100px))] max-h-[560px] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-[#09090B]"
          >
            <CustomerChatWidget
              widgetId="official-ai-workforce"
              companyProfile={AI_WORKFORCE_PROFILE}
              isOpen={true}
              onClose={() => setIsRealWidgetOpen(false)}
              userId={undefined}
              businessName="AI Workforce"
              welcomeMessage={
                liveWidgetConfig?.welcome_message ||
                "Welcome! I am Alpha, your AI Sales Manager. Ask me anything about deploying autonomous AI employees for your business."
              }
              mode="attractive_3d"
              themeMode="dark"
              primaryColor="#09090B"
              secondaryColor="#FFFFFF"
              backgroundColor="#09090B"
              textColor="#F4F4F5"
              aiMessageColor="#18181B"
              aiMessageTextColor="#F4F4F5"
              userMessageColor="#FFFFFF"
              userMessageTextColor="#09090B"
              gradientEnabled={false}
              gradientType="none"
              borderRadius={20}
              shadowIntensity="deep"
              glowIntensity="none"
              animationIntensity="subtle"
              launcherType="ai_workforce"
            />
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 12. REFINED FOOTER                                                   */}
      {/* -------------------------------------------------------------------- */}
      <footer className="border-t border-white/10 bg-[#050505] py-14 px-6 sm:px-8 text-left">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <Logo size="sm" showText={true} inverted={true} />
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              AI Workforce provides pro-human AI employees that work alongside your team to manage conversations, qualify opportunities, and move work forward with human oversight.
            </p>
            <div className="text-[11px] text-zinc-500 font-mono">
              © {new Date().getFullYear()} AI Workforce. All rights reserved.
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-semibold text-white uppercase tracking-wider">
              Product
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('introducing-alpha')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Alpha Sales Manager
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('ai-employees')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  AI Employees
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onEnterExperience}
                  className="text-white hover:text-zinc-200 font-semibold cursor-pointer"
                >
                  Alpha Experience Mode
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('company-brain')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Company Brain
                </button>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-semibold text-white uppercase tracking-wider">
              Company
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('about')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('contact')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-semibold text-white uppercase tracking-wider">
              Legal
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('privacy')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('cookies')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('terms')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Existing verified contact footer signature */}
        <ContactFooter isPublicLanding={true} />
      </footer>
    </div>
  );
};
