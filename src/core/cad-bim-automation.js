/**
 * Architecture Helping Hand — AutoCAD & BIM Workflow Automation Engine
 *
 * Comprehensive CAD & BIM automation hub providing:
 *   1. AIA & ISO 13567 Standard Layer Generator (AutoLISP .lsp & AutoCAD .scr)
 *   2. Autodesk Tool Palette Generator (.atc XML)
 *   3. CAD Layer Standardizer & DXF Sanitizer (Purger, Remapper, BYLAYER normalizer)
 *   4. Autodesk Revit Shared Parameters File Generator (Revit_Shared_Parameters.txt)
 *   5. Revit / Dynamo Python Automation Batch Instance Placer
 *   6. BIM Schedules & Specification Takeoffs (CSV & 1:1 DXF Table)
 */

import { buildDXF } from './export/export-model.js';

/**
 * Standard AIA National CAD Standard (NCS) / ISO 13567 Layer Catalog.
 * Each entry defines layer name, standard ACI color, hex preview, linetype, lineweight, and description.
 */
export const AIA_STANDARD_LAYERS = [
  { name: 'A-WALL-FULL', colorIndex: 3, colorHex: '#22c55e', linetype: 'CONTINUOUS', lineweightMm: 0.50, description: 'Full-height exterior and interior structural/bearing walls' },
  { name: 'A-WALL-PRTN', colorIndex: 2, colorHex: '#eab308', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'Partial-height interior partitions and demising screens' },
  { name: 'A-DOOR',      colorIndex: 2, colorHex: '#eab308', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Doors, frames, door swings, and hardware' },
  { name: 'A-GLAZ',      colorIndex: 4, colorHex: '#06b6d4', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Windows, glazed storefronts, curtain walls, and glass' },
  { name: 'A-FURN',      colorIndex: 5, colorHex: '#3b82f6', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Furniture, casework, workstations, and movable fixtures' },
  { name: 'A-FLOR',      colorIndex: 1, colorHex: '#ef4444', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Floor finishes, stairs, ramps, thresholds, and level changes' },
  { name: 'A-CLNG',      colorIndex: 8, colorHex: '#64748b', linetype: 'CONTINUOUS', lineweightMm: 0.18, description: 'Reflected ceiling plans, acoustic grid, ceiling heights' },
  { name: 'A-ROOF',      colorIndex: 6, colorHex: '#d946ef', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'Roof outline, overhangs, eaves, parapets, and louvers' },
  { name: 'A-SITE',      colorIndex: 3, colorHex: '#22c55e', linetype: 'CONTINUOUS', lineweightMm: 0.50, description: 'Site boundary, property lines, curbs, walks, paving' },
  { name: 'A-VEGE',      colorIndex: 3, colorHex: '#16a34a', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Trees, hedges, planting beds, landscape elements' },
  { name: 'A-CLEARANCE', colorIndex: 8, colorHex: '#94a3b8', linetype: 'DASHED',     lineweightMm: 0.18, description: 'ADA wheelchair turning clearances, door rollouts, egress' },
  { name: 'A-ANNO-DIMS', colorIndex: 7, colorHex: '#f8fafc', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Dimension lines, tick marks, and dimension text' },
  { name: 'A-ANNO-TEXT', colorIndex: 7, colorHex: '#f8fafc', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Room tags, drawing titles, general notes, callouts' },
  { name: 'A-ANNO-TABL', colorIndex: 7, colorHex: '#f8fafc', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'Schedules, legend grids, title block sheet tables' },
  { name: 'A-ANNO-SYMB', colorIndex: 1, colorHex: '#ef4444', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Section marks, elevation tags, grid bubbles, detail keys' },
  { name: 'M-HVAC',      colorIndex: 4, colorHex: '#06b6d4', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'HVAC ducts, diffusers, returns, and mechanical units' },
  { name: 'P-FIXT',      colorIndex: 5, colorHex: '#3b82f6', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'Plumbing fixtures, toilets, sinks, floor drains, piping' },
  { name: 'E-LITE',      colorIndex: 2, colorHex: '#eab308', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Lighting fixtures, switches, daylight sensors' },
  { name: 'E-POWR',      colorIndex: 1, colorHex: '#ef4444', linetype: 'CONTINUOUS', lineweightMm: 0.25, description: 'Power receptacles, panels, data outlets, floor boxes' },
  { name: 'F-PROT',      colorIndex: 1, colorHex: '#ef4444', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'Fire alarm, sprinkler heads, extinguishers, hose cabinets' },
  { name: 'S-COLS',      colorIndex: 6, colorHex: '#c026d3', linetype: 'CONTINUOUS', lineweightMm: 0.50, description: 'Structural concrete/steel columns and pilasters' },
  { name: 'S-BEAM',      colorIndex: 6, colorHex: '#c026d3', linetype: 'HIDDEN',     lineweightMm: 0.35, description: 'Structural beams and overhead transfer framing' },
  { name: 'C-PROP',      colorIndex: 1, colorHex: '#ef4444', linetype: 'PHANTOM',    lineweightMm: 0.70, description: 'Civil boundary and legal property lines' },
  { name: 'C-ROAD',      colorIndex: 9, colorHex: '#71717a', linetype: 'CONTINUOUS', lineweightMm: 0.35, description: 'Roadways, asphalt centerlines, vehicular access' }
];

/**
 * Common non-standard CAD layer name dictionary mapped to official AIA NCS layers.
 */
export const CAD_LAYER_REMAP_DICTIONARY = {
  '0': 'A-FURN',
  'default': 'A-FURN',
  'defpoints': 'A-ANNO-TEXT',
  'layer1': 'A-FURN',
  'layer 1': 'A-FURN',
  'temp': 'A-ANNO-TEXT',
  'scratch': 'A-ANNO-TEXT',
  // Walls
  'wall': 'A-WALL-FULL',
  'walls': 'A-WALL-FULL',
  'wall_ext': 'A-WALL-FULL',
  'wall_int': 'A-WALL-FULL',
  'ext_wall': 'A-WALL-FULL',
  'int_wall': 'A-WALL-FULL',
  'mauer': 'A-WALL-FULL',
  'mur': 'A-WALL-FULL',
  'partition': 'A-WALL-PRTN',
  'partitions': 'A-WALL-PRTN',
  'part': 'A-WALL-PRTN',
  // Openings
  'door': 'A-DOOR',
  'doors': 'A-DOOR',
  'tuer': 'A-DOOR',
  'porte': 'A-DOOR',
  'puerta': 'A-DOOR',
  'window': 'A-GLAZ',
  'windows': 'A-GLAZ',
  'glazing': 'A-GLAZ',
  'glass': 'A-GLAZ',
  'fenster': 'A-GLAZ',
  'fenetre': 'A-GLAZ',
  'curtain_wall': 'A-GLAZ',
  // Furniture
  'furniture': 'A-FURN',
  'furn': 'A-FURN',
  'furnitures': 'A-FURN',
  'meubles': 'A-FURN',
  'mobiliar': 'A-FURN',
  'fixtures': 'A-FURN',
  'desks': 'A-FURN',
  'chairs': 'A-FURN',
  // Floors / Ceilings / Roofs
  'floor': 'A-FLOR',
  'floors': 'A-FLOR',
  'finish': 'A-FLOR',
  'stairs': 'A-FLOR',
  'steps': 'A-FLOR',
  'ceiling': 'A-CLNG',
  'ceilings': 'A-CLNG',
  'rcp': 'A-CLNG',
  'roof': 'A-ROOF',
  'roofs': 'A-ROOF',
  'overhang': 'A-ROOF',
  // Annotations
  'dim': 'A-ANNO-DIMS',
  'dims': 'A-ANNO-DIMS',
  'dimension': 'A-ANNO-DIMS',
  'dimensions': 'A-ANNO-DIMS',
  'cotation': 'A-ANNO-DIMS',
  'text': 'A-ANNO-TEXT',
  'txt': 'A-ANNO-TEXT',
  'notes': 'A-ANNO-TEXT',
  'labels': 'A-ANNO-TEXT',
  'table': 'A-ANNO-TABL',
  'schedule': 'A-ANNO-TABL',
  // Clearances & Site
  'clearance': 'A-CLEARANCE',
  'clearances': 'A-CLEARANCE',
  'ada': 'A-CLEARANCE',
  'accessible': 'A-CLEARANCE',
  'turning': 'A-CLEARANCE',
  'site': 'A-SITE',
  'landscape': 'A-SITE',
  'trees': 'A-VEGE',
  'planting': 'A-VEGE',
  'plants': 'A-VEGE'
};

/**
 * Generates an AutoLISP (.lsp) command to create all 24 AIA standard layers in any active DWG.
 *
 * @param {object} [options]
 * @param {string} [options.commandName='AHH_SETUP_LAYERS'] Command name
 * @param {number} [options.units=4] $INSUNITS: 4=Millimeters, 1=Inches, 6=Meters
 * @returns {string} Executable AutoLISP code
 */
export function generateAiaLayersAutoLisp(options = {}) {
  const cmd = options.commandName || 'AHH_SETUP_LAYERS';
  const units = Number.isFinite(options.units) ? options.units : 4;
  const unitName = units === 4 ? 'Millimeters (1:1)' : units === 1 ? 'Inches' : 'Meters';

  const lines = [
    `;; =========================================================================`,
    `;; Architecture Helping Hand — AIA / ISO 13567 Standard Layer Generator`,
    `;; Command: ${cmd}`,
    `;; Standard: AIA National CAD Standard (NCS) / ISO 13567`,
    `;; Units: ${unitName}`,
    `;; Drag & drop this file into any AutoCAD .dwg window or type (load "...")`,
    `;; =========================================================================`,
    `(vl-load-com)`,
    `(defun c:${cmd} (/ doc ltypes ltName)`,
    `  (setvar "CMDECHO" 0)`,
    `  (setvar "EXPERT" 1)`,
    `  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))`,
    `  (setq ltypes (vla-get-Linetypes doc))`,
    ``,
    `  ;; Helper to load linetype safely`,
    `  (defun load-lt (ltName)`,
    `    (if (not (tblsearch "LTYPE" ltName))`,
    `      (vl-catch-all-apply 'vla-load (list ltypes ltName "acad.lin"))`,
    `    )`,
    `  )`,
    `  (load-lt "DASHED")`,
    `  (load-lt "HIDDEN")`,
    `  (load-lt "CENTER")`,
    `  (load-lt "PHANTOM")`,
    ``,
    `  ;; Ensure Drawing System Units ($INSUNITS)`,
    `  (setvar "INSUNITS" ${units})`,
    `  (setvar "LUNITS" 2)`,
    `  (setvar "LUPREC" 2)`,
    `  (setvar "CELWEIGHT" -1)`, // ByLayer lineweight
    `  (setvar "CECOLOR" "BYLAYER")`,
    `  (setvar "CELTYPE" "BYLAYER")`,
    ``,
    `  ;; Define 24 Standard AIA CAD Layers`
  ];

  for (const lyr of AIA_STANDARD_LAYERS) {
    const lwHundredths = Math.round(lyr.lineweightMm * 100);
    lines.push(
      `  ;; ${lyr.description}`,
      `  (command "_.-LAYER" "_M" "${lyr.name}" "_C" "${lyr.colorIndex}" "${lyr.name}" "_LT" "${lyr.linetype}" "${lyr.name}" "_LW" "${lwHundredths}" "${lyr.name}" "")`
    );
  }

  lines.push(
    ``,
    `  ;; Set active drawing layer to A-WALL-FULL`,
    `  (setvar "CLAYER" "A-WALL-FULL")`,
    `  (setvar "CMDECHO" 1)`,
    `  (setvar "EXPERT" 0)`,
    `  (princ "\\n========================================================")`,
    `  (princ "\\n✅ Architecture Helping Hand: 24 AIA CAD Layers Created!")`,
    `  (princ "\\nDrawing Units set to: ${unitName}")`,
    `  (princ "\\nActive Layer set to: A-WALL-FULL")`,
    `  (princ "\\n========================================================\\n")`,
    `  (princ)`,
    `)`,
    `;; Automatically run setup when loaded`,
    `(c:${cmd})`
  );

  return lines.join('\n') + '\n';
}

/**
 * Generates an AutoCAD Script (.scr) to set up all AIA standard layers.
 */
export function generateAiaLayersScript() {
  const lines = [
    `;; Architecture Helping Hand — AIA Layer Setup Script`,
    `CMDECHO 0`,
    `EXPERT 1`,
    `-LINETYPE LOAD DASHED acad.lin `,
    `-LINETYPE LOAD HIDDEN acad.lin `,
    `-LINETYPE LOAD PHANTOM acad.lin `,
    `-LINETYPE LOAD CENTER acad.lin `
  ];

  for (const lyr of AIA_STANDARD_LAYERS) {
    const lwHundredths = Math.round(lyr.lineweightMm * 100);
    lines.push(
      `-LAYER MAKE ${lyr.name} COLOR ${lyr.colorIndex} ${lyr.name} LTYPE ${lyr.linetype} ${lyr.name} LWEIGHT ${lwHundredths} ${lyr.name} `
    );
  }

  lines.push(
    `CLAYER A-WALL-FULL`,
    `INSUNITS 4`,
    `CMDECHO 1`,
    `EXPERT 0`,
    `REGEN`
  );

  return lines.join('\n') + '\n';
}

/**
 * Generates an official Autodesk Tool Palette XML catalog (.atc file).
 * Draftsmen can drag this palette directly into AutoCAD's Tool Palette window (Ctrl+3).
 *
 * @param {string} paletteName Display name of the tool palette
 * @param {string} categoryKey Category slug
 * @param {Array<object>} assets Furniture / fixture library assets
 * @returns {string} XML content for .atc file
 */
export function generateAutoCadToolPaletteAtc(paletteName, categoryKey, assets = []) {
  const pName = paletteName || 'AHH Architectural Palette';
  const guid = 'AHH-' + (categoryKey || 'CAT').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  const toolElements = assets.map((a, idx) => {
    const id = String(a.id || 'ITEM_' + idx).toUpperCase().replace(/[^A-Za-z0-9_]/g, '_');
    const name = (a.name || id).replace(/[<>&'"]/g, '');
    const desc = (a.description || `${a.dimensions?.widthMm || 1000}x${a.dimensions?.depthMm || 1000}mm CAD Block`).replace(/[<>&'"]/g, '');
    const layer = (a.cadStandard?.layer || a.planGeometry?.[0]?.layer || 'A-FURN');
    const blockFileName = `${a.id || id}.dxf`;

    return `    <Tool>
      <ID>{${guid}-${idx}}</ID>
      <Name>${name}</Name>
      <Description>${desc}</Description>
      <ToolTip>${name} (${a.dimensions?.widthMm || 1000}x${a.dimensions?.depthMm || 1000}mm)</ToolTip>
      <Properties>
        <Property name="SourceFile">${blockFileName}</Property>
        <Property name="BlockName">AHH_${id}</Property>
        <Property name="Layer">${layer}</Property>
        <Property name="Color">256</Property>
        <Property name="Scale">1.0</Property>
        <Property name="Explode">0</Property>
      </Properties>
      <Command>_.-INSERT "AHH_${id}" \\ 1.0 1.0 0.0</Command>
    </Tool>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Architecture Helping Hand - AutoCAD Native Tool Palette Catalog -->
<!-- Autodesk ToolPalette Schema compliant for AutoCAD 2018-2026+ -->
<Palette xmlns="http://www.autodesk.com/shapes/toolpalette">
  <Version>2.0</Version>
  <ID>{${guid}}</ID>
  <Name>${pName.replace(/[<>&'"]/g, '')}</Name>
  <Description>Architectural blocks library calibrated at 1:1 millimeters for AutoCAD.</Description>
  <CreatedBy>Architecture Helping Hand (AHH)</CreatedBy>
  <Tools>
${toolElements}
  </Tools>
</Palette>
`;
}

/**
 * Sanitizes and standardizes messy third-party DXF text:
 *   1. Remaps arbitrary/consultant layer names to standard AIA NCS layers
 *   2. Purges zero-length degenerate lines (Δx=0, Δy=0)
 *   3. Purges exact duplicate collinear lines
 *   4. Normalizes entity colors to 256 (BYLAYER)
 *
 * @param {string} rawDxfText ASCII DXF content
 * @param {object} [options]
 * @param {boolean} [options.remapLayers=true]
 * @param {boolean} [options.purgeZeroLength=true]
 * @param {boolean} [options.purgeDuplicates=true]
 * @param {boolean} [options.normalizeColorByLayer=true]
 * @param {string} [options.fallbackLayer='A-FURN']
 * @returns {object} { sanitizedDxf, stats }
 */
export function sanitizeAndStandardizeDxf(rawDxfText, options = {}) {
  const remap = options.remapLayers !== false;
  const purgeZero = options.purgeZeroLength !== false;
  const purgeDups = options.purgeDuplicates !== false;
  const byLayerColor = options.normalizeColorByLayer !== false;
  const fallback = options.fallbackLayer || 'A-FURN';

  if (typeof rawDxfText !== 'string' || !rawDxfText.includes('ENTITIES')) {
    return {
      sanitizedDxf: rawDxfText,
      stats: { totalEntities: 0, purgedZeroLength: 0, purgedDuplicates: 0, remappedLayers: 0, originalLayers: [], standardizedLayers: [] }
    };
  }

  const lines = rawDxfText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const outLines = [];
  const seenCollinearLines = new Set();
  const originalLayerSet = new Set();
  const standardizedLayerSet = new Set();

  let inEntities = false;
  let purgedZeroCount = 0;
  let purgedDupCount = 0;
  let remappedCount = 0;
  let entityCount = 0;

  let i = 0;
  while (i < lines.length) {
    const code = lines[i]?.trim();
    const val = lines[i + 1]?.trim();

    if (code === '2' && val === 'ENTITIES') {
      inEntities = true;
      outLines.push(lines[i], lines[i + 1]);
      i += 2;
      continue;
    }
    if (inEntities && code === '0' && val === 'ENDSEC') {
      inEntities = false;
      outLines.push(lines[i], lines[i + 1]);
      i += 2;
      continue;
    }

    if (!inEntities) {
      outLines.push(lines[i]);
      if (i + 1 < lines.length) outLines.push(lines[i + 1]);
      i += 2;
      continue;
    }

    // Inside ENTITIES section: inspect each entity record
    if (code === '0') {
      entityCount++;
      const entityType = val;
      const entityBlock = [lines[i], lines[i + 1]];
      i += 2;

      let layerName = '';
      let x1 = null, y1 = null, x2 = null, y2 = null;
      let hasColorCode = false;

      // Scan entity fields until next entity code 0
      while (i < lines.length && lines[i]?.trim() !== '0') {
        const eCode = lines[i]?.trim();
        const eVal = lines[i + 1]?.trim();

        if (eCode === '8') {
          layerName = eVal;
          originalLayerSet.add(eVal);
        } else if (eCode === '10') {
          x1 = Number(eVal);
        } else if (eCode === '20') {
          y1 = Number(eVal);
        } else if (eCode === '11') {
          x2 = Number(eVal);
        } else if (eCode === '21') {
          y2 = Number(eVal);
        } else if (eCode === '62') {
          hasColorCode = true;
        }

        entityBlock.push(lines[i], lines[i + 1]);
        i += 2;
      }

      // Check zero length line purge
      if (purgeZero && entityType === 'LINE' && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const distSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (distSq < 1e-6) {
          purgedZeroCount++;
          continue; // Skip outputting degenerate zero-length line
        }
      }

      // Check duplicate collinear line purge
      if (purgeDups && entityType === 'LINE' && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        // Canonical coordinate order
        const [cx1, cy1, cx2, cy2] = (x1 < x2 || (x1 === x2 && y1 < y2))
          ? [x1.toFixed(3), y1.toFixed(3), x2.toFixed(3), y2.toFixed(3)]
          : [x2.toFixed(3), y2.toFixed(3), x1.toFixed(3), y1.toFixed(3)];
        const key = `${cx1},${cy1}-${cx2},${cy2}`;
        if (seenCollinearLines.has(key)) {
          purgedDupCount++;
          continue; // Skip duplicate entity
        }
        seenCollinearLines.add(key);
      }

      // Remap Layer
      let targetLayer = layerName;
      if (remap && layerName) {
        const lower = layerName.toLowerCase().trim();
        if (CAD_LAYER_REMAP_DICTIONARY[lower]) {
          targetLayer = CAD_LAYER_REMAP_DICTIONARY[lower];
          remappedCount++;
        } else if (!AIA_STANDARD_LAYERS.some(l => l.name === layerName)) {
          targetLayer = fallback;
          remappedCount++;
        }
      }
      standardizedLayerSet.add(targetLayer || fallback);

      // Reconstruct entity block with standardized layer & color
      for (let j = 0; j < entityBlock.length; j += 2) {
        const fCode = entityBlock[j]?.trim();
        const fVal = entityBlock[j + 1]?.trim();

        if (fCode === '8' && targetLayer) {
          outLines.push('  8', targetLayer);
        } else if (fCode === '62' && byLayerColor) {
          outLines.push(' 62', '256'); // 256 = BYLAYER
        } else {
          outLines.push(entityBlock[j], entityBlock[j + 1]);
        }
      }
      continue;
    }

    outLines.push(lines[i]);
    if (i + 1 < lines.length) outLines.push(lines[i + 1]);
    i += 2;
  }

  return {
    sanitizedDxf: outLines.join('\n'),
    stats: {
      totalEntities: entityCount,
      purgedZeroLength: purgedZeroCount,
      purgedDuplicates: purgedDupCount,
      remappedLayers: remappedCount,
      originalLayers: Array.from(originalLayerSet),
      standardizedLayers: Array.from(standardizedLayerSet)
    }
  };
}

/**
 * Generates an official Autodesk Revit Shared Parameters File (Revit_Shared_Parameters.txt).
 * Imports custom architectural, code compliance, and COBie parameters into Revit families and schedules.
 */
export function generateRevitSharedParametersFile() {
  const header = [
    `# This is a Revit shared parameter file.`,
    `# Do not edit manually.`,
    `*META\tVERSION\tMINVERSION`,
    `META\t2\t1`,
    `*GROUP\tID\tNAME`,
    `GROUP\t1\tAHH - Dimensions & Clearances`,
    `GROUP\t2\tAHH - Performance & Building Codes`,
    `GROUP\t3\tAHH - Specifications & COBie`,
    `GROUP\t4\tAHH - Identity & Classification`,
    `*PARAM\tGUID\tNAME\tDATATYPE\tDATACATEGORY\tGROUP\tVISIBLE\tDESCRIPTION\tUSERMODIFIABLE`
  ];

  const parameters = [
    // Group 1: Dimensions & Clearances
    `PARAM\t01a11111-0001-4000-8000-000000000001\tAHH_ClearanceWidth\tLENGTH\t\t1\t1\tMandatory ADA or accessibility clearance width in millimeters\t1`,
    `PARAM\t01a11111-0001-4000-8000-000000000002\tAHH_ClearanceDepth\tLENGTH\t\t1\t1\tMandatory ADA or accessibility clearance depth in millimeters\t1`,
    `PARAM\t01a11111-0001-4000-8000-000000000003\tAHH_MountingHeight\tLENGTH\t\t1\t1\tFinished floor mounting rough-in height\t1`,
    `PARAM\t01a11111-0001-4000-8000-000000000004\tAHH_WheelchairTurningClearance\tYESNO\t\t1\t1\tComplies with 1500mm (60-inch) wheelchair turning circle\t1`,
    // Group 2: Performance & Codes
    `PARAM\t02b22222-0002-4000-8000-000000000001\tAHH_FireRatingHours\tNUMBER\t\t2\t1\tFire resistance rating in hours (0.33, 0.75, 1.0, 2.0)\t1`,
    `PARAM\t02b22222-0002-4000-8000-000000000002\tAHH_AcousticSTC\tINTEGER\t\t2\t1\tSound Transmission Class acoustic rating (STC)\t1`,
    `PARAM\t02b22222-0002-4000-8000-000000000003\tAHH_EgressClearWidthMm\tLENGTH\t\t2\t1\tIBC compliant clear unobstructed egress passage width\t1`,
    `PARAM\t02b22222-0002-4000-8000-000000000004\tAHH_OccupancyLoadFactor\tNUMBER\t\t2\t1\tOccupant load factor (m2 per person) for egress calculations\t1`,
    // Group 3: Specifications & COBie
    `PARAM\t03c33333-0003-4000-8000-000000000001\tCOBie_Component_Name\tTEXT\t\t3\t1\tCOBie unique component asset identifier\t1`,
    `PARAM\t03c33333-0003-4000-8000-000000000002\tCOBie_Component_Space\tTEXT\t\t3\t1\tCOBie spatial room reference tag\t1`,
    `PARAM\t03c33333-0003-4000-8000-000000000003\tCOBie_Type_Manufacturer\tTEXT\t\t3\t1\tProduct manufacturer or fabricator\t1`,
    `PARAM\t03c33333-0003-4000-8000-000000000004\tCOBie_Type_ModelNumber\tTEXT\t\t3\t1\tManufacturer model or catalog number\t1`,
    `PARAM\t03c33333-0003-4000-8000-000000000005\tCOBie_Type_WarrantyDuration\tTEXT\t\t3\t1\tWarranty duration period in years\t1`,
    // Group 4: Identity & Classification
    `PARAM\t04d44444-0004-4000-8000-000000000001\tAHH_OmniClassNumber\tTEXT\t\t4\t1\tOmniClass Table 23 Product Classification Number\t1`,
    `PARAM\t04d44444-0004-4000-8000-000000000002\tAHH_OmniClassTitle\tTEXT\t\t4\t1\tOmniClass Table 23 Classification Title\t1`,
    `PARAM\t04d44444-0004-4000-8000-000000000003\tAHH_UniFormatCode\tTEXT\t\t4\t1\tUniFormat II Element Classification Code\t1`
  ];

  return header.concat(parameters).join('\n') + '\n';
}

/**
 * Generates an automated Dynamo Python Script to batch place Family Instances in Autodesk Revit.
 */
export function generateDynamoPythonBatchPlacer() {
  return [
    `# =========================================================================`,
    `# Architecture Helping Hand — Dynamo Python Batch Instance Placer`,
    `# Autodesk Revit API: Autodesk.Revit.DB`,
    `# Usage: Paste into a Dynamo "Python Script" node.`,
    `# Inputs:`,
    `#   IN[0]: List of coordinate points [[x1, y1, z1], [x2, y2, z2], ...]`,
    `#   IN[1]: Family Name string (e.g. "AHH_Executive_Desk")`,
    `#   IN[2]: Target Level element from active project`,
    `# =========================================================================`,
    `import clr`,
    `clr.AddReference('RevitServices')`,
    `from RevitServices.Persistence import DocumentManager`,
    `from RevitServices.Transactions import TransactionManager`,
    ``,
    `clr.AddReference('RevitAPI')`,
    `import Autodesk`,
    `from Autodesk.Revit.DB import *`,
    `from Autodesk.Revit.DB.Structure import StructuralType`,
    ``,
    `doc = DocumentManager.Instance.CurrentDBDocument`,
    ``,
    `points_in = IN[0] if IN[0] else [[0, 0, 0]]`,
    `family_name = str(IN[1]) if IN[1] else "AHH_Desk"`,
    `target_level = UnwrapElement(IN[2]) if IN[2] else None`,
    ``,
    `# 1. Find matching FamilySymbol in project`,
    `collector = FilteredElementCollector(doc).OfClass(FamilySymbol)`,
    `matched_symbol = None`,
    `for sym in collector:`,
    `    if sym.FamilyName == family_name or sym.Name == family_name:`,
    `        matched_symbol = sym`,
    `        break`,
    ``,
    `output_instances = []`,
    `if matched_symbol:`,
    `    TransactionManager.Instance.EnsureInTransaction(doc)`,
    `    # Activate symbol if unplaced`,
    `    if not matched_symbol.IsActive:`,
    `        matched_symbol.Activate()`,
    `        doc.Regenerate()`,
    ``,
    `    # If no level provided, pick first active floor level`,
    `    if not target_level:`,
    `        target_level = FilteredElementCollector(doc).OfClass(Level).FirstElement()`,
    ``,
    `    # 2. Batch place instances at coordinates`,
    `    for pt in points_in:`,
    `        # Convert millimeters to internal Revit decimal feet`,
    `        x_ft = float(pt[0]) / 304.8`,
    `        y_ft = float(pt[1]) / 304.8`,
    `        z_ft = float(pt[2]) / 304.8 if len(pt) > 2 else 0.0`,
    `        xyz = XYZ(x_ft, y_ft, z_ft)`,
    `        inst = doc.Create.NewFamilyInstance(xyz, matched_symbol, target_level, StructuralType.NonStructural)`,
    `        output_instances.append(inst)`,
    ``,
    `    TransactionManager.Instance.TransactionTaskDone()`,
    `    OUT = f"Success: Placed {len(output_instances)} instances of {family_name}"`,
    `else:`,
    `    OUT = f"Error: FamilySymbol '{family_name}' not found in active Revit project. Please load family first."`
  ].join('\n') + '\n';
}

/**
 * Generates standardized BIM Schedules & Specification Takeoffs.
 * Produces both RFC 4180 CSV (for Revit/Excel) and 1:1 DXF Table (for AutoCAD Paper Space).
 *
 * @param {'doors'|'rooms'|'ffe'} type Schedule typology
 * @param {Array<object>} [customRows] Optional custom row items
 * @returns {object} { csv, dxfTable, columns, rows }
 */
export function generateBimSchedule(type = 'doors', customRows = null) {
  let columns = [];
  let rows = [];
  let title = '';

  if (type === 'doors') {
    title = 'ARCHITECTURAL DOOR SCHEDULE';
    columns = ['Mark', 'Location', 'Type', 'Width (mm)', 'Height (mm)', 'Thick (mm)', 'Fire Rating', 'Acoustic (STC)', 'Frame', 'Hardware'];
    rows = customRows || [
      ['D-101', 'Entry Vestibule', 'Glazed Aluminum Double', '1800', '2150', '50', 'Non-Rated', 'STC 32', 'Thermal Aluminum', 'Panic Hardware / Closer'],
      ['D-102', 'Corridor Egress', 'Solid Core Flush Wood', '1000', '2100', '45', 'FD30 (30 min)', 'STC 35', 'Hollow Metal', 'Mortise Lever / Closer'],
      ['D-103', 'Stairway Enclosure', 'Insulated Steel Door', '1000', '2100', '50', 'FD90 (90 min)', 'STC 40', 'Welded Steel 16ga', 'Fire Exit Bar / Auto-Close'],
      ['D-104', 'Conference Room', 'Acoustic Frameless Glass', '950', '2400', '12', 'Non-Rated', 'STC 38', 'Concealed Track', 'Stainless Pull Handle'],
      ['D-105', 'ADA Restroom', 'Solid Flush Wood', '950', '2100', '45', 'Non-Rated', 'STC 30', 'Knock-Down Steel', 'Barrier-Free Privacy Lever'],
      ['D-106', 'Electrical Room', 'Louvered Hollow Metal', '900', '2100', '45', 'FD60 (60 min)', 'STC 28', 'Welded Steel 14ga', 'Storeroom Lockset']
    ];
  } else if (type === 'rooms') {
    title = 'ROOM FINISH & OCCUPANCY SCHEDULE';
    columns = ['Room No.', 'Room Name', 'Area (m²)', 'Occupancy Factor', 'Floor Finish', 'Baseboard', 'Wall Finish', 'Ceiling Finish', 'Height (m)'];
    rows = customRows || [
      ['101', 'Reception Lobby', '48.5', '1.4 m²/person (Assembly)', 'Polished Terrazzo', 'Recessed Metal', 'Acoustic Wood Paneling', 'Painted Gypsum Board', '3.60'],
      ['102', 'Executive Boardroom', '32.0', '1.9 m²/person (Business)', 'Commercial Carpet Tile', '100mm Hardwood', 'Type II Vinyl / Acoustic Felt', 'Suspended Wood Slat Ceiling', '3.20'],
      ['103', 'Open Workspace', '120.0', '4.6 m²/person (Office)', 'Low-VOC Carpet Plank', 'Rubber Base 100mm', 'Eggshell Low-VOC Paint', 'Acoustic Mineral Tile (600x600)', '3.00'],
      ['104', 'ADA Restroom', '7.5', 'Single Occupant', 'Non-Slip Porcelain Tile', 'Matching Tile Base', 'Glazed Ceramic Tile to 2.1m', 'Moisture-Resistant Gypsum', '2.70'],
      ['105', 'Breakroom & Pantry', '22.0', '1.9 m²/person', 'Luxury Vinyl Tile (LVT)', 'Porcelain Base', 'Scrubbable Semi-Gloss Paint', 'Washable Lay-in Tile', '2.85']
    ];
  } else {
    // FF&E Schedule
    title = 'FURNITURE, FIXTURES & EQUIPMENT (FF&E) SCHEDULE';
    columns = ['Tag', 'Description', 'Category', 'Width (mm)', 'Depth (mm)', 'Height (mm)', 'Mounting', 'AIA Layer', 'ADA Compliant'];
    rows = customRows || [
      ['DSK-01', 'Executive L-Desk & Credenza', 'Desks', '2200', '1800', '750', 'Freestanding', 'A-FURN', 'Yes (Knee clearance >685mm)'],
      ['CHR-01', 'Ergonomic Task Chair (5-Star)', 'Seating', '680', '680', '1050', 'Freestanding', 'A-FURN', 'Yes'],
      ['TBL-01', 'Boardroom Conference Table (10p)', 'Tables', '3200', '1200', '750', 'Freestanding / Floor Core', 'A-FURN', 'Yes (Wheelchair accessible head)'],
      ['SAN-01', 'Wall-Hung Accessible Water Closet', 'Plumbing', '400', '700', '450', 'Wall Carrier Mounted', 'P-FIXT', 'Yes (Seat height 430-480mm)'],
      ['SAN-02', 'ADA Wheelchair Lavatory & Trap Wrap', 'Plumbing', '550', '500', '860', 'Wall Hung / Concealed Arms', 'P-FIXT', 'Yes (Knee clearance compliant)'],
      ['REC-01', 'Curved Modular Reception Counter', 'Casework', '2400', '900', '1050', 'Floor Anchored', 'A-FURN', 'Yes (Low transaction counter 860mm)']
    ];
  }

  // 1. Build RFC 4180 CSV
  const csvLines = [
    `# ${title}`,
    columns.map(c => `"${c.replace(/"/g, '""')}"`).join(',')
  ];
  for (const r of rows) {
    csvLines.push(r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','));
  }
  const csv = csvLines.join('\r\n') + '\r\n';

  // 2. Build 1:1 DXF Architectural Table (A-ANNO-TABL and A-ANNO-TEXT)
  const cellHeightM = 0.010; // 10mm text cell height in drawing units (meters)
  const colWidthsM = columns.map(c => Math.max(0.035, (c.length * 0.0025) + 0.010));
  const totalWidthM = colWidthsM.reduce((sum, w) => sum + w, 0);
  const totalHeightM = (rows.length + 2) * cellHeightM; // Header + Columns + Rows

  const entities = [];
  const line = (x1, y1, x2, y2, lyr = 'A-ANNO-TABL') => entities.push({ type: 'line', x1, y1, x2, y2, layer: lyr });
  const text = (x, y, content, h = 0.003, lyr = 'A-ANNO-TEXT') => entities.push({ type: 'text', x, y, text: content, height: h, layer: lyr });

  // Outer border
  line(0, 0, totalWidthM, 0);
  line(totalWidthM, 0, totalWidthM, -totalHeightM);
  line(totalWidthM, -totalHeightM, 0, -totalHeightM);
  line(0, -totalHeightM, 0, 0);

  // Title Box
  text(0.005, -cellHeightM * 0.65, title, 0.004, 'A-ANNO-TEXT');
  line(0, -cellHeightM, totalWidthM, -cellHeightM);

  // Column Headers
  let curX = 0;
  for (let c = 0; c < columns.length; c++) {
    text(curX + 0.002, -cellHeightM * 1.65, columns[c], 0.0025, 'A-ANNO-TEXT');
    if (c > 0) line(curX, -cellHeightM, curX, -totalHeightM);
    curX += colWidthsM[c];
  }
  line(0, -cellHeightM * 2, totalWidthM, -cellHeightM * 2);

  // Row Grid & Data
  for (let r = 0; r < rows.length; r++) {
    const yTop = -cellHeightM * (r + 2);
    const yBot = -cellHeightM * (r + 3);
    line(0, yBot, totalWidthM, yBot);

    let cellX = 0;
    for (let c = 0; c < columns.length; c++) {
      const val = rows[r][c] || '';
      text(cellX + 0.002, yTop - cellHeightM * 0.65, String(val), 0.0022, 'A-ANNO-TEXT');
      cellX += colWidthsM[c];
    }
  }

  const dxfTable = buildDXF(entities, {
    scale: 1000, // Export at 1:1 scale (mm)
    blockName: 'BIM_SCHEDULE_TABLE',
    asBlock: false
  });

  return {
    title,
    csv,
    dxfTable,
    columns,
    rows
  };
}
