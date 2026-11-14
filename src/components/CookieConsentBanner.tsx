import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Sliders, Check, Lock, AlertCircle, X, ChevronRight, Info } from 'lucide-react';
import {
  getStoredConsent,
  saveConsent,
  onOpenCookieSettings,
  CATEGORY_DEFINITIONS,
  ConsentCategories,
  ConsentRecord,
} from '../services/consentService.ts';

interface CookieConsentBannerProps {
  onConsentUpdated?: (consent: ConsentRecord) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onConsentUpdated }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Local draft of categories for the Customize modal
  const [categoryDraft, setCategoryDraft] = useState<ConsentCategories>({
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
  });

  // Track expanded category accordions in customize view
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    necessary: false,
    preferences: false,
    analytics: false,
    marketing: false,
  });

  const dialogRef = useRef<HTMLDivElement>(null);

  // On mount: check if consent has already been recorded
  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      // First-time visitor: reveal consent dialog after subtle delay to prevent layout jump
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // Already decided: initialize category draft from saved state
      setCategoryDraft(existing.categories);
    }
  }, []);

  // Listen for external trigger to open settings (e.g. from footer "Cookie Settings" link)
  useEffect(() => {
    const unsubscribe = onOpenCookieSettings(() => {
      const current = getStoredConsent();
      if (current) {
        setCategoryDraft(current.categories);
      }
      setSaveError(null);
      setSaveSuccessMsg(null);
      setIsCustomizeOpen(true);
      setIsVisible(true);
    });
    return unsubscribe;
  }, []);

  // Keyboard accessibility: handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        if (isCustomizeOpen) {
          setIsCustomizeOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isCustomizeOpen]);

  // Action: Accept all
  const handleAcceptAll = () => {
    setSaveError(null);
    const result = saveConsent('all');
    if (!result.success) {
      setSaveError(result.error || 'Failed to save consent settings. Please verify browser storage.');
      return;
    }
    const updated = getStoredConsent();
    if (updated) {
      setCategoryDraft(updated.categories);
      onConsentUpdated?.(updated);
    }
    setIsVisible(false);
    setIsCustomizeOpen(false);
  };

  // Action: Reject optional
  const handleRejectOptional = () => {
    setSaveError(null);
    const result = saveConsent('essential_only');
    if (!result.success) {
      setSaveError(result.error || 'Failed to save consent settings. Please verify browser storage.');
      return;
    }
    const updated = getStoredConsent();
    if (updated) {
      setCategoryDraft(updated.categories);
      onConsentUpdated?.(updated);
    }
    setIsVisible(false);
    setIsCustomizeOpen(false);
  };

  // Action: Save custom selections
  const handleSaveCustom = () => {
    setSaveError(null);
    const result = saveConsent('custom', categoryDraft);
    if (!result.success) {
      setSaveError(result.error || 'Failed to save consent settings. Please verify browser storage.');
      return;
    }
    const updated = getStoredConsent();
    if (updated) {
      onConsentUpdated?.(updated);
    }
    setSaveSuccessMsg('Your privacy choices have been updated.');
    setTimeout(() => {
      setIsVisible(false);
      setIsCustomizeOpen(false);
      setSaveSuccessMsg(null);
    }, 600);
  };

  const toggleCategory = (catId: keyof ConsentCategories) => {
    if (catId === 'necessary') return; // Cannot toggle strictly necessary
    setCategoryDraft((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 max-w-sm w-full pointer-events-none transition-all duration-300"
    >
      <div
        ref={dialogRef}
        role="region"
        aria-label="Cookie consent"
        className="pointer-events-auto w-full rounded-2xl bg-white/95 dark:bg-neutral-950/95 text-slate-900 dark:text-neutral-100 border border-slate-200/90 dark:border-neutral-800/90 shadow-[0_15px_35px_rgba(0,0,0,0.2)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {/* Banner Top Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Main Overview View */}
          {!isCustomizeOpen ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>

                <div className="space-y-1 flex-1 pr-1">
                  <h2
                    id="cookie-consent-title"
                    className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white"
                  >
                    Your privacy matters.
                  </h2>
                  <p
                    id="cookie-consent-description"
                    className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-300 leading-relaxed"
                  >
                    We use necessary storage to keep AI Workforce working. Optional cookies help us understand website usage and improve your experience.
                  </p>
                </div>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Action Buttons: 3 equally clear choices without misleading colors or coercive styling */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(true)}
                  className="order-3 sm:order-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Customize</span>
                </button>

                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="order-2 sm:order-2 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white hover:bg-slate-50 dark:bg-neutral-900/80 dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-950 shadow-xs"
                >
                  Reject optional
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="order-1 sm:order-3 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs sm:text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950 shadow-xs"
                >
                  Accept all
                </button>
              </div>
            </div>
          ) : (
            /* Customization View */
            <div className="space-y-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Customize Privacy Preferences
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
                  aria-label="Back to summary"
                  title="Back to summary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Review and choose which storage technologies you permit. Strictly necessary storage is always active to ensure site security and core AI conversations. Optional categories are disabled by default.
              </p>

              {saveError && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Categories list */}
              <div className="space-y-2.5 overflow-y-auto max-h-[46vh] pr-1 select-none">
                {(Object.keys(CATEGORY_DEFINITIONS) as (keyof ConsentCategories)[]).map((catId) => {
                  const def = CATEGORY_DEFINITIONS[catId];
                  const isChecked = categoryDraft[catId];
                  const isExpanded = expandedCategories[catId];

                  return (
                    <div
                      key={catId}
                      className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/50 p-3.5 space-y-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(catId)}
                            className="p-1 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                            aria-label={`Toggle ${def.name} details`}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                                {def.name}
                              </span>
                              {def.required ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-full font-medium">
                                  <Lock className="w-2.5 h-2.5" />
                                  Always Active
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-2 py-0.5 rounded-full">
                                  Optional
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                              {def.summary}
                            </p>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <div className="shrink-0 flex items-center">
                          {def.required ? (
                            <span
                              className="w-10 h-6 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 opacity-80 cursor-not-allowed"
                              title="Strictly necessary storage cannot be turned off"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              onClick={() => toggleCategory(catId)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950 cursor-pointer ${
                                isChecked
                                  ? 'bg-blue-600 dark:bg-blue-500'
                                  : 'bg-slate-300 dark:bg-neutral-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isChecked ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Technical Audit Details */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-neutral-800/80 text-[11px] text-slate-600 dark:text-neutral-300 space-y-1.5 animate-in fade-in duration-150">
                          <p className="font-medium text-slate-700 dark:text-neutral-200">
                            Technologies & storage purpose:
                          </p>
                          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500 dark:text-neutral-400">
                            {def.details.map((detail, idx) => (
                              <li key={idx} className="leading-normal">
                                {detail}
                              </li>
                            ))}
                          </ul>
                          {!def.inUse && (
                            <div className="mt-1 flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800/80 p-2 rounded-lg text-[10px]">
                              <Info className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span>AI Workforce does not track cross-site activity or sell visitor information.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions Footer in Customize view */}
              <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors text-center sm:text-left cursor-pointer"
                >
                  ← Back to summary
                </button>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleRejectOptional}
                    className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Reject all optional
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Allow all
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
