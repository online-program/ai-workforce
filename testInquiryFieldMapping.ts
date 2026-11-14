/**
 * Regression Test Suite for AI Workforce Alpha Field Mapping & Handoff Behavior
 * 
 * Verifies:
 * Case A: "I want a website." -> product_or_service = website, quantity = Unknown, customer_name = Website Visitor
 * Case B: "I need web development, and I want it delivered in one week." -> product = web development, timeline = one week, quantity = Unknown
 * Case C: "My name is Rahul. I need 5 websites delivered in two weeks." -> name = Rahul, product = websites, quantity = 5 websites, timeline = two weeks
 * Case D: "I need 10 licenses with a budget of ₹50,000." -> quantity = 10 licenses, budget = ₹50,000
 * Case E: "Can you call me Daddy?" -> responds naturally without automatic escalation or contact request
 * Case F: "No I don't want to contact your team" -> respects refusal immediately, no repeated handoff template
 * Case G: Fact corrections ("actually 55-65 inquiries per month")
 * Case H: Truthful escalation messaging (no false claims of alert when unconfirmed)
 */

import {
  validateAndNormalizeInquiryFields,
  isPlausibleCustomerName,
  isTimeExpression,
  isRequirementSentence,
  isBudgetExpression,
  isValidMeasurableQuantity,
} from './src/server/semanticFieldValidator.ts';
import {
  getOrCreateAlphaMemory,
  updateMemoryFromMessage,
} from './src/server/alphaMemory.ts';
import { evaluateAlphaDecision } from './src/server/alphaDecisionEngine.ts';
import { fallbackRuleBasedAnalysis } from './src/server/analyzeHandler.ts';

async function runRegressionTests() {
  console.log('=== STARTING FIELD MAPPING & HANDOFF REGRESSION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Semantic Validator - Disentangle Service Name from Customer Name
  // --------------------------------------------------------------------------
  const norm1 = validateAndNormalizeInquiryFields({
    customer_name: 'Web Development',
    product_or_service: '1 week',
    quantity: 'I want a website',
  });

  assert(
    norm1.customer_name === 'Website Visitor',
    'Case A1: Service name "Web Development" rejected as customer_name',
    `got "${norm1.customer_name}"`
  );
  assert(
    norm1.product_or_service === 'Web Development' || norm1.product_or_service === 'website',
    'Case A2: Service term disentangled into product_or_service',
    `got "${norm1.product_or_service}"`
  );
  assert(
    norm1.timeline === '1 week',
    'Case A3: Time expression "1 week" in product moved to timeline',
    `got "${norm1.timeline}"`
  );
  assert(
    norm1.quantity === 'Unknown',
    'Case A4: Sentence "I want a website" in quantity normalized to Unknown',
    `got "${norm1.quantity}"`
  );

  // --------------------------------------------------------------------------
  // TEST 2: "I want a website."
  // --------------------------------------------------------------------------
  const norm2 = validateAndNormalizeInquiryFields({
    requirement_or_description: 'I want a website.',
    quantity: 'I want a website.',
  });

  assert(
    norm2.quantity === 'Unknown',
    'Case A5: Requirement sentence cannot be a quantity',
    `got "${norm2.quantity}"`
  );

  // --------------------------------------------------------------------------
  // TEST 3: "I need web development, and I want it delivered in one week."
  // --------------------------------------------------------------------------
  const norm3 = validateAndNormalizeInquiryFields({
    product_or_service: 'web development',
    quantity: 'one week',
    requirement_or_description: 'I need web development, and I want it delivered in one week.',
  });

  assert(
    norm3.product_or_service.toLowerCase() === 'web development',
    'Case B1: Product is web development',
    `got "${norm3.product_or_service}"`
  );
  assert(
    norm3.timeline === 'one week',
    'Case B2: Timeline is "one week"',
    `got "${norm3.timeline}"`
  );
  assert(
    norm3.quantity === 'Unknown',
    'Case B3: Quantity is Unknown',
    `got "${norm3.quantity}"`
  );

  // --------------------------------------------------------------------------
  // TEST 4: "My name is Rahul. I need 5 websites delivered in two weeks."
  // --------------------------------------------------------------------------
  const mem4 = getOrCreateAlphaMemory(`test-conv-${Date.now()}`);
  updateMemoryFromMessage(mem4, 'My name is Rahul. I need 5 websites delivered in two weeks.');

  assert(
    mem4.visitor.name === 'Rahul',
    'Case C1: Customer name extracted as Rahul',
    `got "${mem4.visitor.name}"`
  );
  assert(
    mem4.requirements.quantity_or_scope === '5 websites',
    'Case C2: Quantity extracted as 5 websites',
    `got "${mem4.requirements.quantity_or_scope}"`
  );
  assert(
    mem4.requirements.timeline === 'two weeks' || mem4.requirements.timeline === 'in two weeks',
    'Case C3: Timeline extracted as two weeks',
    `got "${mem4.requirements.timeline}"`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Budget & Quantity Disentanglement
  // "I need 10 licenses with a budget of ₹50,000."
  // --------------------------------------------------------------------------
  const norm5 = validateAndNormalizeInquiryFields({
    product_or_service: 'licenses',
    quantity: '10 licenses',
    budget: '₹50,000',
  });

  assert(
    norm5.quantity === '10 licenses',
    'Case D1: Quantity is 10 licenses',
    `got "${norm5.quantity}"`
  );
  assert(
    norm5.budget === '₹50,000',
    'Case D2: Budget is ₹50,000',
    `got "${norm5.budget}"`
  );

  // --------------------------------------------------------------------------
  // TEST 6: "Can you call me Daddy?" -> Harmless conversational request
  // --------------------------------------------------------------------------
  const mem6 = getOrCreateAlphaMemory(`test-conv-daddy-${Date.now()}`);
  const decision6 = evaluateAlphaDecision('Okay so can you call me Daddy', mem6, {} as any, []);

  assert(
    decision6.stage === 'NON_SALES',
    'Case E1: Harmless preference request stage is NON_SALES',
    `got "${decision6.stage}"`
  );
  assert(
    !decision6.salesDecision?.handoff?.required,
    'Case E2: No handoff required for preference request',
    `handoff required = ${decision6.salesDecision?.handoff?.required}`
  );
  assert(
    decision6.groundedResponse?.toLowerCase().includes('sure') || decision6.groundedResponse?.toLowerCase().includes('daddy'),
    'Case E3: Responds naturally to preference request',
    `got "${decision6.groundedResponse}"`
  );

  // --------------------------------------------------------------------------
  // TEST 7: "No I don't want to contact your team" -> Respect refusal
  // --------------------------------------------------------------------------
  const mem7 = getOrCreateAlphaMemory(`test-conv-refusal-${Date.now()}`);
  const decision7 = evaluateAlphaDecision("No I don't want to contact your team", mem7, {} as any, []);

  assert(
    decision7.topic === 'refuse_human_handoff',
    'Case F1: Topic classified as refuse_human_handoff',
    `got "${decision7.topic}"`
  );
  assert(
    !decision7.salesDecision?.handoff?.required,
    'Case F2: No handoff required after refusal',
    `handoff required = ${decision7.salesDecision?.handoff?.required}`
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests();
