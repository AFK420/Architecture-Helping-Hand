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

/**
 * Finds the intersection point of two 2D lines (p1->p2 and p3->p4).
 * Returns null if lines are parallel or collinear.
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @param {{ x: number, y: number }} p3
 * @param {{ x: number, y: number }} p4
 * @returns {{ x: number, y: number, t: number, u: number }|null}
 */
export function intersectLines(p1, p2, p3, p4) {
  if (!p1 || !p2 || !p3 || !p4) return null;
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return null; // parallel

  const dx31 = p3.x - p1.x;
  const dy31 = p3.y - p1.y;

  const t = (dx31 * dy2 - dy31 * dx2) / denom;
  const u = (dx31 * dy1 - dy31 * dx1) / denom;

  return {
    x: p1.x + t * dx1,
    y: p1.y + t * dy1,
    t,
    u
  };
}

/**
 * Checks if two line segments (p1->p2 and p3->p4) intersect.
 * Returns intersection point if t in [0, 1] and u in [0, 1].
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @param {{ x: number, y: number }} p3
 * @param {{ x: number, y: number }} p4
 * @returns {{ x: number, y: number, t: number, u: number }|null}
 */
export function intersectSegments(p1, p2, p3, p4) {
  const hit = intersectLines(p1, p2, p3, p4);
  if (!hit) return null;
  const eps = 1e-6;
  if (hit.t >= -eps && hit.t <= 1 + eps && hit.u >= -eps && hit.u <= 1 + eps) {
    return hit;
  }
  return null;
}

/**
 * Projects a 2D point onto a line segment (p1->p2).
 * Returns the closest point on segment, distance, and normalized parameter t in [0, 1].
 * @param {{ x: number, y: number }} pt
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @returns {{ point: { x: number, y: number }, t: number, distance: number }}
 */
export function projectPointOnSegment(pt, p1, p2) {
  if (!pt || !p1 || !p2) throw new TypeError('projectPointOnSegment expects pt, p1, and p2');
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) {
    const d = Math.hypot(pt.x - p1.x, pt.y - p1.y);
    return { point: { x: p1.x, y: p1.y }, t: 0, distance: d };
  }
  let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / l2;
  const tClamped = Math.max(0, Math.min(1, t));
  const qx = p1.x + tClamped * dx;
  const qy = p1.y + tClamped * dy;
  const dist = Math.hypot(pt.x - qx, pt.y - qy);
  return {
    point: { x: qx, y: qy },
    t: tClamped,
    distance: dist
  };
}

/**
 * Splits a continuous wall length into solid spans around hosted openings (doors, windows).
 * Openings are sorted and clamped to [0, wallLength].
 * @param {number} wallLength
 * @param {Array<{ position: number, width: number }>} openings
 * @returns {Array<{ start: number, end: number, length: number }>}
 */
export function punchWallSpans(wallLength, openings = []) {
  if (typeof wallLength !== 'number' || wallLength <= 0) return [];
  if (!Array.isArray(openings) || openings.length === 0) {
    return [{ start: 0, end: wallLength, length: wallLength }];
  }

  // Filter and normalize opening intervals
  const intervals = [];
  for (const op of openings) {
    if (!op || typeof op.position !== 'number' || typeof op.width !== 'number') continue;
    const s = Math.max(0, Math.min(wallLength, op.position));
    const e = Math.max(0, Math.min(wallLength, op.position + Math.max(0, op.width)));
    if (e > s) {
      intervals.push({ start: s, end: e });
    }
  }

  if (intervals.length === 0) {
    return [{ start: 0, end: wallLength, length: wallLength }];
  }

  intervals.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = intervals[i];
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push(cur);
    }
  }

  // Generate solid spans
  const solidSpans = [];
  let curPos = 0;
  for (const cutout of merged) {
    if (cutout.start > curPos + 1e-4) {
      solidSpans.push({
        start: curPos,
        end: cutout.start,
        length: cutout.start - curPos
      });
    }
    curPos = Math.max(curPos, cutout.end);
  }

  if (curPos < wallLength - 1e-4) {
    solidSpans.push({
      start: curPos,
      end: wallLength,
      length: wallLength - curPos
    });
  }

  return solidSpans;
}

/**
 * Computes intelligent auto-joinery for a collection of walls.
 * Detects:
 *   - L-Junctions (Corner Miter): Two endpoints meet -> miters outer & inner corners.
 *   - T-Junctions (Butt Join): Stem endpoint meets host wall body -> trims stem to host face.
 * Returns an enriched wall array with mitered/trimmed polygon boundaries.
 * @param {Array<Object>} walls
 * @param {number} [tolerance=0.35]
 * @returns {Map<string, { polygon: Array<{x: number, y: number}>, junctions: Array<Object>, trimmed: Object }>}
 */
export function calcWallJunctions(walls = [], tolerance = 0.35) {
  const result = new Map();
  if (!Array.isArray(walls) || walls.length === 0) return result;

  // Initialize all walls with default 4-corner polygon
  for (const w of walls) {
    if (!w) continue;
    const poly = calcWallPolygon(w);
    result.set(w.id, {
      polygon: poly,
      junctions: [],
      trimmed: { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }
    });
  }

  const n = walls.length;
  for (let i = 0; i < n; i++) {
    const w1 = walls[i];
    if (!w1) continue;
    const len1 = Math.hypot(w1.x2 - w1.x1, w1.y2 - w1.y1);
    if (len1 < 1e-4) continue;
    const t1 = w1.thickness || 0.2;
    const h1 = t1 / 2;
    const u1 = { x: (w1.x2 - w1.x1) / len1, y: (w1.y2 - w1.y1) / len1 };
    const n1 = { x: -u1.y, y: u1.x };

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const w2 = walls[j];
      if (!w2) continue;
      const len2 = Math.hypot(w2.x2 - w2.x1, w2.y2 - w2.y1);
      if (len2 < 1e-4) continue;
      const t2 = w2.thickness || 0.2;
      const h2 = t2 / 2;
      const u2 = { x: (w2.x2 - w2.x1) / len2, y: (w2.y2 - w2.y1) / len2 };
      const n2 = { x: -u2.y, y: u2.x };

      // 1. Check L-junction (Corner miter) between endpoints
      const checkL = (p1, isEnd1, p2, isEnd2) => {
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const maxTol = Math.max(tolerance, (t1 + t2) / 2 + 0.05);
        if (d <= maxTol) {
          // Angle check to prevent collinear walls from falsely mitering
          const dot = u1.x * u2.x + u1.y * u2.y;
          if (Math.abs(Math.abs(dot) - 1) < 1e-3) return false; // collinear

          // Left and right boundary lines of w1
          // Side A: centerline + n * h, Side B: centerline - n * h
          const w1_sideA1 = { x: w1.x1 + n1.x * h1, y: w1.y1 + n1.y * h1 };
          const w1_sideA2 = { x: w1.x2 + n1.x * h1, y: w1.y2 + n1.y * h1 };
          const w1_sideB1 = { x: w1.x1 - n1.x * h1, y: w1.y1 - n1.y * h1 };
          const w1_sideB2 = { x: w1.x2 - n1.x * h1, y: w1.y2 - n1.y * h1 };

          const w2_sideA1 = { x: w2.x1 + n2.x * h2, y: w2.y1 + n2.y * h2 };
          const w2_sideA2 = { x: w2.x2 + n2.x * h2, y: w2.y2 + n2.y * h2 };
          const w2_sideB1 = { x: w2.x1 - n2.x * h2, y: w2.y1 - n2.y * h2 };
          const w2_sideB2 = { x: w2.x2 - n2.x * h2, y: w2.y2 - n2.y * h2 };

          const interAA = intersectLines(w1_sideA1, w1_sideA2, w2_sideA1, w2_sideA2);
          const interBB = intersectLines(w1_sideB1, w1_sideB2, w2_sideB1, w2_sideB2);

          if (interAA && interBB) {
            const entry1 = result.get(w1.id);
            if (entry1) {
              entry1.junctions.push({
                type: 'L',
                otherWallId: w2.id,
                isEnd: isEnd1,
                cornerPoint: p1,
                miterA: { x: interAA.x, y: interAA.y },
                miterB: { x: interBB.x, y: interBB.y }
              });

              // Adjust polygon corner points on w1
              const poly = entry1.polygon;
              // poly is [p1-B, p2-B, p2+A, p1+A]
              // If w1 start: replace index 0 (B) and index 3 (A)
              // If w1 end: replace index 1 (B) and index 2 (A)
              // Limit miter projection distance to 2.5 * max(t1, t2)
              const maxExt = 2.5 * Math.max(t1, t2);
              if (Math.hypot(interAA.x - p1.x, interAA.y - p1.y) <= maxExt &&
                  Math.hypot(interBB.x - p1.x, interBB.y - p1.y) <= maxExt) {
                if (!isEnd1) {
                  poly[0] = { x: interBB.x, y: interBB.y };
                  poly[3] = { x: interAA.x, y: interAA.y };
                } else {
                  poly[1] = { x: interBB.x, y: interBB.y };
                  poly[2] = { x: interAA.x, y: interAA.y };
                }
              }
            }
            return true;
          }
        }
        return false;
      };

      // Check all 4 endpoint pairs
      const isL = checkL({ x: w1.x1, y: w1.y1 }, false, { x: w2.x1, y: w2.y1 }, false) ||
                  checkL({ x: w1.x1, y: w1.y1 }, false, { x: w2.x2, y: w2.y2 }, true)  ||
                  checkL({ x: w1.x2, y: w1.y2 }, true,  { x: w2.x1, y: w2.y1 }, false) ||
                  checkL({ x: w1.x2, y: w1.y2 }, true,  { x: w2.x2, y: w2.y2 }, true);

      if (isL) continue;

      // 2. Check T-junction (Stem w1 terminates into host body w2)
      const checkT = (pt, isEnd1) => {
        const proj = projectPointOnSegment(pt, { x: w2.x1, y: w2.y1 }, { x: w2.x2, y: w2.y2 });
        // Must hit body (not right on endpoints) and be within half thickness + tolerance
        if (proj.t > 0.05 && proj.t < 0.95 && proj.distance <= h2 + tolerance) {
          const entry1 = result.get(w1.id);
          if (entry1) {
            entry1.junctions.push({
              type: 'T',
              isStem: true,
              hostWallId: w2.id,
              isEnd: isEnd1,
              touchPoint: proj.point
            });

            // Trim stem endpoint inwards towards wall interior by host wall half-thickness h2
            const inwardsX = isEnd1 ? -u1.x : u1.x;
            const inwardsY = isEnd1 ? -u1.y : u1.y;
            const shiftX = inwardsX * h2;
            const shiftY = inwardsY * h2;

            const poly = entry1.polygon;
            if (!isEnd1) {
              poly[0] = { x: poly[0].x + shiftX, y: poly[0].y + shiftY };
              poly[3] = { x: poly[3].x + shiftX, y: poly[3].y + shiftY };
              entry1.trimmed.x1 += shiftX;
              entry1.trimmed.y1 += shiftY;
            } else {
              poly[1] = { x: poly[1].x + shiftX, y: poly[1].y + shiftY };
              poly[2] = { x: poly[2].x + shiftX, y: poly[2].y + shiftY };
              entry1.trimmed.x2 += shiftX;
              entry1.trimmed.y2 += shiftY;
            }
          }
        }
      };

      checkT({ x: w1.x1, y: w1.y1 }, false);
      checkT({ x: w1.x2, y: w1.y2 }, true);
    }
  }

  return result;
}

/**
 * Calculates CAD door swing geometry, leaf position, and SVG arc aligned with wall angle.
 * Supports: swing 'left', 'right', 'double', flipSide (inward vs outward).
 * @param {Object} wall
 * @param {Object} door
 * @returns {Object}
 */
export function calcDoorCADGeometry(wall, door) {
  if (!wall || !door) throw new TypeError('calcDoorCADGeometry expects wall and door');
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) throw new Error('Cannot place door on zero-length wall');

  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y, y: u.x }; // Perpendicular normal
  const t = wall.thickness || 0.2;
  const h = t / 2;

  const wDoor = typeof door.width === 'number' && door.width > 0 ? door.width : 0.9;
  const pos = typeof door.position === 'number' ? Math.max(0, Math.min(len - wDoor, door.position)) : 0;
  const swing = door.swing || 'left';
  const flipSide = Boolean(door.flipSide);

  // Normal swing direction vector (+n or -n)
  const sDir = flipSide ? -1 : 1;
  const sNormal = { x: n.x * sDir, y: n.y * sDir };

  // Jamb 1 (start of opening) and Jamb 2 (end of opening) along wall centerline
  const pJamb1 = { x: wall.x1 + pos * u.x, y: wall.y1 + pos * u.y };
  const pJamb2 = { x: wall.x1 + (pos + wDoor) * u.x, y: wall.y1 + (pos + wDoor) * u.y };

  // Jamb cross lines (outer face to inner face across wall thickness)
  const jamb1Line = [
    { x: pJamb1.x - n.x * h, y: pJamb1.y - n.y * h },
    { x: pJamb1.x + n.x * h, y: pJamb1.y + n.y * h }
  ];
  const jamb2Line = [
    { x: pJamb2.x - n.x * h, y: pJamb2.y - n.y * h },
    { x: pJamb2.x + n.x * h, y: pJamb2.y + n.y * h }
  ];

  if (swing === 'double') {
    const halfW = wDoor / 2;
    const pMid = { x: wall.x1 + (pos + halfW) * u.x, y: wall.y1 + (pos + halfW) * u.y };

    const hinge1 = pJamb1;
    const leaf1 = { x: hinge1.x + halfW * sNormal.x, y: hinge1.y + halfW * sNormal.y };

    const hinge2 = pJamb2;
    const leaf2 = { x: hinge2.x + halfW * sNormal.x, y: hinge2.y + halfW * sNormal.y };

    return {
      type: 'double',
      width: wDoor,
      leafWidth: halfW,
      jamb1Line,
      jamb2Line,
      leaves: [
        { hinge: hinge1, openEnd: leaf1, closedEnd: pMid, radius: halfW },
        { hinge: hinge2, openEnd: leaf2, closedEnd: pMid, radius: halfW }
      ]
    };
  }

  // Single door (left or right swing)
  const isLeft = swing === 'left';
  const hinge = isLeft ? pJamb1 : pJamb2;
  const closedEnd = isLeft ? pJamb2 : pJamb1;

  // Open leaf swings 90 deg out from hinge along normal
  const openEnd = {
    x: hinge.x + wDoor * sNormal.x,
    y: hinge.y + wDoor * sNormal.y
  };

  return {
    type: 'single',
    swing,
    flipSide,
    width: wDoor,
    hinge,
    closedEnd,
    openEnd,
    radius: wDoor,
    jamb1Line,
    jamb2Line
  };
}

/**
 * Calculates CAD window geometry (jambs, sills, and glass lines) aligned with wall angle.
 * @param {Object} wall
 * @param {Object} window
 * @returns {Object}
 */
export function calcWindowCADGeometry(wall, window) {
  if (!wall || !window) throw new TypeError('calcWindowCADGeometry expects wall and window');
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) throw new Error('Cannot place window on zero-length wall');

  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y, y: u.x };
  const t = wall.thickness || 0.2;
  const h = t / 2;

  const wWin = typeof window.width === 'number' && window.width > 0 ? window.width : 1.2;
  const pos = typeof window.position === 'number' ? Math.max(0, Math.min(len - wWin, window.position)) : 0;

  const p1 = { x: wall.x1 + pos * u.x, y: wall.y1 + pos * u.y };
  const p2 = { x: wall.x1 + (pos + wWin) * u.x, y: wall.y1 + (pos + wWin) * u.y };

  // Jamb lines across thickness
  const jamb1 = [
    { x: p1.x - n.x * h, y: p1.y - n.y * h },
    { x: p1.x + n.x * h, y: p1.y + n.y * h }
  ];
  const jamb2 = [
    { x: p2.x - n.x * h, y: p2.y - n.y * h },
    { x: p2.x + n.x * h, y: p2.y + n.y * h }
  ];

  // Outer and inner sill lines
  const sillOuter = [
    { x: p1.x - n.x * h, y: p1.y - n.y * h },
    { x: p2.x - n.x * h, y: p2.y - n.y * h }
  ];
  const sillInner = [
    { x: p1.x + n.x * h, y: p1.y + n.y * h },
    { x: p2.x + n.x * h, y: p2.y + n.y * h }
  ];

  // Center glass pane lines (double glazing standard)
  const glassOffset = Math.min(0.025, h * 0.25);
  const glassPane1 = [
    { x: p1.x - n.x * glassOffset, y: p1.y - n.y * glassOffset },
    { x: p2.x - n.x * glassOffset, y: p2.y - n.y * glassOffset }
  ];
  const glassPane2 = [
    { x: p1.x + n.x * glassOffset, y: p1.y + n.y * glassOffset },
    { x: p2.x + n.x * glassOffset, y: p2.y + n.y * glassOffset }
  ];

  return {
    width: wWin,
    jamb1,
    jamb2,
    sillOuter,
    sillInner,
    glassPane1,
    glassPane2
  };
}

/**
 * Calculates precision CAD dimension drafting geometry:
 * offset dimension line, witness/extension lines with standoff & overshoot,
 * terminations (architectural ticks, arrowheads, dots), and text placement.
 *
 * @param {{x: number, y: number}} p1 - First anchor point
 * @param {{x: number, y: number}} p2 - Second anchor point
 * @param {Object} [options]
 * @param {number} [options.offset=0.6] - Perpendicular offset distance (m). Positive = normal side, negative = opposite.
 * @param {string} [options.style='tick'] - 'tick' | 'arrow' | 'dot'
 * @param {string} [options.orientation='aligned'] - 'aligned' | 'horizontal' | 'vertical'
 * @param {number} [options.standoff=0.08] - Gap between anchor point and witness line start (m)
 * @param {number} [options.overshoot=0.12] - Extension of witness line past dimension line (m)
 * @param {number} [options.tickSize=0.15] - Length of 45-degree architectural slash tick (m)
 * @param {number} [options.arrowLength=0.20] - Length of engineering arrowhead (m)
 * @param {number} [options.arrowWidth=0.08] - Half-width of engineering arrowhead (m)
 * @returns {Object}
 */
export function calcDimensionGeometry(p1, p2, options = {}) {
  if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p2.x !== 'number') {
    throw new TypeError('calcDimensionGeometry expects valid p1 and p2 coordinate objects');
  }

  const offset = typeof options.offset === 'number' ? options.offset : 0.6;
  const style = options.style === 'arrow' || options.style === 'dot' ? options.style : 'tick';
  const orientation = options.orientation === 'horizontal' || options.orientation === 'vertical' ? options.orientation : 'aligned';
  const standoff = typeof options.standoff === 'number' ? options.standoff : 0.08;
  const overshoot = typeof options.overshoot === 'number' ? options.overshoot : 0.12;
  const tickSize = typeof options.tickSize === 'number' ? options.tickSize : 0.15;
  const arrowLength = typeof options.arrowLength === 'number' ? options.arrowLength : 0.20;
  const arrowWidth = typeof options.arrowWidth === 'number' ? options.arrowWidth : 0.08;

  let measuredDistance;
  let u, n;

  if (orientation === 'horizontal') {
    measuredDistance = Math.abs(p2.x - p1.x);
    const dirX = p2.x >= p1.x ? 1 : -1;
    u = { x: dirX, y: 0 };
    const signY = offset >= 0 ? 1 : -1;
    n = { x: 0, y: signY };
  } else if (orientation === 'vertical') {
    measuredDistance = Math.abs(p2.y - p1.y);
    const dirY = p2.y >= p1.y ? 1 : -1;
    u = { x: 0, y: dirY };
    const signX = offset >= 0 ? 1 : -1;
    n = { x: signX, y: 0 };
  } else {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    measuredDistance = Math.hypot(dx, dy);
    if (measuredDistance < 1e-6) {
      u = { x: 1, y: 0 };
      n = { x: 0, y: 1 };
    } else {
      u = { x: dx / measuredDistance, y: dy / measuredDistance };
      n = { x: -u.y, y: u.x };
    }
  }

  const absOffset = Math.abs(offset);
  const offsetSign = offset >= 0 ? 1 : -1;
  const offVector = { x: n.x * offsetSign * absOffset, y: n.y * offsetSign * absOffset };
  const offDist = offsetSign * absOffset;

  // Dimension line endpoints
  const dimP1 = { x: p1.x + offVector.x, y: p1.y + offVector.y };
  const dimP2 = {
    x: orientation === 'horizontal' ? p2.x + offVector.x : (orientation === 'vertical' ? p1.x + offVector.x : p2.x + offVector.x),
    y: orientation === 'horizontal' ? p1.y + offVector.y : (orientation === 'vertical' ? p2.y + offVector.y : p2.y + offVector.y)
  };

  const wDir = {
    x: offDist !== 0 ? offVector.x / Math.hypot(offVector.x, offVector.y) : n.x,
    y: offDist !== 0 ? offVector.y / Math.hypot(offVector.x, offVector.y) : n.y
  };

  const w1Start = { x: p1.x + wDir.x * standoff, y: p1.y + wDir.y * standoff };
  const w1End = { x: dimP1.x + wDir.x * overshoot, y: dimP1.y + wDir.y * overshoot };

  const p2Anchor = {
    x: orientation === 'vertical' ? p1.x : p2.x,
    y: orientation === 'horizontal' ? p1.y : p2.y
  };
  const w2Start = { x: p2Anchor.x + wDir.x * standoff, y: p2Anchor.y + wDir.y * standoff };
  const w2End = { x: dimP2.x + wDir.x * overshoot, y: dimP2.y + wDir.y * overshoot };

  const textMid = {
    x: (dimP1.x + dimP2.x) / 2,
    y: (dimP1.y + dimP2.y) / 2
  };

  let angleDeg = (Math.atan2(dimP2.y - dimP1.y, dimP2.x - dimP1.x) * 180 / Math.PI);
  if (angleDeg > 90) angleDeg -= 180;
  else if (angleDeg < -90) angleDeg += 180;

  let ticks = [];
  let arrows = [];
  let dots = [];

  if (style === 'tick') {
    const halfT = tickSize / 2;
    const tickVec = {
      x: (u.x - u.y) * 0.7071 * halfT,
      y: (u.x + u.y) * 0.7071 * halfT
    };
    ticks = [
      [
        { x: dimP1.x - tickVec.x, y: dimP1.y - tickVec.y },
        { x: dimP1.x + tickVec.x, y: dimP1.y + tickVec.y }
      ],
      [
        { x: dimP2.x - tickVec.x, y: dimP2.y - tickVec.y },
        { x: dimP2.x + tickVec.x, y: dimP2.y + tickVec.y }
      ]
    ];
  } else if (style === 'arrow') {
    const arrow1 = [
      { x: dimP1.x, y: dimP1.y },
      { x: dimP1.x + u.x * arrowLength + n.x * arrowWidth, y: dimP1.y + u.y * arrowLength + n.y * arrowWidth },
      { x: dimP1.x + u.x * arrowLength - n.x * arrowWidth, y: dimP1.y + u.y * arrowLength - n.y * arrowWidth }
    ];
    const arrow2 = [
      { x: dimP2.x, y: dimP2.y },
      { x: dimP2.x - u.x * arrowLength + n.x * arrowWidth, y: dimP2.y - u.y * arrowLength + n.y * arrowWidth },
      { x: dimP2.x - u.x * arrowLength - n.x * arrowWidth, y: dimP2.y - u.y * arrowLength - n.y * arrowWidth }
    ];
    arrows = [arrow1, arrow2];
  } else if (style === 'dot') {
    dots = [
      { x: dimP1.x, y: dimP1.y, radius: 0.05 },
      { x: dimP2.x, y: dimP2.y, radius: 0.05 }
    ];
  }

  return {
    distance: measuredDistance,
    dimLine: [dimP1, dimP2],
    witness1: [w1Start, w1End],
    witness2: [w2Start, w2End],
    textMid,
    textAngle: angleDeg,
    style,
    orientation,
    ticks,
    arrows,
    dots
  };
}

/**
 * Projects a cursor point perpendicularly onto a segment.
 * Returns projection object if the orthogonal foot lands on the segment.
 * @param {{x: number, y: number}} point
 * @param {{x: number, y: number}} lineStart
 * @param {{x: number, y: number}} lineEnd
 * @param {number} [maxDistance=0.35]
 * @returns {Object|null}
 */
export function findPerpendicularProjection(point, lineStart, lineEnd, maxDistance = 0.35) {
  if (!point || !lineStart || !lineEnd) return null;
  const proj = projectPointOnSegment(point, lineStart, lineEnd);
  if (proj.t >= 0.02 && proj.t <= 0.98 && proj.distance <= maxDistance) {
    return {
      x: proj.point.x,
      y: proj.point.y,
      distance: proj.distance,
      t: proj.t,
      type: 'perpendicular'
    };
  }
  return null;
}

/**
 * Detects if a cursor point is tracking the collinear extension ray beyond a segment's endpoints.
 * @param {{x: number, y: number}} point
 * @param {{x: number, y: number}} lineStart
 * @param {{x: number, y: number}} lineEnd
 * @param {number} [maxDistance=3.0]
 * @param {number} [tolerance=0.20]
 * @returns {Object|null}
 */
export function findExtensionSnap(point, lineStart, lineEnd, maxDistance = 3.0, tolerance = 0.20) {
  if (!point || !lineStart || !lineEnd) return null;
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-4) return null;

  const len = Math.sqrt(lenSq);
  // Unclamped t parameter along the infinite line
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;

  // Check if point is outside the segment
  let anchor = null;
  let distFromEndpoint = 0;
  if (t < -0.01) {
    anchor = lineStart;
    distFromEndpoint = Math.abs(t) * len;
  } else if (t > 1.01) {
    anchor = lineEnd;
    distFromEndpoint = (t - 1.0) * len;
  } else {
    return null; // Inside segment body
  }

  if (distFromEndpoint > maxDistance) return null;

  // Perpendicular distance to the line
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  const perpDist = Math.hypot(point.x - projX, point.y - projY);

  if (perpDist <= tolerance) {
    return {
      x: projX,
      y: projY,
      distance: perpDist,
      distFromEndpoint,
      anchor,
      guideRay: [anchor, { x: projX, y: projY }],
      type: 'extension'
    };
  }

  return null;
}

/**
 * Finds all finite segment intersection points among a collection of segments.
 * @param {Array<{p1: {x:number, y:number}, p2: {x:number, y:number}, id?: string}>} segments
 * @returns {Array<{x: number, y: number, segId1?: string, segId2?: string}>}
 */
export function findSegmentIntersections(segments = []) {
  const hits = [];
  const n = segments.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s1 = segments[i];
      const s2 = segments[j];
      if (!s1 || !s2) continue;
      const pt = intersectSegments(s1.p1, s1.p2, s2.p1, s2.p2);
      if (pt) {
        hits.push({
          x: pt.x,
          y: pt.y,
          segId1: s1.id,
          segId2: s2.id,
          type: 'intersection'
        });
      }
    }
  }
  return hits;
}


