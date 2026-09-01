/**
 * Automated Test Suite for Multi-Scale Comparison Engine
 * Phase 2.5: Daily Architect Toolkit — Part 4: Multi-Scale Comparison
 */

import {
  getDefaultComparisonScales,
  getScalePresetGroups,
  parseMultiScaleInput,
  calculateAtScale,
  compareAcrossScales,
  formatScaleComparison,
  STANDARD_PAPER_SIZES
} from '../src/core/multi-scale.js';

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

function assertThrows(fn, message) {
  try {
    fn();
    console.error(`  ❌ FAIL: Expected error but nothing was thrown - ${message}`);
    failed++;
  } catch (err) {
    console.log(`  ✅ PASS: Threw expected error [${err.message}] - ${message}`);
    passed++;
  }
}

console.log('🧪 Running tests/multi-scale.test.js...\n');

// ---------------------------------------------------------------------------
// 1. Defaults and Preset Groups
// ---------------------------------------------------------------------------
console.log('--- 1. Defaults & Preset Groups ---');
{
  const defaults = getDefaultComparisonScales();
  assert(Array.isArray(defaults) && defaults.length === 10, 'Default scales has 10 standard ratios');
  assert(defaults.includes(20) && defaults.includes(50) && defaults.includes(100), 'Contains 1:20, 1:50, 1:100');

  const groups = getScalePresetGroups();
  assert(Array.isArray(groups.architectural) && groups.architectural.includes(50), 'Architectural group contains 1:50');
  assert(Array.isArray(groups.detail) && groups.detail.includes(5), 'Detail group contains 1:5');
  assert(Array.isArray(groups.site) && groups.site.includes(500), 'Site group contains 1:500');
  assert(Array.isArray(groups.imperial) && groups.imperial.includes(48), 'Imperial group contains 1/4"=1\' (1:48)');
}

// ---------------------------------------------------------------------------
// 2. Multi-Scale Input Parsing
// ---------------------------------------------------------------------------
console.log('\n--- 2. Input Parsing ---');
{
  // Direct dimension
  const p1 = parseMultiScaleInput('2400mm');
  assert(p1.isValid === true, 'Parses direct dimension "2400mm"');
  assertCloseTo(p1.canonicalMeters, 2.4, 0.0001, 'Canonical meters is 2.4m');
  assert(p1.isExpression === false, 'Not marked as expression');
}

{
  // Bare number assuming defaultUnit
  const p2 = parseMultiScaleInput('2400', { defaultUnit: 'mm' });
  assert(p2.isValid === true, 'Parses bare number "2400" with defaultUnit mm');
  assertCloseTo(p2.canonicalMeters, 2.4, 0.0001, 'Bare 2400 mm = 2.4m');
}

{
  // Expression
  const p3 = parseMultiScaleInput('2400mm + 900mm');
  assert(p3.isValid === true, 'Parses expression "2400mm + 900mm"');
  assert(p3.isExpression === true, 'Marked as expression');
  assertCloseTo(p3.canonicalMeters, 3.3, 0.0001, 'Expression evaluates to 3.3m');
}

{
  // Architectural Feet-Inches
  const p4 = parseMultiScaleInput("7' 6\"");
  assert(p4.isValid === true, 'Parses feet-inches "7\' 6\\""');
  assertCloseTo(p4.canonicalMeters, 7.5 * 0.3048, 0.0001, "7' 6\" = 2.286m");
}

{
  // Empty or invalid input
  const p5 = parseMultiScaleInput('');
  assert(p5.isValid === false, 'Rejects empty input');

  const p6 = parseMultiScaleInput('invalid xyz');
  assert(p6.isValid === false, 'Rejects invalid string');
}

// ---------------------------------------------------------------------------
// 3. Single Scale Calculation (calculateAtScale)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Single Scale Calculation ---');
{
  // 2400mm at 1:20 = 120mm
  const s1 = calculateAtScale(2.4, 20, { displayUnit: 'mm' });
  assertCloseTo(s1.drawingMeters, 0.12, 0.0001, '2400mm @ 1:20 = 0.12m drawing');
  assert(s1.formatted === '120 mm', 'Formatted drawing is "120 mm"');
  assert(s1.label === '1:20', 'Scale label is 1:20');
}

{
  // 2400mm at 1:50 = 48mm
  const s2 = calculateAtScale(2.4, 50, { displayUnit: 'mm' });
  assertCloseTo(s2.drawingMeters, 0.048, 0.0001, '2400mm @ 1:50 = 0.048m drawing');
  assert(s2.formatted === '48 mm', 'Formatted drawing is "48 mm"');
}

{
  // 2400mm at 1:100 = 24mm
  const s3 = calculateAtScale(2.4, 100, { displayUnit: 'mm' });
  assertCloseTo(s3.drawingMeters, 0.024, 0.0001, '2400mm @ 1:100 = 0.024m drawing');
  assert(s3.formatted === '24 mm', 'Formatted drawing is "24 mm"');
}

{
  // Custom scale: 2400mm at 1:33
  const sCustom = calculateAtScale(2.4, 33, { displayUnit: 'mm', precision: 2 });
  assertCloseTo(sCustom.drawingMeters, 2.4 / 33, 0.0001, '2400mm @ 1:33 calculates accurately');
  assert(sCustom.label.includes('1:33'), 'Custom scale label is 1:33');
}

// Validation guards
assertThrows(() => calculateAtScale(2.4, 0), 'Rejects scale ratio of 0');
assertThrows(() => calculateAtScale(2.4, -50), 'Rejects negative scale ratio');
assertThrows(() => calculateAtScale(2.4, NaN), 'Rejects NaN scale ratio');
assertThrows(() => calculateAtScale(2.4, Infinity), 'Rejects Infinity scale ratio');

// ---------------------------------------------------------------------------
// 4. Mixed Unit Equivalence
// ---------------------------------------------------------------------------
console.log('\n--- 4. Mixed Unit Equivalence ---');
{
  const resMetric = compareAcrossScales('2.4m', [20, 50, 100], { displayUnit: 'mm' });
  const resMm = compareAcrossScales('2400mm', [20, 50, 100], { displayUnit: 'mm' });
  const resInches = compareAcrossScales('94.488188976in', [20, 50, 100], { displayUnit: 'mm' });

  assertCloseTo(resMetric.scales[0].drawingMeters, resMm.scales[0].drawingMeters, 0.0001, '2.4m and 2400mm yield identical drawing size @ 1:20');
  assertCloseTo(resMm.scales[1].drawingMeters, resInches.scales[1].drawingMeters, 0.0001, '2400mm and 94.488in yield identical drawing size @ 1:50');
}

// ---------------------------------------------------------------------------
// 5. Proportional Physical Drafting Bars
// ---------------------------------------------------------------------------
console.log('\n--- 5. Proportional Physical Drafting Bars ---');
{
  // In [1:20, 1:50, 1:100], 1:20 is the largest drawing size (100% bar)
  // 1:50 is 20/50 = 40%
  // 1:100 is 20/100 = 20%
  const res = compareAcrossScales('2400mm', [20, 50, 100], { displayUnit: 'mm' });
  assert(res.scales[0].ratio === 20 && res.scales[0].barPercent === 100, '1:20 has 100% bar');
  assert(res.scales[1].ratio === 50 && res.scales[1].barPercent === 40, '1:50 has 40% bar');
  assert(res.scales[2].ratio === 100 && res.scales[2].barPercent === 20, '1:100 has 20% bar');
}

// ---------------------------------------------------------------------------
// 6. Paper Context Helper
// ---------------------------------------------------------------------------
console.log('\n--- 6. Paper Context Helper ---');
{
  // A3 usable width = 387 mm
  // 2400mm @ 1:5 (480mm) -> exceeds A3
  // 2400mm @ 1:10 (240mm) -> fits A3
  // 2400mm @ 1:50 (48mm) -> fits A3
  const res = compareAcrossScales('2400mm', [5, 10, 50], { displayUnit: 'mm', paperSize: 'A3' });
  assert(res.paperContext.key === 'A3', 'A3 paper context attached');
  assert(res.scales[0].ratio === 5 && res.scales[0].fitsPaper === false, '1:5 (480mm) exceeds A3 (387mm)');
  assert(res.scales[1].ratio === 10 && res.scales[1].fitsPaper === true, '1:10 (240mm) fits A3');
  assert(res.scales[2].ratio === 50 && res.scales[2].fitsPaper === true, '1:50 (48mm) fits A3');
}

// ---------------------------------------------------------------------------
// 7. Target Fit Range Heuristics
// ---------------------------------------------------------------------------
console.log('\n--- 7. Target Fit Range Heuristics ---');
{
  // Target drawing range: 80 - 150 mm
  // For 2400 mm:
  // 1:20 = 120 mm (in range -> 'suggested')
  // 1:10 = 240 mm (too large -> 'too_large')
  // 1:50 = 48 mm (too small -> 'too_small')
  const res = compareAcrossScales('2400mm', [10, 20, 50], {
    displayUnit: 'mm',
    targetFitMinMm: 80,
    targetFitMaxMm: 150
  });

  assert(res.scales[0].ratio === 10 && res.scales[0].fitStatus === 'too_large', '1:10 (240mm) is too_large');
  assert(res.scales[1].ratio === 20 && res.scales[1].fitStatus === 'suggested', '1:20 (120mm) is suggested fit');
  assert(res.scales[2].ratio === 50 && res.scales[2].fitStatus === 'too_small', '1:50 (48mm) is too_small');
}

// ---------------------------------------------------------------------------
// 8. Sorting Modes
// ---------------------------------------------------------------------------
console.log('\n--- 8. Sorting Modes ---');
{
  const ratios = [50, 20, 100, 10];

  const asc = compareAcrossScales('2400mm', ratios, { sortOrder: 'ratio_asc' });
  assert(asc.scales[0].ratio === 10 && asc.scales[3].ratio === 100, 'Sorted ratio_asc (1:10 -> 1:100)');

  const desc = compareAcrossScales('2400mm', ratios, { sortOrder: 'ratio_desc' });
  assert(desc.scales[0].ratio === 100 && desc.scales[3].ratio === 10, 'Sorted ratio_desc (1:100 -> 1:10)');

  const drawDesc = compareAcrossScales('2400mm', ratios, { sortOrder: 'drawing_desc' });
  assert(drawDesc.scales[0].ratio === 10 && drawDesc.scales[3].ratio === 100, 'Sorted drawing_desc (largest drawing first)');

  const drawAsc = compareAcrossScales('2400mm', ratios, { sortOrder: 'drawing_asc' });
  assert(drawAsc.scales[0].ratio === 100 && drawAsc.scales[3].ratio === 10, 'Sorted drawing_asc (smallest drawing first)');
}

// ---------------------------------------------------------------------------
// 9. Current Scale & Favorites
// ---------------------------------------------------------------------------
console.log('\n--- 9. Current Scale & Favorites ---');
{
  const res = compareAcrossScales('2400mm', [20, 50, 100], {
    currentScaleRatio: 50,
    favoriteRatios: [20, 100]
  });

  assert(res.scales[0].ratio === 20 && res.scales[0].isFavorite === true, '1:20 is marked favorite');
  assert(res.scales[1].ratio === 50 && res.scales[1].isCurrent === true, '1:50 is marked current scale');
  assert(res.scales[1].isFavorite === false, '1:50 is not favorite');
  assert(res.scales[2].ratio === 100 && res.scales[2].isFavorite === true, '1:100 is marked favorite');
}

// ---------------------------------------------------------------------------
// 10. Multi-Format Clipboard Export
// ---------------------------------------------------------------------------
console.log('\n--- 10. Multi-Format Clipboard Export ---');
{
  const res = compareAcrossScales('2400mm', [20, 50, 100], { currentScaleRatio: 50 });

  const rawOut = formatScaleComparison(res, 'raw');
  assert(rawOut.includes('120') && rawOut.includes('48') && rawOut.includes('24'), 'Raw export contains numeric values');

  const currentOut = formatScaleComparison(res, 'current');
  assert(currentOut.includes('Scale 1:50') && currentOut.includes('48 mm'), 'Current scale export has 1:50 formatted');

  const allOut = formatScaleComparison(res, 'all');
  assert(allOut.includes('1:20') && allOut.includes('1:50') && allOut.includes('1:100'), 'All export lists all rows');

  const tableOut = formatScaleComparison(res, 'table');
  assert(tableOut.includes('| Scale | Drawing Size | Status |'), 'Table export contains markdown table header');
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
