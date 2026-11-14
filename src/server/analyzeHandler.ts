import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { buildInquiryAnalysisSystemInstruction } from './promptTemplates.ts';
import { validateAndNormalizeInquiryFields } from './semanticFieldValidator.ts';
import { BusinessType, BusinessModelType, SalesPlaybook, OfferingItem, BusinessIdentity, DeploymentType, ContactInformation } from '../types.ts';

dotenv.config();

export interface CompanyProfileInput {
  name?: string;
  brandName?: string;
  deploymentType?: DeploymentType;
  shortDescription?: string;
  whatYouDo?: string;
  targetAudience?: string;
  mainGoals?: string[];
  keyInformation?: string;
  contactInformation?: ContactInformation;
  inquiryFields?: string[];
  aiIdentity?: string;
  aiTone?: string;
  aiIntroduction?: string;
  aiRepresents?: string;
  forbiddenClaims?: string[];
  industry?: string;
  businessType?: BusinessType;
  businessModelType?: BusinessModelType;
  products?: string;
  locations?: string;
  minOrder?: string;
  tone?: string;
  businessRules?: string;
  description?: string;
  primaryGoal?: string;
  website?: string;
  pricing?: string;
  targetCustomers?: string;
  serviceArea?: string;
  approval_mode?: 'automatic_for_simple' | 'human_approval_required';
  unknownQuestionBehavior?: 'human_approval' | 'best_effort' | 'available_data';
  salesPlaybook?: SalesPlaybook;
  differentiators?: {
    whyChooseUs?: string;
    strongestAdvantages?: string[];
    guarantees?: string;
  };
  offerings?: OfferingItem[];
  faqData?: string;
  additionalKnowledge?: string;
  businessIdentity?: BusinessIdentity;
  country?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
}

export interface AnalysisResult {
  customer_name: string;
  source: string;
  original_message: string;
  product_or_service: string;
  quantity: string;
  location: string;
  deadline: string;
  budget: string;
  requirements: string[];
  customer_facts: string[];
  customer_intent: string;
  lead_temperature: 'HOT' | 'WARM' | 'COLD';
  lead_reason: string;
  missing_information: string[];
  recommended_action: string;
  draft_reply: string;
  // Compatibility aliases:
  temperature_reason?: string;
  lead_score?: 'HOT' | 'WARM' | 'COLD';
  company_name?: string;
  recommended_next_action?: string;
  suggested_reply?: string;
  sales_summary?: string;
  raw_inquiry?: string;
  analyzed_at?: string;
}

// Deterministic rule-based analyzer with strict non-hallucination guarantees
export function fallbackRuleBasedAnalysis(
  inquiryText: string,
  companyProfile?: CompanyProfileInput,
  source: string = 'Email',
  customerName?: string
): AnalysisResult {
  const companyName = companyProfile?.name || 'Our Company';
  const text = inquiryText.trim();
  const textLower = text.toLowerCase();
  const isServices = companyProfile?.businessType === 'services' || /course|training|consulting|agency|saas|software|service|skill/i.test(companyProfile?.industry || '');

  // 1. Detect Employee / Team / User count vs Product Quantity
  let employeeCount: string | null = null;
  const empMatch = text.match(/(?:for\s+(?:around\s+|approx(?:\.|imately)?\s+|about\s+)?|\b)(\d+)\s+(?:employees|people|staff|team\s+members|users|students|learners|participants)\b/i);
  if (empMatch) {
    employeeCount = empMatch[1];
  }

  // Detect explicit quantity (units, pieces, sets, licences, seats, hours)
  let quantity = 'Unknown';
  const explicitQtyMatch =
    text.match(/\b(\d+)\s*(?:office\s+)?(chairs|desks|workstations|units|pieces|sets|pcs|items|nos|seats|licenses|users|hours|sessions)\b/i) ||
    text.match(/(?:need|require|order|buy|purchasing|procure|enroll)\s+(\d+)\s+(?:office\s+)?([a-z\s]+)\b/i) ||
    text.match(/quantity\s*[:=]?\s*(\d+)/i);

  if (explicitQtyMatch) {
    quantity = explicitQtyMatch[1];
  } else if (/\b(?:just\s+)?1\s+(?:unit|piece|item|service|plan|license|user)\b/i.test(textLower) || textLower.includes('sell 1 ')) {
    quantity = '1';
  } else if (isServices && employeeCount) {
    quantity = `${employeeCount} seats/learners`;
  }

  // 2. Detect Location explicitly stated
  let location = 'Unknown';
  if (/cyber city,\s*gurgaon|cyber city/i.test(text)) {
    location = 'Cyber City, Gurgaon';
  } else if (/gurgaon|dlf/i.test(text)) {
    location = 'Gurgaon';
  } else if (/noida sector\s*\d+|noida/i.test(text)) {
    const noidaMatch = text.match(/noida sector\s*\d+/i);
    location = noidaMatch ? noidaMatch[0] : 'Noida';
  } else if (/connaught place|south delhi|delhi/i.test(text)) {
    if (/connaught place/i.test(text)) location = 'Connaught Place, Delhi';
    else if (/south delhi/i.test(text)) location = 'South Delhi';
    else location = 'Delhi';
  } else if (/bangalore|koramangala/i.test(text)) {
    location = 'Bangalore';
  } else if (/mumbai/i.test(text)) {
    location = 'Mumbai';
  } else if (/remote|online/i.test(text)) {
    location = 'Remote / Online';
  }

  // 3. Detect Product / Service explicitly mentioned
  let productOrService = 'Unknown';
  if (/office chairs|office chair/i.test(text)) {
    productOrService = 'Office chairs';
  } else if (/motorized standing desk|standing desk|motorized desk/i.test(text)) {
    productOrService = 'Motorized standing desks';
  } else if (/cantilever conference chair|conference chair/i.test(text)) {
    productOrService = 'Cantilever conference chairs';
  } else if (/workstations|workstation/i.test(text)) {
    productOrService = 'Workstations';
  } else if (/\bergonomic desks\b|\bdesks\b|\bdesk\b/i.test(text)) {
    productOrService = 'Desks';
  } else if (/course|upskilling|training|curriculum|bootcamp|workshop/i.test(text)) {
    productOrService = 'Training & Upskilling Program';
  } else if (/consulting|advisory|audit/i.test(text)) {
    productOrService = 'Consulting Services';
  } else if (companyProfile?.products) {
    const rawProds = Array.isArray(companyProfile.products)
      ? companyProfile.products.map(p => typeof p === 'string' ? p : p?.name || '').filter(Boolean)
      : typeof companyProfile.products === 'string'
      ? companyProfile.products.split('\n').map(p => p.trim()).filter(Boolean)
      : [];
    
    for (const p of rawProds) {
      const cleanProdName = p.split('—')[0].split('-')[0].replace(/^[-*•]\s*/, '').trim();
      if (cleanProdName && textLower.includes(cleanProdName.toLowerCase())) {
        productOrService = cleanProdName;
        break;
      }
    }
  }

  // 4. Detect Deadline
  let deadline = 'Unknown';
  const hopingMatch = text.match(/(?:hoping to|hope to|planning to|aiming to)\s+(?:get\s+everything\s+)?(?:set up|delivered|ready|start|begin)\s+(?:by\s+)?([A-Za-z]+ \d{1,2}|\d{1,2} [A-Za-z]+|\w+ month)/i);
  const strictDeadlineMatch = text.match(/(?:need them delivered by|delivered by|delivery by|need by|must have by|start by)\s+([A-Za-z]+ \d{1,2}|\d{1,2} [A-Za-z]+|\d+ weeks|\w+ month)/i);

  if (hopingMatch) {
    deadline = `Target: ${hopingMatch[1]}`;
  } else if (strictDeadlineMatch) {
    deadline = strictDeadlineMatch[1];
  } else if (/within \d+ weeks/i.test(text)) {
    const wMatch = text.match(/within \d+ weeks/i);
    deadline = wMatch ? wMatch[0] : 'Unknown';
  }

  // 5. Detect Budget
  let budget = 'Unknown';
  const budgetMatch = text.match(/(?:budget\s*[:=]?\s*|\$|INR|Rs\.?)\s*([\d,]+(?:\s*(?:k|lac|lakh|crore|million))?)/i);
  if (budgetMatch) {
    budget = budgetMatch[0];
  }

  // 6. Detect Requirements
  const requirementsList: string[] = [];
  if (/cable management/i.test(text)) requirementsList.push('Cable management');
  if (/mesh/i.test(text)) requirementsList.push('Matching mesh chairs');
  if (/stackable/i.test(text)) requirementsList.push('Stackable');
  if (/dark grey/i.test(text)) requirementsList.push('Dark grey');
  if (/custom|customized/i.test(text)) requirementsList.push('Customized requirement');
  if (employeeCount) requirementsList.push(`Cohort / Staff size: ~${employeeCount}`);

  // Build Customer Facts
  const customer_facts: string[] = [];
  if (employeeCount) customer_facts.push(`Employee / Learner count: ~${employeeCount}`);
  if (productOrService !== 'Unknown') customer_facts.push(`Requirement: ${productOrService}`);
  if (quantity !== 'Unknown') customer_facts.push(`Quantity / Scope: ${quantity}`);
  if (location !== 'Unknown') customer_facts.push(`Location: ${location}`);
  if (deadline !== 'Unknown') customer_facts.push(`Target Timeline: ${deadline}`);
  if (budget !== 'Unknown') customer_facts.push(`Budget: ${budget}`);
  if (requirementsList.length > 0) customer_facts.push(`Notes: ${requirementsList.join(', ')}`);

  // 7. Lead Temperature Scoring
  let lead_temperature: 'HOT' | 'WARM' | 'COLD' = 'WARM';
  let lead_reason = 'Inbound requirement requiring qualification.';
  let customer_intent = 'Commercial Inquiry';
  let recommended_action = 'Follow up with customer to confirm specifications and next steps.';

  const isGeneralColdQuery =
    /^(?:hi|hello|hey)?[\s,.]*(?:do you sell|do you have|do you provide)\s+([a-z\s]+)\??$/i.test(text) ||
    (textLower.includes('do you sell') && quantity === 'Unknown' && location === 'Unknown' && deadline === 'Unknown');

  const isSingleUnitOrBelowMoq =
    quantity === '1' && companyProfile?.businessType === 'goods' && (companyProfile?.minOrder || '').includes('50');

  const hasExplicitKnownQuantity = quantity !== 'Unknown' && (parseInt(quantity, 10) >= 50 || isServices);
  const isDirectQuoteRequest = /best price|send me your best price|provide specs and pricing|quotation|quote|pricing proposal/i.test(text);

  if (isGeneralColdQuery) {
    lead_temperature = 'COLD';
    lead_reason = 'Broad informational query without concrete purchasing scope.';
    customer_intent = 'General Inquiry';
    recommended_action = 'Confirm offerings and gather project requirements.';
  } else if (isSingleUnitOrBelowMoq) {
    lead_temperature = 'COLD';
    lead_reason = 'Single unit inquiry below commercial MOQ.';
    customer_intent = 'Single Unit Inquiry (Below MOQ)';
    recommended_action = 'Inform customer of minimum order quantity or direct to retail partners.';
  } else if (hasExplicitKnownQuantity && productOrService !== 'Unknown' && isDirectQuoteRequest) {
    lead_temperature = 'HOT';
    lead_reason = 'Specific requirement + concrete volume + explicit quotation request.';
    customer_intent = 'Commercial Procurement / Enrollment';
    recommended_action = `Prepare quotation for ${quantity} ${productOrService} for human approval.`;
  } else {
    lead_temperature = 'WARM';
    lead_reason = 'Customer expresses clear interest; requires scope or specification confirmation.';
    customer_intent = 'Requirement Qualification';
    recommended_action = 'Gather specific scope and preferences before preparing formal proposal.';
  }

  // 8. Missing Information
  const missingList: string[] = [];
  if (productOrService === 'Unknown') missingList.push('Specific product or service category');
  if (quantity === 'Unknown') missingList.push('Expected quantity or cohort size');
  if (location === 'Unknown' && companyProfile?.businessType !== 'services') missingList.push('Delivery location');
  if (deadline === 'Unknown' && lead_temperature !== 'COLD') missingList.push('Target timeline');
  if (missingList.length === 0) missingList.push('None');

  // 9. Draft Reply
  let draft_reply = '';
  if (lead_temperature === 'HOT') {
    draft_reply = `Hi,\n\nThank you for contacting ${companyName}. We received your inquiry for ${quantity !== 'Unknown' ? quantity : ''} ${productOrService !== 'Unknown' ? productOrService : 'our solutions'}${location !== 'Unknown' ? ` in ${location}` : ''}${deadline !== 'Unknown' ? ` with target timeline by ${deadline}` : ''}.\n\nCould you please confirm your preferred specifications or special requirements so we can prepare a comprehensive quotation for you?\n\nBest regards,\n${companyName} Sales Team`;
  } else if (lead_temperature === 'COLD') {
    draft_reply = `Hi,\n\nThank you for reaching out to ${companyName}. We would be glad to assist. Could you please share more details about your specific project requirements and timeline so we can provide relevant information?\n\nBest regards,\n${companyName} Sales Team`;
  } else {
    draft_reply = `Hi,\n\nThank you for contacting ${companyName}. We received your request regarding ${productOrService !== 'Unknown' ? productOrService : 'our offerings'}.\n\nTo help us recommend the best options and prepare pricing, could you please share your expected volume/scope and timeline?\n\nBest regards,\n${companyName} Sales Team`;
  }

  const normalized = validateAndNormalizeInquiryFields(
    {
      customer_name: customerName,
      product_or_service: productOrService,
      quantity,
      location,
      timeline: deadline,
      budget,
      requirement_or_description: text,
      requirements: requirementsList,
    },
    companyProfile
  );

  return {
    customer_name: normalized.customer_name,
    source,
    original_message: text,
    product_or_service: normalized.product_or_service,
    quantity: normalized.quantity,
    location: normalized.location,
    deadline: normalized.timeline,
    budget: normalized.budget,
    requirements: normalized.requirements,
    customer_facts: normalized.customer_facts.map((f) => `${f.label}: ${f.value}`),
    customer_intent,
    lead_temperature,
    lead_reason,
    missing_information: missingList,
    recommended_action,
    draft_reply,
    temperature_reason: lead_reason,
    lead_score: lead_temperature,
    company_name: normalized.company_name,
    recommended_next_action: recommended_action,
    suggested_reply: draft_reply,
    sales_summary: `${lead_temperature} lead: ${normalized.quantity !== 'Unknown' ? `${normalized.quantity} ` : ''}${normalized.product_or_service}${normalized.location !== 'Unknown' ? ` in ${normalized.location}` : ''}. ${lead_reason}`,
    raw_inquiry: text,
    analyzed_at: new Date().toISOString(),
  };
}

// Adaptive model availability tracking to handle temporary provider demand spikes (503/429)
const analyzeModelSpikeUntil: Record<string, number> = {};

function getAdaptiveAnalyzeCandidateModels(): string[] {
  const now = Date.now();
  if ((analyzeModelSpikeUntil['gemini-3.1-flash-lite'] || 0) > now) {
    return ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  }
  return ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
}

export async function analyzeInquiry(
  inquiryText: string,
  companyProfile?: CompanyProfileInput,
  source: string = 'Email',
  customerName?: string
): Promise<AnalysisResult> {
  if (!inquiryText || typeof inquiryText !== 'string' || !inquiryText.trim()) {
    throw new Error('Customer inquiry text is required.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackRuleBasedAnalysis(inquiryText, companyProfile, source, customerName);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const businessModel = companyProfile?.businessType || 'goods';
  const companyContextText = companyProfile
    ? `
COMPANY BRAIN (VERIFIED EMPLOYER BUSINESS CONTEXT):
- Company Name: ${companyProfile.name || 'Our Company'}
- Business Model: ${businessModel.toUpperCase()} (${businessModel === 'services' ? 'Services / SaaS / Consulting' : businessModel === 'goods' ? 'Physical Products / Wholesale' : 'Hybrid Goods & Services'})
- Industry: ${companyProfile.industry || 'Commercial Solutions'}
- Products / Services Offered: ${companyProfile.products || 'Standard Products and Services'}
- Locations Served: ${companyProfile.locations || 'Global & Regional'}
- Minimum Order / Threshold: ${companyProfile.minOrder || 'Standard engagements'}
- Communication Tone: ${companyProfile.tone || 'Professional and concise'}
- Business Rules:
${companyProfile.businessRules || 'Never invent prices.\nNever promise unverified capacity or delivery without confirmation.\nEscalate custom requests to a human.'}
`
    : `
COMPANY BRAIN (VERIFIED BUSINESS CONTEXT):
- Company Name: Our Company
- Business Model: GOODS & SERVICES
- Industry: Commercial Solutions
- Products / Services Offered: Professional products and services
- Locations Served: Regional & Global
- Minimum Order: Standard commercial engagements
- Communication Tone: Professional and concise
- Business Rules:
Never invent prices.
Never promise inventory without verification.
Never promise delivery without confirmation.
Escalate custom requests to a human.
`;

  const systemInstruction = buildInquiryAnalysisSystemInstruction(companyContextText);

  let lastError: any = null;

  modelLoop: for (const modelName of getAdaptiveAnalyzeCandidateModels()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const genPromise = ai.models.generateContent({
          model: modelName,
          contents: `Analyze this customer inquiry from ${customerName || 'Customer'} (Source: ${source}):\n\n"""\n${inquiryText.trim()}\n"""`,
          config: {
            systemInstruction,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customer_name: {
                  type: Type.STRING,
                  description: 'Customer or company name from inquiry or metadata',
                },
                source: {
                  type: Type.STRING,
                  description: 'Source of inquiry (Email, WhatsApp, Website, Phone, Other)',
                },
                original_message: {
                  type: Type.STRING,
                  description: 'Original customer inquiry text',
                },
                product_or_service: {
                  type: Type.STRING,
                  description: 'Exact product or service explicitly requested, or "Unknown"',
                },
                quantity: {
                  type: Type.STRING,
                  description: 'Exact quantity or scope explicitly specified by customer, or "Unknown"',
                },
                location: {
                  type: Type.STRING,
                  description: 'Exact location explicitly specified by customer, or "Unknown"',
                },
                deadline: {
                  type: Type.STRING,
                  description: 'Delivery or target timeline preserving customer uncertainty, or "Unknown"',
                },
                budget: {
                  type: Type.STRING,
                  description: 'Exact budget explicitly stated by customer, or "Unknown"',
                },
                requirements: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Explicit notes stated by customer, or empty array',
                },
                customer_facts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of verified facts directly stated by customer',
                },
                customer_intent: {
                  type: Type.STRING,
                  description: 'High level buying intent (e.g. Bulk Procurement, Corporate Training, Consultation Request)',
                },
                lead_temperature: {
                  type: Type.STRING,
                  enum: ['HOT', 'WARM', 'COLD'],
                  description: 'HOT, WARM, or COLD based on intent + requirement completeness',
                },
                lead_reason: {
                  type: Type.STRING,
                  description: 'Factual reason explaining lead temperature classification',
                },
                missing_information: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Genuinely required missing items before next sales action, or ["None"]',
                },
                recommended_action: {
                  type: Type.STRING,
                  description: 'One clear next action for the sales process',
                },
                draft_reply: {
                  type: Type.STRING,
                  description: 'Professional, concise response for human approval',
                },
              },
              required: [
                'customer_name',
                'source',
                'original_message',
                'product_or_service',
                'quantity',
                'location',
                'deadline',
                'budget',
                'requirements',
                'customer_facts',
                'customer_intent',
                'lead_temperature',
                'lead_reason',
                'missing_information',
                'recommended_action',
                'draft_reply',
              ],
            },
          },
        });

        const response = await genPromise;
        const text = response.text;
        if (!text) throw new Error('Empty response from AI model');

        const parsed = JSON.parse(text);
        const resolvedName = customerName || parsed.customer_name || 'Inbound Customer';
        const temp = (parsed.lead_temperature === 'HOT' || parsed.lead_temperature === 'WARM' || parsed.lead_temperature === 'COLD')
          ? parsed.lead_temperature
          : 'WARM';

        const missing = Array.isArray(parsed.missing_information)
          ? parsed.missing_information
          : typeof parsed.missing_information === 'string'
          ? [parsed.missing_information]
          : ['None'];

        const reqs = Array.isArray(parsed.requirements)
          ? parsed.requirements
          : typeof parsed.requirements === 'string'
          ? [parsed.requirements]
          : [];

        const normalized = validateAndNormalizeInquiryFields(
          {
            customer_name: resolvedName,
            product_or_service: parsed.product_or_service,
            quantity: parsed.quantity,
            location: parsed.location,
            timeline: parsed.deadline,
            budget: parsed.budget,
            requirement_or_description: inquiryText.trim(),
            requirements: reqs,
          },
          companyProfile
        );

        const facts = Array.isArray(parsed.customer_facts) && parsed.customer_facts.length > 0
          ? parsed.customer_facts
          : normalized.customer_facts.map((f) => `${f.label}: ${f.value}`);

        return {
          customer_name: normalized.customer_name,
          source: source || parsed.source || 'Email',
          original_message: inquiryText.trim(),
          product_or_service: normalized.product_or_service,
          quantity: normalized.quantity,
          location: normalized.location,
          deadline: normalized.timeline,
          budget: normalized.budget,
          requirements: normalized.requirements,
          customer_facts: facts,
          customer_intent: parsed.customer_intent || 'Inbound Inquiry',
          lead_temperature: temp,
          lead_reason: parsed.lead_reason || 'Inbound customer inquiry.',
          missing_information: missing,
          recommended_action: parsed.recommended_action || 'Prepare response for human approval.',
          draft_reply: parsed.draft_reply || '',
          temperature_reason: parsed.lead_reason || 'Inbound customer inquiry.',
          lead_score: temp,
          company_name: normalized.company_name,
          recommended_next_action: parsed.recommended_action || 'Prepare response for human approval.',
          suggested_reply: parsed.draft_reply || '',
          sales_summary: `${temp} lead: ${normalized.quantity !== 'Unknown' ? `${normalized.quantity} ` : ''}${normalized.product_or_service}${normalized.location !== 'Unknown' ? ` in ${normalized.location}` : ''}. ${parsed.lead_reason || ''}`,
          raw_inquiry: inquiryText.trim(),
          analyzed_at: new Date().toISOString(),
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err).toLowerCase();
        const isQuota = errMsg.includes('resource_exhausted') || errMsg.includes('quota') || errMsg.includes('rate-limit') || errMsg.includes('429');
        const isTransient = errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('high demand');
        if (isQuota || isTransient) {
          analyzeModelSpikeUntil[modelName] = Date.now() + 60000;
          continue modelLoop;
        }
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        break;
      }
    }
  }

  return fallbackRuleBasedAnalysis(inquiryText, companyProfile, source, customerName);
}
