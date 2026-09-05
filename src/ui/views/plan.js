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
  placeFurniture, createStairEntity, createRampEntity,
  roomArea, wallLength, roomPerimeter, roomAspectRatio,
  wallDirection, openingFitsWall, generateEntityId
} from '../../core/entities.js';
import { checkFurnitureFit, checkClearance, checkOverlaps } from '../../core/space-planning.js';
import { FURNITURE_DATABASE } from '../../core/furniture.js';
import { getFurniturePlanSVG } from '../visualizer.js';
import { parseInput } from '../../core/parser.js';
import { UNITS } from '../../core/units.js';
import { wrapSVGDocument, createExportProvenance, EXPORT_FORMATS } from '../../core/export/export-model.js';
import { attachNumericScrubber } from '../scrubber.js';

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

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderHandles() {
    const selectedId = Array.from(state.plan.selectedIds || [])[0];
    if (!selectedId || state.plan.selectedIds.size !== 1) return '';
    const e = entities().find(x => x.id === selectedId);
    if (!e) return '';

    const isNum = v => typeof v === 'number' && isFinite(v);
    const stroke = 'var(--accent-primary, #4989D9)';
    const fill = '#ffffff';

    if ((e.kind === 'room' || e.kind === 'furniture' || e.kind === 'stair' || e.kind === 'ramp') &&
        isNum(e.x) && isNum(e.y) && isNum(e.width) && isNum(e.depth)) {
      const sw = worldToSvg(transform, e.x, e.y);
      const se = worldToSvg(transform, e.x + e.width, e.y);
      const ne = worldToSvg(transform, e.x + e.width, e.y + e.depth);
      const nw = worldToSvg(transform, e.x, e.y + e.depth);

      const s = worldToSvg(transform, e.x + e.width / 2, e.y);
      const n = worldToSvg(transform, e.x + e.width / 2, e.y + e.depth);
      const ePt = worldToSvg(transform, e.x + e.width, e.y + e.depth / 2);
      const wPt = worldToSvg(transform, e.x, e.y + e.depth / 2);

      const size = 8;
      const half = size / 2;

      const mkSq = (pt, type, cursor) => `
        <rect x="${(pt.x - half).toFixed(1)}" y="${(pt.y - half).toFixed(1)}" width="${size}" height="${size}"
          fill="${fill}" stroke="${stroke}" stroke-width="1.8" class="plan-handle" data-handle="${type}" data-entity-id="${escapeHtml(e.id)}"
          style="cursor: ${cursor}; pointer-events: all;"/>`;

      let handles = `
        ${mkSq(nw, 'nw', 'nwse-resize')}
        ${mkSq(n,  'n',  'ns-resize')}
        ${mkSq(ne, 'ne', 'nesw-resize')}
        ${mkSq(ePt,'e',  'ew-resize')}
        ${mkSq(se, 'se', 'nwse-resize')}
        ${mkSq(s,  's',  'ns-resize')}
        ${mkSq(sw, 'sw', 'nesw-resize')}
        ${mkSq(wPt,'w',  'ew-resize')}`;

      if (e.kind === 'furniture') {
        const rotY = n.y - 20;
        handles += `
          <line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${rotY.toFixed(1)}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="2 2"/>
          <circle cx="${n.x.toFixed(1)}" cy="${rotY.toFixed(1)}" r="5.5" fill="var(--accent-action, #D32F2F)" stroke="#ffffff" stroke-width="1.5"
            class="plan-handle" data-handle="rotate" data-entity-id="${escapeHtml(e.id)}" style="cursor: grab; pointer-events: all;">
            <title>Click to rotate 90°</title>
          </circle>`;
      }
      return `<g class="plan-handles">${handles}</g>`;
    }

    if (e.kind === 'wall' && isNum(e.x1) && isNum(e.y1) && isNum(e.x2) && isNum(e.y2)) {
      const p1 = worldToSvg(transform, e.x1, e.y1);
      const p2 = worldToSvg(transform, e.x2, e.y2);
      return `<g class="plan-handles">
        <circle cx="${p1.x.toFixed(1)}" cy="${p1.y.toFixed(1)}" r="6" fill="${fill}" stroke="${stroke}" stroke-width="2"
          class="plan-handle" data-handle="p1" data-entity-id="${escapeHtml(e.id)}" style="cursor: crosshair; pointer-events: all;">
          <title>Drag wall start point</title>
        </circle>
        <circle cx="${p2.x.toFixed(1)}" cy="${p2.y.toFixed(1)}" r="6" fill="${fill}" stroke="${stroke}" stroke-width="2"
          class="plan-handle" data-handle="p2" data-entity-id="${escapeHtml(e.id)}" style="cursor: crosshair; pointer-events: all;">
          <title>Drag wall end point</title>
        </circle>
      </g>`;
    }

    if (e.kind === 'dimension' && isNum(e.x1) && isNum(e.y1) && isNum(e.x2) && isNum(e.y2)) {
      const p1 = worldToSvg(transform, e.x1, e.y1);
      const p2 = worldToSvg(transform, e.x2, e.y2);
      return `<g class="plan-handles">
        <circle cx="${p1.x.toFixed(1)}" cy="${p1.y.toFixed(1)}" r="5.5" fill="${fill}" stroke="var(--note-number, #4989D9)" stroke-width="2"
          class="plan-handle" data-handle="p1" data-entity-id="${escapeHtml(e.id)}" style="cursor: crosshair; pointer-events: all;">
          <title>Drag dimension anchor 1</title>
        </circle>
        <circle cx="${p2.x.toFixed(1)}" cy="${p2.y.toFixed(1)}" r="5.5" fill="${fill}" stroke="var(--note-number, #4989D9)" stroke-width="2"
          class="plan-handle" data-handle="p2" data-entity-id="${escapeHtml(e.id)}" style="cursor: crosshair; pointer-events: all;">
          <title>Drag dimension anchor 2</title>
        </circle>
      </g>`;
    }

    return '';
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
      const isNum = v => typeof v === 'number' && isFinite(v);
      const hasRect = isNum(e.x) && isNum(e.y) && isNum(e.width) && isNum(e.depth);

      if (e.kind === 'room' && hasRect) {
        const p1 = worldToSvg(transform, e.x, e.y + e.depth);   // bottom-left
        const p2 = worldToSvg(transform, e.x + e.width, e.y);   // top-right
        const labelPos = worldToSvg(transform, e.x + e.width / 2, e.y + e.depth / 2);
        return `<g>
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${((p2.x - p1.x)).toFixed(1)}" height="${((p1.y - p2.y)).toFixed(1)}"
            fill="var(--bg-chip, rgba(122,162,255,0.08))" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.6}" data-entity-id="${escapeHtml(e.id)}" class="plan-entity"/>
          <text x="${labelPos.x.toFixed(1)}" y="${labelPos.y.toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">${escapeHtml(e.name)} · ${roomArea(e).toFixed(1)}m²</text>
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
        const item = catalogById.get(e.catalogId);
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
          <text x="${labelPos.x.toFixed(1)}" y="${(p1.y + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text-muted,#889)" font-family="var(--font-mono)">${escapeHtml(e.name)}</text>
        </g>`;
      }
      if (e.kind === 'door') {
        const w = entities().find(x => x.id === e.wallId);
        if (w && typeof w.x1 === 'number') {
          const len = wallLength(w);
          const t = len > 0 ? (e.position / len) : 0;
          const wx = w.x1 + t * (w.x2 - w.x1);
          const wy = w.y1 + t * (w.y2 - w.y1);
          const p = worldToSvg(transform, wx, wy);
          const doorR = (e.width || 0.9) * transform.zoom;
          return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--color-warning, #fbbf24)"/>
            <path d="M ${p.x.toFixed(1)} ${p.y.toFixed(1)} A ${doorR.toFixed(1)} ${doorR.toFixed(1)} 0 0 1 ${(p.x + doorR).toFixed(1)} ${(p.y - doorR).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}" stroke-dasharray="3 2"/>
            <line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${(p.x + doorR).toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 3 : 2}"/>
          </g>`;
        }
      }
      if (e.kind === 'window') {
        const w = entities().find(x => x.id === e.wallId);
        if (w && typeof w.x1 === 'number') {
          const len = wallLength(w);
          const t1 = len > 0 ? (e.position / len) : 0;
          const t2 = len > 0 ? (Math.min(len, e.position + (e.width || 1.2)) / len) : 0;
          const p1 = worldToSvg(transform, w.x1 + t1 * (w.x2 - w.x1), w.y1 + t1 * (w.y2 - w.y1));
          const p2 = worldToSvg(transform, w.x1 + t2 * (w.x2 - w.x1), w.y1 + t2 * (w.y2 - w.y1));
          return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
            <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="var(--bg-app, #121214)" stroke-width="6"/>
            <line x1="${p1.x.toFixed(1)}" y1="${(p1.y - 2).toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${(p2.y - 2).toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.8}"/>
            <line x1="${p1.x.toFixed(1)}" y1="${(p1.y + 2).toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${(p2.y + 2).toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.8}"/>
          </g>`;
        }
      }
      if (e.kind === 'dimension' && typeof e.x1 === 'number' && typeof e.x2 === 'number') {
        const p1 = worldToSvg(transform, e.x1, e.y1);
        const p2 = worldToSvg(transform, e.x2, e.y2);
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const dist = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2 : 1.2}"/>
          <circle cx="${p1.x.toFixed(1)}" cy="${p1.y.toFixed(1)}" r="2.5" fill="${stroke}"/>
          <circle cx="${p2.x.toFixed(1)}" cy="${p2.y.toFixed(1)}" r="2.5" fill="${stroke}"/>
          <rect x="${(mid.x - 22).toFixed(1)}" y="${(mid.y - 14).toFixed(1)}" width="44" height="15" rx="3" fill="var(--bg-surface-elevated, #28292e)" stroke="${stroke}" stroke-width="0.8"/>
          <text x="${mid.x.toFixed(1)}" y="${(mid.y - 3).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)" font-weight="700">${dist.toFixed(2)}m</text>
        </g>`;
      }
      if (e.kind === 'stair' && hasRect) {
        const p1 = worldToSvg(transform, e.x, e.y + e.depth);
        const p2 = worldToSvg(transform, e.x + e.width, e.y);
        const wPx = Math.max(Math.abs(p2.x - p1.x), 6);
        const hPx = Math.max(Math.abs(p1.y - p2.y), 6);
        const risers = Math.max(2, e.risers || 16);
        const isVertical = (e.depth || 0) >= (e.width || 0);
        let treadLines = '';
        for (let i = 1; i < risers; i++) {
          if (isVertical) {
            const stepY = p2.y + (i / risers) * hPx;
            treadLines += `<line x1="${p1.x.toFixed(1)}" y1="${stepY.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${stepY.toFixed(1)}" stroke="${stroke}" stroke-width="0.8" opacity="0.65"/>`;
          } else {
            const stepX = p1.x + (i / risers) * wPx;
            treadLines += `<line x1="${stepX.toFixed(1)}" y1="${p2.y.toFixed(1)}" x2="${stepX.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="${stroke}" stroke-width="0.8" opacity="0.65"/>`;
          }
        }
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const arrow = isVertical
          ? `<line x1="${midX.toFixed(1)}" y1="${(p1.y - 4).toFixed(1)}" x2="${midX.toFixed(1)}" y2="${(p2.y + 12).toFixed(1)}" stroke="var(--note-number, #4989D9)" stroke-width="1.8"/>
             <polygon points="${midX.toFixed(1)},${(p2.y + 3).toFixed(1)} ${(midX - 4).toFixed(1)},${(p2.y + 12).toFixed(1)} ${(midX + 4).toFixed(1)},${(p2.y + 12).toFixed(1)}" fill="var(--note-number, #4989D9)"/>
             <circle cx="${midX.toFixed(1)}" cy="${(p1.y - 4).toFixed(1)}" r="2.5" fill="var(--note-number, #4989D9)"/>
             <text x="${(midX + 8).toFixed(1)}" y="${midY.toFixed(1)}" font-size="9" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)" font-weight="700">UP</text>`
          : `<line x1="${(p1.x + 4).toFixed(1)}" y1="${midY.toFixed(1)}" x2="${(p2.x - 12).toFixed(1)}" y2="${midY.toFixed(1)}" stroke="var(--note-number, #4989D9)" stroke-width="1.8"/>
             <polygon points="${(p2.x - 3).toFixed(1)},${midY.toFixed(1)} ${(p2.x - 12).toFixed(1)},${(midY - 4).toFixed(1)} ${(p2.x - 12).toFixed(1)},${(midY + 4).toFixed(1)}" fill="var(--note-number, #4989D9)"/>
             <circle cx="${(p1.x + 4).toFixed(1)}" cy="${midY.toFixed(1)}" r="2.5" fill="var(--note-number, #4989D9)"/>
             <text x="${midX.toFixed(1)}" y="${(midY - 6).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)" font-weight="700">UP</text>`;
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}"
            fill="rgba(73, 137, 217, 0.10)" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}"/>
          ${treadLines}
          ${arrow}
          <text x="${midX.toFixed(1)}" y="${(p1.y + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">${escapeHtml(e.name)} · ${risers}R</text>
        </g>`;
      }
      if (e.kind === 'ramp' && hasRect) {
        const p1 = worldToSvg(transform, e.x, e.y + e.depth);
        const p2 = worldToSvg(transform, e.x + e.width, e.y);
        const wPx = Math.max(Math.abs(p2.x - p1.x), 6);
        const hPx = Math.max(Math.abs(p1.y - p2.y), 6);
        const isVertical = (e.depth || 0) >= (e.width || 0);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const arrow = isVertical
          ? `<line x1="${midX.toFixed(1)}" y1="${(p1.y - 6).toFixed(1)}" x2="${midX.toFixed(1)}" y2="${(p2.y + 14).toFixed(1)}" stroke="var(--accent-action, #D32F2F)" stroke-width="2"/>
             <polygon points="${midX.toFixed(1)},${(p2.y + 5).toFixed(1)} ${(midX - 5).toFixed(1)},${(p2.y + 15).toFixed(1)} ${(midX + 5).toFixed(1)},${(p2.y + 15).toFixed(1)}" fill="var(--accent-action, #D32F2F)"/>
             <circle cx="${midX.toFixed(1)}" cy="${(p1.y - 6).toFixed(1)}" r="3" fill="var(--accent-action, #D32F2F)"/>
             <text x="${(midX + 8).toFixed(1)}" y="${midY.toFixed(1)}" font-size="9" font-family="var(--font-mono)" fill="var(--accent-action, #D32F2F)" font-weight="700">1:${(e.slopeRatio || 12).toFixed(1)}</text>`
          : `<line x1="${(p1.x + 6).toFixed(1)}" y1="${midY.toFixed(1)}" x2="${(p2.x - 14).toFixed(1)}" y2="${midY.toFixed(1)}" stroke="var(--accent-action, #D32F2F)" stroke-width="2"/>
             <polygon points="${(p2.x - 5).toFixed(1)},${midY.toFixed(1)} ${(p2.x - 15).toFixed(1)},${(midY - 5).toFixed(1)} ${(p2.x - 15).toFixed(1)},${(midY + 5).toFixed(1)}" fill="var(--accent-action, #D32F2F)"/>
             <circle cx="${(p1.x + 6).toFixed(1)}" cy="${midY.toFixed(1)}" r="3" fill="var(--accent-action, #D32F2F)"/>
             <text x="${midX.toFixed(1)}" y="${(midY - 6).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--accent-action, #D32F2F)" font-weight="700">1:${(e.slopeRatio || 12).toFixed(1)}</text>`;
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}"
            fill="rgba(211, 47, 47, 0.08)" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}" stroke-dasharray="4 2"/>
          ${arrow}
          <text x="${midX.toFixed(1)}" y="${(p1.y + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">${escapeHtml(e.name)} · ${(e.slopePercent || 8.33).toFixed(1)}%</text>
        </g>`;
      }
      if (e.kind === 'text' && typeof e.x === 'number' && typeof e.y === 'number') {
        const p = worldToSvg(transform, e.x, e.y);
        const textStr = String(e.text || e.name || 'Text');
        const boxW = Math.max(30, textStr.length * 7.5 + 10);
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <rect x="${(p.x - 4).toFixed(1)}" y="${(p.y - 14).toFixed(1)}" width="${boxW.toFixed(1)}" height="18" fill="var(--bg-chip, #222327)" stroke="${stroke}" stroke-width="${selected ? 2 : 1}" rx="3"/>
          <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-size="11" font-family="var(--font-sans)" fill="var(--text-primary, #EAEAEC)" font-weight="600">${escapeHtml(textStr)}</text>
        </g>`;
      }
      return '';
    }).join('');

    // Rubber-band rectangle / line while creating
    let dragMarkup = '';
    if (dragState && dragState.mode === 'create' && dragState.current) {
      if (dragState.tool === 'wall' || dragState.tool === 'dimension' || dragState.tool === 'measure') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dM = Math.hypot(dragState.current.x - dragState.start.x, dragState.current.y - dragState.start.y);
        const col = dragState.tool === 'measure' ? 'var(--accent-action, #D32F2F)' : 'var(--color-warning, #fbbf24)';
        dragMarkup = `
          <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${col}" stroke-width="2" stroke-dasharray="5 3"/>
          <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="3.5" fill="${col}"/>
          <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="3.5" fill="${col}"/>
          <rect x="${(mid.x - 30).toFixed(1)}" y="${(mid.y - 18).toFixed(1)}" width="60" height="18" rx="3" fill="var(--bg-surface-raised, #29292e)" stroke="${col}" stroke-width="1"/>
          <text x="${mid.x.toFixed(1)}" y="${(mid.y - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" fill="#ffffff" font-weight="700">${dM.toFixed(2)}m</text>`;
      } else if (dragState.tool === 'stair' || dragState.tool === 'ramp') {
        const a = worldToSvg(transform, Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.y, dragState.current.y));
        const b = worldToSvg(transform, Math.max(dragState.start.x, dragState.current.x), Math.min(dragState.start.y, dragState.current.y));
        const col = dragState.tool === 'stair' ? 'var(--note-number, #4989D9)' : 'var(--accent-action, #D32F2F)';
        dragMarkup = `<rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${(b.x - a.x).toFixed(1)}" height="${(a.y - b.y).toFixed(1)}"
          fill="none" stroke="${col}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
      } else {
        const a = worldToSvg(transform, Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.y, dragState.current.y));
        const b = worldToSvg(transform, Math.max(dragState.start.x, dragState.current.x), Math.min(dragState.start.y, dragState.current.y));
        dragMarkup = `<rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${(b.x - a.x).toFixed(1)}" height="${(a.y - b.y).toFixed(1)}"
          fill="none" stroke="var(--color-warning,#fbbf24)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      }
    }

    dom.planSvg.innerHTML = `
      <g class="plan-grid">${gridLines}</g>
      <g class="plan-entities">${entityMarkup}</g>
      ${renderHandles()}
      ${dragMarkup}`;

    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `zoom ${transform.zoom.toFixed(0)} px/m · ${entities().length} entities`;
    }
    renderEntityList();
    renderPropertiesInspector();
  }

  function renderEntityList() {
    if (!dom.planEntityList) return;
    if (entities().length === 0) {
      dom.planEntityList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Empty plan — pick a tool and draw on the canvas.</div>';
      return;
    }
    dom.planEntityList.innerHTML = entities().map(e => {
      const selected = state.plan.selectedIds.has(e.id);
      const num = v => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : '?');
      let desc;
      if (e.kind === 'room') desc = `${num(e.width)} × ${num(e.depth)} m · ${typeof e.width === 'number' && typeof e.depth === 'number' ? roomArea(e).toFixed(2) : '?'} m²`;
      else if (e.kind === 'wall') desc = `${typeof e.x1 === 'number' && typeof e.x2 === 'number' ? wallLength(e).toFixed(2) : '?'} m · ${num(e.thickness)} m thick`;
      else if (e.kind === 'furniture') desc = `${num(e.width)} × ${num(e.depth)} m`;
      else if (e.kind === 'door') desc = `Door · ${num(e.width)} m width`;
      else if (e.kind === 'window') desc = `Window · ${num(e.width)} m width`;
      else if (e.kind === 'stair') desc = `${num(e.width)} × ${num(e.depth)} m · ${e.risers || 16} risers · Blondel ${Math.round((e.blondel || 0.63) * 1000)} mm`;
      else if (e.kind === 'ramp') desc = `${num(e.width)} × ${num(e.depth)} m · 1:${(e.slopeRatio || 12).toFixed(1)} (${(e.slopePercent || 8.33).toFixed(1)}%)`;
      else if (e.kind === 'dimension') desc = `Dim · ${typeof e.x1 === 'number' ? Math.hypot(e.x2 - e.x1, e.y2 - e.y1).toFixed(2) : '?'} m`;
      else if (e.kind === 'text') desc = `"${escapeHtml(e.text || e.name)}"`;
      else desc = e.kind;

      return `<div class="plan-entity-row" data-id="${escapeHtml(e.id)}" style="display: flex; justify-content: space-between; padding: 0.35rem 0.55rem; border: 1px solid var(--border-color-light); border-radius: 4px; cursor: pointer; font-family: var(--font-mono); font-size: 0.74rem; ${selected ? 'background: var(--bg-chip);' : ''}">
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
  // Properties & Verification Inspector
  // ------------------------------------------------------------------
  function renderPropertiesInspector() {
    if (!dom.planPropContent) return;
    const es = entities();
    const selectedId = Array.from(state.plan.selectedIds || [])[0];
    const selected = selectedId ? es.find(x => x.id === selectedId) : null;

    if (dom.planEntitiesCount) {
      dom.planEntitiesCount.textContent = String(es.length);
    }
    if (dom.planModeLabel) {
      dom.planModeLabel.textContent = (state.plan.tool || 'select').toUpperCase();
    }

    if (!selected) {
      if (dom.planPropTypeBadge) dom.planPropTypeBadge.textContent = 'OVERVIEW';
      const rooms = es.filter(e => e.kind === 'room');
      const walls = es.filter(e => e.kind === 'wall');
      const furniture = es.filter(e => e.kind === 'furniture');
      const stairs = es.filter(e => e.kind === 'stair');
      const ramps = es.filter(e => e.kind === 'ramp');
      const dims = es.filter(e => e.kind === 'dimension');
      const totalArea = rooms.reduce((sum, r) => sum + (typeof r.width === 'number' && typeof r.depth === 'number' ? roomArea(r) : 0), 0);
      const totalWallLen = walls.reduce((sum, w) => sum + (typeof w.x1 === 'number' ? wallLength(w) : 0), 0);

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Plan Summary</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Total Rooms</span><span class="plan-prop-value">${rooms.length}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Gross Room Area</span><span class="plan-prop-value note-number">${totalArea.toFixed(2)} m²</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Total Wall Length</span><span class="plan-prop-value">${totalWallLen.toFixed(2)} m</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Furniture Items</span><span class="plan-prop-value">${furniture.length}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Stair Flights</span><span class="plan-prop-value">${stairs.length}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Ramp Runs</span><span class="plan-prop-value">${ramps.length}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Dimensions</span><span class="plan-prop-value">${dims.length}</span></div>
        </div>
        <div class="plan-prop-section">
          <div class="plan-prop-title">Workstation Shortcuts</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Pan Viewport</span><span class="plan-prop-value">Space + Drag</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Zoom In / Out</span><span class="plan-prop-value">Wheel / + -</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Delete Item</span><span class="plan-prop-value">Del / Backspace</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Undo / Redo</span><span class="plan-prop-value">Ctrl+Z / Ctrl+Y</span></div>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.45; font-style: italic; margin-bottom: 0.5rem;">
          Select any entity to inspect dimensional metrics, rotate pieces, or test spatial clearances.
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-ai-plan" class="plan-prop-btn" style="border-color: var(--accent-primary);"><span>🤖 AI Critique Plan</span></button>
        </div>`;

      dom.planPropContent.querySelector('#btn-prop-ai-plan')?.addEventListener('click', () => {
        triggerAiCritique('plan', {
          summary: `Plan has ${rooms.length} rooms (${totalArea.toFixed(2)} m² gross), ${walls.length} walls (${totalWallLen.toFixed(2)}m), ${furniture.length} furniture items, ${stairs.length} stairs, ${ramps.length} ramps.`
        });
      });
      return;
    }

    if (dom.planPropTypeBadge) dom.planPropTypeBadge.textContent = selected.kind.toUpperCase();

    if (selected.kind === 'room') {
      const w = typeof selected.width === 'number' ? selected.width : 0;
      const d = typeof selected.depth === 'number' ? selected.depth : 0;
      const a = roomArea(selected);
      const p = roomPerimeter(selected);
      const ratio = roomAspectRatio(selected);
      const furnInside = es.filter(e => e.kind === 'furniture' && e.x >= selected.x && e.y >= selected.y && e.x + e.width <= selected.x + selected.width && e.y + e.depth <= selected.y + selected.depth);

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Room Geometry</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Width</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-room-w" class="text-input" value="${w.toFixed(2)}" step="0.1" min="0.5" max="100" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Room width in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Depth</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-room-d" class="text-input" value="${d.toFixed(2)}" step="0.1" min="0.5" max="100" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Room depth in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Floor Area</span><span class="plan-prop-value note-number">${a.toFixed(2)} m²</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Perimeter</span><span class="plan-prop-value">${p.toFixed(2)} m</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Aspect Ratio</span><span class="plan-prop-value">1 : ${isFinite(ratio) ? ratio.toFixed(2) : '—'}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Pieces Inside</span><span class="plan-prop-value">${furnInside.length}</span></div>
        </div>
        <div id="prop-verification-box" style="margin-top: 0.3rem;"></div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-check-room" class="plan-prop-btn"><span>✓ Check Overlaps</span></button>
          <button type="button" id="btn-prop-scratch-room" class="plan-prop-btn"><span>📋 Send to Scratchpad</span></button>
          <button type="button" id="btn-prop-ai-room" class="plan-prop-btn" style="border-color: var(--accent-primary);"><span>🤖 AI Review Room</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Room</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Room';
        render();
      });

      const rwInput = dom.planPropContent.querySelector('#prop-room-w');
      if (rwInput) {
        attachNumericScrubber(rwInput, {
          step: 0.1, min: 0.5, max: 100, precision: 2,
          onChange: (val) => { selected.width = val; render(); },
          onCommit: (val) => { selected.width = val; render(); }
        });
        rwInput.addEventListener('change', (e) => {
          selected.width = Math.max(0.5, parseFloat(e.target.value) || 0.5);
          render();
        });
      }

      const rdInput = dom.planPropContent.querySelector('#prop-room-d');
      if (rdInput) {
        attachNumericScrubber(rdInput, {
          step: 0.1, min: 0.5, max: 100, precision: 2,
          onChange: (val) => { selected.depth = val; render(); },
          onCommit: (val) => { selected.depth = val; render(); }
        });
        rdInput.addEventListener('change', (e) => {
          selected.depth = Math.max(0.5, parseFloat(e.target.value) || 0.5);
          render();
        });
      }

      dom.planPropContent.querySelector('#btn-prop-check-room')?.addEventListener('click', () => {
        const walls = es.filter(e => e.kind === 'wall');
        const conflicts = checkOverlaps(furnInside, [selected], walls);
        const vBox = dom.planPropContent.querySelector('#prop-verification-box');
        if (!vBox) return;
        if (conflicts.length === 0) {
          vBox.innerHTML = `<div class="plan-prop-badge fits" style="width: 100%; justify-content: center; padding: 0.4rem;">✓ CLEAR — NO CONFLICTS</div>`;
        } else {
          vBox.innerHTML = `
            <div class="plan-prop-badge partial" style="width: 100%; justify-content: center; padding: 0.4rem; margin-bottom: 0.4rem;">⚠️ ${conflicts.length} SPATIAL CONFLICT(S)</div>
            <ul style="font-size: 0.70rem; color: var(--text-secondary); margin: 0; padding-left: 1.1rem; line-height: 1.4;">
              ${conflicts.map(c => `<li>${escapeHtml(c.evidence)}</li>`).join('')}
            </ul>`;
        }
      });

      dom.planPropContent.querySelector('#btn-prop-scratch-room')?.addEventListener('click', () => {
        sendToScratchpad({
          value: a,
          formatted: `${a.toFixed(2)} m² (${w.toFixed(2)} × ${d.toFixed(2)} m)`,
          label: `${selected.name} Area`,
          unit: 'm²',
          source: 'Plan Room'
        });
      });

      dom.planPropContent.querySelector('#btn-prop-ai-room')?.addEventListener('click', () => {
        triggerAiCritique('room', {
          roomName: selected.name,
          area: a.toFixed(2),
          aspect: isFinite(ratio) ? ratio.toFixed(2) : '1.0'
        });
      });

    } else if (selected.kind === 'furniture') {
      const w = typeof selected.width === 'number' ? selected.width : 0;
      const d = typeof selected.depth === 'number' ? selected.depth : 0;
      const rooms = es.filter(e => e.kind === 'room');
      const center = { x: selected.x + w / 2, y: selected.y + d / 2 };
      let hostRoom = rooms.find(r => roomContainsPoint(r, center.x, center.y));
      if (!hostRoom) hostRoom = rooms.find(r => rectsIntersect(selected, r));

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Furniture Specifications</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Footprint</span><span class="plan-prop-value">${w.toFixed(2)} × ${d.toFixed(2)} m</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Rotation</span><span class="plan-prop-value">${selected.rotated ? '90° (Rotated)' : '0° (Standard)'}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Host Room</span><span class="plan-prop-value">${hostRoom ? escapeHtml(hostRoom.name) : 'None (Outside)'}</span></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label" title="User-configured envelope for circulation checks">Study Clearance</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-clearance-val" class="text-input" value="0.90" step="0.05" min="0.1" max="5.0" style="width: 60px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Clearance envelope in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
        </div>
        <div id="prop-verification-box" style="margin-top: 0.3rem;"></div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-rotate" class="plan-prop-btn"><span>🔄 Rotate 90°</span></button>
          <button type="button" id="btn-prop-check-fit" class="plan-prop-btn"><span>✓ Check Fit</span></button>
          <button type="button" id="btn-prop-check-clearance" class="plan-prop-btn"><span>📏 Check Clearance</span></button>
          <button type="button" id="btn-prop-scratch-furn" class="plan-prop-btn"><span>📋 Send to Scratchpad</span></button>
          <button type="button" id="btn-prop-ai-furniture" class="plan-prop-btn" style="border-color: var(--accent-primary);"><span>🤖 AI Review Fit</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Furniture</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Furniture';
        render();
      });

      const clearInputEl = dom.planPropContent.querySelector('#prop-clearance-val');
      if (clearInputEl) {
        attachNumericScrubber(clearInputEl, { step: 0.05, min: 0.1, max: 5.0, precision: 2 });
      }

      dom.planPropContent.querySelector('#btn-prop-rotate')?.addEventListener('click', () => {
        const oldW = selected.width;
        const oldD = selected.depth;
        const oldRot = selected.rotated || false;
        selected.width = oldD;
        selected.depth = oldW;
        selected.rotated = !oldRot;
        const cmd = {
          name: `rotate ${selected.name}`,
          redo: () => { selected.width = oldD; selected.depth = oldW; selected.rotated = !oldRot; render(); },
          undo: () => { selected.width = oldW; selected.depth = oldD; selected.rotated = oldRot; render(); }
        };
        history.push(cmd);
        showToast(`Rotated ${selected.name} 90° (${selected.width.toFixed(2)} × ${selected.depth.toFixed(2)} m)`);
        AudioService.playTick();
        render();
      });

      dom.planPropContent.querySelector('#btn-prop-check-fit')?.addEventListener('click', () => {
        const vBox = dom.planPropContent.querySelector('#prop-verification-box');
        if (!vBox) return;
        if (!hostRoom) {
          vBox.innerHTML = `<div class="plan-prop-badge no-fit" style="width: 100%; justify-content: center; padding: 0.4rem;">NO FIT — OUTSIDE ROOM</div>`;
          return;
        }
        const fit = checkFurnitureFit(selected, hostRoom);
        const cls = fit.verdict === 'fits' ? 'fits' : (fit.verdict === 'partial' ? 'partial' : 'no-fit');
        const ev = fit.evidence || {};
        vBox.innerHTML = `
          <div class="plan-prop-badge ${cls}" style="width: 100%; justify-content: center; padding: 0.4rem; margin-bottom: 0.35rem;">VERDICT: ${fit.verdict.toUpperCase()}</div>
          ${ev.marginEast !== undefined ? `
            <div style="font-size: 0.70rem; font-family: var(--font-mono); color: var(--text-secondary); line-height: 1.4;">
              Margins: E: ${ev.marginEast.toFixed(2)}m · W: ${ev.marginWest.toFixed(2)}m · N: ${ev.marginNorth.toFixed(2)}m · S: ${ev.marginSouth.toFixed(2)}m
            </div>` : `<div style="font-size: 0.70rem; color: var(--text-muted);">${escapeHtml(ev.reason || '')}</div>`}
        `;
      });

      dom.planPropContent.querySelector('#btn-prop-check-clearance')?.addEventListener('click', () => {
        const vBox = dom.planPropContent.querySelector('#prop-verification-box');
        if (!vBox) return;
        if (!hostRoom) {
          vBox.innerHTML = `
            <div class="plan-prop-badge no-fit" style="width: 100%; justify-content: center; padding: 0.4rem; margin-bottom: 0.35rem;">OUTSIDE ROOM</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); line-height: 1.3;">Place furniture inside a room boundary to test clearance envelope.</div>
          `;
          return;
        }
        const clearInput = dom.planPropContent.querySelector('#prop-clearance-val');
        const clearM = Math.max(0.05, parseFloat(clearInput?.value) || 0.9);
        const cl = checkClearance(selected, hostRoom, clearM, 'User Configured Study Envelope');
        const cls = cl.satisfied ? 'fits' : 'no-fit';
        vBox.innerHTML = `
          <div class="plan-prop-badge ${cls}" style="width: 100%; justify-content: center; padding: 0.4rem; margin-bottom: 0.35rem;">
            ${cl.satisfied ? `✓ CLEARANCE SATISFIED (${clearM.toFixed(2)} m)` : `⚠️ CLEARANCE BREACHED (${clearM.toFixed(2)} m)`}
          </div>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 0.35rem;">
            <span class="plan-prop-badge" style="background: rgba(73, 137, 217, 0.15); color: #4989D9; font-size: 0.62rem; padding: 2px 6px;">Educational Reference</span>
            <span class="plan-prop-badge" style="background: rgba(240, 122, 118, 0.15); color: #F07A76; font-size: 0.62rem; padding: 2px 6px;">User Configured</span>
            <span class="plan-prop-badge" style="background: rgba(201, 138, 43, 0.15); color: #c98a2b; font-size: 0.62rem; padding: 2px 6px;">Needs Verification</span>
          </div>
          <div style="font-size: 0.70rem; color: var(--text-secondary); line-height: 1.4;">${escapeHtml(cl.evidence?.reason || '')}</div>
          <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; line-height: 1.3;">
            ℹ️ Study values are educational guidelines only — verify with local jurisdiction building codes, accessibility regulations, and egress standards.
          </div>
        `;
      });

      dom.planPropContent.querySelector('#btn-prop-scratch-furn')?.addEventListener('click', () => {
        sendToScratchpad({
          value: Math.max(w, d),
          formatted: `${w.toFixed(2)} × ${d.toFixed(2)} m`,
          label: `${selected.name} Footprint`,
          unit: 'm',
          source: 'Plan Furniture'
        });
      });

      dom.planPropContent.querySelector('#btn-prop-ai-furniture')?.addEventListener('click', () => {
        triggerAiCritique('furniture', {
          furnName: selected.name,
          dimensions: `${w.toFixed(2)} × ${d.toFixed(2)} m`,
          hostRoom: hostRoom?.name || 'Open Area'
        });
      });

    } else if (selected.kind === 'stair') {
      const blondelMm = Math.round((selected.blondel || 0.63) * 1000);
      const isBlondelOptimal = blondelMm >= 600 && blondelMm <= 650;
      const pitchDeg = (Math.atan2(selected.rise, selected.run) * 180 / Math.PI).toFixed(1);

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Stair Specifications</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Width (Flight)</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-stair-w" class="text-input" value="${selected.width.toFixed(2)}" step="0.05" min="0.6" max="10" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Flight width in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Total Run</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-stair-run" class="text-input" value="${selected.run.toFixed(2)}" step="0.1" min="0.5" max="30" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Total run in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Total Rise</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-stair-rise" class="text-input" value="${selected.rise.toFixed(2)}" step="0.05" min="0.2" max="10" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Total rise in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Risers Count</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-stair-risers" class="text-input" value="${selected.risers}" step="1" min="2" max="50" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Risers count" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">R</span>
            </div>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Tread (Going)</span><span class="plan-prop-value">${(selected.tread * 1000).toFixed(1)} mm</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Pitch Angle</span><span class="plan-prop-value">${pitchDeg}°</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Blondel (2R+T)</span><span class="plan-prop-value" style="font-weight: 700; color: ${isBlondelOptimal ? 'var(--color-success, #4ade80)' : 'var(--color-warning, #fbbf24)'};">${blondelMm} mm</span></div>
        </div>
        <div class="plan-prop-section" style="background: rgba(0,0,0,0.2); padding: 0.45rem; border-radius: 4px; margin-top: 0.4rem;">
          <div style="font-size: 0.68rem; color: var(--text-secondary); line-height: 1.4;">
            ${isBlondelOptimal ? '✓ Comfort target: within 600–650 mm benchmark.' : '⚠️ Blondel check outside standard 600–650 mm comfort range.'}
          </div>
          <div style="font-size: 0.63rem; color: var(--text-muted); margin-top: 2px;">
            ℹ️ Straight-flight stair geometry calculator: rise, riser count, tread/going, run, Blondel 2R+T, and pitch. Headroom clearance must be verified separately against the project geometry and applicable requirements.
          </div>
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-scratch-stair" class="plan-prop-btn"><span>📋 Send to Scratchpad</span></button>
          <button type="button" id="btn-prop-ai-stair" class="plan-prop-btn" style="border-color: var(--accent-primary);"><span>🤖 AI Review Stair</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Stair</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Stair';
        render();
      });

      function updateStairGeometry() {
        selected.riserHeight = selected.rise / selected.risers;
        selected.tread = selected.run / Math.max(1, selected.risers - 1);
        selected.blondel = 2 * selected.riserHeight + selected.tread;
        selected.pitchAngle = Math.atan2(selected.rise, selected.run) * (180 / Math.PI);
        render();
      }

      const stairWInput = dom.planPropContent.querySelector('#prop-stair-w');
      if (stairWInput) {
        attachNumericScrubber(stairWInput, {
          step: 0.05, min: 0.6, max: 10, precision: 2,
          onChange: (val) => { selected.width = val; render(); },
          onCommit: (val) => { selected.width = val; render(); }
        });
        stairWInput.addEventListener('change', (e) => {
          selected.width = Math.max(0.6, parseFloat(e.target.value) || 0.6);
          render();
        });
      }

      const stairRunInput = dom.planPropContent.querySelector('#prop-stair-run');
      if (stairRunInput) {
        attachNumericScrubber(stairRunInput, {
          step: 0.1, min: 0.5, max: 30, precision: 2,
          onChange: (val) => { selected.run = val; selected.depth = val; updateStairGeometry(); },
          onCommit: (val) => { selected.run = val; selected.depth = val; updateStairGeometry(); }
        });
        stairRunInput.addEventListener('change', (e) => {
          selected.run = Math.max(0.5, parseFloat(e.target.value) || 0.5);
          selected.depth = selected.run;
          updateStairGeometry();
        });
      }

      const stairRiseInput = dom.planPropContent.querySelector('#prop-stair-rise');
      if (stairRiseInput) {
        attachNumericScrubber(stairRiseInput, {
          step: 0.05, min: 0.2, max: 10, precision: 2,
          onChange: (val) => { selected.rise = val; updateStairGeometry(); },
          onCommit: (val) => { selected.rise = val; updateStairGeometry(); }
        });
        stairRiseInput.addEventListener('change', (e) => {
          selected.rise = Math.max(0.2, parseFloat(e.target.value) || 0.2);
          updateStairGeometry();
        });
      }

      const stairRisersInput = dom.planPropContent.querySelector('#prop-stair-risers');
      if (stairRisersInput) {
        attachNumericScrubber(stairRisersInput, {
          step: 1, min: 2, max: 50, precision: 0,
          onChange: (val) => { selected.risers = Math.round(val); updateStairGeometry(); },
          onCommit: (val) => { selected.risers = Math.round(val); updateStairGeometry(); }
        });
        stairRisersInput.addEventListener('change', (e) => {
          selected.risers = Math.max(2, Math.round(parseFloat(e.target.value) || 2));
          updateStairGeometry();
        });
      }

      dom.planPropContent.querySelector('#btn-prop-scratch-stair')?.addEventListener('click', () => {
        sendToScratchpad({
          value: selected.run,
          formatted: `${selected.run.toFixed(2)}m run (${selected.risers}R @ ${(selected.riserHeight * 1000).toFixed(0)}mm)`,
          label: `${selected.name} Geometry`,
          unit: 'm',
          source: 'Plan Stair'
        });
      });

      dom.planPropContent.querySelector('#btn-prop-ai-stair')?.addEventListener('click', () => {
        triggerAiCritique('stair', {
          blondel: blondelMm,
          pitch: pitchDeg
        });
      });

    } else if (selected.kind === 'ramp') {
      const slopePct = (selected.slopePercent || 8.33).toFixed(2);
      const ratio = (selected.slopeRatio || 12).toFixed(1);
      const isCompliant = (selected.slopeRatio || 12) >= 12;
      const angleDeg = (Math.atan2(selected.rise, selected.run) * 180 / Math.PI).toFixed(2);

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Ramp Specifications</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Clear Width</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-ramp-w" class="text-input" value="${selected.width.toFixed(2)}" step="0.05" min="0.6" max="10" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Clear width in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Horizontal Run</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-ramp-run" class="text-input" value="${selected.run.toFixed(2)}" step="0.1" min="0.5" max="50" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Horizontal run in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Total Rise</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-ramp-rise" class="text-input" value="${selected.rise.toFixed(2)}" step="0.05" min="0.05" max="5" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Total rise in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Slope Ratio</span><span class="plan-prop-value" style="font-weight: 700;">1 : ${ratio}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Slope Gradient</span><span class="plan-prop-value">${slopePct}% (${angleDeg}°)</span></div>
        </div>
        <div class="plan-prop-section" style="background: rgba(0,0,0,0.2); padding: 0.45rem; border-radius: 4px; margin-top: 0.4rem;">
          <div style="font-size: 0.68rem; color: ${isCompliant ? 'var(--color-success, #4ade80)' : 'var(--color-warning, #fbbf24)'}; font-weight: 600;">
            ${isCompliant ? '✓ 1:12 Target Compliant (Straight Single Run)' : '⚠️ Steeper than 1:12 standard'}
          </div>
          <div style="font-size: 0.63rem; color: var(--text-muted); margin-top: 2px;">
            ℹ️ Straight Ramp / Single Run — Landings Not Included. Educational reference — verify local jurisdiction accessibility code.
          </div>
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-scratch-ramp" class="plan-prop-btn"><span>📋 Send to Scratchpad</span></button>
          <button type="button" id="btn-prop-ai-ramp" class="plan-prop-btn" style="border-color: var(--accent-primary);"><span>🤖 AI Review Ramp</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Ramp</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Ramp';
        render();
      });

      function updateRampGeometry() {
        selected.slopePercent = (selected.rise / selected.run) * 100;
        selected.slopeRatio = selected.run / selected.rise;
        render();
      }

      const rampWInput = dom.planPropContent.querySelector('#prop-ramp-w');
      if (rampWInput) {
        attachNumericScrubber(rampWInput, {
          step: 0.05, min: 0.6, max: 10, precision: 2,
          onChange: (val) => { selected.width = val; render(); },
          onCommit: (val) => { selected.width = val; render(); }
        });
        rampWInput.addEventListener('change', (e) => {
          selected.width = Math.max(0.6, parseFloat(e.target.value) || 0.6);
          render();
        });
      }

      const rampRunInput = dom.planPropContent.querySelector('#prop-ramp-run');
      if (rampRunInput) {
        attachNumericScrubber(rampRunInput, {
          step: 0.1, min: 0.5, max: 50, precision: 2,
          onChange: (val) => { selected.run = val; selected.depth = val; updateRampGeometry(); },
          onCommit: (val) => { selected.run = val; selected.depth = val; updateRampGeometry(); }
        });
        rampRunInput.addEventListener('change', (e) => {
          selected.run = Math.max(0.5, parseFloat(e.target.value) || 0.5);
          selected.depth = selected.run;
          updateRampGeometry();
        });
      }

      const rampRiseInput = dom.planPropContent.querySelector('#prop-ramp-rise');
      if (rampRiseInput) {
        attachNumericScrubber(rampRiseInput, {
          step: 0.05, min: 0.05, max: 5, precision: 2,
          onChange: (val) => { selected.rise = val; updateRampGeometry(); },
          onCommit: (val) => { selected.rise = val; updateRampGeometry(); }
        });
        rampRiseInput.addEventListener('change', (e) => {
          selected.rise = Math.max(0.05, parseFloat(e.target.value) || 0.05);
          updateRampGeometry();
        });
      }

      dom.planPropContent.querySelector('#btn-prop-scratch-ramp')?.addEventListener('click', () => {
        sendToScratchpad({
          value: selected.run,
          formatted: `${selected.run.toFixed(2)}m run (1:${ratio} slope)`,
          label: `${selected.name} Run`,
          unit: 'm',
          source: 'Plan Ramp'
        });
      });

      dom.planPropContent.querySelector('#btn-prop-ai-ramp')?.addEventListener('click', () => {
        triggerAiCritique('ramp', {
          ratio,
          percent: slopePct
        });
      });

    } else if (selected.kind === 'wall') {
      const len = typeof selected.x1 === 'number' ? wallLength(selected) : 0;
      const dir = typeof selected.x1 === 'number' ? wallDirection(selected) : '—';
      const thick = typeof selected.thickness === 'number' ? selected.thickness : 0.2;
      const openings = es.filter(e => (e.kind === 'door' || e.kind === 'window') && e.wallId === selected.id);

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Wall Parameters</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Length</span><span class="plan-prop-value note-number">${len.toFixed(2)} m</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Direction</span><span class="plan-prop-value" style="text-transform: capitalize;">${escapeHtml(dir)}</span></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Thickness</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-wall-thickness" class="text-input" value="${thick.toFixed(2)}" step="0.02" min="0.05" max="1.5" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" aria-label="Wall thickness in meters" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Endpoints</span><span class="plan-prop-value" style="font-size: 0.70rem;">(${selected.x1?.toFixed(1)}, ${selected.y1?.toFixed(1)}) ➔ (${selected.x2?.toFixed(1)}, ${selected.y2?.toFixed(1)})</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Openings</span><span class="plan-prop-value">${openings.length}</span></div>
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-scratch-wall" class="plan-prop-btn"><span>📋 Send Length to Scratchpad</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Wall</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Wall';
        render();
      });

      const wallThickInput = dom.planPropContent.querySelector('#prop-wall-thickness');
      if (wallThickInput) {
        attachNumericScrubber(wallThickInput, {
          step: 0.02, min: 0.05, max: 1.5, precision: 2,
          onChange: (val) => { selected.thickness = val; render(); },
          onCommit: (val) => { selected.thickness = val; render(); }
        });
        wallThickInput.addEventListener('change', (e) => {
          selected.thickness = Math.max(0.05, parseFloat(e.target.value) || 0.2);
          render();
        });
      }

      dom.planPropContent.querySelector('#btn-prop-scratch-wall')?.addEventListener('click', () => {
        sendToScratchpad({
          value: len,
          formatted: `${len.toFixed(2)} m`,
          label: `${selected.name} Length`,
          unit: 'm',
          source: 'Plan Wall'
        });
      });

    } else if (selected.kind === 'door' || selected.kind === 'window') {
      const isDoor = selected.kind === 'door';
      const wall = es.find(w => w.id === selected.wallId);
      const fits = wall ? openingFitsWall(selected, wall) : { fits: false, reason: 'Orphaned opening' };

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">${isDoor ? 'Door' : 'Window'} Specifications</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><span class="plan-prop-value">${escapeHtml(selected.name)}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Host Wall</span><span class="plan-prop-value">${wall ? escapeHtml(wall.name) : 'None'}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Wall Offset</span><span class="plan-prop-value">${typeof selected.position === 'number' ? selected.position.toFixed(2) : '0'} m</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Width</span><span class="plan-prop-value">${typeof selected.width === 'number' ? selected.width.toFixed(2) : '0.9'} m</span></div>
          ${isDoor ? `<div class="plan-prop-row"><span class="plan-prop-label">Swing</span><span class="plan-prop-value" style="text-transform: capitalize;">${escapeHtml(selected.swing || 'left')}</span></div>` : ''}
          <div class="plan-prop-row"><span class="plan-prop-label">Wall Fit</span><span class="plan-prop-badge ${fits.fits ? 'fits' : 'no-fit'}">${fits.fits ? 'FITS' : 'OVERFLOW'}</span></div>
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Opening</span></button>
        </div>`;

    } else if (selected.kind === 'dimension') {
      const dist = Math.hypot(selected.x2 - selected.x1, selected.y2 - selected.y1);
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Dimension Annotation</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Distance (m)</span><span class="plan-prop-value note-number">${dist.toFixed(3)} m</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Distance (cm)</span><span class="plan-prop-value">${(dist * 100).toFixed(1)} cm</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Distance (mm)</span><span class="plan-prop-value">${(dist * 1000).toFixed(0)} mm</span></div>
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-scratch-dim" class="plan-prop-btn"><span>📋 Send to Scratchpad</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Dimension</span></button>
        </div>`;

      dom.planPropContent.querySelector('#btn-prop-scratch-dim')?.addEventListener('click', () => {
        sendToScratchpad({
          value: dist,
          formatted: `${dist.toFixed(3)} m (${(dist * 1000).toFixed(0)} mm)`,
          label: `${selected.name || 'Dimension'}`,
          unit: 'm',
          source: 'Plan Dimension'
        });
      });

    } else if (selected.kind === 'text') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Text Annotation</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Label</span><input type="text" id="prop-entity-text" class="text-input" value="${escapeHtml(selected.text || selected.name)}" style="width: 150px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Position</span><span class="plan-prop-value">(${selected.x?.toFixed(2)}, ${selected.y?.toFixed(2)})</span></div>
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Text</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-text')?.addEventListener('change', (e) => {
        selected.text = e.target.value.trim() || 'Label';
        selected.name = selected.text;
        render();
      });
    }

    dom.planPropContent.querySelector('#btn-prop-delete')?.addEventListener('click', () => {
      deleteSelected();
    });
  }

  // ------------------------------------------------------------------
  // Wall-Opening Helper & Annotations
  // ------------------------------------------------------------------
  function findNearestWall(world, maxDist = 0.9) {
    const walls = entities().filter(e => e.kind === 'wall' && typeof e.x1 === 'number');
    let best = null;
    let minDist = maxDist;
    for (const w of walls) {
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((world.x - w.x1) * dx + (world.y - w.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = w.x1 + t * dx;
      const projY = w.y1 + t * dy;
      const dist = Math.hypot(world.x - projX, world.y - projY);
      if (dist < minDist) {
        minDist = dist;
        const len = Math.sqrt(lenSq);
        best = { wall: w, position: t * len };
      }
    }
    return best;
  }

  function placeOpening(world, kind) {
    const match = findNearestWall(world, 1.2);
    if (!match) {
      showToast(`Click closer to a wall to place a ${kind}`, 'warning');
      return;
    }
    const wall = match.wall;
    const pos = snapToGrid(match.position, state.plan.grid);
    let entity;
    try {
      if (kind === 'door') {
        entity = createDoor({
          wallId: wall.id,
          position: pos,
          width: 0.9,
          swing: 'left'
        });
      } else {
        entity = createWindow({
          wallId: wall.id,
          position: pos,
          width: 1.2,
          sill: 0.9
        });
      }
    } catch (err) {
      showToast(err.message, 'warning');
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), entity, `add ${kind} to ${wall.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([entity.id]);
    showToast(`${kind === 'door' ? 'Door' : 'Window'} placed on ${wall.name} @ ${pos.toFixed(2)} m`);
    AudioService.playTick();
    render();
  }

  function placeTextAnnotation(snapped) {
    const label = window.prompt('Enter annotation label text:', 'Note');
    if (!label || !label.trim()) return;
    const txt = {
      kind: 'text',
      id: generateEntityId('txt'),
      name: label.trim(),
      text: label.trim(),
      x: snapped.x,
      y: snapped.y,
      width: 1.0,
      depth: 0.4
    };
    const cmd = entityAddRemoveCommand(entities(), txt, `add note "${txt.name}"`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([txt.id]);
    showToast(`Annotation added: "${txt.name}"`);
    AudioService.playTick();
    render();
  }

  function createDimensionEntity(start, end) {
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < state.plan.grid) return;
    const dim = {
      kind: 'dimension',
      id: generateEntityId('dim'),
      name: `${dist.toFixed(2)}m`,
      x1: start.x, y1: start.y,
      x2: end.x, y2: end.y,
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      depth: Math.abs(end.y - start.y)
    };
    const cmd = entityAddRemoveCommand(entities(), dim, `add dimension ${dim.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([dim.id]);
    showToast(`Dimension added: ${dist.toFixed(2)} m`);
    AudioService.playTick();
  }

  // ------------------------------------------------------------------
  // Pointer interaction & Coordinate Pipeline
  // ------------------------------------------------------------------
  function clientToSvg(clientX, clientY) {
    if (dom.planSvg && typeof dom.planSvg.getScreenCTM === 'function') {
      const ctm = dom.planSvg.getScreenCTM();
      if (ctm) {
        const pt = dom.planSvg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgPt = pt.matrixTransform(ctm.inverse());
        return { x: svgPt.x, y: svgPt.y };
      }
    }
    const rect = dom.planSvg ? dom.planSvg.getBoundingClientRect() : { left: 0, top: 0, width: svg.width, height: svg.height };
    const scaleX = rect.width > 0 ? svg.width / rect.width : 1;
    const scaleY = rect.height > 0 ? svg.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function svgPoint(event) {
    syncSvgSize();
    const sp = clientToSvg(event.clientX, event.clientY);
    return svgToWorld(transform, sp.x, sp.y);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (event.button === 1 || isPanHotkey()) {
      event.preventDefault();
      dragState = { mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startTransform: { ...transform } };
      return;
    }
    const world = svgPoint(event);
    const snapped = { x: snapToGrid(world.x, state.plan.grid), y: snapToGrid(world.y, state.plan.grid) };
    const tool = state.plan.tool;

    // 1. Check for handle hit (resize / rotate)
    const handleEl = event.target.closest ? event.target.closest('.plan-handle') : null;
    if (handleEl) {
      const handle = handleEl.dataset.handle;
      const entityId = handleEl.dataset.entityId;
      const entity = entities().find(x => x.id === entityId);
      if (entity && handle) {
        dragState = {
          mode: 'resize',
          handle,
          entity,
          initial: JSON.parse(JSON.stringify(entity)),
          startWorld: snapped,
          lastWorld: snapped
        };
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (tool === 'select') {
      const entityEl = event.target.closest ? event.target.closest('.plan-entity') : null;
      let hitId = entityEl ? entityEl.dataset.entityId : null;
      if (!hitId) {
        const hits = pickEntities(entities(), { x: world.x, y: world.y, width: 0, depth: 0 });
        if (hits.length > 0) hitId = hits[hits.length - 1];
      }

      if (hitId) {
        state.plan.selectedIds = new Set([hitId]);
        const e = entities().find(x => x.id === hitId);
        dragState = { mode: 'move', entity: e, start: snapped, last: snapped, initial: JSON.parse(JSON.stringify(e)) };
      } else {
        state.plan.selectedIds = new Set();
        dragState = { mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startTransform: { ...transform } };
      }
      render();
    } else if (tool === 'room' || tool === 'wall' || tool === 'stair' || tool === 'ramp' || tool === 'dimension' || tool === 'measure') {
      dragState = { mode: 'create', tool, start: snapped, current: snapped };
    } else if (tool === 'furniture') {
      dropFurniture(snapped);
    } else if (tool === 'door' || tool === 'window') {
      placeOpening(world, tool);
    } else if (tool === 'text') {
      placeTextAnnotation(snapped);
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

    if (dragState.mode === 'resize' && dragState.entity) {
      const e = dragState.entity;
      const init = dragState.initial;
      const grid = state.plan.grid;
      const h = dragState.handle;

      if (h === 'rotate') {
        return;
      }

      if (e.kind === 'wall' || e.kind === 'dimension') {
        if (h === 'p1') {
          e.x1 = snapped.x;
          e.y1 = snapped.y;
        } else if (h === 'p2') {
          e.x2 = snapped.x;
          e.y2 = snapped.y;
        }
        if (e.kind === 'dimension') {
          e.x = Math.min(e.x1, e.x2);
          e.y = Math.min(e.y1, e.y2);
          e.width = Math.abs(e.x2 - e.x1);
          e.depth = Math.abs(e.y2 - e.y1);
          e.name = `${Math.hypot(e.x2 - e.x1, e.y2 - e.y1).toFixed(2)}m`;
        }
        render();
        return;
      }

      let minX = init.x;
      let maxX = init.x + init.width;
      let minY = init.y;
      let maxY = init.y + init.depth;

      if (h.includes('w')) {
        minX = Math.min(snapped.x, maxX - grid);
      }
      if (h.includes('e')) {
        maxX = Math.max(snapped.x, minX + grid);
      }
      if (h.includes('s')) {
        minY = Math.min(snapped.y, maxY - grid);
      }
      if (h.includes('n')) {
        maxY = Math.max(snapped.y, minY + grid);
      }

      e.x = minX;
      e.y = minY;
      e.width = Math.max(grid, maxX - minX);
      e.depth = Math.max(grid, maxY - minY);

      if (e.kind === 'stair') {
        e.run = Math.max(grid, e.depth);
        const tread = e.run / Math.max(1, (e.risers || 16) - 1);
        e.tread = tread;
        const riserHeight = e.riserHeight || (e.rise / (e.risers || 16));
        e.blondel = 2 * riserHeight + tread;
        e.pitchAngle = Math.atan2(e.rise, e.run) * (180 / Math.PI);
      } else if (e.kind === 'ramp') {
        e.run = Math.max(grid, e.depth);
        e.slopePercent = (e.rise / e.run) * 100;
        e.slopeRatio = e.run / e.rise;
      }

      render();
      return;
    }

    if (dragState.mode === 'create') {
      dragState.current = snapped;
      if (dragState.tool === 'measure') {
        const d = Math.hypot(snapped.x - dragState.start.x, snapped.y - dragState.start.y);
        if (dom.planStatusBadge) {
          dom.planStatusBadge.textContent = `Measure: ${d.toFixed(2)} m (${(d * 100).toFixed(0)} cm)`;
        }
      }
      render();
    } else if (dragState.mode === 'move' && dragState.entity) {
      const dx = snapped.x - dragState.last.x;
      const dy = snapped.y - dragState.last.y;
      if (dx !== 0 || dy !== 0) {
        if (dragState.entity.kind === 'wall' || dragState.entity.kind === 'dimension') {
          dragState.entity.x1 += dx;
          dragState.entity.y1 += dy;
          dragState.entity.x2 += dx;
          dragState.entity.y2 += dy;
          if (dragState.entity.kind === 'dimension') {
            dragState.entity.x = Math.min(dragState.entity.x1, dragState.entity.x2);
            dragState.entity.y = Math.min(dragState.entity.y1, dragState.entity.y2);
          }
        } else {
          dragState.entity.x += dx;
          dragState.entity.y += dy;
        }
        dragState.last = snapped;
        render();
      }
    }
  }

  function onPointerUp(event) {
    if (!dragState) return;
    if (dragState.mode === 'resize' && dragState.entity) {
      const e = dragState.entity;
      const init = dragState.initial;
      const h = dragState.handle;

      if (h === 'rotate') {
        const beforeState = JSON.parse(JSON.stringify(init));
        e.rotated = !init.rotated;
        const cx = e.x + e.width / 2;
        const cy = e.y + e.depth / 2;
        const oldW = e.width;
        const oldD = e.depth;
        e.width = oldD;
        e.depth = oldW;
        e.x = snapToGrid(cx - e.width / 2, state.plan.grid);
        e.y = snapToGrid(cy - e.depth / 2, state.plan.grid);
        const afterState = JSON.parse(JSON.stringify(e));

        const cmd = {
          label: `rotate ${e.name}`,
          redo() { Object.assign(e, afterState); render(); },
          undo() { Object.assign(e, beforeState); render(); }
        };
        history.push(cmd);
        showToast(`Rotated ${e.name} to ${e.rotated ? '90°' : '0°'}`);
        AudioService.playTick();
      } else {
        const changed = JSON.stringify(init) !== JSON.stringify(e);
        if (changed) {
          const beforeState = JSON.parse(JSON.stringify(init));
          const afterState = JSON.parse(JSON.stringify(e));
          const cmd = {
            label: `resize ${e.name}`,
            redo() { Object.assign(e, afterState); render(); },
            undo() { Object.assign(e, beforeState); render(); }
          };
          history.push(cmd);
          showToast(`Resized ${e.name}`);
          AudioService.playTick();
        }
      }
    } else if (dragState.mode === 'create') {
      const start = dragState.start;
      const end = { x: snapToGrid(svgPoint(event).x, state.plan.grid), y: snapToGrid(svgPoint(event).y, state.plan.grid) };
      if (dragState.tool === 'room') {
        createRoomEntity(start, end);
      } else if (dragState.tool === 'wall') {
        createWallEntity(start, end);
      } else if (dragState.tool === 'stair') {
        createStairEntityFromDrag(start, end);
      } else if (dragState.tool === 'ramp') {
        createRampEntityFromDrag(start, end);
      } else if (dragState.tool === 'dimension') {
        createDimensionEntity(start, end);
      } else if (dragState.tool === 'measure') {
        const d = Math.hypot(end.x - start.x, end.y - start.y);
        showToast(`Measured: ${d.toFixed(3)} m (${(d * 100).toFixed(1)} cm / ${(d * 1000).toFixed(0)} mm)`);
        AudioService.playTick();
      }
    } else if (dragState.mode === 'move' && dragState.entity) {
      const dx = dragState.last.x - dragState.start.x;
      const dy = dragState.last.y - dragState.start.y;
      if (dx !== 0 || dy !== 0) {
        const e = dragState.entity;
        const beforeState = JSON.parse(JSON.stringify(dragState.initial));
        const afterState = JSON.parse(JSON.stringify(e));
        const cmd = {
          label: `move ${e.name}`,
          redo() { Object.assign(e, afterState); render(); },
          undo() { Object.assign(e, beforeState); render(); }
        };
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

  function createStairEntityFromDrag(start, end) {
    const width = Math.max(state.plan.grid, Math.abs(end.x - start.x));
    const run = Math.max(state.plan.grid, Math.abs(end.y - start.y));
    const rise = 2.7;
    const risers = Math.max(4, Math.round(rise / 0.17));
    let stair;
    try {
      stair = createStairEntity({
        name: `Flight ${entities().filter(e => e.kind === 'stair').length + 1}`,
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width,
        run,
        rise,
        risers
      });
    } catch (e) {
      showToast(e.message, 'warning');
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), stair, `add stair ${stair.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([stair.id]);
    showToast(`Stair added: ${width.toFixed(2)}m width × ${run.toFixed(2)}m run (${stair.risers}R @ ${(stair.riserHeight * 1000).toFixed(0)}mm)`);
    AudioService.playTick();
  }

  function createRampEntityFromDrag(start, end) {
    const width = Math.max(state.plan.grid, Math.abs(end.x - start.x));
    const run = Math.max(state.plan.grid, Math.abs(end.y - start.y));
    const rise = 0.5;
    let ramp;
    try {
      ramp = createRampEntity({
        name: `Ramp ${entities().filter(e => e.kind === 'ramp').length + 1}`,
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width,
        run,
        rise
      });
    } catch (e) {
      showToast(e.message, 'warning');
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), ramp, `add ramp ${ramp.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([ramp.id]);
    showToast(`Ramp added: ${width.toFixed(2)}m width × ${run.toFixed(2)}m run (1:${ramp.slopeRatio.toFixed(1)} / ${ramp.slopePercent.toFixed(1)}%)`);
    AudioService.playTick();
  }

  function sendToScratchpad(item) {
    if (typeof context.addScratchpadItem === 'function') {
      return context.addScratchpadItem(item);
    }
    if (!Array.isArray(state.scratchpad)) state.scratchpad = [];
    const cleanItem = {
      id: `scratch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      value: typeof item.value === 'number' ? item.value : parseFloat(item.value) || 0,
      formatted: item.formatted || (typeof item.value === 'number' ? `${item.value} ${item.unit || 'm'}` : String(item.value)),
      label: item.label || 'Measurement',
      unit: item.unit || 'm',
      source: item.source || 'Plan Canvas',
      timestamp: new Date().toISOString()
    };
    state.scratchpad.unshift(cleanItem);
    try {
      const proj = projectStore?.getProject();
      if (proj) {
        if (!Array.isArray(proj.scratchpad)) proj.scratchpad = [];
        proj.scratchpad.unshift(cleanItem);
        projectStore.updateProject(proj.id, { scratchpad: proj.scratchpad });
      }
    } catch (e) {}
    showToast(`📋 Saved to Scratchpad: "${cleanItem.label}" (${cleanItem.formatted})`);
    AudioService.playTick();
    return cleanItem;
  }

  function triggerAiCritique(targetType, payload = {}) {
    switchMode('ai');
    setTimeout(() => {
      if (dom.aiJobSelect) {
        if (targetType === 'furniture') dom.aiJobSelect.value = 'bestPractice';
        else if (targetType === 'room') dom.aiJobSelect.value = 'studioCritic';
        else if (targetType === 'stair' || targetType === 'ramp') dom.aiJobSelect.value = 'bestPractice';
        else dom.aiJobSelect.value = 'projectAnalysis';
      }
      if (dom.aiContextScopeSelect) {
        if (targetType === 'room') dom.aiContextScopeSelect.value = 'Current Room';
        else if (targetType === 'furniture' || targetType === 'stair' || targetType === 'ramp') dom.aiContextScopeSelect.value = 'Selected Entity';
        else dom.aiContextScopeSelect.value = 'Current Plan';
      }
      if (dom.aiUserPrompt) {
        if (targetType === 'room') {
          dom.aiUserPrompt.value = `Review spatial proportion, circulation clearance, and daylighting for ${payload.roomName || 'this room'} (${payload.area || ''} m², ${payload.aspect || ''} aspect ratio).`;
        } else if (targetType === 'furniture') {
          dom.aiUserPrompt.value = `Review ergonomic fit, clearance envelopes, and accessibility for ${payload.furnName || 'this furniture item'} (${payload.dimensions || ''}) in ${payload.hostRoom || 'room'}.`;
        } else if (targetType === 'stair') {
          dom.aiUserPrompt.value = `Evaluate stair proportion comfort (Blondel 2R+T: ${payload.blondel || ''} mm, pitch: ${payload.pitch || ''}°) and recommend egress/headroom considerations.`;
        } else if (targetType === 'ramp') {
          dom.aiUserPrompt.value = `Evaluate ramp accessibility slope (1:${payload.ratio || ''} / ${payload.percent || ''}%) and explain landing/handrail guidance for university presentation.`;
        } else {
          dom.aiUserPrompt.value = `Provide an architectural critique of this plan layout, circulation flow, and spatial zoning.`;
        }
      }
      views.callController('ai', 'refreshImageGroup');
      showToast(`AI Studio loaded with contextual ${targetType} scope`);
    }, 50);
  }

  function dropFurniture(snapped) {
    const item = furnitureCatalog[state.plan.furnitureIndex || 0];
    if (!item) {
      showToast('Select a furniture piece first', 'warning');
      return;
    }
    const isRot = state.plan.furnitureRotated || false;
    const itemW = (isRot ? item.dCm : item.wCm) / 100;
    const itemD = (isRot ? item.wCm : item.dCm) / 100;
    const placeX = snapToGrid(snapped.x - itemW / 2, state.plan.grid);
    const placeY = snapToGrid(snapped.y - itemD / 2, state.plan.grid);
    let placed;
    try {
      placed = placeFurniture({
        catalogId: item.id,
        displayName: item.name,
        wCm: item.wCm,
        dCm: item.dCm,
        x: placeX,
        y: placeY,
        rotated: isRot
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
          syncSvgSize();
          const sp = clientToSvg(e.clientX, e.clientY);
          transform = zoomAt(transform, e.deltaY < 0 ? 1.15 : 0.87, sp.x, sp.y);
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
