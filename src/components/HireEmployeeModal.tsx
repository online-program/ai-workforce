import React from 'react';
import { Search, TrendingUp, Sliders, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal.tsx';

interface HireEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HireEmployeeModal: React.FC<HireEmployeeModalProps> = ({ isOpen, onClose }) => {
  const modalFooter = (
    <div className="w-full flex justify-end pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs active:scale-[0.98] interactive-button"
      >
        Done
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Workforce Products"
      subtitle="Operational flagship and roadmap workforce models."
      maxWidthClass="max-w-lg"
      footer={modalFooter}
    >
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
        <div className="flex items-center space-x-2 text-black dark:text-white text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Active & Deployed</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
          Your flagship <strong>ALPHA</strong> conversational AI is active and deployed. Additional specialized intelligence models are currently in development.
        </p>
      </div>

      <div className="space-y-2.5 pt-2">
        <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500 tracking-wider">
          Roadmap Products (In Development)
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 flex-shrink-0 shadow-2xs">
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-black dark:text-white truncate">OMEGA</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">AI research and account intelligence</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold flex-shrink-0">IN DEVELOPMENT</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 flex-shrink-0 shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-black dark:text-white truncate">PULSE</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">Revenue and conversation intelligence</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold flex-shrink-0">IN DEVELOPMENT</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 flex-shrink-0 shadow-2xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-black dark:text-white truncate">SIGMA</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">Operations & workflow automation</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold flex-shrink-0">IN DEVELOPMENT</span>
        </div>
      </div>
    </Modal>
  );
};
