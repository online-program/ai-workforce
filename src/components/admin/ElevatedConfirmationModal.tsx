import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertTriangle, Lock, X } from 'lucide-react';

export interface ElevatedConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmKeyword?: string;
  expectedConfirmationText?: string;
  actionButtonLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ElevatedConfirmationModal: React.FC<ElevatedConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmKeyword,
  expectedConfirmationText,
  actionButtonLabel = 'Confirm Elevated Action',
  isDestructive = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const targetKeyword = (confirmKeyword || expectedConfirmationText || 'CONFIRM').trim();
  const [typedKeyword, setTypedKeyword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedKeyword('');
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatched = typedKeyword.trim() === targetKeyword;

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const handleExecute = () => {
    if (!isMatched) {
      setError(true);
      return;
    }
    setError(false);
    onConfirm();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
              }`}>
                {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                  Elevated Confirmation Required
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <p className="mt-4 text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
            {description}
          </p>

          {/* Security Instruction */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1">
              To confirm this action, please type <strong className="text-black dark:text-white font-mono">{targetKeyword}</strong> below:
            </div>
            <input
              type="text"
              value={typedKeyword}
              onChange={(e) => {
                setTypedKeyword(e.target.value);
                setError(false);
              }}
              placeholder={targetKeyword}
              className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
              Confirmation text does not match. Please type exactly '{targetKeyword}'.
            </p>
          )}

          {/* Buttons */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={!isMatched}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isMatched
                  ? isDestructive
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                    : 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-sm'
                  : 'bg-slate-200 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 cursor-not-allowed'
              }`}
            >
              {actionButtonLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
