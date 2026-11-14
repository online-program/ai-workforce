import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Flame, Users, MessageSquare, Inbox } from 'lucide-react';
import { LiveIndicator } from './LiveIndicator.tsx';
import { AnimatedNumber } from './AnimatedNumber.tsx';

interface AlphaPulseProps {
  activeVisitorsCount: number;
  conversationsCount: number;
  qualifiedCount: number;
  highIntentCount: number;
  isAlphaActive?: boolean;
  onNavigateStage?: (stage: 'visitors' | 'conversations' | 'qualified' | 'high_intent') => void;
  onOpenWorkQueue?: () => void;
  className?: string;
}

export const AlphaPulse: React.FC<AlphaPulseProps> = ({
  activeVisitorsCount,
  conversationsCount,
  qualifiedCount,
  highIntentCount,
  isAlphaActive = true,
  onNavigateStage,
  onOpenWorkQueue,
  className = '',
}) => {
  const stages = [
    {
      id: 'visitors' as const,
      label: 'Visitors Interacted',
      count: activeVisitorsCount,
      icon: <Users className="w-3.5 h-3.5" />,
      color: 'text-neutral-900 dark:text-white',
      accent: 'border-neutral-200 dark:border-neutral-800',
      dotColor: 'bg-blue-500',
    },
    {
      id: 'conversations' as const,
      label: 'Active Conversations',
      count: conversationsCount,
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      color: 'text-neutral-900 dark:text-neutral-100',
      accent: 'border-neutral-200 dark:border-neutral-800',
      dotColor: 'bg-sky-500',
    },
    {
      id: 'qualified' as const,
      label: 'Qualified Inquiries',
      count: qualifiedCount,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      color: 'text-neutral-950 dark:text-white',
      accent: 'border-neutral-200 dark:border-neutral-800',
      dotColor: 'bg-emerald-500',
    },
    {
      id: 'high_intent' as const,
      label: 'High Intent Opportunities',
      count: highIntentCount,
      icon: <Flame className="w-3.5 h-3.5 text-rose-500" />,
      color: 'text-neutral-950 dark:text-white',
      accent: 'border-neutral-200 dark:border-neutral-800',
      dotColor: 'bg-rose-500',
    },
  ];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-[#0C0C0E] border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_15px_30px_-5px_rgba(0,0,0,0.6)] ${className}`}>
      {/* Background Subtle Radial Gradient */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none blur-3xl" />

      {/* Header Command Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-mono font-bold text-xl shadow-xs">
            α
            {/* Subtle orbital glow */}
            <span className="absolute -inset-1 rounded-2xl border border-neutral-200 dark:border-neutral-800 opacity-50 animate-pulse pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
                ALPHA
              </h1>
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">·</span>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                AI Sales Manager
              </span>
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">·</span>
              <LiveIndicator label="LIVE" size="sm" variant="monochrome" />
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Autonomous sales discovery, real-time qualification, and verified Company Brain intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {onOpenWorkQueue && (
            <button
              onClick={onOpenWorkQueue}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
              <span>Open Work Queue</span>
              <ArrowRight className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>24/7 Digital Employee</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-neutral-900 dark:text-white font-semibold">100% Grounded</span>
          </div>
        </div>
      </div>

      {/* Sales Pulse Funnel Pipeline */}
      <div className="mt-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center justify-between">
          <span>Real-Time Inbound Conversion Funnel</span>
          <span className="text-neutral-500">Continuous Sync</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {stages.map((st, idx) => (
            <motion.div
              key={st.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              onClick={() => onNavigateStage && onNavigateStage(st.id)}
              className={`p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border ${st.accent} hover:border-neutral-400 dark:hover:border-neutral-600 transition-all cursor-pointer group`}
            >
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="truncate">{st.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${st.color}`}>
                <AnimatedNumber value={st.count} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
