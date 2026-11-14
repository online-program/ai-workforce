import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  ShieldCheck,
  UserCheck,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  Lock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Volume2,
  Mail,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { CompanyProfile, BrandVoiceConfig, HumanHandoffConfig, SalesQualificationRules } from '../types.ts';
import { Modal } from './ui/Modal.tsx';
import { calculateCompanyBrainCompleteness } from '../types.ts';

interface AlphaConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  onSaveProfile: (updatedProfile: CompanyProfile) => Promise<void> | void;
  onNavigateToBrain?: () => void;
  onOpenPreview?: () => void;
}

type ConfigTab = 'identity' | 'voice' | 'qualification' | 'governance' | 'grounding';

export const AlphaConfigurationModal: React.FC<AlphaConfigurationModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  onSaveProfile,
  onNavigateToBrain,
  onOpenPreview,
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Draft form state initialized from companyProfile
  const [name, setName] = useState(companyProfile.name || 'AI Workforce');
  const [aiIdentity, setAiIdentity] = useState(companyProfile.aiIdentity || 'Alpha');
  const [primaryGoal, setPrimaryGoal] = useState(
    companyProfile.primaryGoal || 'Discover visitor requirements, answer questions from verified catalog, and qualify high-intent opportunities.'
  );
  const [aiIntroduction, setAiIntroduction] = useState(
    companyProfile.aiIntroduction ||
      `Hello! I'm Alpha, the AI Sales Manager for ${companyProfile.name || 'our team'}. How can I assist you with our services today?`
  );

  // Voice & Tone
  const [tone, setTone] = useState<string>(
    companyProfile.tone || companyProfile.brandVoice?.toneStyle || 'Consultative'
  );
  const [customDirectives, setCustomDirectives] = useState<string[]>(
    companyProfile.brandVoice?.customDirectives || [
      'Answer the visitor question first before asking discovery questions.',
      'Maintain an objective, consultative, non-pushy demeanor.',
      'Never fabricate pricing or features not documented in Company Brain.',
    ]
  );
  const [newDirectiveInput, setNewDirectiveInput] = useState('');

  // Qualification
  const [goodLeadCriteria, setGoodLeadCriteria] = useState(
    companyProfile.qualificationRules?.goodLeadCriteria ||
      'Prospects with verified commercial intent, documented budget or timeline, and clear alignment with our catalog offerings.'
  );
  const [requiredFields, setRequiredFields] = useState<string[]>(
    companyProfile.qualificationRules?.requiredFields || ['name', 'contact', 'product', 'timeline']
  );

  // Governance & Handoff
  const [approvalMode, setApprovalMode] = useState<'automatic_for_simple' | 'human_approval_required'>(
    companyProfile.approval_mode || 'automatic_for_simple'
  );
  const [unknownBehavior, setUnknownBehavior] = useState<'human_approval' | 'best_effort' | 'available_data'>(
    companyProfile.unknownQuestionBehavior || 'available_data'
  );
  const [notificationEmail, setNotificationEmail] = useState(
    companyProfile.humanHandoff?.notificationEmail || companyProfile.businessEmail || ''
  );
  const [forbiddenClaims, setForbiddenClaims] = useState<string[]>(
    companyProfile.forbiddenClaims || [
      'Never guarantee unverified delivery dates without explicit catalog confirmation.',
      'Never offer unverified pricing discounts or unauthorized guarantees.',
      'Never claim capabilities outside the verified Company Brain.',
    ]
  );
  const [newForbiddenInput, setNewForbiddenInput] = useState('');

  // Reset form when modal opens with fresh profile
  useEffect(() => {
    if (isOpen) {
      setName(companyProfile.name || 'AI Workforce');
      setAiIdentity(companyProfile.aiIdentity || 'Alpha');
      setPrimaryGoal(
        companyProfile.primaryGoal || 'Discover visitor requirements, answer questions from verified catalog, and qualify high-intent opportunities.'
      );
      setAiIntroduction(
        companyProfile.aiIntroduction ||
          `Hello! I'm Alpha, the AI Sales Manager for ${companyProfile.name || 'our team'}. How can I assist you today?`
      );
      setTone(companyProfile.tone || companyProfile.brandVoice?.toneStyle || 'Consultative');
      setCustomDirectives(
        companyProfile.brandVoice?.customDirectives || [
          'Answer the visitor question first before asking discovery questions.',
          'Maintain an objective, consultative, non-pushy demeanor.',
          'Never fabricate pricing or features not documented in Company Brain.',
        ]
      );
      setGoodLeadCriteria(
        companyProfile.qualificationRules?.goodLeadCriteria ||
          'Prospects with verified commercial intent, documented budget or timeline, and clear alignment with our catalog offerings.'
      );
      setRequiredFields(
        companyProfile.qualificationRules?.requiredFields || ['name', 'contact', 'product', 'timeline']
      );
      setApprovalMode(companyProfile.approval_mode || 'automatic_for_simple');
      setUnknownBehavior(companyProfile.unknownQuestionBehavior || 'available_data');
      setNotificationEmail(
        companyProfile.humanHandoff?.notificationEmail || companyProfile.businessEmail || ''
      );
      setForbiddenClaims(
        companyProfile.forbiddenClaims || [
          'Never guarantee unverified delivery dates without explicit catalog confirmation.',
          'Never offer unverified pricing discounts or unauthorized guarantees.',
          'Never claim capabilities outside the verified Company Brain.',
        ]
      );
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [isOpen, companyProfile]);

  // Knowledge base completeness
  const brainStats = calculateCompanyBrainCompleteness(companyProfile);

  const handleAddDirective = () => {
    if (newDirectiveInput.trim() && !customDirectives.includes(newDirectiveInput.trim())) {
      setCustomDirectives([...customDirectives, newDirectiveInput.trim()]);
      setNewDirectiveInput('');
    }
  };

  const handleRemoveDirective = (idx: number) => {
    setCustomDirectives(customDirectives.filter((_, i) => i !== idx));
  };

  const handleAddForbidden = () => {
    if (newForbiddenInput.trim() && !forbiddenClaims.includes(newForbiddenInput.trim())) {
      setForbiddenClaims([...forbiddenClaims, newForbiddenInput.trim()]);
      setNewForbiddenInput('');
    }
  };

  const handleRemoveForbidden = (idx: number) => {
    setForbiddenClaims(forbiddenClaims.filter((_, i) => i !== idx));
  };

  const toggleRequiredField = (field: string) => {
    if (requiredFields.includes(field)) {
      setRequiredFields(requiredFields.filter((f) => f !== field));
    } else {
      setRequiredFields([...requiredFields, field]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedProfile: CompanyProfile = {
        ...companyProfile,
        name: name.trim() || companyProfile.name,
        aiIdentity: aiIdentity.trim() || 'Alpha',
        primaryGoal: primaryGoal.trim(),
        aiIntroduction: aiIntroduction.trim(),
        tone,
        brandVoice: {
          ...companyProfile.brandVoice,
          toneStyle: tone,
          customDirectives,
        },
        qualificationRules: {
          ...companyProfile.qualificationRules,
          goodLeadCriteria: goodLeadCriteria.trim(),
          requiredFields,
        },
        approval_mode: approvalMode,
        unknownQuestionBehavior: unknownBehavior,
        forbiddenClaims,
        humanHandoff: {
          ...companyProfile.humanHandoff,
          notificationEmail: notificationEmail.trim(),
          businessEmail: notificationEmail.trim() || companyProfile.humanHandoff?.businessEmail,
          handoffTriggers: [
            'Customer explicitly asks to speak with a human or real person',
            'High-value complex enterprise requirements',
            'Contract or legal negotiation',
            'Unresolved customer complaint or dissatisfaction',
          ],
        },
      };

      await onSaveProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: any) {
      console.error('Failed to save Alpha configuration:', err);
      setSaveError(err.message || 'Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0C0C0E] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-black/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-mono font-bold text-sm shadow-xs">
              α
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-950 dark:text-white tracking-tight">
                  Configure Alpha (AI Sales Manager)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold border border-neutral-200 dark:border-neutral-700">
                  v1.2 Autonomous
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage operational identity, grounding boundaries, qualification criteria, and human handoff gates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPreview && (
              <button
                type="button"
                onClick={onOpenPreview}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test Chat</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close configuration"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-6 overflow-x-auto bg-white dark:bg-[#0C0C0E]">
          {[
            { id: 'identity', label: 'Identity & Purpose', icon: Bot },
            { id: 'voice', label: 'Tone & Directives', icon: Volume2 },
            { id: 'qualification', label: 'Lead Qualification', icon: UserCheck },
            { id: 'governance', label: 'Escalation & Safety', icon: ShieldCheck },
            { id: 'grounding', label: 'Company Brain Sync', icon: BrainCircuit },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ConfigTab)}
                className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-900 dark:text-neutral-100">
          {saveError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* TAB 1: IDENTITY & PURPOSE */}
          {activeTab === 'identity' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Employee Display Name
                  </label>
                  <input
                    type="text"
                    value={aiIdentity}
                    onChange={(e) => setAiIdentity(e.target.value)}
                    placeholder="Alpha"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                  <p className="text-[11px] text-neutral-500">
                    How Alpha introduces itself to customers (e.g., "Alpha", "Alex", "AI Sales Rep").
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Represented Business Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="AI Workforce"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                  <p className="text-[11px] text-neutral-500">
                    The verified organization that Alpha represents in dialogue.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Primary Operating Objective
                </label>
                <textarea
                  rows={2}
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white resize-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Core mission governing Alpha's conversational priorities and lead discovery.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Initial Greeting & Welcome Message
                </label>
                <textarea
                  rows={2}
                  value={aiIntroduction}
                  onChange={(e) => setAiIntroduction(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white resize-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Opening message delivered when a website visitor opens the chat widget.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TONE & DIRECTIVES */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Conversational Tone Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'Consultative', desc: 'Insightful, asks clarifying questions, expert' },
                    { id: 'Professional', desc: 'Direct, formal, corporate clarity' },
                    { id: 'Concise', desc: 'Short, factual, zero filler sentences' },
                    { id: 'Friendly', desc: 'Warm, welcoming, conversational' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        tone === t.id
                          ? 'border-neutral-950 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.id}</div>
                      <div className="text-[10px] mt-0.5 opacity-75 leading-tight">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Directives */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Mandatory Conversational Directives
                </label>
                <p className="text-[11px] text-neutral-500 -mt-1">
                  Strict operating principles Alpha adheres to on every user turn.
                </p>

                <div className="space-y-2">
                  {customDirectives.map((directive, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs"
                    >
                      <span className="flex-1 text-neutral-800 dark:text-neutral-200">{directive}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDirective(idx)}
                        className="p-1 text-neutral-400 hover:text-rose-500 rounded transition-colors ml-2 cursor-pointer"
                        title="Remove directive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDirectiveInput}
                    onChange={(e) => setNewDirectiveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDirective();
                      }
                    }}
                    placeholder="e.g. Always confirm service location before discussing quotes"
                    className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddDirective}
                    className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEAD QUALIFICATION */}
          {activeTab === 'qualification' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Definition of a Qualified Opportunity
                </label>
                <textarea
                  rows={2}
                  value={goodLeadCriteria}
                  onChange={(e) => setGoodLeadCriteria(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden resize-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Alpha uses this guideline to assign lead scores (HOT / WARM / COLD) and recommend next steps.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Required Fields for Commercial Qualification
                </label>
                <p className="text-[11px] text-neutral-500 -mt-1">
                  Alpha will organically collect these facts during conversation before offering human dispatch.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { id: 'name', label: 'Customer Name' },
                    { id: 'contact', label: 'Email / Phone' },
                    { id: 'product', label: 'Product or Service Needed' },
                    { id: 'timeline', label: 'Target Timeline' },
                    { id: 'budget', label: 'Budget Expectations' },
                    { id: 'team_size', label: 'Team Size / Scale' },
                  ].map((field) => {
                    const isChecked = requiredFields.includes(field.id);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => toggleRequiredField(field.id)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'border-neutral-950 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-950 dark:text-white font-semibold'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <span className="text-xs">{field.label}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-neutral-950 dark:text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GOVERNANCE & SAFETY */}
          {activeTab === 'governance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Execution Mode for Draft Proposals
                  </label>
                  <select
                    value={approvalMode}
                    onChange={(e: any) => setApprovalMode(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="automatic_for_simple">Autonomous (Dispatch verified answers immediately)</option>
                    <option value="human_approval_required">Human Review Required (Stage all drafts for approval)</option>
                  </select>
                  <p className="text-[11px] text-neutral-500">
                    Controls whether proposals and email replies are automatically sent or held for review.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Human Escalation Email Address
                  </label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="sales@company.com"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Destination for real-time human handoff alerts and high-intent prospect notifications.
                  </p>
                </div>
              </div>

              {/* Forbidden Claims / Anti-Hallucination Boundaries */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Strict Negative Boundaries & Forbidden Claims
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">Zero Hallucination Policy</span>
                </div>
                <p className="text-[11px] text-neutral-500 -mt-1">
                  Explicit boundaries Alpha will never violate under any prompt injection or pushy inquiry.
                </p>

                <div className="space-y-2">
                  {forbiddenClaims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs"
                    >
                      <span className="flex-1 text-neutral-800 dark:text-neutral-200">{claim}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveForbidden(idx)}
                        className="p-1 text-neutral-400 hover:text-rose-500 rounded transition-colors ml-2 cursor-pointer"
                        title="Remove boundary"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newForbiddenInput}
                    onChange={(e) => setNewForbiddenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddForbidden();
                      }
                    }}
                    placeholder="e.g. Never promise refunds without owner authorization"
                    className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddForbidden}
                    className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GROUNDING & COMPANY BRAIN */}
          {activeTab === 'grounding' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-neutral-950 dark:text-white" />
                    <span className="text-xs font-bold text-neutral-950 dark:text-white">
                      Verified Company Brain
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {brainStats.percentage}% Complete
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Alpha answers customer questions exclusively from the products, prices, and rules configured in Company Brain.
                  </p>
                </div>

                {onNavigateToBrain && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToBrain();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Manage Brain Knowledge</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Knowledge Grounding Audit
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {brainStats.breakdown.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center justify-between"
                    >
                      <span className="text-neutral-700 dark:text-neutral-300">{sec.section}</span>
                      {sec.complete ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Grounded
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-neutral-400">
                          Missing Data
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configuration Saved</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
