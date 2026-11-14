import React, { useState } from 'react';
import {
  ShieldCheck,
  Brain,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  User,
} from 'lucide-react';

interface ConversationTurn {
  id: string;
  sender: 'visitor' | 'alpha';
  text: string;
  timestamp: string;
  brainSlice?: string;
  qualificationState?: {
    intent: string;
    score: number;
    stage: string;
    temperature: 'COLD' | 'WARM' | 'HOT';
  };
  humanOversight?: {
    status: string;
    requiresReview: boolean;
  };
}

const INITIAL_CONVERSATION: ConversationTurn[] = [
  {
    id: 'turn-1',
    sender: 'visitor',
    text: "I'm interested in your service, but I'm not sure whether it's right for my business.",
    timestamp: '10:42 AM',
  },
  {
    id: 'turn-2',
    sender: 'alpha',
    text: "Let's figure that out. What are you primarily trying to improve right now?",
    timestamp: '10:42 AM',
    brainSlice: 'Verified: Consultative discovery policy (Rules §2.1)',
    qualificationState: {
      intent: 'Exploratory Fit Check',
      score: 35,
      stage: 'Discovery',
      temperature: 'COLD',
    },
    humanOversight: {
      status: 'Autonomous consultative engagement',
      requiresReview: false,
    },
  },
];

interface ScenarioOption {
  label: string;
  visitorText: string;
  alphaResponse: string;
  brainSlice: string;
  qualificationState: {
    intent: string;
    score: number;
    stage: string;
    temperature: 'COLD' | 'WARM' | 'HOT';
  };
  humanOversight: {
    status: string;
    requiresReview: boolean;
  };
}

const SCENARIOS: ScenarioOption[] = [
  {
    label: 'Inbound Enquiries Bottleneck',
    visitorText: 'We get website visitors, but not enough enquiries.',
    alphaResponse:
      'Then the first thing worth examining is what happens after someone shows interest. Are visitors getting answers quickly, and are you learning what they actually need?',
    brainSlice: 'Company Brain: 24/7 Response SLA & Multi-turn Qualification rules',
    qualificationState: {
      intent: 'Problem-Aware (Lead Drop-off)',
      score: 68,
      stage: 'Problem Qualification',
      temperature: 'WARM',
    },
    humanOversight: {
      status: 'Qualifying scope for sales team handoff',
      requiresReview: false,
    },
  },
  {
    label: 'Custom Enterprise Pricing',
    visitorText: 'Can Alpha handle custom pricing for our 50-person agency?',
    alphaResponse:
      'Yes. Alpha grounds every quotation in your verified Company Brain rate cards. For custom tier volume discounts, it calculates exact quotes and can stage a draft proposal for your account rep.',
    brainSlice: 'Company Brain: Tiered Agency Rate Cards & Discount Boundaries (§4.2)',
    qualificationState: {
      intent: 'Commercial Pricing & High Fit',
      score: 92,
      stage: 'Proposal Staging',
      temperature: 'HOT',
    },
    humanOversight: {
      status: 'Escalated: Draft proposal staged for 1-click sales sign-off',
      requiresReview: true,
    },
  },
  {
    label: 'Direct Contact / Human Handoff',
    visitorText: 'Can someone from your sales team call me today?',
    alphaResponse:
      'Absolutely. I will pass your conversation context directly to our sales coordinator. What is the best phone number and email for our team to reach you?',
    brainSlice: 'Company Brain: High-Intent Human Escalation Playbook',
    qualificationState: {
      intent: 'Immediate Human Call Request',
      score: 98,
      stage: 'Human Handoff',
      temperature: 'HOT',
    },
    humanOversight: {
      status: 'Human Dispatch Triggered: Contact details captured',
      requiresReview: true,
    },
  },
];

interface AlphaInteractiveDemoProps {
  onExperienceAlpha?: () => void;
}

export const AlphaInteractiveDemo: React.FC<AlphaInteractiveDemoProps> = ({
  onExperienceAlpha,
}) => {
  const [turns, setTurns] = useState<ConversationTurn[]>(INITIAL_CONVERSATION);
  const [activeScenarioIndex, setActiveScenarioIndex] = useState<number | null>(null);

  const handleSelectScenario = (index: number) => {
    setActiveScenarioIndex(index);
    const scenario = SCENARIOS[index];

    const visitorTurn: ConversationTurn = {
      id: `turn-visitor-${Date.now()}`,
      sender: 'visitor',
      text: scenario.visitorText,
      timestamp: '10:43 AM',
    };

    const alphaTurn: ConversationTurn = {
      id: `turn-alpha-${Date.now() + 1}`,
      sender: 'alpha',
      text: scenario.alphaResponse,
      timestamp: '10:43 AM',
      brainSlice: scenario.brainSlice,
      qualificationState: scenario.qualificationState,
      humanOversight: scenario.humanOversight,
    };

    setTurns([...INITIAL_CONVERSATION, visitorTurn, alphaTurn]);
  };

  const handleReset = () => {
    setTurns(INITIAL_CONVERSATION);
    setActiveScenarioIndex(null);
  };

  const latestAlphaTurn = [...turns].reverse().find((t) => t.sender === 'alpha');

  return (
    <div className="w-full bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-2xl overflow-hidden text-left">
      {/* Demo Header Bar */}
      <div className="px-6 py-4 bg-[#111111] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs">
            α
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              ALPHA AI SALES MANAGER
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
              <span className="text-[11px] font-normal text-zinc-400">Live Demonstration</span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Interactive conversation preview with Company Brain context
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-none cursor-pointer rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
          {onExperienceAlpha && (
            <button
              type="button"
              onClick={onExperienceAlpha}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-none rounded-lg cursor-pointer shadow-xs"
            >
              <span>Test for Your Business</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Body: Left = Conversation Transcript | Right = Operational Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left: Chat Window (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between min-h-[460px] bg-[#050505]">
          {/* Messages Flow */}
          <div className="space-y-4 mb-6">
            {turns.map((turn) => {
              const isVisitor = turn.sender === 'visitor';
              return (
                <div
                  key={turn.id}
                  className={`flex items-start gap-3 ${isVisitor ? 'justify-end' : 'justify-start'}`}
                >
                  {!isVisitor && (
                    <div className="w-7 h-7 rounded-md bg-white text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      α
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isVisitor
                        ? 'bg-white text-black font-medium rounded-br-xs'
                        : 'bg-[#111111] text-zinc-100 border border-white/10 rounded-bl-xs'
                    }`}
                  >
                    <p>{turn.text}</p>
                    <div
                      className={`text-[10px] mt-1 text-right ${
                        isVisitor ? 'text-zinc-600' : 'text-zinc-500'
                      }`}
                    >
                      {turn.timestamp}
                    </div>
                  </div>

                  {isVisitor && (
                    <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Scenario Prompts Bar */}
          <div className="pt-4 border-t border-white/10">
            <div className="text-[11px] font-medium text-zinc-400 mb-2">
              Select a visitor response to test how Alpha responds:
            </div>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((sc, idx) => {
                const isSelected = activeScenarioIndex === idx;
                return (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={() => handleSelectScenario(idx)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-none cursor-pointer ${
                      isSelected
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/10 bg-[#111111] text-zinc-300 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <span>&ldquo;{sc.visitorText}&rdquo;</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Operational Oversight & Context Rail (5 Cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-[#0A0A0A] flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <span>REAL-TIME INTELLIGENCE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              </div>
              <p className="text-xs text-zinc-400">
                Live oversight of Alpha&apos;s decision engine during this conversation.
              </p>
            </div>

            {/* 1. Company Brain Grounding Indicator */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-semibold text-white">
                  Company Brain Context
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 ml-auto" />
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed font-mono">
                {latestAlphaTurn?.brainSlice || 'Verified: Consultative discovery policy (Rules §2.1)'}
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                <span>Zero hallucination constraint active</span>
              </div>
            </div>

            {/* 2. Lead Qualification Indicator */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-coral-400" style={{ backgroundColor: '#FB7185' }} />
                  <span className="text-xs font-semibold text-white">
                    Lead Qualification
                  </span>
                </div>
                <span
                  className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white"
                >
                  {latestAlphaTurn?.qualificationState?.temperature || 'COLD'} (
                  {latestAlphaTurn?.qualificationState?.score || 35}/100)
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Classified Intent:</span>
                  <span className="font-medium text-white">{latestAlphaTurn?.qualificationState?.intent || 'Discovery'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Pipeline Stage:</span>
                  <span className="font-medium text-white">{latestAlphaTurn?.qualificationState?.stage || 'Exploration'}</span>
                </div>
              </div>
            </div>

            {/* 3. Human Oversight Indicator */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-semibold text-white">
                  Human Oversight
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 ml-auto" />
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {latestAlphaTurn?.humanOversight?.status || 'Autonomous consultative engagement'}
              </p>
              {latestAlphaTurn?.humanOversight?.requiresReview && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 border border-white/15 text-white text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3 text-lime-400" />
                  <span>Proposal staged for rep sign-off</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-zinc-500">
            Illustrative demonstration. In production, Alpha uses your verified Company Brain documents, catalog, and routing policies.
          </div>
        </div>
      </div>
    </div>
  );
};
