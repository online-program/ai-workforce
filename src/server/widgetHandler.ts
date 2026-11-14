import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import { processWebsiteChatMessage, processWebsiteChatMessageStream } from './chatHandler.ts';
import { sendEmailNotification } from './emailService.ts';
import { validateAndNormalizeInquiryFields } from './semanticFieldValidator.ts';
import {
  CompanyProfile,
  InquiryLead,
  EntityClassificationStatus,
  WebsiteLead,
  DeploymentType,
  WidgetStudioConfig,
  WidgetVisualMode,
  WidgetLauncherType,
  WidgetLauncherSize,
  WidgetLauncherShape,
  WidgetGradientType,
  WidgetShadowIntensity,
  WidgetGlowIntensity,
  WidgetAnimationIntensity,
  WidgetPosition,
} from '../types.ts';
import { isPortfolioDeployment, getUniversalPortfolioQuickActions } from '../utils/portfolioUtils.ts';
import { sanitizeWidgetStudioConfig, DEFAULT_WIDGET_STUDIO_CONFIG } from '../utils/widgetDesignUtils.ts';
import { generateAlphaVisitorGreeting } from '../utils/alphaWelcomeUtils.ts';
import { ALPHA_ENGINE_VERSION, migrateWidgetToLatestAlphaEngine } from './alphaEngine.ts';
import crypto from 'crypto';
import { persistCanonicalEnquiry, normalizeEnquiry, classifyVisitorIntent, shouldRegisterEnquiry } from './canonicalEnquiryService.ts';
import { createDurableHandoff } from './durableHandoffService.ts';
import { issueVisitorSessionToken } from './visitorSessionService.ts';

import {
  PLATFORM_OFFICIAL_TENANT_ID,
  isReservedOfficialWidgetId,
  isOfficialTenantId,
  stripPrivateFieldsFromWidget,
} from './platformConfig.ts';
import { invalidateBrainCache } from './alphaBrainRetriever.ts';

export interface StoredConversationMessage {
  message_id: string;
  sender: 'customer' | 'assistant' | 'employee' | 'system';
  text: string;
  timestamp: string;
  options?: string[];
  sentiment?: string;
  detected_intent?: string;
  escalated_to_care?: boolean;
  grounded?: boolean;
  grounding_source?: string;
  metadata?: {
    client_message_id?: string;
    inquiry_registered?: boolean;
    published?: boolean;
    delivered?: boolean;
    read?: boolean;
    [key: string]: any;
  };
}

export interface StoredMemoryConversation {
  id: string;
  conversation_id: string;
  widget_id: string;
  visitor_id: string;
  tenant_id: string;
  customer_name: string;
  messages: StoredConversationMessage[];
  human_owned?: boolean;
  human_owner_uid?: string;
  human_owner_email?: string;
  handoff_status?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface MemoryIdempotencyRecord {
  reply: string;
  conversation_id: string;
  options: string[];
  sentiment?: string;
  detected_intent?: string;
  escalated_to_care?: boolean;
  db_confirmed?: boolean;
  inquiry_registered?: boolean;
  inquiry_id?: string;
  timestamp: number;
}

const MAX_CONV_MEMORY_ENTRIES = 2000;
const CONV_MEMORY_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_IDEMPOTENCY_MEMORY_ENTRIES = 2000;
const IDEMPOTENCY_MEMORY_TTL_MS = 2 * 60 * 60 * 1000;

export const conversationMemoryStore = new Map<string, StoredMemoryConversation>();
export const idempotencyMemoryStore = new Map<string, MemoryIdempotencyRecord>();

export function buildConversationMemoryKey(tenantId: string, conversationId: string, isSimulation = false): string {
  return `${isSimulation ? 'sim' : tenantId}::${conversationId}`;
}

export function buildIdempotencyMemoryKey(tenantId: string, conversationId: string, clientMessageId: string): string {
  return `${tenantId}::${conversationId}::${clientMessageId}`;
}

function evictConversationMemoryStoreIfNeeded(now = Date.now()): void {
  if (conversationMemoryStore.size < MAX_CONV_MEMORY_ENTRIES) return;
  for (const [k, v] of conversationMemoryStore.entries()) {
    const updatedMs = Date.parse(v.updated_at || v.created_at || '');
    if (!Number.isNaN(updatedMs) && now - updatedMs > CONV_MEMORY_TTL_MS) {
      conversationMemoryStore.delete(k);
    }
  }
  while (conversationMemoryStore.size >= MAX_CONV_MEMORY_ENTRIES) {
    const oldestKey = conversationMemoryStore.keys().next().value;
    if (!oldestKey) break;
    conversationMemoryStore.delete(oldestKey);
  }
}

function evictIdempotencyMemoryStoreIfNeeded(now = Date.now()): void {
  if (idempotencyMemoryStore.size < MAX_IDEMPOTENCY_MEMORY_ENTRIES) return;
  for (const [k, v] of idempotencyMemoryStore.entries()) {
    if (now - v.timestamp > IDEMPOTENCY_MEMORY_TTL_MS) {
      idempotencyMemoryStore.delete(k);
    }
  }
  while (idempotencyMemoryStore.size >= MAX_IDEMPOTENCY_MEMORY_ENTRIES) {
    const oldestKey = idempotencyMemoryStore.keys().next().value;
    if (!oldestKey) break;
    idempotencyMemoryStore.delete(oldestKey);
  }
}

export function getStoredConversationOwner(tenantId: string, conversationId: string): string | undefined {
  const scoped = conversationMemoryStore.get(buildConversationMemoryKey(tenantId, conversationId, false));
  if (scoped?.visitor_id) return scoped.visitor_id;
  return undefined;
}

export function setConversationHumanOwnedInMemory(conversationId: string, humanOwned: boolean, tenantId?: string) {
  const nowIso = new Date().toISOString();
  if (tenantId) {
    const conv = conversationMemoryStore.get(buildConversationMemoryKey(tenantId, conversationId, false));
    if (conv) {
      conv.human_owned = humanOwned;
      conv.updated_at = nowIso;
    }
    return;
  }
  for (const [k, conv] of conversationMemoryStore.entries()) {
    if (!k.startsWith('sim::') && (conv.conversation_id === conversationId || k.endsWith(`::${conversationId}`))) {
      conv.human_owned = humanOwned;
      conv.updated_at = nowIso;
    }
  }
}

export function safeIssueVisitorSessionToken(params: {
  tenant_id: string;
  widget_id?: string;
  visitor_id: string;
  conversation_id: string;
}): string | undefined {
  try {
    return issueVisitorSessionToken(params);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] Token issuance failed:', err?.message || err);
    }
    return undefined;
  }
}

export async function getPublicWidgetCount(): Promise<number> {
  if (!hasAdminCredentials()) return 0;
  try {
    const snap = await getAdminDb().collection('public_widgets').get();
    return snap.size;
  } catch {
    return 0;
  }
}

export async function getAllPublicWidgetsList(): Promise<PublicWidgetConfig[]> {
  if (!hasAdminCredentials()) return [];
  try {
    const snap = await getAdminDb().collection('public_widgets').get();
    return snap.docs.map((doc) => doc.data() as PublicWidgetConfig);
  } catch {
    return [];
  }
}


export interface PublicWidgetConfig {
  widget_id: string;
  user_id?: string;
  business_name: string;
  welcome_message: string;
  theme_color: string;
  is_active: boolean;
  position: 'bottom-right' | 'bottom-left';
  company_profile?: CompanyProfile;
  quick_options?: string[];
  design_style?: 'simple' | 'attractive_3d';
  deploymentType?: DeploymentType;
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
  launcherSize?: WidgetLauncherSize;
  launcherShape?: WidgetLauncherShape;
  borderRadius?: number;
  shadowIntensity?: WidgetShadowIntensity;
  glowIntensity?: WidgetGlowIntensity;
  animationIntensity?: WidgetAnimationIntensity;
  launcherPosition?: WidgetPosition;
  studioConfig?: WidgetStudioConfig;
  config_version?: number;
  config_timestamp?: string;
  engine_version?: string;
}

export function generateInitialQuickOptions(companyProfile?: CompanyProfile | null): string[] {
  if (!companyProfile) {
    return ['Explore Offerings', 'Request a Quote', 'Pricing & Rates', 'Something Else'];
  }
  if (isPortfolioDeployment(companyProfile)) {
    return getUniversalPortfolioQuickActions(companyProfile);
  }
  if (companyProfile.salesPlaybook?.intents) {
    const playbookOpts = companyProfile.salesPlaybook.intents
      .filter((i) => i && i.enabled && i.label && typeof i.label === 'string' && i.label.trim())
      .map((i) => i.label.trim());
    if (playbookOpts.length > 0) {
      return playbookOpts.slice(0, 4);
    }
  }
  if (Array.isArray(companyProfile.offerings) && companyProfile.offerings.length > 0) {
    const validOfferings = companyProfile.offerings
      .filter((o) => o && o.name && typeof o.name === 'string' && o.name.trim() !== '' && o.status !== 'UNAVAILABLE')
      .map((o) => o.name.trim());
    if (validOfferings.length > 0) {
      const opts = validOfferings.slice(0, 3);
      if (opts.length < 4) {
        opts.push('Pricing & Rates');
      }
      opts.push('Something Else');
      return Array.from(new Set(opts)).slice(0, 4);
    }
  }
  if (companyProfile.products && typeof companyProfile.products === 'string') {
    const prods = companyProfile.products
      .split(/[,;\n]/)
      .map((p) => p.replace(/—.*$/, '').replace(/-.*$/, '').replace(/\(.*?\)/g, '').trim())
      .filter((p) => p.length > 2 && p.length < 35 && !p.toLowerCase().includes('upcoming'));
    if (prods.length > 0) {
      const opts = prods.slice(0, 2);
      opts.push('Pricing & Rates');
      opts.push('Something Else');
      return Array.from(new Set(opts)).slice(0, 4);
    }
  }
  const dep = (companyProfile.deploymentType || 'BUSINESS').toString().toUpperCase();
  if (dep === 'PORTFOLIO') {
    return ['View Work & Projects', 'Discuss a Project', 'Rates & Availability', 'Something Else'];
  }
  if (dep === 'CREATOR_FREELANCER') {
    return ['Explore Services & Booking', 'Collaboration Inquiry', 'Packages & Pricing', 'Something Else'];
  }
  if (dep === 'STORE') {
    return ['Browse Catalog', 'Shipping & Returns', 'Product Details', 'Something Else'];
  }
  return ['Explore Offerings', 'Request a Quote', 'Pricing & Rates', 'Something Else'];
}

export const AI_WORKFORCE_OFFICIAL_PROFILE: CompanyProfile = {
  name: 'AI Workforce',
  industry: 'Conversational AI & Revenue Intelligence',
  businessType: 'services',
  tone: 'Consultative, precise, helpful, warm, and natural',
  businessRules:
    'Always answer customer questions first from Company Brain. Discover visitor requirements through natural dialogue. Never hallucinate unverified pricing or capabilities.',
  products:
    'ALPHA (Live) — Flagship conversational AI for sales discovery, product guidance, customer assistance, qualification, and opportunity intelligence.\nOMEGA (In Development) — AI research and account intelligence.\nPULSE (In Development) — Revenue and conversation intelligence.\nSIGMA (In Development) — Operations & workflow automation.',
  pricing:
    'Alpha is free for now with zero setup fees and full access to Company Brain grounding and 24/7 sales discovery.',
  locations: 'Global / Cloud-Native',
  website: 'https://aiworkforce.ai.studio',
  faqData:
    'Q: What is AI Workforce? A: AI Workforce powers conversational AI systems that work alongside your team, starting with our flagship product, Alpha.\nQ: What is Alpha? A: Alpha is our flagship conversational AI for sales discovery, product guidance, customer assistance, and qualification.\nQ: How does it work? A: Embed a lightweight script tag on your website in 2 minutes. Alpha is strictly grounded in your Company Brain.\nQ: How much does it cost? A: Alpha is free for now with zero setup fees.',
  additionalKnowledge:
    'AI Workforce believes humans stay in control while AI handles repetitive digital work and assists people in working better.',
  offerings: [
    {
      id: 'alpha-flagship',
      name: 'Alpha',
      description: 'Conversational AI for sales discovery, customer assistance, qualification, and opportunity intelligence',
      price: 'Free for now',
      status: 'LIVE',
    },
    {
      id: 'scout-intelligence',
      name: 'Omega',
      description: 'AI research and account intelligence',
      price: 'In Development',
      status: 'UPCOMING',
    },
    {
      id: 'pulse-revenue',
      name: 'Pulse',
      description: 'Revenue and conversation intelligence',
      price: 'In Development',
      status: 'UPCOMING',
    },
    {
      id: 'forge-operations',
      name: 'Sigma',
      description: 'Operations & workflow automation',
      price: 'In Development',
      status: 'UPCOMING',
    },
  ],
  differentiators: {
    whyChooseUs:
      'Conversational AI grounded in your verified Company Brain with unified sales + customer assistance and zero robotic interrogations.',
    productDifferences: 'Traditional chatbots are rigid scripts and forms; Alpha delivers natural, intelligent, human-like dialogue.',
  },
  commercialInfo: {
    pricingDetails: 'Alpha is free for now with zero setup fees.',
  },
  approval_mode: 'human_approval_required',
  unknownQuestionBehavior: 'human_approval',
};

const WIDGET_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_WIDGET_CACHE_ENTRIES = 500;
const widgetConfigCache = new Map<string, { config: PublicWidgetConfig; expiry: number }>();

export function applyStudioConfigToPublicWidget(
  baseConfig: PublicWidgetConfig,
  rawSource: any,
  fallbackThemeColor?: string
): PublicWidgetConfig {
  const mergedSource = {
    ...baseConfig,
    ...(typeof rawSource === 'object' && rawSource !== null ? rawSource : {}),
    ...(rawSource && typeof rawSource.studioConfig === 'object' ? rawSource.studioConfig : {}),
  };
  const studio = sanitizeWidgetStudioConfig(mergedSource, fallbackThemeColor || mergedSource.primaryColor || mergedSource.theme_color || baseConfig.theme_color);
  return {
    ...baseConfig,
    theme_color: studio.primaryColor,
    position: studio.launcherPosition,
    design_style: studio.mode,
    mode: studio.mode,
    launcherType: studio.launcherType,
    logoUrl: studio.logoUrl,
    primaryColor: studio.primaryColor,
    secondaryColor: studio.secondaryColor,
    backgroundColor: studio.backgroundColor,
    textColor: studio.textColor,
    aiMessageColor: studio.aiMessageColor,
    aiMessageTextColor: studio.aiMessageTextColor,
    userMessageColor: studio.userMessageColor,
    userMessageTextColor: studio.userMessageTextColor,
    gradientEnabled: studio.gradientEnabled,
    gradientType: studio.gradientType,
    gradientColor1: studio.gradientColor1,
    gradientColor2: studio.gradientColor2,
    gradientAngle: studio.gradientAngle,
    launcherSize: studio.launcherSize,
    launcherShape: studio.launcherShape,
    borderRadius: studio.borderRadius,
    shadowIntensity: studio.shadowIntensity,
    glowIntensity: studio.glowIntensity,
    animationIntensity: studio.animationIntensity,
    launcherPosition: studio.launcherPosition,
    studioConfig: studio,
  };
}

export function invalidateWidgetCache(widgetId: string) {
  if (widgetId) {
    widgetConfigCache.delete(widgetId);
    invalidateBrainCache(widgetId);
  }
}

export async function savePublicWidgetConfig(
  payload: Partial<PublicWidgetConfig> & { widget_id: string },
  options: { callerIsPlatformAdmin?: boolean } = {}
): Promise<PublicWidgetConfig> {
  const cleanWidgetId = payload.widget_id ? payload.widget_id.trim() : '';
  if (!cleanWidgetId) {
    throw new Error('widget_id is required');
  }

  if (isReservedOfficialWidgetId(cleanWidgetId) && !options.callerIsPlatformAdmin) {
    throw new Error(`Forbidden: Widget ID '${cleanWidgetId}' is reserved for the platform official assistant.`);
  }

  // Verify existing ownership fail-closed against cache + authoritative Firestore docs
  let existing: PublicWidgetConfig | null = null;
  const cachedEntry = widgetConfigCache.get(cleanWidgetId);
  if (cachedEntry && cachedEntry.expiry > Date.now()) {
    existing = cachedEntry.config;
  }

  let authoritativeOwnerId = existing?.user_id;

  if (hasAdminCredentials()) {
    const db = getAdminDb();
    const [pubSnap, lookupSnap] = await Promise.all([
      db.collection('public_widgets').doc(cleanWidgetId).get(),
      db.collection('widget_lookup').doc(cleanWidgetId).get(),
    ]);

    const pubOwner = pubSnap.exists ? pubSnap.data()?.user_id : undefined;
    const lookupOwner = lookupSnap.exists ? lookupSnap.data()?.user_id : undefined;
    authoritativeOwnerId = lookupOwner || pubOwner || authoritativeOwnerId;

    if (!existing && (pubSnap.exists || authoritativeOwnerId)) {
      existing = await resolvePublicWidget(cleanWidgetId);
    }
  }

  if (
    authoritativeOwnerId &&
    authoritativeOwnerId !== 'anonymous' &&
    authoritativeOwnerId !== 'default_user' &&
    (!payload.user_id || (payload.user_id !== authoritativeOwnerId && !options.callerIsPlatformAdmin))
  ) {
    throw new Error(`Unauthorized: Widget '${cleanWidgetId}' is owned by another tenant.`);
  }

  const resolvedOwnerId = payload.user_id || authoritativeOwnerId || existing?.user_id;
  const companyProfile = payload.company_profile || existing?.company_profile || undefined;
  const businessName =
    payload.business_name?.trim() ||
    companyProfile?.brandName?.trim() ||
    companyProfile?.name?.trim() ||
    existing?.business_name ||
    'My Business';

  const mergedPayload: Record<string, any> = { ...(existing || {}) };
  Object.keys(payload).forEach((key) => {
    const val = payload[key as keyof typeof payload];
    if (val !== undefined && val !== null) {
      mergedPayload[key] = val;
    }
  });

  const studio = sanitizeWidgetStudioConfig(
    {
      ...mergedPayload,
      ...(payload.studioConfig || {}),
      theme_color: payload.theme_color || payload.primaryColor || existing?.theme_color,
    },
    payload.theme_color || existing?.theme_color
  );

  const nextVersion = Math.max(1, (existing?.config_version || 0) + 1);
  const configTimestamp = new Date().toISOString();

  const updatedConfig: PublicWidgetConfig = {
    widget_id: cleanWidgetId,
    user_id: resolvedOwnerId,
    business_name: businessName,
    welcome_message: generateAlphaVisitorGreeting(companyProfile, payload.welcome_message || existing?.welcome_message),
    theme_color: studio.primaryColor,
    is_active:
      payload.is_active !== undefined
        ? Boolean(payload.is_active)
        : existing?.is_active !== undefined
        ? existing.is_active
        : true,
    position: studio.launcherPosition,
    company_profile: companyProfile,
    quick_options: generateInitialQuickOptions(companyProfile),
    design_style: studio.mode,
    config_version: nextVersion,
    config_timestamp: configTimestamp,
    mode: studio.mode,
    launcherType: studio.launcherType,
    logoUrl: studio.logoUrl,
    primaryColor: studio.primaryColor,
    secondaryColor: studio.secondaryColor,
    backgroundColor: studio.backgroundColor,
    textColor: studio.textColor,
    aiMessageColor: studio.aiMessageColor,
    aiMessageTextColor: studio.aiMessageTextColor,
    userMessageColor: studio.userMessageColor,
    userMessageTextColor: studio.userMessageTextColor,
    gradientEnabled: studio.gradientEnabled,
    gradientType: studio.gradientType,
    gradientColor1: studio.gradientColor1,
    gradientColor2: studio.gradientColor2,
    gradientAngle: studio.gradientAngle,
    launcherSize: studio.launcherSize,
    launcherShape: studio.launcherShape,
    borderRadius: studio.borderRadius,
    shadowIntensity: studio.shadowIntensity,
    glowIntensity: studio.glowIntensity,
    animationIntensity: studio.animationIntensity,
    launcherPosition: studio.launcherPosition,
    studioConfig: studio,
  };

  if (widgetConfigCache.size >= MAX_WIDGET_CACHE_ENTRIES) {
    const oldestKey = widgetConfigCache.keys().next().value;
    if (oldestKey) widgetConfigCache.delete(oldestKey);
  }
  widgetConfigCache.set(cleanWidgetId, {
    config: updatedConfig,
    expiry: Date.now() + WIDGET_CACHE_TTL_MS,
  });
  invalidateBrainCache(resolvedOwnerId || cleanWidgetId);

  if (hasAdminCredentials()) {
    const db = getAdminDb();
    const publicSafeDoc = stripPrivateFieldsFromWidget(
      {
        ...updatedConfig,
        widget_id: cleanWidgetId,
        created_at: (existing as any)?.created_at || configTimestamp,
        updated_at: configTimestamp,
      },
      { includeUserId: true }
    );

    // Overwrite public_widgets doc without private company_profile fields
    await db.collection('public_widgets').doc(cleanWidgetId).set(publicSafeDoc);

    await db.collection('widget_lookup').doc(cleanWidgetId).set(
      {
        widget_id: cleanWidgetId,
        user_id: resolvedOwnerId || null,
        updated_at: configTimestamp,
      },
      { merge: true }
    );

    if (resolvedOwnerId && resolvedOwnerId !== 'anonymous' && resolvedOwnerId !== 'default_user') {
      await db
        .collection('users')
        .doc(resolvedOwnerId)
        .collection('widget_config')
        .doc('default')
        .set(
          {
            ...updatedConfig,
            updated_at: configTimestamp,
          },
          { merge: true }
        );
    }
  }

  return updatedConfig;
}

export async function getUserWidgetConfig(userId: string): Promise<PublicWidgetConfig> {
  const cleanUserId = userId ? userId.trim() : '';
  if (!cleanUserId) {
    throw new Error('userId is required');
  }

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      const [widgetSnap, compSnap] = await Promise.all([
        db.collection('users').doc(cleanUserId).collection('widget_config').doc('default').get(),
        db.collection('users').doc(cleanUserId).collection('company_profile').doc('main').get(),
      ]);

      const compData = compSnap.exists ? (compSnap.data() as CompanyProfile) : undefined;

      if (widgetSnap.exists) {
        const data = widgetSnap.data();
        if (data) {
          const widgetId = data.widget_id || '';
          const profile = data.company_profile || compData;
          const base: PublicWidgetConfig = {
            widget_id: widgetId,
            user_id: cleanUserId,
            business_name: data.business_name || profile?.brandName || profile?.name || 'My Business',
            welcome_message: generateAlphaVisitorGreeting(profile, data.welcome_message),
            theme_color: data.theme_color || '#0f172a',
            is_active: data.is_active !== false,
            position: data.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
            design_style: data.design_style === 'simple' ? 'simple' : 'attractive_3d',
            company_profile: profile,
            quick_options: data.quick_options || generateInitialQuickOptions(profile),
          };
          return applyStudioConfigToPublicWidget(base, data);
        }
      }

      if (compData) {
        const base: PublicWidgetConfig = {
          widget_id: '',
          user_id: cleanUserId,
          business_name: compData.brandName || compData.name || 'My Business',
          welcome_message: generateAlphaVisitorGreeting(compData),
          theme_color: '#0f172a',
          is_active: true,
          position: 'bottom-right',
          design_style: 'attractive_3d',
          company_profile: compData,
          quick_options: generateInitialQuickOptions(compData),
        };
        return applyStudioConfigToPublicWidget(base, DEFAULT_WIDGET_STUDIO_CONFIG);
      }
    } catch (err: any) {
      if (err?.code !== 7 && !err?.message?.includes('PERMISSION_DENIED')) {
        console.warn('Error fetching user widget_config from Firestore:', err?.message || err);
      }
    }
  }

  return applyStudioConfigToPublicWidget(
    {
      widget_id: '',
      user_id: cleanUserId,
      business_name: 'My Business',
      welcome_message: generateAlphaVisitorGreeting(null),
      theme_color: '#0f172a',
      is_active: true,
      position: 'bottom-right',
      design_style: 'attractive_3d',
      quick_options: generateInitialQuickOptions(null),
    },
    DEFAULT_WIDGET_STUDIO_CONFIG
  );
}

export async function resolvePublicWidget(widgetId: string): Promise<PublicWidgetConfig | null> {
  const cleanWidgetId = typeof widgetId === 'string' ? widgetId.trim() : '';
  if (!cleanWidgetId) {
    return null;
  }

  if (isReservedOfficialWidgetId(cleanWidgetId)) {
    const base: PublicWidgetConfig = {
      widget_id: cleanWidgetId,
      business_name: 'AI Workforce',
      welcome_message: "Hey — I’m Alpha, AI Workforce’s Sales Manager. What can I help you with?",
      theme_color: '#0f172a',
      is_active: true,
      position: 'bottom-right',
      design_style: 'attractive_3d',
      company_profile: AI_WORKFORCE_OFFICIAL_PROFILE,
      user_id: PLATFORM_OFFICIAL_TENANT_ID,
      quick_options: generateInitialQuickOptions(AI_WORKFORCE_OFFICIAL_PROFILE),
    };

    const cached = widgetConfigCache.get(cleanWidgetId) || widgetConfigCache.get('official-ai-workforce');
    if (cached && Date.now() < cached.expiry) {
      const cfg = applyStudioConfigToPublicWidget(base, cached.config.studioConfig || cached.config);
      cfg.business_name = 'AI Workforce';
      cfg.user_id = PLATFORM_OFFICIAL_TENANT_ID;
      cfg.company_profile = AI_WORKFORCE_OFFICIAL_PROFILE;
      return cfg;
    }

    if (hasAdminCredentials()) {
      try {
        const snap = await getAdminDb().collection('public_widgets').doc(cleanWidgetId).get();
        if (snap.exists) {
          const d = snap.data();
          if (d) {
            const mergedBase = {
              ...base,
              welcome_message: d.welcome_message || base.welcome_message,
              theme_color: d.theme_color || d.primaryColor || base.theme_color,
              design_style: d.design_style || d.mode || base.design_style,
              is_active: d.is_active !== false,
            };
            const cfg = applyStudioConfigToPublicWidget(mergedBase, d.studioConfig || d);
            cfg.business_name = 'AI Workforce';
            cfg.user_id = PLATFORM_OFFICIAL_TENANT_ID;
            cfg.company_profile = AI_WORKFORCE_OFFICIAL_PROFILE;
            return cfg;
          }
        }
      } catch {}
    }

    return applyStudioConfigToPublicWidget(base, DEFAULT_WIDGET_STUDIO_CONFIG);
  }

  const cached = widgetConfigCache.get(cleanWidgetId);
  if (cached && cached.expiry > Date.now()) {
    return cached.config;
  }

  if (!hasAdminCredentials()) {
    return null;
  }

  try {
    const db = getAdminDb();
    const [pubSnap, lookupSnap, userWidgetSnap] = await Promise.all([
      db.collection('public_widgets').doc(cleanWidgetId).get(),
      db.collection('widget_lookup').doc(cleanWidgetId).get(),
      db.collection('users').doc(cleanWidgetId).collection('widget_config').doc('default').get(),
    ]);

    const data: any = pubSnap.exists ? pubSnap.data() : null;
    const lookupUserId: string | undefined = lookupSnap.exists ? lookupSnap.data()?.user_id : undefined;
    let wData: any = userWidgetSnap.exists ? userWidgetSnap.data() : null;

    const effectiveUserId: string | undefined =
      lookupUserId || data?.user_id || wData?.user_id || (userWidgetSnap.exists ? cleanWidgetId : undefined);

    if (!data && !wData && !effectiveUserId) {
      return null;
    }

    if (!wData && effectiveUserId) {
      const ownerWidgetSnap = await db
        .collection('users')
        .doc(effectiveUserId)
        .collection('widget_config')
        .doc('default')
        .get();
      if (ownerWidgetSnap.exists) {
        wData = ownerWidgetSnap.data();
      }
    }

    let profile: CompanyProfile | undefined = wData?.company_profile || data?.company_profile;
    if (effectiveUserId && effectiveUserId !== 'anonymous' && effectiveUserId !== 'default_user') {
      const ownerProfSnap = await db
        .collection('users')
        .doc(effectiveUserId)
        .collection('company_profile')
        .doc('main')
        .get();
      if (ownerProfSnap.exists) {
        const ownerProf = ownerProfSnap.data() as CompanyProfile;
        if (ownerProf && ownerProf.name && ownerProf.name !== 'My Business') {
          profile = ownerProf;
        } else if (!profile) {
          profile = ownerProf;
        }
      }
    }

    if (!data && !wData && !profile) {
      return null;
    }

  const rawBizName =
    (profile?.brandName && profile.brandName !== 'My Business' ? profile.brandName : '') ||
    (profile?.name && profile.name !== 'My Business' ? profile.name : '') ||
    (data?.business_name && data.business_name !== 'My Business' ? data.business_name : '') ||
    (wData?.business_name && wData.business_name !== 'My Business' ? wData.business_name : '') ||
    'Business Assistant';

  // Never allow non-official widgets to adopt official AI Workforce identity
  const bName =
    rawBizName === 'AI Workforce' && !isOfficialTenantId(effectiveUserId)
      ? 'Business Assistant'
      : rawBizName;

  const welcomeMsg = generateAlphaVisitorGreeting(
    profile || { name: bName },
    data?.welcome_message || wData?.welcome_message
  );

  const base: PublicWidgetConfig = {
    widget_id: cleanWidgetId,
    user_id: effectiveUserId || cleanWidgetId,
    business_name: bName,
    welcome_message: welcomeMsg,
    theme_color: data?.theme_color || wData?.theme_color || '#0f172a',
    is_active: data?.is_active !== false && wData?.is_active !== false,
    position: (data?.position || wData?.position) === 'bottom-left' ? 'bottom-left' : 'bottom-right',
    design_style: (data?.design_style || wData?.design_style) === 'simple' ? 'simple' : 'attractive_3d',
    company_profile: profile,
    config_version: data?.config_version || wData?.config_version || 1,
  };

  const resolvedConfig = applyStudioConfigToPublicWidget(base, wData || data || DEFAULT_WIDGET_STUDIO_CONFIG);
  resolvedConfig.quick_options = generateInitialQuickOptions(resolvedConfig.company_profile);

    if (widgetConfigCache.size >= MAX_WIDGET_CACHE_ENTRIES) {
      const oldestKey = widgetConfigCache.keys().next().value;
      if (oldestKey) widgetConfigCache.delete(oldestKey);
    }
    widgetConfigCache.set(cleanWidgetId, {
      config: resolvedConfig,
      expiry: Date.now() + WIDGET_CACHE_TTL_MS,
    });

    return resolvedConfig;
  } catch (err: any) {
    if (err?.code !== 7 && !String(err?.message || '').includes('PERMISSION_DENIED')) {
      console.warn('[WidgetHandler] resolvePublicWidget error:', err?.message || err);
    }
    return null;
  }
}

interface PreparedWidgetChatContext {
  earlyResponse?: any;
  widgetConfig?: PublicWidgetConfig;
  companyProfile?: CompanyProfile;
  effectiveUserId?: string;
  effectiveVisitorId?: string;
  conversationId?: string;
  clientMessageId?: string;
  isSimulation?: boolean;
  message?: string;
  customerName?: string;
  chatRequest?: any;
}

function sanitizeClientInitialHistory(
  rawHistory: any,
  allowedGreeting: string
): Array<{ sender: 'customer' | 'assistant' | 'system'; text: string; timestamp?: string }> {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter((m) => m && typeof m.text === 'string' && m.text.trim().length > 0)
    .filter((m) => {
      if (m.sender === 'customer') return true;
      if (m.sender === 'assistant') {
        return m.text.trim() === allowedGreeting.trim();
      }
      return false;
    })
    .map((m) => ({
      sender: m.sender === 'assistant' ? ('assistant' as const) : ('customer' as const),
      text: String(m.text).trim(),
      timestamp: m.timestamp,
    }));
}

async function prepareWidgetChatContext(body: any): Promise<PreparedWidgetChatContext> {
  const {
    widget_id,
    conversation_id,
    visitor_id,
    message,
    customer_name,
    message_history,
    existing_profile,
    environment,
  } = body || {};

  const fallbackConvId = conversation_id || `conv-${crypto.randomUUID()}`;
  const cleanWidgetId = typeof widget_id === 'string' ? widget_id.trim() : '';
  if (!cleanWidgetId) {
    return {
      earlyResponse: {
        reply: 'Widget ID is required.',
        conversation_id: fallbackConvId,
        db_confirmed: false,
        error_code: 'WIDGET_ID_REQUIRED',
      },
    };
  }

  const wantsSimulation =
    body?.environment === 'simulation' ||
    body?.is_simulated === true ||
    Boolean(body?.company_profile && typeof body.company_profile === 'object');

  if (wantsSimulation && body?._authorizedPreview !== true) {
    return {
      earlyResponse: {
        reply: 'Forbidden: Simulation preview and profile overrides require authenticated widget owner credentials.',
        conversation_id: fallbackConvId,
        db_confirmed: false,
        error_code: 'FORBIDDEN_SIMULATION',
      },
    };
  }

  const isSimulation = wantsSimulation && body?._authorizedPreview === true;

  let widgetConfig = await resolvePublicWidget(cleanWidgetId);
  if (!widgetConfig && isSimulation && body?._verifiedTenantUserId) {
    const ownerUid = String(body._verifiedTenantUserId);
    const previewProfile =
      body.company_profile && typeof body.company_profile === 'object' ? body.company_profile : undefined;
    const previewBizName = previewProfile?.brandName || previewProfile?.name || 'Business Assistant';
    widgetConfig = {
      widget_id: cleanWidgetId,
      user_id: ownerUid,
      business_name: previewBizName,
      welcome_message: generateAlphaVisitorGreeting(previewProfile),
      theme_color: '#0f172a',
      is_active: true,
      position: 'bottom-right',
      company_profile: previewProfile,
      config_version: 1,
    };
  }

  if (!widgetConfig) {
    return {
      earlyResponse: {
        reply: 'This widget could not be found or is no longer active.',
        conversation_id: fallbackConvId,
        db_confirmed: false,
        error_code: 'WIDGET_NOT_FOUND',
      },
    };
  }

  if (widgetConfig.is_active === false) {
    return {
      earlyResponse: {
        reply: 'This widget is currently inactive.',
        conversation_id: fallbackConvId,
        db_confirmed: false,
        error_code: 'WIDGET_INACTIVE',
      },
    };
  }

  const isOfficialAiWorkforceWidget =
    isReservedOfficialWidgetId(cleanWidgetId) || isOfficialTenantId(widgetConfig.user_id);

  const effectiveUserId = widgetConfig.user_id || cleanWidgetId;
  const effectiveVisitorId = visitor_id || `vis_${crypto.randomUUID()}`;
  const clientMessageId = body?.client_message_id || body?.message_id;
  const convId = fallbackConvId;
  const convKey = buildConversationMemoryKey(effectiveUserId, convId, isSimulation);

  // 1. Visitor ownership + Idempotency + Human Takeover checks (Production path)
  let authoritativeMessages: StoredConversationMessage[] | null = null;
  let firestoreConvData: any = null;

  if (!isSimulation && effectiveUserId && conversation_id) {
    const memConv = conversationMemoryStore.get(convKey);
    if (memConv?.visitor_id && visitor_id && memConv.visitor_id !== visitor_id) {
      return {
        earlyResponse: {
          reply: 'Forbidden: Conversation ownership mismatch.',
          conversation_id: convId,
          db_confirmed: false,
          error_code: 'UNAUTHORIZED_OWNERSHIP',
        },
      };
    }

    // 1a. Fast-path: In-memory idempotency cache (tenant + conv scoped)
    if (clientMessageId) {
      const idempKey = buildIdempotencyMemoryKey(effectiveUserId, convId, String(clientMessageId));
      const cachedIdempotent = idempotencyMemoryStore.get(idempKey);
      if (cachedIdempotent && Date.now() - cachedIdempotent.timestamp <= IDEMPOTENCY_MEMORY_TTL_MS) {
        const visitor_session_token = safeIssueVisitorSessionToken({
          tenant_id: effectiveUserId,
          widget_id: widgetConfig.widget_id,
          visitor_id: effectiveVisitorId,
          conversation_id: convId,
        });
        return {
          earlyResponse: {
            reply: cachedIdempotent.reply,
            conversation_id: cachedIdempotent.conversation_id,
            options: cachedIdempotent.options || [],
            sentiment: cachedIdempotent.sentiment,
            detected_intent: cachedIdempotent.detected_intent,
            escalated_to_care: cachedIdempotent.escalated_to_care,
            inquiry_registered: cachedIdempotent.inquiry_registered,
            inquiry_id: cachedIdempotent.inquiry_id,
            db_confirmed: Boolean(cachedIdempotent.db_confirmed),
            visitor_session_token,
            is_idempotent_retry: true,
          },
        };
      }
    }

    // 1b. Check in-memory conversation store
    if (memConv && Array.isArray(memConv.messages)) {
      authoritativeMessages = memConv.messages;
      if (clientMessageId) {
        const existingIdx = memConv.messages.findIndex(
          (m: any) => m.metadata?.client_message_id === clientMessageId
        );
        if (existingIdx !== -1 && existingIdx < memConv.messages.length - 1) {
          const storedReplyMsg = memConv.messages[existingIdx + 1];
          if (storedReplyMsg && storedReplyMsg.sender === 'assistant') {
            const visitor_session_token = safeIssueVisitorSessionToken({
              tenant_id: effectiveUserId,
              widget_id: widgetConfig.widget_id,
              visitor_id: effectiveVisitorId,
              conversation_id: convId,
            });
            return {
              earlyResponse: {
                reply: storedReplyMsg.text,
                conversation_id: convId,
                options: storedReplyMsg.options || [],
                sentiment: storedReplyMsg.sentiment,
                detected_intent: storedReplyMsg.detected_intent,
                escalated_to_care: storedReplyMsg.escalated_to_care,
                db_confirmed: Boolean(storedReplyMsg.metadata?.db_confirmed),
                visitor_session_token,
                is_idempotent_retry: true,
              },
            };
          }
        }
      }
    }

    // 1c. Check Firestore authoritative conversation doc
    if (hasAdminCredentials()) {
      try {
        const convDocRef = getAdminDb().collection('users').doc(effectiveUserId).collection('conversations').doc(convId);
        const convSnap = await convDocRef.get();
        if (convSnap.exists) {
          firestoreConvData = convSnap.data() || {};
          if (firestoreConvData.visitor_id && visitor_id && firestoreConvData.visitor_id !== visitor_id) {
            return {
              earlyResponse: {
                reply: 'Forbidden: Conversation belongs to another visitor.',
                conversation_id: convId,
                db_confirmed: false,
                error_code: 'UNAUTHORIZED_OWNERSHIP',
              },
            };
          }
          const messages = Array.isArray(firestoreConvData.messages) ? firestoreConvData.messages : [];
          if (!authoritativeMessages && messages.length > 0) {
            authoritativeMessages = messages;
          }
          if (clientMessageId) {
            const existingIdx = messages.findIndex((m: any) => m.metadata?.client_message_id === clientMessageId);
            if (existingIdx !== -1 && existingIdx < messages.length - 1) {
              const storedReplyMsg = messages[existingIdx + 1];
              if (storedReplyMsg && storedReplyMsg.sender === 'assistant') {
                const visitor_session_token = safeIssueVisitorSessionToken({
                  tenant_id: effectiveUserId,
                  widget_id: widgetConfig.widget_id,
                  visitor_id: effectiveVisitorId,
                  conversation_id: convId,
                });
                return {
                  earlyResponse: {
                    reply: storedReplyMsg.text,
                    conversation_id: convId,
                    options: storedReplyMsg.options || [],
                    sentiment: storedReplyMsg.sentiment,
                    detected_intent: storedReplyMsg.detected_intent,
                    escalated_to_care: storedReplyMsg.escalated_to_care,
                    db_confirmed: true,
                    visitor_session_token,
                    is_idempotent_retry: true,
                  },
                };
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.code !== 7 && !err?.message?.includes('PERMISSION_DENIED')) {
          console.warn('Idempotency check failed:', err);
        }
      }
    }

    // 2. Human-owned check (never bypassed in production)
    const isHumanOwned = memConv?.human_owned === true || firestoreConvData?.human_owned === true;
    if (isHumanOwned) {
      const nowIso = new Date().toISOString();
      const customerMsg: StoredConversationMessage = {
        message_id: `msg_${crypto.randomUUID()}`,
        sender: 'customer',
        text: message,
        timestamp: nowIso,
        metadata: { client_message_id: clientMessageId },
      };

      if (memConv) {
        memConv.messages.push(customerMsg);
        memConv.updated_at = nowIso;
        memConv.last_message_at = nowIso;
      } else {
        evictConversationMemoryStoreIfNeeded();
        conversationMemoryStore.set(convKey, {
          id: convId,
          conversation_id: convId,
          widget_id: widgetConfig.widget_id,
          visitor_id: effectiveVisitorId,
          tenant_id: effectiveUserId,
          customer_name: customer_name || 'Website Visitor',
          messages: [customerMsg],
          human_owned: true,
          created_at: nowIso,
          updated_at: nowIso,
          last_message_at: nowIso,
        });
      }

      let convDbConfirmed = false;
      if (hasAdminCredentials()) {
        try {
          const adminDb = getAdminDb();
          const convDocRef = adminDb.collection('users').doc(effectiveUserId).collection('conversations').doc(convId);
          await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(convDocRef);
            const existingMessages = snap.exists ? (snap.data()?.messages || []) : [];
            tx.set(
              convDocRef,
              {
                messages: [...existingMessages, customerMsg],
                last_message_at: nowIso,
                updated_at: nowIso,
              },
              { merge: true }
            );
          });
          convDbConfirmed = true;
        } catch (err: any) {
          if (err?.code !== 7 && !err?.message?.includes('PERMISSION_DENIED')) {
            console.warn('Warning updating human_owned state in Firestore:', err);
          }
        }
      }

      const visitor_session_token = safeIssueVisitorSessionToken({
        tenant_id: effectiveUserId,
        widget_id: widgetConfig.widget_id,
        visitor_id: effectiveVisitorId,
        conversation_id: convId,
      });

      return {
        earlyResponse: {
          reply: '',
          conversation_id: convId,
          human_owned: true,
          handoff_active: true,
          db_confirmed: convDbConfirmed,
          visitor_session_token,
        },
      };
    }
  } else if (isSimulation && conversation_id) {
    const simConv = conversationMemoryStore.get(convKey);
    if (simConv && Array.isArray(simConv.messages)) {
      authoritativeMessages = simConv.messages;
    }
  }

  let companyProfile: CompanyProfile | undefined = widgetConfig.company_profile
    ? { ...widgetConfig.company_profile }
    : undefined;

  if (isSimulation && body?.company_profile && typeof body.company_profile === 'object' && body.company_profile.name) {
    companyProfile = { ...body.company_profile };
  }

  if (!companyProfile || !companyProfile.name) {
    const fallbackBizName =
      widgetConfig?.business_name && (isOfficialAiWorkforceWidget || widgetConfig.business_name !== 'AI Workforce')
        ? widgetConfig.business_name
        : 'Business Assistant';
    companyProfile = {
      name: fallbackBizName,
      brandName: fallbackBizName,
      description: `Welcome to ${fallbackBizName}. I am Alpha, your AI assistant.`,
      whatYouDo: `I assist visitors by answering questions about ${fallbackBizName}, products, services, and commercial requirements.`,
      aiIdentity: 'Sales Assistant',
      aiTone: 'Professional',
      deploymentType: 'BUSINESS',
      inquiryFields: ['Name', 'Email', 'Requirement'],
      industry: 'General Business',
      products: 'Products & Services',
      locations: 'Worldwide',
      tone: 'Professional',
      businessRules: 'Helpful and accurate commercial assistance',
    };
  } else if (companyProfile.name === 'AI Workforce' && !isOfficialAiWorkforceWidget) {
    const fallbackBizName =
      widgetConfig?.business_name && widgetConfig.business_name !== 'AI Workforce'
        ? widgetConfig.business_name
        : 'Business Assistant';
    companyProfile = {
      ...companyProfile,
      name: fallbackBizName,
      brandName: fallbackBizName,
    };
  }

  delete (companyProfile as any)._tenantId;
  delete (companyProfile as any)._widgetId;
  delete (companyProfile as any)._isOfficialAiWorkforce;
  (companyProfile as any)._tenantId = effectiveUserId;
  (companyProfile as any)._widgetId = widgetConfig.widget_id;
  (companyProfile as any)._brainVersion = widgetConfig.config_version || 1;
  (companyProfile as any)._isOfficialAiWorkforce = isOfficialAiWorkforceWidget;

  const effectiveEnvironment = isSimulation ? 'simulation' : (environment || 'production');

  // Authoritative history resolution: existing conversations ignore client-supplied message_history
  const resolvedHistory = authoritativeMessages && authoritativeMessages.length > 0
    ? authoritativeMessages.map((m) => ({
        sender: m.sender === 'customer' ? ('customer' as const) : ('assistant' as const),
        text: m.text,
        timestamp: m.timestamp,
      }))
    : sanitizeClientInitialHistory(message_history, widgetConfig.welcome_message || '');

  return {
    widgetConfig,
    companyProfile,
    effectiveUserId,
    effectiveVisitorId,
    conversationId: convId,
    clientMessageId,
    isSimulation,
    message,
    customerName: customer_name || 'Website Visitor',
    chatRequest: {
      widget_id: widgetConfig.widget_id,
      conversation_id: convId,
      visitor_id: effectiveVisitorId,
      message,
      customer_name: customer_name || 'Website Visitor',
      message_history: resolvedHistory,
      company_profile: companyProfile,
      existing_profile,
      user_id: effectiveUserId,
      environment: effectiveEnvironment,
      thinkMode: body?.thinkMode || body?.think_mode || 'auto',
      request_id: body?.request_id,
    },
  };
}

async function finalizeAndPersistWidgetTurn(ctx: PreparedWidgetChatContext, chatResult: any) {
  const widgetConfig = ctx.widgetConfig!;
  const companyProfile = ctx.companyProfile!;
  const effectiveUserId = ctx.effectiveUserId!;
  const effectiveVisitorId = ctx.effectiveVisitorId!;
  const convId = chatResult.conversation_id || ctx.conversationId!;
  const isSimulation = Boolean(ctx.isSimulation);
  const message = ctx.message || '';
  const customerName = ctx.customerName || 'Website Visitor';
  const clientMessageId = ctx.clientMessageId;

  const nowIso = new Date().toISOString();
  const convKey = buildConversationMemoryKey(effectiveUserId, convId, isSimulation);

  const customerMsg: StoredConversationMessage = {
    message_id: `msg_${crypto.randomUUID()}`,
    sender: 'customer',
    text: message,
    timestamp: nowIso,
    metadata: { client_message_id: clientMessageId },
  };

  const assistantMsg: StoredConversationMessage = {
    message_id: `msg_${crypto.randomUUID()}`,
    sender: 'assistant',
    text: chatResult.reply,
    timestamp: nowIso,
    options: chatResult.options,
    sentiment: chatResult.sentiment,
    detected_intent: chatResult.detected_intent,
    escalated_to_care: chatResult.escalated_to_care,
    grounded: Boolean(chatResult.grounded_in_brain),
    grounding_source: companyProfile?.name || 'Company Brain',
    metadata: {
      inquiry_registered: chatResult.inquiry_registered,
      published: true,
      delivered: true,
      read: true,
    },
  };

  // Update scoped in-memory conversation store (simulation uses sim:: namespace, production uses tenant:: namespace)
  const memConv = conversationMemoryStore.get(convKey);
  if (memConv) {
    const alreadyHasClientMsg = clientMessageId && memConv.messages.some(
      (m) => m.metadata?.client_message_id === clientMessageId
    );
    if (!alreadyHasClientMsg) {
      memConv.messages.push(customerMsg, assistantMsg);
      memConv.updated_at = nowIso;
      memConv.last_message_at = nowIso;
    }
  } else {
    evictConversationMemoryStoreIfNeeded();
    conversationMemoryStore.set(convKey, {
      id: convId,
      conversation_id: convId,
      widget_id: widgetConfig.widget_id,
      visitor_id: effectiveVisitorId,
      tenant_id: effectiveUserId,
      customer_name: customerName,
      messages: [customerMsg, assistantMsg],
      created_at: nowIso,
      updated_at: nowIso,
      last_message_at: nowIso,
    });
  }

  // Simulation mode NEVER touches production Firestore collections (conversations, inquiries, handoffs)
  if (isSimulation) {
    return {
      ...chatResult,
      db_confirmed: false,
      is_simulated: true,
    };
  }

  // Persist Inquiry if needed and not already persisted by chatHandler
  const normalized = validateAndNormalizeInquiryFields(
    {
      customer_name: chatResult.structured_profile?.customer_name || customerName,
      company_name: chatResult.structured_profile?.company,
      product_or_service: chatResult.structured_profile?.product_or_service,
      quantity: chatResult.structured_profile?.quantity_or_scope,
      requirement_or_description: message,
      budget: chatResult.structured_profile?.budget,
      timeline: chatResult.structured_profile?.timeline,
      location: chatResult.structured_profile?.location,
      contact_info: chatResult.structured_profile?.contact_info,
      requirements: chatResult.lead_data?.requirements,
    },
    companyProfile
  );

  const intentType = classifyVisitorIntent(message, chatResult.detected_intent);
  const shouldRegister = !chatResult.inquiry_id && shouldRegisterEnquiry(intentType, Boolean(normalized.contact_info));
  let inquiryDbConfirmed = !shouldRegister || Boolean(chatResult.db_confirmed);

  if (shouldRegister) {
    const enquiry = normalizeEnquiry({
      tenant_id: effectiveUserId,
      widget_id: widgetConfig.widget_id,
      conversation_id: convId,
      visitor_id: effectiveVisitorId,
      original_message: message,
      intent_type: intentType,
      extracted: normalized,
      lead_score: chatResult.is_hot_lead ? 'HOT' : 'WARM',
    });
    const persistRes = await persistCanonicalEnquiry(enquiry);
    inquiryDbConfirmed = Boolean(persistRes.success && persistRes.db_confirmed);
    chatResult.inquiry_registered = inquiryDbConfirmed;
    chatResult.inquiry_id = persistRes.inquiry_id || enquiry.inquiry_id;
  }

  let handoffId: string | undefined;
  let handoffPersisted: boolean | undefined;
  if (chatResult.escalated_to_care) {
    const rawProfile: any = widgetConfig.company_profile || companyProfile || {};
    const notifyEmail =
      rawProfile?.humanEscalation?.recipientEmail ||
      rawProfile?.humanHandoff?.escalationEmail ||
      rawProfile?.businessEmail ||
      null;

    const handoffRes = await createDurableHandoff({
      tenant_id: effectiveUserId,
      conversation_id: convId,
      enquiry_id: chatResult.inquiry_id || null,
      visitor_id: effectiveVisitorId,
      reason: 'Visitor requested human assistance.',
      requested_by: 'visitor',
      customer_contact: {
        name: normalized.customer_name || customerName,
        email: normalized.email || normalized.contact_info || null,
        phone: normalized.phone || null,
      },
      notify_email: notifyEmail,
      tenant_brand_name: companyProfile.name,
    });
    handoffId = handoffRes.handoff?.handoff_id;
    handoffPersisted = Boolean(handoffRes.success && handoffRes.db_confirmed);
  }

  let convDbConfirmed = false;
  if (hasAdminCredentials()) {
    try {
      const adminDb = getAdminDb();
      const convDocRef = adminDb.collection('users').doc(effectiveUserId).collection('conversations').doc(convId);
      await adminDb.runTransaction(async (transaction) => {
        const convSnap = await transaction.get(convDocRef);
        const existingMessages = convSnap.exists ? (convSnap.data()?.messages || []) : [];

        if (clientMessageId && existingMessages.some((m: any) => m.metadata?.client_message_id === clientMessageId)) {
          return;
        }

        const updatedMessages = [...existingMessages, customerMsg, assistantMsg];

        transaction.set(
          convDocRef,
          {
            id: convId,
            conversation_id: convId,
            widget_id: widgetConfig.widget_id,
            visitor_id: effectiveVisitorId,
            customer_name: customerName,
            messages: updatedMessages,
            updated_at: nowIso,
          },
          { merge: true }
        );
      });
      convDbConfirmed = true;
    } catch (err: any) {
      if (err?.code !== 7 && !err?.message?.includes('PERMISSION_DENIED')) {
        console.warn('Warning during chat data handling in Firestore:', err);
      }
      convDbConfirmed = false;
    }
  }

  const finalDbConfirmed = convDbConfirmed && (!shouldRegister || inquiryDbConfirmed);
  assistantMsg.metadata = {
    ...(assistantMsg.metadata || {}),
    db_confirmed: finalDbConfirmed,
    inquiry_registered: Boolean(chatResult.inquiry_registered),
  };

  if (clientMessageId) {
    evictIdempotencyMemoryStoreIfNeeded();
    const idempKey = buildIdempotencyMemoryKey(effectiveUserId, convId, String(clientMessageId));
    idempotencyMemoryStore.set(idempKey, {
      reply: chatResult.reply,
      conversation_id: convId,
      options: chatResult.options || [],
      sentiment: chatResult.sentiment,
      detected_intent: chatResult.detected_intent,
      escalated_to_care: chatResult.escalated_to_care,
      inquiry_registered: Boolean(chatResult.inquiry_registered),
      inquiry_id: chatResult.inquiry_id,
      db_confirmed: finalDbConfirmed,
      timestamp: Date.now(),
    });
  }

  const visitor_session_token = safeIssueVisitorSessionToken({
    tenant_id: effectiveUserId,
    widget_id: widgetConfig.widget_id,
    visitor_id: effectiveVisitorId,
    conversation_id: convId,
  });

  return {
    ...chatResult,
    db_confirmed: finalDbConfirmed,
    ...(handoffId ? { handoff_id: handoffId, handoff_persisted: handoffPersisted } : {}),
    visitor_session_token,
  };
}

export async function handleWidgetChat(body: any) {
  const ctx = await prepareWidgetChatContext(body);
  if (ctx.earlyResponse) {
    return ctx.earlyResponse;
  }

  const chatResult = await processWebsiteChatMessage(ctx.chatRequest);
  if (chatResult.timing_metrics && body && typeof body === 'object') {
    body.timing_metrics = chatResult.timing_metrics;
  }

  return finalizeAndPersistWidgetTurn(ctx, chatResult);
}

export async function* handleWidgetChatStream(body: any, abortSignal?: AbortSignal): AsyncGenerator<any> {
  const ctx = await prepareWidgetChatContext(body);
  if (ctx.earlyResponse) {
    if (ctx.earlyResponse.reply) {
      yield { type: 'chunk', text: ctx.earlyResponse.reply };
    }
    yield { type: 'metadata', data: ctx.earlyResponse };
    return;
  }

  let finalMetadata: any = null;
  let streamedReply = '';

  for await (const s of processWebsiteChatMessageStream(ctx.chatRequest)) {
    if (abortSignal?.aborted) {
      return;
    }
    if (s.chunk) {
      streamedReply += s.chunk;
      yield { type: 'chunk', text: s.chunk };
    }
    if (s.metadata) {
      finalMetadata = s.metadata;
    }
  }

  if (abortSignal?.aborted) {
    return;
  }

  if (!finalMetadata) {
    // Fallback if stream yielded no final metadata event
    finalMetadata = {
      reply: streamedReply,
      conversation_id: ctx.conversationId,
      is_sales_lead: false,
      detected_intent: 'GENERAL_QUESTION',
      inquiry_registered: false,
      registration_attempted: false,
      grounded_in_brain: false,
    };
  }

  if (finalMetadata.timing_metrics && body && typeof body === 'object') {
    body.timing_metrics = finalMetadata.timing_metrics;
  }

  const finalized = await finalizeAndPersistWidgetTurn(ctx, finalMetadata);
  yield { type: 'metadata', data: finalized };
}

