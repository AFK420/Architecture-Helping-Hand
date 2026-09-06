/**
 * Architecture Helping Hand - Construction Detail Assemblies & Vector Engine
 * Zero-dependency architectural construction detail modeling and rendering engine.
 * Generates high-precision, enlarged technical construction details (1:10, 1:5 scale)
 * with multi-material pochè/hatching, keynote callouts, leader lines, and scale bars.
 */

import { requireFiniteNumber } from './calculator.js';

export const DETAIL_ASSEMBLIES = Object.freeze({
  footing: {
    key: 'footing',
    title: 'EXTERIOR WALL & STRIP FOOTING DETAIL',
    sheetRef: 'A-501',
    detailNum: '1',
    scaleRatio: 10,
    scaleLabel: '1:10',
    description: 'Cast-in-place concrete stem wall on continuous strip footing with weeping tile drain and damp-proofing.'
  },
  parapet: {
    key: 'parapet',
    title: 'ROOF PARAPET & COPING DETAIL',
    sheetRef: 'A-501',
    detailNum: '2',
    scaleRatio: 10,
    scaleLabel: '1:10',
    description: 'Sloped metal coping cap with continuous drip notches, cant strip, rigid insulation, and EPDM roofing membrane.'
  },
  window_sill: {
    key: 'window_sill',
    title: 'EXTERIOR WINDOW SILL & CAVITY WALL DETAIL',
    sheetRef: 'A-501',
    detailNum: '3',
    scaleRatio: 5,
    scaleLabel: '1:5',
    description: 'Thermally-broken aluminum window frame, sloped precast stone sill with drip groove, and insulated brick cavity wall.'
  },
  stair_nosing: {
    key: 'stair_nosing',
    title: 'STAIR NOSING & TREAD ASSEMBLY DETAIL',
    sheetRef: 'A-501',
    detailNum: '4',
    scaleRatio: 5,
    scaleLabel: '1:5',
    description: 'Reinforced concrete stair waist slab, non-slip abrasive carborundum insert, and stainless steel baluster anchor.'
  }
});

/**
 * Generates an architectural construction assembly model for a specified detail type.
 *
 * @param {string} [detailKey='footing'] - One of 'footing', 'parapet', 'window_sill', 'stair_nosing'
 * @param {Object} [options] - Custom parametric overrides
 * @returns {Object} Construction detail assembly model
 */
export function generateDetailAssembly(detailKey = 'footing', options = {}) {
  const key = (detailKey in DETAIL_ASSEMBLIES) ? detailKey : 'footing';
  const meta = DETAIL_ASSEMBLIES[key];

  switch (key) {
    case 'parapet':
      return buildParapetDetail(meta, options);
    case 'window_sill':
      return buildWindowSillDetail(meta, options);
    case 'stair_nosing':
      return buildStairNosingDetail(meta, options);
    case 'footing':
    default:
      return buildFootingDetail(meta, options);
  }
}

/**
 * Detail 1: Exterior Wall & Strip Footing Detail (1:10)
 */
function buildFootingDetail(meta, options = {}) {
  const footingW = options.footingWidth || 0.60;
  const footingH = options.footingHeight || 0.30;
  const stemW = options.stemWidth || 0.25;
  const stemH = options.stemHeight || 0.90;
  const slabT = options.slabThickness || 0.15;

  const components = [
    {
      id: 'subgrade',
      name: 'Compacted Subgrade Soil',
      material: 'earth',
      x: -0.40, y: -footingH - 0.25, width: 1.40, height: 0.25,
      hatch: 'earth'
    },
    {
      id: 'gravel_bed',
      name: 'Granular Gravel Base (150mm)',
      material: 'gravel',
      x: 0.05, y: -footingH, width: 0.70, height: 0.20,
      hatch: 'gravel'
    },
    {
      id: 'footing',
      name: 'Reinforced Concrete Strip Footing',
      material: 'concrete',
      x: 0.10, y: -footingH, width: footingW, height: footingH,
      hatch: 'concrete',
      rebar: [
        { cx: 0.22, cy: -footingH + 0.08, r: 0.012 },
        { cx: 0.38, cy: -footingH + 0.08, r: 0.012 },
        { cx: 0.54, cy: -footingH + 0.08, r: 0.012 },
        { cx: 0.25, cy: -footingH + 0.22, r: 0.012 },
        { cx: 0.51, cy: -footingH + 0.22, r: 0.012 }
      ]
    },
    {
      id: 'stem_wall',
      name: 'Reinforced Concrete Foundation Wall',
      material: 'concrete',
      x: 0.25, y: 0.0, width: stemW, height: stemH,
      hatch: 'concrete'
    },
    {
      id: 'drain_tile',
      name: 'Ø100mm Perforated PVC Drain Tile Pipe',
      material: 'pvc',
      cx: 0.65, cy: -footingH + 0.10, r: 0.05,
      hatch: 'pipe'
    },
    {
      id: 'dpm',
      name: 'Continuous Damp-Proof Membrane (DPM)',
      material: 'membrane',
      polyline: [
        { x: 0.51, y: stemH - 0.10 },
        { x: 0.51, y: 0.0 },
        { x: 0.70, y: 0.0 },
        { x: 0.70, y: -footingH }
      ],
      strokeWidth: 2
    },
    {
      id: 'interior_slab',
      name: '150mm Cast Concrete Ground Slab',
      material: 'concrete',
      x: -0.35, y: stemH - slabT, width: 0.60, height: slabT,
      hatch: 'concrete'
    },
    {
      id: 'rigid_insulation',
      name: '50mm Rigid Extruded Polystyrene (XPS)',
      material: 'insulation',
      x: 0.50, y: 0.05, width: 0.06, height: stemH - 0.15,
      hatch: 'insulation'
    }
  ];

  const keynotes = [
    { num: 1, text: '250mm Reinforced Concrete Foundation Stem Wall', x: 0.35, y: 0.60, leaderX: 0.90, leaderY: 0.80 },
    { num: 2, text: '600×300mm Continuous Concrete Strip Footing', x: 0.40, y: -0.15, leaderX: 0.90, leaderY: 0.05 },
    { num: 3, text: 'Ø100mm Perforated Drain Tile in Washed Stone', x: 0.65, y: -0.20, leaderX: 0.90, leaderY: -0.25 },
    { num: 4, text: 'Continuous Bituminous Waterproofing Membrane', x: 0.51, y: 0.40, leaderX: 0.90, leaderY: 0.50 },
    { num: 5, text: '150mm Cast Concrete Slab on Sand Blinding', x: -0.10, y: stemH - 0.08, leaderX: -0.30, leaderY: 0.90 },
    { num: 6, text: 'Compacted Subgrade Soil with 45° Earth Hatch', x: -0.15, y: -0.45, leaderX: -0.30, leaderY: -0.35 }
  ];

  return {
    key: meta.key,
    title: meta.title,
    sheetRef: meta.sheetRef,
    detailNum: meta.detailNum,
    scaleRatio: meta.scaleRatio,
    scaleLabel: meta.scaleLabel,
    description: meta.description,
    bounds: { minX: -0.45, minY: -0.60, maxX: 1.05, maxY: 1.05 },
    components,
    keynotes
  };
}

/**
 * Detail 2: Roof Parapet & Coping Detail (1:10)
 */
function buildParapetDetail(meta, options = {}) {
  const parapetW = 0.25;
  const parapetH = 0.65;
  const slabT = 0.25;

  const components = [
    {
      id: 'concrete_parapet',
      name: 'Reinforced Concrete Parapet Upstand',
      material: 'concrete',
      x: 0.15, y: 0.0, width: parapetW, height: parapetH,
      hatch: 'concrete'
    },
    {
      id: 'roof_slab',
      name: '250mm Reinforced Concrete Roof Slab',
      material: 'concrete',
      x: 0.40, y: 0.0, width: 0.70, height: slabT,
      hatch: 'concrete'
    },
    {
      id: 'rigid_insulation',
      name: '100mm Tapered Rigid Polyiso Insulation',
      material: 'insulation',
      x: 0.40, y: slabT, width: 0.70, height: 0.12,
      hatch: 'insulation'
    },
    {
      id: 'cant_strip',
      name: '100×100mm 45° Wood Cant Strip',
      material: 'wood',
      polygon: [
        { x: 0.40, y: slabT + 0.12 },
        { x: 0.48, y: slabT + 0.12 },
        { x: 0.40, y: slabT + 0.20 }
      ],
      hatch: 'wood'
    },
    {
      id: 'coping_cap',
      name: 'Pre-Finished Aluminum Coping Cap with Drip Notches',
      material: 'aluminum',
      polyline: [
        { x: 0.10, y: parapetH + 0.02 },
        { x: 0.12, y: parapetH + 0.05 },
        { x: 0.42, y: parapetH + 0.07 },
        { x: 0.44, y: parapetH + 0.04 },
        { x: 0.44, y: parapetH + 0.01 }
      ],
      strokeWidth: 2.5
    },
    {
      id: 'epdm_membrane',
      name: 'Fully Adhered EPDM Waterproof Membrane',
      material: 'membrane',
      polyline: [
        { x: 1.10, y: slabT + 0.125 },
        { x: 0.48, y: slabT + 0.125 },
        { x: 0.405, y: slabT + 0.205 },
        { x: 0.405, y: parapetH + 0.04 },
        { x: 0.25, y: parapetH + 0.05 }
      ],
      strokeWidth: 2.0
    }
  ];

  const keynotes = [
    { num: 1, text: 'Continuous Sloped Metal Coping Cap (min 2° slope)', x: 0.28, y: parapetH + 0.06, leaderX: 0.75, leaderY: 0.90 },
    { num: 2, text: 'Fully Adhered 1.5mm EPDM Membrane flashing', x: 0.405, y: parapetH - 0.10, leaderX: 0.75, leaderY: 0.65 },
    { num: 3, text: '45° Cant Strip at Floor/Wall Intersection', x: 0.44, y: slabT + 0.15, leaderX: 0.75, leaderY: 0.45 },
    { num: 4, text: '100mm Rigid Polyisocyanurate Thermal Board', x: 0.65, y: slabT + 0.06, leaderX: 0.95, leaderY: 0.35 },
    { num: 5, text: '250mm Cast Concrete Structural Roof Slab', x: 0.65, y: slabT - 0.10, leaderX: 0.95, leaderY: 0.10 },
    { num: 6, text: 'Cast-in-Place Concrete Parapet Spandrel', x: 0.27, y: 0.30, leaderX: -0.15, leaderY: 0.40 }
  ];

  return {
    key: meta.key,
    title: meta.title,
    sheetRef: meta.sheetRef,
    detailNum: meta.detailNum,
    scaleRatio: meta.scaleRatio,
    scaleLabel: meta.scaleLabel,
    description: meta.description,
    bounds: { minX: -0.25, minY: -0.10, maxX: 1.20, maxY: 0.95 },
    components,
    keynotes
  };
}

/**
 * Detail 3: Exterior Window Sill & Cavity Wall Detail (1:5)
 */
function buildWindowSillDetail(meta, options = {}) {
  const components = [
    {
      id: 'brick_veneer',
      name: '90mm Modular Clay Brick Veneer',
      material: 'brick',
      x: 0.05, y: 0.0, width: 0.10, height: 0.45,
      hatch: 'brick'
    },
    {
      id: 'air_cavity',
      name: '40mm Clear Drainage Cavity',
      material: 'air',
      x: 0.15, y: 0.0, width: 0.04, height: 0.45,
      hatch: 'air'
    },
    {
      id: 'rigid_insulation',
      name: '60mm Rigid Foil-Faced XPS Insulation',
      material: 'insulation',
      x: 0.19, y: 0.0, width: 0.06, height: 0.45,
      hatch: 'insulation'
    },
    {
      id: 'cmu_backup',
      name: '150mm Concrete Masonry Unit (CMU) Backup',
      material: 'concrete_block',
      x: 0.25, y: 0.0, width: 0.15, height: 0.45,
      hatch: 'cmu'
    },
    {
      id: 'stone_sill',
      name: 'Sloped Precast Architectural Stone Sill',
      material: 'stone',
      polygon: [
        { x: 0.02, y: 0.42 },
        { x: 0.28, y: 0.48 },
        { x: 0.28, y: 0.42 },
        { x: 0.02, y: 0.36 }
      ],
      dripNotch: { cx: 0.04, cy: 0.38, r: 0.008 }
    },
    {
      id: 'flashing',
      name: 'Self-Adhered Flexible Sill Pan Flashing',
      material: 'flashing',
      polyline: [
        { x: 0.02, y: 0.36 },
        { x: 0.28, y: 0.42 },
        { x: 0.28, y: 0.52 }
      ],
      strokeWidth: 2.0
    },
    {
      id: 'window_frame',
      name: 'Thermally-Broken Extruded Aluminum Frame',
      material: 'aluminum',
      x: 0.22, y: 0.48, width: 0.08, height: 0.10,
      hatch: 'metal'
    },
    {
      id: 'glazing',
      name: '28mm Low-E Double Insulated Glass Unit (IGU)',
      material: 'glass',
      x: 0.25, y: 0.58, width: 0.028, height: 0.35,
      hatch: 'glass'
    },
    {
      id: 'interior_stool',
      name: 'Hardwood Interior Window Stool & Apron',
      material: 'wood',
      polygon: [
        { x: 0.29, y: 0.48 },
        { x: 0.43, y: 0.48 },
        { x: 0.43, y: 0.45 },
        { x: 0.39, y: 0.45 },
        { x: 0.39, y: 0.35 },
        { x: 0.37, y: 0.35 },
        { x: 0.37, y: 0.45 },
        { x: 0.29, y: 0.45 }
      ],
      hatch: 'wood'
    }
  ];

  const keynotes = [
    { num: 1, text: '28mm Double-Glazed IGU with Argon Gas Fill', x: 0.27, y: 0.75, leaderX: 0.60, leaderY: 0.85 },
    { num: 2, text: 'Thermally-Broken Aluminum Frame & Sealant', x: 0.26, y: 0.53, leaderX: 0.60, leaderY: 0.62 },
    { num: 3, text: 'Hardwood Window Stool with Painted Apron', x: 0.36, y: 0.46, leaderX: 0.60, leaderY: 0.45 },
    { num: 4, text: 'Sloped Precast Stone Sill with 10mm Drip Groove', x: 0.10, y: 0.41, leaderX: -0.15, leaderY: 0.48 },
    { num: 5, text: 'Self-Adhered Flexible EPDM End-Dam Flashing', x: 0.28, y: 0.48, leaderX: -0.15, leaderY: 0.30 },
    { num: 6, text: '100mm Clay Brick Veneer & 40mm Drainage Cavity', x: 0.08, y: 0.20, leaderX: -0.15, leaderY: 0.12 }
  ];

  return {
    key: meta.key,
    title: meta.title,
    sheetRef: meta.sheetRef,
    detailNum: meta.detailNum,
    scaleRatio: meta.scaleRatio,
    scaleLabel: meta.scaleLabel,
    description: meta.description,
    bounds: { minX: -0.22, minY: -0.05, maxX: 0.70, maxY: 0.95 },
    components,
    keynotes
  };
}

/**
 * Detail 4: Stair Nosing & Tread Assembly Detail (1:5)
 */
function buildStairNosingDetail(meta, options = {}) {
  const components = [
    {
      id: 'concrete_waist',
      name: '150mm Reinforced Concrete Stair Waist Slab',
      material: 'concrete',
      polygon: [
        { x: 0.0, y: 0.0 },
        { x: 0.28, y: 0.0 },
        { x: 0.28, y: 0.17 },
        { x: 0.56, y: 0.17 },
        { x: 0.56, y: 0.34 },
        { x: 0.70, y: 0.34 },
        { x: 0.70, y: 0.14 },
        { x: 0.14, y: -0.20 },
        { x: 0.0, y: -0.20 }
      ],
      hatch: 'concrete'
    },
    {
      id: 'screed_bed',
      name: '30mm Cementitious Mortar Bed',
      material: 'mortar',
      polygon: [
        { x: 0.0, y: 0.0 },
        { x: 0.28, y: 0.0 },
        { x: 0.28, y: 0.03 },
        { x: 0.0, y: 0.03 }
      ],
      hatch: 'mortar'
    },
    {
      id: 'tread_paver',
      name: '30mm Terrazzo Paver Tread with 25mm Rounded Nosing',
      material: 'stone',
      polygon: [
        { x: -0.025, y: 0.03 },
        { x: 0.28, y: 0.03 },
        { x: 0.28, y: 0.06 },
        { x: -0.025, y: 0.06 }
      ],
      nosingBullnose: { cx: -0.025, cy: 0.045, r: 0.015 }
    },
    {
      id: 'abrasive_insert',
      name: '25mm Non-Slip Carborundum Safety Insert Strip',
      material: 'carborundum',
      x: 0.02, y: 0.055, width: 0.035, height: 0.008,
      hatch: 'solid'
    },
    {
      id: 'anchor_base',
      name: '100×100×10mm Stainless Steel Post Baseplate',
      material: 'steel',
      x: 0.18, y: 0.06, width: 0.08, height: 0.012,
      hatch: 'metal'
    },
    {
      id: 'anchor_bolt',
      name: 'M12 Heavy-Duty Expansion Anchor Bolt into Concrete',
      material: 'steel',
      lines: [
        { x1: 0.20, y1: 0.06, x2: 0.20, y2: -0.05 },
        { x1: 0.24, y1: 0.06, x2: 0.24, y2: -0.05 }
      ]
    },
    {
      id: 'baluster_post',
      name: 'Ø42mm Brushed Stainless Steel Baluster Post',
      material: 'steel',
      x: 0.205, y: 0.072, width: 0.03, height: 0.45,
      hatch: 'metal'
    }
  ];

  const keynotes = [
    { num: 1, text: 'Ø42mm Stainless Steel Baluster Post (900mm to rail)', x: 0.22, y: 0.45, leaderX: 0.55, leaderY: 0.55 },
    { num: 2, text: '100×100×10mm Baseplate with M12 Anchor Bolts', x: 0.25, y: 0.07, leaderX: 0.55, leaderY: 0.25 },
    { num: 3, text: '30mm Terrazzo Paver with 25mm Bullnose Nosing', x: -0.02, y: 0.06, leaderX: -0.18, leaderY: 0.22 },
    { num: 4, text: 'Continuous Abrasive Non-Slip Carborundum Insert', x: 0.035, y: 0.06, leaderX: -0.18, leaderY: 0.05 },
    { num: 5, text: '30mm Polymer-Modified Screed Bedding Mortar', x: 0.15, y: 0.015, leaderX: -0.18, leaderY: -0.10 },
    { num: 6, text: '150mm Cast Concrete Structural Stair Waist Slab', x: 0.35, y: 0.05, leaderX: 0.55, leaderY: -0.12 }
  ];

  return {
    key: meta.key,
    title: meta.title,
    sheetRef: meta.sheetRef,
    detailNum: meta.detailNum,
    scaleRatio: meta.scaleRatio,
    scaleLabel: meta.scaleLabel,
    description: meta.description,
    bounds: { minX: -0.25, minY: -0.25, maxX: 0.75, maxY: 0.65 },
    components,
    keynotes
  };
}

/**
 * Generates an SVG string representation of an architectural construction detail.
 *
 * @param {string|Object} assemblyOrKey - Detail assembly model or key
 * @param {Object} [options]
 * @param {number} [options.width=800] - SVG width in px
 * @param {number} [options.height=600] - SVG height in px
 * @returns {string} Standalone vector SVG markup
 */
export function generateDetailSVG(assemblyOrKey, options = {}) {
  const assembly = (typeof assemblyOrKey === 'string')
    ? generateDetailAssembly(assemblyOrKey, options)
    : (assemblyOrKey || generateDetailAssembly('footing', options));

  const svgW = options.width || 800;
  const svgH = options.height || 600;
  const margin = 40;

  const bounds = assembly.bounds || { minX: -0.3, minY: -0.3, maxX: 1.0, maxY: 1.0 };
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;

  // Compute uniform scaling to fit bounds inside SVG drawing area
  const drawW = svgW - margin * 2;
  const drawH = svgH - margin * 2 - 50; // extra space for title block at bottom
  const scale = Math.min(drawW / worldW, drawH / worldH) * 0.95;

  const originX = margin + (drawW - worldW * scale) / 2 - bounds.minX * scale;
  const originY = margin + (drawH - worldH * scale) / 2 + bounds.maxY * scale;

  function toSvgX(x) { return originX + x * scale; }
  function toSvgY(y) { return originY - y * scale; }

  let elements = '';

  // 1. Components
  for (const c of assembly.components || []) {
    if (c.hatch === 'concrete') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + c.height);
      const w = c.width * scale;
      const h = c.height * scale;
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concreteHatch)" stroke="#0f172a" stroke-width="2"/>`;
      if (Array.isArray(c.rebar)) {
        for (const rb of c.rebar) {
          const rx = toSvgX(rb.cx);
          const ry = toSvgY(rb.cy);
          const rr = Math.max(3, rb.r * scale);
          elements += `<circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="${rr.toFixed(1)}" fill="#0f172a"/>`;
        }
      }
    } else if (c.hatch === 'earth') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + c.height);
      const w = c.width * scale;
      const h = c.height * scale;
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#earthDetailHatch)" stroke="#475569" stroke-dasharray="3 3"/>`;
    } else if (c.hatch === 'gravel') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + c.height);
      const w = c.width * scale;
      const h = c.height * scale;
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#gravelHatch)" stroke="#64748b"/>`;
    } else if (c.hatch === 'insulation') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + c.height);
      const w = c.width * scale;
      const h = c.height * scale;
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#insulationHatch)" stroke="#eab308" stroke-width="1.5"/>`;
    } else if (c.hatch === 'brick') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + c.height);
      const w = c.width * scale;
      const h = c.height * scale;
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#brickHatch)" stroke="#b91c1c" stroke-width="1.5"/>`;
    } else if (c.hatch === 'cmu') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + c.height);
      const w = c.width * scale;
      const h = c.height * scale;
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#f1f5f9" stroke="#334155" stroke-width="1.5"/>`;
      // Draw cross lines for CMU cell
      elements += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${(y + h).toFixed(1)}" stroke="#cbd5e1" stroke-width="1"/>`;
      elements += `<line x1="${(x + w).toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + h).toFixed(1)}" stroke="#cbd5e1" stroke-width="1"/>`;
    } else if (c.polygon) {
      const pts = c.polygon.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ');
      const fill = c.material === 'concrete' ? 'url(#concreteHatch)' : (c.material === 'wood' ? '#fef3c7' : '#e2e8f0');
      elements += `<polygon points="${pts}" fill="${fill}" stroke="#0f172a" stroke-width="2"/>`;
    } else if (c.polyline) {
      const pts = c.polyline.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ');
      const stroke = c.material === 'aluminum' ? '#0284c7' : '#0f172a';
      const sw = (c.strokeWidth || 2) * (scale / 150);
      elements += `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${Math.max(2, sw).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (c.material === 'pvc' && typeof c.cx === 'number') {
      const cx = toSvgX(c.cx);
      const cy = toSvgY(c.cy);
      const r = c.r * scale;
      elements += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>`;
      elements += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.75).toFixed(1)}" fill="#ffffff" stroke="#64748b" stroke-dasharray="3 3"/>`;
    } else if (c.lines) {
      for (const ln of c.lines) {
        elements += `<line x1="${toSvgX(ln.x1).toFixed(1)}" y1="${toSvgY(ln.y1).toFixed(1)}" x2="${toSvgX(ln.x2).toFixed(1)}" y2="${toSvgY(ln.y2).toFixed(1)}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>`;
      }
    } else if (typeof c.x === 'number') {
      const x = toSvgX(c.x);
      const y = toSvgY(c.y + (c.height || 0.1));
      const w = (c.width || 0.1) * scale;
      const h = (c.height || 0.1) * scale;
      const fill = c.material === 'glass' ? '#bae6fd' : (c.material === 'aluminum' ? '#38bdf8' : '#e2e8f0');
      elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="#0f172a" stroke-width="1.5"/>`;
    }
  }

  // 2. Keynotes & Leader lines
  let keynoteSvg = '';
  for (const kn of assembly.keynotes || []) {
    const originPtX = toSvgX(kn.x);
    const originPtY = toSvgY(kn.y);
    const textPtX = toSvgX(kn.leaderX);
    const textPtY = toSvgY(kn.leaderY);
    const isRight = kn.leaderX >= kn.x;
    const shoulderX = isRight ? textPtX - 15 : textPtX + 15;

    // Leader line
    keynoteSvg += `<polyline points="${originPtX.toFixed(1)},${originPtY.toFixed(1)} ${shoulderX.toFixed(1)},${textPtY.toFixed(1)} ${textPtX.toFixed(1)},${textPtY.toFixed(1)}" fill="none" stroke="#475569" stroke-width="1.2"/>`;
    // Dot at origin
    keynoteSvg += `<circle cx="${originPtX.toFixed(1)}" cy="${originPtY.toFixed(1)}" r="2.5" fill="#0f172a"/>`;
    // Number bubble at shoulder
    keynoteSvg += `<circle cx="${shoulderX.toFixed(1)}" cy="${textPtY.toFixed(1)}" r="7.5" fill="#0f172a"/>`;
    keynoteSvg += `<text x="${shoulderX.toFixed(1)}" y="${(textPtY + 3.5).toFixed(1)}" text-anchor="middle" font-family="'Courier New', monospace" font-size="8.5" font-weight="bold" fill="#ffffff">${kn.num}</text>`;
    // Text label
    const anchor = isRight ? 'start' : 'end';
    const textOffset = isRight ? 6 : -6;
    keynoteSvg += `<text x="${(textPtX + textOffset).toFixed(1)}" y="${(textPtY + 4).toFixed(1)}" text-anchor="${anchor}" font-family="'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="600" fill="#1e293b">${escapeDetailXml(kn.text)}</text>`;
  }

  // 3. Drawing Title Block Bar
  const titleY = svgH - 25;
  const titleBar = `
    <g class="detail-title-block">
      <!-- Title Callout Bubble -->
      <circle cx="50" cy="${titleY - 8}" r="18" fill="none" stroke="#0f172a" stroke-width="2"/>
      <line x1="32" y1="${titleY - 8}" x2="68" y2="${titleY - 8}" stroke="#0f172a" stroke-width="1.5"/>
      <text x="50" y="${titleY - 12}" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${escapeDetailXml(assembly.detailNum)}</text>
      <text x="50" y="${titleY + 4}" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="9" font-weight="bold" fill="#64748b">${escapeDetailXml(assembly.sheetRef)}</text>

      <!-- Drawing Title & Scale -->
      <text x="80" y="${titleY - 14}" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="bold" fill="#0f172a" letter-spacing="1">${escapeDetailXml(assembly.title)}</text>
      <line x1="80" y1="${titleY - 6}" x2="480" y2="${titleY - 6}" stroke="#0f172a" stroke-width="1.5"/>
      <text x="80" y="${titleY + 10}" font-family="'Segoe UI', sans-serif" font-size="10.5" font-weight="600" fill="#64748b">SCALE ${escapeDetailXml(assembly.scaleLabel)} · HIGH-PRECISION ARCHITECTURAL DETAIL</text>
    </g>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background-color: #ffffff;">
  <defs>
    <!-- Concrete Stipple Hatch -->
    <pattern id="concreteHatch" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#f8fafc"/>
      <circle cx="4" cy="5" r="1.0" fill="#64748b"/>
      <circle cx="14" cy="9" r="0.8" fill="#64748b"/>
      <circle cx="8" cy="16" r="1.2" fill="#64748b"/>
      <polygon points="12,14 15,18 9,17" fill="#475569"/>
      <polygon points="3,8 5,11 2,11" fill="#475569"/>
    </pattern>

    <!-- 45° Earth Grade Hatch -->
    <pattern id="earthDetailHatch" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="#f1f5f9"/>
      <line x1="0" y1="24" x2="24" y2="0" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="4" y1="24" x2="24" y2="4" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="8" y1="24" x2="24" y2="8" stroke="#94a3b8" stroke-width="1.2"/>
    </pattern>

    <!-- Granular Gravel Hatch -->
    <pattern id="gravelHatch" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#f8fafc"/>
      <circle cx="5" cy="5" r="2.5" fill="none" stroke="#64748b" stroke-width="1"/>
      <circle cx="15" cy="8" r="2.0" fill="none" stroke="#64748b" stroke-width="1"/>
      <circle cx="10" cy="15" r="2.8" fill="none" stroke="#64748b" stroke-width="1"/>
    </pattern>

    <!-- Rigid Insulation Zigzag Hatch -->
    <pattern id="insulationHatch" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="#fef9c3"/>
      <path d="M0,8 L4,0 L12,16 L16,8" fill="none" stroke="#ca8a04" stroke-width="1.5"/>
    </pattern>

    <!-- Brick Coursing Hatch -->
    <pattern id="brickHatch" width="24" height="12" patternUnits="userSpaceOnUse">
      <rect width="24" height="12" fill="#fee2e2"/>
      <line x1="0" y1="6" x2="24" y2="6" stroke="#ef4444" stroke-width="1"/>
      <line x1="0" y1="12" x2="24" y2="12" stroke="#ef4444" stroke-width="1"/>
      <line x1="12" y1="0" x2="12" y2="6" stroke="#ef4444" stroke-width="1"/>
      <line x1="0" y1="6" x2="0" y2="12" stroke="#ef4444" stroke-width="1"/>
      <line x1="24" y1="6" x2="24" y2="12" stroke="#ef4444" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Border Frame -->
  <rect x="15" y="15" width="${svgW - 30}" height="${svgH - 30}" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>

  <!-- Construction Assembly Geometry -->
  <g class="detail-components">
    ${elements}
  </g>

  <!-- Keynote Callouts & Leader Lines -->
  <g class="detail-keynotes">
    ${keynoteSvg}
  </g>

  <!-- Title Block Bar -->
  ${titleBar}
</svg>`;
}

function escapeDetailXml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
