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
import { calcPolygon, pointInPolygon } from './geometry.js';

// ---------------------------------------------------------------------------
// Rooms (rectilinear & generalized polygonal boundaries)
// ---------------------------------------------------------------------------

/** Validates and creates a room entity. Area/perimeter are derived via Shoelace when polygonal. */
export function createRoom({
  id,
  name,
  x,
  y,
  width,
  depth,
  boundary = null,
  floorId = 'floor-1',
  height = null,
  metadata = {}
}) {
  let finalBoundary = null;
  let finalX = x;
  let finalY = y;
  let finalWidth = width;
  let finalDepth = depth;

  if (Array.isArray(boundary) && boundary.length >= 3) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    finalBoundary = boundary.map((pt, i) => {
      if (!pt || typeof pt !== 'object') throw new TypeError(`Boundary vertex at index ${i} is invalid`);
      requireFiniteNumber(pt.x, `boundary[${i}].x`);
      requireFiniteNumber(pt.y, `boundary[${i}].y`);
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
      return { x: pt.x, y: pt.y };
    });
    finalX = minX;
    finalY = minY;
    finalWidth = Math.max(0.01, maxX - minX);
    finalDepth = Math.max(0.01, maxY - minY);
  } else {
    requireFiniteNumber(x, 'room.x');
    requireFiniteNumber(y, 'room.y');
    if (width === undefined || width === null) throw new TypeError('Room width is required');
    requireFiniteNumber(width, 'room.width');
    if (width <= 0) throw new Error('Room width must be greater than zero');
    if (depth === undefined || depth === null) throw new TypeError('Room depth is required');
    requireFiniteNumber(depth, 'room.depth');
    if (depth <= 0) throw new Error('Room depth must be greater than zero');
    finalBoundary = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth },
      { x, y: y + depth }
    ];
  }

  return {
    kind: 'room',
    id: id || generateEntityId('room'),
    name: typeof name === 'string' && name ? name : 'Room',
    x: finalX,
    y: finalY,
    width: finalWidth,
    depth: finalDepth,
    boundary: finalBoundary,
    area: Array.isArray(finalBoundary) && finalBoundary.length >= 3
      ? calcPolygon({ vertices: finalBoundary }).area
      : finalWidth * finalDepth,
    perimeter: Array.isArray(finalBoundary) && finalBoundary.length >= 3
      ? calcPolygon({ vertices: finalBoundary }).perimeter
      : 2 * (finalWidth + finalDepth),
    floorId,
    height,
    metadata,
    furnitureIds: []
  };
}

export function roomArea(room) {
  if (typeof room.area === 'number') return room.area;
  if (Array.isArray(room.boundary) && room.boundary.length >= 3) {
    try {
      const res = calcPolygon({ vertices: room.boundary });
      return res.area;
    } catch (e) {
      return room.width * room.depth;
    }
  }
  return room.width * room.depth;
}

export function roomPerimeter(room) {
  if (typeof room.perimeter === 'number') return room.perimeter;
  if (Array.isArray(room.boundary) && room.boundary.length >= 3) {
    try {
      const res = calcPolygon({ vertices: room.boundary });
      return res.perimeter;
    } catch (e) {
      return 2 * (room.width + room.depth);
    }
  }
  return 2 * (room.width + room.depth);
}

export function roomAspectRatio(room) {
  const short = Math.min(room.width, room.depth);
  return short > 0 ? Math.max(room.width, room.depth) / short : Infinity;
}

/** True if a world point lies inside the room rectangle or polygon. */
export function roomContainsPoint(room, px, py) {
  const actualX = typeof px === 'object' && px !== null ? px.x : px;
  const actualY = typeof px === 'object' && px !== null ? px.y : py;
  if (Array.isArray(room.boundary) && room.boundary.length >= 3) {
    return pointInPolygon({ x: actualX, y: actualY }, room.boundary);
  }
  return actualX >= room.x && actualX <= room.x + room.width && actualY >= room.y && actualY <= room.y + room.depth;
}

/** Axis-aligned rectangle intersection (shared overlap check). */
export function rectsIntersect(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width &&
         a.y < b.y + b.depth && b.y < a.y + a.depth;
}

// ---------------------------------------------------------------------------
// Wall Assemblies Catalog (composite multi-layer parametric definitions)
// ---------------------------------------------------------------------------

export const WALL_ASSEMBLIES = Object.freeze({
  'generic-200': {
    id: 'generic-200',
    name: 'Generic Solid 200mm',
    category: 'basic',
    totalThickness: 0.20,
    layers: [
      { id: 'core', name: 'Solid Core', thickness: 0.20, material: 'concrete', hatch: 'solid', color: 'rgba(122,162,255,0.18)' }
    ]
  },
  'interior-partition-100': {
    id: 'interior-partition-100',
    name: 'Interior Stud Partition 100mm',
    category: 'interior',
    totalThickness: 0.10,
    layers: [
      { id: 'gyp-1', name: 'Gypsum Board', thickness: 0.013, material: 'gypsum', hatch: 'solid', color: 'rgba(200,200,210,0.3)' },
      { id: 'stud', name: 'Metal / Wood Stud', thickness: 0.074, material: 'stud_cavity', hatch: 'diagonal', color: 'rgba(120,130,150,0.15)' },
      { id: 'gyp-2', name: 'Gypsum Board', thickness: 0.013, material: 'gypsum', hatch: 'solid', color: 'rgba(200,200,210,0.3)' }
    ]
  },
  'interior-masonry-150': {
    id: 'interior-masonry-150',
    name: 'Interior Masonry 150mm',
    category: 'interior',
    totalThickness: 0.15,
    layers: [
      { id: 'plaster-1', name: 'Plaster / Render', thickness: 0.012, material: 'plaster', hatch: 'solid', color: 'rgba(220,220,220,0.25)' },
      { id: 'cmu', name: 'CMU Block', thickness: 0.126, material: 'masonry', hatch: 'crosshatch', color: 'rgba(160,160,170,0.2)' },
      { id: 'plaster-2', name: 'Plaster / Render', thickness: 0.012, material: 'plaster', hatch: 'solid', color: 'rgba(220,220,220,0.25)' }
    ]
  },
  'exterior-cavity-265': {
    id: 'exterior-cavity-265',
    name: 'Exterior Brick Cavity 265mm',
    category: 'exterior',
    totalThickness: 0.265,
    layers: [
      { id: 'brick', name: 'Face Brick', thickness: 0.102, material: 'brick', hatch: 'brick', color: 'rgba(217,119,6,0.25)' },
      { id: 'air-insul', name: 'Cavity & Insulation', thickness: 0.050, material: 'insulation', hatch: 'insulation', color: 'rgba(234,179,8,0.2)' },
      { id: 'block', name: 'CMU Inner Leaf', thickness: 0.100, material: 'blockwork', hatch: 'crosshatch', color: 'rgba(148,163,184,0.2)' },
      { id: 'finish', name: 'Internal Gypsum', thickness: 0.013, material: 'gypsum', hatch: 'solid', color: 'rgba(226,232,240,0.2)' }
    ]
  },
  'concrete-structural-250': {
    id: 'concrete-structural-250',
    name: 'Structural Concrete 250mm',
    category: 'structural',
    totalThickness: 0.25,
    layers: [
      { id: 'core', name: 'Reinforced Concrete', thickness: 0.25, material: 'rc_concrete', hatch: 'concrete', color: 'rgba(100,116,139,0.3)' }
    ]
  }
});

// ---------------------------------------------------------------------------
// Walls (unconstrained vector segments with thickness & curved arcs)
// ---------------------------------------------------------------------------

/** Wall: start/end points in world meters (supports arbitrary angles, assemblies, and curved arcs). */
export function createWall({
  id,
  name,
  x1,
  y1,
  x2,
  y2,
  start,
  end,
  thickness,
  height = 2.7,
  assemblyId = 'generic-200',
  floorId = 'floor-1',
  material = 'generic',
  isArc = false,
  bulge = 0
}) {
  const actualX1 = typeof x1 === 'number' ? x1 : start?.x;
  const actualY1 = typeof y1 === 'number' ? y1 : start?.y;
  const actualX2 = typeof x2 === 'number' ? x2 : end?.x;
  const actualY2 = typeof y2 === 'number' ? y2 : end?.y;

  requireFiniteNumber(actualX1, 'wall.x1');
  requireFiniteNumber(actualY1, 'wall.y1');
  requireFiniteNumber(actualX2, 'wall.x2');
  requireFiniteNumber(actualY2, 'wall.y2');

  const assembly = WALL_ASSEMBLIES[assemblyId] || null;
  let actualThickness;
  if (thickness !== undefined && thickness !== null) {
    requireFiniteNumber(thickness, 'wall.thickness');
    if (thickness <= 0) throw new Error('Wall thickness must be greater than zero');
    actualThickness = thickness;
  } else {
    actualThickness = assembly ? assembly.totalThickness : 0.2;
  }
  if (actualThickness <= 0) throw new Error('Wall thickness must be greater than zero');

  const dx = actualX2 - actualX1;
  const dy = actualY2 - actualY1;
  if (dx === 0 && dy === 0) {
    throw new Error('Wall start and end points cannot be identical (length must be > 0)');
  }

  const angleRad = Math.atan2(dy, dx);
  let angleDeg = (angleRad * 180 / Math.PI);
  if (angleDeg < 0) angleDeg += 360;

  return {
    kind: 'wall',
    id: id || generateEntityId('wall'),
    name: typeof name === 'string' && name ? name : 'Wall',
    x1: actualX1,
    y1: actualY1,
    x2: actualX2,
    y2: actualY2,
    thickness: actualThickness,
    height,
    assemblyId: assembly ? assemblyId : 'generic-200',
    floorId,
    material,
    isArc: Boolean(isArc),
    bulge: typeof bulge === 'number' ? bulge : 0,
    angle: angleDeg,
    length: Math.hypot(dx, dy),
    openingIds: []
  };
}

export function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

/** 0°/90°/180°/270° or 8-point compass normalized direction label. */
export function wallDirection(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  if (dy === 0) return dx > 0 ? 'east' : 'west';
  if (dx === 0) return dy > 0 ? 'north' : 'south';
  const deg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  if (deg >= 22.5 && deg < 67.5) return 'northeast';
  if (deg >= 67.5 && deg < 112.5) return 'north';
  if (deg >= 112.5 && deg < 157.5) return 'northwest';
  if (deg >= 157.5 && deg < 202.5) return 'west';
  if (deg >= 202.5 && deg < 247.5) return 'southwest';
  if (deg >= 247.5 && deg < 292.5) return 'south';
  if (deg >= 292.5 && deg < 337.5) return 'southeast';
  return 'east';
}

// ---------------------------------------------------------------------------
// Openings: doors & windows (owned by a wall)
// ---------------------------------------------------------------------------

export const SWING_TYPES = Object.freeze(['left', 'right', 'double']);

export function createDoor({
  id,
  name,
  wallId,
  position,
  width = 0.9,
  height = 2.05,
  swing = 'left',
  flipSide = false
}) {
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
    swing,
    flipSide: Boolean(flipSide)
  };
}

export function createWindow({
  id,
  name,
  wallId,
  position,
  width = 1.2,
  height = 1.2,
  sill = 0.9,
  frameWidth = 0.05,
  glazingPanes = 2
}) {
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
    sill,
    frameWidth,
    glazingPanes
  };
}

/**
 * Returns all valid doors and windows hosted on a specific wall, sorted by position along the wall.
 * @param {Object} wall
 * @param {Array<Object>} allEntities
 * @returns {Array<Object>}
 */
export function wallOpenings(wall, allEntities = []) {
  if (!wall || !wall.id) return [];
  const list = Array.isArray(allEntities)
    ? allEntities
    : (allEntities && typeof allEntities === 'object' ? Object.values(allEntities).flat().filter(Boolean) : []);

  return list
    .filter(e => (e.kind === 'door' || e.kind === 'window') && e.wallId === wall.id)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
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

export function createFurnitureEntity(options) {
  const wCm = options.wCm !== undefined ? options.wCm : (options.width ? options.width * 100 : 100);
  const dCm = options.dCm !== undefined ? options.dCm : (options.depth ? options.depth * 100 : 100);
  const item = placeFurniture({
    ...options,
    wCm,
    dCm
  });
  if (options.clearance !== undefined) item.clearance = options.clearance;
  if (options.category !== undefined) item.category = options.category;
  return item;
}

// ---------------------------------------------------------------------------
// Stairs (straight-flight rectilinear plan footprint)
// ---------------------------------------------------------------------------

export function createStairEntity(options = {}) {
  const {
    id,
    name,
    x,
    y,
    width = 1.0,
    run = 2.8,
    floorId = 'floor-1'
  } = options;
  const rise = options.rise !== undefined ? options.rise : (options.totalRise !== undefined ? options.totalRise : 2.7);
  const risers = options.risers !== undefined ? options.risers : (options.riserCount !== undefined ? options.riserCount : 16);
  const tread = options.tread !== undefined ? options.tread : (options.going !== undefined ? options.going : 0.28);
  const riser = options.riser !== undefined ? options.riser : null;

  requireFiniteNumber(x, 'stair.x');
  requireFiniteNumber(y, 'stair.y');
  requireFiniteNumber(width, 'stair.width');
  if (width <= 0) throw new Error('Stair width must be greater than zero');
  requireFiniteNumber(run, 'stair.run');
  if (run <= 0) throw new Error('Stair run must be greater than zero');
  requireFiniteNumber(rise, 'stair.rise');
  if (rise <= 0) throw new Error('Stair rise must be greater than zero');

  const riserCount = Math.max(1, Math.round(risers));
  const riserHeight = riser !== null ? riser : (rise / riserCount);
  const going = tread > 0 ? tread : (riserCount > 1 ? run / (riserCount - 1) : run);
  const blondel = (2 * riserHeight) + going;

  return {
    kind: 'stair',
    id: id || generateEntityId('stair'),
    name: typeof name === 'string' && name ? name : 'Straight Stair',
    x,
    y,
    width,
    depth: run,
    run,
    rise,
    totalRise: rise,
    risers: riserCount,
    riserCount,
    riserHeight,
    riser: riserHeight,
    tread: going,
    going,
    blondel,
    floorId
  };
}

// ---------------------------------------------------------------------------
// Ramps (straight-run rectilinear plan footprint)
// ---------------------------------------------------------------------------

export function createRampEntity({
  id,
  name,
  x,
  y,
  width = 1.2,
  run = 6.0,
  rise = 0.5,
  floorId = 'floor-1'
}) {
  requireFiniteNumber(x, 'ramp.x');
  requireFiniteNumber(y, 'ramp.y');
  requireFiniteNumber(width, 'ramp.width');
  if (width <= 0) throw new Error('Ramp width must be greater than zero');
  requireFiniteNumber(run, 'ramp.run');
  if (run <= 0) throw new Error('Ramp run must be greater than zero');
  requireFiniteNumber(rise, 'ramp.rise');
  if (rise <= 0) throw new Error('Ramp rise must be greater than zero');

  const slopePercent = (rise / run) * 100;
  const slopeRatio = run / rise;

  return {
    kind: 'ramp',
    id: id || generateEntityId('ramp'),
    name: typeof name === 'string' && name ? name : 'Straight Ramp',
    x,
    y,
    width,
    depth: run,
    run,
    rise,
    slopePercent,
    slopeRatio,
    floorId
  };
}

// ---------------------------------------------------------------------------
// Dimensions & Annotations (CAD Aligned/Linear with Witness Lines)
// ---------------------------------------------------------------------------

export const DIMENSION_STYLES = Object.freeze(['tick', 'arrow', 'dot']);
export const DIMENSION_ORIENTATIONS = Object.freeze(['aligned', 'horizontal', 'vertical']);
export const DIMENSION_UNITS = Object.freeze(['m', 'mm', 'ft_in']);

/**
 * Validates and creates a precision dimension entity.
 * @param {Object} options
 * @returns {Object} Dimension entity
 */
export function createDimension({
  id,
  name,
  x1,
  y1,
  x2,
  y2,
  p1,
  p2,
  offset = 0.6,
  style = 'tick',
  orientation = 'aligned',
  unit = 'm',
  dualUnit = false,
  textOverride = null,
  floorId = 'floor-1',
  metadata = {}
} = {}) {
  const actualP1 = p1 || { x: x1, y: y1 };
  const actualP2 = p2 || { x: x2, y: y2 };

  if (!actualP1 || typeof actualP1 !== 'object') throw new TypeError('Dimension p1 is required');
  if (!actualP2 || typeof actualP2 !== 'object') throw new TypeError('Dimension p2 is required');

  requireFiniteNumber(actualP1.x, 'dimension.p1.x');
  requireFiniteNumber(actualP1.y, 'dimension.p1.y');
  requireFiniteNumber(actualP2.x, 'dimension.p2.x');
  requireFiniteNumber(actualP2.y, 'dimension.p2.y');

  const dx = actualP2.x - actualP1.x;
  const dy = actualP2.y - actualP1.y;
  if (Math.hypot(dx, dy) < 1e-4) {
    throw new Error('Dimension start and end points cannot be identical (length must be > 0)');
  }

  const validatedStyle = DIMENSION_STYLES.includes(style) ? style : 'tick';
  const validatedOrientation = DIMENSION_ORIENTATIONS.includes(orientation) ? orientation : 'aligned';

  return {
    kind: 'dimension',
    id: id || generateEntityId('dim'),
    name: typeof name === 'string' && name ? name : 'Dimension',
    p1: { x: actualP1.x, y: actualP1.y },
    p2: { x: actualP2.x, y: actualP2.y },
    x1: actualP1.x,
    y1: actualP1.y,
    x2: actualP2.x,
    y2: actualP2.y,
    x: Math.min(actualP1.x, actualP2.x),
    y: Math.min(actualP1.y, actualP2.y),
    width: Math.abs(actualP2.x - actualP1.x),
    depth: Math.abs(actualP2.y - actualP1.y),
    offset: typeof offset === 'number' && !isNaN(offset) ? offset : 0.6,
    style: validatedStyle,
    orientation: validatedOrientation,
    unit: typeof unit === 'string' ? unit : 'm',
    dualUnit: Boolean(dualUnit),
    textOverride: typeof textOverride === 'string' && textOverride ? textOverride : null,
    floorId,
    metadata
  };
}

/**
 * Automatically inspects a wall and any hosted openings to generate
 * an aligned dimension string (sub-segments across openings plus an overall dimension).
 * @param {Object} wall
 * @param {Array<Object>} [allEntities=[]]
 * @param {Object} [options={}]
 * @returns {Array<Object>} Array of Dimension entities
 */
export function autoDimensionWall(wall, allEntities = [], options = {}) {
  if (!wall || typeof wall.x1 !== 'number' || typeof wall.x2 !== 'number') return [];
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return [];

  const u = { x: dx / len, y: dy / len };
  const offset = typeof options.offset === 'number' ? options.offset : 0.6;
  const overallSpacing = typeof options.overallSpacing === 'number' ? options.overallSpacing : 0.45;
  const style = options.style || 'tick';
  const orientation = options.orientation || 'aligned';
  const unit = options.unit || 'm';
  const dualUnit = Boolean(options.dualUnit);
  const floorId = wall.floorId || 'floor-1';

  // Find openings hosted on this wall
  const openings = (allEntities || []).filter(e =>
    e && (e.kind === 'door' || e.kind === 'window') && e.wallId === wall.id
  );

  // If no openings, return single overall dimension
  if (openings.length === 0) {
    return [
      createDimension({
        name: `${wall.name || 'Wall'} Dim`,
        p1: { x: wall.x1, y: wall.y1 },
        p2: { x: wall.x2, y: wall.y2 },
        offset,
        style,
        orientation,
        unit,
        dualUnit,
        floorId
      })
    ];
  }

  // Collect opening intervals clamped to [0, len]
  const intervals = [];
  for (const op of openings) {
    if (typeof op.position !== 'number' || typeof op.width !== 'number') continue;
    const s = Math.max(0, Math.min(len, op.position));
    const e = Math.max(0, Math.min(len, op.position + Math.max(0, op.width)));
    if (e > s) {
      intervals.push({ start: s, end: e });
    }
  }

  intervals.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged = [];
  for (const item of intervals) {
    if (merged.length === 0) {
      merged.push(item);
    } else {
      const prev = merged[merged.length - 1];
      if (item.start <= prev.end) {
        prev.end = Math.max(prev.end, item.end);
      } else {
        merged.push(item);
      }
    }
  }

  // Extract split cut positions along wall
  const cuts = [0];
  for (const item of merged) {
    if (item.start > cuts[cuts.length - 1] + 1e-4) {
      cuts.push(item.start);
    }
    if (item.end > cuts[cuts.length - 1] + 1e-4) {
      cuts.push(item.end);
    }
  }
  if (len > cuts[cuts.length - 1] + 1e-4) {
    cuts.push(len);
  }

  const dimensions = [];
  // Segment chain dimensions along first offset line
  for (let i = 0; i < cuts.length - 1; i++) {
    const s1 = cuts[i];
    const s2 = cuts[i + 1];
    if (s2 - s1 < 1e-4) continue;
    const pt1 = { x: wall.x1 + u.x * s1, y: wall.y1 + u.y * s1 };
    const pt2 = { x: wall.x1 + u.x * s2, y: wall.y1 + u.y * s2 };
    dimensions.push(
      createDimension({
        name: `${wall.name || 'Wall'} Seg ${i + 1}`,
        p1: pt1,
        p2: pt2,
        offset,
        style,
        orientation,
        unit,
        dualUnit,
        floorId
      })
    );
  }

  // Overall outer dimension
  dimensions.push(
    createDimension({
      name: `${wall.name || 'Wall'} Overall`,
      p1: { x: wall.x1, y: wall.y1 },
      p2: { x: wall.x2, y: wall.y2 },
      offset: offset + (offset >= 0 ? overallSpacing : -overallSpacing),
      style,
      orientation,
      unit,
      dualUnit,
      floorId
    })
  );

  return dimensions;
}

// ---------------------------------------------------------------------------
// ID helper
// ---------------------------------------------------------------------------

export function generateEntityId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}


