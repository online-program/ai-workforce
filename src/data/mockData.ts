import { CompanyProfile, InquiryLead, ActivityLog, SalesTask } from '../types.ts';

export const defaultCompanyProfile: CompanyProfile = {
  name: 'My Business',
  industry: 'Commercial Solutions',
  businessType: 'goods',
  products: 'Commercial Products & Solutions',
  locations: 'Regional & Global',
  minOrder: 'Standard commercial engagements',
  tone: 'Professional and concise',
  businessRules:
    'Never invent prices.\nNever promise capacity or inventory without confirmation.\nNever promise delivery dates without verification.\nEscalate custom requests to a human.',
  description: 'Commercial provider delivering high-quality business solutions.',
  country: 'US',
  currency: 'USD',
  timezone: 'UTC',
  locale: 'en-US',
  website: '',
  targetCustomers: '',
  serviceArea: 'Regional & Global',
  unknownQuestionBehavior: 'human_approval',
  offerings: [],
};

export const initialCompanyProfile: CompanyProfile = defaultCompanyProfile;

export const defaultLeads: InquiryLead[] = [];
export const defaultActivities: ActivityLog[] = [];
export const defaultTasks: SalesTask[] = [];

export const initialLeads: InquiryLead[] = [];
export const initialActivities: ActivityLog[] = [];
export const initialTasks: SalesTask[] = [];

export const mockLeads: InquiryLead[] = [];
export const demoInitialLeads: InquiryLead[] = [];
export const demoInitialActivities: ActivityLog[] = [];
export const demoInitialTasks: SalesTask[] = [];


