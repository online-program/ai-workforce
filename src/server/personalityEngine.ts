/**
 * PROJECT ALPHA — TENANT-CONFIGURABLE PERSONALITY ENGINE
 * 
 * Configurable personality settings adapting Alpha's tone, formality, emoji usage,
 * and brand voice to the tenant's brand guidelines without losing core Alpha principles.
 * 
 * Default Personality: Intelligent, Confident, Warm, Natural, Helpful, Persuasive, Professional.
 * Rules: Never desperate, never pushy, never robotic.
 */

export type PersonalityStyle =
  | 'Professional'
  | 'Friendly'
  | 'Premium'
  | 'Consultative'
  | 'Energetic'
  | 'Minimal'
  | 'Formal';

export interface TenantPersonalityConfig {
  style: PersonalityStyle;
  formalityLevel: 'HIGH' | 'MEDIUM' | 'CASUAL';
  greetingStyle: 'EXECUTIVE_WARM' | 'DIRECT_HELPFUL' | 'FRIENDLY_CASUAL' | 'MINIMAL_ELEGANT';
  sentenceLengthPreference: 'CONCISE' | 'BALANCED' | 'DETAILED';
  emojiUsage: 'NONE' | 'SPARING' | 'FREQUENT';
  salesAssertiveness: 'CONSULTATIVE_GUIDING' | 'DIRECT_CLOSING' | 'PASSIVE_INFORMATIONAL';
  customBrandVocabulary?: string[];
  preferredLanguage?: string;
}

export const DEFAULT_ALPHA_PERSONALITY: TenantPersonalityConfig = {
  style: 'Consultative',
  formalityLevel: 'MEDIUM',
  greetingStyle: 'EXECUTIVE_WARM',
  sentenceLengthPreference: 'BALANCED',
  emojiUsage: 'NONE',
  salesAssertiveness: 'CONSULTATIVE_GUIDING',
  customBrandVocabulary: [],
  preferredLanguage: 'English',
};

/**
 * Generates system prompt directives derived from tenant personality configuration
 */
export function buildPersonalityDirectives(config?: Partial<TenantPersonalityConfig>): string {
  const cfg = { ...DEFAULT_ALPHA_PERSONALITY, ...(config || {}) };
  const directives: string[] = [];

  directives.push(`CORE PERSONALITY IDENTITY: Alpha — AI Sales Manager for this business.`);
  directives.push(`BRAND STYLE: ${cfg.style}. Maintain an intelligent, confident, warm, natural, and helpful tone.`);

  switch (cfg.style) {
    case 'Professional':
      directives.push('TONE DIRECTIVE: Executive, articulate, precise, and polite. Avoid slang or overly casual phrases.');
      break;
    case 'Friendly':
      directives.push('TONE DIRECTIVE: Warm, approachable, empathetic, and conversational. Make visitors feel welcome immediately.');
      break;
    case 'Premium':
      directives.push('TONE DIRECTIVE: High-end, sophisticated, refined, and exclusive. Emphasize craftsmanship, value, and distinction.');
      break;
    case 'Consultative':
      directives.push('TONE DIRECTIVE: Consultative, diagnostic, expert-guided. Ask perceptive questions to discover true underlying needs.');
      break;
    case 'Energetic':
      directives.push('TONE DIRECTIVE: Enthusiastic, dynamic, proactive, and engaging.');
      break;
    case 'Minimal':
      directives.push('TONE DIRECTIVE: Direct, crisp, high-impact, zero fluff.');
      break;
    case 'Formal':
      directives.push('TONE DIRECTIVE: Strictly professional, respectful, structured.');
      break;
  }

  if (cfg.emojiUsage === 'NONE') {
    directives.push('EMOJI RULE: Do not use emojis in customer messages.');
  } else if (cfg.emojiUsage === 'SPARING') {
    directives.push('EMOJI RULE: Use emojis very sparingly (max 1 per response) only when natural.');
  }

  if (cfg.sentenceLengthPreference === 'CONCISE') {
    directives.push('LENGTH RULE: Keep responses concise (under 80 words) whenever possible.');
  }

  directives.push('ANTI-PATTERN RULES: Never sound desperate, never push aggressively, and never use robotic phrases like "As an AI language model" or "Thank you for reaching out to us today".');

  return directives.join('\n');
}
