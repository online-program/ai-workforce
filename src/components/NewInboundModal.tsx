import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { CompanyProfile, InquiryLead, LeadSource } from '../types.ts';
import { Modal } from './ui/Modal.tsx';

interface NewInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  onInquiryAnalyzed: (newLead: InquiryLead) => void;
}

export const NewInboundModal: React.FC<NewInboundModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  onInquiryAnalyzed,
}) => {
  const [customerName, setCustomerName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [source, setSource] = useState<LeadSource>('Email');
  const [inquiryText, setInquiryText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!inquiryText.trim()) {
      setError('Please enter the customer inquiry message.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryText: inquiryText.trim(),
          companyProfile,
          source,
          customerName: customerName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const result = await response.json();

      const newLead: InquiryLead = {
        id: 'lead_' + Math.random().toString(36).substring(2, 9),
        customer_name: customerName.trim() || result.customer_name || 'Inbound Prospect',
        companyName: customerName.trim() || result.customer_name || 'Inbound Prospect',
        company_name: customerName.trim() || result.customer_name || 'Inbound Prospect',
        contactName: contactName.trim() || undefined,
        source: source,
        status: 'Needs Approval',
        original_message: inquiryText.trim(),
        raw_inquiry: inquiryText.trim(),
        lead_temperature: result.lead_temperature || result.lead_score || 'WARM',
        lead_score: result.lead_temperature || result.lead_score || 'WARM',
        temperature_reason: result.temperature_reason || result.lead_reason || 'Inbound commercial inquiry processed.',
        lead_reason: result.lead_reason || result.temperature_reason || 'Inbound commercial inquiry processed.',
        customer_intent: result.customer_intent || 'Commercial Inquiry',
        product_or_service: result.product_or_service || 'Solution',
        quantity: result.quantity || 'Unknown',
        location: result.location || 'Unknown',
        deadline: result.deadline || 'Unknown',
        budget: result.budget || 'Unknown',
        requirements: Array.isArray(result.requirements)
          ? result.requirements
          : typeof result.requirements === 'string'
          ? [result.requirements]
          : ['None'],
        customer_facts: Array.isArray(result.customer_facts)
          ? result.customer_facts.map((f: any) =>
              typeof f === 'string' ? { label: 'Extracted Fact', value: f, verified: true } : f
            )
          : [
              { label: 'Product/Service', value: result.product_or_service || 'Unknown', verified: true },
              { label: 'Quantity', value: result.quantity || 'Unknown', verified: true },
              { label: 'Location', value: result.location || 'Unknown', verified: true },
            ],
        missing_information: Array.isArray(result.missing_information)
          ? result.missing_information
          : ['None'],
        recommended_action: result.recommended_action || result.recommended_next_action || 'Review inquiry and approve proposal.',
        recommended_next_action: result.recommended_next_action || result.recommended_action || 'Review inquiry and approve proposal.',
        draft_reply: result.draft_reply || result.suggested_reply || 'Thank you for reaching out. We are reviewing your requirements and will follow up shortly.',
        suggested_reply: result.suggested_reply || result.draft_reply || 'Thank you for reaching out. We are reviewing your requirements and will follow up shortly.',
        sales_summary: result.sales_summary || `${result.lead_temperature || 'WARM'} lead: ${result.quantity !== 'Unknown' ? `${result.quantity} ` : ''}${result.product_or_service || 'Solution'}${result.location !== 'Unknown' ? ` in ${result.location}` : ''}.`,
        created_at: new Date().toISOString(),
        last_action_at: new Date().toISOString(),
      };

      onInquiryAnalyzed(newLead);
      onClose();
    } catch (err: any) {
      console.error('Inquiry analysis error:', err);
      setError(err.message || 'An error occurred during analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && inquiryText.trim()) {
        handleAnalyze();
      }
    }
  };

  const modalFooter = (
    <div className="w-full flex items-center justify-between pt-2">
      <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium truncate max-w-[200px] sm:max-w-none">
        Context: {companyProfile.name}
      </span>

      <div className="flex items-center space-x-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isLoading || !inquiryText.trim()}
          className="inline-flex items-center px-5 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs disabled:opacity-50 interactive-button space-x-1.5"
          title={`Press ${modKey}+Enter to analyze`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze Inquiry</span>
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-neutral-800 text-neutral-300 dark:bg-neutral-200 dark:text-neutral-700">
                {modKey}+↵
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Inbound Inquiry"
      subtitle="Alpha extracts facts, scores intent, and drafts a proposal."
      maxWidthClass="max-w-xl"
      footer={modalFooter}
    >
      {/* Input Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1">
              Customer / Organization
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Prospect Company"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1">
              Contact Name <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Lead Contact"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1">
            Source Channel
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer font-medium"
          >
            <option value="Email">Email</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Website">Website</option>
            <option value="Phone">Phone</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1">
            Customer Message / Inquiry Text <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            value={inquiryText}
            onChange={(e) => setInquiryText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste customer inquiry, RFQ requirements, or message here..."
            required
            className="w-full p-3.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white font-sans"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
