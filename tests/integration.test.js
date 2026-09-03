/**
 * Architecture Helping Hand - End-to-End Integration Test Suite (P14)
 * Final hardening: cross-layer pipelines through REAL implementations only.
 * No fake objects — every number flows through the real core engines, the
 * real project store, and the real exporters/AI-context builders.
 *
 * Pipelines:
 *   1. Project → Room → Furniture → Clearance → AI Facts Pack → Critique
 *   2. Survey → Calibration → Measurement → Room → Plan → Export
 *   3. Stair → Project decision → CAD export
 *   4. Ramp → Slope (shared math) → Project → CAD export
 *   5. Plan → Space analysis → Snapshot → AI context
 */

import { createProjectStore } from '../src/services/store.js';
import {
  createRoom, createWall, placeFurniture, roomArea
} from '../src/core/entities.js';
import {
  checkFurnitureFit, checkClearance, checkOverlaps, checkAdjacency, calculateEfficiency
} from '../src/core/space-planning.js';
import {
  createMeasurement, setMeasurementStatus, proposeRoomFromMeasurements,
  createCalibration, calibratedDistance, calibratedChainDistance, calibratedPolygonArea
} from '../src/core/survey.js';
import { calculateStair } from '../src/core/stairs.js';
import { calculateRamp } from '../src/core/ramps.js';
import { analyzeSlope } from '../src/core/slopes.js';
import { slopeFromGeometry } from '../src/core/slope-math.js';
import {
  buildExport, decisionsToTable, roomsToDXFEntities, wrapSVGDocument,
  serializeProjectJSON, deserializeProjectJSON, createExportProvenance, EXPORT_FORMATS
} from '../src/core/export/export-model.js';
import { planToExportGeometry, generatePlanSVG } from '../src/core/plan-canvas.js';
import { buildFactsPack } from '../src/ai/context/facts-pack.js';
import { createOrchestrator } from '../src/ai/orchestrator.js';
import { createProvider } from '../src/ai/providers/provider.js';
import { createToolRegistry } from '../src/ai/tools/registry.js';
import { createArchitectureTools } from '../src/ai/tools/architecture-tools.js';
import { validateNumericClaims } from '../src/ai/schemas/validators.js';

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

function assertClose(actual, expected, message, eps = 1e-6) {
  // Allow callers to pass eps as the 3rd argument (message, eps) ordering mistake guard:
  if (typeof message === 'number') { eps = message; message = 'close'; }
  const ok = Math.abs(actual - expected) < eps;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, Received: ${actual})`);
  }
}

function makeStore(id) {
  const map = new Map();
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
  return createProjectStore({ storage, generateId: () => id });
}

console.log('🧪 Running tests/integration.test.js...');

// ---------------------------------------------------------------------------
// 1. Project → Room → Furniture → Clearance → AI Facts Pack → Critique
// ---------------------------------------------------------------------------
console.log('\n--- 1. Room/furniture → AI critique pipeline ---');

{
  const store = makeStore('proj-e2e-1');
  store.createNewProject({ name: 'Courtyard House', description: 'Second-year studio, courtyard concept' });

  // Real entities in a real plan arrangement
  const living = createRoom({ name: 'Living', x: 0, y: 0, width: 4.8, depth: 3.2 });
  const bed = createRoom({ name: 'Bedroom', x: 4.8, y: 0, width: 3.6, depth: 3.4 });
  const wallN = createWall({ name: 'North Wall', x1: 0, y1: 0, x2: 8.4, y2: 0 });
  const sofa = placeFurniture({ wCm: 220, dCm: 90, x: 0.3, y: 0.3, name: 'Sofa' });
  const planEntities = [living, bed, wallN, sofa];

  // Persist through the real store (unknown 'plan' container preserved)
  store.updateProject(d => {
    d.plan = { entities: JSON.parse(JSON.stringify(planEntities)), savedAt: '2026-09-03T00:00:00.000Z' };
    return d;
  });
  const saved = store.getProject();
  assert(saved.plan?.entities?.length === 4, 'Plan persisted through the project store');

  // Real clearance analysis on the persisted geometry
  const restoredSofa = saved.plan.entities.find(e => e.kind === 'furniture');
  const restoredLiving = saved.plan.entities.find(e => e.kind === 'room' && e.name === 'Living');
  const fit = checkFurnitureFit(restoredSofa, restoredLiving);
  assertEqual(fit.verdict, 'fits', 'Furniture fit verdict from real geometry');
  const clearance = checkClearance(restoredSofa, restoredLiving, 0.75, 'User Configured');
  assertEqual(clearance.satisfied, false, '0.75 m envelope breached by real margins');

  // Real AI tool registry over the real store + plan
  const registry = createToolRegistry(createArchitectureTools(
    () => store.getProject(),
    () => saved.plan.entities
  ));
  const overlaps = await registry.execute('checkOverlaps', {});
  assertEqual(overlaps.result.conflicts.length, 0, 'No conflicts in the seeded layout');
  const rooms = await registry.execute('getRooms', {});
  assertClose(rooms.result[0].areaM2, 15.36, 'Tool returns core-calculated area');

  // Real facts pack + real orchestrator (scripted provider — deterministic, no network)
  const facts = buildFactsPack(store.getProject(), saved.plan.entities);
  assert(facts.text.includes('15.36'), 'Facts pack carries the deterministic area');

  let capturedPrompt = null;
  const orch = createOrchestrator({
    provider: createProvider({
      id: 'stub', label: 'Stub',
      capabilities: { text: true, reasoning: true, structuredOutput: true },
      sendPrompt: async req => {
        capturedPrompt = req;
        return {
          ok: true,
          text: JSON.stringify({
            summary: 'Compact courtyard scheme.',
            verdict: 'Furniture envelope fails.',
            findings: [{
              title: 'Sofa clearance breach',
              severity: 'medium',
              observation: 'The sofa breaches the 0.75 m study envelope.',
              evidence: ['Living is 15.36 m²'],
              whyItMatters: 'Circulation squeezes below the study value.',
              recommendation: 'Slide the sofa east by 0.2 m.',
              alternative: 'Choose a 1.8 m loveseat.',
              tradeOff: 'One seat fewer.',
              testNext: 'Re-run the 0.75 m envelope check.'
            }]
          })
        };
      }
    }),
    getKey: () => 'test-key',
    buildFactsPack: () => facts
  });

  const critique = await orch.run({ mode: 'critic', userMessage: 'Critique my layout.' });
  assert(critique.ok, 'Critic pipeline succeeds end-to-end');
  assert(critique.structured.findings[0].trust === 'INFERENCE', 'Unlabeled findings default to INFERENCE');
  assertEqual(critique.consistency.status, 'CONSISTENT', 'Core-true numbers in the critique pass fact-checking');
  assert(capturedPrompt.userPrompt.includes('15.36'), 'Deterministic facts reached the provider prompt');

  // A lying model gets flagged against the same facts
  const liar = createOrchestrator({
    provider: createProvider({
      id: 'stub', capabilities: { text: true },
      sendPrompt: async () => ({ ok: true, text: 'Your Living room is 99 m².' })
    }),
    getKey: () => 'test-key',
    buildFactsPack: () => facts
  });
  const lie = await liar.run({ mode: 'mentor', userMessage: 'How big is the living room?' });
  assertEqual(lie.consistency.status, 'NEEDS VERIFICATION', 'Numeric lie mechanically flagged');
}

// ---------------------------------------------------------------------------
// 2. Survey → Calibration → Measurement → Room → Plan → Export
// ---------------------------------------------------------------------------
console.log('\n--- 2. Survey-to-export pipeline ---');

{
  const store = makeStore('proj-e2e-2');
  store.createNewProject({ name: 'Surveyed Studio' });

  // Calibration: 100 px = 4.8 m on the scanned plan
  const cal = createCalibration({ pointA: { x: 0, y: 0 }, pointB: { x: 100, y: 0 }, realMeters: 4.8 });
  assertClose(calibratedDistance(cal, { x: 0, y: 0 }, { x: 100, y: 0 }), 4.8, 'Calibration anchors the known distance');
  assertClose(calibratedChainDistance(cal, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 66.6667 }]), 4.8 + 3.2, 1e-3, 'Chained walk matches W+D');

  // Measurements recorded with provenance through the real survey core
  const mW = createMeasurement({ label: 'Room W', value: 4.8, unit: 'm', source: 'Measured', status: 'Verified' });
  const mD = createMeasurement({ label: 'Room D', value: 3.2, unit: 'm', source: 'Measured', status: 'Verified' });
  const proposal = proposeRoomFromMeasurements([mW, mD], 'Surveyed Room');
  assert(proposal.proposal, 'Survey produces a room proposal');
  assertClose(proposal.proposal.widthMeters, 4.8, 'Proposal width from verified measurement');

  // Polygon area of the surveyed outline in calibrated m²
  assertClose(
    calibratedPolygonArea(cal, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 66.6667 }, { x: 0, y: 66.6667 }]),
    4.8 * 3.2, 'Calibrated polygon area matches W×D', 1e-3
  );

  // Accept the proposal into the plan (explicit user action) and persist.
  // The envelope's fixed containers are dimensions/chains/notes/snapshots/
  // decisions/exports; survey records ride in 'decisions' (kind: 'measurement')
  // — an unknown-field-safe, documented envelope container.
  const room = createRoom({ name: 'Surveyed Room', x: 0, y: 0, width: 4.8, depth: 3.2 });
  store.updateProject(d => {
    d.plan = { entities: [JSON.parse(JSON.stringify(room))], savedAt: '2026-09-03T00:00:00.000Z' };
    d.decisions.push({ id: 'meas-1', kind: 'measurement', name: mW.label, createdAt: '2026-09-03T00:00:00.000Z', result: { value: mW.value, unit: mW.unit, status: mW.status } });
    d.decisions.push({ id: 'meas-2', kind: 'measurement', name: mD.label, createdAt: '2026-09-03T00:00:00.000Z', result: { value: mD.value, unit: mD.unit, status: mD.status } });
    return d;
  });

  // Export: plan SVG through the real pipeline, JSON round-trip through the model
  const p = store.getProject();
  const svg = generatePlanSVG(planToExportGeometry(p.plan.entities));
  const svgDoc = wrapSVGDocument(svg, createExportProvenance('plan', EXPORT_FORMATS.SVG, p.id));
  assert(svgDoc.includes('<?xml') && svgDoc.includes('<svg'), 'Plan exports as a standalone SVG document');

  const json = serializeProjectJSON(p, createExportProvenance('project', EXPORT_FORMATS.JSON, p.id));
  const roundTripped = deserializeProjectJSON(json);
  assertEqual(roundTripped.plan.entities.length, 1, 'JSON round-trip preserves the plan');
  assertEqual(roundTripped.decisions.filter(x => x.kind === 'measurement').length, 2, 'JSON round-trip preserves provenance records');
}

// ---------------------------------------------------------------------------
// 3. Stair → Project decision → CAD export
// ---------------------------------------------------------------------------
console.log('\n--- 3. Stair-to-CAD pipeline ---');

{
  const store = makeStore('proj-e2e-3');
  store.createNewProject({ name: 'Stair Study' });

  const stair = calculateStair({ mode: 'rise_riser_count', totalRise: 2.8, riserCount: 16 });
  assert(stair.valid && stair.risers.count === 16, 'Real stair engine produces the pinned configuration');

  store.updateProject(d => {
    d.decisions.push({
      id: 'dec-stair-1', kind: 'stair', name: 'Main flight',
      createdAt: '2026-09-03T00:00:00.000Z',
      result: { risers: stair.risers.count, twoRPlusT: stair.proportion.twoRPlusTMeters }
    });
    return d;
  });

  const table = decisionsToTable(store.getProject());
  assertEqual(table.rows.length, 1, 'Decision exported as a table row');
  assert(table.rows[0].data.includes('16'), 'Stair result data carried into the export table');

  const csv = buildExport({ format: EXPORT_FORMATS.CSV, source: 'decisions', projectId: 'proj-e2e-3', tables: [table] });
  assert(csv.content.includes('Main flight'), 'CSV export carries the decision through the real exporter');
}

// ---------------------------------------------------------------------------
// 4. Ramp → Slope (shared math) → Project → CAD export
// ---------------------------------------------------------------------------
console.log('\n--- 4. Ramp/slope shared-math pipeline ---');

{
  const store = makeStore('proj-e2e-4');
  store.createNewProject({ name: 'Access Study' });

  const ramp = calculateRamp({ mode: 'rise_run_direct', rise: 0.5, run: 6 });
  const slope = analyzeSlope({ mode: 'rise_run', rise: 0.5, run: 6 });
  assert(ramp.valid && slope.valid, 'Both engines accept the same geometry');
  assertClose(ramp.geometry.slopePercent, slope.geometry.slopePercent, 'Ramp and Slope agree through slope-math.js');
  assertClose(slopeFromGeometry(0.5, 6).slopePercent, 100 * 0.5 / 6, 'Canonical slope-math conversion matches both engines');

  store.updateProject(d => {
    d.decisions.push({
      id: 'dec-ramp-1', kind: 'ramp', name: 'Entry ramp 1:12 study',
      createdAt: '2026-09-03T00:00:00.000Z',
      result: { slopePercent: ramp.geometry.slopePercent, ratio: ramp.geometry.ratioValue }
    });
    return d;
  });

  // Room outlines through the real DXF exporter
  const room = createRoom({ name: 'Entry', x: 0, y: 0, width: 2, depth: 6 });
  const dxf = buildExport({
    format: EXPORT_FORMATS.DXF, source: 'project', projectId: 'proj-e2e-4',
    dxfEntities: roomsToDXFEntities([room]), dxfScale: 1000
  });
  assert(dxf.content.includes('POLYLINE') && dxf.content.includes('EOF'), 'Room geometry reaches the DXF output');
  assert(dxf.content.includes('4800') || dxf.content.includes('2000'), 'DXF coordinates scaled to millimeters');
}

// ---------------------------------------------------------------------------
// 5. Plan → Space analysis → Snapshot → AI context
// ---------------------------------------------------------------------------
console.log('\n--- 5. Plan-analysis-snapshot-AI pipeline ---');

{
  const store = makeStore('proj-e2e-5');
  store.createNewProject({ name: 'Options Study' });

  const roomA = createRoom({ name: 'Room A', x: 0, y: 0, width: 5, depth: 4 });
  const roomB = createRoom({ name: 'Room B', x: 5, y: 0, width: 5, depth: 4 });
  const bed1 = placeFurniture({ wCm: 180, dCm: 200, x: 0.2, y: 0.2, name: 'Bed' });
  const planEntities = [roomA, roomB, bed1];

  store.updateProject(d => {
    d.plan = { entities: JSON.parse(JSON.stringify(planEntities)), savedAt: '2026-09-03T00:00:00.000Z' };
    return d;
  });

  // Real adjacency + efficiency analysis over the persisted plan
  const p1 = store.getProject();
  const entities = p1.plan.entities;
  const adj = checkAdjacency([{ a: 'Room A', b: 'Room B' }], entities.filter(e => e.kind === 'room'));
  assertEqual(adj.satisfiedCount, 1, 'Shared-edge adjacency detected on real rooms');
  const eff = calculateEfficiency(
    entities.filter(e => e.kind === 'room'),
    entities.filter(e => e.kind === 'furniture'),
    0
  );
  assertClose(eff.totalRoomAreaM2, 40, 'Efficiency totals from real geometry');

  // Snapshot option A (linear storage — the P14 hardening)
  const snap = store.createSnapshot('Option A');
  assert(snap.ok, 'Snapshot captured for option A');
  const snapPayload = JSON.stringify(store.getProject().snapshots.find(s => s.id === snap.snapshotId));

  // Mutate to option B (furniture moved out of any room → conflict)
  store.updateProject(d => {
    d.plan.entities[2].x = 50;
    return d;
  });
  const p2 = store.getProject();
  const conflicts = checkOverlaps(
    p2.plan.entities.filter(e => e.kind === 'furniture'),
    p2.plan.entities.filter(e => e.kind === 'room'),
    []
  );
  assert(conflicts.conflicts.some(c => c.type === 'furniture-outside-room'), 'Option B conflict detected by the real checker');

  const snap2 = store.createSnapshot('Option B');
  assert(snap2.ok, 'Second snapshot captured');
  const payload2 = JSON.stringify(store.getProject().snapshots.find(s => s.id === snap2.snapshotId));
  assert(payload2.length < snapPayload.length * 3, `Snapshot embedding stays near-linear (${snapPayload.length} → ${payload2.length} bytes)`);

  // Restore option A: geometry and snapshot payload survive
  const restored = store.restoreSnapshot(snap.snapshotId);
  assert(restored.ok, 'Option A restored');
  assertClose(restored.project.plan.entities[2].x, 0.2, 'Restored plan geometry matches option A');
  assert(store.getProject().snapshots.some(s => s.id === snap.snapshotId && s.project), 'Option A snapshot keeps its restorable payload');

  // AI context over the restored state
  const facts = buildFactsPack(store.getProject(), store.getProject().plan.entities);
  assert(facts.text.includes('Room A'), 'Facts pack built over the restored plan');
  const checked = validateNumericClaims(`Room A is ${roomArea(roomA).toFixed(2)} m².`, facts.factChecks);
  assertEqual(checked.mismatches.length, 0, 'Core-true numeric claim passes fact-checking');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
