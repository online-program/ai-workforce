/**
 * Alpha Correction Resolver
 * 
 * Accurately detects and resolves user corrections across:
 * - Conversion rates and percentages (e.g. "Actually, my demo-to-customer conversion rate is 25%, not 20%")
 * - Volume and period transitions (e.g. "Actually, forget 70. It's closer to 40–50 leads per month")
 * - Headcount and office counts (e.g. "Correction: we have 12 employees, not 10")
 * - Pricing and budget
 * - Identity and personal claims
 * 
 * Crucially distinguishes genuine corrections from conversational transitions
 * (e.g. "Actually, forget the website. We also run a clothing brand on the side. Could Alpha help us with that too?")
 * which must NEVER be swallowed as a silent fact update.
 */

import { AlphaConversationMemory, registerOrUpdateFact } from './alphaMemory.ts';
import {
  FunnelCalculationState,
  parseFunnelExpressions,
  recalculateFunnel,
  formatPercent,
  formatNumber,
} from './alphaNumericalEngine.ts';

export interface CorrectionResolution {
  isCorrection: boolean;
  isContextSwitch: boolean;
  targetVariable?: string;
  variableLabel?: string;
  previousValue?: string | number;
  newValue?: string | number;
  unit?: string;
  dataType?: 'percentage' | 'number' | 'currency' | 'range' | 'string';
  isAmbiguous: boolean;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  directConfirmationMessage?: string;
  dependentCalculationsRun?: boolean;
}

/**
 * Evaluates whether a message contains an explicit correction, resolves it,
 * and updates memory and numerical models accurately.
 */
export function resolveCorrection(
  message: string,
  memory: AlphaConversationMemory
): CorrectionResolution {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  // 0. Filter out Non-Corrections / Context Switches / Topic Changes
  // e.g. "Actually, forget the website. We also run a clothing brand on the side. Could Alpha help us with that too?"
  const isQuestionOrInquiry =
    /\b(?:could|can|would|do|does|how|what|why|will|is|are)\b/i.test(lower) &&
    /\?/.test(msg);

  const isContextSwitchInquiry =
    /\b(?:forget (?:the )?(?:website|saas|agency|previous)|scratch that|never mind (?:that|the))\b/i.test(lower) &&
    /\b(?:clothing|brand|store|clinic|shop|firm|consultancy|also run|also have|new business)\b/i.test(lower);

  if (isContextSwitchInquiry || (lower.startsWith('actually') && isQuestionOrInquiry && !lower.includes('not '))) {
    return {
      isCorrection: false,
      isContextSwitch: true,
      isAmbiguous: false,
      requiresClarification: false,
    };
  }

  // Filter out founder identification (handled separately)
  if (/\b(?:i am|i'm|im|this is)\s+magnus\b/i.test(lower)) {
    return {
      isCorrection: false,
      isContextSwitch: false,
      isAmbiguous: false,
      requiresClarification: false,
    };
  }

  // 1. Conversion Rate / Funnel Percentage Correction
  // "Actually, my demo-to-customer conversion rate is 25%, not 20%. Update the model."
  // "My close rate is 25%, not 20%."
  // "Update lead conversion to 5%."
  const rateCorrectionMatch =
    msg.match(/(?:actually,?\s*)?(?:my\s+)?(demo-to-customer(?:\s+conversion)?(?:\s+rate)?|demo\s+close\s+rate|close\s+rate|lead\s+conversion(?:\s+rate)?|demo\s+booking(?:\s+rate)?)\s*(?:is|=|to)?\s*(\d+(?:\.\d+)?)\s*%(?:[,\s]+not\s+(\d+(?:\.\d+)?)\s*%)?/i) ||
    msg.match(/(?:increase|raise|change|update)\s+(?:the\s+)?(lead\s+conversion(?:\s+rate)?|demo\s+booking(?:\s+rate)?|demo-to-customer|close\s+rate)[^0-9%]*(?:from\s+\d+(?:\.\d+)?\s*%\s*)?to\s+(\d+(?:\.\d+)?)\s*%/i);

  if (rateCorrectionMatch) {
    const rawTarget = rateCorrectionMatch[1].toLowerCase();
    const newRateNum = parseFloat(rateCorrectionMatch[2]);
    const oldRateNum = rateCorrectionMatch[3] ? parseFloat(rateCorrectionMatch[3]) : undefined;

    let targetKey = 'demoCloseRate';
    let label = 'demo-to-customer conversion rate';

    if (rawTarget.includes('lead')) {
      targetKey = 'leadConversionRate';
      label = 'lead conversion rate';
    } else if (rawTarget.includes('booking')) {
      targetKey = 'demoBookingRate';
      label = 'demo booking rate';
    }

    // Ensure memory funnel state exists
    const existingFunnel: FunnelCalculationState = (memory as any).funnel_state || {
      visitors: 20000,
      leadConversionRate: 0.04,
      leads: 800,
      demoBookingRate: 0.30,
      demos: 240,
      demoCloseRate: 0.20,
      customers: 48,
      isHypothetical: true,
      historyOfChanges: [],
    };

    const prevVal = oldRateNum !== undefined ? oldRateNum / 100 : (existingFunnel as any)[targetKey];
    (existingFunnel as any)[targetKey] = newRateNum / 100;

    existingFunnel.historyOfChanges.push({
      turn: memory.turn_count,
      variable: targetKey,
      oldValue: prevVal,
      newValue: newRateNum / 100,
      reason: msg,
    });

    const recalculated = recalculateFunnel(existingFunnel, memory.turn_count);
    (memory as any).funnel_state = recalculated;
    registerOrUpdateFact(memory, label, `${newRateNum}%`, 1.0, true);

    const confirmationMsg = `Understood! I've updated your ${label} to ${newRateNum}%${prevVal ? ` (from ${formatPercent(prevVal)})` : ''}.\n\nWith this update, your pipeline now projects ${formatNumber(recalculated.customers || 0)} customers (from ${formatNumber(recalculated.demos || 0)} demos and ${formatNumber(recalculated.leads || 0)} leads).`;

    return {
      isCorrection: true,
      isContextSwitch: false,
      targetVariable: targetKey,
      variableLabel: label,
      previousValue: prevVal ? formatPercent(prevVal) : undefined,
      newValue: `${newRateNum}%`,
      unit: '%',
      dataType: 'percentage',
      isAmbiguous: false,
      requiresClarification: false,
      directConfirmationMessage: confirmationMsg,
      dependentCalculationsRun: true,
    };
  }

  // 2. Employee Count / Team Size Correction
  // "Correction: we have 12 employees, not 10."
  // "Actually, we have 12 employees, not 10"
  const empCorrectionMatch =
    msg.match(/(?:correction[:\s]|actually,?\s*)(?:we\s+have|with|team\s+of)?\s*(\d+[\d,]*)\s+(?:employees|staff|workers)(?:[,\s]+not\s+(\d+[\d,]*))?/i);

  if (empCorrectionMatch) {
    const newEmp = empCorrectionMatch[1].replace(/,/g, '');
    const oldEmp = empCorrectionMatch[2]?.replace(/,/g, '');

    memory.historical_memory.team = `${newEmp} employees`;
    registerOrUpdateFact(memory, 'employee_count', newEmp, 1.0, true);
    registerOrUpdateFact(memory, 'Team Size', `${newEmp} employees`, 1.0, true);

    const confirmationMsg = `Understood, thank you for that correction. I've updated your team size to ${newEmp} employees${oldEmp ? ` (from ${oldEmp})` : ''}.`;

    return {
      isCorrection: true,
      isContextSwitch: false,
      targetVariable: 'employee_count',
      variableLabel: 'employee count',
      previousValue: oldEmp ? `${oldEmp} employees` : undefined,
      newValue: `${newEmp} employees`,
      unit: 'employees',
      dataType: 'number',
      isAmbiguous: false,
      requiresClarification: false,
      directConfirmationMessage: confirmationMsg,
    };
  }

  // 3. Visitor Count Correction
  // "Actually, I get 5,000 visitors."
  // "Actually, my website visitors are 5,000"
  const visCorrectionMatch =
    msg.match(/(?:actually,?\s*|correction[:\s])(?:i\s+get|we\s+get|my\s+website\s+visitors?\s*(?:are|is)?)\s*(\d+[\d,]*)\s*(?:website\s+)?visitors(?:\s*(?:monthly|per month|a month))?/i);

  if (visCorrectionMatch) {
    const rawCount = visCorrectionMatch[1].replace(/,/g, '');
    const formatted = `${formatNumber(parseInt(rawCount, 10))} visitors/month`;

    const prevVis = memory.website_visitors;
    if (prevVis) {
      memory.historical_memory.superseded_visitors = prevVis;
    }
    memory.website_visitors = formatted;
    registerOrUpdateFact(memory, 'Visitor Volume', formatted, 1.0, true);

    // If funnel state exists, update visitors and recalculate
    if ((memory as any).funnel_state) {
      (memory as any).funnel_state.visitors = parseInt(rawCount, 10);
      (memory as any).funnel_state = recalculateFunnel((memory as any).funnel_state, memory.turn_count);
    }

    const confirmationMsg = `Understood, thank you for that correction. I've updated your website traffic to ${formatted}.`;

    return {
      isCorrection: true,
      isContextSwitch: false,
      targetVariable: 'website_visitors',
      variableLabel: 'website visitors',
      previousValue: prevVis,
      newValue: formatted,
      unit: 'visitors/month',
      dataType: 'number',
      isAmbiguous: false,
      requiresClarification: false,
      directConfirmationMessage: confirmationMsg,
    };
  }

  // 4. Intra-Message Volume Correction (e.g. "receives 40 ... Correction: actual number is 65 per month")
  const intraMessageCorrection = msg.match(
    /(?:(?:receives?|gets?|have|had|with)\s+)?(\d+(?:\s*(?:to|–|-)\s*\d+)?)\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?[^.]*?[.!?]+\s*(?:correction[:\s]|actually|corrected figure|checked our records)[^0-9]*?(?:actual\s+)?(?:number|figure|count|total|it's|it is)?\s*(?:is|was|=)?\s*(\d+(?:\s*(?:to|–|-)\s*\d+)?)\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i
  );

  if (intraMessageCorrection) {
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

    memory.historical_memory.superseded_lead_volume = prevVolStr;
    memory.historical_memory.lead_volume = newVolStr;
    memory.requirements.lead_volume = newVolStr;
    registerOrUpdateFact(memory, 'Lead Volume', newVolStr, 1.0, true);
    registerOrUpdateFact(memory, 'monthly_leads', newVolStr, 1.0, true);

    const confirmationMsg = `Understood, thank you for that correction. I've updated your information to ${newVolStr}.`;

    return {
      isCorrection: true,
      isContextSwitch: false,
      targetVariable: 'lead_volume',
      variableLabel: 'lead volume',
      previousValue: prevVolStr,
      newValue: newVolStr,
      unit: `${newNoun}/${newUnit}`,
      dataType: 'range',
      isAmbiguous: false,
      requiresClarification: false,
      directConfirmationMessage: confirmationMsg,
    };
  }

  // 5. "Actually, forget [old]. It's closer to [new]..."
  const forgetMatch = msg.match(/(?:actually,?\s*)?forget\s+(\d+(?:\s*(?:to|–|-)\s*\d+)?)[^0-9]+(?:(?:closer to|it's|it is|make that)\s*)?(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i);

  if (forgetMatch) {
    const forgotten = forgetMatch[1];
    const min = forgetMatch[2];
    const max = forgetMatch[3];
    const explicitNoun = forgetMatch[4] || 'leads';
    const rawUnit = forgetMatch[5] || 'month';
    const unit = rawUnit.startsWith('w') ? 'week' : rawUnit.startsWith('d') ? 'day' : 'month';

    const rangeStr = max ? `${min}–${max}` : `${min}`;
    const volumeStr = `${rangeStr} ${explicitNoun}/${unit}`;
    const prevVol = `${forgotten} ${explicitNoun}/${unit}`;

    memory.historical_memory.superseded_lead_volume = prevVol;
    memory.historical_memory.lead_volume = volumeStr;
    memory.requirements.lead_volume = volumeStr;
    registerOrUpdateFact(memory, 'Lead Volume', volumeStr, 1.0, true);

    const confirmationMsg = `Understood, thank you for that correction. I've updated your information to ${volumeStr}.`;

    return {
      isCorrection: true,
      isContextSwitch: false,
      targetVariable: 'lead_volume',
      variableLabel: 'lead volume',
      previousValue: prevVol,
      newValue: volumeStr,
      unit: `${explicitNoun}/${unit}`,
      dataType: 'range',
      isAmbiguous: false,
      requiresClarification: false,
      directConfirmationMessage: confirmationMsg,
    };
  }

  // 6. Generic "Actually, make that [X] leads"
  const makeThatMatch = msg.match(/(?:actually,?\s*make that|update to|change to)\s+(\d+(?:\s*(?:to|–|-)\s*\d+)?)\s*(?:(?:inbound|project|client|customer|sales|website|web|new)\s+)?(leads?|inquiries|inquiry|enquiries|enquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i);

  if (makeThatMatch) {
    const rawCount = makeThatMatch[1];
    const explicitNoun = makeThatMatch[2] || (memory.requirements.lead_volume?.includes('inquir') ? 'inquiries' : 'leads');
    const rawUnit = makeThatMatch[3] || (memory.requirements.lead_volume?.includes('week') ? 'week' : 'month');
    const unit = rawUnit.startsWith('w') ? 'week' : 'month';

    const volumeStr = `${rawCount} ${explicitNoun}/${unit}`;
    const prevVol = memory.requirements.lead_volume;

    memory.historical_memory.superseded_lead_volume = prevVol;
    memory.historical_memory.lead_volume = volumeStr;
    memory.requirements.lead_volume = volumeStr;
    registerOrUpdateFact(memory, 'Lead Volume', volumeStr, 1.0, true);

    const confirmationMsg = `Understood, thank you for that correction. I've updated your information to ${volumeStr}.`;

    return {
      isCorrection: true,
      isContextSwitch: false,
      targetVariable: 'lead_volume',
      variableLabel: 'lead volume',
      previousValue: prevVol,
      newValue: volumeStr,
      unit: `${explicitNoun}/${unit}`,
      dataType: 'range',
      isAmbiguous: false,
      requiresClarification: false,
      directConfirmationMessage: confirmationMsg,
    };
  }

  return {
    isCorrection: false,
    isContextSwitch: false,
    isAmbiguous: false,
    requiresClarification: false,
  };
}
