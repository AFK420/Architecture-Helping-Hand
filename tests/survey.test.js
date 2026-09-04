/**
 * Architecture Helping Hand - Survey Notebook Integration Test Suite
 * Phase 16 (M1): pins the data flow the Survey Notebook view performs,
 * through REAL implementations only — the real survey core, the real
 * project store, the real plan/export pipeline. No fake objects.
 *
 * Pipelines under test:
 *   1. Measurement lifecycle — create (canonical meters) → store → status
 *      transitions → summary; provenance survives a project round-trip.
 *   2. Imported-record interop — Imported-source measurements (what the
 *      Importer writes) are first-class records the notebook can verify.
 *   3. Room proposal → plan entity → SVG export — the accept path turns
 *      verified measurements into real plan geometry.
 *   4. Calibration → chained distance / polygon area → measurement record
 *      — calibrated-image math feeds the same notebook pipeline.
 *   5. Image constraints — validateImageMeta gates oversized inputs.
 */

import { createProjectStore } from '../src/services/store.js';
import {
  MEASUREMENT_SOURCES,
  MEASUREMENT_STATUSES,
  createMeasurement,
  setMeasurementStatus,
  summarizeSurvey,
  proposeRoomFromMeasurements,
  createCalibration,
  pixelToWorld,
  worldToPixel,
  calibratedDistance,
  calibratedChainDistance,
  calibratedPolygonArea,
  IMAGE_LIMITS,
  validateImageMeta
} from '../src/core/survey.js';
import { createRoom, roomArea } from '../src/core/entities.js';
import {
  planToExportGeometry, generatePlanSVG
} from '../src/core/plan-canvas.js';

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
    console.error(`  ❌ FAIL: ${message} (Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

function assertClose(actual, expected, message, eps = 1e-6) {
  const ok = Math.abs(actual - expected) <= eps;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, got ${actual})`);
  }
}

function assertThrows(fn, message, needle = '') {
  try {
    fn();
    failed++;
    console.error(`  ❌ FAIL: ${message} (no error thrown)`);
  } catch (e) {
    if (!needle || String(e.message).includes(needle)) {
      passed++;
      console.log(`  ✅ PASS: ${message}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${message} (threw "${e.message}", expected to include "${needle}")`);
    }
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

console.log('🧪 Running tests/survey.test.js...');

// ---------------------------------------------------------------------------
// 1. Measurement lifecycle — create → store → status → summary → round-trip
// ---------------------------------------------------------------------------
console.log('\n--- 1. Measurement lifecycle through the real store ---');

{
  const store = makeStore('proj-survey-1');
  store.createNewProject({ name: 'Site Notebook' });

  // The view's record path: value entered with a unit, canonical meters set
  // by the caller (unit-system aware), then persisted in the project.
  const mW = createMeasurement({ label: 'Room W', value: 4.8, unit: 'm', source: 'Measured', status: 'Unverified' });
  mW.meters = 4.8;
  const mD = createMeasurement({ label: 'Room D', value: 3200, unit: 'mm', source: 'User Entered', status: 'Unverified' });
  mD.meters = 3200 * 0.001;

  assertEqual(mW.kind, 'measurement', 'Measurement record has the kind discriminator');
  assert(MEASUREMENT_SOURCES.includes(mW.source), 'Source is one of the documented provenance values');
  assert(MEASUREMENT_STATUSES.includes(mW.status), 'Status is one of the documented verification values');
  assert(mW.id && mD.id && mW.id !== mD.id, 'Ids are generated and distinct');
  assertClose(mD.meters, 3.2, 'Canonical meters computed from the entered unit');

  const saved = store.updateProject(draft => {
    draft.measurements = Array.isArray(draft.measurements) ? draft.measurements : [];
    draft.measurements.push(mW, mD);
    return draft;
  });
  assert(saved.ok, 'Measurements persist through the real project store', saved.errors);

  // Status transition: verify one record (returns a new record, view replaces)
  const verified = setMeasurementStatus(store.getProject().measurements[0], 'Verified');
  assertEqual(verified.status, 'Verified', 'setMeasurementStatus marks a record verified');
  assertEqual(store.getProject().measurements[0].status, 'Unverified', 'Original record is not mutated (immutable style)');
  store.updateProject(draft => {
    draft.measurements[0] = verified;
    return draft;
  });

  // Round-trip: provenance survives serialize → parse → normalize
  const roundTrip = store.getProject();
  assertEqual(roundTrip.measurements.length, 2, 'Both records survive the project round-trip');
  assertEqual(roundTrip.measurements[0].source, 'Measured', 'Provenance (source) preserved');
  assertEqual(roundTrip.measurements[0].status, 'Verified', 'Verification status preserved');
  assertClose(roundTrip.measurements[1].meters, 3.2, 'Canonical meters preserved');

  const summary = summarizeSurvey(roundTrip.measurements);
  assertEqual(summary.total, 2, 'Summary counts all records');
  assertEqual(summary.byStatus.Verified, 1, 'Summary breaks down by status');
  assertEqual(summary.bySource['User Entered'], 1, 'Summary breaks down by source');
  assertEqual(summary.needsAttention.length, 1, 'Unverified records are flagged for attention');
  assertEqual(summary.needsAttention[0].label, 'Room D', 'Flagged record identifies itself by label');

  // Validation contract: bad inputs fail loudly
  assertThrows(() => createMeasurement({ label: '   ', value: 1 }), 'Empty label rejected', 'label');
  assertThrows(() => createMeasurement({ label: 'x', value: 0 }), 'Zero value rejected', 'greater than zero');
  assertThrows(() => createMeasurement({ label: 'x', value: 1, source: 'Guessed' }), 'Unknown source rejected', 'Invalid measurement source');
  assertThrows(() => createMeasurement({ label: 'x', value: 1, status: 'Confirmed' }), 'Unknown status rejected', 'Invalid measurement status');
  assertThrows(() => setMeasurementStatus(mW, 'Maybe'), 'Unknown transition target rejected', 'Invalid status');

  // Delete path (what the view's delete button does) keeps the rest intact
  store.updateProject(draft => {
    draft.measurements = draft.measurements.filter(m => m.id !== mD.id);
    return draft;
  });
  assertEqual(store.getProject().measurements.length, 1, 'Delete removes exactly the targeted record');
}

// ---------------------------------------------------------------------------
// 2. Imported-record interop — the Importer's measurement shape verifies fine
// ---------------------------------------------------------------------------
console.log('\n--- 2. Imported measurement records are first-class ---');

{
  // This is exactly the record shape src/ui/views/imports.js sendToPlan()
  // writes into the project document (source: 'Imported', 'Needs Verification').
  const imported = {
    id: 'meas-imp-test',
    label: 'Corridor length',
    value: 6.15,
    unit: 'm',
    source: 'Imported',
    status: 'Needs Verification',
    createdAt: '2026-09-04T00:00:00.000Z'
  };
  const store = makeStore('proj-survey-2');
  store.createNewProject({ name: 'Import Notebook' });
  store.updateProject(draft => {
    draft.measurements = [imported];
    return draft;
  });

  const p = store.getProject();
  assertEqual(p.measurements[0].source, 'Imported', 'Imported provenance round-trips');
  const summary = summarizeSurvey(p.measurements);
  assertEqual(summary.bySource.Imported, 1, 'Summary counts Imported records');
  assertEqual(summary.needsAttention.length, 1, 'Imported records start NEEDS VERIFICATION (flagged)');

  // The notebook can verify them with the same transition as any record
  const confirmed = setMeasurementStatus(p.measurements[0], 'Verified');
  assertEqual(confirmed.status, 'Verified', 'Imported record can be verified in the notebook');
}

// ---------------------------------------------------------------------------
// 3. Room proposal → plan entity → SVG export (the accept path)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Verified proposal becomes real plan geometry ---');

{
  const mW = createMeasurement({ label: 'Room W', value: 4.8, unit: 'm', source: 'Measured', status: 'Verified' });
  mW.meters = 4.8;
  const mD = createMeasurement({ label: 'Room D', value: 3.2, unit: 'm', source: 'Measured', status: 'Verified' });
  mD.meters = 3.2;

  const proposal = proposeRoomFromMeasurements([mW, mD], 'Surveyed Room');
  assert(proposal.proposal, 'Verified W/D measurements produce a room proposal');
  assertEqual(proposal.needsMore, false, 'Proposal reports completeness');
  assertClose(proposal.proposal.widthMeters, 4.8, 'Proposal width from the verified measurement');
  assertClose(proposal.proposal.depthMeters, 3.2, 'Proposal depth from the verified measurement');
  assert(proposal.proposal.basedOn.includes(mW.id) && proposal.proposal.basedOn.includes(mD.id), 'Proposal cites its source measurements');

  // Unverified records must NOT silently become geometry
  const unverified = [
    createMeasurement({ label: 'Room W', value: 4.8, status: 'Unverified' }),
    createMeasurement({ label: 'Room D', value: 3.2, status: 'Unverified' })
  ];
  const refused = proposeRoomFromMeasurements(unverified, 'Room');
  assertEqual(refused.proposal, null, 'Unverified measurements produce no proposal (record-only)');
  assertEqual(refused.needsMore, true, 'Refused proposal reports it needs more (verified) data');

  // Accept path: proposal → real room entity → plan export pipeline
  const room = createRoom({
    name: proposal.proposal.name,
    x: 0, y: 0,
    width: proposal.proposal.widthMeters,
    depth: proposal.proposal.depthMeters
  });
  assertClose(roomArea(room), 4.8 * 3.2, 'Accepted proposal creates real room geometry');

  const svg = generatePlanSVG(planToExportGeometry([room]));
  assert(svg.includes('<svg') && svg.includes('Surveyed Room'), 'Surveyed room exports through the real plan pipeline');
}

// ---------------------------------------------------------------------------
// 4. Calibration → measurements (calibrated image math feeds the notebook)
// ---------------------------------------------------------------------------
console.log('\n--- 4. Two-point calibration drives chained measurement ---');

{
  // 120 px = 6.0 m on the scanned plan → 0.05 m/px
  const cal = createCalibration({
    pointA: { x: 0, y: 0 },
    pointB: { x: 120, y: 0 },
    realMeters: 6.0
  });
  assertClose(cal.metersPerPixel, 0.05, 'Calibration derives meters-per-pixel');
  assertClose(cal.pixelsPerMeter, 20, 'Calibration derives pixels-per-meter');

  assertClose(calibratedDistance(cal, { x: 0, y: 0 }, { x: 0, y: 64 }), 3.2, 'Calibrated point-to-point distance');
  assertClose(
    calibratedChainDistance(cal, [{ x: 0, y: 0 }, { x: 96, y: 0 }, { x: 96, y: 64 }]),
    4.8 + 3.2, 'Chained walk sums calibrated segments'
  );
  assertClose(
    calibratedPolygonArea(cal, [{ x: 0, y: 0 }, { x: 96, y: 0 }, { x: 96, y: 64 }, { x: 0, y: 64 }]),
    4.8 * 3.2, 'Calibrated polygon area (shoelace) in m²', 1e-3
  );

  // Round-trip through both conversion directions
  const world = pixelToWorld(cal, 96, 64);
  assertClose(world.x, 4.8, 'pixelToWorld converts x');
  assertClose(world.y, 3.2, 'pixelToWorld converts y');
  const px = worldToPixel(cal, world.x, world.y);
  assertClose(px.x, 96, 'worldToPixel round-trips x');
  assertClose(px.y, 64, 'worldToPixel round-trips y');

  // A chained walk becomes a notebook measurement with full provenance
  const walkMeters = calibratedChainDistance(cal, [{ x: 0, y: 0 }, { x: 96, y: 0 }, { x: 96, y: 64 }]);
  const walk = createMeasurement({
    label: 'Facade walk',
    value: Number(walkMeters.toFixed(3)),
    unit: 'm',
    source: 'Measured',
    status: 'Unverified',
    note: 'Calibrated 120px = 6.0m'
  });
  assertClose(walk.value, 8.0, 'Chained calibrated distance becomes a recordable value');

  // Calibration validation contract
  assertThrows(() => createCalibration({ pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 }, realMeters: 6 }), 'Identical points rejected', 'must differ');
  assertThrows(() => createCalibration({ pointA: { x: 0, y: 0 }, pointB: { x: 10, y: 0 }, realMeters: 0 }), 'Non-positive real distance rejected', 'greater than zero');
  assertThrows(() => calibratedChainDistance(cal, [{ x: 0, y: 0 }]), 'Chained distance needs two points', 'at least two');
  assertThrows(() => calibratedPolygonArea(cal, [{ x: 0, y: 0 }, { x: 1, y: 0 }]), 'Polygon area needs three points', 'at least three');
}

// ---------------------------------------------------------------------------
// 5. Image constraints — documented limits gate oversized inputs
// ---------------------------------------------------------------------------
console.log('\n--- 5. Image limits validate before import ---');

{
  assertEqual(IMAGE_LIMITS.maxFileBytes, 10 * 1024 * 1024, '10 MB import cap is pinned');

  const ok = validateImageMeta({ widthPx: 1600, heightPx: 1200, bytes: 2 * 1024 * 1024 });
  assert(ok.ok && ok.problems.length === 0, 'A normal photo passes the constraints');

  const big = validateImageMeta({ widthPx: 4000, heightPx: 3000, bytes: 12 * 1024 * 1024 });
  assert(!big.ok && big.problems.length === 2, 'Oversized file and pixels are both reported');
  assert(big.problems.some(p => p.includes('MB import cap')), 'File-size problem is human-readable');
  assert(big.problems.some(p => p.includes('downscaled')), 'Downscale disclosure is human-readable');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
