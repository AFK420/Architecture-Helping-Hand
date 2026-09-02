/**
 * Architecture Helping Hand - CAD Application Helpers Test Suite
 * Part 9: Daily Architect Toolkit — Rhino / AutoCAD / SketchUp Handoff
 *
 * Covers:
 *   - Target profiles (Rhino / AutoCAD / SketchUp / Generic)
 *   - Copy formats (raw / formatted / drawing / schedule / TSV / CSV)
 *   - All handoff sources with REAL engine outputs (no mocks):
 *     Workspace, Expression, Multi-Scale, Chain, Batch, Quick Dimension, Manual
 *   - Selection scopes (selected / segments / references / allowances / all)
 *   - Order preservation (chain order, batch order)
 *   - Precision handling
 *   - Invalid target/mode/source controlled errors
 *   - Exact clipboard payload text
 *
 * NOTE: Chain and Multi-Scale tests use real calculateChain() /
 * compareAcrossScales() outputs. This matters: mocks using the `realMeters`
 * alias previously masked a field-name mismatch that made Mode 11 emit
 * zeros for real chains (fixed in cad-clipboard.js).
 */

import {
  CAD_TARGET_PROFILES,
  CAD_TARGET_IDS,
  CAD_COPY_MODES,
  CAD_COPY_MODE_IDS,
  CAD_SOURCE_IDS,
  CAD_HANDOFF_STORAGE_KEY,
  buildCadHandoffPayload,
  getCadHandoffSummary,
  resolveCadHandoffOptions,
  validateCadHandoffSelection,
  normalizeChainLayout
} from '../src/core/cad-targets.js';
import { createDimensionChain, createChainSegment, calculateChain } from '../src/core/dimension-chains.js';
import { createDimensionEntry, createGroup } from '../src/core/dimension-workspace.js';
import { evaluateQuickDimension } from '../src/core/quick-dimension.js';
import { evaluateExpressionSafe } from '../src/core/dimension-expression.js';
import { compareAcrossScales } from '../src/core/multi-scale.js';
import { parseBatchInput, convertBatch } from '../src/core/batch-cad.js';
import { formatCadChain, formatCadMultiScale } from '../src/core/cad-clipboard.js';

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

console.log('🧪 Running tests/cad-targets.test.js...');

// ---------------------------------------------------------------------------
// Fixtures — built from REAL engine outputs
// ---------------------------------------------------------------------------

function makeCalculatedChain() {
  const chain = createDimensionChain({ name: 'North Wall', defaultUnit: 'mm', scaleRatio: 50 });
  chain.segments = [
    createChainSegment({ name: 'Bay 1', rawInput: '1200', dimensionType: 'segment' }),
    createChainSegment({ name: 'Window', rawInput: '1800', dimensionType: 'segment' }),
    createChainSegment({ name: 'Door', rawInput: '900', dimensionType: 'segment' }),
    createChainSegment({ name: 'Bay 4', rawInput: '1500', dimensionType: 'segment' })
  ];
  return calculateChain(chain);
}

function makeWorkspace() {
  return {
    scaleRatio: 50,
    displayUnit: 'mm',
    entries: [
      createDimensionEntry({ name: 'Wall A', rawInput: '4800mm', dimensionType: 'segment' }, 'mm'),
      createDimensionEntry({ name: 'Wall B', rawInput: '3200mm', dimensionType: 'segment' }, 'mm'),
      createDimensionEntry({ name: 'Door', rawInput: '900mm', dimensionType: 'reference' }, 'mm')
    ],
    groups: []
  };
}

const calculatedChain = makeCalculatedChain();
const workspace = makeWorkspace();
const quickResult = evaluateQuickDimension('2400mm');
const expressionResult = evaluateExpressionSafe('1200 + 900 * 2');
const multiScaleResult = compareAcrossScales('2400mm');
const batchParsed = parseBatchInput('Wall A = 4800\nWall B = 3200\nDoor = 900');
const batchResult = convertBatch(batchParsed.rows, {
  mode: 'real_to_drawing', sourceUnit: 'mm', targetUnit: 'mm', targetScale: 50, precision: 0
});

// ---------------------------------------------------------------------------
// 1. Target Profiles
// ---------------------------------------------------------------------------
console.log('\n--- 1. Target Profiles ---');

assertEqual(CAD_TARGET_IDS.length, 4, 'Exactly four CAD target profiles defined');
['generic', 'rhino', 'autocad', 'sketchup'].forEach(id => {
  const p = CAD_TARGET_PROFILES[id];
  assert(p, `Profile "${id}" exists`);
  if (p) {
    assertEqual(p.id, id, `Profile "${id}" has matching id field`);
    assert(typeof p.label === 'string' && p.label.length > 0, `Profile "${id}" has a label`);
    assert(typeof p.description === 'string' && p.description.length > 0, `Profile "${id}" has a description`);
    assert(typeof p.preferredUnit === 'string', `Profile "${id}" has preferredUnit`);
    assert(typeof p.preferredPrecision === 'number', `Profile "${id}" has preferredPrecision`);
    assert(['none', 'symbol', 'full'].includes(p.preferredSuffix), `Profile "${id}" has valid preferredSuffix`);
  }
});

assertEqual(CAD_TARGET_PROFILES.rhino.preferredSuffix, 'none', 'Rhino profile uses plain numbers (no suffix)');
assertEqual(CAD_TARGET_PROFILES.autocad.preferredSuffix, 'none', 'AutoCAD profile uses plain numbers (no suffix)');
assertEqual(CAD_TARGET_PROFILES.sketchup.preferredSuffix, 'symbol', 'SketchUp profile carries unit symbols (VCB style)');

// ---------------------------------------------------------------------------
// 2. Copy Modes & Selection Validation
// ---------------------------------------------------------------------------
console.log('\n--- 2. Copy Modes & Selection Validation ---');

assert(CAD_COPY_MODE_IDS.includes('raw'), 'Copy mode "raw" defined');
assert(CAD_COPY_MODE_IDS.includes('formatted'), 'Copy mode "formatted" defined');
assert(CAD_COPY_MODE_IDS.includes('drawing'), 'Copy mode "drawing" defined');
assert(CAD_COPY_MODE_IDS.includes('schedule'), 'Copy mode "schedule" defined');
assert(CAD_COPY_MODE_IDS.includes('tsv'), 'Copy mode "tsv" defined');
assert(CAD_COPY_MODE_IDS.includes('csv'), 'Copy mode "csv" defined');

assert(CAD_SOURCE_IDS.includes('workspace'), 'Source "workspace" supported');
assert(CAD_SOURCE_IDS.includes('expression'), 'Source "expression" supported');
assert(CAD_SOURCE_IDS.includes('multiscale'), 'Source "multiscale" supported');
assert(CAD_SOURCE_IDS.includes('chain'), 'Source "chain" supported');
assert(CAD_SOURCE_IDS.includes('batch'), 'Source "batch" supported');
assert(CAD_SOURCE_IDS.includes('quick'), 'Source "quick" supported');
assert(CAD_SOURCE_IDS.includes('manual'), 'Source "manual" supported');

{
  const v = validateCadHandoffSelection('rhino', 'raw', 'chain');
  assert(v.ok, 'Valid selection passes validation');
  const badTarget = validateCadHandoffSelection('revit', 'raw', 'chain');
  assert(!badTarget.ok && /revit/.test(badTarget.error), 'Unknown target returns controlled error naming the target');
  const badMode = validateCadHandoffSelection('rhino', 'yaml', 'chain');
  assert(!badMode.ok && /yaml/.test(badMode.error), 'Unknown copy mode returns controlled error naming the mode');
  const badSource = validateCadHandoffSelection('rhino', 'raw', 'photoshop');
  assert(!badSource.ok && /photoshop/.test(badSource.error), 'Unknown source returns controlled error naming the source');
}

assertEqual(normalizeChainLayout('cumulative'), 'cumulative', 'normalizeChainLayout passes valid layouts');
assertEqual(normalizeChainLayout('bogus'), 'segments', 'normalizeChainLayout falls back to segments for invalid input');

{
  const opts = resolveCadHandoffOptions('sketchup', 'raw', {});
  assertEqual(opts.unit, 'mm', 'resolveCadHandoffOptions falls back to profile preferred unit');
  assertEqual(opts.suffix, 'none', 'raw mode forces no suffix regardless of profile');
  const optsFormatted = resolveCadHandoffOptions('sketchup', 'formatted', {});
  assertEqual(optsFormatted.suffix, 'symbol', 'formatted mode applies target profile suffix');
  const optsOverride = resolveCadHandoffOptions('sketchup', 'formatted', { unit: 'm', precision: 3 });
  assertEqual(optsOverride.unit, 'm', 'explicit unit override wins over profile');
  assertEqual(optsOverride.precision, 3, 'explicit precision override wins over profile');
}

// ---------------------------------------------------------------------------
// 3. Rhino Helper Payloads
// ---------------------------------------------------------------------------
console.log('\n--- 3. Rhino Helper ---');

{
  const r = buildCadHandoffPayload('chain', { result: calculatedChain, chainLayout: 'segments' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '1200\n1800\n900\n1500', 'Rhino chain segments: clean newline numbers, order preserved');
  assertEqual(r.count, 4, 'Rhino chain payload counts 4 segments');
  assertEqual(r.targetLabel, 'Rhino', 'Rhino payload reports its target label');
}

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'all' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '4800\n3200\n900', 'Rhino workspace raw: one number per entry');
}

{
  const r = buildCadHandoffPayload('expression', { result: expressionResult }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '3000', 'Rhino expression single value');
}

{
  const r = buildCadHandoffPayload('quick', { result: quickResult }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '2400', 'Rhino quick dimension value');
}

// ---------------------------------------------------------------------------
// 4. AutoCAD Helper Payloads
// ---------------------------------------------------------------------------
console.log('\n--- 4. AutoCAD Helper ---');

{
  const r = buildCadHandoffPayload('chain', { result: calculatedChain, chainLayout: 'cumulative' }, { targetId: 'autocad', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '0\n1200\n3000\n3900\n5400', 'AutoCAD chain cumulative positions (0 start, running sum)');
}

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'all' }, { targetId: 'autocad', modeId: 'schedule', precision: 0 });
  const lines = r.text.split('\n');
  assert(lines[0].includes('Name'), 'AutoCAD schedule has header row with Name column');
  assert(lines[1].includes('Wall A') && lines[1].includes('4800'), 'AutoCAD schedule row: named dimension with value');
  assert(lines[2].includes('Wall B') && lines[2].includes('3200'), 'AutoCAD schedule preserves workspace order');
}

// ---------------------------------------------------------------------------
// 5. SketchUp Helper Payloads
// ---------------------------------------------------------------------------
console.log('\n--- 5. SketchUp Helper ---');

{
  const r = buildCadHandoffPayload('chain', { result: calculatedChain }, { targetId: 'sketchup', modeId: 'formatted', precision: 1 });
  const lines = r.text.split('\n');
  assertEqual(lines[0], '1200.0 mm', 'SketchUp formatted chain: value with unit symbol for VCB');
}

{
  const r = buildCadHandoffPayload('quick', { result: quickResult }, { targetId: 'sketchup', modeId: 'formatted', precision: 0 });
  assertEqual(r.text, '2400 mm', 'SketchUp quick dimension formatted with suffix');
}

// ---------------------------------------------------------------------------
// 6. Copy Formats
// ---------------------------------------------------------------------------
console.log('\n--- 6. Copy Formats ---');

{
  const r = buildCadHandoffPayload('chain', { result: calculatedChain, chainLayout: 'pipe' }, { targetId: 'generic', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '1200 | 1800 | 900 | 1500', 'Pipe summary format joins values with " | "');
}

{
  const r = buildCadHandoffPayload('chain', { result: calculatedChain, chainLayout: 'schedule' }, { targetId: 'autocad', modeId: 'schedule', precision: 0 });
  const lines = r.text.split('\n');
  assert(lines[0].includes('Start') && lines[0].includes('End') && lines[0].includes('Length'), 'Chain schedule header has start/end/length columns');
  const row1 = lines[1].split('\t');
  assertEqual(row1[2], '0', 'Chain schedule row 1 starts at 0');
  assertEqual(row1[3], '1200', 'Chain schedule row 1 ends at 1200');
  assertEqual(row1[4], '1200', 'Chain schedule row 1 length 1200');
  const row4 = lines[4].split('\t');
  assertEqual(row4[2], '3900', 'Chain schedule row 4 starts at cumulative 3900');
}

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'all' }, { targetId: 'generic', modeId: 'tsv', precision: 0 });
  assert(r.text.split('\n')[0].split('\t').length >= 4, 'Workspace TSV schedule has multiple columns');
  const r2 = buildCadHandoffPayload('workspace', { workspace, scope: 'all' }, { targetId: 'generic', modeId: 'csv', precision: 0 });
  assert(r2.text.split('\n')[0].includes(','), 'Workspace CSV schedule is comma-separated');
}

{
  // Drawing values: real 4800mm at 1:50 → 96mm drawing
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'all' }, { targetId: 'autocad', modeId: 'drawing', precision: 0, scaleRatio: 50 });
  assertEqual(r.text, '96\n64\n18', 'Drawing mode converts real values to scaled paper values');
}

// ---------------------------------------------------------------------------
// 7. Selection Scopes
// ---------------------------------------------------------------------------
console.log('\n--- 7. Selection Scopes ---');

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'selected', selectedIds: new Set([workspace.entries[0].id]) }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '4800', 'Workspace "selected" scope returns only selected entries');
}

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'references' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '900', 'Workspace "references" scope returns REF entries only');
}

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'segments' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '4800\n3200', 'Workspace "segments" scope returns SEG entries only');
}

{
  const r = buildCadHandoffPayload('workspace', { workspace, scope: 'allowances' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assert(r.empty && r.text === '', 'Workspace "allowances" scope with no allowances yields empty payload');
}

{
  const selectedIds = new Set([batchResult.rows[0].id, batchResult.rows[2].id]);
  const r = buildCadHandoffPayload('batch', { result: batchResult, selectedOnly: true, selectedIds }, { targetId: 'autocad', modeId: 'drawing', precision: 1, scaleRatio: 50 });
  assertEqual(r.text.split('\n').length, 2, 'Batch "selected" scope returns exactly the selected valid rows');
}

// ---------------------------------------------------------------------------
// 8. Order Preservation
// ---------------------------------------------------------------------------
console.log('\n--- 8. Order Preservation ---');

{
  const reversed = makeCalculatedChain();
  reversed.segments = [...reversed.segments].reverse();
  const r = buildCadHandoffPayload('chain', { result: reversed, chainLayout: 'segments' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.text, '1500\n900\n1800\n1200', 'Chain output order follows chain segment order exactly');
}

{
  const r = buildCadHandoffPayload('batch', { result: batchResult }, { targetId: 'autocad', modeId: 'drawing', precision: 1 });
  assertEqual(r.text, '96.0\n64.0\n18.0', 'Batch output order follows batch row order exactly');
}

// ---------------------------------------------------------------------------
// 9. Batch Semantics
// ---------------------------------------------------------------------------
console.log('\n--- 9. Batch Source ---');

{
  const r = buildCadHandoffPayload('batch', { result: batchResult }, { targetId: 'autocad', modeId: 'schedule', precision: 0 });
  const lines = r.text.split('\n');
  assert(lines[1].includes('Wall A'), 'Batch schedule preserves row names');
  assert(lines[1].split('\t')[3] === 'REFERENCE', 'Batch schedule preserves semantic role tags');
}

{
  const invalidBatch = convertBatch(
    parseBatchInput('Wall A = 4800\nnot a dimension!!!\nDoor = 900').rows,
    { mode: 'real_to_drawing', sourceUnit: 'mm', targetUnit: 'mm', targetScale: 50, precision: 0 }
  );
  const r = buildCadHandoffPayload('batch', { result: invalidBatch }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(r.count, 2, 'Batch handoff silently excludes invalid rows (valid-only)');
  assertEqual(r.text, '96\n18', 'Batch valid-only payload values at drawing scale 1:50');
}

// ---------------------------------------------------------------------------
// 10. Multi-Scale Source
// ---------------------------------------------------------------------------
console.log('\n--- 10. Multi-Scale Source ---');

{
  const r = buildCadHandoffPayload('multiscale', { result: multiScaleResult }, { targetId: 'rhino', modeId: 'raw', precision: 1 });
  const lines = r.text.split('\n');
  assert(lines.length === multiScaleResult.scales.length, 'Multi-Scale payload has one value per compared scale');
  // 2400mm real at 1:10 → 240mm drawing
  assertEqual(lines[0], '240.0', 'Multi-Scale first scale (1:10) drawing value correct');
}

{
  const r = buildCadHandoffPayload('multiscale', { result: multiScaleResult }, { targetId: 'generic', modeId: 'tsv', precision: 1 });
  assert(r.text.split('\n')[0].includes('Scale'), 'Multi-Scale TSV has Scale header column');
}

// ---------------------------------------------------------------------------
// 11. Internal Precision Handling
// ---------------------------------------------------------------------------
console.log('\n--- 11. Precision ---');

{
  const r = buildCadHandoffPayload('expression', { result: evaluateExpressionSafe('1000mm/3') }, { targetId: 'rhino', modeId: 'raw', precision: 4 });
  assertEqual(r.text, '333.3333', 'Precision 4 preserves fractional detail (length expression, Rhino default 3dp overridden)');
}

{
  const r = buildCadHandoffPayload('chain', { result: calculatedChain, chainLayout: 'segments' }, { targetId: 'rhino', modeId: 'raw' });
  const lines = r.text.split('\n');
  assertEqual(lines[0], '1200.000', 'Rhino profile default precision is 3 decimals');
}

// ---------------------------------------------------------------------------
// 12. Empty & Controlled Failure States
// ---------------------------------------------------------------------------
console.log('\n--- 12. Empty & Failure States ---');

{
  const r = buildCadHandoffPayload('chain', { result: null }, { targetId: 'rhino', modeId: 'raw' });
  assert(r.empty && r.text === '' && r.count === 0, 'Chain source with no result yields empty payload (no throw)');
  const r2 = buildCadHandoffPayload('expression', { result: { isValid: false } }, { targetId: 'rhino', modeId: 'raw' });
  assert(r2.empty, 'Invalid expression result yields empty payload');
  const r3 = buildCadHandoffPayload('quick', { result: { valid: false } }, { targetId: 'rhino', modeId: 'raw' });
  assert(r3.empty, 'Invalid quick result yields empty payload');
  const r4 = buildCadHandoffPayload('manual', { rawText: '' }, { targetId: 'rhino', modeId: 'raw' });
  assert(r4.empty, 'Empty manual input yields empty payload');
  const r5 = buildCadHandoffPayload('manual', { rawText: 'no numbers here' }, { targetId: 'rhino', modeId: 'raw' });
  assert(r5.empty, 'Manual input with no numbers yields empty payload');
}

{
  let threw = false;
  try {
    buildCadHandoffPayload('chain', { result: calculatedChain }, { targetId: 'not-a-target', modeId: 'raw' });
  } catch (e) {
    threw = true;
    assert(/Unknown CAD target/.test(e.message), 'Unknown target throws explicit Error (programmer contract)');
  }
  assert(threw, 'Unknown target actually throws');
}

// ---------------------------------------------------------------------------
// 13. Regression Pin: field-name mismatch fix (real engines, not mocks)
// ---------------------------------------------------------------------------
console.log('\n--- 13. Regression: real engine field compatibility ---');

{
  // This bug made Mode 11 chain source emit "0 0 0" for real chains.
  const r = formatCadChain(makeCalculatedChain(), { chainOutputMode: 'segments', unit: 'mm', precision: 0, delimiter: 'space' });
  assertEqual(r.text, '1200 1800 900 1500', 'formatCadChain works against REAL calculateChain output (lengthMeters)');
}

{
  const r = formatCadChain(makeCalculatedChain(), { chainOutputMode: 'cumulative', unit: 'mm', precision: 0, delimiter: 'space' });
  assertEqual(r.text, '0 1200 3000 3900 5400', 'formatCadChain cumulative works against REAL calculateChain output');
}

{
  const r = formatCadMultiScale(multiScaleResult, { unit: 'mm', precision: 1, delimiter: 'newline' });
  assert(r.count === multiScaleResult.scales.length && r.text.length > 0, 'formatCadMultiScale works against REAL compareAcrossScales output (.scales)');
}

{
  // Mock-style chains (realMeters alias) must keep working — backward compat
  const mockChain = {
    scaleRatio: 50,
    defaultUnit: 'mm',
    segments: [{ id: 'm1', name: 'X', realMeters: 2.4, drawingMeters: 0.048, startMeters: 0, endMeters: 2.4, dimensionType: 'segment', enabled: true, isValid: true }]
  };
  const r = formatCadChain(mockChain, { chainOutputMode: 'segments', unit: 'mm', precision: 0, delimiter: 'space' });
  assertEqual(r.text, '2400', 'formatCadChain retains backward compatibility with realMeters-alias chains');
}

// ---------------------------------------------------------------------------
// 14. Summary & Storage Key
// ---------------------------------------------------------------------------
console.log('\n--- 14. Summary & Metadata ---');

{
  const payload = buildCadHandoffPayload('chain', { result: calculatedChain, chainLayout: 'segments' }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  const summary = getCadHandoffSummary(payload);
  assert(/4 values/.test(summary) && /Rhino/.test(summary), `Summary line names count and target ("${summary}")`);
  assertEqual(CAD_HANDOFF_STORAGE_KEY, 'archiscale_cad_handoff_prefs', 'Handoff prefs storage key is stable');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
