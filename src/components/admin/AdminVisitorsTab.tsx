import React, { useState } from 'react';
import {
  Users,
  Search,
  Globe,
  Monitor,
  Smartphone,
  Clock,
  FileCheck,
  Flame,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export interface VisitorSessionRecord {
  visitorId: string;
  firstSeen: string;
  lastActive: string;
  widgetId: string;
  companyName: string;
  messagesCount: number;
  inquirySubmitted: boolean;
  leadScore?: 'HOT' | 'WARM' | 'COLD' | 'QUALIFIED';
  device: 'desktop' | 'mobile' | 'tablet' | 'bot';
  browser: string;
  ipAddress?: string;
}

interface AdminVisitorsTabProps {
  visitors: VisitorSessionRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminVisitorsTab: React.FC<AdminVisitorsTabProps> = ({
  visitors,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inquiryOnly, setInquiryOnly] = useState(false);

  const filtered = visitors.filter((v) => {
    if (inquiryOnly && !v.inquirySubmitted) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      v.visitorId.toLowerCase().includes(s) ||
      v.widgetId.toLowerCase().includes(s) ||
      v.companyName.toLowerCase().includes(s) ||
      (v.ipAddress && v.ipAddress.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visitors & Session Explorer</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Active and historic visitor sessions, interaction depth, and device fingerprints.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Inquiry filter pill */}
          <button
            onClick={() => setInquiryOnly(!inquiryOnly)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
              inquiryOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Inquiries Only</span>
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
          placeholder="Filter by visitor ID, widget ID, company, or IP address..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Visitors Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Visitor ID</th>
                <th className="py-3 px-4">Company / Widget</th>
                <th className="py-3 px-4">Device / Browser</th>
                <th className="py-3 px-4">Interactions</th>
                <th className="py-3 px-4">Lead Status</th>
                <th className="py-3 px-4 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No visitor records found.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.visitorId} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {v.visitorId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-neutral-200">{v.companyName}</div>
                      <div className="text-[10px] font-mono text-slate-400">[{v.widgetId}]</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-700 dark:text-neutral-300">
                        {v.device === 'mobile' ? (
                          <Smartphone className="w-3.5 h-3.5" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5" />
                        )}
                        <span>{v.browser}</span>
                      </div>
                      {v.ipAddress && <div className="text-[10px] font-mono text-slate-400">{v.ipAddress}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-neutral-200">
                      {v.messagesCount} msgs
                    </td>
                    <td className="py-3 px-4">
                      {v.inquirySubmitted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Inquiry Captured</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Browsing</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-neutral-400">
                      {new Date(v.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
