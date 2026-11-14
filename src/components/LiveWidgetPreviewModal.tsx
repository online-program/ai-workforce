import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, Sparkles, ExternalLink, ShieldCheck, Globe, Laptop, Smartphone } from 'lucide-react';
import { CompanyProfile, InquiryLead } from '../types.ts';
import { CustomerChatWidget } from './CustomerChatWidget.tsx';

interface LiveWidgetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  userId?: string;
  onLeadAutoCreated?: (lead: InquiryLead) => void;
  onNavigateToStudio?: () => void;
}

export const LiveWidgetPreviewModal: React.FC<LiveWidgetPreviewModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  userId,
  onLeadAutoCreated,
  onNavigateToStudio,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0C0C0E] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[820px] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-black/60">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-neutral-950 dark:text-white uppercase tracking-wider font-mono">
                Alpha Live Preview
              </span>
            </div>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span className="hidden sm:inline-block text-[11px] text-neutral-500">
              Simulated sandbox grounded in {companyProfile.name || 'Company Brain'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Viewport switch */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white font-semibold shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950'
                }`}
                title="Desktop View"
              >
                <Laptop className="w-3 h-3" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white font-semibold shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile</span>
              </button>
            </div>

            {/* Reset Chat */}
            <button
              type="button"
              onClick={() => setResetKey((k) => k + 1)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
              title="Reset conversation state"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sandbox Content Container */}
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-6 overflow-hidden flex flex-col items-center justify-center relative">
          {/* Simulated Browser Frame */}
          <div
            className={`w-full h-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-lg overflow-hidden flex flex-col relative transition-all duration-300 ${
              viewportMode === 'mobile' ? 'max-w-[420px]' : 'max-w-3xl'
            }`}
          >
            {/* Simulated Address Bar */}
            <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900/50 flex items-center space-x-2">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
              <div className="flex-1 px-3 py-0.5 rounded-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono text-neutral-500 truncate text-center">
                https://{companyProfile.website?.replace(/^https?:\/\//, '') || 'yourbusiness.com'}/demo
              </div>
            </div>

            {/* Interactive Widget Display */}
            <div className="flex-1 relative overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/50">
              <CustomerChatWidget
                key={`preview-widget-${resetKey}`}
                companyProfile={companyProfile}
                isOpen={true}
                onClose={onClose}
                isSimulatedPreview={true}
                userId={userId}
                onLeadAutoCreated={onLeadAutoCreated}
              />
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="px-5 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-black/60 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Sandbox mode · Production website remains unaffected until deployed</span>
          {onNavigateToStudio && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToStudio();
              }}
              className="text-neutral-950 dark:text-white font-semibold hover:underline cursor-pointer"
            >
              Customize in Widget Studio →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
