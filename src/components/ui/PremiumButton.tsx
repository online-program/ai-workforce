import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'live' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface PremiumButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
      case 'live':
        return 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold border border-black dark:border-white tracking-tight';
      case 'primary':
        return 'bg-[#111111] text-white dark:bg-white dark:text-[#080808] hover:bg-[#222222] dark:hover:bg-[#F5F5F5] shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-[#262626] dark:border-neutral-200 tracking-tight';
      case 'secondary':
        return 'bg-[#F7F7F5] dark:bg-[#171717] text-[#111111] dark:text-white hover:bg-[#EAEAEA] dark:hover:bg-[#222222] border border-[#E5E5E0] dark:border-[#262626]';
      case 'outline':
        return 'bg-transparent text-[#111111] dark:text-white hover:bg-[#F7F7F5] dark:hover:bg-[#111111] border border-[#E5E5E0] dark:border-white/15 hover:border-neutral-400 dark:hover:border-white/40 transition-colors';
      case 'ghost':
        return 'bg-transparent text-[#686868] dark:text-[#A3A3A3] hover:text-[#111111] dark:hover:text-white hover:bg-[#F7F7F5] dark:hover:bg-[#111111]';
      case 'destructive':
        return 'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-[#DC2626]';
      default:
        return 'bg-[#111111] text-white dark:bg-white dark:text-[#080808]';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-sm font-semibold rounded-xl gap-2.5';
      case 'icon':
        return 'p-2 rounded-lg';
      case 'md':
      default:
        return 'px-4 py-2 text-xs font-semibold rounded-xl gap-2';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.015 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-sans tracking-tight transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};
