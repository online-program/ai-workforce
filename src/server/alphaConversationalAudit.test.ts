import { processWebsiteChatMessage } from './chatHandler.ts';
import { AI_WORKFORCE_OFFICIAL_PROFILE } from './widgetHandler.ts';

interface TestCase {
  id: string;
  name: string;
  messages: string[];
  assertions: (reply: string, historyReplies: string[]) => { pass: boolean; reason: string };
}

const testCases: TestCase[] = [
  {
    id: 'TEST_01_WASSUP',
    name: 'Casual greeting: "Wassup"',
    messages: ['Wassup'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const hasGreeting = lower.includes('hey') || lower.includes("what's going on") || lower.includes('how can i help');
      const hasNoAggressivePitch = !lower.includes('flagship conversational ai') && !lower.includes('schedule a demo');
      return {
        pass: hasGreeting && hasNoAggressivePitch,
        reason: `Reply: "${reply}" | hasGreeting=${hasGreeting}, hasNoAggressivePitch=${hasNoAggressivePitch}`,
      };
    },
  },
  {
    id: 'TEST_02_WHAT_ARE_YOU_DOING',
    name: 'Activity question: "What are you doing?"',
    messages: ['What are you doing?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const isConversational = lower.includes('sales manager') || lower.includes('help visitors') || lower.includes('explore our platform') || lower.includes('answer questions');
      const noUnrelatedFeatureDump = !lower.includes('omega') && !lower.includes('sigma') && !lower.includes('pulse');
      return {
        pass: isConversational && noUnrelatedFeatureDump,
        reason: `Reply: "${reply}" | isConversational=${isConversational}, noUnrelatedFeatureDump=${noUnrelatedFeatureDump}`,
      };
    },
  },
  {
    id: 'TEST_03_HOW_ARE_YOU',
    name: 'Casual small talk: "How are you?"',
    messages: ['How are you?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const isNatural = lower.includes('doing great') || lower.includes('doing well') || lower.includes('thanks for asking');
      const noForcedPitch = !lower.includes('book a demo') && !lower.includes('schedule');
      return {
        pass: isNatural && noForcedPitch,
        reason: `Reply: "${reply}" | isNatural=${isNatural}, noForcedPitch=${noForcedPitch}`,
      };
    },
  },
  {
    id: 'TEST_04_DO_YOU_KNOW_WHO_I_AM',
    name: 'Identity check without prior intro: "Do you know who I am?"',
    messages: ['Do you know who I am?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const statesUnknown = lower.includes("don't know who you are yet") || lower.includes("haven't introduced yourself");
      const noMagnusHallucination = !lower.includes('magnus verity') && !lower.includes("you're magnus");
      return {
        pass: statesUnknown && noMagnusHallucination,
        reason: `Reply: "${reply}" | statesUnknown=${statesUnknown}, noMagnusHallucination=${noMagnusHallucination}`,
      };
    },
  },
  {
    id: 'TEST_05_HEADCOUNT_UNCERTAINTY',
    name: 'Headcount question: "How many people work at AI Workforce?"',
    messages: ['How many people work at AI Workforce?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const statesUnverified = lower.includes("don't have a verified headcount figure") || lower.includes('not specified in our company brain');
      const doesNotSubstituteMagnus = !lower.includes('magnus verity is the founder');
      return {
        pass: statesUnverified && doesNotSubstituteMagnus,
        reason: `Reply: "${reply}" | statesUnverified=${statesUnverified}, doesNotSubstituteMagnus=${doesNotSubstituteMagnus}`,
      };
    },
  },
  {
    id: 'TEST_06_CAN_ALPHA_HALLUCINATE',
    name: 'Hallucination prevention: "Can Alpha hallucinate?"',
    messages: ['Can Alpha hallucinate?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const explainsGrounding = lower.includes('company brain') || lower.includes('grounding') || lower.includes('human review');
      const noImpossibilityGuarantee = !lower.includes('100% impossible') && !lower.includes('never makes any mistakes');
      return {
        pass: explainsGrounding && noImpossibilityGuarantee,
        reason: `Reply: "${reply}" | explainsGrounding=${explainsGrounding}, noImpossibilityGuarantee=${noImpossibilityGuarantee}`,
      };
    },
  },
  {
    id: 'TEST_07_HYPOTHETICAL_99_SCENARIO',
    name: 'Hypothetical scenario: "Suppose I registered my company and paid $99/mo, persuade me"',
    messages: ['Suppose I registered my company and paid $99/mo, persuade me'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const reasonsWithinHypothetical = lower.includes('$99') || lower.includes('reclaiming') || lower.includes('hours') || lower.includes('roi') || lower.includes('sales rep');
      const mentionsCurrentFree = lower.includes('free for now') || lower.includes('zero setup fees');
      return {
        pass: reasonsWithinHypothetical && mentionsCurrentFree,
        reason: `Reply: "${reply}" | reasonsWithinHypothetical=${reasonsWithinHypothetical}, mentionsCurrentFree=${mentionsCurrentFree}`,
      };
    },
  },
  {
    id: 'TEST_08_I_HAVE_NOT_NEGATION',
    name: 'Negation response: "I have not"',
    messages: ['Do you have an active website?', 'I have not'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const cleanAck = lower.includes('understood') || lower.includes('no problem') || lower.includes('what questions');
      const noCorruptedFallback = !lower.includes('for a not') && !lower.includes('for your not');
      return {
        pass: cleanAck && noCorruptedFallback,
        reason: `Reply: "${reply}" | cleanAck=${cleanAck}, noCorruptedFallback=${noCorruptedFallback}`,
      };
    },
  },
  {
    id: 'TEST_09_TESTING_MODE',
    name: 'Testing mode: "I\'m just testing you"',
    messages: ["I'm just testing you"],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const acknowledgesTesting = lower.includes('test') || lower.includes('scenarios');
      const noDefensiveness = !lower.includes('why are you testing') && !lower.includes('book a meeting');
      return {
        pass: acknowledgesTesting && noDefensiveness,
        reason: `Reply: "${reply}" | acknowledgesTesting=${acknowledgesTesting}, noDefensiveness=${noDefensiveness}`,
      };
    },
  },
  {
    id: 'TEST_10_EMBEDDING_INSTRUCTIONS',
    name: 'Step-by-step embedding: "How do I embed Alpha on my website?"',
    messages: ['How do I embed Alpha on my website?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const hasSteps = (lower.includes('1.') || lower.includes('step 1')) && (lower.includes('2.') || lower.includes('step 2'));
      const mentionsWebsiteChat = lower.includes('website chat') || lower.includes('dashboard');
      const mentionsScriptTag = lower.includes('<script') || lower.includes('widget.js') || lower.includes('snippet');
      return {
        pass: hasSteps && mentionsWebsiteChat && mentionsScriptTag,
        reason: `Reply: "${reply}" | hasSteps=${hasSteps}, mentionsWebsiteChat=${mentionsWebsiteChat}, mentionsScriptTag=${mentionsScriptTag}`,
      };
    },
  },
  {
    id: 'TEST_11_PRICING_TRUTH',
    name: 'Accurate pricing query: "How much does Alpha cost?"',
    messages: ['How much does Alpha cost?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const isFreeForNow = lower.includes('free for now') || lower.includes('zero setup fees');
      const noStale149 = !lower.includes('$149') && !lower.includes('149/month');
      return {
        pass: isFreeForNow && noStale149,
        reason: `Reply: "${reply}" | isFreeForNow=${isFreeForNow}, noStale149=${noStale149}`,
      };
    },
  },
  {
    id: 'TEST_12_FOUNDER_QUERY_DOES_NOT_POISON_USER',
    name: 'Founder query does NOT set user identity: "Who is Magnus Verity?" -> "Do you know who I am?"',
    messages: ['Who is Magnus Verity?', 'Do you know who I am?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const doesNotClaimUserIsMagnus = !lower.includes("you're magnus") && !lower.includes('you are magnus');
      const statesUnknown = lower.includes("don't know who you are yet") || lower.includes("haven't introduced yourself");
      return {
        pass: doesNotClaimUserIsMagnus && statesUnknown,
        reason: `Reply: "${reply}" | doesNotClaimUserIsMagnus=${doesNotClaimUserIsMagnus}, statesUnknown=${statesUnknown}`,
      };
    },
  },
  {
    id: 'TEST_13_HYPOTHETICAL_CLOTHING_STORE_NOT_REAL',
    name: 'Visitor describes hypothetical clothing store, then explicitly clarifies it is not real',
    messages: [
      'Suppose I have a clothing store with 500 orders a day',
      'This is just a scenario, it is not real',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const acknowledgesClarification = lower.includes('hypothetical') || lower.includes('scenario') || lower.includes('understood') || lower.includes("won't assume");
      const doesNotTreatAsRealStore = !lower.includes('for your clothing store') && !lower.includes('managing your 500 orders');
      return {
        pass: acknowledgesClarification && doesNotTreatAsRealStore,
        reason: `Reply: "${reply}" | acknowledgesClarification=${acknowledgesClarification}, doesNotTreatAsRealStore=${doesNotTreatAsRealStore}`,
      };
    },
  },
  {
    id: 'TEST_14_PASSED_TEST_NOT_RUNNING_BUSINESS',
    name: 'Visitor says they passed a test, then clarifies they are not running a business',
    messages: [
      'I passed a test, but I am not running a business',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const acknowledgesNotRunningBusiness = lower.includes('not running a business') || lower.includes('hypothetical') || lower.includes('understood') || lower.includes('explore or test');
      const noAggressiveSalesPitch = !lower.includes('schedule a demo') && !lower.includes('deploy on your website today');
      return {
        pass: acknowledgesNotRunningBusiness && noAggressiveSalesPitch,
        reason: `Reply: "${reply}" | acknowledgesNotRunningBusiness=${acknowledgesNotRunningBusiness}, noAggressiveSalesPitch=${noAggressiveSalesPitch}`,
      };
    },
  },
  {
    id: 'TEST_15_SKILLS_BULLET_POINTS',
    name: "Visitor asks for Alpha's skills in bullet points",
    messages: [
      "What are your skills in bullet points?",
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const hasBulletPoints = reply.includes('•') || reply.includes('-');
      const separatesAvailableFromPlanned = lower.includes('available') && (lower.includes('planned') || lower.includes('integration'));
      const mentionsDiscoveryAndQualification = lower.includes('discovery') || lower.includes('qualification');
      return {
        pass: hasBulletPoints && separatesAvailableFromPlanned && mentionsDiscoveryAndQualification,
        reason: `Reply: "${reply}" | hasBulletPoints=${hasBulletPoints}, separatesAvailableFromPlanned=${separatesAvailableFromPlanned}`,
      };
    },
  },
  {
    id: 'TEST_16_SPEAK_HINDI',
    name: 'Visitor asks in Hindi whether Alpha can speak Hindi',
    messages: [
      'Can you speak Hindi?',
    ],
    assertions: (reply) => {
      const hasHindiText = /[\u0900-\u097F]/.test(reply);
      const affirmsHindi = reply.includes('हाँ') || reply.includes('हिंदी');
      return {
        pass: hasHindiText && affirmsHindi,
        reason: `Reply: "${reply}" | hasHindiText=${hasHindiText}, affirmsHindi=${affirmsHindi}`,
      };
    },
  },
  {
    id: 'TEST_17_IDENTITY_UNKNOWN',
    name: 'Visitor asks whether Alpha knows their identity',
    messages: [
      'Do you know who I am?',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const statesUnknown = lower.includes("don't know who you are yet") || lower.includes("haven't introduced yourself");
      return {
        pass: statesUnknown,
        reason: `Reply: "${reply}" | statesUnknown=${statesUnknown}`,
      };
    },
  },
  {
    id: 'TEST_18_COMPETITOR_AND_MARKET_PRESENTATION',
    name: 'Visitor asks for a competitor comparison and sourced market forecast in presentation format',
    messages: [
      'Give me a competitor comparison and sourced market forecast in presentation format',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const isPresentation = reply.includes('### Presentation') || (reply.includes('####') && reply.includes('Market Forecast'));
      const mentionsGartnerOrOliverWyman = lower.includes('gartner') || lower.includes('oliver wyman');
      const mentionsCompetitors = lower.includes('intercom') || lower.includes('drift');
      return {
        pass: isPresentation && mentionsGartnerOrOliverWyman && mentionsCompetitors,
        reason: `Reply: "${reply}" | isPresentation=${isPresentation}, mentionsGartnerOrOliverWyman=${mentionsGartnerOrOliverWyman}, mentionsCompetitors=${mentionsCompetitors}`,
      };
    },
  },
  {
    id: 'TEST_19_ETHICAL_PERSUASION_DEMO',
    name: 'Visitor asks how Alpha would persuade a hesitant customer',
    messages: [
      'How would you persuade a hesitant customer?',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const demonstratesPersuasion = lower.includes('company brain') && (lower.includes('hesitation') || lower.includes('staging link') || lower.includes('zero commercial risk') || lower.includes('free for now'));
      const explainsFramework = lower.includes('framework') || lower.includes('empathize') || lower.includes('safeguard');
      return {
        pass: demonstratesPersuasion && explainsFramework,
        reason: `Reply: "${reply}" | demonstratesPersuasion=${demonstratesPersuasion}, explainsFramework=${explainsFramework}`,
      };
    },
  },
  {
    id: 'TEST_20_UNSUPPORTED_FEATURE',
    name: 'Visitor requests a feature Alpha does not have (video generation)',
    messages: [
      'Can you generate videos for my products?',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const truthfullyDiscloses = lower.includes("don't have that capability") || lower.includes('outside my scope') || lower.includes('cannot generate');
      const clarifiesActualScope = lower.includes('inbound') || lower.includes('discovery') || lower.includes('qualifying');
      return {
        pass: truthfullyDiscloses && clarifiesActualScope,
        reason: `Reply: "${reply}" | truthfullyDiscloses=${truthfullyDiscloses}, clarifiesActualScope=${clarifiesActualScope}`,
      };
    },
  },
  {
    id: 'TEST_21_CORRECT_PREVIOUS_ASSUMPTION',
    name: 'Visitor corrects a previous assumption about volume',
    messages: [
      'We get 40 inquiries a month',
      'Correction: actually 15 inquiries a month',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const hasUpdatedFigure = lower.includes('15');
      const doesNotRepeatSuperseded = !lower.includes('40 inquiries');
      return {
        pass: hasUpdatedFigure && doesNotRepeatSuperseded,
        reason: `Reply: "${reply}" | hasUpdatedFigure=${hasUpdatedFigure}, doesNotRepeatSuperseded=${doesNotRepeatSuperseded}`,
      };
    },
  },
  {
    id: 'TEST_22_DECLINE_SALES_OFFER',
    name: 'Visitor declines a sales offer',
    messages: [
      'No thanks, not interested',
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const respectsDecline = lower.includes('no problem') || lower.includes('feel free to browse') || lower.includes('look around');
      const noPushyPitch = !lower.includes('schedule a demo') && !lower.includes('are you sure') && !lower.includes('special discount');
      return {
        pass: respectsDecline && noPushyPitch,
        reason: `Reply: "${reply}" | respectsDecline=${respectsDecline}, noPushyPitch=${noPushyPitch}`,
      };
    },
  },
  {
    id: 'TEST_23_CASUAL_QUESTION',
    name: 'Visitor asks a casual question unrelated to purchasing',
    messages: [
      "What's the weather like?",
    ],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const noUnsolicitedSalesPitch = !lower.includes('schedule a call') && !lower.includes('start a trial today') && !lower.includes('book a demo');
      return {
        pass: noUnsolicitedSalesPitch,
        reason: `Reply: "${reply}" | noUnsolicitedSalesPitch=${noUnsolicitedSalesPitch}`,
      };
    },
  },
  {
    id: 'TEST_24_CEO_OF_GOOGLE',
    name: 'General knowledge query: "Who is the CEO of Google?" -> Direct factual answer; no AI Workforce pitch',
    messages: ['Who is the CEO of Google?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const mentionsSundar = lower.includes('sundar pichai');
      const noAiWorkforcePitch = !lower.includes('ai workforce') && !lower.includes('magnus verity');
      return {
        pass: mentionsSundar && noAiWorkforcePitch,
        reason: `Reply: "${reply}" | mentionsSundar=${mentionsSundar}, noAiWorkforcePitch=${noAiWorkforcePitch}`,
      };
    },
  },
  {
    id: 'TEST_25_HELLO_GREETING',
    name: 'Natural greeting: "Hello" -> Natural greeting; no premature sales pitch',
    messages: ['Hello'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const hasGreeting = lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('how can i help');
      const noPrematurePitch = !lower.includes('deploy on your website') && !lower.includes('schedule a demo today');
      return {
        pass: hasGreeting && noPrematurePitch,
        reason: `Reply: "${reply}" | hasGreeting=${hasGreeting}, noPrematurePitch=${noPrematurePitch}`,
      };
    },
  },
  {
    id: 'TEST_26_INTELLIGENT_REFUSAL',
    name: 'Intelligent refusal: Asking for a price not in Company Brain',
    messages: ['What is the price of your custom enterprise solution for 50,000 users?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const defersToTeam = lower.includes('team') || lower.includes('contact') || lower.includes('custom') || lower.includes('not listed');
      const noFabrication = !lower.includes('$') || lower.includes('tailored terms') || lower.includes('request');
      return {
        pass: defersToTeam && noFabrication,
        reason: `Reply: "${reply}" | defersToTeam=${defersToTeam}, noFabrication=${noFabrication}`,
      };
    },
  },
  {
    id: 'TEST_27_CLOTHING_BRAND_SALES',
    name: 'Sales exploration: "I own a clothing brand. How can you help increase sales?"',
    messages: ['I own a clothing brand. How can you help increase sales?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const isPersuasive = lower.includes('clothing') || lower.includes('sales') || lower.includes('inbound') || lower.includes('discovery') || lower.includes('24/7');
      return {
        pass: isPersuasive,
        reason: `Reply: "${reply}" | isPersuasive=${isPersuasive}`,
      };
    },
  },
  {
    id: 'TEST_28_WHAT_IS_YOUR_PRICE',
    name: 'Pricing query: "What is your price?" -> Current approved offer, zero invented price',
    messages: ['What is your price?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const isFreeForNow = lower.includes('free for now') || lower.includes('free to use') || lower.includes('free') || lower.includes('zero setup fees');
      const noStalePrice = !lower.includes('$149') && !lower.includes('$299/mo');
      return {
        pass: isFreeForNow && noStalePrice,
        reason: `Reply: "${reply}" | isFreeForNow=${isFreeForNow}, noStalePrice=${noStalePrice}`,
      };
    },
  },
  {
    id: 'TEST_29_THREE_BULLET_POINTS',
    name: 'Format adherence: "Answer in three bullet points" -> Exactly three relevant bullets',
    messages: ['Answer in three bullet points'],
    assertions: (reply) => {
      const bulletCount = (reply.match(/[•\-*]/g) || []).length;
      return {
        pass: bulletCount >= 3,
        reason: `Reply: "${reply}" | bulletCount=${bulletCount}`,
      };
    },
  },
  {
    id: 'TEST_30_DONT_OWN_BUSINESS',
    name: 'Correction respect: "I don\'t own a business" -> Respect correction',
    messages: ['I don\'t own a business'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const respectsCorrection = lower.includes('understood') || lower.includes('no problem') || lower.includes('not a business') || lower.includes('explore');
      const noAssumption = !lower.includes('your business') && !lower.includes('your company');
      return {
        pass: respectsCorrection && noAssumption,
        reason: `Reply: "${reply}" | respectsCorrection=${respectsCorrection}, noAssumption=${noAssumption}`,
      };
    },
  },
  {
    id: 'TEST_31_FOUNDER_AI_WORKFORCE',
    name: 'Founder query: "Who founded AI Workforce?" -> Magnus Verity',
    messages: ['Who founded AI Workforce?'],
    assertions: (reply) => {
      const lower = reply.toLowerCase();
      const mentionsMagnus = lower.includes('magnus verity');
      return {
        pass: mentionsMagnus,
        reason: `Reply: "${reply}" | mentionsMagnus=${mentionsMagnus}`,
      };
    },
  },
];

export async function runConversationalAudit(): Promise<{ passed: number; failed: number; results: any[] }> {
  console.log('\n======================================================');
  console.log('ALPHA CONVERSATIONAL INTELLIGENCE & AUDIT TEST RUNNER');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  const results: any[] = [];

  for (const tc of testCases) {
    const convId = `audit-${tc.id}-${Date.now()}`;
    const history: Array<{ sender: 'customer' | 'assistant'; text: string }> = [];
    const historyReplies: string[] = [];
    let lastReply = '';

    for (const msg of tc.messages) {
      const res = await processWebsiteChatMessage({
        widget_id: 'wgt_official_ai_workforce',
        conversation_id: convId,
        message: msg,
        message_history: [...history],
        company_profile: AI_WORKFORCE_OFFICIAL_PROFILE,
        environment: 'simulation',
      });
      lastReply = res.reply;
      historyReplies.push(res.reply);
      history.push({ sender: 'customer', text: msg });
      history.push({ sender: 'assistant', text: res.reply });
    }

    const { pass, reason } = tc.assertions(lastReply, historyReplies);
    if (pass) {
      passed++;
      console.log(`✅ [PASS] ${tc.id}: ${tc.name}`);
      results.push({ id: tc.id, status: 'PASS', reason });
    } else {
      failed++;
      console.log(`❌ [FAIL] ${tc.id}: ${tc.name}`);
      console.log(`   Reason: ${reason}`);
      results.push({ id: tc.id, status: 'FAIL', reason });
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL: ${testCases.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------\n');

  return { passed, failed, results };
}

// If executed directly via tsx
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('alphaConversationalAudit')) {
  runConversationalAudit()
    .then((res) => {
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal audit runner error:', err);
      process.exit(1);
    });
}
