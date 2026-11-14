import express from 'express';
import http from 'http';
import { experienceRouter } from './src/server/experienceHandler.ts';

async function runTests() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/experience', experienceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}/api/experience`;

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, name: string, detail?: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  };

  console.log('================================================================');
  console.log('      ALPHA EXPERIENCE MODE — AUTOMATED SECURITY & FLOW SUITE   ');
  console.log('================================================================');

  try {
    // 1. Create Guest Session
    const createRes = await fetch(`${baseUrl}/session`, { method: 'POST' });
    const createData = await createRes.json();
    assert(
      createRes.status === 201 && createData.success && createData.sessionId?.length === 48 && createData.capabilityToken?.length === 64,
      '1. Creates cryptographically random guest session & capability token'
    );

    const { sessionId, capabilityToken } = createData;

    // 2. Rejects unauthorized access without capability token
    const unauthRes = await fetch(`${baseUrl}/session/${sessionId}`);
    assert(unauthRes.status === 403, '2. Rejects session retrieval without capability token (403)');

    // 3. Rejects invalid capability token
    const badTokenRes = await fetch(`${baseUrl}/session/${sessionId}`, {
      headers: { 'x-session-token': 'invalid_token_123' },
    });
    assert(badTokenRes.status === 403, '3. Rejects session retrieval with invalid capability token (403)');

    // 4. Allows authorized session retrieval
    const authRes = await fetch(`${baseUrl}/session/${sessionId}`, {
      headers: { 'x-session-token': capabilityToken },
    });
    const authData = await authRes.json();
    assert(authRes.status === 200 && authData.stage === 'created', '4. Allows authorized session retrieval');

    // 5. Rejects chat before live_demo stage
    const earlyChatRes = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': capabilityToken },
      body: JSON.stringify({ sessionId, message: 'Hello' }),
    });
    assert(earlyChatRes.status === 400, '5. Enforces state machine: rejects chat before live_demo (400)');

    // 6. Rejects oversized onboarding message
    const oversizedRes = await fetch(`${baseUrl}/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': capabilityToken },
      body: JSON.stringify({ sessionId, message: 'a'.repeat(1600) }),
    });
    assert(oversizedRes.status === 400, '6. Rejects oversized onboarding message > 1500 chars (400)');

    // 7. Updates Temporary Company Brain
    const brainRes = await fetch(`${baseUrl}/brain`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-session-token': capabilityToken },
      body: JSON.stringify({
        sessionId,
        companyBrain: {
          name: 'Nordic Thread',
          industry: 'Sustainable Apparel',
          description: 'Organic merino wool basics.',
          offerings: ['Merino Crewneck', 'Wool Beanie'],
          pricing: '$95 for Crewneck, $35 for Beanie',
          targetAudience: 'Eco-conscious professionals',
          differentiators: '100% traceable farm-to-garment wool',
        },
        stage: 'review',
      }),
    });
    const brainData = await brainRes.json();
    assert(
      brainRes.status === 200 && brainData.companyBrain?.name === 'Nordic Thread' && brainData.stage === 'review',
      '7. Updates and sanitizes temporary Company Brain'
    );

    // 8. Starts Live Demo
    const startRes = await fetch(`${baseUrl}/start-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': capabilityToken },
      body: JSON.stringify({ sessionId }),
    });
    const startData = await startRes.json();
    assert(
      startRes.status === 200 && startData.stage === 'live_demo' && startData.greeting.includes('Your Alpha is ready'),
      '8. Transitions to live_demo stage with grounded greeting'
    );

    // 9. Cross-session isolation: Session 2 cannot access Session 1
    const createRes2 = await fetch(`${baseUrl}/session`, { method: 'POST' });
    const createData2 = await createRes2.json();
    const crossRes = await fetch(`${baseUrl}/session/${sessionId}`, {
      headers: { 'x-session-token': createData2.capabilityToken },
    });
    assert(crossRes.status === 403, '9. Enforces strict cross-session isolation (403)');

    // 10. Ends and deletes session
    const endRes = await fetch(`${baseUrl}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': capabilityToken },
      body: JSON.stringify({ sessionId }),
    });
    assert(endRes.status === 200, '10. Ends session cleanly');

    const afterEndRes = await fetch(`${baseUrl}/session/${sessionId}`, {
      headers: { 'x-session-token': capabilityToken },
    });
    assert(afterEndRes.status === 404, '11. Deleted session is no longer accessible (404)');
  } finally {
    server.close();
  }

  console.log('================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runTests();
