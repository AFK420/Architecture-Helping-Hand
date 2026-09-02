/**
 * Architecture Helping Hand - Ramp Calculator Test Suite
 * Architectural Tools Phase: Ramps.
 *
 * Follows the regression rule: tests use REAL engine outputs (real parser
 * unit conversions, real store with in-memory adapter, real HistoryService,
 * real CAD handoff payload builder) — no mocks imitating property names.
 */

import {
  RAMP_REFERENCE_DEFAULTS,
  RAMP_TARGET_SLOPES,
  RAMP_INPUT_MODES,
  RAMP_ERROR_CODES,
  MAX_RUN_METERS,
  MAX_SLOPE_PERCENT,
  resolveRampReferences,
  evaluateRatioStatus,
  formatRatio,
  calculateRamp,
  analyzeAvailableRun,
  buildTargetComparison,
  formatRampResult,
  generateRampSVG
} from '../src/core/ramps.js';
import { calculateStair } from '../src/core/stairs.js';
import { createProjectStore } from '../src/services/store.js';
import { HistoryService } from '../src/services/history.js';
import { PROJECT_STORE_KEY } from '../src/core/project.js';
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

console.log('🧪 Running tests/ramps.test.js...');

const MODES = RAMP_INPUT_MODES;

// ---------------------------------------------------------------------------
// 1. Mode A — rise + desired slope
// ---------------------------------------------------------------------------
console.log('\n--- 1. Mode A: rise + desired slope ---');

{
  // 1.20 m rise at 8.33% → run = 1.2 / 0.0833 = 14.4057... m
  const r = calculateRamp({ mode: MODES.RISE_DESIRED_SLOPE, rise: { value: 1.2, unitKey: 'm' }, slopePercent: 8.33 });
  assert(r.valid, 'Mode A solves rise + desired slope');
  assertClose(r.geometry.runMeters, 1.2 / (8.33 / 100), 'Run = rise / (slope/100)');
  assertClose(r.geometry.slopePercent, 8.33, 'Slope percent echoed exactly');
  assertClose(r.geometry.ratioValue, r.geometry.runMeters / r.geometry.riseMeters, 'Ratio = run/rise');
  assertClose(r.geometry.angleDegrees, Math.atan2(r.geometry.riseMeters, r.geometry.runMeters) * 180 / Math.PI, 'Angle = atan2(rise, run) degrees');
  assertClose(r.geometry.flightLengthMeters, Math.sqrt(1.2 ** 2 + r.geometry.runMeters ** 2), 'Flight length = hypotenuse');
}

{
  // 1:12 exactness: rise 1.0 m at 1/12 slope → run exactly 12 m, ratio exactly 1:12
  const r = calculateRamp({ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.0, slopePercent: (100 / 12) });
  assertClose(r.geometry.runMeters, 12, '1:12 slope on 1 m rise → exactly 12 m run');
  assertEqual(r.formatted.ratio, '1 : 12', 'Ratio renders as clean 1 : 12 (no float noise)');
}

// ---------------------------------------------------------------------------
// 2. Mode B — rise + available run (with shortfall analysis)
// ---------------------------------------------------------------------------
console.log('\n--- 2. Mode B: rise + available run ---');

{
  // Spec example: 1.20 m rise, 14.40 m available → ~8.33%, 1:12
  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: { value: 1.2, unitKey: 'm' }, run: { value: 14.4, unitKey: 'm' } });
  assert(r.valid, 'Mode B solves rise + available run');
  assertClose(r.geometry.slopePercent, (1.2 / 14.4) * 100, 'Slope % = rise/run × 100');
  assertClose(r.geometry.ratioValue, 12, '14.4 / 1.2 = exactly 1:12');
  assertEqual(r.formatted.ratio, '1 : 12', 'Clean ratio display');
  assertClose(r.geometry.angleDegrees, Math.atan2(1.2, 14.4) * 180 / Math.PI, 'Angle from actual geometry');
}

{
  // Spec example: 1.20 m rise, 10 m available → steeper than the 1:12 target
  // but (10/1.2 = 8.33) still inside the configurable 1:8–1:20 study band.
  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 10 });
  assert(r.valid, 'Mode B still returns the achieved geometry');
  assertEqual(r.reference.status, 'within', '8.33:1 achieved ratio is inside the study band (though steeper than the 1:12 target)');
  const analysis = analyzeAvailableRun(1.2, 10);
  assert(!analysis.sufficient, 'Available-run analysis reports insufficient run for the 1:12 TARGET');
  assertClose(analysis.targetRunMeters, 14.4, 'Required run for 1:12 on 1.2 m rise = 14.4 m');
  assertClose(analysis.differenceMeters, 4.4, 'Difference = 14.4 − 10 = 4.4 m');
  assert(analysis.summary.includes('Insufficient'), 'Summary states insufficiency explicitly');
  assert(analysis.summary.includes('4.4'), 'Summary carries the shortfall');
}

{
  // Truly steeper than the whole band: 1.2 m over 8 m → 1:6.67 < min 8
  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 8 });
  assertEqual(r.reference.status, 'steeper', '1:6.67 is steeper than the configured band');
}

{
  // Sufficient case
  const analysis = analyzeAvailableRun(1.2, 15);
  assert(analysis.sufficient, 'Sufficient run detected');
  assert(analysis.summary.includes('Sufficient'), 'Summary states sufficiency');
}

// ---------------------------------------------------------------------------
// 3. Mode C — run + desired slope
// ---------------------------------------------------------------------------
console.log('\n--- 3. Mode C: run + desired slope ---');

{
  // Spec example: 12 m run at 8% → rise 0.96 m
  const r = calculateRamp({ mode: MODES.RUN_DESIRED_SLOPE, run: { value: 12, unitKey: 'm' }, slopePercent: 8 });
  assert(r.valid, 'Mode C solves run + desired slope');
  assertClose(r.geometry.riseMeters, 0.96, 'Rise = run × (slope/100)');
  assertClose(r.geometry.slopePercent, 8, 'Slope echoed');
  assertClose(r.geometry.ratioValue, 12.5, '12 / 0.96 = 12.5 → 1:12.5');
  assertEqual(r.formatted.ratio, '1 : 12.5', 'Non-integer ratio shown as controlled decimals (formatter strips trailing zeros)');
}

// ---------------------------------------------------------------------------
// 4. Mode D — direct rise + run
// ---------------------------------------------------------------------------
console.log('\n--- 4. Mode D: rise + run direct ---');

{
  const r = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: { value: 1.0, unitKey: 'm' }, run: { value: 8.5, unitKey: 'm' } });
  assert(r.valid, 'Mode D analyzes pure geometry');
  assertClose(r.geometry.slopePercent, (1 / 8.5) * 100, 'Slope %');
  assertClose(r.geometry.ratioValue, 8.5, 'Ratio 8.5');
  assertEqual(r.formatted.ratio, '1 : 8.5', 'Decimal ratio formatted without float noise');
  assertClose(r.geometry.angleDegrees, Math.atan2(1, 8.5) * 180 / Math.PI, 'Angle from atan2');
}

// ---------------------------------------------------------------------------
// 5. Ratio formatting stability
// ---------------------------------------------------------------------------
console.log('\n--- 5. Ratio formatting ---');

{
  assertEqual(formatRatio(12), '1 : 12', 'Integer ratio exact');
  assertEqual(formatRatio(12.00000000002), '1 : 12', 'Floating-point noise normalized to integer');
  assertEqual(formatRatio(8.5), '1 : 8.5', 'Non-integer ratio as controlled decimal');
  assertEqual(formatRatio(100 / 3), '1 : 33.33', 'Repeating decimal controlled (33.33)');
  assertEqual(formatRatio(0), '1 : —', 'Zero ratio placeholder');
  assertEqual(formatRatio(-3), '1 : —', 'Invalid ratio placeholder');
  assertEqual(formatRatio(NaN), '1 : —', 'NaN ratio placeholder');
}

// ---------------------------------------------------------------------------
// 6. Validation & error codes
// ---------------------------------------------------------------------------
console.log('\n--- 6. Validation ---');

{
  const cases = [
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 0, slopePercent: 8.33 }, RAMP_ERROR_CODES.INVALID_RISE, 'zero rise'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: -1.2, slopePercent: 8.33 }, RAMP_ERROR_CODES.INVALID_RISE, 'negative rise'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: NaN, slopePercent: 8.33 }, RAMP_ERROR_CODES.INVALID_RISE, 'NaN rise'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: Infinity, slopePercent: 8.33 }, RAMP_ERROR_CODES.INVALID_RISE, 'Infinity rise'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2, slopePercent: 0 }, RAMP_ERROR_CODES.INVALID_SLOPE, 'zero slope'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2, slopePercent: -8.33 }, RAMP_ERROR_CODES.NEGATIVE_SLOPE, 'negative slope'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2, slopePercent: NaN }, RAMP_ERROR_CODES.INVALID_SLOPE, 'NaN slope'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2, slopePercent: Infinity }, RAMP_ERROR_CODES.INVALID_SLOPE, 'Infinity slope'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2, slopePercent: 250 }, RAMP_ERROR_CODES.INVALID_SLOPE, 'slope beyond ramp band'],
    [{ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 0 }, RAMP_ERROR_CODES.INVALID_RUN, 'zero run'],
    [{ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: -14.4 }, RAMP_ERROR_CODES.INVALID_RUN, 'negative run'],
    [{ mode: MODES.RISE_RUN_DIRECT, rise: 1.2, run: NaN }, RAMP_ERROR_CODES.INVALID_RUN, 'NaN run'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2 }, RAMP_ERROR_CODES.MISSING_INPUT, 'missing slope'],
    [{ mode: MODES.RISE_RUN_DIRECT, rise: 1.2 }, RAMP_ERROR_CODES.MISSING_INPUT, 'missing run'],
    [{ mode: 'nonsense', rise: 1.2 }, RAMP_ERROR_CODES.MISSING_INPUT, 'unknown mode'],
    [{ mode: MODES.RISE_DESIRED_SLOPE, rise: 1.2, slopePercent: 0.5 }, RAMP_ERROR_CODES.INVALID_RUN, 'derived run beyond 200 m bound']
  ];
  for (const [input, expectedCode, label] of cases) {
    const r = calculateRamp(input);
    assert(!r.valid, `${label} → controlled failure`);
    assertEqual(r.errorCode, expectedCode, `${label} error code`);
  }
}

{
  // Invalid unit → INVALID_UNIT through the real strict unit system
  const r = calculateRamp({ mode: MODES.RISE_DESIRED_SLOPE, rise: { value: 1.2, unitKey: 'xyz' }, slopePercent: 8.33 });
  assert(!r.valid && r.errorCode === RAMP_ERROR_CODES.INVALID_UNIT, 'Unknown unit → INVALID_UNIT (strict requireUnit, no coercion)');
}

// ---------------------------------------------------------------------------
// 7. Units (REAL parser + unit system)
// ---------------------------------------------------------------------------
console.log('\n--- 7. Units ---');

{
  // Real parser: "1200mm" → value 1200, detectedUnit mm → canonical 1.2 m
  const parsed = parseInput('1200mm', { allowNegative: false });
  assert(parsed.isValid && parsed.detectedUnit === 'mm', 'Real parser detects mm suffix');
  const canonical = parsed.value * UNITS[parsed.detectedUnit].toMeters;
  assertClose(canonical, 1.2, 'Real unit conversion: 1200 mm = 1.2 m');

  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: canonical, run: { value: 14.4, unitKey: 'm' } });
  assertClose(r.geometry.slopePercent, (1.2 / 14.4) * 100, 'Canonical meters feed the geometry identically');

  // cm + ft paths through the same requireUnit
  const cm = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: { value: 120, unitKey: 'cm' }, run: { value: 14.4, unitKey: 'm' } });
  assertClose(cm.geometry.slopePercent, (1.2 / 14.4) * 100, 'cm input canonicalizes to meters');
  const ft = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: { value: 4, unitKey: 'ft' }, run: { value: 12, unitKey: 'ft' } });
  assertClose(ft.geometry.slopePercent, (4 / 12) * 100, 'ft input canonicalizes to meters (ratio is unit-independent)');
}

{
  // Display unit switches formatting only
  const m = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 14.4, displayUnit: 'm' });
  const mm = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 14.4, displayUnit: 'mm', precision: 0 });
  assertEqual(mm.formatted.run, '14,400 mm', 'mm display formatting');
  assertEqual(m.formatted.run, '14.4 m', 'm display formatting (trailing zeros stripped by app formatter)');
  assertClose(m.geometry.runMeters, mm.geometry.runMeters, 'Raw values identical across display units');
}

// ---------------------------------------------------------------------------
// 8. Reference system semantics
// ---------------------------------------------------------------------------
console.log('\n--- 8. Reference system ---');

{
  const refs = resolveRampReferences();
  assertEqual(refs.slope.label, 'Educational Reference (configurable)', 'Reference explicitly labelled educational/configurable');
  assert(refs.slope.note.toLowerCase().includes('verify'), 'Reference note tells the student to verify local requirements');
  assert(!JSON.stringify(refs).toLowerCase().includes('code compliant'), 'No "code compliant" language');
}

{
  const refs = resolveRampReferences({ slope: { targetRatio: 15, minRatio: 10, maxRatio: 20 } });
  assertEqual(refs.slope.targetRatio, 15, 'Target ratio override respected');
  assertEqual(refs.slope.minRatio, 10, 'Min ratio override respected');
  assertEqual(refs.slope.label, 'Educational Reference (configurable)', 'Unspecified fields fall back to defaults');
}

{
  assertEqual(evaluateRatioStatus(12, RAMP_REFERENCE_DEFAULTS.slope), 'within', '1:12 within 1:8–1:20 band');
  assertEqual(evaluateRatioStatus(7, RAMP_REFERENCE_DEFAULTS.slope), 'steeper', '1:7 steeper than band');
  assertEqual(evaluateRatioStatus(25, RAMP_REFERENCE_DEFAULTS.slope), 'shallower', '1:25 shallower than band');
}

{
  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 14.4 });
  assertEqual(r.reference.status, 'within', 'Reference status computed for a 1:12 ramp');
  assertEqual(r.formatted.referenceStatus, 'Within configured reference', 'Status uses configured-reference language');
  assert(r.formatted.referenceTargetRun.includes('14.4'), 'Reference target run reported (1.2 × 12 = 14.4)');
}

// ---------------------------------------------------------------------------
// 9. Target comparison system
// ---------------------------------------------------------------------------
console.log('\n--- 9. Target comparison ---');

{
  const comp = buildTargetComparison(1.2);
  assertEqual(comp.length, RAMP_TARGET_SLOPES.length, 'Comparison covers all fixed study targets');
  assertClose(comp[0].runMeters, 1.2 / 0.05, '5% target → run = rise/0.05');
  assertClose(comp[1].runMeters, 1.2 / 0.0833, '8.33% target run');
  assertClose(comp[2].runMeters, 12, '10% target on 1.2 m rise → exactly 12 m');
  // Deterministic ordering: identical calls → identical output
  const comp2 = buildTargetComparison(1.2);
  assertEqual(JSON.stringify(comp), JSON.stringify(comp2), 'Comparison ordering deterministic');
  // Runs strictly decrease as percent increases (monotonic sanity)
  let monotonic = true;
  for (let i = 1; i < comp.length; i++) {
    if (comp[i].runMeters >= comp[i - 1].runMeters) monotonic = false;
  }
  assert(monotonic, 'Higher percent targets demand shorter runs (monotonic)');
}

// ---------------------------------------------------------------------------
// 10. Boundary conditions
// ---------------------------------------------------------------------------
console.log('\n--- 10. Boundary conditions ---');

{
  const shallow = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 0.01, run: 100 });
  assert(shallow.valid, 'Very shallow slope (1%) computes');
  assertClose(shallow.geometry.slopePercent, 0.01, 'Shallow slope percent exact');

  const steep = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 1, run: 1.0001 });
  assert(steep.valid, 'Very steep slope (~100%) computes');
  assertClose(steep.geometry.angleDegrees, Math.atan2(1, 1.0001) * 180 / Math.PI, 'Steep angle from real geometry');

  const tiny = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 0.001, run: 0.012 });
  assert(tiny.valid && Math.abs(tiny.geometry.ratioValue - 12) < 1e-9, 'Very small values keep exact ratio (12)');

  const repeating = calculateRamp({ mode: MODES.RUN_DESIRED_SLOPE, run: 1, slopePercent: 100 / 3 });
  assertClose(repeating.geometry.riseMeters, 1 / 3, 'Repeating-decimal rise kept at full precision');
  assert(repeating.formatted.rise.length > 0, 'Repeating decimal formatted without error');
}

// ---------------------------------------------------------------------------
// 11. SVG geometry correspondence (REAL values, not string checks)
// ---------------------------------------------------------------------------
console.log('\n--- 11. SVG diagram ---');

{
  const r = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 1.2, run: 14.4, displayUnit: 'm' });
  const svg = generateRampSVG(r);
  assert(svg.startsWith('<svg'), 'SVG generated');
  assert(svg.includes(r.formatted.rise) && svg.includes(r.formatted.run), 'SVG labels carry the real formatted values');
  assert(svg.includes(r.formatted.slopePercent) && svg.includes(r.formatted.angle), 'SVG slope/angle labels match result');

  // Geometry correspondence: extract the slope line endpoints and verify
  // the rendered rise:run pixel ratio equals the numeric result.
  const nums = [...svg.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)];
  // The slope line is the second <line> (after baseline)
  const slope = nums[1].slice(1).map(Number);
  const pxRun = Math.abs(slope[2] - slope[0]);
  const pxRise = Math.abs(slope[3] - slope[1]);
  assertClose(pxRun / pxRise, 14.4 / 1.2, 'Rendered ramp run:rise ratio matches numeric geometry', 0.01);

  // Different geometry must produce different rendered ratio (not static art)
  const r2 = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 1.2, run: 6 });
  const svg2 = generateRampSVG(r2);
  const nums2 = [...svg2.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)];
  const slope2 = nums2[1].slice(1).map(Number);
  const ratio2 = Math.abs(slope2[2] - slope2[0]) / Math.abs(slope2[3] - slope2[1]);
  assert(Math.abs(ratio2 - pxRun / pxRise) > 0.1, 'Different inputs produce different rendered geometry (no static diagram)');
}

{
  const r = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 1.2, run: 14.4 });
  assertEqual(generateRampSVG(r), generateRampSVG(r), 'SVG generation deterministic');
}

// ---------------------------------------------------------------------------
// 12. Cross-check: stair module's angle math agrees on shared geometry
// ---------------------------------------------------------------------------
console.log('\n--- 12. Real cross-engine regression ---');

{
  // A 1.2 m rise over 14.4 m run must produce the identical angle from the
  // stairs engine (direct rise/run mode) and the ramps engine.
  const stair = calculateStair({ mode: 'rise_run_direct', totalRise: 1.2, totalRun: 14.4 });
  const ramp = calculateRamp({ mode: MODES.RISE_RUN_DIRECT, rise: 1.2, run: 14.4 });
  assertClose(stair.geometry.angleDegrees, ramp.geometry.angleDegrees, 'Stairs and ramps engines agree on atan2(rise, run)');
  assertClose(stair.geometry.slopePercent !== undefined ? stair.geometry.slopePercent : (1.2 / 14.4) * 100, ramp.geometry.slopePercent, 'Slope percent consistent');
}

// ---------------------------------------------------------------------------
// 13. Project store persistence (real store, in-memory adapter)
// ---------------------------------------------------------------------------
console.log('\n--- 13. Project store ---');

{
  const map = new Map();
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
  const store = createProjectStore({ storage, generateId: () => 'proj-ramps' });
  store.createNewProject({ name: 'Site Study' });

  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 14.4 });
  const saved = store.updateProject(draft => {
    draft.decisions.push({
      id: 'dec-ramp-1',
      kind: 'ramp',
      name: 'Entrance ramp',
      createdAt: new Date().toISOString(),
      result: {
        mode: r.mode,
        riseMeters: r.geometry.riseMeters,
        runMeters: r.geometry.runMeters,
        slopePercent: r.geometry.slopePercent,
        ratioValue: r.geometry.ratioValue,
        angleDegrees: r.geometry.angleDegrees,
        flightLengthMeters: r.geometry.flightLengthMeters,
        referenceStatus: r.reference.status
      }
    });
    return draft;
  });
  assert(saved.ok, 'Ramp decision saved through the real project store');

  const store2 = createProjectStore({ storage });
  const loaded = store2.loadProject();
  assert(loaded.ok && loaded.project, 'Project with saved ramp reloads');
  const dec = loaded.project.decisions.find(d => d.id === 'dec-ramp-1');
  assert(dec && dec.kind === 'ramp', 'Saved ramp decision found');
  assertClose(dec.result.slopePercent, (1.2 / 14.4) * 100, 'Slope percent survives round-trip');
  assertClose(dec.result.ratioValue, 12, 'Ratio survives round-trip');
  assert(map.get('archiscale_stairs_prefs') === undefined && !map.has('archiscale_ramps'), 'No ramp-specific project silo key created');
}

// ---------------------------------------------------------------------------
// 14. Journal (real HistoryService singleton bound to the real StorageService)
// ---------------------------------------------------------------------------
console.log('\n--- 14. Journal ---');

{
  // HistoryService is a singleton bound to the real StorageService (which
  // falls back to an in-memory Map when localStorage is absent — exactly the
  // environment tests run in). Exercise the REAL service directly.
  const before = HistoryService.getHistory().length;
  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 14.4 });
  HistoryService.addEntry({
    operation: 'Ramp Calculator',
    mode: 'Ramps',
    scaleStr: r.formatted.ratio,
    inputStr: `Rise ${r.formatted.rise}`,
    outputStr: `Run ${r.formatted.run} — ${r.formatted.slopePercent} — ${r.formatted.ratio} — ${r.formatted.angle}`
  });
  const entries = HistoryService.getHistory();
  assertEqual(entries.length, before + 1, 'Ramp entry added via real HistoryService');
  const added = entries[entries.length - 1];
  assertEqual(added.operation, 'Ramp Calculator', 'Ramp journal entry content');
  assert(added.outputStr.includes('1 : 12'), 'Journal entry carries the clean ratio string');
  assert(added.outputStr.includes(r.formatted.slopePercent), 'Journal entry carries the real slope percent');
  HistoryService.removeEntry(added.id);
  assertEqual(HistoryService.getHistory().length, before, 'Journal restored after test cleanup');
}

// ---------------------------------------------------------------------------
// 15. CAD handoff (real cad-targets payload builder)
// ---------------------------------------------------------------------------
console.log('\n--- 15. CAD handoff ---');

{
  // Feed REAL ramp numbers through the REAL CAD payload builder —
  // no mocks imitating field names.
  const { buildCadHandoffPayload } = await import('../src/core/cad-targets.js');
  const r = calculateRamp({ mode: MODES.RISE_AVAILABLE_RUN, rise: 1.2, run: 14.4 });

  const payload = buildCadHandoffPayload('manual', {
    rawText: [
      r.geometry.riseMeters * 1000,
      r.geometry.runMeters * 1000,
      r.geometry.flightLengthMeters * 1000
    ].map(v => v.toFixed(0)).join(' ')
  }, { targetId: 'rhino', modeId: 'raw', precision: 0 });

  assert(payload.valid !== false && payload.count === 3, 'Real CAD builder accepts real ramp values');
  // Flight length sqrt(1.2²+14.4²)=14.4499 m → 14450 mm (toFixed rounds 14449.91 up)
  assertEqual(payload.text, '1200\n14400\n14450', 'CAD payload: rise 1200, run 14400, flight 14450 mm');

  // Named schedule through the real TSV path
  const schedule = buildCadHandoffPayload('manual', {
    rawText: `Rise ${r.geometry.riseMeters * 1000}`
  }, { targetId: 'autocad', modeId: 'schedule' });
  assert(schedule.count >= 1, 'Schedule path processes ramp values');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
