/**
 * Architecture Helping Hand - Quick Dimension Strip Test Suite
 * Phase 2.5: Daily Architect Toolkit — Part 8: Quick Dimension Strip
 */

import {
  DEFAULT_QUICK_SCALES,
  DEFAULT_QUICK_PREFS,
  QUICK_DIM_STORAGE_KEY,
  getArchitecturalContext,
  evaluateQuickDimension,
  formatQuickDimensionClipboard,
  createQuickHandoffPayload
} from '../src/core/quick-dimension.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

function assertClose(actual, expected, tolerance = 1e-4, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${expected}, Received: ${actual}, Diff: ${diff})`);
  }
}

console.log('\n--- 1. Direct Dimension Parsing & Unit Equivalents ---');
{
  // 1.1 Bare numeric input (defaults to mm)
  const res1 = evaluateQuickDimension('2400', { selectedScale: 50, displayUnit: 'mm' });
  assert(res1.valid, 'Parses bare number 2400 as valid');
  assertClose(res1.canonicalMeters, 2.4, 1e-4, 'Canonical meters is 2.4 m');
  assertEqual(res1.realFormatted, '2400.00 mm', 'Formats real dimension with symbol');
  assertClose(res1.selectedDrawingValue, 48, 1e-4, 'Calculates 1:50 drawing size as 48 mm');

  // 1.2 Explicit meters
  const res2 = evaluateQuickDimension('2.4m', { selectedScale: 50, displayUnit: 'm', precision: 3 });
  assert(res2.valid, 'Parses 2.4m as valid');
  assertClose(res2.canonicalMeters, 2.4, 1e-4, 'Canonical meters is 2.4 m');
  assertEqual(res2.realFormatted, '2.400 m', 'Formats in meters');

  // 1.3 Architectural Feet-Inches
  const res3 = evaluateQuickDimension('7\' 6"', { selectedScale: 50, displayUnit: 'mm' });
  assert(res3.valid, 'Parses 7\' 6" as valid');
  assertClose(res3.canonicalMeters, 2.286, 1e-3, 'Canonical meters is 2.286 m');

  // 1.4 Fractional Inches
  const res4 = evaluateQuickDimension('3 1/2in', { selectedScale: 1, displayUnit: 'in' });
  assert(res4.valid, 'Parses 3 1/2in fraction');
  assertClose(res4.canonicalMeters, 0.0889, 1e-4, 'Canonical meters is 0.0889 m');

  // 1.5 Common Unit Equivalents list
  const eq = res1.commonEquivalents;
  assertEqual(eq.length, 5, 'Contains 5 common unit equivalents');
  assertClose(eq.find(e => e.unit === 'cm').value, 240, 1e-4, 'CM equivalent is 240');
  assertClose(eq.find(e => e.unit === 'm').value, 2.4, 1e-4, 'M equivalent is 2.4');
}

console.log('\n--- 2. Inline Dimension Expression Evaluation ---');
{
  // 2.1 Multi-operand addition
  const exp1 = evaluateQuickDimension('2400 + 900 + 1200', { selectedScale: 50, displayUnit: 'mm' });
  assert(exp1.valid, 'Evaluates multi-operand expression');
  assertEqual(exp1.isExpression, true, 'Flags isExpression as true');
  assertClose(exp1.canonicalMeters, 4.5, 1e-4, 'Canonical meters is 4.5 m (4500 mm)');
  assertClose(exp1.selectedDrawingValue, 90, 1e-4, 'Drawing size @ 1:50 is 90 mm');

  // 2.2 Mixed unit arithmetic
  const exp2 = evaluateQuickDimension('5.4m - 1200mm', { selectedScale: 100, displayUnit: 'mm' });
  assert(exp2.valid, 'Evaluates mixed unit subtraction');
  assertClose(exp2.canonicalMeters, 4.2, 1e-4, 'Canonical meters is 4.2 m');
  assertClose(exp2.selectedDrawingValue, 42, 1e-4, 'Drawing size @ 1:100 is 42 mm');

  // 2.3 Parenthesized division expression
  const exp3 = evaluateQuickDimension('(2.4m + 900mm) / 3', { selectedScale: 50, displayUnit: 'mm' });
  assert(exp3.valid, 'Evaluates parenthesized division');
  assertClose(exp3.canonicalMeters, 1.1, 1e-4, 'Canonical meters is 1.1 m (1100 mm)');
}

console.log('\n--- 3. Multi-Scale Drawing Size Matrix ---');
{
  const res = evaluateQuickDimension('2400mm', {
    selectedScale: 50,
    scales: [10, 20, 25, 50, 75, 100, 125, 200, 250, 500],
    drawingUnit: 'mm'
  });

  const matrix = res.scaleMatrix;
  assertEqual(matrix.length, 10, 'Scale matrix contains all 10 standard architectural scales');

  const s10 = matrix.find(m => m.scale === 10);
  assertClose(s10.drawingValue, 240, 1e-4, '1:10 drawing size is 240 mm');

  const s20 = matrix.find(m => m.scale === 20);
  assertClose(s20.drawingValue, 120, 1e-4, '1:20 drawing size is 120 mm');

  const s25 = matrix.find(m => m.scale === 25);
  assertClose(s25.drawingValue, 96, 1e-4, '1:25 drawing size is 96 mm');

  const s50 = matrix.find(m => m.scale === 50);
  assertClose(s50.drawingValue, 48, 1e-4, '1:50 drawing size is 48 mm');
  assert(s50.isSelected, '1:50 scale is marked as isSelected');

  const s75 = matrix.find(m => m.scale === 75);
  assertClose(s75.drawingValue, 32, 1e-4, '1:75 drawing size is 32 mm');

  const s100 = matrix.find(m => m.scale === 100);
  assertClose(s100.drawingValue, 24, 1e-4, '1:100 drawing size is 24 mm');

  const s200 = matrix.find(m => m.scale === 200);
  assertClose(s200.drawingValue, 12, 1e-4, '1:200 drawing size is 12 mm');

  const s500 = matrix.find(m => m.scale === 500);
  assertClose(s500.drawingValue, 4.8, 1e-4, '1:500 drawing size is 4.8 mm');
}

console.log('\n--- 4. Reverse Mode: Drawing @ Scale ➔ Real-World Dimension ---');
{
  const rev = evaluateQuickDimension('48mm', {
    selectedScale: 50,
    displayUnit: 'mm',
    mode: 'drawing_to_real'
  });

  assert(rev.valid, 'Parses in drawing_to_real mode');
  assertClose(rev.canonicalMeters, 2.4, 1e-4, '48mm @ 1:50 expands to 2.4m real world');
  assertEqual(rev.realFormatted, '2400.00 mm', 'Real formatted is 2400.00 mm');
}

console.log('\n--- 5. Architectural Contextual Readouts ---');
{
  // 5.1 Door width range (900mm)
  const ctx1 = getArchitecturalContext(0.9);
  assert(ctx1.hasReference, '900 mm matches architectural reference');
  assert(ctx1.matches.some(m => m.label.includes('Door')), 'Identifies door clearance reference');
  assert(ctx1.disclaimer !== null, 'Includes verification disclaimer');

  // 5.2 Ceiling height range (2400mm)
  const ctx2 = getArchitecturalContext(2.4);
  assert(ctx2.hasReference, '2400 mm matches ceiling height reference');
  assert(ctx2.matches.some(m => m.label.includes('Ceiling')), 'Identifies ceiling height reference');

  // 5.3 Unmatched arbitrary dimension (e.g. 13.729m)
  const ctx3 = getArchitecturalContext(13.729);
  assertEqual(ctx3.hasReference, false, 'Unmatched dimension has no reference');
  assertEqual(ctx3.message, 'No stored reference for this dimension.', 'Returns explicit no-reference message');
}

console.log('\n--- 6. Zero, Negative & Extreme Boundary Handling ---');
{
  // 6.1 Zero dimension
  const zeroRes = evaluateQuickDimension('0', { selectedScale: 50, displayUnit: 'mm' });
  assert(zeroRes.valid, 'Zero dimension is valid');
  assertClose(zeroRes.canonicalMeters, 0, 1e-4, 'Zero canonical meters is 0');
  assertEqual(zeroRes.realFormatted, '0.00 mm', 'Zero formatted as 0.00 mm');

  // 6.2 Negative dimension
  const negRes = evaluateQuickDimension('-300mm', { selectedScale: 50, displayUnit: 'mm' });
  assert(negRes.valid, 'Negative dimension -300mm is valid');
  assertClose(negRes.canonicalMeters, -0.3, 1e-4, 'Negative canonical meters is -0.3');
  assertClose(negRes.selectedDrawingValue, -6, 1e-4, 'Negative drawing size is -6 mm');

  // 6.3 Extreme large value (1,000,000 m)
  const largeRes = evaluateQuickDimension('1000000m', { selectedScale: 1000, displayUnit: 'm' });
  assert(largeRes.valid, 'Handles 1,000,000 m without overflow');
  assertClose(largeRes.canonicalMeters, 1e6, 1e-4, 'Canonical meters is 1e6');

  // 6.4 Invalid syntax
  const invRes = evaluateQuickDimension('invalid_text_xyz', { selectedScale: 50 });
  assertEqual(invRes.valid, false, 'Invalid text flagged as invalid');
  assertEqual(invRes.status, 'INVALID', 'Status is INVALID');
  assert(invRes.error !== null, 'Has explanatory error message');
}

console.log('\n--- 7. Quick Copy Formats ---');
{
  const evalRes = evaluateQuickDimension('2400mm', { selectedScale: 50, displayUnit: 'mm', drawingUnit: 'mm' });

  assertEqual(formatQuickDimensionClipboard(evalRes, 'real'), '2400.00 mm', 'Copies real dimension');
  assertEqual(formatQuickDimensionClipboard(evalRes, 'drawing'), '48.00 mm', 'Copies selected drawing dimension');
  assertEqual(formatQuickDimensionClipboard(evalRes, 'cad_numbers'), '2400.00 48.00', 'Copies clean space-delimited CAD numbers');
  assert(formatQuickDimensionClipboard(evalRes, 'all_scales').includes('1:50: 48.00 mm'), 'Copies multi-scale matrix text');
  assert(formatQuickDimensionClipboard(evalRes, 'tsv_row').includes('2400.00 mm\t1:50\t48.00 mm'), 'Copies formatted TSV schedule row');
}

console.log('\n--- 8. Downstream Tool Handoff Payloads ---');
{
  const evalRes = evaluateQuickDimension('2400mm', { selectedScale: 50, displayUnit: 'mm' });

  // 8.1 Workspace handoff
  const wsPayload = createQuickHandoffPayload(evalRes, 'workspace', { name: 'Living Room Span' });
  assertEqual(wsPayload.entry.name, 'Living Room Span', 'Created Dimension Workspace entry');
  assertClose(wsPayload.entry.realMeters, 2.4, 1e-4, 'Entry real meters is 2.4');

  // 8.2 Multi-Scale handoff
  const msPayload = createQuickHandoffPayload(evalRes, 'multiscale');
  assertEqual(msPayload.dimensionInput, '2400.00 mm', 'Prepares Multi-Scale input');

  // 8.3 Dimension Chain handoff
  const chainPayload = createQuickHandoffPayload(evalRes, 'chain', { name: 'Bay 1' });
  assertEqual(chainPayload.segment.name, 'Bay 1', 'Created Dimension Chain segment');
  assertEqual(chainPayload.segment.rawInput, '2400.00 mm', 'Segment rawInput is 2400.00 mm');

  // 8.4 CAD Clipboard handoff
  const cadPayload = createQuickHandoffPayload(evalRes, 'cad_clipboard');
  assertEqual(cadPayload.manualInput, '2400.00 48.00', 'Prepares CAD Clipboard manual input');

  // 8.5 Journal History handoff
  const histPayload = createQuickHandoffPayload(evalRes, 'journal');
  assertEqual(histPayload.toolMode, 'quick_dim', 'Prepares Journal history entry');
  assertClose(histPayload.metadata.canonicalMeters, 2.4, 1e-4, 'History metadata contains canonical meters');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Quick Dimension Strip unit tests passed!\n');
}
