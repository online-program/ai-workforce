import { useEffect } from 'react';
import { WorkspaceTab } from '../types.ts';

export interface ShortcutConfig {
  onNewInquiry?: () => void;
  onSelectTab?: (tab: WorkspaceTab) => void;
  onOpenHireModal?: () => void;
  onToggleShortcutsModal?: () => void;
  onCloseModal?: () => void;
  onApproveLead?: () => void;
  enabled?: boolean;
}

/**
 * Streamlined keyboard shortcuts hook for AI Workforce.
 * Keeps only high-impact, essential shortcuts:
 * - 'N': Add new customer inquiry
 * - 'S': Go to Settings
 * - 'B': Go to Company Brain
 * - 'W': Go to Website Chat Widget / Workspace Dashboard
 * - 'Esc': Close active dialogs / modals
 * - '?': Open shortcuts cheat sheet
 * - 'Cmd/Ctrl + Enter': Quick approve & send draft
 */
export function useKeyboardShortcuts({
  onNewInquiry,
  onSelectTab,
  onOpenHireModal,
  onToggleShortcutsModal,
  onCloseModal,
  onApproveLead,
  enabled = true,
}: ShortcutConfig) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is actively typing inside an input or editable field
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true');

      // 1. Universal Escape (always active, closes modals)
      if (e.key === 'Escape') {
        if (onCloseModal) {
          onCloseModal();
        }
        return;
      }

      // 2. Cmd/Ctrl + Enter: Quick approve lead proposal
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (onApproveLead) {
          e.preventDefault();
          onApproveLead();
        }
        return;
      }

      // If user is typing in a text field, do not trigger single-key navigation
      if (isInput) {
        return;
      }

      // Ignore if user is holding Meta/Ctrl/Alt keys (unless shift for '?')
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // 3. Essential Single-Key Shortcuts Only
      switch (key) {
        case 'n':
          if (onNewInquiry) {
            e.preventDefault();
            onNewInquiry();
          }
          break;

        case 's':
          if (onSelectTab) {
            e.preventDefault();
            onSelectTab('settings');
          }
          break;

        case 'b':
          if (onSelectTab) {
            e.preventDefault();
            onSelectTab('company_brain');
          }
          break;

        case 'w':
          if (onSelectTab) {
            e.preventDefault();
            onSelectTab('workspace_home');
          }
          break;

        case '?':
        case '/':
          if (e.shiftKey || key === '?') {
            if (onToggleShortcutsModal) {
              e.preventDefault();
              onToggleShortcutsModal();
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onNewInquiry,
    onSelectTab,
    onOpenHireModal,
    onToggleShortcutsModal,
    onCloseModal,
    onApproveLead,
  ]);
}

