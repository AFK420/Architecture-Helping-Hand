# Data Schema

**Current schema version: 2** (`PROJECT_SCHEMA_VERSION`, `src/core/project.js`).

## Project document (v2)

```js
{
  schemaVersion: 2,
  id: string,                       // stable: 'proj-<ts>-<rand>'
  metadata: { name, description, author, createdAt, updatedAt },
  site: { location, notes, areaM2: number|null },
  dimensions: [], chains: [], notes: [], snapshots: [],
  decisions: [], exports: [], scratchpad: [],
  documents: [ Document ],
  relationships: { bySource: { entityId: ['type:targetId'] },
                   byTarget: { entityId: ['type:sourceId'] } },  // v2
  plan: { entities: [], savedAt }   // legacy flat view, maintained for compat
}
```

## Entity common shape

| Field | Status | Notes |
|---|---|---|
| `id` | stored | stable, factory-generated or migration-assigned |
| `kind` | stored | discriminator (`wall`, `room`, `line`, `dimension`, …) |
| `name` | stored | user-visible |
| `layerId` / `floorId` | stored | layer + level membership |
| `metadata` | stored | free-form, factory-seeded |
| `_meta` | **v2** | `{ createdAt, updatedAt, revision, provenance }` |
| geometry (per kind) | stored | wall `x1/y1/x2/y2/thickness`, room `width/depth|boundary[]`, line `p1/p2`, dimension `p1/p2/offset/style/unit` |
| `length`, `angleDegrees`, `area`, `perimeter` | **REMOVED in v2** | derived via `deriveFacts()` — storage copies are stripped on migration and no longer written |
| `openingIds` (wall) | stored | host relationship also indexed in `relationships` |

## Storage envelope

```js
{ version: number, project: Document }   // version === schema target (2)
```

## Rules

1. **No redundant truth** — a measurement must be recomputable from stored
   geometry; persisting it is a schema violation (enforced by migration strip
   and factory review).
2. **Relationships live in the index**, not as per-entity back-pointer copies.
3. **Validation** — `validateProject(doc)` must pass before any persist;
   failures return `{ok:false, errors[]}` and never corrupt storage.
4. **Loud failure** — future schema versions refuse to open with an explicit
   message; older versions migrate through the registered chain.
