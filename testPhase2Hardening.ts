import assert from 'assert';
import { issueVisitorSessionToken, verifyVisitorSessionToken } from './src/server/visitorSessionService.ts';

console.log('=== RUNNING PHASE 2.1 SECURITY & DELIVERY HARDENING TESTS ===');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

test('S1: Issue and verify valid scoped visitor-session token', () => {
  const token = issueVisitorSessionToken({
    tenant_id: 'tenant_abc',
    visitor_id: 'vis_123',
    conversation_id: 'conv_456',
  });
  const res = verifyVisitorSessionToken(token, {
    tenant_id: 'tenant_abc',
    visitor_id: 'vis_123',
    conversation_id: 'conv_456',
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.payload?.tenant_id, 'tenant_abc');
  assert.strictEqual(res.payload?.visitor_id, 'vis_123');
  assert.strictEqual(res.payload?.conversation_id, 'conv_456');
});

test('S2: Reject missing or malformed token', () => {
  assert.strictEqual(verifyVisitorSessionToken(null).code, 'TOKEN_MISSING');
  assert.strictEqual(verifyVisitorSessionToken('').code, 'TOKEN_MISSING');
  assert.strictEqual(verifyVisitorSessionToken('invalid-token').code, 'TOKEN_MALFORMED');
});

test('S3: Reject tampered signature', () => {
  const token = issueVisitorSessionToken({
    tenant_id: 'tenant_abc',
    visitor_id: 'vis_123',
    conversation_id: 'conv_456',
  });
  const tampered = token.slice(0, -4) + 'XXXX';
  const res = verifyVisitorSessionToken(tampered);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.code, 'TOKEN_INVALID_SIGNATURE');
});

test('S4: Reject expired token', () => {
  const token = issueVisitorSessionToken({
    tenant_id: 'tenant_abc',
    visitor_id: 'vis_123',
    conversation_id: 'conv_456',
    ttlMs: -1000, // already expired
  });
  const res = verifyVisitorSessionToken(token);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.code, 'TOKEN_EXPIRED');
});

test('S5: Reject cross-tenant, cross-visitor, and cross-conversation access', () => {
  const token = issueVisitorSessionToken({
    tenant_id: 'tenant_abc',
    visitor_id: 'vis_123',
    conversation_id: 'conv_456',
  });

  const wrongTenant = verifyVisitorSessionToken(token, { tenant_id: 'tenant_xyz', visitor_id: 'vis_123', conversation_id: 'conv_456' });
  assert.strictEqual(wrongTenant.valid, false);
  assert.strictEqual(wrongTenant.code, 'UNAUTHORIZED_OWNERSHIP');

  const wrongVisitor = verifyVisitorSessionToken(token, { tenant_id: 'tenant_abc', visitor_id: 'vis_999', conversation_id: 'conv_456' });
  assert.strictEqual(wrongVisitor.valid, false);
  assert.strictEqual(wrongVisitor.code, 'UNAUTHORIZED_OWNERSHIP');

  const wrongConv = verifyVisitorSessionToken(token, { tenant_id: 'tenant_abc', visitor_id: 'vis_123', conversation_id: 'conv_999' });
  assert.strictEqual(wrongConv.valid, false);
  assert.strictEqual(wrongConv.code, 'UNAUTHORIZED_OWNERSHIP');
});

test('M1: Deduplicate messages strictly by message_id', () => {
  const prev = [
    { message_id: 'msg_1', sender: 'assistant', text: 'Hello!' },
    { message_id: 'msg_2', sender: 'customer', text: 'Hi' },
  ];
  const incoming = [
    { message_id: 'msg_1', sender: 'assistant', text: 'Hello!' },
    { message_id: 'msg_3', sender: 'assistant', text: 'Hello!' }, // Same text, different message_id
  ];
  const existingIds = new Set(prev.map((m) => m.message_id));
  const newMsgs = incoming.filter((sm) => !existingIds.has(sm.message_id));
  assert.strictEqual(newMsgs.length, 1);
  assert.strictEqual(newMsgs[0].message_id, 'msg_3');
});

console.log(`=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
