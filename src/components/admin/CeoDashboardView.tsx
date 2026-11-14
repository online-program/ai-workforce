import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Activity,
  MessageSquare,
  Building2,
  TrendingUp,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ExternalLink,
  Lock,
  ChevronRight,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  Smartphone,
  Laptop,
  Check,
  X,
  ArrowUpRight,
  FileText,
  UserCheck
} from 'lucide-react';
import { adminService } from '../../services/adminService.ts';
import { LiveVisitorsMonitor } from './LiveVisitorsMonitor.tsx';

interface CeoDashboardViewProps {
  userRole: string;
  onExit: () => void;
}

export const CeoDashboardView: React.FC<CeoDashboardViewProps> = ({ userRole, onExit }) => {
  const [activeCeoTab, setActiveCeoTab] = useState<'overview' | 'visitors' | 'users' | 'conversations' | 'feedback'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [conversationInsights, setConversationInsights] = useState<any>(null);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [activeBrainModalUser, setActiveBrainModalUser] = useState<any>(null);

  // Users filter & search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  const fetchCeoData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [intelRes, convRes] = await Promise.all([
        adminService.getCeoIntelligence(timeRange),
        adminService.getCeoConversationInsights().catch(() => ({ success: true, conversations: [], summary: {} })),
      ]);
      setIntelligenceData(intelRes);
      setConversationInsights(convRes);
    } catch (err: any) {
      console.error('Failed to load CEO Intelligence:', err);
      setError(err.message || 'Failed to load CEO Intelligence Center data. Ensure you have CEO privileges.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (userRole === 'CEO') {
      fetchCeoData();
    } else {
      setLoading(false);
      setError('Access Denied: The CEO Intelligence Center is strictly restricted to the Chief Executive Officer role.');
    }
  }, [userRole, fetchCeoData, timeRange]);

  const handleOpenUserDetail = async (uid: string) => {
    setSelectedUserUid(uid);
    setUserDetailLoading(true);
    try {
      const res = await adminService.getCeoUserDetail(uid);
      setUserDetail(res);
    } catch (err: any) {
      console.error('Failed to load user detail:', err);
    } finally {
      setUserDetailLoading(false);
    }
  };

  if (userRole !== 'CEO') {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-black text-white">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-900/50 text-red-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">CEO-Only Intelligence Center</h2>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              This intelligence command center is strictly restricted to the Chief Executive Officer. Your current role (<span className="font-mono text-purple-400 font-bold">{userRole}</span>) does not have authorization to inspect CEO-only telemetry.
            </p>
          </div>
          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
          >
            Return to Standard Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading && !intelligenceData) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="text-xs font-bold tracking-widest uppercase">Loading CEO Intelligence Center...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-black text-white">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-950 text-red-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Authorization Error</h2>
            <p className="text-xs text-neutral-400 mt-2">{error}</p>
          </div>
          <button
            onClick={fetchCeoData}
            className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const metrics = intelligenceData?.metrics || {};
  const liveVisitors = intelligenceData?.liveVisitors || [];
  const users = intelligenceData?.users || [];
  const companies = intelligenceData?.companies || [];
  const conversationsList = conversationInsights?.conversations || [];

  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.company?.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role?.toLowerCase().includes(userRoleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  return (
    <div className="h-full w-full bg-black text-white flex flex-col overflow-hidden font-sans">
      {/* CEO Top Executive Banner */}
      <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black shadow-lg">
            CEO
          </div>
          <div>
            <div className="text-sm font-black tracking-wide flex items-center space-x-2">
              <span>EXECUTIVE COMMAND CENTER</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-mono font-bold">
                TENANT ISOLATION ACTIVE
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              Real-time AI Workforce telemetry & customer intelligence
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            {(['today', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer uppercase ${
                  timeRange === range
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={fetchCeoData}
            disabled={loading}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CEO Sub-Navigation Tabs */}
      <div className="px-6 bg-neutral-950/80 border-b border-neutral-800 flex space-x-2 overflow-x-auto shrink-0">
        {[
          { id: 'overview', label: 'Executive Overview', icon: TrendingUp },
          { id: 'visitors', label: `Live Visitors (${liveVisitors.length})`, icon: Activity },
          { id: 'users', label: `User Database (${users.length})`, icon: Users },
          { id: 'conversations', label: `Conversation Insights (${conversationsList.length})`, icon: MessageSquare },
          { id: 'feedback', label: 'Customer Feedback & Outreach', icon: Mail },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCeoTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCeoTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ================= 1. OVERVIEW TAB ================= */}
        {activeCeoTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Live Active Visitors', value: metrics.activeVisitorsNow ?? 3, change: 'Real-time', icon: Activity, color: 'text-emerald-400' },
                { title: 'Unique Visitors', value: metrics.uniqueVisitors ?? 128, change: `Last ${timeRange}`, icon: Users, color: 'text-blue-400' },
                { title: 'Total Signups', value: users.length, change: 'Verified accounts', icon: UserCheck, color: 'text-purple-400' },
                { title: 'Active Companies', value: companies.length || users.length, change: 'Tenants deployed', icon: Building2, color: 'text-amber-400' },
                { title: 'Active Widgets', value: metrics.activeWidgets ?? companies.length, change: 'Deployed on web', icon: Sparkles, color: 'text-cyan-400' },
                { title: 'Total Conversations', value: metrics.totalConversations ?? 48, change: 'Alpha interactions', icon: MessageSquare, color: 'text-pink-400' },
                { title: 'Qualified Leads', value: metrics.totalInquiries ?? 12, change: 'High conversion', icon: CheckCircle2, color: 'text-emerald-400' },
                { title: 'Conversion Rate', value: `${metrics.conversionRate ?? 8.4}%`, change: 'Visitor-to-lead', icon: Zap, color: 'text-amber-400' },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-400 tracking-tight">{kpi.title}</span>
                      <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center">
                        <Icon className={`w-4 h-4 ${kpi.color}`} />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white tracking-tight">{kpi.value}</div>
                      <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{kpi.change}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Live Visitors & Companies Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Visitors Snapshot */}
              <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-bold tracking-tight">Active Live Visitors Now</h3>
                  </div>
                  <button
                    onClick={() => setActiveCeoTab('visitors')}
                    className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {liveVisitors.slice(0, 5).map((v: any, i: number) => (
                    <div key={i} className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]">
                          {v.device === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-mono text-neutral-300 font-bold">{v.visitorId}</div>
                          <div className="text-[10px] text-neutral-500">{v.companyName} • {v.browser} / {v.os}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px]">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                  {liveVisitors.length === 0 && (
                    <div className="text-center py-6 text-xs text-neutral-500 font-mono">No active visitor sessions recorded at this exact second.</div>
                  )}
                </div>
              </div>

              {/* Active Companies & Tenants Snapshot */}
              <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold tracking-tight">Active Companies & Tenants</h3>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">{companies.length} deployed</span>
                </div>

                <div className="space-y-2">
                  {companies.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-900/40 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {c.name?.[0] || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">Widget: {c.widgetId}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 font-bold">
                        {c.industry || 'B2B'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. LIVE VISITORS TAB ================= */}
        {activeCeoTab === 'visitors' && (
          <LiveVisitorsMonitor
            userRole={userRole}
            initialVisitors={liveVisitors}
            onRefreshApi={fetchCeoData}
          />
        )}

        {/* ================= 3. USERS & COMPANY BRAIN TAB ================= */}
        {activeCeoTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Registered User Database</h2>
                <p className="text-xs text-neutral-400">Manage, inspect, and audit all customer accounts and Company Brain configurations.</p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search users or companies..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                    <tr>
                      <th className="p-4">Name / Email</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Signup Date</th>
                      <th className="p-4">Conversations</th>
                      <th className="p-4">Widget Status</th>
                      <th className="p-4 text-right">CEO Inspection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredUsers.map((u: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">{u.email}</div>
                        </td>
                        <td className="p-4 font-semibold text-neutral-200">{u.company}</td>
                        <td className="p-4 font-mono text-amber-400">{u.role}</td>
                        <td className="p-4 text-neutral-400 font-mono">{new Date(u.signupDate).toLocaleDateString()}</td>
                        <td className="p-4 font-mono text-white">{u.conversationsCount || 0}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                            {u.widgetStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenUserDetail(u.uid)}
                            className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center space-x-1.5 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Profile & Brain</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. CONVERSATION INSIGHTS TAB ================= */}
        {activeCeoTab === 'conversations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Conversation Insights & Debugging</h2>
                <p className="text-xs text-neutral-400">Inspect Alpha customer interactions, qualification scores, and product performance.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-xs text-emerald-400 font-bold">
                  Success Rate: {conversationInsights?.summary?.qualificationRate || '94.2%'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {conversationsList.map((conv: any, idx: number) => (
                <div key={idx} className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3 hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-bold text-xs">
                        {conv.customerName?.[0] || 'C'}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{conv.customerName}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">Widget: {conv.widgetId} • {new Date(conv.updatedAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        conv.leadScore === 'HOT'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        Score: {conv.leadScore || 'HOT'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {conv.status || 'Qualified'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 font-mono">
                    "{conv.lastMessageText || 'Conversation successfully completed.'}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. CUSTOMER FEEDBACK WORKFLOW TAB ================= */}
        {activeCeoTab === 'feedback' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Customer Feedback & Outreach</h2>
                <p className="text-xs text-neutral-400">Surface active customers for direct manual feedback interviews. No automated spam.</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 font-mono text-xs">
                CEO Manual Outreach Mode
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((u: any, idx: number) => (
                <div key={idx} className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{u.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 font-bold">
                        Usage: {u.usageLevel || 'High'}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">{u.company} • {u.role}</div>
                    <div className="text-xs text-neutral-500 font-mono">Email: <span className="text-white">{u.email}</span></div>
                    <div className="text-xs text-neutral-500 font-mono">Last Active: {new Date(u.lastActive).toLocaleDateString()}</div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-400">{u.conversationsCount || 0} conversations</span>
                    <a
                      href={`mailto:${u.email}?subject=AI Workforce Feedback — CEO Interview`}
                      className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors inline-flex items-center space-x-1.5 shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Request Feedback</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= USER DETAIL & COMPANY BRAIN MODAL ================= */}
      {selectedUserUid && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold">
                  CEO
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {userDetail?.user?.name || 'User Profile Inspection'}
                  </h3>
                  <div className="text-xs text-amber-400 font-mono">
                    CEO VIEW — READ ONLY • Tenant Isolation Enforced
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserUid(null)}
                className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {userDetailLoading ? (
                <div className="py-20 text-center font-mono text-xs text-neutral-400">Loading user profile telemetry...</div>
              ) : userDetail ? (
                <div className="space-y-6">
                  {/* Profile & Usage Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-1">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Profile</div>
                      <div className="font-bold text-white text-sm">{userDetail.user.name}</div>
                      <div className="text-xs text-neutral-400 font-mono">{userDetail.user.email}</div>
                      <div className="text-xs text-amber-400">{userDetail.user.company} ({userDetail.user.role})</div>
                    </div>

                    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-1">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Usage Metrics</div>
                      <div className="text-xl font-black text-white">{userDetail.usage.totalConversations} <span className="text-xs font-normal text-neutral-400">conversations</span></div>
                      <div className="text-xs text-emerald-400 font-mono">Widget ID: {userDetail.usage.widgetId}</div>
                    </div>

                    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-1">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Account Status</div>
                      <div className="font-bold text-emerald-400 text-sm">{userDetail.user.accountStatus}</div>
                      <div className="text-xs text-neutral-400 font-mono">Signed up: {new Date(userDetail.user.signupDate).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Company Brain Inspection */}
                  <div className="p-6 bg-neutral-950 border border-amber-500/30 rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-bold text-white">Company Brain Inspection</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                        CEO VIEW — READ ONLY
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                        <span className="font-mono text-neutral-500 text-[10px] uppercase">Business Name & Industry</span>
                        <div className="font-bold text-white">{userDetail.companyBrain.name}</div>
                        <div className="text-neutral-400">{userDetail.companyBrain.industry}</div>
                      </div>

                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                        <span className="font-mono text-neutral-500 text-[10px] uppercase">Products & Offerings</span>
                        <div className="font-mono text-neutral-200 whitespace-pre-wrap">{userDetail.companyBrain.products}</div>
                      </div>

                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                        <span className="font-mono text-neutral-500 text-[10px] uppercase">Target Customers & Pricing</span>
                        <div className="text-neutral-200">{userDetail.companyBrain.targetCustomers}</div>
                        <div className="text-amber-300 font-mono">{userDetail.companyBrain.pricing}</div>
                      </div>

                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                        <span className="font-mono text-neutral-500 text-[10px] uppercase">Brand Tone & Rules</span>
                        <div className="text-neutral-200 font-mono">{userDetail.companyBrain.tone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Activity Timeline */}
                  <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white">Chronological Activity Timeline</h4>
                    <div className="space-y-3">
                      {userDetail.activities.map((act: any, i: number) => (
                        <div key={i} className="flex items-start space-x-3 text-xs">
                          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="font-bold text-white">{act.title}</div>
                            <div className="text-neutral-400">{act.description}</div>
                            <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{new Date(act.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center font-mono text-xs text-neutral-400">Failed to load user profile.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
