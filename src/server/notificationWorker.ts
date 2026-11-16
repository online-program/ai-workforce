import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import { processOutboxNotification } from './durableHandoffService.ts';

let hasNotifiedMissingCreds = false;
let isWorkerRunning = false;

export async function runNotificationWorker(): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!hasAdminCredentials()) {
    if (!hasNotifiedMissingCreds) {
      console.log('[NotificationWorker] Service account credentials not configured; skipping background Firestore polling.');
      hasNotifiedMissingCreds = true;
    }
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (isWorkerRunning) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isWorkerRunning = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const db = getAdminDb();
    const nowIso = new Date().toISOString();

    const outboxSnap = await db
      .collectionGroup('notification_outbox')
      .where('status', 'in', ['queued', 'failed'])
      .limit(50)
      .get();

    for (const notifDoc of outboxSnap.docs) {
      const data = notifDoc.data() || {};
      if (data.status === 'failed' && data.next_retry_at && data.next_retry_at > nowIso) {
        continue;
      }

      const tenantId =
        (typeof data.tenant_id === 'string' && data.tenant_id.trim()) ||
        (notifDoc.ref as any)?.parent?.parent?.id ||
        '';

      if (!tenantId) {
        continue;
      }

      const res = await processOutboxNotification(tenantId, notifDoc.id);
      if (!res.skipped) {
        processed += 1;
        if (res.success) succeeded += 1;
        else failed += 1;
      }
    }
  } catch (err: any) {
    if (err?.code === 7 || err?.message?.includes('PERMISSION_DENIED')) {
      if (!hasNotifiedMissingCreds) {
        console.warn('[NotificationWorker] Missing Firestore permissions; background polling paused.');
        hasNotifiedMissingCreds = true;
      }
      return { processed, succeeded, failed };
    }
    if (err?.code === 9 || err?.message?.includes('FAILED_PRECONDITION')) {
      console.warn('[NotificationWorker] Collection group query index required for notification_outbox:', err?.message || err);
      return { processed, succeeded, failed };
    }
    console.error('[NotificationWorker] Error processing notifications:', err);
  } finally {
    isWorkerRunning = false;
  }

  return { processed, succeeded, failed };
}
