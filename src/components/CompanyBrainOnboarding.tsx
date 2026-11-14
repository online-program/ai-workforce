import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BrainCircuit,
  Building2,
  Package,
  Layers,
  Target,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Plus,
  Trash2,
  Search,
  Globe,
  Mail,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Check,
  Eye,
  FileText,
  Lock,
} from 'lucide-react';
import {
  StructuredCompanyBrain,
  CompanyBrainCore,
  CompanyBrainIndustry,
  CompanyBrainICP,
  CompanyBrainQualification,
  CompanyBrainSalesProcess,
  CompanyBrainAlphaConfig,
  CompanyBrainPolicies,
  CompanyBrainObjections,
  CompanyBrainEscalation,
  OfferingItem,
  CompanyProfile,
  UserWorkspaceMetadata,
} from '../types.ts';
import {
  INDUSTRY_REGISTRY,
  getIndustryDefinition,
  normalizeToStructuredBrain,
  syncBrainToLegacyProfile,
  calculateAdaptiveBrainCompleteness,
  UNIVERSAL_CUSTOMERS,
  UNIVERSAL_BUSINESS_MODELS,
  UNIVERSAL_SALES_CHANNELS,
  UNIVERSAL_ALPHA_OBJECTIVES,
  UNIVERSAL_ALPHA_PRIORITIES,
  UNIVERSAL_ESCALATION_RULES,
  UNIVERSAL_FORBIDDEN_BEHAVIORS,
  UNIVERSAL_TONES,
} from '../data/companyBrainSchema.ts';
import {
  saveCompanyProfile,
  saveUserOnboardingDraft,
  getLocalCache,
  setLocalCache,
  getOrCreateWidgetId,
} from '../services/workspaceService.ts';
import { Logo } from './Logo.tsx';
import { ThemeToggle } from '../context/ThemeContext.tsx';

interface CompanyBrainOnboardingProps {
  userId: string;
  initialDraft?: any;
  initialStep?: number;
  onComplete: (profile: CompanyProfile) => void;
  onSkip?: () => void;
}

export const CompanyBrainOnboarding: React.FC<CompanyBrainOnboardingProps> = ({
  userId,
  initialDraft,
  initialStep = 1,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const safeStep = Number(initialStep);
    return !isNaN(safeStep) && safeStep >= 1 && safeStep <= 6 ? safeStep : 1;
  });

  // Master StructuredCompanyBrain state
  const [brain, setBrain] = useState<StructuredCompanyBrain>(() => {
    // Check local draft cache first
    const cacheKey = `aw_brain_onboarding_draft_${userId}`;
    const cachedDraft = getLocalCache<StructuredCompanyBrain | null>(cacheKey, null);
    if (cachedDraft && cachedDraft.version === 2) {
      return cachedDraft;
    }
    if (initialDraft && initialDraft.companyBrain) {
      return initialDraft.companyBrain;
    }
    return normalizeToStructuredBrain(initialDraft as any);
  });

  const [industrySearch, setIndustrySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Website extraction states
  const [isExtractingWebsite, setIsExtractingWebsite] = useState(false);
  const [websiteExtractNotice, setWebsiteExtractNotice] = useState<string | null>(null);
  const [extractedFactsCandidate, setExtractedFactsCandidate] = useState<any | null>(null);

  // New catalog item state for quick addition in Step 2
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemPricingModel, setNewItemPricingModel] = useState<string>('Fixed');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemTarget, setNewItemTarget] = useState('');

  // Active industry definition
  const currentIndustryDef = useMemo(() => {
    return getIndustryDefinition(brain.industry.industryId);
  }, [brain.industry.industryId]);

  // Industry categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    INDUSTRY_REGISTRY.forEach((i) => set.add(i.category));
    return ['ALL', ...Array.from(set)];
  }, []);

  // Filtered industries list
  const filteredIndustries = useMemo(() => {
    const q = industrySearch.toLowerCase().trim();
    return INDUSTRY_REGISTRY.filter((ind) => {
      const matchCat =
        selectedCategoryFilter === 'ALL' || ind.category === selectedCategoryFilter;
      const matchQuery =
        !q ||
        ind.name.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q) ||
        ind.businessTypes.some((bt) => bt.name.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [industrySearch, selectedCategoryFilter]);

  // Completeness score
  const completeness = useMemo(() => {
    return calculateAdaptiveBrainCompleteness(brain);
  }, [brain]);

  // Auto-save draft on changes
  useEffect(() => {
    const cacheKey = `aw_brain_onboarding_draft_${userId}`;
    setLocalCache(cacheKey, brain);

    // Save to metadata in background
    const metaCacheKey = `aw_user_meta_${userId}`;
    const meta = getLocalCache<UserWorkspaceMetadata>(metaCacheKey, {
      email: '',
      onboarding_completed: false,
      onboarding_step: currentStep,
    });
    setLocalCache(metaCacheKey, {
      ...meta,
      onboarding_step: currentStep,
      onboarding_draft: {
        ...(meta.onboarding_draft || {}),
        companyName: brain.core.businessName,
        website: brain.core.website,
        description: brain.core.description,
        companyBrain: brain,
      } as any,
    });

    saveUserOnboardingDraft(userId, currentStep, {
      companyName: brain.core.businessName,
      website: brain.core.website,
      description: brain.core.description,
      companyBrain: brain,
    } as any).catch(() => {});
  }, [brain, currentStep, userId]);

  // Industry selection
  const handleSelectIndustry = (indId: string) => {
    const def = getIndustryDefinition(indId);
    setBrain((prev) => ({
      ...prev,
      industry: {
        industryId: def.id,
        industryName: def.name,
        businessTypeId: def.businessTypes[0]?.id || 'custom',
        businessTypeName: def.businessTypes[0]?.name || 'Standard Engagement',
        data: {},
      },
      alpha: {
        ...prev.alpha,
        objectives: def.defaultObjectives || prev.alpha.objectives,
        tone: def.defaultTone || prev.alpha.tone,
        forbiddenBehaviors: def.defaultForbidden || prev.alpha.forbiddenBehaviors,
      },
    }));
  };

  // Website extraction handler
  const handleExtractFromWebsite = async () => {
    const url = brain.core.website?.trim();
    if (!url) {
      setWebsiteExtractNotice('Please enter a valid website URL first.');
      return;
    }

    setIsExtractingWebsite(true);
    setWebsiteExtractNotice(null);
    setExtractedFactsCandidate(null);

    try {
      const res = await fetch('/api/onboarding/extract-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (data.success) {
        setExtractedFactsCandidate(data);
        setWebsiteExtractNotice('Public website analyzed successfully! Review and confirm suggested facts below.');
      } else {
        setWebsiteExtractNotice(data.error || 'Could not extract facts from website. You can complete onboarding manually.');
      }
    } catch (err: any) {
      setWebsiteExtractNotice('Network error connecting to website extraction. Please proceed with manual entry.');
    } finally {
      setIsExtractingWebsite(false);
    }
  };

  const handleApplyExtractedFacts = () => {
    if (!extractedFactsCandidate) return;

    setBrain((prev) => ({
      ...prev,
      core: {
        ...prev.core,
        businessName: extractedFactsCandidate.businessName || prev.core.businessName,
        description: extractedFactsCandidate.description || prev.core.description,
        siteType: extractedFactsCandidate.siteType || prev.core.siteType,
      },
      icp: {
        ...prev.icp,
        bestFitCriteria: extractedFactsCandidate.targetAudience || prev.icp?.bestFitCriteria,
      },
      catalog: extractedFactsCandidate.offerings && extractedFactsCandidate.offerings.length > 0
        ? [
            ...(prev.catalog || []),
            ...extractedFactsCandidate.offerings.map((o: any) => ({
              id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: o.name,
              price: o.priceRange || '',
              priceRange: o.priceRange || '',
              pricingModel: o.pricingModel || 'Fixed',
              description: o.description || '',
              status: 'LIVE' as const,
              verificationStatus: 'verified' as const,
            })),
          ]
        : prev.catalog,
    }));

    setExtractedFactsCandidate(null);
    setWebsiteExtractNotice('Confirmed and applied extracted facts to Company Brain!');
  };

  // Add catalog item
  const handleAddCatalogItem = () => {
    if (!newItemName.trim()) return;
    const item: OfferingItem = {
      id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newItemName.trim(),
      price: newItemPrice.trim() || (newItemPricingModel === 'Custom quote' ? 'Custom Quote' : ''),
      priceRange: newItemPrice.trim(),
      pricingModel: newItemPricingModel,
      description: newItemDesc.trim() || 'Verified offering',
      idealCustomer: newItemTarget.trim() || undefined,
      status: 'LIVE',
    };

    setBrain((prev) => ({
      ...prev,
      catalog: [...(prev.catalog || []), item],
    }));

    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
    setNewItemTarget('');
  };

  const handleRemoveCatalogItem = (id: string) => {
    setBrain((prev) => ({
      ...prev,
      catalog: (prev.catalog || []).filter((item) => item.id !== id),
    }));
  };

  // Complete and launch Company Brain
  const handleFinalizeAndLaunch = async () => {
    setIsSaving(true);
    try {
      const finalBrain: StructuredCompanyBrain = {
        ...brain,
        lastBuiltAt: new Date().toISOString(),
      };

      const compiledProfile = syncBrainToLegacyProfile(finalBrain);
      compiledProfile.widget_id = getOrCreateWidgetId(userId);

      // Save to Firestore and local storage
      await saveCompanyProfile(userId, compiledProfile);

      // Mark onboarding completed in user metadata cache
      const metaCacheKey = `aw_user_meta_${userId}`;
      const meta = getLocalCache<UserWorkspaceMetadata>(metaCacheKey, {
        email: '',
        onboarding_completed: true,
        onboarding_step: 6,
      });
      setLocalCache(metaCacheKey, {
        ...meta,
        onboarding_completed: true,
        onboarding_step: 6,
      });

      // Clear the onboarding draft cache
      const draftKey = `aw_brain_onboarding_draft_${userId}`;
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {}

      onComplete(compiledProfile);
    } catch (err: any) {
      console.error('Error completing Company Brain onboarding:', err);
      setSaveNotice('Failed to persist Company Brain. Please retry or continue.');
    } finally {
      setIsSaving(false);
    }
  };

  const stepTitles = [
    'Identity & Industry',
    'Catalog & Offerings',
    'Ideal Customer Profile',
    'Qualification & Process',
    'Governance & Voice',
    'Review & Build Brain',
  ];

  return (
    <div className="min-h-screen bg-neutral-50/80 dark:bg-black text-neutral-950 dark:text-white font-sans flex flex-col justify-between selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-200">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-900 bg-white/90 dark:bg-black/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Logo size="sm" showText={true} />
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Company Brain Onboarding
            </span>
            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-[10px] font-mono font-bold border border-neutral-200 dark:border-neutral-800">
              V2 Canonical
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
            <span>Completeness:</span>
            <span className="font-bold text-neutral-950 dark:text-white">{completeness.percentage}%</span>
          </div>
          <ThemeToggle variant="icon" />
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              Skip to Workspace
            </button>
          )}
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Step Progress Tracker */}
        <div className="p-4 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-900 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">
              Step {currentStep} of 6 — {stepTitles[currentStep - 1]}
            </span>
            <span className="text-neutral-950 dark:text-white font-bold">{completeness.percentage}% Ready</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 h-1.5 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((st) => (
              <div
                key={st}
                className={`h-full transition-all duration-300 ${
                  st <= currentStep ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </div>

        {saveNotice && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" />
            <span>{saveNotice}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ============================================================== */}
          {/* STEP 1: BUSINESS IDENTITY & INDUSTRY TAXONOMY (SECTION A)       */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6 sm:p-8 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-900 rounded-3xl space-y-6 shadow-sm"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                  Business Identity & Industry
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Tell Alpha who you are. This grounds every response in your verified company identity.
                </p>
              </div>

              {/* Core Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Company / Business Name *</span>
                    <span className="text-[10px] text-neutral-500 font-mono font-normal">Required</span>
                  </label>
                  <input
                    type="text"
                    value={brain.core.businessName}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        core: { ...prev.core, businessName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Acme Corp or Verity Studio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Website URL</span>
                    <span className="text-[10px] text-neutral-500 font-mono font-normal">Optional</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={brain.core.website || ''}
                      onChange={(e) =>
                        setBrain((prev) => ({
                          ...prev,
                          core: { ...prev.core, website: e.target.value },
                        }))
                      }
                      placeholder="https://example.com"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleExtractFromWebsite}
                      disabled={isExtractingWebsite || !brain.core.website?.trim()}
                      className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isExtractingWebsite ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Auto-Analyze</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {websiteExtractNotice && (
                <div className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                  extractedFactsCandidate
                    ? 'bg-blue-950/60 border-blue-800 text-blue-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{websiteExtractNotice}</span>
                  </div>
                </div>
              )}

              {extractedFactsCandidate && (
                <div className="p-4 bg-neutral-900/90 border border-blue-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase">
                        Suggested Facts (Awaiting Confirmation)
                      </span>
                      <span className="text-xs text-neutral-400">Extracted from {extractedFactsCandidate.url}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                    {extractedFactsCandidate.businessName && (
                      <div><strong className="text-white">Name:</strong> {extractedFactsCandidate.businessName}</div>
                    )}
                    {extractedFactsCandidate.industry && (
                      <div><strong className="text-white">Industry:</strong> {extractedFactsCandidate.industry}</div>
                    )}
                    {extractedFactsCandidate.description && (
                      <div className="col-span-full"><strong className="text-white">Summary:</strong> {extractedFactsCandidate.description}</div>
                    )}
                    {extractedFactsCandidate.offerings && extractedFactsCandidate.offerings.length > 0 && (
                      <div className="col-span-full">
                        <strong className="text-white">Discovered Offerings ({extractedFactsCandidate.offerings.length}):</strong>
                        <ul className="mt-1 space-y-1 list-disc list-inside text-neutral-400">
                          {extractedFactsCandidate.offerings.slice(0, 4).map((off: any, idx: number) => (
                            <li key={idx}><strong className="text-neutral-200">{off.name}</strong> {off.priceRange ? `(${off.priceRange})` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleApplyExtractedFacts}
                      className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Confirm & Apply to Company Brain</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Business Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Business Description in Your Own Words *</span>
                  <span className="text-[10px] text-neutral-500 font-mono font-normal">Required</span>
                </label>
                <textarea
                  value={brain.core.description}
                  onChange={(e) =>
                    setBrain((prev) => ({
                      ...prev,
                      core: { ...prev.core, description: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="What does your company do, what problems do you solve, and what is your core value proposition?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors leading-relaxed"
                />
              </div>

              {/* Site Type / Presence */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Website / Business Presence Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'company_website', label: 'Company / B2B Website' },
                    { id: 'service_business', label: 'Service Business / Agency' },
                    { id: 'online_store', label: 'E-Commerce / Online Store' },
                    { id: 'portfolio', label: 'Portfolio / Personal Brand' },
                    { id: 'creator', label: 'Creator / Consultant' },
                    { id: 'other', label: 'Other' },
                  ].map((st) => {
                    const isSelected = (brain.core.siteType || 'company_website') === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            core: { ...prev.core, siteType: st.id as any },
                          }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-xs'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Industry Taxonomy Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-white">
                    Primary Industry Taxonomy ({INDUSTRY_REGISTRY.length}+ Supported)
                  </label>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search industries..."
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-neutral-800 text-white font-bold'
                          : 'bg-neutral-950 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Industry Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 border border-neutral-900 rounded-xl bg-neutral-900/30">
                  {filteredIndustries.map((ind) => {
                    const isSelected = brain.industry.industryId === ind.id;
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => handleSelectIndustry(ind.id)}
                        className={`p-3 text-left rounded-xl transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 border-white text-white shadow-xs'
                            : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400 hover:border-neutral-700 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-xs">{ind.name}</div>
                        <div className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                          {ind.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Business Type within chosen Industry */}
                {currentIndustryDef.businessTypes.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-white">
                      Specific Business Model within {currentIndustryDef.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentIndustryDef.businessTypes.map((bt) => {
                        const isSelected = brain.industry.businessTypeId === bt.id;
                        return (
                          <button
                            key={bt.id}
                            type="button"
                            onClick={() =>
                              setBrain((prev) => ({
                                ...prev,
                                industry: {
                                  ...prev.industry,
                                  businessTypeId: bt.id,
                                  businessTypeName: bt.name,
                                },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white text-black font-bold shadow-xs'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                            }`}
                          >
                            {bt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                <span className="text-xs text-neutral-500 font-mono">
                  All changes are saved automatically.
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!brain.core.businessName.trim() || !brain.core.description.trim()}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-40"
                >
                  <span>Continue to Offerings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: CATALOG & PRODUCTS / SERVICES (SECTION B)               */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6 sm:p-8 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-6"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Products & Services Catalog
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Add your major offerings. Alpha will answer questions and recommend matching solutions. Missing prices remain quote-based.
                </p>
              </div>

              {/* Existing Catalog List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Configured Offerings ({(brain.catalog || []).length})
                </div>

                {(brain.catalog || []).length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-neutral-800 text-center space-y-2 bg-neutral-900/20">
                    <Package className="w-6 h-6 text-neutral-500 mx-auto" />
                    <p className="text-xs text-neutral-400">
                      No offerings added yet. Add your first service or product below.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(brain.catalog || []).map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between space-y-2 relative group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">{item.name}</h4>
                            <span className="text-xs font-mono text-emerald-400 font-bold">
                              {item.price || 'Custom Quote'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                          {item.idealCustomer && (
                            <p className="text-[11px] text-neutral-500 mt-1">
                              Target: {item.idealCustomer}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-500">
                          <span className="font-mono uppercase">{item.pricingModel || 'Fixed'}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCatalogItem(item.id)}
                            className="text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove offering"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Offering Card */}
              <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
                <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product or Service</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">Name *</label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Full-Stack Web App Development"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">Pricing Model</label>
                    <select
                      value={newItemPricingModel}
                      onChange={(e) => setNewItemPricingModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-white"
                    >
                      <option value="Fixed">Fixed Price</option>
                      <option value="Starting from">Starting from</option>
                      <option value="Per month">Per Month</option>
                      <option value="Custom quote">Custom Quote / Variable</option>
                      <option value="Undisclosed">Undisclosed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">
                      Price / Rate (Leave empty if quote-based)
                    </label>
                    <input
                      type="text"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="e.g. $4,500 or $99/mo"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300">
                      Target Audience / Use Case
                    </label>
                    <input
                      type="text"
                      value={newItemTarget}
                      onChange={(e) => setNewItemTarget(e.target.value)}
                      placeholder="e.g. Seed-stage SaaS founders"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-300">
                    Description & Key Deliverables
                  </label>
                  <textarea
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    rows={2}
                    placeholder="What is included, what problem does it solve, and what is the typical timeline?"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddCatalogItem}
                  disabled={!newItemName.trim()}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  + Add to Catalog
                </button>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Customer Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: IDEAL CUSTOMER PROFILE & ADAPTIVE OPERATIONS (SECTION C)*/}
          {/* ============================================================== */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6 sm:p-8 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-6"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Ideal Customer Profile & Operations
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Define who you serve best so Alpha qualifies relevant opportunities without aggressive sales tactics.
                </p>
              </div>

              {/* Target Customer Audience */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Primary Customer Segment
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_CUSTOMERS.map((cust) => {
                    const isSelected = brain.core.customers.includes(cust);
                    return (
                      <button
                        key={cust}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? brain.core.customers.filter((c) => c !== cust)
                            : [...brain.core.customers, cust];
                          setBrain((prev) => ({
                            ...prev,
                            core: { ...prev.core, customers: updated },
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-xs'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {cust}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sales Channels */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Commercial & Delivery Channels
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_SALES_CHANNELS.map((chan) => {
                    const isSelected = brain.core.salesChannels.includes(chan);
                    return (
                      <button
                        key={chan}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? brain.core.salesChannels.filter((c) => c !== chan)
                            : [...brain.core.salesChannels, chan];
                          setBrain((prev) => ({
                            ...prev,
                            core: { ...prev.core, salesChannels: updated },
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-xs'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {chan}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Adaptive Fields for Industry */}
              {currentIndustryDef.adaptiveFields.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-neutral-900">
                  <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Adaptive Knowledge for {currentIndustryDef.name}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentIndustryDef.adaptiveFields.map((field) => {
                      const val = brain.industry.data?.[field.key];
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-300">
                            {field.label}
                          </label>
                          {field.options && field.options.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {field.options.map((opt) => {
                                const selected = Array.isArray(val)
                                  ? val.includes(opt)
                                  : val === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      if (field.type === 'chips-multi') {
                                        const currentArr: string[] = Array.isArray(val) ? val : [];
                                        const nextArr = selected
                                          ? currentArr.filter((x) => x !== opt)
                                          : [...currentArr, opt];
                                        setBrain((prev) => ({
                                          ...prev,
                                          industry: {
                                            ...prev.industry,
                                            data: {
                                              ...(prev.industry.data || {}),
                                              [field.key]: nextArr,
                                            },
                                          },
                                        }));
                                      } else {
                                        setBrain((prev) => ({
                                          ...prev,
                                          industry: {
                                            ...prev.industry,
                                            data: {
                                              ...(prev.industry.data || {}),
                                              [field.key]: selected ? '' : opt,
                                            },
                                          },
                                        }));
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                      selected
                                        ? 'bg-white text-black font-bold'
                                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={typeof val === 'string' ? val : ''}
                              onChange={(e) =>
                                setBrain((prev) => ({
                                  ...prev,
                                  industry: {
                                    ...prev.industry,
                                    data: {
                                      ...(prev.industry.data || {}),
                                      [field.key]: e.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder={field.placeholder || `Enter ${field.label}...`}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Best Fit vs Bad Fit Criteria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-400">
                    What makes a lead a great fit?
                  </label>
                  <input
                    type="text"
                    value={brain.icp?.bestFitCriteria || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        icp: { ...(prev.icp || {}), bestFitCriteria: e.target.value },
                      }))
                    }
                    placeholder="e.g. Budget over $3k, realistic timeline, decision maker"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400">
                    What is out of scope / not a fit?
                  </label>
                  <input
                    type="text"
                    value={brain.icp?.badFitCriteria || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        icp: { ...(prev.icp || {}), badFitCriteria: e.target.value },
                      }))
                    }
                    placeholder="e.g. Homework assignments, free consulting requests"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Qualification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: BUYING INTENT & LEAD QUALIFICATION (SECTION D & E)      */}
          {/* ============================================================== */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6 sm:p-8 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-6"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Lead Qualification & Sales Process
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Teach Alpha what information is genuinely required before passing a qualified lead to your team.
                </p>
              </div>

              {/* Desired Sales Outcome */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Primary Next Step for Qualified Visitors
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'consultation', label: 'Consultation / Call', desc: 'Schedule a discovery discussion' },
                    { id: 'quote_request', label: 'Custom Quote Request', desc: 'Prepare tailored pricing proposal' },
                    { id: 'product_demo', label: 'Product Demo', desc: 'Walkthrough software capabilities' },
                    { id: 'inquiry', label: 'Inbound Inquiry', desc: 'Capture detailed project specs' },
                    { id: 'appointment', label: 'Book Appointment', desc: 'Confirm slot with team' },
                    { id: 'order', label: 'Direct Purchase / Order', desc: 'Guide to checkout' },
                  ].map((out) => {
                    const isSelected = (brain.salesProcess?.desiredOutcome || 'consultation') === out.id;
                    return (
                      <button
                        key={out.id}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            salesProcess: { ...(prev.salesProcess || {}), desiredOutcome: out.id as any },
                          }))
                        }
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 border-white text-white font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                        }`}
                      >
                        <div className="text-xs">{out.label}</div>
                        <div className="text-[10px] text-neutral-500 font-normal mt-0.5">{out.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Required vs Optional Qualification Fields */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Information to Collect Before Human Handoff
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Visitor Name',
                    'Email Address',
                    'Phone Number',
                    'Project Scope / Need',
                    'Budget Range',
                    'Timeline / Urgency',
                    'Company Name',
                    'Team Size',
                    'Existing Solution',
                  ].map((field) => {
                    const reqFields = brain.qualification?.requiredFields || ['Visitor Name', 'Email Address'];
                    const isRequired = reqFields.includes(field);
                    return (
                      <button
                        key={field}
                        type="button"
                        onClick={() => {
                          const updated = isRequired
                            ? reqFields.filter((f) => f !== field)
                            : [...reqFields, field];
                          setBrain((prev) => ({
                            ...prev,
                            qualification: { ...(prev.qualification || {}), requiredFields: updated },
                          }))
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isRequired
                            ? 'bg-white text-black font-bold shadow-xs'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {field}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commitments Alpha Must Never Make */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-rose-400">
                  Strict Commitments Alpha Must NEVER Make
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Never commit to unverified delivery dates',
                    'Never promise unlisted custom discounts',
                    'Never guarantee specific revenue or conversion outcomes',
                    'Never diagnose medical or legal issues',
                    'Never promise capacity or availability without confirmation',
                  ].map((com) => {
                    const commitments = brain.salesProcess?.commitmentsNeverToMake || [];
                    const isSelected = commitments.includes(com);
                    return (
                      <button
                        key={com}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? commitments.filter((c) => c !== com)
                            : [...commitments, com];
                          setBrain((prev) => ({
                            ...prev,
                            salesProcess: { ...(prev.salesProcess || {}), commitmentsNeverToMake: updated },
                          }))
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-950 text-rose-200 border border-rose-800 font-bold'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {com}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Voice & Governance</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* STEP 5: BRAND VOICE, GOVERNANCE & TRUST POLICIES (SECTION F & G)*/}
          {/* ============================================================== */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6 sm:p-8 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-6"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Brand Voice, Boundaries & Trust Policies
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Control Alpha's communication style, negative constraints (no-pitch respect), and operational boundaries.
                </p>
              </div>

              {/* Tone Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Alpha Persona Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_TONES.map((t) => {
                    const isSelected = brain.alpha.tone === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            alpha: { ...prev.alpha, tone: t },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-xs'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pitch Discipline & Strictness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Pitch Discipline</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">STRICT</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    When a visitor says "don't pitch anything" or asks for neutral facts, Alpha answers cleanly without unsolicited promotional persuasion.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Knowledge Strictness</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">0 HALLUCINATIONS</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Alpha answers strictly from verified Company Brain facts. Missing policies or unlisted pricing remain unknown without fabrication.
                  </p>
                </div>
              </div>

              {/* Human Escalation Triggers */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">
                  Human Escalation Triggers
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_ESCALATION_RULES.map((rule) => {
                    const isSelected = brain.alpha.escalationRules.includes(rule);
                    return (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? brain.alpha.escalationRules.filter((r) => r !== rule)
                            : [...brain.alpha.escalationRules, rule];
                          setBrain((prev) => ({
                            ...prev,
                            alpha: { ...prev.alpha, escalationRules: updated },
                          }))
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {rule}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification Recipient Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Executive Notification Email for Human Escalations</span>
                  <span className="text-[10px] text-neutral-500 font-mono font-normal">Optional</span>
                </label>
                <input
                  type="email"
                  value={brain.humanEscalation?.recipientEmail || ''}
                  onChange={(e) =>
                    setBrain((prev) => ({
                      ...prev,
                      humanEscalation: {
                        ...(prev.humanEscalation || {}),
                        recipientEmail: e.target.value,
                      },
                    }))
                  }
                  placeholder="sales@yourcompany.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <span>Review & Build Brain</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* STEP 6: REVIEW, COMPLETENESS & BUILD (SECTION J SUMMARY)        */}
          {/* ============================================================== */}
          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-6 sm:p-8 bg-neutral-950 border border-neutral-900 rounded-3xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Review Your Company Brain
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Everything Alpha learned about your business is staged and ready to activate.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
                  READY TO BUILD
                </div>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Identity */}
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500">
                    <span>Business Identity</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-white hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white">{brain.core.businessName}</div>
                  <div className="text-neutral-400 line-clamp-2 leading-relaxed">
                    {brain.core.description}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    {brain.industry.industryName} ({brain.industry.businessTypeName})
                  </div>
                </div>

                {/* 2. Offerings */}
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500">
                    <span>Catalog & Pricing</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-white hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {(brain.catalog || []).length} Verified Offerings
                  </div>
                  <div className="text-neutral-400 line-clamp-2 leading-relaxed">
                    {(brain.catalog || []).map((c) => c.name).join(', ') || 'Custom engagements'}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    Pricing strictly grounded in verified Brain
                  </div>
                </div>

                {/* 3. Customer Profile */}
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500">
                    <span>Target Audience & ICP</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-white hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {brain.core.customers.join(', ') || 'General Commercial Audience'}
                  </div>
                  <div className="text-neutral-400 line-clamp-2 leading-relaxed">
                    Fit Criteria: {brain.icp?.bestFitCriteria || 'High-intent prospects'}
                  </div>
                </div>

                {/* 4. Alpha Voice & Governance */}
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500">
                    <span>Voice & Safety</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="text-white hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white">Tone: {brain.alpha.tone}</div>
                  <div className="text-neutral-400 line-clamp-2 leading-relaxed">
                    Boundaries: {brain.alpha.forbiddenBehaviors.length} enforced rules
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    Escalation: {brain.alpha.escalationRules.length} triggers
                  </div>
                </div>
              </div>

              {/* Build Action */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Voice</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleFinalizeAndLaunch}
                  className="px-8 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer shadow-xl disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>{isSaving ? 'ACTIVATING BRAIN...' : 'ACTIVATE COMPANY BRAIN & ENTER WORKSPACE'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-neutral-900 text-center text-xs text-neutral-500 font-mono">
        AI Workforce © 2026 · Company Brain Architecture Grounded in Strict Zero-Hallucination Knowledge
      </footer>
    </div>
  );
};
