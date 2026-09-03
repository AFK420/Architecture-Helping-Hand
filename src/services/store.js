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
  PROJECT_LIBRARY_KEY,
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

  // ------------------------------------------------------------------
  // Multi-project library (Phase 2: Project Workspace)
  // Stored under a separate key: { version, projects: { id: projectDoc } }
  // The active project stays in the single-project envelope for backward
  // compatibility with existing persistence.
  // ------------------------------------------------------------------

  function readLibrary() {
    let raw;
    try {
      raw = storage.getItem(PROJECT_LIBRARY_KEY);
    } catch (e) {
      return { ok: false, errors: ['storage unavailable'], library: null };
    }
    if (!raw) return { ok: true, library: { version: CURRENT_STORE_VERSION, projects: {} } };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { ok: false, errors: ['project library is not valid JSON'], library: null };
    }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.projects !== 'object' || parsed.projects === null) {
      return { ok: false, errors: ['project library envelope malformed'], library: null };
    }
    // Same future-version contract as the active envelope: a library written
    // by a newer app must be refused loudly, never silently downgraded
    // (individual project documents carry their own schemaVersion; the
    // envelope version tracks the library container format).
    if (parsed.version !== undefined && (!Number.isInteger(parsed.version) || parsed.version > CURRENT_STORE_VERSION)) {
      return {
        ok: false,
        errors: [
          `Project library version ${parsed.version} is newer than this app understands (${CURRENT_STORE_VERSION}). ` +
          'Refusing to open it to avoid data loss. Please update the application.'
        ],
        library: null
      };
    }
    return { ok: true, library: parsed };
  }

  function writeLibrary(library) {
    try {
      storage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify({ ...library, version: CURRENT_STORE_VERSION }));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Lists saved project summaries (id, name, updatedAt) — newest first.
   * Corrupted entries are skipped and reported, never thrown.
   */
  function listProjects() {
    const res = readLibrary();
    if (!res.ok) return { ok: false, errors: res.errors, projects: [] };
    const summaries = [];
    for (const [id, doc] of Object.entries(res.library.projects)) {
      try {
        const check = validateProject(doc);
        if (!check.ok) continue;
        summaries.push({
          id,
          name: doc.metadata?.name || 'Untitled Project',
          updatedAt: doc.metadata?.updatedAt || doc.metadata?.createdAt || '',
          createdAt: doc.metadata?.createdAt || ''
        });
      } catch (e) { /* skip corrupted */ }
    }
    summaries.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return { ok: true, projects: summaries };
  }

  /**
   * Saves (upserts) the current project into the library under its id.
   */
  function saveProjectToLibrary() {
    if (!currentProject) return { ok: false, errors: ['no project to save'] };
    const check = validateProject(currentProject);
    if (!check.ok) return { ok: false, errors: check.errors };
    const res = readLibrary();
    if (!res.ok) return { ok: false, errors: res.errors };
    res.library.projects[currentProject.id] = currentProject;
    if (!writeLibrary(res.library)) {
      return { ok: false, errors: ['storage write failed (quota or unavailable)'] };
    }
    notify('library-save', currentProject);
    return { ok: true, id: currentProject.id };
  }

  /**
   * Loads a project from the library by id (replaces in-memory current).
   */
  function loadProjectFromLibrary(id) {
    if (typeof id !== 'string' || !id) {
      return { ok: false, errors: ['loadProjectFromLibrary requires a project id'] };
    }
    const res = readLibrary();
    if (!res.ok) return { ok: false, errors: res.errors };
    const doc = res.library.projects[id];
    if (!doc) return { ok: false, errors: [`project "${id}" not found in library`] };
    // Future individual documents are refused loudly (same contract as the
    // active envelope) — never silently normalized down to the current schema.
    if (Number.isInteger(doc.schemaVersion) && doc.schemaVersion > PROJECT_SCHEMA_VERSION) {
      return {
        ok: false,
        errors: [
          `Library project "${id}" has schema version ${doc.schemaVersion}, newer than this app understands (${PROJECT_SCHEMA_VERSION}). ` +
          'Refusing to open it to avoid data loss. Please update the application.'
        ]
      };
    }
    const check = validateProject(doc);
    if (!check.ok) return { ok: false, errors: check.errors };
    currentProject = normalizeProject(doc);
    notify('open', currentProject);
    return { ok: true, project: currentProject };
  }

  /**
   * Deletes a project from the library. The ACTIVE project envelope is
   * untouched — deleting a library copy never destroys the open document.
   */
  function deleteProject(id) {
    const res = readLibrary();
    if (!res.ok) return { ok: false, errors: res.errors };
    if (!res.library.projects[id]) {
      return { ok: false, errors: [`project "${id}" not found in library`] };
    }
    delete res.library.projects[id];
    if (!writeLibrary(res.library)) {
      return { ok: false, errors: ['storage write failed (quota or unavailable)'] };
    }
    notify('delete', { id });
    return { ok: true };
  }

  /**
   * Creates a structured snapshot of the current project inside its own
   * snapshots container (structured copy — no branching/merge machinery).
   *
   * Semantics: the snapshot's embedded copy is taken AFTER the snapshot is
   * registered in the container, so restoring any snapshot always yields a
   * project that still contains that snapshot (restores never delete the
   * snapshot being restored, nor any earlier ones).
   */
  /**
   * Strips the embedded payloads of PRIOR snapshots from a project copy.
   * Snapshot N embeds the whole document as it was at time N — if that
   * document still contains snapshots 1..N-1 WITH their payloads, storage
   * grows O(n²) and blows the localStorage quota around snapshot 9-10 on
   * a real project. Payload-stripping prior snapshots inside the embedded
   * copy keeps every snapshot O(document size): restore re-attaches the
   * payloads from the LIVE snapshot container (ids are stable, the live
   * container always outlives any restore — see restoreSnapshot).
   */
  function stripEmbeddedSnapshotPayloads(projectCopy) {
    if (projectCopy && Array.isArray(projectCopy.snapshots)) {
      projectCopy.snapshots = projectCopy.snapshots.map(s =>
        s && typeof s === 'object' ? { ...s, project: null } : s
      );
    }
    return projectCopy;
  }

  function createSnapshot(label) {
    if (!currentProject) return { ok: false, errors: ['no project to snapshot'] };
    const snapshot = {
      id: `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label: typeof label === 'string' && label ? label : `Snapshot ${currentProject.snapshots.length + 1}`,
      createdAt: nowFn().toISOString(),
      project: null
    };
    // Phase 1: register the (copy- pending) snapshot in the current doc
    const registered = updateProject(draft => {
      draft.snapshots.push(snapshot);
      return draft;
    });
    if (!registered.ok) return registered;
    // Phase 2: embed a copy of the doc that now CONTAINS this snapshot.
    // Prior snapshots' payloads are stripped inside the embedded copy to
    // keep the container linear in document size (see helper above).
    const embedded = stripEmbeddedSnapshotPayloads(cloneProject(currentProject));
    currentProject.snapshots = currentProject.snapshots.map(s =>
      s.id === snapshot.id ? { ...s, project: embedded } : s
    );
    const saved = saveProject();
    if (!saved.ok) return saved;
    notify('snapshot', currentProject);
    return { ok: true, snapshotId: snapshot.id, snapshot: cloneProject(currentProject.snapshots.find(s => s.id === snapshot.id)) };
  }

  /**
   * Restores a snapshot: replaces the current project with the snapshot's
   * stored copy (a structured copy — the snapshot itself is preserved).
   *
   * The embedded copy carries prior snapshots with STRIPPED payloads
   * (storage-size contract). The live container still holds every payload
   * for snapshots that existed when the snapshot was taken; re-attach
   * those payloads by id so a restore never loses a snapshot's payload.
   * Payloads for snapshots created AFTER the embedded point are, and must
   * be, absent from the restored state — they did not exist then.
   */
  function restoreSnapshot(snapshotId) {
    if (!currentProject) return { ok: false, errors: ['no project open'] };
    const snap = currentProject.snapshots.find(s => s.id === snapshotId);
    if (!snap || !snap.project) return { ok: false, errors: [`snapshot "${snapshotId}" not found`] };
    const check = validateProject(snap.project);
    if (!check.ok) return { ok: false, errors: check.errors };
    const restored = normalizeProject(cloneProject(snap.project));
    if (Array.isArray(restored.snapshots)) {
      const payloadById = new Map(
        currentProject.snapshots
          .filter(s => s && s.project)
          .map(s => [s.id, s.project])
      );
      restored.snapshots = restored.snapshots.map(s =>
        s && typeof s === 'object' && !s.project && payloadById.has(s.id)
          ? { ...s, project: cloneProject(payloadById.get(s.id)) }
          : s
      );
    }
    currentProject = restored;
    const saved = saveProject();
    if (!saved.ok) return saved;
    notify('restore', currentProject);
    return { ok: true, project: currentProject };
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
    listProjects,
    saveProjectToLibrary,
    loadProjectFromLibrary,
    deleteProject,
    createSnapshot,
    restoreSnapshot,
    get CURRENT_VERSION() { return CURRENT_STORE_VERSION; }
  };
}
