import crypto from 'crypto';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminUid: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  targetResource: string;
  targetId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface SecurityEventEntry {
  id: string;
  timestamp: string;
  type:
    | 'UNAUTHORIZED_ACCESS'
    | 'RATE_LIMIT_EXCEEDED'
    | 'CROSS_TENANT_ATTEMPT'
    | 'INVALID_TOKEN'
    | 'SUSPICIOUS_PAYLOAD'
    | 'PRIVILEGE_ESCALATION_BLOCKED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceIp: string;
  endpoint: string;
  details: Record<string, any>;
  resolved: boolean;
}

export interface SystemErrorEntry {
  id: string;
  timestamp: string;
  service: 'AI_PROVIDER' | 'FIRESTORE' | 'AUTH' | 'EMAIL' | 'WIDGET' | 'API' | 'CLIENT';
  severity: 'WARN' | 'ERROR' | 'FATAL';
  endpoint?: string;
  statusCode?: number;
  message: string;
  correlationId: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface LiveActivityEvent {
  id: string;
  timestamp: string;
  type:
    | 'VISITOR_SESSION'
    | 'WIDGET_LOAD'
    | 'CHAT_MESSAGE'
    | 'INQUIRY_REGISTERED'
    | 'LEAD_QUALIFIED'
    | 'EMAIL_DISPATCHED'
    | 'ADMIN_ACTION'
    | 'SYSTEM_ALERT';
  severity?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description: string;
  companyName?: string;
  widgetId?: string;
  metadata?: Record<string, any>;
}

const MAX_LOGS = 1000;
const auditLogsBuffer: AuditLogEntry[] = [];
const securityEventsBuffer: SecurityEventEntry[] = [];
const errorLogsBuffer: SystemErrorEntry[] = [];
const liveActivityBuffer: LiveActivityEvent[] = [];

function sanitizeMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9-_.=]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/GOCSPX-[A-Za-z0-9-_]+/g, '[REDACTED_SECRET]')
    .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"')
    .replace(/"secret"\s*:\s*"[^"]+"/gi, '"secret":"[REDACTED]"')
    .replace(/"refresh_token"\s*:\s*"[^"]+"/gi, '"refresh_token":"[REDACTED]"');
}

function sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
  if (!details) return undefined;
  try {
    const raw = JSON.stringify(details);
    return JSON.parse(sanitizeMessage(raw));
  } catch {
    return { sanitized: true };
  }
}

export async function recordAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const log: AuditLogEntry = {
    id: `audit_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...entry,
    details: sanitizeDetails(entry.details),
  };

  auditLogsBuffer.unshift(log);
  if (auditLogsBuffer.length > MAX_LOGS) {
    auditLogsBuffer.pop();
  }

  recordLiveActivity({
    type: 'ADMIN_ACTION',
    title: `Admin Action: ${log.action}`,
    description: `${log.adminEmail} (${log.adminRole}) -> ${log.targetResource} [${log.result}]`,
    metadata: {
      action: log.action,
      targetId: log.targetId,
      result: log.result,
    },
  });

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      await db.collection('system_audit_logs').doc(log.id).set(log);
    } catch (err: any) {
      console.error('[AuditService] Failed to persist audit log:', err?.message || err);
    }
  }

  return log;
}

export async function recordSecurityEvent(
  entry: Omit<SecurityEventEntry, 'id' | 'timestamp' | 'resolved'>
): Promise<SecurityEventEntry> {
  const event: SecurityEventEntry = {
    id: `sec_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    resolved: false,
    ...entry,
    details: sanitizeDetails(entry.details) || {},
  };

  securityEventsBuffer.unshift(event);
  if (securityEventsBuffer.length > MAX_LOGS) {
    securityEventsBuffer.pop();
  }

  recordLiveActivity({
    type: 'SYSTEM_ALERT',
    severity: event.severity === 'CRITICAL' || event.severity === 'HIGH' ? 'error' : 'warning',
    title: `Security Alert: ${event.type}`,
    description: `Threat level ${event.severity} from IP ${event.sourceIp} at ${event.endpoint}`,
    metadata: event.details,
  });

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      await db.collection('system_security_events').doc(event.id).set(event);
    } catch (err: any) {
      console.error('[AuditService] Failed to persist security event:', err?.message || err);
    }
  }

  return event;
}

export function recordSystemError(
  entry: Omit<SystemErrorEntry, 'id' | 'timestamp' | 'correlationId'> & { correlationId?: string }
): SystemErrorEntry {
  const errEntry: SystemErrorEntry = {
    id: `err_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    correlationId: entry.correlationId || `cor_${crypto.randomUUID().slice(0, 12)}`,
    ...entry,
    message: sanitizeMessage(entry.message),
    stack: entry.stack ? sanitizeMessage(entry.stack) : undefined,
    context: sanitizeDetails(entry.context),
  };

  errorLogsBuffer.unshift(errEntry);
  if (errorLogsBuffer.length > MAX_LOGS) {
    errorLogsBuffer.pop();
  }

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      db.collection('system_error_logs')
        .doc(errEntry.id)
        .set(errEntry)
        .catch(() => {});
    } catch {}
  }

  return errEntry;
}

export function recordLiveActivity(
  event: Omit<LiveActivityEvent, 'id' | 'timestamp'>
): LiveActivityEvent {
  const activity: LiveActivityEvent = {
    id: `act_live_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...event,
    metadata: sanitizeDetails(event.metadata),
  };

  liveActivityBuffer.unshift(activity);
  if (liveActivityBuffer.length > MAX_LOGS) {
    liveActivityBuffer.pop();
  }

  return activity;
}

export async function getDurableAuditLogs(params: {
  limit?: number;
  action?: string;
  adminEmail?: string;
  targetResource?: string;
}): Promise<{ logs: AuditLogEntry[]; durable: boolean }> {
  const merged = new Map<string, AuditLogEntry>();
  auditLogsBuffer.forEach((l) => merged.set(l.id, l));

  let durable = false;
  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection('system_audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(Math.min(params.limit || 100, 300))
        .get();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as AuditLogEntry;
        if (data?.id) merged.set(data.id, data);
      });
      durable = true;
    } catch (err: any) {
      console.error('[AuditService] Durable audit read failed:', err?.message || err);
    }
  }

  let logs = Array.from(merged.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (params.action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes(params.action!.toLowerCase()));
  }
  if (params.adminEmail) {
    logs = logs.filter((l) => l.adminEmail.toLowerCase().includes(params.adminEmail!.toLowerCase()));
  }
  if (params.targetResource) {
    logs = logs.filter((l) =>
      l.targetResource.toLowerCase().includes(params.targetResource!.toLowerCase())
    );
  }

  return { logs: logs.slice(0, params.limit || 100), durable };
}

export async function getDurableSecurityEvents(params: {
  limit?: number;
  severity?: string;
  type?: string;
}): Promise<{ events: SecurityEventEntry[]; durable: boolean }> {
  const merged = new Map<string, SecurityEventEntry>();
  securityEventsBuffer.forEach((e) => merged.set(e.id, e));

  let durable = false;
  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection('system_security_events')
        .orderBy('timestamp', 'desc')
        .limit(Math.min(params.limit || 100, 300))
        .get();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SecurityEventEntry;
        if (data?.id) merged.set(data.id, data);
      });
      durable = true;
    } catch (err: any) {
      console.error('[AuditService] Durable security event read failed:', err?.message || err);
    }
  }

  let events = Array.from(merged.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (params.severity) {
    events = events.filter((e) => e.severity === params.severity);
  }
  if (params.type) {
    events = events.filter((e) => e.type === params.type);
  }

  return { events: events.slice(0, params.limit || 100), durable };
}

export function getAuditLogs(params: {
  limit?: number;
  action?: string;
  adminEmail?: string;
  targetResource?: string;
}): AuditLogEntry[] {
  let logs = [...auditLogsBuffer];
  if (params.action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes(params.action!.toLowerCase()));
  }
  if (params.adminEmail) {
    logs = logs.filter((l) => l.adminEmail.toLowerCase().includes(params.adminEmail!.toLowerCase()));
  }
  if (params.targetResource) {
    logs = logs.filter((l) =>
      l.targetResource.toLowerCase().includes(params.targetResource!.toLowerCase())
    );
  }
  return logs.slice(0, params.limit || 100);
}

export function getSecurityEvents(params: {
  limit?: number;
  severity?: string;
  type?: string;
}): SecurityEventEntry[] {
  let events = [...securityEventsBuffer];
  if (params.severity) {
    events = events.filter((e) => e.severity === params.severity);
  }
  if (params.type) {
    events = events.filter((e) => e.type === params.type);
  }
  return events.slice(0, params.limit || 100);
}

export function getSystemErrors(params: {
  limit?: number;
  service?: string;
  severity?: string;
}): SystemErrorEntry[] {
  let errors = [...errorLogsBuffer];
  if (params.service) {
    errors = errors.filter((e) => e.service === params.service);
  }
  if (params.severity) {
    errors = errors.filter((e) => e.severity === params.severity);
  }
  return errors.slice(0, params.limit || 100);
}

export function getLiveActivityStream(params: {
  limit?: number;
  type?: string;
  widgetId?: string;
}): LiveActivityEvent[] {
  let stream = [...liveActivityBuffer];
  if (params.type) {
    stream = stream.filter((e) => e.type === params.type);
  }
  if (params.widgetId) {
    stream = stream.filter((e) => e.widgetId === params.widgetId);
  }
  return stream.slice(0, params.limit || 100);
}
