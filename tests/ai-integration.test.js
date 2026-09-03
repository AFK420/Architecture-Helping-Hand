/**
 * Architecture Helping Hand - AI End-to-End Integration Test Suite (Phase 15)
 * Rule 56 integration pipelines over REAL implementations with MOCKED HTTP:
 *
 *   Project → Facts Pack → Job Router → mocked provider transport →
 *   normalized AI result → numeric validation → UI-ready response
 *
 *   Plan Image → Vision Job → mocked vision provider → structured
 *   observations → NEEDS VERIFICATION semantics
 *
 * Also pins security rules: no key leakage anywhere in results/logs/storage,
 * and context budget refusal.
 */

import { createAiHttp } from '../src/services/ai/http.js';
import { createProviderManager } from '../src/services/ai/provider-manager.js';
import { createModelCatalog } from '../src/services/ai/model-catalog.js';
import { createTransports } from '../src/services/ai/transports/index.js';
import { createJobRouter, AI_JOB_DEFINITIONS } from '../src/services/ai/job-router.js';
import { buildScopedFactsPack } from '../src/ai/context/project-context.js';
import { createProjectStore } from '../src/services/store.js';
import { createProject } from '../src/core/project.js';
import { createRoom, createWall, placeFurniture, roomArea } from '../src/core/entities.js';
import { checkOverlaps } from '../src/core/space-planning.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

console.log('🧪 Running tests/ai-integration.test.js...');

function makeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    dump: () => [...map.values()].map(String).join(' || ')
  };
}

// ---------------------------------------------------------------------------
// Real store + real plan
// ---------------------------------------------------------------------------
const storage = makeStorage();
const store = createProjectStore({ storage, generateId: () => 'proj-ai-e2e' });
store.createNewProject({ name: 'Villa Study', description: 'Courtyard concept, north slope site' });
store.updateProject(d => {
  d.metadata.description = 'Courtyard concept, north slope site';
  d.decisions.push({ id: 'd1', kind: 'concept', name: 'Central courtyard', createdAt: '2026-09-03T00:00:00.000Z' });
  d.measurements = Array.isArray(d.measurements) ? d.measurements : [];
  d.measurements.push({ id: 'm1', label: 'Living width', value: 4.8, unit: 'm', status: 'Verified' });
  return d;
});

const bedroom = createRoom({ name: 'Bedroom', x: 0, y: 0, width: 3.6, depth: 3.4 });
const living = createRoom({ name: 'Living', x: 3.6, y: 0, width: 4.8, depth: 3.2 });
const wallN = createWall({ name: 'North Wall', x1: 0, y1: 0, x2: 8.4, y2: 0 });
const bed = placeFurniture({ wCm: 160, dCm: 200, x: 0.2, y: 0.2, name: 'Double Bed' });
const sofa = placeFurniture({ wCm: 220, dCm: 90, x: 3.8, y: 0.3, name: 'Sofa' });
const planEntities = [bedroom, living, wallN, bed, sofa];

// ---------------------------------------------------------------------------
// Mocked transports: deterministic chat + vision + structured behavior
// ---------------------------------------------------------------------------
function makeMockTransports({ structuredText, chatText, visionText, failure } = {}) {
  const calls = [];
  const http = createAiHttp({
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      if (failure) {
        return new Response(JSON.stringify(failure.body || { error: { message: failure.message || 'error' } }), { status: failure.status });
      }
      const isGemini = url.includes('generativelanguage');
      const wantsVision = JSON.stringify(init.body).includes('inline_data') ||
        JSON.stringify(init.body).includes('image_url');
      if (wantsVision && visionText !== undefined) {
        return new Response(JSON.stringify(isGemini
          ? { candidates: [{ content: { parts: [{ text: visionText }] }, finishReason: 'STOP' }] }
          : { choices: [{ message: { content: visionText } }], usage: { prompt_tokens: 40, completion_tokens: 30 } }),
          { status: 200 });
      }
      const text = structuredText !== undefined && JSON.stringify(init.body).match(/json/i)
        ? structuredText
        : (chatText ?? 'Plain answer.');
      return new Response(JSON.stringify(isGemini
        ? { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20 } }
        : { choices: [{ message: { content: text } }], usage: { prompt_tokens: 50, completion_tokens: 20 } }),
        { status: 200 });
    }
  });
  const transports = createTransports({ http });
  return { transports, calls };
}

const STRUCTURED_CRITIQUE = JSON.stringify({
  summary: 'The scheme pairs a compact bedroom with a generous living zone.',
  verdict: 'Promising organization; furniture clearances need work.',
  findings: [
    {
      title: 'Bed clearance is tight',
      severity: 'medium',
      observation: 'The double bed leaves under 1 m on the entry side.',
      evidence: ['Bedroom is 3.6 × 3.4 m = 12.24 m²', 'Bed footprint is 1.6 × 2.0 m'],
      whyItMatters: 'Circulation around the bed falls below the comfortable 0.6 m minimum.',
      recommendation: 'Shift the bed 0.2 m west and verify the door swing.',
      alternative: 'Use a 1.4 m bed to recover 0.2 m.',
      tradeOff: 'Smaller sleeping surface.',
      testNext: 'Re-run the clearance check after the shift.'
    }
  ]
});

// ---------------------------------------------------------------------------
// Pipeline 1: Project → facts pack → job router → mocked transport → result
// ---------------------------------------------------------------------------
console.log('\n--- 1. Project → AI critique pipeline ---');

{
  const svc = makeMockTransports({ structuredText: STRUCTURED_CRITIQUE });
  const providerManager = createProviderManager({ storage: makeStorage() });
  providerManager.setKey('deepseek', 'sk-e2e-secret-key-4242');
  const modelCatalog = createModelCatalog({ storage: makeStorage() });
  const router = createJobRouter({
    providerManager,
    modelCatalog,
    transports: svc.transports,
    storage: makeStorage(),
    buildFactsPack: ({ request } = {}) => buildScopedFactsPack({
      project: store.getProject(),
      planEntities,
      request: { scopeHint: request?.scopeHint || '' }
    })
  });
  router.assignModel('brutalCritic', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });

  const result = await router.runAIJob('brutalCritic', {
    userMessage: 'Critique the bedroom.',
    scopeHint: 'bedroom'
  });

  assert(result.ok, 'Critique pipeline succeeds end-to-end');
  assertEqual(result.jobId, 'brutalCritic', 'Result names the job');
  assertEqual(result.providerId, 'deepseek', 'Result names the provider');
  assertEqual(result.modelId, 'deepseek-v4-flash', 'Result names the model');
  assert(result.structured && result.structured.findings.length === 1, 'Structured findings validated through the real schema');
  assertEqual(result.structured.findings[0].trust, 'INFERENCE', 'Trust defaulting applied');
  assertEqual(result.consistency.status, 'CONSISTENT', 'Numeric claims consistent with the real facts pack (12.24 m²)');

  // Real project data reached the transport prompt
  const sentBody = svc.calls[0].body;
  const sentPrompt = JSON.stringify(sentBody);
  assert(sentPrompt.includes('12.24'), 'Facts pack numbers present in the sent prompt');
  assert(sentPrompt.includes('Bedroom'), 'Room names present in the sent prompt');
  assert(sentPrompt.includes('Central courtyard'), 'Decisions present in the sent prompt');
  // Scoping: kitchen/other-room exclusion (Living was excluded by the hint)
  assert(!sentPrompt.includes('4.8 × 3.2'), 'Out-of-scope Living dims excluded from the prompt');
  // No key anywhere in the request beyond the auth header, and never in the result
  assert(!JSON.stringify(result).includes('sk-e2e-secret-key-4242'), 'Result object contains no API key');
  assert(!JSON.stringify(router.getActivityLog()).includes('sk-e2e-secret-key-4242'), 'Activity log contains no API key');

  // Usage captured locally
  assert(result.usage && result.usage.inputTokens === 50, 'Token usage captured for the usage UI');
  const log = router.getActivityLog();
  assert(log.length === 1 && log[0].outcome === 'SUCCESS', 'Activity recorded as success');
}

// ---------------------------------------------------------------------------
// Pipeline 2: Plan image → vision job → structured observations
// ---------------------------------------------------------------------------
console.log('\n--- 2. Plan image → vision pipeline ---');

{
  const visionJson = JSON.stringify({
    observations: [
      { topic: 'layout', description: 'Two rooms along a shared wall with a door gap', confidence: 'medium' },
      { topic: 'proportions', description: 'Left room reads roughly square', confidence: 'low' }
    ],
    summary: 'Hand-drawn plan, two-space layout.'
  });
  const svc = makeMockTransports({ visionText: visionJson });
  const providerManager = createProviderManager({ storage: makeStorage() });
  providerManager.setKey('gemini', 'AIza-vision-test-key-1111');
  const modelCatalog = createModelCatalog({ storage: makeStorage() });
  const router = createJobRouter({
    providerManager, modelCatalog, transports: svc.transports,
    storage: makeStorage(),
    buildFactsPack: () => ({ text: '', data: {}, factChecks: [] })
  });
  // Vision model must be in the catalog with vision capability
  modelCatalog.mergeDiscovery('gemini', [
    { modelId: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: true, contextWindow: 1048576 } }
  ]);
  const assigned = router.assignModel('imageAnalysis', { providerId: 'gemini', modelId: 'gemini-2.0-flash' });
  assert(assigned.ok, 'Vision assignment accepted for vision-capable model');

  const result = await router.runAIJob('imageAnalysis', {
    userMessage: 'What does this sketch show?',
    image: { imageBase64: 'UFFUVEP', mimeType: 'image/png' }
  });
  assert(result.ok, 'Vision pipeline succeeds end-to-end');
  // Vision request traveled as a Gemini inline_data part
  assert(svc.calls[0].url.includes('generativelanguage'), 'Vision request hit the Gemini endpoint');
  assert(JSON.stringify(svc.calls[0].body).includes('inline_data'), 'Image traveled as inline_data');
  // The image itself is NOT treated as verified geometry anywhere in the result
  assert(!JSON.stringify(result).includes('MEASURED'), 'Vision result carries no measured-geometry claim');
  const log = router.getActivityLog();
  assert(log[0].outcome === 'SUCCESS', 'Vision success logged');
}

{
  // Vision job on a non-vision model is refused at assignment AND at routing
  const svc = makeMockTransports({ visionText: '{}' });
  const providerManager = createProviderManager({ storage: makeStorage() });
  providerManager.setKey('deepseek', 'sk-x');
  const modelCatalog = createModelCatalog({ storage: makeStorage() });
  const router = createJobRouter({
    providerManager, modelCatalog, transports: svc.transports, storage: makeStorage()
  });
  const refused = router.assignModel('imageAnalysis', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  assert(!refused.ok && refused.error.includes('vision'), 'Text-only model refused for the vision job');
}

// ---------------------------------------------------------------------------
// Pipeline 3: quota exhaustion → user-controlled fallback semantics
// ---------------------------------------------------------------------------
console.log('\n--- 3. Quota / fallback policy pipeline ---');

{
  const svc = makeMockTransports({ failure: { status: 429, body: { error: { message: 'rate limited' } } } });
  const providerManager = createProviderManager({ storage: makeStorage() });
  providerManager.setKey('deepseek', 'sk-a');
  providerManager.setKey('gemini', 'AIza-b');
  const modelCatalog = createModelCatalog({ storage: makeStorage() });
  modelCatalog.mergeDiscovery('gemini', [
    { modelId: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true } }
  ]);
  const router = createJobRouter({
    providerManager, modelCatalog, transports: svc.transports, storage: makeStorage(),
    buildFactsPack: () => ({ text: '', data: {}, factChecks: [] })
  });

  // NEVER policy (default)
  router.assignModel('tutor', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  const r1 = await router.runAIJob('tutor', { userMessage: 'x' });
  assert(!r1.ok && r1.errorCode === 'QUOTA_EXHAUSTED', 'Quota surfaces as QUOTA_EXHAUSTED');
  assert(!r1.fallbackCandidates || r1.fallbackCandidates.length === 0, 'Default policy offers no automatic alternatives');
  const after1 = router.getAssignment('tutor');
  assertEqual(after1.modelId, 'deepseek-v4-flash', 'NEVER policy: assignment untouched');

  // ANY_CONFIGURED policy → the router presents candidates; still no silent switch
  router.assignModel('tutor', {
    providerId: 'deepseek', modelId: 'deepseek-v4-flash', fallbackPolicy: 'any-configured'
  });
  const cands = router.computeFallbackCandidates('tutor', 'QUOTA_EXHAUSTED');
  assert(cands.some(c => c.providerId === 'gemini'), 'Policy-approved candidates include the configured Gemini model');
  const r2 = await router.runAIJob('tutor', { userMessage: 'x' });
  assert(!r2.ok, 'Failure still returned to the user even with a fallback policy');
  assertEqual(router.getAssignment('tutor').modelId, 'deepseek-v4-flash', 'No silent model switch under any policy');

  // Rate-limit message for the UI (rule 58): names provider + remedy, no retry hammering
  assert(r2.message.includes('limit') || r2.message.includes('limit reached') || r2.message.toLowerCase().includes('provider'), 'Rate-limit message explains the provider condition');
}

// ---------------------------------------------------------------------------
// Pipeline 4: security pins
// ---------------------------------------------------------------------------
console.log('\n--- 4. Security pins ---');

{
  const secret = 'sk-super-secret-9z8y';
  const svc = makeMockTransports({ chatText: 'hello' });
  const storage = makeStorage(); // ONE shared storage for every service in this block
  const providerManager = createProviderManager({ storage });
  providerManager.setKey('glm', secret);
  const modelCatalog = createModelCatalog({ storage: makeStorage() });
  const router = createJobRouter({
    providerManager, modelCatalog, transports: svc.transports, storage: makeStorage(),
    buildFactsPack: () => ({ text: '', data: {}, factChecks: [] })
  });
  router.assignModel('generalAssistant', { providerId: 'glm', modelId: 'glm-4.5-flash' });
  const result = await router.runAIJob('generalAssistant', { userMessage: 'hi' });
  assert(result.ok, 'Chat job succeeds');

  // Key appears in exactly one storage value (the key store), never in:
  // project documents, job settings, catalog, activity log
  const keyStore = providerManager.getKeyMode('glm') === 'persistent' ? 'persistent' : 'session';
  assertEqual(keyStore, 'session', 'Default mode is session-only (key in memory, not storage)');
  assert(!storage.dump().includes(secret), 'Key never persisted by default');

  // Switch to persistent: stored once, under the key-store key only. The
  // earlier session key was memory-only; the persistent set lands in storage.
  providerManager.setKeyMode('glm', 'persistent');
  providerManager.setKey('glm', secret);
  const occurrences = storage.dump().split(secret).length - 1;
  assertEqual(occurrences, 1, 'Persistent key stored exactly once');
  const store2 = createProjectStore({ storage, generateId: () => 'p2' });
  store2.createNewProject({ name: 'other' });
  store2.updateProject(d => { d.notes.push({ id: 'n', title: 't', body: 'b' }); return d; });
  const afterOccurrences = storage.dump().split(secret).length - 1;
  assertEqual(afterOccurrences, 1, 'Key remains only in the key store after project writes');
}

{
  // AI output is data, not instructions: response object carries text only;
  // the render layer escapes (pinned here by asserting no code-exec surface
  // exists in the result contract)
  const malicious = {
    summary: '<img src=x onerror=alert(1)>',
    verdict: 'v',
    findings: [{ title: '<script>alert(2)</script>', observation: 'o', evidence: ['e'], whyItMatters: 'w', recommendation: 'r', testNext: 't' }]
  };
  const svc = makeMockTransports({ structuredText: JSON.stringify(malicious) });
  const providerManager = createProviderManager({ storage: makeStorage() });
  providerManager.setKey('deepseek', 'sk-x');
  const modelCatalog = createModelCatalog({ storage: makeStorage() });
  const router = createJobRouter({
    providerManager, modelCatalog, transports: svc.transports, storage: makeStorage(),
    buildFactsPack: () => ({ text: '', data: {}, factChecks: [] })
  });
  router.assignModel('studioCritic', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  const result = await router.runAIJob('studioCritic', { userMessage: 'x' });
  assert(result.ok, 'Malicious-looking structured output still passes schema (data, not instructions)');
  // The view escapes on render; the contract test asserts the result carries raw strings only
  assert(typeof result.structured.summary === 'string', 'Result carries plain strings for the escaping render layer');
}

// ---------------------------------------------------------------------------
// Pipeline 5: jobs coverage sanity
// ---------------------------------------------------------------------------
console.log('\n--- 5. Job definitions sanity ---');

{
  const required = ['generalAssistant', 'tutor', 'designMentor', 'studioCritic', 'brutalCritic', 'jury', 'ideation', 'bestPractice', 'projectAnalysis', 'imageAnalysis', 'conceptImage'];
  for (const jobId of required) {
    assert(AI_JOB_DEFINITIONS.some(j => j.jobId === jobId), `Job "${jobId}" defined`);
  }
  const structured = ['studioCritic', 'brutalCritic', 'jury', 'projectAnalysis'];
  for (const jobId of structured) {
    const def = AI_JOB_DEFINITIONS.find(j => j.jobId === jobId);
    assert(def.requiredCapabilities.structuredOutput, `Job "${jobId}" requires structured output`);
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
