/**
 * Architecture Helping Hand - Presentation Sheet & Title Block Engine
 * Generates ISO architectural drawing sheets (A4, A3, A2, A1) with standardized
 * margins, professional CAD title blocks, scaled plan drawing viewports,
 * and print-ready SVG generation.
 */

export const SHEET_SIZES = Object.freeze({
  A4: { widthMm: 297, heightMm: 210, name: 'ISO A4 (297 × 210 mm)' },
  A3: { widthMm: 420, heightMm: 297, name: 'ISO A3 (420 × 297 mm)' },
  A2: { widthMm: 594, heightMm: 420, name: 'ISO A2 (594 × 420 mm)' },
  A1: { widthMm: 841, heightMm: 594, name: 'ISO A1 (841 × 594 mm)' }
});

export const ARCHITECTURAL_SCALES = Object.freeze([
  { ratio: 20, label: '1:20 (Detail)' },
  { ratio: 50, label: '1:50 (Detailed Plan)' },
  { ratio: 100, label: '1:100 (Standard Floor Plan)' },
  { ratio: 200, label: '1:200 (Site / Overall Plan)' },
  { ratio: 500, label: '1:500 (Master Plan)' }
]);

/**
 * Creates default presentation sheet document metadata.
 *
 * @param {Object} options
 * @returns {Object} Sheet configuration
 */
export function createSheetConfig(options = {}) {
  const rawSize = options.size || options.sheetSize || 'A3';
  const sizeKey = SHEET_SIZES[rawSize] ? rawSize : 'A3';
  const sizeDef = SHEET_SIZES[sizeKey];
  const isPortrait = options.orientation === 'portrait';

  const widthMm = isPortrait ? sizeDef.heightMm : sizeDef.widthMm;
  const heightMm = isPortrait ? sizeDef.widthMm : sizeDef.heightMm;
  const pName = options.projectName || 'Studio Residence Project';
  const sTitle = options.sheetTitle || 'GROUND FLOOR PLAN & STRUCTURAL GRID';
  const sNumber = options.sheetNumber || 'A-101';
  const sRatio = options.scaleRatio || 100;

  return {
    size: sizeKey,
    sheetSize: sizeKey,
    orientation: isPortrait ? 'portrait' : 'landscape',
    widthMm,
    heightMm,
    scaleRatio: sRatio,
    projectName: pName,
    sheetTitle: sTitle,
    sheetNumber: sNumber,
    marginMm: typeof options.marginMm === 'number' ? options.marginMm : 10,
    bindingMarginMm: typeof options.bindingMarginMm === 'number' ? options.bindingMarginMm : 20,
    titleBlock: {
      projectName: pName,
      sheetTitle: sTitle,
      sheetNumber: sNumber,
      scale: options.scale || `1:${sRatio}`,
      date: options.date || new Date().toISOString().slice(0, 10),
      revision: options.revision || 'REV 01',
      author: options.author || 'Architectural Studio',
      widthMm: 170,
      heightMm: 48
    },
    viewport: {
      scaleRatio: sRatio, // 1:100 scale default
      title: options.viewportTitle || `1  ${sTitle}`,
      showGrid: options.showGrid !== false
    }
  };
}

/**
 * Computes bounding box of real-world plan entities in meters.
 */
export function computePlanBounds(entities = []) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const e of entities) {
    if (!e) continue;
    if (e.kind === 'wall' && typeof e.x1 === 'number') {
      minX = Math.min(minX, e.x1, e.x2);
      minY = Math.min(minY, e.y1, e.y2);
      maxX = Math.max(maxX, e.x1, e.x2);
      maxY = Math.max(maxY, e.y1, e.y2);
    } else if (e.kind === 'grid_line' && e.p1 && e.p2) {
      minX = Math.min(minX, e.p1.x, e.p2.x);
      minY = Math.min(minY, e.p1.y, e.p2.y);
      maxX = Math.max(maxX, e.p1.x, e.p2.x);
      maxY = Math.max(maxY, e.p1.y, e.p2.y);
    } else if (e.kind === 'column' && typeof e.x === 'number' && typeof e.y === 'number') {
      const hw = (e.width || (e.radius ? e.radius * 2 : 0.4)) / 2;
      const hd = (e.depth || (e.radius ? e.radius * 2 : 0.4)) / 2;
      minX = Math.min(minX, e.x - hw);
      minY = Math.min(minY, e.y - hd);
      maxX = Math.max(maxX, e.x + hw);
      maxY = Math.max(maxY, e.y + hd);
    } else if (typeof e.x === 'number' && typeof e.y === 'number') {
      const w = e.width || (e.radius ? e.radius * 2 : 1);
      const d = e.depth || (e.radius ? e.radius * 2 : 1);
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + w);
      maxY = Math.max(maxY, e.y + d);
    }
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 10, maxY: 10, widthM: 10, heightM: 10, centerX: 5, centerY: 5 };
  }

  const widthM = Math.max(1, maxX - minX);
  const heightM = Math.max(1, maxY - minY);
  return {
    minX, minY, maxX, maxY,
    widthM, heightM,
    centerX: minX + widthM / 2,
    centerY: minY + heightM / 2
  };
}

/**
 * Computes drawing viewport placement and transformation on the sheet.
 *
 * @param {Object} sheetConfig
 * @param {Array<Object>} entities
 * @returns {Object} Viewport layout parameters
 */
export function computeViewportLayout(sheetConfig, entities = []) {
  const cfg = sheetConfig || createSheetConfig();
  const leftMargin = cfg.bindingMarginMm || 20;
  const rightMargin = cfg.marginMm || 10;
  const topMargin = cfg.marginMm || 10;
  const bottomMargin = cfg.marginMm || 10;

  // Usable area inside borders
  const drawAreaX = leftMargin;
  const drawAreaY = topMargin;
  const drawAreaW = cfg.widthMm - leftMargin - rightMargin;
  const drawAreaH = cfg.heightMm - topMargin - bottomMargin;

  const tb = cfg.titleBlock;
  const tbW = tb.widthMm || 170;
  const tbH = tb.heightMm || 48;
  const tbX = cfg.widthMm - rightMargin - tbW;
  const tbY = cfg.heightMm - bottomMargin - tbH;

  // Plan bounds in world meters (accepts entities array or precomputed bounds object)
  const bounds = (entities && typeof entities.minX === 'number')
    ? entities
    : computePlanBounds(entities);
  const scaleRatio = cfg.viewport.scaleRatio || 100;
  // 1 meter in real world = (1000 / scaleRatio) millimeters on sheet paper
  const mmPerMeter = 1000 / scaleRatio;

  const planWidthMm = bounds.widthM * mmPerMeter;
  const planHeightMm = bounds.heightM * mmPerMeter;

  // Viewport center in drawing area
  const vpCenterX = drawAreaX + drawAreaW / 2;
  const vpCenterY = drawAreaY + (drawAreaH - tbH * 0.4) / 2;

  return {
    drawArea: { x: drawAreaX, y: drawAreaY, width: drawAreaW, height: drawAreaH },
    titleBlock: { x: tbX, y: tbY, width: tbW, height: tbH },
    mmPerMeter,
    scaleRatio,
    planBounds: bounds,
    planSizeMm: { width: planWidthMm, height: planHeightMm },
    viewportWidth: planWidthMm,
    viewportHeight: planHeightMm,
    viewportCenterMm: { x: vpCenterX, y: vpCenterY }
  };
}

/**
 * Generates print-ready SVG presentation sheet with borders, title block,
 * and scaled drawing viewport.
 *
 * @param {Object|Array} arg1 - sheetConfig or entities
 * @param {Array|Object} [arg2] - entities or sheetConfig
 * @param {Object} [renderOptions]
 * @returns {string} Clean SVG markup string
 */
export function generateSheetSVG(arg1, arg2 = [], renderOptions = {}) {
  let cfg, entities;
  if (Array.isArray(arg1)) {
    entities = arg1;
    cfg = (arg2 && typeof arg2 === 'object' && arg2.widthMm) ? arg2 : createSheetConfig(arg2);
  } else {
    cfg = (arg1 && typeof arg1 === 'object' && arg1.widthMm) ? arg1 : createSheetConfig(arg1);
    entities = Array.isArray(arg2) ? arg2 : [];
  }
  const layout = computeViewportLayout(cfg, entities);

  const wMm = cfg.widthMm;
  const hMm = cfg.heightMm;
  const pxPerMm = renderOptions.pxPerMm || 3.7795; // ~96 DPI screen preview or 300 DPI print
  const wPx = (wMm * pxPerMm).toFixed(1);
  const hPx = (hMm * pxPerMm).toFixed(1);

  const { drawArea, titleBlock, mmPerMeter, planBounds, viewportCenterMm } = layout;

  // Title block cell paths and labels
  const tb = cfg.titleBlock;
  const tbX = titleBlock.x;
  const tbY = titleBlock.y;
  const tbW = titleBlock.width;
  const tbH = titleBlock.height;

  // Vector linework of plan inside viewport
  // Transform world (meters) to sheet (mm):
  // sheetX = vpCenterX + (worldX - centerX) * mmPerMeter
  // sheetY = vpCenterY - (worldY - centerY) * mmPerMeter
  const worldToSheet = (wx, wy) => ({
    x: viewportCenterMm.x + (wx - planBounds.centerX) * mmPerMeter,
    y: viewportCenterMm.y - (wy - planBounds.centerY) * mmPerMeter
  });

  const planElements = [];

  for (const e of entities) {
    if (!e) continue;
    if (e.kind === 'wall' && typeof e.x1 === 'number') {
      const p1 = worldToSheet(e.x1, e.y1);
      const p2 = worldToSheet(e.x2, e.y2);
      const thMm = (e.thickness || 0.2) * mmPerMeter;
      planElements.push(
        `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="#1e293b" stroke-width="${Math.max(0.6, thMm).toFixed(2)}" stroke-linecap="round" />`
      );
    } else if (e.kind === 'room' && typeof e.x === 'number' && typeof e.width === 'number') {
      const tl = worldToSheet(e.x, e.y + (e.depth || 0));
      const br = worldToSheet(e.x + e.width, e.y);
      const rw = Math.abs(br.x - tl.x);
      const rh = Math.abs(br.y - tl.y);
      planElements.push(
        `<rect x="${tl.x.toFixed(2)}" y="${tl.y.toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.3" stroke-dasharray="2 1" />`
      );
      if (e.name) {
        const c = worldToSheet(e.x + e.width / 2, e.y + (e.depth || 0) / 2);
        planElements.push(
          `<text x="${c.x.toFixed(2)}" y="${c.y.toFixed(2)}" font-family="system-ui, sans-serif" font-size="2.5" font-weight="600" fill="#334155" text-anchor="middle">${e.name}</text>`
        );
      }
    } else if (e.kind === 'column' && typeof e.x === 'number') {
      const c = worldToSheet(e.x, e.y);
      const cw = (e.width || 0.4) * mmPerMeter;
      const cd = (e.depth || 0.4) * mmPerMeter;
      if (e.profile === 'circle') {
        const cr = (e.radius || 0.2) * mmPerMeter;
        planElements.push(
          `<circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${cr.toFixed(2)}" fill="#475569" stroke="#0f172a" stroke-width="0.4" />`
        );
      } else {
        planElements.push(
          `<rect x="${(c.x - cw / 2).toFixed(2)}" y="${(c.y - cd / 2).toFixed(2)}" width="${cw.toFixed(2)}" height="${cd.toFixed(2)}" fill="#475569" stroke="#0f172a" stroke-width="0.4" />`
        );
      }
    } else if (e.kind === 'grid_line' && e.p1 && e.p2) {
      const p1 = worldToSheet(e.p1.x, e.p1.y);
      const p2 = worldToSheet(e.p2.x, e.p2.y);
      const bRad = (e.bubbleRadius || 0.35) * mmPerMeter;
      planElements.push(
        `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="#64748b" stroke-width="0.25" stroke-dasharray="4 1.5 1 1.5" />`
      );
      if (e.bubblePosition === 'both' || e.bubblePosition === 'start') {
        planElements.push(
          `<circle cx="${p1.x.toFixed(2)}" cy="${p1.y.toFixed(2)}" r="${bRad.toFixed(2)}" fill="#ffffff" stroke="#475569" stroke-width="0.3" />`,
          `<text x="${p1.x.toFixed(2)}" y="${(p1.y + 0.8).toFixed(2)}" font-family="system-ui, sans-serif" font-size="2.2" font-weight="bold" fill="#0f172a" text-anchor="middle">${e.name}</text>`
        );
      }
      if (e.bubblePosition === 'both' || e.bubblePosition === 'end') {
        planElements.push(
          `<circle cx="${p2.x.toFixed(2)}" cy="${p2.y.toFixed(2)}" r="${bRad.toFixed(2)}" fill="#ffffff" stroke="#475569" stroke-width="0.3" />`,
          `<text x="${p2.x.toFixed(2)}" y="${(p2.y + 0.8).toFixed(2)}" font-family="system-ui, sans-serif" font-size="2.2" font-weight="bold" fill="#0f172a" text-anchor="middle">${e.name}</text>`
        );
      }
    }
  }

  // Viewport Title underline mark
  const vpTitleY = viewportCenterMm.y + layout.planSizeMm.height / 2 + 12;
  const vpTitleMarkup = `
    <!-- Drawing Viewport Title -->
    <g class="sheet-viewport-title">
      <circle cx="${drawArea.x + 10}" cy="${vpTitleY.toFixed(2)}" r="4.5" fill="none" stroke="#0f172a" stroke-width="0.5" />
      <text x="${drawArea.x + 10}" y="${(vpTitleY + 1.5).toFixed(2)}" font-family="system-ui, sans-serif" font-size="3.5" font-weight="bold" fill="#0f172a" text-anchor="middle">1</text>
      <text x="${drawArea.x + 18}" y="${vpTitleY.toFixed(2)}" font-family="system-ui, sans-serif" font-size="3.5" font-weight="bold" fill="#0f172a">${cfg.viewport.title || 'GROUND FLOOR PLAN'}</text>
      <text x="${drawArea.x + 18}" y="${(vpTitleY + 4.5).toFixed(2)}" font-family="system-ui, sans-serif" font-size="2.5" font-weight="normal" fill="#64748b">SCALE ${cfg.titleBlock.scale || '1:100'}</text>
      <line x1="${drawArea.x + 5}" y1="${(vpTitleY + 7).toFixed(2)}" x2="${drawArea.x + 120}" y2="${(vpTitleY + 7).toFixed(2)}" stroke="#0f172a" stroke-width="0.6" />
    </g>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wMm} ${hMm}" width="${wPx}px" height="${hPx}px">
  <!-- Sheet Background (Paper) -->
  <rect x="0" y="0" width="${wMm}" height="${hMm}" fill="#ffffff" />

  <!-- Outer Sheet Margin Guide -->
  <rect x="5" y="5" width="${wMm - 10}" height="${hMm - 10}" fill="none" stroke="#e2e8f0" stroke-width="0.25" />

  <!-- Inner CAD Drawing Border -->
  <rect x="${drawArea.x}" y="${drawArea.y}" width="${drawArea.width}" height="${drawArea.height}" fill="none" stroke="#0f172a" stroke-width="0.7" />

  <!-- Scaled Plan Viewport Geometry -->
  <g class="sheet-plan-graphics">
    ${planElements.join('\n    ')}
  </g>

  ${vpTitleMarkup}

  <!-- CAD Title Block -->
  <g class="sheet-title-block" id="title-block" transform="translate(${tbX}, ${tbY})">
    <!-- Title block border -->
    <rect x="0" y="0" width="${tbW}" height="${tbH}" fill="#ffffff" stroke="#0f172a" stroke-width="0.7" />

    <!-- Grid dividing lines -->
    <line x1="0" y1="16" x2="${tbW}" y2="16" stroke="#0f172a" stroke-width="0.4" />
    <line x1="0" y1="32" x2="${tbW}" y2="32" stroke="#0f172a" stroke-width="0.4" />
    <line x1="100" y1="16" x2="100" y2="${tbH}" stroke="#0f172a" stroke-width="0.4" />
    <line x1="135" y1="32" x2="135" y2="${tbH}" stroke="#0f172a" stroke-width="0.4" />

    <!-- Top cell: Practice & Project Name -->
    <text x="6" y="6.5" font-family="system-ui, sans-serif" font-size="2" fill="#64748b" font-weight="600">PROJECT</text>
    <text x="6" y="12" font-family="system-ui, sans-serif" font-size="4" fill="#0f172a" font-weight="bold">${tb.projectName}</text>

    <!-- Middle cell: Drawing Title -->
    <text x="6" y="21" font-family="system-ui, sans-serif" font-size="2" fill="#64748b" font-weight="600">DRAWING TITLE</text>
    <text x="6" y="27" font-family="system-ui, sans-serif" font-size="3.5" fill="#0f172a" font-weight="bold">${tb.sheetTitle}</text>

    <!-- Bottom Left: Author & Date -->
    <text x="6" y="37" font-family="system-ui, sans-serif" font-size="1.8" fill="#64748b">AUTHOR: <tspan fill="#0f172a" font-weight="bold">${tb.author}</tspan></text>
    <text x="6" y="43" font-family="system-ui, sans-serif" font-size="1.8" fill="#64748b">DATE: <tspan fill="#0f172a" font-weight="bold">${tb.date}</tspan></text>

    <!-- Middle Right: Scale & Rev -->
    <text x="104" y="21" font-family="system-ui, sans-serif" font-size="2" fill="#64748b" font-weight="600">SCALE</text>
    <text x="104" y="27" font-family="system-ui, sans-serif" font-size="3.5" fill="#0f172a" font-weight="bold">${tb.scale}</text>

    <text x="104" y="37" font-family="system-ui, sans-serif" font-size="2" fill="#64748b" font-weight="600">REV</text>
    <text x="104" y="44" font-family="system-ui, sans-serif" font-size="4" fill="#0f172a" font-weight="bold">${tb.revision}</text>

    <!-- Bottom Right: Sheet Number -->
    <text x="139" y="37" font-family="system-ui, sans-serif" font-size="2" fill="#64748b" font-weight="600">SHEET NO.</text>
    <text x="139" y="44" font-family="system-ui, sans-serif" font-size="5" fill="#0f172a" font-weight="bold">${tb.sheetNumber}</text>

    <!-- Mini North Arrow inside title block -->
    <g class="sheet-north-arrow" id="north-arrow" transform="translate(${tbW - 14}, 8) scale(0.6)">
      <polygon points="0,-7 -3.5,4 0,1.5" fill="#0f172a" />
      <polygon points="0,-7 0,1.5 3.5,4" fill="#94a3b8" />
      <text x="0" y="-8.5" font-family="system-ui, sans-serif" font-size="3" font-weight="bold" fill="#0f172a" text-anchor="middle">N</text>
    </g>
  </g>
</svg>`;
}
