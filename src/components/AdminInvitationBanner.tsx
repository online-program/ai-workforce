import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Check, X, Loader2, Sparkles } from 'lucide-react';
import { AdminRole, adminService } from '../services/adminService.ts';

interface AdminInvitationBannerProps {
  invitations: Array<{
    id: string;
    email: string;
    role: AdminRole;
    invitedByEmail?: string;
    invitedByRole?: string;
    invitedAt: string;
  }>;
  onAccepted: (role: AdminRole) => void;
  onDismissed: () => void;
}

export const AdminInvitationBanner: React.FC<AdminInvitationBannerProps> = ({
  invitations,
  onAccepted,
  onDismissed,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<AdminRole | null>(null);

  if (!invitations || invitations.length === 0) return null;

  const currentInvite = invitations[0];

  const handleAccept = async () => {
    setProcessingId(currentInvite.id);
    setError(null);
    try {
      const res = await adminService.acceptInvitation(currentInvite.id);
      setSuccessRole(res.assignedRole || currentInvite.role);
      setTimeout(() => {
        onAccepted(res.assignedRole || currentInvite.role);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    setProcessingId(currentInvite.id);
    setError(null);
    try {
      await adminService.rejectInvitation(currentInvite.id);
      onDismissed();
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
      setProcessingId(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white border-b border-purple-800/40 px-4 py-3 shadow-lg relative z-30"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Shield className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold tracking-tight text-purple-100">
                  Authority Invitation Received
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/30 text-[10px] font-mono font-bold text-purple-200">
                  {currentInvite.role}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 mt-0.5">
                {currentInvite.invitedByEmail ? (
                  <>
                    <strong className="text-white">{currentInvite.invitedByEmail}</strong> invited you to join the AI Workforce leadership team as an authorized <strong className="text-purple-300">{currentInvite.role}</strong>.
                  </>
                ) : (
                  <>
                    You have been invited to join the AI Workforce administration team as <strong className="text-purple-300">{currentInvite.role}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          {successRole ? (
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Role Activated: {successRole}! Redirecting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 shrink-0">
              {error && (
                <span className="text-[11px] text-rose-300 bg-rose-950/80 px-2 py-1 rounded border border-rose-800">
                  {error}
                </span>
              )}
              <button
                onClick={handleReject}
                disabled={processingId !== null}
                className="px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={processingId !== null}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {processingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Authority Role</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
