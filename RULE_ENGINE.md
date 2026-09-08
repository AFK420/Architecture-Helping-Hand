# Rule Engine

**Module:** `src/core/issue-engine.js` (registry + runner). Rules are the
atomic units of the QA engine — each is deterministic, scoped, and
self-describing.

## Rule record

```js
{
  id: 'room.min_area',                 // stable rule id (issue.rule references it)
  name: 'Room below minimum area',     // human name
  severity: 'medium',                  // critical | high | medium | low | info
  scope: 'entity' | 'document',        // single entity or whole-document check
  description: string,                 // what the rule tests
  recommendedAction: string,           // the fix suggestion
  run(entities, context) → issues[]    // deterministic check
}
```

`run` returns issue objects (see `ISSUE_ENGINE.md`) or an empty array. A rule
that throws is converted into an `UNVERIFIED` issue — never a silent skip.

## Severity → status mapping

| severity | issue.status |
|---|---|
| critical, high | FAIL |
| medium, low, info | WARNING |

Context parameters (e.g. `roomMinArea`) come from the caller so thresholds
stay configurable without touching rules.

## Full registry (21 rules)

**geometry (5):** `geo.invalid` (critical — validity invariants from
`validateEntityGeometry`), `geo.self_intersection` (high),
`geo.duplicate` (medium — same kind/position/size),
`geo.overlap` (high — room footprints, m² evidence), `geo.disconnected`
(low — wall shares no endpoint).

**room (5):** `room.min_area` (medium — bedroom < 7.5 m², configurable),
`room.proportion` (low — >2.5:1), `room.missing_door` (medium),
`room.missing_window` (low — habitable names),
`room.furniture_fit` (low).

**door (2):** `door.host` (medium — no wall at position),
`door.clearance` (medium — swing blocked by furniture).

**window (1):** `window.host` (medium).

**dimension (2):** `dim.mismatch` (medium — recorded span matches no edge),
`dim.duplicate` (low — same place, same span).

**stairs/ramps (3):** `stair.blondel` (medium — outside 600–660 mm),
`stair.riser_high` (high — >190 mm), `ramp.slope` (high — >1:12).

**documentation (3):** `doc.missing_dimension` (medium — majority
undimensioned walls), `doc.missing_north` (low), `doc.missing_annotation`
(low — default room names).

## Adding a rule

1. Call `rule({ id, name, severity, scope, description, recommendedAction },
   run)` in `issue-engine.js`.
2. Add assertions to `tests/issue-engine.test.js` (determinism + a fixture
   that triggers the rule).
3. The registry-integrity checks in the suite will fail if the rule lacks
   id/severity/run.
