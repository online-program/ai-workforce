import { getOrCreateAlphaMemory, updateMemoryFromMessage } from './src/server/alphaMemory.ts';
import { evaluateAlphaDecision } from './src/server/alphaDecisionEngine.ts';
import { generateAlphaResponse, ALPHA_PRODUCTION_VERSION, ALPHA_CONFIG_HASH } from './src/server/alphaResponseGenerator.ts';

async function runRegressionSuite() {
  console.log('=== ALPHA V2 PRODUCTION REGRESSION & PARITY SUITE ===\n');
  console.log(`Version: ${ALPHA_PRODUCTION_VERSION} | Config Hash: ${ALPHA_CONFIG_HASH}\n`);

  const brain: any = {
    brandName: 'AI Workforce',
    companyName: 'AI Workforce',
    industry: 'Autonomous AI Sales Workforce',
    description: 'AI Workforce builds autonomous AI sales workforce systems.',
    relevantOfferings: 'Alpha (Live) — Flagship conversational AI for sales discovery, customer assistance, qualification, and opportunity intelligence.',
    pricingInfo: 'Alpha is 100% free until October 10, 2026 for founding cohort members with zero software fees.',
    rules: ['Always answer customer questions first from Company Brain.'],
  };

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  // TEST 1: Complex composite statement with question
  console.log('\n--- Running TEST 1: Complex Composite Message & Situation Recall ---');
  const sess1Mem = getOrCreateAlphaMemory('session-test-1');
  const t1Msg = "I run a SaaS with 2,000–3,000 website visitors per month and around 70 leads per month. My biggest problem is low marketing ROI, not lead volume. What do you understand about my situation?";
  const t1Dec = evaluateAlphaDecision(t1Msg, sess1Mem, brain, []);
  const t1Res = await generateAlphaResponse({ message: t1Msg, history: [], memory: sess1Mem, brain, decision: t1Dec });
  console.log('T1 Reply:', t1Res.reply);

  assert(sess1Mem.visitor.business_type === 'SaaS', 'T1: Business type is SaaS');
  assert(sess1Mem.website_visitors?.includes('2,000–3,000'), 'T1: Website visitors extracted');
  assert(sess1Mem.requirements.lead_volume?.includes('70'), 'T1: Lead volume extracted');
  assert(sess1Mem.primary_problem?.toLowerCase().includes('marketing roi'), 'T1: Primary problem is low marketing ROI');
  assert(sess1Mem.excluded_problems?.includes('lead volume'), 'T1: Excluded problem is lead volume');
  assert(!t1Res.reply.toLowerCase().includes('what does your saas specialize in'), 'T1: Did not pivot to sales pitch');
  assert(t1Res.reply.toLowerCase().includes('saas') && t1Res.reply.toLowerCase().includes('marketing roi'), 'T1: Reply correctly summarizes situation');

  // TEST 2: Fact Correction
  console.log('\n--- Running TEST 2: Fact Correction ---');
  const t2Msg = "Actually, forget 70. It's closer to 40–50 leads per month.";
  const t2Dec = evaluateAlphaDecision(t2Msg, sess1Mem, brain, [{ sender: 'customer', text: t1Msg }, { sender: 'assistant', text: t1Res.reply }]);
  const t2Res = await generateAlphaResponse({ message: t2Msg, history: [], memory: sess1Mem, brain, decision: t2Dec });
  console.log('T2 Reply:', t2Res.reply);
  assert(sess1Mem.requirements.lead_volume?.includes('40–50'), 'T2: Lead volume updated to 40–50 leads/month');
  assert(sess1Mem.historical_memory.superseded_lead_volume?.includes('70'), 'T2: Superseded lead volume recorded');

  // TEST 3: Stated Facts Recall
  console.log('\n--- Running TEST 3: Facts Recall ---');
  const t3Msg = "What facts do you currently know about my business?";
  const t3Dec = evaluateAlphaDecision(t3Msg, sess1Mem, brain, []);
  const t3Res = await generateAlphaResponse({ message: t3Msg, history: [], memory: sess1Mem, brain, decision: t3Dec });
  console.log('T3 Reply:', t3Res.reply);
  assert(!t3Res.reply.toLowerCase().includes('team of 2'), 'T3: Zero hallucinated team size');
  assert(!t3Res.reply.toLowerCase().includes('repetitive questions'), 'T3: Zero hallucinated repetitive questions bottleneck');
  assert(t3Res.reply.toLowerCase().includes('40–50') || t3Res.reply.toLowerCase().includes('saas'), 'T3: Stated facts retrieved accurately');

  // TEST 4: Founder Knowledge
  console.log('\n--- Running TEST 4: Founder Query ---');
  const t4Msg = "Who is Magnus Verity?";
  const t4Dec = evaluateAlphaDecision(t4Msg, sess1Mem, brain, []);
  const t4Res = await generateAlphaResponse({ message: t4Msg, history: [], memory: sess1Mem, brain, decision: t4Dec });
  console.log('T4 Reply:', t4Res.reply);
  assert(t4Res.reply.toLowerCase().includes('magnus verity') && t4Res.reply.toLowerCase().includes('founder'), 'T4: Founder identified correctly');

  // TEST 5: Insult & Slang Handling
  console.log('\n--- Running TEST 5: Insult / Conversational Handling ---');
  const t5Msg = "Fuck you.";
  const t5Dec = evaluateAlphaDecision(t5Msg, sess1Mem, brain, []);
  const t5Res = await generateAlphaResponse({ message: t5Msg, history: [], memory: sess1Mem, brain, decision: t5Dec });
  console.log('T5 Reply:', t5Res.reply);
  assert(!t5Res.reply.toLowerCase().includes('noted that for our team'), 'T5: Did not register insult as inquiry');
  assert(!t5Res.reply.toLowerCase().includes('missing what you mean'), 'T5: Did not use robotic fallback');

  // TEST 6: Disambiguation / Previous Assumption
  console.log('\n--- Running TEST 6: Assumption Clarification ---');
  const t6Msg = "Why did you assume that?";
  const t6Dec = evaluateAlphaDecision(t6Msg, sess1Mem, brain, [{ sender: 'assistant', text: 'Alpha optimizes lead capture.' }]);
  assert(t6Dec.topic === 'statement_clarification', 'T6: Handled as statement clarification');

  // TEST 7: AI Tool Skepticism
  console.log('\n--- Running TEST 7: AI Tool Skepticism ---');
  const t7Msg = "I've tried three AI tools already and they were useless after deployment.";
  const t7Dec = evaluateAlphaDecision(t7Msg, sess1Mem, brain, []);
  const t7Res = await generateAlphaResponse({ message: t7Msg, history: [], memory: sess1Mem, brain, decision: t7Dec });
  console.log('T7 Reply:', t7Res.reply);
  assert(
    t7Res.reply.toLowerCase().includes('test') ||
    t7Res.reply.toLowerCase().includes('production') ||
    t7Res.reply.toLowerCase().includes('sense') ||
    t7Res.reply.toLowerCase().includes('frustrat') ||
    t7Res.reply.toLowerCase().includes('skeptic') ||
    t7Res.reply.toLowerCase().includes('underst') ||
    t7Res.reply.toLowerCase().includes('waste') ||
    t7Res.reply.toLowerCase().includes('time'),
    'T7: Handled skepticism with empathy'
  );

  // TEST 8: Conversion Rate Guarantee Refusal
  console.log('\n--- Running TEST 8: Conversion Rate Guarantee Refusal ---');
  const t8Msg = "How much will you increase my conversion rate?";
  const t8Dec = evaluateAlphaDecision(t8Msg, sess1Mem, brain, []);
  const t8Res = await generateAlphaResponse({ message: t8Msg, history: [], memory: sess1Mem, brain, decision: t8Dec });
  console.log('T8 Reply:', t8Res.reply);
  assert(t8Res.reply.toLowerCase().includes("can't promise") || t8Res.reply.toLowerCase().includes('cannot promise') || t8Res.reply.toLowerCase().includes('baseline'), 'T8: Refused unverified percentage claims');

  // TEST 9: Industry Switch
  console.log('\n--- Running TEST 9: Industry Switch ---');
  const sess9Mem = getOrCreateAlphaMemory('session-test-9');
  evaluateAlphaDecision('I run a SaaS.', sess9Mem, brain, []);
  assert(sess9Mem.visitor.business_type === 'SaaS', 'T9a: Initial industry is SaaS');
  evaluateAlphaDecision('Actually forget that. I run a web design agency.', sess9Mem, brain, []);
  assert(sess9Mem.visitor.business_type?.toLowerCase().includes('agency'), 'T9b: Switched industry to web design agency');

  // TEST 10 & 28: Cross-Session Contamination Test
  console.log('\n--- Running TEST 10 / 28: Cross-Session Contamination Test ---');
  const sessAMem = getOrCreateAlphaMemory('session-A-unique-id');
  evaluateAlphaDecision('I run a web design agency with a team of 8 people.', sessAMem, brain, []);
  assert(sessAMem.historical_memory.team?.includes('8'), 'Session A recorded team of 8');

  const sessBMem = getOrCreateAlphaMemory('session-B-unique-id');
  evaluateAlphaDecision('I run a SaaS with 2,000–3,000 visitors/month.', sessBMem, brain, []);
  const t10Dec = evaluateAlphaDecision('What do you know about me?', sessBMem, brain, []);
  const t10Res = await generateAlphaResponse({ message: 'What do you know about me?', history: [], memory: sessBMem, brain, decision: t10Dec });
  console.log('Session B Recall Reply:', t10Res.reply);

  assert(!t10Res.reply.toLowerCase().includes('agency'), 'Session B has NO Session A agency info');
  assert(!t10Res.reply.toLowerCase().includes('team of 8') && !t10Res.reply.toLowerCase().includes('8 people'), 'Session B has NO Session A team size info');
  assert(!t10Res.reply.toLowerCase().includes('30 leads'), 'Session B has NO Session A leads info');

  // TEST 11: "I run a B2B software... don't sell me anything..."
  console.log('\n--- Running TEST 11: B2B Software with No-Pitch Boundary ---');
  const sess11Mem = getOrCreateAlphaMemory('session-test-11');
  const t11Msg = "I run a B2B software company and we build developer tools, don't sell me anything.";
  const t11Dec = evaluateAlphaDecision(t11Msg, sess11Mem, brain, []);
  const t11Res = await generateAlphaResponse({ message: t11Msg, history: [], memory: sess11Mem, brain, decision: t11Dec });
  console.log('T11 Reply:', t11Res.reply);
  assert(sess11Mem.visitor.business_type?.toLowerCase().includes('software'), 'T11: Stored B2B software business type');
  assert(!t11Res.reply.toLowerCase().includes('embeds directly on your marketing site'), 'T11: Zero canned marketing site pitch');
  assert(!t11Res.reply.toLowerCase().includes('qualify prospects for demos'), 'T11: Zero unsolicited demo qualification pitch');
  assert(t11Res.reply.toLowerCase().includes('zero selling') || t11Res.reply.toLowerCase().includes('no sell') || t11Res.reply.toLowerCase().includes('mind') || t11Res.reply.toLowerCase().includes('explore'), 'T11: Respected no-sell boundary');

  // TEST 12: Inquiries Parsing & Transition ("90 inquiries → 55–65 inquiries")
  console.log('\n--- Running TEST 12: Inquiries Range & Unknown Period Preservation ---');
  const sess12Mem = getOrCreateAlphaMemory('session-test-12');
  const t12aMsg = "We get around 90 inquiries.";
  evaluateAlphaDecision(t12aMsg, sess12Mem, brain, []);
  console.log('T12a Volume in Memory:', sess12Mem.requirements.lead_volume);
  assert(sess12Mem.requirements.lead_volume?.includes('90'), 'T12a: Extracted 90 inquiries');
  assert(sess12Mem.requirements.lead_volume?.includes('inquiries'), 'T12a: Preserved inquiry noun');
  assert(sess12Mem.requirements.lead_volume?.includes('period unspecified'), 'T12a: Unknown period stayed unknown (did not default to week/month)');

  const t12bMsg = "90 inquiries → 55–65 inquiries";
  evaluateAlphaDecision(t12bMsg, sess12Mem, brain, [{ sender: 'customer', text: t12aMsg }]);
  console.log('T12b Updated Volume in Memory:', sess12Mem.requirements.lead_volume);
  assert(sess12Mem.requirements.lead_volume?.includes('55–65'), 'T12b: Preserved 55–65 range');
  assert(sess12Mem.requirements.lead_volume?.includes('inquiries'), 'T12b: Preserved inquiry noun on transition');
  assert(sess12Mem.requirements.lead_volume?.includes('period unspecified'), 'T12b: Unknown period stayed unknown after range update');
  assert(sess12Mem.historical_memory.superseded_lead_volume?.includes('90'), 'T12b: Recorded 90 as superseded volume');

  // TEST 13: Monthly / Weekly Period Preservation
  console.log('\n--- Running TEST 13: Monthly / Weekly Period Clarification ---');
  const t13aMsg = "Actually, that's monthly.";
  evaluateAlphaDecision(t13aMsg, sess12Mem, brain, [{ sender: 'customer', text: t12bMsg }]);
  console.log('T13a Monthly Volume:', sess12Mem.requirements.lead_volume);
  assert(sess12Mem.requirements.lead_volume?.includes('55–65'), 'T13a: Preserved range after period clarification');
  assert(sess12Mem.requirements.lead_volume?.includes('inquiries/month'), 'T13a: Preserved inquiries and updated to month');

  const sess13bMem = getOrCreateAlphaMemory('session-test-13b');
  evaluateAlphaDecision("We get 20 leads a week.", sess13bMem, brain, []);
  assert(sess13bMem.requirements.lead_volume === '20 leads/week', 'T13b: Initial weekly volume recorded');
  evaluateAlphaDecision("Actually closer to 15–20", sess13bMem, brain, []);
  console.log('T13b Weekly Updated Volume:', sess13bMem.requirements.lead_volume);
  assert(sess13bMem.requirements.lead_volume?.includes('15–20'), 'T13b: Range 15–20 preserved');
  assert(sess13bMem.requirements.lead_volume?.includes('/week'), 'T13b: Weekly period preserved without defaulting to month');

  // TEST 14: Spend Update ("$7k → $5,500")
  console.log('\n--- Running TEST 14: Spend Transition ($7k → $5,500) ---');
  const sess14Mem = getOrCreateAlphaMemory('session-test-14');
  evaluateAlphaDecision("We spend $7k on ads.", sess14Mem, brain, []);
  console.log('T14a Spend in Memory:', sess14Mem.facts_established['Marketing Spend']);
  assert(sess14Mem.facts_established['Marketing Spend']?.includes('$7k'), 'T14a: Initial $7k spend recorded');

  evaluateAlphaDecision("$7k → $5,500", sess14Mem, brain, []);
  console.log('T14b Spend in Memory:', sess14Mem.facts_established['Marketing Spend']);
  assert(sess14Mem.facts_established['Marketing Spend']?.includes('$5,500'), 'T14b: Updated spend to $5,500');

  // TEST 15: Bug 1 — Founder Question + "Don't pitch anything"
  console.log('\n--- Running TEST 15: Founder Question + "Don\'t pitch anything" (Bug 1) ---');
  const sess15Mem = getOrCreateAlphaMemory('session-test-15');
  const t15Msg = "Who founded AI Workforce, and what is the founder's role? Answer in one sentence using only verified information. Don't pitch anything.";
  const t15Dec = evaluateAlphaDecision(t15Msg, sess15Mem, brain, []);
  const t15Res = await generateAlphaResponse({ message: t15Msg, history: [], memory: sess15Mem, brain, decision: t15Dec });
  console.log('T15 Reply:', t15Res.reply);
  assert(t15Res.reply.toLowerCase().includes('magnus verity'), 'T15: Identified founder Magnus Verity');
  assert(t15Res.reply.toLowerCase().includes('ceo') || t15Res.reply.toLowerCase().includes('founder'), 'T15: Identified founder role');
  assert(!t15Res.reply.toLowerCase().includes("what's on your mind"), 'T15: Did NOT trigger canned no-pitch fallback');

  // TEST 16: Bug 1 & 2 — Capabilities Question + "Don't pitch anything"
  console.log('\n--- Running TEST 16: Capabilities Question + "Don\'t pitch anything" (Bug 1 & 2) ---');
  const sess16Mem = getOrCreateAlphaMemory('session-test-16');
  const t16Msg = "What does Alpha do for a business? Explain its actual documented capabilities in 3 bullet points. Don't pitch anything.";
  const t16Dec = evaluateAlphaDecision(t16Msg, sess16Mem, brain, []);
  const t16Res = await generateAlphaResponse({ message: t16Msg, history: [], memory: sess16Mem, brain, decision: t16Dec });
  console.log('T16 Reply:', t16Res.reply);
  assert(!t16Res.reply.toLowerCase().includes("what's on your mind"), 'T16: Did NOT trigger canned no-pitch fallback');
  assert(t16Res.reply.includes('•') || t16Res.reply.includes('\n'), 'T16: Returned bullet points');
  const t16BulletCount = (t16Res.reply.match(/•/g) || []).length;
  assert(t16BulletCount === 3, 'T16: Exactly 3 documented capabilities bullet points');
  assert(!t16Res.reply.toLowerCase().includes('schedule a demo') && !t16Res.reply.toLowerCase().includes('ready to buy'), 'T16: Zero unsolicited sales pitch');

  // TEST 17: Bug 2 — Capabilities Question with Equivalent Neutral Wording
  console.log('\n--- Running TEST 17: Capabilities Question with Neutral Non-Pitch wording (Bug 2) ---');
  const sess17Mem = getOrCreateAlphaMemory('session-test-17');
  const t17Msg = "What does Alpha do for a business? Explain its documented capabilities in exactly 3 bullet points. Please answer the question directly and avoid trying to persuade me to buy anything.";
  const t17Dec = evaluateAlphaDecision(t17Msg, sess17Mem, brain, []);
  const t17Res = await generateAlphaResponse({ message: t17Msg, history: [], memory: sess17Mem, brain, decision: t17Dec });
  console.log('T17 Reply:', t17Res.reply);
  const t17BulletCount = (t17Res.reply.match(/•/g) || []).length;
  assert(t17BulletCount === 3, 'T17: Formatted in exactly 3 bullet points');
  assert(t17Res.reply.includes('\n'), 'T17: Preserved bullet point line breaks (not flattened to single paragraph)');

  // TEST 18: Standalone "Don't sell me anything."
  console.log('\n--- Running TEST 18: Standalone "Don\'t sell me anything." (Prompt Req 2.4) ---');
  const sess18Mem = getOrCreateAlphaMemory('session-test-18');
  const t18Msg = "Don't sell me anything.";
  const t18Dec = evaluateAlphaDecision(t18Msg, sess18Mem, brain, []);
  const t18Res = await generateAlphaResponse({ message: t18Msg, history: [], memory: sess18Mem, brain, decision: t18Dec });
  console.log('T18 Reply:', t18Res.reply);
  assert(t18Res.reply.toLowerCase().includes('zero selling') || t18Res.reply.toLowerCase().includes("what's on your mind"), 'T18: Standalone no-sell boundary respected');

  // TEST 19: "I don't want to buy anything today, but can you explain what Alpha does?"
  console.log('\n--- Running TEST 19: "I don\'t want to buy anything today, but can you explain what Alpha does?" (Prompt Req 2.5) ---');
  const sess19Mem = getOrCreateAlphaMemory('session-test-19');
  const t19Msg = "I don't want to buy anything today, but can you explain what Alpha does?";
  const t19Dec = evaluateAlphaDecision(t19Msg, sess19Mem, brain, []);
  const t19Res = await generateAlphaResponse({ message: t19Msg, history: [], memory: sess19Mem, brain, decision: t19Dec });
  console.log('T19 Reply:', t19Res.reply);
  assert(!t19Res.reply.toLowerCase().includes("what's on your mind?"), 'T19: Answered the question rather than canned fallback');
  assert(t19Res.reply.toLowerCase().includes('alpha') && (t19Res.reply.toLowerCase().includes('conversational') || t19Res.reply.toLowerCase().includes('sales') || t19Res.reply.toLowerCase().includes('discovery')), 'T19: Explained what Alpha does');

  // TEST 20: "Stop selling and tell me the documented Enterprise price."
  console.log('\n--- Running TEST 20: Documented Enterprise Price (Prompt Req 2.6) ---');
  const sess20Mem = getOrCreateAlphaMemory('session-test-20');
  const t20Msg = "Stop selling and tell me the documented Enterprise price.";
  const t20Dec = evaluateAlphaDecision(t20Msg, sess20Mem, brain, []);
  const t20Res = await generateAlphaResponse({ message: t20Msg, history: [], memory: sess20Mem, brain, decision: t20Dec });
  console.log('T20 Reply:', t20Res.reply);
  assert(t20Res.reply.toLowerCase().includes('free until october 10, 2026') || t20Res.reply.toLowerCase().includes('does not list a separate') || t20Res.reply.toLowerCase().includes('no separate'), 'T20: Cites documented free terms or clear lack of separate documented Enterprise price');
  assert(!t20Res.reply.toLowerCase().includes('$999') && !t20Res.reply.toLowerCase().includes('$499') && !t20Res.reply.toLowerCase().includes('$5000'), 'T20: Zero hallucinated enterprise price');

  // TEST 21: Bug 3 — Complex Situation Summary with 5 employees, 65 project inquiries, unrealistic budgets in 3 bullet points
  console.log('\n--- Running TEST 21: Situation Summary in 3 Bullet Points (Bug 3) ---');
  const sess21Mem = getOrCreateAlphaMemory('session-test-21');
  const t21Msg = "I run a web development agency with 5 employees. We receive 65 project inquiries per month, and many have unrealistic budgets. Summarize my situation in exactly 3 bullet points. Do not ask a question, recommend a solution, or pitch anything.";
  const t21Dec = evaluateAlphaDecision(t21Msg, sess21Mem, brain, []);
  const t21Res = await generateAlphaResponse({ message: t21Msg, history: [], memory: sess21Mem, brain, decision: t21Dec });
  console.log('T21 Reply:', t21Res.reply);
  assert(sess21Mem.visitor.business_type?.toLowerCase().includes('agency'), 'T21: Business type is web development agency');
  assert(sess21Mem.historical_memory.team?.includes('5') || sess21Mem.facts_established['Team Size']?.includes('5'), 'T21: Team size is 5 employees');
  assert(sess21Mem.requirements.lead_volume?.includes('65'), 'T21: Volume is 65 project inquiries per month');
  assert(sess21Mem.primary_problem?.toLowerCase().includes('unrealistic budgets'), 'T21: Problem is unrealistic budgets');
  const t21Bullets = (t21Res.reply.match(/•/g) || []).length;
  assert(t21Bullets === 3, 'T21: Formatted in exactly 3 bullet points');
  assert(!t21Res.reply.includes('?'), 'T21: Zero questions asked (strictly obeyed negative constraint)');
  assert(!t21Res.reply.toLowerCase().includes('alpha can') && !t21Res.reply.toLowerCase().includes('i recommend'), 'T21: Zero solution pitched or recommended');

  // TEST 22: Bug 4 — Fact Correction from 40 to 65 project inquiries + "Don't pitch anything"
  console.log('\n--- Running TEST 22: Fact Correction with "Don\'t pitch anything" (Bug 4) ---');
  const sess22Mem = getOrCreateAlphaMemory('session-test-22');
  const t22Msg = "Our agency receives 40 project inquiries per month. Correction: I checked our records, and the actual number is 65 per month. Please use the corrected figure. What do you understand about our situation now? Don't pitch anything.";
  const t22Dec = evaluateAlphaDecision(t22Msg, sess22Mem, brain, []);
  const t22Res = await generateAlphaResponse({ message: t22Msg, history: [], memory: sess22Mem, brain, decision: t22Dec });
  console.log('T22 Reply:', t22Res.reply);
  assert(sess22Mem.requirements.lead_volume?.includes('65'), 'T22: Active volume in memory is 65');
  assert(sess22Mem.historical_memory.superseded_lead_volume?.includes('40'), 'T22: Previous 40 recorded as superseded volume');
  assert(t22Res.reply.includes('65'), 'T22: Reply reflects corrected 65 volume');
  assert(!t22Res.reply.toLowerCase().includes("what's on your mind?"), 'T22: Did NOT return canned fallback');
  assert(!t22Res.reply.toLowerCase().includes('alpha can') && !t22Res.reply.toLowerCase().includes('our platform'), 'T22: Respected zero pitching constraint');

  // TEST 23: Bug 5 — Human Handoff Request
  console.log('\n--- Running TEST 23: Human Handoff Request (Bug 5) ---');
  const sess23Mem = getOrCreateAlphaMemory('session-test-23');
  const t23Msg = "I'd rather speak to a real person about how this works. Please connect me with someone from your team. I don't want to keep chatting with an AI.";
  const t23Dec = evaluateAlphaDecision(t23Msg, sess23Mem, brain, []);
  const t23Res = await generateAlphaResponse({ message: t23Msg, history: [], memory: sess23Mem, brain, decision: t23Dec });
  console.log('T23 Reply:', t23Res.reply);
  assert(t23Dec.stage === 'HANDOFF', 'T23: Stage transitioned to HANDOFF');
  assert(t23Dec.intent === 'HANDOFF', 'T23: Intent detected as HANDOFF');
  assert(sess23Mem.signals.human_requested === true, 'T23: Memory signals human_requested is true');
  assert(sess23Mem.signals.next_best_action === 'handoff_to_human', 'T23: Next best action is handoff_to_human');
  assert(t23Res.reply.toLowerCase().includes('team') || t23Res.reply.toLowerCase().includes('person') || t23Res.reply.toLowerCase().includes('human') || t23Res.reply.toLowerCase().includes('connect'), 'T23: Smooth human handoff facilitated');

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log('🎉 ALL REGRESSION TESTS PASSED WITH COMPLETE PARITY AND ACCURACY!');
  } else {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
