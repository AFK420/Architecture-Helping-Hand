/**
 * Architecture Helping Hand - Space Planning, Survey, Calibration &
 * Annotations Test Suite (Phases 5-8). Real engines; the plan fixtures come
 * from the real entity factories, the furniture footprints from the real
 * catalog, the calibration from pure math.
 */

import {
  DEFAULT_CLEARANCES,
  checkFurnitureFit, checkClearance, checkOverlaps, checkAdjacency,
  calculateEfficiency, compareLayouts, checkCorridorWidth
} from '../src/core/space-planning.js';
import {
  MEASUREMENT_SOURCES, MEASUREMENT_STATUSES,
  createMeasurement, setMeasurementStatus, summarizeSurvey, proposeRoomFromMeasurements,
  createCalibration, pixelToWorld, worldToPixel, calibratedDistance,
  calibratedChainDistance, calibratedPolygonArea, IMAGE_LIMITS, validateImageMeta
} from '../src/core/survey.js';
import {
  ANNOTATION_KINDS, createAnnotation, moveAnnotation, annotationLength, validateAnnotations
} from '../src/core/annotations.js';
import { createRoom, createWall, placeFurniture } from '../src/core/entities.js';
import { FURNITURE_DATABASE } from '../src/core/furniture.js';

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

function assertClose(actual, expected, message, eps = 1e-9) {
  const ok = Math.abs(actual - expected) < eps;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, Received: ${actual})`);
  }
}

console.log('🧪 Running tests/space-planning.test.js...');

// Real fixtures
const room = createRoom({ name: 'Bedroom', x: 0, y: 0, width: 4.0, depth: 3.5 });
const item = FURNITURE_DATABASE.find(f => f.wCm && f.dCm);
const bed = placeFurniture({ catalogId: item.id, displayName: item.name, wCm: 160, dCm: 200, x: 0.2, y: 0.2 });
const desk = placeFurniture({ wCm: 120, dCm: 60, x: 2.5, y: 2.5, name: 'Desk' });
const outside = placeFurniture({ wCm: 80, dCm: 80, x: 10, y: 10, name: 'Lost Chair' });
const wall = createWall({ x1: 0, y1: 0, x2: 4.0, y2: 0, thickness: 0.2, name: 'North' });

// ---------------------------------------------------------------------------
// 1. Furniture fit
// ---------------------------------------------------------------------------
console.log('\n--- 1. Furniture fit ---');

{
  const fits = checkFurnitureFit(bed, room);
  assertEqual(fits.verdict, 'fits', 'Bed inside room → fits');
  assertClose(fits.evidence.marginWest, 0.2, 'Evidence includes real margins');

  const part = checkFurnitureFit(placeFurniture({ wCm: 160, dCm: 200, x: -0.5, y: 0 }), room);
  assertEqual(part.verdict, 'partial', 'Protruding furniture → partial');

  const none = checkFurnitureFit(outside, room);
  assertEqual(none.verdict, 'no-fit', 'Distant furniture → no-fit');
  assert(none.evidence.reason.includes('outside'), 'No-fit evidence explains');
}

// ---------------------------------------------------------------------------
// 2. Clearances
// ---------------------------------------------------------------------------
console.log('\n--- 2. Clearances ---');

{
  const c = checkClearance(desk, room, DEFAULT_CLEARANCES.deskChair, 'Educational Reference');
  assertEqual(c.satisfied, false, 'Desk at x=2.5 breaches the 0.75m east/north envelope (4-2.5-1.2 < 0)');
  assertEqual(c.clearanceLabel, 'Educational Reference', 'Clearance labelled (not legal)');
  assert(c.evidence.reason.includes('breaches'), 'Breach explained with margins');

  const placedWell = placeFurniture({ wCm: 120, dCm: 60, x: 1.0, y: 1.0, name: 'Desk Centered' });
  const ok = checkClearance(placedWell, room, 0.75, 'Educational Reference');
  assert(ok.satisfied, 'Desk with 1m margins satisfies the 0.75m envelope');

  const breach = checkClearance(bed, room, 0.5);
  assert(breach.satisfied === false, 'Bed at 0.2m margin breaches 0.5m envelope');
  assert(breach.evidence.reason.includes('breaches'), 'Breach explained');

  const tinyRoom = createRoom({ name: 'Tiny', x: 0, y: 0, width: 1.0, depth: 1.0 });
  const impossible = checkClearance(desk, tinyRoom, 1.0);
  assert(!impossible.satisfied && impossible.evidence.reason.includes('smaller'), 'Room smaller than envelope honestly reported');
}

// ---------------------------------------------------------------------------
// 3. Overlaps
// ---------------------------------------------------------------------------
console.log('\n--- 3. Overlap detection ---');

{
  const overlapping = placeFurniture({ wCm: 120, dCm: 60, x: 0.5, y: 0.5, name: 'Overlap Chair' });
  const res = checkOverlaps([bed, overlapping, desk], [room], [wall]);
  const fuf = res.conflicts.find(c => c.type === 'furniture-furniture');
  assert(fuf, 'Furniture/furniture overlap detected');
  assert(fuf.evidence.includes('Overlap Chair'), 'Overlap evidence names the pieces');

  const resWall = checkOverlaps([placeFurniture({ wCm: 100, dCm: 100, x: -0.3, y: -0.3, name: 'Wall Crunch' })], [room], [wall]);
  assert(resWall.conflicts.some(c => c.type === 'furniture-wall'), 'Furniture/wall overlap detected');

  const resOut = checkOverlaps([outside], [room], []);
  assert(resOut.conflicts.some(c => c.type === 'furniture-outside-room'), 'Furniture outside any room flagged');

  const clean = checkOverlaps([desk], [room], [wall]);
  assertEqual(clean.count, 0, 'Clean layout has zero conflicts');
}

// ---------------------------------------------------------------------------
// 4. Adjacency
// ---------------------------------------------------------------------------
console.log('\n--- 4. Adjacency ---');

{
  const kitchen = createRoom({ name: 'Kitchen', x: 4.0, y: 0, width: 3.0, depth: 3.5 });
  const dining = createRoom({ name: 'Dining', x: 4.0, y: 3.5, width: 3.0, depth: 3.0 });
  const res = checkAdjacency([
    { a: 'Kitchen', b: 'Dining', label: 'cook-serve' },
    { a: 'Bedroom', b: 'Dining', label: 'should NOT touch' }
  ], [room, kitchen, dining]);
  assertEqual(res.results[0].satisfied, true, 'Touching rooms satisfy adjacency');
  assertEqual(res.results[1].satisfied, false, 'Separated rooms fail adjacency');
  assert(res.results[0].evidence.includes('share an edge'), 'Evidence present');
  assertEqual(res.satisfiedCount, 1, 'Satisfied count');
}

// ---------------------------------------------------------------------------
// 5. Efficiency & comparison
// ---------------------------------------------------------------------------
console.log('\n--- 5. Efficiency & layout comparison ---');

{
  const eff = calculateEfficiency([room], [bed, desk], 0);
  assertClose(eff.totalRoomAreaM2, 14, 'Total room area 4×3.5');
  assertClose(eff.occupiedAreaM2, 1.6 * 2.0 + 1.2 * 0.6, 'Occupied area from real furniture');
  assertClose(eff.occupancyPercent, (eff.occupiedAreaM2 / 14) * 100, 'Occupancy percent');
  assert(eff.formulaNotes.usableArea.includes('totalRoomArea'), 'Formulas documented');
}

{
  const cmp = compareLayouts([
    { label: 'Option A', rooms: [room], furniture: [bed], conflicts: 1 },
    { label: 'Option B', rooms: [room], furniture: [bed, desk], conflicts: 0 }
  ]);
  assertEqual(cmp.rows.length, 2, 'Comparison rows for both options');
  assertEqual(cmp.fewestConflicts, 'Option B', 'Fewest-conflicts option identified');
  assert(cmp.note.includes('not judged'), 'Comparison shows differences, not verdicts');
}

{
  const corridor = { name: 'corridor', x: 0, y: 0, width: 1.1, depth: 5 };
  const cc = checkCorridorWidth(corridor, [], 0.9);
  assert(cc.clear, '1.1 m corridor passes the 0.9 m minimum');
  const blocked = checkCorridorWidth(corridor, [{ name: 'Radiator', x: 0.5, y: 1, width: 0.4, depth: 0.6 }], 0.9);
  assert(!blocked.clear && blocked.obstructionCount === 1, 'Obstructed corridor flagged');
}

// ---------------------------------------------------------------------------
// 6. Survey measurements
// ---------------------------------------------------------------------------
console.log('\n--- 6. Survey notebook ---');

{
  const m = createMeasurement({ label: 'Wall A', value: 4.85, unit: 'm', source: 'Measured', status: 'Verified' });
  assertEqual(m.source, 'Measured', 'Provenance source stored');
  assertEqual(m.status, 'Verified', 'Verification status stored');
  assert(m.timestamp, 'Timestamp preserved');

  let threw = false;
  try { createMeasurement({ label: 'X', value: -1 }); } catch (e) { threw = true; }
  assert(threw, 'Negative measurement rejected');
  threw = false;
  try { createMeasurement({ label: 'X', value: 1, source: 'Guessed' }); } catch (e) { threw = true; }
  assert(threw, 'Invalid source rejected');
  threw = false;
  try { createMeasurement({ label: 'X', value: 1, status: 'Maybe' }); } catch (e) { threw = true; }
  assert(threw, 'Invalid status rejected');

  const updated = setMeasurementStatus(m, 'Needs Review');
  assertEqual(updated.status, 'Needs Review', 'Status update returns new record');
  assertEqual(m.status, 'Verified', 'Original unchanged (immutable update)');
}

{
  const survey = [
    createMeasurement({ label: 'Room W', value: 4.2, status: 'Verified' }),
    createMeasurement({ label: 'Room D', value: 3.1, status: 'Unverified' }),
    createMeasurement({ label: 'Window', value: 1.5, source: 'Estimated', status: 'Needs Review' })
  ];
  const summary = summarizeSurvey(survey);
  assertEqual(summary.total, 3, 'Survey summary counts');
  assertEqual(summary.byStatus.Unverified, 1, 'Status breakdown');
  assertEqual(summary.needsAttention.length, 2, 'Non-verified flagged');

  const proposal = proposeRoomFromMeasurements(survey, 'Studio Room');
  // Verified-only contract (Phase 16): the W record verifies; D is
  // unverified and must NOT silently become geometry.
  assertEqual(proposal.proposal, null, 'Unverified depth produces no proposal (verified-only)');
  assertEqual(proposal.needsMore, true, 'Proposal reports it needs more verified data');
  assertEqual(proposal.unverifiedCount, 2, 'Unverified count surfaces');

  // Verifying the depth record completes the proposal.
  const dVerified = setMeasurementStatus(survey[1], 'Verified');
  const complete = proposeRoomFromMeasurements([survey[0], dVerified], 'Studio Room');
  assert(complete.proposal, 'Room proposal produced once both W/D are verified');
  assertClose(complete.proposal.widthMeters, 4.2, 'Proposal width from W measurement');
  assertClose(complete.proposal.depthMeters, 3.1, 'Proposal depth from verified D measurement');
  assert(complete.proposal.note.includes('Proposal only'), 'Proposal explicitly non-destructive');
  assertEqual(complete.unverifiedCount, 0, 'No unverified records remain');
}

// ---------------------------------------------------------------------------
// 7. Calibration math (pure)
// ---------------------------------------------------------------------------
console.log('\n--- 7. Image calibration ---');

{
  // 100 px = 2 m → 0.02 m/px
  const cal = createCalibration({ pointA: { x: 0, y: 0 }, pointB: { x: 100, y: 0 }, realMeters: 2 });
  assertClose(cal.metersPerPixel, 0.02, 'Scale = real / pixels');
  assertClose(cal.pixelsPerMeter, 50, 'Inverse scale');

  const world = pixelToWorld(cal, 150, 40);
  assertClose(world.x, 3.0, 'Pixel → world x');
  assertClose(world.y, 0.8, 'Pixel → world y');
  const px = worldToPixel(cal, 3, 0.8);
  assertClose(px.x, 150, 'World → pixel round-trip x');
  assertClose(px.y, 40, 'World → pixel round-trip y');

  assertClose(calibratedDistance(cal, { x: 0, y: 0 }, { x: 100, y: 0 }), 2.0, 'Calibrated point-to-point distance');
  assertClose(calibratedChainDistance(cal, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]), 4.0, 'Chained distance sums segments');
  assertClose(calibratedPolygonArea(cal, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]), 4.0, 'Shoelace polygon area in m² (2m × 2m)');

  let threw = false;
  try { createCalibration({ pointA: { x: 1, y: 1 }, pointB: { x: 1, y: 1 }, realMeters: 2 }); } catch (e) { threw = true; }
  assert(threw, 'Identical calibration points rejected');
  threw = false;
  try { createCalibration({ pointA: { x: 0, y: 0 }, pointB: { x: 1, y: 0 }, realMeters: 0 }); } catch (e) { threw = true; }
  assert(threw, 'Zero real distance rejected');
}

{
  // Image limits validation
  const ok = validateImageMeta({ widthPx: 1800, heightPx: 1200, bytes: 2 * 1024 * 1024 });
  assert(ok.ok, 'Within-limits image accepted');
  const big = validateImageMeta({ widthPx: 4000, heightPx: 3000, bytes: 12 * 1024 * 1024 });
  assert(!big.ok && big.problems.length === 2, 'Oversized image reports both downscale and cap');
  assert(big.limits.storageNote.includes('IndexedDB'), 'Storage note: blobs belong in IndexedDB, not localStorage');
}

// ---------------------------------------------------------------------------
// 8. Annotations
// ---------------------------------------------------------------------------
console.log('\n--- 8. Annotations ---');

{
  const dim = createAnnotation({ kind: 'dimension', x: 0, y: 0, x2: 4.8, y2: 0, layer: 'plan' });
  assert(dim.id.startsWith('ann-'), 'Annotation id');
  assertClose(annotationLength(dim), 4.8, 'Dimension length measured from its own geometry');

  const text = createAnnotation({ kind: 'text', x: 1, y: 1, text: 'Courtyard' });
  assertEqual(text.annotationKind, 'text', 'Text annotation stored');

  const note = createAnnotation({ kind: 'note', x: 2, y: 2, text: 'Check sill height' });
  assertEqual(note.text, 'Check sill height', 'Note marker carries text');

  const circle = createAnnotation({ kind: 'circle', x: 0, y: 0, x2: 1.5 });
  assertClose(circle.x2, 1.5, 'Circle radius stored in x2');

  let threw = false;
  try { createAnnotation({ kind: 'blob', x: 0, y: 0 }); } catch (e) { threw = true; }
  assert(threw, 'Unknown annotation kind rejected');
  threw = false;
  try { createAnnotation({ kind: 'text', x: 0, y: 0, text: '' }); } catch (e) { threw = true; }
  assert(threw, 'Empty text rejected');
  threw = false;
  try { createAnnotation({ kind: 'circle', x: 0, y: 0, x2: -1 }); } catch (e) { threw = true; }
  assert(threw, 'Negative radius rejected');

  const moved = moveAnnotation(dim, 1, 2);
  assertClose(moved.x, 1, 'Move shifts anchor');
  assertClose(moved.x2, 5.8, 'Move shifts end too');
  assertClose(moved.y2, 2, 'Move shifts end y');
  assertClose(dim.x, 0, 'Original annotation unchanged (immutable move)');

  const validation = validateAnnotations([dim, { kind: 'blob' }, { kind: 'text', text: '' }]);
  assert(!validation.valid && validation.errors.length === 2, 'validateAnnotations reports precise errors without throwing');
}

{
  // Undo/redo of annotation add via the plan history (integration with Phase 3)
  const { createHistory, entityAddRemoveCommand } = await import('../src/core/plan-canvas.js');
  const history = createHistory(20);
  const list = [];
  const ann = createAnnotation({ kind: 'arrow', x: 0, y: 0, x2: 1, y2: 1 });
  const cmd = entityAddRemoveCommand(list, ann, 'add arrow annotation');
  cmd.redo();
  history.push(cmd);
  assertEqual(list.length, 1, 'Annotation added through the command stack');
  history.undo();
  assertEqual(list.length, 0, 'Annotation undo works');
  history.redo();
  assertEqual(list.length, 1, 'Annotation redo works');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
