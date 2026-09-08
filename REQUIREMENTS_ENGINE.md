# Requirements Engine

**Module:** `src/core/requirements.js` · **UI:** Brief & Requirements view ·
**Command:** `BRIEF` / `REQ` / `REQUIREMENTS`

Deterministic evaluation of project requirements against the actual model.
Same model in → same status out. Statuses: `PASS`, `FAIL`, `WARNING`,
`NEEDS_INPUT` (room not drawn yet), `NOT_APPLICABLE` (metric unavailable),
`UNVERIFIED`. Never invented.

## Requirement kinds

### Room requirements

```js
createRoomRequirement('Bedroom', { count: 2, minAreaM2: 14, minDimensions: { width: 3, depth: 3 } })
```

Matched by case-insensitive substring on room names. Evaluates count, minimum
area per matched room, and minimum dimensions. Statuses:
- `PASS` — count met, all matched rooms within limits (evidence lists each with area)
- `FAIL` — below count, below area, or below minimum dimensions (message names the room and the numbers)
- `NEEDS_INPUT` — no matching room drawn yet

### Metric requirements

```js
createRequirement({ name: 'Net area', type: 'MIN', scope: 'net_area', target: 40, unit: 'm2' })
```

Types: `MIN` (≥ target), `MAX` (≤ target), `EQUAL` (± tolerance), `PRESENCE`.
Scopes: `gross_area`, `net_area`, `room_count`, `floor_count` (from brief),
`custom.*`. Missing targets evaluate to `NEEDS_INPUT`, not FAIL — the engine
distinguishes "model doesn't comply" from "user hasn't specified".

### Adjacency

```js
createAdjacency('Kitchen', 'Dining', 'REQUIRED', 'HIGH', notes)
```

Levels: `REQUIRED` (missing → FAIL), `PREFERRED` (missing → WARNING),
`AVOID` (touching → FAIL). Adjacency = rooms touch or come within 0.1 m.
Evidence records matched room names and whether they touch.

## Whole-brief evaluation

`evaluateBriefCompliance(brief, entities)` returns
`{ results[], counts{PASS,FAIL,WARNING,NEEDS_INPUT,NOT_APPLICABLE,UNVERIFIED}, ranAt }`.
The Requirements view renders this as a status-badged list against the live
model — add a requirement, and the PASS/FAIL flips as the geometry changes.

## Verified end-to-end (browser)

Plan with a 12 m² room + requirement "1 × Room ≥ 14 m²" → panel shows
`FAIL — "Old Room" is 12.0 m², below the 14 m² minimum.` Resize/rename the
room and re-run: status flips deterministically.

## Tests

`tests/requirements.test.js` — see also `tests/constraints.test.js` for the
companion constraint enforcement. Determinism, status mapping, adjacency
levels, NEEDS_INPUT vs FAIL vs PASS paths all pinned.
