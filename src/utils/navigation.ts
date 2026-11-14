import { AppView, WorkspaceTab } from '../types.ts';

export interface RouteState {
  view: AppView;
  tab: WorkspaceTab;
  landingSection?: string;
}

export function parseRouteFromLocation(): RouteState {
  if (typeof window === 'undefined') {
    return { view: 'landing', tab: 'workspace_home' };
  }

  const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';

  // 1. Admin Center (Secret route for real admins only)
  if (rawPath.startsWith('/admin')) {
    return { view: 'admin', tab: 'workspace_home' };
  }

  // 2. Alpha Sales Coordinator / Manager Standalone Workspace
  if (rawPath === '/sales-coordinator' || rawPath === '/alpha' || rawPath === '/chat') {
    return { view: 'employee_sales_coordinator', tab: 'workspace_home' };
  }

  // 3. Workspace Specific Sub-Pages
  if (rawPath === '/workspace' || rawPath === '/dashboard' || rawPath === '/overview') {
    return { view: 'workspace', tab: 'workspace_home' };
  }
  if (rawPath === '/employees' || rawPath === '/alpha-command') {
    return { view: 'workspace', tab: 'employees' };
  }
  if (rawPath === '/conversations' || rawPath === '/chats') {
    return { view: 'workspace', tab: 'conversations' };
  }
  if (rawPath === '/work-queue' || rawPath === '/leads' || rawPath === '/inbox' || rawPath === '/approvals') {
    return { view: 'workspace', tab: 'work_queue' };
  }
  if (rawPath === '/company-brain' || rawPath === '/brain' || rawPath === '/catalog' || rawPath === '/company-profile') {
    return { view: 'workspace', tab: 'company_brain' };
  }
  if (rawPath === '/widget-studio' || rawPath === '/studio') {
    return { view: 'workspace', tab: 'widget_studio' };
  }
  if (rawPath === '/embed' || rawPath === '/install') {
    return { view: 'workspace', tab: 'embed' };
  }
  if (rawPath === '/activity' || rawPath === '/live-activity' || rawPath === '/audit') {
    return { view: 'workspace', tab: 'activity' };
  }
  if (rawPath === '/settings') {
    return { view: 'workspace', tab: 'settings' };
  }

  // 4. Landing Page Deep-Linked Sections
  const landingSections = ['problem', 'how-it-works', 'ecosystem', 'faq', 'pricing'];
  const stripped = rawPath.replace(/^\/+/, '');
  if (landingSections.includes(stripped)) {
    return { view: 'landing', tab: 'workspace_home', landingSection: stripped };
  }

  // 3.5. Public Pages (Alpha Product Page, Blog, Experience Mode, Legal)
  if (rawPath === '/alpha' || rawPath === '/alpha-sales-manager') {
    return { view: 'alpha', tab: 'workspace_home' };
  }
  if (rawPath === '/blog' || rawPath === '/insights' || rawPath === '/knowledge-base') {
    return { view: 'blog', tab: 'workspace_home' };
  }
  if (rawPath === '/experience') {
    return { view: 'experience', tab: 'workspace_home' };
  }
  if (rawPath === '/privacy' || rawPath === '/privacy-policy') {
    return { view: 'privacy', tab: 'workspace_home' };
  }
  if (rawPath === '/cookies' || rawPath === '/cookie-policy') {
    return { view: 'cookies', tab: 'workspace_home' };
  }
  if (rawPath === '/terms' || rawPath === '/terms-of-service') {
    return { view: 'terms', tab: 'workspace_home' };
  }
  if (rawPath === '/about') {
    return { view: 'about', tab: 'workspace_home' };
  }
  if (rawPath === '/contact') {
    return { view: 'contact', tab: 'workspace_home' };
  }

  return { view: 'landing', tab: 'workspace_home' };
}

export function getUrlForRoute(view: AppView, tab: WorkspaceTab, landingSection?: string): string {
  if (view === 'admin') {
    return '/admin';
  }
  if (view === 'alpha') {
    return '/alpha';
  }
  if (view === 'blog') {
    return '/blog';
  }
  if (view === 'experience') {
    return '/experience';
  }
  if (view === 'privacy') {
    return '/privacy';
  }
  if (view === 'cookies') {
    return '/cookies';
  }
  if (view === 'terms') {
    return '/terms';
  }
  if (view === 'about') {
    return '/about';
  }
  if (view === 'contact') {
    return '/contact';
  }
  if (view === 'employee_sales_coordinator') {
    return '/sales-coordinator';
  }
  if (view === 'workspace') {
    switch (tab) {
      case 'workspace_home':
        return '/workspace';
      case 'employees':
        return '/employees';
      case 'conversations':
        return '/conversations';
      case 'work_queue':
        return '/work-queue';
      case 'company_brain':
        return '/company-brain';
      case 'widget_studio':
        return '/widget-studio';
      case 'embed':
        return '/embed';
      case 'activity':
        return '/activity';
      case 'settings':
        return '/settings';
      default:
        return '/workspace';
    }
  }
  if (view === 'landing') {
    if (landingSection) {
      return `/${landingSection}`;
    }
    return '/';
  }
  return '/';
}
