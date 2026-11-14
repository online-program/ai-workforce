import React, { useState } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
  ShieldCheck,
  Palette,
} from 'lucide-react';

export interface AdminCompanyRecord {
  id: string;
  widgetId: string;
  userId: string;
  name: string;
  industry: string;
  businessType: string;
  status: 'ACTIVE' | 'INACTIVE';
  offeringsCount: number;
  hasBrainConfigured: boolean;
  rulesConfigured: boolean;
  themeColor?: string;
  designStyle?: string;
}

interface AdminCompaniesTabProps {
  companies: AdminCompanyRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminCompaniesTab: React.FC<AdminCompaniesTabProps> = ({
  companies,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = companies.filter((c) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.widgetId.toLowerCase().includes(s) ||
      c.industry.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tenant & Company Directory</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Isolated tenant brains, knowledge configurations, catalog offerings, and design styling.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by company name, widget ID, or industry..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Company Name & Widget</th>
                <th className="py-3 px-4">Industry & Type</th>
                <th className="py-3 px-4">Company Brain Status</th>
                <th className="py-3 px-4">Offerings</th>
                <th className="py-3 px-4">Design Style</th>
                <th className="py-3 px-4 text-right">Isolation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No companies registered.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {c.themeColor && (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-slate-300 dark:border-neutral-700"
                            style={{ backgroundColor: c.themeColor }}
                          />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">[{c.widgetId}]</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-neutral-200">{c.industry}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{c.businessType}</div>
                    </td>
                    <td className="py-3 px-4">
                      {c.hasBrainConfigured ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Configured</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>Draft Only</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-neutral-300">
                      {c.offeringsCount} items
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                        {c.designStyle === 'simple' ? 'Simple' : '3D / Attractive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>Enforced</span>
                      </span>
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
