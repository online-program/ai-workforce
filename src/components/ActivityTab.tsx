import React, { useState } from 'react';
import { Bot, Clock, Filter, Trash2, CheckCircle2, AlertCircle, ArrowRight, Activity } from 'lucide-react';
import { ActivityLog } from '../types.ts';

interface ActivityTabProps {
  activities: ActivityLog[];
  onClearActivity?: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  activities,
  onClearActivity,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = activities.filter((act) => {
    if (filterType === 'ALL') return true;
    return act.type === filterType;
  });

  const getTypeBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'approval_sent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Reply Sent
          </span>
        );
      case 'analysis':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Inquiry Analyzed
          </span>
        );
      case 'status_change':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Status Updated
          </span>
        );
      case 'task_completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Task Done
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-black dark:text-white">
            Activity Audit Stream
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-0.5">
            Immutable log of all actions, qualifications, and dispatches performed by Alpha.
          </p>
        </div>

        {activities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-2xs font-bold'
                  : 'bg-white dark:bg-black text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-slate-200 dark:border-neutral-800'
              }`}
            >
              All Events ({activities.length})
            </button>
            <button
              onClick={() => setFilterType('approval_sent')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'approval_sent'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-white dark:bg-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              Replies Sent
            </button>
            <button
              onClick={() => setFilterType('analysis')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterType === 'analysis'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'bg-white dark:bg-black text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
              }`}
            >
              Lead Analyses
            </button>
          </div>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-2 text-slate-400">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-black dark:text-white">No activity logged yet</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
            Events will automatically record here as inquiries are analyzed or replies are approved and dispatched.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((act) => (
            <div
              key={act.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  🤖
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold text-black dark:text-white">{act.employeeName}</span>
                    <span className="text-slate-300 dark:text-neutral-700 text-xs">•</span>
                    {getTypeBadge(act.type)}
                    <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate">{act.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 leading-relaxed">{act.description}</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono self-end sm:self-center flex-shrink-0">
                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {onClearActivity && (
            <div className="pt-3 flex justify-end">
              <button
                onClick={onClearActivity}
                className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center transition-colors cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Clear Activity Stream</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
