/**
 * Test Suite for CAD Clipboard & Drafting Handoff Engine
 * Tests pure formatting functions, presets, precision, units, escaping,
 * zero and negative preservation, filtering, and cross-mode exports.
 */

import {
  CAD_FORMAT_PRESETS,
  escapeTSV,
  escapeCSV,
  formatCadValue,
  formatCadValues,
  formatCadWorkspace,
  formatCadChain,
  formatCadMultiScale,
  formatCadExpression,
  formatManualCadInput,
  getCadFormatSummary
} from '../src/core/cad-clipboard.js';

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
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
  }
}

console.log('🧪 Running tests/cad-clipboard.test.js...\n');

// 1. Presets and Escaping
console.log('--- 1. Application Presets & Sanitization ---');
assert(CAD_FORMAT_PRESETS.generic !== undefined, 'CAD_FORMAT_PRESETS includes generic preset');
assert(CAD_FORMAT_PRESETS.autocad !== undefined, 'CAD_FORMAT_PRESETS includes autocad preset');
assert(CAD_FORMAT_PRESETS.rhino !== undefined, 'CAD_FORMAT_PRESETS includes rhino preset');
assert(CAD_FORMAT_PRESETS.sketchup !== undefined, 'CAD_FORMAT_PRESETS includes sketchup preset');
assert(CAD_FORMAT_PRESETS.spreadsheet !== undefined, 'CAD_FORMAT_PRESETS includes spreadsheet preset');
assert(CAD_FORMAT_PRESETS.csv !== undefined, 'CAD_FORMAT_PRESETS includes csv preset');

assertEqual(escapeTSV('Wall A\tDoor 1\nNotes'), 'Wall A Door 1 Notes', 'escapeTSV replaces tabs and newlines');
assertEqual(escapeCSV('Wall A, Opening "1"'), '"Wall A, Opening ""1"""', 'escapeCSV encloses in quotes and escapes internal quotes');
assertEqual(escapeCSV('SimpleName'), 'SimpleName', 'escapeCSV leaves clean string unchanged');

// 2. formatCadValue: Numbers, Precision, Suffixes, and Units
console.log('\n--- 2. formatCadValue Precision & Unit Conversion ---');
assertEqual(formatCadValue(2.4, { unit: 'mm', precision: 2, suffix: 'none' }), '2400.00', '2.4m formatted as 2400.00 mm');
assertEqual(formatCadValue(2.4, { unit: 'mm', precision: 0, suffix: 'none' }), '2400', '2.4m with 0 precision is 2400');
assertEqual(formatCadValue(2.4, { unit: 'cm', precision: 1, suffix: 'symbol' }), '240.0 cm', '2.4m as 240.0 cm with symbol suffix');
assertEqual(formatCadValue(2.4, { unit: 'm', precision: 3, suffix: 'full' }), '2.400 Meters (m)', '2.4m as 2.400 Meters (m) with full suffix');
assertEqual(formatCadValue(2.4, { unit: 'in', precision: 2, suffix: 'none' }), '94.49', '2.4m in inches with precision 2');

// 3. Zero and Negative Preservation
console.log('\n--- 3. Zero & Negative Value Integrity ---');
assertEqual(formatCadValue(0, { unit: 'mm', precision: 2, suffix: 'none' }), '0.00', 'Legitimate 0 value is preserved as 0.00');
assertEqual(formatCadValue(0, { unit: 'mm', precision: 0, suffix: 'none' }), '0', 'Legitimate 0 value with 0 precision is 0');
assertEqual(formatCadValue(-0.3, { unit: 'mm', precision: 2, suffix: 'none' }), '-300.00', 'Negative value -0.3m is preserved as -300.00');
assertEqual(formatCadValue(-1.5, { unit: 'm', precision: 1, suffix: 'symbol' }), '-1.5 m', 'Negative value with symbol preserved');

// 4. Decimal Point Enforcement
console.log('\n--- 4. Decimal Point Enforcement ---');
const dotCheck = formatCadValue(48.12345, { unit: 'mm', precision: 2, suffix: 'none' });
assert(dotCheck.includes('.') && !dotCheck.includes(','), 'Dot decimal separator is enforced for CAD compliance');
assertEqual(dotCheck, '48123.45', '48.12345m converted to mm with 2 decimals');

// 5. formatCadValues: Array Formatting & Delimiters
console.log('\n--- 5. formatCadValues Multi-Value Formatting ---');
const testValues = [2.4, 1.8, 0.9, 1.5]; // 2400, 1800, 900, 1500 mm
assertEqual(
  formatCadValues(testValues, { unit: 'mm', precision: 0, delimiter: 'space' }),
  '2400 1800 900 1500',
  'Space-delimited raw CAD numbers'
);
assertEqual(
  formatCadValues(testValues, { unit: 'mm', precision: 0, delimiter: 'newline' }),
  '2400\n1800\n900\n1500',
  'Newline-delimited raw CAD numbers'
);
assertEqual(
  formatCadValues(testValues, { unit: 'mm', precision: 0, delimiter: 'comma' }),
  '2400, 1800, 900, 1500',
  'Comma-delimited CAD numbers'
);
assertEqual(
  formatCadValues(testValues, { unit: 'mm', precision: 0, suffix: 'symbol', delimiter: 'pipe' }),
  '2400 mm | 1800 mm | 900 mm | 1500 mm',
  'Pipe-delimited values with unit symbols'
);

// 6. formatCadWorkspace: Filtering & Outputs
console.log('\n--- 6. formatCadWorkspace Integration ---');
const mockWorkspace = {
  scaleRatio: 50,
  displayUnit: 'mm',
  entries: [
    { id: 'w1', name: 'Wall Pier A', realMeters: 4.8, dimensionType: 'segment', enabled: true },
    { id: 'w2', name: 'Window Opening', realMeters: 3.2, dimensionType: 'segment', enabled: true },
    { id: 'w3', name: 'Door Clearance', realMeters: 0.9, dimensionType: 'reference', enabled: true },
    { id: 'w4', name: 'Joint Allowance', realMeters: 0.05, dimensionType: 'allowance', enabled: true },
    { id: 'w5', name: 'Disabled Item', realMeters: 1.0, dimensionType: 'segment', enabled: false }
  ]
};

// 6.1 Generic Real Numbers
const wsReal = formatCadWorkspace(mockWorkspace, { targetValue: 'real', unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(wsReal.count, 4, 'Workspace active enabled entries count is 4');
assertEqual(wsReal.text, '4800 3200 900 50', 'Workspace real values space-delimited');

// 6.2 Drawing Values @ 1:50
const wsDrawing = formatCadWorkspace(mockWorkspace, { targetValue: 'drawing', scaleRatio: 50, unit: 'mm', precision: 1, delimiter: 'space' });
assertEqual(wsDrawing.text, '96.0 64.0 18.0 1.0', 'Workspace drawing values scaled at 1:50');

// 6.3 Filtering by Scope
const wsSegmentsOnly = formatCadWorkspace(mockWorkspace, { filterScope: 'segments', unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(wsSegmentsOnly.count, 2, 'Segments only filter returns 2 entries');
assertEqual(wsSegmentsOnly.text, '4800 3200', 'Segments only text matches Wall Pier and Window');

const wsRefsOnly = formatCadWorkspace(mockWorkspace, { filterScope: 'references', unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(wsRefsOnly.count, 1, 'References only filter returns 1 entry');
assertEqual(wsRefsOnly.text, '900', 'References text matches Door Clearance');

const wsSelectedOnly = formatCadWorkspace(mockWorkspace, { filterScope: 'selected', selectedIds: new Set(['w1', 'w3']), unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(wsSelectedOnly.count, 2, 'Selected only filter returns 2 items');
assertEqual(wsSelectedOnly.text, '4800 900', 'Selected text matches w1 and w3');

// 6.4 Spreadsheet TSV Schedule
const wsTsv = formatCadWorkspace(mockWorkspace, { format: 'spreadsheet', unit: 'mm', precision: 2 });
assert(wsTsv.text.startsWith('#\tName\tReal (mm)\tDrawing @ 1:50 (mm)\tType\tNotes'), 'TSV contains standard column headers');
assert(wsTsv.text.includes('Wall Pier A\t4800.00\t96.00\tSEGMENT'), 'TSV contains formatted entry row');

// 6.5 CSV Schedule
const wsCsv = formatCadWorkspace(mockWorkspace, { format: 'csv', unit: 'mm', precision: 2 });
assert(wsCsv.text.startsWith('#,Name,Real (mm),Drawing @ 1:50 (mm),Type,Notes'), 'CSV contains standard column headers');
assert(wsCsv.text.includes('Wall Pier A,4800.00,96.00,SEGMENT'), 'CSV contains formatted entry row');

// 7. formatCadChain: Continuous Strings & Cumulative
console.log('\n--- 7. formatCadChain Cumulative Coordinates & Segments ---');
const mockChainCalc = {
  scaleRatio: 50,
  defaultUnit: 'mm',
  segments: [
    { id: 'c1', name: 'Bay 1', realMeters: 1.2, startMeters: 0, endMeters: 1.2, drawingMeters: 0.024, dimensionType: 'segment', enabled: true, isValid: true },
    { id: 'c2', name: 'Bay 2', realMeters: 1.8, startMeters: 1.2, endMeters: 3.0, drawingMeters: 0.036, dimensionType: 'segment', enabled: true, isValid: true },
    { id: 'c3', name: 'Door', realMeters: 0.9, startMeters: 3.0, endMeters: 3.9, drawingMeters: 0.018, dimensionType: 'segment', enabled: true, isValid: true },
    { id: 'c4', name: 'Bay 3', realMeters: 1.5, startMeters: 3.9, endMeters: 5.4, drawingMeters: 0.030, dimensionType: 'segment', enabled: true, isValid: true }
  ]
};

// 7.1 Segment Lengths
const chainSegs = formatCadChain(mockChainCalc, { chainOutputMode: 'segments', unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(chainSegs.text, '1200 1800 900 1500', 'Chain segment lengths space-delimited');

// 7.2 Cumulative Positions
const chainCum = formatCadChain(mockChainCalc, { chainOutputMode: 'cumulative', unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(chainCum.text, '0 1200 3000 3900 5400', 'Chain cumulative running coordinates match 0 1200 3000 3900 5400');

// 7.3 Tabular Schedule
const chainTable = formatCadChain(mockChainCalc, { chainOutputMode: 'table', unit: 'mm', precision: 0 });
assert(chainTable.text.includes('Bay 1\t0\t1200\t1200\t24\tSEGMENT'), 'Chain table TSV contains start/end/length columns');

// 8. formatCadMultiScale: Multi-Scale Drawing Dimensions
console.log('\n--- 8. formatCadMultiScale Export ---');
const mockMultiScaleCalc = {
  input: { displayUnit: 'mm' },
  results: [
    { ratio: 20, label: '1:20', drawingMeters: 0.12, formatted: '120 mm', fitsPaper: true, paperSize: 'A3' },
    { ratio: 50, label: '1:50', drawingMeters: 0.048, formatted: '48 mm', fitsPaper: true, paperSize: 'A4' },
    { ratio: 100, label: '1:100', drawingMeters: 0.024, formatted: '24 mm', fitsPaper: true, paperSize: 'A4' }
  ]
};

const msDrawingVals = formatCadMultiScale(mockMultiScaleCalc, { unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(msDrawingVals.text, '120 48 24', 'Multi-Scale drawing values exported as 120 48 24');

const msTsv = formatCadMultiScale(mockMultiScaleCalc, { format: 'spreadsheet', unit: 'mm', precision: 1 });
assert(msTsv.text.includes('1:20\t1:20\t120.0\tFits A3'), 'Multi-Scale TSV contains scale breakdown');

// 9. formatCadExpression: Math Expression Export
console.log('\n--- 9. formatCadExpression Export ---');
const mockExprCalc = {
  isValid: true,
  canonicalMeters: 4.5,
  scaleRatio: 50,
  displayUnit: 'mm'
};

const exprReal = formatCadExpression(mockExprCalc, { targetValue: 'real', unit: 'mm', precision: 0 });
assertEqual(exprReal.text, '4500', 'Expression real value is 4500');

const exprDraw = formatCadExpression(mockExprCalc, { targetValue: 'drawing', scaleRatio: 50, unit: 'mm', precision: 1 });
assertEqual(exprDraw.text, '90.0', 'Expression drawing value @ 1:50 is 90.0');

// 10. formatManualCadInput: Ad-hoc Number Parsing
console.log('\n--- 10. formatManualCadInput Parsing ---');
const manualOut = formatManualCadInput('2400, 1800 900 + 1500', { unit: 'mm', precision: 0, delimiter: 'space' });
assertEqual(manualOut.count, 4, 'Manual input parsed 4 numbers');
assertEqual(manualOut.text, '2400 1800 900 1500', 'Manual input formatted cleanly');

// 11. getCadFormatSummary: Metadata Confirmation Tag
console.log('\n--- 11. getCadFormatSummary Metadata ---');
const summary = getCadFormatSummary(4, { targetValue: 'real', unit: 'mm', precision: 2, suffix: 'none' });
assertEqual(summary, '4 values • Real-world (mm) • 2 decimals • No suffix', 'Summary string generated accurately');

console.log(`\n=================================================================`);
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log(`=================================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
