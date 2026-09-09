/**
 * Architecture Helping Hand - Omnipresent AI Context Bridge
 * Serializes live drawing canvas context, formats architectural prompt envelopes,
 * parses structured generative actions, and dispatches them into the active document.
 */

import {
  createRoom,
  createWall,
  createStairEntity,
  createDetailCallout,
  createSectionCut,
  wallOpenings
} from './entities.js';
import { STUDIO_TOOL_CATALOG } from './personas.js';

/**
 * Serializes the current active drawing viewport, persona, scale, and entities
 * into a structured context snapshot for AI queries.
 * @param {Object} state Studio global state
 * @returns {Object} Context snapshot
 */
export function serializeDrawingContext(state = {}) {
  const plan = state.plan || {};
  const activeDocId = plan.activeDocId;
  const docs = Array.isArray(plan.documents) ? plan.documents : [];
  const activeDoc = docs.find(d => d.id === activeDocId) || docs[0] || {};
  const entities = Array.isArray(activeDoc.entities) ? activeDoc.entities : (Array.isArray(plan.entities) ? plan.entities : []);

  const rooms = entities.filter(e => e.kind === 'room');
  const walls = entities.filter(e => e.kind === 'wall');
  const furniture = entities.filter(e => e.kind === 'furniture');
  const stairs = entities.filter(e => e.kind === 'stair');
  const dims = entities.filter(e => e.kind === 'dimension');

  const grossArea = rooms.reduce((sum, r) => sum + (typeof r.width === 'number' && typeof r.depth === 'number' ? (r.width * r.depth) : 0), 0);
  const wallLength = walls.reduce((sum, w) => {
    if (typeof w.x1 === 'number' && typeof w.x2 === 'number') {
      const dx = w.x2 - w.x1;
      const dy = (w.y2 || 0) - (w.y1 || 0);
      return sum + Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
  }, 0);

  return {
    persona: state.activePersona || 'studio',
    activeDocId: activeDoc.id || 'doc-1',
    activeDocName: activeDoc.name || 'Plan View',
    documentName: activeDoc.name || 'Ground Floor',
    activeDocType: activeDoc.type || '2d_plan',
    scale: plan.scale || '1:50',
    grid: plan.grid || 0.5,
    snap: plan.snap !== false,
    activeTool: plan.tool || 'select',
    entityCount: entities.length,
    roomsCount: rooms.length,
    grossArea: Math.round(grossArea * 100) / 100,
    wallCount: walls.length,
    totalWallLength: Math.round(wallLength * 100) / 100,
    furnitureCount: furniture.length,
    stairCount: stairs.length,
    dimensionCount: dims.length,
    rooms: rooms.map(r => ({ name: r.name, width: r.width, depth: r.depth, area: Math.round((r.width * r.depth) * 10) / 10 })),
    selectedCount: plan.selectedIds ? plan.selectedIds.size : 0,
    selection: serializeSelection(entities, plan.selectedIds),
    availableTools: serializeToolCapabilities()
  };
}

/**
 * Serializes the CURRENT SELECTION with full deterministic geometry,
 * relationships, and per-type measurements. This is what makes "AI answers
 * about the exact selected entity" possible: the model receives verified
 * numbers, not a request to guess.
 *
 * @param {Array<Object>} entities - active document entities
 * @param {Set<string>|Array<string>} selectedIds
 * @returns {Array<Object>} per-entity evidence packets (empty when nothing selected)
 */
export function serializeSelection(entities = [], selectedIds = null) {
  const ids = selectedIds instanceof Set ? [...selectedIds] : (Array.isArray(selectedIds) ? selectedIds : []);
  if (ids.length === 0) return [];
  const byId = new Map(entities.map(e => [e.id, e]));
  const packets = [];
  for (const id of ids) {
    const e = byId.get(id);
    if (!e) continue;
    const packet = {
      id: e.id,
      kind: e.kind,
      name: e.name || e.id,
      layerId: e.layerId || null
    };
    switch (e.kind) {
      case 'wall': {
        const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
        packet.length = round(len);
        packet.thickness = e.thickness ?? null;
        packet.assemblyId = e.assemblyId || null;
        packet.angleDegrees = round((Math.atan2(e.y2 - e.y1, e.x2 - e.x1) * 180) / Math.PI);
        packet.p1 = { x: round(e.x1), y: round(e.y1) };
        packet.p2 = { x: round(e.x2), y: round(e.y2) };
        packet.openings = (typeof wallOpenings === 'function' ? wallOpenings(e, entities) : []).map(o => ({
          id: o.id, kind: o.kind, name: o.name, width: o.width
        }));
        packet.dimensions = entities
          .filter(d => d.kind === 'dimension' && dimensionTouchesSegment(d, e))
          .map(d => ({ id: d.id, value: round(dimensionValue(d)) }));
        break;
      }
      case 'line': {
        packet.length = round(typeof e.length === 'number' ? e.length : Math.hypot(e.x2 - e.x1, e.y2 - e.y1));
        packet.angleDegrees = round(e.angleDegrees ?? 0);
        packet.p1 = { x: round(e.x1), y: round(e.y1) };
        packet.p2 = { x: round(e.x2), y: round(e.y2) };
        break;
      }
      case 'room': {
        const area = typeof e.width === 'number' && typeof e.depth === 'number' ? e.width * e.depth : 0;
        packet.width = round(e.width ?? 0);
        packet.depth = round(e.depth ?? 0);
        packet.area = round(area);
        packet.perimeter = round(e.width && e.depth ? 2 * (e.width + e.depth) : 0);
        packet.aspectRatio = e.width && e.depth ? round(Math.max(e.width, e.depth) / Math.min(e.width, e.depth), 2) : null;
        packet.furniture = entities.filter(f => f.kind === 'furniture' &&
          typeof f.x === 'number' && f.x >= e.x - 0.01 && f.x <= e.x + e.width + 0.01 &&
          f.y >= e.y - 0.01 && f.y <= e.y + e.depth + 0.01
        ).map(f => ({ id: f.id, name: f.name, width: round(f.width), depth: round(f.depth) }));
        packet.doors = entities.filter(d => d.kind === 'door' &&
          typeof d.x === 'number' && d.x >= e.x - 0.3 && d.x <= e.x + e.width + 0.3 &&
          d.y >= e.y - 0.3 && d.y <= e.y + e.depth + 0.3
        ).map(d => ({ id: d.id, name: d.name, width: round(d.width) }));
        packet.dimensions = entities.filter(d => d.kind === 'dimension' &&
          (Math.abs(dimensionValue(d) - e.width) < 0.02 || Math.abs(dimensionValue(d) - e.depth) < 0.02)
        ).map(d => ({ id: d.id, value: round(dimensionValue(d)) }));
        break;
      }
      case 'dimension': {
        packet.measuredLength = round(dimensionValue(e));
        packet.p1 = e.p1 ? { x: round(e.p1.x), y: round(e.p1.y) } : null;
        packet.p2 = e.p2 ? { x: round(e.p2.x), y: round(e.p2.y) } : null;
        packet.unit = e.unit || 'm';
        packet.textOverride = e.textOverride || null;
        // Verification: is a wall/room edge actually this long?
        const matches = entities.filter(t => (t.kind === 'wall' || t.kind === 'line' || t.kind === 'room') &&
          Math.abs(entityPrimaryLength(t) - dimensionValue(e)) < 0.02
        ).map(t => ({ id: t.id, kind: t.kind, name: t.name, length: round(entityPrimaryLength(t)) }));
        packet.matchesGeometry = matches.length > 0;
        packet.matchingEntities = matches.slice(0, 5);
        break;
      }
      case 'stair': {
        packet.risers = e.risers ?? null;
        packet.width = round(e.width ?? 0);
        packet.riserHeight = e.riserHeight ?? null;
        packet.tread = e.tread ?? null;
        packet.blondel = e.blondel ?? null;
        packet.pitchAngle = e.pitchAngle ?? null;
        break;
      }
      case 'ramp': {
        packet.slopePercent = e.slopePercent ?? null;
        packet.slopeRatio = e.slopeRatio ?? null;
        packet.width = round(e.width ?? 0);
        packet.length = round(e.depth ?? 0);
        break;
      }
      case 'door':
      case 'window': {
        packet.width = round(e.width ?? 0);
        packet.hostWallId = e.wallId || e.hostWallId || null;
        packet.swing = e.swing || null;
        break;
      }
      case 'furniture': {
        packet.width = round(e.width ?? 0);
        packet.depth = round(e.depth ?? 0);
        packet.catalogId = e.catalogId || e.templateId || null;
        packet.hostRoom = entities.find(r => r.kind === 'room' &&
          typeof e.x === 'number' && e.x >= r.x && e.x <= r.x + r.width &&
          e.y >= r.y && e.y <= r.y + r.depth
        )?.name || null;
        break;
      }
      default: {
        packet.width = round(e.width ?? 0);
        packet.depth = round(e.depth ?? 0);
      }
    }
    packets.push(packet);
  }
  return packets;
}

/**
 * Tool-awareness capabilities for "what can I do with this?" answers:
 * the real registered catalog (single source of truth: personas.js).
 */
export function serializeToolCapabilities(toolCatalog = STUDIO_TOOL_CATALOG) {
  const tools = (toolCatalog || []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    command: t.commandAlias || null,
    shortcut: t.shortcut || null,
    category: t.category,
    personas: t.personas || []
  }));
  return { count: tools.length, tools };
}

function round(v, digits = 3) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

function dimensionValue(d) {
  const p1 = d.p1 || { x: d.x1, y: d.y1 };
  const p2 = d.p2 || { x: d.x2, y: d.y2 };
  if (typeof p1?.x !== 'number' || typeof p2?.x !== 'number') return NaN;
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function dimensionTouchesSegment(dim, wall) {
  const p1 = dim.p1 || { x: dim.x1, y: dim.y1 };
  const p2 = dim.p2 || { x: dim.x2, y: dim.y2 };
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.05;
  return (near(p1, { x: wall.x1, y: wall.y1 }) && near(p2, { x: wall.x2, y: wall.y2 })) ||
         (near(p1, { x: wall.x2, y: wall.y2 }) && near(p2, { x: wall.x1, y: wall.y1 }));
}

function entityPrimaryLength(e) {
  if (e.kind === 'wall' || e.kind === 'line') return Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
  if (e.kind === 'room') return typeof e.width === 'number' ? e.width : 0;
  return 0;
}

/**
 * Builds an architectural design prompt envelope injecting live drawing metrics.
 * @param {string} userQuery Natural language prompt from the user
 * @param {Object} context Serialized drawing context
 * @returns {string} Enriched prompt string
 */
export function buildArchitecturalPrompt(userQuery, context = {}) {
  return `You are the Architecture Helping Hand AI Studio Assistant.
You have real-time visibility into the architect's active drawing workspace.

WORKSPACE CONTEXT:
- Active Persona: ${context.persona || 'studio'}
- Active Document: ${context.activeDocName || 'Level 1'} (${context.activeDocType || '2d_plan'})
- Total Entities: ${context.entityCount || 0}
- Rooms: ${context.roomsCount || 0} (Gross Floor Area: ${context.grossArea || 0} m²)
- Walls: ${context.wallCount || 0} (Total Run: ${context.totalWallLength || 0} m)
- Furniture Pieces: ${context.furnitureCount || 0}
- Active Tool: ${context.activeTool || 'select'}

ARCHITECT INSTRUCTION / QUESTION:
"${userQuery}"

Provide professional architectural guidance, IBC code compliance insight, Blondel stair calculation (2R+T=630mm), and spatial flow critique.
If your suggestion involves geometric additions or edits, append a JSON code block with executable actions:
\`\`\`json
[
  { "action": "CREATE_ROOM", "name": "Living Room", "width": 5.0, "depth": 4.0, "x": 0, "y": 0 },
  { "action": "CREATE_WALL", "x1": 0, "y1": 0, "x2": 5, "y2": 0, "thickness": 0.20 },
  { "action": "EXECUTE_TOOL", "toolId": "dimension" }
]
\`\`\``;
}

/**
 * Parses structured actionable geometric payloads from AI responses.
 * @param {string} aiResponseText
 * @returns {Array<Object>} Parsed action items
 */
export function parseAiActions(aiResponseText) {
  if (!aiResponseText || typeof aiResponseText !== 'string') return [];
  const actions = [];

  const jsonBlocks = aiResponseText.match(/```(?:json)?\s*([\s\S]*?)```/gi);
  if (jsonBlocks) {
    for (const block of jsonBlocks) {
      const clean = block.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          actions.push(...parsed);
        } else if (Array.isArray(parsed.actions)) {
          actions.push(...parsed.actions);
        } else if (parsed.type || parsed.action) {
          actions.push(parsed);
        }
      } catch (e) {
        // Continue searching
      }
    }
  }

  return actions;
}

/**
 * Executes a parsed AI action directly into the active drawing model.
 * @param {Object} action Parsed action item
 * @param {Object} planState state.plan or global state
 * @returns {Object} Result { success: boolean, entity?: Object, error?: string }
 */
export function executeAiAction(action, planState) {
  if (!action) return { success: false, error: 'No action provided' };
  const targetPlan = planState?.plan ? planState.plan : (planState || {});
  const actionType = String(action.type || action.action || '').toLowerCase();

  // Determine entities container
  let targetEntities = null;
  if (Array.isArray(targetPlan.documents) && targetPlan.documents.length > 0) {
    const activeDoc = targetPlan.documents.find(d => d.id === targetPlan.activeDocId) || targetPlan.documents[0];
    if (!Array.isArray(activeDoc.entities)) activeDoc.entities = [];
    targetEntities = activeDoc.entities;
  } else {
    if (!Array.isArray(targetPlan.entities)) targetPlan.entities = [];
    targetEntities = targetPlan.entities;
  }

  let newEntity = null;

  switch (actionType) {
    case 'add_room':
    case 'create_room': {
      const rx = action.x !== undefined ? action.x : (action.x1 || 0);
      const ry = action.y !== undefined ? action.y : (action.y1 || 0);
      const rw = action.width !== undefined ? action.width : (action.x2 !== undefined ? Math.abs(action.x2 - rx) : 4.0);
      const rd = action.depth !== undefined ? action.depth : (action.y2 !== undefined ? Math.abs(action.y2 - ry) : 3.0);
      newEntity = createRoom({
        name: action.name || 'Room',
        x: rx,
        y: ry,
        width: rw,
        depth: rd
      });
      break;
    }
    case 'add_wall':
    case 'create_wall': {
      newEntity = createWall({
        name: action.name || 'Wall',
        x1: action.x1 !== undefined ? action.x1 : (action.x || 0),
        y1: action.y1 !== undefined ? action.y1 : (action.y || 0),
        x2: action.x2 !== undefined ? action.x2 : ((action.x || 0) + 5),
        y2: action.y2 !== undefined ? action.y2 : (action.y || 0),
        thickness: action.thickness || 0.20
      });
      break;
    }
    case 'add_stair':
    case 'create_stair':
    case 'calculate_stair': {
      newEntity = createStairEntity({
        name: action.name || 'Stair Flight',
        x: action.x || 0,
        y: action.y || 0,
        width: action.width || 1.10,
        run: action.run || 3.50,
        rise: action.rise || 2.80,
        risers: action.risers || 16,
        stairType: action.stairType || 'straight'
      });
      break;
    }
    case 'add_detail':
    case 'create_detail': {
      newEntity = createDetailCallout({
        name: action.name || 'Detail Callout',
        detailNum: action.detailNum || '1',
        sheetRef: action.sheetRef || 'A-501',
        detailKey: action.detailKey || 'footing',
        x: action.x || 0,
        y: action.y || 0,
        width: 1.4,
        depth: 1.4
      });
      break;
    }
    case 'add_section':
    case 'create_section': {
      newEntity = createSectionCut({
        name: action.name || 'Section Cut',
        label: action.label || 'A',
        sheetRef: action.sheetRef || 'A-201',
        p1: { x: action.x1 || 0, y: action.y1 || 3 },
        p2: { x: action.x2 || 10, y: action.y2 || 3 }
      });
      break;
    }
    case 'execute_tool':
    case 'set_tool': {
      if (action.toolId) {
        targetPlan.tool = action.toolId;
      }
      return { success: true, tool: targetPlan.tool };
    }
    case 'set_view':
    case 'switch_view': {
      if (action.viewType && Array.isArray(targetPlan.documents)) {
        const found = targetPlan.documents.find(d => d.type === action.viewType);
        if (found) targetPlan.activeDocId = found.id;
      }
      return { success: true, viewType: action.viewType };
    }
    default:
      break;
  }

  if (newEntity) {
    targetEntities.push(newEntity);
    if (!targetPlan.selectedIds) targetPlan.selectedIds = new Set();
    targetPlan.selectedIds = new Set([newEntity.id]);
    return { success: true, entity: newEntity };
  }

  return { success: false, error: `Unknown action: ${actionType}` };
}
