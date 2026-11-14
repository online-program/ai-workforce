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
import { getLauncherGeometry, getLauncherGlowStyle, getLauncherShadowStyle } from '../utils/widgetDesignUtils.ts';

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
  primaryColor = '#080808',
  secondaryColor = '#FFFFFF',
  gradientEnabled = true,
  gradientType = 'custom',
  gradientColor1 = '#080808',
  gradientColor2 = '#171717',
  gradientAngle = 135,
  launcherSize = 'medium',
  launcherShape = 'circle',
  borderRadius = 20,
  shadowIntensity = 'deep',
  glowIntensity = 'subtle',
  animationIntensity = 'subtle',
  mode = 'attractive_3d',
  isOpen = false,
  onClick,
  className = '',
  title = 'Talk to Alpha — AI Sales Manager',
}) => {
  const geom = getLauncherGeometry(launcherSize, launcherShape, borderRadius);

  // Background styling (solid vs gradient)
  let backgroundStyle: React.CSSProperties = {
    backgroundColor: primaryColor,
  };

  if (gradientEnabled && gradientType !== 'none') {
    if (gradientType === 'subtle') {
      backgroundStyle = {
        background: `linear-gradient(${gradientAngle}deg, ${primaryColor} 0%, ${secondaryColor || primaryColor} 100%)`,
      };
    } else {
      backgroundStyle = {
        background: `linear-gradient(${gradientAngle}deg, ${gradientColor1 || primaryColor} 0%, ${gradientColor2 || secondaryColor || primaryColor} 100%)`,
      };
    }
  }

  // Shadow and 3D glow styling
  const shadowCss = getLauncherShadowStyle(shadowIntensity, mode);
  const glowCss = mode === 'attractive_3d' ? getLauncherGlowStyle(glowIntensity, primaryColor) : 'none';

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

  // 3D mode border enhancement
  const borderStyle =
    mode === 'attractive_3d'
      ? 'border border-white/30 ring-1 ring-black/10'
      : 'border border-black/10';

  return (
    <div className="relative flex items-center gap-3">
      {/* Floating launcher invitation tooltip when closed */}
      {!isOpen && (
        <div
          onClick={onClick}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#050505]/90 border border-white/15 text-white text-xs font-semibold shadow-xl cursor-pointer hover:bg-[#0A0A0A] hover:border-white/30 transition-all backdrop-blur-md select-none group"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Talk to Alpha</span>
          <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors">AI Sales Manager</span>
        </div>
      )}

      <button
        type="button"
        id="aw-widget-launcher-btn"
        onClick={onClick}
        title={title}
        style={{
          ...backgroundStyle,
          width: geom.width,
          height: geom.height,
          borderRadius: geom.borderRadius,
          boxShadow: combinedBoxShadow,
        }}
        className={`relative flex items-center justify-center text-white cursor-pointer select-none outline-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 ${borderStyle} ${animClass} ${className}`}
      >
        {/* Subtle glass reflection highlight in 3D mode */}
        {mode === 'attractive_3d' && (
          <div
            className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none"
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
              <span className="absolute inset-0 rounded-full bg-white/20 blur-sm animate-pulse" />
              <div className="w-7 h-7 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs shadow-md">
                α
              </div>
            </div>
          )}

          {(launcherType === 'custom_logo' || (launcherType as string) === 'logo') && (
            logoUrl && logoUrl.trim() ? (
              <img
                src={logoUrl.trim()}
                alt="Logo"
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
          className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black ${
            mode === 'attractive_3d' ? 'shadow-[0_0_8px_rgba(52,211,153,0.9)]' : ''
          }`}
        />
      </button>
    </div>
  );
};
