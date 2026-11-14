import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  User,
  Bot,
  Sparkles,
  Flame,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
  Send,
  UserCheck,
  Zap,
} from 'lucide-react';
import { WidgetConversation, EntityClassificationStatus, InquiryLead } from '../types.ts';
import { TiltCard } from './ui/TiltCard.tsx';
import { PremiumButton } from './ui/PremiumButton.tsx';
import { SectionHeader } from './ui/SectionHeader.tsx';
import { StatusBadge } from './ui/StatusBadge.tsx';
import { LiveIndicator } from './ui/LiveIndicator.tsx';
import { EmptyState } from './ui/EmptyState.tsx';
import { AILeadBriefCard } from './ui/AILeadBriefCard.tsx';

interface ConversationsTabProps {
  conversations: WidgetConversation[];
  leads: InquiryLead[];
  onSelectInquiry?: (lead: InquiryLead) => void;
  onNavigateToLeads?: () => void;
  onNavigateToInquiries?: () => void;
}

export const ConversationsTab: React.FC<ConversationsTabProps> = ({
  conversations,
  leads,
  onSelectInquiry,
  onNavigateToLeads,
  onNavigateToInquiries,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<'ALL' | 'HOT' | 'QUALIFIED' | 'BROWSING'>('ALL');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversations.length > 0 ? (conversations[0].conversation_id || conversations[0].id) : null
  );

  // Dynamic filter
  const filteredConversations = conversations.filter((c) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const nameMatch = c.customer_name?.toLowerCase().includes(q);
      const visitorMatch = c.visitor_id?.toLowerCase().includes(q);
      const intentMatch = c.current_intent?.toLowerCase().includes(q);
      const msgMatch = c.messages?.some((m) => m.text?.toLowerCase().includes(q));
      if (!nameMatch && !visitorMatch && !intentMatch && !msgMatch) return false;
    }

    if (selectedIntentFilter === 'HOT') {
      return (c.intent_score && c.intent_score >= 70) || c.lead_score === 'HOT' || c.status === 'Lead';
    }
    if (selectedIntentFilter === 'QUALIFIED') {
      return c.status === 'Inquiry' || c.status === 'Lead';
    }
    if (selectedIntentFilter === 'BROWSING') {
      return !c.status || c.status === 'Conversation';
    }
    return true;
  });

  const activeConv = conversations.find(
    (c) => (c.conversation_id || c.id) === activeConversationId
  ) || filteredConversations[0] || null;

  // Matching lead for active conversation if available
  const matchingLead = activeConv
    ? leads.find((l) => l.conversation_id === (activeConv.conversation_id || activeConv.id) || l.customer_name === activeConv.customer_name)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Live Conversations"
        subtitle="Real-time stream of all website visitor interactions managed by Alpha. Inspect live buyer discovery, extracted intent scores, and objection handling."
        kicker="Sales Stream"
      />

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
          {(['ALL', 'HOT', 'QUALIFIED', 'BROWSING'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedIntentFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedIntentFilter === filter
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              {filter === 'ALL' ? 'All Chats' : filter === 'HOT' ? '🔥 High Intent' : filter === 'QUALIFIED' ? 'Qualified' : 'Browsing'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Conversation List */}
        <div className="lg:col-span-4 space-y-2.5 overflow-y-auto max-h-[620px] pr-1">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const convId = conv.conversation_id || conv.id;
              const isSelected = activeConv && (activeConv.conversation_id || activeConv.id) === convId;
              const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
              const intentScore = conv.intent_score || (conv.status === 'Inquiry' ? 85 : 20);

              return (
                <motion.div
                  key={convId}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveConversationId(convId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-950 text-white dark:bg-neutral-900 border-neutral-900 dark:border-neutral-700 shadow-sm'
                      : 'bg-white dark:bg-[#0C0C0E] border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-950 dark:text-white'}`}>
                        {conv.customer_name || 'Website Visitor'}
                      </span>
                    </div>
                    {intentScore >= 70 ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-rose-500">
                        <Flame className="w-3 h-3" /> {intentScore}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-400">
                        {conv.created_at ? new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs line-clamp-2 leading-relaxed ${isSelected ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {lastMsg?.text || 'Conversation initiated with Alpha.'}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className={`font-medium ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                      {conv.messages?.length || 0} messages
                    </span>
                    <span className={`font-medium ${conv.human_takeover_active ? 'text-amber-400 font-bold' : isSelected ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {conv.human_takeover_active ? '● Human Active' : '● Alpha Managed'}
                    </span>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <EmptyState
              title="No Conversations Yet"
              description="Alpha is waiting for visitors. Once a visitor starts chatting on your website, conversations stream here in real time."
            />
          )}
        </div>

        {/* Right Column: Active Conversation Chat Stream + Sales Intelligence Brief */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {activeConv ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
              {/* Center: Chat Thread */}
              <div className="md:col-span-7 flex flex-col rounded-2xl bg-white dark:bg-[#0C0C0E] border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-2xs">
                {/* Chat Top Bar */}
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-bold text-xs font-mono">
                      {activeConv.customer_name ? activeConv.customer_name[0].toUpperCase() : 'V'}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-neutral-950 dark:text-white">
                        {activeConv.customer_name || 'Website Visitor'}
                      </h3>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                        <span>ID: {(activeConv.conversation_id || activeConv.id).substring(0, 8)}...</span>
                        <span aria-hidden="true">·</span>
                        <LiveIndicator label="Connected" size="sm" variant="gold" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {matchingLead && (
                      <PremiumButton
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectInquiry?.(matchingLead)}
                      >
                        View Lead Brief
                      </PremiumButton>
                    )}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                  {activeConv.messages && activeConv.messages.length > 0 ? (
                    activeConv.messages.map((m, idx) => {
                      const isCustomer = m.sender === 'customer';
                      return (
                        <div
                          key={idx}
                          className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                              isCustomer
                                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-xs'
                                : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-br-xs font-medium shadow-2xs'
                            }`}
                          >
                            <div className="text-[9px] font-mono opacity-50 mb-0.5">
                              {isCustomer ? activeConv.customer_name || 'Visitor' : 'Alpha (AI Sales Manager)'}
                            </div>
                            <p>{m.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-xs text-neutral-400">
                      No messages recorded in this session.
                    </div>
                  )}
                </div>

                {/* Human Takeover Prompt / Composer */}
                <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Alpha is autonomously responding using your verified Company Brain.</span>
                  </span>
                </div>
              </div>

              {/* Right: Real-Time AI Lead Brief Drawer */}
              <div className="md:col-span-5 space-y-4">
                {matchingLead ? (
                  <AILeadBriefCard
                    lead={matchingLead}
                    onViewDetail={() => onSelectInquiry?.(matchingLead)}
                  />
                ) : (
                  <TiltCard className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-950 dark:text-white">
                        Visitor Intent State
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Discovery Mode
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Alpha is engaging the prospect with consultative discovery questions. If commercial intent is validated, a structured AI Lead Brief will materialize here automatically.
                    </p>
                  </TiltCard>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Select a Conversation"
              description="Choose any active visitor stream from the left list to review Alpha's live responses."
            />
          )}
        </div>
      </div>
    </div>
  );
};
