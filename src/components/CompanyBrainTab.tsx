import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BrainCircuit,
  Building2,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Shield,
  Layers,
  Check,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Globe,
  Users,
  Target,
  Clock,
  Calendar,
  Lock,
  MessageSquare,
  HelpCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Save,
  Zap,
  Info,
  Activity,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  CompanyProfile,
  StructuredCompanyBrain,
  CompanyBrainCore,
  CompanyBrainIndustry,
  CompanyBrainConditionalOperations,
  CompanyBrainAlphaConfig,
  CompanyBrainPolicies,
} from '../types.ts';
import {
  INDUSTRY_REGISTRY,
  EXTENDED_INDUSTRY_LIST,
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
import { evaluateCompanyBrainDiagnostics } from '../services/companyBrainDiagnostics.ts';

interface CompanyBrainTabProps {
  companyProfile: CompanyProfile;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  onResetDemoData?: () => void;
  onResetDefaultData?: () => void;
  onSignOutRedirect?: () => void;
  onOpenAlphaConfig?: () => void;
}

export const CompanyBrainTab: React.FC<CompanyBrainTabProps> = ({
  companyProfile,
  onUpdateCompanyProfile,
}) => {
  // Normalize existing or incoming profile into structured Company Brain
  const initialBrain = useMemo(
    () => normalizeToStructuredBrain(companyProfile),
    [companyProfile]
  );

  const [brain, setBrain] = useState<StructuredCompanyBrain>(initialBrain);
  const [isWizardMode, setIsWizardMode] = useState<boolean>(!companyProfile.companyBrain);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [industrySearchQuery, setIndustrySearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Editing state for Command Center view
  const [activeEditSection, setActiveEditSection] = useState<string | null>(null);
  const [industryChangeWarningOpen, setIndustryChangeWarningOpen] = useState<boolean>(false);
  const [pendingIndustryId, setPendingIndustryId] = useState<string | null>(null);

  // Sync internal state if external companyProfile changes significantly
  useEffect(() => {
    if (companyProfile.companyBrain) {
      setBrain(companyProfile.companyBrain);
    }
  }, [companyProfile]);

  // Current industry definition
  const activeIndustryDef = useMemo(
    () => getIndustryDefinition(brain.industry.industryId),
    [brain.industry.industryId]
  );

  // Completeness score
  const completeness = useMemo(
    () => calculateAdaptiveBrainCompleteness(brain),
    [brain]
  );

  // Real-time Company Brain Diagnostics
  const diagnostics = useMemo(
    () => evaluateCompanyBrainDiagnostics(brain),
    [brain]
  );
  const [showDiagnosticsDetails, setShowDiagnosticsDetails] = useState<boolean>(false);

  // Categories for Step 1
  const categories = useMemo(() => {
    const set = new Set<string>();
    INDUSTRY_REGISTRY.forEach((i) => set.add(i.category));
    return ['ALL', ...Array.from(set)];
  }, []);

  // Filtered industries list
  const filteredIndustries = useMemo(() => {
    const q = industrySearchQuery.toLowerCase().trim();
    return EXTENDED_INDUSTRY_LIST.filter((ind) => {
      const def = getIndustryDefinition(ind.id);
      const matchesSearch =
        !q ||
        ind.name.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q);
      const matchesCat =
        selectedCategoryFilter === 'ALL' || def.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [industrySearchQuery, selectedCategoryFilter]);

  // Handle building & saving Company Brain
  const handleSaveAndBuild = async () => {
    setIsSaving(true);
    try {
      const updatedBrain: StructuredCompanyBrain = {
        ...brain,
        diagnostics,
        lastBuiltAt: new Date().toISOString(),
      };
      const syncedProfile = syncBrainToLegacyProfile(updatedBrain, companyProfile);
      await onUpdateCompanyProfile(syncedProfile);
      setBrain(updatedBrain);
      setIsWizardMode(false);
      setActiveEditSection(null);
      setShowCelebration(true);
    } catch (err) {
      console.error('Failed to save Company Brain:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch industry with safety confirmation
  const initiateIndustryChange = (newIndId: string) => {
    if (brain.industry.industryId && brain.industry.industryId !== newIndId) {
      setPendingIndustryId(newIndId);
      setIndustryChangeWarningOpen(true);
    } else {
      applyIndustrySelection(newIndId);
    }
  };

  const applyIndustrySelection = (indId: string) => {
    const def = getIndustryDefinition(indId);
    setBrain((prev) => ({
      ...prev,
      industry: {
        industryId: def.id,
        industryName: def.name,
        businessTypeId: def.businessTypes[0]?.id || 'custom',
        businessTypeName: def.businessTypes[0]?.name || 'Specialized',
        data: {},
      },
      alpha: {
        ...prev.alpha,
        objectives: def.defaultObjectives || prev.alpha.objectives,
        tone: def.defaultTone || prev.alpha.tone,
        forbiddenBehaviors: def.defaultForbidden || prev.alpha.forbiddenBehaviors,
      },
    }));
    setIndustryChangeWarningOpen(false);
    setPendingIndustryId(null);
  };

  // Conditional operations evaluation
  const hasAppointments =
    brain.core.businessModel.includes('Appointments') ||
    brain.core.businessModel.includes('Bookings') ||
    brain.core.salesChannels.includes('Appointment');

  const hasSubscriptions =
    brain.core.businessModel.includes('Subscriptions') ||
    brain.core.businessModel.includes('Digital Products');

  const hasPhysicalLocation =
    brain.core.salesChannels.includes('Physical Location') ||
    brain.core.businessModel.includes('Physical Experiences');

  const hasProducts =
    brain.core.businessModel.includes('Products');

  const hasConsulting =
    brain.core.businessModel.includes('Consulting') ||
    brain.core.businessModel.includes('Services');

  // Helper toggle chip array
  const toggleArrayItem = (list: string[], item: string): string[] => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  return (
    <div className="h-full w-full bg-black text-white flex flex-col overflow-y-auto font-sans p-4 sm:p-8">
      {/* Top Banner & Mode Toggle */}
      <div className="max-w-5xl mx-auto w-full mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white text-black flex items-center justify-center font-black shadow-lg">
              <BrainCircuit className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Company Brain
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-neutral-300">
                  ADAPTIVE CONFIGURATION
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Teaches Alpha how your business operates with zero fluff and maximum grounding.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-mono">
              <span className="text-neutral-400">Readiness:</span>
              <span className="text-emerald-400 font-bold">{completeness.percentage}%</span>
            </div>

            <button
              onClick={() => {
                if (isWizardMode) {
                  setIsWizardMode(false);
                } else {
                  setIsWizardMode(true);
                  setCurrentStep(1);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white"
            >
              {isWizardMode ? 'Exit Wizard to Overview' : 'Open Setup Wizard'}
            </button>
          </div>
        </div>

        {saveSuccessNotice && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl flex items-center space-x-2 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Company Brain updated successfully. Alpha is synchronized and active.</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. GUIDED 6-STEP ADAPTIVE WIZARD FLOW                           */}
      {/* ============================================================== */}
      {isWizardMode ? (
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {/* Step Progress Bar */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-neutral-400">Step {currentStep} of 6</span>
              <span className="text-white font-bold">
                {currentStep === 1 && 'Industry Selection'}
                {currentStep === 2 && 'Business Type'}
                {currentStep === 3 && 'Core Information'}
                {currentStep === 4 && 'Adaptive Industry Knowledge'}
                {currentStep === 5 && 'Alpha Behavior & Governance'}
                {currentStep === 6 && 'Review & Build'}
              </span>
            </div>
            <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="bg-white h-full transition-all duration-300"
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: INDUSTRY SELECTION */}
          {currentStep === 1 && (
            <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Let's build your Company Brain
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Tell us about your business and we'll configure Alpha around it.
                </p>
                <div className="text-xs font-bold text-white mt-4 uppercase tracking-wider font-mono">
                  What industry does your business operate in?
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search 37+ industries (e.g. Healthcare, Fashion, SaaS, Logistics)..."
                    value={industrySearchQuery}
                    onChange={(e) => setIndustrySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>

                <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-white text-black'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selectable Industry Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[440px] overflow-y-auto pr-1">
                {filteredIndustries.map((ind) => {
                  const def = getIndustryDefinition(ind.id);
                  const isSelected = brain.industry.industryId === def.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => initiateIndustryChange(def.id)}
                      className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-mono uppercase font-bold ${isSelected ? 'text-neutral-600' : 'text-neutral-500'}`}>
                            {def.category}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-black" />}
                        </div>
                        <div className="text-sm font-bold tracking-tight">{ind.name}</div>
                        <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isSelected ? 'text-neutral-700' : 'text-neutral-400'}`}>
                          {def.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Industry Input for "Other" */}
              {brain.industry.industryId === 'other' && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Specify Your Custom Industry
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Space Technology, Specialized Marine Equipment, Artisan Glassblowing"
                    value={brain.industry.customIndustry || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        industry: {
                          ...prev.industry,
                          customIndustry: e.target.value,
                          industryName: e.target.value.trim() || 'Custom Enterprise',
                        },
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-neutral-800">
                <button
                  disabled={!brain.industry.industryId}
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Continue to Business Type</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS TYPE */}
          {currentStep === 2 && (
            <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                  <span>{activeIndustryDef.name}</span>
                  <span>•</span>
                  <span>Step 2</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  What type of {activeIndustryDef.name} business is this?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Select the closest business model so Alpha adopts the right commercial terminology.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeIndustryDef.businessTypes.map((bt) => {
                  const isSelected = brain.industry.businessTypeId === bt.id;
                  return (
                    <button
                      key={bt.id}
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
                      className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-bold text-sm">{bt.name}</div>
                      {isSelected && <Check className="w-4 h-4 text-black shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {brain.industry.businessTypeId === 'other' && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Describe Your Custom Business Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Specialty Outpatient Diagnostic Lab"
                    value={brain.industry.customBusinessType || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        industry: {
                          ...prev.industry,
                          customBusinessType: e.target.value,
                          businessTypeName: e.target.value.trim() || 'Custom Operation',
                        },
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  disabled={!brain.industry.businessTypeId}
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Continue to Core Info</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CORE BUSINESS INFORMATION */}
          {currentStep === 3 && (
            <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Core Business Information
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Universal details every business needs. Fast selections with zero unnecessary paragraphs.
                </p>
              </div>

              {/* Business Name & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300">
                    What is your business called? *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Health Clinic"
                    value={brain.core.businessName}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        core: { ...prev.core, businessName: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300">
                    What's your website? <span className="text-neutral-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://apexclinic.com"
                    value={brain.core.website || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        core: { ...prev.core, website: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Single Concise Description Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  What does your business do? * <span className="text-neutral-500 font-normal">(One concise sentence)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Multi-specialty outpatient healthcare offering diagnostics, cardiology, and family medicine."
                  value={brain.core.description}
                  onChange={(e) =>
                    setBrain((prev) => ({
                      ...prev,
                      core: { ...prev.core, description: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Customers (Multi-select Chips) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  Who do you primarily serve? <span className="text-neutral-500 font-normal">(Select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_CUSTOMERS.map((cust) => {
                    const isSelected = brain.core.customers.includes(cust);
                    return (
                      <button
                        key={cust}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            core: {
                              ...prev.core,
                              customers: toggleArrayItem(prev.core.customers, cust),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {cust}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Business Model (Multi-select Chips) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  How does your business provide value? <span className="text-neutral-500 font-normal">(Select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_BUSINESS_MODELS.map((model) => {
                    const isSelected = brain.core.businessModel.includes(model);
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            core: {
                              ...prev.core,
                              businessModel: toggleArrayItem(prev.core.businessModel, model),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {model}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sales Channels (Multi-select Chips) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  How do customers usually reach or buy from you? <span className="text-neutral-500 font-normal">(Select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_SALES_CHANNELS.map((ch) => {
                    const isSelected = brain.core.salesChannels.includes(ch);
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            core: {
                              ...prev.core,
                              salesChannels: toggleArrayItem(prev.core.salesChannels, ch),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  disabled={!brain.core.businessName || !brain.core.description}
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Continue to Industry Knowledge</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ADAPTIVE INDUSTRY QUESTIONS & CONDITIONAL OPERATIONS */}
          {currentStep === 4 && (
            <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">
                  <span>{activeIndustryDef.name} Module</span>
                  <span>•</span>
                  <span>Step 4</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Adaptive Industry Knowledge
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Targeted questions specifically tailored to {activeIndustryDef.name}. No generic fluff.
                </p>
              </div>

              {/* 1. Dynamic Adaptive Fields defined by the selected industry */}
              <div className="space-y-4">
                {activeIndustryDef.adaptiveFields.map((field) => {
                  const currentValue = brain.industry.data?.[field.key];
                  return (
                    <div key={field.key} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white tracking-wide">
                          {field.label}
                        </label>
                        {field.helperText && (
                          <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                            {field.helperText}
                          </span>
                        )}
                      </div>

                      {field.type === 'chips-multi' && field.options && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {field.options.map((opt) => {
                            const arr = Array.isArray(currentValue) ? currentValue : [];
                            const isSelected = arr.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const updated = toggleArrayItem(arr, opt);
                                  setBrain((prev) => ({
                                    ...prev,
                                    industry: {
                                      ...prev.industry,
                                      data: {
                                        ...prev.industry.data,
                                        [field.key]: updated,
                                      },
                                    },
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-white text-black shadow-md'
                                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {field.type === 'chips-single' && field.options && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {field.options.map((opt) => {
                            const isSelected = currentValue === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setBrain((prev) => ({
                                    ...prev,
                                    industry: {
                                      ...prev.industry,
                                      data: {
                                        ...prev.industry.data,
                                        [field.key]: opt,
                                      },
                                    },
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-white text-black shadow-md'
                                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {field.type === 'text-short' && (
                        <input
                          type="text"
                          placeholder={field.placeholder || 'Enter details...'}
                          value={currentValue || ''}
                          onChange={(e) =>
                            setBrain((prev) => ({
                              ...prev,
                              industry: {
                                ...prev.industry,
                                data: {
                                  ...prev.industry.data,
                                  [field.key]: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. CONDITIONAL QUESTIONS (Only displayed if triggered by prior answers) */}
              <div className="pt-4 border-t border-neutral-800 space-y-4">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-white" />
                  <h3 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                    Operational Routing Rules (Context-Triggered)
                  </h3>
                </div>

                {/* Conditional Question: APPOINTMENTS */}
                {hasAppointments && (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-white">
                      How are customer appointments booked?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Direct booking via Calendly / Cal.com link',
                        'Alpha collects customer info & human team confirms slot',
                        'Phone call booking during operating hours',
                        'Direct walk-in basis',
                      ].map((opt) => {
                        const isSelected = brain.operations?.appointmentBookingMethod === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setBrain((prev) => ({
                                ...prev,
                                operations: {
                                  ...prev.operations,
                                  appointmentBookingMethod: opt,
                                },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white text-black shadow-md'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Conditional Question: SUBSCRIPTIONS */}
                {hasSubscriptions && (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-white">
                      What is your subscription billing structure?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Monthly & Annual recurring tiers',
                        'Usage / Metered consumption billing',
                        'Per-seat user license',
                        'Freemium with paid feature upgrades',
                      ].map((opt) => {
                        const isSelected = brain.operations?.subscriptionStructure === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setBrain((prev) => ({
                                ...prev,
                                operations: {
                                  ...prev.operations,
                                  subscriptionStructure: opt,
                                },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white text-black shadow-md'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Conditional Question: PHYSICAL LOCATION */}
                {hasPhysicalLocation && (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-white">
                      Where are your physical locations and operating hours?
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 500 Park Avenue, NY (Mon-Fri 8am-6pm, Sat 9am-2pm)"
                      value={brain.operations?.physicalLocationsHours || ''}
                      onChange={(e) =>
                        setBrain((prev) => ({
                          ...prev,
                          operations: {
                            ...prev.operations,
                            physicalLocationsHours: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                )}

                {/* Conditional Question: PRODUCTS DELIVERY */}
                {hasProducts && (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-white">
                      How are products fulfilled or shipped?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Standard courier shipping (2–5 business days)',
                        'Same-day / Local express delivery',
                        'Instant digital delivery / Download',
                        'B2B Freight carrier dispatch',
                        'In-store customer pickup',
                      ].map((opt) => {
                        const isSelected = brain.operations?.productDeliveryOrShipping === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setBrain((prev) => ({
                                ...prev,
                                operations: {
                                  ...prev.operations,
                                  productDeliveryOrShipping: opt,
                                },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white text-black shadow-md'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Conditional Question: CONSULTING / SERVICES */}
                {hasConsulting && (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-white">
                      What is your consultation or engagement model?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Free 15-min discovery consultation call',
                        'Paid initial diagnostic audit',
                        'Custom proposal following inquiry qualification',
                        'Monthly ongoing advisory retainer',
                      ].map((opt) => {
                        const isSelected = brain.operations?.serviceConsultationModel === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setBrain((prev) => ({
                                ...prev,
                                operations: {
                                  ...prev.operations,
                                  serviceConsultationModel: opt,
                                },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white text-black shadow-md'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Alpha Behavior</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: ALPHA BEHAVIOR CONFIGURATION */}
          {currentStep === 5 && (
            <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Alpha Behavior & Governance
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Configure Alpha's objectives, tone, priorities, human escalation gates, and strict boundaries.
                </p>
              </div>

              {/* Objectives */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  How should Alpha help your customers? <span className="text-neutral-500 font-normal">(Select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_ALPHA_OBJECTIVES.map((obj) => {
                    const isSelected = brain.alpha.objectives.includes(obj);
                    return (
                      <button
                        key={obj}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            alpha: {
                              ...prev.alpha,
                              objectives: toggleArrayItem(prev.alpha.objectives, obj),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {obj}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priorities */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  What should Alpha prioritize? <span className="text-neutral-500 font-normal">(Select core priorities)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_ALPHA_PRIORITIES.map((prio) => {
                    const isSelected = brain.alpha.priorities.includes(prio);
                    return (
                      <button
                        key={prio}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            alpha: {
                              ...prev.alpha,
                              priorities: toggleArrayItem(prev.alpha.priorities, prio),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {prio}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Human Escalation Gates */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  When should Alpha involve a human team member?
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_ESCALATION_RULES.map((esc) => {
                    const isSelected = brain.alpha.escalationRules.includes(esc);
                    return (
                      <button
                        key={esc}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            alpha: {
                              ...prev.alpha,
                              escalationRules: toggleArrayItem(prev.alpha.escalationRules, esc),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {esc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forbidden Boundaries */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  What should Alpha NEVER do? <span className="text-red-400 font-normal">(Strict Zero-Trust Boundaries)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSAL_FORBIDDEN_BEHAVIORS.map((forb) => {
                    const isSelected = brain.alpha.forbiddenBehaviors.includes(forb);
                    return (
                      <button
                        key={forb}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            alpha: {
                              ...prev.alpha,
                              forbiddenBehaviors: toggleArrayItem(prev.alpha.forbiddenBehaviors, forb),
                            },
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {forb}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alpha Tone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
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
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-md'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>Review & Build Brain</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW SCREEN */}
          {currentStep === 6 && (
            <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Your Company Brain
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Review what Alpha learned. Everything is ready to activate.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold">
                  READY TO BUILD
                </div>
              </div>

              {/* Structured Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
                    <span>Business & Identity</span>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="text-white hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="text-base font-bold text-white">{brain.core.businessName}</div>
                  <div className="text-neutral-400 leading-relaxed">{brain.core.description}</div>
                  {brain.core.website && (
                    <div className="text-neutral-500 font-mono text-[11px]">{brain.core.website}</div>
                  )}
                </div>

                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
                    <span>Industry & Type</span>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-white hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="text-base font-bold text-white">{brain.industry.industryName}</div>
                  <div className="text-neutral-300 font-mono text-[11px]">
                    Model: {brain.industry.businessTypeName}
                  </div>
                  <div className="text-neutral-400">
                    Customers: {brain.core.customers.join(', ') || 'General Audience'}
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
                    <span>Alpha Focus & Objectives</span>
                    <button
                      onClick={() => setCurrentStep(5)}
                      className="text-white hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="font-bold text-white">Tone: {brain.alpha.tone}</div>
                  <div className="text-neutral-400">
                    Focus: {brain.alpha.objectives.slice(0, 4).join(', ') || 'Consultative customer guidance'}
                  </div>
                  <div className="text-neutral-400">
                    Priorities: {brain.alpha.priorities.slice(0, 3).join(' • ')}
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
                    <span>Boundaries & Escalations</span>
                    <button
                      onClick={() => setCurrentStep(5)}
                      className="text-white hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="text-neutral-300 font-medium">
                    Strict Boundaries: {brain.alpha.forbiddenBehaviors.length} enforced
                  </div>
                  <div className="text-neutral-400">
                    Escalate when: {brain.alpha.escalationRules.slice(0, 2).join('; ')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Behavior</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Edit Sections
                  </button>

                  <button
                    disabled={isSaving}
                    onClick={handleSaveAndBuild}
                    className="px-8 py-3 rounded-xl bg-white text-black text-xs font-black tracking-wide hover:bg-neutral-200 transition-all flex items-center space-x-2 cursor-pointer shadow-xl disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>{isSaving ? 'BUILDING BRAIN...' : 'BUILD COMPANY BRAIN'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* 2. POST-CREATION EXECUTIVE COMMAND CENTER (8 EDITABLE SECTIONS) */
        /* ============================================================== */
        <div className="max-w-5xl mx-auto w-full space-y-6">
          {/* Executive Overview Banner */}
          <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    ALPHA CONFIGURED & ACTIVE
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {brain.core.businessName}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                  {brain.core.description}
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => {
                    setIsWizardMode(true);
                    setCurrentStep(1);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run Wizard</span>
                </button>

                <button
                  disabled={isSaving}
                  onClick={handleSaveAndBuild}
                  className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-800/80 text-xs">
              <div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase">Industry</div>
                <div className="font-bold text-white mt-0.5">{brain.industry.industryName}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase">Model</div>
                <div className="font-bold text-white mt-0.5">{brain.industry.businessTypeName}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase">Persona Tone</div>
                <div className="font-bold text-white mt-0.5">{brain.alpha.tone}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase">Last Built</div>
                <div className="font-mono text-neutral-400 mt-0.5">
                  {brain.lastBuiltAt ? new Date(brain.lastBuiltAt).toLocaleDateString() : 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Company Brain Readiness & Diagnostics Engine */}
          <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                {(() => {
                  const score = diagnostics.readinessScore ?? 80;
                  const diagStatus =
                    score >= 80 ? 'OPTIMAL' : score >= 60 ? 'ACCEPTABLE' : score >= 40 ? 'NEEDS_ATTENTION' : 'CRITICAL';
                  const identityScore = (brain.core?.businessName ? 50 : 0) + (brain.core?.description && brain.core.description.length > 20 ? 50 : 0);
                  const offeringsScore = (brain.offeringsV2?.length || brain.catalog?.length) ? 100 : 20;
                  const pricingScore = brain.offeringsV2?.some((o) => o.pricing?.model && o.pricing.model !== 'unspecified') ? 100 : (brain.catalog?.length ? 80 : 30);
                  const opsScore = brain.humanEscalation?.recipientEmail || brain.core?.website ? 100 : 50;
                  const govScore = brain.alpha?.forbiddenBehaviors?.length ? 100 : 70;

                  return (
                    <>
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          diagStatus === 'OPTIMAL'
                            ? 'bg-emerald-950/90 border border-emerald-800 text-emerald-400'
                            : diagStatus === 'ACCEPTABLE'
                            ? 'bg-blue-950/90 border border-blue-800 text-blue-400'
                            : diagStatus === 'NEEDS_ATTENTION'
                            ? 'bg-amber-950/90 border border-amber-800 text-amber-400'
                            : 'bg-rose-950/90 border border-rose-800 text-rose-400'
                        }`}
                      >
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                            Company Brain Intelligence & Readiness
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                              diagStatus === 'OPTIMAL'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : diagStatus === 'ACCEPTABLE'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : diagStatus === 'NEEDS_ATTENTION'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {diagStatus === 'OPTIMAL' ? 'Production Ready' : diagStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-lg font-black text-white mt-0.5 flex items-baseline space-x-2">
                          <span>{score}</span>
                          <span className="text-xs font-normal text-neutral-500">
                            / 100 Readiness Score
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsDetails(!showDiagnosticsDetails)}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <span>
                    {showDiagnosticsDetails ? 'Hide Diagnostics' : 'Inspect Health'}
                  </span>
                  {showDiagnosticsDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* 5-Category Health Meters */}
            {(() => {
              const identityScore = (brain.core?.businessName ? 50 : 0) + (brain.core?.description && brain.core.description.length > 20 ? 50 : 0);
              const offeringsScore = (brain.offeringsV2?.length || brain.catalog?.length) ? 100 : 20;
              const pricingScore = brain.offeringsV2?.some((o) => o.pricing?.model && o.pricing.model !== 'unspecified') ? 100 : (brain.catalog?.length ? 80 : 30);
              const opsScore = brain.humanEscalation?.recipientEmail || brain.core?.website ? 100 : 50;
              const govScore = brain.alpha?.forbiddenBehaviors?.length ? 100 : 70;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  {[
                    { label: 'Identity', score: identityScore },
                    { label: 'Catalog', score: offeringsScore },
                    { label: 'Pricing', score: pricingScore },
                    { label: 'Operations', score: opsScore },
                    { label: 'Governance', score: govScore },
                  ].map((cat) => (
                    <div
                      key={cat.label}
                      className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-neutral-400">{cat.label}</span>
                        <span className="text-white font-bold">{cat.score}%</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            cat.score >= 80
                              ? 'bg-emerald-400'
                              : cat.score >= 50
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Detailed Findings & Recommendations Panel */}
            {showDiagnosticsDetails && (
              <div className="pt-3 border-t border-neutral-800/80 space-y-3 text-xs animate-fadeIn">
                {diagnostics.criticalIssues.length > 0 && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-1">
                    <div className="font-bold text-rose-400 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        Critical Grounding Blockers ({diagnostics.criticalIssues.length})
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-rose-200/90 space-y-0.5 text-[11px]">
                      {diagnostics.criticalIssues.map((issue, idx) => (
                        <li key={issue.id || idx}>{issue.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnostics.warnings.length > 0 && (
                  <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-xl space-y-1">
                    <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Diagnostics Warnings ({diagnostics.warnings.length})</span>
                    </div>
                    <ul className="list-disc list-inside text-amber-200/90 space-y-0.5 text-[11px]">
                      {diagnostics.warnings.map((warn, idx) => (
                        <li key={warn.id || idx}>{warn.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnostics.recommendations.length > 0 && (
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                    <div className="font-bold text-neutral-300 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Recommended Optimizations for Alpha</span>
                    </div>
                    <ul className="list-disc list-inside text-neutral-400 space-y-0.5 text-[11px]">
                      {diagnostics.recommendations.map((rec, idx) => (
                        <li key={rec.id || idx}>{rec.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 8 Independently Editable Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 1: Business Identity */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                    <span>1. Business Identity</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'identity' ? null : 'identity')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'identity' ? 'Close' : 'Edit'}</span>
                  </button>
                </div>
                <div className="text-sm font-bold text-white">{brain.core.businessName}</div>
                <p className="text-xs text-neutral-400 leading-relaxed">{brain.core.description}</p>
                {brain.core.website && (
                  <div className="text-[11px] font-mono text-neutral-500">{brain.core.website}</div>
                )}
              </div>

              {activeEditSection === 'identity' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={brain.core.businessName}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        core: { ...prev.core, businessName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={brain.core.description}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        core: { ...prev.core, description: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    placeholder="Website (Optional)"
                    value={brain.core.website || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        core: { ...prev.core, website: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-white"
                  />
                </div>
              )}
            </div>

            {/* Section 2: Target Customers */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Users className="w-3.5 h-3.5 text-white" />
                    <span>2. Target Customers</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'customers' ? null : 'customers')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'customers' ? 'Close' : 'Edit'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {brain.core.customers.map((c) => (
                    <span key={c} className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-[11px] text-white font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {activeEditSection === 'customers' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {UNIVERSAL_CUSTOMERS.map((cust) => {
                      const isSelected = brain.core.customers.includes(cust);
                      return (
                        <button
                          key={cust}
                          type="button"
                          onClick={() =>
                            setBrain((prev) => ({
                              ...prev,
                              core: {
                                ...prev.core,
                                customers: toggleArrayItem(prev.core.customers, cust),
                              },
                            }))
                          }
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-black'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                          }`}
                        >
                          {cust}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Industry & Business Type */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Globe className="w-3.5 h-3.5 text-white" />
                    <span>3. Industry Information</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'industry' ? null : 'industry')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'industry' ? 'Close' : 'Change'}</span>
                  </button>
                </div>
                <div className="text-sm font-bold text-white">{brain.industry.industryName}</div>
                <div className="text-xs text-neutral-400 font-mono">
                  Business Type: {brain.industry.businessTypeName}
                </div>
              </div>

              {activeEditSection === 'industry' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <p className="text-[11px] text-amber-300">
                    Note: Changing industry will re-adapt specialized fields.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {INDUSTRY_REGISTRY.map((ind) => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => initiateIndustryChange(ind.id)}
                        className={`p-2 rounded-xl text-left text-xs font-bold border transition-colors cursor-pointer ${
                          brain.industry.industryId === ind.id
                            ? 'bg-white text-black border-white'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                        }`}
                      >
                        {ind.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Operations & Fulfillment */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span>4. Operations & Fulfillment</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'operations' ? null : 'operations')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'operations' ? 'Close' : 'Edit'}</span>
                  </button>
                </div>
                <div className="text-xs text-neutral-300 space-y-1">
                  {brain.operations?.appointmentBookingMethod && (
                    <div>• Appointments: {brain.operations.appointmentBookingMethod}</div>
                  )}
                  {brain.operations?.subscriptionStructure && (
                    <div>• Subscription: {brain.operations.subscriptionStructure}</div>
                  )}
                  {brain.operations?.physicalLocationsHours && (
                    <div>• Locations: {brain.operations.physicalLocationsHours}</div>
                  )}
                  {!brain.operations?.appointmentBookingMethod &&
                    !brain.operations?.subscriptionStructure &&
                    !brain.operations?.physicalLocationsHours && (
                      <div className="text-neutral-500 font-mono text-[11px]">Standard digital operations configured.</div>
                    )}
                </div>
              </div>

              {activeEditSection === 'operations' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Locations & Hours"
                    value={brain.operations?.physicalLocationsHours || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        operations: {
                          ...prev.operations,
                          physicalLocationsHours: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    placeholder="Appointment Booking Method"
                    value={brain.operations?.appointmentBookingMethod || ''}
                    onChange={(e) =>
                      setBrain((prev) => ({
                        ...prev,
                        operations: {
                          ...prev.operations,
                          appointmentBookingMethod: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-white"
                  />
                </div>
              )}
            </div>

            {/* Section 5: Sales Channels */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Target className="w-3.5 h-3.5 text-white" />
                    <span>5. Sales Channels & Journeys</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'channels' ? null : 'channels')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'channels' ? 'Close' : 'Edit'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {brain.core.salesChannels.map((ch) => (
                    <span key={ch} className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-[11px] text-white font-medium">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>

              {activeEditSection === 'channels' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {UNIVERSAL_SALES_CHANNELS.map((ch) => {
                      const isSelected = brain.core.salesChannels.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() =>
                            setBrain((prev) => ({
                              ...prev,
                              core: {
                                ...prev.core,
                                salesChannels: toggleArrayItem(prev.core.salesChannels, ch),
                              },
                            }))
                          }
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-black'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                          }`}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 6: Alpha Behavior */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Zap className="w-3.5 h-3.5 text-white" />
                    <span>6. Alpha Behavior</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'alpha' ? null : 'alpha')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'alpha' ? 'Close' : 'Edit'}</span>
                  </button>
                </div>
                <div className="text-xs text-white font-bold">Persona Tone: {brain.alpha.tone}</div>
                <div className="text-xs text-neutral-400">
                  Priorities: {brain.alpha.priorities.slice(0, 3).join(' • ')}
                </div>
              </div>

              {activeEditSection === 'alpha' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase font-mono">Select Tone:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {UNIVERSAL_TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setBrain((prev) => ({
                            ...prev,
                            alpha: { ...prev.alpha, tone: t },
                          }))
                        }
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          brain.alpha.tone === t
                            ? 'bg-white text-black'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 7: Strict Boundaries & Policies */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    <span>7. Policies & Boundaries</span>
                  </div>
                  <button
                    onClick={() => setActiveEditSection(activeEditSection === 'policies' ? null : 'policies')}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{activeEditSection === 'policies' ? 'Close' : 'Edit'}</span>
                  </button>
                </div>
                <div className="text-xs text-neutral-300 font-medium">
                  {brain.alpha.forbiddenBehaviors.length} Forbidden Boundaries Active
                </div>
                <div className="text-[11px] text-neutral-400">
                  Escalation Triggers: {brain.alpha.escalationRules.slice(0, 2).join('; ')}
                </div>
              </div>

              {activeEditSection === 'policies' && (
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {UNIVERSAL_FORBIDDEN_BEHAVIORS.map((forb) => {
                      const isSelected = brain.alpha.forbiddenBehaviors.includes(forb);
                      return (
                        <button
                          key={forb}
                          type="button"
                          onClick={() =>
                            setBrain((prev) => ({
                              ...prev,
                              alpha: {
                                ...prev.alpha,
                                forbiddenBehaviors: toggleArrayItem(prev.alpha.forbiddenBehaviors, forb),
                              },
                            }))
                          }
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                          }`}
                        >
                          {forb}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 8: Industry-Specific Knowledge */}
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                    <Layers className="w-3.5 h-3.5 text-white" />
                    <span>8. Industry Knowledge Module</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsWizardMode(true);
                      setCurrentStep(4);
                    }}
                    className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Module</span>
                  </button>
                </div>
                <div className="text-xs text-neutral-300 space-y-1">
                  {Object.entries(brain.industry.data || {}).map(([k, val]) => (
                    <div key={k} className="truncate">
                      • <span className="font-semibold text-neutral-200">{k}:</span>{' '}
                      <span className="text-neutral-400">
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(brain.industry.data || {}).length === 0 && (
                    <div className="text-neutral-500 font-mono text-[11px]">
                      No specialized parameters configured. Click edit to configure.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Industry Change Confirmation Warning Modal */}
      {industryChangeWarningOpen && pendingIndustryId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-900/60 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Switch Business Industry?
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Changing your industry to{' '}
                <span className="font-bold text-white">
                  {getIndustryDefinition(pendingIndustryId).name}
                </span>{' '}
                will adapt specialized industry questions. Your business name, description, website, and general policies will be safely preserved.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setIndustryChangeWarningOpen(false);
                  setPendingIndustryId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => applyIndustrySelection(pendingIndustryId)}
                className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-Run Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl text-center relative overflow-hidden"
          >
            <div className="text-4xl select-none">🎉</div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight uppercase">
                CONGRATULATIONS, {brain.core.businessName}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your Company Brain is ready. Alpha now understands your business operations, catalog, and commercial boundaries.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800/80 text-left space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Company Brain ready</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Alpha configured & grounded</span>
              </div>
              <div className="flex items-center space-x-2 text-white font-semibold">
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                <span>Ready for website connection</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>MEET ALPHA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
