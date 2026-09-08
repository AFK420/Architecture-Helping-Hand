# 3D Engine

**Modules:** `src/core/geometry3d.js` (foundational 3D math),
`src/core/camera3d.js` (camera model), `src/core/massing-3d.js` (existing
renderer + extrusion — unchanged). Layered: geometry3d is a leaf; camera3d
imports only geometry3d; massing-3d keeps its own forward projection which
camera3d now byte-matches.

## Primitives

| Primitive | API |
|---|---|
| Point3 / Vector3 | `Vec3.add/sub/scale/dot/cross/length/normalize/lerp/distance` (zero-vector normalize is safe) |
| Mat4 | column-major Float64Array; `identity, multiply, translation, scaling, rotationX/Y/Z, mirrorPlane, transformPoint, transformVector` |
| BoundingBox3D | `createBoundingBox3D, bbox3AddPoint, bbox3Center, bbox3Intersects` (empty-box aware) |
| Ray | `createRay` (validated non-zero direction), `rayIntersectsBox` (slab), `rayIntersectsTriangle` (Möller–Trumbore), `rayIntersectsFace` (triangle fan), `rayCastMesh` (nearest hit + face index) |
| Plane | `createPlane(point, normal)`, `planeDistanceToPoint`, `rayIntersectsPlane`, `clipPolygonAgainstPlane` (keeps normal side, returns `{vertices, clipped}`) |
| Quaternion | minimal `Quat.fromAxisAngle → toMat4` (justified: composed orbits without gimbal drift; not used where Mat4 suffices) |

## Transforms

`translate / rotateX/Y/Z / scale / mirrorPlane` as Mat4 factories; compose
with `Mat4.multiply(a, b)` meaning "apply b, then a". World/local coordinates
resolve by composing `translation(-pivot) · T · translation(pivot)`.
`mirrorPlane` builds `T·(I − 2nnᵀ)·T⁻¹` for an arbitrary plane through
`point` with unit `normal`.

## Cameras

`createCamera3D({ preset, azimuth, elevation, zoom, panX, panY, target,
orthographic })` — the massing-3d convention (Z-up world, screen Y down,
zoom = px/meter, pan in px). Named presets:

| Preset | azimuth | elevation |
|---|---|---|
| top | 0° | 89.9° |
| bottom | 0° | −89.9° |
| front | 0° | 0° |
| back | 180° | 0° |
| left | −90° | 0° |
| right | 90° | 0° |
| perspective | 45° | 35.264° |
| isometric NE/NW/SE/SW | ±45/135/−135 | 35.264° |

Operations: `orbitCamera` (clamped before pole flip), `panCamera`,
`zoomCamera` (2–400 px/m). `VIEW_PRESETS` is shared data — the compass,
view commands, and orbit chips all read the same table.

## Projection

- `worldToScreen3D(p, camera)` — byte-compatible with
  `massing-3d.projectPoint3D` (locked by test)
- `screenToWorldRay(x, y, camera)` — exact inverse: solves the view-plane
  equations for the point on the ray at z = 0 (or y1 = 0 for horizontal
  views), then walks the ray along `cameraViewDirection` (the depth-buffer
  gradient `(sinAz·cosEl, cosAz·cosEl, sinEl)`)
- Round-trip pinned: for **all 11 presets**, screen → ray → closest approach
  to the original world point < 1e-6 (hostile test at end of suite)

This is the essential picking primitive: cast `screenToWorldRay` into
`rayCastMesh` and the nearest face/object comes back for 3D editing.

## Sectioning

`clipPolygonAgainstPlane` clips convex vertex rings against a section plane,
keeping the normal side and inserting exact intersection points. This is the
shared foundation for the section/elevation generators and any future 3D
live sectioning — the same model drives 3D, sections, and elevations with no
duplicated geometry.

## Testing

`tests/geometry3d.test.js` — 53 assertions: vector algebra, matrix
composition (with the translate∘rotate order pinned), mirror, bbox,
slab/triangle/mesh ray tests including ray-pointing-away cases, plane
distance/intersection/clip (including fully-outside → empty), quaternion,
and the all-preset round-trip hostile check.
