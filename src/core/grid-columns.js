/**
 * Architecture Helping Hand - Structural Grid & Column System
 * Provides data structures, geometric calculations, and snapping helpers for
 * architectural structural columns (rectangular, circular, steel H-beams) and
 * structural grid lines (centerlines with alphanumeric bubble badges).
 */

import { requireFiniteNumber } from './calculator.js';

export const COLUMN_PROFILES = Object.freeze(['rect', 'circle', 'h_beam']);
export const BUBBLE_POSITIONS = Object.freeze(['both', 'start', 'end', 'none']);

let entityCounter = 1;
export function generateGridEntityId(prefix = 'grid') {
  return `${prefix}-${Date.now().toString(36)}-${(entityCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Creates a structural column entity.
 *
 * @param {Object} options
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @param {'rect'|'circle'|'h_beam'} [options.profile='rect']
 * @param {number} options.x - World X coordinate of center
 * @param {number} options.y - World Y coordinate of center
 * @param {number} [options.width=0.4] - Width in meters (for rect and h_beam)
 * @param {number} [options.depth=0.4] - Depth in meters (for rect and h_beam)
 * @param {number} [options.radius=0.2] - Radius in meters (for circle)
 * @param {number} [options.rotation=0] - Rotation angle in degrees
 * @param {string} [options.material='concrete'] - 'concrete' | 'steel' | 'timber'
 * @param {string} [options.layerId='A-GRID']
 * @param {string} [options.floorId='floor-1']
 * @returns {Object} Column entity
 */
export function createColumn({
  id,
  name,
  label,
  profile = 'rect',
  x = 0,
  y = 0,
  width = 0.4,
  depth = 0.4,
  radius = 0.2,
  rotation = 0,
  material = 'concrete',
  layerId = 'A-GRID',
  layer,
  floorId = 'floor-1'
} = {}) {
  requireFiniteNumber(x, 'column.x');
  requireFiniteNumber(y, 'column.y');

  const prof = COLUMN_PROFILES.includes(profile) ? profile : 'rect';
  const w = typeof width === 'number' && width > 0 ? width : 0.4;
  const d = typeof depth === 'number' && depth > 0 ? depth : 0.4;
  const r = typeof radius === 'number' && radius > 0 ? radius : 0.2;
  const rot = typeof rotation === 'number' && !isNaN(rotation) ? rotation : 0;
  const finalLayer = layer || layerId || 'A-GRID';
  const finalName = typeof name === 'string' && name ? name : (typeof label === 'string' && label ? label : `Column ${prof.toUpperCase()}`);

  return {
    kind: 'column',
    id: id || generateGridEntityId('col'),
    name: finalName,
    label: finalName,
    profile: prof,
    x,
    y,
    width: prof === 'circle' ? r * 2 : w,
    depth: prof === 'circle' ? r * 2 : d,
    radius: r,
    rotation: rot,
    material: typeof material === 'string' ? material : 'concrete',
    layerId: finalLayer,
    layer: finalLayer,
    floorId
  };
}

/**
 * Creates a structural grid line entity (with bubble tags).
 *
 * @param {Object} options
 * @param {string} [options.id]
 * @param {string} [options.name] - Bubble label (e.g. '1', '2', 'A', 'B')
 * @param {{x: number, y: number}} [options.p1] - Start point
 * @param {{x: number, y: number}} [options.p2] - End point
 * @param {number} [options.x1]
 * @param {number} [options.y1]
 * @param {number} [options.x2]
 * @param {number} [options.y2]
 * @param {'both'|'start'|'end'|'none'} [options.bubblePosition='both']
 * @param {number} [options.bubbleRadius=0.35]
 * @param {string} [options.layerId='A-GRID']
 * @param {string} [options.floorId='floor-1']
 * @returns {Object} Grid line entity
 */
export function createGridLine({
  id,
  name,
  label,
  p1,
  p2,
  x1,
  y1,
  x2,
  y2,
  bubblePosition,
  bubble,
  bubbleRadius = 0.35,
  layerId = 'A-GRID',
  layer,
  floorId = 'floor-1'
} = {}) {
  const pt1 = p1 || { x: typeof x1 === 'number' ? x1 : 0, y: typeof y1 === 'number' ? y1 : 0 };
  const pt2 = p2 || { x: typeof x2 === 'number' ? x2 : 10, y: typeof y2 === 'number' ? y2 : 0 };

  if (!pt1 || typeof pt1.x !== 'number' || typeof pt1.y !== 'number') {
    throw new Error('gridLine requires valid p1 {x, y}');
  }
  if (!pt2 || typeof pt2.x !== 'number' || typeof pt2.y !== 'number') {
    throw new Error('gridLine requires valid p2 {x, y}');
  }

  const rawBubble = bubblePosition || bubble || 'both';
  const bPos = BUBBLE_POSITIONS.includes(rawBubble) ? rawBubble : 'both';
  const bRad = typeof bubbleRadius === 'number' && bubbleRadius > 0 ? bubbleRadius : 0.35;
  const finalLayer = layer || layerId || 'A-GRID';
  const finalName = typeof name === 'string' && name ? name : (typeof label === 'string' && label ? label : '1');

  return {
    kind: 'grid_line',
    id: id || generateGridEntityId('gl'),
    name: finalName,
    label: finalName,
    p1: { x: pt1.x, y: pt1.y },
    p2: { x: pt2.x, y: pt2.y },
    bubblePosition: bPos,
    bubble: bPos,
    bubbleRadius: bRad,
    layerId: finalLayer,
    layer: finalLayer,
    floorId
  };
}

/**
 * Computes polygon contour vertices for a column in world coordinates.
 * @param {Object} column
 * @returns {Array<[number, number]>} Array of [x, y] coordinates
 */
export function columnContour(column) {
  if (!column) return [];
  const cx = column.x;
  const cy = column.y;
  const rotRad = ((column.rotation || 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  const rotate = (lx, ly) => [
    cx + lx * cosR - ly * sinR,
    cy + lx * sinR + ly * cosR
  ];

  if (column.profile === 'circle') {
    const r = column.radius || 0.2;
    const segments = 24;
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      pts.push([cx + Math.cos(theta) * r, cy + Math.sin(theta) * r]);
    }
    return pts;
  }

  if (column.profile === 'h_beam') {
    const w = column.width || 0.3;
    const d = column.depth || 0.3;
    const tf = Math.max(0.015, d * 0.1); // flange thickness
    const tw = Math.max(0.012, w * 0.08); // web thickness
    const hw = w / 2;
    const hd = d / 2;
    const htw = tw / 2;

    // Standard I-beam / H-beam contour (12 vertices)
    const localPts = [
      [-hw, -hd],
      [hw, -hd],
      [hw, -hd + tf],
      [htw, -hd + tf],
      [htw, hd - tf],
      [hw, hd - tf],
      [hw, hd],
      [-hw, hd],
      [-hw, hd - tf],
      [-htw, hd - tf],
      [-htw, -hd + tf],
      [-hw, -hd + tf]
    ];
    return localPts.map(([lx, ly]) => rotate(lx, ly));
  }

  // Default 'rect'
  const hw = (column.width || 0.4) / 2;
  const hd = (column.depth || 0.4) / 2;
  const localPts = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd]
  ];
  return localPts.map(([lx, ly]) => rotate(lx, ly));
}

/**
 * Computes architectural CAD cross-hatch lines for a column (the standard structural X symbol).
 * @param {Object} column
 * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>}
 */
export function columnHatchLines(column) {
  if (!column) return [];
  const cx = column.x;
  const cy = column.y;
  const rotRad = ((column.rotation || 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  const rotate = (lx, ly) => ({
    x: cx + lx * cosR - ly * sinR,
    y: cy + lx * sinR + ly * cosR
  });

  if (column.profile === 'circle') {
    const r = column.radius || 0.2;
    const pTop = rotate(0, r);
    const pBottom = rotate(0, -r);
    const pLeft = rotate(-r, 0);
    const pRight = rotate(r, 0);
    return [
      { x1: pLeft.x, y1: pLeft.y, x2: pRight.x, y2: pRight.y },
      { x1: pTop.x, y1: pTop.y, x2: pBottom.x, y2: pBottom.y }
    ];
  }

  if (column.profile === 'h_beam') {
    // Center web line
    const hd = (column.depth || 0.3) / 2;
    const tf = Math.max(0.015, hd * 0.2);
    const p1 = rotate(0, -hd + tf);
    const p2 = rotate(0, hd - tf);
    return [{ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }];
  }

  // Rect cross-hatch (corner to corner X)
  const hw = (column.width || 0.4) / 2;
  const hd = (column.depth || 0.4) / 2;
  const c1 = rotate(-hw, -hd);
  const c2 = rotate(hw, hd);
  const c3 = rotate(hw, -hd);
  const c4 = rotate(-hw, hd);

  return [
    { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y },
    { x1: c3.x, y1: c3.y, x2: c4.x, y2: c4.y }
  ];
}

/**
 * Returns snap points for a column (center, corners, edge midpoints).
 * @param {Object} column
 * @returns {Array<{x: number, y: number, type: string, targetId: string}>}
 */
export function columnSnapPoints(column) {
  if (!column) return [];
  const snaps = [
    { x: column.x, y: column.y, type: 'center', targetId: column.id }
  ];

  if (column.profile === 'circle') {
    const r = column.radius || 0.2;
    snaps.push(
      { x: column.x + r, y: column.y, type: 'quadrant', targetId: column.id },
      { x: column.x - r, y: column.y, type: 'quadrant', targetId: column.id },
      { x: column.x, y: column.y + r, type: 'quadrant', targetId: column.id },
      { x: column.x, y: column.y - r, type: 'quadrant', targetId: column.id }
    );
    return snaps;
  }

  const contour = columnContour(column);
  if (column.profile === 'rect') {
    for (const [px, py] of contour) {
      snaps.push({ x: px, y: py, type: 'corner', targetId: column.id });
    }
    // Edge midpoints
    for (let i = 0; i < contour.length; i++) {
      const p1 = contour[i];
      const p2 = contour[(i + 1) % contour.length];
      snaps.push({
        x: (p1[0] + p2[0]) / 2,
        y: (p1[1] + p2[1]) / 2,
        type: 'midpoint',
        targetId: column.id
      });
    }
  } else {
    for (const [px, py] of contour) {
      snaps.push({ x: px, y: py, type: 'corner', targetId: column.id });
    }
  }

  return snaps;
}

/**
 * Finds the intersection point between two grid lines (line-line intersection).
 * @param {Object} g1 - First grid line
 * @param {Object} g2 - Second grid line
 * @returns {{x: number, y: number}|null} Intersection point or null if parallel
 */
export function gridLineIntersection(g1, g2) {
  if (!g1 || !g2 || !g1.p1 || !g1.p2 || !g2.p1 || !g2.p2) return null;

  const x1 = g1.p1.x;
  const y1 = g1.p1.y;
  const x2 = g1.p2.x;
  const y2 = g1.p2.y;

  const x3 = g2.p1.x;
  const y3 = g2.p1.y;
  const x4 = g2.p2.x;
  const y4 = g2.p2.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-9) return null; // parallel or coincident

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const ix = x1 + t * (x2 - x1);
  const iy = y1 + t * (y2 - y1);

  return { x: ix, y: iy };
}

/**
 * Generates an automated orthogonal structural grid system based on span spacings.
 *
 * @param {Object} options
 * @param {Array<number>} [options.xSpacings=[6, 6, 6]] - Spans along X in meters
 * @param {Array<number>} [options.ySpacings=[6, 6, 6]] - Spans along Y in meters
 * @param {number} [options.originX=0]
 * @param {number} [options.originY=0]
 * @param {number} [options.extension=1.5] - Distance grid line extends past outer grid boundary
 * @param {Array<string>} [options.xLabels] - Labels for vertical grid lines (default 1, 2, 3...)
 * @param {Array<string>} [options.yLabels] - Labels for horizontal grid lines (default A, B, C...)
 * @param {number} [options.bubbleRadius=0.35]
 * @param {string} [options.layerId='A-GRID']
 * @returns {Array<Object>} Array of grid line entities
 */
export function generateGridSystem({
  xSpacings = [6, 6, 6],
  ySpacings = [6, 6, 6],
  originX = 0,
  originY = 0,
  xOrigin,
  yOrigin,
  extension = 1.5,
  xLabels,
  yLabels,
  bubbleRadius = 0.35,
  layerId = 'A-GRID'
} = {}) {
  const lines = [];
  const ox = typeof originX === 'number' && originX !== 0 ? originX : (typeof xOrigin === 'number' ? xOrigin : (originX || 0));
  const oy = typeof originY === 'number' && originY !== 0 ? originY : (typeof yOrigin === 'number' ? yOrigin : (originY || 0));

  // Compute X grid line positions
  const xCoords = [ox];
  let curX = ox;
  for (const s of xSpacings) {
    curX += Math.max(0.1, s);
    xCoords.push(curX);
  }

  // Compute Y grid line positions
  const yCoords = [oy];
  let curY = oy;
  for (const s of ySpacings) {
    curY += Math.max(0.1, s);
    yCoords.push(curY);
  }

  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);

  const ext = Math.max(0.5, extension);

  // Vertical grid lines (labeled 1, 2, 3...)
  xCoords.forEach((xVal, idx) => {
    const lbl = (Array.isArray(xLabels) && xLabels[idx]) ? xLabels[idx] : String(idx + 1);
    lines.push(
      createGridLine({
        name: lbl,
        label: lbl,
        p1: { x: xVal, y: minY - ext },
        p2: { x: xVal, y: maxY + ext },
        bubblePosition: 'both',
        bubbleRadius,
        layerId
      })
    );
  });

  // Horizontal grid lines (labeled A, B, C...)
  const defaultYLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
  yCoords.forEach((yVal, idx) => {
    const lbl = (Array.isArray(yLabels) && yLabels[idx])
      ? yLabels[idx]
      : (defaultYLabels[idx] || `Y${idx + 1}`);
    lines.push(
      createGridLine({
        name: lbl,
        label: lbl,
        p1: { x: minX - ext, y: yVal },
        p2: { x: maxX + ext, y: yVal },
        bubblePosition: 'both',
        bubbleRadius,
        layerId
      })
    );
  });

  // Structural columns placed at every grid intersection
  const columns = [];
  xCoords.forEach(xVal => {
    yCoords.forEach(yVal => {
      columns.push(
        createColumn({
          x: xVal,
          y: yVal,
          profile: 'rect',
          width: 0.4,
          depth: 0.4,
          layerId
        })
      );
    });
  });

  lines.gridLines = lines;
  lines.columns = columns;
  return lines;
}
