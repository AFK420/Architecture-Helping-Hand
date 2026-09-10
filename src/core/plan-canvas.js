/**
 * Architecture Helping Hand - Plan Canvas Core
 * Phase 3: pure view/interaction math for the SVG plan editor.
 *
 * The Plan Canvas never mixes pixel and project coordinates:
 *   world coordinates (meters) → view transform → SVG coordinates
 * This module owns the transform, grid/snapping, selection geometry,
 * and a lightweight undo/redo command stack. Rendering lives in the UI
 * view; persistence in the project document via the store.
 */

import { rectsIntersect, generateEntityId } from './entities.js';
import {
  pointInPolygon,
  calcWallPolygon,
  calcDoorCADGeometry,
  calcWindowCADGeometry,
  calcDimensionGeometry,
  calcArcBulge,
  projectPointOnSegment,
  findPerpendicularProjection,
  findExtensionSnap,
  findSegmentIntersections
} from './geometry.js';
import {
  columnContour,
  columnHatchLines,
  columnSnapPoints,
  gridLineIntersection
} from './grid-columns.js';

/**
 * Creates a view transform for the plan canvas.
 * @param {Object} [init] - { offsetX, offsetY, zoom }
 *   SVG point = world point * zoom + offset  (screen y grows downward,
 *   so the view flips the world y axis: svgY = offsetY - worldY * zoom)
 */
export function createViewTransform(init = {}) {
  return {
    offsetX: typeof init.offsetX === 'number' ? init.offsetX : 60,
    offsetY: typeof init.offsetY === 'number' ? init.offsetY : 420,
    zoom: typeof init.zoom === 'number' && init.zoom > 0 ? init.zoom : 40 // px per meter
  };
}

export function worldToSvg(transform, wx, wy) {
  return { x: transform.offsetX + wx * transform.zoom, y: transform.offsetY - wy * transform.zoom };
}

export function svgToWorld(transform, sx, sy) {
  return { x: (sx - transform.offsetX) / transform.zoom, y: (transform.offsetY - sy) / transform.zoom };
}

/** Clamped zoom change (weak laptop: keep between 4 and 400 px/m). */
export function zoomAt(transform, factor, svgX, svgY, minZoom = 4, maxZoom = 400) {
  const before = svgToWorld(transform, svgX, svgY);
  const zoom = Math.max(minZoom, Math.min(maxZoom, transform.zoom * factor));
  const after = { zoom, offsetX: 0, offsetY: 0 };
  // keep the world point under the cursor fixed
  const next = createViewTransform({ ...transform, zoom });
  const world = svgToWorld(transform, svgX, svgY);
  next.offsetX = svgX - world.x * zoom;
  next.offsetY = svgY + world.y * zoom;
  void after; void before;
  return next;
}

/** Pan by SVG pixels. */
export function panBy(transform, dx, dy) {
  return { ...transform, offsetX: transform.offsetX + dx, offsetY: transform.offsetY + dy };
}

// ---------------------------------------------------------------------------
// Grid & snapping
// ---------------------------------------------------------------------------

/**
 * Builds grid line coordinates (world meters) for the visible extent.
 * Minor lines at gridMeters spacing, major lines every majorEvery lines.
 * Kept cheap: count-bounded for weak laptops.
 */
export function buildGrid(transform, svgWidth, svgHeight, gridMeters = 0.5, majorEvery = 4, maxLines = 200) {
  const tl = svgToWorld(transform, 0, 0);
  const br = svgToWorld(transform, svgWidth, svgHeight);
  const lines = [];
  const startX = Math.floor(tl.x / gridMeters) * gridMeters;
  const endX = Math.ceil(br.x / gridMeters) * gridMeters;
  const startY = Math.floor(br.y / gridMeters) * gridMeters;
  const endY = Math.ceil(tl.y / gridMeters) * gridMeters;

  let count = 0;
  for (let x = startX; x <= endX && count < maxLines; x += gridMeters) {
    const index = Math.round(x / gridMeters);
    lines.push({ axis: 'x', world: x, major: ((index % majorEvery) + majorEvery) % majorEvery === 0 });
    count++;
  }
  for (let y = startY; y <= endY && count < maxLines * 2; y += gridMeters) {
    const index = Math.round(y / gridMeters);
    lines.push({ axis: 'y', world: y, major: ((index % majorEvery) + majorEvery) % majorEvery === 0 });
    count++;
  }
  return lines;
}

/**
 * Snaps a world coordinate to the grid (or to a finer snap step).
 * Deterministic epsilon handling via round-to-step.
 */
export function snapToGrid(value, gridMeters) {
  const snapped = Math.round(value / gridMeters) * gridMeters;
  return Math.abs(snapped) < 1e-9 ? 0 : snapped;
}

export function snapRect(rect, gridMeters) {
  return {
    x: snapToGrid(rect.x, gridMeters),
    y: snapToGrid(rect.y, gridMeters),
    width: Math.max(gridMeters, snapToGrid(rect.width, gridMeters)),
    depth: Math.max(gridMeters, snapToGrid(rect.depth, gridMeters))
  };
}

/**
 * Detects nearby object snap targets (corners, midpoints, endpoints, intersections,
 * perpendiculars, centers, extensions) or falls back to grid.
 *
 * @param {{x: number, y: number}} point - Candidate world coordinate
 * @param {Array<Object>} entities - Project entities list
 * @param {Object} [options]
 * @param {number} [options.snapDistance=0.20] - Max distance in meters to latch onto an object target
 * @param {boolean} [options.snapGrid=true] - Whether to snap to grid when no object is nearby
 * @param {number} [options.gridMeters=0.5] - Grid increment in meters
 * @param {string} [options.excludeId] - Optional ID of entity being moved/modified
 * @param {{x: number, y: number}} [options.startPoint] - Start point when drafting a vector (enables perpendicular foot snap)
 * @param {Object} [options.osnaps] - Optional boolean toggle map for specific snap types
 * @returns {{ x: number, y: number, type: 'corner'|'midpoint'|'endpoint'|'intersection'|'perpendicular'|'center'|'extension'|'grid'|'none', snapped: boolean, targetId?: string, guideRay?: Array<{x: number, y: number}>|null }}
 */
export function findSnapPoint(point, entities = [], options = {}) {
  const snapDist = typeof options.snapDistance === 'number' ? options.snapDistance : 0.20;
  const snapGrid = options.snapGrid !== false;
  const gridMeters = options.gridMeters || 0.5;
  const excludeId = options.excludeId || null;
  const startPoint = options.startPoint || options.draftStart || null;
  const osnaps = options.osnaps || {};

  const isEnabled = (type) => osnaps[type] !== false;

  let bestHit = null;
  let bestDist = snapDist;

  const PRIORITY = { endpoint: 5, corner: 5, intersection: 5, midpoint: 3, center: 2, perpendicular: 2, extension: 1, tangent: 2, nearest: 0 };

  const testCandidate = (cand) => {
    if (!isEnabled(cand.type)) return;
    const d = Math.hypot(cand.x - point.x, cand.y - point.y);
    const candPrio = PRIORITY[cand.type] || 0;
    const bestPrio = bestHit ? (PRIORITY[bestHit.type] || 0) : -1;

    if (d < bestDist - 1e-4) {
      bestDist = d;
      bestHit = cand;
    } else if (Math.abs(d - bestDist) <= 1e-4 && candPrio > bestPrio) {
      bestHit = cand;
    }
  };

  const walls = [];
  const otherEntities = [];
  const gridLines = [];
  const columns = [];

  for (const e of entities) {
    if (!e || e.id === excludeId) continue;
    if (e.kind === 'wall' && typeof e.x1 === 'number') {
      walls.push(e);
    } else if (e.kind === 'grid_line' && e.p1 && e.p2) {
      gridLines.push(e);
    } else if (e.kind === 'column') {
      columns.push(e);
    } else if (typeof e.x === 'number' && typeof e.width === 'number') {
      otherEntities.push(e);
    }
  }

  // 1. Wall endpoints & midpoints
  for (const w of walls) {
    if (isEnabled('endpoint')) {
      testCandidate({ x: w.x1, y: w.y1, type: 'endpoint', targetId: w.id });
      testCandidate({ x: w.x2, y: w.y2, type: 'endpoint', targetId: w.id });
    }
    if (isEnabled('midpoint')) {
      testCandidate({ x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2, type: 'midpoint', targetId: w.id });
    }
  }

  // Grid line endpoints & midpoints
  for (const gl of gridLines) {
    if (isEnabled('endpoint')) {
      testCandidate({ x: gl.p1.x, y: gl.p1.y, type: 'endpoint', targetId: gl.id });
      testCandidate({ x: gl.p2.x, y: gl.p2.y, type: 'endpoint', targetId: gl.id });
    }
    if (isEnabled('midpoint')) {
      testCandidate({ x: (gl.p1.x + gl.p2.x) / 2, y: (gl.p1.y + gl.p2.y) / 2, type: 'midpoint', targetId: gl.id });
    }
  }

  // 2. Wall-wall Intersections & Grid Line Intersections
  if (isEnabled('intersection')) {
    if (walls.length >= 2) {
      const segments = walls.map(w => ({
        p1: { x: w.x1, y: w.y1 },
        p2: { x: w.x2, y: w.y2 },
        id: w.id
      }));
      const intersections = findSegmentIntersections(segments);
      for (const hit of intersections) {
        testCandidate({
          x: hit.x,
          y: hit.y,
          type: 'intersection',
          targetId: hit.segId1
        });
      }
    }
    if (gridLines.length >= 2) {
      for (let i = 0; i < gridLines.length; i++) {
        for (let j = i + 1; j < gridLines.length; j++) {
          const hit = gridLineIntersection(gridLines[i], gridLines[j]);
          if (hit) {
            testCandidate({
              x: hit.x,
              y: hit.y,
              type: 'intersection',
              targetId: gridLines[i].id
            });
          }
        }
      }
    }
  }

  // Column snap points (center, corners, midpoints, quadrants)
  for (const col of columns) {
    const snaps = columnSnapPoints(col);
    for (const s of snaps) {
      if (isEnabled(s.type)) {
        testCandidate(s);
      }
    }
  }

  // 3. Rooms, Furniture, and other rectilinear entities (discrete corners, midpoints, center)
  for (const e of otherEntities) {
    const w = e.width;
    const d = e.depth || e.run || 0;

    if (isEnabled('corner')) {
      testCandidate({ x: e.x, y: e.y, type: 'corner', targetId: e.id });
      testCandidate({ x: e.x + w, y: e.y, type: 'corner', targetId: e.id });
      testCandidate({ x: e.x + w, y: e.y + d, type: 'corner', targetId: e.id });
      testCandidate({ x: e.x, y: e.y + d, type: 'corner', targetId: e.id });
    }

    if (isEnabled('midpoint')) {
      testCandidate({ x: e.x + w / 2, y: e.y, type: 'midpoint', targetId: e.id });
      testCandidate({ x: e.x + w, y: e.y + d / 2, type: 'midpoint', targetId: e.id });
      testCandidate({ x: e.x + w / 2, y: e.y + d, type: 'midpoint', targetId: e.id });
      testCandidate({ x: e.x, y: e.y + d / 2, type: 'midpoint', targetId: e.id });
    }

    if (isEnabled('center')) {
      testCandidate({ x: e.x + w / 2, y: e.y + d / 2, type: 'center', targetId: e.id });
    }
  }

  // 4. Perpendicular projection onto walls
  if (isEnabled('perpendicular')) {
    for (const w of walls) {
      const w1 = { x: w.x1, y: w.y1 };
      const w2 = { x: w.x2, y: w.y2 };

      if (startPoint && typeof startPoint.x === 'number') {
        // Orthogonal foot projection of the drafting start point onto target wall segment
        const proj = projectPointOnSegment(startPoint, w1, w2);
        if (proj.t >= 0.01 && proj.t <= 0.99) {
          testCandidate({
            x: proj.point.x,
            y: proj.point.y,
            type: 'perpendicular',
            targetId: w.id
          });
        }
      } else if (!bestHit) {
        // Cursor proximity perpendicular projection onto target wall segment (only when no discrete keypoint hit)
        const proj = findPerpendicularProjection(point, w1, w2, snapDist);
        if (proj) {
          testCandidate({
            x: proj.x,
            y: proj.y,
            type: 'perpendicular',
            targetId: w.id
          });
        }
      }
    }
  }

  // 5. Collinear Extension rays beyond wall endpoints
  if (isEnabled('extension')) {
    for (const w of walls) {
      const ext = findExtensionSnap(
        point,
        { x: w.x1, y: w.y1 },
        { x: w.x2, y: w.y2 },
        3.0,
        snapDist
      );
      if (ext) {
        testCandidate({
          x: ext.x,
          y: ext.y,
          type: 'extension',
          targetId: w.id,
          guideRay: ext.guideRay
        });
      }
    }
  }

  // 6. Nearest-on-edge: the closest point on any wall to the cursor.
  //    Fallback only — never competes with discrete keypoints (endpoints,
  //    intersections…), matching the perpendicular branch's design.
  if (isEnabled('nearest') && !bestHit) {
    for (const w of walls) {
      const proj = projectPointOnSegment(point, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
      if (proj.t >= 0 && proj.t <= 1) {
        testCandidate({
          x: proj.point.x,
          y: proj.point.y,
          type: 'nearest',
          targetId: w.id
        });
      }
    }
    for (const gl of gridLines) {
      const proj = projectPointOnSegment(point, gl.p1, gl.p2);
      if (proj.t >= 0 && proj.t <= 1) {
        testCandidate({ x: proj.point.x, y: proj.point.y, type: 'nearest', targetId: gl.id });
      }
    }
  }

  // 7. Tangent: from the drafting start point to circular targets
  //    (circular columns; arcs when they carry bulge geometry). Each circle
  //    yields up to 4 tangent points — the engine picks the one nearest.
  if (isEnabled('tangent') && startPoint && typeof startPoint.x === 'number') {
    const circles = [];
    for (const c of columns) {
      // circular column: a center + profile radius
      if (c && (c.profile === 'circle' || c.shape === 'circle' || c.kind === 'column')) {
        const r = Number.isFinite(c.radius) ? c.radius
          : (Number.isFinite(c.diameter) ? c.diameter / 2 : null);
        if (r && Number.isFinite(c.x)) {
          circles.push({ id: c.id, cx: c.x + (c.width || 0) / 2, cy: c.y + (c.depth || 0) / 2, r });
        }
      }
    }
    for (const e of entities) {
      if (e && e.kind === 'arc' && Number.isFinite(e.x1) && e.bulge) {
        try {
          const g = calcArcBulge({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }, e.bulge);
          if (g && Number.isFinite(g.center?.x) && g.radius > 0) {
            circles.push({ id: e.id, cx: g.center.x, cy: g.center.y, r: g.radius });
          }
        } catch (err) { /* non-derivable arc — skip */ }
      }
    }
    for (const c of circles) {
      const dx = c.cx - startPoint.x;
      const dy = c.cy - startPoint.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= c.r + 1e-9) continue; // start inside the circle: no real tangent
      // tangent length + angle to the tangent points
      const tanLen = Math.sqrt(Math.max(0, dist * dist - c.r * c.r));
      const baseAng = Math.atan2(dy, dx);
      const halfOff = Math.asin(Math.max(-1, Math.min(1, c.r / dist)));
      for (const side of [-1, 1]) {
        const ang = baseAng + side * halfOff;
        testCandidate({
          x: startPoint.x + tanLen * Math.cos(ang),
          y: startPoint.y + tanLen * Math.sin(ang),
          type: 'tangent',
          targetId: c.id
        });
      }
    }
  }

  if (bestHit) {
    return {
      x: bestHit.x,
      y: bestHit.y,
      type: bestHit.type,
      snapped: true,
      targetId: bestHit.targetId,
      guideRay: bestHit.guideRay || null
    };
  }

  if (snapGrid && gridMeters > 0) {
    return {
      x: snapToGrid(point.x, gridMeters),
      y: snapToGrid(point.y, gridMeters),
      type: 'grid',
      snapped: true,
      guideRay: null
    };
  }

  return {
    x: point.x,
    y: point.y,
    type: 'none',
    snapped: false,
    guideRay: null
  };
}

/**
 * Computes dynamic dashed alignment guidelines between a dragged entity rect and all other entities.
 *
 * @param {{x: number, y: number, width: number, depth: number}} draggedRect
 * @param {Array<Object>} allEntities
 * @param {Object} [options] - { threshold = 0.08, excludeId }
 * @returns {{ guidesX: Array<{x: number, y1: number, y2: number}>, guidesY: Array<{y: number, x1: number, x2: number}> }}
 */
export function computeAlignmentGuides(draggedRect, allEntities = [], options = {}) {
  const threshold = typeof options.threshold === 'number' ? options.threshold : 0.08;
  const excludeId = options.excludeId || null;
  const guidesX = [];
  const guidesY = [];

  if (!draggedRect || typeof draggedRect.x !== 'number') return { guidesX, guidesY };

  const left = draggedRect.x;
  const right = draggedRect.x + draggedRect.width;
  const centerX = draggedRect.x + draggedRect.width / 2;

  const bottom = draggedRect.y;
  const top = draggedRect.y + draggedRect.depth;
  const centerY = draggedRect.y + draggedRect.depth / 2;

  const xCands = [left, centerX, right];
  const yCands = [bottom, centerY, top];

  for (const e of allEntities) {
    if (!e || e.id === excludeId) continue;
    const r = e.kind === 'wall' ? wallRect(e) : (typeof e.x === 'number' ? { x: e.x, y: e.y, width: e.width || 0, depth: e.depth || 0 } : null);
    if (!r) continue;

    const eLeft = r.x;
    const eRight = r.x + r.width;
    const eCenterX = r.x + r.width / 2;
    const targetXs = [eLeft, eCenterX, eRight];

    for (const tx of targetXs) {
      for (const mx of xCands) {
        if (Math.abs(mx - tx) <= threshold) {
          const minY = Math.min(bottom, r.y);
          const maxY = Math.max(top, r.y + r.depth);
          guidesX.push({ x: tx, y1: minY - 0.2, y2: maxY + 0.2 });
        }
      }
    }

    const eBottom = r.y;
    const eTop = r.y + r.depth;
    const eCenterY = r.y + r.depth / 2;
    const targetYs = [eBottom, eCenterY, eTop];

    for (const ty of targetYs) {
      for (const my of yCands) {
        if (Math.abs(my - ty) <= threshold) {
          const minX = Math.min(left, r.x);
          const maxX = Math.max(right, r.x + r.width);
          guidesY.push({ y: ty, x1: minX - 0.2, x2: maxX + 0.2 });
        }
      }
    }
  }

  // Deduplicate and cap to at most 4 guides (weak laptop protection)
  const uniqueX = [];
  for (const g of guidesX) {
    if (!uniqueX.some(u => Math.abs(u.x - g.x) < 0.01)) uniqueX.push(g);
  }
  const uniqueY = [];
  for (const g of guidesY) {
    if (!uniqueY.some(u => Math.abs(u.y - g.y) < 0.01)) uniqueY.push(g);
  }

  return { guidesX: uniqueX.slice(0, 4), guidesY: uniqueY.slice(0, 4) };
}

/**
 * Computes live measurement metrics between two world points.
 *
 * @param {{x: number, y: number}} p1 - Start point
 * @param {{x: number, y: number}} p2 - End point
 * @returns {{ p1: Object, p2: Object, dx: number, dy: number, distanceMeters: number, distanceMm: number, angleDegrees: number, formattedM: string, formattedMm: string, formattedAngle: string }|null}
 */
export function computeMeasurement(p1, p2) {
  if (!p1 || !p2) return null;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distanceMeters = Math.hypot(dx, dy);
  const distanceMm = distanceMeters * 1000;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  return {
    p1: { x: p1.x, y: p1.y },
    p2: { x: p2.x, y: p2.y },
    dx,
    dy,
    distanceMeters,
    distanceMm,
    angleDegrees: angle,
    formattedM: `${distanceMeters.toFixed(3)} m`,
    formattedMm: `${Math.round(distanceMm)} mm`,
    formattedAngle: `${angle.toFixed(1)}°`
  };
}

/**
 * Duplicates an entity with an offset and unique identity.
 *
 * @param {Object} entity
 * @param {number} [offset=0.5] - Meters offset along x and y
 * @returns {Object|null} Fresh duplicated entity
 */
export function duplicateEntity(entity, offset = 0.5) {
  if (!entity || typeof entity !== 'object') return null;
  // Hostile offset contract: only finite numbers may shift geometry — a
  // non-numeric offset would stringify coords into NaN-corrupting data.
  const dx = Number.isFinite(offset) ? offset : (Number.isFinite(offset?.x) ? offset.x : 0);
  const dy = Number.isFinite(offset) ? offset : (Number.isFinite(offset?.y) ? offset.y : 0);
  const clone = JSON.parse(JSON.stringify(entity));
  clone.id = generateEntityId(clone.kind || 'item');
  clone.name = clone.name ? `${clone.name} (Copy)` : 'Copy';
  clone.locked = false;

  if (clone.kind === 'wall' && typeof clone.x1 === 'number') {
    clone.x1 += dx;
    clone.x2 += dx;
    clone.y1 += dy;
    clone.y2 += dy;
  } else if (typeof clone.x === 'number') {
    clone.x += dx;
    clone.y += dy;
  }
  return clone;
}

// ---------------------------------------------------------------------------
// Selection geometry
// ---------------------------------------------------------------------------

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Returns ids of entities whose rect intersects the selection point/rect. */
export function pickEntities(entities, worldRect) {
  const hits = [];
  const list = Array.isArray(entities)
    ? entities
    : (entities && typeof entities === 'object' ? Object.values(entities).flat().filter(Boolean) : []);
  for (const e of list) {
    if (!e) continue;
    // Walls are point-pair entities without x/y — map to their bounding rect
    const r = e.kind === 'wall'
      ? wallRect(e)
      : (typeof e.x === 'number' ? { x: e.x, y: e.y, width: e.width ?? 0, depth: e.depth ?? 0 } : null);
    if (!r) continue;
    if (worldRect.width === 0 && worldRect.depth === 0) {
      // point pick
      if (e.kind === 'room' && Array.isArray(e.boundary) && e.boundary.length >= 3) {
        if (pointInPolygon({ x: worldRect.x, y: worldRect.y }, e.boundary)) {
          hits.push(e.id);
        }
      } else if (e.kind === 'wall' && typeof e.x1 === 'number' && typeof e.x2 === 'number') {
        const d = distToSegment(worldRect.x, worldRect.y, e.x1, e.y1, e.x2, e.y2);
        if (d <= (e.thickness || 0.2) / 2 + 0.15) {
          hits.push(e.id);
        }
      } else if (worldRect.x >= r.x && worldRect.x <= r.x + r.width && worldRect.y >= r.y && worldRect.y <= r.y + r.depth) {
        hits.push(e.id);
      }
    } else if (rectsIntersect(worldRect, r)) {
      hits.push(e.id);
    }

    if ((e.kind === 'door' || e.kind === 'window') && e.wallId) {
      const hostWall = list.find(w => w && w.id === e.wallId);
      if (hostWall && typeof hostWall.x1 === 'number') {
        const lenW = Math.hypot(hostWall.x2 - hostWall.x1, hostWall.y2 - hostWall.y1);
        if (lenW > 1e-4) {
          const uW = { x: (hostWall.x2 - hostWall.x1) / lenW, y: (hostWall.y2 - hostWall.y1) / lenW };
          const opMid = (e.position || 0) + (e.width || 0.9) / 2;
          const px = hostWall.x1 + opMid * uW.x;
          const py = hostWall.y1 + opMid * uW.y;
          const rad = (e.width || 0.9) / 2 + 0.25;
          if (worldRect.width === 0 && worldRect.depth === 0) {
            if (Math.hypot(worldRect.x - px, worldRect.y - py) <= rad) {
              hits.push(e.id);
            }
          }
        }
      }
    }
  }
  return hits;
}

/** Bounding rect of an axis-aligned wall (with thickness). */
export function wallRect(wall) {
  const minX = Math.min(wall.x1, wall.x2) - wall.thickness / 2;
  const minY = Math.min(wall.y1, wall.y2) - wall.thickness / 2;
  const width = Math.abs(wall.x2 - wall.x1) + wall.thickness;
  const depth = Math.abs(wall.y2 - wall.y1) + wall.thickness;
  return { x: minX, y: minY, width, depth };
}

// ---------------------------------------------------------------------------
// Undo/Redo — lightweight command stack
// ---------------------------------------------------------------------------

/**
 * Command history: each command is { label, undo(state), redo(state) }
 * operating on an externally owned document object (applied mutatively to
 * a draft the caller controls). Bounded history keeps memory flat.
 */
export function createHistory(limit = 100) {
  const undoStack = [];
  const redoStack = [];

  return {
    /** Record a command AFTER its redo() side effect has been applied. */
    push(command) {
      if (!command || typeof command.undo !== 'function' || typeof command.redo !== 'function') {
        throw new Error('History commands need undo() and redo()');
      }
      undoStack.push(command);
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    undo() {
      const cmd = undoStack.pop();
      if (!cmd) return null;
      cmd.undo();
      redoStack.push(cmd);
      return cmd.label;
    },
    redo() {
      const cmd = redoStack.pop();
      if (!cmd) return null;
      cmd.redo();
      undoStack.push(cmd);
      return cmd.label;
    },
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    },
    depth: () => undoStack.length
  };
}

/** Builds an add/remove command pair for an entity in an array. */
export function entityAddRemoveCommand(list, entity, label) {
  let removedIndex = -1;
  return {
    label,
    redo() {
      if (removedIndex === -1) list.push(entity);
      else list.splice(removedIndex, 0, entity);
      removedIndex = -1;
    },
    undo() {
      removedIndex = list.indexOf(entity);
      if (removedIndex !== -1) list.splice(removedIndex, 1);
    }
  };
}

/** Builds a move command (translates an entity by dx,dy; undo reverses). */
export function entityMoveCommand(entity, dx, dy, label) {
  return {
    label,
    redo() {
      if (typeof entity.x === 'number') entity.x += dx;
      if (typeof entity.y === 'number') entity.y += dy;
      if (typeof entity.x1 === 'number') entity.x1 += dx;
      if (typeof entity.y1 === 'number') entity.y1 += dy;
      if (typeof entity.x2 === 'number') entity.x2 += dx;
      if (typeof entity.y2 === 'number') entity.y2 += dy;
      if (Array.isArray(entity.boundary)) {
        for (const pt of entity.boundary) {
          pt.x += dx;
          pt.y += dy;
        }
      }
    },
    undo() {
      if (typeof entity.x === 'number') entity.x -= dx;
      if (typeof entity.y === 'number') entity.y -= dy;
      if (typeof entity.x1 === 'number') entity.x1 -= dx;
      if (typeof entity.y1 === 'number') entity.y1 -= dy;
      if (typeof entity.x2 === 'number') entity.x2 -= dx;
      if (typeof entity.y2 === 'number') entity.y2 -= dy;
      if (Array.isArray(entity.boundary)) {
        for (const pt of entity.boundary) {
          pt.x -= dx;
          pt.y -= dy;
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Export geometry (P14): world-space outlines for SVG/DXF export
// ---------------------------------------------------------------------------

/**
 * Reduces plan entities to plain export geometry (world meters):
 *   { lines: [{x1,y1,x2,y2,label}], polygons: [{points:[[x,y]...], closed, label}], texts: [{x,y,text}] }
 * Pure: the exporter decides units/scale; this module only shapes geometry.
 * Rooms become closed polygons + a centered label; walls become thick-edge
 * outlines (their bounding rect) so DXF (no thickness concept here) still
 * shows the wall footprint; furniture becomes closed polygons + labels.
 *
 * @param {Array<Object>} entities - plan entities (rooms/walls/furniture)
 * @param {Object} [options] - { includeLabels (default true) }
 * @returns {{ lines: Array, polygons: Array, texts: Array }}
 */
export function planToExportGeometry(entities, options = {}) {
  const includeLabels = options.includeLabels !== false;
  const out = { lines: [], polygons: [], texts: [], circles: [] };
  const list = Array.isArray(entities)
    ? entities
    : (entities && typeof entities === 'object' ? Object.values(entities).flat().filter(Boolean) : []);
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const lyr = e.layerId || (e.kind === 'wall' ? 'A-WALL'
      : e.kind === 'door' ? 'A-DOOR'
      : e.kind === 'window' ? 'A-GLAZ'
      : e.kind === 'room' ? 'A-AREA'
      : (e.kind === 'stair' || e.kind === 'ramp') ? 'A-FLOR-STRS'
      : e.kind === 'furniture' ? 'A-FURN'
      : e.kind === 'dimension' ? 'A-DIMS'
      : (e.kind === 'room_tag' || e.kind === 'door_tag' || e.kind === 'window_tag' || e.kind === 'north_arrow') ? 'A-ANNO-TAGS'
      : (e.kind === 'column' || e.kind === 'grid_line') ? 'A-GRID'
      : 'A-ANNO-TEXT');

    if (e.kind === 'room') {
      if (Array.isArray(e.boundary) && e.boundary.length >= 3) {
        out.polygons.push({
          closed: true,
          points: e.boundary.map(pt => [pt.x, pt.y]),
          label: e.name || 'Room',
          layer: lyr
        });
        if (includeLabels) {
          const cx = e.boundary.reduce((sum, p) => sum + p.x, 0) / e.boundary.length;
          const cy = e.boundary.reduce((sum, p) => sum + p.y, 0) / e.boundary.length;
          out.texts.push({ x: cx, y: cy, text: e.name || 'Room', layer: lyr });
        }
      } else if (typeof e.x === 'number' && typeof e.width === 'number' &&
                 typeof e.y === 'number' && typeof e.depth === 'number') {
        out.polygons.push({
          closed: true,
          points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
          label: e.name || 'Room',
          layer: lyr
        });
        if (includeLabels) {
          out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: e.name || 'Room', layer: lyr });
        }
      }
    } else if (e.kind === 'wall' && typeof e.x1 === 'number') {
      const dx = (e.x2 || 0) - e.x1;
      const dy = (e.y2 || 0) - e.y1;
      if (dx === 0 || dy === 0) {
        // Exact axis-aligned footprint preserves bounding box contract
        const minX = Math.min(e.x1, e.x2) - (e.thickness || 0) / 2;
        const minY = Math.min(e.y1, e.y2) - (e.thickness || 0) / 2;
        const w = Math.abs(e.x2 - e.x1) + (e.thickness || 0);
        const d = Math.abs(e.y2 - e.y1) + (e.thickness || 0);
        out.polygons.push({
          closed: true,
          points: [[minX, minY], [minX + w, minY], [minX + w, minY + d], [minX, minY + d]],
          label: e.name || 'Wall',
          layer: lyr
        });
      } else {
        const wallCorners = calcWallPolygon(e);
        out.polygons.push({
          closed: true,
          points: wallCorners.map(pt => [pt.x, pt.y]),
          label: e.name || 'Wall',
          layer: lyr
        });
      }
    } else if (e.kind === 'door') {
      const host = list.find(w => w.id === e.wallId);
      if (host && typeof host.x1 === 'number') {
        try {
          const doorCAD = calcDoorCADGeometry(host, e);
          if (doorCAD.jamb1Line) {
            out.lines.push({ x1: doorCAD.jamb1Line[0].x, y1: doorCAD.jamb1Line[0].y, x2: doorCAD.jamb1Line[1].x, y2: doorCAD.jamb1Line[1].y, layer: lyr });
          }
          if (doorCAD.jamb2Line) {
            out.lines.push({ x1: doorCAD.jamb2Line[0].x, y1: doorCAD.jamb2Line[0].y, x2: doorCAD.jamb2Line[1].x, y2: doorCAD.jamb2Line[1].y, layer: lyr });
          }
          if (doorCAD.type === 'double' && Array.isArray(doorCAD.leaves)) {
            for (const leaf of doorCAD.leaves) {
              out.lines.push({ x1: leaf.hinge.x, y1: leaf.hinge.y, x2: leaf.openEnd.x, y2: leaf.openEnd.y, layer: lyr });
            }
          } else if (doorCAD.hinge && doorCAD.openEnd) {
            out.lines.push({ x1: doorCAD.hinge.x, y1: doorCAD.hinge.y, x2: doorCAD.openEnd.x, y2: doorCAD.openEnd.y, layer: lyr });
          }
        } catch (_) {}
      }
    } else if (e.kind === 'window') {
      const host = list.find(w => w.id === e.wallId);
      if (host && typeof host.x1 === 'number') {
        try {
          const winCAD = calcWindowCADGeometry(host, e);
          if (winCAD.jamb1) out.lines.push({ x1: winCAD.jamb1[0].x, y1: winCAD.jamb1[0].y, x2: winCAD.jamb1[1].x, y2: winCAD.jamb1[1].y, layer: lyr });
          if (winCAD.jamb2) out.lines.push({ x1: winCAD.jamb2[0].x, y1: winCAD.jamb2[0].y, x2: winCAD.jamb2[1].x, y2: winCAD.jamb2[1].y, layer: lyr });
          if (winCAD.sillOuter) out.lines.push({ x1: winCAD.sillOuter[0].x, y1: winCAD.sillOuter[0].y, x2: winCAD.sillOuter[1].x, y2: winCAD.sillOuter[1].y, layer: lyr });
          if (winCAD.sillInner) out.lines.push({ x1: winCAD.sillInner[0].x, y1: winCAD.sillInner[0].y, x2: winCAD.sillInner[1].x, y2: winCAD.sillInner[1].y, layer: lyr });
          if (winCAD.glassPane1) out.lines.push({ x1: winCAD.glassPane1[0].x, y1: winCAD.glassPane1[0].y, x2: winCAD.glassPane1[1].x, y2: winCAD.glassPane1[1].y, layer: lyr });
          if (winCAD.glassPane2) out.lines.push({ x1: winCAD.glassPane2[0].x, y1: winCAD.glassPane2[0].y, x2: winCAD.glassPane2[1].x, y2: winCAD.glassPane2[1].y, layer: lyr });
        } catch (_) {}
      }
    } else if (e.kind === 'furniture' && typeof e.x === 'number' && typeof e.width === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Furniture',
        layer: lyr
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: e.name || 'Furniture', layer: lyr });
      }
    } else if (e.kind === 'stair' && typeof e.x === 'number' && typeof e.width === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Stair',
        layer: lyr
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: `${e.name || 'Stair'} (${e.risers || 0}R)`, layer: lyr });
      }
    } else if (e.kind === 'ramp' && typeof e.x === 'number' && typeof e.width === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Ramp',
        layer: lyr
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: `${e.name || 'Ramp'} (1:${(e.slopeRatio || 12).toFixed(1)})`, layer: lyr });
      }
    } else if (e.kind === 'dimension') {
      const p1 = e.p1 || { x: e.x1 ?? 0, y: e.y1 ?? 0 };
      const p2 = e.p2 || { x: e.x2 ?? 0, y: e.y2 ?? 0 };
      const dimGeom = calcDimensionGeometry(p1, p2, e);
      if (dimGeom && dimGeom.dimLine && dimGeom.dimLine[0] && dimGeom.dimLine[1]) {
        out.lines.push({
          x1: dimGeom.dimLine[0].x, y1: dimGeom.dimLine[0].y,
          x2: dimGeom.dimLine[1].x, y2: dimGeom.dimLine[1].y,
          layer: lyr
        });
      }
      if (dimGeom && dimGeom.witness1 && dimGeom.witness1[0] && dimGeom.witness1[1]) {
        out.lines.push({
          x1: dimGeom.witness1[0].x, y1: dimGeom.witness1[0].y,
          x2: dimGeom.witness1[1].x, y2: dimGeom.witness1[1].y,
          layer: lyr
        });
      }
      if (dimGeom && dimGeom.witness2 && dimGeom.witness2[0] && dimGeom.witness2[1]) {
        out.lines.push({
          x1: dimGeom.witness2[0].x, y1: dimGeom.witness2[0].y,
          x2: dimGeom.witness2[1].x, y2: dimGeom.witness2[1].y,
          layer: lyr
        });
      }
      if (includeLabels && dimGeom && dimGeom.textMid) {
        out.texts.push({
          x: dimGeom.textMid.x,
          y: dimGeom.textMid.y,
          text: e.textOverride || `${(dimGeom.distance || 0).toFixed(2)}m`,
          height: 0.18,
          layer: lyr
        });
      }
    } else if (e.kind === 'leader') {
      const p1 = e.p1 || { x: e.x1 ?? 0, y: e.y1 ?? 0 };
      const knee = e.knee || { x: p1.x + 0.5, y: p1.y + 0.5 };
      const p2 = e.p2 || { x: knee.x + 1.0, y: knee.y };
      out.lines.push({ x1: p1.x, y1: p1.y, x2: knee.x, y2: knee.y, layer: lyr });
      out.lines.push({ x1: knee.x, y1: knee.y, x2: p2.x, y2: p2.y, layer: lyr });
      if (includeLabels && e.text) {
        out.texts.push({ x: (knee.x + p2.x) / 2, y: knee.y + 0.15, text: e.text, height: 0.18, layer: lyr });
      }
    } else if (e.kind === 'room_tag') {
      if (includeLabels) {
        const areaStr = typeof e.area === 'number' ? `${e.area.toFixed(1)}m²` : '';
        const tagLine = [e.roomNumber ? `#${e.roomNumber}` : '', areaStr].filter(Boolean).join(' · ');
        out.texts.push({ x: e.x, y: e.y + 0.12, text: e.name || 'Room', height: 0.22, layer: lyr });
        if (tagLine) {
          out.texts.push({ x: e.x, y: e.y - 0.12, text: tagLine, height: 0.16, layer: lyr });
        }
      }
    } else if (e.kind === 'door_tag' || e.kind === 'window_tag') {
      if (includeLabels) {
        out.texts.push({ x: e.x, y: e.y, text: e.tagText || (e.kind === 'door_tag' ? 'D01' : 'W01'), height: 0.18, layer: lyr });
      }
    } else if (e.kind === 'north_arrow') {
      const s = (e.size || 1.0) / 2;
      const rotRad = ((e.rotation || 0) * Math.PI) / 180;
      const cosR = Math.cos(rotRad);
      const sinR = Math.sin(rotRad);
      const rot = (px, py) => [e.x + px * cosR - py * sinR, e.y + px * sinR + py * cosR];
      const tip = rot(0, s);
      const bL = rot(-s * 0.35, -s * 0.7);
      const bR = rot(s * 0.35, -s * 0.7);
      const center = rot(0, -s * 0.3);
      out.polygons.push({ closed: true, points: [tip, bL, center], label: 'North Arrow', layer: lyr });
      out.polygons.push({ closed: true, points: [tip, center, bR], label: 'North Arrow', layer: lyr });
      if (includeLabels) {
        const labelPos = rot(0, s + 0.25);
        out.texts.push({ x: labelPos[0], y: labelPos[1], text: 'N', height: 0.25, layer: lyr });
      }
    } else if (e.kind === 'column') {
      const contour = columnContour(e);
      if (contour.length >= 3) {
        out.polygons.push({ closed: true, points: contour, label: e.name || 'Column', layer: lyr });
      }
      const hatches = columnHatchLines(e);
      for (const h of hatches) {
        out.lines.push({ x1: h.x1, y1: h.y1, x2: h.x2, y2: h.y2, layer: lyr });
      }
    } else if (e.kind === 'grid_line' && e.p1 && e.p2) {
      out.lines.push({ x1: e.p1.x, y1: e.p1.y, x2: e.p2.x, y2: e.p2.y, layer: lyr, linetype: 'CENTER' });
      const bRad = e.bubbleRadius || 0.35;
      if (e.bubblePosition === 'both' || e.bubblePosition === 'start') {
        out.circles.push({ cx: e.p1.x, cy: e.p1.y, r: bRad, layer: lyr });
        if (includeLabels && e.name) {
          out.texts.push({ x: e.p1.x, y: e.p1.y, text: e.name, height: 0.22, layer: lyr });
        }
      }
      if (e.bubblePosition === 'both' || e.bubblePosition === 'end') {
        out.circles.push({ cx: e.p2.x, cy: e.p2.y, r: bRad, layer: lyr });
        if (includeLabels && e.name) {
          out.texts.push({ x: e.p2.x, y: e.p2.y, text: e.name, height: 0.22, layer: lyr });
        }
      }
    } else if (e.kind === 'text' && typeof e.x === 'number' && typeof e.y === 'number') {
      if (includeLabels) {
        out.texts.push({ x: e.x, y: e.y, text: e.text || e.name || '', height: 0.2, layer: lyr });
      }
    }
  }
  return out;
}

/**
 * Renders plan export geometry as a standalone inline SVG markup string
 (world meters × pixelsPerMeter scale, y-axis flipped like the canvas view).
 * Pure string output — the Export Center wraps it with wrapSVGDocument().
 *
 * @param {Object} geometry - output of planToExportGeometry
 * @param {Object} [options] - { pixelsPerMeter (default 40), paddingMeters (default 1) }
 * @returns {string} `<svg ...>...</svg>` markup with xmlns
 */
export function generatePlanSVG(geometry, options = {}) {
  const ppm = typeof options.pixelsPerMeter === 'number' && options.pixelsPerMeter > 0
    ? options.pixelsPerMeter : 40;
  const pad = typeof options.paddingMeters === 'number' && options.paddingMeters >= 0
    ? options.paddingMeters : 1;

  const polys = (geometry && Array.isArray(geometry.polygons)) ? geometry.polygons : [];
  const texts = (geometry && Array.isArray(geometry.texts)) ? geometry.texts : [];

  // Bounds over all points (fall back to a 1m empty frame)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polys) {
    for (const [x, y] of poly.points || []) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
  }
  for (const t of texts) {
    if (t.x < minX) minX = t.x; if (t.y < minY) minY = t.y;
    if (t.x > maxX) maxX = t.x; if (t.y > maxY) maxY = t.y;
  }
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    minX = 0; minY = 0; maxX = 1; maxY = 1;
  }
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;

  const widthM = Math.max(maxX - minX, 0.1);
  const heightM = Math.max(maxY - minY, 0.1);
  const widthPx = Math.min(widthM * ppm, 6000);
  const heightPx = Math.min(heightM * ppm, 6000);

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const X = x => ((x - minX) * ppm).toFixed(1);
  const Y = y => (heightPx - (y - minY) * ppm).toFixed(1); // flip y (screen down)

  const shapes = polys.map(poly => {
    const ptsAttr = (poly.points || []).map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
    return `<polygon points="${ptsAttr}" fill="none" stroke="#26418f" stroke-width="1.5"/>`;
  }).join('\n  ');

  const labels = texts.map(t =>
    `<text x="${X(t.x)}" y="${Y(t.y)}" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">${esc(t.text)}</text>`
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx.toFixed(0)}" height="${heightPx.toFixed(0)}" viewBox="0 0 ${widthPx.toFixed(0)} ${heightPx.toFixed(0)}">
  <rect x="0" y="0" width="${widthPx.toFixed(0)}" height="${heightPx.toFixed(0)}" fill="#ffffff"/>
  ${shapes}
  ${labels}
</svg>`;
}
