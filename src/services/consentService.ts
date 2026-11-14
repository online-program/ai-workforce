/**
 * AI Workforce — Cookie Consent & Privacy Controls Service
 * 
 * Manages user consent decisions across 4 distinct categories:
 * - strictly necessary (essential security, auth, core chat functionality)
 * - preferences (theme persistence, UI sound toggles, draft caches)
 * - analytics (session metrics, request performance, feature usage)
 * - marketing (third-party advertising - currently none used by AI Workforce)
 * 
 * Enforces technical restrictions immediately upon consent change, validates
 * schema & versioning, and provides clean event listeners for UI components.
 */

export const CONSENT_STORAGE_KEY = 'aiw_cookie_consent_v1';
export const CONSENT_VERSION = 1;

export interface ConsentCategories {
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentDecision = 'all' | 'essential_only' | 'custom';

export interface ConsentRecord {
  version: number;
  timestamp: string;
  categories: ConsentCategories;
  decision: ConsentDecision;
}

export interface CategoryInfo {
  id: keyof ConsentCategories;
  name: string;
  badge: 'Always Active' | 'Optional';
  required: boolean;
  summary: string;
  details: string[];
  inUse: boolean;
}

export const CATEGORY_DEFINITIONS: Record<keyof ConsentCategories, CategoryInfo> = {
  necessary: {
    id: 'necessary',
    name: 'Strictly Necessary',
    badge: 'Always Active',
    required: true,
    summary: 'Essential storage required for the website and conversational AI to function securely.',
    details: [
      'Firebase Authentication session credentials and account security verification',
      'Active conversational message history during live AI employee sessions',
      'Protection against automated spam, rate abuse, and cross-site request forgery',
      'Consent record persistence so your privacy preferences are remembered',
    ],
    inUse: true,
  },
  preferences: {
    id: 'preferences',
    name: 'Preferences',
    badge: 'Optional',
    required: false,
    summary: 'Remembers your interface settings so you don’t have to reconfigure them every visit.',
    details: [
      'Interface theme preference (Dark, Light, or System-matched)',
      'Audio notification mute state for chat and admin notification chimes',
      'Unsaved widget studio visual customizations and design drafts',
    ],
    inUse: true,
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics & Performance',
    badge: 'Optional',
    required: false,
    summary: 'Measures website performance, request latency, and conversational completion rates.',
    details: [
      'First-party anonymized visitor session counts and widget open rates',
      'AI model response latency and streaming throughput diagnostics',
      'Aggregated lead qualification funnel performance (no cross-site tracking)',
    ],
    inUse: true,
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing & Advertising',
    badge: 'Optional',
    required: false,
    summary: 'Third-party advertising and cross-site remarketing tracking.',
    details: [
      'AI Workforce does NOT currently load or use third-party advertising cookies or cross-site pixels',
      'This category is included for transparency and stays disabled by default',
    ],
    inUse: false,
  },
};

/**
 * Checks if a valid, uncorrupted, and current-version consent record exists in localStorage.
 */
export function getStoredConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.version === CONSENT_VERSION &&
      parsed.categories &&
      typeof parsed.categories.necessary === 'boolean' &&
      typeof parsed.categories.preferences === 'boolean' &&
      typeof parsed.categories.analytics === 'boolean' &&
      typeof parsed.categories.marketing === 'boolean' &&
      typeof parsed.timestamp === 'string'
    ) {
      // Force necessary to always remain true
      parsed.categories.necessary = true;
      return parsed as ConsentRecord;
    }
  } catch (err) {
    console.warn('[ConsentService] Failed to read stored consent record:', err);
  }

  return null;
}

/**
 * Returns true if the visitor has explicitly made a consent choice.
 */
export function hasGivenConsent(): boolean {
  return getStoredConsent() !== null;
}

/**
 * Checks if a specific consent category is permitted.
 * If consent has not yet been given, only 'necessary' is allowed.
 */
export function hasCategoryConsent(category: keyof ConsentCategories): boolean {
  if (category === 'necessary') return true;
  const stored = getStoredConsent();
  if (!stored) return false;
  return Boolean(stored.categories[category]);
}

/**
 * Saves consent record and immediately triggers enforcement.
 */
export function saveConsent(
  decision: ConsentDecision,
  categories?: Partial<ConsentCategories>
): { success: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot save consent outside browser environment' };
  }

  let finalCategories: ConsentCategories;

  if (decision === 'all') {
    finalCategories = {
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
    };
  } else if (decision === 'essential_only') {
    finalCategories = {
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
    };
  } else {
    finalCategories = {
      necessary: true, // Always locked
      preferences: Boolean(categories?.preferences),
      analytics: Boolean(categories?.analytics),
      marketing: Boolean(categories?.marketing),
    };
  }

  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: finalCategories,
    decision,
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('[ConsentService] Failed to persist consent record in localStorage:', err);
    return {
      success: false,
      error: 'Storage quota exceeded or browser privacy mode prevented saving. Please check your browser storage settings.',
    };
  }

  // Enforce policies across storage and scripts
  enforceConsentPolicies(finalCategories);

  // Dispatch custom event for reactive UI updates
  try {
    window.dispatchEvent(new CustomEvent('aiw:consent_changed', { detail: record }));
  } catch {}

  return { success: true };
}

/**
 * Technically cleans up disallowed data when consent categories are revoked.
 */
export function enforceConsentPolicies(categories: ConsentCategories): void {
  if (typeof window === 'undefined') return;

  // 1. Enforce Preferences category
  if (!categories.preferences) {
    try {
      // Remove optional preference storage items
      localStorage.removeItem('ai_workforce_theme_mode');
      localStorage.removeItem('aiw_chat_muted');
      localStorage.removeItem('aiw_handoff_sound');
      // Note: We DO NOT remove user's active auth session or essential chat messages
    } catch {}
  }

  // 2. Enforce Analytics category
  if (!categories.analytics) {
    try {
      // Set memory flag on window so all telemetry calls abort immediately
      (window as any).__AIW_ANALYTICS_OPT_OUT = true;
      // Remove any optional client telemetry tokens
      localStorage.removeItem('aiw_analytics_session');
    } catch {}
  } else {
    (window as any).__AIW_ANALYTICS_OPT_OUT = false;
  }

  // 3. Enforce Marketing category
  if (!categories.marketing) {
    // If any third-party marketing tags are ever injected, disable them here
    (window as any).__AIW_MARKETING_OPT_OUT = true;
  } else {
    (window as any).__AIW_MARKETING_OPT_OUT = false;
  }
}

/**
 * Open the Cookie Settings modal programmatically (e.g. from footer or settings page).
 */
export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('aiw:open_cookie_settings'));
}

/**
 * Subscribe to consent changes.
 */
export function onConsentChanged(listener: (consent: ConsentRecord) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: any) => {
    if (e.detail) listener(e.detail);
  };
  window.addEventListener('aiw:consent_changed', handler);
  return () => window.removeEventListener('aiw:consent_changed', handler);
}

/**
 * Subscribe to requests to open the cookie settings modal.
 */
export function onOpenCookieSettings(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('aiw:open_cookie_settings', listener);
  return () => window.removeEventListener('aiw:open_cookie_settings', listener);
}
