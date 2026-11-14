import {
  WidgetStudioConfig,
  WidgetVisualMode,
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
// 1. Contrast & Color Utilities (WCAG 2.1 AA Compliance)
// -------------------------------------------------------------

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
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
 * Ensures text is clearly legible on any background.
 * Returns #ffffff if background is dark, and #0f172a if background is light.
 */
export function getReadableTextColor(backgroundHex: string): string {
  const lum = getLuminance(backgroundHex);
  return lum > 0.42 ? '#0f172a' : '#ffffff';
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
// 2. Official Design Presets
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
    name: 'Clean',
    category: 'professional',
    tagline: 'Modern High-Trust SaaS',
    description: 'Crisp borders, balanced contrast, and subtle depth for serious SaaS & corporate portals.',
    previewColors: ['#0f172a', '#ffffff', '#475569'],
    config: {
      mode: 'simple',
      launcherType: 'chat_bubble',
      primaryColor: '#0f172a',
      secondaryColor: '#475569',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      aiMessageColor: '#f1f5f9',
      aiMessageTextColor: '#0f172a',
      userMessageColor: '#0f172a',
      userMessageTextColor: '#ffffff',
      gradientEnabled: false,
      gradientType: 'none',
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 16,
      shadowIntensity: 'soft',
      glowIntensity: 'none',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'professional',
    tagline: 'Understated Architectural',
    description: 'Understated monochrome design focusing purely on clean typography and fast interactions.',
    previewColors: ['#18181b', '#fafafa', '#71717a'],
    config: {
      mode: 'simple',
      launcherType: 'ai_spark',
      primaryColor: '#18181b',
      secondaryColor: '#71717a',
      backgroundColor: '#fafafa',
      textColor: '#18181b',
      aiMessageColor: '#f4f4f5',
      aiMessageTextColor: '#18181b',
      userMessageColor: '#18181b',
      userMessageTextColor: '#ffffff',
      gradientEnabled: false,
      gradientType: 'none',
      launcherSize: 'small',
      launcherShape: 'squircle',
      borderRadius: 12,
      shadowIntensity: 'none',
      glowIntensity: 'none',
      animationIntensity: 'none',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    category: 'professional',
    tagline: 'Enterprise B2B & Advisory',
    description: 'Subtle slate gradients with authoritative presence for commercial services and agencies.',
    previewColors: ['#1e293b', '#0f172a', '#ffffff'],
    config: {
      mode: 'simple',
      launcherType: 'ai_workforce',
      primaryColor: '#1e293b',
      secondaryColor: '#334155',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      aiMessageColor: '#f8fafc',
      aiMessageTextColor: '#0f172a',
      userMessageColor: '#1e293b',
      userMessageTextColor: '#ffffff',
      gradientEnabled: true,
      gradientType: 'subtle',
      gradientColor1: '#1e293b',
      gradientColor2: '#0f172a',
      gradientAngle: 135,
      launcherSize: 'medium',
      launcherShape: 'rounded_square',
      borderRadius: 16,
      shadowIntensity: 'medium',
      glowIntensity: 'none',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
];

export const ATTRACTIVE_3D_PRESETS: WidgetPresetItem[] = [
  {
    id: 'alpha_gold',
    name: 'Alpha Gold',
    category: 'attractive_3d',
    tagline: 'Signature Luxury Black & Radiant Gold',
    description: 'Signature AI Workforce styling: deep obsidian black canvas with radiant #FFD000 gold accents and subtle luminous halo.',
    previewColors: ['#080808', '#FFD000', '#FFE36A'],
    config: {
      mode: 'attractive_3d',
      launcherType: 'ai_workforce',
      primaryColor: '#080808',
      secondaryColor: '#FFD000',
      backgroundColor: '#111111',
      textColor: '#FFFFFF',
      aiMessageColor: '#171717',
      aiMessageTextColor: '#FFFFFF',
      userMessageColor: '#FFD000',
      userMessageTextColor: '#080808',
      gradientEnabled: true,
      gradientType: 'custom',
      gradientColor1: '#080808',
      gradientColor2: '#171717',
      gradientAngle: 135,
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'deep',
      glowIntensity: 'subtle',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'glass',
    name: 'Glass',
    category: 'attractive_3d',
    tagline: 'Dimensional Glassmorphism',
    description: 'Translucent frosted glass with soft glowing ambient reflections and dimensional depth.',
    previewColors: ['#2563eb', '#60a5fa', '#ffffff'],
    config: {
      mode: 'attractive_3d',
      launcherType: 'ai_spark',
      primaryColor: '#2563eb',
      secondaryColor: '#60a5fa',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      aiMessageColor: '#eff6ff',
      aiMessageTextColor: '#1e3a8a',
      userMessageColor: '#2563eb',
      userMessageTextColor: '#ffffff',
      gradientEnabled: true,
      gradientType: 'custom',
      gradientColor1: '#2563eb',
      gradientColor2: '#3b82f6',
      gradientAngle: 135,
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'deep',
      glowIntensity: 'subtle',
      animationIntensity: 'subtle',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    category: 'attractive_3d',
    tagline: 'Vibrant Gen-Z & Creators',
    description: 'Dynamic gradient flow with layered glow accents and expressive spring animations.',
    previewColors: ['#6366f1', '#a855f7', '#ec4899'],
    config: {
      mode: 'attractive_3d',
      launcherType: 'ai_spark',
      primaryColor: '#6366f1',
      secondaryColor: '#ec4899',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      aiMessageColor: '#f5f3ff',
      aiMessageTextColor: '#312e81',
      userMessageColor: '#6366f1',
      userMessageTextColor: '#ffffff',
      gradientEnabled: true,
      gradientType: 'custom',
      gradientColor1: '#6366f1',
      gradientColor2: '#a855f7',
      gradientAngle: 120,
      launcherSize: 'large',
      launcherShape: 'squircle',
      borderRadius: 24,
      shadowIntensity: 'dramatic',
      glowIntensity: 'vibrant',
      animationIntensity: 'expressive',
      launcherPosition: 'bottom-right',
    },
  },
  {
    id: 'deep_space',
    name: 'Deep Space',
    category: 'attractive_3d',
    tagline: 'Dark Luxury & High-Tech',
    description: 'Deep cosmic canvas with luminous neon edge lighting and dimensional holographic depth.',
    previewColors: ['#090d16', '#1e1b4b', '#3b82f6'],
    config: {
      mode: 'attractive_3d',
      launcherType: 'ai_workforce',
      primaryColor: '#090d16',
      secondaryColor: '#1e293b',
      backgroundColor: '#0b0f19',
      textColor: '#f8fafc',
      aiMessageColor: '#141c2e',
      aiMessageTextColor: '#e2e8f0',
      userMessageColor: '#3b82f6',
      userMessageTextColor: '#ffffff',
      gradientEnabled: true,
      gradientType: 'custom',
      gradientColor1: '#090d16',
      gradientColor2: '#1e1b4b',
      gradientAngle: 145,
      launcherSize: 'medium',
      launcherShape: 'circle',
      borderRadius: 20,
      shadowIntensity: 'dramatic',
      glowIntensity: 'vibrant',
      animationIntensity: 'expressive',
      launcherPosition: 'bottom-right',
    },
  },
];

export const ALL_PRESETS = [...PROFESSIONAL_PRESETS, ...ATTRACTIVE_3D_PRESETS];

// -------------------------------------------------------------
// 3. Default Configuration & Sanitation
// -------------------------------------------------------------

export const DEFAULT_WIDGET_STUDIO_CONFIG: WidgetStudioConfig = {
  mode: 'attractive_3d',
  launcherType: 'ai_workforce',
  primaryColor: '#080808',
  secondaryColor: '#FFD000',
  backgroundColor: '#111111',
  textColor: '#FFFFFF',
  aiMessageColor: '#171717',
  aiMessageTextColor: '#FFFFFF',
  userMessageColor: '#FFD000',
  userMessageTextColor: '#080808',
  gradientEnabled: true,
  gradientType: 'custom',
  gradientColor1: '#080808',
  gradientColor2: '#171717',
  gradientAngle: 135,
  launcherSize: 'medium',
  launcherShape: 'circle',
  borderRadius: 20,
  shadowIntensity: 'deep',
  glowIntensity: 'subtle',
  animationIntensity: 'subtle',
  launcherPosition: 'bottom-right',
};

export function sanitizeWidgetStudioConfig(
  raw: any,
  fallbackThemeColor?: string
): WidgetStudioConfig {
  const mode: WidgetVisualMode =
    raw?.mode === 'simple' || raw?.design_style === 'simple' ? 'simple' : 'attractive_3d';

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

  const validShadows: WidgetShadowIntensity[] = ['none', 'soft', 'medium', 'deep', 'dramatic'];
  const shadowIntensity: WidgetShadowIntensity = validShadows.includes(raw?.shadowIntensity)
    ? raw.shadowIntensity
    : mode === 'simple'
    ? 'soft'
    : 'medium';

  const validGlows: WidgetGlowIntensity[] = ['none', 'subtle', 'vibrant'];
  const glowIntensity: WidgetGlowIntensity = validGlows.includes(raw?.glowIntensity)
    ? raw.glowIntensity
    : 'none';

  const validAnimations: WidgetAnimationIntensity[] = ['none', 'subtle', 'expressive'];
  const animationIntensity: WidgetAnimationIntensity = validAnimations.includes(raw?.animationIntensity)
    ? raw.animationIntensity
    : mode === 'simple'
    ? 'subtle'
    : 'subtle';

  const launcherPosition: WidgetPosition =
    raw?.launcherPosition === 'bottom-left' || raw?.position === 'bottom-left'
      ? 'bottom-left'
      : 'bottom-right';

  const primaryColor = raw?.primaryColor || raw?.theme_color || fallbackThemeColor || '#0f172a';
  const secondaryColor = raw?.secondaryColor || '#475569';
  const backgroundColor = raw?.backgroundColor || '#ffffff';
  const textColor = raw?.textColor || getReadableTextColor(backgroundColor);

  const rawAiMsgBg = raw?.aiMessageColor || (mode === 'simple' ? '#f8fafc' : '#f1f5f9');
  const aiMessageColor = rawAiMsgBg;
  const aiMessageTextColor = raw?.aiMessageTextColor || getReadableTextColor(aiMessageColor);

  const rawUserMsgBg = raw?.userMessageColor || primaryColor;
  const userMessageColor = rawUserMsgBg;
  const userMessageTextColor = raw?.userMessageTextColor || getReadableTextColor(userMessageColor);

  const rawRadius = typeof raw?.borderRadius === 'number' ? raw.borderRadius : mode === 'simple' ? 16 : 20;
  const borderRadius = Math.max(8, Math.min(28, rawRadius));

  const gradientAngle =
    typeof raw?.gradientAngle === 'number' ? Math.max(0, Math.min(360, raw.gradientAngle)) : 135;

  return {
    mode,
    launcherType,
    logoUrl: typeof raw?.logoUrl === 'string' && raw.logoUrl.trim() ? raw.logoUrl.trim() : undefined,
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    aiMessageColor,
    aiMessageTextColor,
    userMessageColor,
    userMessageTextColor,
    gradientEnabled: Boolean(raw?.gradientEnabled || gradientType !== 'none'),
    gradientType,
    gradientColor1: raw?.gradientColor1 || primaryColor,
    gradientColor2: raw?.gradientColor2 || secondaryColor,
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
      return '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)';
    case 'medium':
      return is3D
        ? '0 12px 32px -4px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0, 0, 0, 0.12)'
        : '0 8px 24px -2px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.08)';
    case 'deep':
      return '0 20px 45px -8px rgba(0, 0, 0, 0.32), 0 8px 18px rgba(0, 0, 0, 0.16)';
    case 'dramatic':
      return '0 25px 60px -10px rgba(0, 0, 0, 0.45), 0 12px 24px rgba(0, 0, 0, 0.22)';
    default:
      return '0 8px 24px rgba(0, 0, 0, 0.15)';
  }
}

export function getGlowStyle(intensity: WidgetGlowIntensity, primaryColor: string): string {
  if (intensity === 'none') return 'none';
  const rgb = parseHexColor(primaryColor) || { r: 15, g: 23, b: 42 };
  if (intensity === 'subtle' || intensity === 'soft') {
    return `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  }
  return `0 0 32px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65), 0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
}

export function getGradientBackground(config: WidgetStudioConfig): string {
  if (!config.gradientEnabled || config.gradientType === 'none') {
    return config.primaryColor;
  }
  const color1 = config.gradientColor1 || config.primaryColor;
  const color2 = config.gradientColor2 || config.secondaryColor || '#1e293b';
  const angle = config.gradientAngle ?? 135;

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


