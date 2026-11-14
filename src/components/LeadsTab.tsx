import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ArrowRight, CheckCircle2, Flame, Users, Plus, Sparkles, Download } from 'lucide-react';
import { InquiryLead, LeadStatus, LeadScore } from '../types.ts';
import { TiltCard } from './ui/TiltCard.tsx';
import { PremiumButton } from './ui/PremiumButton.tsx';
import { SectionHeader } from './ui/SectionHeader.tsx';
import { StatusBadge } from './ui/StatusBadge.tsx';
import { EmptyState } from './ui/EmptyState.tsx';

interface LeadsTabProps {
  leads: InquiryLead[];
  onSelectLead: (lead: InquiryLead) => void;
  onOpenNewInquiryModal: () => void;
}

export const LeadsTab: React.FC<LeadsTabProps> = ({
  leads,
  onSelectLead,
  onOpenNewInquiryModal,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const statuses: { label: string; value: string }[] = [
    { label: 'All Inquiries', value: 'all' },
    { label: 'Needs Approval', value: 'Needs Approval' },
    { label: 'Waiting for Customer', value: 'Waiting for Customer' },
    { label: 'Follow-up Due', value: 'Follow-up Due' },
    { label: 'Qualified', value: 'Qualified' },
    { label: 'Won', value: 'Won' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  const filtered = leads.filter((lead) => {
    if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (lead.companyName || '').toLowerCase().includes(q) ||
        (lead.customer_name || '').toLowerCase().includes(q) ||
        (lead.product_or_service || '').toLowerCase().includes(q) ||
        (lead.location || '').toLowerCase().includes(q) ||
        (lead.customer_intent || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Leads & Commercial Pipeline"
        subtitle="Repository of structured inbound leads captured, scored, and qualified by Alpha."
        kicker="Commercial Accounts"
        action={
          <PremiumButton
            variant="primary"
            size="md"
            onClick={onOpenNewInquiryModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Inquiry
          </PremiumButton>
        }
      />

      {/* Filter Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-[#0C0C0E] border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {statuses.map((s) => {
            const count =
              s.value === 'all'
                ? leads.length
                : leads.filter((l) => l.status === s.value).length;
            const isSelected = selectedStatus === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSelectedStatus(s.value)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                {s.label} <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* High-Density Clean Data Grid */}
      <div className="bg-white dark:bg-[#0C0C0E] rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-900/50 border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-400 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 sm:px-6">Prospect / Organization</th>
                <th className="py-3 px-4">Intent Score</th>
                <th className="py-3 px-4">Requirement / Scope</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      title="No matching leads"
                      description="Try clearing your search query or selecting a different status filter."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const intentScore = lead.intent_score || (lead.lead_score === 'HOT' ? 88 : lead.lead_score === 'WARM' ? 62 : 25);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-neutral-950 dark:text-white text-xs">
                          {lead.companyName || lead.customer_name}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {lead.contactName || 'Inbound Prospect'} {lead.contact_info ? `· ${lead.contact_info}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums">
                          <Flame className={`w-3.5 h-3.5 ${intentScore >= 70 ? 'text-rose-500' : intentScore >= 40 ? 'text-amber-500' : 'text-neutral-400'}`} />
                          <span className={intentScore >= 70 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-800 dark:text-neutral-200'}>
                            {intentScore}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-normal">/100</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {lead.quantity && lead.quantity !== 'Unknown' ? `${lead.quantity} · ` : ''}{lead.product_or_service || 'Commercial Inquiry'}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {lead.customer_intent || 'Discovery'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">
                        {lead.location && lead.location !== 'Unknown' ? lead.location : <span className="text-neutral-400 dark:text-neutral-600">—</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={lead.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 dark:text-white group-hover:underline cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
