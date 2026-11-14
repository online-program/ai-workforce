import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { adminService, AdminRole, AdminPermission } from '../services/adminService.ts';

// Authority Hierarchy Ranks (1 = Highest, 7 = Lowest)
export const ROLE_RANKS: Record<AdminRole, number> = {
  CEO: 1,
  SUPER_ADMIN: 2,
  ADMIN: 3,
  CMO: 4,
  SUPPORT_ADMIN: 5,
  ANALYST: 6,
  USER: 7,
};

// Canonical Permission Matrix by Role
export const ROLE_PERMISSIONS_MAP: Record<AdminRole, Record<string, boolean>> = {
  CEO: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': true,
    'admin.companies.view': true,
    'admin.companies.manage': true,
    'admin.widgets.view': true,
    'admin.widgets.manage': true,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': true,
    'admin.system_health.view': true,
    'admin.security.view': true,
    'admin.security.manage': true,
    'admin.audit_logs.view': true,
    'admin.team.view': true,
    'admin.team.invite': true,
    'admin.team.role_change': true,
    'admin.team.dismiss': true,
    'admin.billing.view': true,
    'admin.platform_settings.manage': true,
    'admin.ceo.manage': true,
    'admin.super_admin.manage': true,
    // Legacy support flags
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: true,
    canViewHealth: true,
    canViewSecurity: true,
    canViewAuditLogs: true,
    canManageAdmins: true,
    canPerformDestructive: true,
    canConfigurePlatform: true,
  },
  SUPER_ADMIN: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': true,
    'admin.companies.view': true,
    'admin.companies.manage': true,
    'admin.widgets.view': true,
    'admin.widgets.manage': true,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': true,
    'admin.system_health.view': true,
    'admin.security.view': true,
    'admin.security.manage': true,
    'admin.audit_logs.view': true,
    'admin.team.view': true,
    'admin.team.invite': true,
    'admin.team.role_change': true,
    'admin.team.dismiss': true,
    'admin.billing.view': true,
    'admin.platform_settings.manage': true,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': true,
    // Legacy flags
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: true,
    canViewHealth: true,
    canViewSecurity: true,
    canViewAuditLogs: true,
    canManageAdmins: true,
    canPerformDestructive: true,
    canConfigurePlatform: true,
  },
  ADMIN: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': true,
    'admin.companies.view': true,
    'admin.companies.manage': true,
    'admin.widgets.view': true,
    'admin.widgets.manage': true,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': false,
    'admin.system_health.view': true,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': true,
    'admin.team.view': true,
    'admin.team.invite': true,
    'admin.team.role_change': true,
    'admin.team.dismiss': true,
    'admin.billing.view': true,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy flags
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: true,
    canViewHealth: true,
    canViewSecurity: false,
    canViewAuditLogs: true,
    canManageAdmins: true,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  CMO: {
    'admin.dashboard.view': true,
    'admin.users.view': false,
    'admin.users.manage': false,
    'admin.companies.view': true,
    'admin.companies.manage': false,
    'admin.widgets.view': true,
    'admin.widgets.manage': false,
    'admin.conversations.view': false,
    'admin.conversations.manage': false,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': false,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': true,
    'admin.system_health.view': false,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy flags
    canViewAnalytics: true,
    canViewLiveActivity: false,
    canViewUsers: false,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: false,
    canViewInquiries: true,
    canViewErrors: false,
    canViewHealth: false,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  SUPPORT_ADMIN: {
    'admin.dashboard.view': true,
    'admin.users.view': true,
    'admin.users.manage': false,
    'admin.companies.view': true,
    'admin.companies.manage': false,
    'admin.widgets.view': true,
    'admin.widgets.manage': false,
    'admin.conversations.view': true,
    'admin.conversations.manage': true,
    'admin.inquiries.view': true,
    'admin.inquiries.manage': true,
    'admin.analytics.view': false,
    'admin.marketing.view': false,
    'admin.marketing.manage': false,
    'admin.system_health.view': false,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy flags
    canViewAnalytics: false,
    canViewLiveActivity: true,
    canViewUsers: true,
    canViewCompanies: true,
    canViewWidgets: true,
    canViewConversations: true,
    canViewInquiries: true,
    canViewErrors: false,
    canViewHealth: false,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  ANALYST: {
    'admin.dashboard.view': true,
    'admin.users.view': false,
    'admin.users.manage': false,
    'admin.companies.view': false,
    'admin.companies.manage': false,
    'admin.widgets.view': false,
    'admin.widgets.manage': false,
    'admin.conversations.view': false,
    'admin.conversations.manage': false,
    'admin.inquiries.view': false,
    'admin.inquiries.manage': false,
    'admin.analytics.view': true,
    'admin.marketing.view': true,
    'admin.marketing.manage': false,
    'admin.system_health.view': true,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy flags
    canViewAnalytics: true,
    canViewLiveActivity: true,
    canViewUsers: false,
    canViewCompanies: false,
    canViewWidgets: false,
    canViewConversations: false,
    canViewInquiries: false,
    canViewErrors: false,
    canViewHealth: true,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
  USER: {
    'admin.dashboard.view': false,
    'admin.users.view': false,
    'admin.users.manage': false,
    'admin.companies.view': false,
    'admin.companies.manage': false,
    'admin.widgets.view': false,
    'admin.widgets.manage': false,
    'admin.conversations.view': false,
    'admin.conversations.manage': false,
    'admin.inquiries.view': false,
    'admin.inquiries.manage': false,
    'admin.analytics.view': false,
    'admin.marketing.view': false,
    'admin.marketing.manage': false,
    'admin.system_health.view': false,
    'admin.security.view': false,
    'admin.security.manage': false,
    'admin.audit_logs.view': false,
    'admin.team.view': false,
    'admin.team.invite': false,
    'admin.team.role_change': false,
    'admin.team.dismiss': false,
    'admin.billing.view': false,
    'admin.platform_settings.manage': false,
    'admin.ceo.manage': false,
    'admin.super_admin.manage': false,
    // Legacy flags
    canViewAnalytics: false,
    canViewLiveActivity: false,
    canViewUsers: false,
    canViewCompanies: false,
    canViewWidgets: false,
    canViewConversations: false,
    canViewInquiries: false,
    canViewErrors: false,
    canViewHealth: false,
    canViewSecurity: false,
    canViewAuditLogs: false,
    canManageAdmins: false,
    canPerformDestructive: false,
    canConfigurePlatform: false,
  },
};

// Global state for CEO testing preview mode
let globalPreviewRole: AdminRole | null = null;
const previewListeners = new Set<(role: AdminRole | null) => void>();

export function setGlobalPreviewRole(role: AdminRole | null) {
  globalPreviewRole = role;
  previewListeners.forEach((listener) => listener(role));
}

export interface UsePermissionsReturn {
  // Current real authoritative role from backend
  actualRole: AdminRole;
  // Active role being evaluated (actualRole or previewRole if CEO is testing)
  role: AdminRole;
  // Permission lookup helper
  can: (permission: AdminPermission | string) => boolean;
  // Role equality helper
  isRole: (role: AdminRole) => boolean;
  // Role membership helper
  hasAnyRole: (roles: AdminRole[]) => boolean;
  // Minimum authority rank helper (e.g. hasMinRank('ADMIN') is true for CEO, SUPER_ADMIN, ADMIN)
  hasMinRank: (minRole: AdminRole) => boolean;
  // Hierarchy check
  canActOn: (targetRole: AdminRole) => boolean;
  // Flags
  isCeo: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canAccessAdminCenter: boolean;
  isLoading: boolean;
  // Full permission map
  permissions: Record<string, boolean>;
  // CEO Preview Mode controls
  previewRole: AdminRole | null;
  setPreviewRole: (role: AdminRole | null) => void;
  clearPreviewRole: () => void;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [actualRole, setActualRole] = useState<AdminRole>('USER');
  const [backendPermissions, setBackendPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [previewRole, setLocalPreviewRole] = useState<AdminRole | null>(globalPreviewRole);

  // Sync with global preview role changes
  useEffect(() => {
    const handlePreviewChange = (newRole: AdminRole | null) => {
      setLocalPreviewRole(newRole);
    };
    previewListeners.add(handlePreviewChange);
    return () => {
      previewListeners.delete(handlePreviewChange);
    };
  }, []);

  const fetchRoleAndPermissions = useCallback(async () => {
    if (!user) {
      setActualRole('USER');
      setBackendPermissions({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await adminService.verifyAdminAuth();
      if (res && res.success && res.user) {
        setActualRole(res.user.role);
        setBackendPermissions(res.permissions || {});
      } else {
        setActualRole('USER');
        setBackendPermissions({});
      }
    } catch {
      // Non-admin users or auth failures default to USER
      setActualRole('USER');
      setBackendPermissions({});
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoleAndPermissions();
  }, [fetchRoleAndPermissions]);

  // If real user is CEO and previewRole is set, evaluate effective role
  const effectiveRole = useMemo<AdminRole>(() => {
    if (actualRole === 'CEO' && previewRole) {
      return previewRole;
    }
    return actualRole;
  }, [actualRole, previewRole]);

  // Compute permissions for effective role
  const permissions = useMemo(() => {
    if (previewRole && actualRole === 'CEO') {
      return ROLE_PERMISSIONS_MAP[previewRole] || ROLE_PERMISSIONS_MAP.USER;
    }
    return {
      ...(ROLE_PERMISSIONS_MAP[actualRole] || ROLE_PERMISSIONS_MAP.USER),
      ...backendPermissions,
    };
  }, [actualRole, previewRole, backendPermissions]);

  const can = useCallback(
    (permission: AdminPermission | string): boolean => {
      return permissions[permission] === true;
    },
    [permissions]
  );

  const isRole = useCallback(
    (targetRole: AdminRole): boolean => {
      return effectiveRole === targetRole;
    },
    [effectiveRole]
  );

  const hasAnyRole = useCallback(
    (roles: AdminRole[]): boolean => {
      return roles.includes(effectiveRole);
    },
    [effectiveRole]
  );

  const hasMinRank = useCallback(
    (minRole: AdminRole): boolean => {
      const userRank = ROLE_RANKS[effectiveRole] || 7;
      const targetRank = ROLE_RANKS[minRole] || 7;
      return userRank <= targetRank;
    },
    [effectiveRole]
  );

  const canActOn = useCallback(
    (targetRole: AdminRole): boolean => {
      if (effectiveRole === 'CEO') return true;
      const userRank = ROLE_RANKS[effectiveRole] || 7;
      const targetRank = ROLE_RANKS[targetRole] || 7;
      return userRank < targetRank;
    },
    [effectiveRole]
  );

  const setPreview = useCallback(
    (newPreview: AdminRole | null) => {
      if (actualRole === 'CEO') {
        setGlobalPreviewRole(newPreview);
      }
    },
    [actualRole]
  );

  const clearPreview = useCallback(() => {
    setGlobalPreviewRole(null);
  }, []);

  return {
    actualRole,
    role: effectiveRole,
    can,
    isRole,
    hasAnyRole,
    hasMinRank,
    canActOn,
    isCeo: effectiveRole === 'CEO',
    isSuperAdmin: effectiveRole === 'SUPER_ADMIN',
    isAdmin: ['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(effectiveRole),
    canAccessAdminCenter: effectiveRole !== 'USER',
    isLoading,
    permissions,
    previewRole: actualRole === 'CEO' ? previewRole : null,
    setPreviewRole: setPreview,
    clearPreviewRole: clearPreview,
    refreshPermissions: fetchRoleAndPermissions,
  };
}
