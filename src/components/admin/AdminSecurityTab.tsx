import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  AlertTriangle,
  Lock,
  UserX,
  FileCode,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export interface SecurityEventRecord {
  id: string;
  timestamp: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actorUid?: string;
  actorEmail?: string;
  targetResource?: string;
  ipAddress?: string;
  description: string;
  blocked: boolean;
}

interface AdminSecurityTabProps {
  events: SecurityEventRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({
  events,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filtered = events.filter((ev) => {
    const matchesSearch =
      !searchTerm ||
      ev.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.actorEmail && ev.actorEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.targetResource && ev.targetResource.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity =
      severityFilter === 'all' || ev.severity.toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Threat Monitoring</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Zero-trust firewall telemetry, cross-tenant boundary enforcements, and blocked attack vectors.
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs">
          {(['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                severityFilter === sev
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400'
              }`}
            >
              {sev === 'all' ? `All (${events.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Security Principles Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Zero-Trust Isolation Active</div>
            <div className="text-xs text-slate-300 mt-0.5">
              Frontend is never trusted for authorization. All admin API endpoints enforce authoritative Firebase token checks.
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 px-3 py-1 rounded-lg bg-black/40 shrink-0">
          Enforcement: STRICT_ABAC
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter security events by actor, type, or resource..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Threat Type & Severity</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Actor / Origin</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No security anomalies logged. System running securely.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : ev.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            : ev.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {ev.severity}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{ev.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-slate-800 dark:text-neutral-200 font-medium">{ev.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-neutral-400">
                      <div>{ev.actorEmail || 'anonymous'}</div>
                      {ev.ipAddress && <div className="text-[10px] text-slate-400">{ev.ipAddress}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {ev.targetResource || 'API'}
                    </td>
                    <td className="py-3 px-4">
                      {ev.blocked ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <ShieldCheck className="w-3 h-3" />
                          <span>BLOCKED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>FLAGGED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
