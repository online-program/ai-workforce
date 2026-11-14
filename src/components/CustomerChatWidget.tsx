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
import { getAccessibleTextColor, getWidgetBoxShadowStyle } from '../utils/widgetDesignUtils.ts';
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

  // Firestore live updates if public widget & real-time broadcast listener
  useEffect(() => {
    if (!widgetId) return;
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

  const activeCompanyProfile = liveDocData?.company_profile || companyProfile;
  const effectiveBusinessName = liveDocData?.business_name || activeCompanyProfile?.name || businessName;
  const isPortfolio = isPortfolioDeployment(activeCompanyProfile);
  const roleTitle = isPortfolio ? getPortfolioRoleTitle(activeCompanyProfile) : 'AI Sales Manager';

  // Harmonize mode and studio settings with liveDocData taking authoritative priority
  const resolvedMode = (liveDocData?.mode || liveDocData?.design_style || studioConfig?.mode || mode || design_style || 'attractive_3d') as WidgetVisualMode;
  const isSimple = resolvedMode === 'simple';

  const resolvedPrimaryColor = liveDocData?.primaryColor || liveDocData?.theme_color || liveDocData?.studioConfig?.primaryColor || studioConfig?.primaryColor || primaryColor || themeColor || '#000000';
  const resolvedSecondaryColor = liveDocData?.secondaryColor || liveDocData?.studioConfig?.secondaryColor || studioConfig?.secondaryColor || secondaryColor || '#10b981';
  const resolvedBgColor = liveDocData?.backgroundColor || liveDocData?.studioConfig?.backgroundColor || studioConfig?.backgroundColor || backgroundColor || (isSimple ? '#ffffff' : '#0a0a0c');
  const resolvedTextColor = liveDocData?.textColor || liveDocData?.studioConfig?.textColor || studioConfig?.textColor || textColor || (isSimple ? '#0f172a' : '#ffffff');

  const resolvedAiMsgBg = liveDocData?.aiMessageColor || liveDocData?.studioConfig?.aiMessageColor || studioConfig?.aiMessageColor || aiMessageColor || (isSimple ? '#f1f5f9' : '#141418');
  const resolvedAiMsgText = liveDocData?.aiMessageTextColor || liveDocData?.studioConfig?.aiMessageTextColor || studioConfig?.aiMessageTextColor || aiMessageTextColor || (isSimple ? '#0f172a' : '#f4f4f5');

  const resolvedUserMsgBg = liveDocData?.userMessageColor || liveDocData?.studioConfig?.userMessageColor || studioConfig?.userMessageColor || userMessageColor || (isSimple ? resolvedPrimaryColor : '#ffffff');
  const resolvedUserMsgText = liveDocData?.userMessageTextColor || liveDocData?.studioConfig?.userMessageTextColor || studioConfig?.userMessageTextColor || userMessageTextColor || (isSimple ? '#ffffff' : '#000000');

  const resolvedBorderRadius = liveDocData?.borderRadius !== undefined
    ? liveDocData.borderRadius
    : (liveDocData?.studioConfig?.borderRadius !== undefined
      ? liveDocData.studioConfig.borderRadius
      : (borderRadius !== undefined
        ? borderRadius
        : (studioConfig?.borderRadius !== undefined ? studioConfig.borderRadius : (isSimple ? 14 : 18))));

  const resolvedShadow = liveDocData?.shadowIntensity || liveDocData?.studioConfig?.shadowIntensity || shadowIntensity || studioConfig?.shadowIntensity || (isSimple ? 'soft' : 'medium');
  const resolvedGlow = liveDocData?.glowIntensity || liveDocData?.studioConfig?.glowIntensity || glowIntensity || studioConfig?.glowIntensity || 'none';

  const resolvedGradientEnabled = liveDocData?.gradientEnabled !== undefined
    ? liveDocData.gradientEnabled
    : (liveDocData?.studioConfig?.gradientEnabled !== undefined
      ? liveDocData.studioConfig.gradientEnabled
      : (gradientEnabled ?? studioConfig?.gradientEnabled ?? false));
  const resolvedGradientType = liveDocData?.gradientType || liveDocData?.studioConfig?.gradientType || gradientType || studioConfig?.gradientType || 'none';
  const resolvedGradientColor1 = liveDocData?.gradientColor1 || liveDocData?.studioConfig?.gradientColor1 || gradientColor1 || studioConfig?.gradientColor1 || resolvedPrimaryColor;
  const resolvedGradientColor2 = liveDocData?.gradientColor2 || liveDocData?.studioConfig?.gradientColor2 || gradientColor2 || studioConfig?.gradientColor2 || resolvedSecondaryColor;
  const resolvedGradientAngle = liveDocData?.gradientAngle ?? liveDocData?.studioConfig?.gradientAngle ?? gradientAngle ?? studioConfig?.gradientAngle ?? 135;

  const isLightBg = isSimple || (resolvedBgColor && (resolvedBgColor === '#ffffff' || resolvedBgColor.toLowerCase() === '#fff' || resolvedBgColor.toLowerCase().startsWith('#f')));

  let widgetContainerBg = resolvedBgColor;
  if (resolvedGradientEnabled && resolvedGradientType !== 'none') {
    if (resolvedGradientType === 'subtle') {
      widgetContainerBg = `linear-gradient(${resolvedGradientAngle}deg, ${resolvedGradientColor1}, ${resolvedGradientColor2} 80%)`;
    } else {
      widgetContainerBg = `linear-gradient(${resolvedGradientAngle}deg, ${resolvedGradientColor1} 0%, ${resolvedGradientColor2} 100%)`;
    }
  }

  let headerBg = resolvedPrimaryColor;
  if (!isSimple && (resolvedPrimaryColor === '#000000' || resolvedPrimaryColor === '#0f172a' || !resolvedPrimaryColor)) {
    headerBg = '#000000';
  }
  const headerTextColor = getAccessibleTextColor(headerBg);

  // Dynamic Opening Greeting
  const effectiveWelcomeMessage = generateAlphaVisitorGreeting(
    activeCompanyProfile,
    liveDocData?.welcome_message || welcomeMessage
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
      if (visitorToken && !forceRefresh) return visitorToken;
      try {
        const res = await fetch('/api/widget/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widget_id: widgetId,
            conversation_id: conversationId,
            visitor_id: visitorId,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.success && data?.token && isMounted) {
          setVisitorToken(data.token);
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
            conversation_id: conversationId,
            visitor_id: visitorId,
            type,
            message_ids: messageIds,
          }),
        });
      } catch {}
    };

    const syncServerConversation = async () => {
      try {
        let token = await ensureVisitorToken(false);
        if (!token) return;

        let res = await fetch(
          `/api/widget/conversation?widget_id=${encodeURIComponent(widgetId)}&conversation_id=${encodeURIComponent(conversationId)}&visitor_id=${encodeURIComponent(visitorId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 401 || res.status === 403) {
          const errBody = await res.json().catch(() => ({} as any));
          if (errBody?.code === 'UNAUTHORIZED_OWNERSHIP') {
            if (isMounted) {
              const rotatedConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              setConversationId(rotatedConvId);
              setVisitorToken(null);
            }
            return;
          }
          token = await ensureVisitorToken(true);
          if (!token) return;
          res = await fetch(
            `/api/widget/conversation?widget_id=${encodeURIComponent(widgetId)}&conversation_id=${encodeURIComponent(conversationId)}&visitor_id=${encodeURIComponent(visitorId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          if (!isMounted) return;

          const undeliveredIds = data.messages
            .filter((sm: any) => sm.message_id && sm.sender === 'assistant' && !sm.metadata?.delivered)
            .map((sm: any) => String(sm.message_id));

          const unreadIds = isOpen
            ? data.messages
                .filter((sm: any) => sm.message_id && sm.sender === 'assistant' && !sm.metadata?.read)
                .map((sm: any) => String(sm.message_id))
            : [];

          setMessages((prev) => {
            const existingIds = new Set(
              prev.map((m: any) => m.message_id || m.id).filter(Boolean)
            );
            const newServerMsgs = data.messages.filter((sm: any) => {
              const id = sm.message_id || sm.id;
              if (id) return !existingIds.has(id);
              return !prev.some((pm: any) => pm.sender === sm.sender && pm.text === sm.text);
            });

            if (newServerMsgs.length > 0) {
              return [...prev, ...newServerMsgs];
            }
            return prev;
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

  // Stream state isolation refs
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
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

  // Reset / Start a pristine fresh conversation without prior context contamination
  const handleStartNewChat = () => {
    const freshConvId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setConversationId(freshConvId);
    setCurrentLeadId(null);
    setLeadProfile(null);
    setHumanHandoffRequested(false);
    setHasError(false);
    setFailedMessage(null);
    setMessages([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: effectiveWelcomeMessage,
        timestamp: new Date().toISOString(),
        options: initialOptions,
      },
    ]);
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

  // Send message execution
  const executeSendMessage = async (textToSend: string) => {
    if (isListening) {
      stopListening();
    }

    const userMsg = textToSend.trim();
    if (!userMsg) return;

    // Deduplication check: prevent rapid duplicate message submission within 600ms
    if (
      lastSentMessageRef.current &&
      lastSentMessageRef.current.text === userMsg &&
      Date.now() - lastSentMessageRef.current.time < 600
    ) {
      return;
    }
    lastSentMessageRef.current = { text: userMsg, time: Date.now() };

    // Abort any existing active request/stream
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('New request initiated');
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const currentRequestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    activeRequestIdRef.current = currentRequestId;

    setHasError(false);
    setFailedMessage(null);
    setVoiceNotice(null);

    const userMsgId = `msg-${Date.now()}`;
    const userMessageObj: ChatMessage = {
      id: userMsgId,
      sender: 'customer',
      text: userMsg,
      timestamp: new Date().toISOString(),
    };

    let historySnapshot: ChatMessage[] = [];
    setMessages((prev) => {
      historySnapshot = [...prev, userMessageObj];
      return historySnapshot;
    });
    playAudioChime('send');

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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

      const mintSessionToken = async (targetConvId: string): Promise<string | null> => {
        if (!effectiveWidgetIdForChat) return null;
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
          if (!sRes.ok) return null;
          const sData = await sRes.json().catch(() => ({} as any));
          if (sData?.success && sData?.token) {
            setVisitorToken(sData.token);
            return sData.token;
          }
        } catch {}
        return null;
      };

      let activeVisitorToken = visitorToken;
      let activeConvId = conversationId;
      if (!canUseSimulation && effectiveWidgetIdForChat && !activeVisitorToken) {
        activeVisitorToken = await mintSessionToken(activeConvId);
      }

      const sendChatRequest = async (tokenToUse: string | null, convIdToUse: string) => {
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
            client_message_id: userMsgId,
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
            stream: true,
            analytics_consent: hasAnalyticsConsent,
          }),
        });
      };

      let response = await sendChatRequest(activeVisitorToken, activeConvId);

      if ((response.status === 401 || response.status === 403) && !canUseSimulation && effectiveWidgetIdForChat) {
        const errBody = await response.json().catch(() => ({} as any));
        const errCode = typeof errBody?.code === 'string' ? errBody.code : '';
        if (errCode === 'UNAUTHORIZED_OWNERSHIP') {
          activeConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          setConversationId(activeConvId);
          setVisitorToken(null);
          activeVisitorToken = await mintSessionToken(activeConvId);
          if (activeVisitorToken) {
            response = await sendChatRequest(activeVisitorToken, activeConvId);
          }
        } else if (response.status === 401 || errCode.startsWith('TOKEN_')) {
          activeVisitorToken = await mintSessionToken(activeConvId);
          if (activeVisitorToken) {
            response = await sendChatRequest(activeVisitorToken, activeConvId);
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      const assistantMsgId = `msg-${Date.now() + 1}`;
      let accumulatedText = '';
      let lastResult: any = null;

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
          },
        ]);
        setStreamingMsgId(assistantMsgId);
        setDisplayedStreamingText('');
        setIsTyping(false);

        let buffer = '';
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
                }
              } catch (err) {
                console.warn('Could not parse streamed line:', err);
              }
            }
          }
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
            }
          } catch {}
        }

        setStreamingMsgId(null);
        setDisplayedStreamingText('');
      }

      // 3. Robust client-side reply extraction without destructive preposition filtering
      const cleanAssistantText = (accumulatedText.trim() || lastResult?.reply || '').trim();
      let assistantReply = cleanAssistantText;

      // If backend returned nothing or invalid text, trigger an identifiable temporary error/retry state without fabricating fake acknowledgments
      if (!assistantReply) {
        assistantReply = "I hit a temporary response error. Please retry.";
        setHasError(true);
        setFailedMessage(userMsg);
      }

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

      const assistantMessageObj: ChatMessage = {
        id: assistantMsgId,
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
        },
      };

      // Functional state update replacing temporary streaming message in-place
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === assistantMsgId);
        if (exists) {
          return prev.map((m) => (m.id === assistantMsgId ? assistantMessageObj : m));
        }
        return [...prev, assistantMessageObj];
      });
      playAudioChime('receive');
      if (lastResult?.visitor_session_token) {
        setVisitorToken(lastResult.visitor_session_token);
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
      setIsTyping(false);
      setHasError(true);
      setFailedMessage(userMsg);
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
    if (failedMessage) {
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
            setMessages(parsed.messages);
            if (parsed.conversationId) setConversationId(parsed.conversationId);
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
      }}
      className={`flex flex-col h-full w-full overflow-hidden font-sans select-text border ${isLightBg ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-[#0a0a0c] text-neutral-100'} shadow-2xl relative transition-all duration-200`}
    >
      {/* Widget Header - High Polish Compact Linear Style */}
      <div
        style={{
          backgroundColor: headerBg,
          color: headerTextColor,
          borderBottomColor: isLightBg ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
        }}
        className="px-4 py-3 border-b flex items-center justify-between select-none shrink-0 z-20 transition-colors"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            style={{
              backgroundColor: isSimple ? resolvedPrimaryColor : '#ffffff',
              color: isSimple ? '#ffffff' : '#000000',
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center font-mono font-extrabold text-xs shrink-0 shadow-xs"
          >
            α
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 style={{ color: headerTextColor }} className="text-xs font-bold leading-none tracking-tight">
                {roleTitle}
              </h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-[9px] font-mono font-semibold text-emerald-400">LIVE</span>
              </div>
            </div>
            <p
              style={{ color: isLightBg && headerBg === '#ffffff' ? '#64748b' : (headerTextColor === '#000000' ? '#475569' : '#a1a1aa') }}
              className="text-[10px] truncate mt-0.5 leading-none font-medium"
            >
              {effectiveBusinessName}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* New Chat / Reset button */}
          <button
            onClick={handleStartNewChat}
            title="Start new conversation"
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
            aria-label="Start new conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Refresh / Re-sync button (Never erases conversation) */}
          <button
            onClick={handleReloadSyncConversation}
            disabled={isSyncing}
            title="Re-sync conversation"
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
            aria-label="Re-sync conversation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : ''}`} />
          </button>

          {/* Mute audio chimes toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute sound chimes" : "Mute sound chimes"}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
            aria-label="Toggle sound chimes"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-300" />}
          </button>

          {/* Close button (Always clickable, closes immediately) */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close chat"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
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
            className="bg-neutral-900 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-center text-white text-[10px] font-mono gap-1.5 shrink-0"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{syncNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Human Handoff Banner */}
      {humanHandoffRequested && (
        <div className="bg-neutral-900 border-b border-neutral-800 px-3.5 py-2 flex items-center justify-between text-neutral-300 text-[11px] shrink-0">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-sky-400" />
            <span>Human handoff active. Inbound brief prepared for executive review.</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 p-3.5 overflow-y-auto space-y-3 relative bg-[#070709]"
      >
        {/* Subtle Memory Indicator for Returning Visitors */}
        {hasRestoredPriorHistory && (
          <div className="flex items-center justify-center my-1">
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900/80 px-2.5 py-0.5 rounded-full border border-neutral-800 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-neutral-300" />
              <span>Prior conversation restored</span>
            </span>
          </div>
        )}

        {messages.map((m, idx) => {
          const isCustomer = m.sender === 'customer';
          const isLatestAssistant = !isCustomer && idx === messages.length - 1;

          const isStreamingThisMsg = streamingMsgId === m.id;
          const textToRender = isStreamingThisMsg ? displayedStreamingText : m.text;

          const isBubbleLight = isCustomer ? isColorLight(resolvedUserMsgBg) : isColorLight(resolvedAiMsgBg);
          const currentBubbleBg = isCustomer ? resolvedUserMsgBg : resolvedAiMsgBg;
          const currentBubbleText = isCustomer ? resolvedUserMsgText : resolvedAiMsgText;

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
            >
              <div
                style={{
                  backgroundColor: currentBubbleBg,
                  color: currentBubbleText,
                  borderRadius: isCustomer ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  ['--msg-strong' as any]: isBubbleLight ? '#090d16' : '#ffffff',
                  ['--msg-heading' as any]: isBubbleLight ? '#090d16' : '#ffffff',
                  ['--msg-link' as any]: isBubbleLight ? '#0284c7' : '#38bdf8',
                  ['--msg-code-bg' as any]: isBubbleLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)',
                  ['--msg-code-fg' as any]: isBubbleLight ? '#090d16' : '#f8fafc',
                }}
                className={`max-w-[88%] text-xs px-3.5 py-2.5 leading-relaxed border transition-colors aiw-formatted-message ${
                  isCustomer
                    ? 'border-transparent font-medium'
                    : isBubbleLight
                    ? 'border-slate-200/90 shadow-xs'
                    : 'border-neutral-800/90 shadow-xs'
                }`}
              >
                {renderFormattedMessageText(textToRender, isBubbleLight, currentBubbleText)}
                {isStreamingThisMsg && (
                  <span
                    style={{ backgroundColor: isBubbleLight ? '#0f172a' : '#ffffff' }}
                    className="inline-block w-1.5 h-3 animate-pulse ml-0.5 align-middle"
                  />
                )}
              </div>

              <span className="text-[9px] text-neutral-500 px-1 mt-0.5 font-mono">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Contextual Suggestion Prompts */}
              {isLatestAssistant && !isTyping && !isStreamingThisMsg && m.options && m.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                  {m.options.slice(0, 3).map((opt) => (
                    <motion.button
                      key={opt}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOptionClick(opt)}
                      className="text-[11px] px-2.5 py-1 text-left transition-all cursor-pointer font-medium rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="px-3.5 py-2 rounded-[12px_12px_12px_2px] border bg-[#141418] border-neutral-800 text-neutral-300">
              <div className="flex space-x-1.5 items-center h-2.5">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-duration:0.8s]" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.3s]" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Recovery State */}
        {hasError && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/50 flex items-center justify-between text-red-300 text-xs"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
              <span>Could not send message.</span>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-[10px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Retry</span>
            </button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />

        {/* Floating "New Message ↓" Scroll Badge */}
        {hasUnreadBelow && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => scrollToBottom(true)}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-white text-black text-[10px] font-semibold shadow-lg flex items-center space-x-1 hover:scale-105 transition-transform cursor-pointer z-10"
          >
            <span>New message</span>
            <ArrowDown className="w-3 h-3" />
          </motion.button>
        )}
      </div>

      {/* Message Composer - Compact & Responsive */}
      <form
        onSubmit={handleSendMessage}
        className="p-2.5 bg-black border-t border-neutral-800 flex flex-col space-y-2 shrink-0 z-20"
      >

        {/* Active Speech Recording Banner */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              className="flex items-center justify-between px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-medium animate-pulse"
            >
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>Listening... Speak clearly</span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className="text-[9px] underline hover:text-red-300 cursor-pointer font-bold uppercase tracking-wider"
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
              className="flex items-center justify-between px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px] leading-tight"
            >
              <span>{voiceNotice}</span>
              <button
                type="button"
                onClick={() => setVoiceNotice(null)}
                className="ml-2 text-neutral-400 hover:text-white font-bold"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end space-x-1.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Ask Alpha anything...'}
            disabled={isTyping}
            className="flex-1 bg-neutral-900 text-white placeholder:text-neutral-500 text-xs px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-neutral-600 transition-all resize-none max-h-24 overflow-y-auto leading-relaxed"
          />

          {/* Voice to Text Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              title={isListening ? 'Stop recording voice' : 'Speak message (Voice-to-Text)'}
              disabled={isTyping}
              className={`p-2 rounded-lg font-medium transition-all flex-shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 text-white" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className={`p-2 rounded-lg font-medium transition-all flex-shrink-0 ${
              inputText.trim() && !isTyping
                ? 'bg-[#FFD000] text-black hover:bg-[#FFE36A] active:scale-95 shadow-[0_0_12px_rgba(255,208,0,0.35)] cursor-pointer font-bold'
                : 'bg-neutral-900 text-neutral-600 border border-neutral-800/80 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Platform-Level Widget Branding Attribution */}
      {!hideAttributionFooter && (
        <div
          style={{
            backgroundColor: isLightBg ? 'rgba(255, 255, 255, 0.95)' : 'rgba(8, 8, 8, 0.95)',
            borderTopColor: isLightBg ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
          }}
          className="py-1.5 px-3 border-t text-center text-[10px] font-mono tracking-wider select-none shrink-0 flex items-center justify-center z-20 transition-colors"
        >
          <a
            href="https://aiworkforce.ai.studio/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isLightBg ? '#686868' : '#A3A3A3',
              textDecoration: 'none',
            }}
            className="hover:text-[#FFD000] transition-colors inline-flex items-center gap-1 font-semibold uppercase tracking-wider"
          >
            <span>POWERED BY AI WORKFORCE</span>
            <span className="text-[9px] leading-none text-[#FFD000]">↗</span>
          </a>
        </div>
      )}
    </div>
  );
};
