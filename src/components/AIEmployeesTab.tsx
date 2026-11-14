import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BrainCircuit,
  MessageSquare,
  Search,
  TrendingUp,
  Sliders,
  Check,
  Zap,
  Eye,
} from 'lucide-react';
import { CompanyProfile, InquiryLead } from '../types.ts';

interface AIEmployeesTabProps {
  companyProfile: CompanyProfile;
  leads?: InquiryLead[];
  onOpenSalesManager: () => void;
  onOpenOnboardingModal?: () => void;
  onOpenAlphaConfig?: () => void;
  onOpenPreview?: () => void;
  onNavigateToBrain?: () => void;
  onNavigateToWidget?: () => void;
  onNavigateToEmbed?: () => void;
}

export const AIEmployeesTab: React.FC<AIEmployeesTabProps> = ({
  companyProfile,
  leads = [],
  onOpenSalesManager,
  onOpenOnboardingModal,
  onOpenAlphaConfig,
  onOpenPreview,
  onNavigateToBrain,
  onNavigateToWidget,
  onNavigateToEmbed,
}) => {
  const hasBusinessName = Boolean(
    companyProfile.name &&
      companyProfile.name.trim() !== '' &&
      companyProfile.name.trim() !== 'My Business'
  );
  const hasProductsOrOfferings = Boolean(
    (companyProfile.products && companyProfile.products.trim() !== '') ||
      (Array.isArray((companyProfile as any).offerings) && (companyProfile as any).offerings.length > 0)
  );
  const isBrainConfigured = hasBusinessName && hasProductsOrOfferings;
  const hasWidgetId = Boolean(companyProfile.widget_id && companyProfile.widget_id.trim() !== '');

  const totalInquiries = leads.length;
  const hotLeads = leads.filter((l) => l.lead_score === 'HOT' || l.lead_temperature === 'HOT').length;

  const inTestingEmployees = [
    {
      id: 'omega',
      name: 'OMEGA',
      status: 'IN DEVELOPMENT',
      focusArea: 'AI Research & Account Intelligence',
      description:
        'Autonomous prospect research, company firmographic intelligence, and buyer signal detection.',
      capabilities: [
        'Automated firmographic data gathering',
        'Website & public signal discovery',
        'Ideal Customer Profile (ICP) fit scoring',
      ],
      icon: <Search className="w-5 h-5 text-slate-700 dark:text-neutral-300" />,
    },
    {
      id: 'pulse',
      name: 'PULSE',
      status: 'IN DEVELOPMENT',
      focusArea: 'Revenue & Conversation Intelligence',
      description:
        'Conversation analytics, pipeline conversion diagnostics, drop-off auditing, and revenue insights.',
      capabilities: [
        'Inbound conversation intent mapping',
        'Deal drop-off reason diagnostics',
        'Pipeline revenue intelligence synthesis',
      ],
      icon: <TrendingUp className="w-5 h-5 text-slate-700 dark:text-neutral-300" />,
    },
    {
      id: 'forge',
      name: 'SIGMA',
      status: 'IN DEVELOPMENT',
      focusArea: 'Operations & Workflow Automation',
      description:
        'Cross-department workflow automation, operational routing, and approval task coordination.',
      capabilities: [
        'Multi-department task dispatching',
        'SLA adherence monitoring',
        'Operational audit trail logging',
      ],
      icon: <Sliders className="w-5 h-5 text-slate-700 dark:text-neutral-300" />,
    },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto text-black dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              AI Workforce
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Alpha Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-1">
            Supervise, configure, and monitor your dedicated conversational AI and upcoming intelligence models.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onOpenSalesManager}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs"
          >
            <span>Open Alpha Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE / WORKING FLAGSHIP */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-black dark:text-white tracking-tight uppercase tracking-wider text-xs">
              Live Flagship Product
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Primary Production AI
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-neutral-950 border-2 border-black dark:border-white/20 shadow-sm relative overflow-hidden"
        >
          {/* Top Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-neutral-800/80">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs flex-shrink-0 font-extrabold text-xl font-mono">
                α
              </div>

              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-xl font-bold text-black dark:text-white tracking-tight">
                    ALPHA
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Conversational AI for Sales & Customer Assistance
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {(onOpenAlphaConfig || onOpenOnboardingModal) && (
                <button
                  type="button"
                  onClick={onOpenAlphaConfig || onOpenOnboardingModal}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                  title="Configure Alpha's identity, objectives, and governance rules"
                >
                  <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Configure Alpha</span>
                </button>
              )}

              {onOpenPreview && (
                <button
                  type="button"
                  onClick={onOpenPreview}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                  title="Test chat widget in live sandbox"
                >
                  <Eye className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Test Chat Sandbox</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenSalesManager}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs"
              >
                <span>Open Sales Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description & Operational Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1.5">
                  Primary Function
                </h4>
                <p className="text-sm text-slate-800 dark:text-neutral-200 leading-relaxed">
                  One continuous, intelligent dialogue for whatever your website visitor needs: general questions, product discovery, pricing, basic support troubleshooting, qualification, and smooth human handoff. Grounded in your Company Brain with zero hallucinations.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2">
                  Key Capabilities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-start space-x-2 text-xs text-slate-700 dark:text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>24/7 conversational engagement on website</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-slate-700 dark:text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Strict Company Brain source of truth (0 hallucinations)</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-slate-700 dark:text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Dynamic intent routing (Sales, Support, Questions, Handoff)</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-slate-700 dark:text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Opportunity intelligence & human-supervised approval</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Connection Status */}
            <div className="bg-slate-50 dark:bg-neutral-900/60 rounded-xl p-4 border border-slate-200 dark:border-neutral-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-black dark:text-white mb-2 flex items-center justify-between">
                  <span>Connection Status</span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isBrainConfigured && hasWidgetId
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isBrainConfigured && hasWidgetId ? 'ACTIVE' : 'SETUP REQUIRED'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-neutral-300">
                      <BrainCircuit className="w-3.5 h-3.5 text-slate-500" />
                      Company Brain
                    </span>
                    <span
                      className={`font-semibold ${
                        isBrainConfigured
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isBrainConfigured ? 'Configured' : 'Setup Incomplete'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-neutral-300">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      Website Chat Widget
                    </span>
                    <span
                      className={`font-semibold ${
                        hasWidgetId
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {hasWidgetId ? 'Ready' : 'Widget ID Pending'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-neutral-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      Human Control
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-sky-400">Enforced</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                <span>Inquiries Handled: <strong className="text-black dark:text-white font-mono">{totalInquiries}</strong></span>
                <span>Hot Leads: <strong className="text-rose-600 dark:text-rose-400 font-mono">{hotLeads}</strong></span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 2: IN DEVELOPMENT PRODUCTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-base font-bold text-black dark:text-white tracking-tight uppercase tracking-wider text-xs">
              Future Workforce Products
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Roadmap & In Development
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {inTestingEmployees.map((emp) => {
            return (
              <div
                key={emp.id}
                className="p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-neutral-800">
                        {emp.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-black dark:text-white tracking-tight">
                          {emp.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                          {emp.focusArea}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700 uppercase tracking-wide flex-shrink-0">
                      {emp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed mb-4">
                    {emp.description}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-neutral-800/80">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Planned Capabilities
                    </div>
                    {emp.capabilities.map((cap, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 text-xs text-slate-600 dark:text-neutral-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-neutral-600 flex-shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    In Development
                  </span>

                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800">
                    Roadmap Only
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
