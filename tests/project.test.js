/**
 * Architecture Helping Hand - Project Document Model Test Suite
 * Stabilization 2: pure-model contracts (create/validate/normalize/serialize/
 * deserialize/clone/touch, unknown-field preservation, malformed rejection).
 */

import {
  PROJECT_SCHEMA_VERSION,
  PROJECT_STORE_KEY,
  LEGACY_STORAGE_KEYS,
  createProject,
  generateProjectId,
  validateProject,
  normalizeProject,
  cloneProject,
  touchProject,
  serializeProject,
  deserializeProject,
  parseProject
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

function assertDeepEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

console.log('🧪 Running tests/project.test.js...');

// ---------------------------------------------------------------------------
// 1. createProject
// ---------------------------------------------------------------------------
console.log('\n--- 1. createProject ---');

{
  const p = createProject();
  assertEqual(p.schemaVersion, PROJECT_SCHEMA_VERSION, 'New project carries current schemaVersion');
  assert(typeof p.id === 'string' && p.id.startsWith('proj-'), 'New project gets a generated id');
  assertEqual(p.metadata.name, 'Untitled Project', 'Default name applied');
  assert(typeof p.metadata.createdAt === 'string', 'createdAt timestamp set');
  assertEqual(p.site.location, '', 'Empty site normalized');
  assertDeepEqual(p.dimensions, [], 'dimensions container empty');
  assertDeepEqual(p.chains, [], 'chains container empty');
  assertDeepEqual(p.notes, [], 'notes container empty');
  assertDeepEqual(p.snapshots, [], 'snapshots container empty');
  assertDeepEqual(p.decisions, [], 'decisions container empty');
  assertDeepEqual(p.exports, [], 'exports container empty');
}

{
  const p = createProject({ id: 'proj-fixed-1', name: 'Courtyard House', description: 'Studio 2B', author: 'student' });
  assertEqual(p.id, 'proj-fixed-1', 'Supplied id is respected (deterministic tests)');
  assertEqual(p.metadata.name, 'Courtyard House', 'Supplied name respected');
  assertEqual(p.metadata.description, 'Studio 2B', 'Supplied description respected');
}

{
  const a = createProject({ id: 'proj-x' });
  const b = createProject({ id: 'proj-x', name: a.metadata.name, description: a.metadata.description, author: a.metadata.author });
  assertDeepEqual(a.site, b.site, 'createProject is deterministic for identical inputs (same site)');
}

assert(typeof generateProjectId() === 'string' && generateProjectId().startsWith('proj-'), 'generateProjectId returns prefixed id');
assert(generateProjectId() !== generateProjectId(), 'generateProjectId produces distinct ids');

// ---------------------------------------------------------------------------
// 2. validateProject
// ---------------------------------------------------------------------------
console.log('\n--- 2. validateProject ---');

{
  const v = validateProject(createProject({ id: 'proj-v1' }));
  assert(v.ok && v.errors.length === 0, 'Fresh project validates cleanly');
}

{
  const v = validateProject(null);
  assert(!v.ok && v.errors.length === 1, 'null document rejected');
  assert(!validateProject(undefined).ok, 'undefined document rejected');
  assert(!validateProject([]).ok, 'array document rejected');
  assert(!validateProject('string').ok, 'string document rejected');
}

{
  const v = validateProject({ schemaVersion: 1, id: '', metadata: { name: 'x' } });
  assert(!v.ok && v.errors.some(e => e.includes('id')), 'Empty id rejected with precise error');
  const v2 = validateProject({ id: 'proj-x', metadata: { name: 'x' } });
  assert(!v2.ok && v2.errors.some(e => e.includes('schemaVersion')), 'Missing schemaVersion rejected');
  const v3 = validateProject({ schemaVersion: 0, id: 'p', metadata: { name: 'x' } });
  assert(!v3.ok, 'schemaVersion 0 rejected');
  const v4 = validateProject({ schemaVersion: 1, id: 'p', metadata: null });
  assert(!v4.ok && v4.errors.some(e => e.includes('metadata')), 'null metadata rejected');
  const v5 = validateProject({ schemaVersion: 1, id: 'p', metadata: { name: 'x' }, dimensions: 'nope' });
  assert(!v5.ok && v5.errors.some(e => e.includes('dimensions')), 'Non-array dimensions rejected');
  const v6 = validateProject({ schemaVersion: 1, id: 'p', metadata: { name: 'x' }, site: [] });
  assert(!v6.ok && v6.errors.some(e => e.includes('site')), 'Array site rejected');
}

// ---------------------------------------------------------------------------
// 3. normalizeProject & unknown-field preservation
// ---------------------------------------------------------------------------
console.log('\n--- 3. normalizeProject ---');

{
  const n = normalizeProject({});
  assertEqual(n.schemaVersion, PROJECT_SCHEMA_VERSION, 'normalize fills schemaVersion');
  assert(typeof n.id === 'string', 'normalize generates id when missing');
  assertEqual(n.metadata.name, 'Untitled Project', 'normalize defaults name');
  assertDeepEqual(n.chains, [], 'normalize fills missing containers');
}

{
  // Unknown fields MUST survive normalization (future migration safety)
  const futureDoc = {
    schemaVersion: 1,
    id: 'proj-future',
    metadata: { name: 'Future House' },
    site: { location: 'Lisbon' },
    dimensions: [],
    rooms: [{ id: 'room-1', width: 3.2, length: 4.1 }],
    walls: [{ id: 'wall-9' }],
    someUnknownFlag: { nested: true }
  };
  const n = normalizeProject(futureDoc);
  assertDeepEqual(n.rooms, [{ id: 'room-1', width: 3.2, length: 4.1 }], 'Unknown container "rooms" preserved');
  assertDeepEqual(n.walls, [{ id: 'wall-9' }], 'Unknown container "walls" preserved');
  assertDeepEqual(n.someUnknownFlag, { nested: true }, 'Unknown scalar fields preserved');
}

{
  // Non-string metadata types are coerced, not dropped
  const n = normalizeProject({ schemaVersion: 1, id: 'p', metadata: { name: 42, author: null } });
  assertEqual(n.metadata.name, '42', 'Non-string metadata.name coerced to string');
  assertEqual(n.metadata.author, 'null', 'null author coerced to "null" string (not dropped)');
}

// ---------------------------------------------------------------------------
// 4. serialize / deserialize / parse round-trip
// ---------------------------------------------------------------------------
console.log('\n--- 4. Serialization round-trip ---');

{
  const p = createProject({ id: 'proj-rt', name: 'Round Trip', site: { location: 'Porto', areaM2: 250 } });
  p.dimensions.push({ id: 'dim-1', name: 'Wall A', rawInput: '4800mm' });
  const json = serializeProject(p);
  assert(typeof json === 'string' && json.includes('"proj-rt"'), 'serializeProject returns JSON string with id');

  const back = parseProject(json);
  assert(back.ok, 'parseProject round-trips a valid document');
  if (back.ok) {
    assertEqual(back.doc.id, 'proj-rt', 'Round-trip id preserved');
    assertDeepEqual(back.doc.site, p.site, 'Round-trip site preserved');
    assertDeepEqual(back.doc.dimensions, p.dimensions, 'Round-trip dimensions preserved');
    assertEqual(back.doc.metadata.name, 'Round Trip', 'Round-trip metadata preserved');
  }
}

{
  let threw = false;
  try { deserializeProject('not json {{{'); } catch (e) { threw = true; }
  assert(threw, 'deserializeProject throws controlled error on unparseable JSON');
  let threw2 = false;
  try { deserializeProject(''); } catch (e) { threw2 = true; }
  assert(threw2, 'deserializeProject throws on empty string');

  const bad = parseProject('not json');
  assert(!bad.ok && bad.errors.length === 1, 'parseProject returns controlled error object');
}

// ---------------------------------------------------------------------------
// 5. clone & touch
// ---------------------------------------------------------------------------
console.log('\n--- 5. clone & touch ---');

{
  const p = createProject({ id: 'proj-clone', name: 'Clone Source' });
  p.notes.push({ id: 'note-1', text: 'remember the courtyard' });
  const c = cloneProject(p);
  assert(c !== p, 'cloneProject returns a new object');
  assert(c.notes !== p.notes, 'cloneProject deep-copies containers');
  c.notes[0].text = 'changed';
  assertEqual(p.notes[0].text, 'remember the courtyard', 'Clone mutation does not affect source');
}

{
  const p = createProject({ id: 'proj-touch' });
  const before = p.metadata.updatedAt;
  const t = touchProject(p, '2026-09-02T10:00:00.000Z');
  assertEqual(t.metadata.updatedAt, '2026-09-02T10:00:00.000Z', 'touchProject sets updatedAt');
  assertEqual(p.metadata.updatedAt, before, 'touchProject does not mutate the original');
}

// ---------------------------------------------------------------------------
// 6. Legacy keys documented & storage envelope
// ---------------------------------------------------------------------------
console.log('\n--- 6. Legacy keys & store envelope ---');

assertEqual(PROJECT_STORE_KEY, 'archiscale_project_store', 'Project store key is stable');
assertEqual(LEGACY_STORAGE_KEYS.workspace, 'archiscale_dimension_workspace', 'Legacy workspace key matches current runtime key');
assertEqual(LEGACY_STORAGE_KEYS.chains, 'archiscale_dimension_chains', 'Legacy chains key matches current runtime key');
assertEqual(LEGACY_STORAGE_KEYS.cadClipboard, 'archiscale_cad_clipboard_settings', 'Legacy CAD clipboard key matches current runtime key');
assertEqual(LEGACY_STORAGE_KEYS.batchCad, 'archi_batch_cad_state', 'Legacy batch key matches current runtime key');
assertEqual(LEGACY_STORAGE_KEYS.quickDimension, 'archiscale_quick_dimension_prefs', 'Legacy quick-dim key matches current runtime key');
assertEqual(LEGACY_STORAGE_KEYS.history, 'archiscale_calculation_history', 'Legacy history key matches current runtime key');

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
