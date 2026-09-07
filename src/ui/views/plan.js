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
  createHistory, entityAddRemoveCommand, entityMoveCommand,
  findSnapPoint, computeAlignmentGuides, computeMeasurement, duplicateEntity
} from '../../core/plan-canvas.js';
import {
  createRoom, createWall, createDoor, createWindow,
  placeFurniture, createStairEntity, createRampEntity,
  createDimension, autoDimensionWall,
  DIMENSION_STYLES, DIMENSION_ORIENTATIONS, DIMENSION_UNITS,
  roomArea, wallLength, roomPerimeter, roomAspectRatio,
  wallDirection, openingFitsWall, generateEntityId,
  WALL_ASSEMBLIES, wallOpenings,
  createRoomTag, createDoorTag, createWindowTag,
  createLeaderNote, createNorthArrow, autoTagDocument,
  createDetailCallout, createBlockInstanceEntity, createLineEntity
} from '../../core/entities.js';
import {
  normalizeDocumentLayers, resolveEntityLayer, isEntityVisible, isEntityLocked,
  toggleLayerVisibility, toggleLayerLock, addCustomLayer, deleteCustomLayer,
  setEntityLayer, DEFAULT_CAD_LAYERS
} from '../../core/layers.js';
import {
  createColumn, createGridLine, generateGridSystem, columnContour,
  columnHatchLines, columnSnapPoints, gridLineIntersection, COLUMN_PROFILES, BUBBLE_POSITIONS
} from '../../core/grid-columns.js';
import {
  CAMERA_PRESETS, buildMassing3DModel, buildMultiStoryMassing3DModel, projectAndSortFaces, generateMassingSVG, projectPoint3D
} from '../../core/massing-3d.js';
import {
  SHEET_SIZES, ARCHITECTURAL_SCALES, createSheetConfig, computeViewportLayout, generateSheetSVG
} from '../../core/sheet.js';
import {
  ELEVATION_DIRECTIONS, createSectionCut,
  generateBuildingElevation, generateBuildingSection,
  generateElevationSVG, generateSectionSVG
} from '../../core/sections-elevations.js';
import {
  DETAIL_ASSEMBLIES, generateDetailAssembly, generateDetailSVG
} from '../../core/details.js';
import {
  calculateRoomSchedule, calculateFloorTotals, formatScheduleCSV, guessZoningFromRoomName
} from '../../core/zoning-schedule.js';
import {
  calcWallJunctions, punchWallSpans, calcDoorCADGeometry,
  calcWindowCADGeometry, calcWallPolygon, calcDimensionGeometry
} from '../../core/geometry.js';
import { formatFeetInches } from '../../core/formatter.js';
import { checkFurnitureFit, checkClearance, checkOverlaps } from '../../core/space-planning.js';
import { FURNITURE_DATABASE } from '../../core/furniture.js';
import { getFurniturePlanSVG } from '../visualizer.js';
import { parseInput } from '../../core/parser.js';
import { UNITS } from '../../core/units.js';
import { wrapSVGDocument, createExportProvenance, EXPORT_FORMATS } from '../../core/export/export-model.js';
import { attachNumericScrubber } from '../scrubber.js';
import { ShortcutsManager } from '../../core/shortcuts-manager.js';
import {
  STUDIO_PERSONAS,
  TOOL_CATEGORIES,
  STUDIO_TOOL_CATALOG,
  searchStudioTools,
  parseStudioCommand,
  PERSONA_RIBBON_CONFIGS,
  PLANNED_TOOLS
} from '../../core/personas.js';
import { renderStudioRibbon } from '../components/ribbon.js';
import { renderStudioPalette } from '../components/palette.js';
import { renderStudioCPanels } from '../components/cpanels.js';
import { renderStudioCommandBar, updatePrompt } from '../components/commandbar.js';
import { initToolGuidance, updateInspectorGuide } from '../components/tooltip.js';
import { buildCommandRegistry, createCommandSession } from '../../core/cad-commands.js';
import { suggestForEntity, suggestForDocument } from '../../core/suggestions.js';
import { serializeDrawingContext, serializeSelection, serializeToolCapabilities } from '../../core/ai-bridge.js';
import { docTypeIcon, icon } from '../../core/icons.js';
const svgIconClose = icon('delete', { size: 10 });
const svgIconPlus = icon('command', { size: 12 });
const TOOL_ICON_BY_TOOL = {
  select: 'select', room: 'room', polyroom: 'polyroom', wall: 'wall', door: 'door',
  window: 'window', column: 'column', grid: 'grid', stair: 'stair', ramp: 'ramp',
  dimension: 'dimension', measure: 'measure', furniture: 'furniture',
  hatch: 'hatch', north: 'north', text: 'info',
  leader: 'dimension', section_cut: 'section', detail_callout: 'detail',
  material_paint: 'hatch', watercolor_brush: 'hatch', pushpull: 'pushpull'
};

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
  let activeSnap = null; // active snap point indicator { x, y, type, targetEntity }
  let activeGuides = { guidesX: [], guidesY: [] }; // smart alignment guidelines
  const GRID_PRESETS = [0.05, 0.1, 0.25, 0.5, 1.0];
  let furnitureCatalog = [];
  let catalogById = new Map(); // catalog id -> item (footprint symbols)
  let resizeObserver = null;
  let polyRoomVertices = []; // [{x, y}, ...]
  let polyLineVertices = []; // polyline tool: chained vertices, one line entity per segment
  let polyLineCursor = null; // live cursor position for the rubber preview
  let currentMouseWorld = { x: 0, y: 0 };
  let activeSidebarTab = 'entities'; // 'entities' | 'layers'

  // ------------------------------------------------------------------
  // CAD command engine (src/core/cad-commands.js) — one registry derived
  // from the live tool catalog; the command bar, canvas clicks and the
  // deterministic core all meet here.
  // ------------------------------------------------------------------
  function commitEntity(entity, label) {
    const firstEntity = entities().length === 0;
    const cmd = entityAddRemoveCommand(entities(), entity, label);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([entity.id]);
    render();
    updateStudioCPanels();
    // First drawing on an empty canvas: frame it so the user immediately
    // sees the drawn result instead of hunting for it at the default zoom.
    if (firstEntity) {
      fitToContent();
    }
    return entity;
  }

  function executeCadCommand(run, args = {}) {
    switch (run) {
      case 'create_line': {
        const [p1, p2] = args.points;
        const line = createLineEntity({ p1, p2 });
        commitEntity(line, 'create line');
        return { ok: true, message: `Line ${line.length.toFixed(2)} m · ${Math.round(line.angleDegrees)}°` };
      }
      case 'create_wall_points': {
        const [p1, p2] = args.points;
        const thickness = Math.max(0.05, Number(args.options?.WIDTH) || 0.2);
        const wall = createWall({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, thickness });
        commitEntity(wall, 'create wall');
        return { ok: true, message: `Wall ${wallLength(wall).toFixed(2)} m · ${thickness.toFixed(2)} m thick` };
      }
      case 'create_room_points': {
        const [p1, p2] = args.points;
        const w = Math.abs(p2.x - p1.x);
        const d = Math.abs(p2.y - p1.y);
        if (w < 0.3 || d < 0.3) return { ok: false, error: 'Room corners too close — drag a larger rectangle (≥ 0.3 m each side).' };
        const room = createRoom({
          name: `Room ${w.toFixed(1)}x${d.toFixed(1)}m`,
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          width: w,
          depth: d
        });
        commitEntity(room, 'create room');
        return { ok: true, message: `Room ${w.toFixed(2)} × ${d.toFixed(2)} m · ${(w * d).toFixed(1)} m²` };
      }
      case 'measure_points': {
        const [p1, p2] = args.points;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        return { ok: true, message: `Distance ${dist.toFixed(3)} m · Angle ${ang.toFixed(1)}° · Δ(${dx.toFixed(2)}, ${dy.toFixed(2)})` };
      }
      case 'create_dimension': {
        const [p1, p2] = args.points;
        const dim = createDimension({ p1, p2 });
        commitEntity(dim, 'create dimension');
        return { ok: true, message: `Dimension placed · ${Math.hypot(p2.x - p1.x, p2.y - p1.y).toFixed(2)} m` };
      }
      case 'undo': undo(); return { ok: true, message: 'Undo.' };
      case 'redo': redo(); return { ok: true, message: 'Redo.' };
      case 'delete': deleteSelected(); return { ok: true, message: 'Selection deleted.' };
      case 'zoom_extents': fitToContent(); return { ok: true, message: 'Zoom to fit.' };
      case 'zoom': {
        const a = (args.args && args.args[0] ? String(args.args[0]) : 'E').toUpperCase();
        if (a === 'E' || a === 'EXTENTS') { fitToContent(); return { ok: true, message: 'Zoom extents.' }; }
        if (a === 'IN') { zoomStep(1.25); return { ok: true, message: 'Zoom in.' }; }
        if (a === 'OUT') { zoomStep(0.8); return { ok: true, message: 'Zoom out.' }; }
        const num = parseFloat(a);
        if (Number.isFinite(num)) { setZoomPercent(num); return { ok: true, message: `Zoom ${num}%.` }; }
        return { ok: false, error: 'ZOOM expects E (extents), IN, OUT or a percentage — e.g. ZOOM 100.' };
      }
      case 'pan': setTool('pan'); return { ok: true, message: 'Pan tool active — drag to pan.' };
      case 'view_top': handleStudioToolAction('view_top'); return { ok: true, message: 'Top (plan) view.' };
      case 'view_front': handleStudioToolAction('view_south'); return { ok: true, message: 'Front (south) elevation.' };
      case 'view_right': {
        let eDoc = state.plan.documents.find(d => d.type === 'elevation');
        if (!eDoc) {
          createDocument('East Elevation', 'elevation');
          eDoc = state.plan.documents.find(d => d.type === 'elevation');
        }
        if (eDoc) {
          eDoc.elevationDirection = 'east';
          eDoc.name = 'East Elevation';
          switchDocument(eDoc.id);
        }
        return { ok: true, message: 'Right (east) elevation.' };
      }
      case 'view_perspective': handleStudioToolAction('view_perspective'); return { ok: true, message: '3D massing view.' };
      case 'view_4split': handleStudioToolAction('view_4split'); return { ok: true, message: '4-viewport workspace.' };
      case 'tool:select': setTool('select'); return { ok: true, message: 'Selection tool active.' };
      case 'properties': renderPropertiesInspector(); updateStudioCPanels(); return { ok: true, message: 'Properties panel focused on the current selection.' };
      case 'info': {
        const sel = selectedEntities();
        if (sel.length === 0) return { ok: false, error: 'INFO needs a selection — click an entity first (SELECT to activate the pick tool).' };
        showInspectorInfo(sel);
        return { ok: true, message: `Info for ${sel.length} selected entity(ies) shown in the inspector.` };
      }
      case 'suggest': return runSuggestions();
      case 'ai_query': {
        const question = (args.args || []).join(' ') || '';
        startAiQuery(question);
        return { ok: true, message: question ? 'AI query started from the selection.' : 'AI query mode — select entities, then type your question.' };
      }
      case 'ai_analyze': triggerAiCritique('plan_only', { question: 'Analyze this plan: major risks, geometry problems, missing information, circulation and annotation gaps. Cite deterministic evidence for each finding.' }); return { ok: true, message: 'Project-wide AI analysis started.' };
      case 'panel:layers': activeSidebarTab = 'layers'; renderEntityList(); renderLayerList(); return { ok: true, message: 'Layers panel active.' };
      case 'help': {
        const names = [...buildCommandRegistry(STUDIO_TOOL_CATALOG).commands.values()].map(c => c.name);
        return { ok: true, message: `Commands: ${names.join(' · ')}` };
      }
      default:
        if (run.startsWith('tool:')) {
          handleStudioToolAction(run.slice(5));
          return { ok: true };
        }
        return { ok: false, error: `Unhandled command action "${run}".` };
    }
  }

  function selectedEntities() {
    return entities().filter(e => state.plan.selectedIds.has(e.id));
  }

  const cadSession = createCommandSession({
    registry: buildCommandRegistry(STUDIO_TOOL_CATALOG),
    execute: executeCadCommand,
    storage: (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null
  });

  /** Legacy parametric command executor (REC w d · WALL len · STAIR r w · HATCH · INSERT). */
  function onExecuteParsedCommand(parsed) {
    if (!parsed) return;
    if (parsed.type === 'create_room') {
      const w = parsed.width || 4;
      const d = parsed.depth || 3;
      const origin = currentMouseWorld || { x: 2, y: 2 };
      const r = createRoom({
        name: parsed.name || `Room ${w}x${d}m`,
        x: snapToGrid(origin.x, state.plan.grid),
        y: snapToGrid(origin.y, state.plan.grid),
        width: w,
        depth: d
      });
      commitEntity(r, `create ${r.name}`);
      showToast(`Created Room: ${r.name} (${(w * d).toFixed(1)} m²)`, 'success');
      return;
    }
    if (parsed.type === 'create_wall_length') {
      const len = parsed.length || 5;
      const origin = currentMouseWorld || { x: 2, y: 2 };
      const wall = createWall({
        x1: snapToGrid(origin.x, state.plan.grid),
        y1: snapToGrid(origin.y, state.plan.grid),
        x2: snapToGrid(origin.x + len, state.plan.grid),
        y2: snapToGrid(origin.y, state.plan.grid),
        thickness: 0.2
      });
      commitEntity(wall, 'create wall');
      showToast(`Created Wall: ${len}m`, 'success');
      return;
    }
    if (parsed.type === 'create_stair') {
      const risers = parsed.risers || 16;
      const width = parsed.width || 1.1;
      const origin = currentMouseWorld || { x: 2, y: 4 };
      const stair = createStairEntity({
        x: snapToGrid(origin.x, state.plan.grid),
        y: snapToGrid(origin.y, state.plan.grid),
        width: width,
        riserCount: risers
      });
      commitEntity(stair, 'create stair');
      showToast(`Created Stair: ${risers} risers, ${width}m width`, 'success');
      return;
    }
    if (parsed.type === 'set_hatch') {
      state.activeMaterial = parsed.pattern || 'brick';
      setTool('hatch');
      showToast(`Active Hatch: ${state.activeMaterial}. Click a room to apply.`);
      renderContextualToolbar();
      return;
    }
    if (parsed.type === 'insert_block') {
      const blockId = parsed.blockKey || 'DOOR_SINGLE_900';
      const origin = currentMouseWorld || { x: parsed.x || 2, y: parsed.y || 2 };
      const blk = createBlockInstanceEntity({
        blockId,
        x: snapToGrid(origin.x, state.plan.grid),
        y: snapToGrid(origin.y, state.plan.grid)
      });
      commitEntity(blk, `insert ${blk.name}`);
      showToast(`Inserted Block: ${blk.name}`, 'success');
      return;
    }
    if (parsed.type === 'switch_cpanel') {
      state.activeCPanelTab = parsed.panelTab;
      updateStudioCPanels();
      showToast(`C-Panel: ${parsed.panelTab} active`);
      return;
    }
    if (parsed.type === 'set_view') {
      if (parsed.view === 'top') handleStudioToolAction('view_top');
      else if (parsed.view === 'south') handleStudioToolAction('view_south');
      else if (parsed.view === 'perspective') handleStudioToolAction('view_perspective');
      else if (parsed.view === '4view') handleStudioToolAction('view_4split');
      return;
    }
    if (parsed.type === 'set_tool') {
      handleStudioToolAction(parsed.toolId || parsed.verb);
      return;
    }
  }

  function initDocuments() {
    if (!state.plan) state.plan = {};
    if (!Array.isArray(state.plan.documents) || state.plan.documents.length === 0) {
      const initialDoc = {
        id: 'doc-1',
        name: 'Ground Floor',
        type: '2d_plan',
        entities: Array.isArray(state.plan.entities) ? state.plan.entities : [],
        viewport: { zoom: transform.zoom, offsetX: transform.offsetX, offsetY: transform.offsetY }
      };
      state.plan.documents = [initialDoc];
      state.plan.activeDocId = initialDoc.id;
    }
    if (!state.plan.activeDocId || !state.plan.documents.some(d => d.id === state.plan.activeDocId)) {
      state.plan.activeDocId = state.plan.documents[0].id;
    }
    const active = getActiveDocument();
    state.plan.entities = active.entities || [];
  }

  function getActiveDocument() {
    if (!state.plan || !Array.isArray(state.plan.documents) || state.plan.documents.length === 0) {
      initDocuments();
    }
    const doc = state.plan.documents.find(d => d.id === state.plan.activeDocId) || state.plan.documents[0];
    if (doc && doc.type !== '3d_massing' && doc.type !== 'sheet' && doc.type !== 'elevation' && doc.type !== 'section') {
      normalizeDocumentLayers(doc);
    }
    return doc;
  }

  function switchDocument(docId) {
    if (!state.plan || state.plan.activeDocId === docId) return;
    const prevDoc = getActiveDocument();
    if (prevDoc && prevDoc.viewport) {
      prevDoc.viewport = { zoom: transform.zoom, offsetX: transform.offsetX, offsetY: transform.offsetY };
    }
    const target = state.plan.documents.find(d => d.id === docId);
    if (!target) return;
    state.plan.activeDocId = target.id;
    state.plan.entities = target.entities || [];
    state.plan.selectedIds = new Set();
    // Undo commands close over the previous document's entity objects; keeping
    // them would let a later Ctrl+Z mutate the now-hidden document.
    history.clear();
    if (target.viewport && typeof target.viewport.zoom === 'number') {
      transform = {
        zoom: target.viewport.zoom,
        offsetX: target.viewport.offsetX,
        offsetY: target.viewport.offsetY
      };
    }
    renderTabs();
    render();
    renderEntityList();
    renderPropertiesInspector();
    showToast(`Switched to "${target.name}"`);
    AudioService.playTick();
  }

  function createDocument(name, type = '2d_plan') {
    initDocuments();
    const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    let newDoc;

    if (type === '3d_massing') {
      const count = state.plan.documents.filter(d => d.type === '3d_massing').length + 1;
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : (count === 1 ? '3D Massing Preview' : `3D Massing ${count}`);
      newDoc = {
        id: docId,
        name: docName,
        type: '3d_massing',
        camera: { azimuth: 45, elevation: 35.264, zoom: 32, panX: svg.width / 2, panY: svg.height / 2 + 30 },
        massingOptions: { wallHeight: 3.0, doorHeight: 2.1, windowSill: 0.9, windowHeight: 1.2, slabThickness: 0.2, wireframe: false }
      };
    } else if (type === 'elevation') {
      const count = state.plan.documents.filter(d => d.type === 'elevation').length + 1;
      const dirs = ['south', 'north', 'east', 'west'];
      const dir = dirs[(count - 1) % dirs.length];
      const dirLabels = { south: 'South Elevation', north: 'North Elevation', east: 'East Elevation', west: 'West Elevation' };
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : dirLabels[dir];
      newDoc = {
        id: docId,
        name: docName,
        type: 'elevation',
        elevationDirection: dir,
        multiStory: true
      };
    } else if (type === 'section') {
      const count = state.plan.documents.filter(d => d.type === 'section').length + 1;
      const labels = ['A', 'B', 'C', 'D'];
      const lbl = labels[(count - 1) % labels.length];
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : `Section ${lbl}-${lbl}`;
      newDoc = {
        id: docId,
        name: docName,
        type: 'section',
        sectionCut: { label: lbl, direction: 'forward' },
        multiStory: true,
        poche: true
      };
    } else if (type === 'detail') {
      const count = state.plan.documents.filter(d => d.type === 'detail').length + 1;
      const detailKeys = ['footing', 'parapet', 'window_sill', 'stair_nosing'];
      const dKey = detailKeys[(count - 1) % detailKeys.length];
      const dNames = {
        footing: 'Strip Footing Detail',
        parapet: 'Roof Parapet Detail',
        window_sill: 'Window Sill Detail',
        stair_nosing: 'Stair Nosing Detail'
      };
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : dNames[dKey];
      newDoc = {
        id: docId,
        name: docName,
        type: 'detail',
        detailKey: dKey,
        scale: 10
      };
    } else if (type === 'sheet') {
      const count = state.plan.documents.filter(d => d.type === 'sheet').length + 1;
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : `Sheet A-10${count}`;
      newDoc = {
        id: docId,
        name: docName,
        type: 'sheet',
        sheetConfig: createSheetConfig({ sheetNumber: `A-10${count}`, sheetTitle: 'GROUND FLOOR PLAN' })
      };
    } else if (type === 'view_4split' || type === '4view') {
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : '4-Viewport Split';
      newDoc = {
        id: docId,
        name: docName,
        type: 'view_4split',
        camera: { azimuth: 45, elevation: 35.264, zoom: 24, panX: svg.width / 4, panY: svg.height / 4 + 20 }
      };
    } else {
      const count = state.plan.documents.filter(d => d.type === '2d_plan' || d.type === '2d').length + 1;
      const docName = (typeof name === 'string' && name.trim())
        ? name.trim()
        : `Level ${count}`;
      newDoc = {
        id: docId,
        name: docName,
        type: '2d_plan',
        entities: [],
        viewport: { zoom: 40, offsetX: 60, offsetY: 420 }
      };
    }

    state.plan.documents.push(newDoc);
    switchDocument(newDoc.id);
  }

  function closeDocument(docId) {
    initDocuments();
    if (state.plan.documents.length <= 1) {
      showToast('Cannot close the last drawing tab', 'warning');
      return;
    }
    const idx = state.plan.documents.findIndex(d => d.id === docId);
    if (idx === -1) return;
    const docToClose = state.plan.documents[idx];
    state.plan.documents.splice(idx, 1);
    if (state.plan.activeDocId === docId) {
      const nextDoc = state.plan.documents[Math.max(0, idx - 1)];
      switchDocument(nextDoc.id);
    } else {
      renderTabs();
    }
    showToast(`Closed tab "${docToClose.name}"`);
  }

  function renameDocument(docId, newName) {
    initDocuments();
    const doc = state.plan.documents.find(d => d.id === docId);
    if (!doc) return;
    const trimmed = typeof newName === 'string' ? newName.trim() : '';
    if (!trimmed) return;
    doc.name = trimmed;
    renderTabs();
    showToast(`Renamed tab to "${doc.name}"`);
  }

  function renderTabs() {
    const listEl = dom.planDocTabsList || document.getElementById('plan-doc-tabs-list');
    if (!listEl) return;
    initDocuments();
    listEl.innerHTML = '';
    state.plan.documents.forEach(doc => {
      const isActive = doc.id === state.plan.activeDocId;
      const tab = document.createElement('div');
      tab.className = `plan-doc-tab ${isActive ? 'active' : ''}`;
      tab.dataset.docId = doc.id;

      const typeGlyph = docTypeIcon(doc.type, { size: 13 });
      const titleSpan = document.createElement('span');
      titleSpan.className = 'plan-doc-tab-title';
      titleSpan.innerHTML = `${typeGlyph}<span class="tab-title-text"></span>`;
      titleSpan.querySelector('.tab-title-text').textContent = doc.name;
      titleSpan.title = 'Double click to rename tab';

      titleSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const currentName = doc.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'calc-input';
        input.style.cssText = 'height: 22px; padding: 0 4px; font-size: 0.72rem; width: 110px;';
        tab.replaceChild(input, titleSpan);
        input.focus();
        input.select();
        const commit = () => {
          const val = input.value.trim() || currentName;
          renameDocument(doc.id, val);
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') { input.value = currentName; input.blur(); }
        });
      });

      tab.appendChild(titleSpan);

      if (state.plan.documents.length > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'plan-doc-tab-close';
        closeBtn.innerHTML = svgIconClose;
        closeBtn.setAttribute('aria-label', `Close ${doc.name}`);
        closeBtn.title = `Close ${doc.name}`;
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeDocument(doc.id);
        });
        tab.appendChild(closeBtn);
      }

      tab.addEventListener('click', () => {
        switchDocument(doc.id);
      });

      listEl.appendChild(tab);
    });
  }

  function showHud(lengthVal, angleVal) {
    const hudEl = dom.planNumericHud || document.getElementById('plan-numeric-hud');
    const hudLenInput = dom.hudInputLength || document.getElementById('hud-input-length');
    const hudAngInput = dom.hudInputAngle || document.getElementById('hud-input-angle');
    if (!hudEl || !hudLenInput || !hudAngInput) return;
    hudEl.style.display = 'flex';
    if (document.activeElement !== hudLenInput && document.activeElement !== hudAngInput) {
      if (typeof lengthVal === 'number' && isFinite(lengthVal)) {
        hudLenInput.value = `${lengthVal.toFixed(2)}m`;
      }
      if (typeof angleVal === 'number' && isFinite(angleVal)) {
        hudAngInput.value = `${angleVal.toFixed(0)}°`;
      }
    }
  }

  function hideHud() {
    const hudEl = dom.planNumericHud || document.getElementById('plan-numeric-hud');
    const hudLenInput = dom.hudInputLength || document.getElementById('hud-input-length');
    const hudAngInput = dom.hudInputAngle || document.getElementById('hud-input-angle');
    if (!hudEl) return;
    hudEl.style.display = 'none';
    if (document.activeElement === hudLenInput || document.activeElement === hudAngInput) {
      document.activeElement.blur();
    }
  }

  function applyHud() {
    const hudLenInput = dom.hudInputLength || document.getElementById('hud-input-length');
    const hudAngInput = dom.hudInputAngle || document.getElementById('hud-input-angle');
    if (!dragState || dragState.mode !== 'create') {
      hideHud();
      return;
    }
    const lenStr = hudLenInput?.value || '';
    const angStr = hudAngInput?.value || '';
    let parsedLen = parseFloat(lenStr);
    if (isNaN(parsedLen) || parsedLen <= 0) return;
    if (lenStr.toLowerCase().includes('mm')) parsedLen /= 1000;
    else if (lenStr.toLowerCase().includes('cm')) parsedLen /= 100;

    let parsedAng = parseFloat(angStr.replace('°', ''));
    if (isNaN(parsedAng)) parsedAng = 0;
    const rad = (parsedAng * Math.PI) / 180;

    const start = dragState.start;
    const end = {
      x: start.x + parsedLen * Math.cos(rad),
      y: start.y + parsedLen * Math.sin(rad)
    };
    dragState.current = end;
    if (dragState.tool === 'wall') {
      createWallEntity(start, end);
    } else if (dragState.tool === 'room') {
      createRoomEntity(start, end);
    } else if (dragState.tool === 'dimension') {
      createDimensionEntity(start, end);
    }
    dragState = null;
    hideHud();
    render();
  }

  function setupHudListeners() {
    const hudLenInput = dom.hudInputLength || document.getElementById('hud-input-length');
    const hudAngInput = dom.hudInputAngle || document.getElementById('hud-input-angle');
    if (hudLenInput) {
      hudLenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyHud();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          hudAngInput?.focus();
          hudAngInput?.select();
        } else if (e.key === 'Escape') {
          hideHud();
        }
      });
    }
    if (hudAngInput) {
      hudAngInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyHud();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          hudLenInput?.focus();
          hudLenInput?.select();
        } else if (e.key === 'Escape') {
          hideHud();
        }
      });
    }
  }

  function finishPolyRoom() {
    if (polyRoomVertices.length < 3) {
      polyRoomVertices = [];
      render();
      renderContextualToolbar();
      return;
    }
    const boundary = polyRoomVertices.map(p => ({ x: p.x, y: p.y }));
    polyRoomVertices = [];
    let room;
    try {
      room = createRoom({
        name: `Room ${entities().filter(e => e.kind === 'room').length + 1}`,
        boundary
      });
    } catch (e) {
      showToast(e.message, 'warning');
      render();
      renderContextualToolbar();
      return;
    }
    const cmd = entityAddRemoveCommand(entities(), room, `add room ${room.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([room.id]);
    showToast(`Polygonal Room added: ${boundary.length} vertices (${roomArea(room).toFixed(1)} m²)`);
    AudioService.playTick();
    render();
    renderContextualToolbar();
  }

  function cancelPolyRoom() {
    polyRoomVertices = [];
    render();
    renderContextualToolbar();
    showToast('Polygonal room cancelled');
  }

  /**
   * Polyline tool: finishes the click chain. Every consecutive vertex pair
   * becomes one line entity (N clicks → N−1 segments), so the entity model
   * stays primitive and each segment is individually selectable/editable.
   * Keyboard: Esc cancels · Enter finishes the open chain.
   */
  function finishPolyline() {
    if (polyLineVertices.length < 2) {
      polyLineVertices = [];
      render();
      renderContextualToolbar();
      return;
    }
    const created = [];
    const cmds = [];
    for (let i = 0; i < polyLineVertices.length - 1; i++) {
      const a = polyLineVertices[i];
      const b = polyLineVertices[i + 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-4) continue;
      try {
        const line = createLineEntity({ p1: a, p2: b, name: `Polyline ${i + 1}` });
        const cmd = entityAddRemoveCommand(entities(), line, `polyline segment ${i + 1}`);
        cmds.push({ cmd, line });
      } catch (e) {
        showToast(e.message, 'warning');
      }
    }
    polyLineVertices = [];
    for (const { cmd, line } of cmds) {
      cmd.redo();
      history.push(cmd);
      created.push(line.id);
    }
    if (created.length > 0) {
      state.plan.selectedIds = new Set(created);
      showToast(`Polyline added: ${created.length} segment(s)`, 'success');
    }
    AudioService.playTick();
    render();
    renderContextualToolbar();
  }

  function cancelPolyline() {
    polyLineVertices = [];
    polyLineCursor = null;
    render();
    renderContextualToolbar();
    showToast('Polyline cancelled');
  }

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
    syncSvgSize(); // fit against the REAL current panel size, not a stale cached box
    const es = entities();
    if (es.length === 0) {
      // Sensible default framing: a 12m-wide view centered near origin
      transform = createViewTransform({ zoom: Math.max(20, Math.min(svg.width / 14, 200)) });
      transform.offsetX = svg.width / 2 - 6 * transform.zoom;
      transform.offsetY = svg.height / 2 + 5 * transform.zoom;
      savePrefs();
      render();
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of es) {
      if (!e) continue;
      if (e.kind === 'door' || e.kind === 'window') continue; // hosted on wall, bounds covered by host wall
      if (e.kind === 'dimension') {
        const p1 = e.p1 || (typeof e.x1 === 'number' ? { x: e.x1, y: e.y1 } : (typeof e.x === 'number' ? { x: e.x, y: e.y } : null));
        const p2 = e.p2 || (typeof e.x2 === 'number' ? { x: e.x2, y: e.y2 } : (p1 ? { x: p1.x + (e.width ?? 0), y: p1.y + (e.depth ?? 0) } : null));
        if (!p1 || !p2) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        const offset = Number(e.offset ?? 0.6);
        minX = Math.min(minX, p1.x, p2.x);
        minY = Math.min(minY, p1.y, p2.y);
        maxX = Math.max(maxX, p1.x, p2.x);
        maxY = Math.max(maxY, p1.y, p2.y);
        if (len > 1e-4) {
          const nx = -dy / len;
          const ny = dx / len;
          const totalOff = offset + Math.sign(offset || 1) * 0.25;
          const dp1x = p1.x + nx * totalOff;
          const dp1y = p1.y + ny * totalOff;
          const dp2x = p2.x + nx * totalOff;
          const dp2y = p2.y + ny * totalOff;
          minX = Math.min(minX, dp1x, dp2x);
          minY = Math.min(minY, dp1y, dp2y);
          maxX = Math.max(maxX, dp1x, dp2x);
          maxY = Math.max(maxY, dp1y, dp2y);
        }
        continue;
      }
      const r = e.kind === 'wall' ? wallRect(e)
        : (typeof e.x === 'number' ? { x: e.x, y: e.y, width: e.width ?? 0, depth: e.depth ?? 0 } : null);
      if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.y)) continue;
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + (r.width || 0)); maxY = Math.max(maxY, r.y + (r.depth || 0));
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      transform = createViewTransform({ zoom: Math.max(20, Math.min(svg.width / 14, 200)) });
      transform.offsetX = svg.width / 2 - 6 * transform.zoom;
      transform.offsetY = svg.height / 2 + 5 * transform.zoom;
      savePrefs();
      render();
      return;
    }
    const wM = Math.max(maxX - minX, 0.5);
    const dM = Math.max(maxY - minY, 0.5);
    // Small padding so strokes/handles at the edges are not clipped
    const padFactor = 1.12;
    const zoom = Math.min((svg.width / (wM * padFactor)), (svg.height / (dM * padFactor)));
    const finalZoom = Number.isFinite(zoom) ? Math.max(4, Math.min(400, zoom)) : 40;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    transform = {
      zoom: finalZoom,
      offsetX: svg.width / 2 - cx * finalZoom,
      offsetY: svg.height / 2 + cy * finalZoom
    };
    savePrefs();
    render();
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

  function entities() {
    if (!Array.isArray(state.plan?.entities)) {
      if (state.plan) state.plan.entities = [];
      return [];
    }
    return state.plan.entities;
  }

  function savePrefs() {
    try {
      StorageService.setItem(PLAN_STATE_KEY, JSON.stringify({
        tool: state.plan.tool,
        grid: state.plan.grid,
        snap: state.plan.snap !== false,
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

  function cycleGrid() {
    const cur = state.plan.grid || 0.5;
    let idx = GRID_PRESETS.findIndex(g => Math.abs(g - cur) < 0.001);
    if (idx === -1) idx = 3;
    const nextIdx = (idx + 1) % GRID_PRESETS.length;
    state.plan.grid = GRID_PRESETS[nextIdx];
    if (dom.planGridSelect) dom.planGridSelect.value = String(state.plan.grid);
    updateStatusBar();
    savePrefs();
    render();
    showToast(`Grid: ${state.plan.grid}m`);
    AudioService.playTick();
  }

  function toggleSnap() {
    state.plan.snap = state.plan.snap === false ? true : false;
    updateStatusBar();
    savePrefs();
    showToast(`Object & Grid Snap: ${state.plan.snap ? 'ON' : 'OFF'}`);
    AudioService.playTick();
  }

  function setTool(newTool) {
    if (!newTool) return;
    // Switching tools cancels any dangling click-chain (polyroom/polyline)
    // so a half-drawn chain can never silently survive a tool change.
    if (newTool !== 'polyroom' && polyRoomVertices.length > 0) {
      polyRoomVertices = [];
    }
    if (newTool !== 'polyline' && polyLineVertices.length > 0) {
      polyLineVertices = [];
      polyLineCursor = null;
    }
    state.plan.tool = newTool;
    const palette = dom.planToolPalette || document.getElementById('plan-tool-palette');
    if (palette) {
      palette.querySelectorAll('.tool-palette-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === newTool);
      });
    }
    const ribbonContainer = document.getElementById('studio-ribbon-container');
    if (ribbonContainer) {
      ribbonContainer.querySelectorAll('.ribbon-tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === newTool);
      });
    }
    const paletteContainer = document.getElementById('studio-palette-container');
    if (paletteContainer) {
      paletteContainer.querySelectorAll('.palette-tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === newTool);
      });
    }
    if (dom.planToolSelect) dom.planToolSelect.value = newTool;
    if (dom.planModeLabel) dom.planModeLabel.textContent = newTool.toUpperCase();
    syncToolVisibility();
    savePrefs();
    renderContextualToolbar();
    updateInspectorGuide(newTool);
    showToast(`Tool: ${newTool.charAt(0).toUpperCase() + newTool.slice(1)}`);
  }

  function duplicateSelected() {
    const selectedId = Array.from(state.plan.selectedIds || [])[0];
    if (!selectedId) {
      showToast('Select an entity to duplicate', 'warning');
      return;
    }
    const original = entities().find(x => x.id === selectedId);
    if (!original) return;
    const clone = duplicateEntity(original, { x: 0.5, y: 0.5 });
    const cmd = entityAddRemoveCommand(entities(), clone, `duplicate ${original.name || original.kind}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([clone.id]);
    showToast(`Duplicated ${clone.name || clone.kind}`);
    AudioService.playTick();
    render();
  }

  function updateStatusBar(coords) {
    const statusBar = dom.planStatusBar || document.getElementById('plan-status-bar');
    if (!statusBar) return;

    const coordsEl = dom.statusCoordsVal || document.getElementById('status-coords-val');
    if (coordsEl && coords && typeof coords.x === 'number' && isFinite(coords.x)) {
      coordsEl.textContent = `X: ${coords.x.toFixed(2)}m  Y: ${coords.y.toFixed(2)}m`;
    }

    const cmdCoords = document.getElementById('commandbar-coords');
    if (cmdCoords && coords && typeof coords.x === 'number' && isFinite(coords.x)) {
      cmdCoords.innerHTML = `X: ${coords.x.toFixed(2)} m &nbsp; Y: ${coords.y.toFixed(2)} m`;
    }

    const gridEl = dom.statusGridVal || document.getElementById('status-grid-val');
    if (gridEl) {
      gridEl.textContent = `${(state.plan.grid || 0.5).toFixed(2)}m`;
    }

    const snapEl = dom.statusSnapVal || document.getElementById('status-snap-val');
    const snapBtn = dom.statusSnapBtn || document.getElementById('status-snap-btn');
    const snapOn = state.plan.snap !== false;
    if (snapEl) snapEl.textContent = snapOn ? 'ON' : 'OFF';
    if (snapBtn) snapBtn.classList.toggle('active', snapOn);

    const zoomEl = dom.statusZoomVal || document.getElementById('status-zoom-val');
    if (zoomEl) zoomEl.textContent = `${transform.zoom.toFixed(0)} px/m`;

    const selEl = dom.statusSelVal || document.getElementById('status-sel-val');
    if (selEl) {
      const selCount = state.plan.selectedIds ? state.plan.selectedIds.size : 0;
      if (selCount === 0) {
        selEl.textContent = 'None';
      } else if (selCount === 1) {
        const selId = Array.from(state.plan.selectedIds)[0];
        const ent = entities().find(e => e.id === selId);
        selEl.textContent = ent ? (ent.name || ent.kind) : '1 Item';
      } else {
        selEl.textContent = `${selCount} Items`;
      }
    }
  }

  function handleStudioToolAction(toolId) {
    if (!toolId) return;
    // Ghost-tool contract: tools with no implementation behind them answer
    // honestly instead of silently activating and doing nothing.
    if (PLANNED_TOOLS.has(toolId)) {
      const def = STUDIO_TOOL_CATALOG.find(t => t.id === toolId);
      showToast(`"${def ? def.name : toolId}" is planned but not implemented yet — nothing was activated.`, 'warning');
      AudioService.playTick();
      return;
    }
    updateInspectorGuide(toolId);

    if (toolId === 'undo') {
      undo();
      return;
    }
    if (toolId === 'redo') {
      redo();
      return;
    }
    if (toolId === 'delete') {
      deleteSelected();
      return;
    }
    if (toolId === 'copy' || toolId === 'duplicate') {
      duplicateSelected();
      return;
    }
    if (toolId === 'fit' || toolId === 'zoom_extents') {
      fitToContent();
      return;
    }
    if (toolId === 'ai_critique' || toolId === 'ai_suggest' || toolId === 'ai_prompt') {
      if (typeof window !== 'undefined' && window.__ahhAiDrawer && typeof window.__ahhAiDrawer.open === 'function') {
        window.__ahhAiDrawer.open();
      } else {
        triggerAiCritique();
      }
      return;
    }
    if (toolId === 'view_top') {
      const pDoc = state.plan.documents && state.plan.documents.find(d => d.type === '2d_plan' || d.type === '2d');
      if (pDoc) switchDocument(pDoc.id);
      else createDocument('Level 1', '2d_plan');
      return;
    }
    if (toolId === 'view_south' || toolId === 'elevation') {
      const eDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'elevation');
      if (eDoc) switchDocument(eDoc.id);
      else createDocument('South Elevation', 'elevation');
      return;
    }
    if (toolId === 'view_perspective' || toolId === 'massing' || toolId === 'box' || toolId === 'extrude' || toolId === 'loft') {
      const mDoc = state.plan.documents && state.plan.documents.find(d => d.type === '3d_massing');
      if (mDoc) switchDocument(mDoc.id);
      else createDocument('3D Massing Preview', '3d_massing');
      return;
    }
    if (toolId === 'view_4split' || toolId === '4view') {
      const splitDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'view_4split' || d.type === '4view');
      if (splitDoc) switchDocument(splitDoc.id);
      else createDocument('4-Viewport Split', 'view_4split');
      showToast('Switched to Rhino 4-Viewport Split (Top, Perspective, Front, Right)');
      return;
    }
    if (toolId === 'pushpull') {
      const cur = getActiveDocument();
      if (cur && cur.type !== '3d_massing') {
        const mDoc = state.plan.documents && state.plan.documents.find(d => d.type === '3d_massing');
        if (mDoc) switchDocument(mDoc.id);
        else createDocument('3D Massing Preview', '3d_massing');
        showToast('Push/Pull Massing: 3D extruded volume active');
        return;
      }
      setTool('pushpull');
      return;
    }
    if (toolId === 'hatch') {
      setTool('hatch');
      showToast('Architectural Hatch active. Pick pattern in toolbar & click room.');
      renderContextualToolbar();
      return;
    }
    if (toolId === 'material_paint') {
      setTool('material_paint');
      showToast('Material Paint active. Pick finish in toolbar & click room.');
      renderContextualToolbar();
      return;
    }
    if (toolId === 'watercolor_brush') {
      setTool('watercolor_brush');
      showToast('Presentation Brush active. Pick wash in toolbar & click room.');
      renderContextualToolbar();
      return;
    }
    if (toolId === 'section') {
      const sDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'section');
      if (sDoc) switchDocument(sDoc.id);
      else createDocument('Section A-A', 'section');
      return;
    }
    if (toolId === 'sheet') {
      const shDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'sheet');
      if (shDoc) switchDocument(shDoc.id);
      else createDocument('Sheet A-101', 'sheet');
      return;
    }
    if (toolId === 'details') {
      const dDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'detail');
      if (dDoc) switchDocument(dDoc.id);
      else createDocument('Strip Footing Detail', 'detail');
      return;
    }

    // Standard C-Panels
    if (toolId.startsWith('cpanel_')) {
      const pTab = toolId.replace('cpanel_', '');
      state.activeCPanelTab = pTab;
      updateStudioCPanels();
      showToast(`C-Panel: ${pTab.charAt(0).toUpperCase() + pTab.slice(1)} active`);
      return;
    }

    // Ribbon Tab Suites
    if (toolId.startsWith('tab_switch_')) {
      const rTab = toolId.replace('tab_switch_', '');
      state.activeRibbonTab = rTab;
      renderStudioComponents();
      showToast(`Ribbon Suite: ${rTab.charAt(0).toUpperCase() + rTab.slice(1)} active`);
      return;
    }

    // Cascades & Flyouts
    if (toolId.startsWith('flyout_')) {
      if (toolId === 'flyout_stairs') setTool('stair');
      else if (toolId === 'flyout_hatching') setTool('hatch');
      else if (toolId === 'flyout_marquee') setTool('select'); // box-select lives on the Select tool
      showToast(`Flyout cascade activated: ${toolId}`);
      return;
    }

    // Ribbon Panels
    if (toolId.startsWith('panel_')) {
      showToast(`Ribbon panel focused: ${toolId}`);
      return;
    }

    // Tools that map onto an existing capability under a different name
    const ALIASED_ROUTES = {
      marquee: 'select',          // box-select lives on the Select tool
      marquee_rect: 'select', marquee_ellip: 'select', marquee_single_row: 'select',
      dim_aligned: 'dimension',   // aligned dimension = the dimension tool
      area_calc: 'measure',       // area/perimeter inquiry = the measure tool
      paint_bucket: 'material_paint',
      stair_l_shape: 'stair', stair_u_shape: 'stair',
      hatch_concrete: 'hatch', hatch_earth: 'hatch', hatch_insulation: 'hatch', hatch_brick: 'hatch',
      zoom_extents: 'zoom_extents'
    };
    if (ALIASED_ROUTES[toolId] && ALIASED_ROUTES[toolId] !== toolId) {
      const target = ALIASED_ROUTES[toolId];
      if (target === 'material_paint') {
        state.activeMaterial = state.activeMaterial || 'brick';
        setTool('material_paint');
        showToast('Material Paint active — click a room to apply the material.', 'info');
      } else {
        setTool(target);
      }
      return;
    }

    // pan: real viewport-drag tool
    if (toolId === 'pan') { setTool('pan'); return; }
    // orbit: 3D camera drag lives on the massing document
    if (toolId === 'orbit') { executeCadCommand('view_perspective'); return; }

    // Standard drawing/editing tool selection
    setTool(toolId);
  }

  function updateStudioCPanels() {
    const cpanelsHost = document.getElementById('studio-cpanels-container');
    if (!cpanelsHost) return;
    const es = entities();
    const doc = getActiveDocument();
    const selectedId = Array.from(state.plan.selectedIds || [])[0];
    const selected = selectedId ? es.find(x => x.id === selectedId) : null;
    const rooms = es.filter(e => e.kind === 'room');
    const totalArea = rooms.reduce((sum, r) => sum + (typeof r.width === 'number' && typeof r.depth === 'number' ? roomArea(r) : 0), 0);

    renderStudioCPanels(cpanelsHost, {
      activePanelTab: state.activeCPanelTab || 'properties',
      activeToolId: state.plan.tool || 'select',
      selectedEntity: selected,
      entityCount: es.length,
      layerCount: normalizeDocumentLayers(doc).length,
      onSelectPanelTab: (tabId) => {
        state.activeCPanelTab = tabId;
        updateStudioCPanels();
      },
      onSelectDetailLink: () => {
        const dDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'detail');
        if (dDoc) switchDocument(dDoc.id);
        else createDocument('Strip Footing Detail', 'detail');
      }
    });

    initToolGuidance(cpanelsHost);

    const grossEl = cpanelsHost.querySelector('#cpanel-metric-gross-area');
    if (grossEl) grossEl.textContent = `${totalArea.toFixed(1)} m²`;
    const roomsEl = cpanelsHost.querySelector('#cpanel-metric-rooms-count');
    if (roomsEl) roomsEl.textContent = `${rooms.length} Rooms`;

    const autoTagBtn = cpanelsHost.querySelector('#cpanel-auto-tag-btn');
    if (autoTagBtn) {
      autoTagBtn.addEventListener('click', () => {
        const added = autoTagDocument(doc);
        if (added > 0) {
          showToast(`Auto-tagged ${added} entity/entities!`);
          render();
        } else {
          showToast('All items already tagged');
        }
      });
    }
  }

  function setupFloatingViewportHud() {
    const wrap = document.getElementById('plan-svg-wrap');
    if (!wrap) return;
    let hud = document.getElementById('plan-floating-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'plan-floating-hud';
      hud.className = 'plan-floating-hud';
      hud.setAttribute('role', 'toolbar');
      hud.setAttribute('aria-label', 'Floating Viewport HUD Controls');
      hud.innerHTML = `
        <button type="button" class="hud-btn" id="hud-zoom-out" data-tool="zoom_out" title="Zoom Out (−)">−</button>
        <button type="button" class="hud-btn" id="hud-zoom-in" data-tool="zoom_in" title="Zoom In (+)">+</button>
        <button type="button" class="hud-btn hud-btn-text" id="hud-fit" data-tool="zoom_extents" title="Fit Drawing to Screen">Fit</button>
        <button type="button" class="hud-btn hud-btn-text" id="hud-100" title="100% 1:1 Scale">100%</button>
        <div class="hud-divider"></div>
        <button type="button" class="hud-btn hud-btn-icon" id="hud-4view" title="4-Viewport Split (4VIEW)">⊞</button>
        <button type="button" class="hud-btn hud-btn-icon" id="hud-3d" title="3D Massing Preview (PERSP)">🏢</button>
      `;
      wrap.appendChild(hud);

      hud.querySelector('#hud-zoom-out')?.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomStep(1 / 1.3);
      });
      hud.querySelector('#hud-zoom-in')?.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomStep(1.3);
      });
      hud.querySelector('#hud-fit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        fitToContent();
      });
      hud.querySelector('#hud-100')?.addEventListener('click', (e) => {
        e.stopPropagation();
        setZoomPercent(100);
      });
      hud.querySelector('#hud-4view')?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleStudioToolAction('view_4split');
      });
      hud.querySelector('#hud-3d')?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleStudioToolAction('view_perspective');
      });

      initToolGuidance(hud);
    }
  }

  function renderStudioComponents() {
    const ribbonHost = document.getElementById('studio-ribbon-container');
    const paletteHost = document.getElementById('studio-palette-container');
    const commandbarHost = document.getElementById('studio-commandbar-container');

    const activePersona = state.activePersona || 'studio';
    const activeRibbonTab = state.activeRibbonTab || (PERSONA_RIBBON_CONFIGS[activePersona] && PERSONA_RIBBON_CONFIGS[activePersona].tabs[0] && PERSONA_RIBBON_CONFIGS[activePersona].tabs[0].id) || 'home';
    const activeToolId = state.plan.tool || 'select';

    if (ribbonHost) {
      renderStudioRibbon(ribbonHost, {
        activePersona,
        activeRibbonTab,
        activeToolId,
        onSelectPersona: (personaId) => {
          state.activePersona = personaId;
          const config = PERSONA_RIBBON_CONFIGS[personaId];
          if (config && config.tabs && config.tabs.length > 0) {
            state.activeRibbonTab = config.tabs[0].id;
          }
          renderStudioComponents();
          updateStudioCPanels();
          showToast(`Workspace Persona: ${STUDIO_PERSONAS[personaId]?.name || personaId}`);
        },
        onSelectRibbonTab: (tabId) => {
          state.activeRibbonTab = tabId;
          renderStudioComponents();
        },
        onSelectTool: (toolId) => {
          handleStudioToolAction(toolId);
        }
      });
      initToolGuidance(ribbonHost);
    }

    if (paletteHost) {
      renderStudioPalette(paletteHost, {
        activePersona,
        activeToolId,
        onSelectTool: (toolId) => {
          handleStudioToolAction(toolId);
        },
        onSelectRibbonTab: (tabId, personaId) => {
          if (personaId && personaId !== state.activePersona) {
            state.activePersona = personaId;
          }
          state.activeRibbonTab = tabId;
          renderStudioComponents();
          showToast(`Switched to tab: ${tabId}`);
        }
      });
      initToolGuidance(paletteHost);
    }

    updateStudioCPanels();
    setupFloatingViewportHud();

    if (commandbarHost) {
      renderStudioCommandBar(commandbarHost, {
        coords: currentMouseWorld,
        grid: state.plan.grid || 0.5,
        snap: state.plan.snap !== false,
        ortho: state.plan.ortho !== false,
        session: cadSession,
        getCurrentPoint: () => currentMouseWorld,
        snapPoint: (p) => ({ x: snapToGrid(p.x, state.plan.grid), y: snapToGrid(p.y, state.plan.grid) }),
        onLegacyCommand: (raw) => {
          const parsed = parseStudioCommand(raw, { coords: currentMouseWorld });
          if (!parsed) return null;
          if (parsed.type === 'unknown') return null;
          onExecuteParsedCommand(parsed);
          return { handled: true, verb: parsed.verb || parsed.type };
        },
        onAfterRun: (res) => {
          if (res && res.handled) AudioService.playTick();
        },
        onToggleSnap: () => {
          toggleSnap();
        },
        onToggleOrtho: () => {
          state.plan.ortho = state.plan.ortho === false ? true : false;
          showToast(`Ortho Mode: ${state.plan.ortho ? 'ON' : 'OFF'}`);
          renderStudioComponents();
        }
      });
    }
  }

  function renderContextualToolbar() {
    const bar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (!bar) return;

    const selCount = state.plan.selectedIds ? state.plan.selectedIds.size : 0;
    const selectedId = selCount === 1 ? Array.from(state.plan.selectedIds)[0] : null;
    const sel = selectedId ? entities().find(e => e.id === selectedId) : null;

    if (!sel || selCount === 0) {
      if (polyLineVertices.length > 0) {
        toolbar.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="context-tag-badge" style="background: rgba(56, 189, 248, 0.18); color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">POLYLINE</span>
              <span style="font-size: 0.75rem; color: var(--text-primary); font-weight: 600;">${polyLineVertices.length} point${polyLineVertices.length === 1 ? '' : 's'} placed</span>
              <span style="font-size: 0.70rem; color: var(--text-muted);">Click to chain segments · Enter finishes the open chain · Esc cancels</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${polyLineVertices.length >= 2 ? '<button type="button" class="result-action-btn primary" id="ctx-finish-polyline" style="font-size: 0.68rem; padding: 2px 8px;">✓ Finish Polyline</button>' : ''}
              <button type="button" class="result-action-btn" id="ctx-cancel-polyline" style="font-size: 0.68rem; padding: 2px 8px;">✕ Cancel</button>
            </div>
          </div>`;
        toolbar.querySelector('#ctx-finish-polyline')?.addEventListener('click', finishPolyline);
        toolbar.querySelector('#ctx-cancel-polyline')?.addEventListener('click', cancelPolyline);
        return;
      }
      if (polyRoomVertices.length > 0) {
        bar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="context-tag-badge" style="background: rgba(56, 189, 248, 0.2); color: var(--accent-primary, #38bdf8); border-color: var(--accent-primary, #38bdf8);">POLYGON ROOM</span>
            <span style="font-size: 0.75rem; color: var(--text-primary); font-weight: 600;">${polyRoomVertices.length} points placed</span>
            ${polyRoomVertices.length >= 3 ? '<button type="button" class="context-action-btn" id="ctx-close-poly" style="background: rgba(74, 222, 128, 0.18); color: #4ade80; border-color: rgba(74, 222, 128, 0.4);"><span>✓ Complete & Close</span></button>' : '<span style="font-size: 0.70rem; color: var(--text-muted);">(Click 3+ corners, then click start point or Complete)</span>'}
            <button type="button" class="context-action-btn danger" id="ctx-cancel-poly"><span>✕ Cancel</span></button>
          </div>
        `;
        bar.querySelector('#ctx-close-poly')?.addEventListener('click', finishPolyRoom);
        bar.querySelector('#ctx-cancel-poly')?.addEventListener('click', cancelPolyRoom);
        return;
      }

      if (state.plan.tool === 'hatch') {
        bar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="context-tag-badge" style="background: rgba(244,63,94,0.18); color: #f43f5e; border-color: rgba(244,63,94,0.4);">ARCHITECTURAL HATCH</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Pattern:</span>
            ${['brick', 'concrete', 'diagonal', 'crosshatch', 'wood', 'terrazzo'].map(p => `
              <button type="button" class="context-action-btn ${(state.activeMaterial || 'brick') === p ? 'active' : ''}" data-hatch="${p}">
                <span>${p.toUpperCase()}</span>
              </button>
            `).join('')}
            <span style="font-size: 0.70rem; color: var(--text-muted);">(Click room on canvas to apply)</span>
            <button type="button" class="context-action-btn danger" id="ctx-exit-hatch"><span>✕ Exit</span></button>
          </div>
        `;
        bar.querySelectorAll('[data-hatch]').forEach(btn => {
          btn.addEventListener('click', () => {
            state.activeMaterial = btn.dataset.hatch;
            renderContextualToolbar();
            showToast(`Selected Hatch: ${btn.dataset.hatch}`);
          });
        });
        bar.querySelector('#ctx-exit-hatch')?.addEventListener('click', () => setTool('select'));
        return;
      }

      if (state.plan.tool === 'material_paint' || state.plan.tool === 'watercolor_brush') {
        bar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="context-tag-badge" style="background: rgba(59,130,246,0.18); color: #3b82f6; border-color: rgba(59,130,246,0.4);">MATERIAL PAINT</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Finish:</span>
            ${[
              { name: 'Wood', color: 'rgba(217, 119, 6, 0.25)' },
              { name: 'Concrete', color: 'rgba(100, 116, 139, 0.25)' },
              { name: 'Garden', color: 'rgba(16, 185, 129, 0.25)' },
              { name: 'Pool', color: 'rgba(6, 182, 212, 0.25)' },
              { name: 'Slate', color: 'rgba(59, 130, 246, 0.25)' }
            ].map(m => `
              <button type="button" class="context-action-btn ${(state.activeMaterialName || 'Slate') === m.name ? 'active' : ''}" data-mat-name="${m.name}" data-mat-color="${m.color}">
                <span>${m.name}</span>
              </button>
            `).join('')}
            <span style="font-size: 0.70rem; color: var(--text-muted);">(Click room on canvas to paint)</span>
            <button type="button" class="context-action-btn danger" id="ctx-exit-paint"><span>✕ Exit</span></button>
          </div>
        `;
        bar.querySelectorAll('[data-mat-name]').forEach(btn => {
          btn.addEventListener('click', () => {
            state.activeMaterialName = btn.dataset.matName;
            state.activePaintColor = btn.dataset.matColor;
            renderContextualToolbar();
            showToast(`Selected Material Finish: ${btn.dataset.matName}`);
          });
        });
        bar.querySelector('#ctx-exit-paint')?.addEventListener('click', () => setTool('select'));
        return;
      }

      if (state.plan.tool === 'pushpull') {
        bar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="context-tag-badge" style="background: rgba(194,120,3,0.2); color: #f59e0b; border-color: rgba(194,120,3,0.4);">SKETCHUP PUSH / PULL</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Click room to extrude to 3D massing:</span>
            <button type="button" class="context-action-btn" id="ctx-extrude-std"><span>2.7m Standard</span></button>
            <button type="button" class="context-action-btn active" id="ctx-extrude-high"><span>3.0m High Ceiling</span></button>
            <button type="button" class="context-action-btn" id="ctx-extrude-double"><span>4.0m Double Height</span></button>
            <button type="button" class="context-action-btn danger" id="ctx-exit-pushpull"><span>✕ Exit</span></button>
          </div>
        `;
        bar.querySelector('#ctx-extrude-std')?.addEventListener('click', () => handleStudioToolAction('view_perspective'));
        bar.querySelector('#ctx-extrude-high')?.addEventListener('click', () => handleStudioToolAction('view_perspective'));
        bar.querySelector('#ctx-extrude-double')?.addEventListener('click', () => handleStudioToolAction('view_perspective'));
        bar.querySelector('#ctx-exit-pushpull')?.addEventListener('click', () => setTool('select'));
        return;
      }

      const isRoomTool = state.plan.tool === 'room' || state.plan.tool === 'polyroom';
      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="context-tag-badge">READY</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">Active: <strong style="color: var(--accent-primary);">${(state.plan.tool || 'select').toUpperCase()}</strong></span>
          ${isRoomTool ? `
            <button type="button" class="context-action-btn ${state.plan.tool === 'room' ? 'active' : ''}" id="ctx-mode-rect"><span>▭ Rectangle</span></button>
            <button type="button" class="context-action-btn ${state.plan.tool === 'polyroom' ? 'active' : ''}" id="ctx-mode-poly"><span>⬡ Polygonal / L-Shape</span></button>
          ` : `
            <span style="font-size: 0.72rem; color: var(--text-muted);">· Quick Add:</span>
            <button type="button" class="context-action-btn" id="ctx-quick-room"><span>+ 4×3m Room</span></button>
            <button type="button" class="context-action-btn" id="ctx-quick-wall"><span>+ 5m Wall</span></button>
            <button type="button" class="context-action-btn" id="ctx-quick-desk"><span>+ Desk</span></button>
            <button type="button" class="context-action-btn" id="ctx-quick-stair"><span>+ Stair</span></button>
          `}
        </div>
      `;
      bar.querySelector('#ctx-mode-rect')?.addEventListener('click', () => setTool('room'));
      bar.querySelector('#ctx-mode-poly')?.addEventListener('click', () => setTool('polyroom'));
      bar.querySelector('#ctx-quick-room')?.addEventListener('click', () => {
        createRoomEntity({ x: 2, y: 2 }, { x: 6, y: 5 });
      });
      bar.querySelector('#ctx-quick-wall')?.addEventListener('click', () => {
        createWallEntity({ x: 2, y: 6 }, { x: 7, y: 6 });
      });
      bar.querySelector('#ctx-quick-desk')?.addEventListener('click', () => {
        dropFurniture({ x: 4, y: 3.5 });
      });
      bar.querySelector('#ctx-quick-stair')?.addEventListener('click', () => {
        createStairEntityFromDrag({ x: 2, y: 7 }, { x: 3.2, y: 10.5 });
      });
      return;
    }

    if (sel.kind === 'room') {
      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="context-tag-badge" style="background: rgba(73,137,217,0.18); color: var(--note-number, #4989D9); border-color: rgba(73,137,217,0.4);">ROOM</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(sel.name)} (${roomArea(sel).toFixed(1)}m²)</span>
          <button type="button" class="context-action-btn" id="ctx-tag-room-btn"><span>🏷️ Tag Room</span></button>
          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate (Ctrl+D)</span></button>
          <button type="button" class="context-action-btn" id="ctx-overlap-btn"><span>✓ Check Overlaps</span></button>
          <button type="button" class="context-action-btn" id="ctx-ai-room-btn"><span>🤖 AI Review</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete (Del)</span></button>
        </div>
      `;
      bar.querySelector('#ctx-tag-room-btn')?.addEventListener('click', () => {
        const rTag = createRoomTag({ room: sel, roomId: sel.id, name: sel.name });
        const cmd = entityAddRemoveCommand(entities(), rTag, `tag room ${sel.name}`);
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([rTag.id]);
        showToast(`Tagged room "${sel.name}"`);
        AudioService.playTick();
        render();
      });
      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-overlap-btn')?.addEventListener('click', () => {
        const furn = entities().filter(e => e.kind === 'furniture');
        const walls = entities().filter(e => e.kind === 'wall');
        const conflicts = checkOverlaps(furn, [sel], walls);
        if (conflicts.length === 0) {
          showToast('✓ No spatial conflicts detected in this room', 'success');
        } else {
          showToast(`⚠️ ${conflicts.length} spatial conflict(s) detected`, 'warning');
        }
        AudioService.playTick();
      });
      bar.querySelector('#ctx-ai-room-btn')?.addEventListener('click', () => {
        triggerAiCritique('room', { name: sel.name, width: sel.width, depth: sel.depth, area: roomArea(sel) });
      });
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    if (sel.kind === 'furniture') {
      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="context-tag-badge" style="background: rgba(74,222,128,0.15); color: var(--color-success, #4ade80); border-color: rgba(74,222,128,0.35);">FURNITURE</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(sel.name)} (${(sel.width||0).toFixed(2)}×${(sel.depth||0).toFixed(2)}m)</span>
          <button type="button" class="context-action-btn" id="ctx-rot-btn"><span>↻ Rotate 90°</span></button>
          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate (Ctrl+D)</span></button>
          <button type="button" class="context-action-btn" id="ctx-clearance-btn"><span>📏 Check Clearance</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete (Del)</span></button>
        </div>
      `;
      bar.querySelector('#ctx-rot-btn')?.addEventListener('click', () => {
        const before = JSON.parse(JSON.stringify(sel));
        sel.rotated = !sel.rotated;
        const cx = sel.x + sel.width / 2;
        const cy = sel.y + sel.depth / 2;
        const oldW = sel.width;
        sel.width = sel.depth;
        sel.depth = oldW;
        sel.x = snapToGrid(cx - sel.width / 2, state.plan.grid);
        sel.y = snapToGrid(cy - sel.depth / 2, state.plan.grid);
        const after = JSON.parse(JSON.stringify(sel));
        history.push({
          label: `rotate ${sel.name}`,
          redo() { Object.assign(sel, after); render(); },
          undo() { Object.assign(sel, before); render(); }
        });
        showToast(`Rotated ${sel.name} 90°`);
        AudioService.playTick();
        render();
      });
      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-clearance-btn')?.addEventListener('click', () => {
        const cl = checkClearance(sel, entities().filter(e => e.id !== sel.id), 0.9);
        if (!cl.clear) {
          showToast(`Clearance issue: ${cl.issues.map(i => i.reason).join('; ')}`, 'warning');
        } else {
          showToast('0.9m circulation clearance verified!', 'success');
        }
        AudioService.playTick();
      });
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    if (sel.kind === 'wall') {
      const len = wallLength(sel);
      const currentAssId = sel.assemblyId || 'generic-200';
      const assemblyOpts = Object.values(WALL_ASSEMBLIES).map(a =>
        `<option value="${a.id}" ${currentAssId === a.id ? 'selected' : ''}>${a.name}</option>`
      ).join('');

      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="context-tag-badge">WALL</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(sel.name)} (${len.toFixed(2)}m)</span>
          <select class="calc-input" id="ctx-wall-assembly" title="Select Wall Assembly" style="height: 26px; font-size: 0.72rem; padding: 0 4px; max-width: 170px;">
            ${assemblyOpts}
          </select>
          <button type="button" class="context-action-btn" id="ctx-wall-door"><span>🚪 + Door</span></button>
          <button type="button" class="context-action-btn" id="ctx-wall-win"><span>🪟 + Window</span></button>
          <button type="button" class="context-action-btn" id="ctx-wall-autodim" title="Generate CAD Dimension Chain"><span>📏 Auto-Dimension</span></button>
          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate (Ctrl+D)</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete (Del)</span></button>
        </div>
      `;

      bar.querySelector('#ctx-wall-assembly')?.addEventListener('change', (e) => {
        const assId = e.target.value;
        const ass = WALL_ASSEMBLIES[assId];
        if (ass) {
          sel.assemblyId = assId;
          sel.thickness = ass.totalThickness;
          showToast(`Wall assembly set to ${ass.name}`);
          AudioService.playTick();
          render();
          renderPropertiesInspector();
        }
      });

      bar.querySelector('#ctx-wall-door')?.addEventListener('click', () => {
        try {
          const door = createDoor({ wallId: sel.id, position: Math.max(0.1, len / 2 - 0.45), width: 0.9 });
          const cmd = entityAddRemoveCommand(entities(), door, `add door on ${sel.name}`);
          cmd.redo();
          history.push(cmd);
          state.plan.selectedIds = new Set([door.id]);
          showToast('Door placed at wall center');
          AudioService.playTick();
          render();
          renderContextualToolbar();
          renderPropertiesInspector();
        } catch (e) { showToast(e.message, 'warning'); }
      });
      bar.querySelector('#ctx-wall-win')?.addEventListener('click', () => {
        try {
          const win = createWindow({ wallId: sel.id, position: Math.max(0.1, len / 2 - 0.6), width: 1.2 });
          const cmd = entityAddRemoveCommand(entities(), win, `add window on ${sel.name}`);
          cmd.redo();
          history.push(cmd);
          state.plan.selectedIds = new Set([win.id]);
          showToast('Window placed at wall center');
          AudioService.playTick();
          render();
          renderContextualToolbar();
          renderPropertiesInspector();
        } catch (e) { showToast(e.message, 'warning'); }
      });
      bar.querySelector('#ctx-wall-autodim')?.addEventListener('click', () => {
        try {
          const dims = autoDimensionWall(sel, entities(), { offset: 0.6, style: 'tick', orientation: 'aligned' });
          if (dims.length > 0) {
            for (const d of dims) {
              const cmd = entityAddRemoveCommand(entities(), d, `auto-dimension ${sel.name}`);
              cmd.redo();
              history.push(cmd);
            }
            state.plan.selectedIds = new Set(dims.map(d => d.id));
            showToast(`Auto-dimensioned ${sel.name} (${dims.length} chains)`);
            AudioService.playTick();
            render();
            renderContextualToolbar();
            renderPropertiesInspector();
          } else {
            showToast('No dimensions could be generated for wall', 'warning');
          }
        } catch (e) {
          showToast(e.message, 'warning');
        }
      });
      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    if (sel.kind === 'door') {
      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
          <span class="context-tag-badge" style="background: rgba(251,191,36,0.15); color: var(--color-warning, #fbbf24);">DOOR</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(sel.name)} (${(sel.width * 1000).toFixed(0)}mm)</span>
          <button type="button" class="context-action-btn" id="ctx-tag-door-btn"><span>🏷️ Tag Door</span></button>
          <button type="button" class="context-action-btn" id="ctx-door-swing"><span>↻ Swing: ${sel.swing.toUpperCase()}</span></button>
          <button type="button" class="context-action-btn" id="ctx-door-flip"><span>⇄ Side: ${sel.flipSide ? 'OUT' : 'IN'}</span></button>
          <span style="font-size: 0.68rem; color: var(--text-muted); margin-left: 2px;">Width:</span>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 0.7) < 0.01 ? 'active' : ''}" id="ctx-door-w700">700</button>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 0.8) < 0.01 ? 'active' : ''}" id="ctx-door-w800">800</button>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 0.9) < 0.01 ? 'active' : ''}" id="ctx-door-w900">900</button>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 1.0) < 0.01 ? 'active' : ''}" id="ctx-door-w1000">1000</button>
          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete</span></button>
        </div>
      `;

      bar.querySelector('#ctx-tag-door-btn')?.addEventListener('click', () => {
        const dTag = createDoorTag({ door: sel, doorId: sel.id });
        const cmd = entityAddRemoveCommand(entities(), dTag, `tag door ${sel.name}`);
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([dTag.id]);
        showToast(`Tagged door "${sel.name}" with badge ${dTag.tag}`);
        AudioService.playTick();
        render();
      });

      bar.querySelector('#ctx-door-swing')?.addEventListener('click', () => {
        const nextSwing = sel.swing === 'left' ? 'right' : (sel.swing === 'right' ? 'double' : 'left');
        sel.swing = nextSwing;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        showToast(`Door swing set to ${nextSwing}`);
        AudioService.playTick();
      });

      bar.querySelector('#ctx-door-flip')?.addEventListener('click', () => {
        sel.flipSide = !sel.flipSide;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        showToast(`Door flipped ${sel.flipSide ? 'outward' : 'inward'}`);
        AudioService.playTick();
      });

      const setDoorW = (w) => {
        sel.width = w;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        AudioService.playTick();
      };
      bar.querySelector('#ctx-door-w700')?.addEventListener('click', () => setDoorW(0.7));
      bar.querySelector('#ctx-door-w800')?.addEventListener('click', () => setDoorW(0.8));
      bar.querySelector('#ctx-door-w900')?.addEventListener('click', () => setDoorW(0.9));
      bar.querySelector('#ctx-door-w1000')?.addEventListener('click', () => setDoorW(1.0));
      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    if (sel.kind === 'window') {
      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
          <span class="context-tag-badge" style="background: rgba(56,189,248,0.15); color: var(--accent-primary, #38bdf8);">WINDOW</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(sel.name)} (${(sel.width * 1000).toFixed(0)}mm)</span>
          <button type="button" class="context-action-btn" id="ctx-tag-win-btn"><span>🏷️ Tag Window</span></button>
          <span style="font-size: 0.68rem; color: var(--text-muted); margin-left: 2px;">Width:</span>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 0.9) < 0.01 ? 'active' : ''}" id="ctx-win-w900">900</button>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 1.2) < 0.01 ? 'active' : ''}" id="ctx-win-w1200">1200</button>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 1.5) < 0.01 ? 'active' : ''}" id="ctx-win-w1500">1500</button>
          <button type="button" class="context-action-btn ${Math.abs(sel.width - 1.8) < 0.01 ? 'active' : ''}" id="ctx-win-w1800">1800</button>
          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete</span></button>
        </div>
      `;

      bar.querySelector('#ctx-tag-win-btn')?.addEventListener('click', () => {
        const wTag = createWindowTag({ windowEntity: sel, windowId: sel.id });
        const cmd = entityAddRemoveCommand(entities(), wTag, `tag window ${sel.name}`);
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([wTag.id]);
        showToast(`Tagged window "${sel.name}" with badge ${wTag.tag}`);
        AudioService.playTick();
        render();
      });

      const setWinW = (w) => {
        sel.width = w;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        AudioService.playTick();
      };
      bar.querySelector('#ctx-win-w900')?.addEventListener('click', () => setWinW(0.9));
      bar.querySelector('#ctx-win-w1200')?.addEventListener('click', () => setWinW(1.2));
      bar.querySelector('#ctx-win-w1500')?.addEventListener('click', () => setWinW(1.5));
      bar.querySelector('#ctx-win-w1800')?.addEventListener('click', () => setWinW(1.8));
      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    if (sel.kind === 'stair' || sel.kind === 'ramp') {
      const isStair = sel.kind === 'stair';
      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="context-tag-badge" style="background: rgba(211,47,47,0.15); color: var(--accent-action, #D32F2F);">${isStair ? 'STAIR' : 'RAMP'}</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(sel.name)}</span>
          <button type="button" class="context-action-btn" id="ctx-edit-calc"><span>⚙️ Edit in ${isStair ? 'Stairs' : 'Ramps'} Calc</span></button>
          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate (Ctrl+D)</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete (Del)</span></button>
        </div>
      `;
      bar.querySelector('#ctx-edit-calc')?.addEventListener('click', () => {
        switchMode(isStair ? 'stairs' : 'ramps');
      });
      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    if (sel.kind === 'dimension') {
      const p1World = sel.p1 || { x: sel.x1, y: sel.y1 };
      const p2World = sel.p2 || { x: sel.x2, y: sel.y2 };
      const dist = Math.hypot(p2World.x - p1World.x, p2World.y - p1World.y);
      const currentStyle = sel.style || 'tick';
      const currentOrient = sel.orientation || 'aligned';
      const currentUnit = sel.unit || 'm';

      bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
          <span class="context-tag-badge" style="background: rgba(73,137,217,0.18); color: var(--note-number, #4989D9); border-color: rgba(73,137,217,0.4);">DIMENSION</span>
          <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${dist.toFixed(2)}m</span>
          
          <div style="display: inline-flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden;">
            <button type="button" class="context-action-btn ${currentStyle === 'tick' ? 'active' : ''}" id="ctx-dim-tick" title="Architectural 45° Tick" style="border: none; border-radius: 0; padding: 2px 7px;">Tick</button>
            <button type="button" class="context-action-btn ${currentStyle === 'arrow' ? 'active' : ''}" id="ctx-dim-arrow" title="Engineering Arrow" style="border: none; border-radius: 0; padding: 2px 7px;">Arrow</button>
            <button type="button" class="context-action-btn ${currentStyle === 'dot' ? 'active' : ''}" id="ctx-dim-dot" title="Circle Dot" style="border: none; border-radius: 0; padding: 2px 7px;">Dot</button>
          </div>

          <div style="display: inline-flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden;">
            <button type="button" class="context-action-btn ${currentOrient === 'aligned' ? 'active' : ''}" id="ctx-dim-aligned" title="Aligned" style="border: none; border-radius: 0; padding: 2px 7px;">Aligned</button>
            <button type="button" class="context-action-btn ${currentOrient === 'horizontal' ? 'active' : ''}" id="ctx-dim-horiz" title="Horizontal (ΔX)" style="border: none; border-radius: 0; padding: 2px 7px;">Horiz</button>
            <button type="button" class="context-action-btn ${currentOrient === 'vertical' ? 'active' : ''}" id="ctx-dim-vert" title="Vertical (ΔY)" style="border: none; border-radius: 0; padding: 2px 7px;">Vert</button>
          </div>

          <button type="button" class="context-action-btn" id="ctx-dim-unit" title="Cycle Unit"><span>Unit: ${currentUnit.toUpperCase()}</span></button>
          <button type="button" class="context-action-btn ${sel.dualUnit ? 'active' : ''}" id="ctx-dim-dual" title="Toggle Dual Unit"><span>${sel.dualUnit ? 'Dual [ON]' : 'Dual [OFF]'}</span></button>
          <button type="button" class="context-action-btn" id="ctx-dim-flip-offset" title="Flip offset side"><span>⇄ Flip Side</span></button>

          <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate</span></button>
          <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete</span></button>
        </div>
      `;

      const setDimStyle = (st) => {
        sel.style = st;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        AudioService.playTick();
      };
      bar.querySelector('#ctx-dim-tick')?.addEventListener('click', () => setDimStyle('tick'));
      bar.querySelector('#ctx-dim-arrow')?.addEventListener('click', () => setDimStyle('arrow'));
      bar.querySelector('#ctx-dim-dot')?.addEventListener('click', () => setDimStyle('dot'));

      const setDimOrient = (ori) => {
        sel.orientation = ori;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        AudioService.playTick();
      };
      bar.querySelector('#ctx-dim-aligned')?.addEventListener('click', () => setDimOrient('aligned'));
      bar.querySelector('#ctx-dim-horiz')?.addEventListener('click', () => setDimOrient('horizontal'));
      bar.querySelector('#ctx-dim-vert')?.addEventListener('click', () => setDimOrient('vertical'));

      bar.querySelector('#ctx-dim-unit')?.addEventListener('click', () => {
        const next = sel.unit === 'm' ? 'mm' : (sel.unit === 'mm' ? 'ft_in' : 'm');
        sel.unit = next;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        showToast(`Dimension unit: ${next}`);
        AudioService.playTick();
      });

      bar.querySelector('#ctx-dim-dual')?.addEventListener('click', () => {
        sel.dualUnit = !sel.dualUnit;
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        showToast(`Dual unit: ${sel.dualUnit ? 'Enabled' : 'Disabled'}`);
        AudioService.playTick();
      });

      bar.querySelector('#ctx-dim-flip-offset')?.addEventListener('click', () => {
        sel.offset = -(typeof sel.offset === 'number' ? sel.offset : 0.6);
        render();
        renderContextualToolbar();
        renderPropertiesInspector();
        showToast('Flipped dimension offset side');
        AudioService.playTick();
      });

      bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
      bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
      return;
    }

    bar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span class="context-tag-badge">${selCount > 1 ? 'MULTI-SELECT' : (sel.kind || 'ITEM').toUpperCase()}</span>
        <span class="context-title" style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${selCount} selected</span>
        <button type="button" class="context-action-btn" id="ctx-dup-btn"><span>📋 Duplicate (Ctrl+D)</span></button>
        <button type="button" class="context-action-btn danger" id="ctx-del-btn"><span>🗑 Delete (Del)</span></button>
      </div>
    `;
    bar.querySelector('#ctx-dup-btn')?.addEventListener('click', duplicateSelected);
    bar.querySelector('#ctx-del-btn')?.addEventListener('click', deleteSelected);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDimensionText(distanceMeters, unit = 'm', dualUnit = false, textOverride = null) {
    if (typeof textOverride === 'string' && textOverride.trim()) {
      return textOverride.trim();
    }
    const d = Math.max(0, distanceMeters);
    let primary = '';
    if (unit === 'mm') {
      primary = `${Math.round(d * 1000)} mm`;
    } else if (unit === 'ft_in') {
      primary = formatFeetInches(d / 0.0254);
    } else {
      primary = `${d.toFixed(2)} m`;
    }

    if (dualUnit) {
      let secondary = '';
      if (unit === 'ft_in') {
        secondary = `${d.toFixed(2)} m`;
      } else {
        secondary = formatFeetInches(d / 0.0254);
      }
      return `${primary} [${secondary}]`;
    }

    return primary;
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
        ${mkSq(sw, 'sw', 'sw-resize')}
        ${mkSq(se, 'se', 'se-resize')}
        ${mkSq(ne, 'ne', 'ne-resize')}
        ${mkSq(nw, 'nw', 'nw-resize')}
        ${mkSq(s, 's', 's-resize')}
        ${mkSq(n, 'n', 'n-resize')}
        ${mkSq(ePt, 'e', 'e-resize')}
        ${mkSq(wPt, 'w', 'w-resize')}
      `;

      if (e.kind === 'furniture') {
        const rotY = n.y - 18;
        handles += `
          <line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${rotY.toFixed(1)}" stroke="${stroke}" stroke-width="1.4" stroke-dasharray="2 2"/>
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

    if (e.kind === 'dimension') {
      const p1W = e.p1 || { x: e.x1, y: e.y1 };
      const p2W = e.p2 || { x: e.x2, y: e.y2 };
      if (isNum(p1W.x) && isNum(p1W.y) && isNum(p2W.x) && isNum(p2W.y)) {
        const p1 = worldToSvg(transform, p1W.x, p1W.y);
        const p2 = worldToSvg(transform, p2W.x, p2W.y);
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
    }

    return '';
  }

  // ------------------------------------------------------------------
  // 3D Massing & Presentation Sheet Workspace Viewports
  // ------------------------------------------------------------------
  function render3DMassing(doc) {
    const planDoc = state.plan.documents.find(d => d.type === '2d_plan' || d.type === '2d') || doc;
    const planEntities = planDoc ? (planDoc.entities || []) : [];

    doc.camera = doc.camera || { azimuth: 45, elevation: 35.264, zoom: 32, panX: svg.width / 2, panY: svg.height / 2 + 30 };
    doc.massingOptions = doc.massingOptions || { wallHeight: 3.0, doorHeight: 2.1, windowSill: 0.9, windowHeight: 1.2, slabThickness: 0.2, wireframe: false, multiStory: false };

    let faces3D = [];
    let multiStoryMetrics = null;
    if (doc.massingOptions.multiStory) {
      multiStoryMetrics = buildMultiStoryMassing3DModel(state.plan.documents || [planDoc], doc.massingOptions);
      faces3D = multiStoryMetrics.faces;
    } else {
      faces3D = buildMassing3DModel(planEntities, doc.massingOptions);
    }
    const sortedFaces = projectAndSortFaces(faces3D, doc.camera);

    const facesMarkup = sortedFaces.map(f => {
      const pts = f.points.map(pt => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
      const fill = doc.massingOptions.wireframe ? 'none' : f.color;
      const stroke = doc.massingOptions.wireframe ? 'var(--accent-primary, #38bdf8)' : f.stroke;
      const op = f.opacity < 1 ? ` opacity="${f.opacity}"` : '';
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${doc.massingOptions.wireframe ? 1 : 1.2}" stroke-linejoin="round"${op}/>`;
    }).join('\n');

    const presetsMarkup = Object.entries(CAMERA_PRESETS).map(([key, p]) => {
      const isAct = Math.abs((doc.camera.azimuth || 45) - p.azimuth) < 5 && Math.abs((doc.camera.elevation || 35.264) - p.elevation) < 5;
      return `<button type="button" class="result-action-btn chip-3d-preset ${isAct ? 'primary' : ''}" data-preset="${key}" style="font-size: 0.68rem; padding: 2px 6px;">${p.label}</button>`;
    }).join('');

    dom.planSvg.setAttribute('viewBox', `0 0 ${svg.width} ${svg.height}`);
    dom.planSvg.innerHTML = `
      <rect width="100%" height="100%" fill="#0b1120" />
      <!-- Ground Grid Lines -->
      <g opacity="0.18">
        ${Array.from({ length: 15 }).map((_, i) => {
          const val = (i - 7) * 2;
          const p1 = projectPoint3D({ x: -14, y: val, z: 0 }, doc.camera);
          const p2 = projectPoint3D({ x: 14, y: val, z: 0 }, doc.camera);
          const p3 = projectPoint3D({ x: val, y: -14, z: 0 }, doc.camera);
          const p4 = projectPoint3D({ x: val, y: 14, z: 0 }, doc.camera);
          return `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#38bdf8" stroke-width="0.8"/>
                  <line x1="${p3.x.toFixed(1)}" y1="${p3.y.toFixed(1)}" x2="${p4.x.toFixed(1)}" y2="${p4.y.toFixed(1)}" stroke="#38bdf8" stroke-width="0.8"/>`;
        }).join('')}
      </g>
      <g class="massing-faces">
        ${facesMarkup}
      </g>
    `;

    const ctxBar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (ctxBar) {
      const multiStoryLabel = doc.massingOptions.multiStory ? 'Stack All Stories' : 'Single Story';
      ctxBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span class="context-tag-badge">3D MASSING</span>
            ${presetsMarkup}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btn-3d-multistory" class="result-action-btn ${doc.massingOptions.multiStory ? 'primary' : ''}" style="font-size: 0.68rem; padding: 2px 6px;" title="Toggle multi-story building stacking">${multiStoryLabel}</button>
            <button type="button" id="btn-3d-wireframe" class="result-action-btn" style="font-size: 0.68rem; padding: 2px 6px;">${doc.massingOptions.wireframe ? 'Shaded' : 'Wireframe'}</button>
            <button type="button" id="btn-3d-height" class="result-action-btn" style="font-size: 0.68rem; padding: 2px 6px;">H: ${(doc.massingOptions.wallHeight || 3.0).toFixed(1)}m</button>
            <button type="button" id="btn-3d-export" class="result-action-btn primary" style="font-size: 0.68rem; padding: 2px 8px;">💾 Export 3D SVG</button>
          </div>
        </div>
      `;

      ctxBar.querySelectorAll('.chip-3d-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const preset = CAMERA_PRESETS[btn.dataset.preset];
          if (preset) {
            doc.camera.azimuth = preset.azimuth;
            doc.camera.elevation = preset.elevation;
            render();
            AudioService.playTick();
          }
        });
      });

      ctxBar.querySelector('#btn-3d-multistory')?.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.massingOptions.multiStory = !doc.massingOptions.multiStory;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-3d-wireframe')?.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.massingOptions.wireframe = !doc.massingOptions.wireframe;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-3d-height')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const heights = [2.4, 2.7, 3.0, 3.6, 4.2];
        const cur = doc.massingOptions.wallHeight || 3.0;
        const next = heights[(heights.indexOf(cur) + 1) % heights.length] || 3.0;
        doc.massingOptions.wallHeight = next;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-3d-export')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const svgCode = generateMassingSVG(doc.massingOptions.multiStory ? { faces: faces3D } : planEntities, {
          camera: doc.camera,
          ...doc.massingOptions,
          multiStory: doc.massingOptions.multiStory,
          documents: state.plan.documents
        });
        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(planDoc.name || 'massing').toLowerCase().replace(/\s+/g, '-')}-3d.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported 3D Massing SVG');
        AudioService.playSuccess();
      });
    }

    if (dom.planModeLabel) dom.planModeLabel.textContent = '3D MASSING';
    if (dom.planStatusBadge) {
      if (multiStoryMetrics) {
        dom.planStatusBadge.textContent = `${multiStoryMetrics.storyCount} Stories · ${multiStoryMetrics.totalHeight.toFixed(1)}m H · ${multiStoryMetrics.grossFloorArea.toFixed(0)}m² GFA`;
      } else {
        dom.planStatusBadge.textContent = `az ${Math.round(doc.camera.azimuth || 45)}° · el ${Math.round(doc.camera.elevation || 35)}°`;
      }
    }
  }

  function renderPresentationSheet(doc) {
    const planDoc = state.plan.documents.find(d => d.type === '2d_plan' || d.type === '2d') || doc;
    const planEntities = planDoc ? (planDoc.entities || []) : [];

    doc.sheetConfig = doc.sheetConfig || createSheetConfig({
      sheetNumber: 'A-101',
      sheetTitle: (planDoc.name || 'GROUND FLOOR PLAN').toUpperCase(),
      layoutMode: 'single'
    });
    if (!doc.sheetConfig.layoutMode) doc.sheetConfig.layoutMode = 'single';

    const sheetSvg = generateSheetSVG(doc.sheetConfig, planEntities, {
      pxPerMm: (svg.width / doc.sheetConfig.widthMm) * 0.85,
      document: planDoc,
      documents: state.plan.documents
    });

    const innerMatch = sheetSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    const innerContent = innerMatch ? innerMatch[1] : '';

    const wMm = doc.sheetConfig.widthMm;
    const hMm = doc.sheetConfig.heightMm;

    dom.planSvg.setAttribute('viewBox', `0 0 ${wMm} ${hMm}`);
    dom.planSvg.innerHTML = `
      <rect x="-100" y="-100" width="${wMm + 200}" height="${hMm + 200}" fill="#1e2433" />
      <filter id="sheet-shadow" x="-5%" y="-5%" width="115%" height="115%">
        <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.45" />
      </filter>
      <g filter="url(#sheet-shadow)">
        ${innerContent}
      </g>
    `;

    const ctxBar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (ctxBar) {
      const tb = doc.sheetConfig.titleBlock;
      ctxBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="context-tag-badge">PRESENTATION SHEET</span>
            <select id="sheet-layout-select" class="calc-select" style="height: 24px; padding: 0 4px; font-size: 0.7rem; width: 110px;" title="Sheet presentation layout">
              <option value="single" ${doc.sheetConfig.layoutMode === 'single' ? 'selected' : ''}>Full Plan</option>
              <option value="plan_3d" ${doc.sheetConfig.layoutMode === 'plan_3d' ? 'selected' : ''}>Plan + 3D Axo</option>
              <option value="plan_schedule" ${doc.sheetConfig.layoutMode === 'plan_schedule' ? 'selected' : ''}>Plan + Schedule</option>
              <option value="plan_elevation" ${doc.sheetConfig.layoutMode === 'plan_elevation' ? 'selected' : ''}>Plan + Elevation</option>
              <option value="plan_section" ${doc.sheetConfig.layoutMode === 'plan_section' ? 'selected' : ''}>Plan + Section</option>
              <option value="plan_detail" ${doc.sheetConfig.layoutMode === 'plan_detail' ? 'selected' : ''}>Plan + Detail</option>
              <option value="details_sheet" ${doc.sheetConfig.layoutMode === 'details_sheet' ? 'selected' : ''}>Details Matrix</option>
            </select>
            <select id="sheet-size-select" class="calc-select" style="height: 24px; padding: 0 4px; font-size: 0.7rem; width: 85px;">
              <option value="A4" ${doc.sheetConfig.size === 'A4' ? 'selected' : ''}>A4</option>
              <option value="A3" ${doc.sheetConfig.size === 'A3' ? 'selected' : ''}>A3 (Std)</option>
              <option value="A2" ${doc.sheetConfig.size === 'A2' ? 'selected' : ''}>A2</option>
              <option value="A1" ${doc.sheetConfig.size === 'A1' ? 'selected' : ''}>A1</option>
            </select>
            <select id="sheet-scale-select" class="calc-select" style="height: 24px; padding: 0 4px; font-size: 0.7rem; width: 85px;">
              <option value="20" ${doc.sheetConfig.viewport.scaleRatio === 20 ? 'selected' : ''}>1:20</option>
              <option value="50" ${doc.sheetConfig.viewport.scaleRatio === 50 ? 'selected' : ''}>1:50</option>
              <option value="100" ${doc.sheetConfig.viewport.scaleRatio === 100 ? 'selected' : ''}>1:100</option>
              <option value="200" ${doc.sheetConfig.viewport.scaleRatio === 200 ? 'selected' : ''}>1:200</option>
            </select>
            <button type="button" id="btn-sheet-orientation" class="result-action-btn" style="font-size: 0.68rem; padding: 2px 6px;">${doc.sheetConfig.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btn-sheet-export" class="result-action-btn primary" style="font-size: 0.68rem; padding: 2px 8px;">💾 Export Sheet SVG</button>
          </div>
        </div>
      `;

      ctxBar.querySelector('#sheet-layout-select')?.addEventListener('change', (e) => {
        doc.sheetConfig.layoutMode = e.target.value;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#sheet-size-select')?.addEventListener('change', (e) => {
        doc.sheetConfig = createSheetConfig({
          ...doc.sheetConfig,
          size: e.target.value,
          layoutMode: doc.sheetConfig.layoutMode,
          orientation: doc.sheetConfig.orientation,
          titleBlock: doc.sheetConfig.titleBlock
        });
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#sheet-scale-select')?.addEventListener('change', (e) => {
        const r = parseInt(e.target.value, 10) || 100;
        doc.sheetConfig.viewport.scaleRatio = r;
        doc.sheetConfig.titleBlock.scale = `1:${r}`;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-sheet-orientation')?.addEventListener('click', () => {
        const nextOri = doc.sheetConfig.orientation === 'landscape' ? 'portrait' : 'landscape';
        doc.sheetConfig = createSheetConfig({
          ...doc.sheetConfig,
          orientation: nextOri,
          size: doc.sheetConfig.size,
          layoutMode: doc.sheetConfig.layoutMode,
          titleBlock: doc.sheetConfig.titleBlock
        });
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-sheet-export')?.addEventListener('click', () => {
        const svgCode = generateSheetSVG(doc.sheetConfig, planEntities, {
          document: planDoc,
          documents: state.plan.documents
        });
        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(tb.sheetNumber || 'sheet').toLowerCase()}-${(tb.sheetTitle || 'drawing').toLowerCase().replace(/\s+/g, '-')}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported Presentation Sheet SVG');
        AudioService.playSuccess();
      });
    }

    if (dom.planModeLabel) dom.planModeLabel.textContent = 'SHEET';
    if (dom.planStatusBadge) dom.planStatusBadge.textContent = `${doc.sheetConfig.size} · 1:${doc.sheetConfig.viewport.scaleRatio || 100} · ${doc.sheetConfig.layoutMode || 'single'}`;
  }

  function renderElevationView(doc) {
    const dir = doc.elevationDirection || 'south';
    const planDocs = state.plan.documents.filter(d => d.type === '2d_plan' || d.type === '2d' || !d.type);
    const source = doc.multiStory !== false ? planDocs : (planDocs[0] ? planDocs[0].entities : []);

    const model = generateBuildingElevation(source, dir);
    const elevSvg = generateElevationSVG(model, dir, { scale: 35 });

    const innerMatch = elevSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    const vbMatch = elevSvg.match(/viewBox="([^"]+)"/i);
    const innerContent = innerMatch ? innerMatch[1] : '';
    const viewBox = vbMatch ? vbMatch[1] : `0 0 ${svg.width} ${svg.height}`;

    dom.planSvg.setAttribute('viewBox', viewBox);
    dom.planSvg.innerHTML = innerContent;

    const ctxBar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (ctxBar) {
      ctxBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="context-tag-badge">BUILDING ELEVATION</span>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="result-action-btn ${dir === 'south' ? 'primary' : ''}" data-dir="south" style="font-size: 0.68rem; padding: 2px 6px;">South (Front)</button>
              <button type="button" class="result-action-btn ${dir === 'north' ? 'primary' : ''}" data-dir="north" style="font-size: 0.68rem; padding: 2px 6px;">North (Rear)</button>
              <button type="button" class="result-action-btn ${dir === 'east' ? 'primary' : ''}" data-dir="east" style="font-size: 0.68rem; padding: 2px 6px;">East (Right)</button>
              <button type="button" class="result-action-btn ${dir === 'west' ? 'primary' : ''}" data-dir="west" style="font-size: 0.68rem; padding: 2px 6px;">West (Left)</button>
            </div>
            <button type="button" id="btn-elev-multistory" class="result-action-btn ${doc.multiStory !== false ? 'active' : ''}" style="font-size: 0.68rem; padding: 2px 6px;">${doc.multiStory !== false ? 'Stack All Stories' : 'Single Floor'}</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btn-elev-export" class="result-action-btn primary" style="font-size: 0.68rem; padding: 2px 8px;">💾 Export Elevation SVG</button>
          </div>
        </div>
      `;

      ctxBar.querySelectorAll('button[data-dir]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          doc.elevationDirection = btn.dataset.dir;
          const dirNames = { south: 'South Elevation', north: 'North Elevation', east: 'East Elevation', west: 'West Elevation' };
          doc.name = dirNames[doc.elevationDirection] || 'Building Elevation';
          renderTabs();
          render();
          AudioService.playTick();
        });
      });

      ctxBar.querySelector('#btn-elev-multistory')?.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.multiStory = !doc.multiStory;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-elev-export')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const blob = new Blob([elevSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(doc.name || 'elevation').toLowerCase().replace(/\s+/g, '-')}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${doc.name} SVG`);
        AudioService.playSuccess();
      });
    }

    if (dom.planModeLabel) dom.planModeLabel.textContent = 'ELEVATION';
    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `${model.title} · ${model.totalHeight.toFixed(1)}m H · Span ${model.span.toFixed(1)}m`;
    }
  }

  function renderSectionView(doc) {
    const planDocs = state.plan.documents.filter(d => d.type === '2d_plan' || d.type === '2d' || !d.type);
    const source = planDocs;
    const cut = doc.sectionCut || { label: 'A', direction: 'forward' };

    const model = generateBuildingSection(source, cut, { poche: doc.poche !== false });
    const sectSvg = generateSectionSVG(model, cut, { scale: 35 });

    const innerMatch = sectSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    const vbMatch = sectSvg.match(/viewBox="([^"]+)"/i);
    const innerContent = innerMatch ? innerMatch[1] : '';
    const viewBox = vbMatch ? vbMatch[1] : `0 0 ${svg.width} ${svg.height}`;

    dom.planSvg.setAttribute('viewBox', viewBox);
    dom.planSvg.innerHTML = innerContent;

    const ctxBar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (ctxBar) {
      ctxBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="context-tag-badge">BUILDING SECTION</span>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="result-action-btn ${cut.label === 'A' ? 'primary' : ''}" data-label="A" style="font-size: 0.68rem; padding: 2px 6px;">Section A-A</button>
              <button type="button" class="result-action-btn ${cut.label === 'B' ? 'primary' : ''}" data-label="B" style="font-size: 0.68rem; padding: 2px 6px;">Section B-B</button>
            </div>
            <button type="button" id="btn-sect-poche" class="result-action-btn ${doc.poche !== false ? 'active' : ''}" style="font-size: 0.68rem; padding: 2px 6px;">${doc.poche !== false ? '🧱 Pochè Hatch: ON' : 'Pochè: OFF'}</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btn-sect-export" class="result-action-btn primary" style="font-size: 0.68rem; padding: 2px 8px;">💾 Export Section SVG</button>
          </div>
        </div>
      `;

      ctxBar.querySelectorAll('button[data-label]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const lbl = btn.dataset.label;
          doc.sectionCut = { ...doc.sectionCut, label: lbl };
          doc.name = `Section ${lbl}-${lbl}`;
          renderTabs();
          render();
          AudioService.playTick();
        });
      });

      ctxBar.querySelector('#btn-sect-poche')?.addEventListener('click', (e) => {
        e.stopPropagation();
        doc.poche = !doc.poche;
        render();
        AudioService.playTick();
      });

      ctxBar.querySelector('#btn-sect-export')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const blob = new Blob([sectSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(doc.name || 'section').toLowerCase().replace(/\s+/g, '-')}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${doc.name} SVG`);
        AudioService.playSuccess();
      });
    }

    if (dom.planModeLabel) dom.planModeLabel.textContent = 'SECTION';
    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `${model.title} · ${model.totalHeight.toFixed(1)}m H · Cut ${model.cutLength.toFixed(1)}m`;
    }
  }

  function renderDetailView(doc) {
    const dKey = doc.detailKey || 'footing';
    const assembly = generateDetailAssembly(dKey);
    const detailSvg = generateDetailSVG(assembly, { width: 900, height: 650 });

    const innerMatch = detailSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    const vbMatch = detailSvg.match(/viewBox="([^"]+)"/i);
    const innerContent = innerMatch ? innerMatch[1] : '';
    const viewBox = vbMatch ? vbMatch[1] : `0 0 900 650`;

    dom.planSvg.setAttribute('viewBox', viewBox);
    dom.planSvg.innerHTML = innerContent;

    const ctxBar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (ctxBar) {
      ctxBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="context-tag-badge">CONSTRUCTION DETAIL</span>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="result-action-btn ${dKey === 'footing' ? 'primary' : ''}" data-detail="footing" style="font-size: 0.68rem; padding: 2px 6px;">1 Strip Footing</button>
              <button type="button" class="result-action-btn ${dKey === 'parapet' ? 'primary' : ''}" data-detail="parapet" style="font-size: 0.68rem; padding: 2px 6px;">2 Roof Parapet</button>
              <button type="button" class="result-action-btn ${dKey === 'window_sill' ? 'primary' : ''}" data-detail="window_sill" style="font-size: 0.68rem; padding: 2px 6px;">3 Window Sill</button>
              <button type="button" class="result-action-btn ${dKey === 'stair_nosing' ? 'primary' : ''}" data-detail="stair_nosing" style="font-size: 0.68rem; padding: 2px 6px;">4 Stair Nosing</button>
            </div>
            <span class="unit-system-tag" style="font-size: 0.68rem;">SCALE ${assembly.scaleLabel}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btn-detail-export" class="result-action-btn primary" style="font-size: 0.68rem; padding: 2px 8px;">💾 Export Detail SVG</button>
          </div>
        </div>
      `;

      ctxBar.querySelectorAll('button[data-detail]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          doc.detailKey = btn.dataset.detail;
          const dNames = { footing: 'Strip Footing Detail', parapet: 'Roof Parapet Detail', window_sill: 'Window Sill Detail', stair_nosing: 'Stair Nosing Detail' };
          doc.name = dNames[doc.detailKey] || 'Construction Detail';
          renderTabs();
          render();
          AudioService.playTick();
        });
      });

      ctxBar.querySelector('#btn-detail-export')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const blob = new Blob([detailSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(doc.name || 'detail').toLowerCase().replace(/\s+/g, '-')}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${doc.name} SVG`);
        AudioService.playSuccess();
      });
    }

    if (dom.planModeLabel) dom.planModeLabel.textContent = 'DETAIL';
    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `${assembly.title} · ${assembly.scaleLabel}`;
    }
  }

  function render4ViewportSplit(doc) {
    dom.planSvg.setAttribute('viewBox', `0 0 ${svg.width} ${svg.height}`);
    const halfW = Math.floor(svg.width / 2);
    const halfH = Math.floor(svg.height / 2);

    const planDoc = state.plan.documents.find(d => d.type === '2d_plan' || d.type === '2d') || doc;
    const planEntities = planDoc ? (planDoc.entities || []) : [];

    // 1. Top View (Plan)
    let minX = 0, maxX = 12, minY = 0, maxY = 10;
    for (const e of planEntities) {
      if (typeof e.x === 'number' && typeof e.width === 'number') {
        minX = Math.min(minX, e.x);
        maxX = Math.max(maxX, e.x + e.width);
      }
      if (typeof e.y === 'number' && typeof e.depth === 'number') {
        minY = Math.min(minY, e.y);
        maxY = Math.max(maxY, e.y + e.depth);
      }
      if (typeof e.x1 === 'number' && typeof e.x2 === 'number') {
        minX = Math.min(minX, e.x1, e.x2);
        maxX = Math.max(maxX, e.x1, e.x2);
        minY = Math.min(minY, e.y1, e.y2);
        maxY = Math.max(maxY, e.y1, e.y2);
      }
    }
    const pad = 2;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    const rangeX = Math.max(12, maxX - minX);
    const rangeY = Math.max(10, maxY - minY);
    const topScale = Math.min((halfW - 40) / rangeX, (halfH - 40) / rangeY);

    const topToSvg = (wx, wy) => ({
      x: 20 + (wx - minX) * topScale,
      y: halfH - 20 - (wy - minY) * topScale
    });

    let topEntitiesMarkup = '';
    for (const e of planEntities) {
      if (e.kind === 'room' && typeof e.x === 'number') {
        const p1 = topToSvg(e.x, e.y + e.depth);
        const p2 = topToSvg(e.x + e.width, e.y);
        const cx = 20 + (e.x + e.width / 2 - minX) * topScale;
        const cy = halfH - 20 - (e.y + e.depth / 2 - minY) * topScale;
        topEntitiesMarkup += `
          <rect x="${p1.x.toFixed(1)}" y="${p1.y.toFixed(1)}" width="${(p2.x - p1.x).toFixed(1)}" height="${(p1.y - p2.y).toFixed(1)}" fill="rgba(74, 222, 128, 0.12)" stroke="#4ade80" stroke-width="1.5" />
          <text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" font-size="10" fill="#cbd5e1" font-family="var(--font-mono)">${escapeHtml(e.name || 'Room')}</text>
        `;
      } else if (e.kind === 'wall' && typeof e.x1 === 'number') {
        const p1 = topToSvg(e.x1, e.y1);
        const p2 = topToSvg(e.x2, e.y2);
        topEntitiesMarkup += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#38bdf8" stroke-width="2.5" />`;
      }
    }

    // 2. Perspective View (3D Massing)
    const camera = { azimuth: 45, elevation: 35.264, zoom: 18, panX: halfW + halfW / 2, panY: halfH / 2 + 15 };
    const massingFaces = buildMassing3DModel(planEntities, { wallHeight: 3.0 });
    const sortedFaces = projectAndSortFaces(massingFaces, camera);
    const facesMarkup = sortedFaces.map(f => {
      const pts = f.points.map(pt => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
      return `<polygon points="${pts}" fill="${f.color}" stroke="${f.stroke}" stroke-width="1" opacity="${f.opacity}" />`;
    }).join('\n');

    // 3. Front Elevation (South)
    const southModel = generateBuildingElevation(planEntities, 'south');
    const southSvg = generateElevationSVG(southModel, 'south', { scale: 20 });
    const southInner = (southSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i) || [])[1] || '';

    // 4. Right Elevation (East)
    const eastModel = generateBuildingElevation(planEntities, 'east');
    const eastSvg = generateElevationSVG(eastModel, 'east', { scale: 20 });
    const eastInner = (eastSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i) || [])[1] || '';

    dom.planSvg.innerHTML = `
      <!-- Viewport Backgrounds -->
      <rect x="0" y="0" width="${halfW}" height="${halfH}" fill="#0f172a" />
      <rect x="${halfW}" y="0" width="${halfW}" height="${halfH}" fill="#0b1120" />
      <rect x="0" y="${halfH}" width="${halfW}" height="${halfH}" fill="#0d1527" />
      <rect x="${halfW}" y="${halfH}" width="${halfW}" height="${halfH}" fill="#0f172a" />

      <!-- Quadrant 1: Top View -->
      <g class="quadrant-top">
        ${Array.from({ length: 9 }).map((_, i) => {
          const gx = 20 + i * (halfW - 40) / 8;
          const gy = 20 + i * (halfH - 40) / 8;
          return `<line x1="${gx.toFixed(1)}" y1="20" x2="${gx.toFixed(1)}" y2="${halfH - 20}" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"/>
                  <line x1="20" y1="${gy.toFixed(1)}" x2="${halfW - 20}" y2="${gy.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"/>`;
        }).join('')}
        ${topEntitiesMarkup}
        <g class="quadrant-pill" data-quadrant="top" cursor="pointer">
          <rect x="12" y="12" width="130" height="24" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="#057a55" stroke-width="1.2" />
          <text x="22" y="28" fill="#4ade80" font-size="11" font-weight="bold" font-family="var(--font-mono)">TOP · PLAN</text>
        </g>
      </g>

      <!-- Quadrant 2: Perspective View -->
      <g class="quadrant-perspective">
        <g class="massing-faces">
          ${facesMarkup}
        </g>
        <g class="quadrant-pill" data-quadrant="perspective" cursor="pointer">
          <rect x="${halfW + 12}" y="12" width="145" height="24" rx="4" fill="rgba(11, 17, 32, 0.9)" stroke="#057a55" stroke-width="1.2" />
          <text x="${halfW + 22}" y="28" fill="#38bdf8" font-size="11" font-weight="bold" font-family="var(--font-mono)">PERSPECTIVE</text>
        </g>
      </g>

      <!-- Quadrant 3: Front Elevation (South) -->
      <g class="quadrant-front" transform="translate(10, ${halfH + 10})">
        <svg x="0" y="0" width="${halfW - 20}" height="${halfH - 20}" viewBox="0 0 ${halfW} ${halfH}">
          ${southInner}
        </svg>
        <g class="quadrant-pill" data-quadrant="front" cursor="pointer">
          <rect x="12" y="12" width="145" height="24" rx="4" fill="rgba(13, 21, 39, 0.9)" stroke="#057a55" stroke-width="1.2" />
          <text x="22" y="28" fill="#fbbf24" font-size="11" font-weight="bold" font-family="var(--font-mono)">FRONT · SOUTH</text>
        </g>
      </g>

      <!-- Quadrant 4: Right Elevation (East) -->
      <g class="quadrant-right" transform="translate(${halfW + 10}, ${halfH + 10})">
        <svg x="0" y="0" width="${halfW - 20}" height="${halfH - 20}" viewBox="0 0 ${halfW} ${halfH}">
          ${eastInner}
        </svg>
        <g class="quadrant-pill" data-quadrant="right" cursor="pointer">
          <rect x="12" y="12" width="145" height="24" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="#057a55" stroke-width="1.2" />
          <text x="22" y="28" fill="#a78bfa" font-size="11" font-weight="bold" font-family="var(--font-mono)">RIGHT · EAST</text>
        </g>
      </g>

      <!-- Rhino Quadrant Dividers -->
      <line x1="${halfW}" y1="0" x2="${halfW}" y2="${svg.height}" stroke="#057a55" stroke-width="2" opacity="0.8" />
      <line x1="0" y1="${halfH}" x2="${svg.width}" y2="${halfH}" stroke="#057a55" stroke-width="2" opacity="0.8" />
      <circle cx="${halfW}" cy="${halfH}" r="5" fill="#057a55" stroke="#10b981" stroke-width="1.5" />
    `;

    // Contextual toolbar for 4-viewport split
    const ctxBar = dom.planContextualToolbar || document.getElementById('plan-contextual-toolbar');
    if (ctxBar) {
      ctxBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="context-tag-badge" style="background: rgba(5, 122, 85, 0.2); color: #10b981; border-color: #057a55;">RHINO 4-VIEWPORT SPLIT</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Click header or button to maximize:</span>
            <button type="button" class="result-action-btn" id="btn-4v-top" style="font-size: 0.68rem; padding: 2px 6px;">🔲 Maximize Top</button>
            <button type="button" class="result-action-btn" id="btn-4v-persp" style="font-size: 0.68rem; padding: 2px 6px;">🔲 Maximize Perspective</button>
            <button type="button" class="result-action-btn" id="btn-4v-front" style="font-size: 0.68rem; padding: 2px 6px;">🔲 Maximize Front</button>
            <button type="button" class="result-action-btn" id="btn-4v-right" style="font-size: 0.68rem; padding: 2px 6px;">🔲 Maximize Right</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" id="btn-4v-exit" class="result-action-btn primary" style="font-size: 0.68rem; padding: 2px 8px;">✕ Return to 2D Plan</button>
          </div>
        </div>
      `;

      ctxBar.querySelector('#btn-4v-top')?.addEventListener('click', () => handleStudioToolAction('view_top'));
      ctxBar.querySelector('#btn-4v-persp')?.addEventListener('click', () => handleStudioToolAction('view_perspective'));
      ctxBar.querySelector('#btn-4v-front')?.addEventListener('click', () => handleStudioToolAction('view_south'));
      ctxBar.querySelector('#btn-4v-right')?.addEventListener('click', () => {
        const eDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'elevation');
        if (eDoc) {
          eDoc.elevationDirection = 'east';
          eDoc.name = 'East Elevation';
          switchDocument(eDoc.id);
        } else {
          createDocument('East Elevation', 'elevation');
        }
      });
      ctxBar.querySelector('#btn-4v-exit')?.addEventListener('click', () => handleStudioToolAction('view_top'));
    }

    // Quadrant pill click listeners
    dom.planSvg.querySelectorAll('.quadrant-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const quad = pill.dataset.quadrant;
        if (quad === 'top') handleStudioToolAction('view_top');
        else if (quad === 'perspective') handleStudioToolAction('view_perspective');
        else if (quad === 'front') handleStudioToolAction('view_south');
        else if (quad === 'right') {
          const eDoc = state.plan.documents && state.plan.documents.find(d => d.type === 'elevation');
          if (eDoc) {
            eDoc.elevationDirection = 'east';
            eDoc.name = 'East Elevation';
            switchDocument(eDoc.id);
          } else {
            createDocument('East Elevation', 'elevation');
          }
        }
      });
    });

    if (dom.planModeLabel) dom.planModeLabel.textContent = '4-VIEWPORT';
    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `Rhino 4-Split · 2x2 Ortho & 3D`;
    }
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function render() {
    if (!dom.planSvg) return;
    if (renderScene()) {
      renderPanels();
      updateStatusBar();
    }
  }

  /**
   * Coalesces high-frequency scene redraws (pan/zoom/drag) into one
   * requestAnimationFrame — pointermove can fire faster than the display
   * refresh rate, so without coalescing every event rebuilt the whole SVG
   * plus all five side panels. Panels refresh on pointerup's full render().
   */
  let sceneRenderPending = false;
  /**
   * Marquee overlay: updated synchronously on every pointermove (no rAF, no
   * render pass) so the selection rectangle is always visible while dragging.
   */
  function updateMarqueeOverlay(clientX, clientY) {
    const wrap = dom.planSvgWrap || document.getElementById('plan-svg-wrap');
    const box = document.getElementById('plan-marquee-overlay');
    if (!wrap || !box || !dragState || !dragState.marquee) return;
    const wrapRect = wrap.getBoundingClientRect();
    const left = Math.min(dragState.startClient.x, clientX) - wrapRect.left;
    const top = Math.min(dragState.startClient.y, clientY) - wrapRect.top;
    const w = Math.abs(clientX - dragState.startClient.x);
    const h = Math.abs(clientY - dragState.startClient.y);
    box.hidden = false;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    const wM = Math.abs(dragState.current.x - dragState.startWorld.x);
    const hM = Math.abs(dragState.current.y - dragState.startWorld.y);
    const label = box.querySelector('#plan-marquee-overlay-label');
    if (label) label.textContent = `${dragState.additive ? '+ADD ' : ''}${wM.toFixed(2)} × ${hM.toFixed(2)} m`;
  }

  function hideMarqueeOverlay() {
    const box = document.getElementById('plan-marquee-overlay');
    if (box) { box.hidden = true; box.style.width = '0'; box.style.height = '0'; }
  }

  function scheduleSceneRender() {
    if (sceneRenderPending) return;
    sceneRenderPending = true;
    // rAF coalesces to the display refresh when the tab is visible; the
    // timeout fallback guarantees the scene still renders in environments
    // where rAF is throttled or suspended (hidden panes, background tabs).
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      clearTimeout(fallbackTimer);
      sceneRenderPending = false;
      renderScene();
    };
    const fallbackTimer = setTimeout(run, 60);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 16);
    }
  }

  /**
   * Scene-only render: SVG canvas + zoom badge. Returns false for special
   * document types (3D massing, sheets, elevations, …) that render themselves
   * and skip the side panels, mirroring the historical render() early-returns.
   */
  function renderScene() {
    if (!dom.planSvg) return false;
    syncSvgSize();

    const doc = getActiveDocument();
    if (doc && (doc.type === 'view_4split' || doc.type === '4view')) {
      render4ViewportSplit(doc);
      return false;
    }
    if (doc && doc.type === '3d_massing') {
      render3DMassing(doc);
      return false;
    }
    if (doc && doc.type === 'sheet') {
      renderPresentationSheet(doc);
      return false;
    }
    if (doc && doc.type === 'elevation') {
      renderElevationView(doc);
      return false;
    }
    if (doc && doc.type === 'section') {
      renderSectionView(doc);
      return false;
    }
    if (doc && doc.type === 'detail') {
      renderDetailView(doc);
      return false;
    }

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

    const isNum = v => typeof v === 'number' && isFinite(v);
    const allWalls = entities().filter(x => x.kind === 'wall' && isNum(x.x1) && isNum(x.y1) && isNum(x.x2) && isNum(x.y2));
    const wallJunctions = calcWallJunctions(allWalls);

    const defsMarkup = `
      <defs>
        <pattern id="hatch-diagonal" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="var(--border-color, #888)" stroke-width="1.2" opacity="0.45"/>
        </pattern>
        <pattern id="hatch-crosshatch" width="10" height="10" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="10" y2="10" stroke="var(--border-color, #888)" stroke-width="0.9" opacity="0.4"/>
          <line x1="10" y1="0" x2="0" y2="10" stroke="var(--border-color, #888)" stroke-width="0.9" opacity="0.4"/>
        </pattern>
        <pattern id="hatch-brick" width="16" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="16" y2="0" stroke="var(--border-color, #888)" stroke-width="0.8" opacity="0.5"/>
          <line x1="0" y1="4" x2="16" y2="4" stroke="var(--border-color, #888)" stroke-width="0.8" opacity="0.5"/>
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--border-color, #888)" stroke-width="0.8" opacity="0.5"/>
          <line x1="8" y1="4" x2="8" y2="8" stroke="var(--border-color, #888)" stroke-width="0.8" opacity="0.5"/>
        </pattern>
        <pattern id="hatch-insulation" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 0 6 Q 3 0 6 6 T 12 6" fill="none" stroke="var(--color-warning, #eab308)" stroke-width="1.2" opacity="0.6"/>
        </pattern>
        <pattern id="hatch-concrete" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.7" fill="var(--text-muted, #888)" opacity="0.6"/>
          <circle cx="8" cy="9" r="0.7" fill="var(--text-muted, #888)" opacity="0.6"/>
          <polygon points="9,2 11,4 10,5" fill="none" stroke="var(--text-muted, #888)" stroke-width="0.7" opacity="0.5"/>
          <polygon points="3,9 4,11 2,11" fill="none" stroke="var(--text-muted, #888)" stroke-width="0.7" opacity="0.5"/>
        </pattern>
        <pattern id="hatch-wood" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="rgba(217, 119, 6, 0.08)"/>
          <line x1="0" y1="4" x2="16" y2="4" stroke="rgba(217, 119, 6, 0.4)" stroke-width="0.7"/>
          <line x1="0" y1="8" x2="16" y2="8" stroke="rgba(217, 119, 6, 0.4)" stroke-width="0.7"/>
          <line x1="0" y1="12" x2="16" y2="12" stroke="rgba(217, 119, 6, 0.4)" stroke-width="0.7"/>
          <line x1="8" y1="0" x2="8" y2="4" stroke="rgba(217, 119, 6, 0.4)" stroke-width="0.7"/>
          <line x1="4" y1="4" x2="4" y2="8" stroke="rgba(217, 119, 6, 0.4)" stroke-width="0.7"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="rgba(217, 119, 6, 0.4)" stroke-width="0.7"/>
        </pattern>
        <pattern id="hatch-terrazzo" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="rgba(99, 102, 241, 0.06)"/>
          <rect x="0" y="0" width="12" height="12" fill="none" stroke="rgba(99, 102, 241, 0.25)" stroke-width="0.6"/>
          <circle cx="3" cy="4" r="0.8" fill="rgba(99, 102, 241, 0.5)"/>
          <circle cx="9" cy="8" r="0.8" fill="rgba(99, 102, 241, 0.5)"/>
        </pattern>
        <pattern id="hatch-wash" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="rgba(59, 130, 246, 0.12)"/>
          <circle cx="5" cy="5" r="3" fill="rgba(59, 130, 246, 0.08)"/>
          <circle cx="15" cy="12" r="4" fill="rgba(59, 130, 246, 0.08)"/>
        </pattern>
      </defs>`;

    const entityMarkup = entities().map(e => {
      if (!isEntityVisible(e, doc)) return '';
      const selected = state.plan.selectedIds.has(e.id);
      const stroke = selected ? 'var(--color-warning, #fbbf24)' : 'var(--accent-primary, #7aa2ff)';
      const hasRect = isNum(e.x) && isNum(e.y) && isNum(e.width) && isNum(e.depth);

      if (e.kind === 'room') {
        let roomFill = 'var(--bg-chip, rgba(122,162,255,0.08))';
        if (e.hatch) {
          roomFill = `url(#hatch-${e.hatch})`;
        } else if (e.fill) {
          roomFill = e.fill;
        }

        if (Array.isArray(e.boundary) && e.boundary.length >= 3) {
          const ptsStr = e.boundary.map(pt => {
            const sp = worldToSvg(transform, pt.x, pt.y);
            return `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`;
          }).join(' ');
          const cx = e.boundary.reduce((sum, p) => sum + p.x, 0) / e.boundary.length;
          const cy = e.boundary.reduce((sum, p) => sum + p.y, 0) / e.boundary.length;
          const labelPos = worldToSvg(transform, cx, cy);
          return `<g>
            <polygon points="${ptsStr}"
              fill="${roomFill}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.6}" data-entity-id="${escapeHtml(e.id)}" class="plan-entity"/>
            <text x="${labelPos.x.toFixed(1)}" y="${labelPos.y.toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">${escapeHtml(e.name)} · ${roomArea(e).toFixed(1)}m²</text>
          </g>`;
        } else if (hasRect) {
          const p1 = worldToSvg(transform, e.x, e.y + e.depth);   // bottom-left
          const p2 = worldToSvg(transform, e.x + e.width, e.y);   // top-right
          const labelPos = worldToSvg(transform, e.x + e.width / 2, e.y + e.depth / 2);
          return `<g>
            <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${((p2.x - p1.x)).toFixed(1)}" height="${((p1.y - p2.y)).toFixed(1)}"
              fill="${roomFill}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.6}" data-entity-id="${escapeHtml(e.id)}" class="plan-entity"/>
            <text x="${labelPos.x.toFixed(1)}" y="${labelPos.y.toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">${escapeHtml(e.name)} · ${roomArea(e).toFixed(1)}m²</text>
          </g>`;
        }
      }
      if (e.kind === 'wall' && isNum(e.x1) && isNum(e.y1) && isNum(e.x2) && isNum(e.y2)) {
        const len = wallLength(e);
        if (len < 1e-4) {
          const a = worldToSvg(transform, e.x1, e.y1);
          const b = worldToSvg(transform, e.x2, e.y2);
          return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${stroke}" stroke-width="2" class="plan-entity" data-entity-id="${escapeHtml(e.id)}"/>`;
        }

        const assembly = WALL_ASSEMBLIES[e.assemblyId] || WALL_ASSEMBLIES['generic-200'];
        const totalThick = typeof e.thickness === 'number' && e.thickness > 0
          ? e.thickness
          : (assembly ? assembly.totalThickness : 0.2);
        const halfThick = totalThick / 2;

        const u = { x: (e.x2 - e.x1) / len, y: (e.y2 - e.y1) / len };
        const n = { x: -u.y, y: u.x };

        const openings = wallOpenings(e, entities());
        const solidSpans = punchWallSpans(len, openings);
        const juncInfo = wallJunctions ? wallJunctions.get(e.id) : null;

        const layers = (assembly && Array.isArray(assembly.layers) && assembly.layers.length > 0)
          ? assembly.layers
          : [{ id: 'core', name: 'Core', thickness: totalThick, color: 'rgba(122,162,255,0.18)', hatch: 'solid' }];

        const assemblySum = layers.reduce((sum, l) => sum + (l.thickness || 0), 0) || totalThick;
        const scaleFactor = totalThick / assemblySum;

        let wallSvg = '';

        for (const span of solidSpans) {
          const isAtStart = Math.abs(span.start) < 1e-4;
          const isAtEnd = Math.abs(span.end - len) < 1e-4;

          let startB, startA, endB, endA;

          if (isAtStart && juncInfo && Array.isArray(juncInfo.polygon) && juncInfo.polygon.length === 4) {
            startB = juncInfo.polygon[0];
            startA = juncInfo.polygon[3];
          } else {
            const p = { x: e.x1 + span.start * u.x, y: e.y1 + span.start * u.y };
            startB = { x: p.x - n.x * halfThick, y: p.y - n.y * halfThick };
            startA = { x: p.x + n.x * halfThick, y: p.y + n.y * halfThick };
          }

          if (isAtEnd && juncInfo && Array.isArray(juncInfo.polygon) && juncInfo.polygon.length === 4) {
            endB = juncInfo.polygon[1];
            endA = juncInfo.polygon[2];
          } else {
            const p = { x: e.x1 + span.end * u.x, y: e.y1 + span.end * u.y };
            endB = { x: p.x - n.x * halfThick, y: p.y - n.y * halfThick };
            endA = { x: p.x + n.x * halfThick, y: p.y + n.y * halfThick };
          }

          const interpStart = (tFrac) => ({
            x: startB.x + tFrac * (startA.x - startB.x),
            y: startB.y + tFrac * (startA.y - startB.y)
          });
          const interpEnd = (tFrac) => ({
            x: endB.x + tFrac * (endA.x - endB.x),
            y: endB.y + tFrac * (endA.y - endB.y)
          });

          let currentFraction = 0;
          for (let li = 0; li < layers.length; li++) {
            const layer = layers[li];
            const layerFrac = ((layer.thickness || 0) * scaleFactor) / totalThick;
            const nextFraction = Math.min(1.0, currentFraction + layerFrac);

            const pt0 = interpStart(currentFraction);
            const pt1 = interpEnd(currentFraction);
            const pt2 = interpEnd(nextFraction);
            const pt3 = interpStart(nextFraction);
            currentFraction = nextFraction;

            const sp0 = worldToSvg(transform, pt0.x, pt0.y);
            const sp1 = worldToSvg(transform, pt1.x, pt1.y);
            const sp2 = worldToSvg(transform, pt2.x, pt2.y);
            const sp3 = worldToSvg(transform, pt3.x, pt3.y);

            const pts = `${sp0.x.toFixed(1)},${sp0.y.toFixed(1)} ${sp1.x.toFixed(1)},${sp1.y.toFixed(1)} ${sp2.x.toFixed(1)},${sp2.y.toFixed(1)} ${sp3.x.toFixed(1)},${sp3.y.toFixed(1)}`;
            const layerColor = layer.color || 'rgba(122,162,255,0.18)';
            const hatchId = layer.hatch && layer.hatch !== 'solid' ? `hatch-${layer.hatch}` : null;

            wallSvg += `<polygon points="${pts}" fill="${layerColor}" stroke="${stroke}" stroke-width="${selected ? 1.5 : 0.8}" stroke-linejoin="round"/>`;
            if (hatchId) {
              wallSvg += `<polygon points="${pts}" fill="url(#${hatchId})" stroke="none" opacity="0.85" pointer-events="none"/>`;
            }
          }

          if (!isAtStart) {
            const sj0 = worldToSvg(transform, startB.x, startB.y);
            const sj1 = worldToSvg(transform, startA.x, startA.y);
            wallSvg += `<line x1="${sj0.x.toFixed(1)}" y1="${sj0.y.toFixed(1)}" x2="${sj1.x.toFixed(1)}" y2="${sj1.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.2 : 1.4}"/>`;
          }
          if (!isAtEnd) {
            const ej0 = worldToSvg(transform, endB.x, endB.y);
            const ej1 = worldToSvg(transform, endA.x, endA.y);
            wallSvg += `<line x1="${ej0.x.toFixed(1)}" y1="${ej0.y.toFixed(1)}" x2="${ej1.x.toFixed(1)}" y2="${ej1.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.2 : 1.4}"/>`;
          }
        }

        const a = worldToSvg(transform, e.x1, e.y1);
        const b = worldToSvg(transform, e.x2, e.y2);
        const hitWidth = Math.max(12, totalThick * transform.zoom);
        wallSvg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="transparent" stroke-width="${hitWidth.toFixed(1)}" stroke-linecap="butt"/>`;

        if (selected) {
          wallSvg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="var(--color-warning, #fbbf24)" stroke-width="1" stroke-dasharray="4 3" opacity="0.75" pointer-events="none"/>`;
        }

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">${wallSvg}</g>`;
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
      if (e.kind === 'block_instance') {
        const origin = worldToSvg(transform, e.x, e.y);
        const wPx = Math.max((e.width || 1) * transform.zoom, 8);
        const hPx = Math.max((e.depth || 1) * transform.zoom, 8);
        const rot = e.rotation || 0;
        const bDef = e.blockDef || {};
        let blockInner = '';
        if (Array.isArray(bDef.geometry)) {
          for (const g of bDef.geometry) {
            if (g.type === 'line') {
              blockInner += `<line x1="${(g.x1 * transform.zoom).toFixed(1)}" y1="${(g.y1 * transform.zoom).toFixed(1)}" x2="${(g.x2 * transform.zoom).toFixed(1)}" y2="${(g.y2 * transform.zoom).toFixed(1)}" stroke="${g.stroke || '#94a3b8'}" stroke-width="1.4" stroke-dasharray="${g.dash || ''}"/>`;
            } else if (g.type === 'rect') {
              blockInner += `<rect x="${(g.x * transform.zoom).toFixed(1)}" y="${(g.y * transform.zoom).toFixed(1)}" width="${(g.width * transform.zoom).toFixed(1)}" height="${(g.depth * transform.zoom).toFixed(1)}" fill="${g.fill || 'none'}" stroke="${g.stroke || '#94a3b8'}" stroke-width="1.4"/>`;
            } else if (g.type === 'circle') {
              blockInner += `<circle cx="${(g.cx * transform.zoom).toFixed(1)}" cy="${(g.cy * transform.zoom).toFixed(1)}" r="${(g.r * transform.zoom).toFixed(1)}" fill="${g.fill || 'none'}" stroke="${g.stroke || '#22c55e'}" stroke-width="1.4"/>`;
            } else if (g.type === 'ellipse') {
              blockInner += `<ellipse cx="${(g.cx * transform.zoom).toFixed(1)}" cy="${(g.cy * transform.zoom).toFixed(1)}" rx="${(g.rx * transform.zoom).toFixed(1)}" ry="${(g.ry * transform.zoom).toFixed(1)}" fill="${g.fill || 'none'}" stroke="${g.stroke || '#06b6d4'}" stroke-width="1.4"/>`;
            } else if (g.type === 'arc') {
              blockInner += `<circle cx="${(g.cx * transform.zoom).toFixed(1)}" cy="${(g.cy * transform.zoom).toFixed(1)}" r="${(g.r * transform.zoom).toFixed(1)}" fill="none" stroke="${g.stroke || '#10b981'}" stroke-dasharray="${g.dash || '3,3'}" stroke-width="1.2"/>`;
            }
          }
        }
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}" transform="translate(${origin.x.toFixed(1)}, ${origin.y.toFixed(1)}) rotate(${rot})">
          <rect x="0" y="0" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="rgba(168, 85, 247, 0.08)" stroke="${selected ? 'var(--color-warning, #fbbf24)' : 'rgba(168, 85, 247, 0.5)'}" stroke-width="${selected ? 2 : 1}" stroke-dasharray="3 3"/>
          ${blockInner}
          <text x="${(wPx / 2).toFixed(1)}" y="${(hPx + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text-muted, #889)" font-family="var(--font-mono)">${escapeHtml(e.name)}</text>
        </g>`;
      }
      if (e.kind === 'door') {
        const w = entities().find(x => x.id === e.wallId);
        if (w && typeof w.x1 === 'number') {
          try {
            const doorCAD = calcDoorCADGeometry(w, e);
            let doorSvg = '';
            const jambCol = 'var(--text-secondary, #9aa)';

            if (doorCAD.jamb1Line) {
              const j1a = worldToSvg(transform, doorCAD.jamb1Line[0].x, doorCAD.jamb1Line[0].y);
              const j1b = worldToSvg(transform, doorCAD.jamb1Line[1].x, doorCAD.jamb1Line[1].y);
              doorSvg += `<line x1="${j1a.x.toFixed(1)}" y1="${j1a.y.toFixed(1)}" x2="${j1b.x.toFixed(1)}" y2="${j1b.y.toFixed(1)}" stroke="${jambCol}" stroke-width="1.6"/>`;
            }
            if (doorCAD.jamb2Line) {
              const j2a = worldToSvg(transform, doorCAD.jamb2Line[0].x, doorCAD.jamb2Line[0].y);
              const j2b = worldToSvg(transform, doorCAD.jamb2Line[1].x, doorCAD.jamb2Line[1].y);
              doorSvg += `<line x1="${j2a.x.toFixed(1)}" y1="${j2a.y.toFixed(1)}" x2="${j2b.x.toFixed(1)}" y2="${j2b.y.toFixed(1)}" stroke="${jambCol}" stroke-width="1.6"/>`;
            }

            if (doorCAD.type === 'double') {
              for (const leaf of doorCAD.leaves) {
                const spHinge = worldToSvg(transform, leaf.hinge.x, leaf.hinge.y);
                const spOpen = worldToSvg(transform, leaf.openEnd.x, leaf.openEnd.y);
                const spClosed = worldToSvg(transform, leaf.closedEnd.x, leaf.closedEnd.y);
                const rSvg = leaf.radius * transform.zoom;
                const dx1 = spClosed.x - spHinge.x, dy1 = spClosed.y - spHinge.y;
                const dx2 = spOpen.x - spHinge.x, dy2 = spOpen.y - spHinge.y;
                const cross = dx1 * dy2 - dy1 * dx2;
                const sweepFlag = cross > 0 ? 1 : 0;

                doorSvg += `
                  <circle cx="${spHinge.x.toFixed(1)}" cy="${spHinge.y.toFixed(1)}" r="3" fill="var(--color-warning, #fbbf24)"/>
                  <line x1="${spHinge.x.toFixed(1)}" y1="${spHinge.y.toFixed(1)}" x2="${spOpen.x.toFixed(1)}" y2="${spOpen.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 2}"/>
                  <path d="M ${spClosed.x.toFixed(1)} ${spClosed.y.toFixed(1)} A ${rSvg.toFixed(1)} ${rSvg.toFixed(1)} 0 0 ${sweepFlag} ${spOpen.x.toFixed(1)} ${spOpen.y.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${selected ? 2 : 1.2}" stroke-dasharray="3 2"/>
                `;
              }
            } else {
              const spHinge = worldToSvg(transform, doorCAD.hinge.x, doorCAD.hinge.y);
              const spOpen = worldToSvg(transform, doorCAD.openEnd.x, doorCAD.openEnd.y);
              const spClosed = worldToSvg(transform, doorCAD.closedEnd.x, doorCAD.closedEnd.y);
              const rSvg = doorCAD.radius * transform.zoom;
              const dx1 = spClosed.x - spHinge.x, dy1 = spClosed.y - spHinge.y;
              const dx2 = spOpen.x - spHinge.x, dy2 = spOpen.y - spHinge.y;
              const cross = dx1 * dy2 - dy1 * dx2;
              const sweepFlag = cross > 0 ? 1 : 0;

              doorSvg += `
                <circle cx="${spHinge.x.toFixed(1)}" cy="${spHinge.y.toFixed(1)}" r="3.5" fill="var(--color-warning, #fbbf24)"/>
                <line x1="${spHinge.x.toFixed(1)}" y1="${spHinge.y.toFixed(1)}" x2="${spOpen.x.toFixed(1)}" y2="${spOpen.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.8 : 2}"/>
                <path d="M ${spClosed.x.toFixed(1)} ${spClosed.y.toFixed(1)} A ${rSvg.toFixed(1)} ${rSvg.toFixed(1)} 0 0 ${sweepFlag} ${spOpen.x.toFixed(1)} ${spOpen.y.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${selected ? 2 : 1.2}" stroke-dasharray="3 2"/>
              `;
            }

            return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">${doorSvg}</g>`;
          } catch (err) {
            // fallback
          }
        }
      }
      if (e.kind === 'window') {
        const w = entities().find(x => x.id === e.wallId);
        if (w && typeof w.x1 === 'number') {
          try {
            const winCAD = calcWindowCADGeometry(w, e);
            const j1a = worldToSvg(transform, winCAD.jamb1[0].x, winCAD.jamb1[0].y);
            const j1b = worldToSvg(transform, winCAD.jamb1[1].x, winCAD.jamb1[1].y);
            const j2a = worldToSvg(transform, winCAD.jamb2[0].x, winCAD.jamb2[0].y);
            const j2b = worldToSvg(transform, winCAD.jamb2[1].x, winCAD.jamb2[1].y);

            const soA = worldToSvg(transform, winCAD.sillOuter[0].x, winCAD.sillOuter[0].y);
            const soB = worldToSvg(transform, winCAD.sillOuter[1].x, winCAD.sillOuter[1].y);
            const siA = worldToSvg(transform, winCAD.sillInner[0].x, winCAD.sillInner[0].y);
            const siB = worldToSvg(transform, winCAD.sillInner[1].x, winCAD.sillInner[1].y);

            const g1a = worldToSvg(transform, winCAD.glassPane1[0].x, winCAD.glassPane1[0].y);
            const g1b = worldToSvg(transform, winCAD.glassPane1[1].x, winCAD.glassPane1[1].y);
            const g2a = worldToSvg(transform, winCAD.glassPane2[0].x, winCAD.glassPane2[0].y);
            const g2b = worldToSvg(transform, winCAD.glassPane2[1].x, winCAD.glassPane2[1].y);

            return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
              <polygon points="${g1a.x.toFixed(1)},${g1a.y.toFixed(1)} ${g1b.x.toFixed(1)},${g1b.y.toFixed(1)} ${g2b.x.toFixed(1)},${g2b.y.toFixed(1)} ${g2a.x.toFixed(1)},${g2a.y.toFixed(1)}" fill="rgba(56, 189, 248, 0.22)"/>
              <line x1="${j1a.x.toFixed(1)}" y1="${j1a.y.toFixed(1)}" x2="${j1b.x.toFixed(1)}" y2="${j1b.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}"/>
              <line x1="${j2a.x.toFixed(1)}" y1="${j2a.y.toFixed(1)}" x2="${j2b.x.toFixed(1)}" y2="${j2b.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}"/>
              <line x1="${soA.x.toFixed(1)}" y1="${soA.y.toFixed(1)}" x2="${soB.x.toFixed(1)}" y2="${soB.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.8}"/>
              <line x1="${siA.x.toFixed(1)}" y1="${siA.y.toFixed(1)}" x2="${siB.x.toFixed(1)}" y2="${siB.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.4}"/>
              <line x1="${g1a.x.toFixed(1)}" y1="${g1a.y.toFixed(1)}" x2="${g1b.x.toFixed(1)}" y2="${g1b.y.toFixed(1)}" stroke="var(--cyan-glow, #38bdf8)" stroke-width="1.2"/>
              <line x1="${g2a.x.toFixed(1)}" y1="${g2a.y.toFixed(1)}" x2="${g2b.x.toFixed(1)}" y2="${g2b.y.toFixed(1)}" stroke="var(--cyan-glow, #38bdf8)" stroke-width="1.2"/>
            </g>`;
          } catch (err) {
            // fallback
          }
        }
      }
      if (e.kind === 'dimension') {
        const p1World = e.p1 || { x: e.x1, y: e.y1 };
        const p2World = e.p2 || { x: e.x2, y: e.y2 };
        if (isNum(p1World.x) && isNum(p1World.y) && isNum(p2World.x) && isNum(p2World.y)) {
          const dimGeom = calcDimensionGeometry(p1World, p2World, {
            offset: typeof e.offset === 'number' ? e.offset : 0.6,
            style: e.style || 'tick',
            orientation: e.orientation || 'aligned',
            standoff: 0.08,
            overshoot: 0.12,
            tickSize: 0.18,
            arrowLength: 0.22,
            arrowWidth: 0.07
          });

          const dl1 = worldToSvg(transform, dimGeom.dimLine[0].x, dimGeom.dimLine[0].y);
          const dl2 = worldToSvg(transform, dimGeom.dimLine[1].x, dimGeom.dimLine[1].y);
          const w1a = worldToSvg(transform, dimGeom.witness1[0].x, dimGeom.witness1[0].y);
          const w1b = worldToSvg(transform, dimGeom.witness1[1].x, dimGeom.witness1[1].y);
          const w2a = worldToSvg(transform, dimGeom.witness2[0].x, dimGeom.witness2[0].y);
          const w2b = worldToSvg(transform, dimGeom.witness2[1].x, dimGeom.witness2[1].y);
          const textSvg = worldToSvg(transform, dimGeom.textMid.x, dimGeom.textMid.y);

          const displayText = formatDimensionText(dimGeom.distance, e.unit, e.dualUnit, e.textOverride);
          const badgeWidth = Math.max(38, displayText.length * 6.5 + 14);

          let markersSvg = '';
          if (dimGeom.style === 'tick') {
            for (const tick of dimGeom.ticks) {
              const t1 = worldToSvg(transform, tick[0].x, tick[0].y);
              const t2 = worldToSvg(transform, tick[1].x, tick[1].y);
              markersSvg += `<line x1="${t1.x.toFixed(1)}" y1="${t1.y.toFixed(1)}" x2="${t2.x.toFixed(1)}" y2="${t2.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.6 : 1.8}" stroke-linecap="round"/>`;
            }
          } else if (dimGeom.style === 'arrow') {
            for (const arrow of dimGeom.arrows) {
              const pts = arrow.map(p => {
                const sp = worldToSvg(transform, p.x, p.y);
                return `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`;
              }).join(' ');
              markersSvg += `<polygon points="${pts}" fill="${stroke}"/>`;
            }
          } else if (dimGeom.style === 'dot') {
            for (const dot of dimGeom.dots) {
              const dp = worldToSvg(transform, dot.x, dot.y);
              markersSvg += `<circle cx="${dp.x.toFixed(1)}" cy="${dp.y.toFixed(1)}" r="${Math.max(2.5, dot.radius * transform.zoom)}" fill="${stroke}"/>`;
            }
          }

          const svgAngle = -dimGeom.textAngle;

          return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
            <line x1="${w1a.x.toFixed(1)}" y1="${w1a.y.toFixed(1)}" x2="${w1b.x.toFixed(1)}" y2="${w1b.y.toFixed(1)}" stroke="${stroke}" stroke-width="1.0" opacity="0.7"/>
            <line x1="${w2a.x.toFixed(1)}" y1="${w2a.y.toFixed(1)}" x2="${w2b.x.toFixed(1)}" y2="${w2b.y.toFixed(1)}" stroke="${stroke}" stroke-width="1.0" opacity="0.7"/>
            <line x1="${dl1.x.toFixed(1)}" y1="${dl1.y.toFixed(1)}" x2="${dl2.x.toFixed(1)}" y2="${dl2.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 2.0 : 1.3}"/>
            ${markersSvg}
            <line x1="${dl1.x.toFixed(1)}" y1="${dl1.y.toFixed(1)}" x2="${dl2.x.toFixed(1)}" y2="${dl2.y.toFixed(1)}" stroke="transparent" stroke-width="14" style="cursor: pointer;"/>
            <g transform="rotate(${svgAngle.toFixed(1)} ${textSvg.x.toFixed(1)} ${textSvg.y.toFixed(1)})" pointer-events="none">
              <rect x="${(textSvg.x - badgeWidth / 2).toFixed(1)}" y="${(textSvg.y - 9).toFixed(1)}" width="${badgeWidth.toFixed(1)}" height="18" rx="3" fill="var(--bg-surface-elevated, #28292e)" stroke="${stroke}" stroke-width="${selected ? 1.4 : 0.8}"/>
              <text x="${textSvg.x.toFixed(1)}" y="${(textSvg.y + 4).toFixed(1)}" text-anchor="middle" font-size="9.5" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)" font-weight="700">${escapeHtml(displayText)}</text>
            </g>
          </g>`;
        }
      }
      if (e.kind === 'stair' && hasRect) {
        const p1 = worldToSvg(transform, e.x, e.y + e.depth);
        const p2 = worldToSvg(transform, e.x + e.width, e.y);
        const wPx = Math.max(Math.abs(p2.x - p1.x), 6);
        const hPx = Math.max(Math.abs(p1.y - p2.y), 6);
        const risers = Math.max(2, e.risers || 16);
        const isVertical = (e.depth || 0) >= (e.width || 0);
        const cutStep = e.cutStep || Math.min(risers - 1, Math.max(1, Math.round(risers * 0.45)));
        const showBreak = e.showBreakLine !== false;

        let treadLines = '';
        for (let i = 1; i < risers; i++) {
          const isAboveCut = showBreak && i > cutStep;
          const lineStroke = isAboveCut ? 'var(--text-muted, #64748b)' : stroke;
          const dash = isAboveCut ? 'stroke-dasharray="3 2" opacity="0.6"' : 'opacity="0.85"';
          const sw = isAboveCut ? 0.7 : 1.0;

          if (isVertical) {
            const stepY = p2.y + (i / risers) * hPx;
            treadLines += `<line x1="${p1.x.toFixed(1)}" y1="${stepY.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${stepY.toFixed(1)}" stroke="${lineStroke}" stroke-width="${sw}" ${dash}/>`;
          } else {
            const stepX = p1.x + (i / risers) * wPx;
            treadLines += `<line x1="${stepX.toFixed(1)}" y1="${p2.y.toFixed(1)}" x2="${stepX.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="${lineStroke}" stroke-width="${sw}" ${dash}/>`;
          }
        }

        // Break line at cutStep
        let breakLineSvg = '';
        if (showBreak && cutStep < risers) {
          if (isVertical) {
            const by = p2.y + (cutStep / risers) * hPx;
            const bmidX = (p1.x + p2.x) / 2;
            breakLineSvg = `<polyline points="${p1.x.toFixed(1)},${(by + 3).toFixed(1)} ${(bmidX - 6).toFixed(1)},${(by + 3).toFixed(1)} ${(bmidX - 2).toFixed(1)},${(by - 6).toFixed(1)} ${(bmidX + 2).toFixed(1)},${(by + 6).toFixed(1)} ${(bmidX + 6).toFixed(1)},${(by - 3).toFixed(1)} ${p2.x.toFixed(1)},${(by - 3).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.8"/>`;
          } else {
            const bx = p1.x + (cutStep / risers) * wPx;
            const bmidY = (p1.y + p2.y) / 2;
            breakLineSvg = `<polyline points="${(bx - 3).toFixed(1)},${p2.y.toFixed(1)} ${(bx - 3).toFixed(1)},${(bmidY - 6).toFixed(1)} ${(bx + 6).toFixed(1)},${(bmidY - 2).toFixed(1)} ${(bx - 6).toFixed(1)},${(bmidY + 2).toFixed(1)} ${(bx + 3).toFixed(1)},${(bmidY + 6).toFixed(1)} ${(bx + 3).toFixed(1)},${p1.y.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.8"/>`;
          }
        }

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const arrow = isVertical
          ? `<line x1="${midX.toFixed(1)}" y1="${(p1.y - 4).toFixed(1)}" x2="${midX.toFixed(1)}" y2="${(p2.y + 12).toFixed(1)}" stroke="var(--note-number, #4989D9)" stroke-width="1.8"/>
             <polygon points="${midX.toFixed(1)},${(p2.y + 3).toFixed(1)} ${(midX - 4).toFixed(1)},${(p2.y + 12).toFixed(1)} ${(midX + 4).toFixed(1)},${(p2.y + 12).toFixed(1)}" fill="var(--note-number, #4989D9)"/>
             <circle cx="${midX.toFixed(1)}" cy="${(p1.y - 4).toFixed(1)}" r="2.5" fill="var(--note-number, #4989D9)"/>
             <text x="${(midX + 8).toFixed(1)}" y="${midY.toFixed(1)}" font-size="9" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)" font-weight="700">${e.direction === 'down' ? 'DN' : 'UP'}</text>`
          : `<line x1="${(p1.x + 4).toFixed(1)}" y1="${midY.toFixed(1)}" x2="${(p2.x - 12).toFixed(1)}" y2="${midY.toFixed(1)}" stroke="var(--note-number, #4989D9)" stroke-width="1.8"/>
             <polygon points="${(p2.x - 3).toFixed(1)},${midY.toFixed(1)} ${(p2.x - 12).toFixed(1)},${(midY - 4).toFixed(1)} ${(p2.x - 12).toFixed(1)},${(midY + 4).toFixed(1)}" fill="var(--note-number, #4989D9)"/>
             <circle cx="${(p1.x + 4).toFixed(1)}" cy="${midY.toFixed(1)}" r="2.5" fill="var(--note-number, #4989D9)"/>
             <text x="${midX.toFixed(1)}" y="${(midY - 6).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)" font-weight="700">${e.direction === 'down' ? 'DN' : 'UP'}</text>`;

        const complianceBadge = e.isCompliant ? ' · ✅ IBC' : '';
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}"
            fill="rgba(73, 137, 217, 0.08)" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}"/>
          ${treadLines}
          ${breakLineSvg}
          ${arrow}
          <text x="${midX.toFixed(1)}" y="${(p1.y + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">${escapeHtml(e.name)} · ${risers}R${complianceBadge}</text>
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
      if (e.kind === 'room_tag') {
        const room = e.roomId ? entities().find(r => r.id === e.roomId) : null;
        const areaVal = room ? roomArea(room) : (e.area || 0);
        const p = worldToSvg(transform, e.x, e.y);
        const tagNum = e.roomNumber || '101';
        const roomTitle = (e.name || (room ? room.name : 'ROOM')).toUpperCase();
        const areaStr = `${areaVal.toFixed(1)} m²`;
        const boxW = Math.max(76, Math.max(roomTitle.length * 7.5, areaStr.length * 7.5) + 20);
        const boxH = 44;

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <rect x="${(p.x - boxW / 2).toFixed(1)}" y="${(p.y - boxH / 2).toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH}" rx="4"
            fill="var(--bg-surface-elevated, #222327)" stroke="${stroke}" stroke-width="${selected ? 2.2 : 1.2}"/>
          <rect x="${(p.x - 22).toFixed(1)}" y="${(p.y - boxH / 2 - 8).toFixed(1)}" width="44" height="14" rx="3"
            fill="var(--accent-primary, #4989D9)" stroke="${stroke}" stroke-width="0.8"/>
          <text x="${p.x.toFixed(1)}" y="${(p.y - boxH / 2 + 3).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="#ffffff" font-weight="700">${escapeHtml(tagNum)}</text>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 3).toFixed(1)}" text-anchor="middle" font-size="9.5" font-family="var(--font-mono)" fill="var(--text-primary, #EAEAEC)" font-weight="700">${escapeHtml(roomTitle)}</text>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 16).toFixed(1)}" text-anchor="middle" font-size="8.5" font-family="var(--font-mono)" fill="var(--note-number, #4989D9)">${escapeHtml(areaStr)}</text>
        </g>`;
      }
      if (e.kind === 'door_tag') {
        const p = worldToSvg(transform, e.x, e.y);
        const tagText = e.tag || 'D01';
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="15" ry="10"
            fill="var(--bg-surface-elevated, #222327)" stroke="${stroke}" stroke-width="${selected ? 2.2 : 1.4}"/>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--color-warning, #fbbf24)" font-weight="700">${escapeHtml(tagText)}</text>
        </g>`;
      }
      if (e.kind === 'window_tag') {
        const p = worldToSvg(transform, e.x, e.y);
        const tagText = e.tag || 'W01';
        const s = 12;
        const hexPts = [0, 60, 120, 180, 240, 300].map(deg => {
          const rad = deg * Math.PI / 180;
          return `${(p.x + s * Math.cos(rad)).toFixed(1)},${(p.y + s * Math.sin(rad)).toFixed(1)}`;
        }).join(' ');

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <polygon points="${hexPts}"
            fill="var(--bg-surface-elevated, #222327)" stroke="${stroke}" stroke-width="${selected ? 2.2 : 1.4}"/>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="8.5" font-family="var(--font-mono)" fill="var(--cyan-glow, #38bdf8)" font-weight="700">${escapeHtml(tagText)}</text>
        </g>`;
      }
      if (e.kind === 'line') {
        const sP1 = worldToSvg(transform, e.x1, e.y1);
        const sP2 = worldToSvg(transform, e.x2, e.y2);
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <line x1="${sP1.x.toFixed(1)}" y1="${sP1.y.toFixed(1)}" x2="${sP2.x.toFixed(1)}" y2="${sP2.y.toFixed(1)}"
            stroke="${stroke}" stroke-width="${selected ? 2.4 : 1.3}" stroke-linecap="round"/>
        </g>`;
      }
      if (e.kind === 'leader') {
        const p1 = e.p1 || { x: e.x || 0, y: e.y || 0 };
        const knee = e.knee || { x: p1.x + 0.5, y: p1.y + 0.5 };
        const p2 = e.p2 || { x: knee.x + 0.8, y: knee.y };
        const sP1 = worldToSvg(transform, p1.x, p1.y);
        const sKnee = worldToSvg(transform, knee.x, knee.y);
        const sP2 = worldToSvg(transform, p2.x, p2.y);
        const textStr = String(e.text || 'Callout');
        const textX = sP2.x + (sP2.x >= sKnee.x ? 4 : -4);
        const textAnchor = sP2.x >= sKnee.x ? 'start' : 'end';

        const ang = Math.atan2(sKnee.y - sP1.y, sKnee.x - sP1.x);
        const arrowLen = 9;
        const a1 = { x: sP1.x + arrowLen * Math.cos(ang - 0.4), y: sP1.y + arrowLen * Math.sin(ang - 0.4) };
        const a2 = { x: sP1.x + arrowLen * Math.cos(ang + 0.4), y: sP1.y + arrowLen * Math.sin(ang + 0.4) };

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <polygon points="${sP1.x.toFixed(1)},${sP1.y.toFixed(1)} ${a1.x.toFixed(1)},${a1.y.toFixed(1)} ${a2.x.toFixed(1)},${a2.y.toFixed(1)}" fill="${stroke}"/>
          <polyline points="${sP1.x.toFixed(1)},${sP1.y.toFixed(1)} ${sKnee.x.toFixed(1)},${sKnee.y.toFixed(1)} ${sP2.x.toFixed(1)},${sP2.y.toFixed(1)}"
            fill="none" stroke="${stroke}" stroke-width="${selected ? 2.2 : 1.4}"/>
          <text x="${textX.toFixed(1)}" y="${(sP2.y - 4).toFixed(1)}" text-anchor="${textAnchor}" font-size="10.5" font-family="var(--font-mono)" fill="var(--text-primary, #EAEAEC)" font-weight="600">${escapeHtml(textStr)}</text>
        </g>`;
      }
      if (e.kind === 'north_arrow') {
        const p = worldToSvg(transform, e.x, e.y);
        const rot = typeof e.rotation === 'number' ? e.rotation : 0;
        const sc = typeof e.scale === 'number' ? e.scale : 1.0;
        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}" transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${rot}) scale(${sc})">
          <circle cx="0" cy="0" r="18" fill="var(--bg-surface-elevated, #222327)" stroke="${stroke}" stroke-width="${selected ? 2.4 : 1.5}"/>
          <line x1="0" y1="-18" x2="0" y2="18" stroke="var(--border-color-light, #444)" stroke-width="0.8"/>
          <line x1="-18" y1="0" x2="18" y2="0" stroke="var(--border-color-light, #444)" stroke-width="0.8"/>
          <polygon points="0,-16 -5,0 0,0" fill="${stroke}"/>
          <polygon points="0,-16 5,0 0,0" fill="none" stroke="${stroke}" stroke-width="1.2"/>
          <polygon points="0,16 -4,0 0,0" fill="none" stroke="var(--text-muted, #777)" stroke-width="0.8"/>
          <polygon points="0,16 4,0 0,0" fill="var(--text-muted, #777)" opacity="0.5"/>
          <circle cx="0" cy="0" r="2.5" fill="${stroke}"/>
          <text x="0" y="-22" text-anchor="middle" font-size="11" font-family="var(--font-mono)" font-weight="800" fill="${stroke}">N</text>
        </g>`;
      }
      if (e.kind === 'column') {
        const contour = columnContour(e);
        const hatches = columnHatchLines(e);
        const ptsSvg = contour.map(([cx, cy]) => {
          const sp = worldToSvg(transform, cx, cy);
          return `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`;
        }).join(' ');

        const hatchLinesSvg = hatches.map(h => {
          const sp1 = worldToSvg(transform, h.x1, h.y1);
          const sp2 = worldToSvg(transform, h.x2, h.y2);
          return `<line x1="${sp1.x.toFixed(1)}" y1="${sp1.y.toFixed(1)}" x2="${sp2.x.toFixed(1)}" y2="${sp2.y.toFixed(1)}" stroke="${stroke}" stroke-width="${selected ? 1.5 : 1}" opacity="0.65"/>`;
        }).join('');

        const centerSvg = worldToSvg(transform, e.x, e.y);
        const cd = e.depth || 0.4;

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <polygon points="${ptsSvg}" fill="var(--bg-chip, #334155)" stroke="${stroke}" stroke-width="${selected ? 2.5 : 1.5}"/>
          ${hatchLinesSvg}
          <text x="${centerSvg.x.toFixed(1)}" y="${(centerSvg.y + cd * transform.zoom / 2 + 12).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="var(--text-muted, #888)" font-family="var(--font-mono)">${escapeHtml(e.name || 'Col')}</text>
        </g>`;
      }
      if (e.kind === 'section_cut') {
        const p1 = e.p1 || { x: e.x, y: e.y };
        const p2 = e.p2 || { x: e.x + (e.width || 10), y: e.y };
        const sp1 = worldToSvg(transform, p1.x, p1.y);
        const sp2 = worldToSvg(transform, p2.x, p2.y);
        const cutStroke = selected ? 'var(--color-warning, #fbbf24)' : (stroke || '#f87171');
        const lbl = e.label || 'A';
        const sRef = e.sheetRef || 'A-201';

        const dx = sp2.x - sp1.x;
        const dy = sp2.y - sp1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const arrowDir = e.direction === 'reverse' ? -1 : 1;
        const ax = nx * 14 * arrowDir;
        const ay = ny * 14 * arrowDir;

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <line x1="${sp1.x.toFixed(1)}" y1="${sp1.y.toFixed(1)}" x2="${sp2.x.toFixed(1)}" y2="${sp2.y.toFixed(1)}" stroke="${cutStroke}" stroke-width="${selected ? 2.5 : 1.8}" stroke-dasharray="14 4 3 4"/>
          <line x1="${sp1.x.toFixed(1)}" y1="${sp1.y.toFixed(1)}" x2="${(sp1.x + ax).toFixed(1)}" y2="${(sp1.y + ay).toFixed(1)}" stroke="${cutStroke}" stroke-width="2"/>
          <circle cx="${sp1.x.toFixed(1)}" cy="${sp1.y.toFixed(1)}" r="14" fill="#1e293b" stroke="${cutStroke}" stroke-width="2"/>
          <line x1="${(sp1.x - 14).toFixed(1)}" y1="${sp1.y.toFixed(1)}" x2="${(sp1.x + 14).toFixed(1)}" y2="${sp1.y.toFixed(1)}" stroke="${cutStroke}" stroke-width="1"/>
          <text x="${sp1.x.toFixed(1)}" y="${(sp1.y - 3).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" font-weight="bold" fill="#f8fafc">${escapeHtml(lbl)}</text>
          <text x="${sp1.x.toFixed(1)}" y="${(sp1.y + 9).toFixed(1)}" text-anchor="middle" font-size="7.5" font-family="var(--font-mono)" fill="#94a3b8">${escapeHtml(sRef)}</text>
          <line x1="${sp2.x.toFixed(1)}" y1="${sp2.y.toFixed(1)}" x2="${(sp2.x + ax).toFixed(1)}" y2="${(sp2.y + ay).toFixed(1)}" stroke="${cutStroke}" stroke-width="2"/>
          <circle cx="${sp2.x.toFixed(1)}" cy="${sp2.y.toFixed(1)}" r="14" fill="#1e293b" stroke="${cutStroke}" stroke-width="2"/>
          <line x1="${(sp2.x - 14).toFixed(1)}" y1="${sp2.y.toFixed(1)}" x2="${(sp2.x + 14).toFixed(1)}" y2="${sp2.y.toFixed(1)}" stroke="${cutStroke}" stroke-width="1"/>
          <text x="${sp2.x.toFixed(1)}" y="${(sp2.y - 3).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" font-weight="bold" fill="#f8fafc">${escapeHtml(lbl)}</text>
          <text x="${sp2.x.toFixed(1)}" y="${(sp2.y + 9).toFixed(1)}" text-anchor="middle" font-size="7.5" font-family="var(--font-mono)" fill="#94a3b8">${escapeHtml(sRef)}</text>
        </g>`;
      }
      if (e.kind === 'detail_callout') {
        const center = worldToSvg(transform, e.x + (e.width || 1.5) / 2, e.y + (e.depth || 1.5) / 2);
        const radiusPx = Math.max(16, ((e.width || 1.5) / 2) * transform.zoom);
        const leaderLen = Math.max(25, (e.leaderLength || 1.2) * transform.zoom);
        const angRad = ((e.leaderAngle || 45) * Math.PI) / 180;
        const bubbleX = center.x + Math.cos(angRad) * (radiusPx + leaderLen);
        const bubbleY = center.y - Math.sin(angRad) * (radiusPx + leaderLen);
        const rBubble = 14;
        const detStroke = selected ? 'var(--color-warning, #fbbf24)' : (stroke || '#34d399');

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <!-- Callout Boundary -->
          <circle cx="${center.x.toFixed(1)}" cy="${center.y.toFixed(1)}" r="${radiusPx.toFixed(1)}" fill="rgba(52, 211, 153, 0.08)" stroke="${detStroke}" stroke-width="${selected ? 2.5 : 1.5}" stroke-dasharray="6 3"/>
          <!-- Leader line -->
          <line x1="${(center.x + Math.cos(angRad) * radiusPx).toFixed(1)}" y1="${(center.y - Math.sin(angRad) * radiusPx).toFixed(1)}" x2="${(bubbleX - Math.cos(angRad) * rBubble).toFixed(1)}" y2="${(bubbleY + Math.sin(angRad) * rBubble).toFixed(1)}" stroke="${detStroke}" stroke-width="1.8"/>
          <!-- Callout Bubble -->
          <circle cx="${bubbleX.toFixed(1)}" cy="${bubbleY.toFixed(1)}" r="${rBubble}" fill="#0f172a" stroke="${detStroke}" stroke-width="2"/>
          <line x1="${(bubbleX - rBubble).toFixed(1)}" y1="${bubbleY.toFixed(1)}" x2="${(bubbleX + rBubble).toFixed(1)}" y2="${bubbleY.toFixed(1)}" stroke="${detStroke}" stroke-width="1.2"/>
          <text x="${bubbleX.toFixed(1)}" y="${(bubbleY - 3).toFixed(1)}" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" font-weight="700" fill="#ffffff">${escapeHtml(e.detailNum || '1')}</text>
          <text x="${bubbleX.toFixed(1)}" y="${(bubbleY + 9).toFixed(1)}" text-anchor="middle" font-family="var(--font-mono)" font-size="7.5" font-family="var(--font-mono)" fill="#34d399">${escapeHtml(e.sheetRef || 'A-501')}</text>
          <text x="${bubbleX.toFixed(1)}" y="${(bubbleY + rBubble + 12).toFixed(1)}" text-anchor="middle" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-normal,#f8fafc)">${escapeHtml(e.title || 'Detail')}</text>
        </g>`;
      }
      if (e.kind === 'grid_line' && e.p1 && e.p2) {
        const sp1 = worldToSvg(transform, e.p1.x, e.p1.y);
        const sp2 = worldToSvg(transform, e.p2.x, e.p2.y);
        const bRadPx = Math.max(10, (e.bubbleRadius || 0.35) * transform.zoom);
        const gridColor = selected ? 'var(--color-warning, #fbbf24)' : 'var(--text-muted, #94a3b8)';

        let bubbles = '';
        if (e.bubblePosition === 'both' || e.bubblePosition === 'start') {
          bubbles += `<circle cx="${sp1.x.toFixed(1)}" cy="${sp1.y.toFixed(1)}" r="${bRadPx.toFixed(1)}" fill="var(--bg-surface-elevated, #1e293b)" stroke="${gridColor}" stroke-width="${selected ? 2 : 1.2}"/>
            <text x="${sp1.x.toFixed(1)}" y="${(sp1.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" font-weight="700" fill="var(--text-normal, #f8fafc)">${escapeHtml(e.name)}</text>`;
        }
        if (e.bubblePosition === 'both' || e.bubblePosition === 'end') {
          bubbles += `<circle cx="${sp2.x.toFixed(1)}" cy="${sp2.y.toFixed(1)}" r="${bRadPx.toFixed(1)}" fill="var(--bg-surface-elevated, #1e293b)" stroke="${gridColor}" stroke-width="${selected ? 2 : 1.2}"/>
            <text x="${sp2.x.toFixed(1)}" y="${(sp2.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" font-weight="700" fill="var(--text-normal, #f8fafc)">${escapeHtml(e.name)}</text>`;
        }

        return `<g class="plan-entity" data-entity-id="${escapeHtml(e.id)}">
          <line x1="${sp1.x.toFixed(1)}" y1="${sp1.y.toFixed(1)}" x2="${sp2.x.toFixed(1)}" y2="${sp2.y.toFixed(1)}" stroke="${gridColor}" stroke-width="${selected ? 2 : 1.2}" stroke-dasharray="10 4 2 4"/>
          ${bubbles}
        </g>`;
      }
      return '';
    }).join('');

    // Rubber-band rectangle / line while creating
    let dragMarkup = '';
    if (dragState && dragState.mode === 'marqueeOrPan' && dragState.marquee && dragState.current) {
      // Rubber-band box pick preview
      const ax = Math.min(dragState.startWorld.x, dragState.current.x);
      const ay = Math.min(dragState.startWorld.y, dragState.current.y);
      const bx = Math.max(dragState.startWorld.x, dragState.current.x);
      const by = Math.max(dragState.startWorld.y, dragState.current.y);
      const p1 = worldToSvg(transform, ax, by);
      const p2 = worldToSvg(transform, bx, ay);
      dragMarkup = `
        <g class="marquee-preview" pointer-events="none">
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${(p2.x - p1.x).toFixed(1)}" height="${(p1.y - p2.y).toFixed(1)}"
            fill="rgba(73,137,217,0.14)" stroke="var(--accent-primary, #4989D9)" stroke-width="1.6" stroke-dasharray="5 3"/>
          <rect x="${p1.x.toFixed(1)}" y="${p2.y.toFixed(1)}" width="${(p2.x - p1.x).toFixed(1)}" height="${(p1.y - p2.y).toFixed(1)}"
            fill="none" stroke="rgba(73,137,217,0.35)" stroke-width="3"/>
          <text x="${(p1.x + 5).toFixed(1)}" y="${(p2.y + 14).toFixed(1)}" font-size="10" font-family="var(--font-mono)"
            fill="#ffffff" font-weight="700" style="paint-order: stroke; stroke: rgba(0,0,0,0.75); stroke-width: 3px;">${dragState.additive ? '+ADD ' : ''}${Math.abs(bx - ax).toFixed(2)} × ${Math.abs(by - ay).toFixed(2)} m</text>
        </g>`;
    }
    if (dragState && dragState.mode === 'create' && dragState.current) {
      if (dragState.tool === 'measure') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const meas = computeMeasurement(dragState.start, dragState.current);
        const col = 'var(--accent-action, #D32F2F)';
        dragMarkup = `
          <g class="measure-indicator" pointer-events="none">
            <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${col}" stroke-width="2" stroke-dasharray="4 3"/>
            <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="4" fill="${col}"/>
            <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="4" fill="${col}"/>
            <rect x="${(mid.x - 48).toFixed(1)}" y="${(mid.y - 20).toFixed(1)}" width="96" height="20" rx="3" fill="var(--bg-surface-elevated, #222327)" stroke="${col}" stroke-width="1.2"/>
            <text x="${mid.x.toFixed(1)}" y="${(mid.y - 6).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="#ffffff" font-weight="700">${meas.distance.toFixed(2)}m · ${meas.angleDeg.toFixed(0)}°</text>
          </g>`;
      } else if (dragState.tool === 'leader') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        const kneeWorld = { x: dragState.start.x + (dragState.current.x - dragState.start.x) * 0.6, y: dragState.current.y };
        const k = worldToSvg(transform, kneeWorld.x, kneeWorld.y);
        const col = 'var(--accent-primary, #7aa2ff)';
        dragMarkup = `
          <polyline points="${a.x.toFixed(1)},${a.y.toFixed(1)} ${k.x.toFixed(1)},${k.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="4 2"/>
          <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="3.5" fill="${col}"/>
          <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="3.5" fill="${col}"/>
          <text x="${(b.x + 6).toFixed(1)}" y="${(b.y - 4).toFixed(1)}" font-size="10" font-family="var(--font-mono)" fill="${col}">Note</text>`;
      } else if (dragState.tool === 'wall' || dragState.tool === 'dimension' || dragState.tool === 'line') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dM = Math.hypot(dragState.current.x - dragState.start.x, dragState.current.y - dragState.start.y);
        const deg = ((Math.atan2(dragState.current.y - dragState.start.y, dragState.current.x - dragState.start.x) * 180 / Math.PI) + 360) % 360;
        const col = 'var(--color-warning, #fbbf24)';
        dragMarkup = `
          <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${col}" stroke-width="2" stroke-dasharray="5 3"/>
          <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="3.5" fill="${col}"/>
          <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="3.5" fill="${col}"/>
          <rect x="${(mid.x - 45).toFixed(1)}" y="${(mid.y - 18).toFixed(1)}" width="90" height="18" rx="3" fill="var(--bg-surface-raised, #29292e)" stroke="${col}" stroke-width="1"/>
          <text x="${mid.x.toFixed(1)}" y="${(mid.y - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" fill="#ffffff" font-weight="700">${dM.toFixed(2)}m · ${deg.toFixed(0)}°</text>`;
      } else if (dragState.tool === 'room') {
        const a = worldToSvg(transform, Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.y, dragState.current.y));
        const b = worldToSvg(transform, Math.max(dragState.start.x, dragState.current.x), Math.min(dragState.start.y, dragState.current.y));
        const rw = Math.abs(dragState.current.x - dragState.start.x);
        const rd = Math.abs(dragState.current.y - dragState.start.y);
        const area = rw * rd;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        dragMarkup = `
          <rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${(b.x - a.x).toFixed(1)}" height="${(a.y - b.y).toFixed(1)}"
            fill="rgba(73,137,217,0.12)" stroke="var(--accent-primary, #4989D9)" stroke-width="1.8" stroke-dasharray="5 3"/>
          <rect x="${(midX - 35).toFixed(1)}" y="${(midY - 10).toFixed(1)}" width="70" height="18" rx="3" fill="var(--bg-surface-elevated, #222327)" stroke="var(--accent-primary, #4989D9)" stroke-width="0.8"/>
          <text x="${midX.toFixed(1)}" y="${(midY + 3).toFixed(1)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--text-primary, #EAEAEC)">${rw.toFixed(2)}×${rd.toFixed(2)}m · ${area.toFixed(1)}m²</text>`;
      } else if (dragState.tool === 'stair' || dragState.tool === 'ramp') {
        const a = worldToSvg(transform, Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.y, dragState.current.y));
        const b = worldToSvg(transform, Math.max(dragState.start.x, dragState.current.x), Math.min(dragState.start.y, dragState.current.y));
        const col = dragState.tool === 'stair' ? 'var(--note-number, #4989D9)' : 'var(--accent-action, #D32F2F)';
        dragMarkup = `<rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${(b.x - a.x).toFixed(1)}" height="${(a.y - b.y).toFixed(1)}"
          fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      } else if (dragState.tool === 'grid') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        dragMarkup = `
          <g class="drag-preview-grid" pointer-events="none">
            <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="var(--accent-primary, #4989D9)" stroke-width="1.8" stroke-dasharray="8 4 2 4"/>
            <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="12" fill="var(--bg-surface-elevated, #1e293b)" stroke="var(--accent-primary, #4989D9)" stroke-width="1.5"/>
            <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="12" fill="var(--bg-surface-elevated, #1e293b)" stroke="var(--accent-primary, #4989D9)" stroke-width="1.5"/>
          </g>
        `;
      } else if (dragState.tool === 'section_cut') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        dragMarkup = `
          <g class="drag-preview-section" pointer-events="none">
            <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#f87171" stroke-width="2" stroke-dasharray="12 4 3 4"/>
            <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="12" fill="var(--bg-surface-elevated, #1e293b)" stroke="#f87171" stroke-width="1.8"/>
            <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="12" fill="var(--bg-surface-elevated, #1e293b)" stroke="#f87171" stroke-width="1.8"/>
          </g>
        `;
      } else if (dragState.tool === 'detail_callout') {
        const a = worldToSvg(transform, dragState.start.x, dragState.start.y);
        const b = worldToSvg(transform, dragState.current.x, dragState.current.y);
        const r = Math.max(16, Math.hypot(b.x - a.x, b.y - a.y));
        dragMarkup = `
          <g class="drag-preview-detail" pointer-events="none">
            <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(52, 211, 153, 0.1)" stroke="#34d399" stroke-width="2" stroke-dasharray="6 3"/>
            <circle cx="${(a.x + r + 20).toFixed(1)}" cy="${(a.y - r - 20).toFixed(1)}" r="14" fill="#0f172a" stroke="#34d399" stroke-width="2"/>
            <line x1="${(a.x + r).toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${(a.x + r + 20).toFixed(1)}" y2="${(a.y - r - 20).toFixed(1)}" stroke="#34d399" stroke-width="1.8"/>
          </g>
        `;
      } else {
        const a = worldToSvg(transform, Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.y, dragState.current.y));
        const b = worldToSvg(transform, Math.max(dragState.start.x, dragState.current.x), Math.min(dragState.start.y, dragState.current.y));
        dragMarkup = `<rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${(b.x - a.x).toFixed(1)}" height="${(a.y - b.y).toFixed(1)}"
          fill="none" stroke="var(--color-warning,#fbbf24)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      }
    }

    // Render in-progress polygonal room
    if (polyRoomVertices.length > 0) {
      const ptsSvg = polyRoomVertices.map(pt => worldToSvg(transform, pt.x, pt.y));
      const curSvg = worldToSvg(transform, currentMouseWorld.x, currentMouseWorld.y);
      const polylineStr = [...ptsSvg, curSvg].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const dotsStr = ptsSvg.map((p, idx) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="var(--accent-primary, #38bdf8)" stroke="#ffffff" stroke-width="1.5"/><text x="${(p.x + 6).toFixed(1)}" y="${(p.y - 6).toFixed(1)}" font-size="9" fill="var(--text-secondary,#9aa)" font-family="var(--font-mono)">P${idx + 1}</text>`).join('');

      const first = polyRoomVertices[0];
      const distToFirst = Math.hypot(currentMouseWorld.x - first.x, currentMouseWorld.y - first.y);
      const isClosing = polyRoomVertices.length >= 3 && distToFirst <= Math.max(0.4, state.plan.grid);
      const closeIndicator = isClosing
        ? `<circle cx="${ptsSvg[0].x.toFixed(1)}" cy="${ptsSvg[0].y.toFixed(1)}" r="10" fill="none" stroke="var(--color-success, #4ade80)" stroke-width="2.5" stroke-dasharray="3 2"/><text x="${ptsSvg[0].x.toFixed(1)}" y="${(ptsSvg[0].y - 14).toFixed(1)}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" fill="var(--color-success, #4ade80)" font-weight="700">CLICK TO CLOSE</text>`
        : '';

      dragMarkup += `
        <polyline points="${polylineStr}" fill="rgba(56, 189, 248, 0.12)" stroke="var(--accent-primary, #38bdf8)" stroke-width="2" stroke-dasharray="5 3"/>
        ${dotsStr}
        ${closeIndicator}
      `;
    }

    if (polyLineVertices.length > 0) {
      const cur = polyLineCursor || currentMouseWorld;
      const ptsSvg = polyLineVertices.map(pt => worldToSvg(transform, pt.x, pt.y));
      const curSvg = worldToSvg(transform, cur.x, cur.y);
      const polylineStr = [...ptsSvg, curSvg].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const dotsStr = ptsSvg.map((p, idx) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="var(--accent-primary, #38bdf8)" stroke="#ffffff" stroke-width="1.5"/>`).join('');
      let total = 0;
      for (let i = 1; i < polyLineVertices.length; i++) total += Math.hypot(polyLineVertices[i].x - polyLineVertices[i - 1].x, polyLineVertices[i].y - polyLineVertices[i - 1].y);
      total += Math.hypot(cur.x - polyLineVertices[polyLineVertices.length - 1].x, cur.y - polyLineVertices[polyLineVertices.length - 1].y);
      dragMarkup += `
        <g pointer-events="none">
          <polyline points="${polylineStr}" fill="none" stroke="var(--accent-primary, #38bdf8)" stroke-width="2" stroke-dasharray="5 3"/>
          ${dotsStr}
          <circle cx="${curSvg.x.toFixed(1)}" cy="${curSvg.y.toFixed(1)}" r="3.5" fill="var(--color-warning, #fbbf24)"/>
          <text x="${(curSvg.x + 8).toFixed(1)}" y="${(curSvg.y - 8).toFixed(1)}" font-size="9" font-family="var(--font-mono)" fill="var(--text-secondary,#9aa)">${total.toFixed(2)}m · Enter/Esc ends</text>
        </g>`;
    }

    let guidesMarkup = '';
    if (activeGuides && activeGuides.guidesX && activeGuides.guidesX.length > 0) {
      guidesMarkup += activeGuides.guidesX.map(x => {
        const p = worldToSvg(transform, x, 0);
        return `<line x1="${p.x.toFixed(1)}" y1="0" x2="${p.x.toFixed(1)}" y2="${svg.height}" stroke="var(--cyan-glow, #38bdf8)" stroke-width="1.2" stroke-dasharray="4 3" class="smart-guide-line" opacity="0.85"/>`;
      }).join('');
    }
    if (activeGuides && activeGuides.guidesY && activeGuides.guidesY.length > 0) {
      guidesMarkup += activeGuides.guidesY.map(y => {
        const p = worldToSvg(transform, 0, y);
        return `<line x1="0" y1="${p.y.toFixed(1)}" x2="${svg.width}" y2="${p.y.toFixed(1)}" stroke="var(--cyan-glow, #38bdf8)" stroke-width="1.2" stroke-dasharray="4 3" class="smart-guide-line" opacity="0.85"/>`;
      }).join('');
    }

    let snapMarkup = '';
    if (activeSnap && activeSnap.snapped && activeSnap.type !== 'grid' && activeSnap.type !== 'none') {
      const sp = worldToSvg(transform, activeSnap.x, activeSnap.y);
      const snapType = activeSnap.type;
      let snapCol = 'var(--cyan-glow, #38bdf8)';
      let glyphSvg = '';

      if (snapType === 'endpoint' || snapType === 'corner') {
        snapCol = 'var(--cyan-glow, #38bdf8)';
        glyphSvg = `<rect x="${(sp.x - 5).toFixed(1)}" y="${(sp.y - 5).toFixed(1)}" width="10" height="10" fill="none" stroke="${snapCol}" stroke-width="2"/>`;
      } else if (snapType === 'midpoint') {
        snapCol = 'var(--color-warning, #fbbf24)';
        glyphSvg = `<polygon points="${sp.x.toFixed(1)},${(sp.y - 6).toFixed(1)} ${(sp.x - 6).toFixed(1)},${(sp.y + 5).toFixed(1)} ${(sp.x + 6).toFixed(1)},${(sp.y + 5).toFixed(1)}" fill="none" stroke="${snapCol}" stroke-width="2"/>`;
      } else if (snapType === 'intersection') {
        snapCol = 'var(--accent-action, #f43f5e)';
        glyphSvg = `
          <line x1="${(sp.x - 5).toFixed(1)}" y1="${(sp.y - 5).toFixed(1)}" x2="${(sp.x + 5).toFixed(1)}" y2="${(sp.y + 5).toFixed(1)}" stroke="${snapCol}" stroke-width="2.2"/>
          <line x1="${(sp.x - 5).toFixed(1)}" y1="${(sp.y + 5).toFixed(1)}" x2="${(sp.x + 5).toFixed(1)}" y2="${(sp.y - 5).toFixed(1)}" stroke="${snapCol}" stroke-width="2.2"/>
        `;
      } else if (snapType === 'perpendicular') {
        snapCol = 'var(--color-success, #4ade80)';
        glyphSvg = `
          <path d="M ${(sp.x - 6).toFixed(1)} ${(sp.y - 6).toFixed(1)} L ${(sp.x - 6).toFixed(1)} ${(sp.y + 6).toFixed(1)} L ${(sp.x + 6).toFixed(1)} ${(sp.y + 6).toFixed(1)}" fill="none" stroke="${snapCol}" stroke-width="2"/>
          <path d="M ${(sp.x - 6).toFixed(1)} ${sp.y.toFixed(1)} L ${sp.x.toFixed(1)} ${sp.y.toFixed(1)} L ${sp.x.toFixed(1)} ${(sp.y + 6).toFixed(1)}" fill="none" stroke="${snapCol}" stroke-width="1.4"/>
        `;
      } else if (snapType === 'center') {
        snapCol = 'var(--note-number, #818cf8)';
        glyphSvg = `
          <circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="6" fill="none" stroke="${snapCol}" stroke-width="1.8"/>
          <line x1="${(sp.x - 4).toFixed(1)}" y1="${sp.y.toFixed(1)}" x2="${(sp.x + 4).toFixed(1)}" y2="${sp.y.toFixed(1)}" stroke="${snapCol}" stroke-width="1.4"/>
          <line x1="${sp.x.toFixed(1)}" y1="${(sp.y - 4).toFixed(1)}" x2="${sp.x.toFixed(1)}" y2="${(sp.y + 4).toFixed(1)}" stroke="${snapCol}" stroke-width="1.4"/>
        `;
      } else if (snapType === 'extension') {
        snapCol = 'var(--color-warning, #f59e0b)';
        let raySvg = '';
        if (Array.isArray(activeSnap.guideRay) && activeSnap.guideRay.length === 2) {
          const r1 = worldToSvg(transform, activeSnap.guideRay[0].x, activeSnap.guideRay[0].y);
          raySvg = `<line x1="${r1.x.toFixed(1)}" y1="${r1.y.toFixed(1)}" x2="${sp.x.toFixed(1)}" y2="${sp.y.toFixed(1)}" stroke="${snapCol}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
        }
        glyphSvg = `
          ${raySvg}
          <line x1="${(sp.x - 4).toFixed(1)}" y1="${(sp.y - 4).toFixed(1)}" x2="${(sp.x + 4).toFixed(1)}" y2="${(sp.y + 4).toFixed(1)}" stroke="${snapCol}" stroke-width="2"/>
          <line x1="${(sp.x - 4).toFixed(1)}" y1="${(sp.y + 4).toFixed(1)}" x2="${(sp.x + 4).toFixed(1)}" y2="${(sp.y - 4).toFixed(1)}" stroke="${snapCol}" stroke-width="2"/>
        `;
      } else {
        glyphSvg = `<circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="4.5" fill="none" stroke="${snapCol}" stroke-width="2"/>`;
      }

      snapMarkup = `
        <g class="smart-snap-point" pointer-events="none">
          ${glyphSvg}
          <rect x="${(sp.x + 8).toFixed(1)}" y="${(sp.y - 18).toFixed(1)}" width="${(snapType.length * 7 + 10)}" height="15" rx="3" fill="var(--bg-surface-elevated, #222327)" stroke="${snapCol}" stroke-width="0.8"/>
          <text x="${(sp.x + 12).toFixed(1)}" y="${(sp.y - 7).toFixed(1)}" fill="${snapCol}" font-size="8.5" font-family="var(--font-mono)" font-weight="700">${snapType.toUpperCase()}</text>
        </g>`;
    }

    dom.planSvg.innerHTML = `
      ${defsMarkup}
      <g class="plan-grid">${gridLines}</g>
      <g class="plan-entities">${entityMarkup}</g>
      ${guidesMarkup}
      ${renderHandles()}
      ${dragMarkup}
      ${snapMarkup}`;

    if (dom.planStatusBadge) {
      dom.planStatusBadge.textContent = `zoom ${transform.zoom.toFixed(0)} px/m · ${entities().length} entities`;
    }
    return true;
  }

  /**
   * Side panels + inspector (entity list, layers, schedule, properties,
   * contextual toolbar). Expensive DOM work that does NOT need to run on every
   * pointermove — callers that only moved the camera should use
   * scheduleSceneRender() and let onPointerUp's full render() refresh panels.
   */
  function renderPanels() {
    renderEntityList();
    renderLayerList();
    renderScheduleList();
    renderPropertiesInspector();
    renderContextualToolbar();
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
      else if (e.kind === 'stair') desc = `${num(e.width)} × ${num(e.depth)} m · ${e.risers || 16}R · Blondel ${Math.round((e.blondel || 0.63) * 1000)} mm${e.isCompliant ? ' ✅' : ''}`;
      else if (e.kind === 'ramp') desc = `${num(e.width)} × ${num(e.depth)} m · 1:${(e.slopeRatio || 12).toFixed(1)} (${(e.slopePercent || 8.33).toFixed(1)}%)`;
      else if (e.kind === 'dimension') {
        const p1 = e.p1 || { x: e.x1, y: e.y1 };
        const p2 = e.p2 || { x: e.x2, y: e.y2 };
        const d = (typeof p1?.x === 'number' && typeof p2?.x === 'number') ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : null;
        desc = `Dim · ${d !== null ? d.toFixed(2) : '?'} m`;
      }
      else if (e.kind === 'room_tag') desc = `Tag #${escapeHtml(e.roomNumber || '')} · ${escapeHtml(e.name || '')}`;
      else if (e.kind === 'door_tag') desc = `Badge [${escapeHtml(e.tag || '')}]`;
      else if (e.kind === 'window_tag') desc = `Badge <${escapeHtml(e.tag || '')}>`;
      else if (e.kind === 'leader') desc = `Leader · "${escapeHtml(e.text || '')}"`;
      else if (e.kind === 'line') desc = `Line · ${(typeof e.length === 'number' ? e.length : 0).toFixed(2)} m · ${Math.round(e.angleDegrees || 0)}°`;
      else if (e.kind === 'north_arrow') desc = `North · ${Math.round(e.rotation || 0)}°`;
      else if (e.kind === 'column') desc = `Column · ${e.profile || 'rect'} · ${num(e.width)}×${num(e.depth)} m`;
      else if (e.kind === 'grid_line') desc = `Grid · Axis [${escapeHtml(e.name || '')}]`;
      else if (e.kind === 'section_cut') desc = `Section · [${escapeHtml(e.label || 'A')}-${escapeHtml(e.label || 'A')}] · ${escapeHtml(e.sheetRef || 'A-201')}`;
      else if (e.kind === 'detail_callout') desc = `Detail · [${escapeHtml(e.detailNum || '1')}/${escapeHtml(e.sheetRef || 'A-501')}] · ${escapeHtml(e.title || 'Detail')}`;
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

  function renderLayerList() {
    const container = dom.planLayerList || document.getElementById('plan-layer-list');
    const countEl = dom.planLayersCount || document.getElementById('plan-layers-count');
    if (!container) return;

    const doc = getActiveDocument();
    const layers = normalizeDocumentLayers(doc);
    if (countEl) countEl.textContent = String(layers.length);

    const es = entities();
    const layerCounts = {};
    for (const l of layers) layerCounts[l.id] = 0;
    for (const e of es) {
      const l = resolveEntityLayer(e, doc);
      layerCounts[l.id] = (layerCounts[l.id] || 0) + 1;
    }

    container.innerHTML = layers.map(l => {
      const isVis = l.visible !== false;
      const isLck = !!l.locked;
      const count = layerCounts[l.id] || 0;
      return `
        <div class="plan-layer-row" data-layer-id="${escapeHtml(l.id)}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.3rem 0.45rem; border: 1px solid var(--border-color-light, #333); border-radius: 4px; font-family: var(--font-mono); font-size: 0.72rem; background: var(--bg-surface-raised, rgba(255,255,255,0.02)); margin-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 0.4rem; min-width: 0; flex: 1;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${escapeHtml(l.color)}; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25);"></span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: ${isVis ? 'var(--text-primary, #fff)' : 'var(--text-muted, #777)'};" title="${escapeHtml(l.name)}">${escapeHtml(l.name)}</span>
            <span style="font-size: 0.65rem; color: var(--text-muted, #888); flex-shrink: 0;">(${count})</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0;">
            <button type="button" class="layer-toggle-vis" data-layer-id="${escapeHtml(l.id)}" title="${isVis ? 'Hide layer (currently visible)' : 'Show layer (currently hidden)'}" aria-label="${isVis ? 'Hide layer' : 'Show layer'} ${escapeHtml(l.name)}" style="background: transparent; border: none; cursor: pointer; padding: 2px 4px; opacity: ${isVis ? '1.0' : '0.4'}; display: inline-flex;">
              ${icon(isVis ? 'visible' : 'hidden', { size: 14 })}
            </button>
            <button type="button" class="layer-toggle-lock" data-layer-id="${escapeHtml(l.id)}" title="${isLck ? 'Unlock layer (currently locked)' : 'Lock layer (currently editable)'}" aria-label="${isLck ? 'Unlock layer' : 'Lock layer'} ${escapeHtml(l.name)}" style="background: transparent; border: none; cursor: pointer; padding: 2px 4px; opacity: ${isLck ? '1.0' : '0.45'}; display: inline-flex;">
              ${icon(isLck ? 'lock' : 'unlock', { size: 14 })}
            </button>
            ${l.custom ? `
              <button type="button" class="layer-delete-btn" data-layer-id="${escapeHtml(l.id)}" title="Delete custom layer" style="background: transparent; border: none; cursor: pointer; padding: 2px 4px; font-size: 0.75rem; color: var(--accent-action, #f43f5e);">
                ✕
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.layer-toggle-vis').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const lid = btn.dataset.layerId;
        toggleLayerVisibility(doc, lid);
        AudioService.playTick();
        render();
      });
    });

    container.querySelectorAll('.layer-toggle-lock').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const lid = btn.dataset.layerId;
        toggleLayerLock(doc, lid);
        AudioService.playTick();
        render();
      });
    });

    container.querySelectorAll('.layer-delete-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const lid = btn.dataset.layerId;
        if (window.confirm(`Delete custom layer "${lid}"? Entities on this layer will fall back to their default architectural layer.`)) {
          deleteCustomLayer(doc, lid);
          AudioService.playTick();
          render();
        }
      });
    });
  }

  function renderScheduleList() {
    const listContainer = dom.planScheduleList || document.getElementById('plan-schedule-list');
    const totalsContainer = dom.planScheduleTotals || document.getElementById('plan-schedule-totals');
    const countBadge = dom.planScheduleCount || document.getElementById('plan-schedule-count');

    const es = entities();
    const schedule = calculateRoomSchedule(es);
    const totals = calculateFloorTotals(schedule);

    if (countBadge) {
      countBadge.textContent = String(schedule.length);
    }

    if (totalsContainer) {
      const nia = (totals && (totals.netInternalArea ?? totals.netInternalAreaM2)) || 0;
      const gia = (totals && (totals.grossInternalArea ?? totals.grossInternalAreaM2)) || 0;
      const circRatio = (totals && (totals.circulationRatioPercent ?? totals.circulationRatio)) || 0;
      const circArea = (totals && (totals.circulationArea ?? totals.circulationAreaM2)) || 0;
      const occ = (totals && totals.totalOccupants) || 0;
      const egWidth = (totals && (totals.egressWidthMm ?? totals.minEgressWidthMm)) || 900;

      totalsContainer.innerHTML = `
        <div style="background: var(--bg-surface-2, #1e293b); padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color, #334155);">
          <div style="font-size: 0.62rem; color: var(--text-muted, #888); text-transform: uppercase;">Net Area (NIA)</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--accent-primary, #38bdf8);">${nia.toFixed(1)} m²</div>
        </div>
        <div style="background: var(--bg-surface-2, #1e293b); padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color, #334155);">
          <div style="font-size: 0.62rem; color: var(--text-muted, #888); text-transform: uppercase;">Gross Area (GIA)</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-normal, #f8fafc);">${gia.toFixed(1)} m²</div>
        </div>
        <div style="background: var(--bg-surface-2, #1e293b); padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color, #334155);">
          <div style="font-size: 0.62rem; color: var(--text-muted, #888); text-transform: uppercase;">Circulation</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--color-warning, #eab308);">${circRatio.toFixed(1)}% <span style="font-size: 0.62rem; font-weight: normal; color: var(--text-muted);">(${circArea.toFixed(1)}m²)</span></div>
        </div>
        <div style="background: var(--bg-surface-2, #1e293b); padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color, #334155);">
          <div style="font-size: 0.62rem; color: var(--text-muted, #888); text-transform: uppercase;">Occupancy</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #10b981;">${occ} P <span style="font-size: 0.62rem; font-weight: normal; color: var(--text-muted);">(Min ${(egWidth / 1000).toFixed(2)}m)</span></div>
        </div>
      `;
    }

    if (!listContainer) return;
    if (schedule.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 1rem 0.5rem; text-align: center; color: var(--text-muted, #888); font-size: 0.72rem;">
          No rooms created yet. Use the <strong>Room (R)</strong> tool to add rooms.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = schedule.map(r => {
      const isSelected = state.plan.selectedIds.has(r.id);
      const tagColor = (r.zoningTag && r.zoningTag.color) || '#64748b';
      const tagName = (r.zoningTag && r.zoningTag.name) || 'General';
      return `
        <div class="plan-schedule-row ${isSelected ? 'selected' : ''}" data-entity-id="${escapeHtml(r.id)}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; border-radius: 4px; border: 1px solid ${isSelected ? 'var(--accent-primary, #38bdf8)' : 'var(--border-color, #334155)'}; background: ${isSelected ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-surface-2, #1e293b)'}; cursor: pointer; margin-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${tagColor}; flex-shrink: 0;"></span>
            <span style="font-weight: 700; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted, #888);">${escapeHtml(r.roomNumber)}</span>
            <span style="font-size: 0.74rem; font-weight: 600; color: var(--text-normal, #f8fafc); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${escapeHtml(r.name)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <span style="font-size: 0.65rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.06); color: ${tagColor};">${escapeHtml(tagName)}</span>
            <span style="font-size: 0.74rem; font-family: var(--font-mono); font-weight: 600; color: var(--accent-primary, #38bdf8);">${r.areaM2.toFixed(1)}m²</span>
            <span style="font-size: 0.68rem; color: var(--text-muted, #888);" title="Estimated occupants">👥 ${r.occupantLoad}</span>
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.plan-schedule-row').forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const eid = row.dataset.entityId;
        if (eid) {
          state.plan.selectedIds = new Set([eid]);
          render();
          renderScheduleList();
          AudioService.playTick();
        }
      });
    });
  }

  function setupSidebarTabs() {
    const tabEntities = dom.tabPlanEntities || document.getElementById('tab-plan-entities');
    const tabLayers = dom.tabPlanLayers || document.getElementById('tab-plan-layers');
    const tabSchedule = dom.tabPlanSchedule || document.getElementById('tab-plan-schedule');
    const viewEntities = dom.planEntitiesView || document.getElementById('plan-entities-view');
    const viewLayers = dom.planLayersView || document.getElementById('plan-layers-view');
    const viewSchedule = dom.planScheduleView || document.getElementById('plan-schedule-view');

    const updateTabUI = () => {
      if (tabEntities) {
        tabEntities.classList.toggle('active', activeSidebarTab === 'entities');
        tabEntities.style.borderBottom = activeSidebarTab === 'entities' ? '2px solid var(--accent-primary, #4989D9)' : '2px solid transparent';
        tabEntities.style.color = activeSidebarTab === 'entities' ? 'var(--accent-primary, #4989D9)' : 'var(--text-muted, #888)';
      }
      if (tabLayers) {
        tabLayers.classList.toggle('active', activeSidebarTab === 'layers');
        tabLayers.style.borderBottom = activeSidebarTab === 'layers' ? '2px solid var(--accent-primary, #4989D9)' : '2px solid transparent';
        tabLayers.style.color = activeSidebarTab === 'layers' ? 'var(--accent-primary, #4989D9)' : 'var(--text-muted, #888)';
      }
      if (tabSchedule) {
        tabSchedule.classList.toggle('active', activeSidebarTab === 'schedule');
        tabSchedule.style.borderBottom = activeSidebarTab === 'schedule' ? '2px solid var(--accent-primary, #4989D9)' : '2px solid transparent';
        tabSchedule.style.color = activeSidebarTab === 'schedule' ? 'var(--accent-primary, #4989D9)' : 'var(--text-muted, #888)';
      }
      if (viewEntities) viewEntities.style.display = activeSidebarTab === 'entities' ? 'block' : 'none';
      if (viewLayers) viewLayers.style.display = activeSidebarTab === 'layers' ? 'block' : 'none';
      if (viewSchedule) viewSchedule.style.display = activeSidebarTab === 'schedule' ? 'block' : 'none';
    };

    if (tabEntities) {
      tabEntities.addEventListener('click', () => {
        activeSidebarTab = 'entities';
        updateTabUI();
      });
    }
    if (tabLayers) {
      tabLayers.addEventListener('click', () => {
        activeSidebarTab = 'layers';
        updateTabUI();
        renderLayerList();
      });
    }
    if (tabSchedule) {
      tabSchedule.addEventListener('click', () => {
        activeSidebarTab = 'schedule';
        updateTabUI();
        renderScheduleList();
      });
    }

    const btnCopyCsv = dom.btnCopyScheduleCsv || document.getElementById('btn-copy-schedule-csv');
    if (btnCopyCsv) {
      btnCopyCsv.addEventListener('click', () => {
        const schedule = calculateRoomSchedule(entities());
        const totals = calculateFloorTotals(schedule);
        const csv = formatScheduleCSV(schedule, totals);
        if (typeof copyToClipboard === 'function') {
          copyToClipboard(csv);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(csv);
        }
        showToast('Copied Room & Area Schedule to clipboard as CSV');
        AudioService.playTick();
      });
    }

    const btnAutoTag = dom.btnAutoTagAll || document.getElementById('btn-auto-tag-all');
    if (btnAutoTag) {
      btnAutoTag.addEventListener('click', () => {
        const res = autoTagDocument(entities());
        if (res.count > 0) {
          for (const t of res.newTags) {
            const cmd = entityAddRemoveCommand(entities(), t, `auto-tag ${t.name}`);
            cmd.redo();
            history.push(cmd);
          }
          showToast(`Auto-tagged ${res.count} items (${res.roomsTagged} rooms, ${res.doorsTagged} doors, ${res.windowsTagged} windows)`, 'success');
          AudioService.playTick();
          render();
        } else {
          showToast('All rooms, doors, and windows are already tagged!', 'info');
        }
      });
    }

    const btnAdd = dom.btnAddLayer || document.getElementById('btn-add-layer');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const name = window.prompt('Enter new custom CAD layer name (e.g. A-DEMO-EXST or E-POWR):');
        if (!name || !name.trim()) return;
        const color = window.prompt('Enter layer hex color:', '#f97316') || '#f97316';
        const doc = getActiveDocument();
        const newLayer = addCustomLayer(doc, { name: name.trim(), color: color.trim() });
        showToast(`Created layer "${newLayer.name}"`, 'success');
        AudioService.playTick();
        render();
      });
    }

    updateTabUI();
  }

  // ------------------------------------------------------------------
  // Properties & Verification Inspector
  // ------------------------------------------------------------------
  function renderPropertiesInspector() {
    updateStudioCPanels();
    if (!dom.planPropContent) return;
    const es = entities();
    const doc = getActiveDocument();
    const selectedId = Array.from(state.plan.selectedIds || [])[0];
    const selected = selectedId ? es.find(x => x.id === selectedId) : null;

    function buildLayerSelectRow(selectedEntity) {
      if (!selectedEntity) return '';
      const currentLayer = resolveEntityLayer(selectedEntity, doc);
      const layers = normalizeDocumentLayers(doc);
      const options = layers.map(l =>
        `<option value="${escapeHtml(l.id)}" ${currentLayer.id === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`
      ).join('');
      return `
        <div class="plan-prop-row">
          <span class="plan-prop-label">CAD Layer</span>
          <select id="prop-entity-layer" class="calc-select" style="width: 140px; height: 24px; padding: 0 4px; font-size: 0.74rem;">
            ${options}
          </select>
        </div>
      `;
    }

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
          ${buildLayerSelectRow(selected)}
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
          onChange: (val) => { selected.width = val; renderScene(); },
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
          onChange: (val) => { selected.depth = val; renderScene(); },
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
          ${buildLayerSelectRow(selected)}
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
          ${buildLayerSelectRow(selected)}
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

      function updateStairGeometry(keepPanels = false) {
        selected.riserHeight = selected.rise / selected.risers;
        selected.tread = selected.run / Math.max(1, selected.risers - 1);
        selected.blondel = 2 * selected.riserHeight + selected.tread;
        selected.pitchAngle = Math.atan2(selected.rise, selected.run) * (180 / Math.PI);
        if (keepPanels) renderScene(); else render();
      }

      const stairWInput = dom.planPropContent.querySelector('#prop-stair-w');
      if (stairWInput) {
        attachNumericScrubber(stairWInput, {
          step: 0.05, min: 0.6, max: 10, precision: 2,
          onChange: (val) => { selected.width = val; renderScene(); },
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
          onChange: (val) => { selected.run = val; selected.depth = val; updateStairGeometry(true); },
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
          onChange: (val) => { selected.rise = val; updateStairGeometry(true); },
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
          onChange: (val) => { selected.risers = Math.round(val); updateStairGeometry(true); },
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
          ${buildLayerSelectRow(selected)}
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

      function updateRampGeometry(keepPanels = false) {
        selected.slopePercent = (selected.rise / selected.run) * 100;
        selected.slopeRatio = selected.run / selected.rise;
        if (keepPanels) renderScene(); else render();
      }

      const rampWInput = dom.planPropContent.querySelector('#prop-ramp-w');
      if (rampWInput) {
        attachNumericScrubber(rampWInput, {
          step: 0.05, min: 0.6, max: 10, precision: 2,
          onChange: (val) => { selected.width = val; renderScene(); },
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
          onChange: (val) => { selected.run = val; selected.depth = val; updateRampGeometry(true); },
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
          onChange: (val) => { selected.rise = val; updateRampGeometry(true); },
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
      const currentAssId = selected.assemblyId || 'generic-200';
      const assemblyOpts = Object.values(WALL_ASSEMBLIES).map(a =>
        `<option value="${a.id}" ${currentAssId === a.id ? 'selected' : ''}>${a.name}</option>`
      ).join('');

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Wall Parameters</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Assembly</span>
            <select class="calc-input" id="prop-wall-assembly" style="height: 24px; font-size: 0.72rem; padding: 0 4px; max-width: 160px;">
              ${assemblyOpts}
            </select>
          </div>
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
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-scratch-wall" class="plan-prop-btn"><span>📋 Send Length to Scratchpad</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Wall</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Wall';
        render();
      });

      dom.planPropContent.querySelector('#prop-wall-assembly')?.addEventListener('change', (e) => {
        const assId = e.target.value;
        const ass = WALL_ASSEMBLIES[assId];
        if (ass) {
          selected.assemblyId = assId;
          selected.thickness = ass.totalThickness;
          render();
          renderPropertiesInspector();
          renderContextualToolbar();
          showToast(`Wall assembly: ${ass.name}`);
        }
      });

      const wallThickInput = dom.planPropContent.querySelector('#prop-wall-thickness');
      if (wallThickInput) {
        attachNumericScrubber(wallThickInput, {
          step: 0.02, min: 0.05, max: 1.5, precision: 2,
          onChange: (val) => { selected.thickness = val; renderScene(); },
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

    } else if (selected.kind === 'door') {
      const wall = es.find(w => w.id === selected.wallId);
      const fits = wall ? openingFitsWall(selected, wall) : { fits: false, reason: 'Orphaned opening' };

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Door Specifications</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Host Wall</span><span class="plan-prop-value">${wall ? escapeHtml(wall.name) : 'None'}</span></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Width</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-door-w" class="text-input" value="${(selected.width || 0.9).toFixed(2)}" step="0.05" min="0.5" max="3.0" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Wall Offset</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-door-pos" class="text-input" value="${(selected.position || 0).toFixed(2)}" step="0.1" min="0" max="50" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Swing</span>
            <select class="calc-input" id="prop-door-swing" style="height: 24px; font-size: 0.72rem; padding: 0 4px; max-width: 110px;">
              <option value="left" ${selected.swing === 'left' ? 'selected' : ''}>Left Swing</option>
              <option value="right" ${selected.swing === 'right' ? 'selected' : ''}>Right Swing</option>
              <option value="double" ${selected.swing === 'double' ? 'selected' : ''}>Double Swing</option>
            </select>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Side Flip</span>
            <button type="button" class="plan-prop-btn" id="prop-door-flip-btn" style="padding: 2px 8px; font-size: 0.72rem;">${selected.flipSide ? 'Outward' : 'Inward'}</button>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Wall Fit</span><span class="plan-prop-badge ${fits.fits ? 'fits' : 'no-fit'}">${fits.fits ? 'FITS' : 'OVERFLOW'}</span></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Door</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Door';
        render();
      });

      const doorWInput = dom.planPropContent.querySelector('#prop-door-w');
      if (doorWInput) {
        attachNumericScrubber(doorWInput, {
          step: 0.05, min: 0.5, max: 3.0, precision: 2,
          onChange: (val) => { selected.width = val; renderScene(); },
          onCommit: (val) => { selected.width = val; render(); renderContextualToolbar(); }
        });
        doorWInput.addEventListener('change', (e) => {
          selected.width = Math.max(0.5, parseFloat(e.target.value) || 0.9);
          render();
          renderContextualToolbar();
        });
      }

      const doorPosInput = dom.planPropContent.querySelector('#prop-door-pos');
      if (doorPosInput) {
        attachNumericScrubber(doorPosInput, {
          step: 0.1, min: 0, max: 50, precision: 2,
          onChange: (val) => { selected.position = val; renderScene(); },
          onCommit: (val) => { selected.position = val; render(); }
        });
        doorPosInput.addEventListener('change', (e) => {
          selected.position = Math.max(0, parseFloat(e.target.value) || 0);
          render();
        });
      }

      dom.planPropContent.querySelector('#prop-door-swing')?.addEventListener('change', (e) => {
        selected.swing = e.target.value;
        render();
        renderContextualToolbar();
      });

      dom.planPropContent.querySelector('#prop-door-flip-btn')?.addEventListener('click', () => {
        selected.flipSide = !selected.flipSide;
        render();
        renderPropertiesInspector();
        renderContextualToolbar();
      });

    } else if (selected.kind === 'window') {
      const wall = es.find(w => w.id === selected.wallId);
      const fits = wall ? openingFitsWall(selected, wall) : { fits: false, reason: 'Orphaned opening' };

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Window Specifications</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Host Wall</span><span class="plan-prop-value">${wall ? escapeHtml(wall.name) : 'None'}</span></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Width</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-win-w" class="text-input" value="${(selected.width || 1.2).toFixed(2)}" step="0.05" min="0.4" max="6.0" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Wall Offset</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-win-pos" class="text-input" value="${(selected.position || 0).toFixed(2)}" step="0.1" min="0" max="50" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Sill Height</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-win-sill" class="text-input" value="${(selected.sill || 0.9).toFixed(2)}" step="0.05" min="0" max="2.5" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Wall Fit</span><span class="plan-prop-badge ${fits.fits ? 'fits' : 'no-fit'}">${fits.fits ? 'FITS' : 'OVERFLOW'}</span></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Window</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Window';
        render();
      });

      const winWInput = dom.planPropContent.querySelector('#prop-win-w');
      if (winWInput) {
        attachNumericScrubber(winWInput, {
          step: 0.05, min: 0.4, max: 6.0, precision: 2,
          onChange: (val) => { selected.width = val; renderScene(); },
          onCommit: (val) => { selected.width = val; render(); renderContextualToolbar(); }
        });
        winWInput.addEventListener('change', (e) => {
          selected.width = Math.max(0.4, parseFloat(e.target.value) || 1.2);
          render();
          renderContextualToolbar();
        });
      }

      const winPosInput = dom.planPropContent.querySelector('#prop-win-pos');
      if (winPosInput) {
        attachNumericScrubber(winPosInput, {
          step: 0.1, min: 0, max: 50, precision: 2,
          onChange: (val) => { selected.position = val; renderScene(); },
          onCommit: (val) => { selected.position = val; render(); }
        });
        winPosInput.addEventListener('change', (e) => {
          selected.position = Math.max(0, parseFloat(e.target.value) || 0);
          render();
        });
      }

      const winSillInput = dom.planPropContent.querySelector('#prop-win-sill');
      if (winSillInput) {
        attachNumericScrubber(winSillInput, {
          step: 0.05, min: 0, max: 2.5, precision: 2,
          onChange: (val) => { selected.sill = val; renderScene(); },
          onCommit: (val) => { selected.sill = val; render(); }
        });
        winSillInput.addEventListener('change', (e) => {
          selected.sill = Math.max(0, parseFloat(e.target.value) || 0.9);
          render();
        });
      }

    } else if (selected.kind === 'dimension') {
      const p1World = selected.p1 || { x: selected.x1, y: selected.y1 };
      const p2World = selected.p2 || { x: selected.x2, y: selected.y2 };
      const dist = Math.hypot(p2World.x - p1World.x, p2World.y - p1World.y);
      const curStyle = selected.style || 'tick';
      const curOrient = selected.orientation || 'aligned';
      const curUnit = selected.unit || 'm';
      const offsetVal = typeof selected.offset === 'number' ? selected.offset : 0.6;

      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Architectural Dimension</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name || 'Dimension')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          
          <div class="plan-prop-row">
            <span class="plan-prop-label">Measured Span</span>
            <span class="plan-prop-value note-number">${dist.toFixed(3)} m</span>
          </div>

          <div class="plan-prop-row">
            <span class="plan-prop-label">Style</span>
            <select class="calc-input" id="prop-dim-style" style="height: 24px; font-size: 0.72rem; padding: 0 4px; max-width: 150px;">
              <option value="tick" ${curStyle === 'tick' ? 'selected' : ''}>45° Architectural Tick</option>
              <option value="arrow" ${curStyle === 'arrow' ? 'selected' : ''}>Engineering Arrow</option>
              <option value="dot" ${curStyle === 'dot' ? 'selected' : ''}>Circle Dot</option>
            </select>
          </div>

          <div class="plan-prop-row">
            <span class="plan-prop-label">Orientation</span>
            <select class="calc-input" id="prop-dim-orient" style="height: 24px; font-size: 0.72rem; padding: 0 4px; max-width: 150px;">
              <option value="aligned" ${curOrient === 'aligned' ? 'selected' : ''}>Aligned (Parallel)</option>
              <option value="horizontal" ${curOrient === 'horizontal' ? 'selected' : ''}>Horizontal (ΔX)</option>
              <option value="vertical" ${curOrient === 'vertical' ? 'selected' : ''}>Vertical (ΔY)</option>
            </select>
          </div>

          <div class="plan-prop-row">
            <span class="plan-prop-label">Unit</span>
            <select class="calc-input" id="prop-dim-unit" style="height: 24px; font-size: 0.72rem; padding: 0 4px; max-width: 150px;">
              <option value="m" ${curUnit === 'm' ? 'selected' : ''}>Meters (m)</option>
              <option value="mm" ${curUnit === 'mm' ? 'selected' : ''}>Millimeters (mm)</option>
              <option value="ft_in" ${curUnit === 'ft_in' ? 'selected' : ''}>Feet & Inches (ft-in)</option>
            </select>
          </div>

          <div class="plan-prop-row">
            <span class="plan-prop-label">Dual Unit</span>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; cursor: pointer;">
              <input type="checkbox" id="prop-dim-dual" ${selected.dualUnit ? 'checked' : ''} />
              <span>Show Imperial [ft-in]</span>
            </label>
          </div>

          <div class="plan-prop-row">
            <span class="plan-prop-label">Standoff Offset</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-dim-offset" class="text-input" value="${offsetVal.toFixed(2)}" step="0.1" min="-5" max="5" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">m</span>
            </div>
          </div>

          <div class="plan-prop-row">
            <span class="plan-prop-label">Text Override</span>
            <input type="text" id="prop-dim-override" class="text-input" value="${escapeHtml(selected.textOverride || '')}" placeholder="Auto (Calculated)" style="width: 130px; padding: 0.2rem 0.35rem; font-size: 0.75rem;" />
          </div>

          <div class="plan-prop-row"><span class="plan-prop-label">Endpoints</span><span class="plan-prop-value" style="font-size: 0.70rem;">(${p1World.x.toFixed(2)}, ${p1World.y.toFixed(2)}) ➔ (${p2World.x.toFixed(2)}, ${p2World.y.toFixed(2)})</span></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-scratch-dim" class="plan-prop-btn"><span>📋 Send to Scratchpad</span></button>
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Dimension</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Dimension';
        render();
      });

      dom.planPropContent.querySelector('#prop-dim-style')?.addEventListener('change', (e) => {
        selected.style = e.target.value;
        render();
        renderContextualToolbar();
      });

      dom.planPropContent.querySelector('#prop-dim-orient')?.addEventListener('change', (e) => {
        selected.orientation = e.target.value;
        render();
        renderContextualToolbar();
      });

      dom.planPropContent.querySelector('#prop-dim-unit')?.addEventListener('change', (e) => {
        selected.unit = e.target.value;
        render();
        renderContextualToolbar();
      });

      dom.planPropContent.querySelector('#prop-dim-dual')?.addEventListener('change', (e) => {
        selected.dualUnit = e.target.checked;
        render();
        renderContextualToolbar();
      });

      const offsetInput = dom.planPropContent.querySelector('#prop-dim-offset');
      if (offsetInput) {
        attachNumericScrubber(offsetInput, {
          step: 0.1, min: -5, max: 5, precision: 2,
          onChange: (val) => { selected.offset = val; renderScene(); },
          onCommit: (val) => { selected.offset = val; render(); renderContextualToolbar(); }
        });
        offsetInput.addEventListener('change', (e) => {
          selected.offset = parseFloat(e.target.value) || 0.6;
          render();
          renderContextualToolbar();
        });
      }

      dom.planPropContent.querySelector('#prop-dim-override')?.addEventListener('change', (e) => {
        selected.textOverride = e.target.value.trim() || null;
        render();
        renderContextualToolbar();
      });

      dom.planPropContent.querySelector('#btn-prop-scratch-dim')?.addEventListener('click', () => {
        sendToScratchpad({
          value: dist,
          formatted: `${dist.toFixed(3)} m`,
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
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Text</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-text')?.addEventListener('change', (e) => {
        selected.text = e.target.value.trim() || 'Label';
        selected.name = selected.text;
        render();
      });

    } else if (selected.kind === 'room_tag') {
      const room = selected.roomId ? es.find(r => r.id === selected.roomId) : null;
      const areaVal = room ? roomArea(room) : (selected.area || 0);
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Room Callout Tag</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Room Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name || '')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Room Number</span><input type="text" id="prop-room-number" class="text-input" value="${escapeHtml(selected.roomNumber || '101')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Linked Room</span><span class="plan-prop-value">${room ? escapeHtml(room.name) : 'Detached'}</span></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Reported Area</span><span class="plan-prop-value note-number">${areaVal.toFixed(2)} m²</span></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Tag</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Room Tag';
        render();
      });
      dom.planPropContent.querySelector('#prop-room-number')?.addEventListener('change', (e) => {
        selected.roomNumber = e.target.value.trim() || '101';
        render();
      });

    } else if (selected.kind === 'door_tag') {
      const door = selected.doorId ? es.find(d => d.id === selected.doorId) : null;
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Door Callout Badge</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Tag Badge</span><input type="text" id="prop-door-tag" class="text-input" value="${escapeHtml(selected.tag || 'D01')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Linked Door</span><span class="plan-prop-value">${door ? escapeHtml(door.name) : 'Detached'}</span></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Tag</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-door-tag')?.addEventListener('change', (e) => {
        selected.tag = e.target.value.trim() || 'D01';
        selected.name = `Door Tag ${selected.tag}`;
        render();
      });

    } else if (selected.kind === 'window_tag') {
      const win = selected.windowId ? es.find(w => w.id === selected.windowId) : null;
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Window Callout Badge</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Tag Badge</span><input type="text" id="prop-win-tag" class="text-input" value="${escapeHtml(selected.tag || 'W01')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Linked Window</span><span class="plan-prop-value">${win ? escapeHtml(win.name) : 'Detached'}</span></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Tag</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-win-tag')?.addEventListener('change', (e) => {
        selected.tag = e.target.value.trim() || 'W01';
        selected.name = `Window Tag ${selected.tag}`;
        render();
      });

    } else if (selected.kind === 'leader') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Leader Note Annotation</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Callout Text</span><input type="text" id="prop-leader-text" class="text-input" value="${escapeHtml(selected.text || '')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Leader</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-leader-text')?.addEventListener('change', (e) => {
        selected.text = e.target.value.trim() || 'Callout';
        selected.name = `Leader: ${selected.text}`;
        render();
      });

    } else if (selected.kind === 'north_arrow') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">North Arrow Compass</div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Rotation</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-north-rot" class="text-input" value="${Math.round(selected.rotation || 0)}" step="15" min="0" max="360" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">deg</span>
            </div>
          </div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Scale</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" id="prop-north-scale" class="text-input" value="${(selected.scale || 1.0).toFixed(1)}" step="0.1" min="0.2" max="5.0" style="width: 65px; padding: 0.2rem 0.35rem; font-size: 0.78rem;" />
              <span style="font-size: 0.75rem; color: var(--text-secondary);">x</span>
            </div>
          </div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Symbol</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-north-rot')?.addEventListener('change', (e) => {
        selected.rotation = ((parseFloat(e.target.value) || 0) % 360 + 360) % 360;
        render();
      });
      dom.planPropContent.querySelector('#prop-north-scale')?.addEventListener('change', (e) => {
        selected.scale = Math.max(0.2, parseFloat(e.target.value) || 1.0);
        render();
      });

    } else if (selected.kind === 'column') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Structural Column</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Label</span><input type="text" id="prop-col-name" class="text-input" value="${escapeHtml(selected.name || 'Column')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Profile</span>
            <select id="prop-col-profile" class="calc-select" style="width: 140px; height: 24px; padding: 0 4px; font-size: 0.74rem;">
              <option value="rect" ${selected.profile === 'rect' ? 'selected' : ''}>Rectangular</option>
              <option value="circle" ${selected.profile === 'circle' ? 'selected' : ''}>Circular</option>
              <option value="h_beam" ${selected.profile === 'h_beam' ? 'selected' : ''}>Steel H-Beam</option>
            </select>
          </div>
          ${selected.profile === 'circle' ? `
            <div class="plan-prop-row"><span class="plan-prop-label">Radius (m)</span><input type="number" id="prop-col-radius" class="text-input" value="${selected.radius || 0.2}" step="0.05" min="0.05" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          ` : `
            <div class="plan-prop-row"><span class="plan-prop-label">Width (m)</span><input type="number" id="prop-col-width" class="text-input" value="${selected.width || 0.4}" step="0.05" min="0.1" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
            <div class="plan-prop-row"><span class="plan-prop-label">Depth (m)</span><input type="number" id="prop-col-depth" class="text-input" value="${selected.depth || 0.4}" step="0.05" min="0.1" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          `}
          <div class="plan-prop-row">
            <span class="plan-prop-label">Material</span>
            <select id="prop-col-mat" class="calc-select" style="width: 140px; height: 24px; padding: 0 4px; font-size: 0.74rem;">
              <option value="concrete" ${selected.material === 'concrete' ? 'selected' : ''}>Reinforced Concrete</option>
              <option value="steel" ${selected.material === 'steel' ? 'selected' : ''}>Structural Steel</option>
              <option value="timber" ${selected.material === 'timber' ? 'selected' : ''}>Heavy Timber</option>
            </select>
          </div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Column</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-col-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Column';
        render();
        renderEntityList();
      });
      dom.planPropContent.querySelector('#prop-col-profile')?.addEventListener('change', (e) => {
        selected.profile = e.target.value;
        render();
        renderPropertiesInspector();
      });
      dom.planPropContent.querySelector('#prop-col-width')?.addEventListener('change', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) { selected.width = v; render(); }
      });
      dom.planPropContent.querySelector('#prop-col-depth')?.addEventListener('change', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) { selected.depth = v; render(); }
      });
      dom.planPropContent.querySelector('#prop-col-radius')?.addEventListener('change', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) { selected.radius = v; render(); }
      });
      dom.planPropContent.querySelector('#prop-col-mat')?.addEventListener('change', (e) => {
        selected.material = e.target.value;
        render();
      });

    } else if (selected.kind === 'grid_line') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Structural Grid Line</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Axis Label</span><input type="text" id="prop-grid-name" class="text-input" value="${escapeHtml(selected.name || '1')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Bubble End</span>
            <select id="prop-grid-bubble" class="calc-select" style="width: 140px; height: 24px; padding: 0 4px; font-size: 0.74rem;">
              <option value="both" ${selected.bubblePosition === 'both' ? 'selected' : ''}>Both Ends</option>
              <option value="start" ${selected.bubblePosition === 'start' ? 'selected' : ''}>Start Only</option>
              <option value="end" ${selected.bubblePosition === 'end' ? 'selected' : ''}>End Only</option>
              <option value="none" ${selected.bubblePosition === 'none' ? 'selected' : ''}>None</option>
            </select>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Bubble Radius</span><input type="number" id="prop-grid-rad" class="text-input" value="${selected.bubbleRadius || 0.35}" step="0.05" min="0.1" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Grid Line</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-grid-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || '1';
        render();
        renderEntityList();
      });
      dom.planPropContent.querySelector('#prop-grid-bubble')?.addEventListener('change', (e) => {
        selected.bubblePosition = e.target.value;
        render();
      });
      dom.planPropContent.querySelector('#prop-grid-rad')?.addEventListener('change', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) { selected.bubbleRadius = v; render(); }
      });
    } else if (selected.kind === 'section_cut') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Section Cut Callout</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Cut Label</span><input type="text" id="prop-section-label" class="text-input" value="${escapeHtml(selected.label || 'A')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Sheet Ref</span><input type="text" id="prop-section-sheet" class="text-input" value="${escapeHtml(selected.sheetRef || 'A-201')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">View Direction</span>
            <select id="prop-section-dir" class="calc-select" style="width: 140px; height: 24px; padding: 0 4px; font-size: 0.74rem;">
              <option value="forward" ${selected.direction === 'forward' ? 'selected' : ''}>Forward</option>
              <option value="reverse" ${selected.direction === 'reverse' ? 'selected' : ''}>Reverse</option>
            </select>
          </div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Section Cut</span></button>
        </div>`;

      dom.planPropContent.querySelector('#prop-section-label')?.addEventListener('change', (e) => {
        selected.label = e.target.value.trim() || 'A';
        selected.name = `Section ${selected.label}-${selected.label}`;
        render();
        renderEntityList();
      });
      dom.planPropContent.querySelector('#prop-section-sheet')?.addEventListener('change', (e) => {
        selected.sheetRef = e.target.value.trim() || 'A-201';
        render();
      });
      dom.planPropContent.querySelector('#prop-section-dir')?.addEventListener('change', (e) => {
        selected.direction = e.target.value;
        render();
      });
    } else if (selected.kind === 'detail_callout') {
      dom.planPropContent.innerHTML = `
        <div class="plan-prop-section">
          <div class="plan-prop-title">Detail Callout</div>
          <div class="plan-prop-row"><span class="plan-prop-label">Name</span><input type="text" id="prop-entity-name" class="text-input" value="${escapeHtml(selected.name)}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Detail #</span><input type="text" id="prop-detail-num" class="text-input" value="${escapeHtml(selected.detailNum || '1')}" style="width: 60px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row"><span class="plan-prop-label">Sheet Ref</span><input type="text" id="prop-detail-sheet" class="text-input" value="${escapeHtml(selected.sheetRef || 'A-501')}" style="width: 80px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          <div class="plan-prop-row">
            <span class="plan-prop-label">Assembly</span>
            <select id="prop-detail-key" class="calc-select" style="width: 140px; height: 24px; padding: 0 4px; font-size: 0.72rem;">
              <option value="footing" ${selected.detailKey === 'footing' ? 'selected' : ''}>1 Strip Footing (1:10)</option>
              <option value="parapet" ${selected.detailKey === 'parapet' ? 'selected' : ''}>2 Roof Parapet (1:10)</option>
              <option value="window_sill" ${selected.detailKey === 'window_sill' ? 'selected' : ''}>3 Window Sill (1:5)</option>
              <option value="stair_nosing" ${selected.detailKey === 'stair_nosing' ? 'selected' : ''}>4 Stair Nosing (1:5)</option>
            </select>
          </div>
          <div class="plan-prop-row"><span class="plan-prop-label">Title</span><input type="text" id="prop-detail-title" class="text-input" value="${escapeHtml(selected.title || 'Detail')}" style="width: 140px; padding: 0.2rem 0.4rem; font-size: 0.78rem;" /></div>
          ${buildLayerSelectRow(selected)}
        </div>
        <div class="plan-prop-actions">
          <button type="button" id="btn-prop-delete" class="plan-prop-btn action-accent"><span>🗑 Delete Callout</span></button>
        </div>
      `;

      dom.planPropContent.querySelector('#prop-entity-name')?.addEventListener('change', (e) => {
        selected.name = e.target.value.trim() || 'Detail Callout';
        render();
        renderEntityList();
      });
      dom.planPropContent.querySelector('#prop-detail-num')?.addEventListener('change', (e) => {
        selected.detailNum = e.target.value.trim() || '1';
        selected.name = `Detail ${selected.detailNum}/${selected.sheetRef}`;
        render();
        renderEntityList();
      });
      dom.planPropContent.querySelector('#prop-detail-sheet')?.addEventListener('change', (e) => {
        selected.sheetRef = e.target.value.trim() || 'A-501';
        selected.name = `Detail ${selected.detailNum}/${selected.sheetRef}`;
        render();
        renderEntityList();
      });
      dom.planPropContent.querySelector('#prop-detail-key')?.addEventListener('change', (e) => {
        selected.detailKey = e.target.value;
        const dNames = { footing: 'Foundation Footing Detail', parapet: 'Roof Parapet Detail', window_sill: 'Window Sill Detail', stair_nosing: 'Stair Nosing Detail' };
        selected.title = dNames[selected.detailKey] || 'Construction Detail';
        render();
        renderEntityList();
        renderPropertiesInspector();
      });
      dom.planPropContent.querySelector('#prop-detail-title')?.addEventListener('change', (e) => {
        selected.title = e.target.value.trim() || 'Detail';
        render();
        renderEntityList();
      });
    }

    dom.planPropContent.querySelector('#btn-prop-delete')?.addEventListener('click', () => {
      deleteSelected();
    });

    dom.planPropContent.querySelector('#prop-entity-layer')?.addEventListener('change', (e) => {
      setEntityLayer(selected, e.target.value);
      showToast(`Moved to CAD layer "${e.target.value}"`);
      AudioService.playTick();
      render();
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
    if (dist < 0.05) return;
    const dim = createDimension({
      name: `${dist.toFixed(2)}m`,
      p1: { x: start.x, y: start.y },
      p2: { x: end.x, y: end.y },
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      offset: 0.6,
      style: 'tick',
      orientation: 'aligned',
      unit: 'm',
      dualUnit: false
    });
    dim.x = Math.min(start.x, end.x);
    dim.y = Math.min(start.y, end.y);
    dim.width = Math.abs(end.x - start.x);
    dim.depth = Math.abs(end.y - start.y);
    dim.x1 = start.x;
    dim.y1 = start.y;
    dim.x2 = end.x;
    dim.y2 = end.y;

    const cmd = entityAddRemoveCommand(entities(), dim, `add dimension ${dim.name}`);
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([dim.id]);
    showToast(`Dimension added: ${dist.toFixed(2)} m`);
    AudioService.playTick();
    render();
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

  function dropColumn(pt) {
    const existingCols = entities().filter(e => e.kind === 'column');
    const nextNum = existingCols.length + 1;
    const col = createColumn({
      name: `Col ${nextNum}`,
      profile: 'rect',
      x: pt.x,
      y: pt.y,
      width: 0.4,
      depth: 0.4
    });
    const cmd = entityAddRemoveCommand(entities(), col, 'place Column');
    cmd.redo();
    history.push(cmd);
    state.plan.selectedIds = new Set([col.id]);
    showToast(`Placed Column ${col.name}`);
    AudioService.playTick();
    setTool('select');
    render();
    renderEntityList();
    renderPropertiesInspector();
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    // Active interactive command (LINE/WALL/RECTANGLE/…): the canvas click
    // IS the point input — one interaction model, one geometry engine.
    const cmdbar = document.getElementById('studio-commandbar-container')?.__commandbar;
    if (cmdbar && cmdbar.isActive()) {
      const world = svgPoint(event);
      cmdbar.submitPoint(world);
      event.preventDefault();
      return;
    }
    const doc = getActiveDocument();
    if (doc && doc.type === '3d_massing') {
      dragState = {
        mode: 'orbit_3d',
        startClient: { x: event.clientX, y: event.clientY },
        startCam: { ...(doc.camera || {}) }
      };
      event.preventDefault();
      return;
    }
    if (doc && doc.type === 'sheet') {
      return;
    }
    if (event.button === 1 || isPanHotkey()) {
      event.preventDefault();
      dragState = { mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startTransform: { ...transform } };
      return;
    }
    const visible = entities().filter(x => isEntityVisible(x, doc));
    const world = svgPoint(event);
    const snapOn = state.plan.snap !== false;
    let initialPt = { x: snapToGrid(world.x, state.plan.grid), y: snapToGrid(world.y, state.plan.grid) };
    const tool = state.plan.tool;

    // 1. Check for handle hit (resize / rotate)
    const handleEl = event.target.closest ? event.target.closest('.plan-handle') : null;
    if (handleEl) {
      const handle = handleEl.dataset.handle;
      const entityId = handleEl.dataset.entityId;
      const entity = entities().find(x => x.id === entityId);
      if (entity && handle) {
        if (isEntityLocked(entity, doc)) {
          const l = resolveEntityLayer(entity, doc);
          showToast(`Layer "${l.name}" is locked — cannot transform`, 'warning');
          return;
        }
        dragState = {
          mode: 'resize',
          handle,
          entity,
          initial: JSON.parse(JSON.stringify(entity)),
          startWorld: initialPt,
          lastWorld: initialPt
        };
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    if (tool === 'pan') {
      dragState = { mode: 'pan', startClient: { x: event.clientX, y: event.clientY }, startTransform: { ...transform } };
      event.preventDefault();
      return;
    }
    if (tool === 'select') {
      const entityEl = event.target.closest ? event.target.closest('.plan-entity') : null;
      let hitId = entityEl ? entityEl.dataset.entityId : null;
      if (hitId) {
        const hitE = entities().find(x => x.id === hitId);
        if (!hitE || !isEntityVisible(hitE, doc)) hitId = null;
      }
      if (!hitId) {
        const hits = pickEntities(visible, { x: world.x, y: world.y, width: 0, depth: 0 });
        if (hits.length > 0) hitId = hits[hits.length - 1];
      }

      if (hitId) {
        const e = entities().find(x => x.id === hitId);
        if (e && isEntityLocked(e, doc)) {
          const l = resolveEntityLayer(e, doc);
          showToast(`Layer "${l.name}" is locked — cannot select or move`, 'warning');
          return;
        }
        state.plan.selectedIds = new Set([hitId]);
        dragState = { mode: 'move', entity: e, start: initialPt, last: initialPt, initial: JSON.parse(JSON.stringify(e)) };
      } else {
        // Empty-space drag = rubber-band box pick (Shift adds to the current
        // selection); plain click-drag pans. Selection clears only when the
        // drag resolves as a non-additive marquee or a plain click.
        dragState = {
          mode: 'marqueeOrPan',
          startClient: { x: event.clientX, y: event.clientY },
          startTransform: { ...transform },
          startWorld: initialPt,
          additive: event.shiftKey,
          hadSelection: state.plan.selectedIds.size > 0
        };
      }
      render();
    } else if (tool === 'hatch' || tool === 'material_paint' || tool === 'watercolor_brush') {
      const entityEl = event.target.closest ? event.target.closest('.plan-entity') : null;
      let hitId = entityEl ? entityEl.dataset.entityId : null;
      if (!hitId) {
        const hits = pickEntities(visible, { x: world.x, y: world.y, width: 0, depth: 0 });
        if (hits.length > 0) hitId = hits[hits.length - 1];
      }
      if (hitId) {
        const room = entities().find(x => x.id === hitId && x.kind === 'room');
        if (room) {
          if (tool === 'hatch') {
            const prevHatch = room.hatch;
            const newHatch = state.activeMaterial || 'brick';
            history.push({
              label: `hatch ${room.name}`,
              redo() { room.hatch = newHatch; render(); },
              undo() { room.hatch = prevHatch; render(); }
            });
            room.hatch = newHatch;
            showToast(`Applied ${newHatch} hatch to "${room.name}"`, 'success');
            AudioService.playTick();
            render();
            return;
          } else {
            const prevFill = room.fill;
            const newFill = state.activePaintColor || 'rgba(59, 130, 246, 0.25)';
            history.push({
              label: `paint ${room.name}`,
              redo() { room.fill = newFill; render(); },
              undo() { room.fill = prevFill; render(); }
            });
            room.fill = newFill;
            showToast(`Applied material finish to "${room.name}"`, 'success');
            AudioService.playTick();
            render();
            return;
          }
        }
      }
    } else if (tool === 'pushpull') {
      const entityEl = event.target.closest ? event.target.closest('.plan-entity') : null;
      let hitId = entityEl ? entityEl.dataset.entityId : null;
      if (!hitId) {
        const hits = pickEntities(visible, { x: world.x, y: world.y, width: 0, depth: 0 });
        if (hits.length > 0) hitId = hits[hits.length - 1];
      }
      if (hitId) {
        const room = entities().find(x => x.id === hitId && x.kind === 'room');
        if (room) {
          const mDoc = state.plan.documents && state.plan.documents.find(d => d.type === '3d_massing');
          if (mDoc) {
            switchDocument(mDoc.id);
          } else {
            createDocument('3D Massing Preview', '3d_massing');
          }
          showToast(`Extruded "${room.name}" to 3D Massing (3.0m height)!`, 'success');
          AudioService.playTick();
          return;
        }
      }
    } else if (tool === 'north') {
      const na = createNorthArrow({ x: initialPt.x, y: initialPt.y });
      const cmd = entityAddRemoveCommand(entities(), na, 'place North Arrow');
      cmd.redo();
      history.push(cmd);
      state.plan.selectedIds = new Set([na.id]);
      showToast('Placed North Arrow compass');
      AudioService.playTick();
      setTool('select');
      render();
      return;
    } else if (tool === 'column') {
      dropColumn(initialPt);
      return;
    } else if (tool === 'polyline') {
      let targetPt = initialPt;
      if (snapOn) {
        const snapRes = findSnapPoint(world, visible, { snapDistance: 0.25, snapGrid: true, gridMeters: state.plan.grid });
        if (snapRes.snapped) targetPt = { x: snapRes.x, y: snapRes.y };
      }
      if (polyLineVertices.length >= 2) {
        const first = polyLineVertices[0];
        if (Math.hypot(targetPt.x - first.x, targetPt.y - first.y) <= Math.max(0.4, state.plan.grid)) {
          finishPolyline();
          return;
        }
      }
      polyLineVertices.push(targetPt);
      AudioService.playTick();
      render();
      renderContextualToolbar();
      return;
    } else if (tool === 'polyroom') {
      let targetPt = initialPt;
      if (snapOn) {
        const snapRes = findSnapPoint(world, visible, { threshold: 0.35, snapGrid: true, gridSize: state.plan.grid });
        if (snapRes.snapped) {
          targetPt = { x: snapRes.x, y: snapRes.y };
        }
      }
      if (polyRoomVertices.length >= 3) {
        const first = polyRoomVertices[0];
        const distToFirst = Math.hypot(targetPt.x - first.x, targetPt.y - first.y);
        if (distToFirst <= Math.max(0.4, state.plan.grid)) {
          finishPolyRoom();
          return;
        }
      }
      polyRoomVertices.push(targetPt);
      AudioService.playTick();
      render();
      renderContextualToolbar();
      return;
    } else if (tool === 'room' || tool === 'wall' || tool === 'line' || tool === 'stair' || tool === 'ramp' || tool === 'dimension' || tool === 'leader' || tool === 'measure' || tool === 'grid' || tool === 'section_cut' || tool === 'detail_callout') {
      if (snapOn) {
        const snapRes = findSnapPoint(world, visible, { snapDistance: 0.25, snapGrid: true, gridMeters: state.plan.grid });
        if (snapRes.snapped) {
          initialPt = { x: snapRes.x, y: snapRes.y };
          activeSnap = snapRes;
        }
      }
      dragState = { mode: 'create', tool, start: initialPt, current: initialPt };
      render();
    } else if (tool === 'furniture') {
      dropFurniture(initialPt);
    } else if (tool === 'door' || tool === 'window') {
      placeOpening(world, tool);
    } else if (tool === 'text') {
      placeTextAnnotation(initialPt);
    }
  }

  let spaceHeld = false;
  function isPanHotkey() {
    return spaceHeld;
  }

  function onPointerMove(event) {
    const world = svgPoint(event);
    currentMouseWorld = world;
    updateStatusBar(world);
    if (polyRoomVertices.length > 0 || (polyLineVertices.length > 0 && !dragState)) {
      if (polyLineVertices.length > 0) polyLineCursor = { x: world.x, y: world.y };
      scheduleSceneRender();
    }
    const snapOn = state.plan.snap !== false;

    if (!dragState) {
      if (snapOn && (state.plan.tool === 'wall' || state.plan.tool === 'line' || state.plan.tool === 'dimension' || state.plan.tool === 'measure' || state.plan.tool === 'room' || state.plan.tool === 'polyroom')) {
        const snapRes = findSnapPoint(world, entities(), {
          snapDistance: 0.25,
          snapGrid: false,
          gridMeters: state.plan.grid
        });
        if (snapRes.snapped && snapRes.type !== 'grid') {
          if (!activeSnap || activeSnap.x !== snapRes.x || activeSnap.y !== snapRes.y || activeSnap.type !== snapRes.type) {
            activeSnap = snapRes;
            scheduleSceneRender();
          }
        } else if (activeSnap) {
          activeSnap = null;
          scheduleSceneRender();
        }
      }
      return;
    }

    if (dragState.mode === 'orbit_3d') {
      const dx = event.clientX - dragState.startClient.x;
      const dy = event.clientY - dragState.startClient.y;
      const doc = getActiveDocument();
      if (!doc.camera) doc.camera = {};
      doc.camera.azimuth = (dragState.startCam.azimuth || 45) + dx * 0.5;
      doc.camera.elevation = Math.max(10, Math.min(85, (dragState.startCam.elevation || 35.264) - dy * 0.5));
      scheduleSceneRender();
      return;
    }

    if (dragState.mode === 'pan') {
      const dx = event.clientX - dragState.startClient.x;
      const dy = event.clientY - dragState.startClient.y;
      transform = panBy(dragState.startTransform, dx, dy);
      scheduleSceneRender();
      return;
    }

    if (dragState.mode === 'marqueeOrPan') {
      const dx = event.clientX - dragState.startClient.x;
      const dy = event.clientY - dragState.startClient.y;
      if (!dragState.marquee && Math.hypot(dx, dy) > 5) {
        // Real drag: switch from pan-candidate to rubber-band box pick.
        dragState.marquee = true;
        dragState.current = { ...dragState.startWorld };
      }
      if (dragState.marquee) {
        dragState.current = { x: world.x, y: world.y };
        updateMarqueeOverlay(event.clientX, event.clientY);
        scheduleSceneRender();
      } else {
        transform = panBy(dragState.startTransform, dx, dy);
        scheduleSceneRender();
      }
      return;
    }

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
          e.p1 = { x: e.x1, y: e.y1 };
          e.p2 = { x: e.x2, y: e.y2 };
          e.x = Math.min(e.x1, e.x2);
          e.y = Math.min(e.y1, e.y2);
          e.width = Math.abs(e.x2 - e.x1);
          e.depth = Math.abs(e.y2 - e.y1);
          e.name = `${Math.hypot(e.x2 - e.x1, e.y2 - e.y1).toFixed(2)}m`;
        }
        scheduleSceneRender();
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

      scheduleSceneRender();
      return;
    }

    if (dragState.mode === 'create') {
      let targetPt = snapped;
      if (snapOn) {
        const snapRes = findSnapPoint(world, entities(), {
          snapDistance: 0.25,
          snapGrid: true,
          gridMeters: state.plan.grid,
          startPoint: dragState.start
        });
        if (snapRes.snapped) {
          targetPt = { x: snapRes.x, y: snapRes.y };
          activeSnap = snapRes;
        } else {
          activeSnap = null;
        }
      } else {
        activeSnap = null;
      }
      dragState.current = targetPt;

      if (dragState.tool === 'measure') {
        const m = computeMeasurement(dragState.start, dragState.current);
        if (dom.planStatusBadge) {
          dom.planStatusBadge.textContent = m.formatted;
        }
      } else if (dragState.tool === 'room') {
        const curRect = {
          x: Math.min(dragState.start.x, targetPt.x),
          y: Math.min(dragState.start.y, targetPt.y),
          width: Math.abs(targetPt.x - dragState.start.x),
          depth: Math.abs(targetPt.y - dragState.start.y)
        };
        activeGuides = computeAlignmentGuides(curRect, entities(), 0.15);
      }
      if (dragState.tool === 'wall' || dragState.tool === 'dimension' || dragState.tool === 'measure' || dragState.tool === 'room') {
        const dM = Math.hypot(targetPt.x - dragState.start.x, targetPt.y - dragState.start.y);
        const deg = ((Math.atan2(targetPt.y - dragState.start.y, targetPt.x - dragState.start.x) * 180 / Math.PI) + 360) % 360;
        showHud(dM, deg);
      }
      scheduleSceneRender();
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
            dragState.entity.p1 = { x: dragState.entity.x1, y: dragState.entity.y1 };
            dragState.entity.p2 = { x: dragState.entity.x2, y: dragState.entity.y2 };
            dragState.entity.x = Math.min(dragState.entity.x1, dragState.entity.x2);
            dragState.entity.y = Math.min(dragState.entity.y1, dragState.entity.y2);
          }
        } else if (dragState.entity.kind === 'leader') {
          if (dragState.entity.p1) { dragState.entity.p1.x += dx; dragState.entity.p1.y += dy; }
          if (dragState.entity.knee) { dragState.entity.knee.x += dx; dragState.entity.knee.y += dy; }
          if (dragState.entity.p2) { dragState.entity.p2.x += dx; dragState.entity.p2.y += dy; }
          dragState.entity.x = (dragState.entity.x || 0) + dx;
          dragState.entity.y = (dragState.entity.y || 0) + dy;
        } else if (dragState.entity.kind === 'door' || dragState.entity.kind === 'window') {
          const hostWall = entities().find(w => w.id === dragState.entity.wallId);
          if (hostWall && typeof hostWall.x1 === 'number') {
            const dxW = hostWall.x2 - hostWall.x1;
            const dyW = hostWall.y2 - hostWall.y1;
            const lenW = Math.hypot(dxW, dyW);
            if (lenW > 1e-4) {
              const uW = { x: dxW / lenW, y: dyW / lenW };
              const dPos = dx * uW.x + dy * uW.y;
              const maxPos = Math.max(0, lenW - (dragState.entity.width || 0.9));
              dragState.entity.position = Math.max(0, Math.min(maxPos, (dragState.entity.position || 0) + dPos));
            }
          }
        } else {
          dragState.entity.x += dx;
          dragState.entity.y += dy;
          if (snapOn) {
            activeGuides = computeAlignmentGuides(
              { x: dragState.entity.x, y: dragState.entity.y, width: dragState.entity.width || 0, depth: dragState.entity.depth || 0 },
              entities().filter(e => e.id !== dragState.entity.id),
              0.15
            );
          }
        }
        dragState.last = snapped;
        scheduleSceneRender();
      }
    }
  }

  function onPointerUp(event) {
    if (!dragState) return;
    activeSnap = null;
    activeGuides = { guidesX: [], guidesY: [] };

    const hudEl = dom.planNumericHud || document.getElementById('plan-numeric-hud');
    const hudLenInput = dom.hudInputLength || document.getElementById('hud-input-length');
    const hudAngInput = dom.hudInputAngle || document.getElementById('hud-input-angle');
    if (hudEl && document.activeElement !== hudLenInput && document.activeElement !== hudAngInput) {
      hideHud();
    }

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
    } else if (dragState.mode === 'orbit_3d') {
      dragState = null;
      render();
      return;
    } else if (dragState.mode === 'marqueeOrPan') {
      const wasMarquee = dragState.marquee;
      const visible = entities().filter(x => isEntityVisible(x, getActiveDocument()));
      const additive = dragState.additive;
      const hadSelection = dragState.hadSelection;
      hideMarqueeOverlay();
      const box = wasMarquee ? {
        x: Math.min(dragState.startWorld.x, dragState.current.x),
        y: Math.min(dragState.startWorld.y, dragState.current.y),
        width: Math.abs(dragState.current.x - dragState.startWorld.x),
        depth: Math.abs(dragState.current.y - dragState.startWorld.y)
      } : null;
      dragState = null;
      if (wasMarquee && box && (box.width > 0.05 || box.depth > 0.05)) {
        const hits = new Set(pickEntities(visible, box));
        state.plan.selectedIds = additive
          ? new Set([...state.plan.selectedIds, ...hits])
          : hits;
        updateStatusBar();
        showToast(`${state.plan.selectedIds.size} selected${additive ? ' (added)' : ''}`, state.plan.selectedIds.size ? 'success' : 'info');
      } else if (!additive) {
        // Plain click (or a pure pan gesture): clear unless Shift is held.
        state.plan.selectedIds = new Set();
      }
      render();
      return;
    } else if (dragState.mode === 'create') {
      const start = dragState.start;
      const end = dragState.current;
      if (dragState.tool === 'room') {
        createRoomEntity(start, end);
      } else if (dragState.tool === 'line') {
        if (Math.hypot(end.x - start.x, end.y - start.y) < state.plan.grid * 0.5) {
          showToast('Line too short — drag a longer distance', 'warning');
        } else {
          try {
            const line = createLineEntity({ p1: start, p2: end });
            commitEntity(line, 'create line');
            showToast(`Line: ${line.length.toFixed(2)} m · ${Math.round(line.angleDegrees)}°`, 'success');
            AudioService.playTick();
          } catch (err) {
            showToast(err.message, 'warning');
          }
        }
      } else if (dragState.tool === 'wall') {
        createWallEntity(start, end);
      } else if (dragState.tool === 'grid') {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        if (dx < 0.2 && dy < 0.2) {
          showToast('Grid line too short', 'warning');
          dragState = null;
          render();
          return;
        }
        const existingGrids = entities().filter(e => e.kind === 'grid_line');
        const nextNum = existingGrids.length + 1;
        const gLine = createGridLine({
          name: String(nextNum),
          p1: start,
          p2: end,
          bubblePosition: 'both'
        });
        const cmd = entityAddRemoveCommand(entities(), gLine, 'add grid line');
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([gLine.id]);
        showToast(`Placed Grid Line ${gLine.name}`);
        AudioService.playTick();
        setTool('select');
        render();
        renderEntityList();
        renderPropertiesInspector();
      } else if (dragState.tool === 'section_cut') {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        if (dx < 0.2 && dy < 0.2) {
          showToast('Section cut line too short', 'warning');
          dragState = null;
          render();
          return;
        }
        const existingSections = entities().filter(e => e.kind === 'section_cut');
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        const nextLabel = labels[existingSections.length % labels.length];
        const sCut = createSectionCut({
          name: `Section ${nextLabel}-${nextLabel}`,
          label: nextLabel,
          p1: start,
          p2: end,
          sheetRef: `A-20${existingSections.length + 1}`
        });
        const cmd = entityAddRemoveCommand(entities(), sCut, 'add section cut');
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([sCut.id]);
        showToast(`Placed Section Cut ${sCut.label}-${sCut.label}`);
        AudioService.playTick();
        setTool('select');
        render();
        renderEntityList();
        renderPropertiesInspector();
      } else if (dragState.tool === 'detail_callout') {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        const size = Math.max(1.0, Math.max(dx, dy));
        const existingDetails = entities().filter(e => e.kind === 'detail_callout');
        const detailKeys = ['footing', 'parapet', 'window_sill', 'stair_nosing'];
        const dKey = detailKeys[existingDetails.length % detailKeys.length];
        const dNames = {
          footing: 'Foundation Footing Detail',
          parapet: 'Roof Parapet Detail',
          window_sill: 'Window Sill Detail',
          stair_nosing: 'Stair Nosing Detail'
        };
        const nextNum = String(existingDetails.length + 1);
        const dCallout = createDetailCallout({
          name: `Detail ${nextNum}/A-501`,
          detailNum: nextNum,
          sheetRef: 'A-501',
          title: dNames[dKey],
          detailKey: dKey,
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: size,
          depth: size
        });
        const cmd = entityAddRemoveCommand(entities(), dCallout, 'add detail callout');
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([dCallout.id]);
        showToast(`Placed Detail Callout ${dCallout.detailNum}/${dCallout.sheetRef}`);
        AudioService.playTick();
        setTool('select');
        render();
        renderEntityList();
        renderPropertiesInspector();
      } else if (dragState.tool === 'stair') {
        createStairEntityFromDrag(start, end);
      } else if (dragState.tool === 'ramp') {
        createRampEntityFromDrag(start, end);
      } else if (dragState.tool === 'dimension') {
        createDimensionEntity(start, end);
      } else if (dragState.tool === 'leader') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const knee = { x: start.x + dx * 0.6, y: end.y };
        const lNote = createLeaderNote({ p1: start, knee, p2: end, text: 'Note' });
        const cmd = entityAddRemoveCommand(entities(), lNote, 'add leader note');
        cmd.redo();
        history.push(cmd);
        state.plan.selectedIds = new Set([lNote.id]);
        showToast('Placed Leader Note');
        AudioService.playTick();
      } else if (dragState.tool === 'measure') {
        const m = computeMeasurement(start, end);
        showToast(`Measured: ${m.formatted}`);
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
    render();
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
    render();
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
    render();
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
    render();
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
    // Selection evidence rides to the AI studio so the answer concerns the
    // exact selected entities (consumed by the facts-pack builder in app.js).
    state.aiSelectionContext = payload.selectionPackets || null;
    switchMode('ai');
    setTimeout(() => {
      if (dom.aiJobSelect) {
        if (targetType === 'furniture') dom.aiJobSelect.value = 'bestPractice';
        else if (targetType === 'room') dom.aiJobSelect.value = 'studioCritic';
        else if (targetType === 'stair' || targetType === 'ramp') dom.aiJobSelect.value = 'bestPractice';
        else dom.aiJobSelect.value = 'projectAnalysis';
      }
      if (dom.aiContextScopeSelect) {
        if (targetType === 'room') dom.aiContextScopeSelect.value = 'room_current';
        else if (targetType === 'furniture' || targetType === 'stair' || targetType === 'ramp') dom.aiContextScopeSelect.value = 'room_current';
        else dom.aiContextScopeSelect.value = 'plan_only';
      }
      const targetInput = dom.aiQuestionInput || dom.aiUserPrompt;
      if (targetInput) {
        if (targetType === 'room') {
          targetInput.value = `Review spatial proportion, circulation clearance, and daylighting for ${payload.roomName || 'this room'} (${payload.area || ''} m², ${payload.aspect || ''} aspect ratio).`;
        } else if (targetType === 'furniture') {
          targetInput.value = `Review ergonomic fit, clearance envelopes, and accessibility for ${payload.furnName || 'this furniture item'} (${payload.dimensions || ''}) in ${payload.hostRoom || 'room'}.`;
        } else if (targetType === 'stair') {
          targetInput.value = `Evaluate stair proportion comfort (Blondel 2R+T: ${payload.blondel || ''} mm, pitch: ${payload.pitch || ''}°) and recommend egress/headroom considerations.`;
        } else if (targetType === 'ramp') {
          targetInput.value = `Evaluate ramp accessibility slope (1:${payload.ratio || ''} / ${payload.percent || ''}%) and explain landing/handrail guidance for university presentation.`;
        } else {
          targetInput.value = `Provide an architectural critique of this plan layout, circulation flow, and spatial zoning.`;
        }
      }
      views.callController('ai', 'refreshImageGroup');
      showToast(`AI Studio loaded with contextual ${targetType} scope`);
    }, 50);
  }

  // ------------------------------------------------------------------
  // AI Query / Suggestions / Info — selection-aware copilot hooks
  // ------------------------------------------------------------------

  /**
   * AI Query command: routes the user to AI Studio with the exact selection
   * serialized (geometry, relationships, deterministic checks). The AI
   * answers about THAT entity with real numbers, not guesses.
   */
  function startAiQuery(question = '') {
    const sel = selectedEntities();
    const packets = serializeSelection(entities(), state.plan.selectedIds);
    const hasQuestion = typeof question === 'string' && question.trim().length > 0;
    const kindSummary = packets.length
      ? packets.map(p => p.name || p.kind).slice(0, 3).join(', ')
      : 'no selection (document context only)';
    const defaultQuestion = hasQuestion ? question : (packets.length
      ? `Review the selected ${kindSummary}: verify dimensions against geometry, check proportions and clearances, and state any concerns with evidence.`
      : 'Analyze this document: geometry problems, missing annotations, and improvement opportunities.');
    triggerAiCritique(packets.length === 1 ? packets[0].kind : 'plan_only', {
      selectionPackets: packets,
      question: defaultQuestion
    });
    // triggerAiCritique writes canned text; override with our evidence-aware question.
    setTimeout(() => {
      const targetInput = dom.aiQuestionInput || dom.aiUserPrompt;
      if (targetInput) targetInput.value = defaultQuestion;
      if (packets.length === 1 && dom.aiContextScopeSelect) {
        // Narrow the deterministic facts pack to the selection.
        dom.aiContextScopeSelect.value = 'plan_only';
      }
    }, 60);
  }

  /**
   * SUGGEST command: deterministic, ranked, evidence-backed suggestions for
   * the selection (or the whole document when nothing is selected).
   */
  function runSuggestions() {
    const sel = selectedEntities();
    const findings = sel.length > 0
      ? sel.flatMap(e => suggestForEntity(e, entities()))
      : suggestForDocument(entities());
    const scopeLabel = sel.length > 0 ? `${sel.length} selected` : 'the whole document';
    if (findings.length === 0) {
      showToast(`No deterministic issues found in ${scopeLabel}.`, 'success');
      return { ok: true, message: `No deterministic issues found in ${scopeLabel}.` };
    }
    const order = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
    findings.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
    const summary = findings.slice(0, 3)
      .map(f => `[${f.severity.toUpperCase()}] ${f.problem} — ${f.evidence}`)
      .join('  |  ');
    showToast(`Suggestions for ${scopeLabel}: ${summary}`, 'info', 6000);
    showSuggestionsPanel(findings, scopeLabel);
    return { ok: true, message: `${findings.length} suggestion(s) for ${scopeLabel} shown in the inspector.` };
  }

  /**
   * Renders the suggestions / info readout into the properties inspector so
   * deterministic evidence and AI actions share one selection-anchored panel.
   */
  function showSuggestionsPanel(findings, scopeLabel) {
    const host = dom.planPropContent;
    if (!host) return;
    const sevClass = s => ({ critical: 'sug-critical', high: 'sug-high', medium: 'sug-med', low: 'sug-low', informational: 'sug-info' }[s] || 'sug-info');
    host.innerHTML = `
      <div class="suggestions-panel">
        <div class="plan-prop-title">SUGGESTIONS — ${escapeHtml(scopeLabel)}</div>
        ${findings.map(f => `
          <div class="suggestion-row ${sevClass(f.severity)}">
            <div class="suggestion-sev">${escapeHtml(f.severity.toUpperCase())}</div>
            <div class="suggestion-body">
              <div class="suggestion-problem">${escapeHtml(f.problem)}</div>
              <div class="suggestion-evidence">${escapeHtml(f.evidence)}</div>
              <div class="suggestion-rec">${escapeHtml(f.recommendation)}${f.toolId ? ` <em>(tool: ${escapeHtml(f.toolId)})</em>` : ''}</div>
            </div>
          </div>`).join('')}
        <div class="plan-prop-actions">
          <button type="button" id="btn-sug-ai" class="plan-prop-btn"><span>Ask AI about these</span></button>
        </div>
      </div>`;
    host.querySelector('#btn-sug-ai')?.addEventListener('click', () => {
      const questions = findings.filter(f => f.severity !== 'informational').slice(0, 5)
        .map(f => `${f.problem}: ${f.evidence}`).join('; ');
      startAiQuery(`How should I resolve these findings? ${questions}`);
    });
  }

  /**
   * INFO command: rich entity readout in the inspector — measurements,
   * relationships and deterministic checks, per entity kind.
   */
  function showInspectorInfo(selection) {
    const host = dom.planPropContent;
    if (!host) return;
    const packets = serializeSelection(entities(), state.plan.selectedIds);
    const rows = [];
    for (const p of packets) {
      rows.push(`<div class="info-entity"><div class="plan-prop-title">[${escapeHtml(p.kind.toUpperCase())}] ${escapeHtml(p.name)}</div>`);
      const fact = (k, v, unit = '') => {
        if (v === null || v === undefined) return;
        rows.push(`<div class="plan-prop-row"><span class="plan-prop-label">${escapeHtml(k)}</span><span class="plan-prop-value">${escapeHtml(String(v))}${unit}</span></div>`);
      };
      fact('Length', typeof p.length === 'number' ? p.length.toFixed(3) : null, ' m');
      fact('Angle', typeof p.angleDegrees === 'number' ? p.angleDegrees.toFixed(1) : null, '°');
      fact('Thickness', typeof p.thickness === 'number' ? p.thickness.toFixed(3) : null, ' m');
      fact('Width', typeof p.width === 'number' ? p.width.toFixed(3) : null, ' m');
      fact('Depth', typeof p.depth === 'number' ? p.depth.toFixed(3) : null, ' m');
      fact('Area', typeof p.area === 'number' ? p.area.toFixed(2) : null, ' m²');
      fact('Perimeter', typeof p.perimeter === 'number' ? p.perimeter.toFixed(2) : null, ' m');
      fact('Aspect ratio', typeof p.aspectRatio === 'number' ? p.aspectRatio.toFixed(2) : null, ':1');
      fact('Measured', typeof p.measuredLength === 'number' ? p.measuredLength.toFixed(3) : null, ' m');
      fact('Layer', p.layerId);
      if (p.openings) fact('Openings', p.openings.length);
      if (p.dimensions && p.dimensions.length) fact('Dimensions', p.dimensions.map(d => d.value.toFixed(2)).join(', '), ' m');
      if (p.furniture) fact('Furniture inside', p.furniture.length);
      if (p.doors) fact('Doors', p.doors.length);
      if (p.hostRoom) fact('Host room', p.hostRoom);
      if (typeof p.matchesGeometry === 'boolean') {
        fact('Verified vs geometry', p.matchesGeometry ? 'MATCH' : 'NO MATCH');
        if (!p.matchesGeometry && p.matchingEntities?.length === 0) {
          rows.push('<div class="info-check info-check-fail">This dimension does not correspond to any wall/line/room edge — re-measure with DIST.</div>');
        } else if (p.matchesGeometry) {
          rows.push('<div class="info-check info-check-pass">Dimension verified against actual geometry.</div>');
        }
      }
      rows.push('</div>');
    }
    rows.push(`
      <div class="plan-prop-actions">
        <button type="button" id="btn-info-ai" class="plan-prop-btn"><span>Ask AI about this</span></button>
        <button type="button" id="btn-info-suggest" class="plan-prop-btn"><span>Suggestions</span></button>
      </div>`);
    host.innerHTML = rows.join('');
    host.querySelector('#btn-info-ai')?.addEventListener('click', () => startAiQuery(''));
    host.querySelector('#btn-info-suggest')?.addEventListener('click', () => runSuggestions());
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
    const doc = getActiveDocument();
    let deletedCount = 0;
    let lockedCount = 0;
    for (const id of state.plan.selectedIds) {
      const e = entities().find(x => x.id === id);
      if (!e) continue;
      if (isEntityLocked(e, doc)) {
        lockedCount++;
        continue;
      }
      const cmd = entityAddRemoveCommand(entities(), e, `delete ${e.name}`);
      cmd.undo(); // remove now
      history.push(cmd);
      deletedCount++;
    }
    if (lockedCount > 0 && deletedCount === 0) {
      showToast('Cannot delete: selected item(s) are on a locked layer', 'warning');
      return;
    }
    state.plan.selectedIds = new Set();
    showToast(deletedCount > 0 ? 'Selection deleted (undo available)' : 'Nothing deleted');
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
    const curDoc = getActiveDocument();
    if (curDoc) {
      curDoc.viewport = { zoom: transform.zoom, offsetX: transform.offsetX, offsetY: transform.offsetY };
    }
    const copy = JSON.parse(JSON.stringify(entities()));
    const docsCopy = JSON.parse(JSON.stringify(state.plan.documents || []));
    const res = projectStore.updateProject(draft => {
      draft.plan = { entities: copy, savedAt: new Date().toISOString() };
      draft.documents = docsCopy;
      return draft;
    });
    if (res.ok) {
      showToast(`Plan saved to project (${copy.length} entities across ${docsCopy.length} sheets)`);
      AudioService.playSuccess();
    } else {
      showToast(`Save failed: ${res.errors[0]}`, 'warning');
    }
  }

  function loadFromProject() {
    const p = projectStore?.getProject();
    if (p) {
      if (Array.isArray(p.documents) && p.documents.length > 0) {
        state.plan.documents = JSON.parse(JSON.stringify(p.documents));
        state.plan.activeDocId = state.plan.documents[0].id;
        const active = getActiveDocument();
        state.plan.entities = active.entities;
        if (active.viewport && typeof active.viewport.zoom === 'number') {
          transform = { ...active.viewport };
        }
        renderTabs();
      } else if (p.plan && Array.isArray(p.plan.entities)) {
        entities().length = 0;
        entities().push(...JSON.parse(JSON.stringify(p.plan.entities)));
      }
      history.clear();
      render();
      renderEntityList();
      renderPropertiesInspector();
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

    // Polyline chain: Enter finishes the open chain, Esc cancels.
    if (polyLineVertices.length > 0 && event.key === 'Enter') {
      event.preventDefault();
      finishPolyline();
      return;
    }
    if (polyLineVertices.length > 0 && event.key === 'Escape') {
      event.preventDefault();
      cancelPolyline();
      return;
    }

    if (dragState && dragState.mode === 'create' && /^[0-9]$/.test(event.key)) {
      showHud();
      const hudLenInput = dom.hudInputLength || document.getElementById('hud-input-length');
      if (hudLenInput) {
        hudLenInput.value = event.key;
        hudLenInput.focus();
        event.preventDefault();
        return;
      }
    }

    // Rebindable shortcuts via ShortcutsManager
    if (typeof ShortcutsManager !== 'undefined') {
      if (ShortcutsManager.matchesEvent('plan_undo', event)) {
        event.preventDefault();
        undo();
        return;
      }
      if (ShortcutsManager.matchesEvent('plan_redo', event)) {
        event.preventDefault();
        redo();
        return;
      }
      if (ShortcutsManager.matchesEvent('plan_duplicate', event)) {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (ShortcutsManager.matchesEvent('plan_delete', event)) {
        if (state.plan.selectedIds.size > 0) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (ShortcutsManager.matchesEvent('plan_cancel', event) || event.key === 'Escape') {
        if (polyRoomVertices.length > 0) {
          cancelPolyRoom();
          return;
        }
        hideHud();
        state.plan.selectedIds = new Set();
        setTool('select');
        render();
        return;
      }
      if (ShortcutsManager.matchesEvent('plan_zoom_fit', event)) {
        event.preventDefault();
        fitToContent();
        return;
      }
      if (ShortcutsManager.matchesEvent('tool_select', event)) { event.preventDefault(); setTool('select'); return; }
      if (ShortcutsManager.matchesEvent('tool_wall', event)) { event.preventDefault(); setTool('wall'); return; }
      if (ShortcutsManager.matchesEvent('tool_room', event)) { event.preventDefault(); setTool('room'); return; }
      if (ShortcutsManager.matchesEvent('tool_furniture', event)) { event.preventDefault(); setTool('furniture'); return; }
      if (ShortcutsManager.matchesEvent('tool_measure', event)) { event.preventDefault(); setTool('measure'); return; }
      if (ShortcutsManager.matchesEvent('tool_dimension', event)) { event.preventDefault(); setTool('dimension'); return; }
      if (ShortcutsManager.matchesEvent('tool_stair', event)) { event.preventDefault(); setTool('stair'); return; }
      if (ShortcutsManager.matchesEvent('tool_ramp', event)) { event.preventDefault(); setTool('ramp'); return; }
      if (ShortcutsManager.matchesEvent('plan_grid', event)) { event.preventDefault(); cycleGrid(); return; }
      if (ShortcutsManager.matchesEvent('plan_snap', event)) { event.preventDefault(); toggleSnap(); return; }
      if (ShortcutsManager.matchesEvent('shortcuts_modal', event)) {
        event.preventDefault();
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (state.plan.selectedIds.size > 0) {
        event.preventDefault();
        deleteSelected();
      }
      return;
    } else if (event.key === 'Escape') {
      state.plan.selectedIds = new Set();
      setTool('select');
      render();
      return;
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const step = event.shiftKey ? 40 : 10;
      if (event.key === 'ArrowLeft') transform = panBy(transform, step, 0);
      else if (event.key === 'ArrowRight') transform = panBy(transform, -step, 0);
      else if (event.key === 'ArrowUp') transform = panBy(transform, 0, step);
      else transform = panBy(transform, 0, -step);
      render();
      return;
    } else if (event.key === '+' || event.key === '=') {
      transform = zoomAt(transform, 1.25, svg.width / 2, svg.height / 2);
      render();
      return;
    } else if (event.key === '-') {
      transform = zoomAt(transform, 0.8, svg.width / 2, svg.height / 2);
      render();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const k = event.key.toLowerCase();
    if (k === 'v') { event.preventDefault(); setTool('select'); }
    else if (k === 'r') { event.preventDefault(); setTool('room'); }
    else if (k === 'w') { event.preventDefault(); setTool('wall'); }
    else if (k === 'f') { event.preventDefault(); setTool('furniture'); }
    else if (k === 'm') { event.preventDefault(); setTool('measure'); }
    else if (k === 'd') { event.preventDefault(); setTool('dimension'); }
    else if (k === 't') { event.preventDefault(); setTool('stair'); }
    else if (k === 'p') { event.preventDefault(); setTool('ramp'); }
    else if (k === 'z') { event.preventDefault(); fitToContent(); }
    else if (k === 'g') { event.preventDefault(); cycleGrid(); }
    else if (k === 's') { event.preventDefault(); toggleSnap(); }
    else if (event.key === '?') {
      event.preventDefault();
      dom.shortcutsModal?.classList.add('open');
      dom.modalBackdrop?.classList.add('open');
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
      if (typeof prefs.snap === 'boolean') state.plan.snap = prefs.snap;
      else if (state.plan.snap === undefined) state.plan.snap = true;
      if (prefs.zoom) transform.zoom = prefs.zoom;
      if (dom.planToolSelect) dom.planToolSelect.value = state.plan.tool;
      if (dom.planGridSelect) dom.planGridSelect.value = String(state.plan.grid);
      populateFurniture();
      syncToolVisibility();
      loadFromProject();
      initDocuments();
      renderTabs();
      setupSidebarTabs();

      const newDocBtn = dom.btnPlanNewDoc || document.getElementById('btn-plan-new-doc');
      const newTabMenu = document.getElementById('plan-new-tab-menu');
      // Hydrate the new-tab menu icons from the SVG registry (no emoji in UI).
      newTabMenu?.querySelectorAll('[data-doc-icon]').forEach(span => {
        span.innerHTML = docTypeIcon(span.dataset.docIcon, { size: 14 });
      });

      // View orientation compass: routes through the command executor so the
      // compass, the TOP/FRONT/RIGHT/PERSPECTIVE commands and the ribbon all
      // share one view-switching path.
      const compass = document.getElementById('plan-nav-compass');
      compass?.querySelectorAll('.navc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeCadCommand(btn.dataset.view);
        });
      });
      if (newDocBtn) {
        newDocBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (newTabMenu) {
            const isHidden = newTabMenu.style.display === 'none' || !newTabMenu.style.display;
            newTabMenu.style.display = isHidden ? 'block' : 'none';
          } else {
            createDocument();
          }
        });
      }
      if (newTabMenu) {
        newTabMenu.addEventListener('click', (e) => {
          const item = e.target.closest('.plan-dropdown-item');
          if (item && item.dataset.tabType) {
            createDocument(null, item.dataset.tabType);
            newTabMenu.style.display = 'none';
          }
        });
        document.addEventListener('click', (e) => {
          if (!newTabMenu.contains(e.target) && e.target !== newDocBtn) {
            newTabMenu.style.display = 'none';
          }
        });
      }
      setupHudListeners();
      renderStudioComponents();

      // Tool palette buttons
      const palette = dom.planToolPalette || document.getElementById('plan-tool-palette');
      if (palette) {
        // Hydrate static emoji buttons with the SVG icon registry.
        palette.querySelectorAll('.tool-palette-btn[data-tool]').forEach(btn => {
          const span = btn.querySelector('.tool-icon');
          if (span && span.children.length === 0) {
            span.innerHTML = icon(TOOL_ICON_BY_TOOL[btn.dataset.tool] || 'generic', { size: 16 });
          }
        });
        palette.addEventListener('click', (e) => {
          const btn = e.target.closest('.tool-palette-btn');
          if (btn && btn.dataset.tool) {
            setTool(btn.dataset.tool);
          }
        });
        palette.querySelectorAll('.tool-palette-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tool === state.plan.tool);
        });
      }

      // Status bar buttons
      const gridBtn = dom.statusGridBtn || document.getElementById('status-grid-btn');
      if (gridBtn) {
        gridBtn.addEventListener('click', () => cycleGrid());
      }
      const snapBtn = dom.statusSnapBtn || document.getElementById('status-snap-btn');
      if (snapBtn) {
        snapBtn.addEventListener('click', () => toggleSnap());
      }

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
        dom.planSvg.addEventListener('pointermove', (e) => {
          const world = svgPoint(e);
          updateStatusBar(world);
        });
        dom.planSvg.addEventListener('dblclick', () => {
          if (polyRoomVertices.length >= 3) {
            finishPolyRoom();
          }
        });
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        dom.planSvg.addEventListener('wheel', (e) => {
          e.preventDefault();
          syncSvgSize();
          const activeDoc = getActiveDocument();
          if (activeDoc && activeDoc.type === '3d_massing') {
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            if (!activeDoc.camera) {
              activeDoc.camera = { azimuth: 45, elevation: 35.264, zoom: 32, panX: svg.width / 2, panY: svg.height / 2 + 30 };
            }
            activeDoc.camera.zoom = Math.max(5, Math.min(250, (activeDoc.camera.zoom || 32) * factor));
            scheduleSceneRender();
            return;
          }
          const sp = clientToSvg(e.clientX, e.clientY);
          transform = zoomAt(transform, e.deltaY < 0 ? 1.15 : 0.87, sp.x, sp.y);
          scheduleSceneRender();
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
        syncToolVisibility, fitToContent, setZoomPercent, zoomStep, syncSvgSize,
        triggerAiCritique, setTool, cycleGrid, toggleSnap, duplicateSelected,
        renderContextualToolbar, updateStatusBar,
        switchDocument, createDocument, closeDocument, renameDocument,
        finishPolyRoom, cancelPolyRoom, renderTabs,
        renderLayerList, setupSidebarTabs, renderScheduleList,
        renderStudioComponents, updateStudioCPanels, handleStudioToolAction,
        setPersona: (p) => {
          state.activePersona = p;
          const config = PERSONA_RIBBON_CONFIGS[p];
          if (config && config.tabs && config.tabs.length > 0) {
            state.activeRibbonTab = config.tabs[0].id;
          }
          renderStudioComponents();
        }
      };
    }
  };
}
