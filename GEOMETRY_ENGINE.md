# 2D Geometry Engine

**Modules:** `src/core/geometry-engine.js` (general computational geometry),
`src/core/geometry.js` (domain geometry — walls, openings, dimensions,
junctions, CAD output), `src/core/geometry-tolerance.js` (centralized
tolerances). Pure, deterministic, dependency-free.

## Design position

The application already had a solid domain geometry layer (`geometry.js`:
distance, angle, offset, projection, line/segment intersection,
point-in-polygon, wall polygons, opening punch-outs, junctions, snap
helpers). Phase 4 added the **foundational general-purpose layer** rather
than duplicating it. Both layers share the centralized tolerance module.

## Primitives

Point, Vector (add/subtract/scale/dot/cross/length/normalize — zero-vector
normalize is safe), Segment ops, Polygon (signed/absolute area, perimeter,
centroid, orientation, self-intersection), Bounding box, Arc
(create/validate/arcToPolyline/arcLength — zero sweep = full circle),
Rectangle (via bounding box + `geometry.calcRectangle`).

## Operations (all tested)

- **Measures:** distance, midpoint, directionRadians ([0, 2π)), angleAtVertex
  ([0, π]), closestPointOnSegment (with parameter t, zero-length safe),
  distanceToLine
- **Orientation:** `orientation(a,b,c)` → collinear/clockwise/
  counterclockwise with tolerance-scaled cross product (nearly-collinear
  absorbed, 0.01 m offset not); `areParallel` (incl. anti-parallel),
  `arePerpendicular`
- **Intersection:** `intersectSegmentsDetailed` → `none` / `point` /
  `collinear-overlap` — nearly-parallel lines handled via tolerance-scaled
  denominator, collinear overlap returns the overlapping span
- **Containment:** `pointInPolygonDetailed` → inside/outside/**boundary**
  (ray-cast + boundary tolerance ring)
- **Polygon:** area, signed area, perimeter, centroid (null for degenerate),
  orientation (ccw/cw/degenerate), self-intersection detection (non-adjacent
  proper crossings), bounding box
- **Transforms:** translate, rotate about a center, scale about a center,
  mirror across a line (transformPoints helper)
- **Segment ops:** split at t (strictly interior, validated),
  joinCollinearSegments (any input direction — canonical lexicographic
  output order; non-collinear refuses), trimExtendToLine (trim/extend to a
  fence line, reports whether the hit lies within it)
- **Arc:** createArc (radius validation), arcToPolyline (n segments → n+1
  points, CCW/CW sweep), arcLength (start === end = full circle)

## Snapping

`plan-canvas.findSnapPoint` implements endpoint, corner, midpoint, center,
intersection, perpendicular, extension, and grid snaps with type priority
(endpoint/corner/intersection 5 > midpoint 3 > center/perpendicular 2 >
extension 1), per-type enable flags, exclusion ids, and draft-start tracking
(object tracking). Visible feedback: `activeSnap` renders a snap glyph in
the canvas (`snapMarkup` — square/X/perp-L/center/extension-ray glyphs per
type) plus contextual alignment guides. Polar tracking is available through
the numeric HUD (length/angle entry while drafting).

## Geometric invariants

`validateEntityGeometry(entity)` → `{ valid, violations: [{rule, message}] }`:

| Entity | Rules |
|---|---|
| wall/line | positive length, finite coordinates |
| room | ≥3 boundary vertices, non-zero area, no self-intersection (or positive width/depth) |
| dimension | references valid points, measures non-zero length |
| door/window | host wall id present, positive width |
| stair/ramp | positive width |

Consumers: save/load validation, AI SUGGEST evidence, future import
validation. Test count: 101 assertions in `tests/geometry-engine.test.js`.

## Precision

All tolerances come from `geometry-tolerance.js` — see
`GEOMETRY_TOLERANCE.md`. No raw epsilon literals in this module.

## Performance stance

Documented in `SPATIAL_QUERY_ARCHITECTURE.md`: linear scan behind a uniform
query API; index deferred until entity counts justify it.
