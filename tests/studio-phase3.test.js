/**
 * Architecture Helping Hand - Phase 3 Studio Tests
 * Architectural Dimensioning, Dynamic Annotation Styles & Advanced Osnaps.
 */

import {
  calcDimensionGeometry,
  findPerpendicularProjection,
  findExtensionSnap,
  findSegmentIntersections
} from '../src/core/geometry.js';
import {
  createDimension,
  autoDimensionWall,
  DIMENSION_STYLES,
  DIMENSION_ORIENTATIONS,
  DIMENSION_UNITS,
  createWall,
  createDoor,
  createWindow,
  createRoom,
  placeFurniture
} from '../src/core/entities.js';
import { findSnapPoint } from '../src/core/plan-canvas.js';
import { formatFeetInches } from '../src/core/formatter.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

function assertClose(actual, expected, tol = 1e-3, message) {
  if (Math.abs(actual - expected) <= tol) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (expected ~${expected}, got ${actual})`);
  }
}

console.log('\n--- 1. Vector Dimension Drafting Geometry ---');
{
  const p1 = { x: 2.0, y: 3.0 };
  const p2 = { x: 6.0, y: 3.0 }; // 4.0m horizontal span

  // 1a. Aligned mode with offset 0.6m (+y direction)
  const geomAligned = calcDimensionGeometry(p1, p2, {
    offset: 0.6,
    style: 'tick',
    orientation: 'aligned',
    standoff: 0.08,
    overshoot: 0.12
  });

  assertEqual(geomAligned.distance, 4.0, 'Measured distance is 4.0m');
  assertClose(geomAligned.dimLine[0].x, 2.0, 1e-4, 'Dimension line start x is 2.0');
  assertClose(geomAligned.dimLine[0].y, 3.6, 1e-4, 'Dimension line start y is 3.6 (offset 0.6m)');
  assertClose(geomAligned.dimLine[1].x, 6.0, 1e-4, 'Dimension line end x is 6.0');
  assertClose(geomAligned.dimLine[1].y, 3.6, 1e-4, 'Dimension line end y is 3.6');

  // Witness line 1 standoff and overshoot
  assertClose(geomAligned.witness1[0].y, 3.08, 1e-4, 'Witness 1 starts at measured y + standoff (3.08)');
  assertClose(geomAligned.witness1[1].y, 3.72, 1e-4, 'Witness 1 ends at dim line y + overshoot (3.72)');

  // Terminations: architectural 45° ticks
  assertEqual(geomAligned.ticks.length, 2, 'Generates 2 tick lines for endpoints');
  assert(geomAligned.ticks[0].length === 2, 'Tick 1 has 2 points');
  assert(geomAligned.ticks[1].length === 2, 'Tick 2 has 2 points');

  // Text midpoint and reading angle
  assertClose(geomAligned.textMid.x, 4.0, 1e-4, 'Text midpoint x is 4.0');
  assertClose(geomAligned.textMid.y, 3.6, 1e-4, 'Text midpoint y is 3.6');
  assertClose(geomAligned.textAngle, 0, 1e-4, 'Horizontal text angle is 0 deg');

  // 1b. Upright readability: inverted direction (p2 to p1) text angle normalized to [-90, 90]
  const geomInverted = calcDimensionGeometry(p2, p1, { offset: 0.6 });
  assert(geomInverted.textAngle >= -90 && geomInverted.textAngle <= 90, 'Inverted dimension text angle normalized to prevent upside-down text');

  // 1c. Arrowhead style
  const geomArrow = calcDimensionGeometry(p1, p2, { style: 'arrow' });
  assertEqual(geomArrow.arrows.length, 2, 'Generates 2 arrow polygons');
  assertEqual(geomArrow.arrows[0].length, 3, 'Arrow 1 has 3 vertices (closed triangle)');

  // 1d. Dot style
  const geomDot = calcDimensionGeometry(p1, p2, { style: 'dot' });
  assertEqual(geomDot.dots.length, 2, 'Generates 2 circle dots');
  assert(geomDot.dots[0].radius > 0, 'Dot radius is positive');

  // 1e. Horizontal & Vertical orientation modes
  const diagP1 = { x: 1.0, y: 1.0 };
  const diagP2 = { x: 5.0, y: 4.0 }; // dx = 4.0, dy = 3.0, hypot = 5.0
  const geomHoriz = calcDimensionGeometry(diagP1, diagP2, { orientation: 'horizontal', offset: 0.5 });
  assertClose(geomHoriz.distance, 4.0, 1e-4, 'Horizontal orientation measures Delta X = 4.0m');

  const geomVert = calcDimensionGeometry(diagP1, diagP2, { orientation: 'vertical', offset: 0.5 });
  assertClose(geomVert.distance, 3.0, 1e-4, 'Vertical orientation measures Delta Y = 3.0m');
}

console.log('\n--- 2. Advanced Object Snaps (Osnaps) ---');
{
  const wall1 = createWall({ id: 'w1', x1: 0, y1: 5, x2: 10, y2: 5, thickness: 0.2 }); // horizontal y=5
  const wall2 = createWall({ id: 'w2', x1: 4, y1: 0, x2: 4, y2: 10, thickness: 0.2 }); // vertical x=4
  const room = createRoom({ id: 'r1', name: 'Studio', x: 12, y: 2, width: 6, depth: 4 });
  const furn = placeFurniture({ id: 'f1', name: 'Desk', wCm: 160, dCm: 80, x: 20, y: 4 });

  const entities = [wall1, wall2, room, furn];

  // 2a. Intersection Osnap (wall1 crosses wall2 at x=4, y=5)
  const snapInter = findSnapPoint({ x: 4.05, y: 4.95 }, entities, { snapDistance: 0.25, snapGrid: false });
  assertEqual(snapInter.snapped, true, 'Snap detects intersection');
  assertEqual(snapInter.type, 'intersection', 'Snap type is "intersection"');
  assertClose(snapInter.x, 4.0, 1e-4, 'Intersection x snapped exactly to 4.0');
  assertClose(snapInter.y, 5.0, 1e-4, 'Intersection y snapped exactly to 5.0');

  // 2b. Perpendicular Osnap from drafting start point
  // Start drafting at (2.0, 1.0) and aim near wall1 (y=5). The perpendicular foot onto wall1 is (2.0, 5.0).
  const snapPerp = findSnapPoint({ x: 2.05, y: 4.95 }, entities, {
    snapDistance: 0.25,
    snapGrid: false,
    startPoint: { x: 2.0, y: 1.0 }
  });
  assertEqual(snapPerp.snapped, true, 'Snap detects perpendicular target');
  assertEqual(snapPerp.type, 'perpendicular', 'Snap type is "perpendicular"');
  assertClose(snapPerp.x, 2.0, 1e-4, 'Perpendicular foot x is 2.0');
  assertClose(snapPerp.y, 5.0, 1e-4, 'Perpendicular foot y is 5.0');

  // 2c. Collinear Extension Osnap
  // wall1 extends horizontally from 0 to 10 at y=5. Beyond x=10 at (11.5, 5.05):
  const snapExt = findSnapPoint({ x: 11.5, y: 5.05 }, entities, { snapDistance: 0.25, snapGrid: false });
  assertEqual(snapExt.snapped, true, 'Snap detects collinear extension ray');
  assertEqual(snapExt.type, 'extension', 'Snap type is "extension"');
  assertClose(snapExt.y, 5.0, 1e-4, 'Extension ray keeps y=5.0');
  assert(Array.isArray(snapExt.guideRay), 'Extension snap provides guide ray from endpoint');

  // 2d. Center Osnap (Room centroid at 12 + 3 = 15, 2 + 2 = 4)
  const snapCenter = findSnapPoint({ x: 14.95, y: 4.05 }, entities, { snapDistance: 0.25, snapGrid: false });
  assertEqual(snapCenter.snapped, true, 'Snap detects room center');
  assertEqual(snapCenter.type, 'center', 'Snap type is "center"');
  assertClose(snapCenter.x, 15.0, 1e-4, 'Center x is 15.0');
  assertClose(snapCenter.y, 4.0, 1e-4, 'Center y is 4.0');

  // 2e. Osnap filtering: disable intersection snap
  const snapFiltered = findSnapPoint({ x: 4.05, y: 4.95 }, entities, {
    snapDistance: 0.25,
    snapGrid: false,
    osnaps: { intersection: false }
  });
  assert(snapFiltered.type !== 'intersection', 'Disabled Osnap type is bypassed');
}

console.log('\n--- 3. Dimension Entity Factory & Standards ---');
{
  assert(DIMENSION_STYLES.includes('tick'), 'DIMENSION_STYLES includes tick');
  assert(DIMENSION_STYLES.includes('arrow'), 'DIMENSION_STYLES includes arrow');
  assert(DIMENSION_STYLES.includes('dot'), 'DIMENSION_STYLES includes dot');
  assert(DIMENSION_ORIENTATIONS.includes('aligned'), 'DIMENSION_ORIENTATIONS includes aligned');
  assert(DIMENSION_UNITS.includes('m'), 'DIMENSION_UNITS includes m');

  const dim = createDimension({
    name: 'Main Span',
    p1: { x: 1.0, y: 2.0 },
    p2: { x: 7.0, y: 2.0 },
    offset: 0.8,
    style: 'arrow',
    orientation: 'aligned',
    unit: 'mm',
    dualUnit: true
  });

  assertEqual(dim.kind, 'dimension', 'Dimension entity kind is "dimension"');
  assertEqual(dim.offset, 0.8, 'Preserves offset 0.8');
  assertEqual(dim.style, 'arrow', 'Preserves style "arrow"');
  assertEqual(dim.unit, 'mm', 'Preserves unit "mm"');
  assertEqual(dim.dualUnit, true, 'Preserves dualUnit true');
}

console.log('\n--- 4. Wall Auto-Dimensioning (`autoDimensionWall`) ---');
{
  const wall = createWall({ id: 'w-auto', name: 'North Wall', x1: 0, y1: 0, x2: 10, y2: 0, thickness: 0.2 });
  const door = createDoor({ id: 'd1', wallId: 'w-auto', position: 2.0, width: 1.0 });
  const win = createWindow({ id: 'win1', wallId: 'w-auto', position: 6.0, width: 2.0 });

  // 4a. Wall with openings: breaks down into sub-segment chains + overall dimension
  // Segments: [0, 2.0] (solid), [2.0, 3.0] (door), [3.0, 6.0] (solid), [6.0, 8.0] (win), [8.0, 10.0] (solid)
  // Total 5 sub-segments + 1 overall dimension = 6 dimensions!
  const dims = autoDimensionWall(wall, [wall, door, win], { offset: 0.6, overallSpacing: 0.45 });

  assertEqual(dims.length, 6, 'Generates 5 segment dimensions + 1 overall dimension');
  
  // Verify first segment: 0 to 2.0m
  assertClose(dims[0].p1.x, 0, 1e-4, 'Seg 1 p1.x is 0');
  assertClose(dims[0].p2.x, 2.0, 1e-4, 'Seg 1 p2.x is 2.0');
  assertEqual(dims[0].offset, 0.6, 'Chain offset is 0.6m');

  // Verify door opening segment: 2.0 to 3.0m
  assertClose(dims[1].p1.x, 2.0, 1e-4, 'Seg 2 (door) p1.x is 2.0');
  assertClose(dims[1].p2.x, 3.0, 1e-4, 'Seg 2 (door) p2.x is 3.0');

  // Verify window opening segment: 6.0 to 8.0m
  assertClose(dims[3].p1.x, 6.0, 1e-4, 'Seg 4 (window) p1.x is 6.0');
  assertClose(dims[3].p2.x, 8.0, 1e-4, 'Seg 4 (window) p2.x is 8.0');

  // Verify overall dimension: 0 to 10.0m with stacked offset
  const overallDim = dims[5];
  assertClose(overallDim.p1.x, 0, 1e-4, 'Overall p1.x is 0');
  assertClose(overallDim.p2.x, 10.0, 1e-4, 'Overall p2.x is 10.0');
  assertClose(overallDim.offset, 1.05, 1e-4, 'Overall dimension stacked outer offset is 0.6 + 0.45 = 1.05m');

  // 4b. Plain solid wall with no openings: single overall dimension
  const solidWall = createWall({ id: 'w-solid', name: 'Solid Wall', x1: 2, y1: 2, x2: 8, y2: 2, thickness: 0.2 });
  const solidDims = autoDimensionWall(solidWall, [solidWall], { offset: 0.5 });
  assertEqual(solidDims.length, 1, 'Solid wall without openings produces 1 overall dimension');
  assertClose(solidDims[0].p1.x, 2.0, 1e-4, 'Solid dim p1.x is 2.0');
  assertClose(solidDims[0].p2.x, 8.0, 1e-4, 'Solid dim p2.x is 8.0');
}

console.log('\n--- 5. Unit & Dual Unit Formatting ---');
{
  const meters = 3.45;
  const inches = meters / 0.0254;
  const ftIn = formatFeetInches(inches);
  assert(ftIn.includes('11\''), 'Converts 3.45m to 11 feet');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 3 STUDIO TESTS PASSED!\n');
}
