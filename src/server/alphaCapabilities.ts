export interface CapabilityCheckResult {
  isCapabilityQuery: boolean;
  capabilityName?: string;
  isSupported: boolean;
  requiresIntegration: boolean;
  groundedResponse?: string;
}

export function checkAlphaCapabilities(
  message: string,
  options?: { isOfficialAiWorkforce?: boolean; businessName?: string }
): CapabilityCheckResult {
  const lower = message.toLowerCase().trim();
  const isOfficial = Boolean(options?.isOfficialAiWorkforce);
  const businessName = options?.businessName?.trim() || 'our business';

  // 1. Step-by-Step Embedding & Installation Instructions (ONLY for Official AI Workforce platform)
  if (
    isOfficial &&
    (/\b(?:how (?:do i|can i|to|do we)\s+(?:embed|install|add|deploy|set up|integrate|start)|step[- ]by[- ]step\s+(?:instructions?|guide)\s+(?:to|for)\s+(?:embed|install|integrate)|embedding instructions?|installation instructions?|how do i embed alpha|how to embed alpha|how do we start|how to start)\b/i.test(lower) ||
      ((lower.includes('embed') || lower.includes('install') || lower.includes('deploy')) && (lower.includes('website') || lower.includes('site') || lower.includes('script') || lower.includes('step-by-step') || lower.includes('steps') || lower.includes('how do we start') || lower.includes('how to start'))))
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'widget_embedding',
      isSupported: true,
      requiresIntegration: false,
      groundedResponse:
        "Here are the step-by-step instructions to embed Alpha on your website:\n\n" +
        "1. **Log in to your Dashboard**: Access your AI Workforce tenant workspace.\n" +
        "2. **Navigate to Website Chat**: Click the **Website Chat** tab in the navigation bar to configure your widget.\n" +
        "3. **Copy the Embed Snippet**: Copy your unique JavaScript snippet with your workspace widget ID.\n" +
        "4. **Paste before `</body>`**: Paste the script tag into your website's HTML right before the closing `</body>` tag (or inside the `<head>` section).\n" +
        "5. **Save & Test**: Deploy your changes and refresh your website. Alpha is now live, engaging visitors 24/7.",
    };
  }

  // 2. Hallucination Prevention & Accuracy Inquiry
  if (
    /\b(?:can (?:alpha|you) hallucinat|does (?:alpha|it) hallucinat|make things up|prevent hallucinations?|guarantee no hallucinations?|can it hallucinat)\b/i.test(lower) ||
    (lower.includes('hallucinat') && (lower.includes('alpha') || lower.includes('can') || lower.includes('does') || lower.includes('how')))
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'hallucination_prevention',
      isSupported: true,
      requiresIntegration: false,
      groundedResponse:
        `While no generative AI model can guarantee zero errors, responses here are strictly grounded in ${businessName}'s verified information. If a question falls outside verified details or policies, it is escalated for human review rather than fabricated.`,
    };
  }

  // 3. Headcount & Team Size Inquiry for Official AI Workforce
  if (
    isOfficial &&
    (/\b(?:how many (?:people|employees|staff|workers)|team size|headcount)\s+(?:work at|work for|are at|does)?\s*(?:ai workforce|alpha|the company|your team|you have)\b/i.test(lower) ||
      (lower.includes('headcount') && (lower.includes('ai workforce') || lower.includes('alpha'))) ||
      (lower.includes('how many people work') && lower.includes('ai workforce')))
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'ai_workforce_headcount',
      isSupported: false,
      requiresIntegration: false,
      groundedResponse:
        "I don't have a verified headcount figure for AI Workforce's team in our Company Brain. What I can help with is exploring our conversational AI capabilities, architecture, and deployment options.",
    };
  }

  // 4. Identity Check: "Do you know who I am?"
  if (
    /\b(?:do you know who i am|who am i|do you know my name|what is my name)\b/i.test(lower)
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'visitor_identity_check',
      isSupported: true,
      requiresIntegration: false,
      groundedResponse:
        "I don't know who you are yet, as you haven't introduced yourself or shared your name. If you'd like to share who you are or what you're looking for, I'm happy to help!",
    };
  }

  // 5. Conversational "What are you doing?"
  if (
    /^(?:what are you doing|what(?:'re| re) you doing|what are u doing|what do you do all day)[?.!]*$/i.test(lower) ||
    /\bwhat are you doing\b/i.test(lower)
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'current_activity',
      isSupported: true,
      requiresIntegration: false,
      groundedResponse: isOfficial
        ? "I'm here as the AI Sales Manager for AI Workforce, available 24/7 to help visitors explore our platform, understand Alpha's capabilities, and qualify opportunities. How can I assist you today?"
        : `I'm the conversational assistant for ${businessName}, available 24/7 to answer questions about our offerings and assist with inquiries. How can I help you today?`,
    };
  }

  // 6. Direct Calendar Booking / CRM Update Combined or Separate Inquiry
  if (
    (/\b(?:update (?:our|my|the)?\s*crm|crm sync|sync with (?:hubspot|salesforce|pipedrive|my crm))\b/i.test(lower) &&
      /\b(?:book (?:a\s+)?meeting|schedule (?:a\s+)?meeting|calendar)\b/i.test(lower)) ||
    /\b(?:update (?:our|my|the)?\s*crm and book a meeting|can you (?:actually )?update (?:our|my|the)?\s*crm)\b/i.test(lower)
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'crm_and_meeting_booking',
      isSupported: false,
      requiresIntegration: true,
      groundedResponse: "I can't directly update an external CRM or book a calendar slot from this chat because those external integrations aren't connected here. I can capture your details and route the request to our team.",
    };
  }

  // 6b. Direct Calendar Booking Inquiry
  if (
    /\b(?:book (?:appointments?|meetings?|slots?) (?:directly )?(?:into|on|in) my calendar|calendar booking|direct calendar|sync with my google calendar|calendly integration)\b/i.test(lower) ||
    (/\b(?:book|schedule)\b/i.test(lower) && /\b(?:directly (?:in|into|on) (?:my|a) calendar)\b/i.test(lower))
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'calendar_booking',
      isSupported: false,
      requiresIntegration: true,
      groundedResponse: 'I can collect your preferred times or share our contact instructions, though automated live calendar booking is not directly connected in this chat.',
    };
  }

  // 6c. Multi-Integration Channel Query
  const mentionsWhatsApp = /\bwhatsapp\b/i.test(lower);
  const mentionsInstagram = /\binstagram\b/i.test(lower);
  const mentionsSalesforce = /\bsalesforce\b/i.test(lower);
  const mentionsHubSpot = /\bhubspot\b/i.test(lower);

  const matchedIntegrationCount = [mentionsWhatsApp, mentionsInstagram, mentionsSalesforce, mentionsHubSpot].filter(Boolean).length;
  if (isOfficial && (matchedIntegrationCount >= 2 || (matchedIntegrationCount >= 1 && (mentionsWhatsApp || mentionsInstagram) && /\b(?:integrate|integrations?|connect|support|channels?)\b/i.test(lower)))) {
    const lines: string[] = [
      "Here is the verified status for each requested integration:",
      "• **Website Widget**: **Supported (Live)** — Deploys directly onto web properties via an embeddable script tag.",
    ];
    if (mentionsWhatsApp) {
      lines.push("• **WhatsApp**: **Not Currently Supported** — Native WhatsApp messaging is not connected in this release.");
    }
    if (mentionsInstagram) {
      lines.push("• **Instagram**: **Not Currently Supported** — Direct Instagram DM integration is not available.");
    }
    if (mentionsSalesforce) {
      lines.push("• **Salesforce CRM**: **Requires External Integration** — Not connected natively out-of-the-box.");
    }
    if (mentionsHubSpot) {
      lines.push("• **HubSpot CRM**: **Requires External Integration** — Not connected natively out-of-the-box.");
    }
    return {
      isCapabilityQuery: true,
      capabilityName: 'multi_channel_integrations',
      isSupported: false,
      requiresIntegration: true,
      groundedResponse: lines.join('\n'),
    };
  }

  // 7. CRM Sync Inquiry
  if (
    /\b(?:sync with (?:hubspot|salesforce|pipedrive|my crm)|update crm directly|crm sync|update our crm|update the crm)\b/i.test(lower)
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'crm_sync',
      isSupported: false,
      requiresIntegration: true,
      groundedResponse: "I can't directly update an external CRM from this chat because CRM integrations aren't connected here. I can capture your details and pass them to our team.",
    };
  }

  // 8. Phone / Voice Calling Inquiry
  if (
    /\b(?:make phone calls|call my leads|voice calling|phone agent)\b/i.test(lower)
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'voice_calling',
      isSupported: false,
      requiresIntegration: true,
      groundedResponse: 'This assistant operates via text-based web chat. Live outbound voice calling is not supported.',
    };
  }

  // 9. Direct Payments
  if (
    /\b(?:take credit cards|process payments directly|charge customers in chat)\b/i.test(lower)
  ) {
    return {
      isCapabilityQuery: true,
      capabilityName: 'payment_processing',
      isSupported: false,
      requiresIntegration: true,
      groundedResponse: 'I can provide verified pricing information and register your inquiry, but I do not process credit cards or direct payments inside chat.',
    };
  }

  return {
    isCapabilityQuery: false,
    isSupported: true,
    requiresIntegration: false,
  };
}
