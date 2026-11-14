import {
  WidgetStudioConfig,
  WidgetVisualMode,
  WidgetThemeMode,
  WidgetLauncherType,
  WidgetLauncherSize,
  WidgetLauncherShape,
  WidgetGradientType,
  WidgetShadowIntensity,
  WidgetGlowIntensity,
  WidgetAnimationIntensity,
  WidgetPosition,
} from '../types.ts';

// -------------------------------------------------------------
// 1. Color Parsing, Sanitization & Contrast (WCAG 2.1 AA)
// -------------------------------------------------------------

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_REGEX = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/i;

export function sanitizeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return fallback;
  if (/[;<>{}()\\]|url\s*\(|expression\s*\(|javascript:/i.test(trimmed)) {
    return fallback;
  }
  if (HEX_COLOR_REGEX.test(trimmed)) {
    return trimmed;
  }
  if (RGB_COLOR_REGEX.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function sanitizeSafeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return undefined;
  if (trimmed.startsWith('/')) {
    return /^\/[^/\\]/.test(trimmed) ? trimmed : undefined;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  const trimmed = hex.trim();
  if (trimmed.startsWith('rgb')) {
    const match = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (match) {
      return {
        r: Math.min(255, Math.max(0, parseInt(match[1], 10))),
        g: Math.min(255, Math.max(0, parseInt(match[2], 10))),
        b: Math.min(255, Math.max(0, parseInt(match[3], 10))),
      };
    }
    return null;
  }
  const clean = trimmed.replace('#', '');
  if (clean.length === 3 && /^[0-9a-f]{3}$/i.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if ((clean.length === 6 || clean.length === 8) && /^[0-9a-f]+$/i.test(clean)) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return null;
}

export function getLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0.5;
  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const a = srgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  try {
    const l1 = getLuminance(foregroundHex);
    const l2 = getLuminance(backgroundHex);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
  } catch {
    return 4.5;
  }
}

/**
 * Guarantees WCAG 2.1 AA contrast on any background color.
 * Picks whichever of #FFFFFF or #0F172A achieves higher contrast ratio.
 */
export function getReadableTextColor(backgroundHex: string): string {
  const whiteContrast = getContrastRatio('#ffffff', backgroundHex);
  const slateContrast = getContrastRatio('#0f172a', backgroundHex);
  return slateContrast >= whiteContrast ? '#0f172a' : '#ffffff';
}

export function ensureAccessibleForeground(preferredFg: string | undefined, backgroundHex: string, minRatio = 4.5): string {
  const cleanBg = sanitizeCssColor(backgroundHex, '#ffffff');
  if (preferredFg) {
    const cleanFg = sanitizeCssColor(preferredFg, '');
    if (cleanFg && getContrastRatio(cleanFg, cleanBg) >= minRatio) {
      return cleanFg;
    }
  }
  return getReadableTextColor(cleanBg);
}

export interface ContrastAudit {
  ratio: number;
  isCompliantAA: boolean; // >= 4.5:1
  isCompliantAAA: boolean; // >= 7.0:1
  suggestedTextColor: string;
}

export function auditContrast(foregroundHex: string, backgroundHex: string): ContrastAudit {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  return {
    ratio,
    isCompliantAA: ratio >= 4.5,
    isCompliantAAA: ratio >= 7.0,
    suggestedTextColor: getReadableTextColor(backgroundHex),
  };
}

// -------------------------------------------------------------
// 2. Official Design Presets (Clean Apple x ChatGPT Commercial Aesthetics)
// -------------------------------------------------------------

export interface WidgetPresetItem {
  id: string;
  name: string;
  category: 'professional' | 'attractive_3d';
  tagline: string;
  description: string;
  previewColors: string[];
  config: Partial<WidgetStudioConfig>;
}

export const PROFESSIONAL_PRESETS: WidgetPresetItem[] = [
  {
    id: 'clean',
    name: 'Studio Light',
    category: 'professional',
    tagline: 'Crisp Apple × ChatGPT Light Surface',
    description: 'High-clarity light canvas, subtle slate borders, and deep navy ink for effortless B2B reading.',
    previewColors: ['#0F172A', '#FFFFFF', '#F1F5F9'],
    config: {
      mode: 'simple',
      themeMode: 'light',
      launcherType: 'chat_bubble',
      primaryColor: '#0F172A',
      secondaryColor: '#2563EB',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      aiMessageColor: '#F1F5F9',
      aiMessageTextColor: '#0F172A',
      userMessageColor: '#0F172A',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: false,
      gradientType: 'none',
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 18,
      shadowIntensity: 'soft',
      glowIntensity: 'none',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Zinc',
    category: 'professional',
    tagline: 'Understated Architectural',
    description: 'Neutral paper surface and balanced zinc accents prioritizing typographic clarity.',
    previewColors: ['#18181B', '#FAFAFA', '#F4F4F5'],
    config: {
      mode: 'simple',
      themeMode: 'light',
      launcherType: 'ai_spark',
      primaryColor: '#18181B',
      secondaryColor: '#52525B',
      backgroundColor: '#FAFAFA',
      textColor: '#18181B',
      aiMessageColor: '#F4F4F5',
      aiMessageTextColor: '#18181B',
      userMessageColor: '#18181B',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: false,
      gradientType: 'none',
      launcherSize: 'medium',
      launcherShape: 'squircle',
      borderRadius: 16,
      shadowIntensity: 'soft',
      glowIntensity: 'none',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'executive',
    name: 'Executive Slate',
    category: 'professional',
    tagline: 'Enterprise B2B & Advisory',
    description: 'Refined indigo-slate accent with crisp white surface for commercial advisory teams.',
    previewColors: ['#1E293B', '#3B82F6', '#FFFFFF'],
    config: {
      mode: 'simple',
      themeMode: 'light',
      launcherType: 'ai_workforce',
      primaryColor: '#1E293B',
      secondaryColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      aiMessageColor: '#F8FAFC',
      aiMessageTextColor: '#0F172A',
      userMessageColor: '#1E293B',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: false,
      gradientType: 'none',
      launcherSize: 'medium',
      launcherShape: 'rounded_square',
      borderRadius: 18,
      shadowIntensity: 'medium',
      glowIntensity: 'none',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
];

export const ATTRACTIVE_3D_PRESETS: WidgetPresetItem[] = [
  {
    id: 'obsidian_slate',
    name: 'Midnight Graphite',
    category: 'attractive_3d',
    tagline: 'Refined Dark Mode Canvas',
    description: 'Soft dark slate surfaces, indigo accent focus states, and balanced contrast for dark websites.',
    previewColors: ['#0F172A', '#3B82F6', '#F8FAFC'],
    config: {
      mode: 'attractive_3d',
      themeMode: 'dark',
      launcherType: 'ai_workforce',
      primaryColor: '#3B82F6',
      secondaryColor: '#60A5FA',
      backgroundColor: '#0F172A',
      textColor: '#F8FAFC',
      aiMessageColor: '#1E293B',
      aiMessageTextColor: '#F8FAFC',
      userMessageColor: '#2563EB',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: true,
      gradientType: 'subtle',
      gradientColor1: '#1E293B',
      gradientColor2: '#0F172A',
      gradientAngle: 135,
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'medium',
      glowIntensity: 'subtle',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'glass',
    name: 'Sapphire Glass',
    category: 'attractive_3d',
    tagline: 'Dimensional Clarity',
    description: 'Clean cobalt-blue accents paired with an airy white message viewport and soft shadows.',
    previewColors: ['#2563EB', '#EFF6FF', '#FFFFFF'],
    config: {
      mode: 'attractive_3d',
      themeMode: 'light',
      launcherType: 'ai_spark',
      primaryColor: '#2563EB',
      secondaryColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      aiMessageColor: '#EFF6FF',
      aiMessageTextColor: '#1E3A8A',
      userMessageColor: '#2563EB',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: true,
      gradientType: 'subtle',
      gradientColor1: '#2563EB',
      gradientColor2: '#1D4ED8',
      gradientAngle: 135,
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'medium',
      glowIntensity: 'subtle',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'aurora',
    name: 'Indigo Studio',
    category: 'attractive_3d',
    tagline: 'Modern Product & Creator',
    description: 'Crisp indigo accents with warm readability and polished spring interactions.',
    previewColors: ['#4F46E5', '#EEF2FF', '#FFFFFF'],
    config: {
      mode: 'attractive_3d',
      themeMode: 'light',
      launcherType: 'ai_spark',
      primaryColor: '#4F46E5',
      secondaryColor: '#6366F1',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      aiMessageColor: '#F5F3FF',
      aiMessageTextColor: '#1E1B4B',
      userMessageColor: '#4F46E5',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: true,
      gradientType: 'subtle',
      gradientColor1: '#4F46E5',
      gradientColor2: '#6366F1',
      gradientAngle: 135,
      launcherSize: 'medium',
      launcherShape: 'squircle',
      borderRadius: 20,
      shadowIntensity: 'medium',
      glowIntensity: 'subtle',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'alpha_gold',
    name: 'Obsidian Classic',
    category: 'attractive_3d',
    tagline: 'Editorial Monochrome Dark',
    description: 'Clean charcoal canvas with pure white user contrast bubbles and understated chrome.',
    previewColors: ['#111827', '#1F2937', '#F9FAFB'],
    config: {
      mode: 'attractive_3d',
      themeMode: 'dark',
      launcherType: 'ai_workforce',
      primaryColor: '#18181B',
      secondaryColor: '#3F3F46',
      backgroundColor: '#09090B',
      textColor: '#F4F4F5',
      aiMessageColor: '#18181B',
      aiMessageTextColor: '#F4F4F5',
      userMessageColor: '#F4F4F5',
      userMessageTextColor: '#09090B',
      gradientEnabled: false,
      gradientType: 'none',
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'deep',
      glowIntensity: 'none',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'deep_space',
    name: 'Deep Space',
    category: 'attractive_3d',
    tagline: 'Dark High-Tech',
    description: 'Deep slate night canvas with vibrant cobalt accent pills.',
    previewColors: ['#090D16', '#1E1B4B', '#3B82F6'],
    config: {
      mode: 'attractive_3d',
      themeMode: 'dark',
      launcherType: 'ai_workforce',
      primaryColor: '#1D4ED8',
      secondaryColor: '#3B82F6',
      backgroundColor: '#0B0F19',
      textColor: '#F8FAFC',
      aiMessageColor: '#141C2E',
      aiMessageTextColor: '#E2E8F0',
      userMessageColor: '#2563EB',
      userMessageTextColor: '#FFFFFF',
      gradientEnabled: true,
      gradientType: 'subtle',
      gradientColor1: '#1E293B',
      gradientColor2: '#0F172A',
      gradientAngle: 145,
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'deep',
      glowIntensity: 'subtle',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
];

export const ALL_PRESETS = [...PROFESSIONAL_PRESETS, ...ATTRACTIVE_3D_PRESETS];

// -------------------------------------------------------------
// 3. Default Configuration & Sanitation (Neutral, Crisp Light Default)
// -------------------------------------------------------------

export const DEFAULT_WIDGET_STUDIO_CONFIG: WidgetStudioConfig = {
  mode: 'attractive_3d',
  themeMode: 'light',
  launcherType: 'ai_workforce',
  primaryColor: '#0F172A',
  secondaryColor: '#2563EB',
  backgroundColor: '#FFFFFF',
  textColor: '#0F172A',
  aiMessageColor: '#F1F5F9',
  aiMessageTextColor: '#0F172A',
  userMessageColor: '#0F172A',
  userMessageTextColor: '#FFFFFF',
  gradientEnabled: false,
  gradientType: 'none',
  gradientColor1: '#0F172A',
  gradientColor2: '#1E293B',
  gradientAngle: 135,
  launcherSize: 'medium',
  launcherShape: 'circle',
  borderRadius: 20,
  shadowIntensity: 'medium',
  glowIntensity: 'none',
  animationIntensity: 'subtle',
  launcherPosition: 'bottom-right',
};

export function resolveEffectiveThemeMode(
  themeMode?: WidgetThemeMode,
  prefersDark = false
): 'light' | 'dark' {
  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'system') return prefersDark ? 'dark' : 'light';
  return 'light';
}

export function sanitizeWidgetStudioConfig(
  raw: any,
  fallbackThemeColor?: string
): WidgetStudioConfig {
  const mode: WidgetVisualMode =
    raw?.mode === 'simple' || raw?.design_style === 'simple' ? 'simple' : 'attractive_3d';

  const validThemeModes: WidgetThemeMode[] = ['light', 'dark', 'system'];
  const inferredThemeMode: WidgetThemeMode = validThemeModes.includes(raw?.themeMode)
    ? raw.themeMode
    : raw?.backgroundColor && getLuminance(sanitizeCssColor(raw.backgroundColor, '#ffffff')) < 0.25
    ? 'dark'
    : 'light';

  const validLaunchers: WidgetLauncherType[] = ['ai_spark', 'chat_bubble', 'custom_logo', 'ai_workforce'];
  const launcherType: WidgetLauncherType = validLaunchers.includes(raw?.launcherType)
    ? raw.launcherType
    : 'ai_workforce';

  const validSizes: WidgetLauncherSize[] = ['small', 'medium', 'large'];
  const launcherSize: WidgetLauncherSize = validSizes.includes(raw?.launcherSize)
    ? raw.launcherSize
    : 'medium';

  const validShapes: WidgetLauncherShape[] = ['circle', 'rounded_square', 'squircle'];
  const launcherShape: WidgetLauncherShape = validShapes.includes(raw?.launcherShape)
    ? raw.launcherShape
    : 'circle';

  const validGradients: WidgetGradientType[] = ['none', 'subtle', 'custom'];
  const gradientType: WidgetGradientType = validGradients.includes(raw?.gradientType)
    ? raw.gradientType
    : raw?.gradientEnabled
    ? 'subtle'
    : 'none';

  const validShadows: WidgetShadowIntensity[] = ['none', 'soft', 'medium', 'deep', 'dramatic', 'strong'];
  const shadowIntensity: WidgetShadowIntensity = validShadows.includes(raw?.shadowIntensity)
    ? raw.shadowIntensity
    : mode === 'simple'
    ? 'soft'
    : 'medium';

  const validGlows: WidgetGlowIntensity[] = ['none', 'subtle', 'soft', 'vibrant', 'medium', 'strong'];
  const glowIntensity: WidgetGlowIntensity = validGlows.includes(raw?.glowIntensity)
    ? raw.glowIntensity
    : 'none';

  const validAnimations: WidgetAnimationIntensity[] = ['none', 'subtle', 'playful', 'expressive'];
  const animationIntensity: WidgetAnimationIntensity = validAnimations.includes(raw?.animationIntensity)
    ? raw.animationIntensity
    : 'subtle';

  const launcherPosition: WidgetPosition =
    raw?.launcherPosition === 'bottom-left' || raw?.position === 'bottom-left'
      ? 'bottom-left'
      : 'bottom-right';

  const isDarkDefault = inferredThemeMode === 'dark';

  const primaryColor = sanitizeCssColor(
    raw?.primaryColor || raw?.theme_color || fallbackThemeColor,
    DEFAULT_WIDGET_STUDIO_CONFIG.primaryColor
  );
  const secondaryColor = sanitizeCssColor(raw?.secondaryColor, '#2563EB');
  const backgroundColor = sanitizeCssColor(
    raw?.backgroundColor,
    isDarkDefault ? '#0F172A' : '#FFFFFF'
  );
  const textColor = ensureAccessibleForeground(raw?.textColor, backgroundColor, 4.5);

  const aiMessageColor = sanitizeCssColor(
    raw?.aiMessageColor,
    isDarkDefault ? '#1E293B' : '#F1F5F9'
  );
  const aiMessageTextColor = ensureAccessibleForeground(raw?.aiMessageTextColor, aiMessageColor, 4.5);

  const userMessageColor = sanitizeCssColor(raw?.userMessageColor, primaryColor);
  const userMessageTextColor = ensureAccessibleForeground(raw?.userMessageTextColor, userMessageColor, 4.5);

  const rawRadius = typeof raw?.borderRadius === 'number' ? raw.borderRadius : mode === 'simple' ? 16 : 20;
  const borderRadius = Math.max(8, Math.min(28, rawRadius));

  const gradientAngle =
    typeof raw?.gradientAngle === 'number' ? Math.max(0, Math.min(360, raw.gradientAngle)) : 135;

  const gradientColor1 = sanitizeCssColor(raw?.gradientColor1, primaryColor);
  const gradientColor2 = sanitizeCssColor(raw?.gradientColor2, secondaryColor);

  return {
    mode,
    themeMode: inferredThemeMode,
    launcherType,
    logoUrl: sanitizeSafeUrl(raw?.logoUrl),
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    aiMessageColor,
    aiMessageTextColor,
    userMessageColor,
    userMessageTextColor,
    gradientEnabled: Boolean(raw?.gradientEnabled && gradientType !== 'none'),
    gradientType,
    gradientColor1,
    gradientColor2,
    gradientAngle,
    launcherSize,
    launcherShape,
    borderRadius,
    shadowIntensity,
    glowIntensity,
    animationIntensity,
    launcherPosition,
  };
}

export interface WidgetThemeTokens {
  effectiveMode: 'light' | 'dark';
  surfaceBg: string;
  headerBg: string;
  headerText: string;
  headerSubtext: string;
  headerHoverBg: string;
  headerBorder: string;
  viewportBg: string;
  aiBubbleBg: string;
  aiBubbleText: string;
  aiBubbleBorder: string;
  userBubbleBg: string;
  userBubbleText: string;
  composerBg: string;
  composerBorder: string;
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  inputBorder: string;
  inputFocusBorder: string;
  sendBtnBg: string;
  sendBtnText: string;
  chipBg: string;
  chipHoverBg: string;
  chipText: string;
  chipBorder: string;
  bannerBg: string;
  bannerText: string;
  bannerBorder: string;
  timestampText: string;
  footerBg: string;
  footerText: string;
  footerBorder: string;
  accentColor: string;
}

export function resolveWidgetThemeTokens(
  config: Partial<WidgetStudioConfig>,
  prefersDark = false
): WidgetThemeTokens {
  const effectiveMode = resolveEffectiveThemeMode(config.themeMode, prefersDark);
  const explicitLightOverride =
    config.themeMode === 'light' ||
    (config.themeMode !== 'dark' &&
      config.backgroundColor &&
      getLuminance(sanitizeCssColor(config.backgroundColor, '#FFFFFF')) > 0.45);
  const darkSurface = effectiveMode === 'dark' || (!explicitLightOverride && getLuminance(sanitizeCssColor(config.backgroundColor, '#FFFFFF')) < 0.25);

  const primary = sanitizeCssColor(config.primaryColor, '#0F172A');
  const accent = sanitizeCssColor(config.secondaryColor, '#2563EB');

  const surfaceBg = darkSurface
    ? sanitizeCssColor(config.backgroundColor && getLuminance(config.backgroundColor) < 0.25 ? config.backgroundColor : '#0F172A', '#0F172A')
    : sanitizeCssColor(config.backgroundColor && getLuminance(config.backgroundColor) >= 0.45 ? config.backgroundColor : '#FFFFFF', '#FFFFFF');

  const viewportBg = darkSurface ? '#0B1120' : '#F8FAFC';

  const headerBg = darkSurface
    ? (getLuminance(primary) < 0.25 ? primary : '#0F172A')
    : primary;
  const headerIsLight = getLuminance(headerBg) > 0.42;
  const headerText = getReadableTextColor(headerBg);
  const headerSubtext = headerIsLight ? '#475569' : '#CBD5E1';
  const headerHoverBg = headerIsLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.14)';
  const headerBorder = headerIsLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)';

  const aiBubbleBg = darkSurface
    ? sanitizeCssColor(config.aiMessageColor && getLuminance(config.aiMessageColor) < 0.25 ? config.aiMessageColor : '#1E293B', '#1E293B')
    : sanitizeCssColor(config.aiMessageColor && getLuminance(config.aiMessageColor) >= 0.45 ? config.aiMessageColor : '#FFFFFF', '#FFFFFF');
  const aiBubbleText = ensureAccessibleForeground(config.aiMessageTextColor, aiBubbleBg, 4.5);
  const aiBubbleBorder = darkSurface ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0';

  const userBubbleBg = sanitizeCssColor(config.userMessageColor, primary);
  const userBubbleText = ensureAccessibleForeground(config.userMessageTextColor, userBubbleBg, 4.5);

  // Send button prioritizes crisp legible fill with >=4.5:1 foreground contrast
  const sendBtnBg =
    getLuminance(primary) > 0.72 ? (darkSurface ? '#3B82F6' : '#0F172A') : primary;
  const sendBtnText = getReadableTextColor(sendBtnBg);

  return {
    effectiveMode: darkSurface ? 'dark' : 'light',
    surfaceBg,
    headerBg,
    headerText,
    headerSubtext,
    headerHoverBg,
    headerBorder,
    viewportBg,
    aiBubbleBg,
    aiBubbleText,
    aiBubbleBorder,
    userBubbleBg,
    userBubbleText,
    composerBg: darkSurface ? '#0F172A' : '#FFFFFF',
    composerBorder: darkSurface ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0',
    inputBg: darkSurface ? '#1E293B' : '#F1F5F9',
    inputText: darkSurface ? '#F8FAFC' : '#0F172A',
    inputPlaceholder: darkSurface ? '#94A3B8' : '#64748B',
    inputBorder: darkSurface ? 'rgba(148, 163, 184, 0.24)' : '#CBD5E1',
    inputFocusBorder: getLuminance(accent) > 0.1 && getLuminance(accent) < 0.8 ? accent : '#2563EB',
    sendBtnBg,
    sendBtnText,
    chipBg: darkSurface ? '#1E293B' : '#FFFFFF',
    chipHoverBg: darkSurface ? '#334155' : '#F1F5F9',
    chipText: darkSurface ? '#E2E8F0' : '#0F172A',
    chipBorder: darkSurface ? 'rgba(148, 163, 184, 0.25)' : '#CBD5E1',
    bannerBg: darkSurface ? '#1E293B' : '#F1F5F9',
    bannerText: darkSurface ? '#E2E8F0' : '#1E293B',
    bannerBorder: darkSurface ? 'rgba(148, 163, 184, 0.2)' : '#CBD5E1',
    timestampText: darkSurface ? '#94A3B8' : '#64748B',
    footerBg: darkSurface ? '#0F172A' : '#F8FAFC',
    footerText: darkSurface ? '#94A3B8' : '#475569',
    footerBorder: darkSurface ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0',
    accentColor: accent,
  };
}

// -------------------------------------------------------------
// 4. Style Resolvers for UI & Embed
// -------------------------------------------------------------

export function getLauncherDimensions(size: WidgetLauncherSize): {
  btnSize: number;
  iconSize: number;
  btnClass: string;
} {
  switch (size) {
    case 'small':
      return { btnSize: 48, iconSize: 22, btnClass: 'w-12 h-12' };
    case 'large':
      return { btnSize: 64, iconSize: 28, btnClass: 'w-16 h-16' };
    case 'medium':
    default:
      return { btnSize: 56, iconSize: 24, btnClass: 'w-14 h-14' };
  }
}

export function getLauncherShapeClass(shape: WidgetLauncherShape): string {
  switch (shape) {
    case 'rounded_square':
      return 'rounded-2xl';
    case 'squircle':
      return 'rounded-[20px]';
    case 'circle':
    default:
      return 'rounded-full';
  }
}

export function getShadowStyle(intensity: WidgetShadowIntensity, is3D = false): string {
  switch (intensity) {
    case 'none':
      return 'none';
    case 'soft':
      return '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)';
    case 'medium':
      return is3D
        ? '0 12px 32px -4px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)'
        : '0 8px 24px -2px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06)';
    case 'deep':
    case 'strong':
      return '0 20px 45px -8px rgba(15, 23, 42, 0.28), 0 8px 18px rgba(15, 23, 42, 0.14)';
    case 'dramatic':
      return '0 25px 60px -10px rgba(15, 23, 42, 0.36), 0 12px 24px rgba(15, 23, 42, 0.18)';
    default:
      return '0 8px 24px rgba(15, 23, 42, 0.12)';
  }
}

export function getGlowStyle(intensity: WidgetGlowIntensity, primaryColor: string): string {
  if (intensity === 'none') return 'none';
  const rgb = parseHexColor(primaryColor) || { r: 37, g: 99, b: 235 };
  if (intensity === 'subtle' || intensity === 'soft') {
    return `0 0 18px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`;
  }
  return `0 0 28px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.42), 0 0 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65)`;
}

export function getGradientBackground(config: WidgetStudioConfig): string {
  if (!config.gradientEnabled || config.gradientType === 'none') {
    return sanitizeCssColor(config.primaryColor, '#0F172A');
  }
  const color1 = sanitizeCssColor(config.gradientColor1, sanitizeCssColor(config.primaryColor, '#0F172A'));
  const color2 = sanitizeCssColor(config.gradientColor2, sanitizeCssColor(config.secondaryColor, '#1E293B'));
  const angle = typeof config.gradientAngle === 'number' ? Math.max(0, Math.min(360, config.gradientAngle)) : 135;

  if (config.gradientType === 'subtle') {
    return `linear-gradient(${angle}deg, ${color1}, ${color2} 80%)`;
  }
  return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
}

// -------------------------------------------------------------
// 5. Convenient Aliases for Compatibility & Direct Imports
// -------------------------------------------------------------
export const calculateContrastRatio = getContrastRatio;
export const getAccessibleTextColor = getReadableTextColor;
export const WIDGET_PRESETS = ALL_PRESETS;
export const defaultStudioConfig = DEFAULT_WIDGET_STUDIO_CONFIG;

export function getLauncherGeometry(
  size: WidgetLauncherSize = 'medium',
  shape: WidgetLauncherShape = 'circle',
  borderRadius: number = 20
): {
  width: string;
  height: string;
  borderRadius: string;
  iconSize: string;
} {
  const dims = getLauncherDimensions(size);
  const px = `${dims.btnSize}px`;
  let radius = '9999px';
  if (shape === 'rounded_square') {
    radius = `${Math.min(borderRadius, 18)}px`;
  } else if (shape === 'squircle') {
    radius = `${Math.min(borderRadius, 24)}px`;
  }
  return {
    width: px,
    height: px,
    borderRadius: radius,
    iconSize: dims.iconSize >= 28 ? 'w-7 h-7' : dims.iconSize <= 22 ? 'w-5 h-5' : 'w-6 h-6',
  };
}

export function getLauncherShadowStyle(
  intensity: WidgetShadowIntensity = 'medium',
  modeOr3D: boolean | WidgetVisualMode = false
): string {
  const is3D = typeof modeOr3D === 'boolean' ? modeOr3D : modeOr3D === 'attractive_3d';
  return getShadowStyle(intensity, is3D);
}

export function getLauncherGlowStyle(
  intensity: WidgetGlowIntensity = 'none',
  primaryColor: string = '#0f172a'
): string {
  return getGlowStyle(intensity, primaryColor);
}

export function getWidgetBoxShadowStyle(
  shadowIntensity: WidgetShadowIntensity = 'medium',
  glowIntensity: WidgetGlowIntensity = 'none',
  modeOrColor: WidgetVisualMode | string = 'simple',
  colorOrMode?: string | WidgetVisualMode
): string {
  const mode: WidgetVisualMode =
    modeOrColor === 'simple' || modeOrColor === 'attractive_3d'
      ? modeOrColor
      : colorOrMode === 'simple' || colorOrMode === 'attractive_3d'
      ? colorOrMode
      : 'simple';
  const primaryColor: string =
    typeof modeOrColor === 'string' && modeOrColor.startsWith('#')
      ? modeOrColor
      : typeof colorOrMode === 'string' && colorOrMode.startsWith('#')
      ? colorOrMode
      : '#0f172a';

  const is3D = mode === 'attractive_3d';
  const shadow = getShadowStyle(shadowIntensity, is3D);
  const glow = is3D ? getGlowStyle(glowIntensity, primaryColor) : 'none';
  if (shadow === 'none' && glow === 'none') return 'none';
  if (shadow === 'none') return glow;
  if (glow === 'none') return shadow;
  return `${shadow}, ${glow}`;
}



