/**
 * Action Safety, Environment Isolation & Idempotency Engine
 * 
 * Enforces:
 * 1. Environment Isolation: SIMULATION vs PRODUCTION
 * 2. Idempotency & Duplicate Prevention: Never execute the same write action twice.
 * 3. Tool Result Verification: Never claim an action succeeded unless the backend write returned success.
 * 4. Disambiguation: Ambiguous targets/environments require explicit confirmation.
 * 5. Capability Verification: Unsupported external integrations (e.g. Salesforce, HubSpot) are rejected honestly.
 */

export type ExecutionEnvironment = 'simulation' | 'production' | 'unknown';
export type ActionType = 'create_inquiry' | 'update_lead' | 'send_email' | 'book_appointment' | 'external_crm_sync';
export type ActionTarget = 'simulator' | 'dashboard' | 'crm' | 'salesforce' | 'hubspot' | 'external' | 'unknown';

export interface ActionRequest {
  tenantId?: string;
  conversationId: string;
  actionType: ActionType;
  environment: ExecutionEnvironment;
  target: ActionTarget;
  payload: Record<string, any>;
  requestId?: string;
}

export interface ActionResult {
  success: boolean;
  status: 'EXECUTED' | 'ALREADY_COMPLETED' | 'AMBIGUOUS_ENVIRONMENT' | 'UNSUPPORTED_INTEGRATION' | 'CANCELLED' | 'VALIDATION_FAILED' | 'ERROR';
  actionId?: string;
  environment: ExecutionEnvironment;
  target: ActionTarget;
  message: string;
  data?: Record<string, any>;
}

const MAX_IDEMPOTENCY_ENTRIES = 2000;
const idempotencyStore = new Map<string, { result: ActionResult; timestamp: number }>();

/**
 * Builds a deterministic, tenant-scoped idempotency key for an action
 */
export function buildIdempotencyKey(req: ActionRequest): string {
  const tenantScope = req.tenantId || 'unscoped';
  const reqId = req.requestId || '';
  const payloadFingerprint = req.payload ? `${req.payload.product_or_service || ''}_${req.payload.quantity || ''}_${req.payload.contact_info || ''}` : '';
  return `tenant:${tenantScope}::conv:${req.conversationId}::action:${req.actionType}::env:${req.environment}::target:${req.target}::req:${reqId}::fp:${payloadFingerprint}`;
}

/**
 * Detects explicit environment requested by customer message
 */
export function detectRequestedEnvironment(text: string): { environment: ExecutionEnvironment; target: ActionTarget; isAmbiguous: boolean; isCancellation: boolean } {
  const t = text.toLowerCase().trim();

  // Check for cancellation / "don't do anything" / "stop"
  if (
    /(?:don't|do not|dont)\s+(?:submit|register|send|save|do anything|proceed|create)/i.test(t) ||
    /^(?:cancel|stop|nevermind|never mind|abort|actually don't|don't do anything|do not do anything)\b/i.test(t) ||
    t === "don't do anything" ||
    t === 'do not do anything' ||
    t === "actually don't submit it" ||
    t === "actually don't submit"
  ) {
    return {
      environment: 'unknown',
      target: 'unknown',
      isAmbiguous: false,
      isCancellation: true,
    };
  }

  // Check for external unsupported integrations (ONLY for explicit action/submission requests, not capability questions)
  const isActionRequest = /(?:push|export|send|register|sync|save|submit|log|create|record|store)\b/i.test(t);
  const isQuestionOrInquiry = /^(?:does|do|can|will|what|how|is|are|tell me)\b/i.test(t) || /\?$/.test(t) || /\b(?:integrate|integrations|support|connect)\b/i.test(t);

  if (isActionRequest && !isQuestionOrInquiry) {
    if (/salesforce/i.test(t)) {
      return { environment: 'production', target: 'salesforce', isAmbiguous: false, isCancellation: false };
    }
    if (/hubspot/i.test(t)) {
      return { environment: 'production', target: 'hubspot', isAmbiguous: false, isCancellation: false };
    }
    if (/external crm|zoho|pipedrive/i.test(t)) {
      return { environment: 'production', target: 'external', isAmbiguous: false, isCancellation: false };
    }
  }

  // Check for explicit simulation / demo
  const isSimulation =
    /\b(?:in (?:the )?simulator|simulator|simulate|demo|test|preview|sandbox|fake)\b/i.test(t);

  // Check for explicit production / live
  const isProduction =
    /\b(?:in (?:the )?(?:real|live|actual|production) (?:system|crm|database)|real lead|production|live crm|actual crm)\b/i.test(t);

  if (isSimulation && !isProduction) {
    return { environment: 'simulation', target: 'simulator', isAmbiguous: false, isCancellation: false };
  }

  if (isProduction && !isSimulation) {
    return { environment: 'production', target: 'crm', isAmbiguous: false, isCancellation: false };
  }

  // General inquiry registration ("register this", "submit inquiry") without explicit environment
  const isGeneralRegister =
    /(?:register|submit|record|save|log|create|send)\s+(?:this|my|the|an)?\s*(?:inquiry|lead|request|details)\b/i.test(t) ||
    /^(?:register|submit|send)\s+(?:it|this)\b/i.test(t);

  if (isGeneralRegister) {
    // If user explicitly stated "in the simulator" or "in simulator", it's simulation.
    // Otherwise, if completely generic ("Register this inquiry"), it is ambiguous between simulation and live production.
    return { environment: 'unknown', target: 'unknown', isAmbiguous: true, isCancellation: false };
  }

  return { environment: 'unknown', target: 'unknown', isAmbiguous: false, isCancellation: false };
}

/**
 * Checks if an action was already executed (Idempotency Guard)
 */
export function checkIdempotency(key: string): ActionResult | null {
  const existing = idempotencyStore.get(key);
  if (!existing) return null;

  // Clean up if expired (1 hour TTL)
  if (Date.now() - existing.timestamp > 3600000) {
    idempotencyStore.delete(key);
    return null;
  }

  return existing.result;
}

/**
 * Records a successful action result in the idempotency store
 */
export function recordIdempotency(key: string, result: ActionResult) {
  if (idempotencyStore.size >= MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = idempotencyStore.keys().next().value;
    if (oldestKey) idempotencyStore.delete(oldestKey);
  }
  idempotencyStore.set(key, {
    result,
    timestamp: Date.now(),
  });
}

/**
 * Validates whether an action is safe and authorized to execute
 */
export function validateActionSafety(req: ActionRequest): { allowed: boolean; reason?: string; responseMessage?: string } {
  // 1. Check unsupported targets
  if (req.target === 'salesforce' || req.target === 'hubspot' || req.target === 'external') {
    const targetName = req.target === 'salesforce' ? 'Salesforce' : req.target === 'hubspot' ? 'HubSpot' : 'your external CRM';
    return {
      allowed: false,
      reason: 'UNSUPPORTED_INTEGRATION',
      responseMessage: `I don't currently have access to ${targetName} in this setup, so I haven't submitted anything there.`,
    };
  }

  // 2. Check ambiguous environment
  if (req.environment === 'unknown' || req.target === 'unknown') {
    return {
      allowed: false,
      reason: 'AMBIGUOUS_ENVIRONMENT',
      responseMessage: 'Sure — should I create this as a real lead or simulate the submission in the preview?',
    };
  }

  // 3. Validation of required payload
  if (req.actionType === 'create_inquiry') {
    const p = req.payload;
    if (!p.product_or_service || p.product_or_service === 'Unknown') {
      return {
        allowed: false,
        reason: 'MISSING_PRODUCT',
        responseMessage: 'What product or service are you interested in so I can prepare the inquiry?',
      };
    }
  }

  return { allowed: true };
}
