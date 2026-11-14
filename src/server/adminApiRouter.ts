import { Router, Response } from 'express';
import {
  requireAdminRole,
  AuthenticatedAdminRequest,
  getAuthoritativeUserRole,
  assignAdminRole,
  revokeAdminAccess,
  getAllAdminUsers,
  createAdminInvitation,
  getAdminInvitations,
  getPendingInvitationsForEmail,
  revokeAdminInvitation,
  acceptAdminInvitation,
  rejectAdminInvitation,
  createOrUpdateAdminAssignment,
  getAdminAssignments,
  cancelAdminAssignment,
  AdminAssignmentRecord,
  ROLE_PERMISSIONS,
  ROLE_RANK,
  canActOnTargetRole,
  canInviteRole,
  verifyFirebaseIdToken,
  AdminRole,
} from './adminAuth.ts';
import {
  recordAuditLog,
  recordSecurityEvent,
  getAuditLogs,
  getDurableAuditLogs,
  getSecurityEvents,
  getDurableSecurityEvents,
  getSystemErrors,
  getLiveActivityStream,
} from './adminAuditService.ts';
import {
  getVisitorSessions,
  computeAnalyticsMetrics,
  getTimeSeriesChartData,
} from './analyticsService.ts';
import { runSystemDiagnostics } from './systemHealthService.ts';
import { getAllPublicWidgetsList } from './widgetHandler.ts';
import { validateEmailAddress, dispatchEmailViaProvider } from './emailService.ts';
import {
  getMarketingBrain,
  updateMarketingBrain,
  getResearchItems,
  runOpportunityResearch,
  deleteResearchItem,
  getContentItems,
  generateContentInStudio,
  updateContentItem,
  changeContentStatus,
  deleteContentItem,
  getPublishingConnections,
  getPublishingSettings,
  updatePublishingSettings,
  connectPublishingChannel,
  executePublishContent,
  executeScheduleContent,
  getMarketingAnalytics,
  getMarketingAuditLogs,
} from './marketingService.ts';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import { isReservedOfficialWidgetId } from './platformConfig.ts';
import { getCeoIntelligenceData, getCeoUserDetailData, getCeoConversationInsightsData } from './ceoIntelligenceHandler.ts';
import { getAdminModelUsageAnalytics, getProviderStatuses } from './providers/modelRegistry.ts';
import { getTenantHandoffs, assignHandoffToUser } from './humanHandoffManager.ts';
import { updateHandoffWorkflowStatus, memoryHandoffStore } from './durableHandoffService.ts';
import { normalizeToBrainV2 } from './companyBrainV2.ts';

export const adminRouter = Router();

// CEO-Only Authorization Middleware
export function requireCeoRole() {
  return async (req: AuthenticatedAdminRequest, res: Response, next: any) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (req.admin.role !== 'CEO') {
      recordSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        sourceIp: req.ip || req.socket.remoteAddress || 'unknown',
        endpoint: req.path,
        details: { adminEmail: req.admin.email, adminRole: req.admin.role, message: 'Non-CEO admin attempted to access CEO intelligence center' },
      });
      return res.status(403).json({
        success: false,
        error: `Forbidden: This CEO Intelligence Center is strictly restricted to the CEO role. Your role is '${req.admin.role}'.`,
        code: 'CEO_ONLY_REQUIRED',
      });
    }
    next();
  };
}

// Helper to extract bearer token
function extractToken(req: any): string {
  const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) return authHeader.substring(7).trim();
    return authHeader.trim();
  }
  return '';
}

// 0. General Authenticated User: Check if current user has any pending invitations
adminRouter.get('/my-invitations', async (req: any, res: Response) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.json({ success: true, invitations: [] });
    }
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.email) {
      return res.json({ success: true, invitations: [] });
    }
    const invitations = getPendingInvitationsForEmail(verified.email);
    return res.json({
      success: true,
      invitations,
      email: verified.email,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to check invitations' });
  }
});

// 0b. General Authenticated User: Accept pending invitation
adminRouter.post('/invitations/accept', async (req: any, res: Response) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid || !verified.email) {
      return res.status(401).json({ success: false, error: 'Invalid authentication token' });
    }

    const { invitationId } = req.body;
    if (!invitationId) {
      return res.status(400).json({ success: false, error: 'invitationId is required' });
    }

    const adminRecord = await acceptAdminInvitation({
      invitationId,
      userUid: verified.uid,
      userEmail: verified.email,
    });

    recordAuditLog({
      adminUid: adminRecord.uid,
      adminEmail: adminRecord.email,
      adminRole: adminRecord.role,
      action: 'ACCEPT_ADMIN_INVITATION',
      targetResource: `INVITATION:${invitationId}`,
      targetId: invitationId,
      result: 'SUCCESS',
      details: { role: adminRecord.role },
    });

    return res.json({
      success: true,
      message: `Congratulations! You have joined the AI Workforce admin team as ${adminRecord.role}.`,
      admin: adminRecord,
      permissions: ROLE_PERMISSIONS[adminRecord.role],
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to accept invitation' });
  }
});

// 0c. General Authenticated User: Reject pending invitation
adminRouter.post('/invitations/reject', async (req: any, res: Response) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const verified = await verifyFirebaseIdToken(token);
    if (!verified || !verified.uid || !verified.email) {
      return res.status(401).json({ success: false, error: 'Invalid authentication token' });
    }

    const { invitationId } = req.body;
    if (!invitationId) {
      return res.status(400).json({ success: false, error: 'invitationId is required' });
    }

    await rejectAdminInvitation({
      invitationId,
      userUid: verified.uid,
      userEmail: verified.email,
    });

    return res.json({
      success: true,
      message: 'Invitation declined.',
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to reject invitation' });
  }
});

// 1. Auth Verify: Validates ID token and returns current user's role and permission matrix
adminRouter.get('/auth/verify', requireAdminRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  const admin = req.admin!;
  const permissions = ROLE_PERMISSIONS[admin.role];

  // Record audit log for admin verification/login
  recordAuditLog({
    adminUid: admin.uid,
    adminEmail: admin.email,
    adminRole: admin.role,
    action: 'ADMIN_SESSION_VERIFIED',
    targetResource: 'ADMIN_CONTROL_CENTER',
    result: 'SUCCESS',
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
  });

  return res.json({
    success: true,
    user: {
      uid: admin.uid,
      email: admin.email,
      role: admin.role,
      emailVerified: admin.emailVerified,
    },
    permissions,
  });
});

// 2. Overview Metrics & Charts
adminRouter.get('/overview', requireAdminRole('canViewAnalytics'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as 'today' | '7d' | '30d' | 'all') || '7d';

    const widgets = await getAllPublicWidgetsList().catch(() => []);
    let totalUsers = 0;
    let totalConversations = 0;
    let totalInquiries = 0;
    let metricsUnavailable = !hasAdminCredentials();

    if (hasAdminCredentials()) {
      try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        totalUsers = usersSnap.size;
        for (const uDoc of usersSnap.docs) {
          const [convSnap, inqSnap] = await Promise.all([
            db.collection('users').doc(uDoc.id).collection('conversations').get().catch(() => null),
            db.collection('users').doc(uDoc.id).collection('inquiries').get().catch(() => null),
          ]);
          if (convSnap) totalConversations += convSnap.size;
          if (inqSnap) totalInquiries += inqSnap.size;
        }
      } catch (dbErr: any) {
        console.error('[AdminRouter] Overview DB query failed:', dbErr?.message || dbErr);
        metricsUnavailable = true;
      }
    }

    const metrics = computeAnalyticsMetrics({
      totalUsers,
      totalCompanies: widgets.length,
      totalWidgets: widgets.length,
      totalConversations,
      totalInquiries,
      timeRange,
      metricsUnavailable,
    });

    const chartData = getTimeSeriesChartData(timeRange === 'all' ? '30d' : timeRange);

    return res.json({
      success: true,
      metrics,
      chartData,
      timeRange,
      dataAvailable: !metricsUnavailable,
    });
  } catch (err: any) {
    console.error('Error fetching admin overview:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to compute overview' });
  }
});

// 3. Live Activity Stream
adminRouter.get('/live-activity', requireAdminRole('canViewLiveActivity'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const type = req.query.type as string | undefined;
  const widgetId = req.query.widgetId as string | undefined;

  const activities = getLiveActivityStream({ limit, type, widgetId });

  return res.json({
    success: true,
    activities,
  });
});

// 4. Visitors Explorer
adminRouter.get('/visitors', requireAdminRole('canViewAnalytics'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const search = req.query.search as string | undefined;
  const widgetId = req.query.widgetId as string | undefined;
  const companyName = req.query.companyName as string | undefined;
  const inquiryOnly = req.query.inquiryOnly === 'true';

  const visitors = getVisitorSessions({ limit, search, widgetId, companyName, inquiryOnly });

  return res.json({
    success: true,
    visitors,
    count: visitors.length,
  });
});

// 5. Registered Platform Users
adminRouter.get('/users', requireAdminRole('canViewUsers'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const usersList: any[] = [];
    let dataAvailable = false;

    if (hasAdminCredentials()) {
      try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        dataAvailable = true;

        for (const userDoc of usersSnap.docs) {
          const uid = userDoc.id;
          const data = userDoc.data();

          const [inqSnap, leadsSnap] = await Promise.all([
            db.collection('users').doc(uid).collection('inquiries').get().catch(() => null),
            db.collection('users').doc(uid).collection('leads').get().catch(() => null),
          ]);

          usersList.push({
            uid,
            email: data.email || data.user_email || '',
            createdAt: data.created_at || null,
            lastActiveAt: data.last_active_at || data.updated_at || null,
            inquiriesCount: inqSnap ? inqSnap.size : 0,
            leadsCount: leadsSnap ? leadsSnap.size : 0,
            onboardingCompleted: data.onboarding_completed === true,
          });
        }
      } catch (dbErr: any) {
        const msg = String(dbErr?.message || '');
        const isPermOrUnavail = dbErr?.code === 7 || dbErr?.code === 14 || msg.includes('PERMISSION_DENIED') || msg.includes('UNAVAILABLE');
        if (!isPermOrUnavail) throw dbErr;
        dataAvailable = false;
      }
    }

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_USERS_LIST',
      targetResource: 'USERS_COLLECTION',
      result: 'SUCCESS',
    });

    return res.json({
      success: true,
      dataAvailable,
      users: usersList,
      totalCount: usersList.length,
    });
  } catch (err: any) {
    console.error('Error fetching admin users:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list users' });
  }
});

// 6. Companies & Tenants
adminRouter.get('/companies', requireAdminRole('canViewCompanies'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const widgets = await getAllPublicWidgetsList().catch(() => []);
    const companies: any[] = [];

    widgets.forEach((w) => {
      companies.push({
        id: `comp_${w.widget_id}`,
        widgetId: w.widget_id,
        userId: w.user_id || null,
        name: w.business_name,
        industry: w.company_profile?.industry || w.public_summary?.industry || 'Unspecified',
        businessType: w.company_profile?.businessType || w.public_summary?.businessType || 'Unspecified',
        status: w.is_active ? 'ACTIVE' : 'INACTIVE',
        offeringsCount: Array.isArray(w.company_profile?.offerings) ? w.company_profile.offerings.length : 0,
        hasBrainConfigured: Boolean(w.company_profile?.name && w.company_profile?.name !== 'My Business'),
        rulesConfigured: Boolean(w.company_profile?.businessRules),
        themeColor: w.theme_color,
        designStyle: w.design_style || 'attractive_3d',
      });
    });

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_COMPANIES_LIST',
      targetResource: 'COMPANIES_DIRECTORY',
      result: 'SUCCESS',
    });

    return res.json({
      success: true,
      companies,
      totalCount: companies.length,
    });
  } catch (err: any) {
    console.error('Error fetching admin companies:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list companies' });
  }
});

// 7. Widgets Inventory
adminRouter.get('/widgets', requireAdminRole('canViewWidgets'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const widgets = await getAllPublicWidgetsList().catch(() => []);

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_WIDGETS_LIST',
      targetResource: 'WIDGETS_INVENTORY',
      result: 'SUCCESS',
    });

    return res.json({
      success: true,
      widgets,
      totalCount: widgets.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to list widgets' });
  }
});

// 8. Conversations Explorer
adminRouter.get('/conversations', requireAdminRole('canViewConversations'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const conversationsList: any[] = [];
    let dataAvailable = false;

    if (hasAdminCredentials()) {
      try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        dataAvailable = true;

        for (const uDoc of usersSnap.docs) {
          const uid = uDoc.id;
          const convSnap = await db.collection('users').doc(uid).collection('conversations').get().catch(() => null);
          if (convSnap) {
            convSnap.forEach((cDoc) => {
              const data = cDoc.data();
              conversationsList.push({
                id: cDoc.id,
                userId: uid,
                widgetId: data.widget_id || null,
                visitorId: data.visitor_id || 'visitor_anon',
                customerName: data.customer_name || 'Website Visitor',
                leadScore: data.lead_score || 'WARM',
                messagesCount: Array.isArray(data.messages) ? data.messages.length : 0,
                lastMessageText:
                  data.last_message ||
                  (Array.isArray(data.messages) && data.messages.length > 0
                    ? data.messages[data.messages.length - 1].text
                    : ''),
                messages: Array.isArray(data.messages) ? data.messages : [],
                updatedAt: data.updated_at || data.created_at || null,
                status: data.status || 'Active',
              });
            });
          }
        }
      } catch (dbErr: any) {
        const msg = String(dbErr?.message || '');
        const isPermOrUnavail = dbErr?.code === 7 || dbErr?.code === 14 || msg.includes('PERMISSION_DENIED') || msg.includes('UNAVAILABLE');
        if (!isPermOrUnavail) throw dbErr;
        dataAvailable = false;
      }
    }

    const filtered = search
      ? conversationsList.filter(
          (c) =>
            c.customerName?.toLowerCase().includes(search) ||
            c.lastMessageText?.toLowerCase().includes(search) ||
            c.widgetId?.toLowerCase().includes(search)
        )
      : conversationsList;

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_CONVERSATIONS_LIST',
      targetResource: 'CONVERSATIONS_DIRECTORY',
      result: 'SUCCESS',
    });

    return res.json({
      success: true,
      dataAvailable,
      conversations: filtered,
      totalCount: filtered.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to list conversations' });
  }
});

// 9. Inquiries Explorer
adminRouter.get('/inquiries', requireAdminRole('canViewInquiries'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const inquiriesList: any[] = [];
    let dataAvailable = false;

    if (hasAdminCredentials()) {
      try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        dataAvailable = true;

        for (const uDoc of usersSnap.docs) {
          const uid = uDoc.id;
          const inqSnap = await db.collection('users').doc(uid).collection('inquiries').get().catch(() => null);
          if (inqSnap) {
            inqSnap.forEach((iDoc) => {
              const data = iDoc.data();
              inquiriesList.push({
                id: iDoc.id,
                userId: uid,
                customerName: data.customer_name || data.companyName || 'Inbound Lead',
                contactInfo: data.contact_info || data.contactName || data.email_recipient || 'Not provided',
                leadScore: data.lead_score || 'WARM',
                productOrService: data.product_or_service || 'General Inquiry',
                quantity: data.quantity || '',
                location: data.location || '',
                status: data.status || 'Needs Approval',
                emailDispatched: data.email_dispatched === true,
                emailStatus: data.email_status || 'pending',
                createdAt: data.created_at || null,
              });
            });
          }
        }
      } catch (dbErr: any) {
        const msg = String(dbErr?.message || '');
        const isPermOrUnavail = dbErr?.code === 7 || dbErr?.code === 14 || msg.includes('PERMISSION_DENIED') || msg.includes('UNAVAILABLE');
        if (!isPermOrUnavail) throw dbErr;
        dataAvailable = false;
      }
    }

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_INQUIRIES_LIST',
      targetResource: 'INQUIRIES_DIRECTORY',
      result: 'SUCCESS',
    });

    return res.json({
      success: true,
      dataAvailable,
      inquiries: inquiriesList,
      totalCount: inquiriesList.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to list inquiries' });
  }
});

// 10. System Errors
adminRouter.get('/errors', requireAdminRole('canViewErrors'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const service = req.query.service as string | undefined;
  const severity = req.query.severity as string | undefined;

  const errors = getSystemErrors({ limit, service, severity });

  return res.json({
    success: true,
    errors,
  });
});

// 11. System Health & Real Diagnostics
adminRouter.get('/health', requireAdminRole('canViewHealth'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const report = await runSystemDiagnostics();
  return res.json({
    success: true,
    report,
  });
});

adminRouter.post('/health/diagnostics', requireAdminRole('canViewHealth'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const report = await runSystemDiagnostics();

  recordAuditLog({
    adminUid: req.admin!.uid,
    adminEmail: req.admin!.email,
    adminRole: req.admin!.role,
    action: 'RAN_SYSTEM_DIAGNOSTICS',
    targetResource: 'SYSTEM_HEALTH',
    result: 'SUCCESS',
  });

  return res.json({
    success: true,
    report,
  });
});

// 12. Security Center
adminRouter.get('/security', requireAdminRole('canViewSecurity'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const severity = req.query.severity as string | undefined;
  const type = req.query.type as string | undefined;

  const { events, durable } = await getDurableSecurityEvents({ limit, severity, type });

  return res.json({
    success: true,
    durable,
    events,
  });
});

// 13. Audit Logs
adminRouter.get('/audit-logs', requireAdminRole('canViewAuditLogs'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const action = req.query.action as string | undefined;
  const adminEmail = req.query.adminEmail as string | undefined;
  const targetResource = req.query.targetResource as string | undefined;

  const { logs, durable } = await getDurableAuditLogs({ limit, action, adminEmail, targetResource });

  return res.json({
    success: true,
    durable,
    logs,
  });
});

// 14. Admin Team Management & Invitations
adminRouter.get('/team', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const team = getAllAdminUsers();
  return res.json({
    success: true,
    team,
  });
});

adminRouter.get('/team/invitations', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const assignments = getAdminAssignments();
  return res.json({
    success: true,
    invitations: assignments,
    assignments,
  });
});

adminRouter.get('/team/assignments', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const assignments = getAdminAssignments();
  return res.json({
    success: true,
    assignments,
  });
});

// Search and list potential candidates from registered users & existing admins
adminRouter.get('/team/candidates', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const search = ((req.query.q as string) || '').trim().toLowerCase();
    const candidateMap = new Map<string, { uid: string; email: string; displayName: string; currentRole: AdminRole; status?: string }>();

    // 1. Gather all existing admins
    const currentAdmins = getAllAdminUsers();
    currentAdmins.forEach((adm) => {
      candidateMap.set(adm.email.toLowerCase(), {
        uid: adm.uid,
        email: adm.email,
        displayName: adm.displayName || adm.email.split('@')[0],
        currentRole: adm.role,
        status: adm.status,
      });
    });

    // 2. Gather registered users from users collection via Admin SDK
    if (hasAdminCredentials()) {
      try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').get();
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const email = (data.email || data.user_email || '').trim().toLowerCase();
          if (email && !candidateMap.has(email)) {
            candidateMap.set(email, {
              uid: docSnap.id,
              email,
              displayName: data.display_name || data.name || email.split('@')[0],
              currentRole: 'USER',
              status: 'ACTIVE',
            });
          }
        });
      } catch {}
    }

    // Filter by search query if provided
    let candidates = Array.from(candidateMap.values());
    if (search) {
      candidates = candidates.filter(
        (c) => c.email.toLowerCase().includes(search) || c.displayName.toLowerCase().includes(search)
      );
    }

    return res.json({
      success: true,
      candidates,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to list candidates' });
  }
});

// Direct email-based admin team member assignment (No email sending or Resend dependency)
async function handleTeamAssignment(req: AuthenticatedAdminRequest, res: Response) {
  try {
    const { email, role, displayName, confirmationCode, notes } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, error: 'email and role are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format. Please enter a valid email.',
      });
    }

    if (role === 'SUPER_ADMIN' && confirmationCode !== 'CONFIRM-SUPERADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Elevated confirmation required: Must provide confirmationCode "CONFIRM-SUPERADMIN" to assign Super Admin.',
      });
    }

    // Role cannot be CEO
    if (role === 'CEO') {
      return res.status(400).json({
        success: false,
        error: 'CEO role cannot be assigned or transferred via team assignment console.',
      });
    }

    // Direct role assignment without transactional email
    const result = await createOrUpdateAdminAssignment({
      email: cleanEmail,
      role: role as AdminRole,
      displayName,
      notes,
      actorUid: req.admin!.uid,
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
    });

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'ADD_TEAM_MEMBER_ASSIGNMENT',
      targetResource: `SYSTEM_ADMIN:${cleanEmail}`,
      targetId: result.assignment.id,
      result: 'SUCCESS',
      details: {
        email: cleanEmail,
        role,
        isImmediate: result.isImmediate,
        status: result.assignment.status,
      },
    });

    return res.json({
      success: true,
      message: result.message,
      assignment: result.assignment,
      invitation: result.assignment, // Backwards compatibility for UI
      isImmediate: result.isImmediate,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to assign team member' });
  }
}

adminRouter.post('/team/invite', requireAdminRole('canManageAdmins'), handleTeamAssignment);
adminRouter.post('/team/add', requireAdminRole('canManageAdmins'), handleTeamAssignment);

async function handleCancelAssignment(req: AuthenticatedAdminRequest, res: Response) {
  try {
    const { invitationId, assignmentId } = req.body;
    const targetId = assignmentId || invitationId;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'assignmentId or invitationId is required' });
    }

    try {
      await cancelAdminAssignment({
        assignmentId: targetId,
        actorUid: req.admin!.uid,
        actorEmail: req.admin!.email,
        actorRole: req.admin!.role,
      });
    } catch (e) {
      // Fallback try legacy revoke if present
      await revokeAdminInvitation({
        invitationId: targetId,
        actorUid: req.admin!.uid,
        actorEmail: req.admin!.email,
        actorRole: req.admin!.role,
      });
    }

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'CANCEL_ADMIN_ASSIGNMENT',
      targetResource: `ASSIGNMENT:${targetId}`,
      targetId,
      result: 'SUCCESS',
    });

    return res.json({
      success: true,
      message: 'Pending assignment cancelled successfully.',
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to cancel assignment' });
  }
}

adminRouter.post('/team/assignments/cancel', requireAdminRole('canManageAdmins'), handleCancelAssignment);
adminRouter.post('/team/invitations/revoke', requireAdminRole('canManageAdmins'), handleCancelAssignment);

adminRouter.post('/team/assign-role', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { targetUid, targetEmail, newRole, displayName, confirmationCode, notes, status } = req.body;

    if (!targetEmail || !newRole) {
      return res.status(400).json({ success: false, error: 'targetEmail and newRole are required' });
    }

    // Role cannot be CEO from assignment console
    if (newRole === 'CEO') {
      return res.status(400).json({
        success: false,
        error: 'CEO role cannot be assigned through the standard management console.',
      });
    }

    // If target role is SUPER_ADMIN, require elevated confirmation
    if (newRole === 'SUPER_ADMIN' && confirmationCode !== 'CONFIRM-SUPERADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Elevated confirmation required: Must provide confirmationCode "CONFIRM-SUPERADMIN" to assign Super Admin privilege.',
      });
    }

    const updated = await assignAdminRole({
      targetUid,
      targetEmail,
      newRole: newRole as AdminRole,
      displayName,
      notes,
      status: status || 'ACTIVE',
      actorUid: req.admin!.uid,
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
    });

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'ASSIGN_ADMIN_ROLE',
      targetResource: `SYSTEM_ADMIN:${targetEmail}`,
      targetId: updated.uid,
      result: 'SUCCESS',
      details: { targetEmail, newRole, status: updated.status },
    });

    return res.json({
      success: true,
      message: 'Role updated successfully.',
      admin: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to assign admin role' });
  }
});

// Update active status (e.g. suspend or reactivate member)
adminRouter.post('/team/member-status', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { targetUid, targetEmail, status } = req.body;

    if (!targetEmail || !status) {
      return res.status(400).json({ success: false, error: 'targetEmail and status are required' });
    }

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be ACTIVE or SUSPENDED' });
    }

    const currentRole = await getAuthoritativeUserRole(targetUid || '', targetEmail);
    if (!canActOnTargetRole(req.admin!.role, currentRole)) {
      return res.status(403).json({
        success: false,
        error: `Permission Denied: Your role (${req.admin!.role}) cannot modify status for ${currentRole}.`,
      });
    }

    const updated = await assignAdminRole({
      targetUid,
      targetEmail,
      newRole: currentRole,
      status,
      actorUid: req.admin!.uid,
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
    });

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: status === 'SUSPENDED' ? 'SUSPEND_ADMIN_MEMBER' : 'REACTIVATE_ADMIN_MEMBER',
      targetResource: `SYSTEM_ADMIN:${targetEmail}`,
      targetId: updated.uid,
      result: 'SUCCESS',
      details: { targetEmail, newStatus: status },
    });

    return res.json({
      success: true,
      message: `Member ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'} successfully.`,
      admin: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update member status' });
  }
});

adminRouter.post('/team/revoke', requireAdminRole('canManageAdmins'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { targetUid, targetEmail } = req.body;

    if (!targetUid && !targetEmail) {
      return res.status(400).json({ success: false, error: 'targetUid or targetEmail is required' });
    }

    if (targetUid === req.admin!.uid || (targetEmail && targetEmail.toLowerCase() === req.admin!.email.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Cannot dismiss your own active admin account.' });
    }

    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    const targetRole = await getAuthoritativeUserRole(targetUid || '', cleanEmail);
    if (targetRole === 'CEO') {
      return res.status(403).json({ success: false, error: 'Platform CEO account cannot be dismissed.' });
    }

    await revokeAdminAccess({
      targetUid: targetUid || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      actorUid: req.admin!.uid,
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
    });

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'DISMISS_ADMIN_MEMBER',
      targetResource: `SYSTEM_ADMIN:${targetEmail || targetUid}`,
      targetId: targetUid || cleanEmail,
      result: 'SUCCESS',
      details: { targetUid, targetEmail },
    });

    return res.json({
      success: true,
      message: `Admin access for ${targetEmail || targetUid} has been revoked.`,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to revoke admin' });
  }
});

// 15. Destructive Platform Operations (SUPER_ADMIN with double confirmation)
adminRouter.post('/destructive/execute', requireAdminRole('canPerformDestructive'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { actionType, targetId, confirmationText } = req.body;

    if (!actionType || !confirmationText) {
      return res.status(400).json({ success: false, error: 'actionType and confirmationText are required' });
    }

    if (confirmationText !== 'CONFIRM-DESTRUCTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation: Expected "CONFIRM-DESTRUCTIVE".',
      });
    }

    let resultMessage = '';
    if (actionType === 'PURGE_TEST_WIDGET') {
      if (!targetId || isReservedOfficialWidgetId(targetId)) {
        return res.status(400).json({ success: false, error: 'Cannot purge official system widgets.' });
      }
      if (!hasAdminCredentials()) {
        return res.status(503).json({ success: false, error: 'Admin database service unavailable.' });
      }
      const db = getAdminDb();
      await db.collection('public_widgets').doc(targetId).delete();
      resultMessage = `Widget ${targetId} purged successfully.`;
    } else {
      return res.status(400).json({ success: false, error: `Unknown destructive action: ${actionType}` });
    }

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: `DESTRUCTIVE_${actionType}`,
      targetResource: targetId,
      result: 'SUCCESS',
      details: { actionType, targetId },
    });

    return res.json({
      success: true,
      message: resultMessage,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Destructive action failed' });
  }
});

// ==========================================
// 16. MARKETING CO-FOUNDER (INTERNAL) ROUTES
// ==========================================

// 16a. Marketing Brain
adminRouter.get('/marketing/brain', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const brain = await getMarketingBrain();
    return res.json({ success: true, brain });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch marketing brain' });
  }
});

adminRouter.post('/marketing/brain', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = await updateMarketingBrain(req.body, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: true, brain: updated, message: 'Marketing Brain updated successfully.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update marketing brain' });
  }
});

// 16b. Research Engine
adminRouter.get('/marketing/research', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const items = await getResearchItems();
    return res.json({ success: true, research: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch research items' });
  }
});

adminRouter.post('/marketing/research/generate', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { topic, focusArea } = req.body;
    const items = await runOpportunityResearch({
      topic,
      focusArea,
      actor: {
        email: req.admin!.email,
        uid: req.admin!.uid,
        role: req.admin!.role,
      },
    });
    return res.json({ success: true, research: items, message: 'Research opportunities generated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate research' });
  }
});

adminRouter.delete('/marketing/research/:id', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = await deleteResearchItem(req.params.id, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: true, research: updated, message: 'Research item deleted.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to delete research item' });
  }
});

// 16c. Content Studio & Lifecycle
adminRouter.get('/marketing/content', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const items = await getContentItems();
    return res.json({ success: true, content: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch content items' });
  }
});

adminRouter.post('/marketing/content/generate', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { platform, format, topic, objective, customInstructions, researchItemId } = req.body;
    if (!platform || !format) {
      return res.status(400).json({ success: false, error: 'Platform and format are required.' });
    }

    const created = await generateContentInStudio({
      platform,
      format,
      topic,
      objective,
      customInstructions,
      researchItemId,
      actor: {
        email: req.admin!.email,
        uid: req.admin!.uid,
        role: req.admin!.role,
      },
    });

    return res.json({ success: true, item: created, message: 'Content asset generated in Content Studio.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate content' });
  }
});

adminRouter.put('/marketing/content/:id', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = await updateContentItem(req.params.id, req.body, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: true, item: updated, message: 'Content updated successfully.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update content' });
  }
});

adminRouter.post('/marketing/content/:id/status', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }

    const updated = await changeContentStatus(
      req.params.id,
      status,
      {
        email: req.admin!.email,
        uid: req.admin!.uid,
        role: req.admin!.role,
      },
      notes
    );

    return res.json({ success: true, item: updated, message: `Content status changed to ${status}.` });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update status' });
  }
});

adminRouter.post('/marketing/content/:id/publish', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const result = await executePublishContent(req.params.id, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: result.success, result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to publish content' });
  }
});

adminRouter.post('/marketing/content/:id/schedule', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { scheduledTime } = req.body;
    if (!scheduledTime) {
      return res.status(400).json({ success: false, error: 'scheduledTime is required.' });
    }
    const result = await executeScheduleContent(req.params.id, scheduledTime, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to schedule content' });
  }
});

adminRouter.delete('/marketing/content/:id', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = await deleteContentItem(req.params.id, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: true, content: updated, message: 'Content item deleted.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to delete content' });
  }
});

// 16d. Publishing Settings & Connections
adminRouter.get('/marketing/publishing/connections', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const connections = await getPublishingConnections();
    return res.json({ success: true, connections });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch publishing connections' });
  }
});

adminRouter.get('/marketing/publishing/settings', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const settings = await getPublishingSettings();
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch publishing settings' });
  }
});

adminRouter.post('/marketing/publishing/settings', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = await updatePublishingSettings(req.body, {
      email: req.admin!.email,
      uid: req.admin!.uid,
      role: req.admin!.role,
    });
    return res.json({ success: true, settings: updated, message: 'Publishing settings updated.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update publishing settings' });
  }
});

adminRouter.post('/marketing/publishing/connect/:platform', requireAdminRole('admin.marketing.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const platform = req.params.platform as any;
    const result = await connectPublishingChannel(platform, {
      ...(req.body || {}),
      actorUid: req.admin!.uid,
      actorEmail: req.admin!.email,
    });
    return res.json({ success: result.success, ...result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to initiate channel connection' });
  }
});

// 16e. Analytics & Audit
adminRouter.get('/marketing/analytics', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const data = await getMarketingAnalytics();
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch marketing analytics' });
  }
});

adminRouter.get('/marketing/audit-logs', requireAdminRole('admin.marketing.view'), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const logs = await getMarketingAuditLogs(100);
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch marketing audit logs' });
  }
});

// ==========================================
// 17. CEO-ONLY INTELLIGENCE CENTER ROUTES
// ==========================================

adminRouter.get('/ceo/intelligence', requireAdminRole(), requireCeoRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as 'today' | '7d' | '30d' | 'all') || '7d';
    const data = await getCeoIntelligenceData(timeRange);

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_CEO_INTELLIGENCE',
      targetResource: 'CEO_COMMAND_CENTER',
      result: 'SUCCESS',
    });

    return res.json(data);
  } catch (err: any) {
    console.error('Error in GET /api/admin/ceo/intelligence:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch CEO intelligence data' });
  }
});

adminRouter.get('/ceo/user-detail/:userId', requireAdminRole(), requireCeoRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const data = await getCeoUserDetailData(userId);

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_CEO_USER_DETAIL',
      targetResource: `USER_PROFILE:${userId}`,
      targetId: userId,
      result: 'SUCCESS',
    });

    return res.json(data);
  } catch (err: any) {
    console.error('Error in GET /api/admin/ceo/user-detail/:userId:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch user detail profile' });
  }
});

adminRouter.get('/ceo/conversation-insights', requireAdminRole(), requireCeoRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const data = await getCeoConversationInsightsData();

    recordAuditLog({
      adminUid: req.admin!.uid,
      adminEmail: req.admin!.email,
      adminRole: req.admin!.role,
      action: 'VIEWED_CEO_CONVERSATION_INSIGHTS',
      targetResource: 'CONVERSATION_INSIGHTS',
      result: 'SUCCESS',
    });

    return res.json(data);
  } catch (err: any) {
    console.error('Error in GET /api/admin/ceo/conversation-insights:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch conversation insights' });
  }
});

// ==========================================
// 18. PROJECT ALPHA — AI MODEL USAGE, PROVIDERS & HANDOFF QUEUE APIs
// ==========================================

adminRouter.get('/alpha/model-usage', requireAdminRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const analytics = getAdminModelUsageAnalytics();
    return res.json({ success: true, ...analytics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch model usage analytics' });
  }
});

adminRouter.get('/alpha/providers', requireAdminRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const providers = getProviderStatuses();
    return res.json({ success: true, providers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch provider adapter statuses' });
  }
});

adminRouter.get('/alpha/handoffs', requireAdminRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || 'all';
    const durableHandoffs: any[] = [];
    const seenIds = new Set<string>();
    let durable = false;

    if (hasAdminCredentials()) {
      try {
        const db = getAdminDb();
        if (tenantId && tenantId !== 'all') {
          const snap = await db.collection('users').doc(tenantId).collection('handoffs').get();
          snap.forEach((d) => {
            const data = d.data();
            durableHandoffs.push(data);
            if (data.handoff_id) seenIds.add(data.handoff_id);
          });
        } else {
          const snap = await db.collectionGroup('handoffs').limit(200).get();
          snap.forEach((d) => {
            const data = d.data();
            durableHandoffs.push(data);
            if (data.handoff_id) seenIds.add(data.handoff_id);
          });
        }
        durable = true;
      } catch (dbErr: any) {
        console.error('[AdminRouter] Durable handoff query error:', dbErr?.message || dbErr);
      }
    }

    // Include recent process-local entries only if not already present in durable results
    for (const h of memoryHandoffStore.values()) {
      if ((tenantId === 'all' || h.tenant_id === tenantId) && !seenIds.has(h.handoff_id)) {
        durableHandoffs.push(h);
        seenIds.add(h.handoff_id);
      }
    }
    for (const h of getTenantHandoffs(tenantId)) {
      if (!seenIds.has(h.handoffId)) {
        durableHandoffs.push(h);
        seenIds.add(h.handoffId);
      }
    }

    durableHandoffs.sort(
      (a, b) => new Date(b.updated_at || b.updatedAt || 0).getTime() - new Date(a.updated_at || a.updatedAt || 0).getTime()
    );

    return res.json({ success: true, durable, handoffs: durableHandoffs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch human handoffs' });
  }
});

adminRouter.post('/alpha/handoffs/assign', requireAdminRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { handoffId, userId, userEmail, tenantId } = req.body || {};
    if (!handoffId || !userId) {
      return res.status(400).json({ success: false, error: 'handoffId and userId are required' });
    }
    const targetTenantId = tenantId || userId;
    if (hasAdminCredentials()) {
      const result = await updateHandoffWorkflowStatus(targetTenantId, handoffId, {
        workflow_status: 'assigned',
        assigned_to: userId,
      });
      if (result.success) {
        const updatedMem = assignHandoffToUser(handoffId, userId, userEmail || req.admin!.email);
        return res.json({ success: true, durable: true, handoff: updatedMem || { handoff_id: handoffId, assigned_to: userId, workflow_status: 'assigned' } });
      }
      return res.status(500).json({ success: false, error: result.error || 'Failed to assign durable handoff' });
    }
    const updated = assignHandoffToUser(handoffId, userId, userEmail || req.admin!.email);
    return res.json({ success: true, durable: false, handoff: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to assign handoff' });
  }
});

adminRouter.post('/alpha/brain-v2/inspect', requireAdminRole(), async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { profile, tenantId } = req.body || {};
    const brainV2 = normalizeToBrainV2(profile, tenantId);
    return res.json({ success: true, brainV2 });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to inspect Company Brain V2' });
  }
});



