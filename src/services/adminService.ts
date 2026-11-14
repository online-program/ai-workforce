import { auth } from '../firebase.ts';

// Get current Firebase ID Token with automatic caching/refresh
async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      headers['Authorization'] = `Bearer ${idToken}`;
      headers['x-admin-token'] = idToken;
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID token:', e);
    }
  }

  return headers;
}

export type AdminRole = 'CEO' | 'SUPER_ADMIN' | 'ADMIN' | 'CMO' | 'SUPPORT_ADMIN' | 'ANALYST' | 'USER';
export type AdminPermission = string;

export interface AdminAuthVerifyResponse {
  success: boolean;
  user: {
    uid: string;
    email: string;
    role: AdminRole;
    emailVerified: boolean;
  };
  permissions: {
    canViewAnalytics: boolean;
    canViewCompanies: boolean;
    canViewUsers: boolean;
    canViewWidgets: boolean;
    canViewConversations: boolean;
    canViewInquiries: boolean;
    canViewErrors: boolean;
    canViewHealth: boolean;
    canViewSecurity: boolean;
    canViewAuditLogs: boolean;
    canManageAdmins: boolean;
    canPerformDestructive: boolean;
    canConfigurePlatform: boolean;
    canViewLiveActivity: boolean;
    [key: string]: boolean | undefined;
  };
  error?: string;
}

export const adminService = {
  // 1. Verify admin role & permissions
  async verifyAdminAuth(): Promise<AdminAuthVerifyResponse> {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/auth/verify', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Admin authentication failed (${res.status})`);
    }
    return res.json();
  },

  // 2. Fetch Overview metrics
  async getOverview(timeRange: 'today' | '7d' | '30d' | 'all' = '7d') {
    const headers = await getAdminAuthHeaders();
    const res = await fetch(`/api/admin/overview?timeRange=${timeRange}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch overview data');
    }
    return res.json();
  },

  // 3. Live activity feed
  async getLiveActivity(limit = 50, type?: string, widgetId?: string) {
    const headers = await getAdminAuthHeaders();
    const params = new URLSearchParams({ limit: String(limit) });
    if (type) params.append('type', type);
    if (widgetId) params.append('widgetId', widgetId);

    const res = await fetch(`/api/admin/live-activity?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch live activity');
    }
    return res.json();
  },

  // 4. Visitors explorer
  async getVisitors(params: { limit?: number; search?: string; widgetId?: string; companyName?: string; inquiryOnly?: boolean } = {}) {
    const headers = await getAdminAuthHeaders();
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.widgetId) query.append('widgetId', params.widgetId);
    if (params.companyName) query.append('companyName', params.companyName);
    if (params.inquiryOnly) query.append('inquiryOnly', 'true');

    const res = await fetch(`/api/admin/visitors?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch visitors');
    }
    return res.json();
  },

  // 5. Users directory
  async getUsers() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/users', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch users');
    }
    return res.json();
  },

  // 6. Companies directory
  async getCompanies() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/companies', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch companies');
    }
    return res.json();
  },

  // 7. Widgets list
  async getWidgets() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/widgets', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch widgets');
    }
    return res.json();
  },

  // 8. Conversations list
  async getConversations(search?: string) {
    const headers = await getAdminAuthHeaders();
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/admin/conversations${query}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch conversations');
    }
    return res.json();
  },

  // 9. Inquiries list
  async getInquiries() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/inquiries', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch inquiries');
    }
    return res.json();
  },

  // 10. System Errors
  async getErrors(limit = 50, service?: string, severity?: string) {
    const headers = await getAdminAuthHeaders();
    const query = new URLSearchParams({ limit: String(limit) });
    if (service) query.append('service', service);
    if (severity) query.append('severity', severity);

    const res = await fetch(`/api/admin/errors?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch errors');
    }
    return res.json();
  },

  // 11. System Health
  async getHealth() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/health', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch health report');
    }
    return res.json();
  },

  async runDiagnostics() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/health/diagnostics', {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to run diagnostics');
    }
    return res.json();
  },

  // 12. Security events
  async getSecurityEvents(limit = 50, severity?: string, type?: string) {
    const headers = await getAdminAuthHeaders();
    const query = new URLSearchParams({ limit: String(limit) });
    if (severity) query.append('severity', severity);
    if (type) query.append('type', type);

    const res = await fetch(`/api/admin/security?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch security events');
    }
    return res.json();
  },

  // 13. Audit logs
  async getAuditLogs(limit = 100, action?: string, adminEmail?: string, targetResource?: string) {
    const headers = await getAdminAuthHeaders();
    const query = new URLSearchParams({ limit: String(limit) });
    if (action) query.append('action', action);
    if (adminEmail) query.append('adminEmail', adminEmail);
    if (targetResource) query.append('targetResource', targetResource);

    const res = await fetch(`/api/admin/audit-logs?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch audit logs');
    }
    return res.json();
  },

  // 14. Admin Team & Invitations
  async getMyInvitations() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/my-invitations', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      return { success: true, invitations: [] };
    }
    return res.json();
  },

  async acceptInvitation(invitationId: string) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/invitations/accept', {
      method: 'POST',
      headers,
      body: JSON.stringify({ invitationId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to accept invitation');
    }
    return data;
  },

  async rejectInvitation(invitationId: string) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/invitations/reject', {
      method: 'POST',
      headers,
      body: JSON.stringify({ invitationId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to reject invitation');
    }
    return data;
  },

  async getTeam() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch admin team');
    }
    return res.json();
  },

  async getInvitations() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/assignments', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch admin assignments');
    }
    return res.json();
  },

  async getAssignments() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/assignments', {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch admin assignments');
    }
    return res.json();
  },

  async getCandidates(search?: string) {
    const headers = await getAdminAuthHeaders();
    const query = new URLSearchParams();
    if (search) query.append('q', search);

    const res = await fetch(`/api/admin/team/candidates?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch candidate users');
    }
    return res.json();
  },

  async inviteAdmin(payload: { email: string; role: string; displayName?: string; confirmationCode?: string; notes?: string }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/add', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add team member');
    }
    return data;
  },

  async cancelAssignment(payload: { assignmentId: string }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/assignments/cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to cancel assignment');
    }
    return data;
  },

  async revokeInvitation(payload: { invitationId: string }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/assignments/cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ assignmentId: payload.invitationId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to revoke assignment');
    }
    return data;
  },

  async assignRole(payload: { targetUid?: string; targetEmail: string; newRole: string; displayName?: string; confirmationCode?: string; notes?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/assign-role', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to assign admin role');
    }
    return data;
  },

  async updateMemberStatus(payload: { targetUid?: string; targetEmail: string; status: 'ACTIVE' | 'SUSPENDED' }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/member-status', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update member status');
    }
    return data;
  },

  async revokeRole(payload: { targetUid?: string; targetEmail?: string; confirmationText?: string }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/team/revoke', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to revoke admin role');
    }
    return data;
  },

  // 15. Destructive Operations (SUPER_ADMIN)
  async executeDestructiveAction(payload: { actionType: string; targetId: string; confirmationText: string }) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/destructive/execute', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Destructive action was rejected or failed');
    }
    return data;
  },

  // ==========================================
  // 16. CEO-ONLY INTELLIGENCE CENTER METHODS
  // ==========================================

  async getCeoIntelligence(timeRange: 'today' | '7d' | '30d' | 'all' = '7d') {
    const headers = await getAdminAuthHeaders();
    const res = await fetch(`/api/admin/ceo/intelligence?timeRange=${timeRange}`, {
      method: 'GET',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch CEO Intelligence data');
    }
    return data;
  },

  async getCeoUserDetail(userId: string) {
    const headers = await getAdminAuthHeaders();
    const res = await fetch(`/api/admin/ceo/user-detail/${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch user detail profile');
    }
    return data;
  },

  async getCeoConversationInsights() {
    const headers = await getAdminAuthHeaders();
    const res = await fetch('/api/admin/ceo/conversation-insights', {
      method: 'GET',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch conversation insights');
    }
    return data;
  },
};
