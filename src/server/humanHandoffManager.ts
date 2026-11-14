/**
 * PROJECT ALPHA — HUMAN COLLABORATION & HANDOFF MANAGER
 * 
 * Manages human handoff workflows, context summaries, delivery confirmation tracking,
 * handoff queue state, assignment to sales closers, and notification retry policies.
 * 
 * Rule: Never tell visitors a human has been notified unless delivery is actually confirmed.
 */

import { StructuredLeadProfile } from '../types.ts';

export type HandoffStatus = 'PENDING' | 'NOTIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface HumanHandoffRecord {
  handoffId: string;
  tenantId: string;
  conversationId: string;
  visitorId: string;
  customerName: string;
  contactEmail?: string;
  contactPhone?: string;
  status: HandoffStatus;
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
  handoffReason: string;
  summaryOfContext: string;
  leadBrief?: any;
  assignedToUser?: string;
  assignedUserEmail?: string;
  createdAt: string;
  updatedAt: string;
  deliveryConfirmed: boolean;
  deliveryAttempts: number;
  lastError?: string;
}

// In-memory store for Human Handoff Queue (backed by admin store)
const handoffQueue: Map<string, HumanHandoffRecord> = new Map();

/**
 * Creates or updates a Human Handoff Record
 */
export function createOrUpdateHumanHandoff(params: {
  tenantId: string;
  conversationId: string;
  visitorId: string;
  handoffReason: string;
  summaryOfContext: string;
  profile?: StructuredLeadProfile;
  urgency?: 'HIGH' | 'MEDIUM' | 'NORMAL';
}): HumanHandoffRecord {
  const handoffId = `handoff_${params.tenantId}_${params.conversationId}`;
  const existing = handoffQueue.get(handoffId);

  const record: HumanHandoffRecord = {
    handoffId,
    tenantId: params.tenantId,
    conversationId: params.conversationId,
    visitorId: params.visitorId,
    customerName: params.profile?.customer_name || params.profile?.name || 'Website Visitor',
    contactEmail: params.profile?.contact_info,
    contactPhone: params.profile?.contact_info,
    status: existing ? existing.status : 'PENDING',
    urgency: params.urgency || 'HIGH',
    handoffReason: params.handoffReason,
    summaryOfContext: params.summaryOfContext,
    leadBrief: params.profile,
    assignedToUser: existing?.assignedToUser,
    assignedUserEmail: existing?.assignedUserEmail,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deliveryConfirmed: existing ? existing.deliveryConfirmed : false,
    deliveryAttempts: existing ? existing.deliveryAttempts : 0,
  };

  handoffQueue.set(handoffId, record);
  return record;
}

/**
 * Confirms notification delivery to tenant dashboard / email dispatch
 */
export function markHandoffDeliveryConfirmed(handoffId: string, success: boolean, errorMsg?: string): HumanHandoffRecord | null {
  const record = handoffQueue.get(handoffId);
  if (!record) return null;

  record.deliveryAttempts += 1;
  record.updatedAt = new Date().toISOString();

  if (success) {
    record.deliveryConfirmed = true;
    record.status = 'NOTIFIED';
    record.lastError = undefined;
  } else {
    record.deliveryConfirmed = false;
    record.status = 'FAILED';
    record.lastError = errorMsg || 'Notification delivery failed';
  }

  handoffQueue.set(handoffId, record);
  return record;
}

/**
 * Assigns human ownership to a handoff
 */
export function assignHandoffToUser(handoffId: string, userId: string, userEmail: string): HumanHandoffRecord | null {
  const record = handoffQueue.get(handoffId);
  if (!record) return null;

  record.assignedToUser = userId;
  record.assignedUserEmail = userEmail;
  record.status = 'ASSIGNED';
  record.updatedAt = new Date().toISOString();

  handoffQueue.set(handoffId, record);
  return record;
}

/**
 * Queries handoffs for tenant dashboard
 */
export function getTenantHandoffs(tenantId?: string): HumanHandoffRecord[] {
  const list = Array.from(handoffQueue.values());
  if (!tenantId || tenantId === 'all') return list;
  return list.filter(h => h.tenantId === tenantId);
}
