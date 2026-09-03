/**
 * Architecture Helping Hand - Project-Aware AI Context (Phase 15, M9)
 * Bridges the live application state (project store + plan entities) into
 * the job router's facts-pack callback, with SCOPING so a bedroom critique
 * does not ship the kitchen's furniture.
 *
 * Budgeting contract:
 *  - estimateTokens lives in job-router; here we trim entity lists by
 *    relevance (named scope match first, then proximity, then cap counts)
 *  - trimming is DISCLOSED: the returned summary records what was dropped
 *    so the UI can show "Context reduced to fit selected model."
 *  - pure: reads data, emits text — no DOM, no storage
 */

import { roomArea, roomPerimeter } from '../../core/entities.js';
import { checkOverlaps } from '../../core/space-planning.js';

/** Caps for large projects — tuned to keep prompts modest by default. */
const SCOPE_LIMITS = Object.freeze({
  rooms: 24,
  furniturePerRoom: 12,
  furnitureGlobal: 40,
  measurements: 20,
  decisions: 6,
  notes: 4
});

/**
 * Extracts the relevant scope for a job.
 *
 * @param {Object} args
 * @param {Object} args.project - project document (store)
 * @param {Array} args.planEntities - live plan entities
 * @param {Object} [args.request] - { scopeHint: string (room/keyword name), jobId }
 * @returns {Object} scoped view { project, rooms, walls, openings, furniture, measurements, decisions, notes, site, conflicts, dropped: [] }
 */
export function selectProjectScope({ project, planEntities, request = {} }) {
  const p = project && typeof project === 'object' ? project : {};
  const dropped = [];
  const entities = (Array.isArray(planEntities) ? planEntities : [])
    .filter(e => e && typeof e === 'object' && typeof e.kind === 'string');

  const allRooms = entities.filter(e => e.kind === 'room');
  const walls = entities.filter(e => e.kind === 'wall').slice(0, SCOPE_LIMITS.rooms * 2);
  const openings = entities.filter(e => e.kind === 'door' || e.kind === 'window').slice(0, 30);
  const allFurniture = entities.filter(e => e.kind === 'furniture');

  // Scope hint: keep rooms whose name matches any word of the hint; a
  // non-matching hint keeps everything (never narrow to nothing).
  let rooms = allRooms;
  const hint = typeof request.scopeHint === 'string' ? request.scopeHint.trim().toLowerCase() : '';
  if (hint) {
    const words = hint.split(/[^a-z0-9äöüß]+/i).filter(w => w.length >= 4);
    const matches = allRooms.filter(r => {
      const roomName = String(r.name || '').toLowerCase();
      return words.some(w => roomName.includes(w)) || roomName.includes(hint);
    });
    if (matches.length > 0 && matches.length < allRooms.length) {
      rooms = matches;
      // Furniture within or adjacent to the matched rooms only.
      const roomRects = matches.map(r => ({ x: r.x, y: r.y, width: r.width, depth: r.depth, name: r.name }));
      const inScope = [];
      for (const f of allFurniture) {
        const cx = (typeof f.x === 'number' ? f.x : 0) + (typeof f.width === 'number' ? f.width : 0) / 2;
        const cy = (typeof f.y === 'number' ? f.y : 0) + (typeof f.depth === 'number' ? f.depth : 0) / 2;
        const hit = roomRects.some(r =>
          cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.depth);
        if (hit) inScope.push(f);
      }
      if (allFurniture.length > inScope.length) {
        dropped.push(`${allFurniture.length - inScope.length} furniture items outside ${matches.map(r => r.name).join('/')}`);
      }
      allFurniture.length = 0;
      allFurniture.push(...inScope);
    }
  }

  if (rooms.length > SCOPE_LIMITS.rooms) {
    dropped.push(`${rooms.length - SCOPE_LIMITS.rooms} rooms over the ${SCOPE_LIMITS.rooms}-room cap`);
    rooms = rooms.slice(0, SCOPE_LIMITS.rooms);
  }

  // Furniture cap per room (keep the first N by area, larger first — usually
  // the load-bearing pieces).
  const cappedFurniture = allFurniture
    .slice()
    .sort((a, b) => ((b.width || 0) * (b.depth || 0)) - ((a.width || 0) * (a.depth || 0)));
  if (cappedFurniture.length > SCOPE_LIMITS.furnitureGlobal) {
    dropped.push(`${cappedFurniture.length - SCOPE_LIMITS.furnitureGlobal} furniture items over the global cap`);
    cappedFurniture.length = SCOPE_LIMITS.furnitureGlobal;
  }

  const conflicts = checkOverlaps(cappedFurniture, rooms, walls);

  const measurements = ((Array.isArray(p.measurements) ? p.measurements : []) || [])
    .filter(m => m && typeof m === 'object')
    .slice(0, SCOPE_LIMITS.measurements);
  const decisions = ((Array.isArray(p.decisions) ? p.decisions : []) || [])
    .filter(d => d && typeof d === 'object')
    .slice(-SCOPE_LIMITS.decisions);
  const notes = ((Array.isArray(p.notes) ? p.notes : []) || [])
    .filter(n => n && typeof n === 'object')
    .slice(-SCOPE_LIMITS.notes);

  return {
    project: p,
    site: p.site || null,
    rooms,
    walls,
    openings,
    furniture: cappedFurniture,
    measurements,
    decisions,
    notes,
    conflicts,
    dropped
  };
}

/**
 * Builds the facts-pack shape the job router expects from a scoped view.
 * Deterministic text + data + numeric fact checks (room areas).
 */
export function buildScopedFactsPack({ project, planEntities, request = {} }) {
  const scope = selectProjectScope({ project, planEntities, request });
  const isNum = v => typeof v === 'number' && isFinite(v);
  const round2 = v => (isNum(v) ? Number(v.toFixed(2)) : null);
  const meta = scope.project.metadata && typeof scope.project.metadata === 'object' ? scope.project.metadata : {};

  const roomFacts = scope.rooms
    .filter(r => isNum(r.width) && isNum(r.depth) && r.width > 0 && r.depth > 0)
    .map(r => ({
      label: `Room "${r.name}" area`,
      value: Number(roomArea(r).toFixed(2)),
      unit: 'm2',
      id: r.id
    }));

  const data = {
    project: {
      id: scope.project.id || null,
      name: meta.name || 'Untitled Project',
      description: meta.description || ''
    },
    site: scope.site ? { location: scope.site.location || '', areaM2: scope.site.areaM2 || null } : null,
    rooms: scope.rooms.map(r => ({
      id: r.id, name: r.name,
      widthMeters: round2(r.width), depthMeters: round2(r.depth),
      areaM2: round2(roomArea(r)), perimeterM2: round2(roomPerimeter(r))
    })),
    openings: scope.openings.map(o => ({ kind: o.kind, name: o.name, widthMeters: round2(o.width) })),
    furniture: scope.furniture.map(f => ({
      id: f.id, name: f.name, roomId: f.roomId || null,
      x: round2(f.x), y: round2(f.y),
      widthMeters: round2(f.width), depthMeters: round2(f.depth)
    })),
    measurements: scope.measurements.map(m => ({ label: m.label, value: m.value, unit: m.unit, status: m.status })),
    decisions: scope.decisions.map(d => ({ kind: d.kind, name: d.name })),
    conflicts: scope.conflicts,
    dropped: scope.dropped
  };

  const lines = [];
  lines.push(`PROJECT: ${data.project.name}`);
  if (data.project.description) lines.push(`INTENT: ${data.project.description}`);
  if (data.site && (data.site.location || data.site.areaM2)) {
    lines.push(`SITE: ${data.site.location || '—'}${data.site.areaM2 ? ` (${data.site.areaM2} m²)` : ''}`);
  }
  lines.push(`ROOMS (${data.rooms.length}):`);
  for (const r of data.rooms) {
    lines.push(`  ${r.name}: ${r.widthMeters ?? '?'} × ${r.depthMeters ?? '?'} m = ${r.areaM2 ?? '?'} m² (perimeter ${r.perimeterM2 ?? '?'} m)`);
  }
  lines.push(`WALLS: ${scope.walls.length} · OPENINGS: ${data.openings.length} · FURNITURE: ${data.furniture.length}`);
  if (data.conflicts.length > 0) {
    lines.push(`CONFLICTS (${data.conflicts.length}):`);
    for (const c of data.conflicts.slice(0, 6)) lines.push(`  ${c.evidence}`);
  }
  if (data.decisions.length > 0) {
    lines.push(`DECISIONS: ${data.decisions.map(d => d.name).join(', ')}`);
  }
  if (data.measurements.length > 0) {
    lines.push(`MEASUREMENTS: ${data.measurements.map(m => `${m.label}=${m.value}${m.unit}(${m.status})`).join('; ')}`);
  }
  for (const n of scope.notes.slice(0, SCOPE_LIMITS.notes)) {
    const title = typeof n?.title === 'string' ? n.title : 'note';
    const body = typeof n?.body === 'string' ? n.body.slice(0, 160) : '';
    lines.push(`NOTE: ${title}${body ? ` — ${body}` : ''}`);
  }
  if (scope.dropped.length > 0) {
    lines.push(`CONTEXT REDUCED: ${scope.dropped.join('; ')}`);
  }

  return {
    text: lines.join('\n'),
    data,
    factChecks: roomFacts,
    dropped: scope.dropped
  };
}
