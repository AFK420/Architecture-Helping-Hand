/**
 * Architecture Helping Hand - Shared Slope Math
 * Architectural Tools Phase: the ONE canonical rise/run → slope conversion.
 *
 * This module exists because two real features (Ramps, Slopes) — and
 * conceptually Stairs — need the identical conversion from a rise/run
 * geometry to percentage, ratio, and angle. Extracting it removes the last
 * duplicated formula in the application: every tool now consumes this
 * single definition, so the representations can never diverge.
 *
 * Pure, deterministic, zero-DOM. Canonical meters in, plain numbers out.
 *
 * CONVENTIONS (documented contract):
 *  - slopePercent = rise / run × 100
 *  - ratioValue   = |run / rise|       (displayed "1 : X" — 1 unit rise per X run;
 *                 the magnitude is always positive; the direction word
 *                 ascending/descending carries the sign)
 *  - angleDegrees = atan2(rise, run) × 180/π
 *  - Zero run with nonzero rise is VERTICAL: percent is ±Infinity, ratio 0,
 *    angle ±90° — represented structurally, never fabricated as a normal slope.
 *  - Zero rise with nonzero run is FLAT: percent 0, angle 0; ratio is
 *    Infinity (undefined as "1 : X") and is represented as such.
 *  - Signs carry direction: positive rise = ascending, negative = descending.
 */

/** Direction classification for a rise/run geometry. */
export const SLOPE_DIRECTIONS = Object.freeze({
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
  FLAT: 'flat',
  VERTICAL: 'vertical'
});

/**
 * The canonical conversion: rise/run geometry → every slope representation.
 * This is the single mathematical definition used by Ramps and the Slope
 * Analyzer (and available to Stairs/any future geometry tool).
 *
 * @param {number} riseMeters - signed rise (positive = ascending)
 * @param {number} runMeters - signed run (positive = forward)
 * @returns {{
 *   kind: 'normal'|'flat'|'vertical'|'invalid',
 *   direction: string,
 *   slopePercent: number|Infinity|-Infinity|null,
 *   ratioValue: number|Infinity|null,
 *   angleRadians: number,
 *   angleDegrees: number
 * }}
 */
export function slopeFromGeometry(riseMeters, runMeters) {
  if (typeof riseMeters !== 'number' || !isFinite(riseMeters) ||
      typeof runMeters !== 'number' || !isFinite(runMeters)) {
    return { kind: 'invalid', direction: SLOPE_DIRECTIONS.FLAT, slopePercent: null, ratioValue: null, angleRadians: NaN, angleDegrees: NaN };
  }

  const angleRadians = Math.atan2(riseMeters, runMeters);
  const angleDegrees = angleRadians * (180 / Math.PI);

  // Vertical: no horizontal run to divide by (run exactly 0)
  if (runMeters === 0) {
    if (riseMeters === 0) {
      return { kind: 'invalid', direction: SLOPE_DIRECTIONS.FLAT, slopePercent: null, ratioValue: null, angleRadians: 0, angleDegrees: 0 };
    }
    return {
      kind: 'vertical',
      direction: SLOPE_DIRECTIONS.VERTICAL,
      slopePercent: riseMeters > 0 ? Infinity : -Infinity,
      ratioValue: 0,
      angleRadians,
      angleDegrees
    };
  }

  // Flat: run exists, rise is zero
  if (riseMeters === 0) {
    return {
      kind: 'flat',
      direction: SLOPE_DIRECTIONS.FLAT,
      slopePercent: 0,
      ratioValue: Infinity,
      angleRadians: 0,
      angleDegrees: 0
    };
  }

  const slopePercent = (riseMeters / runMeters) * 100;
  // Ratio is reported as a positive magnitude (1 : |X|); the direction word
  // (ascending/descending) carries the sign — see formatSlopeRatio. This
  // avoids confusing outputs like "-1 : 10".
  const ratioValue = Math.abs(runMeters / riseMeters);
  return {
    kind: 'normal',
    direction: riseMeters > 0 ? SLOPE_DIRECTIONS.ASCENDING : SLOPE_DIRECTIONS.DESCENDING,
    slopePercent,
    ratioValue,
    angleRadians,
    angleDegrees
  };
}

/**
 * Inverse conversions from a slope representation back to rise/run geometry.
 * All of these route their result back through slopeFromGeometry so every
 * representation agrees by construction.
 *
 * run from rise + percent:  run = rise / (percent / 100)
 * rise from run + percent:  rise = run × (percent / 100)
 * run from rise + ratio:    run = rise × ratioValue
 * rise from run + ratio:    rise = run / ratioValue
 * run from rise + angle:    run = rise / tan(angle)
 * rise from run + angle:    rise = run × tan(angle)
 *
 * Angle is accepted in degrees. tan(90°) is infinite → vertical, which
 * the caller must treat as the structured vertical case, not a number.
 */
export function runFromRiseAndPercent(riseMeters, percent) {
  return riseMeters / (percent / 100);
}

export function riseFromRunAndPercent(runMeters, percent) {
  return runMeters * (percent / 100);
}

export function runFromRiseAndRatio(riseMeters, ratioValue) {
  return riseMeters * ratioValue;
}

export function riseFromRunAndRatio(runMeters, ratioValue) {
  return runMeters / ratioValue;
}

export function runFromRiseAndAngle(riseMeters, angleDegrees) {
  const radians = angleDegrees * (Math.PI / 180);
  return riseMeters / Math.tan(radians);
}

export function riseFromRunAndAngle(runMeters, angleDegrees) {
  const radians = angleDegrees * (Math.PI / 180);
  return runMeters * Math.tan(radians);
}
