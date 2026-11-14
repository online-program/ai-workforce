import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

export type AlphaActivityState = 'idle' | 'active' | 'processing' | 'responding';

interface IntelligenceOrbProps {
  className?: string;
  alphaState?: AlphaActivityState;
}

/**
 * ALPHA SIGNATURE BLACK x GLOWING WHITE ENERGY-CORE
 *
 * Architecture & Art Direction:
 * - Deep obsidian-black core (#050505) with controlled white light diffusion (#FFFFFF & #F5F5F5).
 * - Sculptural silver-grey orbital rings (#A1A1AA) with subtle specular highlights.
 * - Responsive to pointer interaction with damped physics and gentle resonance.
 * - Full reduced-motion support.
 */
export const IntelligenceOrb: React.FC<IntelligenceOrbProps> = ({
  className = '',
  alphaState = 'idle',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const normalizedX = (e.clientX - centerX) / (window.innerWidth / 2);
      const normalizedY = (e.clientY - centerY) / (window.innerHeight / 2);

      mouseX.set(Math.max(-1, Math.min(1, normalizedX)) * 14);
      mouseY.set(Math.max(-1, Math.min(1, normalizedY)) * 14);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY, shouldReduceMotion]);

  const isAlphaActive = alphaState !== 'idle';
  const isAlphaProcessing = alphaState === 'processing' || alphaState === 'responding';

  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: 34 + ((i * 37) % 32),
      y: 34 + ((i * 43) % 32),
      size: 1.5 + (i % 3) * 0.7,
      delay: (i * 0.4) % 4,
      duration: 4.5 + (i % 4) * 1.8,
    }));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. CONTROLLED WHITE & OBSIDIAN ATMOSPHERIC HALO */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: isAlphaActive ? 0.9 : 0.75,
          scale: isAlphaActive ? 1.05 : 1.0,
        }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] md:w-[640px] md:h-[640px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 35%, rgba(5,5,5,0.9) 68%, transparent 80%)',
          filter: 'blur(42px)',
        }}
      />

      {/* 2. INTERACTIVE CORE CONTAINER */}
      <motion.div
        style={shouldReduceMotion ? undefined : { x: smoothX, y: smoothY }}
        className="relative w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] flex items-center justify-center"
      >
        {/* Outer Silver-Grey Orbital Ring */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : { rotate: 360 }
          }
          transition={{ duration: isAlphaProcessing ? 14 : 28, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-white/15"
          style={{
            boxShadow: '0 0 30px rgba(255,255,255,0.06), inset 0 0 20px rgba(255,255,255,0.04)',
          }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
        </motion.div>

        {/* Inner Counter-Rotating Ring */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : { rotate: -360 }
          }
          transition={{ duration: isAlphaProcessing ? 10 : 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-6 rounded-full border border-white/10"
        >
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-neutral-300 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
        </motion.div>

        {/* Obsidian Glass Sphere */}
        <div
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#0A0A0A] border border-white/20 flex items-center justify-center overflow-hidden"
          style={{
            boxShadow:
              '0 0 45px rgba(255,255,255,0.12), inset 0 0 28px rgba(255,255,255,0.10)',
          }}
        >
          {/* Soft White Light Diffusion */}
          <motion.div
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    scale: isAlphaProcessing ? [1, 1.18, 1] : [1, 1.08, 1],
                    opacity: isAlphaProcessing ? [0.65, 0.95, 0.65] : [0.45, 0.7, 0.45],
                  }
            }
            transition={{ duration: isAlphaProcessing ? 2.2 : 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(245,245,245,0.35) 45%, transparent 75%)',
              filter: 'blur(8px)',
            }}
          />

          {/* Subtle White Stardust Particles */}
          {!shouldReduceMotion &&
            particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0.2 }}
                animate={{ opacity: [0.15, 0.8, 0.15], scale: [0.8, 1.2, 0.8] }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                }}
              />
            ))}
        </div>
      </motion.div>
    </div>
  );
};
