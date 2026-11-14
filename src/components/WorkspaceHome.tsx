import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WorkspaceTab,
  InquiryLead,
  ActivityLog,
  SalesTask,
  CompanyProfile,
  WidgetConfig,
  WidgetConversation,
} from '../types.ts';
import { CompanyBrainTab } from './CompanyBrainTab.tsx';
import { SettingsTab } from './SettingsTab.tsx';
import { LeadsTab } from './LeadsTab.tsx';
import { ActivityTab } from './ActivityTab.tsx';
import { AIEmployeesTab } from './AIEmployeesTab.tsx';
import { OverviewTab } from './OverviewTab.tsx';
import { ConversationsTab } from './ConversationsTab.tsx';
import { WidgetStudio } from './WidgetStudio.tsx';
import { WebsiteChatTab } from './WebsiteChatTab.tsx';
import { AlphaConfigurationModal } from './AlphaConfigurationModal.tsx';
import { LiveWidgetPreviewModal } from './LiveWidgetPreviewModal.tsx';
import { getWidgetConfig, saveWidgetConfig, getOrCreateWidgetId } from '../services/workspaceService.ts';
import { generateAlphaVisitorGreeting } from '../utils/alphaWelcomeUtils.ts';

interface WorkspaceHomeProps {
  currentTab: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
  onOpenEmployee: (id: string) => void;
  onOpenHireModal: () => void;
  leads: InquiryLead[];
  activities: ActivityLog[];
  tasks: SalesTask[];
  companyProfile: CompanyProfile;
  userId?: string;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  onClearActivity?: () => void;
  onResetDefaultData?: () => void;
  onResetDemoData?: () => void;
  onViewLeadDetail: (lead: InquiryLead) => void;
  onNavigateToInbox: () => void;
  onNavigateToSettings: () => void;
  onSignOutRedirect?: () => void;
}

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({
  currentTab,
  onSelectTab,
  onOpenEmployee,
  onOpenHireModal,
  leads,
  activities,
  tasks,
  companyProfile,
  userId,
  onUpdateCompanyProfile,
  onClearActivity,
  onResetDefaultData,
  onResetDemoData,
  onViewLeadDetail,
  onNavigateToInbox,
  onNavigateToSettings,
  onSignOutRedirect,
}) => {
  // Alpha Configuration Modal state
  const [isAlphaConfigOpen, setIsAlphaConfigOpen] = useState(false);

  // Live Interactive Widget Preview Modal state
  const [isWidgetPreviewOpen, setIsWidgetPreviewOpen] = useState(false);

  // Widget Config State for Widget Studio
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(() => {
    const defaultWidgetId = companyProfile.widget_id || (userId ? getOrCreateWidgetId(userId) : '');
    return {
      widget_id: defaultWidgetId,
      user_id: userId || '',
      business_name: companyProfile.name || 'My Business',
      welcome_message: generateAlphaVisitorGreeting(companyProfile),
      theme_color: '#000000',
      position: 'bottom-right',
      design_style: 'attractive_3d',
      is_active: true,
    };
  });

  useEffect(() => {
    if (!userId) return;
    getWidgetConfig(userId).then((saved) => {
      if (saved) {
        setWidgetConfig(saved);
      }
    });
  }, [userId, companyProfile]);

  const handleSaveWidgetConfig = async (updated: WidgetConfig) => {
    if (!userId) return;
    const saved = await saveWidgetConfig(userId, updated);
    setWidgetConfig(saved || updated);
  };

  // Build conversations list from leads or real chats
  const conversationsList: WidgetConversation[] = useMemo(() => {
    return leads.map((lead) => {
      const messages = Array.isArray(lead.messages) && lead.messages.length > 0
        ? lead.messages
        : [
            {
              id: `msg-user-${lead.id}`,
              sender: 'customer' as const,
              text: lead.original_message || lead.raw_inquiry || 'Inquiry regarding services',
              timestamp: lead.created_at,
            },
            {
              id: `msg-alpha-${lead.id}`,
              sender: 'assistant' as const,
              text: lead.suggested_reply || lead.draft_reply || 'Thank you for reaching out. How can I help you today?',
              timestamp: lead.last_action_at || lead.created_at,
            },
          ];

      return {
        id: lead.conversation_id || `conv-${lead.id}`,
        conversation_id: lead.conversation_id || `conv-${lead.id}`,
        widget_id: (lead as any).widget_id || companyProfile.widget_id || '',
        user_id: (lead as any).user_id || userId || '',
        customer_name: lead.customer_name || 'Website Visitor',
        visitor_id: `vis_${lead.id.substring(0, 8)}`,
        current_intent: lead.customer_intent || 'Product Inquiry',
        lead_score: lead.lead_score,
        intent_score: lead.intent_score || (lead.lead_score === 'HOT' ? 85 : lead.lead_score === 'WARM' ? 55 : 30),
        status: (lead.status === 'Won' || lead.status === 'Qualified' ? 'Lead' : 'Inquiry') as any,
        messages,
        created_at: lead.created_at,
        updated_at: lead.last_action_at || lead.created_at,
      };
    });
  }, [leads]);

  const springVariants = {
    initial: {
      opacity: 0,
      scale: 0.99,
      y: 6,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 380,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.99,
      y: -6,
      transition: {
        duration: 0.12,
      },
    },
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* 1. OVERVIEW TAB */}
        {currentTab === 'workspace_home' && (
          <motion.div
            key="tab-workspace-home"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <OverviewTab
              leads={leads}
              activities={activities}
              tasks={tasks}
              onSelectLead={onViewLeadDetail}
              onNavigateToInbox={onNavigateToInbox}
              onOpenNewInquiryModal={onNavigateToInbox}
              onNavigateToConversations={() => onSelectTab?.('conversations')}
              onNavigateToWidget={() => onSelectTab?.('embed')}
              onOpenWidgetPreview={() => setIsWidgetPreviewOpen(true)}
              onOpenAlphaConfig={() => setIsAlphaConfigOpen(true)}
            />
          </motion.div>
        )}

        {/* 2. AI EMPLOYEES / ALPHA COMMAND TAB */}
        {currentTab === 'employees' && (
          <motion.div
            key="tab-employees"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <AIEmployeesTab
              companyProfile={companyProfile}
              leads={leads}
              onOpenSalesManager={() => onOpenEmployee('sales_coordinator')}
              onOpenOnboardingModal={() => setIsAlphaConfigOpen(true)}
              onOpenAlphaConfig={() => setIsAlphaConfigOpen(true)}
              onOpenPreview={() => setIsWidgetPreviewOpen(true)}
              onNavigateToBrain={() => onSelectTab?.('company_brain')}
              onNavigateToEmbed={() => onSelectTab?.('embed')}
            />
          </motion.div>
        )}

        {/* 3. CONVERSATIONS TAB */}
        {currentTab === 'conversations' && (
          <motion.div
            key="tab-conversations"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <ConversationsTab
              conversations={conversationsList}
              leads={leads}
              onSelectInquiry={onViewLeadDetail}
              onNavigateToLeads={onNavigateToInbox}
            />
          </motion.div>
        )}

        {/* 4. WORK QUEUE / LEADS TAB */}
        {currentTab === 'work_queue' && (
          <motion.div
            key="tab-work-queue"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <LeadsTab
              leads={leads}
              onSelectLead={onViewLeadDetail}
              onOpenNewInquiryModal={onNavigateToInbox}
            />
          </motion.div>
        )}

        {/* 5. COMPANY BRAIN TAB */}
        {currentTab === 'company_brain' && (
          <motion.div
            key="tab-company-brain"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <CompanyBrainTab
              companyProfile={companyProfile}
              onUpdateCompanyProfile={onUpdateCompanyProfile}
              onOpenAlphaConfig={() => setIsAlphaConfigOpen(true)}
            />
          </motion.div>
        )}

        {/* 6. WIDGET STUDIO TAB */}
        {currentTab === 'widget_studio' && (
          <motion.div
            key="tab-widget-studio"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <WidgetStudio
              companyProfile={companyProfile}
              userId={userId}
              initialConfig={widgetConfig}
              onSaveConfig={handleSaveWidgetConfig}
            />
          </motion.div>
        )}

        {/* 7. INSTALL & EMBED TAB */}
        {currentTab === 'embed' && (
          <motion.div
            key="tab-embed"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <WebsiteChatTab
              companyProfile={companyProfile}
              userId={userId}
              onNavigateToWorkQueue={onNavigateToInbox}
            />
          </motion.div>
        )}

        {/* 8. LIVE ACTIVITY TAB */}
        {currentTab === 'activity' && (
          <motion.div
            key="tab-activity"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <ActivityTab activities={activities} onClearActivity={onClearActivity} />
          </motion.div>
        )}

        {/* 9. SETTINGS TAB */}
        {currentTab === 'settings' && (
          <motion.div
            key="tab-settings"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-8 py-6"
          >
            <SettingsTab
              companyProfile={companyProfile}
              onUpdateCompanyProfile={onUpdateCompanyProfile}
              onResetDefaultData={onResetDefaultData || onResetDemoData}
              onResetDemoData={onResetDemoData}
              onSignOutRedirect={onSignOutRedirect}
              onOpenAlphaConfig={() => setIsAlphaConfigOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alpha Configuration Modal */}
      <AlphaConfigurationModal
        isOpen={isAlphaConfigOpen}
        onClose={() => setIsAlphaConfigOpen(false)}
        companyProfile={companyProfile}
        onSaveProfile={onUpdateCompanyProfile}
        onNavigateToBrain={() => onSelectTab?.('company_brain')}
        onOpenPreview={() => {
          setIsAlphaConfigOpen(false);
          setIsWidgetPreviewOpen(true);
        }}
      />

      {/* Live Interactive Widget Preview Modal */}
      <LiveWidgetPreviewModal
        isOpen={isWidgetPreviewOpen}
        onClose={() => setIsWidgetPreviewOpen(false)}
        companyProfile={companyProfile}
        userId={userId}
        onNavigateToStudio={() => onSelectTab?.('widget_studio')}
      />
    </div>
  );
};
