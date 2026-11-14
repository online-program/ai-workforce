import crypto from 'crypto';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import { dispatchEmailViaProvider } from './emailService.ts';

const MAX_MEMORY_HANDOFFS = 1000;
export const memoryHandoffStore = new Map<string, DurableHandoffRecord>();

function setBoundedHandoff(record: DurableHandoffRecord) {
  const key = `${record.tenant_id}::${record.handoff_id}`;
  if (memoryHandoffStore.size >= MAX_MEMORY_HANDOFFS && !memoryHandoffStore.has(key)) {
    const oldestKey = memoryHandoffStore.keys().next().value;
    if (oldestKey) memoryHandoffStore.delete(oldestKey);
  }
  memoryHandoffStore.set(key, record);
}

export type HandoffWorkflowStatus =
  | 'requested'
  | 'pending'
  | 'assigned'
  | 'under_review'
  | 'responded'
  | 'resolved'
  | 'cancelled'
  | 'failed'
  | 'waiting_for_customer';

export type NotificationDeliveryStatus =
  | 'not_queued'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'dead_letter';

export interface DurableHandoffRecord {
  handoff_id: string;
  tenant_id: string;
  conversation_id: string;
  enquiry_id: string | null;
  visitor_id: string;
  reason: string;
  requested_by: 'visitor' | 'alpha_escalation' | 'business_rule';
  customer_contact: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  priority: 'high' | 'medium' | 'low';
  assigned_to: string | null;
  notification_status: NotificationDeliveryStatus;
  workflow_status: HandoffWorkflowStatus;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
  notification_attempts: number;
  last_error: string | null;
}

const MAX_NOTIFICATION_ATTEMPTS = 5;
const LEASE_MS = 60 * 1000;

function computeNextRetryAt(attempts: number): string {
  const backoffSeconds = Math.min(1800, 30 * Math.pow(3, Math.max(0, attempts - 1)));
  return new Date(Date.now() + backoffSeconds * 1000).toISOString();
}

export async function createDurableHandoff(input: {
  tenant_id: string;
  conversation_id: string;
  enquiry_id?: string | null;
  visitor_id: string;
  reason: string;
  requested_by?: 'visitor' | 'alpha_escalation' | 'business_rule';
  customer_contact?: { name?: string | null; email?: string | null; phone?: string | null };
  priority?: 'high' | 'medium' | 'low';
  notify_email?: string | null;
  tenant_brand_name?: string | null;
  skip_email_dispatch?: boolean;
}): Promise<{ success: boolean; db_confirmed: boolean; handoff: DurableHandoffRecord | null; error?: string }> {
  const now = new Date().toISOString();
  const handoff_id = `ho_${input.conversation_id}`;

  const record: DurableHandoffRecord = {
    handoff_id,
    tenant_id: input.tenant_id,
    conversation_id: input.conversation_id,
    enquiry_id: input.enquiry_id || null,
    visitor_id: input.visitor_id,
    reason: input.reason,
    requested_by: input.requested_by || 'visitor',
    customer_contact: input.customer_contact || {},
    priority: input.priority || 'high',
    assigned_to: null,
    notification_status: input.notify_email ? 'queued' : 'not_queued',
    workflow_status: 'pending',
    created_at: now,
    updated_at: now,
    reviewed_at: null,
    resolved_at: null,
    notification_attempts: 0,
    last_error: null,
  };

  setBoundedHandoff(record);

  if (!hasAdminCredentials()) {
    return {
      success: false,
      db_confirmed: false,
      handoff: record,
      error: 'Durable database credentials unavailable; handoff could not be persisted durably.',
    };
  }

  try {
    const db = getAdminDb();
    const handoffRef = db.collection('users').doc(input.tenant_id).collection('handoffs').doc(handoff_id);
    const existing = await handoffRef.get();

    if (existing.exists) {
      const prev = existing.data() as DurableHandoffRecord;
      const updated: DurableHandoffRecord = {
        ...prev,
        reason: input.reason || prev.reason,
        customer_contact: {
          name: input.customer_contact?.name || prev.customer_contact?.name || null,
          email: input.customer_contact?.email || prev.customer_contact?.email || null,
          phone: input.customer_contact?.phone || prev.customer_contact?.phone || null,
        },
        updated_at: now,
      };
      await handoffRef.set(updated, { merge: true });
      setBoundedHandoff(updated);

      if (input.notify_email && prev.notification_status === 'not_queued') {
        const outboxRef = db
          .collection('users')
          .doc(input.tenant_id)
          .collection('notification_outbox')
          .doc(`notif_${handoff_id}`);
        await outboxRef.set(
          {
            outbox_id: `notif_${handoff_id}`,
            handoff_id,
            tenant_id: input.tenant_id,
            recipient: input.notify_email,
            from_name: input.tenant_brand_name || 'Customer Concierge',
            subject: `Human Handoff Requested: ${input.reason.slice(0, 60)}`,
            body: `A visitor (${input.customer_contact?.name || input.visitor_id}) requested human assistance.\nReason: ${input.reason}\nConversation ID: ${input.conversation_id}`,
            status: 'queued',
            attempts: 0,
            next_retry_at: now,
            created_at: now,
            updated_at: now,
            last_error: null,
          },
          { merge: true }
        );
        await handoffRef.set({ notification_status: 'queued', updated_at: now }, { merge: true });
        updated.notification_status = 'queued';
      }

      return { success: true, db_confirmed: true, handoff: updated };
    }

    await handoffRef.set(record);

    if (input.notify_email) {
      const outboxRef = db
        .collection('users')
        .doc(input.tenant_id)
        .collection('notification_outbox')
        .doc(`notif_${handoff_id}`);
      await outboxRef.set({
        outbox_id: `notif_${handoff_id}`,
        handoff_id,
        tenant_id: input.tenant_id,
        recipient: input.notify_email,
        from_name: input.tenant_brand_name || 'Customer Concierge',
        subject: `Human Handoff Requested: ${input.reason.slice(0, 60)}`,
        body: `A visitor (${input.customer_contact?.name || input.visitor_id}) requested human assistance.\nReason: ${input.reason}\nConversation ID: ${input.conversation_id}`,
        status: 'queued',
        attempts: 0,
        next_retry_at: now,
        created_at: now,
        updated_at: now,
        last_error: null,
      });

      if (!input.skip_email_dispatch && process.env.NODE_ENV !== 'test') {
        await processOutboxNotification(input.tenant_id, `notif_${handoff_id}`);
      }
    }

    return { success: true, db_confirmed: true, handoff: record };
  } catch (err: any) {
    console.error('[DurableHandoff] Failed to create handoff:', err?.message || err);
    return {
      success: false,
      db_confirmed: false,
      handoff: null,
      error: err?.message || 'Failed to persist handoff record.',
    };
  }
}

export async function processOutboxNotification(
  tenantId: string,
  outboxId: string
): Promise<{ success: boolean; status?: NotificationDeliveryStatus; skipped?: boolean; error?: string }> {
  if (!hasAdminCredentials()) {
    return { success: false, error: 'Database unavailable' };
  }

  try {
    const db = getAdminDb();
    const outboxRef = db.collection('users').doc(tenantId).collection('notification_outbox').doc(outboxId);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const leaseUntilIso = new Date(nowMs + LEASE_MS).toISOString();

    let claimedItem: any = null;
    let nextAttempts = 1;

    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(outboxRef);
      if (!snap.exists) {
        return { claim: false, reason: 'Outbox item not found' };
      }
      const item = snap.data()!;

      if (item.status === 'sent' || item.status === 'dead_letter') {
        return { claim: false, alreadyDone: item.status === 'sent', reason: `Item status is ${item.status}` };
      }

      if (item.status === 'sending' && item.lease_expires_at && item.lease_expires_at > nowIso) {
        return { claim: false, reason: 'Currently leased by another worker' };
      }

      if (item.status === 'failed') {
        if ((item.attempts || 0) >= MAX_NOTIFICATION_ATTEMPTS) {
          tx.set(outboxRef, { status: 'dead_letter', updated_at: nowIso }, { merge: true });
          return { claim: false, reason: 'Exceeded maximum notification retry attempts' };
        }
        if (item.next_retry_at && item.next_retry_at > nowIso) {
          return { claim: false, reason: 'Retry backoff window not elapsed' };
        }
      }

      nextAttempts = (item.attempts || 0) + 1;
      claimedItem = item;
      tx.set(
        outboxRef,
        {
          status: 'sending',
          attempts: nextAttempts,
          lease_expires_at: leaseUntilIso,
          updated_at: nowIso,
        },
        { merge: true }
      );
      return { claim: true };
    });

    if (!claimed.claim) {
      return {
        success: Boolean((claimed as any).alreadyDone),
        skipped: !(claimed as any).alreadyDone,
        error: claimed.reason,
      };
    }

    const res = await dispatchEmailViaProvider({
      to: claimedItem.recipient,
      subject: claimedItem.subject,
      bodyText: claimedItem.body,
      fromName: claimedItem.from_name || 'Customer Concierge',
    });

    const handoffRef = db
      .collection('users')
      .doc(tenantId)
      .collection('handoffs')
      .doc(claimedItem.handoff_id);

    const doneIso = new Date().toISOString();

    if (res.success) {
      await outboxRef.set(
        {
          status: 'sent',
          provider_message_id: res.provider_message_id || null,
          sent_at: doneIso,
          lease_expires_at: null,
          updated_at: doneIso,
        },
        { merge: true }
      );
      await handoffRef.set(
        {
          notification_status: 'sent',
          notification_attempts: nextAttempts,
          last_error: null,
          updated_at: doneIso,
        },
        { merge: true }
      );
      return { success: true, status: 'sent' };
    } else {
      const safeErr = String(res.failure_reason || 'Email provider rejected').slice(0, 200);
      const isDeadLetter = nextAttempts >= MAX_NOTIFICATION_ATTEMPTS;
      const finalStatus: NotificationDeliveryStatus = isDeadLetter ? 'dead_letter' : 'failed';

      await outboxRef.set(
        {
          status: finalStatus,
          last_error: safeErr,
          next_retry_at: isDeadLetter ? null : computeNextRetryAt(nextAttempts),
          lease_expires_at: null,
          updated_at: doneIso,
        },
        { merge: true }
      );
      await handoffRef.set(
        {
          notification_status: finalStatus,
          notification_attempts: nextAttempts,
          last_error: safeErr,
          updated_at: doneIso,
        },
        { merge: true }
      );
      return { success: false, status: finalStatus, error: safeErr };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Outbox processing error' };
  }
}

export async function updateHandoffWorkflowStatus(
  tenantId: string,
  handoffId: string,
  updates: {
    workflow_status?: HandoffWorkflowStatus;
    assigned_to?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const handoffRef = db.collection('users').doc(tenantId).collection('handoffs').doc(handoffId);
    const now = new Date().toISOString();
    const payload: Record<string, any> = {
      ...updates,
      updated_at: now,
    };
    if (updates.workflow_status === 'under_review') {
      payload.reviewed_at = now;
    }
    if (updates.workflow_status === 'resolved') {
      payload.resolved_at = now;
    }
    await handoffRef.set(payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update handoff status' };
  }
}

export async function acceptHumanHandoff(params: {
  tenant_id: string;
  conversation_id: string;
  employee_uid: string;
  employee_email: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!hasAdminCredentials()) {
    return { success: false, error: 'Database unavailable to accept handoff.' };
  }
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const handoffId = `ho_${params.conversation_id}`;
    const handoffRef = db.collection('users').doc(params.tenant_id).collection('handoffs').doc(handoffId);
    const convRef = db.collection('users').doc(params.tenant_id).collection('conversations').doc(params.conversation_id);

    await db.runTransaction(async (tx) => {
      tx.set(
        handoffRef,
        {
          handoff_id: handoffId,
          tenant_id: params.tenant_id,
          conversation_id: params.conversation_id,
          workflow_status: 'assigned',
          assigned_to: params.employee_uid,
          assigned_email: params.employee_email,
          accepted_at: now,
          updated_at: now,
        },
        { merge: true }
      );
      tx.set(
        convRef,
        {
          human_owned: true,
          human_owner_uid: params.employee_uid,
          human_owner_email: params.employee_email,
          handoff_status: 'ACCEPTED',
          status: 'Human Takeover',
          updated_at: now,
        },
        { merge: true }
      );
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to accept human handoff' };
  }
}

export async function sendHumanHandoffReply(params: {
  tenant_id: string;
  conversation_id: string;
  employee_uid: string;
  employee_email: string;
  reply_text: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  if (!hasAdminCredentials()) {
    return { success: false, error: 'Database unavailable to send human handoff reply.' };
  }
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const messageId = `msg_${crypto.randomUUID()}`;
    const convRef = db.collection('users').doc(params.tenant_id).collection('conversations').doc(params.conversation_id);
    const handoffRef = db
      .collection('users')
      .doc(params.tenant_id)
      .collection('handoffs')
      .doc(`ho_${params.conversation_id}`);

    await db.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      const convData = convSnap.exists ? convSnap.data() || {} : {};
      const existingMessages = Array.isArray(convData.messages) ? convData.messages : [];

      const humanMessage = {
        message_id: messageId,
        sender: 'assistant',
        sender_type: 'human',
        text: params.reply_text,
        timestamp: now,
        approved_by: params.employee_email || params.employee_uid,
        metadata: {
          published: true,
          published_at: now,
          delivered: false,
          read: false,
          human_handoff_reply: true,
        },
      };

      tx.set(
        convRef,
        {
          human_owned: true,
          human_owner_uid: params.employee_uid,
          human_owner_email: params.employee_email,
          handoff_status: 'ACCEPTED',
          status: 'Waiting for Customer',
          messages: [...existingMessages, humanMessage],
          last_message_at: now,
          updated_at: now,
        },
        { merge: true }
      );

      tx.set(
        handoffRef,
        {
          workflow_status: 'responded',
          updated_at: now,
        },
        { merge: true }
      );
    });

    return { success: true, message_id: messageId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send human handoff reply' };
  }
}

export async function returnControlToAlpha(params: {
  tenant_id: string;
  conversation_id: string;
  employee_uid: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!hasAdminCredentials()) {
    return { success: false, error: 'Database unavailable to return control to Alpha.' };
  }
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const handoffId = `ho_${params.conversation_id}`;
    const handoffRef = db.collection('users').doc(params.tenant_id).collection('handoffs').doc(handoffId);
    const convRef = db.collection('users').doc(params.tenant_id).collection('conversations').doc(params.conversation_id);

    await db.runTransaction(async (tx) => {
      tx.set(
        convRef,
        {
          human_owned: false,
          handoff_status: 'RETURNED_TO_ALPHA',
          status: 'Active',
          returned_to_alpha_at: now,
          returned_by: params.employee_uid,
          updated_at: now,
        },
        { merge: true }
      );
      tx.set(
        handoffRef,
        {
          workflow_status: 'resolved',
          resolved_at: now,
          updated_at: now,
        },
        { merge: true }
      );
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to return control to Alpha' };
  }
}
