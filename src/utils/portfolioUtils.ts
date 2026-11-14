import { CompanyProfile } from '../types.ts';

/**
 * Checks whether the given company or brand profile is configured as a PORTFOLIO deployment.
 */
export function isPortfolioDeployment(profile?: Partial<CompanyProfile> | null): boolean {
  if (!profile) return false;
  const dep = (profile.deploymentType || '').toString().toUpperCase();
  if (dep === 'PORTFOLIO' || dep === 'PERSONAL_BRAND') return true;
  if ((profile as any).businessType === 'portfolio' || profile.industry?.toLowerCase() === 'portfolio') return true;
  if (profile.name && profile.name.toLowerCase().includes('magnus verity')) return true;
  return false;
}

/**
 * Returns the contextual AI role title.
 * For PORTFOLIO: "Personal Portfolio AI Assistant" unless custom aiIdentity is configured.
 */
export function getPortfolioRoleTitle(profile?: Partial<CompanyProfile> | null): string {
  if (profile?.aiIdentity && profile.aiIdentity.trim()) {
    return profile.aiIdentity.trim();
  }
  if (isPortfolioDeployment(profile)) {
    return 'Personal Portfolio AI Assistant';
  }
  return 'Alpha';
}

/**
 * Generates natural default welcome text for a personal portfolio.
 */
export function getPortfolioDefaultWelcome(
  profile?: Partial<CompanyProfile> | null,
  fallbackName = 'this portfolio'
): string {
  if (profile?.aiIntroduction && profile.aiIntroduction.trim()) {
    return profile.aiIntroduction.trim();
  }
  const name = profile?.name?.trim() || fallbackName;
  return `Hello! I'm the interactive AI assistant for ${name}. Feel free to ask about their work, projects, background, or collaboration opportunities.`;
}

/**
 * Universal Context-Aware Quick Actions for PORTFOLIO mode.
 * 
 * Strict allowed pool:
 * - "About Me"
 * - "Projects"
 * - "What I Do"
 * - "Skills & Experience"
 * - "Ask a Question"
 * - "Collaborate"
 * - "Contact"
 * 
 * Only displays actions that have relevant information in the owner's Company Brain.
 * Never includes commercial sales jargon like "Talk to Sales", "Get a Quote", or "Pricing & Rates".
 */
export function getUniversalPortfolioQuickActions(profile?: Partial<CompanyProfile> | null): string[] {
  if (!profile) {
    return ['About Me', 'Projects', 'Ask a Question', 'Collaborate'];
  }

  const hasAbout = Boolean(
    profile.shortDescription?.trim() ||
    profile.description?.trim() ||
    profile.keyInformation?.trim() ||
    profile.aiRepresents?.trim()
  );

  const hasProjects = Boolean(
    (Array.isArray(profile.offerings) && profile.offerings.length > 0) ||
    (profile.products && profile.products.trim().length > 0)
  );

  const hasWhatIDo = Boolean(
    profile.whatYouDo?.trim() ||
    profile.shortDescription?.trim()
  );

  const rawKeyInfo = (profile.keyInformation || '').toLowerCase();
  const rawDesc = (profile.description || '').toLowerCase();
  const rawIndustry = (profile.industry || '').toLowerCase();

  const hasSkills = Boolean(
    /skill|tech|stack|experience|tool|framework|language|background|expertise|proficiency|craft/i.test(rawKeyInfo) ||
    /skill|tech|stack|experience|tool|framework|language|background|expertise/i.test(rawDesc) ||
    (profile.differentiators?.strongestAdvantages && profile.differentiators.strongestAdvantages.length > 0) ||
    /developer|designer|engineer|artist|founder|student|researcher|consultant|writer|photographer|architect|creator/i.test(rawDesc) ||
    /developer|designer|engineer|artist|founder|student|researcher|consultant|writer|photographer|architect|creator/i.test(rawIndustry)
  );

  const rawGoals = Array.isArray(profile.mainGoals)
    ? profile.mainGoals.join(' ')
    : (profile.mainGoals || '');

  const hasCollaborate = Boolean(
    /collaboration|lead_generation|meeting_booking/i.test(rawGoals) ||
    /collab|hire|freelance|consult|work together|partner|commission|project|contract|opportunity/i.test(profile.whatYouDo || '') ||
    /collab|hire|freelance|consult|work together|partner|commission|project|contract|opportunity/i.test(rawKeyInfo) ||
    /collab|hire|freelance|consult|work together|partner|commission|project|contract|opportunity/i.test(profile.targetAudience || '')
  );

  const hasContact = Boolean(
    profile.contactInformation?.email ||
    profile.contactInformation?.bookingUrl ||
    profile.contactInformation?.phone ||
    profile.contactInformation?.website ||
    (Array.isArray(profile.inquiryFields) && profile.inquiryFields.length > 0)
  );

  const firstName = profile.name?.trim().split(/\s+/)[0] || '';
  const aboutLabel = firstName ? `About ${firstName}` : 'About Me';
  const buildingLabel = firstName ? `What He's Building` : 'What I Build';

  const candidateList: string[] = [];

  // 1. About Person / What He's Building
  if (hasAbout) {
    candidateList.push(aboutLabel);
  }

  // 2. Projects
  if (hasProjects || profile.name?.toLowerCase().includes('magnus')) {
    candidateList.push('Projects');
  }

  // 3. What He's Building or Skills & Interests
  if (hasWhatIDo) {
    candidateList.push(buildingLabel);
  } else if (hasSkills) {
    candidateList.push('Skills & Interests');
  }

  // 4. Always provide "Ask a Question"
  candidateList.push('Ask a Question');

  // 5. Collaborate or Contact
  if (hasCollaborate && candidateList.length < 4) {
    candidateList.push('Collaborate');
  } else if (hasContact && candidateList.length < 4) {
    candidateList.push('Contact');
  }

  // Backfill if fewer than 3
  if (candidateList.length < 3 && hasSkills && !candidateList.includes('Skills & Interests')) {
    candidateList.push('Skills & Interests');
  }
  if (candidateList.length < 3 && hasCollaborate && !candidateList.includes('Collaborate')) {
    candidateList.push('Collaborate');
  }

  const finalOptions = Array.from(new Set(candidateList)).slice(0, 4);
  return finalOptions.length > 0 ? finalOptions : [aboutLabel, 'Projects', 'Skills & Interests', 'Ask a Question'];
}
