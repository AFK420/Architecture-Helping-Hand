# Issue Engine

**Module:** `src/core/issue-engine.js` · **UI:** Plan workspace → `ISSUES`
command (or `AUDIT` alias) renders the interactive panel in the inspector.

## What it is

A deterministic project checking system: 21 explicit rules run against the
active document and produce **issue objects** — same model in, same issues
out, every time. No AI, no sampling, no fuzzy "health score".

## Rule registry

Every rule is an explicit frozen record: `{ id, name, severity, scope,
description, recommendedAction, run(entities, context) }`. 21 rules across
seven scopes:

| Scope | Rules |
|---|---|
| geometry | `geo.invalid` (validity invariants), `geo.self_intersection`, `geo.duplicate`, `geo.overlap` (with m² evidence), `geo.disconnected` |
| room | `room.min_area` (bedroom minimum, configurable), `room.proportion` (>2.5:1), `room.missing_door`, `room.missing_window` (habitable names), `room.furniture_fit` |
| door / window | `door.host`, `door.clearance` (swing blocked by furniture), `window.host` |
| dimension | `dim.mismatch` (recorded span matches no edge), `dim.duplicate` |
| stairs / ramps | `stair.blondel` (600–660 mm), `stair.riser_high` (>190 mm), `ramp.slope` (>1:12) |
| documentation | `doc.missing_dimension` (majority undimensioned), `doc.missing_north`, `doc.missing_annotation` (default room names) |

New rules are one `rule(def, run)` call away; a rule that throws is reported
as an `*.unverified` issue instead of aborting the audit.

## Issue object

```js
{
  id: 'iss-…', severity: 'critical|high|medium|low|info',
  rule: 'geo.overlap', entityIds: ['r1','r2'],
  location: { x, y, width, depth },
  evidence: { overlapArea: 2.0, a: 'Room A', b: 'Room B' },
  message: 'Rooms "A" and "B" overlap by 2.0 m².',
  recommendation: 'Move or resize one room…',
  status: 'FAIL' | 'WARNING', createdAt: ISO
}
```

Status mapping: critical/high → FAIL, medium/low/info → WARNING. The full
vocabulary (PASS / NOT_APPLICABLE / NEEDS_INPUT / UNVERIFIED) is used where
applicable — a throwing rule yields `UNVERIFIED`, not a silent skip.

## Entry point

```js
runAllChecks(entities, { roomMinArea: 7.5 })
// → { issues[], failed, warning, rulesRun, ranAt }
```

## UI

The `ISSUES` command (alias `AUDIT`) runs the audit and renders the sorted
panel in the inspector: severity badge, status, message, rule, entity count,
recommendation. **Click an issue → selects its entities on the canvas**
(through the standard selection system, so AI/tools/inspector all follow) and
shows the evidence + recommendation as a toast. A clean document shows an
explicit "none found" panel with the rule count.

## Tests

`tests/issue-engine.test.js` — 35 assertions: clean-plan baseline,
self-intersection/overlap/duplicate/disconnected detection, room
area/proportion/door/window/annotation rules, orphan door/window, stale and
duplicate dimensions, stair/ramp violations, issue-object contract, and
determinism (same model → same issues).
