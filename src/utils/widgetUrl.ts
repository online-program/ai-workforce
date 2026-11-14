/**
 * Canonical Production Widget Endpoint & Embed Code Generator
 *
 * Resolves the genuine production Cloud Run / custom domain host for public widget embedding.
 * Prevents development container hosts (e.g., ais-dev-*) from leaking into embed snippets.
 */

export function getProductionWidgetHost(): string {
  // 1. Explicit override if provided
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
    if (metaEnv?.VITE_PRODUCTION_WIDGET_HOST) {
      return metaEnv.VITE_PRODUCTION_WIDGET_HOST;
    }
  } catch (e) {
    // Ignore environment lookup error
  }

  // 2. Derive dynamically in browser
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;

    // If currently running in AI Studio Dev container (ais-dev-...), map directly to the production/shared Cloud Run service (ais-pre-...)
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }

    // Use runtime origin for local dev or production host unless overridden via VITE_PRODUCTION_WIDGET_HOST
    return origin;
  }

  // 3. SSR fallback (relative origin)
  return '';
}

export interface WidgetEmbedOptions {
  designStyle?: 'simple' | 'attractive_3d';
  position?: 'bottom-right' | 'bottom-left';
  color?: string;
  autoOpen?: boolean;
}

export function generateWidgetEmbedSnippet(
  widgetId: string,
  options?: WidgetEmbedOptions
): string {
  const host = getProductionWidgetHost();
  const attrs: string[] = [
    `src="${host}/widget.js"`,
    `data-widget-id="${widgetId}"`,
  ];

  if (options?.designStyle && options.designStyle !== 'attractive_3d') {
    attrs.push(`data-style="${options.designStyle}"`);
  }
  if (options?.position && options.position !== 'bottom-right') {
    attrs.push(`data-position="${options.position}"`);
  }
  if (options?.color && options.color !== '#000000' && options.color !== '#0f172a') {
    attrs.push(`data-color="${options.color}"`);
  }

  return `<!-- AI Workforce — AI Employee Widget -->
<script
  ${attrs.join('\n  ')}
  async
></script>`;
}
