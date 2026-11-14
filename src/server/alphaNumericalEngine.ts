/**
 * Alpha Numerical Reasoning Engine
 * 
 * Deterministic mathematical calculation layer for sales funnels, conversion rates,
 * revenue, unit economics, MRR/ARR, and multi-stage business calculations.
 * 
 * Never relies on mental LLM arithmetic. Preserves exact precision, units,
 * data types, and distinguishes original inputs from derived values.
 */

export interface NumericalVariable {
  name: string;
  label: string;
  value: number;
  formattedValue: string;
  unit: string;
  dataType: 'number' | 'percentage' | 'currency' | 'ratio';
  source: 'visitor' | 'calculated' | 'correction' | 'assumed';
  isHypothetical: boolean;
  confidence: number;
  lastUpdatedTurn: number;
}

export interface FunnelCalculationState {
  visitors?: number;
  leadConversionRate?: number; // e.g. 0.04 for 4%
  leads?: number;
  demoBookingRate?: number; // e.g. 0.30 for 30%
  demos?: number;
  demoCloseRate?: number; // e.g. 0.20 or 0.25 for 20% or 25%
  customers?: number;
  unitPrice?: number; // e.g. 99 for $99/mo
  monthlyRevenue?: number;
  annualRevenue?: number;
  lastRecalculatedTurn?: number;
  isHypothetical: boolean;
  historyOfChanges: Array<{
    turn: number;
    variable: string;
    oldValue?: number;
    newValue: number;
    reason: string;
  }>;
}

export interface CalculationResult {
  funnel: FunnelCalculationState;
  explanation: string;
  summaryBullets: string[];
  recommendation?: string;
  appliedChanges: string[];
}

/**
 * Deterministically computes funnel stages from current inputs
 */
export function recalculateFunnel(
  state: FunnelCalculationState,
  currentTurn = 1
): FunnelCalculationState {
  const updated: FunnelCalculationState = {
    ...state,
    historyOfChanges: [...(state.historyOfChanges || [])],
    lastRecalculatedTurn: currentTurn,
  };

  // Step 1: Leads = Visitors * Lead Conversion Rate
  if (typeof updated.visitors === 'number' && typeof updated.leadConversionRate === 'number') {
    updated.leads = Math.round(updated.visitors * updated.leadConversionRate);
  }

  // Step 2: Demos = Leads * Demo Booking Rate
  if (typeof updated.leads === 'number' && typeof updated.demoBookingRate === 'number') {
    updated.demos = Math.round(updated.leads * updated.demoBookingRate);
  }

  // Step 3: Customers = Demos * Demo Close Rate
  if (typeof updated.demos === 'number' && typeof updated.demoCloseRate === 'number') {
    updated.customers = Math.round(updated.demos * updated.demoCloseRate);
  }

  // Step 4: Revenue = Customers * Unit Price
  if (typeof updated.customers === 'number' && typeof updated.unitPrice === 'number') {
    updated.monthlyRevenue = Math.round(updated.customers * updated.unitPrice);
    updated.annualRevenue = updated.monthlyRevenue * 12;
  }

  return updated;
}

/**
 * Format helper for numbers with commas
 */
export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(val);
}

/**
 * Format helper for percentages
 */
export function formatPercent(val: number): string {
  // If val is 0.04, return "4%". If 0.045, return "4.5%"
  const pct = val * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/**
 * Format helper for currency
 */
export function formatCurrency(val: number): string {
  return `$${formatNumber(val)}`;
}

/**
 * Parses user input for numerical expressions related to funnels and pricing
 */
export function parseFunnelExpressions(
  text: string,
  existingState?: FunnelCalculationState
): {
  foundAny: boolean;
  updates: Partial<FunnelCalculationState>;
  isCorrection: boolean;
  correctedVariable?: string;
} {
  const lower = text.toLowerCase();
  const updates: Partial<FunnelCalculationState> = {};
  let foundAny = false;
  let isCorrection = false;
  let correctedVariable: string | undefined;

  // 1. Visitors detection (e.g. "20,000 visitors monthly", "website gets 20000 visitors", "5,000 visitors")
  const visitorMatch =
    text.match(/(\d+[\d,]*)\s*(?:website\s+|monthly\s+)?visitors(?:\s*(?:monthly|per month|a month))?/i) ||
    text.match(/gets?\s+(\d+[\d,]*)\s*(?:website\s+|monthly\s+)?visitors/i);

  if (visitorMatch) {
    const raw = parseInt(visitorMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(raw) && raw > 0) {
      updates.visitors = raw;
      foundAny = true;
    }
  }

  // 2. Lead conversion rate (e.g. "4% become leads", "4% convert to leads", "lead conversion rate from 4% to 5%", "lead conversion rate is 5%", "4% of visitors become leads")
  const leadRateFromToMatch =
    text.match(/(?:lead\s+conversion(?:\s+rate)?|visitor-to-lead\s+rate|website\s+conversion)[^0-9%]*from\s+(\d+(?:\.\d+)?)\s*%\s*to\s+(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/from\s+(\d+(?:\.\d+)?)\s*%\s*to\s+(\d+(?:\.\d+)?)\s*%\s*(?:lead\s+conversion|visitor-to-lead)/i);

  const leadRateMatch = leadRateFromToMatch ? null :
    text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+visitors\s+)?(?:become|convert(?:\s+to)?|turn into)\s+leads/i) ||
    text.match(/(?:lead\s+conversion(?:\s+rate)?|visitor-to-lead\s+rate|website\s+conversion)[^0-9%]*(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/(?:increase|raise|change)\s+(?:the\s+)?lead\s+conversion(?:\s+rate)?[^0-9%]*(?:from\s+\d+(?:\.\d+)?\s*%\s*)?to\s+(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/(?:to|at)\s+(\d+(?:\.\d+)?)\s*%\s*(?:lead|website)?\s*conversion/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*%\s*convert\b/i);

  if (leadRateFromToMatch) {
    const rateVal = parseFloat(leadRateFromToMatch[2]) / 100;
    if (!isNaN(rateVal) && rateVal > 0) {
      updates.leadConversionRate = rateVal;
      foundAny = true;
      isCorrection = true;
      correctedVariable = 'leadConversionRate';
    }
  } else if (leadRateMatch) {
    const rateVal = parseFloat(leadRateMatch[1]) / 100;
    if (!isNaN(rateVal) && rateVal > 0) {
      updates.leadConversionRate = rateVal;
      foundAny = true;
      if (existingState?.leadConversionRate && existingState.leadConversionRate !== rateVal) {
        isCorrection = true;
        correctedVariable = 'leadConversionRate';
      }
    }
  }

  // 3. Demo booking rate (e.g. "30% of leads book a demo", "15% book a demo", "demo booking rate is 30%", "30% book demos")
  const demoRateFromToMatch =
    text.match(/(?:demo\s+booking(?:\s+rate)?)[^0-9%]*from\s+(\d+(?:\.\d+)?)\s*%\s*to\s+(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/from\s+(\d+(?:\.\d+)?)\s*%\s*to\s+(\d+(?:\.\d+)?)\s*%\s*(?:demo\s+booking)/i);

  const demoRateMatch = demoRateFromToMatch ? null :
    text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+leads\s+)?book\s+(?:a\s+)?demo/i) ||
    text.match(/demo\s+booking(?:\s+rate)?[^0-9%]*(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/(?:to|at)\s+(\d+(?:\.\d+)?)\s*%\s*demo\s+booking/i);

  if (demoRateFromToMatch) {
    const rateVal = parseFloat(demoRateFromToMatch[2]) / 100;
    if (!isNaN(rateVal) && rateVal > 0) {
      updates.demoBookingRate = rateVal;
      foundAny = true;
      isCorrection = true;
      correctedVariable = 'demoBookingRate';
    }
  } else if (demoRateMatch) {
    const rateVal = parseFloat(demoRateMatch[1]) / 100;
    if (!isNaN(rateVal) && rateVal > 0) {
      updates.demoBookingRate = rateVal;
      foundAny = true;
      if (existingState?.demoBookingRate && existingState.demoBookingRate !== rateVal) {
        isCorrection = true;
        correctedVariable = 'demoBookingRate';
      }
    }
  }

  // 4. Demo close / demo-to-customer rate (e.g. "Change only the close rate from 20% to 25%", "close rate is 25%, not 20%")
  const demoCloseFromToMatch =
    text.match(/(?:change\s+(?:only\s+)?(?:the\s+)?(?:demo\s+)?close\s+rate|demo-to-customer(?:\s+conversion)?(?:\s+rate)?|demo\s+close\s+rate|close\s+rate)[^0-9%]*from\s+(\d+(?:\.\d+)?)\s*%\s*to\s+(\d+(?:\.\d+)?)\s*%/i) ||
    text.match(/from\s+(\d+(?:\.\d+)?)\s*%\s*to\s+(\d+(?:\.\d+)?)\s*%\s*(?:demo\s+)?close\s+rate/i);

  const demoCloseMatch = demoCloseFromToMatch ? null :
    text.match(/(?:demo-to-customer(?:\s+conversion)?(?:\s+rate)?|demo\s+close\s+rate|close\s+rate)[^0-9%]*(\d+(?:\.\d+)?)\s*%(?:[,\s]+not\s+\d+(?:\.\d+)?\s*%)?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+demos\s+)?(?:become\s+customers|close)/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:demo\s+)?close\s+rate/i);

  if (demoCloseFromToMatch) {
    // When "from X% to Y%", Y% (index 2) is the target value!
    const rateVal = parseFloat(demoCloseFromToMatch[2]) / 100;
    if (!isNaN(rateVal) && rateVal > 0) {
      updates.demoCloseRate = rateVal;
      foundAny = true;
      isCorrection = true;
      correctedVariable = 'demoCloseRate';
    }
  } else if (demoCloseMatch) {
    const rateVal = parseFloat(demoCloseMatch[1]) / 100;
    if (!isNaN(rateVal) && rateVal > 0) {
      updates.demoCloseRate = rateVal;
      foundAny = true;
      if (existingState?.demoCloseRate && existingState.demoCloseRate !== rateVal) {
        isCorrection = true;
        correctedVariable = 'demoCloseRate';
      }
    }
  }

  // 5. Hypothetical price & customer count (e.g. "charge customers $99/month for my software. If I get 20 customers")
  const priceMatch =
    text.match(/\$\s*(\d+[\d,]*)(?:\s*\/\s*(?:mo|month|monthly))?/i) ||
    text.match(/(\d+[\d,]*)\s*(?:dollars|\$)(?:\s*\/\s*(?:mo|month|monthly))?/i);

  if (priceMatch) {
    const pVal = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(pVal) && pVal > 0) {
      // Check if user is discussing their own software or customer price
      if (
        /\b(?:i charge|charge customers|my software|price is|costs|subscription costs|our software|our product)\b/i.test(lower) ||
        /\b(?:let's say i charge|suppose i charge|if i charge)\b/i.test(lower)
      ) {
        updates.unitPrice = pVal;
        foundAny = true;
      }
    }
  }

  const custMatch =
    text.match(/(?:if i get|with|have)\s+(\d+[\d,]*)\s+customers\b/i) ||
    text.match(/(\d+[\d,]*)\s+customers\b/i);

  if (custMatch && !updates.customers) {
    const cVal = parseInt(custMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(cVal) && cVal > 0 && /\b(?:charge|\$|revenue|mrr|deals)\b/i.test(lower)) {
      updates.customers = cVal;
      foundAny = true;
    }
  }

  // 5b. Explicit stage counts (e.g. "1,000 leads", "300 opportunities" / "300 opps" / "300 demos", "75 deals" / "75 customers")
  const explicitLeadsMatch = text.match(/(\d+[\d,]*)\s+leads\b/i);
  if (explicitLeadsMatch && !updates.leads) {
    const lVal = parseInt(explicitLeadsMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(lVal) && lVal > 0) {
      updates.leads = lVal;
      foundAny = true;
    }
  }

  const explicitDemosMatch = text.match(/(\d+[\d,]*)\s+(?:opportunities|opps|demos)\b/i);
  if (explicitDemosMatch && !updates.demos) {
    const dVal = parseInt(explicitDemosMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(dVal) && dVal > 0) {
      updates.demos = dVal;
      foundAny = true;
    }
  }

  const explicitDealsMatch = text.match(/(\d+[\d,]*)\s+(?:deals|customers)\b/i);
  if (explicitDealsMatch && !updates.customers) {
    const cVal = parseInt(explicitDealsMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(cVal) && cVal > 0) {
      updates.customers = cVal;
      foundAny = true;
    }
  }

  // 6. Correction check (e.g. "Actually, my demo-to-customer conversion rate is 25%, not 20%")
  if (/\b(?:actually|correction|update the model|change that to|update to)\b/i.test(lower)) {
    isCorrection = true;
  }

  return { foundAny, updates, isCorrection, correctedVariable };
}

/**
 * Builds deterministic, pristine text representations of funnel calculations
 */
export function buildFunnelCalculationResponse(
  funnel: FunnelCalculationState,
  options: {
    includeFourStages?: boolean;
    includeSummary?: boolean;
    includeExperimentRecommendation?: boolean;
    customNote?: string;
    baselineFunnel?: FunnelCalculationState;
  } = {}
): string {
  const visitors = funnel.visitors ?? 20000;
  const leadRate = funnel.leadConversionRate ?? 0.04;
  const leads = funnel.leads ?? Math.round(visitors * leadRate);
  const demoRate = funnel.demoBookingRate;
  const hasDemoRate = typeof demoRate === 'number';
  const demos = hasDemoRate ? (funnel.demos ?? Math.round(leads * demoRate)) : undefined;
  const closeRate = funnel.demoCloseRate;
  const hasCloseRate = typeof closeRate === 'number';
  const customers = (typeof demos === 'number' && hasCloseRate)
    ? (funnel.customers ?? Math.round(demos * closeRate!))
    : undefined;

  const lines: string[] = [];

  if (options.includeFourStages || (hasDemoRate && hasCloseRate)) {
    lines.push("Here is the exact calculation across your funnel stages:");
    lines.push(`• Visitors: ${formatNumber(visitors)} monthly`);
    lines.push(`• Leads (${formatPercent(leadRate)} conversion): ${formatNumber(leads)}`);
    if (typeof demos === 'number' && hasDemoRate) {
      lines.push(`• Demos (${formatPercent(demoRate!)} booking rate): ${formatNumber(demos)}`);
    } else {
      lines.push(`• Demos: Not yet provided (pending booking rate)`);
    }
    if (typeof customers === 'number' && hasCloseRate) {
      lines.push(`• Customers (${formatPercent(closeRate!)} close rate): ${formatNumber(customers)}`);
    } else {
      lines.push(`• Customers: Not yet provided (pending close rate)`);
    }
  } else if (options.includeSummary) {
    lines.push("Here is the summary of your updated funnel:");
    lines.push(`• Visitors: ${formatNumber(visitors)}`);
    lines.push(`• Lead conversion: ${formatPercent(leadRate)}`);
    if (hasDemoRate) lines.push(`• Demo booking rate: ${formatPercent(demoRate!)}`);
    if (hasCloseRate) lines.push(`• Demo close rate: ${formatPercent(closeRate!)}`);
    lines.push(`• Leads: ${formatNumber(leads)}`);
    if (typeof demos === 'number') lines.push(`• Demos: ${formatNumber(demos)}`);
    if (typeof customers === 'number') lines.push(`• Customers: ${formatNumber(customers)}`);
  } else {
    lines.push("Based on the figures provided:");
    lines.push(`• Visitors: ${formatNumber(visitors)}`);
    lines.push(`• Leads: ${formatNumber(leads)} (at ${formatPercent(leadRate)} conversion)`);
    if (typeof demos === 'number' && hasDemoRate) {
      lines.push(`• Demos: ${formatNumber(demos)} (at ${formatPercent(demoRate!)} booking rate)`);
    }
    if (typeof customers === 'number' && hasCloseRate) {
      lines.push(`• Customers: ${formatNumber(customers)} (at ${formatPercent(closeRate!)} close rate)`);
    }
  }

  if (options.baselineFunnel && typeof customers === 'number' && typeof options.baselineFunnel.customers === 'number') {
    const diff = customers - options.baselineFunnel.customers;
    const sign = diff >= 0 ? '+' : '';
    const pct = options.baselineFunnel.customers > 0 ? Math.round((diff / options.baselineFunnel.customers) * 100) : 0;
    lines.push(`\nThis represents an incremental lift of ${sign}${formatNumber(diff)} closed customers (${sign}${pct}% overall change).`);
  }

  if (options.includeExperimentRecommendation) {
    lines.push("\nRecommended First Experiment:");
    lines.push("Focus on the top-of-funnel lead conversion (moving from visitor to qualified lead). Because every 1% lift at this stage compounds downstream through your demo booking and demo close rates, testing high-intent conversational capture on your high-traffic pages offers the highest immediate return before attempting to optimize rep closing skills.");
  }

  return lines.join('\n');
}

/**
 * Calculates hypothetical customer revenue
 */
export function buildHypotheticalRevenueResponse(
  price: number,
  customers: number
): string {
  const monthly = price * customers;
  const annual = monthly * 12;

  return `At $${formatNumber(price)}/month across ${formatNumber(customers)} customers, that generates $${formatNumber(monthly)} in monthly recurring revenue ($${formatNumber(annual)} ARR).\n\n(Note: This is based entirely on your hypothetical SaaS pricing and does not reflect AI Workforce's verified terms).`;
}

/**
 * Direct calculator for 4-stage funnel
 */
export function calculateFunnelStages(params: {
  visitors: number;
  visitorToLeadRate: number;
  leadToDemoRate: number;
  demoToCustomerRate: number;
}): {
  visitors: number;
  leads: number;
  demos: number;
  customers: number;
} {
  const visitors = params.visitors;
  const leads = Math.round(visitors * params.visitorToLeadRate);
  const demos = Math.round(leads * params.leadToDemoRate);
  const customers = Math.round(demos * params.demoToCustomerRate);
  return { visitors, leads, demos, customers };
}

/**
 * Compares two funnel calculation states and computes incremental lift
 */
export function compareFunnelLift(
  baseline: { visitors: number; leads: number; demos: number; customers: number },
  improved: { visitors: number; leads: number; demos: number; customers: number }
): {
  incrementalLeads: number;
  incrementalDemos: number;
  incrementalCustomers: number;
  percentageLift: number;
} {
  const incrementalLeads = improved.leads - baseline.leads;
  const incrementalDemos = improved.demos - baseline.demos;
  const incrementalCustomers = improved.customers - baseline.customers;
  const percentageLift = baseline.customers > 0 ? (incrementalCustomers / baseline.customers) * 100 : 0;
  return { incrementalLeads, incrementalDemos, incrementalCustomers, percentageLift };
}

/**
 * Parses simple numerical expressions from natural language
 */
export function parseNumericalExpression(text: string): { expression: string; result: number } | null {
  const match = text.match(/\$\s*(\d+[\d,]*)(?:\s*\/\s*(?:mo|month))?\s*(?:and|with|for|\*|x)\s*(\d+[\d,]*)\s*customers/i) ||
    text.match(/charge\s+(?:customers\s+)?\$\s*(\d+[\d,]*)[^\d]+(\d+[\d,]*)\s+customers/i);
  if (match) {
    const val1 = parseInt(match[1].replace(/,/g, ''), 10);
    const val2 = parseInt(match[2].replace(/,/g, ''), 10);
    if (!isNaN(val1) && !isNaN(val2)) {
      return {
        expression: `${val1} * ${val2}`,
        result: val1 * val2,
      };
    }
  }
  return null;
}
