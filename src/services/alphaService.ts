import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export interface AlphaV2ConversationState {
  conversationId: string;
  currentTopic: string;
  previousTopic?: string;
  conversationFacts: Record<string, any>;
  userStyle: 'professional' | 'casual' | 'slang' | 'gen_z' | string;
  userCorrections: string[];
  recentMessages: Array<{ sender: 'customer' | 'assistant' | 'system'; text: string }>;
  isFounderMode: boolean;
  leadVolume?: string;
  primaryProblem?: string;
}

export interface AlphaV2ValidationResult {
  isValid: boolean;
  cleanedReply: string;
  reason?: string;
}

export class AlphaV2Service {
  private static instance: AlphaV2Service;
  private activeRequests = new Map<string, AbortController>();
  private stateRegistry = new Map<string, AlphaV2ConversationState>();
  private genAIClient: GoogleGenAI | null = null;

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-alpha-v2',
          },
        },
      });
    }
  }

  public static getInstance(): AlphaV2Service {
    if (!AlphaV2Service.instance) {
      AlphaV2Service.instance = new AlphaV2Service();
    }
    return AlphaV2Service.instance;
  }

  /**
   * Performs request isolation by aborting any running request for the given conversation ID.
   * Returns a fresh AbortController for the current request.
   */
  public registerRequest(conversationId: string): AbortController {
    const existing = this.activeRequests.get(conversationId);
    if (existing) {
      try {
        existing.abort();
        console.log(`[ALPHA_V2] Aborted stale request for conversation ${conversationId}`);
      } catch (e) {
        console.warn(`[ALPHA_V2] Error aborting request:`, e);
      }
    }
    const controller = new AbortController();
    this.activeRequests.set(conversationId, controller);
    return controller;
  }

  public clearRequest(conversationId: string) {
    this.activeRequests.delete(conversationId);
  }

  /**
   * Retrieves or initializes the conversational state for context awareness.
   */
  public getOrCreateState(conversationId: string): AlphaV2ConversationState {
    let state = this.stateRegistry.get(conversationId);
    if (!state) {
      if (this.stateRegistry.size >= 1000) {
        const oldestKey = this.stateRegistry.keys().next().value;
        if (oldestKey) this.stateRegistry.delete(oldestKey);
      }
      state = {
        conversationId,
        currentTopic: 'general',
        conversationFacts: {},
        userStyle: 'professional',
        userCorrections: [],
        recentMessages: [],
        isFounderMode: false,
      };
      this.stateRegistry.set(conversationId, state);
    }
    return state;
  }

  /**
   * Updates state facts dynamically and handles memory self-corrections.
   */
  public updateState(conversationId: string, message: string, sender: 'customer' | 'assistant') {
    const state = this.getOrCreateState(conversationId);
    state.recentMessages.push({ sender, text: message });
    if (state.recentMessages.length > 15) {
      state.recentMessages.shift();
    }

    if (sender === 'customer') {
      const lower = message.toLowerCase();

      // Style recognition
      if (/\b(?:talk in slang bro|speak in slang|use slang bro|talk in slang)\b/.test(lower)) {
        state.userStyle = 'slang';
      } else if (/\b(?:you are not so cool be genz bro|be genz bro|be gen-z bro|be gen z|talk genz|sound genz)\b/.test(lower)) {
        state.userStyle = 'gen_z';
      } else if (/\b(?:talk normally|be professional|speak professionally|professional tone)\b/.test(lower)) {
        state.userStyle = 'professional';
      } else if (/\b(?:keep it casual|be casual|talk casually)\b/.test(lower)) {
        state.userStyle = 'casual';
      }

      // Founder Recognition
      if (
        /\b(?:you know i(?:'m| am)|i(?:'m| am)|i am)\s+magnus(?:\s+verity)?\b/.test(lower) ||
        lower.includes('magnus verity')
      ) {
        state.isFounderMode = true;
      }

      // Lead and inquiry volume and corrections
      const transitionMatch = lower.match(/(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:inbound\s*)?(leads?|inquiries|inquiry)?\s*(?:->|→)\s*(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:inbound\s*)?(leads?|inquiries|inquiry)?(?:\s*(?:a|per|every|\/)\s*(month|week|day|mo|wk))?/i);
      const correctionMatch = transitionMatch ||
        lower.match(/(?:actually forget|forget (?:what i said about|the)\s*\d+|correction|correct myself|no wait|instead of)\s+(\d+)\s*(?:leads|inquiries)?\.?\s*(?:it's|it is|closer to)\s*(\d+(?:[–-]\d+)?)(?:\s*(?:leads|inquiries)?)?(?:\s*(?:per|a|every)\s*(month|week|day))?/i) ||
        lower.match(/(?:actually|make that|closer to)\s*(\d+(?:[–-]\d+)?)\s*(?:leads?|inquiries?)?(?:\s*(?:per|a|every)\s*(month|week|day))?/i);
      const leadsMatch = lower.match(/(?:around\s+|approx\s+)?(\d+)(?:\s*(?:to|–|-)\s*(\d+))?\s*(?:inbound\s*)?(leads?|inquiries|inquiry)(?:\s*(?:a|per|every|\/)?\s*(week|month|day|wk|mo))?/i);

      if (transitionMatch) {
        const min = transitionMatch[4];
        const max = transitionMatch[5];
        const noun = transitionMatch[6] || transitionMatch[3] || 'inquiries';
        const rawUnit = transitionMatch[7];
        const priorUnit = state.leadVolume?.includes('month') ? 'month' : state.leadVolume?.includes('week') ? 'week' : undefined;
        const unit = rawUnit ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : 'day') : priorUnit;
        const range = max ? `${min}–${max}` : `${min}`;
        const val = unit ? `${range} ${noun}/${unit}` : `${range} ${noun} (period unspecified)`;
        state.leadVolume = val;
        state.conversationFacts['lead_volume'] = val;
        state.userCorrections.push(`Updated volume to ${val}`);
      } else if (correctionMatch) {
        const count = correctionMatch[2] || correctionMatch[1];
        const rawUnit = correctionMatch[3];
        const priorUnit = state.leadVolume?.includes('month') ? 'month' : state.leadVolume?.includes('week') ? 'week' : undefined;
        const unit = rawUnit ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : 'day') : priorUnit;
        const noun = state.leadVolume?.includes('inquir') ? 'inquiries' : 'leads';
        const newVal = unit ? `${count} ${noun}/${unit}` : `${count} ${noun} (period unspecified)`;
        state.leadVolume = newVal;
        state.conversationFacts['lead_volume'] = newVal;
        state.userCorrections.push(`Corrected lead volume to ${newVal}`);
      } else if (leadsMatch) {
        const min = leadsMatch[1];
        const max = leadsMatch[2];
        const noun = leadsMatch[3] || 'leads';
        const rawUnit = leadsMatch[4];
        const unit = rawUnit ? (rawUnit.startsWith('m') ? 'month' : rawUnit.startsWith('w') ? 'week' : 'day') : undefined;
        const range = max ? `${min}–${max}` : `${min}`;
        const val = unit ? `${range} ${noun}/${unit}` : `${range} ${noun} (period unspecified)`;
        state.leadVolume = val;
        state.conversationFacts['lead_volume'] = val;
      }

      // Topic tracking
      if (/\b(?:dental clinic|dentist|teeth|tooth|root canal)\b/.test(lower)) {
        if (state.currentTopic !== 'dental_clinic') {
          state.previousTopic = state.currentTopic;
          state.currentTopic = 'dental_clinic';
        }
      } else if (/\b(?:saas|software|platform|app)\b/.test(lower)) {
        if (state.currentTopic !== 'saas') {
          state.previousTopic = state.currentTopic;
          state.currentTopic = 'saas';
        }
      } else if (/\b(?:agency|agencies|web design|web development)\b/.test(lower)) {
        if (state.currentTopic !== 'web_design_agency') {
          state.previousTopic = state.currentTopic;
          state.currentTopic = 'web_design_agency';
        }
      }
    }
  }

  /**
   * Deterministic Validation Layer (Phase 17)
   * Checks for and rejects empty outputs, repeated sentence patterns, and leakage of system prompt or internal metadata.
   */
  public validateResponse(reply: string, state: AlphaV2ConversationState): AlphaV2ValidationResult {
    if (!reply || !reply.trim()) {
      return { isValid: false, cleanedReply: '', reason: 'Empty output' };
    }

    let cleaned = reply.trim();

    // Remove system prefixes
    cleaned = cleaned.replace(/^(Alpha|Assistant|Sales Manager|System):\s*/i, '');
    cleaned = cleaned.replace(/^(Customer|Visitor|User):\s*/i, '');

    // Fix malformed concatenation & duplicate word phrases
    cleaned = cleaned.replace(/\b(That|Sure|Yes|No|Wait|And)(I'm|I am|We're|We are|How|What)\b/g, '$1 $2');
    cleaned = cleaned.replace(/\b(That|Sure|Yes|No|Wait|Okay|I'm here)I'm here\b/gi, "I'm here");
    cleaned = cleaned.replace(/\b(I can help|Sure|That|Wait|Okay)\1+/gi, '$1');

    // Reject internal prompt leaking patterns & credentials
    const lowerCleaned = cleaned.toLowerCase();
    if (
      lowerCleaned.includes('[system') ||
      lowerCleaned.includes('system_prompt') ||
      lowerCleaned.includes('system prompt') ||
      lowerCleaned.includes('systeminstruction') ||
      lowerCleaned.includes('system instruction') ||
      lowerCleaned.includes('confidence score') ||
      lowerCleaned.includes('userstyle') ||
      lowerCleaned.includes('api_key') ||
      lowerCleaned.includes('api key') ||
      lowerCleaned.includes('credentials') ||
      lowerCleaned.includes('database info')
    ) {
      return { isValid: false, cleanedReply: '', reason: 'Detected system instruction or metadata leakage' };
    }

    // Repeated Sentence Pattern / Loop Detection
    const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length > 1) {
      const sentenceSet = new Set<string>();
      for (const sent of sentences) {
        const normalized = sent.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (sentenceSet.has(normalized)) {
          return { isValid: false, cleanedReply: '', reason: 'Detected repeated sentence patterns or loops' };
        }
        sentenceSet.add(normalized);
      }
    }

    // Only trim trailing incomplete fragment if response was cut off without ending punctuation
    const endsWithPunctuation = /[.!?]["')\]]*$/.test(cleaned);
    if (!endsWithPunctuation) {
      const incompleteTrailing = ['until', 'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'with', 'for'];
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
        if (incompleteTrailing.includes(lastWord)) {
          words.pop();
          cleaned = words.join(' ') + '.';
        }
      }
    }

    return {
      isValid: true,
      cleanedReply: cleaned,
    };
  }

  /**
   * Streams a completely isolated, context-aware V2 response.
   */
  public async *streamResponse(
    conversationId: string,
    message: string,
    systemInstruction: string,
    controller: AbortController
  ): AsyncGenerator<string> {
    const state = this.getOrCreateState(conversationId);
    this.updateState(conversationId, message, 'customer');

    if (!this.genAIClient) {
      yield "GEMINI_API_KEY is not configured.";
      return;
    }

    const recentHistory = state.recentMessages
      .slice(-6)
      .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Alpha'}: ${m.text}`)
      .join('\n');

    const promptContext = `CONVERSATION STATE:
- Topic: ${state.currentTopic}
- Style: ${state.userStyle}
- Lead Volume Fact: ${state.leadVolume || 'Unknown'}
- Is Founder: ${state.isFounderMode ? 'Yes (Magnus Verity)' : 'No'}

RECENT EXCHANGES:
${recentHistory}

LATEST CUSTOMER MESSAGE:
"${message}"

Respond concisely in matching character style as Alpha. Avoid repetitive pitches.`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
    let yieldedAny = false;

    try {
      for (const modelName of candidateModels) {
        if (controller.signal.aborted) break;
        try {
          const responseStream = await this.genAIClient.models.generateContentStream({
            model: modelName,
            contents: promptContext,
            config: {
              systemInstruction,
              temperature: 0.25,
              maxOutputTokens: 250,
              abortSignal: controller.signal,
            },
          });

          let accumulated = '';
          for await (const chunk of responseStream) {
            if (controller.signal.aborted) {
              console.log(`[ALPHA_V2] Request aborted mid-stream for ${conversationId}`);
              break;
            }
            const text = chunk.text;
            if (text) {
              accumulated += text;
              yieldedAny = true;
              yield text;
            }
          }

          if (accumulated.trim()) {
            const val = this.validateResponse(accumulated, state);
            if (val.isValid) {
              this.updateState(conversationId, val.cleanedReply, 'assistant');
            }
            return;
          }
        } catch (e: any) {
          if (e.name === 'AbortError') {
            console.log(`[ALPHA_V2] Stream aborted successfully.`);
            return;
          } else {
            console.warn(`[ALPHA_V2] Model ${modelName} stream error, trying next candidate:`, e?.message || e);
          }
        }
      }

      if (!yieldedAny && !controller.signal.aborted) {
        yield "I'm right here with you. What specific question can I answer for you next?";
      }
    } finally {
      this.clearRequest(conversationId);
    }
  }
}
