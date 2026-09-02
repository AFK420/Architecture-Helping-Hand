/**
 * Architecture Helping Hand - Stair Calculator Test Suite
 * Architectural Tools Phase: Stairs.
 *
 * Covers the four input modes, validation/error codes, exact math, the
 * riser/going convention, deterministic candidate ranking, boundary
 * conditions, reference-range semantics, SVG-geometry correspondence,
 * and project-store persistence of a saved stair (real engines, no mocks).
 */

import {
  STAIR_REFERENCE_DEFAULTS,
  STAIR_INPUT_MODES,
  STAIR_ERROR_CODES,
  RISER_COUNT_MIN,
  RISER_COUNT_MAX,
  resolveStairReferences,
  evaluateRangeStatus,
  calculateStair,
  formatStairResult,
  generateStairSVG
} from '../src/core/stairs.js';
import { createProjectStore } from '../src/services/store.js';
import { PROJECT_STORE_KEY } from '../src/core/project.js';

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

console.log('🧪 Running tests/stairs.test.js...');

const MODES = STAIR_INPUT_MODES;

// ---------------------------------------------------------------------------
// 1. Mode A — rise + desired riser
// ---------------------------------------------------------------------------
console.log('\n--- 1. Mode A: rise + desired riser ---');

{
  // 2.80 m rise, desired 175 mm → exact split: 16 risers @ 175 mm
  const r = calculateStair({
    mode: MODES.RISE_DESIRED_RISER,
    totalRise: { value: 2.8, unitKey: 'm' },
    desiredRiser: { value: 175, unitKey: 'mm' },
    displayUnit: 'mm'
  });
  assert(r.valid, 'Mode A solves a clean 175 mm case');
  assertEqual(r.risers.count, 16, '2.8 m / 0.175 m = 16 risers exactly');
  assertClose(r.risers.heightMeters, 0.175, 'Riser height is exactly 175 mm');
  assertEqual(r.treads.count, 15, 'Convention: 16 risers → 15 goings');
  assert(r.convention.rule.includes('N - 1'), 'Convention rule is documented in the result');
  assertClose(r.geometry.totalRunMeters, 15 * r.treads.depthMeters, 'Total run = goings × tread');
  assertClose(r.proportion.twoRPlusTMeters, 2 * 0.175 + r.treads.depthMeters, '2R+T computed correctly');
  assertClose(r.geometry.angleDegrees, Math.atan2(2.8, r.geometry.totalRunMeters) * 180 / Math.PI, 'Angle = atan(rise/run) in degrees');
  assertClose(r.geometry.slopedLengthMeters, Math.sqrt(2.8 ** 2 + r.geometry.totalRunMeters ** 2), 'Flight length = sqrt(rise² + run²)');
}

{
  // 2.80 m rise, desired riser that does NOT divide evenly → candidates, no silent rounding
  const r = calculateStair({
    mode: MODES.RISE_DESIRED_RISER,
    totalRise: { value: 2800, unitKey: 'mm' },
    desiredRiser: { value: 180, unitKey: 'mm' },
    displayUnit: 'mm'
  });
  assert(r.valid, 'Mode A handles non-dividing rise');
  assertClose(2800 / r.risers.count, r.risers.heightMeters * 1000, 'Riser height = rise / count exactly (no silent rounding)');
  assert(Array.isArray(r.candidates) && r.candidates.length > 1, 'Candidate list presented (not one mysterious answer)');
  const counts = r.candidates.map(c => c.riserCount);
  assert(new Set(counts).size === counts.length, 'No duplicate riser counts among candidates');
}

// ---------------------------------------------------------------------------
// 2. Mode B — rise + riser count
// ---------------------------------------------------------------------------
console.log('\n--- 2. Mode B: rise + riser count ---');

{
  const r = calculateStair({
    mode: MODES.RISE_RISER_COUNT,
    totalRise: { value: 2.8, unitKey: 'm' },
    riserCount: 16,
    desiredTread: { value: 300, unitKey: 'mm' },
    displayUnit: 'mm'
  });
  assert(r.valid, 'Mode B solves with explicit count');
  assertClose(r.risers.heightMeters, 0.175, '16 risers over 2.8 m = 175 mm riser');
  assertClose(r.treads.depthMeters, 0.3, 'Supplied tread respected exactly');
  assertEqual(r.treads.count, 15, '15 goings');
  assertClose(r.geometry.totalRunMeters, 4.5, 'Total run = 15 × 300 mm = 4.5 m');
}

{
  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16.5 });
  assert(!r.valid, 'Fractional riser count rejected');
  assertEqual(r.errorCode, STAIR_ERROR_CODES.NON_INTEGER_RISERS, 'NON_INTEGER_RISERS error code');
  assert(r.errorMessage.includes('whole number'), 'Fractional error message mentions whole number');
}

// ---------------------------------------------------------------------------
// 3. Mode C — rise + available run
// ---------------------------------------------------------------------------
console.log('\n--- 3. Mode C: rise + available run ---');

{
  const r = calculateStair({
    mode: MODES.RISE_AVAILABLE_RUN,
    totalRise: { value: 2.8, unitKey: 'm' },
    availableRun: { value: 4.8, unitKey: 'm' },
    displayUnit: 'mm'
  });
  assert(r.valid, 'Mode C finds a feasible stair');
  assert(r.geometry.totalRunMeters <= 4.8 + 1e-9, 'Best candidate fits the available run');
  assert(Array.isArray(r.candidates) && r.candidates.every(c => c.geometry.totalRunMeters <= 4.8 + 1e-9), 'All presented candidates fit the run');
}

{
  // Impossibly small run for the minimum-tread objective
  const r = calculateStair({
    mode: MODES.RISE_AVAILABLE_RUN,
    totalRise: { value: 2.8, unitKey: 'm' },
    availableRun: { value: 0.5, unitKey: 'm' }
  });
  assert(!r.valid, 'No feasible candidate → controlled failure, not invented geometry');
  assertEqual(r.errorCode, STAIR_ERROR_CODES.INSUFFICIENT_RUN, 'INSUFFICIENT_RUN error code');
  assert(r.detail && r.detail.note.length > 0, 'Failure detail explains why no candidate is acceptable');
}

// ---------------------------------------------------------------------------
// 4. Mode D — direct rise + run
// ---------------------------------------------------------------------------
console.log('\n--- 4. Mode D: rise + run direct ---');

{
  const r = calculateStair({
    mode: MODES.RISE_RUN_DIRECT,
    totalRise: { value: 2.8, unitKey: 'm' },
    totalRun: { value: 4.8, unitKey: 'm' },
    displayUnit: 'mm'
  });
  assert(r.valid, 'Mode D analyzes pure geometry');
  assertClose(r.geometry.angleDegrees, Math.atan2(2.8, 4.8) * 180 / Math.PI, 'Angle from atan2(rise, run)');
  assertClose(r.geometry.slopePercent, (2.8 / 4.8) * 100, 'Slope percent = rise/run × 100');
  assertClose(r.geometry.riseRunRatio, 2.8 / 4.8, 'Rise:run ratio');
  assertClose(r.geometry.slopedLengthMeters, Math.sqrt(2.8 ** 2 + 4.8 ** 2), 'Sloped length = hypotenuse');
  assert(r.interpretation && r.interpretation.derived, 'Whole-riser interpretation offered when in range');
  assertEqual(r.interpretation.riserCount, Math.round(2.8 / 0.16), 'Interpretation uses the riser reference midpoint');
  assert(r.interpretation.note.includes('not an exact solution') || r.interpretation.note.includes('interpretation'), 'Interpretation labelled explicitly');
}

{
  // Extreme geometry: no valid riser interpretation
  const r = calculateStair({ mode: MODES.RISE_RUN_DIRECT, totalRise: 0.05, totalRun: 9.0 });
  assert(r.valid, 'Shallow wedge still returns geometry');
  assert(!r.risers, 'No riser interpretation forced for out-of-range geometry');
  assert(r.interpretation && !r.interpretation.derived, 'Interpretation honestly reports derivation impossible');
}

// ---------------------------------------------------------------------------
// 5. Validation & error codes
// ---------------------------------------------------------------------------
console.log('\n--- 5. Validation ---');

{
  const cases = [
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: 0, desiredRiser: 0.175 }, STAIR_ERROR_CODES.INVALID_RISE, 'zero rise'],
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: -2.8, desiredRiser: 0.175 }, STAIR_ERROR_CODES.INVALID_RISE, 'negative rise'],
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: NaN, desiredRiser: 0.175 }, STAIR_ERROR_CODES.INVALID_RISE, 'NaN rise'],
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: Infinity, desiredRiser: 0.175 }, STAIR_ERROR_CODES.INVALID_RISE, 'Infinity rise'],
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: 2.8, desiredRiser: 0 }, STAIR_ERROR_CODES.INVALID_RISER, 'zero riser'],
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: 2.8, desiredRiser: -0.175 }, STAIR_ERROR_CODES.INVALID_RISER, 'negative riser'],
    [{ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 1 }, STAIR_ERROR_CODES.RISERS_OUT_OF_RANGE, 'too few risers'],
    [{ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 61 }, STAIR_ERROR_CODES.RISERS_OUT_OF_RANGE, 'too many risers'],
    [{ mode: MODES.RISE_RUN_DIRECT, totalRise: 2.8, totalRun: 0 }, STAIR_ERROR_CODES.INVALID_RUN, 'zero run'],
    [{ mode: MODES.RISE_AVAILABLE_RUN, totalRise: 2.8, availableRun: -1 }, STAIR_ERROR_CODES.INVALID_RUN, 'negative run'],
    [{ mode: 'nonsense_mode', totalRise: 2.8 }, null, 'unknown mode'],
    [{ mode: MODES.RISE_DESIRED_RISER, totalRise: 20, desiredRiser: 0.175 }, STAIR_ERROR_CODES.INVALID_RISE, 'rise beyond 10 m bound']
  ];

  for (const [input, expectedCode, label] of cases) {
    const r = calculateStair(input);
    assert(!r.valid, `${label} → controlled failure`);
    if (expectedCode) assertEqual(r.errorCode, expectedCode, `${label} error code`);
    else assert(typeof r.errorCode === 'string' && r.errorMessage.length > 0, `${label} reports an error message`);
  }
}

{
  // Invalid unit rejected through requireUnit — controlled INVALID_UNIT result
  const r = calculateStair({ mode: MODES.RISE_DESIRED_RISER, totalRise: { value: 2.8, unitKey: 'xyz' }, desiredRiser: 0.175 });
  assert(!r.valid, 'Unknown unit yields controlled failure (strict unit validation, no silent coercion)');
  assertEqual(r.errorCode, STAIR_ERROR_CODES.INVALID_UNIT, 'INVALID_UNIT error code');
}

// ---------------------------------------------------------------------------
// 6. Reference ranges & semantics
// ---------------------------------------------------------------------------
console.log('\n--- 6. Reference ranges ---');

{
  const refs = resolveStairReferences();
  assertEqual(refs.blondel.label, 'Educational Heuristic (Blondel, configurable)', 'Blondel labelled as configurable heuristic');
  assertEqual(refs.riser.label, 'Typical Reference (configurable)', 'Riser range labelled as typical reference');
  assert(!JSON.stringify(refs).toLowerCase().includes('code compliant'), 'No "code compliant" language anywhere in references');
}

{
  // User overrides win field-by-field
  const refs = resolveStairReferences({ riser: { minMeters: 0.15, maxMeters: 0.18 } });
  assertClose(refs.riser.minMeters, 0.15, 'Riser override min respected');
  assertClose(refs.riser.maxMeters, 0.18, 'Riser override max respected');
  assertEqual(refs.riser.label, 'Typical Reference (configurable)', 'Unspecified label falls back to default');
  assertEqual(refs.blondel.minMeters, STAIR_REFERENCE_DEFAULTS.blondel.minMeters, 'Untouched ranges keep defaults');
}

{
  assertEqual(evaluateRangeStatus(0.175, STAIR_REFERENCE_DEFAULTS.riser), 'within', '175 mm riser within typical range');
  assertEqual(evaluateRangeStatus(0.10, STAIR_REFERENCE_DEFAULTS.riser), 'below', '100 mm riser below range');
  assertEqual(evaluateRangeStatus(0.25, STAIR_REFERENCE_DEFAULTS.riser), 'above', '250 mm riser above range');
}

{
  // Status text never claims compliance
  const r = calculateStair({ mode: MODES.RISE_DESIRED_RISER, totalRise: 2.8, desiredRiser: 0.175, displayUnit: 'mm' });
  assert(/Within configured reference range|Below configured reference range|Above configured reference range/.test(r.formatted.proportionStatus), 'Proportion status uses reference-range language');
}

// ---------------------------------------------------------------------------
// 7. Candidate ranking determinism
// ---------------------------------------------------------------------------
console.log('\n--- 7. Candidate ranking ---');

{
  const input = { mode: MODES.RISE_DESIRED_RISER, totalRise: { value: 2.8, unitKey: 'm' }, desiredRiser: { value: 175, unitKey: 'mm' }, displayUnit: 'mm' };
  const a = calculateStair(input);
  const b = calculateStair(input);
  assertDeepEqualStub(a.candidates.map(c => c.riserCount), b.candidates.map(c => c.riserCount), 'Two identical calls produce identical candidate order');
}

function assertDeepEqualStub(actual, expected, message) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

{
  // 16-riser solution (exact 175 mm, mid-Blondel tread) should rank first
  const r = calculateStair({ mode: MODES.RISE_DESIRED_RISER, totalRise: 2.8, desiredRiser: { value: 175, unitKey: 'mm' } });
  assertEqual(r.risers.count, 16, '16-riser solution ranked first for exact-proportion case');
  // 15 and 17 must both appear as alternatives
  const counts = r.candidates.map(c => c.riserCount);
  assert(counts.includes(15) && counts.includes(17), 'Adjacent riser counts offered as alternatives');
}

// ---------------------------------------------------------------------------
// 8. Boundary conditions
// ---------------------------------------------------------------------------
console.log('\n--- 8. Boundary conditions ---');

{
  const small = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 0.28, riserCount: 2, desiredTread: 0.25 });
  assert(small.valid && small.risers.count === 2, 'Tiny stair (280 mm rise, 2 risers) computes');
  assertClose(small.risers.heightMeters, 0.14, 'Tiny stair riser height exact');

  const large = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 9.9, riserCount: 60, desiredTread: 0.28 });
  assert(large.valid && large.risers.count === 60, 'Large stair (9.9 m rise, 60 risers) computes');
  assertEqual(RISER_COUNT_MIN, 2, 'Riser minimum is 2');
  assertEqual(RISER_COUNT_MAX, 60, 'Riser maximum is 60');
}

{
  // Precision edge: rise that produces repeating decimals
  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 1, riserCount: 3, desiredTread: 0.3 });
  assertClose(r.risers.heightMeters, 1 / 3, '1 m over 3 risers = 1/3 m (full precision kept)');
  assert(r.formatted.riser.length > 0, 'Formatted riser string produced despite repeating decimal');
}

// ---------------------------------------------------------------------------
// 9. Formatting separation
// ---------------------------------------------------------------------------
console.log('\n--- 9. Formatting ---');

{
  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16, desiredTread: 0.3, displayUnit: 'mm', precision: 0 });
  assertEqual(r.formatted.riser, '175 mm', 'Riser formatted in mm');
  assertEqual(r.formatted.tread, '300 mm', 'Tread formatted in mm');
  assertEqual(r.formatted.totalRun, '4,500 mm', 'Run formatted in mm (existing formatter groups thousands)');
  assert(r.formatted.angle.includes('°'), 'Angle string carries degree symbol');
  assert(r.formatted.slopePercent.includes('%'), 'Slope percent string carries %');

  const m = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16, desiredTread: 0.3, displayUnit: 'm', precision: 2 });
  assertEqual(m.formatted.totalRun, '4.5 m', 'Display unit switch changes formatting only, not math (trailing zeros stripped by formatter)');
  assertClose(m.geometry.totalRunMeters, r.geometry.totalRunMeters, 'Raw canonical values identical across display units');
}

// ---------------------------------------------------------------------------
// 10. SVG diagram corresponds to actual geometry
// ---------------------------------------------------------------------------
console.log('\n--- 10. SVG diagram ---');

{
  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16, desiredTread: 0.3, displayUnit: 'mm' });
  const svg = generateStairSVG(r);
  assert(svg.startsWith('<svg'), 'SVG markup generated');
  assert(svg.includes('aria-label') && svg.includes('16 risers, 15 goings'), 'SVG aria-label carries actual riser/going counts');
  assert(svg.includes(r.formatted.totalRun), 'SVG run label matches formatted result');
  assert(svg.includes(r.formatted.totalRise), 'SVG rise label matches formatted result');
  assert(svg.includes(r.formatted.angle), 'SVG angle label matches computed angle');

  // Proportionality probe: path coordinates must reflect the real geometry.
  // Extract the path and verify its total horizontal span against scale math.
  const pathD = svg.match(/d="([^"]+)"/)[1];
  const coords = [...pathD.matchAll(/L ([\d.]+) ([\d.]+)/g)].map(m => [parseFloat(m[1]), parseFloat(m[2])]);
  const maxX = Math.max(...coords.map(c => c[0]));
  const minX = Math.min(...coords.map(c => c[0]));
  const maxY = Math.min(...coords.map(c => c[1]));
  const minY = Math.max(...coords.map(c => c[1]));
  const pxRun = maxX - minX;
  const pxRise = minY - maxY;
  const expectedRatio = r.geometry.totalRunMeters / r.input.totalRiseMeters;
  assertClose(pxRun / pxRise, expectedRatio, 'SVG step-outline run:rise ratio matches calculated geometry', 1e-3);
  // Path "L" commands: N risers (up) + N-1 goings (forward) + 1 closing drop = 2N
  assertEqual(coords.length, r.risers.count * 2, 'Path segment count corresponds to riser/goings structure');
}

{
  // Deterministic output
  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16, desiredTread: 0.3 });
  assertEqual(generateStairSVG(r), generateStairSVG(r), 'SVG generation is deterministic');
}

// ---------------------------------------------------------------------------
// 11. Project store persistence (real store, in-memory adapter)
// ---------------------------------------------------------------------------
console.log('\n--- 11. Project store persistence ---');

{
  const map = new Map();
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k)
  };
  const store = createProjectStore({ storage, generateId: () => 'proj-stairs' });
  store.createNewProject({ name: 'Stair Study' });

  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16, desiredTread: 0.3 });
  const saved = store.updateProject(draft => {
    draft.decisions.push({
      id: 'dec-stair-1',
      kind: 'stair',
      name: 'Main flight',
      result: {
        mode: r.mode,
        riserCount: r.risers.count,
        riserHeightMeters: r.risers.heightMeters,
        treadDepthMeters: r.treads.depthMeters,
        totalRunMeters: r.geometry.totalRunMeters,
        angleDegrees: r.geometry.angleDegrees
      }
    });
    return draft;
  });
  assert(saved.ok, 'Stair decision saved through the project store');

  // Round-trip through a second store instance
  const store2 = createProjectStore({ storage });
  const loaded = store2.loadProject();
  assert(loaded.ok && loaded.project, 'Project with saved stair reloads');
  const dec = loaded.project.decisions.find(d => d.id === 'dec-stair-1');
  assert(dec && dec.result.riserCount === 16, 'Saved stair result survives persistence');
  assertClose(dec.result.riserHeightMeters, 0.175, 'Saved stair riser height intact after round-trip');
  assert(storage.getItem('archiscale_dimension_workspace') === null, 'Store does not create stair-specific silo keys');
}

// ---------------------------------------------------------------------------
// 12. Regression: real engine outputs (no mocks)
// ---------------------------------------------------------------------------
console.log('\n--- 12. Regression ---');

{
  // Golden values hand-computed: rise 2.8, 16 risers, tread 0.3
  const r = calculateStair({ mode: MODES.RISE_RISER_COUNT, totalRise: 2.8, riserCount: 16, desiredTread: 0.3 });
  assertClose(r.geometry.totalRunMeters, 4.5, 'Golden: run 15 × 0.3 = 4.5 m');
  assertClose(r.geometry.angleDegrees, Math.atan2(2.8, 4.5) * 180 / Math.PI, 'Golden: angle atan2(2.8, 4.5)', 1e-9);
  assertClose(r.geometry.slopedLengthMeters, Math.sqrt(2.8 ** 2 + 4.5 ** 2), 'Golden: flight length');
  assertClose(r.proportion.twoRPlusTMeters, 0.65, 'Golden: 2(0.175) + 0.3 = 0.65 m');
  assertEqual(r.proportion.status, 'within', 'Golden: 0.65 m inside 0.60-0.66 Blondel band');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
