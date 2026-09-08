/**
 * Architecture Helping Hand — Deterministic Issue Engine
 *
 * A rule registry where every rule is an explicit record:
 *   { id, name, severity, scope, description, run(entities, context) }
 *
 * run() returns issue objects or null. Issues carry: id, severity, rule,
 * entityIds, location, evidence, message, recommendation, status, createdAt.
 * Every check is deterministic — same model in, same issues out. No AI.
 *
 * Status vocabulary: PASS | WARNING | FAIL | NOT_APPLICABLE | NEEDS_INPUT |
 * UNVERIFIED. The engine emits issues for WARNING/FAIL; PASS summaries come
 * from the report object.
 */

import { polygonSelfIntersects, polygonArea, distance, orientation } from './geometry-engine.js';
import { validateEntityGeometry } from './geometry-engine.js';

export const ISSUE_SEVERITIES = Object.freeze(['critical', 'high', 'medium', 'low', 'info']);
export const ISSUE_STATUS = Object.freeze(['FAIL', 'WARNING', 'PASS', 'NOT_APPLICABLE', 'NEEDS_INPUT', 'UNVERIFIED']);

let issueCounter = 0;
function issue(severity, rule, entityIds, location, evidence, message, recommendation) {
  issueCounter += 1;
  return {
    id: `iss-${Date.now().toString(36)}-${issueCounter}`,
    severity,
    rule,
    entityIds: [...entityIds],
    location: location ? { ...location } : null,
    evidence: { ...evidence },
    message,
    recommendation,
    status: severity === 'critical' || severity === 'high' ? 'FAIL' : 'WARNING',
    createdAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// Rule registry — every rule is explicit and self-describing
// ---------------------------------------------------------------------------

export const RULES = [];
function rule(def, run) {
  RULES.push(Object.freeze({
    id: def.id, name: def.name, severity: def.severity, scope: def.scope,
    description: def.description, recommendedAction: def.recommendedAction,
    run
  }));
}

// --- Geometry rules ---------------------------------------------------------

rule(
  { id: 'geo.invalid', name: 'Invalid geometry', severity: 'critical', scope: 'entity',
    description: 'Entity fails basic geometric validity (zero length, bad boundary, missing host).',
    recommendedAction: 'Recreate the entity or correct its geometry.' },
  (entities, ctx) => {
    const issues = [];
    for (const e of entities) {
      const v = validateEntityGeometry(e);
      if (!v.valid) {
        issues.push(issue('critical', 'geo.invalid', [e.id],
          bboxOf(e), { violations: v.violations.map(x => x.message) },
          `${e.kind} "${e.name || e.id}" has invalid geometry: ${v.violations.map(x => x.message).join('; ')}.`,
          'Correct the geometry or delete and redraw the entity.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'geo.self_intersection', name: 'Self-intersecting boundary', severity: 'high', scope: 'entity',
    description: 'A room boundary crosses itself (bowtie shape).',
    recommendedAction: 'Re-trace the boundary so edges do not cross.' },
  (entities) => {
    const issues = [];
    for (const e of entities) {
      if (e.kind === 'room' && Array.isArray(e.boundary) && e.boundary.length >= 4) {
        if (polygonSelfIntersects(e.boundary)) {
          issues.push(issue('high', 'geo.self_intersection', [e.id], bboxOf(e),
            { vertices: e.boundary.length },
            `Room "${e.name}" boundary self-intersects — its area is not well defined.`,
            'Re-trace the room boundary so edges do not cross.'));
        }
      }
    }
    return issues;
  }
);

rule(
  { id: 'geo.duplicate', name: 'Duplicate entity', severity: 'medium', scope: 'document',
    description: 'Two entities of the same kind occupy the same position with the same size.',
    recommendedAction: 'Delete one of the duplicates.' },
  (entities) => {
    const issues = [];
    const boxes = new Map();
    for (const e of entities) {
      if (typeof e.x !== 'number' || typeof e.y !== 'number') continue;
      const key = `${e.kind}|${e.x}|${e.y}|${e.width ?? ''}|${e.depth ?? ''}`;
      if (boxes.has(key)) {
        issues.push(issue('medium', 'geo.duplicate', [boxes.get(key), e.id], bboxOf(e),
          { position: { x: e.x, y: e.y }, kind: e.kind },
          `Two ${e.kind} entities occupy the exact same position ("${entities.find(x => x.id === boxes.get(key))?.name || boxes.get(key)}" and "${e.name || e.id}").`,
          'Delete one of the duplicates.'));
      } else {
        boxes.set(key, e.id);
      }
    }
    return issues;
  }
);

rule(
  { id: 'geo.overlap', name: 'Overlapping rooms', severity: 'high', scope: 'document',
    description: 'Two room footprints overlap.',
    recommendedAction: 'Move or resize one of the rooms.' },
  (entities) => {
    const issues = [];
    const rooms = entities.filter(e => e.kind === 'room' && typeof e.width === 'number');
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i], b = rooms[j];
        const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
        if (ox > 0.02 && oy > 0.02) {
          issues.push(issue('high', 'geo.overlap', [a.id, b.id],
            { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
            { overlapArea: +(ox * oy).toFixed(2), a: a.name, b: b.name },
            `Rooms "${a.name}" and "${b.name}" overlap by ${(ox * oy).toFixed(1)} m².`,
            'Move or resize one room so footprints do not overlap.'));
        }
      }
    }
    return issues;
  }
);

rule(
  { id: 'geo.disconnected', name: 'Disconnected wall', severity: 'low', scope: 'entity',
    description: 'A wall shares no endpoint with any other wall.',
    recommendedAction: 'Snap the wall endpoint to the wall network or delete the stray wall.' },
  (entities) => {
    const issues = [];
    const walls = entities.filter(e => e.kind === 'wall');
    const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.05;
    for (const w of walls) {
      const pts = [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }];
      const connected = walls.some(o => o !== w &&
        [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }].some(p => pts.some(q => near(p, q))));
      if (walls.length > 1 && !connected) {
        issues.push(issue('low', 'geo.disconnected', [w.id], bboxOf(w),
          { length: +Math.hypot(w.x2 - w.x1, w.y2 - w.y1).toFixed(2) },
          `Wall "${w.name}" shares no endpoint with any other wall.`,
          'Snap its endpoints onto the wall network or delete it.'));
      }
    }
    return issues;
  }
);

// --- Room rules --------------------------------------------------------------

rule(
  { id: 'room.min_area', name: 'Room below minimum area', severity: 'medium', scope: 'entity',
    description: 'Named habitable room is below the configured minimum area.',
    recommendedAction: 'Enlarge the room or adjust the minimum.' },
  (entities, ctx) => {
    const issues = [];
    const minArea = ctx?.roomMinArea ?? 7.5;
    for (const e of entities) {
      if (e.kind !== 'room' || !/bed/i.test(String(e.name || ''))) continue;
      const area = (e.width || 0) * (e.depth || 0);
      if (area > 0 && area < minArea) {
        issues.push(issue('medium', 'room.min_area', [e.id], bboxOf(e),
          { area: +area.toFixed(2), minimum: minArea },
          `Bedroom "${e.name}" is ${area.toFixed(1)} m², below the ${minArea} m² habitable minimum.`,
          `Enlarge the room (constraint: room_min_area) or rename it to match its actual use.`));
      }
    }
    return issues;
  }
);

rule(
  { id: 'room.proportion', name: 'Extreme room proportion', severity: 'low', scope: 'entity',
    description: 'Room aspect ratio exceeds 2.5:1.',
    recommendedAction: 'Re-proportion the room or introduce a partition.' },
  (entities) => {
    const issues = [];
    for (const e of entities) {
      if (e.kind !== 'room' || !(e.width > 0) || !(e.depth > 0)) continue;
      const ratio = Math.max(e.width, e.depth) / Math.min(e.width, e.depth);
      if (ratio > 2.5) {
        issues.push(issue('low', 'room.proportion', [e.id], bboxOf(e),
          { ratio: +ratio.toFixed(2), width: e.width, depth: e.depth },
          `Room "${e.name}" has an aspect ratio of ${ratio.toFixed(2)}:1 (over 2.5:1).`,
          'Re-proportion, add a partition, or accept the corridor-like proportion.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'room.missing_door', name: 'Room without a door', severity: 'medium', scope: 'entity',
    description: 'A room has no door opening on its bounds.',
    recommendedAction: 'Place a door on one of the bounding walls.' },
  (entities) => {
    const issues = [];
    const rooms = entities.filter(e => e.kind === 'room' && typeof e.width === 'number');
    for (const r of rooms) {
      const hasDoor = entities.some(d => d.kind === 'door' &&
        d.x >= r.x - 0.3 && d.x <= r.x + r.width + 0.3 &&
        d.y >= r.y - 0.3 && d.y <= r.y + r.depth + 0.3);
      if (!hasDoor) {
        issues.push(issue('medium', 'room.missing_door', [r.id], bboxOf(r),
          { room: r.name },
          `Room "${r.name}" has no door within its bounds.`,
          'Place a door on one of the bounding walls.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'room.missing_window', name: 'Habitable room without a window', severity: 'low', scope: 'entity',
    description: 'A bedroom/living room has no window (daylighting).',
    recommendedAction: 'Place a window on an exterior wall.' },
  (entities) => {
    const issues = [];
    for (const r of entities.filter(e => e.kind === 'room')) {
      if (!/bed|liv|living/i.test(String(r.name || ''))) continue;
      const hasWin = entities.some(w => w.kind === 'window' &&
        w.x >= r.x - 0.3 && w.x <= r.x + r.width + 0.3 &&
        w.y >= r.y - 0.3 && w.y <= r.y + r.depth + 0.3);
      if (!hasWin) {
        issues.push(issue('low', 'room.missing_window', [r.id], bboxOf(r),
          { room: r.name },
          `Habitable room "${r.name}" has no window.`,
          'Place a window on an exterior wall for daylighting.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'room.furniture_fit', name: 'Furniture outside its room', severity: 'low', scope: 'entity',
    description: 'Furniture footprint is not fully inside any room.',
    recommendedAction: 'Move the furniture into a room.' },
  (entities) => {
    const issues = [];
    const rooms = entities.filter(e => e.kind === 'room');
    for (const f of entities.filter(e => e.kind === 'furniture')) {
      const host = rooms.find(r => f.x >= r.x - 0.01 && f.x + f.width <= r.x + r.width + 0.01 &&
        f.y >= r.y - 0.01 && f.y + f.depth <= r.y + r.depth + 0.01);
      if (!host) {
        issues.push(issue('low', 'room.furniture_fit', [f.id], bboxOf(f),
          { furniture: f.name },
          `Furniture "${f.name}" is not fully inside a room.`,
          'Move it into a room (or accept it as free-placed).'));
      }
    }
    return issues;
  }
);

// --- Door / window rules ------------------------------------------------------

rule(
  { id: 'door.host', name: 'Door without host wall', severity: 'medium', scope: 'entity',
    description: 'A door is not hosted by a wall in this document.',
    recommendedAction: 'Re-place the door on a wall.' },
  (entities) => {
    const issues = [];
    for (const d of entities.filter(e => e.kind === 'door')) {
      const host = entities.find(w => w.kind === 'wall' &&
        (w.id === d.wallId || pointNearSegment({ x: d.x, y: d.y }, w, 0.3)));
      if (!host) {
        issues.push(issue('medium', 'door.host', [d.id], bboxOf(d),
          { door: d.name },
          `Door "${d.name}" has no host wall at its position.`,
          'Re-place the door on a wall (doors snap to walls).'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'door.clearance', name: 'Door swing blocked', severity: 'medium', scope: 'entity',
    description: 'Another object sits inside the door swing area.',
    recommendedAction: 'Move the obstruction or flip the swing.' },
  (entities) => {
    const issues = [];
    for (const d of entities.filter(e => e.kind === 'door')) {
      const swingR = (d.width || 0.9);
      const cx = (d.x ?? 0) + (d.swing === 'right' ? swingR : 0);
      const cy = (d.y ?? 0) - swingR;
      const blocker = entities.find(o => o !== d && o.kind === 'furniture' &&
        typeof o.x === 'number' &&
        o.x + o.width > cx - swingR && o.x < cx + swingR &&
        o.y + o.depth > Math.min(d.y ?? 0, cy) && o.y < Math.max(d.y ?? 0, cy));
      if (blocker) {
        issues.push(issue('medium', 'door.clearance', [d.id, blocker.id], bboxOf(d),
          { door: d.name, blockedBy: blocker.name, swingRadius: +swingR.toFixed(2) },
          `Door "${d.name}" swing area is blocked by "${blocker.name}".`,
          'Move the furniture or flip the door swing.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'window.host', name: 'Window without host wall', severity: 'medium', scope: 'entity',
    description: 'A window is not hosted by a wall in this document.',
    recommendedAction: 'Re-place the window on a wall.' },
  (entities) => {
    const issues = [];
    for (const w of entities.filter(e => e.kind === 'window')) {
      const host = entities.find(wall => wall.kind === 'wall' &&
        (wall.id === w.wallId || pointNearSegment({ x: w.x, y: w.y }, wall, 0.3)));
      if (!host) {
        issues.push(issue('medium', 'window.host', [w.id], bboxOf(w),
          { window: w.name },
          `Window "${w.name}" has no host wall at its position.`,
          'Re-place the window on a wall.'));
      }
    }
    return issues;
  }
);

// --- Dimension rules -----------------------------------------------------------

rule(
  { id: 'dim.mismatch', name: 'Dimension does not match geometry', severity: 'medium', scope: 'entity',
    description: 'A recorded dimension equals no wall/line/room edge in the document.',
    recommendedAction: 'Re-measure with DIST and re-place the dimension.' },
  (entities) => {
    const issues = [];
    const measure = (d) => {
      const p1 = d.p1 || { x: d.x1, y: d.y1 };
      const p2 = d.p2 || { x: d.x2, y: d.y2 };
      return (typeof p1?.x === 'number' && typeof p2?.x === 'number')
        ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : NaN;
    };
    const edgeLen = (t) => {
      if (t.kind === 'wall' || t.kind === 'line') return Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
      if (t.kind === 'room') return t.width;
      return NaN;
    };
    for (const d of entities.filter(e => e.kind === 'dimension')) {
      const val = measure(d);
      if (!Number.isFinite(val)) continue;
      const match = entities.some(t => (t.kind === 'wall' || t.kind === 'line' || t.kind === 'room') &&
        Math.abs(edgeLen(t) - val) < 0.02);
      if (!match) {
        issues.push(issue('medium', 'dim.mismatch', [d.id], bboxOf(d),
          { recorded: +val.toFixed(3) },
          `Dimension ${val.toFixed(2)} m matches no wall/line/room edge.`,
          'Re-measure with DIST and re-place the dimension, or update the geometry.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'dim.duplicate', name: 'Duplicate dimensions', severity: 'low', scope: 'document',
    description: 'Two dimensions measure the same span at the same place.',
    recommendedAction: 'Delete one of the duplicates.' },
  (entities) => {
    const issues = [];
    const dims = entities.filter(e => e.kind === 'dimension');
    const seen = new Map();
    const measure = (d) => {
      const p1 = d.p1 || { x: d.x1, y: d.y1 };
      const p2 = d.p2 || { x: d.x2, y: d.y2 };
      return (typeof p1?.x === 'number') ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : null;
    };
    for (const d of dims) {
      const key = `${Math.round((d.x ?? 0) * 10)}|${Math.round((d.y ?? 0) * 10)}|${measure(d)?.toFixed(2)}`;
      if (seen.has(key)) {
        issues.push(issue('low', 'dim.duplicate', [seen.get(key), d.id], bboxOf(d),
          { measured: measure(d)?.toFixed(2) },
          'Two dimensions measure the same span at the same place.',
          'Delete one of the duplicates.'));
      } else {
        seen.set(key, d.id);
      }
    }
    return issues;
  }
);

// --- Stair / ramp rules ---------------------------------------------------------

rule(
  { id: 'stair.blondel', name: 'Stair outside Blondel band', severity: 'medium', scope: 'entity',
    description: 'Stair 2R+T is outside the 600–660 mm comfort band.',
    recommendedAction: 'Adjust riser/tread with the Stair Calculator.' },
  (entities) => {
    const issues = [];
    for (const s of entities.filter(e => e.kind === 'stair')) {
      const blondel = typeof s.blondel === 'number' ? s.blondel : 2 * (s.riserHeight || 0) + (s.tread || 0);
      if (blondel > 0 && (blondel < 0.6 || blondel > 0.66)) {
        issues.push(issue('medium', 'stair.blondel', [s.id], bboxOf(s),
          { blondelMm: Math.round(blondel * 1000) },
          `Stair "${s.name}" 2R+T = ${Math.round(blondel * 1000)} mm (band 600–660 mm).`,
          'Adjust riser height and tread.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'stair.riser_high', name: 'Riser above maximum', severity: 'high', scope: 'entity',
    description: 'Stair riser exceeds 190 mm.',
    recommendedAction: 'Add risers to reduce the riser height.' },
  (entities) => {
    const issues = [];
    for (const s of entities.filter(e => e.kind === 'stair')) {
      const rh = s.riserHeight ?? 0;
      if (rh > 0.19) {
        issues.push(issue('high', 'stair.riser_high', [s.id], bboxOf(s),
          { riserMm: Math.round(rh * 1000) },
          `Stair "${s.name}" riser is ${Math.round(rh * 1000)} mm (over 190 mm).`,
          'Add risers to bring the riser height down.'));
      }
    }
    return issues;
  }
);

rule(
  { id: 'ramp.slope', name: 'Ramp steeper than 1:12', severity: 'high', scope: 'entity',
    description: 'Ramp slope exceeds the 8.33% accessibility maximum.',
    recommendedAction: 'Lengthen the run or add switchbacks.' },
  (entities) => {
    const issues = [];
    for (const r of entities.filter(e => e.kind === 'ramp')) {
      if (typeof r.slopePercent === 'number' && r.slopePercent > 8.33 + 0.05) {
        issues.push(issue('high', 'ramp.slope', [r.id], bboxOf(r),
          { slopePercent: +r.slopePercent.toFixed(2), ratio: `1:${(r.slopeRatio || 100 / r.slopePercent).toFixed(1)}` },
          `Ramp "${r.name}" is ${r.slopePercent.toFixed(2)}% (steeper than 1:12).`,
          'Lengthen the run or add switchbacks.'));
      }
    }
    return issues;
  }
);

// --- Documentation rules ---------------------------------------------------------

rule(
  { id: 'doc.missing_dimension', name: 'Undimensioned walls', severity: 'medium', scope: 'document',
    description: 'Most walls carry no dimension on their endpoints.',
    recommendedAction: 'Run dimension chains or DIMLIN per wall.' },
  (entities) => {
    const issues = [];
    const walls = entities.filter(e => e.kind === 'wall');
    if (walls.length < 3) return issues;
    const undimensioned = walls.filter(w => !entities.some(d => d.kind === 'dimension' && dimensionOnWall(d, w)));
    if (undimensioned.length > walls.length / 2) {
      issues.push(issue('medium', 'doc.missing_dimension',
        undimensioned.slice(0, 8).map(w => w.id), bboxOf(walls[0]),
        { undimensioned: undimensioned.length, total: walls.length },
        `${undimensioned.length} of ${walls.length} walls carry no dimension.`,
        'Add dimension chains or per-wall DIMLIN for construction layout.'));
    }
    return issues;
  }
);

rule(
  { id: 'doc.missing_north', name: 'No north arrow', severity: 'low', scope: 'document',
    description: 'The plan has no north arrow.',
    recommendedAction: 'Place a north arrow (north tool) for orientation.' },
  (entities) => {
    const hasNorth = entities.some(e => e.kind === 'north_arrow');
    if (!hasNorth && entities.filter(e => e.kind === 'room').length > 0) {
      return [issue('low', 'doc.missing_north', [], null,
        {}, 'The plan has no north arrow for orientation.',
        'Place a north arrow (north tool).')];
    }
    return [];
  }
);

rule(
  { id: 'doc.missing_annotation', name: 'Rooms without labels', severity: 'low', scope: 'document',
    description: 'Rooms carry default auto-generated names.',
    recommendedAction: 'Rename rooms to their functional names.' },
  (entities) => {
    const issues = [];
    for (const r of entities.filter(e => e.kind === 'room')) {
      if (/^Room \d+/.test(String(r.name || ''))) {
        issues.push(issue('low', 'doc.missing_annotation', [r.id], bboxOf(r),
          { name: r.name },
          `Room "${r.name}" still has its default generated name.`,
          'Rename it to its functional name (e.g. Bedroom, Kitchen).'));
      }
    }
    return issues;
  }
);

// --- helpers ---------------------------------------------------------------------

function bboxOf(e) {
  if (!e) return null;
  if (e.kind === 'wall' || e.kind === 'line' || e.kind === 'dimension') {
    const p1 = { x: e.x1 ?? e.p1?.x ?? 0, y: e.y1 ?? e.p1?.y ?? 0 };
    const p2 = { x: e.x2 ?? e.p2?.x ?? 0, y: e.y2 ?? e.p2?.y ?? 0 };
    return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p2.x - p1.x), depth: Math.abs(p2.y - p1.y) };
  }
  return { x: e.x ?? 0, y: e.y ?? 0, width: e.width ?? 0, depth: e.depth ?? 0 };
}

function pointNearSegment(p, wall, tol) {
  const seg = (a, b, c, d) => {
    const lenSq = (d.y - c.y) ** 2 + (d.x - c.x) ** 2;
    if (lenSq < 1e-12) return Math.hypot(p.x - c, p.y - c) < tol;
    let t = ((p.x - c) * (d.x - c) + (p.y - c) * (d.y - c)) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (c + t * (d.x - c)), p.y - (c + t * (d.y - c))) < tol;
  };
  return seg(0, 0, wall.x1, wall.y1, wall.x2, wall.y2) || seg(0, 0, wall.x1, wall.y1, wall.x2, wall.y2);
}

function dimensionOnWall(d, wall) {
  const p1 = d.p1 || { x: d.x1, y: d.y1 };
  const p2 = d.p2 || { x: d.x2, y: d.y2 };
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.05;
  return (near(p1, { x: wall.x1, y: wall.y1 }) && near(p2, { x: wall.x2, y: wall.y2 })) ||
         (near(p1, { x: wall.x2, y: wall.y2 }) && near(p2, { x: wall.x1, y: wall.y1 }));
}

// ---------------------------------------------------------------------------
// Engine entry point
// ---------------------------------------------------------------------------

/**
 * Runs all registered rules against an entity list.
 * @param {Array<Object>} entities - active document entities
 * @param {Object} [context] - rule parameters (roomMinArea, …)
 * @returns {{ issues: Array, passed: number, failed: number, warning: number,
 *            rulesRun: number, ranAt: string }}
 */
export function runAllChecks(entities, context = {}) {
  const list = Array.isArray(entities) ? entities : [];
  const all = [];
  for (const r of RULES) {
    try {
      all.push(...r.run(list, context));
    } catch (e) {
      // a failing rule must not abort the audit — report as UNVERIFIED
      all.push(issue('low', r.id + '.unverified', [], null,
        { reason: e.message?.slice(0, 120) },
        `Rule "${r.id}" could not run: ${e.message?.slice(0, 80)}`,
        'Inspect the rule inputs.'));
    }
  }
  return {
    issues: all,
    failed: all.filter(i => i.status === 'FAIL').length,
    warning: all.filter(i => i.status === 'WARNING').length,
    passed: 0,
    rulesRun: RULES.length,
    ranAt: new Date().toISOString()
  };
}

/** Rule registry metadata for UI/debug display. */
export function listRules() {
  return RULES.map(r => ({ id: r.id, name: r.name, severity: r.severity, scope: r.scope, description: r.description }));
}
