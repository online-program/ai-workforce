import React from 'react';
import { Sparkles, MessageSquare, Bot } from 'lucide-react';
import {
  WidgetLauncherType,
  WidgetLauncherShape,
  WidgetLauncherSize,
  WidgetVisualMode,
  WidgetGradientType,
  WidgetShadowIntensity,
  WidgetGlowIntensity,
  WidgetAnimationIntensity,
} from '../types.ts';
import {
  getLauncherGeometry,
  getLauncherGlowStyle,
  getLauncherShadowStyle,
  getReadableTextColor,
  sanitizeCssColor,
  sanitizeSafeUrl,
} from '../utils/widgetDesignUtils.ts';

export interface WidgetLauncherButtonProps {
  launcherType?: WidgetLauncherType;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  gradientEnabled?: boolean;
  gradientType?: WidgetGradientType;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  launcherSize?: WidgetLauncherSize;
  launcherShape?: WidgetLauncherShape;
  borderRadius?: number;
  shadowIntensity?: WidgetShadowIntensity;
  glowIntensity?: WidgetGlowIntensity;
  animationIntensity?: WidgetAnimationIntensity;
  mode?: WidgetVisualMode;
  isOpen?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export const WidgetLauncherButton: React.FC<WidgetLauncherButtonProps> = ({
  launcherType = 'ai_workforce',
  logoUrl,
  primaryColor = '#0F172A',
  secondaryColor = '#2563EB',
  gradientEnabled = false,
  gradientType = 'none',
  gradientColor1 = '#0F172A',
  gradientColor2 = '#1E293B',
  gradientAngle = 135,
  launcherSize = 'medium',
  launcherShape = 'circle',
  borderRadius = 20,
  shadowIntensity = 'medium',
  glowIntensity = 'none',
  animationIntensity = 'subtle',
  mode = 'attractive_3d',
  isOpen = false,
  onClick,
  className = '',
  title = 'Talk to Alpha — AI Sales Manager',
}) => {
  const geom = getLauncherGeometry(launcherSize, launcherShape, borderRadius);
  const safePrimary = sanitizeCssColor(primaryColor, '#0F172A');
  const safeSecondary = sanitizeCssColor(secondaryColor, '#2563EB');
  const safeGrad1 = sanitizeCssColor(gradientColor1, safePrimary);
  const safeGrad2 = sanitizeCssColor(gradientColor2, safeSecondary);
  const safeAngle = typeof gradientAngle === 'number' ? Math.max(0, Math.min(360, gradientAngle)) : 135;
  const safeLogoUrl = sanitizeSafeUrl(logoUrl);
  const iconForeground = getReadableTextColor(safePrimary);

  // Background styling (solid vs gradient)
  let backgroundStyle: React.CSSProperties = {
    backgroundColor: safePrimary,
    color: iconForeground,
  };

  if (gradientEnabled && gradientType !== 'none') {
    if (gradientType === 'subtle') {
      backgroundStyle = {
        background: `linear-gradient(${safeAngle}deg, ${safePrimary} 0%, ${safeSecondary} 100%)`,
        color: iconForeground,
      };
    } else {
      backgroundStyle = {
        background: `linear-gradient(${safeAngle}deg, ${safeGrad1} 0%, ${safeGrad2} 100%)`,
        color: iconForeground,
      };
    }
  }

  // Shadow and 3D glow styling
  const shadowCss = getLauncherShadowStyle(shadowIntensity, mode);
  const glowCss = mode === 'attractive_3d' ? getLauncherGlowStyle(glowIntensity, safePrimary) : 'none';

  const combinedBoxShadow = [
    shadowCss !== 'none' ? shadowCss : '',
    glowCss !== 'none' ? glowCss : '',
  ]
    .filter(Boolean)
    .join(', ') || undefined;

  // Animation classes
  let animClass = 'transition-all duration-200';
  if (animationIntensity === 'subtle') {
    animClass += ' hover:scale-105 active:scale-95';
  } else if (animationIntensity === 'playful') {
    animClass += ' hover:scale-110 active:scale-90 hover:rotate-3';
  }

  // Border enhancement with subtle adaptive contrast
  const borderStyle =
    mode === 'attractive_3d'
      ? 'border border-white/25 ring-1 ring-slate-950/10'
      : 'border border-slate-900/15';

  return (
    <div className="relative flex items-center gap-3">
      {/* Floating launcher invitation tooltip when closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={onClick}
          aria-label="Open chat assistant"
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/95 border border-white/15 text-white text-xs font-semibold shadow-xl cursor-pointer hover:bg-slate-800 hover:border-white/30 transition-all backdrop-blur-md select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Talk to Alpha</span>
          <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">AI Sales Manager</span>
        </button>
      )}

      <button
        type="button"
        id="aw-widget-launcher-btn"
        onClick={onClick}
        title={title}
        aria-label={isOpen ? 'Close chat assistant' : title}
        aria-expanded={isOpen}
        style={{
          ...backgroundStyle,
          width: geom.width,
          height: geom.height,
          borderRadius: geom.borderRadius,
          boxShadow: combinedBoxShadow,
        }}
        className={`relative flex items-center justify-center cursor-pointer select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${borderStyle} ${animClass} ${className}`}
      >
        {/* Subtle glass reflection highlight in 3D mode */}
        {mode === 'attractive_3d' && (
          <div
            className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none"
            style={{ borderRadius: `${geom.borderRadius} ${geom.borderRadius} 0 0` }}
          />
        )}

        {/* Launcher Icon based on user selection */}
        <div className="relative z-10 flex items-center justify-center">
          {launcherType === 'ai_spark' && (
            <Sparkles className={geom.iconSize} />
          )}

          {launcherType === 'chat_bubble' && (
            <MessageSquare className={geom.iconSize} />
          )}

          {launcherType === 'ai_workforce' && (
            <div className="flex items-center justify-center relative">
              <div className="w-7 h-7 rounded-full bg-white text-slate-900 font-bold flex items-center justify-center text-xs shadow-sm border border-slate-900/10">
                α
              </div>
            </div>
          )}

          {(launcherType === 'custom_logo' || (launcherType as string) === 'logo') && (
            safeLogoUrl ? (
              <img
                src={safeLogoUrl}
                alt="Brand logo"
                className="object-contain rounded-full"
                style={{
                  width: `calc(${geom.width} - 18px)`,
                  height: `calc(${geom.height} - 18px)`,
                }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Bot className={geom.iconSize} />
            )
          )}
        </div>

        {/* Online presence badge */}
        <span
          className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white ${
            mode === 'attractive_3d' ? 'shadow-[0_0_8px_rgba(52,211,153,0.75)]' : ''
          }`}
        />
      </button>
    </div>
  );
};
