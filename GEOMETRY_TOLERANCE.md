# Geometry Tolerance

**Single source of truth:** `src/core/geometry-tolerance.js` (leaf module —
no imports). All geometric comparisons in new code must use these named
constants; raw epsilon literals in geometry code are a review failure.

## The values (and why they are what they are)

| Constant | Value | Purpose | Rationale |
|---|---|---|---|
| `EPSILON_TINY` | 1e-9 m | float-noise guard | pure double noise is ~1e-15 relative; 1e-9 gives 6 orders of margin while never absorbing real geometry |
| `EPSILON_SMALL` | 1e-6 m | precision tolerances | unit-conversion noise (e.g. ft↔m) stays below 1e-6 for architectural magnitudes |
| `EPSILON_MEDIUM` | 1e-4 m = **0.1 mm** | architectural degeneracy threshold | 0.1 mm is an order of magnitude below construction tolerance — segments/gaps below it are modeling noise, not geometry |
| `SNAP_TOLERANCE_METERS` | 0.25 m | pick/snap radius | user-perceptible cursor radius at common zooms |
| `JUNCTION_TOLERANCE_METERS` | 0.35 m | wall endpoint association | two wall ends within 35 cm form a junction |
| `HIT_TOLERANCE_PIXELS` | 12 px | on-screen hit radius | ergonomic click target (≈ finger-width at typical DPI) |

## Helpers

```js
approxEqual(a, b, epsilon = EPSILON_MEDIUM)  // relative-scaled equality
isZero(value, epsilon = EPSILON_MEDIUM)      // tolerance zero test
```

`approxEqual` scales the tolerance by `max(1, |a|, |b|)` — a single rule that
behaves correctly from 1e-6 m details up to 10 km site extents without a
special-cased "big value" epsilon.

## Historical values → named constants

The codebase previously scattered literals. Their equivalents:

| Scattered literal | Named constant | Meaning |
|---|---|---|
| `1e-4` (19 sites) | `EPSILON_MEDIUM` | degenerate segment/gap threshold |
| `1e-9` (5 sites) | `EPSILON_TINY` | parallel/zero denominators |
| `1e-6` (2 sites) | `EPSILON_SMALL` | near-coincident points |
| `0.35` | `JUNCTION_TOLERANCE_METERS` | wall junctions |
| `0.25` / `0.20` | `SNAP_TOLERANCE_METERS` | snapping/picking |

Existing call sites keep their behavior (the named constants equal the old
values); they should migrate to the import opportunistically — never in a
drive-by edit, because several are behavior-coupled to tests.

## Handling rules (what the tolerances decide)

| Situation | Rule |
|---|---|
| nearly parallel lines | cross product ≤ `EPSILON_TINY` × scale → treat as parallel |
| nearly coincident points | `pointsEqual` with `EPSILON_MEDIUM` |
| tiny segments | length ≤ `EPSILON_MEDIUM` → degenerate (reject in invariants) |
| zero-length geometry | `isZero(length)` → guarded (no NaN division) |
| degenerate polygon | signed area ≤ `EPSILON_MEDIUM` → flagged `degenerate` |
| self-intersection | proper crossing of non-adjacent edges (test-pinned) |
| collinear overlap | returned as an overlap span, not silently dropped |
| touching boundaries | boundary ring of `EPSILON_MEDIUM` around edges → `'boundary'` |
| comparison equality | `EPSILON_TINY` on canonical values (`2 m = 2000 mm` ⇒ true) |
