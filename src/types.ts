export type LeadScore = 'HOT' | 'WARM' | 'COLD';

export type LeadStatus =
  | 'New'
  | 'Analyzing'
  | 'Needs Approval'
  | 'Human Review'
  | 'Waiting for Customer'
  | 'Follow-up Due'
  | 'Qualified'
  | 'Won'
  | 'Lost'
  | 'Rejected';

export type LeadSource = 'Email' | 'WhatsApp' | 'Website' | 'Phone' | 'Other';

export type BusinessModelType =
  | 'goods'
  | 'hybrid'
  | 'b2b_products'
  | 'b2c_products'
  | 'saas'
  | 'services'
  | 'agency'
  | 'consulting'
  | 'real_estate'
  | 'solar'
  | 'education'
  | 'healthcare'
  | 'hospitality'
  | 'manufacturing'
  | 'wholesale'
  | 'ecommerce'
  | 'automotive'
  | 'financial'
  | 'custom'
  | 'other';

export type DeploymentType =
  | 'BUSINESS'
  | 'PORTFOLIO'
  | 'PERSONAL_BRAND'
  | 'CREATOR_FREELANCER'
  | 'STORE'
  | 'AGENCY'
  | 'COMMUNITY_ORGANIZATION'
  | 'OTHER'
  | 'business'
  | 'portfolio'
  | 'personal_brand'
  | 'creator_freelancer'
  | 'store'
  | 'agency'
  | 'community_organization'
  | 'other';

export type BusinessType = 'goods' | 'services' | 'hybrid' | BusinessModelType;

export type WidgetPresetType = 'minimal_circle' | 'modern_pill' | 'modern_panel';

export interface QualificationQuestionConfig {
  id: string;
  question: string;
  fieldKey: string;
  required: boolean;
  placeholder?: string;
  category?: string;
}

export interface VisitorIntentConfig {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  isMandatoryFallback?: boolean;
}

export interface SalesPlaybook {
  businessType: BusinessType;
  businessModelType?: BusinessModelType;
  businessTypeName?: string;
  intents: VisitorIntentConfig[];
  visitorIntents?: VisitorIntentConfig[];
  qualificationQuestions: QualificationQuestionConfig[];
  requiredLeadFields: Array<'name' | 'email' | 'phone' | 'company' | 'location' | 'preferred_contact'>;
  qualificationCriteria?: string;
  customHandoffRules?: string;
  defaultWidgetPreset?: WidgetPresetType;
  welcomeOptions?: string[];
}

export interface BusinessIdentity {
  businessName?: string;
  ownerName?: string;
  founderName?: string;
  ceoName?: string;
  directorName?: string;
  developerContact?: string;
  technicalContact?: string;
}

export interface OfferingItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  keyFeatures?: string[];
  specifications?: string;
  variants?: string;
  startingPrice?: string;
  priceRange?: string;
  pricingModel?: 'Fixed' | 'Starting from' | 'Per unit' | 'Per month' | 'Custom quote' | string;
  availability?: 'Available' | 'Limited' | 'Made to order' | 'Unavailable' | string;
  deliveryTime?: string;
  moq?: string;
  useCases?: string;
  idealCustomer?: string;
  status?: 'LIVE' | 'UPCOMING' | 'UNAVAILABLE' | 'CUSTOM';
  price?: string;
  priceOrRange?: string;
  importantDetails?: string;
  minOrder?: string;
}

export interface PricingV2 {
  model: 'fixed' | 'starting_from' | 'range' | 'per_unit' | 'usage_based' | 'custom_quote' | 'free' | 'unspecified';
  basePrice?: number; // Must be non-negative
  rangeMin?: number;
  rangeMax?: number;
  currency?: string; // Explicit ISO 4217, required if basePrice > 0
  billingCycle?: 'one_time' | 'monthly' | 'yearly' | 'none' | 'quarterly' | 'custom';
  unit?: string; // e.g. "student", "user", "seat", "item", "hour", "sqft"
  setupFee?: number;
  taxesIncluded?: boolean;
  minOrderQuantity?: number | string;
  validUntil?: string;
  conditions?: string;
  quoteRules?: string;
  metadata: {
    provenance: 'user-entered' | 'inferred-system' | 'migrated-legacy';
    lastConfirmedAt: string;
    status: 'verified' | 'ambiguous' | 'missing';
  };
}

export interface OfferingItemV2 {
  id: string;
  name: string;
  description: string;
  category?: string;
  keyFeatures?: string[];
  specifications?: string;
  variants?: string[] | string;
  pricing: PricingV2;
  legacyPricingString?: string;
  availability?: 'Available' | 'Limited' | 'Made to order' | 'Unavailable' | string;
  deliveryTime?: string;
  moq?: string;
  useCases?: string;
  idealCustomer?: string;
  compatibility?: string;
  limitations?: string;
  applicableAudiences?: string[];
  productFaqs?: Array<{ question: string; answer: string }>;
  bundleOfferings?: string[];
  upgrades?: string[];
  status?: 'LIVE' | 'UPCOMING' | 'UNAVAILABLE' | 'CUSTOM';
}

export interface CompanyBrainCustomKnowledge {
  customFields?: Array<{ key: string; label: string; value: string; category?: string; isPublic: boolean }>;
  customEntities?: Array<{ name: string; type: string; description: string; attributes: Record<string, any> }>;
  documents?: Array<{
    id: string;
    title: string;
    content: string;
    sourceUrl?: string;
    lastVerifiedAt?: string;
    verificationStatus: 'verified' | 'unverified' | 'conflicting' | 'stale';
  }>;
}

export interface CompanyBrainWorkflows {
  executableActions: string[]; // actions Alpha can execute autonomously (e.g. 'stage_lead_inquiry', 'register_contact', 'flag_human_handoff')
  recommendOnlyActions: string[]; // actions Alpha can only recommend or draft for human approval (e.g. 'direct_checkout', 'charge_card', 'contract_signing')
}

export interface CompanyBrainDiagnostics {
  readinessScore: number; // 0 - 100
  criticalIssues: Array<{ id: string; category: string; field: string; message: string; fixAction: string }>;
  warnings: Array<{ id: string; category: string; field: string; message: string; fixAction: string }>;
  recommendations: Array<{ id: string; message: string }>;
  lastEvaluatedAt: string;
}

export interface FactConflict {
  id: string;
  fieldPath: string;
  legacyValue: any;
  structuredValue: any;
  provenance: 'migrated-legacy' | 'inferred-system';
  detectedAt: string;
  status: 'pending_review' | 'resolved_structured' | 'resolved_legacy';
}


export interface BusinessDifferentiators {
  whyChooseUs?: string;
  productDifferences?: string;
  strongestAdvantages?: string[]; // price, quality, speed, expertise, warranty, customization, local support, certifications, technology, service
  competitorNotes?: string;
}

export interface CommercialInfo {
  pricingDetails?: string;
  pricingStructure?: string;
  minimumOrderQuantity?: string;
  packagesOrPlans?: string;
  discountsOrPromos?: string;
  paymentMethods?: string[];
  paymentTerms?: string;
  taxesNotes?: string;
  shippingCharges?: string;
  installationCharges?: string;
  quoteValidity?: string;
  financingOptions?: string;
}

export interface DeliveryServiceInfo {
  serviceAreas?: string;
  deliveryAreas?: string;
  deliveryTimes?: string;
  standardTimelines?: string;
  installationAvailability?: string;
  appointmentProcess?: string;
  returnsAndRefunds?: string;
  warranty?: string;
  afterSalesSupport?: string;
}

export interface SalesQualificationRules {
  goodLeadCriteria?: string;
  salesInfoNeededBeforeQuote?: string;
  requiredFields?: string[]; // location, product, quantity, budget, timeline, property type, project size, company size, use case, technical requirements
  highPriorityTriggers?: string;
  deprioritizeTriggers?: string;
}

export interface SalesQuestionsConfig {
  normalSalesQuestions?: string[];
  neverAskQuestions?: string[];
  mandatoryInfoBeforeContact?: string[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface PoliciesAndRules {
  areasNotServed?: string;
  productsNotSold?: string;
  customersNotServed?: string;
  prohibitedClaims?: string;
  pricingRestrictions?: string;
  discountRestrictions?: string;
  humanApprovalTriggers?: string;
  humanHandoffSituations?: string;
  customPolicies?: string;
}

export interface BrandVoiceConfig {
  toneStyle?: 'Professional' | 'Friendly' | 'Concise' | 'Consultative' | 'Technical' | 'Casual' | string;
  customDirectives?: string[]; // "Be concise", "Always explain warranty", "Never pressure customers", etc.
}

export interface HumanHandoffConfig {
  handoffTriggers?: string[]; // customer requests person, high-value lead, complex technical, complaint, negotiation, custom quote, uncertain answer
  contactMethod?: string;
  businessEmail?: string;
  notificationEmail?: string;
  businessPhone?: string;
  preferredMethod?: 'email' | 'phone' | 'calendar' | 'dashboard' | string;
}

export interface ContactInformation {
  email?: string;
  phone?: string;
  website?: string;
  bookingUrl?: string;
  socialLinks?: Record<string, string>;
}

export interface CompanyProfile {
  // Universal fields
  name: string;
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

  // Existing fields preserved for 100% backward-compatibility
  industry: string;
  businessType?: BusinessType;
  businessModelType?: BusinessModelType;
  products: string;
  locations: string;
  minOrder?: string;
  pricing?: string;
  tone: string;
  businessRules: string;
  description?: string;
  email?: string;
  primaryGoal?: string;
  website?: string;
  targetCustomers?: string;
  serviceArea?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessIdentity?: BusinessIdentity;
  approval_mode?: 'automatic_for_simple' | 'human_approval_required';
  unknownQuestionBehavior?: 'human_approval' | 'best_effort' | 'available_data';
  offerings?: OfferingItem[];
  differentiators?: BusinessDifferentiators;
  commercialInfo?: CommercialInfo;
  deliveryService?: DeliveryServiceInfo;
  qualificationRules?: SalesQualificationRules;
  salesQuestions?: SalesQuestionsConfig;
  faqs?: FAQItem[];
  policies?: PoliciesAndRules;
  brandVoice?: BrandVoiceConfig;
  humanHandoff?: HumanHandoffConfig;
  faqData?: string;
  additionalKnowledge?: string;
  salesPlaybook?: SalesPlaybook;
  widgetPreset?: WidgetPresetType;
  country?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
  widget_id?: string;
  companyBrain?: StructuredCompanyBrain;
}

export interface CompanyBrainCore {
  businessName: string;
  website?: string;
  description: string;
  customers: string[];
  businessModel: string[];
  salesChannels: string[];
  siteType?: 'company_website' | 'service_business' | 'online_store' | 'portfolio' | 'agency' | 'creator' | 'other';
  marketsServed?: string[];
  primaryLanguage?: string;
  supportedLanguages?: string[];
  contactEmail?: string;
  founderOrLeadership?: string;
}

export interface CompanyBrainIndustry {
  industryId: string;
  industryName: string;
  businessTypeId: string;
  businessTypeName: string;
  customIndustry?: string;
  customBusinessType?: string;
  data: Record<string, any>;
}

export interface CompanyBrainICP {
  targetCustomerType?: 'b2b' | 'b2c' | 'both';
  targetIndustries?: string[];
  targetRoles?: string[];
  companySize?: string[];
  triggerSituations?: string[];
  triggerProblems?: string[];
  bestFitCriteria?: string;
  badFitCriteria?: string;
  geographicMarkets?: string[];
}

export interface CompanyBrainQualification {
  definitionOfQualifiedLead?: string;
  requiredFields?: string[];
  optionalFields?: string[];
  budgetExpectation?: string;
  timelineUrgency?: string[];
  purchaseReadinessSignals?: string[];
}

export interface CompanyBrainSalesProcess {
  desiredOutcome?: 'consultation' | 'quote_request' | 'inquiry' | 'product_demo' | 'appointment' | 'order' | 'custom';
  requiredInfoBeforeHandoff?: string[];
  handoffTeamOrPerson?: string;
  requiresHumanApproval?: boolean;
  commitmentsNeverToMake?: string[];
}

export interface CompanyBrainObjections {
  commonObjections?: Array<{ objection: string; verifiedAnswer: string }>;
  genuineDifferentiators?: string[];
  knownLimitations?: string[];
}

export interface CompanyBrainEscalation {
  escalationTriggers?: string[];
  humanSupportHours?: string;
  configuredChannels?: string[];
  recipientEmail?: string;
  fallbackMessageIfFailed?: string;
}

export interface CompanyBrainAnalytics {
  estimatedMonthlyInquiries?: string;
  mainLeadQualityBottleneck?: string;
  primarySuccessMetric?: string;
}

export interface CompanyBrainConditionalOperations {
  appointmentBookingMethod?: string;
  appointmentLeadTime?: string;
  subscriptionStructure?: string;
  subscriptionBillingPeriod?: string[];
  physicalLocationsHours?: string;
  serviceAreaCoverage?: string;
  productDeliveryOrShipping?: string;
  serviceConsultationModel?: string;
  enterpriseProcurementDetails?: string;
}

export interface CompanyBrainAlphaConfig {
  objectives: string[];
  priorities: string[];
  escalationRules: string[];
  forbiddenBehaviors: string[];
  tone: string;
  customInstructions?: string;
  pitchDiscipline?: 'respect_visitor_constraint' | 'always_neutral' | 'consultative';
  groundingStrictness?: 'strict_brain_only' | 'reasonable_inference';
}

export interface CompanyBrainPolicies {
  cancellationRules?: string;
  warrantyOrGuarantee?: string;
  confidentiality?: string;
  pricingPolicy?: string;
  customRules?: string;
  refundPolicy?: string;
  deliveryTerms?: string;
}

export interface StructuredCompanyBrain {
  version: 2;
  core: CompanyBrainCore;
  industry: CompanyBrainIndustry;
  additionalIndustries?: CompanyBrainIndustry[];
  catalog?: OfferingItem[];
  offeringsV2?: OfferingItemV2[];
  factConflicts?: FactConflict[];
  icp?: CompanyBrainICP;
  qualification?: CompanyBrainQualification;
  salesProcess?: CompanyBrainSalesProcess;
  operations?: CompanyBrainConditionalOperations;
  alpha: CompanyBrainAlphaConfig;
  policies?: CompanyBrainPolicies;
  objections?: CompanyBrainObjections;
  humanEscalation?: CompanyBrainEscalation;
  customKnowledge?: CompanyBrainCustomKnowledge;
  workflows?: CompanyBrainWorkflows;
  diagnostics?: CompanyBrainDiagnostics;
  analytics?: CompanyBrainAnalytics;
  lastBuiltAt?: string;
}

/**
 * Calculates Company Brain Completeness percentage and breakdown
 */
export function calculateCompanyBrainCompleteness(profile: Partial<CompanyProfile>): {
  percentage: number;
  completedSections: number;
  totalSections: number;
  breakdown: Array<{ section: string; complete: boolean; weight: number }>;
} {
  const effectiveName = profile.brandName || profile.name;
  const effectiveDesc = profile.shortDescription || profile.description || profile.whatYouDo;
  const effectiveAudience = profile.targetAudience || profile.targetCustomers || profile.serviceArea || profile.locations;
  const effectiveKnowledge = profile.keyInformation || profile.additionalKnowledge || profile.faqData || (profile.faqs && profile.faqs.length > 0);
  const effectiveTone = profile.aiTone || profile.tone || profile.brandVoice?.toneStyle;

  const sections = [
    {
      section: 'Identity & Brand',
      complete: Boolean(effectiveName && effectiveDesc),
      weight: 15,
    },
    {
      section: 'Audience & Coverage',
      complete: Boolean(effectiveAudience),
      weight: 10,
    },
    {
      section: 'Offerings / Projects / Catalog',
      complete: Boolean((profile.offerings && profile.offerings.length > 0) || (profile.products && profile.products.length > 10) || profile.whatYouDo),
      weight: 20,
    },
    {
      section: 'Differentiators & Goals',
      complete: Boolean(
        profile.mainGoals?.length ||
        profile.differentiators?.whyChooseUs ||
        (profile.differentiators?.strongestAdvantages && profile.differentiators.strongestAdvantages.length > 0)
      ),
      weight: 10,
    },
    {
      section: 'Pricing / Commercial / Inquiry Terms',
      complete: Boolean(
        profile.inquiryFields?.length ||
        profile.pricing ||
        profile.commercialInfo?.pricingDetails ||
        profile.commercialInfo?.paymentTerms
      ),
      weight: 10,
    },
    {
      section: 'Delivery & Policies',
      complete: Boolean(
        profile.deliveryService?.deliveryTimes ||
        profile.deliveryService?.warranty ||
        profile.policies?.areasNotServed ||
        profile.forbiddenClaims?.length ||
        profile.businessRules
      ),
      weight: 10,
    },
    {
      section: 'Sales / Lead Qualification Rules',
      complete: Boolean(
        profile.qualificationRules?.goodLeadCriteria ||
        profile.qualificationRules?.requiredFields?.length ||
        profile.salesPlaybook?.qualificationQuestions?.length ||
        profile.inquiryFields?.length
      ),
      weight: 10,
    },
    {
      section: 'Knowledge Base & FAQs',
      complete: Boolean(effectiveKnowledge),
      weight: 10,
    },
    {
      section: 'Contact & Human Reachability',
      complete: Boolean(
        profile.contactInformation?.email ||
        profile.contactInformation?.website ||
        profile.contactInformation?.bookingUrl ||
        profile.businessEmail ||
        profile.website ||
        profile.humanHandoff?.businessEmail
      ),
      weight: 10,
    },
    {
      section: 'AI Behavior & Voice',
      complete: Boolean(effectiveTone || profile.aiIdentity || profile.aiIntroduction),
      weight: 5,
    },
  ];

  const earned = sections.reduce((acc, s) => acc + (s.complete ? s.weight : 0), 0);
  const completedCount = sections.filter((s) => s.complete).length;

  return {
    percentage: Math.min(100, Math.max(10, earned)),
    completedSections: completedCount,
    totalSections: sections.length,
    breakdown: sections,
  };
}

export type ExecutionEnvironment = 'simulation' | 'production' | 'unknown';
export type ActionTarget = 'simulator' | 'dashboard' | 'crm' | 'salesforce' | 'hubspot' | 'external' | 'preview_simulator' | 'crm_leads' | 'unknown';
export type QualificationStatus =
  | 'unknown'
  | 'potentially qualified'
  | 'qualified'
  | 'unqualified'
  | 'needs human review'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'QUALIFIED'
  | 'REFUSED_CONTACT';

export interface CustomerFactItem {
  label: string;
  value: string;
  verified: boolean;
}

export interface StructuredLeadProfile {
  // Canonical fields specified in prompt:
  name?: string | null;
  company?: string | null;
  location?: string | null;
  industry?: string | null;
  need?: string | null;
  budget?: string | null;
  timeline?: string | null;
  product_interest?: string | null;
  qualification_status?: QualificationStatus;
  environment?: ExecutionEnvironment;
  
  // Custom playbook answers & sales domain facts:
  custom_qualification_answers?: Record<string, string>;
  lead_volume?: string | null;
  team_size?: string | null;
  property_type?: string | null;
  monthly_bill?: string | null;
  current_solution?: string | null;
  decision_maker?: string | null;
  
  // Backward-compatible aliases:
  customer_name?: string;
  company_name?: string;
  business_type?: BusinessType | string;
  product_or_service?: string;
  quantity_or_scope?: string;
  deadline?: string;
  contact_info?: string;
  requirements?: string[];
  notes?: string;
  inquiry_stage?: 'IDLE' | 'INQUIRY_REQUESTED' | 'COLLECTING_DETAILS' | 'READY_TO_SUBMIT' | 'CONFIRMED' | 'CANCELLED';
  current_workflow?:
    | 'GET_QUOTE'
    | 'BOOK_CALL'
    | 'TALK_TO_SALES'
    | 'DEPLOY'
    | 'PRICING'
    | 'EXPLORE_PRODUCTS'
    | 'PRODUCT_QUESTION'
    | 'HUMAN_HANDOFF'
    | 'GENERAL_INFORMATION'
    | 'COLLABORATE'
    | 'CONTACT'
    | 'IDLE';
  collected_fields?: Record<string, string | null>;
  last_asked_field?: 'product' | 'quantity' | 'location' | 'name' | 'contact' | 'scope' | 'website' | 'none' | string;
  missing_required_fields?: string[];
  
  // Contradiction & confirmation tracking:
  pending_confirmation?: boolean | {
    field: string;
    previousValue: string;
    candidateValue: string;
    question: string;
  } | null;
  
  // Action safety & idempotency memory:
  last_action_requested?: string | null;
  last_action_target?: ActionTarget | null;
  last_action_env?: ExecutionEnvironment | null;
  completed_action_keys?: string[];

  // Conversation memory and continuity engine:
  customer_problem?: string | null;
  customer_concern?: string | null;
  customer_requirement?: string | null;
  customer_intent?: string | null;
  engine_state?: string | null;
}

export interface PersistentConversationState {
  conversationId: string;
  companyId: string;
  userId?: string;
  visitorId?: string;
  currentIntent: string;
  currentWorkflow:
    | 'GET_QUOTE'
    | 'BOOK_CALL'
    | 'TALK_TO_SALES'
    | 'DEPLOY'
    | 'PRICING'
    | 'EXPLORE_PRODUCTS'
    | 'PRODUCT_QUESTION'
    | 'HUMAN_HANDOFF'
    | 'GENERAL_INFORMATION'
    | 'COLLABORATE'
    | 'CONTACT'
    | 'IDLE';
  inquiryStage: 'IDLE' | 'INQUIRY_REQUESTED' | 'COLLECTING_DETAILS' | 'READY_TO_SUBMIT' | 'CONFIRMED' | 'CANCELLED';
  qualificationStatus: QualificationStatus;
  leadPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  collectedFields: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    business_type?: string | null;
    location?: string | null;
    product?: string | null;
    quantity?: string | null;
    lead_volume?: string | null;
    budget?: string | null;
    timeline?: string | null;
    requirements?: string | null;
    use_case?: string | null;
    website?: string | null;
    [key: string]: string | null | undefined;
  };
  missingFields: string[];
  nextRequiredField: 'product' | 'quantity' | 'name' | 'contact' | 'location' | 'website' | 'none';
  lastAskedField?: string;
  conversationSummary?: string;
  lastRelevantContext?: string;
  messageCount: number;
  structuredProfile: StructuredLeadProfile;
  completedActionKeys?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseDefinition {
  id: number;
  category: 'Basic' | 'Memory' | 'Qualification' | 'Actions' | 'Safety' | 'Conversation' | 'Industry';
  name: string;
  description: string;
  prompt: string;
  history?: Array<{ sender: 'customer' | 'assistant'; text: string }>;
  expectedBehavior: string;
  evaluationCriteria: {
    forbiddenPhrases?: string[];
    requiredPhrases?: string[];
    shouldNotHallucinate?: boolean;
    shouldBeSingleRecord?: boolean;
    shouldAskEnvironment?: boolean;
    shouldRejectUnsupported?: boolean;
    shouldAnswerFirst?: boolean;
    shouldPreserveMemory?: boolean;
    shouldHandleOffTopicSearch?: boolean;
  };
}

export interface TestRunResult {
  testId: number;
  name: string;
  category: string;
  prompt: string;
  reply: string;
  passed: boolean;
  reason: string;
  environment: string;
  detectedIntent: string;
  leadRegistered: boolean;
  executionTimeMs: number;
}

export interface InquiryLead {
  id: string;
  customer_name: string;
  companyName: string; // alias for backward-compatibility
  company_name?: string;
  contactName?: string;
  contact_info?: string;
  email?: string;
  source: LeadSource;
  channel?: LeadSource; // alias
  lead_temperature: LeadScore;
  lead_score: LeadScore; // alias
  lead_reason?: string;
  temperature_reason?: string; // alias
  status: LeadStatus;
  customer_intent: string;
  original_message: string;
  original_inquiry_text?: string;
  raw_inquiry: string; // alias
  product_or_service: string;
  quantity: string;
  location: string;
  deadline?: string;
  budget?: string;
  timeline?: string;
  requirements: string[] | string;
  customer_facts?: CustomerFactItem[];
  missing_information: string[] | string;
  recommended_action: string;
  recommended_next_action: string; // alias
  draft_reply: string;
  suggested_reply: string; // alias
  sales_summary: string;
  created_at: string;
  last_action_at: string;
  rejection_reason?: string;
  structured_profile?: StructuredLeadProfile;
  inquiry_registered?: boolean;
  recipient_email?: string;
  customer_email?: string;
  email_state?: 'DRAFT' | 'APPROVED' | 'SENDING' | 'SENT' | 'FAILED';
  email_error?: string;
  email_dispatched?: boolean;
  email_status?: 'accepted' | 'rejected' | 'failed' | string;
  email_dispatched_at?: string;
  email_recipient?: string;
  conversation_id?: string;
  intent_score?: number;
  is_hot_lead?: boolean;
  detected_objection?: ObjectionType | string;
  next_best_action?: NextBestActionType | string;
  industry?: string;
  business_context?: string;
  messages?: any[];
  message_history?: any[];
  email_dispatch?: any;
}

export interface ActivityLog {
  id: string;
  leadId?: string;
  employeeName: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'analysis' | 'approval_sent' | 'status_change' | 'reply_edited' | 'task_completed' | 'rejected' | 'follow_up_created';
}

export interface SalesTask {
  id: string;
  leadId: string;
  companyName: string;
  title: string;
  leadScore: LeadScore;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'completed';
  actionType: 'approve_reply' | 'prepare_quote' | 'follow_up' | 'review_specs';
}

export type AppView =
  | 'landing'
  | 'alpha'
  | 'blog'
  | 'workspace'
  | 'employee_sales_manager'
  | 'employee_sales_coordinator'
  | 'admin'
  | 'experience'
  | 'privacy'
  | 'cookies'
  | 'terms'
  | 'about'
  | 'contact';

export type WorkspaceTab =
  | 'workspace_home'
  | 'employees'
  | 'conversations'
  | 'work_queue'
  | 'company_brain'
  | 'widget_studio'
  | 'embed'
  | 'activity'
  | 'settings';

export interface ChatMessage {
  id: string;
  message_id?: string;
  sender: 'customer' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  options?: string[];
  sentiment?: 'positive' | 'neutral' | 'frustrated' | 'complaining';
  detected_intent?: string;
  escalated_to_care?: boolean;
  grounded?: boolean;
  grounding_source?: string;
  reasoning_mode?: 'QUICK_THINK' | 'STANDARD_THINK' | 'DEEP_THINK' | string;
  analysis_summary?: {
    keyFindings?: string[];
    assumptions?: string[];
    calculations?: string[];
    recommendedNextStep?: string;
  };
  metadata?: {
    client_message_id?: string;
    reply_to_client_message_id?: string;
    inquiry_registered?: boolean;
    db_confirmed?: boolean;
    delivered?: boolean;
    read?: boolean;
    lead_id?: string;
    lead_score?: LeadScore;
    detected_intent?: string;
    sentiment?: 'positive' | 'neutral' | 'frustrated' | 'complaining';
    escalated_to_care?: boolean;
    options?: string[];
    grounded?: boolean;
    grounding_source?: string;
    reasoning_mode?: string;
    analysis_summary?: any;
    [key: string]: any;
  };
}

export type ObjectionType =
  | 'price'
  | 'trust'
  | 'timing'
  | 'competition'
  | 'human_vs_ai'
  | 'fit'
  | 'implementation'
  | 'none';

export type NextBestActionType =
  | 'continue_discovery'
  | 'provide_demo'
  | 'send_quote'
  | 'schedule_call'
  | 'handoff_to_human'
  | 'nurture'
  | 'disqualify';

export interface AILeadBrief {
  business_context: string;
  pain_points: string[];
  needs: string[];
  objections: string[];
  buying_signals: string[];
  qualification_summary: string;
  recommended_next_step: string;
  suggested_follow_up?: string;
  intent_score: number; // 0 - 100
  is_hot_lead: boolean;
  detected_objection?: ObjectionType;
  next_best_action: NextBestActionType;
  grounded_in_brain: boolean;
}

export type EntityClassificationStatus = 'Conversation' | 'Lead' | 'Inquiry';

export interface EmployeeOnboardingProfile {
  employeeId: string;
  role: string;
  customName: string;
  objective: string;
  onboardedAt: string;
  status: 'ACTIVE' | 'TRAINING';
}

export interface WebsiteLead {
  id: string;
  lead_id: string;
  conversation_id: string;
  visitor_id: string;
  user_id?: string;
  company_id?: string;
  customer_name: string;
  companyName?: string;
  source: LeadSource;
  channel?: LeadSource;
  intent: string;
  lead_intent: string;
  lead_score: LeadScore;
  lead_temperature: LeadScore;
  lead_reason?: string;
  status: 'In Progress' | 'Qualified' | 'Needs Approval' | 'Won' | 'Lost';
  qualification_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COLLECTING_DETAILS' | 'QUALIFIED' | 'DISQUALIFIED' | 'REFUSED_CONTACT';
  product_or_service?: string;
  quantity?: string;
  location?: string;
  timeline?: string;
  budget?: string;
  structured_profile?: StructuredLeadProfile;
  created_at: string;
  last_action_at: string;
  updated_at: string;
}

export interface WidgetConversation {
  id: string;
  conversation_id?: string;
  widget_id?: string;
  user_id?: string;
  visitor_id: string;
  customer_name?: string;
  messages: ChatMessage[];
  started_at?: string;
  last_message_at?: string;
  current_intent?: string;
  conversation_stage?: string;
  status?: EntityClassificationStatus;
  lead_id?: string | null;
  inquiry_id?: string | null;
  structured_profile?: StructuredLeadProfile | null;
  human_takeover?: boolean;
  human_takeover_by?: string;
  human_takeover_at?: string;
  human_takeover_active?: boolean;
  lead_score?: LeadScore;
  notes?: string;
  human_notes?: string;
  intent_score?: number; // 0 - 100
  is_hot_lead?: boolean;
  detected_objection?: ObjectionType;
  next_best_action?: NextBestActionType;
  lead_brief?: AILeadBrief;
  grounded_in_brain?: boolean;
  suggested_follow_up?: string;
  created_at: string;
  updated_at: string;
}

export type WidgetVisualMode = 'simple' | 'attractive_3d';
export type WidgetThemeMode = 'light' | 'dark' | 'system';
export type WidgetLauncherType = 'ai_spark' | 'chat_bubble' | 'custom_logo' | 'logo' | 'ai_workforce';
export type WidgetLauncherSize = 'small' | 'medium' | 'large';
export type WidgetLauncherShape = 'circle' | 'rounded_square' | 'squircle';
export type WidgetGradientType = 'none' | 'subtle' | 'custom';
export type WidgetShadowIntensity = 'none' | 'soft' | 'medium' | 'deep' | 'dramatic' | 'strong';
export type WidgetGlowIntensity = 'none' | 'subtle' | 'soft' | 'vibrant' | 'medium' | 'strong';
export type WidgetAnimationIntensity = 'none' | 'subtle' | 'playful' | 'expressive';
export type WidgetPosition = 'bottom-right' | 'bottom-left';

export interface WidgetStudioConfig {
  mode: WidgetVisualMode;
  themeMode?: WidgetThemeMode;
  launcherType: WidgetLauncherType;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor: string;
  textColor: string;
  aiMessageColor: string;
  aiMessageTextColor?: string;
  userMessageColor: string;
  userMessageTextColor?: string;
  gradientEnabled: boolean;
  gradientType: WidgetGradientType;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  launcherSize: WidgetLauncherSize;
  launcherShape: WidgetLauncherShape;
  borderRadius: number;
  shadowIntensity: WidgetShadowIntensity;
  glowIntensity: WidgetGlowIntensity;
  animationIntensity: WidgetAnimationIntensity;
  launcherPosition: WidgetPosition;
  position?: WidgetPosition;
}

export interface WidgetConfig {
  widget_id: string;
  user_id?: string;
  business_name: string;
  welcome_message: string;
  theme_color?: string;
  is_active: boolean;
  position?: WidgetPosition;
  preset?: WidgetPresetType;
  welcome_options?: string[];
  design_style?: WidgetVisualMode;
  deploymentType?: DeploymentType;
  updated_at?: string;

  // Widget Studio Visual Identity Properties
  mode?: WidgetVisualMode;
  themeMode?: WidgetThemeMode;
  launcherType?: WidgetLauncherType;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  aiMessageColor?: string;
  aiMessageTextColor?: string;
  userMessageColor?: string;
  userMessageTextColor?: string;
  gradientEnabled?: boolean;
  gradientType?: WidgetGradientType;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  launcherSize?: WidgetLauncherSize;
  launcherShape?: WidgetLauncherShape;
  borderRadius?: number;
  shadowIntensity?: WidgetShadowIntensity;
  glowIntensity?: WidgetGlowIntensity;
  animationIntensity?: WidgetAnimationIntensity;
  launcherPosition?: WidgetPosition;
  studioConfig?: WidgetStudioConfig;
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  typicalCustomer?: string;
  specifications?: string;
  minOrder?: string;
  status?: 'LIVE' | 'UPCOMING' | 'UNAVAILABLE' | 'CUSTOM';
}

export interface OnboardingDraft {
  companyName: string;
  website?: string;
  deploymentType?: DeploymentType;
  businessType: BusinessType;
  businessModelType?: BusinessModelType;
  description: string;
  offerings?: OfferingItem[];
  targetCustomers?: string;
  serviceArea?: string;
  customServiceArea?: string;
  location?: string;
  businessEmail?: string;
  businessPhone?: string;
  primaryContactName?: string;
  pricingModel?: string;
  quotationRequired?: boolean;
  minOrder?: string;
  pricing?: string;
  differentiators?: BusinessDifferentiators;
  commercialInfo?: CommercialInfo;
  deliveryService?: DeliveryServiceInfo;
  qualificationRules?: SalesQualificationRules;
  salesQuestions?: SalesQuestionsConfig;
  faqs?: FAQItem[];
  policies?: PoliciesAndRules;
  brandVoice?: BrandVoiceConfig;
  humanHandoff?: HumanHandoffConfig;
  approval_mode?: 'automatic_for_simple' | 'human_approval_required';
  unknownQuestionBehavior?: 'human_approval' | 'available_data';
  primaryGoal?: string;
  tone?: string;
  salesPlaybook?: SalesPlaybook;
  widgetPreset?: WidgetPresetType;
  step: number;
}

export interface UserWorkspaceMetadata {
  email: string;
  onboarding_completed: boolean;
  onboarding_step?: number;
  onboarding_draft?: Partial<OnboardingDraft>;
  createdAt?: string;
  updatedAt?: string;
}

export type SalesManagerTab =
  | 'overview'
  | 'inbox'
  | 'leads'
  | 'website_chat'
  | 'tasks'
  | 'activity'
  | 'settings';

export type SalesCoordinatorTab = SalesManagerTab;

// ==========================================
// AI MARKETING CO-FOUNDER (INTERNAL) TYPES
// ==========================================

export type MarketingTab =
  | 'command_center'
  | 'marketing_brain'
  | 'research'
  | 'content_studio'
  | 'content_calendar'
  | 'publishing'
  | 'analytics';

export type ContentPlatform = 'instagram' | 'youtube' | 'linkedin' | 'x';

export type ContentFormat =
  | 'carousel'
  | 'image_post'
  | 'short_video'
  | 'youtube_video'
  | 'youtube_short'
  | 'text_post'
  | 'educational_post'
  | 'product_post'
  | 'founder_post'
  | 'announcement';

export type ContentItemStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface MarketingBrainBrand {
  company: string;
  product: string;
  currentFlagshipEmployee: string;
  futureEmployees: string[];
  brandPositioning: string;
  brandVoice: string;
  visualIdentity: string;
  approvedTerminology: string[];
}

export interface MarketingBrainAudience {
  icps: string[];
  industries: string[];
  companySizes: string[];
  buyerRoles: string[];
  painPoints: string[];
  desiredOutcomes: string[];
  objections: string[];
  buyingTriggers: string[];
}

export interface MarketingBrainStrategy {
  contentPillars: string[];
  recurringThemes: string[];
  campaignGoals: string[];
  preferredPlatforms: ContentPlatform[];
  postingFrequency: string;
  ctaPreferences: string[];
  contentFormats: ContentFormat[];
}

export interface MarketingBrainRules {
  approvedClaims: string[];
  prohibitedClaims: string[];
  phrasesToAvoid: string[];
  claimsRequiringVerification: string[];
  toneRules: string[];
  visualRules: string[];
}

export interface MarketingBrainOffer {
  currentOffers: string[];
  pricing: string;
  promotions: string;
  foundingCohort: string;
  productCapabilities: string[];
}

export interface MarketingBrainData {
  brand: MarketingBrainBrand;
  targetAudience: MarketingBrainAudience;
  contentStrategy: MarketingBrainStrategy;
  brandRules: MarketingBrainRules;
  offerInfo: MarketingBrainOffer;
  updatedAt: string;
  updatedBy: string;
}

export interface MarketingResearchItem {
  id: string;
  topic: string;
  whyItMatters: string;
  targetAudience: string;
  contentOpportunity: string;
  suggestedPlatform: ContentPlatform | 'multi-platform';
  suggestedFormat: ContentFormat;
  source: string;
  citations?: string[];
  status: 'NEW' | 'EXPLORED' | 'CONVERTED' | 'ARCHIVED';
  createdAt: string;
  createdBy: string;
}

export interface MarketingContentItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  format: ContentFormat;
  status: ContentItemStatus;
  hook: string;
  headline: string;
  bodyScript: string;
  cta: string;
  caption: string;
  hashtags: string[];
  visualDirection: string;
  creativePrompt: string;
  description?: string;
  tags?: string[];
  scheduledFor?: string;
  publishedAt?: string;
  publishResult?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  errorMessage?: string;
  reviewNotes?: string;
  createdBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingConnection {
  id: string;
  platform: ContentPlatform;
  status: 'connected' | 'not_connected' | 'configuration_required' | 'error';
  accountName?: string;
  channelId?: string;
  channelUrl?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  errorReason?: string;
}

export interface PublishingSettings {
  mode: 'approval_required' | 'autonomous';
  allowedPlatforms: ContentPlatform[];
  allowedContentTypes: string[];
  maxPostsPerDay: number;
  allowedPostingHoursStart: string;
  allowedPostingHoursEnd: string;
  requireApprovalForAnnouncements: boolean;
  requireApprovalForPricing: boolean;
  requireApprovalForClaims: boolean;
  requireApprovalForPartnerships: boolean;
  requireApprovalForControversial: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MarketingAnalyticsMetric {
  id: string;
  platform: ContentPlatform;
  postId: string;
  postTitle: string;
  format: string;
  views: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  ctr: number;
  publishedAt: string;
  source: string;
}

export interface MarketingLearningInsight {
  id: string;
  title: string;
  observation: string;
  confidence: 'High' | 'Medium' | 'Emerging';
  sampleSize: number;
  suggestedAction: string;
}

