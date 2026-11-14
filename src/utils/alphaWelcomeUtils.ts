import { CompanyProfile } from '../types.ts';
import { isPortfolioDeployment } from './portfolioUtils.ts';

/**
 * Generates Alpha's visitor-facing opening message dynamically from the Company Brain.
 * 
 * Default greeting:
 * "Hey — I’m Alpha, AI Workforce’s Sales Manager. What can I help you with?"
 * 
 * Concise, non-pushy, visitor-first.
 * Does not pitch, explain every capability, qualify upfront, or mention internal architectures.
 */
export function generateAlphaVisitorGreeting(
  companyProfile?: Partial<CompanyProfile> | null,
  customWelcomeMessage?: string
): string {
  // If a custom welcome message has been specifically set by the admin and does not contain obsolete boilerplate, use it
  if (customWelcomeMessage && customWelcomeMessage.trim()) {
    const trimmed = customWelcomeMessage.trim();
    const isObsoleteBoilerplate =
      /first layer of your digital sales team/i.test(trimmed) ||
      /using your Company Brain/i.test(trimmed) ||
      /qualify relevant opportunities/i.test(trimmed) ||
      /24\/7 digital sales managers/i.test(trimmed) ||
      /fit for your pipeline/i.test(trimmed) ||
      /What are you looking to solve\?/i.test(trimmed) ||
      /commercial equipment and turnkey industrial setups/i.test(trimmed) ||
      /sustainably crafted products/i.test(trimmed) ||
      /catalog grounding/i.test(trimmed) ||
      /Ask me anything about how AI Workforce operates/i.test(trimmed);

    if (!isObsoleteBoilerplate) {
      return trimmed;
    }
  }

  // Portfolio deployment
  if (isPortfolioDeployment(companyProfile)) {
    const name = companyProfile?.name?.trim() || 'this portfolio';
    return `Hey — I’m the AI representative for ${name}. What can I help you with?`;
  }

  const companyName = companyProfile?.name?.trim() || '';
  const isOfficialBrand = companyName === 'AI Workforce';
  const isUnconfigured = !companyName || companyName === 'My Business' || companyName === 'Alpha' || companyName === 'Business Assistant';

  if (isOfficialBrand) {
    return "Hey — I’m Alpha, AI Workforce’s Sales Manager. What can I help you with?";
  }

  if (isUnconfigured) {
    return "Hey — I’m Alpha, your AI Sales Manager. What can I help you with?";
  }

  return `Hey — I’m the AI Sales Manager for ${companyName}. What can I help you with?`;
}

/**
 * Derives clean, non-pushy initial quick options based on the Company Brain.
 */
export function getAlphaInitialSuggestions(
  companyProfile?: Partial<CompanyProfile> | null
): string[] {
  if (isPortfolioDeployment(companyProfile)) {
    return ['View Projects', 'Ask a question', 'Get in touch'];
  }

  const companyName = companyProfile?.name?.trim() || '';
  if (companyName === 'AI Workforce') {
    return ['Explore solutions', 'Ask a question', 'Talk to sales'];
  }

  // Derived from company offerings
  if (Array.isArray(companyProfile?.offerings) && companyProfile.offerings.length > 0) {
    const firstOffering = companyProfile.offerings[0]?.name;
    if (firstOffering) {
      return [`Explore ${firstOffering.slice(0, 24)}`, 'Ask a question', 'Talk to sales'];
    }
  }

  return ['Explore solutions', 'Ask a question', 'Talk to sales'];
}

