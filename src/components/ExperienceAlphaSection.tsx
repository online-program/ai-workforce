import React from 'react';
import { PremiumButton } from './ui/PremiumButton.tsx';
import { ArrowRight } from 'lucide-react';

interface ExperienceAlphaSectionProps {
  onEnterExperience: () => void;
  onDiscoverAlpha?: () => void;
}

export const ExperienceAlphaSection: React.FC<ExperienceAlphaSectionProps> = ({
  onEnterExperience,
  onDiscoverAlpha,
}) => {
  return (
    <section
      id="experience-alpha"
      className="py-28 px-6 sm:px-8 border-t border-white/10 bg-[#050505] text-center relative overflow-hidden"
    >
      {/* Subtle controlled white radial diffusion */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.05), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA]">
          EXPERIENCE ALPHA
        </div>

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.08] text-balance">
          WHAT IF YOU COULD MEET YOUR AI SALES MANAGER BEFORE HIRING IT?
        </h2>

        <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto">
          Build a temporary AI Sales Manager around your business. Teach Alpha what you sell, let it understand your customers, and experience how it handles real sales conversations.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <PremiumButton
            variant="primary"
            size="lg"
            onClick={onEnterExperience}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-[0_0_24px_rgba(255,255,255,0.18)]"
          >
            BUILD MY ALPHA DEMO
          </PremiumButton>

          {onDiscoverAlpha && (
            <PremiumButton
              variant="outline"
              size="lg"
              onClick={onDiscoverAlpha}
              className="w-full sm:w-auto"
            >
              DISCOVER ALPHA
            </PremiumButton>
          )}
        </div>

        <p className="text-xs text-[#71717A] font-mono pt-1">
          No sign-up. No credit card. Just your business and Alpha.
        </p>
      </div>
    </section>
  );
};
