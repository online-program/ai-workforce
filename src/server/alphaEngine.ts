/**
 * Canonical Alpha Engine Architecture & Shared Intelligence Versioning
 * Version: 3.5.0
 * 
 * Enforces unified Alpha behavior, sales manager decision logic, context management,
 * controlled web research policies, and strict tenant data isolation across all widgets.
 */

export const ALPHA_ENGINE_VERSION = '4.0.0-think-engine';
export const ALPHA_CONFIG_HASH = 'sha256-a1ph4-th1nk-v4.0.0-2026';

export interface AlphaEngineCapabilities {
  version: string;
  config_hash: string;
  streaming_supported: boolean;
  web_research_enabled: boolean;
  alpha_think_engine_enabled: boolean;
  max_search_queries_per_message: number;
  max_citation_sources: number;
  search_timeout_ms: number;
  company_brain_v2_supported: boolean;
  tenant_isolation_level: 'strict_firestore_rbac';
}

export const CANONICAL_ALPHA_ENGINE_CAPABILITIES: AlphaEngineCapabilities = {
  version: ALPHA_ENGINE_VERSION,
  config_hash: ALPHA_CONFIG_HASH,
  streaming_supported: true,
  web_research_enabled: false,
  alpha_think_engine_enabled: true,
  max_search_queries_per_message: 0,
  max_citation_sources: 0,
  search_timeout_ms: 0,
  company_brain_v2_supported: true,
  tenant_isolation_level: 'strict_firestore_rbac',
};

/**
 * Returns current engine capabilities and version info
 */
export function getAlphaEngineCapabilities(): AlphaEngineCapabilities {
  return { ...CANONICAL_ALPHA_ENGINE_CAPABILITIES };
}

/**
 * Ensures widget configuration uses the latest approved Alpha Engine version
 */
export function migrateWidgetToLatestAlphaEngine<T extends { config_version?: number; engine_version?: string }>(
  config: T
): T & { engine_version: string; config_version: number } {
  return {
    ...config,
    engine_version: ALPHA_ENGINE_VERSION,
    config_version: Math.max(config.config_version || 1, 2),
  };
}
