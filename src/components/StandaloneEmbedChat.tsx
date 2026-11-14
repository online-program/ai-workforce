import React, { useState, useEffect } from 'react';
import { CustomerChatWidget } from './CustomerChatWidget.tsx';
import { CompanyProfile } from '../types.ts';
import { defaultCompanyProfile } from '../data/mockData.ts';
import { Loader2, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';
import { ChatComposer } from './ChatComposer.tsx';
import { generateAlphaVisitorGreeting } from '../utils/alphaWelcomeUtils.ts';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.ts';

export const StandaloneEmbedChat: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [widgetUnavailable, setWidgetUnavailable] = useState<string | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<any>({
    widget_id: '',
    business_name: 'Business Assistant',
    welcome_message: '',
    theme_color: '#0f172a',
    is_active: true,
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(defaultCompanyProfile);

  // Hook for speech recognition in embed runtime
  const speechRecognition = useSpeechRecognition();

  // Compute theme contrast for footer across light and dark designs
  const isLightBg = React.useMemo(() => {
    const bg = widgetConfig.backgroundColor || (widgetConfig.mode === 'simple' ? '#ffffff' : '#0a0a0c');
    const hex = bg.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 150;
    }
    return false;
  }, [widgetConfig.backgroundColor, widgetConfig.mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const widgetId = (params.get('widget_id') || params.get('id') || '').trim();

    setLoading(true);
    setWidgetUnavailable(null);
    setCompanyProfile(defaultCompanyProfile);

    if (!widgetId) {
      setWidgetUnavailable('Missing widget_id parameter.');
      setLoading(false);
      return;
    }

    // 1. Initial cached config from tenant-scoped localStorage key ONLY
    try {
      const cached = localStorage.getItem(`aw_widget_cfg_${widgetId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setWidgetConfig((prev: any) => ({ ...prev, ...parsed }));
        const summary = parsed.public_summary || parsed.company_profile;
        if (summary?.name) {
          setCompanyProfile((prev) => ({ ...prev, ...summary }));
        }
      }
    } catch {}

    // 2. Fetch authoritative public projection from API
    async function loadPublicWidget() {
      try {
        const res = await fetch(`/api/widget/config?widget_id=${encodeURIComponent(widgetId)}`);
        if (!res.ok) {
          setWidgetUnavailable(res.status === 404 ? 'Widget not found or inactive.' : 'Unable to load widget configuration.');
          return;
        }
        const data = await res.json();
        if (data.widget) {
          setWidgetConfig((prev: any) => ({ ...prev, ...data.widget }));
        }
        const summary = data.company_profile || data.widget?.public_summary;
        if (summary) {
          setCompanyProfile((prev) => ({ ...prev, ...summary }));
        }
      } catch (err) {
        console.warn('Could not load widget config from API:', err);
        setWidgetUnavailable('Unable to reach widget service.');
      } finally {
        setLoading(false);
      }
    }

    loadPublicWidget();

    // 3. Real-time Firestore sync scoped strictly to this widgetId (projection fields only)
    let unsubPublic = () => {};
    try {
      const publicDocRef = doc(db, 'public_widgets', widgetId);
      unsubPublic = onSnapshot(
        publicDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data) {
              setWidgetConfig((prev: any) => ({ ...prev, ...data }));
              const summary = data.public_summary;
              if (summary?.name) {
                setCompanyProfile((prev) => ({ ...prev, ...summary }));
              }
            }
          }
        },
        () => {}
      );
    } catch {
      // Ignore offline / reset
    }

    // 4. In-page and cross-component custom event listener scoped strictly to exact widget_id
    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.widget_id === widgetId) {
        setWidgetConfig((prev: any) => ({ ...prev, ...e.detail }));
        const summary = e.detail.public_summary || e.detail.company_profile;
        if (summary?.name) {
          setCompanyProfile((prev) => ({ ...prev, name: summary.name, industry: summary.industry || prev.industry }));
        }
      }
    };
    window.addEventListener('aiworkforce:widget_config_updated', handleLocalUpdate);

    // 5. Cross-tab BroadcastChannel sync scoped strictly to exact widget_id
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('aiworkforce_widget_sync');
      bc.onmessage = (event) => {
        if (event.data?.config && event.data.config.widget_id === widgetId) {
          const cfg = event.data.config;
          setWidgetConfig((prev: any) => ({ ...prev, ...cfg }));
          const summary = cfg.public_summary || cfg.company_profile;
          if (summary?.name) {
            setCompanyProfile((prev) => ({ ...prev, name: summary.name, industry: summary.industry || prev.industry }));
          }
        }
      };
    } catch {}

    // 6. Cross-tab storage change scoped strictly to exact widgetId
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `aw_widget_cfg_${widgetId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWidgetConfig((prev: any) => ({ ...prev, ...parsed }));
          const summary = parsed.public_summary || parsed.company_profile;
          if (summary?.name) {
            setCompanyProfile((prev) => ({ ...prev, name: summary.name, industry: summary.industry || prev.industry }));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubPublic();
      window.removeEventListener('aiworkforce:widget_config_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'AI_WORKFORCE_CLOSE_CHAT' }, '*');
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (widgetUnavailable || widgetConfig.is_active === false) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0c] p-6 text-center">
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          {widgetUnavailable || 'Live sales chat is currently offline.'}
        </p>
      </div>
    );
  }

  const effectiveWelcomeMessage = generateAlphaVisitorGreeting(
    companyProfile,
    widgetConfig.welcome_message
  );

  return (
    <div className="w-screen h-screen overflow-hidden p-0 m-0 bg-transparent flex flex-col relative">
      {/* Microphone status overlay for accessibility and direct visual feedback if active */}
      {speechRecognition.isSupported && speechRecognition.isListening && (
        <div className="absolute top-2 right-2 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={speechRecognition.stopListening}
            title="Microphone active - click to stop"
            className="p-2 rounded-full bg-red-600 text-white shadow-lg animate-pulse hover:bg-red-700 transition-all flex items-center justify-center"
            aria-label="Microphone recording in progress"
          >
            <MicOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main chat widget area */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        <CustomerChatWidget
          widgetId={widgetConfig.widget_id}
          businessName={widgetConfig.business_name || companyProfile.name}
          welcomeMessage={effectiveWelcomeMessage}
          themeColor={widgetConfig.theme_color || '#0f172a'}
          companyProfile={companyProfile}
          userId={widgetConfig.user_id}
          isOpen={true}
          onClose={handleClose}
          design_style={widgetConfig.design_style || 'attractive_3d'}
          isSimulatedPreview={false}
          hideAttributionFooter={true}
          mode={widgetConfig.mode}
          primaryColor={widgetConfig.primaryColor}
          secondaryColor={widgetConfig.secondaryColor}
          backgroundColor={widgetConfig.backgroundColor}
          textColor={widgetConfig.textColor}
          aiMessageColor={widgetConfig.aiMessageColor}
          aiMessageTextColor={widgetConfig.aiMessageTextColor}
          userMessageColor={widgetConfig.userMessageColor}
          userMessageTextColor={widgetConfig.userMessageTextColor}
          gradientEnabled={widgetConfig.gradientEnabled}
          gradientType={widgetConfig.gradientType}
          gradientColor1={widgetConfig.gradientColor1}
          gradientColor2={widgetConfig.gradientColor2}
          gradientAngle={widgetConfig.gradientAngle}
          borderRadius={widgetConfig.borderRadius}
          shadowIntensity={widgetConfig.shadowIntensity}
          glowIntensity={widgetConfig.glowIntensity}
          animationIntensity={widgetConfig.animationIntensity}
          studioConfig={widgetConfig.studioConfig || widgetConfig}
        />
      </div>

      {/* Standalone Embed Footer with Powered by AI Workforce attribution */}
      <footer
        style={{
          backgroundColor: isLightBg ? 'rgba(255, 255, 255, 0.96)' : 'rgba(10, 10, 12, 0.96)',
          borderTopColor: isLightBg ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        }}
        className="w-full py-1.5 px-3 border-t backdrop-blur-xs text-center text-[11px] select-none shrink-0 flex items-center justify-center z-30 transition-colors shadow-xs"
      >
        <a
          href="https://aiworkforce.ai.studio/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: isLightBg ? '#475569' : '#a1a1aa',
            textDecoration: 'none',
          }}
          className="hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-1 font-medium hover:opacity-100"
        >
          <span>Powered by AI Workforce</span>
          <span className="text-[10px] leading-none font-semibold">↗</span>
        </a>
      </footer>
    </div>
  );
};

// Also export the standalone composer for modular use across embed layouts
export { ChatComposer };
