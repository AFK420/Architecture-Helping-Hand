/**
 * Architecture Helping Hand — Specialized CAD Generators Test Suite
 *
 * Verifies:
 *   1. Stair & Ramp 1:1 CAD Section Detail Generator
 *   2. Parking Lot & ADA Stall Bay Layout Generator
 *   3. Graphical Door & Window Elevation Schedule CAD Sheet
 *   4. AutoCAD Plot Style (CTB) & Pen Weight Manager
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CG = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'cad-generators.js')).href);

const {
  generateStairCadDetail,
  generateRampCadDetail,
  generateParkingBayCadDetail,
  generateDoorWindowElevationSchedule,
  STANDARD_DOOR_TYPES,
  STANDARD_WINDOW_TYPES,
  AIA_PLOT_STYLE_PENS,
  generateLayerLineweightScript,
  generatePlotStyleAutoLisp,
  generatePlotStyleReportText
} = CG;

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

console.log('🧪 Running tests/cad-generators.test.js...');

// --- 1. Stair CAD Detail Generator ---
const stair = generateStairCadDetail({
  totalRiseMm: 2700,
  riserCount: 15,
  treadDepthMm: 280,
  nosingMm: 25,
  includeHandrail: true,
  includeDimensions: true
});

assert(Array.isArray(stair.entities) && stair.entities.length > 20, 'Stair generates rich 2D CAD entities');
assert(stair.specs.riserHeight === 180, 'Calculates exact 180mm riser height for 2700mm rise / 15 risers');
assert(stair.specs.totalRun === 14 * 280, 'Calculates exact 3920mm total run for 14 goings @ 280mm');
assert(stair.specs.blondel === 640, 'Calculates Blondel rule: 2R + G = 2(180) + 280 = 640mm');
assert(stair.entities.some(e => e.layer === 'A-FLOR-STRS'), 'Includes A-FLOR-STRS flight layer');
assert(stair.entities.some(e => e.layer === 'A-FLOR-HRAL'), 'Includes A-FLOR-HRAL handrail layer');
assert(stair.entities.some(e => e.layer === 'A-ANNO-DIMS'), 'Includes A-ANNO-DIMS dimensions layer');
assert(typeof stair.dxf === 'string' && stair.dxf.includes('A-FLOR-STRS'), 'Generates valid 1:1 DXF string with stair layer');
assert(typeof stair.svg === 'string' && stair.svg.includes('<svg'), 'Generates valid SVG preview');
assert(typeof stair.lisp === 'string' && stair.lisp.includes('c:AHH_STAIR_SECTION'), 'Generates AutoLISP command');

// --- 2. Ramp CAD Detail Generator ---
const ramp = generateRampCadDetail({
  totalRiseMm: 600,
  slopeRatio: 12,
  landingLengthMm: 1500,
  includeHandrail: true
});

assert(Array.isArray(ramp.entities) && ramp.entities.length > 10, 'Ramp generates 2D CAD entities');
assert(ramp.specs.rampRun === 7200, 'Calculates 7200mm ramp run (600mm rise * 12)');
assert(ramp.specs.slopePercent === 8.33, 'Calculates 8.33% slope for 1:12 ADA ratio');
assert(ramp.entities.some(e => e.layer === 'A-FLOR-RAMP'), 'Includes A-FLOR-RAMP layer');
assert(ramp.entities.some(e => e.layer === 'A-FLOR-HRAL'), 'Includes A-FLOR-HRAL handrail layer');
assert(typeof ramp.dxf === 'string' && ramp.dxf.includes('A-FLOR-RAMP'), 'Generates valid DXF string for ramp');

// --- 3. Parking Lot & ADA Bay Generator ---
const parking90 = generateParkingBayCadDetail({
  stallCount: 16,
  angle: 90,
  stallWidthMm: 2700,
  stallDepthMm: 5500,
  aisleWidthMm: 7300,
  adaCount: 2,
  vanAdaCount: 1,
  doubleBay: true,
  includeTireStops: true
});

assert(Array.isArray(parking90.entities) && parking90.entities.length > 30, 'Parking bay generates CAD entities');
assert(parking90.entities.some(e => e.layer === 'C-ROAD-STRP'), 'Includes C-ROAD-STRP pavement striping layer');
assert(parking90.entities.some(e => e.layer === 'C-ROAD-PARK'), 'Includes C-ROAD-PARK curb / wheel stop layer');
assert(parking90.entities.some(e => e.layer === 'C-ROAD-SYMB'), 'Includes C-ROAD-SYMB wheelchair ISA markings');
assert(parking90.entities.some(e => e.layer === 'C-ROAD-ANNO'), 'Includes C-ROAD-ANNO annotation text');
assert(parking90.specs.totalStalls === 16, 'Specs report total stall count');
assert(parking90.specs.adaStalls === 2, 'Specs report ADA stall count');
assert(parking90.specs.vanAdaStalls === 1, 'Specs report Van ADA stall count');
assert(typeof parking90.dxf === 'string' && parking90.dxf.includes('C-ROAD-STRP'), 'Generates valid parking bay DXF');
assert(typeof parking90.svg === 'string' && parking90.svg.includes('<svg'), 'Generates valid parking SVG preview');

// Test 60-degree angled bay
const parking60 = generateParkingBayCadDetail({ angle: 60, stallCount: 10 });
assert(parking60.specs.angle === 60, 'Supports 60-degree angled parking bay');
assert(parking60.entities.length > 20, 'Angled parking entities generated');

// --- 4. Graphical Door & Window Elevation Schedule ---
const schedule = generateDoorWindowElevationSchedule();
assert(Array.isArray(schedule.entities) && schedule.entities.length > 40, 'Door & window schedule generates CAD entities');
assert(STANDARD_DOOR_TYPES.length === 6, 'Contains 6 standard architectural door types');
assert(STANDARD_WINDOW_TYPES.length === 5, 'Contains 5 standard architectural window types');
assert(schedule.entities.some(e => e.layer === 'A-DOOR'), 'Includes A-DOOR elevation layer');
assert(schedule.entities.some(e => e.layer === 'A-GLAZ'), 'Includes A-GLAZ glazing frame layer');
assert(schedule.entities.some(e => e.layer === 'A-FLOR-LEVL'), 'Includes A-FLOR-LEVL floor level marker');
assert(schedule.entities.some(e => e.layer === 'A-ANNO-TEXT' && e.text === 'D01'), 'Includes D01 door tag');
assert(schedule.entities.some(e => e.layer === 'A-ANNO-TEXT' && e.text === 'W01'), 'Includes W01 window tag');
assert(typeof schedule.dxf === 'string' && schedule.dxf.includes('A-DOOR'), 'Generates valid 1:1 DXF elevation sheet');

// --- 5. AutoCAD Plot Style Table (CTB) & Pen Weights ---
assert(AIA_PLOT_STYLE_PENS.length === 9, 'Contains 9 certified AIA NCS pen weight mappings');
assert(AIA_PLOT_STYLE_PENS.find(p => p.colorIndex === 1).mm === 0.18, 'Color 1 Red = 0.18mm');
assert(AIA_PLOT_STYLE_PENS.find(p => p.colorIndex === 4).mm === 0.70, 'Color 4 Cyan = 0.70mm');

const scr = generateLayerLineweightScript();
assert(typeof scr === 'string' && scr.includes('_LWEIGHT 0.70 A-WALL-FULL'), 'Generates AutoCAD .scr script setting lineweights');
assert(scr.includes('LWDISPLAY 1'), 'Script activates on-screen lineweights');

const lisp = generatePlotStyleAutoLisp();
assert(typeof lisp === 'string' && lisp.includes('c:AHH_SET_PEN_WEIGHTS'), 'Generates AutoLISP pen command');

const report = generatePlotStyleReportText();
assert(typeof report === 'string' && report.includes('AIA NCS / ISO 13567 PLOT STYLE'), 'Generates human-readable CTB guide');

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
