/**
 * Architecture Helping Hand - Architectural Entities Core
 * Phase 4: rooms, walls, openings (doors/windows), furniture placement.
 * Pure, deterministic, zero-DOM geometry + validation over rectilinear
 * (axis-aligned rectangle) primitives for the initial scope.
 *
 * Design rules:
 *  - Areas/perimeters are CALCULATED from geometry, never stored as truth.
 *  - Entities reference each other by ID (walls own openings; rooms may
 *    reference furniture ids) — no circular JSON references.
 *  - All coordinates are canonical meters in a world coordinate system
 *    (x → right, y → up). The Plan Canvas converts to view pixels.
 *  - The existing furniture dataset (core/furniture.js) remains the single
 *    source of furniture dimensions; placement wraps it, never duplicates it.
 */

import { requireFiniteNumber } from './calculator.js';

// ---------------------------------------------------------------------------
// Rooms (rectilinear scope: axis-aligned rectangles)
// ---------------------------------------------------------------------------

/** Validates and creates a room entity. Area/perimeter are derived. */
export function createRoom({ id, name, x, y, width, depth, floorId = 'floor-1', height = null, metadata = {} }) {
  requireFiniteNumber(x, 'room.x');
  requireFiniteNumber(y, 'room.y');
  if (width === undefined || width === null) throw new TypeError('Room width is required');
  requireFiniteNumber(width, 'room.width');
  if (width <= 0) throw new Error('Room width must be greater than zero');
  if (depth === undefined || depth === null) throw new TypeError('Room depth is required');
  requireFiniteNumber(depth, 'room.depth');
  if (depth <= 0) throw new Error('Room depth must be greater than zero');

  return {
    kind: 'room',
    id: id || generateEntityId('room'),
    name: typeof name === 'string' && name ? name : 'Room',
    x, y, width, depth,
    floorId,
    height,
    metadata,
    furnitureIds: []
  };
}

export function roomArea(room) {
  return room.width * room.depth;
}

export function roomPerimeter(room) {
  return 2 * (room.width + room.depth);
}

export function roomAspectRatio(room) {
  const short = Math.min(room.width, room.depth);
  return short > 0 ? Math.max(room.width, room.depth) / short : Infinity;
}

/** True if a world point lies inside the room rectangle. */
export function roomContainsPoint(room, px, py) {
  return px >= room.x && px <= room.x + room.width && py >= room.y && py <= room.y + room.depth;
}

/** Axis-aligned rectangle intersection (shared overlap check). */
export function rectsIntersect(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width &&
         a.y < b.y + b.depth && b.y < a.y + a.depth;
}

// ---------------------------------------------------------------------------
// Walls (rectilinear scope: axis-aligned segments with thickness)
// ---------------------------------------------------------------------------

/** Wall: start/end points in world meters (axis-aligned for initial scope). */
export function createWall({ id, name, x1, y1, x2, y2, thickness = 0.2, height = 2.7, floorId = 'floor-1', material = 'generic' }) {
  requireFiniteNumber(x1, 'wall.x1');
  requireFiniteNumber(y1, 'wall.y1');
  requireFiniteNumber(x2, 'wall.x2');
  requireFiniteNumber(y2, 'wall.y2');
  if (thickness <= 0) throw new Error('Wall thickness must be greater than zero');

  const dx = x2 - x1;
  const dy = y2 - y1;
  const axisAligned = (dx === 0 || dy === 0);
  if (!axisAligned) {
    throw new Error('Wall is not axis-aligned — the initial scope supports rectilinear walls only.');
  }

  return {
    kind: 'wall',
    id: id || generateEntityId('wall'),
    name: typeof name === 'string' && name ? name : 'Wall',
    x1, y1, x2, y2,
    thickness,
    height,
    floorId,
    material,
    openingIds: []
  };
}

export function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

/** 0°/90°/180°/270° normalized direction label. */
export function wallDirection(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  if (dy === 0) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'north' : 'south';
}

// ---------------------------------------------------------------------------
// Openings: doors & windows (owned by a wall)
// ---------------------------------------------------------------------------

export const SWING_TYPES = Object.freeze(['left', 'right', 'double']);

export function createDoor({ id, name, wallId, position, width = 0.9, height = 2.05, swing = 'left' }) {
  if (typeof wallId !== 'string' || !wallId) throw new TypeError('Door requires a wallId');
  requireFiniteNumber(position, 'door.position');
  if (position < 0) throw new Error('Door position must be non-negative (offset along the wall)');
  requireFiniteNumber(width, 'door.width');
  if (width <= 0) throw new Error('Door width must be greater than zero');
  if (!SWING_TYPES.includes(swing)) {
    throw new Error(`Invalid door swing "${swing}". Valid: ${SWING_TYPES.join(', ')}`);
  }
  return {
    kind: 'door',
    id: id || generateEntityId('door'),
    name: typeof name === 'string' && name ? name : 'Door',
    wallId,
    position,
    width,
    height,
    swing
  };
}

export function createWindow({ id, name, wallId, position, width = 1.2, height = 1.2, sill = 0.9 }) {
  if (typeof wallId !== 'string' || !wallId) throw new TypeError('Window requires a wallId');
  requireFiniteNumber(position, 'window.position');
  if (position < 0) throw new Error('Window position must be non-negative');
  requireFiniteNumber(width, 'window.width');
  if (width <= 0) throw new Error('Window width must be greater than zero');
  return {
    kind: 'window',
    id: id || generateEntityId('window'),
    name: typeof name === 'string' && name ? name : 'Window',
    wallId,
    position,
    width,
    height,
    sill
  };
}

/**
 * Validates that an opening fits within its wall. Pure: returns a verdict,
 * does not throw for a too-large opening.
 */
export function openingFitsWall(opening, wall) {
  const length = wallLength(wall);
  const end = opening.position + opening.width;
  if (end > length + 1e-9) {
    return { fits: false, reason: `Opening extends past the wall (ends at ${end.toFixed(3)} m of ${length.toFixed(3)} m).` };
  }
  return { fits: true, reason: null };
}

// ---------------------------------------------------------------------------
// Furniture placement (wraps the existing catalog — no duplicated dimensions)
// ---------------------------------------------------------------------------

/**
 * Places a furniture piece: footprint taken from the catalog item's
 * real-world dimensions (wCm × dCm) — the catalog stays the only source.
 * `flip` swaps the footprint for rotation by 90°.
 */
export function placeFurniture({ id, name, catalogId, displayName, wCm, dCm, x, y, rotated = false, roomId = null }) {
  requireFiniteNumber(x, 'furniture.x');
  requireFiniteNumber(y, 'furniture.y');
  requireFiniteNumber(wCm, 'furniture.wCm');
  requireFiniteNumber(dCm, 'furniture.dCm');
  if (wCm <= 0 || dCm <= 0) throw new Error('Furniture footprint must be positive');
  return {
    kind: 'furniture',
    id: id || generateEntityId('furn'),
    name: typeof name === 'string' && name ? name : (displayName || 'Furniture'),
    catalogId: catalogId || null,
    x, y,
    width: (rotated ? dCm : wCm) / 100,  // world meters
    depth: (rotated ? wCm : dCm) / 100,
    rotated,
    roomId
  };
}

/** Furniture footprint as a rect for overlap/fit checks. */
export function furnitureRect(f) {
  return { x: f.x, y: f.y, width: f.width, depth: f.depth };
}

// ---------------------------------------------------------------------------
// ID helper
// ---------------------------------------------------------------------------

export function generateEntityId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
