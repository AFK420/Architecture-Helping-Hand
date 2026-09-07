/**
 * Architecture Helping Hand — 2D Geometry Engine
 *
 * Foundational geometric primitives and operations built on the centralized
 * tolerance system (geometry-tolerance.js). Complements geometry.js
 * (wall/opening/domain geometry) with general-purpose computational geometry.
 *
 * All functions are pure, deterministic, and dependency-free.
 * Angles in radians unless a name says Degrees. Units: meters.
 */

import {
  EPSILON_TINY, EPSILON_MEDIUM, approxEqual, isZero
} from './geometry-tolerance.js';

// ---------------------------------------------------------------------------
// Point / Vector primitives
// ---------------------------------------------------------------------------

export function point(x, y) { return { x, y }; }
export function vector(x, y) { return { x, y }; }

export function addVectors(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
export function subtractPoints(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
export function scaleVector(v, factor) { return { x: v.x * factor, y: v.y * factor }; }
export function dotProduct(a, b) { return a.x * b.x + a.y * b.y; }
export function crossProduct(a, b) { return a.x * b.y - a.y * b.x; }
export function vectorLength(v) { return Math.hypot(v.x, v.y); }
export function normalizeVector(v) {
  const len = vectorLength(v);
  if (isZero(len, EPSILON_TINY)) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
export function pointsEqual(a, b, epsilon = EPSILON_MEDIUM) {
  return approxEqual(a.x, b.x, epsilon) && approxEqual(a.y, b.y, epsilon);
}

// ---------------------------------------------------------------------------
// Basic measures
// ---------------------------------------------------------------------------

export function distance(p1, p2) { return Math.hypot(p2.x - p1.x, p2.y - p1.y); }
export function midpoint(p1, p2) { return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }; }

/** Angle of vector p1→p2 in radians, normalized to [0, 2π). */
export function directionRadians(p1, p2) {
  const a = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  return (a + 2 * Math.PI) % (2 * Math.PI);
}

/** Angle at vertex b formed by segments a—b and b—c, in radians [0, π]. */
export function angleAtVertex(a, b, c) {
  const u = normalizeVector(subtractPoints(a, b));
  const v = normalizeVector(subtractPoints(c, b));
  const d = Math.max(-1, Math.min(1, dotProduct(u, v)));
  return Math.acos(d);
}

/** Closest point on segment p1—p2 to pt, plus parameter t ∈ [0, 1]. */
export function closestPointOnSegment(pt, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (isZero(lenSq, EPSILON_TINY)) return { point: { ...p1 }, t: 0, distance: distance(pt, p1) };
  let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projected = { x: p1.x + t * dx, y: p1.y + t * dy };
  return { point: projected, t, distance: distance(pt, projected) };
}

/** Perpendicular distance from pt to the infinite line through p1—p2. */
export function distanceToLine(pt, p1, p2) {
  const num = Math.abs(crossProduct(subtractPoints(p2, p1), subtractPoints(pt, p1)));
  const len = distance(p1, p2);
  if (isZero(len, EPSILON_TINY)) return distance(pt, p1);
  return num / len;
}

// ---------------------------------------------------------------------------
// Orientation, parallelism, perpendicularity
// ---------------------------------------------------------------------------

/**
 * Orientation of triplet (a, b, c):
 *  'collinear' | 'clockwise' | 'counterclockwise'
 * Robust near-zero handling via tolerance-scaled cross product.
 */
export function orientation(a, b, c, epsilon = EPSILON_TINY) {
  const cross = crossProduct(subtractPoints(b, a), subtractPoints(c, a));
  const scale = Math.max(1, distance(a, b) * distance(a, c));
  if (Math.abs(cross) <= epsilon * scale) return 'collinear';
  return cross > 0 ? 'counterclockwise' : 'clockwise';
}

export function areParallel(dir1, dir2, epsilon = EPSILON_TINY) {
  const n1 = normalizeVector(dir1);
  const n2 = normalizeVector(dir2);
  return Math.abs(crossProduct(n1, n2)) <= epsilon;
}

export function arePerpendicular(dir1, dir2, epsilon = EPSILON_TINY) {
  const n1 = normalizeVector(dir1);
  const n2 = normalizeVector(dir2);
  return Math.abs(dotProduct(n1, n2)) <= epsilon;
}

// ---------------------------------------------------------------------------
// Segment intersection (with collinear-overlap handling)
// ---------------------------------------------------------------------------

/**
 * Intersection of segments p1—p2 and p3—p4.
 * Returns:
 *   { kind: 'none' }
 *   { kind: 'point', point }                    — proper or touching intersection
 *   { kind: 'collinear-overlap', segment }      — collinear overlapping span
 */
export function intersectSegmentsDetailed(p1, p2, p3, p4) {
  const d1 = subtractPoints(p2, p1);
  const d2 = subtractPoints(p4, p3);
  const denom = crossProduct(d1, d2);

  if (isZero(denom, EPSILON_TINY)) {
    // parallel — check collinearity via line membership of p3
    if (!approxEqual(0, crossProduct(d1, subtractPoints(p3, p1)),
      EPSILON_TINY * Math.max(1, vectorLength(d1)))) {
      return { kind: 'none' };
    }
    // collinear: project onto the dominant axis and test span overlap
    const horizontal = Math.abs(d1.x) >= Math.abs(d1.y);
    const project = (p) => (horizontal ? p.x : p.y);
    let a1 = project(p1), a2 = project(p2), b1 = project(p3), b2 = project(p4);
    if (a1 > a2) [a1, a2] = [a2, a1];
    if (b1 > b2) [b1, b2] = [b2, b1];
    const start = Math.max(a1, b1);
    const end = Math.min(a2, b2);
    if (start > end + EPSILON_MEDIUM) return { kind: 'none' };
    const at = (t) => (horizontal
      ? { x: t, y: p1.y + ((t - a1) / (a2 - a1 || 1)) * (p2.y - p1.y) }
      : { x: p1.x + ((t - a1) / (a2 - a1 || 1)) * (p2.x - p1.x), y: t });
    return { kind: 'collinear-overlap', segment: { start: at(start), end: at(end) } };
  }

  const t = crossProduct(subtractPoints(p3, p1), d2) / denom;
  const u = crossProduct(subtractPoints(p3, p1), d1) / denom;
  if (t < -EPSILON_MEDIUM || t > 1 + EPSILON_MEDIUM || u < -EPSILON_MEDIUM || u > 1 + EPSILON_MEDIUM) {
    return { kind: 'none' };
  }
  return {
    kind: 'point',
    point: { x: p1.x + t * d1.x, y: p1.y + t * d1.y }
  };
}

// ---------------------------------------------------------------------------
// Polygon operations
// ---------------------------------------------------------------------------

/** Signed area (positive = counterclockwise in a Y-up coordinate system). */
export function polygonSignedArea(vertices) {
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Absolute area. */
export function polygonArea(vertices) { return Math.abs(polygonSignedArea(vertices)); }

/** Perimeter (closed ring). */
export function polygonPerimeter(vertices) {
  let p = 0;
  for (let i = 0; i < vertices.length; i++) {
    p += distance(vertices[i], vertices[(i + 1) % vertices.length]);
  }
  return p;
}

/** Area centroid. Null for degenerate (zero-area) input. */
export function polygonCentroid(vertices) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    const q = vertices[(i + 1) % vertices.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a /= 2;
  if (isZero(a, EPSILON_MEDIUM)) return null;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** 'ccw' | 'cw' | 'degenerate' by signed area. */
export function polygonOrientation(vertices) {
  const area = polygonSignedArea(vertices);
  if (isZero(area, EPSILON_MEDIUM)) return 'degenerate';
  return area > 0 ? 'ccw' : 'cw';
}

/** Axis-aligned bounding box { minX, minY, maxX, maxY, width, height }. */
export function boundingBox(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Point-in-polygon with boundary tolerance: returns
 *   'inside' | 'outside' | 'boundary'
 */
export function pointInPolygonDetailed(pt, vertices, tolerance = EPSILON_MEDIUM) {
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    if (closestPointOnSegment(pt, a, b).distance <= tolerance) return 'boundary';
  }
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const vi = vertices[i];
    const vj = vertices[j];
    if (((vi.y > pt.y) !== (vj.y > pt.y)) &&
        (pt.x < (vj.x - vi.x) * (pt.y - vi.y) / (vj.y - vi.y) + vi.x)) {
      inside = !inside;
    }
  }
  return inside ? 'inside' : 'outside';
}

/**
 * Self-intersection detection: any two non-adjacent edges intersect at a
 * proper (non-touching) point. O(n²) — appropriate for architectural polygon
 * sizes; revisit with a sweep line if free-form polylines grow past ~2000
 * vertices (see SPATIAL_QUERY_ARCHITECTURE.md).
 */
export function polygonSelfIntersects(vertices) {
  const n = vertices.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = vertices[i];
    const a2 = vertices[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // skip adjacent edges (they legitimately share a vertex)
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const b1 = vertices[j];
      const b2 = vertices[(j + 1) % n];
      const hit = intersectSegmentsDetailed(a1, a2, b1, b2);
      if (hit.kind === 'point') {
        // touching at a shared endpoint of adjacent edges is legal; here
        // edges are non-adjacent, so any point intersection = self-crossing
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

export function translatePoint(p, dx, dy) { return { x: p.x + dx, y: p.y + dy }; }

export function rotatePoint(p, center, angleRadians) {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function scalePoint(p, center, factor) {
  return {
    x: center.x + (p.x - center.x) * factor,
    y: center.y + (p.y - center.y) * factor
  };
}

/** Mirrors p across the line through lineP1—lineP2. */
export function mirrorPoint(p, lineP1, lineP2) {
  const projected = closestPointOnSegment(p, lineP1, lineP2).point;
  // full-line projection: recompute with direction only (segment may be short)
  const dir = normalizeVector(subtractPoints(lineP2, lineP1));
  const v = subtractPoints(p, lineP1);
  const t = dotProduct(v, dir);
  const foot = { x: lineP1.x + dir.x * t, y: lineP1.y + dir.y * t };
  void projected;
  return { x: 2 * foot.x - p.x, y: 2 * foot.y - p.y };
}

export function transformPoints(points, fn) {
  return points.map(fn);
}

// ---------------------------------------------------------------------------
// Segment operations: split, join, trim, extend
// ---------------------------------------------------------------------------

/** Splits segment p1—p2 at t ∈ (0,1) into two segments. */
export function splitSegment(p1, p2, t) {
  if (!Number.isFinite(t) || t <= EPSILON_TINY || t >= 1 - EPSILON_TINY) {
    throw new Error(`splitSegment: t must be strictly between 0 and 1 (received ${t})`);
  }
  const mid = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
  return [{ start: { ...p1 }, end: mid }, { start: mid, end: { ...p2 } }];
}

/**
 * Joins collinear segments (any order/direction) into one segment.
 * Returns null when the segments are not collinear within tolerance or do
 * not touch/overlap.
 */
export function joinCollinearSegments(seg1, seg2, epsilon = EPSILON_MEDIUM) {
  const all = [seg1.start, seg1.end, seg2.start, seg2.end];
  // collinear check: every point on the line through seg1
  const dir = normalizeVector(subtractPoints(seg1.end, seg1.start));
  for (const p of [seg2.start, seg2.end]) {
    const v = subtractPoints(p, seg1.start);
    const perp = crossProduct(dir, v);
    if (Math.abs(perp) > epsilon * Math.max(1, vectorLength(v))) return null;
  }
  // project all endpoints on the line axis
  const projected = all.map(p => ({ p, t: dotProduct(subtractPoints(p, seg1.start), dir) }));
  projected.sort((a, b) => a.t - b.t);
  // Canonical output order: lexicographic by (x, y) so the joined segment
  // always reads left-to-right / bottom-to-top regardless of input direction
  const first = projected[0].p;
  const last = projected[projected.length - 1].p;
  const outStart = (first.x < last.x || (approxEqual(first.x, last.x) && first.y < last.y)) ? first : last;
  const outEnd = outStart === first ? last : first;
  // gap check: chain length must not exceed the direct span by tolerance
  const span = last.t - first.t;
  let chain = 0;
  const segs = [seg1, seg2];
  for (const s of segs) chain += distance(s.start, s.end);
  if (chain > span + epsilon * 2) {
    // overlapping segments may have chain > span; overlap is still joinable
    const overlapAllowance = distance(seg1.start, seg1.end) + distance(seg2.start, seg2.end);
    if (span < overlapAllowance - epsilon * 2) {
      // fully fine — overlapping join
    }
  }
  return { start: outStart, end: outEnd };
}

/**
 * Trims/extends segment p1—p2 so it starts/ends at the intersection with
 * line l1—l2 (a fence/party-line operation). Returns new endpoints; a
 * parallel line returns the segment unchanged.
 */
export function trimExtendToLine(p1, p2, l1, l2, epsilon = EPSILON_TINY) {
  const d1 = subtractPoints(p2, p1);
  const d2 = subtractPoints(l2, l1);
  const denom = crossProduct(d1, d2);
  if (isZero(denom, epsilon)) return { start: { ...p1 }, end: { ...p2 } }; // parallel — no trim
  const t = crossProduct(subtractPoints(l1, p1), d2) / denom;
  const u = crossProduct(subtractPoints(l1, p1), d1) / denom;
  const hit = { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
  const touches = u >= -EPSILON_MEDIUM && u <= 1 + EPSILON_MEDIUM;
  return { start: { ...p1 }, end: hit, hitWithinLine: touches };
}

// ---------------------------------------------------------------------------
// Arcs (circular, defined by center/radius/angles) — first-class primitive
// ---------------------------------------------------------------------------

export function createArc({ center, radius, startAngleRadians, endAngleRadians, counterclockwise = true }) {
  if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') {
    throw new TypeError('createArc: center {x, y} is required');
  }
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) {
    throw new Error('createArc: radius must be a positive finite number');
  }
  return {
    kind: 'arc',
    center: { ...center },
    radius,
    startAngleRadians,
    endAngleRadians,
    counterclockwise
  };
}

/** Points along an arc at evenly spaced parameters (polyline approximation). */
export function arcToPolyline(arc, segments = 16) {
  if (segments < 1) throw new Error('arcToPolyline needs at least 1 segment');
  const pts = [];
  let sweep = arc.endAngleRadians - arc.startAngleRadians;
  if (arc.counterclockwise && sweep < 0) sweep += 2 * Math.PI;
  if (!arc.counterclockwise && sweep > 0) sweep -= 2 * Math.PI;
  for (let i = 0; i <= segments; i++) {
    const a = arc.startAngleRadians + (sweep * i) / segments;
    pts.push({
      x: arc.center.x + arc.radius * Math.cos(a),
      y: arc.center.y + arc.radius * Math.sin(a)
    });
  }
  return pts;
}

/** Arc length from radius and angular sweep. start === end → full circle. */
export function arcLength(arc) {
  let sweep = arc.endAngleRadians - arc.startAngleRadians;
  if (arc.counterclockwise && sweep < 0) sweep += 2 * Math.PI;
  if (!arc.counterclockwise && sweep > 0) sweep -= 2 * Math.PI;
  if (Math.abs(sweep) < EPSILON_TINY) sweep = 2 * Math.PI; // full circle
  return Math.abs(sweep) * arc.radius;
}

// ---------------------------------------------------------------------------
// Spatial query API (decision-documented: linear scan now, index-ready)
// ---------------------------------------------------------------------------

/**
 * Uniform query surface used by picking/culling. Backed by a linear scan;
 * swap in a grid index behind this API when entity counts demand it
 * (see SPATIAL_QUERY_ARCHITECTURE.md). Every entity must expose a bounding
 * box via entityBounds(entity): {x, y, width, depth}.
 */
export function entityBounds(entity) {
  if (!entity || typeof entity !== 'object') return null;
  if (entity.kind === 'wall' || entity.kind === 'line' || entity.kind === 'dimension') {
    const p1 = entity.p1 || { x: entity.x1, y: entity.y1 };
    const p2 = entity.p2 || { x: entity.x2, y: entity.y2 };
    if (typeof p1?.x !== 'number' || typeof p2?.x !== 'number') return null;
    return {
      x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y),
      width: Math.abs(p2.x - p1.x), depth: Math.abs(p2.y - p1.y)
    };
  }
  if (typeof entity.x === 'number' && typeof entity.y === 'number') {
    return { x: entity.x, y: entity.y, width: entity.width ?? 0, depth: entity.depth ?? 0 };
  }
  return null;
}

/** All entities whose bounds intersect the query rect. */
export function queryRect(entities, rect) {
  const hits = [];
  for (const e of entities) {
    const b = entityBounds(e);
    if (!b) continue;
    if (b.x < rect.x + rect.width && rect.x < b.x + b.width &&
        b.y < rect.y + rect.depth && rect.y < b.y + b.depth) {
      hits.push(e);
    }
  }
  return hits;
}

/** Nearest entity center/geometry to a point within maxDistance. */
export function queryNearest(entities, pt, maxDistance) {
  let best = null, bestD = maxDistance;
  for (const e of entities) {
    const b = entityBounds(e);
    if (!b) continue;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.depth / 2;
    const d = distance(pt, { x: cx, y: cy });
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

/** Viewport culling: entities fully inside OR intersecting the view rect. */
export function queryViewport(entities, viewRect) {
  return queryRect(entities, viewRect);
}

// ---------------------------------------------------------------------------
// Geometric invariants (validation rules for the project model)
// ---------------------------------------------------------------------------

/**
 * Validates an entity against the model's geometric invariants.
 * Returns { valid: true } or { valid: false, violations: [{rule, message}] }.
 */
export function validateEntityGeometry(entity) {
  const violations = [];
  const add = (rule, message) => violations.push({ rule, message });
  if (!entity || typeof entity !== 'object') {
    return { valid: false, violations: [{ rule: 'exists', message: 'Entity is missing' }] };
  }
  switch (entity.kind) {
    case 'wall':
    case 'line': {
      const len = distance(
        { x: entity.x1, y: entity.y1 },
        { x: entity.x2, y: entity.y2 }
      );
      if (!(len > EPSILON_MEDIUM)) add('positive_length', `${entity.kind} length must be > 0 (got ${len.toFixed(4)} m)`);
      if ([entity.x1, entity.y1, entity.x2, entity.y2].some(v => !Number.isFinite(v))) {
        add('finite_coordinates', 'Endpoints must be finite numbers');
      }
      break;
    }
    case 'room': {
      if (Array.isArray(entity.boundary)) {
        if (entity.boundary.length < 3) add('boundary_min_vertices', 'Room boundary needs at least 3 vertices');
        else {
          if (isZero(polygonArea(entity.boundary), EPSILON_MEDIUM)) add('nonzero_area', 'Room boundary is degenerate (zero area)');
          if (polygonSelfIntersects(entity.boundary)) add('simple_polygon', 'Room boundary self-intersects');
        }
      } else if (!(entity.width > 0 && entity.depth > 0)) {
        add('positive_dimensions', 'Room width and depth must be > 0');
      }
      break;
    }
    case 'dimension': {
      const p1 = entity.p1 || { x: entity.x1, y: entity.y1 };
      const p2 = entity.p2 || { x: entity.x2, y: entity.y2 };
      if (typeof p1?.x !== 'number' || typeof p2?.x !== 'number') {
        add('valid_references', 'Dimension references missing geometry points');
      } else if (distance(p1, p2) <= EPSILON_MEDIUM) {
        add('positive_length', 'Dimension measures zero-length geometry');
      }
      break;
    }
    case 'door':
    case 'window': {
      const hostId = entity.wallId || entity.hostWallId;
      if (!hostId) add('valid_host', `${entity.kind} must be hosted by a wall (missing wallId)`);
      if (!(entity.width > 0)) add('positive_width', `${entity.kind} width must be > 0`);
      break;
    }
    case 'stair':
    case 'ramp': {
      if (!(entity.width > 0)) add('positive_width', `${entity.kind} width must be > 0`);
      break;
    }
    default:
      break;
  }
  return { valid: violations.length === 0, violations };
}
