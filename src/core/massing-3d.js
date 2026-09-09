/**
 * Architecture Helping Hand - Lightweight 3D Massing & Axonometric Engine
 * Pure mathematical 3D projection engine with ZERO runtime dependencies.
 * Converts 2D floor plans into 3D axonometric and isometric vector models with
 * wall extrusion, opening lintels/sills, structural columns, depth sorting,
 * and architectural directional shading.
 */

import { wallOpenings, wallLength } from './entities.js';
import { columnContour } from './grid-columns.js';

export const CAMERA_PRESETS = Object.freeze({
  isometric_ne: { azimuth: 45, elevation: 35.264, label: 'Isometric NE (30°/30°)' },
  isometric_nw: { azimuth: 135, elevation: 35.264, label: 'Isometric NW' },
  isometric_se: { azimuth: -45, elevation: 35.264, label: 'Isometric SE' },
  isometric_sw: { azimuth: -135, elevation: 35.264, label: 'Isometric SW' },
  axonometric_top: { azimuth: 45, elevation: 60, label: 'Top Axo (60°)' },
  cavalier: { azimuth: 45, elevation: 45, label: 'Plan Oblique (45°)' },
  plan: { azimuth: 0, elevation: 89.9, label: 'Plan View' }
});

// Normalized directional sun light vector [Lx, Ly, Lz]
const SUN_VECTOR = (() => {
  const vx = 0.5, vy = -0.7, vz = 0.9;
  const len = Math.hypot(vx, vy, vz);
  return [vx / len, vy / len, vz / len];
})();

/**
 * Projects a 3D point (world meters) to screen coordinates (pixels) and depth.
 *
 * @param {{x: number, y: number, z: number}} p
 * @param {Object} camera
 * @param {number} [camera.azimuth=45] - Azimuth / yaw in degrees
 * @param {number} [camera.elevation=35.264] - Elevation / pitch in degrees
 * @param {number} [camera.zoom=40] - Pixels per meter
 * @param {number} [camera.panX=400]
 * @param {number} [camera.panY=300]
 * @returns {{x: number, y: number, depth: number}}
 */
export function projectPoint3D(p, camera = {}) {
  const az = ((camera.azimuth ?? 45) * Math.PI) / 180;
  const el = ((camera.elevation ?? 35.264) * Math.PI) / 180;
  const zoom = camera.zoom || 40;
  const panX = camera.panX || 0;
  const panY = camera.panY || 0;

  // Yaw rotation around vertical Z axis
  const cosAz = Math.cos(az);
  const sinAz = Math.sin(az);
  const x1 = p.x * cosAz - p.y * sinAz;
  const y1 = p.x * sinAz + p.y * cosAz;
  const z1 = p.z || 0;

  // Pitch tilt by elevation
  const cosEl = Math.cos(el);
  const sinEl = Math.sin(el);

  // Camera-space depth BEFORE pitch (distance along the view axis used for
  // both painter sorting and the perspective divide).
  const camY = z1 * sinEl + y1 * cosEl;

  if (camera.perspective === true) {
    // One-point perspective: the eye sits `dist` meters behind the screen
    // plane along the view axis; scale each point by dist/(dist - camY).
    const dist = camera.perspectiveDistance || 30;
    const denom = Math.max(dist * 0.05, dist - camY); // never flip past the eye
    const scale = dist / denom;
    const screenX = panX + x1 * zoom * scale;
    const screenY = panY - (z1 * cosEl - y1 * sinEl) * zoom * scale;
    return { x: screenX, y: screenY, depth: -denom };
  }

  // Screen X = x1
  // Screen Y = in SVG Y is downwards, so positive world Z projects upwards (-Z)
  const screenX = panX + x1 * zoom;
  const screenY = panY - (z1 * cosEl - y1 * sinEl) * zoom;
  const depth = camY;

  return { x: screenX, y: screenY, depth };
}

/**
 * Computes the normal vector for a 3D polygon face and its lighting factor.
 */
function computeFaceLighting(vertices) {
  if (vertices.length < 3) return { normal: [0, 0, 1], factor: 1 };
  const p0 = vertices[0];
  const p1 = vertices[1];
  const p2 = vertices[2];

  // Vectors P1-P0 and P2-P0
  const v1 = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z];
  const v2 = [p2.x - p0.x, p2.y - p0.y, p2.z - p0.z];

  // Cross product
  const nx = v1[1] * v2[2] - v1[2] * v2[1];
  const ny = v1[2] * v2[0] - v1[0] * v2[2];
  const nz = v1[0] * v2[1] - v1[1] * v2[0];
  const len = Math.hypot(nx, ny, nz);

  if (len < 1e-6) return { normal: [0, 0, 1], factor: 0.8 };
  const normal = [nx / len, ny / len, nz / len];

  // Dot product with sun light vector
  const dot = normal[0] * SUN_VECTOR[0] + normal[1] * SUN_VECTOR[1] + normal[2] * SUN_VECTOR[2];
  // Ambient floor 0.35, max 1.0
  const factor = Math.max(0.35, Math.min(1.0, 0.45 + 0.55 * dot));
  return { normal, factor };
}

/**
 * Generates shaded RGB color from a base hex color and lighting factor.
 */
function applyLightingToColor(hexColor, factor) {
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return hexColor;

  const r = Math.round(Math.min(255, ((num >> 16) & 255) * factor));
  const g = Math.round(Math.min(255, ((num >> 8) & 255) * factor));
  const b = Math.round(Math.min(255, (num & 255) * factor));

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Creates a 3D box / prism from a 2D base polygon extruded along Z.
 */
function extrudePolygon(basePoints, zBottom, zTop, baseColor = '#e2e8f0', strokeColor = '#334155', opacity = 1, type = 'wall') {
  const faces = [];
  const n = basePoints.length;
  if (n < 3) return faces;

  const bottomVerts = basePoints.map(p => ({ x: p[0], y: p[1], z: zBottom }));
  const topVerts = basePoints.map(p => ({ x: p[0], y: p[1], z: zTop }));

  // 1. Top face
  const topLight = computeFaceLighting(topVerts);
  faces.push({
    vertices: topVerts,
    color: applyLightingToColor(baseColor, Math.min(1.0, topLight.factor + 0.15)),
    stroke: strokeColor,
    opacity,
    type,
    isTop: true
  });

  // 2. Bottom face
  const botVertsReversed = [...bottomVerts].reverse();
  const botLight = computeFaceLighting(botVertsReversed);
  faces.push({
    vertices: botVertsReversed,
    color: applyLightingToColor(baseColor, botLight.factor * 0.5),
    stroke: strokeColor,
    opacity,
    type,
    isBottom: true
  });

  // 3. Side faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const quad = [
      bottomVerts[i],
      bottomVerts[next],
      topVerts[next],
      topVerts[i]
    ];
    const sideLight = computeFaceLighting(quad);
    faces.push({
      vertices: quad,
      color: applyLightingToColor(baseColor, sideLight.factor),
      stroke: strokeColor,
      opacity,
      type,
      isSide: true
    });
  }

  return faces;
}

/**
 * Converts a 2D floor plan into 3D massing face polygons.
 *
 * @param {Array<Object>} entities - 2D plan entities
 * @param {Object} [options]
 * @param {number} [options.wallHeight=3.0] - Height of walls in meters
 * @param {number} [options.doorHeight=2.1] - Height of doors in meters
 * @param {number} [options.windowSill=0.9] - Height of window sill in meters
 * @param {number} [options.windowHeight=1.2] - Height of window glass in meters
 * @param {number} [options.slabThickness=0.2] - Slab thickness in meters
 * @returns {Array<Object>} Array of 3D face objects
 */
export function buildMassing3DModel(entities = [], options = {}) {
  const zBase = typeof options.baseElevation === 'number' ? options.baseElevation : 0;
  const wallH = typeof options.wallHeight === 'number' && options.wallHeight > 0 ? options.wallHeight : 3.0;
  const doorH = Math.min(wallH - 0.2, options.doorHeight || 2.1);
  const winSill = options.windowSill || 0.9;
  const winH = options.windowHeight || 1.2;
  const winTop = Math.min(wallH - 0.2, winSill + winH);
  const slabThick = options.slabThickness || 0.2;

  const faces = [];
  const list = Array.isArray(entities) ? entities : [];

  // 1. Floor Slabs / Rooms
  const rooms = list.filter(e => e && e.kind === 'room');
  for (const r of rooms) {
    let poly = [];
    if (Array.isArray(r.boundary) && r.boundary.length >= 3) {
      poly = r.boundary.map(p => [p.x, p.y]);
    } else if (typeof r.x === 'number' && typeof r.width === 'number') {
      const w = r.width;
      const d = r.depth || 0;
      poly = [
        [r.x, r.y],
        [r.x + w, r.y],
        [r.x + w, r.y + d],
        [r.x, r.y + d]
      ];
    }
    if (poly.length >= 3) {
      const slabFaces = extrudePolygon(poly, zBase - slabThick, zBase, '#cbd5e1', '#94a3b8', 1, 'slab');
      faces.push(...slabFaces);
    }
  }

  // 2. Walls and Openings (Extruded with lintels & sills)
  const walls = list.filter(e => e && e.kind === 'wall' && typeof e.x1 === 'number');
  for (const w of walls) {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) continue;

    const thick = w.thickness || 0.2;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * (thick / 2);
    const ny = ux * (thick / 2);

    const openings = wallOpenings(w, list);

    if (openings.length === 0) {
      // Solid wall: full extrusion from zBase to zBase + wallH
      const basePts = [
        [w.x1 + nx, w.y1 + ny],
        [w.x2 + nx, w.y2 + ny],
        [w.x2 - nx, w.y2 - ny],
        [w.x1 - nx, w.y1 - ny]
      ];
      faces.push(...extrudePolygon(basePts, zBase, zBase + wallH, '#f1f5f9', '#475569', 1, 'wall'));
    } else {
      // Segmented wall around openings
      let currentPos = 0;
      for (const op of openings) {
        const opStart = Math.max(0, Math.min(len, op.position || 0));
        const opEnd = Math.max(0, Math.min(len, opStart + (op.width || 0.9)));

        // Solid sub-segment before opening
        if (opStart > currentPos + 1e-4) {
          const pStart = { x: w.x1 + ux * currentPos, y: w.y1 + uy * currentPos };
          const pEnd = { x: w.x1 + ux * opStart, y: w.y1 + uy * opStart };
          const segPts = [
            [pStart.x + nx, pStart.y + ny],
            [pEnd.x + nx, pEnd.y + ny],
            [pEnd.x - nx, pEnd.y - ny],
            [pStart.x - nx, pStart.y - ny]
          ];
          faces.push(...extrudePolygon(segPts, zBase, zBase + wallH, '#f1f5f9', '#475569', 1, 'wall'));
        }

        // Opening segment
        const oStart = { x: w.x1 + ux * opStart, y: w.y1 + uy * opStart };
        const oEnd = { x: w.x1 + ux * opEnd, y: w.y1 + uy * opEnd };
        const opPts = [
          [oStart.x + nx, oStart.y + ny],
          [oEnd.x + nx, oEnd.y + ny],
          [oEnd.x - nx, oEnd.y - ny],
          [oStart.x - nx, oStart.y - ny]
        ];

        if (op.kind === 'door') {
          // Lintel above door (from zBase + doorH to zBase + wallH)
          if (wallH > doorH) {
            faces.push(...extrudePolygon(opPts, zBase + doorH, zBase + wallH, '#f1f5f9', '#475569', 1, 'lintel'));
          }
        } else if (op.kind === 'window') {
          // Parapet / sill below window (from zBase to zBase + winSill)
          if (winSill > 0) {
            faces.push(...extrudePolygon(opPts, zBase, zBase + winSill, '#f1f5f9', '#475569', 1, 'sill'));
          }
          // Tinted window glass pane in middle (from zBase + winSill to zBase + winTop)
          faces.push(...extrudePolygon(opPts, zBase + winSill, zBase + winTop, '#38bdf8', '#0284c7', 0.55, 'glass'));
          // Lintel above window (from zBase + winTop to zBase + wallH)
          if (wallH > winTop) {
            faces.push(...extrudePolygon(opPts, zBase + winTop, zBase + wallH, '#f1f5f9', '#475569', 1, 'lintel'));
          }
        }

        currentPos = Math.max(currentPos, opEnd);
      }

      // Final solid segment after last opening
      if (currentPos < len - 1e-4) {
        const pStart = { x: w.x1 + ux * currentPos, y: w.y1 + uy * currentPos };
        const pEnd = { x: w.x2, y: w.y2 };
        const segPts = [
          [pStart.x + nx, pStart.y + ny],
          [pEnd.x + nx, pEnd.y + ny],
          [pEnd.x - nx, pEnd.y - ny],
          [pStart.x - nx, pStart.y - ny]
        ];
        faces.push(...extrudePolygon(segPts, zBase, zBase + wallH, '#f1f5f9', '#475569', 1, 'wall'));
      }
    }
  }

  // 3. Structural Columns
  const columns = list.filter(e => e && e.kind === 'column');
  for (const c of columns) {
    const contour = columnContour(c);
    if (contour.length >= 3) {
      const colColor = c.material === 'steel' ? '#64748b' : '#94a3b8';
      faces.push(...extrudePolygon(contour, zBase, zBase + wallH, colColor, '#1e293b', 1, 'column'));
    }
  }

  // 4. Stairs (3D Step Flight)
  const stairs = list.filter(e => e && e.kind === 'stair');
  for (const st of stairs) {
    // App stair entities use `risers` (count); `riserCount` was never set by
    // any factory, so every stair silently used the 10-riser default.
    const numRisers = st.risers || st.riserCount || 10;
    const rise = typeof st.rise === 'number' && st.rise > 0 ? st.rise : wallH;
    const riserH = rise / numRisers;
    const stW = st.width || 1.0;
    const stD = st.depth || st.run || 2.5;
    const treadD = stD / numRisers;

    for (let s = 0; s < numRisers; s++) {
      const stepBottom = zBase + s * riserH;
      const stepTop = zBase + (s + 1) * riserH;
      const stepY = st.y + s * treadD;
      const stepPts = [
        [st.x, stepY],
        [st.x + stW, stepY],
        [st.x + stW, stepY + treadD],
        [st.x, stepY + treadD]
      ];
      faces.push(...extrudePolygon(stepPts, stepBottom, stepTop, '#fbcfe8', '#db2777', 1, 'stair'));
    }
  }

  return faces;
}

/**
 * Builds a multi-story building massing 3D model by stacking multiple 2D plan levels vertically.
 *
 * @param {Array<Object>} documents - Collection of 2D plan documents
 * @param {Object} [options]
 * @param {number} [options.storyHeight=3.0] - Default floor-to-floor height in meters
 * @returns {Array<Object>} Stacked 3D faces array with building metrics
 */
export function buildMultiStoryMassing3DModel(documents = [], options = {}) {
  const docs = Array.isArray(documents)
    ? documents.filter(d => d && (d.type === '2d_plan' || d.type === '2d' || !d.type))
    : [];

  if (docs.length === 0) {
    const single = buildMassing3DModel([], options);
    single.storyCount = 0;
    single.totalHeight = 0;
    single.grossFloorArea = 0;
    single.grossVolume = 0;
    return single;
  }

  const defaultStoryH = typeof options.storyHeight === 'number' && options.storyHeight > 0 ? options.storyHeight : 3.0;
  const allFaces = [];
  let currentZ = 0;
  let totalGFA = 0;
  let totalVolume = 0;

  docs.forEach((doc, idx) => {
    const storyH = typeof doc.storyHeight === 'number' && doc.storyHeight > 0 ? doc.storyHeight : defaultStoryH;
    const storyFaces = buildMassing3DModel(doc.entities || [], {
      ...options,
      wallHeight: storyH,
      baseElevation: currentZ
    });

    for (const f of storyFaces) {
      f.storyIndex = idx;
      f.baseElevation = currentZ;
      f.storyName = doc.name || `Level ${idx + 1}`;
    }

    allFaces.push(...storyFaces);

    // Compute story room area
    const rooms = (doc.entities || []).filter(e => e && e.kind === 'room');
    let storyArea = 0;
    for (const r of rooms) {
      if (Array.isArray(r.boundary) && r.boundary.length >= 3) {
        let a = 0;
        for (let i = 0; i < r.boundary.length; i++) {
          const j = (i + 1) % r.boundary.length;
          a += r.boundary[i].x * r.boundary[j].y - r.boundary[j].x * r.boundary[i].y;
        }
        storyArea += Math.abs(a) / 2;
      } else if (typeof r.width === 'number' && typeof r.depth === 'number') {
        storyArea += r.width * r.depth;
      }
    }
    totalGFA += storyArea;
    // Volume must weight each story by its OWN height, not the building average
    totalVolume += storyArea * storyH;
    currentZ += storyH;
  });

  allFaces.faces = allFaces;
  allFaces.storyCount = docs.length;
  allFaces.totalHeight = Number(currentZ.toFixed(2));
  allFaces.grossFloorArea = Number(totalGFA.toFixed(2));
  allFaces.grossVolume = Number(totalVolume.toFixed(2));

  return allFaces;
}

/**
 * Projects 3D faces to 2D screen coordinates and depth-sorts them (Painter's algorithm).
 *
 * @param {Array<Object>} faces3D - 3D face objects
 * @param {Object} camera - Camera projection settings
 * @returns {Array<Object>} Sorted 2D projected faces
 */
export function projectAndSortFaces(faces3D, camera) {
  const projected = [];

  for (const face of faces3D) {
    let sumDepth = 0;
    const pts2D = [];

    for (const v of face.vertices) {
      const p = projectPoint3D(v, camera);
      pts2D.push([p.x, p.y]);
      sumDepth += p.depth;
    }

    const avgDepth = pts2D.length > 0 ? sumDepth / pts2D.length : 0;

    // Under perspective the eye looks along −viewY, so nearer faces have a
    // LARGER negative denominator; normalize both modes to "bigger = nearer".
    const nearness = camera.perspective === true ? avgDepth : -avgDepth;

    projected.push({
      points: pts2D,
      depth: nearness,
      color: face.color,
      stroke: face.stroke,
      opacity: face.opacity || 1
    });
  }

  // Painter's algorithm: sort ascending by nearness (farthest rendered first, nearest on top)
  projected.sort((a, b) => a.depth - b.depth);

  return projected;
}

/**
 * Generates standalone clean SVG markup for a 3D massing model.
 *
 * @param {Array<Object>} entities - 2D plan entities
 * @param {Object} [camera] - Camera options
 * @param {Object} [options] - Modeling & rendering options
 * @returns {string} Standalone SVG string
 */
export function generateMassingSVG(entities = [], arg2 = {}, arg3 = {}) {
  let camera, options;
  if (arg2 && (typeof arg2.azimuth === 'number' || typeof arg2.elevation === 'number')) {
    camera = arg2;
    options = arg3 || {};
  } else {
    options = arg2 || {};
    camera = options.camera || {};
  }

  let faces3D;
  if (Array.isArray(entities) && entities.length > 0 && entities[0] && Array.isArray(entities[0].vertices)) {
    faces3D = entities;
  } else if (entities && Array.isArray(entities.faces)) {
    faces3D = entities.faces;
  } else if (options.multiStory && Array.isArray(options.documents)) {
    faces3D = buildMultiStoryMassing3DModel(options.documents, options);
  } else if (Array.isArray(entities) && entities.length > 0 && entities[0] && Array.isArray(entities[0].entities)) {
    faces3D = buildMultiStoryMassing3DModel(entities, options);
  } else {
    faces3D = buildMassing3DModel(entities, options);
  }

  const width = options.width || 800;
  const height = options.height || 600;

  const cam = {
    azimuth: camera.azimuth ?? 45,
    elevation: camera.elevation ?? 35.264,
    zoom: camera.zoom || (faces3D.storyCount > 1 ? Math.max(15, 32 / (faces3D.storyCount * 0.7)) : 32),
    panX: camera.panX || width / 2,
    panY: camera.panY || (faces3D.storyCount > 1 ? height / 2 + 80 : height / 2 + 50)
  };

  const sortedFaces = projectAndSortFaces(faces3D, cam);

  const polygonsMarkup = sortedFaces.map(f => {
    const pointsAttr = f.points.map(pt => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
    const op = f.opacity < 1 ? ` opacity="${f.opacity}"` : '';
    return `    <polygon points="${pointsAttr}" fill="${f.color}" stroke="${f.stroke}" stroke-width="1.2" stroke-linejoin="round"${op} />`;
  }).join('\n');

  const title = options.title || camera.title || '';
  const titleMarkup = title
    ? `  <text id="massing-title" x="24" y="36" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${title}</text>\n`
    : '';

  const metricsMarkup = (faces3D.storyCount && faces3D.storyCount > 1)
    ? `  <text id="massing-metrics" x="24" y="56" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">${faces3D.storyCount} Stories · Total H: ${faces3D.totalHeight}m · GFA: ${faces3D.grossFloorArea}m²</text>\n`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#0f172a" />
${titleMarkup}${metricsMarkup}  <g class="massing-faces">
${polygonsMarkup}
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Phase 9: Rhino Computational NURBS Curve & Surface Evaluator
// ---------------------------------------------------------------------------

/**
 * Generates a standard clamped uniform knot vector for n+1 control points and degree p.
 * Length = n + p + 2.
 * @param {number} n - Last index of control points (count - 1)
 * @param {number} p - Degree of the curve
 * @returns {Array<number>} Knot vector clamped to [0, 1]
 */
export function generateClampedKnotVector(n, p) {
  const m = n + p + 1;
  const knots = new Array(m + 1);
  for (let i = 0; i <= p; i++) knots[i] = 0;
  const interior = m - 2 * p;
  for (let i = 1; i < interior; i++) {
    knots[p + i] = i / interior;
  }
  for (let i = m - p; i <= m; i++) knots[i] = 1;
  return knots;
}

/**
 * Evaluates a 2D or 3D NURBS / B-Spline curve at parameter t in [0, 1] using Cox-de Boor's algorithm.
 *
 * @param {Array<Object>} controlPoints - Array of point objects ({x, y} or {x, y, z})
 * @param {number} [degree=3] - Degree of the spline (default cubic)
 * @param {number} t - Parameter in [0, 1]
 * @param {Array<number>} [customKnots=null] - Optional custom knot vector
 * @returns {Object} Evaluated point {x, y, z}
 */
export function evaluateNurbsCurve(controlPoints = [], degree = 3, t = 0, customKnots = null) {
  if (!Array.isArray(controlPoints) || controlPoints.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  if (controlPoints.length === 1) {
    const pt = controlPoints[0];
    return { x: pt.x || 0, y: pt.y || 0, z: pt.z || 0 };
  }

  const p = Math.min(degree, controlPoints.length - 1);
  const n = controlPoints.length - 1;
  const knots = Array.isArray(customKnots) && customKnots.length === (n + p + 2)
    ? customKnots
    : generateClampedKnotVector(n, p);

  // Clamp t to [0, 1]
  const clampedT = Math.max(0, Math.min(1, t));

  // Find knot span k such that knots[k] <= clampedT < knots[k+1]
  let k = n;
  for (let i = p; i <= n; i++) {
    if (clampedT >= knots[i] && clampedT < knots[i + 1]) {
      k = i;
      break;
    }
  }
  if (clampedT >= 1) k = n;

  // Initialize de Boor working array d[0..p]
  const d = [];
  for (let j = 0; j <= p; j++) {
    const cp = controlPoints[k - p + j] || controlPoints[n];
    d[j] = {
      x: cp.x || 0,
      y: cp.y || 0,
      z: cp.z || 0
    };
  }

  // de Boor recursion
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const idx = k - p + j;
      const denom = knots[idx + p - r + 1] - knots[idx];
      const alpha = denom > 1e-9 ? (clampedT - knots[idx]) / denom : 0;
      d[j] = {
        x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
        y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
        z: (1 - alpha) * d[j - 1].z + alpha * d[j].z
      };
    }
  }

  return {
    x: Number(d[p].x.toFixed(4)),
    y: Number(d[p].y.toFixed(4)),
    z: Number(d[p].z.toFixed(4))
  };
}

/**
 * Evaluates a tensor-product NURBS / B-Spline surface at parameters (u, v) in [0, 1] x [0, 1].
 *
 * @param {Array<Array<Object>>} controlGrid - 2D grid of control points [row][col]
 * @param {number} [degreeU=3] - Degree along U axis
 * @param {number} [degreeV=3] - Degree along V axis
 * @param {number} u - Parameter along U [0, 1]
 * @param {number} v - Parameter along V [0, 1]
 * @returns {Object} Evaluated surface point {x, y, z}
 */
export function evaluateNurbsSurface(controlGrid = [], degreeU = 3, degreeV = 3, u = 0, v = 0) {
  if (!Array.isArray(controlGrid) || controlGrid.length === 0 || !Array.isArray(controlGrid[0])) {
    return { x: 0, y: 0, z: 0 };
  }

  // Evaluate each row along U to get intermediate column control points
  const intermediateCol = controlGrid.map(row => evaluateNurbsCurve(row, degreeU, u));

  // Evaluate column along V
  return evaluateNurbsCurve(intermediateCol, degreeV, v);
}

/**
 * Tessellates a NURBS surface into 3D quad faces ready for 3D projection & rendering.
 *
 * @param {Array<Array<Object>>} controlGrid - 2D grid of control points
 * @param {Object} [options]
 * @param {number} [options.samplesU=8] - Subdivision steps in U
 * @param {number} [options.samplesV=8] - Subdivision steps in V
 * @param {string} [options.color='#38bdf8'] - Face fill color
 * @param {string} [options.stroke='#0284c7'] - Edge wireframe color
 * @returns {Array<Object>} 3D quad faces array
 */
export function tessellateNurbsSurface(controlGrid = [], options = {}) {
  if (!Array.isArray(controlGrid) || controlGrid.length === 0 || !Array.isArray(controlGrid[0])) {
    return [];
  }

  const su = options.samplesU || 8;
  const sv = options.samplesV || 8;
  const color = options.color || '#38bdf8';
  const stroke = options.stroke || '#0284c7';
  const opacity = options.opacity || 0.85;

  const grid = [];
  for (let i = 0; i <= su; i++) {
    const row = [];
    const u = i / su;
    for (let j = 0; j <= sv; j++) {
      const v = j / sv;
      row.push(evaluateNurbsSurface(controlGrid, options.degreeU || 3, options.degreeV || 3, u, v));
    }
    grid.push(row);
  }

  const faces = [];
  for (let i = 0; i < su; i++) {
    for (let j = 0; j < sv; j++) {
      const p0 = grid[i][j];
      const p1 = grid[i + 1][j];
      const p2 = grid[i + 1][j + 1];
      const p3 = grid[i][j + 1];

      faces.push({
        vertices: [
          { x: p0.x, y: p0.y, z: p0.z },
          { x: p1.x, y: p1.y, z: p1.z },
          { x: p2.x, y: p2.y, z: p2.z },
          { x: p3.x, y: p3.y, z: p3.z }
        ],
        color,
        stroke,
        opacity,
        type: 'nurbs_surface'
      });
    }
  }

  return faces;
}

