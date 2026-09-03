/**
 * Architecture Helping Hand - AI Model Catalog (Phase 15, M2)
 * Per-provider model registries with three origins:
 *
 *   DISCOVERED  — from the provider's list API (provider truth)
 *   MANUAL      — user-declared model id ("I know this model exists");
 *                 capabilities are USER DECLARED and marked for verification
 *   RETIRED     — a previously selected model that no longer resolves;
 *                 never auto-deleted (assignments must show why they fail)
 *
 * Rules:
 *  - Capabilities belong to the MODEL, never inferred from the provider.
 *  - Provider discovery can UPGRADE a manual model's capability claims
 *    (provider truth overrides user declaration) and flips the origin tag.
 *  - The catalog NEVER stores API keys and is persisted separately from
 *    provider keys.
 *  - No automatic pruning: discovery merges (upsert); manual entries the
 *    user deletes are the only removals.
 */

import { AI_CAPABILITIES } from '../../ai/providers/provider.js';

/** Persistent storage key for the model catalog (NO keys inside). */
export const AI_MODEL_CATALOG_KEY = 'archiscale_ai_model_catalog';

/** Seed metadata: documented models per provider at implementation time.
 *  These are convenience entries, NOT a permanent list — discovery and manual
 *  entry keep the catalog current without app updates. Capabilities here are
 *  the provider-documented minimums; they are refined by discovery. */
const SEED_MODELS = {
  gemini: [
    {
      modelId: 'gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash',
      capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: true, imageGen: false, contextWindow: 1048576 }
    }
  ],
  glm: [
    {
      modelId: 'glm-4.5-flash',
      displayName: 'GLM-4.5-Flash',
      capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: false, imageGen: false, contextWindow: 128000 }
    }
  ],
  deepseek: [
    {
      modelId: 'deepseek-v4-flash',
      displayName: 'DeepSeek V4 Flash',
      capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: false, imageGen: false, contextWindow: 128000 }
    },
    {
      modelId: 'deepseek-v4-flash-vision-exp',
      displayName: 'DeepSeek V4 Flash Vision (exp)',
      capabilities: { text: true, reasoning: true, structuredOutput: true, toolCalling: true, vision: true, imageGen: false, contextWindow: 128000 }
    }
  ]
};

/** Normalizes a capability object to the canonical key set (missing = false). */
export function normalizeCapabilities(caps) {
  const out = {};
  for (const key of AI_CAPABILITIES) {
    if (key === 'contextLimit') {
      // Transports report `contextWindow`; the canonical key is contextLimit.
      const raw = caps?.[key] !== undefined ? caps?.[key] : caps?.contextWindow;
      out[key] = typeof raw === 'number' && isFinite(raw) && raw > 0 ? raw : null;
    } else {
      out[key] = !!caps?.[key];
    }
  }
  return out;
}

/** Creates an empty catalog bound to a storage adapter. */
export function createModelCatalog({ storage, now = () => new Date().toISOString() } = {}) {
  // providerId → { modelId → modelEntry }
  let catalog = load();

  function load() {
    try {
      const raw = storage?.getItem(AI_MODEL_CATALOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.providers) {
          return sanitize(parsed.providers);
        }
      }
    } catch (e) {}
    return seed();
  }

  function seed() {
    const providers = {};
    for (const [pid, models] of Object.entries(SEED_MODELS)) {
      providers[pid] = {};
      for (const m of models) {
        providers[pid][m.modelId] = {
          modelId: m.modelId,
          displayName: m.displayName,
          capabilities: normalizeCapabilities(m.capabilities),
          status: 'READY',
          origin: 'seed',
          verification: 'PROVIDER DOCUMENTED',
          addedAt: now(),
          updatedAt: now(),
          metadata: {}
        };
      }
    }
    return providers;
  }

  /** Restores only structurally sane entries (imported storage may be old). */
  function sanitize(providers) {
    const out = {};
    for (const [pid, models] of Object.entries(providers)) {
      if (!models || typeof models !== 'object') continue;
      out[pid] = {};
      for (const [mid, entry] of Object.entries(models)) {
        if (!entry || typeof entry !== 'object' || typeof entry.modelId !== 'string') continue;
        out[pid][mid] = {
          modelId: mid,
          displayName: typeof entry.displayName === 'string' ? entry.displayName : mid,
          capabilities: normalizeCapabilities(entry.capabilities),
          status: ['READY', 'UNAVAILABLE', 'RETIRED', 'UNKNOWN'].includes(entry.status) ? entry.status : 'UNKNOWN',
          origin: ['seed', 'discovery', 'manual'].includes(entry.origin) ? entry.origin : 'manual',
          verification: typeof entry.verification === 'string' ? entry.verification : 'UNVERIFIED',
          addedAt: entry.addedAt || now(),
          updatedAt: entry.updatedAt || now(),
          metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
        };
      }
    }
    return out;
  }

  function persist() {
    try {
      storage?.setItem(AI_MODEL_CATALOG_KEY, JSON.stringify({
        version: 1,
        providers: catalog,
        updatedAt: now()
      }));
    } catch (e) {}
  }

  /** All entries for a provider (ordered by displayName). */
  function listModels(providerId) {
    const models = catalog[providerId] || {};
    return Object.values(models)
      .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
  }

  /** One entry or null. */
  function getModel(providerId, modelId) {
    return catalog[providerId]?.[modelId] || null;
  }

  /**
   * Upserts a model entry (discovery/manual/seed share this path).
   * Provider truth (discovery) refreshes capabilities; manual claims are
   * preserved until a discovery confirms or corrects them.
   */
  function upsertModel(providerId, entry) {
    if (!catalog[providerId]) catalog[providerId] = {};
    const existing = catalog[providerId][entry.modelId];
    const merged = {
      modelId: entry.modelId,
      displayName: entry.displayName || existing?.displayName || entry.modelId,
      capabilities: normalizeCapabilities(entry.capabilities || existing?.capabilities),
      status: entry.status || existing?.status || 'READY',
      origin: entry.origin || existing?.origin || 'manual',
      verification: entry.verification || existing?.verification || 'UNVERIFIED',
      addedAt: existing?.addedAt || entry.addedAt || now(),
      updatedAt: now(),
      metadata: { ...(existing?.metadata || {}), ...(entry.metadata || {}) }
    };
    catalog[providerId][entry.modelId] = merged;
    persist();
    return merged;
  }

  /**
   * Manual model entry: "I know this model exists". Capabilities are exactly
   * what the user declared — never invented, never defaulted to true.
   */
  function addManualModel(providerId, { modelId, displayName, capabilities }) {
    if (typeof modelId !== 'string' || !modelId.trim()) {
      return { ok: false, error: 'Model ID is required.' };
    }
    const id = modelId.trim();
    if (/[\r\n]/.test(id)) return { ok: false, error: 'Model ID must be a single line.' };
    const entry = upsertModel(providerId, {
      modelId: id,
      displayName: (displayName || '').trim() || id,
      capabilities: normalizeCapabilities(capabilities || {}),
      status: 'READY',
      origin: 'manual',
      verification: 'USER DECLARED — NEEDS VERIFICATION'
    });
    return { ok: true, model: entry };
  }

  /** User-initiated removal (the only deletion path). */
  function removeModel(providerId, modelId) {
    if (catalog[providerId]?.[modelId]) {
      delete catalog[providerId][modelId];
      persist();
      return { ok: true };
    }
    return { ok: false, error: 'Model not found in the catalog.' };
  }

  /**
   * Merges a discovery result batch for one provider. Discovery:
   *  - upserts new DISCOVERED entries (PROVIDER DOCUMENTED verification)
   *  - upgrades existing entries' capabilities with provider truth
   *  - flips manual entries it confirms to origin 'discovery'
   *  - NEVER deletes: models absent from a discovery pass keep their status
   *    (an empty list is a discovery failure, not a retirement signal)
   */
  function mergeDiscovery(providerId, models) {
    const list = Array.isArray(models) ? models : [];
    let added = 0;
    let updated = 0;
    for (const m of list) {
      if (!m || typeof m.modelId !== 'string' || !m.modelId) continue;
      const existing = catalog[providerId]?.[m.modelId];
      upsertModel(providerId, {
        modelId: m.modelId,
        displayName: m.displayName || m.modelId,
        capabilities: m.capabilities || existing?.capabilities,
        status: existing?.status === 'RETIRED' ? 'READY' : (existing?.status === 'UNAVAILABLE' ? existing.status : 'READY'),
        origin: 'discovery',
        verification: 'PROVIDER DOCUMENTED',
        metadata: m.metadata || {}
      });
      if (existing) updated++; else added++;
    }
    return { ok: true, added, updated, total: listModels(providerId).length };
  }

  /**
   * Marks a model retired (selected model no longer resolves on the
   * provider). Retirement is visible, never silent.
   */
  function markRetired(providerId, modelId) {
    const existing = catalog[providerId]?.[modelId];
    if (!existing) return { ok: false, error: 'Model not found.' };
    upsertModel(providerId, { modelId, status: 'RETIRED', verification: existing.verification });
    return { ok: true };
  }

  /** Marks a model unavailable (e.g. discovery/auth problems at use time). */
  function markUnavailable(providerId, modelId) {
    const existing = catalog[providerId]?.[modelId];
    if (!existing) return { ok: false, error: 'Model not found.' };
    upsertModel(providerId, { modelId, status: 'UNAVAILABLE' });
    return { ok: true };
  }

  /** Sets a user override on the context window (some APIs don't report it). */
  function setContextWindow(providerId, modelId, tokens) {
    const value = typeof tokens === 'number' && isFinite(tokens) && tokens > 0 ? Math.floor(tokens) : null;
    upsertModel(providerId, { modelId });
    catalog[providerId][modelId].capabilities.contextLimit = value;
    persist();
    return { ok: true, contextLimit: value };
  }

  /**
   * Catalog filter query for the Control Center browser.
   * @param {Object} q - { providerId?, search?, capabilities?: { vision, toolCalling, structuredOutput, imageGen } }
   */
  function queryModels(q = {}) {
    const providerIds = q.providerId ? [q.providerId] : Object.keys(catalog);
    let results = [];
    for (const pid of providerIds) {
      for (const entry of listModels(pid)) {
        results.push({ providerId: pid, ...entry });
      }
    }
    if (q.search && typeof q.search === 'string') {
      const needle = q.search.trim().toLowerCase();
      if (needle) {
        results = results.filter(m =>
          m.modelId.toLowerCase().includes(needle) ||
          String(m.displayName).toLowerCase().includes(needle));
      }
    }
    if (q.capabilities) {
      for (const [cap, needed] of Object.entries(q.capabilities)) {
        if (needed) results = results.filter(m => !!m.capabilities[cap]);
      }
    }
    return results;
  }

  function clearAll() {
    catalog = seed();
    persist();
  }

  return {
    listModels,
    getModel,
    upsertModel,
    addManualModel,
    removeModel,
    mergeDiscovery,
    markRetired,
    markUnavailable,
    setContextWindow,
    queryModels,
    clearAll
  };
}
