import React from 'react';
import {
  Building2,
  Package,
  Layers,
  Laptop,
  Globe2,
  Sparkles,
  ShoppingBag,
  Sun,
  Home,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Factory,
  Users2,
} from 'lucide-react';
import {
  OnboardingDraft,
  CompanyProfile,
  BusinessType,
  BusinessModelType,
  DeploymentType,
  SalesPlaybook,
  QualificationQuestionConfig,
  VisitorIntentConfig,
} from '../types.ts';
import {
  getRecommendedPlaybook,
  STANDARD_INTENTS,
} from '../data/salesPlaybooks.ts';
import { CompanyBrainOnboarding } from './CompanyBrainOnboarding.tsx';

export interface SmartOnboardingProps {
  userId: string;
  initialDraft?: Partial<OnboardingDraft>;
  initialStep?: number;
  onComplete: (profile: CompanyProfile) => void;
  onExitToLanding?: () => void;
}

export const DEPLOYMENT_CONTEXTS: {
  id: DeploymentType;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: any;
  defaultGoal: string;
}[] = [
  {
    id: 'BUSINESS',
    title: 'Business & Company',
    subtitle: 'B2B, B2C, Agencies, Enterprises & Firms',
    description: 'Deploys an AI Sales Representative to qualify customer requirements and generate structured leads.',
    badge: 'Flagship B2B/B2C',
    icon: Building2,
    defaultGoal: 'Qualify customer requirements and prepare pricing proposals',
  },
  {
    id: 'PORTFOLIO',
    title: 'Portfolio & Resume',
    subtitle: 'Professionals, Consultants, Designers & Devs',
    description: 'Deploys an interactive AI representative to present your experience, projects, skills, and book consultation calls.',
    badge: 'Personal Brand',
    icon: Laptop,
    defaultGoal: 'Present career experience, answer recruiter questions, and schedule consultations',
  },
  {
    id: 'CREATOR_FREELANCER',
    title: 'Creator & Freelancer',
    subtitle: 'YouTubers, Solo Experts, Writers & Coaches',
    description: 'Engages fans, answers sponsorship inquiries, presents service packages, and captures collaboration leads.',
    badge: 'Creator Economy',
    icon: Sparkles,
    defaultGoal: 'Answer audience inquiries, share service packages, and handle brand partnerships',
  },
  {
    id: 'STORE',
    title: 'Online Store & E-Commerce',
    subtitle: 'D2C Retailers, Digital Products & Merch',
    description: 'Guides buyers to the right products, answers order & shipping FAQs, and handles bulk purchasing requests.',
    badge: 'E-Commerce',
    icon: ShoppingBag,
    defaultGoal: 'Guide product selection, answer order questions, and support bulk orders',
  },
  {
    id: 'OTHER',
    title: 'Other Digital Presence',
    subtitle: 'Communities, Non-Profits & Custom Projects',
    description: 'Provides 24/7 intelligent assistance, member onboarding, FAQ answering, and community registration.',
    badge: 'Universal',
    icon: Globe2,
    defaultGoal: 'Provide automated visitor assistance and handle inbound requests',
  },
];

/**
 * Defensive sanitizer to ensure OnboardingDraft is ALWAYS complete, valid, and crash-proof.
 */
export function sanitizeOnboardingDraft(input?: Partial<OnboardingDraft> | null): OnboardingDraft {
  const baseDeploymentType: DeploymentType = input?.deploymentType || 'BUSINESS';
  const baseType: BusinessType = input?.businessType || 'goods';
  const baseModel: BusinessModelType =
    input?.businessModelType || (baseType === 'services' ? 'services' : 'goods');
  const recommended = getRecommendedPlaybook(baseModel);

  const rawQuestions = input?.salesPlaybook?.qualificationQuestions;
  const safeQuestions: QualificationQuestionConfig[] =
    Array.isArray(rawQuestions) && rawQuestions.length > 0
      ? rawQuestions
      : Array.isArray(recommended.qualificationQuestions)
      ? recommended.qualificationQuestions
      : [];

  const rawIntents =
    input?.salesPlaybook?.intents || (input?.salesPlaybook as any)?.visitorIntents;
  const safeIntents: VisitorIntentConfig[] =
    Array.isArray(rawIntents) && rawIntents.length > 0
      ? rawIntents
      : Array.isArray(recommended.intents)
      ? recommended.intents
      : STANDARD_INTENTS;

  const salesPlaybook: SalesPlaybook = {
    ...recommended,
    ...(input?.salesPlaybook || {}),
    qualificationQuestions: safeQuestions,
    intents: safeIntents,
    visitorIntents: safeIntents,
  };

  return {
    deploymentType: baseDeploymentType,
    companyName: typeof input?.companyName === 'string' ? input.companyName : '',
    website: typeof input?.website === 'string' ? input.website : '',
    businessType: baseType,
    businessModelType: baseModel,
    description: typeof input?.description === 'string' ? input.description : '',
    offerings: Array.isArray(input?.offerings) ? input.offerings : [],
    targetCustomers: typeof input?.targetCustomers === 'string' ? input.targetCustomers : '',
    serviceArea:
      typeof input?.serviceArea === 'string' ? input.serviceArea : 'Global & Regional',
    customServiceArea:
      typeof input?.customServiceArea === 'string' ? input.customServiceArea : '',
    location:
      typeof input?.location === 'string' && input.location.trim()
        ? input.location
        : 'Global & Regional',
    businessEmail: typeof input?.businessEmail === 'string' ? input.businessEmail : '',
    businessPhone: typeof input?.businessPhone === 'string' ? input.businessPhone : '',
    quotationRequired: input?.quotationRequired !== false,
    widgetPreset: input?.widgetPreset || 'modern_pill',
    step: Math.min(6, Math.max(1, Number(input?.step) || 1)),
    salesPlaybook,
    primaryGoal:
      typeof input?.primaryGoal === 'string'
        ? input.primaryGoal
        : 'Qualify customer requirements and prepare pricing proposals',
    tone: typeof input?.tone === 'string' ? input.tone : 'Professional and concise',
    approval_mode: input?.approval_mode || 'human_approval_required',
    unknownQuestionBehavior: input?.unknownQuestionBehavior || 'human_approval',
    faqs: Array.isArray(input?.faqs) ? input.faqs : [],
  };
}

export const getCategoryIcon = (id: BusinessModelType) => {
  switch (id) {
    case 'solar':
      return Sun;
    case 'saas':
      return Laptop;
    case 'real_estate':
      return Home;
    case 'agency':
    case 'consulting':
      return Briefcase;
    case 'education':
      return GraduationCap;
    case 'healthcare':
      return HeartPulse;
    case 'manufacturing':
      return Factory;
    case 'ecommerce':
      return ShoppingBag;
    case 'goods':
      return Package;
    case 'services':
      return Users2;
    default:
      return Layers;
  }
};

/**
 * SmartOnboarding canonical adapter: Delegates seamlessly to CompanyBrainOnboarding
 */
export const SmartOnboarding: React.FC<SmartOnboardingProps> = ({
  userId,
  initialDraft,
  initialStep = 1,
  onComplete,
  onExitToLanding,
}) => {
  return (
    <CompanyBrainOnboarding
      userId={userId}
      initialDraft={initialDraft}
      initialStep={initialStep}
      onComplete={onComplete}
      onSkip={onExitToLanding}
    />
  );
};

export default SmartOnboarding;
