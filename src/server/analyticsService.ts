import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import { recordLiveActivity } from './adminAuditService.ts';

export interface VisitorSessionRecord {
  id: string;
  visitorId: string;
  sessionId: string;
  widgetId?: string;
  tenantId?: string;
  companyName?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  userAgent?: string;
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  landingPage: string;
  referrer: string;
  widgetOpened: boolean;
  messagesCount: number;
  inquirySubmitted: boolean;
  leadScore?: 'HOT' | 'WARM' | 'COLD';
  durationSeconds: number;
  expiresAt?: string;
}

export interface MetricSummary {
  totalVisitors: number;
  uniqueVisitors: number;
  activeVisitorsNow: number;
  totalWidgetLoads: number;
  totalConversations: number;
  totalMessages: number;
  totalInquiries: number;
  hotLeadsCount: number;
  warmLeadsCount: number;
  conversionRate: number;
  avgLatencyMs: number | null;
  activeCompanies: number;
  registeredUsers: number;
  activeWidgets: number;
  metricsUnavailable?: boolean;
}

const MAX_SESSIONS = 2000;
const SESSION_RETENTION_DAYS = 30;
const sessionsMap = new Map<string, VisitorSessionRecord>();

export function parseDeviceAndBrowser(userAgent?: string): {
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { device: 'unknown', browser: 'Unknown Browser', os: 'Unknown OS' };
  }

  const ua = userAgent.toLowerCase();
  let device: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    device = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua)) {
    device = 'mobile';
  }

  let browser = 'Unknown';
  if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';

  let os = 'Unknown OS';
  if (ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('linux')) os = 'Linux';

  return { device, browser, os };
}

export function trackVisitorSession(params: {
  visitorId: string;
  sessionId?: string;
  widgetId?: string;
  tenantId?: string;
  companyName?: string;
  userAgent?: string;
  landingPage?: string;
  referrer?: string;
  action?: 'LOAD' | 'OPEN' | 'MESSAGE' | 'INQUIRY';
  leadScore?: 'HOT' | 'WARM' | 'COLD';
  analyticsConsented?: boolean;
}): VisitorSessionRecord | null {
  if (params.analyticsConsented !== true) {
    return null;
  }

  const visitorId = (params.visitorId || '').trim();
  const widgetScope = (params.widgetId || 'unscoped').trim();
  if (!visitorId) return null;

  const sessionId = params.sessionId || `sess_${visitorId.slice(0, 8)}`;
  const sessionKey = `${widgetScope}::${visitorId}::${sessionId}`;
  const docId = sessionKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_RETENTION_DAYS * 86400000).toISOString();

  let session = sessionsMap.get(sessionKey);

  if (!session) {
    const { device, browser, os } = parseDeviceAndBrowser(params.userAgent);
    session = {
      id: docId,
      visitorId,
      sessionId,
      widgetId: params.widgetId,
      tenantId: params.tenantId,
      companyName: params.companyName || undefined,
      firstSeenAt: now,
      lastSeenAt: now,
      device,
      browser,
      os,
      landingPage: params.landingPage || '/',
      referrer: params.referrer || 'Direct',
      widgetOpened: params.action === 'OPEN' || params.action === 'MESSAGE' || params.action === 'INQUIRY',
      messagesCount: params.action === 'MESSAGE' ? 1 : 0,
      inquirySubmitted: params.action === 'INQUIRY',
      leadScore: params.leadScore,
      durationSeconds: 0,
      expiresAt,
    };

    recordLiveActivity({
      type: 'VISITOR_SESSION',
      title: 'New Visitor Session',
      description: `Visitor from ${browser} (${device}) arrived on ${params.companyName || widgetScope}`,
      companyName: params.companyName,
      widgetId: params.widgetId,
    });
  } else {
    session.lastSeenAt = now;
    session.expiresAt = expiresAt;
    if (params.action === 'OPEN') session.widgetOpened = true;
    if (params.action === 'MESSAGE') session.messagesCount += 1;
    if (params.action === 'INQUIRY') {
      session.inquirySubmitted = true;
      if (params.leadScore) session.leadScore = params.leadScore;
    }
    const start = new Date(session.firstSeenAt).getTime();
    const end = new Date(now).getTime();
    session.durationSeconds = Math.max(1, Math.round((end - start) / 1000));
  }

  sessionsMap.set(sessionKey, session);

  if (sessionsMap.size > MAX_SESSIONS) {
    const firstKey = sessionsMap.keys().next().value;
    if (firstKey) sessionsMap.delete(firstKey);
  }

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      const sanitizedDoc = {
        id: session.id,
        visitorId: session.visitorId,
        sessionId: session.sessionId,
        widgetId: session.widgetId || null,
        tenantId: session.tenantId || null,
        companyName: session.companyName || null,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
        device: session.device,
        browser: session.browser,
        os: session.os,
        landingPage: session.landingPage || '/',
        referrer: session.referrer || 'Direct',
        widgetOpened: session.widgetOpened,
        messagesCount: session.messagesCount,
        inquirySubmitted: session.inquirySubmitted,
        leadScore: session.leadScore || null,
        durationSeconds: session.durationSeconds,
        expiresAt: session.expiresAt,
      };
      db.collection('system_visitor_sessions')
        .doc(docId)
        .set(sanitizedDoc, { merge: true })
        .catch(() => {});
    } catch {
      // Non-blocking background sync
    }
  }

  return session;
}

export function getVisitorSessions(params: {
  limit?: number;
  search?: string;
  widgetId?: string;
  tenantId?: string;
  companyName?: string;
  inquiryOnly?: boolean;
}): VisitorSessionRecord[] {
  let list = Array.from(sessionsMap.values()).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );

  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (s) =>
        s.visitorId.toLowerCase().includes(q) ||
        s.companyName?.toLowerCase().includes(q) ||
        s.browser.toLowerCase().includes(q) ||
        s.landingPage.toLowerCase().includes(q)
    );
  }

  if (params.widgetId) {
    list = list.filter((s) => s.widgetId === params.widgetId);
  }

  if (params.tenantId) {
    list = list.filter((s) => s.tenantId === params.tenantId);
  }

  if (params.companyName) {
    list = list.filter((s) => s.companyName?.toLowerCase() === params.companyName?.toLowerCase());
  }

  if (params.inquiryOnly) {
    list = list.filter((s) => s.inquirySubmitted);
  }

  return list.slice(0, params.limit || 100);
}

let totalLatencySum = 0;
let latencySamplesCount = 0;

export function recordLatency(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return;
  totalLatencySum += ms;
  latencySamplesCount += 1;
}

export function getAverageLatency(): number | null {
  if (latencySamplesCount === 0) return null;
  return Math.round(totalLatencySum / latencySamplesCount);
}

export function computeAnalyticsMetrics(params: {
  totalUsers: number;
  totalCompanies: number;
  totalWidgets: number;
  totalConversations: number;
  totalInquiries: number;
  timeRange?: 'today' | '7d' | '30d' | 'all';
  metricsUnavailable?: boolean;
}): MetricSummary {
  const now = Date.now();
  const sessions = Array.from(sessionsMap.values());

  let filteredSessions = sessions;
  if (params.timeRange === 'today') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    filteredSessions = sessions.filter((s) => new Date(s.firstSeenAt).getTime() >= startOfToday.getTime());
  } else if (params.timeRange === '7d') {
    const sevenDaysAgo = now - 7 * 86400000;
    filteredSessions = sessions.filter((s) => new Date(s.firstSeenAt).getTime() >= sevenDaysAgo);
  } else if (params.timeRange === '30d') {
    const thirtyDaysAgo = now - 30 * 86400000;
    filteredSessions = sessions.filter((s) => new Date(s.firstSeenAt).getTime() >= thirtyDaysAgo);
  }

  const uniqueVisitorIds = new Set(filteredSessions.map((s) => s.visitorId));
  const activeCutoff = now - 15 * 60 * 1000;
  const activeVisitorsNow = sessions.filter((s) => new Date(s.lastSeenAt).getTime() >= activeCutoff).length;

  const messagesTotal = filteredSessions.reduce((acc, s) => acc + s.messagesCount, 0);
  const sessionInquiries = filteredSessions.filter((s) => s.inquirySubmitted).length;
  const inquiriesTotal = Math.max(params.totalInquiries, sessionInquiries);
  const hotLeads = filteredSessions.filter((s) => s.leadScore === 'HOT').length;
  const warmLeads = filteredSessions.filter((s) => s.leadScore === 'WARM').length;

  const convRate = uniqueVisitorIds.size > 0 ? (inquiriesTotal / uniqueVisitorIds.size) * 100 : 0;

  return {
    totalVisitors: filteredSessions.length,
    uniqueVisitors: uniqueVisitorIds.size,
    activeVisitorsNow,
    totalWidgetLoads: filteredSessions.length,
    totalConversations: Math.max(params.totalConversations, filteredSessions.filter((s) => s.messagesCount > 0).length),
    totalMessages: messagesTotal,
    totalInquiries: inquiriesTotal,
    hotLeadsCount: hotLeads,
    warmLeadsCount: warmLeads,
    conversionRate: parseFloat(convRate.toFixed(1)),
    avgLatencyMs: getAverageLatency(),
    activeCompanies: params.totalCompanies,
    registeredUsers: params.totalUsers,
    activeWidgets: params.totalWidgets,
    ...(params.metricsUnavailable ? { metricsUnavailable: true } : {}),
  };
}

export function getTimeSeriesChartData(
  timeRange: 'today' | '7d' | '30d' = '7d'
): Array<{ label: string; visitors: number; conversations: number; inquiries: number }> {
  const points: Array<{ label: string; visitors: number; conversations: number; inquiries: number }> = [];
  const now = new Date();

  if (timeRange === 'today') {
    for (let h = 0; h <= now.getHours(); h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const hourStart = new Date(now);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(now);
      hourEnd.setHours(h, 59, 59, 999);

      const matching = Array.from(sessionsMap.values()).filter((s) => {
        const t = new Date(s.firstSeenAt).getTime();
        return t >= hourStart.getTime() && t <= hourEnd.getTime();
      });

      points.push({
        label: hourStr,
        visitors: matching.length,
        conversations: matching.filter((m) => m.messagesCount > 0).length,
        inquiries: matching.filter((m) => m.inquirySubmitted).length,
      });
    }
  } else {
    const days = timeRange === '30d' ? 30 : 7;
    for (let d = days - 1; d >= 0; d--) {
      const targetDate = new Date(now.getTime() - d * 86400000);
      const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      targetDate.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const matching = Array.from(sessionsMap.values()).filter((s) => {
        const t = new Date(s.firstSeenAt).getTime();
        return t >= targetDate.getTime() && t <= dayEnd.getTime();
      });

      points.push({
        label: dateStr,
        visitors: matching.length,
        conversations: matching.filter((m) => m.messagesCount > 0).length,
        inquiries: matching.filter((m) => m.inquirySubmitted).length,
      });
    }
  }

  return points;
}
