import React from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PremiumButton } from './PremiumButton.tsx';

interface PricingComparisonProps {
  onGetStarted: () => void;
  onExploreDemo: () => void;
}

interface MatrixRow {
  capability: string;
  alpha: { text: string; status: 'positive' };
  traditionalBots: { text: string; status: 'negative' | 'neutral' };
  humanSdr: { text: string; status: 'positive' | 'negative' | 'neutral' };
}

const COMPARISON_ROWS: MatrixRow[] = [
  {
    capability: '24/7 Global Availability',
    alpha: { text: '100% Instant, All Time Zones', status: 'positive' },
    traditionalBots: { text: 'Yes, but canned buttons', status: 'neutral' },
    humanSdr: { text: 'Limited to 9-to-5 local hours', status: 'negative' },
  },
  {
    capability: 'Inbound Response Latency',
    alpha: { text: 'Fast & Sub-Second Target*', status: 'positive' },
    traditionalBots: { text: '<1 Second (Static)', status: 'neutral' },
    humanSdr: { text: '4 to 48 Hours', status: 'negative' },
  },
  {
    capability: 'Discovery & Consultation Quality',
    alpha: { text: 'Fluid Consultative Discovery', status: 'positive' },
    traditionalBots: { text: 'Rigid Decision Trees', status: 'negative' },
    humanSdr: { text: 'High, but inconsistent', status: 'neutral' },
  },
  {
    capability: 'Company Knowledge Grounding',
    alpha: { text: 'Verified Company Brain Strict', status: 'positive' },
    traditionalBots: { text: 'No context awareness', status: 'negative' },
    humanSdr: { text: 'Subject to memory & training', status: 'neutral' },
  },
  {
    capability: 'Hallucination & Bad Quote Prevention',
    alpha: { text: 'Deterministic Boundary Shield', status: 'positive' },
    traditionalBots: { text: 'Limited to scripted buttons', status: 'neutral' },
    humanSdr: { text: 'Occasional human quoting errors', status: 'negative' },
  },
  {
    capability: 'Automated Intent Classification',
    alpha: { text: 'Real-Time HOT/WARM/COLD Scoring', status: 'positive' },
    traditionalBots: { text: 'Basic static form dumping', status: 'negative' },
    humanSdr: { text: 'Manual CRM data entry', status: 'neutral' },
  },
  {
    capability: 'Human Approval Before Commitments',
    alpha: { text: '1-Click Proposal Approval Gate', status: 'positive' },
    traditionalBots: { text: 'No proposal intelligence', status: 'negative' },
    humanSdr: { text: 'Unsupervised communications', status: 'negative' },
  },
  {
    capability: 'Deployment & Setup Speed',
    alpha: { text: '<5 Minutes Turnkey', status: 'positive' },
    traditionalBots: { text: '2 to 6 Weeks setup', status: 'negative' },
    humanSdr: { text: '2 to 3 Months hiring & ramp', status: 'negative' },
  },
  {
    capability: 'Predictable Investment',
    alpha: { text: 'Free for now', status: 'positive' },
    traditionalBots: { text: '$500–$2,000 / mo + seats', status: 'negative' },
    humanSdr: { text: '$5,000–$7,500 / mo + benefits', status: 'negative' },
  },
];

export const PricingComparison: React.FC<PricingComparisonProps> = ({
  onGetStarted,
  onExploreDemo,
}) => {
  return (
    <section
      id="pricing"
      className="relative py-28 px-6 sm:px-8 border-t border-slate-200 dark:border-neutral-900 bg-slate-50/70 dark:bg-neutral-950/60 overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono font-medium uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>Early Access Availability</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Transparent Access. Unmatched ROI.
          </h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed max-w-xl mx-auto">
            No per-conversation penalties, surprise overages, or mandatory contracts. Alpha is free for now with full access to verified Company Brain grounding.
          </p>
        </div>

        {/* Highlighted Pricing Card & Key Benefits */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#0C0C0E] border-2 border-slate-900/10 dark:border-neutral-800 shadow-2xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded-bl-xl shadow-xs">
            Free for Now
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Price Column */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Alpha AI Sales Manager
                </span>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-5xl sm:text-6xl font-mono font-extrabold text-slate-900 dark:text-white">
                    Free
                  </span>
                  <span className="text-slate-500 dark:text-neutral-400 font-mono text-sm">
                    for now
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 pt-1">
                  Zero setup fees. Designed to respond quickly to customer questions, with actual response times depending on request complexity and service availability.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <PremiumButton
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="w-full justify-center"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Alpha Today
                </PremiumButton>
                <button
                  onClick={onExploreDemo}
                  className="w-full text-center text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1.5"
                >
                  Test Alpha Sandbox First →
                </button>
              </div>
            </div>

            {/* Feature List Column */}
            <div className="md:col-span-7 space-y-3.5 border-t md:border-t-0 md:border-l border-slate-200 dark:border-neutral-800/80 pt-6 md:pt-0 md:pl-8">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Everything Included in Your Plan:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-neutral-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Unlimited visitor conversations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Verified Company Brain grounding</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>HOT/WARM/COLD intent scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Proposal staging with 1-click review</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Multi-tab live Widget Studio</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Lightweight 1-line script embed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Real-time email and lead alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Deterministic boundary guardrails</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Head-to-Head Comparison Matrix */}
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Workforce vs. The Alternatives
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Why modern businesses choose autonomous AI employees over legacy chatbots or bloated sales overhead.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#0C0C0E] shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-100/70 dark:bg-neutral-900/60 font-mono text-[11px] text-slate-600 dark:text-neutral-400">
                  <th className="p-4 sm:p-5 font-bold">Strategic Capability</th>
                  <th className="p-4 sm:p-5 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">
                    AI Workforce (Alpha)
                  </th>
                  <th className="p-4 sm:p-5 font-bold">Traditional Chatbots</th>
                  <th className="p-4 sm:p-5 font-bold">Human Inbound SDR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 dark:hover:bg-neutral-900/30 transition-colors"
                  >
                    <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">
                      {row.capability}
                    </td>
                    <td className="p-4 sm:p-5 font-medium text-emerald-700 dark:text-emerald-400 bg-blue-50/20 dark:bg-blue-950/10">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{row.alpha.text}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        {row.traditionalBots.status === 'negative' ? (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        )}
                        <span>{row.traditionalBots.text}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        {row.humanSdr.status === 'negative' ? (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        )}
                        <span>{row.humanSdr.text}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
