import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  X,
  RefreshCw,
  ArrowDown,
  AlertCircle,
  UserCheck,
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CompanyProfile,
  InquiryLead,
  ChatMessage,
  StructuredLeadProfile,
  WidgetPresetType,
  WidgetStudioConfig,
  WidgetLauncherType,
  WidgetVisualMode,
  WidgetThemeMode,
  WidgetGradientType,
  WidgetShadowIntensity,
  WidgetGlowIntensity,
  WidgetAnimationIntensity,
} from '../types.ts';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { saveInquiry, logUserActivity, saveUserTask, saveConversation, isReservedOfficialWidgetIdClient } from '../services/workspaceService.ts';
import { isPortfolioDeployment, getPortfolioRoleTitle } from '../utils/portfolioUtils.ts';
import { hasCategoryConsent } from '../services/consentService.ts';
import {
  getAccessibleTextColor,
  getWidgetBoxShadowStyle,
  resolveWidgetThemeTokens,
  sanitizeCssColor,
  sanitizeSafeUrl,
} from '../utils/widgetDesignUtils.ts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';
import { generateAlphaVisitorGreeting, getAlphaInitialSuggestions } from '../utils/alphaWelcomeUtils.ts';

export interface CustomerChatWidgetProps {
  widgetId?: string;
  userId?: string;
  businessName?: string;
  welcomeMessage?: string;
  themeColor?: string;
  companyProfile?: CompanyProfile;
  isOpen?: boolean;
  onClose?: () => void;
  preset?: WidgetPresetType;
  design_style?: WidgetVisualMode;
  isSimulatedPreview?: boolean;
  onLeadAutoCreated?: (lead: InquiryLead) => void;

  // Widget Studio Visual Properties
  mode?: WidgetVisualMode;
  themeMode?: WidgetThemeMode;
  launcherType?: WidgetLauncherType;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  aiMessageColor?: string;
  aiMessageTextColor?: string;
  userMessageColor?: string;
  userMessageTextColor?: string;
  gradientEnabled?: boolean;
  gradientType?: WidgetGradientType;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  borderRadius?: number;
  shadowIntensity?: WidgetShadowIntensity;
  glowIntensity?: WidgetGlowIntensity;
  animationIntensity?: WidgetAnimationIntensity;
  studioConfig?: Partial<WidgetStudioConfig>;
  hideAttributionFooter?: boolean;
}

/**
 * High-contrast helper to determine if a background color is light.
 * Supports #hex and rgb/rgba formats.
 */
function isColorLight(color?: string): boolean {
  if (!color || typeof color !== 'string') return false;
  const clean = color.trim().toLowerCase();
  if (clean === '#ffffff' || clean === '#fff' || clean === 'white') return true;
  if (clean === '#000000' || clean === '#000' || clean === 'black') return false;

  if (clean.startsWith('#')) {
    const hex = clean.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 155;
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 155;
    }
  }

  if (clean.startsWith('rgb')) {
    const match = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      return (r * 299 + g * 587 + b * 114) / 1000 > 155;
    }
  }

  return false;
}

/**
 * Parses inline formatting: bold (**text**), links ([title](url) and https://), and inline code (`code`).
 */
function renderInlineParts(
  content: string,
  keyPrefix: string,
  colors: {
    strongColor: string;
    linkColor: string;
    codeBg: string;
    codeFg: string;
  }
) {
  // Regex matches markdown links, bare URLs, bold (**...**), and inline code (`...`)
  const tokenRegex = /(\[.*?\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+|\*\*.*?\*\*|`.*?`)/g;
  const parts = content.split(tokenRegex);

  return parts.map((part, pIdx) => {
    const partKey = `${keyPrefix}-part-${pIdx}`;

    // 1. Bold (**text**)
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong
          key={partKey}
          style={{ color: colors.strongColor }}
          className="font-bold tracking-tight"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    // 2. Markdown Link [Label](Url)
    const mdLinkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdLinkMatch) {
      return (
        <a
          key={partKey}
          href={mdLinkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: colors.linkColor }}
          className="underline underline-offset-2 hover:opacity-80 font-medium transition-opacity"
        >
          {mdLinkMatch[1]}
        </a>
      );
    }

    // 3. Bare URL (https://...)
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={partKey}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: colors.linkColor }}
          className="underline underline-offset-2 hover:opacity-80 font-medium transition-opacity"
        >
          {part.replace(/^https?:\/\/(www\.)?/, '').slice(0, 34)}...
        </a>
      );
    }

    // 4. Inline Code (`code`)
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={partKey}
          style={{
            backgroundColor: colors.codeBg,
            color: colors.codeFg,
          }}
          className="px-1.5 py-0.5 rounded text-[11px] font-mono select-all inline-block"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

/**
 * Authoritative, accessible markdown and text formatter for assistant & customer messages.
 * Guarantees WCAG 2.1 AA/AAA contrast on both light (>= 14:1) and dark (>= 15:1) surfaces.
 * Supports h1-h6, strong/b, bullet & numbered lists, blockquotes, inline code, and links.
 */
function renderFormattedMessageText(
  text: string,
  isLightBubble: boolean = false,
  baseTextColor?: string
) {
  if (!text) return null;

  const cleanText = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  // Accessible color tokens derived strictly from background luminance
  const colors = {
    headingColor: isLightBubble ? '#090d16' : '#ffffff',
    strongColor: isLightBubble ? '#090d16' : '#ffffff',
    bodyColor: baseTextColor || (isLightBubble ? '#0f172a' : '#f4f4f5'),
    bulletMarkerColor: isLightBubble ? '#64748b' : '#a1a1aa',
    linkColor: isLightBubble ? '#0284c7' : '#38bdf8',
    codeBg: isLightBubble ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)',
    codeFg: isLightBubble ? '#090d16' : '#f8fafc',
    quoteBorderColor: isLightBubble ? '#cbd5e1' : '#475569',
    quoteTextColor: isLightBubble ? '#334155' : '#cbd5e1',
  };

  const paragraphs = cleanText.split(/\n\n+/);

  return (
    <div className="space-y-2 aiw-message-content">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        return (
          <div key={`p-${pIdx}`} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              const lineKey = `line-${pIdx}-${lIdx}`;

              // 1. Headings: # through ######
              const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
              if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                const inlineParts = renderInlineParts(headingText, lineKey, colors);

                if (level === 1) {
                  return (
                    <h1
                      key={lineKey}
                      style={{ color: colors.headingColor }}
                      className="text-sm font-extrabold tracking-tight mt-2.5 mb-1.5"
                    >
                      {inlineParts}
                    </h1>
                  );
                }
                if (level === 2) {
                  return (
                    <h2
                      key={lineKey}
                      style={{ color: colors.headingColor }}
                      className="text-xs font-bold tracking-tight mt-2 mb-1"
                    >
                      {inlineParts}
                    </h2>
                  );
                }
                if (level === 3) {
                  return (
                    <h3
                      key={lineKey}
                      style={{ color: colors.headingColor }}
                      className="text-xs font-bold mt-1.5 mb-0.5"
                    >
                      {inlineParts}
                    </h3>
                  );
                }
                return (
                  <h4
                    key={lineKey}
                    style={{ color: colors.headingColor }}
                    className="text-[11px] font-bold mt-1 mb-0.5"
                  >
                    {inlineParts}
                  </h4>
                );
              }

              // 2. Standalone Bold Line Heading (e.g. "**Competitive Differentiation**" or "**Purpose:**")
              const standaloneBoldMatch = trimmed.match(/^(\*\*|__)(.+?)\1:?$/);
              if (standaloneBoldMatch) {
                return (
                  <h3
                    key={lineKey}
                    style={{ color: colors.headingColor }}
                    className="text-xs font-bold mt-1.5 mb-0.5 tracking-tight"
                  >
                    {standaloneBoldMatch[2]}
                  </h3>
                );
              }

              // 3. Blockquotes: > Quote
              if (trimmed.startsWith('>')) {
                const quoteText = trimmed.replace(/^>\s*/, '');
                return (
                  <blockquote
                    key={lineKey}
                    style={{
                      borderLeftColor: colors.quoteBorderColor,
                      color: colors.quoteTextColor,
                    }}
                    className="border-l-2 pl-2.5 my-1 italic text-[11px] leading-relaxed"
                  >
                    {renderInlineParts(quoteText, lineKey, colors)}
                  </blockquote>
                );
              }

              // 4. Bullet Items (•, -, *)
              const isBullet = /^[•\-\*]\s+/.test(trimmed);
              if (isBullet) {
                const cleanLine = trimmed.replace(/^[•\-\*]\s+/, '');
                return (
                  <div key={lineKey} className="flex items-start space-x-1.5 pl-1 text-xs">
                    <span
                      style={{ color: colors.bulletMarkerColor }}
                      className="select-none font-bold shrink-0 mt-0.5 leading-none"
                    >
                      •
                    </span>
                    <span style={{ color: colors.bodyColor }} className="leading-relaxed">
                      {renderInlineParts(cleanLine, lineKey, colors)}
                    </span>
                  </div>
                );
              }

              // 5. Numbered List Items (1., 2.)
              const isNumbered = /^\d+\.\s+/.test(trimmed);
              if (isNumbered) {
                const numPrefix = trimmed.match(/^\d+\./)?.[0];
                const cleanLine = trimmed.replace(/^\d+\.\s+/, '');
                return (
                  <div key={lineKey} className="flex items-start space-x-1.5 pl-1 text-xs">
                    <span
                      style={{ color: colors.bulletMarkerColor }}
                      className="font-mono text-[11px] font-semibold select-none shrink-0"
                    >
                      {numPrefix}
                    </span>
                    <span style={{ color: colors.bodyColor }} className="leading-relaxed">
                      {renderInlineParts(cleanLine, lineKey, colors)}
                    </span>
                  </div>
                );
              }

              // 6. Regular Paragraph Line
              return (
                <p
                  key={lineKey}
                  style={{ color: colors.bodyColor }}
                  className="text-xs leading-relaxed"
                >
                  {renderInlineParts(trimmed, lineKey, colors)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}




// Generate or retrieve widget-scoped anonymous visitor ID (prevents cross-tenant correlation)
function getOrCreateVisitorId(scopeKey: string): string {
  if (typeof window === 'undefined') return 'vis_server';
  const cleanScope = (scopeKey || 'preview').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storageKey = `aiw_anon_visitor_id_${cleanScope}`;
  try {
    let vid = localStorage.getItem(storageKey);
    if (!vid) {
      vid = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(storageKey, vid);
    }
    return vid;
  } catch {
    return `vis_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}


export const CustomerChatWidget: React.FC<CustomerChatWidgetProps> = ({
  widgetId = '',
  userId,
  businessName = 'Business Assistant',
  welcomeMessage,
  themeColor,
  companyProfile,
  isOpen = true,
  onClose,
  preset = 'modern_pill',
  design_style,
  isSimulatedPreview = false,
  onLeadAutoCreated,

  // Studio visual props
  mode,
  themeMode,
  logoUrl,
  primaryColor,
  secondaryColor,
  backgroundColor,
  textColor,
  aiMessageColor,
  aiMessageTextColor,
  userMessageColor,
  userMessageTextColor,
  gradientEnabled,
  gradientType,
  gradientColor1,
  gradientColor2,
  gradientAngle,
  borderRadius,
  shadowIntensity,
  glowIntensity,
  studioConfig,
  hideAttributionFooter = false,
}) => {
  const [liveDocData, setLiveDocData] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener?.('change', handleChange);
    return () => mq.removeEventListener?.('change', handleChange);
  }, []);

  const isOfficialPlatformWidget = isReservedOfficialWidgetIdClient(widgetId);

  // Firestore live updates if customer public widget (official platform widget is strictly immutable)
  useEffect(() => {
    setLiveDocData(null);
    if (!widgetId || isReservedOfficialWidgetIdClient(widgetId)) return;

    let unsub = () => {};
    try {
      const publicDocRef = doc(db, 'public_widgets', widgetId);
      unsub = onSnapshot(
        publicDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data) {
              setLiveDocData(data);
            }
          }
        },
        () => {}
      );
    } catch {
      // Ignore offline / reset
    }

    const handleLocalUpdate = (e: any) => {
      if (e.detail && widgetId && e.detail.widget_id === widgetId) {
        setLiveDocData((prev: any) => ({ ...(prev || {}), ...e.detail }));
      }
    };
    window.addEventListener('aiworkforce:widget_config_updated', handleLocalUpdate);

    // Cross-tab BroadcastChannel listener scoped strictly to this widgetId
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('aiworkforce_widget_sync');
      bc.onmessage = (event) => {
        if (event.data?.config && widgetId && event.data.config.widget_id === widgetId) {
          setLiveDocData((prev: any) => ({ ...(prev || {}), ...event.data.config }));
        }
      };
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (widgetId && e.key === `aw_widget_cfg_${widgetId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLiveDocData((prev: any) => ({ ...(prev || {}), ...parsed }));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsub();
      window.removeEventListener('aiworkforce:widget_config_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, [widgetId]);

  const effectiveLiveData = isOfficialPlatformWidget ? null : liveDocData;
  const activeCompanyProfile = effectiveLiveData?.company_profile || companyProfile;
  const effectiveBusinessName = effectiveLiveData?.business_name || activeCompanyProfile?.name || businessName;
  const isPortfolio = isPortfolioDeployment(activeCompanyProfile);
  const roleTitle = isPortfolio ? getPortfolioRoleTitle(activeCompanyProfile) : 'AI Sales Manager';

  // Harmonize mode, themeMode, and studio settings
  const resolvedMode = (effectiveLiveData?.mode || effectiveLiveData?.design_style || studioConfig?.mode || mode || design_style || 'attractive_3d') as WidgetVisualMode;
  const resolvedThemeMode: WidgetThemeMode = isOfficialPlatformWidget
    ? 'dark'
    : (effectiveLiveData?.themeMode || effectiveLiveData?.studioConfig?.themeMode || studioConfig?.themeMode || themeMode || 'light');
  const isSimple = resolvedMode === 'simple';

  const resolvedPrimaryColor = sanitizeCssColor(
    effectiveLiveData?.primaryColor || effectiveLiveData?.theme_color || effectiveLiveData?.studioConfig?.primaryColor || studioConfig?.primaryColor || primaryColor || themeColor,
    isOfficialPlatformWidget ? '#09090B' : '#0F172A'
  );
  const resolvedSecondaryColor = sanitizeCssColor(
    effectiveLiveData?.secondaryColor || effectiveLiveData?.studioConfig?.secondaryColor || studioConfig?.secondaryColor || secondaryColor,
    isOfficialPlatformWidget ? '#FFFFFF' : '#2563EB'
  );
  const resolvedLogoUrl = sanitizeSafeUrl(
    effectiveLiveData?.logoUrl || effectiveLiveData?.studioConfig?.logoUrl || studioConfig?.logoUrl || logoUrl
  );

  const tokens = resolveWidgetThemeTokens(
    {
      mode: resolvedMode,
      themeMode: resolvedThemeMode,
      primaryColor: resolvedPrimaryColor,
      secondaryColor: resolvedSecondaryColor,
      backgroundColor: effectiveLiveData?.backgroundColor || effectiveLiveData?.studioConfig?.backgroundColor || studioConfig?.backgroundColor || backgroundColor,
      textColor: effectiveLiveData?.textColor || effectiveLiveData?.studioConfig?.textColor || studioConfig?.textColor || textColor,
      aiMessageColor: effectiveLiveData?.aiMessageColor || effectiveLiveData?.studioConfig?.aiMessageColor || studioConfig?.aiMessageColor || aiMessageColor,
      aiMessageTextColor: effectiveLiveData?.aiMessageTextColor || effectiveLiveData?.studioConfig?.aiMessageTextColor || studioConfig?.aiMessageTextColor || aiMessageTextColor,
      userMessageColor: effectiveLiveData?.userMessageColor || effectiveLiveData?.studioConfig?.userMessageColor || studioConfig?.userMessageColor || userMessageColor,
      userMessageTextColor: effectiveLiveData?.userMessageTextColor || effectiveLiveData?.studioConfig?.userMessageTextColor || studioConfig?.userMessageTextColor || userMessageTextColor,
    },
    prefersDark
  );

  const isLightBg = tokens.effectiveMode === 'light';
  const resolvedBgColor = tokens.surfaceBg;
  const resolvedTextColor = tokens.aiBubbleText;
  const resolvedAiMsgBg = tokens.aiBubbleBg;
  const resolvedAiMsgText = tokens.aiBubbleText;
  const resolvedUserMsgBg = tokens.userBubbleBg;
  const resolvedUserMsgText = tokens.userBubbleText;

  const resolvedBorderRadius = effectiveLiveData?.borderRadius !== undefined
    ? effectiveLiveData.borderRadius
    : (effectiveLiveData?.studioConfig?.borderRadius !== undefined
      ? effectiveLiveData.studioConfig.borderRadius
      : (borderRadius !== undefined
        ? borderRadius
        : (studioConfig?.borderRadius !== undefined ? studioConfig.borderRadius : (isSimple ? 16 : 20))));

  const resolvedShadow = effectiveLiveData?.shadowIntensity || effectiveLiveData?.studioConfig?.shadowIntensity || shadowIntensity || studioConfig?.shadowIntensity || (isSimple ? 'soft' : 'medium');
  const resolvedGlow = effectiveLiveData?.glowIntensity || effectiveLiveData?.studioConfig?.glowIntensity || glowIntensity || studioConfig?.glowIntensity || 'none';

  const resolvedGradientEnabled = effectiveLiveData?.gradientEnabled !== undefined
    ? effectiveLiveData.gradientEnabled
    : (effectiveLiveData?.studioConfig?.gradientEnabled !== undefined
      ? effectiveLiveData.studioConfig.gradientEnabled
      : (gradientEnabled ?? studioConfig?.gradientEnabled ?? false));
  const resolvedGradientType = effectiveLiveData?.gradientType || effectiveLiveData?.studioConfig?.gradientType || gradientType || studioConfig?.gradientType || 'none';
  const resolvedGradientColor1 = sanitizeCssColor(effectiveLiveData?.gradientColor1 || effectiveLiveData?.studioConfig?.gradientColor1 || gradientColor1 || studioConfig?.gradientColor1, resolvedPrimaryColor);
  const resolvedGradientColor2 = sanitizeCssColor(effectiveLiveData?.gradientColor2 || effectiveLiveData?.studioConfig?.gradientColor2 || gradientColor2 || studioConfig?.gradientColor2, resolvedSecondaryColor);
  const resolvedGradientAngle = effectiveLiveData?.gradientAngle ?? effectiveLiveData?.studioConfig?.gradientAngle ?? gradientAngle ?? studioConfig?.gradientAngle ?? 135;

  let widgetContainerBg = resolvedBgColor;
  if (resolvedGradientEnabled && resolvedGradientType !== 'none' && !isOfficialPlatformWidget) {
    if (resolvedGradientType === 'subtle') {
      widgetContainerBg = `linear-gradient(${resolvedGradientAngle}deg, ${resolvedGradientColor1}, ${resolvedGradientColor2} 80%)`;
    } else {
      widgetContainerBg = `linear-gradient(${resolvedGradientAngle}deg, ${resolvedGradientColor1} 0%, ${resolvedGradientColor2} 100%)`;
    }
  }

  const headerBg = tokens.headerBg;
  const headerTextColor = tokens.headerText;

  // Dynamic Opening Greeting
  const effectiveWelcomeMessage = generateAlphaVisitorGreeting(
    activeCompanyProfile,
    effectiveLiveData?.welcome_message || welcomeMessage
  );
  const initialOptions = getAlphaInitialSuggestions(activeCompanyProfile);

  // Persistent Widget-Scoped Visitor and Tenant Identification
  const tenantKey = widgetId || userId || 'preview_session';
  const [visitorId] = useState<string>(() => getOrCreateVisitorId(tenantKey));
  const storagePersistenceKey = `aiw_chat_state_v2_${tenantKey}_${visitorId}`;

  // Session & Conversation state
  const [conversationId, setConversationId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storagePersistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.conversationId) return parsed.conversationId;
        }
      } catch {}
    }
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });

  const [leadProfile, setLeadProfile] = useState<StructuredLeadProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storagePersistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.leadProfile) return parsed.leadProfile;
        }
      } catch {}
    }
    return null;
  });

  const [hasRestoredPriorHistory, setHasRestoredPriorHistory] = useState(false);



  // Initialize messages from persistent storage or default welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storagePersistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
            return parsed.messages;
          }
        }
      } catch {}
    }
    return [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: effectiveWelcomeMessage,
        timestamp: new Date().toISOString(),
        options: initialOptions,
      },
    ];
  });

  // Check if returning visitor with prior chat
  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].sender === 'customer')) {
      setHasRestoredPriorHistory(true);
    }
  }, []);

  const [visitorToken, setVisitorToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storagePersistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.visitorToken) return parsed.visitorToken;
        }
      } catch {}
    }
    return null;
  });

  // Authoritative synchronous refs to avoid React state closure lag between sequential messages
  const conversationIdRef = useRef<string>(conversationId);
  const visitorTokenRef = useRef<string | null>(visitorToken);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const updateConversationId = useCallback((nextConvId: string) => {
    conversationIdRef.current = nextConvId;
    setConversationId(nextConvId);
  }, []);

  const updateVisitorToken = useCallback((nextToken: string | null) => {
    visitorTokenRef.current = nextToken;
    setVisitorToken(nextToken);
  }, []);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    visitorTokenRef.current = visitorToken;
  }, [visitorToken]);

  // Save to Persistent LocalStorage on any conversation update
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        const stateToPersist = {
          conversationId,
          visitorId,
          visitorToken,
          tenantKey,
          leadProfile,
          messages,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(storagePersistenceKey, JSON.stringify(stateToPersist));
      } catch {}
    }
  }, [messages, conversationId, visitorId, visitorToken, tenantKey, leadProfile, storagePersistenceKey]);

  // Secure server conversation sync for business-approved replies
  useEffect(() => {
    if (!isOpen || !conversationId || !widgetId) return;
    let isMounted = true;

    const ensureVisitorToken = async (forceRefresh = false): Promise<string | null> => {
      if (visitorTokenRef.current && !forceRefresh) return visitorTokenRef.current;
      try {
        const res = await fetch('/api/widget/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widget_id: widgetId,
            conversation_id: conversationIdRef.current,
            visitor_id: visitorId,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.success && data?.token && isMounted) {
          updateVisitorToken(data.token);
          return data.token;
        }
      } catch {}
      return null;
    };

    const sendAck = async (token: string, type: 'delivered' | 'read', messageIds: string[]) => {
      if (!messageIds.length) return;
      try {
        await fetch('/api/widget/conversation/ack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            widget_id: widgetId,
            conversation_id: conversationIdRef.current,
            visitor_id: visitorId,
            type,
            message_ids: messageIds,
          }),
        });
      } catch {}
    };

    const syncServerConversation = async () => {
      if (isSendingRef.current) return;
      try {
        let token = await ensureVisitorToken(false);
        if (!token) return;

        const targetConvId = conversationIdRef.current;
        let res = await fetch(
          `/api/widget/conversation?widget_id=${encodeURIComponent(widgetId)}&conversation_id=${encodeURIComponent(targetConvId)}&visitor_id=${encodeURIComponent(visitorId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 401 || res.status === 403) {
          const errBody = await res.json().catch(() => ({} as any));
          if (errBody?.code === 'UNAUTHORIZED_OWNERSHIP') {
            if (isMounted && !isSendingRef.current) {
              const rotatedConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              updateConversationId(rotatedConvId);
              updateVisitorToken(null);
            }
            return;
          }
          token = await ensureVisitorToken(true);
          if (!token) return;
          res = await fetch(
            `/api/widget/conversation?widget_id=${encodeURIComponent(widgetId)}&conversation_id=${encodeURIComponent(conversationIdRef.current)}&visitor_id=${encodeURIComponent(visitorId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          if (!isMounted || isSendingRef.current) return;

          const undeliveredIds = data.messages
            .filter((sm: any) => sm.message_id && sm.sender === 'assistant' && !sm.metadata?.delivered)
            .map((sm: any) => String(sm.message_id));

          const unreadIds = isOpen
            ? data.messages
                .filter((sm: any) => sm.message_id && sm.sender === 'assistant' && !sm.metadata?.read)
                .map((sm: any) => String(sm.message_id))
            : [];

          setMessages((prev) => {
            const existingIds = new Set<string>();
            const existingClientIds = new Set<string>();
            const existingReplyClientIds = new Set<string>();

            for (const m of prev) {
              if (m.message_id) existingIds.add(String(m.message_id));
              if (m.id) existingIds.add(String(m.id));
              if (m.metadata?.client_message_id) existingClientIds.add(String(m.metadata.client_message_id));
              if (m.metadata?.reply_to_client_message_id) {
                existingReplyClientIds.add(String(m.metadata.reply_to_client_message_id));
              }
            }

            let changed = false;
            const nextList = [...prev];

            for (const sm of data.messages) {
              const smId = sm.message_id || sm.id;
              const smClientId = sm.metadata?.client_message_id;
              const smReplyToClientId = sm.metadata?.reply_to_client_message_id;

              if (smId && existingIds.has(String(smId))) {
                continue;
              }
              if (sm.sender === 'customer' && smClientId && existingClientIds.has(String(smClientId))) {
                // Reconcile optimistic customer message id with authoritative server message_id in-place
                const idx = nextList.findIndex(
                  (pm) => pm.id === smClientId || pm.metadata?.client_message_id === smClientId
                );
                if (idx !== -1 && smId && !nextList[idx].message_id) {
                  nextList[idx] = { ...nextList[idx], message_id: String(smId) };
                  existingIds.add(String(smId));
                  changed = true;
                }
                continue;
              }
              if (
                sm.sender === 'assistant' &&
                smReplyToClientId &&
                existingReplyClientIds.has(String(smReplyToClientId))
              ) {
                const idx = nextList.findIndex(
                  (pm) => pm.metadata?.reply_to_client_message_id === smReplyToClientId
                );
                if (idx !== -1 && smId && !nextList[idx].message_id) {
                  nextList[idx] = { ...nextList[idx], message_id: String(smId) };
                  existingIds.add(String(smId));
                  changed = true;
                }
                continue;
              }
              const duplicateByContent = prev.some(
                (pm: any) => pm.sender === sm.sender && pm.text === sm.text
              );
              if (duplicateByContent) continue;

              nextList.push({
                ...sm,
                id: String(smId || sm.id || `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
              });
              if (smId) existingIds.add(String(smId));
              changed = true;
            }

            return changed ? nextList : prev;
          });

          if (undeliveredIds.length > 0) {
            await sendAck(token, 'delivered', undeliveredIds);
          }
          if (unreadIds.length > 0) {
            await sendAck(token, 'read', unreadIds);
          }
        }
      } catch (err) {
        console.warn('Server conversation sync note:', err);
      }
    };

    const interval = setInterval(syncServerConversation, 5000);
    syncServerConversation();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, conversationId, widgetId, visitorId, visitorToken]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [humanHandoffRequested, setHumanHandoffRequested] = useState(false);

  // Audio chimes state & helper (guarded against private browsing / blocked storage)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('aiw_chat_muted') === 'true';
      }
    } catch {}
    return false;
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aiw_chat_muted', String(next));
      } catch (e) {
        console.warn('LocalStorage access blocked for preferences:', e);
      }
    }
  };

  const playAudioChime = (type: 'send' | 'receive') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch {}
  };

  // Scroll tracking and DOM refs
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stream & turn mutex refs
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const isSendingRef = useRef<boolean>(false);
  const failedTurnRef = useRef<{ clientMessageId: string; text: string } | null>(null);
  const lastSentMessageRef = useRef<{ text: string; time: number } | null>(null);

  // Progressive streaming reveal state
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [displayedStreamingText, setDisplayedStreamingText] = useState<string>('');

  // Voice-to-text hook integration
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const {
    isListening,
    isSupported: speechSupported,
    error: speechHookError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onTranscriptChange: (text) => {
      setInputText(text);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
      }
    },
  });

  useEffect(() => {
    if (speechHookError) {
      setVoiceNotice(speechHookError);
      const timer = setTimeout(() => setVoiceNotice(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [speechHookError]);

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      setVoiceNotice("Voice input isn't supported on this browser.");
      setTimeout(() => setVoiceNotice(null), 3000);
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      setVoiceNotice(null);
      startListening(inputText);
    }
  };

  // Reset / Start a pristine fresh conversation without prior context or stale token contamination
  const handleStartNewChat = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('Conversation reset');
    }
    isSendingRef.current = false;
    failedTurnRef.current = null;
    const freshConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    updateConversationId(freshConvId);
    updateVisitorToken(null);
    setCurrentLeadId(null);
    setLeadProfile(null);
    setHumanHandoffRequested(false);
    setHasError(false);
    setFailedMessage(null);
    setIsTyping(false);
    setStreamingMsgId(null);
    setDisplayedStreamingText('');
    const resetMessages: ChatMessage[] = [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: effectiveWelcomeMessage,
        timestamp: new Date().toISOString(),
        options: initialOptions,
      },
    ];
    messagesRef.current = resetMessages;
    setMessages(resetMessages);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storagePersistenceKey);
      } catch (e) {
        console.warn('LocalStorage access blocked for chat reset:', e);
      }
    }
  };

  // Handle scroll position detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 40;
    setIsUserAtBottom(atBottom);
    if (atBottom) {
      setHasUnreadBelow(false);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      setIsUserAtBottom(true);
      setHasUnreadBelow(false);
    }
  }, []);

  useEffect(() => {
    if (isUserAtBottom) {
      scrollToBottom();
    } else {
      setHasUnreadBelow(true);
    }
  }, [messages, isTyping, displayedStreamingText, scrollToBottom]);

  // Auto-growing Textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
    }
  };

  // Progressive streaming reveal effect
  const startProgressiveReveal = (messageId: string, fullText: string) => {
    setStreamingMsgId(messageId);
    setDisplayedStreamingText('');

    let currentLength = 0;
    const totalLength = fullText.length;
    const step = Math.max(2, Math.ceil(totalLength / 35));

    const interval = setInterval(() => {
      currentLength += step;
      if (currentLength >= totalLength) {
        setDisplayedStreamingText(fullText);
        setStreamingMsgId(null);
        clearInterval(interval);
      } else {
        setDisplayedStreamingText(fullText.slice(0, currentLength));
      }
    }, 16);
  };

  // Send message execution with synchronous mutex & deterministic client_message_id idempotency
  const executeSendMessage = async (textToSend: string, retryClientMsgId?: string) => {
    if (isListening) {
      stopListening();
    }

    const userMsg = textToSend.trim();
    if (!userMsg) return;

    // Strict synchronous turn mutex prevents rapid double-click / double-Enter duplicates
    if (isSendingRef.current) {
      return;
    }

    // Deduplication check for accidental rapid repeat clicks
    if (
      !retryClientMsgId &&
      lastSentMessageRef.current &&
      lastSentMessageRef.current.text === userMsg &&
      Date.now() - lastSentMessageRef.current.time < 900
    ) {
      return;
    }

    isSendingRef.current = true;
    lastSentMessageRef.current = { text: userMsg, time: Date.now() };

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    activeRequestIdRef.current = currentRequestId;

    setHasError(false);
    setFailedMessage(null);
    setVoiceNotice(null);

    const clientMsgId =
      retryClientMsgId || `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    failedTurnRef.current = { clientMessageId: clientMsgId, text: userMsg };

    const userMessageObj: ChatMessage = {
      id: clientMsgId,
      sender: 'customer',
      text: userMsg,
      timestamp: new Date().toISOString(),
      metadata: {
        client_message_id: clientMsgId,
      },
    };

    const assistantMsgId = `amsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const cleanedCurrent = messagesRef.current.filter(
      (m) => m.id !== assistantMsgId && m.text.trim().length > 0
    );
    const alreadyHasCustomerTurn = cleanedCurrent.some(
      (m) => m.id === clientMsgId || m.metadata?.client_message_id === clientMsgId
    );
    const historySnapshot: ChatMessage[] = alreadyHasCustomerTurn
      ? cleanedCurrent
      : [...cleanedCurrent, userMessageObj];
    messagesRef.current = historySnapshot;
    setMessages(historySnapshot);

    if (!retryClientMsgId) {
      playAudioChime('send');
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setIsTyping(true);

    try {
      const hasAnalyticsConsent = hasCategoryConsent('analytics');
      const canUseSimulation = Boolean(isSimulatedPreview && auth?.currentUser);
      const effectiveWidgetIdForChat = widgetId || (isSimulatedPreview ? userId || '' : '');

      let ownerIdToken: string | null = null;
      if (canUseSimulation && auth?.currentUser) {
        try {
          ownerIdToken = await auth.currentUser.getIdToken();
        } catch {}
      }

      const mintSessionToken = async (
        targetConvId: string
      ): Promise<{ token: string | null; fatalError?: string; ownershipConflict?: boolean }> => {
        if (!effectiveWidgetIdForChat) return { token: null };
        try {
          const sRes = await fetch('/api/widget/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              widget_id: effectiveWidgetIdForChat,
              conversation_id: targetConvId,
              visitor_id: visitorId,
            }),
            signal: controller.signal,
          });
          const sData = await sRes.json().catch(() => ({} as any));
          if (!sRes.ok) {
            if (sRes.status === 403 && sData?.code === 'UNAUTHORIZED_OWNERSHIP') {
              return { token: null, ownershipConflict: true };
            }
            if (sRes.status === 503 || sData?.code === 'SESSION_SIGNING_UNCONFIGURED') {
              return {
                token: null,
                fatalError: sData?.error || 'Visitor session service is temporarily unavailable.',
              };
            }
            return { token: null };
          }
          if (sData?.success && sData?.token) {
            updateVisitorToken(sData.token);
            return { token: sData.token };
          }
        } catch {}
        return { token: null };
      };

      let activeConvId = conversationIdRef.current;
      let activeVisitorToken = visitorTokenRef.current;
      if (!canUseSimulation && effectiveWidgetIdForChat && !activeVisitorToken) {
        let mintRes = await mintSessionToken(activeConvId);
        if (mintRes.ownershipConflict) {
          activeConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          updateConversationId(activeConvId);
          updateVisitorToken(null);
          mintRes = await mintSessionToken(activeConvId);
        }
        if (mintRes.fatalError) {
          throw new Error(mintRes.fatalError);
        }
        activeVisitorToken = mintRes.token;
      }

      const sendChatRequest = async (
        tokenToUse: string | null,
        convIdToUse: string,
        useStream: boolean
      ) => {
        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-consent-analytics': hasAnalyticsConsent ? '1' : '0',
        };
        if (tokenToUse) {
          reqHeaders['x-visitor-token'] = tokenToUse;
        }
        if (canUseSimulation && ownerIdToken) {
          reqHeaders['Authorization'] = `Bearer ${ownerIdToken}`;
        }
        return fetch('/api/widget/chat', {
          method: 'POST',
          headers: reqHeaders,
          signal: controller.signal,
          body: JSON.stringify({
            widget_id: effectiveWidgetIdForChat,
            conversation_id: convIdToUse,
            visitor_id: visitorId,
            visitor_session_token: tokenToUse || undefined,
            think_mode: 'auto',
            thinkMode: 'auto',
            lead_id: currentLeadId || undefined,
            message: userMsg,
            client_message_id: clientMsgId,
            user_id: canUseSimulation ? userId : undefined,
            customer_name: leadProfile?.customer_name || 'Website Visitor',
            existing_profile: leadProfile || undefined,
            message_history: historySnapshot.map((m) => ({
              sender: m.sender,
              text: m.text,
              timestamp: m.timestamp,
            })),
            company_profile: canUseSimulation ? activeCompanyProfile : undefined,
            environment: canUseSimulation ? 'simulation' : 'production',
            is_simulated: canUseSimulation,
            stream: useStream,
            analytics_consent: hasAnalyticsConsent,
          }),
        });
      };

      const executeWithAuthRefresh = async (useStream: boolean): Promise<Response> => {
        let res = await sendChatRequest(activeVisitorToken, activeConvId, useStream);
        if ((res.status === 401 || res.status === 403) && !canUseSimulation && effectiveWidgetIdForChat) {
          const errBody = await res.json().catch(() => ({} as any));
          const errCode = typeof errBody?.code === 'string' ? errBody.code : '';
          if (errCode === 'UNAUTHORIZED_OWNERSHIP') {
            activeConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            updateConversationId(activeConvId);
            updateVisitorToken(null);
            const mintRes = await mintSessionToken(activeConvId);
            if (mintRes.fatalError) {
              throw new Error(mintRes.fatalError);
            }
            activeVisitorToken = mintRes.token;
            if (activeVisitorToken) {
              res = await sendChatRequest(activeVisitorToken, activeConvId, useStream);
            }
          } else if (res.status === 401 || errCode.startsWith('TOKEN_')) {
            updateVisitorToken(null);
            const mintRes = await mintSessionToken(activeConvId);
            if (mintRes.fatalError) {
              throw new Error(mintRes.fatalError);
            }
            activeVisitorToken = mintRes.token;
            if (activeVisitorToken) {
              res = await sendChatRequest(activeVisitorToken, activeConvId, useStream);
            }
          }
        }
        return res;
      };

      let response = await executeWithAuthRefresh(true);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      let accumulatedText = '';
      let lastResult: any = null;
      let streamFailedOrEmpty = false;

      if (activeRequestIdRef.current !== currentRequestId) return;

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') || !response.body?.getReader) {
        const jsonPayload = await response.json().catch(() => null);
        if (jsonPayload) {
          lastResult = jsonPayload;
          accumulatedText = typeof jsonPayload.reply === 'string' ? jsonPayload.reply : '';
        }
        setIsTyping(false);
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            sender: 'assistant',
            text: '',
            timestamp: new Date().toISOString(),
            metadata: {
              reply_to_client_message_id: clientMsgId,
            },
          },
        ]);
        setStreamingMsgId(assistantMsgId);
        setDisplayedStreamingText('');
        setIsTyping(false);

        let buffer = '';
        try {
          while (true) {
            if (activeRequestIdRef.current !== currentRequestId || controller.signal.aborted) {
              break;
            }

            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (activeRequestIdRef.current !== currentRequestId || controller.signal.aborted) break;
              const cleanLine = line.trim();
              if (cleanLine.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(cleanLine.slice(6));
                  if (eventData.type === 'chunk' && eventData.text) {
                    accumulatedText += eventData.text;
                    setDisplayedStreamingText(accumulatedText);
                  } else if (eventData.type === 'metadata' && eventData.data) {
                    lastResult = eventData.data;
                    if (eventData.data.visitor_session_token) {
                      updateVisitorToken(eventData.data.visitor_session_token);
                    }
                  } else if (eventData.type === 'error') {
                    streamFailedOrEmpty = true;
                  }
                } catch (err) {
                  console.warn('Could not parse streamed line:', err);
                }
              }
            }
          }
        } catch (readErr) {
          console.warn('Stream read interrupted:', readErr);
          streamFailedOrEmpty = true;
        } finally {
          try {
            reader.releaseLock();
          } catch {}
        }

        if (activeRequestIdRef.current !== currentRequestId || controller.signal.aborted) {
          return;
        }

        if (buffer.trim().startsWith('data: ')) {
          try {
            const eventData = JSON.parse(buffer.trim().slice(6));
            if (eventData.type === 'chunk' && eventData.text) {
              accumulatedText += eventData.text;
            } else if (eventData.type === 'metadata' && eventData.data) {
              lastResult = eventData.data;
              if (eventData.data.visitor_session_token) {
                updateVisitorToken(eventData.data.visitor_session_token);
              }
            }
          } catch {}
        }

        setStreamingMsgId(null);
        setDisplayedStreamingText('');
      }

      // Automatic 1-shot non-streaming JSON fallback if SSE dropped or returned empty reply before throwing
      if ((streamFailedOrEmpty || (!accumulatedText.trim() && !lastResult?.reply)) && !controller.signal.aborted) {
        try {
          const fallbackRes = await executeWithAuthRefresh(false);
          if (fallbackRes.ok) {
            const jsonFallback = await fallbackRes.json().catch(() => null);
            if (jsonFallback && typeof jsonFallback.reply === 'string' && jsonFallback.reply.trim()) {
              lastResult = jsonFallback;
              accumulatedText = jsonFallback.reply;
            }
          }
        } catch (fallbackErr) {
          console.warn('Non-streaming fallback failed:', fallbackErr);
        }
      }

      // 3. Robust client-side reply extraction
      const cleanAssistantText = (accumulatedText.trim() || lastResult?.reply || '').trim();
      if (!cleanAssistantText) {
        // Remove empty streaming placeholder before entering clean retry banner state
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        setHasError(true);
        setFailedMessage(userMsg);
        return;
      }

      const assistantReply = cleanAssistantText;
      failedTurnRef.current = null;

      if (lastResult?.inquiry_id && !currentLeadId) {
        setCurrentLeadId(lastResult.inquiry_id);
      }

      if (lastResult?.structured_profile) {
        setLeadProfile(lastResult.structured_profile);
      }

      if (lastResult?.detected_intent === 'HUMAN_HANDOFF_REQUEST' || lastResult?.escalated_to_care) {
        setHumanHandoffRequested(true);
      }

      // Contextual options only, no fallback spam
      const rawOptions = Array.isArray(lastResult?.options) ? lastResult.options : [];
      const cappedOptions = rawOptions
        .filter((opt: any) => typeof opt === 'string' && opt.trim() && !/DEBUG|SYSTEM|Score|Stage/i.test(opt))
        .slice(0, 3);

      const serverMsgId = lastResult?.message_id ? String(lastResult.message_id) : undefined;
      const serverCustMsgId = lastResult?.customer_message_id ? String(lastResult.customer_message_id) : undefined;

      const assistantMessageObj: ChatMessage = {
        id: serverMsgId || assistantMsgId,
        message_id: serverMsgId,
        sender: 'assistant',
        text: assistantReply,
        timestamp: new Date().toISOString(),
        options: cappedOptions,
        sentiment: lastResult?.sentiment,
        detected_intent: lastResult?.detected_intent,
        escalated_to_care: lastResult?.escalated_to_care,
        reasoning_mode: lastResult?.reasoning_mode,
        analysis_summary: lastResult?.analysis_summary,
        metadata: {
          inquiry_registered: lastResult?.inquiry_registered,
          reasoning_mode: lastResult?.reasoning_mode,
          analysis_summary: lastResult?.analysis_summary,
          reply_to_client_message_id: clientMsgId,
          db_confirmed: lastResult?.db_confirmed,
        },
      };

      // Functional state update replacing temporary streaming message & reconciling customer message_id in-place
      setMessages((prev) => {
        const updatedCustomerPrev = prev.map((m) =>
          m.id === clientMsgId && serverCustMsgId
            ? { ...m, message_id: serverCustMsgId }
            : m
        );
        const exists = updatedCustomerPrev.some((m) => m.id === assistantMsgId || (serverMsgId && m.message_id === serverMsgId));
        if (exists) {
          return updatedCustomerPrev.map((m) =>
            m.id === assistantMsgId || (serverMsgId && m.message_id === serverMsgId)
              ? assistantMessageObj
              : m
          );
        }
        return [...updatedCustomerPrev, assistantMessageObj];
      });
      playAudioChime('receive');
      if (lastResult?.visitor_session_token) {
        updateVisitorToken(lastResult.visitor_session_token);
      }

      // Lead & Work Queue Sync in Firestore (Non-blocking background sync, never for official landing widget)
      if (
        userId &&
        !isReservedOfficialWidgetIdClient(widgetId) &&
        (lastResult?.is_sales_lead || lastResult?.inquiry_registered) &&
        (lastResult?.lead_data || lastResult?.structured_profile)
      ) {
        const leadData = lastResult.lead_data;
        const sp = lastResult.structured_profile;
        const leadId = currentLeadId || `lead-web-${Date.now()}`;
        if (!currentLeadId) {
          setCurrentLeadId(leadId);
        }

        const resolvedCustomer = sp?.customer_name || leadData?.customer_name || 'Website Visitor';
        const resolvedProduct = sp?.product_or_service || leadData?.product_or_service || 'Commercial Requirement';
        const resolvedQty = sp?.quantity_or_scope || leadData?.quantity || 'Unknown';
        const resolvedLoc = sp?.location || leadData?.location || 'Unknown';
        const resolvedDeadline = sp?.deadline || leadData?.deadline || 'Unknown';
        const resolvedBudget = sp?.budget || leadData?.budget || 'Unknown';

        const committedHistory = [...historySnapshot, assistantMessageObj];

        const newLead: InquiryLead = {
          id: leadId,
          customer_name: resolvedCustomer,
          companyName: resolvedCustomer,
          contactName: sp?.contact_info || 'Website Visitor',
          source: 'Website',
          channel: 'Website',
          lead_temperature: leadData?.lead_temperature || (lastResult.inquiry_registered ? 'HOT' : 'WARM'),
          lead_score: leadData?.lead_temperature || (lastResult.inquiry_registered ? 'HOT' : 'WARM'),
          lead_reason: leadData?.lead_reason || (lastResult.inquiry_registered ? 'Customer registered inquiry via live chat.' : 'Inbound inquiry received via embedded website chat.'),
          temperature_reason: leadData?.lead_reason || 'Inbound inquiry received via embedded website chat.',
          status: 'Needs Approval',
          customer_intent: leadData?.customer_intent || 'Website Inbound Lead',
          original_message: userMsg,
          raw_inquiry: userMsg,
          product_or_service: resolvedProduct,
          quantity: resolvedQty,
          location: resolvedLoc,
          deadline: resolvedDeadline,
          budget: resolvedBudget,
          requirements: sp?.requirements && sp.requirements.length > 0 ? sp.requirements : (leadData?.requirements || []),
          missing_information: leadData?.missing_information || ['None'],
          recommended_action: leadData?.recommended_action || 'Review conversation and approve prepared response.',
          recommended_next_action: leadData?.recommended_action || 'Review conversation and approve prepared response.',
          draft_reply: assistantReply,
          suggested_reply: assistantReply,
          sales_summary: `${leadData?.lead_temperature || 'WARM'} lead: ${resolvedQty !== 'Unknown' ? `${resolvedQty} ` : ''}${resolvedProduct}${resolvedLoc !== 'Unknown' ? ` in ${resolvedLoc}` : ''}. Auto-detected from Website Chat.`,
          created_at: new Date().toISOString(),
          last_action_at: new Date().toISOString(),
          structured_profile: sp,
          inquiry_registered: lastResult.inquiry_registered === true,
          conversation_id: conversationId,
          messages: committedHistory.map((m) => ({
            sender: m.sender as 'customer' | 'assistant' | 'user' | 'system',
            text: m.text,
            timestamp: m.timestamp || new Date().toISOString(),
          })),
          message_history: committedHistory.map((m) => ({
            sender: m.sender as 'customer' | 'assistant' | 'user' | 'system',
            text: m.text,
            timestamp: m.timestamp || new Date().toISOString(),
          })),
        };

        const syncPromises: Promise<any>[] = [
          logUserActivity(userId, {
            id: `act-web-${Date.now()}`,
            leadId: leadId,
            employeeName: isPortfolio ? roleTitle : 'Alpha',
            title: lastResult.inquiry_registered
              ? `Customer Inquiry Registered (${newLead.lead_temperature})`
              : `Website Inquiry: ${newLead.lead_temperature} Lead Created`,
            description: `Auto-qualified message from ${newLead.customer_name} (${newLead.product_or_service}). Status: ${newLead.status}.`,
            timestamp: new Date().toISOString(),
            type: 'analysis',
          }),
          saveUserTask(userId, {
            id: `task-web-${Date.now()}`,
            leadId: leadId,
            companyName: newLead.companyName,
            title: `Review Website Lead: ${newLead.product_or_service}`,
            leadScore: newLead.lead_temperature,
            priority: newLead.lead_temperature === 'HOT' ? 'high' : 'medium',
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            status: 'pending',
            actionType: 'approve_reply',
          }),
        ];

        if (!lastResult.db_confirmed) {
          syncPromises.push(saveInquiry(userId, newLead));
          syncPromises.push(saveConversation(userId, {
            id: conversationId,
            widget_id: widgetId,
            visitor_id: visitorId,
            customer_name: 'Website Visitor',
            messages: committedHistory,
            lead_id: leadId,
            structured_profile: sp || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        }

        Promise.all(syncPromises).catch((syncErr) => console.warn('Background Firestore sync note:', syncErr));

        if (onLeadAutoCreated) {
          onLeadAutoCreated(newLead);
        }
      }
    } catch (err) {
      console.warn('Chat request fallback:', err);
      setStreamingMsgId(null);
      setDisplayedStreamingText('');
      setMessages((prev) => prev.filter((m) => !(m.sender === 'assistant' && !m.text.trim())));
      setIsTyping(false);
      setHasError(true);
      setFailedMessage(userMsg);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSendMessage(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeSendMessage(inputText);
    }
  };

  const handleOptionClick = (optionLabel: string) => {
    if (optionLabel.toLowerCase() === 'something else' || optionLabel.toLowerCase() === 'ask a question') {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }
    executeSendMessage(optionLabel);
  };

  const handleRetry = () => {
    const failedTurn = failedTurnRef.current;
    if (failedTurn) {
      executeSendMessage(failedTurn.text, failedTurn.clientMessageId);
    } else if (failedMessage) {
      executeSendMessage(failedMessage);
    }
  };

  /**
   * REFRESH / RE-SYNC BUTTON HANDLER
   * MUST NEVER ERASE CONVERSATIONS!
   * Reloads saved conversation state, restores messages, syncs state with subtle feedback.
   */
  const handleReloadSyncConversation = () => {
    setIsSyncing(true);
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(storagePersistenceKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
            messagesRef.current = parsed.messages;
            setMessages(parsed.messages);
            if (parsed.conversationId) updateConversationId(parsed.conversationId);
            if (parsed.visitorToken) updateVisitorToken(parsed.visitorToken);
            if (parsed.leadProfile) setLeadProfile(parsed.leadProfile);
          }
        }
      }
    } catch (err) {
      console.warn('Sync load note:', err);
    }

    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice('Conversation synchronized');
      setTimeout(() => setSyncNotice(null), 2500);
    }, 450);
  };

  if (!isOpen) return null;

  const widgetShadow = getWidgetBoxShadowStyle(resolvedShadow, resolvedGlow, resolvedMode, resolvedPrimaryColor);

  return (
    <div
      style={{
        borderRadius: `${resolvedBorderRadius}px`,
        background: widgetContainerBg,
        boxShadow: widgetShadow,
        color: resolvedTextColor,
        borderColor: isLightBg ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255, 255, 255, 0.12)',
      }}
      className="flex flex-col h-full w-full overflow-hidden font-sans select-text border shadow-2xl relative transition-all duration-200"
    >
      {/* Widget Header - Refined Apple x ChatGPT Chrome */}
      <div
        style={{
          backgroundColor: headerBg,
          color: headerTextColor,
          borderBottomColor: tokens.headerBorder,
        }}
        className="px-4 py-3 border-b flex items-center justify-between select-none shrink-0 z-20 transition-colors"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            style={{
              backgroundColor: resolvedLogoUrl ? '#FFFFFF' : isLightBg ? '#FFFFFF' : '#18181B',
              color: isLightBg ? '#0F172A' : '#FFFFFF',
              borderColor: isLightBg ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.18)',
            }}
            className="w-8 h-8 rounded-lg border flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs overflow-hidden"
          >
            {resolvedLogoUrl ? (
              <img src={resolvedLogoUrl} alt={effectiveBusinessName} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <span>α</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 style={{ color: headerTextColor }} className="text-[13px] font-semibold leading-tight tracking-tight truncate">
                {roleTitle}
              </h3>
              <span
                aria-label="Online"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>LIVE</span>
              </span>
            </div>
            <p
              style={{ color: tokens.headerSubtext }}
              className="text-[11px] truncate mt-0.5 leading-tight font-medium"
            >
              {effectiveBusinessName}
            </p>
          </div>
        </div>

        {/* Header Action Controls (>= 36-40px accessible touch target + focus ring) */}
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleStartNewChat}
            title="Start new conversation"
            style={{ color: headerTextColor }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.headerHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Start new conversation"
          >
            <RotateCcw className="w-4 h-4 opacity-85" />
          </button>

          <button
            type="button"
            onClick={handleReloadSyncConversation}
            disabled={isSyncing}
            title="Re-sync conversation"
            style={{ color: headerTextColor }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.headerHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Re-sync conversation"
          >
            <RefreshCw className={`w-4 h-4 opacity-85 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute sound chimes' : 'Mute sound chimes'}
            style={{ color: headerTextColor }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.headerHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Toggle sound chimes"
          >
            {isMuted ? <VolumeX className="w-4 h-4 opacity-65" /> : <Volume2 className="w-4 h-4 opacity-85" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close chat"
              style={{ color: headerTextColor }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.headerHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="Close Sales Manager"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Synchronized Feedback Toast */}
      <AnimatePresence>
        {syncNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              backgroundColor: tokens.bannerBg,
              borderBottomColor: tokens.bannerBorder,
              color: tokens.bannerText,
            }}
            className="border-b px-3 py-1.5 flex items-center justify-center text-[11px] font-medium gap-1.5 shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{syncNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Human Handoff Banner */}
      {humanHandoffRequested && (
        <div
          style={{
            backgroundColor: tokens.bannerBg,
            borderBottomColor: tokens.bannerBorder,
            color: tokens.bannerText,
          }}
          className="border-b px-3.5 py-2 flex items-center justify-between text-[11px] shrink-0"
        >
          <div className="flex items-center space-x-2">
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
            <span>Human handoff active. Inbound brief prepared for team review.</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ backgroundColor: tokens.viewportBg }}
        className="flex-1 min-h-0 px-3.5 py-4 overflow-y-auto space-y-3.5 relative transition-colors"
      >
        {/* Subtle Memory Indicator for Returning Visitors */}
        {hasRestoredPriorHistory && (
          <div className="flex items-center justify-center my-1">
            <span
              style={{
                backgroundColor: tokens.bannerBg,
                color: tokens.timestampText,
                borderColor: tokens.bannerBorder,
              }}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Prior conversation restored</span>
            </span>
          </div>
        )}

        {messages.map((m, idx) => {
          const isCustomer = m.sender === 'customer';
          const isLatestAssistant = !isCustomer && idx === messages.length - 1;

          const isStreamingThisMsg = streamingMsgId === m.id;
          const textToRender = isStreamingThisMsg ? displayedStreamingText : m.text;

          const currentBubbleBg = isCustomer ? resolvedUserMsgBg : resolvedAiMsgBg;
          const currentBubbleText = isCustomer ? resolvedUserMsgText : resolvedAiMsgText;
          const isBubbleLight = isColorLight(currentBubbleBg);

          return (
            <motion.div
              key={m.id || m.message_id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
            >
              <div
                style={{
                  backgroundColor: currentBubbleBg,
                  color: currentBubbleText,
                  borderColor: isCustomer ? 'transparent' : tokens.aiBubbleBorder,
                  borderRadius: isCustomer ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  ['--msg-strong' as any]: isBubbleLight ? '#0F172A' : '#FFFFFF',
                  ['--msg-heading' as any]: isBubbleLight ? '#0F172A' : '#FFFFFF',
                  ['--msg-link' as any]: isBubbleLight ? '#1D4ED8' : '#60A5FA',
                  ['--msg-code-bg' as any]: isBubbleLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)',
                  ['--msg-code-fg' as any]: isBubbleLight ? '#0F172A' : '#F8FAFC',
                }}
                className={`max-w-[86%] text-[13px] px-3.5 py-2.5 leading-relaxed border shadow-2xs transition-colors aiw-formatted-message ${
                  isCustomer ? 'font-medium' : ''
                }`}
              >
                {renderFormattedMessageText(textToRender, isBubbleLight, currentBubbleText)}
                {isStreamingThisMsg && (
                  <span
                    style={{ backgroundColor: isBubbleLight ? '#0F172A' : '#FFFFFF' }}
                    className="inline-block w-1.5 h-3.5 animate-pulse ml-1 align-middle rounded-xs"
                  />
                )}
              </div>

              <span style={{ color: tokens.timestampText }} className="text-[10px] px-1 mt-1 font-normal">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Contextual Suggestion Prompts */}
              {isLatestAssistant && !isTyping && !isStreamingThisMsg && m.options && m.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                  {m.options.slice(0, 3).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleOptionClick(opt)}
                      style={{
                        backgroundColor: tokens.chipBg,
                        color: tokens.chipText,
                        borderColor: tokens.chipBorder,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.chipHoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tokens.chipBg)}
                      className="text-[11px] px-3 py-1.5 text-left transition-colors cursor-pointer font-medium rounded-lg border shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <div
              style={{
                backgroundColor: tokens.aiBubbleBg,
                borderColor: tokens.aiBubbleBorder,
                color: tokens.aiBubbleText,
              }}
              className="px-3.5 py-2.5 rounded-[16px_16px_16px_4px] border shadow-2xs"
            >
              <div className="flex space-x-1.5 items-center h-3">
                <span style={{ backgroundColor: tokens.timestampText }} className="w-1.5 h-1.5 rounded-full animate-bounce [animation-duration:0.8s]" />
                <span style={{ backgroundColor: tokens.timestampText }} className="w-1.5 h-1.5 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.15s]" />
                <span style={{ backgroundColor: tokens.timestampText }} className="w-1.5 h-1.5 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.3s]" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Recovery State */}
        {hasError && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              isLightBg
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-red-950/50 border-red-900/60 text-red-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>Could not send message.</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />

        {/* Floating "New Message ↓" Scroll Badge */}
        {hasUnreadBelow && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => scrollToBottom(true)}
            style={{
              backgroundColor: tokens.sendBtnBg,
              color: tokens.sendBtnText,
            }}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold shadow-lg flex items-center space-x-1 hover:scale-105 transition-transform cursor-pointer z-10"
          >
            <span>New message</span>
            <ArrowDown className="w-3 h-3" />
          </motion.button>
        )}
      </div>

      {/* Message Composer - Apple x ChatGPT Clean Composer */}
      <form
        onSubmit={handleSendMessage}
        style={{
          backgroundColor: tokens.composerBg,
          borderTopColor: tokens.composerBorder,
        }}
        className="p-3 border-t flex flex-col space-y-2 shrink-0 z-20 transition-colors"
      >
        {/* Active Speech Recording Banner */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-medium"
            >
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Listening... Speak clearly</span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className="text-[10px] underline hover:opacity-80 cursor-pointer font-bold uppercase tracking-wider"
              >
                Done
              </button>
            </motion.div>
          )}

          {voiceNotice && !isListening && (
            <motion.div
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              style={{
                backgroundColor: tokens.bannerBg,
                borderColor: tokens.bannerBorder,
                color: tokens.bannerText,
              }}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] leading-tight"
            >
              <span>{voiceNotice}</span>
              <button
                type="button"
                onClick={() => setVoiceNotice(null)}
                className="ml-2 font-bold opacity-75 hover:opacity-100"
                aria-label="Dismiss voice notice"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Ask Alpha anything...'}
            aria-label="Message Alpha"
            disabled={isTyping}
            style={{
              backgroundColor: tokens.inputBg,
              color: tokens.inputText,
              borderColor: tokens.inputBorder,
            }}
            className="flex-1 min-h-[40px] text-[13px] px-3.5 py-2.5 rounded-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all resize-none max-h-24 overflow-y-auto leading-snug"
          />

          {/* Voice to Text Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              title={isListening ? 'Stop recording voice' : 'Speak message (Voice-to-Text)'}
              aria-label={isListening ? 'Stop recording voice' : 'Start voice input'}
              disabled={isTyping}
              style={!isListening ? {
                backgroundColor: tokens.inputBg,
                color: tokens.inputText,
                borderColor: tokens.inputBorder,
              } : undefined}
              className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl font-medium transition-all flex items-center justify-center flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isListening
                  ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                  : 'border hover:opacity-85'
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 text-white" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            aria-label="Send message"
            style={
              inputText.trim() && !isTyping
                ? {
                    backgroundColor: tokens.sendBtnBg,
                    color: tokens.sendBtnText,
                  }
                : {
                    backgroundColor: tokens.inputBg,
                    color: tokens.inputPlaceholder,
                    borderColor: tokens.inputBorder,
                  }
            }
            className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl font-medium transition-all flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              inputText.trim() && !isTyping
                ? 'hover:opacity-90 active:scale-95 shadow-sm cursor-pointer'
                : 'border cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Platform-Level Widget Branding Attribution */}
      {!hideAttributionFooter && (
        <div
          style={{
            backgroundColor: tokens.footerBg,
            borderTopColor: tokens.footerBorder,
          }}
          className="py-1.5 px-3 border-t text-center text-[10px] tracking-wide select-none shrink-0 flex items-center justify-center z-20 transition-colors"
        >
          <a
            href="https://aiworkforce.ai.studio/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: tokens.footerText,
              textDecoration: 'none',
            }}
            className="hover:opacity-100 transition-opacity inline-flex items-center gap-1 font-medium"
          >
            <span>Powered by AI Workforce</span>
            <span className="text-[10px] leading-none font-semibold">↗</span>
          </a>
        </div>
      )}
    </div>
  );
};
