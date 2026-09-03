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

import { rectsIntersect } from './entities.js';

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
