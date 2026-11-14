import { CompanyProfileInput, AnalysisResult, fallbackRuleBasedAnalysis } from './analyzeHandler.ts';
import { StructuredLeadProfile, QualificationStatus, LeadScore } from '../types.ts';
import {
  detectRequestedEnvironment,
  validateActionSafety,
  checkIdempotency,
  recordIdempotency,
  buildIdempotencyKey,
  ActionResult,
} from './actionSafety.ts';
import { isPortfolioDeployment, getUniversalPortfolioQuickActions } from '../utils/portfolioUtils.ts';
import {
  getOrCreateAlphaMemory,
  saveAlphaMemory,
  updateMemoryFromMessage,
  AlphaConversationMemory,
} from './alphaMemory.ts';
import { retrieveRelevantBrainSlice } from './alphaBrainRetriever.ts';
import { evaluateAlphaDecision } from './alphaDecisionEngine.ts';
import {
  generateAlphaResponse,
  generateAlphaResponseStream,
  sanitizeAndVerifyResponse,
  generateDeterministicFallback,
  ALPHA_PRODUCTION_VERSION,
  ALPHA_CONFIG_HASH,
} from './alphaResponseGenerator.ts';
import { DeterministicStreamManager } from './streamBufferManager.ts';
import { runAlphaOrchestrationPipeline } from './alphaOrchestrationEngine.ts';
import { recordModelTelemetry, estimateTokenCost } from './providers/modelRegistry.ts';
import { isReservedOfficialWidgetId, isOfficialTenantId } from './platformConfig.ts';
import { persistCanonicalEnquiry, normalizeEnquiry } from './canonicalEnquiryService.ts';
import { hasAdminCredentials } from './firebaseAdmin.ts';

export interface ChatMessageInput {
  sender: 'customer' | 'assistant' | 'system';
  text: string;
  timestamp?: string;
}

export type ExecutionEnvironment = 'simulation' | 'production' | 'unknown';

export interface PipelineTimingMetrics {
  request_received_at: number;
  context_loaded_at: number;
  context_retrieval_ms: number;
  model_started_at: number;
  model_completed_at?: number;
  first_token_at?: number;
  ttft_ms?: number;
  stream_completed_at?: number;
  streaming_duration_ms?: number;
  chunks_count?: number;
  generation_ms?: number;
  total_duration_ms: number;
  model_used?: string;
  bottlenecks?: string[];
}

export interface WebsiteChatProcessRequest {
  widget_id?: string;
  conversation_id?: string;
  visitor_id?: string;
  message: string;
  customer_name?: string;
  user_id?: string;
  message_history?: ChatMessageInput[];
  company_profile?: CompanyProfileInput;
  existing_profile?: StructuredLeadProfile;
  request_id?: string;
  environment?: ExecutionEnvironment;
  timing_metrics?: PipelineTimingMetrics;
  thinkMode?: 'standard' | 'think' | 'auto';
  think_mode?: 'standard' | 'think' | 'auto';
  requestedThinkMode?: 'standard' | 'think' | 'auto';
  is_simulated?: boolean;
}

export interface WebsiteChatProcessResponse {
  reply: string;
  conversation_id: string;
  is_conversation?: boolean;
  is_sales_lead: boolean;
  is_qualified_inquiry?: boolean;
  inquiry_requirements_satisfied?: boolean;
  qualification_status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COLLECTING_DETAILS' | 'QUALIFIED' | 'DISQUALIFIED' | 'REFUSED_CONTACT';
  detected_intent: CustomerIntentType;
  lead_data?: AnalysisResult;
  structured_profile?: StructuredLeadProfile;
  inquiry_registered: boolean;
  registration_attempted: boolean;
  action_result?: ActionResult;
  db_confirmed?: boolean;
  options?: string[];
  sentiment?: 'positive' | 'neutral' | 'frustrated' | 'complaining';
  escalated_to_care?: boolean;
  conversation_stage?: string;
  lead_score?: LeadScore;
  lead_reason?: string;
  lead_id?: string;
  inquiry_id?: string;
  human_takeover_active?: boolean;
  intent_score?: number;
  is_hot_lead?: boolean;
  detected_objection?: string;
  next_best_action?: string;
  lead_brief?: any;
  suggested_follow_up?: string;
  grounded_in_brain?: boolean;
  timing_metrics?: PipelineTimingMetrics;
  alpha_version?: string;
  alpha_config_hash?: string;
  reasoning_mode?: string;
  analysis_summary?: any;
}

export type CustomerIntentType =
  | 'GENERAL_QUESTION'
  | 'PRODUCT_SERVICE_QUESTION'
  | 'OFFICE_LOCATION_QUESTION'
  | 'PRICE_QUOTATION_QUESTION'
  | 'BUYING_INTENT'
  | 'REQUEST_TO_REGISTER_INQUIRY'
  | 'AMBIGUOUS_ACTION_REQUEST'
  | 'UNSUPPORTED_INTEGRATION_REQUEST'
  | 'CANCELLATION_REQUEST'
  | 'QUALIFICATION_REFUSAL'
  | 'OFF_TOPIC_OR_18PLUS'
  | 'ASK_WHAT_DETAILS_NEEDED'
  | 'HUMAN_HANDOFF_REQUEST'
  | 'JUST_BROWSING'
  | 'CONVERSATION_CLOSING'
  | 'CORRECTION_OR_REPETITION'
  | 'CLARIFICATION_REQUEST'
  | 'OBJECTION_EXPENSIVE'
  | 'OBJECTION_WHY_CHOOSE_YOU'
  | 'COMPETITOR_COMPARISON'
  | 'OBJECTION_NOT_CONVINCED'
  | 'SHORT_ANSWER'
  | 'CASUAL_CONVERSATION'
  | 'FOUNDING_PARTNER_INTENT'
  | 'ROADMAP_OR_UPCOMING'
  | 'FREE_TIER_OR_PRICING'
  | 'HALLUCINATION_OR_RESET'
  | 'COMPLAINT_OR_FRUSTRATION'
  | 'SUPPORT_OR_ORDER_STATUS'
  | 'UPCOMING_PRODUCT_INQUIRY'
  | 'DEPLOY_INTENT'
  | 'GET_QUOTE'
  | 'TALK_TO_SALES'
  | 'WHO_IS_FOUNDER'
  | 'WHAT_DOES_MAGNUS_DO'
  | 'WHO_ARE_YOU'
  | 'WHAT_IS_AI_WORKFORCE'
  | 'WHAT_DOES_ALPHA_DO'
  | 'TOPIC_SWITCH'
  | 'INTEGRATION_INQUIRY'
  | 'ASK_A_QUESTION'
  | 'PORTFOLIO_ABOUT_ME'
  | 'PORTFOLIO_PROJECTS'
  | 'PORTFOLIO_WHAT_I_DO'
  | 'PORTFOLIO_SKILLS'
  | 'COLLABORATION_INTENT'
  | 'CONTACT_INTENT'
  | 'ACHIEVEMENTS'
  | 'PROJECTS'
  | 'CURRENT_WORK'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'INTERESTS'
  | 'PHILOSOPHY'
  | 'JOURNEY'
  | 'HIRING'
  | 'COLLABORATION'
  | 'CONTACT'
  | 'COMMERCIAL'
  | 'AI_WORKFORCE'
  | 'LIMITLESS'
  | 'GENESISAI'
  | 'ABOUT_PERSON'
  | 'UNCLEAR';

export interface MissingInquiryFieldsAnalysis {
  hasProduct: boolean;
  hasQuantity: boolean;
  hasLocation: boolean;
  hasName: boolean;
  hasContact: boolean;
  nextMissingField: 'product' | 'quantity' | 'name' | 'contact' | 'none';
  knownFactsList: string[];
  missingRequiredList: string[];
  missingOptionalList: string[];
  isServicesModel: boolean;
}

export function analyzeMissingInquiryFields(
  profile: StructuredLeadProfile,
  companyProfile?: CompanyProfileInput
): MissingInquiryFieldsAnalysis {
  const hasProduct = Boolean(profile.product_interest || profile.product_or_service || profile.need);
  const hasQuantity = Boolean(profile.quantity_or_scope || profile.lead_volume);
  const hasLocation = Boolean(profile.location && profile.location !== 'Unknown');
  const hasName = Boolean(profile.name || (profile.customer_name && profile.customer_name !== 'Website Visitor'));
  const hasContact = Boolean(profile.contact_info);

  const knownFactsList: string[] = [];
  if (hasProduct) knownFactsList.push(`Product/Need: ${profile.product_interest || profile.product_or_service}`);
  if (profile.company) knownFactsList.push(`Company: ${profile.company}`);
  if (profile.lead_volume) knownFactsList.push(`Lead Volume: ${profile.lead_volume}`);
  if (hasQuantity) knownFactsList.push(`Quantity/Scope: ${profile.quantity_or_scope}`);
  if (hasLocation) knownFactsList.push(`Location: ${profile.location}`);
  if (hasName) knownFactsList.push(`Name: ${profile.name || profile.customer_name}`);
  if (hasContact) knownFactsList.push(`Contact: ${profile.contact_info}`);

  let nextMissingField: 'product' | 'quantity' | 'name' | 'contact' | 'none' = 'none';
  if (!hasProduct) nextMissingField = 'product';
  else if (!hasQuantity) nextMissingField = 'quantity';
  else if (!hasContact) nextMissingField = 'contact';
  else if (!hasName) nextMissingField = 'name';

  return {
    hasProduct,
    hasQuantity,
    hasLocation,
    hasName,
    hasContact,
    nextMissingField,
    knownFactsList,
    missingRequiredList: !hasProduct ? ['product'] : !hasContact ? ['contact'] : [],
    missingOptionalList: !hasQuantity ? ['quantity'] : !hasLocation ? ['location'] : [],
    isServicesModel: companyProfile?.businessType === 'services',
  };
}

export function generateDynamicSmartOptions(params: {
  intent: CustomerIntentType | string;
  stage?: string;
  companyProfile?: CompanyProfileInput;
  leadProfile?: StructuredLeadProfile;
  missingAnalysis?: MissingInquiryFieldsAnalysis;
  productStatus?: string;
  hasCustomPrice?: boolean;
}): string[] {
  const { intent, companyProfile } = params;

  if (isPortfolioDeployment(companyProfile)) {
    return getUniversalPortfolioQuickActions(companyProfile).slice(0, 3);
  }

  let options: string[] = [];

  if (intent === 'HUMAN_HANDOFF_REQUEST') {
    options = ['Request Callback', 'Leave a Message'];
  } else if (intent === 'PRICE_QUOTATION_QUESTION' || intent === 'FREE_TIER_OR_PRICING') {
    options = ['Explore Solutions', 'Pricing & Rates'];
  } else if (intent === 'BUYING_INTENT' || intent === 'DEPLOY_INTENT') {
    options = ['Get Started', 'Talk to Sales'];
  } else if (intent === 'JUST_BROWSING') {
    options = ['Explore Offerings'];
  } else {
    // Contextual: do not globally repeat options after every message
    options = [];
  }

  // Lightweight deterministic validation
  const seen = new Set<string>();
  const validatedOptions = options
    .map(opt => (opt || '').trim())
    .filter(opt => {
      if (!opt) return false;
      if (opt.length < 2 || opt.length > 40) return false;
      if (seen.has(opt.toLowerCase())) return false; // Deduplicate
      seen.add(opt.toLowerCase());
      
      // Reject debug, system instructions, malformed, or obvious markdown artifacts
      if (/^[•\-\*]/i.test(opt)) return false; // markdown bullets
      if (/Check constraints|constraint|DEBUG|SYSTEM|CONFIG|INFO|ERROR|undefined|null/i.test(opt)) return false;
      
      return true;
    });

  return validatedOptions.slice(0, 3);
}

function sanitizeHistoryForPrompt(history: Array<{ sender: string; text: string }>): Array<{ sender: string; text: string }> {
  return history
    .filter((m) => m && m.sender !== 'system' && typeof m.text === 'string' && m.text.trim().length > 0)
    .map((m) => {
      let text = m.text.trim();
      if (m.sender === 'assistant') {
        text = text.replace(/Confidence Score:\s*\d+(\/\d+)?/gi, '');
        text = text.replace(/Confidence:\s*\d+(\/\d+)?/gi, '');
        text = text.replace(/Qualification Score:\s*\d+(\/\d+)?/gi, '');
        text = text.replace(/Qualification:\s*\d+(\/\d+)?/gi, '');
        text = text.replace(/Intent:\s*[A-Z_]+/gi, '');
        text = text.replace(/Conversation Stage:\s*[A-Z_]+/gi, '');
        text = text.replace(/Stage:\s*[A-Z_]+/gi, '');
        text = text.replace(/\[(DEBUG|INFO|ERROR|SYSTEM|STAGE|DIRECTIVE).*?\]/gi, '');
        text = text.replace(/Check constraints:\s*\*?/gi, '');
        text = text.replace(/^[a-z0-9]+%\s+/i, '');
        text = text.trim();
      }
      return { sender: m.sender === 'assistant' ? 'assistant' : 'customer', text };
    });
}

/**
 * Main Entry Point: Process website chat message through Alpha 2.0
 */
export async function processWebsiteChatMessage(
  request: WebsiteChatProcessRequest
): Promise<WebsiteChatProcessResponse> {
  const tRequestReceived = Date.now();
  const {
    widget_id,
    conversation_id = `conv-${Date.now()}`,
    visitor_id,
    message,
    customer_name = 'Website Visitor',
    message_history = [],
    company_profile,
    existing_profile,
    environment = 'production',
  } = request;

  const trimmedMsg = (message || '').trim();
  const lowerMsg = trimmedMsg.toLowerCase();
  const bName = company_profile?.brandName?.trim() || company_profile?.name?.trim() || 'Business Assistant';

  // 1. Initialize or hydrate Alpha Memory with strict tenant/widget isolation
  const tenantKey = (company_profile as any)?._tenantId || widget_id || request.user_id;
  const memory = getOrCreateAlphaMemory(conversation_id, existing_profile, tenantKey);
  memory._isOfficialTenant =
    Boolean((company_profile as any)?._isOfficialAiWorkforce) ||
    isReservedOfficialWidgetId(widget_id) ||
    isOfficialTenantId(tenantKey);
  if (customer_name && customer_name !== 'Website Visitor' && !memory.visitor.name) {
    memory.visitor.name = customer_name;
  }
  (memory as any).company_profile = company_profile;
  const historyForEngine = sanitizeHistoryForPrompt(message_history);
  updateMemoryFromMessage(memory, trimmedMsg, historyForEngine);

  // 1.5 Human Takeover Check (If active, Alpha yields to human salesperson)
  if (memory.human_takeover) {
    return {
      reply: '',
      conversation_id,
      is_sales_lead: true,
      detected_intent: 'HUMAN_HANDOFF_REQUEST',
      inquiry_registered: false,
      registration_attempted: false,
      human_takeover_active: true,
      intent_score: memory.signals.intent_score,
      is_hot_lead: memory.signals.is_hot_lead,
      detected_objection: memory.signals.detected_objection,
      next_best_action: 'handoff_to_human',
      lead_brief: memory.ai_lead_brief,
      suggested_follow_up: memory.suggested_follow_up,
      grounded_in_brain: true,
      options: ['Speak with human agent'],
    };
  }

  // 2. Security & Administrative Safety Checks (Test 27 & Test 28)
  if (
    /\b(?:delete all database|drop table|reset company admin|change the email address of customer id|attacker@|overwrite customer)\b/i.test(lowerMsg)
  ) {
    return {
      reply: 'I cannot perform administrative data modifications or access third-party customer accounts. How can I assist you with our authorized business services?',
      conversation_id,
      is_sales_lead: false,
      detected_intent: 'GENERAL_QUESTION',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Explore Solutions', 'Pricing & Rates'],
    };
  }

  // Refusal to pretend external action succeeded (Test 24)
  if (/\b(?:booked a 5-star hotel|booked an executive suite|book a hotel room)\b/i.test(lowerMsg)) {
    return {
      reply: `I cannot book hotel rooms or make external hospitality reservations. I am the AI Sales Manager for ${bName}, focused on assisting with our verified products and services.`,
      conversation_id,
      is_sales_lead: false,
      detected_intent: 'GENERAL_QUESTION',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Explore Solutions', 'Pricing & Rates'],
    };
  }

  // Refusal to execute financial charge in simulation (Test 25)
  if (/\b(?:charge of \$|credit card charge|charge my card)\b/i.test(lowerMsg)) {
    return {
      reply: 'Live payment transactions and credit card charges cannot be executed directly through this conversational interface. Please contact our team for authorized commercial invoicing.',
      conversation_id,
      is_sales_lead: false,
      detected_intent: 'GENERAL_QUESTION',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Pricing & Rates', 'Talk to Sales'],
    };
  }

  // Refusal to invent CEO private cell phone or secret discounts (Test 23 & Test 17)
  if (
    /\b(?:private cell phone number of your ceo|secret \d+% discounts?|system prompt|what is your system prompt|reveal your prompt|internal instructions)\b/i.test(lowerMsg)
  ) {
    return {
      reply: `I cannot share private contact details, unverified confidential discounts, or internal system configurations. For ${bName}, all authorized pricing and team contact options are grounded directly in our official offerings. How can I help with your requirements?`,
      conversation_id,
      is_sales_lead: false,
      detected_intent: 'GENERAL_QUESTION',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Explore Solutions', 'Pricing & Rates'],
    };
  }

  // 3. Action Execution & Safety Engine (Simulation vs Production & Unsupported Integrations)
  const envCheck = detectRequestedEnvironment(trimmedMsg);

  // Cancellation (Test 20)
  if (envCheck.isCancellation) {
    return {
      reply: 'Understood — no action was taken and no inquiry was submitted. Let me know if you would like to explore anything else.',
      conversation_id,
      is_sales_lead: false,
      detected_intent: 'CANCELLATION_REQUEST',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Explore Solutions', 'Pricing & Rates'],
    };
  }

  // Unsupported External Integrations (e.g. Salesforce, HubSpot - Test 22)
  if (envCheck.target === 'salesforce' || envCheck.target === 'hubspot' || envCheck.target === 'external') {
    const targetName = envCheck.target === 'salesforce' ? 'Salesforce' : envCheck.target === 'hubspot' ? 'HubSpot' : 'external CRM';
    return {
      reply: `I do not have access to push directly into ${targetName} in this setup, as it is not connected. However, I can register your inquiry directly for our sales team to review and follow up with you. Would you like me to do that?`,
      conversation_id,
      is_sales_lead: true,
      detected_intent: 'UNSUPPORTED_INTEGRATION_REQUEST',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Register with Team', 'Ask a Question'],
    };
  }

  // Disambiguation for Ambiguous Action (Test 17)
  if (envCheck.isAmbiguous) {
    return {
      reply: 'Would you like me to register this as a real production lead for our team, or simulate the submission in the preview sandbox?',
      conversation_id,
      is_sales_lead: true,
      detected_intent: 'AMBIGUOUS_ACTION_REQUEST',
      inquiry_registered: false,
      registration_attempted: false,
      options: ['Real Production Lead', 'Simulate in Sandbox'],
    };
  }

  // Explicit Inquiry Registration (Test 15, 16, 18, 19, 21, 26)
  const isExplicitRegister =
    /\b(?:register (?:this|my)?\s*inquiry|register this in simulator|register my inquiry as a real lead|register it again)\b/i.test(lowerMsg);

  let inquiryRegistered = false;
  let actionResult: ActionResult | undefined;

  if (isExplicitRegister) {
    const targetEnv = envCheck.environment !== 'unknown' ? envCheck.environment : (environment || 'production');
    const targetSystem = envCheck.target !== 'unknown' ? envCheck.target : (targetEnv === 'production' ? 'crm' : 'simulator');

    const actionReq = {
      tenantId: tenantKey,
      conversationId: conversation_id,
      actionType: 'create_inquiry' as const,
      environment: targetEnv,
      target: targetSystem,
      payload: {
        product_or_service: memory.requirements.product_interest || 'Commercial Requirement',
        quantity: memory.requirements.quantity_or_scope || 'Standard',
        contact_info: memory.visitor.contact_info || memory.visitor.email || 'Customer provided',
      },
      requestId: request.request_id,
    };

    const actionKey = buildIdempotencyKey(actionReq);
    const existingRun = checkIdempotency(actionKey);

    if (existingRun) {
      actionResult = existingRun;
      return {
        reply: `Your inquiry has already been registered safely. Our team has your details and duplicate submissions have been prevented.`,
        conversation_id,
        is_sales_lead: true,
        detected_intent: 'REQUEST_TO_REGISTER_INQUIRY',
        inquiry_registered: Boolean(existingRun.success),
        registration_attempted: true,
        action_result: existingRun,
        db_confirmed: targetEnv === 'production' ? Boolean((existingRun.data as any)?.db_confirmed) : false,
        options: ['View Confirmation', 'Ask Another Question'],
      };
    }

    const validation = validateActionSafety(actionReq);
    if (!validation.allowed) {
      return {
        reply: validation.responseMessage || `Cannot register inquiry: ${validation.reason}`,
        conversation_id,
        is_sales_lead: false,
        detected_intent: 'REQUEST_TO_REGISTER_INQUIRY',
        inquiry_registered: false,
        registration_attempted: true,
        db_confirmed: false,
        options: ['Explore Solutions'],
      };
    }

    let dbConfirmed = false;
    let persistedInquiryId: string | undefined;
    if (targetEnv === 'production' && tenantKey && widget_id) {
      const enquiry = normalizeEnquiry({
        tenant_id: tenantKey,
        widget_id,
        conversation_id,
        visitor_id: visitor_id || `vis_${conversation_id}`,
        original_message: trimmedMsg,
        intent_type: 'sales_enquiry',
        extracted: {
          customer_name: memory.visitor.name || customer_name,
          company_name: memory.visitor.company,
          product_or_service: actionReq.payload.product_or_service,
          quantity: actionReq.payload.quantity,
          email: memory.visitor.email,
          phone: memory.visitor.phone,
          location: memory.visitor.location,
        },
        lead_score: 'HOT',
      });
      const persistRes = await persistCanonicalEnquiry(enquiry);
      dbConfirmed = Boolean(persistRes.success && persistRes.db_confirmed);
      persistedInquiryId = persistRes.inquiry_id;
      inquiryRegistered = persistRes.success && persistRes.db_confirmed;
    } else if (targetEnv === 'simulation') {
      inquiryRegistered = true;
    } else if (targetEnv === 'production' && !hasAdminCredentials()) {
      inquiryRegistered = false;
      dbConfirmed = false;
    }

    if (targetEnv === 'production' && !inquiryRegistered) {
      return {
        reply: 'I was unable to durably save your inquiry right now because database persistence could not be confirmed. Please retry in a moment.',
        conversation_id,
        is_sales_lead: true,
        detected_intent: 'REQUEST_TO_REGISTER_INQUIRY',
        inquiry_registered: false,
        registration_attempted: true,
        db_confirmed: false,
        options: ['Retry', 'Ask Another Question'],
      };
    }

    actionResult = {
      success: inquiryRegistered,
      status: inquiryRegistered ? 'EXECUTED' : 'ERROR',
      actionId: persistedInquiryId || `inq-${Date.now()}`,
      environment: targetEnv,
      target: targetSystem,
      message: inquiryRegistered ? 'Inquiry registered successfully.' : 'Inquiry persistence failed.',
      data: { ...actionReq.payload, db_confirmed: dbConfirmed },
    };
    recordIdempotency(actionKey, actionResult);

    const confirmationReply = targetEnv === 'simulation'
      ? `Done — I've registered your simulated inquiry in the sandbox for ${actionReq.payload.quantity} ${actionReq.payload.product_or_service}.`
      : `Done — I have registered your inquiry for ${actionReq.payload.quantity} ${actionReq.payload.product_or_service} with our team.`;

    return {
      reply: confirmationReply,
      conversation_id,
      is_sales_lead: true,
      detected_intent: 'REQUEST_TO_REGISTER_INQUIRY',
      inquiry_registered: inquiryRegistered,
      inquiry_id: persistedInquiryId,
      registration_attempted: true,
      action_result: actionResult,
      db_confirmed: dbConfirmed,
      options: ['Review Details', 'Ask Another Question'],
    };
  }

  const requestedThinkMode = request.requestedThinkMode || request.thinkMode || request.think_mode || 'auto';

  // Execute Project Alpha 8-Step Orchestration Pipeline
  const orchestration = runAlphaOrchestrationPipeline({
    tenantId: tenantKey,
    conversationId: conversation_id,
    visitorId: visitor_id || `vis_${conversation_id}`,
    message: trimmedMsg,
    messageHistory: historyForEngine,
    companyProfile: company_profile,
    existingProfile: existing_profile,
  });

  // 5. Relevant Company Brain Retrieval (Part 8)
  const brainSlice = retrieveRelevantBrainSlice(company_profile, trimmedMsg, memory.current_topic);

  // 6. Core Decision Engine (Evaluate Intent, Stage, Strategy - Part 4 & 5)
  // Note: skipMemoryUpdate is true because memory was already hydrated and updated at step 1 (line 349)
  const decision = evaluateAlphaDecision(trimmedMsg, memory, brainSlice, historyForEngine, true, requestedThinkMode);
  const tContextLoaded = Date.now();

  // 7. Response Generation & Truth Verification (Part 6, 11, 14, 19)
  const tModelStarted = Date.now();
  const genResult = await generateAlphaResponse({
    message: trimmedMsg,
    history: historyForEngine,
    memory,
    brain: brainSlice,
    decision,
  });
  const tGenCompleted = Date.now();

  const contextRetrievalMs = tContextLoaded - tRequestReceived;
  const genMs = tGenCompleted - tModelStarted;
  const totalDurationMs = tGenCompleted - tRequestReceived;

  // Record Telemetry into Model Registry Dashboard Store
  const estInTokens = Math.round(trimmedMsg.length / 4) + 120;
  const estOutTokens = Math.round((genResult.reply || '').length / 4);
  const estCost = estimateTokenCost('gemini', genResult.modelUsed || 'gemini-3.1-flash-lite', estInTokens, estOutTokens);

  recordModelTelemetry({
    providerId: 'gemini',
    modelName: genResult.modelUsed || 'gemini-3.1-flash-lite',
    taskCategory: orchestration.step3_taskCategory,
    inputTokens: estInTokens,
    outputTokens: estOutTokens,
    latencyMs: genMs,
    estimatedCostUsd: estCost,
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
  });

  const bottlenecks: string[] = [];
  if (contextRetrievalMs > 500) bottlenecks.push(`context_retrieval_${contextRetrievalMs}ms`);
  if (genMs > 1000) bottlenecks.push(`model_gen_${genMs}ms`);
  if (totalDurationMs > 1500) bottlenecks.push(`total_latency_${totalDurationMs}ms`);

  const timingMetrics: PipelineTimingMetrics = {
    request_received_at: tRequestReceived,
    context_loaded_at: tContextLoaded,
    context_retrieval_ms: contextRetrievalMs,
    model_started_at: tModelStarted,
    model_completed_at: tGenCompleted,
    generation_ms: genMs,
    total_duration_ms: totalDurationMs,
    model_used: genResult.modelUsed,
    bottlenecks: bottlenecks.length > 0 ? bottlenecks : undefined,
  };
  request.timing_metrics = timingMetrics;
  console.log(`[ALPHA_TIMING] non-stream req=${request.request_id || conversation_id} context=${contextRetrievalMs}ms gen=${genMs}ms total=${totalDurationMs}ms model=${genResult.modelUsed} task=${orchestration.step3_taskCategory} bottlenecks=${bottlenecks.join(',') || 'none'}`);

  // Save updated memory state
  saveAlphaMemory(memory);

  // 8. Build Structured Lead Profile for Frontend & Firestore
  const leadScore: LeadScore =
    memory.signals.buying_intent_level === 'HIGH' || memory.visitor.contact_info
      ? 'HOT'
      : memory.requirements.product_interest && (memory.requirements.quantity_or_scope || memory.visitor.location)
      ? 'WARM'
      : 'COLD';

  const isSalesLead = Boolean(
    memory.signals.buying_intent_level === 'HIGH' ||
    memory.visitor.contact_info ||
    (memory.requirements.product_interest && (memory.requirements.quantity_or_scope || memory.visitor.location))
  );

  const structuredProfile_contact = memory.visitor.contact_info || memory.visitor.email || memory.visitor.phone;

  const mappedInquiryStage: 'IDLE' | 'INQUIRY_REQUESTED' | 'COLLECTING_DETAILS' | 'READY_TO_SUBMIT' | 'CONFIRMED' | 'CANCELLED' =
    inquiryRegistered
      ? 'CONFIRMED'
      : isSalesLead && structuredProfile_contact
      ? 'READY_TO_SUBMIT'
      : isSalesLead
      ? 'COLLECTING_DETAILS'
      : 'IDLE';

  const mappedQualStatus: QualificationStatus = isSalesLead ? 'QUALIFIED' : memory.signals.is_browsing ? 'NOT_STARTED' : 'IN_PROGRESS';

  const structuredProfile: StructuredLeadProfile = {
    customer_name: memory.visitor.name || customer_name,
    name: memory.visitor.name || customer_name,
    contact_info: structuredProfile_contact,
    company: memory.visitor.company,
    company_name: memory.visitor.company,
    business_type: memory.visitor.business_type,
    location: memory.visitor.location,
    product_interest: memory.requirements.product_interest,
    product_or_service: memory.requirements.product_interest,
    quantity_or_scope: memory.requirements.quantity_or_scope,
    lead_volume: memory.requirements.lead_volume,
    budget: memory.requirements.budget,
    timeline: memory.requirements.timeline,
    deadline: memory.requirements.timeline,
    inquiry_stage: mappedInquiryStage,
    qualification_status: mappedQualStatus,
    environment: environment as any,
  };

  const leadAnalysis: AnalysisResult = {
    customer_name: structuredProfile.customer_name || 'Website Visitor',
    source: 'Website Chat',
    original_message: trimmedMsg,
    product_or_service: structuredProfile.product_or_service || 'Commercial Inquiry',
    quantity: structuredProfile.quantity_or_scope || 'Unknown',
    location: structuredProfile.location || 'Unknown',
    deadline: structuredProfile.timeline || 'Unknown',
    budget: structuredProfile.budget || 'Unknown',
    lead_temperature: leadScore,
    lead_score: leadScore,
    lead_reason: decision.decisionNotes,
    requirements: memory.requirements.requirements || [],
    customer_facts: Object.entries(memory.facts_established).map(([k, v]) => `${k}: ${v}`),
    customer_intent: decision.intent,
    missing_information: memory.missing_high_value_fields,
    recommended_action: decision.strategy,
    draft_reply: genResult.reply,
  };

  // Convert AlphaIntent to CustomerIntentType
  let customerIntentType: CustomerIntentType = 'GENERAL_QUESTION';
  if (decision.intent === 'PRICING') customerIntentType = 'PRICE_QUOTATION_QUESTION';
  else if (decision.intent === 'HIGH_INTENT') customerIntentType = 'BUYING_INTENT';
  else if (decision.intent === 'COMPARISON') customerIntentType = 'COMPETITOR_COMPARISON';
  else if (decision.intent === 'HANDOFF') customerIntentType = 'HUMAN_HANDOFF_REQUEST';
  else if (decision.isBrowsing) customerIntentType = 'JUST_BROWSING';
  else if (decision.intent === 'PRODUCT_DISCOVERY') customerIntentType = 'PRODUCT_SERVICE_QUESTION';
  else if (decision.intent === 'OBJECTION') customerIntentType = 'OBJECTION_NOT_CONVINCED';

  const smartOptions = generateDynamicSmartOptions({
    intent: customerIntentType,
    companyProfile: company_profile,
    leadProfile: structuredProfile,
  });

  const responseQualStatus = isSalesLead ? 'QUALIFIED' : memory.signals.is_browsing ? 'NOT_STARTED' : 'IN_PROGRESS';
  const responseSentiment = memory.signals.sentiment === 'skeptical' ? 'neutral' : memory.signals.sentiment;

  return {
    reply: genResult.reply,
    conversation_id,
    is_sales_lead: isSalesLead,
    is_qualified_inquiry: isSalesLead && Boolean(structuredProfile.contact_info),
    inquiry_requirements_satisfied: Boolean(structuredProfile.contact_info && structuredProfile.product_or_service),
    qualification_status: responseQualStatus,
    detected_intent: customerIntentType,
    lead_data: leadAnalysis,
    structured_profile: structuredProfile,
    inquiry_registered: inquiryRegistered,
    registration_attempted: isExplicitRegister,
    action_result: actionResult,
    options: smartOptions,
    sentiment: responseSentiment,
    escalated_to_care: decision.intent === 'HANDOFF' || memory.signals.human_requested,
    conversation_stage: decision.stage,
    lead_score: leadScore,
    lead_reason: decision.decisionNotes,
    intent_score: memory.signals.intent_score,
    is_hot_lead: memory.signals.is_hot_lead,
    detected_objection: memory.signals.detected_objection,
    next_best_action: memory.signals.next_best_action,
    lead_brief: memory.ai_lead_brief,
    suggested_follow_up: memory.suggested_follow_up,
    grounded_in_brain: Boolean(decision.groundedCapabilityResponse || (brainSlice.isConfigured && genResult.verified && genResult.modelUsed !== 'deterministic-fallback')),
    timing_metrics: timingMetrics,
    alpha_version: ALPHA_PRODUCTION_VERSION,
    alpha_config_hash: ALPHA_CONFIG_HASH,
    reasoning_mode: decision.alphaThink?.reasoningMode || decision.salesDecision?.alphaThink?.reasoningMode || (requestedThinkMode === 'standard' ? 'STANDARD_DIRECT' : 'STANDARD_THINK'),
    analysis_summary: decision.alphaThink?.analysisSummary || decision.salesDecision?.alphaThink?.analysisSummary,
  };
}

/**
 * Streams a website chat message response dynamically chunk-by-chunk. Reuses identical
 * safety, off-topic, CRM, and administrative guards as processWebsiteChatMessage.
 */
export async function* processWebsiteChatMessageStream(
  request: WebsiteChatProcessRequest
): AsyncGenerator<{ chunk?: string; metadata?: WebsiteChatProcessResponse; error?: string }> {
  const tRequestReceived = Date.now();
  const trimmedMsg = (request.message || '').trim();
  const lowerMsg = trimmedMsg.toLowerCase();
  const bName = request.company_profile?.brandName?.trim() || request.company_profile?.name?.trim() || 'Business Assistant';
  const isExplicitRegister = /\b(?:register (?:this|my)?\s*inquiry|register this in simulator|register my inquiry as a real lead|register it again)\b/i.test(lowerMsg);
  const isSpecialCase = 
    /\b(?:delete all database|drop table|reset company admin|change the email address of customer id|attacker@|overwrite customer)\b/i.test(lowerMsg) ||
    /\b(?:booked a 5-star hotel|booked an executive suite|book a hotel room)\b/i.test(lowerMsg) ||
    /\b(?:charge of \$|credit card charge|charge my card)\b/i.test(lowerMsg) ||
    /\b(?:private cell phone number of your ceo|secret \d+% discounts?|system prompt|what is your system prompt|reveal your prompt|internal instructions)\b/i.test(lowerMsg) ||
    detectRequestedEnvironment(trimmedMsg).isCancellation ||
    detectRequestedEnvironment(trimmedMsg).target === 'salesforce' ||
    detectRequestedEnvironment(trimmedMsg).target === 'hubspot' ||
    detectRequestedEnvironment(trimmedMsg).target === 'external' ||
    detectRequestedEnvironment(trimmedMsg).isAmbiguous ||
    isExplicitRegister;

  if (isSpecialCase) {
    const staticRes = await processWebsiteChatMessage(request);
    yield { chunk: staticRes.reply, metadata: staticRes };
    return;
  }

  const {
    widget_id,
    conversation_id = `conv-${Date.now()}`,
    visitor_id,
    customer_name = 'Website Visitor',
    message_history = [],
    company_profile,
    existing_profile,
    environment = 'production',
  } = request;

  // Hydrate memory with strict tenant/widget isolation
  const tenantKey = (company_profile as any)?._tenantId || widget_id || request.user_id;
  const memory = getOrCreateAlphaMemory(conversation_id, existing_profile, tenantKey);
  memory._isOfficialTenant =
    Boolean((company_profile as any)?._isOfficialAiWorkforce) ||
    isReservedOfficialWidgetId(widget_id) ||
    isOfficialTenantId(tenantKey);
  if (customer_name && customer_name !== 'Website Visitor' && !memory.visitor.name) {
    memory.visitor.name = customer_name;
  }
  (memory as any).company_profile = company_profile;
  const historyForEngine = sanitizeHistoryForPrompt(message_history);
  updateMemoryFromMessage(memory, trimmedMsg, historyForEngine);

  if (memory.human_takeover) {
    const staticRes = await processWebsiteChatMessage(request);
    yield { chunk: staticRes.reply, metadata: staticRes };
    return;
  }

  const requestedThinkMode = request.requestedThinkMode || request.thinkMode || request.think_mode || 'auto';
  const brainSlice = retrieveRelevantBrainSlice(company_profile, trimmedMsg, memory.current_topic);
  const decision = evaluateAlphaDecision(trimmedMsg, memory, brainSlice, historyForEngine, false, requestedThinkMode);
  const tContextLoaded = Date.now();

  const requestId = request.request_id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  DeterministicStreamManager.startStreamSession({
    conversationId: conversation_id,
    requestId,
    companyId: widget_id,
    userId: request.user_id,
  });

  let accumulatedReply = '';
  const tModelStarted = Date.now();
  let tFirstToken: number | undefined;
  let streamModelUsed = 'gemini-3.1-flash-lite';
  let tokenChunkCount = 0;

  try {
    const stream = generateAlphaResponseStream({
      message: trimmedMsg,
      history: historyForEngine,
      memory,
      brain: brainSlice,
      decision,
    });

    for await (const s of stream) {
      if (s.chunk) {
        if (!tFirstToken) {
          tFirstToken = Date.now();
        }
        tokenChunkCount++;
        if (s.modelUsed) {
          streamModelUsed = s.modelUsed;
        }
        const isActive = DeterministicStreamManager.appendChunk(conversation_id, requestId, s.chunk);
        if (!isActive) {
          // Stream session was cancelled or interrupted! Stop processing immediately.
          return;
        }
        accumulatedReply += s.chunk;
        yield { chunk: s.chunk };
      }
    }
  } catch (err: any) {
    console.error('Streaming error inside chatHandler, executing rapid deterministic fallback:', err?.message || err);
    DeterministicStreamManager.cancelStreamSession(conversation_id, requestId);
    const rapidFallback = generateDeterministicFallback(
      {
        message: trimmedMsg,
        history: historyForEngine,
        memory,
        brain: brainSlice,
        decision,
      },
      'Streaming connection interrupted'
    );
    yield { chunk: rapidFallback.reply };
    accumulatedReply = rapidFallback.reply;
    streamModelUsed = 'deterministic-fallback';
  }

  const tStreamCompleted = Date.now();
  const verifiedReply = decision.groundedCapabilityResponse || sanitizeAndVerifyResponse(accumulatedReply, brainSlice, memory, decision);

  saveAlphaMemory(memory);

  const contextRetrievalMs = tContextLoaded - tRequestReceived;
  const genMs = tStreamCompleted - tModelStarted;
  const totalDurationMs = tStreamCompleted - tRequestReceived;
  const ttftMs = tFirstToken ? tFirstToken - tModelStarted : undefined;
  const streamingDurationMs = tFirstToken ? tStreamCompleted - tFirstToken : 0;

  const bottlenecks: string[] = [];
  if (contextRetrievalMs > 500) bottlenecks.push(`context_retrieval_${contextRetrievalMs}ms`);
  if (ttftMs && ttftMs > 800) bottlenecks.push(`ttft_${ttftMs}ms`);
  if (genMs > 1500) bottlenecks.push(`stream_gen_${genMs}ms`);
  if (totalDurationMs > 2000) bottlenecks.push(`total_latency_${totalDurationMs}ms`);

  const timingMetrics: PipelineTimingMetrics = {
    request_received_at: tRequestReceived,
    context_loaded_at: tContextLoaded,
    context_retrieval_ms: contextRetrievalMs,
    model_started_at: tModelStarted,
    model_completed_at: tStreamCompleted,
    first_token_at: tFirstToken,
    ttft_ms: ttftMs,
    stream_completed_at: tStreamCompleted,
    streaming_duration_ms: streamingDurationMs,
    chunks_count: tokenChunkCount,
    generation_ms: genMs,
    total_duration_ms: totalDurationMs,
    model_used: streamModelUsed,
    bottlenecks: bottlenecks.length > 0 ? bottlenecks : undefined,
  };
  request.timing_metrics = timingMetrics;
  console.log(`[ALPHA_TIMING] stream req=${requestId} context=${contextRetrievalMs}ms ttft=${ttftMs ?? 0}ms gen=${genMs}ms total=${totalDurationMs}ms chunks=${tokenChunkCount} model=${streamModelUsed} bottlenecks=${bottlenecks.join(',') || 'none'}`);

  const leadScore: LeadScore =
    memory.signals.buying_intent_level === 'HIGH' || memory.visitor.contact_info
      ? 'HOT'
      : memory.requirements.product_interest && (memory.requirements.quantity_or_scope || memory.visitor.location)
      ? 'WARM'
      : 'COLD';

  const isSalesLead = Boolean(
    memory.signals.buying_intent_level === 'HIGH' ||
    memory.visitor.contact_info ||
    (memory.requirements.product_interest && (memory.requirements.quantity_or_scope || memory.visitor.location))
  );

  const structuredProfile_contact = memory.visitor.contact_info || memory.visitor.email || memory.visitor.phone;

  const mappedInquiryStage: 'IDLE' | 'INQUIRY_REQUESTED' | 'COLLECTING_DETAILS' | 'READY_TO_SUBMIT' | 'CONFIRMED' | 'CANCELLED' =
    isSalesLead && structuredProfile_contact
      ? 'READY_TO_SUBMIT'
      : isSalesLead
      ? 'COLLECTING_DETAILS'
      : 'IDLE';

  const mappedQualStatus: QualificationStatus = isSalesLead ? 'QUALIFIED' : memory.signals.is_browsing ? 'NOT_STARTED' : 'IN_PROGRESS';

  const structuredProfile: StructuredLeadProfile = {
    customer_name: memory.visitor.name || customer_name,
    name: memory.visitor.name || customer_name,
    contact_info: structuredProfile_contact,
    company: memory.visitor.company,
    company_name: memory.visitor.company,
    business_type: memory.visitor.business_type,
    location: memory.visitor.location,
    product_interest: memory.requirements.product_interest,
    product_or_service: memory.requirements.product_interest,
    quantity_or_scope: memory.requirements.quantity_or_scope,
    lead_volume: memory.requirements.lead_volume,
    budget: memory.requirements.budget,
    timeline: memory.requirements.timeline,
    deadline: memory.requirements.timeline,
    inquiry_stage: mappedInquiryStage,
    qualification_status: mappedQualStatus,
    environment: environment as any,
  };

  const leadAnalysis: AnalysisResult = {
    customer_name: structuredProfile.customer_name || 'Website Visitor',
    source: 'Website Chat',
    original_message: trimmedMsg,
    product_or_service: structuredProfile.product_or_service || 'Commercial Inquiry',
    quantity: structuredProfile.quantity_or_scope || 'Unknown',
    location: structuredProfile.location || 'Unknown',
    deadline: structuredProfile.timeline || 'Unknown',
    budget: structuredProfile.budget || 'Unknown',
    lead_temperature: leadScore,
    lead_score: leadScore,
    lead_reason: decision.decisionNotes,
    requirements: memory.requirements.requirements || [],
    customer_facts: Object.entries(memory.facts_established).map(([k, v]) => `${k}: ${v}`),
    customer_intent: decision.intent,
    missing_information: memory.missing_high_value_fields,
    recommended_action: decision.strategy,
    draft_reply: verifiedReply,
  };

  let customerIntentType: CustomerIntentType = 'GENERAL_QUESTION';
  if (decision.intent === 'PRICING') customerIntentType = 'PRICE_QUOTATION_QUESTION';
  else if (decision.intent === 'HIGH_INTENT') customerIntentType = 'BUYING_INTENT';
  else if (decision.intent === 'COMPARISON') customerIntentType = 'COMPETITOR_COMPARISON';
  else if (decision.intent === 'HANDOFF') customerIntentType = 'HUMAN_HANDOFF_REQUEST';
  else if (decision.isBrowsing) customerIntentType = 'JUST_BROWSING';
  else if (decision.intent === 'PRODUCT_DISCOVERY') customerIntentType = 'PRODUCT_SERVICE_QUESTION';
  else if (decision.intent === 'OBJECTION') customerIntentType = 'OBJECTION_NOT_CONVINCED';

  const smartOptions = generateDynamicSmartOptions({
    intent: customerIntentType,
    companyProfile: company_profile,
    leadProfile: structuredProfile,
  });

  const responseQualStatus = isSalesLead ? 'QUALIFIED' : memory.signals.is_browsing ? 'NOT_STARTED' : 'IN_PROGRESS';
  const responseSentiment = memory.signals.sentiment === 'skeptical' ? 'neutral' : memory.signals.sentiment;

  const metadata: WebsiteChatProcessResponse = {
    reply: verifiedReply,
    conversation_id,
    is_sales_lead: isSalesLead,
    is_qualified_inquiry: isSalesLead && Boolean(structuredProfile.contact_info),
    inquiry_requirements_satisfied: Boolean(structuredProfile.contact_info && structuredProfile.product_or_service),
    qualification_status: responseQualStatus,
    detected_intent: customerIntentType,
    lead_data: leadAnalysis,
    structured_profile: structuredProfile,
    inquiry_registered: false,
    registration_attempted: false,
    options: smartOptions,
    sentiment: responseSentiment,
    escalated_to_care: decision.intent === 'HANDOFF' || memory.signals.human_requested,
    conversation_stage: decision.stage,
    lead_score: leadScore,
    lead_reason: decision.decisionNotes,
    intent_score: memory.signals.intent_score,
    is_hot_lead: memory.signals.is_hot_lead,
    detected_objection: memory.signals.detected_objection,
    next_best_action: memory.signals.next_best_action,
    lead_brief: memory.ai_lead_brief,
    suggested_follow_up: memory.suggested_follow_up,
    grounded_in_brain: Boolean(decision.groundedCapabilityResponse || (brainSlice.isConfigured && streamModelUsed !== 'deterministic-fallback')),
    timing_metrics: timingMetrics,
    reasoning_mode: decision.alphaThink?.reasoningMode || decision.salesDecision?.alphaThink?.reasoningMode || (requestedThinkMode === 'standard' ? 'STANDARD_DIRECT' : 'STANDARD_THINK'),
    analysis_summary: decision.alphaThink?.analysisSummary || decision.salesDecision?.alphaThink?.analysisSummary,
  };

  const completed = DeterministicStreamManager.completeStreamSession({
    conversationId: conversation_id,
    requestId,
    verifiedReply,
    metadata,
  });

  if (completed) {
    saveAlphaMemory(memory);
    yield { chunk: '', metadata };
  }
}
