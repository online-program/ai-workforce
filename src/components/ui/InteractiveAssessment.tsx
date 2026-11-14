import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PremiumButton } from './PremiumButton.tsx';

interface InteractiveAssessmentProps {
  onScheduleCall?: () => void;
  className?: string;
}

export const InteractiveAssessment: React.FC<InteractiveAssessmentProps> = ({
  onScheduleCall,
  className = '',
}) => {
  const [weeklyVisitors, setWeeklyVisitors] = useState<number>(1500);
  const [repCount, setRepCount] = useState<number>(6);
  const [dealValue, setDealValue] = useState<number>(3500);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Conservative, realistic math for commercial calculation
  // Hours saved: ~1.8 hours/rep/week spent on initial sorting, basic qualification, and manual triage
  const hoursSavedPerWeek = Math.round(repCount * 1.8 * 10) / 10;
  // Inbound discovery coverage: ~65% of inbound visits happen after-hours / outside active sales rep windows
  const afterHoursInquiries = Math.round((weeklyVisitors * 0.035) * 0.65);
  // Qualified deals unlocked: estimated 1-3 additional qualified discovery conversations per week
  const monthlyPipelineOpportunity = Math.round(afterHoursInquiries * 0.22 * dealValue * 4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedEmail || !/^\S+@\S+\.\S+$/.test(submittedEmail)) {
      setValidationError('Please enter a valid business email address.');
      return;
    }
    setValidationError('');
    setIsSubmitted(true);
  };

  return (
    <div className={`rounded-2xl border border-neutral-800 bg-[#0B0B0E] p-6 sm:p-8 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Interactive Inbound Pipeline Calculator
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Estimate after-hours discovery capacity and sales hours reclaimed by deploying Alpha as your 24/7 AI Sales Manager.
            </p>
          </div>

          <div className="space-y-5">
            {/* Slider 1: Weekly Inbound Visitors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="calculator-visitors" className="text-neutral-300 font-medium">Estimated Weekly Website Visitors</label>
                <span className="font-mono tabular-nums text-white font-semibold">
                  {weeklyVisitors.toLocaleString()} visitors
                </span>
              </div>
              <input
                id="calculator-visitors"
                type="range"
                min="200"
                max="25000"
                step="100"
                value={weeklyVisitors}
                onChange={(e) => setWeeklyVisitors(Number(e.target.value))}
                className="w-full accent-blue-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
                aria-label="Estimated Weekly Website Visitors"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>200</span>
                <span>10,000</span>
                <span>25,000+</span>
              </div>
            </div>

            {/* Slider 2: Sales Team Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="calculator-reps" className="text-neutral-300 font-medium">Commercial Team Size (Sales / SDRs)</label>
                <span className="font-mono tabular-nums text-white font-semibold">
                  {repCount} {repCount === 1 ? 'specialist' : 'reps'}
                </span>
              </div>
              <input
                id="calculator-reps"
                type="range"
                min="1"
                max="40"
                step="1"
                value={repCount}
                onChange={(e) => setRepCount(Number(e.target.value))}
                className="w-full accent-blue-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
                aria-label="Commercial Team Size"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>1 rep</span>
                <span>20 reps</span>
                <span>40 reps</span>
              </div>
            </div>

            {/* Slider 3: Average Deal Size / ACV */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="calculator-deal-value" className="text-neutral-300 font-medium">Average Deal Value / Project Scope</label>
                <span className="font-mono tabular-nums text-white font-semibold">
                  ${dealValue.toLocaleString()}
                </span>
              </div>
              <input
                id="calculator-deal-value"
                type="range"
                min="500"
                max="50000"
                step="500"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="w-full accent-blue-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
                aria-label="Average Deal Value"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>$500</span>
                <span>$25,000</span>
                <span>$50,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Card Column */}
        <div className="lg:col-span-5 rounded-xl border border-neutral-800 bg-neutral-900/70 p-6 space-y-6">
          <div className="text-xs font-mono font-medium text-neutral-400">
            Estimated Monthly Operating Impact
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Weekly Sales Hours Reclaimed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-blue-400 mt-0.5">
                {hoursSavedPerWeek} hrs/week
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                From triage, repetitive FAQ answering & manual lead tagging
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800">
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Monthly After-Hours Inquiries Handled</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-sky-300 mt-0.5">
                {(afterHoursInquiries * 4).toLocaleString()} visitors
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Answered instantly with Company Brain grounding
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800">
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Monthly Pipeline Potential</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                ${monthlyPipelineOpportunity.toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Qualified proposals staged for human closing
              </div>
            </div>
          </div>

          {/* Lead Capture Form */}
          <div className="pt-4 border-t border-neutral-800">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <label htmlFor="calculator-email" className="block text-xs text-neutral-300 font-medium">
                  Receive Detailed Assessment & Deployment Specs
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="calculator-email"
                    type="email"
                    value={submittedEmail}
                    onChange={(e) => {
                      setSubmittedEmail(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="you@company.com"
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                    aria-label="Work Email Address"
                  />
                  <PremiumButton
                    variant="primary"
                    size="sm"
                    type="submit"
                    className="whitespace-nowrap shrink-0"
                  >
                    Send Report
                  </PremiumButton>
                </div>
                {validationError && (
                  <p className="text-[11px] text-rose-400 font-medium">{validationError}</p>
                )}
              </form>
            ) : (
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-emerald-900/60 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-white">Assessment Dispatched</div>
                  <div className="text-neutral-400 text-[11px]">
                    Detailed breakdown sent to <span className="text-white font-mono">{submittedEmail}</span>.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
