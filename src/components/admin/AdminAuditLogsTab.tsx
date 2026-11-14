import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  User,
  Shield,
  Layers,
} from 'lucide-react';

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  adminUid: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  targetResource: string;
  targetId?: string;
  result: 'SUCCESS' | 'FAILURE';
  ipAddress?: string;
  details?: any;
}

interface AdminAuditLogsTabProps {
  logs: AuditLogRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({
  logs,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');

  const filtered = logs.filter((l) => {
    const matchesSearch =
      !searchTerm ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.targetResource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.targetId && l.targetId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesResult =
      resultFilter === 'all' || l.result.toLowerCase() === resultFilter.toLowerCase();

    return matchesSearch && matchesResult;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Immutable Audit Logs</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Full compliance ledger recording all privileged admin access, role modifications, and diagnostic executions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs">
          <button
            onClick={() => setResultFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              resultFilter === 'all'
                ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400'
            }`}
          >
            All Logs ({logs.length})
          </button>
          <button
            onClick={() => setResultFilter('success')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              resultFilter === 'success'
                ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setResultFilter('failure')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              resultFilter === 'failure'
                ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter audit logs by action, admin email, or target..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Admin Operator</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{log.action}</div>
                      {log.details && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-xs">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-800 dark:text-neutral-200">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.adminEmail}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 pl-5">
                        Role: {log.adminRole}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-neutral-300">
                      <div>{log.targetResource}</div>
                      {log.targetId && <div className="text-[10px] text-slate-400">ID: {log.targetId}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {log.result === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          <XCircle className="w-3 h-3" />
                          <span>FAILED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
