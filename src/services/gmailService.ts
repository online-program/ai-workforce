/**
 * Gmail Workspace Integration Service for AI Workforce
 * Connects Alpha directly to Gmail for email dispatch and inbound sync.
 */

// Helper to base64url encode a UTF-8 string according to RFC 4648 §5
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Build standard RFC 2822 email format
function buildRfc822Email(to: string, subject: string, bodyText: string, from?: string): string {
  const lines = [
    `To: ${to}`,
    ...(from ? [`From: ${from}`] : []),
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    bodyText,
  ];
  return lines.join('\r\n');
}

export interface GmailSendResult {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface InboundEmailItem {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  snippet: string;
  date: string;
  fullBody: string;
}

/**
 * Send an email directly via Gmail API using the authorized OAuth access token
 */
export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  from?: string
): Promise<GmailSendResult> {
  if (!accessToken) {
    throw new Error('No Gmail access token available. Please sign in with Google.');
  }

  const rawEmail = buildRfc822Email(to, subject, bodyText, from);
  const encodedRaw = base64UrlEncode(rawEmail);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedRaw }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API error (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Create a Gmail Draft
 */
export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ id: string }> {
  if (!accessToken) {
    throw new Error('No Gmail access token available. Please sign in with Google.');
  }

  const rawEmail = buildRfc822Email(to, subject, bodyText);
  const encodedRaw = base64UrlEncode(rawEmail);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw: encodedRaw },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API error (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch user's Gmail profile to verify connection
 */
export async function getGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string; messagesTotal: number } | null> {
  if (!accessToken) return null;

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Failed to get Gmail profile:', err);
    return null;
  }
}

/**
 * List and parse inbound email inquiries for the Alpha queue
 */
export async function fetchInboundGmailInquiries(
  accessToken: string,
  maxResults = 5
): Promise<InboundEmailItem[]> {
  if (!accessToken) return [];

  try {
    // Search for incoming inquiry/quote/pricing/rfq emails or general inbox
    const query = encodeURIComponent('in:inbox');
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${query}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listRes.ok) {
      console.warn('Gmail list messages returned', listRes.status);
      return [];
    }

    const listData = await listRes.json();
    if (!listData.messages || !Array.isArray(listData.messages)) {
      return [];
    }

    const items: InboundEmailItem[] = [];

    for (const msgRef of listData.messages.slice(0, maxResults)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject') || '(No Subject)';
      const fromHeader = getHeader('From') || '';
      const dateHeader = getHeader('Date') || new Date().toISOString();

      // Extract sender email and name
      let sender = fromHeader;
      let senderEmail = fromHeader;
      const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        sender = match[1].replace(/"/g, '').trim() || match[2];
        senderEmail = match[2];
      }

      // Extract body snippet or text content
      let fullBody = msg.snippet || '';
      if (msg.payload?.parts) {
        for (const part of msg.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            try {
              const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              fullBody = decoded;
              break;
            } catch (e) {
              // fallback to snippet
            }
          }
        }
      }

      items.push({
        id: msg.id,
        threadId: msg.threadId,
        subject,
        sender,
        senderEmail,
        snippet: msg.snippet || '',
        date: dateHeader,
        fullBody: fullBody || msg.snippet || '',
      });
    }

    return items;
  } catch (err) {
    console.error('Error fetching Gmail inquiries:', err);
    return [];
  }
}
