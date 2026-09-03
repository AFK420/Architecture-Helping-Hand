/**
 * Architecture Helping Hand - Gemini Transport (Phase 15, M3)
 * Real Google Gemini API adapter over the injected AI HTTP boundary.
 *
 * Endpoint mechanics (official REST, v1beta):
 *  - Generate:  POST {endpoint}/models/{model}:generateContent?key=API_KEY
 *  - Models:    GET  {endpoint}/models?key=API_KEY (paginated ListModels)
 *  - Vision:    inline_data { mime_type, data(base64) } part
 *  - Structured: generationConfig.responseMimeType = "application/json"
 *
 * The adapter never invents endpoints and never hard-codes a model id: the
 * model comes from the caller (model catalog / job assignment). Capability
 * gating happens upstream; this module maps requests/responses/errors.
 */

import { AI_ERROR_CODES } from '../../../ai/providers/provider.js';

/** Minimal connection-test prompt — no project data, no user content. */
const GEMINI_TEST_PROMPT = 'Reply with the single word: ready';

/**
 * Maps an HTTP status + provider error body into the AI error taxonomy.
 * Gemini returns { error: { code, message, status } }.
 */
export function mapGeminiError(http) {
  const apiMessage = http?.json?.error?.message || http?.text || '';
  if (http.status === 400 && /api key not valid|api_key_invalid/i.test(apiMessage)) {
    return { errorCode: AI_ERROR_CODES.AUTH_FAILED, message: 'INVALID KEY — Google rejected the API key.' };
  }
  if (http.status === 401 || http.status === 403) {
    return { errorCode: AI_ERROR_CODES.AUTH_FAILED, message: `INVALID KEY — authentication failed (${http.status}).` };
  }
  if (http.status === 429) {
    return { errorCode: AI_ERROR_CODES.QUOTA_EXHAUSTED, message: 'AI temporarily unavailable — Gemini free limit reached.' };
  }
  if (http.status === 404) {
    return { errorCode: AI_ERROR_CODES.INVALID_MODEL, message: 'MODEL NOT FOUND — check the configured model id.' };
  }
  if (http.status === 400) {
    return { errorCode: AI_ERROR_CODES.UNKNOWN, message: `Gemini rejected the request: ${apiMessage || 'bad request'}` };
  }
  if (http.status >= 500) {
    return { errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: 'Gemini server error — try again later.' };
  }
  if (http.kind === 'timeout') {
    return { errorCode: AI_ERROR_CODES.TIMEOUT, message: 'Gemini request timed out.' };
  }
  if (http.kind === 'network') {
    return { errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: http.message || 'Network unavailable — the app works fully without AI.' };
  }
  return { errorCode: AI_ERROR_CODES.UNKNOWN, message: apiMessage || `Gemini returned HTTP ${http.status}.` };
}

/** Builds the generateContent request body for one call. */
export function buildGenerateBody({ systemPrompt, userPrompt, options = {} }) {
  const parts = [];
  if (options.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: options.mimeType || 'image/png',
        data: options.imageBase64
      }
    });
  }
  parts.push({ text: userPrompt || '' });
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {}
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  if (options.temperature !== undefined && typeof options.temperature === 'number') {
    body.generationConfig.temperature = options.temperature;
  }
  if (options.maxOutputTokens !== undefined && typeof options.maxOutputTokens === 'number') {
    body.generationConfig.maxOutputTokens = options.maxOutputTokens;
  }
  if (options.expectsStructured) {
    body.generationConfig.responseMimeType = 'application/json';
  }
  return body;
}

/** Extracts the candidate text (concatenating text parts) or null. */
export function extractCandidateText(json) {
  const candidate = json?.candidates?.[0];
  if (!candidate) return null;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const texts = parts.map(p => (typeof p?.text === 'string' ? p.text : '')).filter(Boolean);
  return texts.length ? texts.join('') : null;
}

/** Extracts inline base64 image data from a candidate part (image gen). */
export function extractInlineData(json) {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts) {
    const inline = p?.inline_data || p?.inlineData;
    if (inline?.data) {
      return { imageBase64: inline.data, mimeType: inline.mime_type || inline.mimeType || 'image/png' };
    }
  }
  return null;
}

/** Maps the finishReason/safety block into the taxonomy. */
export function mapFinishReason(json) {
  const reason = json?.candidates?.[0]?.finishReason;
  if (reason === 'SAFETY') {
    return { errorCode: AI_ERROR_CODES.UNSAFE_CONTENT, message: 'Gemini blocked the response (safety filter).' };
  }
  if (reason === 'RECITATION') {
    return { errorCode: AI_ERROR_CODES.UNSAFE_CONTENT, message: 'Gemini withheld the response (recitation filter).' };
  }
  return null;
}

/** Normalizes a ListModels entry into the catalog shape. */
export function normalizeGeminiModel(m) {
  const rawName = typeof m?.name === 'string' ? m.name.replace(/^models\//, '') : null;
  if (!rawName) return null;
  const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
  if (methods.length > 0 && !methods.includes('generateContent')) return null; // embed/aqa etc.
  const name = (m?.displayName || rawName).toLowerCase();
  return {
    modelId: rawName,
    displayName: m?.displayName || rawName,
    capabilities: {
      text: true,
      reasoning: /thinking|pro|flash-thinking/.test(rawName) || m?.thinking === true,
      structuredOutput: true, // responseMimeType supported on generateContent models
      toolCalling: true,
      vision: /vision|image|multimodal|-v$|-vl/.test(rawName) || /gemini-2|gemini-3|gemini-1\.5/.test(rawName),
      imageGen: methods.includes('generateImages') || /image-generation|imagen/.test(rawName),
      contextWindow: typeof m?.inputTokenLimit === 'number' ? m.inputTokenLimit : null
    },
    status: 'DISCOVERED',
    origin: 'discovery',
    metadata: { version: m?.version || null, description: m?.description || '' }
  };
}

/**
 * Creates the Gemini transport bound to the shared HTTP client.
 */
export function createGeminiTransport({ http }) {
  if (!http || typeof http.request !== 'function') {
    throw new Error('createGeminiTransport requires an AI HTTP client');
  }

  async function testConnection({ endpoint, apiKey, modelId }) {
    const model = modelId || 'gemini-2.0-flash';
    const started = Date.now();
    const res = await http.request({
      url: `${endpoint}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGenerateBody({ userPrompt: GEMINI_TEST_PROMPT, options: { maxOutputTokens: 16 } }))
      },
      timeoutMs: 20000
    });
    if (!res.ok) {
      return { ok: false, ...mapGeminiError(res) };
    }
    const text = extractCandidateText(res.json);
    if (text === null) {
      const blocked = mapFinishReason(res.json);
      if (blocked) return { ok: false, ...blocked };
      return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Gemini responded without text content.' };
    }
    return { ok: true, latencyMs: Date.now() - started, modelId: model };
  }

  async function listModels({ endpoint, apiKey }) {
    const out = [];
    let pageToken = null;
    // Bound the pagination loop defensively (provider bug protection).
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${endpoint}/models`);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('pageSize', '200');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const res = await http.request({ url: url.toString(), timeoutMs: 20000 });
      if (!res.ok) {
        return { ok: false, ...mapGeminiError(res), partial: out };
      }
      const models = Array.isArray(res.json?.models) ? res.json.models : null;
      if (!models) {
        return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Gemini model list was malformed.', partial: out };
      }
      for (const m of models) {
        const normalized = normalizeGeminiModel(m);
        if (normalized) out.push(normalized);
      }
      pageToken = res.json?.nextPageToken || null;
      if (!pageToken) break;
    }
    return { ok: true, models: out };
  }

  /**
   * Sends one generation request.
   * @param {Object} req - { endpoint, apiKey, modelId, systemPrompt, userPrompt, options }
   * @returns {Object} normalized result
   *   { ok, text, usage:{inputTokens,outputTokens}, finishReason, rawMeta }
   */
  async function sendPrompt(req) {
    const { endpoint, apiKey, modelId, systemPrompt, userPrompt, options = {} } = req || {};
    if (!modelId) return { ok: false, errorCode: AI_ERROR_CODES.INVALID_MODEL, message: 'No model selected for this request.' };
    const res = await http.request({
      url: `${endpoint}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGenerateBody({ systemPrompt, userPrompt, options }))
      }
    });
    if (!res.ok) return { ok: false, ...mapGeminiError(res) };
    const blocked = mapFinishReason(res.json);
    if (blocked) return { ok: false, ...blocked };
    const text = extractCandidateText(res.json);
    if (text === null) {
      return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Gemini responded without text content.' };
    }
    const usage = res.json?.usageMetadata || {};
    return {
      ok: true,
      text,
      usage: {
        inputTokens: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : null,
        outputTokens: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null
      },
      finishReason: res.json?.candidates?.[0]?.finishReason || 'STOP',
      rawMeta: { modelVersion: res.json?.modelVersion || null }
    };
  }

  /**
   * Concept image generation where the model supports it. Gemini image
   * generation models accept a text prompt and return inline image data.
   */
  async function generateImage(req) {
    const { endpoint, apiKey, modelId, prompt, options = {} } = req || {};
    if (!modelId) return { ok: false, errorCode: AI_ERROR_CODES.INVALID_MODEL, message: 'No image model selected.' };
    const res = await http.request({
      url: `${endpoint}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt || 'Conceptual architectural massing study' }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {})
          }
        })
      }
    });
    if (!res.ok) return { ok: false, ...mapGeminiError(res) };
    const image = extractInlineData(res.json);
    if (!image) {
      return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Gemini returned no image data — the model may not support image generation.' };
    }
    return { ok: true, imageBase64: image.imageBase64, mimeType: image.mimeType };
  }

  return { providerId: 'gemini', testConnection, listModels, sendPrompt, generateImage };
}
