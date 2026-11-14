import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  Sparkles,
  Brain,
  Compass,
  PenTool,
  Calendar,
  Share2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  Layers,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Youtube,
  Instagram,
  Linkedin,
  Twitter,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  FileText,
  Check,
  X,
  ChevronRight,
  ArrowRight,
  Sliders,
  Copy,
  Hash,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import {
  MarketingTab,
  MarketingBrainData,
  MarketingResearchItem,
  MarketingContentItem,
  PublishingConnection,
  PublishingSettings,
  MarketingLearningInsight,
  ContentPlatform,
  ContentFormat,
  ContentItemStatus,
} from '../../types.ts';
import { marketingService } from '../../services/marketingService.ts';

interface AdminMarketingTabProps {
  userRole?: string;
  userEmail?: string;
}

export const AdminMarketingTab: React.FC<AdminMarketingTabProps> = ({
  userRole = 'Admin',
  userEmail = 'operator@aiworkforce.io',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MarketingTab>('command_center');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Core Data States
  const [brain, setBrain] = useState<MarketingBrainData | null>(null);
  const [researchItems, setResearchItems] = useState<MarketingResearchItem[]>([]);
  const [contentItems, setContentItems] = useState<MarketingContentItem[]>([]);
  const [connections, setConnections] = useState<PublishingConnection[]>([]);
  const [settings, setSettings] = useState<PublishingSettings | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Studio Generator Form State
  const [selectedPlatform, setSelectedPlatform] = useState<ContentPlatform>('linkedin');
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>('carousel');
  const [generatorTopic, setGeneratorTopic] = useState('');
  const [generatorObjective, setGeneratorObjective] = useState('');
  const [generatorCustomNotes, setGeneratorCustomNotes] = useState('');
  const [selectedResearchForStudio, setSelectedResearchForStudio] = useState<string>('');

  // Active Content Item for inspection / editing
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedBodyScript, setEditedBodyScript] = useState('');
  const [editedCaption, setEditedCaption] = useState('');
  const [editedHook, setEditedHook] = useState('');

  // Research Form
  const [researchTopicInput, setResearchTopicInput] = useState('');
  const [researchFocusInput, setResearchFocusInput] = useState('');

  // Filter in Calendar & Queue
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Schedule modal state
  const [scheduleModalItem, setScheduleModalItem] = useState<MarketingContentItem | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setErrorMessage(null);
    } else {
      setErrorMessage(msg);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4500);
  };

  // Load all initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [b, r, c, conn, s, an, logs] = await Promise.all([
        marketingService.getBrain(),
        marketingService.getResearch(),
        marketingService.getContent(),
        marketingService.getPublishingConnections(),
        marketingService.getPublishingSettings(),
        marketingService.getAnalytics(),
        marketingService.getAuditLogs(),
      ]);
      setBrain(b);
      setResearchItems(r);
      setContentItems(c);
      setConnections(conn);
      setSettings(s);
      setAnalytics(an);
      setAuditLogs(logs);

      if (c.length > 0 && !activeContentId) {
        setActiveContentId(c[0].id);
        setEditedHook(c[0].hook);
        setEditedBodyScript(c[0].bodyScript);
        setEditedCaption(c[0].caption);
      }
    } catch (err: any) {
      console.error('Failed to load marketing co-founder data:', err);
      showNotification('error', err.message || 'Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Check for OAuth redirect response from Google
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === 'youtube') {
      showNotification('success', 'YouTube channel successfully connected and verified via Google OAuth 2.0!');
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]oauth_success=youtube/, '').replace(/[?&]oauth_error=[^&]*/, '');
      window.history.replaceState({}, document.title, newUrl);
    } else if (params.get('oauth_error')) {
      showNotification('error', `OAuth Connection failed: ${params.get('oauth_error')}`);
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]oauth_error=[^&]*/, '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Update active item fields when selection changes
  useEffect(() => {
    if (activeContentId) {
      const found = contentItems.find((c) => c.id === activeContentId);
      if (found) {
        setEditedHook(found.hook);
        setEditedBodyScript(found.bodyScript);
        setEditedCaption(found.caption);
      }
    }
  }, [activeContentId, contentItems]);

  // Actions
  const handleGenerateResearch = async () => {
    setActionLoading('research');
    try {
      const res = await marketingService.generateResearch(researchTopicInput, researchFocusInput);
      setResearchItems(res.research);
      setResearchTopicInput('');
      setResearchFocusInput('');
      showNotification('success', 'Generated new high-conviction marketing opportunities.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to generate research');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertResearchToContent = (item: MarketingResearchItem) => {
    setSelectedPlatform(item.suggestedPlatform === 'multi-platform' ? 'linkedin' : item.suggestedPlatform);
    setSelectedFormat(item.suggestedFormat);
    setGeneratorTopic(item.topic);
    setGeneratorObjective(`Convert insight: ${item.contentOpportunity}`);
    setSelectedResearchForStudio(item.id);
    setActiveSubTab('content_studio');
  };

  const handleGenerateStudioContent = async () => {
    setActionLoading('studio_generate');
    try {
      const res = await marketingService.generateContent({
        platform: selectedPlatform,
        format: selectedFormat,
        topic: generatorTopic || undefined,
        objective: generatorObjective || undefined,
        customInstructions: generatorCustomNotes || undefined,
        researchItemId: selectedResearchForStudio || undefined,
      });

      setContentItems((prev) => [res.item, ...prev]);
      setActiveContentId(res.item.id);
      setIsEditingContent(false);
      showNotification('success', `Created new ${res.item.format} asset for ${res.item.platform.toUpperCase()}`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to generate content asset');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveContentEdits = async (item: MarketingContentItem) => {
    setActionLoading('save_content');
    try {
      const res = await marketingService.updateContent(item.id, {
        hook: editedHook,
        bodyScript: editedBodyScript,
        caption: editedCaption,
      });
      setContentItems((prev) => prev.map((c) => (c.id === item.id ? res.item : c)));
      setIsEditingContent(false);
      showNotification('success', 'Content draft updated successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save changes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: ContentItemStatus, note?: string) => {
    setActionLoading(`status_${itemId}`);
    try {
      const res = await marketingService.updateContentStatus(itemId, newStatus, note);
      setContentItems((prev) => prev.map((c) => (c.id === itemId ? res.item : c)));
      showNotification('success', `Asset status transitioned to ${newStatus}`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to transition status');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishNow = async (itemId: string) => {
    setActionLoading(`publish_${itemId}`);
    try {
      const res = await marketingService.publishNow(itemId);
      await loadAllData();
      showNotification('success', res.result?.message || 'Content dispatched to platform!');
    } catch (err: any) {
      showNotification('error', err.message || 'Publishing failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModalItem || !scheduledDateTime) return;
    setActionLoading('schedule_modal');
    try {
      await marketingService.schedulePost(scheduleModalItem.id, scheduledDateTime);
      await loadAllData();
      setScheduleModalItem(null);
      setScheduledDateTime('');
      showNotification('success', `Scheduled asset for ${new Date(scheduledDateTime).toLocaleString()}`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to schedule');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this marketing asset?')) return;
    try {
      const res = await marketingService.deleteContent(id);
      setContentItems(res.content);
      if (activeContentId === id) {
        setActiveContentId(res.content[0]?.id || null);
      }
      showNotification('success', 'Asset deleted from Content Studio.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete item');
    }
  };

  const handleDeleteResearch = async (id: string) => {
    try {
      const res = await marketingService.deleteResearch(id);
      setResearchItems(res.research);
      showNotification('success', 'Research opportunity removed.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete research');
    }
  };

  const handleConnectChannel = async (conn: PublishingConnection) => {
    if (conn.platform === 'youtube') {
      setActionLoading(`connect_${conn.id}`);
      try {
        const res = await marketingService.connectChannel('youtube');
        if (res.authUrl) {
          showNotification('success', 'Opening Google Cloud OAuth 2.0 consent authorization...');
          window.location.href = res.authUrl;
          return;
        }
        showNotification('success', res.message || 'Channel connected.');
        await loadAllData();
      } catch (err: any) {
        showNotification('error', err.message || 'Failed to connect YouTube channel');
      } finally {
        setActionLoading(null);
      }
    } else {
      showNotification('error', `Platform credentials for ${conn.platform} can be declared in your environment configuration.`);
    }
  };

  // Helper render badge for status
  const getStatusBadge = (status: ContentItemStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'SCHEDULED':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'APPROVED':
        return 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'IN_REVIEW':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'FAILED':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-700';
    }
  };

  const getPlatformIcon = (plat: ContentPlatform) => {
    switch (plat) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-600" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4 text-blue-600" />;
      case 'x':
        return <span className="font-bold text-xs">𝕏</span>;
      default:
        return <Share2 className="w-4 h-4" />;
    }
  };

  const activeItem = contentItems.find((c) => c.id === activeContentId) || contentItems[0];

  const subTabs = [
    { id: 'command_center' as MarketingTab, label: 'Command Center', icon: Megaphone },
    { id: 'marketing_brain' as MarketingTab, label: 'Marketing Brain', icon: Brain },
    { id: 'research' as MarketingTab, label: 'Research Engine', icon: Compass, badge: researchItems.length },
    { id: 'content_studio' as MarketingTab, label: 'Content Studio', icon: PenTool },
    { id: 'content_calendar' as MarketingTab, label: 'Calendar & Queue', icon: Calendar, badge: contentItems.length },
    { id: 'publishing' as MarketingTab, label: 'Publishing & Channels', icon: Share2 },
    { id: 'analytics' as MarketingTab, label: 'Analytics & Learnings', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & AI Employee Identity */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-md">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  AI Marketing Co-Founder
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 font-mono uppercase tracking-wider">
                  Internal AI Employee
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  <span>Online & Guarded</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 max-w-2xl leading-relaxed">
                Autonomous organic marketing, high-conviction research, platform-native content creation, and publishing safety for <strong className="text-slate-800 dark:text-neutral-200">AI Workforce</strong>. Governed by the Company Brain.
              </p>
            </div>
          </div>

          {/* Quick Stats in Header */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Published</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {analytics?.summary?.totalPublished ?? 0}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Scheduled</div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                {analytics?.summary?.scheduledCount ?? 0}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">In Review</div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                {analytics?.summary?.inReviewCount ?? 0}
              </div>
            </div>
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh Marketing Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Floating notifications */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sub-Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black font-bold'
                        : 'bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMMAND CENTER                                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'command_center' && (
        <div className="space-y-6">
          {/* Quick Strategy Status & Safety Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Publishing Mode</span>
                <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {settings?.mode === 'autonomous' ? 'Autonomous Mode' : 'Approval Required'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {settings?.mode === 'autonomous'
                  ? 'Posts adhering strictly to verified Company Brain facts can publish without human click.'
                  : 'Zero autonomous posts sent without explicit Human-in-the-Loop review and signoff.'}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Daily Quota</span>
                <span className="font-mono font-bold text-slate-700 dark:text-neutral-300">
                  Max {settings?.maxPostsPerDay ?? 3} posts/day
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Channels</span>
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Share2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {connections.filter((c) => c.status === 'connected').length} of {connections.length} Connected
              </div>
              <div className="flex items-center gap-2 pt-1">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      conn.status === 'connected'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                        : 'bg-slate-50 dark:bg-neutral-800 text-slate-500 border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    {getPlatformIcon(conn.platform)}
                    <span className="capitalize">{conn.platform}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Manage API credentials & tokens in the Publishing & Channels tab.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Flagship Promotion</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                Alpha
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Active flagship campaign: Sub-minute inbound qualification, zero lead decay, and Company Brain deterministic safety.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target ICPs</span>
                <span className="font-semibold text-slate-800 dark:text-neutral-200">
                  B2B SaaS & Inbound Agencies
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Autonomous Action Queue</h2>
                <p className="text-xs text-slate-500">Run immediate marketing operations backed by Gemini 3.8 Flash.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => {
                  setActiveSubTab('research');
                  handleGenerateResearch();
                }}
                disabled={actionLoading === 'research'}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <Compass className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Discover Opportunities</div>
                <div className="text-[11px] text-slate-500 mt-1">Scan B2B buyer trends & speed-to-lead benchmarks</div>
              </button>

              <button
                onClick={() => {
                  setActiveSubTab('content_studio');
                  setSelectedPlatform('linkedin');
                  setSelectedFormat('carousel');
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <PenTool className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Draft Content Asset</div>
                <div className="text-[11px] text-slate-500 mt-1">Generate platform-native carousel, video script, or post</div>
              </button>

              <button
                onClick={() => {
                  setActiveSubTab('content_calendar');
                  setFilterStatus('IN_REVIEW');
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Review Pending Queue</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {contentItems.filter((c) => c.status === 'IN_REVIEW').length} assets awaiting human approval
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveSubTab('marketing_brain');
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Sync Marketing Brain</div>
                <div className="text-[11px] text-slate-500 mt-1">Configure brand rules, banned claims, and pillars</div>
              </button>
            </div>
          </div>

          {/* Recent Operations & Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Queue Snapshot */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent Studio Assets
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('content_calendar')}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  View All ({contentItems.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {contentItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveContentId(item.id);
                      setActiveSubTab('content_studio');
                    }}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 hover:border-black dark:hover:border-white transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center shrink-0 shadow-2xs">
                        {getPlatformIcon(item.platform)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize flex items-center space-x-1.5 mt-0.5">
                          <span>{item.platform}</span>
                          <span>•</span>
                          <span>{item.format.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Log Stream */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Marketing Co-Founder Audit Log
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Deterministic Records</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-8">
                    No marketing actions recorded yet. All operations will be logged here with actor email and timestamp.
                  </div>
                ) : (
                  auditLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-200 dark:border-neutral-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-neutral-200 font-mono text-[11px]">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{log.details}</p>
                      <div className="text-[9px] text-slate-400 font-mono">{log.actorEmail}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MARKETING BRAIN                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'marketing_brain' && brain && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Marketing Brain & Brand Governance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The single source of marketing truth for AI Workforce. Every prompt, post, and video script is deterministically grounded in these parameters.
              </p>
            </div>
            <button
              onClick={async () => {
                setActionLoading('save_brain');
                try {
                  await marketingService.updateBrain(brain);
                  showNotification('success', 'Marketing Brain rules persisted to Firestore.');
                } catch (err: any) {
                  showNotification('error', err.message || 'Failed to save brain');
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === 'save_brain'}
              className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer flex items-center space-x-2 shrink-0 shadow-xs"
            >
              {actionLoading === 'save_brain' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save & Sync Brain</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Brand Positioning & Voice */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-neutral-800">
                <Brain className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Brand Identity & Positioning
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Brand Positioning</label>
                  <textarea
                    rows={2}
                    value={brain.brand.brandPositioning}
                    onChange={(e) =>
                      setBrain({
                        ...brain,
                        brand: { ...brain.brand, brandPositioning: e.target.value },
                      })
                    }
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-medium focus:ring-1 focus:ring-black dark:focus:ring-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Brand Voice & Tone</label>
                  <input
                    type="text"
                    value={brain.brand.brandVoice}
                    onChange={(e) =>
                      setBrain({
                        ...brain,
                        brand: { ...brain.brand, brandVoice: e.target.value },
                      })
                    }
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-medium outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Approved Terminology</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {brain.brand.approvedTerminology.map((term, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-mono text-slate-800 dark:text-neutral-200"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Target Audience & ICPs */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-neutral-800">
                <Compass className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Ideal Customer Profiles (ICPs)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Primary Buyer Roles</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {brain.targetAudience.buyerRoles.map((role, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 text-[11px] font-semibold"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Core Pain Points Solved</label>
                  <ul className="space-y-1.5 mt-1 text-slate-600 dark:text-neutral-400">
                    {brain.targetAudience.painPoints.map((point, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Key Desired Outcomes</label>
                  <ul className="space-y-1.5 mt-1 text-slate-600 dark:text-neutral-400">
                    {brain.targetAudience.desiredOutcomes.map((outcome, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3: Brand Rules & Safety Guardrails */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4 lg:col-span-2">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-neutral-800">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Deterministic Brand Guardrails & Strict Safety Policies
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved Factual Claims</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-700 dark:text-neutral-300">
                    {brain.brandRules.approvedClaims.map((claim, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{claim}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-2">
                  <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center space-x-1.5">
                    <X className="w-4 h-4" />
                    <span>Strictly Prohibited Claims</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-700 dark:text-neutral-300">
                    {brain.brandRules.prohibitedClaims.map((claim, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-rose-600 font-bold">✗</span>
                        <span>{claim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Banned Hype Phrases (Never Permitted in AI Copy)
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {brain.brandRules.phrasesToAvoid.map((phrase, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[11px] font-mono"
                    >
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RESEARCH ENGINE (GEMINI-BACKED)                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'research' && (
        <div className="space-y-6">
          {/* Research Generation Form */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Opportunity & Market Research Engine
                </h2>
                <p className="text-xs text-slate-500">
                  Uncovers high-conviction market debates, B2B SaaS lead response decay data, and enterprise pain points.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[10px] font-bold font-mono">
                Powered by Gemini 3.8 Flash
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Specific Topic or Angle</label>
                <input
                  type="text"
                  placeholder="e.g. Speed-to-lead statistics, Friday night inbound decay, Raw LLM hallucinations"
                  value={researchTopicInput}
                  onChange={(e) => setResearchTopicInput(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-medium outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Target ICP / Industry Focus</label>
                <input
                  type="text"
                  placeholder="e.g. B2B SaaS Founders ($1M-$10M ARR), Inbound Agencies, Custom Manufacturing"
                  value={researchFocusInput}
                  onChange={(e) => setResearchFocusInput(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-medium outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerateResearch}
                disabled={actionLoading === 'research'}
                className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer flex items-center space-x-2 shadow-xs"
              >
                {actionLoading === 'research' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Run Opportunity Scan</span>
              </button>
            </div>
          </div>

          {/* Research Results Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Discovered Opportunities ({researchItems.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {researchItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {item.topic}
                      </h4>
                      <button
                        onClick={() => handleDeleteResearch(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Research"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                      {item.whyItMatters}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Content Angle</div>
                      <div className="text-xs font-medium text-slate-800 dark:text-neutral-200">
                        {item.contentOpportunity}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-bold flex items-center space-x-1">
                        {getPlatformIcon(item.suggestedPlatform as any)}
                        <span className="capitalize">{item.suggestedPlatform}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 font-semibold uppercase">
                        {item.suggestedFormat.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 truncate max-w-[180px]">
                        Source: {item.source}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex justify-end">
                    <button
                      onClick={() => handleConvertResearchToContent(item)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Convert to Content Studio</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONTENT STUDIO (NATIVE ASSET GENERATOR)                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'content_studio' && (
        <div className="space-y-6">
          {/* Generator Controls */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Autonomous Content Studio
                </h2>
                <p className="text-xs text-slate-500">
                  Generate platform-native carousels, video scripts, text breakdowns, and captions grounded in the Company Brain.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[10px] font-bold font-mono">
                Gemini 3.8 Flash Native
              </span>
            </div>

            {/* Platform Selector Tabs */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Target Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1.5">
                {(['linkedin', 'x', 'youtube', 'instagram'] as ContentPlatform[]).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => {
                      setSelectedPlatform(plat);
                      if (plat === 'linkedin') setSelectedFormat('carousel');
                      else if (plat === 'x') setSelectedFormat('text_post');
                      else if (plat === 'youtube') setSelectedFormat('youtube_video');
                      else if (plat === 'instagram') setSelectedFormat('carousel');
                    }}
                    className={`p-3 rounded-2xl border flex items-center space-x-2.5 text-xs font-bold transition-all cursor-pointer ${
                      selectedPlatform === plat
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black shadow-xs'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400 text-slate-700 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-800/60'
                    }`}
                  >
                    {getPlatformIcon(plat)}
                    <span className="capitalize">{plat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Content Format</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  'carousel',
                  'image_post',
                  'short_video',
                  'youtube_video',
                  'youtube_short',
                  'text_post',
                  'educational_post',
                  'founder_post',
                ].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt as ContentFormat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer ${
                      selectedFormat === fmt
                        ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-black border-transparent font-bold'
                        : 'bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    {fmt.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Topic / Core Proposition</label>
                <input
                  type="text"
                  placeholder="e.g. The 5-Minute Lead Rule in B2B"
                  value={generatorTopic}
                  onChange={(e) => setGeneratorTopic(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-medium outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Campaign Goal / Call-to-Action Target</label>
                <input
                  type="text"
                  placeholder="e.g. Drive free 14-day evaluation signups for Alpha"
                  value={generatorObjective}
                  onChange={(e) => setGeneratorObjective(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-medium outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerateStudioContent}
                disabled={actionLoading === 'studio_generate'}
                className="px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer flex items-center space-x-2 shadow-xs"
              >
                {actionLoading === 'studio_generate' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Synthesize Marketing Asset</span>
              </button>
            </div>
          </div>

          {/* Active Asset Viewer & Editor */}
          {activeItem ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-6">
              {/* Asset Header & Action Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-neutral-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800">
                      {getPlatformIcon(activeItem.platform)}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeItem.title}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(activeItem.status)}`}>
                      {activeItem.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 capitalize">
                    {activeItem.platform} • {activeItem.format.replace('_', ' ')} • Created by {activeItem.createdBy}
                  </div>
                </div>

                {/* Status transitions & Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isEditingContent ? (
                    <button
                      onClick={() => handleSaveContentEdits(activeItem)}
                      disabled={actionLoading === 'save_content'}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingContent(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Edit Copy
                    </button>
                  )}

                  {activeItem.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange(activeItem.id, 'IN_REVIEW')}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer"
                    >
                      Submit for Review
                    </button>
                  )}

                  {activeItem.status === 'IN_REVIEW' && (
                    <button
                      onClick={() => handleStatusChange(activeItem.id, 'APPROVED')}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Asset</span>
                    </button>
                  )}

                  {activeItem.status === 'APPROVED' && (
                    <>
                      <button
                        onClick={() => {
                          setScheduleModalItem(activeItem);
                          const future = new Date(Date.now() + 3600000 * 24);
                          setScheduledDateTime(future.toISOString().slice(0, 16));
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Schedule</span>
                      </button>

                      <button
                        onClick={() => handlePublishNow(activeItem.id)}
                        disabled={actionLoading === `publish_${activeItem.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        {actionLoading === `publish_${activeItem.id}` ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Publish Now</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDeleteContent(activeItem.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Copy & Script */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Hook */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                      Scroll-Stopping Hook
                    </span>
                    {isEditingContent ? (
                      <textarea
                        rows={2}
                        value={editedHook}
                        onChange={(e) => setEditedHook(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 outline-hidden font-medium"
                      />
                    ) : (
                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        "{activeItem.hook}"
                      </div>
                    )}
                  </div>

                  {/* Body Copy / Slides / Script */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Full Content / Slide Breakdown / Script
                    </span>
                    {isEditingContent ? (
                      <textarea
                        rows={10}
                        value={editedBodyScript}
                        onChange={(e) => setEditedBodyScript(e.target.value)}
                        className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 outline-hidden font-mono leading-relaxed"
                      />
                    ) : (
                      <div className="text-xs text-slate-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed font-sans">
                        {activeItem.bodyScript}
                      </div>
                    )}
                  </div>

                  {/* Caption & Hashtags */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Platform Caption</span>
                    {isEditingContent ? (
                      <textarea
                        rows={3}
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 outline-hidden font-medium"
                      />
                    ) : (
                      <div className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed">
                        {activeItem.caption}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 dark:border-neutral-700">
                      {activeItem.hashtags.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold"
                        >
                          #{h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Col: Visual Direction & Prompts */}
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center space-x-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Art Direction & Visual Cues</span>
                    </span>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                      {activeItem.visualDirection || 'Minimalist high-contrast obsidian aesthetic.'}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Creative Generation Prompt</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeItem.creativePrompt);
                          showNotification('success', 'Creative prompt copied to clipboard!');
                        }}
                        className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white"
                        title="Copy Prompt"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-slate-700 dark:text-neutral-300 p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 leading-relaxed">
                      {activeItem.creativePrompt}
                    </p>
                  </div>

                  {activeItem.description && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500">YouTube Video Description</span>
                      <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                        {activeItem.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-400">
              No content asset selected. Generate a new asset above or select one from the Calendar & Queue.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONTENT CALENDAR & QUEUE                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'content_calendar' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Content Calendar & Release Queue</h2>
              <p className="text-xs text-slate-500">
                Track production stages, scheduled release windows, and publication history across all platforms.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-semibold outline-hidden"
              >
                <option value="all">All Platforms</option>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X (Twitter)</option>
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-semibold outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {contentItems
              .filter((c) => filterPlatform === 'all' || c.platform === filterPlatform)
              .filter((c) => filterStatus === 'all' || c.status === filterStatus)
              .map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs hover:border-slate-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-neutral-700">
                      {getPlatformIcon(item.platform)}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">"{item.hook}"</p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 capitalize">
                        <span className="font-semibold text-slate-700 dark:text-neutral-300">{item.platform}</span>
                        <span>•</span>
                        <span>{item.format.replace('_', ' ')}</span>
                        {item.scheduledFor && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Scheduled for {new Date(item.scheduledFor).toLocaleString()}
                            </span>
                          </>
                        )}
                        {item.publishedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Published on {new Date(item.publishedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setActiveContentId(item.id);
                        setActiveSubTab('content_studio');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Open in Studio
                    </button>

                    {item.status === 'APPROVED' && (
                      <button
                        onClick={() => handlePublishNow(item.id)}
                        disabled={actionLoading === `publish_${item.id}`}
                        className="px-3 py-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PUBLISHING & CHANNELS                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'publishing' && (
        <div className="space-y-6">
          {/* Autonomous Safety Policy Toggle */}
          {settings && (
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Publishing Mode & Human-in-the-Loop Controls
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure whether the AI Marketing Co-Founder requires human signoff before sending, or operates autonomously within strict daily quotas.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={async () => {
                      const nextMode = settings.mode === 'approval_required' ? 'autonomous' : 'approval_required';
                      try {
                        const updated = await marketingService.updatePublishingSettings({ mode: nextMode });
                        setSettings(updated.settings);
                        showNotification('success', `Publishing mode switched to: ${nextMode}`);
                      } catch (e: any) {
                        showNotification('error', e.message || 'Failed to update settings');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      settings.mode === 'autonomous'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                    }`}
                  >
                    {settings.mode === 'autonomous' ? '⚡ Autonomous Mode (Active)' : '🔒 Strict Approval Required'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-neutral-800 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Max Posts Per Day</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxPostsPerDay}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val > 0) {
                        const updated = await marketingService.updatePublishingSettings({ maxPostsPerDay: val });
                        setSettings(updated.settings);
                      }
                    }}
                    className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Allowed Window Start</label>
                  <input
                    type="time"
                    value={settings.allowedPostingHoursStart}
                    onChange={async (e) => {
                      const updated = await marketingService.updatePublishingSettings({ allowedPostingHoursStart: e.target.value });
                      setSettings(updated.settings);
                    }}
                    className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Allowed Window End</label>
                  <input
                    type="time"
                    value={settings.allowedPostingHoursEnd}
                    onChange={async (e) => {
                      const updated = await marketingService.updatePublishingSettings({ allowedPostingHoursEnd: e.target.value });
                      setSettings(updated.settings);
                    }}
                    className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Social Platform Connections */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Social Channels & Direct Dispatch Integrations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-center border border-slate-200 dark:border-neutral-700">
                          {getPlatformIcon(conn.platform)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                            {conn.platform} Channel
                          </h4>
                          <div className="text-[10px] text-slate-400">
                            {conn.accountName || 'Official Company Account'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${
                          conn.status === 'connected'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {conn.status.replace('_', ' ')}
                      </span>
                    </div>

                    {conn.errorReason && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                        <span className="font-bold text-slate-800 dark:text-neutral-200">Notice: </span>
                        {conn.errorReason}
                      </div>
                    )}

                    {conn.channelUrl && (
                      <div className="text-xs">
                        <a
                          href={conn.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <span>{conn.channelUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {conn.connectedAt ? `Connected ${new Date(conn.connectedAt).toLocaleDateString()}` : 'Google OAuth 2.0 authorization'}
                    </span>
                    {conn.status === 'connected' ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </span>
                        {conn.channelUrl && (
                          <a
                            href={conn.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer flex items-center space-x-1"
                          >
                            <span>Channel</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnectChannel(conn)}
                        disabled={actionLoading === `connect_${conn.id}`}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 shadow-xs"
                      >
                        {actionLoading === `connect_${conn.id}` ? (
                          <span>Connecting...</span>
                        ) : (
                          <>
                            <Youtube className="w-3.5 h-3.5" />
                            <span>Connect Channel</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ANALYTICS & LEARNINGS                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Autonomous Marketing Learning Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The AI Marketing Co-Founder tracks which hooks, structures, and timing yield the highest conversion into inbound sales pipeline.
            </p>
          </div>

          {/* Learnings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(analytics?.insights || []).map((ins: MarketingLearningInsight) => (
              <div
                key={ins.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono">
                      Confidence: {ins.confidence}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {ins.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                    {ins.observation}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-neutral-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Actionable Rule</div>
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mt-0.5">
                    {ins.suggestedAction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Picker Modal */}
      <AnimatePresence>
        {scheduleModalItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Release</h3>
                </div>
                <button
                  onClick={() => setScheduleModalItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Scheduling: <strong className="text-slate-800 dark:text-neutral-200">{scheduleModalItem.title}</strong>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Target Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full mt-1.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-semibold outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setScheduleModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSubmit}
                  disabled={actionLoading === 'schedule_modal' || !scheduledDateTime}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  {actionLoading === 'schedule_modal' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Schedule</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
