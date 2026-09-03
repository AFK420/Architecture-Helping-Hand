/**
 * Architecture Helping Hand - OpenAI-Compatible Transport (Phase 15, M4+M5)
 * One adapter serves every OpenAI-compatible provider (GLM / Zhipu v4,
 * DeepSeek) — the differences are the base URL and defaults, which come
 * from the provider directory and user configuration, never hard-coded.
 *
 * Endpoint mechanics (OpenAI chat-completions compatible):
 *  - Generate:  POST {endpoint}/chat/completions   (Authorization: Bearer KEY)
 *  - Models:    GET  {endpoint}/models             (Bearer KEY)
 *  - Vision:    content array with { type: 'image_url', image_url: { url: 'data:...;base64,...' } }
 *  - Structured: response_format { type: 'json_object' } where supported
 *
 * Model ids are ALWAYS caller-supplied (catalog / job assignment). No model
 * assumptions live here beyond documented defaults for initial catalog seed.
 */

import { AI_ERROR_CODES } from '../../../ai/providers/provider.js';

const OPENAI_COMPAT_TEST_PROMPT = 'Reply with the single word: ready';

/** Maps an HTTP status/body from an OpenAI-compatible API into the taxonomy. */
export function mapOpenAiCompatError(http) {
  const apiMessage = http?.json?.error?.message || http?.json?.message || http?.text || '';
  if (http.status === 401 || http.status === 403) {
    return { errorCode: AI_ERROR_CODES.AUTH_FAILED, message: `INVALID KEY — authentication failed (${http.status}).` };
  }
  if (http.status === 429) {
    return { errorCode: AI_ERROR_CODES.QUOTA_EXHAUSTED, message: 'AI temporarily unavailable — provider limit reached.' };
  }
  if (http.status === 404) {
    return { errorCode: AI_ERROR_CODES.INVALID_MODEL, message: 'MODEL NOT FOUND — check the configured model id.' };
  }
  if (http.status === 400 && /model.*not.*exist|invalid model/i.test(apiMessage)) {
    return { errorCode: AI_ERROR_CODES.INVALID_MODEL, message: `MODEL NOT FOUND — ${apiMessage}` };
  }
  if (http.status === 400) {
    return { errorCode: AI_ERROR_CODES.UNKNOWN, message: `Provider rejected the request: ${apiMessage || 'bad request'}` };
  }
  if (http.status >= 500) {
    return { errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: 'Provider server error — try again later.' };
  }
  if (http.kind === 'timeout') {
    return { errorCode: AI_ERROR_CODES.TIMEOUT, message: 'Provider request timed out.' };
  }
  if (http.kind === 'network') {
    return { errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: http.message || 'Network unavailable — the app works fully without AI.' };
  }
  return { errorCode: AI_ERROR_CODES.UNKNOWN, message: apiMessage || `Provider returned HTTP ${http.status}.` };
}

/** Builds the chat/completions body. Vision uses the typed content array. */
export function buildChatBody({ systemPrompt, userPrompt, options = {} }) {
  const userContent = [];
  if (options.imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${options.mimeType || 'image/png'};base64,${options.imageBase64}` }
    });
  }
  userContent.push({ type: 'text', text: userPrompt || '' });

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userContent });

  const body = { model: options.modelId, messages };
  if (typeof options.temperature === 'number') body.temperature = options.temperature;
  if (typeof options.maxOutputTokens === 'number' || typeof options.maxOutputTokens === 'string') {
    body.max_tokens = Number(options.maxOutputTokens);
  }
  if (options.expectsStructured) {
    // json_object mode is widely supported on GLM 4.x and DeepSeek; when a
    // model rejects it the transport surfaces the 400 with its message.
    body.response_format = { type: 'json_object' };
  }
  if (options.reasoningEffort && typeof options.reasoningEffort === 'string') {
    // OpenAI-compatible reasoning param (provider-accepted where supported)
    body.reasoning_effort = options.reasoningEffort;
  }
  return body;
}

/** Extracts the first choice message content (string or typed array). */
export function extractChoiceText(json) {
  const choice = json?.choices?.[0];
  if (!choice) return null;
  const content = choice?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const texts = content.map(p => (typeof p?.text === 'string' ? p.text : '')).filter(Boolean);
    return texts.length ? texts.join('') : null;
  }
  return null;
}

/** Normalizes a /models entry into the catalog shape. */
export function normalizeOpenAiCompatModel(m, { providerId }) {
  const modelId = typeof m?.id === 'string' ? m.id : null;
  if (!modelId) return null;
  const lower = modelId.toLowerCase();
  // Vision suffixes: 'vision', '-vl', trailing 'v' (glm-4.6v style)
  const vision = /vision|-vl|v$/.test(lower);
  const imageGen = /image|cogview|dall|flux/.test(lower) && !/vision/.test(lower);
  const isEmbedding = /embed|rerank/.test(lower);
  const isAudio = /audio|speech|tts|voice|asr/.test(lower);
  if (isEmbedding || isAudio) return null; // not applicable to this app's jobs
  return {
    modelId,
    displayName: m?.display_name || modelId,
    capabilities: {
      text: !imageGen,
      reasoning: /reason|thinking|pro|r1|think/.test(lower),
      structuredOutput: !imageGen,
      toolCalling: !imageGen,
      vision,
      imageGen,
      contextWindow: null // not reported by these list APIs — user may override
    },
    status: 'DISCOVERED',
    origin: 'discovery',
    metadata: { providerId, owned_by: m?.owned_by || null }
  };
}

/**
 * Creates the OpenAI-compatible transport for a provider id.
 *
 * @param {Object} options
 * @param {Object} options.http - shared AI HTTP client
 * @param {string} options.providerId - 'glm' | 'deepseek' | future
 */
export function createOpenAiCompatTransport({ http, providerId }) {
  if (!http || typeof http.request !== 'function') {
    throw new Error('createOpenAiCompatTransport requires an AI HTTP client');
  }

  async function testConnection({ endpoint, apiKey, modelId }) {
    // Without a chosen model the test uses the documented default — the user
    // can always retest against a specific catalog model.
    const model = modelId || DEFAULT_TEST_MODELS[providerId] || null;
    if (!model) {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: 'Choose a model before testing.' };
    }
    const started = Date.now();
    const res = await http.request({
      url: `${endpoint}/chat/completions`,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(buildChatBody({
          userPrompt: OPENAI_COMPAT_TEST_PROMPT,
          options: { modelId: model, maxOutputTokens: 16 }
        }))
      },
      timeoutMs: 20000
    });
    if (!res.ok) return { ok: false, ...mapOpenAiCompatError(res) };
    const text = extractChoiceText(res.json);
    if (text === null) {
      return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Provider responded without message content.' };
    }
    return { ok: true, latencyMs: Date.now() - started, modelId: model };
  }

  async function listModels({ endpoint, apiKey }) {
    const res = await http.request({
      url: `${endpoint}/models`,
      init: { method: 'GET', headers: { Authorization: `Bearer ${apiKey}` } },
      timeoutMs: 20000
    });
    if (!res.ok) return { ok: false, ...mapOpenAiCompatError(res) };
    const data = res.json?.data;
    if (!Array.isArray(data)) {
      return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Provider model list was malformed.' };
    }
    const models = data
      .map(m => normalizeOpenAiCompatModel(m, { providerId }))
      .filter(Boolean);
    return { ok: true, models };
  }

  async function sendPrompt(req) {
    const { endpoint, apiKey, modelId, systemPrompt, userPrompt, options = {} } = req || {};
    if (!modelId) return { ok: false, errorCode: AI_ERROR_CODES.INVALID_MODEL, message: 'No model selected for this request.' };
    const res = await http.request({
      url: `${endpoint}/chat/completions`,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(buildChatBody({ systemPrompt, userPrompt, options: { ...options, modelId } }))
      }
    });
    if (!res.ok) return { ok: false, ...mapOpenAiCompatError(res) };
    const text = extractChoiceText(res.json);
    if (text === null) {
      return { ok: false, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'Provider responded without message content.' };
    }
    const usage = res.json?.usage || {};
    return {
      ok: true,
      text,
      usage: {
        inputTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null,
        outputTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : null
      },
      finishReason: res.json?.choices?.[0]?.finish_reason || 'stop',
      rawMeta: { model: res.json?.model || modelId }
    };
  }

  return { providerId, testConnection, listModels, sendPrompt };
}

/**
 * Documented defaults for connection tests BEFORE the user has discovered or
 * chosen a model. These are seeds, never assumptions: once the catalog is
 * populated, tests run against the user-selected model.
 */
export const DEFAULT_TEST_MODELS = Object.freeze({
  glm: 'glm-4.5-flash',
  deepseek: 'deepseek-v4-flash'
});
