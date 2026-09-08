/**
 * Architecture Helping Hand — Deterministic Suggestion Engine
 *
 * Evidence-backed, ranked suggestions for a selected entity or a whole
 * document. NO AI involved: every finding is computed from real geometry with
 * a citable number, so the AI layer can quote them and the user can trust
 * them. Severity: critical > high > medium > low > informational.
 */

import { wallLength, roomArea, roomPerimeter, roomAspectRatio, wallOpenings } from './entities.js';

const BLONDEL_MIN = 0.6;
const BLONDEL_MAX = 0.66;
const RAMP_MAX_SLOPE = 8.33;

function sev(level) {
  return { critical: 0, high: 1, medium: 2, low: 3, informational: 4 }[level] ?? 4;
}

/**
 * Suggestions for one selected entity.
 * @returns {Array<{severity, problem, evidence, recommendation, toolId}>}
 */
export function suggestForEntity(entity, entities = []) {
  if (!entity) return [];
  const out = [];
  const push = (severity, problem, evidence, recommendation, toolId) =>
    out.push({ severity, problem, evidence, recommendation, toolId });

  switch (entity.kind) {
    case 'wall': {
      const len = wallLength(entity);
      const touching = entities.filter(d => d.kind === 'dimension' && suggestDimensionOnWall(d, entity));
      if (touching.length === 0) {
        push('medium', 'Wall has no dimension annotation',
          `Wall "${entity.name}" is ${len.toFixed(2)} m long; no dimension entity references its endpoints.`,
          'Place a linear dimension (DIMLIN) so the drawing communicates its length.', 'dimension');
      }
      const thickness = entity.thickness ?? 0.2;
      if (thickness < 0.1) {
        push('high', 'Wall thickness below light-frame minimum',
          `Thickness ${thickness.toFixed(3)} m is thinner than a 100 mm partition.`,
          'Verify the assembly — most buildable partitions are ≥ 0.10 m.', 'properties');
      }
      const openings = wallOpenings(entity, entities);
      for (const o of openings) {
        if (typeof o.width === 'number' && o.width > len - 0.1) {
          push('high', 'Opening wider than the wall segment',
            `"${o.name}" is ${o.width.toFixed(2)} m in a ${len.toFixed(2)} m wall segment.`,
            'Shorten the opening, lengthen the wall, or split the wall.', 'window');
        }
      }
      const junctions = entities.filter(w => w.kind === 'wall' && w.id !== entity.id && sharesEndpoint(w, entity)).length;
      if (junctions === 0) {
        push('low', 'Wall is disconnected',
          `"${entity.name}" shares no endpoint with any other wall.`,
          'Join it to the wall network (WALL command snaps to endpoints).', 'wall');
      }
      break;
    }
    case 'room': {
      const area = roomArea(entity);
      const ratio = roomAspectRatio(entity);
      if (ratio > 2.5) {
        push('medium', 'Room proportions are extreme',
          `Aspect ratio ${ratio.toFixed(2)}:1 (${entity.width?.toFixed(2)} × ${entity.depth?.toFixed(2)} m).`,
          'Consider an L-shape, an internal partition, or re-proportioning.', 'room');
      }
      const furniture = entities.filter(f => f.kind === 'furniture' &&
        f.x >= entity.x - 0.01 && f.x <= entity.x + entity.width + 0.01 &&
        f.y >= entity.y - 0.01 && f.y <= entity.y + entity.depth + 0.01);
      if (furniture.length > 0) {
        const furnitureArea = furniture.reduce((s, f) => s + (f.width * f.depth || 0), 0);
        const density = area > 0 ? furnitureArea / area : 0;
        if (density > 0.45) {
          push('high', 'Furniture density very high',
            `Furniture occupies ${(density * 100).toFixed(0)}% of the ${(area).toFixed(1)} m² room floor.`,
            'Reduce furniture, enlarge the room, or check circulation with a clearance test.', 'select');
        } else if (density > 0.32) {
          push('medium', 'Furniture density above comfortable range',
            `Furniture occupies ${(density * 100).toFixed(0)}% of the floor; comfortable plans stay under ~32%.`,
            'Verify clearances around each piece.', 'select');
        }
      }
      const name = String(entity.name || '').toLowerCase();
      if (/bed/.test(name) && area > 0 && area < 7.5) {
        push('medium', 'Bedroom below common minimum',
          `Named bedroom is ${area.toFixed(1)} m²; many codes/standards expect ≥ 7.5 m² for a habitable bedroom.`,
          'Enlarge the room or rename it to match its actual function.', 'room');
      }
      const dims = entities.filter(d => d.kind === 'dimension' && suggestDimensionNearRoom(d, entity));
      if (dims.length === 0) {
        push('low', 'Room is undimensioned',
          `No dimension entities sit on the boundaries of "${entity.name}".`,
          'Add dimension chains for construction layout (DIMCHAIN tool).', 'dimension');
      }
      break;
    }
    case 'stair': {
      const blondel = typeof entity.blondel === 'number' ? entity.blondel : 2 * (entity.riserHeight || 0) + (entity.tread || 0);
      if (blondel > 0 && (blondel < BLONDEL_MIN || blondel > BLONDEL_MAX)) {
        push('medium', 'Stair proportion outside the Blondel band',
          `2R+T = ${(blondel * 1000).toFixed(0)} mm (comfort band 600–660 mm).`,
          'Adjust riser/tread with the Stair Calculator (STAIR command or the studio tool).', 'stair');
      }
      const risers = entity.risers ?? 0;
      if (risers > 16) {
        push('informational', 'Flight exceeds 16 risers',
          `${risers} risers in one flight — many codes require an intermediate landing beyond 16.`,
          'Split the flight with a landing.', 'stair');
      }
      break;
    }
    case 'ramp': {
      const slope = typeof entity.slopePercent === 'number' ? entity.slopePercent : null;
      if (slope !== null && slope > RAMP_MAX_SLOPE + 0.05) {
        push('high', 'Ramp steeper than the 1:12 accessibility maximum',
          `Slope ${slope.toFixed(2)}% (1:${(entity.slopeRatio || 100 / slope).toFixed(1)}).`,
          'Lengthen the run or add switchbacks (Ramp Calculator).', 'ramp');
      }
      break;
    }
    case 'dimension': {
      const val = suggestDimensionValue(entity);
      const match = entities.find(t => (t.kind === 'wall' || t.kind === 'line' || t.kind === 'room') &&
        Math.abs(suggestEntityPrimaryLength(t) - val) < 0.02);
      if (!match) {
        push('medium', 'Dimension does not match any nearby geometry',
          `Dimension measures ${val.toFixed(2)} m; no wall/line/room edge of that exact length exists in the document.`,
          'Re-measure with DIST and re-place the dimension, or update the geometry.', 'measure');
      } else {
        push('informational', 'Dimension verified against geometry',
          `${val.toFixed(2)} m matches ${match.kind} "${match.name}" (${suggestEntityPrimaryLength(match).toFixed(2)} m).`,
          'No action needed.', null);
      }
      break;
    }
    case 'door': {
      const host = entity.wallId ? entities.find(w => w.id === entity.wallId) : null;
      if (!host) {
        push('low', 'Door has no verified host wall',
          `"${entity.name}" is not linked to a wall segment in this document.`,
          'Re-place it on a wall so swing and clearance stay valid.', 'door');
      }
      break;
    }
    case 'furniture': {
      const hostRoom = entities.find(r => r.kind === 'room' &&
        entity.x >= r.x - 0.01 && entity.x <= r.x + r.width + 0.01 &&
        entity.y >= r.y - 0.01 && entity.y <= r.y + r.depth + 0.01);
      if (!hostRoom) {
        push('low', 'Furniture placed outside any room',
          `"${entity.name}" does not sit inside a room boundary.`,
          'Move it into a room for clearance and density checks.', 'move');
      }
      break;
    }
    default:
      break;
  }
  return out.sort((a, b) => sev(a.severity) - sev(b.severity));
}

/**
 * Whole-document suggestions: overlaps, undimensioned walls, extreme rooms,
 * non-compliant stairs/ramps, unplaced furniture.
 */
export function suggestForDocument(entities = []) {
  const out = [];
  const push = (severity, problem, evidence, recommendation, toolId) =>
    out.push({ severity, problem, evidence, recommendation, toolId });

  const rooms = entities.filter(e => e.kind === 'room');
  const walls = entities.filter(e => e.kind === 'wall');
  const stairs = entities.filter(e => e.kind === 'stair');
  const ramps = entities.filter(e => e.kind === 'ramp');

  const roomOverlaps = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
      if (ox > 0.02 && oy > 0.02) roomOverlaps.push({ a, b, ox, oy });
    }
  }
  if (roomOverlaps.length > 0) {
    push('high', 'Room footprints overlap',
      `${roomOverlaps.length} overlapping room pair(s), e.g. "${roomOverlaps[0].a.name}" × "${roomOverlaps[0].b.name}" (${(roomOverlaps[0].ox * roomOverlaps[0].oy).toFixed(1)} m² shared).`,
      'Resolve the overlap before area schedules are trusted.', 'select');
  }

  const undimensioned = walls.filter(w => !entities.some(d => d.kind === 'dimension' && suggestDimensionOnWall(d, w)));
  if (walls.length > 2 && undimensioned.length > walls.length / 2) {
    push('medium', 'Most walls are undimensioned',
      `${undimensioned.length} of ${walls.length} walls carry no dimension on their endpoints.`,
      'Run dimension chains or DIMLIN per wall for layout.', 'dimension');
  }

  for (const s of stairs) {
    const blondel = typeof s.blondel === 'number' ? s.blondel : 2 * (s.riserHeight || 0) + (s.tread || 0);
    if (blondel > 0 && (blondel < BLONDEL_MIN || blondel > BLONDEL_MAX)) {
      out.push(...suggestForEntity(s, entities));
      break; // one representative stair finding keeps the list scannable
    }
  }
  for (const r of ramps) {
    if (typeof r.slopePercent === 'number' && r.slopePercent > RAMP_MAX_SLOPE + 0.05) {
      out.push(...suggestForEntity(r, entities));
      break;
    }
  }

  const orphanFurniture = entities.filter(f => f.kind === 'furniture' &&
    !rooms.some(r => f.x >= r.x - 0.01 && f.x <= r.x + r.width + 0.01 && f.y >= r.y - 0.01 && f.y <= r.y + r.depth + 0.01));
  if (orphanFurniture.length > 0) {
    push('low', 'Furniture outside room boundaries',
      `${orphanFurniture.length} piece(s) not inside any room (e.g. "${orphanFurniture[0].name}").`,
      'Move into rooms so clearance/density checks apply.', 'move');
  }

  if (rooms.length > 0 && entities.filter(e => e.kind === 'dimension').length === 0) {
    push('medium', 'Plan has zero dimensions',
      `${rooms.length} room(s) but no dimension entities anywhere in the document.`,
      'Add overall + room dimensions before issuing the plan.', 'dimension');
  }

  return out.sort((a, b) => sev(a.severity) - sev(b.severity));
}

// --- helpers ---------------------------------------------------------------

function suggestDimensionValue(d) {
  const p1 = d.p1 || { x: d.x1, y: d.y1 };
  const p2 = d.p2 || { x: d.x2, y: d.y2 };
  if (typeof p1?.x !== 'number' || typeof p2?.x !== 'number') return NaN;
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function suggestDimensionOnWall(d, wall) {
  const p1 = d.p1 || { x: d.x1, y: d.y1 };
  const p2 = d.p2 || { x: d.x2, y: d.y2 };
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.05;
  return (near(p1, { x: wall.x1, y: wall.y1 }) && near(p2, { x: wall.x2, y: wall.y2 })) ||
         (near(p1, { x: wall.x2, y: wall.y2 }) && near(p2, { x: wall.x1, y: wall.y1 }));
}

function suggestDimensionNearRoom(d, room) {
  const p1 = d.p1 || { x: d.x1, y: d.y1 };
  const p2 = d.p2 || { x: d.x2, y: d.y2 };
  const nearEdge = p => Math.abs(p.x - room.x) < 0.05 || Math.abs(p.x - (room.x + room.width)) < 0.05 ||
                        Math.abs(p.y - room.y) < 0.05 || Math.abs(p.y - (room.y + room.depth)) < 0.05;
  return nearEdge(p1) && nearEdge(p2);
}

function sharesEndpoint(w, other) {
  const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 0.05;
  const pts = [{ x: other.x1, y: other.y1 }, { x: other.x2, y: other.y2 }];
  return [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }].some(p => pts.some(q => near(p, q)));
}

function suggestEntityPrimaryLength(e) {
  if (e.kind === 'wall' || e.kind === 'line') return wallLength(e);
  if (e.kind === 'room') return typeof e.width === 'number' ? e.width : 0;
  return 0;
}
