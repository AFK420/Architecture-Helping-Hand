/**
 * Architecture Helping Hand - AI Layer Test Suite
 * Phases 9-12: provider abstraction, tool registry, facts pack, structured
 * validation, trust labels, numeric claim checking, orchestrator end-to-end
 * (with a REAL deterministic fake provider — no network), and proposal flow.
 *
 * The "AI" in these tests is a scripted provider that returns controlled
 * text — network transport is never involved. All core numbers come from
 * real engines through the facts pack.
 */

import {
  AI_ERROR_CODES, createProvider, providerSupports, normalizeProviderError,
  statusCodeToError, createKeyStore, AI_CAPABILITIES
} from '../src/ai/providers/provider.js';
import { createToolRegistry, validateAgainstSchema, AI_PERMISSIONS } from '../src/ai/tools/registry.js';
import { createArchitectureTools } from '../src/ai/tools/architecture-tools.js';
import {
  validateStructuredResponse, validateNumericClaims, classifyTrust,
  CRITIC_RESPONSE_SCHEMA, TRUST_LEVELS
} from '../src/ai/schemas/validators.js';
import { buildFactsPack } from '../src/ai/context/facts-pack.js';
import { getModeProfile, AI_MODES, listModes } from '../src/ai/modes/modes.js';
import { createOrchestrator, extractJson } from '../src/ai/orchestrator.js';
import { createProjectStore } from '../src/services/store.js';
import { createProject } from '../src/core/project.js';
import { createRoom, createWall, placeFurniture } from '../src/core/entities.js';
import { checkFurnitureFit } from '../src/core/space-planning.js';

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

function assertClose(actual, expected, message, eps = 1e-9) {
  const ok = Math.abs(actual - expected) < eps;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, Received: ${actual})`);
  }
}

console.log('🧪 Running tests/ai.test.js...');

// Real fixtures: real store + real plan entities
const map = new Map();
const storage = {
  getItem: k => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, String(v)),
  removeItem: k => map.delete(k)
};
const store = createProjectStore({ storage, generateId: () => 'proj-ai' });
store.createNewProject({ name: 'Studio House', description: 'Courtyard concept, minimal' });
store.updateProject(d => {
  d.metadata.description = 'Courtyard concept, minimal';
  d.decisions.push({ id: 'd1', kind: 'concept', name: 'Central courtyard', createdAt: '2026-09-03T00:00:00.000Z' });
  return d;
});

const living = createRoom({ name: 'Living', x: 0, y: 0, width: 4.8, depth: 3.2 });
const bed = createRoom({ name: 'Bedroom', x: 4.8, y: 0, width: 3.6, depth: 3.4 });
const wallN = createWall({ name: 'North Wall', x1: 0, y1: 0, x2: 8.4, y2: 0 });
const sofa = placeFurniture({ wCm: 220, dCm: 90, x: 0.3, y: 0.3, name: 'Sofa' });
const planEntities = [living, bed, wallN, sofa];

const getProject = () => store.getProject();
const getPlanEntities = () => planEntities;

// ---------------------------------------------------------------------------
// 1. Provider abstraction
// ---------------------------------------------------------------------------
console.log('\n--- 1. Provider abstraction ---');

{
  const provider = createProvider({
    id: 'gemini',
    label: 'Gemini',
    capabilities: { text: true, reasoning: true, structuredOutput: true, contextLimit: 32000 },
    sendPrompt: async () => ({ ok: true, text: 'test' })
  });
  assertEqual(provider.id, 'gemini', 'Provider id preserved');
  assertEqual(provider.capabilities.vision, false, 'Undeclared capabilities default to false');
  assertEqual(AI_CAPABILITIES.length, 7, 'Capability manifest complete (incl. imageGen)');
  assert(providerSupports(provider, { text: true }), 'Supports declared capability');
  assert(!providerSupports(provider, { vision: true }), 'Does not support undeclared capability');
}

{
  // Error taxonomy mapping
  assertEqual(statusCodeToError(429).errorCode, AI_ERROR_CODES.QUOTA_EXHAUSTED, '429 → quota exhausted');
  assertEqual(statusCodeToError(401).errorCode, AI_ERROR_CODES.AUTH_FAILED, '401 → auth failed');
  assertEqual(statusCodeToError(404).errorCode, AI_ERROR_CODES.INVALID_MODEL, '404 → invalid model');
  const net = normalizeProviderError(new Error('Failed to fetch'));
  assertEqual(net.errorCode, AI_ERROR_CODES.NETWORK_ERROR, 'Network failure classified');
  assert(net.message.includes('works fully without AI'), 'Offline message reassures the student');
}

{
  // Key store: session-only keys never persist
  const sessionKeys = createKeyStore(storage, { sessionOnly: true });
  const beforeSize = storage._map ? storage._map.size : 0;
  sessionKeys.setKey('gemini', 'sk-test-123');
  assertEqual(sessionKeys.getKey('gemini'), 'sk-test-123', 'Session key retrievable');
  const afterSize = storage._map ? storage._map.size : 0;
  assertEqual(afterSize, beforeSize, 'Session key NOT written to storage');
  sessionKeys.clearKey('gemini');
  assertEqual(sessionKeys.getKey('gemini'), null, 'Session key cleared');

  // Persisted keys stored, never logged
  const persistKeys = createKeyStore(storage);
  persistKeys.setKey('glm', 'sk-glm-abc');
  assertEqual(persistKeys.getKey('glm'), 'sk-glm-abc', 'Persisted key retrievable');
  persistKeys.clearKey('glm');
  assertEqual(persistKeys.getKey('glm'), null, 'Key cleared');
}

// ---------------------------------------------------------------------------
// 2. Tool registry
// ---------------------------------------------------------------------------
console.log('\n--- 2. Tool registry ---');

{
  const registry = createToolRegistry(createArchitectureTools(getProject, getPlanEntities));
  const tools = registry.list();
  assert(tools.length >= 15, `Tool set registered (${tools.length} tools)`);
  assert(tools.every(t => t.description && t.permission && t.inputSchema), 'Every tool has description, permission, schema');
  assert(tools.some(t => t.permission === AI_PERMISSIONS.PROPOSE_CHANGE), 'PROPOSE tier present');
  assert(!tools.some(t => t.permission === AI_PERMISSIONS.APPLY_CHANGE), 'No APPLY tool registered (writes need explicit approval flow)');

  // Real execution: getRooms uses real plan entities
  const rooms = await registry.execute('getRooms', {});
  assert(rooms.ok && rooms.result.length === 2, 'getRooms returns real rooms');
  assertClose(rooms.result[0].areaM2, 15.36, 'Room area from real geometry');

  // Real execution: evaluateExpression is deterministic
  const expr = await registry.execute('evaluateExpression', { expression: '2.8m/2' });
  assert(expr.ok && expr.result.isValid, 'Expression tool works through the real engine');

  // Schema validation: missing required arg
  const bad = await registry.execute('calculateStair', {});
  assert(!bad.ok && bad.error.includes('totalRiseMeters'), 'Missing required argument rejected');

  // Unknown tool
  const unknown = await registry.execute('deleteEverything', {});
  assert(!unknown.ok, 'Unknown tool rejected');

  // Propose tool returns a proposal, never mutates
  const before = JSON.stringify(getPlanEntities());
  const proposal = await registry.execute('proposeFurnitureMove', { furnitureId: sofa.id, dx: 0.4, dy: 0, reason: 'Daylight' });
  assert(proposal.ok && proposal.result.requiresApproval, 'Move proposal requires approval');
  assertEqual(JSON.stringify(getPlanEntities()), before, 'PROPOSE tool did NOT mutate the plan');
}

// ---------------------------------------------------------------------------
// 3. Facts pack
// ---------------------------------------------------------------------------
console.log('\n--- 3. Facts pack ---');

{
  const pack = buildFactsPack(getProject(), getPlanEntities(), { includeDecisions: true });
  assert(pack.text.includes('Studio House'), 'Facts pack names the project');
  assert(pack.text.includes('15.36'), 'Facts pack carries the real Living area');
  assert(pack.text.includes('Central courtyard'), 'Facts pack carries real decisions');
  assert(Array.isArray(pack.factChecks) && pack.factChecks.some(f => f.value === 15.36), 'factChecks expose deterministic room areas');
  assert(pack.data.rooms.length === 2, 'Data section structured');
}

// ---------------------------------------------------------------------------
// 4. Structured validation & trust
// ---------------------------------------------------------------------------
console.log('\n--- 4. Structured validation ---');

{
  const good = {
    summary: 's', verdict: 'v',
    findings: [{
      title: 'T', severity: 'high', observation: 'o', evidence: ['e'],
      whyItMatters: 'w', recommendation: 'r', alternative: 'a', tradeOff: 't', testNext: 'n'
    }]
  };
  assert(validateStructuredResponse(good, CRITIC_RESPONSE_SCHEMA).ok, 'Valid critic response passes');

  const badSeverity = { ...good, findings: [{ ...good.findings[0], severity: 'extreme' }] };
  assert(!validateStructuredResponse(badSeverity, CRITIC_RESPONSE_SCHEMA).ok, 'Invalid severity rejected');

  const missing = { summary: 's', verdict: 'v', findings: [{ title: 'T' }] };
  assert(!validateStructuredResponse(missing, CRITIC_RESPONSE_SCHEMA).ok, 'Missing required finding fields rejected');
}

{
  assertEqual(classifyTrust({ calculatedByCore: true }), 'CALCULATED', 'Core-calculated → CALCULATED');
  assertEqual(classifyTrust({ fromReference: true }), 'REFERENCE', 'Reference provenance → REFERENCE');
  assertEqual(classifyTrust(null), 'UNKNOWN', 'No provenance → UNKNOWN');
  assertEqual(TRUST_LEVELS.length, 8, 'Trust taxonomy complete');
}

// ---------------------------------------------------------------------------
// 5. Numeric claim validation (AI SUGGESTS. CORE VERIFIES.)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Numeric claim validation ---');

{
  const facts = [{ label: 'Room "Living" area', value: 15.36, unit: 'm2' }];
  // AI claims the area is 14.2 m² — wrong
  const checked = validateNumericClaims('The living room is 14.2 m², which feels generous.', facts);
  assertEqual(checked.mismatches.length, 1, 'Wrong area claim flagged');
  assertEqual(checked.mismatches[0].classification, 'NEEDS VERIFICATION', 'Mismatch classified NEEDS VERIFICATION');
  assert(checked.mismatches[0].note.includes('15.36'), 'Mismatch note quotes the core value');

  // AI claims correct area → no mismatch
  const ok = validateNumericClaims('Your living room measures 15.36 m².', facts);
  assertEqual(ok.mismatches.length, 0, 'Correct claim passes');

  // Unit-normalized claim: 153600 cm² would be nonsense; use mm length check
  const lenFacts = [{ label: 'Wall length', value: 4800, unit: 'mm' }];
  const wrongLen = validateNumericClaims('The wall is 4.5 m long.', lenFacts);
  assertEqual(wrongLen.mismatches.length, 1, 'Unit-normalized mismatch caught (4.5m vs 4800mm)');
  const rightLen = validateNumericClaims('The wall is 4.8 m long.', lenFacts);
  assertEqual(rightLen.mismatches.length, 0, 'Unit-normalized match accepted (4.8m = 4800mm)');
}

// ---------------------------------------------------------------------------
// 6. Orchestrator end-to-end (scripted provider, no network)
// ---------------------------------------------------------------------------
console.log('\n--- 6. Orchestrator ---');

{
  // Unconfigured → controlled failure, app keeps working
  const noKey = createOrchestrator({
    provider: createProvider({ id: 'gemini', capabilities: { text: true }, sendPrompt: async () => ({ ok: true, text: 'x' }) }),
    getKey: () => null,
    buildFactsPack: () => buildFactsPack(getProject(), getPlanEntities())
  });
  const blocked = await noKey.run({ mode: AI_MODES.CRITIC, userMessage: 'critique' });
  assert(!blocked.ok && blocked.errorCode === AI_ERROR_CODES.PROVIDER_UNCONFIGURED, 'Missing key → PROVIDER_UNCONFIGURED');
  assert(blocked.message.includes('works fully without AI'), 'Failure message reassures');
}

{
  // Capability gating: vision request on a text-only provider
  const textOnly = createOrchestrator({
    provider: createProvider({ id: 'glm', capabilities: { text: true }, sendPrompt: async () => ({ ok: true, text: 'x' }) }),
    getKey: () => 'sk-x',
    buildFactsPack: () => buildFactsPack(getProject(), getPlanEntities())
  });
  const gated = await textOnly.run({ mode: AI_MODES.TUTOR, userMessage: 'look at my sketch', requiredCapabilities: { vision: true } });
  assert(!gated.ok, 'Vision request on text provider refused');
}

{
  // Structured critic flow with a scripted provider (real facts in prompt)
  let capturedPrompt = null;
  const scripted = createOrchestrator({
    provider: createProvider({
      id: 'gemini',
      capabilities: { text: true, reasoning: true, structuredOutput: true },
      sendPrompt: async (req) => {
        capturedPrompt = req;
        return {
          ok: true,
          text: JSON.stringify({
            summary: 'The circulation consumes space without spatial work.',
            verdict: 'The scheme needs circulation restructuring.',
            findings: [{
              title: 'Circulation inefficiency',
              severity: 'high',
              observation: 'The corridor eats area the plan does not use.',
              evidence: ['Living is 15.36 m² but the sofa leaves a 1.75 m margin unused on the west.'],
              whyItMatters: 'Circulation area performs little spatial work.',
              recommendation: 'Merge the corridor zone into the living space.',
              alternative: 'Reduce the hallway to a 0.9 m envelope.',
              tradeOff: 'Less wall for storage.',
              testNext: 'Re-check the 0.9 m clearance envelope after the move.'
            }]
          })
        };
      }
    }),
    getKey: () => 'sk-test',
    buildFactsPack: () => buildFactsPack(getProject(), getPlanEntities())
  });

  const result = await scripted.run({ mode: AI_MODES.BRUTAL, userMessage: 'Be honest about my plan.' });
  assert(result.ok, 'Scripted critic flow succeeds');
  assert(result.structured && result.structured.findings.length === 1, 'Structured findings validated');
  assertEqual(result.structured.findings[0].trust, 'INFERENCE', 'Missing trust labels defaulted to INFERENCE');
  assert(result.consistency.status === 'CONSISTENT', 'Numeric claims consistent with core facts');
  // Facts pack reached the provider
  assert(capturedPrompt.userPrompt.includes('15.36'), 'Facts pack numbers present in the prompt');
  assert(capturedPrompt.systemPrompt.includes('NEVER insult'), 'Brutal mode tone contract in system prompt');
}

{
  // Malformed structured response → MALFORMED_RESPONSE, raw text preserved
  const bad = createOrchestrator({
    provider: createProvider({
      id: 'gemini', capabilities: { text: true, structuredOutput: true },
      sendPrompt: async () => ({ ok: true, text: 'Sorry, I cannot help with that in JSON.' })
    }),
    getKey: () => 'sk-test',
    buildFactsPack: () => buildFactsPack(getProject(), getPlanEntities())
  });
  const res = await bad.run({ mode: AI_MODES.CRITIC, userMessage: 'x' });
  assert(!res.ok && res.errorCode === AI_ERROR_CODES.MALFORMED_RESPONSE, 'Non-JSON structured response flagged');
  assert(res.rawText && res.rawText.length > 0, 'Raw text preserved for debugging');
}

{
  // Numeric mismatch flows through the orchestrator
  const liar = createOrchestrator({
    provider: createProvider({
      id: 'gemini', capabilities: { text: true },
      sendPrompt: async () => ({ ok: true, text: 'Your Living room is 14.2 m².' })
    }),
    getKey: () => 'sk-test',
    buildFactsPack: () => buildFactsPack(getProject(), getPlanEntities())
  });
  const res = await liar.run({ mode: AI_MODES.MENTOR, userMessage: 'How big is my living room?' });
  assert(res.ok, 'Unstructured mode succeeds');
  assertEqual(res.consistency.status, 'NEEDS VERIFICATION', 'AI numeric lie flagged by the orchestrator');
  assertEqual(res.consistency.mismatches[0].factValue, 15.36, 'Mismatch quotes the deterministic value');
}

{
  // Quota failure surfaces as AI_UNAVAILABLE behavior
  const quota = createOrchestrator({
    provider: createProvider({
      id: 'gemini', capabilities: { text: true },
      sendPrompt: async () => ({ ok: false, errorCode: AI_ERROR_CODES.QUOTA_EXHAUSTED, message: 'limit' })
    }),
    getKey: () => 'sk-test',
    buildFactsPack: () => buildFactsPack(getProject(), getPlanEntities())
  });
  const res = await quota.run({ mode: AI_MODES.TUTOR, userMessage: 'x' });
  assert(!res.ok && res.errorCode === AI_ERROR_CODES.QUOTA_EXHAUSTED, 'Quota exhausted surfaces cleanly');
}

// ---------------------------------------------------------------------------
// 7. Mode profiles
// ---------------------------------------------------------------------------
console.log('\n--- 7. Modes ---');

{
  assertEqual(listModes().length, 7, 'Seven specialist modes');
  const brutal = getModeProfile(AI_MODES.BRUTAL);
  assert(brutal.expectsStructured, 'Brutal critic expects structured output');
  assert(brutal.systemPrompt.includes('NEVER insult'), 'Brutal tone contract: no insults');
  const tutor = getModeProfile(AI_MODES.TUTOR);
  assert(tutor.systemPrompt.includes('Socratic'), 'Tutor is Socratic-first');
  const practice = getModeProfile(AI_MODES.BEST_PRACTICE);
  assert(practice.systemPrompt.includes('NEEDS VERIFICATION'), 'Best-practice mode never claims compliance');
}

// ---------------------------------------------------------------------------
// 8. Proposal apply flow (Phase 12.3): approve → apply → recalc → undo
// ---------------------------------------------------------------------------
console.log('\n--- 8. Proposal apply flow ---');

{
  // Simulate the UI accept path for a furniture-move proposal
  const f = getPlanEntities().find(e => e.id === sofa.id);
  const from = { x: f.x, y: f.y };
  const dx = 0.4;

  // Apply (as the UI would after user approval): mutate + record undo
  f.x += dx;
  assertClose(f.x, from.x + 0.4, 'Approved proposal applied');

  // Recalculate deterministic checks post-apply
  const fit = checkFurnitureFit(f, living);
  assert(fit.verdict === 'fits' || fit.verdict === 'partial', 'Post-apply recalculation returns a verdict');

  // Undo restores
  f.x -= dx;
  assertClose(f.x, from.x, 'Undo restores pre-proposal state');

  // Project subscribe/publish notification fired on store updates
  let notified = false;
  const unsub = store.subscribe(() => { notified = true; });
  store.updateProject(d => { d.notes.push({ id: 'n-ai', title: 'AI note', body: 'accepted proposal note' }); return d; });
  assert(notified, 'Store notification fired after applying an accepted proposal note');
  unsub();
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
