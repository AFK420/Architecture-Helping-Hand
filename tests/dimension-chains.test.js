/**
 * Automated Test Suite for Dimension Chains Engine
 * Phase 2.5: Daily Architect Toolkit — Part 5: Dimension Chains
 */

import {
  createDimensionChain,
  createChainSegment,
  parseSegmentMeasurement,
  parseQuickChainInput,
  calculateChain,
  generateChainSVG,
  formatChainForClipboard,
  convertChainToWorkspaceGroup,
  CHAIN_TEMPLATES
} from '../src/core/dimension-chains.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertCloseTo(actual, expected, maxDelta = 0.0001, message = '') {
  const delta = Math.abs(actual - expected);
  assert(delta <= maxDelta, `${message} (Expected approx ${expected}, got ${actual})`);
}

console.log('🧪 Running tests/dimension-chains.test.js...\n');

// ---------------------------------------------------------------------------
// 1. Basic Chain Model & Measurement Parsing
// ---------------------------------------------------------------------------
console.log('--- 1. Basic Model & Measurement Parsing ---');
{
  const p1 = parseSegmentMeasurement('1200mm', 'mm');
  assert(p1.isValid === true, 'Parses "1200mm"');
  assertCloseTo(p1.canonicalMeters, 1.2, 0.0001, '1200mm = 1.2m');

  const p2 = parseSegmentMeasurement('2.4m', 'mm');
  assert(p2.isValid === true, 'Parses "2.4m"');
  assertCloseTo(p2.canonicalMeters, 2.4, 0.0001, '2.4m canonical');

  const p3 = parseSegmentMeasurement("7' 6\"", 'mm');
  assert(p3.isValid === true, 'Parses feet-inches "7\' 6\\""');
  assertCloseTo(p3.canonicalMeters, 7.5 * 0.3048, 0.0001, "7' 6\" = 2.286m");

  const p4 = parseSegmentMeasurement('1200 + 300', 'mm');
  assert(p4.isValid === true, 'Parses math expression "1200 + 300"');
  assertCloseTo(p4.canonicalMeters, 1.5, 0.0001, '1200 + 300 = 1.5m');
}

// ---------------------------------------------------------------------------
// 2. Quick-Add String Parsing
// ---------------------------------------------------------------------------
console.log('\n--- 2. Quick-Add Parsing ---');
{
  // Plus-separated
  const segs1 = parseQuickChainInput('1200 + 1800 + 900 + 1500', { defaultUnit: 'mm' });
  assert(segs1.length === 4, 'Plus-separated creates 4 segments');
  assert(segs1[0].rawInput === '1200' && segs1[3].rawInput === '1500', 'Segment raw inputs preserved');

  // Space-separated
  const segs2 = parseQuickChainInput('1200 1800 900', { defaultUnit: 'mm' });
  assert(segs2.length === 3, 'Space-separated creates 3 segments');

  // Comma-separated with names & types
  const segs3 = parseQuickChainInput('Wall A 1200, Window 1500, Door 900 ref, Joint 50 alw', { defaultUnit: 'mm' });
  assert(segs3.length === 4, 'Comma-separated creates 4 named segments');
  assert(segs3[0].name === 'Wall A' && segs3[0].dimensionType === 'segment', 'Segment 1 is Wall A (SEG)');
  assert(segs3[2].name === 'Door' && segs3[2].dimensionType === 'reference', 'Segment 3 is Door (REF)');
  assert(segs3[3].name === 'Joint' && segs3[3].dimensionType === 'allowance', 'Segment 4 is Joint (ALW)');
}

// ---------------------------------------------------------------------------
// 3. Sequential Cumulative Calculations
// ---------------------------------------------------------------------------
console.log('\n--- 3. Sequential Cumulative Calculations ---');
{
  const chain = createDimensionChain({
    name: 'North Wall',
    defaultUnit: 'mm',
    scaleRatio: 50,
    segments: [
      { name: 'Bay 1', rawInput: '1200', dimensionType: 'segment' },
      { name: 'Bay 2', rawInput: '1800', dimensionType: 'segment' },
      { name: 'Bay 3', rawInput: '900', dimensionType: 'segment' },
      { name: 'Bay 4', rawInput: '1500', dimensionType: 'segment' }
    ]
  });

  const calc = calculateChain(chain);
  assert(calc.isValid === true, 'Chain calculation is valid');
  assertCloseTo(calc.segmentTotalMeters, 5.4, 0.0001, 'Total segment length is 5.4m (5400 mm)');
  assertCloseTo(calc.overallExtentMeters, 5.4, 0.0001, 'Overall extent is 5.4m');

  // Check cumulative coordinates:
  // Seg 1: 0 -> 1200
  // Seg 2: 1200 -> 3000
  // Seg 3: 3000 -> 3900
  // Seg 4: 3900 -> 5400
  assertCloseTo(calc.segments[0].startMeters, 0.0, 0.0001, 'Seg 1 start is 0 mm');
  assertCloseTo(calc.segments[0].endMeters, 1.2, 0.0001, 'Seg 1 end is 1200 mm');

  assertCloseTo(calc.segments[1].startMeters, 1.2, 0.0001, 'Seg 2 start is 1200 mm');
  assertCloseTo(calc.segments[1].endMeters, 3.0, 0.0001, 'Seg 2 end is 3000 mm');

  assertCloseTo(calc.segments[2].startMeters, 3.0, 0.0001, 'Seg 3 start is 3000 mm');
  assertCloseTo(calc.segments[2].endMeters, 3.9, 0.0001, 'Seg 3 end is 3900 mm');

  assertCloseTo(calc.segments[3].startMeters, 3.9, 0.0001, 'Seg 4 start is 3900 mm');
  assertCloseTo(calc.segments[3].endMeters, 5.4, 0.0001, 'Seg 4 end is 5400 mm');
}

// ---------------------------------------------------------------------------
// 4. Disabled Segments Recalculation
// ---------------------------------------------------------------------------
console.log('\n--- 4. Disabled Segments ---');
{
  const chain = createDimensionChain({
    name: 'North Wall',
    defaultUnit: 'mm',
    segments: [
      { name: 'Bay 1', rawInput: '1200', enabled: true },
      { name: 'Bay 2', rawInput: '1800', enabled: false }, // DISABLED
      { name: 'Bay 3', rawInput: '900', enabled: true }
    ]
  });

  const calc = calculateChain(chain);
  assertCloseTo(calc.segmentTotalMeters, 2.1, 0.0001, 'Disabled segment excluded from total (1200 + 900 = 2100 mm)');
  assertCloseTo(calc.segments[0].startMeters, 0.0, 0.0001, 'Seg 1: 0 -> 1200');
  assertCloseTo(calc.segments[0].endMeters, 1.2, 0.0001, 'Seg 1: 0 -> 1200');
  assertCloseTo(calc.segments[2].startMeters, 1.2, 0.0001, 'Seg 3 starts at 1200mm after skipping disabled Seg 2');
  assertCloseTo(calc.segments[2].endMeters, 2.1, 0.0001, 'Seg 3 ends at 2100mm');
}

// ---------------------------------------------------------------------------
// 5. Semantic Types (REF & ALW)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Semantic Types ---');
{
  const chain = createDimensionChain({
    name: 'Facade',
    defaultUnit: 'mm',
    segments: [
      { name: 'Pier 1', rawInput: '1200', dimensionType: 'segment' },
      { name: 'Door Note', rawInput: '900', dimensionType: 'reference' }, // REF annotation
      { name: 'Expansion Joint', rawInput: '50', dimensionType: 'allowance' }, // ALW tolerance
      { name: 'Pier 2', rawInput: '1200', dimensionType: 'segment' }
    ]
  });

  const calc = calculateChain(chain);
  assertCloseTo(calc.segmentTotalMeters, 2.4, 0.0001, 'Segment total (1200 + 1200 = 2400 mm)');
  assertCloseTo(calc.allowanceTotalMeters, 0.05, 0.0001, 'Allowance total is 50 mm');
  assertCloseTo(calc.overallExtentMeters, 2.45, 0.0001, 'Overall extent = 2450 mm');

  // Ref annotation stays at position 1200 without advancing baseline
  assertCloseTo(calc.segments[1].startMeters, 1.2, 0.0001, 'REF stays at 1200mm');
  assertCloseTo(calc.segments[1].endMeters, 1.2, 0.0001, 'REF does not advance baseline');

  // Allowance advances baseline from 1200 -> 1250
  assertCloseTo(calc.segments[2].startMeters, 1.2, 0.0001, 'ALW starts at 1200mm');
  assertCloseTo(calc.segments[2].endMeters, 1.25, 0.0001, 'ALW ends at 1250mm');

  // Pier 2 starts at 1250 -> 2450
  assertCloseTo(calc.segments[3].startMeters, 1.25, 0.0001, 'Pier 2 starts at 1250mm');
  assertCloseTo(calc.segments[3].endMeters, 2.45, 0.0001, 'Pier 2 ends at 2450mm');
}

// ---------------------------------------------------------------------------
// 6. Start and End Offsets
// ---------------------------------------------------------------------------
console.log('\n--- 6. Start and End Offsets ---');
{
  const chain = createDimensionChain({
    name: 'Offset Chain',
    defaultUnit: 'mm',
    startOffsetRaw: '300',
    endOffsetRaw: '200',
    segments: [
      { name: 'Bay 1', rawInput: '1200' },
      { name: 'Bay 2', rawInput: '1800' },
      { name: 'Bay 3', rawInput: '900' }
    ]
  });

  const calc = calculateChain(chain);
  assertCloseTo(calc.startOffsetMeters, 0.3, 0.0001, 'Start offset = 300 mm');
  assertCloseTo(calc.endOffsetMeters, 0.2, 0.0001, 'End offset = 200 mm');
  assertCloseTo(calc.segmentTotalMeters, 3.9, 0.0001, 'Segment total = 3900 mm (excludes offsets)');
  assertCloseTo(calc.overallExtentMeters, 4.4, 0.0001, 'Overall extent = 300 + 3900 + 200 = 4400 mm');

  // Running coordinates shifted by +300mm:
  // 300 -> 1500 -> 3300 -> 4200
  assertCloseTo(calc.segments[0].startMeters, 0.3, 0.0001, 'Seg 1 starts at 300 mm');
  assertCloseTo(calc.segments[0].endMeters, 1.5, 0.0001, 'Seg 1 ends at 1500 mm');
  assertCloseTo(calc.segments[1].startMeters, 1.5, 0.0001, 'Seg 2 starts at 1500 mm');
  assertCloseTo(calc.segments[1].endMeters, 3.3, 0.0001, 'Seg 2 ends at 3300 mm');
  assertCloseTo(calc.segments[2].startMeters, 3.3, 0.0001, 'Seg 3 starts at 3300 mm');
  assertCloseTo(calc.segments[2].endMeters, 4.2, 0.0001, 'Seg 3 ends at 4200 mm');
}

// ---------------------------------------------------------------------------
// 7. Scale Calculations & Drawing Proportions
// ---------------------------------------------------------------------------
console.log('\n--- 7. Scale Calculations ---');
{
  const chain = createDimensionChain({
    name: 'Scaled Wall',
    defaultUnit: 'mm',
    scaleRatio: 50,
    segments: [
      { name: 'Bay 1', rawInput: '2400' },
      { name: 'Bay 2', rawInput: '3000' }
    ]
  });

  const calc = calculateChain(chain, { scaleRatio: 50 });
  assertCloseTo(calc.segmentTotalMeters, 5.4, 0.0001, '5400 mm total');
  assertCloseTo(calc.drawingOverallMeters, 5.4 / 50, 0.0001, '5400mm @ 1:50 = 0.108m drawing');
  assert(calc.drawingOverallFormatted === '108 mm', 'Formatted drawing length is "108 mm"');
  assert(calc.segments[0].drawingFormatted === '48 mm', 'Bay 1 drawing is 48 mm');
  assert(calc.segments[1].drawingFormatted === '60 mm', 'Bay 2 drawing is 60 mm');
}

// ---------------------------------------------------------------------------
// 8. SVG Visual Drafting Generator
// ---------------------------------------------------------------------------
console.log('\n--- 8. SVG Generator ---');
{
  const chain = createDimensionChain({
    name: 'Facade Test',
    defaultUnit: 'mm',
    segments: [
      { name: 'Bay 1', rawInput: '1200' },
      { name: 'Bay 2', rawInput: '1800' }
    ]
  });

  const calc = calculateChain(chain);
  const svg = generateChainSVG(calc, { selectedSegmentId: calc.segments[0].id });
  assert(typeof svg === 'string' && svg.includes('<svg'), 'Generates valid SVG string');
  assert(svg.includes('1,200 mm') && svg.includes('1,800 mm'), 'SVG contains segment dimensions');
  assert(svg.includes('TOTAL: 3,000 mm'), 'SVG contains overall total text');
  assert(svg.includes('SCALE 1:50'), 'SVG contains scale stamp badge');
}

// ---------------------------------------------------------------------------
// 9. Workspace & Clipboard Handoffs
// ---------------------------------------------------------------------------
console.log('\n--- 9. Handoffs & Exports ---');
{
  const chain = createDimensionChain({
    name: 'Corridor Partition',
    defaultUnit: 'mm',
    segments: [
      { name: 'Wall A', rawInput: '2400' },
      { name: 'Opening', rawInput: '900' }
    ]
  });

  const calc = calculateChain(chain);

  // Workspace Group conversion
  const wsGroup = convertChainToWorkspaceGroup(calc);
  assert(wsGroup.group.name === 'Corridor Partition', 'Workspace group has chain name');
  assert(wsGroup.entries.length === 2, 'Workspace group has 2 entries');
  assert(wsGroup.entries[0].groupId === wsGroup.group.id, 'Entries linked to group ID');

  // Clipboard formatting
  const tsv = formatChainForClipboard(calc, 'tsv');
  assert(tsv.includes('Wall A') && tsv.includes('2,400 mm'), 'TSV contains segment names and lengths');

  const cum = formatChainForClipboard(calc, 'cumulative');
  assert(cum.includes('2,400 mm') && cum.includes('3,300 mm'), 'Cumulative export contains coordinates');
}

// ---------------------------------------------------------------------------
// 10. Built-in Templates
// ---------------------------------------------------------------------------
console.log('\n--- 10. Templates ---');
{
  assert(CHAIN_TEMPLATES.wall_opening.segments.length === 5, 'Wall opening template has 5 segments');
  assert(CHAIN_TEMPLATES.grid_bays.segments.length === 4, 'Grid bays template has 4 segments');
  assert(CHAIN_TEMPLATES.facade_rhythm.segments.length === 5, 'Facade rhythm template has 5 segments');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=================================================================`);
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log(`=================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
