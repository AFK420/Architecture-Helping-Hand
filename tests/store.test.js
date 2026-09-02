/**
 * Architecture Helping Hand - Project Store Test Suite
 * Stabilization 3+4: versioned persistence, migration chain, malformed-data
 * recovery, pub/sub notifications, legacy import (non-destructive), and
 * quota-failure behavior. Storage is an in-memory adapter — no localStorage.
 */

import {
  CURRENT_STORE_VERSION,
  MIGRATIONS,
  migrateEnvelope,
  createProjectStore
} from '../src/services/store.js';
import {
  PROJECT_STORE_KEY,
  PROJECT_SCHEMA_VERSION,
  createProject,
  validateProject,
  serializeProject
} from '../src/core/project.js';

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

console.log('🧪 Running tests/store.test.js...');

/** In-memory storage adapter mimicking StorageService's surface. */
function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: k => { map.delete(k); },
    _map: map
  };
}

/** Storage adapter whose writes always fail (quota exhaustion). */
function makeFailingStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: k => { map.delete(k); },
    _map: map
  };
}

let clockTick = 0;
const fixedClock = () => new Date(1700000000000 + (clockTick++) * 1000);

// ---------------------------------------------------------------------------
// 1. Migration chain basics
// ---------------------------------------------------------------------------
console.log('\n--- 1. Migration chain ---');

assertEqual(CURRENT_STORE_VERSION, PROJECT_SCHEMA_VERSION + MIGRATIONS.length, 'CURRENT_STORE_VERSION = schema + migrations');
assertEqual(CURRENT_STORE_VERSION, 1, 'Version 1 is current (empty migration chain)');

{
  const env = { version: 1, project: createProject({ id: 'proj-m1' }) };
  const out = migrateEnvelope(env);
  assertEqual(out.version, 1, 'v1 envelope passes through unchanged');
}

{
  let threw = false;
  try { migrateEnvelope({ version: 99, project: {} }); } catch (e) { threw = true; }
  assert(threw, 'Future-version envelope fails loudly (no silent downgrade)');
  let threw2 = false;
  try { migrateEnvelope({ version: 'one', project: {} }); } catch (e) { threw2 = true; }
  assert(threw2, 'Non-integer version rejected');
  let threw3 = false;
  try { migrateEnvelope(null); } catch (e) { threw3 = true; }
  assert(threw3, 'Null envelope rejected');
}

// ---------------------------------------------------------------------------
// 2. Store basics: create / get / set / save / load
// ---------------------------------------------------------------------------
console.log('\n--- 2. Store basics ---');

{
  const storage = makeMemoryStorage();
  const store = createProjectStore({ storage, generateId: () => 'proj-store-1', now: fixedClock });

  const p = store.getProject({ name: 'Thesis' });
  assertEqual(p.id, 'proj-store-1', 'getProject creates with injected id generator');
  assertEqual(p.metadata.name, 'Thesis', 'getProject applies options');

  const saved = store.saveProject();
  assert(saved.ok, 'saveProject persists successfully');

  const raw = JSON.parse(storage.getItem(PROJECT_STORE_KEY));
  assertEqual(raw.version, 1, 'Persisted envelope carries version 1');
  assertEqual(raw.project.id, 'proj-store-1', 'Persisted envelope carries the project');

  // New store instance over the same storage round-trips
  const store2 = createProjectStore({ storage, now: fixedClock });
  const loaded = store2.loadProject();
  assert(loaded.ok && loaded.project, 'loadProject reads persisted project');
  assertEqual(loaded.project.id, 'proj-store-1', 'Round-trip project id preserved');
  assertEqual(loaded.project.metadata.name, 'Thesis', 'Round-trip project name preserved');
}

{
  const storage = makeMemoryStorage();
  const store = createProjectStore({ storage });

  // Fresh store: no persisted project
  const fresh = store.loadProject();
  assert(fresh.ok && fresh.project === null && fresh.fresh, 'loadProject reports fresh store');

  // setProject validates before accepting
  const bad = store.setProject({ schemaVersion: 1, id: '' });
  assert(!bad.ok && bad.errors.length > 0, 'setProject rejects invalid documents');

  const good = store.setProject(createProject({ id: 'proj-set', name: 'Set Test' }));
  assert(good.ok, 'setProject accepts a valid document');
  assertEqual(store.getProject().id, 'proj-set', 'setProject replaces current');
}

// ---------------------------------------------------------------------------
// 3. updateProject (immutable mutation + timestamping)
// ---------------------------------------------------------------------------
console.log('\n--- 3. updateProject ---');

{
  const storage = makeMemoryStorage();
  let t = 0;
  const store = createProjectStore({ storage, now: () => new Date(1690000000000 + (t++) * 60000) });
  store.createNewProject({ id: 'proj-upd', name: 'Before' });

  const res = store.updateProject(draft => {
    draft.metadata.name = 'After';
    draft.notes.push({ id: 'n1', text: 'courtyard faces south' });
    return draft;
  });
  assert(res.ok, 'updateProject applies mutation');
  assertEqual(store.getProject().metadata.name, 'After', 'Mutation visible after update');
  assertEqual(store.getProject().notes.length, 1, 'Mutation applied to containers');

  const bad = store.updateProject(() => { throw new Error('boom'); });
  assert(!bad.ok && bad.errors[0].includes('boom'), 'Mutator failures return controlled errors');

  const noFn = store.updateProject('not a function');
  assert(!noFn.ok, 'Non-function mutator rejected');
}

// ---------------------------------------------------------------------------
// 4. Malformed persisted data recovery
// ---------------------------------------------------------------------------
console.log('\n--- 4. Malformed data recovery ---');

{
  const storage = makeMemoryStorage();
  storage.setItem(PROJECT_STORE_KEY, '{corrupted json!!!');
  const store = createProjectStore({ storage });
  const res = store.loadProject();
  assert(!res.ok && res.project === null, 'Corrupted JSON envelope → controlled failure, no throw');
  assert(res.errors[0].includes('JSON'), 'Recovery reports JSON as the problem');
}

{
  const storage = makeMemoryStorage();
  storage.setItem(PROJECT_STORE_KEY, JSON.stringify({ version: 1, project: { id: '', metadata: {} } }));
  const store = createProjectStore({ storage });
  const res = store.loadProject();
  assert(!res.ok, 'Envelope with invalid project → controlled failure');
  assert(res.errors.some(e => e.includes('id')), 'Validation errors surfaced from load');
}

{
  const storage = makeMemoryStorage();
  storage.setItem(PROJECT_STORE_KEY, JSON.stringify({ version: 0 }));
  const store = createProjectStore({ storage });
  assert(!store.loadProject().ok, 'Envelope missing version rejected');

  storage.setItem(PROJECT_STORE_KEY, JSON.stringify([1, 2, 3]));
  assert(!store.loadProject().ok, 'Array envelope rejected');

  storage.setItem(PROJECT_STORE_KEY, JSON.stringify({ version: 1, project: { schemaVersion: 1, id: 'p', metadata: { name: 'x' } } }));
  const store2 = createProjectStore({ storage });
  const res2 = store2.loadProject();
  assert(res2.ok && res2.project.id === 'p', 'Minimal-but-valid envelope loads and normalizes');
}

// ---------------------------------------------------------------------------
// 5. Storage unavailable / quota failure
// ---------------------------------------------------------------------------
console.log('\n--- 5. Storage failure behavior ---');

{
  const store = createProjectStore({
    storage: { getItem: () => { throw new Error('blocked'); }, setItem: () => {} }
  });
  const res = store.loadProject();
  assert(!res.ok && res.errors[0] === 'storage unavailable', 'Read failures reported as storage unavailable');
}

{
  const failing = makeFailingStorage();
  const store = createProjectStore({ storage: failing });
  store.createNewProject({ id: 'proj-quota' });
  const saved = store.saveProject();
  assert(!saved.ok && saved.errors[0].includes('quota'), 'Quota failure surfaces as controlled error');
  assert(store.getProject().id === 'proj-quota', 'In-memory project survives save failure (no data loss)');
}

// ---------------------------------------------------------------------------
// 6. Pub/Sub notifications
// ---------------------------------------------------------------------------
console.log('\n--- 6. Pub/Sub ---');

{
  const storage = makeMemoryStorage();
  const store = createProjectStore({ storage });
  const events = [];
  const unsub = store.subscribe((reason, project) => events.push({ reason, id: project?.id }));

  store.createNewProject({ id: 'proj-pub1' });
  store.setProject(createProject({ id: 'proj-pub2', name: 'Pub2' }));
  store.updateProject(d => { d.metadata.name = 'Pub2 edited'; return d; });

  assertEqual(events.length, 3, 'Three notifications for create/set/update');
  assertEqual(events[0].reason, 'create', 'Create event fired');
  assertEqual(events[1].reason, 'set', 'Set event fired');
  assertEqual(events[2].reason, 'update', 'Update event fired');

  unsub();
  store.updateProject(d => { d.metadata.name = 'x'; return d; });
  assertEqual(events.length, 3, 'Unsubscribed callback no longer notified');
}

{
  const storage = makeMemoryStorage();
  const store = createProjectStore({ storage });
  let subscriberThrew = false;
  store.subscribe(() => { subscriberThrew = true; throw new Error('bad subscriber'); });
  let ok = true;
  try { store.createNewProject({ id: 'proj-badsub' }); } catch (e) { ok = false; }
  assert(ok && subscriberThrew, 'Faulty subscriber does not break the store');
}

// ---------------------------------------------------------------------------
// 7. Legacy import (non-destructive)
// ---------------------------------------------------------------------------
console.log('\n--- 7. Legacy import ---');

{
  const storage = makeMemoryStorage();
  const store = createProjectStore({ storage, generateId: () => 'proj-legacy' });
  store.createNewProject();

  const res = store.importLegacy({
    workspace: { entries: [
      { id: 'ws-1', name: 'Wall A', rawInput: '4800mm', dimensionType: 'segment', notes: '' },
      { id: 'ws-2', name: 'Door', rawInput: '900mm', dimensionType: 'reference', notes: '' }
    ] },
    chains: { name: 'North Wall', defaultUnit: 'mm', scaleRatio: 50, segments: [{ id: 's1', rawInput: '1200' }] }
  });

  assert(res.ok && res.imported.includes('workspace') && res.imported.includes('chains'), 'Legacy import copies workspace + chains');
  assertEqual(store.getProject().dimensions.length, 2, 'Workspace entries imported into dimensions');
  assertEqual(store.getProject().dimensions[0].name, 'Wall A', 'Imported dimension keeps its name');
  assertEqual(store.getProject().chains.length, 1, 'Chain imported into project chains');
  assertEqual(store.getProject().chains[0].name, 'North Wall', 'Imported chain keeps its name');

  const res2 = store.importLegacy({ workspace: { nope: true } });
  assert(!res2.ok && res2.errors.length === 1, 'Malformed legacy payload reported, not silently dropped');
}

// ---------------------------------------------------------------------------
// 8. Preferences vs project data separation
// ---------------------------------------------------------------------------
console.log('\n--- 8. Project/preference separation ---');

{
  const storage = makeMemoryStorage();
  storage.setItem('archi_theme', 'dark');
  storage.setItem('archiscale_quick_dimension_prefs', JSON.stringify({ precision: 2 }));
  const store = createProjectStore({ storage });
  store.createNewProject({ id: 'proj-sep' });
  store.saveProject();

  // The store must not have touched preference keys
  assertEqual(storage.getItem('archi_theme'), 'dark', 'Store leaves theme preference untouched');
  assertEqual(storage.getItem('archiscale_quick_dimension_prefs'), '{"precision":2}', 'Store leaves quick-dim preferences untouched');
  assert(storage.getItem(PROJECT_STORE_KEY).includes('proj-sep'), 'Store writes only its own envelope key');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
