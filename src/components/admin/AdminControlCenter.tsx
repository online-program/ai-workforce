import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Activity,
  Users,
  Building2,
  Cpu,
  MessageSquare,
  FileCheck,
  AlertTriangle,
  HeartPulse,
  ShieldAlert,
  FileText,
  UserCog,
  RefreshCw,
  LogOut,
  ChevronRight,
  Shield,
  Clock,
  Menu,
  X,
  Lock,
  Megaphone,
} from 'lucide-react';
import { adminService, AdminAuthVerifyResponse } from '../../services/adminService.ts';
import { AdminOverviewTab } from './AdminOverviewTab.tsx';
import { AdminLiveActivityTab } from './AdminLiveActivityTab.tsx';
import { AdminVisitorsTab } from './AdminVisitorsTab.tsx';
import { AdminUsersTab } from './AdminUsersTab.tsx';
import { AdminCompaniesTab } from './AdminCompaniesTab.tsx';
import { AdminWidgetsTab } from './AdminWidgetsTab.tsx';
import { AdminConversationsTab } from './AdminConversationsTab.tsx';
import { AdminInquiriesTab } from './AdminInquiriesTab.tsx';
import { AdminErrorsTab } from './AdminErrorsTab.tsx';
import { AdminSystemHealthTab } from './AdminSystemHealthTab.tsx';
import { AdminSecurityTab } from './AdminSecurityTab.tsx';
import { AdminAuditLogsTab } from './AdminAuditLogsTab.tsx';
import { AdminTeamTab } from './AdminTeamTab.tsx';
import { AdminMarketingTab } from './AdminMarketingTab.tsx';
import { CeoDashboardView } from './CeoDashboardView.tsx';
import { Logo } from '../Logo.tsx';
import { ThemeToggle } from '../../context/ThemeContext.tsx';

export type AdminTab =
  | 'ceo-intelligence'
  | 'overview'
  | 'marketing'
  | 'live-activity'
  | 'visitors'
  | 'users'
  | 'companies'
  | 'widgets'
  | 'conversations'
  | 'inquiries'
  | 'errors'
  | 'health'
  | 'security'
  | 'audit-logs'
  | 'team';

interface AdminControlCenterProps {
  onExitToApp: () => void;
  onSignOut?: () => void;
}

export const AdminControlCenter: React.FC<AdminControlCenterProps> = ({
  onExitToApp,
  onSignOut,
}) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('ceo-intelligence');
  const [authData, setAuthData] = useState<AdminAuthVerifyResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab Data States
  const [overviewMetrics, setOverviewMetrics] = useState<any>(null);
  const [overviewCharts, setOverviewCharts] = useState<any[]>([]);
  const [overviewTimeRange, setOverviewTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [errorsList, setErrorsList] = useState<any[]>([]);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [adminInvitations, setAdminInvitations] = useState<any[]>([]);

  const [tabLoading, setTabLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 1. Initial Authoritative Admin Token Verification
  const verifyAuth = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await adminService.verifyAdminAuth();
      setAuthData(res);
    } catch (err: any) {
      console.error('Admin Auth Verification failed:', err);
      setAuthError(err.message || 'Unauthorized: Access to Admin Control Center is restricted.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  // 2. Fetch specific tab data on demand
  const fetchTabData = useCallback(async (tab: AdminTab) => {
    if (!authData?.user) return;
    setTabLoading(true);

    try {
      switch (tab) {
        case 'overview': {
          const res = await adminService.getOverview(overviewTimeRange);
          setOverviewMetrics(res.metrics);
          setOverviewCharts(res.chartData);
          break;
        }
        case 'live-activity': {
          const res = await adminService.getLiveActivity(50);
          setLiveActivities(res.activities);
          break;
        }
        case 'visitors': {
          const res = await adminService.getVisitors();
          setVisitors(res.visitors);
          break;
        }
        case 'users': {
          const res = await adminService.getUsers();
          setUsersList(res.users);
          break;
        }
        case 'companies': {
          const res = await adminService.getCompanies();
          setCompanies(res.companies);
          break;
        }
        case 'widgets': {
          const res = await adminService.getWidgets();
          setWidgets(res.widgets);
          break;
        }
        case 'conversations': {
          const res = await adminService.getConversations();
          setConversations(res.conversations);
          break;
        }
        case 'inquiries': {
          const res = await adminService.getInquiries();
          setInquiries(res.inquiries);
          break;
        }
        case 'errors': {
          const res = await adminService.getErrors(50);
          setErrorsList(res.errors);
          break;
        }
        case 'health': {
          const res = await adminService.getHealth();
          setHealthReport(res.report);
          break;
        }
        case 'security': {
          const res = await adminService.getSecurityEvents(50);
          setSecurityEvents(res.events);
          break;
        }
        case 'audit-logs': {
          const res = await adminService.getAuditLogs(100);
          setAuditLogs(res.logs);
          break;
        }
        case 'team': {
          const [teamRes, invitesRes] = await Promise.all([
            adminService.getTeam().catch(() => ({ team: [] })),
            adminService.getInvitations().catch(() => ({ invitations: [] })),
          ]);
          setTeamMembers(teamRes.team || []);
          setAdminInvitations(invitesRes.invitations || []);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch data for ${tab}:`, err);
    } finally {
      setTabLoading(false);
    }
  }, [authData, overviewTimeRange]);

  // Re-fetch tab when active tab or overview time range changes
  useEffect(() => {
    if (authData?.user) {
      fetchTabData(currentTab);
    }
  }, [currentTab, authData, fetchTabData]);

  // Live polling for live-activity tab
  useEffect(() => {
    if (!autoRefresh || currentTab !== 'live-activity' || !authData?.user) return;
    const interval = setInterval(() => {
      adminService.getLiveActivity(50).then((res) => {
        setLiveActivities(res.activities);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentTab, authData]);

  // If loading authentication
  if (authLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="text-sm font-semibold tracking-wide">Verifying Admin Identity & Dual-Layer Token...</div>
        <div className="text-xs text-slate-500 font-mono">Zero-Trust ABAC Verification</div>
      </div>
    );
  }

  // If unauthorized or error
  if (authError || !authData?.user) {
    return (
      <div className="h-screen w-full bg-slate-50 dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Privileges Required</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 leading-relaxed">
              {authError || 'Your account does not possess sufficient privileges to access the Internal Admin Control Center.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onExitToApp}
              className="w-full py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-xs"
            >
              Return to Customer Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const role = authData.user.role;
  const permissions = authData.permissions || {} as any;
  const isSuperOrCeo = role === 'CEO' || role === 'SUPER_ADMIN';
  const canAccessTeam = permissions.canManageAdmins || ['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role);

  const navItems: Array<{ id: AdminTab; label: string; icon: any; count?: number; hide?: boolean }> = [
    { id: 'ceo-intelligence', label: 'CEO Intelligence Center', icon: Shield, hide: role !== 'CEO' },
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, hide: permissions.canViewAnalytics === false },
    { id: 'marketing', label: 'Marketing Co-Founder', icon: Megaphone },
    { id: 'live-activity', label: 'Live Activity', icon: Activity, hide: permissions.canViewLiveActivity === false },
    { id: 'visitors', label: 'Visitors', icon: Users, count: visitors.length, hide: permissions.canViewAnalytics === false },
    { id: 'users', label: 'Users', icon: Users, count: usersList.length, hide: permissions.canViewUsers === false },
    { id: 'companies', label: 'Companies', icon: Building2, count: companies.length, hide: permissions.canViewCompanies === false },
    { id: 'widgets', label: 'Widgets', icon: Cpu, count: widgets.length, hide: permissions.canViewWidgets === false },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare, count: conversations.length, hide: permissions.canViewConversations === false },
    { id: 'inquiries', label: 'Inquiries', icon: FileCheck, count: inquiries.length, hide: permissions.canViewInquiries === false },
    { id: 'errors', label: 'Errors', icon: AlertTriangle, count: errorsList.length, hide: permissions.canViewErrors === false },
    { id: 'health', label: 'System Health', icon: HeartPulse, hide: permissions.canViewHealth === false },
    { id: 'security', label: 'Security Center', icon: ShieldAlert, count: securityEvents.length, hide: permissions.canViewSecurity === false },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText, hide: permissions.canViewAuditLogs === false },
    { id: 'team', label: 'Authority & Team', icon: UserCog, count: teamMembers.length, hide: !canAccessTeam },
  ];

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'CEO':
        return 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800';
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800';
      case 'CMO':
        return 'bg-pink-100 text-pink-900 border border-pink-300 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-800';
      case 'SUPPORT_ADMIN':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800';
      case 'ANALYST':
        return 'bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col md:flex-row font-sans selection:bg-slate-200 dark:selection:bg-neutral-800">
      {/* Mobile Top Navigation */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/95 dark:bg-neutral-900/95 border-b border-slate-200 dark:border-neutral-800 sticky top-0 z-30 shadow-xs backdrop-blur-md">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-white cursor-pointer"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-xs tracking-wide">ADMIN CENTER</span>
        </div>

        <button
          onClick={onExitToApp}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 font-semibold cursor-pointer"
        >
          Exit
        </button>
      </div>

      {/* Admin Sidebar Navigation */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 w-64 bg-white dark:bg-neutral-950 border-r border-slate-200 dark:border-neutral-800 flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white tracking-tight">AI Workforce</div>
                <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                  Admin Center
                </div>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadge(role)}`}>
              {role}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1">
            {navItems.map((item) => {
              if (item.hide) return null;
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black font-bold'
                        : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Controls & Operator Profile */}
          <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <ThemeToggle showLabel={false} variant="button" />
              <button
                onClick={() => fetchTabData(currentTab)}
                disabled={tabLoading}
                className="p-2 rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="Refresh Active View"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tabLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {authData.user.email}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                UID: {authData.user.uid.slice(0, 12)}...
              </div>
            </div>

            <button
              onClick={onExitToApp}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit to Workspace</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-black transition-colors">
        <div className="max-w-7xl mx-auto space-y-6 h-full">
          {currentTab === 'ceo-intelligence' && (
            <CeoDashboardView
              userRole={role}
              onExit={onExitToApp}
            />
          )}

          {currentTab === 'overview' && (
            <AdminOverviewTab
              metrics={overviewMetrics}
              chartData={overviewCharts}
              timeRange={overviewTimeRange}
              onTimeRangeChange={(range) => {
                setOverviewTimeRange(range);
                adminService.getOverview(range).then((res) => {
                  setOverviewMetrics(res.metrics);
                  setOverviewCharts(res.chartData);
                });
              }}
              onRefresh={() => fetchTabData('overview')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'marketing' && (
            <AdminMarketingTab
              userRole={role}
              userEmail={authData?.user?.email}
            />
          )}

          {currentTab === 'live-activity' && (
            <AdminLiveActivityTab
              activities={liveActivities}
              onRefresh={() => fetchTabData('live-activity')}
              loading={tabLoading}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            />
          )}

          {currentTab === 'visitors' && (
            <AdminVisitorsTab
              visitors={visitors}
              onRefresh={() => fetchTabData('visitors')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'users' && (
            <AdminUsersTab
              users={usersList}
              onRefresh={() => fetchTabData('users')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'companies' && (
            <AdminCompaniesTab
              companies={companies}
              onRefresh={() => fetchTabData('companies')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'widgets' && (
            <AdminWidgetsTab
              widgets={widgets}
              onRefresh={() => fetchTabData('widgets')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'conversations' && (
            <AdminConversationsTab
              conversations={conversations}
              onRefresh={() => fetchTabData('conversations')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'inquiries' && (
            <AdminInquiriesTab
              inquiries={inquiries}
              onRefresh={() => fetchTabData('inquiries')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'errors' && (
            <AdminErrorsTab
              errors={errorsList}
              onRefresh={() => fetchTabData('errors')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'health' && (
            <AdminSystemHealthTab
              healthReport={healthReport}
              onRunDiagnostics={async () => {
                const res = await adminService.runDiagnostics();
                setHealthReport(res.report);
              }}
              loading={tabLoading}
            />
          )}

          {currentTab === 'security' && (
            <AdminSecurityTab
              events={securityEvents}
              onRefresh={() => fetchTabData('security')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'audit-logs' && (
            <AdminAuditLogsTab
              logs={auditLogs}
              onRefresh={() => fetchTabData('audit-logs')}
              loading={tabLoading}
            />
          )}

          {currentTab === 'team' && (
            <AdminTeamTab
              team={teamMembers}
              invitations={adminInvitations}
              currentAdminRole={role}
              currentAdminUid={authData.user.uid}
              onInviteAdmin={async (payload) => {
                await adminService.inviteAdmin(payload);
                fetchTabData('team');
              }}
              onRevokeInvitation={async (payload) => {
                await adminService.revokeInvitation(payload);
                fetchTabData('team');
              }}
              onAssignRole={async (payload) => {
                await adminService.assignRole(payload);
                fetchTabData('team');
              }}
              onUpdateStatus={async (payload) => {
                await adminService.updateMemberStatus(payload);
                fetchTabData('team');
              }}
              onRevokeRole={async (payload) => {
                await adminService.revokeRole(payload);
                fetchTabData('team');
              }}
              onRefresh={() => fetchTabData('team')}
              loading={tabLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
};
