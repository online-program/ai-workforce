import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Check, CheckCircle2, ShieldCheck, Target, User } from 'lucide-react';
import { Modal } from './ui/Modal.tsx';
import { EmployeeOnboardingProfile } from '../types.ts';
import { getEmployeeOnboarding, saveEmployeeOnboarding } from '../utils/employeeOnboarding.ts';

interface EmployeeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId?: string;
  onSaved?: (profile: EmployeeOnboardingProfile) => void;
}

export const EmployeeOnboardingModal: React.FC<EmployeeOnboardingModalProps> = ({
  isOpen,
  onClose,
  roleId = 'sales_coordinator',
  onSaved,
}) => {
  const [profile, setProfile] = useState<EmployeeOnboardingProfile>(() => getEmployeeOnboarding(roleId));
  const [customName, setCustomName] = useState(profile.customName);
  const [objective, setObjective] = useState(profile.objective);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getEmployeeOnboarding(roleId);
      setProfile(current);
      setCustomName(current.customName);
      setObjective(current.objective);
      setSavedSuccess(false);
    }
  }, [isOpen, roleId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: EmployeeOnboardingProfile = {
      ...profile,
      customName: customName.trim() || 'Alpha',
      objective: objective.trim() || profile.objective,
      onboardedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    saveEmployeeOnboarding(updated);
    setProfile(updated);
    setSavedSuccess(true);
    if (onSaved) {
      onSaved(updated);
    }
    setTimeout(() => {
      onClose();
      setSavedSuccess(false);
    }, 900);
  };

  const modalFooter = (
    <div className="w-full flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={savedSuccess}
        className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs active:scale-[0.98] interactive-button disabled:opacity-75"
      >
        {savedSuccess ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Settings Saved!</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Save Configuration</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alpha Configuration"
      subtitle="Configure Alpha's display name and primary operating objective."
      maxWidthClass="max-w-xl"
      footer={modalFooter}
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Role Identity Banner */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs font-mono font-bold">
              α
            </div>
            <div>
              <div className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <span>ALPHA</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  Active
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                Conversational AI for Sales & Customer Assistance
              </div>
            </div>
          </div>
        </div>

        {/* Custom Employee Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Custom Employee Name</span>
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Alex (Inbound Sales), Maya, Sarah"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-black border border-slate-300 dark:border-neutral-700 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-2xs"
            required
          />
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            This name will be displayed across your workspace, conversation queue, and supervisor feeds.
          </p>
        </div>

        {/* Role-Specific Objective */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>Role-Specific Objective</span>
          </label>
          <textarea
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g. Engage inbound website visitors 24/7, answer questions from Company Brain, qualify high-intent solar prospects, and prepare ready-to-approve quotation proposals."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-black border border-slate-300 dark:border-neutral-700 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-2xs leading-relaxed resize-none"
            required
          />
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            Defines the core operational mission guiding the employee's intent qualification and response prioritization.
          </p>
        </div>

        {/* Operational Guardrails */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 space-y-2">
          <div className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Operational Guardrails & Architecture</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600 dark:text-neutral-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>Three-tier pipeline: Casual chats stay as conversations, never spamming inquiries.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>Inquiries created ONLY when commercial qualification threshold is satisfied.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>Stored in session state across your browser tab sessions.</span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
