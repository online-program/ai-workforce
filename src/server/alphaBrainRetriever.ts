import { CompanyProfile, OfferingItem } from '../types.ts';
import { CompanyProfileInput } from './analyzeHandler.ts';
import { getNormalizedCatalog, CatalogItem } from './productKnowledgeEngine.ts';
import { isOfficialTenantId, isReservedOfficialWidgetId } from './platformConfig.ts';

export interface RetrievedBrainSlice {
  companyName: string;
  brandName: string;
  industry: string;
  description: string;
  relevantOfferings: string;
  pricingInfo: string;
  faqsAndPolicies: string;
  groundingBoundaries: string;
  businessRules: string;
  brandTone: string;
  isPortfolio: boolean;
  unlistedPricingNotice?: string;
  industryKnowledge?: string;
  operationalDetails?: string;
  founderInfo?: string;
  headcountInfo?: string;
  isOfficialAiWorkforce?: boolean;
  isConfigured: boolean;
  alphaDirectives?: {
    objectives?: string[];
    priorities?: string[];
    escalateWhen?: string[];
    forbidden?: string[];
  };
}

// In-Memory Brain Slice TTL Cache for Sub-1.2s Latency with Strict Tenant Isolation & Bound
const brainCache = new Map<string, { slice: RetrievedBrainSlice; timestamp: number }>();
const CACHE_TTL_MS = 300000; // 5 minutes TTL
const MAX_BRAIN_CACHE_ENTRIES = 1000;

export function invalidateBrainCache(tenantOrWidgetId?: string): void {
  if (!tenantOrWidgetId) {
    brainCache.clear();
    return;
  }
  for (const key of brainCache.keys()) {
    if (key.startsWith(`t:${tenantOrWidgetId}::`) || key.includes(`::w:${tenantOrWidgetId}::`)) {
      brainCache.delete(key);
    }
  }
}

export function retrieveRelevantBrainSlice(
  companyProfile: CompanyProfileInput | undefined,
  message: string,
  currentTopic?: string
): RetrievedBrainSlice {
  const tenantId =
    (companyProfile as any)?._tenantId ||
    (companyProfile as any)?.user_id ||
    (companyProfile as any)?.id ||
    'unscoped_tenant';
  const widgetId = (companyProfile as any)?._widgetId || 'unscoped_widget';
  const version =
    (companyProfile as any)?._brainVersion ||
    (companyProfile as any)?.version ||
    (companyProfile as any)?.updatedAt ||
    'v1';

  const isOfficialAiWorkforce =
    isOfficialTenantId(tenantId) || isReservedOfficialWidgetId(widgetId);

  const cacheKey = `t:${tenantId}::w:${widgetId}::v:${version}::official:${isOfficialAiWorkforce ? '1' : '0'}::topic:${currentTopic || 'all'}::q:${(message || '').slice(0, 32).toLowerCase().trim()}`;
  const cached = brainCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.slice;
  }

  const structuredBrain = (companyProfile as any)?.companyBrain;
  const rawName =
    structuredBrain?.core?.businessName ||
    companyProfile?.brandName?.trim() ||
    companyProfile?.name?.trim() ||
    '';

  const bName =
    rawName && (isOfficialAiWorkforce || rawName !== 'AI Workforce')
      ? rawName
      : isOfficialAiWorkforce
      ? 'AI Workforce'
      : 'Business Assistant';

  const industry = structuredBrain
    ? `${structuredBrain.industry?.industryName || 'Commercial'} (${structuredBrain.industry?.businessTypeName || 'General'})`
    : companyProfile?.industry || (isOfficialAiWorkforce ? 'Conversational AI & Digital Employees' : 'General Business');

  const description =
    structuredBrain?.core?.description ||
    companyProfile?.shortDescription?.trim() ||
    companyProfile?.description?.trim() ||
    companyProfile?.whatYouDo?.trim() ||
    (isOfficialAiWorkforce
      ? 'AI employee platform delivering 24/7 conversational sales managers.'
      : `Official assistant for ${bName}, helping visitors explore verified offerings and submit inquiries.`);

  const isPortfolio =
    (companyProfile?.deploymentType || '').toString().toUpperCase() === 'PORTFOLIO';

  const lowerMsg = message.toLowerCase();
  const lowerTopic = (currentTopic || '').toLowerCase();

  // 1. Catalog extraction
  const catalog = getNormalizedCatalog(companyProfile as Partial<CompanyProfile>);

  // Rank catalog items based on keyword relevance to message & topic
  const matchingItems: CatalogItem[] = [];
  const otherItems: CatalogItem[] = [];

  for (const item of catalog) {
    const itemNameLower = item.name.toLowerCase();
    const itemDescLower = (item.description || '').toLowerCase();
    if (
      lowerMsg.includes(itemNameLower) ||
      itemNameLower.includes(lowerMsg) ||
      (lowerTopic && (lowerTopic.includes(itemNameLower) || itemNameLower.includes(lowerTopic))) ||
      itemDescLower.includes(lowerMsg)
    ) {
      matchingItems.push(item);
    } else {
      otherItems.push(item);
    }
  }

  // Build relevant offerings text (prioritize matches, cap to prevent token bloating)
  const chosenItems = [...matchingItems, ...otherItems].slice(0, 6);
  let relevantOfferings = chosenItems
    .map((item) => {
      const pricePart = item.price ? ` (${item.price})` : '';
      const descPart = item.description ? `: ${item.description}` : '';
      return `- ${item.name}${pricePart}${descPart}`;
    })
    .join('\n');

  if (!relevantOfferings && companyProfile?.products) {
    relevantOfferings = companyProfile.products;
  }

  // If structured industry data exists, incorporate it into industryKnowledge
  let industryKnowledge = '';
  if (structuredBrain?.industry?.data) {
    const lines = Object.entries(structuredBrain.industry.data)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
    if (lines.length > 0) {
      industryKnowledge = lines.join('\n');
    }
  }

  // Incorporate multi-module industry data if present
  if (Array.isArray(structuredBrain?.additionalIndustries) && structuredBrain.additionalIndustries.length > 0) {
    const addLines = structuredBrain.additionalIndustries.map(
      (ind: any) => `• Additional Module - ${ind.industryName || ind.industryId} (${ind.businessTypeName || 'Specialized'}):\n` +
        Object.entries(ind.data || {})
          .filter(([_, v]) => Boolean(v))
          .map(([k, v]) => `  - ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join('\n')
    );
    industryKnowledge += (industryKnowledge ? '\n' : '') + addLines.join('\n');
  }

  // If structured operations exist, incorporate it
  let operationalDetails = '';
  if (structuredBrain?.operations) {
    const opLines: string[] = [];
    if (structuredBrain.operations.appointmentBookingMethod) {
      opLines.push(`• Appointments: ${structuredBrain.operations.appointmentBookingMethod}`);
    }
    if (structuredBrain.operations.subscriptionStructure) {
      opLines.push(`• Subscription Structure: ${structuredBrain.operations.subscriptionStructure}`);
    }
    if (structuredBrain.operations.physicalLocationsHours) {
      opLines.push(`• Locations & Hours: ${structuredBrain.operations.physicalLocationsHours}`);
    }
    if (structuredBrain.operations.productDeliveryOrShipping) {
      opLines.push(`• Fulfillment / Delivery: ${structuredBrain.operations.productDeliveryOrShipping}`);
    }
    if (structuredBrain.operations.serviceConsultationModel) {
      opLines.push(`• Consultation Model: ${structuredBrain.operations.serviceConsultationModel}`);
    }
    if (opLines.length > 0) {
      operationalDetails = opLines.join('\n');
    }
  }

  // 2. Pricing Slice
  let pricingInfo = structuredBrain?.policies?.pricingPolicy || companyProfile?.pricing?.trim() || (companyProfile as any)?.pricing_summary?.trim() || '';
  let unlistedPricingNotice: string | undefined;

  const isAskingPrice =
    /\b(?:price|pricing|cost|how much|rates?|fees?|packages?|quote|expensive|cheap|free)\b/i.test(lowerMsg);

  if (!pricingInfo) {
    if (isOfficialAiWorkforce) {
      pricingInfo = 'Official pricing for AI Workforce is customized based on deployment scope, traffic volume, and integration requirements. Standard subscription rates are unlisted in our Company Brain; our team provides tailored commercial quotes directly.';
    } else if (matchingItems.length > 0 && matchingItems[0].price && matchingItems[0].price !== 'Custom Quote') {
      pricingInfo = `Verified pricing for ${matchingItems[0].name}: ${matchingItems[0].price}.`;
    } else if (catalog.length > 0) {
      const pricedItems = catalog.filter((c) => c.price && c.price !== 'Custom Quote');
      if (pricedItems.length > 0) {
        pricingInfo = pricedItems.slice(0, 4).map((c) => `${c.name}: ${c.price}`).join(', ');
      } else {
        unlistedPricingNotice = `Custom / scope-based pricing for ${bName}. Do not fabricate an exact rate. Explain that pricing depends on requirements and offer to connect them with the team.`;
        pricingInfo = unlistedPricingNotice;
      }
    } else {
      unlistedPricingNotice = `Custom / scope-based pricing for ${bName}. Do not fabricate an exact rate. Explain that pricing depends on requirements and offer to connect them with the team.`;
      pricingInfo = unlistedPricingNotice;
    }
  }

  // 3. FAQs & Policies Slice
  const faqSections: string[] = [];
  if (companyProfile?.faqData) {
    const faqs = companyProfile.faqData.split('\nQ:');
    for (const faq of faqs) {
      const trimmed = faq.trim();
      if (!trimmed) continue;
      if (
        isAskingPrice ||
        lowerMsg.includes('alpha') ||
        lowerMsg.includes('work') ||
        lowerMsg.includes('trust') ||
        lowerMsg.includes('guarantee') ||
        lowerMsg.includes('delivery') ||
        lowerMsg.includes('return') ||
        lowerMsg.includes('shipping') ||
        lowerMsg.includes('admission') ||
        lowerMsg.includes('hours') ||
        lowerMsg.includes('appointment')
      ) {
        faqSections.push(trimmed.startsWith('Q:') ? trimmed : `Q: ${trimmed}`);
      }
    }
  }

  if (companyProfile?.businessRules) {
    faqSections.push(`Business Rules: ${companyProfile.businessRules}`);
  }

  if (operationalDetails) {
    faqSections.push(`Operational Procedures:\n${operationalDetails}`);
  }

  // Include custom knowledge fields if present
  if (structuredBrain?.customKnowledge?.customFields?.length) {
    const customLines = structuredBrain.customKnowledge.customFields
      .filter((f: any) => f.isPublic !== false && Boolean(f.value))
      .map((f: any) => `• ${f.label || f.key}: ${f.value}`);
    if (customLines.length > 0) {
      faqSections.push(`Custom Specifications:\n${customLines.join('\n')}`);
    }
  }

  // 4. Grounding Boundaries (Strict Truth Rules)
  const boundaries: string[] = [
    `TRUTH HIERARCHY:`,
    `1. Use verified facts in this Company Brain slice representing ${bName}.`,
    `2. If an exact company-specific fact is not stated here, DO NOT INVENT IT.`,
    `3. Politely explain that the information is not publicly listed or requires team confirmation.`,
    `4. Never hallucinate third-party integrations (e.g., Salesforce, SAP) unless explicitly documented as connected.`,
  ];

  if (structuredBrain?.workflows?.executableActions?.length) {
    boundaries.push(`ALLOWED AUTONOMOUS ACTIONS: ${structuredBrain.workflows.executableActions.join(', ')}`);
  }
  if (structuredBrain?.workflows?.recommendOnlyActions?.length) {
    boundaries.push(`RECOMMEND-ONLY (NO AUTONOMOUS COMMITMENT): ${structuredBrain.workflows.recommendOnlyActions.join(', ')}`);
  }

  if (structuredBrain?.alpha?.forbiddenBehaviors?.length) {
    boundaries.push(`FORBIDDEN BEHAVIORS: ${structuredBrain.alpha.forbiddenBehaviors.join('; ')}`);
  } else if (companyProfile?.forbiddenClaims && companyProfile.forbiddenClaims.length > 0) {
    boundaries.push(`FORBIDDEN CLAIMS: ${companyProfile.forbiddenClaims.join('; ')}`);
  }

  if (structuredBrain?.alpha?.escalationRules?.length) {
    boundaries.push(`HUMAN ESCALATION TRIGGERS: ${structuredBrain.alpha.escalationRules.join('; ')}`);
  }

  const alphaTone =
    structuredBrain?.alpha?.tone ||
    companyProfile?.aiTone ||
    companyProfile?.tone ||
    'Consultative, precise, natural, warm, and concise';

  // Founder Information extraction
  const rawFounder =
    (companyProfile as any)?.founderName ||
    (companyProfile as any)?.ceoName ||
    (companyProfile as any)?.directorName ||
    (companyProfile as any)?.leadership ||
    structuredBrain?.core?.founderOrLeadership;

  let founderInfo: string;
  if (isOfficialAiWorkforce) {
    founderInfo = 'Magnus Verity is the founder and CEO of AI Workforce, the company behind Alpha.';
  } else if (rawFounder) {
    founderInfo = `${rawFounder} is the founder/leadership of ${bName}.`;
  } else {
    founderInfo = `The founder/leadership of ${bName} is not publicly specified in the verified Company Brain.`;
  }

  let headcountInfo: string;
  const verifiedHeadcount = (companyProfile as any)?.teamSize || (companyProfile as any)?.employeeCount || (companyProfile as any)?.headcount;
  if (verifiedHeadcount) {
    headcountInfo = `${bName}'s verified team size/headcount is ${verifiedHeadcount}.`;
  } else {
    headcountInfo = `Headcount and team size for ${bName} are not specified in the verified Company Brain. State clearly that you do not have a verified headcount figure rather than guessing or substituting founder information.`;
  }

  const slice: RetrievedBrainSlice = {
    companyName: bName,
    brandName: companyProfile?.brandName || bName,
    industry,
    description,
    relevantOfferings: relevantOfferings || 'General company solutions and services.',
    pricingInfo: pricingInfo || 'Refer to verified offerings. Custom quotes provided upon scope review.',
    faqsAndPolicies: faqSections.slice(0, 6).join('\n') || 'Policies: Standard commercial consultation & review.',
    groundingBoundaries: boundaries.join('\n'),
    businessRules: companyProfile?.businessRules || 'Always ground statements in verified Company Brain.',
    brandTone: alphaTone,
    isPortfolio,
    unlistedPricingNotice,
    industryKnowledge,
    operationalDetails,
    founderInfo,
    headcountInfo,
    isOfficialAiWorkforce,
    isConfigured: Boolean(
      companyProfile &&
      (Boolean(rawName) ||
        catalog.length > 0 ||
        Boolean(companyProfile.products) ||
        Boolean(companyProfile.faqData) ||
        Boolean(companyProfile.description) ||
        Boolean(companyProfile.shortDescription) ||
        Boolean(companyProfile.whatYouDo) ||
        Boolean(structuredBrain))
    ),
    alphaDirectives: structuredBrain?.alpha
      ? {
          objectives: structuredBrain.alpha.objectives,
          priorities: structuredBrain.alpha.priorities,
          escalateWhen: structuredBrain.alpha.escalationRules,
          forbidden: structuredBrain.alpha.forbiddenBehaviors,
        }
      : undefined,
  };

  if (brainCache.size >= MAX_BRAIN_CACHE_ENTRIES) {
    const oldestKey = brainCache.keys().next().value;
    if (oldestKey) brainCache.delete(oldestKey);
  }
  brainCache.set(cacheKey, { slice, timestamp: Date.now() });
  return slice;
}
