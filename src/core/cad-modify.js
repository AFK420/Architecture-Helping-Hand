/**
 * Architecture Helping Hand — CAD Modify Operations
 *
 * Pure geometry transforms for the classic modify toolkit: mirror, arbitrary
 * rotate, scale-factor, wall offset, and linear array. Every op:
 *   - takes entities (any canvas shape: segment walls/lines/dims, rect
 *     entities, polygon-boundary rooms, hosted openings) and parameters,
 *   - returns NEW cloned entities (input untouched),
 *   - preserves stable identity (fresh ids via the entity factory),
 *   - keeps hosted openings consistent with their moved/rotated hosts.
 *
 * The plan view wraps these in undoable commands; the command registry
 * exposes them as MIRROR / ROTATE / SCALE / OFFSET / ARRAY.
 */

import { generateEntityId } from './entities.js';
import { rotatePoint as rotatePointRad, mirrorPoint as mirrorPointLine } from './geometry-engine.js';

// ---------------------------------------------------------------------------
// Geometry helpers (shared with the canvas' world model)
// ---------------------------------------------------------------------------

function rotateDeg(p, cx, cy, deg) {
  return rotatePointRad(p, { x: cx, y: cy }, (deg * Math.PI) / 180);
}

function mirrorAcrossAxis(p, axis) {
  return mirrorPointLine(p, { x: axis.x1, y: axis.y1 }, { x: axis.x2, y: axis.y2 });
}

function segmentCenter(e) {
  return { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2 };
}

function rectCenter(e) {
  return { x: (e.x || 0) + (e.width || 0) / 2, y: (e.y || 0) + (e.depth || 0) / 2 };
}

function entityCenter(e) {
  if (Number.isFinite(e.x1) && Number.isFinite(e.x2)) return segmentCenter(e);
  if (Array.isArray(e.boundary) && e.boundary.length >= 3) {
    const xs = e.boundary.map(p => p.x), ys = e.boundary.map(p => p.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }
  if (Number.isFinite(e.x)) return rectCenter(e);
  return { x: 0, y: 0 };
}

/** True for wall/line/dimension entities stored as x1/y1/x2/y2. */
function isSegmentEntity(e) {
  return Number.isFinite(e.x1) && Number.isFinite(e.y1) && Number.isFinite(e.x2) && Number.isFinite(e.y2);
}

function cloneWithId(e) {
  const c = JSON.parse(JSON.stringify(e));
  c.id = generateEntityId(e.kind || 'item');
  if (c.name && !/copy/i.test(c.name)) c.name = `${c.name} (Copy)`;
  c.locked = false;
  return c;
}

// ---------------------------------------------------------------------------
// Point-map dispatch — applies fn(p)→p' to every geometric field of an entity
// ---------------------------------------------------------------------------

function mapEntityPoints(e, fn) {
  if (isSegmentEntity(e)) {
    const p1 = fn({ x: e.x1, y: e.y1 });
    const p2 = fn({ x: e.x2, y: e.y2 });
    e.x1 = p1.x; e.y1 = p1.y; e.x2 = p2.x; e.y2 = p2.y;
    if (e.kind === 'dimension') {
      e.p1 = { x: p1.x, y: p1.y };
      e.p2 = { x: p2.x, y: p2.y };
      e.x = Math.min(p1.x, p2.x);
      e.y = Math.min(p1.y, p2.y);
      e.width = Math.abs(p2.x - p1.x);
      e.depth = Math.abs(p2.y - p1.y);
      e.name = `${Math.hypot(p2.x - p1.x, p2.y - p1.y).toFixed(2)}m`;
    }
    return e;
  }
  if (Array.isArray(e.p1)) { /* leader points handled below */ }
  if (Array.isArray(e.boundary) && e.boundary.length >= 3) {
    e.boundary = e.boundary.map(fn);
    const xs = e.boundary.map(p => p.x), ys = e.boundary.map(p => p.y);
    e.x = Math.min(...xs); e.y = Math.min(...ys);
    e.width = Math.max(...xs) - e.x;
    e.depth = Math.max(...ys) - e.y;
    return e;
  }
  // leader-style point records
  if (e.p1 && typeof e.p1.x === 'number') {
    e.p1 = fn(e.p1);
    if (e.knee) e.knee = fn(e.knee);
    if (e.p2) e.p2 = fn(e.p2);
  }
  if (Number.isFinite(e.x) && Number.isFinite(e.y)) {
    const p = fn({ x: e.x, y: e.y });
    e.x = p.x; e.y = p.y;
  }
  return e;
}

// ---------------------------------------------------------------------------
// Public operations
// ---------------------------------------------------------------------------

/**
 * MIRROR: clones the entities across a mirror axis { x1, y1, x2, y2 }.
 * Returns the new mirrored clones (originals stay).
 */
export function mirrorEntities(entities, axis) {
  if (!Array.isArray(entities) || entities.length === 0) return [];
  if (!axis || !Number.isFinite(axis.x1) || !Number.isFinite(axis.y1) ||
      !Number.isFinite(axis.x2) || !Number.isFinite(axis.y2)) {
    throw new Error('MIRROR needs an axis: two points (x1,y1)-(x2,y2).');
  }
  const out = [];
  for (const e of entities) {
    if (!e || e.kind === 'door' || e.kind === 'window') continue; // hosted: mirror via their host
    const c = cloneWithId(e);
    mapEntityPoints(c, p => mirrorAcrossAxis(p, axis));
    if (c.kind === 'leader') c.flipSide = !c.flipSide;
    out.push(c);
  }
  return out;
}

/**
 * ROTATE: rotates the entities in place by `degrees` about a center point.
 * Hosted openings rotate around their host's center (kept on the wall).
 */
export function rotateEntities(entities, degrees, center) {
  if (!Array.isArray(entities) || entities.length === 0) return entities;
  if (!Number.isFinite(degrees)) throw new Error('ROTATE needs an angle in degrees.');
  const cx = Number.isFinite(center?.x) ? center.x : entityCenter(entities[0]).x;
  const cy = Number.isFinite(center?.y) ? center.y : entityCenter(entities[0]).y;
  for (const e of entities) {
    if (!e) continue;
    mapEntityPoints(e, p => rotateDeg(p, cx, cy, degrees));
  }
  return entities;
}

/**
 * SCALE: multiplies entity geometry by `factor` about a center point.
 * Rect entities grow width/depth; segment entities stretch; polygon
 * boundaries rescale; thickness scales with the wall.
 */
export function scaleEntities(entities, factor, center) {
  if (!Array.isArray(entities) || entities.length === 0) return entities;
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('SCALE needs a positive factor (e.g. 2 or 0.5).');
  const cx = Number.isFinite(center?.x) ? center.x : entityCenter(entities[0]).x;
  const cy = Number.isFinite(center?.y) ? center.y : entityCenter(entities[0]).y;
  for (const e of entities) {
    if (!e) continue;
    const hadBoundary = Array.isArray(e.boundary) && e.boundary.length >= 3;
    mapEntityPoints(e, p => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
    // Rect fields: boundary entities already got w/d from the mapped polygon;
    // plain rect entities (furniture/stairs) need the explicit multiply.
    if (!hadBoundary && Number.isFinite(e.width)) e.width *= factor;
    if (!hadBoundary && Number.isFinite(e.depth)) e.depth *= factor;
    if (Number.isFinite(e.thickness)) e.thickness *= factor;
  }
  return entities;
}

/**
 * OFFSET (walls): creates one parallel copy of each segment entity at
 * `distance` meters to the left (+) or right (−) of its direction.
 */
export function offsetEntities(entities, distance) {
  if (!Array.isArray(entities) || entities.length === 0) return [];
  if (!Number.isFinite(distance) || distance === 0) {
    throw new Error('OFFSET needs a non-zero distance in meters.');
  }
  const out = [];
  for (const e of entities) {
    if (!isSegmentEntity(e)) continue;
    const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const nx = (-dy / len) * distance;
    const ny = (dx / len) * distance;
    const c = cloneWithId(e);
    c.x1 = e.x1 + nx; c.y1 = e.y1 + ny;
    c.x2 = e.x2 + nx; c.y2 = e.y2 + ny;
    if (c.kind === 'dimension') {
      c.p1 = { x: c.x1, y: c.y1 };
      c.p2 = { x: c.x2, y: c.y2 };
    }
    out.push(c);
  }
  return out;
}

/**
 * ARRAY (linear): creates `count` copies spaced `spacing` meters apart along
 * direction `deg` (0 = +x), starting from the originals' position.
 */
export function arrayEntitiesLinear(entities, count, spacing, deg = 0) {
  if (!Array.isArray(entities) || entities.length === 0) return [];
  if (!Number.isInteger(count) || count < 2) throw new Error('ARRAY needs a count ≥ 2.');
  if (!Number.isFinite(spacing) || spacing <= 0) throw new Error('ARRAY needs a positive spacing in meters.');
  const r = (deg * Math.PI) / 180;
  const ux = Math.cos(r), uy = Math.sin(r);
  const out = [];
  for (let i = 1; i < count; i++) {
    const dx = ux * spacing * i;
    const dy = uy * spacing * i;
    for (const e of entities) {
      if (!e || e.kind === 'door' || e.kind === 'window') continue;
      const c = cloneWithId(e);
      mapEntityPoints(c, p => ({ x: p.x + dx, y: p.y + dy }));
      out.push(c);
    }
  }
  return out;
}
