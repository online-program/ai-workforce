import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppView, InquiryLead, ActivityLog, SalesTask, CompanyProfile, WorkspaceTab, LeadStatus, OnboardingDraft } from './types.ts';
import { defaultCompanyProfile, defaultLeads, defaultActivities, defaultTasks } from './data/mockData.ts';
import { LandingPage } from './components/LandingPage.tsx';
import { AlphaProductPage } from './components/AlphaProductPage.tsx';
import { BlogPage } from './components/BlogPage.tsx';
import { SEOHead } from './components/SEOHead.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { WorkspaceHome } from './components/WorkspaceHome.tsx';
import { SalesCoordinatorWorkspace } from './components/SalesCoordinatorWorkspace.tsx';
import { HireEmployeeModal } from './components/HireEmployeeModal.tsx';
import { InquiryDetailModal } from './components/InquiryDetailModal.tsx';
import { NewInboundModal } from './components/NewInboundModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CompanyBrainOnboarding } from './components/CompanyBrainOnboarding.tsx';
import { ContactFooter } from './components/ContactFooter.tsx';
import { Logo } from './components/Logo.tsx';
import { ExperiencePage } from './components/ExperiencePage.tsx';
import { PublicPages } from './components/PublicPages.tsx';
import { ThemeToggle, useTheme } from './context/ThemeContext.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal.tsx';
import { AdminControlCenter } from './components/admin/AdminControlCenter.tsx';
import { AdminInvitationBanner } from './components/AdminInvitationBanner.tsx';
import { adminService, AdminRole } from './services/adminService.ts';
import {
  getUserWorkspaceMetadata,
  getCachedUserWorkspaceMetadata,
  getCompanyProfile,
  getCachedCompanyProfile,
  saveCompanyProfile,
  subscribeToUserInquiries,
  saveInquiry,
  updateInquiryStatus,
  deleteInquiry,
  subscribeToUserActivities,
  logUserActivity,
  subscribeToUserTasks,
  saveUserTask,
  completeUserTaskByLeadId,
  sendInquiryEmailReply,
  getOrCreateWidgetId,
} from './services/workspaceService.ts';
import { Menu, X, Loader2 } from 'lucide-react';
import { parseRouteFromLocation, getUrlForRoute } from './utils/navigation.ts';
import { LiveWidgetPreviewModal } from './components/LiveWidgetPreviewModal.tsx';
import { CookieConsentBanner } from './components/CookieConsentBanner.tsx';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { toggleTheme } = useTheme();
  const [isGlobalPreviewOpen, setIsGlobalPreviewOpen] = useState(false);
  const initialRoute = React.useMemo(() => parseRouteFromLocation(), []);
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.view);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(initialRoute.tab);

  // Synchronize browser URL bar and History API with the active view and tab
  const navigateTo = React.useCallback((view: AppView, tab?: WorkspaceTab, replace: boolean = false) => {
    const targetTab = tab || (view === 'workspace' ? workspaceTab : 'workspace_home');
    setCurrentView(view);
    if (tab) {
      setWorkspaceTab(tab);
    }
    const targetUrl = getUrlForRoute(view, targetTab);
    if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
      if (replace) {
        window.history.replaceState({ view, tab: targetTab }, '', targetUrl);
      } else {
        window.history.pushState({ view, tab: targetTab }, '', targetUrl);
      }
    }
  }, [workspaceTab]);

  // Dynamic SEO Title & Robots Meta Tag per Route
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const titles: Record<AppView, string> = {
      landing: 'AI Workforce | AI Employees That Work Alongside Your Team',
      alpha: 'Alpha AI Sales Manager | AI Workforce',
      blog: 'AI Workforce Insights | Knowledge Hub',
      experience: 'Alpha Experience Mode — Build Your Personalized AI Sales Manager Demo | AI Workforce',
      privacy: 'Privacy Policy | AI Workforce',
      cookies: 'Cookie & Storage Policy | AI Workforce',
      terms: 'Terms of Service | AI Workforce',
      about: 'About | AI Workforce',
      contact: 'Contact | AI Workforce',
      workspace: 'Workspace | AI Workforce',
      employee_sales_manager: 'Alpha Sales Manager | AI Workforce',
      employee_sales_coordinator: 'Alpha Sales Coordinator | AI Workforce',
      admin: 'Admin Control Center | AI Workforce',
    };
    document.title = titles[currentView] || titles.landing;

    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta) {
      const noIndexViews: AppView[] = ['experience', 'workspace', 'admin', 'employee_sales_manager', 'employee_sales_coordinator'];
      robotsMeta.setAttribute(
        'content',
        noIndexViews.includes(currentView)
          ? 'noindex, nofollow'
          : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
      );
    }
  }, [currentView]);

  // Handle browser Back / Forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      setCurrentView(route.view);
      setWorkspaceTab(route.tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isNewInboundModalOpen, setIsNewInboundModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<InquiryLead | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Onboarding State
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<Partial<OnboardingDraft> | undefined>(undefined);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);

  // User-Isolated Persistent State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(defaultCompanyProfile);
  const [leads, setLeads] = useState<InquiryLead[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Authority & Admin State
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [invitationActionLoading, setInvitationActionLoading] = useState(false);

  // Check admin role and pending invitations for authenticated user
  const checkAdminAuthority = async () => {
    if (!user) {
      setAdminRole(null);
      setPendingInvitations([]);
      return;
    }
    try {
      // 1. Verify user's role in server authority matrix
      const authRes = await adminService.verifyAdminAuth().catch(() => null);
      if (authRes && authRes.user && authRes.user.role && authRes.user.role !== 'USER') {
        setAdminRole(authRes.user.role as AdminRole);
      } else {
        setAdminRole(null);
      }

      // 2. Check if user has pending invitations matching their email
      const invRes = await adminService.getMyInvitations().catch(() => ({ invitations: [] }));
      setPendingInvitations(invRes.invitations || []);
    } catch (err) {
      console.warn('Admin authority check notice:', err);
    }
  };

  // Check URL parameters for invitation links on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get('accept_invite');
      if (inviteId) {
        if (!user && !authLoading) {
          setIsAuthModalOpen(true);
        } else if (user) {
          checkAdminAuthority();
        }
      }
    }
  }, [user, authLoading]);

  // When user is authenticated, check metadata & subscribe to their Firestore workspace collections
  useEffect(() => {
    if (!user) {
      // Never hydrate global tenant state into guest mode; clear any legacy unscoped keys
      try {
        localStorage.removeItem('aw_active_company_profile');
      } catch (e) {}
      setLeads(defaultLeads);
      setActivities(defaultActivities);
      setTasks(defaultTasks);
      setCompanyProfile(defaultCompanyProfile);
      setAdminRole(null);
      setPendingInvitations([]);
      setSelectedLeadDetail(null);
      setDataLoaded(true);
      setShowOnboarding(false);
      const route = parseRouteFromLocation();
      if (route.view !== 'landing') {
        setCurrentView(route.view);
        setWorkspaceTab(route.tab);
      } else {
        setCurrentView('landing');
      }
      return;
    }

    // 1. Optimistic synchronous cache hydrate (instant render)
    const cachedMeta = getCachedUserWorkspaceMetadata(user.uid);
    const cachedProf = getCachedCompanyProfile(user.uid);

    // If the user already has a saved custom business profile, onboarding is complete
    const hasConfiguredProfile = Boolean(
      cachedProf &&
      cachedProf.name &&
      cachedProf.name.trim() !== '' &&
      cachedProf.name !== 'My Business'
    );

    if (cachedProf && cachedProf.name) {
      setCompanyProfile(cachedProf);
    }

    if (hasConfiguredProfile || cachedMeta.onboarding_completed === true) {
      setShowOnboarding(false);
    } else {
      // Only show onboarding if user has not completed it yet
      setShowOnboarding(true);
      const safeStep = Math.min(6, Math.max(1, Number(cachedMeta.onboarding_step) || 1));
      setOnboardingDraft(cachedMeta.onboarding_draft);
      setOnboardingStep(safeStep);
    }

    const route = parseRouteFromLocation();
    if (route.view !== 'landing') {
      setCurrentView(route.view);
      setWorkspaceTab(route.tab);
    }

    setDataLoaded(true);

    // 2. Background verification for metadata & company profile
    Promise.all([
      getUserWorkspaceMetadata(user.uid),
      getCompanyProfile(user.uid)
    ])
      .then(([meta, prof]) => {
        if (prof && prof.name && prof.name.trim() !== '' && prof.name !== 'My Business') {
          setCompanyProfile(prof);
          setShowOnboarding(false);
        } else if (meta && meta.onboarding_completed === true) {
          setShowOnboarding(false);
          if (prof) setCompanyProfile(prof);
        } else if (meta && meta.onboarding_completed === false && !hasConfiguredProfile) {
          setShowOnboarding(true);
          const safeStep = Math.min(6, Math.max(1, Number(meta.onboarding_step) || 1));
          setOnboardingDraft(meta.onboarding_draft);
          setOnboardingStep(safeStep);
        }

        const currentRoute = parseRouteFromLocation();
        if (currentRoute.view !== 'landing') {
          setCurrentView(currentRoute.view);
          setWorkspaceTab(currentRoute.tab);
        }
      })
      .catch((err) => {
        console.warn('Workspace background sync notice:', err);
      });

    // 3. Real-time Inquiries listener
    const unsubInquiries = subscribeToUserInquiries(user.uid, (userLeads) => {
      setLeads(userLeads);
      setDataLoaded(true);
    });

    // 4. Real-time Activities listener
    const unsubActivities = subscribeToUserActivities(user.uid, (userActivities) => {
      setActivities(userActivities);
    });

    // 5. Real-time Tasks listener
    const unsubTasks = subscribeToUserTasks(user.uid, (userTasks) => {
      setTasks(userTasks);
    });

    // 6. Check Admin Authority & Invitations
    checkAdminAuthority();

    return () => {
      unsubInquiries();
      unsubActivities();
      unsubTasks();
    };
  }, [user]);

  // Global Keyboard Shortcuts
  // Global Keyboard Shortcuts (N for New Inquiry, S for Settings, B for Company Brain, W for Widget/Dashboard, Esc, ?)
  useKeyboardShortcuts({
    enabled: currentView !== 'landing' && !showOnboarding,
    onNewInquiry: () => {
      setIsNewInboundModalOpen(true);
    },
    onSelectTab: (tab) => {
      navigateTo('workspace', tab);
      setMobileSidebarOpen(false);
    },
    onOpenHireModal: () => {
      setIsHireModalOpen(true);
      setMobileSidebarOpen(false);
    },
    onToggleShortcutsModal: () => {
      setIsShortcutsModalOpen((prev) => !prev);
    },
    onCloseModal: () => {
      if (isShortcutsModalOpen) {
        setIsShortcutsModalOpen(false);
        return;
      }
      if (selectedLeadDetail) {
        setSelectedLeadDetail(null);
        return;
      }
      if (isNewInboundModalOpen) {
        setIsNewInboundModalOpen(false);
        return;
      }
      if (isHireModalOpen) {
        setIsHireModalOpen(false);
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return;
      }
      if (mobileSidebarOpen) {
        setMobileSidebarOpen(false);
        return;
      }
    },
    onApproveLead: () => {
      if (selectedLeadDetail && selectedLeadDetail.draft_reply) {
        handleApproveAndSend(selectedLeadDetail.id, selectedLeadDetail.draft_reply);
      }
    },
  });

  // Handler: Open Auth Modal (Google Auth Only)
  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  // Handler: When user completes Smart Onboarding
  const handleOnboardingComplete = (compiledProfile: CompanyProfile) => {
    setCompanyProfile(compiledProfile);
    setShowOnboarding(false);
    navigateTo('workspace', 'workspace_home');
  };

  // Handler: When user updates Company Profile / Brain
  const handleUpdateCompanyProfile = async (newProfile: CompanyProfile) => {
    setCompanyProfile(newProfile);
    setShowOnboarding(false);
    if (user) {
      try {
        await saveCompanyProfile(user.uid, newProfile);
        await logUserActivity(user.uid, {
          id: `act-prof-${Date.now()}`,
          employeeName: 'Alpha',
          title: 'Company Brain Updated',
          description: `Updated business profile and rules for ${newProfile.name}.`,
          timestamp: new Date().toISOString(),
          type: 'status_change',
        });
      } catch (err) {
        console.error('Failed to save company profile to Firestore:', err);
      }
    }
  };

  // Handler: When a new inquiry is processed
  const handleInquiryAnalyzed = async (newLead: InquiryLead) => {
    if (user) {
      try {
        await saveInquiry(user.uid, newLead);

        const newActivity: ActivityLog = {
          id: `act-${Date.now()}`,
          leadId: newLead.id,
          employeeName: 'Alpha',
          title: `Extracted Facts & Scored ${newLead.lead_score}`,
          description: `Processed incoming ${newLead.source || 'inquiry'} from ${newLead.customer_name} (${newLead.product_or_service}). Prepared recommendation and draft reply.`,
          timestamp: new Date().toISOString(),
          type: 'analysis',
        };
        await logUserActivity(user.uid, newActivity);

        const newTask: SalesTask = {
          id: `task-${Date.now()}`,
          leadId: newLead.id,
          companyName: newLead.customer_name,
          title: `Review & Send Reply to ${newLead.customer_name} (${newLead.product_or_service})`,
          leadScore: newLead.lead_score,
          priority: newLead.lead_score === 'HOT' ? 'high' : 'medium',
          dueDate: 'Today',
          status: 'pending',
          actionType: 'approve_reply',
        };
        await saveUserTask(user.uid, newTask);
      } catch (err) {
        console.error('Failed to persist new inquiry:', err);
      }
    } else {
      // Local fallback for guest
      setLeads((prev) => [newLead, ...prev]);
    }

    // Immediately open lead detail for the user to review
    setSelectedLeadDetail(newLead);
  };

  // Handler: Approve & Send (Real Multi-Provider Dispatch)
  const handleApproveAndSend = async (
    leadId: string,
    replyText: string,
    recipientEmailOverride?: string,
    googleAccessToken?: string
  ): Promise<{ success: boolean; error?: string; provider?: string }> => {
    const targetLead = leads.find((l) => l.id === leadId);
    const companyName = companyProfile?.name || targetLead?.customer_name || 'AI Workforce';
    const effectiveRecipient =
      recipientEmailOverride ||
      targetLead?.recipient_email ||
      targetLead?.customer_email ||
      (targetLead?.contact_info?.includes('@') ? targetLead.contact_info : '') ||
      '';

    if (!effectiveRecipient || !effectiveRecipient.includes('@')) {
      return { success: false, error: 'Cannot dispatch: No valid recipient email address on file.' };
    }

    try {
      const dispatchResult = await sendInquiryEmailReply({
        userId: user ? user.uid : 'default_user',
        leadId,
        recipientEmail: effectiveRecipient,
        subject: `Regarding your inquiry with ${companyName}`,
        replyText,
        senderName: companyProfile?.name || 'Alpha',
        senderEmail: user?.email || undefined,
        googleAccessToken,
      });

      if (!dispatchResult.success) {
        // Real dispatch failure: Inquiry remains in review!
        return {
          success: false,
          error: dispatchResult.error || dispatchResult.email_error || 'Email dispatch was rejected by the provider. Inquiry remains in review.',
        };
      }

      const emailWasDispatched = dispatchResult.email_dispatched === true;
      const resolvedEmailStatus = dispatchResult.email_status || (emailWasDispatched ? 'accepted' : 'not_sent_conversation_only');

      // Success: update inquiry status in database & local state truthfully
      if (user) {
        await updateInquiryStatus(user.uid, leadId, {
          status: 'Waiting for Customer',
          draft_reply: replyText,
          suggested_reply: replyText,
          email_dispatched: emailWasDispatched,
          email_status: resolvedEmailStatus,
          ...(emailWasDispatched ? { email_dispatched_at: dispatchResult.sent_at || new Date().toISOString() } : {}),
          email_recipient: effectiveRecipient,
        });

        await completeUserTaskByLeadId(user.uid, leadId);
      } else {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  status: 'Waiting for Customer' as LeadStatus,
                  draft_reply: replyText,
                  suggested_reply: replyText,
                  email_dispatched: emailWasDispatched,
                  email_status: resolvedEmailStatus,
                  ...(emailWasDispatched ? { email_dispatched_at: dispatchResult.sent_at || new Date().toISOString() } : {}),
                  last_action_at: new Date().toISOString(),
                }
              : l
          )
        );
      }

      // Update selected lead state if modal is open
      if (selectedLeadDetail && selectedLeadDetail.id === leadId) {
        setSelectedLeadDetail((prev) =>
          prev
            ? {
                ...prev,
                status: 'Waiting for Customer',
                draft_reply: replyText,
                suggested_reply: replyText,
                email_dispatched: emailWasDispatched,
                email_status: resolvedEmailStatus,
              }
            : null
        );
      }

      return {
        success: true,
        provider: dispatchResult.email_provider || dispatchResult.provider,
        email_dispatched: emailWasDispatched,
        email_status: resolvedEmailStatus,
      } as any;
    } catch (err: any) {
      console.error('Error in handleApproveAndSend:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while dispatching email.',
      };
    }
  };

  // Handler: Reject Inquiry
  const handleRejectInquiry = async (leadId: string, reason?: string) => {
    const targetLead = leads.find((l) => l.id === leadId);
    const companyName = targetLead?.customer_name || targetLead?.companyName || 'Customer';

    if (user) {
      try {
        await updateInquiryStatus(user.uid, leadId, {
          status: 'Rejected',
          rejection_reason: reason,
        });

        const newAct: ActivityLog = {
          id: `act-${Date.now()}`,
          leadId,
          employeeName: 'Alpha',
          title: 'Inquiry rejected.',
          description: `Inquiry from ${companyName} marked as Rejected.${reason ? ` Reason: ${reason}` : ''}`,
          timestamp: new Date().toISOString(),
          type: 'rejected',
        };
        await logUserActivity(user.uid, newAct);
        await completeUserTaskByLeadId(user.uid, leadId);
      } catch (err) {
        console.error('Error rejecting inquiry:', err);
      }
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                status: 'Rejected' as LeadStatus,
                rejection_reason: reason,
                last_action_at: new Date().toISOString(),
              }
            : l
        )
      );
    }

    if (selectedLeadDetail && selectedLeadDetail.id === leadId) {
      setSelectedLeadDetail((prev) =>
        prev
          ? {
              ...prev,
              status: 'Rejected',
              rejection_reason: reason,
            }
          : null
      );
    }
  };

  // Handler: Update Lead Status
  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const targetLead = leads.find((l) => l.id === leadId);
    const companyName = targetLead?.customer_name || targetLead?.companyName || 'Lead';

    if (user) {
      try {
        await updateInquiryStatus(user.uid, leadId, { status: newStatus });
        const newAct: ActivityLog = {
          id: `act-${Date.now()}`,
          leadId,
          employeeName: 'Alpha',
          title: `Status Changed to ${newStatus}`,
          description: `Account ${companyName} moved to stage: ${newStatus}.`,
          timestamp: new Date().toISOString(),
          type: 'status_change',
        };
        await logUserActivity(user.uid, newAct);
      } catch (err) {
        console.error('Error updating status:', err);
      }
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: newStatus, last_action_at: new Date().toISOString() } : l
        )
      );
    }

    if (selectedLeadDetail && selectedLeadDetail.id === leadId) {
      setSelectedLeadDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Handler: Update reply draft
  const handleUpdateReplyDraft = async (leadId: string, newDraft: string) => {
    if (user) {
      try {
        await updateInquiryStatus(user.uid, leadId, {
          draft_reply: newDraft,
          suggested_reply: newDraft,
        });
      } catch (err) {
        console.error('Error updating draft:', err);
      }
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, draft_reply: newDraft, suggested_reply: newDraft } : l
        )
      );
    }
    if (selectedLeadDetail && selectedLeadDetail.id === leadId) {
      setSelectedLeadDetail((prev) =>
        prev
          ? {
              ...prev,
              draft_reply: newDraft,
              suggested_reply: newDraft,
            }
          : null
      );
    }
  };

  // Handler: Save manual internal follow-up notes
  const handleSaveManualNotes = async (leadId: string, notes: string) => {
    if (user) {
      try {
        await updateInquiryStatus(user.uid, leadId, {
          additional_notes: notes,
        } as any);
      } catch (err) {
        console.error('Error saving manual notes:', err);
      }
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, additional_notes: notes } as any : l
        )
      );
    }
    if (selectedLeadDetail && selectedLeadDetail.id === leadId) {
      setSelectedLeadDetail((prev) => (prev ? ({ ...prev, additional_notes: notes } as any) : null));
    }
  };

  // Handler: Delete Inquiry
  const handleDeleteInquiry = async (leadId: string) => {
    if (user) {
      try {
        await deleteInquiry(user.uid, leadId);
      } catch (err) {
        console.error('Error deleting inquiry:', err);
      }
    }
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (selectedLeadDetail && selectedLeadDetail.id === leadId) {
      setSelectedLeadDetail(null);
    }
  };

  // Handler: Toggle Task
  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t
      )
    );
  };

  // Handler: Clear Activity
  const handleClearActivity = () => {
    setActivities([]);
  };

  // Handler: Reset to default company profile and restore standard commercial catalog
  const handleResetDefaultData = async () => {
    if (user) {
      try {
        await saveCompanyProfile(user.uid, defaultCompanyProfile);
        setCompanyProfile(defaultCompanyProfile);
        for (const lead of defaultLeads) {
          await saveInquiry(user.uid, lead);
        }
        for (const task of defaultTasks) {
          await saveUserTask(user.uid, task);
        }
        for (const act of defaultActivities) {
          await logUserActivity(user.uid, act);
        }
        await logUserActivity(user.uid, {
          id: `act-reset-${Date.now()}`,
          employeeName: 'Alpha',
          title: 'Workspace Catalog Restored',
          description: 'Company Profile, sample inquiries, and commercial queue restored to default specifications.',
          timestamp: new Date().toISOString(),
          type: 'status_change',
        });
      } catch (err) {
        console.error('Failed to restore default data:', err);
      }
    } else {
      setCompanyProfile(defaultCompanyProfile);
      setLeads(defaultLeads);
      setActivities(defaultActivities);
      setTasks(defaultTasks);
    }
  };

  // Public Alpha Product Page
  if (currentView === 'alpha') {
    return (
      <>
        <SEOHead view="alpha" />
        <AlphaProductPage
          onEnterExperience={() => navigateTo('experience')}
          onNavigate={(v) => navigateTo(v)}
        />
        <CookieConsentBanner />
      </>
    );
  }

  // Public Knowledge Hub / Blog Page
  if (currentView === 'blog') {
    return (
      <>
        <SEOHead view="blog" />
        <BlogPage
          onEnterExperience={() => navigateTo('experience')}
          onNavigate={(v) => navigateTo(v)}
        />
        <CookieConsentBanner />
      </>
    );
  }

  // Public Alpha Experience Mode (Full-page, no-sign-in, isolated from workspace shell)
  if (currentView === 'experience') {
    return (
      <>
        <SEOHead view="experience" />
        <ExperiencePage
          onBackToLanding={() => navigateTo('landing')}
        />
      </>
    );
  }

  // Public Legal & Trust Pages
  if (
    currentView === 'privacy' ||
    currentView === 'cookies' ||
    currentView === 'terms' ||
    currentView === 'about' ||
    currentView === 'contact'
  ) {
    return (
      <>
        <SEOHead view={currentView} />
        <PublicPages
          view={currentView}
          onNavigate={(v) => navigateTo(v)}
        />
      </>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
        <div className="text-xs font-semibold text-slate-800 dark:text-white">Loading your AI Workforce workspace...</div>
      </div>
    );
  }

  // Canonical Company Brain Onboarding for new users or incomplete setups
  if (user && showOnboarding) {
    return (
      <CompanyBrainOnboarding
        userId={user.uid}
        initialDraft={onboardingDraft}
        initialStep={onboardingStep}
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          setShowOnboarding(false);
          navigateTo('workspace', 'workspace_home');
        }}
      />
    );
  }

  // Explicit Admin Center View (with server-side ABAC and dual-layer authorization)
  if (currentView === 'admin') {
    return (
      <>
        <AdminControlCenter
          onExitToApp={() => {
            navigateTo(user ? 'workspace' : 'landing', 'workspace_home');
          }}
          onSignOut={() => {
            navigateTo('landing');
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
          }}
        />
      </>
    );
  }

  // Render LandingPage when currentView is landing
  if (currentView === 'landing') {
    return (
      <>
        <SEOHead view="landing" />
        <LandingPage
          companyProfile={companyProfile}
          userId={user?.uid}
          onEnterWorkspace={() => {
            if (!user) {
              handleOpenAuthModal();
            } else if (showOnboarding) {
              // showOnboarding will trigger SmartOnboarding render
            } else {
              navigateTo('workspace', 'workspace_home');
            }
          }}
          onExploreEmployees={() => {
            if (!user) {
              handleOpenAuthModal();
            } else if (showOnboarding) {
              // showOnboarding will trigger SmartOnboarding render
            } else {
              navigateTo('workspace', 'employees');
            }
          }}
          onOpenAuthModal={handleOpenAuthModal}
          onEnterExperience={() => navigateTo('experience')}
          onNavigate={(v) => navigateTo(v)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
          }}
        />
        <CookieConsentBanner />
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-zinc-50 dark:bg-[#050505] text-zinc-950 dark:text-white flex flex-col md:flex-row font-sans selection:bg-white selection:text-black transition-colors duration-200">
      {/* Mobile Top Nav Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/95 dark:bg-[#050505]/90 border-b border-zinc-200 dark:border-white/10 sticky top-0 z-30 shadow-2xl backdrop-blur-xl">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-[#111111] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-transparent dark:border-white/10 transition-colors cursor-pointer"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Logo size="sm" showText={true} />

        <div className="flex items-center space-x-2">
          <ThemeToggle showLabel={false} variant="icon" />
          <button
            onClick={() => setIsNewInboundModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-xs"
          >
            + Add Inquiry
          </button>
        </div>
      </div>

      {/* Desktop & Mobile Sidebar */}
      {/* Desktop Sticky Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentTab={workspaceTab}
          onSelectTab={(tab) => {
            navigateTo('workspace', tab);
          }}
          onOpenHireModal={() => {
            setIsHireModalOpen(true);
          }}
          onOpenShortcutsModal={() => {
            setIsShortcutsModalOpen(true);
          }}
          onOpenAdminCenter={
            adminRole && adminRole !== 'USER'
              ? () => {
                  navigateTo('admin');
                }
              : undefined
          }
          onBackToLanding={() => {
            navigateTo('landing');
          }}
          onOpenWidgetPreview={() => setIsGlobalPreviewOpen(true)}
          inquiriesCount={leads.length}
          attentionCount={
            leads.filter(
              (l) => l.status === 'Needs Approval' || l.status === 'Follow-up Due' || l.status === 'Human Review'
            ).length
          }
        />
      </div>

      {/* Mobile Drawer with Native Drag-to-Dismiss Gesture */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />

            {/* Swipeable Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              drag="x"
              dragConstraints={{ left: -280, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70 || info.velocity.x < -300) {
                  setMobileSidebarOpen(false);
                }
              }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl bg-white dark:bg-neutral-950 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                currentTab={workspaceTab}
                onSelectTab={(tab) => {
                  navigateTo('workspace', tab);
                  setMobileSidebarOpen(false);
                }}
                onOpenHireModal={() => {
                  setIsHireModalOpen(true);
                  setMobileSidebarOpen(false);
                }}
                onOpenShortcutsModal={() => {
                  setIsShortcutsModalOpen(true);
                  setMobileSidebarOpen(false);
                }}
                onOpenAdminCenter={
                  adminRole && adminRole !== 'USER'
                    ? () => {
                        navigateTo('admin');
                        setMobileSidebarOpen(false);
                      }
                    : undefined
                }
                onBackToLanding={() => {
                  navigateTo('landing');
                  setMobileSidebarOpen(false);
                }}
                onOpenWidgetPreview={() => {
                  setIsGlobalPreviewOpen(true);
                  setMobileSidebarOpen(false);
                }}
                inquiriesCount={leads.length}
                attentionCount={
                  leads.filter(
                    (l) => l.status === 'Needs Approval' || l.status === 'Follow-up Due' || l.status === 'Human Review'
                  ).length
                }
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area with View Transitions */}
      <main className="flex-1 w-full min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-neutral-50/80 dark:bg-black transition-colors duration-200 flex flex-col justify-between">
        {pendingInvitations.length > 0 && (
          <AdminInvitationBanner
            invitations={pendingInvitations}
            onAccepted={(newRole) => {
              setAdminRole(newRole);
              setPendingInvitations([]);
              navigateTo('admin');
            }}
            onDismissed={() => {
              setPendingInvitations([]);
            }}
          />
        )}
        <div className="flex-1 w-full" style={{ perspective: 1200 }}>
          <AnimatePresence mode="wait">
            {currentView === 'workspace' && (
              <motion.div
                key="view-workspace"
                initial={{ opacity: 0, scale: 0.98, rotateX: 3, y: 10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, rotateX: -3, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-full"
              >
                <WorkspaceHome
                  currentTab={workspaceTab}
                  onSelectTab={(tab) => navigateTo('workspace', tab)}
                  userId={user?.uid}
                  onOpenEmployee={(id) => {
                    if (id === 'sales_coordinator') {
                      navigateTo('employee_sales_coordinator');
                    }
                  }}
                  onOpenHireModal={() => setIsHireModalOpen(true)}
                  leads={leads}
                  activities={activities}
                  tasks={tasks}
                  companyProfile={companyProfile}
                  onUpdateCompanyProfile={handleUpdateCompanyProfile}
                  onClearActivity={handleClearActivity}
                  onResetDefaultData={handleResetDefaultData}
                  onResetDemoData={handleResetDefaultData}
                  onViewLeadDetail={setSelectedLeadDetail}
                  onNavigateToInbox={() => navigateTo('workspace', 'work_queue')}
                  onNavigateToSettings={() => {
                    navigateTo('workspace', 'settings');
                  }}
                  onSignOutRedirect={() => {
                    navigateTo('landing');
                  }}
                />
              </motion.div>
            )}

            {currentView === 'employee_sales_coordinator' && (
              <motion.div
                key="view-sales-coordinator"
                initial={{ opacity: 0, scale: 0.98, rotateX: 3, y: 10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, rotateX: -3, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-full"
              >
                <SalesCoordinatorWorkspace
                  onBackToWorkspace={() => {
                    navigateTo('workspace', 'workspace_home');
                  }}
                  userId={user?.uid}
                  leads={leads}
                  activities={activities}
                  tasks={tasks}
                  companyProfile={companyProfile}
                  onSelectLead={setSelectedLeadDetail}
                  onToggleTask={handleToggleTask}
                  onClearActivity={handleClearActivity}
                  onUpdateCompanyProfile={handleUpdateCompanyProfile}
                  onResetDefaultData={handleResetDefaultData}
                  onResetDemoData={handleResetDefaultData}
                  onOpenNewInquiryModal={() => setIsNewInboundModalOpen(true)}
                  onLeadAutoCreated={(newLead) => setSelectedLeadDetail(newLead)}
                  onSignOutRedirect={() => {
                    navigateTo('landing');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Contact Footer on bottom of all workspace pages */}
        <ContactFooter />
      </main>

      {/* Hire Catalog Modal */}
      <HireEmployeeModal
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
      />

      {/* Lead Detail Modal */}
      <InquiryDetailModal
        lead={selectedLeadDetail}
        companyName={companyProfile.name}
        onClose={() => setSelectedLeadDetail(null)}
        onApproveAndSend={handleApproveAndSend}
        onRejectInquiry={handleRejectInquiry}
        onUpdateLeadStatus={handleUpdateLeadStatus}
        onUpdateReplyDraft={handleUpdateReplyDraft}
        onSaveManualNotes={handleSaveManualNotes}
        onDeleteInquiry={handleDeleteInquiry}
      />

      {/* New Inbound Customer Inquiry Modal */}
      <NewInboundModal
        isOpen={isNewInboundModalOpen}
        onClose={() => setIsNewInboundModalOpen(false)}
        companyProfile={companyProfile}
        onInquiryAnalyzed={handleInquiryAnalyzed}
      />

      {/* Auth Modal if triggered */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Global Interactive Chat Preview Modal */}
      <LiveWidgetPreviewModal
        isOpen={isGlobalPreviewOpen}
        onClose={() => setIsGlobalPreviewOpen(false)}
        companyProfile={companyProfile}
        userId={user?.uid}
        widgetId={companyProfile.widget_id || (user?.uid ? getOrCreateWidgetId(user.uid) : undefined)}
        onNavigateToStudio={() => {
          setIsGlobalPreviewOpen(false);
          navigateTo('workspace', 'widget_studio');
        }}
      />
    </div>
  );
}
