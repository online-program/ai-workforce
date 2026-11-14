import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MockFirestore } from './helpers/mockFirestore.ts';
import { setAdminDbForTesting } from '../src/server/firebaseAdmin.ts';
import {
  savePublicWidgetConfig,
  resolvePublicWidget,
  handleWidgetChat,
  handleWidgetChatStream,
  conversationMemoryStore,
  idempotencyMemoryStore,
  invalidateWidgetCache,
  getStoredConversationFromMemory,
} from '../src/server/widgetHandler.ts';
import { issueVisitorSessionToken } from '../src/server/visitorSessionService.ts';
import {
  ALL_PRESETS,
  DEFAULT_WIDGET_STUDIO_CONFIG,
  getContrastRatio,
  resolveEffectiveThemeMode,
  resolveWidgetThemeTokens,
  sanitizeCssColor,
  sanitizeSafeUrl,
  sanitizeWidgetStudioConfig,
} from '../src/utils/widgetDesignUtils.ts';
import { PLATFORM_OFFICIAL_TENANT_ID } from '../src/server/platformConfig.ts';

process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_DB = '1';

describe('OG Engineering Verification — Widget Isolation, Turn Deduplication, Stream Reliability & Design Tokens', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setAdminDbForTesting(mockDb as any);
    conversationMemoryStore.clear();
    idempotencyMemoryStore.clear();
    invalidateWidgetCache();
  });

  afterEach(() => {
    setAdminDbForTesting(null);
  });

  it('BUG-3.1: locks official-ai-workforce widget strictly immutable even if public_widgets or widget_lookup is poisoned', async () => {
    // Seed poisoned customer data under the reserved official doc IDs
    await mockDb.collection('public_widgets').doc('official-ai-workforce').set({
      widget_id: 'official-ai-workforce',
      user_id: 'malicious_noire_uid',
      business_name: 'NOIRÉ Luxury Atelier',
      welcome_message: 'Welcome to NOIRÉ!',
      theme_color: '#FFD000',
    });
    await mockDb.collection('widget_lookup').doc('official-ai-workforce').set({
      widget_id: 'official-ai-workforce',
      user_id: 'malicious_noire_uid',
      business_name: 'NOIRÉ Luxury Atelier',
    });

    for (const id of [
      'official-ai-workforce',
      'ai_workforce_official',
      'ai_workforce',
      'ai-workforce',
      'wgt_8va1xl_re01u0',
    ]) {
      const resolved = await resolvePublicWidget(id);
      assert.ok(resolved, `Official widget ${id} must always resolve`);
      assert.equal(resolved.business_name, 'AI Workforce');
      assert.equal(resolved.user_id, PLATFORM_OFFICIAL_TENANT_ID);
      assert.notEqual(resolved.business_name, 'NOIRÉ Luxury Atelier');
      assert.notEqual(resolved.theme_color, '#FFD000');
      assert.equal(resolved.company_profile?.name, 'AI Workforce');
    }

    // Attempting to overwrite reserved official widget via savePublicWidgetConfig must be rejected
    await assert.rejects(
      () =>
        savePublicWidgetConfig({
          widget_id: 'official-ai-workforce',
          user_id: 'tenant_signup_1',
          business_name: 'Hijacked Tenant Brand',
        }),
      /reserved for the platform official assistant/i
    );

    // Independent customer widget still resolves its own brand cleanly
    await savePublicWidgetConfig({
      widget_id: 'wgt_noire_clean',
      user_id: 'tenant_noire',
      business_name: 'NOIRÉ Studio',
      theme_color: '#1E293B',
    });
    const customerResolved = await resolvePublicWidget('wgt_noire_clean');
    assert.ok(customerResolved);
    assert.equal(customerResolved.business_name, 'NOIRÉ Studio');

    // Official widget remains untouched after customer signup/save
    const officialAfter = await resolvePublicWidget('official-ai-workforce');
    assert.equal(officialAfter?.business_name, 'AI Workforce');
  });

  it('BUG-3.1 (Client Guards): CustomerChatWidget & StandaloneEmbedChat block reserved official widget mutations', () => {
    const ccw = fs.readFileSync(path.join(process.cwd(), 'src/components/CustomerChatWidget.tsx'), 'utf8');
    const sec = fs.readFileSync(path.join(process.cwd(), 'src/components/StandaloneEmbedChat.tsx'), 'utf8');
    const lp = fs.readFileSync(path.join(process.cwd(), 'src/components/LandingPage.tsx'), 'utf8');

    assert.match(ccw, /setLiveDocData\(null\);\s*\n\s*if \(!widgetId \|\| isReservedOfficialWidgetIdClient\(widgetId\)\) return;/);
    assert.match(sec, /const isOfficial = isReservedOfficialWidgetIdClient\(widgetId\);/);
    assert.match(sec, /if \(!isOfficial\)/);
    assert.match(lp, /businessName="AI Workforce"/);
    assert.match(lp, /widgetId="official-ai-workforce"/);
  });

  it('BUG-3.2: coalesces concurrent duplicate handleWidgetChat calls and stores exact client_message_id correlation without duplicate messages', async () => {
    await savePublicWidgetConfig({
      widget_id: 'wgt_dedup_test',
      user_id: 'tenant_dedup',
      business_name: 'Cobalt Cloud',
      company_profile: {
        name: 'Cobalt Cloud',
        brandName: 'Cobalt Cloud',
        industry: 'Cloud Infrastructure',
        pricing: 'Pro Tier is $99/month.',
        products: 'Managed Kubernetes ($99/mo)',
      } as any,
    });

    const convId = 'conv_dedup_1';
    const visitorId = 'vis_dedup_1';
    const token = issueVisitorSessionToken({
      tenant_id: 'tenant_dedup',
      widget_id: 'wgt_dedup_test',
      visitor_id: visitorId,
      conversation_id: convId,
    });

    const payload = {
      widget_id: 'wgt_dedup_test',
      conversation_id: convId,
      visitor_id: visitorId,
      visitor_session_token: token,
      client_message_id: 'cmsg_concurrent_001',
      message: 'What is your pricing?',
      environment: 'production',
    };

    // Fire 2 simultaneous identical turns (simulating double-click / race)
    const [res1, res2] = await Promise.all([handleWidgetChat(payload), handleWidgetChat(payload)]);
    assert.ok(res1.reply && res1.reply.length > 0);
    assert.equal(res1.reply, res2.reply);
    assert.equal(res1.client_message_id, 'cmsg_concurrent_001');
    assert.equal(res1.reply_to_client_message_id, 'cmsg_concurrent_001');

    // At least one of them is deduplicated, and stored conversation has strictly 1 customer + 1 assistant message
    const conv = getStoredConversationFromMemory('tenant_dedup', convId);
    assert.ok(conv);
    assert.equal(conv.messages.length, 2);
    assert.equal(conv.messages[0].sender, 'customer');
    assert.equal(conv.messages[0].metadata?.client_message_id, 'cmsg_concurrent_001');
    assert.equal(conv.messages[1].sender, 'assistant');
    assert.equal(conv.messages[1].metadata?.reply_to_client_message_id, 'cmsg_concurrent_001');

    // Subsequent retry of identical client_message_id is also idempotent
    const resRetry = await handleWidgetChat(payload);
    assert.equal(resRetry.is_idempotent_retry, true);
    assert.equal(resRetry.deduplicated, true);
    assert.equal(getStoredConversationFromMemory('tenant_dedup', convId)?.messages.length, 2);
  });

  it('BUG-3.2 / BUG-3.3: handleWidgetChatStream correlates client_message_id, persists reply, and deduplicates stream retries', async () => {
    await savePublicWidgetConfig({
      widget_id: 'wgt_stream_test',
      user_id: 'tenant_stream',
      business_name: 'Atlas Robotics',
      company_profile: {
        name: 'Atlas Robotics',
        brandName: 'Atlas Robotics',
        industry: 'Robotics',
        pricing: 'Unit lease starts at $1,200/month.',
        products: 'Warehouse Picker Arm ($1,200/mo)',
      } as any,
    });

    const convId = 'conv_stream_1';
    const visitorId = 'vis_stream_1';
    const token = issueVisitorSessionToken({
      tenant_id: 'tenant_stream',
      widget_id: 'wgt_stream_test',
      visitor_id: visitorId,
      conversation_id: convId,
    });

    const collectStream = async (reqPayload: typeof payload) => {
      const events: Array<{ type: 'chunk' | 'metadata' | 'error'; text?: string; data?: any }> = [];
      for await (const ev of handleWidgetChatStream(reqPayload)) {
        events.push(ev);
      }
      const meta = events.find((e) => e.type === 'metadata')?.data;
      return { events, meta };
    };

    const payload = {
      widget_id: 'wgt_stream_test',
      conversation_id: convId,
      visitor_id: visitorId,
      visitor_session_token: token,
      client_message_id: 'cmsg_stream_001',
      message: 'Tell me about your warehouse robotics pricing.',
      environment: 'production',
    };

    // Concurrent identical stream calls coalesce without duplicating persisted turns
    const [streamA, streamB] = await Promise.all([collectStream(payload), collectStream(payload)]);
    assert.ok(streamA.meta?.reply && streamA.meta.reply.length > 0);
    assert.equal(streamA.meta.reply_to_client_message_id, 'cmsg_stream_001');
    assert.equal(streamB.meta?.reply, streamA.meta.reply);
    assert.ok(streamA.events.some((e) => e.type === 'chunk'));
    assert.ok(
      streamA.events.some((e) => e.type === 'metadata' && e.data?.reply_to_client_message_id === 'cmsg_stream_001')
    );

    // Sequential duplicate stream request must deduplicate without inserting another message
    const streamRetry = await collectStream(payload);
    assert.equal(streamRetry.meta?.deduplicated, true);
    assert.equal(streamRetry.meta?.is_idempotent_retry, true);
    assert.equal(getStoredConversationFromMemory('tenant_stream', convId)?.messages.length, 2);

    // Server SSE route uses res.on('close') guarded by writableEnded, and client has JSON fallback retry
    const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    assert.doesNotMatch(serverSrc, /req\.on\(['"]close['"],\s*\(\)\s*=>\s*ac\.abort/);
    assert.match(serverSrc, /res\.on\(['"]close['"]/);
    assert.match(serverSrc, /!res\.writableEnded/);
    assert.match(serverSrc, /serveChatWidgetJs/);

    const widgetSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/CustomerChatWidget.tsx'), 'utf8');
    assert.match(widgetSrc, /executeWithAuthRefresh\(false\)/);
    assert.match(widgetSrc, /isSendingRef\.current/);
  });

  it('BUG-3.4: enforces clean light default, Apple/ChatGPT presets, Light/Dark/System theme tokens, WCAG >=4.5:1 contrast, and CSS/URL XSS sanitization', () => {
    // 1. Default theme is clean light slate/indigo (never dark obsidian, never yellow #FFD000)
    assert.equal(DEFAULT_WIDGET_STUDIO_CONFIG.themeMode, 'light');
    assert.equal(DEFAULT_WIDGET_STUDIO_CONFIG.backgroundColor, '#FFFFFF');
    assert.notEqual(DEFAULT_WIDGET_STUDIO_CONFIG.primaryColor.toUpperCase(), '#FFD000');

    // 2. All presets satisfy WCAG 2.1 AA contrast (>= 4.5:1) across surface, AI bubble, user bubble, and header
    for (const preset of ALL_PRESETS) {
      const sanitized = sanitizeWidgetStudioConfig(preset.config);
      const tokens = resolveWidgetThemeTokens(sanitized, false);

      assert.ok(
        getContrastRatio(tokens.aiBubbleText, tokens.aiBubbleBg) >= 4.5,
        `Preset ${preset.id} failed AI bubble AA contrast`
      );
      assert.ok(
        getContrastRatio(tokens.userBubbleText, tokens.userBubbleBg) >= 4.5,
        `Preset ${preset.id} failed User bubble AA contrast`
      );
      assert.ok(
        getContrastRatio(tokens.headerText, tokens.headerBg) >= 4.5,
        `Preset ${preset.id} failed Header AA contrast`
      );
      assert.ok(
        getContrastRatio(tokens.sendBtnText, tokens.sendBtnBg) >= 4.5,
        `Preset ${preset.id} failed Send Button AA contrast`
      );
    }

    // 3. System theme mode responds to OS color scheme
    assert.equal(resolveEffectiveThemeMode('system', false), 'light');
    assert.equal(resolveEffectiveThemeMode('system', true), 'dark');
    const systemDark = resolveWidgetThemeTokens({ themeMode: 'system', primaryColor: '#2563EB' }, true);
    const systemLight = resolveWidgetThemeTokens({ themeMode: 'system', primaryColor: '#2563EB' }, false);
    assert.equal(systemDark.effectiveMode, 'dark');
    assert.equal(systemLight.effectiveMode, 'light');

    // 4. XSS CSS/URL sanitization rejects dangerous inputs
    assert.equal(sanitizeCssColor('#0f172a; background:url(javascript:alert(1))', '#0F172A'), '#0F172A');
    assert.equal(sanitizeCssColor('expression(alert(1))', '#2563EB'), '#2563EB');
    assert.equal(sanitizeSafeUrl('javascript:alert(1)'), undefined);
    assert.equal(sanitizeSafeUrl('data:text/html,<script>alert(1)</script>'), undefined);
    assert.equal(sanitizeSafeUrl('https://cdn.example.com/logo.png'), 'https://cdn.example.com/logo.png');
  });
});
