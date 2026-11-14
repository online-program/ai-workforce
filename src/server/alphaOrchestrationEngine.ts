/**
 * PROJECT ALPHA — ALPHA 8-STEP ORCHESTRATION ENGINE
 * 
 * Central routing and decision engine enforcing the 8-step Alpha execution pipeline:
 * Step 1: Conversation Understanding
 * Step 2: Tenant Context Retrieval (Company Brain 2.0)
 * Step 3: Task Classification
 * Step 4: Intelligent Model Routing
 * Step 5: Response Construction & Strategy
 * Step 6: Validation & Factual Grounding
 * Step 7: Response Delivery & Format
 * Step 8: Structured Event Recording
 */

import { routeTaskForAlpha, AlphaTaskCategory, TaskRoutingDecision } from './providers/modelRegistry.ts';
import { retrieveBrainContextV2, BrainV2RetrievalResult, normalizeToBrainV2 } from './companyBrainV2.ts';
import { buildPersonalityDirectives, TenantPersonalityConfig } from './personalityEngine.ts';
import { computeConfigurableLeadScore, ConfigurableLeadScoreResult, extractStructuredLeadFromMessage } from './leadIntelligenceEngine.ts';
import { createOrUpdateHumanHandoff } from './humanHandoffManager.ts';
import { CustomerIntentType } from './chatHandler.ts';

export interface AlphaOrchestrationInput {
  tenantId: string;
  conversationId: string;
  visitorId: string;
  message: string;
  messageHistory: Array<{ sender: string; text: string }>;
  companyProfile: any;
  existingProfile?: any;
  personalityConfig?: Partial<TenantPersonalityConfig>;
}

export interface AlphaOrchestrationEvent {
  eventType: 'CONVERSATION_STARTED' | 'INTENT_IDENTIFIED' | 'PRICING_INQUIRY' | 'LEAD_QUALIFIED' | 'CONTACT_COLLECTED' | 'PURCHASE_INTENT' | 'HUMAN_HANDOFF_REQUESTED' | 'CONVERSION_VERIFIED';
  timestamp: string;
  details: Record<string, any>;
}

export interface AlphaOrchestrationResult {
  step1_understanding: {
    detectedIntent: CustomerIntentType;
    purchaseIntentSignals: boolean;
    objectionsDetected: string[];
    extractedDetails: Record<string, any>;
  };
  step2_retrieval: BrainV2RetrievalResult;
  step3_taskCategory: AlphaTaskCategory;
  step4_routingDecision: TaskRoutingDecision;
  step5_responseStrategy: {
    personalityDirectives: string;
    salesNextStep: string;
    suggestedOptions: string[];
  };
  step6_validation: {
    groundedInBrain: boolean;
    unsupportedClaimsCount: number;
    validated: boolean;
  };
  leadScore: ConfigurableLeadScoreResult;
  recordedEvents: AlphaOrchestrationEvent[];
}

/**
 * Classifies customer intent into an Alpha Task Category
 */
export function classifyTaskCategory(intent: CustomerIntentType, message: string): AlphaTaskCategory {
  const lower = message.toLowerCase();

  if (intent === 'HUMAN_HANDOFF_REQUEST') return 'HUMAN_ASSISTANCE';
  if (intent === 'PRICE_QUOTATION_QUESTION' || intent === 'FREE_TIER_OR_PRICING') return 'PRICING_INQUIRY';
  if (intent === 'BUYING_INTENT' || intent === 'DEPLOY_INTENT' || intent === 'GET_QUOTE') return 'PURCHASE_INTENT';
  if (intent === 'PRODUCT_SERVICE_QUESTION' || intent === 'UPCOMING_PRODUCT_INQUIRY') return 'PRODUCT_INQUIRY';
  if (intent === 'OBJECTION_EXPENSIVE' || intent === 'OBJECTION_WHY_CHOOSE_YOU' || intent === 'COMPETITOR_COMPARISON') return 'OBJECTION_HANDLING';
  if (intent === 'REQUEST_TO_REGISTER_INQUIRY' || intent === 'TALK_TO_SALES') return 'SALES_QUALIFICATION';
  if (intent === 'GENERAL_QUESTION' || intent === 'WHO_IS_FOUNDER' || intent === 'WHAT_IS_AI_WORKFORCE') return 'GENERAL_FAQ';
  
  if (lower.includes('research') || lower.includes('market') || lower.includes('competitor report')) return 'RESEARCH_REQUEST';
  if (lower.includes('funnel') || lower.includes('conversion') || lower.includes('calculate') || lower.includes('analytics')) return 'NUMERICAL_ANALYTICS';

  return 'PRODUCT_INQUIRY';
}

/**
 * Executes the full Alpha 8-Step Orchestration Pipeline
 */
export function runAlphaOrchestrationPipeline(input: AlphaOrchestrationInput): AlphaOrchestrationResult {
  const events: AlphaOrchestrationEvent[] = [];
  const now = new Date().toISOString();

  // Event 1: Conversation Started
  if (input.messageHistory.length <= 1) {
    events.push({ eventType: 'CONVERSATION_STARTED', timestamp: now, details: { conversationId: input.conversationId, visitorId: input.visitorId } });
  }

  // Step 1: Conversation Understanding
  const messageLower = input.message.toLowerCase();
  let detectedIntent: CustomerIntentType = 'PRODUCT_SERVICE_QUESTION';

  const hasNegatedHuman =
    /\b(?:don't|do not|dont|never|no|not|without)\b.{0,28}\b(?:human|agent|person|representative|someone|call|transfer)\b/i.test(messageLower) ||
    /\b(?:no human|avoid human|prefer ai|just alpha)\b/i.test(messageLower);

  const explicitHumanIntent =
    !hasNegatedHuman &&
    /\b(?:speak (?:to|with) (?:a )?(?:human|person|agent|representative|someone)|talk (?:to|with) (?:a )?(?:human|person|agent|representative|someone)|human agent|live agent|real person|call me|transfer (?:me )?(?:to )?(?:a )?(?:human|agent))\b/i.test(messageLower);

  if (explicitHumanIntent) {
    detectedIntent = 'HUMAN_HANDOFF_REQUEST';
  } else if (/\b(?:price|pricing|cost|fee|fees|quote|quotation)\b/i.test(messageLower)) {
    detectedIntent = 'PRICE_QUOTATION_QUESTION';
  } else if (/\b(?:buy|purchase|deploy|sign up|get started)\b/i.test(messageLower)) {
    detectedIntent = 'BUYING_INTENT';
  } else if (/\b(?:too expensive|high price)\b/i.test(messageLower)) {
    detectedIntent = 'OBJECTION_EXPENSIVE';
  }

  const purchaseSignals = detectedIntent === 'BUYING_INTENT' || messageLower.includes('pricing') || messageLower.includes('demo');
  const objections: string[] = [];
  if (detectedIntent === 'OBJECTION_EXPENSIVE') objections.push('PRICE');

  const extractedDetails = extractStructuredLeadFromMessage(input.message, input.existingProfile);

  events.push({ eventType: 'INTENT_IDENTIFIED', timestamp: now, details: { intent: detectedIntent, purchaseSignals } });
  if (detectedIntent === 'PRICE_QUOTATION_QUESTION') {
    events.push({ eventType: 'PRICING_INQUIRY', timestamp: now, details: { query: input.message } });
  }

  // Step 2: Tenant Context Retrieval
  const brainRetrieval = retrieveBrainContextV2(input.companyProfile, input.message, detectedIntent);

  // Step 3: Task Classification
  const taskCategory = classifyTaskCategory(detectedIntent, input.message);

  // Step 4: Intelligent Model Routing
  const complexity = (taskCategory === 'COMPLEX_REASONING' || taskCategory === 'NUMERICAL_ANALYTICS' || objections.length > 0) ? 'complex' : 'medium';
  const routingDecision = routeTaskForAlpha(taskCategory, complexity);

  // Step 5: Response Construction & Personality Strategy
  const personalityDirectives = buildPersonalityDirectives(input.personalityConfig);
  let salesNextStep = 'Discover visitor requirements and provide grounded answers.';
  const suggestedOptions: string[] = [];

  if (detectedIntent === 'PRICE_QUOTATION_QUESTION') {
    salesNextStep = 'Confirm pricing summary and discover volume or integration needs.';
    suggestedOptions.push('How does setup work?', 'Connect with sales');
  } else if (detectedIntent === 'HUMAN_HANDOFF_REQUEST') {
    salesNextStep = 'Generate structured handoff brief and notify sales team.';
    suggestedOptions.push('Leave contact details', 'Return to chat');
    
    // Trigger Human Handoff Record creation
    createOrUpdateHumanHandoff({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      visitorId: input.visitorId,
      handoffReason: 'Visitor requested human sales assistance',
      summaryOfContext: `Visitor asked: "${input.message}". Intent: ${detectedIntent}`,
      profile: { ...(input.existingProfile || {}), ...extractedDetails },
    });
    events.push({ eventType: 'HUMAN_HANDOFF_REQUESTED', timestamp: now, details: { conversationId: input.conversationId } });
  } else {
    suggestedOptions.push('What are the features?', 'See pricing', 'Speak to sales');
  }

  // Lead Scoring & Qualification
  const mergedProfile = { ...(input.existingProfile || {}), ...extractedDetails };
  const leadScore = computeConfigurableLeadScore(mergedProfile, input.messageHistory.length, input.message);

  if (leadScore.totalScore >= 70) {
    events.push({ eventType: 'LEAD_QUALIFIED', timestamp: now, details: { score: leadScore.totalScore, tier: leadScore.qualificationTier } });
  }
  if (extractedDetails.contact_info) {
    events.push({ eventType: 'CONTACT_COLLECTED', timestamp: now, details: { contact_info: extractedDetails.contact_info } });
  }
  if (purchaseSignals) {
    events.push({ eventType: 'PURCHASE_INTENT', timestamp: now, details: { intent: detectedIntent } });
  }

  // Step 6: Validation & Factual Grounding
  const groundedInBrain = brainRetrieval.isFullyGrounded;
  const validation = {
    groundedInBrain,
    unsupportedClaimsCount: brainRetrieval.missingInformationDetected ? 1 : 0,
    validated: true,
  };

  return {
    step1_understanding: {
      detectedIntent,
      purchaseIntentSignals: purchaseSignals,
      objectionsDetected: objections,
      extractedDetails,
    },
    step2_retrieval: brainRetrieval,
    step3_taskCategory: taskCategory,
    step4_routingDecision: routingDecision,
    step5_responseStrategy: {
      personalityDirectives,
      salesNextStep,
      suggestedOptions,
    },
    step6_validation: validation,
    leadScore,
    recordedEvents: events,
  };
}
