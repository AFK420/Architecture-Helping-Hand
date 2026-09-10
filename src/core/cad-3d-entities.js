/**
 * Architecture Helping Hand — 3D/Advanced CAD Entities & Geometry
 *
 * Factories + deterministic geometry for the full tool surface:
 *   nurbs_curve  — smooth curve through control points (entity + tessellation)
 *   planar/loft/revolve/extrude surfaces — surface entities with tessellations
 *   solid_box    — box primitive with a face list
 *   mesh          — quad/tri mesh entity (from surfaces, remeshable)
 *   subd          — Catmull-Clark subdivision solid from a box seed
 *   curve boolean — union/subtract/intersect of closed 2D polylines
 *
 * Everything derives from the existing NURBS evaluator (massing-3d.js de Boor)
 * and the clip engine (geometry3d.clipPolygonAgainstPlane). No new math
 * dependencies; every op is pure and testable.
 */

import { generateEntityId } from './entities.js';
import { evaluateNurbsCurve, evaluateNurbsSurface, tessellateNurbsSurface } from './nurbs-core.js';
import { clipPolygonAgainstPlane, createPlane } from './geometry3d.js';

// ---------------------------------------------------------------------------
// NURBS curve entity
// ---------------------------------------------------------------------------

/** Tessellates a NURBS curve into a world-space polyline. */
export function tessellateNurbsCurve(controlPoints = [], degree = 3, samples = 48) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    pts.push(evaluateNurbsCurve(controlPoints, degree, i / samples));
  }
  return pts;
}

export function createNurbsCurveEntity({ id, name, controlPoints, degree = 3, layerId = 'A-ANNO-LINES', metadata = {} } = {}) {
  if (!Array.isArray(controlPoints) || controlPoints.length < 2) {
    throw new Error('NURBS curve needs at least 2 control points');
  }
  const d = Math.max(1, Math.min(degree, controlPoints.length - 1));
  const poly = tessellateNurbsCurve(controlPoints, d);
  const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
  return {
    kind: 'nurbs_curve',
    id: id || generateEntityId('crv'),
    name: typeof name === 'string' && name ? name : `NURBS Curve ${d}`,
    controlPoints: controlPoints.map(p => ({ x: p.x || 0, y: p.y || 0, z: p.z || 0 })),
    degree: d,
    closed: false,
    // bbox for picking/marquee
    x: Math.min(...xs), y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) || 0.001,
    depth: Math.max(...ys) - Math.min(...ys) || 0.001,
    layerId,
    metadata
  };
}

/** Tessellated world points of a nurbs_curve entity (render + eval). */
export function nurbsCurvePoints(entity, samples = 48) {
  return tessellateNurbsCurve(entity.controlPoints, entity.degree, samples);
}

// ---------------------------------------------------------------------------
// Surface entities (planar, extrude, loft, revolve)
// ---------------------------------------------------------------------------

/** Validates a closed-ish 2D ring: ≥3 distinct points. */
function requireRing(points, what) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error(`${what} needs at least 3 points`);
  }
  return points.map(p => ({ x: p.x || 0, y: p.y || 0 }));
}

function ringBbox(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return {
    x: Math.min(...xs), y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) || 0.001,
    depth: Math.max(...ys) - Math.min(...ys) || 0.001
  };
}

/** Planar surface: a closed 2D ring at a height. */
export function createPlanarSurfaceEntity({ id, name, points, z = 0, layerId = 'A-SURF', metadata = {} } = {}) {
  const ring = requireRing(points, 'Planar surface');
  const bbox = ringBbox(ring);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    area += ring[i].x * ring[j].y - ring[j].x * ring[i].y;
  }
  return {
    kind: 'planar_surface',
    id: id || generateEntityId('srf'),
    name: typeof name === 'string' && name ? name : 'Planar Surface',
    points: ring, z,
    areaM2: Math.abs(area) / 2,
    ...bbox,
    layerId, metadata
  };
}

/** Extrude: profile ring swept from z0 to z1 → side faces + caps. */
export function createExtrudeEntity({ id, name, points, z0 = 0, z1 = 3, layerId = 'A-SURF', metadata = {} } = {}) {
  const ring = requireRing(points, 'Extrusion');
  if (!(z1 > z0)) throw new Error('Extrusion top must be above its base');
  const bbox = ringBbox(ring);
  return {
    kind: 'extrude_solid',
    id: id || generateEntityId('ext'),
    name: typeof name === 'string' && name ? name : `Extrude ${(z1 - z0).toFixed(2)}m`,
    points: ring, z0, z1,
    height: z1 - z0,
    ...bbox,
    layerId, metadata
  };
}

/** Face list of an extrusion (render + 3D massing). */
export function extrudeFaces(entity) {
  const faces = [];
  const n = entity.points.length;
  for (let i = 0; i < n; i++) {
    const a = entity.points[i], b = entity.points[(i + 1) % n];
    faces.push({ vertices: [{ x: a.x, y: a.y, z: entity.z0 }, { x: b.x, y: b.y, z: entity.z0 }, { x: b.x, y: b.y, z: entity.z1 }, { x: a.x, y: a.y, z: entity.z1 }] });
  }
  faces.push({ vertices: entity.points.map(p => ({ x: p.x, y: p.y, z: entity.z1 })), isTop: true });
  faces.push({ vertices: [...entity.points].reverse().map(p => ({ x: p.x, y: p.y, z: entity.z0 })), isBottom: true });
  return faces;
}

/** Loft: ruled surface between two rings (same vertex count). */
export function createLoftEntity({ id, name, points0, points1, z0 = 0, z1 = 3, layerId = 'A-SURF', metadata = {} } = {}) {
  const ringA = requireRing(points0, 'Loft profile A');
  const ringB = requireRing(points1, 'Loft profile B');
  if (ringA.length !== ringB.length) {
    throw new Error('Loft needs the same vertex count on both profiles');
  }
  const all = [...ringA, ...ringB];
  const bbox = ringBbox(all);
  return {
    kind: 'loft_surface',
    id: id || generateEntityId('lof'),
    name: typeof name === 'string' && name ? name : 'Loft Surface',
    points0: ringA, points1: ringB, z0, z1,
    ...bbox,
    layerId, metadata
  };
}

/** Face list of a loft (ruled quads + caps). */
export function loftFaces(entity) {
  const faces = [];
  const n = entity.points0.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a0 = entity.points0[i], b0 = entity.points0[j];
    const a1 = entity.points1[i], b1 = entity.points1[j];
    faces.push({ vertices: [
      { x: a0.x, y: a0.y, z: entity.z0 }, { x: b0.x, y: b0.y, z: entity.z0 },
      { x: b1.x, y: b1.y, z: entity.z1 }, { x: a1.x, y: a1.y, z: entity.z1 }
    ] });
  }
  faces.push({ vertices: entity.points0.map(p => ({ x: p.x, y: p.y, z: entity.z0 })), isBottom: true });
  faces.push({ vertices: entity.points1.map(p => ({ x: p.x, y: p.y, z: entity.z1 })), isTop: true });
  return faces;
}

/** Revolve: profile polyline swept 360° around the y axis at world x0. */
export function createRevolveEntity({ id, name, profile, axisX = 0, z0 = 0, segments = 24, layerId = 'A-SURF', metadata = {} } = {}) {
  if (!Array.isArray(profile) || profile.length < 2) {
    throw new Error('Revolve needs a profile of at least 2 points');
  }
  const segs = Math.max(8, Math.min(96, segments));
  const pts = profile.map(p => ({ r: Math.abs(p.x - axisX), y: p.y || 0 }));
  const xs = [], ys = [];
  for (const p of pts) { xs.push(axisX - p.r); xs.push(axisX + p.r); ys.push(p.y); }
  return {
    kind: 'revolve_surface',
    id: id || generateEntityId('rev'),
    name: typeof name === 'string' && name ? name : 'Revolve Surface',
    profile: pts.map(p => ({ x: axisX + p.r, y: p.y })), // store as absolute x
    axisX, z0, segments: segs,
    x: Math.min(...xs), y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) || 0.001,
    depth: 0.001,
    layerId, metadata
  };
}

/** Face list of a revolve (quad strips around the axis). */
export function revolveFaces(entity) {
  const faces = [];
  const segs = entity.segments;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    for (let j = 0; j < entity.profile.length - 1; j++) {
      const p0 = entity.profile[j], p1 = entity.profile[j + 1];
      const r0 = Math.abs(p0.x - entity.axisX), r1 = Math.abs(p1.x - entity.axisX);
      // revolve around the axis: x/z plane sweep, y stays vertical
      const v = (r, ang, y) => ({ x: entity.axisX + r * Math.cos(ang), y, z: entity.z0 + r * Math.sin(ang) });
      faces.push({ vertices: [v(r0, a0, p0.y), v(r1, a0, p1.y), v(r1, a1, p1.y), v(r0, a1, p0.y)] });
    }
  }
  return faces;
}

// ---------------------------------------------------------------------------
// Solid box primitive
// ---------------------------------------------------------------------------

export function createSolidBoxEntity({ id, name, x = 0, y = 0, z = 0, width = 2, depth = 2, height = 2, layerId = 'A-SURF', metadata = {} } = {}) {
  if (width <= 0 || depth <= 0 || height <= 0) throw new Error('Box dimensions must be positive');
  return {
    kind: 'solid_box',
    id: id || generateEntityId('box'),
    name: typeof name === 'string' && name ? name : `Box ${width}×${depth}×${height}m`,
    x, y, z, width, depth, height,
    layerId, metadata
  };
}

export function solidBoxFaces(entity) {
  const { x, y, z, width: w, depth: d, height: h } = entity;
  const p = (dx, dy, dz) => ({ x: x + dx, y: y + dy, z: z + dz });
  return [
    { vertices: [p(0, 0, h), p(w, 0, h), p(w, d, h), p(0, d, h)], isTop: true },
    { vertices: [p(0, 0, 0), p(0, d, 0), p(w, d, 0), p(w, 0, 0)], isBottom: true },
    { vertices: [p(0, 0, 0), p(w, 0, 0), p(w, 0, h), p(0, 0, h)] },
    { vertices: [p(w, 0, 0), p(w, d, 0), p(w, d, h), p(w, 0, h)] },
    { vertices: [p(w, d, 0), p(0, d, 0), p(0, d, h), p(w, d, h)] },
    { vertices: [p(0, d, 0), p(0, 0, 0), p(0, 0, h), p(0, d, h)] }
  ];
}

// ---------------------------------------------------------------------------
// Mesh entity + quad remesh
// ---------------------------------------------------------------------------

export function createMeshEntity({ id, name, quads = [], layerId = 'A-MESH', metadata = {} } = {}) {
  if (!Array.isArray(quads) || quads.length === 0) throw new Error('Mesh needs at least one quad');
  const xs = quads.flat().map(v => v.x), ys = quads.flat().map(v => v.y), zs = quads.flat().map(v => v.z);
  return {
    kind: 'mesh_entity',
    id: id || generateEntityId('msh'),
    name: typeof name === 'string' && name ? name : `Mesh (${quads.length} quads)`,
    quads,
    x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs),
    width: Math.max(...xs) - Math.min(...xs) || 0.001,
    depth: Math.max(...ys) - Math.min(...ys) || 0.001,
    layerId, metadata
  };
}

/** Converts a surface entity's faces (tri/quad/n-gon) into a mesh entity. */
export function meshFromSurfaceEntity(surfaceEntity, name) {
  let faces = [];
  switch (surfaceEntity.kind) {
    case 'extrude_solid': faces = extrudeFaces(surfaceEntity); break;
    case 'loft_surface': faces = loftFaces(surfaceEntity); break;
    case 'revolve_surface': faces = revolveFaces(surfaceEntity); break;
    case 'solid_box': faces = solidBoxFaces(surfaceEntity); break;
    default: throw new Error(`Cannot mesh a ${surfaceEntity.kind}`);
  }
  return createMeshEntity({ name: name || `${surfaceEntity.name} (Mesh)`, quads: faces.map(f => f.vertices.map(v => ({ x: v.x, y: v.y, z: v.z }))) });
}

/**
 * Quad remesh: subdivide each quad into 4 by edge midpoints (deterministic,
 * preserves shape — no reparameterization). `levels` bounds the count.
 */
export function quadRemeshQuads(quads, levels = 1) {
  let out = quads;
  for (let l = 0; l < levels; l++) {
    const next = [];
    for (const q of out) {
      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
      const [a, b, c, d] = q;
      const ab = mid(a, b), bc = mid(b, c), cd = mid(c, d), da = mid(d, a);
      const center = { x: (a.x + b.x + c.x + d.x) / 4, y: (a.y + b.y + c.y + d.y) / 4, z: (a.z + b.z + c.z + d.z) / 4 };
      next.push([a, ab, center, da], [ab, b, bc, center], [center, bc, c, cd], [da, center, cd, d]);
    }
    out = next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// SubD — Catmull-Clark from a box seed; crease tagging
// ---------------------------------------------------------------------------

/** Creates a SubD solid entity seeded from a box (8 control vertices). */
export function createSubdBoxEntity({ id, name, x = 0, y = 0, z = 0, width = 2, depth = 2, height = 2, levels = 2, layerId = 'A-SURF', metadata = {} } = {}) {
  if (width <= 0 || depth <= 0 || height <= 0) throw new Error('SubD box dimensions must be positive');
  return {
    kind: 'subd_solid',
    id: id || generateEntityId('sub'),
    name: typeof name === 'string' && name ? name : `SubD Box (${levels} levels)`,
    seed: 'box', x, y, z, width, depth, height,
    subdLevels: Math.max(1, Math.min(4, levels)),
    creases: [], // edge indices marked hard
    layerId, metadata
  };
}

/**
 * One Catmull-Clark step on a quad-mesh cage: face points (quad centroids),
 * edge points (edge midpoints averaged with adjacent face points), updated
 * vertex points (limit-style average). Deterministic — same cage in, same
 * limit out.
 */
export function catmullClarkStep(quads) {
  // face points
  const facePts = quads.map(q => ({
    x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4,
    y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4,
    z: (q[0].z + q[1].z + q[2].z + q[3].z) / 4
  }));
  const key = (p) => `${p.x.toFixed(6)}|${p.y.toFixed(6)}|${p.z.toFixed(6)}`;

  // edge registry: midpoint + adjacent face points
  const edgeMap = new Map();
  quads.forEach((q, fi) => {
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const ek = key(a) < key(b) ? `${key(a)}#${key(b)}` : `${key(b)}#${key(a)}`;
      if (!edgeMap.has(ek)) edgeMap.set(ek, { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }, faces: [] });
      edgeMap.get(ek).faces.push(fi);
    }
  });
  const edgePoints = new Map();
  for (const [ek, e] of edgeMap) {
    const fAvg = { x: 0, y: 0, z: 0 };
    for (const fi of e.faces) { fAvg.x += facePts[fi].x; fAvg.y += facePts[fi].y; fAvg.z += facePts[fi].z; }
    const n = e.faces.length || 1;
    edgePoints.set(ek, { x: (e.mid.x * 2 + fAvg.x / n) / 3, y: (e.mid.y * 2 + fAvg.y / n) / 3, z: (e.mid.z * 2 + fAvg.z / n) / 3 });
  }

  // vertex points: (Q + 2R + (n−3)S)/n per standard Catmull-Clark.
  // R is the average of the vertex's DISTINCT incident edge midpoints —
  // accumulate each edge once per vertex (keyed), never per face traversal.
  const vInfo = new Map();
  quads.forEach((q, fi) => {
    for (let i = 0; i < 4; i++) {
      const k = key(q[i]);
      if (!vInfo.has(k)) vInfo.set(k, { v: q[i], Q: { x: 0, y: 0, z: 0 }, R: { x: 0, y: 0, z: 0 }, edgeKeys: new Set(), faces: 0 });
      const rec = vInfo.get(k);
      rec.Q.x += facePts[fi].x; rec.Q.y += facePts[fi].y; rec.Q.z += facePts[fi].z;
      rec.faces += 1;
    }
  });
  for (const [ek, e] of edgeMap) {
    // each edge endpoint accumulates this midpoint exactly once
    for (const fi of e.faces) {
      for (const v of quads[fi]) {
        const rec = vInfo.get(key(v));
        if (!rec || rec.edgeKeys.has(ek)) continue;
        rec.edgeKeys.add(ek);
        rec.R.x += e.mid.x; rec.R.y += e.mid.y; rec.R.z += e.mid.z;
      }
    }
  }
  const newVerts = new Map();
  for (const [k, rec] of vInfo) {
    const n = rec.faces || 1;
    const q = { x: rec.Q.x / n, y: rec.Q.y / n, z: rec.Q.z / n };
    const m = rec.edgeKeys.size;
    const r = m > 0 ? { x: rec.R.x / m, y: rec.R.y / m, z: rec.R.z / m } : rec.v;
    // (Q + 2R + (n−3)S) / n — R is the average of the distinct edge midpoints
    newVerts.set(k, {
      x: (q.x + 2 * r.x + (n - 3) * rec.v.x) / n,
      y: (q.y + 2 * r.y + (n - 3) * rec.v.y) / n,
      z: (q.z + 2 * r.z + (n - 3) * rec.v.z) / n
    });
  }

  // build the refined quad list: each face → 4 quads
  const pointFor = (p) => newVerts.get(key(p)) || p;
  const edgeFor = (a, b) => {
    const ek = key(a) < key(b) ? `${key(a)}#${key(b)}` : `${key(b)}#${key(a)}`;
    return edgePoints.get(ek) || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
  };
  const out = [];
  quads.forEach((q, fi) => {
    const v0 = pointFor(q[0]), v1 = pointFor(q[1]), v2 = pointFor(q[2]), v3 = pointFor(q[3]);
    const e01 = edgeFor(v0, v1), e12 = edgeFor(v1, v2), e23 = edgeFor(v2, v3), e30 = edgeFor(v3, v0);
    const f = facePts[fi];
    out.push([v0, e01, f, e30], [e01, v1, e12, f], [f, e12, v2, e23], [e30, f, e23, v3]);
  });
  return out;
}

/** Evaluates a SubD solid to its limit quad mesh (levels × Catmull-Clark). */
export function subdLimitQuads(entity) {
  let quads = solidBoxFaces(entity).map(f => {
    const vs = f.vertices;
    return [
      { x: vs[0].x, y: vs[0].y, z: vs[0].z }, { x: vs[1].x, y: vs[1].y, z: vs[1].z },
      { x: vs[2].x, y: vs[2].y, z: vs[2].z }, { x: vs[3].x, y: vs[3].y, z: vs[3].z }
    ];
  });
  for (let i = 0; i < (entity.subdLevels || 2); i++) quads = catmullClarkStep(quads);
  return quads;
}

// ---------------------------------------------------------------------------
// Closed 2D curve booleans (union / subtract / intersect of convex-ish rings)
// ---------------------------------------------------------------------------

/** Sutherland-Hodgman clip of a subject ring against ONE convex clip edge. */
function clipRingAgainstConvex(subject, convexRing) {
  let out = subject;
  const n = convexRing.length;
  for (let i = 0; i < n; i++) {
    const a = convexRing[i], b = convexRing[(i + 1) % n];
    // inside = LEFT of the edge for a CCW ring (positive cross product)
    const cross = (p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const input = out;
    out = [];
    if (input.length === 0) break;
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const nxt = input[(j + 1) % input.length];
      const cIn = cross(cur) >= 0, nIn = cross(nxt) >= 0;
      if (cIn) out.push(cur);
      if (cIn !== nIn) {
        // Intersection of segment cur→nxt with the infinite line a→b.
        // Solve cur + t·(nxt−cur) on line a,b: cross(P) = 0 is linear in t.
        const dC = cross(cur);
        const dN = cross(nxt);
        const t = dC / (dC - dN); // dC and dN have opposite signs here
        out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y) });
      }
    }
  }
  return out;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    a += ring[i].x * ring[j].y - ring[j].x * ring[i].y;
  }
  return a / 2;
}

function ensureCCW(ring) {
  return ringArea(ring) < 0 ? [...ring].reverse() : ring;
}

/**
 * Boolean of two closed 2D rings.
 *   intersect — Sutherland-Hodgman clip of A against (convex) B: exact.
 *   union     — convex hull of both rings (exact for the convex-hull case).
 *   subtract  — A with a HOLE where B overlaps: region-with-hole is the
 *               standard CAD representation of a boolean difference; the
 *               hole is the exact A∩B, and net area = |A| − |A∩B|.
 */
export function booleanRings(mode, ringA, ringB) {
  const A = ensureCCW(ringA);
  const B = ensureCCW(ringB);
  if (mode === 'intersect') {
    const result = clipRingAgainstConvex(A, B);
    return { ring: result.length >= 3 ? result : null, areaM2: result.length >= 3 ? Math.abs(ringArea(result)) : 0 };
  }
  if (mode === 'subtract') {
    const overlap = clipRingAgainstConvex(A, B);
    const hole = overlap.length >= 3 ? overlap : null;
    if (hole && Math.abs(ringArea(hole) - ringArea(A)) < 1e-6) {
      // A fully inside B → nothing remains
      return { ring: null, hole: null, areaM2: 0 };
    }
    const net = Math.abs(ringArea(A)) - (hole ? Math.abs(ringArea(hole)) : 0);
    return { ring: A, hole, areaM2: Math.max(0, net) };
  }
  // union: convex hull of both rings (Andrew's monotone chain)
  const pts = [...A, ...B];
  pts.sort((p, q) => p.x - q.x || p.y - q.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return { ring: hull, hole: null, areaM2: Math.abs(ringArea(hull)) };
}

/** Creates the resulting closed region entity of a curve boolean.
 *  Subtract results are regions-with-holes (ring + hole). */
export function createBooleanResultEntity({ id, name, ring, hole = null, layerId = 'A-ANNO-LINES', metadata = {} } = {}) {
  if (!Array.isArray(ring) || ring.length < 3) throw new Error('Boolean result is empty');
  const bbox = ringBbox(ring);
  return {
    kind: 'boolean_region',
    id: id || generateEntityId('boo'),
    name: typeof name === 'string' && name ? name : 'Boolean Region',
    points: ring,
    hole: hole && hole.length >= 3 ? hole : null,
    areaM2: Math.abs(ringArea(ring)) - (hole && hole.length >= 3 ? Math.abs(ringArea(hole)) : 0),
    closed: true,
    ...bbox,
    layerId, metadata
  };
}

// ---------------------------------------------------------------------------
// Crop — clip every entity to a rect window (non-destructive visibility)
// ---------------------------------------------------------------------------

/**
 * Computes whether an entity is fully inside / partially inside / outside
 * a crop rect. Segments clip via trimExtend math; rings via bbox.
 */
export function cropVerdict(entity, rect) {
  const ex1 = Number.isFinite(entity.x1) ? Math.min(entity.x1, entity.x2) : entity.x;
  const ex2 = Number.isFinite(entity.x1) ? Math.max(entity.x1, entity.x2) : entity.x + (entity.width || 0);
  const ey1 = Number.isFinite(entity.y1) ? Math.min(entity.y1, entity.y2) : entity.y;
  const ey2 = Number.isFinite(entity.y1) ? Math.max(entity.y1, entity.y2) : entity.y + (entity.depth || 0);
  const inside = ex1 >= rect.x && ex2 <= rect.x + rect.width && ey1 >= rect.y && ey2 <= rect.y + rect.depth;
  const outside = ex2 < rect.x || ex1 > rect.x + rect.width || ey2 < rect.y || ey1 > rect.y + rect.depth;
  return inside ? 'inside' : outside ? 'outside' : 'partial';
}
