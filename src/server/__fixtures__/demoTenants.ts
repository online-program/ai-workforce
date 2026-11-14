import type { CompanyProfile } from '../../types.ts';

export const APEX_COMMERCIAL_PROFILE: CompanyProfile = {
  name: 'Apex Commercial Solutions',
  industry: 'Commercial Facilities, Office Infrastructure & Workspace Solutions',
  businessType: 'hybrid',
  tone: 'Professional, consultative, direct, and authoritative',
  description:
    'Apex Commercial Solutions delivers high-grade commercial office furnishings, facility infrastructure, commercial roofing, and workspace solutions for enterprise clients.',
  businessRules:
    'Quote proposals require volume or facility specs. Provide standard commercial pricing guidelines without inventing arbitrary discounts. Escalate custom enterprise contracts to the account team.',
  products:
    'Commercial Office Furnishings (Wooden Desks, Ergonomic Workstations, Executive Suites)\nCommercial Roofing Systems (TPO, EPDM, Multi-ply)\nHVAC & Building Climate Automation\nFacility Security & Access Infrastructure',
  pricing:
    'Wooden Desks and modular workstations from $450 to $1,800/unit. Commercial roofing projects typically start from $8.50/sq ft. HVAC systems start from $14,000 for standard commercial units.',
  locations: 'Chicago, Dallas, New York, Atlanta, and regional North American metros',
  website: 'https://apexcommercial.example.com',
  faqData:
    'Q: What does Apex Commercial Solutions offer? A: We provide commercial workspace solutions including premium wooden desks, modular workstations, commercial roofing, and facility climate systems.\nQ: Do you offer bulk discounts for office furnishings? A: Yes, tiered pricing is available for orders over 10 units.\nQ: Do you offer warranties? A: Yes, 10-year commercial warranty on furnishings and 20/30-year warranties on roofing systems.',
  additionalKnowledge:
    'Apex Commercial Solutions has over 15 years of commercial contracting experience across over 4 million square feet of commercial and industrial facilities.',
  offerings: [
    {
      id: 'apex-wooden-desk',
      name: 'Wooden Desk',
      description: 'Solid hardwood commercial executive desk with integrated wire management and premium finish',
      price: '$850 - $1,650 / unit',
      status: 'LIVE',
    },
    {
      id: 'apex-workstations',
      name: 'Modular Workstations',
      description: 'Acoustic modular workstation pods for open-plan enterprise offices',
      price: '$550 / seat',
      status: 'LIVE',
    },
    {
      id: 'apex-roofing',
      name: 'Commercial Roofing Systems',
      description: 'TPO, EPDM, and multi-ply commercial roof installations',
      price: 'From $8.50 / sq ft',
      status: 'LIVE',
    },
    {
      id: 'apex-hvac',
      name: 'HVAC & Climate Automation',
      description: 'Commercial facility chillers, air handlers, and smart thermostat zoning',
      price: 'From $14,000',
      status: 'LIVE',
    },
    {
      id: 'apex-security',
      name: 'Facility Access & Security',
      description: 'Enterprise turnstiles and biometric access control',
      price: 'Custom quote',
      status: 'LIVE',
    },
  ],
  differentiators: {
    whyChooseUs: 'Commercial-grade durability, 10-year warranty, licensed master installation, and fast nationwide delivery.',
    productDifferences: 'Industrial-grade materials built for rigorous daily corporate and facility use.',
  },
  commercialInfo: {
    pricingDetails: 'Volume discounts applied automatically for enterprise orders.',
  },
  approval_mode: 'human_approval_required',
  unknownQuestionBehavior: 'human_approval',
};

export const THE_ROOTS_PROFILE: CompanyProfile = {
  name: 'TheRoots',
  industry: 'Sustainable Landscaping, Botanical Nurseries & Living Green Walls',
  businessType: 'goods',
  tone: 'Warm, organic, knowledgeable, consultative, and eco-conscious',
  description:
    'TheRoots is a premier sustainable botanical nursery and living wall provider supplying organic foliage, native landscaping stock, and interior greening.',
  businessRules:
    'All plants are nursery-grown and pest-inspected. Bulk delivery available for commercial projects with minimum orders of 10 units.',
  products:
    'Commercial Interior Foliage — Air-purifying tropical plants and self-watering architectural planters for corporate spaces.\nLiving Green Walls — Modular hydroponic living wall panels with automated sub-irrigation for lobbies and facades.\nNative Nursery Stock — Drought-tolerant native trees, shrubs, and perennials for ecological landscape architecture.',
  pricing:
    'Interior plants range from $45 to $350 per specimen. Modular living green walls start at $1,200 per 4x4 ft panel including irrigation hardware.',
  locations: 'California, Pacific Northwest, Austin, and nationwide shipping for nursery stock',
  website: 'https://theroots.example.com',
  faqData:
    'Q: What does TheRoots do? A: TheRoots designs, supplies, and installs botanical foliage, sustainable nursery plants, and living green walls for commercial and residential properties.\nQ: Is maintenance included? A: Monthly horticultural maintenance plans are available for living walls and corporate foliage.',
  additionalKnowledge:
    'TheRoots is committed to 100% organic, peat-free potting blends and native biodiverse plant varieties.',
  offerings: [
    {
      id: 'roots-foliage',
      name: 'Commercial Interior Foliage',
      description: 'Tropical plants with self-watering architectural planters',
      price: '$45 - $350 / specimen',
      status: 'LIVE',
    },
    {
      id: 'roots-green-wall',
      name: 'Living Green Walls',
      description: 'Modular hydroponic living wall panels with automated irrigation',
      price: 'From $1,200 / panel',
      status: 'LIVE',
    },
    {
      id: 'roots-nursery',
      name: 'Native Landscape Nursery Stock',
      description: 'Drought-tolerant native trees, shrubs, and rootstock',
      price: 'Bulk pricing available',
      status: 'LIVE',
    },
  ],
  differentiators: {
    whyChooseUs: 'Certified organic, sustainably harvested native plants with guaranteed 90-day acclimatization warranty.',
    productDifferences: 'Our living walls use recirculating hydroponic pumps requiring 80% less water than soil-based systems.',
  },
  commercialInfo: {
    pricingDetails: 'Volume trade discounts of 15-25% for landscape architects and corporate accounts.',
  },
  approval_mode: 'human_approval_required',
  unknownQuestionBehavior: 'human_approval',
};
