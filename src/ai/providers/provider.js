/**
 * Architecture Helping Hand - AI Provider Abstraction
 * Phase 9.1-9.5: capability-declared cloud providers. NO local AI, no GPU
 * inference, no Ollama — the target laptop runs CAD beside the browser.
 *
 * Providers are declared, never hard-coded with permanent model ids: the
 * runtime configuration supplies model names; this module only defines the
 * provider shape, capability manifest, and error taxonomy. Network calls
 * happen in services (fetch wrappers) — this module stays importable
 * headless and defines the CONTRACT.
 *
 * Free-cost policy: no paid fallback. When quota is exhausted the
 * orchestrator reports AI_UNAVAILABLE and the app keeps working.
 */

/** Error codes shared by all providers (stable contract for the UI). */
export const AI_ERROR_CODES = Object.freeze({
  PROVIDER_UNCONFIGURED: 'PROVIDER_UNCONFIGURED',   // no API key set
  NETWORK_ERROR: 'NETWORK_ERROR',                    // fetch failed / offline
  AUTH_FAILED: 'AUTH_FAILED',                        // 401/403
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',                // 429 / free limit
  TIMEOUT: 'TIMEOUT',
  INVALID_MODEL: 'INVALID_MODEL',                    // 404 model
  MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
  UNSAFE_CONTENT: 'UNSAFE_CONTENT',                  // provider blocked
  UNKNOWN: 'UNKNOWN'
});

/** Capability keys every provider manifest must declare. */
export const AI_CAPABILITIES = Object.freeze([
  'text', 'reasoning', 'toolCalling', 'structuredOutput', 'vision', 'imageGen', 'contextLimit'
]);

/**
 * Creates a provider instance from a declaration.
 *
 * @param {Object} declaration
 * @param {string} declaration.id - 'gemini' | 'glm' | ...
 * @param {string} declaration.label - human name
 * @param {Object} declaration.capabilities - booleans + contextLimit
 * @param {Function} declaration.sendPrompt - async ({ systemPrompt, userPrompt, options }) =>
 *   { ok: true, text } | { ok: false, errorCode, message }  (implemented in services)
 * @returns {Object} frozen provider handle
 */
export function createProvider(declaration) {
  if (!declaration || typeof declaration !== 'object') {
    throw new TypeError('Provider declaration required');
  }
  if (typeof declaration.id !== 'string' || !declaration.id) {
    throw new TypeError('Provider id required');
  }
  if (typeof declaration.sendPrompt !== 'function') {
    throw new TypeError(`Provider "${declaration.id}" must implement sendPrompt()`);
  }
  const capabilities = {};
  for (const key of AI_CAPABILITIES) {
    capabilities[key] = declaration.capabilities?.[key] ?? false;
  }
  return Object.freeze({
    id: declaration.id,
    label: declaration.label || declaration.id,
    capabilities: Object.freeze(capabilities),
    sendPrompt: declaration.sendPrompt
  });
}

/** True when a provider can serve a request needing the given capabilities. */
export function providerSupports(provider, needed) {
  if (!provider) return false;
  for (const key of Object.keys(needed || {})) {
    if (needed[key] && !provider.capabilities[key]) return false;
  }
  return true;
}

/** Normalizes a provider/network failure into the stable error taxonomy. */
export function normalizeProviderError(err) {
  if (err && err.errorCode && typeof err.errorCode === 'string' && Object.values(AI_ERROR_CODES).includes(err.errorCode)) {
    return { errorCode: err.errorCode, message: err.message || 'Provider error' };
  }
  if (err && err.aiErrorCode) {
    return { errorCode: err.aiErrorCode, message: err.message || 'Provider error' };
  }
  const message = err?.message || String(err || 'Unknown error');
  if (/failed to fetch|network|offline/i.test(message)) {
    return { errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: 'Network unavailable — the app works fully without AI.' };
  }
  if (/aborted|timeout/i.test(message)) {
    return { errorCode: AI_ERROR_CODES.TIMEOUT, message: 'AI request timed out.' };
  }
  return { errorCode: AI_ERROR_CODES.UNKNOWN, message };
}

/** Maps an HTTP status to the taxonomy. */
export function statusCodeToError(status) {
  if (status === 401 || status === 403) return { errorCode: AI_ERROR_CODES.AUTH_FAILED, message: 'Authentication failed — check the API key.' };
  if (status === 429) return { errorCode: AI_ERROR_CODES.QUOTA_EXHAUSTED, message: 'AI temporarily unavailable — free provider limit reached.' };
  if (status === 404) return { errorCode: AI_ERROR_CODES.INVALID_MODEL, message: 'Model not found — check the configured model name.' };
  if (status >= 500) return { errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: 'Provider server error — try again later.' };
  return { errorCode: AI_ERROR_CODES.UNKNOWN, message: `Provider returned HTTP ${status}.` };
}

/**
 * Runtime key storage (session-only or persisted via StorageService by the
 * caller). Keys NEVER live in this module's code and are never logged.
 */
export function createKeyStore(storageAdapter, { sessionOnly = false } = {}) {
  const key = sessionOnly ? 'archiscale_ai_key_session' : 'archiscale_ai_keys';
  let memoryKeys = new Map(); // session-only keys live only here (per provider)
  return {
    setKey(providerId, apiKey) {
      if (sessionOnly) {
        memoryKeys.set(providerId, apiKey);
        return true;
      }
      try {
        const all = JSON.parse(storageAdapter.getItem(key) || '{}');
        all[providerId] = apiKey;
        storageAdapter.setItem(key, JSON.stringify(all));
        return true;
      } catch (e) {
        return false;
      }
    },
    getKey(providerId) {
      if (sessionOnly) return memoryKeys.has(providerId) ? memoryKeys.get(providerId) : null;
      try {
        const all = JSON.parse(storageAdapter.getItem(key) || '{}');
        return all[providerId] || null;
      } catch (e) {
        return null;
      }
    },
    clearKey(providerId) {
      if (sessionOnly) {
        memoryKeys.delete(providerId);
        return true;
      }
      try {
        const all = JSON.parse(storageAdapter.getItem(key) || '{}');
        delete all[providerId];
        storageAdapter.setItem(key, JSON.stringify(all));
        return true;
      } catch (e) {
        return false;
      }
    },
    /** True when a key exists for at least one provider. */
    hasAnyKey(providerId) {
      return this.getKey(providerId) !== null;
    }
  };
}
