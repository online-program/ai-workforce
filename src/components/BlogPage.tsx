import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { Logo } from './Logo.tsx';
import { ContactFooter } from './ContactFooter.tsx';
import { ThemeToggle } from '../context/ThemeContext.tsx';
import { AppView } from '../types.ts';

interface BlogPageProps {
  onEnterExperience: () => void;
  onNavigate: (view: AppView) => void;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  readTime: string;
  category: string;
  date: string;
  author: string;
  content: string[];
}

const ARTICLES: Article[] = [
  {
    id: 'what-is-an-ai-employee',
    title: 'What Is an AI Employee? A Complete Guide for Business Leaders',
    slug: 'what-is-an-ai-employee',
    excerpt: 'Discover how AI employees differ from ordinary software chatbots by executing commercial responsibilities, answering from verified Company Brain rules, and collaborating with human teams.',
    readTime: '5 min read',
    category: 'AI Employee Strategy',
    date: 'November 2026',
    author: 'Magnus Verity',
    content: [
      'The modern business landscape is shifting from software tools you must manually operate to autonomous digital employees that work alongside human teams.',
      'Unlike legacy chatbots that rely on rigid IF/THEN decision trees or generic generative LLMs that invent unverified answers, a business AI employee operates with deterministic commercial boundaries.',
      'Core characteristics of a true AI Employee:',
      '1. Grounded Knowledge Base: Configured with explicit business rules, catalog pricing, and policies in a Company Brain.',
      '2. Active Commercial Discovery: Asks natural consultative questions to discover visitor requirements rather than displaying static forms.',
      '3. Intent Scoring & Qualification: Calculates objective lead readiness (HOT, WARM, COLD) based on budget, timeline, and decision authority.',
      '4. Human Handoff Architecture: Prepares structured proposal drafts for 1-click review and approval by human sales directors.',
      'By deploying AI employees like Alpha, companies ensure zero missed inbound leads while freeing human reps to focus on strategic deal closing.',
    ],
  },
  {
    id: 'ai-sales-manager-vs-chatbot',
    title: 'AI Sales Manager vs Traditional Chatbot: Key Differences',
    slug: 'ai-sales-manager-vs-chatbot',
    excerpt: 'Why traditional website chatbots fail to convert inbound leads, and how an AI Sales Manager turns visitor questions into qualified commercial opportunities.',
    readTime: '6 min read',
    category: 'Sales Automation',
    date: 'November 2026',
    author: 'AI Workforce Research',
    content: [
      'Most website chatbots fail because they treat visitors as support tickets or force them through endless decision trees.',
      'When high-intent buyers land on a website with a specific question about custom pricing or project timelines, generic chatbots reply with unhelpful links or demand an email address before providing value.',
      'Key Differences Breakdown:',
      '• Response Quality: Traditional chatbots fail on complex queries. Alpha answers factually using real-time retrieval from Company Brain 2.0.',
      '• Engagement Style: Chatbots use fixed menu buttons. Alpha conducts fluid, consultative dialogue tailored to the visitor’s industry.',
      '• Qualification Depth: Chatbots capture basic email addresses. Alpha evaluates project scope, timeline urgency, and budget fit.',
      '• Team Workflow: Chatbots dump unvetted leads into CRMs. Alpha prepares staged proposal dossiers ready for 1-click human approval.',
      'Switching to an AI Sales Manager eliminates response delays and boosts website lead conversion by capturing interest while intent is highest.',
    ],
  },
  {
    id: 'how-ai-lead-qualification-works',
    title: 'How AI Lead Qualification Works: From Visitor to Staged Proposal',
    slug: 'how-ai-lead-qualification-works',
    excerpt: 'An insider look into Company Brain grounding, deterministic zero-hallucination guardrails, and real-time intent scoring.',
    readTime: '7 min read',
    category: 'Technical Architecture',
    date: 'November 2026',
    author: 'Magnus Verity',
    content: [
      'Lead qualification is the backbone of high-performing sales organizations. However, manually qualifying hundreds of inbound website visitors is slow and inefficient.',
      'Alpha automates lead qualification through a 4-stage intelligent pipeline:',
      'Stage 1: Active Discovery — When a visitor asks a question, Alpha answers authoritatively while naturally inquiring about their business context.',
      'Stage 2: Grounded Fact Retrieval — Every answer is verified against your Company Brain to ensure zero unverified price claims or out-of-scope promises.',
      'Stage 3: Objective Intent Scoring — Alpha analyzes the conversation to assign a score: HOT (urgent timeline + confirmed budget), WARM (high interest + evaluating timeline), or COLD (general research).',
      'Stage 4: Proposal Staging & Handoff — For HOT and WARM leads, Alpha compiles an executive summary, scope specification, and draft response for your sales team.',
    ],
  },
  {
    id: 'human-ai-collaboration',
    title: 'Human + AI Collaboration: Why Pro-Human Automation Beats Replacement',
    slug: 'human-ai-collaboration',
    excerpt: 'Why replacing human workers with unguided AI fails, and why pro-human workforce augmentation creates superior customer experiences and business growth.',
    readTime: '4 min read',
    category: 'Workforce Philosophy',
    date: 'November 2026',
    author: 'AI Workforce Philosophy',
    content: [
      'At AI Workforce, our core principle is "Better together. Never instead of."',
      'Fully automated unguided AI systems often alienate high-value enterprise buyers who demand human empathy, relationship building, and nuanced deal negotiation.',
      'Conversely, relying purely on manual human labor creates bottlenecks, delayed response times outside business hours, and lost revenue.',
      'The optimal solution is a pro-human AI workforce where digital employees handle 24/7 discovery, immediate FAQ resolution, and initial qualification, while human experts retain full oversight and final approval on custom quotes.',
    ],
  },
];

export const BlogPage: React.FC<BlogPageProps> = ({
  onEnterExperience,
  onNavigate,
}) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black antialiased">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('landing');
            }}
            className="flex items-center gap-2.5 text-white whitespace-nowrap shrink-0"
          >
            <Logo size="sm" showText={true} inverted={true} />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-300">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => onNavigate('alpha')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Alpha Sales Manager
            </button>
            <button
              type="button"
              onClick={() => onNavigate('blog')}
              className="text-white font-bold cursor-pointer"
            >
              Knowledge Hub
            </button>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />
            <button
              type="button"
              onClick={onEnterExperience}
              className="px-4 py-2 text-xs font-bold rounded-lg text-black bg-white hover:bg-zinc-200 transition-all cursor-pointer shadow-md"
            >
              MEET ALPHA
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-32 pb-24 max-w-5xl mx-auto px-4 sm:px-8">
        {!selectedArticle ? (
          <div>
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium tracking-widest text-zinc-300 uppercase mb-4">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI WORKFORCE KNOWLEDGE HUB</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                Insights &amp; AI Employee Strategies
              </h1>
              <p className="mt-4 text-base text-zinc-400 leading-relaxed">
                Educational guides, comparison research, and technical architectures for deploying autonomous AI employees.
              </p>
            </div>

            {/* Articles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {ARTICLES.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="p-7 rounded-2xl bg-[#0A0A0A] border border-white/10 hover:border-white/30 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                      <span className="font-mono text-emerald-400 uppercase">{art.category}</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{art.readTime}</span>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-zinc-200 transition-colors">
                      {art.title}
                    </h2>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                      {art.excerpt}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-white">
                    <span>Read Full Article</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Article Reading View */
          <article className="max-w-3xl mx-auto text-left">
            {/* Article JSON-LD */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'Article',
                  'headline': selectedArticle.title,
                  'description': selectedArticle.excerpt,
                  'author': {
                    '@type': 'Person',
                    'name': selectedArticle.author,
                  },
                  'publisher': {
                    '@type': 'Organization',
                    'name': 'AI Workforce',
                    'logo': 'https://aiworkforce.ai.studio/android-chrome-512x512.png',
                  },
                  'datePublished': '2026-11-01',
                  'mainEntityOfPage': `https://aiworkforce.ai.studio/blog#${selectedArticle.slug}`,
                }),
              }}
            />

            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="mb-8 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
            >
              ← Back to Knowledge Hub
            </button>

            <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-2">
              {selectedArticle.category} · {selectedArticle.readTime}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              {selectedArticle.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-zinc-400 mb-8 pb-6 border-b border-white/10">
              <span>By {selectedArticle.author}</span>
              <span>·</span>
              <span>{selectedArticle.date}</span>
            </div>

            <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
              {selectedArticle.content.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {/* In-Article CTA Banner */}
            <div className="mt-12 p-8 rounded-2xl bg-[#0A0A0A] border border-white/15 text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                Ready to experience Alpha for your business?
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Build a temporary Company Brain in under 2 minutes with zero sign-in required.
              </p>
              <button
                type="button"
                onClick={onEnterExperience}
                className="px-6 py-3 text-xs font-bold text-black bg-white hover:bg-zinc-200 transition-all rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <span>EXPERIENCE ALPHA LIVE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050505] py-14 px-4 sm:px-8 text-left">
        <ContactFooter isPublicLanding={true} />
      </footer>
    </div>
  );
};
