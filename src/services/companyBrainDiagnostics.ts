import { StructuredCompanyBrain, CompanyBrainDiagnostics, CompanyProfile, OfferingItemV2 } from '../types.ts';

/**
 * Company Brain Readiness & Diagnostics Engine
 * Evaluates tenant business knowledge for completeness, pricing ambiguity,
 * fact contradictions, missing critical policies, and actionable improvements.
 */
export function evaluateCompanyBrainDiagnostics(
  brain: StructuredCompanyBrain,
  profile?: Partial<CompanyProfile>
): CompanyBrainDiagnostics {
  const criticalIssues: CompanyBrainDiagnostics['criticalIssues'] = [];
  const warnings: CompanyBrainDiagnostics['warnings'] = [];
  const recommendations: CompanyBrainDiagnostics['recommendations'] = [];

  let scorePoints = 0;
  const maxPoints = 100;

  // 1. Identity & Business Core (25 points max)
  const bName = brain.core?.businessName?.trim();
  const bDesc = brain.core?.description?.trim();
  const bCustomers = brain.core?.customers || [];
  const bModels = brain.core?.businessModel || [];

  if (!bName) {
    criticalIssues.push({
      id: 'crit_missing_name',
      category: 'Identity',
      field: 'core.businessName',
      message: 'Business name is missing. Alpha cannot identify your organization to visitors.',
      fixAction: 'Enter your official business name in the Business Identity section.',
    });
  } else {
    scorePoints += 10;
  }

  if (!bDesc || bDesc.length < 20) {
    criticalIssues.push({
      id: 'crit_thin_description',
      category: 'Identity',
      field: 'core.description',
      message: 'Business description is too short or missing. Alpha needs clear context to answer "What does your company do?".',
      fixAction: 'Add a comprehensive description (at least 2 sentences) describing your core mission and solutions.',
    });
  } else {
    scorePoints += 10;
  }

  if (bCustomers.length > 0 && bModels.length > 0) {
    scorePoints += 5;
  } else {
    warnings.push({
      id: 'warn_target_customer',
      category: 'Identity',
      field: 'core.customers',
      message: 'Target customers or business model types are not explicitly defined.',
      fixAction: 'Select your primary audiences and commercial models in the Identity section.',
    });
  }

  // 2. Offerings & Catalog (30 points max)
  const offerings = brain.offeringsV2 || [];
  const legacyCatalog = brain.catalog || [];
  const hasOfferings = offerings.length > 0 || legacyCatalog.length > 0;

  if (!hasOfferings) {
    criticalIssues.push({
      id: 'crit_no_offerings',
      category: 'Offerings',
      field: 'offeringsV2',
      message: 'No products, courses, services, or offerings have been configured in Company Brain.',
      fixAction: 'Add at least one offering or service so Alpha can guide visitors and answer product inquiries.',
    });
  } else {
    scorePoints += 15;

    // Check offering completeness & pricing clarity
    let completeOfferingsCount = 0;
    offerings.forEach((off, idx) => {
      const p = off.pricing;
      if (!off.description || off.description.length < 10) {
        warnings.push({
          id: `warn_offering_desc_${off.id || idx}`,
          category: 'Offerings',
          field: `offeringsV2[${idx}].description`,
          message: `Offering "${off.name}" is missing a descriptive summary.`,
          fixAction: 'Provide a clear explanation of what this offering includes and who it is for.',
        });
      }

      if (!p || p.model === 'unspecified') {
        warnings.push({
          id: `warn_pricing_model_${off.id || idx}`,
          category: 'Commercial',
          field: `offeringsV2[${idx}].pricing.model`,
          message: `Pricing model for "${off.name}" is unspecified. Alpha will be forced to give vague answers.`,
          fixAction: 'Explicitly mark as fixed, starting-from, per-unit, custom-quote, or free.',
        });
      } else if (p.model === 'fixed' || p.model === 'starting_from' || p.model === 'per_unit') {
        if (p.basePrice === undefined || p.basePrice === null || isNaN(p.basePrice)) {
          criticalIssues.push({
            id: `crit_missing_base_price_${off.id || idx}`,
            category: 'Commercial',
            field: `offeringsV2[${idx}].pricing.basePrice`,
            message: `Offering "${off.name}" has model "${p.model}" but no numerical amount.`,
            fixAction: 'Enter the exact price or starting amount, or change model to custom-quote.',
          });
        } else if (!p.currency) {
          warnings.push({
            id: `warn_missing_currency_${off.id || idx}`,
            category: 'Commercial',
            field: `offeringsV2[${idx}].pricing.currency`,
            message: `Currency is missing for "${off.name}". Alpha might misstate currencies.`,
            fixAction: 'Specify the currency code (e.g., USD, EUR, INR, GBP).',
          });
        } else {
          completeOfferingsCount++;
        }
      } else {
        completeOfferingsCount++;
      }
    });

    if (completeOfferingsCount > 0) {
      scorePoints += 15;
    }
  }

  // 3. Operational Policies & Boundaries (20 points max)
  const policies = brain.policies;
  const escalation = brain.humanEscalation;
  const alphaCfg = brain.alpha;

  if (escalation?.recipientEmail || brain.core?.contactEmail || profile?.businessEmail) {
    scorePoints += 10;
  } else {
    criticalIssues.push({
      id: 'crit_missing_escalation_email',
      category: 'Operations',
      field: 'humanEscalation.recipientEmail',
      message: 'No human escalation or notification email is configured. Team alerts for hot leads cannot be dispatched.',
      fixAction: 'Provide an executive or team email in the Escalation & Operations section.',
    });
  }

  if (alphaCfg?.forbiddenBehaviors && alphaCfg.forbiddenBehaviors.length > 0) {
    scorePoints += 5;
  } else {
    warnings.push({
      id: 'warn_no_guardrails',
      category: 'Guardrails',
      field: 'alpha.forbiddenBehaviors',
      message: 'No custom boundary guardrails defined. Default safety rules will apply.',
      fixAction: 'Specify claims or commitments Alpha must never make.',
    });
  }

  if (policies?.refundPolicy || policies?.cancellationRules || policies?.customRules || brain.operations?.physicalLocationsHours) {
    scorePoints += 5;
  } else {
    recommendations.push({
      id: 'rec_operating_hours',
      message: 'Add operating hours, service locations, or cancellation policies to reduce customer support friction.',
    });
  }

  // 4. Objections, FAQs, and Customer Intelligence (15 points max)
  const objections = brain.objections?.commonObjections || [];
  const faqs = profile?.faqData || profile?.faqs || [];

  if (objections.length > 0 || (typeof faqs === 'string' && faqs.length > 20) || (Array.isArray(faqs) && faqs.length > 0)) {
    scorePoints += 10;
  } else {
    recommendations.push({
      id: 'rec_add_faqs',
      message: 'Add 2–3 frequently asked questions (pricing, process, guarantees) to boost Alpha’s answer accuracy.',
    });
  }

  if (brain.icp?.bestFitCriteria || brain.qualification?.definitionOfQualifiedLead) {
    scorePoints += 5;
  } else {
    recommendations.push({
      id: 'rec_lead_qualification',
      message: 'Define what makes an ideal lead (e.g. minimum budget, team size, timeline) to sharpen intent scoring.',
    });
  }

  // 5. Fact Conflicts & Stale Data Check (10 points max)
  const conflicts = brain.factConflicts?.filter((c) => c.status === 'pending_review') || [];
  if (conflicts.length > 0) {
    warnings.push({
      id: 'warn_pending_conflicts',
      category: 'Data Integrity',
      field: 'factConflicts',
      message: `There are ${conflicts.length} conflicting facts pending review between legacy entries and structured facts.`,
      fixAction: 'Review and resolve conflicting facts in the Fact Conflicts panel.',
    });
  } else {
    scorePoints += 10;
  }

  const finalScore = Math.min(100, Math.max(0, scorePoints));

  return {
    readinessScore: finalScore,
    criticalIssues,
    warnings,
    recommendations,
    lastEvaluatedAt: new Date().toISOString(),
  };
}
