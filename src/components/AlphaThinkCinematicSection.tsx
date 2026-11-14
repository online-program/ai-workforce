import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Play,
  Pause,
  ArrowRight,
  Database,
  Search,
  Cpu,
  Target,
  Send,
  Sliders,
  ChevronRight,
  Layers,
  Lock,
  Workflow,
  Compass,
} from 'lucide-react';

export interface AlphaThinkCinematicSectionProps {
  onMeetAlpha?: () => void;
  onExploreDemo?: () => void;
  className?: string;
}

interface DemoScenario {
  id: string;
  visitorMessage: string;
  tag: string;
  stages: {
    stageNumber: string;
    stageName: 'UNDERSTAND' | 'RETRIEVE' | 'ANALYSE' | 'DECIDE' | 'ACT';
    title: string;
    subtitle: string;
    primaryBadge: string;
    badgeColor: string;
    extractedData: Array<{ label: string; value: string }>;
    coreInsight: string;
    systemAction: string;
  }[];
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'agency_pricing',
    visitorMessage: 'Can Alpha handle custom pricing for our 50-person agency?',
    tag: 'Enterprise Qualification',
    stages: [
      {
        stageNumber: '01',
        stageName: 'UNDERSTAND',
        title: 'Intent Stream Extracted',
        subtitle: 'Inbound message deconstructed into intent signals and commercial entity facts.',
        primaryBadge: 'Intent: Commercial Pricing + Team Fit',
        badgeColor: 'border-white/20 text-white bg-white/10',
        extractedData: [
          { label: 'Primary Intent', value: 'COMMERCIAL_PRICING_INQUIRY' },
          { label: 'Entity Extracted', value: 'Headcount: 50 staff (Agency Model)' },
          { label: 'Confidence Score', value: '98.4%' },
          { label: 'Urgency / Mood', value: 'High Intent / Inbound Exploration' },
        ],
        coreInsight: 'Visitor operates an agency of 50 people seeking commercial custom tier rules rather than standard self-serve.',
        systemAction: 'Flags for high-value inbound qualification; avoids generic tier dismissal.',
      },
      {
        stageNumber: '02',
        stageName: 'RETRIEVE',
        title: 'Company Brain Grounding',
        subtitle: 'Tenant policies, verified catalog, and historical context retrieved with zero hallucination.',
        primaryBadge: 'Brain Policy: Verified Custom Tier (50+ Seats)',
        badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-950/40',
        extractedData: [
          { label: 'Verified Catalog', value: 'Agency & Partner Tier: Verified in Company Brain' },
          { label: 'Pricing Directive', value: 'Volume onboarding & custom SLA approved for 50+ seats' },
          { label: 'Boundary Rule', value: 'Standard tier is self-serve; volume quotes require human review' },
          { label: 'Grounding Match', value: '100% Verified (0 Unverified Hypotheses)' },
        ],
        coreInsight: 'Company Brain explicitly contains volume rules for 50+ person agencies, requiring verified scope review before final contract.',
        systemAction: 'Injects authoritative pricing guardrails into active reasoning buffer.',
      },
      {
        stageNumber: '03',
        stageName: 'ANALYSE',
        title: 'Multi-Perspective Business Analysis',
        subtitle: 'Intelligence core evaluates commercial fit, objections, tech stack alignment, and pipeline value.',
        primaryBadge: 'Lead Fit: Tier 1 Strategic (Score: 94/100)',
        badgeColor: 'border-white/20 text-white bg-white/10',
        extractedData: [
          { label: 'Account Profile', value: '50-Seat Digital Agency / High Client Inflow' },
          { label: 'Potential Objection', value: 'Concern regarding CRM integration and client isolation' },
          { label: 'Deterministic Math', value: '50 Seats × Tier Factor = Enterprise Pilot Qualified' },
          { label: 'Commercial Strategy', value: 'Confirm capability, clarify CRM workflow, invite brief staging' },
        ],
        coreInsight: 'High strategic fit. Answering price alone risks commoditization; connecting volume pricing to CRM workflows accelerates deal size.',
        systemAction: 'Formulates 2-step response: direct verified answer first, followed by consultative discovery.',
      },
      {
        stageNumber: '04',
        stageName: 'DECIDE',
        title: 'Strategic Sales Action Chosen',
        subtitle: 'Evaluates competing response paths and selects the highest-leverage sales next step.',
        primaryBadge: 'Action: Direct Answer + Consultative Discovery',
        badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
        extractedData: [
          { label: 'Path A: Dismiss to Sales Form', value: 'Rejected (Creates friction for high-intent lead)' },
          { label: 'Path B: Provide Rough Estimate', value: 'Rejected (Violates Company Brain volume rule)' },
          { label: 'Selected Path', value: 'Verify 50-person volume support + discover CRM requirements' },
          { label: 'Strategic Alignment', value: 'Advance to proposal staging & executive brief' },
        ],
        coreInsight: 'The highest conversion path validates volume agency support directly, then asks which CRM/client stack they use to personalize the pilot.',
        systemAction: 'Locks response template to verified facts and pre-qualifies for human handoff.',
      },
      {
        stageNumber: '05',
        stageName: 'ACT',
        title: 'Natural Sales Response Delivered',
        subtitle: 'Alpha delivers a warm, consultative response grounded in verified facts, advancing the commercial relationship.',
        primaryBadge: 'Output: Conversational, Consultative & Productive',
        badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/60',
        extractedData: [
          { label: 'Tone Delivery', value: 'Warm, executive, consultative, non-robotic' },
          { label: 'Brain Adherence', value: '100% compliant with operating directives' },
          { label: 'Commercial Adv.', value: 'Stages inquiry for human executive review with 1-click brief' },
          { label: 'Next Step Prompt', value: 'Personalized CRM discovery to prepare custom pilot draft' },
        ],
        coreInsight: '"Yes, Alpha supports custom volume onboarding for 50-person agencies with client isolation. To tailor the setup, are your team workflows centered around HubSpot, Salesforce, or custom webhooks?"',
        systemAction: 'Inquiry profile recorded; conversation state preserved across sessions.',
      },
    ],
  },
  {
    id: 'integration_status',
    visitorMessage: 'Does Alpha integrate with our HubSpot CRM and Slack workspace?',
    tag: 'Platform Truth & Boundaries',
    stages: [
      {
        stageNumber: '01',
        stageName: 'UNDERSTAND',
        title: 'Intent & Entity Extraction',
        subtitle: 'Classifying technical architecture inquiry across multiple third-party tools.',
        primaryBadge: 'Intent: Integration Verification',
        badgeColor: 'border-white/20 text-white bg-white/10',
        extractedData: [
          { label: 'Entities', value: 'HubSpot (CRM), Slack (Messaging)' },
          { label: 'Intent Type', value: 'CAPABILITY_INTEGRATION_CHECK' },
          { label: 'Underlying Need', value: 'Workflow continuity with existing sales stack' },
          { label: 'Confidence', value: '99.1%' },
        ],
        coreInsight: 'Prospect is evaluating operational integration feasibility before requesting a trial.',
        systemAction: 'Directs lookup to platform integration roadmap in Company Brain.',
      },
      {
        stageNumber: '02',
        stageName: 'RETRIEVE',
        title: 'Authoritative Capability Registry',
        subtitle: 'Retrieving precise live status vs roadmap features to prevent false promises.',
        primaryBadge: 'Status: Live Webhooks + In-Progress Connectors',
        badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-950/40',
        extractedData: [
          { label: 'Live Today', value: 'Instant Webhooks & REST API (Sync to any CRM/Slack)' },
          { label: 'Native Connectors', value: 'HubSpot & Slack 1-Click Apps in active testing' },
          { label: 'Integrity Rule', value: 'Distinguish live features from roadmap; never overpromise' },
          { label: 'Verification', value: 'Strict Company Brain Capability Spec 2.4' },
        ],
        coreInsight: 'Alpha currently integrates via high-speed webhooks and REST endpoints, while native 1-click apps are scheduled for release next quarter.',
        systemAction: 'Prepares transparent disclosure with immediate functional solution.',
      },
      {
        stageNumber: '03',
        stageName: 'ANALYSE',
        title: 'Technical Fit Evaluation',
        subtitle: 'Evaluating customer workflow feasibility with existing webhook connectors.',
        primaryBadge: 'Feasibility: High (Zero-Code Webhook Flow)',
        badgeColor: 'border-white/20 text-white bg-white/10',
        extractedData: [
          { label: 'Workflow Match', value: 'Webhook sends qualified lead payload to HubSpot in < 200ms' },
          { label: 'Notification Flow', value: 'Instant Slack channel ping with full prospect summary' },
          { label: 'Setup Effort', value: 'Under 10 minutes via standard Zapier / Make / Webhook' },
          { label: 'Risk Rating', value: 'Low; immediate utility without waiting for native app' },
        ],
        coreInsight: 'Customer needs reassurance that their team will receive real-time alerts today without engineering overhead.',
        systemAction: 'Frame answer around immediate webhook delivery plus upcoming native toggle.',
      },
      {
        stageNumber: '04',
        stageName: 'DECIDE',
        title: 'Clarity Over Spin Action',
        subtitle: 'Selecting honest, high-credibility framing that builds lasting buyer trust.',
        primaryBadge: 'Decision: Transparent Architecture Disclosure',
        badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
        extractedData: [
          { label: 'Alternative A', value: 'Say "Yes" without qualifying native vs webhook (Rejected)' },
          { label: 'Alternative B', value: 'Say "No" and lose the lead (Rejected)' },
          { label: 'Selected Path', value: 'Explain live webhook/Zapier workflow + roadmap ETA (Approved)' },
          { label: 'Outcome', value: 'Demonstrates engineering rigor and immediate usability' },
        ],
        coreInsight: 'Enterprise buyers respect precise distinction between live webhooks and native connectors far more than vague affirmative claims.',
        systemAction: 'Locks response to clear technical disclosure and offers sample webhook payload.',
      },
      {
        stageNumber: '05',
        stageName: 'ACT',
        title: 'Authoritative Direct Response',
        subtitle: 'Clear, grounded explanation delivered with immediate next step for technical evaluation.',
        primaryBadge: 'Output: Verified Facts & Immediate Utility',
        badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/60',
        extractedData: [
          { label: 'Tone Delivery', value: 'Direct, honest, technically authoritative' },
          { label: 'Integrity', value: '100% aligned with verified product capabilities' },
          { label: 'Follow-up Offer', value: 'Sample webhook payload & Zapier template provided' },
          { label: 'Pipeline Impact', value: 'Maintains deal momentum with realistic expectations' },
        ],
        coreInsight: '"Alpha connects live today to HubSpot and Slack using our instant webhook dispatcher and Zapier/Make connectors, alerting your team in real time. Our native 1-click app is currently in beta. Would you like our 5-minute webhook setup guide?"',
        systemAction: 'Lead tagged with "Tech Stack: HubSpot + Slack"; ready for solution architect review.',
      },
    ],
  },
];

export const AlphaThinkCinematicSection: React.FC<AlphaThinkCinematicSectionProps> = ({
  onMeetAlpha,
  onExploreDemo,
  className = '',
}) => {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const scenario = DEMO_SCENARIOS[selectedScenarioIdx];
  const activeStage = scenario.stages[activeStageIdx];

  // Canvas visual core reference & visibility ref for IntersectionObserver
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const timerRef = useRef<any>(null);

  // Auto-progress stages every 5 seconds if playing & visible
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 50; // update progress smooth every 50ms
    const totalDuration = 5200; // 5.2s per stage
    const stepIncrement = (intervalTime / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      if (!isVisibleRef.current) return; // pause auto-progression when out of viewport
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStageIdx((cur) => (cur + 1) % scenario.stages.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, scenario.stages.length]);

  const handleStageSelect = (idx: number) => {
    setActiveStageIdx(idx);
    setProgress(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleScenarioChange = (sIdx: number) => {
    setSelectedScenarioIdx(sIdx);
    setActiveStageIdx(0);
    setProgress(0);
  };

  // IntersectionObserver to pause canvas animation when out of view (Performance & Battery optimization)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    const containerEl = containerRef.current;
    if (containerEl) {
      observer.observe(containerEl);
    }
    return () => {
      if (containerEl) observer.unobserve(containerEl);
      observer.disconnect();
    };
  }, []);

  // 3D Canvas Visualizer for the Intelligence Core
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = (canvas.offsetWidth || 500) * window.devicePixelRatio);
    let height = (canvas.height = (canvas.offsetHeight || 380) * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = (canvas.offsetWidth || 500) * window.devicePixelRatio;
      height = canvas.height = (canvas.offsetHeight || 380) * window.devicePixelRatio;
    };
    window.addEventListener('resize', handleResize);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Simulation nodes & particles
    const nodeCount = 18;
    const nodes = Array.from({ length: nodeCount }, (_, i) => {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 0.55 + (i % 3) * 0.22;
      return {
        angle,
        radius,
        speed: (i % 2 === 0 ? 1 : -1) * (0.003 + (i % 4) * 0.001),
        pulse: Math.random() * Math.PI,
        size: 2.5 + (i % 3),
      };
    });

    const particles = Array.from({ length: 24 }, (_, i) => ({
      x: (Math.random() - 0.5) * 1.6,
      y: (Math.random() - 0.5) * 1.6,
      vx: (Math.random() - 0.5) * 0.006,
      vy: (Math.random() - 0.5) * 0.006,
      life: Math.random(),
    }));

    let time = 0;

    const render = () => {
      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * 0.38;

      if (!prefersReducedMotion) {
        time += 0.015;
      }

      // 1. Ambient Concentric Energy Rings
      const ringCount = 4;
      for (let r = 1; r <= ringCount; r++) {
        const ringRadius = (baseScale * 0.32 * r) + Math.sin(time * 1.2 + r) * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = r === activeStageIdx + 1
          ? 'rgba(245, 158, 11, 0.45)'
          : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = (r === activeStageIdx + 1 ? 1.8 : 0.8) * window.devicePixelRatio;
        if (r % 2 === 1) {
          ctx.setLineDash([4 * window.devicePixelRatio, 6 * window.devicePixelRatio]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Center Core Radial Glow (Warm Amber & Obsidian)
      const corePulse = Math.sin(time * 2) * 6;
      const coreRadius = Math.max(18, 30 + corePulse) * window.devicePixelRatio;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2.2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(245, 158, 11, 0.7)');
      grad.addColorStop(0.65, 'rgba(217, 119, 6, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Connect Nodes with Neural Struts
      const projectedNodes: { x: number; y: number; size: number }[] = [];

      nodes.forEach((n) => {
        if (!prefersReducedMotion) {
          n.angle += n.speed;
        }
        const nx = cx + Math.cos(n.angle) * n.radius * baseScale;
        const ny = cy + Math.sin(n.angle) * n.radius * baseScale * 0.75;
        projectedNodes.push({ x: nx, y: ny, size: n.size * window.devicePixelRatio });
      });

      // Draw strands to center
      ctx.lineWidth = 0.8 * window.devicePixelRatio;
      projectedNodes.forEach((p, idx) => {
        const isHot = idx % (activeStageIdx + 1) === 0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = isHot ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();
      });

      // Draw perimeter connections
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p1 = projectedNodes[i];
          const p2 = projectedNodes[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < baseScale * 0.5) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      projectedNodes.forEach((p, idx) => {
        const isHighlight = idx % (5 - activeStageIdx) === 0;
        ctx.fillStyle = isHighlight ? 'rgba(245, 158, 11, 0.95)' : 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHighlight ? p.size * 1.3 : p.size, 0, Math.PI * 2);
        ctx.fill();

        if (isHighlight) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
          ctx.lineWidth = 1 * window.devicePixelRatio;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // 4. Data Flow Stream Particles
      if (!prefersReducedMotion) {
        particles.forEach((pt) => {
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life += 0.015;
          if (pt.life > 1 || Math.hypot(pt.x, pt.y) > 1.2) {
            pt.x = (Math.random() - 0.5) * 0.3;
            pt.y = (Math.random() - 0.5) * 0.3;
            pt.life = 0;
          }
          const px = cx + pt.x * baseScale;
          const py = cy + pt.y * baseScale;
          const alpha = (1 - pt.life) * 0.6;
          ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.6 * window.devicePixelRatio, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeStageIdx]);

  return (
    <section
      ref={containerRef}
      id="alpha-think"
      className={`relative py-32 px-6 sm:px-8 bg-[#050507] text-white overflow-hidden border-t border-neutral-900 ${className}`}
      aria-label="Meet Alpha Think: The Intelligence Engine Behind Alpha AI Sales Manager"
    >
      {/* Ambient Radial Golden Energy Scrim */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.07),rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-16">
        {/* Section Header: Apple-Level Precision & Luxury Typography */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs font-mono tracking-wider text-amber-400 shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse" />
            <span className="uppercase font-semibold">Behind Every Conversation</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]"
          >
            There&apos;s more happening behind every conversation.
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-white to-neutral-400 bg-clip-text text-transparent">
              Meet Alpha Think.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            The intelligence behind Alpha&apos;s decisions. Understanding intent. Evaluating opportunities. Knowing what to do next.
          </motion.p>
        </div>

        {/* Live Scenario Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono">
          <span className="text-neutral-500 uppercase tracking-widest text-[11px] mr-1 hidden sm:inline">
            Live Scenario:
          </span>
          {DEMO_SCENARIOS.map((sc, sIdx) => (
            <button
              key={sc.id}
              onClick={() => handleScenarioChange(sIdx)}
              className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium flex items-center gap-2 ${
                selectedScenarioIdx === sIdx
                  ? 'bg-neutral-800 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-neutral-950/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedScenarioIdx === sIdx ? 'bg-amber-400' : 'bg-neutral-600'}`} />
              <span>{sc.tag}</span>
            </button>
          ))}
        </div>

        {/* Visitor Input Simulated Ribbon */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-neutral-800/90 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700 text-neutral-300 font-mono text-xs">
              Q:
            </div>
            <div className="truncate text-sm font-medium text-neutral-200">
              &ldquo;{scenario.visitorMessage}&rdquo;
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pause auto-progression' : 'Play auto-progression'}
              className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 cursor-pointer transition-colors"
              aria-label={isPlaying ? 'Pause demo' : 'Resume demo'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* 5-Stage Interactive Progress Header (Desktop Flow / Mobile Scroller) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {scenario.stages.map((st, idx) => {
            const isActive = idx === activeStageIdx;
            const isCompleted = idx < activeStageIdx;
            return (
              <button
                key={st.stageName}
                onClick={() => handleStageSelect(idx)}
                className={`relative p-3.5 sm:p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                  isActive
                    ? 'bg-neutral-900/90 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                    : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/40 text-neutral-400'
                }`}
              >
                {/* Active Progress Micro-Bar */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                )}

                <div className="flex items-center justify-between w-full mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                      isActive ? 'text-amber-400' : 'text-neutral-500'
                    }`}
                  >
                    Stage {st.stageNumber}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-amber-400 animate-pulse' : 'bg-neutral-700'
                      }`}
                    />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div
                    className={`text-xs sm:text-sm font-bold tracking-tight ${
                      isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                    }`}
                  >
                    {st.stageName}
                  </div>
                  <div className="text-[10px] text-neutral-400 line-clamp-1">
                    {st.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Central Visual Stage Demonstration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: 3D Intelligence Core Canvas */}
          <div className="lg:col-span-6 rounded-2xl bg-gradient-to-b from-neutral-900/80 via-[#0a0a0d] to-black border border-neutral-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-300">
                  Alpha Think Intelligence Core
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700">
                Stage {activeStage.stageNumber} / 05 Active
              </span>
            </div>

            {/* Canvas Interactive Orb */}
            <div className="relative w-full h-[280px] sm:h-[320px] flex items-center justify-center my-2">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              />

              {/* Central Overlay Badge */}
              <div className="absolute pointer-events-none px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[11px] font-mono tracking-wide shadow-2xl">
                {activeStage.stageName}: ACTIVE
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400 relative z-10">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Adaptive 8-Stage Reasoning
              </span>
              <span>Deterministic Guardrails: 100% Active</span>
            </div>
          </div>

          {/* Right Column: Live Stage Inspector & Telemetry */}
          <div className="lg:col-span-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/90 p-6 sm:p-7 flex flex-col justify-between space-y-6 relative overflow-hidden backdrop-blur-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-semibold ${activeStage.badgeColor}`}>
                  {activeStage.primaryBadge}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  Autonomous Decision Engine
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5">
                  {activeStage.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  {activeStage.subtitle}
                </p>
              </div>

              {/* Extracted Telemetry Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {activeStage.extractedData.map((d, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1"
                  >
                    <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                      {d.label}
                    </div>
                    <div className="text-xs font-semibold text-neutral-200 truncate">
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Core Insight Callout */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Decision Logic:</strong>
                  {activeStage.coreInsight}
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
              <div className="text-neutral-400 font-mono text-[11px] truncate max-w-[70%]">
                <span className="text-neutral-500 mr-1.5">Action:</span>
                <span className="text-neutral-300">{activeStage.systemAction}</span>
              </div>

              <button
                onClick={() => handleStageSelect((activeStageIdx + 1) % scenario.stages.length)}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 cursor-pointer font-medium flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section Conversion Banner & Working CTA */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-neutral-900 via-[#0e0e12] to-neutral-900 border border-neutral-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2 max-w-xl">
            <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Alpha handles the conversation. Alpha Think powers the decisions behind it.
            </h4>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Experience the difference between a superficial chatbot and a genuine AI Sales Manager grounded in your business brain.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {onMeetAlpha && (
              <button
                onClick={onMeetAlpha}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-bold text-sm tracking-tight hover:shadow-[0_0_24px_rgba(245,158,11,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Meet Alpha</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <a
              href="#real-alpha"
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 font-semibold text-xs tracking-tight transition-colors flex items-center justify-center"
            >
              Test Live Widget
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
