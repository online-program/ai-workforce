import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal.tsx';
import { Logo } from './Logo.tsx';

interface PortfolioInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioInquiryModal: React.FC<PortfolioInquiryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('Business inquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMsg = message.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!cleanMsg) {
      setErrorMsg('Please describe your inquiry or project.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/portfolio-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          inquiryType,
          message: cleanMsg,
          source: 'portfolio_inquiry',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setName('');
          setEmail('');
          setMessage('');
          onClose();
        }, 2200);
      } else {
        setErrorMsg(data?.error || 'Unable to submit your inquiry right now. Please try again later.');
      }
    } catch {
      setErrorMsg('Network error while submitting inquiry. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Logo size="xs" showText={false} />
          <span className="font-bold text-sm sm:text-base text-black dark:text-white">
            Portfolio & Business Inquiry
          </span>
        </div>
      }
      subtitle="Connect regarding partnerships, advisory, enterprise deployment, or collaborations."
      maxWidthClass="max-w-lg"
    >
      {isSuccess ? (
        <div className="py-8 px-4 text-center space-y-3 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-black dark:text-white">
            Thanks — your inquiry has been received.
          </h3>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Our team will review your project details and follow up directly via email.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Your Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Miller"
              required
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              required
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Inquiry Type
            </label>
            <select
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            >
              <option value="Business inquiry">Business inquiry</option>
              <option value="Partnership">Partnership</option>
              <option value="Collaboration">Collaboration</option>
              <option value="Portfolio inquiry">Portfolio inquiry</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your organization, project scope, or collaboration ideas..."
              required
              className="w-full p-3 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
