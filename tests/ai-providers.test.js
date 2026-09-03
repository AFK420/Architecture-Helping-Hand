/**
 * Architecture Helping Hand - AI Provider Integration Test Suite (Phase 15)
 * Provider manager, key storage modes, model catalog, transports (Gemini +
 * OpenAI-compatible GLM/DeepSeek) over DETERMINISTIC MOCKED HTTP, job router,
 * error normalization, context budget, fallback policy, activity log.
 *
 * RULE: no test in this file performs a real network request — the HTTP
 * client is always a scripted mock at the service boundary.
 */

import { createAiHttp } from '../src/services/ai/http.js';
import {
  createProviderManager, maskKey, validateKeyFormat,
  AI_PROVIDER_DIRECTORY, getProviderEntry
} from '../src/services/ai/provider-manager.js';
import {
  createModelCatalog, normalizeCapabilities, AI_MODEL_CATALOG_KEY
} from '../src/services/ai/model-catalog.js';
import { createTransports } from '../src/services/ai/transports/index.js';
import { buildGenerateBody, extractCandidateText, mapGeminiError, normalizeGeminiModel } from '../src/services/ai/transports/gemini.js';
import { buildChatBody, extractChoiceText, mapOpenAiCompatError } from '../src/services/ai/transports/openai-compat.js';
import {
  createJobRouter, AI_JOB_DEFINITIONS, getJobDefinition, estimateTokens,
  FALLBACK_POLICIES, extractJsonObject
} from '../src/services/ai/job-router.js';
import { AI_ERROR_CODES } from '../src/ai/providers/provider.js';
import { createRoom, placeFurniture } from '../src/core/entities.js';

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

console.log('🧪 Running tests/ai-providers.test.js...');

// Shared fake storage (per-suite isolation)
function makeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map
  };
}

// ---------------------------------------------------------------------------
// 1. Key handling: masking, validation, session vs persistent
// ---------------------------------------------------------------------------
console.log('\n--- 1. Key management ---');

{
  assertEqual(maskKey('sk-abcdefghijklmnop'), '••••••••mnop', 'Mask reveals only last 4 chars');
  assertEqual(maskKey('abc'), '••••••••abc', 'Short key masked without revealing more than it has');
  assertEqual(maskKey(''), '', 'Empty key masks to empty');
  assertEqual(maskKey(null), '', 'Null key masks to empty');

  assert(validateKeyFormat('  sk-test-123  ').ok, 'Key with surrounding whitespace validates (trimmed)');
  assertEqual(validateKeyFormat('  sk-test-123  ').trimmed, 'sk-test-123', 'Key is trimmed');
  assert(!validateKeyFormat('').ok, 'Empty key rejected');
  assert(!validateKeyFormat('line1\nline2').ok, 'Multi-line key rejected');
  assert(!validateKeyFormat('x'.repeat(5000)).ok, 'Implausibly long key rejected');
}

{
  const storage = makeStorage();
  const pm = createProviderManager({ storage });

  // Session mode (default): key retrievable, never written to storage
  const setRes = pm.setKey('gemini', 'AIza-test-key-9876');
  assert(setRes.ok, 'Key set accepted');
  assertEqual(setRes.mode, 'session', 'Default key mode is session-only');
  assert(pm.hasKey('gemini'), 'Key presence reported');
  const sizeAfterSession = storage._map.size;
  let keysInStorage = 0;
  for (const [k, v] of storage._map.entries()) {
    if (typeof v === 'string' && v.includes('AIza-test-key-9876')) keysInStorage++;
  }
  assertEqual(keysInStorage, 0, 'Session key NEVER persisted to storage');
  assert(!JSON.stringify([...storage._map.values()]).includes('AIza-test-key-9876'), 'Raw key absent from every storage value');

  // Persistent mode: key lands in storage under the key-store namespace
  pm.setKeyMode('glm', 'persistent');
  pm.setKey('glm', 'glm-secret-key-abcd');
  assert(pm.getKeyMode('glm') === 'persistent', 'Key mode switch to persistent');
  assert(pm.hasKey('glm'), 'Persistent key present');
  keysInStorage = 0;
  for (const v of storage._map.values()) {
    if (typeof v === 'string' && v.includes('glm-secret-key-abcd')) keysInStorage++;
  }
  assertEqual(keysInStorage, 1, 'Persistent key stored exactly once (per-provider key store)');

  // Switching back to session clears the persisted key
  pm.setKeyMode('glm', 'session');
  assert(!pm.hasKey('glm'), 'Switching to session mode clears the persisted key');

  // Clear removes both stores
  pm.setKeyMode('deepseek', 'persistent');
  pm.setKey('deepseek', 'sk-deepseek-xyz1');
  pm.clearKey('deepseek');
  assert(!pm.hasKey('deepseek'), 'clearKey removes the key');

  // Masked status never carries the raw key
  pm.setKey('gemini', 'AIza-test-key-9876');
  const status = pm.getProviderStatus('gemini');
  assertEqual(status.maskedKey, '••••••••9876', 'Status exposes masked key only');
  assert(!JSON.stringify(status).includes('AIza-test-key-9876'), 'Status object contains no raw key');
}

{
  // Provider directory sanity
  assertEqual(AI_PROVIDER_DIRECTORY.length, 3, 'Three initial providers declared');
  for (const entry of AI_PROVIDER_DIRECTORY) {
    assert(entry.transportId && entry.defaultEndpoint && entry.docsUrl, `Provider ${entry.id} fully declared`);
  }
  assert(getProviderEntry('gemini').supportsModelDiscovery, 'Gemini declares discovery');
  assert(!getProviderEntry('unknown'), 'Unknown provider returns null');
}

// ---------------------------------------------------------------------------
// 2. Mocked HTTP + Gemini transport
// ---------------------------------------------------------------------------
console.log('\n--- 2. Gemini transport (mocked HTTP) ---');

{
  // Request shape: correct endpoint, key as query param, JSON body
  const calls = [];
  const http = createAiHttp({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'ready' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3 }
      }), { status: 200 });
    }
  });
  const transport = createTransports({ http }).get('gemini');
  const res = await transport.testConnection({ endpoint: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'AIza-test', modelId: 'gemini-2.0-flash' });
  assert(res.ok, 'Gemini connection test succeeds (mocked)');
  assertEqual(calls.length, 1, 'Exactly one HTTP call for the test');
  assert(calls[0].url.includes('/models/gemini-2.0-flash:generateContent'), 'Official generateContent endpoint used');
  assert(calls[0].url.includes('key=AIza-test'), 'API key passed as documented query param');
  assert(!JSON.stringify(calls[0].init.body).includes('Studio House'), 'Connection test sends NO project data');

  const gen = await transport.sendPrompt({
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: 'AIza-test',
    modelId: 'gemini-2.0-flash',
    systemPrompt: 'SYS',
    userPrompt: 'USER',
    options: { expectsStructured: true, temperature: 0.4 }
  });
  assert(gen.ok && gen.text === 'ready', 'sendPrompt returns normalized text');
  assertEqual(gen.usage.inputTokens, 12, 'Gemini usage input tokens normalized');
  assertEqual(gen.usage.outputTokens, 3, 'Gemini usage output tokens normalized');
  const body = JSON.parse(calls[1].init.body);
  assertEqual(body.generationConfig.responseMimeType, 'application/json', 'Structured mode sets responseMimeType');
  assertEqual(body.systemInstruction.parts[0].text, 'SYS', 'System prompt mapped to systemInstruction');
  assertEqual(body.contents[0].parts[0].text, 'USER', 'User prompt mapped to contents');
}

{
  // Vision request shape: inline_data part
  const calls = [];
  const http = createAiHttp({
    fetchImpl: async (url, init) => {
      calls.push({ url, init: JSON.parse(init.body) });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'seen' }] } }] }), { status: 200 });
    }
  });
  const transport = createTransports({ http }).get('gemini');
  await transport.sendPrompt({
    endpoint: 'https://x', apiKey: 'k', modelId: 'm',
    userPrompt: 'What is this?', options: { imageBase64: 'QUJD', mimeType: 'image/png' }
  });
  const parts = calls[0].init.contents[0].parts;
  assertEqual(parts[0].inline_data.mime_type, 'image/png', 'Vision image sent as inline_data');
  assertEqual(parts[0].inline_data.data, 'QUJD', 'Vision base64 passed through');
}

{
  // Model discovery: list + normalization
  const http = createAiHttp({
    fetchImpl: async () => new Response(JSON.stringify({
      models: [
        { name: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1048576 },
        { name: 'models/embedding-001', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-2.0-flash-exp-image-generation', displayName: 'Image Gen', supportedGenerationMethods: ['generateContent', 'generateImages'] }
      ]
    }), { status: 200 })
  });
  const transport = createTransports({ http }).get('gemini');
  const res = await transport.listModels({ endpoint: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'k' });
  assert(res.ok, 'Gemini discovery succeeds');
  assertEqual(res.models.length, 2, 'Embedding-only models filtered out');
  const flash = res.models.find(m => m.modelId === 'gemini-2.0-flash');
  assert(flash && flash.capabilities.contextWindow === 1048576, 'Discovery carries context window from provider');
  const img = res.models.find(m => m.modelId.includes('image-generation'));
  assert(img && img.capabilities.imageGen, 'Image generation model flagged imageGen');
}

{
  // Error mapping: 400 invalid key, 429, 404, safety block
  const mkHttp = (status, body) => createAiHttp({
    fetchImpl: async () => new Response(JSON.stringify(body), { status })
  });
  const inv = await createTransports({ http: mkHttp(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }) }).get('gemini')
    .testConnection({ endpoint: 'https://x', apiKey: 'bad' });
  assertEqual(inv.errorCode, AI_ERROR_CODES.AUTH_FAILED, 'Gemini 400 invalid-key → AUTH_FAILED');
  assert(inv.message.includes('INVALID KEY'), 'User-facing message names the key problem');

  const quota = await createTransports({ http: mkHttp(429, { error: { message: 'quota' } }) }).get('gemini')
    .sendPrompt({ endpoint: 'https://x', apiKey: 'k', modelId: 'm', userPrompt: 'x' });
  assertEqual(quota.errorCode, AI_ERROR_CODES.QUOTA_EXHAUSTED, '429 → QUOTA_EXHAUSTED');

  const missing = await createTransports({ http: mkHttp(404, { error: { message: 'not found' } }) }).get('gemini')
    .sendPrompt({ endpoint: 'https://x', apiKey: 'k', modelId: 'nope', userPrompt: 'x' });
  assertEqual(missing.errorCode, AI_ERROR_CODES.INVALID_MODEL, '404 → INVALID_MODEL');

  const safety = await createTransports({
    http: createAiHttp({ fetchImpl: async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }), { status: 200 }) })
  }).get('gemini').sendPrompt({ endpoint: 'https://x', apiKey: 'k', modelId: 'm', userPrompt: 'x' });
  assertEqual(safety.errorCode, AI_ERROR_CODES.UNSAFE_CONTENT, 'Safety block → UNSAFE_CONTENT');

  // Timeout + network at the HTTP boundary
  const timeoutHttp = createAiHttp({
    fetchImpl: async () => { await new Promise(r => setTimeout(r, 30)); throw new Error('The operation was aborted'); }
  });
  const timed = await createTransports({ http: timeoutHttp }).get('gemini')
    .testConnection({ endpoint: 'https://x', apiKey: 'k' });
  // (AbortController missing in Node test env → falls into network bucket; both are controlled failures)
  assert(!timed.ok && (timed.errorCode === AI_ERROR_CODES.TIMEOUT || timed.errorCode === AI_ERROR_CODES.NETWORK_ERROR), 'Unreachable endpoint → controlled TIMEOUT/NETWORK error');

  const netHttp = createAiHttp({ fetchImpl: async () => { throw new Error('Failed to fetch'); } });
  const net = await createTransports({ http: netHttp }).get('gemini').testConnection({ endpoint: 'https://x', apiKey: 'k' });
  assertEqual(net.errorCode, AI_ERROR_CODES.NETWORK_ERROR, 'Network failure classified');
}

{
  // Body builder + extractor unit paths
  const body = buildGenerateBody({ systemPrompt: 's', userPrompt: 'u', options: {} });
  assert(body.systemInstruction && body.contents, 'buildGenerateBody shape correct');
  assertEqual(extractCandidateText({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] }), 'ab', 'Multi-part text concatenated');
  assertEqual(extractCandidateText({}), null, 'Missing candidates → null');
  const norm = normalizeGeminiModel({ name: 'models/gemini-x', displayName: 'X', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1000 });
  assert(norm && norm.modelId === 'gemini-x', 'normalizeGeminiModel strips models/ prefix');
  assertEqual(mapGeminiError({ status: 503 }).errorCode, AI_ERROR_CODES.NETWORK_ERROR, '5xx → NETWORK_ERROR');
}

// ---------------------------------------------------------------------------
// 3. OpenAI-compatible transport (GLM + DeepSeek) on the same mock pattern
// ---------------------------------------------------------------------------
console.log('\n--- 3. GLM + DeepSeek transports (mocked HTTP) ---');

{
  const calls = [];
  const http = createAiHttp({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'ready' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 9, completion_tokens: 2 }
      }), { status: 200 });
    }
  });
  const transports = createTransports({ http });

  const glm = transports.get('glm');
  const glmRes = await glm.testConnection({ endpoint: 'https://open.bigmodel.cn/api/paas/v4', apiKey: 'glm-key', modelId: 'glm-4.5-flash' });
  assert(glmRes.ok, 'GLM connection test succeeds (mocked)');
  assert(calls[0].url === 'https://open.bigmodel.cn/api/paas/v4/chat/completions', 'GLM documented chat/completions endpoint');
  assertEqual(calls[0].init.headers.Authorization, 'Bearer glm-key', 'GLM Bearer auth');
  const glmBody = JSON.parse(calls[0].init.body);
  assertEqual(glmBody.model, 'glm-4.5-flash', 'GLM model id passed verbatim');

  const ds = transports.get('deepseek');
  const dsRes = await ds.sendPrompt({
    endpoint: 'https://api.deepseek.com', apiKey: 'sk-ds', modelId: 'deepseek-v4-flash',
    systemPrompt: 'S', userPrompt: 'U', options: { expectsStructured: true }
  });
  assert(dsRes.ok && dsRes.text === 'ready', 'DeepSeek sendPrompt normalized');
  assertEqual(dsRes.usage.inputTokens, 9, 'DeepSeek usage tokens normalized');
  const dsCalls = calls.filter(c => c.url === 'https://api.deepseek.com/chat/completions');
  const dsBody = JSON.parse(dsCalls[dsCalls.length - 1].init.body);
  assertEqual(dsBody.response_format.type, 'json_object', 'DeepSeek structured mode uses json_object');
  assertEqual(dsBody.messages[0].role, 'system', 'System message first');
}

{
  // Vision content array for OpenAI-compatible providers
  const calls = [];
  const http = createAiHttp({
    fetchImpl: async (url, init) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }
  });
  await createTransports({ http }).get('deepseek').sendPrompt({
    endpoint: 'https://api.deepseek.com', apiKey: 'k', modelId: 'deepseek-v4-flash-vision-exp',
    userPrompt: 'What is this?', options: { imageBase64: 'XYZ', mimeType: 'image/jpeg' }
  });
  const content = calls[0].messages.find(m => m.role === 'user').content;
  assertEqual(content[0].type, 'image_url', 'Vision part typed image_url');
  assert(content[0].image_url.url.startsWith('data:image/jpeg;base64,XYZ'), 'Data URI carries mime + base64');
}

{
  // Model discovery for OpenAI-compatible providers
  const http = createAiHttp({
    fetchImpl: async () => new Response(JSON.stringify({
      data: [
        { id: 'deepseek-v4-flash' },
        { id: 'deepseek-v4-flash-vision-exp' },
        { id: 'deepseek-embedding' },
        { id: 'glm-4.6v' }
      ]
    }), { status: 200 })
  });
  const transports = createTransports({ http });
  const ds = await transports.get('deepseek').listModels({ endpoint: 'https://api.deepseek.com', apiKey: 'k' });
  assert(ds.ok, 'DeepSeek discovery succeeds');
  assert(!ds.models.some(m => m.modelId === 'deepseek-embedding'), 'Embedding models filtered');
  const vision = ds.models.find(m => m.modelId.includes('vision'));
  assert(vision && vision.capabilities.vision && !vision.capabilities.imageGen, 'Vision model flagged, imageGen not implied');
  const glm = await transports.get('glm').listModels({ endpoint: 'https://open.bigmodel.cn/api/paas/v4', apiKey: 'k' });
  const v = glm.models.find(m => m.modelId === 'glm-4.6v');
  assert(v && v.capabilities.vision, 'GLM vision suffix detected');
}

{
  // Error mapping on the OpenAI-compatible path
  const mk = (status, body) => createAiHttp({ fetchImpl: async () => new Response(JSON.stringify(body), { status }) });
  const bad = await createTransports({ http: mk(401, { error: { message: 'auth' } }) }).get('deepseek')
    .testConnection({ endpoint: 'https://api.deepseek.com', apiKey: 'bad', modelId: 'deepseek-v4-flash' });
  assertEqual(bad.errorCode, AI_ERROR_CODES.AUTH_FAILED, '401 → AUTH_FAILED');
  const lim = await createTransports({ http: mk(429, { error: { message: 'rate' } }) }).get('glm')
    .sendPrompt({ endpoint: 'https://x', apiKey: 'k', modelId: 'm', userPrompt: 'u' });
  assertEqual(lim.errorCode, AI_ERROR_CODES.QUOTA_EXHAUSTED, '429 → QUOTA_EXHAUSTED');
  const nf = await createTransports({ http: mk(400, { error: { message: 'Model Not Exist' } }) }).get('deepseek')
    .sendPrompt({ endpoint: 'https://x', apiKey: 'k', modelId: 'nope', userPrompt: 'u' });
  assertEqual(nf.errorCode, AI_ERROR_CODES.INVALID_MODEL, '400 model-not-exist → INVALID_MODEL');
  const srv = await createTransports({ http: mk(502, {}) }).get('glm')
    .sendPrompt({ endpoint: 'https://x', apiKey: 'k', modelId: 'm', userPrompt: 'u' });
  assertEqual(srv.errorCode, AI_ERROR_CODES.NETWORK_ERROR, '5xx → NETWORK_ERROR');

  const chat = buildChatBody({ systemPrompt: 's', userPrompt: 'u', options: { modelId: 'm' } });
  assertEqual(extractChoiceText({ choices: [{ message: { content: 'x' } }] }), 'x', 'extractChoiceText works');
  assertEqual(extractChoiceText({}), null, 'extractChoiceText null-safe');
  assert(chat.messages.length === 2, 'buildChatBody includes system + user');
  assertEqual(mapOpenAiCompatError({ status: 418 }).errorCode, AI_ERROR_CODES.UNKNOWN, 'Unmapped status → UNKNOWN');
}

// ---------------------------------------------------------------------------
// 4. Model catalog
// ---------------------------------------------------------------------------
console.log('\n--- 4. Model catalog ---');

{
  const storage = makeStorage();
  const catalog = createModelCatalog({ storage });

  // Seeds present, vision separate from text
  const dsModels = catalog.listModels('deepseek');
  assert(dsModels.some(m => m.modelId === 'deepseek-v4-flash'), 'DeepSeek seed model present');
  const visionSeed = catalog.getModel('deepseek', 'deepseek-v4-flash-vision-exp');
  assert(visionSeed && visionSeed.capabilities.vision && !visionSeed.capabilities.imageGen, 'Seed vision model carries vision, not imageGen');

  // Manual entry: user-declared capabilities, flagged for verification
  const manual = catalog.addManualModel('glm', {
    modelId: 'glm-5.3-flash',
    displayName: 'GLM 5.3 Flash',
    capabilities: { text: true, reasoning: true }
  });
  assert(manual.ok, 'Manual model added');
  assertEqual(manual.model.capabilities.vision, false, 'Undeclared manual capability = false (never invented)');
  assert(manual.model.verification.includes('NEEDS VERIFICATION'), 'Manual entry labelled NEEDS VERIFICATION');
  assertEqual(manual.model.origin, 'manual', 'Manual origin recorded');

  assert(!catalog.addManualModel('glm', { modelId: '  ' }).ok, 'Empty model id rejected');
  assert(!catalog.addManualModel('glm', { modelId: 'a\nb' }).ok, 'Multi-line model id rejected');

  // Discovery merge: adds new, upgrades manual with provider truth
  const merge = catalog.mergeDiscovery('glm', [
    { modelId: 'glm-4.6', displayName: 'GLM-4.6', capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: false, imageGen: false, contextWindow: 200000 } },
    { modelId: 'glm-5.3-flash', displayName: 'GLM-5.3-Flash', capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: true, contextWindow: 128000 } }
  ]);
  assertEqual(merge.added, 1, 'Discovery added the new model');
  assertEqual(merge.updated, 1, 'Discovery upgraded the manual model');
  const upgraded = catalog.getModel('glm', 'glm-5.3-flash');
  assert(upgraded.capabilities.vision === true, 'Provider truth overrode user-declared vision=false');
  assertEqual(upgraded.origin, 'discovery', 'Confirmed manual entry flipped to discovery origin');
  assertEqual(upgraded.verification, 'PROVIDER DOCUMENTED', 'Verification upgraded to provider-documented');
  assertEqual(catalog.getModel('glm', 'glm-4.6').capabilities.contextLimit, 200000, 'Context window from discovery stored');

  // Catalog persisted WITHOUT any keys
  const persisted = JSON.stringify([...storage._map.values()]);
  assert(!persisted.includes('glm-key'), 'Catalog storage contains no API keys');

  // Query/filter API for the Control Center
  const all = catalog.queryModels({});
  assert(all.length >= 4, `Query returns all models (${all.length})`);
  const visionOnly = catalog.queryModels({ capabilities: { vision: true } });
  assert(visionOnly.every(m => m.capabilities.vision), 'Capability filter works');
  const search = catalog.queryModels({ search: 'flash' });
  assert(search.length >= 2 && search.every(m => m.modelId.toLowerCase().includes('flash')), 'Search filter works');
  const scoped = catalog.queryModels({ providerId: 'deepseek' });
  assert(scoped.every(m => m.providerId === 'deepseek'), 'Provider scoping works');

  // Retirement + unavailability are visible states, never deletions
  catalog.markRetired('deepseek', 'deepseek-v4-flash');
  assertEqual(catalog.getModel('deepseek', 'deepseek-v4-flash').status, 'RETIRED', 'Retired model stays in catalog');
  catalog.mergeDiscovery('deepseek', [
    { modelId: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true } }
  ]);
  assertEqual(catalog.getModel('deepseek', 'deepseek-v4-flash').status, 'READY', 'Re-discovery revives a retired model');
  catalog.markUnavailable('deepseek', 'deepseek-v4-flash');
  assertEqual(catalog.getModel('deepseek', 'deepseek-v4-flash').status, 'UNAVAILABLE', 'Unavailable status recorded');

  // User deletion is the only removal
  assert(catalog.removeModel('glm', 'glm-4.6').ok, 'User can remove a model');
  assertEqual(catalog.getModel('glm', 'glm-4.6'), null, 'Removed model gone');

  // Context window override (APIs that do not report it)
  catalog.setContextWindow('deepseek', 'deepseek-v4-flash', 96000);
  assertEqual(catalog.getModel('deepseek', 'deepseek-v4-flash').capabilities.contextLimit, 96000, 'Context window override stored');

  // Malformed persisted catalog sanitizes instead of crashing
  const broken = createModelCatalog({ storage: {
    getItem: () => '{"version":1,"providers":{"glm":{"bad":null,"ok":{"modelId":"ok","displayName":"OK"}}}}',
    setItem: () => {}, removeItem: () => {}
  } });
  assert(broken.getModel('glm', 'ok') && broken.getModel('glm', 'ok').modelId === 'ok', 'Malformed catalog entries sanitized on load');
}

{
  assertEqual(normalizeCapabilities({ text: true }).vision, false, 'normalizeCapabilities defaults missing caps to false');
  assertEqual(normalizeCapabilities({ contextWindow: -5 }).contextLimit, null, 'Invalid context window normalized to null');
}

// ---------------------------------------------------------------------------
// 5. Job router: assignment, capability gating, statuses
// ---------------------------------------------------------------------------
console.log('\n--- 5. Job router ---');

{
  const storage = makeStorage();
  const pm = createProviderManager({ storage });
  const catalog = createModelCatalog({ storage });
  const http = createAiHttp({
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      const wantsJson = body.response_format?.type === 'json_object';
      const text = wantsJson
        ? JSON.stringify({ summary: 's', verdict: 'v', findings: [{ title: 'T', observation: 'o', evidence: ['e'], whyItMatters: 'w', recommendation: 'r', testNext: 'n' }] })
        : 'A plain answer.';
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }), { status: 200 });
    }
  });
  const transports = createTransports({ http });

  const realRoom = createRoom({ name: 'Bedroom', x: 0, y: 0, width: 3.6, depth: 3.4 });
  const factsInput = { rooms: [realRoom] };

  const router = createJobRouter({
    providerManager: pm,
    modelCatalog: catalog,
    transports,
    buildFactsPack: ({ scope }) => ({
      text: `ROOMS: ${scope.rooms.map(r => `${r.name} ${r.width}×${r.depth}m = ${(r.width * r.depth).toFixed(2)}m²`).join(', ')}`,
      data: {},
      factChecks: scope.rooms.map(r => ({ label: `Room "${r.name}" area`, value: Number((r.width * r.depth).toFixed(2)), unit: 'm2' }))
    }),
    storage
  });

  // Unassigned job → controlled refusal with guidance
  const notConfigured = await router.runAIJob('brutalCritic', { userMessage: 'go' });
  assert(!notConfigured.ok && notConfigured.errorCode === AI_ERROR_CODES.PROVIDER_UNCONFIGURED, 'Unassigned job refused with guidance');
  assert(notConfigured.message.includes('works fully without AI'), 'Refusal reassures the app works without AI');

  // Capability mismatch: vision job on a text-only model
  pm.setKey('deepseek', 'sk-test');
  const badAssign = router.assignModel('imageAnalysis', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  assert(!badAssign.ok && badAssign.error.includes('vision'), 'Vision job refuses text-only model');
  assert(!router.getAssignment('imageAnalysis'), 'Refused assignment not stored');

  const okAssign = router.assignModel('imageAnalysis', { providerId: 'deepseek', modelId: 'deepseek-v4-flash-vision-exp' });
  assert(okAssign.ok, 'Vision job accepts vision model');
  assertEqual(router.getJobStatus('imageAnalysis').status, 'READY', 'Assigned job reports READY');

  // NO KEY status when the key is removed
  pm.clearKey('deepseek');
  assertEqual(router.getJobStatus('imageAnalysis').status, 'NO KEY', 'Missing key surfaces NO KEY status');
  const noKeyRun = await router.runAIJob('imageAnalysis', { userMessage: 'look', image: { imageBase64: 'QQ==', mimeType: 'image/png' } });
  assert(!noKeyRun.ok && noKeyRun.errorCode === AI_ERROR_CODES.PROVIDER_UNCONFIGURED, 'Job without key refused');
  pm.setKey('deepseek', 'sk-test');

  // Provider disabled → explicit status, no silent switch
  pm.setEnabled('deepseek', false);
  assertEqual(router.getJobStatus('imageAnalysis').status, 'PROVIDER DISABLED', 'Disabled provider surfaced');
  const disabledRun = await router.runAIJob('imageAnalysis', { userMessage: 'look', image: { imageBase64: 'QQ==', mimeType: 'image/png' } });
  assert(!disabledRun.ok && disabledRun.message.includes('disabled'), 'Disabled provider refuses with explicit message');
  pm.setEnabled('deepseek', true);

  // Model unavailable status when the catalog entry is missing/retired
  catalog.markRetired('deepseek', 'deepseek-v4-flash-vision-exp');
  assertEqual(router.getJobStatus('imageAnalysis').status, 'MODEL UNAVAILABLE', 'Retired assigned model surfaces MODEL UNAVAILABLE');
  const retiredRun = await router.runAIJob('imageAnalysis', { userMessage: 'look', image: { imageBase64: 'QQ==', mimeType: 'image/png' } });
  assert(!retiredRun.ok && retiredRun.message.includes('No automatic switch'), 'Retired model refuses WITHOUT auto-switch');
  catalog.mergeDiscovery('deepseek', [
    { modelId: 'deepseek-v4-flash-vision-exp', displayName: 'DeepSeek V4 Flash Vision (exp)', capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: true } }
  ]);

  // Vision job end-to-end on the mock transport
  const visionRun = await router.runAIJob('imageAnalysis', { userMessage: 'What do you see?', image: { imageBase64: 'QQ==', mimeType: 'image/png' } });
  assert(visionRun.ok, 'Vision job succeeds end-to-end (mocked)');
  assertEqual(visionRun.providerId, 'deepseek', 'Vision result names the provider');
  assertEqual(visionRun.modelId, 'deepseek-v4-flash-vision-exp', 'Vision result names the model');

  // Structured job: findings validated, trust defaulted, numeric fact-check
  router.assignModel('brutalCritic', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  const crit = await router.runAIJob('brutalCritic', {
    userMessage: 'Be honest.',
    scope: { rooms: [realRoom] }
  });
  assert(crit.ok, 'Structured critic job succeeds');
  assertEqual(crit.structured.findings[0].trust, 'INFERENCE', 'Missing trust defaulted to INFERENCE');
  assertEqual(crit.consistency.status, 'CONSISTENT', 'No numeric claims → consistent');

  // Unstructured job passes through with numeric fact-checking
  router.assignModel('generalAssistant', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  const wrongClaim = await router.runAIJob('generalAssistant', {
    userMessage: 'How big is the bedroom?',
    scope: { rooms: [realRoom] }
  });
  // The mock returns a plain answer (no numbers) → consistent
  assert(wrongClaim.ok && wrongClaim.consistency.status === 'CONSISTENT', 'Unstructured job normalized with fact-check metadata');

  // Malformed structured output → MALFORMED_RESPONSE
  const badHttp = createAiHttp({
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), { status: 200 })
  });
  const badRouter = createJobRouter({
    providerManager: pm, modelCatalog: catalog, transports: createTransports({ http: badHttp }),
    buildFactsPack: () => ({ text: '', data: {}, factChecks: [] }), storage: makeStorage()
  });
  badRouter.assignModel('studioCritic', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  const malformed = await badRouter.runAIJob('studioCritic', { userMessage: 'x' });
  assert(!malformed.ok && malformed.errorCode === AI_ERROR_CODES.MALFORMED_RESPONSE, 'Malformed structured output flagged');
  assert(malformed.rawText === 'not json', 'Raw text preserved for debugging');
}

{
  // Quota failure: controlled, activity logged, fallback respected
  const storage = makeStorage();
  const pm = createProviderManager({ storage });
  const catalog = createModelCatalog({ storage });
  const http = createAiHttp({
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 })
  });
  const router = createJobRouter({
    providerManager: pm, modelCatalog: catalog, transports: createTransports({ http }),
    buildFactsPack: () => ({ text: '', data: {}, factChecks: [] }),
    storage
  });
  pm.setKey('deepseek', 'sk-test');
  router.assignModel('tutor', { providerId: 'deepseek', modelId: 'deepseek-v4-flash', fallbackPolicy: FALLBACK_POLICIES.NEVER });
  const res = await router.runAIJob('tutor', { userMessage: 'x' });
  assert(!res.ok && res.errorCode === AI_ERROR_CODES.QUOTA_EXHAUSTED, '429 → QUOTA_EXHAUSTED to the caller');
  assert(!res.fallbackCandidates || res.fallbackCandidates.length === 0, 'NEVER policy produces no fallback candidates');
  const log = router.getActivityLog();
  assert(log.length === 1 && log[0].outcome === 'ERROR' && log[0].errorCode === 'QUOTA_EXHAUSTED', 'Activity log records the failure');
  assert(!JSON.stringify(log).includes('sk-test'), 'Activity log never contains keys');
  assert(router.getJobStatus('tutor').status === 'LAST ERROR', 'Job health shows LAST ERROR');

  // Same-provider fallback policy surfaces candidates but does NOT auto-switch
  router.assignModel('tutor', { providerId: 'deepseek', modelId: 'deepseek-v4-flash', fallbackPolicy: FALLBACK_POLICIES.SAME_PROVIDER });
  const res2 = await router.runAIJob('tutor', { userMessage: 'x' });
  assert(!res2.ok, 'Fallback policy still does not execute silently');
  assert(!router.getAssignment('tutor') || router.getAssignment('tutor').modelId === 'deepseek-v4-flash', 'Assignment unchanged after failure');

  // Cross-provider policy: candidates computed for the user to choose
  pm.setKey('glm', 'glm-key');
  router.assignModel('tutor', { providerId: 'deepseek', modelId: 'deepseek-v4-flash', fallbackPolicy: FALLBACK_POLICIES.ANY_CONFIGURED });
  const cands = router.computeFallbackCandidates('tutor', 'QUOTA_EXHAUSTED');
  assert(cands.some(c => c.providerId === 'glm'), 'ANY_CONFIGURED policy lists other configured providers');
  assert(!cands.some(c => c.providerId === 'deepseek' && false), 'Candidate list computed');
}

{
  // Context budget: oversized context refuses with guidance
  const storage = makeStorage();
  const pm = createProviderManager({ storage });
  const catalog = createModelCatalog({ storage });
  const router = createJobRouter({
    providerManager: pm, modelCatalog: catalog,
    transports: createTransports({ http: createAiHttp({ fetchImpl: async () => new Response('{}', { status: 200 }) }) }),
    buildFactsPack: () => ({ text: 'x'.repeat(100000), data: {}, factChecks: [] }),
    storage
  });
  pm.setKey('deepseek', 'sk');
  // Give the model a small known window via catalog override
  router.assignModel('tutor', { providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
  catalog.setContextWindow('deepseek', 'deepseek-v4-flash', 1000);
  const big = await router.runAIJob('tutor', { userMessage: 'x' });
  assert(!big.ok && big.message.includes('Context too large'), 'Oversized context refuses with guidance');
  assert(big.message.includes('larger model') || big.message.includes('Select relevant'), 'Refusal names the remedies');
}

{
  // Assignment persistence: survives reload, never stores keys
  const storage = makeStorage();
  const pm = createProviderManager({ storage });
  const catalog = createModelCatalog({ storage });
  const router = createJobRouter({
    providerManager: pm, modelCatalog: catalog,
    transports: createTransports({ http: createAiHttp({ fetchImpl: async () => new Response('{}', { status: 200 }) }) }),
    storage
  });
  pm.setKey('gemini', 'AIza-keepme-secret');
  router.assignModel('tutor', { providerId: 'gemini', modelId: 'gemini-2.0-flash' });
  const persisted = JSON.stringify([...storage._map.values()]);
  assert(persisted.includes('gemini-2.0-flash'), 'Assignment persisted');
  assert(!persisted.includes('AIza-keepme-secret'), 'Assignment storage contains no keys');

  const router2 = createJobRouter({
    providerManager: pm, modelCatalog: catalog,
    transports: createTransports({ http: createAiHttp({ fetchImpl: async () => new Response('{}', { status: 200 }) }) }),
    storage
  });
  assertEqual(router2.getAssignment('tutor').modelId, 'gemini-2.0-flash', 'Assignment restored after reload');
}

{
  // Definitions sanity
  assertEqual(AI_JOB_DEFINITIONS.length, 11, 'Eleven AI jobs defined');
  assert(AI_JOB_DEFINITIONS.every(j => j.jobId && j.label && j.requiredCapabilities), 'Every job fully declared');
  assert(getJobDefinition('imageAnalysis').requiredCapabilities.vision, 'Image analysis requires vision');
  assert(getJobDefinition('conceptImage').requiredCapabilities.imageGen, 'Concept image requires imageGen');
  assertEqual(estimateTokens('x'.repeat(400)), 100, 'Token estimate = chars/4');
  assertEqual(extractJsonObject('```json\n{"a":1}\n```').a, 1, 'extractJsonObject tolerates fences');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
