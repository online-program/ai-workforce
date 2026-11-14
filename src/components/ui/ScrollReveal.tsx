import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  threshold?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  as?: React.ElementType;
  id?: string;
  scale?: boolean;
  interactive?: boolean;
}

/**
 * High-performance ScrollReveal component using motion/react with spring physics,
 * independent transforms, and native gestures.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
  id,
  scale = false,
  interactive = false,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const getInitialPosition = () => {
    if (shouldReduceMotion) return { opacity: 1, y: 0, x: 0, scale: 1 };
    switch (direction) {
      case 'up':
        return { opacity: 0, y: 24, x: 0, scale: scale ? 0.96 : 1 };
      case 'down':
        return { opacity: 0, y: -24, x: 0, scale: scale ? 0.96 : 1 };
      case 'left':
        return { opacity: 0, y: 0, x: 24, scale: scale ? 0.96 : 1 };
      case 'right':
        return { opacity: 0, y: 0, x: -24, scale: scale ? 0.96 : 1 };
      case 'none':
      default:
        return { opacity: 0, y: 0, x: 0, scale: scale ? 0.96 : 1 };
    }
  };

  return (
    <motion.div
      id={id}
      initial={getInitialPosition()}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 24,
        mass: 0.8,
        delay: delayMs / 1000,
      }}
      whileHover={interactive ? { scale: 1.015, y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
};

