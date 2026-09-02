/**
 * Architecture Helping Hand - Slope Analyzer Core
 * Architectural Tools Phase: Slopes (general rise/run analysis).
 *
 * Purpose: a universal "I have a rise/run relationship and I want to
 * understand it" tool — site studies, terrain, roof slopes, drainage
 * direction, path gradients, ramp/stair analysis. It is deliberately NOT a
 * civil engineering, grading, terrain, or compliance application.
 *
 * Key behaviors (documented contract, see SLOPES.md):
 *  - ONE canonical math source: all conversions come from slope-math.js,
 *    which the Ramp Calculator also consumes. No second formula exists.
 *  - SIGNED geometry: positive rise = ascending, negative = descending.
 *    Unlike the Ramp Calculator (ascent-only), negative values are valid
 *    here because drainage/terrain direction is architecturally meaningful.
 *  - Structured singularities: vertical (run = 0) and flat (rise = 0) are
 *    classified explicitly — never fabricated as normal slopes.
 *  - CONSISTENCY CHECK: when redundant inputs are supplied they are compared
 *    against the calculated geometry with a documented deterministic
 *    tolerance; conflicts are reported with numeric differences.
 *
 * Supported definitions (each solves the missing geometry, then routes
 * through the canonical conversion so all representations agree):
 *   rise+run, rise+percent, rise+ratio, rise+angle,
 *   run+percent, run+ratio, run+angle
 * Redundant pairs (percent+ratio, percent+angle, ratio+angle) are NOT
 * separate modes: they are rise/run definitions plus consistency checks —
 * a redundant pair without a rise or run has no absolute geometry.
 */

import { requireFiniteNumber } from './calculator.js';
import { requireUnit, UNITS } from './units.js';
import { formatNumber, formatFeetInches } from './formatter.js';
import {
  SLOPE_DIRECTIONS,
  slopeFromGeometry,
  runFromRiseAndPercent,
  riseFromRunAndPercent,
  runFromRiseAndRatio,
  riseFromRunAndRatio,
  runFromRiseAndAngle,
  riseFromRunAndAngle
} from './slope-math.js';

/** Input definition identifiers (primary + alternates; advanced pairs are consistency checks). */
export const SLOPE_INPUT_MODES = Object.freeze({
  RISE_RUN: 'rise_run',
  RISE_PERCENT: 'rise_percent',
  RISE_RATIO: 'rise_ratio',
  RISE_ANGLE: 'rise_angle',
  RUN_PERCENT: 'run_percent',
  RUN_RATIO: 'run_ratio',
  RUN_ANGLE: 'run_angle'
});

/** Stable validation error codes. */
export const SLOPE_ERROR_CODES = Object.freeze({
  INVALID_RISE: 'INVALID_RISE',
  INVALID_RUN: 'INVALID_RUN',
  INVALID_PERCENT: 'INVALID_PERCENT',
  INVALID_RATIO: 'INVALID_RATIO',
  INVALID_ANGLE: 'INVALID_ANGLE',
  INVALID_UNIT: 'INVALID_UNIT',
  MISSING_INPUT: 'MISSING_INPUT',
  NON_FINITE_RESULT: 'NON_FINITE_RESULT'
});

/** Explicit, documented consistency tolerance: 0.05% relative difference. */
export const CONSISTENCY_TOLERANCE = 0.0005;

/** Fixed study targets for the comparison table (design values, not laws). */
export const SLOPE_TARGETS = Object.freeze([
  Object.freeze({ percent: 1.0, note: 'Drainage fall — minimum usable fall for water' }),
  Object.freeze({ percent: 2.0, note: 'Typical minimum drainage / pavement crossfall' }),
  Object.freeze({ percent: 5.0, note: 'Gentle site path / ramp study bound' }),
  Object.freeze({ percent: 8.33, note: '1:12 — widely taught accessibility reference' }),
  Object.freeze({ percent: 12.5, note: '1:8 — steep ramp study bound' }),
  Object.freeze({ percent: 45, note: '1:1 — 45°; practical limit for planted slopes' }),
  Object.freeze({ percent: 100, note: '1:1 rise/run at 45°… actually 100% = 45°; 200% = 63.4°' })
]);

/** Practical bound on |run| for the analyzer (500 m). */
export const MAX_SLOPE_RUN_METERS = 500;

/** Angle input bound: |angle| ≤ 89.9° avoids the tan(90°) singularity. */
export const MAX_ANGLE_DEGREES = 89.9;

function requireLengthSigned(input, paramName, errorCode, { allowZero = false } = {}) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const unitDef = requireUnit(input.unitKey, 'length');
    if (typeof input.value !== 'number' || !isFinite(input.value) || (!allowZero && input.value === 0)) {
      const err = new Error(`${paramName} must be a finite non-zero number.`);
      err.code = errorCode;
      throw err;
    }
    if (input.value < 0 && !allowZero) {
      // signed values are fine; only magnitude-0 rejected here
    }
    return input.value * unitDef.toMeters;
  }
  if (typeof input !== 'number' || !isFinite(input) || (!allowZero && input === 0)) {
    const err = new Error(`${paramName} must be a finite non-zero number.`);
    err.code = errorCode;
    throw err;
  }
  return input;
}

/**
 * Consistency comparison with a documented relative tolerance.
 * @returns {{ consistent: boolean, difference: number }}
 */
export function checkConsistency(calculated, provided) {
  if (typeof calculated !== 'number' || !isFinite(calculated) ||
      typeof provided !== 'number' || !isFinite(provided)) {
    return { consistent: false, difference: NaN };
  }
  const difference = calculated - provided;
  const denominator = Math.max(Math.abs(calculated), Math.abs(provided), 1e-9);
  const relativeDiff = Math.abs(difference) / denominator;
  return { consistent: relativeDiff <= CONSISTENCY_TOLERANCE, difference };
}

/**
 * Main slope analysis entry point.
 *
 * @param {Object} input
 * @param {string} input.mode - one of SLOPE_INPUT_MODES
 * @param {number|{value,unitKey}} [input.rise] - signed rise
 * @param {number|{value,unitKey}} [input.run] - signed run
 * @param {number} [input.slopePercent] - signed percent
 * @param {number} [input.ratioValue] - ratio as a number X (of 1 : X); positive
 * @param {number} [input.angleDegrees] - signed angle
 * @param {number} [input.checkSlopePercent] - optional redundant percent for consistency check
 * @param {number} [input.checkRatioValue] - optional redundant ratio for consistency check
 * @param {number} [input.checkAngleDegrees] - optional redundant angle for consistency check
 * @param {string} [input.displayUnit='m']
 * @param {number} [input.precision=2]
 * @returns {Object} structured result or { valid: false, errorCode, errorMessage }
 */
export function analyzeSlope(input = {}) {
  const mode = input.mode || SLOPE_INPUT_MODES.RISE_RUN;
  const displayUnit = input.displayUnit || 'm';
  const precision = typeof input.precision === 'number' ? Math.max(0, Math.min(4, input.precision)) : 2;

  if (!Object.values(SLOPE_INPUT_MODES).includes(mode)) {
    return { valid: false, errorCode: SLOPE_ERROR_CODES.MISSING_INPUT, errorMessage: `Unknown slope input mode: "${mode}"` };
  }

  let riseMeters = null;
  let runMeters = null;

  // ---- resolve the rise/run geometry from the definition ----
  try {
    if (mode === SLOPE_INPUT_MODES.RISE_RUN) {
      if (input.rise === undefined || input.run === undefined) {
        const err = new Error('This definition requires both rise and run.');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthSigned(input.rise, 'Rise', SLOPE_ERROR_CODES.INVALID_RISE);
      runMeters = requireLengthSigned(input.run, 'Run', SLOPE_ERROR_CODES.INVALID_RUN);
    } else if (mode === SLOPE_INPUT_MODES.RISE_PERCENT) {
      if (input.rise === undefined || input.slopePercent === undefined) {
        const err = new Error('This definition requires rise and slope percent.');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthSigned(input.rise, 'Rise', SLOPE_ERROR_CODES.INVALID_RISE);
      if (typeof input.slopePercent !== 'number' || !isFinite(input.slopePercent)) {
        const err = new Error('Slope percent must be a finite number.');
        err.code = SLOPE_ERROR_CODES.INVALID_PERCENT;
        throw err;
      }
      if (input.slopePercent === 0) {
        // 0% with a nonzero rise is contradictory — treat as invalid percent
        const err = new Error('A 0% slope cannot produce a non-zero rise. Use the Rise + Run definition for flat geometry.');
        err.code = SLOPE_ERROR_CODES.INVALID_PERCENT;
        throw err;
      }
      runMeters = runFromRiseAndPercent(riseMeters, input.slopePercent);
    } else if (mode === SLOPE_INPUT_MODES.RISE_RATIO) {
      if (input.rise === undefined || input.ratioValue === undefined) {
        const err = new Error('This definition requires rise and ratio (1 : X).');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthSigned(input.rise, 'Rise', SLOPE_ERROR_CODES.INVALID_RISE);
      if (typeof input.ratioValue !== 'number' || !isFinite(input.ratioValue) || input.ratioValue <= 0) {
        const err = new Error('Ratio must be a finite positive number X (of 1 : X).');
        err.code = SLOPE_ERROR_CODES.INVALID_RATIO;
        throw err;
      }
      runMeters = runFromRiseAndRatio(riseMeters, input.ratioValue);
    } else if (mode === SLOPE_INPUT_MODES.RISE_ANGLE) {
      if (input.rise === undefined || input.angleDegrees === undefined) {
        const err = new Error('This definition requires rise and angle.');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthSigned(input.rise, 'Rise', SLOPE_ERROR_CODES.INVALID_RISE);
      if (typeof input.angleDegrees !== 'number' || !isFinite(input.angleDegrees) ||
          Math.abs(input.angleDegrees) === 0 || Math.abs(input.angleDegrees) >= 90) {
        const err = new Error(`Angle must be finite and strictly between -90° and +90° (±${MAX_ANGLE_DEGREES}° supported).`);
        err.code = SLOPE_ERROR_CODES.INVALID_ANGLE;
        throw err;
      }
      runMeters = runFromRiseAndAngle(riseMeters, input.angleDegrees);
      if (!isFinite(runMeters)) {
        const err = new Error('The supplied angle produces an undefined run (vertical limit).');
        err.code = SLOPE_ERROR_CODES.NON_FINITE_RESULT;
        throw err;
      }
    } else if (mode === SLOPE_INPUT_MODES.RUN_PERCENT) {
      if (input.run === undefined || input.slopePercent === undefined) {
        const err = new Error('This definition requires run and slope percent.');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      runMeters = requireLengthSigned(input.run, 'Run', SLOPE_ERROR_CODES.INVALID_RUN);
      if (typeof input.slopePercent !== 'number' || !isFinite(input.slopePercent) || input.slopePercent === 0) {
        const err = new Error('Slope percent must be a finite non-zero number.');
        err.code = SLOPE_ERROR_CODES.INVALID_PERCENT;
        throw err;
      }
      riseMeters = riseFromRunAndPercent(runMeters, input.slopePercent);
    } else if (mode === SLOPE_INPUT_MODES.RUN_RATIO) {
      if (input.run === undefined || input.ratioValue === undefined) {
        const err = new Error('This definition requires run and ratio (1 : X).');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      runMeters = requireLengthSigned(input.run, 'Run', SLOPE_ERROR_CODES.INVALID_RUN);
      if (typeof input.ratioValue !== 'number' || !isFinite(input.ratioValue) || input.ratioValue <= 0) {
        const err = new Error('Ratio must be a finite positive number X (of 1 : X).');
        err.code = SLOPE_ERROR_CODES.INVALID_RATIO;
        throw err;
      }
      riseMeters = riseFromRunAndRatio(runMeters, input.ratioValue);
    } else if (mode === SLOPE_INPUT_MODES.RUN_ANGLE) {
      if (input.run === undefined || input.angleDegrees === undefined) {
        const err = new Error('This definition requires run and angle.');
        err.code = SLOPE_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      runMeters = requireLengthSigned(input.run, 'Run', SLOPE_ERROR_CODES.INVALID_RUN);
      if (typeof input.angleDegrees !== 'number' || !isFinite(input.angleDegrees) ||
          Math.abs(input.angleDegrees) === 0 || Math.abs(input.angleDegrees) >= 90) {
        const err = new Error(`Angle must be finite and strictly between -90° and +90° (±${MAX_ANGLE_DEGREES}° supported).`);
        err.code = SLOPE_ERROR_CODES.INVALID_ANGLE;
        throw err;
      }
      riseMeters = riseFromRunAndAngle(runMeters, input.angleDegrees);
      if (!isFinite(riseMeters)) {
        const err = new Error('The supplied angle produces an undefined rise (vertical limit).');
        err.code = SLOPE_ERROR_CODES.NON_FINITE_RESULT;
        throw err;
      }
    }
  } catch (e) {
    if (e.code === undefined && /measurement unit/i.test(e.message)) {
      return { valid: false, errorCode: SLOPE_ERROR_CODES.INVALID_UNIT, errorMessage: e.message };
    }
    return { valid: false, errorCode: e.code || SLOPE_ERROR_CODES.INVALID_RISE, errorMessage: e.message };
  }

  // ---- post-derivation sanity ----
  if (!isFinite(riseMeters) || !isFinite(runMeters)) {
    return { valid: false, errorCode: SLOPE_ERROR_CODES.NON_FINITE_RESULT, errorMessage: 'No valid result can be calculated from the supplied inputs.' };
  }
  if (Math.abs(runMeters) > MAX_SLOPE_RUN_METERS) {
    return { valid: false, errorCode: SLOPE_ERROR_CODES.INVALID_RUN, errorMessage: `Run magnitude exceeds the supported analyzer bound (${MAX_SLOPE_RUN_METERS} m).` };
  }

  // ---- canonical conversion (ONE source) ----
  const canonical = slopeFromGeometry(riseMeters, runMeters);
  if (canonical.kind === 'invalid') {
    return { valid: false, errorCode: SLOPE_ERROR_CODES.NON_FINITE_RESULT, errorMessage: 'No valid result can be calculated from the supplied inputs.' };
  }

  // ---- optional consistency checks on redundant inputs ----
  const checks = [];
  if (input.checkSlopePercent !== undefined && canonical.kind === 'normal') {
    const c = checkConsistency(canonical.slopePercent, input.checkSlopePercent);
    checks.push({ field: 'slopePercent', calculated: canonical.slopePercent, provided: input.checkSlopePercent, ...c });
  }
  if (input.checkRatioValue !== undefined && canonical.kind === 'normal') {
    const c = checkConsistency(canonical.ratioValue, input.checkRatioValue);
    checks.push({ field: 'ratioValue', calculated: canonical.ratioValue, provided: input.checkRatioValue, ...c });
  }
  if (input.checkAngleDegrees !== undefined && isFinite(canonical.angleDegrees)) {
    const c = checkConsistency(canonical.angleDegrees, input.checkAngleDegrees);
    checks.push({ field: 'angleDegrees', calculated: canonical.angleDegrees, provided: input.checkAngleDegrees, ...c });
  }
  const conflict = checks.find(c => !c.consistent);

  const result = {
    valid: true,
    mode,
    input: { displayUnit, precision },
    geometry: {
      riseMeters,
      runMeters,
      slopePercent: canonical.slopePercent,
      ratioValue: canonical.ratioValue,
      angleDegrees: canonical.angleDegrees,
      flightLengthMeters: Math.sqrt(riseMeters * riseMeters + runMeters * runMeters),
      kind: canonical.kind,
      direction: canonical.direction
    },
    consistency: {
      tolerance: CONSISTENCY_TOLERANCE,
      checks,
      status: checks.length === 0 ? 'not_applicable' : (conflict ? 'CONFLICT' : 'CONSISTENT'),
      conflict: conflict || null
    }
  };
  result.formatted = formatSlopeResult(result, displayUnit, precision);
  return result;
}

/**
 * Comparison table for the fixed study targets: for a |rise| magnitude, the
 * run each target percent demands (magnitude; direction carried separately).
 */
export function buildSlopeTargetComparison(riseMagnitudeMeters) {
  if (typeof riseMagnitudeMeters !== 'number' || !isFinite(riseMagnitudeMeters) || riseMagnitudeMeters <= 0) {
    return [];
  }
  return SLOPE_TARGETS.map(t => ({
    percent: t.percent,
    note: t.note,
    ratioValue: 100 / t.percent,
    runMeters: riseMagnitudeMeters / (t.percent / 100)
  }));
}

/** Formats canonical meters in the requested display unit. */
function fmt(meters, displayUnitKey, precision) {
  const unitDef = requireUnit(displayUnitKey, 'length');
  if (displayUnitKey === 'ft-in') {
    return formatFeetInches(Math.abs(meters) / UNITS.in.toMeters);
  }
  return `${formatNumber(meters / unitDef.toMeters, precision)} ${unitDef.symbol}`;
}

/** Ratio display with documented sign convention: "1 : X ascending/descending". */
export function formatSlopeRatio(ratioValue, direction) {
  if (typeof ratioValue !== 'number' || !isFinite(ratioValue) || ratioValue <= 0) {
    return direction === SLOPE_DIRECTIONS.VERTICAL ? '1 : 0' : '—';
  }
  const rounded = Math.round(ratioValue);
  const magnitude = Math.abs(ratioValue - rounded) < 1e-9
    ? `${rounded}`
    : `${formatNumber(ratioValue, ratioValue < 1.05 ? 3 : 2)}`;
  if (direction === SLOPE_DIRECTIONS.DESCENDING) return `1 : ${magnitude} descending`;
  if (direction === SLOPE_DIRECTIONS.ASCENDING) return `1 : ${magnitude} ascending`;
  return `1 : ${magnitude}`;
}

/**
 * Formats a slope result into UI strings; raw values stay on the result.
 */
export function formatSlopeResult(result, displayUnit = 'm', precision = 2) {
  const g = result.geometry;
  const isVertical = g.kind === 'vertical';
  const f = {
    rise: fmt(g.riseMeters, displayUnit, precision),
    run: fmt(g.runMeters, displayUnit, precision),
    flightLength: fmt(g.flightLengthMeters, displayUnit, precision),
    slopePercent: isVertical
      ? (g.slopePercent > 0 ? 'Undefined / Infinite (vertical)' : 'Undefined / −Infinite (vertical)')
      : `${formatNumber(g.slopePercent, 2)}%`,
    ratio: formatSlopeRatio(g.ratioValue, g.direction),
    angle: `${formatNumber(g.angleDegrees, 2)}°`,
    direction: g.kind === 'vertical'
      ? (g.riseMeters > 0 ? 'VERTICAL (up)' : 'VERTICAL (down)')
      : (g.kind === 'flat' ? 'FLAT' : (g.direction === SLOPE_DIRECTIONS.ASCENDING ? '↑ ASCENDING' : '↓ DESCENDING'))
  };
  if (result.consistency && result.consistency.status === 'CONFLICT' && result.consistency.conflict) {
    const c = result.consistency.conflict;
    f.conflict = `CONFLICT — calculated ${c.field} = ${formatNumber(c.calculated, 4)}, provided = ${formatNumber(c.provided, 4)} (difference ${formatNumber(c.difference, 4)})`;
  }
  return f;
}

/**
 * Educational explanation of the slope: "For every X units horizontally,
 * the surface rises 1 unit." Built from the actual geometry.
 */
export function explainSlope(result) {
  if (!result || !result.valid) return '';
  const g = result.geometry;
  if (g.kind === 'vertical') {
    return 'A vertical relationship: all rise, no run. Percentage slope is undefined (infinite).';
  }
  if (g.kind === 'flat') {
    return 'A flat relationship: all run, no rise. Slope is 0% and the angle is 0°.';
  }
  const ratioAbs = Math.abs(g.ratioValue);
  const dir = g.direction === SLOPE_DIRECTIONS.DESCENDING ? 'falls' : 'rises';
  return `For every ${formatNumber(ratioAbs, ratioAbs % 1 === 0 ? 0 : 2)} units horizontally, the surface ${dir} 1 unit.`;
}

/**
 * Generates a proportional SVG side-elevation diagram from the actual
 * calculated geometry. Handles signed rise (descending slopes render
 * downward) and visually normalizes extreme ratios with an explicit note.
 *
 * @param {Object} result - valid result from analyzeSlope
 * @param {Object} [options] - { width, height }
 */
export function generateSlopeSVG(result, options = {}) {
  if (!result || !result.valid || !result.geometry) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"></svg>';
  }

  const width = typeof options.width === 'number' && options.width > 0 ? options.width : 520;
  const height = typeof options.height === 'number' && options.height > 0 ? options.height : 220;
  const pad = 46;
  const drawW = width - pad * 2;
  const drawH = height - pad * 2;

  const rise = result.geometry.riseMeters;
  const run = result.geometry.runMeters;
  const absRise = Math.abs(rise);
  const absRun = Math.abs(run);

  // Visual normalization: when the slope is extreme (ratio beyond 20:1 or
  // steeper than 1:1.2), scale the minor axis up to stay readable. The note
  // discloses this; numeric labels remain exact.
  const ratioAbs = absRise > 0 ? absRun / absRise : Infinity;
  const visuallyNormalized = ratioAbs > 20 || ratioAbs < 0.833;
  let drawRun = absRun;
  let drawRise = absRise;
  if (visuallyNormalized && absRise > 0 && absRun > 0) {
    const targetRatio = 4; // readable ~1:4 visual
    if (ratioAbs > targetRatio) { drawRun = absRise * targetRatio; }
    else { drawRise = absRun / targetRatio; }
  }
  if (absRise === 0 || absRun === 0) {
    drawRun = absRun || drawW * 0.8;
    drawRise = absRise;
  }

  const scale = Math.min(drawW / drawRun, drawH / drawRise);
  const originX = pad;
  const originY = height - pad;
  const topX = originX + drawRun * scale;
  const topY = originY - drawRise * scale * (rise < 0 ? -1 : 1);

  const noteY = visuallyNormalized ? 32 : 18;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Proportional slope diagram: rise ${result.formatted.rise}, run ${result.formatted.run}, ${result.formatted.direction}, angle ${result.formatted.angle}">
  <line x1="${(originX - 14).toFixed(2)}" y1="${originY.toFixed(2)}" x2="${(topX + 14).toFixed(2)}" y2="${originY.toFixed(2)}" stroke="var(--border-color, #444)" stroke-width="1.4"/>
  <line x1="${originX.toFixed(2)}" y1="${originY.toFixed(2)}" x2="${topX.toFixed(2)}" y2="${topY.toFixed(2)}" stroke="var(--accent-primary, #7aa2ff)" stroke-width="2.4"/>
  <text x="${((originX + topX) / 2).toFixed(2)}" y="${(originY + 18).toFixed(2)}" text-anchor="middle" font-size="11" fill="var(--text-secondary, #9aa)" font-family="var(--font-family-mono, monospace)">RUN ${result.formatted.run}</text>
  <text x="${(topX + 10).toFixed(2)}" y="${((originY + topY) / 2).toFixed(2)}" font-size="11" fill="var(--text-secondary, #9aa)" font-family="var(--font-family-mono, monospace)">RISE ${result.formatted.rise}</text>
  <text x="${((originX + topX) / 2).toFixed(2)}" y="${((originY + topY) / 2).toFixed(2)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--accent-primary, #7aa2ff)" font-family="var(--font-family-mono, monospace)" transform="rotate(${(-result.geometry.angleDegrees).toFixed(2)} ${((originX + topX) / 2).toFixed(2)} ${((originY + topY) / 2).toFixed(2)})" dy="-6">${result.formatted.slopePercent} · ${result.formatted.angle}</text>
  <text x="${pad}" y="${noteY}" font-size="10" fill="var(--text-muted, #777)" font-family="var(--font-family-mono, monospace)">${result.formatted.direction}</text>
  ${visuallyNormalized ? `<text x="${pad}" y="18" font-size="9" fill="var(--text-muted, #777)" font-style="italic" font-family="var(--font-family-mono, monospace)">Diagram visually normalized for readability. Numeric values shown are exact.</text>` : ''}
</svg>`.trim();

  return svg;
}
