/**
 * Architecture Helping Hand — Centralized Geometric Tolerances (leaf module)
 *
 * Single source of truth for every geometric epsilon. Do NOT scatter raw
 * epsilon values through geometry code: import the named constant.
 *
 * Units: meters (world space), unless a name says PIXELS or RADIANS.
 *
 * Values are NOT arbitrary:
 *  - EPSILON_TINY   → pure float-noise guard (comparisons, zero checks)
 *  - EPSILON_SMALL  → dimension/precision tolerances (unit conversions)
 *  - EPSILON_MEDIUM → architectural modeling threshold (a 0.1 mm error is
 *                     far below construction tolerance)
 *  - EPSILON_LARGE  → user-perceptible snapping/hit radius
 *
 * Historical note: the codebase previously used scattered literals (1e-4,
 * 1e-9, 1e-6, 0.35, 0.25 …). Existing call sites keep their values via the
 * named equivalents below; new code must import from here.
 */

/** Float-noise guard: |a − b| < EPSILON_TINY ⇒ treat a and b as equal. */
export const EPSILON_TINY = 1e-9;

/** Precision tolerance: unit conversion noise, area zero-checks. */
export const EPSILON_SMALL = 1e-6;

/**
 * Architectural tolerance: 0.1 mm. Smaller than any buildable dimension —
 * segments shorter than this, or gaps smaller than this, are degenerate.
 */
export const EPSILON_MEDIUM = 1e-4;

/** Default pick/snap radius in world meters (user-perceptible). */
export const SNAP_TOLERANCE_METERS = 0.25;

/** Wall junction/endpoint association tolerance in world meters. */
export const JUNCTION_TOLERANCE_METERS = 0.35;

/** On-screen pixel radius for hit testing (converted with current zoom). */
export const HIT_TOLERANCE_PIXELS = 12;

/**
 * Equality with tolerance. Absolute for values near zero, relative for large
 * magnitudes (scales gracefully from 1e-6 m details to 10 km sites).
 */
export function approxEqual(a, b, epsilon = EPSILON_MEDIUM) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= epsilon * scale;
}

/** Strictly zero within tolerance. */
export function isZero(value, epsilon = EPSILON_MEDIUM) {
  return Math.abs(value) <= epsilon;
}
