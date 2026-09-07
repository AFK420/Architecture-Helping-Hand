# Project Model Architecture

**Phase 2 — data foundation.** The project model is the source of truth for
geometry, rooms, walls, openings, furniture, levels, grids, dimensions,
annotations, sections, elevations, sheets, details, requirements, decisions,
issues, and views. Implementation: `src/core/entity-identity.js` (leaf),
`src/core/project-schema.js`, `src/services/store.js`, `src/core/project.js`.

## Layering

```
entity-identity.js   (LEAF — zero imports)
  PROVENANCE, MODEL_EVENTS, attachIdentity, ensureEntityId,
  relationship index, createModelEventBus
        ↑
entities.js          (pure geometry factories; issues entities WITHOUT
  ↑                   _meta — identity is attached at the model boundary)
project-schema.js    (deriveFacts, stripDerivedShadows, migrateProjectV1toV2;
  ↑                   re-exports the leaf contracts)
services/store.js    (persistence envelope, MIGRATIONS chain, transactions host)
  ↑
ui/views/plan.js     (commit boundary: attachIdentity on entity creation,
                      transact() for mutations, modelEvents bus instance)
```

Dependency direction is strictly downward. `entity-identity.js` must never
import other core modules (bundle-scope + cycle safety enforced by
`tests/build-integrity.test.js`).

## Stored vs derived facts

**Stored (persisted):** primary geometry only — wall `x1/y1/x2/y2/thickness`,
room `x/y/width/depth` or `boundary[]`, dimension `p1/p2`, line `p1/p2`,
counts (e.g. stair risers), plus name/kind/layer/floor.

**Derived (computed on demand via `deriveFacts(entity, allEntities)`):**
length, angle, direction, area, perimeter, centroid, measured length, Blondel.
Each derived fact is tagged with its evidence class:

```js
deriveFacts(wall) // → { length: { value: 5, class: 'CALCULATED', unit: 'm' }, … }
```

Classes: `FACT` (user-recorded), `CALCULATED` (deterministic from geometry),
`DERIVED`, `USER_INPUT`, `IMPORTED`, `AI_INFERENCE`, `AI_SUGGESTION`,
`ESTIMATE`, `UNVERIFIED`. AI is never the source of truth for measurements —
the deterministic engine is.

Stored shadow copies (`line.length`, `wall.length/angleDegrees`,
`room.area/perimeter`) are **stripped by the v1→v2 migration** and no longer
written. This removed the drift class where a stored copy disagreed with
geometry.

## Identity contract

Every entity that enters the project model carries:

```js
_meta: {
  createdAt: ISO-8601,
  updatedAt: ISO-8601,
  revision: number (bumps on re-attach),
  provenance: 'user_input' | 'derived' | 'imported' |
              'ai_suggestion' | 'ai_applied' | 'migrated'
}
```

Stamping points: `plan.js commitEntity()` (canvas creation — covers pointer
tools and command engine), the v1→v2 migration (provenance `migrated`), and
import/AI apply paths as they come online. Stable ids: factories generate
`kind-timestamp-random`; migration assigns ids to legacy entities that lack
them (never replacing existing ones).

## Relationships

One project-level index (`project.relationships = { bySource, byTarget }`),
types in `RELATION_TYPES`: `contains` (room→furniture), `hosts`
(wall→door/window), `bounds` (wall→room), `measures` (dimension→geometry),
`connects` (stair→levels), `references` (section/detail→geometry),
`on_sheet` (sheet→views). Deduplicated, purged on entity delete, queried with
`relationshipsOf(index, id)`. No per-entity back-pointer copies that can drift.

## Events

`createModelEventBus()` accepts only the bounded `MODEL_EVENTS` set
(`entity.created/updated/deleted`, `selection.changed`, `document.changed`,
`view.changed`, `layer.changed`, `requirement.changed`, `model.migrated`) —
unknown names are rejected at subscribe time. Emits are isolated: a throwing
listener never breaks the emitter. The plan workspace holds the first bus
instance (`modelEvents`).

## Persistence

Envelope `{ version, project }` at key `archiscale_project_store`; library at
`archiscale_project_library`. Load path: read → `migrateEnvelope` (loud failure
on newer schema) → `validateProject` → normalize. Library documents migrate
through the identical chain. Save failures surface to the caller (quota is
never silent).
