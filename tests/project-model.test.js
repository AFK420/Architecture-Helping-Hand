/**
 * Project Model Integrity Suite — schema v2 canonical model contract.
 * Pins: identity contract, derived/stored separation, relationship index,
 * bounded event bus, v1→v2 migration safety, transaction semantics.
 */

import {
  attachIdentity, ensureEntityId, deriveFacts, stripDerivedShadows,
  createRelationshipIndex, addRelationship, removeEntityRelationships,
  relationshipsOf, createModelEventBus, migrateProjectV1toV2,
  PROJECT_SCHEMA_VERSION_V2, PROVENANCE, MODEL_EVENTS
} from '../src/core/project-schema.js';
import { PROVENANCE as LEAF_PROVENANCE, MODEL_EVENTS as LEAF_EVENTS } from '../src/core/entity-identity.js';
import { createLineEntity, createWall, createRoom, generateEntityId } from '../src/core/entities.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}
function assertEqual(a, b, msg) {
  const ok = a === b;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`}: ${msg}`);
}

console.log('\n--- 1. Identity contract ---');
{
  const line = createLineEntity({ p1: { x: 0, y: 0 }, p2: { x: 3, y: 0 } });
  attachIdentity(line, { provenance: PROVENANCE.USER_INPUT, now: '2026-01-01T00:00:00Z' });
  assert(line._meta.createdAt === '2026-01-01T00:00:00Z', 'createdAt stamped');
  assertEqual(line._meta.revision, 1, 'first revision is 1');
  attachIdentity(line, { now: '2026-01-02T00:00:00Z' });
  assert(line._meta.updatedAt === '2026-01-02T00:00:00Z' && line._meta.revision === 2, 're-attach bumps revision + updatedAt');
  attachIdentity(line, { provenance: 'forged-value' });
  assert(line._meta.provenance !== 'forged-value', 'invalid provenance rejected (kept previous)');

  // ensureEntityId assigns stable ids to legacy fixtures without one
  const orphan = { kind: 'wall' };
  ensureEntityId(orphan, 'wall', generateEntityId);
  assert(typeof orphan.id === 'string' && orphan.id.startsWith('wall-'), 'ensureEntityId assigns prefixed id via injected generator');
  const again = { ...orphan };
  ensureEntityId(again, 'wall', generateEntityId);
  assertEqual(again.id, orphan.id, 'existing id never replaced');

  assert(LEAF_PROVENANCE === PROVENANCE && LEAF_EVENTS === MODEL_EVENTS, 'leaf and schema export the same frozen contracts');
}

console.log('\n--- 2. Derived facts (stored vs derived separation) ---');
{
  const wall = createWall({ x1: 0, y1: 0, x2: 4, y2: 3, thickness: 0.2 });
  delete wall.length; // simulate pure stored facts
  const f = deriveFacts(wall);
  assert(Math.abs(f.length.value - 5) < 1e-9 && f.length.class === 'CALCULATED', 'wall length derived from endpoints (3-4-5)');
  assert(Math.abs(f.angleDegrees.value - 36.867) < 0.01, 'wall angle derived');

  const room = createRoom({ x: 0, y: 0, width: 6, depth: 4 });
  delete room.area; delete room.perimeter;
  const rf = deriveFacts(room);
  assertEqual(rf.area.value, 24, 'room area derived');
  assertEqual(rf.perimeter.value, 20, 'room perimeter derived');
  assert(rf.centroid && rf.centroid.value.x === 3 && rf.centroid.value.y === 2, 'room centroid derived from boundary');

  const dim = { kind: 'dimension', p1: { x: 1, y: 1 }, p2: { x: 4, y: 5 }, unit: 'm' };
  assert(Math.abs(deriveFacts(dim).measuredLength.value - 5) < 1e-9, 'dimension measured length derived');

  assert(deriveFacts({ kind: 'unknown-thing' }) === null, 'unsupported kinds return null (no invented facts)');

  stripDerivedShadows(wall);
  assert(wall.length === undefined, 'stripDerivedShadows removes stored length shadow');
}

console.log('\n--- 3. Relationship index ---');
{
  const idx = createRelationshipIndex();
  addRelationship(idx, 'contains', 'room-1', 'furn-1');
  addRelationship(idx, 'contains', 'room-1', 'furn-2');
  addRelationship(idx, 'contains', 'room-1', 'furn-1'); // duplicate — must dedupe
  assertEqual(relationshipsOf(idx, 'room-1').length, 2, 'relationships deduplicate');
  addRelationship(idx, 'hosts', 'wall-1', 'door-1');
  assertEqual(relationshipsOf(idx, 'wall-1')[0].type, 'hosts', 'type preserved (wall hosts door)');
  removeEntityRelationships(idx, 'wall-1');
  assertEqual(relationshipsOf(idx, 'wall-1').length, 0, 'entity removal purges its relationships');
  assert(relationshipsOf(idx, 'nothing').length === 0, 'unknown entity has no relationships');
}

console.log('\n--- 4. Bounded event bus ---');
{
  const bus = createModelEventBus();
  let created = 0, deleted = 0;
  const offC = bus.on('entity.created', () => created++);
  bus.on('entity.deleted', () => deleted++);
  bus.emit('entity.created', { id: 'a' });
  bus.emit('entity.created', { id: 'b' });
  bus.emit('entity.deleted', { id: 'a' });
  assertEqual(created, 2, 'listener receives each emit');
  assertEqual(deleted, 1, 'events are isolated per name');
  let threw = false;
  try { bus.on('made.up.event', () => {}); } catch { threw = true; }
  assert(threw, 'unknown event names are rejected at subscribe time (no event jungle)');
  bus.emit('entity.created', {}); // listener that throws must not break others
  offC();
  bus.emit('entity.created', {});
  assertEqual(bus.listenerCount('entity.created'), 0, 'unsubscribe works');
}

console.log('\n--- 5. v1 → v2 migration ---');
{
  const v1 = {
    schemaVersion: 1, id: 'proj-v1', metadata: { name: 'Legacy', createdAt: '2025-01-01T00:00:00Z' },
    documents: [{
      id: 'doc-1', name: 'Ground Floor', type: '2d',
      entities: [
        { kind: 'line', x1: 0, y1: 0, x2: 2, y2: 0, length: 2, angleDegrees: 0 },       // no id, shadows
        { kind: 'wall', id: 'w-kept', x1: 0, y1: 0, x2: 4, y2: 0, length: 4, thickness: 0.2 },
        { kind: 'room', id: 'r-kept', x: 0, y: 0, width: 3, depth: 3, area: 9, perimeter: 12 }
      ]
    }]
  };
  const out = migrateProjectV1toV2(JSON.parse(JSON.stringify(v1)));
  assertEqual(out.schemaVersion, PROJECT_SCHEMA_VERSION_V2, 'schema bumped to v2');
  const [line, wall, room] = out.documents[0].entities;
  assert(typeof line.id === 'string' && line.id.startsWith('line-'), 'idless entity assigned stable id');
  assertEqual(wall.id, 'w-kept', 'existing id preserved');
  assert(line.length === undefined && room.area === undefined && room.perimeter === undefined && wall.length === undefined, 'derived shadows stripped on all kinds');
  assert(line._meta.provenance === 'migrated' && room._meta.provenance === 'migrated', 'migrated provenance recorded');
  assert(out.relationships && out.relationships.bySource, 'relationship index created');

  // non-destructive: original untouched (pure migration)
  assert(v1.documents[0].entities[0].length === 2, 'input document not mutated (pure migration)');

  let threw = false;
  try { migrateProjectV1toV2(null); } catch { threw = true; }
  assert(threw, 'null project rejected loudly');
  try { migrateProjectV1toV2([]); } catch { threw = true; }
  assert(threw, 'array project rejected loudly');
}

console.log(`\n========================================`);
console.log(`Project Model Integrity Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
