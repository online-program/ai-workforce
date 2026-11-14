import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import mountainImg from '../../assets/images/silver_mist_mountains_1791989510618.jpg';

interface SilverMistMountainsProps {
  className?: string;
}

/**
 * SilverMistMountains:
 * A dedicated, cinematic nature section serving as an edge-to-edge
 * atmospheric interlude between product sections.
 * 
 * Art Direction:
 * - Layered mountain peaks fading into distance under cool silver moonlight.
 * - Deep charcoal and near-black mountain silhouettes with sharp ridge textures.
 * - Silky silver mist flowing naturally between ridges with hypnotic, slow movement.
 * - Perfectly seamless gradient transitions into surrounding page sections.
 * - Strictly zero text, zero people, zero buildings, zero promotional clutter.
 */
export const SilverMistMountains: React.FC<SilverMistMountainsProps> = ({ className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Atmospheric Interlude"
      className={`relative w-full overflow-hidden select-none bg-neutral-950 transition-colors duration-300 ${className}`}
    >
      {/* Aspect-ratio clamped panoramic container */}
      <div className="relative w-full h-[360px] sm:h-[460px] md:h-[540px] lg:h-[620px]">
        {/* Base Photographic Plate */}
        <img
          src={mountainImg}
          alt="Layered mountain peaks bathed in cool moonlight with flowing silver mist"
          className="w-full h-full object-cover object-center transform scale-[1.02] filter contrast-[1.05] brightness-[0.92]"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Layer 1: Atmospheric Hypnotic Silver Mist - Flowing East */}
        {!shouldReduceMotion && (
          <motion.div
            initial={{ x: '-10%', opacity: 0.35 }}
            animate={{ x: '10%', opacity: [0.3, 0.45, 0.3] }}
            transition={{
              x: { duration: 32, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
              opacity: { duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
            }}
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              background:
                'radial-gradient(ellipse 70% 30% at 50% 45%, rgba(226,232,240,0.22) 0%, rgba(203,213,225,0.08) 50%, transparent 80%)',
              filter: 'blur(28px)',
            }}
          />
        )}

        {/* Layer 2: Secondary Counter-Drifting Deep Valley Mist */}
        {!shouldReduceMotion && (
          <motion.div
            initial={{ x: '8%', opacity: 0.25 }}
            animate={{ x: '-8%', opacity: [0.2, 0.35, 0.2] }}
            transition={{
              x: { duration: 45, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
              opacity: { duration: 22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
            }}
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              background:
                'radial-gradient(ellipse 85% 25% at 45% 60%, rgba(241,245,249,0.18) 0%, rgba(148,163,184,0.06) 45%, transparent 75%)',
              filter: 'blur(36px)',
            }}
          />
        )}

        {/* Subtle Moonlight Edge Sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 75% 15%, rgba(255,255,255,0.12) 0%, rgba(226,232,240,0.04) 30%, transparent 60%)',
          }}
        />

        {/* Top Edge Seamless Transition Mask */}
        <div className="absolute inset-x-0 top-0 h-24 sm:h-36 bg-gradient-to-b from-white dark:from-black via-white/60 dark:via-black/70 to-transparent pointer-events-none" />

        {/* Bottom Edge Seamless Transition Mask */}
        <div className="absolute inset-x-0 bottom-0 h-24 sm:h-36 bg-gradient-to-t from-white dark:from-black via-white/60 dark:via-black/70 to-transparent pointer-events-none" />
      </div>
    </section>
  );
};
