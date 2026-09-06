/**
 * Architecture Helping Hand - Architectural Geometry Engine
 * Pure mathematical functions for 2D architectural shapes, perimeters, areas, diagonals, and polygons.
 */

import { requireUnit } from './units.js';
import { requireFiniteNumber } from './calculator.js';

/**
 * Calculate geometric properties of an architectural rectangle (room, wall, floor slab)
 * @param {Object} params
 * @param {number} params.width - Width dimension (> 0)
 * @param {number} params.length - Length dimension (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ area: number, perimeter: number, diagonal: number }}
 */
export function calcRectangle({ width, length, unitKey = 'm' } = {}) {
  requireFiniteNumber(width, 'width');
  requireFiniteNumber(length, 'length');
  requireUnit(unitKey, 'length');

  if (width <= 0 || length <= 0) {
    throw new Error('Rectangle width and length must be strictly greater than 0');
  }

  const area = width * length;
  const perimeter = 2 * (width + length);
  const diagonal = Math.sqrt(width * width + length * length);

  return {
    area,
    perimeter,
    diagonal
  };
}

/**
 * Calculate geometric properties of an architectural circle (round column, circular window, fountain)
 * @param {Object} params
 * @param {number} params.radius - Radius (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ diameter: number, circumference: number, area: number }}
 */
export function calcCircle({ radius, unitKey = 'm' } = {}) {
  requireFiniteNumber(radius, 'radius');
  requireUnit(unitKey, 'length');

  if (radius <= 0) {
    throw new Error('Circle radius must be strictly greater than 0');
  }

  const diameter = 2 * radius;
  const circumference = 2 * Math.PI * radius;
  const area = Math.PI * radius * radius;

  return {
    diameter,
    circumference,
    area
  };
}

/**
 * Calculate geometric properties of a triangle using Heron's formula
 * @param {Object} params
 * @param {number} params.a - First side length (> 0)
 * @param {number} params.b - Second side length (> 0)
 * @param {number} params.c - Third side length (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ perimeter: number, area: number }}
 */
export function calcTriangle({ a, b, c, unitKey = 'm' } = {}) {
  requireFiniteNumber(a, 'a');
  requireFiniteNumber(b, 'b');
  requireFiniteNumber(c, 'c');
  requireUnit(unitKey, 'length');

  if (a <= 0 || b <= 0 || c <= 0) {
    throw new Error('Triangle side lengths must be strictly greater than 0');
  }

  // Triangle Inequality Theorem: sum of any two sides must be strictly greater than the third
  if (a + b <= c || a + c <= b || b + c <= a) {
    throw new Error(`Triangle inequality violated: sides (${a}, ${b}, ${c}) cannot form a valid triangle`);
  }

  const perimeter = a + b + c;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));

  return {
    perimeter,
    area
  };
}

/**
 * Calculate geometric properties of a 2D planar polygon using the Shoelace formula
 * @param {Object} params
 * @param {Array<{ x: number, y: number }>} params.vertices - Ordered list of vertices
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ perimeter: number, area: number }}
 */
export function calcPolygon({ vertices, unitKey = 'm' } = {}) {
  if (!Array.isArray(vertices)) {
    throw new TypeError('calcPolygon expects vertices to be an array of {x, y} coordinate objects');
  }

  if (vertices.length < 3) {
    throw new Error(`Polygon must have at least 3 vertices (received ${vertices.length})`);
  }

  requireUnit(unitKey, 'length');

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    if (!v || typeof v !== 'object') {
      throw new TypeError(`Vertex at index ${i} is not a valid object`);
    }
    requireFiniteNumber(v.x, `vertex[${i}].x`);
    requireFiniteNumber(v.y, `vertex[${i}].y`);
  }

  let doubleArea = 0;
  let perimeter = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    // Shoelace formula term
    doubleArea += (xi * yj) - (xj * yi);

    // Euclidean distance between adjacent vertices
    const dx = xj - xi;
    const dy = yj - yi;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  const area = Math.abs(doubleArea) / 2;

  if (area === 0) {
    throw new Error('Degenerate polygon: vertices are collinear or form a zero-area polygon');
  }

  return {
    perimeter,
    area
  };
}

/**
 * Euclidean distance between two 2D points
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @returns {number}
 */
export function calcDistance(p1, p2) {
  if (!p1 || !p2) throw new TypeError('calcDistance expects two points {x, y}');
  requireFiniteNumber(p1.x, 'p1.x');
  requireFiniteNumber(p1.y, 'p1.y');
  requireFiniteNumber(p2.x, 'p2.x');
  requireFiniteNumber(p2.y, 'p2.y');
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Angle from p1 to p2 in radians and normalized degrees (0° - 360°)
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @returns {{ rad: number, deg: number }}
 */
export function calcAngle(p1, p2) {
  if (!p1 || !p2) throw new TypeError('calcAngle expects two points {x, y}');
  requireFiniteNumber(p1.x, 'p1.x');
  requireFiniteNumber(p1.y, 'p1.y');
  requireFiniteNumber(p2.x, 'p2.x');
  requireFiniteNumber(p2.y, 'p2.y');
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const rad = Math.atan2(dy, dx);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return { rad, deg };
}

/**
 * Calculates a parallel offset line segment shifted perpendicularly by `offset` meters.
 * Positive offset shifts along normal vector (-dy, dx).
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @param {number} offset
 * @returns {{ p1: { x: number, y: number }, p2: { x: number, y: number } }}
 */
export function offsetSegment(p1, p2, offset) {
  if (!p1 || !p2) throw new TypeError('offsetSegment expects two points {x, y}');
  requireFiniteNumber(p1.x, 'p1.x');
  requireFiniteNumber(p1.y, 'p1.y');
  requireFiniteNumber(p2.x, 'p2.x');
  requireFiniteNumber(p2.y, 'p2.y');
  requireFiniteNumber(offset, 'offset');

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return { p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y } };
  }
  const nx = -dy / len;
  const ny = dx / len;

  return {
    p1: { x: p1.x + nx * offset, y: p1.y + ny * offset },
    p2: { x: p2.x + nx * offset, y: p2.y + ny * offset }
  };
}

/**
 * Ray-casting algorithm to test whether a 2D point lies inside a polygon
 * @param {{ x: number, y: number }} point
 * @param {Array<{ x: number, y: number }>} polygonVertices
 * @returns {boolean}
 */
export function pointInPolygon(point, polygonVertices) {
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
    throw new TypeError('pointInPolygon expects point {x, y}');
  }
  if (!Array.isArray(polygonVertices) || polygonVertices.length < 3) {
    return false;
  }
  let inside = false;
  const px = point.x;
  const py = point.y;
  const n = polygonVertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonVertices[i].x;
    const yi = polygonVertices[i].y;
    const xj = polygonVertices[j].x;
    const yj = polygonVertices[j].y;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates arc geometric properties from two endpoints and standard CAD/DXF bulge
 * (bulge = tan(includedAngle / 4))
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @param {number} bulge
 * @returns {{ center: { x: number, y: number }, radius: number, includedAngleRad: number, includedAngleDeg: number, arcLength: number, sagitta: number }}
 */
export function calcArcBulge(p1, p2, bulge) {
  if (!p1 || !p2) throw new TypeError('calcArcBulge expects endpoints p1 and p2');
  requireFiniteNumber(p1.x, 'p1.x');
  requireFiniteNumber(p1.y, 'p1.y');
  requireFiniteNumber(p2.x, 'p2.x');
  requireFiniteNumber(p2.y, 'p2.y');
  requireFiniteNumber(bulge, 'bulge');

  const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (chord === 0 || bulge === 0) {
    return {
      center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      radius: chord / 2,
      includedAngleRad: 0,
      includedAngleDeg: 0,
      arcLength: chord,
      sagitta: 0
    };
  }

  const theta = 4 * Math.atan(bulge);
  const sinHalf = Math.sin(theta / 2);
  const radius = chord / (2 * Math.abs(sinHalf));
  const sagitta = (chord / 2) * Math.abs(bulge);

  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Center offset distance along perpendicular to chord
  const dCenter = (chord * (1 - bulge * bulge)) / (4 * bulge);
  const nx = -dy / chord;
  const ny = dx / chord;

  const center = {
    x: mx + nx * dCenter,
    y: my + ny * dCenter
  };

  return {
    center,
    radius,
    includedAngleRad: theta,
    includedAngleDeg: (theta * 180) / Math.PI,
    arcLength: radius * Math.abs(theta),
    sagitta
  };
}

/**
 * Computes the 4-corner footprint polygon of a wall at any angle with thickness
 * @param {{ x1: number, y1: number, x2: number, y2: number, thickness?: number }} wall
 * @returns {Array<{ x: number, y: number }>}
 */
export function calcWallPolygon(wall) {
  if (!wall || typeof wall !== 'object') throw new TypeError('calcWallPolygon expects a wall object');
  const x1 = typeof wall.x1 === 'number' ? wall.x1 : wall.start?.x;
  const y1 = typeof wall.y1 === 'number' ? wall.y1 : wall.start?.y;
  const x2 = typeof wall.x2 === 'number' ? wall.x2 : wall.end?.x;
  const y2 = typeof wall.y2 === 'number' ? wall.y2 : wall.end?.y;
  requireFiniteNumber(x1, 'wall.x1');
  requireFiniteNumber(y1, 'wall.y1');
  requireFiniteNumber(x2, 'wall.x2');
  requireFiniteNumber(y2, 'wall.y2');

  const t = typeof wall.thickness === 'number' && wall.thickness > 0 ? wall.thickness : 0.2;
  const h = t / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  if (len === 0) {
    return [
      { x: x1 - h, y: y1 - h },
      { x: x1 + h, y: y1 - h },
      { x: x1 + h, y: y1 + h },
      { x: x1 - h, y: y1 + h }
    ];
  }

  const nx = (-dy / len) * h;
  const ny = (dx / len) * h;

  return [
    { x: x1 - nx, y: y1 - ny },
    { x: x2 - nx, y: y2 - ny },
    { x: x2 + nx, y: y2 + ny },
    { x: x1 + nx, y: y1 + ny }
  ];
}

