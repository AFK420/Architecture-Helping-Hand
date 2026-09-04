/**
 * Architecture Helping Hand - Stair Calculator Core
 * Architectural Tools Phase: Stairs (straight flight).
 *
 * Pure, deterministic, zero-DOM stair proportion and geometry engine.
 * Supports four input modes and returns a structured result model with
 * raw canonical values kept strictly separate from formatted UI strings.
 *
 * SCOPE & SEMANTICS (documented contract):
 *  - This is an educational/design calculation tool. Reference ranges are
 *    configurable heuristics, NOT jurisdiction-specific code compliance.
 *    Nothing in this module emits "code compliant" language.
 *  - RISER/GOING CONVENTION (explicit, used everywhere):
 *      N risers produce N - 1 goings (treads without the top landing).
 *      Total run = (N - 1) x tread depth. The top of the stair lands on the
 *      upper floor — the upper floor slab itself is the final "tread", so a
 *      16-riser stair has 15 goings. This is the common straight-flight
 *      convention and it is shown verbatim in the UI.
 *  - BLONDEL PROPORTION: 2R + T, checked against a configurable reference
 *    range (labelled "Typical Reference (configurable)" — not a legal rule).
 *  - Candidate ranking is fully deterministic: stable sort by
 *    (proportion distance to target, then riser-count ascending, then
 *    riser-height distance to the desired riser). No floating-point ties
 *    are broken arbitrarily — the secondary keys guarantee a total order
 *    for distinct riser counts.
 *
 * Design notes for future extension (landings, U/L-shaped flights):
 *  - The result model keeps per-flight fields at the top level. A future
 *    multi-flight model can wrap these in `flights: [...]` and sum the
 *    geometry without changing the per-flight math here.
 */

import { requireFiniteNumber } from './calculator.js';
import { requireUnit, UNITS } from './units.js';
import { formatNumber, formatFeetInches } from './formatter.js';

/**
 * Default architectural reference ranges. All values are configurable
 * heuristics with explicit semantic labels — NOT building-code constants.
 * Sources vary by country and jurisdiction; the student should always
 * verify against their studio brief / local regulations.
 */
export const STAIR_REFERENCE_DEFAULTS = Object.freeze({
  riser: Object.freeze({
    label: 'Typical Reference (configurable)',
    minMeters: 0.13,
    maxMeters: 0.19,
    note: 'Common interior stair risers fall roughly between 130-190 mm depending on building type and jurisdiction.'
  }),
  tread: Object.freeze({
    label: 'Typical Reference (configurable)',
    minMeters: 0.24,
    maxMeters: 0.32,
    note: 'Common interior goings fall roughly between 240-320 mm.'
  }),
  blondel: Object.freeze({
    label: 'Educational Heuristic (Blondel, configurable)',
    // Blondel: 2R + T ≈ 620-640 mm is the classic teaching band.
    minMeters: 0.60,
    maxMeters: 0.66,
    note: "Blondel's rule: 2 × riser + going ≈ 620-640 mm (a comfortable stride). A configurable teaching heuristic, not a legal requirement."
  }),
  angle: Object.freeze({
    label: 'Typical Reference (configurable)',
    minDegrees: 20,
    maxDegrees: 38,
    note: 'Interior stairs typically slope between roughly 20° and 38°; ramps are much shallower, ladders much steeper.'
  })
});

/** Input mode identifiers. */
export const STAIR_INPUT_MODES = Object.freeze({
  RISE_DESIRED_RISER: 'rise_desired_riser',
  RISE_RISER_COUNT: 'rise_riser_count',
  RISE_AVAILABLE_RUN: 'rise_available_run',
  RISE_RUN_DIRECT: 'rise_run_direct'
});

/** Structured validation error codes (stable contract for UI/tests). */
export const STAIR_ERROR_CODES = Object.freeze({
  INVALID_RISE: 'INVALID_RISE',
  INVALID_RUN: 'INVALID_RUN',
  INVALID_RISER: 'INVALID_RISER',
  INVALID_TREAD: 'INVALID_TREAD',
  NON_INTEGER_RISERS: 'NON_INTEGER_RISERS',
  RISERS_OUT_OF_RANGE: 'RISERS_OUT_OF_RANGE',
  NO_FEASIBLE_CANDIDATE: 'NO_FEASIBLE_CANDIDATE',
  INSUFFICIENT_RUN: 'INSUFFICIENT_RUN',
  INVALID_UNIT: 'INVALID_UNIT'
});

/** Hard bounds for riser counts (a flight of 2 or 60+ risers is not a useful stair). */
export const RISER_COUNT_MIN = 2;
export const RISER_COUNT_MAX = 60;

/**
 * Validates and converts a length input to canonical meters.
 * Accepts a number (already meters) or a { value, unitKey } pair.
 * Throws TypeError/Error with the given code embedded for controlled handling.
 *
 * NOTE: deliberately named with the Stair prefix — the bundle concatenates
 * every module into one shared scope, so any two modules declaring the same
 * top-level name silently collide (the last one wins). See ENGINEERING_RULES.
 */
function requireStairLengthMeters(input, paramName, errorCode) {
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
 * Normalizes reference ranges: user-supplied ranges override defaults
 * field-by-field; unknown fields fall back to defaults. The result is a
 * deep-frozen structure carrying its semantic labels.
 */
export function resolveStairReferences(overrides = {}) {
  const merged = {};
  for (const key of Object.keys(STAIR_REFERENCE_DEFAULTS)) {
    const base = STAIR_REFERENCE_DEFAULTS[key];
    const o = overrides && typeof overrides === 'object' ? overrides[key] : null;
    merged[key] = Object.freeze({
      label: o && typeof o.label === 'string' ? o.label : base.label,
      minMeters: o && typeof o.minMeters === 'number' && isFinite(o.minMeters) && o.minMeters > 0 ? o.minMeters : base.minMeters,
      maxMeters: o && typeof o.maxMeters === 'number' && isFinite(o.maxMeters) && o.maxMeters > 0 ? o.maxMeters : base.maxMeters,
      note: o && typeof o.note === 'string' ? o.note : base.note
    });
  }
  return Object.freeze(merged);
}

/**
 * Evaluates a proportion status against a range.
 * @returns {'within'|'below'|'above'}
 */
export function evaluateRangeStatus(valueMeters, range) {
  if (valueMeters < range.minMeters) return 'below';
  if (valueMeters > range.maxMeters) return 'above';
  return 'within';
}

/** Formats canonical meters in the requested display unit. */
function stairFmt(meters, displayUnitKey, precision) {
  const unitDef = requireUnit(displayUnitKey, 'length');
  if (displayUnitKey === 'ft-in') {
    return formatFeetInches(meters / UNITS.in.toMeters);
  }
  return `${formatNumber(meters / unitDef.toMeters, precision)} ${unitDef.symbol}`;
}

/**
 * Computes derived geometry for a concrete riser/tread pair.
 * Convention: N risers, N - 1 goings.
 * @private
 */
function buildStairGeometry(totalRiseMeters, riserCount, riserMeters, treadMeters) {
  const goingCount = riserCount - 1;
  const totalRunMeters = goingCount * treadMeters;
  const slopedLengthMeters = Math.sqrt(totalRiseMeters * totalRiseMeters + totalRunMeters * totalRunMeters);
  const angleRadians = Math.atan2(totalRiseMeters, totalRunMeters);
  const angleDegrees = angleRadians * (180 / Math.PI);
  const slopePercent = totalRunMeters > 0 ? (totalRiseMeters / totalRunMeters) * 100 : Infinity;

  return {
    goingCount,
    totalRunMeters,
    slopedLengthMeters,
    angleRadians,
    angleDegrees,
    slopePercent,
    riseRunRatio: totalRunMeters > 0 ? totalRiseMeters / totalRunMeters : Infinity
  };
}

/**
 * Builds the Blondel proportion block for a riser/tread pair.
 * @private
 */
function buildProportion(riserMeters, treadMeters, references) {
  const twoRPlusTMeters = 2 * riserMeters + treadMeters;
  return {
    twoRPlusTMeters,
    status: evaluateRangeStatus(twoRPlusTMeters, references.blondel),
    reference: references.blondel
  };
}

/**
 * Builds one fully-formed candidate solution for a given riser count.
 * @private
 */
function buildCandidate(totalRiseMeters, riserCount, references, objective, params) {
  const riserMeters = totalRiseMeters / riserCount;

  // Tread depth from the objective (deterministic; never arbitrary):
  let treadMeters;
  switch (objective) {
    case 'comfortable_proportion': {
      // Solve 2R + T = blondel midpoint for T
      const target = (references.blondel.minMeters + references.blondel.maxMeters) / 2;
      treadMeters = Math.max(0.001, target - 2 * riserMeters);
      break;
    }
    case 'minimize_run':
      // Minimum tread of the tread reference range → shortest total run
      treadMeters = references.tread.minMeters;
      break;
    case 'fit_available_run':
    case 'target_desired_tread':
      treadMeters = (typeof params.desiredTreadMeters === 'number' && isFinite(params.desiredTreadMeters) && params.desiredTreadMeters > 0)
        ? params.desiredTreadMeters
        : references.tread.minMeters;
      break;
    case 'target_desired_riser':
    default:
      treadMeters = Math.max(0.001, ((references.blondel.minMeters + references.blondel.maxMeters) / 2) - 2 * riserMeters);
      break;
  }

  const geometry = buildStairGeometry(totalRiseMeters, riserCount, riserMeters, treadMeters);
  const proportion = buildProportion(riserMeters, treadMeters, references);

  return {
    riserCount,
    riserMeters,
    treadMeters,
    geometry,
    proportion,
    riserStatus: evaluateRangeStatus(riserMeters, references.riser),
    treadStatus: evaluateRangeStatus(treadMeters, references.tread),
    angleStatus: evaluateRangeStatus(geometry.angleDegrees, { minMeters: references.angle.minDegrees, maxMeters: references.angle.maxDegrees })
  };
}

/**
 * Deterministic candidate ranking. Sort keys (in order):
 *   1. |riser − desired riser| (when a desired riser is supplied — the
 *      user's explicit signal outranks the abstract proportion target)
 *   2. |2R+T − blondel midpoint|  (proportion closeness)
 *   3. riser count ascending
 * Riser counts are unique per candidate, so the ordering is a total order.
 * @private
 */
function rankCandidates(candidates, references, params) {
  const midpoint = (references.blondel.minMeters + references.blondel.maxMeters) / 2;
  const desired = typeof params.desiredRiserMeters === 'number' && isFinite(params.desiredRiserMeters) ? params.desiredRiserMeters : null;

  const scored = candidates.map(c => ({
    c,
    riserDistance: desired !== null ? Math.abs(c.riserMeters - desired) : 0,
    proportionDistance: Math.abs(c.proportion.twoRPlusTMeters - midpoint)
  }));

  scored.sort((a, b) => {
    if (a.riserDistance !== b.riserDistance) return a.riserDistance - b.riserDistance;
    if (a.proportionDistance !== b.proportionDistance) return a.proportionDistance - b.proportionDistance;
    return a.c.riserCount - b.c.riserCount;
  });

  return scored.map(s => s.c);
}

/**
 * Main stair calculation entry point.
 *
 * @param {Object} input
 * @param {string} input.mode - one of STAIR_INPUT_MODES
 * @param {number|{value,unitKey}} input.totalRise - total rise (canonical meters or value+unit)
 * @param {number|{value,unitKey}} [input.desiredRiser] - Mode A
 * @param {number} [input.riserCount] - Mode B (integer)
 * @param {number|{value,unitKey}} [input.availableRun] - Mode C
 * @param {number|{value,unitKey}} [input.totalRun] - Mode D (direct rise+run)
 * @param {number|{value,unitKey}} [input.desiredTread] - objective target tread
 * @param {string} [input.objective] - 'comfortable_proportion' | 'minimize_run' |
 *        'fit_available_run' | 'target_desired_riser' | 'target_desired_tread'
 * @param {string} [input.displayUnit='mm']
 * @param {number} [input.precision=0]
 * @param {Object} [input.references] - per-range overrides for STAIR_REFERENCE_DEFAULTS
 *
 * @returns {Object} Structured result model (see STAIRS.md for the schema),
 *   or { valid: false, errorCode, errorMessage } for controlled failures.
 */
export function calculateStair(input = {}) {
  const mode = input.mode || STAIR_INPUT_MODES.RISE_DESIRED_RISER;
  const references = resolveStairReferences(input.references);
  const displayUnit = input.displayUnit || 'mm';
  const precision = typeof input.precision === 'number' ? Math.max(0, Math.min(4, input.precision)) : 0;

  // ---- validate rise ----
  let totalRiseMeters;
  try {
    totalRiseMeters = requireStairLengthMeters(input.totalRise, 'Total rise', STAIR_ERROR_CODES.INVALID_RISE);
  } catch (e) {
    if (e.code === undefined && /measurement unit/i.test(e.message)) {
      return { valid: false, errorCode: STAIR_ERROR_CODES.INVALID_UNIT, errorMessage: e.message };
    }
    return { valid: false, errorCode: e.code || STAIR_ERROR_CODES.INVALID_RISE, errorMessage: e.message };
  }

  // Realistic bound: a single straight flight taller than 10 m is out of scope.
  if (totalRiseMeters > 10) {
    return {
      valid: false,
      errorCode: STAIR_ERROR_CODES.INVALID_RISE,
      errorMessage: 'Total rise exceeds the supported bound for a single straight flight (10 m).'
    };
  }

  // ---- validate tread (if supplied) ----
  let desiredTreadMeters = null;
  if (input.desiredTread !== undefined && input.desiredTread !== null) {
    try {
      desiredTreadMeters = requireStairLengthMeters(input.desiredTread, 'Desired tread', STAIR_ERROR_CODES.INVALID_TREAD);
    } catch (e) {
      return { valid: false, errorCode: e.code || STAIR_ERROR_CODES.INVALID_TREAD, errorMessage: e.message };
    }
  }

  const objective = [
    'comfortable_proportion', 'minimize_run', 'fit_available_run',
    'target_desired_riser', 'target_desired_tread'
  ].includes(input.objective) ? input.objective : 'comfortable_proportion';

  let riserCount = null;
  let desiredRiserMeters = null;
  let availableRunMeters = null;
  let directRunMeters = null;

  // ---- mode-specific validation and input resolution ----
  try {
    if (mode === STAIR_INPUT_MODES.RISE_DESIRED_RISER) {
      desiredRiserMeters = requireStairLengthMeters(input.desiredRiser, 'Desired riser', STAIR_ERROR_CODES.INVALID_RISER);
    } else if (mode === STAIR_INPUT_MODES.RISE_RISER_COUNT) {
      if (!Number.isInteger(input.riserCount)) {
        const err = new Error('Riser count must be a whole number.');
        err.code = STAIR_ERROR_CODES.NON_INTEGER_RISERS;
        throw err;
      }
      if (input.riserCount < RISER_COUNT_MIN || input.riserCount > RISER_COUNT_MAX) {
        const err = new Error(`Riser count must be between ${RISER_COUNT_MIN} and ${RISER_COUNT_MAX} for a single flight.`);
        err.code = STAIR_ERROR_CODES.RISERS_OUT_OF_RANGE;
        throw err;
      }
      riserCount = input.riserCount;
    } else if (mode === STAIR_INPUT_MODES.RISE_AVAILABLE_RUN) {
      availableRunMeters = requireStairLengthMeters(input.availableRun, 'Available run', STAIR_ERROR_CODES.INVALID_RUN);
    } else if (mode === STAIR_INPUT_MODES.RISE_RUN_DIRECT) {
      directRunMeters = requireStairLengthMeters(input.totalRun, 'Total run', STAIR_ERROR_CODES.INVALID_RUN);
    } else {
      const err = new Error(`Unknown stair input mode: "${mode}"`);
      err.code = STAIR_ERROR_CODES.INVALID_RISE;
      throw err;
    }
  } catch (e) {
    if (e.code === undefined && /measurement unit/i.test(e.message)) {
      return { valid: false, errorCode: STAIR_ERROR_CODES.INVALID_UNIT, errorMessage: e.message };
    }
    return { valid: false, errorCode: e.code || STAIR_ERROR_CODES.INVALID_RISE, errorMessage: e.message };
  }

  // ---- mode-specific solving ----

  // MODE B — rise + fixed riser count: direct geometry, no candidates needed
  if (mode === STAIR_INPUT_MODES.RISE_RISER_COUNT) {
    const riserMeters = totalRiseMeters / riserCount;
    const treadMeters = (desiredTreadMeters !== null)
      ? desiredTreadMeters
      : Math.max(0.001, ((references.blondel.minMeters + references.blondel.maxMeters) / 2) - 2 * riserMeters);
    const geometry = buildStairGeometry(totalRiseMeters, riserCount, riserMeters, treadMeters);
    const proportion = buildProportion(riserMeters, treadMeters, references);

    const result = {
      valid: true,
      mode,
      convention: { risers: riserCount, goings: riserCount - 1, rule: 'N risers produce N - 1 goings; the upper floor slab acts as the final tread.' },
      input: { totalRiseMeters, displayUnit, precision, objective, references },
      risers: { count: riserCount, heightMeters: riserMeters },
      treads: { count: riserCount - 1, depthMeters: treadMeters },
      geometry,
      proportion
    };
    result.formatted = formatStairResult(result, displayUnit, precision);
    return result;
  }

  // MODE D — direct rise + run: pure geometric analysis
  if (mode === STAIR_INPUT_MODES.RISE_RUN_DIRECT) {
    // Derive an implied integer riser count from the Blondel band when possible.
    const midBlondel = (references.blondel.minMeters + references.blondel.maxMeters) / 2;
    const midRiser = (references.riser.minMeters + references.riser.maxMeters) / 2;
    const impliedCount = Math.round(totalRiseMeters / midRiser);
    let interpretation;
    if (impliedCount >= RISER_COUNT_MIN && impliedCount <= RISER_COUNT_MAX) {
      const riserMeters = totalRiseMeters / impliedCount;
      const goingCount = impliedCount - 1;
      const treadMeters = directRunMeters / goingCount;
      interpretation = {
        derived: true,
        riserCount: impliedCount,
        riserMeters,
        goingCount,
        treadMeters,
        note: `Rise+run imply approximately ${impliedCount} risers at the riser reference midpoint — an interpretation, not an exact solution. Adjust the riser count in Mode B for exact control.`
      };
    } else {
      interpretation = {
        derived: false,
        note: 'Rise and run define the slope geometry, but no whole-riser interpretation falls in the supported riser-count range.'
      };
    }

    const geometry = {
      goingCount: null,
      totalRunMeters: directRunMeters,
      slopedLengthMeters: Math.sqrt(totalRiseMeters * totalRiseMeters + directRunMeters * directRunMeters),
      angleRadians: Math.atan2(totalRiseMeters, directRunMeters),
      angleDegrees: Math.atan2(totalRiseMeters, directRunMeters) * (180 / Math.PI),
      slopePercent: (totalRiseMeters / directRunMeters) * 100,
      riseRunRatio: totalRiseMeters / directRunMeters
    };

    const result = {
      valid: true,
      mode,
      convention: null,
      input: { totalRiseMeters, displayUnit, precision, objective, references },
      risers: interpretation.derived ? { count: interpretation.riserCount, heightMeters: interpretation.riserMeters } : null,
      treads: interpretation.derived ? { count: interpretation.goingCount, depthMeters: interpretation.treadMeters } : null,
      geometry,
      proportion: interpretation.derived ? buildProportion(interpretation.riserMeters, interpretation.treadMeters, references) : null,
      interpretation
    };
    result.formatted = formatStairResult(result, displayUnit, precision);
    return result;
  }

  // MODES A & C — enumerate deterministic candidates over the riser-count range
  const allCandidates = [];
  for (let n = RISER_COUNT_MIN; n <= RISER_COUNT_MAX; n++) {
    allCandidates.push(buildCandidate(totalRiseMeters, n, references, objective, {
      desiredRiserMeters,
      desiredTreadMeters
    }));
  }

  // Mode A also ranks by closeness to the desired riser (tertiary key).
  const ranked = rankCandidates(allCandidates, references, { desiredRiserMeters });

  let feasible;
  if (mode === STAIR_INPUT_MODES.RISE_AVAILABLE_RUN) {
    // Keep candidates that BOTH fit the available run AND produce a riser
    // inside the riser reference range. Without the riser filter, a
    // degenerate 2-riser "stair" with a 1.4 m riser would silently satisfy
    // any run constraint — geometrically valid, architecturally absurd.
    feasible = ranked.filter(c =>
      c.geometry.totalRunMeters <= availableRunMeters + 1e-9 &&
      c.riserStatus === 'within'
    );
    if (feasible.length === 0) {
      const fitsRun = ranked.filter(c => c.geometry.totalRunMeters <= availableRunMeters + 1e-9);
      return {
        valid: false,
        errorCode: STAIR_ERROR_CODES.INSUFFICIENT_RUN,
        errorMessage: 'Available run is insufficient for the requested configuration. Reduce the tread depth/objective or provide more horizontal space.',
        detail: {
          availableRunMeters,
          minimumRequiredRunMeters: Math.min(...allCandidates.map(c => c.geometry.totalRunMeters)),
          note: fitsRun.length > 0
            ? 'Configurations that fit the run exist but produce risers outside the riser reference range.'
            : 'No configuration fits the available run at all.'
        }
      };
    }
  } else {
    feasible = ranked;
  }

  const best = feasible[0];
  const candidates = feasible.slice(0, 8);

  const result = {
    valid: true,
    mode,
    convention: { risers: best.riserCount, goings: best.riserCount - 1, rule: 'N risers produce N - 1 goings; the upper floor slab acts as the final tread.' },
    input: {
      totalRiseMeters,
      desiredRiserMeters,
      availableRunMeters,
      desiredTreadMeters,
      displayUnit,
      precision,
      objective,
      references
    },
    risers: { count: best.riserCount, heightMeters: best.riserMeters },
    treads: { count: best.riserCount - 1, depthMeters: best.treadMeters },
    geometry: best.geometry,
    proportion: best.proportion,
    candidates
  };
  result.formatted = formatStairResult(result, displayUnit, precision);
  return result;
}

/**
 * Formats a stair result into UI-facing strings. Raw values stay on the
 * result; formatted strings are grouped here so UI code never computes.
 */
export function formatStairResult(result, displayUnit = 'mm', precision = 0) {
  const f = {
    totalRise: stairFmt(result.input.totalRiseMeters, displayUnit, precision),
    riser: result.risers ? stairFmt(result.risers.heightMeters, displayUnit, precision) : null,
    tread: result.treads ? stairFmt(result.treads.depthMeters, displayUnit, precision) : null,
    totalRun: stairFmt(result.geometry.totalRunMeters, displayUnit, precision),
    slopedLength: stairFmt(result.geometry.slopedLengthMeters, displayUnit, precision),
    angle: `${formatNumber(result.geometry.angleDegrees, 1)}°`,
    slopePercent: `${formatNumber(result.geometry.slopePercent, 1)}%`,
    riseRunRatio: `1 : ${formatNumber(result.geometry.riseRunRatio, 2)}`,
    riserCount: result.risers ? String(result.risers.count) : null,
    goingCount: result.risers ? String(result.risers.count - 1) : null,
    twoRPlusT: result.proportion ? stairFmt(result.proportion.twoRPlusTMeters, displayUnit, precision) : null,
    proportionStatus: result.proportion
      ? (result.proportion.status === 'within'
          ? 'Within configured reference range'
          : (result.proportion.status === 'below' ? 'Below configured reference range' : 'Above configured reference range'))
      : null
  };
  if (Array.isArray(result.candidates)) {
    f.candidates = result.candidates.map(c => ({
      riserCount: c.riserCount,
      riser: stairFmt(c.riserMeters, displayUnit, precision),
      tread: stairFmt(c.treadMeters, displayUnit, precision),
      totalRun: stairFmt(c.geometry.totalRunMeters, displayUnit, precision),
      twoRPlusT: stairFmt(c.proportion.twoRPlusTMeters, displayUnit, precision),
      proportionStatus: c.proportion.status,
      angle: `${formatNumber(c.geometry.angleDegrees, 1)}°`
    }));
  }
  if (result.interpretation) {
    f.interpretationNote = result.interpretation.note;
  }
  return f;
}

/**
 * Generates a proportional SVG side-elevation diagram of the calculated stair.
 * Deterministic: identical geometry produces identical SVG markup.
 *
 * @param {Object} result - a valid result from calculateStair
 * @param {Object} [options] - { width, height }
 * @returns {string} SVG markup
 */
export function generateStairSVG(result, options = {}) {
  if (!result || !result.valid || !result.risers) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"></svg>';
  }

  const width = typeof options.width === 'number' && options.width > 0 ? options.width : 520;
  const height = typeof options.height === 'number' && options.height > 0 ? options.height : 240;
  const pad = 44;
  const drawW = width - pad * 2;
  const drawH = height - pad * 2;

  const totalRise = result.input.totalRiseMeters;
  const totalRun = result.geometry.totalRunMeters;
  const scale = Math.min(drawW / totalRun, drawH / totalRise);

  const riserCount = result.risers.count;
  const treadMeters = result.treads.depthMeters;
  const riserMeters = result.risers.heightMeters;
  const goingCount = riserCount - 1;

  // Origin: bottom-left of the flight
  const originX = pad;
  const originY = height - pad;

  const px = meters => meters * scale;
  const xAt = i => originX + px(i * treadMeters);
  const yAt = i => originY - px(i * riserMeters);

  // Build the step outline path: riser up, tread forward, repeat (N risers, N-1 treads)
  let d = `M ${originX.toFixed(2)} ${originY.toFixed(2)}`;
  for (let i = 0; i < riserCount; i++) {
    d += ` L ${xAt(i).toFixed(2)} ${yAt(i + 1).toFixed(2)}`;      // riser up
    if (i < goingCount) {
      d += ` L ${xAt(i + 1).toFixed(2)} ${yAt(i + 1).toFixed(2)}`; // going forward
    }
  }
  d += ` L ${xAt(goingCount).toFixed(2)} ${originY.toFixed(2)} Z`;

  // Dimension labels use the actual result geometry
  const angleLabel = `${formatNumber(result.geometry.angleDegrees, 1)}°`;
  const diagX = originX + px(totalRun) * 0.55;
  const diagY = originY - px(totalRise) * 0.55;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Proportional stair side elevation: ${riserCount} risers, ${goingCount} goings, angle ${angleLabel}">
  <g class="stair-grid">
    <line x1="${originX}" y1="${originY}" x2="${originX + px(totalRun)}" y2="${originY}" stroke="var(--border-color, #444)" stroke-width="1" stroke-dasharray="4 3"/>
    <line x1="${originX}" y1="${originY}" x2="${originX}" y2="${originY - px(totalRise)}" stroke="var(--border-color, #444)" stroke-width="1" stroke-dasharray="4 3"/>
    <line x1="${originX}" y1="${originY}" x2="${originX + px(totalRun)}" y2="${originY - px(totalRise)}" stroke="var(--accent-primary, #7aa2ff)" stroke-width="1" stroke-dasharray="6 3" opacity="0.7"/>
  </g>
  <path d="${d}" fill="var(--bg-chip, rgba(122,162,255,0.08))" stroke="var(--accent-primary, #7aa2ff)" stroke-width="1.6" stroke-linejoin="round"/>
  <text x="${originX + px(totalRun) / 2}" y="${originY + 16}" text-anchor="middle" font-size="11" fill="var(--text-secondary, #9aa)" font-family="var(--font-family-mono, monospace)">RUN ${result.formatted.totalRun} (${goingCount} goings)</text>
  <text x="${originX - 8}" y="${originY - px(totalRise) / 2}" text-anchor="end" font-size="11" fill="var(--text-secondary, #9aa)" font-family="var(--font-family-mono, monospace)" transform="rotate(-90 ${originX - 8} ${originY - px(totalRise) / 2})">RISE ${result.formatted.totalRise}</text>
  <text x="${diagX}" y="${diagY}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--accent-primary, #7aa2ff)" font-family="var(--font-family-mono, monospace)">${angleLabel}</text>
  <text x="${pad}" y="18" font-size="10" fill="var(--text-muted, #777)" font-family="var(--font-family-mono, monospace)">SIDE ELEVATION — 1:${riserCount} risers / ${goingCount} goings — proportional</text>
</svg>`.trim();

  return svg;
}
