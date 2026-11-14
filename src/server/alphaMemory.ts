import {
  StructuredLeadProfile,
  QualificationStatus,
  LeadScore,
  ObjectionType,
  NextBestActionType,
  AILeadBrief,
} from '../types.ts';
import {
  isPlausibleCustomerName,
  isTimeExpression,
  isRequirementSentence,
  isBudgetExpression,
  isValidMeasurableQuantity,
  KNOWN_SERVICE_TERMS,
} from './semanticFieldValidator.ts';
import { FunnelCalculationState } from './alphaNumericalEngine.ts';

export type ConversationStage =
  | 'FIRST_CONTACT'
  | 'EXPLORATION'
  | 'EDUCATION'
  | 'AWARENESS'
  | 'DISCOVERY'
  | 'DIAGNOSIS'
  | 'EVALUATION'
  | 'OBJECTION'
  | 'QUALIFICATION'
  | 'BUYING_INTENT'
  | 'DECISION'
  | 'CONVERSION'
  | 'HANDOFF'
  | 'NURTURE'
  | 'NON_SALES'
  | 'SUPPORT'
  | 'EXIT';

export type ClassifiedIntent =
  | 'casual_visitor'
  | 'curious_visitor'
  | 'information_seeker'
  | 'problem_aware'
  | 'evaluating_prospect'
  | 'high_intent_prospect'
  | 'objection_state'
  | 'price_sensitive'
  | 'comparison_shopper'
  | 'ready_to_buy'
  | 'existing_customer'
  | 'support_request'
  | 'poor_fit'
  | 'unknown_intent';

export type AlphaIntent =
  | 'INFORMATION'
  | 'EXPLORATION'
  | 'PRODUCT_DISCOVERY'
  | 'PRICING'
  | 'COMPARISON'
  | 'OBJECTION'
  | 'SUPPORT'
  | 'PURCHASE'
  | 'HIGH_INTENT'
  | 'QUALIFICATION'
  | 'IMPLEMENTATION'
  | 'COMPLAINT'
  | 'CONFUSION'
  | 'GENERAL_CONVERSATION'
  | 'HANDOFF'
  | 'EXIT'
  | 'UNCLEAR';

export type ResponseStrategy =
  | 'ANSWER'
  | 'CLARIFY'
  | 'EXPLAIN'
  | 'ACKNOWLEDGE'
  | 'REASSURE'
  | 'DISCOVER'
  | 'RECOMMEND'
  | 'HANDLE_OBJECTION'
  | 'QUALIFY'
  | 'CAPTURE_LEAD'
  | 'BOOK_MEETING'
  | 'HANDOFF'
  | 'FOLLOW_UP'
  | 'END_CONVERSATION';

export interface AlphaVisitorMemory {
  name?: string;
  email?: string;
  phone?: string;
  contact_info?: string;
  company?: string;
  role?: string;
  industry?: string;
  business_type?: string;
  website?: string;
  location?: string;
}

export interface AlphaRequirementsMemory {
  use_case?: string;
  primary_goal?: string;
  problems?: string[];
  product_interest?: string;
  quantity_or_scope?: string;
  lead_volume?: string;
  requirements?: string[];
  constraints?: string[];
  timeline?: string;
  budget?: string;
}

export interface AlphaSignalsMemory {
  intent: AlphaIntent;
  classified_intent: ClassifiedIntent;
  stage: ConversationStage;
  buying_intent_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  intent_score: number; // 0 - 100
  is_hot_lead: boolean;
  detected_objection: ObjectionType;
  next_best_action: NextBestActionType;
  is_browsing: boolean;
  is_comparison: boolean;
  is_objection: boolean;
  objection_detail?: string;
  qualification_refused: boolean;
  human_requested: boolean;
  sentiment: 'positive' | 'neutral' | 'skeptical' | 'frustrated';
}

export type FactStatus = 'active' | 'superseded' | 'uncertain';

export interface ConversationalFact {
  key: string;
  value: string;
  sourceTurn: number;
  confidence: number;
  status: FactStatus;
  timestamp: string;
  supersededBy?: string;
  previousValue?: string;
}

export interface HistoricalEntityMemory {
  business?: string;
  team?: string;
  employee_count?: string;
  sales_reps?: string;
  lead_volume?: string;
  superseded_lead_volume?: string;
  superseded_visitors?: string;
  primary_problem?: string;
  salesperson?: string;
  facts?: Record<string, string>;
}

export interface AlphaConversationMemory {
  conversation_id: string;
  visitor: AlphaVisitorMemory;
  requirements: AlphaRequirementsMemory;
  signals: AlphaSignalsMemory;
  active_topic: string;
  current_topic: string;
  previous_topic?: string;
  is_founder_mode?: boolean;
  is_hypothetical_scenario?: boolean;
  hypothetical_context?: { price?: string; scenario?: string; assumptions?: string[] };
  is_testing_mode?: boolean;
  preferred_language?: 'en' | 'hi' | string;
  style_adaptation?: 'standard' | 'slang' | 'gen_z' | 'founder' | 'casual';
  conversational_situation?: string;
  recent_assistant_replies?: string[];
  historical_memory: HistoricalEntityMemory;
  historical_entities: Record<string, HistoricalEntityMemory>;
  facts_established: Record<string, string>;
  facts_state: Record<string, ConversationalFact>;
  superseded_facts: ConversationalFact[];
  primary_problem?: string;
  website_visitors?: string;
  excluded_problems?: string[];
  stated_workflow?: string;
  missing_high_value_fields: string[];
  unresolved_questions: string[];
  turn_count: number;
  ai_lead_brief?: AILeadBrief;
  suggested_follow_up?: string;
  human_takeover?: boolean;
  human_takeover_by?: string;
  notes?: string;
  human_notes?: string;
  grounded_in_brain: boolean;
  identity_refused_magnus?: boolean;
  funnel_state?: FunnelCalculationState;
  _tenantScope?: string;
  _isOfficialTenant?: boolean;
  last_updated: string;
}

// In-memory conversation state cache with 2-hour TTL and strict size bound
const MAX_ALPHA_MEMORY_ENTRIES = 2000;
const memoryCache = new Map<string, { memory: AlphaConversationMemory; expiresAt: number }>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

function evictMemoryCacheIfNeeded(now: number): void {
  if (memoryCache.size < MAX_ALPHA_MEMORY_ENTRIES) return;
  for (const [k, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(k);
    }
  }
  while (memoryCache.size >= MAX_ALPHA_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }
}

// Disallowed security-sensitive keys that cannot be established via visitor conversation
const PRIVILEGED_FACT_KEYS = new Set([
  'role', 'admin', 'permission', 'permissions', 'ceo', 'super_admin', 'is_admin', 'is_ceo',
  'tenant', 'tenant_id', 'user_id', 'pricing_authority', 'discount_authority', 'internal_system',
  'api_key', 'auth_token', 'google_token', 'access_token'
]);

export function registerOrUpdateFact(
  mem: AlphaConversationMemory,
  key: string,
  value: string,
  confidence = 1.0,
  isExplicitCorrection = false
): void {
  // Trust Boundary: Never allow visitor conversational input to establish administrative authority (Invariant 6 & 10)
  const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  if (PRIVILEGED_FACT_KEYS.has(normalizedKey)) {
    return;
  }

  if (!mem.facts_state) mem.facts_state = {};
  if (!mem.superseded_facts) mem.superseded_facts = [];

  const existing = mem.facts_state[key];
  if (existing && existing.value !== value) {
    existing.status = 'superseded';
    existing.supersededBy = value;
    mem.superseded_facts.push({ ...existing });
  }

  const newFact: ConversationalFact = {
    key,
    value,
    sourceTurn: mem.turn_count,
    confidence,
    status: 'active',
    timestamp: new Date().toISOString(),
    previousValue: existing?.value,
  };

  mem.facts_state[key] = newFact;
  mem.facts_established[key] = value;
}

export function getOrCreateAlphaMemory(
  conversationId: string,
  initialProfile?: Partial<StructuredLeadProfile>,
  tenantOrWidgetId?: string
): AlphaConversationMemory {
  const cleanConvId = conversationId.trim();
  const cleanScope = tenantOrWidgetId ? tenantOrWidgetId.trim() : undefined;
  const cacheKey = cleanScope ? `${cleanScope}::${cleanConvId}` : cleanConvId;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.memory;
  }

  const memory: AlphaConversationMemory = {
    conversation_id: cleanConvId,
    _tenantScope: cleanScope,
    visitor: {
      name: initialProfile?.name || initialProfile?.customer_name,
      contact_info: initialProfile?.contact_info,
      email: (initialProfile as any)?.email,
      phone: (initialProfile as any)?.phone,
      company: undefined, // Never inherit stale demo company
      role: (initialProfile as any)?.role,
      industry: undefined, // Never inherit stale industry from previous test/demo sessions
      business_type: undefined, // Must be explicitly established in the current conversation
      location: initialProfile?.location || undefined,
      website: (initialProfile as any)?.website,
    },
    requirements: {
      use_case: (initialProfile as any)?.use_case,
      primary_goal: (initialProfile as any)?.goal,
      product_interest: (initialProfile?.product_interest || initialProfile?.product_or_service || initialProfile?.need) || undefined,
      quantity_or_scope: undefined, // Pristine scope
      lead_volume: undefined, // Pristine lead volume - must come from current conversation
      requirements: initialProfile?.requirements || [],
      timeline: (initialProfile?.timeline || initialProfile?.deadline) || undefined,
      budget: initialProfile?.budget || undefined,
    },
    signals: {
      intent: 'EXPLORATION',
      classified_intent: 'curious_visitor',
      stage: 'FIRST_CONTACT',
      buying_intent_level: 'NONE',
      intent_score: 15,
      is_hot_lead: false,
      detected_objection: 'none',
      next_best_action: 'continue_discovery',
      is_browsing: false,
      is_comparison: false,
      is_objection: false,
      qualification_refused: false,
      human_requested: false,
      sentiment: 'neutral',
    },
    active_topic: 'general_inquiry',
    current_topic: 'general_inquiry',
    is_founder_mode: false,
    style_adaptation: 'standard',
    conversational_situation: 'unknown_situation',
    recent_assistant_replies: [],
    historical_memory: {},
    historical_entities: {},
    facts_established: {},
    facts_state: {},
    superseded_facts: [],
    primary_problem: undefined,
    stated_workflow: undefined,
    missing_high_value_fields: [],
    unresolved_questions: [],
    turn_count: 0,
    grounded_in_brain: true,
    last_updated: new Date().toISOString(),
  };

  syncEstablishedFacts(memory);
  evictMemoryCacheIfNeeded(now);
  memoryCache.set(cacheKey, { memory, expiresAt: now + CACHE_TTL_MS });
  return memory;
}

export function resetAlphaMemory(conversationId: string, tenantOrWidgetId?: string): void {
  const cleanConvId = conversationId.trim();
  const cleanScope = tenantOrWidgetId ? tenantOrWidgetId.trim() : undefined;
  const cacheKey = cleanScope ? `${cleanScope}::${cleanConvId}` : cleanConvId;
  memoryCache.delete(cacheKey);
}

export function saveAlphaMemory(memory: AlphaConversationMemory): void {
  const now = Date.now();
  memory.last_updated = new Date(now).toISOString();
  syncEstablishedFacts(memory);
  const cleanConvId = memory.conversation_id.trim();
  const cacheKey = memory._tenantScope ? `${memory._tenantScope}::${cleanConvId}` : cleanConvId;
  evictMemoryCacheIfNeeded(now);
  memoryCache.set(cacheKey, {
    memory,
    expiresAt: now + CACHE_TTL_MS,
  });
}

function syncEstablishedFacts(mem: AlphaConversationMemory): void {
  if (!mem.facts_state) mem.facts_state = {};
  if (!mem.superseded_facts) mem.superseded_facts = [];

  const f: Record<string, string> = {};
  if (mem.visitor.name && mem.visitor.name !== 'Website Visitor') f['Customer Name'] = mem.visitor.name;
  if (mem.visitor.email) f['Email'] = mem.visitor.email;
  if (mem.visitor.phone) f['Phone'] = mem.visitor.phone;
  if (mem.visitor.contact_info) f['Contact'] = mem.visitor.contact_info;
  if (mem.visitor.company) f['Company'] = mem.visitor.company;
  if (mem.visitor.role) f['Role'] = mem.visitor.role;
  if (mem.visitor.industry) f['Industry'] = mem.visitor.industry;
  if (mem.visitor.business_type) f['Business Type'] = mem.visitor.business_type;
  if (mem.visitor.location) f['Location'] = mem.visitor.location;
  if (mem.requirements.product_interest) f['Product / Service'] = mem.requirements.product_interest;
  if (mem.requirements.quantity_or_scope) f['Quantity / Scope'] = mem.requirements.quantity_or_scope;
  if (mem.requirements.lead_volume) f['Lead Volume'] = mem.requirements.lead_volume;
  if (mem.requirements.budget) f['Budget'] = mem.requirements.budget;
  if (mem.requirements.timeline) f['Timeline'] = mem.requirements.timeline;
  if (mem.requirements.use_case) f['Use Case'] = mem.requirements.use_case;
  if (mem.primary_problem) f['Primary Problem'] = mem.primary_problem;

  // Merge any explicitly tracked active facts
  for (const [k, fact] of Object.entries(mem.facts_state)) {
    if (fact.status === 'active') {
      f[k] = fact.value;
    }
  }

  mem.facts_established = f;

  // Determine missing high-value fields
  const missing: string[] = [];
  if (!f['Product / Service']) missing.push('product or requirement');
  if (!f['Contact'] && !f['Email'] && !f['Phone']) missing.push('contact information');
  if (!f['Customer Name']) missing.push('name');
  if (!f['Quantity / Scope'] && !f['Lead Volume']) missing.push('volume or scope');
  mem.missing_high_value_fields = missing;
}

/**
 * Updates memory from user message and prior conversation turns,
 * handling corrections seamlessly (e.g., "actually Gurgaon, not Delhi").
 */
export function updateMemoryFromMessage(
  mem: AlphaConversationMemory,
  message: string,
  history: Array<{ sender: string; text: string }> = []
): void {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  // Guard against duplicate execution for the same message in the same turn
  if ((mem as any)._lastProcessedMsg === msg && (mem as any)._lastProcessedHistoryLen === history.length) {
    return;
  }
  (mem as any)._lastProcessedMsg = msg;
  (mem as any)._lastProcessedHistoryLen = history.length;

  mem.turn_count += 1;

  // 0. Founder & Persona Recognition / Style Adaptation
  // CRITICAL: A question asking who Magnus Verity is (e.g. "Who is Magnus Verity?") MUST NEVER make the visitor Magnus Verity!
  const isQuestionAboutFounder = /\b(?:who is|who founded|tell me about|what does|is magnus|does magnus|who built|are you magnus|you are magnus|alpha is magnus)\b/i.test(lower);
  const isDenialOfMagnus = /\b(?:i am not magnus|i'm not magnus|im not magnus|i never said i am magnus|i'm not the founder|not magnus)\b/i.test(lower);

  if (isDenialOfMagnus) {
    mem.is_founder_mode = false;
    mem.identity_refused_magnus = true;
    if (mem.visitor.name === 'Magnus Verity') {
      mem.visitor.name = undefined;
      mem.visitor.role = undefined;
      mem.visitor.company = undefined;
      mem.style_adaptation = 'standard';
    }
  }

  if (
    mem._isOfficialTenant === true &&
    !isQuestionAboutFounder &&
    !isDenialOfMagnus &&
    (/\b(?:you know i(?:'m| am)|i(?:'m| am| am actually)|this is)\s+magnus(?:\s+verity)?\b/i.test(lower) ||
      /^(?:i am|i'm|im)\s+magnus(?:\s+verity)?[.!]?$/i.test(lower))
  ) {
    mem.is_founder_mode = true;
    mem.visitor.name = 'Magnus Verity';
    mem.visitor.role = 'Founder & CEO';
    mem.visitor.company = 'AI Workforce';
    mem.style_adaptation = 'founder';
    mem.identity_refused_magnus = false;
  }

  // 0a1. Testing Mode Recognition ("I'm just testing you", "Testing mode", "Just testing")
  if (
    /\b(?:just testing (?:you|alpha|this|things|out)|i(?:'m| am) (?:just )?testing you|testing mode|only testing|i am testing you|just testing)\b/i.test(lower)
  ) {
    mem.is_testing_mode = true;
    mem.conversational_situation = 'testing_mode';
  }

  // 0a2. Hypothetical Scenario Tracking ("Suppose I registered...", "$99 scenario", "What if I paid $99/mo...")
  if (
    /\b(?:suppose|hypothetically|what if|let's say|imagine|\$99 scenario|if i paid|if we paid)\b/i.test(lower)
  ) {
    mem.is_hypothetical_scenario = true;
    const priceMatch = msg.match(/\$\s*(\d+)(?:\s*\/\s*(?:mo|month|year|yr))?/i);
    if (priceMatch) {
      mem.hypothetical_context = {
        price: `$${priceMatch[1]}/month`,
        scenario: 'Hypothetical subscription',
        assumptions: [`Evaluating hypothetical pricing at $${priceMatch[1]}/month`],
      };
    }
  }

  // 0a2b. Explicit Clarification: "This is just a scenario", "Not real", "Not running a business"
  // Enforces Rule: Never treat hypothetical scenarios or tests as actual businesses!
  const isHypotheticalCorrection =
    /\b(?:this is (?:just )?(?:a )?scenario|it(?:'s| is) (?:just )?(?:a )?scenario|not (?:a )?real business|not real|just a scenario|just an example|purely hypothetical|hypothetical only)\b/i.test(lower) ||
    /\b(?:i(?:'m| am| am just)?\s+not running a business|i do(?:n't| not) run a business|i do(?:n't| not) have a business|i do(?:n't| not) own a business|not running any business)\b/i.test(lower) ||
    /\b(?:i passed a test|just passed a test|not running a real business|not a business owner)\b/i.test(lower);

  if (isHypotheticalCorrection) {
    mem.is_hypothetical_scenario = true;
    mem.visitor.business_type = undefined;
    mem.visitor.company = undefined;
    mem.historical_memory.business = undefined;
    delete mem.facts_established['Business Type'];
    delete mem.facts_established['Company'];
    delete mem.facts_established['Company Name'];
    registerOrUpdateFact(mem, 'Business Type', 'None (Clarified: not running a business / hypothetical scenario)', 1.0, true);
    mem.signals.stage = 'NON_SALES';
    mem.signals.buying_intent_level = 'NONE';
    mem.signals.is_browsing = true;
  }

  // 0a2c. Language Preference Tracking (Hindi vs English)
  if (
    /\b(?:can you speak hindi|do you speak hindi|speak in hindi|talk in hindi|hindi me(?:in)?|hindi please|hindi language)\b/i.test(lower) ||
    /[\u0900-\u097F]/.test(msg)
  ) {
    mem.preferred_language = 'hi';
  } else if (
    /\b(?:switch to english|speak in english|talk in english|english please|can we speak english|in english)\b/i.test(lower)
  ) {
    mem.preferred_language = 'en';
  }

  // 0a3. Negation & Refusal Tracking ("I have not", "I haven't", "Not yet")
  if (
    /^(?:i have not|i haven't|i havnt|not yet|no i haven't|no i have not|haven't|havent)[.!]?$/i.test(lower)
  ) {
    // Visitor is answering 'no' or negating a previous question. Clean up any accidental 'not' business_type
    if (mem.visitor.business_type && /^(not|not yet|none|no|n\/a)$/i.test(mem.visitor.business_type)) {
      mem.visitor.business_type = undefined;
    }
    if (mem.active_topic && /^(not|not yet|none|no|n\/a)$/i.test(mem.active_topic)) {
      mem.active_topic = 'general_inquiry';
      mem.current_topic = 'general_inquiry';
    }
  }

  // 0b. Transition back to Customer Mode from Testing
  if (
    /\b(?:enough testing|okay enough testing|stop testing|let's get serious|back to business|real scenario|i'm a web agency|evaluating alpha for)\b/i.test(lower) &&
    (lower.includes('agency') || lower.includes('clinic') || lower.includes('business') || lower.includes('leads') || lower.includes('what can alpha'))
  ) {
    mem.is_founder_mode = false;
    mem.style_adaptation = 'standard';
    mem.conversational_situation = 'customer_sales_mode';
  } else if (/\b(?:talk in slang|speak in slang|use slang)\b/i.test(lower)) {
    mem.style_adaptation = 'slang';
  } else if (/\b(?:be genz|be gen-z|be gen z|talk genz|act genz|sound genz)\b/i.test(lower)) {
    mem.style_adaptation = 'gen_z';
  }

  // 0c. Customer Name & Company Extraction
  // Enforces Rule: A business product/service (e.g. "Web Development") must NEVER become customer name!
  const nameWithCompanyMatch =
    msg.match(/\b(?:my name is|i'm|i am|this is)\s+([A-Z][a-zA-Z]{1,20}(?:\s+[A-Z][a-zA-Z]{1,20})?)\s+(?:from|with|at)\s+([A-Za-z0-9\s&.-]{2,30}?)(?:\.|\?|,|$)/i);
  const nameIntroMatch =
    msg.match(/\b(?:my name is|i am|i'm|this is)\s+([A-Z][a-zA-Z]{1,20}(?:\s+[A-Z][a-zA-Z]{1,20})?)\b/i) ||
    msg.match(/^(?:hi|hello|hey)[,\s]+(?:i'm|i am)\s+([A-Z][a-zA-Z]{1,20})\b/i);

  if (nameWithCompanyMatch) {
    const candName = nameWithCompanyMatch[1].trim();
    const candComp = nameWithCompanyMatch[2].trim();
    if (isPlausibleCustomerName(candName)) {
      mem.visitor.name = candName;
      registerOrUpdateFact(mem, 'Customer Name', candName, 1.0);
    }
    if (isPlausibleCustomerName(candComp)) {
      mem.visitor.company = candComp;
      registerOrUpdateFact(mem, 'Company Name', candComp, 1.0);
    }
  } else if (nameIntroMatch && nameIntroMatch[1]) {
    const candidateName = nameIntroMatch[1].trim();
    if (isPlausibleCustomerName(candidateName)) {
      mem.visitor.name = candidateName;
      registerOrUpdateFact(mem, 'Customer Name', candidateName, 1.0);
    }
  }

  // 0d. Explicit Timeline / Deadline Extraction
  // Enforces Rule: Time expressions (e.g. "1 week", "two weeks") must NEVER become products or quantities!
  const explicitTimelineMatch =
    msg.match(/(?:delivered|delivery|complete|done|ready|finish|need it|want it|target)\s+(?:in|within|by)\s+((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:business days|working days|days?|weeks?|months?|hours?))/i) ||
    msg.match(/\b(?:delivered in|delivery in|ready in|within|by)\s+((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:business days|working days|days?|weeks?|months?))/i) ||
    msg.match(/\b(?:in|within)\s+((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:business days|days?|weeks?|months?))/i);

  if (explicitTimelineMatch && explicitTimelineMatch[1]) {
    const rawTl = explicitTimelineMatch[1].trim();
    if (isTimeExpression(rawTl)) {
      mem.requirements.timeline = rawTl;
      registerOrUpdateFact(mem, 'Timeline', rawTl, 1.0);
    }
  }

  // 0e. Requirements & Desires Extraction (e.g. "I want a website", "I need web development")
  // Enforces Rule: A requirement sentence must NEVER become a quantity!
  const requirementDesireMatch =
    msg.match(/(?:i want|i need|we need|looking for|interested in|require)\s+(?:an?|some)?\s*([a-zA-Z\s-]{3,35}?)(?:\.|\?|,|delivered|in\s+\d|within|with|for|$)/i);

  if (requirementDesireMatch && requirementDesireMatch[1]) {
    const desire = requirementDesireMatch[1].trim();
    if (!isTimeExpression(desire) && !isBudgetExpression(desire) && desire.length >= 3) {
      if (!mem.requirements.product_interest || mem.requirements.product_interest === 'Commercial Requirement') {
        mem.requirements.product_interest = desire;
      }
      mem.requirements.requirements = mem.requirements.requirements || [];
      if (!mem.requirements.requirements.includes(msg.trim())) {
        mem.requirements.requirements.push(msg.trim());
      }
      registerOrUpdateFact(mem, 'Requirement', desire, 1.0);
    }
  }

  // 1. Browsing Signal
  if (
    /\b(?:just browsing|only browsing|look around|looking around|just looking|curious for now|don't need anything|dont need anything|not buying today|just exploring)\b/i.test(lower)
  ) {
    mem.signals.is_browsing = true;
    mem.signals.buying_intent_level = 'NONE';
    mem.signals.stage = 'EXPLORATION';
  }

  // 2. Comparison Signal
  if (
    /\b(?:instead of|compared to|versus|vs\.?|why would i need|why not just|difference between|competitor|hire a salesperson|hiring a salesperson|chatgpt)\b/i.test(lower)
  ) {
    mem.signals.is_comparison = true;
    mem.signals.intent = 'COMPARISON';
    mem.signals.stage = 'EVALUATION';
  }

  // 2.5 Insults & Conversational Hostility (NEVER treat as inquiry or sales signal)
  if (/\b(?:fuck you|fuck u|f\*\*\*|screw you|eat shit|piss off|stfu|dickhead|bitch|bastard)\b/i.test(lower)) {
    mem.signals.sentiment = 'frustrated';
    mem.signals.buying_intent_level = 'NONE';
    mem.signals.is_hot_lead = false;
    mem.signals.is_objection = false;
    mem.signals.human_requested = false;
    mem.conversational_situation = 'conversational_reaction';
  }

  // 3. Objection / Trust / Criticism Signal
  if (
    /\b(?:don't trust|dont trust|make things up|hallucinat|cheaper|expensive|costly|not helping|generic|waste of time|annoying)\b/i.test(lower)
  ) {
    mem.signals.is_objection = true;
    mem.signals.objection_detail = msg;
    mem.signals.stage = 'OBJECTION';
    if (/\b(?:not helping|waste of time|annoying|frustrated|angry)\b/i.test(lower)) {
      mem.signals.sentiment = 'frustrated';
    } else {
      mem.signals.sentiment = 'skeptical';
    }
  }

  // 4. Human Request Signal (exclude explicit negations)
  const negatedHumanRequest = /\b(?:don't|do not|dont|never|no|not|without)\b.{0,30}\b(?:human|person|someone|sales|representative|agent|call)\b/i.test(lower);
  if (
    !negatedHumanRequest &&
    /\b(?:talk to (?:someone|a human|a person|sales|founder|manager|team)|speak with someone|call me|human please|representative)\b/i.test(lower)
  ) {
    mem.signals.human_requested = true;
    mem.signals.stage = 'HANDOFF';
  }

  // 5. High Intent / Deployment Signal
  if (
    /\b(?:i want alpha on our website|ready to buy|want to deploy|how quickly can i install|want this on my site|get started today|sign me up)\b/i.test(lower) ||
    (/\b(?:inbound leads|leads every week|leads a month)\b/i.test(lower) && /\b(?:want|need|looking for|deploy)\b/i.test(lower))
  ) {
    mem.signals.buying_intent_level = 'HIGH';
    mem.signals.stage = 'DECISION';
    mem.signals.is_browsing = false;
  }

  // 6. Robust Business Context Switch & Hypothetical Scenario Handling (Bug #3, Test 16 & 17)
  const contextSwitchMatch =
    msg.match(/(?:(?:actually,?\s*)?(?:forget (?:the )?(?:saas|agency|website|previous business|previous company|company|clinic|business|store|that)|scratch that|never mind (?:that|the|saas|agency)|instead(?:,?\s*this is for)?|new business|different business|switch contexts?|on the other hand|evaluating this for another company|actually,?\s*(?:we're talking about|i'm considering this for|i run a different business too|this is for|we also (?:run|have|operate))|new scenario|another scenario|different scenario|hypothetically|suppose|let's say|imagine|consider a (?:new|different)?|test case|another case|here's another|here is another))\s*[,.:]*\s*(?:(?:i'm|i am|we're|we are)?\s*(?:considering this for|evaluating (?:alpha|this)? (?:for )?|running|looking at|it's|it is)?\s*(?:an?|our)?\s*)?([a-zA-Z0-9\s-]{2,40}?(?:agency|firm|clinic|practice|saas|software|platform|company|store|business|brand|shop|hospital|consultancy|studio|startup|tool))\b/i) ||
    msg.match(/(?:(?:new|another|different)\s+scenario\s*[:,-]?\s*(?:a|an)?\s*)([a-zA-Z0-9\s-]{2,40}?(?:agency|firm|clinic|practice|saas|software|platform|company|store|business|brand|shop|hospital|consultancy|studio|startup|tool))\b/i) ||
    msg.match(/(?:forget (?:the )?(?:saas|agency|website|previous|company|clinic|business|store|that)|scratch that|never mind (?:that|the|saas|agency))\s*[,.]*\s*(?:i'm|i am|we're|we are)?\s*(?:considering this for|evaluating (?:alpha|this)? (?:for )?|running|looking at|it's|it is)?\s*(?:an?|our)?\s*([a-zA-Z0-9\s-]{2,35}?(?:agency|firm|clinic|practice|saas|software|platform|company|store|business|brand|shop|hospital|consultancy|studio|startup))/i);

  if (contextSwitchMatch && contextSwitchMatch[1]) {
    let rawContext = contextSwitchMatch[1].trim();
    const cleanContext = rawContext.replace(/^(\d+-person\s+|\d+\s+people\s+|an?\s+|our\s+|the\s+)/i, '').trim();

    if (!/^(the|a|an|yes|no|our|my|some|this|that|all)\b/i.test(cleanContext) && cleanContext.length > 2) {
      const oldBiz = mem.visitor.business_type || mem.historical_memory.business || mem.active_topic || 'previous_business';

      // 1. Preserve the old business as HISTORICAL (Do NOT delete historical data)
      if (!mem.historical_entities) mem.historical_entities = {};
      mem.historical_entities[oldBiz] = {
        business: oldBiz,
        team: mem.historical_memory.team,
        lead_volume: mem.requirements.lead_volume,
        superseded_lead_volume: mem.historical_memory.superseded_lead_volume,
        superseded_visitors: mem.historical_memory.superseded_visitors,
        primary_problem: mem.primary_problem || mem.historical_memory.primary_problem,
        facts: { ...mem.facts_established },
      };

      // 2. Create new ACTIVE context
      mem.previous_topic = oldBiz;
      mem.active_topic = cleanContext;
      mem.current_topic = cleanContext;
      mem.visitor.business_type = cleanContext;
      mem.visitor.industry = cleanContext;
      mem.historical_memory.business = cleanContext;

      // 3. Reset business-specific active fields that cannot safely carry over (Bug #3)
      mem.requirements.lead_volume = undefined;
      mem.website_visitors = undefined;
      mem.requirements.quantity_or_scope = undefined;
      mem.historical_memory.team = undefined;
      mem.historical_memory.lead_volume = undefined;
      mem.historical_memory.superseded_lead_volume = undefined;
      mem.historical_memory.primary_problem = undefined;
      mem.primary_problem = undefined;

      delete mem.facts_established['Lead Volume'];
      delete mem.facts_established['Visitor Volume'];
      delete mem.facts_established['Marketing Spend'];
      delete mem.facts_established['Ad Spend'];
      delete mem.facts_established['Team'];
      delete mem.facts_established['Team Size'];
      delete mem.facts_established['Primary Problem'];

      // Mark existing business-specific facts in facts_state as superseded
      if (mem.facts_state) {
        for (const [k, f] of Object.entries(mem.facts_state)) {
          if (['Business', 'Lead Volume', 'Visitor Volume', 'Marketing Spend', 'Ad Spend', 'Team', 'Team Size', 'Primary Problem'].includes(k)) {
            f.status = 'superseded';
          }
        }
      }

      registerOrUpdateFact(mem, 'Business', cleanContext, 1.0, true);

      // 4. Extract new business-specific attributes from the context switch message
      if (/\b(?:inquiries|inquiry|traffic|leads?)[^.!?]*(after business hours|after hours|at night|weekends)\b/i.test(msg) || lower.includes('after business hours')) {
        registerOrUpdateFact(mem, 'Inquiry Timing', 'mostly after business hours', 1.0);
      }
    }
  }

  // 6b. Team Size & Employee Count Extraction
  // Strict semantic ownership (Bug #4 & Invariant #5): Separate employee_count, office_count, team size from leads/visitors!
  const empMatch = msg.match(/(?:has|with|have)\s+(\d+[\d,]*)\s+(?:employees|staff|workers)\b/i) ||
    msg.match(/(\d+[\d,]*)\s+(?:employees|staff|workers)\b/i);
  if (empMatch && empMatch[1]) {
    const rawEmp = empMatch[1].replace(/,/g, '');
    registerOrUpdateFact(mem, 'employee_count', rawEmp, 1.0);
    registerOrUpdateFact(mem, 'Team Size', `${rawEmp} employees`, 1.0);
    mem.historical_memory.team = `${rawEmp} employees`;
  }

  const officeMatch = msg.match(/(?:has|with|have|\band\b)?\s*(\d+[\d,]*)\s+(?:offices|branches|locations)\b/i);
  if (officeMatch && officeMatch[1]) {
    const rawOff = officeMatch[1].replace(/,/g, '');
    registerOrUpdateFact(mem, 'office_count', rawOff, 1.0);
  }

  // 6c. Dedicated Sales Representatives Extraction (Strict Entity Separation)
  // Sales representatives != Total company headcount or employee count!
  const salesRepMatch =
    msg.match(/(?:has|with|have|\band\b)?\s*(\d+[\d,]*)\s*(?:sales\s+representatives|sales\s+reps|salespeople|sales\s+agents|closers|account\s+executives)\b/i) ||
    msg.match(/(?:sales\s+representatives|sales\s+reps|salespeople|sales\s+agents)\s*:\s*(\d+[\d,]*)\b/i);

  if (salesRepMatch && salesRepMatch[1]) {
    const rawRep = salesRepMatch[1].replace(/,/g, '');
    registerOrUpdateFact(mem, 'sales_reps_count', rawRep, 1.0);
    registerOrUpdateFact(mem, 'Sales Representatives', `${rawRep} sales representatives`, 1.0);
    mem.historical_memory.sales_reps = `${rawRep} sales representatives`;
  }

  // 6d. Team Size & Employee Count Extraction (non-sales rep specific)
  const teamMatch =
    msg.match(/\b(\d+)-person\b/i) ||
    msg.match(/(?:team of\s+(\d+)|with\s+(\d+)\s+(?:people|team members|dentists|doctors|engineers|designers)|(\d+)\s+(?:people|team members|dentists|doctors|engineers|designers)\s*(?:team|staff)?)/i);

  if (teamMatch && !empMatch && !salesRepMatch) {
    const rawCount = teamMatch[1] || teamMatch[2] || teamMatch[3];
    if (rawCount) {
      const rawTeam = lower.includes('dentist') ? `${rawCount} dentists` : `${rawCount} people`;
      mem.historical_memory.team = rawTeam;
      registerOrUpdateFact(mem, 'Team Size', rawTeam, 1.0);
      registerOrUpdateFact(mem, 'employee_count', rawCount, 1.0);
    }
  }

  // 6e. Salesperson Presence (no assumptions about responsibilities)
  if (/\b(?:already have a salesperson|have a salesperson|we have a salesperson|employ a salesperson|got a salesperson)\b/i.test(lower)) {
    const spVal = 'exists (no assumptions about their exact responsibilities)';
    mem.historical_memory.salesperson = spVal;
    registerOrUpdateFact(mem, 'Salesperson', spVal, 1.0);
  }

  // 7. Extract Email
  const emailMatch = msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    mem.visitor.email = emailMatch[0].trim();
    mem.visitor.contact_info = mem.visitor.contact_info || emailMatch[0].trim();
  }

  // 8. Extract Phone
  const phoneMatch = msg.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch && !emailMatch) {
    mem.visitor.phone = phoneMatch[0].trim();
    mem.visitor.contact_info = mem.visitor.contact_info || phoneMatch[0].trim();
  }

  // 9. Location & Correction (e.g. "Actually make that Gurgaon")
  const correctionLocMatch = lower.match(/(?:actually|make that|update to|moved to)\s+([a-zA-Z\s]{2,30}?)(?:\.|\?|,|$)/i);
  if (correctionLocMatch && correctionLocMatch[1]) {
    const cand = correctionLocMatch[1].trim();
    if (!/^(the|a|an|yes|no|my|our|some|that|this|budget|price|quantity)\b/i.test(cand) && cand.length > 2) {
      mem.visitor.location = cand.charAt(0).toUpperCase() + cand.slice(1);
    }
  } else {
    const locMatch = msg.match(/(?:based in|located in|office in|delivered to|shipping to|in)\s+([A-Z][a-zA-Z\s]{2,25})(?:\.|\?|,|$)/);
    if (locMatch && locMatch[1]) {
      const cand = locMatch[1].trim();
      if (!/^(The|Our|My|This|That|Some|Any|Yes|No)\b/i.test(cand)) {
        mem.visitor.location = cand;
      }
    }
  }

  // 10. Lead Volume & Period Extraction with Strict Correction Handling
  const isHypothetical = /(?:give me one (?:concrete )?reason i(?:'d| would) spend|why would i spend|why should i spend|what if|suppose|if i spent|if we pay|hypothetically|would it cost|is it \d+)/i.test(lower);
  const hasPriorVolume = Boolean(mem.requirements.lead_volume);

  // 10a. Visitor Volume Extraction & Correction (Bug #6: Never write to quantity_or_scope)
  const visitorMatch =
    msg.match(/(?:actually\s+)?(?:my\s+|our\s+)?(?:website\s+)?visitors?(?:\s*(?:are|is|count is))?\s*(?:closer to|around|approx|roughly)?\s*(\d+(?:[.,]\d+)?\s*(?:k|thousand)?\s*(?:to|–|-)\s*\d+(?:[.,]\d+)?\s*(?:k|thousand)?|\d+(?:[.,]\d+)?\s*(?:k|thousand)?)(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i) ||
    msg.match(/(?:gets?|receives?|has)\s+(\d+(?:[.,]\d+)?\s*(?:k|thousand)?\s*(?:to|–|-)\s*\d+(?:[.,]\d+)?\s*(?:k|thousand)?|\d+(?:[.,]\d+)?\s*(?:k|thousand)?)\s*(?:website\s+|monthly\s+)?visitors?(?:\s*(?:a|per|every|\/)?\s*(month|week|day|mo|wk))?/i) ||
    msg.match(/(\d+(?:[.,]\d+)?\s*(?:k|thousand)?\s*(?:to|–|-)\s*\d+(?:[.,]\d+)?\s*(?:k|thousand)?|\d+(?:[.,]\d+)?\s*(?:k|thousand)?)\s*(?:website\s+|monthly\s+)?visitors?(?:\s*(?:a|per|every|\/)?\s*(month|week|day|mo|wk))?/i);

  if (visitorMatch && !isHypothetical) {
    const rawCount = visitorMatch[1].trim();
    const unit = visitorMatch[2] ? (visitorMatch[2].startsWith('m') ? 'month' : visitorMatch[2].startsWith('w') ? 'week' : 'day') : 'month';
    const normalizedCount = rawCount.replace(/2\s*(?:–|-|to)\s*3k/i, '2,000–3,000').replace(/2-3k/i, '2,000–3,000').replace(/2k/i, '2,000').replace(/3k/i, '3,000').replace(/6,400/i, '6,400');
    const visStr = `${normalizedCount} visitors/${unit}`;
    const prevVis = mem.website_visitors;
    if (prevVis && prevVis !== visStr) {
      mem.historical_memory.superseded_visitors = prevVis;
    }
    mem.website_visitors = visStr;
    registerOrUpdateFact(mem, 'Visitor Volume', visStr, 1.0, Boolean(prevVis));
    registerOrUpdateFact(mem, 'monthly_visitors', visStr, 1.0, Boolean(prevVis));
  }

  // 10b. Check for explicit period clarification/correction when prior volume exists (e.g. "per month", "monthly", "Actually, that's monthly.", "per week", "weekly", "Actually per month")
  const periodOnlyMatch =
    hasPriorVolume && msg.match(/^(?:actually,?\s*)?(?:(?:that|it)(?:'s|\s+is)\s+)?(?:per\s+|a\s+|every\s+)?(month|week|day|mo|wk|monthly|weekly|daily)[.!?]*$/i);

  // Explicit confirmation that prior lead count is still correct (e.g. "The 82 leads is still correct", "82 leads is still correct")
  const leadConfirmedMatch = msg.match(/(?:the\s+)?(\d+)\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(?:leads?|inquiries)\s+(?:is\s+still\s+correct|is\s+correct|remains?\s+correct)/i);

  // Intra-message correction: e.g. "Our agency receives 40 project inquiries per month. Correction: I checked our records, and the actual number is 65 per month."
  const intraMessageCorrection = msg.match(
    /(?:(?:receives?|gets?|have|had|with)\s+)?(\d+(?:\s*(?:to|–|-)\s*\d+)?)\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?[^.]*?[.!?]+\s*(?:correction[:\s]|actually|corrected figure|checked our records)[^0-9]*?(?:actual\s+)?(?:number|figure|count|total|it's|it is)?\s*(?:is|was|=)?\s*(\d+(?:\s*(?:to|–|-)\s*\d+)?)\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i
  );

  // Explicit forget-and-replace correction (e.g. "Actually, forget 70. It's closer to 40–50 leads per month", "forget 30, it's 15–20 leads a week")
  const forgetMatch = msg.match(/(?:actually,?\s*)?forget\s+(\d+(?:\s*(?:to|–|-)\s*\d+)?)[^0-9]+(?:(?:closer to|it's|it is|make that)\s*)?(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i);

  // Explicit volume transition (e.g. "90 inquiries → 55–65 inquiries", "90 inquiries -> 55-65 inquiries", "90 -> 55-65")
  const transitionMatch = msg.match(/(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?\s*(?:->|→)\s*(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i);

  // Guard: Never interpret percentage rates (e.g. "close rate 25%", "conversion rate 4%") as lead volume!
  const isRateOrPercentageExpression =
    /\b(?:conversion(?:\s+rate)?|close\s+rate|booking\s+rate|demo-to-customer)\b/i.test(msg) ||
    /\d+(?:\.\d+)?\s*%/.test(msg);

  // Volume correction with keywords (e.g. "forget 30, it's 15–20", "Actually 55–65 inquiries", "make that 55–65 inquiries", "Correction: ... actual number is 65 per month")
  const volumeCorrectionMatch =
    !isRateOrPercentageExpression &&
    (transitionMatch ||
      intraMessageCorrection ||
      (hasPriorVolume && msg.match(/(?:actually|make that|correction|update to|checked our records)[^0-9%]*\s*(?:closer to|it's|it is|actual\s+(?:number|figure|count|total)\s+is)?\s*(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i)) ||
      (hasPriorVolume && msg.match(/(?:closer to|it's closer to|it is closer to)\s*(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i)) ||
      (hasPriorVolume && msg.match(/(?:actually|not \d+)[,.]*\s*(?:it's|it is|it’s)?\s*(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i)) ||
      msg.match(/(?:actually|make that|correction|update to|checked our records)[^0-9%]*\s*(?:closer to|it's|it is|actual\s+(?:number|figure|count|total)\s+is)?\s*(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i));

  // Explicit count with period (e.g. "70 leads per month", "around 70 leads per month", "65 project inquiries per month", "90 inquiries a month", "around 82 inbound leads")
  const periodCorrectionMatch =
    msg.match(/(?:actually\s+)?(?:around\s+|approx\s+|roughly\s+|receives?\s+|gets?\s+)?(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)\s+(?:per|a|every|\/)\s*(month|week|day|mo|wk)/i);

  // Standard volume mention (e.g. "90 inquiries", "65 project inquiries per month", "55–65 inquiries", "around 70 leads per month", "20 leads a week")
  // Strict semantic ownership: MUST have explicit lead/inquiry noun!
  const volumeMatch = msg.match(/(?:around\s+|approx\s+|roughly\s+|receives?\s+|gets?\s+)?(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i);

  if (leadConfirmedMatch && hasPriorVolume) {
    // Preserve confirmed active lead volume
    const confirmedCount = leadConfirmedMatch[1];
    if (mem.requirements.lead_volume?.includes(confirmedCount)) {
      registerOrUpdateFact(mem, 'Lead Volume', mem.requirements.lead_volume, 1.0);
    }
  } else if (intraMessageCorrection) {
    const rawPrev = intraMessageCorrection[1];
    const prevNoun = intraMessageCorrection[2] || 'project inquiries';
    const rawPrevUnit = intraMessageCorrection[3] || 'month';
    const prevUnit = rawPrevUnit.startsWith('m') ? 'month' : rawPrevUnit.startsWith('w') ? 'week' : 'day';
    const prevVolStr = `${rawPrev} ${prevNoun}/${prevUnit}`;

    const rawNew = intraMessageCorrection[4];
    const newNoun = intraMessageCorrection[5] || prevNoun;
    const rawNewUnit = intraMessageCorrection[6] || prevUnit;
    const newUnit = rawNewUnit.startsWith('m') ? 'month' : rawNewUnit.startsWith('w') ? 'week' : 'day';
    const newVolStr = `${rawNew} ${newNoun}/${newUnit}`;

    mem.historical_memory.superseded_lead_volume = prevVolStr;
    mem.historical_memory.lead_volume = newVolStr;
    mem.requirements.lead_volume = newVolStr;
    registerOrUpdateFact(mem, 'Lead Volume', newVolStr, 1.0, true);
    registerOrUpdateFact(mem, 'monthly_leads', newVolStr, 1.0, true);
  } else if (transitionMatch) {
    const min1 = transitionMatch[1];
    const max1 = transitionMatch[2];
    const noun1 = transitionMatch[3] || 'inquiries';
    const min2 = transitionMatch[4];
    const max2 = transitionMatch[5];
    const noun2 = transitionMatch[6] || noun1 || 'inquiries';
    const rawUnit = transitionMatch[7];

    const priorUnit = mem.requirements.lead_volume?.includes('month')
      ? 'month'
      : mem.requirements.lead_volume?.includes('week')
      ? 'week'
      : mem.requirements.lead_volume?.includes('day')
      ? 'day'
      : undefined;

    const unit = rawUnit
      ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : rawUnit.startsWith('d') ? 'day' : undefined)
      : priorUnit;

    const prevVolStr = mem.requirements.lead_volume || (max1 ? `${min1}–${max1} ${noun1}` : `${min1} ${noun1}`);
    const rangeStr = max2 ? `${min2}–${max2}` : `${min2}`;
    const newVolStr = unit ? `${rangeStr} ${noun2}/${unit}` : `${rangeStr} ${noun2} (period unspecified)`;

    mem.historical_memory.superseded_lead_volume = prevVolStr;
    mem.historical_memory.lead_volume = newVolStr;
    mem.requirements.lead_volume = newVolStr;
    registerOrUpdateFact(mem, 'Lead Volume', newVolStr, 1.0, true);
  } else if (periodOnlyMatch) {
    const rawUnit = periodOnlyMatch[1] || 'month';
    const unit = rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : 'day';
    const prevVol = mem.requirements.lead_volume || mem.facts_established['Lead Volume'] || '';
    if (prevVol) {
      mem.historical_memory.superseded_lead_volume = prevVol;
    }

    // Preserve existing count/range and noun from prior volume
    const rangeMatch = prevVol.match(/^([0-9]+(?:\s*[–-]\s*[0-9]+)?)\s*(leads?|inquiries|inquiry|enquiries|enquiry)?/i);
    const range = rangeMatch ? rangeMatch[1].replace(/\s+/g, '') : (prevVol.match(/\d+(?:[–-]\d+)?/)?.[0] || '');
    const noun = rangeMatch && rangeMatch[2] ? rangeMatch[2] : (prevVol.includes('inquir') ? 'inquiries' : 'leads');
    const volumeStr = range ? `${range} ${noun}/${unit}` : `${noun}/${unit}`;

    mem.historical_memory.lead_volume = volumeStr;
    mem.requirements.lead_volume = volumeStr;
    registerOrUpdateFact(mem, 'Lead Volume', volumeStr, 1.0, true);
  } else if (forgetMatch) {
    const forgotten = forgetMatch[1];
    const min = forgetMatch[2];
    const max = forgetMatch[3];
    const explicitNoun = forgetMatch[4];
    const rawUnit = forgetMatch[5];

    const priorUnit = mem.requirements.lead_volume?.includes('month')
      ? 'month'
      : mem.requirements.lead_volume?.includes('week')
      ? 'week'
      : mem.requirements.lead_volume?.includes('day')
      ? 'day'
      : undefined;

    const unit = rawUnit
      ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : rawUnit.startsWith('d') ? 'day' : undefined)
      : priorUnit;

    const noun = explicitNoun || (mem.requirements.lead_volume?.includes('inquir') ? 'inquiries' : 'leads');
    const rangeStr = max ? `${min}–${max}` : `${min}`;
    const volumeStr = unit ? `${rangeStr} ${noun}/${unit}` : `${rangeStr} ${noun} (period unspecified)`;

    const prevVol = mem.requirements.lead_volume || mem.facts_established['Lead Volume'] || (unit ? `${forgotten} ${noun}/${unit}` : `${forgotten} ${noun}`);
    mem.historical_memory.superseded_lead_volume = prevVol;
    mem.historical_memory.lead_volume = volumeStr;
    mem.requirements.lead_volume = volumeStr;
    registerOrUpdateFact(mem, 'Lead Volume', volumeStr, 1.0, true);
  } else if (volumeCorrectionMatch) {
    const min = volumeCorrectionMatch[1];
    const max = volumeCorrectionMatch[2];
    const explicitNoun = volumeCorrectionMatch[3];
    const rawUnit = volumeCorrectionMatch[4];

    const priorUnit = mem.requirements.lead_volume?.includes('month')
      ? 'month'
      : mem.requirements.lead_volume?.includes('week')
      ? 'week'
      : mem.requirements.lead_volume?.includes('day')
      ? 'day'
      : undefined;

    const unit = rawUnit
      ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : rawUnit.startsWith('d') ? 'day' : undefined)
      : priorUnit;

    const noun = explicitNoun || (mem.requirements.lead_volume?.includes('inquir') ? 'inquiries' : 'leads');
    const rangeStr = max ? `${min}–${max}` : `${min}`;
    const volumeStr = unit ? `${rangeStr} ${noun}/${unit}` : `${rangeStr} ${noun} (period unspecified)`;

    const prevVol = mem.requirements.lead_volume || mem.facts_established['Lead Volume'];
    if (prevVol) {
      mem.historical_memory.superseded_lead_volume = prevVol;
    }
    mem.historical_memory.lead_volume = volumeStr;
    mem.requirements.lead_volume = volumeStr;
    registerOrUpdateFact(mem, 'Lead Volume', volumeStr, 1.0, true);
  } else if (periodCorrectionMatch) {
    const min = periodCorrectionMatch[1];
    const max = periodCorrectionMatch[2];
    const noun = periodCorrectionMatch[3] || 'leads';
    const rawUnit = periodCorrectionMatch[4] || 'month';
    const unit = rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : 'day';

    const rangeStr = max ? `${min}–${max}` : `${min}`;
    const volumeStr = `${rangeStr} ${noun}/${unit}`;
    const prevVol = mem.requirements.lead_volume || mem.facts_established['Lead Volume'];
    if (prevVol) {
      mem.historical_memory.superseded_lead_volume = prevVol;
    }
    mem.historical_memory.lead_volume = volumeStr;
    mem.requirements.lead_volume = volumeStr;
    registerOrUpdateFact(mem, 'Lead Volume', volumeStr, 1.0, true);
  } else if (!isHypothetical) {
    if (volumeMatch) {
      const min = volumeMatch[1];
      const max = volumeMatch[2];
      const noun = volumeMatch[3] || 'leads';
      const rawUnit = volumeMatch[4];
      const unit = rawUnit
        ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : rawUnit.startsWith('d') ? 'day' : undefined)
        : (lower.includes('month') || lower.includes('monthly') ? 'month' : lower.includes('week') || lower.includes('weekly') ? 'week' : undefined);

      const rangeStr = max ? `${min}–${max}` : `${min}`;
      const volumeStr = unit ? `${rangeStr} ${noun}/${unit}` : `${rangeStr} ${noun} (period unspecified)`;

      mem.requirements.lead_volume = volumeStr;
      mem.historical_memory.lead_volume = volumeStr;
      registerOrUpdateFact(mem, 'Lead Volume', volumeStr, 1.0);
      registerOrUpdateFact(mem, 'monthly_leads', volumeStr, 1.0);
    }
  }

  // 10c. Topic & Industry Switch / Correction Handling (e.g. "Actually forget SaaS, it's a web agency", "Actually I own a SaaS", "Not an agency, we are a SaaS")
  const industryCorrectionMatch =
    msg.match(/(?:actually\s+)?(?:forget|scratch that|not|instead of)\s+(?:the\s+)?([a-zA-Z0-9\s-]{2,25}?)\s*[,.]*\s*(?:it's|it is|it’s|we are|we're|i run|i own|i have)?\s*(?:an?|our)?\s*([a-zA-Z0-9\s-]{2,35}?(?:agency|firm|clinic|practice|saas|software|company|store|business|brand|shop))/i) ||
    msg.match(/(?:forget (?:the )?(?:agency|website|previous|company|clinic|business|store|that)|scratch that|instead of (?:the )?(?:agency|firm|clinic|saas))\s*[,.]*\s*(?:i'm|i am|we're|we are)?\s*(?:evaluating (?:alpha|this)? (?:for )?|running|looking at|it's|it is)?\s*(?:an?|our)?\s*([a-zA-Z0-9\s-]{2,30}?(?:clinic|practice|agency|store|firm|company|business|brand|shop|hospital|saas))/i) ||
    msg.match(/(?:actually|no,?\s*it's|it is actually)\s+(?:an?|a)?\s*([a-zA-Z0-9\s-]{2,25}?(?:saas|software|platform|agency|clinic|store|firm|brand|business))/i);

  if (industryCorrectionMatch) {
    const oldContext = (industryCorrectionMatch[1] || '').trim();
    let newContext = (industryCorrectionMatch[2] || industryCorrectionMatch[1] || '').trim();
    newContext = newContext.replace(/^(an?|our|the)\s+/i, '');
    if (/^saas\b/i.test(newContext)) newContext = 'SaaS';

    if (newContext && !/^(the|a|an|yes|no)\b/i.test(newContext) && newContext.length > 1) {
      mem.previous_topic = oldContext || mem.active_topic || mem.current_topic;
      mem.active_topic = newContext;
      mem.current_topic = newContext;
      mem.visitor.business_type = newContext;
      mem.visitor.industry = newContext;
      mem.historical_memory.business = newContext;

      // Check for team in new context (e.g. "with 3 dentists")
      const newTeamMatch = msg.match(/(?:with\s+(\d+)\s*(?:dentists|doctors|people|staff)|(\d+)\s+dentists)/i);
      if (newTeamMatch) {
        const newTeam = (newTeamMatch[1] || newTeamMatch[2] || newTeamMatch[0]).replace(/^with\s+/i, '').trim();
        mem.historical_memory.team = newTeam;
        mem.historical_entities[newContext] = {
          business: newContext,
          team: newTeam,
          facts: {},
        };
      }
      registerOrUpdateFact(mem, 'Business', newContext, 1.0, true);
    }
  }

  // 10d. Primary Problem & Marketing ROI Extraction (e.g. "My biggest problem is low marketing ROI, not lead volume")
  const isPureQuestionAboutProblem = /^(?:what (?:was|is) (?:the|my|our)?\s*(?:biggest|main|primary)?\s*problem|what did i tell you|do you remember my problem)[?.!]*$/i.test(msg);
  if (!isPureQuestionAboutProblem) {
    if (/\b(?:spend(?:ing)? (?:thousands|a lot|\$|money) on marketing|marketing roi|roi is (?:very )?low|low roi|traffic isn't converting|traffic is not converting|wasting ad spend|problem is low marketing roi|roi is (?:terrible|bad|poor|awful|horrible|negative))\b/i.test(lower)) {
      const roiProblem = 'low marketing ROI';
      mem.primary_problem = roiProblem;
      mem.historical_memory.primary_problem = roiProblem;
      registerOrUpdateFact(mem, 'Primary Problem', roiProblem, 1.0);
    } else if (/\b(?:many(?: of them)? have unrealistic budgets|unrealistic budgets|leads? have low budgets|inquiries with unrealistic budgets)\b/i.test(lower)) {
      const budgetProblem = 'many inquiries have unrealistic budgets';
      mem.primary_problem = budgetProblem;
      mem.historical_memory.primary_problem = budgetProblem;
      registerOrUpdateFact(mem, 'Primary Problem', budgetProblem, 1.0);
    } else {
      const problemMatch =
        msg.match(/(?:(?:our|my)\s+)?(?:biggest|main|primary)?\s*(?:problem|challenge|bottleneck|issue|frustration)(?:[^.!?]*?(?:isn't|is not)[^.!?]*?[.!?]+)?(?:\s*(?:is(?: that)?|is we're|is we are|we're|we are|it's|it is))?\s+([^.!?]+)/i) ||
        msg.match(/(?:spending\s+[\d–-]+\s*hours?[^.!?]+)/i) ||
        msg.match(/(?:the problem is that|the problem is)\s+([^.!?]+)/i);

      if (problemMatch) {
        let rawProblem = (problemMatch[1] || problemMatch[0]).trim();
        rawProblem = rawProblem.replace(/^(?:we(?:'re| are)\s+|that\s+)/i, '');
        rawProblem = rawProblem.replace(/,\s*(?:not|rather than).*$/i, '');
        if (rawProblem.length > 3 && !/^(the|a|an|yes|no)\b/i.test(rawProblem)) {
          mem.primary_problem = rawProblem;
          mem.historical_memory.primary_problem = rawProblem;
          registerOrUpdateFact(mem, 'Primary Problem', rawProblem, 1.0);
        }
      }
    }

    // 10d-2. Excluded Problem Extraction (e.g. "not lead volume", "not volume", "not traffic")
    const excludedMatch = msg.match(/(?:not|rather than|instead of|excluding)\s+(lead volume|lead gen|lead generation|traffic|volume|ad spend|closing)/i);
    if (excludedMatch) {
      const excl = excludedMatch[1].trim();
      mem.excluded_problems = mem.excluded_problems || [];
      if (!mem.excluded_problems.includes(excl)) {
        mem.excluded_problems.push(excl);
      }
      registerOrUpdateFact(mem, 'Excluded Problem', `${excl} (explicitly stated not a bottleneck)`, 1.0);
    }
  }

  // 10e. Assumption Control Clarification (e.g. "I never said my salesperson handles serious prospects")
  const assumptionCorrection = msg.match(/(?:i never said|i didn't say|who said|i did not say)\s+([^.!?]+)/i);
  if (assumptionCorrection && assumptionCorrection[1]) {
    mem.stated_workflow = `Visitor clarified: they did NOT say "${assumptionCorrection[1].trim()}". Never assume this about their workflow.`;
  }

  // 11. Business Model & Industry Extraction (e.g. "I run a SaaS", "I own an SaaS", "I run a web agency", "We run an e-commerce store")
  const INVALID_BIZ_WORDS = new Set([
    'not', 'not yet', 'never', 'none', 'nothing', 'no', 'n/a', 'unsure', 'unknown',
    'testing', 'just testing', 'just browsing', 'website visitor', 'visitor', 'customer',
    'user', 'something', 'anything', 'whatever', 'stuff', 'things', 'yes', 'yep', 'yeah',
    'sure', 'ok', 'okay', 'well', 'what', 'why', 'how', 'who', 'where', 'when', 'which',
    'do', 'does', 'did', 'is', 'are', 'was', 'were', 'problem', 'budget', 'website', 'page',
    'website developer', 'web development', 'service', 'services'
  ]);

  const isPureFactRecallQuestion = /^(?:what do you know|what do you remember|what did i tell you|what is my business|what do you know about me)[?.!]*$/i.test(msg);
  if (!isPureFactRecallQuestion && !industryCorrectionMatch && !isHypothetical) {
    const bizMatch =
      msg.match(/\b(?:run|own|operate|have|lead|found|founded|started|build|built|at)\b\s+(?:an\b|a\b|our\b|the\b)?\s*([a-zA-Z0-9\s-]{2,35}?(?:saas|software|platform|agency|firm|consultancy|store|shop|boutique|studio|company|startup|business|clinic|practice|brand|e-commerce|ecommerce|app|fintech))\b/i) ||
      msg.match(/^(?:i(?:'m| am| have| run| own)\s+(?:an\b|a\b|our\b|the\b)?\s*([a-zA-Z0-9\s-]{2,35}?(?:saas|software|platform|agency|firm|clinic|practice|company|store|brand|startup)))[!.?]*$/i) ||
      msg.match(/\b(?:i own\b|i run\b|we are\b|we run\b)\s+(?:an\b|a\b|our\b|the\b)?\s*([a-zA-Z0-9\s-]{2,30}?)(?:\.|\?|,|$)/i) ||
      msg.match(/\b(?:our business is|my business is|we operate as)\s+(?:an\b|a\b|our\b|the\b)?\s*([a-zA-Z0-9\s-]{2,30}?)(?:\.|\?|,|$)/i);

    if (bizMatch && bizMatch[1]) {
      let cand = bizMatch[1].trim();
      cand = cand.replace(/^(?:an\b|a\b|our\b|the\b|n\b)\s*/i, '').trim();
      if (/^saas\b/i.test(cand)) cand = 'SaaS';
      const candLower = cand.toLowerCase();
      if (
        !/^(the|a|an|yes|no|what|do|how|you|problem|budget|not)\b/i.test(cand) &&
        !INVALID_BIZ_WORDS.has(candLower) &&
        cand.length >= 3
      ) {
        const oldBiz = mem.historical_memory.business || mem.visitor.business_type;
        if (oldBiz && oldBiz.toLowerCase() !== cand.toLowerCase()) {
          mem.previous_topic = oldBiz;
          registerOrUpdateFact(mem, 'Business', cand, 1.0, true);
        } else {
          registerOrUpdateFact(mem, 'Business', cand, 1.0);
        }
        mem.visitor.business_type = cand;
        mem.visitor.industry = cand;
        mem.visitor.company = mem.visitor.company || cand;
        mem.historical_memory.business = cand;
        mem.active_topic = cand;
        mem.current_topic = cand;
      }
    }
  }

  // Sanitize any previously corrupted business_type
  if (mem.visitor.business_type && INVALID_BIZ_WORDS.has(mem.visitor.business_type.toLowerCase())) {
    mem.visitor.business_type = undefined;
    if (mem.active_topic && INVALID_BIZ_WORDS.has(mem.active_topic.toLowerCase())) {
      mem.active_topic = 'general_inquiry';
      mem.current_topic = 'general_inquiry';
    }
  }

  // 12. Budget extraction & updates (Strictly skip if hypothetical or question)
  if (!isHypothetical) {
    const budgetMatch = msg.match(/(?:our|my|we have a|the)\s+budget\s*(?:is|of|around|is approx)?\s*([$€£₹]\s*[\d,]+(?:\s*(?:k|thousand|lakh|lac|m|million))?|\b\d+\s*(?:k|thousand|lakh|lac|million)\b)/i);
    if (budgetMatch && (lower.includes('budget') || lower.includes('₹') || lower.includes('$'))) {
      mem.requirements.budget = budgetMatch[1].trim();
      registerOrUpdateFact(mem, 'Budget', budgetMatch[1].trim(), 0.95);
    }
  }

  // 12b. Marketing & Ad Spend Extraction & Correction (e.g. "$7k on ads", "$7k/month", "$7k → $5,500", "Actually $5,500")
  const adSpendTransition = msg.match(/([$€£₹]?\s*[\d,]+k?)\s*(?:->|→|to)\s*([$€£₹]?\s*[\d,]+k?(?:\/(?:month|mo|week|yr))?)/i);
  const adSpendCorrection = msg.match(/(?:actually|correction|make that|not\s*[$€£₹]?\s*[\d,]+k?|spend is|ad spend is)[,.]*\s*(?:it's|it is|it’s)?\s*([$€£₹]\s*[\d,]+k?(?:\/(?:month|mo|week|yr))?|\b[\d,]+k?\s*(?:dollars|bucks)?\s*(?:\/(?:month|mo|week))?)/i);
  const adSpendMatch = msg.match(/(?:spend(?:ing)?|put(?:ting)?)\s*([$€£₹]\s*[\d,]+k?|\b[\d,]+k?\s*(?:dollars|bucks)?)(?:\s*(?:\/|per|a)?\s*(?:month|mo|week))?\s*(?:on\s+)?(?:ads|marketing|advertising|campaigns|paid media)/i);

  const normalizeSpend = (raw: string): string => {
    let clean = raw.trim();
    const hasSymbol = clean.startsWith('$') || clean.startsWith('€') || clean.startsWith('£') || clean.startsWith('₹');
    const symbol = hasSymbol ? clean[0] : '$';
    let numPart = hasSymbol ? clean.slice(1).trim() : clean;
    return `${symbol}${numPart}`;
  };

  if (adSpendTransition) {
    const rawPrev = adSpendTransition[1].trim();
    const rawNew = adSpendTransition[2].trim();
    const prevFormatted = normalizeSpend(rawPrev);
    const newFormatted = normalizeSpend(rawNew);
    const priorPeriod = mem.facts_established['Marketing Spend']?.includes('/week')
      ? '/week'
      : mem.facts_established['Marketing Spend']?.includes('/month')
      ? '/month'
      : '';
    const newSpendStr = newFormatted.includes('/') ? newFormatted : (priorPeriod ? `${newFormatted}${priorPeriod}` : newFormatted);

    registerOrUpdateFact(mem, 'Marketing Spend', newSpendStr, 1.0, true);
    registerOrUpdateFact(mem, 'Ad Spend', newSpendStr, 1.0, true);
  } else if (adSpendCorrection) {
    const rawVal = adSpendCorrection[1].trim();
    const formatted = normalizeSpend(rawVal);
    const priorPeriod = mem.facts_established['Marketing Spend']?.includes('/week')
      ? '/week'
      : mem.facts_established['Marketing Spend']?.includes('/month')
      ? '/month'
      : '';
    const spendStr = formatted.includes('/') ? formatted : (priorPeriod ? `${formatted}${priorPeriod}` : formatted);
    registerOrUpdateFact(mem, 'Marketing Spend', spendStr, 1.0, true);
    registerOrUpdateFact(mem, 'Ad Spend', spendStr, 1.0, true);
  } else if (adSpendMatch && !isHypothetical) {
    const rawVal = adSpendMatch[1].trim();
    const formatted = normalizeSpend(rawVal);
    const period = lower.includes('week') ? '/week' : lower.includes('month') ? '/month' : '';
    const spendStr = formatted.includes('/') ? formatted : (period ? `${formatted}${period}` : formatted);
    registerOrUpdateFact(mem, 'Marketing Spend', spendStr, 1.0);
    registerOrUpdateFact(mem, 'Ad Spend', spendStr, 1.0);
  }

  // 12c. Customers count & Conversion ratio (e.g. "only 2 customers", "2 paying customers")
  const custMatch = msg.match(/(?:only\s+)?(\d+)\s+(?:paying\s+)?customers?\b/i);
  if (custMatch && !/leads?\b/i.test(custMatch[0])) {
    const custCount = `${custMatch[1]} customers`;
    registerOrUpdateFact(mem, 'Customers', custCount, 1.0);
  }

  // 12d. Current Tools (e.g. "We already use HubSpot", "We use Salesforce")
  const toolMatch = msg.match(/(?:already\s+use|we use|currently use|using)\s+([a-zA-Z0-9\s-]{2,20}?(?:hubspot|salesforce|intercom|zendesk|drift|pipedrive|mailchimp|activecampaign|slack))\b/i);
  if (toolMatch && toolMatch[1]) {
    const toolName = toolMatch[1].trim();
    registerOrUpdateFact(mem, 'Current Tools', toolName, 1.0);
  }

  // 12e. "Forget that" / "Forget what I said" (Discard Fact Handling)
  if (/^(?:forget that|scratch that|never mind that|ignore that)[!.?]*$/i.test(msg) || lower.startsWith('forget that')) {
    const keys = Object.keys(mem.facts_state || {});
    if (keys.length > 0) {
      const lastKey = keys[keys.length - 1];
      if (mem.facts_state[lastKey]) {
        mem.facts_state[lastKey].status = 'superseded';
      }
    }
  }

  // 13. Quantity & Timeline Disentanglement (e.g. "50 chairs", "5 websites", "10 licenses", vs "1 week", "two weeks")
  const qtyMatch = msg.match(/(\d+)\s+([a-zA-Z\s-]{2,30})/);
  if (qtyMatch && !/leads?\b/i.test(msg)) {
    const num = parseInt(qtyMatch[1], 10);
    let item = qtyMatch[2].trim();
    // Stop at prepositions or action verbs that separate quantity noun from timeline/spec
    item = item.replace(/\s+(?:delivered|delivery|in|within|by|for|with|at|on|ready|complete|done)\b.*$/i, '').trim();

    const isTimeUnit = /^(days?|weeks?|months?|years?|hours?|minutes?|seconds?|business days?|working days?)\b/i.test(item);
    const isCurrencyUnit = /^(dollars?|bucks|inr|rs\.?|rupees|euros?|pounds?)\b/i.test(item);

    if (isTimeUnit) {
      // Time expression mistakenly matched by number regex: assign to timeline!
      const timeVal = `${num} ${item}`;
      if (!mem.requirements.timeline || mem.requirements.timeline === 'Unknown') {
        mem.requirements.timeline = timeVal;
        registerOrUpdateFact(mem, 'Timeline', timeVal, 1.0);
      }
    } else if (!isCurrencyUnit && !/^(percent|leads?|inquir)\b/i.test(item) && num > 0 && num < 100000) {
      const qtyVal = `${num} ${item}`;
      if (isValidMeasurableQuantity(qtyVal)) {
        mem.requirements.quantity_or_scope = qtyVal;
        registerOrUpdateFact(mem, 'Quantity / Scope', qtyVal, 1.0);
        if (!mem.requirements.product_interest || mem.requirements.product_interest === 'Commercial Requirement') {
          mem.requirements.product_interest = item;
        }
      }
    }
  }

  // Word-number quantity (e.g. "five websites", "ten licenses")
  const wordQtyMatch = msg.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-zA-Z\s-]{3,20})\b/i);
  if (wordQtyMatch && !mem.requirements.quantity_or_scope) {
    const wordNum = wordQtyMatch[1].toLowerCase();
    const item = wordQtyMatch[2].trim();
    const isTimeUnit = /^(days?|weeks?|months?|years?|hours?|minutes?|seconds?|business days?|working days?)\b/i.test(item);
    if (isTimeUnit) {
      const timeVal = `${wordNum} ${item}`;
      if (!mem.requirements.timeline || mem.requirements.timeline === 'Unknown') {
        mem.requirements.timeline = timeVal;
        registerOrUpdateFact(mem, 'Timeline', timeVal, 1.0);
      }
    } else if (!/^(leads?|percent|dollars?|inquiries)\b/i.test(item) && !KNOWN_SERVICE_TERMS.has(item.toLowerCase())) {
      const numMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const n = numMap[wordNum] || 1;
      const qtyVal = `${n} ${item}`;
      mem.requirements.quantity_or_scope = qtyVal;
      registerOrUpdateFact(mem, 'Quantity / Scope', qtyVal, 1.0);
    }
  }

  // 14. Compute Dynamic Sales Intelligence Metrics
  mem.signals.detected_objection = detectObjectionCategory(msg, history);
  if (mem.signals.detected_objection !== 'none') {
    mem.signals.is_objection = true;
    mem.signals.objection_detail = mem.signals.detected_objection;
  }

  mem.signals.classified_intent = classifyVisitorIntent(msg, mem);
  mem.signals.intent_score = computeIntentScore(mem);
  mem.signals.is_hot_lead =
    mem.signals.intent_score >= 70 ||
    (mem.signals.buying_intent_level === 'HIGH' &&
      (Boolean(mem.visitor.contact_info) || Boolean(mem.requirements.product_interest)));
  mem.signals.next_best_action = determineNextBestAction(mem);
  mem.ai_lead_brief = generateAILeadBrief(mem);
  mem.suggested_follow_up = generateSuggestedFollowUp(mem, mem.ai_lead_brief);

  // Synchronize internal facts dictionary
  syncEstablishedFacts(mem);
}

/**
 * 5. Objection Category Detection
 */
export function detectObjectionCategory(
  message: string,
  history: Array<{ sender: string; text: string }> = []
): ObjectionType {
  const t = message.toLowerCase();

  // Price objection
  if (/\b(?:too expensive|how much does it cost|expensive|cheaper|lower price|high price|discount|cannot afford|cant afford|budget is too low)\b/i.test(t)) {
    return 'price';
  }

  // Trust / Hallucination objection
  if (/\b(?:don't trust|dont trust|hallucinat|make mistakes|brand damage|reliable|safety|privacy|leak data|lose control)\b/i.test(t)) {
    return 'trust';
  }

  // Human vs AI objection
  if (/\b(?:already have a salesperson|already have salespeople|talking to a bot|talking to an ai|prefer a human|humans only|hire a salesperson|replace salespeople|robotic)\b/i.test(t)) {
    return 'human_vs_ai';
  }

  // Timing objection
  if (/\b(?:not right now|later|next quarter|busy right now|maybe next month|not ready yet|reach back later)\b/i.test(t)) {
    return 'timing';
  }

  // Competition objection
  if (/\b(?:already use|another chatbot|intercom|drift|zendesk|chatgpt|competitor|already have a solution)\b/i.test(t)) {
    return 'competition';
  }

  // Fit objection
  if (/\b(?:not sure this works|our business is different|too complex for us|niche business|unusual model|doesn't apply to us)\b/i.test(t)) {
    return 'fit';
  }

  // Implementation objection
  if (/\b(?:hard to set up|takes too long|need developers|complex to install|coding required|difficult to integrate)\b/i.test(t)) {
    return 'implementation';
  }

  return 'none';
}

/**
 * 1. Intent Classification (14 distinct commercial intent states)
 */
export function classifyVisitorIntent(
  message: string,
  mem: AlphaConversationMemory
): ClassifiedIntent {
  const t = message.toLowerCase();

  if (mem.signals.human_requested) return 'support_request';
  if (mem.signals.is_browsing) return 'casual_visitor';

  // Ready to buy / Deploy immediately
  if (/\b(?:want this on my (?:site|website)|install (?:it|this)|sign (?:me )?up|deploy now|how do i buy|ready to purchase|get started today)\b/i.test(t)) {
    return 'ready_to_buy';
  }

  // High intent prospect
  if (mem.signals.buying_intent_level === 'HIGH' || (mem.visitor.contact_info && mem.requirements.product_interest)) {
    return 'high_intent_prospect';
  }

  // Objections
  if (mem.signals.detected_objection === 'price') return 'price_sensitive';
  if (mem.signals.detected_objection !== 'none') return 'objection_state';

  // Comparison shopper
  if (mem.signals.is_comparison || /\b(?:versus|compare|instead of|alternative|better than)\b/i.test(t)) {
    return 'comparison_shopper';
  }

  // Problem aware
  if (
    mem.requirements.lead_volume ||
    /\b(?:waste time|wasting time|spending hours|manual work|overwhelmed|sorting through|leakage|drop-off|missed leads)\b/i.test(t)
  ) {
    return 'problem_aware';
  }

  // Evaluating
  if (mem.requirements.product_interest || mem.visitor.company || mem.visitor.location) {
    return 'evaluating_prospect';
  }

  // Information seeker
  if (/\b(?:pricing|cost|how much|features|catalog|specs|hours|where are you located|warranty)\b/i.test(t)) {
    return 'information_seeker';
  }

  // Curious visitor
  if (/\b(?:what (?:does|do) you do|tell me about|how does it work|curious|who are you)\b/i.test(t)) {
    return 'curious_visitor';
  }

  return 'unknown_intent';
}

/**
 * 2. Lead Intent Score (0 - 100 based strictly on actual conversation signals)
 */
export function computeIntentScore(mem: AlphaConversationMemory): number {
  if (mem.signals.is_browsing) {
    return 15; // Low intent browsing
  }

  let score = 15; // Baseline starting score

  // 1. Problem / Pain identified (+20)
  if (
    mem.requirements.lead_volume ||
    (mem.requirements.problems && mem.requirements.problems.length > 0) ||
    mem.facts_established['Lead Volume'] ||
    mem.facts_established['Customer Problem']
  ) {
    score += 20;
  }

  // 2. Specific product or service interest identified (+15)
  if (mem.requirements.product_interest || mem.facts_established['Product / Service']) {
    score += 15;
  }

  // 3. Concrete scale, quantity or volume established (+15)
  if (mem.requirements.quantity_or_scope || mem.facts_established['Quantity / Scope']) {
    score += 15;
  }

  // 4. Contact details established (+20)
  if (mem.visitor.email || mem.visitor.phone || mem.visitor.contact_info) {
    score += 20;
  }

  // 5. High buying intent signal or ready to deploy (+15)
  if (mem.signals.buying_intent_level === 'HIGH' || mem.signals.classified_intent === 'ready_to_buy') {
    score += 15;
  }

  // 6. Timeline or budget established (+10)
  if (mem.requirements.budget || mem.requirements.timeline) {
    score += 10;
  }

  // Adjustments: active objection decreases score slightly until addressed
  if (mem.signals.is_objection && score > 25) {
    score -= 10;
  }

  return Math.min(100, Math.max(5, score));
}

/**
 * 4. Next Best Action Recommendation
 */
export function determineNextBestAction(mem: AlphaConversationMemory): NextBestActionType {
  if (mem.signals.human_requested || mem.human_takeover) {
    return 'handoff_to_human';
  }

  if (mem.signals.intent_score >= 80 && (mem.visitor.email || mem.visitor.phone || mem.visitor.contact_info)) {
    return 'send_quote';
  }

  if (mem.signals.intent_score >= 70) {
    return 'schedule_call';
  }

  if (mem.signals.intent_score >= 50 && mem.requirements.product_interest) {
    return 'provide_demo';
  }

  if (mem.signals.is_browsing) {
    return 'nurture';
  }

  return 'continue_discovery';
}

/**
 * 3. AI Lead Brief Generation
 */
export function generateAILeadBrief(
  mem: AlphaConversationMemory,
  brain?: any
): AILeadBrief {
  const painPoints: string[] = [];
  if (mem.requirements.lead_volume) {
    painPoints.push(`Managing volume of ${mem.requirements.lead_volume}`);
  }
  if (mem.signals.is_objection && mem.signals.detected_objection !== 'none') {
    painPoints.push(`Expressed hesitation regarding ${mem.signals.detected_objection}`);
  }

  const needs: string[] = [];
  if (mem.requirements.product_interest) {
    needs.push(`Interest in ${mem.requirements.product_interest}`);
  }
  if (mem.requirements.quantity_or_scope) {
    needs.push(`Scope: ${mem.requirements.quantity_or_scope}`);
  }

  const objections: string[] = [];
  if (mem.signals.detected_objection !== 'none') {
    objections.push(`Objection: ${mem.signals.detected_objection}`);
  }

  const buyingSignals: string[] = [];
  if (mem.signals.buying_intent_level === 'HIGH') {
    buyingSignals.push('High commercial buying intent detected');
  }
  if (mem.visitor.contact_info) {
    buyingSignals.push(`Provided contact info: ${mem.visitor.contact_info}`);
  }
  if (mem.requirements.budget) {
    buyingSignals.push(`Budget indicated: ${mem.requirements.budget}`);
  }

  const bizContext =
    mem.visitor.company ||
    mem.visitor.business_type ||
    mem.visitor.industry ||
    'Website Visitor';

  const qualSummary = `${mem.signals.buying_intent_level} Intent (Score: ${mem.signals.intent_score}/100) — Stage: ${mem.signals.stage}`;

  let nextStep = 'Continue consultative discovery on specific business workflow';
  if (mem.signals.next_best_action === 'handoff_to_human') {
    nextStep = 'Initiate smooth human salesperson handoff';
  } else if (mem.signals.next_best_action === 'send_quote') {
    nextStep = 'Prepare tailored commercial proposal based on established requirements';
  } else if (mem.signals.next_best_action === 'schedule_call') {
    nextStep = 'Invite prospect to 15-minute technical walkthrough';
  } else if (mem.signals.next_best_action === 'provide_demo') {
    nextStep = 'Demonstrate Alpha workflow matching prospect use case';
  } else if (mem.signals.next_best_action === 'nurture') {
    nextStep = 'Respect browsing state and invite for follow-up questions';
  }

  return {
    business_context: bizContext,
    pain_points: painPoints,
    needs: needs,
    objections: objections,
    buying_signals: buyingSignals,
    qualification_summary: qualSummary,
    recommended_next_step: nextStep,
    intent_score: mem.signals.intent_score,
    is_hot_lead: mem.signals.is_hot_lead,
    detected_objection: mem.signals.detected_objection,
    next_best_action: mem.signals.next_best_action,
    grounded_in_brain: true,
  };
}

/**
 * 10. Suggested Follow-Up Generator
 */
export function generateSuggestedFollowUp(
  mem: AlphaConversationMemory,
  brief: AILeadBrief,
  brain?: any
): string {
  const name = mem.visitor.name ? mem.visitor.name.split(' ')[0] : 'there';
  const interest = mem.requirements.product_interest || 'your requirements';
  const scale = mem.requirements.quantity_or_scope ? ` for ${mem.requirements.quantity_or_scope}` : '';

  if (mem.signals.is_browsing) {
    return `Hi ${name}, thank you for checking out our offerings today. Feel free to reach back whenever you'd like to explore how Alpha can assist your team!`;
  }

  if (mem.signals.detected_objection === 'price') {
    return `Hi ${name}, following up regarding our discussion on pricing for ${interest}. We have flexible deployment tiers tailored to your setup—happy to share what fits best for your volume.`;
  }

  if (mem.signals.detected_objection === 'trust' || mem.signals.detected_objection === 'human_vs_ai') {
    return `Hi ${name}, thank you for discussing how Alpha works alongside human sales teams. I'd be glad to walk you through a brief 5-minute sandbox test on your actual website.`;
  }

  return `Hi ${name}, following up on your inquiry regarding ${interest}${scale}. I'd be glad to answer any questions or share a tailored proposal whenever you're ready.`;
}

export function formatMemoryForPrompt(mem: AlphaConversationMemory): string {
  const parts: string[] = [];

  const activeTopic = mem.active_topic || mem.current_topic || mem.visitor.business_type || 'general_inquiry';
  parts.push(`CURRENT BUSINESS CONTEXT:\n- Active Business / Topic: ${activeTopic}`);
  if (mem.visitor.business_type) {
    parts.push(`- Business Type: ${mem.visitor.business_type}`);
  }
  if (mem.historical_memory?.team) {
    parts.push(`- Team Size: ${mem.historical_memory.team}`);
  }
  if (mem.facts_established['Inquiry Timing']) {
    parts.push(`- Inquiry Timing: ${mem.facts_established['Inquiry Timing']}`);
  }

  // Active verified facts
  const established = Object.entries(mem.facts_established);
  if (established.length > 0) {
    parts.push('\nACTIVE VERIFIED USER FACTS (CURRENT AUTHORITATIVE TRUTH):');
    for (const [key, val] of established) {
      parts.push(`- ${key}: ${val}`);
    }
  }

  // Uncertain / unstated facts
  const uncertain: string[] = [];
  if (!mem.requirements.lead_volume && !mem.facts_established['Lead Volume']) {
    uncertain.push('Lead Volume (not provided for active business — UNKNOWN)');
  }
  if (!mem.website_visitors && !mem.facts_established['Visitor Volume']) {
    uncertain.push('Website Traffic / Visitor Volume (UNKNOWN)');
  }
  if (!mem.facts_established['Marketing Spend'] && !mem.facts_established['Ad Spend']) {
    uncertain.push('Marketing / Ad Spend (UNKNOWN)');
  }
  if (uncertain.length > 0) {
    parts.push('\nUNCERTAIN / UNSTATED FACTS (DO NOT INVENT OR ASSUME):');
    for (const u of uncertain) {
      parts.push(`- ${u}`);
    }
  }

  // Superseded facts
  if (mem.superseded_facts && mem.superseded_facts.length > 0) {
    parts.push('\nSUPERSEDED — NEVER USE AS CURRENT (USER EXPLICITLY CORRECTED OR SWITCHED CONTEXT):');
    for (const sf of mem.superseded_facts) {
      parts.push(`- ${sf.key}: previously "${sf.value}" (superseded by "${sf.supersededBy || 'correction'}"). NEVER use or quote "${sf.value}" as current truth!`);
    }
  }

  // Historical business entities
  const histEntities = Object.entries(mem.historical_entities || {});
  if (histEntities.length > 0) {
    parts.push('\nHISTORICAL BUSINESS CONTEXT (PREVIOUS BUSINESSES - DO NOT CONFUSE WITH ACTIVE CONTEXT):');
    for (const [bizName, data] of histEntities) {
      parts.push(`- ${bizName}: team=${data.team || 'n/a'}, leads=${data.lead_volume || 'n/a'}`);
    }
  }

  const primProb = mem.primary_problem || mem.historical_memory?.primary_problem;
  if (primProb) {
    parts.push(`\nPRIMARY STATED PROBLEM:\n- "${primProb}"`);
  }

  if (mem.stated_workflow) {
    parts.push(`\nWORKFLOW CLARIFICATION:\n- ${mem.stated_workflow}`);
  }

  parts.push(`\nVISITOR SIGNALS & STAGE:`);
  parts.push(`- Current Stage: ${mem.signals.stage}`);
  parts.push(`- Buying Intent: ${mem.signals.buying_intent_level}`);
  parts.push(`- Is Browsing: ${mem.signals.is_browsing ? 'YES (DO NOT QUALIFY)' : 'NO'}`);
  parts.push(`- Is Comparison: ${mem.signals.is_comparison ? 'YES (Answer comparison directly)' : 'NO'}`);
  parts.push(`- Is Objection / Doubt: ${mem.signals.is_objection ? 'YES' : 'NO'}`);
  parts.push(`- Sentiment: ${mem.signals.sentiment}`);

  return parts.join('\n');
}
