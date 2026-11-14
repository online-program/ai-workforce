import { getAdminDb } from './firebaseAdmin.ts';
import { dispatchEmailViaProvider } from './emailService.ts';
import { CanonicalEnquiry } from './canonicalEnquiryService.ts';

export async function approveAndSendEnquiryReply(input: {
  tenantId: string;
  inquiryId: string;
  recipientEmail: string;
  subject: string;
  replyText: string;
  senderName: string;
  senderEmail: string;
  googleAccessToken?: string;
  approvedBy: string;
}): Promise<{ success: boolean; error?: string; provider_message_id?: string; sent_at?: string }> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  
  try {
    const inquiryRef = db.collection('users').doc(input.tenantId).collection('inquiries').doc(input.inquiryId);
    const leadRef = db.collection('users').doc(input.tenantId).collection('leads').doc(input.inquiryId);
    
    const [inqSnap, leadSnap] = await Promise.all([
      inquiryRef.get(),
      leadRef.get(),
    ]);
    
    const leadData = inqSnap.exists ? inqSnap.data() as CanonicalEnquiry : (leadSnap.exists ? leadSnap.data() as CanonicalEnquiry : null);
    
    if (!leadData) {
      return { success: false, error: 'Inquiry or lead record not found.' };
    }
    
    // 1. Dispatch email
    const dispatchResult = await dispatchEmailViaProvider({
      to: input.recipientEmail,
      subject: input.subject,
      bodyText: input.replyText,
      fromName: input.senderName,
      fromEmail: input.senderEmail,
      googleAccessToken: input.googleAccessToken,
    });
    
    if (!dispatchResult.success) {
      return { success: false, error: dispatchResult.failure_reason || 'Email provider rejected dispatch.' };
    }
    
    // 2. Update status and save reply
    const updatePayload = {
      enquiry_status: 'Waiting for Customer',
      additional_notes: `${leadData.additional_notes || ''}\nSent reply: ${input.replyText}`,
      updated_at: now,
    };
    
    const batch = db.batch();
    batch.set(inquiryRef, updatePayload, { merge: true });
    batch.set(leadRef, updatePayload, { merge: true });

    // 3. Push to conversation history if exists
    const conversationId = leadData.conversation_id;
    if (conversationId) {
      const convRef = db.collection('users').doc(input.tenantId).collection('conversations').doc(conversationId);
      const convSnap = await convRef.get();
      const messages = convSnap.exists ? (convSnap.data()?.messages || []) : [];

      batch.set(
        convRef,
        {
          messages: [
            ...messages,
            {
              message_id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              sender: 'assistant',
              text: input.replyText,
              timestamp: now,
              approved_by: input.approvedBy,
              metadata: { approved_dispatch: true, provider: dispatchResult.provider },
            },
          ],
          last_message_at: now,
          status: 'Waiting for Customer',
          updated_at: now,
        },
        { merge: true }
      );
    }

    await batch.commit();
    
    return { 
        success: true, 
        provider_message_id: dispatchResult.provider_message_id, 
        sent_at: dispatchResult.sent_at 
    };
  } catch (err: any) {
    console.error('[EnquiryWorkflow] Failed to approve and send:', err);
    return { success: false, error: err.message || 'Failed to approve and send enquiry reply.' };
  }
}
