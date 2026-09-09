/**
 * Issue Engine Test Suite — Phase 9 deterministic QA rules.
 * Coverage, determinism, severity mapping, issue object shape.
 */

import {
  runAllChecks, listRules, RULES, ISSUE_SEVERITIES
} from '../src/core/issue-engine.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

const base = [
  { kind: 'wall', id: 'w1', name: 'W1', x1: 0, y1: 0, x2: 4, y2: 0, thickness: 0.2 },
  { kind: 'wall', id: 'w2', name: 'W2', x1: 0, y1: 3, x2: 4, y2: 3, thickness: 0.2 },
  { kind: 'wall', id: 'w3', name: 'W3', x1: 0, y1: 0, x2: 0, y2: 3, thickness: 0.2 },
  { kind: 'wall', id: 'w4', name: 'W4', x1: 4, y1: 0, x2: 4, y2: 3, thickness: 0.2 },
  { kind: 'room', id: 'r1', name: 'Bedroom', x: 0, y: 0, width: 4, depth: 3 },
  { kind: 'door', id: 'd1', name: 'Bedroom Door', wallId: 'w1', x: 1, y: 0, width: 0.9, swing: 'left' },
  { kind: 'dimension', id: 'dim1', name: 'D', x1: 0, y1: -0.5, x2: 4, y2: -0.5 },
  { kind: 'north_arrow', id: 'n1', x: 5, y: 5, rotation: 0 }
];

console.log('\n--- 1. Clean plan ---');
{
  const report = runAllChecks(base, {});
  const blocking = report.issues.filter(i => i.status === 'FAIL');
  assert(report.rulesRun === RULES.length, `all ${RULES.length} rules ran`);
  // walls connected + dimensioned + room named/dimensioned + north arrow present
  assert(blocking.length === 0, `clean plan has no FAIL issues (${blocking.map(i => i.rule).join(',')})`);
  const roomIssues = report.issues.filter(i => i.entityIds.includes('r1') && /missing_door|missing_annotation/.test(i.rule));
  assert(roomIssues.length === 0, 'fully-annotated bedroom: no door/name issues');
  assert(report.ranAt, 'report carries ranAt timestamp');
}

console.log('\n--- 2. Deterministic geometry rules ---');
{
  const bowtie = [...base, { kind: 'room', id: 'rb', name: 'Bowtie', boundary: [{x:8,y:0},{x:12,y:3},{x:12,y:0},{x:8,y:3}] }];
  const r1 = runAllChecks(bowtie, {});
  assert(r1.issues.some(i => i.rule === 'geo.self_intersection' && i.entityIds.includes('rb')), 'self-intersecting boundary detected');

  // overlap
  const overlap = [...base,
    { kind: 'room', id: 'r-a', name: 'A', x: 10, y: 0, width: 4, depth: 4 },
    { kind: 'room', id: 'r-b', name: 'B', x: 12, y: 2, width: 4, depth: 4 }];
  const r2 = runAllChecks(overlap, {});
  const ov = r2.issues.find(i => i.rule === 'geo.overlap');
  assert(ov && ov.evidence.overlapArea > 0, 'overlapping rooms detected with area evidence');

  // duplicate
  const dup = [...base, base[0], { ...base[4], id: 'r-dup' }];
  const r3 = runAllChecks(dup, {});
  assert(r3.issues.some(i => i.rule === 'geo.duplicate'), 'exact-position duplicate detected');

  // disconnected wall (isolated)
  const stray = [...base, { kind: 'wall', id: 'w-stray', name: 'Stray', x1: 50, y1: 50, x2: 52, y2: 50 }];
  const r4 = runAllChecks(stray, {});
  assert(r4.issues.some(i => i.rule === 'geo.disconnected' && i.entityIds.includes('w-stray')), 'disconnected stray wall detected');
}

console.log('\n--- 3. Room rules ---');
{
  const rooms = [
    { kind: 'room', id: 'r1', name: 'Bedroom', x: 0, y: 0, width: 3, depth: 2 },      // 6 m² < 7.5
    { kind: 'room', id: 'r2', name: 'Corridor', x: 0, y: 0, width: 10, depth: 1 },   // ratio 10:1
    { kind: 'room', id: 'r3', name: 'Room 7', x: 0, y: 0, width: 4, depth: 3 }       // default name
  ];
  const r = runAllChecks(rooms, {});
  assert(r.issues.some(i => i.rule === 'room.min_area' && i.entityIds.includes('r1')), 'small bedroom flagged');
  assert(r.issues.some(i => i.rule === 'room.proportion' && i.entityIds.includes('r2')), 'extreme proportion flagged');
  assert(r.issues.some(i => i.rule === 'room.missing_door' && i.entityIds.includes('r3')), 'door-less room flagged');
  assert(r.issues.some(i => i.rule === 'doc.missing_annotation' && i.entityIds.includes('r3')), 'default room name flagged');
  assert(r.issues.some(i => i.rule === 'room.missing_window' && i.entityIds.includes('r1')), 'window-less bedroom flagged');
}

console.log('\n--- 4. Door/window rules ---');
{
  const orphanDoor = [{ kind: 'door', id: 'd-orphan', name: 'D', x: 50, y: 50, width: 0.9 }];
  const r = runAllChecks(orphanDoor, {});
  assert(r.issues.some(i => i.rule === 'door.host'), 'orphan door flagged (no host wall)');
  const orphanWin = [{ kind: 'window', id: 'w-orphan', name: 'W', x: 50, y: 50, width: 1.2 }];
  const rw = runAllChecks(orphanWin, {});
  assert(rw.issues.some(i => i.rule === 'window.host'), 'orphan window flagged');
}

console.log('\n--- 5. Dimension rules ---');
{
  const wall = { kind: 'wall', id: 'w1', x1: 0, y1: 0, x2: 4, y2: 0, thickness: 0.2 };
  const stale = { kind: 'dimension', id: 'd-stale', name: 'D', x1: 0, y1: 0, x2: 9, y2: 0 };
  const r1 = runAllChecks([wall, stale], {});
  assert(r1.issues.some(i => i.rule === 'dim.mismatch'), 'stale dimension flagged');

  const match = { kind: 'dimension', id: 'd-ok', name: 'D', x1: 0, y1: 0, x2: 4, y2: 0 };
  const r2 = runAllChecks([wall, match], {});
  assert(!r2.issues.some(i => i.rule === 'dim.mismatch'), 'matching dimension not flagged');

  const dupDim = [wall,
    { kind: 'dimension', id: 'd-1', name: 'D1', x1: 0, y1: -0.5, x2: 4, y2: -0.5 },
    { kind: 'dimension', id: 'd-2', name: 'D2', x1: 0, y1: -0.5, x2: 4, y2: -0.5 }];
  const r3 = runAllChecks(dupDim, {});
  assert(r3.issues.some(i => i.rule === 'dim.duplicate'), 'duplicate dimensions flagged');
}

console.log('\n--- 6. Stair/ramp rules ---');
{
  const steepStair = { kind: 'stair', id: 's1', name: 'S', risers: 16, riserHeight: 0.21, tread: 0.25, x: 0, y: 0, width: 1.1, depth: 4 };
  const r1 = runAllChecks([steepStair], {});
  assert(r1.issues.some(i => i.rule === 'stair.riser_high'), '21 cm riser flagged as high severity');
  assert(r1.issues.some(i => i.rule === 'stair.blondel'), 'Blondel out-of-band flagged');

  const steepRamp = { kind: 'ramp', id: 'r1', name: 'R', slopePercent: 12, slopeRatio: 8.3, x: 0, y: 0, width: 1.5, depth: 3 };
  const r2 = runAllChecks([steepRamp], {});
  assert(r2.issues.some(i => i.rule === 'ramp.slope' && i.severity === 'high'), 'steep ramp flagged high severity');

  const okStair = { kind: 'stair', id: 's2', name: 'S2', risers: 16, riserHeight: 0.17, tread: 0.28, blondel: 0.62, x: 0, y: 0, width: 1.1, depth: 4 };
  const r3 = runAllChecks([okStair, okStair], {});
  assert(!r3.issues.some(i => i.rule.startsWith('stair')), 'compliant stair clean');
}

console.log('\n--- 7. Issue object contract ---');
{
  const stray = [
    { kind: 'wall', id: 'w-a', name: 'A', x1: 0, y1: 0, x2: 4, y2: 0 },
    { kind: 'wall', id: 'w-s', name: 'S', x1: 50, y1: 50, x2: 52, y2: 50 }
  ];
  const r = runAllChecks(stray, {});
  const iss = r.issues[0];
  assert(iss && typeof iss.id === 'string' && iss.id.startsWith('iss-'), 'issue has id');
  assert(['critical', 'high', 'medium', 'low', 'info'].includes(iss.severity), 'severity in allowed set');
  assert(['FAIL', 'WARNING'].includes(iss.status), 'status is FAIL or WARNING');
  assert(Array.isArray(iss.entityIds) && iss.entityIds.some(id => ['w-a', 'w-s'].includes(id)), 'entityIds reference the source entities');
  assert(iss.location && typeof iss.location.x === 'number', 'location present');
  assert(typeof iss.evidence === 'object' && iss.evidence !== null, 'evidence object present');
  assert(typeof iss.message === 'string' && iss.message.length > 5, 'message present');
  assert(typeof iss.recommendation === 'string' && iss.recommendation.length > 5, 'recommendation present');
  assert(typeof iss.createdAt === 'string', 'createdAt timestamp present');
}

console.log('\n--- 8. Determinism + registry integrity ---');
{
  const ents = [{ kind: 'wall', id: 'w1', x1: 0, y1: 0, x2: 4, y2: 0, name: 'W' }];
  const a = JSON.stringify(runAllChecks(ents, {}).issues.map(i => [i.rule, i.message]));
  const b = JSON.stringify(runAllChecks(ents, {}).issues.map(i => [i.rule, i.message]));
  // messages contain the id → strip ids before comparing
  const strip = (s) => s.replace(/iss-[a-z0-9]+/g, 'iss-X');
  assert(strip(a) === strip(b), 'same model → same issues (deterministic)');

  const severities = new Set(RULES.map(r => r.severity));
  assert([...severities].every(s => ISSUE_SEVERITIES.includes(s)), 'rule severities use the allowed scale');
  assert(RULES.every(r => typeof r.id === 'string' && typeof r.run === 'function' && r.scope), 'every rule has id/scope/run');
  const meta = listRules();
  assert(meta.length === RULES.length, 'listRules exposes the full registry');
}

console.log('\n--- 9. Factory-entity honesty (no false positives) ---');
// Regression: door/window rules were pinned against fixtures with hand-added
// x/y. Real factory openings are hosted (wallId + position along the wall)
// and carry NO x/y — a properly hosted door + window on a bedroom must not
// be flagged missing. Duplicate detection must also cover walls.
{
  const {
    createRoom, createWall, createDoor, createWindow
  } = await import('../src/core/entities.js');

  const wallBottom = createWall({ id: 'fw1', name: 'FW1', x1: 0, y1: 0, x2: 4, y2: 0 });
  createWall({ id: 'fw2', name: 'FW2', x1: 0, y1: 3, x2: 4, y2: 3 });
  createWall({ id: 'fw3', name: 'FW3', x1: 0, y1: 0, x2: 0, y2: 3 });
  const wallRight = createWall({ id: 'fw4', name: 'FW4', x1: 4, y1: 0, x2: 4, y2: 3 });
  const room = createRoom({ id: 'fr1', name: 'Master Bedroom', x: 0, y: 0, width: 4, depth: 3 });
  const door = createDoor({ id: 'fd1', name: 'Entry', wallId: 'fw1', position: 1.5, width: 0.9 });
  const win = createWindow({ id: 'fwn1', name: 'W1', wallId: wallRight.id, position: 1.0, width: 1.2 });

  const ents = [wallBottom, createWall({ id: 'fw2', name: 'FW2', x1: 0, y1: 3, x2: 4, y2: 3 }),
    createWall({ id: 'fw3', name: 'FW3', x1: 0, y1: 0, x2: 0, y2: 3 }), wallRight, room, door, win];

  const report = runAllChecks(ents, {});
  const falsePositives = report.issues.filter(i =>
    i.entityIds.includes('fr1') && ['room.missing_door', 'room.missing_window'].includes(i.rule));
  assert(falsePositives.length === 0,
    `hosted factory door + window on bedroom: no missing_door/missing_window flags (${falsePositives.map(i => i.rule).join(',')})`);
  assert(!report.issues.some(i => i.entityIds.includes('fd1') && i.rule === 'door.host'),
    'factory door with valid wallId: not flagged as orphan');
  assert(!report.issues.some(i => i.entityIds.includes('fwn1') && i.rule === 'window.host'),
    'factory window with valid wallId: not flagged as orphan');

  // Wall duplicates now detected (walls have x1/y1/x2/y2, not x/y)
  const dupWall = createWall({ id: 'fw1-dup', name: 'Dup', x1: 0, y1: 0, x2: 4, y2: 0 });
  const dupReport = runAllChecks([...ents, dupWall], {});
  assert(dupReport.issues.some(i => i.rule === 'geo.duplicate' && i.entityIds.includes('fw1-dup')),
    'duplicate wall detected');

  // A genuinely door-less factory room must still be flagged (no false negatives)
  const room2 = createRoom({ id: 'fr2', name: 'Study', x: 10, y: 0, width: 3, depth: 3 });
  const r2rep = runAllChecks([room2], {});
  assert(r2rep.issues.some(i => i.entityIds.includes('fr2') && i.rule === 'room.missing_door'),
    'door-less factory room still flagged');
}

console.log(`\n========================================`);
console.log(`Issue Engine Summary: ${passed}, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
