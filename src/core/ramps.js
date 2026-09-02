/**
 * Architecture Helping Hand - Ramp Calculator Core
 * Architectural Tools Phase: Ramps (straight ramp, no landings).
 *
 * Pure, deterministic, zero-DOM ramp slope/geometry engine.
 * One canonical geometry source feeds all three slope representations
 * (percentage, ratio, angle) so they can never disagree.
 *
 * SCOPE & SEMANTICS (documented contract, see RAMPS.md):
 *  - Educational/design calculation tool. Reference values are configurable
 *    heuristics with explicit labels — NOT jurisdiction-specific code
 *    compliance. Nothing here emits "code compliant" language.
 *  - RATIO CONVENTION: 1 : (run / rise) — "1 unit of rise per X units of
 *    run". Ratio noise is normalized against the existing formatter's
 *    epsilon-stabilized rounding; non-integer ratios are shown as controlled
 *    decimals, never as fabricated exact integers.
 *  - NEGATIVE SLOPE: rejected. This is an ascent ramp calculator; a
 *    downhill/terrain mode does not exist yet. Documented decision.
 *  - The three representations come from ONE geometry block:
 *      slopePercent = rise / run × 100
 *      ratio        = run / rise        (displayed as 1 : ratio)
 *      angleDegrees = atan2(rise, run) × 180/π
 *
 * Future Slopes tool note: percentage/ratio/angle conversion lives in
 * slopeConversions() and is deliberately generic (rise+run based) so a
 * future general Slope tool can reuse it without this module growing
 * speculative terrain/grading features.
 */

import { requireFiniteNumber } from './calculator.js';
import { requireUnit, UNITS } from './units.js';
import { formatNumber, formatFeetInches } from './formatter.js';

/**
 * Configurable reference defaults. Labels are explicit: these are
 * educational/design heuristics, NOT universal legal requirements.
 * The well-known 1:12 (8.33%) accessibility figure is included as a
 * study reference because it is architecturally pervasive; the UI and
 * this module always present it as "verify applicable local requirements".
 */
export const RAMP_REFERENCE_DEFAULTS = Object.freeze({
  slope: Object.freeze({
    label: 'Educational Reference (configurable)',
    targetRatio: 12,           // 1:12 → 8.33%
    minRatio: 8,               // 1:8  → 12.5% (steeper bound of the study band)
    maxRatio: 20,              // 1:20 → 5%    (shallower bound)
    note: '1:12 (8.33%) is the widely taught accessibility reference. Treat it as a study value — verify applicable local requirements for real projects.'
  })
});

/** Common study targets for the comparison table. Deterministic, fixed order. */
export const RAMP_TARGET_SLOPES = Object.freeze([
  Object.freeze({ percent: 5, note: 'Gentle — long ramps, site approaches' }),
  Object.freeze({ percent: 8.33, note: '1:12 — the widely taught accessibility reference' }),
  Object.freeze({ percent: 10, note: 'Steeper — tight sites, short rises' }),
  Object.freeze({ percent: 12.5, note: '1:8 — upper bound of the study band' }),
  Object.freeze({ percent: 16.67, note: '1:6 — very steep; study/wheelchair-limit illustration' }),
  Object.freeze({ percent: 20, note: '1:5 — beyond typical ramp use; spatial-cost illustration' })
]);

/** Input mode identifiers. */
export const RAMP_INPUT_MODES = Object.freeze({
  RISE_DESIRED_SLOPE: 'rise_desired_slope',
  RISE_AVAILABLE_RUN: 'rise_available_run',
  RUN_DESIRED_SLOPE: 'run_desired_slope',
  RISE_RUN_DIRECT: 'rise_run_direct'
});

/** Structured validation error codes (stable contract for UI/tests). */
export const RAMP_ERROR_CODES = Object.freeze({
  INVALID_RISE: 'INVALID_RISE',
  INVALID_RUN: 'INVALID_RUN',
  INVALID_SLOPE: 'INVALID_SLOPE',
  NEGATIVE_SLOPE: 'NEGATIVE_SLOPE',
  INVALID_UNIT: 'INVALID_UNIT',
  MISSING_INPUT: 'MISSING_INPUT',
  NON_FINITE_RESULT: 'NON_FINITE_RESULT'
});

/** Practical bound: a single straight ramp run longer than 200 m is out of scope. */
export const MAX_RUN_METERS = 200;

/** Hard bound on the slope percentage accepted as a "ramp" for study purposes. */
export const MAX_SLOPE_PERCENT = 100;

/**
 * The single canonical slope-conversion source. Given rise and run in meters
 * it derives every representation. All modes funnel through here.
 * @private
 */
function slopeConversions(riseMeters, runMeters) {
  const slopePercent = (riseMeters / runMeters) * 100;
  const ratioValue = runMeters / riseMeters;
  const angleRadians = Math.atan2(riseMeters, runMeters);
  const angleDegrees = angleRadians * (180 / Math.PI);
  return { slopePercent, ratioValue, angleRadians, angleDegrees };
}

/**
 * Validates and converts a length input to canonical meters.
 * Accepts a number (already meters) or a { value, unitKey } pair.
 * @private
 */
function requireLengthMeters(input, paramName, errorCode) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const unitDef = requireUnit(input.unitKey, 'length');
    if (typeof input.value !== 'number' || !isFinite(input.value) || input.value <= 0) {
      const err = new Error(`${paramName} must be a finite number greater than zero.`);
      err.code = errorCode;
      throw err;
    }
    return input.value * unitDef.toMeters;
  }
  if (typeof input !== 'number' || !isFinite(input) || input <= 0) {
    const err = new Error(`${paramName} must be a finite number greater than zero.`);
    err.code = errorCode;
    throw err;
  }
  return input;
}

/**
 * Validates a slope-percentage input: must be finite, > 0, and within the
 * supported ramp band. Negative slope is explicitly rejected (documented
 * decision: no downhill/terrain mode in the standard ramp calculator).
 * @private
 */
function requireSlopePercent(input) {
  if (typeof input !== 'number' || isNaN(input) || !isFinite(input)) {
    const err = new Error('Slope must be a finite number greater than zero.');
    err.code = RAMP_ERROR_CODES.INVALID_SLOPE;
    throw err;
  }
  if (input < 0) {
    const err = new Error('Negative slope is not supported — the ramp calculator models ascent ramps only.');
    err.code = RAMP_ERROR_CODES.NEGATIVE_SLOPE;
    throw err;
  }
  if (input === 0) {
    const err = new Error('Slope must be greater than zero.');
    err.code = RAMP_ERROR_CODES.INVALID_SLOPE;
    throw err;
  }
  if (input > MAX_SLOPE_PERCENT) {
    const err = new Error(`Slope exceeds the supported ramp study band (max ${MAX_SLOPE_PERCENT}%).`);
    err.code = RAMP_ERROR_CODES.INVALID_SLOPE;
    throw err;
  }
  return input;
}

/** Normalizes reference overrides over RAMP_REFERENCE_DEFAULTS. */
export function resolveRampReferences(overrides = {}) {
  const base = RAMP_REFERENCE_DEFAULTS.slope;
  const o = overrides && typeof overrides === 'object' ? overrides.slope : null;
  return Object.freeze({
    slope: Object.freeze({
      label: o && typeof o.label === 'string' ? o.label : base.label,
      targetRatio: o && typeof o.targetRatio === 'number' && isFinite(o.targetRatio) && o.targetRatio > 0 ? o.targetRatio : base.targetRatio,
      minRatio: o && typeof o.minRatio === 'number' && isFinite(o.minRatio) && o.minRatio > 0 ? o.minRatio : base.minRatio,
      maxRatio: o && typeof o.maxRatio === 'number' && isFinite(o.maxRatio) && o.maxRatio > 0 ? o.maxRatio : base.maxRatio,
      note: o && typeof o.note === 'string' ? o.note : base.note
    })
  });
}

/**
 * Classifies a computed ratio against the configured study band.
 * @returns {'within'|'steeper'|'shallower'}
 */
export function evaluateRatioStatus(ratioValue, reference) {
  if (ratioValue < reference.minRatio) return 'steeper';
  if (ratioValue > reference.maxRatio) return 'shallower';
  return 'within';
}

/** Formats canonical meters in the requested display unit (reuses app formatter). */
function fmt(meters, displayUnitKey, precision) {
  const unitDef = requireUnit(displayUnitKey, 'length');
  if (displayUnitKey === 'ft-in') {
    return formatFeetInches(meters / UNITS.in.toMeters);
  }
  return `${formatNumber(meters / unitDef.toMeters, precision)} ${unitDef.symbol}`;
}

/**
 * Formats a ratio value as a stable human-readable "1 : X" string.
 * Integer ratios display exactly (1 : 12); non-integer ratios show two
 * controlled decimals (1 : 8.33) or three for values below 1.05 — no
 * floating-point noise, no fabricated exactness.
 */
export function formatRatio(ratioValue) {
  if (typeof ratioValue !== 'number' || !isFinite(ratioValue) || ratioValue <= 0) {
    return '1 : —';
  }
  const rounded = Math.round(ratioValue);
  if (Math.abs(ratioValue - rounded) < 1e-9) {
    return `1 : ${rounded}`;
  }
  const decimals = ratioValue < 1.05 ? 3 : 2;
  return `1 : ${formatNumber(ratioValue, decimals)}`;
}

/**
 * Builds the geometric core shared by every mode.
 * @private
 */
function buildGeometry(riseMeters, runMeters) {
  const { slopePercent, ratioValue, angleDegrees } = slopeConversions(riseMeters, runMeters);
  const flightLengthMeters = Math.sqrt(riseMeters * riseMeters + runMeters * runMeters);
  return { riseMeters, runMeters, slopePercent, ratioValue, angleDegrees, flightLengthMeters };
}

/**
 * Main ramp calculation entry point.
 *
 * @param {Object} input
 * @param {string} input.mode - one of RAMP_INPUT_MODES
 * @param {number|{value,unitKey}} input.rise - rise (meters or value+unit)
 * @param {number|{value,unitKey}} [input.run] - run / available run
 * @param {number} [input.slopePercent] - desired slope (e.g. 8.33)
 * @param {string} [input.displayUnit='m']
 * @param {number} [input.precision=2]
 * @param {Object} [input.references] - overrides for RAMP_REFERENCE_DEFAULTS
 * @returns {Object} structured numeric result, or
 *   { valid: false, errorCode, errorMessage } for controlled failures
 */
export function calculateRamp(input = {}) {
  const mode = input.mode || RAMP_INPUT_MODES.RISE_DESIRED_SLOPE;
  const references = resolveRampReferences(input.references);
  const displayUnit = input.displayUnit || 'm';
  const precision = typeof input.precision === 'number' ? Math.max(0, Math.min(4, input.precision)) : 2;

  if (!Object.values(RAMP_INPUT_MODES).includes(mode)) {
    return { valid: false, errorCode: RAMP_ERROR_CODES.MISSING_INPUT, errorMessage: `Unknown ramp input mode: "${mode}"` };
  }

  let riseMeters = null;
  let runMeters = null;
  let slopePercent = null;

  // ---- per-mode input validation and resolution ----
  try {
    if (mode === RAMP_INPUT_MODES.RISE_DESIRED_SLOPE) {
      if (input.rise === undefined || input.slopePercent === undefined) {
        const err = new Error('This mode requires both rise and desired slope.');
        err.code = RAMP_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthMeters(input.rise, 'Rise', RAMP_ERROR_CODES.INVALID_RISE);
      slopePercent = requireSlopePercent(input.slopePercent);
      runMeters = riseMeters / (slopePercent / 100);
    } else if (mode === RAMP_INPUT_MODES.RISE_AVAILABLE_RUN) {
      if (input.rise === undefined || input.run === undefined) {
        const err = new Error('This mode requires both rise and available run.');
        err.code = RAMP_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthMeters(input.rise, 'Rise', RAMP_ERROR_CODES.INVALID_RISE);
      runMeters = requireLengthMeters(input.run, 'Available run', RAMP_ERROR_CODES.INVALID_RUN);
    } else if (mode === RAMP_INPUT_MODES.RUN_DESIRED_SLOPE) {
      if (input.run === undefined || input.slopePercent === undefined) {
        const err = new Error('This mode requires both run and desired slope.');
        err.code = RAMP_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      runMeters = requireLengthMeters(input.run, 'Run', RAMP_ERROR_CODES.INVALID_RUN);
      slopePercent = requireSlopePercent(input.slopePercent);
      riseMeters = runMeters * (slopePercent / 100);
    } else if (mode === RAMP_INPUT_MODES.RISE_RUN_DIRECT) {
      if (input.rise === undefined || input.run === undefined) {
        const err = new Error('This mode requires both rise and run.');
        err.code = RAMP_ERROR_CODES.MISSING_INPUT;
        throw err;
      }
      riseMeters = requireLengthMeters(input.rise, 'Rise', RAMP_ERROR_CODES.INVALID_RISE);
      runMeters = requireLengthMeters(input.run, 'Run', RAMP_ERROR_CODES.INVALID_RUN);
    }
  } catch (e) {
    if (e.code === undefined && /measurement unit/i.test(e.message)) {
      return { valid: false, errorCode: RAMP_ERROR_CODES.INVALID_UNIT, errorMessage: e.message };
    }
    return { valid: false, errorCode: e.code || RAMP_ERROR_CODES.INVALID_RISE, errorMessage: e.message };
  }

  // ---- post-derivation sanity (non-finite guard) ----
  if (!isFinite(riseMeters) || !isFinite(runMeters) || riseMeters <= 0 || runMeters <= 0) {
    return {
      valid: false,
      errorCode: RAMP_ERROR_CODES.NON_FINITE_RESULT,
      errorMessage: 'No valid result can be calculated from the supplied inputs.'
    };
  }
  if (runMeters > MAX_RUN_METERS) {
    return {
      valid: false,
      errorCode: RAMP_ERROR_CODES.INVALID_RUN,
      errorMessage: `Required run exceeds the supported bound for a single straight ramp (${MAX_RUN_METERS} m).`
    };
  }

  const geometry = buildGeometry(riseMeters, runMeters);
  const ratioStatus = evaluateRatioStatus(geometry.ratioValue, references.slope);

  const result = {
    valid: true,
    mode,
    input: { riseMeters, runMeters, slopePercent, displayUnit, precision, references },
    geometry,
    reference: {
      ...references.slope,
      status: ratioStatus,
      targetRunMeters: riseMeters * references.slope.targetRatio,
      targetSlopePercent: (1 / references.slope.targetRatio) * 100
    }
  };
  result.formatted = formatRampResult(result, displayUnit, precision);
  return result;
}

/**
 * Available-run analysis: compares the achieved slope with the configured
 * reference target and reports the spatial shortfall deterministically.
 * Returns a standalone block usable by any mode that knows rise + run.
 */
export function analyzeAvailableRun(riseMeters, availableRunMeters, references = resolveRampReferences()) {
  const targetRunMeters = riseMeters * references.slope.targetRatio;
  const targetSlopePercent = (1 / references.slope.targetRatio) * 100;
  const achieved = slopeConversions(riseMeters, availableRunMeters);
  const differenceMeters = targetRunMeters - availableRunMeters;
  return {
    availableRunMeters,
    targetRatio: references.slope.targetRatio,
    targetSlopePercent,
    targetRunMeters,
    differenceMeters,
    sufficient: differenceMeters <= 1e-9,
    achievedSlopePercent: achieved.slopePercent,
    achievedRatioValue: achieved.ratioValue,
    summary: differenceMeters <= 1e-9
      ? 'Sufficient run for the reference target slope.'
      : `Insufficient run for the reference target slope (${formatNumber(targetSlopePercent, 2)}%, ${formatRatio(references.slope.targetRatio)}): ${formatNumber(differenceMeters, 2)} m short.`
  };
}

/**
 * Comparison table for the fixed study targets: for a given rise, what run
 * does each target slope demand? Deterministic order = RAMP_TARGET_SLOPES.
 */
export function buildTargetComparison(riseMeters, references = resolveRampReferences()) {
  return RAMP_TARGET_SLOPES.map(t => {
    const runMeters = riseMeters / (t.percent / 100);
    const ratioValue = 100 / t.percent;
    return {
      percent: t.percent,
      note: t.note,
      runMeters,
      ratioValue,
      fitsReference: ratioValue >= references.slope.minRatio && ratioValue <= references.slope.maxRatio
    };
  });
}

/**
 * Formats a ramp result into UI strings. Raw numeric values stay on the
 * result object; every formatted string is produced here from them.
 */
export function formatRampResult(result, displayUnit = 'm', precision = 2) {
  const g = result.geometry;
  const f = {
    rise: fmt(g.riseMeters, displayUnit, precision),
    run: fmt(g.runMeters, displayUnit, precision),
    flightLength: fmt(g.flightLengthMeters, displayUnit, precision),
    slopePercent: `${formatNumber(g.slopePercent, 2)}%`,
    ratio: formatRatio(g.ratioValue),
    angle: `${formatNumber(g.angleDegrees, 2)}°`
  };
  if (result.reference) {
    f.referenceStatus = result.reference.status === 'within'
      ? 'Within configured reference'
      : (result.reference.status === 'steeper' ? 'Steeper than configured reference' : 'Shallower than configured reference');
    f.referenceLabel = result.reference.label;
    f.referenceNote = result.reference.note;
    f.referenceTargetRatio = formatRatio(result.reference.targetRatio);
    f.referenceTargetRun = fmt(result.reference.targetRunMeters, displayUnit, precision);
  }
  return f;
}

/**
 * Generates a proportional SVG side-elevation diagram from the actual
 * calculated geometry. Deterministic: identical geometry → identical markup.
 *
 * @param {Object} result - valid result from calculateRamp
 * @param {Object} [options] - { width, height }
 */
export function generateRampSVG(result, options = {}) {
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
  const scale = Math.min(drawW / run, drawH / rise);

  const originX = pad;
  const originY = height - pad;
  const topX = originX + run * scale;
  const topY = originY - rise * scale;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Proportional ramp side elevation: rise ${result.formatted.rise}, run ${result.formatted.run}, slope ${result.formatted.slopePercent}, ratio ${result.formatted.ratio}, angle ${result.formatted.angle}">
  <g class="ramp-baseline">
    <line x1="${(originX - 14).toFixed(2)}" y1="${originY.toFixed(2)}" x2="${(topX + 14).toFixed(2)}" y2="${originY.toFixed(2)}" stroke="var(--border-color, #444)" stroke-width="1.4"/>
  </g>
  <line x1="${originX.toFixed(2)}" y1="${originY.toFixed(2)}" x2="${topX.toFixed(2)}" y2="${topY.toFixed(2)}" stroke="var(--accent-primary, #7aa2ff)" stroke-width="2.4"/>
  <g class="ramp-dims">
    <line x1="${(topX + 18).toFixed(2)}" y1="${originY.toFixed(2)}" x2="${(topX + 18).toFixed(2)}" y2="${topY.toFixed(2)}" stroke="var(--border-color, #555)" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="${(topX + 24).toFixed(2)}" y="${((originY + topY) / 2).toFixed(2)}" font-size="11" fill="var(--text-secondary, #9aa)" font-family="var(--font-family-mono, monospace)" transform="rotate(90 ${(topX + 24).toFixed(2)} ${((originY + topY) / 2).toFixed(2)})" text-anchor="middle">RISE ${result.formatted.rise}</text>
    <text x="${((originX + topX) / 2).toFixed(2)}" y="${(originY + 18).toFixed(2)}" text-anchor="middle" font-size="11" fill="var(--text-secondary, #9aa)" font-family="var(--font-family-mono, monospace)">RUN ${result.formatted.run}</text>
    <text x="${((originX + topX) / 2).toFixed(2)}" y="${(topY - 10).toFixed(2)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--accent-primary, #7aa2ff)" font-family="var(--font-family-mono, monospace)">${result.formatted.slopePercent} · ${result.formatted.ratio} · ${result.formatted.angle}</text>
  </g>
  <text x="${pad}" y="18" font-size="10" fill="var(--text-muted, #777)" font-family="var(--font-family-mono, monospace)">SIDE ELEVATION — proportional to calculated geometry</text>
</svg>`.trim();

  return svg;
}
