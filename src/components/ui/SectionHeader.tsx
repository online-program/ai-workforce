import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  kicker,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div>
        {kicker && (
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
            {kicker}
          </div>
        )}
        <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
};
