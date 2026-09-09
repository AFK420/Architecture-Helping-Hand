# Tool Health Matrix (runtime-verified)

Evidence: B = operated live in-browser this audit · T = test suite · S = static code.
Statuses use the contract vocabulary. 65 catalog tools + static-palette extras.

> **Audit pass 4 (2026-09-09, "honesty pass")**: D1/D2 below are FIXED and
> pinned by `tests/audit-regressions.test.js`; the measure-release toast
> remainder (`m.formatted`) was fixed in the same pass. Nine further live
> defects found by the 2026-09 audit were fixed and pinned by
> `tests/honesty-pass.test.js` — see PRODUCTION_HARDENING_CHANGELOG.md.

## Drawing & editing tools

| Tool | id | Visible | Click | Drag | Command | Entity created | Undo | Persist | Crash-free | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Line Segment | line | ✅ palette+ribbon | ✅ | ✅ | `LINE`/`L` | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Polyline | polyline | ✅ | ✅ | click-chain | `PLINE`(tool) | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Wall | wall | ✅ | ✅ | ✅ | `WALL`+Width | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Room | room | ✅ | ✅ | ✅ | `REC`/`RECTANGLE` | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Polygonal Room | polyroom | ✅ | ✅ click-chain | — | `POLYROOM`(tool) | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Dimension | dimension | ✅ | ✅ | ✅ | `DIMLIN` | ✅ B | ✅ | ✅ | ❌ **D2** | **PARTIAL — RUNTIME_ERROR** (horizontal dim crashes inspector; fix known) |
| Measure | measure | ✅ | ✅ | ✅ | `DIST` | n/a (inquiry) | n/a | scratchpad | ❌ **D1** | **PARTIAL — RUNTIME_ERROR** (preview crash every drag; result correct on release) |
| Text annotation | text | ❌ **HIDDEN** | n/a | n/a | none | ✅ S | ✅ | ✅ | ✅ | **HIDDEN — MISSING_UI_ENTRY** |
| Leader note | leader | ✅ static palette only (❌ catalog) | ✅ | ✅ | none | ✅ B | ✅ | ✅ | ✅ | **READY** (catalog gap noted) |
| Stair | stair | ✅ | ✅ | ✅ | `STAIR` legacy | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Ramp | ramp | ✅ | ✅ | ✅ | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Column | column | ✅ | ✅ click-place | — | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Grid line | grid | ✅ | ✅ | ✅ | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Door / Window | door/window | ✅ | ✅ on-wall | — | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Furniture | furniture | ✅ | ✅ click-place | — | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| North arrow | north | ✅ | ✅ | — | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Section cut | section_cut | ✅ | ✅ | ✅ | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Detail callout | detail_callout | ✅ | ✅ | ✅ | — | ✅ B | ✅ | ✅ | ✅ | **READY** |
| Hatch | hatch | ✅ | ✅ on-room | — | `HATCH pat` | mutation B | ✅ | ✅ | ✅ | **READY** |
| Material paint | material_paint | ✅ (Rhino persona) | ✅ | — | — | mutation | ✅ | ✅ | ✅ | **READY** |
| Watercolor brush | watercolor_brush | ✅ (Photoshop persona) | ✅ | — | — | mutation | ✅ | ✅ | ✅ | **READY** |

## Selection, navigation, inquiry

| Tool | id | Works | Evidence | Status |
|---|---|---|---|---|
| Select (click/move) | select | ✅ | **B** | **READY** |
| Marquee box-select | select empty-drag | ✅ overlay + Shift-add | **B** "2 Items" | **READY** |
| Select all | Ctrl+A / `SELECTALL` | ✅ | **B** "4 Items" | **READY** |
| Pan tool | pan | ✅ drag | **B** | **READY** |
| Zoom extents | zoom_extents | ✅ | **B** | **READY** |
| Orbit | orbit | ✅ routes to 3D view | **B** | **READY (aliased)** |
| Area calc | area_calc | ✅ routes to measure | **B** | **READY (aliased)** — inherits D1 during drag |
| Dim aligned | dim_aligned | ✅ routes to dimension | **B** | **READY (aliased)** — inherits D2 |
| Info / Properties / Suggest / AI / Analyze | — | ✅ | **B** | **READY** |

## View / document

| Tool | Works | Evidence | Status |
|---|---|---|---|
| view_top / view_south / view_perspective | ✅ doc switch | **B** | **READY** |
| view_right (east) | ✅ creates/activates East Elevation | **B** | **READY** |
| view_4split | ✅ 4 quadrants + pills + maximize | **B** | **READY** |
| C-panels ×4 | ✅ tab switch | **B** | **READY** |
| Flyouts (stairs/hatch/marquee) | ✅ | **B** | **READY** |
| Ribbon tab switchers ×5 | ✅ | **B** | **READY** |

## PLANNED — declared, dimmed, honest (19 + 2 flyout subs)

lasso, lasso_poly, lasso_magnetic, crop_tool, dim_chain, curve_nurbs,
curve_fillet, curve_offset, curve_boolean, surface_planar, surface_extrude,
surface_loft, surface_revolve, solid_box, boolean_union, boolean_diff,
mesh_from_srf, quad_remesh, subd_box, subd_crease, block_create.

Status: **MISSING_IMPLEMENTATION (declared)** — dimmed with ⏳ badge in
palette + ribbon; activation shows an honest toast; contract test
(`ghost-tools.test.js`, 39 assertions) blocks silent regressions.

## Exact defect records

```
TOOL: Measure
STATUS: PARTIAL — RUNTIME_ERROR
Expected: live distance/angle preview during drag, no console errors
Actual: Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')
Root Cause: field-name mismatch — template reads meas.distance / meas.angleDeg,
  computeMeasurement() returns distanceMeters / angleDegrees; also m.formatted
File: src/ui/views/plan.js
Function: renderScene (dragMarkup measure branch) + onPointerMove measure branch
Line: 3628, 6019
Dependency: computeMeasurement (plan-canvas.js:442)
User Impact: error on every measure drag; final distance still correct
Fix: use distanceMeters/angleDegrees; use formattedM on release (PENDING APPROVAL)
Regression Test: ghost-tools/cad-commands extension (planned in fix phase)
Verification: pending fix
```

```
TOOL: Dimension
STATUS: PARTIAL — RUNTIME_ERROR
Expected: placing + selecting any dimension renders inspector
Actual: horizontal dimension (depth=0) → Uncaught TypeError in inspector render;
  inspector stops updating for ALL subsequent selections until reload
Root Cause: (depth || run).toFixed — depth=0 is falsy → undefined.toFixed
File: src/ui/components/cpanels.js
Function: renderStudioCPanels (Length/Run row)
Line: 71
Dependency: createDimension (entities.js) — returns depth: 0 for horizontal dims
User Impact: inspector appears frozen/broken after placing a horizontal dimension
Fix: Number.isFinite guard on depth/run (PENDING APPROVAL)
Verification: pending fix
```

```
TOOL: Text Annotation
STATUS: HIDDEN — MISSING_UI_ENTRY
Expected: reachable from palette/ribbon/catalog
Actual: not present in STUDIO_TOOL_CATALOG, studio palette, or ribbon; only
  reachable programmatically (setTool('text'))
File: src/core/personas.js, index.html
User Impact: feature exists and works but no user can discover it
Fix: add catalog entry + palette button (PENDING APPROVAL)
Verification: pending fix
```
