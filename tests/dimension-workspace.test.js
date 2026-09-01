/**
 * Architecture Helping Hand - Dimension Workspace Core Model Tests
 * Verification of entry creation, scaling calculations, unit formatting, totals, CRUD & persistence.
 */

import {
  createDimensionEntry,
  updateDimensionEntry,
  duplicateDimensionEntry,
  formatMeasurementValue,
  calculateEntryValues,
  calculateWorkspaceTotals,
  formatWorkspaceForClipboard,
  createDefaultWorkspace,
  serializeWorkspace,
  deserializeWorkspace,
  WORKSPACE_STORAGE_KEY,
  DEFAULT_WORKSPACE_SCALE,
  DEFAULT_DISPLAY_UNIT,
  SUPPORTED_DISPLAY_UNITS
} from '../src/core/dimension-workspace.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertClose(actual, expected, tolerance = 0.0001, message = '') {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message} (expected ~${expected}, got ${actual}, diff ${diff})`);
  }
}

export function runDimensionWorkspaceTests() {
  console.log('--- Running Dimension Workspace Tests ---');

  // 1. Creation & Parsing
  console.log('1. Entry Creation & Parsing:');
  {
    const e1 = createDimensionEntry({ name: 'Wall A', rawInput: '2.4m', notes: 'North' }, 'mm');
    assert(e1.isValid === true, 'Parses 2.4m as valid entry');
    assertClose(e1.realMeters, 2.4, 0.0001, '2.4m converts to 2.4 meters');
    assert(e1.parsedUnit === 'm', 'Detects "m" unit');
    assert(e1.name === 'Wall A', 'Retains item name');
    assert(e1.notes === 'North', 'Retains notes');
    assert(e1.enabled === true, 'Enabled by default');

    const e2 = createDimensionEntry({ name: 'Door', rawInput: '900', defaultUnit: 'mm' }, 'mm');
    assert(e2.isValid === true, 'Parses 900 with default mm unit');
    assertClose(e2.realMeters, 0.9, 0.0001, '900mm converts to 0.9 meters');
    assert(e2.parsedUnit === 'mm', 'Uses fallback mm unit');

    const e3 = createDimensionEntry({ name: 'Imperial Beam', rawInput: "7' 10\"", defaultUnit: 'mm' });
    assert(e3.isValid === true, 'Parses architectural 7\' 10"');
    assertClose(e3.realMeters, 94 * 0.0254, 0.001, '7\' 10" equals 94 inches in meters');

    const e4 = createDimensionEntry({ name: 'Fractional Stud', rawInput: '3 1/2in' });
    assert(e4.isValid === true, 'Parses 3 1/2in fraction');
    assertClose(e4.realMeters, 3.5 * 0.0254, 0.001, '3 1/2in equals 3.5 inches in meters');

    const empty = createDimensionEntry({ rawInput: '' });
    assert(empty.isValid === false, 'Empty raw input is flagged invalid');
    assert(empty.realMeters === null, 'Empty raw input has null meters');
    assert(empty.errorMessage !== null, 'Empty raw input has error message');

    const invalid = createDimensionEntry({ rawInput: 'abc123xyz' });
    assert(invalid.isValid === false, 'Nonsense input is flagged invalid');
    assert(invalid.realMeters === null, 'Invalid entry has null meters');
  }

  // 2. Updates & Duplication
  console.log('2. Updates & Duplication:');
  {
    const orig = createDimensionEntry({ name: 'Partition', rawInput: '1500mm', notes: 'Initial' });
    const updated = updateDimensionEntry(orig, { rawInput: '3000mm', notes: 'Revised length' });
    assert(updated.id === orig.id, 'Maintains same ID on update');
    assertClose(updated.realMeters, 3.0, 0.001, 'Re-evaluates measurement to 3.0 meters');
    assert(updated.notes === 'Revised length', 'Updates notes');

    const dup = duplicateDimensionEntry(orig);
    assert(dup.id !== orig.id, 'Generates new unique ID on duplicate');
    assert(dup.name === 'Partition (Copy)', 'Appends (Copy) suffix');
    assertClose(dup.realMeters, 1.5, 0.001, 'Preserves dimension value');
  }

  // 3. Measurement Formatting
  console.log('3. Display Unit Formatting:');
  {
    const meters = 2.4; // 2400 mm
    assert(formatMeasurementValue(meters, 'mm') === '2,400 mm', 'Formats 2.4m as 2,400 mm');
    assert(formatMeasurementValue(meters, 'cm') === '240 cm', 'Formats 2.4m as 240 cm');
    assert(formatMeasurementValue(meters, 'm') === '2.4 m', 'Formats 2.4m as 2.4 m');
    assert(formatMeasurementValue(meters, 'in') === '94.488 in', 'Formats 2.4m as inches');
    assert(formatMeasurementValue(meters, 'ft') === '7.874 ft', 'Formats 2.4m as decimal feet');
    assert(formatMeasurementValue(meters, 'ft_in').includes('7\''), 'Formats 2.4m as architectural feet-inches');
    assert(formatMeasurementValue(null, 'mm') === '---', 'Handles null measurement');
    assert(formatMeasurementValue(-5, 'mm') === '---', 'Handles negative measurement');
  }

  // 4. Scaling Calculations
  console.log('4. Live Scaling Calculations:');
  {
    const entry = createDimensionEntry({ name: 'Wall', rawInput: '2400mm' });
    
    // Scale 1:50 -> 2400mm / 50 = 48mm drawing length
    const calc50 = calculateEntryValues(entry, 50, 'mm');
    assert(calc50.isValid === true, 'Calculates 1:50 valid');
    assert(calc50.realFormatted === '2,400 mm', 'Real formatted is 2,400 mm');
    assert(calc50.drawingFormatted === '48 mm', 'Drawing formatted @ 1:50 is 48 mm');
    assertClose(calc50.drawingMeters, 0.048, 0.0001, 'Drawing meters is 0.048m');

    // Scale 1:100 -> 2400mm / 100 = 24mm drawing length
    const calc100 = calculateEntryValues(entry, 100, 'mm');
    assert(calc100.drawingFormatted === '24 mm', 'Drawing formatted @ 1:100 is 24 mm');

    // Scale 1:20 -> 2400mm / 20 = 120mm drawing length
    const calc20 = calculateEntryValues(entry, 20, 'mm');
    assert(calc20.drawingFormatted === '120 mm', 'Drawing formatted @ 1:20 is 120 mm');
  }

  // 5. Workspace Totals Computation
  console.log('5. Workspace Totals:');
  {
    const entries = [
      createDimensionEntry({ name: 'Wall 1', rawInput: '3m' }),       // 3000 mm
      createDimensionEntry({ name: 'Wall 2', rawInput: '2m' }),       // 2000 mm
      createDimensionEntry({ name: 'Wall 3', rawInput: '1.5m', enabled: false }), // 1500 mm (Disabled)
      createDimensionEntry({ name: 'Invalid Wall', rawInput: 'xyz' })  // Invalid
    ];

    // Scale 1:50, display unit 'mm'
    // Enabled valid sum: 3m + 2m = 5m = 5000mm.
    // Drawing @ 1:50: 5000mm / 50 = 100mm.
    const totals = calculateWorkspaceTotals(entries, 50, 'mm');
    assert(totals.totalCount === 4, 'Counts 4 total entries');
    assert(totals.enabledCount === 3, 'Counts 3 enabled entries');
    assert(totals.validCount === 2, 'Counts 2 valid enabled entries');
    assert(totals.invalidCount === 1, 'Counts 1 invalid enabled entry');
    assertClose(totals.totalRealMeters, 5.0, 0.0001, 'Total real meters equals 5.0m');
    assertClose(totals.totalDrawingMeters, 0.1, 0.0001, 'Total drawing meters @ 1:50 equals 0.1m (100mm)');
    assert(totals.totalRealFormatted === '5,000 mm', 'Total real formatted is 5,000 mm');
    assert(totals.totalDrawingFormatted === '100 mm', 'Total drawing formatted is 100 mm');
  }

  // 6. Clipboard Formatting
  console.log('6. Clipboard Schedule Formatting:');
  {
    const entries = [
      createDimensionEntry({ name: 'Wall A', rawInput: '4.8m', notes: 'North' }),
      createDimensionEntry({ name: 'Door', rawInput: '900mm', notes: 'Clear' })
    ];

    const bothText = formatWorkspaceForClipboard(entries, 50, 'mm', 'both');
    assert(bothText.includes('DIMENSION SCHEDULE'), 'Contains schedule header');
    assert(bothText.includes('Wall A: 4,800 mm ➔ Drawing: 96 mm'), 'Formats Wall A real and drawing');
    assert(bothText.includes('TOTAL REAL: 5,700 mm'), 'Contains real total');
    assert(bothText.includes('TOTAL DRAWING @ 1:50: 114 mm'), 'Contains drawing total');

    const tsvText = formatWorkspaceForClipboard(entries, 50, 'mm', 'tsv');
    assert(tsvText.includes('Item Name\tRaw Input\tReal Dimension'), 'Contains TSV tab headers');
    assert(tsvText.includes('Wall A\t4.8m\t4,800 mm\t96 mm\tNorth\tActive'), 'Contains TSV row');
  }

  // 7. Serialization & Corrupted Storage Recovery
  console.log('7. Persistence & Resilience:');
  {
    const defaultWs = createDefaultWorkspace();
    assert(defaultWs.scaleRatio === 50, 'Default workspace has 1:50 scale');
    assert(defaultWs.displayUnit === 'mm', 'Default workspace has mm display unit');
    assert(defaultWs.entries.length === 4, 'Default workspace has 4 sample entries');

    const serialized = serializeWorkspace(defaultWs);
    assert(typeof serialized === 'string' && serialized.startsWith('{'), 'Serializes to valid JSON string');

    const deserialized = deserializeWorkspace(serialized);
    assert(deserialized.scaleRatio === 50, 'Restores scale ratio');
    assert(deserialized.displayUnit === 'mm', 'Restores display unit');
    assert(deserialized.entries.length === 4, 'Restores 4 entries');
    assert(deserialized.entries[0].realMeters === 4.8, 'Restores first entry value');

    // Resilience tests
    const fromNull = deserializeWorkspace(null);
    assert(fromNull.entries.length === 4, 'Recovers defaults from null');

    const fromCorrupted = deserializeWorkspace('{invalid-json!#%');
    assert(fromCorrupted.entries.length === 4, 'Recovers defaults from corrupted JSON');

    const fromEmptyObj = deserializeWorkspace({});
    assert(fromEmptyObj.scaleRatio === 50, 'Recovers scale from empty object');
  }

  console.log(`\nDimension Workspace Tests Summary: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('dimension-workspace.test.js')) {
  const result = runDimensionWorkspaceTests();
  process.exit(result.failed > 0 ? 1 : 0);
}
