import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Inbox,
  Users,
  CheckSquare,
  Activity,
  Settings,
  LayoutDashboard,
  Globe,
  LogOut,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { InquiryLead, ActivityLog, SalesTask, CompanyProfile, WidgetConversation, EmployeeOnboardingProfile } from '../types.ts';
import { OverviewTab } from './OverviewTab.tsx';
import { InboxTab } from './InboxTab.tsx';
import { LeadsTab } from './LeadsTab.tsx';
import { TasksTab } from './TasksTab.tsx';
import { ActivityTab } from './ActivityTab.tsx';
import { SettingsTab } from './SettingsTab.tsx';
import { WebsiteChatTab } from './WebsiteChatTab.tsx';
import { ConversationsTab } from './ConversationsTab.tsx';
import { EmployeeOnboardingModal } from './EmployeeOnboardingModal.tsx';
import { getEmployeeOnboarding } from '../utils/employeeOnboarding.ts';
import { subscribeToUserConversations } from '../services/workspaceService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ThemeToggle } from '../context/ThemeContext.tsx';

export type CoordinatorSubTab = 'overview' | 'inbox' | 'conversations' | 'leads' | 'website_chat' | 'tasks' | 'activity' | 'settings';

interface SalesCoordinatorWorkspaceProps {
  onBackToWorkspace: () => void;
  userId?: string;
  leads: InquiryLead[];
  activities: ActivityLog[];
  tasks: SalesTask[];
  companyProfile: CompanyProfile;
  onSelectLead: (lead: InquiryLead) => void;
  onToggleTask: (taskId: string) => void;
  onClearActivity: () => void;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  onResetDefaultData?: () => void;
  onResetDemoData?: () => void;
  onOpenNewInquiryModal: () => void;
  onLeadAutoCreated?: (lead: InquiryLead) => void;
  onSignOutRedirect?: () => void;
}

export const SalesCoordinatorWorkspace: React.FC<SalesCoordinatorWorkspaceProps> = ({
  onBackToWorkspace,
  userId,
  leads,
  activities,
  tasks,
  companyProfile,
  onSelectLead,
  onToggleTask,
  onClearActivity,
  onUpdateCompanyProfile,
  onResetDefaultData,
  onResetDemoData,
  onOpenNewInquiryModal,
  onLeadAutoCreated,
  onSignOutRedirect,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CoordinatorSubTab>('inbox');
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<EmployeeOnboardingProfile>(() =>
    getEmployeeOnboarding('sales_coordinator')
  );
  const [conversations, setConversations] = useState<WidgetConversation[]>([]);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToUserConversations(userId, (userConvs) => {
      setConversations(userConvs || []);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setOnboardingProfile(e.detail);
      }
    };
    window.addEventListener('aiw_employee_onboarded', handleProfileUpdate);
    return () => window.removeEventListener('aiw_employee_onboarded', handleProfileUpdate);
  }, []);

  const needsApprovalCount = leads.filter((l) => l.status === 'Needs Approval').length;
  const pendingTasksCount = tasks.filter((t) => t.status === 'pending').length;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      if (onSignOutRedirect) {
        onSignOutRedirect();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const navSubTabs: { id: CoordinatorSubTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    {
      id: 'inbox',
      label: 'Work Queue',
      icon: <Inbox className="w-3.5 h-3.5" />,
      badge:
        needsApprovalCount > 0 ? (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold">
            {needsApprovalCount}
          </span>
        ) : leads.length > 0 ? (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {leads.length}
          </span>
        ) : null,
    },
    {
      id: 'conversations',
      label: 'Conversations (3-Tier)',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      badge:
        conversations.length > 0 ? (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {conversations.length}
          </span>
        ) : null,
    },
    {
      id: 'website_chat',
      label: 'Website Chat Widget',
      icon: <Globe className="w-3.5 h-3.5" />,
      badge: <span className="w-2 h-2 rounded-full bg-emerald-500" />,
    },
    {
      id: 'leads',
      label: 'Leads Table',
      icon: <Users className="w-3.5 h-3.5" />,
      badge: (
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
          {leads.length}
        </span>
      ),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <CheckSquare className="w-3.5 h-3.5" />,
      badge:
        pendingTasksCount > 0 ? (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {pendingTasksCount}
          </span>
        ) : null,
    },
    { id: 'activity', label: 'Activity Feed', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Employee Config', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col w-full h-screen overflow-y-auto ambient-bg text-slate-900 dark:text-slate-100 selection:bg-slate-200 dark:selection:bg-slate-800 transition-colors duration-300">
      {/* Top Coordinator Banner */}
      <header className="glass-nav sticky top-0 z-30 transition-all border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBackToWorkspace}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer interactive-button"
              title="Back to Workspace Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 flex items-center justify-center shadow-xs">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white dark:text-slate-950"
                >
                  <path
                    d="M3.5 6.5L8 18L12 9L16 18L20.5 6.5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="4.5" r="2" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h1 className="text-base font-bold text-slate-950 dark:text-white leading-none">
                    {onboardingProfile.customName && onboardingProfile.customName !== 'Alpha' && onboardingProfile.customName !== 'AI Sales Manager'
                      ? `${onboardingProfile.customName} (Alpha)`
                      : 'Alpha'}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                    Active & Deployed
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOnboardingModalOpen(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 transition-colors cursor-pointer border border-slate-200 dark:border-neutral-700 interactive-button"
                    title="Configure custom name and role-specific objective"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Configure Alpha</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-xl" title={onboardingProfile.objective}>
                  {onboardingProfile.objective || 'Conversational AI for Sales & Customer Assistance'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-end sm:self-auto">
            <ThemeToggle variant="icon" />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={onOpenNewInquiryModal}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all cursor-pointer shadow-xs interactive-button space-x-1.5"
              title="Press 'N' to add new inquiry"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Inquiry</span>
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700">
                N
              </kbd>
            </motion.button>

            {user && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50 interactive-button"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs with Animated layoutId Indicator */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center space-x-1 border-t border-slate-200/70 dark:border-slate-800/80 overflow-x-auto text-xs font-medium scrollbar-none">
          {navSubTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative py-3 px-3.5 flex items-center space-x-2 transition-all cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'text-slate-950 dark:text-white font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge}

                {isActive && (
                  <motion.div
                    layoutId="activeSubTabIndicator"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-950 dark:bg-white"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace Body with AnimatePresence */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeSubTab === 'overview' && (
            <motion.div
              key="subtab-overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <OverviewTab
                leads={leads}
                activities={activities}
                tasks={tasks}
                onSelectLead={onSelectLead}
                onNavigateToInbox={() => setActiveSubTab('inbox')}
                onOpenNewInquiryModal={onOpenNewInquiryModal}
              />
            </motion.div>
          )}

          {activeSubTab === 'inbox' && (
            <motion.div
              key="subtab-inbox"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <InboxTab
                leads={leads}
                onSelectLead={onSelectLead}
                onOpenNewInquiryModal={onOpenNewInquiryModal}
                onLeadAutoCreated={onLeadAutoCreated}
              />
            </motion.div>
          )}

          {activeSubTab === 'conversations' && (
            <motion.div
              key="subtab-conversations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <ConversationsTab
                conversations={conversations}
                leads={leads}
                onSelectInquiry={onSelectLead}
                onNavigateToLeads={() => setActiveSubTab('leads')}
                onNavigateToInquiries={() => setActiveSubTab('inbox')}
              />
            </motion.div>
          )}

          {activeSubTab === 'website_chat' && (
            <motion.div
              key="subtab-website-chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <WebsiteChatTab
                companyProfile={companyProfile}
                userId={userId}
                onNavigateToWorkQueue={() => setActiveSubTab('inbox')}
              />
            </motion.div>
          )}

          {activeSubTab === 'leads' && (
            <motion.div
              key="subtab-leads"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <LeadsTab
                leads={leads}
                onSelectLead={onSelectLead}
                onOpenNewInquiryModal={onOpenNewInquiryModal}
              />
            </motion.div>
          )}

          {activeSubTab === 'tasks' && (
            <motion.div
              key="subtab-tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <TasksTab
                tasks={tasks}
                leads={leads}
                onToggleTask={onToggleTask}
                onSelectLead={onSelectLead}
              />
            </motion.div>
          )}

          {activeSubTab === 'activity' && (
            <motion.div
              key="subtab-activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <ActivityTab activities={activities} onClearActivity={onClearActivity} />
            </motion.div>
          )}

          {activeSubTab === 'settings' && (
            <motion.div
              key="subtab-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <SettingsTab
                companyProfile={companyProfile}
                onUpdateCompanyProfile={onUpdateCompanyProfile}
                onResetDefaultData={onResetDefaultData || onResetDemoData}
                onResetDemoData={onResetDemoData}
                onSignOutRedirect={onSignOutRedirect}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <EmployeeOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        roleId="sales_coordinator"
        onSaved={(profile) => setOnboardingProfile(profile)}
      />
    </div>
  );
};
