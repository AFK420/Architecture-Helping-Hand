/**
 * Architecture Helping Hand - Versioned Project Store
 * Stabilization 3+4: project persistence with schema versioning, a
 * non-destructive migration chain, malformed-data recovery, and a tiny
 * pub/sub notification surface for the UI.
 *
 * Design:
 *  - PROJECT DATA lives under one envelope key (archiscale_project_store):
 *      { version, project }
 *  - USER PREFERENCES stay in their existing per-feature keys — the store
 *    never touches them.
 *  - Migrations are pure functions v(N) -> v(N+1) registered in MIGRATIONS.
 *    A stored version newer than the app understands fails LOUDLY (no
 *    silent downgrade that could lose data written by a newer app).
 *  - Legacy per-feature keys are read-only here: importLegacy* helpers
 *    COPY data into the project document without deleting the originals.
 *  - All storage access goes through an injected storage adapter (defaults
 *    to the existing StorageService), keeping the module testable headless.
 */

import {
  PROJECT_SCHEMA_VERSION,
  PROJECT_STORE_KEY,
  createProject,
  validateProject,
  normalizeProject,
  cloneProject,
  touchProject
} from '../core/project.js';

/**
 * Migration chain: each entry upgrades a document from its index+1 to the
 * next version. Register future migrations here, e.g. MIGRATIONS[1] = v2->v3.
 * An empty chain means version 1 is current.
 */
export const MIGRATIONS = Object.freeze([]);

/** Highest version this build understands. */
export const CURRENT_STORE_VERSION = PROJECT_SCHEMA_VERSION + MIGRATIONS.length;

/**
 * Runs the migration chain on a raw store envelope.
 * @param {{ version: number, project: Object }} envelope
 * @returns {{ version: number, project: Object }}
 */
export function migrateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Cannot migrate: store envelope must be an object');
  }
  if (!Number.isInteger(envelope.version) || envelope.version < 1) {
    throw new Error('Cannot migrate: envelope.version must be a positive integer');
  }
  if (envelope.version > CURRENT_STORE_VERSION) {
    throw new Error(
      `Stored project version ${envelope.version} is newer than this app understands (${CURRENT_STORE_VERSION}). ` +
      'Refusing to open it to avoid data loss. Please update the application.'
    );
  }

  let version = envelope.version;
  let project = envelope.project;

  while (version < CURRENT_STORE_VERSION) {
    const migrate = MIGRATIONS[version - 1];
    if (typeof migrate !== 'function') {
      throw new Error(`Missing migration from version ${version} to ${version + 1}`);
    }
    project = migrate(project);
    version += 1;
  }

  return { version, project };
}

/**
 * Creates a project store bound to a storage adapter.
 *
 * @param {Object} [options]
 * @param {Object} [options.storage] - { getItem(key), setItem(key, value) }
 *   adapter; defaults to the app StorageService-like surface via injection.
 * @param {Function} [options.generateId] - id generator override (tests)
 * @param {Function} [options.now] - clock override (tests)
 */
export function createProjectStore(options = {}) {
  const storage = options.storage;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('createProjectStore requires a storage adapter with getItem/setItem');
  }

  let currentProject = null;
  const subscribers = new Set();
  const genId = options.generateId;
  const nowFn = options.now || (() => new Date());

  function makeProject(opts = {}) {
    if (typeof genId === 'function') {
      const p = createProject(opts);
      p.id = genId();
      return p;
    }
    return createProject(opts);
  }

  // ------------------------------------------------------------------
  // Pub/Sub (tiny, synchronous)
  // ------------------------------------------------------------------
  function subscribe(fn) {
    if (typeof fn !== 'function') {
      throw new Error('subscribe requires a callback function');
    }
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  function notify(reason, project) {
    for (const fn of subscribers) {
      try {
        fn(reason, project);
      } catch (e) {
        // A faulty subscriber must never break the store
      }
    }
  }

  // ------------------------------------------------------------------
  // Raw envelope I/O
  // ------------------------------------------------------------------
  function readEnvelope() {
    let raw;
    try {
      raw = storage.getItem(PROJECT_STORE_KEY);
    } catch (e) {
      return { ok: false, errors: ['storage unavailable'] };
    }
    if (!raw) return { ok: true, envelope: null };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { ok: false, errors: [`store envelope is not valid JSON: ${e.message}`] };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, errors: ['store envelope must be an object'] };
    }
    if (!Number.isInteger(parsed.version) || parsed.version < 1) {
      return { ok: false, errors: ['store envelope.version must be a positive integer'] };
    }
    return { ok: true, envelope: parsed };
  }

  function writeEnvelope(envelope) {
    try {
      storage.setItem(PROJECT_STORE_KEY, JSON.stringify(envelope));
      return true;
    } catch (e) {
      // Quota failures and private-mode write errors surface to the caller
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Loads the persisted project (with migration). Returns a status object;
   * never throws for malformed persisted data — the caller decides whether
   * to start fresh or surface an error.
   */
  function loadProject() {
    const res = readEnvelope();
    if (!res.ok) {
      return { ok: false, errors: res.errors, project: null };
    }
    if (!res.envelope) {
      return { ok: true, project: null, fresh: true };
    }

    try {
      const migrated = migrateEnvelope(res.envelope);
      const check = validateProject(migrated.project);
      if (!check.ok) {
        return { ok: false, errors: check.errors, project: null };
      }
      currentProject = normalizeProject(migrated.project);
      notify('load', currentProject);
      return { ok: true, project: currentProject, migratedFrom: res.envelope.version };
    } catch (e) {
      return { ok: false, errors: [e.message], project: null };
    }
  }

  /**
   * Returns the in-memory current project (creating one if none exists).
   */
  function getProject(opts = {}) {
    if (!currentProject) {
      const created = makeProject(opts);
      currentProject = created;
      notify('create', currentProject);
    }
    return currentProject;
  }

  /**
   * Replaces the current project and persists it.
   */
  function setProject(doc) {
    const check = validateProject(doc);
    if (!check.ok) {
      return { ok: false, errors: check.errors };
    }
    currentProject = normalizeProject(doc);
    const saved = saveProject();
    if (!saved.ok) return saved;
    notify('set', currentProject);
    return { ok: true, project: currentProject };
  }

  /**
   * Applies a mutation to the current project (immutable style: the mutation
   * receives a clone and returns the next state), then persists.
   */
  function updateProject(mutator) {
    if (typeof mutator !== 'function') {
      return { ok: false, errors: ['updateProject requires a mutator function'] };
    }
    const base = getProject();
    const draft = cloneProject(base);
    let next;
    try {
      next = mutator(draft);
    } catch (e) {
      return { ok: false, errors: [`mutator failed: ${e.message}`] };
    }
    if (!next || typeof next !== 'object') {
      return { ok: false, errors: ['mutator must return the next project document'] };
    }
    const stamped = touchProject(next, nowFn());
    const check = validateProject(stamped);
    if (!check.ok) {
      return { ok: false, errors: check.errors };
    }
    currentProject = normalizeProject(stamped);
    const saved = saveProject();
    if (!saved.ok) return saved;
    notify('update', currentProject);
    return { ok: true, project: currentProject };
  }

  /**
   * Persists the current project under the versioned envelope.
   */
  function saveProject() {
    if (!currentProject) {
      return { ok: false, errors: ['no project to save'] };
    }
    const check = validateProject(currentProject);
    if (!check.ok) {
      return { ok: false, errors: check.errors };
    }
    const envelope = {
      version: CURRENT_STORE_VERSION,
      project: currentProject
    };
    if (!writeEnvelope(envelope)) {
      return { ok: false, errors: ['storage write failed (quota or unavailable)'] };
    }
    return { ok: true };
  }

  /**
   * Starts a brand-new project (replaces in-memory current; does NOT save
   * until the caller calls saveProject/updateProject explicitly).
   */
  function createNewProject(opts = {}) {
    currentProject = makeProject(opts);
    notify('create', currentProject);
    return currentProject;
  }

  /**
   * Non-destructive legacy import: copies supported legacy payloads into the
   * current project document without deleting the original keys.
   * @param {Object} legacy - { workspace?, chains? } raw parsed payloads
   * @returns {{ ok: boolean, imported: string[], errors: string[] }}
   */
  function importLegacy(legacy) {
    const imported = [];
    const errors = [];
    const src = legacy && typeof legacy === 'object' ? legacy : {};

    if (Array.isArray(src.workspace?.entries)) {
      updateProject(draft => {
        draft.dimensions = src.workspace.entries.map(e => ({
          legacyId: e.id || null,
          name: e.name || 'Dimension',
          rawInput: e.rawInput || '',
          dimensionType: e.dimensionType || 'segment',
          notes: e.notes || ''
        }));
        return draft;
      });
      imported.push('workspace');
    } else if (src.workspace !== undefined) {
      errors.push('workspace payload does not contain an entries array');
    }

    if (src.chains && Array.isArray(src.chains.segments)) {
      updateProject(draft => {
        draft.chains = [{
          name: src.chains.name || 'Imported Chain',
          defaultUnit: src.chains.defaultUnit || 'mm',
          scaleRatio: src.chains.scaleRatio || 50,
          segments: src.chains.segments
        }];
        return draft;
      });
      imported.push('chains');
    } else if (src.chains !== undefined) {
      errors.push('chains payload does not contain a segments array');
    }

    return { ok: errors.length === 0, imported, errors };
  }

  /**
   * Clears the in-memory project (does not delete persisted data).
   */
  function reset() {
    currentProject = null;
  }

  return {
    subscribe,
    loadProject,
    getProject,
    setProject,
    updateProject,
    saveProject,
    createNewProject,
    importLegacy,
    reset,
    get CURRENT_VERSION() { return CURRENT_STORE_VERSION; }
  };
}
