import { useState, useEffect, useCallback, useRef } from 'react';

export interface HandoffAlertEvent {
  id: string;
  conversationId: string;
  customerName?: string;
  reason?: string;
  timestamp: string;
  companyName?: string;
}

export function useHandoffNotifications(onOpenConversation?: (convId: string) => void) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiw_handoff_sound') !== 'false';
    }
    return true;
  });

  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // Request browser notification permission with contextual flow
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPermissionPrompt(false);
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  const triggerHandoffNotification = useCallback(
    (event: HandoffAlertEvent) => {
      if (!event.id || notifiedEventsRef.current.has(event.id)) {
        return; // Prevent duplicate alerts
      }

      notifiedEventsRef.current.add(event.id);

      // Play subtle chime if enabled
      if (soundEnabled && typeof window !== 'undefined') {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch {}
      }

      // Send browser notification if permission granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification('Human Handoff Requested', {
            body: event.reason || `Alpha escalated conversation with ${event.customerName || 'visitor'}.`,
            icon: '/favicon.png',
            tag: `handoff-${event.conversationId}`,
          });

          notif.onclick = () => {
            window.focus();
            if (onOpenConversation) {
              onOpenConversation(event.conversationId);
            }
            notif.close();
          };
        } catch {}
      }
    },
    [soundEnabled, onOpenConversation]
  );

  const toggleSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiw_handoff_sound', String(enabled));
    }
  }, []);

  return {
    permission,
    showPermissionPrompt,
    setShowPermissionPrompt,
    requestPermission,
    triggerHandoffNotification,
    soundEnabled,
    toggleSound,
  };
}
