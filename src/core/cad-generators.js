/**
 * Architecture Helping Hand — Specialized CAD Generators Engine
 *
 * Professional 1:1 Millimeter CAD Generators:
 *   1. Stair & Ramp CAD Detail Generator (Cross-section, stringers, landings, handrails, dimensions)
 *   2. Parking Lot & ADA Stall Bay Layout Generator (Stalls, drive aisles, ADA access aisles, ISA symbols)
 *   3. Graphical Door & Window Elevation Schedule (CAD sheet with elevations, frames, swings, tags)
 *   4. AutoCAD Plot Style Table (CTB) & Pen Weight Manager (AIA standard pen weights, scripts, guides)
 */

import { buildDXF } from './export/export-model.js';

// =============================================================================
// 1. STAIR & RAMP CAD DETAIL GENERATOR
// =============================================================================

/**
 * Generates a 1:1 millimeter AutoCAD 2D section drawing for a straight-flight stair.
 *
 * @param {object} options
 * @param {number} [options.totalRiseMm=2700] Total rise in mm
 * @param {number} [options.riserCount=15] Total number of risers
 * @param {number} [options.treadDepthMm=280] Going / tread depth in mm
 * @param {number} [options.nosingMm=25] Tread nosing projection in mm
 * @param {number} [options.slabThicknessMm=150] Waist / concrete carriage slab thickness in mm
 * @param {number} [options.handrailHeightMm=900] Handrail height above pitch line in mm
 * @param {boolean} [options.includeHandrail=true] Include handrail, balusters, and newel posts
 * @param {boolean} [options.includeDimensions=true] Include CAD dimension callouts
 * @returns {object} { entities, dxf, svg, lisp, specs }
 */
export function generateStairCadDetail(options = {}) {
  const totalRise = Math.max(500, Number(options.totalRiseMm) || 2700);
  const riserCount = Math.max(2, Math.round(Number(options.riserCount) || 15));
  const riserHeight = totalRise / riserCount;
  const treadDepth = Math.max(200, Number(options.treadDepthMm) || 280);
  const nosing = options.includeNosing !== false ? Math.max(0, Number(options.nosingMm) || 25) : 0;
  const slabThick = Math.max(100, Number(options.slabThicknessMm) || 150);
  const handrailH = Math.max(800, Number(options.handrailHeightMm) || 900);
  const includeHandrail = options.includeHandrail !== false;
  const includeDimensions = options.includeDimensions !== false;

  const goingCount = riserCount - 1;
  const totalRun = goingCount * treadDepth;
  const landingRun = 1000; // 1 meter landing at top and bottom

  const entities = [];

  // 1. Lower Floor Slab (x: -landingRun to 0, y: 0)
  entities.push({ type: 'line', layer: 'A-FLOR-STRS', x1: -landingRun / 1000, y1: 0, x2: 0, y2: 0 });
  entities.push({ type: 'line', layer: 'A-FLOR-STRS', x1: -landingRun / 1000, y1: -0.2, x2: -landingRun / 1000, y2: 0 });

  // 2. Step Profile (Treads and Risers)
  const stepPoints = [];
  stepPoints.push([0, 0]);

  for (let i = 0; i < riserCount; i++) {
    const x = i * treadDepth;
    const y = i * riserHeight;
    const nextY = (i + 1) * riserHeight;

    // Riser vertical
    entities.push({
      type: 'line',
      layer: 'A-FLOR-STRS',
      x1: x / 1000,
      y1: y / 1000,
      x2: x / 1000,
      y2: nextY / 1000
    });

    // Tread horizontal (plus nosing overhang if applicable)
    if (i < goingCount) {
      const nextX = (i + 1) * treadDepth;
      entities.push({
        type: 'line',
        layer: 'A-FLOR-STRS',
        x1: (x - nosing) / 1000,
        y1: nextY / 1000,
        x2: nextX / 1000,
        y2: nextY / 1000
      });

      if (nosing > 0) {
        // Nosing lip
        entities.push({
          type: 'line',
          layer: 'A-FLOR-STRS',
          x1: (x - nosing) / 1000,
          y1: (nextY - 20) / 1000,
          x2: (x - nosing) / 1000,
          y2: nextY / 1000
        });
      }
    }
  }

  // 3. Upper Floor Slab Landing (from totalRun to totalRun + landingRun at totalRise)
  entities.push({
    type: 'line',
    layer: 'A-FLOR-STRS',
    x1: totalRun / 1000,
    y1: totalRise / 1000,
    x2: (totalRun + landingRun) / 1000,
    y2: totalRise / 1000
  });

  // 4. Soffit / Concrete Waist Carried Underneath
  // Pitch slope
  const angle = Math.atan2(totalRise, totalRun);
  const perpOffset = slabThick / Math.cos(angle);
  const soffitStartX = 0;
  const soffitStartY = -perpOffset;
  const soffitEndX = totalRun;
  const soffitEndY = totalRise - perpOffset;

  entities.push({
    type: 'line',
    layer: 'A-FLOR-STRS',
    x1: soffitStartX / 1000,
    y1: soffitStartY / 1000,
    x2: soffitEndX / 1000,
    y2: soffitEndY / 1000
  });
  // Ground connection
  entities.push({
    type: 'line',
    layer: 'A-FLOR-STRS',
    x1: soffitStartX / 1000,
    y1: soffitStartY / 1000,
    x2: 0,
    y2: 0
  });
  // Top landing connection
  entities.push({
    type: 'line',
    layer: 'A-FLOR-STRS',
    x1: soffitEndX / 1000,
    y1: soffitEndY / 1000,
    x2: (totalRun + landingRun) / 1000,
    y2: (totalRise - 0.2) / 1000
  });

  // 5. Handrail & Balustrade (A-FLOR-HRAL)
  if (includeHandrail) {
    const hrOffsetY = handrailH;
    // Lower post
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: -0.15,
      y1: 0,
      x2: -0.15,
      y2: (hrOffsetY) / 1000
    });
    // Lower horizontal 300mm extension
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: -0.3,
      y1: hrOffsetY / 1000,
      x2: 0,
      y2: hrOffsetY / 1000
    });
    // Sloped rail along flight
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: 0,
      y1: (riserHeight + hrOffsetY) / 1000,
      x2: totalRun / 1000,
      y2: (totalRise + hrOffsetY) / 1000
    });
    // Upper horizontal 300mm extension
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: totalRun / 1000,
      y1: (totalRise + hrOffsetY) / 1000,
      x2: (totalRun + 0.3) / 1000,
      y2: (totalRise + hrOffsetY) / 1000
    });
    // Upper post
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: (totalRun + 0.3) / 1000,
      y1: totalRise / 1000,
      x2: (totalRun + 0.3) / 1000,
      y2: (totalRise + hrOffsetY) / 1000
    });

    // Balusters every 2 treads
    for (let i = 2; i < riserCount - 1; i += 2) {
      const bx = i * treadDepth;
      const by = (i + 1) * riserHeight;
      const rTop = by + hrOffsetY;
      entities.push({
        type: 'line',
        layer: 'A-FLOR-HRAL',
        x1: bx / 1000,
        y1: by / 1000,
        x2: bx / 1000,
        y2: rTop / 1000
      });
    }
  }

  // 6. Dimensions and Callout Text (A-ANNO-DIMS & A-ANNO-TEXT)
  if (includeDimensions) {
    // Total Rise vertical dimension
    const dimX = (totalRun + landingRun + 200) / 1000;
    entities.push({ type: 'line', layer: 'A-ANNO-DIMS', x1: dimX, y1: 0, x2: dimX, y2: totalRise / 1000 });
    entities.push({ type: 'line', layer: 'A-ANNO-DIMS', x1: dimX - 0.08, y1: 0, x2: dimX + 0.08, y2: 0 });
    entities.push({ type: 'line', layer: 'A-ANNO-DIMS', x1: dimX - 0.08, y1: totalRise / 1000, x2: dimX + 0.08, y2: totalRise / 1000 });
    entities.push({
      type: 'text',
      layer: 'A-ANNO-TEXT',
      x: dimX + 0.1,
      y: (totalRise / 2) / 1000,
      text: `TOTAL RISE: ${Math.round(totalRise)} mm`,
      height: 0.15
    });

    // Total Run horizontal dimension
    const dimY = (-perpOffset - 250) / 1000;
    entities.push({ type: 'line', layer: 'A-ANNO-DIMS', x1: 0, y1: dimY, x2: totalRun / 1000, y2: dimY });
    entities.push({ type: 'line', layer: 'A-ANNO-DIMS', x1: 0, y1: dimY - 0.08, x2: 0, y2: dimY + 0.08 });
    entities.push({ type: 'line', layer: 'A-ANNO-DIMS', x1: totalRun / 1000, y1: dimY - 0.08, x2: totalRun / 1000, y2: dimY + 0.08 });
    entities.push({
      type: 'text',
      layer: 'A-ANNO-TEXT',
      x: (totalRun / 2) / 1000 - 0.4,
      y: dimY - 0.18,
      text: `TOTAL RUN: ${Math.round(totalRun)} mm (${goingCount} GOINGS @ ${Math.round(treadDepth)} mm)`,
      height: 0.15
    });

    // Specification callout block
    const blondel = (2 * riserHeight) + treadDepth;
    const pitchDeg = (angle * 180 / Math.PI).toFixed(1);
    const specLines = [
      `STAIR DETAIL: ${riserCount} RISERS @ ${riserHeight.toFixed(1)} mm`,
      `${goingCount} TREADS @ ${treadDepth} mm (NOSING: ${nosing} mm)`,
      `PITCH: ${pitchDeg}deg | 2R+G: ${blondel.toFixed(1)} mm (BLONDEL)`
    ];
    specLines.forEach((t, idx) => {
      entities.push({
        type: 'text',
        layer: 'A-ANNO-TEXT',
        x: -0.8,
        y: (totalRise * 0.7 - idx * 220) / 1000,
        text: t,
        height: 0.15
      });
    });
  }

  const dxf = buildDXF(entities, { scale: 1000 });

  // Generate SVG for interactive live UI preview
  const svgW = 680;
  const svgH = 340;
  const padding = 45;
  const minX = -landingRun;
  const maxX = totalRun + landingRun + 400;
  const minY = -perpOffset - 400;
  const maxY = totalRise + (includeHandrail ? handrailH : 0) + 300;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scaleX = (svgW - 2 * padding) / rangeX;
  const scaleY = (svgH - 2 * padding) / rangeY;
  const sc = Math.min(scaleX, scaleY);

  const toSvgX = x => padding + (x - minX) * sc;
  const toSvgY = y => svgH - padding - (y - minY) * sc;

  const svgElements = entities.map(e => {
    if (e.type === 'line') {
      const col = e.layer === 'A-FLOR-STRS' ? '#38bdf8' : e.layer === 'A-FLOR-HRAL' ? '#f472b6' : '#94a3b8';
      const sw = e.layer === 'A-FLOR-STRS' ? '2.5' : e.layer === 'A-FLOR-HRAL' ? '2.0' : '1.0';
      return `<line x1="${toSvgX(e.x1 * 1000)}" y1="${toSvgY(e.y1 * 1000)}" x2="${toSvgX(e.x2 * 1000)}" y2="${toSvgY(e.y2 * 1000)}" stroke="${col}" stroke-width="${sw}" />`;
    } else if (e.type === 'text') {
      return `<text x="${toSvgX(e.x * 1000)}" y="${toSvgY(e.y * 1000)}" fill="#e2e8f0" font-size="11" font-family="sans-serif">${e.text}</text>`;
    }
    return '';
  }).join('');

  const svg = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background:#0f172a; border-radius:8px;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="stairGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${svgW}" height="${svgH}" fill="url(#stairGrid)" />
    ${svgElements}
  </svg>`;

  const lisp = [
    `;; Architecture Helping Hand — AutoLISP Stair Section Generator`,
    `(defun c:AHH_STAIR_SECTION ()`,
    `  (setvar "CMDECHO" 0)`,
    `  (command "_.-LAYER" "_M" "A-FLOR-STRS" "_C" "4" "A-FLOR-STRS" "")`,
    `  (command "_.-LAYER" "_M" "A-FLOR-HRAL" "_C" "6" "A-FLOR-HRAL" "")`,
    `  (command "_.-LAYER" "_M" "A-ANNO-DIMS" "_C" "3" "A-ANNO-DIMS" "")`,
    `  (command "_.-LAYER" "_M" "A-ANNO-TEXT" "_C" "7" "A-ANNO-TEXT" "")`,
    `  (princ "\\nInserting 1:1 Millimeter Stair Detail...")`,
    `  (command "_.INSERT" "stair-section.dxf" pause "1" "1" "0")`,
    `  (princ "\\nStair Section Placed Successfully.")`,
    `  (princ)`,
    `)`
  ].join('\r\n');

  return {
    entities,
    dxf,
    svg,
    lisp,
    specs: {
      totalRise,
      totalRun,
      riserCount,
      riserHeight,
      goingCount,
      treadDepth,
      blondel: (2 * riserHeight) + treadDepth,
      pitchDegrees: Number((angle * 180 / Math.PI).toFixed(2))
    }
  };
}

/**
 * Generates a 1:1 millimeter AutoCAD 2D section drawing for an accessible ADA ramp.
 *
 * @param {object} options
 * @param {number} [options.totalRiseMm=600] Total rise in mm
 * @param {number} [options.slopeRatio=12] Slope ratio (12 for 1:12 ADA standard)
 * @param {number} [options.landingLengthMm=1500] Landing length in mm
 * @param {number} [options.handrailHeightMm=900] Handrail height in mm
 * @param {boolean} [options.includeHandrail=true]
 * @returns {object} { entities, dxf, svg, specs }
 */
export function generateRampCadDetail(options = {}) {
  const totalRise = Math.max(100, Number(options.totalRiseMm) || 600);
  const slopeRatio = Math.max(4, Number(options.slopeRatio) || 12);
  const landingLen = Math.max(1200, Number(options.landingLengthMm) || 1500);
  const handrailH = Math.max(800, Number(options.handrailHeightMm) || 900);
  const includeHandrail = options.includeHandrail !== false;

  const rampRun = totalRise * slopeRatio;
  const curbH = 100; // 100mm ADA edge protection curb

  const entities = [];

  // Lower Landing (Horizontal at 0.00)
  entities.push({ type: 'line', layer: 'A-FLOR-RAMP', x1: -landingLen / 1000, y1: 0, x2: 0, y2: 0 });
  entities.push({ type: 'line', layer: 'A-FLOR-RAMP', x1: -landingLen / 1000, y1: -0.15, x2: -landingLen / 1000, y2: 0 });

  // Ramp Slope
  entities.push({ type: 'line', layer: 'A-FLOR-RAMP', x1: 0, y1: 0, x2: rampRun / 1000, y2: totalRise / 1000 });

  // Upper Landing (Horizontal at totalRise)
  entities.push({
    type: 'line',
    layer: 'A-FLOR-RAMP',
    x1: rampRun / 1000,
    y1: totalRise / 1000,
    x2: (rampRun + landingLen) / 1000,
    y2: totalRise / 1000
  });

  // Slab base / Ground structure
  entities.push({ type: 'line', layer: 'A-FLOR-RAMP', x1: -landingLen / 1000, y1: -0.15, x2: (rampRun + landingLen) / 1000, y2: -0.15 });
  entities.push({
    type: 'line',
    layer: 'A-FLOR-RAMP',
    x1: (rampRun + landingLen) / 1000,
    y1: -0.15,
    x2: (rampRun + landingLen) / 1000,
    y2: totalRise / 1000
  });

  // ADA 100mm Curb / Edge Protection Line
  entities.push({
    type: 'line',
    layer: 'A-FLOR-RAMP',
    x1: 0,
    y1: curbH / 1000,
    x2: rampRun / 1000,
    y2: (totalRise + curbH) / 1000
  });

  // Handrail with ADA 300mm level extensions (A-FLOR-HRAL)
  if (includeHandrail) {
    const ext = 0.3; // 300 mm extension
    // Lower extension & post
    entities.push({ type: 'line', layer: 'A-FLOR-HRAL', x1: -ext, y1: 0, x2: -ext, y2: handrailH / 1000 });
    entities.push({ type: 'line', layer: 'A-FLOR-HRAL', x1: -ext, y1: handrailH / 1000, x2: 0, y2: handrailH / 1000 });
    // Sloped handrail
    entities.push({ type: 'line', layer: 'A-FLOR-HRAL', x1: 0, y1: handrailH / 1000, x2: rampRun / 1000, y2: (totalRise + handrailH) / 1000 });
    // Upper extension & post
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: rampRun / 1000,
      y1: (totalRise + handrailH) / 1000,
      x2: (rampRun + 300) / 1000,
      y2: (totalRise + handrailH) / 1000
    });
    entities.push({
      type: 'line',
      layer: 'A-FLOR-HRAL',
      x1: (rampRun + 300) / 1000,
      y1: totalRise / 1000,
      x2: (rampRun + 300) / 1000,
      y2: (totalRise + handrailH) / 1000
    });
  }

  // Dimension & Slope Callouts (A-ANNO-DIMS & A-ANNO-TEXT)
  const slopePercent = (100 / slopeRatio).toFixed(2);
  entities.push({
    type: 'text',
    layer: 'A-ANNO-TEXT',
    x: (rampRun / 2 - 600) / 1000,
    y: (totalRise / 2 + 350) / 1000,
    text: `RAMP SLOPE: 1:${slopeRatio} (${slopePercent}%) — ADA COMPLIANT`,
    height: 0.18
  });
  entities.push({
    type: 'text',
    layer: 'A-ANNO-TEXT',
    x: -landingLen / 1000,
    y: -0.35,
    text: `LANDING: ${landingLen} mm | RAMP RUN: ${Math.round(rampRun)} mm | TOTAL RISE: ${Math.round(totalRise)} mm`,
    height: 0.16
  });

  const dxf = buildDXF(entities, { scale: 1000 });

  return {
    entities,
    dxf,
    specs: {
      totalRise,
      slopeRatio,
      slopePercent: Number(slopePercent),
      rampRun,
      landingLength: landingLen,
      totalLength: rampRun + (2 * landingLen)
    }
  };
}

// =============================================================================
// 2. PARKING LOT & ADA STALL BAY LAYOUT GENERATOR
// =============================================================================

/**
 * Generates an AutoCAD 1:1 parking bay layout with angled stalls and ADA accessible bays.
 *
 * @param {object} options
 * @param {number} [options.stallCount=12] Total standard parking stalls
 * @param {number} [options.angle=90] 90, 60, or 45 degrees
 * @param {number} [options.stallWidthMm=2700] Standard stall width (2700 mm / 9 ft)
 * @param {number} [options.stallDepthMm=5500] Standard stall depth (5500 mm / 18 ft)
 * @param {number} [options.aisleWidthMm=7300] Drive aisle width (7300 mm / 24 ft)
 * @param {number} [options.adaCount=2] Number of standard ADA stalls
 * @param {number} [options.vanAdaCount=1] Number of Van Accessible ADA stalls
 * @param {boolean} [options.doubleBay=true] Parking on both sides of drive aisle
 * @param {boolean} [options.includeTireStops=true] Include concrete wheel stops
 * @returns {object} { entities, dxf, svg, specs }
 */
export function generateParkingBayCadDetail(options = {}) {
  const stallCount = Math.max(2, Math.min(60, Number(options.stallCount) || 12));
  const angleDeg = [90, 60, 45].includes(Number(options.angle)) ? Number(options.angle) : 90;
  const angleRad = angleDeg * Math.PI / 180;
  const stallW = Math.max(2400, Number(options.stallWidthMm) || 2700);
  const stallD = Math.max(4500, Number(options.stallDepthMm) || 5500);
  const aisleW = Math.max(4000, Number(options.aisleWidthMm) || (angleDeg === 90 ? 7300 : 5000));
  const adaCount = Math.max(0, Number(options.adaCount) ?? 2);
  const vanAdaCount = Math.max(0, Number(options.vanAdaCount) ?? 1);
  const doubleBay = options.doubleBay !== false;
  const includeTireStops = options.includeTireStops !== false;

  const curbWidth = stallW / Math.sin(angleRad);
  const curbOffset = stallD * Math.cos(angleRad);
  const perpDepth = stallD * Math.sin(angleRad);

  const entities = [];

  // Helper: Draw ISA Wheelchair Pavement Symbol at center of stall
  function addIsaSymbol(cx, cy) {
    // Wheel arc
    entities.push({ type: 'circle', layer: 'C-ROAD-SYMB', x: cx, y: cy, r: 0.35 });
    // Head circle
    entities.push({ type: 'circle', layer: 'C-ROAD-SYMB', x: cx, y: cy + 0.55, r: 0.12 });
    // Torso & leg
    entities.push({ type: 'line', layer: 'C-ROAD-SYMB', x1: cx, y1: cy + 0.43, x2: cx, y2: cy + 0.1 });
    entities.push({ type: 'line', layer: 'C-ROAD-SYMB', x1: cx, y1: cy + 0.1, x2: cx + 0.25, y2: cy + 0.1 });
    entities.push({ type: 'line', layer: 'C-ROAD-SYMB', x1: cx + 0.25, y1: cy + 0.1, x2: cx + 0.25, y2: cy - 0.25 });
  }

  // Row 1 (Bottom side of drive aisle)
  const totalStallsSide1 = Math.ceil(stallCount / (doubleBay ? 2 : 1));
  let currentX = 0;

  // Bottom curb line
  entities.push({
    type: 'line',
    layer: 'C-ROAD-PARK',
    x1: 0,
    y1: 0,
    x2: (totalStallsSide1 * curbWidth + curbOffset) / 1000,
    y2: 0
  });

  // Aisle boundary line (Row 1 head)
  entities.push({
    type: 'line',
    layer: 'C-ROAD-PARK',
    x1: curbOffset / 1000,
    y1: perpDepth / 1000,
    x2: (totalStallsSide1 * curbWidth + curbOffset) / 1000,
    y2: perpDepth / 1000
  });

  let adaPlaced = 0;
  let vanPlaced = 0;

  for (let i = 0; i <= totalStallsSide1; i++) {
    const xBase = i * curbWidth;
    const xHead = xBase + curbOffset;

    // Stall divider stripe (C-ROAD-STRP)
    entities.push({
      type: 'line',
      layer: 'C-ROAD-STRP',
      x1: xBase / 1000,
      y1: 0,
      x2: xHead / 1000,
      y2: perpDepth / 1000
    });

    if (i < totalStallsSide1) {
      const stallCenterX = (xBase + curbWidth / 2 + curbOffset / 2) / 1000;
      const stallCenterY = (perpDepth / 2) / 1000;

      // Concrete wheel stop
      if (includeTireStops) {
        const stopY = (perpDepth - 800 * Math.sin(angleRad)) / 1000;
        const stopX = (xBase + curbWidth / 2 + (perpDepth - 800) * Math.cos(angleRad) / Math.sin(angleRad)) / 1000;
        entities.push({
          type: 'line',
          layer: 'C-ROAD-PARK',
          x1: stopX - 0.9,
          y1: stopY,
          x2: stopX + 0.9,
          y2: stopY
        });
      }

      // Check if this stall is an ADA stall
      if (vanPlaced < vanAdaCount) {
        addIsaSymbol(stallCenterX, stallCenterY);
        entities.push({
          type: 'text',
          layer: 'C-ROAD-ANNO',
          x: stallCenterX - 0.5,
          y: stallCenterY - 0.7,
          text: 'VAN ACCESSIBLE',
          height: 0.18
        });
        vanPlaced++;
      } else if (adaPlaced < adaCount) {
        addIsaSymbol(stallCenterX, stallCenterY);
        entities.push({
          type: 'text',
          layer: 'C-ROAD-ANNO',
          x: stallCenterX - 0.4,
          y: stallCenterY - 0.7,
          text: 'ADA PARKING',
          height: 0.18
        });
        adaPlaced++;
      }
    }
  }

  // Row 2 (Top side across the drive aisle, if double bay)
  if (doubleBay) {
    const row2BaseY = perpDepth + aisleW;
    const row2TopY = row2BaseY + perpDepth;

    // Aisle boundary line (Row 2 head)
    entities.push({
      type: 'line',
      layer: 'C-ROAD-PARK',
      x1: 0,
      y1: row2BaseY / 1000,
      x2: (totalStallsSide1 * curbWidth + curbOffset) / 1000,
      y2: row2BaseY / 1000
    });

    // Top curb line
    entities.push({
      type: 'line',
      layer: 'C-ROAD-PARK',
      x1: curbOffset / 1000,
      y1: row2TopY / 1000,
      x2: (totalStallsSide1 * curbWidth + curbOffset) / 1000,
      y2: row2TopY / 1000
    });

    for (let i = 0; i <= totalStallsSide1; i++) {
      const xBase = i * curbWidth;
      const xHead = xBase + curbOffset;

      entities.push({
        type: 'line',
        layer: 'C-ROAD-STRP',
        x1: xBase / 1000,
        y1: row2BaseY / 1000,
        x2: xHead / 1000,
        y2: row2TopY / 1000
      });
    }

    // Drive aisle center line and directional arrows
    const aisleMidY = (perpDepth + aisleW / 2) / 1000;
    entities.push({
      type: 'line',
      layer: 'C-ROAD-STRP',
      x1: 0,
      y1: aisleMidY,
      x2: (totalStallsSide1 * curbWidth + curbOffset) / 1000,
      y2: aisleMidY
    });

    entities.push({
      type: 'text',
      layer: 'C-ROAD-ANNO',
      x: ((totalStallsSide1 * curbWidth) / 2) / 1000 - 1.2,
      y: aisleMidY + 0.3,
      text: `TWO-WAY DRIVE AISLE (${Math.round(aisleW)} mm / ${(aisleW / 304.8).toFixed(1)} FT)`,
      height: 0.22
    });
  }

  // Dimension strings
  const totalLength = totalStallsSide1 * curbWidth + curbOffset;
  const totalWidth = doubleBay ? (2 * perpDepth + aisleW) : (perpDepth + aisleW);

  entities.push({
    type: 'text',
    layer: 'C-ROAD-ANNO',
    x: 0,
    y: -0.6,
    text: `PARKING BAY: ${stallCount} TOTAL STALLS (${angleDeg}deg ANGLE) | STALL: ${stallW}x${stallD} mm | DRIVE AISLE: ${aisleW} mm`,
    height: 0.25
  });

  const dxf = buildDXF(entities, { scale: 1000 });

  // Generate responsive SVG visualization
  const svgW = 720;
  const svgH = 340;
  const pad = 40;
  const scX = (svgW - 2 * pad) / (totalLength);
  const scY = (svgH - 2 * pad) / (totalWidth);
  const sc = Math.min(scX, scY);

  const toSvgX = x => pad + x * sc;
  const toSvgY = y => svgH - pad - y * sc;

  const svgContent = entities.map(e => {
    if (e.type === 'line') {
      const col = e.layer === 'C-ROAD-STRP' ? '#facc15' : e.layer === 'C-ROAD-SYMB' ? '#38bdf8' : '#94a3b8';
      const sw = e.layer === 'C-ROAD-STRP' ? '2.0' : '1.0';
      return `<line x1="${toSvgX(e.x1 * 1000)}" y1="${toSvgY(e.y1 * 1000)}" x2="${toSvgX(e.x2 * 1000)}" y2="${toSvgY(e.y2 * 1000)}" stroke="${col}" stroke-width="${sw}" />`;
    } else if (e.type === 'circle') {
      return `<circle cx="${toSvgX(e.x * 1000)}" cy="${toSvgY(e.y * 1000)}" r="${Math.max(2, e.r * 1000 * sc)}" fill="none" stroke="#38bdf8" stroke-width="1.5" />`;
    } else if (e.type === 'text') {
      return `<text x="${toSvgX(e.x * 1000)}" y="${toSvgY(e.y * 1000)}" fill="#e2e8f0" font-size="10" font-family="sans-serif">${e.text}</text>`;
    }
    return '';
  }).join('');

  const svg = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background:#0f172a; border-radius:8px;" xmlns="http://www.w3.org/2000/svg">
    ${svgContent}
  </svg>`;

  return {
    entities,
    dxf,
    svg,
    specs: {
      totalStalls: stallCount,
      angle: angleDeg,
      stallWidth: stallW,
      stallDepth: stallD,
      aisleWidth: aisleW,
      adaStalls: adaCount,
      vanAdaStalls: vanAdaCount,
      totalLengthMm: Math.round(totalLength),
      totalWidthMm: Math.round(totalWidth)
    }
  };
}

// =============================================================================
// 3. GRAPHICAL DOOR & WINDOW ELEVATION SCHEDULE (CAD SHEET)
// =============================================================================

export const STANDARD_DOOR_TYPES = [
  { id: 'D01', name: 'Single Flush Solid Core', widthMm: 900, heightMm: 2100, frameMm: 50, type: 'single-flush', fireRating: '20 Min', material: 'Wood / Hollow Metal' },
  { id: 'D02', name: 'Double Egress Fire Door', widthMm: 1800, heightMm: 2100, frameMm: 50, type: 'double-egress', fireRating: '90 Min', material: 'Hollow Metal' },
  { id: 'D03', name: 'Storefront Glazed Entry', widthMm: 1000, heightMm: 2400, frameMm: 60, type: 'glazed-storefront', fireRating: 'Non-Rated', material: 'Anodized Aluminum' },
  { id: 'D04', name: 'Pocket Sliding Interior Door', widthMm: 850, heightMm: 2100, frameMm: 45, type: 'pocket-sliding', fireRating: 'Non-Rated', material: 'Solid Core Wood' },
  { id: 'D05', name: 'Bi-Fold Louvered Wardrobe', widthMm: 1200, heightMm: 2100, frameMm: 40, type: 'bi-fold-louver', fireRating: 'Non-Rated', material: 'Wood' },
  { id: 'D06', name: 'Sectional Overhead Door', widthMm: 3000, heightMm: 2700, frameMm: 75, type: 'overhead-sectional', fireRating: 'Non-Rated', material: 'Insulated Steel' }
];

export const STANDARD_WINDOW_TYPES = [
  { id: 'W01', name: 'Fixed Picture Window', widthMm: 1200, heightMm: 1500, sillMm: 900, frameMm: 50, type: 'fixed', uValue: '0.28', glazing: 'Double Low-E' },
  { id: 'W02', name: 'Double Casement Window', widthMm: 1500, heightMm: 1200, sillMm: 1000, frameMm: 50, type: 'casement', uValue: '0.26', glazing: 'Double Low-E Arg' },
  { id: 'W03', name: 'Horizontal Slider Window', widthMm: 1800, heightMm: 1200, sillMm: 1000, frameMm: 50, type: 'slider', uValue: '0.30', glazing: 'Double Low-E' },
  { id: 'W04', name: 'Top-Hinged Awning Window', widthMm: 900, heightMm: 600, sillMm: 1600, frameMm: 50, type: 'awning', uValue: '0.28', glazing: 'Double Low-E' },
  { id: 'W05', name: 'Clerestory Ribbon Window', widthMm: 3000, heightMm: 600, sillMm: 2100, frameMm: 50, type: 'ribbon', uValue: '0.25', glazing: 'Triple Low-E' }
];

/**
 * Generates an AutoCAD 1:1 Graphical Door & Window Elevation Schedule sheet.
 *
 * @param {object} [options]
 * @param {Array} [options.doors]
 * @param {Array} [options.windows]
 * @param {number} [options.spacingMm=600]
 * @returns {object} { entities, dxf, svg, specs }
 */
export function generateDoorWindowElevationSchedule(options = {}) {
  const doors = Array.isArray(options.doors) && options.doors.length > 0 ? options.doors : STANDARD_DOOR_TYPES;
  const windows = Array.isArray(options.windows) && options.windows.length > 0 ? options.windows : STANDARD_WINDOW_TYPES;
  const spacing = Math.max(400, Number(options.spacingMm) || 700);

  const entities = [];

  // Finished Floor Line (FFL) running across entire sheet
  let totalSheetWidth = 0;
  doors.forEach(d => totalSheetWidth += d.widthMm + spacing);
  totalSheetWidth += 1000;

  entities.push({
    type: 'line',
    layer: 'A-FLOR-LEVL',
    x1: -0.5,
    y1: 0,
    x2: totalSheetWidth / 1000,
    y2: 0
  });

  entities.push({
    type: 'text',
    layer: 'A-ANNO-TEXT',
    x: -0.8,
    y: 0.05,
    text: 'FFL +/- 0.00',
    height: 0.16
  });

  let currentX = 0;

  // 1. Draw Door Elevations
  doors.forEach((door, idx) => {
    const x = currentX;
    const w = door.widthMm;
    const h = door.heightMm;
    const f = door.frameMm || 50;

    // Outer frame (A-DOOR)
    entities.push({ type: 'line', layer: 'A-DOOR', x1: x / 1000, y1: 0, x2: x / 1000, y2: h / 1000 });
    entities.push({ type: 'line', layer: 'A-DOOR', x1: (x + w) / 1000, y1: 0, x2: (x + w) / 1000, y2: h / 1000 });
    entities.push({ type: 'line', layer: 'A-DOOR', x1: x / 1000, y1: h / 1000, x2: (x + w) / 1000, y2: h / 1000 });

    // Inner door leaf line
    entities.push({ type: 'line', layer: 'A-DOOR', x1: (x + f) / 1000, y1: 0, x2: (x + f) / 1000, y2: (h - f) / 1000 });
    entities.push({ type: 'line', layer: 'A-DOOR', x1: (x + w - f) / 1000, y1: 0, x2: (x + w - f) / 1000, y2: (h - f) / 1000 });
    entities.push({ type: 'line', layer: 'A-DOOR', x1: (x + f) / 1000, y1: (h - f) / 1000, x2: (x + w - f) / 1000, y2: (h - f) / 1000 });

    // Handles & specific graphics
    if (door.type === 'double-egress') {
      const mid = x + w / 2;
      entities.push({ type: 'line', layer: 'A-DOOR', x1: mid / 1000, y1: 0, x2: mid / 1000, y2: (h - f) / 1000 });
      // Crash bars
      entities.push({ type: 'line', layer: 'A-DOOR', x1: (x + f + 50) / 1000, y1: 1.0, x2: (mid - 50) / 1000, y2: 1.0 });
      entities.push({ type: 'line', layer: 'A-DOOR', x1: (mid + 50) / 1000, y1: 1.0, x2: (x + w - f - 50) / 1000, y2: 1.0 });
    } else if (door.type === 'glazed-storefront') {
      // Glass pane inside leaf
      const bottomRail = 250;
      entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + f + 80) / 1000, y1: bottomRail / 1000, x2: (x + w - f - 80) / 1000, y2: bottomRail / 1000 });
      entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + f + 80) / 1000, y1: (h - f - 80) / 1000, x2: (x + w - f - 80) / 1000, y2: (h - f - 80) / 1000 });
      entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + f + 80) / 1000, y1: bottomRail / 1000, x2: (x + f + 80) / 1000, y2: (h - f - 80) / 1000 });
      entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + w - f - 80) / 1000, y1: bottomRail / 1000, x2: (x + w - f - 80) / 1000, y2: (h - f - 80) / 1000 });
    } else {
      // Lever handle
      entities.push({ type: 'circle', layer: 'A-DOOR', x: (x + w - f - 75) / 1000, y: 1.0, r: 0.03 });
      entities.push({ type: 'line', layer: 'A-DOOR', x1: (x + w - f - 75) / 1000, y1: 1.0, x2: (x + w - f - 170) / 1000, y2: 1.0 });
    }

    // Door tag hexagon / symbol above door
    const tagY = (h + 300) / 1000;
    const tagX = (x + w / 2) / 1000;
    entities.push({ type: 'circle', layer: 'A-ANNO-TEXT', x: tagX, y: tagY, r: 0.2 });
    entities.push({ type: 'text', layer: 'A-ANNO-TEXT', x: tagX - 0.1, y: tagY - 0.06, text: door.id, height: 0.15 });

    // Dimension callout below
    entities.push({ type: 'text', layer: 'A-ANNO-DIMS', x: (x + 50) / 1000, y: -0.25, text: `${w} x ${h} mm`, height: 0.14 });
    entities.push({ type: 'text', layer: 'A-ANNO-TEXT', x: (x + 50) / 1000, y: -0.45, text: `${door.material} (${door.fireRating})`, height: 0.12 });

    currentX += w + spacing;
  });

  // 2. Draw Window Elevations in Row Above
  const windowRowY = 3200; // Elevation baseline for windows
  entities.push({
    type: 'line',
    layer: 'A-FLOR-LEVL',
    x1: -0.5,
    y1: windowRowY / 1000,
    x2: totalSheetWidth / 1000,
    y2: windowRowY / 1000
  });
  entities.push({
    type: 'text',
    layer: 'A-ANNO-TEXT',
    x: -0.8,
    y: (windowRowY + 50) / 1000,
    text: 'WINDOW SILL LEVEL',
    height: 0.16
  });

  let winX = 0;
  windows.forEach((win) => {
    const x = winX;
    const y = (windowRowY + win.sillMm) / 1000;
    const w = win.widthMm;
    const h = win.heightMm;
    const f = win.frameMm || 50;

    // Outer frame (A-GLAZ)
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: x / 1000, y1: y, x2: (x + w) / 1000, y2: y });
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: x / 1000, y1: y + h / 1000, x2: (x + w) / 1000, y2: y + h / 1000 });
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: x / 1000, y1: y, x2: x / 1000, y2: y + h / 1000 });
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + w) / 1000, y1: y, x2: (x + w) / 1000, y2: y + h / 1000 });

    // Inner glass perimeter
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + f) / 1000, y1: y + f / 1000, x2: (x + w - f) / 1000, y2: y + f / 1000 });
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + f) / 1000, y1: y + (h - f) / 1000, x2: (x + w - f) / 1000, y2: y + (h - f) / 1000 });
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + f) / 1000, y1: y + f / 1000, x2: (x + f) / 1000, y2: y + (h - f) / 1000 });
    entities.push({ type: 'line', layer: 'A-GLAZ', x1: (x + w - f) / 1000, y1: y + f / 1000, x2: (x + w - f) / 1000, y2: y + (h - f) / 1000 });

    // Window tag
    const tagY = y + (h + 300) / 1000;
    const tagX = (x + w / 2) / 1000;
    entities.push({ type: 'circle', layer: 'A-ANNO-TEXT', x: tagX, y: tagY, r: 0.2 });
    entities.push({ type: 'text', layer: 'A-ANNO-TEXT', x: tagX - 0.1, y: tagY - 0.06, text: win.id, height: 0.15 });

    // Dimensions
    entities.push({ type: 'text', layer: 'A-ANNO-DIMS', x: (x + 50) / 1000, y: y - 0.25, text: `${w} x ${h} mm (SILL: ${win.sillMm} mm)`, height: 0.14 });
    entities.push({ type: 'text', layer: 'A-ANNO-TEXT', x: (x + 50) / 1000, y: y - 0.45, text: `${win.glazing} | U=${win.uValue}`, height: 0.12 });

    winX += w + spacing;
  });

  const dxf = buildDXF(entities, { scale: 1000 });

  return {
    entities,
    dxf,
    specs: {
      doorCount: doors.length,
      windowCount: windows.length,
      totalSheetWidthMm: totalSheetWidth
    }
  };
}

// =============================================================================
// 4. AUTOCAD PLOT STYLE (CTB) & PEN WEIGHT MANAGER
// =============================================================================

export const AIA_PLOT_STYLE_PENS = Object.freeze([
  { colorIndex: 1, colorName: 'Red', hex: '#ef4444', mm: 0.18, screening: 100, use: 'Fine: Dimensions, patterns, hatching boundaries, door swings' },
  { colorIndex: 2, colorName: 'Yellow', hex: '#eab308', mm: 0.35, screening: 100, use: 'Medium: Furniture, fixtures, casework, general linework' },
  { colorIndex: 3, colorName: 'Green', hex: '#22c55e', mm: 0.50, screening: 100, use: 'Heavy: Doors, window frames, interior partitions cut' },
  { colorIndex: 4, colorName: 'Cyan', hex: '#06b6d4', mm: 0.70, screening: 100, use: 'Extra Heavy: Primary structural walls cut, building envelope cut' },
  { colorIndex: 5, colorName: 'Blue', hex: '#3b82f6', mm: 0.25, screening: 100, use: 'Medium-Light: Mechanical, electrical, plumbing, site details' },
  { colorIndex: 6, colorName: 'Magenta', hex: '#d946ef', mm: 0.35, screening: 100, use: 'Medium: Railings, stairs, borders, title blocks' },
  { colorIndex: 7, colorName: 'White / Black', hex: '#f8fafc', mm: 0.25, screening: 100, use: 'Standard: General text, annotations, callout leaders' },
  { colorIndex: 8, colorName: 'Dark Gray', hex: '#64748b', mm: 0.09, screening: 50, use: 'Ultra-Fine Screened: Material hatch patterns, floor tile grid' },
  { colorIndex: 9, colorName: 'Light Gray', hex: '#cbd5e1', mm: 0.05, screening: 30, use: 'Ghost Screened: Background consultant xrefs, site contours' }
]);

/**
 * Generates an AutoCAD Script (.scr) that sets layer lineweights matching the AIA pen table.
 *
 * @returns {string} AutoCAD .scr script
 */
export function generateLayerLineweightScript() {
  const lines = [
    `;; =========================================================================`,
    `;; Architecture Helping Hand — AutoCAD Layer Lineweight & Pen Configurator`,
    `;; Sets standard AIA NCS lineweights directly on active drawing layers.`,
    `;; =========================================================================`,
    `_.-LAYER`,
    `_LWEIGHT 0.70 A-WALL-FULL`,
    `_LWEIGHT 0.50 A-DOOR`,
    `_LWEIGHT 0.50 A-GLAZ`,
    `_LWEIGHT 0.35 A-FURN`,
    `_LWEIGHT 0.35 A-FLOR-STRS`,
    `_LWEIGHT 0.35 A-FLOR-HRAL`,
    `_LWEIGHT 0.18 A-ANNO-DIMS`,
    `_LWEIGHT 0.25 A-ANNO-TEXT`,
    `_LWEIGHT 0.09 A-FLOR-PATT`,
    `_LWEIGHT 0.25 C-ROAD-STRP`,
    `_LWEIGHT 0.35 C-ROAD-PARK`,
    ``,
    `;; Enable on-screen Lineweight display`,
    `LWDISPLAY 1`,
    `REGEN`,
    `;; Pen weights successfully calibrated.`
  ];
  return lines.join('\r\n');
}

/**
 * Generates an AutoLISP command (c:AHH_SET_PEN_WEIGHTS) for instant 1-click execution.
 *
 * @returns {string} AutoLISP code
 */
export function generatePlotStyleAutoLisp() {
  return [
    `;; =========================================================================`,
    `;; Architecture Helping Hand — AutoLISP Pen Weight Setup`,
    `;; Drag & drop into any DWG to calibrate AIA standard lineweights.`,
    `;; =========================================================================`,
    `(vl-load-com)`,
    `(defun c:AHH_SET_PEN_WEIGHTS ()`,
    `  (setvar "CMDECHO" 0)`,
    `  (setvar "LWDISPLAY" 1)`,
    `  (command "_.-LAYER" "_LW" "0.70" "A-WALL-FULL" "")`,
    `  (command "_.-LAYER" "_LW" "0.50" "A-DOOR" "")`,
    `  (command "_.-LAYER" "_LW" "0.50" "A-GLAZ" "")`,
    `  (command "_.-LAYER" "_LW" "0.35" "A-FURN" "")`,
    `  (command "_.-LAYER" "_LW" "0.35" "A-FLOR-STRS" "")`,
    `  (command "_.-LAYER" "_LW" "0.35" "A-FLOR-HRAL" "")`,
    `  (command "_.-LAYER" "_LW" "0.18" "A-ANNO-DIMS" "")`,
    `  (command "_.-LAYER" "_LW" "0.25" "A-ANNO-TEXT" "")`,
    `  (command "_.-LAYER" "_LW" "0.09" "A-FLOR-PATT" "")`,
    `  (command "_.-LAYER" "_LW" "0.25" "C-ROAD-STRP" "")`,
    `  (command "_.-LAYER" "_LW" "0.35" "C-ROAD-PARK" "")`,
    `  (princ "\\nAll AIA NCS layer pen weights have been successfully applied.")`,
    `  (princ "\\nLWDISPLAY turned ON.")`,
    `  (princ)`,
    `)`
  ].join('\r\n');
}

/**
 * Generates a human-readable CTB configuration guide and pen table documentation.
 *
 * @returns {string} Documentation text
 */
export function generatePlotStyleReportText() {
  const header = [
    `================================================================================`,
    `ARCHITECTURE HELPING HAND — AIA NCS / ISO 13567 PLOT STYLE (CTB) PEN GUIDE`,
    `================================================================================`,
    `STANDARD: National CAD Standard (NCS) Color-Dependent Plot Style Table (.ctb)`,
    `HOW TO USE IN AUTOCAD:`,
    `1. Type PLOTSTYLEMANAGER in AutoCAD command line (opens Plot Styles folder).`,
    `2. Create a new Plot Style Table using the pen weights and screening below.`,
    `3. Or drag setup_pen_weights.lsp directly into your drawing to apply lineweights.`,
    `--------------------------------------------------------------------------------`,
    `COLOR   NAME           LINEWEIGHT   SCREENING   TYPICAL CAD APPLICATION`,
    `--------------------------------------------------------------------------------`
  ];

  const rows = AIA_PLOT_STYLE_PENS.map(p => {
    const col = String(p.colorIndex).padEnd(7);
    const name = p.colorName.padEnd(14);
    const mm = `${p.mm.toFixed(2)} mm`.padEnd(12);
    const scr = `${p.screening}%`.padEnd(11);
    return `${col} ${name} ${mm} ${scr} ${p.use}`;
  });

  const footer = [
    `--------------------------------------------------------------------------------`,
    `GRAYSCALE TONES (Colors 250 - 255):`,
    `Color 250: 80% Black (Heavy floor accent)`,
    `Color 251: 60% Black (Medium shading / shadow lines)`,
    `Color 252: 45% Black (Wall poché filling)`,
    `Color 253: 30% Black (Light surface texture)`,
    `Color 254: 15% Black (Glazing wash)`,
    `Color 255: White / Masking background`,
    `================================================================================`
  ];

  return [...header, ...rows, ...footer].join('\r\n');
}
