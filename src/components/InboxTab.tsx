import React, { useState } from 'react';
import { Plus, Search, Filter, Flame, Zap, Snowflake, Clock, CheckCircle2, AlertCircle, ArrowRight, MessageSquare, Mail, RefreshCw } from 'lucide-react';
import { InquiryLead, LeadStatus, LeadScore } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchInboundGmailInquiries } from '../services/gmailService.ts';

interface InboxTabProps {
  leads: InquiryLead[];
  onSelectLead: (lead: InquiryLead) => void;
  onOpenNewInquiryModal: () => void;
  onLeadAutoCreated?: (lead: InquiryLead) => void;
}

export const InboxTab: React.FC<InboxTabProps> = ({
  leads,
  onSelectLead,
  onOpenNewInquiryModal,
  onLeadAutoCreated,
}) => {
  const { user, accessToken, connectGmail, isGmailConnected } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [isSyncingGmail, setIsSyncingGmail] = useState<boolean>(false);
  const [gmailSyncNotice, setGmailSyncNotice] = useState<string | null>(null);

  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (filterStatus === 'needs_approval' && lead.status !== 'Needs Approval') return false;
    if (filterStatus === 'waiting' && lead.status !== 'Waiting for Customer') return false;
    if (filterStatus === 'follow_up' && lead.status !== 'Follow-up Due') return false;
    if (filterStatus === 'hot' && lead.lead_score !== 'HOT') return false;
    if (filterStatus === 'won' && lead.status !== 'Won') return false;

    // Score filter
    if (scoreFilter !== 'all' && lead.lead_score !== scoreFilter) return false;

    // Search query: allows searching leads by customer name, company name, contact, product, or location
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const companyName = (lead.companyName || '').toLowerCase();
      const customerName = (lead.customer_name || '').toLowerCase();
      const contactName = (lead.contactName || '').toLowerCase();
      const product = (lead.product_or_service || '').toLowerCase();
      const location = (lead.location || '').toLowerCase();
      const rawInquiry = (lead.raw_inquiry || lead.original_message || '').toLowerCase();
      const intent = (lead.customer_intent || '').toLowerCase();

      const match =
        companyName.includes(q) ||
        customerName.includes(q) ||
        contactName.includes(q) ||
        product.includes(q) ||
        location.includes(q) ||
        rawInquiry.includes(q) ||
        intent.includes(q);

      if (!match) return false;
    }

    return true;
  });

  const handleSyncGmail = async () => {
    setIsSyncingGmail(true);
    setGmailSyncNotice(null);
    try {
      let token = accessToken;
      if (!token) {
        token = await connectGmail();
      }

      if (!token) {
        setGmailSyncNotice('Gmail connection required to sync inbound emails.');
        return;
      }

      const emails = await fetchInboundGmailInquiries(token, 5);
      if (emails.length === 0) {
        setGmailSyncNotice('No new inbound customer inquiries found in Gmail inbox.');
        setTimeout(() => setGmailSyncNotice(null), 4000);
        return;
      }

      let addedCount = 0;
      for (const mail of emails) {
        // Check if lead with this sender/subject already exists
        const exists = leads.some(
          (l) =>
            l.contact_info === mail.senderEmail ||
            l.raw_inquiry?.includes(mail.id) ||
            l.original_message?.includes(mail.snippet.slice(0, 30))
        );

        if (!exists && onLeadAutoCreated) {
          const newLead: InquiryLead = {
            id: `gmail-${mail.id}`,
            customer_name: mail.sender || 'Gmail Inbound Contact',
            companyName: mail.sender || 'Inbound Account',
            contactName: mail.sender,
            contact_info: mail.senderEmail,
            source: 'Email',
            channel: 'Email',
            lead_temperature: 'HOT',
            lead_score: 'HOT',
            status: 'Needs Approval',
            customer_intent: mail.subject || 'Direct Gmail Inquiry',
            original_message: mail.fullBody || mail.snippet,
            raw_inquiry: mail.fullBody || mail.snippet,
            product_or_service: 'Commercial Inquiry',
            quantity: 'Specified in message',
            location: 'Online / Inbound',
            requirements: [mail.subject],
            customer_facts: [
              { label: 'Sender', value: mail.senderEmail, verified: true },
              { label: 'Subject', value: mail.subject, verified: true },
            ],
            missing_information: ['Exact scope confirmation'],
            recommended_action: 'Review inquiry and dispatch reply via Gmail.',
            recommended_next_action: 'Review inquiry and dispatch reply via Gmail.',
            draft_reply: `Hi ${mail.sender.split(' ')[0] || 'there'},\n\nThank you for reaching out regarding "${mail.subject}". Our team has received your message and we'd be delighted to assist.\n\nCould you please confirm your expected timeline and quantities so we can prepare a detailed proposal for you?\n\nBest regards,\nSales Operations`,
            suggested_reply: `Hi ${mail.sender.split(' ')[0] || 'there'},\n\nThank you for contacting us regarding "${mail.subject}". Our team has received your inquiry.\n\nBest regards,\nSales Operations`,
            sales_summary: `Inbound email inquiry received from ${mail.sender} (${mail.senderEmail}).`,
            created_at: new Date().toISOString(),
            last_action_at: new Date().toISOString(),
          };

          onLeadAutoCreated(newLead);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        setGmailSyncNotice(`Synced ${addedCount} new email inquiry into Work Queue!`);
      } else {
        setGmailSyncNotice(`All recent ${emails.length} Gmail inquiries are already in your Work Queue.`);
      }
      setTimeout(() => setGmailSyncNotice(null), 5000);
    } catch (err: any) {
      console.error('Gmail sync failed:', err);
      setGmailSyncNotice(err.message || 'Failed to sync emails from Gmail.');
      setTimeout(() => setGmailSyncNotice(null), 5000);
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const getScoreBadge = (score: LeadScore) => {
    switch (score) {
      case 'HOT':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <span>🔥</span>
            <span>HOT</span>
          </span>
        );
      case 'WARM':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span>🟡</span>
            <span>WARM</span>
          </span>
        );
      case 'COLD':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span>🟢</span>
            <span>COLD</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'Needs Approval':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Needs Approval
          </span>
        );
      case 'Waiting for Customer':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Waiting for Customer
          </span>
        );
      case 'Follow-up Due':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Follow-up Due
          </span>
        );
      case 'Qualified':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Qualified
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700">
            {status}
          </span>
        );
    }
  };

  const needsApprovalCount = leads.filter((l) => l.status === 'Needs Approval').length;
  const followUpCount = leads.filter((l) => l.status === 'Follow-up Due').length;
  const hotCount = leads.filter((l) => l.lead_score === 'HOT').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Work Queue / Inbox</h2>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            Incoming inquiries analyzed by Alpha ready for review and action.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSyncGmail}
            disabled={isSyncingGmail}
            className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Sync inbound customer inquiries directly from your Gmail inbox"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
            <span>{isSyncingGmail ? 'Syncing Gmail...' : 'Sync Gmail'}</span>
          </button>

          <button
            onClick={onOpenNewInquiryModal}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>+ Add Inquiry</span>
          </button>
        </div>
      </div>

      {gmailSyncNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>{gmailSyncNotice}</span>
          </div>
          <button
            onClick={() => setGmailSyncNotice(null)}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-black p-3 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-2xs">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            All Work ({leads.length})
          </button>

          <button
            onClick={() => setFilterStatus('needs_approval')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
              filterStatus === 'needs_approval'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span>Needs Approval</span>
            {needsApprovalCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filterStatus === 'needs_approval' ? 'bg-white text-blue-600' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                }`}
              >
                {needsApprovalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('waiting')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'waiting'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            Waiting for Customer
          </button>

          <button
            onClick={() => setFilterStatus('follow_up')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
              filterStatus === 'follow_up'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span>Follow-up Due</span>
            {followUpCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filterStatus === 'follow_up' ? 'bg-white text-amber-600' : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                }`}
              >
                {followUpCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterStatus('hot')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
              filterStatus === 'hot'
                ? 'bg-red-600 text-white font-semibold'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span>🔥 Hot Leads</span>
            {hotCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filterStatus === 'hot' ? 'bg-white text-red-600' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}
              >
                {hotCount}
              </span>
            )}
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Search inquiries, products, contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white placeholder-gray-400 dark:placeholder-neutral-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Inquiry List */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white dark:bg-black rounded-2xl p-12 text-center border border-gray-200 dark:border-neutral-800 shadow-2xs space-y-3">
          <div className="text-4xl text-gray-300 dark:text-neutral-600">📭</div>
          <div className="text-base font-bold text-gray-900 dark:text-white">No Inquiries in this view</div>
          <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-sm mx-auto">
            All customer messages are handled. Sync new emails from Gmail or add an inquiry manually.
          </p>
          <div className="flex items-center justify-center space-x-2.5 pt-2">
            <button
              onClick={handleSyncGmail}
              className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Sync Gmail Inbound
            </button>
            <button
              onClick={onOpenNewInquiryModal}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 rounded-lg text-xs font-bold cursor-pointer"
            >
              + Add Inquiry
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const isAttention =
              lead.status === 'Needs Approval' || lead.status === 'Follow-up Due';

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`rounded-xl border p-4 sm:p-5 transition-all cursor-pointer hover:shadow-md relative ${
                  isAttention
                    ? 'border-amber-300/80 dark:border-amber-700/80 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs'
                    : 'bg-white dark:bg-black border-gray-200 dark:border-neutral-800 shadow-2xs hover:border-gray-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getScoreBadge(lead.lead_score)}
                      {getStatusBadge(lead.status)}
                      <span className="text-[11px] text-gray-400 dark:text-neutral-500 font-mono">
                        {lead.source || 'Inbound'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {lead.customer_name} {lead.company_name && lead.company_name !== 'Unknown' ? `· ${lead.company_name}` : ''}
                      </h4>
                      {lead.contact_info && lead.contact_info !== 'Unknown' && (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono hidden sm:inline truncate">
                          ({lead.contact_info})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                      "{lead.original_inquiry_text || lead.raw_inquiry || lead.original_message || 'Customer inquiry'}"
                    </p>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-gray-500 dark:text-neutral-400 pt-1">
                      {lead.product_or_service && lead.product_or_service !== 'Unknown' && (
                        <span>📦 {lead.product_or_service}</span>
                      )}
                      {lead.quantity && lead.quantity !== 'Unknown' && (
                        <span>🔢 {lead.quantity}</span>
                      )}
                      {lead.location && lead.location !== 'Unknown' && (
                        <span>📍 {lead.location}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-neutral-800">
                    <span className="text-[10px] text-gray-400 dark:text-neutral-500 font-mono">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Today'}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-bold text-black dark:text-white bg-gray-100 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
