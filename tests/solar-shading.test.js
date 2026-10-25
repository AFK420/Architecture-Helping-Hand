/**
 * Architecture Helping Hand — Solar Shading & AutoCAD Script Tests
 *
 * Verifies:
 *   1. Passive solar shading math:
 *      - Profile Angle (VSA, Ω) and Horizontal Shadow Angle (HSA, Θ)
 *      - Optimal summer 100% cutoff depth
 *      - Winter direct solar gain penetration depth
 *      - Louver (brise-soleil) blade depth and vertical side fins
 *      - Southern hemisphere solar orientation (e.g. Sydney, Australia)
 *   2. Architectural Section generation:
 *      - 1:1 DXF generation on standard AIA CAD layers (A-WALL, A-GLAZ, A-ROOF, A-SITE, A-ANNO-TEXT)
 *      - Scaled SVG section rendering with sun vectors
 *   3. AutoCAD AutoLISP & Script generation:
 *      - AutoLISP (.lsp) block definition via entmake
 *      - AutoCAD Script (.scr) DXF-to-DWG batch conversion
 *      - Windows DWG batch (.bat) script
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SS = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'solar-shading.js')).href);
const AS = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'export', 'autocad-scripts.js')).href);

const {
  calculateSolarShading,
  generateShadingSectionEntities,
  shadingSectionToDXF,
  shadingSectionToSVG
} = SS;

const {
  generateAutoLispBlock,
  generateAutoCadBatchDwgScript,
  generateWindowsDwgBatchBat
} = AS;

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

console.log('🧪 Running tests/solar-shading.test.js...');

// --- 1. Passive Solar Shading Calculations (Northern Hemisphere, Amman 32°N) ---
{
  const result = calculateSolarShading({
    latitudeDeg: 31.95,
    longitudeDeg: 35.94,
    timezoneOffsetHours: 3,
    facadeAzimuthDeg: 180, // Facing True South
    windowHeightM: 1.80,
    windowWidthM: 2.40,
    sillHeightM: 0.90,
    headToOverhangM: 0.15,
    roomDepthM: 5.0,
    overhangType: 'solid',
    louverCount: 4
  });

  assert(result !== null && typeof result === 'object', 'Calculates valid result object');
  assert(result.isEquatorFacing === true, 'Identifies facade as Equator-facing');
  assert(result.summer.vsaDeg > 70 && result.summer.vsaDeg < 89, 'Summer noon VSA is high (70-89°)', result.summer.vsaDeg);
  assert(result.winter.vsaDeg > 20 && result.winter.vsaDeg < 45, 'Winter noon VSA is low (20-45°)', result.winter.vsaDeg);
  assert(result.optimalOverhangDepthM > 0.2 && result.optimalOverhangDepthM < 1.0, 'Optimal overhang depth is realistic (0.2m - 1.0m)', result.optimalOverhangDepthM);
  assert(result.summer.shadePercent >= 99.0, 'Summer solstice window shading is ~100% cutoff', result.summer.shadePercent);
  assert(result.winter.shadePercent < 50, 'Winter solstice allows solar gain (<50% shaded)', result.winter.shadePercent);
  assert(result.winter.sunPenetrationM > 1.0, 'Winter sun penetrates deep into room (>1.0m)', result.winter.sunPenetrationM);
  assert(result.briseSoleil.bladeDepthM > 0.04, 'Louver blade depth calculated', result.briseSoleil.bladeDepthM);
  assert(result.verticalFins.finDepthM > 0, 'Vertical fin projection computed', result.verticalFins.finDepthM);
}

// --- 2. Passive Solar Shading Calculations (Southern Hemisphere, Sydney 34°S) ---
{
  const sydneyResult = calculateSolarShading({
    latitudeDeg: -33.86,
    longitudeDeg: 151.21,
    timezoneOffsetHours: 10,
    facadeAzimuthDeg: 0, // Facing True North in Southern Hemisphere
    windowHeightM: 2.0,
    windowWidthM: 3.0,
    sillHeightM: 0.5,
    headToOverhangM: 0.2,
    roomDepthM: 6.0
  });

  assert(sydneyResult.isEquatorFacing === true, 'Equator-facing facade in southern hemisphere recognized');
  assert(sydneyResult.summer.vsaDeg > 65, 'Southern hemisphere summer VSA > 65°', sydneyResult.summer.vsaDeg);
  assert(sydneyResult.optimalOverhangDepthM > 0.2, 'Southern hemisphere optimal depth calculated', sydneyResult.optimalOverhangDepthM);
  assert(sydneyResult.summer.shadePercent >= 99.0, 'Southern hemisphere summer 100% cutoff achieved', sydneyResult.summer.shadePercent);
}

// --- 3. Manual Overhang Depth & Shading Percentages ---
{
  const manualResult = calculateSolarShading({
    latitudeDeg: 40.71, // NYC
    timezoneOffsetHours: -5,
    facadeAzimuthDeg: 180,
    windowHeightM: 1.5,
    sillHeightM: 0.8,
    headToOverhangM: 0.1,
    overhangDepthM: 0.15 // Intentionally shallow overhang
  });

  assert(manualResult.actualOverhangDepthM === 0.15, 'Preserves user specified manual overhang depth');
  assert(manualResult.summer.shadePercent < 90, 'Shallow overhang does not provide 100% summer shade', manualResult.summer.shadePercent);
  assert(manualResult.summer.shadedHeightM < 1.5, 'Glazing has unshaded portion with shallow overhang');
}

// --- 4. Architectural DXF Section Generation ---
{
  const result = calculateSolarShading({
    latitudeDeg: 35.0,
    facadeAzimuthDeg: 180,
    windowHeightM: 1.6,
    windowWidthM: 2.0,
    sillHeightM: 0.9,
    headToOverhangM: 0.2,
    roomDepthM: 4.0
  });

  const entities = generateShadingSectionEntities(result);
  assert(Array.isArray(entities) && entities.length > 10, 'Generates section CAD entities array', entities.length);

  const dxfString = shadingSectionToDXF(result);
  assert(typeof dxfString === 'string' && dxfString.length > 500, 'Generates DXF string');
  assert(dxfString.includes('SECTION') && dxfString.includes('ENTITIES'), 'Valid DXF structural markers present');
  assert(dxfString.includes('A-WALL'), 'Includes AIA A-WALL layer');
  assert(dxfString.includes('A-GLAZ'), 'Includes AIA A-GLAZ layer');
  assert(dxfString.includes('A-ROOF'), 'Includes AIA A-ROOF layer');
  assert(dxfString.includes('A-SITE'), 'Includes AIA A-SITE layer');
  assert(dxfString.includes('A-ANNO-TEXT'), 'Includes AIA A-ANNO-TEXT layer');
  assert(dxfString.includes('Summer VSA:'), 'Contains summer VSA annotation text');
}

// --- 5. Responsive Architectural Section SVG ---
{
  const result = calculateSolarShading({
    latitudeDeg: 32.0,
    facadeAzimuthDeg: 180,
    windowHeightM: 1.8,
    windowWidthM: 2.0,
    sillHeightM: 0.8,
    headToOverhangM: 0.15,
    roomDepthM: 4.5
  });

  const svg = shadingSectionToSVG(result);
  assert(typeof svg === 'string', 'Generates SVG output');
  assert(svg.includes('<svg') && svg.includes('</svg>'), 'Valid SVG root tags');
  assert(svg.includes('id="wallHatch"'), 'Contains wall cross-hatch pattern definition');
  assert(svg.includes('Summer Solstice (VSA'), 'Contains summer solstice ray label');
  assert(svg.includes('Winter Solstice (VSA'), 'Contains winter solstice ray label');
  assert(svg.includes('Summer Cutoff:') && svg.includes('>100%</tspan>'), 'Contains 100% cutoff performance badge');
}

// --- 6. AutoCAD AutoLISP Block Generator (.lsp) ---
{
  const mockAsset = {
    id: 'desk_executive_01',
    name: 'Executive L-Desk & Credenza Set',
    category: 'desks',
    subCategory: 'executive',
    tags: ['desk', 'executive', 'l-shape'],
    realDimensions: { width: 2.2, depth: 1.8, height: 0.75 },
    cadStandard: {
      layer: 'A-FURN',
      color: 7,
      lineType: 'CONTINUOUS',
      insertionPoint: 'TOP_LEFT',
      snapPoints: [{ x: 0, y: 0 }, { x: 2.2, y: 1.8 }]
    },
    geometry: {
      primitives: [
        { type: 'rect', x: 0, y: 0, w: 2.2, d: 0.9, layer: 'A-FURN', color: 7 },
        { type: 'rect', x: 1.4, y: 0.9, w: 0.8, d: 0.9, layer: 'A-FURN', color: 7 },
        { type: 'circle', cx: 1.1, cy: 0.45, r: 0.04, layer: 'A-FURN', color: 7 }
      ]
    }
  };

  const lispCode = generateAutoLispBlock(mockAsset);
  assert(typeof lispCode === 'string' && lispCode.length > 300, 'Generates AutoLISP script');
  assert(lispCode.includes('c:AHH_DESK_EXECUTIVE_01'), 'Generates proper command name defun');
  assert(lispCode.includes('(entmake \'((0 . "BLOCK")'), 'Defines native AutoCAD block via entmake');
  assert(lispCode.includes('(entmake \'((0 . "ENDBLK"))'), 'Closes block definition via ENDBLK');
  assert(lispCode.includes('(entmake (list \'(0 . "POLYLINE")'), 'Creates native POLYLINE entities');
  assert(lispCode.includes('(entmake (list \'(0 . "CIRCLE")'), 'Creates native CIRCLE entities');
  assert(lispCode.includes('(command "_.-LAYER" "_M" "A-FURN"'), 'Configures AIA CAD layer');
  assert(lispCode.includes('(command "_.-INSERT"'), 'Invokes insert command on active DWG drawing');
}

// --- 7. AutoCAD Batch DWG Script (.scr) & Windows Batch (.bat) ---
{
  const fileNames = ['desk_executive.dxf', 'chair_herman.dxf', 'meeting_table.dxf'];
  const scrContent = generateAutoCadBatchDwgScript(fileNames);

  assert(typeof scrContent === 'string' && scrContent.length > 100, 'Generates AutoCAD .scr script');
  assert(scrContent.includes('DXFIN "desk_executive.dxf"'), 'Imports DXF file');
  assert(scrContent.includes('ZOOM EXTENTS'), 'Zooms extents on imported drawing');
  assert(scrContent.includes('SAVEAS 2018 "desk_executive.dwg"'), 'Saves native AutoCAD DWG file');
  assert(scrContent.includes('CLOSE'), 'Closes drawing cleanly');

  const batContent = generateWindowsDwgBatchBat();
  assert(typeof batContent === 'string' && batContent.includes('accoreconsole.exe'), 'Generates Windows DWG batch converter invoking accoreconsole');
  assert(batContent.includes('convert_to_dwg.scr'), 'References the AutoCAD script');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}
