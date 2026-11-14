import React from 'react';

export type StatusCategory =
  | 'active'
  | 'pending'
  | 'hot'
  | 'warm'
  | 'cold'
  | 'qualified'
  | 'disqualified'
  | 'human_review'
  | 'waiting'
  | 'rejected'
  | 'neutral';

interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  showDot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category,
  showDot = true,
  className = '',
  size = 'md',
}) => {
  const getStyle = (): { dotColor: string; textColor: string } => {
    const s = (category || status).toLowerCase();

    // Priority / High Intent / Active uses Semantic Emerald
    if (s.includes('hot') || s.includes('urgent') || s.includes('active') || s.includes('qualified') || s.includes('live') || s.includes('ready')) {
      return {
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-700 dark:text-emerald-400',
      };
    }
    // In-Flight / Review uses Semantic Amber or High-Contrast Neutral
    if (s.includes('pending') || s.includes('approval') || s.includes('warm') || s.includes('review') || s.includes('due') || s.includes('waiting') || s.includes('sales')) {
      return {
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700 dark:text-amber-400',
      };
    }
    // Disqualified / Neutral uses Muted Monochromatic Gray
    return {
      dotColor: 'bg-neutral-500',
      textColor: 'text-neutral-500 dark:text-neutral-400',
    };
  };

  const style = getStyle();
  const textClass = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${textClass} ${style.textColor} ${className}`}>
      {showDot && <span className={`rounded-full flex-shrink-0 ${dotSize} ${style.dotColor}`} />}
      <span>{status}</span>
    </span>
  );
};
