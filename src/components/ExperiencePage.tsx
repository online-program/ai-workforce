import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Send,
  RotateCcw,
  CheckCircle2,
  User,
  Bot,
  Loader2,
  X,
  Edit3,
  Check,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { PremiumButton } from './ui/PremiumButton.tsx';
import { IntelligenceOrb } from './ui/IntelligenceOrb.tsx';

export interface ExperiencePageProps {
  onBackToLanding: () => void;
}

type UIStage = 'welcome' | 'onboarding' | 'review' | 'live_demo' | 'ended';

interface TemporaryCompanyBrain {
  name: string;
  industry: string;
  description: string;
  offerings: string[];
  pricing: string;
  targetAudience: string;
  differentiators: string;
  policies: string;
  salesProcess: string;
}

const EMPTY_BRAIN: TemporaryCompanyBrain = {
  name: '',
  industry: '',
  description: '',
  offerings: [],
  pricing: '',
  targetAudience: '',
  differentiators: '',
  policies: '',
  salesProcess: '',
};

const STORAGE_SESSION_ID = 'aw_exp_session_id';
const STORAGE_SESSION_TOKEN = 'aw_exp_session_token';

export const ExperiencePage: React.FC<ExperiencePageProps> = ({ onBackToLanding }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capabilityToken, setCapabilityToken] = useState<string | null>(null);
  const [stage, setStage] = useState<UIStage>('welcome');
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Onboarding state
  const [onboardingMessages, setOnboardingMessages] = useState<
    Array<{ sender: 'alpha' | 'visitor'; text: string; timestamp?: string }>
  >([
    {
      sender: 'alpha',
      text: "Let's start with your business. What do you do, and what do you sell?",
    },
  ]);
  const [onboardingInput, setOnboardingInput] = useState('');
  const [companyBrain, setCompanyBrain] = useState<TemporaryCompanyBrain>(EMPTY_BRAIN);

  // Review / Edit state
  const [isEditingBrain, setIsEditingBrain] = useState(false);
  const [editDraft, setEditDraft] = useState<TemporaryCompanyBrain>(EMPTY_BRAIN);
  const [offeringsText, setOfferingsText] = useState('');

  // Live Demo state
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'customer' | 'assistant'; text: string; timestamp?: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createNewSession = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      const res = await fetch('/api/experience/session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize demonstration session.');
      }
      setSessionId(data.sessionId);
      setCapabilityToken(data.capabilityToken);
      sessionStorage.setItem(STORAGE_SESSION_ID, data.sessionId);
      sessionStorage.setItem(STORAGE_SESSION_TOKEN, data.capabilityToken);

      setCompanyBrain(EMPTY_BRAIN);
      setOnboardingMessages([
        {
          sender: 'alpha',
          text: "Let's start with your business. What do you do, and what do you sell?",
        },
      ]);
      setChatMessages([]);
      setStage('welcome');
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Alpha Experience service.');
    } finally {
      setInitializing(false);
    }
  }, []);

  // Restore existing session on refresh or create a new one
  useEffect(() => {
    let mounted = true;
    const restoreOrCreate = async () => {
      const savedId = sessionStorage.getItem(STORAGE_SESSION_ID);
      const savedToken = sessionStorage.getItem(STORAGE_SESSION_TOKEN);

      if (savedId && savedToken) {
        try {
          const res = await fetch(`/api/experience/session/${encodeURIComponent(savedId)}`, {
            headers: { 'x-session-token': savedToken },
          });
          const data = await res.json();
          if (mounted && res.ok && data.success) {
            setSessionId(savedId);
            setCapabilityToken(savedToken);
            if (data.companyBrain) setCompanyBrain(data.companyBrain);
            if (Array.isArray(data.onboardingHistory) && data.onboardingHistory.length > 0) {
              setOnboardingMessages(data.onboardingHistory);
            }
            if (Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
              setChatMessages(data.chatHistory);
            }
            if (data.stage === 'onboarding') setStage('onboarding');
            else if (data.stage === 'review') setStage('review');
            else if (data.stage === 'live_demo') setStage('live_demo');
            else setStage('welcome');
            setInitializing(false);
            return;
          }
        } catch {
          // Fall through to create new session
        }
      }

      if (mounted) {
        await createNewSession();
      }
    };

    restoreOrCreate();
    return () => {
      mounted = false;
    };
  }, [createNewSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [onboardingMessages, chatMessages, stage, loading, chatLoading]);

  // Stage B: Send Onboarding Turn
  const handleSendOnboarding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onboardingInput.trim() || !sessionId || !capabilityToken || loading) return;

    const userText = onboardingInput.trim();
    setOnboardingInput('');
    setError(null);
    setOnboardingMessages((prev) => [
      ...prev,
      { sender: 'visitor', text: userText, timestamp: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const res = await fetch('/api/experience/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': capabilityToken,
        },
        body: JSON.stringify({ sessionId, message: userText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process your response.');
      }

      if (data.companyBrain) {
        setCompanyBrain(data.companyBrain);
      }
      setOnboardingMessages((prev) => [
        ...prev,
        { sender: 'alpha', text: data.reply, timestamp: new Date().toISOString() },
      ]);

      if (data.isComplete) {
        setTimeout(() => {
          setStage('review');
        }, 700);
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Stage C: Edit & Save Company Brain
  const handleStartEditBrain = () => {
    setEditDraft({ ...companyBrain });
    setOfferingsText((companyBrain.offerings || []).join(', '));
    setIsEditingBrain(true);
  };

  const handleSaveBrainEdits = async () => {
    if (!sessionId || !capabilityToken) return;
    setLoading(true);
    setError(null);

    const updated: TemporaryCompanyBrain = {
      ...editDraft,
      offerings: offeringsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch('/api/experience/brain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': capabilityToken,
        },
        body: JSON.stringify({ sessionId, companyBrain: updated, stage: 'review' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update Company Brain.');
      }
      setCompanyBrain(data.companyBrain);
      setIsEditingBrain(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  // Transition to Stage D: Live Alpha Sales Manager
  const handleStartLiveDemo = async () => {
    if (!sessionId || !capabilityToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/experience/start-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': capabilityToken,
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start live demonstration.');
      }
      setChatMessages(
        data.chatHistory && data.chatHistory.length > 0
          ? data.chatHistory
          : [
              {
                sender: 'assistant',
                text: "Your Alpha is ready. I'll represent your business from here. You can act as a potential customer and test how I handle the conversation.",
                timestamp: new Date().toISOString(),
              },
            ]
      );
      setStage('live_demo');
    } catch (err: any) {
      setError(err.message || 'Unable to start live demo.');
    } finally {
      setLoading(false);
    }
  };

  // Stage D: Send Customer Message
  const handleSendChat = async (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || !sessionId || !capabilityToken || chatLoading) return;

    if (!customText) setChatInput('');
    setError(null);
    setChatMessages((prev) => [
      ...prev,
      { sender: 'customer', text: textToSend, timestamp: new Date().toISOString() },
    ]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/experience/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': capabilityToken,
        },
        body: JSON.stringify({ sessionId, message: textToSend }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response from Alpha.');
      }
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: data.reply, timestamp: new Date().toISOString() },
      ]);
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  // End Demo & Delete Backend Session
  const handleEndDemo = async () => {
    if (sessionId && capabilityToken) {
      try {
        await fetch('/api/experience/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': capabilityToken,
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // Ignore network errors on cleanup
      }
    }
    sessionStorage.removeItem(STORAGE_SESSION_ID);
    sessionStorage.removeItem(STORAGE_SESSION_TOKEN);
    setSessionId(null);
    setCapabilityToken(null);
    setStage('ended');
  };

  // Restart with a completely fresh session
  const handleRestartDemo = async () => {
    if (sessionId && capabilityToken) {
      try {
        await fetch('/api/experience/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': capabilityToken,
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // Ignore
      }
    }
    sessionStorage.removeItem(STORAGE_SESSION_ID);
    sessionStorage.removeItem(STORAGE_SESSION_TOKEN);
    await createNewSession();
  };

  // Compute subtle progress label
  const getProgressLabel = () => {
    if (stage === 'onboarding') {
      if (!companyBrain.name) return 'Understanding your business';
      if (companyBrain.offerings.length === 0 && !companyBrain.description) return 'Building your Company Brain';
      return 'Preparing your Alpha demo';
    }
    if (stage === 'review') return 'Reviewing your Company Brain';
    if (stage === 'live_demo') return `Representing ${companyBrain.name || 'your business'}`;
    return 'Temporary Demo Environment';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white/20">
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="w-6 h-6 rounded-md bg-white text-[#050505] flex items-center justify-center font-black text-xs">
            AW
          </span>
          <span>AI WORKFORCE</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs font-mono text-[#A1A1AA]">
            {getProgressLabel()}
          </span>
          {stage !== 'welcome' && stage !== 'ended' && (
            <button
              type="button"
              onClick={handleRestartDemo}
              className="px-3 py-1.5 rounded-lg bg-[#111111] border border-white/10 hover:border-white/25 text-xs font-medium text-[#A1A1AA] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Start a fresh demo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToLanding}
            className="p-2 rounded-lg bg-[#111111] border border-white/10 hover:border-white/25 transition-colors text-white cursor-pointer"
            aria-label="Back to AI Workforce"
            title="Back to AI Workforce"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {error && (
          <div
            role="alert"
            className="w-full max-w-3xl mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-4"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="underline font-semibold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ================================================================= */}
          {/* STAGE A: WELCOME */}
          {/* ================================================================= */}
          {stage === 'welcome' && (
            <motion.div
              key="stage-welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="w-full text-center space-y-8 py-8"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#A1A1AA]">
                ALPHA EXPERIENCE MODE · PUBLIC DEMONSTRATION
              </div>

              <div className="relative py-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-45">
                  <IntelligenceOrb alphaState="active" className="w-[340px] h-[340px]" />
                </div>
                <div className="relative z-10 max-w-2xl space-y-5">
                  <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.06]">
                    LET'S BUILD YOUR ALPHA.
                  </h1>
                  <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-xl mx-auto">
                    First, let's understand your business. Then you'll experience Alpha as your AI Sales Manager.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <PremiumButton
                  variant="primary"
                  size="lg"
                  onClick={() => setStage('onboarding')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  disabled={initializing || !sessionId}
                  className="w-full sm:w-auto shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                >
                  {initializing ? 'PREPARING SESSION...' : 'GET STARTED'}
                </PremiumButton>

                <PremiumButton
                  variant="outline"
                  size="lg"
                  onClick={onBackToLanding}
                  className="w-full sm:w-auto"
                >
                  Back to AI Workforce
                </PremiumButton>
              </div>

              {/* Privacy & Temporary Environment Notice */}
              <div className="max-w-xl mx-auto pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-[#71717A]">
                <div>No account required</div>
                <div>Temporary demo</div>
                <div>Session-only data</div>
                <div>1-hour auto-expiry</div>
              </div>
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* STAGE B: CONVERSATIONAL BUSINESS DISCOVERY */}
          {/* ================================================================= */}
          {stage === 'onboarding' && (
            <motion.div
              key="stage-onboarding"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              {/* Left: Conversational Interviewer (8 cols) */}
              <div className="lg:col-span-8 bg-[#111111] border border-white/10 rounded-2xl flex flex-col h-[74vh] shadow-2xl overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white text-[#050505] flex items-center justify-center font-black text-xs">
                      α
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Alpha Business Discovery</h2>
                      <p className="text-[11px] text-[#A1A1AA]">{getProgressLabel()}</p>
                    </div>
                  </div>

                  {companyBrain.name && (
                    <button
                      type="button"
                      onClick={() => setStage('review')}
                      className="px-3 py-1.5 rounded-lg bg-white text-[#050505] text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      Review Brain →
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {onboardingMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 ${msg.sender === 'visitor' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          msg.sender === 'visitor'
                            ? 'bg-white text-[#050505] font-bold'
                            : 'bg-[#171717] border border-white/15 text-white'
                        }`}
                      >
                        {msg.sender === 'visitor' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div
                        className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.sender === 'visitor'
                            ? 'bg-white text-[#050505] font-medium'
                            : 'bg-[#171717] border border-white/10 text-white'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#171717] border border-white/15 text-white flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#171717] border border-white/10 flex items-center gap-2 text-xs text-[#A1A1AA]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Updating your temporary Company Brain...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendOnboarding}
                  className="p-4 border-t border-white/10 bg-[#0A0A0A] flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={onboardingInput}
                    onChange={(e) => setOnboardingInput(e.target.value)}
                    placeholder="Describe your business, products, pricing, or customers..."
                    aria-label="Your business response"
                    className="flex-1 bg-[#050505] border border-white/15 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-white transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !onboardingInput.trim()}
                    className="px-5 py-3 rounded-xl bg-white text-[#050505] font-bold text-xs sm:text-sm hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Right: Live Temporary Company Brain Inspector (4 cols) */}
              <div className="lg:col-span-4 bg-[#111111] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                      TEMPORARY COMPANY BRAIN
                    </span>
                    <span className="text-[11px] font-mono text-[#71717A]">LIVE</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#71717A]">Business Name</div>
                      <div className="text-white font-medium mt-0.5">
                        {companyBrain.name || <span className="text-[#71717A] italic">Not provided yet</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#71717A]">Industry</div>
                      <div className="text-white mt-0.5">
                        {companyBrain.industry || <span className="text-[#71717A] italic">Not provided yet</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#71717A]">Offerings</div>
                      <div className="text-white mt-0.5">
                        {companyBrain.offerings.length > 0 ? (
                          companyBrain.offerings.join(', ')
                        ) : (
                          <span className="text-[#71717A] italic">Not provided yet</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#71717A]">Pricing</div>
                      <div className="text-white mt-0.5">
                        {companyBrain.pricing || <span className="text-[#71717A] italic">Not provided yet</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#71717A]">Target Customers</div>
                      <div className="text-white mt-0.5">
                        {companyBrain.targetAudience || <span className="text-[#71717A] italic">Not provided yet</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-[11px] text-[#71717A] leading-relaxed">
                  Alpha only uses facts you provide. Missing details remain unknown and will never be invented.
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* STAGE C: REVIEW & EDIT TEMPORARY COMPANY BRAIN */}
          {/* ================================================================= */}
          {stage === 'review' && (
            <motion.div
              key="stage-review"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="w-full max-w-2xl bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#A1A1AA]">
                    TEMPORARY COMPANY BRAIN
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">Review Your Business Profile</h2>
                </div>
                {!isEditingBrain && (
                  <button
                    type="button"
                    onClick={handleStartEditBrain}
                    className="px-3.5 py-2 rounded-xl bg-[#171717] border border-white/15 hover:border-white/30 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Information</span>
                  </button>
                )}
              </div>

              {isEditingBrain ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={editDraft.industry}
                        onChange={(e) => setEditDraft({ ...editDraft, industry: e.target.value })}
                        className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                      Business Description
                    </label>
                    <textarea
                      rows={2}
                      value={editDraft.description}
                      onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                      className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                      Products / Services (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={offeringsText}
                      onChange={(e) => setOfferingsText(e.target.value)}
                      className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                        Pricing (leave blank if unknown)
                      </label>
                      <input
                        type="text"
                        value={editDraft.pricing}
                        onChange={(e) => setEditDraft({ ...editDraft, pricing: e.target.value })}
                        className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={editDraft.targetAudience}
                        onChange={(e) => setEditDraft({ ...editDraft, targetAudience: e.target.value })}
                        className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#A1A1AA] mb-1">
                      Differentiators
                    </label>
                    <input
                      type="text"
                      value={editDraft.differentiators}
                      onChange={(e) => setEditDraft({ ...editDraft, differentiators: e.target.value })}
                      className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingBrain(false)}
                      className="px-4 py-2 rounded-xl bg-[#171717] border border-white/10 text-xs font-semibold text-[#A1A1AA] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBrainEdits}
                      disabled={loading}
                      className="px-5 py-2 rounded-xl bg-white text-[#050505] text-xs font-bold hover:bg-neutral-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-5 rounded-xl bg-[#050505] border border-white/10 text-xs">
                  <div className="flex justify-between border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase text-[#71717A]">Business Name</span>
                    <span className="font-bold text-white">{companyBrain.name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase text-[#71717A]">Industry</span>
                    <span className="text-white">{companyBrain.industry || 'Not provided'}</span>
                  </div>
                  <div className="border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase text-[#71717A] block mb-1">Description</span>
                    <span className="text-white leading-relaxed">{companyBrain.description || 'Not provided'}</span>
                  </div>
                  <div className="border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase text-[#71717A] block mb-1">Products & Services</span>
                    <span className="text-white">
                      {companyBrain.offerings.length > 0 ? companyBrain.offerings.join(', ') : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase text-[#71717A]">Pricing</span>
                    <span className="text-white">{companyBrain.pricing || 'Not provided (Alpha will not invent)'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase text-[#71717A]">Target Customers</span>
                    <span className="text-white">{companyBrain.targetAudience || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono uppercase text-[#71717A]">Differentiators</span>
                    <span className="text-white">{companyBrain.differentiators || 'Not provided'}</span>
                  </div>
                </div>
              )}

              {!isEditingBrain && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStage('onboarding')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#171717] border border-white/10 text-xs font-semibold text-white hover:border-white/25 transition-colors cursor-pointer"
                  >
                    ← Continue Discovery
                  </button>
                  <PremiumButton
                    variant="primary"
                    size="lg"
                    onClick={handleStartLiveDemo}
                    isLoading={loading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full sm:w-auto shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                  >
                    CONFIRM & CONTINUE TO ALPHA
                  </PremiumButton>
                </div>
              )}
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* STAGE D: LIVE ALPHA SALES MANAGER */}
          {/* ================================================================= */}
          {stage === 'live_demo' && (
            <motion.div
              key="stage-live-demo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl bg-[#111111] border border-white/10 rounded-2xl flex flex-col h-[78vh] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white text-[#050505] flex items-center justify-center font-black text-xs">
                    α
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">
                        Alpha · AI Sales Manager
                      </h2>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[11px] text-[#A1A1AA]">
                      Representing {companyBrain.name || 'Your Business'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStage('review')}
                    className="px-3 py-1.5 rounded-lg bg-[#171717] border border-white/10 hover:border-white/25 text-xs font-medium text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                  >
                    Edit Brain
                  </button>
                  <button
                    type="button"
                    onClick={handleEndDemo}
                    className="px-3.5 py-1.5 rounded-lg bg-white text-[#050505] text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    End Demo
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${msg.sender === 'customer' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        msg.sender === 'customer'
                          ? 'bg-white text-[#050505] font-bold'
                          : 'bg-[#171717] border border-white/15 text-white'
                      }`}
                    >
                      {msg.sender === 'customer' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`max-w-[82%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.sender === 'customer'
                          ? 'bg-white text-[#050505] font-medium'
                          : 'bg-[#171717] border border-white/10 text-white'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#171717] border border-white/15 text-white flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-4 rounded-2xl bg-[#171717] border border-white/10 flex items-center gap-2 text-xs text-[#A1A1AA]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Alpha is responding...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Roleplay Prompts */}
              {chatMessages.length <= 2 && (
                <div className="px-4 py-2.5 border-t border-white/10 bg-[#0A0A0A] flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-mono text-[#71717A] shrink-0">Try asking:</span>
                  {[
                    'What do you offer?',
                    'How much does it cost?',
                    'Why should I choose you over competitors?',
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendChat(q)}
                      disabled={chatLoading}
                      className="px-3 py-1 rounded-lg bg-[#171717] border border-white/10 hover:border-white/30 text-xs text-white whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="p-4 border-t border-white/10 bg-[#0A0A0A] flex items-center gap-3"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Roleplay as a customer: ask about products, pricing, or objections..."
                  aria-label="Customer message"
                  className="flex-1 bg-[#050505] border border-white/15 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-white transition-colors"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-5 py-3 rounded-xl bg-white text-[#050505] font-bold text-xs sm:text-sm hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ================================================================= */}
          {/* FINAL CONVERSION: END DEMONSTRATION */}
          {/* ================================================================= */}
          {stage === 'ended' && (
            <motion.div
              key="stage-ended"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-xl bg-[#111111] border border-white/10 rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-white text-[#050505] flex items-center justify-center font-black mx-auto shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  YOU'VE EXPERIENCED ALPHA.
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                  Now imagine this working with your actual business, your real customers, and your real Company Brain.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <PremiumButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    onBackToLanding();
                    setTimeout(() => {
                      const el = document.getElementById('demo');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 150);
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                >
                  BRING ALPHA TO MY BUSINESS
                </PremiumButton>

                <button
                  type="button"
                  onClick={handleRestartDemo}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#171717] border border-white/15 hover:border-white/30 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  TRY ANOTHER DEMO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
