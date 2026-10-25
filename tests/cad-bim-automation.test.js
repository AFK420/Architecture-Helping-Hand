/**
 * Architecture Helping Hand — AutoCAD & BIM Automation Test Suite
 *
 * Verifies:
 *   1. AIA & ISO 13567 Standard Layers catalog and AutoLISP/Script generator
 *   2. Autodesk Native Tool Palette XML (.atc) generator
 *   3. CAD Layer Standardizer & DXF Sanitizer (Purger, Remapper, BYLAYER normalizer)
 *   4. Autodesk Revit Shared Parameters (.txt) generator
 *   5. Dynamo Python Batch Instance Placer script
 *   6. BIM Schedules & 1:1 DXF Table generation (Doors, Rooms, FF&E)
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CBA = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'cad-bim-automation.js')).href);

const {
  AIA_STANDARD_LAYERS,
  CAD_LAYER_REMAP_DICTIONARY,
  generateAiaLayersAutoLisp,
  generateAiaLayersScript,
  generateAutoCadToolPaletteAtc,
  sanitizeAndStandardizeDxf,
  generateRevitSharedParametersFile,
  generateDynamoPythonBatchPlacer,
  generateBimSchedule
} = CBA;

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

console.log('🧪 Running tests/cad-bim-automation.test.js...');

// --- 1. AIA Standard Layer Catalog ---
{
  assert(Array.isArray(AIA_STANDARD_LAYERS) && AIA_STANDARD_LAYERS.length === 24, 'AIA Standard Layers catalog contains 24 certified layers');
  const layerNames = new Set(AIA_STANDARD_LAYERS.map(l => l.name));
  assert(layerNames.size === 24, 'All layer names are strictly unique');
  assert(layerNames.has('A-WALL-FULL'), 'Includes full-height walls (A-WALL-FULL)');
  assert(layerNames.has('A-DOOR'), 'Includes doors (A-DOOR)');
  assert(layerNames.has('A-GLAZ'), 'Includes glazing/windows (A-GLAZ)');
  assert(layerNames.has('A-FURN'), 'Includes furniture (A-FURN)');
  assert(layerNames.has('A-CLEARANCE'), 'Includes accessibility clearances (A-CLEARANCE)');
  assert(layerNames.has('A-ANNO-DIMS'), 'Includes dimensions (A-ANNO-DIMS)');
  assert(layerNames.has('A-ANNO-TEXT'), 'Includes text callouts (A-ANNO-TEXT)');
  assert(layerNames.has('M-HVAC'), 'Includes mechanical HVAC (M-HVAC)');
  assert(layerNames.has('P-FIXT'), 'Includes plumbing fixtures (P-FIXT)');

  const allValid = AIA_STANDARD_LAYERS.every(l =>
    typeof l.name === 'string' &&
    l.colorIndex >= 1 && l.colorIndex <= 255 &&
    typeof l.colorHex === 'string' &&
    typeof l.linetype === 'string' &&
    l.lineweightMm > 0 &&
    typeof l.description === 'string'
  );
  assert(allValid, 'Every layer has valid ACI color, hex, linetype, lineweight, and description');
}

// --- 2. AutoLISP Layer Generator (.lsp) ---
{
  const lisp = generateAiaLayersAutoLisp({ commandName: 'AHH_SETUP_LAYERS', units: 4 });
  assert(typeof lisp === 'string' && lisp.length > 500, 'Generates AutoLISP layer code');
  assert(lisp.includes('(defun c:AHH_SETUP_LAYERS'), 'Defines custom AutoCAD command c:AHH_SETUP_LAYERS');
  assert(lisp.includes('(command "_.-LAYER" "_M" "A-WALL-FULL"'), 'Creates A-WALL-FULL layer via command');
  assert(lisp.includes('(command "_.-LAYER" "_M" "A-CLEARANCE"'), 'Creates A-CLEARANCE layer');
  assert(lisp.includes('(setvar "INSUNITS" 4)'), 'Sets drawing units to millimeters ($INSUNITS = 4)');
  assert(lisp.includes('(setvar "CLAYER" "A-WALL-FULL")'), 'Sets active layer to A-WALL-FULL');
  assert(lisp.includes('(load-lt "DASHED")'), 'Safely loads DASHED linetype');
  assert(lisp.includes('(c:AHH_SETUP_LAYERS)'), 'Auto-executes layer setup upon drag-and-drop');
}

// --- 3. AutoCAD Script Layer Generator (.scr) ---
{
  const scr = generateAiaLayersScript();
  assert(typeof scr === 'string' && scr.length > 300, 'Generates AutoCAD script');
  assert(scr.includes('-LAYER MAKE A-WALL-FULL'), 'Makes A-WALL-FULL layer in script');
  assert(scr.includes('-LINETYPE LOAD DASHED'), 'Loads DASHED linetype in script');
  assert(scr.includes('CLAYER A-WALL-FULL'), 'Sets active layer in script');
}

// --- 4. Autodesk Tool Palette Generator (.atc) ---
{
  const mockAssets = [
    { id: 'desk_exec', name: 'Executive Desk', dimensions: { widthMm: 2000, depthMm: 1000 }, planGeometry: [{ layer: 'A-FURN' }] },
    { id: 'chair_task', name: 'Ergonomic Task Chair', dimensions: { widthMm: 650, depthMm: 650 }, planGeometry: [{ layer: 'A-FURN' }] }
  ];

  const atcXml = generateAutoCadToolPaletteAtc('AHH - Desks & Seating', 'desks', mockAssets);
  assert(typeof atcXml === 'string' && atcXml.length > 300, 'Generates Tool Palette XML string');
  assert(atcXml.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Includes XML declaration');
  assert(atcXml.includes('<Palette xmlns="http://www.autodesk.com/shapes/toolpalette">'), 'Conforms to Autodesk ToolPalette schema');
  assert(atcXml.includes('<Name>AHH - Desks &amp; Seating</Name>') || atcXml.includes('AHH - Desks'), 'Contains palette display name');
  assert(atcXml.includes('<Tool>'), 'Contains Tool elements');
  assert(atcXml.includes('<Name>Executive Desk</Name>'), 'Includes asset name');
  assert(atcXml.includes('AHH_DESK_EXEC'), 'Includes AutoCAD block name');
  assert(atcXml.includes('<Property name="Layer">A-FURN</Property>'), 'Includes target CAD layer');
}

// --- 5. CAD Layer Standardizer & DXF Sanitizer ---
{
  const messyDxf = [
    '  0', 'SECTION',
    '  2', 'ENTITIES',
    // 1. Valid line on non-standard layer "walls" with fixed color 1
    '  0', 'LINE',
    '  8', 'walls',
    ' 10', '0.0', ' 20', '0.0',
    ' 11', '1000.0', ' 21', '0.0',
    ' 62', '1',
    // 2. Duplicate collinear line
    '  0', 'LINE',
    '  8', 'walls',
    ' 10', '0.0', ' 20', '0.0',
    ' 11', '1000.0', ' 21', '0.0',
    // 3. Degenerate zero-length line (Δx=0, Δy=0)
    '  0', 'LINE',
    '  8', 'temp',
    ' 10', '250.0', ' 20', '250.0',
    ' 11', '250.0', ' 21', '250.0',
    // 4. Line on non-standard layer "doors"
    '  0', 'LINE',
    '  8', 'doors',
    ' 10', '1000.0', ' 20', '0.0',
    ' 11', '1000.0', ' 21', '900.0',
    // 5. Line on non-standard layer "window"
    '  0', 'LINE',
    '  8', 'window',
    ' 10', '1200.0', ' 20', '0.0',
    ' 11', '2000.0', ' 21', '0.0',
    '  0', 'ENDSEC',
    '  0', 'EOF'
  ].join('\n');

  const result = sanitizeAndStandardizeDxf(messyDxf, {
    remapLayers: true,
    purgeZeroLength: true,
    purgeDuplicates: true,
    normalizeColorByLayer: true
  });

  assert(result !== null && typeof result === 'object', 'Returns sanitization result object');
  assert(result.stats.purgedZeroLength === 1, 'Purged 1 zero-length line', result.stats.purgedZeroLength);
  assert(result.stats.purgedDuplicates === 1, 'Purged 1 duplicate collinear line', result.stats.purgedDuplicates);
  assert(result.stats.remappedLayers >= 3, 'Remapped non-standard layers to AIA NCS', result.stats.remappedLayers);
  assert(result.sanitizedDxf.includes('A-WALL-FULL'), 'Remapped "walls" to "A-WALL-FULL"');
  assert(result.sanitizedDxf.includes('A-DOOR'), 'Remapped "doors" to "A-DOOR"');
  assert(result.sanitizedDxf.includes('A-GLAZ'), 'Remapped "window" to "A-GLAZ"');
  assert(result.sanitizedDxf.includes('256'), 'Normalized color to BYLAYER (color 256)');
  assert(!result.sanitizedDxf.includes('250.0\n 20\n250.0\n 11\n250.0\n 21\n250.0'), 'Zero length line was omitted from output');
}

// --- 6. Autodesk Revit Shared Parameters File ---
{
  const txt = generateRevitSharedParametersFile();
  assert(typeof txt === 'string' && txt.length > 500, 'Generates shared parameters text');
  assert(txt.includes('# This is a Revit shared parameter file.'), 'Contains standard Revit shared parameter header');
  assert(txt.includes('*META\tVERSION\tMINVERSION'), 'Contains *META section');
  assert(txt.includes('*GROUP\tID\tNAME'), 'Contains *GROUP section');
  assert(txt.includes('AHH - Dimensions & Clearances'), 'Includes Group 1: Clearances');
  assert(txt.includes('AHH - Performance & Building Codes'), 'Includes Group 2: Building Codes');
  assert(txt.includes('AHH - Specifications & COBie'), 'Includes Group 3: COBie');
  assert(txt.includes('AHH_ClearanceWidth\tLENGTH'), 'Includes AHH_ClearanceWidth parameter');
  assert(txt.includes('AHH_MountingHeight\tLENGTH'), 'Includes AHH_MountingHeight parameter');
  assert(txt.includes('AHH_FireRatingHours\tNUMBER'), 'Includes AHH_FireRatingHours parameter');
  assert(txt.includes('AHH_AcousticSTC\tINTEGER'), 'Includes AHH_AcousticSTC parameter');
  assert(txt.includes('COBie_Component_Name\tTEXT'), 'Includes COBie_Component_Name parameter');
  assert(txt.includes('AHH_OmniClassNumber\tTEXT'), 'Includes AHH_OmniClassNumber parameter');
}

// --- 7. Dynamo Python Batch Placer Script ---
{
  const py = generateDynamoPythonBatchPlacer();
  assert(typeof py === 'string' && py.length > 400, 'Generates Dynamo Python script');
  assert(py.includes('from Autodesk.Revit.DB import *'), 'Imports Autodesk.Revit.DB');
  assert(py.includes('FilteredElementCollector(doc).OfClass(FamilySymbol)'), 'Collects FamilySymbol elements');
  assert(py.includes('matched_symbol.Activate()'), 'Activates family symbol');
  assert(py.includes('doc.Create.NewFamilyInstance'), 'Creates Revit Family Instance');
  assert(py.includes('TransactionManager.Instance.EnsureInTransaction'), 'Wraps execution in Revit transaction');
}

// --- 8. BIM Schedules & 1:1 DXF Table Sheet ---
{
  // Door Schedule
  const doorSched = generateBimSchedule('doors');
  assert(typeof doorSched.csv === 'string' && doorSched.csv.includes('"Mark","Location","Type"'), 'Generates Door Schedule CSV');
  assert(doorSched.rows.length >= 5, 'Contains door schedule rows', doorSched.rows.length);
  assert(typeof doorSched.dxfTable === 'string' && doorSched.dxfTable.includes('SECTION') && doorSched.dxfTable.includes('ENTITIES'), 'Generates valid DXF table string');
  assert(doorSched.dxfTable.includes('A-ANNO-TABL'), 'Includes AIA A-ANNO-TABL layer');
  assert(doorSched.dxfTable.includes('A-ANNO-TEXT'), 'Includes AIA A-ANNO-TEXT layer');
  assert(doorSched.dxfTable.includes('ARCHITECTURAL DOOR SCHEDULE'), 'Includes table title text');

  // Room Finish Schedule
  const roomSched = generateBimSchedule('rooms');
  assert(roomSched.csv.includes('"Room No.","Room Name","Area (m²)"'), 'Generates Room Schedule CSV');
  assert(roomSched.rows.some(r => r.includes('Reception Lobby')), 'Contains reception lobby record');

  // FF&E Schedule
  const ffeSched = generateBimSchedule('ffe');
  assert(ffeSched.csv.includes('"Tag","Description","Category"'), 'Generates FF&E Schedule CSV');
  assert(ffeSched.rows.some(r => r.includes('Executive L-Desk & Credenza')), 'Contains desk record');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}
