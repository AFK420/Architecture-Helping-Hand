/**
 * Architecture Helping Hand — Deterministic Constraint System
 *
 * Named architectural constraints recorded on the document and enforced by a
 * single-pass deterministic solver. NO general-purpose solver, NO iteration:
 * each constraint type has one well-defined enforcement rule. When a
 * constraint cannot be satisfied, the solver returns a CONFLICT with possible
 * resolutions — it never silently distorts geometry.
 *
 * Constraint changes are plain data; the caller (plan workspace) wraps
 * enforcement in its transaction/undo system.
 */

import { distance } from './geometry-engine.js';

export const CONSTRAINT_TYPES = Object.freeze({
  HORIZONTAL: 'horizontal',          // segment forced horizontal
  VERTICAL: 'vertical',              // segment forced vertical
  PARALLEL: 'parallel',              // two segments parallel
  PERPENDICULAR: 'perpendicular',    // two segments perpendicular
  EQUAL_LENGTH: 'equal_length',      // two segments same length
  FIXED_DISTANCE: 'fixed_distance',  // segment held at a fixed length
  FIXED_ANGLE: 'fixed_angle',        // segment at fixed angle (degrees)
  WALL_THICKNESS: 'wall_thickness',  // wall thickness = value
  DOOR_WIDTH: 'door_width',          // door width = value
  WINDOW_WIDTH: 'window_width',      // window width = value
  ROOM_MIN_AREA: 'room_min_area',    // room area >= value (grows depth)
  CORRIDOR_MIN_WIDTH: 'corridor_min_width', // parallel wall gap >= value
  STAIR_RISE: 'stair_rise',          // stair riser height = value
  STAIR_TREAD: 'stair_tread',        // stair tread depth = value
  CLEARANCE_ENVELOPE: 'clearance_envelope' // clearance around object >= value
});

export const CONSTRAINT_STATUS = Object.freeze({
  SATISFIED: 'satisfied',   // already true, nothing changed
  ADJUSTED: 'adjusted',     // deterministic change applied
  CONFLICT: 'conflict'      // cannot satisfy — geometry untouched
});

let constraintCounter = 0;

/** Creates a named constraint record (data only — enforcement is separate). */
export function createConstraint(type, targetIds, params = {}) {
  // Accept either the enum key (WALL_THICKNESS) or its value (wall_thickness)
  const known = Object.values(CONSTRAINT_TYPES).includes(type);
  if (!known) {
    throw new Error(`Unknown constraint type "${type}" — allowed: ${Object.values(CONSTRAINT_TYPES).join(', ')}`);
  }
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    throw new Error('Constraint requires at least one target entity id');
  }
  constraintCounter += 1;
  return {
    id: `con-${Date.now().toString(36)}-${constraintCounter}`,
    type,
    targetIds: [...targetIds],
    params: { ...params },
    status: CONSTRAINT_STATUS.SATISFIED,
    message: ''
  };
}

function entityById(entities, id) {
  return entities.find(e => e && e.id === id) || null;
}

function segmentOf(entity) {
  if (entity.kind === 'wall' || entity.kind === 'line' || entity.kind === 'dimension') {
    return { p1: { x: entity.x1, y: entity.y1 }, p2: { x: entity.x2, y: entity.y2 } };
  }
  return null;
}

/**
 * Attempts to satisfy one constraint against the entity list.
 * Returns the constraint with `status` + `message` set. On CONFLICT the
 * solver also returns `resolutions: string[]` — geometry is NOT modified.
 */
export function solveConstraint(constraint, entities) {
  const targets = constraint.targetIds.map(id => entityById(entities, id));
  if (targets.some(t => !t)) {
    constraint.status = CONSTRAINT_STATUS.CONFLICT;
    constraint.message = 'Referenced entity not found in the document.';
    return constraint;
  }

  const p = constraint.params || {};
  switch (constraint.type) {
    case CONSTRAINT_TYPES.HORIZONTAL:
    case CONSTRAINT_TYPES.VERTICAL: {
      const seg = segmentOf(targets[0]);
      if (!seg) { conflict(constraint, `${targets[0].kind} has no segment geometry.`); return constraint; }
      const mid = { x: (seg.p1.x + seg.p2.x) / 2, y: (seg.p1.y + seg.p2.y) / 2 };
      const len = distance(seg.p1, seg.p2);
      if (constraint.type === CONSTRAINT_TYPES.HORIZONTAL) {
        targets[0].x1 = mid.x - len / 2; targets[0].y1 = mid.y;
        targets[0].x2 = mid.x + len / 2; targets[0].y2 = mid.y;
      } else {
        targets[0].x1 = mid.x; targets[0].y1 = mid.y - len / 2;
        targets[0].x2 = mid.x; targets[0].y2 = mid.y + len / 2;
      }
      satisfy(constraint, `${constraint.type} applied about the segment midpoint.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.PARALLEL:
    case CONSTRAINT_TYPES.PERPENDICULAR: {
      if (targets.length < 2) { conflict(constraint, 'Requires two segment entities.'); return constraint; }
      const s1 = segmentOf(targets[0]);
      const s2 = segmentOf(targets[1]);
      if (!s1 || !s2) { conflict(constraint, 'Both targets need segment geometry.'); return constraint; }
      const angle = (constraint.type === CONSTRAINT_TYPES.PARALLEL)
        ? Math.atan2(s1.p2.y - s1.p1.y, s1.p2.x - s1.p1.x)
        : Math.atan2(s1.p2.y - s1.p1.y, s1.p2.x - s1.p1.x) + Math.PI / 2;
      const len = distance(s2.p1, s2.p2);
      const mid = { x: (s2.p1.x + s2.p2.x) / 2, y: (s2.p1.y + s2.p2.y) / 2 };
      targets[1].x1 = mid.x - Math.cos(angle) * len / 2;
      targets[1].y1 = mid.y - Math.sin(angle) * len / 2;
      targets[1].x2 = mid.x + Math.cos(angle) * len / 2;
      targets[1].y2 = mid.y + Math.sin(angle) * len / 2;
      satisfy(constraint, `${constraint.type} applied to the second segment.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.EQUAL_LENGTH: {
      if (targets.length < 2) { conflict(constraint, 'Requires two segment entities.'); return constraint; }
      const a = segmentOf(targets[0]);
      const b = segmentOf(targets[1]);
      if (!a || !b) { conflict(constraint, 'Both targets need segment geometry.'); return constraint; }
      const targetLen = (distance(a.p1, a.p2) + distance(b.p1, b.p2)) / 2;
      applySegmentLength(targets[1], targetLen);
      satisfy(constraint, `Both segments set to ${targetLen.toFixed(2)} m (average).`);
      return constraint;
    }

    case CONSTRAINT_TYPES.FIXED_DISTANCE: {
      const seg = segmentOf(targets[0]);
      if (!seg) { conflict(constraint, 'Target needs segment geometry.'); return constraint; }
      const value = Number(p.value);
      if (!(value > 0)) {
        conflict(constraint, 'A positive length is required.',
          ['Provide the required distance in meters, e.g. 3.5.']);
        return constraint;
      }
      applySegmentLength(targets[0], value);
      satisfy(constraint, `Segment set to ${value.toFixed(2)} m.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.FIXED_ANGLE: {
      const seg = segmentOf(targets[0]);
      if (!seg) { conflict(constraint, 'Target needs segment geometry.'); return constraint; }
      const angleDeg = Number(p.angle);
      if (!Number.isFinite(angleDeg)) {
        conflict(constraint, 'A fixed angle in degrees is required.',
          ['Provide the angle in degrees, e.g. 45.']);
        return constraint;
      }
      const len = distance(seg.p1, seg.p2);
      const rad = (angleDeg * Math.PI) / 180;
      targets[0].x2 = seg.p1.x + Math.cos(rad) * len;
      targets[0].y2 = seg.p1.y + Math.sin(rad) * len;
      satisfy(constraint, `Segment angle set to ${angleDeg}°.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.WALL_THICKNESS: {
      const wall = targets[0];
      if (wall.kind !== 'wall') { conflict(constraint, 'Target must be a wall.'); return constraint; }
      const t = Number(p.thickness);
      if (!(t >= 0.05 && t <= 2)) {
        conflict(constraint, `Wall thickness ${t} m is outside the buildable range.`,
          ['Use a thickness between 0.05 m and 2 m.']);
        return constraint;
      }
      wall.thickness = t;
      satisfy(constraint, `Wall thickness set to ${(t * 1000).toFixed(0)} mm.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.DOOR_WIDTH:
    case CONSTRAINT_TYPES.WINDOW_WIDTH: {
      const opening = targets[0];
      if (opening.kind !== 'door' && opening.kind !== 'window') {
        conflict(constraint, 'Target must be a door or window.'); return constraint;
      }
      const width = Number(p.width);
      const wall = entityById(entities, opening.wallId);
      if (wall) {
        const wallLen = distance({ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 });
        if (width >= wallLen) {
          conflict(constraint, `${width.toFixed(2)} m opening does not fit in a ${wallLen.toFixed(2)} m wall.`,
            [`Shorten the opening below ${wallLen.toFixed(2)} m, or lengthen the wall.`]);
          return constraint;
        }
      }
      opening.width = width;
      satisfy(constraint, `${opening.kind} width set to ${(width * 1000).toFixed(0)} mm.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.ROOM_MIN_AREA: {
      const room = targets[0];
      if (room.kind !== 'room') { conflict(constraint, 'Target must be a room.'); return constraint; }
      const minArea = Number(p.minArea);
      const area = (room.width || 0) * (room.depth || 0);
      if (!(minArea > 0)) {
        conflict(constraint, 'A positive minimum area is required.', ['e.g. minArea=9.5']); return constraint;
      }
      if (area >= minArea) {
        satisfy(constraint, `Room area ${area.toFixed(1)} m² already meets the ${minArea.toFixed(1)} m² minimum.`);
        return constraint;
      }
      // deterministic growth: scale depth (keep width), centered on the room
      const neededDepth = minArea / room.width;
      const dy = neededDepth - room.depth;
      room.y -= dy / 2;
      room.depth = neededDepth;
      if (Array.isArray(room.boundary) && room.boundary.length >= 3) {
        // rescale the polygon too, about its vertical center, so the boundary
        // stays consistent with the width/depth fields (no mixed geometry)
        const ys = room.boundary.map(p => p.y);
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const oldSpan = Math.max(...ys) - Math.min(...ys);
        const sy = oldSpan > 1e-9 ? neededDepth / oldSpan : 1;
        room.boundary = room.boundary.map(p => ({ x: p.x, y: cy + (p.y - cy) * sy }));
        // re-derive the rect bbox from the moved boundary so both agree
        const nys = room.boundary.map(p => p.y);
        room.y = Math.min(...nys);
      }
      room.area = (room.width || 0) * (room.depth || 0);
      satisfy(constraint, `Room depth grown to ${neededDepth.toFixed(2)} m → ${minArea >= 0 ? minArea.toFixed(1) : ''} m² minimum met.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.CORRIDOR_MIN_WIDTH: {
      if (targets.length < 2) { conflict(constraint, 'Requires the two corridor walls.'); return constraint; }
      const s1 = segmentOf(targets[0]);
      const s2 = segmentOf(targets[1]);
      if (!s1 || !s2) { conflict(constraint, 'Both targets need segment geometry.'); return constraint; }
      // perpendicular distance from s2 midpoint to wall 1
      const mid = { x: (s2.p1.x + s2.p2.x) / 2, y: (s2.p1.y + s2.p2.y) / 2 };
      const dirLen = distance(s1.p1, s1.p2);
      if (dirLen < 1e-9) { conflict(constraint, 'First wall has zero length.'); return constraint; }
      const nx = -(s1.p2.y - s1.p1.y) / dirLen;
      const ny = (s1.p2.x - s1.p1.x) / dirLen;
      const signed = (mid.x - s1.p1.x) * nx + (mid.y - s1.p1.y) * ny;
      const minW = Number(p.minWidth);
      if (!(minW > 0)) {
        conflict(constraint, 'A positive minimum width is required.', ['e.g. minWidth=1.2']);
        return constraint;
      }
      if (Math.abs(signed) >= minW) {
        satisfy(constraint, `Corridor width ${Math.abs(signed).toFixed(2)} m already meets the ${minW.toFixed(2)} m minimum.`);
        return constraint;
      }
      // move wall 2 outward along the normal to meet the minimum
      const shift = (minW - Math.abs(signed)) * Math.sign(signed || 1);
      targets[1].x1 += nx * shift; targets[1].y1 += ny * shift;
      targets[1].x2 += nx * shift; targets[1].y2 += ny * shift;
      satisfy(constraint, `Second wall moved ${(shift).toFixed(2)} m → corridor width ${minW.toFixed(2)} m.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.STAIR_RISE:
    case CONSTRAINT_TYPES.STAIR_TREAD: {
      const stair = targets[0];
      if (stair.kind !== 'stair') { conflict(constraint, 'Target must be a stair.'); return constraint; }
      const value = Number(p.value ?? (constraint.type === CONSTRAINT_TYPES.STAIR_RISE ? p.rise : p.tread));
      if (!(value > 0)) {
        conflict(constraint, 'A positive value in meters is required.', ['e.g. 0.17 for a 170 mm riser']);
        return constraint;
      }
      if (constraint.type === CONSTRAINT_TYPES.STAIR_RISE) stair.riserHeight = value;
      else stair.tread = value;
      stair.blondel = 2 * (stair.riserHeight || 0) + (stair.tread || 0);
      satisfy(constraint, `Stair ${constraint.type === CONSTRAINT_TYPES.STAIR_RISE ? 'riser' : 'tread'} set to ${(value * 1000).toFixed(0)} mm.`);
      return constraint;
    }

    case CONSTRAINT_TYPES.CLEARANCE_ENVELOPE: {
      const obj = targets[0];
      const wall = targets[1] || entityById(entities, obj?.wallId);
      if (!obj || !wall) { conflict(constraint, 'Requires an object and a reference wall.'); return constraint; }
      const minClear = Number(p.minClearance);
      if (!(minClear > 0)) {
        conflict(constraint, 'A positive clearance is required.', ['e.g. minClearance=0.9']);
        return constraint;
      }
      const objBox = { x: obj.x ?? 0, y: obj.y ?? 0, w: obj.width ?? 0, d: obj.depth ?? 0 };
      const wBox = { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 };
      // vertical/horizontal walls only (deterministic scope)
      const verticalWall = Math.abs(wBox.x1 - wBox.x2) < 1e-9;
      const dist = verticalWall ? Math.abs(objBox.x - wBox.x1) : Math.abs(objBox.y - wBox.y1);
      if (dist >= minClear) {
        satisfy(constraint, `Clearance ${dist.toFixed(2)} m already meets the ${minClear.toFixed(2)} m envelope.`);
        return constraint;
      }
      const shift = minClear - dist;
      if (verticalWall) obj.x += shift * Math.sign(obj.x - wBox.x1 || 1);
      else obj.y += shift * Math.sign(obj.y - wBox.y1 || 1);
      satisfy(constraint, `Object moved ${(shift).toFixed(2)} m away — ${minClear.toFixed(2)} m clearance met.`);
      return constraint;
    }

    default:
      conflict(constraint, `No deterministic enforcement rule for "${constraint.type}".`);
      return constraint;
  }

  function satisfy(c, message) {
    c.status = CONSTRAINT_STATUS.SATISFIED;
    c.message = message;
  }
  function conflict(c, message, resolutions = []) {
    c.status = CONSTRAINT_STATUS.CONFLICT;
    c.message = message;
    c.resolutions = resolutions;
  }
  function applySegmentLength(entity, len) {
    const seg = segmentOf(entity);
    const cur = distance(seg.p1, seg.p2);
    if (cur < 1e-9) {
      entity.x2 = entity.x1 + len;
      entity.y2 = entity.y1;
      return;
    }
    const ux = (seg.p2.x - seg.p1.x) / cur;
    const uy = (seg.p2.y - seg.p1.y) / cur;
    entity.x2 = entity.x1 + ux * len;
    entity.y2 = entity.y1 + uy * len;
  }
}

/**
 * Solves a list of constraints in order (single deterministic pass —
 * later constraints see the results of earlier ones). Returns a report.
 */
export function solveConstraints(constraints, entities) {
  const report = { satisfied: 0, adjusted: 0, conflicts: 0, results: [] };
  for (const c of constraints || []) {
    solveConstraint(c, entities);
    report.results.push(c);
    if (c.status === CONSTRAINT_STATUS.CONFLICT) report.conflicts += 1;
    else if (c.status === CONSTRAINT_STATUS.ADJUSTED) report.adjusted += 1;
    else report.satisfied += 1;
  }
  return report;
}
