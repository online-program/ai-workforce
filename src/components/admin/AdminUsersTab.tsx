import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  TrendingUp,
  UserCheck,
  Shield,
} from 'lucide-react';

export interface AdminUserRecord {
  uid: string;
  email: string;
  createdAt: string;
  lastActiveAt: string;
  inquiriesCount: number;
  leadsCount: number;
  onboardingCompleted: boolean;
}

interface AdminUsersTabProps {
  users: AdminUserRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = users.filter((u) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return u.email.toLowerCase().includes(s) || u.uid.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registered Customer Accounts</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Platform workspaces, onboarding verification states, and lead capture activity.
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
          placeholder="Search by customer email or user ID..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Customer Email & UID</th>
                <th className="py-3 px-4">Onboarding Status</th>
                <th className="py-3 px-4">Captured Inquiries</th>
                <th className="py-3 px-4">Lead Records</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No registered user accounts matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>{u.email}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{u.uid}</div>
                    </td>
                    <td className="py-3 px-4">
                      {u.onboardingCompleted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Onboarded</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>In Progress</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-neutral-200">
                      {u.inquiriesCount} inquiries
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-neutral-300">
                      {u.leadsCount} leads
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-neutral-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-neutral-400">
                      {new Date(u.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
