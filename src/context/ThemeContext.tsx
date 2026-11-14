import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Laptop, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { hasCategoryConsent, onConsentChanged } from '../services/consentService.ts';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isVerificationOpen: boolean;
  openVerificationModal: () => void;
  closeVerificationModal: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  resolvedTheme: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
  isVerificationOpen: false,
  openVerificationModal: () => {},
  closeVerificationModal: () => {},
});

const THEME_STORAGE_KEY = 'ai_workforce_theme_mode';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored as ThemeMode;
      }
    } catch {
      // ignore
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return getSystemTheme();
  });

  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Update resolved theme whenever themeMode changes or system preference changes
  useEffect(() => {
    const newResolved = themeMode === 'system' ? getSystemTheme() : themeMode;
    setResolvedTheme(newResolved);
    applyTheme(newResolved);

    try {
      if (hasCategoryConsent('preferences')) {
        localStorage.setItem(THEME_STORAGE_KEY, themeMode);
      }
    } catch {
      // ignore
    }

    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const nextResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(nextResolved);
      applyTheme(nextResolved);
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode, applyTheme]);

  // Synchronize storage if preferences consent is granted or revoked at runtime
  useEffect(() => {
    return onConsentChanged((record) => {
      if (!record.categories.preferences) {
        try {
          localStorage.removeItem(THEME_STORAGE_KEY);
        } catch {}
      } else {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, themeMode);
        } catch {}
      }
    });
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const openVerificationModal = () => setIsVerificationOpen(true);
  const closeVerificationModal = () => setIsVerificationOpen(false);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        setThemeMode,
        toggleTheme,
        isVerificationOpen,
        openVerificationModal,
        closeVerificationModal,
      }}
    >
      {children}
      {isVerificationOpen && <ThemeVerificationModal onClose={closeVerificationModal} />}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'segmented' | 'icon' | 'badge' | 'button';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = true,
  variant = 'segmented',
}) => {
  const { themeMode, setThemeMode, toggleTheme, resolvedTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#121216] border border-slate-200 dark:border-[#26262b] text-[11px] font-medium ${className}`}
        role="group"
        aria-label="Select Theme Mode"
      >
        <button
          type="button"
          onClick={() => setThemeMode('light')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            themeMode === 'light'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Light Theme"
          aria-pressed={themeMode === 'light'}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          {showLabel && <span>Light</span>}
        </button>
        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            themeMode === 'dark'
              ? 'bg-[#1c1c22] text-white shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Dark Theme"
          aria-pressed={themeMode === 'dark'}
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          {showLabel && <span>Dark</span>}
        </button>
        <button
          type="button"
          onClick={() => setThemeMode('system')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            themeMode === 'system'
              ? 'bg-white dark:bg-[#1c1c22] text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Match System Theme"
          aria-pressed={themeMode === 'system'}
        >
          <Laptop className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
          {showLabel && <span>Auto</span>}
        </button>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          resolvedTheme === 'dark'
            ? 'bg-[#121216] text-neutral-100 hover:bg-[#1c1c22] border-[#26262b]'
            : 'bg-white text-slate-800 hover:bg-slate-100 border-slate-200 shadow-2xs'
        } ${className}`}
        aria-label={`Current: ${themeMode} (${resolvedTheme}). Click to toggle mode.`}
        title={`Theme: ${themeMode} (${resolvedTheme})`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
        resolvedTheme === 'dark'
          ? 'bg-[#121216] hover:bg-[#1c1c22] text-neutral-200 border-[#26262b]'
          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
      } ${className}`}
    >
      {resolvedTheme === 'dark' ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          {showLabel && <span>Theme: {themeMode}</span>}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-700" />
          {showLabel && <span>Theme: {themeMode}</span>}
        </>
      )}
    </button>
  );
};

/**
 * Internal Theme Verification Surface
 * Renders every semantic token and component state (Light / Dark / System)
 */
export const ThemeVerificationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0a0a0c] text-slate-900 dark:text-[#f8fafc] border border-slate-200 dark:border-[#26262b] shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#26262b] pb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight">Theme System Verification Surface</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Active Mode: <strong className="uppercase">{themeMode}</strong> (Resolved: {resolvedTheme})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c1c22] text-slate-500 dark:text-neutral-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Switch Theme</label>
          <div className="flex items-center space-x-2">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  themeMode === mode
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#141419] text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-[#26262b]'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Tokens Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Typography */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#26262b] bg-slate-50 dark:bg-[#111114] space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#f8fafc]">Heading (Primary Text)</h3>
            <p className="text-xs text-slate-600 dark:text-[#cbd5e1]">Secondary body copy text.</p>
            <p className="text-[11px] text-slate-400 dark:text-[#94a3b8]">Muted helper and timestamp text.</p>
            <a href="#test" className="text-xs text-blue-600 dark:text-blue-400 underline font-medium">
              Verified Interactive Link
            </a>
          </div>

          {/* Form & Inputs */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#26262b] bg-slate-50 dark:bg-[#111114] space-y-2.5">
            <label className="text-xs font-semibold text-slate-800 dark:text-[#cbd5e1]">Input Component</label>
            <input
              type="text"
              placeholder="Input placeholder text..."
              defaultValue="Verified input text"
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#121216] text-slate-900 dark:text-[#f8fafc] border border-slate-200 dark:border-[#26262b] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* Buttons */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#26262b] bg-slate-50 dark:bg-[#111114] space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-[#cbd5e1]">Action Buttons</h4>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-xs">
                Primary Button
              </button>
              <button className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-[#1c1c22] text-slate-800 dark:text-[#cbd5e1] text-xs font-medium border border-slate-300 dark:border-[#26262b]">
                Secondary Button
              </button>
            </div>
          </div>

          {/* Feedback States */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#26262b] bg-slate-50 dark:bg-[#111114] space-y-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Success State Indicator</span>
            </div>
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Error State Alert</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-500 dark:text-neutral-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading State Spinner</span>
            </div>
          </div>
        </div>

        {/* Message Bubble Tokens */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#26262b] bg-slate-50 dark:bg-[#111114] space-y-3">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-[#cbd5e1]">Conversational Message Bubbles</h4>
          <div className="flex flex-col space-y-2">
            {/* Assistant message */}
            <div className="self-start max-w-[85%] text-xs px-3.5 py-2.5 rounded-[14px_14px_14px_2px] bg-white dark:bg-[#141419] text-slate-900 dark:text-[#f8fafc] border border-slate-200 dark:border-[#26262b] shadow-2xs">
              Hey — I'm Alpha, the AI Sales Manager for AI Workforce. What are you looking to solve?
            </div>
            {/* Customer message */}
            <div className="self-end max-w-[85%] text-xs px-3.5 py-2.5 rounded-[14px_14px_2px_14px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs">
              We need a 24/7 AI employee to handle inbound website leads.
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            Close Verification
          </button>
        </div>
      </div>
    </div>
  );
};
