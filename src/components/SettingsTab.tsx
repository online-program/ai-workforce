import React, { useState } from 'react';
import { Save, Building2, Shield, User, LogOut, Mail, CheckCircle2, AlertCircle, RefreshCw, Send, Palette } from 'lucide-react';
import { CompanyProfile } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { sendGmailMessage } from '../services/gmailService.ts';
import { ThemeToggle } from '../context/ThemeContext.tsx';
import { SavePublishButton } from './SavePublishButton.tsx';

interface SettingsTabProps {
  companyProfile: CompanyProfile;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  onResetDefaultData?: () => void;
  onResetDemoData?: () => void;
  onSignOutRedirect?: () => void;
  onOpenAlphaConfig?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  companyProfile,
  onUpdateCompanyProfile,
  onSignOutRedirect,
}) => {
  const { user, logout, accessToken, connectGmail, isGmailConnected } = useAuth();
  const [formData, setFormData] = useState<CompanyProfile>(companyProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [gmailStatusNotice, setGmailStatusNotice] = useState<string | null>(null);

  // Test email state
  const [testEmailTo, setTestEmailTo] = useState(user?.email || '');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState(false);

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

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailStatusNotice(null);
    try {
      const token = await connectGmail();
      if (token) {
        setGmailStatusNotice('Gmail Workspace successfully connected and authorized!');
      }
    } catch (err: any) {
      setGmailStatusNotice(err.message || 'Failed to connect Gmail account.');
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailSuccess(false);
    setGmailStatusNotice(null);
    try {
      let token = accessToken;
      if (!token) {
        token = await connectGmail();
      }
      if (!token) {
        throw new Error('Gmail authorization required.');
      }

      await sendGmailMessage(
        token,
        testEmailTo.trim(),
        `Test Dispatch from Alpha — ${formData.name}`,
        `Hi there!\n\nThis is a verified test email sent from your AI Workforce Alpha conversational AI connected via Google Workspace Gmail API.\n\nEverything is operational!\n\nBest regards,\n${formData.name} AI Team`
      );

      setTestEmailSuccess(true);
      setGmailStatusNotice(`Test email delivered to ${testEmailTo}!`);
    } catch (err: any) {
      console.error('Test email failed:', err);
      setGmailStatusNotice(err.message || 'Failed to send test email.');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onUpdateCompanyProfile(formData);
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-neutral-800">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-black dark:text-white">
          Settings & Integrations
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-0.5">
          Configure verified company context, Google Workspace Gmail connectivity, and your user session.
        </p>
      </div>

      {/* Global Theme & Appearance Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white">Appearance & Theme</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Switch between high-contrast Light mode and refined Dark mode. Persists across all pages and sessions.
              </p>
            </div>
          </div>
          <div>
            <ThemeToggle variant="badge" />
          </div>
        </div>
      </div>

      {/* 1. Gmail Workspace Integration Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-black dark:text-white">Google Workspace (Gmail) Integration</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-black dark:text-white border border-slate-200 dark:border-neutral-700">
                  {isGmailConnected || user ? 'CONNECTED' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Empowers Alpha to draft and dispatch replies directly through your business Gmail.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectGmail}
            disabled={isConnectingGmail}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isConnectingGmail ? 'animate-spin' : ''}`} />
            <span>{isGmailConnected ? 'Re-authorize Gmail' : 'Connect Gmail Account'}</span>
          </button>
        </div>

        {gmailStatusNotice && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-black dark:text-white flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{gmailStatusNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 space-y-2">
            <div className="font-bold text-black dark:text-white">Active Sender Account</div>
            <p className="text-slate-600 dark:text-neutral-400 text-[11px]">
              Session Account: <span className="font-mono font-semibold text-black dark:text-white">{user?.email || 'Authenticated Account'}</span>
            </p>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 space-y-0.5">
              <div>✓ Inbound webhook listener active</div>
              <div>✓ Automated quotation draft builder active</div>
              <div>✓ Human approval required before dispatch</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 space-y-2">
            <div className="font-bold text-black dark:text-white">Send Test Verification Email</div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Verify your Gmail sending permission by sending a quick test message:
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTestEmail ? 'Sending...' : 'Test'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Company Profile Quick Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white">Workspace Entity Profile</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Primary business configuration used across email signatures and dashboard reports.
              </p>
            </div>
          </div>

          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800 animate-in fade-in">
              ✓ Saved Changes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white font-semibold text-black dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-black dark:text-white"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>Handoff Notification Recipient Email</span>
              {!(formData.contactInformation?.email || formData.email) && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  ⚠️ Action Required
                </span>
              )}
            </label>
            <input
              type="email"
              value={formData.contactInformation?.email || formData.email || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({
                  ...formData,
                  email: val,
                  contactInformation: {
                    ...(formData.contactInformation || {}),
                    email: val,
                  },
                });
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-black dark:text-white font-mono"
              placeholder="admin@yourcompany.com"
            />
            {!(formData.contactInformation?.email || formData.email) && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                Human handoff notifications aren't configured yet. Connect a notification channel so your team can be alerted when Alpha needs a human.
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end">
          <SavePublishButton onSave={() => handleSubmit()} label="Save Profile & Notifications" />
        </div>
      </form>

      {/* 3. User Account & Session Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white">Supervisor Session</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Manage your active supervisor session and account identity.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            {user ? 'AUTHENTICATED' : 'ACTIVE'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-black dark:text-white">
              {user?.email || 'Active Supervisor'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
              Account ID: {user?.uid || 'Isolated Local Workspace'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Sign out of your AI Workforce account"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* 4. Product Feedback & AI Quality Reporting */}
      <div className="p-6 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-black dark:text-white">Product Feedback & AI Tuning</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Report an incorrect AI answer, propose a business guardrail, or report a widget issue.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 space-y-3">
          <div className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
            Need to tune Alpha's responses? You can update your <strong>Company Brain</strong> at any time to add new product specifications, price lists, or operating rules.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
              Support & Feedback Channel: <a href="mailto:support.aiworkforce@gmail.com" className="text-black dark:text-white font-semibold underline">support.aiworkforce@gmail.com</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
