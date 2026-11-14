import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Building2,
  Mail,
  MapPin,
  Flame,
  ExternalLink,
} from 'lucide-react';

export interface AdminInquiryRecord {
  id: string;
  userId: string;
  customerName: string;
  contactInfo: string;
  leadScore: string;
  productOrService: string;
  quantity: string;
  location: string;
  status: string;
  emailDispatched: boolean;
  emailStatus: string;
  createdAt: string;
}

interface AdminInquiriesTabProps {
  inquiries: AdminInquiryRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminInquiriesTab: React.FC<AdminInquiriesTabProps> = ({
  inquiries,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = inquiries.filter((inq) => {
    const matchesSearch =
      !searchTerm ||
      inq.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.contactInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.productOrService.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'sent' && inq.emailDispatched) ||
      (statusFilter === 'needs_approval' && inq.status === 'Needs Approval') ||
      (statusFilter === 'waiting' && inq.status === 'Waiting for Customer');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Commercial Inquiries & Leads</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Cross-tenant leads captured by Alpha with delivery verification.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400'
              }`}
            >
              All ({inquiries.length})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'sent'
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400'
              }`}
            >
              Dispatched ({inquiries.filter((i) => i.emailDispatched).length})
            </button>
            <button
              onClick={() => setStatusFilter('needs_approval')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'needs_approval'
                  ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400'
              }`}
            >
              Review ({inquiries.filter((i) => i.status === 'Needs Approval').length})
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by customer, email, product, or location..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Inquiries Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Lead & Contact</th>
                <th className="py-3 px-4">Product / Service</th>
                <th className="py-3 px-4">Qty & Location</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Workflow Status</th>
                <th className="py-3 px-4 text-right">Email Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching inquiries found.
                  </td>
                </tr>
              ) : (
                filtered.map((inq) => (
                  <tr key={inq.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{inq.customerName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{inq.contactInfo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 dark:text-neutral-200">{inq.productOrService}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Tenant: {inq.userId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">{inq.quantity}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{inq.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        inq.leadScore === 'HOT'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {inq.leadScore === 'HOT' && <Flame className="w-3 h-3" />}
                        <span>{inq.leadScore}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[11px]">
                        {inq.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inq.emailDispatched ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SENT ({inq.emailStatus})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">
                          <Clock className="w-3 h-3" />
                          <span>Pending Review</span>
                        </span>
                      )}
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
