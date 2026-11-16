import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Palette,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  LucideIcon,
} from 'lucide-react';

interface IndustryData {
  id: string;
  label: string;
  badge: string;
  icon: LucideIcon;
  headline: string;
  description: string;
  painPoint: string;
  solution: string;
  sampleDialog: {
    visitor: string;
    alpha: string;
  };
  metrics: {
    label: string;
    value: string;
  }[];
  groundingSignals: string[];
}

const INDUSTRIES: IndustryData[] = [
  {
    id: 'b2b-saas',
    label: 'B2B SaaS & Tech',
    badge: 'Enterprise Software',
    icon: Building2,
    headline: 'Autonomous Technical Discovery & Executive Meeting Staging',
    description:
      'Alpha answers API, architecture, and SLA inquiries using verified Company Brain documentation, evaluates team size, and routes qualified enterprise buyers directly to your account executives.',
    painPoint:
      'High-intent enterprise evaluators bounce when technical documentation is buried or demos take 48 hours to schedule.',
    solution:
      'Alpha discovers buyer tech stack, evaluates seat count, and answers technical integration questions instantly—scoring readiness into HOT, WARM, or COLD.',
    sampleDialog: {
      visitor: 'Do you support custom enterprise onboarding and security documentation requests?',
      alpha:
        'Alpha answers deployment and workspace questions directly from our Company Brain. I can also collect your organization details and escalate technical security or enterprise deployment requests to our team.',
    },
    metrics: [
      { label: 'Availability', value: '24/7' },
      { label: 'Lead Qualification', value: 'Structured' },
      { label: 'Brain Grounding', value: 'Verified' },
    ],
    groundingSignals: [
      'Configured Security & SLA Docs',
      'Seat & Scope Qualification',
      'Human Approval Escalation',
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce & Retail',
    badge: 'DTC & Retail Brands',
    icon: ShoppingBag,
    headline: '24/7 Digital Concierge & High-Intent Cart Rescue',
    description:
      'Empower shoppers with real-time sizing advice, shipping estimates, warranty coverage, and product comparisons without manual support staffing during global night hours.',
    painPoint:
      'Over 70% of potential buyers abandon online purchases when basic questions about shipping, sizing, or returns go unanswered.',
    solution:
      'Alpha engages shoppers mid-session, validates product specifications against live catalog data, and guides them directly to the exact checkout SKU.',
    sampleDialog: {
      visitor: 'Are these insulated waterproof boots suitable for -20°C alpine hiking, and what is your exchange policy?',
      alpha:
        'The Arctic Horizon boots are rated down to -25°C with 400g Thinsulate insulation and Vibram Arctic Grip soles. If the size doesn’t fit perfectly, we offer free 30-day exchanges in original condition.',
    },
    metrics: [
      { label: 'Storefront Coverage', value: '24/7' },
      { label: 'Policy Grounding', value: 'Strict' },
      { label: 'Discounts', value: 'Rule-Gated' },
    ],
    groundingSignals: [
      'Catalog Specification Rules',
      'Return & Exchange Policies',
      'Configured Shipping Rules',
    ],
  },
  {
    id: 'services',
    label: 'Consulting & Agencies',
    badge: 'Professional Services',
    icon: Briefcase,
    headline: 'Client Scoping & Structured Proposal Staging',
    description:
      'Collect project deliverables, budget parameters, and launch horizons before partner time is committed to discovery consultations.',
    painPoint:
      'Founders and senior partners lose hours weekly in discovery meetings with prospects whose scope or budget is unclear.',
    solution:
      'Alpha conducts consultative scoping, checks minimum engagement rules in your Company Brain, and stages structured briefs for human review.',
    sampleDialog: {
      visitor: 'We need a full rebrand and custom web app built over the next 3 months. Can we get an estimate?',
      alpha:
        'Illustrative example: Based on our configured scope rules, custom branding and web builds depend on deliverable count. Could you share your target launch date and core goals so our partners can review?',
    },
    metrics: [
      { label: 'Inquiry Triage', value: 'Structured' },
      { label: 'Brief Staging', value: 'Instant' },
      { label: 'Approval Workflow', value: 'Human-Led' },
    ],
    groundingSignals: [
      'Minimum Engagement Thresholds',
      'Milestone Pricing Structure',
      'Human Approval Handoff',
    ],
  },
  {
    id: 'education',
    label: 'Schools & Academies',
    badge: 'Education & Admissions',
    icon: GraduationCap,
    headline: 'Prospective Student Guidance & Admissions Qualification',
    description:
      'Guide applicants and parents through curriculum details, tuition schedules, and prerequisite requirements with clear, Company Brain-grounded answers.',
    painPoint:
      'Admissions teams are overloaded by repetitive enrollment inquiries during application deadlines, causing prospective students to wait.',
    solution:
      'Alpha answers curriculum prerequisites, clarifies documented tuition terms, and escalates nuanced cases to admissions counselors.',
    sampleDialog: {
      visitor: 'Does the Data Engineering Fellowship require prior Python experience, and are monthly payment plans available?',
      alpha:
        'Illustrative example: Yes, our curriculum documentation lists basic Python fluency as a prerequisite, with installment terms detailed on your program guide. Would you like an advisor to follow up?',
    },
    metrics: [
      { label: 'Admissions Availability', value: '24/7' },
      { label: 'Response Speed', value: 'Real-Time' },
      { label: 'Advisor Handoff', value: 'Durable' },
    ],
    groundingSignals: [
      'Curriculum Prerequisites',
      'Tuition & Payment Terms',
      'Cohort Intake Deadlines',
    ],
  },
  {
    id: 'creator',
    label: 'Portfolios & Creators',
    badge: 'Creators & Studios',
    icon: Palette,
    headline: 'Screen Inbound Sponsorships, Licensing & Collaborations',
    description:
      'Keep high-budget commercial sponsorships and licensing inquiries organized while politely collecting project briefs and budgets.',
    painPoint:
      'Creators and boutique studios miss serious commercial inquiries in flooded inbox threads while manually sorting unclear requests.',
    solution:
      'Alpha screens brand briefs against your rate guidance, collects campaign deliverables, and alerts your team when qualified commercial terms match.',
    sampleDialog: {
      visitor: 'We want to sponsor a YouTube video integration for our launch next month. How does pricing work?',
      alpha:
        'Illustrative example: Sponsorship options depend on integration format and usage rights in your studio brief. Could you share your target launch window and campaign deliverables?',
    },
    metrics: [
      { label: 'Brief Capture', value: 'Structured' },
      { label: 'Tenant Isolation', value: 'Per-Studio' },
      { label: 'Escalation Mode', value: 'Durable' },
    ],
    groundingSignals: [
      'Sponsorship Rate Cards',
      'Usage Rights Directives',
      'Brand Safety Guidelines',
    ],
  },
];

export const IndustryUseCases: React.FC = () => {
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>('b2b-saas');
  const activeIndustry = INDUSTRIES.find((ind) => ind.id === selectedIndustryId) || INDUSTRIES[0];

  return (
    <section
      id="use-cases"
      className="relative py-28 px-6 sm:px-8 border-t border-slate-200 dark:border-neutral-900 bg-white dark:bg-black overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="space-y-3 max-w-3xl">
          <div className="text-xs font-mono font-medium uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
            <span>Industry-Aware AI Employees</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Engineered for Every Digital Presence.
          </h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
            From high-velocity B2B software companies to independent studios and e-commerce brands, AI Workforce adapts its tone, discovery logic, and qualification rules to match your exact commercial model.
          </p>
        </div>

        {/* Industry Selector Tabs */}
        <div className="flex flex-wrap gap-2.5 pb-2 border-b border-slate-200 dark:border-neutral-800">
          {INDUSTRIES.map((industry) => {
            const Icon = industry.icon;
            const isSelected = industry.id === selectedIndustryId;
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustryId(industry.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md'
                    : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{industry.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Industry Display Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndustry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start rounded-3xl bg-slate-50/70 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 p-6 sm:p-10"
          >
            {/* Left Column: Solution & Metrics */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {activeIndustry.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {activeIndustry.headline}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed pt-1">
                  {activeIndustry.description}
                </p>
              </div>

              {/* Concrete Problem / Solution Pairing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 space-y-1.5">
                  <span className="font-mono font-bold text-rose-500 uppercase text-[10px]">
                    The Vulnerability
                  </span>
                  <p className="text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {activeIndustry.painPoint}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 space-y-1.5">
                  <span className="font-mono font-bold text-emerald-500 uppercase text-[10px]">
                    The AI Workforce Advantage
                  </span>
                  <p className="text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {activeIndustry.solution}
                  </p>
                </div>
              </div>

              {/* Verified Grounding Signals */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Company Brain Grounding Rules:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeIndustry.groundingSignals.map((sig, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-mono text-slate-700 dark:text-neutral-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{sig}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Verified Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-neutral-800/80">
                {activeIndustry.metrics.map((metric, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 dark:text-white">
                      {metric.value}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Live Simulated Dialogue Card */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    Live Alpha Interaction
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
                  Grounding: 100% Verified
                </span>
              </div>

              {/* Visitor Prompt Bubble */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
                  Website Visitor
                </span>
                <div className="bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 text-xs rounded-2xl rounded-tr-xs px-3.5 py-2.5 max-w-[90%] leading-relaxed">
                  {activeIndustry.sampleDialog.visitor}
                </div>
              </div>

              {/* Alpha Response Bubble */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  <BrainCircuit className="w-3 h-3" />
                  <span>Alpha (AI Sales Manager)</span>
                </div>
                <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-slate-800 dark:text-neutral-200 text-xs rounded-2xl rounded-tl-xs px-3.5 py-2.5 max-w-[95%] leading-relaxed">
                  {activeIndustry.sampleDialog.alpha}
                </div>
              </div>

              {/* Footnote reassurance */}
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Deterministic Policy Shield</span>
                </span>
                <span>Latency: ~1.1s</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
