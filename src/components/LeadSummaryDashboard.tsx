import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Flame,
  Zap,
  Snowflake,
  ArrowRight,
  Globe,
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { InquiryLead, LeadStatus, LeadScore } from '../types.ts';

interface LeadSummaryDashboardProps {
  leads: InquiryLead[];
  onNavigateToLeads?: () => void;
  onFilterByTemperature?: (temp: LeadScore | 'ALL') => void;
  onFilterByStatus?: (status: LeadStatus | 'ALL') => void;
}

interface StatusStat {
  status: LeadStatus;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const LeadSummaryDashboard: React.FC<LeadSummaryDashboardProps> = ({
  leads,
  onNavigateToLeads,
  onFilterByTemperature,
  onFilterByStatus,
}) => {
  const [activeView, setActiveView] = useState<'status' | 'temperature' | 'both'>('both');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const totalLeads = leads.length;

  // 1. Pipeline Status Breakdown
  const statusDefinitions: { status: LeadStatus; label: string; color: string; bgColor: string; borderColor: string; textColor: string; desc: string }[] = [
    {
      status: 'New',
      label: 'New Intake',
      color: '#3b82f6', // blue
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-300',
      desc: 'Recently captured inquiries',
    },
    {
      status: 'Needs Approval',
      label: 'Needs Approval',
      color: '#f59e0b', // amber
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-700 dark:text-amber-300',
      desc: 'AI drafts waiting supervisor review',
    },
    {
      status: 'Waiting for Customer',
      label: 'Awaiting Customer',
      color: '#8b5cf6', // purple
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
      borderColor: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-700 dark:text-purple-300',
      desc: 'Dispatched replies awaiting buyer reply',
    },
    {
      status: 'Follow-up Due',
      label: 'Follow-up Due',
      color: '#ea580c', // orange
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-700 dark:text-orange-300',
      desc: 'Scheduled engagement check required',
    },
    {
      status: 'Qualified',
      label: 'Qualified',
      color: '#06b6d4', // cyan
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      textColor: 'text-cyan-700 dark:text-cyan-300',
      desc: 'Verified budget & technical fit',
    },
    {
      status: 'Won',
      label: 'Won Deal',
      color: '#10b981', // emerald
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      desc: 'Closed and converted customers',
    },
    {
      status: 'Lost',
      label: 'Lost',
      color: '#64748b', // slate
      bgColor: 'bg-slate-100 dark:bg-slate-800/60',
      borderColor: 'border-slate-200 dark:border-slate-700',
      textColor: 'text-slate-700 dark:text-slate-300',
      desc: 'Unmatched or budget constraint',
    },
    {
      status: 'Rejected',
      label: 'Rejected',
      color: '#ef4444', // red
      bgColor: 'bg-rose-50 dark:bg-rose-950/50',
      borderColor: 'border-rose-200 dark:border-rose-800',
      textColor: 'text-rose-700 dark:text-rose-300',
      desc: 'Spam, non-business, or out of scope',
    },
  ];

  const statusStats: StatusStat[] = statusDefinitions.map((def) => {
    const count = leads.filter((l) => l.status === def.status).length;
    return {
      status: def.status,
      label: def.label,
      count,
      color: def.color,
      bgColor: def.bgColor,
      borderColor: def.borderColor,
      textColor: def.textColor,
      description: def.desc,
    };
  });

  // Recharts Bar Data for Status Volume
  const barData = statusStats.map((item) => ({
    name: item.label,
    status: item.status,
    count: item.count,
    color: item.color,
    pct: totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0,
  }));

  // 2. Temperature Data
  const hotLeads = leads.filter((l) => (l.lead_score || l.lead_temperature)?.toUpperCase() === 'HOT');
  const warmLeads = leads.filter((l) => (l.lead_score || l.lead_temperature)?.toUpperCase() === 'WARM');
  const coldLeads = leads.filter((l) => {
    const score = (l.lead_score || l.lead_temperature)?.toUpperCase();
    return score === 'COLD' || (!score && l.status !== 'Won');
  });

  const hotCount = hotLeads.length;
  const warmCount = warmLeads.length;
  const coldCount = coldLeads.length;

  const hotPct = totalLeads > 0 ? Math.round((hotCount / totalLeads) * 100) : 0;
  const warmPct = totalLeads > 0 ? Math.round((warmCount / totalLeads) * 100) : 0;
  const coldPct = totalLeads > 0 ? Math.round((coldCount / totalLeads) * 100) : 0;

  const pieData =
    totalLeads > 0
      ? [
          { name: 'HOT Leads', count: hotCount, value: hotCount, color: '#e11d48', key: 'HOT', pct: hotPct },
          { name: 'WARM Leads', count: warmCount, value: warmCount, color: '#d97706', key: 'WARM', pct: warmPct },
          { name: 'COLD Leads', count: coldCount, value: coldCount, color: '#64748b', key: 'COLD', pct: coldPct },
        ].filter((d) => d.value > 0)
      : [{ name: 'Awaiting Inquiries', count: 0, value: 1, color: '#94a3b8', key: 'EMPTY', pct: 0 }];

  // 3. Pipeline Health Velocity KPIs
  const wonCount = leads.filter((l) => l.status === 'Won').length;
  const closedCount = leads.filter((l) => l.status === 'Won' || l.status === 'Lost' || l.status === 'Rejected').length;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : (wonCount > 0 ? 100 : 0);
  const activeInFlightCount = leads.filter(
    (l) => l.status !== 'Won' && l.status !== 'Lost' && l.status !== 'Rejected'
  ).length;
  const supervisorActionRequired = leads.filter(
    (l) => l.status === 'Needs Approval' || l.status === 'Follow-up Due'
  ).length;

  const handleStatusClick = (status: LeadStatus) => {
    setSelectedStatusFilter(status === selectedStatusFilter ? null : status);
    if (onFilterByStatus) {
      onFilterByStatus(status === selectedStatusFilter ? 'ALL' : status);
    }
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1 z-50">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-slate-900 dark:text-white">{data.name}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            <span className="font-bold text-slate-950 dark:text-white">{data.count}</span> lead{data.count !== 1 ? 's' : ''} ({data.pct}% of pipeline)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.key === 'EMPTY') {
        return (
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200">No Inquiries Yet</p>
            <p className="text-[11px] text-slate-500">Inbound chats will populate this breakdown</p>
          </div>
        );
      }
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1 z-50">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-slate-900 dark:text-white">{data.name}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            <span className="font-bold text-slate-950 dark:text-white">{data.count}</span> leads ({data.pct}% of total)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs p-5 sm:p-6 transition-all space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-900 dark:text-white" />
              <span>Pipeline & Lead Volume Dashboard</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Live Recharts
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time pipeline volume across stages and purchasing intent scores.
          </p>
        </div>

        {/* View Switcher & Live Status */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveView('both')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeView === 'both'
                  ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setActiveView('status')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeView === 'status'
                  ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              By Status
            </button>
            <button
              onClick={() => setActiveView('temperature')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeView === 'temperature'
                  ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              By Temperature
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Quick KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Inquiries</div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-0.5">{totalLeads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All incoming inquiries</div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40">
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">Active In-Flight</div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-950 dark:text-blue-100 mt-0.5">{activeInFlightCount}</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">In qualification pipeline</div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40">
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Action Required</div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-950 dark:text-amber-100 mt-0.5">{supervisorActionRequired}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Review drafts & follow-ups</div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Won Conversion</div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 mt-0.5">{wonCount} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">({winRate}%)</span></div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Successfully closed</div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recharts Bar Chart: Lead Volume by Status */}
        {(activeView === 'status' || activeView === 'both') && (
          <div className={`${activeView === 'status' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Lead Volume by Status
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {totalLeads} total records
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) => entry?.status && handleStatusClick(entry.status as LeadStatus)}
                      cursor="pointer"
                    >
                      {barData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={selectedStatusFilter && selectedStatusFilter !== entry.status ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Stage Pills with quick counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                {statusStats.map((item) => {
                  const isSelected = selectedStatusFilter === item.status;
                  return (
                    <button
                      key={item.status}
                      onClick={() => handleStatusClick(item.status)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'ring-2 ring-slate-950 dark:ring-white bg-white dark:bg-slate-900 border-slate-900 dark:border-white shadow-2xs'
                          : `${item.bgColor} ${item.borderColor} hover:opacity-90`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold truncate ${item.textColor}`}>
                          {item.label}
                        </span>
                        <span className={`text-xs font-extrabold ${item.textColor}`}>
                          {item.count}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recharts Pie Chart & Cards: Lead Temperature Breakdown */}
        {(activeView === 'temperature' || activeView === 'both') && (
          <div className={`${activeView === 'temperature' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Lead Temperature Distribution
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Intent Score
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center">
              <div className="relative w-full h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={totalLeads > 0 ? 3 : 0}
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-none">
                    {totalLeads}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                    Leads
                  </span>
                </div>
              </div>

              {/* Temperature cards mini list */}
              <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                <div
                  onClick={() => onFilterByTemperature && onFilterByTemperature('HOT')}
                  className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                >
                  <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-rose-600" />
                    <span>HOT</span>
                  </div>
                  <div className="text-base font-extrabold text-rose-950 dark:text-rose-100 mt-0.5">{hotCount}</div>
                  <div className="text-[9px] text-rose-700 dark:text-rose-400 font-semibold">{hotPct}%</div>
                </div>

                <div
                  onClick={() => onFilterByTemperature && onFilterByTemperature('WARM')}
                  className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-center cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>WARM</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-950 dark:text-amber-100 mt-0.5">{warmCount}</div>
                  <div className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold">{warmPct}%</div>
                </div>

                <div
                  onClick={() => onFilterByTemperature && onFilterByTemperature('COLD')}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1">
                    <Snowflake className="w-3 h-3 text-slate-500" />
                    <span>COLD</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{coldCount}</div>
                  <div className="text-[9px] text-slate-600 dark:text-slate-400 font-semibold">{coldPct}%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer link to full leads table */}
      {onNavigateToLeads && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {selectedStatusFilter ? (
              <span>Filtering pipeline by: <strong className="text-slate-900 dark:text-white">{selectedStatusFilter}</strong></span>
            ) : (
              <span>Click on any status bar to highlight specific pipeline stage</span>
            )}
          </span>
          <button
            onClick={onNavigateToLeads}
            className="font-bold text-slate-950 dark:text-white hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Full Leads Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
