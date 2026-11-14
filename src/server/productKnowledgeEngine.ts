import { CompanyProfile, OfferingItem } from '../types.ts';
import { SemanticCompanyKnowledge } from './knowledgeSynthesizer.ts';

export interface CatalogItem {
  id?: string;
  name: string;
  price: string;
  description: string;
  status?: string;
  pricingModel?: string;
}

export interface ProductQueryResult {
  hasAnswer: boolean;
  reply: string;
  matchedProduct?: CatalogItem;
  isUnlistedProduct?: boolean;
  queriedProductName?: string;
  intentType: 'price_and_description' | 'price' | 'description' | 'catalog' | 'unlisted_refusal' | 'availability' | 'comparison' | 'moq';
}

/**
 * Normalizes all offerings and products from a CompanyProfile into a unified CatalogItem list.
 */
export function getNormalizedCatalog(companyProfile?: Partial<CompanyProfile>): CatalogItem[] {
  if (!companyProfile) return [];

  const catalog: CatalogItem[] = [];
  const seenNames = new Set<string>();

  // 0. Structured OfferingsV2 (Primary Source of Truth with PricingV2)
  const offeringsV2 = companyProfile.companyBrain?.offeringsV2;
  if (Array.isArray(offeringsV2) && offeringsV2.length > 0) {
    for (const off of offeringsV2) {
      const name = (off.name || '').trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (seenNames.has(lower)) continue;
      seenNames.add(lower);

      let priceFormatted = 'Custom Quote';
      const p = off.pricing;
      if (p) {
        const cur = p.currency || '$';
        const cycle = p.billingCycle && p.billingCycle !== 'none' && p.billingCycle !== 'one_time' ? `/${p.billingCycle}` : '';
        if (p.model === 'free') {
          priceFormatted = 'Free';
        } else if (p.model === 'fixed' && p.basePrice !== undefined) {
          priceFormatted = `${cur}${p.basePrice}${cycle}`;
        } else if (p.model === 'starting_from' && p.basePrice !== undefined) {
          priceFormatted = `From ${cur}${p.basePrice}${cycle}`;
        } else if (p.model === 'range' && (p.rangeMin !== undefined || p.rangeMax !== undefined)) {
          priceFormatted = `${cur}${p.rangeMin || 0} - ${cur}${p.rangeMax || 'varies'}`;
        } else if (p.model === 'per_unit' && p.basePrice !== undefined) {
          priceFormatted = `${cur}${p.basePrice} per ${p.unit || 'unit'}`;
        } else if (p.model === 'usage_based') {
          priceFormatted = p.basePrice !== undefined ? `${cur}${p.basePrice} (usage-based)` : 'Usage-based';
        } else if (p.model === 'custom_quote') {
          priceFormatted = 'Custom Quote';
        } else if (off.legacyPricingString) {
          priceFormatted = off.legacyPricingString;
        }
      }

      catalog.push({
        id: off.id,
        name,
        price: priceFormatted,
        description: (off.description || '').trim(),
        status: off.status || 'LIVE',
        pricingModel: p?.model,
      });
    }
  }

  // 1. Structured offerings
  if (Array.isArray(companyProfile.offerings) && companyProfile.offerings.length > 0) {
    for (const off of companyProfile.offerings) {
      const name = (off.name || '').trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (seenNames.has(lower)) continue;
      seenNames.add(lower);

      const price = (off.price || off.priceRange || off.startingPrice || '').trim();
      const description = (off.description || '').trim();
      catalog.push({
        id: off.id,
        name,
        price: price || 'Custom Quote',
        description,
        status: off.status || 'LIVE',
        pricingModel: off.pricingModel,
      });
    }
  }

  // 2. Unstructured products text (e.g. "Graphic Designing ($19), Video Editing ($49)" or multiline)
  if (companyProfile.products && typeof companyProfile.products === 'string') {
    const raw = companyProfile.products;
    // Check if comma-separated with parentheses: e.g. "Graphic Designing ($19), Video Editing ($49)"
    const commaItems = raw.split(/,\s*(?=[A-Z])/);
    for (const item of commaItems) {
      const trimmed = item.replace(/^[-*•]\s*/, '').trim();
      if (!trimmed) continue;

      // Extract "Name ($Price)"
      const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)(?:\s*[-—:]\s*(.+))?$/);
      if (parenMatch) {
        const pName = parenMatch[1].trim();
        const pPrice = parenMatch[2]?.trim() || '';
        const pDesc = parenMatch[3]?.trim() || '';
        const lower = pName.toLowerCase();
        if (pName && !seenNames.has(lower)) {
          seenNames.add(lower);
          catalog.push({
            name: pName,
            price: pPrice || 'Based on order',
            description: pDesc,
            status: 'LIVE',
          });
          continue;
        }
      }

      // Extract "Name - Description - Price"
      const dashParts = trimmed.split(/(?:\s+[-—–]\s+|\s*[—–]\s*|\s*\|\s*)/);
      if (dashParts.length >= 2) {
        const pName = dashParts[0].trim();
        const pDesc = dashParts[1].trim();
        let pPrice = dashParts[2] ? dashParts[2].trim() : '';
        const priceMatch = pDesc.match(/(?:price|pricing|cost):\s*([$€£₹]?\s*[\d,]+(?:\.\d+)?|\$?[^;.]+)/i);
        if (!pPrice && priceMatch) {
          pPrice = priceMatch[1].trim();
        }
        const cleanDesc = pDesc.replace(/(?:\.\s*)?(?:price|pricing|cost):\s*[$€£₹]?\s*[\d,]+(?:\.\d+)?\.?/i, '').trim();
        const lower = pName.toLowerCase();
        if (pName && !seenNames.has(lower)) {
          seenNames.add(lower);
          catalog.push({
            name: pName,
            price: pPrice || 'Custom Quote',
            description: cleanDesc || pDesc,
            status: 'LIVE',
          });
          continue;
        }
      }
    }
  }

  return catalog;
}

/**
 * Evaluates whether a visitor message is querying product details, pricing, description, or catalog.
 * Strictly grounds answers in the verified company catalog, preventing hallucinations or stale overrides.
 */
export function resolveProductKnowledgeQuery(params: {
  message: string;
  companyProfile: Partial<CompanyProfile>;
  semanticKnowledge?: SemanticCompanyKnowledge;
  knownProduct?: string;
}): ProductQueryResult | null {
  const { message, companyProfile, knownProduct } = params;
  const msgLower = message.toLowerCase().trim();
  const companyName = companyProfile.name || 'our company';
  const catalog = getNormalizedCatalog(companyProfile);

  // 1. Check for Catalog Listing Intent ("What do you sell?", "Explore products", "What are your products/services?")
  const isCatalogQuery =
    /^(?:explore products|what do you (?:sell|offer|have|provide|do)|what are your (?:products|services|offerings|solutions)|what (?:products|services) do you (?:sell|offer|have)|show (?:me )?(?:your )?(?:catalog|products|services|offerings))\b/i.test(
      msgLower
    ) ||
    msgLower === 'explore products' ||
    msgLower === 'products' ||
    msgLower === 'services' ||
    msgLower === 'catalog';

  if (isCatalogQuery) {
    if (catalog.length > 0) {
      const itemsList = catalog
        .map((c) => {
          const pricePart = c.price && c.price !== 'Custom Quote' ? ` (${c.price})` : '';
          const descPart = c.description ? `: ${c.description}` : '';
          return `• ${c.name}${pricePart}${descPart}`;
        })
        .join('\n');
      return {
        hasAnswer: true,
        reply: `At ${companyName}, our verified offerings include:\n\n${itemsList}\n\nWhich of these would you like to explore or get pricing for?`,
        intentType: 'catalog',
      };
    } else if (companyProfile.products) {
      return {
        hasAnswer: true,
        reply: `At ${companyName}, we offer: ${companyProfile.products}. How can we best assist with your requirements today?`,
        intentType: 'catalog',
      };
    }
  }

  // Verify official platform identity strictly via server-verified flag (never company-name matching)
  const isAiWorkforce = Boolean((companyProfile as any)?._isOfficialAiWorkforce);

  // 1.5. Comparison between two or more catalog products
  const matchedProducts: CatalogItem[] = [];
  for (const item of catalog) {
    const itemNameLower = item.name.toLowerCase();
    if (msgLower.includes(itemNameLower)) {
      matchedProducts.push(item);
    }
  }

  if (
    (matchedProducts.length >= 2 || (matchedProducts.length >= 1 && /(?:compare|comparison|difference between|versus|\bvs\b)/i.test(msgLower))) &&
    /(?:compare|comparison|difference between|versus|\bvs\b|which (?:is|one)|better)/i.test(msgLower)
  ) {
    const itemsToCompare = matchedProducts.length >= 2 ? matchedProducts : catalog.slice(0, 3);
    const compLines = itemsToCompare.map((p) => {
      const pricePart = p.price && p.price !== 'Custom Quote' ? ` (${p.price})` : '';
      const descPart = p.description ? `: ${p.description}` : '';
      return `• **${p.name}**${pricePart}${descPart}`;
    });
    return {
      hasAnswer: true,
      reply: `Here is a side-by-side comparison for ${companyName}:\n\n${compLines.join('\n\n')}\n\nWhich of these best aligns with your scope and volume requirements?`,
      matchedProduct: itemsToCompare[0],
      intentType: 'comparison',
    };
  }

  // 1.6. "Cheaper one" / lowest price query
  if (/(?:cheaper one|which one is cheaper|lower price|lowest cost|budget option|cheapest)/i.test(msgLower) && catalog.length > 0) {
    // Sort items by extracted price if possible
    const parsePrice = (pStr: string): number => {
      const match = pStr.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
      return match ? parseFloat(match[0]) : 999999;
    };
    const sorted = [...catalog].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    const cheapest = sorted[0];
    return {
      hasAnswer: true,
      reply: `Our most economical option is **${cheapest.name}**, priced at ${cheapest.price}.${cheapest.description ? ` It offers ${cheapest.description}.` : ''} Would you like to proceed with this or check another option?`,
      matchedProduct: cheapest,
      intentType: 'price',
    };
  }

  // 1.7. Minimum Order Quantity (MOQ) Queries
  if (/(?:moq|minimum order|min order|minimum quantity|minimum purchase|min volume)\b/i.test(msgLower)) {
    const minOrderStr = companyProfile.minOrder || 'Standard commercial order terms';
    let targetProd = catalog.find((c) => msgLower.includes(c.name.toLowerCase()));
    if (!targetProd && catalog.length > 0) targetProd = catalog[0];

    const prodPrefix = targetProd ? `for ${targetProd.name} ` : '';
    return {
      hasAnswer: true,
      reply: `The minimum order requirement ${prodPrefix}at ${companyName} is ${minOrderStr}. How many units or what scope are you looking to order?`,
      matchedProduct: targetProd,
      intentType: 'moq',
    };
  }

  // 2. Direct match against known catalog items
  let matchedItem: CatalogItem | undefined;
  for (const item of catalog) {
    const itemNameLower = item.name.toLowerCase();
    // Check if query contains the product name
    if (
      msgLower.includes(itemNameLower) ||
      (itemNameLower.length > 5 && msgLower.includes(itemNameLower.slice(0, -1)))
    ) {
      matchedItem = item;
      break;
    }
  }

  // Also check aliases (e.g. "sales manager" -> "Alpha", "graphic design" -> "Graphic Designing", "video editor" -> "Video Editing")
  if (!matchedItem) {
    for (const item of catalog) {
      const name = item.name.toLowerCase();
      if (name.includes('video') && msgLower.includes('video')) {
        matchedItem = item;
        break;
      }
      if (name.includes('graphic') && msgLower.includes('graphic')) {
        matchedItem = item;
        break;
      }
      if (isAiWorkforce && name.includes('sales manager') && (msgLower.includes('sales manager') || msgLower.includes('sales agent'))) {
        matchedItem = item;
        break;
      }
      if (isAiWorkforce && name.includes('researcher') && msgLower.includes('researcher')) {
        matchedItem = item;
        break;
      }
      if (isAiWorkforce && name.includes('analyst') && msgLower.includes('analyst')) {
        matchedItem = item;
        break;
      }
    }
  }

  // Check knownProduct if not explicitly named in the current message.
  // ONLY use knownProduct if the visitor is asking a follow-up pronoun/pricing question (e.g. "how much is it?", "price?", "details?")
  // and NOT when the visitor explicitly asks about a different entity or keyword (e.g. "What is ALPHA BLUE TIGER 742?").
  const isGenericFollowUp =
    /(?:how much|price|cost|rates?|quote|buy|purchase|specifications?|warranty|availability|moq)\b/i.test(msgLower) &&
    !/(?:what is|who is|tell me about|explain|describe)\s+[a-z0-9]/i.test(msgLower);

  if (!matchedItem && knownProduct && isGenericFollowUp) {
    const kpLower = knownProduct.toLowerCase();
    for (const item of catalog) {
      const name = item.name.toLowerCase();
      if (name.includes(kpLower) || kpLower.includes(name)) {
        matchedItem = item;
        break;
      }
    }
  }

  // 3. If a catalog item was matched:
  if (matchedItem) {
    const isPriceAndDesc =
      /(?:price\s*(?:and|&)\s*description|description\s*(?:and|&)\s*price|details\s*(?:and|&)\s*price|price\s*(?:and|&)\s*details)/i.test(
        msgLower
      );
    const isPriceOnly =
      /(?:what(?:'s| is| was) the (?:price|rate|cost)|how much (?:is|does|for)|what are the (?:rates|prices)|pricing\??$|price again)/i.test(
        msgLower
      ) && !isPriceAndDesc;
    const isDescOnly =
      /(?:what is|tell me about|description of|details of|features of)\s+/i.test(msgLower) &&
      !isPriceAndDesc &&
      !isPriceOnly;

    // A. Price and Description
    if (isPriceAndDesc) {
      let priceStr = matchedItem.price;
      if (matchedItem.pricingModel && !priceStr.toLowerCase().includes(matchedItem.pricingModel.toLowerCase())) {
        priceStr = `${matchedItem.pricingModel} ${priceStr}`;
      }

      // Special handling if price is free / $0
      if (priceStr.includes('$0') || priceStr.toLowerCase().includes('free')) {
        if (isAiWorkforce) {
          const descStr = matchedItem.description || '24/7 inbound revenue employee with Company Brain grounding';
          return {
            hasAnswer: true,
            reply: `${matchedItem.name} is free for now with zero setup fees. Founding cohort terms concluded October 10, 2026. ${descStr}.`,
            matchedProduct: matchedItem,
            intentType: 'price_and_description',
          };
        }
        const descStr = matchedItem.description ? ` ${matchedItem.description}.` : '';
        return {
          hasAnswer: true,
          reply: `${matchedItem.name} is available free of charge (${priceStr}).${descStr} Would you like more details or to get started?`,
          matchedProduct: matchedItem,
          intentType: 'price_and_description',
        };
      }

      const descStr = matchedItem.description
        ? ` ${matchedItem.description.charAt(0).toUpperCase() + matchedItem.description.slice(1)}`
        : '';
      return {
        hasAnswer: true,
        reply: `${matchedItem.name} is priced at ${priceStr}.${descStr ? ` ${descStr}` : ''}`,
        matchedProduct: matchedItem,
        intentType: 'price_and_description',
      };
    }

    // B. Price only
    if (isPriceOnly) {
      let priceStr = matchedItem.price;
      if (matchedItem.pricingModel && !priceStr.toLowerCase().includes(matchedItem.pricingModel.toLowerCase())) {
        priceStr = `${matchedItem.pricingModel} ${priceStr}`;
      }
      if (priceStr.includes('$0') || priceStr.toLowerCase().includes('free')) {
        if (isAiWorkforce) {
          return {
            hasAnswer: true,
            reply: `${matchedItem.name} is free for now with zero setup fees. Founding cohort terms concluded October 10, 2026.`,
            matchedProduct: matchedItem,
            intentType: 'price',
          };
        }
        return {
          hasAnswer: true,
          reply: `${matchedItem.name} is available free of charge (${priceStr}). Would you like more details or a formal quote?`,
          matchedProduct: matchedItem,
          intentType: 'price',
        };
      }
      return {
        hasAnswer: true,
        reply: `${matchedItem.name} is priced at ${priceStr}. Would you like more details or a formal quote?`,
        matchedProduct: matchedItem,
        intentType: 'price',
      };
    }

    // C. Description only
    if (isDescOnly) {
      const descStr = matchedItem.description || 'commercial solution delivered by our verified specialists';
      return {
        hasAnswer: true,
        reply: `${matchedItem.name}: ${descStr}. Pricing is ${matchedItem.price || 'available upon request'}.`,
        matchedProduct: matchedItem,
        intentType: 'description',
      };
    }

    // D. General query about this product
    if (
      msgLower.includes('price') ||
      msgLower.includes('cost') ||
      msgLower.includes('rate') ||
      msgLower.includes('how much')
    ) {
      return {
        hasAnswer: true,
        reply: `${matchedItem.name} is priced at ${matchedItem.price}.${matchedItem.description ? ` ${matchedItem.description}` : ''}`,
        matchedProduct: matchedItem,
        intentType: 'price',
      };
    }

    return {
      hasAnswer: true,
      reply: `Yes, we offer ${matchedItem.name}.${matchedItem.description ? ` ${matchedItem.description}.` : ''} Pricing is ${matchedItem.price}. How can we assist with your requirements?`,
      matchedProduct: matchedItem,
      intentType: 'availability',
    };
  }

  // 4. Product explicitly queried but NOT found in catalog (Strict Zero-Hallucination Enforcement)
  const productExtractRegex =
    /(?:what is the price and description of|tell me the price and description of|price and description of|description and price of|what is the price of|how much is|how much for|cost of|what are the rates for|do you (?:offer|sell|provide|have|support|do)|can you do|do you support)\s+([a-zA-Z0-9\s-]{2,40}?)(?:\?|\.|\,|$)/i;
  const extractMatch = msgLower.match(productExtractRegex);

  if (extractMatch && extractMatch[1]) {
    const candidate = extractMatch[1].trim();
    // Exclude pronouns or generic words
    const genericWords = [
      'it',
      'this',
      'that',
      'your services',
      'your products',
      'the service',
      'the product',
      'everything',
      'something else',
    ];
    if (!genericWords.includes(candidate) && candidate.length > 2) {
      // Check if candidate matches anything in catalog or company profile
      const inCatalog = catalog.some((c) => c.name.toLowerCase().includes(candidate));
      const inProdsText = (companyProfile.products || '').toLowerCase().includes(candidate);
      const inDesc = (companyProfile.description || '').toLowerCase().includes(candidate);

      if (!inCatalog && !inProdsText && !inDesc) {
        // Zero Hallucination Enforcement: Explicitly state unlisted status and list actual offerings
        const availableOfferings =
          catalog.length > 0
            ? catalog.map((c) => c.name + (c.price && c.price !== 'Custom Quote' ? ` (${c.price})` : '')).join(', ')
            : companyProfile.products || 'our standard offerings';

        const capCandidate = candidate
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return {
          hasAnswer: true,
          reply: `We do not offer ${capCandidate}. At ${companyName}, our verified offerings are: ${availableOfferings}. Would you like more information on any of our available solutions?`,
          isUnlistedProduct: true,
          queriedProductName: capCandidate,
          intentType: 'unlisted_refusal',
        };
      }
    }
  }

  return null;
}
