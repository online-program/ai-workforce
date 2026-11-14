import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  AlertCircle,
  Clock,
  Filter,
  CheckCircle2,
  Code,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export interface SystemErrorRecord {
  id: string;
  timestamp: string;
  service: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  endpoint?: string;
  message: string;
  stack?: string;
  sanitized: boolean;
}

interface AdminErrorsTabProps {
  errors: SystemErrorRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminErrorsTab: React.FC<AdminErrorsTabProps> = ({
  errors,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  const filtered = errors.filter((err) => {
    const matchesSearch =
      !searchTerm ||
      err.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (err.endpoint && err.endpoint.toLowerCase().includes(searchTerm.toLowerCase())) ||
      err.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      severityFilter === 'all' || err.severity.toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Production Error Monitoring</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Sanitized telemetry of exception events, API failures, and service degradations.
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs">
          {(['all', 'CRITICAL', 'ERROR', 'WARNING'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                severityFilter === sev
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400'
              }`}
            >
              {sev === 'all' ? `All (${errors.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by service, endpoint, or error message..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Errors Feed / Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-800 dark:text-white">Zero Active Error Signals</div>
            <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              All backend microservices and widget endpoints are responding within normal parameters.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {filtered.map((item) => {
              const isExpanded = expandedErrorId === item.id;
              return (
                <div key={item.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <div
                    onClick={() => setExpandedErrorId(isExpanded ? null : item.id)}
                    className="flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {item.severity === 'CRITICAL' && (
                          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        {item.severity === 'ERROR' && (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                        {item.severity === 'WARNING' && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : item.severity === 'ERROR'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {item.severity}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            [{item.service}]
                          </span>
                          {item.endpoint && (
                            <span className="font-mono text-[11px] text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                              {item.endpoint}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-800 dark:text-neutral-200 mt-1.5">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 text-right">
                      <div className="text-[11px] font-mono text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Stack Trace */}
                  {isExpanded && item.stack && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800 pl-7">
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 mb-1">Sanitized Stack Trace:</div>
                      <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {item.stack}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
