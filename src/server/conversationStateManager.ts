import crypto from 'crypto';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import {
  PersistentConversationState,
  StructuredLeadProfile,
  CompanyProfile,
  QualificationStatus,
} from '../types.ts';

const stateMemoryStore = new Map<string, { state: PersistentConversationState; expiry: number }>();
const CLEANUP_INTERVAL = 15 * 60 * 1000;
const STATE_TTL = 60 * 60 * 1000;
const MAX_STATE_ENTRIES = 2000;

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, item] of stateMemoryStore.entries()) {
      if (item.expiry <= now) {
        stateMemoryStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  if (typeof timer.unref === 'function') timer.unref();
}

function setBoundedStateCache(cacheKey: string, state: PersistentConversationState) {
  if (stateMemoryStore.size >= MAX_STATE_ENTRIES && !stateMemoryStore.has(cacheKey)) {
    const oldestKey = stateMemoryStore.keys().next().value;
    if (oldestKey) stateMemoryStore.delete(oldestKey);
  }
  stateMemoryStore.set(cacheKey, {
    state,
    expiry: Date.now() + STATE_TTL,
  });
}

export function buildStateCacheKey(tenantOrCompanyId: string, conversationId: string): string {
  const cleanComp = (tenantOrCompanyId || '').trim();
  const cleanConv = (conversationId || '').trim();
  if (!cleanComp || !cleanConv) {
    throw new Error('buildStateCacheKey requires both tenant/companyId and conversationId');
  }
  return `${cleanComp}::${cleanConv}`;
}

export function computeLeadPriority(
  state: PersistentConversationState,
  _companyProfile?: Partial<CompanyProfile>
): 'LOW' | 'MEDIUM' | 'HIGH' {
  const fields = state.collectedFields;
  const workflow = state.currentWorkflow;
  const intent = state.currentIntent;

  let score = 0;

  if (workflow === 'GET_QUOTE' || intent === 'GET_QUOTE' || intent === 'PRICE_QUOTATION_QUESTION') score += 3;
  if (workflow === 'DEPLOY' || intent === 'DEPLOY_INTENT') score += 3;
  if (workflow === 'TALK_TO_SALES' || intent === 'TALK_TO_SALES' || intent === 'HUMAN_HANDOFF_REQUEST') score += 3;
  if (intent === 'BUYING_INTENT') score += 4;

  if (fields.contact || fields.email || fields.phone) score += 4;
  if (fields.product) score += 2;
  if (fields.quantity || fields.lead_volume) score += 2;
  if (fields.budget) score += 2;
  if (fields.timeline) score += 1;
  if (fields.company || fields.business_type) score += 2;
  if (fields.location) score += 1;

  if (score >= 6) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
}

export function generateInternalConversationSummary(state: PersistentConversationState): string {
  const f = state.collectedFields;
  const lines: string[] = [];

  const nameStr = f.name || 'Visitor';
  lines.push(`Customer: ${nameStr}`);
  lines.push(`Intent/Workflow: ${state.currentWorkflow !== 'IDLE' ? state.currentWorkflow : state.currentIntent}`);

  if (f.product) lines.push(`Product/Requirement: ${f.product}`);
  if (f.quantity || f.lead_volume) lines.push(`Scope/Volume: ${f.quantity || f.lead_volume}`);
  if (f.company || f.business_type) lines.push(`Company: ${f.company || f.business_type}`);
  if (f.location) lines.push(`Location: ${f.location}`);
  if (f.budget) lines.push(`Budget: ${f.budget}`);
  if (f.timeline) lines.push(`Timeline: ${f.timeline}`);
  if (f.website) lines.push(`Website: ${f.website}`);

  const contact = f.contact || f.email || f.phone;
  lines.push(`Contact: ${contact ? contact : 'Not provided'}`);
  lines.push(`Next Action: ${state.nextRequiredField !== 'none' ? `Collect ${state.nextRequiredField}` : 'Ready for sales review'}`);

  return lines.join(' | ');
}

function getConversationStateDocRef(userId?: string, companyId?: string, conversationId?: string) {
  if (!conversationId) return null;
  if (!hasAdminCredentials()) return null;
  const db = getAdminDb();
  if (userId) {
    return db.collection('users').doc(userId).collection('conversation_states').doc(conversationId);
  }
  if (companyId) {
    return db.collection('public_widgets').doc(companyId).collection('conversation_states').doc(conversationId);
  }
  return null;
}

export async function getOrCreateConversationState(params: {
  companyId: string;
  conversationId: string;
  visitorId?: string;
  userId?: string;
  existingProfile?: Partial<StructuredLeadProfile>;
  customerName?: string;
}): Promise<PersistentConversationState> {
  const { companyId, conversationId, visitorId, userId, existingProfile, customerName } = params;
  const scopeId = userId ? `${userId}:${companyId}` : companyId;
  const cacheKey = buildStateCacheKey(scopeId, conversationId);

  const cached = stateMemoryStore.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    if (existingProfile) {
      mergeProfileIntoState(cached.state, existingProfile);
    }
    if (customerName && customerName !== 'Website Visitor' && !cached.state.collectedFields.name) {
      cached.state.collectedFields.name = customerName;
      cached.state.structuredProfile.name = customerName;
      cached.state.structuredProfile.customer_name = customerName;
    }
    cached.expiry = Date.now() + STATE_TTL;
    return cached.state;
  }

  let loadedFromDb: PersistentConversationState | null = null;
  try {
    const docRef = getConversationStateDocRef(userId, companyId, conversationId);
    if (docRef) {
      const snapPromise = docRef.get();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const snap: any = await Promise.race([snapPromise, timeoutPromise]);
      if (snap && snap.exists) {
        loadedFromDb = snap.data() as PersistentConversationState;
      }
    }
  } catch {
    // Non-blocking fallback to in-memory state when Firestore is unavailable
  }

  const now = new Date().toISOString();
  const initialProfile: StructuredLeadProfile = {
    customer_name: customerName || existingProfile?.customer_name || existingProfile?.name || 'Website Visitor',
    name: customerName || existingProfile?.name || existingProfile?.customer_name || null,
    company: existingProfile?.company || existingProfile?.company_name || null,
    company_name: existingProfile?.company_name || existingProfile?.company || undefined,
    business_type: existingProfile?.business_type || undefined,
    location: existingProfile?.location || null,
    product_interest: existingProfile?.product_interest || existingProfile?.product_or_service || null,
    product_or_service: existingProfile?.product_or_service || existingProfile?.product_interest || undefined,
    quantity_or_scope: existingProfile?.quantity_or_scope || undefined,
    lead_volume: existingProfile?.lead_volume || null,
    budget: existingProfile?.budget || null,
    timeline: existingProfile?.timeline || existingProfile?.deadline || null,
    contact_info: existingProfile?.contact_info || undefined,
    inquiry_stage: existingProfile?.inquiry_stage || 'IDLE',
    current_workflow: existingProfile?.current_workflow || 'IDLE',
    qualification_status: (existingProfile?.qualification_status as QualificationStatus) || 'NOT_STARTED',
    collected_fields: existingProfile?.collected_fields || {},
    last_asked_field: existingProfile?.last_asked_field || undefined,
    completed_action_keys: existingProfile?.completed_action_keys || [],
  };

  const newState: PersistentConversationState = loadedFromDb || {
    conversationId,
    companyId,
    userId: userId || undefined,
    visitorId: visitorId || `vis_${crypto.randomUUID()}`,
    currentIntent: 'UNCLEAR',
    currentWorkflow: initialProfile.current_workflow || 'IDLE',
    inquiryStage: initialProfile.inquiry_stage || 'IDLE',
    qualificationStatus: initialProfile.qualification_status || 'NOT_STARTED',
    leadPriority: 'LOW',
    collectedFields: {
      name: initialProfile.name || (customerName !== 'Website Visitor' ? customerName : null),
      email: initialProfile.contact_info?.includes('@') ? initialProfile.contact_info : null,
      phone: initialProfile.contact_info && !initialProfile.contact_info.includes('@') ? initialProfile.contact_info : null,
      company: initialProfile.company || initialProfile.company_name || null,
      business_type: initialProfile.business_type ? String(initialProfile.business_type) : null,
      location: initialProfile.location || null,
      product: initialProfile.product_interest || initialProfile.product_or_service || null,
      quantity: initialProfile.quantity_or_scope || null,
      lead_volume: initialProfile.lead_volume || null,
      budget: initialProfile.budget || null,
      timeline: initialProfile.timeline || null,
      requirements: null,
      use_case: null,
      website: null,
    },
    missingFields: ['product', 'contact'],
    nextRequiredField: 'product',
    lastAskedField: undefined,
    conversationSummary: undefined,
    messageCount: 0,
    structuredProfile: initialProfile,
    completedActionKeys: initialProfile.completed_action_keys || [],
    createdAt: now,
    updatedAt: now,
  };

  if (existingProfile) {
    mergeProfileIntoState(newState, existingProfile);
  }

  setBoundedStateCache(cacheKey, newState);
  return newState;
}

function mergeProfileIntoState(state: PersistentConversationState, profile: Partial<StructuredLeadProfile>) {
  if (profile.name || profile.customer_name) {
    const n = profile.name || profile.customer_name;
    if (n && n !== 'Website Visitor' && n !== 'Unknown') {
      state.collectedFields.name = n;
      state.structuredProfile.name = n;
      state.structuredProfile.customer_name = n;
    }
  }
  if (profile.contact_info) {
    state.collectedFields.contact = profile.contact_info;
    state.structuredProfile.contact_info = profile.contact_info;
    if (profile.contact_info.includes('@')) state.collectedFields.email = profile.contact_info;
    else state.collectedFields.phone = profile.contact_info;
  }
  if (profile.product_interest || profile.product_or_service) {
    const p = profile.product_interest || profile.product_or_service;
    state.collectedFields.product = p;
    state.structuredProfile.product_interest = p;
    state.structuredProfile.product_or_service = p;
  }
  if (profile.quantity_or_scope) {
    state.collectedFields.quantity = profile.quantity_or_scope;
    state.structuredProfile.quantity_or_scope = profile.quantity_or_scope;
  }
  if (profile.lead_volume) {
    state.collectedFields.lead_volume = profile.lead_volume;
    state.structuredProfile.lead_volume = profile.lead_volume;
  }
  if (profile.location) {
    state.collectedFields.location = profile.location;
    state.structuredProfile.location = profile.location;
  }
  if (profile.company || profile.company_name) {
    const c = profile.company || profile.company_name;
    state.collectedFields.company = c;
    state.structuredProfile.company = c;
    state.structuredProfile.company_name = c;
  }
  if (profile.business_type) {
    state.collectedFields.business_type = String(profile.business_type);
    state.structuredProfile.business_type = profile.business_type;
  }
  if (profile.budget) {
    state.collectedFields.budget = profile.budget;
    state.structuredProfile.budget = profile.budget;
  }
  if (profile.timeline || profile.deadline) {
    const t = profile.timeline || profile.deadline;
    state.collectedFields.timeline = t;
    state.structuredProfile.timeline = t;
    state.structuredProfile.deadline = t;
  }
  if (profile.current_workflow && profile.current_workflow !== 'IDLE') {
    state.currentWorkflow = profile.current_workflow;
    state.structuredProfile.current_workflow = profile.current_workflow;
  }
  if (profile.inquiry_stage) {
    state.inquiryStage = profile.inquiry_stage;
    state.structuredProfile.inquiry_stage = profile.inquiry_stage;
  }
  if (profile.last_asked_field) {
    state.lastAskedField = profile.last_asked_field;
    state.structuredProfile.last_asked_field = profile.last_asked_field;
  }
}

export async function saveConversationState(state: PersistentConversationState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  state.conversationSummary = generateInternalConversationSummary(state);
  state.leadPriority = computeLeadPriority(state);

  const scopeId = state.userId ? `${state.userId}:${state.companyId}` : state.companyId;
  const cacheKey = buildStateCacheKey(scopeId, state.conversationId);
  setBoundedStateCache(cacheKey, state);

  try {
    const docRef = getConversationStateDocRef(state.userId, state.companyId, state.conversationId);
    if (docRef) {
      await docRef.set({ ...state }, { merge: true });
    }
  } catch (err: any) {
    console.error('[ConversationState] Failed to persist conversation state:', err?.message || err);
  }
}

export function clearConversationState(companyId: string, conversationId: string, userId?: string): void {
  const scopeId = userId ? `${userId}:${companyId}` : companyId;
  const cacheKey = buildStateCacheKey(scopeId, conversationId);
  stateMemoryStore.delete(cacheKey);
}
