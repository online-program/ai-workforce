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
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const tenantId = userDoc.id;

      const [queuedSnap, retrySnap] = await Promise.all([
        db
          .collection('users')
          .doc(tenantId)
          .collection('notification_outbox')
          .where('status', '==', 'queued')
          .limit(10)
          .get(),
        db
          .collection('users')
          .doc(tenantId)
          .collection('notification_outbox')
          .where('status', '==', 'failed')
          .limit(10)
          .get(),
      ]);

      const docsToProcess = [...queuedSnap.docs];
      for (const d of retrySnap.docs) {
        const data = d.data();
        if (!data.next_retry_at || data.next_retry_at <= nowIso) {
          docsToProcess.push(d);
        }
      }

      for (const notifDoc of docsToProcess) {
        const res = await processOutboxNotification(tenantId, notifDoc.id);
        if (!res.skipped) {
          processed += 1;
          if (res.success) succeeded += 1;
          else failed += 1;
        }
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
    console.error('[NotificationWorker] Error processing notifications:', err);
  } finally {
    isWorkerRunning = false;
  }

  return { processed, succeeded, failed };
}
