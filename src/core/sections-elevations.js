/**
 * Architecture Helping Hand - Orthographic Sections & Elevations Engine
 * Zero-dependency architectural projection and section-slicing engine.
 * Generates orthographic building elevations (North, South, East, West) and
 * cross-sectional building cuts with architectural pochè, level datums,
 * ground grade linework, fenestration details, and vertical dimension strings.
 */

import { requireFiniteNumber } from './calculator.js';
import { intersectSegments, pointInPolygon, calcPolygon } from './geometry.js';
import { wallOpenings, wallLength, generateEntityId, createSectionCut } from './entities.js';

export { createSectionCut };

export const ELEVATION_DIRECTIONS = Object.freeze({
  south: { id: 'south', label: 'South Elevation (Front)', axis: 'x', sign: 1, viewDir: [0, 1] },
  north: { id: 'north', label: 'North Elevation (Rear)', axis: 'x', sign: -1, viewDir: [0, -1] },
  east: { id: 'east', label: 'East Elevation (Right)', axis: 'y', sign: 1, viewDir: [-1, 0] },
  west: { id: 'west', label: 'West Elevation (Left)', axis: 'y', sign: -1, viewDir: [1, 0] }
});

/**
 * Helper to normalize input into an array of story objects with elevations.
 */
function normalizeStories(entitiesOrDocs, defaultStoryHeight = 3.0) {
  if (!entitiesOrDocs) return [];

  // Case 1: Array of document tabs
  if (Array.isArray(entitiesOrDocs) && entitiesOrDocs.some(d => d && (d.type === '2d_plan' || d.type === '2d' || Array.isArray(d.entities)))) {
    const planDocs = entitiesOrDocs.filter(d => d && (d.type === '2d_plan' || d.type === '2d' || (!d.type && Array.isArray(d.entities))));
    if (planDocs.length > 0) {
      let currentZ = 0;
      return planDocs.map((doc, idx) => {
        const h = typeof doc.storyHeight === 'number' && doc.storyHeight > 0 ? doc.storyHeight : defaultStoryHeight;
        const story = {
          name: doc.name || `Level ${idx + 1}`,
          index: idx,
          baseElevation: currentZ,
          height: h,
          topElevation: currentZ + h,
          entities: Array.isArray(doc.entities) ? doc.entities : []
        };
        currentZ += h;
        return story;
      });
    }
  }

  // Case 2: Direct array of entities (single story)
  const list = Array.isArray(entitiesOrDocs)
    ? entitiesOrDocs
    : (entitiesOrDocs && Array.isArray(entitiesOrDocs.entities) ? entitiesOrDocs.entities : []);

  return [{
    name: 'Ground Floor',
    index: 0,
    baseElevation: 0,
    height: defaultStoryHeight,
    topElevation: defaultStoryHeight,
    entities: list
  }];
}

/**
 * Calculates project bounding limits in world meters across all stories.
 */
function computeBuildingLimits(stories) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasEntities = false;

  for (const s of stories) {
    for (const e of s.entities) {
      if (!e) continue;
      if (e.kind === 'wall' && typeof e.x1 === 'number') {
        minX = Math.min(minX, e.x1, e.x2);
        minY = Math.min(minY, e.y1, e.y2);
        maxX = Math.max(maxX, e.x1, e.x2);
        maxY = Math.max(maxY, e.y1, e.y2);
        hasEntities = true;
      } else if (typeof e.x === 'number' && typeof e.y === 'number') {
        const w = e.width || (e.radius ? e.radius * 2 : 1);
        const d = e.depth || (e.radius ? e.radius * 2 : 1);
        minX = Math.min(minX, e.x);
        minY = Math.min(minY, e.y);
        maxX = Math.max(maxX, e.x + w);
        maxY = Math.max(maxY, e.y + d);
        hasEntities = true;
      }
    }
  }

  if (!hasEntities) {
    return { minX: 0, minY: 0, maxX: 12, maxY: 10, width: 12, depth: 10 };
  }

  return {
    minX, minY, maxX, maxY,
    width: Math.max(1, maxX - minX),
    depth: Math.max(1, maxY - minY)
  };
}

/**
 * Maps a 2D world coordinate (x, y) to a horizontal elevation axis U
 * according to the cardinal elevation direction.
 */
function mapWorldToElevationU(x, y, dirKey, limits) {
  switch (dirKey) {
    case 'north':
      // Looking from North towards South (-Y). Invert X so Left is East, Right is West.
      return limits.maxX - x;
    case 'east':
      // Looking from East towards West (-X). Horizontal axis is Y.
      return y - limits.minY;
    case 'west':
      // Looking from West towards East (+X). Invert Y so Left is North, Right is South.
      return limits.maxY - y;
    case 'south':
    default:
      // Looking from South towards North (+Y). Horizontal axis is X.
      return x - limits.minX;
  }
}

/**
 * Generates an orthographic Building Elevation model.
 *
 * @param {Array<Object>} entitiesOrDocs - Floor plan entities or array of document tabs
 * @param {'south'|'north'|'east'|'west'} [direction='south'] - Elevation direction
 * @param {Object} [options]
 * @param {number} [options.storyHeight=3.0]
 * @returns {Object} Elevation projection model
 */
export function generateBuildingElevation(entitiesOrDocs, direction = 'south', options = {}) {
  const dirKey = (direction in ELEVATION_DIRECTIONS) ? direction : 'south';
  const defaultStoryH = typeof options.storyHeight === 'number' && options.storyHeight > 0 ? options.storyHeight : 3.0;
  const stories = normalizeStories(entitiesOrDocs, defaultStoryH);
  const limits = computeBuildingLimits(stories);

  // Total building height
  const totalHeight = stories.length > 0 ? stories[stories.length - 1].topElevation : defaultStoryH;

  // Horizontal span along projection axis
  let elevationSpan = (dirKey === 'south' || dirKey === 'north') ? limits.width : limits.depth;
  elevationSpan = Math.max(2, elevationSpan);

  const projectedWalls = [];
  const projectedOpenings = [];
  const projectedColumns = [];
  const datums = [];

  // 1. Build Level Datums
  stories.forEach((s) => {
    datums.push({
      name: s.name.toUpperCase(),
      elevation: s.baseElevation,
      label: `EL +${s.baseElevation.toFixed(2)}m`,
      u1: -1.0,
      u2: elevationSpan + 2.0
    });
  });
  // Top Roof Datum
  datums.push({
    name: 'ROOF',
    elevation: totalHeight,
    label: `EL +${totalHeight.toFixed(2)}m`,
    u1: -1.0,
    u2: elevationSpan + 2.0
  });

  // 2. Process each story
  stories.forEach((story) => {
    const baseZ = story.baseElevation;
    const wallH = story.height;
    const entities = story.entities || [];

    const walls = entities.filter(e => e && e.kind === 'wall');
    const columns = entities.filter(e => e && e.kind === 'column');

    for (const w of walls) {
      if (typeof w.x1 !== 'number' || typeof w.x2 !== 'number') continue;

      const u1 = mapWorldToElevationU(w.x1, w.y1, dirKey, limits);
      const u2 = mapWorldToElevationU(w.x2, w.y2, dirKey, limits);
      const minU = Math.min(u1, u2);
      const maxU = Math.max(u1, u2);
      const width = Math.max(0.1, maxU - minU);

      // Determine face orientation visibility
      // South elevation looks at walls with normal pointing south (dy < 0 or horizontal)
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const len = Math.hypot(dx, dy);
      if (len < 0.05) continue;

      projectedWalls.push({
        id: w.id,
        wallAssembly: w.assembly || 'standard',
        u: minU,
        z: baseZ,
        width,
        height: wallH,
        u1: minU,
        u2: maxU,
        z1: baseZ,
        z2: baseZ + wallH,
        storyIndex: story.index
      });

      // Project hosted openings (doors and windows)
      const openings = wallOpenings(w, entities);
      for (const op of openings) {
        const opPos = typeof op.position === 'number' ? op.position : (typeof op.offset === 'number' ? op.offset : 0);
        const offsetRatio = opPos / len;
        const opWidth = op.width || 0.9;
        const opWidthRatio = opWidth / len;

        const opU1 = minU + offsetRatio * width;
        const opU2 = opU1 + opWidthRatio * width;
        const opMinU = Math.min(opU1, opU2);
        const opW = Math.abs(opU2 - opU1);

        if (op.kind === 'door') {
          const doorH = op.height || 2.1;
          projectedOpenings.push({
            id: op.id,
            kind: 'door',
            wallId: w.id,
            u: opMinU,
            z: baseZ,
            width: opW,
            height: doorH,
            storyIndex: story.index
          });
        } else if (op.kind === 'window') {
          const sillH = op.sill || 0.9;
          const winH = op.height || 1.2;
          projectedOpenings.push({
            id: op.id,
            kind: 'window',
            wallId: w.id,
            u: opMinU,
            z: baseZ + sillH,
            width: opW,
            height: winH,
            storyIndex: story.index
          });
        }
      }
    }

    // Project columns
    for (const c of columns) {
      if (typeof c.x !== 'number' || typeof c.y !== 'number') continue;
      const colU = mapWorldToElevationU(c.x, c.y, dirKey, limits);
      const colW = c.width || (c.radius ? c.radius * 2 : 0.4);
      projectedColumns.push({
        id: c.id,
        name: c.name || 'Col',
        u: colU - colW / 2,
        z: baseZ,
        width: colW,
        height: wallH,
        storyIndex: story.index
      });
    }
  });

  // 3. Ground line & Earth Grade
  const groundLine = {
    u1: -2.0,
    u2: elevationSpan + 2.0,
    z: 0.0,
    earthDepth: 1.2
  };

  // 4. Vertical Dimension Strings
  const dimensions = [];
  stories.forEach((s) => {
    dimensions.push({
      label: `${s.height.toFixed(2)}m`,
      z1: s.baseElevation,
      z2: s.topElevation,
      u: elevationSpan + 0.8
    });
  });
  if (stories.length > 1) {
    dimensions.push({
      label: `TOTAL ${totalHeight.toFixed(2)}m`,
      z1: 0,
      z2: totalHeight,
      u: elevationSpan + 1.8
    });
  }

  return {
    direction: dirKey,
    title: ELEVATION_DIRECTIONS[dirKey].label,
    limits,
    span: elevationSpan,
    totalHeight,
    stories,
    walls: projectedWalls,
    openings: projectedOpenings,
    columns: projectedColumns,
    datums,
    dimensions,
    groundLine
  };
}

/**
 * Generates an architectural Building Section model along a cut plane line.
 *
 * @param {Array<Object>} entitiesOrDocs - Floor plan entities or array of document tabs
 * @param {Object} [sectionCut] - Section cut parameters or 'section_cut' entity
 * @param {Object} [options]
 * @returns {Object} Section cut model with cut pochè, slabs, background projection, and datums
 */
export function generateBuildingSection(entitiesOrDocs, sectionCut = {}, options = {}) {
  const defaultStoryH = typeof options.storyHeight === 'number' && options.storyHeight > 0 ? options.storyHeight : 3.0;
  const slabThickness = typeof options.slabThickness === 'number' && options.slabThickness > 0 ? options.slabThickness : 0.25;
  const stories = normalizeStories(entitiesOrDocs, defaultStoryH);
  const limits = computeBuildingLimits(stories);
  const totalHeight = stories.length > 0 ? stories[stories.length - 1].topElevation : defaultStoryH;

  // Determine section cut line in world coordinates
  let p1 = { x: limits.minX - 1.0, y: limits.minY + limits.depth / 2 };
  let p2 = { x: limits.maxX + 1.0, y: limits.minY + limits.depth / 2 };
  let sectionLabel = 'A';

  if (sectionCut && sectionCut.p1 && sectionCut.p2) {
    p1 = { x: sectionCut.p1.x, y: sectionCut.p1.y };
    p2 = { x: sectionCut.p2.x, y: sectionCut.p2.y };
    if (sectionCut.label) sectionLabel = sectionCut.label;
  } else if (typeof sectionCut.coord === 'number') {
    p1 = { x: limits.minX - 1.0, y: sectionCut.coord };
    p2 = { x: limits.maxX + 1.0, y: sectionCut.coord };
  }

  const cutVector = { x: p2.x - p1.x, y: p2.y - p1.y };
  const cutLength = Math.hypot(cutVector.x, cutVector.y) || 1;
  const cutUnit = { x: cutVector.x / cutLength, y: cutVector.y / cutLength };

  // Function to project world point along cut line axis U
  function worldToCutU(x, y) {
    return (x - p1.x) * cutUnit.x + (y - p1.y) * cutUnit.y;
  }

  const cutWalls = [];
  const cutSlabs = [];
  const cutOpenings = [];
  const backgroundWalls = [];
  const datums = [];

  // 1. Build Level Datums
  stories.forEach((s) => {
    datums.push({
      name: s.name.toUpperCase(),
      elevation: s.baseElevation,
      label: `EL +${s.baseElevation.toFixed(2)}m`,
      u1: -1.0,
      u2: cutLength + 1.0
    });
  });
  datums.push({
    name: 'ROOF SLAB',
    elevation: totalHeight,
    label: `EL +${totalHeight.toFixed(2)}m`,
    u1: -1.0,
    u2: cutLength + 1.0
  });

  // 2. Intersect walls on each story with section cut line
  stories.forEach((story) => {
    const baseZ = story.baseElevation;
    const wallH = story.height;
    const entities = story.entities || [];
    const walls = entities.filter(e => e && e.kind === 'wall');

    // Structural floor slab for this story spanning cut extent
    cutSlabs.push({
      storyIndex: story.index,
      name: `${story.name} Slab`,
      u1: 0.5,
      u2: cutLength - 0.5,
      z1: baseZ - slabThickness,
      z2: baseZ,
      thickness: slabThickness
    });

    for (const w of walls) {
      if (typeof w.x1 !== 'number' || typeof w.x2 !== 'number') continue;
      const wallSeg = { p1: { x: w.x1, y: w.y1 }, p2: { x: w.x2, y: w.y2 } };

      const hit = intersectSegments(p1, p2, wallSeg.p1, wallSeg.p2);
      const wThick = w.thickness || 0.20;

      if (hit) {
        // Cut wall slice
        const hitU = worldToCutU(hit.x, hit.y);
        const wLen = wallLength(w) || 1;
        const openings = wallOpenings(w, entities);

        // Check if cut passed directly through an opening
        const hitOffset = Math.hypot(hit.x - w.x1, hit.y - w.y1);
        const hitOpening = openings.find(op => {
          const p = typeof op.position === 'number' ? op.position : (typeof op.offset === 'number' ? op.offset : 0);
          return hitOffset >= p && hitOffset <= (p + (op.width || 0.9));
        });

        if (hitOpening) {
          if (hitOpening.kind === 'door') {
            const doorH = hitOpening.height || 2.1;
            // Cut door: open from floor to door height, cut lintel header above
            cutOpenings.push({
              id: hitOpening.id,
              kind: 'door',
              u: hitU - wThick / 2,
              z: baseZ,
              thickness: wThick,
              height: doorH,
              storyIndex: story.index
            });
            cutWalls.push({
              id: w.id,
              isHeader: true,
              u: hitU - wThick / 2,
              z: baseZ + doorH,
              thickness: wThick,
              height: wallH - doorH,
              storyIndex: story.index
            });
          } else if (hitOpening.kind === 'window') {
            const sillH = hitOpening.sill || 0.9;
            const winH = hitOpening.height || 1.2;
            // Cut window: cut sill below, opening/glazing in middle, cut lintel above
            cutWalls.push({
              id: w.id,
              isSill: true,
              u: hitU - wThick / 2,
              z: baseZ,
              thickness: wThick,
              height: sillH,
              storyIndex: story.index
            });
            cutOpenings.push({
              id: hitOpening.id,
              kind: 'window',
              u: hitU - wThick / 2,
              z: baseZ + sillH,
              thickness: wThick,
              height: winH,
              storyIndex: story.index
            });
            cutWalls.push({
              id: w.id,
              isHeader: true,
              u: hitU - wThick / 2,
              z: baseZ + sillH + winH,
              thickness: wThick,
              height: wallH - (sillH + winH),
              storyIndex: story.index
            });
          }
        } else {
          // Solid wall cut slice (POCHÈ)
          cutWalls.push({
            id: w.id,
            isSolid: true,
            u: hitU - wThick / 2,
            z: baseZ,
            thickness: wThick,
            height: wallH,
            storyIndex: story.index
          });
        }
      } else {
        // Wall is in projection (background elevation)
        const u1 = worldToCutU(w.x1, w.y1);
        const u2 = worldToCutU(w.x2, w.y2);
        const minU = Math.min(u1, u2);
        const maxU = Math.max(u1, u2);
        if (maxU >= 0 && minU <= cutLength) {
          backgroundWalls.push({
            id: w.id,
            u: Math.max(0, minU),
            z: baseZ,
            width: Math.min(cutLength, maxU) - Math.max(0, minU),
            height: wallH,
            storyIndex: story.index
          });
        }
      }
    }
  });

  // Top roof slab cap
  cutSlabs.push({
    storyIndex: stories.length,
    name: 'Roof Slab Cap',
    u1: 0.5,
    u2: cutLength - 0.5,
    z1: totalHeight,
    z2: totalHeight + slabThickness,
    thickness: slabThickness
  });

  // 3. Ground grade linework
  const groundLine = {
    u1: -1.5,
    u2: cutLength + 1.5,
    z: 0.0,
    earthDepth: 1.2
  };

  // 4. Vertical Dimensions (clear height, slab, total)
  const dimensions = [];
  stories.forEach((s) => {
    dimensions.push({
      label: `CLR ${(s.height - slabThickness).toFixed(2)}m`,
      z1: s.baseElevation,
      z2: s.baseElevation + s.height - slabThickness,
      u: cutLength + 0.6
    });
  });
  dimensions.push({
    label: `TOTAL ${totalHeight.toFixed(2)}m`,
    z1: 0,
    z2: totalHeight,
    u: cutLength + 1.4
  });

  return {
    sectionLabel,
    title: `Section ${sectionLabel}-${sectionLabel}`,
    p1,
    p2,
    cutLength,
    totalHeight,
    stories,
    cutWalls,
    cutSlabs,
    cutOpenings,
    backgroundWalls,
    datums,
    dimensions,
    groundLine
  };
}

/**
 * Generates standalone clean SVG markup for a Building Elevation.
 */
export function generateElevationSVG(elevationModelOrEntities, direction = 'south', options = {}) {
  const model = (elevationModelOrEntities && elevationModelOrEntities.walls && elevationModelOrEntities.datums)
    ? elevationModelOrEntities
    : generateBuildingElevation(elevationModelOrEntities, direction, options);

  const scale = options.scale || 40; // pixels per meter
  const marginX = 80;
  const marginY = 60;

  const contentW = (model.span + 4.0) * scale;
  const contentH = (model.totalHeight + 3.0) * scale;
  const svgW = contentW + marginX * 2;
  const svgH = contentH + marginY * 2;

  // Coordinate mapper: world meters (u, z) to screen pixels (sx, sy)
  function toSvg(u, z) {
    const sx = marginX + (u + 2.0) * scale;
    const sy = svgH - marginY - (z + 1.2) * scale;
    return { sx, sy };
  }

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW.toFixed(0)} ${svgH.toFixed(0)}" width="100%" height="100%" style="background:#0f172a; font-family:'Segoe UI',system-ui,sans-serif;">`);

  // Defs & Patterns (Earth hatching)
  parts.push(`
    <defs>
      <pattern id="earth-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="12" stroke="#475569" stroke-width="1.2" opacity="0.6"/>
      </pattern>
    </defs>
  `);

  // 1. Earth / Grade Hatch
  const gP1 = toSvg(model.groundLine.u1, 0);
  const gP2 = toSvg(model.groundLine.u2, 0);
  const earthP = toSvg(model.groundLine.u1, -model.groundLine.earthDepth);
  const earthH = Math.abs(earthP.sy - gP1.sy);
  parts.push(`<rect x="${gP1.sx.toFixed(1)}" y="${gP1.sy.toFixed(1)}" width="${(gP2.sx - gP1.sx).toFixed(1)}" height="${earthH.toFixed(1)}" fill="url(#earth-hatch)"/>`);
  parts.push(`<line x1="${gP1.sx.toFixed(1)}" y1="${gP1.sy.toFixed(1)}" x2="${gP2.sx.toFixed(1)}" y2="${gP2.sy.toFixed(1)}" stroke="#94a3b8" stroke-width="2.5"/>`);

  // 2. Projected Exterior Walls
  for (const w of model.walls) {
    const pTopLeft = toSvg(w.u, w.z + w.height);
    const wPx = w.width * scale;
    const hPx = w.height * scale;
    parts.push(`<rect x="${pTopLeft.sx.toFixed(1)}" y="${pTopLeft.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.8"/>`);
  }

  // 3. Projected Columns
  for (const c of model.columns) {
    const pTop = toSvg(c.u, c.z + c.height);
    const colW = c.width * scale;
    const colH = c.height * scale;
    parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${colW.toFixed(1)}" height="${colH.toFixed(1)}" fill="#334155" stroke="#94a3b8" stroke-width="1.4"/>`);
  }

  // 4. Projected Openings (Doors and Windows)
  for (const op of model.openings) {
    const pTop = toSvg(op.u, op.z + op.height);
    const opW = op.width * scale;
    const opH = op.height * scale;

    if (op.kind === 'door') {
      // Door frame & panel
      parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="#78350f" stroke="#fbbf24" stroke-width="1.5"/>`);
      parts.push(`<circle cx="${(pTop.sx + opW * 0.85).toFixed(1)}" cy="${(pTop.sy + opH * 0.5).toFixed(1)}" r="2" fill="#fbbf24"/>`);
    } else if (op.kind === 'window') {
      // Window frame & tinted glass
      parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="#0369a1" fill-opacity="0.45" stroke="#38bdf8" stroke-width="1.5"/>`);
      // Vertical mullion
      if (opW > 30) {
        parts.push(`<line x1="${(pTop.sx + opW / 2).toFixed(1)}" y1="${pTop.sy.toFixed(1)}" x2="${(pTop.sx + opW / 2).toFixed(1)}" y2="${(pTop.sy + opH).toFixed(1)}" stroke="#38bdf8" stroke-width="1"/>`);
      }
    }
  }

  // 5. Level Datums
  for (const d of model.datums) {
    const pt1 = toSvg(d.u1, d.elevation);
    const pt2 = toSvg(d.u2, d.elevation);
    // Datum line
    parts.push(`<line x1="${pt1.sx.toFixed(1)}" y1="${pt1.sy.toFixed(1)}" x2="${pt2.sx.toFixed(1)}" y2="${pt2.sy.toFixed(1)}" stroke="#a855f7" stroke-width="1" stroke-dasharray="8 4 2 4" opacity="0.75"/>`);
    // Elevation target bubble
    const targetX = pt2.sx + 16;
    const targetY = pt2.sy;
    parts.push(`<circle cx="${targetX.toFixed(1)}" cy="${targetY.toFixed(1)}" r="8" fill="#1e1b4b" stroke="#a855f7" stroke-width="1.5"/>`);
    parts.push(`<line x1="${(targetX - 8).toFixed(1)}" y1="${targetY.toFixed(1)}" x2="${(targetX + 8).toFixed(1)}" y2="${targetY.toFixed(1)}" stroke="#a855f7" stroke-width="1"/>`);
    parts.push(`<line x1="${targetX.toFixed(1)}" y1="${(targetY - 8).toFixed(1)}" x2="${targetX.toFixed(1)}" y2="${(targetY + 8).toFixed(1)}" stroke="#a855f7" stroke-width="1"/>`);
    // Text label
    parts.push(`<text x="${(targetX + 14).toFixed(1)}" y="${(targetY - 2).toFixed(1)}" fill="#e2e8f0" font-size="11" font-weight="700">${d.name}</text>`);
    parts.push(`<text x="${(targetX + 14).toFixed(1)}" y="${(targetY + 11).toFixed(1)}" fill="#c084fc" font-size="10" font-family="monospace">${d.label}</text>`);
  }

  // 6. Title and Drawing Label
  parts.push(`<text x="${marginX}" y="36" fill="#f8fafc" font-size="16" font-weight="700" letter-spacing="1">${model.title.toUpperCase()}</text>`);
  parts.push(`<text x="${marginX}" y="52" fill="#94a3b8" font-size="11">SCALE 1:${(1000 / scale).toFixed(0)} · ALL LEVELS ORTHOGRAPHIC PROJECTION</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

/**
 * Generates standalone clean SVG markup for a Building Section Cut.
 */
export function generateSectionSVG(sectionModelOrEntities, sectionCut, options = {}) {
  const model = (sectionModelOrEntities && sectionModelOrEntities.cutWalls && sectionModelOrEntities.cutSlabs)
    ? sectionModelOrEntities
    : generateBuildingSection(sectionModelOrEntities, sectionCut, options);

  const scale = options.scale || 40;
  const marginX = 80;
  const marginY = 60;

  const contentW = (model.cutLength + 4.0) * scale;
  const contentH = (model.totalHeight + 3.0) * scale;
  const svgW = contentW + marginX * 2;
  const svgH = contentH + marginY * 2;

  function toSvg(u, z) {
    const sx = marginX + (u + 1.5) * scale;
    const sy = svgH - marginY - (z + 1.2) * scale;
    return { sx, sy };
  }

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW.toFixed(0)} ${svgH.toFixed(0)}" width="100%" height="100%" style="background:#0f172a; font-family:'Segoe UI',system-ui,sans-serif;">`);

  // Defs & Pochè Pattern
  parts.push(`
    <defs>
      <pattern id="poche-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#f87171" stroke-width="1.2" opacity="0.5"/>
      </pattern>
      <pattern id="concrete-slab-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="10" y2="10" stroke="#94a3b8" stroke-width="0.8" opacity="0.3"/>
        <line x1="10" y1="0" x2="0" y2="10" stroke="#94a3b8" stroke-width="0.8" opacity="0.3"/>
      </pattern>
    </defs>
  `);

  // 1. Earth & Grade
  const gP1 = toSvg(model.groundLine.u1, 0);
  const gP2 = toSvg(model.groundLine.u2, 0);
  parts.push(`<line x1="${gP1.sx.toFixed(1)}" y1="${gP1.sy.toFixed(1)}" x2="${gP2.sx.toFixed(1)}" y2="${gP2.sy.toFixed(1)}" stroke="#94a3b8" stroke-width="2.5"/>`);

  // 2. Background Projection Walls
  for (const bw of model.backgroundWalls) {
    const pTop = toSvg(bw.u, bw.z + bw.height);
    const wPx = bw.width * scale;
    const hPx = bw.height * scale;
    parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="#1e293b" fill-opacity="0.4" stroke="#475569" stroke-width="1" stroke-dasharray="4 2"/>`);
  }

  // 3. Cut Slabs (Structural Concrete Floor Slabs)
  for (const sl of model.cutSlabs) {
    const pTop = toSvg(sl.u1, sl.z2);
    const wPx = (sl.u2 - sl.u1) * scale;
    const hPx = (sl.z2 - sl.z1) * scale;
    parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="#334155" stroke="#cbd5e1" stroke-width="1.8"/>`);
    parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="url(#concrete-slab-hatch)"/>`);
  }

  // 4. Cut Walls (POCHÈ)
  for (const cw of model.cutWalls) {
    const pTop = toSvg(cw.u, cw.z + cw.height);
    const wPx = cw.thickness * scale;
    const hPx = cw.height * scale;
    // Heavy Pochè Fill
    parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="#ef4444" fill-opacity="0.25" stroke="#f87171" stroke-width="2.2"/>`);
    parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="url(#poche-hatch)"/>`);
  }

  // 5. Cut Openings
  for (const co of model.cutOpenings) {
    const pTop = toSvg(co.u, co.z + co.height);
    const wPx = co.thickness * scale;
    const hPx = co.height * scale;
    if (co.kind === 'window') {
      // Cut double-glazing slice
      parts.push(`<rect x="${pTop.sx.toFixed(1)}" y="${pTop.sy.toFixed(1)}" width="${wPx.toFixed(1)}" height="${hPx.toFixed(1)}" fill="#0284c7" fill-opacity="0.3" stroke="#38bdf8" stroke-width="1.2"/>`);
      parts.push(`<line x1="${(pTop.sx + wPx / 2).toFixed(1)}" y1="${pTop.sy.toFixed(1)}" x2="${(pTop.sx + wPx / 2).toFixed(1)}" y2="${(pTop.sy + hPx).toFixed(1)}" stroke="#38bdf8" stroke-width="1.5"/>`);
    }
  }

  // 6. Level Datums
  for (const d of model.datums) {
    const pt1 = toSvg(d.u1, d.elevation);
    const pt2 = toSvg(d.u2, d.elevation);
    parts.push(`<line x1="${pt1.sx.toFixed(1)}" y1="${pt1.sy.toFixed(1)}" x2="${pt2.sx.toFixed(1)}" y2="${pt2.sy.toFixed(1)}" stroke="#a855f7" stroke-width="1" stroke-dasharray="8 4 2 4" opacity="0.75"/>`);
    const targetX = pt2.sx + 16;
    const targetY = pt2.sy;
    parts.push(`<circle cx="${targetX.toFixed(1)}" cy="${targetY.toFixed(1)}" r="8" fill="#1e1b4b" stroke="#a855f7" stroke-width="1.5"/>`);
    parts.push(`<line x1="${(targetX - 8).toFixed(1)}" y1="${targetY.toFixed(1)}" x2="${(targetX + 8).toFixed(1)}" y2="${targetY.toFixed(1)}" stroke="#a855f7" stroke-width="1"/>`);
    parts.push(`<line x1="${targetX.toFixed(1)}" y1="${(targetY - 8).toFixed(1)}" x2="${targetX.toFixed(1)}" y2="${(targetY + 8).toFixed(1)}" stroke="#a855f7" stroke-width="1"/>`);
    parts.push(`<text x="${(targetX + 14).toFixed(1)}" y="${(targetY - 2).toFixed(1)}" fill="#e2e8f0" font-size="11" font-weight="700">${d.name}</text>`);
    parts.push(`<text x="${(targetX + 14).toFixed(1)}" y="${(targetY + 11).toFixed(1)}" fill="#c084fc" font-size="10" font-family="monospace">${d.label}</text>`);
  }

  // 7. Title & Metadata
  parts.push(`<text x="${marginX}" y="36" fill="#f8fafc" font-size="16" font-weight="700" letter-spacing="1">${model.title.toUpperCase()}</text>`);
  parts.push(`<text x="${marginX}" y="52" fill="#94a3b8" font-size="11">SCALE 1:${(1000 / scale).toFixed(0)} · ARCHITECTURAL POCHÈ SECTION</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}
