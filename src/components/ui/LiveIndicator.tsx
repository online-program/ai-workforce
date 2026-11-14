import React from 'react';

interface LiveIndicatorProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'gold' | 'white' | 'monochrome' | 'muted';
  className?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  label = 'LIVE',
  size = 'md',
  variant = 'gold',
  className = '',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'white':
        return {
          dot: 'bg-white',
          pulse: 'bg-white/80',
          text: 'text-white',
        };
      case 'muted':
        return {
          dot: 'bg-neutral-500',
          pulse: 'bg-neutral-500/60',
          text: 'text-neutral-500',
        };
      case 'monochrome':
      case 'gold':
      default:
        return {
          dot: 'bg-neutral-900 dark:bg-white',
          pulse: 'bg-neutral-900/60 dark:bg-white/60',
          text: 'text-neutral-900 dark:text-white',
        };
    }
  };

  const colors = getColors();

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} font-bold font-mono tracking-wider ${colors.text} ${className}`}>
      <span className="relative flex items-center justify-center">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.pulse}`} />
        <span className={`relative inline-flex rounded-full ${dotSize} ${colors.dot}`} />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
};
