/**
 * Architecture Helping Hand — Entity Identity & Model Event Contract (leaf)
 *
 * Dependency-free: imported by entities.js (factories) and project-schema.js.
 * Must never import other core modules (bundle + cycle safety).
 */

/** Valid provenance tags (Absolute Rule #5: fact classes). */
export const PROVENANCE = Object.freeze({
  USER_INPUT: 'user_input',       // typed or clicked by the user
  DERIVED: 'derived',             // computed from stored facts (not persisted)
  IMPORTED: 'imported',           // arrived via DXF/SVG/CSV import
  AI_SUGGESTION: 'ai_suggestion', // proposed by AI, applied after approval
  AI_APPLIED: 'ai_applied',       // AI proposal the user accepted
  MIGRATED: 'migrated'            // transformed by a schema migration
});

/** Bounded domain event names. */
export const MODEL_EVENTS = Object.freeze([
  'entity.created', 'entity.updated', 'entity.deleted',
  'selection.changed', 'document.changed', 'view.changed',
  'layer.changed', 'requirement.changed', 'model.migrated'
]);

/**
 * Attaches the v2 identity contract to an entity (mutates + returns it).
 * Existing _meta is preserved (revision bumped) — factories call this with
 * fresh entities; migrations call it with stripped v1 entities.
 */
export function attachIdentity(entity, { provenance = PROVENANCE.USER_INPUT, now = null } = {}) {
  if (!entity || typeof entity !== 'object') {
    throw new Error('attachIdentity requires an entity object');
  }
  const ts = now || new Date().toISOString();
  if (!entity._meta) {
    entity._meta = {
      createdAt: ts,
      updatedAt: ts,
      revision: 1,
      provenance: Object.values(PROVENANCE).includes(provenance) ? provenance : PROVENANCE.USER_INPUT
    };
  } else {
    entity._meta.updatedAt = ts;
    entity._meta.revision = (entity._meta.revision || 1) + 1;
    if (!Object.values(PROVENANCE).includes(entity._meta.provenance)) {
      entity._meta.provenance = PROVENANCE.USER_INPUT;
    }
  }
  return entity;
}

/**
 * Ensures an entity has a stable id (v1 fixtures may lack one).
 * @param {object} entity - target entity (mutated)
 * @param {string} [kind] - id prefix (falls back to entity.kind / 'ent')
 * @param {Function} [idGenerator] - id factory; defaults to a local
 *   timestamp+random generator so this leaf module stays dependency-free.
 */
export function ensureEntityId(entity, kind, idGenerator = null) {
  if (!entity.id || typeof entity.id !== 'string') {
    const rand = Math.random().toString(36).slice(2, 7);
    const gen = idGenerator || ((k) => `${k || 'ent'}-${Date.now().toString(36)}-${rand}`);
    entity.id = gen(kind || entity.kind || 'ent');
  }
  return entity;
}

// ---------------------------------------------------------------------------
// Relationships (single project-level index — no duplicated back-pointers)
// ---------------------------------------------------------------------------

export const RELATION_TYPES = Object.freeze({
  CONTAINS: 'contains',        // room contains furniture
  HOSTS: 'hosts',              // wall hosts door/window
  BOUNDS: 'bounds',            // wall bounds room
  MEASURES: 'measures',        // dimension measures geometry
  CONNECTS: 'connects',        // stair connects levels
  REFERENCES: 'references',    // section/detail references geometry
  ON_SHEET: 'on_sheet'         // sheet contains views
});

/** Creates the empty relationship index for a project. */
export function createRelationshipIndex() {
  return { bySource: {}, byTarget: {} };
}

/** Records relationship: source —[type]→ target. Idempotent. */
export function addRelationship(index, type, sourceId, targetId) {
  if (!index || !type || !sourceId || !targetId) return index;
  const link = `${type}:${targetId}`;
  index.bySource[sourceId] = index.bySource[sourceId] || [];
  if (!index.bySource[sourceId].includes(link)) index.bySource[sourceId].push(link);
  const back = `${type}:${sourceId}`;
  index.byTarget[targetId] = index.byTarget[targetId] || [];
  if (!index.byTarget[targetId].includes(back)) index.byTarget[targetId].push(back);
  return index;
}

/** Removes every relationship touching an entity (call on delete). */
export function removeEntityRelationships(index, entityId) {
  if (!index || !entityId) return index;
  delete index.bySource[entityId];
  delete index.byTarget[entityId];
  // purge dangling back-references
  for (const key of Object.keys(index.bySource)) {
    index.bySource[key] = index.bySource[key].filter(link => {
      const target = link.split(':')[1];
      return index.bySource[target] !== undefined || !index.byTarget[entityId];
    });
  }
  return index;
}

/** Outgoing relationships of an entity: [{ type, targetId }] */
export function relationshipsOf(index, entityId) {
  if (!index || !index.bySource[entityId]) return [];
  return index.bySource[entityId].map(link => {
    const sep = link.indexOf(':');
    return { type: link.slice(0, sep), targetId: link.slice(sep + 1) };
  });
}

// ---------------------------------------------------------------------------
// Bounded domain event bus
// ---------------------------------------------------------------------------

/** Creates a named-event emitter restricted to MODEL_EVENTS. */
export function createModelEventBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!MODEL_EVENTS.includes(event)) throw new Error(`Unknown model event "${event}" — allowed: ${MODEL_EVENTS.join(', ')}`);
      if (typeof fn !== 'function') throw new Error('Event listener must be a function');
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      if (!MODEL_EVENTS.includes(event)) throw new Error(`Unknown model event "${event}"`);
      for (const fn of listeners.get(event) || []) {
        try {
          fn(payload);
        } catch (e) {
          // a faulty listener must never break the emitter
        }
      }
    },
    listenerCount(event) {
      return event ? (listeners.get(event)?.size || 0) : [...listeners.values()].reduce((s, l) => s + l.size, 0);
    },
    clear(event) {
      if (event) listeners.delete(event);
      else listeners.clear();
    }
  };
}

