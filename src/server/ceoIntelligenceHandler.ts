import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';
import { getVisitorSessions, computeAnalyticsMetrics, getTimeSeriesChartData } from './analyticsService.ts';
import { getAllPublicWidgetsList, getUserWidgetConfig } from './widgetHandler.ts';

export async function getCeoIntelligenceData(timeRange: 'today' | '7d' | '30d' | 'all' = '7d') {
  const widgets = await getAllPublicWidgetsList().catch(() => []);
  const usersList: any[] = [];
  let metricsUnavailable = false;

  if (!hasAdminCredentials()) {
    metricsUnavailable = true;
  } else {
    try {
      const db = getAdminDb();
      const usersSnap = await db.collection('users').get();
      for (const uDoc of usersSnap.docs) {
        const uid = uDoc.id;
        const data = uDoc.data();

        const [convSnap, inquiriesSnap] = await Promise.all([
          db.collection('users').doc(uid).collection('conversations').get().catch(() => null),
          db.collection('users').doc(uid).collection('inquiries').get().catch(() => null),
        ]);

        const conversationsCount = convSnap ? convSnap.size : 0;
        const inquiriesCount = inquiriesSnap ? inquiriesSnap.size : 0;

        usersList.push({
          uid,
          name: data.display_name || data.name || data.email?.split('@')[0] || `User ${uid.slice(0, 6)}`,
          email: data.email || data.user_email || '',
          company: data.company_name || data.companyName || 'Unconfigured Workspace',
          role: data.role || 'Workspace Owner',
          signupDate: data.created_at || null,
          lastActive: data.last_active_at || data.updated_at || null,
          conversationsCount,
          inquiriesCount,
          widgetStatus: data.widget_active !== false ? 'ACTIVE' : 'INACTIVE',
          accountStatus: data.status || 'ACTIVE',
          usageLevel: conversationsCount > 5 ? 'High' : conversationsCount > 2 ? 'Moderate' : 'Low',
        });
      }
    } catch (err: any) {
      console.error('[CeoIntelligence] Failed to query users:', err?.message || err);
      metricsUnavailable = true;
    }
  }

  const liveVisitors = getVisitorSessions({ limit: 100 });
  const totalConversations = usersList.reduce((acc, u) => acc + u.conversationsCount, 0);
  const totalInquiries = usersList.reduce((acc, u) => acc + u.inquiriesCount, 0);

  const metrics = computeAnalyticsMetrics({
    totalUsers: usersList.length,
    totalCompanies: widgets.length,
    totalWidgets: widgets.length,
    totalConversations,
    totalInquiries,
    timeRange,
    metricsUnavailable,
  });

  const chartData = getTimeSeriesChartData(timeRange === 'all' ? '30d' : timeRange);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    dataAvailable: !metricsUnavailable,
    metrics: {
      ...metrics,
      totalSignups: usersList.length,
      activeCompanies: widgets.length,
      activeWidgets: widgets.length,
      qualifiedLeads: totalInquiries,
    },
    chartData,
    liveVisitors,
    users: usersList,
    companies: widgets.map((w) => ({
      widgetId: w.widget_id,
      userId: w.user_id || null,
      name: w.business_name,
      industry: w.company_profile?.industry || w.public_summary?.industry || 'Unspecified',
      themeColor: w.theme_color,
      isActive: w.is_active,
    })),
  };
}

export async function getCeoUserDetailData(userId: string) {
  if (!userId) throw new Error('userId is required');

  let userData: any = null;
  const conversationsList: any[] = [];
  const activitiesList: any[] = [];

  if (hasAdminCredentials()) {
    const db = getAdminDb();
    try {
      const userSnap = await db.collection('users').doc(userId).get();
      if (userSnap.exists) {
        userData = userSnap.data();
      }
    } catch (err: any) {
      console.error('[CeoIntelligence] User doc fetch failed:', err?.message || err);
    }

    try {
      const convSnap = await db.collection('users').doc(userId).collection('conversations').get();
      convSnap.forEach((d) => {
        conversationsList.push({ id: d.id, ...d.data() });
      });
    } catch {}

    try {
      const actSnap = await db.collection('users').doc(userId).collection('activities').get();
      actSnap.forEach((d) => {
        activitiesList.push({ id: d.id, ...d.data() });
      });
    } catch {}
  }

  const widgetConfig = await getUserWidgetConfig(userId).catch(() => null);

  return {
    success: true,
    user: {
      uid: userId,
      name: userData?.display_name || userData?.name || userId,
      email: userData?.email || userData?.user_email || '',
      company: widgetConfig?.business_name || userData?.company_name || 'Unconfigured Workspace',
      role: userData?.role || 'Workspace Owner',
      signupDate: userData?.created_at || null,
      lastActive: userData?.last_active_at || null,
      accountStatus: userData?.status || 'UNKNOWN',
    },
    usage: {
      totalConversations: conversationsList.length,
      activeWidgets: widgetConfig?.is_active ? 1 : 0,
      widgetId: widgetConfig?.widget_id || null,
      recentActivityCount: activitiesList.length,
    },
    companyBrain: widgetConfig?.company_profile || null,
    widgetConfiguration: {
      widgetId: widgetConfig?.widget_id || null,
      welcomeMessage: widgetConfig?.welcome_message || null,
      themeColor: widgetConfig?.theme_color || null,
      isActive: Boolean(widgetConfig?.is_active),
      designStyle: widgetConfig?.design_style || 'attractive_3d',
    },
    activities: activitiesList.sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    ),
    conversations: conversationsList,
  };
}

export async function getCeoConversationInsightsData() {
  const conversationsList: any[] = [];
  let dataAvailable = false;

  if (hasAdminCredentials()) {
    try {
      const db = getAdminDb();
      const usersSnap = await db.collection('users').get();
      for (const uDoc of usersSnap.docs) {
        const uid = uDoc.id;
        const convSnap = await db.collection('users').doc(uid).collection('conversations').get().catch(() => null);
        if (convSnap) {
          convSnap.forEach((cDoc) => {
            const data = cDoc.data();
            const isFailed = data.status === 'Failed' || data.lead_score === 'COLD';
            const isSuccessful = data.status === 'Qualified' || data.status === 'Successful' || data.lead_score === 'HOT';
            conversationsList.push({
              id: cDoc.id,
              userId: uid,
              widgetId: data.widget_id || null,
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
              isSuccessful,
              isFailed,
            });
          });
        }
      }
      dataAvailable = true;
    } catch (err: any) {
      console.error('[CeoIntelligence] Failed to query conversation insights:', err?.message || err);
    }
  }

  const total = conversationsList.length;
  const successful = conversationsList.filter((c) => c.isSuccessful).length;
  const failed = conversationsList.filter((c) => c.isFailed).length;
  const qualificationRate = total > 0 ? `${((successful / total) * 100).toFixed(1)}%` : '0.0%';

  return {
    success: true,
    dataAvailable,
    conversations: conversationsList,
    summary: {
      total,
      successful,
      failed,
      qualificationRate,
    },
  };
}
