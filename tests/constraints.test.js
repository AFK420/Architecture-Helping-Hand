/**
 * Constraint System + Parametric Objects Test Suite — Phase 8.
 * Deterministic solving, conflict reporting, parametric descriptors.
 */

import {
  CONSTRAINT_TYPES, CONSTRAINT_STATUS,
  createConstraint, solveConstraint, solveConstraints
} from '../src/core/constraints.js';
import {
  getParametersFor, readParameters, applyParameter, PARAMETRIC_OBJECTS
} from '../src/core/parametric.js';
import { createWall, createDoor, createWindow, createRoom, createStairEntity, createLineEntity } from '../src/core/entities.js';

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

console.log('\n--- 1. Constraint creation contract ---');
{
  let threw = false;
  try { createConstraint('made_up', ['a']); } catch { threw = true; }
  assert(threw, 'unknown constraint type rejected loudly');
  threw = false;
  try { createConstraint('wall_thickness', []); } catch { threw = true; }
  assert(threw, 'empty target list rejected loudly');
  const c = createConstraint('wall_thickness', ['w1'], { thickness: 0.3 });
  assert(c.id.startsWith('con-') && c.status === CONSTRAINT_STATUS.SATISFIED, 'constraint record has id + default status');
}

console.log('\n--- 2. Geometric constraints ---');
{
  // horizontal
  const diag = createLineEntity({ x1: 0, y1: 0, x2: 3, y2: 2 });
  const c1 = createConstraint('horizontal', [diag.id]);
  solveConstraint(c1, [diag]);
  assert(Math.abs(diag.y1 - diag.y2) < 1e-9 && Math.abs((diag.x2 - diag.x1) - 3.606) < 0.01, 'horizontal keeps length, zeroes slope');
  // vertical
  const v = createLineEntity({ x1: 0, y1: 0, x2: 2, y2: 3 });
  solveConstraint(createConstraint('vertical', [v.id]), [v]);
  assert(Math.abs(v.x1 - v.x2) < 1e-9, 'vertical zeroes x-span');
  // parallel
  const p1 = createLineEntity({ x1: 0, y1: 0, x2: 4, y2: 0 });
  const p2 = createLineEntity({ x1: 0, y1: 0, x2: 2, y2: 2 });
  solveConstraint(createConstraint('parallel', [p1.id, p2.id]), [p1, p2]);
  assert(Math.abs(p2.y2 - p2.y1) < 1e-9, 'parallel rotates second segment');
  // perpendicular
  const perp = createLineEntity({ x1: 0, y1: 0, x2: 2, y2: 0 });
  solveConstraint(createConstraint('perpendicular', [p1.id, perp.id]), [p1, perp]);
  assert(Math.abs((perp.x2 - perp.x1)) < 1e-9 || Math.abs((perp.y2 - perp.y1)) < 1e-9, 'perpendicular applied');
  // equal length
  const e1 = createLineEntity({ x1: 0, y1: 0, x2: 2, y2: 0 });
  const e2 = createLineEntity({ x1: 0, y1: 0, x2: 6, y2: 0 });
  solveConstraint(createConstraint('equal_length', [e1.id, e2.id]), [e1, e2]);
  assert(Math.abs((e2.x2 - e2.x1) - 4) < 1e-9, 'equal_length sets average (4 m)');
  // fixed distance
  const f = createLineEntity({ x1: 0, y1: 0, x2: 1, y2: 0 });
  solveConstraint(createConstraint('fixed_distance', [f.id], { value: 3.5 }), [f]);
  assert(Math.abs((f.x2 - f.x1) - 3.5) < 1e-9, 'fixed_distance sets exact length');
  // fixed angle
  const ang = createLineEntity({ x1: 0, y1: 0, x2: 2, y2: 0 });
  solveConstraint(createConstraint('fixed_angle', [ang.id], { angle: 45 }), [ang]);
  assert(Math.abs((ang.x2 - ang.x1) - Math.SQRT2) < 1e-9 && Math.abs((ang.y2 - ang.y1) - Math.SQRT2) < 1e-9, 'fixed_angle 45° on 2 m segment → (√2, √2)');
  // missing param → conflict with guidance
  const noParam = createConstraint('fixed_distance', [f.id], {});
  solveConstraint(noParam, [f]);
  assert(noParam.status === CONSTRAINT_STATUS.CONFLICT && noParam.message.length > 10, 'missing parameter → conflict with guidance');
}

console.log('\n--- 3. Architectural constraints ---');
{
  const wall = createWall({ x1: 0, y1: 0, x2: 4, y2: 0, thickness: 0.2 });
  const door = createDoor({ wallId: wall.id, position: 1, width: 0.9 });
  const win = createWindow({ wallId: wall.id, position: 2, width: 1.2 });

  // wall thickness
  const t = createConstraint('wall_thickness', [wall.id], { thickness: 0.3 });
  solveConstraint(t, [wall]);
  assert(Math.abs(wall.thickness - 0.3) < 1e-9, 'wall thickness enforced');
  const tBad = createConstraint('wall_thickness', [wall.id], { thickness: 5 });
  solveConstraint(tBad, [wall]);
  assert(tBad.status === CONSTRAINT_STATUS.CONFLICT && wall.thickness === 0.3, 'unbuildable thickness → conflict, geometry untouched');

  // door width: fits
  const d1 = createConstraint('door_width', [door.id], { width: 1.1 });
  solveConstraint(d1, [wall, door]);
  assert(Math.abs(door.width - 1.1) < 1e-9, 'door width applied');
  // door width: conflict (too wide for wall) — geometry untouched
  const d2 = createConstraint('door_width', [door.id], { width: 9 });
  solveConstraint(d2, [wall, door]);
  assert(d2.status === CONSTRAINT_STATUS.CONFLICT && Math.abs(door.width - 1.1) < 1e-9, 'oversized door → conflict, width untouched');
  assert(Array.isArray(d2.resolutions) && d2.resolutions.length > 0, 'conflict lists possible resolutions');
  // window width
  const w1 = createConstraint('window_width', [win.id], { width: 1.5 });
  solveConstraint(w1, [wall, win]);
  assert(Math.abs(win.width - 1.5) < 1e-9, 'window width applied');

  // room min area: grows depth, keeps width
  const room = createRoom({ x: 0, y: 0, width: 3, depth: 2 });
  const r1 = createConstraint('room_min_area', [room.id], { minArea: 12 });
  solveConstraint(r1, [room]);
  assert(Math.abs(room.width - 3) < 1e-9 && Math.abs(room.width * room.depth - 12) < 0.01, 'room grown along depth to meet 12 m²');
  const r2 = createConstraint('room_min_area', [room.id], { minArea: 5 });
  solveConstraint(r2, [room]);
  assert(r2.status === CONSTRAINT_STATUS.SATISFIED && Math.abs(room.depth - 4) < 0.01, 'area above minimum → satisfied, untouched');

  // corridor min width: moves the second wall
  const c1 = createLineEntity({ x1: 0, y1: 0, x2: 6, y2: 0 });
  const c2 = createLineEntity({ x1: 0, y1: 1, x2: 6, y2: 1 });
  solveConstraint(createConstraint('corridor_min_width', [c1.id, c2.id], { minWidth: 1.5 }), [c1, c2]);
  assert(Math.abs(c2.y1 - 1.5) < 1e-9, 'corridor wall moved to 1.5 m minimum');

  // clearance envelope
  const wall2 = createWall({ x1: 0, y1: 0, x2: 0, y2: 10, thickness: 0.2 }); // vertical at x=0
  const furn = { kind: 'furniture', id: 'f1', x: 0.4, y: 2, width: 1, depth: 0.6, wallId: wall2.id };
  const cl = createConstraint('clearance_envelope', [furn.id, wall2.id], { minClearance: 0.9 });
  solveConstraint(cl, [furn, wall2]);
  assert(Math.abs(furn.x - 0.9) < 1e-9, 'clearance envelope pushed furniture to 0.9 m from wall');
}

console.log('\n--- 4. Stair constraints ---');
{
  const stair = createStairEntity({ x: 0, y: 0, width: 1.1, risers: 16, run: 4 });
  const r1 = createConstraint('stair_rise', [stair.id], { value: 0.175 });
  solveConstraint(r1, [stair]);
  assert(Math.abs(stair.riserHeight - 0.175) < 1e-9 && Math.abs(stair.blondel - (2 * 0.175 + stair.tread)) < 1e-9, 'stair riser set, Blondel recomputed');
  const r2 = createConstraint('stair_tread', [stair.id], { value: 0.29 });
  solveConstraint(r2, [stair]);
  assert(Math.abs(stair.blondel - (2 * 0.175 + 0.29)) < 1e-9, 'stair tread set, Blondel recomputed');
}

console.log('\n--- 5. Batch solving + missing target ---');
{
  const report = solveConstraints([], []);
  assertEqual(report.conflicts, 0, 'empty batch');
  const ghost = createConstraint('wall_thickness', ['missing-id'], { thickness: 0.2 });
  const report2 = solveConstraints([ghost], []);
  assertEqual(report2.conflicts, 1, 'missing target reported as conflict');
  assert(ghost.message.includes('not found'), 'missing target message explains the problem');
}

console.log('\n--- 6. Parametric objects ---');
{
  // descriptors exist for the architectural set
  for (const kind of ['door', 'window', 'stair', 'room', 'wall']) {
    assert(PARAMETRIC_OBJECTS[kind] && getParametersFor(kind).length > 0, `${kind} exposes parameters`);
  }
  assert(getParametersFor('unknown') === null, 'unknown kind → null');

  const door = createDoor({ wallId: 'w1', position: 1, width: 0.9 });
  const read = readParameters(door);
  assert(read.width === 0.9 && read.swing === 'left', 'readParameters returns typed values');

  // apply width (in range)
  const a1 = applyParameter(door, 'width', 1.1);
  assert(a1.ok && Math.abs(door.width - 1.1) < 1e-9, 'parameter apply sets width');
  // out of range
  const a2 = applyParameter(door, 'width', 99);
  assert(!a2.ok && /between/.test(a2.error), 'out-of-range parameter explained with bounds');
  // unknown parameter
  const a3 = applyParameter(door, 'frobnicate', 1);
  assert(!a3.ok && a3.error.includes('available:'), 'unknown parameter lists available names');
  // derived rejection
  const win = createWindow({ wallId: 'w1', width: 1.2, position: 1, sill: 0.9 });
  const a4 = applyParameter(win, 'head', 2.4);
  assert(a4.ok && Math.abs(win.height - 1.5) < 1e-9, 'head (derived) drives height: head 2.4 − sill 0.9 = 1.5');
  // stair derived blondel
  const stair = createStairEntity({ x: 0, y: 0, width: 1.1, risers: 16, run: 4 });
  const a5 = applyParameter(stair, 'blondel', 0.63);
  assert(!a5.ok, 'derived blondel apply is rejected with guidance');
  const a6 = applyParameter(stair, 'tread', 0.29);
  assert(a6.ok && Math.abs(stair.blondel - (2 * stair.riserHeight + 0.29)) < 1e-9, 'tread apply recomputes derived Blondel');
  // room targetArea keeps width, grows depth
  const room = createRoom({ x: 0, y: 0, width: 3, depth: 2 });
  const a7 = applyParameter(room, 'targetArea', 15);
  assert(a7.ok && Math.abs(room.depth - 5) < 1e-9 && Math.abs(room.width - 3) < 1e-9, 'targetArea grows depth, keeps width');
}

console.log(`\n========================================`);
console.log(`Constraint & Parametric Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
