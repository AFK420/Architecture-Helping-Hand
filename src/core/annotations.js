/**
 * Architecture Helping Hand - Annotations Core
 * Phase 8: structured 2D annotation objects for the plan canvas and
 * calibrated images. Pure data + validation; rendering is the view's job.
 *
 * Supported kinds: text, dimension, arrow, line, rect, circle, note-marker.
 * Annotations live in the project document (id-referenced) and participate
 * in undo/redo through the plan history.
 */

import { requireFiniteNumber } from './calculator.js';

export const ANNOTATION_KINDS = Object.freeze([
  'text', 'dimension', 'arrow', 'line', 'rect', 'circle', 'note'
]);

/**
 * Creates a validated annotation. Geometry is in the coordinate space of
 * whatever layer it belongs to (plan world meters or image pixels) — the
 * layer field records which.
 */
export function createAnnotation({ id, kind, layer = 'plan', x, y, x2, y2, text = '', color = 'accent', roomId = null, imageId = null, createdAt = null }) {
  if (!ANNOTATION_KINDS.includes(kind)) {
    throw new Error(`Invalid annotation kind "${kind}". Valid: ${ANNOTATION_KINDS.join(', ')}`);
  }
  requireFiniteNumber(x, 'annotation.x');
  requireFiniteNumber(y, 'annotation.y');
  if (['dimension', 'arrow', 'line', 'rect'].includes(kind)) {
    requireFiniteNumber(x2, 'annotation.x2');
    requireFiniteNumber(y2, 'annotation.y2');
  }
  if (kind === 'text' && (typeof text !== 'string' || !text.trim())) {
    throw new Error('Text annotations require non-empty text.');
  }
  if (kind === 'note' && (typeof text !== 'string' || !text.trim())) {
    throw new Error('Note markers require note text.');
  }
  if (kind === 'circle') {
    // circle stores radius in x2
    requireFiniteNumber(x2, 'annotation.radius');
    if (x2 <= 0) throw new Error('Circle radius must be greater than zero.');
  }
  return {
    kind: 'annotation',
    annotationKind: kind,
    id: id || `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    layer, // 'plan' | 'image'
    x, y,
    x2: x2 !== undefined ? x2 : null,
    y2: y2 !== undefined ? y2 : null,
    text,
    color,
    roomId,
    imageId,
    createdAt: createdAt || new Date().toISOString()
  };
}

/** Moves an annotation by dx/dy (both anchor and end). Returns a new object. */
export function moveAnnotation(annotation, dx, dy) {
  return {
    ...annotation,
    x: annotation.x + dx,
    y: annotation.y + dy,
    x2: annotation.x2 !== null ? annotation.x2 + dx : null,
    y2: annotation.y2 !== null ? annotation.y2 + dy : null
  };
}

/** Dimension annotations expose their measured length (same-space units). */
export function annotationLength(annotation) {
  if (annotation.annotationKind !== 'dimension' && annotation.annotationKind !== 'line' && annotation.annotationKind !== 'arrow') {
    return null;
  }
  return Math.hypot(annotation.x2 - annotation.x, annotation.y2 - annotation.y);
}

/** Validates a list of annotation payloads; returns { valid, errors } without throwing. */
export function validateAnnotations(annotations) {
  const errors = [];
  for (const a of annotations || []) {
    try {
      // Strip wrapper fields so raw payloads validate cleanly
      const { kind: wrapperKind, id, createdAt, ...rest } = a || {};
      createAnnotation({ ...rest, kind: rest.annotationKind || a?.annotationKind || a?.kind });
    } catch (e) {
      errors.push({ id: a?.id || null, error: e.message });
    }
  }
  return { valid: errors.length === 0, errors };
}
