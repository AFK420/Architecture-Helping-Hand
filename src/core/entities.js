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
import { attachIdentity } from './entity-identity.js';
import { calcPolygon, pointInPolygon } from './geometry.js';
export {
  COLUMN_PROFILES,
  BUBBLE_POSITIONS,
  createColumn,
  createGridLine,
  columnContour,
  columnHatchLines,
  columnSnapPoints,
  gridLineIntersection,
  generateGridSystem
} from './grid-columns.js';

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
    .filter(e => (e.kind === 'door' || e.kind === 'window') && (e.wallId === wall.id || e.hostWallId === wall.id))
    .map(e => ({
      ...e,
      wallId: e.wallId || e.hostWallId,
      position: typeof e.position === 'number' ? e.position : (typeof e.offset === 'number' ? e.offset : 0)
    }))
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
    stairType = 'straight', // 'straight' | 'l_shape' | 'u_shape'
    direction = 'up',       // 'up' | 'down'
    showBreakLine = true,
    handrail = 'both',      // 'both' | 'left' | 'right' | 'none'
    treadLabels = true,
    layerId = 'A-FLOR-STRS',
    floorId = 'floor-1'
  } = options;
  const rise = options.rise !== undefined ? options.rise : (options.totalRise !== undefined ? options.totalRise : 2.7);
  const risers = options.risers !== undefined ? options.risers : (options.riserCount !== undefined ? options.riserCount : 16);
  const riser = options.riser !== undefined ? options.riser : null;
  const landingDepth = typeof options.landingDepth === 'number' && options.landingDepth > 0 ? options.landingDepth : width;

  requireFiniteNumber(x, 'stair.x');
  requireFiniteNumber(y, 'stair.y');
  requireFiniteNumber(width, 'stair.width');
  if (width <= 0) throw new Error('Stair width must be greater than zero');

  const riserCount = Math.max(1, Math.round(risers));
  const riserHeight = riser !== null ? riser : (rise / riserCount);

  let going;
  if (options.going !== undefined && typeof options.going === 'number' && options.going > 0) {
    going = options.going;
  } else if (options.tread !== undefined && typeof options.tread === 'number' && options.tread > 0) {
    going = options.tread;
  } else if (options.run !== undefined && typeof options.run === 'number' && options.run > 0) {
    going = riserCount > 1 ? options.run / (riserCount - 1) : options.run;
  } else {
    going = 0.28;
  }

  const run = options.run !== undefined && typeof options.run === 'number' && options.run > 0
    ? options.run
    : (riserCount > 1 ? (riserCount - 1) * going : 2.8);

  requireFiniteNumber(run, 'stair.run');
  if (run <= 0) throw new Error('Stair run must be greater than zero');
  requireFiniteNumber(rise, 'stair.rise');
  if (rise <= 0) throw new Error('Stair rise must be greater than zero');

  const blondel = (2 * riserHeight) + going;
  const cutStep = typeof options.cutStep === 'number' && options.cutStep > 0
    ? options.cutStep
    : Math.min(riserCount - 1, Math.max(1, Math.round(riserCount * 0.45)));

  // IBC / International building code heuristics:
  // Blondel: 600 - 640mm, minimum tread: 280mm, maximum riser: 180mm
  const isCompliant = (blondel >= 0.60 && blondel <= 0.66 && going >= 0.24 && riserHeight <= 0.19);

  return {
    kind: 'stair',
    id: id || generateEntityId('stair'),
    name: typeof name === 'string' && name ? name : `${stairType === 'u_shape' ? 'Switchback' : stairType === 'l_shape' ? 'L-Shape' : 'Straight'} Stair`,
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
    stairType: (stairType === 'l_shape' || stairType === 'u_shape') ? stairType : 'straight',
    direction: direction === 'down' ? 'down' : 'up',
    showBreakLine: Boolean(showBreakLine),
    cutStep,
    handrail,
    landingDepth,
    treadLabels: Boolean(treadLabels),
    isCompliant,
    layerId,
    floorId
  };
}

export const createStair = createStairEntity;

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
// Architectural Callouts & Tag Entities
// ---------------------------------------------------------------------------

/**
 * Factory for a room tag annotation.
 * Can be linked to a room entity or standalone.
 * Displays Room Name, Room Number, and Area.
 */
export function createRoomTag({
  id,
  name,
  roomId = null,
  x,
  y,
  roomNumber = '101',
  area = null,
  showArea = true,
  showNumber = true,
  layerId = 'A-ANNO-TAGS',
  floorId = 'floor-1'
} = {}) {
  requireFiniteNumber(x, 'roomTag.x');
  requireFiniteNumber(y, 'roomTag.y');

  return {
    kind: 'room_tag',
    id: id || generateEntityId('rtag'),
    name: typeof name === 'string' && name ? name : 'Room Tag',
    roomId,
    x,
    y,
    width: 1.6,
    depth: 0.8,
    roomNumber: String(roomNumber || '101'),
    area: typeof area === 'number' && !isNaN(area) ? area : null,
    showArea: showArea !== false,
    showNumber: showNumber !== false,
    layerId,
    floorId
  };
}

/**
 * Factory for a door tag bubble (e.g. "D01").
 */
export function createDoorTag({
  id,
  name,
  doorId = null,
  x,
  y,
  tagText = 'D01',
  layerId = 'A-ANNO-TAGS',
  floorId = 'floor-1'
} = {}) {
  requireFiniteNumber(x, 'doorTag.x');
  requireFiniteNumber(y, 'doorTag.y');

  return {
    kind: 'door_tag',
    id: id || generateEntityId('dtag'),
    name: typeof name === 'string' && name ? name : 'Door Tag',
    doorId,
    x,
    y,
    width: 0.6,
    depth: 0.4,
    tagText: String(tagText || 'D01'),
    layerId,
    floorId
  };
}

/**
 * Factory for a window tag badge (e.g. "W01").
 */
export function createWindowTag({
  id,
  name,
  windowId = null,
  x,
  y,
  tagText = 'W01',
  layerId = 'A-ANNO-TAGS',
  floorId = 'floor-1'
} = {}) {
  requireFiniteNumber(x, 'windowTag.x');
  requireFiniteNumber(y, 'windowTag.y');

  return {
    kind: 'window_tag',
    id: id || generateEntityId('wtag'),
    name: typeof name === 'string' && name ? name : 'Window Tag',
    windowId,
    x,
    y,
    width: 0.6,
    depth: 0.4,
    tagText: String(tagText || 'W01'),
    layerId,
    floorId
  };
}

/**
 * Factory for an architectural leader line callout with arrowhead and shelf text.
 */
export function createLeaderNote({
  id,
  name,
  p1,
  knee,
  p2,
  x1, y1, x2, y2, kneeX, kneeY,
  text = 'Note',
  arrowStyle = 'arrow',
  layerId = 'A-ANNO-TEXT',
  floorId = 'floor-1'
} = {}) {
  const actualP1 = p1 || { x: x1 ?? 0, y: y1 ?? 0 };
  const actualKnee = knee || { x: kneeX ?? (actualP1.x + 0.8), y: kneeY ?? (actualP1.y + 0.6) };
  const actualP2 = p2 || { x: x2 ?? (actualKnee.x + 1.2), y: y2 ?? actualKnee.y };

  requireFiniteNumber(actualP1.x, 'leader.p1.x');
  requireFiniteNumber(actualP1.y, 'leader.p1.y');
  requireFiniteNumber(actualKnee.x, 'leader.knee.x');
  requireFiniteNumber(actualKnee.y, 'leader.knee.y');
  requireFiniteNumber(actualP2.x, 'leader.p2.x');
  requireFiniteNumber(actualP2.y, 'leader.p2.y');

  const minX = Math.min(actualP1.x, actualKnee.x, actualP2.x);
  const maxX = Math.max(actualP1.x, actualKnee.x, actualP2.x);
  const minY = Math.min(actualP1.y, actualKnee.y, actualP2.y);
  const maxY = Math.max(actualP1.y, actualKnee.y, actualP2.y);

  return {
    kind: 'leader',
    id: id || generateEntityId('ldr'),
    name: typeof name === 'string' && name ? name : (text || 'Leader'),
    p1: { x: actualP1.x, y: actualP1.y },
    knee: { x: actualKnee.x, y: actualKnee.y },
    p2: { x: actualP2.x, y: actualP2.y },
    x: minX,
    y: minY,
    width: Math.max(0.2, maxX - minX),
    depth: Math.max(0.2, maxY - minY),
    text: String(text || 'Note'),
    arrowStyle: arrowStyle === 'dot' ? 'dot' : 'arrow',
    layerId,
    floorId
  };
}

/**
 * Factory for a pure 2-point line-segment entity (a drafting line, distinct
 * from a wall: no thickness, no assembly — pure geometry annotation).
 */
export function createLineEntity({
  id,
  name,
  p1,
  p2,
  x1, y1, x2, y2,
  layerId = 'A-ANNO-LINES',
  floorId = 'floor-1',
  metadata = {}
} = {}) {
  const actualP1 = p1 || { x: x1, y: y1 };
  const actualP2 = p2 || { x: x2, y: y2 };

  requireFiniteNumber(actualP1.x, 'line.p1.x');
  requireFiniteNumber(actualP1.y, 'line.p1.y');
  requireFiniteNumber(actualP2.x, 'line.p2.x');
  requireFiniteNumber(actualP2.y, 'line.p2.y');

  const dx = actualP2.x - actualP1.x;
  const dy = actualP2.y - actualP1.y;
  if (Math.hypot(dx, dy) < 1e-4) {
    throw new Error('Line start and end points cannot be identical (length must be > 0)');
  }

  return {
    kind: 'line',
    id: id || generateEntityId('line'),
    name: typeof name === 'string' && name ? name : 'Line',
    p1: { x: actualP1.x, y: actualP1.y },
    p2: { x: actualP2.x, y: actualP2.y },
    x1: actualP1.x,
    y1: actualP1.y,
    x2: actualP2.x,
    y2: actualP2.y,
    x: Math.min(actualP1.x, actualP2.x),
    y: Math.min(actualP1.y, actualP2.y),
    width: Math.max(0.001, Math.abs(dx)),
    depth: Math.max(0.001, Math.abs(dy)),
    length: Math.hypot(dx, dy),
    angleDegrees: (Math.atan2(dy, dx) * 180) / Math.PI,
    layerId,
    floorId,
    metadata
  };
}

/**
 * Factory for an ARC entity: two endpoints + a bulge (AutoCAD convention:
 * bulge = tan(included angle / 4); sign gives the sweep side). Rendering and
 * length math derive from calcArcBulge — nothing is stored stale.
 */
export function createArcEntity({
  id,
  name,
  p1,
  p2,
  bulge = null,
  through = null, // optional point the arc passes through (e.g. fillet center)
  layerId = 'A-ANNO-LINES',
  floorId = 'floor-1',
  metadata = {}
} = {}) {
  requireFiniteNumber(p1.x, 'arc.p1.x');
  requireFiniteNumber(p1.y, 'arc.p1.y');
  requireFiniteNumber(p2.x, 'arc.p2.x');
  requireFiniteNumber(p2.y, 'arc.p2.y');
  const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (chord < 1e-4) throw new Error('Arc start and end points cannot be identical');

  let b = bulge;
  if (b == null && through) {
    // Derive bulge from the through-point: sagitta = signed perpendicular
    // distance from the chord midpoint to the point; bulge = 2·sagitta/chord.
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const nx = -(p2.y - p1.y) / chord, ny = (p2.x - p1.x) / chord;
    const sag = (through.x - mx) * nx + (through.y - my) * ny;
    b = (2 * sag) / chord;
  }
  if (b == null || !Number.isFinite(b)) b = 1; // 180° semicircle fallback
  if (Math.abs(b) < 1e-9) {
    throw new Error('Arc bulge cannot be zero — draw a line instead');
  }

  return {
    kind: 'arc',
    id: id || generateEntityId('arc'),
    name: typeof name === 'string' && name ? name : 'Arc',
    p1: { x: p1.x, y: p1.y },
    p2: { x: p2.x, y: p2.y },
    bulge: b,
    x1: p1.x, y1: p1.y,
    x2: p2.x, y2: p2.y,
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.max(0.001, Math.abs(p2.x - p1.x)),
    depth: Math.max(0.001, Math.abs(p2.y - p1.y)),
    layerId,
    floorId,
    metadata
  };
}

/**
 * Factory for a CAD North Arrow symbol.
 */
export function createNorthArrow({
  id,
  name,
  x = 0,
  y = 0,
  rotation = 0,
  size = 1.0,
  layerId = 'A-ANNO-TAGS',
  floorId = 'floor-1'
} = {}) {
  requireFiniteNumber(x, 'northArrow.x');
  requireFiniteNumber(y, 'northArrow.y');

  return {
    kind: 'north_arrow',
    id: id || generateEntityId('na'),
    name: typeof name === 'string' && name ? name : 'North Arrow',
    x,
    y,
    width: size,
    depth: size,
    rotation: typeof rotation === 'number' && !isNaN(rotation) ? rotation : 0,
    size: typeof size === 'number' && size > 0 ? size : 1.0,
    layerId,
    floorId
  };
}

/**
 * Factory for a 2D Plan Section Cut Callout entity ('section_cut').
 * Includes cut line, directional arrows, and section bubble labels referencing sheet numbers.
 */
export function createSectionCut({
  id,
  name,
  p1,
  p2,
  x1, y1, x2, y2,
  label = 'A',
  direction = 'forward',
  sheetRef = 'A-201',
  layerId = 'A-SECT',
  floorId = 'floor-1'
} = {}) {
  const pt1 = p1 || { x: x1 ?? 0, y: y1 ?? 5 };
  const pt2 = p2 || { x: x2 ?? 15, y: y2 ?? 5 };

  requireFiniteNumber(pt1.x, 'sectionCut.p1.x');
  requireFiniteNumber(pt1.y, 'sectionCut.p1.y');
  requireFiniteNumber(pt2.x, 'sectionCut.p2.x');
  requireFiniteNumber(pt2.y, 'sectionCut.p2.y');

  const minX = Math.min(pt1.x, pt2.x);
  const maxX = Math.max(pt1.x, pt2.x);
  const minY = Math.min(pt1.y, pt2.y);
  const maxY = Math.max(pt1.y, pt2.y);

  return {
    kind: 'section_cut',
    id: id || generateEntityId('sec'),
    name: typeof name === 'string' && name ? name : `Section ${label}-${label}`,
    p1: { x: pt1.x, y: pt1.y },
    p2: { x: pt2.x, y: pt2.y },
    x: minX,
    y: minY,
    width: Math.max(0.2, maxX - minX),
    depth: Math.max(0.2, maxY - minY),
    label: String(label || 'A'),
    direction: direction === 'reverse' ? 'reverse' : 'forward',
    sheetRef: String(sheetRef || 'A-201'),
    layerId,
    floorId
  };
}

/**
 * Factory for a 2D Plan or Section Detail Callout entity ('detail_callout').
 * References an enlarged technical construction assembly (e.g. Footing, Parapet, Window Sill, Stair Nosing).
 */
export function createDetailCallout({
  id,
  name,
  x = 0,
  y = 0,
  width = 1.5,
  depth = 1.5,
  detailNum = '1',
  sheetRef = 'A-501',
  title = 'Foundation Footing Detail',
  detailKey = 'footing', // 'footing' | 'parapet' | 'window_sill' | 'stair_nosing'
  leaderLength = 1.2,
  leaderAngle = 45, // degrees
  shape = 'circle', // 'circle' | 'rect'
  layerId = 'A-ANNO-TAGS',
  floorId = 'floor-1'
} = {}) {
  requireFiniteNumber(x, 'detailCallout.x');
  requireFiniteNumber(y, 'detailCallout.y');
  const w = typeof width === 'number' && width > 0 ? width : 1.5;
  const d = typeof depth === 'number' && depth > 0 ? depth : 1.5;

  return {
    kind: 'detail_callout',
    id: id || generateEntityId('det'),
    name: typeof name === 'string' && name ? name : `Detail ${detailNum}/${sheetRef}`,
    x,
    y,
    width: w,
    depth: d,
    detailNum: String(detailNum || '1'),
    sheetRef: String(sheetRef || 'A-501'),
    title: String(title || 'Construction Detail'),
    detailKey: String(detailKey || 'footing'),
    leaderLength: typeof leaderLength === 'number' ? leaderLength : 1.2,
    leaderAngle: typeof leaderAngle === 'number' ? leaderAngle : 45,
    shape: shape === 'rect' ? 'rect' : 'circle',
    layerId,
    floorId
  };
}

/**
 * Automatically inspects a document's entities and generates tags for all
 * un-tagged rooms, doors, and windows.
 * @param {Array<Object>} entities
 * @returns {Array<Object>} Array of newly created tag entities
 */
export function autoTagDocument(entities = []) {
  if (!Array.isArray(entities)) return [];
  const tags = [];
  const existingTags = entities.filter(e => e.kind === 'room_tag' || e.kind === 'door_tag' || e.kind === 'window_tag');
  const taggedRoomIds = new Set(existingTags.map(t => t.roomId).filter(Boolean));
  const taggedDoorIds = new Set(existingTags.map(t => t.doorId).filter(Boolean));
  const taggedWindowIds = new Set(existingTags.map(t => t.windowId).filter(Boolean));

  let roomNum = 101;
  let doorNum = 1;
  let winNum = 1;

  for (const e of entities) {
    if (!e) continue;
    if (e.kind === 'room' && !taggedRoomIds.has(e.id)) {
      let cx = e.x + (e.width || 0) / 2;
      let cy = e.y + (e.depth || 0) / 2;
      if (Array.isArray(e.boundary) && e.boundary.length >= 3) {
        cx = e.boundary.reduce((s, p) => s + p.x, 0) / e.boundary.length;
        cy = e.boundary.reduce((s, p) => s + p.y, 0) / e.boundary.length;
      }
      tags.push(
        createRoomTag({
          name: `${e.name || 'Room'} Tag`,
          roomId: e.id,
          x: cx,
          y: cy,
          roomNumber: String(roomNum++),
          area: roomArea(e)
        })
      );
    } else if (e.kind === 'door' && !taggedDoorIds.has(e.id)) {
      const host = entities.find(w => w.id === e.wallId);
      if (host && typeof host.x1 === 'number') {
        const dx = host.x2 - host.x1;
        const dy = host.y2 - host.y1;
        const len = Math.hypot(dx, dy);
        if (len > 1e-4) {
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;
          const midPos = (e.position || 0) + (e.width || 0.9) / 2;
          const tagX = host.x1 + ux * midPos + nx * 0.5;
          const tagY = host.y1 + uy * midPos + ny * 0.5;
          tags.push(
            createDoorTag({
              name: `Tag D${String(doorNum).padStart(2, '0')}`,
              doorId: e.id,
              x: tagX,
              y: tagY,
              tagText: `D${String(doorNum++).padStart(2, '0')}`
            })
          );
        }
      }
    } else if (e.kind === 'window' && !taggedWindowIds.has(e.id)) {
      const host = entities.find(w => w.id === e.wallId);
      if (host && typeof host.x1 === 'number') {
        const dx = host.x2 - host.x1;
        const dy = host.y2 - host.y1;
        const len = Math.hypot(dx, dy);
        if (len > 1e-4) {
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;
          const midPos = (e.position || 0) + (e.width || 1.2) / 2;
          const tagX = host.x1 + ux * midPos - nx * 0.5;
          const tagY = host.y1 + uy * midPos - ny * 0.5;
          tags.push(
            createWindowTag({
              name: `Tag W${String(winNum).padStart(2, '0')}`,
              windowId: e.id,
              x: tagX,
              y: tagY,
              tagText: `W${String(winNum++).padStart(2, '0')}`
            })
          );
        }
      }
    }
  }

  return tags;
}

// ---------------------------------------------------------------------------
// ID helper
// ---------------------------------------------------------------------------

export function generateEntityId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Phase 12: Architectural CAD Block Library & Dynamic Insertion
// ---------------------------------------------------------------------------

export const CAD_BLOCK_LIBRARY = {
  DOOR_SINGLE_900: {
    id: 'DOOR_SINGLE_900',
    name: 'Single Swing Door 900mm',
    category: 'doors',
    width: 0.9,
    depth: 0.9,
    layerId: 'A-DOOR',
    geometry: [
      { type: 'line', x1: 0, y1: 0, x2: 0, y2: 0.9, stroke: '#10b981' },
      { type: 'arc', cx: 0, cy: 0, r: 0.9, startAngle: 0, endAngle: 90, stroke: '#10b981', dash: '3,3' }
    ]
  },
  WC_FIXTURE: {
    id: 'WC_FIXTURE',
    name: 'Water Closet (Toilet) 700x450mm',
    category: 'plumbing',
    width: 0.45,
    depth: 0.70,
    layerId: 'A-FLOR-FIXT',
    geometry: [
      { type: 'rect', x: 0, y: 0.45, width: 0.45, depth: 0.25, stroke: '#06b6d4', fill: 'none' },
      { type: 'ellipse', cx: 0.225, cy: 0.25, rx: 0.18, ry: 0.25, stroke: '#06b6d4', fill: 'none' }
    ]
  },
  DESK_EXECUTIVE: {
    id: 'DESK_EXECUTIVE',
    name: 'Executive Workstation 1600x800mm',
    category: 'furniture',
    width: 1.6,
    depth: 0.8,
    layerId: 'A-FURN',
    geometry: [
      { type: 'rect', x: 0, y: 0, width: 1.6, depth: 0.8, stroke: '#f59e0b', fill: 'none' },
      { type: 'rect', x: 0.1, y: 0.1, width: 0.4, depth: 0.6, stroke: '#f59e0b', fill: 'none' }
    ]
  },
  TREE_DECIDUOUS: {
    id: 'TREE_DECIDUOUS',
    name: 'Deciduous Landscape Tree 3m Canopy',
    category: 'landscape',
    width: 3.0,
    depth: 3.0,
    layerId: 'L-PLNT-TREE',
    geometry: [
      { type: 'circle', cx: 1.5, cy: 1.5, r: 1.5, stroke: '#22c55e', fill: 'none' },
      { type: 'circle', cx: 1.5, cy: 1.5, r: 0.2, stroke: '#15803d', fill: '#15803d' },
      { type: 'line', x1: 0, y1: 1.5, x2: 3.0, y2: 1.5, stroke: '#22c55e', opacity: 0.5 },
      { type: 'line', x1: 1.5, y1: 0, x2: 1.5, y2: 3.0, stroke: '#22c55e', opacity: 0.5 }
    ]
  }
};

/**
 * Creates an instance of a reusable CAD Block Definition.
 *
 * @param {Object} props
 * @param {string} [props.blockId] - Key in CAD_BLOCK_LIBRARY
 * @param {number} [props.x=0] - World origin X
 * @param {number} [props.y=0] - World origin Y
 * @param {number} [props.rotation=0] - Rotation angle in degrees
 * @param {number} [props.scale=1.0] - Uniform scale factor
 * @param {string} [props.layerId] - CAD Layer identifier
 * @returns {Object} Block instance entity
 */
export function createBlockInstanceEntity(props = {}) {
  const blockDef = CAD_BLOCK_LIBRARY[props.blockId] || props.blockDef || {
    id: props.blockId || 'CUSTOM_BLOCK',
    name: props.name || 'Block Instance',
    width: props.width || 1.0,
    depth: props.depth || 1.0,
    layerId: props.layerId || 'A-ANNO-SYMB',
    geometry: []
  };

  const x = typeof props.x === 'number' ? props.x : 0;
  const y = typeof props.y === 'number' ? props.y : 0;
  const rotation = typeof props.rotation === 'number' ? props.rotation : 0;
  const scale = typeof props.scale === 'number' && props.scale > 0 ? props.scale : 1.0;

  return {
    kind: 'block_instance',
    id: props.id || generateEntityId('blk'),
    name: props.name || blockDef.name,
    blockId: blockDef.id,
    x,
    y,
    width: blockDef.width * scale,
    depth: blockDef.depth * scale,
    rotation,
    scale,
    layerId: props.layerId || blockDef.layerId || 'A-ANNO-SYMB',
    floorId: props.floorId || 'floor-1',
    blockDef
  };
}






// ---------------------------------------------------------------------------
// Schema v2 identity note: entities receive their identity contract
// (_meta.createdAt/updatedAt/revision/provenance) when they enter the project
// model — stamped at the plan-workspace commit boundary and in the v1→v2
// migration (core/project-schema.attachIdentity). Keeping this pure-geometry
// module free of persistence concerns was a deliberate design decision.
// ---------------------------------------------------------------------------
