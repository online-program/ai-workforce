import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code,
  Copy,
  Check,
  Globe,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Palette,
  Laptop,
  X,
  Play,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings,
  Layers,
} from 'lucide-react';
import { CompanyProfile, InquiryLead, WidgetConfig } from '../types.ts';
import { CustomerChatWidget } from './CustomerChatWidget.tsx';
import { getWidgetConfig, saveWidgetConfig, getOrCreateWidgetId } from '../services/workspaceService.ts';
import { generateWidgetEmbedSnippet } from '../utils/widgetUrl.ts';
import { generateAlphaVisitorGreeting } from '../utils/alphaWelcomeUtils.ts';
import { TiltCard } from './ui/TiltCard.tsx';
import { PremiumButton } from './ui/PremiumButton.tsx';
import { SectionHeader } from './ui/SectionHeader.tsx';
import { LiveIndicator } from './ui/LiveIndicator.tsx';

interface WebsiteChatTabProps {
  companyProfile: CompanyProfile;
  userId?: string;
  onLeadAutoCreated?: (lead: InquiryLead) => void;
  onNavigateToWorkQueue?: () => void;
}

export const WebsiteChatTab: React.FC<WebsiteChatTabProps> = ({
  companyProfile,
  userId,
  onLeadAutoCreated,
  onNavigateToWorkQueue,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'html' | 'wordpress' | 'webflow' | 'shopify' | 'react'>('html');

  // Widget Configuration State (Saved vs Draft)
  const [savedConfig, setSavedConfig] = useState<WidgetConfig>(() => ({
    widget_id: companyProfile.widget_id || (userId ? getOrCreateWidgetId(userId) : ''),
    user_id: userId || '',
    business_name: companyProfile.name || 'My Business',
    welcome_message: generateAlphaVisitorGreeting(companyProfile),
    theme_color: '#000000',
    position: 'bottom-right',
    design_style: 'attractive_3d',
    is_active: true,
  }));

  const [draftConfig, setDraftConfig] = useState<WidgetConfig>(savedConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sandboxResetKey, setSandboxResetKey] = useState(0);

  // Load saved configuration on mount or user change
  useEffect(() => {
    const targetUserId = userId || '';
    if (targetUserId) {
      getWidgetConfig(targetUserId).then((saved) => {
        if (saved) {
          const merged: WidgetConfig = {
            ...saved,
            welcome_message: generateAlphaVisitorGreeting(companyProfile, saved.welcome_message),
            design_style: saved.design_style || 'attractive_3d',
          };
          setSavedConfig(merged);
          setDraftConfig(merged);
        } else {
          const initial: WidgetConfig = {
            widget_id: companyProfile.widget_id || getOrCreateWidgetId(targetUserId),
            user_id: targetUserId,
            business_name: companyProfile.name || 'My Business',
            welcome_message: generateAlphaVisitorGreeting(companyProfile),
            theme_color: '#000000',
            position: 'bottom-right',
            design_style: 'attractive_3d',
            is_active: true,
          };
          setSavedConfig(initial);
          setDraftConfig(initial);
        }
      });
    }
  }, [companyProfile, userId]);

  const activeWidgetId =
    draftConfig.widget_id || (userId ? getOrCreateWidgetId(userId) : '');

  const embedSnippet = generateWidgetEmbedSnippet(activeWidgetId, {
    designStyle: draftConfig.design_style || 'attractive_3d',
    position: draftConfig.position,
    color: draftConfig.theme_color,
  });

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const hasUnsavedChanges = JSON.stringify(draftConfig) !== JSON.stringify(savedConfig);

  const handleSaveChanges = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await saveWidgetConfig(userId, draftConfig);
      setSavedConfig(draftConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save widget config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSandbox = () => {
    setSandboxResetKey((prev) => prev + 1);
  };

  // Keyboard Escape listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSandboxOpen(false);
        setIsGuideOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 font-sans text-neutral-100">
      {/* Tab Header & Deployment Status Bar */}
      <div className="p-6 rounded-2xl bg-[#0C0C0E] border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              Website Deployment
            </span>
            <span className="text-neutral-600">·</span>
            <LiveIndicator label="Widget Active" size="sm" variant="monochrome" />
            <span className="text-neutral-600">·</span>
            <span className="text-xs font-mono text-neutral-400">ID: {activeWidgetId}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Website Chat Widget Studio
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
            Configure Alpha's appearance, preview in a real sandbox environment, and install on your website.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PremiumButton
            variant="outline"
            size="sm"
            onClick={() => setIsGuideOpen(true)}
            leftIcon={<BookOpen className="w-4 h-4 text-neutral-400" />}
          >
            Installation Guide
          </PremiumButton>

          <PremiumButton
            variant="primary"
            size="sm"
            onClick={() => setIsSandboxOpen(true)}
            leftIcon={<Play className="w-4 h-4 text-black" />}
          >
            Open Interactive Sandbox
          </PremiumButton>
        </div>
      </div>

      {/* 1. Primary Embed Snippet Card */}
      <TiltCard className="p-6 sm:p-8 bg-[#0C0C0E] border-neutral-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                1-Step HTML Installation
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Production Ready</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              Copy Website Installation Code
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Paste this script tag right before the closing <code className="font-mono text-neutral-300">&lt;/body&gt;</code> tag on your website.
            </p>
          </div>

          <PremiumButton
            variant={copiedCode ? 'live' : 'primary'}
            size="md"
            onClick={handleCopySnippet}
            leftIcon={copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}
          </PremiumButton>
        </div>

        {/* Code Snippet Display Box */}
        <div className="mt-5 relative rounded-xl bg-black border border-neutral-800 p-4 font-mono text-xs text-neutral-300 overflow-x-auto selection:bg-neutral-800">
          <pre className="whitespace-pre">{embedSnippet}</pre>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400">
          <span>Compatible with WordPress, Shopify, Webflow, Framer, React, Next.js, and static HTML.</span>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="text-neutral-400 hover:underline font-medium transition-colors cursor-pointer text-left sm:text-right"
          >
            Need help? View step-by-step installation guide →
          </button>
        </div>
      </TiltCard>

      {/* 2. Interactive Sandbox Preview & Widget Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sandbox Preview Area */}
        <div className="lg:col-span-6 space-y-4">
          <TiltCard className="p-6 bg-[#0C0C0E] border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                  LIVE PREVIEW ENVIRONMENT
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Interactive Widget Sandbox
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetSandbox}
                  title="Reset preview conversation"
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-400" />
                  <span>Reset Chat</span>
                </button>
                <PremiumButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSandboxOpen(true)}
                  leftIcon={<Play className="w-3 h-3" />}
                >
                  Open Full Sandbox
                </PremiumButton>
              </div>
            </div>

            {/* In-Page Sandbox Display */}
            <div className="h-[440px] rounded-xl overflow-hidden border border-neutral-800 bg-black relative shadow-2xl">
              <CustomerChatWidget
                key={`sandbox-inpage-${sandboxResetKey}`}
                companyProfile={companyProfile}
                isOpen={true}
                themeColor={draftConfig.theme_color}
                welcomeMessage={draftConfig.welcome_message}
                design_style={draftConfig.design_style}
                isSimulatedPreview={true}
                onLeadAutoCreated={(lead) => onLeadAutoCreated?.(lead)}
                userId={userId}
              />
            </div>
            <p className="text-[11px] text-neutral-500 font-mono text-center">
              Sandbox conversations are isolated and will not pollute your production lead pipeline.
            </p>
          </TiltCard>
        </div>

        {/* Right Column: Widget Configuration & Customization Settings */}
        <div className="lg:col-span-6 space-y-4">
          <TiltCard className="p-6 bg-[#0C0C0E] border-neutral-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                  CUSTOMIZATION
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Widget Appearance & Behavior
                </h3>
              </div>
              {hasUnsavedChanges && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                  Unsaved Changes
                </span>
              )}
            </div>

            {/* Appearance Group */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-white mb-1.5">
                  Welcome Greeting Message
                </label>
                <textarea
                  value={draftConfig.welcome_message}
                  onChange={(e) => setDraftConfig({ ...draftConfig, welcome_message: e.target.value })}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors leading-relaxed"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Derived from your Company Brain. Grounded, conversational, and non-pushy.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-white mb-1.5">
                    Widget Position
                  </label>
                  <select
                    value={draftConfig.position}
                    onChange={(e) => setDraftConfig({ ...draftConfig, position: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-600 cursor-pointer"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-white mb-1.5">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={draftConfig.theme_color || '#000000'}
                      onChange={(e) => setDraftConfig({ ...draftConfig, theme_color: e.target.value })}
                      className="w-9 h-9 rounded-xl cursor-pointer bg-neutral-900 border border-neutral-800 p-1"
                    />
                    <span className="font-mono text-xs text-neutral-300">
                      {draftConfig.theme_color || '#000000'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-white mb-1.5">
                  Visual Style Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'attractive_3d', label: '3D Tactile Monochrome' },
                    { id: 'simple', label: 'Minimal Flat' },
                  ].map((styleOption) => (
                    <button
                      key={styleOption.id}
                      type="button"
                      onClick={() => setDraftConfig({ ...draftConfig, design_style: styleOption.id as any })}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        draftConfig.design_style === styleOption.id
                          ? 'bg-white text-black border-white shadow-md'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {styleOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDraftConfig(savedConfig)}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`text-xs font-medium transition-colors ${
                    hasUnsavedChanges ? 'text-neutral-400 hover:text-white cursor-pointer' : 'text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  Discard Draft
                </button>

                <PremiumButton
                  variant={saveSuccess ? 'live' : 'primary'}
                  size="sm"
                  isLoading={isSaving}
                  disabled={!hasUnsavedChanges && !saveSuccess}
                  onClick={handleSaveChanges}
                >
                  {saveSuccess ? 'Saved to Production!' : 'Save & Publish Changes'}
                </PremiumButton>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>

      {/* 3. FULL INTERACTIVE SANDBOX MODAL (Can be opened, closed, and reopened indefinitely) */}
      <AnimatePresence>
        {isSandboxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-3xl bg-[#0a0a0c] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-black border-b border-neutral-800 flex items-center justify-between select-none">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold font-mono text-sm">
                    α
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">
                      Alpha Sandbox Environment
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                      Previewing: {draftConfig.business_name} · Isolated Simulation
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleResetSandbox}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Reset Chat</span>
                  </button>

                  <button
                    onClick={() => setIsSandboxOpen(false)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                    aria-label="Close Sandbox"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body with Full Widget */}
              <div className="flex-1 p-4 sm:p-6 bg-[#070709] overflow-y-auto">
                <div className="h-[520px] rounded-xl overflow-hidden border border-neutral-800 bg-black relative shadow-2xl max-w-xl mx-auto">
                  <CustomerChatWidget
                    key={`sandbox-modal-${sandboxResetKey}`}
                    companyProfile={companyProfile}
                    isOpen={true}
                    onClose={() => setIsSandboxOpen(false)}
                    themeColor={draftConfig.theme_color}
                    welcomeMessage={draftConfig.welcome_message}
                    design_style={draftConfig.design_style}
                    isSimulatedPreview={true}
                    onLeadAutoCreated={(lead) => onLeadAutoCreated?.(lead)}
                    userId={userId}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. INSTALLATION GUIDE MODAL (Opens cleanly on clicking 'Installation Guide') */}
      <AnimatePresence>
        {isGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-3xl bg-[#0C0C0E] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 bg-black border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      Install Alpha on Your Website
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Step-by-step instructions for deploying Alpha in under 2 minutes.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsGuideOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  aria-label="Close Guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
                {/* Platform Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
                  {[
                    { id: 'html', label: 'HTML / General' },
                    { id: 'wordpress', label: 'WordPress' },
                    { id: 'webflow', label: 'Webflow' },
                    { id: 'shopify', label: 'Shopify' },
                    { id: 'react', label: 'React / Next.js' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePlatformTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                        activePlatformTab === tab.id
                          ? 'bg-white text-black font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Platform Specific Steps */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white text-sm">
                      <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs font-mono font-bold">1</span>
                      <span>Copy Your Installation Snippet</span>
                    </div>
                    <p className="text-neutral-400 leading-relaxed pl-7">
                      Your unique Alpha script is generated specifically for {companyProfile.name || 'your business'}.
                    </p>

                    <div className="pl-7 pt-2">
                      <div className="p-3 rounded-lg bg-black border border-neutral-800 font-mono text-[11px] text-neutral-200 overflow-x-auto relative">
                        <pre>{embedSnippet}</pre>
                        <button
                          onClick={handleCopySnippet}
                          className="absolute top-2 right-2 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                        >
                          {copiedCode ? 'Copied ✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white text-sm">
                      <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs font-mono font-bold">2</span>
                      <span>
                        {activePlatformTab === 'html' && 'Paste Before Closing </body> Tag'}
                        {activePlatformTab === 'wordpress' && 'Insert into Header/Footer Scripts or Theme Header'}
                        {activePlatformTab === 'webflow' && 'Add to Custom Code (Footer Code) in Site Settings'}
                        {activePlatformTab === 'shopify' && 'Add to Theme Code (theme.liquid) Before </body>'}
                        {activePlatformTab === 'react' && 'Include via Script Tag or Next.js <Script /> component'}
                      </span>
                    </div>
                    <p className="text-neutral-400 leading-relaxed pl-7">
                      {activePlatformTab === 'html' && 'Open your website source code or index.html and paste the script snippet right before </body>.'}
                      {activePlatformTab === 'wordpress' && 'Use a plugin like "Insert Headers and Footers" or edit theme header.php to add the snippet.'}
                      {activePlatformTab === 'webflow' && 'Go to Site Settings → Custom Code → Footer Code and paste the script snippet.'}
                      {activePlatformTab === 'shopify' && 'Go to Online Store → Themes → Edit Code → theme.liquid and paste before </body>.'}
                      {activePlatformTab === 'react' && 'In Next.js, import Script from "next/script" and render with strategy="afterInteractive".'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white text-sm">
                      <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs font-mono font-bold">3</span>
                      <span>Publish & Verify</span>
                    </div>
                    <p className="text-neutral-400 leading-relaxed pl-7">
                      Publish your website. Alpha will immediately activate in the bottom right corner, ready to engage visitors and capture leads.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-neutral-400 text-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Installation Status: Ready for Deployment</span>
                  </span>

                  <button
                    onClick={() => setIsGuideOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
