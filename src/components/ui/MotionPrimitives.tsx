import React from 'react';
import { motion, useReducedMotion, HTMLMotionProps } from 'motion/react';

export const AIW_EASE = [0.22, 1, 0.36, 1] as const;

export const AIW_TRANSITION = {
  duration: 0.45,
  ease: AIW_EASE,
};

export const AIW_SPRING = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 28,
};

interface MotionSectionProps extends HTMLMotionProps<'div'> {
  delay?: number;
  children: React.ReactNode;
}

export const FadeUpSection: React.FC<MotionSectionProps> = ({
  delay = 0,
  children,
  className = '',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: AIW_EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const SurfaceCard: React.FC<MotionSectionProps> = ({
  delay = 0,
  children,
  className = '',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: AIW_EASE }}
      className={`rounded-2xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-colors ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
