import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  inverted?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  inverted = false,
  className = '',
}) => {
  const iconDimensions = {
    xs: { icon: 22, text: 'text-xs', subtext: 'text-[8px]', markSize: 14, radius: 'rounded-md' },
    sm: { icon: 28, text: 'text-sm', subtext: 'text-[9px]', markSize: 18, radius: 'rounded-lg' },
    md: { icon: 36, text: 'text-base', subtext: 'text-[10px]', markSize: 22, radius: 'rounded-xl' },
    lg: { icon: 44, text: 'text-lg', subtext: 'text-xs', markSize: 28, radius: 'rounded-2xl' },
    xl: { icon: 56, text: 'text-2xl', subtext: 'text-sm', markSize: 36, radius: 'rounded-2xl' },
  }[size];

  const dim = iconDimensions.icon;

  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* Official AI Workforce Visual Mark */}
      <div
        className={`relative flex items-center justify-center transition-all duration-200 shadow-xs ${iconDimensions.radius} ${
          inverted
            ? 'bg-neutral-950 text-white border border-neutral-800'
            : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border border-neutral-800/80 dark:border-white/20'
        }`}
        style={{ width: `${dim}px`, height: `${dim}px` }}
      >
        <svg
          width={iconDimensions.markSize}
          height={iconDimensions.markSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-200"
        >
          {/* Central Head / Dot */}
          <circle cx="50" cy="27" r="10" fill="currentColor" />
          {/* Stylized Workforce W Geometry */}
          <path
            d="M16 34 L36 84 L50 48 L64 84 L84 34"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
            fill="none"
          />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-bold tracking-tight ${iconDimensions.text} ${
                inverted ? 'text-white' : 'text-neutral-950 dark:text-white'
              }`}
            >
              AI Workforce
            </span>
          </div>
          <span
            className={`font-mono text-[10px] tracking-wider uppercase ${
              inverted ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Digital Employees
          </span>
        </div>
      )}
    </div>
  );
};
