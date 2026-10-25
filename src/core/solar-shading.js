/**
 * Architecture Helping Hand — Solar Shading & Overhang Calculator
 *
 * Comprehensive passive solar design & shading calculation engine.
 * Computes:
 *   - Profile Angle (Vertical Shadow Angle / VSA, Ω)
 *   - Horizontal Shadow Angle (HSA, Θ)
 *   - Optimal overhang depth for 100% Summer Solstice cutoff
 *   - Seasonal shading percentages (Summer, Winter, Equinox)
 *   - Winter direct solar penetration depth into room
 *   - Multi-blade brise-soleil louver spacing and blade depth
 *   - Vertical side fin depths for East/West facades
 *   - 1:1 2D architectural section DXF & SVG generation with standard AIA layers
 */

import { solarPosition, solarDeclination } from './solar.js';
import { buildDXF } from './export/export-model.js';

const SHADING_DEG = Math.PI / 180;
const SHADING_RAD = 180 / Math.PI;

function shadingToNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Calculates complete passive solar shading metrics for a window and facade.
 *
 * @param {object} params
 * @param {number} params.latitudeDeg  -90..90 (North positive)
 * @param {number} [params.longitudeDeg=0] -180..180
 * @param {number} [params.timezoneOffsetHours=0]
 * @param {number} [params.facadeAzimuthDeg=180] 0..360 (0=North, 90=East, 180=South, 270=West)
 * @param {number} [params.windowHeightM=1.8] Window glazing height in meters
 * @param {number} [params.windowWidthM=2.4] Window glazing width in meters
 * @param {number} [params.sillHeightM=0.9] Window sill height from finished floor
 * @param {number} [params.headToOverhangM=0.15] Distance from top of window to overhang soffit
 * @param {number} [params.overhangDepthM] Optional specific depth; if omitted, calculates optimal depth
 * @param {number} [params.louverCount=1] Number of blades for brise-soleil (1 = solid overhang)
 * @param {number} [params.designHour=12] Hour for cutoff evaluation (default 12:00 solar noon)
 */
export function calculateSolarShading(params = {}) {
  const lat = shadingToNum(params.latitudeDeg, 32.0); // Default ~32° N
  const lon = shadingToNum(params.longitudeDeg, 0);
  const tz = shadingToNum(params.timezoneOffsetHours, 0);
  const facadeAz = shadingToNum(params.facadeAzimuthDeg, lat >= 0 ? 180 : 0); // South in North, North in South
  const winH = Math.max(0.2, shadingToNum(params.windowHeightM, 1.8));
  const winW = Math.max(0.2, shadingToNum(params.windowWidthM, 2.4));
  const sillH = Math.max(0, shadingToNum(params.sillHeightM, 0.9));
  const gapH = Math.max(0, shadingToNum(params.headToOverhangM, 0.15));
  const louvers = Math.max(1, Math.min(12, Math.round(shadingToNum(params.louverCount, 1))));
  const hour = Math.max(0, Math.min(23, Math.round(shadingToNum(params.designHour, 12))));

  const isNorthHemisphere = lat >= 0;
  const year = new Date().getFullYear();
  const summerDate = isNorthHemisphere ? `${year}-06-21` : `${year}-12-21`;
  const winterDate = isNorthHemisphere ? `${year}-12-21` : `${year}-06-21`;
  const equinoxDate = `${year}-03-21`;

  // Solar position at Summer Solstice, Winter Solstice, and Equinox
  const summerPos = solarPosition({ latitudeDeg: lat, longitudeDeg: lon, date: summerDate, hour, minute: 0, timezoneOffsetHours: tz });
  const winterPos = solarPosition({ latitudeDeg: lat, longitudeDeg: lon, date: winterDate, hour, minute: 0, timezoneOffsetHours: tz });
  const equinoxPos = solarPosition({ latitudeDeg: lat, longitudeDeg: lon, date: equinoxDate, hour, minute: 0, timezoneOffsetHours: tz });

  function calcAngles(pos) {
    if (!pos || !pos.ok || !pos.position || pos.position.altitudeDeg <= 0) {
      return { altitudeDeg: 0, azimuthDeg: 0, vsaDeg: 0, hsaDeg: 0, inFrontOfFacade: false };
    }
    const alt = pos.position.altitudeDeg;
    const az = pos.position.azimuthDeg;
    // Surface solar azimuth: angle between sun azimuth and facade normal
    let dAz = Math.abs(az - facadeAz);
    if (dAz > 180) dAz = 360 - dAz;
    const inFront = dAz < 89.9;

    let vsa = 0;
    if (inFront) {
      const cosDAz = Math.cos(dAz * SHADING_DEG);
      vsa = Math.atan(Math.tan(alt * SHADING_DEG) / Math.max(0.001, cosDAz)) * SHADING_RAD;
    }
    return {
      altitudeDeg: Math.round(alt * 100) / 100,
      azimuthDeg: Math.round(az * 100) / 100,
      vsaDeg: Math.round(Math.min(89.9, Math.max(0, vsa)) * 100) / 100,
      hsaDeg: Math.round(dAz * 100) / 100,
      inFrontOfFacade: inFront
    };
  }

  const summerAngles = calcAngles(summerPos);
  const winterAngles = calcAngles(winterPos);
  const equinoxAngles = calcAngles(equinoxPos);

  const totalShadeH = winH + gapH;

  // Optimal overhang depth for 100% summer window shading
  let optimalSummerDepthM = 0.5;
  if (summerAngles.vsaDeg > 5) {
    optimalSummerDepthM = totalShadeH / Math.tan(summerAngles.vsaDeg * SHADING_DEG);
  }
  optimalSummerDepthM = Math.round(optimalSummerDepthM * 1000) / 1000;

  // Actual overhang depth (either user specified or optimal)
  const actualDepthM = (Number.isFinite(params.overhangDepthM) && params.overhangDepthM > 0)
    ? Math.round(params.overhangDepthM * 1000) / 1000
    : optimalSummerDepthM;

  // Shading performance evaluation helper
  function evaluateShading(angles, depth) {
    if (!angles.inFrontOfFacade || angles.vsaDeg <= 0) {
      return { shadedHeightM: 0, shadePercent: 0, sunPenetrationM: 0 };
    }
    const shadowDrop = depth * Math.tan(angles.vsaDeg * SHADING_DEG);
    const shadedGlazing = Math.min(winH, Math.max(0, shadowDrop - gapH));
    const percent = Math.min(100, Math.max(0, (shadedGlazing / winH) * 100));

    // How far sun shines onto interior floor through window (if not shaded)
    let penetration = 0;
    if (percent < 100 && angles.vsaDeg > 2) {
      penetration = (winH + sillH) / Math.tan(angles.vsaDeg * SHADING_DEG) - depth;
      penetration = Math.max(0, penetration);
    }
    return {
      shadedHeightM: Math.round(shadedGlazing * 1000) / 1000,
      shadePercent: Math.round(percent * 10) / 10,
      sunPenetrationM: Math.round(penetration * 100) / 100
    };
  }

  const summerShading = evaluateShading(summerAngles, actualDepthM);
  const winterShading = evaluateShading(winterAngles, actualDepthM);
  const equinoxShading = evaluateShading(equinoxAngles, actualDepthM);

  // Multi-blade brise-soleil metrics
  const louverSpacingM = Math.round((totalShadeH / louvers) * 1000) / 1000;
  let louverBladeDepthM = actualDepthM;
  if (louvers > 1 && summerAngles.vsaDeg > 5) {
    louverBladeDepthM = Math.round((louverSpacingM / Math.tan(summerAngles.vsaDeg * SHADING_DEG)) * 1000) / 1000;
  }

  // Vertical side fin metrics (for morning/afternoon low sun cutoff)
  let verticalFinDepthM = 0.4;
  if (summerAngles.hsaDeg > 10 && summerAngles.hsaDeg < 80) {
    verticalFinDepthM = Math.round((winW * 0.4 / Math.tan(summerAngles.hsaDeg * SHADING_DEG)) * 1000) / 1000;
  }

  const isEquatorFacing = lat >= 0
    ? (facadeAz >= 135 && facadeAz <= 225)
    : (facadeAz <= 45 || facadeAz >= 315);

  return {
    inputs: {
      latitudeDeg: lat,
      longitudeDeg: lon,
      timezoneOffsetHours: tz,
      facadeAzimuthDeg: facadeAz,
      windowHeightM: winH,
      windowWidthM: winW,
      sillHeightM: sillH,
      headToOverhangM: gapH,
      overhangDepthM: actualDepthM,
      louverCount: louvers,
      designHour: hour
    },
    isEquatorFacing,
    summer: {
      date: summerDate,
      ...summerAngles,
      ...summerShading
    },
    winter: {
      date: winterDate,
      ...winterAngles,
      ...winterShading
    },
    equinox: {
      date: equinoxDate,
      ...equinoxAngles,
      ...equinoxShading
    },
    optimalOverhangDepthM: optimalSummerDepthM,
    actualOverhangDepthM: actualDepthM,
    briseSoleil: {
      louverCount: louvers,
      louverSpacingM,
      bladeDepthM: louverBladeDepthM
    },
    verticalFins: {
      finDepthM: Math.max(0.15, Math.min(2.0, verticalFinDepthM))
    }
  };
}

/**
 * Builds standard 2D CAD entities for the architectural wall & overhang section.
 * Units: real-world meters.
 */
export function generateShadingSectionEntities(shading) {
  const inp = shading.inputs;
  const wallThick = 0.30; // 300mm exterior wall
  const floorThick = 0.25; // 250mm floor slab
  const roomDepth = 3.5;  // 3.5m interior room space for sun ray visualization
  const wallHeight = inp.sillHeightM + inp.windowHeightM + inp.headToOverhangM + 0.6;

  const entities = [];

  function line(x1, y1, x2, y2, layer) {
    entities.push({ type: 'line', x1: Number(x1.toFixed(4)), y1: Number(y1.toFixed(4)), x2: Number(x2.toFixed(4)), y2: Number(y2.toFixed(4)), layer });
  }

  function polyline(pts, closed, layer) {
    entities.push({ type: 'polyline', points: pts.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]), closed: !!closed, layer });
  }

  function text(x, y, content, height, layer) {
    entities.push({ type: 'text', x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), text: content, height: Number((height || 0.12).toFixed(4)), layer });
  }

  // 1. Finished Floor Slab (A-WALL)
  polyline([[-1.0, -floorThick], [roomDepth, -floorThick], [roomDepth, 0], [-1.0, 0]], true, 'A-WALL');

  // 2. Exterior Wall: Lower parapet/sill wall & Upper lintel wall (A-WALL)
  // Lower wall below sill
  polyline([[0, 0], [-wallThick, 0], [-wallThick, inp.sillHeightM], [0, inp.sillHeightM]], true, 'A-WALL');
  // Upper wall above window head
  const winTop = inp.sillHeightM + inp.windowHeightM;
  polyline([[0, winTop], [-wallThick, winTop], [-wallThick, wallHeight], [0, wallHeight]], true, 'A-WALL');

  // 3. Window Frame & Glazing (A-GLAZ)
  // Frame perimeter
  polyline([[0, inp.sillHeightM], [0.06, inp.sillHeightM], [0.06, winTop], [0, winTop]], true, 'A-GLAZ');
  // Glass panes (double glazing lines)
  line(0.03, inp.sillHeightM + 0.04, 0.03, winTop - 0.04, 'A-GLAZ');
  line(0.045, inp.sillHeightM + 0.04, 0.045, winTop - 0.04, 'A-GLAZ');

  // 4. Overhang Structure (A-ROOF or A-FURN)
  const overhangY = winTop + inp.headToOverhangM;
  const overhangThick = 0.12;
  const depth = shading.actualOverhangDepthM;

  if (inp.louverCount > 1) {
    // Multi-blade brise-soleil louvers
    const num = inp.louverCount;
    const bladeW = shading.briseSoleil.bladeDepthM;
    const spacing = shading.briseSoleil.louverSpacingM;
    // Cantilever support bracket beam
    line(0, overhangY + 0.05, -depth, overhangY + 0.05, 'A-ROOF');
    for (let i = 0; i < num; i++) {
      const ly = overhangY - (i * spacing);
      polyline([[-depth + (i * bladeW * 0.8), ly], [-depth + (i * bladeW * 0.8) + bladeW, ly], [-depth + (i * bladeW * 0.8) + bladeW, ly + 0.025], [-depth + (i * bladeW * 0.8), ly + 0.025]], true, 'A-ROOF');
    }
  } else {
    // Solid cantilevered overhang slab
    polyline([[0, overhangY], [-depth, overhangY], [-depth, overhangY + overhangThick], [0, overhangY + overhangThick]], true, 'A-ROOF');
    // Wall anchor bracket
    line(0, overhangY + overhangThick, -wallThick, overhangY + overhangThick, 'A-WALL');
  }

  // 5. Sun Ray Vectors & Shading Angles (A-SITE-SUN & A-ANNO-TEXT)
  const tipX = -depth;
  const tipY = overhangY;

  // Summer Solstice Sun Ray (Cutoff angle)
  if (shading.summer.vsaDeg > 0) {
    const vsaR = shading.summer.vsaDeg * SHADING_DEG;
    // Ray extending backwards towards sun and down through window
    const rayLen = 4.0;
    const startX = tipX - Math.cos(vsaR) * 1.5;
    const startY = tipY + Math.sin(vsaR) * 1.5;
    const endX = tipX + (tipY / Math.tan(vsaR));
    line(startX, startY, endX, 0, 'A-SITE');
    text(startX - 0.1, startY + 0.1, `Summer VSA: ${shading.summer.vsaDeg}° (100% Shade)`, 0.10, 'A-ANNO-TEXT');
  }

  // Winter Solstice Sun Ray (Direct Solar Gain Penetration)
  if (shading.winter.vsaDeg > 0) {
    const vsaR = shading.winter.vsaDeg * SHADING_DEG;
    const startX = tipX - Math.cos(vsaR) * 1.5;
    const startY = tipY + Math.sin(vsaR) * 1.5;
    const endX = tipX + (tipY / Math.tan(vsaR));
    line(startX, startY, Math.min(roomDepth, endX), Math.max(0, tipY - ((Math.min(roomDepth, endX) - tipX) * Math.tan(vsaR))), 'A-SITE');
    text(startX - 0.1, startY - 0.15, `Winter VSA: ${shading.winter.vsaDeg}° (Penetration: ${shading.winter.sunPenetrationM}m)`, 0.10, 'A-ANNO-TEXT');
  }

  // 6. Dimension Lines (A-ANNO-DIMS)
  // Overhang projection dimension
  line(0, overhangY + overhangThick + 0.15, -depth, overhangY + overhangThick + 0.15, 'A-ANNO-TEXT');
  line(0, overhangY + overhangThick + 0.10, 0, overhangY + overhangThick + 0.20, 'A-ANNO-TEXT');
  line(-depth, overhangY + overhangThick + 0.10, -depth, overhangY + overhangThick + 0.20, 'A-ANNO-TEXT');
  text(-depth / 2 - 0.15, overhangY + overhangThick + 0.20, `Overhang: ${Math.round(depth * 1000)} mm`, 0.09, 'A-ANNO-TEXT');

  // Window height dimension
  line(-wallThick - 0.15, inp.sillHeightM, -wallThick - 0.15, winTop, 'A-ANNO-TEXT');
  line(-wallThick - 0.10, inp.sillHeightM, -wallThick - 0.20, inp.sillHeightM, 'A-ANNO-TEXT');
  line(-wallThick - 0.10, winTop, -wallThick - 0.20, winTop, 'A-ANNO-TEXT');
  text(-wallThick - 0.55, inp.sillHeightM + inp.windowHeightM / 2, `Window: ${Math.round(inp.windowHeightM * 1000)} mm`, 0.09, 'A-ANNO-TEXT');

  return entities;
}

/**
 * Exports the calculated architectural shading section as 1:1 DXF text.
 */
export function shadingSectionToDXF(shading) {
  const entities = generateShadingSectionEntities(shading);
  return buildDXF(entities, {
    scale: 1000,
    blockName: 'SOLAR_SHADING_SECTION',
    asBlock: false
  });
}

/**
 * Renders the architectural shading section as clean, responsive SVG.
 */
export function shadingSectionToSVG(shading) {
  const inp = shading.inputs;
  const W = 640;
  const H = 440;
  const originX = 220; // wall face inside room
  const originY = 360; // finished floor line
  const scale = 80;    // 80 pixels per meter

  const toPxX = m => originX + m * scale;
  const toPxY = m => originY - m * scale;

  const wallThickPx = 0.3 * scale;
  const floorThickPx = 0.25 * scale;
  const sillHPx = inp.sillHeightM * scale;
  const winHPx = inp.windowHeightM * scale;
  const gapHPx = inp.headToOverhangM * scale;
  const depthPx = shading.actualOverhangDepthM * scale;
  const overYPx = toPxY(inp.sillHeightM + inp.windowHeightM + inp.headToOverhangM);

  // Summer sun angle ray
  const sumVsa = shading.summer.vsaDeg;
  const winVsa = shading.winter.vsaDeg;

  let raysSvg = '';
  if (sumVsa > 0) {
    const sumAngleRad = sumVsa * SHADING_DEG;
    const rayTipX = originX - depthPx;
    const rayTipY = overYPx;
    const rayStartX = rayTipX - 120 * Math.cos(sumAngleRad);
    const rayStartY = rayTipY - 120 * Math.sin(sumAngleRad);
    const floorIntersectX = rayTipX + (rayTipY - originY) / (-Math.tan(sumAngleRad));
    raysSvg += `
      <line x1="${rayStartX.toFixed(1)}" y1="${rayStartY.toFixed(1)}" x2="${floorIntersectX.toFixed(1)}" y2="${originY}" stroke="#eab308" stroke-width="2.5" stroke-dasharray="6 3"/>
      <circle cx="${rayStartX.toFixed(1)}" cy="${rayStartY.toFixed(1)}" r="7" fill="#facc15" filter="drop-shadow(0 0 6px rgba(250,204,21,0.8))"/>
      <text x="${(rayStartX - 10).toFixed(1)}" y="${(rayStartY - 12).toFixed(1)}" fill="#facc15" font-size="11" font-weight="600">Summer Solstice (VSA ${sumVsa}°)</text>
    `;
  }

  if (winVsa > 0) {
    const winAngleRad = winVsa * SHADING_DEG;
    const rayTipX = originX - depthPx;
    const rayTipY = overYPx;
    const rayStartX = rayTipX - 140 * Math.cos(winAngleRad);
    const rayStartY = rayTipY - 140 * Math.sin(winAngleRad);
    const penetrationX = originX + (shading.winter.sunPenetrationM * scale);
    raysSvg += `
      <line x1="${rayStartX.toFixed(1)}" y1="${rayStartY.toFixed(1)}" x2="${penetrationX.toFixed(1)}" y2="${originY}" stroke="#f97316" stroke-width="2" stroke-dasharray="4 2"/>
      <circle cx="${rayStartX.toFixed(1)}" cy="${rayStartY.toFixed(1)}" r="6" fill="#fb923c"/>
      <text x="${(rayStartX - 10).toFixed(1)}" y="${(rayStartY + 18).toFixed(1)}" fill="#fb923c" font-size="11" font-weight="600">Winter Solstice (VSA ${winVsa}°)</text>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="shading-section-svg" style="width: 100%; height: auto; max-height: 480px; background: var(--bg-surface-secondary, #0f172a); border-radius: 8px;" role="img" aria-label="Passive Solar Shading Architectural Section">
      <defs>
        <pattern id="wallHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
        </pattern>
      </defs>

      <!-- Grid lines -->
      <line x1="20" y1="${originY}" x2="${W - 20}" y2="${originY}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
      <text x="${W - 120}" y="${originY - 8}" fill="rgba(255,255,255,0.4)" font-size="10">FINISHED FLOOR (0.00)</text>

      <!-- Floor Slab -->
      <rect x="${originX - wallThickPx - 80}" y="${originY}" width="${W - (originX - wallThickPx - 80) - 20}" height="${floorThickPx}" fill="url(#wallHatch)" stroke="var(--border-color, #475569)" stroke-width="1.5"/>

      <!-- Lower Exterior Wall (below sill) -->
      <rect x="${originX - wallThickPx}" y="${toPxY(inp.sillHeightM)}" width="${wallThickPx}" height="${sillHPx}" fill="url(#wallHatch)" stroke="var(--border-color, #475569)" stroke-width="2"/>

      <!-- Upper Exterior Wall (above window head) -->
      <rect x="${originX - wallThickPx}" y="20" width="${wallThickPx}" height="${toPxY(inp.sillHeightM + inp.windowHeightM) - 20}" fill="url(#wallHatch)" stroke="var(--border-color, #475569)" stroke-width="2"/>

      <!-- Window Frame & Double Glazing -->
      <rect x="${originX - 4}" y="${toPxY(inp.sillHeightM + inp.windowHeightM)}" width="10" height="${winHPx}" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="2"/>
      <line x1="${originX}" y1="${toPxY(inp.sillHeightM + inp.windowHeightM) + 4}" x2="${originX}" y2="${toPxY(inp.sillHeightM) - 4}" stroke="#bae6fd" stroke-width="1.5"/>

      <!-- Overhang / Louvers -->
      ${inp.louverCount > 1
        ? Array.from({ length: inp.louverCount }, (_, i) => {
            const ly = overYPx + i * (shading.briseSoleil.louverSpacingM * scale);
            const bx = originX - depthPx + (i * (depthPx / inp.louverCount));
            return `<rect x="${bx.toFixed(1)}" y="${ly.toFixed(1)}" width="${(depthPx / inp.louverCount + 8).toFixed(1)}" height="6" fill="#f43f5e" rx="1.5" stroke="#fda4af" stroke-width="1"/>`;
          }).join('')
        : `<rect x="${originX - depthPx}" y="${overYPx - 10}" width="${depthPx}" height="10" fill="#f43f5e" rx="2" stroke="#fda4af" stroke-width="1.5"/>`
      }

      <!-- Solar Rays -->
      ${raysSvg}

      <!-- Dimension Overhang -->
      <line x1="${originX - depthPx}" y1="${overYPx - 20}" x2="${originX}" y2="${overYPx - 20}" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="${originX - depthPx}" y1="${overYPx - 25}" x2="${originX - depthPx}" y2="${overYPx - 15}" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="${originX}" y1="${overYPx - 25}" x2="${originX}" y2="${overYPx - 15}" stroke="#94a3b8" stroke-width="1.2"/>
      <text x="${originX - depthPx / 2 - 25}" y="${overYPx - 26}" fill="#cbd5e1" font-size="11" font-weight="600">${Math.round(shading.actualOverhangDepthM * 1000)} mm</text>

      <!-- Shading Summary Badge -->
      <g transform="translate(20, 20)">
        <rect width="180" height="75" rx="6" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        <text x="12" y="22" fill="#38bdf8" font-size="11" font-weight="700">SOLAR SHADING PERFORMANCE</text>
        <text x="12" y="42" fill="#e2e8f0" font-size="11">Summer Cutoff: <tspan fill="#4ade80" font-weight="700">${shading.summer.shadePercent}%</tspan></text>
        <text x="12" y="60" fill="#e2e8f0" font-size="11">Winter Sun Gain: <tspan fill="#fb923c" font-weight="700">${(100 - shading.winter.shadePercent).toFixed(1)}%</tspan></text>
      </g>
    </svg>
  `;
}
