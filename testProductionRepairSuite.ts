import assert from 'node:assert/strict';
import {
  validateEmail,
  normalizePhone,
  normalizeCustomerName,
  normalizeQuantity,
  normalizeTimeline,
  normalizeBudget,
  classifyVisitorIntent,
  shouldRegisterEnquiry,
  normalizeEnquiry,
} from './src/server/canonicalEnquiryService.ts';
import { checkRateLimit } from './src/server/adminAuth.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}: ${err?.message || err}`);
    failed++;
  }
}

console.log('=== RUNNING ALPHA PRODUCTION REPAIR VERIFICATION SUITE ===\n');

// 1. Field Extraction & Corruption Prevention
test('E1: "I want a website for my business." does not corrupt Name/Product/Quantity', () => {
  const enq = normalizeEnquiry({
    tenant_id: 'tenant_1',
    widget_id: 'w_1',
    conversation_id: 'conv_1',
    visitor_id: 'vis_1',
    original_message: 'I want a website for my business.',
    intent_type: 'sales_enquiry',
    extracted: {
      name: 'Web Development',
      product_or_service: '1 week',
      quantity: 'I want a website',
    },
  });
  assert.equal(enq.customer_name, null, 'Generic "Web Development" must not be stored as customer_name');
  assert.equal(enq.product_or_service, null, '"1 week" must not be stored as product_or_service');
  assert.equal(enq.quantity, null, '"I want a website" must not be stored as quantity');
  assert.equal(enq.requirement, 'I want a website for my business.');
});

test('E2: Valid email & phone normalization', () => {
  assert.equal(validateEmail('  John.Doe@Example.COM '), 'john.doe@example.com');
  assert.equal(validateEmail('not-an-email'), null);
  assert.equal(normalizePhone('+1 (555) 123-4567'), '+1 (555) 123-4567');
  assert.equal(normalizePhone('123'), null);
});

test('E3: Valid customer name vs non-name rejection', () => {
  assert.equal(normalizeCustomerName('Sarah Jenkins'), 'Sarah Jenkins');
  assert.equal(normalizeCustomerName('Website Development'), null);
  assert.equal(normalizeCustomerName('2 weeks'), null);
  assert.equal(normalizeCustomerName('sarah@acme.com'), null);
});

test('E4: Quantity vs Timeline disambiguation', () => {
  assert.equal(normalizeQuantity('250 units'), '250 units');
  assert.equal(normalizeQuantity('2 weeks'), null);
  assert.equal(normalizeTimeline('2 weeks'), '2 weeks');
  assert.equal(normalizeBudget('$15,000'), '$15,000');
});

// 2. Intent Classification & Negative Examples
test('I1: Negative human handoff ("I don\'t want to speak to a human")', () => {
  const intent = classifyVisitorIntent("I don't want to speak to a human, just checking.");
  assert.notEqual(intent, 'human_handoff_request');
});

test('I2: Positive human handoff ("Can I speak to a human?")', () => {
  const intent = classifyVisitorIntent('Can I speak to a human agent please?');
  assert.equal(intent, 'human_handoff_request');
});

test('I3: Negative buying intent ("The price is interesting, but I\'m not buying")', () => {
  const intent = classifyVisitorIntent("The price is interesting, but I'm not buying today.");
  assert.equal(intent, 'pricing_question');
  assert.equal(shouldRegisterEnquiry(intent, false), false);
});

test('I4: Quote request triggers enquiry registration', () => {
  const intent = classifyVisitorIntent('Can you send a quotation for 50 chairs?');
  assert.equal(intent, 'quote_request');
  assert.equal(shouldRegisterEnquiry(intent, false), true);
});

test('I5: General greeting does not create enquiry', () => {
  const intent = classifyVisitorIntent('Hello there, how are you?');
  assert.equal(intent, 'general_conversation');
  assert.equal(shouldRegisterEnquiry(intent, false), false);
});

test('I6: Spam / empty input', () => {
  assert.equal(classifyVisitorIntent(''), 'spam');
});

// 3. Idempotency & Contact Preservation
test('P1: Stable inquiry_id & contact preservation on update', () => {
  const first = normalizeEnquiry({
    tenant_id: 't1',
    widget_id: 'w1',
    conversation_id: 'conv_abc',
    visitor_id: 'vis_1',
    original_message: 'Need a quote, my email is alex@acme.com',
    intent_type: 'quote_request',
    extracted: { email: 'alex@acme.com', customer_name: 'Alex Rivera' },
  });
  const second = normalizeEnquiry({
    tenant_id: 't1',
    widget_id: 'w1',
    conversation_id: 'conv_abc',
    visitor_id: 'vis_1',
    original_message: 'Actually I need two websites',
    intent_type: 'quote_request',
    extracted: { quantity: '2' },
    existing: first,
  });
  assert.equal(second.inquiry_id, first.inquiry_id);
  assert.equal(second.customer_email, 'alex@acme.com', 'Must not overwrite existing email');
  assert.equal(second.customer_name, 'Alex Rivera', 'Must not overwrite existing name');
  assert.equal(second.quantity, '2');
  assert.equal(second.original_message, first.original_message);
});

// 4. Rate Limiter Verification
test('S1: Rate limiter blocks excessive requests', () => {
  const key = `test_rate_${Date.now()}`;
  assert.equal(checkRateLimit(key, 2, 60000).allowed, true);
  assert.equal(checkRateLimit(key, 2, 60000).allowed, true);
  assert.equal(checkRateLimit(key, 2, 60000).allowed, false);
});

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
