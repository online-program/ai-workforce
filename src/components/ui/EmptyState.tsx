import React from 'react';
import { motion } from 'motion/react';
import { PremiumButton } from './PremiumButton.tsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-dashed border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 flex items-center justify-center mb-4 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3 mt-5">
          {actionLabel && onAction && (
            <PremiumButton variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </PremiumButton>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <PremiumButton variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </PremiumButton>
          )}
        </div>
      )}
    </motion.div>
  );
};
