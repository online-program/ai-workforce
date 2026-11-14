import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  perspective?: number;
  glareOpacity?: number;
  scaleOnHover?: number;
  onClick?: () => void;
  interactive?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 6,
  perspective = 1000,
  glareOpacity = 0.12,
  scaleOnHover = 1.012,
  onClick,
  interactive = true,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for smooth physical response
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { stiffness: 350, damping: 30, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]), springConfig);
  const scale = useSpring(isHovered && interactive ? scaleOnHover : 1, springConfig);

  const glareX = useTransform(mouseX, [0, 1], ['0%', '100%']);
  const glareY = useTransform(mouseY, [0, 1], ['0%', '100%']);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current || !interactive) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX.set(Math.max(0, Math.min(1, x)));
      mouseY.set(Math.max(0, Math.min(1, y)));
    },
    [interactive, mouseX, mouseY]
  );

  const handleMouseEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <div
      style={{ perspective: `${perspective}px` }}
      className="relative w-full"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX: interactive ? rotateX : 0,
          rotateY: interactive ? rotateY : 0,
          scale: interactive ? scale : 1,
          transformStyle: 'preserve-3d',
        }}
        className={`relative overflow-hidden rounded-2xl bg-white dark:bg-[#0C0C0E] border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_15px_30px_-5px_rgba(0,0,0,0.6)] transition-colors duration-200 ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
        {...(props as any)}
      >
        {/* Subtle dynamic sheen reflection */}
        {interactive && (
          <motion.div
            style={{
              opacity: isHovered ? glareOpacity : 0,
              background: `radial-gradient(circle at ${glareX.get()} ${glareY.get()}, rgba(255,255,255,0.18) 0%, transparent 60%)`,
            }}
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          />
        )}
        <div className="relative z-0 h-full">{children}</div>
      </motion.div>
    </div>
  );
};
