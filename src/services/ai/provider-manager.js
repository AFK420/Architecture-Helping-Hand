/**
 * Architecture Helping Hand - AI Provider Manager (Phase 15, M1)
 * Multi-provider configuration: declarative provider directory, per-provider
 * key storage (session-only OR persisted — the user chooses per provider),
 * enable/disable, and connection-test dispatch to the provider transport.
 *
 * Rules enforced here:
 *  - Keys NEVER leave this service except to the transport for a request the
 *    user triggers. Keys are never logged, never exported, never placed in
 *    project documents.
 *  - Masked display only: `••••abcd` (last 4 chars).
 *  - A disabled provider cannot be selected for jobs; its configuration is
 *    kept so re-enabling restores it.
 *  - No automatic network calls: connection tests are explicit user actions.
 *
 * The provider DIRECTORY (ids, labels, default endpoints) is declarative
 * data; the actual model catalog lives in model-catalog.js and the network
 * adapters in transports/*. This module owns configuration state only.
 */

import { AI_ERROR_CODES, statusCodeToError, createKeyStore } from '../../ai/providers/provider.js';

/** Persistent storage key for provider configuration (NO keys inside). */
export const AI_PROVIDER_SETTINGS_KEY = 'archiscale_ai_providers';

/** Persistent storage key for the user's key-storage preference per provider. */
export const AI_KEY_MODE_KEY = 'archiscale_ai_key_modes';

/**
 * The provider directory. Declarative, extensible: adding a provider means
 * adding an entry here plus a transport — no other code changes.
 *
 * transportId selects the adapter in transports/index.js; endpoints are the
 * DOCUMENTED defaults and remain user-overridable where a provider offers
 * regional or proxy endpoints (endpointEditable).
 */
export const AI_PROVIDER_DIRECTORY = Object.freeze([
  {
    id: 'gemini',
    label: 'Google Gemini',
    transportId: 'gemini',
    description: 'Google AI Studio API — generous free tier, wide model catalog.',
    docsUrl: 'https://ai.google.dev/',
    keyHint: 'Paste your Google AI Studio API key (AIza…)',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    endpointEditable: false,
    supportsModelDiscovery: true,
    supportsVision: true,
    supportsImageGen: true
  },
  {
    id: 'glm',
    label: 'GLM (Zhipu)',
    transportId: 'openai-compat',
    description: 'Zhipu GLM models via the OpenAI-compatible v4 API.',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    keyHint: 'Paste your Zhipu / GLM API key',
    defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
    endpointEditable: true,
    supportsModelDiscovery: true,
    supportsVision: true,
    supportsImageGen: false
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    transportId: 'openai-compat',
    description: 'DeepSeek models via the OpenAI-compatible API.',
    docsUrl: 'https://api-docs.deepseek.com/',
    keyHint: 'Paste your DeepSeek API key (sk-…)',
    defaultEndpoint: 'https://api.deepseek.com',
    endpointEditable: true,
    supportsModelDiscovery: true,
    supportsVision: true,
    supportsImageGen: false
  }
]);

/** Returns the directory entry for a provider id (null when unknown). */
export function getProviderEntry(providerId) {
  return AI_PROVIDER_DIRECTORY.find(p => p.id === providerId) || null;
}

/** Masks a key for display: never reveal more than the last 4 characters. */
export function maskKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return '';
  const tail = apiKey.slice(-4);
  return `••••••••${tail}`;
}

/** Structural sanity for a pasted key (no network, no format guesses). */
export function validateKeyFormat(apiKey) {
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return { ok: false, error: 'API key is empty.' };
  }
  if (apiKey.length > 4096) {
    return { ok: false, error: 'API key is implausibly long (>4096 chars).' };
  }
  if (/[\r\n]/.test(apiKey)) {
    return { ok: false, error: 'API key must be a single line — copy it again without line breaks.' };
  }
  return { ok: true, trimmed: apiKey.trim() };
}

/**
 * Creates the provider manager.
 *
 * @param {Object} options
 * @param {Object} options.storage - { getItem, setItem, removeItem }
 * @param {Function} [options.now] - clock override (tests)
 */
export function createProviderManager(options = {}) {
  const storage = options.storage;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('createProviderManager requires a storage adapter');
  }
  const now = options.now || (() => new Date().toISOString());

  // Two key stores: session (memory only) and persistent (storage adapter).
  const sessionKeys = createKeyStore(storage, { sessionOnly: true });
  const persistentKeys = createKeyStore(storage);

  // providerId → 'session' | 'persistent' (default 'session' = safest)
  const keyModes = loadKeyModes();
  // providerId → { enabled, endpoint }
  const settings = loadSettings();

  function loadKeyModes() {
    try {
      const raw = storage.getItem(AI_KEY_MODE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  function loadSettings() {
    try {
      const raw = storage.getItem(AI_PROVIDER_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.providers) {
          // Only known providers are restored; new directory entries default on.
          const restored = {};
          for (const entry of AI_PROVIDER_DIRECTORY) {
            const saved = parsed.providers[entry.id];
            restored[entry.id] = {
              enabled: saved && typeof saved.enabled === 'boolean' ? saved.enabled : true,
              endpoint: saved && typeof saved.endpoint === 'string' && saved.endpoint
                ? saved.endpoint
                : entry.defaultEndpoint
            };
          }
          return restored;
        }
      }
    } catch (e) {}
    const defaults = {};
    for (const entry of AI_PROVIDER_DIRECTORY) {
      defaults[entry.id] = { enabled: true, endpoint: entry.defaultEndpoint };
    }
    return defaults;
  }

  function persistSettings() {
    try {
      storage.setItem(AI_PROVIDER_SETTINGS_KEY, JSON.stringify({
        version: 1,
        providers: settings,
        updatedAt: now()
      }));
    } catch (e) {}
  }

  function persistKeyModes() {
    try {
      storage.setItem(AI_KEY_MODE_KEY, JSON.stringify(keyModes));
    } catch (e) {}
  }

  // ------------------------------------------------------------------
  // Keys
  // ------------------------------------------------------------------

  /** Sets the key for a provider in its configured storage mode. */
  function setKey(providerId, apiKey) {
    const entry = getProviderEntry(providerId);
    if (!entry) return { ok: false, error: `Unknown provider "${providerId}".` };
    const check = validateKeyFormat(apiKey);
    if (!check.ok) return { ok: false, error: check.error };
    const mode = keyModes[providerId] === 'persistent' ? 'persistent' : 'session';
    const store = mode === 'persistent' ? persistentKeys : sessionKeys;
    const stored = store.setKey(providerId, check.trimmed);
    if (!stored) return { ok: false, error: 'Key could not be stored (storage unavailable).' };
    return { ok: true, mode, maskedKey: maskKey(check.trimmed) };
  }

  /** Returns the raw key (transport use ONLY — never for display/logging). */
  function getRawKey(providerId) {
    const mode = keyModes[providerId] === 'persistent' ? 'persistent' : 'session';
    const store = mode === 'persistent' ? persistentKeys : sessionKeys;
    return store.getKey(providerId);
  }

  /** True when a key exists for the provider (without revealing it). */
  function hasKey(providerId) {
    return getRawKey(providerId) !== null && getRawKey(providerId) !== undefined;
  }

  function clearKey(providerId) {
    sessionKeys.clearKey(providerId);
    persistentKeys.clearKey(providerId);
    return true;
  }

  /**
   * Chooses where a provider's key lives. Switching to session-only clears
   * any persisted key immediately (the user asked for the safer mode).
   */
  function setKeyMode(providerId, mode) {
    if (!getProviderEntry(providerId)) return { ok: false, error: 'Unknown provider.' };
    if (mode !== 'session' && mode !== 'persistent') {
      return { ok: false, error: 'Key mode must be "session" or "persistent".' };
    }
    keyModes[providerId] = mode;
    persistKeyModes();
    if (mode === 'session') {
      persistentKeys.clearKey(providerId);
    }
    return { ok: true, mode };
  }

  function getKeyMode(providerId) {
    return keyModes[providerId] === 'persistent' ? 'persistent' : 'session';
  }

  // ------------------------------------------------------------------
  // Enable / endpoint
  // ------------------------------------------------------------------

  function setEnabled(providerId, enabled) {
    if (!settings[providerId]) return { ok: false, error: 'Unknown provider.' };
    settings[providerId].enabled = !!enabled;
    persistSettings();
    return { ok: true };
  }

  function setEndpoint(providerId, endpoint) {
    const entry = getProviderEntry(providerId);
    if (!entry) return { ok: false, error: 'Unknown provider.' };
    if (!entry.endpointEditable) {
      return { ok: false, error: `${entry.label} uses a fixed official endpoint.` };
    }
    if (typeof endpoint !== 'string' || !/^https:\/\/.+/i.test(endpoint.trim())) {
      return { ok: false, error: 'Endpoint must be an https:// URL.' };
    }
    settings[providerId].endpoint = endpoint.trim().replace(/\/+$/, '');
    persistSettings();
    return { ok: true, endpoint: settings[providerId].endpoint };
  }

  /** Provider status summary for the UI (never contains the raw key). */
  function getProviderStatus(providerId) {
    const entry = getProviderEntry(providerId);
    if (!entry) return null;
    const conf = settings[providerId] || { enabled: true, endpoint: entry.defaultEndpoint };
    return {
      id: entry.id,
      label: entry.label,
      description: entry.description,
      docsUrl: entry.docsUrl,
      keyHint: entry.keyHint || null,
      enabled: conf.enabled !== false,
      endpoint: conf.endpoint,
      endpointEditable: entry.endpointEditable,
      supportsModelDiscovery: entry.supportsModelDiscovery,
      keyMode: getKeyMode(providerId),
      hasKey: hasKey(providerId),
      maskedKey: hasKey(providerId) ? maskKey(getRawKey(providerId)) : ''
    };
  }

  function listProviderStatuses() {
    return AI_PROVIDER_DIRECTORY.map(p => getProviderStatus(p.id));
  }

  /**
   * Connection test — the ONLY intentional live request this service makes,
   * always on explicit user action. `transport.testConnection` is supplied by
   * the transports layer (injected, so tests bind mocks).
   */
  async function testConnection(providerId, { transport, modelId } = {}) {
    const status = getProviderStatus(providerId);
    if (!status) return { ok: false, errorCode: AI_ERROR_CODES.UNKNOWN, message: 'Unknown provider.' };
    if (!status.enabled) {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: `${status.label} is disabled — enable it first.` };
    }
    if (!status.hasKey) {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: `No API key set for ${status.label}.` };
    }
    if (typeof transport?.testConnection !== 'function') {
      return { ok: false, errorCode: AI_ERROR_CODES.UNKNOWN, message: 'Transport unavailable for this provider.' };
    }
    let result;
    try {
      result = await transport.testConnection({
        endpoint: status.endpoint,
        apiKey: getRawKey(providerId),
        modelId: modelId || null
      });
    } catch (err) {
      return { ok: false, errorCode: AI_ERROR_CODES.NETWORK_ERROR, message: `Connection test failed: ${err?.message || 'error'}` };
    }
    if (result.ok) {
      return { ok: true, providerId, latencyMs: result.latencyMs ?? null, modelId: result.modelId ?? null, message: `CONNECTED — ${status.label} responded.` };
    }
    // Transport already returns taxonomy-normalized failures.
    return { ok: false, providerId, errorCode: result.errorCode || AI_ERROR_CODES.UNKNOWN, message: result.message || 'Connection test failed.' };
  }

  return {
    listProviderStatuses,
    getProviderStatus,
    setKey,
    clearKey,
    hasKey,
    getRawKey,
    setKeyMode,
    getKeyMode,
    setEnabled,
    setEndpoint,
    testConnection,
    maskKey,
    validateKeyFormat
  };
}

/** Maps an HTTP-ish transport failure into the stable taxonomy (shared). */
export function mapHttpStatus(status) {
  return statusCodeToError(status);
}
