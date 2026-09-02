/**
 * Architecture Helping Hand - Project Document Model
 * Stabilization 2: a pure, deterministic, serializable project envelope.
 *
 * This is the future shared state for Rooms / Walls / Openings / Furniture /
 * Survey / snapshots / decisions / exports. It is deliberately SMALL: only
 * structures with a current consumer are modeled in depth; the rest exist as
 * reserved-but-empty containers so the envelope is stable across migrations.
 *
 * Rules (enforced by tests/core contracts):
 *  - No DOM. No localStorage. No timers. Pure data in → data out.
 *  - Deterministic: createProject() with no seed produces identical output
 *    for identical inputs; ids are random only when no id is supplied.
 *  - Unknown fields are PRESERVED on normalize so future migrations can
 *    recover data this version does not understand.
 *  - Malformed documents are rejected by validateProject with a precise
 *    error path, never silently "repaired" into plausible-looking garbage.
 */

/**
 * Current schema version of the project document.
 * Bump when the envelope changes, and add a migration in
 * src/core/project-migrations.js (Stabilization 3).
 */
export const PROJECT_SCHEMA_VERSION = 1;

/** Storage envelope key for the versioned project store. */
export const PROJECT_STORE_KEY = 'archiscale_project_store';

/** Legacy per-feature keys (read-only here; migration is non-destructive). */
export const LEGACY_STORAGE_KEYS = Object.freeze({
  workspace: 'archiscale_dimension_workspace',
  chains: 'archiscale_dimension_chains',
  cadClipboard: 'archiscale_cad_clipboard_settings',
  cadHandoff: 'archiscale_cad_handoff_prefs',
  batchCad: 'archi_batch_cad_state',
  quickDimension: 'archiscale_quick_dimension_prefs',
  history: 'archiscale_calculation_history',
  multiscaleFavorites: 'archiscale_multiscale_favs',
  theme: 'archi_theme',
  sound: 'archiscale_sound_enabled'
});

const METADATA_FIELDS = ['name', 'description', 'author', 'createdBy'];

/**
 * Creates a new empty project document.
 * @param {Object} [options]
 * @param {string} [options.id] - Optional stable id (generated when omitted)
 * @param {string} [options.name] - Project name
 * @param {string} [options.description]
 * @param {string} [options.author]
 * @param {Object} [options.site] - Site descriptor { location, notes, areaM2 }
 * @returns {Object} A fresh project document (schemaVersion 1)
 */
export function createProject(options = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: typeof options.id === 'string' && options.id ? options.id : generateProjectId(),
    metadata: {
      name: typeof options.name === 'string' ? options.name : 'Untitled Project',
      description: typeof options.description === 'string' ? options.description : '',
      author: typeof options.author === 'string' ? options.author : '',
      createdAt: now,
      updatedAt: now
    },
    site: normalizeSite(options.site),
    // Project data containers (reserved for upcoming phases)
    dimensions: [],
    chains: [],
    notes: [],
    snapshots: [],
    decisions: [],
    exports: []
  };
}

/**
 * Generates a project id. Deterministic tests pass their own ids; runtime
 * ids combine a timestamp with random suffix for practical uniqueness.
 */
export function generateProjectId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `proj-${Date.now().toString(36)}-${rand}`;
}

function normalizeSite(site) {
  const s = site && typeof site === 'object' ? site : {};
  return {
    location: typeof s.location === 'string' ? s.location : '',
    notes: typeof s.notes === 'string' ? s.notes : '',
    areaM2: typeof s.areaM2 === 'number' && isFinite(s.areaM2) && s.areaM2 > 0 ? s.areaM2 : null
  };
}

/**
 * Validates a project document.
 * @param {*} doc - Candidate document
 * @returns {{ ok: boolean, errors: string[] }} Empty errors == valid
 */
export function validateProject(doc) {
  const errors = [];

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, errors: ['Project document must be an object'] };
  }

  if (!Number.isInteger(doc.schemaVersion) || doc.schemaVersion < 1) {
    errors.push('schemaVersion must be a positive integer');
  }

  if (typeof doc.id !== 'string' || !doc.id) {
    errors.push('id must be a non-empty string');
  }

  if (!doc.metadata || typeof doc.metadata !== 'object' || Array.isArray(doc.metadata)) {
    errors.push('metadata must be an object');
  } else {
    if (typeof doc.metadata.name !== 'string') {
      errors.push('metadata.name must be a string');
    }
    if (doc.metadata.createdAt !== undefined && typeof doc.metadata.createdAt !== 'string') {
      errors.push('metadata.createdAt must be a string when present');
    }
    if (doc.metadata.updatedAt !== undefined && typeof doc.metadata.updatedAt !== 'string') {
      errors.push('metadata.updatedAt must be a string when present');
    }
  }

  if (doc.site !== undefined && (doc.site === null || typeof doc.site !== 'object' || Array.isArray(doc.site))) {
    errors.push('site must be an object when present');
  }

  for (const key of ['dimensions', 'chains', 'notes', 'snapshots', 'decisions', 'exports']) {
    if (doc[key] !== undefined && !Array.isArray(doc[key])) {
      errors.push(`${key} must be an array when present`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Normalizes a project document to the current schema shape:
 *  - fills missing containers with empty defaults
 *  - preserves ALL unknown fields (future migration safety)
 *  - normalizes metadata/site field types without dropping data
 *
 * Note: does NOT validate; call validateProject first when the input's
 * trustworthiness is unknown. Normalizing garbage still yields garbage
 * (deterministically).
 *
 * @param {Object} doc - Parsed document (from deserializeProject or createProject)
 * @returns {Object} Normalized document
 */
export function normalizeProject(doc) {
  const src = doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
  const normalized = { ...src };

  normalized.schemaVersion = PROJECT_SCHEMA_VERSION;
  normalized.id = typeof src.id === 'string' && src.id ? src.id : generateProjectId();

  const metaSrc = src.metadata && typeof src.metadata === 'object' ? src.metadata : {};
  const metadata = { ...metaSrc };
  for (const field of METADATA_FIELDS) {
    if (metadata[field] !== undefined && typeof metadata[field] !== 'string') {
      metadata[field] = String(metadata[field]);
    }
  }
  if (typeof metadata.name !== 'string' || !metadata.name) metadata.name = 'Untitled Project';
  normalized.metadata = metadata;

  normalized.site = normalizeSite(src.site);

  for (const key of ['dimensions', 'chains', 'notes', 'snapshots', 'decisions', 'exports']) {
    if (!Array.isArray(normalized[key])) normalized[key] = [];
  }

  return normalized;
}

/**
 * Deep-clones a project document via structured clone semantics with a
 * JSON fallback (keeps the module browser- and Node-safe).
 * @param {Object} doc - Project document
 * @returns {Object} Independent clone
 */
export function cloneProject(doc) {
  if (typeof structuredClone === 'function') {
    return structuredClone(doc);
  }
  return JSON.parse(JSON.stringify(doc));
}

/**
 * Touches the document's updatedAt timestamp and returns a new document
 * (immutable style: the input is not mutated).
 * @param {Object} doc
 * @param {Date|string} [when] - Defaults to now
 */
export function touchProject(doc, when) {
  const next = cloneProject(doc);
  next.metadata = { ...next.metadata, updatedAt: (when ? new Date(when) : new Date()).toISOString() };
  return next;
}

/**
 * Serializes a project document to a pretty-printed JSON string.
 * @param {Object} doc - Validated/normalized project document
 * @returns {string}
 */
export function serializeProject(doc) {
  return JSON.stringify(doc, null, 2);
}

/**
 * Deserializes a JSON string into a candidate project document.
 * Throws a controlled Error for unparseable input (callers decide policy).
 * @param {string} json
 * @returns {Object} Parsed document (validate before trusting)
 */
export function deserializeProject(json) {
  if (typeof json !== 'string' || !json.trim()) {
    throw new Error('deserializeProject requires a non-empty JSON string');
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Project document is not valid JSON: ${e.message}`);
  }
  return parsed;
}

/**
 * Convenience: deserialize + validate in one step.
 * @param {string} json
 * @returns {{ ok: boolean, errors?: string[], doc?: Object }}
 */
export function parseProject(json) {
  let doc;
  try {
    doc = deserializeProject(json);
  } catch (e) {
    return { ok: false, errors: [e.message] };
  }
  const check = validateProject(doc);
  if (!check.ok) return { ok: false, errors: check.errors };
  return { ok: true, doc: normalizeProject(doc) };
}
