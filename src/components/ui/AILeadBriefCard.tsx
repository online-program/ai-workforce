import React from 'react';
import { Flame, Sparkles, ArrowRight } from 'lucide-react';
import { InquiryLead, AILeadBrief } from '../../types.ts';
import { PremiumButton } from './PremiumButton.tsx';
import { StatusBadge } from './StatusBadge.tsx';

interface AILeadBriefCardProps {
  lead: InquiryLead;
  leadBrief?: AILeadBrief;
  onTakeOver?: () => void;
  onViewDetail?: () => void;
  onFollowUp?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const AILeadBriefCard: React.FC<AILeadBriefCardProps> = ({
  lead,
  leadBrief,
  onTakeOver,
  onViewDetail,
  onFollowUp,
  className = '',
  isCompact = false,
}) => {
  const intentScore = lead.intent_score || (lead.lead_score === 'HOT' ? 88 : lead.lead_score === 'WARM' ? 62 : 25);
  const company = lead.customer_name || lead.companyName || 'Prospective Client';
  const industry = lead.industry || lead.business_context || 'Commercial Account';
  const objection = lead.detected_objection && lead.detected_objection !== 'none' ? lead.detected_objection : undefined;
  const nextAction = lead.next_best_action || 'continue_discovery';

  const formatNextActionLabel = (action: string) => {
    switch (action) {
      case 'handoff_to_human':
        return 'Human Takeover Recommended';
      case 'send_quote':
        return 'Prepare Tailored Proposal';
      case 'schedule_call':
        return 'Schedule 15-Min Walkthrough';
      case 'provide_demo':
        return 'Share Live Interactive Demo';
      case 'nurture':
        return 'Nurture Prospect';
      case 'continue_discovery':
      default:
        return 'Continue Consultative Discovery';
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-[#0C0C0E] border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 ${className}`}>
      {/* Header: Company & Intent Score */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-neutral-950 dark:text-white tracking-tight">
              {company}
            </h4>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{industry}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={lead.status} size="sm" />
            {lead.contact_info && (
              <>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <span className="text-[11px] text-neutral-500 font-mono truncate max-w-[180px]">
                  {lead.contact_info}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Intent Score Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex-shrink-0">
          <Flame className={`w-3.5 h-3.5 ${intentScore >= 70 ? 'text-rose-500' : 'text-neutral-400'}`} />
          <span className="text-xs font-mono font-bold text-neutral-950 dark:text-white">
            {intentScore}
          </span>
          <span className="text-[10px] text-neutral-400">/100</span>
        </div>
      </div>

      {/* Intelligence Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {lead.product_or_service && (
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-0.5">Need / Requirement</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1">{lead.product_or_service}</span>
          </div>
        )}

        {objection && (
          <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-neutral-900/50 border border-amber-200/50 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-0.5">Detected Objection</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-200 capitalize">{objection}</span>
          </div>
        )}
      </div>

      {/* Next Best Action Banner */}
      <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
              Next Best Action
            </span>
            <span className="text-xs font-bold text-neutral-950 dark:text-white">
              {formatNextActionLabel(nextAction)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onTakeOver && (
            <PremiumButton variant="primary" size="sm" onClick={onTakeOver} className="text-[11px] py-1 px-2.5">
              Take Over
            </PremiumButton>
          )}
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="p-1.5 text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
              title="View full lead brief"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
