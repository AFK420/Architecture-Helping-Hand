# Constraint System

**Module:** `src/core/constraints.js` — named, recorded, deterministic
constraints. **No general-purpose solver**: every constraint type has exactly
one well-defined enforcement rule. Constraints are plain data records on the
document; the plan workspace wraps enforcement in its transaction system so
every change is undoable.

## Constraint record

```js
{
  id: 'con-…', type: 'wall_thickness',
  targetIds: ['wall-…'],
  params: { thickness: 0.3 },
  status: 'satisfied' | 'adjusted' | 'conflict',
  message: string,
  resolutions?: string[]      // conflict only — possible user resolutions
}
```

## Types and deterministic enforcement

| Type | Targets | Enforcement | Conflict when |
|---|---|---|---|
| `horizontal` / `vertical` | 1 segment | rotate about midpoint, keep length | target has no segment |
| `parallel` / `perpendicular` | 2 segments | rotate second about its midpoint | target lacks segment |
| `equal_length` | 2 segments | set both to the average | — |
| `fixed_distance` | 1 segment | exact length (`value` m) | non-positive value |
| `fixed_angle` | 1 segment | rotate to `angle`° from +X | non-finite angle |
| `wall_thickness` | wall | thickness = value | outside 0.05–2 m buildable range |
| `door_width` / `window_width` | opening | width = value | wider than the host wall (geometry untouched, resolutions listed) |
| `room_min_area` | room | grow depth (keep width), centered | non-positive minimum |
| `corridor_min_width` | 2 walls | move wall 2 along the normal to meet the gap | non-positive width |
| `stair_rise` / `stair_tread` | stair | set value, recompute Blondel + pitch | non-positive value |
| `clearance_envelope` | object + reference wall | push object out to the minimum | non-positive clearance |

## Conflicts never distort

On conflict the solver returns `status: 'conflict'` with the constraint,
objects, reason, and `resolutions[]` (possible user resolutions). Geometry is
**untouched** — verified by test (oversized door width leaves the original
width intact).

## API

```js
createConstraint(type, targetIds, params)   // validated record
solveConstraint(constraint, entities)       // single deterministic pass
solveConstraints(list, entities)            // ordered batch → report {satisfied, adjusted, conflicts, results}
```

Types are accepted as enum keys (`WALL_THICKNESS`) or values
(`wall_thickness`). Missing referenced entities are reported as conflicts
("Referenced entity not found") — never ignored.

## Undo

Constraints integrate through the plan workspace transaction wrapper: the
touched entities are deep-snapshotted before enforcement, restored on
rollback, and an `entity.updated` domain event is emitted. Constraint records
themselves are plain data on the project document (undoable via the standard
project commands).

## Tests

`tests/constraints.test.js` — 40 assertions: creation contract, every
geometric type, every architectural type, conflict paths (unbuildable
thickness, oversized door, missing parameter/target), batch report.
