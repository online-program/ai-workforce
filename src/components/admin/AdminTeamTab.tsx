import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  UserCheck,
  UserX,
  AlertTriangle,
  Lock,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  Copy,
  Check,
  Crown,
  Shield,
  TrendingUp,
  Headphones,
  BarChart3,
  User,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  X,
  ChevronDown,
  Trash2,
  PauseCircle,
  PlayCircle,
  KeyRound,
} from 'lucide-react';
import { AdminRole, adminService } from '../../services/adminService.ts';
import { usePermissions, ROLE_RANKS, ROLE_PERMISSIONS_MAP } from '../../hooks/usePermissions.ts';

export interface AdminTeamMember {
  uid: string;
  email: string;
  role: AdminRole;
  displayName?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  assignedBy?: string;
  assignedAt: string;
  notes?: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: AdminRole;
  invitedByEmail: string;
  invitedByUid: string;
  invitedByRole?: AdminRole;
  invitedAt: string;
  expiresAt?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  displayName?: string;
  acceptedAt?: string;
}

export interface UserCandidate {
  uid: string;
  email: string;
  displayName: string;
  currentRole: AdminRole;
  status?: string;
}

interface AdminTeamTabProps {
  team: AdminTeamMember[];
  invitations?: AdminInvitation[];
  currentAdminRole: string;
  currentAdminUid: string;
  onInviteAdmin?: (payload: { email: string; role: string; displayName?: string; confirmationCode?: string; notes?: string }) => Promise<void>;
  onRevokeInvitation?: (payload: { invitationId: string }) => Promise<void>;
  onAssignRole: (payload: { targetUid?: string; targetEmail: string; newRole: string; displayName?: string; confirmationCode?: string; notes?: string; status?: 'ACTIVE' | 'SUSPENDED' }) => Promise<void>;
  onUpdateStatus?: (payload: { targetUid?: string; targetEmail: string; status: 'ACTIVE' | 'SUSPENDED' }) => Promise<void>;
  onRevokeRole: (payload: { targetUid?: string; targetEmail?: string; confirmationText?: string }) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
}

const ROLE_DETAILS: Record<
  AdminRole,
  {
    label: string;
    level: string;
    desc: string;
    icon: React.FC<any>;
    badgeClass: string;
    accentClass: string;
    permissionsSummary: { name: string; granted: boolean }[];
  }
> = {
  CEO: {
    label: 'CEO (Platform Owner)',
    level: 'Level 1',
    desc: 'Absolute sovereign authority across all systems, team roles, and destructive operations.',
    icon: Crown,
    badgeClass: 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800',
    accentClass: 'text-amber-600 dark:text-amber-400',
    permissionsSummary: [
      { name: 'Full Platform & System Control', granted: true },
      { name: 'Role Assignment & Team Invitations', granted: true },
      { name: 'Security Center & Audit Logs', granted: true },
      { name: 'Analytics, Users & Tenants Management', granted: true },
      { name: 'Destructive / Root Operations', granted: true },
    ],
  },
  SUPER_ADMIN: {
    label: 'Super Admin',
    level: 'Level 2',
    desc: 'High-level administrative authority, destructive operations, system configuration, and team management.',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-100 text-purple-950 border border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800',
    accentClass: 'text-purple-600 dark:text-purple-400',
    permissionsSummary: [
      { name: 'Full Platform & System Control', granted: true },
      { name: 'Team Invitations & Staff Management', granted: true },
      { name: 'Security Center & Audit Logs', granted: true },
      { name: 'Analytics, Users & Tenants Management', granted: true },
      { name: 'Destructive / Root Operations', granted: true },
    ],
  },
  ADMIN: {
    label: 'Admin',
    level: 'Level 3',
    desc: 'Standard administrative operations: users, tenants, widgets, work queue, and team invitations.',
    icon: Shield,
    badgeClass: 'bg-blue-100 text-blue-950 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800',
    accentClass: 'text-blue-600 dark:text-blue-400',
    permissionsSummary: [
      { name: 'Platform Dashboard & Analytics', granted: true },
      { name: 'Users & Tenants Management', granted: true },
      { name: 'Team Invitations (CMO, Support, Analyst)', granted: true },
      { name: 'Audit Logs & System Health', granted: true },
      { name: 'Destructive / Root Operations', granted: false },
    ],
  },
  CMO: {
    label: 'CMO (Marketing Lead)',
    level: 'Level 4',
    desc: 'Marketing campaigns, company profile directory, lead inquiries, and analytics.',
    icon: TrendingUp,
    badgeClass: 'bg-pink-100 text-pink-950 border border-pink-300 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-800',
    accentClass: 'text-pink-600 dark:text-pink-400',
    permissionsSummary: [
      { name: 'Analytics & Traffic Insights', granted: true },
      { name: 'Company Profiles & Public Widgets', granted: true },
      { name: 'Lead Inquiries & Conversion Tracking', granted: true },
      { name: 'Team & User Role Management', granted: false },
      { name: 'Security Center & Audit Logs', granted: false },
    ],
  },
  SUPPORT_ADMIN: {
    label: 'Support Admin',
    level: 'Level 5',
    desc: 'Customer conversations, lead inquiries, tickets, and user accounts view.',
    icon: Headphones,
    badgeClass: 'bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    permissionsSummary: [
      { name: 'Customer Inquiries & Conversations', granted: true },
      { name: 'Live Activity Feed', granted: true },
      { name: 'Users & Companies Directory (View Only)', granted: true },
      { name: 'Team & Role Management', granted: false },
      { name: 'Analytics & Financial Telemetry', granted: false },
    ],
  },
  ANALYST: {
    label: 'Analyst',
    level: 'Level 6',
    desc: 'Read-only analytics, visitor behavior telemetry, and system health monitors.',
    icon: BarChart3,
    badgeClass: 'bg-cyan-100 text-cyan-950 border border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-800',
    accentClass: 'text-cyan-600 dark:text-cyan-400',
    permissionsSummary: [
      { name: 'Analytics Dashboards & Metrics', granted: true },
      { name: 'Visitor Sessions & Live Feed', granted: true },
      { name: 'System Health Diagnostics', granted: true },
      { name: 'User / Tenant Modifications', granted: false },
      { name: 'Team & Role Management', granted: false },
    ],
  },
  USER: {
    label: 'Standard User',
    level: 'Level 7',
    desc: 'Standard customer workspace member with no administrative permissions.',
    icon: User,
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300',
    accentClass: 'text-slate-500',
    permissionsSummary: [
      { name: 'Customer Workspace Tools', granted: true },
      { name: 'Admin Control Center Access', granted: false },
      { name: 'Team & Role Management', granted: false },
      { name: 'Platform Telemetry', granted: false },
      { name: 'Destructive Operations', granted: false },
    ],
  },
};

export const AdminTeamTab: React.FC<AdminTeamTabProps> = ({
  team,
  invitations = [],
  currentAdminRole,
  currentAdminUid,
  onInviteAdmin,
  onRevokeInvitation,
  onAssignRole,
  onUpdateStatus,
  onRevokeRole,
  onRefresh,
  loading,
}) => {
  const { actualRole, role: effectiveRole, previewRole, setPreviewRole, clearPreviewRole } = usePermissions();

  // Active view filters
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INVITATIONS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminTeamMember | null>(null);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('ADMIN');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [inviteConfirmationCode, setInviteConfirmationCode] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Assign Role Form State (User Search / Select)
  const [candidates, setCandidates] = useState<UserCandidate[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<UserCandidate | null>(null);
  const [newAssignedRole, setNewAssignedRole] = useState<AdminRole>('ADMIN');
  const [assignConfirmationCode, setAssignConfirmationCode] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [confirmStepOpen, setConfirmStepOpen] = useState(false);

  // Manage Member Modal State
  const [memberNewRole, setMemberNewRole] = useState<AdminRole>('ADMIN');
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberActionSuccess, setMemberActionSuccess] = useState<string | null>(null);
  const [confirmDismissOpen, setConfirmDismissOpen] = useState(false);

  const isRealCeo = actualRole === 'CEO';
  const callerRank = ROLE_RANKS[effectiveRole as AdminRole] || 7;
  const canManage = isRealCeo || callerRank <= 3; // CEO (1), SUPER_ADMIN (2), ADMIN (3)

  // Roles available for assignment by this actor (CEO is excluded from assignable list)
  const assignableRoles = useMemo<AdminRole[]>(() => {
    const allAssignable: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'CMO', 'SUPPORT_ADMIN', 'ANALYST', 'USER'];
    if (isRealCeo) return allAssignable;
    if (effectiveRole === 'SUPER_ADMIN') return ['SUPER_ADMIN', 'ADMIN', 'CMO', 'SUPPORT_ADMIN', 'ANALYST', 'USER'];
    if (effectiveRole === 'ADMIN') return ['CMO', 'SUPPORT_ADMIN', 'ANALYST', 'USER'];
    return [];
  }, [isRealCeo, effectiveRole]);

  // Roles available for invitations (CEO & USER excluded)
  const invitableRoles = useMemo<AdminRole[]>(() => {
    const allInvitable: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'CMO', 'SUPPORT_ADMIN', 'ANALYST'];
    if (isRealCeo) return allInvitable;
    if (effectiveRole === 'SUPER_ADMIN') return ['SUPER_ADMIN', 'ADMIN', 'CMO', 'SUPPORT_ADMIN', 'ANALYST'];
    if (effectiveRole === 'ADMIN') return ['CMO', 'SUPPORT_ADMIN', 'ANALYST'];
    return [];
  }, [isRealCeo, effectiveRole]);

  // Load candidate users when assign modal opens
  useEffect(() => {
    if (showAssignModal) {
      setAssignError(null);
      setAssignSuccess(null);
      adminService
        .getCandidates(candidateSearch)
        .then((res) => {
          if (res.success && res.candidates) {
            setCandidates(res.candidates);
          }
        })
        .catch(() => {});
    }
  }, [showAssignModal, candidateSearch]);

  const canActOnTarget = (targetRole: AdminRole, targetUid: string) => {
    if (targetUid === currentAdminUid) return false;
    if (targetRole === 'CEO') return false; // CEO cannot be altered
    if (isRealCeo) return true;
    const targetRank = ROLE_RANKS[targetRole] || 7;
    return callerRank < targetRank;
  };

  // Filtered members
  const filteredTeam = useMemo(() => {
    return team.filter((m) => {
      if (activeFilter === 'ACTIVE' && m.status !== 'ACTIVE') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.email.toLowerCase().includes(q) ||
          (m.displayName && m.displayName.toLowerCase().includes(q)) ||
          m.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [team, activeFilter, searchQuery]);

  // Filtered invitations / pending assignments
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return inv.email.toLowerCase().includes(q) || inv.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [invitations, searchQuery]);

  // Handle Direct Add Team Member Submit
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Email address is required.');
      return;
    }

    if (inviteRole === 'SUPER_ADMIN' && inviteConfirmationCode !== 'CONFIRM-SUPERADMIN') {
      setInviteError('Please type confirmation code "CONFIRM-SUPERADMIN" to assign Super Admin.');
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      if (!onInviteAdmin) throw new Error('Add team member handler is not configured.');
      await onInviteAdmin({
        email: inviteEmail.trim(),
        role: inviteRole,
        displayName: inviteDisplayName.trim() || undefined,
        notes: inviteNotes.trim() || undefined,
        confirmationCode: inviteConfirmationCode || undefined,
      });

      setInviteSuccess(`Team member added successfully. ${inviteEmail.trim()} will receive the ${inviteRole} role.`);
      setInviteEmail('');
      setInviteDisplayName('');
      setInviteNotes('');
      setInviteConfirmationCode('');
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to add team member. Please verify authorization and try again.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle Direct Role Assignment Submit
  const handleApplyRoleAssignment = async () => {
    if (!selectedCandidate) {
      setAssignError('Please select a user to assign a role.');
      return;
    }

    if (newAssignedRole === 'SUPER_ADMIN' && assignConfirmationCode !== 'CONFIRM-SUPERADMIN') {
      setAssignError('Please enter confirmation code "CONFIRM-SUPERADMIN" for Super Admin privilege.');
      return;
    }

    setAssignSubmitting(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      await onAssignRole({
        targetUid: selectedCandidate.uid,
        targetEmail: selectedCandidate.email,
        newRole: newAssignedRole,
        displayName: selectedCandidate.displayName,
        confirmationCode: assignConfirmationCode || undefined,
      });

      setAssignSuccess(`Role updated successfully: ${selectedCandidate.email} is now ${newAssignedRole}.`);
      setConfirmStepOpen(false);
      setTimeout(() => {
        setShowAssignModal(false);
        setSelectedCandidate(null);
        setAssignSuccess(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to update role.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Manage Modal Role Change
  const handleChangeMemberRole = async () => {
    if (!selectedMember) return;
    setMemberActionLoading(true);
    setMemberActionError(null);
    setMemberActionSuccess(null);

    try {
      await onAssignRole({
        targetUid: selectedMember.uid,
        targetEmail: selectedMember.email,
        newRole: memberNewRole,
        displayName: selectedMember.displayName,
      });

      setMemberActionSuccess(`Role updated to ${memberNewRole}`);
      setTimeout(() => {
        setSelectedMember(null);
        setMemberActionSuccess(null);
        onRefresh();
      }, 1000);
    } catch (err: any) {
      setMemberActionError(err.message || 'Failed to update role.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  // Manage Modal Status Toggle (Suspend / Reactivate)
  const handleToggleMemberStatus = async () => {
    if (!selectedMember) return;
    const newStatus = selectedMember.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setMemberActionLoading(true);
    setMemberActionError(null);
    setMemberActionSuccess(null);

    try {
      if (onUpdateStatus) {
        await onUpdateStatus({
          targetUid: selectedMember.uid,
          targetEmail: selectedMember.email,
          status: newStatus,
        });
      } else {
        await onAssignRole({
          targetUid: selectedMember.uid,
          targetEmail: selectedMember.email,
          newRole: selectedMember.role,
          status: newStatus,
        });
      }

      setMemberActionSuccess(`Member ${newStatus === 'ACTIVE' ? 'reactivated' : 'suspended'} successfully.`);
      setTimeout(() => {
        setSelectedMember(null);
        setMemberActionSuccess(null);
        onRefresh();
      }, 1000);
    } catch (err: any) {
      setMemberActionError(err.message || 'Failed to update member status.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  // Manage Modal Dismiss Member
  const handleDismissMember = async () => {
    if (!selectedMember) return;
    setMemberActionLoading(true);
    setMemberActionError(null);
    setMemberActionSuccess(null);

    try {
      await onRevokeRole({
        targetUid: selectedMember.uid,
        targetEmail: selectedMember.email,
      });

      setMemberActionSuccess(`Admin access for ${selectedMember.email} has been revoked.`);
      setConfirmDismissOpen(false);
      setTimeout(() => {
        setSelectedMember(null);
        setMemberActionSuccess(null);
        onRefresh();
      }, 1000);
    } catch (err: any) {
      setMemberActionError(err.message || 'Failed to dismiss member.');
    } finally {
      setMemberActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CEO ROLE TESTING MODE BANNER */}
      {isRealCeo && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center space-x-2">
                <span>Role Testing Mode (CEO Authority)</span>
                {previewRole && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 text-[10px] font-mono font-bold">
                    Viewing as {previewRole}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Preview the platform exactly as any authority tier sees it without altering backend security.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={previewRole || 'CEO'}
              onChange={(e) => {
                const val = e.target.value as AdminRole;
                if (val === 'CEO') {
                  clearPreviewRole();
                } else {
                  setPreviewRole(val);
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white cursor-pointer focus:outline-hidden"
            >
              <option value="CEO">Active as CEO (Default)</option>
              <option value="SUPER_ADMIN">Preview as SUPER_ADMIN</option>
              <option value="ADMIN">Preview as ADMIN</option>
              <option value="CMO">Preview as CMO</option>
              <option value="SUPPORT_ADMIN">Preview as SUPPORT_ADMIN</option>
              <option value="ANALYST">Preview as ANALYST</option>
              <option value="USER">Preview as USER</option>
            </select>

            {previewRole && (
              <button
                onClick={clearPreviewRole}
                className="px-3 py-1.5 text-xs font-bold bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-xl transition-colors cursor-pointer"
              >
                Exit Preview
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Team & Authority</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 font-mono font-bold">
              {team.length} {team.length === 1 ? 'Member' : 'Members'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Manage platform operators, role assignments, and invitations with strict server-side authorization.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setAssignError(null);
                setAssignSuccess(null);
                setSelectedCandidate(null);
                setNewAssignedRole(assignableRoles[0] || 'ADMIN');
                setShowAssignModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assign Role</span>
            </button>

            <button
              onClick={() => {
                setInviteError(null);
                setInviteSuccess(null);
                setInviteRole(invitableRoles[0] || 'ADMIN');
                setShowInviteModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Team Member</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh Team Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xs">
        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
            }`}
          >
            All Members ({team.length})
          </button>
          <button
            onClick={() => setActiveFilter('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeFilter === 'ACTIVE'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
            }`}
          >
            Active ({team.filter((m) => m.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setActiveFilter('INVITATIONS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeFilter === 'INVITATIONS'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
            }`}
          >
            Pending Assignments ({invitations.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search member by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* Main Team Members Roster */}
      {activeFilter !== 'INVITATIONS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeam.map((member) => {
            const isSelf = member.uid === currentAdminUid;
            const canModify = canActOnTarget(member.role, member.uid);
            const roleMeta = ROLE_DETAILS[member.role] || ROLE_DETAILS.USER;
            const RoleIcon = roleMeta.icon;

            return (
              <div
                key={member.uid}
                className={`p-5 bg-white dark:bg-neutral-900 border rounded-2xl shadow-2xs space-y-4 relative transition-all ${
                  member.status === 'SUSPENDED'
                    ? 'border-amber-200 dark:border-amber-800/50 opacity-80'
                    : member.status === 'REVOKED'
                    ? 'border-rose-200 dark:border-rose-800/50 opacity-60'
                    : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                }`}
              >
                {/* Header with avatar & role badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-slate-900 dark:text-white flex-shrink-0">
                      <RoleIcon className={`w-5 h-5 ${roleMeta.accentClass}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5 truncate">
                        <span className="truncate">{member.displayName || member.email.split('@')[0]}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[9px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate" title={member.email}>
                        {member.email}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleMeta.badgeClass} flex-shrink-0`}>
                    {member.role}
                  </span>
                </div>

                {/* Status and Assigned Info */}
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        member.status === 'ACTIVE'
                          ? 'bg-emerald-500'
                          : member.status === 'SUSPENDED'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="capitalize font-medium">{member.status.toLowerCase()}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                    {new Date(member.assignedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Permissions Preview pill */}
                <div className="text-[10px] text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-800/40 p-2 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-neutral-300">{roleMeta.level}:</span>{' '}
                  {roleMeta.desc}
                </div>

                {/* Manage Action */}
                {canManage && (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setMemberNewRole(member.role);
                        setMemberActionError(null);
                        setMemberActionSuccess(null);
                      }}
                      disabled={!canModify && !isSelf}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        canModify || isSelf
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-100'
                          : 'bg-slate-50 dark:bg-neutral-800/40 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{canModify ? 'Manage Member' : 'View Access'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {filteredTeam.length === 0 && (
            <div className="col-span-full p-8 text-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-slate-500 dark:text-neutral-400 text-xs">
              No team members match your filter.
            </div>
          )}
        </div>
      )}

      {/* Pending Role Assignments Section */}
      {(activeFilter === 'INVITATIONS' || activeFilter === 'ALL') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-purple-500" />
              <span>Pending Role Assignments ({filteredInvitations.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Backend Auto-Claimed On Sign In</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvitations.map((inv) => {
              const roleMeta = ROLE_DETAILS[inv.role] || ROLE_DETAILS.USER;
              const isPending = inv.status === 'PENDING';

              return (
                <div
                  key={inv.id}
                  className={`p-4 bg-white dark:bg-neutral-900 border rounded-2xl space-y-3 shadow-2xs ${
                    isPending
                      ? 'border-purple-200 dark:border-purple-800/60'
                      : 'border-slate-200 dark:border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{inv.email}</div>
                      <div className="text-[10px] text-slate-400 dark:text-neutral-500">
                        Assigned by {inv.invitedByEmail}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleMeta.badgeClass}`}>
                      {inv.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-neutral-400 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <span className="font-mono">
                      Status:{' '}
                      <span
                        className={`font-bold ${
                          inv.status === 'PENDING'
                            ? 'text-amber-600 dark:text-amber-400'
                            : inv.status === 'ACCEPTED'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </span>
                    <span>{new Date(inv.invitedAt).toLocaleDateString()}</span>
                  </div>

                  {isPending && onRevokeInvitation && canManage && (
                    <button
                      onClick={() => onRevokeInvitation({ invitationId: inv.id })}
                      className="w-full py-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel Assignment
                    </button>
                  )}
                </div>
              );
            })}

            {filteredInvitations.length === 0 && (
              <div className="col-span-full p-6 text-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl text-slate-400 text-xs">
                No pending role assignments found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD TEAM MEMBER */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add Team Member</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTeamMember} className="p-5 space-y-4">
              {inviteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
                Direct assignment: Enter an authorized Google email. No transactional email will be dispatched. When the user signs in with this account, their administrative role will activate automatically.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="recipient@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
                >
                  {invitableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_DETAILS[r]?.label || r} ({ROLE_DETAILS[r]?.level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Permission Preview */}
              <div className="p-3.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl space-y-2 border border-slate-200/80 dark:border-neutral-700/60">
                <div className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 flex items-center justify-between">
                  <span>Permission Preview: {inviteRole}</span>
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                    {ROLE_DETAILS[inviteRole]?.level}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  {ROLE_DETAILS[inviteRole]?.permissionsSummary.map((p, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      {p.granted ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                      )}
                      <span className={p.granted ? 'text-slate-800 dark:text-neutral-200' : 'text-slate-400'}>
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {inviteRole === 'SUPER_ADMIN' && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Elevated Confirmation Required</span>
                  </div>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300">
                    Type <strong>CONFIRM-SUPERADMIN</strong> to authorize assignment into Super Admin tier.
                  </p>
                  <input
                    type="text"
                    placeholder="CONFIRM-SUPERADMIN"
                    value={inviteConfirmationCode}
                    onChange={(e) => setInviteConfirmationCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-purple-300 dark:border-purple-700 text-xs font-mono"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {inviteSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{inviteSubmitting ? 'Adding...' : 'Add Team Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DIRECT ROLE ASSIGNMENT CONSOLE (SEARCH USERS) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Assign Authority Role</h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{assignError}</span>
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              {/* Step 1: Select Candidate */}
              {!selectedCandidate ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                    Search Registered User
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search candidate by email or name..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-xl mt-2">
                    {candidates.map((cand) => (
                      <button
                        key={cand.uid}
                        type="button"
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setNewAssignedRole(cand.currentRole !== 'USER' ? cand.currentRole : 'ADMIN');
                        }}
                        className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-neutral-800/80 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{cand.email}</div>
                          <div className="text-[10px] text-slate-400">{cand.displayName}</div>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            ROLE_DETAILS[cand.currentRole]?.badgeClass || 'bg-slate-100'
                          }`}
                        >
                          {cand.currentRole}
                        </span>
                      </button>
                    ))}

                    {candidates.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No candidate users found matching "{candidateSearch}".
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Step 2: Configure Role & Confirm */
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl flex items-center justify-between border border-slate-200/80 dark:border-neutral-700/60">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Target User</div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{selectedCandidate.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Current Role</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200">
                        {selectedCandidate.currentRole}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">New Role</label>
                    <select
                      value={newAssignedRole}
                      onChange={(e) => setNewAssignedRole(e.target.value as AdminRole)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_DETAILS[r]?.label || r} ({ROLE_DETAILS[r]?.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Permission Preview */}
                  <div className="p-3.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl space-y-2 border border-slate-200/80 dark:border-neutral-700/60">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 flex items-center justify-between">
                      <span>Permission Preview: {newAssignedRole}</span>
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                        {ROLE_DETAILS[newAssignedRole]?.level}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                      {ROLE_DETAILS[newAssignedRole]?.permissionsSummary.map((p, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          {p.granted ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                          )}
                          <span className={p.granted ? 'text-slate-800 dark:text-neutral-200' : 'text-slate-400'}>
                            {p.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {newAssignedRole === 'SUPER_ADMIN' && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1.5">
                      <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Elevated Confirmation Required</span>
                      </div>
                      <p className="text-[11px] text-purple-800 dark:text-purple-300">
                        Type <strong>CONFIRM-SUPERADMIN</strong> to assign Super Admin authority.
                      </p>
                      <input
                        type="text"
                        placeholder="CONFIRM-SUPERADMIN"
                        value={assignConfirmationCode}
                        onChange={(e) => setAssignConfirmationCode(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-purple-300 dark:border-purple-700 text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* Confirmation Warning */}
                  {confirmStepOpen && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="font-bold flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>
                          Change role from {selectedCandidate.currentRole} → {newAssignedRole}?
                        </span>
                      </div>
                      <p className="text-[11px]">
                        This will update server-side authority permissions immediately for {selectedCandidate.email}.
                      </p>
                    </div>
                  )}

                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCandidate(null);
                        setConfirmStepOpen(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer font-semibold"
                    >
                      ← Back to User Search
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      {!confirmStepOpen ? (
                        <button
                          type="button"
                          onClick={() => setConfirmStepOpen(true)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Review & Assign
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleApplyRoleAssignment}
                          disabled={assignSubmitting}
                          className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
                        >
                          {assignSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{assignSubmitting ? 'Applying...' : 'Confirm Assignment'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE MEMBER (DETAILS, CHANGE ROLE, SUSPEND, DISMISS) */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Manage Authority Member</h3>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {memberActionError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{memberActionError}</span>
                </div>
              )}

              {memberActionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{memberActionSuccess}</span>
                </div>
              )}

              {/* Member Summary Header */}
              <div className="p-4 bg-slate-50 dark:bg-neutral-800/60 rounded-xl space-y-2 border border-slate-200/80 dark:border-neutral-700/60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedMember.displayName}</div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">{selectedMember.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_DETAILS[selectedMember.role]?.badgeClass}`}>
                    {selectedMember.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                  <span>Assigned: {new Date(selectedMember.assignedAt).toLocaleString()}</span>
                  <span className="capitalize font-semibold">Status: {selectedMember.status}</span>
                </div>
              </div>

              {/* Role Reassignment */}
              {canActOnTarget(selectedMember.role, selectedMember.uid) && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">Change Role</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={memberNewRole}
                      onChange={(e) => setMemberNewRole(e.target.value as AdminRole)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_DETAILS[r]?.label || r} ({ROLE_DETAILS[r]?.level})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleChangeMemberRole}
                      disabled={memberActionLoading || memberNewRole === selectedMember.role}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                    >
                      Update Role
                    </button>
                  </div>
                </div>
              )}

              {/* Human-Readable Permissions Summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl space-y-2 border border-slate-200/80 dark:border-neutral-700/60">
                <div className="text-[11px] font-bold text-slate-700 dark:text-neutral-300">
                  Active Permissions ({selectedMember.role})
                </div>
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  {ROLE_DETAILS[selectedMember.role]?.permissionsSummary.map((p, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      {p.granted ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                      )}
                      <span className={p.granted ? 'text-slate-800 dark:text-neutral-200' : 'text-slate-400'}>
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suspend & Dismiss Actions */}
              {canActOnTarget(selectedMember.role, selectedMember.uid) && (
                <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleToggleMemberStatus}
                    disabled={memberActionLoading}
                    className="flex-1 py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    {selectedMember.status === 'ACTIVE' ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Suspend Member</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Reactivate Member</span>
                      </>
                    )}
                  </button>

                  {!confirmDismissOpen ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDismissOpen(true)}
                      className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDismissMember}
                      disabled={memberActionLoading}
                      className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <span>Confirm Dismiss</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
