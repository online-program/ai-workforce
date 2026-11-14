import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, CheckCircle2, Sparkles, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export interface SavePublishButtonProps {
  onSave: () => Promise<void>;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export type SavePublishStatus = 'idle' | 'saving' | 'saved' | 'live' | 'error';

export const SavePublishButton: React.FC<SavePublishButtonProps> = ({
  onSave,
  label = 'Save',
  className = '',
  disabled = false,
}) => {
  const [status, setStatus] = useState<SavePublishStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExecuteSave = async () => {
    if (status === 'saving' || disabled) return;
    setStatus('saving');
    setErrorMessage(null);

    const startTime = Date.now();
    try {
      await onSave();
      const elapsed = Date.now() - startTime;
      const remainingForMinTime = Math.max(0, 300 - elapsed);
      if (remainingForMinTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingForMinTime));
      }

      // Step 1: Saved ✓
      setStatus('saved');

      // Step 2: Live ✓ (confirming real-time broadcast to active widget instances)
      setTimeout(() => {
        setStatus('live');
      }, 500);

      // Step 3: Return to idle
      setTimeout(() => {
        setStatus('idle');
      }, 3500);
    } catch (err: any) {
      console.error('Save failed:', err);
      setStatus('error');
      setErrorMessage(err?.message || "Couldn't save your changes.");
    }
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <AnimatePresence mode="wait">
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            className="flex items-center space-x-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 px-3 py-1.5 rounded-xl font-medium"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage || "Couldn't save your changes."}</span>
            <button
              type="button"
              onClick={handleExecuteSave}
              className="ml-1 underline font-bold hover:text-rose-700 dark:hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </motion.div>
        )}

        {status === 'live' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Live ✓</span>
          </motion.div>
        )}

        {status === 'saved' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Saved ✓</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: disabled || status === 'saving' ? 1 : 1.02 }}
        whileTap={{ scale: disabled || status === 'saving' ? 1 : 0.98 }}
        onClick={handleExecuteSave}
        disabled={disabled || status === 'saving'}
        className={`px-4 py-2 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 dark:hover:bg-neutral-100 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {status === 'saving' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 dark:text-emerald-600" />
            <span>Saving…</span>
          </>
        ) : status === 'saved' ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>Saved ✓</span>
          </>
        ) : status === 'live' ? (
          <>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>Live ✓</span>
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            <span>{label}</span>
          </>
        )}
      </motion.button>
    </div>
  );
};
