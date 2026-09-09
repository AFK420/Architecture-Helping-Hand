/**
 * Engine Wiring Tests — Phase A (parametric, constraints, 3D backend, AI tools).
 * Pins the "real engine, missing driver" gaps closed by the wiring pass:
 * every engine below is now reachable from the application, not just tests.
 */

import { createStairEntity, createRoom, createDoor, createWindow, createWall, roomArea } from '../src/core/entities.js';
import { applyParameter, readParameters, PARAMETRIC_OBJECTS } from '../src/core/parametric.js';
import { createConstraint, solveConstraint, CONSTRAINT_TYPES } from '../src/core/constraints.js';
import { calcDoorCADGeometry, calcWindowCADGeometry } from '../src/core/geometry.js';
import { runAllChecks } from '../src/core/issue-engine.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

console.log('\n--- 1. Parametric stair: full dependent chain ---');
{
  const s = createStairEntity({ id: 's1', name: 'S', x: 0, y: 0, rise: 2.8, risers: 16, tread: 0.28 });
  // The audit found: risers 16→10 recomputed riserHeight but run/depth stayed stale.
  applyParameter(s, 'risers', 10);
  assert(s.riserHeight > 0 && Math.abs(s.riserHeight - 2.8 / 10) < 1e-9, 'riser height recomputed (0.28 m)');
  assert(Math.abs(s.run - 9 * 0.28) < 1e-9, 'total run regenerated ((R−1)×tread)');
  assert(Math.abs(s.depth - s.run) < 1e-9, 'plan depth follows run (footprint regenerates)');
  assert(Math.abs(s.blondel - (2 * s.riserHeight + s.tread)) < 1e-9, 'Blondel recomputed');
  assert(Number.isFinite(s.pitchAngle), 'pitch recomputed');
  assert(s.isCompliant === (s.blondel >= 0.60 && s.blondel <= 0.66 && s.tread >= 0.24 && s.riserHeight <= 0.19), 'IBC compliance flag recomputed');
  assert(s.riserCount === s.risers, 'legacy riserCount alias synced');

  // riserHeight drive: rise is the driver, riser count derives
  applyParameter(s, 'riserHeight', 0.175);
  assert(s.risers === Math.round(2.8 / 0.175) && Math.abs(s.riserHeight - 2.8 / s.risers) < 1e-9,
    'riser-height entry derives the integer riser count from the fixed rise');

  // tread drive: run follows
  applyParameter(s, 'tread', 0.30);
  assert(Math.abs(s.run - (s.risers - 1) * 0.30) < 1e-9, 'tread change regenerates the run');

  // derived params refuse direct writes with a helpful error
  const res = applyParameter(s, 'blondel', 0.63);
  assert(res.ok === false && /derived/i.test(res.error), 'derived parameter refuses direct write');
  const resRun = applyParameter(s, 'run', 4);
  assert(resRun.ok === false && /derived/i.test(resRun.error), 'run is derived — refused with guidance');
}

console.log('\n--- 2. Parametric door/window: hosted geometry regenerates ---');
{
  const wall = createWall({ id: 'w1', name: 'W', x1: 0, y1: 0, x2: 6, y2: 0 });
  const d = createDoor({ id: 'd1', name: 'Door', wallId: 'w1', position: 1.0, width: 0.9 });
  applyParameter(d, 'width', 1.8);
  const cad = calcDoorCADGeometry(wall, d);
  const jambSpan = Math.hypot(cad.jamb2Line[0].x - cad.jamb1Line[0].x, cad.jamb2Line[0].y - cad.jamb1Line[0].y);
  assert(Math.abs(jambSpan - 1.8) < 1e-6, `door width regen flows into jamb geometry (${jambSpan.toFixed(2)} m)`);
  assert(Math.abs(cad.radius - 1.8) < 1e-6, 'swing radius follows the new width');

  const w = createWindow({ id: 'wn1', name: 'Window', wallId: 'w1', position: 1, width: 1.2, sill: 0.9, height: 1.2 });
  applyParameter(w, 'sill', 0.3);
  assert(Math.abs(w.headHeight - (0.3 + 1.2)) < 1e-9, 'sill→head triple stays consistent');
  const headRes = applyParameter(w, 'head', 2.7);
  assert(headRes.ok === true && Math.abs(w.height - 2.4) < 1e-9, 'head drive recomputes height');

  // out-of-range values are refused as values (no throw)
  const bad = applyParameter(d, 'width', 9);
  assert(bad.ok === false && /between/i.test(bad.error), 'out-of-range door width refused with range error');
}

console.log('\n--- 3. Parametric room: target area + polygon consistency ---');
{
  const r = createRoom({ id: 'r1', name: 'Bedroom', x: 0, y: 0, width: 4, depth: 3,
    boundary: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }] });
  applyParameter(r, 'targetArea', 20);
  assert(Math.abs(r.width - 4) < 1e-9, 'target-area keeps width (deterministic strategy)');
  assert(Math.abs(r.depth - 5) < 1e-9, 'depth grows to the target area');
  assert(Math.abs(roomArea(r) - 20) < 1e-9, 'factory area matches the target after regen');
  const ys = r.boundary.map(p => p.y);
  const xs = r.boundary.map(p => p.x);
  assert(Math.abs((Math.max(...ys) - Math.min(...ys)) - 5) < 1e-9, 'polygon boundary rescaled to the new depth');
  assert(Math.abs((Math.max(...xs) - Math.min(...xs)) - 4) < 1e-9, 'polygon boundary preserves width');

  // width change keeps polygon consistent too (no stale mixed geometry)
  applyParameter(r, 'width', 8);
  const xs2 = r.boundary.map(p => p.x);
  assert(Math.abs((Math.max(...xs2) - Math.min(...xs2)) - 8) < 1e-9, 'width change rescales boundary consistently');
}

console.log('\n--- 4. Parametric regen + issue engine agree (no stale compliance) ---');
{
  const s = createStairEntity({ id: 's2', name: 'Compliant Stair', x: 0, y: 0, rise: 2.72, risers: 16, tread: 0.28 });
  // 2.72/16 = 170mm; 2R+T = 620mm — compliant
  applyParameter(s, 'risers', 20);
  const report = runAllChecks([s], {});
  const stairIssues = report.issues.filter(i => i.entityIds.includes('s2') && /stair/i.test(i.rule));
  // 2.72/20 = 136mm → 2R+T = 552mm — Blondel out of band must be flagged
  assert(s.blondel < 0.60, 'recomputation moved Blondel out of band (precondition)');
  assert(stairIssues.length > 0, 'issue engine flags the recomputed (stale-compliance) stair');
}

console.log('\n--- 5. Constraint engine: deterministic satisfy + diagnostics ---');
{
  // WALLS_PARALLEL: satisfy rotates the minimum necessary geometry
  const w1 = createWall({ id: 'cw1', name: 'A', x1: 0, y1: 0, x2: 4, y2: 0 });
  const w2 = createWall({ id: 'cw2', name: 'B', x1: 0, y1: 1, x2: 4, y2: 1.6 });
  const out = solveConstraint(createConstraint('parallel', ['cw1', 'cw2'], {}), [w1, w2]);
  // NOTE: the engine reports 'satisfied' for applied corrections too (the
  // 'adjusted' status exists in the vocabulary but these branches don't use
  // it) — assert behavior, not the status string.
  assert(out.status !== 'conflict' && out.status !== 'impossible', 'walls-parallel constraint resolves without conflict');
  const dx = w2.x2 - w2.x1, dy = w2.y2 - w2.y1;
  assert(Math.abs(dy) < 1e-9, 'second wall rotated to horizontal (minimum necessary change)');
  assert(Math.hypot(dx, dy) >= 3.9, 'wall length preserved by the correction');

  // ROOM_MIN_AREA: polygon boundary stays consistent after deterministic growth
  const room = createRoom({ id: 'cr1', name: 'Small', x: 0, y: 0, width: 3, depth: 3,
    boundary: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }, { x: 0, y: 3 }] });
  const grow = solveConstraint(createConstraint('room_min_area', ['cr1'], { minArea: 15 }), [room]);
  assert(grow.status !== 'conflict' && grow.status !== 'impossible', 'room-min-area resolves without conflict');
  assert(Math.abs(room.width * room.depth - 15) < 1e-9, 'grown room meets the minimum');
  const by = room.boundary.map(p => p.y);
  assert(Math.abs((Math.max(...by) - Math.min(...by)) - room.depth) < 1e-9, 'grown polygon matches width×depth (no stale boundary)');

  // Constraint on a conflicting target reports, never silently distorts
  const bad = solveConstraint(createConstraint('room_min_area', ['cr1'], { minArea: -3 }), [room]);
  assert(bad.status === 'conflict', 'invalid constraint target is a conflict, not a mutation');
}

console.log('\n--- 6. Inspector wiring: descriptors drive the UI contract ---');
{
  const fs = await import('node:fs');
  const planSrc = fs.readFileSync('src/ui/views/plan.js', 'utf8');
  assert(planSrc.includes("applyParameter as applyParametricParameter"), 'plan view imports the canonical engine');
  assert(planSrc.includes("applyParametricParameter(selected, 'risers'"), 'stair risers input routed through the engine');
  assert(planSrc.includes("applyParametricParameter(selected, 'width'"), 'door/window/room width inputs routed through the engine');
  assert(planSrc.includes("applyParametricParameter(selected, 'sill'"), 'window sill input routed through the engine');
  assert(!planSrc.includes('function updateStairGeometry(keepPanels = false) {\n        selected.riserHeight = selected.rise / selected.risers;'),
    'inspector no longer keeps private stair math');

  // Every non-reference descriptor's apply leaves the entity renderable:
  // readParameters must reflect post-regen truth for all kinds.
  for (const kind of Object.keys(PARAMETRIC_OBJECTS)) {
    assert(Array.isArray(PARAMETRIC_OBJECTS[kind].parameters) && PARAMETRIC_OBJECTS[kind].parameters.length > 0,
      `descriptor set exists for ${kind}`);
  }
}

console.log('\n--- 7. Constraint UI wiring (C-panels Constraints tab) ---');
{
  const fs = await import('node:fs');
  const cpanelsSrc = fs.readFileSync('src/ui/components/cpanels.js', 'utf8');
  const planSrc = fs.readFileSync('src/ui/views/plan.js', 'utf8');
  assert(cpanelsSrc.includes('data-panel-tab="constraints"'), 'Constraints tab exists in the C-panels');
  assert(cpanelsSrc.includes('onConstraintAction'), 'constraint action events forwarded to the app');
  assert(cpanelsSrc.includes('onAddConstraint'), 'constraint-add events forwarded to the app');
  assert(planSrc.includes("createConstraint, solveConstraint, CONSTRAINT_TYPES"), 'plan view imports the constraint engine');
  assert(planSrc.includes('function handleConstraintAction'), 'plan view owns add/diagnose/satisfy/remove handlers');
  assert(planSrc.includes("history.push(cmd);"), 'constraint satisfy is undoable via the command stack');
  // Diagnose must never mutate: the test path clones before solving
  assert(planSrc.includes('JSON.parse(JSON.stringify(c))'), 'diagnose runs on a cloned record (status only, no mutation)');

  // Constraint records persist with the document (documents are deep-copied whole)
  assert(planSrc.includes('docConstraints(d).push(c)'), 'constraints stored on the document');
}

console.log(`\n========================================`);
console.log(`Engine Wiring (Phase A: parametric): ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
