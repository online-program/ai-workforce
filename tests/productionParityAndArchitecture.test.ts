import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import http from 'node:http';
import { MockFirestore } from './helpers/mockFirestore.ts';
import { setAdminDbForTesting } from '../src/server/firebaseAdmin.ts';
import {
  savePublicWidgetConfig,
  resolvePublicWidget,
  handleWidgetChat,
  conversationMemoryStore,
  idempotencyMemoryStore,
  invalidateWidgetCache,
} from '../src/server/widgetHandler.ts';
import {
  ensureClusterVisitorSessionSecret,
  getVisitorSessionSecretStatus,
  isVisitorSessionSecretConfigured,
  issueVisitorSessionToken,
  setRuntimeClusterSigningSecret,
  verifyVisitorSessionToken,
} from '../src/server/visitorSessionService.ts';
import { runNotificationWorker } from '../src/server/notificationWorker.ts';
import { experienceRouter, clearExperienceSessionCacheForTesting } from '../src/server/experienceHandler.ts';

process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_DB = '1';

describe('Production Parity, Distributed Architecture & Multi-Turn Widget Reliability', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setAdminDbForTesting(mockDb as any);
    conversationMemoryStore.clear();
    idempotencyMemoryStore.clear();
    invalidateWidgetCache();
    clearExperienceSessionCacheForTesting();
    setRuntimeClusterSigningSecret(null);
  });

  afterEach(() => {
    setRuntimeClusterSigningSecret(null);
    setAdminDbForTesting(null);
  });

  it('hydrates shared cluster signing secret across simulated Cloud Run instances when VISITOR_SESSION_SECRET is unset', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.VISITOR_SESSION_SECRET;
    try {
      delete process.env.VISITOR_SESSION_SECRET;
      process.env.NODE_ENV = 'production';

      // Initially unconfigured before cluster hydration
      assert.equal(isVisitorSessionSecretConfigured(), false);
      assert.equal(getVisitorSessionSecretStatus().source, 'unconfigured');

      // Instance A cold start hydrates/creates shared Firestore cluster secret
      const okA = await ensureClusterVisitorSessionSecret(mockDb as any);
      assert.equal(okA, true);
      assert.equal(isVisitorSessionSecretConfigured(), true);
      const statusA = getVisitorSessionSecretStatus();
      assert.equal(statusA.source, 'cluster_firestore');
      assert.ok(statusA.fingerprintPrefix && statusA.fingerprintPrefix.length === 8);

      const tokFromInstanceA = issueVisitorSessionToken({
        tenant_id: 'tenant_parity',
        widget_id: 'wgt_parity',
        visitor_id: 'vis_parity',
        conversation_id: 'conv_parity',
      });

      // Simulate Instance B cold start with empty local memory reading the same Firestore
      setRuntimeClusterSigningSecret(null);
      assert.equal(isVisitorSessionSecretConfigured(), false);
      const okB = await ensureClusterVisitorSessionSecret(mockDb as any);
      assert.equal(okB, true);
      const statusB = getVisitorSessionSecretStatus();
      assert.equal(statusB.fingerprintPrefix, statusA.fingerprintPrefix);

      // Token signed by Instance A verifies cleanly on Instance B across all 20 sequential checks
      for (let i = 1; i <= 20; i++) {
        const verified = verifyVisitorSessionToken(tokFromInstanceA, {
          tenant_id: 'tenant_parity',
          widget_id: 'wgt_parity',
          visitor_id: 'vis_parity',
          conversation_id: 'conv_parity',
        });
        assert.equal(verified.valid, true, `Turn ${i} token verification across instances failed`);
      }
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.VISITOR_SESSION_SECRET;
      else process.env.VISITOR_SESSION_SECRET = prevSecret;
    }
  });

  it('fails closed without poisoning widgetConfigCache when savePublicWidgetConfig fails Firestore persistence', async () => {
    // Seed initial clean config first
    await savePublicWidgetConfig({
      widget_id: 'wgt_cache_safety',
      user_id: 'tenant_cache_1',
      business_name: 'Original Safe Corp',
      theme_color: '#111827',
    });

    // Inject Firestore failure on public_widgets write
    const origCollection = mockDb.collection.bind(mockDb);
    (mockDb as any).collection = (name: string) => {
      if (name === 'public_widgets') {
        return {
          doc: () => ({
            get: async () => ({ exists: false, data: () => undefined }),
            set: async () => {
              throw new Error('Simulated Firestore write failure');
            },
          }),
        };
      }
      return origCollection(name);
    };

    await assert.rejects(
      () =>
        savePublicWidgetConfig({
          widget_id: 'wgt_cache_safety',
          user_id: 'tenant_cache_1',
          business_name: 'Unsaved Poisoned Corp',
          theme_color: '#DC2626',
        }),
      /Simulated Firestore write failure/
    );

    // Restore normal db and confirm cache still holds 'Original Safe Corp' (NOT poisoned)
    (mockDb as any).collection = origCollection;
    const resolved = await resolvePublicWidget('wgt_cache_safety');
    assert.ok(resolved);
    assert.equal(resolved.business_name, 'Original Safe Corp');
    assert.equal(resolved.theme_color, '#111827');
  });

  it('deduplicates repeated client_message_id across different Cloud Run instances via Firestore turn lock', async () => {
    await savePublicWidgetConfig({
      widget_id: 'wgt_dist_idemp',
      user_id: 'tenant_dist_1',
      business_name: 'Solaria Energy',
      company_profile: {
        name: 'Solaria Energy',
        brandName: 'Solaria Energy',
        description: 'Commercial solar EPC.',
        whatYouDo: 'Commercial solar installation',
        aiIdentity: 'Sales Assistant',
        aiTone: 'Professional',
        deploymentType: 'BUSINESS',
        inquiryFields: ['Name', 'Email'],
        industry: 'Solar',
        products: 'Rooftop Solar Systems',
        locations: 'Texas',
        tone: 'Professional',
        businessRules: 'Only quote verified site specs.',
      },
    });

    const turn1 = await handleWidgetChat({
      widget_id: 'wgt_dist_idemp',
      conversation_id: 'conv_dist_1',
      visitor_id: 'vis_dist_1',
      message: 'Tell me about your commercial rooftop solar products.',
      client_message_id: 'cmsg_dist_unique_1',
      environment: 'production',
    });
    assert.ok(turn1.reply && turn1.reply.length > 0);
    assert.equal(turn1.db_confirmed, true);

    // Simulate routing retry to a completely fresh Cloud Run instance (empty in-memory stores)
    idempotencyMemoryStore.clear();
    conversationMemoryStore.clear();

    const replayOnNewInstance = await handleWidgetChat({
      widget_id: 'wgt_dist_idemp',
      conversation_id: 'conv_dist_1',
      visitor_id: 'vis_dist_1',
      message: 'Tell me about your commercial rooftop solar products.',
      client_message_id: 'cmsg_dist_unique_1',
      environment: 'production',
    });

    assert.equal(replayOnNewInstance.deduplicated, true);
    assert.equal(replayOnNewInstance.is_idempotent_retry, true);
    assert.equal(replayOnNewInstance.reply, turn1.reply);

    const convSnap = await mockDb
      .collection('users')
      .doc('tenant_dist_1')
      .collection('conversations')
      .doc('conv_dist_1')
      .get();
    const storedMessages = convSnap.data()?.messages || [];
    assert.equal(storedMessages.length, 2, 'Expected strictly 1 customer + 1 assistant message across replica retry');

    // Also ensure a failed distributed turn lock never traps subsequent retries
    await mockDb
      .collection('users')
      .doc('tenant_dist_1')
      .collection('conversations')
      .doc('conv_dist_1')
      .collection('turns')
      .doc('cmsg_failed_recover')
      .set({
        status: 'failed',
        lease_expires_at: 0,
        error: 'Simulated prior abort',
      });

    const recoveredTurn = await handleWidgetChat({
      widget_id: 'wgt_dist_idemp',
      conversation_id: 'conv_dist_1',
      visitor_id: 'vis_dist_1',
      message: 'What locations do you serve?',
      client_message_id: 'cmsg_failed_recover',
      environment: 'production',
    });
    assert.ok(recoveredTurn.reply && recoveredTurn.reply.length > 0);
    assert.notEqual(recoveredTurn.deduplicated, true);
  });

  it('dispatches notification_outbox via collectionGroup without scanning users root collection', async () => {
    const usersScanSpy = { called: false };
    const origCollection = mockDb.collection.bind(mockDb);
    (mockDb as any).collection = (name: string) => {
      if (name === 'users') {
        const real = origCollection(name);
        return {
          doc: real.doc.bind(real),
          get: async () => {
            usersScanSpy.called = true;
            throw new Error('Global users.get() scan must NOT be called');
          },
        };
      }
      return origCollection(name);
    };

    const futureIso = new Date(Date.now() + 600_000).toISOString();
    await mockDb
      .collection('users')
      .doc('tenant_cg_1')
      .collection('notification_outbox')
      .doc('notif_due_1')
      .set({
        notification_id: 'notif_due_1',
        tenant_id: 'tenant_cg_1',
        handoff_id: 'hof_1',
        channel: 'webhook',
        recipient: '',
        subject: 'New Handoff',
        body_summary: 'Customer wants human reply',
        status: 'queued',
        attempts: 0,
        max_attempts: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    await mockDb
      .collection('users')
      .doc('tenant_cg_2')
      .collection('notification_outbox')
      .doc('notif_future_1')
      .set({
        notification_id: 'notif_future_1',
        tenant_id: 'tenant_cg_2',
        handoff_id: 'hof_2',
        channel: 'email',
        recipient: 'owner@example.com',
        subject: 'Later Retry',
        body_summary: 'Retry later',
        status: 'failed',
        next_retry_at: futureIso,
        attempts: 1,
        max_attempts: 3,
      });

    const summary = await runNotificationWorker();
    assert.equal(usersScanSpy.called, false);
    assert.equal(summary.processed, 1);

    (mockDb as any).collection = origCollection;
  });

  it('persists Experience Mode sessions in Firestore across simulated process restart', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/experience', experienceRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as any).port;
    const base = `http://127.0.0.1:${port}/api/experience`;

    try {
      const createRes = await fetch(`${base}/session`, { method: 'POST' });
      assert.equal(createRes.status, 201);
      const createData: any = await createRes.json();
      assert.equal(createData.success, true);

      const { sessionId, capabilityToken } = createData;

      const putRes = await fetch(`${base}/brain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': capabilityToken,
        },
        body: JSON.stringify({
          sessionId,
          stage: 'review',
          companyBrain: {
            name: 'Vanguard Robotics',
            industry: 'Automation',
            description: 'Warehouse cobots.',
            offerings: ['Cobot Arm X1'],
            pricing: 'Custom enterprise lease',
            targetAudience: 'Logistics DCs',
            differentiators: 'Rapid 48h commissioning',
            policies: 'On-site safety audit included',
            salesProcess: 'Technical discovery call',
          },
        }),
      });
      assert.equal(putRes.status, 200);

      // Wipe process-local cache to simulate Cloud Run instance restart
      clearExperienceSessionCacheForTesting();

      const restoreRes = await fetch(`${base}/session/${sessionId}`, {
        headers: { 'x-session-token': capabilityToken },
      });
      assert.equal(restoreRes.status, 200);
      const restored: any = await restoreRes.json();
      assert.equal(restored.companyBrain.name, 'Vanguard Robotics');
      assert.equal(restored.stage, 'review');

      const endRes = await fetch(`${base}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': capabilityToken,
        },
        body: JSON.stringify({ sessionId }),
      });
      assert.equal(endRes.status, 200);

      // Verify wiped from both memory & Firestore
      clearExperienceSessionCacheForTesting();
      const afterEndRes = await fetch(`${base}/session/${sessionId}`, {
        headers: { 'x-session-token': capabilityToken },
      });
      assert.equal(afterEndRes.status, 404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('maintains strict NOIRÉ vs Apex Commercial Solutions isolation & multi-turn continuity', async () => {
    await savePublicWidgetConfig({
      widget_id: 'wgt_noire_fashion',
      user_id: 'tenant_noire_uid',
      business_name: 'NOIRÉ',
      company_profile: {
        name: 'NOIRÉ',
        brandName: 'NOIRÉ',
        description: 'Minimalist tailored fashion house.',
        whatYouDo: 'Architectural silhouettes, Italian wool blazers, silk trousers, and evening wear.',
        aiIdentity: 'Client Concierge',
        aiTone: 'Luxury & Precise',
        deploymentType: 'BUSINESS',
        inquiryFields: ['Name', 'Email', 'Sizing Preference'],
        industry: 'Luxury Fashion',
        products: 'Architectural Wool Blazers, Structured Silk Trousers, Draped Evening Dresses',
        locations: 'Paris & Milan online dispatch',
        tone: 'Refined and helpful',
        businessRules: 'Never quote unverified bespoke pricing; do not mention unrelated software companies.',
      },
    });

    await savePublicWidgetConfig({
      widget_id: 'wgt_apex_commercial',
      user_id: 'tenant_apex_uid',
      business_name: 'Apex Commercial Solutions',
      company_profile: {
        name: 'Apex Commercial Solutions',
        brandName: 'Apex Commercial Solutions',
        description: 'Commercial HVAC & chiller maintenance contracts.',
        whatYouDo: 'Industrial HVAC installation, preventative chiller servicing, and emergency facility maintenance.',
        aiIdentity: 'Engineering Coordinator',
        aiTone: 'Technical & Clear',
        deploymentType: 'BUSINESS',
        inquiryFields: ['Name', 'Work Email', 'Facility Square Footage'],
        industry: 'Commercial HVAC',
        products: 'Chiller Maintenance Contracts, Variable Refrigerant Flow Retrofits',
        locations: 'Chicago Metro & Midwest',
        tone: 'Direct technical precision',
        businessRules: 'Site inspection required before binding SLA quote.',
      },
    });

    // Multi-turn sequence for NOIRÉ (6 consecutive turns)
    const noireMessages = [
      'Hi, what kind of pieces do you carry?',
      'Do you offer Architectural Wool Blazers?',
      'Which cities do you dispatch from?',
      'What details do you need for a styling request?',
      'My name is Claire',
      'What services does Apex Commercial Solutions provide?',
    ];

    for (let idx = 0; idx < noireMessages.length; idx++) {
      const res = await handleWidgetChat({
        widget_id: 'wgt_noire_fashion',
        conversation_id: 'conv_noire_multi_1',
        visitor_id: 'vis_noire_1',
        message: noireMessages[idx],
        client_message_id: `cmsg_noire_${idx + 1}`,
        environment: 'production',
      });
      assert.ok(res.reply && res.reply.trim().length > 0, `NOIRÉ turn ${idx + 1} reply empty`);
      assert.doesNotMatch(res.reply, /\$149\/mo|Chiller Maintenance/i, `NOIRÉ turn ${idx + 1} leaked foreign brand pricing/products`);
    }

    // Sequential check on Apex Commercial
    const apexTurn1 = await handleWidgetChat({
      widget_id: 'wgt_apex_commercial',
      conversation_id: 'conv_apex_multi_1',
      visitor_id: 'vis_apex_1',
      message: 'Tell me about your Chiller Maintenance Contracts in Chicago.',
      client_message_id: 'cmsg_apex_1',
      environment: 'production',
    });
    assert.ok(apexTurn1.reply && apexTurn1.reply.trim().length > 0);
    assert.doesNotMatch(apexTurn1.reply, /Italian wool blazers|Draped Evening Dresses/i);

    const apexTurn2 = await handleWidgetChat({
      widget_id: 'wgt_apex_commercial',
      conversation_id: 'conv_apex_multi_1',
      visitor_id: 'vis_apex_1',
      message: 'What do you need from us before giving a binding quote?',
      client_message_id: 'cmsg_apex_2',
      environment: 'production',
    });
    assert.ok(apexTurn2.reply && apexTurn2.reply.trim().length > 0);
    assert.notEqual(apexTurn2.error_code, 'TOKEN_MISSING');
  });

  it('keeps marketing/playbooks/use-cases free of fabricated benchmarks and keeps widget loaders synchronized', () => {
    const checkedFiles = [
      'src/data/defaultMarketingData.ts',
      'src/server/marketingService.ts',
      'src/data/salesPlaybooks.ts',
      'src/components/ui/IndustryUseCases.tsx',
    ];

    for (const rel of checkedFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
      assert.doesNotMatch(content, /391%|21x|3\.2x|\$149\/mo|aiworkforce\.com|Gartner Enterprise AI Trust Survey 2025|sampleSize:\s*18|SOC 2 Type II/i, `Found unverified marketing/pricing artifact in ${rel}`);
    }

    const publicWidget = fs.readFileSync(path.join(process.cwd(), 'public/widget.js'), 'utf8');
    const rootWidget = fs.readFileSync(path.join(process.cwd(), 'widget.js'), 'utf8');
    assert.equal(publicWidget, rootWidget, 'public/widget.js and root widget.js must remain synchronized');

    const chatComponent = fs.readFileSync(path.join(process.cwd(), 'src/components/CustomerChatWidget.tsx'), 'utf8');
    assert.match(chatComponent, /conversationIdRef/);
    assert.match(chatComponent, /visitorTokenRef/);
    assert.match(chatComponent, /messagesRef/);
    assert.match(chatComponent, /reader\.releaseLock\(\)/);
  });
});
