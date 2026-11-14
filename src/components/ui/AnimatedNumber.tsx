import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className = '',
}) => {
  const spring = useSpring(value, {
    stiffness: 120,
    damping: 20,
    mass: 0.8,
  });

  const display = useTransform(spring, (current) => format(current));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={`tabular-nums font-mono ${className}`}>
      {display}
    </motion.span>
  );
};
