import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  MessageSquare,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  Eye,
} from 'lucide-react';

export interface LiveActivityItem {
  id: string;
  timestamp: string;
  type: 'WIDGET_LOAD' | 'CHAT_MESSAGE' | 'INQUIRY_REGISTERED' | 'EMAIL_DISPATCHED' | 'ADMIN_ACTION' | 'SECURITY_FLAG';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  widgetId?: string;
  companyName?: string;
  details?: any;
}

interface AdminLiveActivityTabProps {
  activities: LiveActivityItem[];
  onRefresh: () => void;
  loading: boolean;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
}

export const AdminLiveActivityTab: React.FC<AdminLiveActivityTabProps> = ({
  activities,
  onRefresh,
  loading,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const filtered = activities.filter((a) => {
    if (selectedType === 'ALL') return true;
    return a.type === selectedType;
  });

  const getIcon = (type: string, severity: string) => {
    if (severity === 'error' || type === 'SECURITY_FLAG') {
      return <ShieldAlert className="w-4 h-4 text-red-500" />;
    }
    if (severity === 'warning') {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    if (type === 'INQUIRY_REGISTERED') {
      return <FileCheck className="w-4 h-4 text-emerald-500" />;
    }
    if (type === 'CHAT_MESSAGE') {
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
    return <Zap className="w-4 h-4 text-slate-500 dark:text-neutral-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Activity Stream</h2>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE FEED</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Streaming events across all widget deployments, visitor conversations, and background services.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
              autoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-Sync (4s)' : 'Paused'}</span>
          </button>

          {/* Type Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-neutral-900 p-1 rounded-xl border border-slate-200 dark:border-neutral-800">
            {['ALL', 'INQUIRY_REGISTERED', 'CHAT_MESSAGE', 'WIDGET_LOAD', 'SECURITY_FLAG'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedType === t
                    ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {t === 'ALL'
                  ? 'All'
                  : t === 'INQUIRY_REGISTERED'
                  ? 'Inquiries'
                  : t === 'CHAT_MESSAGE'
                  ? 'Chats'
                  : t === 'WIDGET_LOAD'
                  ? 'Loads'
                  : 'Security'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Stream Container */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">No recent activity matching the selected criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {filtered.map((act) => (
              <div
                key={act.id}
                className="p-4 hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(act.type, act.severity)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{act.title}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                        {act.type}
                      </span>
                      {act.widgetId && (
                        <span className="text-[10px] font-mono text-slate-400">
                          [{act.widgetId}]
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 mt-1">{act.description}</p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 shrink-0 text-right">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
