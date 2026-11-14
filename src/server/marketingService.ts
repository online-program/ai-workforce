import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';

dotenv.config();
import {
  MarketingBrainData,
  MarketingResearchItem,
  MarketingContentItem,
  PublishingConnection,
  PublishingSettings,
  MarketingAnalyticsMetric,
  MarketingLearningInsight,
  ContentPlatform,
  ContentFormat,
  ContentItemStatus,
} from '../types.ts';
import {
  defaultMarketingBrain,
  defaultResearchItems,
  defaultContentItems,
  defaultPublishingConnections,
  defaultPublishingSettings,
  defaultLearningInsights,
} from '../data/defaultMarketingData.ts';

// In-memory caching layer for admin responses + Admin Firestore backup
let cachedBrain: MarketingBrainData = { ...defaultMarketingBrain };
let cachedResearch: MarketingResearchItem[] = [...defaultResearchItems];
let cachedContent: MarketingContentItem[] = [...defaultContentItems];
let cachedConnections: PublishingConnection[] = [...defaultPublishingConnections];
let cachedSettings: PublishingSettings = { ...defaultPublishingSettings };
let cachedAuditLogs: Array<{
  id: string;
  action: string;
  actorEmail: string;
  actorRole?: string;
  actorUid: string;
  targetId?: string;
  platform?: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details: string;
  timestamp: string;
}> = [];

let isInitialized = false;

// Initialize & hydrate from Admin Firestore
export async function initializeMarketingStore(): Promise<void> {
  if (isInitialized) return;
  if (!hasAdminCredentials()) {
    isInitialized = true;
    return;
  }
  try {
    const db = getAdminDb();

    // 1. Hydrate Brain
    const brainDocRef = db.collection('marketing_brain').doc('ai_workforce_brain');
    const brainSnap = await brainDocRef.get().catch(() => null);
    if (brainSnap && brainSnap.exists) {
      cachedBrain = brainSnap.data() as MarketingBrainData;
    } else {
      await brainDocRef.set(defaultMarketingBrain).catch(() => {});
    }

    // 2. Hydrate Research
    const researchSnap = await db.collection('marketing_research').get().catch(() => null);
    if (researchSnap && !researchSnap.empty) {
      const items: MarketingResearchItem[] = [];
      researchSnap.forEach((d) => items.push({ id: d.id, ...(d.data() as any) }));
      if (items.length > 0) cachedResearch = items;
    }

    // 3. Hydrate Content items
    const contentSnap = await db.collection('marketing_content').get().catch(() => null);
    if (contentSnap && !contentSnap.empty) {
      const items: MarketingContentItem[] = [];
      contentSnap.forEach((d) => items.push({ id: d.id, ...(d.data() as any) }));
      if (items.length > 0) cachedContent = items;
    }

    // 4. Hydrate Publishing Settings
    const settingsSnap = await db.collection('marketing_settings').doc('publishing').get().catch(() => null);
    if (settingsSnap && settingsSnap.exists) {
      cachedSettings = settingsSnap.data() as PublishingSettings;
    }

    isInitialized = true;
    console.log('Marketing Co-Founder store successfully initialized.');
  } catch (err) {
    console.warn('Marketing Co-Founder store hydration notice:', err);
    isInitialized = true;
  }
}

async function ensureReady() {
  if (!isInitialized) {
    await initializeMarketingStore();
  }
}

export async function logMarketingAudit(entry: {
  action: string;
  actorEmail: string;
  actorRole?: string;
  actorUid: string;
  targetId?: string;
  platform?: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details: string;
}) {
  const record = {
    id: `mkt-aud-${crypto.randomUUID()}`,
    ...entry,
    timestamp: new Date().toISOString(),
  };

  cachedAuditLogs.unshift(record);
  if (cachedAuditLogs.length > 300) cachedAuditLogs.pop();

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_audit_logs').doc(record.id).set(record).catch(() => {});
    } catch (e) {
      console.warn('Failed to persist marketing audit log:', e);
    }
  }
}

// ==========================================
// 1. MARKETING BRAIN SERVICE
// ==========================================

export async function getMarketingBrain(): Promise<MarketingBrainData> {
  await ensureReady();
  return cachedBrain;
}

export async function updateMarketingBrain(
  data: Partial<MarketingBrainData>,
  actor: { email: string; uid: string; role?: string }
): Promise<MarketingBrainData> {
  await ensureReady();

  cachedBrain = {
    ...cachedBrain,
    ...data,
    brand: { ...cachedBrain.brand, ...(data.brand || {}) },
    targetAudience: { ...cachedBrain.targetAudience, ...(data.targetAudience || {}) },
    contentStrategy: { ...cachedBrain.contentStrategy, ...(data.contentStrategy || {}) },
    brandRules: { ...cachedBrain.brandRules, ...(data.brandRules || {}) },
    offerInfo: { ...cachedBrain.offerInfo, ...(data.offerInfo || {}) },
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email,
  };

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_brain').doc('ai_workforce_brain').set(cachedBrain).catch(() => {});
    } catch (e) {
      console.warn('Failed to persist marketing brain:', e);
    }
  }

  await logMarketingAudit({
    action: 'UPDATE_MARKETING_BRAIN',
    actorEmail: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    status: 'SUCCESS',
    details: `Updated Marketing Brain configurations (brand, audience, rules, or strategy).`,
  });

  return cachedBrain;
}

// ==========================================
// 2. RESEARCH ENGINE SERVICE (GEMINI BACKED)
// ==========================================

export async function getResearchItems(): Promise<MarketingResearchItem[]> {
  await ensureReady();
  return cachedResearch;
}

export async function runOpportunityResearch(params: {
  topic?: string;
  focusArea?: string;
  actor: { email: string; uid: string; role?: string };
}): Promise<MarketingResearchItem[]> {
  await ensureReady();

  const apiKey = process.env.GEMINI_API_KEY;
  const brain = cachedBrain;

  const systemInstruction = `You are the internal AI Marketing Co-Founder for "AI Workforce".
AI Workforce builds autonomous digital employees (starting with the flagship Alpha conversational AI).
Your mission is to uncover high-conviction marketing opportunities, market conversations, B2B SaaS pain points, and buyer triggers for AI Workforce.

CORE BRAIN RULES:
1. NEVER invent fake statistics, fake customers, or unverified claims.
2. Ground all insights in real B2B software, sales speed-to-lead realities, and enterprise AI trends.
3. Align strictly with AI Workforce positioning: "${brain.brand.brandPositioning}".
4. Each research item must produce an actionable content opportunity for our team.`;

  const prompt = `Conduct strategic marketing research for AI Workforce.
Focus Area: ${params.focusArea || 'B2B Inbound Sales Decay, Speed-to-Lead, Enterprise AI Digital Employees, Chatbot Replacement'}
Specific Topic / Direction: ${params.topic || 'General B2B Inbound & AI Workforce Market Opportunities'}

Generate 3-4 structured research opportunities that our content team can turn directly into high-impact campaigns across LinkedIn, X, YouTube, and Instagram.`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const genConfig = {
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING, description: 'Clear topic or trend title' },
                whyItMatters: { type: Type.STRING, description: 'Why this matters with rationale and real-world implications' },
                targetAudience: { type: Type.STRING, description: 'Specific ICP or buyer persona' },
                contentOpportunity: { type: Type.STRING, description: 'Actionable angle for AI Workforce content' },
                suggestedPlatform: {
                  type: Type.STRING,
                  enum: ['instagram', 'youtube', 'linkedin', 'x', 'multi-platform'],
                  description: 'Best distribution platform',
                },
                suggestedFormat: {
                  type: Type.STRING,
                  enum: ['carousel', 'image_post', 'short_video', 'youtube_video', 'youtube_short', 'text_post', 'educational_post', 'founder_post', 'announcement'],
                  description: 'Best content format',
                },
                source: { type: Type.STRING, description: 'Factual source domain or industry benchmark' },
                citations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of relevant citations or benchmark reports',
                },
              },
              required: ['topic', 'whyItMatters', 'targetAudience', 'contentOpportunity', 'suggestedPlatform', 'suggestedFormat', 'source'],
            },
          },
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({ model: 'gemini-3.1-flash-lite', ...genConfig });
      } catch (e) {
        response = await ai.models.generateContent({ model: 'gemini-flash-latest', ...genConfig });
      }

      if (response.text) {
        const parsed = JSON.parse(response.text.trim()) as any[];
        const newItems: MarketingResearchItem[] = parsed.map((item) => ({
          id: `res-${crypto.randomUUID()}`,
          topic: item.topic,
          whyItMatters: item.whyItMatters,
          targetAudience: item.targetAudience,
          contentOpportunity: item.contentOpportunity,
          suggestedPlatform: item.suggestedPlatform || 'linkedin',
          suggestedFormat: item.suggestedFormat || 'carousel',
          source: item.source || 'AI Workforce Market Intelligence',
          citations: item.citations || [],
          status: 'NEW',
          createdAt: new Date().toISOString(),
          createdBy: 'AI Marketing Co-Founder',
        }));

        for (const item of newItems) {
          cachedResearch.unshift(item);
          if (hasAdminCredentials()) {
            try {
              await getAdminDb().collection('marketing_research').doc(item.id).set(item).catch(() => {});
            } catch {}
          }
        }

        await logMarketingAudit({
          action: 'RUN_OPPORTUNITY_RESEARCH',
          actorEmail: params.actor.email,
          actorUid: params.actor.uid,
          actorRole: params.actor.role,
          status: 'SUCCESS',
          details: `Generated ${newItems.length} new marketing research opportunities via Gemini.`,
        });

        return cachedResearch;
      }
    } catch (err) {
      console.warn('Gemini research generation notice:', err);
    }
  }

  // Deterministic fallback if API unavailable or throttled
  const fallbackItem: MarketingResearchItem = {
    id: `res-${Date.now()}-fallback`,
    topic: params.topic || 'Sub-Minute Inbound Lead Response in Enterprise SaaS',
    whyItMatters: 'Lead qualification probability drops by 10x when response time exceeds 10 minutes according to industry benchmarks.',
    targetAudience: 'B2B Sales Leaders and Revenue Operations',
    contentOpportunity: 'Position Alpha as the 24/7 revenue frontline that guarantees zero lead decay.',
    suggestedPlatform: 'linkedin',
    suggestedFormat: 'carousel',
    source: 'Verified B2B Lead Conversion Benchmarks',
    citations: ['InsideSales Response Speed Study', 'Harvard Business Review: Response Time Impact'],
    status: 'NEW',
    createdAt: new Date().toISOString(),
    createdBy: 'AI Marketing Co-Founder',
  };

  cachedResearch.unshift(fallbackItem);
  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_research').doc(fallbackItem.id).set(fallbackItem).catch(() => {});
    } catch {}
  }

  await logMarketingAudit({
    action: 'RUN_OPPORTUNITY_RESEARCH',
    actorEmail: params.actor.email,
    actorUid: params.actor.uid,
    actorRole: params.actor.role,
    status: 'SUCCESS',
    details: `Added new research item '${fallbackItem.topic}' to queue.`,
  });

  return cachedResearch;
}

export async function deleteResearchItem(id: string, actor: { email: string; uid: string; role?: string }) {
  await ensureReady();
  cachedResearch = cachedResearch.filter((item) => item.id !== id);
  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_research').doc(id).delete().catch(() => {});
    } catch {}
  }

  await logMarketingAudit({
    action: 'DELETE_RESEARCH_ITEM',
    actorEmail: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: id,
    status: 'SUCCESS',
    details: `Deleted research item ${id}`,
  });

  return cachedResearch;
}

// ==========================================
// 3. CONTENT STUDIO SERVICE (GEMINI BACKED)
// ==========================================

export async function getContentItems(): Promise<MarketingContentItem[]> {
  await ensureReady();
  return cachedContent;
}

export interface GenerateContentInput {
  platform: ContentPlatform;
  format: ContentFormat;
  topic?: string;
  objective?: string;
  customInstructions?: string;
  researchItemId?: string;
  actor: { email: string; uid: string; role?: string };
}

export async function generateContentInStudio(input: GenerateContentInput): Promise<MarketingContentItem> {
  await ensureReady();

  const apiKey = process.env.GEMINI_API_KEY;
  const brain = cachedBrain;

  let researchContext = '';
  if (input.researchItemId) {
    const matched = cachedResearch.find((r) => r.id === input.researchItemId);
    if (matched) {
      researchContext = `\nRESEARCH INSIGHT TO GROUND CONTENT:\n- Topic: ${matched.topic}\n- Why It Matters: ${matched.whyItMatters}\n- Content Opportunity: ${matched.contentOpportunity}\n- Source: ${matched.source}`;
    }
  }

  const systemInstruction = `You are the expert internal AI Marketing Co-Founder for AI Workforce.
AI Workforce provides autonomous digital employees for modern enterprises (flagship: Alpha).

BRAND GUIDELINES TO RESPECT:
- Brand Voice: ${brain.brand.brandVoice}
- Visual Identity: ${brain.brand.visualIdentity}
- Approved Terminology: ${brain.brand.approvedTerminology.join(', ')}
- Approved Claims: ${brain.brandRules.approvedClaims.join(' | ')}
- Prohibited Claims: ${brain.brandRules.prohibitedClaims.join(' | ')}
- Phrases to Avoid: ${brain.brandRules.phrasesToAvoid.join(', ')}

PLATFORM BEST PRACTICES:
- LinkedIn: High-signal, executive, mathematical, clean paragraph breaks, minimal relevant hashtags (3-5).
- X (Twitter): High-conviction hooks, punchy structure, zero filler, sharp takeaways.
- YouTube / YouTube Shorts: High-retention narrative hooks, clear structural timestamps, practical engineering demonstrations, concise visual cues.
- Instagram: Clean carousel slide breakdowns, high-contrast typography, compelling captions.

OUTPUT REQUIREMENTS:
Produce a complete, production-ready marketing asset tailored strictly for the chosen platform (${input.platform}) and format (${input.format}).
Never generate vague fluff. Everything must be direct, impactful, and ready for CEO/executive approval.`;

  const prompt = `Create a platform-native marketing asset for AI Workforce.
Target Platform: ${input.platform.toUpperCase()}
Content Format: ${input.format}
Topic: ${input.topic || 'Speed-to-Lead: Why Autonomous Alpha Outperforms Manual Triage'}
Campaign Objective: ${input.objective || 'Educate B2B founders on deterministic AI qualification and drive inbound platform trials'}
Additional Instructions: ${input.customInstructions || 'None'}
${researchContext}`;

  let generatedResult: Partial<MarketingContentItem> = {
    title: input.topic || 'The Speed-to-Lead Equation for Modern B2B',
    hook: 'If a high-intent enterprise prospect reaches out at 8 PM, who answers?',
    headline: 'Autonomous Inbound Qualification for Enterprise Revenue',
    bodyScript: `Every minute a qualified buyer waits for a reply reduces conversion odds.\n\nTraditional sales teams cannot maintain 24/7 sub-minute response times without massive overhead. Generic chatbots hallucinate and alienate buyers.\n\nAI Workforce deploys autonomous digital employees with deterministic guardrails—instantly qualifying inquiries, verifying requirements, and drafting exact replies for your team to approve.`,
    cta: 'Explore how AI Workforce powers 24/7 revenue teams at aiworkforce.com',
    caption: 'Why 24/7 autonomous speed-to-lead is becoming the standard for modern commercial organizations.',
    hashtags: ['B2BSaaS', 'RevenueOps', 'AIWorkforce', 'EnterpriseAI'],
    visualDirection: 'Minimalist obsidian canvas with clean typography and mathematical data flow diagrams.',
    creativePrompt: 'High-contrast monochrome technical dashboard showing inbound inquiry routing to verified Company Brain.',
  };

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const genConfig = {
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Internal descriptive working title' },
              hook: { type: Type.STRING, description: 'High-converting opening hook / scroll-stopper' },
              headline: { type: Type.STRING, description: 'Primary headline or slide 1 title' },
              bodyScript: { type: Type.STRING, description: 'Full body copy, slide breakdown, or video script' },
              cta: { type: Type.STRING, description: 'Clear, compelling call to action' },
              caption: { type: Type.STRING, description: 'Platform caption with spacing' },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Relevant hashtags (without hash prefix or with, will be cleaned)',
              },
              visualDirection: { type: Type.STRING, description: 'Clear art direction for designers or video editors' },
              creativePrompt: { type: Type.STRING, description: 'Prompt for image generation or visual asset synthesis' },
              description: { type: Type.STRING, description: 'Optional long-form YouTube description if video format' },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Video search tags if video format',
              },
            },
            required: ['title', 'hook', 'headline', 'bodyScript', 'cta', 'caption', 'hashtags', 'visualDirection', 'creativePrompt'],
          },
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({ model: 'gemini-3.1-flash-lite', ...genConfig });
      } catch (e) {
        response = await ai.models.generateContent({ model: 'gemini-flash-latest', ...genConfig });
      }

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        generatedResult = {
          ...generatedResult,
          ...parsed,
          hashtags: Array.isArray(parsed.hashtags)
            ? parsed.hashtags.map((h: string) => h.replace(/^#/, ''))
            : ['AIWorkforce', 'B2BSaaS'],
        };
      }
    } catch (err) {
      console.warn('Gemini content studio generation notice:', err);
    }
  }

  const newItem: MarketingContentItem = {
    id: `cnt-${crypto.randomUUID()}`,
    title: generatedResult.title || 'Untitled Marketing Asset',
    platform: input.platform,
    format: input.format,
    status: 'DRAFT',
    hook: generatedResult.hook || '',
    headline: generatedResult.headline || '',
    bodyScript: generatedResult.bodyScript || '',
    cta: generatedResult.cta || '',
    caption: generatedResult.caption || '',
    hashtags: generatedResult.hashtags || ['AIWorkforce'],
    visualDirection: generatedResult.visualDirection || '',
    creativePrompt: generatedResult.creativePrompt || '',
    description: generatedResult.description || '',
    tags: generatedResult.tags || [],
    createdBy: 'AI Marketing Co-Founder',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedContent.unshift(newItem);
  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_content').doc(newItem.id).set(newItem).catch(() => {});
    } catch {}
  }

  await logMarketingAudit({
    action: 'GENERATE_CONTENT_STUDIO',
    actorEmail: input.actor.email,
    actorUid: input.actor.uid,
    actorRole: input.actor.role,
    targetId: newItem.id,
    platform: input.platform,
    status: 'SUCCESS',
    details: `Generated new ${input.format} asset for ${input.platform.toUpperCase()}: '${newItem.title}'`,
  });

  return newItem;
}

export async function updateContentItem(
  id: string,
  updates: Partial<MarketingContentItem>,
  actor: { email: string; uid: string; role?: string }
): Promise<MarketingContentItem> {
  await ensureReady();

  const idx = cachedContent.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error(`Content item with ID ${id} not found.`);
  }

  const existing = cachedContent[idx];
  const updatedItem: MarketingContentItem = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  cachedContent[idx] = updatedItem;
  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_content').doc(id).set(updatedItem).catch(() => {});
    } catch {}
  }

  await logMarketingAudit({
    action: 'UPDATE_CONTENT_ITEM',
    actorEmail: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: id,
    platform: updatedItem.platform,
    status: 'SUCCESS',
    details: `Updated content item '${updatedItem.title}' (Status: ${updatedItem.status})`,
  });

  return updatedItem;
}

export async function changeContentStatus(
  id: string,
  newStatus: ContentItemStatus,
  actor: { email: string; uid: string; role?: string },
  notes?: string
): Promise<MarketingContentItem> {
  const updates: Partial<MarketingContentItem> = {
    status: newStatus,
    reviewNotes: notes,
  };

  if (newStatus === 'APPROVED') {
    updates.approvedBy = `${actor.role || 'Admin'} (${actor.email})`;
  } else if (newStatus === 'CANCELLED' || newStatus === 'FAILED') {
    updates.rejectedBy = `${actor.role || 'Admin'} (${actor.email})`;
  }

  return updateContentItem(id, updates, actor);
}

export async function deleteContentItem(id: string, actor: { email: string; uid: string; role?: string }) {
  await ensureReady();
  cachedContent = cachedContent.filter((c) => c.id !== id);
  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_content').doc(id).delete().catch(() => {});
    } catch {}
  }

  await logMarketingAudit({
    action: 'DELETE_CONTENT_ITEM',
    actorEmail: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: id,
    status: 'SUCCESS',
    details: `Deleted content item ${id}`,
  });

  return cachedContent;
}

// ==========================================
// 4. PUBLISHING PROVIDER ABSTRACTION & ACTIONS
// ==========================================

export interface PublishingResult {
  success: boolean;
  platform: ContentPlatform;
  postId?: string;
  postUrl?: string;
  status: 'PUBLISHED' | 'SCHEDULED' | 'FAILED' | 'CONFIG_REQUIRED';
  message: string;
}

// Universal Publishing Provider Interface
export interface PublishingProvider {
  platform: ContentPlatform;
  getConnectionStatus(): Promise<PublishingConnection>;
  connect(credentials: any): Promise<{ success: boolean; message: string }>;
  disconnect(): Promise<{ success: boolean; message: string }>;
  publish(content: MarketingContentItem): Promise<PublishingResult>;
  schedule(content: MarketingContentItem, scheduledTime: string): Promise<PublishingResult>;
}

// Server-side OAuth token store (Admin Firestore only; zero plaintext filesystem persistence)
interface YouTubeOAuthTokenRecord {
  refreshToken?: string;
  accessToken?: string;
  channelId?: string;
  channelTitle?: string;
  channelUrl?: string;
  connectedAt?: string;
}

let storedYouTubeToken: YouTubeOAuthTokenRecord | null = null;

interface EphemeralOAuthState {
  state: string;
  uid: string;
  provider: 'youtube';
  redirectUri: string;
  expiresAt: number;
  used: boolean;
}

const oauthStateMemory = new Map<string, EphemeralOAuthState>();
const MAX_OAUTH_STATE_ENTRIES = 500;

export function getConfiguredYouTubeOAuthCredentials(): {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
} {
  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || undefined;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || undefined;
  const appUrl = process.env.APP_URL?.trim();
  const redirectUri = appUrl ? `${appUrl.replace(/\/$/, '')}/auth/callback` : undefined;
  return { clientId, clientSecret, redirectUri };
}

export async function createYouTubeOAuthState(params: {
  uid: string;
  redirectUri: string;
}): Promise<string> {
  if (!params.uid) {
    throw new Error('Authenticated admin UID is required to initiate OAuth.');
  }

  const now = Date.now();
  if (oauthStateMemory.size >= MAX_OAUTH_STATE_ENTRIES) {
    for (const [k, v] of oauthStateMemory.entries()) {
      if (now > v.expiresAt || v.used) oauthStateMemory.delete(k);
    }
  }

  const state = crypto.randomBytes(32).toString('hex');
  const record: EphemeralOAuthState = {
    state,
    uid: params.uid,
    provider: 'youtube',
    redirectUri: params.redirectUri,
    expiresAt: now + 10 * 60 * 1000, // 10 min TTL
    used: false,
  };

  oauthStateMemory.set(state, record);
  if (hasAdminCredentials()) {
    await getAdminDb().collection('oauth_states').doc(state).set(record);
  }

  return state;
}

export async function consumeYouTubeOAuthState(state?: string): Promise<EphemeralOAuthState | null> {
  if (!state || typeof state !== 'string' || state.trim().length < 32) {
    return null;
  }
  const cleanState = state.trim();
  const now = Date.now();

  if (hasAdminCredentials()) {
    try {
      const ref = getAdminDb().collection('oauth_states').doc(cleanState);
      const consumed = await getAdminDb().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const data = snap.data() as EphemeralOAuthState;
        if (!data || data.used || data.provider !== 'youtube' || data.expiresAt < now) {
          return null;
        }
        tx.update(ref, { used: true, consumedAt: new Date().toISOString() });
        return data;
      });
      oauthStateMemory.delete(cleanState);
      if (consumed) return consumed;
    } catch (err: any) {
      console.warn('[OAuth] State transaction notice:', err?.message || err);
    }
  }

  const mem = oauthStateMemory.get(cleanState);
  if (!mem || mem.used || mem.provider !== 'youtube' || mem.expiresAt < now) {
    return null;
  }
  mem.used = true;
  oauthStateMemory.delete(cleanState);
  return mem;
}

async function getStoredYouTubeOAuthToken(): Promise<YouTubeOAuthTokenRecord | null> {
  if (storedYouTubeToken) return storedYouTubeToken;

  if (hasAdminCredentials()) {
    try {
      const snap = await getAdminDb().collection('system_settings').doc('youtube_oauth').get().catch(() => null);
      if (snap && snap.exists) {
        storedYouTubeToken = snap.data() as YouTubeOAuthTokenRecord;
        return storedYouTubeToken;
      }
    } catch {}
  }

  return null;
}

export async function saveYouTubeOAuthTokens(tokens: YouTubeOAuthTokenRecord) {
  const updated: YouTubeOAuthTokenRecord = {
    ...storedYouTubeToken,
    ...tokens,
    connectedAt: new Date().toISOString(),
  };

  if (hasAdminCredentials()) {
    await getAdminDb().collection('system_settings').doc('youtube_oauth').set(updated, { merge: true });
  }

  storedYouTubeToken = updated;
  cachedConnections = [];
}

// 1. YouTube Provider Implementation
class YouTubeProvider implements PublishingProvider {
  platform: ContentPlatform = 'youtube';

  async buildAuthUrl(actorUid: string, explicitRedirectUri?: string): Promise<string> {
    const { clientId, clientSecret, redirectUri: envRedirect } = getConfiguredYouTubeOAuthCredentials();
    if (!clientId || !clientSecret) {
      throw new Error('YouTube OAuth 2.0 credentials (YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET) are not configured on the server.');
    }

    const redirectUri = envRedirect || explicitRedirectUri;
    if (!redirectUri) {
      throw new Error('APP_URL must be configured on the server to initiate Google OAuth 2.0.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ');

    const state = await createYouTubeOAuthState({ uid: actorUid, redirectUri });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getConnectionStatus(): Promise<PublishingConnection> {
    const { clientId, clientSecret } = getConfiguredYouTubeOAuthCredentials();
    const stored = await getStoredYouTubeOAuthToken();
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN || stored?.refreshToken;

    if (clientId && clientSecret && refreshToken && stored?.channelTitle) {
      return {
        id: 'youtube',
        platform: 'youtube',
        status: 'connected',
        accountName: stored.channelTitle,
        channelId: stored.channelId,
        channelUrl: stored.channelUrl,
        connectedAt: stored.connectedAt,
        lastSyncAt: new Date().toISOString(),
      };
    }

    if (clientId && clientSecret && refreshToken) {
      return {
        id: 'youtube',
        platform: 'youtube',
        status: 'connected',
        accountName: 'YouTube Channel (OAuth Refresh Token Configured)',
        connectedAt: stored?.connectedAt,
        lastSyncAt: new Date().toISOString(),
      };
    }

    if (clientId && clientSecret) {
      return {
        id: 'youtube',
        platform: 'youtube',
        status: 'configuration_required',
        errorReason: 'OAuth Client credentials configured. Click "Connect Channel" to complete Google authorization.',
      };
    }

    return {
      id: 'youtube',
      platform: 'youtube',
      status: 'configuration_required',
      errorReason: 'OAuth 2.0 Client credentials not configured in environment. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and APP_URL.',
    };
  }

  async connect(credentials: any): Promise<{ success: boolean; message: string; authUrl?: string }> {
    try {
      const actorUid = credentials?.actorUid;
      if (!actorUid) {
        return { success: false, message: 'Authenticated admin session is required to connect YouTube.' };
      }
      const authUrl = await this.buildAuthUrl(actorUid, credentials?.redirectUri);
      return {
        success: true,
        message: 'Google Cloud OAuth 2.0 authorization initiated.',
        authUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Unable to initiate Google OAuth 2.0 authorization.',
      };
    }
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    storedYouTubeToken = null;
    if (hasAdminCredentials()) {
      try {
        await getAdminDb().collection('system_settings').doc('youtube_oauth').delete().catch(() => {});
      } catch {}
    }
    cachedConnections = [];
    return { success: true, message: 'YouTube channel disconnected.' };
  }

  async publish(content: MarketingContentItem): Promise<PublishingResult> {
    const conn = await this.getConnectionStatus();
    if (conn.status !== 'connected') {
      return {
        success: false,
        platform: 'youtube',
        status: 'CONFIG_REQUIRED',
        message: 'Cannot publish to YouTube: Channel is not connected. Configure OAuth credentials first.',
      };
    }

    return {
      success: false,
      platform: 'youtube',
      status: 'FAILED',
      message: 'YouTube video binary upload (videos.insert resumable media payload) is not attached for this content item.',
    };
  }

  async schedule(content: MarketingContentItem, scheduledTime: string): Promise<PublishingResult> {
    const conn = await this.getConnectionStatus();
    if (conn.status !== 'connected') {
      return {
        success: false,
        platform: 'youtube',
        status: 'CONFIG_REQUIRED',
        message: 'Cannot schedule YouTube publication: Channel OAuth is not configured.',
      };
    }

    return {
      success: true,
      platform: 'youtube',
      status: 'SCHEDULED',
      message: `YouTube video queued internally for ${scheduledTime}. External API dispatch pending media upload.`,
    };
  }
}

// 2. Instagram Provider Implementation
class InstagramProvider implements PublishingProvider {
  platform: ContentPlatform = 'instagram';

  async getConnectionStatus(): Promise<PublishingConnection> {
    const appId = process.env.META_APP_ID;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (appId && accessToken) {
      return {
        id: 'instagram',
        platform: 'instagram',
        status: 'connected',
        accountName: 'Instagram Business Account (Configured)',
        lastSyncAt: new Date().toISOString(),
      };
    }

    return {
      id: 'instagram',
      platform: 'instagram',
      status: 'configuration_required',
      errorReason: 'Meta Graph API Instagram Content Publishing token required. Set META_APP_ID and INSTAGRAM_ACCESS_TOKEN.',
    };
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Instagram connection requires Meta Graph API App approval with instagram_content_publish permission.',
    };
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Instagram account disconnected.' };
  }

  async publish(): Promise<PublishingResult> {
    const conn = await this.getConnectionStatus();
    if (conn.status !== 'connected') {
      return {
        success: false,
        platform: 'instagram',
        status: 'CONFIG_REQUIRED',
        message: 'Instagram publishing is not connected yet. Configuration required.',
      };
    }

    return {
      success: false,
      platform: 'instagram',
      status: 'FAILED',
      message: 'Instagram Graph API container upload and media publish execution requires hosted media URL.',
    };
  }

  async schedule(content: MarketingContentItem, scheduledTime: string): Promise<PublishingResult> {
    const conn = await this.getConnectionStatus();
    if (conn.status !== 'connected') {
      return {
        success: false,
        platform: 'instagram',
        status: 'CONFIG_REQUIRED',
        message: 'Instagram is not connected. Connect account in Settings before scheduling.',
      };
    }

    return {
      success: true,
      platform: 'instagram',
      status: 'SCHEDULED',
      message: `Instagram post queued internally for ${scheduledTime}.`,
    };
  }
}

// 3. LinkedIn Provider Implementation
class LinkedInProvider implements PublishingProvider {
  platform: ContentPlatform = 'linkedin';

  async getConnectionStatus(): Promise<PublishingConnection> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const token = process.env.LINKEDIN_ACCESS_TOKEN;

    if (clientId && token) {
      return {
        id: 'linkedin',
        platform: 'linkedin',
        status: 'connected',
        accountName: 'LinkedIn Organization (Configured)',
        lastSyncAt: new Date().toISOString(),
      };
    }

    return {
      id: 'linkedin',
      platform: 'linkedin',
      status: 'not_connected',
      errorReason: 'LinkedIn Community Management API integration is not connected. Set LINKEDIN_CLIENT_ID and LINKEDIN_ACCESS_TOKEN.',
    };
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'LinkedIn API connection requires OAuth 2.0 organization authorization.' };
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'LinkedIn disconnected.' };
  }

  async publish(content: MarketingContentItem): Promise<PublishingResult> {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const orgUrn = process.env.LINKEDIN_ORGANIZATION_URN;
    if (!process.env.LINKEDIN_CLIENT_ID || !token) {
      return {
        success: false,
        platform: 'linkedin',
        status: 'CONFIG_REQUIRED',
        message: 'LinkedIn publishing is not connected. Configure OAuth credentials.',
      };
    }
    if (!orgUrn) {
      return {
        success: false,
        platform: 'linkedin',
        status: 'CONFIG_REQUIRED',
        message: 'LINKEDIN_ORGANIZATION_URN is required for real LinkedIn company page publishing.',
      };
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: orgUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: `${content.headline}\n\n${content.bodyScript}\n\n${content.cta}`.trim() },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        platform: 'linkedin',
        status: 'FAILED',
        message: `LinkedIn API error (${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const postId = res.headers.get('x-restli-id') || `urn:li:share:${Date.now()}`;
    return {
      success: true,
      platform: 'linkedin',
      postId,
      postUrl: `https://www.linkedin.com/feed/update/${postId}`,
      status: 'PUBLISHED',
      message: 'Published to LinkedIn Company Page.',
    };
  }

  async schedule(): Promise<PublishingResult> {
    return {
      success: false,
      platform: 'linkedin',
      status: 'CONFIG_REQUIRED',
      message: 'LinkedIn channel native scheduling is not configured.',
    };
  }
}

// 4. X (Twitter) Provider Implementation
class XProvider implements PublishingProvider {
  platform: ContentPlatform = 'x';

  async getConnectionStatus(): Promise<PublishingConnection> {
    const bearer = process.env.X_API_BEARER_TOKEN;
    if (bearer) {
      return {
        id: 'x',
        platform: 'x',
        status: 'connected',
        accountName: 'X Account (Configured)',
        lastSyncAt: new Date().toISOString(),
      };
    }

    return {
      id: 'x',
      platform: 'x',
      status: 'not_connected',
      errorReason: 'X API v2 OAuth 2.0 Bearer token required. Set X_API_BEARER_TOKEN.',
    };
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'X connection requires OAuth 2.0 user-context bearer token.' };
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'X account disconnected.' };
  }

  async publish(content: MarketingContentItem): Promise<PublishingResult> {
    const bearer = process.env.X_API_BEARER_TOKEN;
    if (!bearer) {
      return {
        success: false,
        platform: 'x',
        status: 'CONFIG_REQUIRED',
        message: 'X (Twitter) publishing is not connected yet.',
      };
    }

    const tweetText = `${content.hook ? content.hook + '\n\n' : ''}${content.bodyScript || content.caption}`.slice(0, 280);
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: tweetText }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        platform: 'x',
        status: 'FAILED',
        message: `X API error (${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as any;
    const tweetId = json?.data?.id;
    return {
      success: true,
      platform: 'x',
      postId: tweetId,
      postUrl: tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined,
      status: 'PUBLISHED',
      message: 'Post published to X.',
    };
  }

  async schedule(): Promise<PublishingResult> {
    return {
      success: false,
      platform: 'x',
      status: 'CONFIG_REQUIRED',
      message: 'X native scheduling is not configured.',
    };
  }
}

// Registry of platform providers
const providers: Record<ContentPlatform, PublishingProvider> = {
  youtube: new YouTubeProvider(),
  instagram: new InstagramProvider(),
  linkedin: new LinkedInProvider(),
  x: new XProvider(),
};

export async function getPublishingConnections(): Promise<PublishingConnection[]> {
  await ensureReady();
  const statuses = await Promise.all([
    providers.youtube.getConnectionStatus(),
    providers.instagram.getConnectionStatus(),
    providers.linkedin.getConnectionStatus(),
    providers.x.getConnectionStatus(),
  ]);
  cachedConnections = statuses;
  return statuses;
}

export async function getPublishingSettings(): Promise<PublishingSettings> {
  await ensureReady();
  return cachedSettings;
}

export async function updatePublishingSettings(
  settings: Partial<PublishingSettings>,
  actor: { email: string; uid: string; role?: string }
): Promise<PublishingSettings> {
  await ensureReady();

  cachedSettings = {
    ...cachedSettings,
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email,
  };

  if (hasAdminCredentials()) {
    try {
      await getAdminDb().collection('marketing_settings').doc('publishing').set(cachedSettings).catch(() => {});
    } catch {}
  }

  await logMarketingAudit({
    action: 'UPDATE_PUBLISHING_SETTINGS',
    actorEmail: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    status: 'SUCCESS',
    details: `Updated publishing settings: Mode=${cachedSettings.mode}, MaxDaily=${cachedSettings.maxPostsPerDay}`,
  });

  return cachedSettings;
}

// Execute Publish Action (with strict safety checks)
export async function executePublishContent(
  contentId: string,
  actor: { email: string; uid: string; role?: string }
): Promise<PublishingResult> {
  await ensureReady();

  const item = cachedContent.find((c) => c.id === contentId);
  if (!item) {
    throw new Error(`Content item ${contentId} not found.`);
  }

  // Safety Gate: Must be approved (unless CEO overrides)
  if (item.status !== 'APPROVED' && actor.role !== 'CEO' && actor.role !== 'SUPER_ADMIN') {
    throw new Error(`Cannot publish content in '${item.status}' state. Content must be APPROVED by an authorized manager first.`);
  }

  const provider = providers[item.platform];
  if (!provider) {
    throw new Error(`Unsupported publishing platform: ${item.platform}`);
  }

  const result = await provider.publish(item);

  if (result.success && result.status === 'PUBLISHED') {
    await updateContentItem(
      item.id,
      {
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
        platformPostId: result.postId,
        platformPostUrl: result.postUrl,
        publishResult: result.message,
      },
      actor
    );

    await logMarketingAudit({
      action: 'PUBLISH_CONTENT',
      actorEmail: actor.email,
      actorUid: actor.uid,
      actorRole: actor.role,
      targetId: item.id,
      platform: item.platform,
      status: 'SUCCESS',
      details: `Successfully published '${item.title}' to ${item.platform.toUpperCase()} (${result.postUrl || result.postId})`,
    });
  } else {
    await updateContentItem(
      item.id,
      {
        status: 'FAILED',
        errorMessage: result.message,
      },
      actor
    );

    await logMarketingAudit({
      action: 'PUBLISH_CONTENT_ATTEMPT',
      actorEmail: actor.email,
      actorUid: actor.uid,
      actorRole: actor.role,
      targetId: item.id,
      platform: item.platform,
      status: 'FAILURE',
      details: `Publish failed for '${item.title}' on ${item.platform.toUpperCase()}: ${result.message}`,
    });
  }

  return result;
}

// Schedule Content Action
export async function executeScheduleContent(
  contentId: string,
  scheduledTime: string,
  actor: { email: string; uid: string; role?: string }
): Promise<PublishingResult> {
  await ensureReady();

  const item = cachedContent.find((c) => c.id === contentId);
  if (!item) {
    throw new Error(`Content item ${contentId} not found.`);
  }

  const provider = providers[item.platform];
  if (!provider) {
    throw new Error(`Unsupported platform ${item.platform}`);
  }

  const result = await provider.schedule(item, scheduledTime);

  // Even if external schedule API requires setup, we persist the scheduled intent in our queue
  await updateContentItem(
    item.id,
    {
      status: 'SCHEDULED',
      scheduledFor: scheduledTime,
      publishResult: result.message,
    },
    actor
  );

  await logMarketingAudit({
    action: 'SCHEDULE_CONTENT',
    actorEmail: actor.email,
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: item.id,
    platform: item.platform,
    status: 'SUCCESS',
    details: `Scheduled '${item.title}' for ${scheduledTime} on ${item.platform.toUpperCase()}`,
  });

  return result;
}

// Connect Channel Action
export async function connectPublishingChannel(
  platform: ContentPlatform,
  credentials?: any
): Promise<{ success: boolean; message: string; authUrl?: string }> {
  await ensureReady();
  const provider = providers[platform];
  if (!provider) {
    return { success: false, message: `Unsupported platform ${platform}` };
  }
  return await provider.connect(credentials);
}

// ==========================================
// 5. ANALYTICS & LEARNING INSIGHTS
// ==========================================

export async function getMarketingAnalytics(): Promise<{
  metrics: MarketingAnalyticsMetric[];
  insights: MarketingLearningInsight[];
  summary: {
    totalPublished: number;
    scheduledCount: number;
    draftsCount: number;
    inReviewCount: number;
    activeChannels: number;
  };
}> {
  await ensureReady();

  const published = cachedContent.filter((c) => c.status === 'PUBLISHED');
  const scheduled = cachedContent.filter((c) => c.status === 'SCHEDULED');
  const drafts = cachedContent.filter((c) => c.status === 'DRAFT');
  const inReview = cachedContent.filter((c) => c.status === 'IN_REVIEW');

  const connections = await getPublishingConnections();
  const activeChannels = connections.filter((c) => c.status === 'connected').length;

  return {
    metrics: [],
    insights: defaultLearningInsights,
    summary: {
      totalPublished: published.length,
      scheduledCount: scheduled.length,
      draftsCount: drafts.length,
      inReviewCount: inReview.length,
      activeChannels,
    },
  };
}

// Get recent audit logs
export async function getMarketingAuditLogs(limitCount: number = 50) {
  await ensureReady();
  return cachedAuditLogs.slice(0, limitCount);
}
