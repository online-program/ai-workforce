import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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
import { issueVisitorSessionToken } from '../src/server/visitorSessionService.ts';
import {
  classifyVisitorIntent,
  shouldRegisterEnquiry,
  normalizeEnquiry,
  persistCanonicalEnquiry,
  memoryEnquiryStore,
} from '../src/server/canonicalEnquiryService.ts';
import {
  createDurableHandoff,
  processOutboxNotification,
  acceptHumanHandoff,
  sendHumanHandoffReply,
  returnControlToAlpha,
  memoryHandoffStore,
} from '../src/server/durableHandoffService.ts';
import { retrieveRelevantBrainSlice, invalidateBrainCache } from '../src/server/alphaBrainRetriever.ts';
import { evaluateAlphaDecision } from '../src/server/alphaDecisionEngine.ts';
import { sanitizeAndVerifyResponse, generateDeterministicFallback } from '../src/server/alphaResponseGenerator.ts';
import { getOrCreateAlphaMemory, updateMemoryFromMessage, resetAlphaMemory } from '../src/server/alphaMemory.ts';
import { trackVisitorSession, getVisitorSessions } from '../src/server/analyticsService.ts';
import { PLATFORM_OFFICIAL_TENANT_ID } from '../src/server/platformConfig.ts';

process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_DB = '1';

describe('Phase 8B/C/D/E — Core Business Flows, Multi-Tenant Neutrality & Persistence Tests', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setAdminDbForTesting(mockDb as any);
    conversationMemoryStore.clear();
    idempotencyMemoryStore.clear();
    memoryEnquiryStore.clear();
    memoryHandoffStore.clear();
    invalidateBrainCache();
  });

  afterEach(() => {
    setAdminDbForTesting(null);
  });

  it('persists and reloads widget settings durably across cache invalidation (simulated server restart)', async () => {
    const saved = await savePublicWidgetConfig({
      widget_id: 'wgt_saas_alpha',
      user_id: 'tenant-saas-1',
      business_name: 'PulseFlow CRM',
      theme_color: '#2563eb',
      position: 'bottom-left',
      company_profile: {
        name: 'PulseFlow CRM',
        brandName: 'PulseFlow CRM',
        industry: 'B2B SaaS',
        pricing: 'Starter Plan is $49/month, Growth Plan is $149/month.',
        products: 'Pipeline Automation ($49/mo), Revenue Forecasting ($149/mo)',
      } as any,
    });

    assert.equal(saved.business_name, 'PulseFlow CRM');
    assert.equal(saved.position, 'bottom-left');

    // Simulate process restart by clearing in-memory cache
    invalidateWidgetCache('wgt_saas_alpha');

    const reloaded = await resolvePublicWidget('wgt_saas_alpha');
    assert.ok(reloaded);
    assert.equal(reloaded.business_name, 'PulseFlow CRM');
    assert.equal(reloaded.user_id, 'tenant-saas-1');
    assert.equal(reloaded.position, 'bottom-left');
    assert.equal(reloaded.company_profile?.pricing, 'Starter Plan is $49/month, Growth Plan is $149/month.');
  });

  it('maintains strict multi-tenant neutrality across 3 distinct synthetic tenants (SaaS, Clothing, Education)', () => {
    const saasProfile: any = {
      _tenantId: 'tenant-saas',
      _widgetId: 'wgt-saas',
      name: 'Nimbus Metrics',
      brandName: 'Nimbus Metrics',
      industry: 'SaaS Analytics',
      pricing: 'Team Plan is $79/month; Business Plan is $249/month.',
      products: 'Event Tracking, Funnel Reports',
      founderName: 'Elena Vance',
    };

    const clothingProfile: any = {
      _tenantId: 'tenant-clothing',
      _widgetId: 'wgt-clothing',
      name: 'Loom & Cedar Apparel',
      brandName: 'Loom & Cedar Apparel',
      industry: 'Retail Apparel',
      pricing: 'Organic Linen Shirts are $68; Merino Coats are $220.',
      products: 'Organic Linen Shirts ($68), Merino Coats ($220)',
      founderName: 'Arjun Patel',
    };

    const educationProfile: any = {
      _tenantId: 'tenant-edu',
      _widgetId: 'wgt-edu',
      name: 'Northstar Coding Academy',
      brandName: 'Northstar Coding Academy',
      industry: 'Technical Education',
      pricing: 'Full-Stack Bootcamp tuition is $3,200 per cohort.',
      products: 'Full-Stack Bootcamp ($3,200), SQL Intensive ($450)',
      founderName: 'Dr. Clara Gomez',
    };

    const tenants = [
      { profile: saasProfile, forbiddenTerms: ['AI Workforce', 'Magnus Verity', 'Loom & Cedar', 'Northstar', 'free for now'] },
      { profile: clothingProfile, forbiddenTerms: ['AI Workforce', 'Magnus Verity', 'Nimbus Metrics', 'Northstar', 'free for now'] },
      { profile: educationProfile, forbiddenTerms: ['AI Workforce', 'Magnus Verity', 'Nimbus Metrics', 'Loom & Cedar', 'free for now'] },
    ];

    for (const { profile, forbiddenTerms } of tenants) {
      const slice = retrieveRelevantBrainSlice(profile, 'Is that monthly? What are you doing and who is your founder?');
      assert.equal(slice.isOfficialAiWorkforce, false);
      assert.equal(slice.companyName, profile.name);

      const mem = getOrCreateAlphaMemory(`conv-${profile._tenantId}`, undefined, profile._tenantId);

      // Pricing cadence question MUST NOT return AI Workforce free-for-now reply
      const cadenceDecision = evaluateAlphaDecision('Is that monthly?', mem, slice);
      assert.notEqual(cadenceDecision.topic, 'pricing_cadence_clarification');

      // "What are you doing?" MUST reference tenant brand, never AI Workforce
      const activityDecision = evaluateAlphaDecision('What are you doing?', mem, slice);
      assert.ok(activityDecision.groundedResponse);
      for (const term of forbiddenTerms) {
        assert.equal(
          activityDecision.groundedResponse!.includes(term),
          false,
          `Tenant '${profile.name}' activity response leaked '${term}'`
        );
      }

      // Founder query MUST return tenant founder, never Magnus Verity
      const founderDecision = evaluateAlphaDecision('Who is your founder?', mem, slice);
      assert.ok(founderDecision.groundedResponse?.includes(profile.founderName));
      assert.equal(founderDecision.groundedResponse?.includes('Magnus Verity'), false);

      // Deterministic fallback MUST obey tenant isolation and verified: false when ungrounded
      const fallback = generateDeterministicFallback(
        {
          brain: slice,
          memory: mem,
          decision: cadenceDecision,
          message: 'Tell me about pricing',
          history: [],
        } as any,
        'test_fallback'
      );
      for (const term of forbiddenTerms) {
        assert.equal(
          fallback.reply.includes(term),
          false,
          `Tenant '${profile.name}' fallback leaked '${term}'`
        );
      }
      resetAlphaMemory(`conv-${profile._tenantId}`, profile._tenantId);
    }

    // Verify official AI Workforce tenant resolves exclusively when server tenant ID matches PLATFORM_OFFICIAL_TENANT_ID
    const officialSlice = retrieveRelevantBrainSlice(
      { _tenantId: PLATFORM_OFFICIAL_TENANT_ID, _widgetId: 'official-ai-workforce', name: 'AI Workforce' } as any,
      'Who is your founder?'
    );
    assert.equal(officialSlice.isOfficialAiWorkforce, true);
    assert.ok(officialSlice.founderInfo?.includes('Magnus Verity'));
  });

  it('handles negated human handoff phrases without triggering false escalations and preserves valid punctuated sentences', () => {
    const negPhrases = [
      "I don't want to talk to a human right now.",
      'I do not want to speak to a real person.',
      'Please never transfer me to a representative.',
    ];

    for (const phrase of negPhrases) {
      assert.notEqual(classifyVisitorIntent(phrase), 'human_handoff_request', `False positive intent on: ${phrase}`);
      const mem = getOrCreateAlphaMemory(`neg-${Math.random()}`, undefined, 'tenant-x');
      updateMemoryFromMessage(mem, phrase, []);
      assert.equal(mem.signals.human_requested, false, `False positive memory handoff on: ${phrase}`);
      const slice = retrieveRelevantBrainSlice({ _tenantId: 'tenant-x', name: 'Tenant X' } as any, phrase);
      const decision = evaluateAlphaDecision(phrase, mem, slice);
      assert.notEqual(decision.stage, 'HANDOFF', `False positive decision handoff on: ${phrase}`);
    }

    // Genuine human request triggers handoff
    assert.equal(classifyVisitorIntent('Can I speak to a human please?'), 'human_handoff_request');

    // Sanitizer must preserve complete punctuated sentences ending with prepositions
    const mem = getOrCreateAlphaMemory('san-1', undefined, 'tenant-x');
    const slice = retrieveRelevantBrainSlice({ _tenantId: 'tenant-x', name: 'Tenant X' } as any, 'hi');
    const decision = evaluateAlphaDecision('hi', mem, slice);
    const preserved = sanitizeAndVerifyResponse(
      'Who are you building this with? Tell us what tools you currently rely on.',
      slice,
      mem,
      decision,
      'hi'
    );
    assert.equal(preserved, 'Who are you building this with? Tell us what tools you currently rely on.');
  });

  it('durably persists inquiries (idempotently), handles DB unavailability honestly (db_confirmed: false), and runs complete handoff + outbox lifecycle', async () => {
    const tenantId = 'tenant-saas-1';
    const convId = 'conv-lifecycle-1';

    // 1. Canonical Inquiry Persistence + Duplicate Idempotency
    const enq1 = normalizeEnquiry({
      tenant_id: tenantId,
      widget_id: 'wgt_saas',
      conversation_id: convId,
      visitor_id: 'vis-1',
      original_message: 'I need a quote for 50 seats. Email me at buyer@acme.test',
      intent_type: 'quote_request',
      extracted: { email: 'buyer@acme.test', customer_name: 'Sam Buyer', quantity: '50 seats' },
    });

    const p1 = await persistCanonicalEnquiry(enq1);
    assert.equal(p1.success, true);
    assert.equal(p1.db_confirmed, true);
    assert.equal(p1.is_duplicate, false);

    const p2 = await persistCanonicalEnquiry(enq1);
    assert.equal(p2.success, true);
    assert.equal(p2.db_confirmed, true);
    assert.equal(p2.is_duplicate, true);
    assert.equal(p2.inquiry_id, p1.inquiry_id);

    // Clear in-memory inquiry store and verify Firestore record survives
    memoryEnquiryStore.clear();
    const dbSnap = await mockDb.collection('users').doc(tenantId).collection('inquiries').doc(p1.inquiry_id).get();
    assert.equal(dbSnap.exists, true);
    assert.equal(dbSnap.data()?.customer_email, 'buyer@acme.test');

    // 2. Durable Handoff + Outbox + Lease/Retry/Dead-Letter + Human Takeover + Alpha Pause + Return Control
    const hoRes = await createDurableHandoff({
      tenant_id: tenantId,
      conversation_id: convId,
      enquiry_id: p1.inquiry_id,
      visitor_id: 'vis-1',
      reason: 'Visitor requested human account executive',
      notify_email: 'sales-owner@acme.test',
      tenant_brand_name: 'PulseFlow CRM',
      skip_email_dispatch: true,
    });
    assert.equal(hoRes.success, true);
    assert.equal(hoRes.db_confirmed, true);
    assert.equal(hoRes.handoff?.notification_status, 'queued');

    const outboxId = `notif_${hoRes.handoff!.handoff_id}`;
    const outboxRef = mockDb.collection('users').doc(tenantId).collection('notification_outbox').doc(outboxId);

    // Concurrent lease protection: mark as actively leased, verify second worker skips it
    await outboxRef.set({ status: 'sending', lease_expires_at: new Date(Date.now() + 30_000).toISOString() }, { merge: true });
    const leaseSkipped = await processOutboxNotification(tenantId, outboxId);
    assert.equal(leaseSkipped.skipped, true);

    // Clear lease -> dispatch fails cleanly (no provider API key configured in test env) -> transitions to 'failed' with backoff
    await outboxRef.set({ status: 'queued', lease_expires_at: null, attempts: 0 }, { merge: true });
    const failedOnce = await processOutboxNotification(tenantId, outboxId);
    assert.equal(failedOnce.success, false);
    assert.equal(failedOnce.status, 'failed');

    // Verify retry backoff blocks immediate retry
    const backoffSkipped = await processOutboxNotification(tenantId, outboxId);
    assert.equal(backoffSkipped.skipped, true);

    // Simulate reaching MAX_NOTIFICATION_ATTEMPTS -> transitions to 'dead_letter'
    await outboxRef.set({ attempts: 4, next_retry_at: new Date(Date.now() - 1000).toISOString() }, { merge: true });
    const deadLettered = await processOutboxNotification(tenantId, outboxId);
    assert.equal(deadLettered.success, false);
    assert.equal(deadLettered.status, 'dead_letter');

    // 3. Human Takeover pauses Alpha cleanly while recording customer messages
    await savePublicWidgetConfig({
      widget_id: 'wgt_saas',
      user_id: tenantId,
      business_name: 'PulseFlow CRM',
    });

    const acceptRes = await acceptHumanHandoff({
      tenant_id: tenantId,
      conversation_id: convId,
      employee_uid: tenantId,
      employee_email: 'owner@pulseflow.test',
    });
    assert.equal(acceptRes.success, true);

    const pausedChatRes = await handleWidgetChat({
      widget_id: 'wgt_saas',
      conversation_id: convId,
      visitor_id: 'vis-1',
      message: 'Hello, is a human rep there?',
    });
    assert.equal(pausedChatRes.human_owned, true);
    assert.equal(pausedChatRes.reply, '');
    assert.equal(pausedChatRes.db_confirmed, true);

    // Human sends reply -> stored durably for visitor sync
    const humanReplyRes = await sendHumanHandoffReply({
      tenant_id: tenantId,
      conversation_id: convId,
      employee_uid: tenantId,
      employee_email: 'owner@pulseflow.test',
      reply_text: 'Hi Sam, Alex from PulseFlow here! Happy to walk through the 50-seat quote.',
    });
    assert.equal(humanReplyRes.success, true);
    assert.ok(humanReplyRes.message_id);

    const convSnap = await mockDb.collection('users').doc(tenantId).collection('conversations').doc(convId).get();
    const msgs = convSnap.data()?.messages || [];
    assert.ok(msgs.some((m: any) => m.sender_type === 'human' && m.text.includes('Alex from PulseFlow')));

    // Return control to Alpha
    const returnRes = await returnControlToAlpha({
      tenant_id: tenantId,
      conversation_id: convId,
      employee_uid: tenantId,
    });
    assert.equal(returnRes.success, true);
    const convSnapAfter = await mockDb.collection('users').doc(tenantId).collection('conversations').doc(convId).get();
    assert.equal(convSnapAfter.data()?.human_owned, false);

    // 4. Honest failure reporting when DB is unavailable (never fake db_confirmed: true)
    setAdminDbForTesting(null);
    const noDbEnq = await persistCanonicalEnquiry(
      normalizeEnquiry({
        tenant_id: tenantId,
        widget_id: 'wgt_saas',
        conversation_id: 'conv-nodb',
        visitor_id: 'vis-nodb',
        original_message: 'Pricing please',
        intent_type: 'pricing_question',
        extracted: {},
      })
    );
    assert.equal(noDbEnq.success, false);
    assert.equal(noDbEnq.db_confirmed, false);
  });

  it('enforces analytics consent policy (granted vs denied vs missing) and tenant-scoped visitor sessions', () => {
    const uniqueTag = `vis_${Date.now()}`;
    // Missing consent -> must NOT track
    assert.equal(
      trackVisitorSession({
        visitorId: `${uniqueTag}_missing`,
        widgetId: 'wgt-consent',
        action: 'LOAD',
      }),
      null
    );

    // Explicit denied consent -> must NOT track
    assert.equal(
      trackVisitorSession({
        visitorId: `${uniqueTag}_denied`,
        widgetId: 'wgt-consent',
        action: 'LOAD',
        analyticsConsented: false,
      }),
      null
    );

    // Explicit granted consent -> tracks scoped to widgetId
    const tracked = trackVisitorSession({
      visitorId: `${uniqueTag}_granted`,
      widgetId: 'wgt-consent-a',
      tenantId: 'tenant-consent-a',
      action: 'OPEN',
      analyticsConsented: true,
    });
    assert.ok(tracked);
    assert.equal(tracked.widgetId, 'wgt-consent-a');

    const forA = getVisitorSessions({ widgetId: 'wgt-consent-a' });
    const forB = getVisitorSessions({ widgetId: 'wgt-consent-b' });
    assert.ok(forA.some((s) => s.visitorId === `${uniqueTag}_granted`));
    assert.equal(forB.some((s) => s.visitorId === `${uniqueTag}_granted`), false);
  });

  it('verifies simulation mode isolates from production Firestore collections', async () => {
    await savePublicWidgetConfig({
      widget_id: 'wgt_sim_iso',
      user_id: 'owner-iso',
      business_name: 'Iso Studio',
    });

    const simRes = await handleWidgetChat({
      widget_id: 'wgt_sim_iso',
      conversation_id: 'conv-sim-only',
      visitor_id: 'owner-iso',
      message: 'My email is test@example.com and I want a quote please',
      environment: 'simulation',
      _authorizedPreview: true,
      _verifiedTenantUserId: 'owner-iso',
    });

    assert.equal(simRes.is_simulated, true);
    assert.equal(simRes.db_confirmed, false);

    const prodConv = await mockDb.collection('users').doc('owner-iso').collection('conversations').doc('conv-sim-only').get();
    assert.equal(prodConv.exists, false);
  });

  it('verifies complete Landing Page widget isolation and 3-tenant signup resilience (NOIRÉ, SaaS, Education)', async () => {
    // 1 & 2. Load AI Workforce landing page widget & verify official ID & config
    const officialWidget = await resolvePublicWidget('official-ai-workforce');
    assert.ok(officialWidget);
    assert.equal(officialWidget.widget_id, 'official-ai-workforce');
    assert.equal(officialWidget.business_name, 'AI Workforce');
    assert.equal(officialWidget.user_id, PLATFORM_OFFICIAL_TENANT_ID);

    // 3. Create Tenant A (NOIRÉ)
    await savePublicWidgetConfig({
      widget_id: 'wgt_noire_a',
      user_id: 'tenant_noire_uid',
      business_name: 'NOIRÉ',
      company_profile: {
        name: 'NOIRÉ',
        brandName: 'NOIRÉ',
        industry: 'Luxury Apparel & Goods',
        pricing: 'Handcrafted leather bags from $450.',
      } as any,
    });

    // 4 & 5. Reload landing page & verify official widget remains unchanged
    const landingAfterNoire = await resolvePublicWidget('official-ai-workforce');
    assert.ok(landingAfterNoire);
    assert.equal(landingAfterNoire.business_name, 'AI Workforce');
    assert.equal(landingAfterNoire.user_id, PLATFORM_OFFICIAL_TENANT_ID);

    // 6. Create Tenant B (SaaS)
    await savePublicWidgetConfig({
      widget_id: 'wgt_saas_b',
      user_id: 'tenant_saas_uid',
      business_name: 'CloudScale Analytics',
      company_profile: {
        name: 'CloudScale Analytics',
        brandName: 'CloudScale Analytics',
        industry: 'SaaS',
        pricing: 'Enterprise tier $999/mo.',
      } as any,
    });

    // 7 & 8. Reload landing page & verify official widget remains unchanged
    const landingAfterSaas = await resolvePublicWidget('official-ai-workforce');
    assert.ok(landingAfterSaas);
    assert.equal(landingAfterSaas.business_name, 'AI Workforce');

    // 9. Create Tenant C (Education)
    await savePublicWidgetConfig({
      widget_id: 'wgt_edu_c',
      user_id: 'tenant_edu_uid',
      business_name: 'Vertex Coding Bootcamp',
      company_profile: {
        name: 'Vertex Coding Bootcamp',
        brandName: 'Vertex Coding Bootcamp',
        industry: 'Education',
        pricing: 'Bootcamp tuition $4,500.',
      } as any,
    });

    // 10 & 11. Reload landing page & verify official widget remains unchanged
    const landingAfterEdu = await resolvePublicWidget('official-ai-workforce');
    assert.ok(landingAfterEdu);
    assert.equal(landingAfterEdu.business_name, 'AI Workforce');

    // 12 & 13. Update Tenant A's Company Brain & verify no other tenant or official config changes
    await savePublicWidgetConfig({
      widget_id: 'wgt_noire_a',
      user_id: 'tenant_noire_uid',
      business_name: 'NOIRÉ Luxe',
      company_profile: {
        name: 'NOIRÉ Luxe',
        brandName: 'NOIRÉ Luxe',
        industry: 'Luxury Apparel',
        pricing: 'Updated silk scarves at $180.',
      } as any,
    });
    const noireReload = await resolvePublicWidget('wgt_noire_a');
    assert.equal(noireReload?.business_name, 'NOIRÉ Luxe');
    const officialCheck13 = await resolvePublicWidget('official-ai-workforce');
    assert.equal(officialCheck13?.business_name, 'AI Workforce');

    // 14 & 15. Update Tenant B's widget settings & verify official widget remains unchanged
    await savePublicWidgetConfig({
      widget_id: 'wgt_saas_b',
      user_id: 'tenant_saas_uid',
      theme_color: '#3b82f6',
      position: 'bottom-left',
    });
    const saasReload = await resolvePublicWidget('wgt_saas_b');
    assert.equal(saasReload?.position, 'bottom-left');
    const officialCheck15 = await resolvePublicWidget('official-ai-workforce');
    assert.equal(officialCheck15?.business_name, 'AI Workforce');

    // 16 & 17. Publish Tenant C's widget & verify official widget remains unchanged
    await savePublicWidgetConfig({
      widget_id: 'wgt_edu_c',
      user_id: 'tenant_edu_uid',
      is_active: true,
    });
    const eduReload = await resolvePublicWidget('wgt_edu_c');
    assert.equal(eduReload?.is_active, true);
    const officialCheck17 = await resolvePublicWidget('official-ai-workforce');
    assert.equal(officialCheck17?.business_name, 'AI Workforce');

    // 18 & 19. Attempt an unauthorized write to the official widget & verify rejection
    await assert.rejects(
      () =>
        savePublicWidgetConfig(
          {
            widget_id: 'official-ai-workforce',
            user_id: 'tenant_noire_uid',
            business_name: 'NOIRÉ Hijack',
          },
          { callerIsPlatformAdmin: false }
        ),
      /Forbidden: Widget ID 'official-ai-workforce' is reserved for the platform official assistant\./i
    );

    // 20. Verify each tenant still loads its own correct widget
    assert.equal((await resolvePublicWidget('wgt_noire_a'))?.business_name, 'NOIRÉ Luxe');
    assert.equal((await resolvePublicWidget('wgt_saas_b'))?.business_name, 'CloudScale Analytics');
    assert.equal((await resolvePublicWidget('wgt_edu_c'))?.business_name, 'Vertex Coding Bootcamp');
    assert.equal((await resolvePublicWidget('official-ai-workforce'))?.business_name, 'AI Workforce');

    // 21. Verify conversations, inquiries and handoffs remain associated with their correct tenant
    const enqNoire = normalizeEnquiry({
      tenant_id: 'tenant_noire_uid',
      widget_id: 'wgt_noire_a',
      conversation_id: 'conv_noire_1',
      visitor_id: 'vis_noire',
      original_message: 'I want a bag',
      intent_type: 'quote_request',
      extracted: {},
    });
    const persNoire = await persistCanonicalEnquiry(enqNoire);
    assert.equal(persNoire.success, true);
    const fetchedNoireEnq = await mockDb.collection('users').doc('tenant_noire_uid').collection('inquiries').doc(persNoire.inquiry_id!).get();
    assert.equal(fetchedNoireEnq.exists, true);

    // 22. Restart server (clear cache) and repeat identity-resolution checks
    invalidateWidgetCache('wgt_noire_a');
    invalidateWidgetCache('wgt_saas_b');
    invalidateWidgetCache('wgt_edu_c');
    invalidateWidgetCache('official-ai-workforce');

    assert.equal((await resolvePublicWidget('official-ai-workforce'))?.business_name, 'AI Workforce');
    assert.equal((await resolvePublicWidget('wgt_noire_a'))?.business_name, 'NOIRÉ Luxe');
    assert.equal((await resolvePublicWidget('wgt_saas_b'))?.business_name, 'CloudScale Analytics');
    assert.equal((await resolvePublicWidget('wgt_edu_c'))?.business_name, 'Vertex Coding Bootcamp');
  });

  it('handles 3-bullet situation summary safely without crashing when business_type is undefined', () => {
    const convId = `conv-summary-${Date.now()}`;
    const mem = getOrCreateAlphaMemory(convId, undefined, 'tenant-summary');
    mem.visitor.business_type = undefined;
    mem.historical_memory.business = undefined;
    mem.historical_memory.team = '12 people';
    mem.requirements.lead_volume = '40 leads/month';
    mem.primary_problem = 'slow follow-up response time';

    const decision = evaluateAlphaDecision(
      'Please summarize my situation in 3 bullets',
      mem,
      {
        companyName: 'AI Workforce',
        industry: 'B2B AI',
        deploymentType: 'PLATFORM',
        summary: 'AI Sales Manager platform.',
        offerings: ['Alpha AI Sales Manager'],
        pricingSummary: '$149/mo',
        policiesSummary: '',
        salesProcessSummary: '',
        relevantFaqs: [],
        forbiddenTopics: [],
      } as any,
      []
    );

    assert.equal(decision.topic, 'situation_comprehension_3_bullets');
    assert.ok(decision.groundedCapabilityResponse?.includes('Unspecified business type'));
    assert.ok(decision.groundedCapabilityResponse?.includes('12 people'));
    assert.ok(decision.groundedCapabilityResponse?.includes('40 leads/month'));
    resetAlphaMemory(convId, 'tenant-summary');
  });
});
