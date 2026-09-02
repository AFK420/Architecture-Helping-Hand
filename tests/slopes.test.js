/**
 * Architecture Helping Hand - Slope Analyzer Test Suite
 * Architectural Tools Phase: Slopes (general rise/run analysis).
 *
 * Regression rule honored: all integrations use REAL engine outputs —
 * real parser/unit conversions, the real shared slope-math (also consumed
 * by Ramps), real store + HistoryService + CAD payload builder. Golden
 * cases pin that ramps/stairs/slopes agree on identical geometry.
 */

import {
  SLOPE_INPUT_MODES,
  SLOPE_ERROR_CODES,
  CONSISTENCY_TOLERANCE,
  SLOPE_TARGETS,
  checkConsistency,
  analyzeSlope,
  buildSlopeTargetComparison,
  formatSlopeRatio,
  explainSlope,
  generateSlopeSVG
} from '../src/core/slopes.js';
import {
  SLOPE_DIRECTIONS
} from '../src/core/slope-math.js';
import {
  slopeFromGeometry,
  runFromRiseAndPercent,
  riseFromRunAndPercent,
  runFromRiseAndRatio,
  riseFromRunAndRatio,
  runFromRiseAndAngle,
  riseFromRunAndAngle
} from '../src/core/slope-math.js';
import { calculateRamp } from '../src/core/ramps.js';
import { calculateStair } from '../src/core/stairs.js';
import { createProjectStore } from '../src/services/store.js';
import { HistoryService } from '../src/services/history.js';
import { parseInput } from '../src/core/parser.js';
import { UNITS } from '../src/core/units.js';

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

console.log('🧪 Running tests/slopes.test.js...');

const MODES = SLOPE_INPUT_MODES;

// ---------------------------------------------------------------------------
// 1. Canonical slope-math (the ONE shared source)
// ---------------------------------------------------------------------------
console.log('\n--- 1. Canonical slope-math ---');

{
  const s = slopeFromGeometry(1.2, 14.4);
  assertEqual(s.kind, 'normal', 'Normal geometry classified');
  assertEqual(s.direction, SLOPE_DIRECTIONS.ASCENDING, 'Positive rise → ascending');
  assertClose(s.slopePercent, (1.2 / 14.4) * 100, 'Percent = rise/run × 100');
  assertClose(s.ratioValue, 12, 'Ratio = run/rise');
  assertClose(s.angleDegrees, Math.atan2(1.2, 14.4) * 180 / Math.PI, 'Angle = atan2 degrees');
}

{
  const down = slopeFromGeometry(-1.2, 14.4);
  assertEqual(down.direction, SLOPE_DIRECTIONS.DESCENDING, 'Negative rise → descending');
  assertClose(down.slopePercent, -8.333333333, 'Descending slope is negative');
  assertClose(down.angleDegrees, -Math.atan2(1.2, 14.4) * 180 / Math.PI, 'Descending angle negative');
}

{
  // Structured singularities — never fabricated as normal slopes
  const vertical = slopeFromGeometry(2, 0);
  assertEqual(vertical.kind, 'vertical', 'run=0 classified vertical');
  assertEqual(vertical.slopePercent, Infinity, 'Vertical slope percent = +Infinity (structured)');
  assertEqual(vertical.ratioValue, 0, 'Vertical ratioValue = 0 (1 : 0)');
  assertClose(vertical.angleDegrees, 90, 'Vertical angle = 90°');

  const flat = slopeFromGeometry(0, 10);
  assertEqual(flat.kind, 'flat', 'rise=0 classified flat');
  assertEqual(flat.slopePercent, 0, 'Flat percent 0');
  assertEqual(flat.ratioValue, Infinity, 'Flat ratio undefined → Infinity');
  assertEqual(flat.angleDegrees, 0, 'Flat angle 0°');

  const invalid = slopeFromGeometry(0, 0);
  assertEqual(invalid.kind, 'invalid', '0/0 classified invalid, not flat');
}

{
  // Inverse conversions round-trip through the canonical source
  assertClose(runFromRiseAndPercent(1.2, 8.333333333), 14.4, 'run from rise+percent');
  assertClose(riseFromRunAndPercent(14.4, 8.333333333), 1.2, 'rise from run+percent');
  assertClose(runFromRiseAndRatio(1.2, 12), 14.4, 'run from rise+ratio');
  assertClose(riseFromRunAndRatio(14.4, 12), 1.2, 'rise from run+ratio');
  assertClose(runFromRiseAndAngle(1.2, Math.atan2(1.2, 14.4) * 180 / Math.PI), 14.4, 'run from rise+angle');
  assertClose(riseFromRunAndAngle(14.4, Math.atan2(1.2, 14.4) * 180 / Math.PI), 1.2, 'rise from run+angle');
}

// ---------------------------------------------------------------------------
// 2. Input definitions
// ---------------------------------------------------------------------------
console.log('\n--- 2. Input definitions ---');

{
  // Golden case: rise 1.2 / run 14.4 → 8.33%, 1:12, atan2 angle
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: { value: 1.2, unitKey: 'm' }, run: { value: 14.4, unitKey: 'm' } });
  assert(r.valid, 'rise+run definition works');
  assertClose(r.geometry.slopePercent, 100 / 12, 'Percent exact (8.333...)');
  assertClose(r.geometry.ratioValue, 12, 'Ratio exactly 12');
  assertEqual(r.formatted.ratio, '1 : 12 ascending', 'Ratio carries direction');
  assertEqual(r.formatted.direction, '↑ ASCENDING', 'Ascending direction displayed');
  assertClose(r.geometry.flightLengthMeters, Math.sqrt(1.2 ** 2 + 14.4 ** 2), 'Flight length');
}

{
  const r = analyzeSlope({ mode: MODES.RISE_PERCENT, rise: 1.2, slopePercent: 100 / 12 });
  assert(r.valid, 'rise+percent definition works');
  assertClose(r.geometry.runMeters, 14.4, 'Run derived from rise+percent');
  assertClose(r.geometry.ratioValue, 12, 'Ratio agrees');
  assertEqual(r.formatted.ratio, '1 : 12 ascending', 'Ratio formatting from derived geometry');
}

{
  const r = analyzeSlope({ mode: MODES.RISE_RATIO, rise: 1.2, ratioValue: 12 });
  assert(r.valid, 'rise+ratio definition works');
  assertClose(r.geometry.runMeters, 14.4, 'run = rise × X');
  assertClose(r.geometry.slopePercent, 100 / 12, 'Percent agrees');
}

{
  const angleDeg = Math.atan2(1.2, 14.4) * 180 / Math.PI;
  const r = analyzeSlope({ mode: MODES.RISE_ANGLE, rise: 1.2, angleDegrees: angleDeg });
  assert(r.valid, 'rise+angle definition works');
  assertClose(r.geometry.runMeters, 14.4, 'run = rise / tan(angle)');
  assertClose(r.geometry.slopePercent, 100 / 12, 'Percent agrees via canonical path');
}

{
  const r = analyzeSlope({ mode: MODES.RUN_PERCENT, run: 14.4, slopePercent: 100 / 12 });
  assert(r.valid, 'run+percent definition works');
  assertClose(r.geometry.riseMeters, 1.2, 'rise = run × percent/100');
}

{
  const r = analyzeSlope({ mode: MODES.RUN_RATIO, run: 14.4, ratioValue: 12 });
  assert(r.valid, 'run+ratio definition works');
  assertClose(r.geometry.riseMeters, 1.2, 'rise = run / X');
  assertEqual(r.geometry.direction, SLOPE_DIRECTIONS.ASCENDING, 'Direction derived after solving');
}

{
  const angleDeg = Math.atan2(1.2, 14.4) * 180 / Math.PI;
  const r = analyzeSlope({ mode: MODES.RUN_ANGLE, run: 14.4, angleDegrees: angleDeg });
  assert(r.valid, 'run+angle definition works');
  assertClose(r.geometry.riseMeters, 1.2, 'rise = run × tan(angle)');
}

// ---------------------------------------------------------------------------
// 3. Signed geometry (descending)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Signed geometry ---');

{
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: -1.2, run: 14.4 });
  assert(r.valid, 'Negative rise accepted (drainage/terrain direction)');
  assertEqual(r.geometry.direction, SLOPE_DIRECTIONS.DESCENDING, 'Classified descending');
  assertEqual(r.formatted.direction, '↓ DESCENDING', 'Descending displayed');
  assertEqual(r.formatted.ratio, '1 : 12 descending', 'Sign convention: ratio carries direction words, not a negative sign');
  assertClose(r.geometry.slopePercent, -(100 / 12), 'Negative percent preserved internally');
}

{
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: -14.4 });
  assert(r.valid, 'Negative run accepted (reverse direction)');
  assertClose(r.geometry.slopePercent, -(100 / 12), 'Negative run flips slope sign');
  // Documented convention: direction follows the RISE sign (terrain height change);
  // a negative run represents traversing the same slope in the reverse direction.
  assertEqual(r.geometry.direction, SLOPE_DIRECTIONS.ASCENDING, 'Direction follows rise sign (reverse run documented)');
  assertClose(r.geometry.ratioValue, 12, 'Ratio magnitude stays positive per sign convention');
}

// ---------------------------------------------------------------------------
// 4. Validation & error codes
// ---------------------------------------------------------------------------
console.log('\n--- 4. Validation ---');

{
  const cases = [
    [{ mode: MODES.RISE_RUN, rise: 0, run: 10 }, SLOPE_ERROR_CODES.INVALID_RISE, 'zero rise'],
    [{ mode: MODES.RISE_RUN, rise: NaN, run: 10 }, SLOPE_ERROR_CODES.INVALID_RISE, 'NaN rise'],
    [{ mode: MODES.RISE_RUN, rise: Infinity, run: 10 }, SLOPE_ERROR_CODES.INVALID_RISE, 'Infinity rise'],
    [{ mode: MODES.RISE_RUN, rise: 1.2, run: 0 }, SLOPE_ERROR_CODES.INVALID_RUN, 'zero run'],
    [{ mode: MODES.RISE_RUN, rise: 1.2, run: NaN }, SLOPE_ERROR_CODES.INVALID_RUN, 'NaN run'],
    [{ mode: MODES.RISE_PERCENT, rise: 1.2, slopePercent: NaN }, SLOPE_ERROR_CODES.INVALID_PERCENT, 'NaN percent'],
    [{ mode: MODES.RISE_PERCENT, rise: 1.2, slopePercent: Infinity }, SLOPE_ERROR_CODES.INVALID_PERCENT, 'Infinity percent'],
    [{ mode: MODES.RISE_RATIO, rise: 1.2, ratioValue: 0 }, SLOPE_ERROR_CODES.INVALID_RATIO, 'zero ratio'],
    [{ mode: MODES.RISE_RATIO, rise: 1.2, ratioValue: -5 }, SLOPE_ERROR_CODES.INVALID_RATIO, 'negative ratio'],
    [{ mode: MODES.RISE_RATIO, rise: 1.2, ratioValue: NaN }, SLOPE_ERROR_CODES.INVALID_RATIO, 'NaN ratio'],
    [{ mode: MODES.RISE_ANGLE, rise: 1.2, angleDegrees: 0 }, SLOPE_ERROR_CODES.INVALID_ANGLE, 'zero angle'],
    [{ mode: MODES.RISE_ANGLE, rise: 1.2, angleDegrees: 90 }, SLOPE_ERROR_CODES.INVALID_ANGLE, '90° angle (tan singularity)'],
    [{ mode: MODES.RISE_ANGLE, rise: 1.2, angleDegrees: -95 }, SLOPE_ERROR_CODES.INVALID_ANGLE, 'beyond ±90° angle'],
    [{ mode: MODES.RISE_RUN, rise: 1.2 }, SLOPE_ERROR_CODES.MISSING_INPUT, 'missing run'],
    [{ mode: MODES.RUN_PERCENT, run: 14.4 }, SLOPE_ERROR_CODES.MISSING_INPUT, 'missing percent'],
    [{ mode: 'nonsense', rise: 1 }, SLOPE_ERROR_CODES.MISSING_INPUT, 'unknown mode'],
    [{ mode: MODES.RISE_PERCENT, rise: 1.2, slopePercent: 0.1 }, SLOPE_ERROR_CODES.INVALID_RUN, 'derived run beyond 500 m bound']
  ];
  for (const [input, expectedCode, label] of cases) {
    const r = analyzeSlope(input);
    assert(!r.valid, `${label} → controlled failure`);
    assertEqual(r.errorCode, expectedCode, `${label} error code`);
  }
}

{
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: { value: 1.2, unitKey: 'xyz' }, run: 14.4 });
  assert(!r.valid && r.errorCode === SLOPE_ERROR_CODES.INVALID_UNIT, 'Unknown unit → INVALID_UNIT via strict requireUnit');
}

// ---------------------------------------------------------------------------
// 5. Units through the REAL parser
// ---------------------------------------------------------------------------
console.log('\n--- 5. Units ---');

{
  const parsed = parseInput('1200mm', { allowNegative: false });
  const canonical = parsed.value * UNITS[parsed.detectedUnit].toMeters;
  assertClose(canonical, 1.2, 'Real parser: 1200mm → 1.2 m');
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: canonical, run: 14.4 });
  assertClose(r.geometry.slopePercent, 100 / 12, 'Canonical meters feed geometry identically');
}

{
  const ft = analyzeSlope({ mode: MODES.RISE_RUN, rise: { value: 4, unitKey: 'ft' }, run: { value: 12, unitKey: 'ft' } });
  assertClose(ft.geometry.slopePercent, (4 / 12) * 100, 'ft canonicalizes; slope is unit-independent');
  const mm = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4, displayUnit: 'mm', precision: 0 });
  assertEqual(mm.formatted.run, '14,400 mm', 'mm display formatting');
}

// ---------------------------------------------------------------------------
// 6. Consistency checking
// ---------------------------------------------------------------------------
console.log('\n--- 6. Consistency check ---');

{
  // Consistent redundant slope: 1.2/14.4 → 8.333...%
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4, checkSlopePercent: 100 / 12 });
  assertEqual(r.consistency.status, 'CONSISTENT', 'Matching redundant slope → CONSISTENT');
  assert(r.consistency.checks.length === 1, 'One check performed');
  assert(r.consistency.checks[0].consistent, 'The check itself passes');
}

{
  // Conflicting redundant slope: provided 8.33% but actual is 10% (1.2/12)
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 12, checkSlopePercent: 8.33 });
  assertEqual(r.consistency.status, 'CONFLICT', 'Mismatched redundant slope → CONFLICT');
  assert(r.consistency.conflict !== null, 'Conflict details present');
  assertClose(r.consistency.conflict.calculated, 10, 'Calculated slope reported');
  assertClose(r.consistency.conflict.provided, 8.33, 'Provided slope reported');
  assert(r.formatted.conflict && r.formatted.conflict.includes('CONFLICT'), 'Conflict surfaced in formatted output with numbers');
}

{
  // Tolerance is deterministic and documented
  assertEqual(CONSISTENCY_TOLERANCE, 0.0005, 'Tolerance is 0.05% relative (documented)');
  const withinTol = checkConsistency(100, 100 * (1 + 0.0004));
  assert(withinTol.consistent, 'Within tolerance → consistent');
  const beyondTol = checkConsistency(100, 100 * (1 + 0.0006));
  assert(!beyondTol.consistent, 'Beyond tolerance → conflict');
  const again = checkConsistency(100, 100 * (1 + 0.0004));
  assertEqual(withinTol.consistent, again.consistent, 'Tolerance check deterministic across calls');
}

// ---------------------------------------------------------------------------
// 7. Ratio formatting with direction
// ---------------------------------------------------------------------------
console.log('\n--- 7. Ratio formatting ---');

{
  assertEqual(formatSlopeRatio(12, SLOPE_DIRECTIONS.ASCENDING), '1 : 12 ascending', 'Integer ratio + direction');
  assertEqual(formatSlopeRatio(12.00000000002, SLOPE_DIRECTIONS.ASCENDING), '1 : 12 ascending', 'Float noise normalized');
  assertEqual(formatSlopeRatio(8.5, SLOPE_DIRECTIONS.DESCENDING), '1 : 8.5 descending', 'Decimal ratio + descending');
  assertEqual(formatSlopeRatio(0, SLOPE_DIRECTIONS.VERTICAL), '1 : 0', 'Vertical ratio documented as 1 : 0');
  assertEqual(formatSlopeRatio(Infinity, SLOPE_DIRECTIONS.FLAT), '—', 'Flat ratio honestly undefined');
}

// ---------------------------------------------------------------------------
// 8. Explanation & targets
// ---------------------------------------------------------------------------
console.log('\n--- 8. Explanation & target comparison ---');

{
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4 });
  const explanation = explainSlope(r);
  assert(explanation.includes('12') && explanation.includes('rises'), `Educational explanation built from actual geometry ("${explanation}")`);
  const down = analyzeSlope({ mode: MODES.RISE_RUN, rise: -1.2, run: 14.4 });
  assert(explainSlope(down).includes('falls'), 'Descending explanation uses "falls"');
}

{
  const comp = buildSlopeTargetComparison(1.2);
  assertEqual(comp.length, SLOPE_TARGETS.length, 'Comparison covers all fixed study targets');
  assertClose(comp.find(t => t.percent === 8.33).runMeters, 1.2 / 0.0833, '8.33% target run for 1.2 m rise');
  assertClose(comp.find(t => t.percent === 2).runMeters, 60, '2% drainage target → 60 m run');
  const comp2 = buildSlopeTargetComparison(1.2);
  assertEqual(JSON.stringify(comp), JSON.stringify(comp2), 'Target ordering deterministic');
  assertEqual(buildSlopeTargetComparison(0).length, 0, 'Non-positive rise magnitude yields empty comparison');
}

// ---------------------------------------------------------------------------
// 9. SVG geometry correspondence
// ---------------------------------------------------------------------------
console.log('\n--- 9. SVG diagram ---');

{
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4 });
  const svg = generateSlopeSVG(r);
  assert(svg.startsWith('<svg'), 'SVG generated');
  assert(svg.includes(r.formatted.rise) && svg.includes(r.formatted.run), 'Labels carry real values');
  assert(svg.includes('ASCENDING'), 'Direction label present');

  // Ascending: slope line endpoint must be ABOVE the baseline (smaller y)
  const lines = [...svg.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
  const slopeLine = lines[1];
  assert(slopeLine[3] < slopeLine[1], 'Ascending geometry renders upward');

  const r2 = analyzeSlope({ mode: MODES.RISE_RUN, rise: -1.2, run: 14.4 });
  const svg2 = generateSlopeSVG(r2);
  const lines2 = [...svg2.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
  assert(lines2[1][3] > lines2[1][1], 'Descending geometry renders downward');

  // Extreme ratio (1:100) triggers visual normalization disclosure
  const steepRatio = analyzeSlope({ mode: MODES.RISE_RUN, rise: 0.12, run: 12 });
  const svgSteep = generateSlopeSVG(steepRatio);
  assert(svgSteep.includes('visually normalized'), 'Extreme ratio discloses visual normalization');
  assert(svgSteep.includes('exact'), 'Normalization note states numeric values remain exact');
}

{
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4 });
  assertEqual(generateSlopeSVG(r), generateSlopeSVG(r), 'SVG generation deterministic');
}

// ---------------------------------------------------------------------------
// 10. Regression: ramps & stairs unchanged, shared math agrees
// ---------------------------------------------------------------------------
console.log('\n--- 10. Cross-engine regression (golden cases) ---');

{
  // Golden: 1.2 / 14.4 → ramps and slopes must agree exactly on all representations
  const ramp = calculateRamp({ mode: 'rise_run_direct', rise: 1.2, run: 14.4 });
  const slope = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4 });
  assertClose(ramp.geometry.slopePercent, slope.geometry.slopePercent, 'RAMP REGRESSION: percent identical');
  assertClose(ramp.geometry.ratioValue, slope.geometry.ratioValue, 'RAMP REGRESSION: ratio identical');
  assertClose(ramp.geometry.angleDegrees, slope.geometry.angleDegrees, 'RAMP REGRESSION: angle identical');
  assertClose(ramp.geometry.flightLengthMeters, slope.geometry.flightLengthMeters, 'RAMP REGRESSION: flight length identical');

  // Stairs direct mode agrees on the angle too
  const stair = calculateStair({ mode: 'rise_run_direct', totalRise: 1.2, totalRun: 14.4 });
  assertClose(stair.geometry.angleDegrees, slope.geometry.angleDegrees, 'STAIR REGRESSION: angle identical');
}

{
  // Ramp's own suite still passes (run separately by run-all); here pin one
  // ramp golden value to prove the shared extraction changed nothing:
  const ramp = calculateRamp({ mode: 'rise_available_run', rise: 1.2, run: 14.4 });
  assertEqual(ramp.formatted.ratio, '1 : 12', 'RAMP REGRESSION: ramp ratio formatting unchanged');
  assertClose(ramp.geometry.slopePercent, (1.2 / 14.4) * 100, 'RAMP REGRESSION: ramp percent unchanged');
}

// ---------------------------------------------------------------------------
// 11. Project store (real store, in-memory adapter)
// ---------------------------------------------------------------------------
console.log('\n--- 11. Project store ---');

{
  const map = new Map();
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
  const store = createProjectStore({ storage, generateId: () => 'proj-slopes' });
  store.createNewProject({ name: 'Terrain Study' });

  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: -1.2, run: 14.4 });
  const saved = store.updateProject(draft => {
    draft.decisions.push({
      id: 'dec-slope-1',
      kind: 'slope',
      name: 'Drainage fall study',
      createdAt: new Date().toISOString(),
      result: {
        mode: r.mode,
        riseMeters: r.geometry.riseMeters,
        runMeters: r.geometry.runMeters,
        slopePercent: r.geometry.slopePercent,
        ratioValue: r.geometry.ratioValue,
        angleDegrees: r.geometry.angleDegrees,
        direction: r.geometry.direction
      }
    });
    return draft;
  });
  assert(saved.ok, 'Slope decision saved through the real project store');

  const store2 = createProjectStore({ storage });
  const loaded = store2.loadProject();
  assert(loaded.ok && loaded.project, 'Project with saved slope reloads');
  const dec = loaded.project.decisions.find(d => d.id === 'dec-slope-1');
  assert(dec && dec.kind === 'slope', 'Saved slope decision found');
  assertEqual(dec.result.direction, 'descending', 'Signed direction survives round-trip');
  assertClose(dec.result.slopePercent, -(100 / 12), 'Negative slope survives round-trip');
  assert(!map.has('archiscale_slopes'), 'No slope-specific project silo key');
}

// ---------------------------------------------------------------------------
// 12. Journal (real HistoryService) & CAD (real payload builder)
// ---------------------------------------------------------------------------
console.log('\n--- 12. Journal & CAD ---');

{
  const before = HistoryService.getHistory().length;
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4 });
  HistoryService.addEntry({
    operation: 'Slope Analyzer',
    mode: 'Slopes',
    scaleStr: r.formatted.ratio,
    inputStr: `Rise ${r.formatted.rise}`,
    outputStr: `Run ${r.formatted.run} — ${r.formatted.slopePercent} — ${r.formatted.angle}`
  });
  const added = HistoryService.getHistory().slice(-1)[0];
  assertEqual(HistoryService.getHistory().length, before + 1, 'Slope entry added via real HistoryService');
  assertEqual(added.operation, 'Slope Analyzer', 'Slope journal content');
  HistoryService.removeEntry(added.id);
}

{
  const { buildCadHandoffPayload } = await import('../src/core/cad-targets.js');
  const r = analyzeSlope({ mode: MODES.RISE_RUN, rise: 1.2, run: 14.4 });
  const payload = buildCadHandoffPayload('manual', {
    rawText: [
      r.geometry.riseMeters * 1000,
      r.geometry.runMeters * 1000,
      r.geometry.flightLengthMeters * 1000
    ].map(v => v.toFixed(0)).join(' ')
  }, { targetId: 'rhino', modeId: 'raw', precision: 0 });
  assertEqual(payload.count, 3, 'Real CAD builder accepts real slope values');
  assert(payload.text.includes('1200') && payload.text.includes('14400'), 'CAD payload carries actual rise/run in mm');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
