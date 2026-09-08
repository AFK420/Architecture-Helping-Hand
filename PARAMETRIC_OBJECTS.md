# Parametric Objects

**Module:** `src/core/parametric.js`. Architectural objects expose typed
**parameters** — the single source of truth shared by the properties
inspector, the constraint system, and AI context. `applyParameter` recomputes
derived values immediately so derived truth is never stale, and rejects
writes to derived parameters with guidance.

## Door

| Parameter | Kind | Range | Notes |
|---|---|---|---|
| width | length | 0.6–2.5 m | |
| height | length | 1.8–2.7 m | |
| swing | enum | left, right | |
| hinge (flipSide) | enum | near, far | |
| wallId | reference | — | host wall |

## Window

| Parameter | Kind | Range | Notes |
|---|---|---|---|
| width | length | 0.4–4 m | |
| sill | length | 0–2 m | driving parameter |
| **head** | length | 0.5–4 m | **drives height**: height = head − sill (changing the sill moves the head) |
| wallId | reference | — | host wall |

## Stair

| Parameter | Kind | Range | Notes |
|---|---|---|---|
| risers | count | 3–50 | recomputes riser height from total rise |
| riserHeight | length | 0.1–0.25 m | recomputes riser count from total rise |
| tread | length | 0.2–0.45 m | recomputes **Blondel 2R+T** and pitch |
| width | length | 0.6–4 m | flight width |
| blondel | derived | — | **read-only** — writes rejected with guidance |

## Room

| Parameter | Kind | Range | Notes |
|---|---|---|---|
| name, type | string | — | |
| width / depth | length | 0.3–100 m | |
| **targetArea** | area | 1–10 000 m² | keeps width, grows depth (deterministic) |

## Wall

`thickness` (0.05–2 m), `height` (1–10 m), `assemblyId`.

## API

```js
getParametersFor(kind)        // parameter descriptors or null
readParameters(entity)        // { name: value } snapshot
applyParameter(entity, name, value)
// → { ok: true, changed: [name] }
// → { ok: false, error }        WHAT/EXPECTED messages, bounds included
```

Every `apply` also recomputes dependent derived values (Blondel, pitch,
window head) — see each `apply` implementation. Unknown parameters list the
available names; out-of-range values state the bounds; derived writes state
which driving parameters to set instead.

## Tests

`tests/constraints.test.js` section 6 — 40 assertions total: descriptors for
the full architectural set, read snapshots, apply/in-range/out-of-range/
unknown/derived paths, room targetArea growth semantics, stair Blondel
recomputation.
