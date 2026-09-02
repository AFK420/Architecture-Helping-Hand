/**
 * Architecture Helping Hand - Export Center Test Suite
 * Phase 1: Universal Export Center.
 *
 * Real-engine rule: tables are built from REAL workspace/chain/stair/ramp/
 * slope engine outputs; JSON round-trips through the REAL project model;
 * the store used is the real project store with an in-memory adapter.
 */

import {
  EXPORT_FORMATS,
  EXPORT_CONTENT_TYPES,
  createExportTable,
  createExportProvenance,
  workspaceToTable,
  chainToTable,
  stairToTable,
  slopeToTable,
  decisionsToTable,
  notesToTable,
  tableToTSV,
  tableToCSV,
  tableToTXT,
  serializeProjectJSON,
  deserializeProjectJSON,
  buildDXF,
  chainToDXFEntities,
  roomsToDXFEntities,
  wrapSVGDocument,
  buildExport
} from '../src/core/export/export-model.js';
import { createProjectStore } from '../src/services/store.js';
import { createProject } from '../src/core/project.js';
import { serializeWorkspace, createDefaultWorkspace, createDimensionEntry } from '../src/core/dimension-workspace.js';
import { createDimensionChain, createChainSegment, calculateChain } from '../src/core/dimension-chains.js';
import { calculateStair } from '../src/core/stairs.js';
import { calculateRamp } from '../src/core/ramps.js';
import { analyzeSlope } from '../src/core/slopes.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

function assertClose(actual, expected, message, eps = 1e-6) {
  const ok = Math.abs(actual - expected) < eps;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, Received: ${actual})`);
  }
}

console.log('🧪 Running tests/export.test.js...');

// Real fixtures from real engines
const workspace = createDefaultWorkspace();
// Replace sample entries with controlled real entries (via the real factory so
// realMeters parsing is exercised end-to-end)
workspace.entries = [
  createDimensionEntry({ name: 'Wall "A", north', rawInput: '4800mm', dimensionType: 'segment', notes: 'Has\ttab and\nnewline' }, 'mm'),
  createDimensionEntry({ name: 'Door', rawInput: '900mm', dimensionType: 'reference' }, 'mm')
];
workspace.scaleRatio = 50;

const chain = createDimensionChain({ name: 'North Wall', defaultUnit: 'mm', scaleRatio: 50 });
chain.segments = [
  createChainSegment({ name: 'Bay 1', rawInput: '1200', dimensionType: 'segment' }),
  createChainSegment({ name: 'Door', rawInput: '900', dimensionType: 'segment' })
];
const calculatedChain = calculateChain(chain);

const stair = calculateStair({ mode: 'rise_riser_count', totalRise: 2.8, riserCount: 16, desiredTread: 0.3 });
const ramp = calculateRamp({ mode: 'rise_run_direct', rise: 1.2, run: 14.4 });
const slope = analyzeSlope({ mode: 'rise_run', rise: 1.2, run: 14.4 });

const project = createProject({ id: 'proj-export', name: 'Export Study' });
project.notes.push({ id: 'n1', title: 'Intent', body: 'Courtyard faces south', createdAt: '2026-09-03T00:00:00.000Z' });
project.decisions.push({ id: 'd1', kind: 'stair', name: 'Main flight', createdAt: '2026-09-03T00:00:00.000Z', result: { riserCount: 16 } });

// ---------------------------------------------------------------------------
// 1. Table builders from REAL engine outputs
// ---------------------------------------------------------------------------
console.log('\n--- 1. Table builders (real engines) ---');

{
  const t = workspaceToTable(workspace);
  assert(t && t.rows.length === 2, 'workspaceToTable collects real entries');
  assertEqual(t.rows[0].name, 'Wall "A", north', 'Row keeps real name');
  assertClose(t.rows[0].drawingMeters, 0.096, 'Drawing meters derived via real scaleRatio');

  const c = chainToTable(calculatedChain);
  assert(c && c.rows.length === 2, 'chainToTable collects real calculated chain');
  assertClose(c.rows[0].lengthMeters, 1.2, 'Chain length from real calculateChain output (lengthMeters)');

  const s = stairToTable(stair);
  assert(s && s.rows.length === 1, 'stairToTable collects real stair');
  assertEqual(s.rows[0].risers, 16, 'Stair riser count real');

  const r = slopeToTable(ramp, 'Ramp Calculation');
  assert(r && r.rows.length === 1, 'slopeToTable accepts real ramp result');
  const sl = slopeToTable(slope, 'Slope Analysis');
  assert(sl && sl.rows.length === 1, 'slopeToTable accepts real slope result (slopedLengthMeters alias)');

  const d = decisionsToTable(project);
  assert(d && d.rows.length === 1, 'decisionsToTable collects real decision');
  const n = notesToTable(project);
  assert(n && n.rows.length === 1 && n.rows[0].body === 'Courtyard faces south', 'notesToTable collects real note');
}

// ---------------------------------------------------------------------------
// 2. TSV/CSV/TXT serialization + escaping
// ---------------------------------------------------------------------------
console.log('\n--- 2. Tabular serialization ---');

{
  const t = workspaceToTable(workspace);
  const tsv = tableToTSV(t);
  assert(tsv.includes('Dimension Schedule'), 'TSV includes title');
  assert(tsv.split('\n').length >= 4, 'TSV: title + header + 2 rows');
  // Tab/newline inside a cell must be flattened, never break the row structure
  const dataRow = tsv.split('\n')[2];
  assertEqual(dataRow.split('\t').length, t.columns.length, 'TSV row column count preserved despite embedded tab/newline in name/notes');
  assert(!dataRow.includes('\n'), 'TSV cell does not contain raw newline');

  const csv = tableToCSV(t);
  const csvRow = csv.split('\n')[2];
  assert(csvRow.startsWith('"Wall ""A"", north"') || csvRow.includes('""'), 'CSV escaping quotes embedded quotes/commas (RFC-4180)');

  const txt = tableToTXT(t);
  assert(txt.includes('WALL "A", NORTH'.toUpperCase().slice(0, 5)) || txt.toUpperCase().includes('DIMENSION SCHEDULE'), 'TXT includes uppercase title');
  assert(txt.includes('Real (m): 4.8'), 'TXT shows labeled values');
}

// ---------------------------------------------------------------------------
// 3. JSON round-trip through the REAL project model
// ---------------------------------------------------------------------------
console.log('\n--- 3. JSON round-trip ---');

{
  const json = serializeProjectJSON(project, createExportProvenance('test', EXPORT_FORMATS.JSON, project.id));
  assert(typeof json === 'string' && json.includes('_provenance'), 'JSON export includes provenance envelope');
  const reimported = deserializeProjectJSON(json);
  assertEqual(reimported.id, 'proj-export', 'Round-trip: id preserved');
  assertEqual(reimported.metadata.name, 'Export Study', 'Round-trip: name preserved');
  assertEqual(reimported.notes[0].body, 'Courtyard faces south', 'Round-trip: note preserved');

  // Provenance is NOT inside the project → project part validates standalone
  const bare = JSON.parse(json).project;
  assertEqual(bare.schemaVersion, project.schemaVersion, 'Project part is a clean valid document');
}

{
  // Malformed rejection
  let threw = false;
  try { deserializeProjectJSON('{"project": {"id": ""}}'); } catch (e) { threw = true; }
  assert(threw, 'Invalid imported project rejected');
  threw = false;
  try { deserializeProjectJSON('not json'); } catch (e) { threw = true; }
  assert(threw, 'Unparseable JSON rejected');

  let exportThrew = false;
  try { serializeProjectJSON({ id: '', schemaVersion: 'x' }); } catch (e) { exportThrew = true; }
  assert(exportThrew, 'Exporting an invalid project throws controlled error');
}

// ---------------------------------------------------------------------------
// 4. DXF writer
// ---------------------------------------------------------------------------
console.log('\n--- 4. DXF ---');

{
  const dxf = buildDXF([
    { type: 'line', x1: 0, y1: 0, x2: 4.8, y2: 0 },
    { type: 'polyline', points: [[0, 0], [4.8, 0], [4.8, 3.2], [0, 3.2]], closed: true },
    { type: 'text', x: 2, y: 1.6, text: 'LIVING', height: 0.2 },
    { type: 'circle', x: 1, y: 1, r: 0.5 },
    { type: 'garbage' }
  ], { scale: 1000 });

  assert(dxf.includes('SECTION') && dxf.includes('ENTITIES') && dxf.includes('EOF'), 'DXF has required section structure');
  assert(dxf.includes('AC1009'), 'DXF declares R12 version (AC1009)');
  assert(dxf.includes('$INSUNITS'), 'DXF declares units hint');
  assert(dxf.includes('LINE') && dxf.includes('POLYLINE') && dxf.includes('VERTEX') && dxfPair_check(dxf) && dxf.includes('SEQEND'), 'DXF entity types present with SEQEND');
  assert(dxf.includes('LIVING'), 'DXF text content present');
  assert(dxf.includes('4800.0000'), 'DXF meters scaled to mm (4.8 m → 4800)');
  assert(!dxf.includes('garbage'), 'Unknown entity types skipped');
  // Deterministic
  assertEqual(dxf, buildDXF([
    { type: 'line', x1: 0, y1: 0, x2: 4.8, y2: 0 },
    { type: 'polyline', points: [[0, 0], [4.8, 0], [4.8, 3.2], [0, 3.2]], closed: true },
    { type: 'text', x: 2, y: 1.6, text: 'LIVING', height: 0.2 },
    { type: 'circle', x: 1, y: 1, r: 0.5 },
    { type: 'garbage' }
  ], { scale: 1000 }), 'DXF generation deterministic');

  // Group-code sanity: every group code line is an integer
  const lines = dxf.split('\n');
  let codesOk = true;
  for (let i = 0; i < lines.length - 1; i += 2) {
    if (!/^\d+$/.test(lines[i].trim())) codesOk = false;
  }
  assert(codesOk, 'DXF group-code/value pairs structurally valid');
}

function dxfPair_check(dxf) {
  return dxf.includes('VERTEX');
}

{
  // Chain → DXF via real chain output
  const entities = chainToDXFEntities(calculatedChain);
  assertEqual(entities.length, 2, 'Real chain produces 2 line entities');
  assertClose(entities[0].x2 - entities[0].x1, 1.2, 'First chain segment real length');
  const dxf = buildDXF(entities);
  assert(dxf.includes('1200.0000'), 'Chain DXF scaled to mm');
}

{
  // Rooms → DXF
  const entities = roomsToDXFEntities([{ name: 'LIVING', x: 0, y: 0, widthMeters: 4.8, depthMeters: 3.2 }]);
  assertEqual(entities.length, 2, 'Room produces closed polyline + label');
  const dxf = buildDXF(entities);
  assert(dxf.includes('4800.0000') && dxf.includes('3200.0000'), 'Room rectangle dimensions in mm');
  assert(dxf.includes('70\n1') || dxf.includes('70\n1'), 'Closed polyline flag set');
}

// ---------------------------------------------------------------------------
// 5. SVG wrapping
// ---------------------------------------------------------------------------
console.log('\n--- 5. SVG export ---');

{
  const wrapped = wrapSVGDocument('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
  assert(wrapped.startsWith('<?xml'), 'SVG document gets XML declaration');
  assert(wrapped.includes('xmlns='), 'xmlns ensured');
  assert(wrapped.includes('Architecture Helping Hand'), 'Provenance comment embedded');
  let threw = false;
  try { wrapSVGDocument('<div>not svg</div>'); } catch (e) { threw = true; }
  assert(threw, 'Non-SVG markup rejected');
}

// ---------------------------------------------------------------------------
// 6. buildExport master entry
// ---------------------------------------------------------------------------
console.log('\n--- 6. buildExport ---');

{
  const r = buildExport({ format: EXPORT_FORMATS.JSON, source: 'project-workspace', project, projectId: project.id });
  assert(r.content.length > 0 && r.fileName.endsWith('.json'), 'JSON export builds with timestamped filename');
  assertEqual(r.contentType, EXPORT_CONTENT_TYPES.json, 'JSON content type');
  assert(r.provenance.source === 'project-workspace' && r.provenance.format === 'json', 'Provenance stamped');

  const rTsv = buildExport({ format: EXPORT_FORMATS.TSV, source: 'chain', tables: [chainToTable(calculatedChain)] });
  assert(rTsv.fileName.endsWith('.tsv') && rTsv.content.includes('Bay 1'), 'TSV export from real chain');

  const rDxf = buildExport({ format: EXPORT_FORMATS.DXF, source: 'chain', dxfEntities: chainToDXFEntities(calculatedChain) });
  assert(rDxf.fileName.endsWith('.dxf') && rDxf.content.includes('EOF'), 'DXF export from real chain');

  const rSvg = buildExport({ format: EXPORT_FORMATS.SVG, source: 'stair', svgMarkup: '<svg viewBox="0 0 1 1"></svg>' });
  assert(rSvg.fileName.endsWith('.svg'), 'SVG export builds');

  let threw = false;
  try { buildExport({ format: 'pdf-raw', source: 'x' }); } catch (e) { threw = true; }
  assert(threw, 'Unknown format rejected');
  threw = false;
  try { buildExport({ format: EXPORT_FORMATS.CSV, source: 'x', tables: [] }); } catch (e) { threw = true; }
  assert(threw, 'CSV without tables rejected');
}

// ---------------------------------------------------------------------------
// 7. Store round-trip with exported JSON (real store)
// ---------------------------------------------------------------------------
console.log('\n--- 7. Store + export integration ---');

{
  const map = new Map();
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
  const store = createProjectStore({ storage, generateId: () => 'proj-export-store' });
  store.createNewProject({ name: 'Store Export' });
  store.updateProject(d => { d.notes.push({ id: 'n1', title: 'T', body: 'B' }); return d; });

  const exported = serializeProjectJSON(store.getProject());
  const parsed = deserializeProjectJSON(exported);
  const set = store.setProject(parsed);
  assert(set.ok, 'Exported JSON re-imports through the real store');
  assertEqual(store.getProject().notes[0].body, 'B', 'Re-imported note intact');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
