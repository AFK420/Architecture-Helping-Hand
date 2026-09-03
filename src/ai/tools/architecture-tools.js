/**
 * Architecture Helping Hand - AI Tools
 * Phase 9.7: the tool set exposed to the model. Every handler calls
 * DETERMINISTIC core functions with REAL project data — the model never
 * calculates facts the core already knows, and never mutates the project
 * directly (PROPOSE_* tools return proposal objects for the user).
 */

import { roomArea, roomPerimeter } from '../../core/entities.js';
import { calculateStair } from '../../core/stairs.js';
import { calculateRamp } from '../../core/ramps.js';
import { analyzeSlope } from '../../core/slopes.js';
import { checkFurnitureFit, checkClearance, checkOverlaps } from '../../core/space-planning.js';
import { evaluateExpressionSafe } from '../../core/dimension-expression.js';
import { AI_PERMISSIONS } from './registry.js';

/**
 * Builds the standard read/calculate tool set bound to live project state.
 *
 * @param {Function} getProject - () => project document (real store)
 * @param {Function} getPlanEntities - () => plan entity array (real canvas state)
 */
export function createArchitectureTools(getProject, getPlanEntities) {
  const findRoom = (roomRef) => {
    const p = getProject();
    const entities = getPlanEntities();
    return entities.find(e => e.kind === 'room' && (e.id === roomRef || e.name === roomRef)) ||
      (p?.rooms || []).find(r => r.id === roomRef || r.name === roomRef) || null;
  };

  return {
    // ---- READ tools ----
    getProject: {
      description: 'Full project document: metadata, site, containers, decisions, snapshots.',
      permission: AI_PERMISSIONS.READ_PROJECT,
      inputSchema: {},
      handler: async () => getProject()
    },
    getRooms: {
      description: 'All rooms with calculated area and perimeter.',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: {},
      handler: async () => {
        const p = getProject();
        const entities = getPlanEntities();
        const rooms = entities.filter(e => e.kind === 'room');
        return rooms.map(r => ({
          id: r.id, name: r.name, widthMeters: r.width, depthMeters: r.depth,
          areaM2: roomArea(r), perimeterM2: roomPerimeter(r),
          furnitureIds: (p?.plan?.entities || []).filter(e => e.kind === 'furniture' && e.roomId === r.id).map(f => f.id)
        }));
      }
    },
    getRoom: {
      description: 'One room by id or name, with furniture inside it.',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: { roomRef: { type: 'string', required: true } },
      handler: async ({ roomRef }) => {
        const room = findRoom(roomRef);
        if (!room) return { error: `Room "${roomRef}" not found` };
        const furniture = getPlanEntities().filter(e => e.kind === 'furniture' && e.roomId === room.id);
        return {
          id: room.id, name: room.name, widthMeters: room.width, depthMeters: room.depth,
          areaM2: roomArea(room), perimeterM2: roomPerimeter(room),
          furniture: furniture.map(f => ({ id: f.id, name: f.name, x: f.x, y: f.y, widthMeters: f.width, depthMeters: f.depth }))
        };
      }
    },
    getWalls: {
      description: 'All walls with lengths.',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: {},
      handler: async () => getPlanEntities().filter(e => e.kind === 'wall')
    },
    getOpenings: {
      description: 'All doors and windows.',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: {},
      handler: async () => getPlanEntities().filter(e => e.kind === 'door' || e.kind === 'window')
    },
    getFurniture: {
      description: 'All placed furniture with positions and footprints.',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: {},
      handler: async () => getPlanEntities().filter(e => e.kind === 'furniture')
    },
    getDimensions: {
      description: 'All recorded dimensions (the dimension schedule).',
      permission: AI_PERMISSIONS.READ_MEASUREMENTS,
      inputSchema: {},
      handler: async () => getProject()?.dimensions || []
    },
    getMeasurements: {
      description: 'Survey measurements with provenance and verification status.',
      permission: AI_PERMISSIONS.READ_MEASUREMENTS,
      inputSchema: {},
      handler: async () => getProject()?.measurements || []
    },
    getDecisions: {
      description: 'Design decision journal (kind, name, result data).',
      permission: AI_PERMISSIONS.READ_PROJECT,
      inputSchema: {},
      handler: async () => getProject()?.decisions || []
    },

    // ---- CALCULATION tools (deterministic core) ----
    evaluateExpression: {
      description: 'Evaluate an architectural dimension expression, e.g. "2400+900" or "2.8m/2".',
      permission: AI_PERMISSIONS.READ_CALCULATIONS,
      inputSchema: { expression: { type: 'string', required: true } },
      handler: async ({ expression }) => evaluateExpressionSafe(expression)
    },
    calculateStair: {
      description: 'Stair calculation: rise + riser count → riser/tread/run/angle/Blondel.',
      permission: AI_PERMISSIONS.READ_CALCULATIONS,
      inputSchema: { totalRiseMeters: { type: 'number', required: true }, riserCount: { type: 'number', required: true } },
      handler: async ({ totalRiseMeters, riserCount }) => calculateStair({ mode: 'rise_riser_count', totalRise: totalRiseMeters, riserCount })
    },
    calculateRamp: {
      description: 'Ramp geometry: rise + run → slope %, ratio, angle.',
      permission: AI_PERMISSIONS.READ_CALCULATIONS,
      inputSchema: { riseMeters: { type: 'number', required: true }, runMeters: { type: 'number', required: true } },
      handler: async ({ riseMeters, runMeters }) => calculateRamp({ mode: 'rise_run_direct', rise: riseMeters, run: runMeters })
    },
    calculateSlope: {
      description: 'General slope analysis: rise + run → percent/ratio/angle (signed).',
      permission: AI_PERMISSIONS.READ_CALCULATIONS,
      inputSchema: { riseMeters: { type: 'number', required: true }, runMeters: { type: 'number', required: true } },
      handler: async ({ riseMeters, runMeters }) => analyzeSlope({ mode: 'rise_run', rise: riseMeters, run: runMeters })
    },
    checkFurnitureFit: {
      description: 'Does a furniture piece fit in a room? Returns fits/partial/no-fit with margins.',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: { furnitureId: { type: 'string', required: true }, roomId: { type: 'string', required: true } },
      handler: async ({ furnitureId, roomId }) => {
        const f = getPlanEntities().find(e => e.id === furnitureId && e.kind === 'furniture');
        const room = findRoom(roomId);
        if (!f || !room) return { error: 'Furniture or room not found' };
        return checkFurnitureFit(f, room);
      }
    },
    checkClearance: {
      description: 'Clearance-envelope check for furniture in a room (user-configured meters).',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: { furnitureId: { type: 'string', required: true }, roomId: { type: 'string', required: true }, clearanceMeters: { type: 'number', required: true } },
      handler: async ({ furnitureId, roomId, clearanceMeters }) => {
        const f = getPlanEntities().find(e => e.id === furnitureId && e.kind === 'furniture');
        const room = findRoom(roomId);
        if (!f || !room) return { error: 'Furniture or room not found' };
        return checkClearance(f, room, clearanceMeters, 'User Configured');
      }
    },
    checkOverlaps: {
      description: 'All overlap conflicts in the current plan (furniture/furniture, furniture/wall, outside-room).',
      permission: AI_PERMISSIONS.READ_GEOMETRY,
      inputSchema: {},
      handler: async () => checkOverlaps(
        getPlanEntities().filter(e => e.kind === 'furniture'),
        getPlanEntities().filter(e => e.kind === 'room'),
        getPlanEntities().filter(e => e.kind === 'wall')
      )
    },

    // ---- PROPOSE tools (return proposals; the user applies them) ----
    proposeNote: {
      description: 'Propose a project note. Returns a proposal — the user must accept it.',
      permission: AI_PERMISSIONS.PROPOSE_NOTE,
      inputSchema: { title: { type: 'string', required: true }, body: { type: 'string', required: true } },
      handler: async ({ title, body }) => ({
        proposalType: 'add-note',
        proposal: { id: null, title, body, createdAt: null, createdBy: 'ai' },
        requiresApproval: true,
        note: 'Preview and accept in the UI — the AI never writes directly.'
      })
    },
    proposeFurnitureMove: {
      description: 'Propose moving a furniture piece by (dx, dy) meters. Returns a previewable proposal.',
      permission: AI_PERMISSIONS.PROPOSE_CHANGE,
      inputSchema: { furnitureId: { type: 'string', required: true }, dx: { type: 'number', required: true }, dy: { type: 'number', required: true }, reason: { type: 'string' } },
      handler: async ({ furnitureId, dx, dy, reason }) => {
        const f = getPlanEntities().find(e => e.id === furnitureId && e.kind === 'furniture');
        if (!f) return { error: `Furniture "${furnitureId}" not found` };
        return {
          proposalType: 'move-furniture',
          proposal: {
            furnitureId, entityName: f.name,
            from: { x: f.x, y: f.y },
            to: { x: f.x + dx, y: f.y + dy },
            reason: reason || 'No reason given'
          },
          requiresApproval: true,
          note: 'Preview shows from/to; applying recalculates checks and keeps undo.'
        };
      }
    }
  };
}
