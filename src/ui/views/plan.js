/**
 * Architecture Helping Hand - Plan Canvas View (Mode 19)
 * Phase 3+4: SVG plan editor over real project geometry. Owns rendering and
 * pointer/keyboard interaction; all geometry math lives in core/plan-canvas.js
 * + core/entities.js. Persistence goes through the project store.
 *
 * Interaction model:
 *   - Tool-based: select/move, room (drag), wall (drag), furniture (click)
 *   - Click = point pick; drag on empty = rubber-band box pick (select tool)
 *   - Arrow keys pan; +/- zoom; Del deletes selection; Ctrl+Z/Y undo/redo
 *   - Undo/redo = command objects over the in-memory entity arrays (never a
 *     blind full-project replacement), bounded history
 */

import {
  createViewTransform, worldToSvg, svgToWorld, zoomAt, panBy,
  buildGrid, snapToGrid, snapRect, pickEntities, wallRect,
  createHistory, entityAddRemoveCommand, entityMoveCommand
} from '../../core/plan-canvas.js';
import {
  createRoom, createWall, createDoor, createWindow,
  placeFurniture, roomArea, wallLength
} from '../../core/entities.js';
import { FURNITURE_DATABASE } from '../../core/furniture.js';
import { getFurniturePlanSVG } from '../visualizer.js';
import { parseInput } from '../../core/parser.js';
import { UNITS } from '../../core/units.js';
import { wrapSVGDocument, createExportProvenance, EXPORT_FORMATS } from '../../core/export/export-model.js';

const PLAN_STATE_KEY = 'archiscale_plan_prefs'; // user preferences only

export function createPlanView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    switchMode, views, projectStore, StorageService, copyToClipboard
  } = context;

  const svg = {
    width: 800, height: 460
  };
  let transform = createViewTransform({});
  let history = createHistory(100);
  let dragState = null; // { mode: 'pan'|'create'|'move', ... }
  let furnitureCatalog = [];
  let catalogById = new Map(); // catalog id -> item (footprint symbols)
  let resizeObserver = null;

  /** Keeps svg.width/height synced to the element's real box so the
   * viewBox always equals the pixel box — pointer mapping then never
   * drifts (QA bug: clicks landed away from the cursor). */
  function syncSvgSize() {
    if (!dom.planSvg) return;
    const rect = dom.planSvg.getBoundingClientRect();
    if (rect.width > 10 && rect.height > 10) {
      svg.width = Math.round(rect.width);
      svg.height = Math.round(rect.height);
    }
  }

  function fitToContent() {
    const es = entities();
    if (es.length === 0) {
      // Sensible default framing: a 12m-wide view centered near origin
      transform = createViewTransform({ zoom: Math.max(20, Math.min(svg.width / 14, 200)) });
      transform.offsetX = svg.width / 2 - 6 * transform.zoom;
      transform.offsetY = svg.height / 2 + 5 * transform.zoom;
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of es) {
      const r = e.kind === 'wall' ? wallRect(e)
        : { x: e.x, y: e.y, width: e.width ?? 0, depth: e.depth ?? 0 };
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width); maxY = Math.max(maxY, r.y + r.depth);
    }
    const wM = Math.max(maxX - minX, 0.5);
    const dM = Math.max(maxY - minY, 0.5);
    const padFactor = 1.25;
    const zoom = Math.min((svg.width / (wM * padFactor)), (svg.height / (dM * padFactor)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    transform = {
      zoom,
      offsetX: svg.width / 2 - cx * zoom,
      offsetY: svg.height / 2 + cy * zoom
    };
  }

  function setZoomPercent(targetZoom) {
    const cx = svg.width / 2;
    const cy = svg.height / 2;
    const world = svgToWorld(transform, cx, cy);
    const zoom = Math.max(4, Math.min(400, targetZoom));
    transform = { zoom, offsetX: cx - world.x * zoom, offsetY: cy + world.y * zoom };
    savePrefs();
    render();
  }

  /** Zoom in/out by a multiplicative factor around the view center. */
  function zoomStep(factor) {
    setZoomPercent(transform.zoom * factor);
  }

  function entities() { return state.plan.entities; }

  function savePrefs() {
    try {
      StorageService.setItem(PLAN_STATE_KEY, JSON.stringify({
        tool: state.plan.tool,
        grid: state.plan.grid,
        zoom: transform.zoom
      }));
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      const raw = StorageService.getItem(PLAN_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function render() {
    if (!dom.planSvg) return;
    syncSvgSize();
    dom.planSvg.setAttribute('viewBox', `0 0 ${svg.width} ${svg.height}`);
    const gridLines = buildGrid(transform, svg.width, svg.height, state.plan.grid, 4)
      .map(l => {
        const major = l.major ? 'var(--border-color, #666)' : 'var(--border-color-light, #333)';
        const sw = l.major ? 1 : 0.5;
        if (l.axis === 'x') {
          const p = worldToSvg(transform, l.world, 0);
          return `<line x1="${p.x.toFixed(1)}" y1="0" x2="${p.x.toFixed(1)}" y2="${svg.height}" stroke="${major}" stroke-width="${sw}"/>`;
        }
        const p = worldToSvg(transform, 0, l.world);
        return `<line x1="0" y1="${p.y.toFixed(1)}" x2="${svg.width}" y2="${p.y.toFixed(1)}" stroke="${major}" stroke-width="${sw}"/>`;
      })
      .join('');

    const entityMarkup = entities().map(e => {
      const selected = state.plan.selectedIds.has(e.id);
      const stroke = selected ? 'var(--color-warning, #fbbf24)' : 'var(--accent-primary, #7aa2ff)';
      // Imported project documents are envelope-validated only — skip entities
      // whose geometry is not numeric rather than crashing the whole canvas.
      const isNum = v => typeof v === 'number' && isFinite(v);
      const hasRect = isNum(e.x) && isNum(e.y) && isNum(e.width) && isNum(e.depth);
      if (e.kind === 'room' && hasRect) {
        const p1 = worldToSvg(transform, e.x, e.y + e.depth);   // bottom-left
        const p2 = worldToSvg(transform, e.x + e.width, e.y);   // top-right
        const labelPos = worldToSvg(transform, e.x + e.width / 2, e.y + e.depth / 2);
        return `<g>
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${((p2.x - p1.x)).toFixed(1)}" height="${((p1.y - p2.y)).toFixed(1)}"
            fill="var(--bg-chip, rgba(122,162,255,0.08))" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.6}" data-entity-id="${escapeHtml(e.id)}" class="plan-entity"/>
          <text x="${labelPos.x.toFixed(1)}" y="${labelPos.y.toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--text-secondary,#9aa)" font-family="var(--font-family-mono,monospace)">${escapeHtml(e.name)} · ${roomArea(e).toFixed(1)}m²</text>
        </g>`;
      }
      if (e.kind === 'wall' && isNum(e.x1) && isNum(e.y1) && isNum(e.x2) && isNum(e.y2)) {
        const a = worldToSvg(transform, e.x1, e.y1);
        const b = worldToSvg(transform, e.x2, e.y2);
        const thickness = isNum(e.thickness) ? e.thickness : 0.2;
        return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
          stroke="${stroke}" stroke-width="${Math.max(3, thickness * transform.zoom)}" stroke-linecap="square"
          data-entity-id="${escapeHtml(e.id)}" class="plan-entity"/>`;
      }
      if (e.kind === 'furniture' && hasRect) {
        const p1 = worldToSvg(transform, e.x, e.y + e.depth);
        const p2 = worldToSvg(transform, e.x + e.width, e.y);
        const labelPos = worldToSvg(transform, e.x + e.width / 2, e.y + e.depth / 2);
        // Recognizable footprint symbol: reuse the catalog's plan drawing
        // (same shapes as the Furniture tool) scaled into the footprint box.
        const item = catalogById.get(e.catalogId);
        // NOTE: p1.y is the BOTTOM edge (larger SVG y) and p2.y the top, so the
        // raw difference is negative — Math.abs is required. This was the
        // historical "furniture renders as a 4px sliver" bug (Math.max kept
        // the clamp value, shrinking every footprint to a thin strip).
        const wPx = Math.max(Math.abs(p2.x - p1.x), 4);
        const hPx = Math.max(Math.abs(p1.y - p2.y), 4);
        let symbol = '';
        if (item && wPx > 14 && hPx > 14) {
          const shapeSvg = getFurniturePlanSVG(item);
          const shapeRaw = shapeSvg
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>/, '');
          const vbM = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(shapeSvg) || [];
          symbol = `<svg x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}"
            viewBox="0 0 ${vbM[1] || 100} ${vbM[2] || 100}" preserveAspectRatio="xMidYMid meet" style="color: var(--color-success,#4ade80); opacity: 0.9; pointer-events: none;">${shapeRaw}</svg>`;
        }
        return `<g>
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}"
            fill="rgba(74,222,128,0.10)" stroke="${stroke}" stroke-width="${selected ? 2 : 1.2}" data-entity-id="${escapeHtml(e.id)}" class="plan-entity"/>
          ${symbol}
          <text x="${labelPos.x.toFixed(1)}" y="${(p1.y + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text-muted,#889)" font-family="var(--font-family-mono,monospace)">${escapeHtml(e.name)}</text>
        </g>`;
      }
      return '';
    }).join('');

    // Rubber-band rectangle while creating
    let dragMarkup = '';
    if (dragState && dragState.mode === 'create' && dragState.current) {
      const a = worldToSvg(transform, Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.y, dragState.current.y));
      const b = worldToSvg(transform, Math.max(dragState.start.x, dragState.current.x), Math.min(dragState.start.y, dragState.current.y));
      dragMarkup = `<rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${(b.x - a.x).toFixed(1)}" height="${(a.y - b.y).toFixed(1)}"
        fill="none" stroke="var(--color-warning,#fbbf24)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    }

    dom.planSvg.innerHTML = `
      <g class="plan-grid">${gridLines}</g>
      <g class="plan-entities">${entityMarkup}</g>
      ${dragMarkup}`;

    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `zoom ${transform.zoom.toFixed(0)} px/m · ${entities().length} entities`;
    }
    renderEntityList();
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderEntityList() {
    if (!dom.planEntityList) return;
    if (entities().length === 0) {
      dom.planEntityList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Empty plan — pick a tool and draw on the canvas.</div>';
      return;
    }
    dom.planEntityList.innerHTML = entities().map(e => {
      const selected = state.plan.selectedIds.has(e.id);
      // Imported project documents are envelope-validated only — individual
      // entity fields may be garbage. Render honestly instead of crashing.
      const num = v => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : '?');
      let desc;
      if (e.kind === 'room') desc = `${num(e.width)} × ${num(e.depth)} m · ${typeof e.width === 'number' && typeof e.depth === 'number' ? roomArea(e).toFixed(2) : '?'} m²`;
      else if (e.kind === 'wall') desc = `${typeof e.x1 === 'number' && typeof e.x2 === 'number' ? wallLength(e).toFixed(2) : '?'} m · ${num(e.thickness)} m thick`;
      else desc = `${num(e.width)} × ${num(e.depth)} m`;
      return `<div class="plan-entity-row" data-id="${escapeHtml(e.id)}" style="display: flex; justify-content: space-between; padding: 0.35rem 0.55rem; border: 1px solid var(--border-color-light); border-radius: 4px; cursor: pointer; font-family: var(--font-family-mono); font-size: 0.74rem; ${selected ? 'background: var(--bg-chip);' : ''}">
        <span><strong style="color: var(--accent-primary);">${escapeHtml(e.name)}</strong> <span style="color: var(--text-muted);">${escapeHtml(e.kind)}</span></span>
        <span style="color: var(--text-secondary);">${desc}</span>
      </div>`;
    }).join('');

    dom.planEntityList.querySelectorAll('.plan-entity-row').forEach(row => {
      row.addEventListener('click', () => {
        state.plan.selectedIds = new Set([row.dataset.id]);
        render();
      });
    });
  }

  // ------------------------------------------------------------------
  // Pointer interaction
  // ------------------------------------------------------------------
  function svgPoint(event) {
    // CRITICAL: the viewBox is kept identical to the element's pixel box
    // (syncSvgSize on mount + resize), so screen offset == SVG coordinates
    // and this mapping is exact. Previously the viewBox stayed 800×460 while
    // the element rendered wider, so every click landed away from the cursor.
    const rect = dom.planSvg.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    return svgToWorld(transform, sx, sy);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    // Middle mouse or space-held drag pans regardless of active tool
    if (event.button === 1 || isPanHotkey()) {
      event.preventDefault();
      dragState = { mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startTransform: { ...transform } };
      return;
    }
    const world = svgPoint(event);
    const snapped = { x: snapToGrid(world.x, state.plan.grid), y: snapToGrid(world.y, state.plan.grid) };
    const tool = state.plan.tool;

    if (tool === 'select') {
      const hit = pickEntities(entities(), { x: world.x, y: world.y, width: 0, depth: 0 });
      if (hit.length > 0) {
        state.plan.selectedIds = new Set([hit[hit.length - 1]]);
        const e = entities().find(x => x.id === hit[hit.length - 1]);
        dragState = { mode: 'move', entity: e, start: snapped, last: snapped };
      } else {
        state.plan.selectedIds = new Set();
        dragState = { mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startTransform: { ...transform } };
      }
      render();
    } else if (tool === 'room' || tool === 'wall') {
      dragState = { mode: 'create', start: snapped, current: snapped };
    } else if (tool === 'furniture') {
      dropFurniture(snapped);
    }
  }

  let spaceHeld = false;
  function isPanHotkey() {
    return spaceHeld;
  }

  function onPointerMove(event) {
    if (!dragState) return;
    if (dragState.mode === 'pan') {
      const dx = event.clientX - dragState.startClient.x;
      const dy = event.clientY - dragState.startClient.y;
      transform = panBy(dragState.startTransform, dx, dy);
      render();
      return;
    }
    const world = svgPoint(event);
    const snapped = { x: snapToGrid(world.x, state.plan.grid), y: snapToGrid(world.y, state.plan.grid) };
    if (dragState.mode === 'create') {
      dragState.current = snapped;
      render();
    } else if (dragState.mode === 'move' && dragState.entity) {
      const dx = snapped.x - dragState.last.x;
      const dy = snapped.y - dragState.last.y;
      if (dx !== 0 || dy !== 0) {
        dragState.entity.x += dx;
        dragState.entity.y += dy;
        dragState.last = snapped;
        render();
      }
    }
  }

  function onPointerUp(event) {
    if (!dragState) return;
    if (dragState.mode === 'create') {
      const start = dragState.start;
      const end = { x: snapToGrid(svgPoint(event).x, state.plan.grid), y: snapToGrid(svgPoint(event).y, state.plan.grid) };
      if (state.plan.tool === 'room') {
        createRoomEntity(start, end);
      } else if (state.plan.tool === 'wall') {
        createWallEntity(start, end);
      }
    } else if (dragState.mode === 'move' && dragState.entity) {
      const dx = dragState.last.x - dragState.start.x;
      const dy = dragState.last.y - dragState.start.y;
      if (dx !== 0 || dy !== 0) {
        const cmd = entityMoveCommand(dragState.entity, dx, dy, `move ${dragState.entity.name}`);
        // The move already happened incrementally; record net for undo
        cmd.redo = () => { dragState.entity.x += dx; dragState.entity.y += dy; };
        cmd.undo = () => { dragState.entity.x -= dx; dragState.entity.y -= dy; };
        history.push(cmd);
      }
    }
    dragState = null;
    render();
  }

  function createRoomEntity(start, end) {
    const width = Math.abs(end.x - start.x);
    const depth = Math.abs(end.y - start.y);
    if (width < state.plan.grid || depth < state.plan.grid) {
      showToast('Room too small — drag a larger rectangle', 'warning');
      return;
    }
    let room;
    try {
      room = createRoom({
        name: `Room ${entities().filter(e => e.kind === 'room').length + 1}`,
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width, depth
      });
    } catch (e) {
      showToast(e.message, 'warning');
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), room, `add room ${room.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([room.id]);
    showToast(`Room added: ${width.toFixed(2)} × ${depth.toFixed(2)} m (${roomArea(room).toFixed(2)} m²)`);
    AudioService.playTick();
  }

  function createWallEntity(start, end) {
    let wall;
    try {
      wall = createWall({
        name: `Wall ${entities().filter(e => e.kind === 'wall').length + 1}`,
        x1: start.x, y1: start.y, x2: end.x, y2: end.y,
        thickness: 0.2
      });
    } catch (e) {
      showError(e.message);
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), wall, `add wall ${wall.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([wall.id]);
    showToast(`Wall added: ${wallLength(wall).toFixed(2)} m`);
    AudioService.playTick();
  }

  function dropFurniture(snapped) {
    const item = furnitureCatalog[state.plan.furnitureIndex || 0];
    if (!item) {
      showToast('Select a furniture piece first', 'warning');
      return;
    }
    let placed;
    try {
      placed = placeFurniture({
        catalogId: item.id,
        displayName: item.name,
        wCm: item.wCm,
        dCm: item.dCm,
        x: snapped.x,
        y: snapped.y,
        rotated: state.plan.furnitureRotated || false
      });
    } catch (e) {
      showToast(e.message, 'warning');
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), placed, `place ${placed.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([placed.id]);
    showToast(`${item.name} placed (${placed.width.toFixed(2)} × ${placed.depth.toFixed(2)} m)`);
    AudioService.playTick();
    render();
  }

  function showError(message) {
    if (dom.planErrorMsg) {
      dom.planErrorMsg.textContent = `⚠️ ${message}`;
      dom.planErrorMsg.style.display = 'block';
    }
  }

  // ------------------------------------------------------------------
  // Commands (buttons)
  // ------------------------------------------------------------------
  function undo() {
    const label = history.undo();
    if (label) showToast(`Undo: ${label}`);
    else showToast('Nothing to undo', 'warning');
    render();
  }

  function redo() {
    const label = history.redo();
    if (label) showToast(`Redo: ${label}`);
    else showToast('Nothing to redo', 'warning');
    render();
  }

  function deleteSelected() {
    if (state.plan.selectedIds.size === 0) {
      showToast('Nothing selected', 'warning');
      return;
    }
    for (const id of state.plan.selectedIds) {
      const e = entities().find(x => x.id === id);
      if (!e) continue;
      const cmd = entityAddRemoveCommand(entities(), e, `delete ${e.name}`);
      cmd.undo(); // remove now
      history.push(cmd);
    }
    state.plan.selectedIds = new Set();
    showToast('Selection deleted (undo available)');
    render();
  }

  function clearPlan() {
    if (entities().length === 0) return;
    if (!window.confirm('Remove all entities from the plan? (Undo clears the history too.)')) return;
    entities().length = 0;
    history.clear();
    state.plan.selectedIds = new Set();
    render();
  }

  // ------------------------------------------------------------------
  // Persistence (project data via the store)
  // ------------------------------------------------------------------
  function saveToProject() {
    if (!projectStore) {
      showToast('Project store unavailable', 'warning');
      return;
    }
    // Deep-copy entities into the project document (plain data, ids preserved)
    const copy = JSON.parse(JSON.stringify(entities()));
    const res = projectStore.updateProject(draft => {
      draft.plan = { entities: copy, savedAt: new Date().toISOString() };
      return draft;
    });
    if (res.ok) {
      showToast(`Plan saved to project (${copy.length} entities)`);
      AudioService.playSuccess();
    } else {
      showToast(`Save failed: ${res.errors[0]}`, 'warning');
    }
  }

  function loadFromProject() {
    const p = projectStore?.getProject();
    if (p && p.plan && Array.isArray(p.plan.entities)) {
      entities().length = 0;
      entities().push(...JSON.parse(JSON.stringify(p.plan.entities)));
      history.clear();
      showToast(`Plan restored from project (${entities().length} entities)`);
      render();
    }
  }

  function exportPlan(format) {
    if (entities().length === 0) {
      showToast('Nothing to export — the plan is empty', 'warning');
      return;
    }
    switchMode('export');
    // Route the export center to the plan geometry source for SVG/DXF
    if (dom.exportDiagramSelect) dom.exportDiagramSelect.value = 'plan';
    if (dom.exportSourceSelect) dom.exportSourceSelect.value = 'project';
    if (format) {
      views.callController('export', 'build', true);
      showToast(`Export Center opened with the plan as ${String(format).toUpperCase()}`);
    } else {
      views.callController('export', 'build');
    }
  }

  // ------------------------------------------------------------------
  // Furniture catalog dropdown
  // ------------------------------------------------------------------
  function populateFurniture() {
    if (!dom.planFurnitureSelect) return;
    // Full catalog, grouped by category — the plan canvas should offer the
    // same breadth as the Furniture tool, not a 60-item slice.
    furnitureCatalog = FURNITURE_DATABASE.filter(f => f.wCm && f.dCm);
    catalogById = new Map(furnitureCatalog.map(item => [item.id, item]));
    const byCat = new Map();
    for (const item of furnitureCatalog) {
      if (!byCat.has(item.category)) byCat.set(item.category, []);
      byCat.get(item.category).push(item);
    }
    const CAT_LABELS = {
      living: 'Living Room', bedroom: 'Bedroom', dining: 'Dining', kitchen: 'Kitchen',
      bathroom: 'Bathroom & Sanitary', office: 'Office', doors: 'Doors & Circulation',
      outdoor: 'Outdoor & Site', commercial: 'Commercial, Retail & Fitness'
    };
    let optHtml = '';
    for (const [cat, items] of byCat) {
      optHtml += `<optgroup label="${escapeHtml(CAT_LABELS[cat] || cat)}">`;
      for (const item of items) {
        optHtml += `<option value="${item.id}">${escapeHtml(item.name)} (${item.wCm}×${item.dCm} cm)</option>`;
      }
      optHtml += '</optgroup>';
    }
    dom.planFurnitureSelect.innerHTML = optHtml;
    // Keep selection stable by catalog id (index-based selection broke when
    // the filtered list changed between sessions).
    const savedId = state.plan.furnitureCatalogId;
    if (savedId && catalogById.has(savedId)) {
      dom.planFurnitureSelect.value = savedId;
    } else {
      dom.planFurnitureSelect.value = furnitureCatalog[0]?.id || '';
      state.plan.furnitureCatalogId = furnitureCatalog[0]?.id;
    }
    state.plan.furnitureIndex = furnitureCatalog.findIndex(f => f.id === dom.planFurnitureSelect.value);
    dom.planFurnitureSelect.addEventListener('change', () => {
      state.plan.furnitureCatalogId = dom.planFurnitureSelect.value;
      state.plan.furnitureIndex = furnitureCatalog.findIndex(f => f.id === dom.planFurnitureSelect.value);
    });
  }

  // ------------------------------------------------------------------
  // Keyboard
  // ------------------------------------------------------------------
  function onKeyDown(event) {
    if (state.currentMode !== 'plan') return;
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');
    if (isInput) {
      if (event.key === ' ' && activeEl.tagName !== 'TEXTAREA') return; // inputs keep native space
      return;
    }

    if (event.key === ' ') {
      spaceHeld = true; // hold space + drag = pan (CAD convention)
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (state.plan.selectedIds.size > 0) {
        event.preventDefault();
        deleteSelected();
      }
    } else if (event.key === 'Escape') {
      state.plan.selectedIds = new Set();
      render();
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const step = event.shiftKey ? 40 : 10;
      if (event.key === 'ArrowLeft') transform = panBy(transform, step, 0);
      else if (event.key === 'ArrowRight') transform = panBy(transform, -step, 0);
      else if (event.key === 'ArrowUp') transform = panBy(transform, 0, step);
      else transform = panBy(transform, 0, -step);
      render();
    } else if (event.key === '+' || event.key === '=') {
      transform = zoomAt(transform, 1.25, svg.width / 2, svg.height / 2);
      render();
    } else if (event.key === '-') {
      transform = zoomAt(transform, 0.8, svg.width / 2, svg.height / 2);
      render();
    }
  }

  function onKeyUp(event) {
    if (event.key === ' ') spaceHeld = false;
  }

  function syncToolVisibility() {
    if (dom.planFurnitureGroup) {
      dom.planFurnitureGroup.style.display = state.plan.tool === 'furniture' ? 'block' : 'none';
    }
  }

  return {
    id: 'plan',
    mount() {
      const prefs = loadPrefs();
      if (prefs.tool) state.plan.tool = prefs.tool;
      if (prefs.grid) state.plan.grid = prefs.grid;
      if (prefs.zoom) transform.zoom = prefs.zoom;
      if (dom.planToolSelect) dom.planToolSelect.value = state.plan.tool;
      if (dom.planGridSelect) dom.planGridSelect.value = String(state.plan.grid);
      populateFurniture();
      syncToolVisibility();
      loadFromProject();

      // Size the SVG to its real element box BEFORE the first render so the
      // viewBox always matches the pixel box (exact pointer mapping).
      syncSvgSize();
      if (dom.planSvg && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          const before = { w: svg.width, h: svg.height };
          syncSvgSize();
          if (svg.width !== before.w || svg.height !== before.h) render();
        });
        resizeObserver.observe(dom.planSvg);
      }
      render();

      if (dom.planSvg) {
        dom.planSvg.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        dom.planSvg.addEventListener('wheel', (e) => {
          e.preventDefault();
          const rect = dom.planSvg.getBoundingClientRect();
          transform = zoomAt(transform, e.deltaY < 0 ? 1.15 : 0.87, e.clientX - rect.left, e.clientY - rect.top);
          render();
        }, { passive: false });
      }
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);

      // First visit this session: frame the view at a useful zoom
      if (!prefs.zoom && entities().length > 0) fitToContent();
    },
    getController() {
      return {
        render, undo, redo, deleteSelected, clearPlan, saveToProject, exportPlan,
        syncToolVisibility, fitToContent, setZoomPercent, zoomStep, syncSvgSize
      };
    }
  };
}
