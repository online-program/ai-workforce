import React, { useState, useEffect } from 'react';
import { Send, Edit3, Copy, Check, AlertCircle, Mail, FileText, CheckCircle2, ShieldCheck, Trash2, ArrowRight, Loader2, RefreshCw, Download, MessageSquare, Bot, User, PhoneCall } from 'lucide-react';
import { InquiryLead, LeadStatus } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { validateRecipientEmail, ValidateEmailResponse, getUserConversation } from '../services/workspaceService.ts';
import { Modal } from './ui/Modal.tsx';

interface InquiryDetailModalProps {
  lead: InquiryLead | null;
  companyName?: string;
  onClose: () => void;
  onApproveAndSend: (
    leadId: string,
    replyText: string,
    recipientEmailOverride?: string,
    googleAccessToken?: string
  ) =>
    | Promise<{ success: boolean; error?: string; provider?: string; email_dispatched?: boolean; email_status?: string } | void>
    | { success: boolean; error?: string; provider?: string; email_dispatched?: boolean; email_status?: string }
    | void;
  onRejectInquiry: (leadId: string, reason?: string) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  onUpdateReplyDraft: (leadId: string, newDraft: string) => void;
  onSaveManualNotes?: (leadId: string, notes: string) => Promise<void> | void;
  onDeleteInquiry?: (leadId: string) => void;
}

export const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({
  lead,
  companyName = 'AI Workforce',
  onClose,
  onApproveAndSend,
  onRejectInquiry,
  onUpdateLeadStatus,
  onUpdateReplyDraft,
  onSaveManualNotes,
  onDeleteInquiry,
}) => {
  const { user, accessToken } = useAuth();
  const [editableReply, setEditableReply] = useState<string>('');
  const [previousReply, setPreviousReply] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingReply, setIsEditingReply] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Manual Follow-up & Tab State
  const [activeTab, setActiveTab] = useState<'response' | 'followup'>('response');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [notesSavedNotice, setNotesSavedNotice] = useState<boolean>(false);

  // Real Email Dispatch & Validation States
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchSuccessMessage, setDispatchSuccessMessage] = useState<string | null>(null);
  const [dispatchErrorMessage, setDispatchErrorMessage] = useState<string | null>(null);

  // 5-Layer Email Validation State
  const [validationState, setValidationState] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message: string;
    errorType?: string;
    details?: any;
  }>({
    status: 'idle',
    message: '',
  });

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [customRecipientEmail, setCustomRecipientEmail] = useState<string>('');

  // Transcript Download & Conversation History States
  const [isDownloadingTranscript, setIsDownloadingTranscript] = useState<boolean>(false);
  const [transcriptDownloaded, setTranscriptDownloaded] = useState<boolean>(false);
  const [conversationMessages, setConversationMessages] = useState<Array<{ sender: string; text: string; timestamp?: string }>>([]);
  const [showTranscriptPreview, setShowTranscriptPreview] = useState<boolean>(false);

  useEffect(() => {
    if (lead) {
      const initialText = lead.draft_reply || lead.suggested_reply || '';
      const rawEmail = lead.recipient_email || lead.customer_email || (lead.contact_info?.includes('@') ? lead.contact_info : undefined) || (lead as any).email || '';
      setEditableReply(initialText);
      setPreviousReply(initialText);
      setCustomRecipientEmail(rawEmail);
      setManualNotes((lead as any).additional_notes || lead.requirements?.[0] || '');
      setIsEditingReply(false);
      setIsRejecting(false);
      setIsDeleting(false);
      setRejectionReason('');
      setIsDispatching(false);
      setDispatchSuccessMessage(null);
      setDispatchErrorMessage(null);
      setShowTranscriptPreview(false);
      setTranscriptDownloaded(false);

      // Populate conversation messages
      if (lead.messages && Array.isArray(lead.messages) && lead.messages.length > 0) {
        setConversationMessages(lead.messages);
      } else if (lead.message_history && Array.isArray(lead.message_history) && lead.message_history.length > 0) {
        setConversationMessages(lead.message_history);
      } else if ((lead as any).conversation_history && Array.isArray((lead as any).conversation_history) && (lead as any).conversation_history.length > 0) {
        setConversationMessages((lead as any).conversation_history);
      } else if ((lead as any).chat_history && Array.isArray((lead as any).chat_history) && (lead as any).chat_history.length > 0) {
        setConversationMessages((lead as any).chat_history);
      } else {
        const fallbackMsgs: Array<{ sender: string; text: string; timestamp?: string }> = [];
        const inboundText = lead.original_inquiry_text || lead.original_message || (lead as any).raw_inquiry;
        if (inboundText) {
          fallbackMsgs.push({
            sender: 'customer',
            text: inboundText,
            timestamp: lead.created_at,
          });
        }
        if (lead.draft_reply || lead.suggested_reply) {
          fallbackMsgs.push({
            sender: 'assistant',
            text: lead.draft_reply || lead.suggested_reply,
            timestamp: lead.created_at,
          });
        }

        // Check if there are cached session messages in browser storage for this explicit widget
        const explicitWidgetId = typeof (lead as any).widget_id === 'string' ? (lead as any).widget_id.trim() : '';
        if (typeof window !== 'undefined' && explicitWidgetId) {
          try {
            const storedMsgs = sessionStorage.getItem(`aiw_msgs_${explicitWidgetId}`);
            if (storedMsgs) {
              const parsed = JSON.parse(storedMsgs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setConversationMessages(parsed);
              } else {
                setConversationMessages(fallbackMsgs);
              }
            } else {
              setConversationMessages(fallbackMsgs);
            }
          } catch {
            setConversationMessages(fallbackMsgs);
          }
        } else {
          setConversationMessages(fallbackMsgs);
        }

        // Asynchronously check if there is an associated full conversation in Firestore
        const convId = lead.conversation_id || (lead.id?.startsWith('inq_') ? lead.id.replace(/^inq_/, '') : lead.id);
        if (user?.uid && convId) {
          getUserConversation(user.uid, convId).then((conv) => {
            if (conv && Array.isArray(conv.messages) && conv.messages.length > 0) {
              setConversationMessages(conv.messages);
            }
          }).catch(() => {});
        }
      }
    }
  }, [lead, user]);

  // Debounced 5-Layer Email Validation Effect
  useEffect(() => {
    const raw = customRecipientEmail.trim();
    if (!raw) {
      setValidationState({ status: 'idle', message: '' });
      return;
    }
    if (!raw.includes('@') || !raw.includes('.')) {
      setValidationState({
        status: 'invalid',
        errorType: 'invalid_format',
        message: 'Invalid email syntax format',
      });
      return;
    }

    setValidationState({ status: 'validating', message: 'Checking DNS & MX records...' });
    const timer = setTimeout(async () => {
      try {
        const res = await validateRecipientEmail(raw);
        if (res.valid) {
          const mxHint = res.details?.mxRecords?.[0]?.exchange
            ? ` (MX: ${res.details.mxRecords[0].exchange})`
            : '';
          setValidationState({
            status: 'valid',
            message: `Domain & Mail Server Verified${mxHint}`,
            details: res.details,
          });
        } else {
          setValidationState({
            status: 'invalid',
            errorType: res.errorType,
            message: res.message,
            details: res.details,
          });
        }
      } catch (err: any) {
        setValidationState({
          status: 'invalid',
          errorType: 'dns_lookup_failed',
          message: 'Unable to verify recipient domain DNS',
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [customRecipientEmail]);

  useEffect(() => {
    if (!lead) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true');

      // 1. Universal Cmd/Ctrl + Enter to approve & send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isEditingReply) {
          handleSaveChanges();
        }
        handleApprove();
        return;
      }

      // If user is editing reply text or entering rejection reason, don't hijack letters
      if (isTyping) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'e') {
        e.preventDefault();
        setIsEditingReply(true);
      } else if (key === 'c') {
        e.preventDefault();
        handleCopy(editableReply);
      } else if (key === 'r') {
        e.preventDefault();
        setIsRejecting(true);
      } else if (key === 'd') {
        e.preventDefault();
        handleDownloadTranscript();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lead, editableReply, isEditingReply, isRejecting, rejectionReason, customRecipientEmail, accessToken, conversationMessages]);

  if (!lead) return null;

  const hasValidRecipient = Boolean(customRecipientEmail && customRecipientEmail.includes('@'));

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Real Multi-Provider Approve & Send with Pre-validation
  const handleApprove = async () => {
    if (isDispatching) return;
    setDispatchErrorMessage(null);
    setDispatchSuccessMessage(null);

    const emailToSend = customRecipientEmail.trim();
    if (!emailToSend) {
      setDispatchErrorMessage('Cannot send: Customer recipient email is required.');
      return;
    }

    setIsDispatching(true);
    try {
      // Step 1: Pre-send validation check
      const val = await validateRecipientEmail(emailToSend);
      if (!val.valid) {
        setDispatchErrorMessage(`Validation Rejected: ${val.message}. Inquiry remains in review.`);
        setIsDispatching(false);
        return;
      }

      // Step 2: Real email dispatch via configured backend provider
      const res = await onApproveAndSend(
        lead.id,
        editableReply,
        emailToSend,
        accessToken || undefined
      );

      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        setDispatchErrorMessage(
          res.error || 'Provider rejected email dispatch. Inquiry remains in review.'
        );
        setIsDispatching(false);
        return;
      }

      const emailWasDispatched = Boolean(res && typeof res === 'object' && (res as any).email_dispatched);
      setDispatchSuccessMessage(
        emailWasDispatched
          ? `Response approved, sent via ${(res as any).provider || 'email'}, and published into visitor conversation! Status moved to Waiting for Customer.`
          : 'Response approved and published into visitor live chat (external email delivery not active). Status moved to Waiting for Customer.'
      );

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error approving and sending inquiry:', err);
      setDispatchErrorMessage(err.message || 'Dispatch failed. Inquiry remains in review.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSaveChanges = () => {
    onUpdateReplyDraft(lead.id, editableReply);
    setPreviousReply(editableReply);
    setIsEditingReply(false);
  };

  const handleCancelEdit = () => {
    setEditableReply(previousReply);
    setIsEditingReply(false);
  };

  const handleConfirmReject = () => {
    onRejectInquiry(lead.id, rejectionReason);
    onClose();
  };

  const handleConfirmDelete = () => {
    if (onDeleteInquiry) {
      onDeleteInquiry(lead.id);
    }
    onClose();
  };

  const generateTranscriptText = (
    leadData: InquiryLead,
    messages: Array<{ sender: string; text: string; timestamp?: string }>
  ): string => {
    const divider = '='.repeat(80);
    const subDivider = '-'.repeat(80);
    const now = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const leadScore = leadData.lead_score || leadData.lead_temperature || 'WARM';
    const customer = leadData.customer_name || 'Website Visitor';
    const company =
      leadData.company_name && leadData.company_name !== 'Unknown' && leadData.company_name !== customer
        ? leadData.company_name
        : leadData.companyName || 'Not Specified';
    const contact =
      leadData.contact_info ||
      leadData.customer_email ||
      leadData.recipient_email ||
      customRecipientEmail ||
      'Not Provided';
    const source = leadData.source || leadData.channel || 'Website Chat (Alpha AI Sales Manager)';
    const intent = leadData.customer_intent || 'Inbound Commercial Inquiry';
    const status = leadData.status || 'Needs Approval';
    const product = leadData.product_or_service || 'Not Specified';
    const quantity = leadData.quantity || 'Not Specified';
    const location = leadData.location || 'Not Specified';
    const timeline = leadData.deadline || leadData.timeline || 'Not Specified';
    const budget = leadData.budget || 'Not Specified';
    const reason =
      leadData.lead_reason || leadData.temperature_reason || 'Verified customer commercial intent.';
    const nextAction =
      leadData.recommended_action || leadData.recommended_next_action || 'Review and dispatch proposal.';

    const lines: string[] = [];

    // Header section
    lines.push(divider);
    lines.push(`AI WORKFORCE — SALES CONVERSATION TRANSCRIPT`);
    lines.push(`Managed by Alpha (AI Sales Manager) · ${companyName}`);
    lines.push(divider);
    lines.push(`Exported On          : ${now}`);
    lines.push(`Inquiry Reference ID : ${leadData.id}`);
    if (leadData.conversation_id) {
      lines.push(`Conversation ID      : ${leadData.conversation_id}`);
    }
    lines.push(`Customer / Prospect  : ${customer}`);
    lines.push(`Company / Org        : ${company}`);
    lines.push(`Contact Info         : ${contact}`);
    lines.push(`Acquisition Channel  : ${source}`);
    lines.push(`Intent Classification: ${intent}`);
    lines.push(`Lead Score / Intent  : ${leadScore} INTENT`);
    lines.push(`Workflow Status      : ${status}`);
    lines.push(divider);
    lines.push('');

    // Commercial Scope & Requirements
    lines.push(subDivider);
    lines.push(`QUALIFIED COMMERCIAL SCOPE & CUSTOMER FACTS`);
    lines.push(subDivider);
    lines.push(`Product / Service    : ${product}`);
    lines.push(`Quantity / Scope     : ${quantity}`);
    lines.push(`Service Location     : ${location}`);
    lines.push(`Target Timeline      : ${timeline}`);
    lines.push(`Estimated Budget     : ${budget}`);
    lines.push(`Qualification Reason : ${reason}`);
    lines.push(`Recommended Action   : ${nextAction}`);

    if (leadData.requirements && Array.isArray(leadData.requirements) && leadData.requirements.length > 0) {
      lines.push(`Specific Requirements:`);
      leadData.requirements.forEach((req, idx) => {
        lines.push(`  ${idx + 1}. ${req}`);
      });
    } else if (typeof leadData.requirements === 'string' && leadData.requirements.trim()) {
      lines.push(`Specific Requirements: ${leadData.requirements}`);
    }

    if (leadData.customer_facts && Array.isArray(leadData.customer_facts) && leadData.customer_facts.length > 0) {
      lines.push(`Verified Customer Facts:`);
      leadData.customer_facts.forEach((fact: any) => {
        lines.push(`  • ${fact.label || 'Fact'}: ${fact.value}${fact.verified ? ' [Verified]' : ''}`);
      });
    }

    if (
      leadData.missing_information &&
      Array.isArray(leadData.missing_information) &&
      leadData.missing_information.length > 0 &&
      leadData.missing_information[0] !== 'None'
    ) {
      lines.push(`Open Follow-up Items:`);
      leadData.missing_information.forEach((item: string) => {
        lines.push(`  - ${item}`);
      });
    }
    lines.push('');

    // Full Chat Conversation History
    lines.push(subDivider);
    lines.push(`FULL CHAT CONVERSATION HISTORY`);
    lines.push(subDivider);

    if (messages && messages.length > 0) {
      messages.forEach((msg, idx) => {
        const timeStr = msg.timestamp
          ? new Date(msg.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : `Turn ${idx + 1}`;

        let senderLabel = 'CUSTOMER';
        if (msg.sender === 'assistant' || msg.sender === 'bot') {
          senderLabel = 'ALPHA (AI Sales Manager)';
        } else if (msg.sender === 'user' || msg.sender === 'customer') {
          senderLabel = `CUSTOMER (${customer})`;
        } else if (msg.sender === 'system') {
          senderLabel = 'SYSTEM';
        } else {
          senderLabel = (msg.sender || 'AGENT').toUpperCase();
        }

        lines.push(`[${timeStr}] ${senderLabel}:`);
        lines.push(msg.text || '');
        lines.push('');
      });
    } else {
      const inboundText =
        leadData.original_inquiry_text || leadData.original_message || (leadData as any).raw_inquiry;
      if (inboundText) {
        lines.push(`[INBOUND MESSAGE] CUSTOMER (${customer}):`);
        lines.push(inboundText);
        lines.push('');
      }

      const replyDraft = editableReply || leadData.draft_reply || leadData.suggested_reply;
      if (replyDraft) {
        lines.push(`[RECOMMENDED PROPOSAL] ALPHA (AI Sales Manager):`);
        lines.push(replyDraft);
        lines.push('');
      }
    }

    // Email Dispatch Record if email was sent
    if (leadData.email_dispatched || leadData.email_dispatch) {
      lines.push(subDivider);
      lines.push(`EMAIL DISPATCH AUDIT TRAIL`);
      lines.push(subDivider);
      const disp = leadData.email_dispatch || {};
      lines.push(`Recipient     : ${leadData.email_recipient || disp.recipient || contact}`);
      lines.push(`Dispatched At : ${leadData.email_dispatched_at || disp.sent_at || 'Recent'}`);
      lines.push(`Provider      : ${disp.provider || 'SMTP / Gmail Integration'}`);
      lines.push(`Status        : ${leadData.email_status || disp.status || 'accepted'}`);
      if (disp.subject) lines.push(`Subject       : ${disp.subject}`);
      if (disp.message) {
        lines.push(`Dispatched Reply Body :`);
        lines.push(disp.message);
      }
      lines.push('');
    }

    // Security & Audit Footer
    lines.push(divider);
    lines.push(`END OF TRANSCRIPT — AI WORKFORCE`);
    lines.push(`Security & Audit Notice: Confidential commercial record for internal review.`);
    lines.push(divider);

    return lines.join('\n');
  };

  const handleDownloadTranscript = () => {
    if (!lead) return;
    setIsDownloadingTranscript(true);
    try {
      const transcriptText = generateTranscriptText(lead, conversationMessages);
      const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const safeCustomer = (lead.customer_name || 'customer')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 24);
      const safeId = lead.id.replace(/[^a-z0-9_-]/g, '').slice(0, 10);
      const dateStr = new Date().toISOString().split('T')[0];

      a.href = url;
      a.download = `chat-transcript-${safeCustomer}-${safeId}-${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTranscriptDownloaded(true);
      setTimeout(() => {
        setTranscriptDownloaded(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to download transcript:', err);
    } finally {
      setIsDownloadingTranscript(false);
    }
  };

  const handleSaveManualNotes = async () => {
    if (!lead) return;
    if (onSaveManualNotes) {
      await onSaveManualNotes(lead.id, manualNotes);
    } else {
      onUpdateLeadStatus(lead.id, lead.status || 'Needs Approval');
    }
    setNotesSavedNotice(true);
    setTimeout(() => setNotesSavedNotice(false), 2500);
  };

  const handleMarkContacted = () => {
    if (!lead) return;
    onUpdateLeadStatus(lead.id, 'Waiting for Customer');
    setDispatchSuccessMessage('Visitor marked as contacted / Waiting for Customer.');
    setTimeout(() => setDispatchSuccessMessage(null), 3000);
  };

  const scoreBadgeColor =
    lead.lead_score === 'HOT' || lead.lead_temperature === 'HOT'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      : lead.lead_score === 'WARM' || lead.lead_temperature === 'WARM'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 border-slate-200 dark:border-neutral-700';

  const recipientEmail = lead.contact_info || (lead as any).email || 'Customer';

  const headerBadge = (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${scoreBadgeColor}`}>
      {lead.lead_score || lead.lead_temperature || 'WARM'} INTENT
    </span>
  );

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const modalFooter = (
    <div className="w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRejecting(true)}
          disabled={isDispatching}
          className="flex-1 sm:flex-none px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors cursor-pointer border border-slate-200 dark:border-neutral-700 flex items-center justify-center space-x-1.5 disabled:opacity-50"
          title="Press 'R' to reject inquiry"
        >
          <span>Reject</span>
          <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300">
            R
          </kbd>
        </button>

        {onDeleteInquiry && (
          <button
            type="button"
            onClick={() => setIsDeleting(true)}
            disabled={isDispatching}
            className="p-2.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900 disabled:opacity-50"
            title="Delete this inquiry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={
            isDispatching ||
            isEditingReply ||
            validationState.status === 'invalid' ||
            !customRecipientEmail.trim()
          }
          className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 interactive-button space-x-1.5"
          title={`Press ${modKey}+Enter to approve & send`}
        >
          {isDispatching ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Publishing to Conversation...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Approve & Send</span>
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
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={lead.customer_name || lead.companyName || 'Inquiry Analysis'}
        subtitle={`Channel: ${lead.source || 'Inbound'} · Logged: ${lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Today'}`}
        headerBadge={headerBadge}
        maxWidthClass="max-w-2xl"
        footer={modalFooter}
      >
        {/* Feedback messages */}
        {dispatchSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{dispatchSuccessMessage}</span>
          </div>
        )}

        {dispatchErrorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-rose-900 dark:text-rose-200">Dispatch Rejected</span>
              <span>{dispatchErrorMessage}</span>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('response')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'response'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Response & Approval</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followup')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'followup'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Manual Follow-up & Contact</span>
          </button>
        </div>

        {activeTab === 'followup' ? (
          <div className="space-y-4 font-sans animate-in fade-in pb-2">
            {/* Contact Details Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-neutral-300">
                <span>VISITOR CONTACT DIRECTORY</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Status: {lead.status || 'Needs Approval'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Name</span>
                  <span className="font-semibold text-black dark:text-white">{lead.customer_name || 'Not Provided'}</span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company</span>
                  <span className="font-semibold text-black dark:text-white">{lead.company_name || lead.companyName || 'Not Provided'}</span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                    {customRecipientEmail && customRecipientEmail.includes('@') && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(customRecipientEmail);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copied ? 'Copied!' : 'Copy Email'}</span>
                        </button>
                        <a
                          href={`mailto:${customRecipientEmail}?subject=Regarding%20your%20inquiry%20with%20${encodeURIComponent(companyName)}&body=Hi%20${encodeURIComponent(lead.customer_name || 'there')},%0A%0AWe%20received%20your%20inquiry%20regarding%20${encodeURIComponent(lead.product_or_service || 'our services')}.%0A%0ABest%20regards,%0A${encodeURIComponent(companyName)}`}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-black text-white dark:bg-white dark:text-black hover:opacity-90 flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Open Email Client</span>
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-xs text-black dark:text-white font-medium">
                    {customRecipientEmail || lead.contact_info || 'No email address on file'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                    {(lead as any).customer_phone ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText((lead as any).customer_phone || '');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Phone</span>
                        </button>
                        <a
                          href={`tel:${(lead as any).customer_phone}`}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Open Phone Dialer</span>
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-black dark:text-white font-medium">
                    {(lead as any).customer_phone || 'No phone number provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Internal Follow-up Notes Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">INTERNAL FOLLOW-UP NOTES</span>
                {notesSavedNotice && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Notes Saved
                  </span>
                )}
              </div>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Log internal follow-up remarks, client preferences, or call outcomes..."
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white font-sans"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkContacted}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                  >
                    Mark Contacted
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateLeadStatus) onUpdateLeadStatus(lead.id, 'Needs Approval');
                      setDispatchSuccessMessage('Follow-up task scheduled for tomorrow.');
                      setTimeout(() => setDispatchSuccessMessage(null), 3000);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Schedule Follow-up (+1 Day)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveManualNotes}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer & Company Headline */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-neutral-400 font-semibold mb-1 gap-2">
                <span>CUSTOMER & INQUIRY SCOPE</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 dark:text-neutral-500 text-[11px]">ID: {lead.id.slice(0, 8)}</span>
                  <button
                    type="button"
                    onClick={handleDownloadTranscript}
                    disabled={isDownloadingTranscript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Download full chat transcript as formatted text file (or press 'D')"
                  >
                    {transcriptDownloaded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                        <span>Transcript Downloaded</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Chat Transcript</span>
                        <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-neutral-800 text-neutral-300 dark:bg-neutral-200 dark:text-neutral-700">
                          D
                        </kbd>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <h2 className="text-base font-bold text-black dark:text-white">
                {lead.customer_name} {lead.company_name && lead.company_name !== 'Unknown' && lead.company_name !== lead.customer_name ? `· ${lead.company_name}` : ''}
              </h2>

              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-neutral-300 mt-1.5">
                {lead.quantity && lead.quantity !== 'Unknown' && (
                  <span className="font-bold text-black dark:text-white">
                    {lead.quantity}
                    {!/unit|license|seat|engineer|person|user|cohort|hr|hour|participant/i.test(lead.quantity)
                      ? ' units'
                      : ''}
                  </span>
                )}
                {lead.product_or_service && lead.product_or_service !== 'Unknown' && (
                  <span>· {lead.product_or_service}</span>
                )}
                {lead.location && lead.location !== 'Unknown' && (
                  <span>· 📍 {lead.location}</span>
                )}
                {lead.contact_info && lead.contact_info !== 'Unknown' && (
                  <span className="font-mono font-medium text-black dark:text-white">· ✉️ {lead.contact_info}</span>
                )}
              </div>

              {/* Recipient verification with Real-time 5-Layer Validator */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-neutral-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Customer Recipient Email:</span>
                  </div>
                  <div className="flex-1 max-w-sm">
                    <div className="relative">
                      <input
                        type="email"
                        value={customRecipientEmail}
                        onChange={(e) => setCustomRecipientEmail(e.target.value)}
                        placeholder="customer@domain.com"
                        className={`w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border font-mono transition-colors ${
                          validationState.status === 'valid'
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-800 text-black dark:text-white'
                            : validationState.status === 'invalid'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            : 'bg-white dark:bg-black border-slate-200 dark:border-neutral-800 text-black dark:text-white'
                        } focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white`}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        {validationState.status === 'validating' && (
                          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                        )}
                        {validationState.status === 'valid' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        {validationState.status === 'invalid' && (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Feedback Line */}
                {validationState.message && (
                  <div
                    className={`text-[11px] flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-md transition-colors ${
                      validationState.status === 'valid'
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                        : validationState.status === 'invalid'
                        ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                        : 'text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800'
                    }`}
                  >
                    {validationState.status === 'validating' && (
                      <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                    )}
                    {validationState.status === 'valid' && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                    )}
                    {validationState.status === 'invalid' && (
                      <AlertCircle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{validationState.message}</span>
                  </div>
                )}
              </div>
            </div>

        {/* Original Inbound Text & Multi-turn Chat Thread */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 text-[11px] flex items-center gap-2">
              <span>Customer Conversation & Inbound History</span>
              {conversationMessages.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                  {conversationMessages.length} messages
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {conversationMessages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowTranscriptPreview(!showTranscriptPreview)}
                  className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Toggle conversation thread view"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{showTranscriptPreview ? 'Compact View' : 'View Full Thread'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadTranscript}
                disabled={isDownloadingTranscript}
                className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 transition-colors"
                title="Save full transcript as formatted .txt file"
              >
                {transcriptDownloaded ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Downloaded</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Download .txt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {showTranscriptPreview && conversationMessages.length > 1 ? (
            <div className="max-h-64 overflow-y-auto p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 font-sans">
              {conversationMessages.map((m, idx) => {
                const isCustomer = m.sender === 'user' || m.sender === 'customer';
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        isCustomer
                          ? 'bg-slate-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200'
                          : 'bg-black text-white dark:bg-white dark:text-black font-bold'
                      }`}
                    >
                      {isCustomer ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {isCustomer ? (lead.customer_name || 'Customer') : 'Alpha (AI Sales Manager)'}
                        </span>
                        {m.timestamp && (
                          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-neutral-200 leading-relaxed font-sans">
              "{lead.original_inquiry_text || (lead as any).original_message || (lead as any).raw_inquiry || 'Inquiry received via website chat.'}"
            </div>
          )}
        </div>

        {/* Extracted Facts */}
        <div className="space-y-1.5">
          <div className="font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 text-[11px]">
            Extracted Facts & Requirements
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-slate-500 dark:text-neutral-400 text-[10px] block font-semibold uppercase">Product / Service</span>
              <span className="font-bold text-black dark:text-white truncate">{lead.product_or_service || 'Unspecified'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-slate-500 dark:text-neutral-400 text-[10px] block font-semibold uppercase">Quantity / Volume</span>
              <span className="font-bold text-black dark:text-white truncate">{lead.quantity || 'Unspecified'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-slate-500 dark:text-neutral-400 text-[10px] block font-semibold uppercase">Location</span>
              <span className="font-bold text-black dark:text-white truncate">{lead.location || 'Unspecified'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-slate-500 dark:text-neutral-400 text-[10px] block font-semibold uppercase">Timeline</span>
              <span className="font-bold text-black dark:text-white truncate">{lead.deadline || lead.timeline || 'Unspecified'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 sm:col-span-2">
              <span className="text-slate-500 dark:text-neutral-400 text-[10px] block font-semibold uppercase">Qualification Reason</span>
              <span className="font-medium text-slate-800 dark:text-neutral-200 text-[11px] line-clamp-2">
                {lead.lead_reason || lead.temperature_reason || 'Verified customer intent.'}
              </span>
            </div>
          </div>
        </div>

        {/* AI Draft Proposal & Recommended Response */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 text-[11px] flex items-center gap-1.5">
              <span>AI Recommended Response</span>
              {lead.source && lead.source.toLowerCase() !== 'website' && (
                <span className="text-[10px] font-normal lowercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                  Ready to copy
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {!isEditingReply && (
                <button
                  type="button"
                  onClick={() => setIsEditingReply(true)}
                  className="text-[11px] text-slate-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                  title="Press 'E' to edit draft"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Draft</span>
                  <kbd className="hidden sm:inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-mono font-bold rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                    E
                  </kbd>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopy(editableReply)}
                className="text-[11px] text-black dark:text-white hover:underline flex items-center gap-1.5 cursor-pointer font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700"
                title="Press 'C' to copy text"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Response'}</span>
                <kbd className="hidden sm:inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-mono font-bold rounded bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                  C
                </kbd>
              </button>
            </div>
          </div>

          {isEditingReply ? (
            <div className="space-y-2">
              <textarea
                rows={6}
                value={editableReply}
                onChange={(e) => setEditableReply(e.target.value)}
                className="w-full p-3.5 text-xs bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl text-black dark:text-white leading-relaxed focus:outline-none font-sans"
                placeholder="Modify draft reply..."
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer shadow-xs"
                >
                  Save Draft
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed font-sans">
              {editableReply}
            </div>
          )}

          {/* External Channel Prompt */}
          {lead.source && lead.source.toLowerCase() !== 'website' && (
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 italic pt-0.5">
              Tip: Copy and paste this recommended response into your customer channel ({lead.source}) to reply directly.
            </p>
          )}
        </div>

        {/* Delete Confirmation Interface */}
        {isDeleting && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5 animate-in fade-in">
            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Delete This Inquiry?
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              Are you sure you want to permanently remove this inquiry from your dashboard? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Yes, Delete Inquiry
              </button>
            </div>
          </div>
        )}

        {/* Rejection Prompt Interface */}
        {isRejecting && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5 animate-in fade-in">
            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Reject Customer Inquiry
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              Provide an optional reason for marking this inquiry as Rejected:
            </p>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Out of stock / Unserviceable location / Duplicate inquiry"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-black border border-rose-300 dark:border-rose-700 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-600"
            />
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {/* Change Stage Dropdown */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Lead Stage:</span>
          <select
            value={lead.status}
            onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
            className="text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-neutral-200 font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer"
          >
            <option value="New">New</option>
            <option value="Analyzed">Analyzed</option>
            <option value="Needs Approval">Needs Approval</option>
            <option value="Waiting for Customer">Waiting for Customer</option>
            <option value="Follow-up Due">Follow-up Due</option>
            <option value="Qualified">Qualified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>
      )}
      </Modal>
    </>
  );
};
