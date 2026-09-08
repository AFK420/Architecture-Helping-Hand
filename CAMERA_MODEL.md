# Camera Model

**Module:** `src/core/camera3d.js` · **Renderer compatibility:** byte-matches
`massing-3d.projectPoint3D` (locked by test).

## State

```js
{
  azimuth, elevation,           // degrees — view direction
  zoom,                         // px per meter (orthographic scale)
  panX, panY,                   // screen-space offset in px
  target: { x, y, z },          // world anchor added to ray origins
  preset,                       // named preset id or null
  projection: 'orthographic'    // perspective matrix reserved
}
```

## Named presets

`top, bottom, front, back, left, right, perspective, isometric_ne/nw/se/sw` —
all defined in `VIEW_PRESETS` with azimuth/elevation. `Top = (0°, 89.9°)`,
`Front = (0°, 0°)`, `Right = (90°, 0°)`, `Perspective = (45°, 35.264°)`.
The on-canvas compass, `TOP/FRONT/RIGHT/PERSPECTIVE` commands, and orbit
chips all map to this same table (no competing camera definitions).

## Operations

| Op | Function | Contract |
|---|---|---|
| world → screen | `worldToScreen3D` | byte-compatible with the renderer |
| screen → ray | `screenToWorldRay` | exact inverse (world→screen→ray round-trip < 1e-6 for all presets, pinned by test) |
| orbit | `orbitCamera` | azimuth wraps ±180°, elevation clamped to ±89.9° (no pole flip) |
| pan | `panCamera` | screen-space delta |
| zoom | `zoomCamera` | factor applied, clamped 2–400 px/m |

## Picking

```js
const s = worldToScreen3D(worldPoint, camera);   // for overlay markers
const ray = screenToWorldRay(clickX, clickY, camera);
const hit = rayCastMesh(ray, meshFaces);          // nearest { t, point, faceIndex }
```

`rayCastMesh` treats each face as a triangle fan (convex polygon) and
returns the nearest hit with its face index — the basis for 3D object/face
selection.

## Basis convention

`cameraViewDirection(camera)` returns the **depth-buffer gradient**
`(sinAz·cosEl, cosAz·cosEl, sinEl)` — the direction in which
`massing-3d`'s depth value increases, i.e. from the viewer into the scene.
`cameraBasis(camera)` derives right/up from it with a stable fallback near
the top/bottom poles.
