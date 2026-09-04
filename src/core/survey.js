/**
 * Architecture Helping Hand - Survey & Calibration Core
 * Phases 6+7: measurement notebook with provenance + raster image
 * calibration math. Pure, deterministic, zero-DOM.
 *
 * Survey measurements keep provenance (source + verification status) and
 * may stay uncertain — recording does not force geometry.
 * Calibration maps image pixels ↔ world meters through a two-point known
 * distance; the math is exact and testable without a browser.
 */

import { requireFiniteNumber } from './calculator.js';

// ---------------------------------------------------------------------------
// Phase 6: Survey / Measurement Notebook
// ---------------------------------------------------------------------------

export const MEASUREMENT_SOURCES = Object.freeze([
  'Measured', 'Estimated', 'Imported', 'AI Interpreted', 'User Entered'
]);

export const MEASUREMENT_STATUSES = Object.freeze([
  'Verified', 'Unverified', 'Needs Review'
]);

/**
 * Creates a survey measurement record. Values are stored as entered plus a
 * canonical meters field when parseable; uncertain records stay records.
 */
export function createMeasurement({ id, label, value, unit = 'm', source = 'Measured', status = 'Unverified', location = '', note = '', timestamp = null, roomId = null }) {
  if (typeof label !== 'string' || !label.trim()) {
    throw new TypeError('Measurement requires a label');
  }
  requireFiniteNumber(value, 'measurement.value');
  if (value <= 0) throw new Error('Measurement value must be greater than zero');
  if (!MEASUREMENT_SOURCES.includes(source)) {
    throw new Error(`Invalid measurement source "${source}". Valid: ${MEASUREMENT_SOURCES.join(', ')}`);
  }
  if (!MEASUREMENT_STATUSES.includes(status)) {
    throw new Error(`Invalid measurement status "${status}". Valid: ${MEASUREMENT_STATUSES.join(', ')}`);
  }
  return {
    kind: 'measurement',
    id: id || `meas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: label.trim(),
    value,
    unit,
    meters: null, // filled by the caller with the unit system (kept pure here)
    source,
    status,
    location: typeof location === 'string' ? location : '',
    note: typeof note === 'string' ? note : '',
    timestamp: timestamp || new Date().toISOString(),
    roomId
  };
}

/** Marks a measurement verified / needs-review (returns a new record). */
export function setMeasurementStatus(measurement, status) {
  if (!MEASUREMENT_STATUSES.includes(status)) {
    throw new Error(`Invalid status "${status}"`);
  }
  return { ...measurement, status };
}

/** Survey summary: counts by status and source, flagged items. */
export function summarizeSurvey(measurements) {
  const list = measurements || [];
  return {
    total: list.length,
    byStatus: MEASUREMENT_STATUSES.reduce((acc, s) => ({ ...acc, [s]: list.filter(m => m.status === s).length }), {}),
    bySource: MEASUREMENT_SOURCES.reduce((acc, s) => ({ ...acc, [s]: list.filter(m => m.source === s).length }), {}),
    needsAttention: list.filter(m => m.status !== 'Verified').map(m => ({ id: m.id, label: m.label, status: m.status }))
  };
}

/**
 * Converts recorded survey measurements into room-candidate dimensions when
 * the student explicitly chooses (label convention: "Room W" / "Room D").
 * Only VERIFIED records become proposal geometry — unverified measurements
 * stay records. Returns a proposal — never silently mutates the plan.
 */
export function proposeRoomFromMeasurements(measurements, roomName) {
  const list = measurements || [];
  const verified = list.filter(m => m.status === 'Verified');
  const width = verified.find(m => /(^|\s)(W|width)$/i.test(m.label)) || verified[0] || null;
  const depth = verified.find(m => /(^|\s)(D|depth)$/i.test(m.label)) || verified[1] || null;
  return {
    proposal: width && depth ? {
      name: roomName || 'Surveyed Room',
      widthMeters: width.meters !== null ? width.meters : width.value,
      depthMeters: depth.meters !== null ? depth.meters : depth.value,
      basedOn: [width.id, depth.id],
      note: 'Proposal only — the student accepts/edits it before any plan change.'
    } : null,
    needsMore: !width || !depth,
    unverifiedCount: list.filter(m => m.status !== 'Verified').length
  };
}

// ---------------------------------------------------------------------------
// Phase 7: Drawing / Image Calibration
// ---------------------------------------------------------------------------

/**
 * Creates a calibration from two image points and a known real distance.
 * Pure math: scale = realMeters / pixelDistance (meters per pixel).
 */
export function createCalibration({ pointA, pointB, realMeters, unitLabel = 'm' }) {
  if (!pointA || !pointB || typeof pointA.x !== 'number' || typeof pointA.y !== 'number' ||
      typeof pointB.x !== 'number' || typeof pointB.y !== 'number') {
    throw new TypeError('Calibration requires two image points with numeric x/y.');
  }
  requireFiniteNumber(realMeters, 'calibration.realMeters');
  if (realMeters <= 0) throw new Error('Known real distance must be greater than zero');
  const pixelDistance = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  if (pixelDistance <= 0) throw new Error('The two calibration points must differ.');
  return {
    kind: 'calibration',
    pointA, pointB,
    pixelDistance,
    realMeters,
    unitLabel,
    metersPerPixel: realMeters / pixelDistance,
    pixelsPerMeter: pixelDistance / realMeters
  };
}

/** Converts an image pixel coordinate to calibrated world meters. */
export function pixelToWorld(calibration, px, py) {
  return {
    x: px * calibration.metersPerPixel,
    y: py * calibration.metersPerPixel
  };
}

/** Converts world meters back to image pixels. */
export function worldToPixel(calibration, wx, wy) {
  return {
    x: wx * calibration.pixelsPerMeter,
    y: wy * calibration.pixelsPerMeter
  };
}

/** Distance between two pixel points, expressed in calibrated meters. */
export function calibratedDistance(calibration, a, b) {
  const pixelDist = Math.hypot(b.x - a.x, b.y - a.y);
  return pixelDist * calibration.metersPerPixel;
}

/**
 * Chained measurement: sums calibrated segments (point-to-point walk).
 */
export function calibratedChainDistance(calibration, points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new TypeError('Chained measurement requires at least two points.');
  }
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calibratedDistance(calibration, points[i - 1], points[i]);
  }
  return total;
}

/** Shoelace area of a pixel polygon, in calibrated square meters. */
export function calibratedPolygonArea(calibration, points) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new TypeError('Polygon area requires at least three points.');
  }
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2) * calibration.metersPerPixel ** 2;
}

// ---------------------------------------------------------------------------
// Image constraints (weak laptop: conservative limits, documented)
// ---------------------------------------------------------------------------

export const IMAGE_LIMITS = Object.freeze({
  maxFileBytes: 10 * 1024 * 1024,      // 10 MB import cap
  maxPixelDimension: 2000,             // downscale longest side to 2000 px
  recommendedFormats: ['png', 'jpg', 'jpeg', 'webp'],
  storageNote: 'Image blobs belong in IndexedDB (future) — never base64 in localStorage.'
});

/** Validates an image descriptor against the documented limits. */
export function validateImageMeta({ widthPx, heightPx, bytes }) {
  const problems = [];
  if (typeof bytes === 'number' && bytes > IMAGE_LIMITS.maxFileBytes) {
    problems.push(`File exceeds the ${IMAGE_LIMITS.maxFileBytes / 1024 / 1024} MB import cap.`);
  }
  if (typeof widthPx === 'number' && typeof heightPx === 'number') {
    const longest = Math.max(widthPx, heightPx);
    if (longest > IMAGE_LIMITS.maxPixelDimension) {
      problems.push(`Image will be downscaled: longest side ${longest} px > ${IMAGE_LIMITS.maxPixelDimension} px.`);
    }
  }
  return { ok: problems.length === 0, problems, limits: IMAGE_LIMITS };
}
