import dns from 'dns/promises';
import dotenv from 'dotenv';

dotenv.config();

export type EmailValidationErrorType =
  | 'required'
  | 'invalid_format'
  | 'unresolvable_domain'
  | 'no_usable_mail_server'
  | 'provider_rejected'
  | 'provider_not_configured';

export interface EmailValidationResult {
  valid: boolean;
  email: string;
  domain?: string;
  errorType?: EmailValidationErrorType;
  message: string;
  details?: {
    syntaxOk: boolean;
    domainSyntaxOk: boolean;
    mxFound: boolean;
    mxRecords?: Array<{ exchange: string; priority: number }>;
    aRecords?: string[];
  };
}

export type EmailDispatchStatus = 'draft' | 'approved' | 'sending' | 'accepted' | 'failed';

export interface EmailDispatchResult {
  success: boolean;
  status: EmailDispatchStatus;
  provider?: string;
  provider_message_id?: string;
  sent_at?: string;
  failure_reason?: string | null;
  errorType?: EmailValidationErrorType;
  recipient: string;
}

// RFC 5322 compliant regex for practical email format verification
const EMAIL_SYNTAX_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard Domain format regex
const DOMAIN_LABEL_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/**
 * 5-Layer Comprehensive Email Validation
 * Layer 1: Required
 * Layer 2: Email syntax
 * Layer 3: Domain syntax
 * Layer 4: DNS / MX check
 * Layer 5: (Handled during dispatch) Actual provider response
 */
export async function validateEmailAddress(rawEmail?: string | null): Promise<EmailValidationResult> {
  // Layer 1: Required check
  if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
    return {
      valid: false,
      email: '',
      errorType: 'required',
      message: 'Recipient email address is required.',
      details: { syntaxOk: false, domainSyntaxOk: false, mxFound: false },
    };
  }

  const email = rawEmail.trim();

  // Layer 2: Email Syntax validation
  if (!EMAIL_SYNTAX_REGEX.test(email) || email.length > 254) {
    return {
      valid: false,
      email,
      errorType: 'invalid_format',
      message: 'Invalid email address format. Expected pattern: name@example.com.',
      details: { syntaxOk: false, domainSyntaxOk: false, mxFound: false },
    };
  }

  // Layer 3: Domain Syntax validation
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return {
      valid: false,
      email,
      errorType: 'invalid_format',
      message: 'Invalid email format: missing or misplaced @ symbol.',
      details: { syntaxOk: false, domainSyntaxOk: false, mxFound: false },
    };
  }

  const domain = email.slice(atIndex + 1).toLowerCase();
  const domainParts = domain.split('.');
  
  if (domainParts.length < 2) {
    return {
      valid: false,
      email,
      domain,
      errorType: 'invalid_format',
      message: 'Domain must include a top-level domain (e.g. .com, .org).',
      details: { syntaxOk: true, domainSyntaxOk: false, mxFound: false },
    };
  }

  // Validate each label in domain
  for (const part of domainParts) {
    if (!part || part.length > 63 || !DOMAIN_LABEL_REGEX.test(part)) {
      return {
        valid: false,
        email,
        domain,
        errorType: 'invalid_format',
        message: `Invalid domain syntax in "${domain}". Domain labels must be 1-63 alphanumeric characters.`,
        details: { syntaxOk: true, domainSyntaxOk: false, mxFound: false },
      };
    }
  }

  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return {
      valid: false,
      email,
      domain,
      errorType: 'invalid_format',
      message: `Invalid top-level domain ".${tld}". TLD must contain 2-24 alphabetic characters.`,
      details: { syntaxOk: true, domainSyntaxOk: false, mxFound: false },
    };
  }

  // Layer 4: DNS / MX verification where practical
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return {
        valid: true,
        email,
        domain,
        message: 'Email syntax and domain mail exchange (MX) verified via DNS.',
        details: {
          syntaxOk: true,
          domainSyntaxOk: true,
          mxFound: true,
          mxRecords: mxRecords.map((r) => ({ exchange: r.exchange, priority: r.priority })),
        },
      };
    }
  } catch (mxErr: any) {
    // If MX query failed, check if the domain exists at all via IPv4 (A record)
    if (mxErr.code === 'ENOTFOUND') {
      return {
        valid: false,
        email,
        domain,
        errorType: 'unresolvable_domain',
        message: `Domain "${domain}" does not exist in DNS (cannot be resolved).`,
        details: { syntaxOk: true, domainSyntaxOk: true, mxFound: false },
      };
    }

    try {
      const aRecords = await dns.resolve4(domain);
      if (Array.isArray(aRecords) && aRecords.length > 0) {
        // Domain exists in DNS but has no MX records configured
        return {
          valid: false,
          email,
          domain,
          errorType: 'no_usable_mail_server',
          message: `Domain "${domain}" exists in DNS but does not have any MX mail servers configured.`,
          details: { syntaxOk: true, domainSyntaxOk: true, mxFound: false, aRecords },
        };
      }
    } catch (aErr: any) {
      if (aErr.code === 'ENOTFOUND' || aErr.code === 'ENODATA') {
        return {
          valid: false,
          email,
          domain,
          errorType: 'unresolvable_domain',
          message: `Domain "${domain}" does not exist or has no DNS records.`,
          details: { syntaxOk: true, domainSyntaxOk: true, mxFound: false },
        };
      }
    }

    // If transient DNS timeout or network refusal, log and treat cautiously
    console.warn(`DNS lookup for ${domain} returned:`, mxErr?.message || mxErr);
  }

  // If DNS check could not definitively fail due to network, but syntax is strictly valid:
  return {
    valid: true,
    email,
    domain,
    message: 'Email syntax validated. Domain routing will be verified by email provider during dispatch.',
    details: { syntaxOk: true, domainSyntaxOk: true, mxFound: false },
  };
}

/**
 * Encode an RFC 2822 email payload for Google Gmail API dispatch
 */
function buildRfc822Email(to: string, subject: string, bodyText: string, bodyHtml?: string, from?: string): string {
  const boundary = `====_NextPart_${Date.now()}_====`;
  
  if (bodyHtml) {
    const lines = [
      `To: ${to}`,
      ...(from ? [`From: ${from}`] : []),
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      bodyText,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      bodyHtml,
      '',
      `--${boundary}--`,
    ];
    return lines.join('\r\n');
  }

  const lines = [
    `To: ${to}`,
    ...(from ? [`From: ${from}`] : []),
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    bodyText,
  ];
  return lines.join('\r\n');
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  fromName?: string;
  fromEmail?: string;
  googleAccessToken?: string;
}

/**
 * Dispatches an email via configured real email provider.
 * Strict zero-simulation policy: Never fakes "sent".
 */
export async function dispatchEmailViaProvider(payload: SendEmailPayload): Promise<EmailDispatchResult> {
  const { to, subject, bodyText, bodyHtml, fromName, fromEmail, googleAccessToken } = payload;

  // Pre-dispatch: Run multi-layer validation first
  const validation = await validateEmailAddress(to);
  if (!validation.valid) {
    return {
      success: false,
      status: 'failed',
      recipient: to,
      failure_reason: validation.message,
      errorType: validation.errorType,
    };
  }

  const senderName = fromName || 'AI Workforce';
  const senderEmail = fromEmail || process.env.EMAIL_FROM || 'sales@aiworkforce.ai.studio';
  const fullFrom = `${senderName} <${senderEmail}>`;

  const providerErrors: string[] = [];

  // 1. Check for Google Workspace / Gmail API OAuth token
  if (googleAccessToken && googleAccessToken.trim()) {
    try {
      const rawEmail = buildRfc822Email(
        to,
        subject,
        bodyText,
        bodyHtml,
        fromEmail ? fullFrom : undefined
      );
      const encodedMessage = base64UrlEncode(rawEmail);

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      const resData: any = await res.json().catch(() => ({}));
      if (res.ok) {
        return {
          success: true,
          status: 'accepted',
          recipient: to,
          provider: 'gmail',
          provider_message_id: resData.id || `gmail_${Date.now()}`,
          sent_at: new Date().toISOString(),
        };
      } else {
        const errorMsg =
          resData?.error?.message ||
          (res.status === 401
            ? 'Gmail access token expired or revoked. Please reconnect Gmail.'
            : `Gmail API rejected email (${res.status})`);
        providerErrors.push(`Gmail: ${errorMsg}`);
      }
    } catch (err: any) {
      providerErrors.push(`Gmail: ${err?.message || err}`);
    }
  }

  // 2. Check for Resend Provider (RESEND_API_KEY)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim()) {
    try {
      const fromAddress = process.env.EMAIL_FROM || 'AI Workforce <onboarding@resend.dev>';
      const requestBody: any = {
        from: fromAddress,
        to: [to],
        subject,
        text: bodyText,
      };
      if (bodyHtml) {
        requestBody.html = bodyHtml;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const resData: any = await res.json().catch(() => ({}));
      if (res.ok) {
        return {
          success: true,
          status: 'accepted',
          recipient: to,
          provider: 'resend',
          provider_message_id: resData.id || `resend_${Date.now()}`,
          sent_at: new Date().toISOString(),
        };
      } else {
        const errorMsg = resData?.message || resData?.error?.message || `Resend rejected email (${res.status})`;
        providerErrors.push(`Resend: ${errorMsg}`);
      }
    } catch (err: any) {
      providerErrors.push(`Resend: ${err?.message || err}`);
    }
  }

  // 3. Check for SendGrid Provider (SENDGRID_API_KEY)
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey && sendgridApiKey.trim()) {
    try {
      const content = [{ type: 'text/plain', value: bodyText }];
      if (bodyHtml) {
        content.push({ type: 'text/html', value: bodyHtml });
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: senderEmail, name: senderName },
          subject,
          content,
        }),
      });

      if (res.ok) {
        const messageId = res.headers.get('x-message-id') || `sg_${Date.now()}`;
        return {
          success: true,
          status: 'accepted',
          recipient: to,
          provider: 'sendgrid',
          provider_message_id: messageId,
          sent_at: new Date().toISOString(),
        };
      } else {
        const resText = await res.text().catch(() => '');
        providerErrors.push(`SendGrid: Status ${res.status} - ${resText || 'Unknown rejection'}`);
      }
    } catch (err: any) {
      providerErrors.push(`SendGrid: ${err?.message || err}`);
    }
  }

  // 4. Check for Postmark Provider (POSTMARK_SERVER_TOKEN)
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  if (postmarkToken && postmarkToken.trim()) {
    try {
      const postmarkBody: any = {
        From: senderEmail,
        To: to,
        Subject: subject,
        TextBody: bodyText,
      };
      if (bodyHtml) {
        postmarkBody.HtmlBody = bodyHtml;
      }

      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': postmarkToken.trim(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(postmarkBody),
      });

      const resData: any = await res.json().catch(() => ({}));
      if (res.ok) {
        return {
          success: true,
          status: 'accepted',
          recipient: to,
          provider: 'postmark',
          provider_message_id: resData.MessageID || `pm_${Date.now()}`,
          sent_at: new Date().toISOString(),
        };
      } else {
        providerErrors.push(`Postmark: ${resData.Message || `Status ${res.status}`}`);
      }
    } catch (err: any) {
      providerErrors.push(`Postmark: ${err?.message || err}`);
    }
  }

  // If any providers were attempted and failed, report their exact error
  if (providerErrors.length > 0) {
    return {
      success: false,
      status: 'failed',
      recipient: to,
      failure_reason: `Email provider error: ${providerErrors.join('; ')}`,
      errorType: 'provider_rejected',
    };
  }

  // 5. No email provider configured on server
  return {
    success: false,
    status: 'failed',
    recipient: to,
    failure_reason:
      'No active email provider configured (RESEND_API_KEY, SENDGRID_API_KEY, or POSTMARK_SERVER_TOKEN). Please add your API key in environment variables or Settings.',
    errorType: 'provider_not_configured',
  };
}

export const sendEmailNotification = dispatchEmailViaProvider;
