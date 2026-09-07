# Spatial Query Architecture

**Decision: no R-tree/grid index yet.** The uniform query API exists so an
index can be inserted behind it without touching callers — but the current
linear scan is the correct implementation at documented entity counts.

## The API (implemented, `src/core/geometry-engine.js`)

```js
entityBounds(entity)                    // → {x, y, width, depth} | null
queryRect(entities, rect)               // → intersecting entities
queryNearest(entities, pt, maxDistance) // → closest center within radius
queryViewport(entities, viewRect)       // → viewport culling
```

Every entity kind is normalized through `entityBounds` (walls/lines/dimensions
from endpoint pairs; box entities from x/y/width/depth). Callers never
special-case kinds.

## Why linear scan today (evidence, not preference)

- Measured entity volumes: interactive plans run 10s–100s of entities; the
  render loop already performs a full `entities()` iteration per frame and
  the existing `pickEntities` marquee/click path is linear.
- An R-tree costs: structural churn on every create/move/delete (the plan
  mutates continuously while drafting), ~500+ lines of new code, and new
  failure modes — for a win measured in microseconds at n < 500.
- Premature-index risk is asymmetrical: the scan cannot produce wrong
  results; a buggy index can.

## The trigger threshold (when to add an index)

Revisit when **any** of these is measured true:
- entity count routinely exceeds **~2,000** in one document, or
- pick/marquee latency exceeds one frame budget (>16 ms) in a profile, or
- canvas render loop drops frames attributable to geometry queries
  (visibility checks during panning/zooming on large plans).

## Then: grid index, not R-tree (first choice)

An **uniform grid** (cell size ≈ typical room size, ~2–4 m) fits the workload
better than an R-tree:
- entities are static most of the time (drafting bursts, then idle),
- queries are uniformly distributed point/rect lookups (pick, snap, cull),
- implementation is ~80 lines with O(1) insert and O(cells) queries,
- incremental update on move = remove/reinsert two cell lists.

An R-tree becomes preferable only for heavy range queries over long thin
spans (long walls crossing many cells); the `queryRect` signature hides that
choice from all callers.

## Callers today (verified)

- `pickEntities` (plan-canvas) — click + marquee box picking
- `queryNearest`-style snapping via `findSnapPoint`
- render loop visibility via `isEntityVisible` per entity
- AI SUGGEST overlap/relationship checks (`suggestForDocument`)

All should migrate to `queryRect`/`queryNearest` as their first optimization
step; the API is already in place.
