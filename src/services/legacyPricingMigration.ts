import { CompanyProfile, OfferingItemV2, PricingV2, FactConflict } from '../types';

/**
 * Non-destructive, idempotent migration script for legacy string-based pricing.
 * Converts legacy CompanyProfile catalog or pricing strings into OfferingItemV2 and PricingV2.
 * Marks ambiguous entries for owner review and generates FactConflicts without silent assumptions.
 */
export function migrateLegacyPricing(profile: CompanyProfile): {
  offeringsV2: OfferingItemV2[];
  factConflicts: FactConflict[];
} {
  const offeringsV2: OfferingItemV2[] = [];
  const factConflicts: FactConflict[] = [];

  const legacyOfferings = profile.offerings || [];
  const legacyPricingString = profile.pricing || profile.commercialInfo?.pricingDetails || '';

  if (legacyOfferings.length === 0 && legacyPricingString) {
    // Create a general offering from legacy pricing string if no catalog exists
    const id = 'migrated-gen-' + Date.now();
    const pricing: PricingV2 = {
      model: 'unspecified',
      conditions: legacyPricingString,
      metadata: {
        provenance: 'migrated-legacy',
        lastConfirmedAt: new Date().toISOString(),
        status: 'ambiguous'
      }
    };

    offeringsV2.push({
      id,
      name: 'General Offering (Migrated)',
      description: legacyPricingString,
      pricing,
      legacyPricingString,
      status: 'LIVE'
    });

    factConflicts.push({
      id: 'conflict-' + id,
      fieldPath: 'commercialInfo.pricingDetails',
      legacyValue: legacyPricingString,
      structuredValue: { model: 'unspecified', conditions: legacyPricingString },
      provenance: 'migrated-legacy',
      detectedAt: new Date().toISOString(),
      status: 'pending_review'
    });
  } else {
    for (const item of legacyOfferings) {
      const legacyStr = item.price || item.startingPrice || item.priceRange || item.pricingModel || '';
      let model: PricingV2['model'] = 'unspecified';
      let basePrice: number | undefined = undefined;
      let currency: string | undefined = undefined;
      let billingCycle: PricingV2['billingCycle'] = 'none';
      let status: PricingV2['metadata']['status'] = 'ambiguous';

      // Non-destructive parsing: check if numeric amount exists without guessing currency
      if (legacyStr) {
        const numMatch = legacyStr.match(/\d+(\.\d+)?/);
        if (numMatch) {
          const parsedNum = parseFloat(numMatch[0]);
          if (!isNaN(parsedNum) && parsedNum >= 0) {
            basePrice = parsedNum;
            // Only assign model if explicitly indicated, otherwise leave ambiguous
            if (legacyStr.toLowerCase().includes('starting') || legacyStr.toLowerCase().includes('from')) {
              model = 'starting_from';
            } else if (legacyStr.toLowerCase().includes('per unit') || legacyStr.toLowerCase().includes('each')) {
              model = 'per_unit';
            } else if (legacyStr.toLowerCase().includes('month') || legacyStr.toLowerCase().includes('/mo')) {
              model = 'fixed';
              billingCycle = 'monthly';
            } else if (legacyStr.toLowerCase().includes('year')) {
              model = 'fixed';
              billingCycle = 'yearly';
            } else {
              model = 'fixed';
              billingCycle = 'one_time';
            }
            // Do NOT infer currency solely from '$' unless explicitly validated or leave currency undefined if ambiguous
            if (legacyStr.includes('$')) {
              // Mark ambiguous currency or leave undefined for owner review
              currency = undefined; 
            }
          }
        } else if (legacyStr.toLowerCase().includes('custom') || legacyStr.toLowerCase().includes('quote')) {
          model = 'custom_quote';
          status = 'verified';
        } else if (legacyStr.toLowerCase().includes('free')) {
          model = 'free';
          basePrice = 0;
          status = 'verified';
        }
      }

      const pricing: PricingV2 = {
        model,
        basePrice,
        currency,
        billingCycle,
        conditions: legacyStr,
        metadata: {
          provenance: 'migrated-legacy',
          lastConfirmedAt: new Date().toISOString(),
          status
        }
      };

      offeringsV2.push({
        id: item.id || 'item-' + Math.random().toString(36).substring(2, 9),
        name: item.name || 'Untitled Offering',
        description: item.description || '',
        category: item.category,
        keyFeatures: item.keyFeatures,
        specifications: item.specifications,
        variants: item.variants,
        pricing,
        legacyPricingString: legacyStr,
        availability: item.availability,
        deliveryTime: item.deliveryTime,
        moq: item.moq,
        useCases: item.useCases,
        idealCustomer: item.idealCustomer,
        status: item.status || 'LIVE'
      });

      if (status === 'ambiguous') {
        factConflicts.push({
          id: 'conflict-' + (item.id || Math.random().toString(36).substring(2, 9)),
          fieldPath: `offerings.${item.id}.pricing`,
          legacyValue: legacyStr,
          structuredValue: { model, basePrice, billingCycle },
          provenance: 'migrated-legacy',
          detectedAt: new Date().toISOString(),
          status: 'pending_review'
        });
      }
    }
  }

  return { offeringsV2, factConflicts };
}

/**
 * Idempotent wrapper for company profile migration
 */
export function migrateCompanyProfilePricing(profile: CompanyProfile): CompanyProfile {
  if (profile.companyBrain?.offeringsV2 && profile.companyBrain.offeringsV2.length > 0) {
    // Already migrated, return profile as-is (idempotent)
    return profile;
  }

  const { offeringsV2, factConflicts } = migrateLegacyPricing(profile);

  return {
    ...profile,
    companyBrain: {
      ...(profile.companyBrain || {
        version: 2,
        core: {
          businessName: profile.name || profile.brandName || '',
          description: profile.description || profile.shortDescription || '',
          customers: [],
          businessModel: [],
          salesChannels: []
        },
        industry: {
          industryId: profile.industry || 'general',
          industryName: profile.industry || 'General',
          businessTypeId: profile.businessType || 'business',
          businessTypeName: profile.businessType || 'Business',
          data: {}
        },
        alpha: {
          objectives: [],
          priorities: [],
          escalationRules: [],
          forbiddenBehaviors: [],
          tone: profile.tone || 'Professional'
        }
      }),
      version: 2,
      offeringsV2,
      factConflicts: [
        ...(profile.companyBrain?.factConflicts || []),
        ...factConflicts
      ]
    }
  };
}
