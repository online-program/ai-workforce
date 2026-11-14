import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase.ts';
import { CompanyProfile, InquiryLead, ActivityLog, SalesTask, OnboardingDraft, UserWorkspaceMetadata } from '../types.ts';

// Helper: Retrieve authenticated Bearer token headers for server API requests
export async function getWorkspaceAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      headers['Authorization'] = `Bearer ${idToken}`;
      headers['x-user-id'] = auth.currentUser.uid;
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token for workspace request:', err);
    }
  }
  return headers;
}

// Helper: Verify if current client session has permission to write user workspace doc
export function canWriteUserDoc(userId: string): boolean {
  if (!userId || userId === 'demo_user' || userId === 'default_user' || userId === 'guest') {
    return false;
  }
  const currentUid = auth.currentUser?.uid;
  return !!currentUid && currentUid === userId;
}

export const defaultCompanyProfile: CompanyProfile = {
  name: 'My Business',
  brandName: 'My Business',
  deploymentType: 'BUSINESS',
  shortDescription: 'Provider delivering high-quality business solutions.',
  whatYouDo: '',
  targetAudience: 'Commercial clients and interested visitors',
  mainGoals: ['Generate leads', 'Answer questions'],
  keyInformation: '',
  contactInformation: {
    email: '',
    phone: '',
    website: '',
    bookingUrl: '',
    socialLinks: {},
  },
  inquiryFields: ['Name', 'Email', 'Requirement'],
  aiIdentity: 'Sales Assistant',
  aiTone: 'Professional',
  aiIntroduction: '',
  aiRepresents: '',
  forbiddenClaims: [],
  industry: 'Commercial Solutions',
  businessType: 'goods',
  products: 'Commercial Products & Solutions',
  locations: 'Regional & Global',
  minOrder: 'Standard commercial engagements',
  tone: 'Professional and concise',
  businessRules:
    'Never invent prices.\nNever promise capacity or inventory without confirmation.\nNever promise delivery without confirmation.\nEscalate custom requests to a human.',
  description: 'Provider delivering high-quality business solutions.',
};

// Helper: safe local storage wrapper for offline cache
export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse errors
  }
  return fallback;
}

export function setLocalCache<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage write errors
  }
}

const RESERVED_OFFICIAL_WIDGET_IDS = new Set<string>([
  'ai_workforce_official',
  'official-ai-workforce',
  'ai_workforce',
  'ai-workforce',
  'wgt_8va1xl_re01u0',
]);

export function isReservedOfficialWidgetIdClient(widgetId?: string | null): boolean {
  if (!widgetId || typeof widgetId !== 'string') return false;
  return RESERVED_OFFICIAL_WIDGET_IDS.has(widgetId.trim().toLowerCase());
}

// Helper: Generate collision-free unique widget ID for each business
export function generateUniqueWidgetId(userId?: string): string {
  for (let i = 0; i < 5; i++) {
    const rand = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6);
    const candidate = !userId
      ? `wgt_${rand}`
      : `wgt_${userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 6)}_${rand.slice(0, 6)}`;
    if (!isReservedOfficialWidgetIdClient(candidate)) {
      return candidate;
    }
  }
  return `wgt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

export function getOrCreateWidgetId(userId: string): string {
  const cacheKey = `aw_widget_cfg_${userId}`;
  const cached = getLocalCache<any>(cacheKey, null);
  if (
    cached &&
    cached.widget_id &&
    cached.widget_id.startsWith('wgt_') &&
    !isReservedOfficialWidgetIdClient(cached.widget_id)
  ) {
    return cached.widget_id;
  }
  const idKey = `aw_widget_id_${userId}`;
  const existingId = getLocalCache<string | null>(idKey, null);
  if (existingId && existingId.startsWith('wgt_') && !isReservedOfficialWidgetIdClient(existingId)) {
    return existingId;
  }
  const newId = generateUniqueWidgetId(userId);
  setLocalCache(idKey, newId);
  return newId;
}

// Helper: Timeout promise wrapper to prevent any network operation from blocking UI for more than maxMs
async function withTimeout<T>(promise: Promise<T>, maxMs = 1200, fallbackValue?: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
      } else {
        reject(new Error(`Operation timed out after ${maxMs}ms`));
      }
    }, maxMs);
  });

  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (fallbackValue !== undefined) return fallbackValue;
    throw err;
  }
}

// Helper: Retry promise wrapper with timeout
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 200,
  fallbackValue?: T
): Promise<T> {
  try {
    return await withTimeout(fn(), 1000, fallbackValue);
  } catch (err: any) {
    const isOfflineOrTimeout =
      err?.message?.includes('offline') ||
      err?.message?.includes('timed out') ||
      err?.code === 'unavailable' ||
      err?.code === 'failed-precondition';

    if (retries > 0 && isOfflineOrTimeout) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs * 1.5, fallbackValue);
    }
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw err;
  }
}

// Helper: Sync live widget configuration and Company Brain to backend server cache
export async function syncWidgetConfigToServer(
  userId: string,
  profile: CompanyProfile,
  widgetId?: string,
  extraConfig?: any
): Promise<void> {
  const candidateId = widgetId && !isReservedOfficialWidgetIdClient(widgetId) ? widgetId : getOrCreateWidgetId(userId);
  const effectiveWidgetId = candidateId;
  if (isReservedOfficialWidgetIdClient(effectiveWidgetId)) return;
  try {
    const authHeaders = await getWorkspaceAuthHeaders();
    await fetch('/api/widget/config', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        widget_id: effectiveWidgetId,
        user_id: userId,
        business_name: profile.name,
        welcome_message:
          extraConfig?.welcome_message ||
          `Hi there! 👋 Welcome to ${profile.name}. How can Alpha assist you today?`,
        theme_color: extraConfig?.theme_color || '#0f172a',
        position: extraConfig?.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
        is_active: extraConfig?.is_active !== false,
        company_profile: profile,
      }),
    });
  } catch (e: any) {
    console.warn('Server widget config sync notice:', e?.message || e);
  }
}

// Synchronous fast cache getters for instant render without network waiting
export function getCachedUserWorkspaceMetadata(userId: string): UserWorkspaceMetadata {
  return getLocalCache<UserWorkspaceMetadata>(`aw_user_meta_${userId}`, {
    email: '',
    onboarding_completed: false, // Clean default for new users to trigger onboarding
    onboarding_step: 1,
  });
}

export function getCachedCompanyProfile(userId: string): CompanyProfile {
  return getLocalCache<CompanyProfile>(`aw_company_prof_${userId}`, defaultCompanyProfile);
}

// Workspace User Metadata & Onboarding
export async function getUserWorkspaceMetadata(userId: string): Promise<UserWorkspaceMetadata> {
  const cacheKey = `aw_user_meta_${userId}`;
  const defaultMeta: UserWorkspaceMetadata = {
    email: '',
    onboarding_completed: false,
    onboarding_step: 1,
  };
  const cached = getLocalCache<UserWorkspaceMetadata>(cacheKey, defaultMeta);

  if (!userId) {
    return cached;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await withRetry(() => getDoc(userDocRef), 1, 200, null as any);
    
    let isCompleted = cached.onboarding_completed === true;
    let step = Math.min(6, Math.max(1, Number(cached.onboarding_step) || 1));
    let draft = cached.onboarding_draft;
    let email = cached.email || '';

    if (snap && snap.exists && snap.exists()) {
      const data = snap.data() || {};
      if (data.onboarding_completed === true) {
        isCompleted = true;
      }
      if (data.onboarding_step) {
        const numStep = Number(data.onboarding_step);
        if (!isNaN(numStep) && numStep >= 1 && numStep <= 6) {
          step = numStep;
        }
      }
      if (data.onboarding_draft) {
        draft = { ...(draft || {}), ...data.onboarding_draft };
      }
      if (data.email) email = data.email;
    }

    // Double check: if user already has a saved company profile, onboarding is definitely completed
    if (!isCompleted) {
      const companyDocRef = doc(db, 'users', userId, 'company_profile', 'main');
      const compSnap = await withRetry(() => getDoc(companyDocRef), 1, 200, null as any);
      if (compSnap && compSnap.exists && compSnap.exists()) {
        const compData = compSnap.data();
        if (compData && compData.name && compData.name.trim() !== '' && compData.name !== 'My Business') {
          isCompleted = true;
          step = 6;
          // Persist the completed state back to the user metadata document
          setDoc(userDocRef, { onboarding_completed: true, onboarding_step: 6, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      }
    }

    const meta: UserWorkspaceMetadata = {
      email,
      onboarding_completed: isCompleted,
      onboarding_step: step,
      onboarding_draft: draft,
      createdAt: snap?.exists?.() ? snap.data()?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalCache(cacheKey, meta);
    return meta;
  } catch (err: any) {
    return cached;
  }
}

export async function saveUserOnboardingDraft(
  userId: string,
  step: number,
  draft: Partial<OnboardingDraft>
): Promise<void> {
  const cacheKey = `aw_user_meta_${userId}`;
  const cached = getLocalCache<UserWorkspaceMetadata>(cacheKey, {
    email: '',
    onboarding_completed: false,
    onboarding_step: step,
  });
  setLocalCache(cacheKey, {
    ...cached,
    onboarding_step: step,
    onboarding_draft: draft,
    updatedAt: new Date().toISOString(),
  });

  if (!canWriteUserDoc(userId)) {
    return;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        onboarding_step: step,
        onboarding_draft: draft,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Onboarding draft saved to local cache; Firestore sync notice:', err?.message || err);
  }
}

export async function completeUserOnboarding(
  userId: string,
  draft: OnboardingDraft
): Promise<CompanyProfile> {
  const businessType = draft.businessType || 'goods';

  // Format products or services catalog from offerings
  let formattedProducts = '';
  if (draft.offerings && draft.offerings.length > 0) {
    const validOfferings = draft.offerings
      .filter((o) => o.name && o.name.trim())
      .map((o) => {
        let str = o.name.trim();
        if (o.description?.trim()) str += ` — ${o.description.trim()}`;
        if (o.priceOrRange?.trim()) str += ` [Pricing: ${o.priceOrRange.trim()}]`;
        if (o.importantDetails?.trim()) str += ` (Details: ${o.importantDetails.trim()})`;
        return str;
      });
    if (validOfferings.length > 0) {
      formattedProducts = validOfferings.join('\n');
    }
  }

  if (!formattedProducts) {
    formattedProducts = draft.description?.trim() || `${draft.companyName} Solutions`;
  }

  // Location / Service territory determination
  let locationString = 'Global & Regional';
  if (draft.customServiceArea && draft.customServiceArea.trim()) {
    locationString = draft.customServiceArea.trim();
  } else if (draft.serviceArea && draft.serviceArea.trim()) {
    locationString = draft.serviceArea.trim();
  } else if (draft.location && draft.location.trim()) {
    locationString = draft.location.trim();
  }

  const rulesList: string[] = [
    'Never invent or guess pricing without verified company data.',
    'Never promise unverified capacity, inventory, or delivery without confirmation.',
    'Answer customer questions directly before asking qualifying questions.',
    'Ask only one clarifying question at a time.',
  ];

  if (draft.unknownQuestionBehavior === 'human_approval') {
    rulesList.push('When customer questions cannot be answered from verified company data, notify the supervisor for human review before finalizing commitments.');
  } else {
    rulesList.push('Answer inquiries using available verified facts. Never invent unlisted details.');
  }

  if (draft.targetCustomers && draft.targetCustomers.trim()) {
    rulesList.push(`Target Customer Base: ${draft.targetCustomers.trim()}`);
  }

  const compiledProfile: CompanyProfile = {
    name: draft.companyName.trim() || 'My Business',
    deploymentType: draft.deploymentType || 'BUSINESS',
    industry: draft.businessType === 'services' ? 'Services & Consulting' : draft.businessType === 'hybrid' ? 'Hybrid Products & Services' : 'Products & Manufacturing',
    businessType: draft.businessType || 'goods',
    products: formattedProducts,
    locations: locationString,
    minOrder: draft.minOrder?.trim() || (businessType === 'services' ? 'Standard engagements' : 'Standard orders'),
    pricing: draft.pricing?.trim() || draft.commercialInfo?.pricingDetails || '',
    tone: draft.tone || draft.brandVoice?.toneStyle || 'Professional and concise',
    businessRules: rulesList.join('\n'),
    description: draft.description?.trim(),
    website: draft.website?.trim() || '',
    targetCustomers: draft.targetCustomers?.trim() || '',
    serviceArea: locationString,
    businessEmail: draft.businessEmail?.trim() || draft.humanHandoff?.businessEmail || '',
    businessPhone: draft.businessPhone?.trim() || draft.humanHandoff?.businessPhone || '',
    approval_mode: draft.approval_mode || (draft.quotationRequired === false ? 'automatic_for_simple' : 'human_approval_required'),
    unknownQuestionBehavior: draft.unknownQuestionBehavior || 'human_approval',
    offerings: draft.offerings || [],
    differentiators: draft.differentiators,
    commercialInfo: draft.commercialInfo,
    deliveryService: draft.deliveryService,
    qualificationRules: draft.qualificationRules,
    salesQuestions: draft.salesQuestions,
    faqs: draft.faqs || [],
    policies: draft.policies,
    brandVoice: draft.brandVoice,
    humanHandoff: draft.humanHandoff,
    salesPlaybook: draft.salesPlaybook,
  };

  // 1. Instant optimistic local caches
  const cacheKey = `aw_company_prof_${userId}`;
  setLocalCache(cacheKey, compiledProfile);

  const metaCacheKey = `aw_user_meta_${userId}`;
  const existingMeta = getLocalCache<UserWorkspaceMetadata>(metaCacheKey, {
    email: '',
    onboarding_completed: false,
    onboarding_step: 1,
  });
  setLocalCache(metaCacheKey, {
    ...existingMeta,
    onboarding_completed: true,
    onboarding_step: 6,
    onboarding_draft: draft,
    updatedAt: new Date().toISOString(),
  });

  const widgetId = getOrCreateWidgetId(userId);
  const updatedWidgetConfig = {
    widget_id: widgetId,
    business_name: compiledProfile.name,
    welcome_message: `Hi there! 👋 Welcome to ${compiledProfile.name}. How can Alpha assist you today?`,
    theme_color: '#0f172a',
    preset: draft.widgetPreset || 'modern_pill',
    is_active: true,
    position: 'bottom-right' as const,
    updated_at: new Date().toISOString(),
  };
  setLocalCache(`aw_widget_cfg_${userId}`, updatedWidgetConfig);

  // 2. Perform background persistence asynchronously without blocking the UI
  (async () => {
    try {
      const widgetDocRef = doc(db, 'users', userId, 'widget_config', 'default');
      const publicWidgetDocRef = doc(db, 'public_widgets', widgetId);

      const publicSummary = {
        name: compiledProfile.brandName || compiledProfile.name || 'My Business',
        industry: compiledProfile.industry || 'Commercial Solutions',
        businessType: compiledProfile.businessType || 'goods',
        deploymentType: compiledProfile.deploymentType || 'BUSINESS',
      };

      const tasks: Promise<any>[] = [
        setDoc(
          publicWidgetDocRef,
          {
            widget_id: widgetId,
            user_id: userId,
            business_name: updatedWidgetConfig.business_name,
            welcome_message: updatedWidgetConfig.welcome_message,
            theme_color: updatedWidgetConfig.theme_color,
            public_summary: publicSummary,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        ),
      ];

      if (canWriteUserDoc(userId)) {
        const userDocRef = doc(db, 'users', userId);
        const companyDocRef = doc(db, 'users', userId, 'company_profile', 'main');
        tasks.push(
          setDoc(
            userDocRef,
            {
              onboarding_completed: true,
              onboarding_step: 6,
              onboarding_draft: draft,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ),
          setDoc(
            companyDocRef,
            {
              name: compiledProfile.name,
              industry: compiledProfile.industry,
              businessType: compiledProfile.businessType || 'goods',
              products: compiledProfile.products,
              locations: compiledProfile.locations,
              minOrder: compiledProfile.minOrder || '',
              pricing: compiledProfile.pricing || '',
              tone: compiledProfile.tone,
              businessRules: compiledProfile.businessRules,
              description: compiledProfile.description || '',
              primaryGoal: compiledProfile.primaryGoal || '',
              website: compiledProfile.website || '',
              targetCustomers: compiledProfile.targetCustomers || '',
              serviceArea: compiledProfile.serviceArea || compiledProfile.locations || '',
              businessEmail: compiledProfile.businessEmail || '',
              businessPhone: compiledProfile.businessPhone || '',
              unknownQuestionBehavior: compiledProfile.unknownQuestionBehavior || 'human_approval',
              offerings: compiledProfile.offerings || [],
              differentiators: compiledProfile.differentiators || null,
              commercialInfo: compiledProfile.commercialInfo || null,
              deliveryService: compiledProfile.deliveryService || null,
              qualificationRules: compiledProfile.qualificationRules || null,
              salesQuestions: compiledProfile.salesQuestions || null,
              faqs: compiledProfile.faqs || [],
              policies: compiledProfile.policies || null,
              brandVoice: compiledProfile.brandVoice || null,
              humanHandoff: compiledProfile.humanHandoff || null,
              salesPlaybook: compiledProfile.salesPlaybook || null,
              country: compiledProfile.country || '',
              currency: compiledProfile.currency || '',
              timezone: compiledProfile.timezone || '',
              locale: compiledProfile.locale || '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ),
          setDoc(widgetDocRef, updatedWidgetConfig, { merge: true })
        );
      }

      await Promise.allSettled(tasks);

      logUserActivity(userId, {
        id: `act-onboard-${Date.now()}`,
        employeeName: 'Alpha',
        title: 'Company Brain Configured',
        description: `Onboarding completed. Alpha initialized with parameters for ${compiledProfile.name}.`,
        timestamp: new Date().toISOString(),
        type: 'status_change',
      });

      // Prime the server-side widget runtime immediately so real website widgets reflect this Company Brain without delay
      await syncWidgetConfigToServer(userId, compiledProfile, widgetId, updatedWidgetConfig);
    } catch (err: any) {
      console.warn('Background sync for onboarding completed with notice:', err?.message || err);
    }
  })();

  return compiledProfile;
}

// 1. Company Brain persistence
export async function getCompanyProfile(userId: string): Promise<CompanyProfile> {
  const cacheKey = `aw_company_prof_${userId}`;
  const cached = getLocalCache<CompanyProfile>(cacheKey, defaultCompanyProfile);

  const parseProfileData = (data: any): CompanyProfile => ({
    name: data.name || data.brandName || defaultCompanyProfile.name,
    brandName: data.brandName || data.name || defaultCompanyProfile.brandName,
    deploymentType: (data.deploymentType ? String(data.deploymentType).toUpperCase() : 'BUSINESS') as any,
    shortDescription: data.shortDescription || data.description || defaultCompanyProfile.shortDescription,
    whatYouDo: data.whatYouDo || '',
    targetAudience: data.targetAudience || data.targetCustomers || defaultCompanyProfile.targetAudience,
    mainGoals: Array.isArray(data.mainGoals) && data.mainGoals.length > 0 ? data.mainGoals : defaultCompanyProfile.mainGoals,
    keyInformation: data.keyInformation || data.additionalKnowledge || '',
    contactInformation: {
      email: data.contactInformation?.email || data.businessEmail || '',
      phone: data.contactInformation?.phone || data.businessPhone || '',
      website: data.contactInformation?.website || data.website || '',
      bookingUrl: data.contactInformation?.bookingUrl || '',
      socialLinks: data.contactInformation?.socialLinks || {},
    },
    inquiryFields: Array.isArray(data.inquiryFields) && data.inquiryFields.length > 0 ? data.inquiryFields : defaultCompanyProfile.inquiryFields,
    aiIdentity: data.aiIdentity || defaultCompanyProfile.aiIdentity,
    aiTone: data.aiTone || data.tone || defaultCompanyProfile.aiTone,
    aiIntroduction: data.aiIntroduction || '',
    aiRepresents: data.aiRepresents || data.brandName || data.name || '',
    forbiddenClaims: Array.isArray(data.forbiddenClaims) ? data.forbiddenClaims : [],
    industry: data.industry || defaultCompanyProfile.industry,
    businessType: data.businessType || 'goods',
    products: data.products || defaultCompanyProfile.products,
    locations: data.locations || defaultCompanyProfile.locations,
    minOrder: data.minOrder || defaultCompanyProfile.minOrder,
    pricing: data.pricing || defaultCompanyProfile.pricing,
    tone: data.tone || data.aiTone || defaultCompanyProfile.tone,
    businessRules: data.businessRules || defaultCompanyProfile.businessRules,
    description: data.description || data.shortDescription || defaultCompanyProfile.description,
    primaryGoal: data.primaryGoal,
    website: data.website || data.contactInformation?.website || '',
    targetCustomers: data.targetCustomers || data.targetAudience || '',
    serviceArea: data.serviceArea || data.locations || '',
    businessEmail: data.businessEmail || data.contactInformation?.email || '',
    businessPhone: data.businessPhone || data.contactInformation?.phone || '',
    approval_mode: data.approval_mode || 'human_approval_required',
    unknownQuestionBehavior: data.unknownQuestionBehavior || 'human_approval',
    offerings: Array.isArray(data.offerings) ? data.offerings : [],
    differentiators: data.differentiators || undefined,
    commercialInfo: data.commercialInfo || undefined,
    deliveryService: data.deliveryService || undefined,
    qualificationRules: data.qualificationRules || undefined,
    salesQuestions: data.salesQuestions || undefined,
    faqs: Array.isArray(data.faqs) ? data.faqs : [],
    policies: data.policies || undefined,
    brandVoice: data.brandVoice || undefined,
    humanHandoff: data.humanHandoff || undefined,
    faqData: data.faqData || '',
    additionalKnowledge: data.additionalKnowledge || data.keyInformation || '',
    salesPlaybook: data.salesPlaybook
      ? {
          ...data.salesPlaybook,
          qualificationQuestions: Array.isArray(data.salesPlaybook.qualificationQuestions)
            ? data.salesPlaybook.qualificationQuestions
            : [],
          intents: Array.isArray(data.salesPlaybook.intents)
            ? data.salesPlaybook.intents
            : Array.isArray(data.salesPlaybook.visitorIntents)
            ? data.salesPlaybook.visitorIntents
            : [],
          visitorIntents: Array.isArray(data.salesPlaybook.visitorIntents)
            ? data.salesPlaybook.visitorIntents
            : Array.isArray(data.salesPlaybook.intents)
            ? data.salesPlaybook.intents
            : [],
        }
      : undefined,
    country: data.country,
    currency: data.currency,
    timezone: data.timezone,
    locale: data.locale,
  });

  try {
    const docRef = doc(db, 'users', userId, 'company_profile', 'main');
    const snap = await withRetry(() => getDoc(docRef), 1, 400);

    if (snap && snap.exists()) {
      const profile = parseProfileData(snap.data());
      setLocalCache(cacheKey, profile);
      return profile;
    }

    // If query by collection was previously used
    const colSnap = await withRetry(() => getDocs(query(collection(db, 'users', userId, 'company_profile'), limit(1))), 1, 400);
    if (colSnap && !colSnap.empty) {
      const profile = parseProfileData(colSnap.docs[0].data());
      setLocalCache(cacheKey, profile);
      return profile;
    }

    // If not existing yet, return default cached profile
    return cached;
  } catch (err: any) {
    const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
    if (!isOffline) {
      console.warn('Company Brain load notice:', err?.message || err);
    }
    return cached;
  }
}

export async function saveCompanyProfile(userId: string, profile: CompanyProfile): Promise<void> {
  const cacheKey = `aw_company_prof_${userId}`;
  setLocalCache(cacheKey, profile);

  // Permanently record onboarding as completed in metadata
  const metaCacheKey = `aw_user_meta_${userId}`;
  const existingMeta = getLocalCache<UserWorkspaceMetadata>(metaCacheKey, {
    email: '',
    onboarding_completed: true,
    onboarding_step: 6,
  });
  setLocalCache(metaCacheKey, {
    ...existingMeta,
    onboarding_completed: true,
    onboarding_step: 6,
    updatedAt: new Date().toISOString(),
  });

  try {
    const tasks: Promise<any>[] = [];

    if (canWriteUserDoc(userId)) {
      const userDocRef = doc(db, 'users', userId);
      const docRef = doc(db, 'users', userId, 'company_profile', 'main');
      tasks.push(
        setDoc(
          userDocRef,
          {
            onboarding_completed: true,
            onboarding_step: 6,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        setDoc(
          docRef,
          {
            name: profile.name,
            brandName: profile.brandName || profile.name,
            deploymentType: profile.deploymentType || 'BUSINESS',
            shortDescription: profile.shortDescription || profile.description || '',
            whatYouDo: profile.whatYouDo || '',
            targetAudience: profile.targetAudience || profile.targetCustomers || '',
            mainGoals: profile.mainGoals || [],
            keyInformation: profile.keyInformation || profile.additionalKnowledge || '',
            contactInformation: profile.contactInformation || {
              email: profile.businessEmail || '',
              phone: profile.businessPhone || '',
              website: profile.website || '',
              bookingUrl: '',
              socialLinks: {},
            },
            inquiryFields: profile.inquiryFields || ['Name', 'Email', 'Requirement'],
            aiIdentity: profile.aiIdentity || 'Sales Assistant',
            aiTone: profile.aiTone || profile.tone || 'Professional',
            aiIntroduction: profile.aiIntroduction || '',
            aiRepresents: profile.aiRepresents || profile.brandName || profile.name || '',
            forbiddenClaims: profile.forbiddenClaims || [],
            industry: profile.industry,
            businessType: profile.businessType || 'goods',
            products: profile.products,
            locations: profile.locations,
            minOrder: profile.minOrder || '',
            pricing: profile.pricing || '',
            tone: profile.tone,
            businessRules: profile.businessRules,
            description: profile.description || profile.shortDescription || '',
            primaryGoal: profile.primaryGoal || '',
            website: profile.website || profile.contactInformation?.website || '',
            targetCustomers: profile.targetCustomers || profile.targetAudience || '',
            serviceArea: profile.serviceArea || profile.locations || '',
            businessEmail: profile.businessEmail || profile.contactInformation?.email || '',
            businessPhone: profile.businessPhone || profile.contactInformation?.phone || '',
            approval_mode: profile.approval_mode || 'human_approval_required',
            unknownQuestionBehavior: profile.unknownQuestionBehavior || 'human_approval',
            offerings: profile.offerings || [],
            differentiators: profile.differentiators || null,
            commercialInfo: profile.commercialInfo || null,
            deliveryService: profile.deliveryService || null,
            qualificationRules: profile.qualificationRules || null,
            salesQuestions: profile.salesQuestions || null,
            faqs: profile.faqs || [],
            policies: profile.policies || null,
            brandVoice: profile.brandVoice || null,
            humanHandoff: profile.humanHandoff || null,
            salesPlaybook: profile.salesPlaybook || null,
            faqData: profile.faqData || '',
            additionalKnowledge: profile.additionalKnowledge || profile.keyInformation || '',
            country: profile.country || '',
            currency: profile.currency || '',
            timezone: profile.timezone || '',
            locale: profile.locale || '',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      );
    }

    // Also sync public projection (NEVER write private company_profile to public_widgets or reserved official widget IDs)
    const widgetId = getOrCreateWidgetId(userId);
    if (!isReservedOfficialWidgetIdClient(widgetId)) {
      const publicSummary = {
        name: profile.brandName || profile.name || 'My Business',
        industry: profile.industry || 'Commercial Solutions',
        businessType: profile.businessType || 'goods',
        deploymentType: profile.deploymentType || 'BUSINESS',
      };
      tasks.push(
        setDoc(
          doc(db, 'public_widgets', widgetId),
          {
            widget_id: widgetId,
            user_id: userId,
            business_name: profile.name,
            public_summary: publicSummary,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        )
      );
    }

    await Promise.allSettled(tasks);

    // Prime the server-side widget runtime immediately
    syncWidgetConfigToServer(userId, profile, widgetId);
  } catch (err: any) {
    console.warn('Company profile saved locally; Firestore sync notice:', err?.message || err);
  }
}

function isIgnorableStreamEvent(err: any): boolean {
  if (!err) return true;
  const msg = err.message || String(err);
  const code = err.code;
  return (
    code === 'unavailable' ||
    code === 'cancelled' ||
    code === 1 ||
    msg.includes('offline') ||
    msg.includes('Disconnecting idle stream') ||
    msg.includes('CANCELLED') ||
    msg.includes('Timed out waiting for new targets')
  );
}

// 2. Inquiries / Leads persistence
export function subscribeToUserInquiries(
  userId: string,
  onData: (leads: InquiryLead[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const inquiriesRef = collection(db, 'users', userId, 'inquiries');
  return onSnapshot(
    inquiriesRef,
    (snapshot) => {
      const leads: InquiryLead[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          customer_name: d.customer_name || d.companyName || 'Inbound Lead',
          companyName: d.companyName || d.customer_name || 'Inbound Lead',
          contactName: d.contactName || '',
          source: d.source || 'Email',
          channel: d.channel || d.source || 'Email',
          lead_temperature: d.lead_temperature || d.lead_score || 'WARM',
          lead_score: d.lead_score || d.lead_temperature || 'WARM',
          lead_reason: d.lead_reason || d.temperature_reason || '',
          temperature_reason: d.temperature_reason || d.lead_reason || '',
          status: d.status || 'New',
          customer_intent: d.customer_intent || 'General Inquiry',
          original_message: d.original_message || d.raw_inquiry || '',
          raw_inquiry: d.raw_inquiry || d.original_message || '',
          product_or_service: d.product_or_service || 'Unknown',
          quantity: d.quantity || 'Unknown',
          location: d.location || 'Unknown',
          deadline: d.deadline || 'Unknown',
          budget: d.budget || 'Unknown',
          requirements: Array.isArray(d.requirements)
            ? d.requirements
            : d.requirements
            ? [d.requirements]
            : [],
          customer_facts: d.customer_facts || [],
          missing_information: Array.isArray(d.missing_information)
            ? d.missing_information
            : d.missing_information
            ? [d.missing_information]
            : ['None'],
          recommended_action: d.recommended_action || d.recommended_next_action || '',
          recommended_next_action: d.recommended_next_action || d.recommended_action || '',
          draft_reply: d.draft_reply || d.suggested_reply || '',
          suggested_reply: d.suggested_reply || d.draft_reply || '',
          sales_summary: d.sales_summary || '',
          created_at: d.created_at || new Date().toISOString(),
          last_action_at: d.last_action_at || new Date().toISOString(),
          rejection_reason: d.rejection_reason || '',
          structured_profile: d.structured_profile,
          inquiry_registered: d.inquiry_registered === true,
        };
      });
      // Sort newest first
      leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      onData(leads);
    },
    (err) => {
      if (!isIgnorableStreamEvent(err)) {
        console.warn('Inquiries subscription notice:', err);
      }
      if (onError && !isIgnorableStreamEvent(err)) onError(err);
    }
  );
}

export async function saveInquiry(userId: string, lead: InquiryLead): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'inquiries', lead.id);
    await setDoc(
      docRef,
      {
        user_id: userId,
        customer_name: lead.customer_name || lead.companyName,
        companyName: lead.companyName || lead.customer_name,
        contactName: lead.contactName || '',
        source: lead.source,
        channel: lead.channel || lead.source,
        lead_temperature: lead.lead_temperature || lead.lead_score || 'WARM',
        lead_score: lead.lead_score || lead.lead_temperature || 'WARM',
        lead_reason: lead.lead_reason || lead.temperature_reason || '',
        temperature_reason: lead.temperature_reason || lead.lead_reason || '',
        status: lead.status,
        customer_intent: lead.customer_intent,
        original_message: lead.original_message || lead.raw_inquiry,
        raw_inquiry: lead.raw_inquiry || lead.original_message,
        product_or_service: lead.product_or_service,
        quantity: lead.quantity,
        location: lead.location,
        deadline: lead.deadline,
        budget: lead.budget,
        requirements: Array.isArray(lead.requirements) ? lead.requirements : [lead.requirements],
        customer_facts: lead.customer_facts || [],
        missing_information: Array.isArray(lead.missing_information) ? lead.missing_information : [lead.missing_information],
        recommended_action: lead.recommended_action || lead.recommended_next_action,
        recommended_next_action: lead.recommended_next_action || lead.recommended_action,
        draft_reply: lead.draft_reply || lead.suggested_reply,
        suggested_reply: lead.suggested_reply || lead.draft_reply,
        sales_summary: lead.sales_summary || '',
        created_at: lead.created_at || new Date().toISOString(),
        last_action_at: lead.last_action_at || new Date().toISOString(),
        rejection_reason: lead.rejection_reason || '',
        structured_profile: lead.structured_profile || null,
        inquiry_registered: lead.inquiry_registered === true,
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Inquiry save queued locally:', err?.message || err);
  }
}

export async function updateInquiryStatus(
  userId: string,
  leadId: string,
  updates: Partial<InquiryLead>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'inquiries', leadId);
    const dataToUpdate: any = {
      ...updates,
      last_action_at: new Date().toISOString(),
    };
    await updateDoc(docRef, dataToUpdate);
  } catch (err: any) {
    console.warn('Inquiry status update queued locally:', err?.message || err);
  }
}

export async function deleteInquiry(userId: string, leadId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'inquiries', leadId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Inquiry deletion error:', err?.message || err);
  }
}

// 3. Activities persistence
export function subscribeToUserActivities(
  userId: string,
  onData: (activities: ActivityLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const activitiesRef = collection(db, 'users', userId, 'activities');
  return onSnapshot(
    activitiesRef,
    (snapshot) => {
      const activities: ActivityLog[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          leadId: d.leadId || '',
          employeeName: d.employeeName || 'Alpha',
          title: d.title || 'Operational Event',
          description: d.description || '',
          timestamp: d.timestamp || new Date().toISOString(),
          type: d.type || 'analysis',
        };
      });
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(activities);
    },
    (err) => {
      if (!isIgnorableStreamEvent(err)) {
        console.warn('Activities subscription notice:', err);
      }
      if (onError && !isIgnorableStreamEvent(err)) onError(err);
    }
  );
}

export async function logUserActivity(userId: string, activity: ActivityLog): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'activities', activity.id);
    await setDoc(
      docRef,
      {
        user_id: userId,
        leadId: activity.leadId || '',
        employeeName: activity.employeeName || 'Alpha',
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp || new Date().toISOString(),
        type: activity.type,
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Activity log queued locally:', err?.message || err);
  }
}

// 4. Tasks persistence
export function subscribeToUserTasks(
  userId: string,
  onData: (tasks: SalesTask[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const tasksRef = collection(db, 'users', userId, 'tasks');
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      const tasks: SalesTask[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          leadId: d.leadId || '',
          companyName: d.companyName || 'Inquiry',
          title: d.title || 'Review Inquiry',
          leadScore: d.leadScore || 'WARM',
          priority: d.priority || 'medium',
          dueDate: d.dueDate || 'Today',
          status: d.status || 'pending',
          actionType: d.actionType || 'approve_reply',
        };
      });
      onData(tasks);
    },
    (err) => {
      if (!isIgnorableStreamEvent(err)) {
        console.warn('Tasks subscription notice:', err);
      }
      if (onError && !isIgnorableStreamEvent(err)) onError(err);
    }
  );
}

export async function saveUserTask(userId: string, task: SalesTask): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(
      docRef,
      {
        user_id: userId,
        leadId: task.leadId,
        companyName: task.companyName,
        title: task.title,
        leadScore: task.leadScore,
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status,
        actionType: task.actionType,
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Task save queued locally:', err?.message || err);
  }
}

export async function completeUserTaskByLeadId(userId: string, leadId: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'tasks'));
    for (const taskDoc of snap.docs) {
      if (taskDoc.data().leadId === leadId) {
        await updateDoc(taskDoc.ref, { status: 'completed' });
      }
    }
  } catch (err: any) {
    console.warn('Complete task notice:', err?.message || err);
  }
}

// 5. Initialize clean user workspace safely without prior getDoc blocking
export async function initializeUserWorkspace(userId: string, userEmail: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        email: userEmail,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Retrieve existing cached profile if already present
    const cachedProfile = getLocalCache<CompanyProfile | null>(`aw_company_prof_${userId}`, null);
    const effectiveProfile = cachedProfile?.name && cachedProfile.name !== 'My Business' ? cachedProfile : defaultCompanyProfile;

    // Ensure default widget config exists without overwriting custom saved settings
    const defaultWidgetId = getOrCreateWidgetId(userId);
    const widgetDocRef = doc(db, 'users', userId, 'widget_config', 'default');
    const existingWidgetSnap = await getDoc(widgetDocRef);

    if (!existingWidgetSnap.exists()) {
      const defaultWidgetConfig = {
        widget_id: defaultWidgetId,
        business_name: effectiveProfile.name,
        welcome_message: `Hi there! 👋 Welcome to ${effectiveProfile.name}. How can Alpha assist you today?`,
        theme_color: '#0f172a',
        is_active: true,
        position: 'bottom-right' as const,
        updated_at: new Date().toISOString(),
      };

      await setDoc(widgetDocRef, defaultWidgetConfig);
      
      // Seed public widget projection if not present (without private company_profile)
      await setDoc(
        doc(db, 'public_widgets', defaultWidgetId),
        {
          widget_id: defaultWidgetId,
          user_id: userId,
          business_name: defaultWidgetConfig.business_name,
          welcome_message: defaultWidgetConfig.welcome_message,
          theme_color: defaultWidgetConfig.theme_color,
          public_summary: {
            name: effectiveProfile.name,
            industry: effectiveProfile.industry,
            businessType: effectiveProfile.businessType || 'goods',
            deploymentType: effectiveProfile.deploymentType || 'BUSINESS',
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err: any) {
    // If offline or network initializing, log gracefully as queued mutation
    console.warn('Workspace initialization queued locally:', err?.message || err);
  }
}

// 6. Widget Configuration Service (Database as Single Source of Truth)
export async function getWidgetConfig(userId: string): Promise<any> {
  const cacheKey = `aw_widget_cfg_${userId}`;
  const defaultWidgetId = getOrCreateWidgetId(userId);
  const defaultConfig = {
    widget_id: defaultWidgetId,
    business_name: 'My Business',
    welcome_message: 'Hi there! 👋 How can Alpha assist you today?',
    theme_color: '#0f172a',
    is_active: true,
    position: 'bottom-right',
    mode: 'attractive_3d',
    design_style: 'attractive_3d',
    launcherType: 'ai_workforce',
    primaryColor: '#0f172a',
    secondaryColor: '#475569',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    aiMessageColor: '#f1f5f9',
    aiMessageTextColor: '#0f172a',
    userMessageColor: '#0f172a',
    userMessageTextColor: '#ffffff',
    gradientEnabled: false,
    gradientType: 'none',
    gradientColor1: '#0f172a',
    gradientColor2: '#1e293b',
    gradientAngle: 135,
    launcherSize: 'medium',
    launcherShape: 'circle',
    borderRadius: 20,
    shadowIntensity: 'medium',
    glowIntensity: 'none',
    animationIntensity: 'subtle',
    launcherPosition: 'bottom-right',
  };

  // 1. Authoritatively fetch current database state via authenticated backend API
  try {
    const authHeaders = await getWorkspaceAuthHeaders();
    const res = await fetch(`/api/user/widget-config?user_id=${encodeURIComponent(userId)}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store',
        ...authHeaders,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.widget) {
        const merged = { ...defaultConfig, ...data.widget };
        setLocalCache(cacheKey, merged);
        return merged;
      }
    }
  } catch (apiErr) {
    console.warn('Backend API widget-config fetch notice, falling back to direct Firestore:', apiErr);
  }

  // 2. Direct Firestore fallback read
  try {
    const docRef = doc(db, 'users', userId, 'widget_config', 'default');
    const snap = await withRetry(() => getDoc(docRef), 1, 600);
    if (snap && snap.exists()) {
      const resolved = { ...defaultConfig, ...snap.data() };
      setLocalCache(cacheKey, resolved);
      return resolved;
    }

    if (defaultWidgetId) {
      const publicSnap = await withRetry(() => getDoc(doc(db, 'public_widgets', defaultWidgetId)), 1, 600);
      if (publicSnap && publicSnap.exists()) {
        const pData = publicSnap.data();
        const resolved = {
          ...defaultConfig,
          ...pData,
          widget_id: defaultWidgetId,
          business_name: pData.business_name || defaultConfig.business_name,
          welcome_message: pData.welcome_message || defaultConfig.welcome_message,
          theme_color: pData.theme_color || defaultConfig.theme_color,
          is_active: pData.is_active !== false,
          position: pData.position || 'bottom-right',
        };
        setLocalCache(cacheKey, resolved);
        return resolved;
      }
    }
  } catch (err: any) {
    console.warn('Direct Firestore widget config read notice:', err?.message || err);
  }

  // 3. Fallback to cached state
  return getLocalCache<any>(cacheKey, defaultConfig);
}

export async function saveWidgetConfig(userId: string, config: any): Promise<any> {
  const rawWidgetId = config.widget_id;
  if (rawWidgetId && isReservedOfficialWidgetIdClient(rawWidgetId)) {
    throw new Error('Forbidden: Cannot overwrite reserved official platform widget configuration.');
  }
  const widgetId = rawWidgetId || getOrCreateWidgetId(userId);
  const cacheKey = `aw_widget_cfg_${userId}`;
  const companyProf = getLocalCache<CompanyProfile | null>(`aw_company_prof_${userId}`, null);

  const payload = {
    ...config,
    user_id: userId,
    widget_id: widgetId,
    business_name: config.business_name,
    welcome_message: config.welcome_message,
    theme_color: config.theme_color || config.primaryColor || '#0f172a',
    is_active: config.is_active !== false,
    position: config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
    company_profile: companyProf || undefined,
  };

  // 1. Authenticated API request to server for database persistence and server authorization
  const authHeaders = await getWorkspaceAuthHeaders();
  const response = await fetch('/api/user/widget-config', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server failed to persist widget settings (HTTP ${response.status})`);
  }

  const result = await response.json();
  const savedWidget = result.widget || payload;

  // 2. Confirmed response: update local cache with authoritative saved state
  setLocalCache(cacheKey, savedWidget);

  // 3. Keep tenant-scoped Firestore docs in sync (never overwrite official platform doc, never expose company_profile)
  try {
    const docRef = doc(db, 'users', userId, 'widget_config', 'default');
    const publicDocRef = doc(db, 'public_widgets', widgetId);
    const { company_profile: _ignoredCompanyProfile, ...safePublicFields } = savedWidget;

    await Promise.allSettled([
      setDoc(
        docRef,
        {
          ...savedWidget,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      ),
      setDoc(
        publicDocRef,
        {
          ...safePublicFields,
          widget_id: widgetId,
          user_id: userId,
          public_summary: companyProf
            ? {
                name: companyProf.brandName || companyProf.name || savedWidget.business_name,
                industry: companyProf.industry,
                businessType: companyProf.businessType,
                deploymentType: companyProf.deploymentType,
              }
            : savedWidget.public_summary || null,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);
  } catch (fsErr) {
    console.warn('Firestore client SDK sync notice:', fsErr);
  }

  // 4. Dispatch tenant-scoped live broadcast so preview/embed for THIS widgetId updates cleanly
  if (typeof window !== 'undefined') {
    try {
      if (widgetId) {
        localStorage.setItem(`aw_widget_cfg_${widgetId}`, JSON.stringify(savedWidget));
      }
      window.dispatchEvent(new CustomEvent('aiworkforce:widget_config_updated', { detail: savedWidget }));
      try {
        const bc = new BroadcastChannel('aiworkforce_widget_sync');
        bc.postMessage({ type: 'WIDGET_CONFIG_UPDATED', config: savedWidget });
        bc.close();
      } catch {}
    } catch {}
  }

  return savedWidget;
}

// 7. Multi-Layer Email Validation & Real Inquiry Dispatch Interfaces & Methods
export interface ValidateEmailResponse {
  valid: boolean;
  email: string;
  domain?: string;
  errorType?: string;
  message: string;
  details?: any;
}

export async function validateRecipientEmail(email: string): Promise<ValidateEmailResponse> {
  try {
    const res = await fetch('/api/validate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        valid: false,
        email,
        errorType: err.errorType || 'invalid_format',
        message: err.message || 'Validation request failed',
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      valid: false,
      email,
      errorType: 'network_error',
      message: 'Network error validating recipient email',
    };
  }
}

export interface SendInquiryReplyParams {
  userId: string;
  leadId: string;
  recipientEmail: string;
  subject: string;
  replyText: string;
  senderName?: string;
  senderEmail?: string;
  googleAccessToken?: string;
  idempotencyKey?: string;
}

export interface SendInquiryReplyResponse {
  success: boolean;
  status: 'accepted' | 'published' | 'failed';
  published?: boolean;
  email_dispatched?: boolean;
  email_status?: string;
  email_error?: string;
  provider?: string;
  email_provider?: string;
  provider_message_id?: string;
  sent_at?: string;
  recipient?: string;
  error?: string;
  error_type?: string;
  already_sent?: boolean;
}

export async function sendInquiryEmailReply(params: SendInquiryReplyParams): Promise<SendInquiryReplyResponse> {
  const authHeaders = await getWorkspaceAuthHeaders();
  const res = await fetch('/api/inquiries/send-reply', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      status: 'failed',
      error: data.error || `Dispatch failed (HTTP ${res.status})`,
      error_type: data.error_type,
      already_sent: data.already_sent,
      provider_message_id: data.provider_message_id,
      sent_at: data.sent_at,
    };
  }

  return data;
}

// 7. Website Chat Conversations Service
export async function saveConversation(userId: string, conversation: any): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'conversations', conversation.id);
    await setDoc(
      docRef,
      {
        ...conversation,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Conversation save queued locally:', err?.message || err);
  }
}

export async function getUserConversation(userId: string, conversationId: string): Promise<any | null> {
  if (!userId || !conversationId) return null;
  try {
    const docRef = doc(db, 'users', userId, 'conversations', conversationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err: any) {
    console.warn('Could not fetch user conversation:', err?.message || err);
  }
  return null;
}

export function subscribeToUserConversations(
  userId: string,
  onData: (conversations: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'conversations');
  const q = query(colRef, orderBy('updated_at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const convs = snapshot.docs.map((d) => d.data());
      onData(convs);
    },
    (err) => {
      if (!isIgnorableStreamEvent(err)) {
        console.warn('Conversations subscription notice:', err);
      }
      if (onError && !isIgnorableStreamEvent(err)) onError(err);
    }
  );
}

// 8. Website Leads Service (Visitors showing meaningful sales interest)
export async function saveLead(userId: string, lead: any): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'leads', lead.id || lead.lead_id);
    await setDoc(
      docRef,
      {
        ...lead,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Lead save queued locally:', err?.message || err);
  }
}

export function subscribeToUserLeads(
  userId: string,
  onData: (leads: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'leads');
  const q = query(colRef, orderBy('updated_at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs.map((d) => d.data());
      onData(leads);
    },
    (err) => {
      if (!isIgnorableStreamEvent(err)) {
        console.warn('Leads subscription notice:', err);
      }
      if (onError && !isIgnorableStreamEvent(err)) onError(err);
    }
  );
}


