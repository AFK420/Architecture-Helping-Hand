/**
 * Architecture Helping Hand - Import + Project Context Test Suite (Phase 15)
 * Importers (CSV/TSV, DXF, SVG) over real content strings, format detection,
 * report shaping, project-context scoping and budgeting.
 *
 * Pure core tests — no network, no DOM (the SVG importer injects a minimal
 * parser mock; the DOMParser-dependent path is exercised with a stub).
 */

import {
  importCsvTable, importDxf, importSvg, importSource, detectImportFormat,
  formatImportReport, parseNumeric, toMeters, detectImportDelimiter
} from '../src/core/import/import-model.js';
import { buildScopedFactsPack, selectProjectScope } from '../src/ai/context/project-context.js';
import { createRoom, createWall, placeFurniture } from '../src/core/entities.js';

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

console.log('🧪 Running tests/imports.test.js...');

// ---------------------------------------------------------------------------
// 1. Helpers
// ---------------------------------------------------------------------------
console.log('\n--- 1. Helpers ---');

{
  assertEqualish(parseNumeric('2.4'), 2.4, 'parseNumeric dot decimal');
  assertEqualish(parseNumeric('2,4'), 2.4, 'parseNumeric comma decimal');
  assert(parseNumeric('abc') === null, 'parseNumeric rejects non-numeric');
  assertClose(toMeters(2400, 'mm'), 2.4, 'toMeters mm→m');
  assertClose(toMeters(8, 'ft'), 2.4384, 'toMeters ft→m');
  assert(toMeters(1, 'furlongs') === null, 'toMeters unknown unit → null');
  assertEqualish(detectImportDelimiter('a\tb\tc'), '\t', 'Tab delimiter detected');
  assertEqualish(detectImportDelimiter('a;b;c'), ';', 'Semicolon delimiter detected');
  assertEqualish(detectImportDelimiter('a,b,c'), ',', 'Comma delimiter detected');
}

function assertEqualish(actual, expected, message) {
  if (typeof actual === 'string') {
    assert(actual === expected, message, actual);
  } else {
    assertClose(actual, expected, message);
  }
}

// ---------------------------------------------------------------------------
// 2. CSV / TSV importer
// ---------------------------------------------------------------------------
console.log('\n--- 2. CSV importer ---');

{
  const csv = 'Item,Width,Depth,Unit\nSofa,220,90,cm\nTable,2400,1000,mm\nChair,0.55,0.55,m';
  const r = importCsvTable(csv);
  assert(r.ok, 'CSV import succeeds');
  assertEqualish(r.sourceType, 'csv', 'Source type recorded');
  assertEqualish(r.stats.imported, 3, 'All three rows imported');
  const sofa = r.entities.find(e => e.name === 'Sofa');
  assertClose(sofa.width, 2.2, 'Sofa width converted cm→m');
  const table = r.entities.find(e => e.name === 'Table');
  assertClose(table.width, 2.4, 'Table width converted mm→m');
  const chair = r.entities.find(e => e.name === 'Chair');
  assertClose(chair.depth, 0.55, 'Chair depth stays meters');
  assertEqualish(r.stats.confidence, 'high', 'Clean import confidence high');
}

{
  const csv = 'label,length\nWall A,4.8m\nWall B,3.2m\nJunk,abc';
  const r = importCsvTable(csv);
  assert(r.ok, 'Linear schedule imports');
  assertEqualish(r.entities.length, 2, 'Numeric rows imported, junk skipped');
  assert(r.warnings.some(w => w.includes('Row 3')), 'Skipped row produces a warning');
  const wallA = r.entities.find(e => e.name === 'Wall A');
  assertClose(wallA.value, 4.8, 'Unit suffix parsed from value cell');
  assertEqualish(wallA.kind, 'measurement', 'Single-value rows become measurements');
}

{
  const tsv = 'Item\tW\tD\nDesk\t1.4\t0.7';
  const r = importCsvTable(tsv);
  assert(r.ok && r.entities[0].name === 'Desk', 'TSV (tab-delimited) imports');
  assertClose(r.entities[0].width, 1.4, 'TSV numeric parsed');

  const empty = importCsvTable('   ');
  assert(!empty.ok && empty.warnings.length > 0, 'Empty file → controlled report with warning');
  const garbage = importCsvTable('name,color\nthing,red');
  assert(!garbage.ok, 'No numeric data → not ok');
  assert(garbage.warnings.length > 0, 'Garbage rows warn');
}

// ---------------------------------------------------------------------------
// 3. DXF importer
// ---------------------------------------------------------------------------
console.log('\n--- 3. DXF importer ---');

{
  const dxf = [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$INSUNITS', '70', '4',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LINE', '8', 'WALLS', '10', '0.0', '20', '0.0', '11', '4800.0', '21', '0.0',
    '0', 'LWPOLYLINE', '8', 'ROOMS', '90', '4', '10', '0.0', '20', '0.0', '10', '3600.0', '20', '0.0', '10', '3600.0', '20', '3400.0', '10', '0.0', '20', '3400.0',
    '0', 'TEXT', '8', 'LABELS', '10', '100.0', '20', '200.0', '40', '20.0', '1', 'Bedroom',
    '0', 'CIRCLE', '8', 'COLS', '10', '500.0', '20', '500.0', '40', '150.0',
    '0', 'ENDSEC', '0', 'EOF'
  ].join('\n');
  const r = importDxf(dxf);
  assert(r.ok, 'DXF import succeeds');
  assertEqualish(r.stats.units, 'mm', '$INSUNITS=4 (mm) honored');
  assertEqualish(r.stats.imported, 4, 'LINE + LWPOLYLINE + TEXT + CIRCLE imported');
  const line = r.entities.find(e => e.kind === 'line');
  assertClose(line.x2, 4.8, 'LINE endpoint converted mm→m');
  const poly = r.entities.find(e => e.kind === 'polyline');
  assertEqualish(poly.points.length, 4, 'LWPOLYLINE vertices captured');
  assertClose(poly.points[2][0], 3.6, 'Polyline vertex converted');
  const label = r.entities.find(e => e.kind === 'label');
  assertEqualish(label.name, 'Bedroom', 'TEXT label preserved');
  assert(!r.warnings.some(w => w.includes('No $INSUNITS')), 'No missing-units warning when header present');
}

{
  const dxfNoUnits = '0\nSECTION\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n10\n0\n20\n0\n11\n1\n21\n1\n0\nENDSEC';
  const r = importDxf(dxfNoUnits);
  assert(r.ok, 'DXF without header still imports');
  assert(r.warnings.some(w => w.includes('$INSUNITS')), 'Missing $INSUNITS warns about scale verification');

  const binaryGibberish = importDxf('MZ\x00\x01binary-not-dxf');
  assert(!binaryGibberish.ok, 'Binary junk → controlled failure');
  assert(binaryGibberish.warnings.length > 0, 'Junk produces a warning');
}

// ---------------------------------------------------------------------------
// 4. SVG importer (injected minimal parser)
// ---------------------------------------------------------------------------
console.log('\n--- 4. SVG importer ---');

function makeSvgParser(svgText) {
  // Tiny querySelectorAll/attr mock over the specific test SVGs
  const lines = [...svgText.matchAll(/<line ([^>]+)>/g)].map(m => attrs(m[1]));
  const rects = [...svgText.matchAll(/<rect ([^>]+)>/g)].map(m => attrs(m[1]));
  const polys = [...svgText.matchAll(/<(polyline|polygon) ([^>]+)>/g)].map(m => ({ tag: m[1], a: attrs(m[2]) }));
  const circles = [...svgText.matchAll(/<circle ([^>]+)>/g)].map(m => attrs(m[1]));
  const texts = [...svgText.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => ({ textContent: m[1], getAttribute: () => null }));

  function attrs(s) {
    const obj = { getAttribute: name => { const m2 = s.match(new RegExp(`${name}="([^"]*)"`)); return m2 ? m2[1] : null; } };
    return obj;
  }

  const all = [
    ...lines.map(a => ({ tagName: 'line', ...a })),
    ...rects.map(a => ({ tagName: 'rect', ...a })),
    ...polys.map(p => ({ tagName: p.tag, ...p.a })),
    ...circles.map(a => ({ tagName: 'circle', ...a })),
    ...texts.map(t => ({ tagName: 'text', textContent: t.textContent, getAttribute: t.getAttribute }))
  ];

  return {
    parseFromString() {
      return {
        querySelector: () => (svgText.includes('<svg') ? { querySelectorAll: () => all } : null),
        querySelectorAll: () => all
      };
    }
  };
}

{
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="480" height="340" data-name="Living"/>
    <line x1="0" y1="0" x2="480" y2="0"/>
    <polyline points="0,0 100,50 200,100"/>
    <polygon points="0,0 10,0 10,10"/>
    <circle cx="50" cy="50" r="25"/>
    <text x="10" y="20">Bedroom</text>
  </svg>`;
  const r = importSvg(svg, { parser: makeSvgParser(svg) });
  assert(r.ok, 'SVG import succeeds');
  assertEqualish(r.stats.imported, 6, 'rect + line + polyline + polygon + circle + text');
  const rect = r.entities.find(e => e.kind === 'room');
  assertClose(rect.width, 480, 'Rect imported with px→m 1:1 disclosure');
  assertEqualish(rect.name, 'Living', 'data-name becomes room name');
  const label = r.entities.find(e => e.kind === 'label');
  assertEqualish(label.name, 'Bedroom', 'Text label captured');
  assert(r.warnings.some(w => w.includes('1:1')), 'Scale disclosure warning present');
}

{
  const bad = importSvg('<html><body>not svg</body></html>', { parser: makeSvgParser('<html>') });
  assert(!bad.ok, 'Non-SVG input → controlled failure');
  const empty = importSvg('', { parser: makeSvgParser('') });
  assert(!empty.ok && empty.warnings.length > 0, 'Empty input warns');
}

// ---------------------------------------------------------------------------
// 5. Format detection + dispatch + report formatting
// ---------------------------------------------------------------------------
console.log('\n--- 5. Detection + dispatch ---');

{
  assertEqualish(detectImportFormat('<?xml version="1.0"?><svg>'), 'svg', 'SVG detected from XML prolog');
  assertEqualish(detectImportFormat('0\nSECTION\n2\nENTITIES\nAcDbEntity'), 'dxf', 'DXF detected from SECTION markers');
  assertEqualish(detectImportFormat('Item,Width\nSofa,220'), 'csv', 'Default detection → csv');

  const unsupported = importSource('<pdf>nope</pdf>', 'pdf');
  assert(!unsupported.ok && unsupported.warnings[0].includes('Unsupported'), 'Unsupported format → honest refusal');

  const fmt = formatImportReport({
    sourceType: 'dxf',
    stats: { found: 10, imported: 8, units: 'mm', confidence: 'medium' },
    warnings: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
  });
  assert(fmt.includes('8 of 10'), 'Report counts entities');
  assert(fmt.includes('NEEDS') === false && fmt.includes('mm'), 'Report carries units');
  assert(fmt.includes('Warnings (7)'), 'Report counts warnings');
  assert(fmt.includes('… and 2 more'), 'Warning list capped with a tail note');
}

// ---------------------------------------------------------------------------
// 6. Project context scoping
// ---------------------------------------------------------------------------
console.log('\n--- 6. Project context scoping ---');

{
  const bedroom = createRoom({ name: 'Bedroom', x: 0, y: 0, width: 3.6, depth: 3.4 });
  const kitchen = createRoom({ name: 'Kitchen', x: 5, y: 0, width: 4.0, depth: 3.0 });
  const wall = createWall({ name: 'North Wall', x1: 0, y1: 0, x2: 9, y2: 0 });
  const bed = placeFurniture({ wCm: 160, dCm: 200, x: 0.2, y: 0.2, name: 'Bed' });
  const stove = placeFurniture({ wCm: 60, dCm: 60, x: 5.2, y: 0.2, name: 'Stove' });
  const project = {
    metadata: { name: 'Villa Study', description: 'Courtyard concept' },
    site: { location: 'North slope', areaM2: 200 },
    measurements: [{ label: 'Bedroom width', value: 3.6, unit: 'm', status: 'Verified' }],
    decisions: [{ kind: 'concept', name: 'Courtyard' }],
    notes: [{ title: 'Referenced idea', body: 'Split-level scheme' }]
  };
  const entities = [bedroom, kitchen, wall, bed, stove];

  const full = buildScopedFactsPack({ project, planEntities: entities, request: {} });
  assert(full.text.includes('Bedroom') && full.text.includes('Kitchen'), 'Unscoped pack includes all rooms');
  assert(full.text.includes('3.6 × 3.4'), 'Room dims in the pack text');
  assert(full.factChecks.some(f => f.label.includes('Bedroom') && f.value === 12.24), 'Bedroom area fact check (12.24 m²)');
  assert(full.text.includes('Courtyard'), 'Decisions carried');

  // Scoped: a bedroom question drops kitchen furniture
  const scoped = buildScopedFactsPack({ project, planEntities: entities, request: { scopeHint: 'bedroom' } });
  assert(scoped.data.rooms.length === 1 && scoped.data.rooms[0].name === 'Bedroom', 'Scope hint narrows rooms');
  assert(!scoped.text.includes('Stove'), 'Out-of-scope furniture excluded');
  assert(scoped.dropped.length > 0, 'Dropped items are disclosed');
  assert(scoped.text.includes('CONTEXT REDUCED'), 'Reduction is disclosed in the text');

  // Unknown hint keeps everything
  const unknown = buildScopedFactsPack({ project, planEntities: entities, request: { scopeHint: 'balcony' } });
  assert(unknown.data.rooms.length === 2, 'Non-matching hint keeps all rooms');

  // Malformed inputs do not crash (P14 contract)
  const hard = buildScopedFactsPack({ project: null, planEntities: [null, 'x', {}], request: { scopeHint: 42 } });
  assert(Array.isArray(hard.factChecks), 'Garbage input tolerates');
}

{
  // Global furniture cap discloses
  const many = [];
  for (let i = 0; i < 50; i++) {
    many.push(placeFurniture({ wCm: 50, dCm: 50, x: i * 0.1, y: 0, name: `Piece ${i}` }));
  }
  const scope = selectProjectScope({ project: {}, planEntities: many, request: {} });
  assertEqualish(scope.furniture.length, 40, 'Global furniture cap applied');
  assert(scope.dropped.some(d => d.includes('10 furniture')), 'Cap drop disclosed');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
