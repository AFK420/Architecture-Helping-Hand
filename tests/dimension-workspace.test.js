/**
 * Architecture Helping Hand - Dimension Workspace Core Model Tests
 * Verification of entry creation, semantic types, natural parsing, grouping, scaling calculations, unit formatting, semantic totals, CRUD & persistence.
 */

import {
  createDimensionEntry,
  updateDimensionEntry,
  duplicateDimensionEntry,
  createGroup,
  parseQuickAddString,
  formatMeasurementValue,
  calculateEntryValues,
  calculateWorkspaceTotals,
  calculateGroupTotals,
  formatWorkspaceForClipboard,
  createDefaultWorkspace,
  serializeWorkspace,
  deserializeWorkspace,
  WORKSPACE_STORAGE_KEY,
  DEFAULT_WORKSPACE_SCALE,
  DEFAULT_DISPLAY_UNIT,
  DEFAULT_DIMENSION_TYPE,
  SUPPORTED_DISPLAY_UNITS,
  SUPPORTED_DIMENSION_TYPES
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

  // 1. Creation, Types & Parsing
  console.log('1. Entry Creation, Semantic Types & Parsing:');
  {
    // Defaults to 'reference' type
    const e1 = createDimensionEntry({ name: 'Wall A', rawInput: '2.4m', notes: 'North' }, 'mm');
    assert(e1.isValid === true, 'Parses 2.4m as valid entry');
    assertClose(e1.realMeters, 2.4, 0.0001, '2.4m converts to 2.4 meters');
    assert(e1.parsedUnit === 'm', 'Detects "m" unit');
    assert(e1.name === 'Wall A', 'Retains item name');
    assert(e1.dimensionType === 'reference', 'Defaults new entry to "reference"');
    assert(e1.notes === 'North', 'Retains notes');
    assert(e1.enabled === true, 'Enabled by default');

    // Explicit 'segment' type
    const e2 = createDimensionEntry({ name: 'Structural Bay', rawInput: '6000', dimensionType: 'segment', defaultUnit: 'mm' });
    assert(e2.isValid === true, 'Parses 6000 with default mm unit');
    assertClose(e2.realMeters, 6.0, 0.0001, '6000mm converts to 6.0 meters');
    assert(e2.dimensionType === 'segment', 'Stores explicit "segment" type');

    // Explicit 'allowance' type
    const e3 = createDimensionEntry({ name: 'Expansion Joint', rawInput: '50mm', dimensionType: 'allowance' });
    assert(e3.isValid === true, 'Parses 50mm allowance');
    assertClose(e3.realMeters, 0.05, 0.0001, '50mm converts to 0.05 meters');
    assert(e3.dimensionType === 'allowance', 'Stores explicit "allowance" type');

    // Feet-inches notation
    const e4 = createDimensionEntry({ name: 'Imperial Beam', rawInput: "7' 10\"", defaultUnit: 'mm' });
    assert(e4.isValid === true, 'Parses architectural 7\' 10"');
    assertClose(e4.realMeters, 94 * 0.0254, 0.001, '7\' 10" equals 94 inches in meters');

    // Fractional inch notation
    const e5 = createDimensionEntry({ name: 'Fractional Stud', rawInput: '3 1/2in' });
    assert(e5.isValid === true, 'Parses 3 1/2in fraction');
    assertClose(e5.realMeters, 3.5 * 0.0254, 0.001, '3 1/2in equals 3.5 inches in meters');

    // Empty and invalid input
    const empty = createDimensionEntry({ rawInput: '' });
    assert(empty.isValid === false, 'Empty raw input is flagged invalid');
    assert(empty.realMeters === null, 'Empty raw input has null meters');
    assert(empty.errorMessage !== null, 'Empty raw input has error message');

    const invalid = createDimensionEntry({ rawInput: 'abc123xyz' });
    assert(invalid.isValid === false, 'Nonsense input is flagged invalid');
    assert(invalid.realMeters === null, 'Invalid entry has null meters');

    // Strict unit check
    const invalidUnit = createDimensionEntry({ rawInput: '15.5xyz' });
    assert(invalidUnit.isValid === false, 'Strict unit validation catches unknown suffix');
  }

  // 2. Natural Quick-Add Parser
  console.log('2. Natural Quick-Add Parser:');
  {
    const q1 = parseQuickAddString('Wall A 4800', 'mm', 'reference');
    assert(q1.name === 'Wall A', 'Extracts name "Wall A"');
    assert(q1.rawInput === '4800', 'Extracts raw input "4800"');
    assert(q1.dimensionType === 'reference', 'Applies fallback type');
    assert(q1.isValid === true, 'Parses as valid');

    const q2 = parseQuickAddString('Door Opening 900mm', 'mm');
    assert(q2.name === 'Door Opening', 'Extracts multi-word name "Door Opening"');
    assert(q2.rawInput === '900mm', 'Extracts measurement "900mm"');

    const q3 = parseQuickAddString('seg Bay 1 6m', 'm');
    assert(q3.name === 'Bay 1', 'Extracts name with prefix "Bay 1"');
    assert(q3.rawInput === '6m', 'Extracts measurement "6m"');
    assert(q3.dimensionType === 'segment', 'Detects prefix "seg" type');

    const q4 = parseQuickAddString('Gap 50mm allowance', 'mm');
    assert(q4.name === 'Gap', 'Extracts name with suffix');
    assert(q4.rawInput === '50mm', 'Extracts measurement "50mm"');
    assert(q4.dimensionType === 'allowance', 'Detects suffix "allowance" type');

    const q5 = parseQuickAddString('Beam 12\'-6 1/2"', 'in');
    assert(q5.name === 'Beam', 'Extracts name for architectural notation');
    assert(q5.rawInput === '12\'-6 1/2"', 'Extracts feet-inches measurement');

    const q6 = parseQuickAddString('2400', 'mm', 'segment');
    assert(q6.name === 'Dimension', 'Defaults name to "Dimension" for bare measurement');
    assert(q6.rawInput === '2400', 'Extracts bare measurement');
  }

  // 3. Updates & Duplication
  console.log('3. Updates & Duplication:');
  {
    const orig = createDimensionEntry({ name: 'Partition', rawInput: '1500mm', dimensionType: 'reference', notes: 'Initial' });
    const updated = updateDimensionEntry(orig, { rawInput: '3000mm', dimensionType: 'segment', notes: 'Revised length' });
    assert(updated.id === orig.id, 'Maintains same ID on update');
    assertClose(updated.realMeters, 3.0, 0.001, 'Re-evaluates measurement to 3.0 meters');
    assert(updated.dimensionType === 'segment', 'Updates dimensionType');
    assert(updated.notes === 'Revised length', 'Updates notes');

    const dup = duplicateDimensionEntry(orig);
    assert(dup.id !== orig.id, 'Generates new unique ID on duplicate');
    assert(dup.name === 'Partition (Copy)', 'Appends (Copy) suffix');
    assert(dup.dimensionType === 'reference', 'Preserves dimensionType on duplicate');
    assertClose(dup.realMeters, 1.5, 0.001, 'Preserves dimension value');
  }

  // 4. Display Unit Formatting
  console.log('4. Display Unit Formatting:');
  {
    const meters = 2.4; // 2400 mm
    assert(formatMeasurementValue(meters, 'mm') === '2,400 mm', 'Formats 2.4m as 2,400 mm');
    assert(formatMeasurementValue(meters, 'cm') === '240 cm', 'Formats 2.4m as 240 cm');
    assert(formatMeasurementValue(meters, 'm') === '2.4 m', 'Formats 2.4m as 2.4 m');
    assert(formatMeasurementValue(meters, 'in') === '94.488 in', 'Formats 2.4m as inches');
    assert(formatMeasurementValue(meters, 'ft') === '7.874 ft', 'Formats 2.4m as decimal feet');
    assert(formatMeasurementValue(meters, 'ft_in').includes('7\''), 'Formats 2.4m as architectural feet-inches');
    assert(formatMeasurementValue(0, 'mm') === '0 mm', 'Handles zero measurement');
    assert(formatMeasurementValue(null, 'mm') === '---', 'Handles null measurement');
    assert(formatMeasurementValue(-5, 'mm') === '---', 'Handles negative measurement');
  }

  // 5. Scaling Calculations
  console.log('5. Live Scaling Calculations:');
  {
    const entry = createDimensionEntry({ name: 'Wall', rawInput: '2400mm', dimensionType: 'segment' });
    
    // Scale 1:50 -> 2400mm / 50 = 48mm drawing length
    const calc50 = calculateEntryValues(entry, 50, 'mm');
    assert(calc50.isValid === true, 'Calculates 1:50 valid');
    assert(calc50.realFormatted === '2,400 mm', 'Real formatted is 2,400 mm');
    assert(calc50.drawingFormatted === '48 mm', 'Drawing formatted @ 1:50 is 48 mm');
    assertClose(calc50.drawingMeters, 0.048, 0.0001, 'Drawing meters is 0.048m');
    assert(calc50.dimensionType === 'segment', 'Carries dimensionType in calc result');

    // Scale 1:100 -> 2400mm / 100 = 24mm drawing length
    const calc100 = calculateEntryValues(entry, 100, 'mm');
    assert(calc100.drawingFormatted === '24 mm', 'Drawing formatted @ 1:100 is 24 mm');

    // Scale 1:20 -> 2400mm / 20 = 120mm drawing length
    const calc20 = calculateEntryValues(entry, 20, 'mm');
    assert(calc20.drawingFormatted === '120 mm', 'Drawing formatted @ 1:20 is 120 mm');
  }

  // 6. Semantic Totals (Segments, Allowances, Combined, References)
  console.log('6. Semantic Workspace Totals:');
  {
    const entries = [
      createDimensionEntry({ name: 'Wall A', rawInput: '4200mm', dimensionType: 'segment' }),    // 4200 mm SEG
      createDimensionEntry({ name: 'Wall B', rawInput: '3800mm', dimensionType: 'segment' }),    // 3800 mm SEG
      createDimensionEntry({ name: 'Door', rawInput: '900mm', dimensionType: 'reference' }),     // 900 mm REF (Excluded)
      createDimensionEntry({ name: 'Window', rawInput: '1800mm', dimensionType: 'reference' }),  // 1800 mm REF (Excluded)
      createDimensionEntry({ name: 'Tolerance Gap', rawInput: '50mm', dimensionType: 'allowance' }), // 50 mm ALW
      createDimensionEntry({ name: 'Disabled Segment', rawInput: '2000mm', dimensionType: 'segment', enabled: false }), // Disabled
      createDimensionEntry({ name: 'Invalid Item', rawInput: 'xyz', dimensionType: 'segment' })  // Invalid
    ];

    const totals = calculateWorkspaceTotals(entries, 50, 'mm');
    assert(totals.totalCount === 7, 'Counts 7 total entries');
    assert(totals.enabledCount === 6, 'Counts 6 enabled entries');
    assert(totals.segmentCount === 2, 'Counts 2 active segments');
    assert(totals.referenceCount === 2, 'Counts 2 active references');
    assert(totals.allowanceCount === 1, 'Counts 1 active allowance');

    // Segment sum = 4200 + 3800 = 8000 mm = 8.0 m
    assertClose(totals.segmentRealMeters, 8.0, 0.0001, 'Segment real sum is 8.0m');
    assert(totals.segmentRealFormatted === '8,000 mm', 'Segment real formatted is 8,000 mm');
    assert(totals.segmentDrawingFormatted === '160 mm', 'Segment drawing @ 1:50 is 160 mm');

    // Allowance sum = 50 mm = 0.05 m
    assertClose(totals.allowanceRealMeters, 0.05, 0.0001, 'Allowance real sum is 0.05m');
    assert(totals.allowanceRealFormatted === '50 mm', 'Allowance real formatted is 50 mm');
    assert(totals.allowanceDrawingFormatted === '1 mm', 'Allowance drawing @ 1:50 is 1 mm');

    // Combined sum = 8000 + 50 = 8050 mm = 8.05 m
    assertClose(totals.totalRealMeters, 8.05, 0.0001, 'Combined real sum is 8.05m');
    assert(totals.totalRealFormatted === '8,050 mm', 'Combined real formatted is 8,050 mm');
    assert(totals.totalDrawingFormatted === '161 mm', 'Combined drawing @ 1:50 is 161 mm');

    // References sum = 900 + 1800 = 2700 mm (Reported separately, NOT in combined total)
    assertClose(totals.referenceRealMeters, 2.7, 0.0001, 'References real sum is 2.7m');
    assert(totals.referenceRealFormatted === '2,700 mm', 'References formatted is 2,700 mm');
  }

  // 7. Grouping & Subtotals
  console.log('7. Grouping & Subtotals:');
  {
    const grp = createGroup('North Elevation');
    assert(grp.name === 'North Elevation', 'Creates group with name');
    assert(grp.collapsed === false, 'Group is not collapsed by default');

    const entries = [
      createDimensionEntry({ name: 'Bay 1', rawInput: '3000mm', dimensionType: 'segment', groupId: grp.id }),
      createDimensionEntry({ name: 'Bay 2', rawInput: '4000mm', dimensionType: 'segment', groupId: grp.id }),
      createDimensionEntry({ name: 'Door', rawInput: '900mm', dimensionType: 'reference', groupId: grp.id }),
      createDimensionEntry({ name: 'South Wall', rawInput: '5000mm', dimensionType: 'segment', groupId: null })
    ];

    const grpTotals = calculateGroupTotals(entries, grp.id, 50, 'mm');
    assert(grpTotals.segmentCount === 2, 'Group has 2 active segments');
    assert(grpTotals.segmentRealFormatted === '7,000 mm', 'Group segment total is 7,000 mm');
    assert(grpTotals.totalRealFormatted === '7,000 mm', 'Group combined total is 7,000 mm');
  }

  // 8. Clipboard Filtering & CAD Formats
  console.log('8. Clipboard Filtering & Formats:');
  {
    const entries = [
      createDimensionEntry({ name: 'Wall A', rawInput: '4.8m', dimensionType: 'segment', notes: 'North' }),
      createDimensionEntry({ name: 'Door', rawInput: '900mm', dimensionType: 'reference', notes: 'Clear' }),
      createDimensionEntry({ name: 'Gap', rawInput: '50mm', dimensionType: 'allowance' })
    ];

    // Mode: both (all)
    const bothText = formatWorkspaceForClipboard(entries, 50, 'mm', 'both');
    assert(bothText.includes('TOTAL SEGMENTS:   4,800 mm'), 'Includes segment total in schedule');
    assert(bothText.includes('TOTAL ALLOWANCES: 50 mm'), 'Includes allowance total');
    assert(bothText.includes('COMBINED TOTAL:   4,850 mm'), 'Includes combined total');

    // Mode: segments only
    const segText = formatWorkspaceForClipboard(entries, 50, 'mm', 'segments');
    assert(segText.includes('Wall A'), 'Segments filter includes Wall A');
    assert(!segText.includes('Door'), 'Segments filter excludes Door reference');

    // Mode: references only
    const refText = formatWorkspaceForClipboard(entries, 50, 'mm', 'references');
    assert(refText.includes('Door'), 'References filter includes Door');
    assert(!refText.includes('Wall A'), 'References filter excludes Wall A');

    // Mode: raw numbers for CAD
    const rawText = formatWorkspaceForClipboard(entries, 50, 'mm', 'raw');
    assert(rawText === '4.8m\n900mm\n50mm', 'Raw mode outputs pure newline-separated dimensions');

    // Mode: TSV
    const tsvText = formatWorkspaceForClipboard(entries, 50, 'mm', 'tsv');
    assert(tsvText.includes('SEGMENT\tWall A\t4.8m\t4,800 mm'), 'TSV contains segment row with type');
  }

  // 9. Persistence & Backwards Compatibility
  console.log('9. Persistence & Backwards Compatibility:');
  {
    const defaultWs = createDefaultWorkspace();
    assert(defaultWs.entries.length === 5, 'Default workspace has 5 sample entries');

    const serialized = serializeWorkspace(defaultWs);
    assert(typeof serialized === 'string' && serialized.startsWith('{'), 'Serializes to valid JSON string');

    const deserialized = deserializeWorkspace(serialized);
    assert(deserialized.scaleRatio === 50, 'Restores scale ratio');
    assert(deserialized.displayUnit === 'mm', 'Restores display unit');
    assert(deserialized.entries.length === 5, 'Restores 5 entries');
    assert(deserialized.entries[0].dimensionType === 'segment', 'Restores entry dimensionType');

    // Backwards compatibility test with v2.5.0 payload (missing dimensionType)
    const oldPayload = JSON.stringify({
      version: '2.5.0',
      scaleRatio: 100,
      displayUnit: 'cm',
      entries: [
        { id: 'dim_old_1', name: 'Legacy Wall', rawInput: '3.5m', defaultUnit: 'm' }
      ]
    });
    const restoredLegacy = deserializeWorkspace(oldPayload);
    assert(restoredLegacy.entries[0].dimensionType === 'reference', 'Legacy entry safely defaults to "reference"');
    assert(restoredLegacy.entries[0].name === 'Legacy Wall', 'Restores legacy entry name');

    // Resilience tests
    const fromNull = deserializeWorkspace(null);
    assert(fromNull.entries.length === 5, 'Recovers defaults from null');

    const fromCorrupted = deserializeWorkspace('{invalid-json!#%');
    assert(fromCorrupted.entries.length === 5, 'Recovers defaults from corrupted JSON');
  }

  console.log(`\nDimension Workspace Tests Summary: ${passed} passed, ${failed} failed\n`);
  console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('dimension-workspace.test.js')) {
  const result = runDimensionWorkspaceTests();
  process.exit(result.failed > 0 ? 1 : 0);
}
