/**
 * Architecture Helping Hand - Batch CAD Conversion Test Suite
 * Phase 2.5: Daily Architect Toolkit — Part 7: Batch CAD Conversion
 */

import {
  BATCH_PRESETS,
  BATCH_STORAGE_KEY,
  detectBatchDelimiter,
  parseBatchRow,
  parseBatchInput,
  convertBatchRow,
  convertBatch,
  filterBatchRows,
  formatBatchResults,
  convertBatchToWorkspaceGroup,
  convertBatchToDimensionChain
} from '../src/core/batch-cad.js';

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

console.log('\n--- 1. Delimiter Auto-Detection ---');
{
  assertEqual(detectBatchDelimiter('2400\n1800\n900\n1500'), 'newline', 'Detects newline delimiter');
  assertEqual(detectBatchDelimiter('2400, 1800, 900, 1500'), 'comma', 'Detects comma delimiter');
  assertEqual(detectBatchDelimiter('Wall A\t4800\nWall B\t3200'), 'tab', 'Detects tab delimiter');
  assertEqual(detectBatchDelimiter('2400; 1800; 900; 1500'), 'semicolon', 'Detects semicolon delimiter');
  assertEqual(detectBatchDelimiter(''), 'newline', 'Defaults to newline on empty input');
}

console.log('\n--- 2. Single Row Parsing & Semantic Types ---');
{
  const row1 = parseBatchRow('2400', 0, { defaultUnit: 'mm' });
  assert(row1.valid, 'Parses bare number 2400');
  assertEqual(row1.parsedValue, 2400, 'Parsed value is 2400');
  assertEqual(row1.sourceUnit, 'mm', 'Source unit is default mm');
  assertClose(row1.canonicalMeters, 2.4, 1e-4, 'Canonical meters is 2.4');
  assertEqual(row1.name, 'Dimension 1', 'Generates fallback name Dimension 1');
  assertEqual(row1.semanticRole, 'reference', 'Default semantic role is reference');

  const row2 = parseBatchRow('Wall A = 4800mm', 1);
  assert(row2.valid, 'Parses named row "Wall A = 4800mm"');
  assertEqual(row2.name, 'Wall A', 'Extracted name is Wall A');
  assertEqual(row2.parsedValue, 4800, 'Parsed value is 4800');
  assertEqual(row2.sourceUnit, 'mm', 'Explicit unit mm recognized');

  const row3 = parseBatchRow('SEG Corridor 1: 3.2m', 2);
  assert(row3.valid, 'Parses tagged row "SEG Corridor 1: 3.2m"');
  assertEqual(row3.semanticRole, 'segment', 'Role tagged as segment');
  assertEqual(row3.name, 'Corridor 1', 'Extracted name Corridor 1');
  assertClose(row3.canonicalMeters, 3.2, 1e-4, 'Canonical meters is 3.2');

  const row4 = parseBatchRow('[ALW] Joint Gap: 25mm', 3);
  assert(row4.valid, 'Parses bracketed tag "[ALW] Joint Gap: 25mm"');
  assertEqual(row4.semanticRole, 'allowance', 'Role tagged as allowance');
  assertClose(row4.canonicalMeters, 0.025, 1e-4, 'Canonical meters is 0.025');
}

console.log('\n--- 3. Inline Expression Evaluation ---');
{
  const exprRow1 = parseBatchRow('2400 + 900 + 1200', 0, { defaultUnit: 'mm', defaultScale: 50 });
  assert(exprRow1.valid, 'Evaluates multi-operand addition expression');
  assertEqual(exprRow1.isExpression, true, 'Flags row as expression');
  assertEqual(exprRow1.parsedValue, 4500, 'Parsed expression result is 4500 mm');
  assertClose(exprRow1.canonicalMeters, 4.5, 1e-4, 'Canonical meters is 4.5');

  const exprRow2 = parseBatchRow('Wall Span = 5.4m - 1200mm', 1);
  assert(exprRow2.valid, 'Evaluates mixed-unit subtraction expression');
  assertEqual(exprRow2.name, 'Wall Span', 'Preserves row name Wall Span');
  assertClose(exprRow2.canonicalMeters, 4.2, 1e-4, 'Canonical meters is 4.2 (5.4m - 1.2m)');

  const exprRow3 = parseBatchRow('Riser Step = 250mm * 8', 2);
  assert(exprRow3.valid, 'Evaluates multiplication expression');
  assertClose(exprRow3.canonicalMeters, 2.0, 1e-4, 'Canonical meters is 2.0');
}

console.log('\n--- 4. Full Batch Input Extraction & Mixed Formats ---');
{
  const rawPasted = `
    Wall North = 4800mm
    SEG Wall South = 3200mm
    Window 1 = 1800 + 300
    ALW Tolerance = 20mm
    Door Entrance = 900
    2.4m
    7' 6"
  `;

  const parsed = parseBatchInput(rawPasted, { defaultUnit: 'mm' });
  assertEqual(parsed.rows.length, 7, 'Extracted 7 non-empty batch rows');
  assert(parsed.rows.every(r => r.valid), 'All 7 parsed rows are valid');
  assertEqual(parsed.rows[1].semanticRole, 'segment', 'Row 2 is segment');
  assertEqual(parsed.rows[2].parsedValue, 2100, 'Row 3 expression evaluated to 2100');
  assertEqual(parsed.rows[3].semanticRole, 'allowance', 'Row 4 is allowance');
  assertClose(parsed.rows[5].canonicalMeters, 2.4, 1e-4, 'Row 6 2.4m canonical meters is 2.4');
  assertClose(parsed.rows[6].canonicalMeters, 2.286, 1e-3, 'Row 7 7\' 6" canonical meters is 2.286');
}

console.log('\n--- 5. Conversion Modes: Real ➔ Drawing, Unit ➔ Unit, Scale ➔ Scale ---');
{
  const batch = parseBatchInput('2400\n1800\n900\n1500', { defaultUnit: 'mm' });

  // 5.1 Real -> Drawing @ 1:50
  const conv1 = convertBatch(batch.rows, BATCH_PRESETS.real_to_1_50_mm);
  assertEqual(conv1.summary.totalRows, 4, 'Summary total rows is 4');
  assertEqual(conv1.summary.validRows, 4, 'Summary valid rows is 4');
  assertClose(conv1.rows[0].targetValue, 48, 1e-4, '2400mm @ 1:50 = 48mm drawing');
  assertClose(conv1.rows[1].targetValue, 36, 1e-4, '1800mm @ 1:50 = 36mm drawing');
  assertClose(conv1.rows[2].targetValue, 18, 1e-4, '900mm @ 1:50 = 18mm drawing');
  assertClose(conv1.rows[3].targetValue, 30, 1e-4, '1500mm @ 1:50 = 30mm drawing');

  // 5.2 Unit -> Unit: mm -> m
  const conv2 = convertBatch(batch.rows, BATCH_PRESETS.mm_to_m);
  assertClose(conv2.rows[0].targetValue, 2.4, 1e-4, '2400mm ➔ 2.4m');
  assertClose(conv2.rows[1].targetValue, 1.8, 1e-4, '1800mm ➔ 1.8m');

  // 5.3 Scale -> Scale: 1:50 (48mm) -> 1:100 (24mm)
  const scaleBatch = parseBatchInput('48\n36\n18\n30', { defaultUnit: 'mm' });
  const conv3 = convertBatch(scaleBatch.rows, BATCH_PRESETS.scale_1_50_to_1_100);
  assertClose(conv3.rows[0].targetValue, 24, 1e-4, '48mm @ 1:50 rescaled to 1:100 is 24mm');
  assertClose(conv3.rows[1].targetValue, 18, 1e-4, '36mm @ 1:50 rescaled to 1:100 is 18mm');
}

console.log('\n--- 6. Invalid Row Isolation & Non-Destructive Retention ---');
{
  const mixedRaw = 'Wall A = 4800mm\nBroken xyz123\nWindow = 1800mm\nInvalid / 0';
  const parsed = parseBatchInput(mixedRaw, { defaultUnit: 'mm' });
  const converted = convertBatch(parsed.rows, BATCH_PRESETS.real_to_1_50_mm);

  assertEqual(converted.summary.totalRows, 4, 'Total rows is 4');
  assertEqual(converted.summary.validRows, 2, 'Valid rows is 2');
  assertEqual(converted.summary.invalidRows, 2, 'Invalid rows is 2');

  assertEqual(converted.rows[0].status, 'CONVERTED', 'Row 1 is CONVERTED');
  assertEqual(converted.rows[1].status, 'INVALID', 'Row 2 is INVALID');
  assert(converted.rows[1].error.length > 0, 'Row 2 has descriptive error message');
  assertEqual(converted.rows[2].status, 'CONVERTED', 'Row 3 is CONVERTED');
  assertEqual(converted.rows[3].status, 'INVALID', 'Row 4 is INVALID');

  // Verify non-destructive retention of originalText
  assertEqual(converted.rows[1].originalText, 'Broken xyz123', 'Preserves original text on invalid row');
}

console.log('\n--- 7. Zero & Negative Value Preservation ---');
{
  const zeroNeg = parseBatchInput('0\n-300mm\n1200', { defaultUnit: 'mm' });
  const converted = convertBatch(zeroNeg.rows, BATCH_PRESETS.real_to_1_50_mm);

  assert(converted.rows[0].valid, 'Zero value is valid');
  assertClose(converted.rows[0].targetValue, 0, 1e-4, 'Zero converts to 0');
  assert(converted.rows[1].valid, 'Negative dimension -300mm is valid');
  assertClose(converted.rows[1].targetValue, -6, 1e-4, '-300mm @ 1:50 converts to -6mm');
}

console.log('\n--- 8. Filtering & Multi-Selection ---');
{
  const raw = 'SEG Pier A = 2400\nREF Baseline = 1000\nALW Gap = 50\nBroken row';
  const parsed = parseBatchInput(raw, { defaultUnit: 'mm' });
  const conv = convertBatch(parsed.rows, BATCH_PRESETS.real_to_1_50_mm);

  const valids = filterBatchRows(conv.rows, 'valid');
  assertEqual(valids.length, 3, 'Filter "valid" returns 3 rows');

  const invalids = filterBatchRows(conv.rows, 'invalid');
  assertEqual(invalids.length, 1, 'Filter "invalid" returns 1 row');

  const segs = filterBatchRows(conv.rows, 'seg');
  assertEqual(segs.length, 1, 'Filter "seg" returns 1 row');

  const selectedSet = new Set([conv.rows[0].id, conv.rows[2].id]);
  const selectedRows = filterBatchRows(conv.rows, 'selected', selectedSet);
  assertEqual(selectedRows.length, 2, 'Filter "selected" returns 2 rows');
}

console.log('\n--- 9. Clipboard & Schedule Formatting ---');
{
  const batch = parseBatchInput('Wall A = 2400\nWall B = 1800', { defaultUnit: 'mm' });
  const conv = convertBatch(batch.rows, BATCH_PRESETS.real_to_1_50_mm);

  const rawOut = formatBatchResults(conv, { format: 'raw_numbers' });
  assertEqual(rawOut, '48.00 36.00', 'Formats raw CAD numbers space-delimited');

  const tsvOut = formatBatchResults(conv, { format: 'tsv_schedule' });
  assert(tsvOut.includes('Wall A\tREF\t2400.00 mm\t48.00 mm\tCONVERTED'), 'Formats TSV schedule correctly');

  const csvOut = formatBatchResults(conv, { format: 'csv_schedule' });
  assert(csvOut.includes('1,Wall A,REF,2400.00 mm,48.00 mm,CONVERTED'), 'Formats CSV schedule correctly');
}

console.log('\n--- 10. Workspace & Dimension Chain Handoffs ---');
{
  const batch = parseBatchInput('SEG Beam 1 = 3000\nSEG Beam 2 = 2400\nALW Joint = 25', { defaultUnit: 'mm' });
  const conv = convertBatch(batch.rows, BATCH_PRESETS.real_to_1_50_mm);

  // 10.1 Workspace Handoff
  const wsPayload = convertBatchToWorkspaceGroup(conv, { groupName: 'Structural Beams' });
  assertEqual(wsPayload.group.name, 'Structural Beams', 'Created Workspace group');
  assertEqual(wsPayload.entries.length, 3, 'Created 3 workspace entries');
  assertEqual(wsPayload.entries[0].dimensionType, 'segment', 'Preserved segment role in workspace entry');

  // 10.2 Dimension Chain Handoff
  const chainPayload = convertBatchToDimensionChain(conv, { chainName: 'Beam Run' });
  assertEqual(chainPayload.name, 'Beam Run', 'Created Dimension Chain');
  assertEqual(chainPayload.segments.length, 3, 'Created 3 chain segments');
}

console.log('\n--- 11. Large Batch Performance Benchmark (1,000 Rows) ---');
{
  const lines = [];
  for (let i = 0; i < 1000; i++) {
    lines.push(`Item ${i + 1} = ${(i + 1) * 100}mm`);
  }
  const bigRaw = lines.join('\n');

  const t0 = Date.now();
  const parsed = parseBatchInput(bigRaw, { defaultUnit: 'mm' });
  const conv = convertBatch(parsed.rows, BATCH_PRESETS.real_to_1_50_mm);
  const elapsed = Date.now() - t0;

  assertEqual(conv.summary.totalRows, 1000, 'Processed 1,000 batch rows');
  assertEqual(conv.summary.validRows, 1000, 'All 1,000 batch rows valid');
  assert(elapsed < 250, `1,000 rows parsed and converted in ${elapsed}ms (< 250ms)`);
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Batch CAD unit tests passed!\n');
}
