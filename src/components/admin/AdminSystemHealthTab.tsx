import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Cpu,
  Database,
  ShieldCheck,
  Mail,
  Zap,
  Radio,
  Server,
} from 'lucide-react';

export interface ServiceHealthStatus {
  service: string;
  category: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  latencyMs?: number;
  lastChecked: string;
  details?: string;
}

export interface DiagnosticsReport {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  timestamp: string;
  uptimeSeconds: number;
  services: ServiceHealthStatus[];
}

interface AdminSystemHealthTabProps {
  healthReport: DiagnosticsReport | null;
  onRunDiagnostics: () => Promise<void>;
  loading: boolean;
}

export const AdminSystemHealthTab: React.FC<AdminSystemHealthTabProps> = ({
  healthReport,
  onRunDiagnostics,
  loading,
}) => {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    try {
      await onRunDiagnostics();
    } finally {
      setRunning(false);
    }
  };

  const services = healthReport?.services || [];

  const getStatusBadge = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>HEALTHY</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>DEGRADED</span>
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <XCircle className="w-3.5 h-3.5" />
            <span>CRITICAL</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>UNKNOWN</span>
          </span>
        );
    }
  };

  const getServiceIcon = (category: string) => {
    switch (category) {
      case 'Database':
        return <Database className="w-4 h-4 text-sky-500" />;
      case 'Identity':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'Intelligence':
        return <Zap className="w-4 h-4 text-indigo-500" />;
      case 'Communication':
        return <Mail className="w-4 h-4 text-amber-500" />;
      case 'Edge CDN':
        return <Radio className="w-4 h-4 text-purple-500" />;
      default:
        return <Server className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Health & Live Diagnostics</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Non-simulated real health probes across Firestore, Identity, AI Engine, and Email relays.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={running || loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Probing Services...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      {/* Overall Health Card */}
      <div className="p-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {healthReport ? (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                healthReport.overallStatus === 'HEALTHY'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  : healthReport.overallStatus === 'CRITICAL'
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
              }`}
            >
              {healthReport.overallStatus === 'HEALTHY' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : healthReport.overallStatus === 'CRITICAL' ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {!healthReport
                ? 'Live Diagnostics Not Yet Run'
                : healthReport.overallStatus === 'HEALTHY'
                ? 'All Platform Subsystems Operational'
                : `Platform Health: ${healthReport.overallStatus}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              {healthReport
                ? `Server process uptime: ${Math.round(healthReport.uptimeSeconds)}s • Live probes completed`
                : 'Click "Run Diagnostics" to execute live backend probes across Firestore, Identity, AI Engine, and Email.'}
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Last diagnostic: {healthReport?.timestamp ? new Date(healthReport.timestamp).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Services Grid */}
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, idx) => (
            <div
              key={idx}
              className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800">
                    {getServiceIcon(s.category)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{s.service}</div>
                    <div className="text-[10px] text-slate-400">{s.category}</div>
                  </div>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <p className="text-xs text-slate-600 dark:text-neutral-400 font-medium">
                {s.details || 'No details reported.'}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] font-mono text-slate-400">
                <span>Latency: {s.latencyMs !== undefined ? `${s.latencyMs}ms` : '—'}</span>
                <span>{new Date(s.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-xs text-slate-500 dark:text-neutral-400">
          No live subsystem probe data loaded yet. Run diagnostics to inspect subsystem latency and connectivity.
        </div>
      )}
    </div>
  );
};
