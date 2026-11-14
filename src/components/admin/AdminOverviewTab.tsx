import React from 'react';
import {
  Users,
  Building2,
  Cpu,
  MessageSquare,
  FileCheck,
  TrendingUp,
  Activity,
  Flame,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface OverviewMetrics {
  totalVisitors: number;
  uniqueVisitors: number;
  activeVisitorsNow: number;
  totalWidgetLoads: number;
  totalConversations: number;
  totalMessages: number;
  totalInquiries: number;
  hotLeadsCount: number;
  warmLeadsCount: number;
  conversionRate: number;
  avgLatencyMs: number;
  activeCompanies: number;
  registeredUsers: number;
  activeWidgets: number;
}

interface AdminOverviewTabProps {
  metrics: OverviewMetrics | null;
  chartData: Array<{ label: string; visitors: number; conversations: number; inquiries: number }>;
  timeRange: 'today' | '7d' | '30d' | 'all';
  onTimeRangeChange: (range: 'today' | '7d' | '30d' | 'all') => void;
  onRefresh: () => void;
  loading: boolean;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  chartData,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  loading,
}) => {
  const m = metrics || {
    totalVisitors: 0,
    uniqueVisitors: 0,
    activeVisitorsNow: 0,
    totalWidgetLoads: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalInquiries: 0,
    hotLeadsCount: 0,
    warmLeadsCount: 0,
    conversionRate: 0,
    avgLatencyMs: 0,
    activeCompanies: 0,
    registeredUsers: 0,
    activeWidgets: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Platform Command Center</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Real-time multi-tenant operations, conversion metrics, and system throughput.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time Range Pills */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl">
            {(['today', '7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Visitors */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Total Visitors</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{m.totalVisitors}</div>
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              {m.activeVisitorsNow} active now
            </div>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{m.uniqueVisitors} unique sessions</div>
        </div>

        {/* Metric 2: Commercial Inquiries */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Inquiries Captured</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{m.totalInquiries}</div>
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center">
              <Flame className="w-3.5 h-3.5 mr-1" />
              {m.hotLeadsCount} HOT
            </div>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{m.warmLeadsCount} qualified warm leads</div>
        </div>

        {/* Metric 3: Conversion Rate */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Visitor Conversion</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{m.conversionRate}%</div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              High Intent
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Inquiries per visitor session</div>
        </div>

        {/* Metric 4: AI Reasoning Latency */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Response Latency</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{m.avgLatencyMs}ms</div>
            <span className="text-xs font-semibold text-slate-600 dark:text-neutral-400">Optimal</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">End-to-end generation speed</div>
        </div>
      </div>

      {/* Production Multi-Tenant Inventory Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-800 dark:text-white font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Tenants & Companies</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">{m.activeCompanies} Active</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">Isolated</span>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-800 dark:text-white font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Production Widgets</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">{m.activeWidgets} Deployed</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Live</span>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-800 dark:text-white font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Active Conversations</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">{m.totalConversations} Threads</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">24/7 Engine</span>
        </div>
      </div>

      {/* Real Time-Series Chart */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Visitor & Inquiry Volume Flow</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Live progression of inbound website traffic and converted commercial leads.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-black dark:bg-white" />
              <span className="text-slate-600 dark:text-neutral-300 font-medium">Visitors</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-neutral-300 font-medium">Inquiries</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="inquiryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="#0f172a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#visitorGradient)"
              />
              <Area
                type="monotone"
                dataKey="inquiries"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#inquiryGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
