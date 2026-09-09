/**
 * Architecture Helping Hand — Parametric Object Descriptors
 *
 * Typed parameters for architectural objects. Each parameter declares:
 *   name, label, unit, kind ('length'|'angle'|'enum'|'area'|'count'),
 *   get(entity), apply(entity, value), and optional min/max/derived flag.
 *
 * `apply` recomputes the FULL dependent chain (geometry + derived scalars +
 * compliance flags) so derived truth is never stale and the canvas, which
 * derives all rendering from these fields, regenerates automatically:
 *
 *   stair:   risers → riserHeight, run/depth, tread, pitch, Blondel, compliance
 *   door:    width → opening spans, jambs, swing radius (host wall punching
 *            is derived at render time via wallOpenings/punchWallSpans)
 *   window:  sill/head → height relationship
 *   room:    targetArea → deterministic depth growth (width preserved),
 *            polygon boundary rescaled consistently
 *
 * These descriptors are the single source of truth for the inspector UI,
 * the constraint system, and AI context.
 */

export const PARAMETRIC_OBJECTS = Object.freeze({
  door: Object.freeze({
    label: 'Door',
    parameters: Object.freeze([
      { name: 'width', label: 'Width', unit: 'm', kind: 'length', min: 0.6, max: 2.5,
        get: e => e.width,
        apply: (e, v) => {
          e.width = v;
          recomputeDoor(e);
        } },
      { name: 'height', label: 'Height', unit: 'm', kind: 'length', min: 1.8, max: 2.7,
        get: e => e.height ?? 2.1,
        apply: (e, v) => { e.height = v; } },
      { name: 'swing', label: 'Swing', unit: '', kind: 'enum', values: ['left', 'right'],
        get: e => e.swing || 'left',
        apply: (e, v) => { e.swing = v === 'right' ? 'right' : 'left'; } },
      { name: 'flipSide', label: 'Hinge', unit: '', kind: 'enum', values: ['near', 'far'],
        get: e => e.flipSide ? 'far' : 'near',
        apply: (e, v) => { e.flipSide = v === 'far'; } },
      { name: 'wallId', label: 'Host wall', unit: '', kind: 'reference',
        get: e => e.wallId || null,
        apply: (e, v) => { e.wallId = v; } }
    ])
  }),
  window: Object.freeze({
    label: 'Window',
    parameters: Object.freeze([
      { name: 'width', label: 'Width', unit: 'm', kind: 'length', min: 0.4, max: 4,
        get: e => e.width,
        apply: (e, v) => {
          e.width = v;
          recomputeWindow(e);
        } },
      { name: 'sill', label: 'Sill height', unit: 'm', kind: 'length', min: 0, max: 2,
        get: e => e.sill ?? 0.9,
        apply: (e, v) => {
          e.sill = v;
          recomputeWindow(e);
        } },
      { name: 'head', label: 'Head height', unit: 'm', kind: 'length', min: 0.5, max: 4,
        get: e => (e.sill ?? 0.9) + (e.height ?? 1.2),
        apply: (e, v) => {
          e.height = Math.max(0.1, v - (e.sill ?? 0.9));
          recomputeWindow(e);
        } },
      { name: 'wallId', label: 'Host wall', unit: '', kind: 'reference',
        get: e => e.wallId || null,
        apply: (e, v) => { e.wallId = v; } }
    ])
  }),
  stair: Object.freeze({
    label: 'Stair',
    parameters: Object.freeze([
      { name: 'risers', label: 'Riser count', unit: '', kind: 'count', min: 3, max: 50,
        get: e => e.risers ?? 16,
        apply: (e, v) => {
          e.risers = Math.round(v);
          recomputeStair(e);
        } },
      { name: 'riserHeight', label: 'Riser height', unit: 'm', kind: 'length', min: 0.1, max: 0.25,
        get: e => e.riserHeight ?? 0.175,
        apply: (e, v) => {
          // rise is the driver: new riser count = rise / riser height
          if (typeof e.rise === 'number' && e.rise > 0) {
            e.risers = Math.max(3, Math.round(e.rise / v));
          }
          recomputeStair(e);
        } },
      { name: 'tread', label: 'Tread depth', unit: 'm', kind: 'length', min: 0.2, max: 0.45,
        get: e => e.tread ?? 0.28,
        apply: (e, v) => {
          e.tread = v;
          recomputeStair(e);
        } },
      { name: 'width', label: 'Flight width', unit: 'm', kind: 'length', min: 0.6, max: 4,
        get: e => e.width ?? 1.1,
        apply: (e, v) => { e.width = v; } },
      { name: 'blondel', label: 'Blondel 2R+T', unit: 'm', kind: 'length', derived: true,
        get: e => e.blondel ?? (2 * (e.riserHeight ?? 0.175) + (e.tread ?? 0.28)),
        apply: () => { throw new Error('Blondel 2R+T is derived — set riser height and tread instead.'); } },
      { name: 'run', label: 'Total run', unit: 'm', kind: 'length', derived: true,
        get: e => e.run ?? ((e.risers ?? 16) - 1) * (e.tread ?? 0.28),
        apply: () => { throw new Error('Total run is derived — set tread depth or riser count instead.'); } }
    ])
  }),
  room: Object.freeze({
    label: 'Room',
    parameters: Object.freeze([
      { name: 'name', label: 'Name', unit: '', kind: 'string',
        get: e => e.name || '',
        apply: (e, v) => { e.name = String(v).trim() || e.name; } },
      { name: 'width', label: 'Width', unit: 'm', kind: 'length', min: 0.3, max: 100,
        get: e => e.width ?? 0,
        apply: (e, v) => {
          e.width = v;
          recomputeRoom(e);
        } },
      { name: 'depth', label: 'Depth', unit: 'm', kind: 'length', min: 0.3, max: 100,
        get: e => e.depth ?? 0,
        apply: (e, v) => {
          e.depth = v;
          recomputeRoom(e);
        } },
      { name: 'targetArea', label: 'Target area', unit: 'm²', kind: 'area', min: 1, max: 10000,
        get: e => (e.width ?? 0) * (e.depth ?? 0),
        apply: (e, v) => {
          // keep width, grow depth to the target area (deterministic);
          // polygon boundaries rescale consistently — never mixed geometry
          if ((e.width ?? 0) > 0.1) e.depth = v / e.width;
          recomputeRoom(e);
        } },
      { name: 'type', label: 'Room type', unit: '', kind: 'string',
        get: e => e.zoning || '',
        apply: (e, v) => { e.zoning = v; } }
    ])
  }),
  wall: Object.freeze({
    label: 'Wall',
    parameters: Object.freeze([
      { name: 'thickness', label: 'Thickness', unit: 'm', kind: 'length', min: 0.05, max: 2,
        get: e => e.thickness ?? 0.2,
        apply: (e, v) => { e.thickness = v; } },
      { name: 'height', label: 'Height', unit: 'm', kind: 'length', min: 1, max: 10,
        get: e => e.height ?? 2.7,
        apply: (e, v) => { e.height = v; } },
      { name: 'assemblyId', label: 'Assembly', unit: '', kind: 'string',
        get: e => e.assemblyId || 'generic-200',
        apply: (e, v) => { e.assemblyId = v; } }
    ])
  })
});

// ---------------------------------------------------------------------------
// Dependent-chain recompute — one per object family. All fields the canvas
// and engines read are regenerated here so nothing stays stale.
// ---------------------------------------------------------------------------

function recomputeStair(stair) {
  const risers = Math.max(1, Math.round(stair.risers ?? 16));
  const rise = typeof stair.rise === 'number' && stair.rise > 0 ? stair.rise : 2.7;
  const tread = stair.tread ?? 0.28;
  const riserHeight = rise / risers;
  const run = risers > 1 ? (risers - 1) * tread : tread;
  const blondel = 2 * riserHeight + tread;

  stair.risers = risers;
  stair.riserCount = risers; // legacy alias kept in sync
  stair.rise = rise;
  stair.totalRise = rise;
  stair.riserHeight = riserHeight;
  stair.riser = riserHeight;
  stair.tread = tread;
  stair.going = tread;
  stair.run = run;
  stair.depth = run; // plan footprint depth follows the run
  stair.blondel = blondel;
  stair.pitchAngle = Math.atan2(riserHeight, tread) * (180 / Math.PI);
  // IBC heuristics (same band the factory uses)
  stair.isCompliant = blondel >= 0.60 && blondel <= 0.66 && tread >= 0.24 && riserHeight <= 0.19;
}

function recomputeDoor(door) {
  // Rendering derives jambs/swing from width+position+swing at draw time
  // (calcDoorCADGeometry); what stays stale is the door's own dimension
  // label and any fit data. Recompute the label so measurements stay true.
  door.name = door.name && !/^\s*Door(\s*\(\d+(\.\d+)?m\))?\s*$/.test(door.name)
    ? door.name
    : `Door (${door.width.toFixed(2)}m)`;
}

function recomputeWindow(win) {
  // head = sill + height stays a consistent triple; label follows width
  win.headHeight = (win.sill ?? 0.9) + (win.height ?? 1.2);
  win.name = win.name && !/^\s*Window(\s*\(\d+(\.\d+)?m\))?\s*$/.test(win.name)
    ? win.name
    : `Window (${win.width.toFixed(2)}m)`;
}

function recomputeRoom(room) {
  const w = room.width ?? 0;
  const d = room.depth ?? 0;
  const area = w * d;
  room.area = area;
  if (Array.isArray(room.boundary) && room.boundary.length >= 3) {
    // rescale boundary about its center so the polygon matches w×d
    const xs = room.boundary.map(p => p.x);
    const ys = room.boundary.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const oldW = maxX - minX, oldH = maxY - minY;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const sx = oldW > 1e-9 ? w / oldW : 1;
    const sy = oldH > 1e-9 ? d / oldH : 1;
    room.boundary = room.boundary.map(p => ({ x: cx + (p.x - cx) * sx, y: cy + (p.y - cy) * sy }));
  }
}

/** Parameter descriptors for an entity kind (null when unknown). */
export function getParametersFor(kind) {
  return PARAMETRIC_OBJECTS[kind]?.parameters || null;
}

/** Reads all parameter values of an entity as a plain record. */
export function readParameters(entity) {
  const params = getParametersFor(entity?.kind);
  if (!params) return null;
  const out = {};
  for (const p of params) out[p.name] = p.get(entity);
  return out;
}

/**
 * Applies one parameter by name. Returns
 *   { ok: true, changed: [name] } |
 *   { ok: false, error, expected? }
 * Throws only for programming errors (unknown kind); user errors are values.
 */
export function applyParameter(entity, name, value) {
  const params = getParametersFor(entity?.kind);
  if (!params) return { ok: false, error: `No parameters defined for "${entity?.kind}".` };
  const param = params.find(p => p.name === name);
  if (!param) {
    const names = params.map(p => p.name).join(', ');
    return { ok: false, error: `Unknown parameter "${name}" — available: ${names}.` };
  }
  if (param.derived) {
    return { ok: false, error: `"${param.label}" is derived — set the driving parameters instead.` };
  }
  if (param.kind === 'length' || param.kind === 'area') {
    const v = Number(value);
    if (!Number.isFinite(v)) {
      return { ok: false, error: `${param.label} must be a number in ${param.unit || 'm'} — e.g. ${param.fallbackExample || param.min}.` };
    }
    if (v < param.min || v > param.max) {
      return { ok: false, error: `${param.label} must be between ${param.min} and ${param.max} ${param.unit || ''}.` };
    }
    param.apply(entity, v);
    return { ok: true, changed: [name] };
  }
  if (param.kind === 'count') {
    const v = Math.round(Number(value));
    if (!Number.isFinite(v) || v < param.min || v > param.max) {
      return { ok: false, error: `${param.label} must be an integer between ${param.min} and ${param.max}.` };
    }
    param.apply(entity, v);
    return { ok: true, changed: [name] };
  }
  if (param.kind === 'enum') {
    const match = param.values.find(x => String(x).toLowerCase() === String(value).toLowerCase());
    if (!match) {
      return { ok: false, error: `${param.label} must be one of: ${param.values.join(', ')} (received "${value}").` };
    }
    param.apply(entity, match);
    return { ok: true, changed: [name] };
  }
  // string / reference
  param.apply(entity, value == null ? '' : value);
  return { ok: true, changed: [name] };
}
