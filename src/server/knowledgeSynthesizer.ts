/**
 * Deep Business Understanding & Knowledge Synthesizer
 * 
 * Implements the core principle:
 * RAW BUSINESS DATA -> UNDERSTAND MEANING -> IDENTIFY RELEVANT INFORMATION -> UNDERSTAND INTENT -> FORMULATE NATURAL ANSWER
 * 
 * NEVER blindly copy, concatenate, prepend ("We provide [X]", "Our company specializes in [X]"),
 * or paste raw onboarding strings into a response template.
 */

import {
  CompanyProfile,
  OfferingItem,
  BusinessDifferentiators,
  CommercialInfo,
  DeliveryServiceInfo,
  SalesQualificationRules,
  SalesQuestionsConfig,
  FAQItem,
  PoliciesAndRules,
  BrandVoiceConfig,
  HumanHandoffConfig,
  BusinessIdentity,
} from '../types.ts';
import { resolveProductKnowledgeQuery } from './productKnowledgeEngine.ts';
import { isPortfolioDeployment } from '../utils/portfolioUtils.ts';

export interface SemanticProductInfo {
  name: string;
  category?: string;
  description?: string;
  purpose?: string;
  price?: string;
  priceType?: 'fixed' | 'starting' | 'unit' | 'custom' | 'unknown';
  features?: string[];
  specifications?: string;
  variants?: string;
  availability?: string;
  deliveryTime?: string;
  moq?: string;
  useCases?: string;
  idealCustomer?: string;
  status?: string;
  rawText: string;
}

export interface SemanticPricingInfo {
  summary: string;
  startingPrice?: string;
  fixedPrice?: string;
  unitPrice?: string;
  isCustomOrVariable: boolean;
  rawText: string;
  paymentTerms?: string;
  paymentMethods?: string[];
  taxesNotes?: string;
  discounts?: string;
  financing?: string;
}

export interface SemanticLocationInfo {
  locationsList: string[];
  rawText: string;
  servesNationwideOrRemote: boolean;
}

export interface SemanticPolicyInfo {
  delivery?: string;
  deliveryTimes?: string;
  installation?: string;
  warranty?: string;
  businessHours?: string;
  returns?: string;
  afterSales?: string;
  rawText: string;
}

export interface SemanticCompanyKnowledge {
  companyName: string;
  brandName?: string;
  deploymentType: string;
  businessType: 'goods' | 'services' | 'hybrid';
  businessModel: 'goods' | 'services' | 'hybrid';
  coreMissionStatement: string; // Cleaned natural statement (e.g., "We connect clients with freelancers.")
  cleanDescription: string;
  whatYouDo?: string;
  targetAudience?: string;
  mainGoals?: string[];
  keyInformation?: string;
  contactInformation?: any;
  inquiryFields?: string[];
  aiIdentity?: string;
  aiTone?: string;
  aiIntroduction?: string;
  aiRepresents?: string;
  forbiddenClaims?: string[];
  offeringsSummary: string; // Clean natural summary
  cleanProductsSummary: string;
  products: SemanticProductInfo[];
  pricing: SemanticPricingInfo;
  pricingFormatted: string;
  locations: SemanticLocationInfo;
  locationsFormatted: string;
  policies: SemanticPolicyInfo;
  businessRulesFormatted: string;
  faqList: Array<{ question: string; answer: string; category?: string }>;
  differentiators?: BusinessDifferentiators;
  commercialInfo?: CommercialInfo;
  deliveryService?: DeliveryServiceInfo;
  qualificationRules?: SalesQualificationRules;
  salesQuestions?: SalesQuestionsConfig;
  policiesAndRules?: PoliciesAndRules;
  brandVoice?: BrandVoiceConfig;
  humanHandoff?: HumanHandoffConfig;
  businessIdentity?: BusinessIdentity;
  additionalNotes: string;
  rawProfile?: Partial<CompanyProfile>;
}

/**
 * Normalizes and understands raw pricing text into semantic knowledge
 */
export function parseSemanticPricing(rawPrice?: string | any, deploymentType?: string): SemanticPricingInfo {
  let text = '';
  if (typeof rawPrice === 'string') {
    text = rawPrice.trim();
  } else if (rawPrice && typeof rawPrice === 'number') {
    text = String(rawPrice);
  } else if (Array.isArray(rawPrice)) {
    text = rawPrice.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(', ').trim();
  } else if (rawPrice && typeof rawPrice === 'object') {
    text = Object.values(rawPrice).map(v => String(v)).join(', ').trim();
  }

  const isPortfolio = deploymentType === 'PORTFOLIO';

  if (!text) {
    if (isPortfolio) {
      return {
        summary: "There's no public pricing information available.",
        isCustomOrVariable: false,
        rawText: '',
      };
    }
    return {
      summary: 'Pricing is tailored to your specific requirements and scope.',
      isCustomOrVariable: true,
      rawText: '',
    };
  }

  // Detect starting from
  const startingMatch = text.match(/^(?:starting\s+from|from|starts\s+at)\s*([$₹€£]?\s*[\d,]+(?:\s*(?:k|lac|lakh|crore|million|usd|inr))?)/i);
  if (startingMatch) {
    const amount = startingMatch[1].trim();
    return {
      summary: `Pricing starts at ${amount}.`,
      startingPrice: amount,
      isCustomOrVariable: false,
      rawText: text,
    };
  }

  // Detect per unit
  const perUnitMatch = text.match(/([$₹€£]?\s*[\d,]+(?:\s*(?:k|lac|lakh|crore|million|usd|inr))?)\s*(?:per|\/)\s*(?:unit|piece|item|seat|user|month|year|hr|hour)/i);
  if (perUnitMatch) {
    return {
      summary: `Pricing is ${text}.`,
      unitPrice: perUnitMatch[0].trim(),
      isCustomOrVariable: false,
      rawText: text,
    };
  }

  // Detect direct numeric fixed price (e.g. "$150", "₹25,000", "500 USD")
  const directNumMatch = text.match(/^([$₹€£]\s*[\d,]+|[\d,]+\s*(?:USD|INR|EUR|GBP|Rs\.?|₹|\$))/i);
  if (directNumMatch) {
    return {
      summary: `Pricing is ${directNumMatch[0].trim()}.`,
      fixedPrice: directNumMatch[0].trim(),
      isCustomOrVariable: false,
      rawText: text,
    };
  }

  // For PORTFOLIO: do NOT convert missing or vague prices into "Custom Quote"
  if (isPortfolio) {
    return {
      summary: "There's no public pricing information available.",
      isCustomOrVariable: false,
      rawText: text,
    };
  }

  // Detect custom or variable
  if (/depends|custom|contact|quote|requirement|varies|upon request/i.test(text)) {
    return {
      summary: 'Pricing depends on the requirements. If you tell me what you need, I can help you figure out the next step.',
      isCustomOrVariable: true,
      rawText: text,
    };
  }

  // If unclear/messy input (e.g., "chairs good quality 500 rs maybe depends")
  if (/maybe|depends/i.test(text)) {
    return {
      summary: "I don't have a confirmed fixed price. I can help register an inquiry so our team can provide the exact pricing.",
      isCustomOrVariable: true,
      rawText: text,
    };
  }

  return {
    summary: text.endsWith('.') ? text : `${text}.`,
    isCustomOrVariable: false,
    rawText: text,
  };
}

/**
 * Normalizes and understands raw location/service area text
 */
export function parseSemanticLocations(rawLocations?: string | string[] | any): SemanticLocationInfo {
  let text = '';
  if (typeof rawLocations === 'string') {
    text = rawLocations.trim();
  } else if (Array.isArray(rawLocations)) {
    text = rawLocations.map(l => typeof l === 'string' ? l : JSON.stringify(l)).join(', ').trim();
  } else if (rawLocations && typeof rawLocations === 'object') {
    text = Object.values(rawLocations).map(v => String(v)).join(', ').trim();
  }

  if (!text) {
    return {
      locationsList: [],
      rawText: '',
      servesNationwideOrRemote: true,
    };
  }

  // Check remote / nationwide
  const isRemote = /remote|online|global|worldwide|nationwide|all regions/i.test(text);

  // Split by comma, newline, 'and', 'or', slash, or multiple spaces
  const cleaned = text
    .replace(/\band\b/gi, ',')
    .replace(/\bor\b/gi, ',')
    .replace(/\//g, ',');

  const rawSplits = cleaned
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // If space-separated like "Delhi Gurgaon Noida"
  const locationsList: string[] = [];
  for (const item of rawSplits) {
    if (item.includes(' ') && !/cyber city|connaught place|south delhi|delhi ncr|new york|san francisco|los angeles|hong kong|kuala lumpur/i.test(item)) {
      const subTokens = item.split(/\s+/).filter(Boolean);
      locationsList.push(...subTokens);
    } else {
      locationsList.push(item);
    }
  }

  return {
    locationsList: Array.from(new Set(locationsList)),
    rawText: text,
    servesNationwideOrRemote: isRemote,
  };
}

/**
 * Formats a list of strings into a natural English series: "A, B and C"
 */
export function formatNaturalList(items: string[]): string {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Normalizes messy or shorthand product lines into structured semantic knowledge
 */
export function parseSemanticProducts(
  rawProducts?: string | string[] | any,
  offerings?: OfferingItem[],
  deploymentType?: string
): SemanticProductInfo[] {
  const list: SemanticProductInfo[] = [];
  const isPortfolio = deploymentType === 'PORTFOLIO';

  // 1. Structured offerings first if available
  if (offerings && offerings.length > 0) {
    for (const off of offerings) {
      if (!off.name && !off.description) continue;
      const rawPrice = off.priceRange || off.startingPrice || off.priceOrRange || off.price;
      const priceInfo = parseSemanticPricing(rawPrice, deploymentType);
      
      // For portfolio: don't attach price unless explicitly provided
      const finalPrice = isPortfolio
        ? (rawPrice && !priceInfo.summary.includes('no public pricing') ? priceInfo.summary : undefined)
        : priceInfo.summary;

      list.push({
        name: off.name || (isPortfolio ? 'Portfolio Project' : 'Commercial Solution'),
        category: off.category,
        description: off.description || '',
        purpose: off.useCases || off.description || '',
        price: finalPrice,
        priceType: priceInfo.isCustomOrVariable ? 'custom' : (priceInfo.startingPrice ? 'starting' : 'fixed'),
        features: off.keyFeatures,
        specifications: off.specifications,
        variants: off.variants,
        availability: off.availability,
        deliveryTime: off.deliveryTime,
        moq: off.moq || off.minOrder,
        useCases: off.useCases,
        idealCustomer: off.idealCustomer,
        status: off.status || off.availability || (isPortfolio ? 'Completed' : undefined),
        rawText: `${off.name}: ${off.description}${off.specifications ? ` (${off.specifications})` : ''}`,
      });
    }
  }

  // 2. Parse unstructured products text / array
  let productsText = '';
  if (typeof rawProducts === 'string') {
    productsText = rawProducts;
  } else if (Array.isArray(rawProducts)) {
    productsText = rawProducts
      .map((item) => (typeof item === 'string' ? item : item?.name ? `${item.name}${item.description ? ` - ${item.description}` : ''}` : JSON.stringify(item)))
      .join('\n');
  } else if (rawProducts && typeof rawProducts === 'object') {
    productsText = Object.values(rawProducts).map((v) => String(v)).join('\n');
  }

  if (productsText && productsText.trim()) {
    const lines = productsText
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);

    for (const line of lines) {
      // Check if line is "Product - description - price" (e.g. "Office chairs - ergonomic - 150" or "ALPHA-X — Premium...")
      const dashParts = line.split(/(?:\s+[-—–]\s+|\s*[—–]\s*|\s*\|\s*)/);
      if (dashParts.length >= 2) {
        const pName = dashParts[0].trim();
        const pDesc = dashParts[1].trim();
        let pPrice = dashParts[2] ? dashParts[2].trim() : undefined;
        const priceMatch = pDesc.match(/(?:price|pricing|cost):\s*([$€£₹]?\s*[\d,]+(?:\.\d+)?|\$?[^;.]+)/i);
        if (!pPrice && priceMatch) {
          pPrice = priceMatch[1].trim();
        }
        const cleanDesc = pDesc.replace(/(?:\.\s*)?(?:price|pricing|cost):\s*[$€£₹]?\s*[\d,]+(?:\.\d+)?\.?/i, '').trim();
        
        let priceSummary: string | undefined;
        if (pPrice) {
          const parsed = parseSemanticPricing(pPrice, deploymentType);
          if (!isPortfolio || !parsed.summary.includes('no public pricing')) {
            priceSummary = parsed.summary;
          }
        }

        const isUpcoming = /upcoming|future|planned|in progress|wip|active|experiment|research/i.test(line);

        list.push({
          name: pName,
          description: cleanDesc || pDesc,
          purpose: cleanDesc || pDesc,
          price: priceSummary,
          status: isUpcoming ? 'In Progress' : (isPortfolio ? 'Completed' : undefined),
          rawText: line,
        });
        continue;
      }

      // Check if shorthand word list like "chairs office home school"
      if (/^chairs\s+office\s+home\s+school/i.test(line)) {
        list.push({
          name: 'Chairs',
          description: 'for office, home, and school use',
          purpose: 'office, home and school environments',
          rawText: line,
        });
        continue;
      }

      // Otherwise generic single product/line
      list.push({
        name: line,
        status: isPortfolio ? 'Active Project' : undefined,
        rawText: line,
      });
    }
  }

  return list;
}

/**
 * Converts first-person sentences (e.g. "I build...", "My main project is...") into clean,
 * concise third-person descriptions representing the owner or company.
 */
export function sanitizeToThirdPersonDescription(rawText: string, subjectName: string = 'Our Company'): string {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.trim();
  if (!text) return '';

  // Extract first 1-2 key summary sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const primaryText = sentences.slice(0, 2).join(' ');

  let cleaned = primaryText
    .replace(/^I\s+am\s+building\b/i, 'is building')
    .replace(/^I['’]m\s+building\b/i, 'is building')
    .replace(/^I\s+am\s+(?:an?|the)\b/i, 'is a')
    .replace(/^I['’]m\s+(?:an?|the)\b/i, 'is a')
    .replace(/^I\s+am\b/i, 'is')
    .replace(/^I['’]m\b/i, 'is')
    .replace(/^I\s+build\b/i, 'builds')
    .replace(/^I\s+create\b/i, 'creates')
    .replace(/^I\s+develop\b/i, 'develops')
    .replace(/^I\s+design\b/i, 'designs')
    .replace(/^I\s+specialize\s+in\b/i, 'specializes in')
    .replace(/^I\s+focus\s+on\b/i, 'focuses on')
    .replace(/^I\s+help\b/i, 'helps')
    .replace(/^I\s+work\s+on\b/i, 'works on')
    .replace(/^I\s+provide\b/i, 'provides')
    .replace(/^I\s+make\b/i, 'makes')
    .replace(/^I\b/i, 'they')
    .replace(/\bmy\s+main\s+project\s+is\b/gi, 'their main project is')
    .replace(/\bmy\s+primary\s+focus\s+is\b/gi, 'their primary focus is')
    .replace(/\bmy\s+portfolio\b/gi, 'their portfolio')
    .replace(/\bmy\s+work\b/gi, 'their work')
    .replace(/\bmy\s+projects\b/gi, 'their projects')
    .replace(/\bmy\b/gi, 'their')
    .replace(/\bI['’]m\b/gi, 'they are')
    .replace(/\bI\s+am\b/gi, 'they are')
    .replace(/\bI\b/g, 'they')
    .replace(/\bme\b/gi, 'them')
    .replace(/\bmyself\b/gi, 'themselves');

  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\.\.+/g, '.');
  return cleaned;
}

/**
 * Normalizes description, business model, and mission statement into clear semantic text
 */
export function parseSemanticCompanyDescription(
  rawDescription?: string | any,
  rawIndustry?: string | any,
  companyName: string = 'Our Company'
): { missionStatement: string; offeringsSummary: string } {
  let descText = '';
  if (typeof rawDescription === 'string') {
    descText = rawDescription;
  } else if (Array.isArray(rawDescription)) {
    descText = rawDescription.join(' ');
  } else if (rawDescription && typeof rawDescription === 'object') {
    descText = Object.values(rawDescription).join(' ');
  }

  let indText = '';
  if (typeof rawIndustry === 'string') {
    indText = rawIndustry;
  } else if (Array.isArray(rawIndustry)) {
    indText = rawIndustry.join(' ');
  }

  const text = (descText || indText || '').trim();
  if (!text) {
    return {
      missionStatement: `We provide commercial solutions at ${companyName}.`,
      offeringsSummary: 'commercial products and specialized solutions',
    };
  }

  // First-person conversion
  if (/^i\s+(?:build|create|develop|design|specialize|focus|help|work|provide|make|am)\b/i.test(text)) {
    const sanitized = sanitizeToThirdPersonDescription(text, companyName);
    const mission = sanitized.startsWith('is ') || sanitized.startsWith('a ')
      ? `${companyName} is ${sanitized.replace(/^is\s+/, '')}`
      : `${companyName} ${sanitized}`;
    return {
      missionStatement: mission.endsWith('.') ? mission : `${mission}.`,
      offeringsSummary: sanitized.replace(/^(?:builds|creates|develops|specializes in|focuses on)\s+/i, ''),
    };
  }

  // Case 1: Already a self-contained complete sentence (e.g. "We connect clients with freelancers.")
  if (/^(?:we|our company|our platform)\s+(?:connect|help|provide|build|offer|specialize|deliver|manufacture|sell|create)\b/i.test(text)) {
    const formatted = text.endsWith('.') ? text : `${text}.`;
    return {
      missionStatement: formatted,
      offeringsSummary: text.replace(/^(?:we\s+|our company\s+|our platform\s+)/i, ''),
    };
  }

  // Case 2: Action phrase (e.g. "Affordable solar solutions for homes and businesses. Installation available.")
  if (/solar solutions|furniture solutions|freelance|consulting|web development/i.test(text)) {
    if (text.includes('.')) {
      return {
        missionStatement: text,
        offeringsSummary: text.split('.')[0].trim(),
      };
    }
  }

  // Case 3: Messy phrase or noun phrase
  return {
    missionStatement: text.endsWith('.') ? text : `${text}.`,
    offeringsSummary: text,
  };
}

/**
 * Parses all FAQ and policy knowledge from raw text / inputs
 */
export function parseSemanticFaqAndPolicies(
  rawFaq?: string | any,
  rawRules?: string | any,
  structuredFaqs?: FAQItem[],
  deliveryService?: DeliveryServiceInfo,
  policiesConfig?: PoliciesAndRules,
  additionalKnowledge?: string | any
): { policies: SemanticPolicyInfo; faqList: Array<{ question: string; answer: string; category?: string }> } {
  const normalizeToString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n');
    if (typeof val === 'object') return Object.values(val).map((v) => String(v)).join('\n');
    return String(val);
  };

  const combined = `${normalizeToString(rawFaq)}\n${normalizeToString(rawRules)}\n${normalizeToString(additionalKnowledge)}`.trim();
  const faqList: Array<{ question: string; answer: string; category?: string }> = [];
  const policies: SemanticPolicyInfo = {
    rawText: combined,
    delivery: deliveryService?.deliveryAreas || deliveryService?.deliveryTimes,
    deliveryTimes: deliveryService?.deliveryTimes,
    installation: deliveryService?.installationAvailability,
    warranty: deliveryService?.warranty,
    returns: deliveryService?.returnsAndRefunds,
    afterSales: deliveryService?.afterSalesSupport,
  };

  // Structured FAQs first
  if (structuredFaqs && structuredFaqs.length > 0) {
    for (const f of structuredFaqs) {
      if (f.question && f.answer) {
        faqList.push({
          question: f.question.trim(),
          answer: f.answer.trim(),
          category: f.category,
        });
      }
    }
  }

  if (combined) {
    // Detect installation if not explicitly set
    if (!policies.installation && /installation\s+available|we offer installation|do you install\??\s*(?:yes|available)/i.test(combined)) {
      policies.installation = 'Yes, installation is available.';
    }

    // Detect delivery if not explicitly set
    if (!policies.delivery && /delivery\s+available|nationwide delivery|we deliver|free delivery/i.test(combined)) {
      const match = combined.match(/(?:delivery|shipping)[^.\n]*/i);
      policies.delivery = match ? match[0].trim() : 'Yes, delivery is available.';
    }

    // Detect warranty if not explicitly set
    if (!policies.warranty && /warranty[^.\n]*/i.test(combined)) {
      const wMatch = combined.match(/\d+[\s-]*(?:year|month)\s+warranty|warranty[^.\n]*/i);
      policies.warranty = wMatch ? wMatch[0].trim() : 'Warranty is provided with our products.';
    }

    // Detect business hours
    if (/hours|monday|open\s+(?:from|at)/i.test(combined)) {
      const hMatch = combined.match(/(?:mon|monday|hours)[^.\n]*/i);
      policies.businessHours = hMatch ? hMatch[0].trim() : undefined;
    }

    // Extract unstructured Q&A pairs if formatted
    const qBlocks = combined.split(/(?:^|\n)(?:Q:|Question:|\d+\.)\s*/i).filter(Boolean);
    for (const block of qBlocks) {
      const aParts = block.split(/(?:A:|Answer:)\s*/i);
      if (aParts.length >= 2) {
        const q = aParts[0].trim();
        const a = aParts[1].trim();
        if (!faqList.some((existing) => existing.question.toLowerCase() === q.toLowerCase())) {
          faqList.push({ question: q, answer: a });
        }
      }
    }
  }

  return { policies, faqList };
}

/**
 * Builds the complete semantic knowledge graph from raw company profile
 */
export function buildSemanticCompanyKnowledge(profile: Partial<CompanyProfile> = {}): SemanticCompanyKnowledge {
  const brandName = profile.brandName?.trim() || profile.name?.trim() || 'Our Company';
  const companyName = brandName;
  const deploymentType = (profile.deploymentType ? String(profile.deploymentType).toUpperCase() : 'BUSINESS');
  const businessType = (profile.businessType as any) || 'goods';

  const rawDesc = profile.shortDescription || profile.description || profile.whatYouDo;
  const { missionStatement, offeringsSummary } = parseSemanticCompanyDescription(
    rawDesc,
    profile.industry,
    companyName
  );

  // Mission and profile overview
  let adjustedMissionStatement = missionStatement;
  if (deploymentType === 'PORTFOLIO') {
    adjustedMissionStatement = rawDesc ||
      `Interactive digital portfolio and professional showcase of ${brandName}.`;
  }

  const products = parseSemanticProducts(profile.products, profile.offerings, deploymentType);
  const rawPricingText = profile.pricing || profile.commercialInfo?.pricingDetails || (profile.minOrder ? `MOQ: ${profile.minOrder}` : undefined);
  const pricing = parseSemanticPricing(rawPricingText, deploymentType);
  if (profile.commercialInfo) {
    pricing.paymentTerms = profile.commercialInfo.paymentTerms;
    pricing.paymentMethods = profile.commercialInfo.paymentMethods;
    pricing.taxesNotes = profile.commercialInfo.taxesNotes;
    pricing.discounts = profile.commercialInfo.discountsOrPromos;
    pricing.financing = profile.commercialInfo.financingOptions;
  }

  const locations = parseSemanticLocations(profile.serviceArea || profile.locations || profile.deliveryService?.serviceAreas);
  const { policies, faqList } = parseSemanticFaqAndPolicies(
    profile.faqData as string,
    profile.businessRules,
    profile.faqs,
    profile.deliveryService,
    profile.policies,
    profile.additionalKnowledge || profile.keyInformation
  );

  const cleanProductsSummary = products.length > 0
    ? products.map(p => p.name).join(', ')
    : offeringsSummary || (deploymentType === 'PORTFOLIO' ? 'Featured projects, creative technology and technical initiatives' : 'Commercial products and specialized business solutions');

  const locationsFormatted = locations.locationsList.length > 0
    ? formatNaturalList(locations.locationsList)
    : locations.rawText || (deploymentType === 'PORTFOLIO' ? 'Global & Remote availability' : 'Regional headquarters and remote client services');

  const businessRulesFormatted = profile.businessRules?.trim() || 'Never invent prices, claims, or unverified facts. Escalate custom proposals to humans.';

  return {
    companyName,
    brandName,
    deploymentType,
    businessType,
    businessModel: businessType,
    coreMissionStatement: adjustedMissionStatement,
    cleanDescription: adjustedMissionStatement,
    whatYouDo: profile.whatYouDo,
    targetAudience: profile.targetAudience || profile.targetCustomers,
    mainGoals: profile.mainGoals,
    keyInformation: profile.keyInformation || profile.additionalKnowledge,
    contactInformation: profile.contactInformation,
    inquiryFields: profile.inquiryFields,
    aiIdentity: profile.aiIdentity,
    aiTone: profile.aiTone || profile.tone,
    aiIntroduction: profile.aiIntroduction,
    aiRepresents: profile.aiRepresents,
    forbiddenClaims: profile.forbiddenClaims,
    offeringsSummary,
    cleanProductsSummary,
    products,
    pricing,
    pricingFormatted: pricing.summary,
    locations,
    locationsFormatted,
    policies,
    businessRulesFormatted,
    faqList,
    differentiators: profile.differentiators,
    commercialInfo: profile.commercialInfo,
    deliveryService: profile.deliveryService,
    qualificationRules: profile.qualificationRules,
    salesQuestions: profile.salesQuestions,
    policiesAndRules: profile.policies,
    brandVoice: profile.brandVoice,
    humanHandoff: profile.humanHandoff,
    businessIdentity: profile.businessIdentity,
    additionalNotes: [profile.keyInformation, profile.additionalKnowledge, profile.businessRules].filter(Boolean).join('\n'),
    rawProfile: profile,
  };
}

/**
 * Formats semantic knowledge into a clean, human-readable markdown section for Gemini
 */
export function formatSemanticKnowledgeForPrompt(knowledge: SemanticCompanyKnowledge): string {
  const {
    companyName,
    brandName,
    deploymentType,
    businessType,
    coreMissionStatement,
    whatYouDo,
    targetAudience,
    mainGoals,
    keyInformation,
    contactInformation,
    inquiryFields,
    aiIdentity,
    aiTone,
    aiIntroduction,
    aiRepresents,
    forbiddenClaims,
    products,
    locations,
    policies,
    faqList,
    differentiators,
    commercialInfo,
    deliveryService,
    qualificationRules,
    salesQuestions,
    policiesAndRules,
    brandVoice,
    humanHandoff,
    businessIdentity,
    additionalNotes,
  } = knowledge;

  let out = `BRAND / NAME: ${brandName || companyName}\n`;
  out += `DEPLOYMENT CONTEXT: ${deploymentType}\n`;
  out += `CORE MISSION / SUMMARY: ${coreMissionStatement}\n`;
  if (whatYouDo) out += `WHAT IT DOES / OFFERS: ${whatYouDo}\n`;
  if (targetAudience) out += `TARGET AUDIENCE: ${targetAudience}\n`;
  if (mainGoals && mainGoals.length > 0) out += `PRIMARY GOALS: ${mainGoals.join(', ')}\n`;
  if (aiIdentity) out += `AI ROLE / IDENTITY: ${aiIdentity}\n`;
  if (aiTone) out += `AI TONE: ${aiTone}\n`;
  if (aiIntroduction) out += `AI INTRO INSTRUCTION: ${aiIntroduction}\n`;
  if (aiRepresents) out += `AI REPRESENTS: ${aiRepresents}\n`;
  out += '\n';

  if (businessIdentity) {
    out += `VERIFIED IDENTITY & LEADERSHIP:\n`;
    if (businessIdentity.businessName) out += `• Registered Name: ${businessIdentity.businessName}\n`;
    if (businessIdentity.ownerName) out += `• Owner / Founder: ${businessIdentity.ownerName}\n`;
    if (businessIdentity.founderName) out += `• Founder: ${businessIdentity.founderName}\n`;
    if (businessIdentity.ceoName) out += `• Principal / Lead: ${businessIdentity.ceoName}\n`;
    out += `\n`;
  }

  if (products.length > 0) {
    if (deploymentType === 'PORTFOLIO') {
      out += `FEATURED PROJECTS, WORK & INITIATIVES (GROUND TRUTH):\n`;
      for (const p of products) {
        const statusText = p.status ? ` [Status: ${p.status}]` : '';
        const descText = p.description ? ` — ${p.description}` : '';
        const specsText = p.specifications ? ` [Focus/Tech: ${p.specifications}]` : '';
        const useCasesText = p.useCases ? ` [Impact/Purpose: ${p.useCases}]` : '';
        const priceText = p.price && !p.price.includes('no public pricing') ? ` [Configured Rate: ${p.price}]` : '';
        out += `• ${p.name}${statusText}${descText}${specsText}${useCasesText}${priceText}\n`;
      }
      out += '\n';
    } else {
      out += `OFFERINGS & WORK CATALOG (GROUND TRUTH):\n`;
      for (const p of products) {
        const priceText = p.price ? ` | Pricing: ${p.price}` : '';
        const descText = p.description ? ` — ${p.description}` : '';
        const specsText = p.specifications ? ` [Specs: ${p.specifications}]` : '';
        const moqText = p.moq ? ` [Scope/MOQ: ${p.moq}]` : '';
        const delText = p.deliveryTime ? ` [Timeline: ${p.deliveryTime}]` : '';
        out += `• ${p.name}${descText}${specsText}${priceText}${moqText}${delText}\n`;
      }
      out += '\n';
    }
  }

  if (keyInformation) {
    out += `KEY KNOWLEDGE BASE:\n${keyInformation}\n\n`;
  }

  if (contactInformation) {
    out += `CONTACT & SOCIAL DETAILS:\n`;
    if (contactInformation.email) out += `• Email: ${contactInformation.email}\n`;
    if (contactInformation.phone) out += `• Phone: ${contactInformation.phone}\n`;
    if (contactInformation.website) out += `• Website: ${contactInformation.website}\n`;
    if (contactInformation.bookingUrl) out += `• Meeting/Booking Link: ${contactInformation.bookingUrl}\n`;
    if (contactInformation.socialLinks && Object.keys(contactInformation.socialLinks).length > 0) {
      const socials = Object.entries(contactInformation.socialLinks)
        .filter(([_, url]) => Boolean(url))
        .map(([platform, url]) => `${platform}: ${url}`)
        .join(' | ');
      if (socials) out += `• Socials: ${socials}\n`;
    }
    out += '\n';
  }

  if (inquiryFields && inquiryFields.length > 0) {
    out += `IMPORTANT INQUIRY FIELDS TO COLLECT WHEN INTERESTED: ${inquiryFields.join(', ')}\n\n`;
  }

  if (forbiddenClaims && forbiddenClaims.length > 0) {
    out += `FORBIDDEN CLAIMS (DO NOT VIOLATE):\n`;
    for (const claim of forbiddenClaims) {
      out += `• NEVER CLAIM: ${claim}\n`;
    }
    out += '\n';
  }

  if (differentiators) {
    out += `BUSINESS DIFFERENTIATORS & ADVANTAGES:\n`;
    if (differentiators.whyChooseUs) out += `• Why Choose Us: ${differentiators.whyChooseUs}\n`;
    if (differentiators.productDifferences) out += `• Product Advantages: ${differentiators.productDifferences}\n`;
    if (differentiators.strongestAdvantages && differentiators.strongestAdvantages.length > 0) {
      out += `• Core Strengths: ${differentiators.strongestAdvantages.join(', ')}\n`;
    }
    if (differentiators.competitorNotes) out += `• Competitor Notes: ${differentiators.competitorNotes}\n`;
    out += '\n';
  }

  if (commercialInfo) {
    out += `COMMERCIAL & PRICING TERMS:\n`;
    if (commercialInfo.pricingDetails) out += `• Pricing Info: ${commercialInfo.pricingDetails}\n`;
    if (commercialInfo.paymentTerms) out += `• Payment Terms: ${commercialInfo.paymentTerms}\n`;
    if (commercialInfo.paymentMethods?.length) out += `• Payment Methods: ${commercialInfo.paymentMethods.join(', ')}\n`;
    if (commercialInfo.financingOptions) out += `• Financing: ${commercialInfo.financingOptions}\n`;
    if (commercialInfo.discountsOrPromos) out += `• Discounts: ${commercialInfo.discountsOrPromos}\n`;
    if (commercialInfo.quoteValidity) out += `• Quote Validity: ${commercialInfo.quoteValidity}\n`;
    out += '\n';
  }

  if (locations.locationsList.length > 0) {
    out += `SERVICE LOCATIONS: ${formatNaturalList(locations.locationsList)}\n`;
  } else if (locations.rawText) {
    out += `SERVICE LOCATIONS: ${locations.rawText}\n`;
  }

  if (deliveryService || policies) {
    out += `DELIVERY, INSTALLATION & SUPPORT POLICIES:\n`;
    if (policies.installation || deliveryService?.installationAvailability) {
      out += `• Installation: ${policies.installation || deliveryService?.installationAvailability}\n`;
    }
    if (policies.delivery || deliveryService?.deliveryAreas || deliveryService?.deliveryTimes) {
      out += `• Delivery: ${policies.delivery || deliveryService?.deliveryAreas} (Timeline: ${deliveryService?.deliveryTimes || 'Standard'})\n`;
    }
    if (policies.warranty || deliveryService?.warranty) {
      out += `• Warranty: ${policies.warranty || deliveryService?.warranty}\n`;
    }
    if (policies.returns || deliveryService?.returnsAndRefunds) {
      out += `• Returns: ${policies.returns || deliveryService?.returnsAndRefunds}\n`;
    }
    if (policies.afterSales || deliveryService?.afterSalesSupport) {
      out += `• After Sales: ${policies.afterSales || deliveryService?.afterSalesSupport}\n`;
    }
    if (policies.businessHours) {
      out += `• Operating Hours: ${policies.businessHours}\n`;
    }
    out += '\n';
  }

  if (qualificationRules) {
    out += `QUALIFICATION RULES:\n`;
    if (qualificationRules.goodLeadCriteria) out += `• Good Lead Criteria: ${qualificationRules.goodLeadCriteria}\n`;
    if (qualificationRules.requiredFields?.length) out += `• Required Fields: ${qualificationRules.requiredFields.join(', ')}\n`;
    if (qualificationRules.highPriorityTriggers) out += `• High Priority Triggers: ${qualificationRules.highPriorityTriggers}\n`;
    if (qualificationRules.deprioritizeTriggers) out += `• Disqualify/Deprioritize Triggers: ${qualificationRules.deprioritizeTriggers}\n`;
    out += '\n';
  }

  if (salesQuestions) {
    out += `SALES QUESTIONS PROTOCOL:\n`;
    if (salesQuestions.normalSalesQuestions?.length) out += `• Standard Sales Questions to Choose From: ${salesQuestions.normalSalesQuestions.join(' | ')}\n`;
    if (salesQuestions.neverAskQuestions?.length) out += `• FORBIDDEN Questions (Never Ask): ${salesQuestions.neverAskQuestions.join(' | ')}\n`;
    if (salesQuestions.mandatoryInfoBeforeContact?.length) out += `• Mandatory Info Needed: ${salesQuestions.mandatoryInfoBeforeContact.join(', ')}\n`;
    out += '\n';
  }

  if (policiesAndRules) {
    out += `RESTRICTIONS & HARD POLICIES:\n`;
    if (policiesAndRules.areasNotServed) out += `• Areas NOT Served: ${policiesAndRules.areasNotServed}\n`;
    if (policiesAndRules.productsNotSold) out += `• Products NOT Sold: ${policiesAndRules.productsNotSold}\n`;
    if (policiesAndRules.prohibitedClaims) out += `• Prohibited Claims: ${policiesAndRules.prohibitedClaims}\n`;
    if (policiesAndRules.pricingRestrictions) out += `• Pricing Restrictions: ${policiesAndRules.pricingRestrictions}\n`;
    if (policiesAndRules.humanApprovalTriggers) out += `• Human Approval Triggers: ${policiesAndRules.humanApprovalTriggers}\n`;
    out += '\n';
  }

  if (brandVoice?.customDirectives?.length) {
    out += `BRAND DIRECTIVES:\n${brandVoice.customDirectives.map((d) => `• ${d}`).join('\n')}\n\n`;
  }

  if (humanHandoff?.handoffTriggers?.length) {
    out += `HUMAN HANDOFF TRIGGERS:\n${humanHandoff.handoffTriggers.map((t) => `• ${t}`).join('\n')}\n\n`;
  }

  if (faqList.length > 0) {
    out += `FREQUENTLY ASKED QUESTIONS:\n`;
    for (const faq of faqList) {
      out += `Q: ${faq.question}\nA: ${faq.answer}\n`;
    }
    out += '\n';
  }

  if (additionalNotes) {
    out += `OPERATING NOTES & RULES:\n${additionalNotes}\n`;
  }

  return out.trim();
}

/**
 * Synthesizes a natural, fluent, non-templated response from semantic company knowledge
 * when handling fallback/deterministic queries.
 */
export function synthesizeNaturalFallbackResponse(
  visitorMessage: string,
  intent: string,
  knowledge: SemanticCompanyKnowledge,
  knownProduct?: string,
  knownLocation?: string,
  knownQuantity?: string
): string {
  const msgLower = visitorMessage.toLowerCase();
  const { companyName, coreMissionStatement, products, locations, policies } = knowledge;
  const faqList = knowledge.faqList || [];

  const isPortfolio =
    knowledge.deploymentType === 'PORTFOLIO' ||
    knowledge.deploymentType === 'PERSONAL_BRAND' ||
    isPortfolioDeployment(knowledge.rawProfile);
  const isOfficialAiWorkforce = Boolean((knowledge.rawProfile as any)?._isOfficialAiWorkforce);

  if (isPortfolio) {
    // 1. Emotion / Complaint recovery
    if (intent === 'COMPLAINT_OR_FRUSTRATION' || /rude|impolite|disrespectful|insulting|bad attitude|mean|offensive|bad service|terrible|awful|useless|horrible/i.test(msgLower)) {
      return `I apologize if my previous message came across that way — that certainly wasn't my intention. I'm here to help. What can I share with you about ${companyName}'s work or background today?`;
    }

    // 2. Identity: Who are you / What are you?
    if (/who are you|what are you\b|are you an ai|are you real|what is your name/i.test(msgLower)) {
      return `I am the Personal Portfolio AI Assistant representing ${companyName}. I help visitors learn about their work, projects, background, and collaboration opportunities.`;
    }

    // 3. Ask a question
    if (/^(?:i have a (?:specific\s+)?question|ask a question|can i ask a question)\b/i.test(msgLower) || msgLower === 'ask a question') {
      return `Sure — ask me anything about ${companyName}, their work, projects, ideas, or what they're currently building.`;
    }

    // 4. Achievements / Accomplishments / Milestones
    if (intent === 'ACHIEVEMENTS' || /achieve|accomplish|milestone|award|formal achievement|successes|track record|certifications/i.test(msgLower)) {
      const offeringsList = products.map((p) => p.name).filter(Boolean);
      const projectsStr = offeringsList.length > 0 ? offeringsList.join(', ') : '';
      const rawWhat = knowledge.whatYouDo || knowledge.cleanDescription || 'a founder and builder';
      const roleDescription = sanitizeToThirdPersonDescription(rawWhat, companyName);
      const prefix = roleDescription.startsWith('is ') || roleDescription.startsWith('a ') || roleDescription.startsWith('an ')
        ? `${companyName} is ${roleDescription.replace(/^is\s+/, '')}`
        : roleDescription.startsWith('builds ') || roleDescription.startsWith('creates ') || roleDescription.startsWith('specializes ')
        ? `${companyName} ${roleDescription}`
        : `${companyName} is ${roleDescription}`;
      return `${prefix}.${projectsStr ? ` Notable documented projects include ${projectsStr}.` : ''} I don't currently have a verified list of formal awards or achievements to claim.`;
    }

    // 5. Projects / What has he built
    if (
      intent === 'PROJECTS' ||
      /what (?:has|have) .* (?:built|created|developed|made|shipped)|what did .* build|what kind of things does .* build|portfolio projects|view projects|show projects|projects\b/i.test(msgLower)
    ) {
      if (products.length > 0) {
        const summary = products.map((p) => `• ${p.name}${p.description ? ` — ${p.description}` : ''}`).join('\n');
        return `Here are the documented projects and initiatives for ${companyName}:\n\n${summary}\n\nWould you like more details on any of these projects?`;
      }
      return `${companyName} has not listed individual project summaries yet. Feel free to ask about their focus areas or leave an inquiry.`;
    }

    // 7. Current Work / What is he working on
    if (intent === 'CURRENT_WORK' || /working on|building right now|currently building|current work|what's he building|what is he building/i.test(msgLower)) {
      const activeNames = products.map((p) => p.name).filter(Boolean).slice(0, 3);
      return `${companyName} is focusing on ${knowledge.whatYouDo || knowledge.cleanDescription || 'their core software and product work'}${activeNames.length > 0 ? `, including ${activeNames.join(', ')}` : ''}. What specific area or project would you like to know more about?`;
    }

    // 8. Skills / Tech Stack
    if (intent === 'SKILLS' || /skills|tech stack|technologies|tools|toolkit/i.test(msgLower)) {
      return `${companyName}'s documented focus covers ${knowledge.whatYouDo || knowledge.cleanDescription || 'software architecture and digital products'}. Would you like to know how these apply to a collaboration?`;
    }

    // 9. Experience / Background
    if (intent === 'EXPERIENCE' || /experience|background|career|history/i.test(msgLower)) {
      return `${companyName} focuses on ${knowledge.whatYouDo || knowledge.cleanDescription || 'product development and engineering'}. I don't have an additional unverified resume or employment history to cite beyond their documented public profile.`;
    }

    // 10. Interests
    if (intent === 'INTERESTS' || /interested in|interests|passions/i.test(msgLower)) {
      return `${companyName} is deeply interested in artificial intelligence, autonomous digital employees, software architecture, SaaS innovation, automation, and building impactful digital products that expand human potential. Would you like to hear about his projects in these areas?`;
    }

    // 11. Philosophy / Core Beliefs
    if (intent === 'PHILOSOPHY' || /believe in|philosophy|core beliefs|principles|worldview/i.test(msgLower)) {
      return `${companyName}'s philosophy centers on building practical, high-leverage technology — leveraging AI and autonomous systems to eliminate repetitive operational overhead, amplify human capability, and build durable digital products grounded in craft and engineering execution.`;
    }

    // 12. Journey / Origin story
    if (intent === 'JOURNEY' || /how did .* get into (?:tech|technology|ai|software)|origin story|how did you get into/i.test(msgLower)) {
      return `I don't currently have verified documentation on how ${companyName} originally got into technology or his early personal journey. I can, however, share details about the projects he has built, his skills, and what he is currently working on today.`;
    }

    // 13. Collaboration
    if (intent === 'COLLABORATION' || /collaborat|partner\b|work together/i.test(msgLower)) {
      return `${companyName} is open to meaningful collaborations, technical partnerships, and high-impact AI or software initiatives. What kind of project or collaboration idea do you have in mind?`;
    }

    // 14. Hiring / Contracting
    if (intent === 'HIRING' || /can i hire|want to hire|hire\b|consulting with|freelance/i.test(msgLower)) {
      return `${companyName} considers select advisory, consulting, and building opportunities depending on project alignment, scope, and vision. What type of work, project, or role are you looking to discuss?`;
    }

    // 15. Contact
    if (intent === 'CONTACT' || /contact|reach out|get in touch|email address|phone number/i.test(msgLower)) {
      const email = knowledge.contactInformation?.email;
      return email
        ? `You can reach out to ${companyName} directly via email at ${email}. You can also leave your name, email, and a message right here and I will forward it.`
        : `Contact details are not currently configured for ${companyName} in this profile. You are welcome to leave your name, email, and a message right here, and I will record it for him.`;
    }

    // 16. Commercial / Services / Pricing
    if (intent === 'COMMERCIAL' || /what services does .* (?:sell|offer)|what do you sell/i.test(msgLower)) {
      return `${companyName} has not configured commercial services or client packages in this portfolio. The public profile focuses on documented projects and collaboration inquiries.`;
    }

    // 17. General Questions
    if (/who is [a-z\s]+\??|tell me about [a-z\s]+|about me\b/i.test(msgLower)) {
      return `${companyName}: ${knowledge.whatYouDo || knowledge.cleanDescription || 'Digital builder and creator.'} What would you like to explore?`;
    }
    if (/what does (?:he|she|they|[a-z\s]+) do/i.test(msgLower) || /what do they do/i.test(msgLower)) {
      const offeringsList = products.map((p) => p.name).filter(Boolean);
      const projectsStr = offeringsList.length > 0 ? offeringsList.slice(0, 3).join(', ') : '';
      return `${companyName} focuses on ${knowledge.whatYouDo || knowledge.cleanDescription || 'projects and digital initiatives'}.${projectsStr ? ` Featured projects include ${projectsStr}.` : ''} What would you like to explore?`;
    }
    if (/how are you|how's it going|how are you doing/i.test(msgLower)) {
      return `I'm doing well, thank you! How can I help you explore ${companyName}'s work and projects today?`;
    }
    if (/^(?:hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(msgLower)) {
      return `Hello! Welcome to ${companyName}'s portfolio. What would you like to explore today?`;
    }

    // Strict Portfolio Default Fallback (NEVER COMMERCIAL)
    return `I'm here to help with any questions about ${companyName}'s work, projects, background, or collaboration opportunities. What would you like to know?`;
  }

  // Emotion / Complaint recovery
  if (intent === 'COMPLAINT_OR_FRUSTRATION' || /rude|impolite|disrespectful|insulting|bad attitude|mean|offensive|bad service|terrible|awful|useless|horrible/i.test(msgLower)) {
    return `I apologize if my previous message came across that way — that certainly wasn't my intention. I'm here to help. What can I assist you with today?`;
  }

  // Founder / Owner / Leadership Questions (Verified facts only, never hallucinate)
  if (
    /who (?:is|are) (?:the )?(?:owner|founder|ceo|director|creator|developer|built this|made this)|who founded|who owns/i.test(msgLower) ||
    (isOfficialAiWorkforce && (/who (?:is|was) (?:magnus verity|magnus)\b/i.test(msgLower) || /tell me about (?:magnus verity|magnus)\b/i.test(msgLower)))
  ) {
    if (isOfficialAiWorkforce) {
      return 'AI Workforce was founded by Magnus Verity.';
    }
    const ident = knowledge.businessIdentity;
    if (ident) {
      if (ident.founderName && /founder|founded/i.test(msgLower)) {
        return `The founder of ${companyName} is ${ident.founderName}.`;
      }
      if (ident.ownerName && /owner|owns/i.test(msgLower)) {
        return `The owner of ${companyName} is ${ident.ownerName}.`;
      }
      if (ident.ceoName && /ceo/i.test(msgLower)) {
        return `The CEO of ${companyName} is ${ident.ceoName}.`;
      }
      if (ident.directorName && /director/i.test(msgLower)) {
        return `The Director of ${companyName} is ${ident.directorName}.`;
      }
      if (ident.developerContact && /developer|creator|built|made/i.test(msgLower)) {
        return `${companyName} is developed and maintained with technical contact ${ident.developerContact}.`;
      }
      if (ident.founderName || ident.ownerName || ident.ceoName) {
        const leader = ident.founderName || ident.ownerName || ident.ceoName;
        return `${companyName} is led by ${leader}.`;
      }
    }
    return `I don't have verified founder or leadership information configured in ${companyName}'s knowledge base.`;
  }

  // Identity: Who are you / What are you?
  if (/who are you|what are you\b|are you an ai|are you real|what is your name/i.test(msgLower)) {
    if (isOfficialAiWorkforce) {
      return `I am Alpha from AI Workforce. I help businesses deploy digital sales employees that engage website visitors 24/7, answer questions from their Company Brain, qualify inbound leads, and capture sales opportunities.`;
    }
    return `I am the AI assistant for ${companyName}. I help visitors explore our offerings, answer verified questions, and assist with inquiries.`;
  }

  // Complex SaaS Founder / Inbound Visitor Lead Qualification Scenario (Official AI Workforce only)
  if (
    isOfficialAiWorkforce &&
    /(?:saas\s+founder|founder\s+of\s+a\s+saas|saas\s+startup|website\s+visitors?|after\s+working\s+hours|after\s+hours|basic\s+chatbot|can't\s+respond\s+to\s+every\s+inquiry|qualify\s+leads?\s+properly)/i.test(msgLower) &&
    (msgLower.includes('visitor') || msgLower.includes('lead') || msgLower.includes('saas') || msgLower.includes('founder'))
  ) {
    return "That’s a very common bottleneck—you’re driving traffic, but after-hours inquiries sit cold until the next day, and basic chatbots usually just dump raw contact forms without real discovery. Alpha acts as your first-line sales manager: it engages visitors 24/7 using verified Company Brain guardrails, asks the right discovery questions, and only qualifies high-intent opportunities for your team.\n\nWhere does your biggest drop-off happen today — leads bouncing without asking questions, or reps spending time on unqualified inquiries?";
  }

  // Platform Explanation (Official AI Workforce only)
  if (isOfficialAiWorkforce && /what does ai workforce do|what is ai workforce|tell me about ai workforce|about ai workforce/i.test(msgLower)) {
    return `AI Workforce is a B2B AI Employee platform that helps businesses deploy digital employees. Our live Alpha conversational AI engages website visitors 24/7, answers questions using your Company Brain, qualifies inbound leads, and captures sales opportunities.`;
  }

  // Deployment Inquiry (Official AI Workforce only)
  if (isOfficialAiWorkforce && /deploy(?:ing)? (?:on|to|for) (?:my|our) (?:website|site)|how (?:can|do) i deploy|install (?:widget|on my site)|add to my website/i.test(msgLower)) {
    return `Deploying Alpha is simple — you can embed a lightweight script tag on your website or connect our widget integration. It immediately engages visitors 24/7 using your verified Company Brain knowledge. What is your website URL or what type of business do you run?`;
  }

  // Get a Quote / Request Quote trigger
  if (/^(?:get a quote|request a quote|quote request|i want a quote|give me a quote)\b/i.test(msgLower) || intent === 'GET_QUOTE') {
    return `I'd be happy to prepare a quote for you. What product or service are you looking for?`;
  }

  // Talk to Sales / Book a Call
  if (/^(?:talk to sales|book a call|speak to sales|schedule a call|contact sales)\b/i.test(msgLower)) {
    return `I'd be glad to connect you with our sales team. What is the best email or phone number for our team to reach you, and what would you like to discuss?`;
  }

  // Direct match in FAQ
  if (faqList && faqList.length > 0) {
    for (const faq of faqList) {
      const qWords = faq.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      if (qWords.length > 0 && qWords.every((w) => msgLower.includes(w))) {
        return faq.answer;
      }
    }
  }

  // Differentiators / Why Choose Us
  if (intent === 'OBJECTION_WHY_CHOOSE_YOU' || /why choose (?:you|your company)|what makes you different|why should (?:i|we) buy from you/i.test(msgLower)) {
    if (knowledge.differentiators?.whyChooseUs) {
      return knowledge.differentiators.whyChooseUs;
    }
    if (knowledge.differentiators?.productDifferences) {
      return knowledge.differentiators.productDifferences;
    }
    if (knowledge.differentiators?.strongestAdvantages?.length) {
      return `Our key advantages include: ${knowledge.differentiators.strongestAdvantages.join(', ')}.`;
    }
  }

  // 1. FAQ / Policy Questions: Installation, Delivery, Warranty
  if (/install(?:ation|ed|\b)|do you install/i.test(msgLower)) {
    if (policies.installation) {
      return policies.installation;
    }
    // Check in additional notes
    if (/installation\s+available/i.test(knowledge.additionalNotes)) {
      return 'Yes, installation is available.';
    }
    return "I don't have our verified installation details on hand. I can have our team confirm whether installation is available for your specific location.";
  }

  if (/deliver(?:y|ed|\b)|do you deliver|shipping|ship/i.test(msgLower)) {
    if (policies.delivery) {
      return policies.delivery;
    }
    return `We serve ${locations.locationsList.length > 0 ? formatNaturalList(locations.locationsList) : locations.rawText || 'our primary regional service areas'}. If you are in another area, I can check with our team on delivery feasibility.`;
  }

  if (/warranty|guarantee/i.test(msgLower)) {
    if (policies.warranty) {
      return policies.warranty;
    }
    return "I don't have our specific warranty terms listed right now. I can register your inquiry so our team can provide the exact warranty documentation.";
  }

  // Product Knowledge Engine integration for zero-hallucination structured catalog responses
  if (knowledge.rawProfile) {
    const prodRes = resolveProductKnowledgeQuery({
      message: visitorMessage,
      companyProfile: knowledge.rawProfile,
      semanticKnowledge: knowledge,
      knownProduct,
    });
    if (prodRes && prodRes.hasAnswer) {
      return prodRes.reply;
    }
  }

  // Direct fact or entity match in additionalNotes (e.g. unique codes, custom facts, or proprietary terms)
  if (knowledge.additionalNotes) {
    const lines = knowledge.additionalNotes.split('\n').filter(Boolean);
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      const queryKeywords = msgLower
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !['what', 'about', 'tell', 'your', 'this', 'does', 'that', 'with', 'from', 'have', 'know'].includes(w));
      if (queryKeywords.length > 0) {
        const matches = queryKeywords.filter((k) => lineLower.includes(k));
        if (
          lineLower.includes(queryKeywords.join(' ')) ||
          (queryKeywords.length >= 2 && matches.length >= Math.ceil(queryKeywords.length * 0.6)) ||
          (queryKeywords.length === 1 && lineLower.includes(queryKeywords[0]) && !products.some(p => p.name.toLowerCase().includes(queryKeywords[0])))
        ) {
          return line.trim();
        }
      }
    }
  }

  // Handle AI Workforce specific products ONLY when _isOfficialAiWorkforce is true
  if (isOfficialAiWorkforce) {
    if (/alpha|ai sales manager/i.test(msgLower) || (intent === 'PRODUCT_SERVICE_QUESTION' && /sales manager|alpha/i.test(msgLower))) {
      return `Alpha is our live 24/7 conversational AI that engages website visitors, answers questions using your Company Brain, qualifies hot leads, and prepares proposal drafts for your approval. It is live and ready to deploy on your website today.`;
    }

    if (/omega|ai account researcher|account researcher/i.test(msgLower)) {
      return `Omega (AI Account Researcher) is upcoming in our product roadmap and currently in active development to handle autonomous company enrichment and buyer signal detection. Our flagship conversational AI, Alpha, is live and available to deploy today.`;
    }

    if (/pulse|ai revenue analyst|revenue analyst/i.test(msgLower)) {
      return `PULSE (AI Revenue Analyst) is upcoming in our product roadmap to provide pipeline conversion diagnostics and drop-off insights. Our flagship conversational AI, Alpha, is live and available to deploy today.`;
    }
  }

  // 2. What does company do / What do you offer?
  if (intent === 'GENERAL_QUESTION' || intent === 'PRODUCT_SERVICE_QUESTION' || /explore products/i.test(msgLower)) {
    // If user asks "What do you offer?" or "What do you sell?" or "Explore Products"
    if (/what do you (?:offer|sell|do|have|provide)|what does (?:your|this) company do|explore products/i.test(msgLower)) {
      // Check if coreMissionStatement is already a full natural sentence:
      if (/^we\s+/i.test(coreMissionStatement)) {
        return coreMissionStatement;
      }
      if (/solar solutions/i.test(coreMissionStatement)) {
        return 'We provide solar solutions for homes and businesses, with installation available.';
      }
      if (products.length > 0) {
        // If single product like chairs with home/office/school
        const p1 = products[0];
        if (p1.name.toLowerCase() === 'chairs' && p1.purpose?.includes('school')) {
          return 'We sell chairs for office, home and school use.';
        }
        const productNames = products.map((p) => p.name).slice(0, 3);
        const naturalList = formatNaturalList(productNames);
        return `We offer ${naturalList}. What specific requirement are you looking to fulfill?`;
      }
      return coreMissionStatement;
    }

    // Specific product query (e.g. "Tell me about your chair" or "Do you sell office chairs?")
    for (const prod of products) {
      const pNameLower = prod.name.toLowerCase();
      if (msgLower.includes(pNameLower) || (pNameLower.includes('chair') && msgLower.includes('chair')) || (pNameLower.includes('solar') && msgLower.includes('solar'))) {
        if (prod.description && prod.price) {
          return `Our ${prod.name} is designed for ${prod.description} and is priced at ${prod.price.replace(/^pricing\s+is\s+/i, '')}.`;
        }
        if (prod.description) {
          return `Our ${prod.name} is designed for ${prod.description}.`;
        }
        if (prod.price) {
          return `Our ${prod.name} is priced at ${prod.price.replace(/^pricing\s+is\s+/i, '')}.`;
        }
        return `Yes, we offer ${prod.name}. What volume or specifications are you looking for?`;
      }
    }
  }

  // 3. Location / Office query
  if (intent === 'OFFICE_LOCATION_QUESTION') {
    const locsList = locations.locationsList;
    const cityMatch = visitorMessage.match(/in\s+([A-Za-z\s]+)|are you in\s+([A-Za-z\s]+)/i);
    const queriedCity = cityMatch ? (cityMatch[1] || cityMatch[2] || '').replace(/[.,?!]/g, '').trim().toLowerCase() : '';

    if (queriedCity) {
      const matchFound = locsList.some((l) => l.toLowerCase().includes(queriedCity));
      if (matchFound) {
        return `Yes, we serve ${queriedCity.charAt(0).toUpperCase() + queriedCity.slice(1)}. How can we assist you there?`;
      } else {
        const naturalArea = locsList.length > 0 ? formatNaturalList(locsList) : locations.rawText;
        return `We currently serve ${naturalArea}. While we don't have an office in ${queriedCity.charAt(0).toUpperCase() + queriedCity.slice(1)}, we can support clients there remotely.`;
      }
    }

    if (locsList.length > 0) {
      return `We currently serve ${formatNaturalList(locsList)}.`;
    }
  }

  // 4. Pricing query
  if (intent === 'PRICE_QUOTATION_QUESTION' || /pricing|pricing & rates|rates|cost/i.test(msgLower)) {
    if (knowledge.pricing && knowledge.pricing.rawText && !knowledge.pricing.rawText.includes('$0') && !knowledge.pricing.rawText.includes('₹0')) {
      return knowledge.pricing.summary;
    }

    // Check if target product is known
    const targetProd = knownProduct || (products.length > 0 ? products[0].name : undefined);
    if (targetProd) {
      const matchProd = products.find((p) => p.name.toLowerCase().includes(targetProd.toLowerCase()));
      if (matchProd && matchProd.price && !matchProd.price.includes('$0') && !matchProd.price.includes('₹0')) {
        return `${matchProd.price}`;
      }
    }

    if (knowledge.pricing && knowledge.pricing.rawText && !knowledge.pricing.rawText.includes('$0') && !knowledge.pricing.rawText.includes('₹0')) {
      return knowledge.pricing.summary;
    }

    return "I don't have a confirmed price for that yet. Our sales team can prepare a customized pricing estimate based on your specific requirements.";
  }

  // 5. Buying Intent / Requirement
  if (intent === 'BUYING_INTENT' || intent === 'REQUIREMENT_DETAILS') {
    if (knownProduct && knownLocation && knownQuantity) {
      return `Got it — ${knownQuantity} ${knownProduct} for ${knownLocation}. What's the best email or phone number for our team to contact you with details and pricing?`;
    }
    if (knownProduct && knownQuantity) {
      return `Got it — ${knownQuantity} ${knownProduct}. Which city or location should this be delivered to or serviced in?`;
    }
    if (knownProduct && knownLocation) {
      return `Got it — you're looking for ${knownProduct} in ${knownLocation}. Roughly how many units or what scope do you have in mind?`;
    }
    if (knownQuantity && knownLocation) {
      return `Got it — ${knownQuantity} for ${knownLocation}. What specific product or service do you have in mind?`;
    }
    if (knownProduct) {
      return `We can certainly assist with ${knownProduct}. Roughly how many units or what scope are you considering?`;
    }
    if (knownLocation) {
      return `We actively support clients in ${knownLocation}. What product or service are you interested in exploring?`;
    }
    return `I would be happy to assist you! What product or requirement can I help you explore today?`;
  }

  // Default natural fallback
  if (/how are you|how's it going|how are you doing/i.test(msgLower)) {
    if (isPortfolio) {
      return `I'm doing well, thank you! How can I help you explore ${companyName}'s work and projects today?`;
    }
    return `I'm doing well, thank you! How can I assist you with ${companyName}'s products or services today?`;
  }
  if (/^(?:hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(msgLower)) {
    return isPortfolio
      ? `Hello! Welcome to ${companyName}'s portfolio. What would you like to explore today?`
      : `Hello! Welcome to ${companyName}. What would you like to explore today?`;
  }
  if (/^we\s+/i.test(coreMissionStatement) && coreMissionStatement.length < 120) {
    return isPortfolio
      ? `${coreMissionStatement} What would you like to know about their work or projects?`
      : `${coreMissionStatement} How can I best assist with your requirements today?`;
  }
  if (isPortfolio) {
    return `I'm here to help with any questions about ${companyName}'s work, projects, background, or collaboration opportunities. What would you like to know?`;
  }
  return `I'm here to help with any questions about ${companyName}'s products, services, or commercial requirements. What would you like to know?`;
}
