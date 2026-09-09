/**
 * Architecture Helping Hand — Project Brief, Requirements & Design Intent
 *
 * The brief captures WHAT the building must do; the model captures what it
 * IS; the requirements engine compares the two deterministically.
 *
 *   - BRIEF: building type, site, area targets, room requirements, floors,
 *     circulation, accessibility, orientation, special constraints, user rules
 *   - REQUIREMENTS: typed records { id, name, type, target, unit, scope,
 *     status, evidence } evaluated against actual geometry — PASS / FAIL /
 *     NEEDS INPUT / NOT APPLICABLE, never invented
 *   - ADJACENCY: required / preferred / avoid relationships between spaces
 *   - DESIGN INTENT: decisions with rationale, alternatives considered and
 *     the rejected ones (feeds the existing project.decisions container)
 *
 * All pure and deterministic: evaluation reads entities, never mutates them.
 */

import { roomArea } from './entities.js';

// ---------------------------------------------------------------------------
// Project brief
// ---------------------------------------------------------------------------

/** Creates an empty project brief with sensible defaults. */
export function createProjectBrief(overrides = {}) {
  return {
    buildingType: '',
    site: { location: '', notes: '', areaM2: null, orientation: '' },
    floors: null,
    areaTargets: { grossM2: null, netM2: null },
    circulation: { strategy: '', targetPctOfNet: null },
    accessibility: { target: '', notes: '' },
    orientation: { primary: '', notes: '' },
    specialConstraints: [],
    userRules: [],
    ...structuredCloneCompat(overrides)
  };
}

// structuredClone is unavailable in some embedded runtimes; a local deep copy
// keeps this module dependency-free.
function structuredCloneCompat(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

/** Validates a brief field set; returns {ok, errors[]} without throwing. */
export function validateBrief(brief) {
  const errors = [];
  if (!brief || typeof brief !== 'object') {
    return { ok: false, errors: ['Brief must be an object'] };
  }
  if (brief.buildingType !== undefined && typeof brief.buildingType !== 'string') {
    errors.push('buildingType must be a string');
  }
  if (brief.floors !== undefined && brief.floors !== null &&
      (!Number.isInteger(brief.floors) || brief.floors < 1 || brief.floors > 200)) {
    errors.push('floors must be an integer between 1 and 200');
  }
  if (brief.areaTargets) {
    for (const key of ['grossM2', 'netM2']) {
      const v = brief.areaTargets[key];
      if (v !== undefined && v !== null && (typeof v !== 'number' || v <= 0)) {
        errors.push(`areaTargets.${key} must be a positive number`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Room requirements
// ---------------------------------------------------------------------------

/**
 * Creates a room requirement: "N rooms of kind X, each ≥ target area".
 * Example: createRoomRequirement('Bedroom', { count: 3, minAreaM2: 14 })
 */
export function createRoomRequirement(name, { count = 1, minAreaM2 = null, minDimensions = null, notes = '' } = {}) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Room requirement needs a room name (e.g. "Bedroom")');
  }
  if (minAreaM2 !== null && !(minAreaM2 > 0)) {
    throw new Error('minAreaM2 must be a positive number when provided');
  }
  if (minDimensions !== null &&
      (typeof minDimensions !== 'object' || !(minDimensions.width > 0) || !(minDimensions.depth > 0))) {
    throw new Error('minDimensions must be { width > 0, depth > 0 } when provided');
  }
  return {
    id: `req-room-${String(name).toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
    kind: 'room',
    name: name.trim(),
    count,
    minAreaM2,
    minDimensions,
    notes
  };
}

// ---------------------------------------------------------------------------
// Generic requirements (target / min / max against a scope metric)
// ---------------------------------------------------------------------------

export const REQUIREMENT_TYPES = Object.freeze({
  MIN: 'min',     // scope metric must be >= target
  MAX: 'max',     // scope metric must be <= target
  EQUAL: 'equal', // scope metric must == target (within tolerance)
  PRESENCE: 'presence' // scope must exist
});

export const REQUIREMENT_SCOPES = Object.freeze([
  'gross_area', 'net_area', 'room_count', 'room_area', 'corridor_width',
  'floor_count', 'door_clearance', 'stair_rise', 'stair_tread', 'custom'
]);

export function createRequirement({ name, type, scope, target, unit = '', tolerance = 1e-9 } = {}) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Requirement needs a name');
  }
  if (!REQUIREMENT_TYPES[type]) {
    throw new Error(`Unknown requirement type "${type}" — allowed: ${Object.values(REQUIREMENT_TYPES).join(', ')}`);
  }
  if (!REQUIREMENT_SCOPES.includes(scope) && !scope.startsWith('custom.')) {
    throw new Error(`Unknown requirement scope "${scope}" — allowed: ${REQUIREMENT_SCOPES.join(', ')}, or "custom.*"`);
  }
  return {
    id: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'metric',
    name: name.trim(),
    type,
    scope,
    target,
    unit,
    tolerance
  };
}

// ---------------------------------------------------------------------------
// Evaluation — deterministic comparison against the actual model
// ---------------------------------------------------------------------------

/** Area of a room entity (m²). Honors polygonal boundaries via the
 *  canonical factory (entities.roomArea); width×depth is the fallback. */
function roomAreaOf(room) {
  const a = roomArea(room);
  return Number.isFinite(a) && a > 0 ? a : (room.width || 0) * (room.depth || 0);
}

/** Sum of all room areas = net internal area. */
function netInternalArea(entities) {
  return entities.filter(e => e.kind === 'room')
    .reduce((sum, r) => sum + roomAreaOf(r), 0);
}

/** Extracts the metric for a requirement scope. Returns {value, detail} or null. */
export function scopeMetric(scope, entities, brief) {
  const rooms = entities.filter(e => e.kind === 'room');
  switch (scope) {
    case 'gross_area': return { value: netInternalArea(entities), detail: `${rooms.length} rooms` };
    case 'net_area': return { value: netInternalArea(entities), detail: `${rooms.length} rooms` };
    case 'room_count': return { value: rooms.length, detail: rooms.map(r => r.name).join(', ') };
    case 'floor_count': return { value: brief?.floors ?? null, detail: 'from brief' };
    case 'room_area': {
      // Smallest room area: the binding constraint when requiring a minimum
      // usable area per room; largest when requiring no oversized rooms is a
      // MAX check the caller composes. Detail exposes per-room areas.
      const areas = rooms.map(r => roomAreaOf(r));
      if (areas.length === 0) return { value: null, detail: 'no rooms in model' };
      return {
        value: Math.min(...areas),
        detail: rooms.map(r => `${r.name}: ${roomAreaOf(r).toFixed(1)}m²`).join(', ')
      };
    }
    case 'corridor_width': {
      const corridors = rooms.filter(r => /corridor|hall/i.test(String(r.name || '')));
      if (corridors.length === 0) return { value: null, detail: 'no corridor rooms' };
      return {
        value: Math.min(...corridors.map(r => Math.min(r.width || 0, r.depth || 0))),
        detail: `${corridors.length} corridor room(s)`
      };
    }
    default:
      if (scope.startsWith('custom.')) return { value: null, detail: scope };
      return null;
  }
}

/**
 * Evaluates a room requirement against the model: matches rooms by name
 * (case-insensitive substring) and checks count / min area / min dimensions.
 */
export function evaluateRoomRequirement(req, entities) {
  const matched = entities.filter(e => e.kind === 'room' &&
    String(e.name || '').toLowerCase().includes(req.name.toLowerCase()));
  const found = matched.length;
  const evidence = {
    required: { name: req.name, count: req.count, minAreaM2: req.minAreaM2, minDimensions: req.minDimensions },
    matched: matched.map(r => ({ id: r.id, name: r.name, areaM2: +roomAreaOf(r).toFixed(2), width: r.width, depth: r.depth }))
  };

  if (found === 0) {
    return { status: 'NEEDS_INPUT', message: `No room matching "${req.name}" exists yet.`, evidence };
  }

  const problems = [];
  if (found < req.count) {
    problems.push(`only ${found} of ${req.count} required "${req.name}" rooms present`);
  }
  for (const r of matched) {
    const area = roomAreaOf(r);
    if (req.minAreaM2 && area < req.minAreaM2 - 1e-9) {
      problems.push(`"${r.name}" is ${area.toFixed(1)} m², below the ${req.minAreaM2} m² minimum`);
    }
    if (req.minDimensions) {
      const wOk = r.width >= req.minDimensions.width - 1e-9;
      const dOk = r.depth >= req.minDimensions.depth - 1e-9;
      if (!wOk || !dOk) {
        problems.push(`"${r.name}" is ${r.width}×${r.depth} m, below the ${req.minDimensions.width}×${req.minDimensions.depth} m minimum`);
      }
    }
  }

  if (problems.length > 0) {
    return { status: 'FAIL', message: `Room requirement not met: ${problems.join('; ')}.`, evidence };
  }
  return { status: 'PASS', message: `Room requirement met: ${found} × "${req.name}" present and within limits.`, evidence };
}

/**
 * Evaluates a generic metric requirement. Returns
 *   { status: 'PASS'|'FAIL'|'NOT_APPLICABLE'|'NEEDS_INPUT', evidence }
 */
export function evaluateRequirement(req, entities, brief) {
  const metric = scopeMetric(req.scope, entities, brief);
  if (metric === null || metric.value === null || metric.value === undefined) {
    return { status: 'NOT_APPLICABLE', evidence: { scope: req.scope, reason: 'metric unavailable for this model' } };
  }
  const evidence = { scope: req.scope, actual: +Number(metric.value).toFixed(3), target: req.target, unit: req.unit, detail: metric.detail };

  switch (req.type) {
    case 'MIN': {
      if (!Number.isFinite(req.target)) return { status: 'NEEDS_INPUT', evidence: { ...evidence, reason: 'target not set' } };
      return { status: metric.value >= req.target - (req.tolerance ?? 1e-9) ? 'PASS' : 'FAIL', evidence };
    }
    case 'MAX': {
      if (!Number.isFinite(req.target)) return { status: 'NEEDS_INPUT', evidence: { ...evidence, reason: 'target not set' } };
      return { status: metric.value <= req.target + (req.tolerance ?? 1e-9) ? 'PASS' : 'FAIL', evidence };
    }
    case 'EQUAL': {
      if (!Number.isFinite(req.target)) return { status: 'NEEDS_INPUT', evidence: { ...evidence, reason: 'target not set' } };
      return { status: Math.abs(metric.value - req.target) <= (req.tolerance ?? 1e-9) ? 'PASS' : 'FAIL', evidence };
    }
    case 'PRESENCE':
      return { status: metric.value > 0 ? 'PASS' : 'FAIL', evidence };
    default:
      return { status: 'UNVERIFIED', evidence: { ...evidence, reason: `unknown type ${req.type}` } };
  }
}

// ---------------------------------------------------------------------------
// Adjacency
// ---------------------------------------------------------------------------

export const ADJACENCY_LEVELS = Object.freeze({ REQUIRED: 'required', PREFERRED: 'preferred', AVOID: 'avoid' });

/**
 * Creates an adjacency expectation between two room names.
 * Example: createAdjacency('Kitchen', 'Dining', ADJACENCY_LEVELS.PREFERRED, 'HIGH')
 */
export function createAdjacency(roomA, roomB, level = ADJACENCY_LEVELS.PREFERRED, strength = 'MEDIUM', notes = '') {
  if (!roomA?.trim() || !roomB?.trim()) throw new Error('Adjacency needs two room names');
  const levelMatch = Object.values(ADJACENCY_LEVELS).find(l => l.toLowerCase() === String(level).toLowerCase());
  if (!levelMatch) {
    throw new Error(`Adjacency level must be one of: ${Object.values(ADJACENCY_LEVELS).join(', ')}`);
  }
  level = levelMatch;
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(strength)) {
    throw new Error('Strength must be LOW, MEDIUM or HIGH');
  }
  return {
    id: `adj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    roomA: roomA.trim(), roomB: roomB.trim(), level, strength, notes
  };
}

/** Rooms whose names contain the given name (case-insensitive). */
function findRoomsByName(entities, name) {
  const n = name.toLowerCase();
  return entities.filter(e => e.kind === 'room' && String(e.name || '').toLowerCase().includes(n));
}

/** Rooms touch (share a boundary edge within tolerance) or come within `gap`. */
function roomsAdjacentOrNear(a, b, gap = 0.5) {
  const gapX = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
  const gapY = Math.max(a.y, b.y) - Math.min(a.y + a.depth, b.y + b.depth);
  return gapX <= gap && gapY <= gap;
}

/**
 * Evaluates one adjacency expectation. FAIL only for REQUIRED adjacency
 * that is missing; AVOID fails when the rooms DO touch; PREFERRED missing
 * is a WARNING-grade note (returned in status for the panel to style).
 */
export function evaluateAdjacency(adj, entities) {
  const a = findRoomsByName(entities, adj.roomA);
  const b = findRoomsByName(entities, adj.roomB);
  const evidence = {
    roomA: adj.roomA, roomB: adj.roomB, level: adj.level, strength: adj.strength,
    matchedA: a.map(r => r.name), matchedB: b.map(r => r.name)
  };
  if (a.length === 0 || b.length === 0) {
    return { status: 'NEEDS_INPUT', message: `Room "${a.length === 0 ? adj.roomA : adj.roomB}" not present yet.`, evidence };
  }
  let touching = false;
  for (const ra of a) {
    for (const rb of b) {
      if (ra.id === rb.id) continue;
      if (roomsAdjacentOrNear(ra, rb, 0.1)) { touching = true; break; }
    }
    if (touching) break;
  }
  if (adj.level === ADJACENCY_LEVELS.AVOID) {
    return touching
      ? { status: 'FAIL', message: `"${adj.roomA}" and "${adj.roomB}" should NOT be adjacent but they touch.`, evidence: { ...evidence, touching } }
      : { status: 'PASS', message: `"${adj.roomA}" and "${adj.roomB}" are separated as required.`, evidence: { ...evidence, touching } };
  }
  return touching
    ? { status: 'PASS', message: `"${adj.roomA}" and "${adj.roomB}" are adjacent (${adj.level}).`, evidence: { ...evidence, touching } }
    : { status: adj.level === ADJACENCY_LEVELS.REQUIRED ? 'FAIL' : 'WARNING',
        message: `"${adj.roomA}" and "${adj.roomB}" are not adjacent (required).`, evidence: { ...evidence, touching } };
}

// ---------------------------------------------------------------------------
// Evaluation of a whole brief
// ---------------------------------------------------------------------------

/**
 * Evaluates brief + requirements + adjacency against the model.
 * @returns {{ results: Array, counts: {PASS,FAIL,WARNING,NEEDS_INPUT,NOT_APPLICABLE,UNVERIFIED}, ranAt }}
 */
export function evaluateBriefCompliance(brief, entities) {
  const results = [];
  const reqs = Array.isArray(brief?.roomRequirements) ? brief.roomRequirements : [];
  for (const req of reqs) {
    const r = evaluateRoomRequirement(req, entities);
    results.push({ kind: 'room', name: req.name, ...r });
  }
  const metrics = Array.isArray(brief?.requirements) ? brief.requirements : [];
  for (const req of metrics) {
    const r = evaluateRequirement(req, entities, brief);
    results.push({ kind: 'metric', name: req.name, ...r });
  }
  const adjs = Array.isArray(brief?.adjacencies) ? brief.adjacencies : [];
  for (const adj of adjs) {
    const r = evaluateAdjacency(adj, entities);
    results.push({ kind: 'adjacency', name: `${adj.roomA} ↔ ${adj.roomB}`, ...r });
  }
  const counts = { PASS: 0, FAIL: 0, WARNING: 0, NEEDS_INPUT: 0, NOT_APPLICABLE: 0, UNVERIFIED: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  return { results, counts, ranAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Design intent
// ---------------------------------------------------------------------------

/**
 * Creates a design-intent record: a decision WITH its reasoning trail —
 * alternatives considered and the rejected ones. Feeds project.decisions.
 */
export function createDesignIntent({ name, rationale, alternatives = [], rejected = [], createdBy = 'user' } = {}) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Design intent needs a name');
  }
  if (typeof rationale !== 'string' || !rationale.trim()) {
    throw new Error('Design intent needs a rationale (the "why")');
  }
  return {
    id: `intent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    kind: 'intent',
    name: name.trim(),
    rationale: rationale.trim(),
    alternatives: alternatives.map(a => ({ option: a.option || String(a), whyNotChosen: a.whyNotChosen || '' })),
    rejected: rejected.map(r => ({ option: r.option || String(r), whyRejected: r.whyRejected || '' })),
    createdBy,
    createdAt: new Date().toISOString()
  };
}
