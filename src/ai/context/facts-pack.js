/**
 * Architecture Helping Hand - AI Context Builder (Facts Pack)
 * Phase 9.12: a compact DETERMINISTIC summary of project state for the AI.
 * The AI reasons over these facts; it must not recalculate what the core
 * already knows. Pure: reads project + plan entities, emits text + data.
 */

import { roomArea, roomPerimeter } from '../../core/entities.js';
import { checkOverlaps } from '../../core/space-planning.js';

/**
 * Builds the facts pack.
 *
 * @param {Object} project - real project document (from the store)
 * @param {Array} planEntities - real plan entities (rooms/walls/furniture)
 * @param {Object} [options] - { includeMeasurements, includeDecisions, maxFacts }
 * @returns {{ text: string, data: Object, factChecks: Array }}
 */
export function buildFactsPack(project, planEntities, options = {}) {
  const p = project || {};
  // Defensive normalization (P14): plan entities come from live canvas state
  // or from imported project documents. Imported data is validated only at the
  // envelope level, so individual entries may be null/garbage — skip them
  // instead of crashing the AI context build.
  const entities = (Array.isArray(planEntities) ? planEntities : [])
    .filter(e => e && typeof e === 'object' && typeof e.kind === 'string');
  const rooms = entities.filter(e => e.kind === 'room');
  const walls = entities.filter(e => e.kind === 'wall');
  const furniture = entities.filter(e => e.kind === 'furniture');
  const openings = entities.filter(e => e.kind === 'door' || e.kind === 'window');

  const isFiniteNumber = v => typeof v === 'number' && isFinite(v);
  const roomHasGeometry = r => isFiniteNumber(r.width) && isFiniteNumber(r.depth);
  const round2 = v => (isFiniteNumber(v) ? Number(v.toFixed(2)) : null);

  // Only rooms with calculable geometry feed numeric claim validation —
  // a null-valued fact would be uncheckable noise.
  const roomFacts = rooms
    .filter(roomHasGeometry)
    .map(r => ({
      label: `Room "${r.name}" area`,
      value: Number(roomArea(r).toFixed(2)),
      unit: 'm2',
      id: r.id
    }));

  const overlaps = checkOverlaps(furniture, rooms, walls);

  const data = {
    project: {
      id: p.id || null,
      name: (p.metadata && typeof p.metadata === 'object' ? p.metadata.name : null) || 'Untitled Project',
      description: (p.metadata && p.metadata.description) || (p.site && p.site.description) || ''
    },
    site: p.site ? { location: p.site.location || '', areaM2: p.site.areaM2 || null } : null,
    rooms: rooms.map(r => ({
      id: r.id, name: r.name,
      widthMeters: round2(r.width), depthMeters: round2(r.depth),
      areaM2: round2(roomArea(r)),
      perimeterM2: round2(roomPerimeter(r))
    })),
    walls: walls.map(w => ({ id: w.id, name: w.name })),
    openings: openings.map(o => ({ kind: o.kind, id: o.id, name: o.name, widthMeters: round2(o.width) })),
    furniture: furniture.map(f => ({ id: f.id, name: f.name, x: round2(f.x), y: round2(f.y), widthMeters: round2(f.width), depthMeters: round2(f.depth) })),
    dimensions: Array.isArray(p.dimensions) ? p.dimensions.length : 0,
    measurements: (Array.isArray(p.measurements) ? p.measurements : []).map(m => ({ label: m?.label, value: m?.value, unit: m?.unit, status: m?.status })),
    decisions: (Array.isArray(p.decisions) ? p.decisions : []).map(d => ({ kind: d?.kind, name: d?.name, createdAt: d?.createdAt })),
    conflicts: overlaps.conflicts,
    currentOption: (Array.isArray(p.snapshots) && p.snapshots.length) ? `${p.snapshots.length} snapshots recorded` : 'no snapshots'
  };

  const lines = [];
  lines.push(`PROJECT: ${data.project.name}`);
  if (data.project.description) lines.push(`INTENT: ${data.project.description}`);
  if (data.site && (data.site.location || data.site.areaM2)) {
    lines.push(`SITE: ${data.site.location || '—'}${data.site.areaM2 ? ` (${data.site.areaM2} m²)` : ''}`);
  }
  lines.push(`ROOMS (${data.rooms.length}):`);
  for (const r of data.rooms) {
    lines.push(`  ${r.name}: ${r.widthMeters ?? '?'} × ${r.depthMeters ?? '?'} m = ${r.areaM2 ?? '?'} m²`);
  }
  lines.push(`WALLS: ${data.walls.length} · OPENINGS: ${data.openings.length} · FURNITURE: ${data.furniture.length}`);
  if (data.conflicts.length > 0) {
    lines.push(`CONFLICTS (${data.conflicts.length}):`);
    for (const c of data.conflicts.slice(0, 5)) lines.push(`  ${c.evidence}`);
  }
  if (options.includeDecisions !== false && data.decisions.length > 0) {
    lines.push(`DECISIONS: ${data.decisions.slice(-3).map(d => d.name).join(', ')}`);
  }
  if (options.includeMeasurements !== false && data.measurements.length > 0) {
    lines.push(`MEASUREMENTS: ${data.measurements.map(m => `${m.label}=${m.value}${m.unit}(${m.status})`).join('; ')}`);
  }

  return {
    text: lines.join('\n'),
    data,
    factChecks: roomFacts // deterministic values for numeric claim validation
  };
}
