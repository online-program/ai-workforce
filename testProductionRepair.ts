import { handleWidgetChat } from './src/server/widgetHandler.ts';
import crypto from 'crypto';

async function runTests() {
  console.log('--- Starting Production Repair Verification ---');

  const testWidgetId = 'ai_workforce_official';
  const testConvId = `test-conv-${Date.now()}`;
  const testVisitorId = 'test-visitor-1';

  // 1. Test Short Reply / Preposition Sanitization
  // (We test the backend logic which now shouldn't be overridden by frontend)
  const r1 = await handleWidgetChat({
    widget_id: testWidgetId,
    conversation_id: testConvId,
    visitor_id: testVisitorId,
    message: 'Hello'
  });
  console.log('T1 (Standard Message):', r1.reply ? 'PASS' : 'FAIL');
  console.log('T1 Token:', r1.visitor_session_token ? 'PASS' : 'FAIL');

  // 2. Test Idempotency (Same client_message_id)
  const clientMsgId = `msg-id-${Date.now()}`;
  const payload = {
    widget_id: testWidgetId,
    conversation_id: testConvId,
    visitor_id: testVisitorId,
    message: 'What do you offer?',
    client_message_id: clientMsgId
  };

  console.log('T2: Sending first idempotent request...');
  const r2a = await handleWidgetChat(payload);
  const replyA = r2a.reply;

  console.log('T2: Sending second idempotent request (retry)...');
  const r2b = await handleWidgetChat(payload);
  const replyB = r2b.reply;

  if (replyA === replyB && r2b.is_idempotent_retry) {
    console.log('T2 (Idempotency): PASS');
  } else {
    console.error('T2 (Idempotency): FAIL', { replyA, replyB, is_idempotent_retry: r2b.is_idempotent_retry });
  }

  // 4. Test Production Token Failure (Mock NODE_ENV)
  process.env.NODE_ENV = 'production';
  // Deliberately unset secret to trigger failure
  delete process.env.VISITOR_SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  
  const r4 = await handleWidgetChat({
    widget_id: testWidgetId,
    conversation_id: testConvId,
    visitor_id: testVisitorId,
    message: 'Hello'
  });
  
  // Verify reply exists (meaning the process didn't crash) and token is undefined
  if (r4.reply && r4.visitor_session_token === undefined) {
    console.log('T4 (Prod Token Failure): PASS');
  } else {
    console.error('T4 (Prod Token Failure): FAIL', { reply: !!r4.reply, token: r4.visitor_session_token });
  }

  // Restore environment for other tests
  process.env.NODE_ENV = 'development';

  console.log('--- Verification Complete ---');
}

runTests().catch(console.error);
