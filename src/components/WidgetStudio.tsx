import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  MessageSquare,
  Bot,
  Sliders,
  Eye,
  Check,
  RotateCcw,
  Save,
  ShieldCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  Layers,
  Palette,
  Layout,
  Shapes,
  Maximize2,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  WidgetConfig,
  CompanyProfile,
  InquiryLead,
  WidgetStudioConfig,
  WidgetVisualMode,
  WidgetLauncherType,
  WidgetLauncherShape,
  WidgetLauncherSize,
  WidgetShadowIntensity,
  WidgetGlowIntensity,
  WidgetAnimationIntensity,
  WidgetPosition,
} from '../types.ts';
import { CustomerChatWidget } from './CustomerChatWidget.tsx';
import { WidgetLauncherButton } from './WidgetLauncherButton.tsx';
import {
  WIDGET_PRESETS,
  calculateContrastRatio,
  getAccessibleTextColor,
  sanitizeWidgetStudioConfig,
  defaultStudioConfig,
} from '../utils/widgetDesignUtils.ts';
import { generateWidgetEmbedSnippet } from '../utils/widgetUrl.ts';
import { saveWidgetConfig } from '../services/workspaceService.ts';
import { SavePublishButton } from './SavePublishButton.tsx';

interface WidgetStudioProps {
  companyProfile: CompanyProfile;
  userId?: string;
  initialConfig: WidgetConfig;
  onSaveConfig: (updatedConfig: WidgetConfig) => Promise<void>;
  onLeadAutoCreated?: (lead: InquiryLead) => void;
}

export const WidgetStudio: React.FC<WidgetStudioProps> = ({
  companyProfile,
  userId,
  initialConfig,
  onSaveConfig,
  onLeadAutoCreated,
}) => {
  // Main studio state populated from initialConfig
  const [studioConfig, setStudioConfig] = useState<WidgetStudioConfig>(() => {
    const raw: Partial<WidgetStudioConfig> = {
      mode: (initialConfig.design_style as WidgetVisualMode) || 'attractive_3d',
      launcherType: initialConfig.launcherType || 'ai_workforce',
      logoUrl: initialConfig.logoUrl || '',
      primaryColor: initialConfig.theme_color || '#0f172a',
      secondaryColor: initialConfig.secondaryColor || '#3b82f6',
      backgroundColor: initialConfig.backgroundColor || '#ffffff',
      textColor: initialConfig.textColor || '#0f172a',
      aiMessageColor: initialConfig.aiMessageColor || '#f1f5f9',
      aiMessageTextColor: initialConfig.aiMessageTextColor || '#0f172a',
      userMessageColor: initialConfig.userMessageColor || initialConfig.theme_color || '#0f172a',
      userMessageTextColor: initialConfig.userMessageTextColor || '#ffffff',
      gradientEnabled: initialConfig.gradientEnabled ?? false,
      gradientType: initialConfig.gradientType || 'none',
      gradientColor1: initialConfig.gradientColor1 || initialConfig.theme_color || '#0f172a',
      gradientColor2: initialConfig.gradientColor2 || '#1e293b',
      gradientAngle: initialConfig.gradientAngle ?? 135,
      launcherSize: initialConfig.launcherSize || 'medium',
      launcherShape: initialConfig.launcherShape || 'circle',
      borderRadius: initialConfig.borderRadius ?? 20,
      shadowIntensity: initialConfig.shadowIntensity || 'medium',
      glowIntensity: initialConfig.glowIntensity || 'subtle',
      animationIntensity: initialConfig.animationIntensity || 'subtle',
      launcherPosition: (initialConfig.launcherPosition || initialConfig.position || 'bottom-right') as WidgetPosition,
      position: (initialConfig.position || initialConfig.launcherPosition || 'bottom-right') as WidgetPosition,
    };
    return sanitizeWidgetStudioConfig(raw);
  });

  const [businessName, setBusinessName] = useState(initialConfig.business_name || companyProfile.name || 'My Business');
  const [welcomeMessage, setWelcomeMessage] = useState(initialConfig.welcome_message || '');

  // UI interaction state
  const [previewChatOpen, setPreviewChatOpen] = useState(true);
  const [activeStudioSection, setActiveStudioSection] = useState<'mode' | 'launcher' | 'colors' | 'effects' | 'presets'>('mode');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Sync if initialConfig updates from backend
  useEffect(() => {
    if (initialConfig) {
      setStudioConfig((prev) => {
        const merged = {
          ...prev,
          mode: (initialConfig.design_style as WidgetVisualMode) || prev.mode,
          launcherType: initialConfig.launcherType || prev.launcherType,
          logoUrl: initialConfig.logoUrl ?? prev.logoUrl,
          primaryColor: initialConfig.theme_color || prev.primaryColor,
          secondaryColor: initialConfig.secondaryColor || prev.secondaryColor,
          backgroundColor: initialConfig.backgroundColor || prev.backgroundColor,
          textColor: initialConfig.textColor || prev.textColor,
          aiMessageColor: initialConfig.aiMessageColor || prev.aiMessageColor,
          aiMessageTextColor: initialConfig.aiMessageTextColor || prev.aiMessageTextColor,
          userMessageColor: initialConfig.userMessageColor || prev.userMessageColor,
          userMessageTextColor: initialConfig.userMessageTextColor || prev.userMessageTextColor,
          gradientEnabled: initialConfig.gradientEnabled ?? prev.gradientEnabled,
          gradientType: initialConfig.gradientType || prev.gradientType,
          gradientColor1: initialConfig.gradientColor1 || prev.gradientColor1,
          gradientColor2: initialConfig.gradientColor2 || prev.gradientColor2,
          gradientAngle: initialConfig.gradientAngle ?? prev.gradientAngle,
          launcherSize: initialConfig.launcherSize || prev.launcherSize,
          launcherShape: initialConfig.launcherShape || prev.launcherShape,
          borderRadius: initialConfig.borderRadius ?? prev.borderRadius,
          shadowIntensity: initialConfig.shadowIntensity || prev.shadowIntensity,
          glowIntensity: initialConfig.glowIntensity || prev.glowIntensity,
          animationIntensity: initialConfig.animationIntensity || prev.animationIntensity,
          launcherPosition: (initialConfig.launcherPosition || initialConfig.position || prev.launcherPosition || 'bottom-right') as WidgetPosition,
          position: (initialConfig.position || initialConfig.launcherPosition || prev.position || 'bottom-right') as WidgetPosition,
        };
        return sanitizeWidgetStudioConfig(merged);
      });
      if (initialConfig.business_name) setBusinessName(initialConfig.business_name);
      if (initialConfig.welcome_message) setWelcomeMessage(initialConfig.welcome_message);
    }
  }, [initialConfig]);

  // Mode change handler: switches visual mode and applies harmonious defaults
  const handleSelectMode = (newMode: WidgetVisualMode) => {
    setStudioConfig((prev) => {
      if (newMode === 'simple') {
        return {
          ...prev,
          mode: 'simple',
          shadowIntensity: 'soft',
          glowIntensity: 'none',
          gradientEnabled: false,
          gradientType: 'none',
          borderRadius: Math.min(prev.borderRadius, 14),
          animationIntensity: 'subtle',
        };
      } else {
        return {
          ...prev,
          mode: 'attractive_3d',
          shadowIntensity: prev.shadowIntensity === 'none' ? 'medium' : prev.shadowIntensity,
          glowIntensity: prev.glowIntensity === 'none' ? 'subtle' : prev.glowIntensity,
          borderRadius: Math.max(prev.borderRadius, 18),
          animationIntensity: 'subtle',
        };
      }
    });
  };

  // Preset apply handler
  const handleApplyPreset = (presetId: string) => {
    const p = WIDGET_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setStudioConfig((prev) => ({
      ...prev,
      ...p.config,
    }));
  };

  // Contrast Calculation
  const contrastAiBubble = useMemo(() => {
    return calculateContrastRatio(studioConfig.aiMessageTextColor, studioConfig.aiMessageColor);
  }, [studioConfig.aiMessageTextColor, studioConfig.aiMessageColor]);

  const contrastUserBubble = useMemo(() => {
    return calculateContrastRatio(studioConfig.userMessageTextColor, studioConfig.userMessageColor);
  }, [studioConfig.userMessageTextColor, studioConfig.userMessageColor]);

  const contrastHeader = useMemo(() => {
    const textColor = getAccessibleTextColor(studioConfig.primaryColor);
    return calculateContrastRatio(textColor, studioConfig.primaryColor);
  }, [studioConfig.primaryColor]);

  // Fix Contrast automatically
  const handleAutoFixContrast = () => {
    setStudioConfig((prev) => ({
      ...prev,
      aiMessageTextColor: getAccessibleTextColor(prev.aiMessageColor),
      userMessageTextColor: getAccessibleTextColor(prev.userMessageColor),
      textColor: getAccessibleTextColor(prev.backgroundColor),
    }));
  };

  // Save changes
  const handleSave = async () => {
    const sanitized = sanitizeWidgetStudioConfig(studioConfig);
    const updated: WidgetConfig = {
      ...initialConfig,
      business_name: businessName,
      welcome_message: welcomeMessage,
      theme_color: sanitized.primaryColor,
      design_style: sanitized.mode,
      position: sanitized.launcherPosition || sanitized.position,
      ...sanitized,
    };

    // Tenant-scoped real-time propagation so only this widgetId's preview/embed updates
    if (typeof window !== 'undefined') {
      try {
        if (updated.widget_id) {
          localStorage.setItem(`aw_widget_cfg_${updated.widget_id}`, JSON.stringify(updated));
        }
        window.dispatchEvent(new CustomEvent('aiworkforce:widget_config_updated', { detail: updated }));
        try {
          const bc = new BroadcastChannel('aiworkforce_widget_sync');
          bc.postMessage({ type: 'WIDGET_CONFIG_UPDATED', config: updated });
          bc.close();
        } catch {}
      } catch {}
    }

    await onSaveConfig(updated);
  };

  const activeWidgetId = initialConfig.widget_id || 'wgt_preview';
  const embedSnippet = generateWidgetEmbedSnippet(activeWidgetId, {
    designStyle: studioConfig.mode,
    position: studioConfig.launcherPosition || studioConfig.position,
    color: studioConfig.primaryColor,
  });

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="bg-white dark:bg-black rounded-2xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-slate-900 text-white dark:bg-white dark:text-black">
              Widget Studio
            </span>
            <span className="text-xs text-slate-400 dark:text-neutral-500 font-mono">
              Live Design System
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
            Visual Identity & Presentation Customizer
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 leading-relaxed max-w-2xl">
            Design how Alpha appears on your website without altering its verified Company Brain, inquiry capture, or security isolation.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-end lg:self-auto">
          <SavePublishButton onSave={handleSave} label="Save Configuration" />
        </div>
      </div>

      {/* Main Studio Grid: Left Control Panel + Right Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Studio Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Studio Navigation Pills */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveStudioSection('mode')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeStudioSection === 'mode'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>1. Visual Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioSection('launcher')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeStudioSection === 'launcher'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Shapes className="w-3.5 h-3.5" />
              <span>2. Launcher Icon</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioSection('colors')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeStudioSection === 'colors'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>3. Colors & Contrast</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioSection('effects')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeStudioSection === 'effects'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>4. Geometry & Effects</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioSection('presets')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeStudioSection === 'presets'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
          </div>

          {/* Section 1: Visual Mode Switcher */}
          {activeStudioSection === 'mode' && (
            <div className="bg-white dark:bg-black rounded-2xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 1: Choose Visual Mode
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Neither mode is "better". Both share identical AI intelligence and backend safeguards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Mode 1: Simple / Professional */}
                <div
                  onClick={() => handleSelectMode('simple')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    studioConfig.mode === 'simple'
                      ? 'border-slate-900 dark:border-white bg-slate-50/80 dark:bg-neutral-900/60 shadow-xs'
                      : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Simple / Professional
                      </span>
                      {studioConfig.mode === 'simple' && (
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Restrained, crisp typography, clean micro-borders, minimal shadows. Built for trustworthy corporate presence.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">
                      SaaS & B2B
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">
                      Corporate
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">
                      Agencies
                    </span>
                  </div>
                </div>

                {/* Mode 2: 3D / Attractive */}
                <div
                  onClick={() => handleSelectMode('attractive_3d')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    studioConfig.mode === 'attractive_3d'
                      ? 'border-slate-900 dark:border-white bg-slate-50/80 dark:bg-neutral-900/60 shadow-xs'
                      : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        3D / Attractive
                      </span>
                      {studioConfig.mode === 'attractive_3d' && (
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Elevated glass depths, subtle ambient glows, spring micro-interactions, gradient lighting highlights.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">
                      Creators
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">
                      Gaming
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium">
                      Lifestyle
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Name & Welcome Message */}
              <div className="pt-3 border-t border-slate-100 dark:border-neutral-800/80 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block mb-1">
                    Header Display Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="e.g. Acme Sales Assistant"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block mb-1">
                    Opening Welcome Greeting
                  </label>
                  <textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed"
                    placeholder="Hello! 👋 How can I help you today?"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Launcher Identity */}
          {activeStudioSection === 'launcher' && (
            <div className="bg-white dark:bg-black rounded-2xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 2: Launcher Icon Identity
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Select the exact icon or mark displayed on the floating trigger button on your website.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. AI Spark */}
                <button
                  type="button"
                  onClick={() => setStudioConfig((p) => ({ ...p, launcherType: 'ai_spark' }))}
                  className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center transition-all cursor-pointer ${
                    studioConfig.launcherType === 'ai_spark'
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-neutral-900 font-bold'
                      : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs">AI Spark</span>
                </button>

                {/* 2. Chat Bubble */}
                <button
                  type="button"
                  onClick={() => setStudioConfig((p) => ({ ...p, launcherType: 'chat_bubble' }))}
                  className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center transition-all cursor-pointer ${
                    studioConfig.launcherType === 'chat_bubble'
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-neutral-900 font-bold'
                      : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-xs">Chat Bubble</span>
                </button>

                {/* 3. Your Logo */}
                <button
                  type="button"
                  onClick={() => setStudioConfig((p) => ({ ...p, launcherType: 'custom_logo' }))}
                  className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center transition-all cursor-pointer ${
                    studioConfig.launcherType === 'custom_logo' || (studioConfig.launcherType as string) === 'logo'
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-neutral-900 font-bold'
                      : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs overflow-hidden">
                    {studioConfig.logoUrl ? (
                      <img src={studioConfig.logoUrl} alt="Logo" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] font-bold">LOGO</span>
                    )}
                  </div>
                  <span className="text-xs">Your Logo</span>
                </button>

                {/* 4. AI Workforce */}
                <button
                  type="button"
                  onClick={() => setStudioConfig((p) => ({ ...p, launcherType: 'ai_workforce' }))}
                  className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 text-center transition-all cursor-pointer ${
                    studioConfig.launcherType === 'ai_workforce'
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-neutral-900 font-bold'
                      : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="text-xs">AI Workforce</span>
                </button>
              </div>

              {/* Logo URL Input (Active if Your Logo is chosen) */}
              {(studioConfig.launcherType === 'custom_logo' || (studioConfig.launcherType as string) === 'logo') && (
                <div className="p-3.5 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    Custom Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={studioConfig.logoUrl || ''}
                    onChange={(e) => setStudioConfig((p) => ({ ...p, logoUrl: e.target.value }))}
                    placeholder="https://example.com/brand-icon.png"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Transparent PNG or SVG square icon works best (at least 64x64px).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Colors & Contrast Safety */}
          {activeStudioSection === 'colors' && (
            <div className="bg-white dark:bg-black rounded-2xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 3: Color Identity & Contrast
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    WCAG AA 4.5:1 legibility is verified in real-time across message bubbles.
                  </p>
                </div>

                {(contrastAiBubble < 4.5 || contrastUserBubble < 4.5) && (
                  <button
                    type="button"
                    onClick={handleAutoFixContrast}
                    className="text-xs font-bold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Auto-Fix Contrast</span>
                  </button>
                )}
              </div>

              {/* Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Theme Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      Primary Theme Color
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{studioConfig.primaryColor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={studioConfig.primaryColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={studioConfig.primaryColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>

                {/* Secondary / Accent Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      Secondary Accent Color
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{studioConfig.secondaryColor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={studioConfig.secondaryColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, secondaryColor: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={studioConfig.secondaryColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, secondaryColor: e.target.value }))}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>

                {/* User Message Bubble Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      User Bubble Background
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{studioConfig.userMessageColor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={studioConfig.userMessageColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, userMessageColor: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={studioConfig.userMessageColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, userMessageColor: e.target.value }))}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>

                {/* User Message Text Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      User Bubble Text Color
                    </label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      contrastUserBubble >= 4.5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {contrastUserBubble.toFixed(1)}:1 {contrastUserBubble >= 4.5 ? 'AA' : 'Fail'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={studioConfig.userMessageTextColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, userMessageTextColor: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={studioConfig.userMessageTextColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, userMessageTextColor: e.target.value }))}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>

                {/* AI Assistant Bubble Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      AI Bubble Background
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{studioConfig.aiMessageColor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={studioConfig.aiMessageColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, aiMessageColor: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={studioConfig.aiMessageColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, aiMessageColor: e.target.value }))}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>

                {/* AI Assistant Text Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      AI Bubble Text Color
                    </label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      contrastAiBubble >= 4.5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {contrastAiBubble.toFixed(1)}:1 {contrastAiBubble >= 4.5 ? 'AA' : 'Fail'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={studioConfig.aiMessageTextColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, aiMessageTextColor: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-neutral-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={studioConfig.aiMessageTextColor}
                      onChange={(e) => setStudioConfig((p) => ({ ...p, aiMessageTextColor: e.target.value }))}
                      className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient Control Sub-panel */}
              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Launcher & Header Gradient
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Add continuous directional gradient lighting
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={studioConfig.gradientEnabled}
                    onChange={(e) =>
                      setStudioConfig((p) => ({
                        ...p,
                        gradientEnabled: e.target.checked,
                        gradientType: e.target.checked ? (p.gradientType === 'none' ? 'subtle' : p.gradientType) : 'none',
                      }))
                    }
                    className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                  />
                </div>

                {studioConfig.gradientEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                        Gradient Type
                      </label>
                      <select
                        value={studioConfig.gradientType}
                        onChange={(e) =>
                          setStudioConfig((p) => ({ ...p, gradientType: e.target.value as 'none' | 'subtle' | 'custom' }))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800"
                      >
                        <option value="subtle">Subtle Blend</option>
                        <option value="custom">Custom Two-Tone</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                        Angle: {studioConfig.gradientAngle}°
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={studioConfig.gradientAngle}
                        onChange={(e) => setStudioConfig((p) => ({ ...p, gradientAngle: Number(e.target.value) }))}
                        className="w-full mt-1.5 cursor-pointer"
                      />
                    </div>

                    {studioConfig.gradientType === 'custom' && (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
                          Stop 2 Color
                        </label>
                        <input
                          type="color"
                          value={studioConfig.gradientColor2}
                          onChange={(e) => setStudioConfig((p) => ({ ...p, gradientColor2: e.target.value }))}
                          className="w-full h-8 rounded-lg cursor-pointer p-0.5 bg-white border border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Geometry & Effects */}
          {activeStudioSection === 'effects' && (
            <div className="bg-white dark:bg-black rounded-2xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 4: Geometry, Shadows & Position
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Fine-tune launcher button sizing, container radius, and elevation depth.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Launcher Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    Launcher Size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['small', 'medium', 'large'] as WidgetLauncherSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setStudioConfig((p) => ({ ...p, launcherSize: sz }))}
                        className={`py-2 text-xs rounded-xl border capitalize font-semibold transition-all cursor-pointer ${
                          studioConfig.launcherSize === sz
                            ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Launcher Shape */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    Launcher Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['circle', 'rounded_square', 'squircle'] as WidgetLauncherShape[]).map((shp) => (
                      <button
                        key={shp}
                        type="button"
                        onClick={() => setStudioConfig((p) => ({ ...p, launcherShape: shp }))}
                        className={`py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer ${
                          studioConfig.launcherShape === shp
                            ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        {shp === 'rounded_square' ? 'Square' : shp === 'squircle' ? 'Squircle' : 'Circle'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Window Border Radius Slider */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      Window Border Radius: {studioConfig.borderRadius}px
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {studioConfig.mode === 'simple' ? 'Cap: 16px recommended' : 'Max: 28px'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={28}
                    step={2}
                    value={studioConfig.borderRadius}
                    onChange={(e) => setStudioConfig((p) => ({ ...p, borderRadius: Number(e.target.value) }))}
                    className="w-full cursor-pointer"
                  />
                </div>

                {/* Shadow Intensity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    Shadow Elevation
                  </label>
                  <select
                    value={studioConfig.shadowIntensity}
                    onChange={(e) =>
                      setStudioConfig((p) => ({ ...p, shadowIntensity: e.target.value as WidgetShadowIntensity }))
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white"
                  >
                    <option value="none">None (Completely Flat)</option>
                    <option value="soft">Soft (Micro-Elevation)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="strong">Strong (High Depth)</option>
                  </select>
                </div>

                {/* 3D Glow (Only in 3D mode) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    3D Ambient Glow
                  </label>
                  <select
                    disabled={studioConfig.mode === 'simple'}
                    value={studioConfig.glowIntensity}
                    onChange={(e) =>
                      setStudioConfig((p) => ({ ...p, glowIntensity: e.target.value as WidgetGlowIntensity }))
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="none">None</option>
                    <option value="soft">Soft Ambient Halo</option>
                    <option value="medium">Medium Vibrancy</option>
                    <option value="strong">High Luminescence</option>
                  </select>
                </div>

                {/* Launcher Position */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    Screen Position
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setStudioConfig((p) => ({ ...p, launcherPosition: 'bottom-right', position: 'bottom-right' }))}
                      className={`py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer ${
                        (studioConfig.launcherPosition || studioConfig.position) === 'bottom-right'
                          ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      Bottom Right (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioConfig((p) => ({ ...p, launcherPosition: 'bottom-left', position: 'bottom-left' }))}
                      className={`py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer ${
                        (studioConfig.launcherPosition || studioConfig.position) === 'bottom-left'
                          ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      Bottom Left
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Presets Gallery */}
          {activeStudioSection === 'presets' && (
            <div className="bg-white dark:bg-black rounded-2xl p-5 border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Curated Studio Presets
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Click any official preset to load harmonious color, launcher, and depth values.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WIDGET_PRESETS.map((pst) => (
                  <div
                    key={pst.id}
                    onClick={() => handleApplyPreset(pst.id)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 hover:border-slate-900 dark:hover:border-white transition-all cursor-pointer flex flex-col justify-between bg-slate-50/50 dark:bg-neutral-900/40"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {pst.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                          {pst.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                        {pst.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-neutral-800 flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: pst.config.primaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: pst.config.secondaryColor }}
                      />
                      <span className="text-[10px] font-mono text-slate-400">
                        {pst.config.mode === 'simple' ? 'Simple Mode' : '3D Mode'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Live Production Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white dark:bg-black rounded-2xl p-4 border border-slate-200 dark:border-neutral-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Live Interactive Preview
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPreviewChatOpen(!previewChatOpen)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-medium cursor-pointer"
            >
              {previewChatOpen ? 'Minimize' : 'Expand'}
            </button>
          </div>

          {/* Preview Container simulating an actual website background */}
          <div className="relative rounded-2xl border border-slate-300 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900/90 h-[560px] overflow-hidden shadow-inner flex flex-col justify-between p-4">
            {/* Mock website content background */}
            <div className="space-y-3 opacity-60 pointer-events-none select-none">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded bg-slate-300 dark:bg-neutral-700" />
                  <span className="text-xs font-bold text-slate-600 dark:text-neutral-400">
                    {companyProfile.name || 'Acme Platform'}
                  </span>
                </div>
                <div className="flex space-x-3 text-[10px] text-slate-400">
                  <span>Products</span>
                  <span>Pricing</span>
                  <span>About</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-neutral-800 rounded" />
              </div>
            </div>

            {/* Live Interactive Widget Overlay */}
            <div
              className={`absolute bottom-4 ${
                (studioConfig.launcherPosition || studioConfig.position) === 'bottom-left' ? 'left-4 items-start' : 'right-4 items-end'
              } z-40 flex flex-col max-w-[calc(100%-2rem)]`}
            >
              {previewChatOpen && (
                <div className="w-[320px] sm:w-[340px] h-[440px] mb-3 animate-in fade-in zoom-in-95">
                  <CustomerChatWidget
                    widgetId={activeWidgetId}
                    userId={userId}
                    businessName={businessName}
                    welcomeMessage={welcomeMessage}
                    themeColor={studioConfig.primaryColor}
                    companyProfile={companyProfile}
                    isOpen={true}
                    onClose={() => setPreviewChatOpen(false)}
                    isSimulatedPreview={true}
                    onLeadAutoCreated={onLeadAutoCreated}
                    // Visual Studio Customizations passed directly
                    mode={studioConfig.mode}
                    launcherType={studioConfig.launcherType}
                    logoUrl={studioConfig.logoUrl}
                    primaryColor={studioConfig.primaryColor}
                    secondaryColor={studioConfig.secondaryColor}
                    backgroundColor={studioConfig.backgroundColor}
                    textColor={studioConfig.textColor}
                    aiMessageColor={studioConfig.aiMessageColor}
                    aiMessageTextColor={studioConfig.aiMessageTextColor}
                    userMessageColor={studioConfig.userMessageColor}
                    userMessageTextColor={studioConfig.userMessageTextColor}
                    gradientEnabled={studioConfig.gradientEnabled}
                    gradientType={studioConfig.gradientType}
                    gradientColor1={studioConfig.gradientColor1}
                    gradientColor2={studioConfig.gradientColor2}
                    gradientAngle={studioConfig.gradientAngle}
                    borderRadius={studioConfig.borderRadius}
                    shadowIntensity={studioConfig.shadowIntensity}
                    glowIntensity={studioConfig.glowIntensity}
                    animationIntensity={studioConfig.animationIntensity}
                    studioConfig={studioConfig}
                  />
                </div>
              )}

              {/* Launcher Button Component */}
              <WidgetLauncherButton
                launcherType={studioConfig.launcherType}
                logoUrl={studioConfig.logoUrl}
                primaryColor={studioConfig.primaryColor}
                secondaryColor={studioConfig.secondaryColor}
                gradientEnabled={studioConfig.gradientEnabled}
                gradientType={studioConfig.gradientType}
                gradientColor1={studioConfig.gradientColor1}
                gradientColor2={studioConfig.gradientColor2}
                gradientAngle={studioConfig.gradientAngle}
                launcherSize={studioConfig.launcherSize}
                launcherShape={studioConfig.launcherShape}
                borderRadius={studioConfig.borderRadius}
                shadowIntensity={studioConfig.shadowIntensity}
                glowIntensity={studioConfig.glowIntensity}
                animationIntensity={studioConfig.animationIntensity}
                mode={studioConfig.mode}
                isOpen={previewChatOpen}
                onClick={() => setPreviewChatOpen(!previewChatOpen)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
