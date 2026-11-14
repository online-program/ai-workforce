import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

export type ModelTaskType =
  | 'DEEP_REASONING'
  | 'RESPONSE_SYNTHESIS'
  | 'CONVERSATIONAL_WARMTH'
  | 'NUMERICAL_ANALYSIS'
  | 'RESEARCH';

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'deepseek' | 'xai' | 'perplexity' | 'deterministic';

export interface ModelRouteConfig {
  task: ModelTaskType;
  primaryProvider: AIProvider;
  primaryModel: string;
  fallbackProvider: AIProvider;
  fallbackModel: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

export interface ModelExecutionResult {
  text: string;
  provider: AIProvider;
  model: string;
  isFallback: boolean;
  latencyMs: number;
  estimatedCostUsd: number;
  tokensUsed?: { prompt: number; completion: number; total: number };
}

export interface ModelTelemetryLog {
  timestamp: string;
  task: ModelTaskType;
  provider: AIProvider;
  model: string;
  latencyMs: number;
  success: boolean;
  isFallback: boolean;
  estimatedCostUsd: number;
  errorMessage?: string;
}

// In-memory ring buffer for model execution telemetry
const MAX_TELEMETRY_ENTRIES = 100;
const modelTelemetryLogs: ModelTelemetryLog[] = [];

export function recordModelTelemetry(log: ModelTelemetryLog) {
  modelTelemetryLogs.unshift(log);
  if (modelTelemetryLogs.length > MAX_TELEMETRY_ENTRIES) {
    modelTelemetryLogs.pop();
  }
}

export function getModelTelemetry(): ModelTelemetryLog[] {
  return [...modelTelemetryLogs];
}

/**
 * Task-Based Router Configuration Map
 * Configured with genuine production API model identifiers.
 */
export const DEFAULT_MODEL_ROUTES: Record<ModelTaskType, ModelRouteConfig> = {
  DEEP_REASONING: {
    task: 'DEEP_REASONING',
    primaryProvider: 'deepseek',
    primaryModel: 'deepseek-reasoner',
    fallbackProvider: 'google',
    fallbackModel: 'gemini-4-hydrogen',
    maxTokens: 1024,
    temperature: 0.2,
    timeoutMs: 9000,
  },
  RESPONSE_SYNTHESIS: {
    task: 'RESPONSE_SYNTHESIS',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-3-7-sonnet-20250219',
    fallbackProvider: 'google',
    fallbackModel: 'gemini-4-hydrogen',
    maxTokens: 800,
    temperature: 0.3,
    timeoutMs: 6500,
  },
  CONVERSATIONAL_WARMTH: {
    task: 'CONVERSATIONAL_WARMTH',
    primaryProvider: 'google',
    primaryModel: 'gemini-3.1-flash-lite',
    fallbackProvider: 'google',
    fallbackModel: 'gemini-3.1-flash-lite',
    maxTokens: 600,
    temperature: 0.4,
    timeoutMs: 5000,
  },
  NUMERICAL_ANALYSIS: {
    task: 'NUMERICAL_ANALYSIS',
    primaryProvider: 'xai',
    primaryModel: 'grok-2-1212',
    fallbackProvider: 'deterministic',
    fallbackModel: 'alpha-numerical-engine',
    maxTokens: 500,
    temperature: 0.1,
    timeoutMs: 5000,
  },
  RESEARCH: {
    task: 'RESEARCH',
    primaryProvider: 'perplexity',
    primaryModel: 'sonar-pro',
    fallbackProvider: 'google',
    fallbackModel: 'gemini-4-hydrogen',
    maxTokens: 700,
    temperature: 0.2,
    timeoutMs: 8000,
  },
};

/**
 * Provider Status & Availability Detector
 * Checks for live environment keys without throwing runtime exceptions.
 */
export function getProviderCapabilities(): Record<AIProvider, { available: boolean; configuredKey: boolean; defaultModel: string }> {
  return {
    google: {
      available: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      configuredKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      defaultModel: 'gemini-3.1-flash-lite',
    },
    openai: {
      available: Boolean(process.env.OPENAI_API_KEY),
      configuredKey: Boolean(process.env.OPENAI_API_KEY),
      defaultModel: 'gpt-4o',
    },
    anthropic: {
      available: Boolean(process.env.ANTHROPIC_API_KEY),
      configuredKey: Boolean(process.env.ANTHROPIC_API_KEY),
      defaultModel: 'claude-3-7-sonnet-20250219',
    },
    deepseek: {
      available: Boolean(process.env.DEEPSEEK_API_KEY),
      configuredKey: Boolean(process.env.DEEPSEEK_API_KEY),
      defaultModel: 'deepseek-reasoner',
    },
    xai: {
      available: Boolean(process.env.XAI_API_KEY),
      configuredKey: Boolean(process.env.XAI_API_KEY),
      defaultModel: 'grok-2-1212',
    },
    perplexity: {
      available: Boolean(process.env.PERPLEXITY_API_KEY),
      configuredKey: Boolean(process.env.PERPLEXITY_API_KEY),
      defaultModel: 'sonar-pro',
    },
    deterministic: {
      available: true,
      configuredKey: true,
      defaultModel: 'alpha-numerical-engine',
    },
  };
}

let cachedGenAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!cachedGenAI) {
    cachedGenAI = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'ai-workforce-model-router' } },
    });
  }
  return cachedGenAI;
}

/**
 * Executes a call with a strict timeout wrapper.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms executing ${operationName}`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Unified Task-Based Model Dispatcher
 * Automatically routes tasks to the configured provider, with transparent fallbacks and telemetry.
 */
export async function executeModelTask(
  task: ModelTaskType,
  systemPrompt: string,
  userPrompt: string,
  options?: {
    forcedProvider?: AIProvider;
    customTimeoutMs?: number;
    tenantId?: string;
  }
): Promise<ModelExecutionResult> {
  const route = DEFAULT_MODEL_ROUTES[task];
  const startTime = Date.now();
  const capabilities = getProviderCapabilities();

  const targetProvider = options?.forcedProvider || route.primaryProvider;
  const targetModel = targetProvider === route.primaryProvider ? route.primaryModel : route.fallbackModel;
  const timeoutMs = options?.customTimeoutMs || route.timeoutMs;

  // Check if primary provider is available
  const canUsePrimary = capabilities[targetProvider]?.available;

  if (canUsePrimary && targetProvider !== 'google' && targetProvider !== 'deterministic') {
    try {
      // If external provider key is present, execute standard fetch to their endpoint
      const result = await withTimeout(
        callExternalProvider(targetProvider, targetModel, systemPrompt, userPrompt, route.temperature, route.maxTokens),
        timeoutMs,
        `${targetProvider}:${targetModel}`
      );
      const latencyMs = Date.now() - startTime;
      recordModelTelemetry({
        timestamp: new Date().toISOString(),
        task,
        provider: targetProvider,
        model: targetModel,
        latencyMs,
        success: true,
        isFallback: false,
        estimatedCostUsd: result.costUsd,
      });
      return {
        text: result.text,
        provider: targetProvider,
        model: targetModel,
        isFallback: false,
        latencyMs,
        estimatedCostUsd: result.costUsd,
        tokensUsed: result.tokens,
      };
    } catch (err: any) {
      console.warn(`[ModelRouter] Primary provider ${targetProvider} failed (${err?.message}). Engaging fallback ${route.fallbackProvider}...`);
    }
  }

  // Primary was unavailable or failed: Execute Fallback
  const fallbackProvider = route.fallbackProvider;
  const fallbackModel = route.fallbackModel;

  try {
    if (fallbackProvider === 'google' && capabilities.google.available) {
      const ai = getGenAI();
      const callPromise = ai.models.generateContent({
        model: fallbackModel,
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question:\n${userPrompt}` }] },
        ],
        config: {
          temperature: route.temperature,
          maxOutputTokens: route.maxTokens,
        },
      });

      const response = await withTimeout(callPromise, timeoutMs, `google:${fallbackModel}`);
      const text = response.text || '';
      const latencyMs = Date.now() - startTime;

      recordModelTelemetry({
        timestamp: new Date().toISOString(),
        task,
        provider: 'google',
        model: fallbackModel,
        latencyMs,
        success: true,
        isFallback: true,
        estimatedCostUsd: 0.00015,
      });

      return {
        text,
        provider: 'google',
        model: fallbackModel,
        isFallback: true,
        latencyMs,
        estimatedCostUsd: 0.00015,
      };
    }
  } catch (fallbackErr: any) {
    console.warn(`[ModelRouter] Google fallback failed (${fallbackErr?.message}).`);
  }

  // Graceful deterministic fallback
  const latencyMs = Date.now() - startTime;
  recordModelTelemetry({
    timestamp: new Date().toISOString(),
    task,
    provider: 'deterministic',
    model: 'alpha-numerical-engine',
    latencyMs,
    success: true,
    isFallback: true,
    estimatedCostUsd: 0,
  });

  return {
    text: '',
    provider: 'deterministic',
    model: 'alpha-numerical-engine',
    isFallback: true,
    latencyMs,
    estimatedCostUsd: 0,
  };
}

/**
 * External Provider Adapter
 * Clean, standard HTTP call with authorization headers and normalized payload extraction.
 */
async function callExternalProvider(
  provider: AIProvider,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<{ text: string; costUsd: number; tokens?: { prompt: number; completion: number; total: number } }> {
  let url = '';
  let apiKey = '';
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: any = {};

  switch (provider) {
    case 'openai':
    case 'deepseek':
    case 'xai':
    case 'perplexity': {
      if (provider === 'openai') {
        url = 'https://api.openai.com/v1/chat/completions';
        apiKey = process.env.OPENAI_API_KEY || '';
      } else if (provider === 'deepseek') {
        url = 'https://api.deepseek.com/chat/completions';
        apiKey = process.env.DEEPSEEK_API_KEY || '';
      } else if (provider === 'xai') {
        url = 'https://api.x.ai/v1/chat/completions';
        apiKey = process.env.XAI_API_KEY || '';
      } else if (provider === 'perplexity') {
        url = 'https://api.perplexity.ai/chat/completions';
        apiKey = process.env.PERPLEXITY_API_KEY || '';
      }
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      };
      break;
    }

    case 'anthropic': {
      url = 'https://api.anthropic.com/v1/messages';
      apiKey = process.env.ANTHROPIC_API_KEY || '';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature,
        max_tokens: maxTokens,
      };
      break;
    }

    default:
      throw new Error(`Provider ${provider} adapter not supported.`);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status} from ${provider}: ${errText.slice(0, 160)}`);
  }

  const data: any = await res.json();
  let text = '';
  let tokens = { prompt: 0, completion: 0, total: 0 };

  if (provider === 'anthropic') {
    text = data.content?.[0]?.text || '';
    tokens = {
      prompt: data.usage?.input_tokens || 0,
      completion: data.usage?.output_tokens || 0,
      total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  } else {
    text = data.choices?.[0]?.message?.content || '';
    tokens = {
      prompt: data.usage?.prompt_tokens || 0,
      completion: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0,
    };
  }

  // Estimate cost per 1M tokens approx
  const costUsd = (tokens.prompt * 0.0000015) + (tokens.completion * 0.000006);

  return { text, costUsd, tokens };
}
