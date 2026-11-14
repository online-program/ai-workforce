import type { CompanyProfile } from '../types.ts';

export const PLATFORM_OFFICIAL_TENANT_ID = 'ai_workforce_official';
export const PLATFORM_OFFICIAL_CANONICAL_WIDGET_ID = 'official-ai-workforce';

export const RESERVED_OFFICIAL_WIDGET_IDS = new Set<string>([
  'ai_workforce_official',
  'official-ai-workforce',
  'ai_workforce',
  'ai-workforce',
  'wgt_8va1xl_re01u0',
]);

export function isReservedOfficialWidgetId(widgetId?: string | null): boolean {
  if (!widgetId || typeof widgetId !== 'string') return false;
  return RESERVED_OFFICIAL_WIDGET_IDS.has(widgetId.trim().toLowerCase());
}

export function isOfficialTenantId(tenantId?: string | null): boolean {
  if (!tenantId || typeof tenantId !== 'string') return false;
  return tenantId.trim() === PLATFORM_OFFICIAL_TENANT_ID;
}

export interface PublicWidgetSummary {
  name: string;
  industry?: string;
  businessType?: string;
  deploymentType?: string;
}

/**
 * Strips private Company Brain configuration (internal rules, forbidden behaviors,
 * escalation emails, custom prompts, pricing notes) before storing in public_widgets
 * or returning from public unauthenticated endpoints.
 */
export function buildPublicSummary(
  profile?: Partial<CompanyProfile> | null,
  fallbackBusinessName?: string
): PublicWidgetSummary | null {
  const name = profile?.brandName?.trim() || profile?.name?.trim() || fallbackBusinessName?.trim();
  if (!name) return null;
  return {
    name,
    ...(profile?.industry ? { industry: String(profile.industry) } : {}),
    ...(profile?.businessType ? { businessType: String(profile.businessType) } : {}),
    ...(profile?.deploymentType ? { deploymentType: String(profile.deploymentType) } : {}),
  };
}

export function stripPrivateFieldsFromWidget<T extends Record<string, any>>(
  widgetConfig: T,
  options: { includeUserId?: boolean } = {}
): Record<string, any> {
  const cfg = (widgetConfig || {}) as Record<string, any>;
  const {
    company_profile,
    user_id,
    humanEscalation,
    forbiddenBehaviors,
    commitmentsNeverToMake,
    ...rest
  } = cfg;

  const projection: Record<string, any> = {
    ...rest,
    public_summary: widgetConfig?.public_summary ?? buildPublicSummary(company_profile, widgetConfig?.business_name),
  };

  if (options.includeUserId && user_id) {
    projection.user_id = user_id;
  }

  return projection;
}
