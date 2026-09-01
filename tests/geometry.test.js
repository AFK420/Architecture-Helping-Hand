/**
 * Architecture Helping Hand - Architectural Geometry Engine Unit Tests
 */

import { calcRectangle, calcCircle, calcTriangle, calcPolygon } from '../src/core/geometry.js';

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

function approxEqual(a, b, epsilon = 0.000001) {
  return Math.abs(a - b) < epsilon;
}

console.log('🧪 Running tests/geometry.test.js...');

// 1. Rectangle Geometry Tests
{
  const r1 = calcRectangle({ width: 4, length: 5, unitKey: 'm' });
  assert(approxEqual(r1.area, 20), 'Rectangle 4m x 5m area = 20 m²', r1.area);
  assert(approxEqual(r1.perimeter, 18), 'Rectangle 4m x 5m perimeter = 18 m', r1.perimeter);
  assert(approxEqual(r1.diagonal, Math.sqrt(41)), 'Rectangle 4m x 5m diagonal = √41 m', r1.diagonal);

  // Imperial unit rectangle
  const r2 = calcRectangle({ width: 10, length: 20, unitKey: 'ft' });
  assert(approxEqual(r2.area, 200), 'Rectangle 10ft x 20ft area = 200 sq ft', r2.area);
  assert(approxEqual(r2.perimeter, 60), 'Rectangle 10ft x 20ft perimeter = 60 ft', r2.perimeter);
  assert(approxEqual(r2.diagonal, Math.sqrt(500)), 'Rectangle 10ft x 20ft diagonal = √500 ft', r2.diagonal);

  // Square (width === length)
  const rSquare = calcRectangle({ width: 6, length: 6, unitKey: 'cm' });
  assert(approxEqual(rSquare.area, 36), 'Square 6cm x 6cm area = 36 cm²', rSquare.area);
  assert(approxEqual(rSquare.diagonal, 6 * Math.SQRT2), 'Square 6cm x 6cm diagonal = 6√2 cm', rSquare.diagonal);

  // Invalid parameters
  let zeroWThrew = false;
  try {
    calcRectangle({ width: 0, length: 5 });
  } catch (e) {
    zeroWThrew = true;
  }
  assert(zeroWThrew, 'calcRectangle rejects zero width');

  let negLThrew = false;
  try {
    calcRectangle({ width: 4, length: -5 });
  } catch (e) {
    negLThrew = true;
  }
  assert(negLThrew, 'calcRectangle rejects negative length');

  let stringWThrew = false;
  try {
    calcRectangle({ width: '4', length: 5 });
  } catch (e) {
    stringWThrew = e instanceof TypeError;
  }
  assert(stringWThrew, 'calcRectangle rejects string "4" with TypeError');

  let nanThrew = false;
  try {
    calcRectangle({ width: NaN, length: 5 });
  } catch (e) {
    nanThrew = e instanceof TypeError;
  }
  assert(nanThrew, 'calcRectangle rejects NaN with TypeError');
}

// 2. Circle Geometry Tests
{
  const c1 = calcCircle({ radius: 5, unitKey: 'm' });
  assert(approxEqual(c1.diameter, 10), 'Circle radius 5m diameter = 10 m', c1.diameter);
  assert(approxEqual(c1.circumference, 10 * Math.PI), 'Circle radius 5m circumference = 10π m', c1.circumference);
  assert(approxEqual(c1.area, 25 * Math.PI), 'Circle radius 5m area = 25π m²', c1.area);

  // Millimeters circle
  const c2 = calcCircle({ radius: 100, unitKey: 'mm' });
  assert(approxEqual(c2.diameter, 200), 'Circle radius 100mm diameter = 200 mm', c2.diameter);
  assert(approxEqual(c2.area, 10000 * Math.PI), 'Circle radius 100mm area = 10,000π mm²', c2.area);

  // Invalid circle parameters
  let zeroRThrew = false;
  try {
    calcCircle({ radius: 0 });
  } catch (e) {
    zeroRThrew = true;
  }
  assert(zeroRThrew, 'calcCircle rejects zero radius');

  let negRThrew = false;
  try {
    calcCircle({ radius: -10 });
  } catch (e) {
    negRThrew = true;
  }
  assert(negRThrew, 'calcCircle rejects negative radius');

  let stringRThrew = false;
  try {
    calcCircle({ radius: '5' });
  } catch (e) {
    stringRThrew = e instanceof TypeError;
  }
  assert(stringRThrew, 'calcCircle rejects string "5" with TypeError');
}

// 3. Triangle Geometry Tests (Heron's Formula & Triangle Inequality)
{
  // 3-4-5 Right Triangle
  const t1 = calcTriangle({ a: 3, b: 4, c: 5, unitKey: 'm' });
  assert(approxEqual(t1.perimeter, 12), '3-4-5 triangle perimeter = 12 m', t1.perimeter);
  assert(approxEqual(t1.area, 6), '3-4-5 triangle area = 6 m²', t1.area);

  // Equilateral Triangle (side 6)
  const tEquilateral = calcTriangle({ a: 6, b: 6, c: 6, unitKey: 'm' });
  assert(approxEqual(tEquilateral.perimeter, 18), 'Equilateral triangle (side 6) perimeter = 18 m', tEquilateral.perimeter);
  assert(approxEqual(tEquilateral.area, (Math.sqrt(3) / 4) * 36), 'Equilateral triangle (side 6) area = 9√3 m²', tEquilateral.area);

  // Isosceles Triangle (5-5-6) -> s=8, area = sqrt(8 * 3 * 3 * 2) = sqrt(144) = 12
  const tIso = calcTriangle({ a: 5, b: 5, c: 6, unitKey: 'm' });
  assert(approxEqual(tIso.area, 12), 'Isosceles triangle (5-5-6) area = 12 m²', tIso.area);

  // Triangle Inequality Violations
  let ineqThrew1 = false;
  try {
    calcTriangle({ a: 1, b: 2, c: 10 });
  } catch (e) {
    ineqThrew1 = true;
  }
  assert(ineqThrew1, 'calcTriangle rejects sides (1, 2, 10) violating triangle inequality');

  let ineqThrew2 = false;
  try {
    calcTriangle({ a: 1, b: 2, c: 3 }); // degenerate flat line
  } catch (e) {
    ineqThrew2 = true;
  }
  assert(ineqThrew2, 'calcTriangle rejects degenerate collinear triangle (1, 2, 3)');

  let zeroSideThrew = false;
  try {
    calcTriangle({ a: 0, b: 4, c: 5 });
  } catch (e) {
    zeroSideThrew = true;
  }
  assert(zeroSideThrew, 'calcTriangle rejects zero side length');
}

// 4. Polygon Geometry Tests (Shoelace Formula & Vertex Polygons)
{
  // Square polygon (counter-clockwise)
  const squareCCW = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 }
  ];
  const pSquareCCW = calcPolygon({ vertices: squareCCW, unitKey: 'm' });
  assert(approxEqual(pSquareCCW.area, 16), 'Square polygon (CCW) area = 16 m²', pSquareCCW.area);
  assert(approxEqual(pSquareCCW.perimeter, 16), 'Square polygon (CCW) perimeter = 16 m', pSquareCCW.perimeter);

  // Square polygon (clockwise)
  const squareCW = [
    { x: 0, y: 0 },
    { x: 0, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 0 }
  ];
  const pSquareCW = calcPolygon({ vertices: squareCW, unitKey: 'm' });
  assert(approxEqual(pSquareCW.area, 16), 'Square polygon (CW) area = 16 m²', pSquareCW.area);
  assert(approxEqual(pSquareCW.perimeter, 16), 'Square polygon (CW) perimeter = 16 m', pSquareCW.perimeter);

  // Triangle polygon: (0,0), (4,0), (0,3)
  const triVertices = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 0, y: 3 }
  ];
  const pTri = calcPolygon({ vertices: triVertices, unitKey: 'm' });
  assert(approxEqual(pTri.area, 6), 'Triangle polygon area = 6 m²', pTri.area);
  assert(approxEqual(pTri.perimeter, 12), 'Triangle polygon perimeter = 12 m', pTri.perimeter);

  // L-Shaped Room Plan Polygon:
  // (0,0) -> (6,0) -> (6,3) -> (3,3) -> (3,5) -> (0,5)
  // Area = (6x3) + (3x2) = 18 + 6 = 24
  // Perimeter = 6 + 3 + 3 + 2 + 3 + 5 = 22
  const lRoom = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 5 },
    { x: 0, y: 5 }
  ];
  const pLRoom = calcPolygon({ vertices: lRoom, unitKey: 'm' });
  assert(approxEqual(pLRoom.area, 24), 'L-shaped room polygon area = 24 m²', pLRoom.area);
  assert(approxEqual(pLRoom.perimeter, 22), 'L-shaped room polygon perimeter = 22 m', pLRoom.perimeter);

  // Invalid Polygon Tests
  let tooFewThrew = false;
  try {
    calcPolygon({ vertices: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
  } catch (e) {
    tooFewThrew = true;
  }
  assert(tooFewThrew, 'calcPolygon rejects polygons with fewer than 3 vertices');

  let nonArrayThrew = false;
  try {
    calcPolygon({ vertices: 'invalid' });
  } catch (e) {
    nonArrayThrew = e instanceof TypeError;
  }
  assert(nonArrayThrew, 'calcPolygon rejects non-array vertices with TypeError');

  let badVertexThrew = false;
  try {
    calcPolygon({ vertices: [{ x: 0, y: 0 }, { x: '4', y: 0 }, { x: 0, y: 3 }] });
  } catch (e) {
    badVertexThrew = e instanceof TypeError;
  }
  assert(badVertexThrew, 'calcPolygon rejects string coordinate in vertex with TypeError');

  let collinearThrew = false;
  try {
    calcPolygon({
      vertices: [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 4, y: 4 }
      ]
    });
  } catch (e) {
    collinearThrew = true;
  }
  assert(collinearThrew, 'calcPolygon rejects degenerate collinear polygon with 0 area');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
