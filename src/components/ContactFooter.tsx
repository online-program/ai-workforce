import React, { useState } from 'react';
import { Youtube, Mail, Copy, Check, Instagram, Cookie } from 'lucide-react';
import { FooterR3FOrb } from './ui/FooterR3FOrb.tsx';
import { Logo } from './Logo.tsx';
import { openCookieSettings } from '../services/consentService.ts';
import arcticAuroraImg from '../assets/images/arctic_aurora_sky_1791988163960.jpg';

interface ContactFooterProps {
  className?: string;
  variant?: 'full' | 'compact';
  isPublicLanding?: boolean;
}

export const ContactFooter: React.FC<ContactFooterProps> = ({
  className = '',
  variant = 'full',
  isPublicLanding = false,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const instagramUrl = 'https://www.instagram.com/aiworkforceofficial?igsi=MTE5YWJkNGt6NWMxbw==';
  const youtubeUrl = 'https://youtube.com/@aiworkforceofficial?si=P0dlo26ozhiuHfrq';
  const emailAddress = 'support.aiworkforce@gmail.com';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(emailAddress);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 text-xs text-neutral-600 dark:text-neutral-400 ${className}`}>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 hover:text-red-500 text-neutral-600 dark:text-neutral-400 transition-colors group"
          title="Watch AI Workforce on YouTube"
        >
          <Youtube className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
          <span>YouTube</span>
        </a>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 hover:text-pink-500 text-neutral-600 dark:text-neutral-400 transition-colors group"
          title="Visit AI Workforce on Instagram"
        >
          <Instagram className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
          <span>@aiworkforceofficial</span>
        </a>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <a
          href={`mailto:${emailAddress}`}
          className="inline-flex items-center space-x-1.5 hover:text-black dark:hover:text-white text-neutral-600 dark:text-neutral-400 transition-colors"
          title="Send email to AI Workforce"
        >
          <Mail className="w-3.5 h-3.5 text-blue-500" />
          <span>{emailAddress}</span>
        </a>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <button
          type="button"
          onClick={() => openCookieSettings()}
          className="inline-flex items-center space-x-1.5 hover:text-black dark:hover:text-white text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
          title="Cookie Settings & Privacy Controls"
        >
          <Cookie className="w-3.5 h-3.5 text-amber-500" />
          <span>Cookie Settings</span>
        </button>
      </div>
    );
  }

  return (
    <footer
      id="app-contact-footer"
      className={`relative w-full border-t border-slate-200 dark:border-neutral-900 bg-black py-14 px-6 sm:px-8 mt-auto overflow-hidden transition-colors duration-200 ${className}`}
    >
      {/* Photorealistic Panoramic Arctic Aurora Night Sky - Public Website Footer */}
      {isPublicLanding ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          <img
            src={arcticAuroraImg}
            alt="AI Workforce - Atmospheric Arctic Aurora Skyline"
            width={1920}
            height={400}
            loading="lazy"
            className="w-full h-full object-cover object-center opacity-85 dark:opacity-95 transform scale-105"
            referrerPolicy="no-referrer"
          />
          {/* Cinematic atmospheric depth scrim - guarantees 100% WCAG contrast while preserving luminous ribbons */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-black/50 to-black/90 dark:from-black/90 dark:via-black/50 dark:to-black/95" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white dark:from-black to-transparent" />
        </div>
      ) : (
        /* Subtle 3D Orb for internal workspace views */
        <FooterR3FOrb className="opacity-70 dark:opacity-90" />
      )}

      {/* Foreground Content - strict z-10 ensuring text is crisp, legible and completely unobstructed */}
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 text-xs ${
          isPublicLanding ? 'text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'
        }`}>
          {/* Left Side: Brand, Core Value & Live Health Beacon */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Logo className="w-7 h-7" size="sm" showText={false} />
              <span className={`font-semibold tracking-tight text-sm ${
                isPublicLanding ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}>
                AI Workforce
              </span>
            </div>

            <span className="hidden sm:inline text-neutral-400 dark:text-neutral-700">·</span>
            <span className={`${isPublicLanding ? 'text-neutral-300' : 'text-neutral-600 dark:text-neutral-400'} font-medium`}>
              From software you use to employees that work
            </span>

            <span className="hidden sm:inline text-neutral-400 dark:text-neutral-700">·</span>
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              <span>All Systems Nominal</span>
            </div>
          </div>

          {/* Right Side: Channels & Direct Contact */}
          <div className="flex flex-wrap items-center justify-center gap-5">
            {/* Red Accent for YouTube */}
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 transition-colors group ${
                isPublicLanding ? 'text-neutral-200 hover:text-red-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-red-500'
              }`}
            >
              <Youtube className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
              <span>YouTube</span>
            </a>

            <span className="text-neutral-400 dark:text-neutral-700">·</span>

            {/* Accent for Instagram */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 transition-colors group ${
                isPublicLanding ? 'text-neutral-200 hover:text-pink-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-pink-500'
              }`}
            >
              <Instagram className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
              <span>Instagram</span>
            </a>

            <span className="text-neutral-400 dark:text-neutral-700">·</span>

            {/* Inbound Email Contact */}
            <div className="flex items-center gap-2 font-mono text-xs bg-neutral-900/80 border border-neutral-700/80 px-2.5 py-1 rounded-md backdrop-blur-md text-white">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <a
                href={`mailto:${emailAddress}`}
                className="text-neutral-200 hover:text-white transition-colors"
              >
                {emailAddress}
              </a>
              <button
                onClick={handleCopyEmail}
                className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Copy email address"
                aria-label="Copy email address"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Sub-row with Copyright, Technology Attestation, and Public Footer Signature */}
        <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono ${
          isPublicLanding
            ? 'border-white/10 text-neutral-300'
            : 'border-slate-200/80 dark:border-neutral-900/80 text-neutral-500 dark:text-neutral-500'
        }`}>
          <div className="flex items-center gap-2">
            <span>© 2026 AI WORKFORCE Inc.</span>
            <span className="text-[#FFD000] font-semibold tracking-wider">· POWERED BY AI WORKFORCE</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            <span className="flex items-center gap-1 text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Company Brain Grounding</span>
            </span>
            <span className="text-neutral-500">·</span>
            <span>Deterministic Guardrails Active</span>

            <span className="text-neutral-500">·</span>
            <button
              type="button"
              onClick={() => openCookieSettings()}
              className="inline-flex items-center gap-1 text-slate-300 dark:text-neutral-400 hover:text-white dark:hover:text-white hover:underline transition-colors cursor-pointer select-none"
              title="Open privacy controls & cookie settings"
              aria-label="Open cookie settings"
            >
              <Cookie className="w-3 h-3 text-amber-400" />
              <span>Cookie Settings</span>
            </button>

            {/* Discreet Public Website Footer Signature - Only rendered on public landing page */}
            {isPublicLanding && (
              <>
                <span className="text-neutral-500">·</span>
                <span className="font-sans text-[11px] text-neutral-300/80 whitespace-nowrap select-none">
                  Made by a Young Entrepreneur
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
