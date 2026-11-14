/**
 * PROJECT ALPHA — MULTI-MODEL INTELLIGENCE ARCHITECTURE & PROVIDER REGISTRY
 * 
 * Modular, provider-independent AI orchestration architecture for Alpha AI Sales Manager.
 * Supports specialist provider adapters: Gemini, OpenAI, Claude, DeepSeek, Perplexity, Grok.
 * 
 * Enforces task-based intelligent routing, provider status tracking, cost estimation,
 * latency measurement, and seamless primary fallback when external API keys are unconfigured.
 */

import dotenv from 'dotenv';
dotenv.config();

export type ModelProviderId = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'perplexity' | 'grok';

export type AlphaTaskCategory =
  | 'GREETING'
  | 'GENERAL_FAQ'
  | 'PRODUCT_INQUIRY'
  | 'SERVICE_INQUIRY'
  | 'PRICING_INQUIRY'
  | 'SALES_QUALIFICATION'
  | 'OBJECTION_HANDLING'
  | 'PRODUCT_RECOMMENDATION'
  | 'PURCHASE_INTENT'
  | 'HUMAN_ASSISTANCE'
  | 'COMPLEX_REASONING'
  | 'RESEARCH_REQUEST'
  | 'NUMERICAL_ANALYTICS';

export interface ProviderCapabilityDeclaration {
  deepReasoning: boolean;
  responseQuality: boolean;
  conversationalPersonality: boolean;
  externalResearch: boolean;
  numericalAnalytics: boolean;
  supportedModels: string[];
}

export interface ModelUsageMetrics {
  providerId: ModelProviderId;
  modelName: string;
  taskCategory: AlphaTaskCategory;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  timestamp: string;
  status: 'SUCCESS' | 'FALLBACK' | 'ERROR';
}

export interface ProviderAdapterStatus {
  id: ModelProviderId;
  name: string;
  status: 'connected' | 'disconnected' | 'degraded';
  apiKeyConfigured: boolean;
  capabilities: ProviderCapabilityDeclaration;
  avgLatencyMs: number;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  lastError?: string;
}

export interface ModelInvokeParams {
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  taskCategory?: AlphaTaskCategory;
}

export interface ModelInvokeResult {
  text: string;
  providerId: ModelProviderId;
  modelUsed: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  fallbackUsed?: boolean;
}

// In-memory usage telemetry store for Admin Analytics
const usageLogs: ModelUsageMetrics[] = [];
const providerStats: Record<ModelProviderId, { calls: number; tokens: number; cost: number; totalLatencyMs: number; errors: number }> = {
  gemini: { calls: 0, tokens: 0, cost: 0, totalLatencyMs: 0, errors: 0 },
  openai: { calls: 0, tokens: 0, cost: 0, totalLatencyMs: 0, errors: 0 },
  claude: { calls: 0, tokens: 0, cost: 0, totalLatencyMs: 0, errors: 0 },
  deepseek: { calls: 0, tokens: 0, cost: 0, totalLatencyMs: 0, errors: 0 },
  perplexity: { calls: 0, tokens: 0, cost: 0, totalLatencyMs: 0, errors: 0 },
  grok: { calls: 0, tokens: 0, cost: 0, totalLatencyMs: 0, errors: 0 },
};

/**
 * Provider Capability Declarations
 */
export const PROVIDER_CAPABILITIES: Record<ModelProviderId, ProviderCapabilityDeclaration> = {
  gemini: {
    deepReasoning: true,
    responseQuality: true,
    conversationalPersonality: true,
    externalResearch: false,
    numericalAnalytics: true,
    supportedModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-1.5-pro'],
  },
  openai: {
    deepReasoning: true,
    responseQuality: true,
    conversationalPersonality: true,
    externalResearch: false,
    numericalAnalytics: true,
    supportedModels: ['o3-mini', 'gpt-4o', 'gpt-4o-mini'],
  },
  claude: {
    deepReasoning: true,
    responseQuality: true,
    conversationalPersonality: true,
    externalResearch: false,
    numericalAnalytics: false,
    supportedModels: ['claude-3-5-sonnet', 'claude-3-haiku'],
  },
  deepseek: {
    deepReasoning: true,
    responseQuality: true,
    conversationalPersonality: false,
    externalResearch: false,
    numericalAnalytics: true,
    supportedModels: ['deepseek-r1', 'deepseek-chat'],
  },
  perplexity: {
    deepReasoning: true,
    responseQuality: false,
    conversationalPersonality: false,
    externalResearch: true,
    numericalAnalytics: false,
    supportedModels: ['sonar-reasoning', 'sonar-pro'],
  },
  grok: {
    deepReasoning: true,
    responseQuality: true,
    conversationalPersonality: false,
    externalResearch: false,
    numericalAnalytics: true,
    supportedModels: ['grok-2', 'grok-beta'],
  },
};

/**
 * Checks API key availability per provider
 */
export function getProviderApiKey(providerId: ModelProviderId): string | null {
  switch (providerId) {
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || null;
    case 'openai':
      return process.env.OPENAI_API_KEY || null;
    case 'claude':
      return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || null;
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY || null;
    case 'perplexity':
      return process.env.PERPLEXITY_API_KEY || null;
    case 'grok':
      return process.env.GROK_API_KEY || process.env.XAI_API_KEY || null;
    default:
      return null;
  }
}

/**
 * Estimates API costs per token (in USD)
 */
export function estimateTokenCost(providerId: ModelProviderId, model: string, inputTokens: number, outputTokens: number): number {
  switch (providerId) {
    case 'gemini':
      return (inputTokens * 0.0000001) + (outputTokens * 0.0000004);
    case 'openai':
      if (model.startsWith('o3')) return (inputTokens * 0.0000011) + (outputTokens * 0.0000044);
      return (inputTokens * 0.0000025) + (outputTokens * 0.000010);
    case 'claude':
      return (inputTokens * 0.000003) + (outputTokens * 0.000015);
    case 'deepseek':
      return (inputTokens * 0.00000055) + (outputTokens * 0.00000219);
    case 'perplexity':
      return (inputTokens * 0.000001) + (outputTokens * 0.000005);
    case 'grok':
      return (inputTokens * 0.000002) + (outputTokens * 0.000010);
    default:
      return 0;
  }
}

/**
 * Get Authoritative Provider Statuses for Admin Dashboard
 */
export function getProviderStatuses(): ProviderAdapterStatus[] {
  const providers: ModelProviderId[] = ['gemini', 'openai', 'claude', 'deepseek', 'perplexity', 'grok'];
  
  return providers.map((id) => {
    const key = getProviderApiKey(id);
    const stats = providerStats[id];
    const isConfigured = !!key && key.trim().length > 5;
    const avgLat = stats.calls > 0 ? Math.round(stats.totalLatencyMs / stats.calls) : 0;
    
    let status: 'connected' | 'disconnected' | 'degraded' = isConfigured ? 'connected' : 'disconnected';
    if (isConfigured && stats.errors > 3) status = 'degraded';

    const providerNames: Record<ModelProviderId, string> = {
      gemini: 'Google Gemini (Conversational Core)',
      openai: 'OpenAI (Quality & Strategic Reasoning)',
      claude: 'Anthropic Claude (High-IQ Customer Understanding)',
      deepseek: 'DeepSeek (Deep Sales Scenario Reasoning)',
      perplexity: 'Perplexity (External Market Research)',
      grok: 'xAI Grok (Numerical Business Intelligence)',
    };

    return {
      id,
      name: providerNames[id],
      status,
      apiKeyConfigured: isConfigured,
      capabilities: PROVIDER_CAPABILITIES[id],
      avgLatencyMs: avgLat,
      totalCalls: stats.calls,
      totalTokens: stats.tokens,
      totalCostUsd: Number(stats.cost.toFixed(6)),
    };
  });
}

/**
 * Intelligent Router: Selects provider and model based on Task Category, Complexity, Cost and Health
 */
export interface TaskRoutingDecision {
  primaryProvider: ModelProviderId;
  primaryModel: string;
  fallbackProvider: ModelProviderId;
  fallbackModel: string;
  rationale: string;
}

export function routeTaskForAlpha(taskCategory: AlphaTaskCategory, complexity: 'simple' | 'medium' | 'complex' = 'medium'): TaskRoutingDecision {
  // 1. Check which providers are connected
  const geminiKey = getProviderApiKey('gemini');
  const openaiKey = getProviderApiKey('openai');
  const claudeKey = getProviderApiKey('claude');
  const deepseekKey = getProviderApiKey('deepseek');
  const perplexityKey = getProviderApiKey('perplexity');
  const grokKey = getProviderApiKey('grok');

  // Default Primary is Gemini (always active in AI Studio environment)
  let primaryProvider: ModelProviderId = 'gemini';
  let primaryModel = 'gemini-3.5-flash-lite';
  let fallbackProvider: ModelProviderId = 'gemini';
  let fallbackModel = 'gemini-3.1-flash-lite';
  let rationale = 'Default conversational intelligence routing via Gemini';

  if (complexity === 'simple' || taskCategory === 'GREETING' || taskCategory === 'GENERAL_FAQ') {
    primaryProvider = 'gemini';
    primaryModel = 'gemini-3.1-flash-lite';
    rationale = 'Low-latency, cost-effective routing for simple greeting or FAQ query';
  } else if (taskCategory === 'COMPLEX_REASONING' || taskCategory === 'OBJECTION_HANDLING') {
    if (deepseekKey) {
      primaryProvider = 'deepseek';
      primaryModel = 'deepseek-r1';
      rationale = 'Routed to DeepSeek R1 for deep sales scenario reasoning';
    } else if (openaiKey) {
      primaryProvider = 'openai';
      primaryModel = 'o3-mini';
      rationale = 'Routed to OpenAI o3-mini for strategic reasoning';
    } else {
      primaryProvider = 'gemini';
      primaryModel = 'gemini-3.5-flash-lite';
      rationale = 'Specialist reasoning keys unconfigured; routed to Gemini 3.5 Flash Lite adaptive engine';
    }
  } else if (taskCategory === 'SALES_QUALIFICATION' || taskCategory === 'PRODUCT_RECOMMENDATION' || taskCategory === 'PURCHASE_INTENT') {
    if (claudeKey) {
      primaryProvider = 'claude';
      primaryModel = 'claude-3-5-sonnet';
      rationale = 'Routed to Claude 3.5 Sonnet for high-precision sales qualification & customer understanding';
    } else if (openaiKey) {
      primaryProvider = 'openai';
      primaryModel = 'gpt-4o';
      rationale = 'Routed to OpenAI GPT-4o for high-intent customer response generation';
    } else {
      primaryProvider = 'gemini';
      primaryModel = 'gemini-3.5-flash-lite';
      rationale = 'Primary Gemini sales intelligence engine';
    }
  } else if (taskCategory === 'RESEARCH_REQUEST') {
    if (perplexityKey) {
      primaryProvider = 'perplexity';
      primaryModel = 'sonar-reasoning';
      rationale = 'Routed to Perplexity Sonar for authorized external market research';
    } else {
      primaryProvider = 'gemini';
      primaryModel = 'gemini-3.5-flash-lite';
      rationale = 'Perplexity key unconfigured; using grounded Company Brain retrieval via Gemini';
    }
  } else if (taskCategory === 'NUMERICAL_ANALYTICS') {
    if (grokKey) {
      primaryProvider = 'grok';
      primaryModel = 'grok-2';
      rationale = 'Routed to Grok for business numerical interpretation';
    } else {
      primaryProvider = 'gemini';
      primaryModel = 'gemini-3.5-flash-lite';
      rationale = 'Grok key unconfigured; using deterministic math engine with Gemini interpretation';
    }
  }

  return {
    primaryProvider,
    primaryModel,
    fallbackProvider,
    fallbackModel,
    rationale,
  };
}

/**
 * Record Telemetry for Admin Model Dashboard
 */
export function recordModelTelemetry(metrics: ModelUsageMetrics): void {
  usageLogs.push(metrics);
  if (usageLogs.length > 500) usageLogs.shift();

  const p = metrics.providerId;
  if (providerStats[p]) {
    providerStats[p].calls += 1;
    providerStats[p].tokens += (metrics.inputTokens + metrics.outputTokens);
    providerStats[p].cost += metrics.estimatedCostUsd;
    providerStats[p].totalLatencyMs += metrics.latencyMs;
    if (metrics.status === 'ERROR') providerStats[p].errors += 1;
  }
}

/**
 * Get Model Usage Metrics for Admin Dashboard
 */
export function getAdminModelUsageAnalytics(): {
  providers: ProviderAdapterStatus[];
  recentLogs: ModelUsageMetrics[];
  totalCostUsd: number;
  totalTokens: number;
  totalCalls: number;
} {
  const providers = getProviderStatuses();
  const totalCostUsd = Number(Object.values(providerStats).reduce((acc, curr) => acc + curr.cost, 0).toFixed(6));
  const totalTokens = Object.values(providerStats).reduce((acc, curr) => acc + curr.tokens, 0);
  const totalCalls = Object.values(providerStats).reduce((acc, curr) => acc + curr.calls, 0);

  return {
    providers,
    recentLogs: usageLogs.slice(-50).reverse(),
    totalCostUsd,
    totalTokens,
    totalCalls,
  };
}
