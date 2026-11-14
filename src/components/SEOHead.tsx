import React, { useEffect } from 'react';
import { AppView } from '../types.ts';

interface SEOHeadProps {
  view: AppView;
  articleTitle?: string;
}

interface PageMeta {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  robots: string;
  ogType: string;
}

const BASE_URL = 'https://aiworkforce.ai.studio';

const META_CONFIG: Record<string, PageMeta> = {
  landing: {
    title: 'AI Workforce — AI Sales Manager & Digital AI Employees Platform',
    description: 'Meet AI Workforce — AI employees that help businesses manage conversations, answer commercial questions, qualify opportunities, and move work forward with human oversight.',
    keywords: 'AI Workforce, AI employees, Alpha AI Sales Manager, AI Sales Manager, Company Brain AI, conversational sales AI, digital workforce',
    canonical: `${BASE_URL}/`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  alpha: {
    title: 'Alpha AI Sales Manager | AI Workforce',
    description: 'Meet Alpha, the flagship 24/7 AI Sales Manager by AI Workforce. Engage website visitors, answer business questions from Company Brain, qualify leads, and stage proposals for human approval.',
    keywords: 'Alpha AI Sales Manager, AI sales employee, AI lead qualification, Company Brain AI, AI sales assistant, AI workforce automation',
    canonical: `${BASE_URL}/alpha`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'product',
  },
  blog: {
    title: 'AI Workforce Insights | Educational Guides & AI Employee Strategies',
    description: 'Explore insights on AI Sales Managers, Company Brain grounding, AI lead qualification, and pro-human automation strategies by AI Workforce.',
    keywords: 'AI employee guide, AI sales manager vs chatbot, AI lead qualification, human AI collaboration, business AI employees',
    canonical: `${BASE_URL}/blog`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  about: {
    title: 'About AI Workforce | The Pro-Human AI Employee Platform',
    description: 'Learn about AI Workforce. We build specialized AI employees that work alongside human teams to manage website sales, customer discovery, and operational handoffs.',
    keywords: 'About AI Workforce, AI employee company, pro-human AI, Magnus Verity, AI Workforce mission',
    canonical: `${BASE_URL}/about`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  contact: {
    title: 'Contact AI Workforce | Support & Sales Inquiries',
    description: 'Get in touch with AI Workforce. Contact support.aiworkforce@gmail.com for enterprise inquiries, Company Brain onboarding support, or product assistance.',
    keywords: 'Contact AI Workforce, AI Workforce support, AI Workforce email, AI Workforce sales',
    canonical: `${BASE_URL}/contact`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  privacy: {
    title: 'Privacy Policy | AI Workforce',
    description: 'Read the AI Workforce Privacy Policy. Learn how we collect, protect, and isolate customer data, Company Brain records, and visitor communications.',
    keywords: 'AI Workforce privacy policy, data protection, Firestore security, Company Brain isolation',
    canonical: `${BASE_URL}/privacy`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  cookies: {
    title: 'Cookie & Local Storage Policy | AI Workforce',
    description: 'Read the AI Workforce Cookie & Local Storage Policy. Understand how essential session tokens and theme preferences are stored.',
    keywords: 'AI Workforce cookies, local storage policy, browser storage',
    canonical: `${BASE_URL}/cookies`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  terms: {
    title: 'Terms of Service | AI Workforce',
    description: 'Read the AI Workforce Terms of Service governing the use of Alpha, Company Brain, and our AI Employee Platform.',
    keywords: 'AI Workforce terms of service, platform agreement, SLA',
    canonical: `${BASE_URL}/terms`,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    ogType: 'website',
  },
  experience: {
    title: 'Alpha Experience Mode | AI Workforce',
    description: 'Experience Alpha AI Sales Manager live for your business without signing in or installing anything.',
    keywords: 'Alpha demo, Experience Mode, test AI sales manager',
    canonical: `${BASE_URL}/experience`,
    robots: 'noindex, nofollow',
    ogType: 'website',
  },
  workspace: {
    title: 'Workspace | AI Workforce',
    description: 'AI Workforce User Workspace and Command Center.',
    keywords: 'AI Workforce workspace, dashboard',
    canonical: `${BASE_URL}/workspace`,
    robots: 'noindex, nofollow',
    ogType: 'website',
  },
  admin: {
    title: 'Admin Control Center | AI Workforce',
    description: 'AI Workforce System Administration & Telemetry.',
    keywords: 'admin center',
    canonical: `${BASE_URL}/admin`,
    robots: 'noindex, nofollow',
    ogType: 'website',
  },
};

export const SEOHead: React.FC<SEOHeadProps> = ({ view, articleTitle }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const meta = META_CONFIG[view] || META_CONFIG.landing;
    const finalTitle = articleTitle ? `${articleTitle} | AI Workforce` : meta.title;

    // 1. Update Title Tag
    document.title = finalTitle;

    // Helper to set or create meta tag
    const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to set or create link canonical tag
    const setCanonical = (href: string) => {
      let element = document.querySelector('link[rel="canonical"]');
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // 2. Set Primary SEO Meta Tags
    setMeta('name', 'description', meta.description);
    setMeta('name', 'keywords', meta.keywords);
    setMeta('name', 'robots', meta.robots);
    setMeta('name', 'googlebot', meta.robots);
    setMeta('name', 'bingbot', meta.robots);
    setCanonical(meta.canonical);

    // 3. Set OpenGraph Tags
    setMeta('property', 'og:title', finalTitle);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', meta.canonical);
    setMeta('property', 'og:type', meta.ogType);
    setMeta('property', 'og:site_name', 'AI Workforce');
    setMeta('property', 'og:image', `${BASE_URL}/og-image.jpg`);

    // 4. Set Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', finalTitle);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', `${BASE_URL}/og-image.jpg`);
  }, [view, articleTitle]);

  return null;
};
