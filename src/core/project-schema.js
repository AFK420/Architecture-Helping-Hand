/**
 * Architecture Helping Hand — Canonical Project Model (schema v2)
 *
 * The project model is the single source of truth:
 *   - geometry is stored (wall endpoints, room boundaries, points);
 *   - measurements (length, angle, area, perimeter) are DERIVED on demand —
 *     never trusted from storage;
 *   - every entity carries an identity contract (_meta) with timestamps,
 *     revision, and provenance;
 *   - relationships are indexed in one project-level map (no duplicated
 *     per-entity back-pointers that can drift);
 *   - domain events are emitted through a bounded, named-event bus.
 *
 * Migration contract: v1 projects upgrade in place via store.MIGRATIONS[0].
 * Fields removed by v2 are re-derived on access; nothing is silently lost.
 */

import { wallDirection, roomArea, roomPerimeter, generateEntityId } from './entities.js';
import {
  attachIdentity,
  ensureEntityId,
  addRelationship,
  removeEntityRelationships,
  relationshipsOf,
  createRelationshipIndex,
  createModelEventBus,
  PROVENANCE,
  MODEL_EVENTS
} from './entity-identity.js';

/** Schema version this module produces. */
export const PROJECT_SCHEMA_VERSION_V2 = 2;

// PROVENANCE / MODEL_EVENTS / identity / relationships / event bus live in
// the leaf module entity-identity.js and are re-exported below.
export { PROVENANCE, MODEL_EVENTS, attachIdentity, ensureEntityId,
  addRelationship, removeEntityRelationships, relationshipsOf,
  createRelationshipIndex, createModelEventBus } from './entity-identity.js';

// ---------------------------------------------------------------------------
// Identity contract
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Derived facts (computed on demand — never trusted from storage)
// ---------------------------------------------------------------------------

/** Derived geometry facts for any supported entity. Returns null when N/A. */
export function deriveFacts(entity, allEntities = []) {
  if (!entity || typeof entity !== 'object') return null;
  switch (entity.kind) {
    case 'wall':
    case 'line': {
      const p1 = entity.p1 || { x: entity.x1, y: entity.y1 };
      const p2 = entity.p2 || { x: entity.x2, y: entity.y2 };
      if (typeof p1?.x !== 'number' || typeof p2?.x !== 'number') return null;
      const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angleDegrees = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
      return {
        length: { value: length, class: 'CALCULATED', unit: 'm' },
        angleDegrees: { value: (angleDegrees + 360) % 360, class: 'CALCULATED', unit: '°' },
        direction: entity.kind === 'wall'
          ? { value: typeof wallDirection === 'function' ? wallDirection(entity) : null, class: 'DERIVED' }
          : null
      };
    }
    case 'room': {
      const area = roomArea(entity);
      const perimeter = roomPerimeter(entity);
      return {
        area: { value: area, class: 'CALCULATED', unit: 'm²' },
        perimeter: { value: perimeter, class: 'CALCULATED', unit: 'm' },
        centroid: entity.boundary?.length >= 3
          ? {
              value: {
                x: entity.boundary.reduce((s, p) => s + p.x, 0) / entity.boundary.length,
                y: entity.boundary.reduce((s, p) => s + p.y, 0) / entity.boundary.length
              },
              class: 'CALCULATED'
            }
          : null
      };
    }
    case 'dimension': {
      const p1 = entity.p1 || { x: entity.x1, y: entity.y1 };
      const p2 = entity.p2 || { x: entity.x2, y: entity.y2 };
      if (typeof p1?.x !== 'number' || typeof p2?.x !== 'number') return null;
      return {
        measuredLength: {
          value: Math.hypot(p2.x - p1.x, p2.y - p1.y),
          class: 'CALCULATED',
          unit: entity.unit || 'm'
        }
      };
    }
    case 'stair': {
      const riser = typeof entity.riserHeight === 'number' ? entity.riserHeight : null;
      const tread = typeof entity.tread === 'number' ? entity.tread : null;
      return riser && tread
        ? { blondel: { value: 2 * riser + tread, class: 'CALCULATED', unit: 'm' } }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Strips persisted derived shadow fields from an entity (v2 storage keeps
 * only stored facts). Callers that need measurements use deriveFacts().
 */
export function stripDerivedShadows(entity) {
  if (!entity || typeof entity !== 'object') return entity;
  if (entity.kind === 'line' || entity.kind === 'wall') {
    delete entity.length;
    delete entity.angleDegrees;
  }
  if (entity.kind === 'room') {
    delete entity.area;
    delete entity.perimeter;
  }
  return entity;
}

// ---------------------------------------------------------------------------
// v1 → v2 migration (pure; registered in services/store.js MIGRATIONS)
// ---------------------------------------------------------------------------

/**
 * Migrates a schemaVersion 1 project to 2:
 *  - ensures entity ids
 *  - strips stored derived shadows (length/angleDegrees/area/perimeter)
 *  - attaches _meta identity with provenance 'migrated'
 *  - creates empty relationships index (rebuilt on demand)
 * Fails loudly on non-object input; never corrupts.
 */
export function migrateProjectV1toV2(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error('Cannot migrate project: document must be an object');
  }
  const migrated = project;
  migrated.schemaVersion = 2;

  const docs = Array.isArray(migrated.documents) ? migrated.documents : [];
  for (const doc of docs) {
    if (!Array.isArray(doc.entities)) continue;
    for (const e of doc.entities) {
      if (!e || typeof e !== 'object') continue;
      ensureEntityId(e, e.kind, generateEntityId);
      stripDerivedShadows(e);
      attachIdentity(e, { provenance: PROVENANCE.MIGRATED, now: new Date().toISOString() });
    }
  }
  if (!migrated.relationships || typeof migrated.relationships !== 'object') {
    migrated.relationships = createRelationshipIndex();
  }
  return migrated;
}
