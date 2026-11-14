import React from 'react';
import { motion, useReducedMotion, Variants } from 'motion/react';

interface FounderQuoteSceneProps {
  className?: string;
}

const QUOTE_WORDS = [
  '“An',
  'AI',
  "doesn't",
  'ask',
  'to',
  'be',
  'trusted,',
  'it',
  'wins',
  'it',
  'conversation',
  'by',
  'conversation”',
];

export const FounderQuoteScene: React.FC<FounderQuoteSceneProps> = ({ className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.09,
        delayChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 16,
      filter: shouldReduceMotion ? 'none' : 'blur(5px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.65,
        ease: 'easeOut',
      },
    },
  };

  const attributionVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.85,
        delay: shouldReduceMotion ? 0 : 1.35,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section
      id="founder-quote"
      aria-label="Founder Statement"
      className={`relative py-32 sm:py-44 px-6 sm:px-8 overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-white border-t border-slate-200/80 dark:border-neutral-900 transition-colors duration-300 ${className}`}
    >
      {/* Ambient Volumetric Silver Core & Particulate Field */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Central Luminous Silver Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[680px] h-[340px] sm:h-[680px] rounded-full bg-gradient-to-tr from-neutral-300/20 via-slate-400/10 to-transparent dark:from-neutral-800/30 dark:via-neutral-500/15 dark:to-transparent blur-3xl opacity-80" />

        {/* Abstract Sculptural Silver Ring */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  rotate: [0, 360],
                  scale: [1, 1.04, 1],
                }
          }
          transition={{
            rotate: { duration: 52, repeat: Infinity, ease: 'linear' },
            scale: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[540px] h-[280px] sm:h-[540px] rounded-full border border-neutral-300/40 dark:border-neutral-700/30 opacity-40 [mask-image:radial-gradient(ellipse_at_center,transparent_45%,black_75%)]"
        />

        {/* Outer Counter-Rotating Meridian Line */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  rotate: [360, 0],
                }
          }
          transition={{
            rotate: { duration: 68, repeat: Infinity, ease: 'linear' },
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[720px] h-[380px] sm:h-[720px] rounded-full border border-dashed border-neutral-300/30 dark:border-neutral-800/40 opacity-30"
        />

        {/* Hairline Horizon Divider with Silver Radiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700/60 to-transparent opacity-60" />
      </div>

      {/* Typographic Word-by-Word Choreography */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-10">
        {/* Quiet Editorial Brand Tag */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-xs font-mono font-medium uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400"
        >
          <span>The Core Conviction</span>
        </motion.div>

        {/* Progressive Word-by-Word Reveal */}
        <motion.blockquote
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="space-y-4"
        >
          {/* Accessible screen reader text */}
          <span className="sr-only">
            “An AI doesn't ask to be trusted, it wins it conversation by conversation” — Magnus Verity, Founder of AI Workforce
          </span>

          <div
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.18] text-balance font-sans"
            aria-hidden="true"
          >
            {QUOTE_WORDS.map((word, idx) => {
              const isHighlight =
                word.includes('trusted') ||
                word.includes('conversation') ||
                word.includes('AI');

              return (
                <motion.span
                  key={idx}
                  variants={wordVariants}
                  className={`inline-block mr-2 sm:mr-3.5 select-text ${
                    isHighlight
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-neutral-800 via-neutral-950 to-neutral-700 dark:from-white dark:via-neutral-100 dark:to-neutral-300 drop-shadow-[0_2px_12px_rgba(255,255,255,0.25)]'
                      : 'text-slate-800 dark:text-neutral-200'
                  }`}
                >
                  {word}
                </motion.span>
              );
            })}
          </div>
        </motion.blockquote>

        {/* Exact Attribution Reveal: “— Magnus Verity, Founder of AI Workforce” */}
        <motion.div
          variants={attributionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="pt-4 flex flex-col items-center justify-center space-y-1.5"
        >
          <div className="h-6 w-px bg-gradient-to-b from-neutral-300 dark:from-neutral-700 to-transparent mb-3 opacity-80" />
          <cite className="not-italic text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-white select-text">
            — Magnus Verity, Founder of AI Workforce
          </cite>
        </motion.div>
      </div>
    </section>
  );
};
