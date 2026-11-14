import React from 'react';
import { Modal } from './ui/Modal.tsx';
import { Command, Inbox, Settings, BrainCircuit, LayoutDashboard, Sparkles, Download } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      key: 'N',
      description: 'Add New Inbound Customer Inquiry',
      badge: 'Primary Action',
      icon: <Inbox className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      detail: 'Instantly opens the inquiry entry & AI analysis modal.',
    },
    {
      key: 'D',
      description: 'Download Chat Transcript',
      badge: 'Inquiry Detail',
      icon: <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      detail: 'Exports full conversation history, commercial scope, and customer facts as a formatted text file.',
    },
    {
      key: 'S',
      description: 'Go to Settings',
      badge: 'Workspace',
      icon: <Settings className="w-4 h-4 text-slate-700 dark:text-neutral-300" />,
      detail: 'View and adjust account preferences and workspace configuration.',
    },
    {
      key: 'B',
      description: 'Go to Company Brain',
      badge: 'Knowledge',
      icon: <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      detail: 'Review verified business facts, MOQ rules, and guardrails.',
    },
    {
      key: 'W',
      description: 'Go to Widget & Dashboard',
      badge: 'Website Chat',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      detail: 'Navigate directly to your workspace dashboard and website simulator.',
    },
    {
      key: `${modKey} + Enter`,
      description: 'Approve & Send Proposal Draft',
      badge: 'Work Queue',
      icon: <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      detail: 'Instantly approves the active inquiry response draft inside the detail modal.',
    },
    {
      key: 'Esc',
      description: 'Close Modal or Dialog',
      badge: 'Global',
      icon: <Command className="w-4 h-4 text-slate-500 dark:text-neutral-400" />,
      detail: 'Closes any active modal, popup, or overlay window.',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black">
            <Command className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm sm:text-base text-black dark:text-white">
            Workspace Keyboard Shortcuts
          </span>
        </div>
      }
      subtitle="Fast single-key navigation for your daily sales operations"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-4">
        <div className="divide-y divide-slate-100 dark:divide-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-2xs">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                      {item.description}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex-shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 hidden sm:block">
                    {item.detail}
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0">
                <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-bold font-mono text-black dark:text-white bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded-lg shadow-2xs">
                  {item.key}
                </kbd>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-600 dark:text-neutral-400">
          <div className="flex items-center space-x-2">
            <span className="text-sm">💡</span>
            <span>
              Press <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 rounded">?</kbd> at any time to reopen this reference.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};

