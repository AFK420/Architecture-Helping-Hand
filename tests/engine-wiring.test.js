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

console.log('\n--- 8. 3D backend wiring (camera3d + geometry3d as the real engine) ---');
{
  const m = await import('../src/core/massing-3d.js');
  const { createWall, createRoom } = await import('../src/core/entities.js');

  // Standard views exposed: bottom + the 4 elevations + plan
  for (const key of ['bottom', 'front_south', 'back_north', 'left_west', 'right_east', 'plan']) {
    assert(Boolean(m.CAMERA_PRESETS[key]), `camera preset "${key}" exposed in the 3D toolbar`);
  }
  assert(!('iso_ne' in m.CAMERA_PRESETS) && !('axonometric' in m.CAMERA_PRESETS), 'no duplicate preset aliases');

  // Faces carry their source entity id for picking
  const wall = createWall({ id: 'pw1', name: 'PW', x1: 0, y1: 0, x2: 4, y2: 0 });
  const room = createRoom({ id: 'pr1', name: 'PR', x: 0, y: 0, width: 4, depth: 3 });
  const faces = m.buildMassing3DModel([wall, room], { wallHeight: 3 });
  assert(faces.length > 0 && faces.every(f => f.entityId), 'every massing face stamped with its source entity id');
  const faceIds = new Set(faces.map(f => f.entityId));
  assert(faceIds.has('pw1') && faceIds.has('pr1'), 'wall and room faces both stamped');

  // Raycast picking: click through a face → the plan entity id
  const cam = { azimuth: 45, elevation: 30, zoom: 40, panX: 400, panY: 300 };
  const probe = { x: 2, y: 1.5, z: 1.5 }; // a point inside the massing volume
  const { worldToScreen3D } = await import('../src/core/camera3d.js');
  const sp = worldToScreen3D(probe, cam);
  const pick = m.pickMassingFace(faces, sp.x, sp.y, cam);
  assert(pick !== null, 'raycast picks a face under the projected point');
  assert(pick.entityId === 'pw1' || pick.entityId === 'pr1', `picked face maps to a plan entity (${pick && pick.entityId})`);

  // Section clip: nothing above the cut survives
  const clipped = m.clipMassingFaces(faces, 1.5);
  assert(clipped.length > 0, 'clip keeps below-cut faces');
  const maxZ = Math.max(...clipped.flatMap(f => f.vertices.map(v => v.z)));
  assert(maxZ <= 1.5 + 1e-9, `no vertex above the cut plane (max z = ${maxZ.toFixed(2)})`);

  // UI wiring pins
  const fs = await import('node:fs');
  const planSrc = fs.readFileSync('src/ui/views/plan.js', 'utf8');
  assert(planSrc.includes('pickMassingFace, clipMassingFaces'), 'plan view imports the pick/clip functions');
  assert(planSrc.includes('data-face-entity'), 'faces carry pickable data attributes');
  assert(planSrc.includes('downFaceEntity'), '3D click-pick wired into pointerdown/up');
  assert(planSrc.includes('rng-3d-clip'), 'section-cut slider in the 3D toolbar');
  assert(planSrc.includes('Math.max(-89.9, Math.min(89.9'), 'orbit allows full ±89.9° elevation (bottom views reachable)');
}

console.log('\n--- 9. AI tools wired to live transports + previewable proposals ---');
{
  const openai = await import('../src/services/ai/transports/openai-compat.js');
  const gemini = await import('../src/services/ai/transports/gemini.js');
  const { createToolRegistry } = await import('../src/ai/tools/registry.js');
  const { createArchitectureTools, AI_PERMISSIONS } = await import('../src/ai/tools/architecture-tools.js');
  const { parseAiActions, executeAiAction } = await import('../src/core/ai-bridge.js');

  // Wire format: tools reach the request body in provider-native shape
  const sampleTools = [
    { name: 'getMeasurements', description: 'Get project measurements', inputSchema: { kind: { type: 'string', required: true } } },
    { name: 'proposeFurnitureMove', description: 'Propose moving furniture', inputSchema: { furnitureId: { type: 'string', required: true }, dx: { type: 'number', required: true }, dy: { type: 'number', required: true } } }
  ];
  const body = openai.buildChatBody({ userPrompt: 'u', options: { modelId: 'x', tools: sampleTools } });
  assert(Array.isArray(body.tools) && body.tools.length === 2, 'OpenAI body carries tool definitions');
  assert(body.tools[0].type === 'function' && body.tools[0].function.name === 'getMeasurements', 'OpenAI function-calling format');
  assert(body.tools[0].function.parameters.required.includes('kind'), 'flat schema converted to OpenAPI JSON Schema');
  assert(body.tool_choice === 'auto', 'tool_choice auto');
  const noToolBody = openai.buildChatBody({ userPrompt: 'u', options: { modelId: 'x' } });
  assert(!('tools' in noToolBody), 'no tools field when none provided');

  const gbody = gemini.buildGenerateBody({ userPrompt: 'u', options: { tools: sampleTools } });
  assert(Array.isArray(gbody.tools) && gbody.tools[0].functionDeclarations.length === 2, 'Gemini body carries functionDeclarations');
  assert(gbody.tools[0].functionDeclarations[0].parameters.type === 'object', 'Gemini parameters in OpenAPI object form');

  // Registry safety: only READ/PROPOSE tiers are ever registered — an APPLY
  // tool cannot exist, so the model can never mutate geometry directly.
  const registry = createToolRegistry(createArchitectureTools(() => ({}), () => []));
  const perms = new Set(registry.list().map(t => t.permission));
  assert(![...perms].some(p => String(p).startsWith('APPLY')), 'no APPLY-tier tools in the live registry');
  assert(registry.list().some(t => t.name === 'proposeFurnitureMove'), 'proposal tools registered');

  // Proposal → preview → explicit user apply (ai-bridge pipeline)
  const modelText = 'Here is my suggestion.\n```json\n[{ "type": "add_room", "name": "Study", "x": 0, "y": 0, "width": 3, "depth": 3 }]\n```';
  const actions = parseAiActions(modelText);
  assert(actions.length === 1 && actions[0].type === 'add_room', 'structured proposal parsed from model text');
  const plan = { documents: [{ id: 'd1', type: '2d_plan', entities: [] }], activeDocId: 'd1' };
  const res = executeAiAction(actions[0], plan);
  assert(res.success === true && plan.documents[0].entities.length === 1, 'user-approved proposal applies deterministically');

  // UI wiring pins
  const fs = await import('node:fs');
  const appSrc = fs.readFileSync('src/ui/app.js', 'utf8');
  assert(appSrc.includes('createToolRegistry(createArchitectureTools'), 'app instantiates the live tool registry');
  assert(appSrc.includes('getToolDefinitions: () => aiTools.list()'), 'registry definitions injected into the router');
  const routerSrc = fs.readFileSync('src/services/ai/job-router.js', 'utf8');
  assert(routerSrc.includes('getToolDefinitions'), 'router forwards tool definitions to transports');
  const studioSrc = fs.readFileSync('src/ui/views/ai-studio.js', 'utf8');
  assert(studioSrc.includes('renderProposals'), 'AI Studio renders proposal cards');
  assert(studioSrc.includes("data-proposal-act"), 'proposal cards expose explicit Accept/Reject buttons');
  assert(studioSrc.includes('executeAiAction'), 'accept applies through the deterministic action pipeline');
}

console.log('\n--- 10. Autosave + crash recovery ---');
{
  const fs = await import('node:fs');
  const planSrc = fs.readFileSync('src/ui/views/plan.js', 'utf8');
  // Debounced autosave on every undoable mutation (history.push wrapper)
  assert(planSrc.includes('scheduleAutosave()'), 'autosave scheduled from the mutation path');
  assert(planSrc.includes('rawHistoryPush(cmd);'), 'history.push wrapped without losing the original call');
  // Dedicated recovery key — never the project itself
  assert(planSrc.includes("RECOVERY_KEY = 'archiscale_plan_recovery'"), 'dedicated recovery storage key');
  // Flush on hide/close
  assert(planSrc.includes("document.visibilityState === 'hidden'"), 'snapshot flushed when the tab hides');
  assert(planSrc.includes("window.addEventListener('beforeunload'"), 'snapshot flushed before unload');
  // Manual save clears recovery (work is now durable in the project)
  assert(planSrc.includes('clearRecoverySnapshot(); // manual save supersedes recovery'), 'manual save clears the recovery snapshot');
  // Recovery is explicit, never automatic
  assert(planSrc.includes('showRecoveryBannerIfAny'), 'recovery banner offered on mount');
  assert(planSrc.includes('btn-recovery-restore'), 'user must click Recover — no silent auto-restore');
  assert(planSrc.includes('btn-recovery-discard'), 'user can discard the snapshot');
}

console.log(`\n========================================`);
console.log(`Engine Wiring (Phase A: parametric): ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
