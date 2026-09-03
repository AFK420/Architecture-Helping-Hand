/**
 * Architecture Helping Hand - Visual AI Test Suite (Phase 13)
 * Capability gating: no vision capability → honest 'unavailable', never a
 * fake interpretation. Labels enforced on concept generation.
 */

import { createProvider, AI_ERROR_CODES } from '../src/ai/providers/provider.js';
import { visualCapabilities, interpretImage, generateConceptImage } from '../src/ai/visual.js';

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

console.log('🧪 Running tests/visual-ai.test.js...');

{
  // Text-only provider: everything visual unavailable, honestly
  const textOnly = createProvider({ id: 'glm', label: 'GLM', capabilities: { text: true }, sendPrompt: async () => ({ ok: true, text: '' }) });
  const caps = visualCapabilities(textOnly);
  assert(!caps.sketchInterpretation && !caps.planImageInterpretation && !caps.sitePhotoAnalysis && !caps.conceptImageGeneration, 'Text-only provider: all visual capabilities unavailable');

  const res = await interpretImage(textOnly, { imageBase64: 'abc', mimeType: 'image/png' });
  assertEqual(res.available, false, 'interpretImage honestly unavailable');
  assert(res.reason.includes('does not declare vision'), 'Reason explains the capability gap');
  assert(res.reason.includes('unaffected'), 'Reason reassures the app is unaffected');
}

{
  // Vision provider: interpretation works with disclaimer
  const vision = createProvider({
    id: 'gemini', label: 'Gemini',
    capabilities: { text: true, vision: true },
    sendPrompt: async () => ({
      ok: true,
      text: JSON.stringify({ observations: [{ topic: 'layout', description: 'Courtyard visible', confidence: 'medium' }], summary: 'Plan sketch' })
    })
  });
  const caps = visualCapabilities(vision);
  assert(caps.sketchInterpretation && caps.planImageInterpretation, 'Vision provider supports interpretation');

  const res = await interpretImage(vision, { imageBase64: 'abc', question: 'What is this?' });
  assertEqual(res.available, true, 'Vision request available');
  assertEqual(res.ok, true, 'Interpretation succeeds');
  assert(res.disclaimer.includes('Never treat it as measured geometry'), 'Disclaimer forbids treating analysis as geometry');
}

{
  // No provider imageGen → concept generation unavailable with labels contract intact
  const noGen = createProvider({ id: 'glm', capabilities: { text: true, vision: true }, sendPrompt: async () => ({ ok: true }) });
  const gen = await generateConceptImage(noGen, { prompt: 'floating volumes' });
  assertEqual(gen.available, false, 'Concept generation unavailable without imageGen');
  assert(gen.reason.includes('unaffected'), 'Unavailability message reassures');

  // Vision provider WITHOUT imageGen also unavailable for generation
  const caps = visualCapabilities(noGen);
  assertEqual(caps.conceptImageGeneration, false, 'vision ≠ imageGen (separate capabilities)');
}

{
  // imageGen provider: labels enforced on success
  const genProvider = createProvider({
    id: 'gemini', label: 'Gemini',
    capabilities: { text: true, imageGen: true },
    sendPrompt: async () => ({ ok: true, imageBase64: 'ZmFrZQ==' })
  });
  const gen = await generateConceptImage(genProvider, { prompt: 'interlocking volumes' });
  assert(gen.ok && gen.imageBase64, 'Concept image generated when capability declared');
  assert(Array.isArray(gen.labels) && gen.labels.includes('NOT A TECHNICAL DRAWING'), 'Concept labels enforced');
  assert(gen.labels.includes('NOT CONSTRUCTION DOCUMENTATION'), 'Not-construction label present');
}

{
  // Missing image input → controlled error, not a crash
  const vision = createProvider({ id: 'g', capabilities: { vision: true }, sendPrompt: async () => ({ ok: true, text: '{}' }) });
  const res = await interpretImage(vision, {});
  assert(res.available && !res.ok && res.errorCode === AI_ERROR_CODES.MISSING_INPUT, 'Missing image → MISSING_INPUT');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
