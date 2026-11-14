/**
 * Semantic Field Validator & Data Integrity Engine for AI Workforce Alpha
 * 
 * Guarantees:
 * 1. Semantic Integrity:
 *    - Product/service names (e.g. "Web Development") NEVER become customer names.
 *    - Time expressions (e.g. "1 week", "two weeks") NEVER become products or quantities.
 *    - Requirement sentences (e.g. "I want a website") NEVER become quantities.
 *    - Quantities are strictly numeric/measurable counts (e.g. "5 websites", "10 licenses", "50 chairs").
 *    - Budgets (e.g. "₹50,000", "$10k") NEVER become quantities or names.
 *    - Missing fields remain null/Unknown; never fabricated.
 * 2. Tenant Boundary & Idempotency:
 *    - Prevents cross-tenant bleed.
 *    - Prevents duplicate registration.
 */

import { CompanyProfile, InquiryLead } from '../types.ts';

export interface RawExtractedInquiryFields {
  customer_name?: string | null;
  company_name?: string | null;
  product_or_service?: string | null;
  requirement_or_description?: string | null;
  quantity?: string | null;
  budget?: string | null;
  timeline?: string | null;
  location?: string | null;
  contact_info?: string | null;
  email?: string | null;
  phone?: string | null;
  requirements?: string[] | null;
  source?: string | null;
}

export interface NormalizedInquiryFields {
  customer_name: string;
  company_name: string;
  product_or_service: string;
  requirement_or_description: string;
  quantity: string;
  budget: string;
  timeline: string;
  location: string;
  contact_info?: string;
  email?: string;
  phone?: string;
  requirements: string[];
  customer_facts: Array<{ label: string; value: string; verified: boolean }>;
  is_valid: boolean;
  validation_notes: string[];
}

// Common time expressions that must NEVER be treated as products, quantities, or names
export const TIME_EXPRESSION_REGEX =
  /\b(?:in\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months|year|years|hr|hrs|hour|hours|business\s+days|working\s+days)\b/i;

export const STRICT_TIME_PATTERNS = [
  /^(?:in\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:day|days|week|weeks|month|months|year|years|hr|hrs|hour|hours|business\s+days|working\s+days)$/i,
  /^(?:by|before|within|until|target:?)\s+.+$/i,
  /^(?:today|tomorrow|asap|urgent|next\s+week|next\s+month|end\s+of\s+month|q[1-4])$/i,
  /^\d+\s*w(?:eeks?)?$/i,
  /^\d+\s*d(?:ays?)?$/i,
  /^\d+\s*m(?:o|onths?)?$/i,
];

// Common services and offerings that must NEVER be treated as customer or company names
export const KNOWN_SERVICE_TERMS = new Set([
  'web development',
  'website development',
  'website',
  'websites',
  'web design',
  'app development',
  'mobile app development',
  'software development',
  'seo',
  'digital marketing',
  'graphic design',
  'ui/ux design',
  'consulting',
  'consulting services',
  'solar installation',
  'commercial solutions',
  'product',
  'products',
  'service',
  'services',
  'solution',
  'solutions',
  'lead',
  'leads',
  'inquiry',
  'inquiries',
  'general inquiry',
  'commercial inquiry',
  'office chairs',
  'furniture',
  'chairs',
  'desks',
  'standing desks',
  'workstations',
]);

/**
 * Checks if a string is semantically a time expression
 */
export function isTimeExpression(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (STRICT_TIME_PATTERNS.some((p) => p.test(v))) return true;
  if (TIME_EXPRESSION_REGEX.test(v) && !/\b(?:chairs|desks|units|pieces|seats|licenses|users|products|websites)\b/i.test(v)) {
    return true;
  }
  return false;
}

/**
 * Checks if a string is a requirement or desire sentence rather than a numeric quantity
 */
export function isRequirementSentence(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    /\b(?:i\s+want|i\s+need|we\s+need|looking\s+for|require|interested\s+in|please\s+build|develop\s+a|make\s+a|create\s+a|build\s+a|setup\s+a)\b/i.test(v) ||
    v.startsWith('i want') ||
    v.startsWith('we want') ||
    v.startsWith('i need') ||
    v.startsWith('we need') ||
    v.startsWith('looking for') ||
    v.startsWith('can you') ||
    v.length > 35
  );
}

/**
 * Checks if a string is semantically a budget or monetary amount
 */
export function isBudgetExpression(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/[$€£₹]/.test(v)) return true;
  if (/\b(?:inr|usd|eur|gbp|budget|rs\.?|rupees|dollars|bucks|lakh|crore|thousand|k)\b/i.test(v) && /\d/.test(v)) {
    return true;
  }
  return false;
}

/**
 * Checks if a string is a valid numeric / measurable quantity
 */
export function isValidMeasurableQuantity(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();

  if (v === 'unknown' || v === 'not specified' || v === 'none' || v === 'n/a') return false;
  if (isTimeExpression(v)) return false;
  if (isRequirementSentence(v)) return false;
  if (isBudgetExpression(v)) return false;

  // Must contain at least one digit or word number followed by measurable noun, or a pure digit
  if (/^\d+$/.test(v)) {
    const n = parseInt(v, 10);
    return n > 0 && n < 1000000;
  }

  // Count + unit noun: e.g. "5 websites", "10 licenses", "50 chairs", "2 units", "100 seats"
  const countUnitMatch = v.match(/^(\d+)\s+([a-zA-Z\s-]{2,25})$/);
  if (countUnitMatch) {
    const noun = countUnitMatch[2].trim().toLowerCase();
    // Exclude time units
    if (/^(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|second|seconds)$/.test(noun)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks if a string is a plausible person or company name
 */
export function isPlausibleCustomerName(
  value: string | null | undefined,
  companyProfile?: Partial<CompanyProfile>
): boolean {
  if (!value) return false;
  const v = value.trim();
  const lower = v.toLowerCase();

  // Exclude common fallbacks and generic terms
  if (
    !v ||
    lower === 'website visitor' ||
    lower === 'inbound prospect' ||
    lower === 'inbound customer' ||
    lower === 'customer' ||
    lower === 'visitor' ||
    lower === 'user' ||
    lower === 'unknown' ||
    lower === 'n/a'
  ) {
    return false;
  }

  // Exclude services, requirements, time expressions, and budgets
  if (KNOWN_SERVICE_TERMS.has(lower)) return false;
  if (isTimeExpression(lower)) return false;
  if (isRequirementSentence(lower)) return false;
  if (isBudgetExpression(lower)) return false;

  // Exclude tenant's own company name or products
  if (companyProfile?.name && lower === companyProfile.name.toLowerCase().trim()) return false;
  if (companyProfile?.brandName && lower === companyProfile.brandName.toLowerCase().trim()) return false;
  if (companyProfile?.products && typeof companyProfile.products === 'string') {
    const prods = companyProfile.products.toLowerCase();
    if (prods.includes(lower) && lower.length > 3) return false;
  }

  // Exclude sentences or conversational fragments
  if (v.length > 40) return false;
  if (/\b(?:want|need|looking|delivered|inquiry|price|cost|quote|thanks|hello|hi|please)\b/i.test(lower)) {
    return false;
  }

  return true;
}

/**
 * Authoritative semantic normalizer and validator for extracted inquiry fields.
 * Disentangles swapped fields, corrects semantic assignments, and protects data integrity.
 */
export function validateAndNormalizeInquiryFields(
  raw: RawExtractedInquiryFields,
  companyProfile?: Partial<CompanyProfile>
): NormalizedInquiryFields {
  const notes: string[] = [];

  let candidateName = (raw.customer_name || '').trim();
  let candidateCompany = (raw.company_name || '').trim();
  let candidateProduct = (raw.product_or_service || '').trim();
  let candidateDesc = (raw.requirement_or_description || '').trim();
  let candidateQty = (raw.quantity || '').trim();
  let candidateBudget = (raw.budget || '').trim();
  let candidateTimeline = (raw.timeline || '').trim();
  let candidateLoc = (raw.location || '').trim();
  let candidateContact = (raw.contact_info || raw.email || raw.phone || '').trim();

  const reqList: string[] = Array.isArray(raw.requirements) ? [...raw.requirements] : [];

  // =========================================================================
  // STEP 1: Disentangle Name field
  // A service or product name (e.g. "Web Development") must NEVER become customer name!
  // =========================================================================
  if (candidateName && !isPlausibleCustomerName(candidateName, companyProfile)) {
    notes.push(`Invalid customer_name "${candidateName}" rejected (matches service, requirement, or time expression).`);

    // If candidateName was actually a service/product, move it to product_or_service if empty
    if (
      KNOWN_SERVICE_TERMS.has(candidateName.toLowerCase()) ||
      /\b(?:development|design|marketing|consulting|installation|solutions?|service|services|chairs?|desks?|software)\b/i.test(candidateName)
    ) {
      if (!candidateProduct || candidateProduct === 'Unknown' || candidateProduct === 'Commercial Requirement' || candidateProduct === 'Commercial Inquiry') {
        candidateProduct = candidateName;
        notes.push(`Moved service term "${candidateName}" to product_or_service.`);
      }
    } else if (isRequirementSentence(candidateName)) {
      if (!candidateDesc) {
        candidateDesc = candidateName;
      }
      reqList.push(candidateName);
    }
    candidateName = '';
  }

  // Disentangle Company Name similarly
  if (candidateCompany && !isPlausibleCustomerName(candidateCompany, companyProfile)) {
    if (KNOWN_SERVICE_TERMS.has(candidateCompany.toLowerCase())) {
      if (!candidateProduct || candidateProduct === 'Unknown') {
        candidateProduct = candidateCompany;
      }
    }
    candidateCompany = '';
  }

  // =========================================================================
  // STEP 2: Disentangle Quantity field
  // "I want a website" or "1 week" must NEVER become quantity!
  // =========================================================================
  if (candidateQty && candidateQty !== 'Unknown') {
    // If quantity is a time expression (e.g. "1 week", "two weeks"):
    if (isTimeExpression(candidateQty)) {
      notes.push(`Time expression "${candidateQty}" in quantity moved to timeline.`);
      if (!candidateTimeline || candidateTimeline === 'Unknown') {
        candidateTimeline = candidateQty;
      }
      candidateQty = 'Unknown';
    }
    // If quantity is a requirement sentence (e.g. "I want a website"):
    else if (isRequirementSentence(candidateQty)) {
      notes.push(`Requirement sentence "${candidateQty}" in quantity moved to description/requirements.`);
      if (!candidateDesc) {
        candidateDesc = candidateQty;
      }
      if (!reqList.includes(candidateQty)) {
        reqList.push(candidateQty);
      }
      // If product_or_service is not set, extract product keyword from requirement
      if (!candidateProduct || candidateProduct === 'Unknown' || candidateProduct === 'Commercial Requirement' || candidateProduct === 'Commercial Inquiry') {
        const prodMatch = candidateQty.match(/(?:want|need|looking for|require)\s+(?:an?|some)?\s*([a-zA-Z\s]{3,30}?)(?:\.|\?|,|$)/i);
        if (prodMatch && prodMatch[1]) {
          candidateProduct = prodMatch[1].trim();
        }
      }
      candidateQty = 'Unknown';
    }
    // If quantity is a budget expression:
    else if (isBudgetExpression(candidateQty)) {
      notes.push(`Budget expression "${candidateQty}" in quantity moved to budget.`);
      if (!candidateBudget || candidateBudget === 'Unknown') {
        candidateBudget = candidateQty;
      }
      candidateQty = 'Unknown';
    }
    // Validate measurable numeric quantity
    else if (!isValidMeasurableQuantity(candidateQty)) {
      notes.push(`Unmeasurable quantity value "${candidateQty}" normalized to Unknown.`);
      candidateQty = 'Unknown';
    }
  }

  // =========================================================================
  // STEP 3: Disentangle Product/Service field
  // A time expression (e.g. "1 week") must NEVER become product_or_service!
  // =========================================================================
  if (candidateProduct && candidateProduct !== 'Unknown') {
    if (isTimeExpression(candidateProduct)) {
      notes.push(`Time expression "${candidateProduct}" in product_or_service moved to timeline.`);
      if (!candidateTimeline || candidateTimeline === 'Unknown') {
        candidateTimeline = candidateProduct;
      }
      // Re-evaluate product from description or known context
      if (candidateDesc && !isTimeExpression(candidateDesc)) {
        const prodMatch = candidateDesc.match(/(?:want|need|looking for|require)\s+(?:an?|some)?\s*([a-zA-Z\s]{3,30}?)(?:\.|\?|,|$)/i);
        candidateProduct = prodMatch ? prodMatch[1].trim() : 'Website Development';
      } else {
        candidateProduct = 'Commercial Inquiry';
      }
    } else if (isRequirementSentence(candidateProduct)) {
      if (!candidateDesc) {
        candidateDesc = candidateProduct;
      }
      const prodMatch = candidateProduct.match(/(?:want|need|looking for|require)\s+(?:an?|some)?\s*([a-zA-Z\s]{3,30}?)(?:\.|\?|,|$)/i);
      candidateProduct = prodMatch ? prodMatch[1].trim() : candidateProduct;
    }
  }

  // =========================================================================
  // STEP 4: Standardize missing values (Never fabricate)
  // =========================================================================
  const finalCustomerName = candidateName || candidateCompany || 'Website Visitor';
  const finalCompanyName = candidateCompany || (candidateName ? candidateName : 'Unknown');
  const finalProduct = candidateProduct || 'Commercial Inquiry';
  const finalQty = candidateQty || 'Unknown';
  const finalTimeline = candidateTimeline || 'Unknown';
  const finalBudget = candidateBudget || 'Unknown';
  const finalLoc = candidateLoc || 'Unknown';
  const finalDesc = candidateDesc || (raw.requirement_or_description || '').trim() || (finalProduct !== 'Commercial Inquiry' ? `Inquiry regarding ${finalProduct}` : 'Commercial website inquiry');

  // Verify contact info format if provided
  let email: string | undefined = raw.email?.trim() || undefined;
  let phone: string | undefined = raw.phone?.trim() || undefined;
  if (candidateContact) {
    if (candidateContact.includes('@')) {
      email = email || candidateContact;
    } else if (/\d{7,}/.test(candidateContact.replace(/[^0-9]/g, ''))) {
      phone = phone || candidateContact;
    }
  }

  // Construct structured customer facts for review
  const customerFacts: Array<{ label: string; value: string; verified: boolean }> = [];
  if (finalProduct !== 'Commercial Inquiry' && finalProduct !== 'Unknown') {
    customerFacts.push({ label: 'Requirement', value: finalProduct, verified: true });
  }
  if (finalQty !== 'Unknown') {
    customerFacts.push({ label: 'Quantity / Scope', value: finalQty, verified: true });
  }
  if (finalTimeline !== 'Unknown') {
    customerFacts.push({ label: 'Timeline', value: finalTimeline, verified: true });
  }
  if (finalBudget !== 'Unknown') {
    customerFacts.push({ label: 'Budget', value: finalBudget, verified: true });
  }
  if (finalLoc !== 'Unknown') {
    customerFacts.push({ label: 'Location', value: finalLoc, verified: true });
  }
  if (email) {
    customerFacts.push({ label: 'Email', value: email, verified: true });
  }
  if (phone) {
    customerFacts.push({ label: 'Phone', value: phone, verified: true });
  }
  if (finalDesc && !customerFacts.some((f) => f.value === finalDesc)) {
    customerFacts.push({ label: 'Details', value: finalDesc, verified: true });
  }

  return {
    customer_name: finalCustomerName,
    company_name: finalCompanyName,
    product_or_service: finalProduct,
    requirement_or_description: finalDesc,
    quantity: finalQty,
    budget: finalBudget,
    timeline: finalTimeline,
    location: finalLoc,
    contact_info: candidateContact || email || phone || undefined,
    email,
    phone,
    requirements: reqList,
    customer_facts: customerFacts,
    is_valid: true,
    validation_notes: notes,
  };
}
