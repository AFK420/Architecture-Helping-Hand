/**
 * Architecture Helping Hand - Space Planning Core
 * Phase 5: deterministic spatial reasoning over plan entities.
 *
 * Evidence-first: every check returns numbers explaining the verdict —
 * never a bare boolean. Clearance values are USER-CONFIGURED study
 * envelopes, NOT universal legal requirements (labels: User Configured /
 * Educational Reference / Needs Verification).
 *
 * Scope: rectilinear rooms/furniture (axis-aligned rects), straight
 * corridors. No pathfinding, no terrain, no compliance claims.
 */

import { roomArea, roomContainsPoint, rectsIntersect } from './entities.js';
import { wallRect } from './plan-canvas.js';

/** Default clearance envelopes (educational study values, user-configurable). */
export const DEFAULT_CLEARANCES = Object.freeze({
  circulation: 0.9,      // m — common study value for a walkway
  wheelchairTurning: 1.5, // m — widely taught turning circle diameter (study value)
  doorApproach: 0.75,    // m — clear space in front of a door (study value)
  bedSide: 0.6,          // m — walking space beside a bed (study value)
  deskChair: 0.75,       // m — chair pull-back (study value)
  diningChair: 0.75      // m — chair pull-back (study value)
});

/**
 * Furniture-fit check for one piece inside one room.
 * @returns {{ verdict: 'fits'|'partial'|'no-fit', evidence: {...} }}
 */
export function checkFurnitureFit(furniture, room) {
  if (!furniture || !room) {
    return { verdict: 'no-fit', evidence: { reason: 'missing furniture or room' } };
  }
  const fr = { x: furniture.x, y: furniture.y, width: furniture.width, depth: furniture.depth };
  const fitsEntirely = fr.x >= room.x - 1e-9 && fr.y >= room.y - 1e-9 &&
    fr.x + fr.width <= room.x + room.width + 1e-9 &&
    fr.y + fr.depth <= room.y + room.depth + 1e-9;

  if (fitsEntirely) {
    return {
      verdict: 'fits',
      evidence: {
        furnitureId: furniture.id, roomId: room.id,
        furnitureWidth: furniture.width, furnitureDepth: furniture.depth,
        roomWidth: room.width, roomDepth: room.depth,
        marginEast: room.x + room.width - (fr.x + fr.width),
        marginWest: fr.x - room.x,
        marginNorth: room.y + room.depth - (fr.y + fr.depth),
        marginSouth: fr.y - room.y
      }
    };
  }

  // Partial: does any part overlap the room?
  const intersects = rectsIntersect(fr, { x: room.x, y: room.y, width: room.width, depth: room.depth });
  if (intersects) {
    return {
      verdict: 'partial',
      evidence: {
        furnitureId: furniture.id, roomId: room.id,
        reason: 'Furniture partially inside the room — protrudes beyond a wall.',
        furnitureWidth: furniture.width, furnitureDepth: furniture.depth,
        roomWidth: room.width, roomDepth: room.depth
      }
    };
  }
  return {
    verdict: 'no-fit',
    evidence: { furnitureId: furniture.id, roomId: room.id, reason: 'Furniture entirely outside the room.' }
  };
}

/**
 * Clearance envelope check: does the furniture respect the requested
 * clearance on all sides within the room? (Envelope-based, not pathfinding.)
 */
export function checkClearance(furniture, room, clearanceMeters, clearanceLabel = 'User Configured') {
  const fr = furniture;
  const innerRoom = {
    x: room.x + clearanceMeters,
    y: room.y + clearanceMeters,
    width: room.width - 2 * clearanceMeters,
    depth: room.depth - 2 * clearanceMeters
  };
  if (innerRoom.width <= 0 || innerRoom.depth <= 0) {
    return {
      satisfied: false, clearanceMeters, clearanceLabel,
      evidence: { reason: `Room smaller than 2 × clearance (${clearanceMeters} m on each side).` }
    };
  }
  const inside = fr.x >= innerRoom.x - 1e-9 && fr.y >= innerRoom.y - 1e-9 &&
    fr.x + fr.width <= innerRoom.x + innerRoom.width + 1e-9 &&
    fr.y + fr.depth <= innerRoom.y + innerRoom.depth + 1e-9;

  return {
    satisfied: inside,
    clearanceMeters,
    clearanceLabel,
    evidence: inside
      ? { reason: `Furniture stays within the ${clearanceMeters} m envelope on all sides.` }
      : {
          reason: `Furniture breaches the ${clearanceMeters} m envelope on at least one side.`,
          availableMarginEast: innerRoom.x + innerRoom.width - (fr.x + fr.width),
          availableMarginWest: fr.x - innerRoom.x,
          availableMarginNorth: innerRoom.y + innerRoom.depth - (fr.y + fr.depth),
          availableMarginSouth: fr.y - innerRoom.y
        }
  };
}

/**
 * Overlap detection between furniture pieces, furniture vs walls, and
 * furniture outside any room. Deterministic rect math with evidence.
 */
export function checkOverlaps(furnitureList, rooms, walls) {
  const conflicts = [];
  const furn = furnitureList || [];
  const roomList = rooms || [];
  const wallList = walls || [];

  // furniture vs furniture
  for (let i = 0; i < furn.length; i++) {
    for (let j = i + 1; j < furn.length; j++) {
      if (rectsIntersect(furn[i], furn[j])) {
        conflicts.push({
          type: 'furniture-furniture',
          a: furn[i].id, b: furn[j].id,
          aName: furn[i].name, bName: furn[j].name,
          evidence: `Overlap area between "${furn[i].name}" and "${furn[j].name}".`
        });
      }
    }
    // furniture vs walls
    for (const w of wallList) {
      if (rectsIntersect(furn[i], wallRect(w))) {
        conflicts.push({
          type: 'furniture-wall',
          a: furn[i].id, b: w.id,
          aName: furn[i].name, bName: w.name,
          evidence: `"${furn[i].name}" intersects wall "${w.name}".`
        });
      }
    }
    // furniture outside every room
    const contained = roomList.some(r =>
      furn[i].x >= r.x - 1e-9 && furn[i].y >= r.y - 1e-9 &&
      furn[i].x + furn[i].width <= r.x + r.width + 1e-9 &&
      furn[i].y + furn[i].depth <= r.y + r.depth + 1e-9);
    if (roomList.length > 0 && !contained) {
      conflicts.push({
        type: 'furniture-outside-room',
        a: furn[i].id, b: null,
        aName: furn[i].name, bName: null,
        evidence: `"${furn[i].name}" is not fully inside any room.`
      });
    }
  }
  return { conflicts, count: conflicts.length };
}

/**
 * Adjacency: explicit relationships between rooms sharing a wall edge or
 * declared in the project. Returns satisfied/missing with evidence.
 * Touch test: rooms are adjacent if any edge of one coincides with an edge
 * of the other (within epsilon) — corner-only contact is NOT adjacency.
 */
export function checkAdjacency(adjacencyRequirements, rooms) {
  const roomList = rooms || [];
  const eps = 1e-6;
  const results = (adjacencyRequirements || []).map(req => {
    const a = roomList.find(r => r.id === req.a || r.name === req.a);
    const b = roomList.find(r => r.id === req.b || r.name === req.b);
    if (!a || !b) {
      return { ...req, satisfied: false, evidence: 'One or both rooms do not exist in the plan.' };
    }
    // Vertical edge shared: a right edge == b left edge (or vice versa), with y-overlap
    const verticalTouch =
      (Math.abs((a.x + a.width) - b.x) < eps || Math.abs((b.x + b.width) - a.x) < eps) &&
      a.y < b.y + b.depth - eps && b.y < a.y + a.depth - eps;
    // Horizontal edge shared: a top edge == b bottom edge (or vice versa), with x-overlap
    const horizontalTouch =
      (Math.abs((a.y + a.depth) - b.y) < eps || Math.abs((b.y + b.depth) - a.y) < eps) &&
      a.x < b.x + b.width - eps && b.x < a.x + a.width - eps;
    const touching = verticalTouch || horizontalTouch;
    return {
      ...req,
      satisfied: touching,
      evidence: touching
        ? `"${a.name}" and "${b.name}" share an edge.`
        : `"${a.name}" and "${b.name}" do not share an edge in the current plan.`
    };
  });
  const satisfiedCount = results.filter(r => r.satisfied).length;
  return { results, satisfiedCount, total: results.length };
}

/**
 * Efficiency metrics for a plan. Formulas documented in evidence.
 */
export function calculateEfficiency(rooms, furnitureList, circulationAreaM2 = 0) {
  const roomList = rooms || [];
  const furn = furnitureList || [];
  const totalRoomArea = roomList.reduce((acc, r) => acc + roomArea(r), 0);
  const occupiedArea = furn.reduce((acc, f) => acc + f.width * f.depth, 0);
  const circulation = Math.max(0, circulationAreaM2);
  const usableArea = Math.max(0, totalRoomArea - occupiedArea - circulation);
  return {
    totalRoomAreaM2: totalRoomArea,
    occupiedAreaM2: occupiedArea,
    circulationAreaM2: circulation,
    usableAreaM2: usableArea,
    occupancyPercent: totalRoomArea > 0 ? (occupiedArea / totalRoomArea) * 100 : 0,
    circulationPercent: totalRoomArea > 0 ? (circulation / totalRoomArea) * 100 : 0,
    furnitureCount: furn.length,
    roomCount: roomList.length,
    formulaNotes: {
      usableArea: 'totalRoomArea − occupiedArea − circulationArea',
      occupancyPercent: 'occupiedArea / totalRoomArea × 100',
      circulationPercent: 'circulationArea / totalRoomArea × 100',
      note: 'Circulation area is user-supplied (rectangle sum or estimate) — the analyzer does not pathfind.'
    }
  };
}

/**
 * Layout comparison across snapshots/options: shows differences rather than
 * declaring a winner.
 */
export function compareLayouts(layouts) {
  const rows = (layouts || []).map((l, idx) => ({
    label: l.label || `Option ${String.fromCharCode(65 + idx)}`,
    roomCount: (l.rooms || []).length,
    totalAreaM2: (l.rooms || []).reduce((acc, r) => acc + roomArea(r), 0),
    furnitureCount: (l.furniture || []).length,
    conflicts: l.conflicts !== undefined ? l.conflicts : (l.furniture || []).length,
    efficiency: l.efficiency || null
  }));
  const best = rows.reduce((acc, r) => (r.conflicts < acc.conflicts ? r : acc), rows[0] || null);
  return {
    rows,
    fewestConflicts: best ? best.label : null,
    note: 'Differences are shown, not judged. Choose per brief: area, conflicts, adjacency, and efficiency trade off against each other.'
  };
}

/**
 * Simple corridor-width check: minimum unobstructed passage between two
 * parallel boundaries on a straight segment (no pathfinding).
 */
export function checkCorridorWidth(corridorRect, obstacles, minwidthMeters = DEFAULT_CLEARANCES.circulation) {
  // Corridor modeled as a rect; obstacles intersecting it reduce usable width.
  // Simplified evidence: list obstructions and compare with the minimum width.
  const obstructions = (obstacles || []).filter(o => rectsIntersect(corridorRect, o));
  return {
    corridorWidthMeters: corridorRect.width,
    minimumRequiredMeters: minwidthMeters,
    obstructionCount: obstructions.length,
    obstructions: obstructions.map(o => o.name || o.id),
    clear: obstructions.length === 0 && corridorRect.width >= minwidthMeters - 1e-9,
    evidence: obstructions.length > 0
      ? `${obstructions.length} obstruction(s) inside the corridor envelope.`
      : `Corridor is ${corridorRect.width.toFixed(2)} m wide (minimum ${minwidthMeters} m).`
  };
}
