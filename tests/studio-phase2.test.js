/**
 * Architecture Helping Hand - Phase 2: Parametric Wall Assembly & Intelligent Joinery Engine Tests
 * Validates:
 *   1. Vector intersection math (intersectLines, intersectSegments, projectPointOnSegment)
 *   2. Wall solid span punching around openings (punchWallSpans)
 *   3. Intelligent wall joinery auto-healing (calcWallJunctions: L-miter corners & T-stem butt trims)
 *   4. Wall assembly catalog (WALL_ASSEMBLIES multi-layer definitions)
 *   5. CAD door swing geometry & sweep calculations (calcDoorCADGeometry)
 *   6. CAD window geometry, sills, and glazing panes (calcWindowCADGeometry)
 *   7. Wall openings query helper (wallOpenings)
 */

import {
  intersectLines,
  intersectSegments,
  projectPointOnSegment,
  punchWallSpans,
  calcWallJunctions,
  calcDoorCADGeometry,
  calcWindowCADGeometry,
  calcWallPolygon
} from '../src/core/geometry.js';

import {
  WALL_ASSEMBLIES,
  createWall,
  createDoor,
  createWindow,
  wallOpenings
} from '../src/core/entities.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

function approxEqual(a, b, epsilon = 0.002) {
  return Math.abs(a - b) < epsilon;
}

console.log('🧪 Running tests/studio-phase2.test.js...');

// =============================================================================
// 1. Vector Line & Segment Intersections
// =============================================================================
console.log('\n--- 1. Vector Intersections & Projections ---');

{
  // Perpendicular line intersection
  const pt1 = intersectLines({ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 5, y: 0 }, { x: 5, y: 10 });
  assert(pt1 !== null, 'intersectLines finds intersection between perpendicular lines');
  assert(approxEqual(pt1.x, 5) && approxEqual(pt1.y, 5), 'Intersection point is (5, 5)', pt1);

  // Parallel lines (no intersection)
  const ptParallel = intersectLines({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 2 }, { x: 10, y: 2 });
  assert(ptParallel === null, 'intersectLines returns null for parallel lines', ptParallel);

  // Finite segment intersection
  const segCross = intersectSegments({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
  assert(segCross !== null, 'intersectSegments detects crossing segments');
  assert(approxEqual(segCross.x, 5) && approxEqual(segCross.y, 5), 'Crossing point is (5, 5)', segCross);

  const segNoCross = intersectSegments({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 6, y: 6 }, { x: 10, y: 10 });
  assert(segNoCross === null, 'intersectSegments returns null for disjoint collinear segments', segNoCross);

  // Point projection on segment
  const proj1 = projectPointOnSegment({ x: 5, y: 8 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert(approxEqual(proj1.point.x, 5) && approxEqual(proj1.point.y, 0), 'Projected point lands on segment centerline (5, 0)', proj1.point);
  assert(approxEqual(proj1.distance, 8), 'Perpendicular distance is 8m', proj1.distance);
  assert(approxEqual(proj1.t, 0.5), 'Normalized t coordinate is 0.5', proj1.t);

  const projClamp = projectPointOnSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert(approxEqual(projClamp.point.x, 10), 'Clamped projection lands on segment endpoint', projClamp.point);
  assert(approxEqual(projClamp.t, 1.0), 'Normalized t clamped to 1.0', projClamp.t);
}

// =============================================================================
// 2. Wall Core Punching (punchWallSpans)
// =============================================================================
console.log('\n--- 2. Dynamic Wall Punching ---');

{
  // Solid wall without openings
  const spans0 = punchWallSpans(5.0, []);
  assert(spans0.length === 1, 'Wall without openings has 1 span', spans0.length);
  assert(spans0[0].start === 0 && spans0[0].end === 5.0, 'Span covers entire wall length 0 to 5.0m', spans0[0]);

  // Wall with 1 door centered: length 5.0m, door @ 2.0m, width 1.0m
  const spans1 = punchWallSpans(5.0, [{ position: 2.0, width: 1.0 }]);
  assert(spans1.length === 2, 'Wall with 1 opening splits into 2 solid spans', spans1.length);
  assert(approxEqual(spans1[0].start, 0) && approxEqual(spans1[0].end, 2.0), 'First span is 0 to 2.0m', spans1[0]);
  assert(approxEqual(spans1[1].start, 3.0) && approxEqual(spans1[1].end, 5.0), 'Second span is 3.0m to 5.0m', spans1[1]);

  // Wall with 2 openings: door @ 1.0m (w=0.9), window @ 3.0m (w=1.2)
  const spans2 = punchWallSpans(6.0, [
    { position: 1.0, width: 0.9 },
    { position: 3.0, width: 1.2 }
  ]);
  assert(spans2.length === 3, 'Wall with 2 openings splits into 3 solid spans', spans2.length);
  assert(approxEqual(spans2[0].end, 1.0), 'Span 1 ends at 1.0m', spans2[0]);
  assert(approxEqual(spans2[1].start, 1.9) && approxEqual(spans2[1].end, 3.0), 'Span 2 spans 1.9m to 3.0m', spans2[1]);
  assert(approxEqual(spans2[2].start, 4.2) && approxEqual(spans2[2].end, 6.0), 'Span 3 spans 4.2m to 6.0m', spans2[2]);

  // Overlapping openings merged cleanly
  const spansOverlap = punchWallSpans(5.0, [
    { position: 1.0, width: 1.5 },
    { position: 2.0, width: 1.5 }
  ]);
  assert(spansOverlap.length === 2, 'Overlapping openings merged into single cutout', spansOverlap.length);
  assert(approxEqual(spansOverlap[0].end, 1.0), 'First span ends at 1.0m', spansOverlap[0]);
  assert(approxEqual(spansOverlap[1].start, 3.5), 'Second span resumes after merged cutout @ 3.5m', spansOverlap[1]);
}

// =============================================================================
// 3. Parametric Wall Assemblies Catalog
// =============================================================================
console.log('\n--- 3. Parametric Wall Assemblies Catalog ---');

{
  const ids = Object.keys(WALL_ASSEMBLIES);
  assert(ids.length === 5, 'WALL_ASSEMBLIES has 5 standard assemblies', ids.length);
  assert(ids.includes('generic-200'), 'Catalog includes generic-200');
  assert(ids.includes('interior-partition-100'), 'Catalog includes interior-partition-100');
  assert(ids.includes('interior-masonry-150'), 'Catalog includes interior-masonry-150');
  assert(ids.includes('exterior-cavity-265'), 'Catalog includes exterior-cavity-265');
  assert(ids.includes('concrete-structural-250'), 'Catalog includes concrete-structural-250');

  // Verify layer thicknesses sum to totalThickness for exterior cavity wall
  const extCav = WALL_ASSEMBLIES['exterior-cavity-265'];
  const layerSum = extCav.layers.reduce((sum, l) => sum + l.thickness, 0);
  assert(approxEqual(layerSum, extCav.totalThickness), 'Exterior cavity layers sum exactly to totalThickness (265mm)', layerSum);
  assert(extCav.layers.some(l => l.hatch === 'brick'), 'Exterior cavity includes brick hatch layer');
  assert(extCav.layers.some(l => l.hatch === 'insulation'), 'Exterior cavity includes insulation hatch layer');

  // createWall derives thickness from assembly
  const wBrick = createWall({ x1: 0, y1: 0, x2: 5, y2: 0, assemblyId: 'exterior-cavity-265' });
  assert(approxEqual(wBrick.thickness, 0.265), 'createWall derives 0.265m thickness from exterior-cavity-265', wBrick.thickness);
  assert(wBrick.assemblyId === 'exterior-cavity-265', 'createWall preserves assemblyId', wBrick.assemblyId);

  const wStud = createWall({ x1: 0, y1: 0, x2: 4, y2: 0, assemblyId: 'interior-partition-100' });
  assert(approxEqual(wStud.thickness, 0.10), 'createWall derives 0.10m thickness from interior-partition-100', wStud.thickness);
}

// =============================================================================
// 4. Intelligent Wall Joinery Engine (calcWallJunctions)
// =============================================================================
console.log('\n--- 4. Intelligent Wall Joinery (L-Miter & T-Butt) ---');

{
  // 4.1 L-Junction Corner Miter: East wall meets North wall at (5, 5)
  // Wall 1: (0, 5) -> (5, 5), thickness 0.2m
  // Wall 2: (5, 5) -> (5, 10), thickness 0.2m
  const w1 = createWall({ id: 'w-east', x1: 0, y1: 5, x2: 5, y2: 5, thickness: 0.2 });
  const w2 = createWall({ id: 'w-north', x1: 5, y1: 5, x2: 5, y2: 10, thickness: 0.2 });

  const junctionsL = calcWallJunctions([w1, w2]);
  assert(junctionsL.has('w-east') && junctionsL.has('w-north'), 'calcWallJunctions produces entries for both corner walls');

  const junc1 = junctionsL.get('w-east');
  assert(junc1.junctions.length > 0, 'Wall 1 has detected junction');
  assert(junc1.junctions[0].type === 'L', 'Corner junction correctly identified as L-junction', junc1.junctions[0].type);
  assert(junc1.junctions[0].otherWallId === 'w-north', 'Identifies w-north as other wall in L-corner');

  // Miter coordinates verification
  const miterA = junc1.junctions[0].miterA;
  const miterB = junc1.junctions[0].miterB;
  assert(miterA !== undefined && miterB !== undefined, 'L-junction generates miterA and miterB coordinate points');

  // 4.2 T-Junction Stem Butt Trim:
  // Host Wall: (0, 0) -> (10, 0), thickness 0.2m (y from -0.1 to +0.1)
  // Stem Wall: (5, 0) -> (5, 6), thickness 0.2m
  const wHost = createWall({ id: 'w-host', x1: 0, y1: 0, x2: 10, y2: 0, thickness: 0.2 });
  const wStem = createWall({ id: 'w-stem', x1: 5, y1: 0, x2: 5, y2: 6, thickness: 0.2 });

  const junctionsT = calcWallJunctions([wHost, wStem]);
  const juncStem = junctionsT.get('w-stem');
  assert(juncStem.junctions.length > 0, 'Stem wall detects T-junction against host');
  assert(juncStem.junctions[0].type === 'T', 'Identified as T-junction', juncStem.junctions[0].type);
  assert(juncStem.junctions[0].isStem === true, 'Stem wall recognized as incoming stem');
  assert(juncStem.junctions[0].hostWallId === 'w-host', 'Host wall correctly identified');

  // Stem endpoint trimmed back by host wall half-thickness (0.10m)
  assert(approxEqual(juncStem.trimmed.y1, 0.10), 'Stem wall start endpoint trimmed back to y=0.10m abutting host face', juncStem.trimmed.y1);
  assert(approxEqual(juncStem.trimmed.y2, 6.0), 'Stem wall end endpoint remains at y=6.0m', juncStem.trimmed.y2);
}

// =============================================================================
// 5. CAD Door Geometry & Vector Swing Arc (calcDoorCADGeometry)
// =============================================================================
console.log('\n--- 5. CAD Door Geometry & Arc Calculations ---');

{
  const wallH = createWall({ x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.2 });

  // Single door left swing
  const doorLeft = createDoor({ wallId: wallH.id, position: 1.5, width: 0.9, swing: 'left', flipSide: false });
  const geomLeft = calcDoorCADGeometry(wallH, doorLeft);

  assert(geomLeft.type === 'single', 'Door geometry type is single');
  assert(approxEqual(geomLeft.width, 0.9), 'Door width is 0.9m', geomLeft.width);
  assert(approxEqual(geomLeft.hinge.x, 1.5) && approxEqual(geomLeft.hinge.y, 0), 'Hinge is at (1.5, 0)', geomLeft.hinge);
  assert(approxEqual(geomLeft.closedEnd.x, 2.4) && approxEqual(geomLeft.closedEnd.y, 0), 'Closed end is at (2.4, 0)', geomLeft.closedEnd);
  assert(approxEqual(geomLeft.radius, 0.9), 'Arc radius is 0.9m', geomLeft.radius);

  // Normal for wall (0,0)->(5,0) is (0, 1)
  assert(approxEqual(geomLeft.openEnd.x, 1.5) && approxEqual(geomLeft.openEnd.y, 0.9), 'Open leaf tip is at (1.5, 0.9)', geomLeft.openEnd);
  assert(geomLeft.jamb1Line.length === 2 && geomLeft.jamb2Line.length === 2, 'Generates jamb return lines across thickness');

  // Single door flipSide (outward normal reversal)
  const doorFlipped = createDoor({ wallId: wallH.id, position: 1.5, width: 0.9, swing: 'left', flipSide: true });
  const geomFlipped = calcDoorCADGeometry(wallH, doorFlipped);
  assert(approxEqual(geomFlipped.openEnd.y, -0.9), 'Flipped door opens in opposite normal direction (y = -0.9)', geomFlipped.openEnd.y);

  // Double door
  const doorDouble = createDoor({ wallId: wallH.id, position: 1.0, width: 1.8, swing: 'double' });
  const geomDouble = calcDoorCADGeometry(wallH, doorDouble);
  assert(geomDouble.type === 'double', 'Door geometry type is double');
  assert(geomDouble.leaves.length === 2, 'Double door generates 2 leaves');
  assert(approxEqual(geomDouble.leafWidth, 0.9), 'Each leaf width is 0.9m', geomDouble.leafWidth);
  assert(approxEqual(geomDouble.leaves[0].radius, 0.9), 'Leaf 1 radius is 0.9m');
  assert(approxEqual(geomDouble.leaves[1].radius, 0.9), 'Leaf 2 radius is 0.9m');

  // Door on 45-degree diagonal wall
  const wallDiag = createWall({ x1: 0, y1: 0, x2: 10, y2: 10, thickness: 0.2 });
  const doorDiag = createDoor({ wallId: wallDiag.id, position: 3.0, width: 1.0, swing: 'left' });
  const geomDiag = calcDoorCADGeometry(wallDiag, doorDiag);
  assert(approxEqual(geomDiag.radius, 1.0), 'Diagonal wall door preserves 1.0m leaf radius', geomDiag.radius);
  assert(approxEqual(geomDiag.hinge.x, 3.0 / Math.SQRT2), 'Diagonal wall hinge x calculated with unit vector', geomDiag.hinge.x);
}

// =============================================================================
// 6. CAD Window Geometry & Glazing Panes (calcWindowCADGeometry)
// =============================================================================
console.log('\n--- 6. CAD Window Geometry & Glazing Panes ---');

{
  const wallH = createWall({ x1: 0, y1: 0, x2: 6, y2: 0, thickness: 0.25 });
  const win = createWindow({ wallId: wallH.id, position: 2.0, width: 1.5, sill: 0.9 });
  const winGeom = calcWindowCADGeometry(wallH, win);

  assert(approxEqual(winGeom.width, 1.5), 'Window geometry preserves width 1.5m', winGeom.width);
  assert(winGeom.sillOuter.length === 2, 'Window has outer sill line');
  assert(winGeom.sillInner.length === 2, 'Window has inner sill line');
  assert(winGeom.jamb1.length === 2 && winGeom.jamb2.length === 2, 'Window has jamb caps');

  // Outer sill offset by -halfThick (-0.125m), Inner sill offset by +halfThick (+0.125m)
  assert(approxEqual(winGeom.sillOuter[0].y, -0.125), 'Outer sill y is -0.125m', winGeom.sillOuter[0].y);
  assert(approxEqual(winGeom.sillInner[0].y, 0.125), 'Inner sill y is +0.125m', winGeom.sillInner[0].y);

  // Double glazing panes offset symmetrically inside core
  assert(winGeom.glassPane1.length === 2 && winGeom.glassPane2.length === 2, 'Generates double glazing pane lines');
  assert(winGeom.glassPane1[0].y < 0 && winGeom.glassPane2[0].y > 0, 'Glass panes positioned symmetrically about centerline');
}

// =============================================================================
// 7. Hosted Openings Query Helper (wallOpenings)
// =============================================================================
console.log('\n--- 7. Wall Openings Query Helper ---');

{
  const wall = createWall({ id: 'target-wall', x1: 0, y1: 0, x2: 10, y2: 0 });
  const door = createDoor({ wallId: 'target-wall', position: 5.0, width: 0.9 });
  const win = createWindow({ wallId: 'target-wall', position: 1.5, width: 1.2 });
  const otherDoor = createDoor({ wallId: 'other-wall', position: 2.0, width: 0.8 });

  const hosted = wallOpenings(wall, [door, win, otherDoor]);
  assert(hosted.length === 2, 'wallOpenings filters only openings hosted on target wall', hosted.length);
  assert(hosted[0].id === win.id, 'wallOpenings sorts openings by position along wall (window @ 1.5m first)', hosted[0]);
  assert(hosted[1].id === door.id, 'door @ 5.0m is second', hosted[1]);
}

// =============================================================================
// Summary
// =============================================================================
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 2 ENGINE TESTS PASSED!\n');
}
