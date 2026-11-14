import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerBadge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // e.g. 'max-w-xl', 'max-w-2xl', 'max-w-3xl'
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerBadge,
  children,
  footer,
  maxWidthClass = 'max-w-2xl',
  showCloseButton = true,
}) => {
  // 1. Lock document body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // 2. Listen to Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 26,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 400) {
                onClose();
              }
            }}
            className={`bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-neutral-100 w-full ${maxWidthClass} max-h-[92dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden relative`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator Bar */}
            <div className="sm:hidden w-full flex items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-neutral-700" />
            </div>

            {/* Sticky Header */}
            {(title || showCloseButton) && (
              <header className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-neutral-950 z-10">
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      {title && (
                        <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {title}
                        </h2>
                      )}
                      {headerBadge}
                    </div>
                    {subtitle && (
                      <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    aria-label="Close modal"
                    className="p-1.5 text-slate-400 dark:text-neutral-500 hover:text-black dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer flex-shrink-0 ml-2"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </header>
            )}

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4 text-xs">
              {children}
            </div>

            {/* Sticky Footer */}
            {footer && (
              <footer className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/80 flex items-center justify-between flex-shrink-0 z-10">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
