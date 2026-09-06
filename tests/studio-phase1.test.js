/**
 * Architecture Helping Hand - Phase 1: Studio Shell & Vector Geometry Engine Unit Tests
 * Validates:
 *   1. Vector geometry math (calcDistance, calcAngle, offsetSegment, pointInPolygon, calcArcBulge, calcWallPolygon)
 *   2. Unconstrained angled walls & arc properties
 *   3. Polygonal non-rectangular rooms (Shoelace area, perimeter, bounding box, hit-testing)
 *   4. Entity selection / picking for angled walls and polygonal rooms
 *   5. Plan-to-export geometry for angled walls & polygon rooms
 *   6. Multi-document tab schema, normalization, and persistence
 */

import {
  calcDistance,
  calcAngle,
  offsetSegment,
  pointInPolygon,
  calcArcBulge,
  calcWallPolygon,
  calcPolygon
} from '../src/core/geometry.js';

import {
  createWall,
  createRoom,
  roomContainsPoint,
  wallDirection
} from '../src/core/entities.js';

import {
  pickEntities,
  planToExportGeometry
} from '../src/core/plan-canvas.js';

import {
  createProject,
  validateProject,
  normalizeProject
} from '../src/core/project.js';

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

function approxEqual(a, b, epsilon = 0.001) {
  return Math.abs(a - b) < epsilon;
}

console.log('🧪 Running tests/studio-phase1.test.js...');

// =============================================================================
// 1. Vector Geometry Math Suite
// =============================================================================
console.log('\n--- 1. Vector Geometry Engine ---');

{
  // calcDistance
  const d1 = calcDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert(approxEqual(d1, 5), 'calcDistance 3-4-5 triangle hypotenuse = 5', d1);

  const d2 = calcDistance({ x: -2, y: -3 }, { x: 4, y: 5 });
  assert(approxEqual(d2, 10), 'calcDistance (-2,-3) to (4,5) = 10', d2);

  // calcAngle (normalized 0..360)
  const aEast = calcAngle({ x: 0, y: 0 }, { x: 10, y: 0 }).deg;
  assert(approxEqual(aEast, 0), 'calcAngle East = 0 deg', aEast);

  const aSouth = calcAngle({ x: 0, y: 0 }, { x: 0, y: 10 }).deg;
  assert(approxEqual(aSouth, 90), 'calcAngle South (+y in screen space) = 90 deg', aSouth);

  const aWest = calcAngle({ x: 10, y: 0 }, { x: 0, y: 0 }).deg;
  assert(approxEqual(aWest, 180), 'calcAngle West = 180 deg', aWest);

  const aNorth = calcAngle({ x: 0, y: 10 }, { x: 0, y: 0 }).deg;
  assert(approxEqual(aNorth, 270), 'calcAngle North (-y in screen space) = 270 deg', aNorth);

  const aDiag = calcAngle({ x: 0, y: 0 }, { x: 10, y: 10 }).deg;
  assert(approxEqual(aDiag, 45), 'calcAngle (0,0)->(10,10) = 45 deg', aDiag);

  // offsetSegment
  const { p1: o1, p2: o2 } = offsetSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 2);
  assert(approxEqual(o1.x, 0) && approxEqual(o1.y, 2), 'offsetSegment p1 normal perpendicular y = 2', o1);
  assert(approxEqual(o2.x, 10) && approxEqual(o2.y, 2), 'offsetSegment p2 normal perpendicular y = 2', o2);

  // pointInPolygon (Ray-casting)
  const squarePoly = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 }
  ];
  assert(pointInPolygon({ x: 5, y: 5 }, squarePoly) === true, 'pointInPolygon interior point (5,5) inside square', true);
  assert(pointInPolygon({ x: 15, y: 5 }, squarePoly) === false, 'pointInPolygon exterior point (15,5) outside square', false);
  assert(pointInPolygon({ x: -1, y: -1 }, squarePoly) === false, 'pointInPolygon exterior negative point outside', false);

  // L-shaped polygon test
  const lShapePoly = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 6 },
    { x: 0, y: 6 }
  ];
  assert(pointInPolygon({ x: 1, y: 1 }, lShapePoly) === true, 'pointInPolygon (1,1) inside L-shape corner', true);
  assert(pointInPolygon({ x: 1, y: 5 }, lShapePoly) === true, 'pointInPolygon (1,5) inside L-shape vertical leg', true);
  assert(pointInPolygon({ x: 5, y: 1 }, lShapePoly) === true, 'pointInPolygon (5,1) inside L-shape horizontal leg', true);
  assert(pointInPolygon({ x: 4, y: 4 }, lShapePoly) === false, 'pointInPolygon (4,4) outside cut-out corner of L-shape', false);

  // calcArcBulge
  const arcData = calcArcBulge({ x: 0, y: 0 }, { x: 10, y: 0 }, 1); // semicircle
  assert(approxEqual(arcData.radius, 5), 'calcArcBulge semicircle radius = 5', arcData.radius);
  assert(arcData.sagitta > 0, 'calcArcBulge sagitta > 0', arcData.sagitta);

  // calcWallPolygon
  const wallObj = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2 };
  const wallPoly = calcWallPolygon(wallObj);
  assert(wallPoly.length === 4, 'calcWallPolygon returns 4 corners', wallPoly.length);
  assert(approxEqual(wallPoly[0].y, -0.1) && approxEqual(wallPoly[2].y, 0.1), 'calcWallPolygon corners centered on thickness', wallPoly);
}

// =============================================================================
// 2. Unconstrained Angled Walls & Arc Support
// =============================================================================
console.log('\n--- 2. Unconstrained Angled Walls ---');

{
  // Diagonal wall at 45 degrees
  const diagWall = createWall({
    start: { x: 0, y: 0 },
    end: { x: 10, y: 10 },
    thickness: 0.2
  });
  assert(diagWall.id.startsWith('wall-'), 'createWall generates valid ID', diagWall.id);
  assert(approxEqual(diagWall.length, Math.SQRT2 * 10), 'createWall diagonal length = 10√2', diagWall.length);
  assert(approxEqual(diagWall.angle, 45), 'createWall diagonal angle = 45 deg', diagWall.angle);

  // Wall directions (compass headings)
  assert(wallDirection(diagWall) === 'northeast', 'wallDirection 45 deg (x+, y+) = northeast', wallDirection(diagWall));

  const northWall = createWall({ start: { x: 0, y: 0 }, end: { x: 0, y: 10 } });
  assert(wallDirection(northWall) === 'north', 'wallDirection pure north = north', wallDirection(northWall));

  const eastWall = createWall({ start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
  assert(wallDirection(eastWall) === 'east', 'wallDirection pure east = east', wallDirection(eastWall));

  // Arc wall
  const arcWall = createWall({
    start: { x: 0, y: 0 },
    end: { x: 10, y: 0 },
    isArc: true,
    bulge: 0.5
  });
  assert(arcWall.isArc === true, 'createWall preserves isArc flag', arcWall.isArc);
  assert(arcWall.bulge === 0.5, 'createWall preserves bulge value', arcWall.bulge);

  // Rejection of zero-length wall
  let zeroWallFailed = false;
  try {
    createWall({ start: { x: 5, y: 5 }, end: { x: 5, y: 5 } });
  } catch (e) {
    zeroWallFailed = true;
  }
  assert(zeroWallFailed, 'createWall rejects zero-length wall', true);
}

// =============================================================================
// 3. Polygonal Non-Rectangular Rooms
// =============================================================================
console.log('\n--- 3. Polygonal Non-Rectangular Rooms ---');

{
  // L-shaped room
  // 6x6 square missing 4x4 top-right quadrant: area = 36 - 16 = 20 m²
  const lVertices = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 6 },
    { x: 0, y: 6 }
  ];

  const polyRoom = createRoom({
    name: 'L-Shaped Studio',
    boundary: lVertices,
    roomType: 'living'
  });

  assert(polyRoom.boundary.length === 6, 'createRoom stores polygonal boundary', polyRoom.boundary.length);
  assert(approxEqual(polyRoom.area, 20), 'createRoom computes exact polygon area via Shoelace = 20 m²', polyRoom.area);
  assert(approxEqual(polyRoom.perimeter, 24), 'createRoom computes exact polygon perimeter = 24 m', polyRoom.perimeter);
  assert(polyRoom.x === 0 && polyRoom.y === 0, 'createRoom sets bounding box origin (0,0)', { x: polyRoom.x, y: polyRoom.y });
  assert(polyRoom.width === 6 && polyRoom.depth === 6, 'createRoom sets bounding box 6x6', { w: polyRoom.width, d: polyRoom.depth });

  // roomContainsPoint with polygonal room
  assert(roomContainsPoint(polyRoom, { x: 1, y: 1 }) === true, 'roomContainsPoint (1,1) is inside L-room', true);
  assert(roomContainsPoint(polyRoom, { x: 5, y: 1 }) === true, 'roomContainsPoint (5,1) is inside L-room wing', true);
  assert(roomContainsPoint(polyRoom, { x: 5, y: 5 }) === false, 'roomContainsPoint (5,5) is outside cut-out in L-room', false);

  // Backward compatibility with legacy rectilinear room (no boundary specified)
  const rectRoom = createRoom({
    name: 'Bed 1',
    x: 10,
    y: 10,
    width: 4,
    depth: 5,
    roomType: 'bedroom'
  });
  assert(rectRoom.area === 20, 'Legacy rectangular room area = 20 m²', rectRoom.area);
  assert(roomContainsPoint(rectRoom, { x: 12, y: 12 }) === true, 'Legacy room contains point (12,12)', true);
  assert(roomContainsPoint(rectRoom, { x: 16, y: 12 }) === false, 'Legacy room excludes point (16,12)', false);
}

// =============================================================================
// 4. Entity Picking / Hit Testing
// =============================================================================
console.log('\n--- 4. Entity Picking / Hit Testing ---');

{
  const diagWall = createWall({
    id: 'wall-diag',
    start: { x: 0, y: 0 },
    end: { x: 10, y: 10 },
    thickness: 0.2
  });

  const lRoom = createRoom({
    id: 'room-lshape',
    name: 'Corner Lounge',
    boundary: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 6 },
      { x: 0, y: 6 }
    ]
  });

  const entities = {
    walls: [diagWall],
    rooms: [lRoom],
    doors: [],
    windows: [],
    columns: [],
    dimensions: [],
    textNotes: []
  };

  // Pick point directly on diagonal wall at (5, 5)
  const hitWall = pickEntities(entities, { x: 5, y: 5.05, width: 0, depth: 0 });
  assert(hitWall.includes('wall-diag'), 'pickEntities picks diagonal wall near (5, 5)', hitWall);

  // Pick point far from wall at (0, 8)
  const missWall = pickEntities(entities, { x: 0, y: 8, width: 0, depth: 0 });
  assert(!missWall.includes('wall-diag'), 'pickEntities misses diagonal wall at (0, 8)', missWall);

  // Pick point inside L-shaped room (1, 3)
  const hitRoom = pickEntities(entities, { x: 1, y: 3, width: 0, depth: 0 });
  assert(hitRoom.includes('room-lshape'), 'pickEntities picks polygonal room at (1, 3)', hitRoom);

  // Pick point in the empty corner cutout of L-shaped room (4, 4)
  const missRoom = pickEntities(entities, { x: 4, y: 4, width: 0, depth: 0 });
  assert(!missRoom.includes('room-lshape'), 'pickEntities misses polygonal room at cut-out (4, 4)', missRoom);
}

// =============================================================================
// 5. Plan-to-Export Geometry Generation
// =============================================================================
console.log('\n--- 5. Plan-to-Export Geometry Generation ---');

{
  const diagWall = createWall({
    start: { x: 0, y: 0 },
    end: { x: 6, y: 8 },
    thickness: 0.2
  });

  const lRoom = createRoom({
    name: 'Gallery',
    boundary: [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 0, y: 4 }
    ]
  });

  const exportGeom = planToExportGeometry({
    walls: [diagWall],
    rooms: [lRoom],
    doors: [],
    windows: [],
    columns: [],
    dimensions: [],
    textNotes: []
  });

  // Export polygons check (both wall outline polygon and room polygon)
  assert(Array.isArray(exportGeom.polygons), 'exportGeom has polygons array', exportGeom.polygons);
  assert(exportGeom.polygons.length === 2, 'Exports 2 polygons (1 room + 1 wall footprint)', exportGeom.polygons.length);

  const roomPolyExport = exportGeom.polygons.find(p => p.label === 'Gallery');
  assert(Boolean(roomPolyExport), 'Found Gallery polygon in export', roomPolyExport?.label);
  assert(roomPolyExport?.points.length === 6, 'Polygonal room preserves 6 boundary vertices in export', roomPolyExport?.points.length);

  const wallPolyExport = exportGeom.polygons.find(p => p.label === 'Wall');
  assert(Boolean(wallPolyExport), 'Found Wall polygon in export', wallPolyExport?.label);
  assert(wallPolyExport?.points.length === 4, 'Angled wall footprint has 4 vertices', wallPolyExport?.points.length);
}

// =============================================================================
// 6. Multi-Document Tab Project Schema & Normalization
// =============================================================================
console.log('\n--- 6. Multi-Document Tab Schema ---');

{
  const newProj = createProject({ name: 'Studio Complex' });
  assert(Array.isArray(newProj.documents), 'createProject initializes documents array', newProj.documents);
  assert(newProj.documents.length === 1, 'createProject has default Ground Floor document', newProj.documents.length);
  assert(newProj.documents[0].name === 'Ground Floor', 'Default document name is "Ground Floor"', newProj.documents[0].name);
  assert(newProj.documents[0].entities !== undefined, 'Default document contains entities container', Boolean(newProj.documents[0].entities));

  const validRes = validateProject(newProj);
  assert(validRes.ok === true, 'Project with documents array validates cleanly', validRes.ok);

  // Normalization of legacy project without documents array
  const legacyProj = {
    schemaVersion: 1,
    id: 'proj-legacy-99',
    name: 'Legacy Residence',
    entities: {
      walls: [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 5, y: 0 }, thickness: 0.2 }]
    }
  };

  const normalized = normalizeProject(legacyProj);
  assert(Array.isArray(normalized.documents), 'normalizeProject populates documents array for legacy project', normalized.documents);
  assert(normalized.documents[0].entities.length === 1, 'Legacy entities migrated into active document array', normalized.documents[0].entities.length);
  assert(normalized.documents[0].entities[0].id === 'w1', 'Legacy wall preserved in active document', normalized.documents[0].entities[0].id);
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
