/**
 * PROJECT ALPHA — LEAD INTELLIGENCE & CONFIGURABLE SCORING ENGINE
 * 
 * Provides structured lead extraction, adaptive qualification, objection classification,
 * product recommendation intelligence, and transparent multi-dimensional lead scoring (0-100).
 */

import { StructuredLeadProfile, QualificationStatus, LeadScore } from '../types.ts';

export interface LeadScoreDimension {
  dimension: 'Requirement Clarity' | 'Product Fit' | 'Expressed Purchase Intent' | 'Budget Fit' | 'Timeline Urgency' | 'Engagement Level';
  score: number;
  maxScore: number;
  explanation: string;
}

export interface ConfigurableLeadScoreResult {
  totalScore: number; // 0-100
  qualificationTier: 'HOT' | 'WARM' | 'COLD';
  dimensions: LeadScoreDimension[];
  summaryExplanation: string;
  recommendedSalesAction: string;
}

/**
 * Calculates a transparent, multi-dimensional lead score (0-100) with detailed explanations
 */
export function computeConfigurableLeadScore(
  profile?: Partial<StructuredLeadProfile>,
  messageHistoryLength: number = 1,
  userMessage: string = ''
): ConfigurableLeadScoreResult {
  const dimensions: LeadScoreDimension[] = [];
  const lowerMsg = userMessage.toLowerCase();

  // 1. Requirement Clarity (0-20)
  let clarityScore = 5;
  let clarityExp = 'General exploration; preliminary interest.';
  if (profile?.product_interest && profile.product_interest !== 'General Inquiry') {
    clarityScore += 8;
    clarityExp = `Specific interest identified: ${profile.product_interest}`;
  }
  if (profile?.requirements && profile.requirements.length > 10) {
    clarityScore += 7;
    clarityExp += ' + Detailed requirements provided.';
  }
  clarityScore = Math.min(20, clarityScore);
  dimensions.push({ dimension: 'Requirement Clarity', score: clarityScore, maxScore: 20, explanation: clarityExp });

  // 2. Product Fit (0-20)
  let fitScore = 10;
  let fitExp = 'Standard solution match.';
  if (profile?.company_name || profile?.company) {
    fitScore += 5;
    fitExp = `Business identified: ${profile.company_name || profile.company}`;
  }
  if (profile?.contact_info) {
    fitScore += 5;
    fitExp += ' + Direct contact details captured.';
  }
  dimensions.push({ dimension: 'Product Fit', score: fitScore, maxScore: 20, explanation: fitExp });

  // 3. Expressed Purchase Intent (0-25)
  let intentScore = 5;
  let intentExp = 'Initial conversation stage.';
  if (lowerMsg.includes('buy') || lowerMsg.includes('pricing') || lowerMsg.includes('quote') || lowerMsg.includes('deploy') || lowerMsg.includes('sign up') || lowerMsg.includes('demo') || lowerMsg.includes('cost')) {
    intentScore = 20;
    intentExp = 'High commercial intent signals detected in message.';
  } else if (lowerMsg.includes('how does') || lowerMsg.includes('features') || lowerMsg.includes('integrate')) {
    intentScore = 12;
    intentExp = 'Evaluation and feature verification intent.';
  }
  dimensions.push({ dimension: 'Expressed Purchase Intent', score: intentScore, maxScore: 25, explanation: intentExp });

  // 4. Budget Fit (0-15)
  let budgetScore = 5;
  let budgetExp = 'Budget not explicitly specified.';
  if (profile?.budget) {
    budgetScore = 15;
    budgetExp = `Budget range provided: ${profile.budget}`;
  }
  dimensions.push({ dimension: 'Budget Fit', score: budgetScore, maxScore: 15, explanation: budgetExp });

  // 5. Timeline Urgency (0-10)
  let timelineScore = 3;
  let timelineExp = 'Standard rollout timeline.';
  if (profile?.timeline) {
    timelineScore = 10;
    timelineExp = `Target timeline provided: ${profile.timeline}`;
  } else if (lowerMsg.includes('asap') || lowerMsg.includes('today') || lowerMsg.includes('this week') || lowerMsg.includes('immediate')) {
    timelineScore = 9;
    timelineExp = 'Immediate deployment urgency expressed.';
  }
  dimensions.push({ dimension: 'Timeline Urgency', score: timelineScore, maxScore: 10, explanation: timelineExp });

  // 6. Engagement Level (0-10)
  let engagementScore = Math.min(10, Math.max(2, messageHistoryLength * 2));
  let engagementExp = `${messageHistoryLength} conversation turns recorded.`;
  dimensions.push({ dimension: 'Engagement Level', score: engagementScore, maxScore: 10, explanation: engagementExp });

  // Sum total score
  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);

  let qualificationTier: 'HOT' | 'WARM' | 'COLD' = 'COLD';
  let recommendedSalesAction = 'Continue conversational requirements discovery.';

  if (totalScore >= 70) {
    qualificationTier = 'HOT';
    recommendedSalesAction = 'High commercial value! Stage proposal draft and notify executive sales closer for 1-click takeover.';
  } else if (totalScore >= 40) {
    qualificationTier = 'WARM';
    recommendedSalesAction = 'Qualified lead. Answer outstanding questions and capture missing contact details.';
  }

  const summaryExplanation = `Lead score ${totalScore}/100 (${qualificationTier} TIER). ${intentExp}`;

  return {
    totalScore,
    qualificationTier,
    dimensions,
    summaryExplanation,
    recommendedSalesAction,
  };
}

/**
 * Sanitizes and extracts structured lead fields from conversation without misclassifying non-name strings
 */
export function extractStructuredLeadFromMessage(
  message: string,
  existingProfile?: StructuredLeadProfile
): Partial<StructuredLeadProfile> {
  const extracted: Partial<StructuredLeadProfile> = {};

  // Email extraction
  const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    extracted.contact_info = emailMatch[0].toLowerCase();
  }

  // Phone extraction (10+ digits or international format)
  const phoneMatch = message.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch && !message.toLowerCase().includes('http')) {
    extracted.contact_info = phoneMatch[0];
  }

  // Name extraction (safeguard against non-name inputs like "web development" or sentence inputs)
  const namePattern = /(?:my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const nameMatch = message.match(namePattern);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    const BANNED_NAME_WORDS = ['web', 'website', 'development', 'looking', 'buying', 'interested', 'here', 'testing', 'agency', 'company'];
    if (!BANNED_NAME_WORDS.some(w => candidate.toLowerCase().includes(w))) {
      extracted.customer_name = candidate;
    }
  }

  // Business Name extraction
  const companyPattern = /(?:company|business|agency|store|brand|firm|team)\s+(?:is|called|named|at)\s+([A-Z0-9][a-zA-Z0-9\s&]+)/i;
  const compMatch = message.match(companyPattern);
  if (compMatch) {
    extracted.company_name = compMatch[1].trim().split('.')[0];
  }

  return extracted;
}
