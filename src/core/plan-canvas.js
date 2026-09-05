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
 * Detects nearby object snap targets (corners, midpoints, endpoints) or falls back to grid.
 *
 * @param {{x: number, y: number}} point - Candidate world coordinate
 * @param {Array<Object>} entities - Project entities list
 * @param {Object} [options]
 * @param {number} [options.snapDistance=0.20] - Max distance in meters to latch onto an object target
 * @param {boolean} [options.snapGrid=true] - Whether to snap to grid when no object is nearby
 * @param {number} [options.gridMeters=0.5] - Grid increment in meters
 * @param {string} [options.excludeId] - Optional ID of entity being moved/modified
 * @returns {{ x: number, y: number, type: 'corner'|'midpoint'|'endpoint'|'grid'|'none', snapped: boolean, targetId?: string }}
 */
export function findSnapPoint(point, entities = [], options = {}) {
  const snapDist = typeof options.snapDistance === 'number' ? options.snapDistance : 0.20;
  const snapGrid = options.snapGrid !== false;
  const gridMeters = options.gridMeters || 0.5;
  const excludeId = options.excludeId || null;

  let bestHit = null;
  let bestDist = snapDist;

  for (const e of entities) {
    if (!e || e.id === excludeId) continue;

    // Walls
    if (e.kind === 'wall' && typeof e.x1 === 'number') {
      const p1 = { x: e.x1, y: e.y1, type: 'endpoint', targetId: e.id };
      const p2 = { x: e.x2, y: e.y2, type: 'endpoint', targetId: e.id };
      const mid = { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2, type: 'midpoint', targetId: e.id };
      for (const cand of [p1, p2, mid]) {
        const d = Math.hypot(cand.x - point.x, cand.y - point.y);
        if (d < bestDist) {
          bestDist = d;
          bestHit = cand;
        }
      }
    } else if (typeof e.x === 'number' && typeof e.width === 'number') {
      const w = e.width;
      const d = e.depth || e.run || 0;
      const corners = [
        { x: e.x, y: e.y, type: 'corner', targetId: e.id },
        { x: e.x + w, y: e.y, type: 'corner', targetId: e.id },
        { x: e.x + w, y: e.y + d, type: 'corner', targetId: e.id },
        { x: e.x, y: e.y + d, type: 'corner', targetId: e.id }
      ];
      const midpoints = [
        { x: e.x + w / 2, y: e.y, type: 'midpoint', targetId: e.id },
        { x: e.x + w, y: e.y + d / 2, type: 'midpoint', targetId: e.id },
        { x: e.x + w / 2, y: e.y + d, type: 'midpoint', targetId: e.id },
        { x: e.x, y: e.y + d / 2, type: 'midpoint', targetId: e.id }
      ];
      for (const cand of [...corners, ...midpoints]) {
        const dist = Math.hypot(cand.x - point.x, cand.y - point.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestHit = cand;
        }
      }
    }
  }

  if (bestHit) {
    return {
      x: bestHit.x,
      y: bestHit.y,
      type: bestHit.type,
      snapped: true,
      targetId: bestHit.targetId
    };
  }

  if (snapGrid && gridMeters > 0) {
    return {
      x: snapToGrid(point.x, gridMeters),
      y: snapToGrid(point.y, gridMeters),
      type: 'grid',
      snapped: true
    };
  }

  return {
    x: point.x,
    y: point.y,
    type: 'none',
    snapped: false
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
  const clone = JSON.parse(JSON.stringify(entity));
  clone.id = generateEntityId(clone.kind || 'item');
  clone.name = clone.name ? `${clone.name} (Copy)` : 'Copy';
  clone.locked = false;

  if (clone.kind === 'wall' && typeof clone.x1 === 'number') {
    clone.x1 += offset;
    clone.x2 += offset;
    clone.y1 += offset;
    clone.y2 += offset;
  } else if (typeof clone.x === 'number') {
    clone.x += offset;
    clone.y += offset;
  }
  return clone;
}

// ---------------------------------------------------------------------------
// Selection geometry
// ---------------------------------------------------------------------------

/** Returns ids of entities whose rect intersects the selection point/rect. */
export function pickEntities(entities, worldRect) {
  const hits = [];
  for (const e of entities) {
    if (!e) continue;
    // Walls are point-pair entities without x/y — map to their bounding rect
    const r = e.kind === 'wall'
      ? wallRect(e)
      : (typeof e.x === 'number' ? { x: e.x, y: e.y, width: e.width ?? 0, depth: e.depth ?? 0 } : null);
    if (!r) continue;
    if (worldRect.width === 0 && worldRect.depth === 0) {
      // point pick
      if (worldRect.x >= r.x && worldRect.x <= r.x + r.width && worldRect.y >= r.y && worldRect.y <= r.y + r.depth) {
        hits.push(e.id);
      }
    } else if (rectsIntersect(worldRect, r)) {
      hits.push(e.id);
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
    redo() { entity.x += dx; entity.y += dy; },
    undo() { entity.x -= dx; entity.y -= dy; }
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
  const out = { lines: [], polygons: [], texts: [] };
  for (const e of entities || []) {
    if (!e || typeof e !== 'object') continue;
    if (e.kind === 'room' && typeof e.x === 'number' && typeof e.width === 'number' &&
        typeof e.y === 'number' && typeof e.depth === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Room'
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: e.name || 'Room' });
      }
    } else if (e.kind === 'wall' && typeof e.x1 === 'number') {
      // Wall footprint as a closed rectangle (thickness honored)
      const minX = Math.min(e.x1, e.x2) - (e.thickness || 0) / 2;
      const minY = Math.min(e.y1, e.y2) - (e.thickness || 0) / 2;
      const w = Math.abs(e.x2 - e.x1) + (e.thickness || 0);
      const d = Math.abs(e.y2 - e.y1) + (e.thickness || 0);
      out.polygons.push({
        closed: true,
        points: [[minX, minY], [minX + w, minY], [minX + w, minY + d], [minX, minY + d]],
        label: e.name || 'Wall'
      });
    } else if (e.kind === 'furniture' && typeof e.x === 'number' && typeof e.width === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Furniture'
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: e.name || 'Furniture' });
      }
    } else if (e.kind === 'stair' && typeof e.x === 'number' && typeof e.width === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Stair'
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: `${e.name || 'Stair'} (${e.risers || 0}R)` });
      }
    } else if (e.kind === 'ramp' && typeof e.x === 'number' && typeof e.width === 'number') {
      out.polygons.push({
        closed: true,
        points: [[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.depth], [e.x, e.y + e.depth]],
        label: e.name || 'Ramp'
      });
      if (includeLabels) {
        out.texts.push({ x: e.x + e.width / 2, y: e.y + e.depth / 2, text: `${e.name || 'Ramp'} (1:${(e.slopeRatio || 12).toFixed(1)})` });
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
