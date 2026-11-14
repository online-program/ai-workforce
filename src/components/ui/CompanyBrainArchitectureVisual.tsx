import React, { useState } from 'react';
import {
  Brain,
  Package,
  CreditCard,
  FileText,
  Building,
  CheckCircle,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface KnowledgeCategory {
  id: string;
  name: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  exampleData: string[];
  groundingRule: string;
}

const CATEGORIES: KnowledgeCategory[] = [
  {
    id: 'products',
    name: 'Products & Services',
    shortDesc: 'Offerings, features, deliverables & specifications',
    icon: Package,
    accentColor: '#14B8A6', // teal
    exampleData: [
      'Enterprise Retainer packages & scope definitions',
      'Technical capabilities & implementation timelines',
      'Service area boundaries & eligibility criteria',
    ],
    groundingRule: 'Alpha only recommends services explicitly listed in your catalog.',
  },
  {
    id: 'pricing',
    name: 'Pricing & Commercial Terms',
    shortDesc: 'Rate cards, tiers, discounts & quotation boundaries',
    icon: CreditCard,
    accentColor: '#A855F7', // violet
    exampleData: [
      'Base subscription tiers and custom scope thresholds',
      'Pre-approved volume discounts and terms',
      'Unlisted pricing policy: directs custom quotes to sales',
    ],
    groundingRule: 'Deterministic calculation: never invents unverified discounts.',
  },
  {
    id: 'policies',
    name: 'Policies & SLAs',
    shortDesc: 'Response times, consultations, cancellations & refunds',
    icon: FileText,
    accentColor: '#84CC16', // lime
    exampleData: [
      '1.2s response time SLA for website visitors',
      'Human consultation handoff procedure',
      'Commercial terms, privacy, and data boundaries',
    ],
    groundingRule: 'Strict policy adherence without improvisation.',
  },
  {
    id: 'business',
    name: 'Business Information',
    shortDesc: 'Company history, founders, headquarters & hours',
    icon: Building,
    accentColor: '#FB7185', // coral
    exampleData: [
      'Operating hours and availability zones',
      'Verified leadership context (Magnus Verity, Founder)',
      'Brand voice, positioning, and tone guidelines',
    ],
    groundingRule: 'Maintains factual identity consistency across every turn.',
  },
  {
    id: 'claims',
    name: 'Approved Claims',
    shortDesc: 'Verified capabilities, metrics, and forbidden statements',
    icon: CheckCircle,
    accentColor: '#14B8A6', // teal
    exampleData: [
      'Allowed capabilities (24/7 discovery, intent scoring)',
      'Forbidden claims (never guarantee revenue or medical advice)',
      'Grounding boundaries (admit unknowns gracefully)',
    ],
    groundingRule: 'Rigid guardrail: blocks out-of-scope assertions.',
  },
  {
    id: 'escalation',
    name: 'Human Escalation Rules',
    shortDesc: 'Triggers that require human review and sign-off',
    icon: ShieldAlert,
    accentColor: '#FB7185', // coral
    exampleData: [
      'High-intent enterprise inquiries with >50 seats',
      'Custom SLA or contractual negotiation requests',
      'Explicit visitor requests to speak with a human',
    ],
    groundingRule: 'Never pretends to be human; coordinates handoff instantly.',
  },
];

export const CompanyBrainArchitectureVisual: React.FC = () => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('products');
  const activeCategory = CATEGORIES.find((c) => c.id === activeCategoryId) || CATEGORIES[0];

  return (
    <div className="w-full bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 sm:p-10 shadow-2xl text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Interactive Category Grid & Central Hub (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#111111] border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center shrink-0 font-bold">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>COMPANY BRAIN ARCHITECTURE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
              </div>
              <p className="text-xs text-zinc-400">
                Your structured single source of truth. Grounding without model retraining.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`p-3.5 rounded-xl border text-left transition-none cursor-pointer ${
                    isSelected
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 bg-[#111111] text-zinc-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                    <span className="text-xs font-bold">
                      {cat.name}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full ml-auto"
                      style={{ backgroundColor: cat.accentColor }}
                    />
                  </div>
                  <p className={`text-[11px] line-clamp-1 ${isSelected ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    {cat.shortDesc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Grounding Dossier for Selected Category (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-[#111111] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>VERIFIED KNOWLEDGE SLICE</span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: activeCategory.accentColor }}
              />
            </div>
            <span className="text-[10px] font-mono uppercase bg-white/10 border border-white/15 text-white px-2 py-0.5 rounded font-medium">
              GROUNDED
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-1">
              {activeCategory.name}
            </h4>
            <p className="text-xs text-zinc-400">
              {activeCategory.shortDesc}
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Sample Verified Attributes
            </div>
            <ul className="space-y-1.5">
              {activeCategory.exampleData.map((item, i) => (
                <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: activeCategory.accentColor }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="text-[11px] font-medium text-zinc-400 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>{activeCategory.groundingRule}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Architecture Footnote */}
      <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-400">
        <div>
          <span className="font-medium text-white">How it works:</span> In-context retrieval retrieves exact facts from your Company Brain per turn. Alpha never hallucinates unverified pricing or external integrations.
        </div>
        <div className="text-[11px] text-zinc-500 shrink-0 font-mono">
          Zero training cost · Real-time updates
        </div>
      </div>
    </div>
  );
};
