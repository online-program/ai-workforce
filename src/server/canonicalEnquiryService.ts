import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';

const MAX_MEMORY_ENQUIRIES = 2000;
export const memoryEnquiryStore = new Map<string, CanonicalEnquiry>();

function setBoundedEnquiry(enquiry: CanonicalEnquiry) {
  const scopedKey = `${enquiry.tenant_id}::${enquiry.inquiry_id}`;
  if (memoryEnquiryStore.size >= MAX_MEMORY_ENQUIRIES && !memoryEnquiryStore.has(scopedKey)) {
    const oldestKey = memoryEnquiryStore.keys().next().value;
    if (oldestKey) memoryEnquiryStore.delete(oldestKey);
  }
  memoryEnquiryStore.set(scopedKey, enquiry);
}

export type CanonicalIntentType =
  | 'general_conversation'
  | 'product_question'
  | 'pricing_question'
  | 'purchase_intent'
  | 'sales_enquiry'
  | 'quote_request'
  | 'contact_request'
  | 'human_handoff_request'
  | 'support_request'
  | 'incomplete_enquiry'
  | 'spam';

export interface CanonicalEnquiry {
  inquiry_id: string;
  tenant_id: string;
  widget_id: string;
  conversation_id: string;
  visitor_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  product_or_service: string | null;
  requirement: string | null;
  quantity: string | null;
  budget: string | null;
  timeline: string | null;
  location: string | null;
  additional_notes: string | null;
  original_message: string;
  intent_type: CanonicalIntentType;
  qualification_status: 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED';
  enquiry_status: 'New' | 'Incomplete' | 'Needs Approval' | 'Human Review' | 'Waiting for Customer' | 'Qualified' | 'Won' | 'Lost' | 'Rejected';
  source: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  assigned_to: string | null;
  metadata: Record<string, any>;
}

export interface EnquiryPersistenceResult {
  success: boolean;
  db_confirmed: boolean;
  inquiry_id: string;
  enquiry: CanonicalEnquiry | null;
  error?: string;
  is_duplicate?: boolean;
}

const GENERIC_NON_NAMES = new Set([
  'web development',
  'website',
  'website development',
  'app development',
  'software',
  'interested',
  'unknown',
  'visitor',
  'customer',
  'client',
  'anonymous',
  'n/a',
  'none',
  'na',
  'test',
]);

export function validateEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  return emailRegex.test(trimmed) ? trimmed : null;
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 7 || cleaned.length > 16) return null;
  return phone.trim();
}

export function normalizeCustomerName(name?: string | null): string | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return null;
  if (GENERIC_NON_NAMES.has(trimmed.toLowerCase())) return null;
  // Reject if it looks like a sentence or a number/timeline
  if (trimmed.split(/\s+/).length > 5) return null;
  if (/^\d+\s*(weeks?|days?|months?|years?)$/i.test(trimmed)) return null;
  if (validateEmail(trimmed) || normalizePhone(trimmed)) return null;
  return trimmed;
}

export function normalizeQuantity(qty?: string | null): string | null {
  if (!qty || typeof qty !== 'string') return null;
  const trimmed = qty.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null;
  // Reject if it's actually a sentence like "I want a website"
  if (/^(i want|i need|looking for|we need)/i.test(trimmed)) return null;
  // Reject if it's clearly a timeline
  if (/^\d+\s*(weeks?|days?|months?|years?)$/i.test(trimmed)) return null;
  return trimmed;
}

export function normalizeTimeline(timeline?: string | null): string | null {
  if (!timeline || typeof timeline !== 'string') return null;
  const trimmed = timeline.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
}

export function normalizeBudget(budget?: string | null): string | null {
  if (!budget || typeof budget !== 'string') return null;
  const trimmed = budget.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
}

export function classifyVisitorIntent(message: string, aiIntent?: string): CanonicalIntentType {
  const lower = (message || '').toLowerCase().trim();
  if (!lower || lower.length < 2) return 'spam';

  // Negative handoff check: "I don't want to speak to a human" / "I do not want to speak to a real person"
  const negatedHuman = /\b(don't|do not|dont|never|no|not|wouldn't|would not|rather not)\b.{0,45}\b(human|person|agent|representative|someone|call)\b/i.test(lower);
  if (!negatedHuman && /\b(speak to (?:a\s+)?(?:real\s+)?(?:human|person)|talk to (?:a\s+)?(?:real\s+)?(?:human|person)|real person|human agent|call me|phone call|email me|follow up)\b/i.test(lower)) {
    return 'human_handoff_request';
  }

  // Negative buying check: "The price is interesting, but I'm not buying"
  if (/\b(not buying|just looking|just browsing|not ready to buy|no pitch)\b/i.test(lower)) {
    if (/\b(price|cost|pricing|how much)\b/i.test(lower)) return 'pricing_question';
    return 'general_conversation';
  }

  if (/\b(quote|quotation|proposal|estimate|custom pricing)\b/i.test(lower)) {
    return 'quote_request';
  }

  if (/\b(buy|purchase|order|sign up|get started|hire|book a demo|schedule a call|want a website|need a website|looking for)\b/i.test(lower)) {
    return 'sales_enquiry';
  }

  if (/\b(price|pricing|cost|how much|fee|rates)\b/i.test(lower)) {
    return 'pricing_question';
  }

  if (/\b(support|help|broken|issue|error|bug|refund|cancel)\b/i.test(lower)) {
    return 'support_request';
  }

  if (aiIntent === 'HUMAN_HANDOFF_REQUEST' && !negatedHuman) return 'human_handoff_request';
  if (aiIntent === 'SALES_INQUIRY' || aiIntent === 'LEAD_QUALIFICATION') return 'sales_enquiry';
  if (aiIntent === 'PRICING_QUERY') return 'pricing_question';
  if (aiIntent === 'PRODUCT_QUERY') return 'product_question';

  return 'general_conversation';
}

export function shouldRegisterEnquiry(intent: CanonicalIntentType, hasContactInfo: boolean): boolean {
  if (intent === 'sales_enquiry' || intent === 'quote_request' || intent === 'purchase_intent' || intent === 'contact_request') {
    return true;
  }
  if (intent === 'human_handoff_request' && hasContactInfo) {
    return true;
  }
  return false;
}

export function normalizeEnquiry(input: {
  tenant_id: string;
  widget_id: string;
  conversation_id: string;
  visitor_id: string;
  original_message: string;
  intent_type: CanonicalIntentType;
  extracted: Record<string, any>;
  lead_score?: 'HOT' | 'WARM' | 'COLD';
  source?: string;
  existing?: Partial<CanonicalEnquiry> | null;
}): CanonicalEnquiry {
  const now = new Date().toISOString();
  const ex = input.extracted || {};
  const existing = input.existing || {};

  const customer_email = validateEmail(ex.email || ex.customer_email) || existing.customer_email || null;
  const customer_phone = normalizePhone(ex.phone || ex.customer_phone) || existing.customer_phone || null;
  const customer_name = normalizeCustomerName(ex.customer_name || ex.name) || existing.customer_name || null;
  const company_name = normalizeCustomerName(ex.company_name || ex.company) || existing.company_name || null;

  const product_or_service = (ex.product_or_service && !/^\d+\s*(weeks?|days?|months?)$/i.test(String(ex.product_or_service)))
    ? String(ex.product_or_service).trim()
    : (existing.product_or_service || null);

  const requirement = ex.requirement ? String(ex.requirement).trim() : (existing.requirement || input.original_message);
  const quantity = normalizeQuantity(ex.quantity) || existing.quantity || null;
  const budget = normalizeBudget(ex.budget) || existing.budget || null;
  const timeline = normalizeTimeline(ex.timeline) || existing.timeline || null;
  const location = ex.location ? String(ex.location).trim() : (existing.location || null);

  const hasContact = Boolean(customer_email || customer_phone);
  const enquiry_status = existing.enquiry_status || (hasContact ? 'Needs Approval' : 'Incomplete');

  return {
    inquiry_id: existing.inquiry_id || `inq_${input.conversation_id}`,
    tenant_id: input.tenant_id,
    widget_id: input.widget_id,
    conversation_id: input.conversation_id,
    visitor_id: input.visitor_id,
    customer_name,
    customer_email,
    customer_phone,
    company_name,
    product_or_service,
    requirement,
    quantity,
    budget,
    timeline,
    location,
    additional_notes: ex.additional_notes || existing.additional_notes || null,
    original_message: existing.original_message || input.original_message,
    intent_type: input.intent_type,
    qualification_status: input.lead_score || existing.qualification_status || 'WARM',
    enquiry_status,
    source: input.source || existing.source || 'Website',
    created_at: existing.created_at || now,
    updated_at: now,
    last_activity_at: now,
    assigned_to: existing.assigned_to || null,
    metadata: {
      ...(existing.metadata || {}),
      ...(ex.metadata || {}),
      canonical_version: 2,
    },
  };
}

export async function persistCanonicalEnquiry(enquiry: CanonicalEnquiry): Promise<EnquiryPersistenceResult> {
  const isValValid = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (lower === '' || lower === 'unknown' || lower === 'n/a' || lower === 'none' || lower === 'null' || lower === 'undefined') {
        return false;
      }
    }
    return true;
  };

  const scopedKey = `${enquiry.tenant_id}::${enquiry.inquiry_id}`;
  const existingMemory = memoryEnquiryStore.get(scopedKey);

  // If no admin credentials configured, cannot confirm durable database persistence
  if (!hasAdminCredentials()) {
    const merged: CanonicalEnquiry = {
      ...enquiry,
      created_at: existingMemory?.created_at || enquiry.created_at,
      original_message: existingMemory?.original_message || enquiry.original_message,
      customer_name: isValValid(enquiry.customer_name) ? enquiry.customer_name : (existingMemory?.customer_name || null),
      customer_email: isValValid(enquiry.customer_email) ? enquiry.customer_email : (existingMemory?.customer_email || null),
      customer_phone: isValValid(enquiry.customer_phone) ? enquiry.customer_phone : (existingMemory?.customer_phone || null),
      company_name: isValValid(enquiry.company_name) ? enquiry.company_name : (existingMemory?.company_name || null),
      product_or_service: isValValid(enquiry.product_or_service) ? enquiry.product_or_service : (existingMemory?.product_or_service || null),
      requirement: isValValid(enquiry.requirement) ? enquiry.requirement : (existingMemory?.requirement || null),
      quantity: isValValid(enquiry.quantity) ? enquiry.quantity : (existingMemory?.quantity || null),
      budget: isValValid(enquiry.budget) ? enquiry.budget : (existingMemory?.budget || null),
      timeline: isValValid(enquiry.timeline) ? enquiry.timeline : (existingMemory?.timeline || null),
      location: isValValid(enquiry.location) ? enquiry.location : (existingMemory?.location || null),
      additional_notes: isValValid(enquiry.additional_notes) ? enquiry.additional_notes : (existingMemory?.additional_notes || null),
    };

    setBoundedEnquiry(merged);
    return {
      success: false,
      db_confirmed: false,
      inquiry_id: merged.inquiry_id,
      enquiry: merged,
      is_duplicate: Boolean(existingMemory),
      error: 'Durable database credentials unavailable; stored only in temporary process memory.',
    };
  }

  try {
    const db = getAdminDb();
    const inquiryRef = db.collection('users').doc(enquiry.tenant_id).collection('inquiries').doc(enquiry.inquiry_id);
    const leadRef = db.collection('users').doc(enquiry.tenant_id).collection('leads').doc(enquiry.inquiry_id);

    const existingSnap = await inquiryRef.get();
    const existingData = existingSnap.exists ? (existingSnap.data() as Partial<CanonicalEnquiry>) : existingMemory;

    // Preserve created_at, original_message, and all existing non-null extracted fields
    const merged: CanonicalEnquiry = {
      ...enquiry,
      created_at: existingData?.created_at || enquiry.created_at,
      original_message: existingData?.original_message || enquiry.original_message,
      customer_name: isValValid(enquiry.customer_name) ? enquiry.customer_name : (existingData?.customer_name || null),
      customer_email: isValValid(enquiry.customer_email) ? enquiry.customer_email : (existingData?.customer_email || null),
      customer_phone: isValValid(enquiry.customer_phone) ? enquiry.customer_phone : (existingData?.customer_phone || null),
      company_name: isValValid(enquiry.company_name) ? enquiry.company_name : (existingData?.company_name || null),
      product_or_service: isValValid(enquiry.product_or_service) ? enquiry.product_or_service : (existingData?.product_or_service || null),
      requirement: isValValid(enquiry.requirement) ? enquiry.requirement : (existingData?.requirement || null),
      quantity: isValValid(enquiry.quantity) ? enquiry.quantity : (existingData?.quantity || null),
      budget: isValValid(enquiry.budget) ? enquiry.budget : (existingData?.budget || null),
      timeline: isValValid(enquiry.timeline) ? enquiry.timeline : (existingData?.timeline || null),
      location: isValValid(enquiry.location) ? enquiry.location : (existingData?.location || null),
      additional_notes: isValValid(enquiry.additional_notes) ? enquiry.additional_notes : (existingData?.additional_notes || null),
    };

    const batch = db.batch();
    batch.set(inquiryRef, merged, { merge: true });
    batch.set(
      leadRef,
      {
        ...merged,
        id: merged.inquiry_id,
        userId: merged.tenant_id,
        lead_score: merged.qualification_status,
        status: merged.enquiry_status,
        timestamp: merged.created_at,
        contact_info: merged.customer_email || merged.customer_phone || 'Not provided',
        raw_message: merged.original_message,
      },
      { merge: true }
    );

    await batch.commit();
    setBoundedEnquiry(merged);

    return {
      success: true,
      db_confirmed: true,
      inquiry_id: merged.inquiry_id,
      enquiry: merged,
      is_duplicate: Boolean(existingData),
    };
  } catch (err: any) {
    console.error('[CanonicalEnquiry] Persistence failed:', err?.message || err);
    return {
      success: false,
      db_confirmed: false,
      inquiry_id: enquiry.inquiry_id,
      enquiry: null,
      error: err?.message || 'Failed to persist enquiry to Firestore.',
    };
  }
}
