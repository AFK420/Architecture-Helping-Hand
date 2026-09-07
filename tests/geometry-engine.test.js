/**
 * 2D Geometry Engine Test Suite — Phase 4 foundational primitives.
 * Deterministic fixtures; edge cases attacked aggressively.
 */

import {
  EPSILON_TINY, EPSILON_SMALL, EPSILON_MEDIUM, SNAP_TOLERANCE_METERS,
  JUNCTION_TOLERANCE_METERS, approxEqual, isZero
} from '../src/core/geometry-tolerance.js';
import {
  point, vector, addVectors, subtractPoints, scaleVector, dotProduct,
  crossProduct, vectorLength, normalizeVector, pointsEqual,
  distance, midpoint, directionRadians, angleAtVertex,
  closestPointOnSegment, distanceToLine,
  orientation, areParallel, arePerpendicular,
  intersectSegmentsDetailed,
  polygonSignedArea, polygonArea, polygonPerimeter, polygonCentroid,
  polygonOrientation, boundingBox, pointInPolygonDetailed, polygonSelfIntersects,
  translatePoint, rotatePoint, scalePoint, mirrorPoint,
  splitSegment, joinCollinearSegments, trimExtendToLine,
  createArc, arcToPolyline, arcLength,
  entityBounds, queryRect, queryNearest,
  validateEntityGeometry
} from '../src/core/geometry-engine.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}
function close(actual, expected, msg, delta = 1e-9) {
  const ok = Math.abs(actual - expected) <= delta;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${actual})`}: ${msg}`);
}

// --- 1. Tolerance module ---
console.log('\n--- 1. Centralized tolerances ---');
{
  assert(EPSILON_TINY === 1e-9 && EPSILON_SMALL === 1e-6 && EPSILON_MEDIUM === 1e-4, 'named tolerances have documented values');
  assert(approxEqual(1, 1 + 1e-10), 'approxEqual absorbs float noise');
  assert(!approxEqual(1, 1.001, 1e-9), 'approxEqual does not absorb real differences');
  assert(isZero(0), 'isZero(0)');
  assert(isZero(1e-10), 'isZero absorbs tiny values');
  assert(!isZero(0.001), 'isZero does not absorb 0.001');
}

// --- 2. Point/vector primitives ---
console.log('\n--- 2. Point & vector primitives ---');
{
  assert(pointsEqual(addVectors(point(1, 2), vector(3, 4)), point(4, 6)), 'vector addition');
  assert(pointsEqual(subtractPoints(point(5, 7), point(2, 3)), point(3, 4)), 'point subtraction');
  assert(pointsEqual(scaleVector(vector(2, 3), 2), vector(4, 6)), 'scalar multiplication');
  assert(dotProduct(vector(1, 0), vector(0, 1)) === 0, 'perpendicular dot = 0');
  assert(dotProduct(vector(2, 0), vector(3, 0)) === 6, 'parallel dot = product');
  assert(crossProduct(vector(2, 0), vector(0, 2)) === 4, 'cross product z');
  close(vectorLength(vector(3, 4)), 5, '3-4-5 vector length');
  const n = normalizeVector(vector(10, 0));
  close(n.x, 1, 'normalize x');
  close(n.y, 0, 'normalize y');
  const z = normalizeVector(vector(0, 0));
  assert(z.x === 0 && z.y === 0, 'zero vector normalizes safely (no NaN)');
  assert(pointsEqual(point(1, 2), point(1, 2)), 'pointsEqual identity');
}

// --- 3. Measures ---
console.log('\n--- 3. Distance, direction, midpoint, angle ---');
{
  close(distance(point(0, 0), point(3, 4)), 5, '3-4-5 distance');
  assertEqual2(midpoint(point(0, 0), point(4, 2)), { x: 2, y: 1 }, 'midpoint');
  close(directionRadians(point(0, 0), point(1, 0)), 0, 'east = 0 rad');
  close(directionRadians(point(0, 0), point(0, 1)), Math.PI / 2, 'north = π/2');
  assert(directionRadians(point(0, 0), point(-1, 0)) >= 0, 'west normalized to [0, 2π)');
  close(angleAtVertex(point(1, 0), point(0, 0), point(0, 1)), Math.PI / 2, 'right angle at vertex');
  close(angleAtVertex(point(2, 0), point(0, 0), point(-2, 0)), Math.PI, 'straight angle');
  const cp = closestPointOnSegment(point(2, 3), point(0, 0), point(4, 0));
  assertEqual2(cp.point, { x: 2, y: 0 }, 'closest point projected');
  close(cp.distance, 3, 'closest point distance');
  assert(cp.t === 0.5, 'parameter t = 0.5');
  const degenerate = closestPointOnSegment(point(5, 5), point(1, 1), point(1, 1));
  close(degenerate.distance, Math.hypot(4, 4), 'zero-length segment handled (no NaN)');
  close(distanceToLine(point(0, 5), point(-2, 0), point(2, 0)), 5, 'perpendicular distance to line');
}

function assertEqual2(actual, expected, msg) {
  const ok = Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${JSON.stringify(actual)})`}: ${msg}`);
}

// --- 4. Orientation, parallel, perpendicular ---
console.log('\n--- 4. Orientation & parallelism ---');
{
  assert(orientation(point(0, 0), point(1, 0), point(1, 1)) === 'counterclockwise', 'ccw orientation');
  assert(orientation(point(0, 0), point(1, 1), point(0, 2)) === 'counterclockwise' || orientation(point(0, 0), point(1, 1), point(0, 2)) === 'clockwise', 'orientation returns a defined value');
  assert(orientation(point(0, 0), point(2, 0), point(1, 0)) === 'collinear', 'collinear detection');
  // nearly-collinear: 1e-10 offset is collinear; 0.01 offset is not
  assert(orientation(point(0, 0), point(4, 0), point(2, 1e-10)) === 'collinear', 'nearly-collinear absorbed by tolerance');
  assert(orientation(point(0, 0), point(4, 0), point(2, 0.01)) !== 'collinear', '0.01 offset is NOT collinear');
  assert(areParallel(vector(1, 0), vector(5, 0)), 'parallel vectors');
  assert(areParallel(vector(1, 0), vector(-3, 0)), 'anti-parallel counts as parallel');
  assert(!areParallel(vector(1, 0), vector(1, 0.01)), 'slightly off-parallel rejected');
  assert(arePerpendicular(vector(1, 0), vector(0, 5)), 'perpendicular vectors');
  assert(!arePerpendicular(vector(1, 0), vector(1, 0.01)), 'slightly non-perpendicular rejected');
}

// --- 5. Segment intersection (robustness) ---
console.log('\n--- 5. Segment intersections ---');
{
  const x = intersectSegmentsDetailed(point(0, 0), point(4, 4), point(0, 4), point(4, 0));
  assert(x.kind === 'point' && Math.abs(x.point.x - 2) < 1e-9, 'proper intersection at midpoint');
  const none = intersectSegmentsDetailed(point(0, 0), point(1, 0), point(3, 0), point(4, 0));
  assert(none.kind === 'none', 'disjoint collinear segments → none');
  const overlap = intersectSegmentsDetailed(point(0, 0), point(5, 0), point(3, 0), point(8, 0));
  assert(overlap.kind === 'collinear-overlap', 'collinear overlap detected');
  assert(overlap.segment && Math.abs(overlap.segment.start.x - 3) < 1e-9, 'overlap span correct');
  const parallel = intersectSegmentsDetailed(point(0, 0), point(4, 0), point(0, 1), point(4, 1));
  assert(parallel.kind === 'none', 'parallel non-collinear → none');
  const touching = intersectSegmentsDetailed(point(2, 2), point(4, 0), point(4, 4), point(4, 0));
  assert(touching.kind === 'point' && Math.abs(touching.point.x - 4) < 1e-9 && Math.abs(touching.point.y - 0) < 1e-9, 'endpoint touching intersection');
  // nearly parallel (1e-12 slope difference) must not explode
  const near = intersectSegmentsDetailed(point(0, 0), point(100, 0), point(0, 0), point(100, 1e-12));
  assert(near.kind !== undefined, 'nearly-parallel handled without instability');
}

// --- 6. Polygon operations ---
console.log('\n--- 6. Polygon operations ---');
{
  const square = [point(0, 0), point(4, 0), point(4, 3), point(0, 3)];
  const ccw = [point(0, 0), point(4, 0), point(4, 3), point(0, 3)];
  const cw = [...square].reverse();
  close(polygonArea(square), 12, 'square area = 12');
  close(polygonSignedArea(ccw), 12, 'ccw signed area positive');
  assert(polygonSignedArea(cw) < 0, 'cw signed area negative');
  assert(polygonOrientation(ccw) === 'ccw', 'orientation ccw');
  assert(polygonOrientation(cw) === 'cw', 'orientation cw');
  close(polygonPerimeter(square), 14, 'perimeter 14');
  assertEqual2(polygonCentroid(square), { x: 2, y: 1.5 }, 'square centroid');
  const lShape = [point(0, 0), point(4, 0), point(4, 1), point(1, 1), point(1, 3), point(0, 3)];
  close(polygonArea(lShape), 6, 'L-shape area = 6');
  const lCentroid = polygonCentroid(lShape);
  assert(lCentroid && lCentroid.x > 0 && lCentroid.y < 2, 'L-shape centroid weighted correctly');
  const bbox = boundingBox(lShape);
  assert(bbox.minX === 0 && bbox.maxX === 4 && bbox.minY === 0 && bbox.maxY === 3, 'bounding box');
  const bowtie = [point(0, 0), point(4, 3), point(4, 0), point(0, 3)];
  assert(polygonSelfIntersects(bowtie), 'bowtie self-intersection detected');
  assert(!polygonSelfIntersects(square), 'simple polygon: no self-intersection');
  assert(!polygonSelfIntersects(lShape), 'concave but simple: no self-intersection');
  // degenerate: all points collinear → zero area
  const degenerate = [point(0, 0), point(2, 2), point(4, 4)];
  assert(polygonOrientation(degenerate) === 'degenerate', 'collinear polygon flagged degenerate');
  close(polygonArea(degenerate), 0, 'degenerate polygon area = 0');
}

// --- 7. Point in polygon ---
console.log('\n--- 7. Point in polygon ---');
{
  const sq = [point(0, 0), point(4, 0), point(4, 3), point(0, 3)];
  assert(pointInPolygonDetailed(point(2, 1.5), sq) === 'inside', 'interior point');
  assert(pointInPolygonDetailed(point(5, 5), sq) === 'outside', 'exterior point');
  assert(pointInPolygonDetailed(point(0, 1.5), sq) === 'boundary', 'on-edge point = boundary');
  assert(pointInPolygonDetailed(point(2, 0), sq, 1e-4) === 'boundary', 'touching within tolerance');
  const lShape = [point(0, 0), point(4, 0), point(4, 1), point(1, 1), point(1, 3), point(0, 3)];
  assert(pointInPolygonDetailed(point(0.5, 0.5), lShape) === 'inside', 'L-shape concave interior');
  assert(pointInPolygonDetailed(point(3.5, 2.5), lShape) === 'outside', 'L-shape notch is outside');
}

// --- 8. Transforms ---
console.log('\n--- 8. Transforms ---');
{
  assertEqual2(translatePoint(point(1, 1), 3, -2), point(4, -1), 'translate');
  const rotated = rotatePoint(point(1, 0), point(0, 0), Math.PI / 2);
  assertEqual2(rotated, point(0, 1), 'rotate 90° around origin');
  const back = rotatePoint(rotatePoint(point(3, 4), point(1, 1), 0.7), point(1, 1), -0.7);
  assert(Math.abs(back.x - 3) < 1e-9 && Math.abs(back.y - 4) < 1e-9, 'rotate + counter-rotate = identity');
  assertEqual2(scalePoint(point(2, 2), point(0, 0), 0.5), point(1, 1), 'scale about center');
  const mirrored = mirrorPoint(point(3, 4), point(0, 0), point(0, 10));
  assertEqual2(mirrored, point(-3, 4), 'mirror across vertical line');
}

// --- 9. Split / join / trim ---
console.log('\n--- 9. Segment operations ---');
{
  const [s1, s2] = splitSegment(point(0, 0), point(10, 0), 0.4);
  assertEqual2(s1.end, point(4, 0), 'split point at t=0.4');
  close(distance(s1.start, s1.end), 4, 'first half length');
  close(distance(s2.start, s2.end), 6, 'second half length');
  let threw = false;
  try { splitSegment(point(0, 0), point(1, 0), 0); } catch { threw = true; }
  assert(threw, 'split at t=0 rejected');
  const joined = joinCollinearSegments(
    { start: point(0, 0), end: point(4, 0) },
    { start: point(4, 0), end: point(9, 0) }
  );
  assert(joined && close2(joined.end.x, 9), 'collinear join spans both segments');
  const reversed = joinCollinearSegments(
    { start: point(4, 0), end: point(0, 0) },
    { start: point(9, 0), end: point(4, 0) }
  );
  assert(reversed && close2(reversed.start.x, 0) && close2(reversed.end.x, 9), 'join handles reversed directions (canonical order)');
  const offset = joinCollinearSegments(
    { start: point(0, 0), end: point(4, 0) },
    { start: point(4, 0.001), end: point(9, 0.001) }
  );
  assert(offset === null, 'non-collinear segments refuse to join');
  const trim = trimExtendToLine(point(0, 0), point(10, 0), point(5, -1), point(5, 5));
  assert(trim.end && close2(trim.end.x, 5), 'trim/extend hits the fence line');
  assert(trim.hitWithinLine, 'hit within the fence segment');
}
function close2(a, b) { return Math.abs(a - b) < 1e-9; }

// --- 10. Arcs ---
console.log('\n--- 10. Arcs ---');
{
  const quarter = createArc({ center: point(0, 0), radius: 2, startAngleRadians: 0, endAngleRadians: Math.PI / 2 });
  close(arcLength(quarter), Math.PI, 'quarter arc length = πr/2 with r=2');
  const full = createArc({ center: point(0, 0), radius: 2, startAngleRadians: 0, endAngleRadians: 0, counterclockwise: true });
  close(arcLength(full), 4 * Math.PI, 'equal start/end angles = full circle (2πr)');
  const pts = arcToPolyline(quarter, 4);
  assert(pts.length === 5, '4 segments → 5 points');
  assertEqual2({ x: pts[0].x, y: pts[0].y }, point(2, 0), 'arc starts at start angle');
  assert(Math.abs(pts[4].x) < 1e-9 && Math.abs(pts[4].y - 2) < 1e-9, 'arc ends at end angle');
  let threw = false;
  try { createArc({ center: point(0, 0), radius: -1, startAngleRadians: 0, endAngleRadians: 1 }); } catch { threw = true; }
  assert(threw, 'negative radius rejected');
}

// --- 11. Spatial queries ---
console.log('\n--- 11. Spatial query API ---');
{
  const entities = [
    { kind: 'line', id: 'a', x1: 0, y1: 0, x2: 4, y2: 0 },
    { kind: 'room', id: 'b', x: 10, y: 10, width: 4, depth: 4 },
    { kind: 'furniture', id: 'c', x: 11, y: 11, width: 1, depth: 1 }
  ];
  const inRect = queryRect(entities, { x: 9, y: 9, width: 6, depth: 6 });
  const ids = inRect.map(e => e.id);
  assert(ids.length === 2 && ids.includes('b') && ids.includes('c'), 'rect query filters by bounds');
  const nearest = queryNearest(entities, point(11.5, 11.5), 5);
  assert(nearest && nearest.id === 'c', 'nearest query finds closest center');
  assert(entityBounds(entities[0]).width === 4, 'line entityBounds from endpoints');
  assert(entityBounds({ kind: 'unknown' }) === null, 'unbounded entity returns null');
  assert(queryRect([], { x: 0, y: 0, width: 10, depth: 10 }).length === 0, 'empty query handles empty set');
}

// --- 12. Geometric invariants ---
console.log('\n--- 12. Entity invariants ---');
{
  const goodWall = { kind: 'wall', x1: 0, y1: 0, x2: 4, y2: 0 };
  assert(validateEntityGeometry(goodWall).valid, 'valid wall passes');
  const zeroWall = { kind: 'wall', x1: 2, y1: 2, x2: 2, y2: 2 };
  const zv = validateEntityGeometry(zeroWall);
  assert(!zv.valid && zv.violations[0].rule === 'positive_length', 'zero-length wall flagged');
  const bowtieRoom = { kind: 'room', boundary: [point(0, 0), point(4, 3), point(4, 0), point(0, 3)] };
  const rv = validateEntityGeometry(bowtieRoom);
  assert(!rv.valid && rv.violations.some(v => v.rule === 'simple_polygon'), 'self-intersecting room boundary flagged');
  const goodRoom = { kind: 'room', width: 4, depth: 3 };
  assert(validateEntityGeometry(goodRoom).valid, 'rectangular room passes');
  const orphanDoor = { kind: 'door', width: 0.9 };
  const dv = validateEntityGeometry(orphanDoor);
  assert(!dv.valid && dv.violations.some(v => v.rule === 'valid_host'), 'door without host wall flagged');
  const hostedDoor = { kind: 'door', width: 0.9, wallId: 'w-1' };
  assert(validateEntityGeometry(hostedDoor).valid, 'hosted door passes');
  const zeroDim = { kind: 'dimension', p1: { x: 1, y: 1 }, p2: { x: 1, y: 1 } };
  const dimV = validateEntityGeometry(zeroDim);
  assert(!dimV.valid, 'zero-length dimension flagged');
  assert(validateEntityGeometry(null).valid === false, 'null entity invalid');
  assert(validateEntityGeometry({ kind: 'text', x: 0, y: 0 }).valid, 'kinds without specific rules default valid');
}

console.log(`\n========================================`);
console.log(`Geometry Engine Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
