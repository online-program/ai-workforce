import {
  BusinessType,
  BusinessModelType,
  SalesPlaybook,
  VisitorIntentConfig,
  QualificationQuestionConfig,
  WidgetPresetType,
} from '../types.ts';

export interface BusinessTypeMeta {
  id: BusinessModelType;
  label: string;
  category: 'Products' | 'Services' | 'Industry-Specific' | 'Custom';
  description: string;
  badge: string;
  recommendedQuestions: QualificationQuestionConfig[];
  recommendedIntents: VisitorIntentConfig[];
}

export const STANDARD_INTENTS: VisitorIntentConfig[] = [
  {
    id: 'buy_quote',
    label: 'Get a Quote',
    description: 'Visitor is looking for pricing, quotation, or buying options',
    enabled: true,
  },
  {
    id: 'explore_products',
    label: 'Explore Products',
    description: 'Visitor wants to learn what products or solutions you offer',
    enabled: true,
  },
  {
    id: 'pricing',
    label: 'Pricing & Plans',
    description: 'Visitor wants to understand pricing structure and rates',
    enabled: true,
  },
  {
    id: 'book_consult',
    label: 'Book Consultation',
    description: 'Visitor wants to schedule a discovery call or demo',
    enabled: true,
  },
  {
    id: 'existing_customer',
    label: 'Existing Customer',
    description: 'Visitor is an existing client with an active account',
    enabled: true,
  },
  {
    id: 'partnership',
    label: 'Partnership',
    description: 'Visitor wants to explore business partnership or reseller opportunities',
    enabled: true,
  },
  {
    id: 'something_else',
    label: 'Something Else',
    description: 'Open conversation for any custom or uncategorized inquiry',
    enabled: true,
    isMandatoryFallback: true,
  },
];

export const BUSINESS_TYPES_CATALOG: BusinessTypeMeta[] = [
  {
    id: 'solar',
    label: 'Solar & Clean Energy',
    category: 'Industry-Specific',
    badge: 'Solar & Renewable',
    description: 'Solar installations, EPC, commercial rooftop & residential solar solutions.',
    recommendedQuestions: [
      {
        id: 'solar_prop_type',
        question: 'Is this solar installation for a residential home, commercial facility, or industrial plant?',
        fieldKey: 'property_type',
        required: true,
        placeholder: 'e.g. Residential home, warehouse, factory',
      },
      {
        id: 'solar_bill',
        question: 'Roughly what does your current monthly electricity bill look like?',
        fieldKey: 'monthly_bill',
        required: true,
        placeholder: 'e.g. $400/month or ₹35,000/month',
      },
      {
        id: 'solar_city',
        question: 'Which city or region will the installation be located in?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Delhi, Austin TX, London',
      },
      {
        id: 'solar_roof',
        question: 'What type of roof do you have (e.g. RCC flat roof, metal sheet, tiled)?',
        fieldKey: 'roof_type',
        required: false,
        placeholder: 'e.g. Flat RCC roof, tin shed',
      },
      {
        id: 'solar_timeline',
        question: 'When are you looking to have the solar system installed?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Next month, within 90 days',
      },
    ],
    recommendedIntents: [
      { id: 'solar_quote', label: 'Get Solar Quote', description: 'Estimate savings and system size', enabled: true },
      { id: 'solar_solutions', label: 'Commercial vs Home', description: 'Explore solar solutions', enabled: true },
      { id: 'solar_pricing', label: 'Pricing & Subsidy', description: 'Tariffs, ROI & net metering', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'saas',
    label: 'SaaS & Cloud Software',
    category: 'Products',
    badge: 'SaaS & Tech',
    description: 'B2B subscription software, APIs, developer platforms, and cloud tools.',
    recommendedQuestions: [
      {
        id: 'saas_team_size',
        question: 'How large is your team or how many user seats are you planning for?',
        fieldKey: 'team_size',
        required: true,
        placeholder: 'e.g. 10-25 seats, 50+ users',
      },
      {
        id: 'saas_current_tool',
        question: 'What tool or process are you currently using to handle this?',
        fieldKey: 'current_solution',
        required: false,
        placeholder: 'e.g. Spreadsheets, legacy CRM',
      },
      {
        id: 'saas_goal',
        question: 'What is the primary problem or workflow you want to improve?',
        fieldKey: 'need',
        required: true,
        placeholder: 'e.g. 24/7 lead qualification, automated reporting',
      },
      {
        id: 'saas_timeline',
        question: 'What is your target timeline for deploying this solution?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Immediately, next quarter',
      },
      {
        id: 'saas_budget',
        question: 'Do you have a specific budget range or pricing tier in mind?',
        fieldKey: 'budget',
        required: false,
        placeholder: 'e.g. Growth tier, $500/mo',
      },
    ],
    recommendedIntents: [
      { id: 'saas_demo', label: 'Explore Features', description: 'See how the product works', enabled: true },
      { id: 'saas_pricing', label: 'Pricing & Tiers', description: 'Plans and volume tiers', enabled: true },
      { id: 'saas_consult', label: 'Book Demo / Call', description: 'Schedule platform walkthrough', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'b2b_products',
    label: 'B2B Physical Products & Equipment',
    category: 'Products',
    badge: 'B2B Products',
    description: 'Industrial equipment, office furniture, hardware, commercial supplies.',
    recommendedQuestions: [
      {
        id: 'b2b_product_cat',
        question: 'Which specific product or model are you looking to source?',
        fieldKey: 'product_interest',
        required: true,
        placeholder: 'e.g. Ergonomic desks, CNC parts, commercial plants',
      },
      {
        id: 'b2b_qty',
        question: 'Roughly what quantity or order volume are you planning for?',
        fieldKey: 'quantity_or_scope',
        required: true,
        placeholder: 'e.g. 5 units, 500 pcs, 20 sets',
      },
      {
        id: 'b2b_loc',
        question: 'Which city or facility location should this be delivered to?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Delhi NCR, Chicago IL, Manchester UK',
      },
      {
        id: 'b2b_deadline',
        question: 'When do you need delivery completed by?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Within 2 weeks, end of month',
      },
      {
        id: 'b2b_budget',
        question: 'Do you have an allocated budget range for this procurement?',
        fieldKey: 'budget',
        required: false,
        placeholder: 'e.g. $10,000 - $25,000',
      },
    ],
    recommendedIntents: [
      { id: 'b2b_quote', label: 'Get a Quote', description: 'Request commercial quotation', enabled: true },
      { id: 'b2b_catalog', label: 'Product Catalog', description: 'Browse available models and specs', enabled: true },
      { id: 'b2b_pricing', label: 'Bulk Pricing', description: 'Volume discounts and MOQs', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'real_estate',
    label: 'Real Estate & Properties',
    category: 'Industry-Specific',
    badge: 'Real Estate',
    description: 'Residential developments, commercial leasing, luxury properties, plots.',
    recommendedQuestions: [
      {
        id: 're_prop_type',
        question: 'Are you interested in residential (apartment/villa) or commercial property?',
        fieldKey: 'property_type',
        required: true,
        placeholder: 'e.g. 3BHK Apartment, Commercial Office Space',
      },
      {
        id: 're_loc',
        question: 'What is your preferred location or neighborhood?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Golf Course Road Gurgaon, Downtown Austin',
      },
      {
        id: 're_budget',
        question: 'What is your target budget or investment range?',
        fieldKey: 'budget',
        required: true,
        placeholder: 'e.g. $500k - $1M or ₹2.5 Cr - ₹4 Cr',
      },
      {
        id: 're_timeline',
        question: 'What is your purchase or possession timeline?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Ready to move, within 6 months',
      },
      {
        id: 're_financing',
        question: 'Will this be a self-funded investment or do you require mortgage/bank financing?',
        fieldKey: 'financing_needed',
        required: false,
        placeholder: 'e.g. Pre-approved loan, self-funded',
      },
    ],
    recommendedIntents: [
      { id: 're_browse', label: 'Explore Properties', description: 'Available listings & units', enabled: true },
      { id: 're_visit', label: 'Book Site Visit', description: 'Schedule in-person property walkthrough', enabled: true },
      { id: 're_price', label: 'Pricing & Floor Plans', description: 'Payment schedules and layouts', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'agency',
    label: 'Digital Agency & Creative Studio',
    category: 'Services',
    badge: 'Agency & Creative',
    description: 'Performance marketing, web design, branding, software development.',
    recommendedQuestions: [
      {
        id: 'agency_service',
        question: 'What primary service or deliverable are you looking for?',
        fieldKey: 'need',
        required: true,
        placeholder: 'e.g. Website redesign, Paid Ads Growth, Brand Identity',
      },
      {
        id: 'agency_situation',
        question: 'What type of business are you running and what is your current growth bottleneck?',
        fieldKey: 'current_solution',
        required: false,
        placeholder: 'e.g. DTC ecommerce brand scaling to $50k/mo',
      },
      {
        id: 'agency_timeline',
        question: 'When are you aiming to kick off and launch this project?',
        fieldKey: 'timeline',
        required: true,
        placeholder: 'e.g. Start next week, complete in 6 weeks',
      },
      {
        id: 'agency_budget',
        question: 'What monthly retainer or project budget have you earmarked?',
        fieldKey: 'budget',
        required: false,
        placeholder: 'e.g. $5,000/month or $20k project',
      },
    ],
    recommendedIntents: [
      { id: 'agency_proposal', label: 'Request Proposal', description: 'Scope and timeline estimate', enabled: true },
      { id: 'agency_portfolio', label: 'Our Work / Case Studies', description: 'Past client outcomes', enabled: true },
      { id: 'agency_consult', label: 'Schedule Discovery Call', description: 'Meet with our creative team', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'consulting',
    label: 'Consulting & Professional Advisory',
    category: 'Services',
    badge: 'Advisory & Consulting',
    description: 'Management consulting, financial advisory, legal, strategy.',
    recommendedQuestions: [
      {
        id: 'consult_challenge',
        question: 'What is the core strategic challenge or initiative you need guidance on?',
        fieldKey: 'need',
        required: true,
        placeholder: 'e.g. Market expansion, financial restructuring, SOC2 compliance',
      },
      {
        id: 'consult_org_size',
        question: 'What is the size of your organization or leadership team?',
        fieldKey: 'team_size',
        required: false,
        placeholder: 'e.g. 50 employees, Series A startup',
      },
      {
        id: 'consult_timeline',
        question: 'What is your target timeframe for advisory engagement?',
        fieldKey: 'timeline',
        required: true,
        placeholder: 'e.g. 3-month advisory engagement',
      },
    ],
    recommendedIntents: [
      { id: 'consult_book', label: 'Book Advisory Session', description: 'Initial consultation call', enabled: true },
      { id: 'consult_areas', label: 'Practice Areas', description: 'Our consulting capabilities', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'education',
    label: 'Education, Bootcamps & Training',
    category: 'Industry-Specific',
    badge: 'EdTech & Training',
    description: 'Tech bootcamps, corporate upskilling, university programs, coaching.',
    recommendedQuestions: [
      {
        id: 'edu_program',
        question: 'Which course, bootcamp, or training program are you interested in?',
        fieldKey: 'product_interest',
        required: true,
        placeholder: 'e.g. Full-Stack Bootcamp, Executive AI Leadership',
      },
      {
        id: 'edu_learners',
        question: 'Is this for individual enrollment or corporate team training?',
        fieldKey: 'team_size',
        required: true,
        placeholder: 'e.g. Individual career change, 15-person enterprise cohort',
      },
      {
        id: 'edu_start',
        question: 'When would you like to begin (e.g. upcoming cohort or immediate)?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Next upcoming cohort, within 30 days',
      },
    ],
    recommendedIntents: [
      { id: 'edu_syllabus', label: 'View Curriculum', description: 'Modules and project roadmap', enabled: true },
      { id: 'edu_pricing', label: 'Tuition & Scholarships', description: 'Fee structure and EMI options', enabled: true },
      { id: 'edu_apply', label: 'Apply / Enroll', description: 'Start your application', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing & Industrial Supply',
    category: 'Products',
    badge: 'Manufacturing',
    description: 'Custom parts, CNC machining, OEM fabrication, sheet metal.',
    recommendedQuestions: [
      {
        id: 'mfg_spec',
        question: 'What parts or components are you looking to manufacture or fabricate?',
        fieldKey: 'product_interest',
        required: true,
        placeholder: 'e.g. Precision aluminum brackets, CNC milled enclosures',
      },
      {
        id: 'mfg_volume',
        question: 'What is your estimated batch volume or annual run quantity?',
        fieldKey: 'quantity_or_scope',
        required: true,
        placeholder: 'e.g. Prototype batch of 50 units, 5,000 units/quarter',
      },
      {
        id: 'mfg_location',
        question: 'Where should finished assemblies or freight be delivered?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Pune, Detroit MI, Hamburg',
      },
      {
        id: 'mfg_date',
        question: 'What is your required production deadline or delivery window?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. First delivery needed in 4 weeks',
      },
    ],
    recommendedIntents: [
      { id: 'mfg_rfq', label: 'Submit RFQ / Drawing', description: 'Get manufacturing quote', enabled: true },
      { id: 'mfg_capabilities', label: 'Tolerances & Materials', description: 'CNC, 3D printing & sheet metal specs', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'wholesale',
    label: 'Wholesale & Distribution',
    category: 'Products',
    badge: 'Wholesale & B2B',
    description: 'Bulk distribution, FMCG, electronics distribution, apparel wholesale.',
    recommendedQuestions: [
      {
        id: 'ws_categories',
        question: 'Which product categories or SKUs are you interested in distributing?',
        fieldKey: 'product_interest',
        required: true,
        placeholder: 'e.g. Organic coffee beans, consumer electronics, apparel',
      },
      {
        id: 'ws_volume',
        question: 'What order volume or carton quantity are you looking to stock?',
        fieldKey: 'quantity_or_scope',
        required: true,
        placeholder: 'e.g. 500 units monthly, 1 full container',
      },
      {
        id: 'ws_location',
        question: 'What is your distribution territory or destination warehouse location?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Mumbai, Rotterdam, Los Angeles',
      },
    ],
    recommendedIntents: [
      { id: 'ws_catalog', label: 'Wholesale Catalog', description: 'MOQs and SKU lists', enabled: true },
      { id: 'ws_pricing', label: 'Volume Price Tiering', description: 'Wholesale discount rates', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Medical Clinics',
    category: 'Industry-Specific',
    badge: 'Healthcare & Clinic',
    description: 'Dental clinics, diagnostic labs, telehealth, medical treatments.',
    recommendedQuestions: [
      {
        id: 'hc_service',
        question: 'What medical specialty, procedure, or diagnostic service do you require?',
        fieldKey: 'need',
        required: true,
        placeholder: 'e.g. Dental implants, MRI diagnostic, specialist consultation',
      },
      {
        id: 'hc_loc',
        question: 'Which clinic branch or location is most convenient for you?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. South Delhi Clinic, Main Hospital Center',
      },
      {
        id: 'hc_urgency',
        question: 'How soon are you looking to schedule this appointment or procedure?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. This week, next Monday',
      },
    ],
    recommendedIntents: [
      { id: 'hc_book', label: 'Book Appointment', description: 'Schedule doctor or specialist visit', enabled: true },
      { id: 'hc_services', label: 'Treatments & Doctors', description: 'Explore clinical specialties', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'hospitality',
    label: 'Hospitality, Hotels & Event Venues',
    category: 'Industry-Specific',
    badge: 'Hospitality & Venues',
    description: 'Boutique hotels, conference centers, wedding venues, banquet halls.',
    recommendedQuestions: [
      {
        id: 'hosp_event_type',
        question: 'Are you planning a corporate conference, wedding, private retreat, or hotel stay?',
        fieldKey: 'property_type',
        required: true,
        placeholder: 'e.g. 2-day Corporate Summit, Wedding banquet',
      },
      {
        id: 'hosp_guests',
        question: 'How many attendees, guests, or rooms will you be hosting?',
        fieldKey: 'quantity_or_scope',
        required: true,
        placeholder: 'e.g. 120 guests, 35 rooms',
      },
      {
        id: 'hosp_dates',
        question: 'What are your target event dates or check-in window?',
        fieldKey: 'timeline',
        required: true,
        placeholder: 'e.g. Nov 14-16, 2026',
      },
      {
        id: 'hosp_budget',
        question: 'What is your overall hospitality or event package budget?',
        fieldKey: 'budget',
        required: false,
        placeholder: 'e.g. $15,000 - $25,000',
      },
    ],
    recommendedIntents: [
      { id: 'hosp_quote', label: 'Venue Availability & Quote', description: 'Check dates and rates', enabled: true },
      { id: 'hosp_packages', label: 'Catering & Event Packages', description: 'Explore amenities and menus', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'ecommerce',
    label: 'Ecommerce & Consumer Goods (B2C)',
    category: 'Products',
    badge: 'Ecommerce & Retail',
    description: 'Online apparel, home decor, electronics, consumer packaged goods.',
    recommendedQuestions: [
      {
        id: 'ecom_item',
        question: 'Which item or collection are you interested in?',
        fieldKey: 'product_interest',
        required: true,
        placeholder: 'e.g. Leather duffel bag, indoor planter sets',
      },
      {
        id: 'ecom_qty',
        question: 'How many items or sets are you looking to order?',
        fieldKey: 'quantity_or_scope',
        required: true,
        placeholder: 'e.g. 1 unit, 5 sets for corporate gifts',
      },
      {
        id: 'ecom_city',
        question: 'What city or pin code should we ship to?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Mumbai 400001, Seattle WA 98101',
      },
    ],
    recommendedIntents: [
      { id: 'ecom_shop', label: 'Shop Collections', description: 'Browse bestsellers and new arrivals', enabled: true },
      { id: 'ecom_shipping', label: 'Shipping & Delivery', description: 'Delivery timelines and return policy', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'services',
    label: 'General Professional Services',
    category: 'Services',
    badge: 'Professional Services',
    description: 'Custom implementations, maintenance, commercial contracting, IT services.',
    recommendedQuestions: [
      {
        id: 'svc_scope',
        question: 'What specific service or project scope are you looking to accomplish?',
        fieldKey: 'need',
        required: true,
        placeholder: 'e.g. Office network installation, commercial facility maintenance',
      },
      {
        id: 'svc_loc',
        question: 'Where is your service location or is this remote?',
        fieldKey: 'location',
        required: true,
        placeholder: 'e.g. Dallas TX, London UK, or Remote',
      },
      {
        id: 'svc_timeline',
        question: 'What is your target completion timeline?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Next 30 days, ASAP',
      },
      {
        id: 'svc_budget',
        question: 'Do you have an allocated budget for this project?',
        fieldKey: 'budget',
        required: false,
        placeholder: 'e.g. $5,000 - $15,000',
      },
    ],
    recommendedIntents: [
      { id: 'svc_quote', label: 'Request Service Quote', description: 'Scope evaluation & estimate', enabled: true },
      { id: 'svc_capabilities', label: 'Explore Services', description: 'Our capabilities and team', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Business Model / Other',
    category: 'Custom',
    badge: 'Custom Sales Flow',
    description: 'Define your own tailored sales flow, qualification logic, and intents.',
    recommendedQuestions: [
      {
        id: 'cust_need',
        question: 'What specific requirement or project are you looking to fulfill?',
        fieldKey: 'need',
        required: true,
        placeholder: 'e.g. Tell us about your goal or requirement',
      },
      {
        id: 'cust_loc',
        question: 'Which city or region are you located in?',
        fieldKey: 'location',
        required: false,
        placeholder: 'e.g. City, Country',
      },
      {
        id: 'cust_timeline',
        question: 'What is your expected timeline or target start date?',
        fieldKey: 'timeline',
        required: false,
        placeholder: 'e.g. Next month, within 60 days',
      },
    ],
    recommendedIntents: [
      { id: 'cust_quote', label: 'Get a Quote', description: 'Discuss requirements and pricing', enabled: true },
      { id: 'cust_info', label: 'Product & Service Info', description: 'Learn what we offer', enabled: true },
      { id: 'something_else', label: 'Something Else', description: 'Open inquiry', enabled: true, isMandatoryFallback: true },
    ],
  },
];

/**
 * Returns a configured SalesPlaybook for any given business type.
 */
export function getRecommendedPlaybook(businessTypeInput?: BusinessType | string): SalesPlaybook {
  const norm = (businessTypeInput || 'saas').toLowerCase().trim();
  
  // Find matching catalog entry
  const meta =
    BUSINESS_TYPES_CATALOG.find((b) => b.id === norm) ||
    BUSINESS_TYPES_CATALOG.find((b) => norm.includes(b.id)) ||
    (norm === 'goods' ? BUSINESS_TYPES_CATALOG.find((b) => b.id === 'b2b_products') : null) ||
    (norm === 'services' ? BUSINESS_TYPES_CATALOG.find((b) => b.id === 'services') : null) ||
    BUSINESS_TYPES_CATALOG.find((b) => b.id === 'custom') ||
    BUSINESS_TYPES_CATALOG[0];

  const questions = Array.isArray(meta?.recommendedQuestions) ? [...meta.recommendedQuestions] : [];
  const intentsList = Array.isArray(meta?.recommendedIntents) ? [...meta.recommendedIntents] : [...STANDARD_INTENTS];

  return {
    businessType: (meta?.id as BusinessType) || 'goods',
    businessTypeName: meta?.label || 'Business Solutions',
    intents: intentsList,
    visitorIntents: intentsList,
    qualificationQuestions: questions,
    requiredLeadFields: ['name', 'email', 'phone'],
    qualificationCriteria: `Qualify when customer specifies need, project scope/timeline, and provides valid contact info.`,
    defaultWidgetPreset: 'modern_pill',
    welcomeOptions: intentsList.map((i) => i.label),
  };
}

/**
 * Official AI Workforce Playbook (Dogfooding the Sales Manager)
 */
export const OFFICIAL_AI_WORKFORCE_PLAYBOOK: SalesPlaybook = {
  businessType: 'saas',
  businessTypeName: 'B2B AI Employees & Revenue Operations',
  intents: [
    {
      id: 'explore_employees',
      label: 'Explore AI Employees',
      description: 'Discover Alpha, Omega, and AI Revenue Analyst',
      enabled: true,
    },
    {
      id: 'how_it_works',
      label: 'How It Works',
      description: 'Understand Company Brain grounding and human-in-the-loop approval',
      enabled: true,
    },
    {
      id: 'founding_pricing',
      label: 'Pricing & Plans',
      description: '$149/mo standard plan with zero setup fees',
      enabled: true,
    },
    {
      id: 'deploy_manager',
      label: "Deploy Alpha",
      description: 'Get started with 24/7 conversational AI',
      enabled: true,
    },
    {
      id: 'partner_program',
      label: 'Become a Partner',
      description: 'Agency and reseller partner program',
      enabled: true,
    },
    {
      id: 'something_else',
      label: 'Something Else',
      description: 'Ask any question freely',
      enabled: true,
      isMandatoryFallback: true,
    },
  ],
  qualificationQuestions: [
    {
      id: 'aiw_biz_type',
      question: 'What type of business do you run (e.g. Solar, SaaS, Services, Manufacturing, Real Estate)?',
      fieldKey: 'business_type',
      required: true,
      placeholder: 'e.g. Solar EPC company, SaaS startup, Marketing Agency',
    },
    {
      id: 'aiw_leads_volume',
      question: 'Roughly how many website visitors or inbound leads do you receive each month?',
      fieldKey: 'lead_volume',
      required: true,
      placeholder: 'e.g. 50 leads/mo, 200 leads/mo, 1,000+ visitors',
    },
    {
      id: 'aiw_deploy_timeline',
      question: 'Are you looking to deploy Alpha immediately on your website or within the next 30 days?',
      fieldKey: 'timeline',
      required: false,
      placeholder: 'e.g. Immediately this week, next month',
    },
  ],
  requiredLeadFields: ['name', 'email', 'phone', 'company'],
  qualificationCriteria:
    'Qualify lead when visitor provides business type, estimated monthly lead volume, and verified email or phone number for setup support.',
  defaultWidgetPreset: 'modern_pill',
  welcomeOptions: [
    'Explore AI Employees',
    'How It Works',
    'Pricing',
    "I'm Interested in Alpha",
    'Become a Partner',
    'Something Else',
  ],
};
