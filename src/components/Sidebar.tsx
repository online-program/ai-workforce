import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Inbox,
  Activity,
  BrainCircuit,
  Sliders,
  Code,
  Settings,
  ArrowLeft,
  LogOut,
  Globe,
  Shield,
  Eye,
} from 'lucide-react';
import { WorkspaceTab } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { Logo } from './Logo.tsx';
import { ThemeToggle } from '../context/ThemeContext.tsx';

interface SidebarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenHireModal: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenAdminCenter?: () => void;
  onBackToLanding: () => void;
  onOpenWidgetPreview?: () => void;
  inquiriesCount: number;
  attentionCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenHireModal,
  onOpenShortcutsModal,
  onOpenAdminCenter,
  onBackToLanding,
  onOpenWidgetPreview,
  inquiriesCount,
  attentionCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { canAccessAdminCenter } = usePermissions();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      onBackToLanding();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    shortcutKey?: string;
    badgeCount?: number;
    badgeLabel?: string;
  }[] = [
    {
      id: 'workspace_home',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      shortcutKey: 'O',
    },
    {
      id: 'employees',
      label: 'Alpha Command',
      icon: <Sparkles className="w-4 h-4" />,
      shortcutKey: 'A',
    },
    {
      id: 'conversations',
      label: 'Conversations',
      icon: <MessageSquare className="w-4 h-4" />,
      shortcutKey: 'C',
    },
    {
      id: 'work_queue',
      label: 'Leads & Inquiries',
      icon: <Inbox className="w-4 h-4" />,
      badgeCount: attentionCount > 0 ? attentionCount : inquiriesCount > 0 ? inquiriesCount : undefined,
      shortcutKey: 'L',
    },
    {
      id: 'company_brain',
      label: 'Company Brain',
      icon: <BrainCircuit className="w-4 h-4" />,
      shortcutKey: 'B',
    },
    {
      id: 'widget_studio',
      label: 'Widget Studio',
      icon: <Sliders className="w-4 h-4" />,
      shortcutKey: 'W',
    },
    {
      id: 'embed',
      label: 'Install / Embed',
      icon: <Code className="w-4 h-4" />,
      shortcutKey: 'E',
    },
    {
      id: 'activity',
      label: 'Live Activity',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      shortcutKey: 'S',
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#09090B] border-r border-neutral-200/80 dark:border-neutral-800/80 flex flex-col justify-between h-screen sticky top-0 shadow-xs transition-colors duration-200">
      <div className="overflow-y-auto">
        {/* Workspace Brand Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <Logo size="sm" showText={true} />
          <ThemeToggle variant="icon" />
        </div>

        {/* Primary Navigation */}
        <nav className="p-3 space-y-1 text-sm">
          <div className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Workspace</span>
            <span className="text-[9px] font-mono text-neutral-400">AI Workforce</span>
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                onClick={() => onSelectTab(item.id)}
                className={`w-full relative flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer group ${
                  isActive
                    ? 'text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-900 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className="absolute left-0 inset-y-1.5 w-1 rounded-r-full bg-neutral-950 dark:bg-white"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`${
                      isActive
                        ? 'text-neutral-950 dark:text-white'
                        : 'text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badgeCount !== undefined && (
                    <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400">
                      {item.badgeCount}
                    </span>
                  )}
                  {item.shortcutKey && (
                    <kbd className="hidden group-hover:inline-flex items-center justify-center w-4 h-4 text-[9px] font-mono font-bold rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                      {item.shortcutKey}
                    </kbd>
                  )}
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Live Widget Test Trigger */}
        {onOpenWidgetPreview && (
          <div className="px-3 pt-2">
            <button
              type="button"
              onClick={onOpenWidgetPreview}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-50 dark:bg-neutral-900/60 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Test Chat Widget</span>
              </div>
              <Eye className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls & User Account */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
        {canAccessAdminCenter && onOpenAdminCenter && (
          <button
            onClick={onOpenAdminCenter}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-neutral-500" />
            <span>Admin Center</span>
          </button>
        )}

        {/* Exit to Landing Page Button */}
        <button
          onClick={onBackToLanding}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-950 dark:hover:text-white border border-neutral-200/80 dark:border-neutral-800/80 transition-colors cursor-pointer group"
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors" />
            <span>Exit to Landing Page</span>
          </div>
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-400 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-mono font-bold text-[10px]">
              {user?.email ? user.email[0].toUpperCase() : 'W'}
            </div>
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[110px]">
              {user?.email || 'Executive'}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
