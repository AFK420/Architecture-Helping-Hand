# UX and architectural object library follow-up

Completed October 6, 2026, starting from pushed main at `dc1001e54bae2b6253d800964fc9002c27c6e232`. Main was pulled before changes; it was already up to date. This report accompanies the validated follow-up changes.

## What changed

Converter now presents two directions, measurement/units, a scale dropdown, four favorites, live result and Copy Result. Advanced retains all scale presets, custom ratio, equivalents, formula, graphic scale, optional size reference, imperial readout and history controls.

Blue actions, green successful results, amber warnings and red errors/destructive actions replace ordinary red calculation actions. Global actions move into More. Decorative corners, redundant badges, nested frames, oversized actions and technical typography are reduced. Browser QA prompted fixes to phone Requirements columns and closed drawers/palette intercepting clicks.

Object Library adds collections, explicit geometry, shared CAD preview/export, editable instance dimensions, real-size downloads, simpler cards and name-ranked search. Metadata, clearance and paper-size readouts remain available under More information. The service-worker cache was refreshed.

## What was not changed

Six-workspace navigation, registry routing, the four Dimensions engines, Research/citations, Site Analysis/Sun Path, Concept, the report model/templates, Chromium PDF boundary, optional Vivliostyle adapter, project migrations, deterministic calculators and AI routing remain in place. AI settings retain simple/advanced separation. No React, TypeScript or new frontend dependency was introduced. Original catalog dimensions remain unchanged.

## Files added

- `src/core/furniture/catalog-additions.js`, `catalog.js`, `collections.js`, `geometry-bindings.js`, `geometry-registry.js`, `scaling.js`.
- `src/core/furniture/geometry/primitives.js`, `residential.js`, `luxury.js`, `healthcare.js`, `landscape.js`, `streets.js`, `institutional.js`, `sports.js`, `specialist.js`.
- `src/ui/components/object-library.js`.
- `scripts/qa-config.mjs`, `scripts/qa-responsive.mjs`.
- `tests/object-library-followup.test.js`.
- `tests/geometry-tools.test.js`, `tests/geometry-tools-accuracy.test.js`: renamed retained shared-engine regression suites.
- This implementation report.

## Files removed

- Unused editor-only components: `src/ui/components/ribbon.js`, `palette.js`, `cpanels.js`, `tooltip.js`.
- Obsolete editor QA: `scripts/qa_plan_canvas_accuracy.py`.
- Old filenames `tests/plan-canvas.test.js`, `tests/plan-canvas-accuracy.test.js`; their shared math/geometry assertions remain under the new filenames.

The editor core and view were already removed in the previous redesign. No active shared geometry/export module was deleted.

## Important files modified

| Files | Changes |
| --- | --- |
| `src/ui/views/converter.js` | Direction projection, explanations and invalid-result clearing |
| `src/ui/app.js`, `index.html` | Simpler Converter, collections, instance editing, unit labels, More menu |
| `css/themes.css`, `css/companion.css` | Semantic colors, disclosure, calmer cards and responsive fixes |
| `src/core/furniture.js`, `furniture-taxonomy.js`, `object-library.js` | Preserved references, new collections/records and ranked search |
| `src/core/furniture-assets.js`, `src/ui/visualizer.js` | One registry geometry for preview and export |
| `src/ui/components/tool-help.js`, `src/core/tool-guides.js` | Collapsed guides and object workflow |
| `src/core/workspaces.js` | Current Object Library label/description, unchanged routing key |
| `scripts/build.js`, `js/app.js` | Manifest and regenerated bundle |
| `tests/run-all.js`, `engine-wiring.test.js`, `honesty-pass.test.js`, `redesign.test.js` | New checks, retained shared tests, removed dead panel assertions |
| `package.json`, `scripts/qa_probe.py`, `qa_browser_check.py`, `qa_operability.py`, `qa-report.json` | Current responsive runner and compatibility entry points |
| `sw.js`, `README.md`, `IA_PHASE_A.md` | Cache refresh and current documentation |

## Converter bug status

Fixed. `syncConverterDirectionUI()` projects labels, source/destination, mode buttons, result context, scale selection, description and formula from calculation state. Every calculation runs it, including entry, swap, restored initialization and external handoff. Library sends edited width in millimeters and explicitly selects real-to-drawing. Invalid input clears the previous result and explanation.

Tests cover synchronization, actual math after external state changes, invalid-result clearing and real browser Library → Converter handoff. At 1:50, 5 m produces 100 mm on paper; reversing direction produces 5 m from 100 mm.

## Scale Converter UX status

Implemented. Plain directions and live math replace the pipeline. All existing scale support and useful advanced controls remain under disclosure. Novelty references no longer compete with the result. Input/output units explicitly restore state instead of inheriting the first dropdown option.

## Furniture collection status

All 15 are browseable: Luxury Residential, Healthcare/Hospital, Police Department, Fire Department, Parks & Landscape, Plants & Trees, Streets & Urban, Education, Retail/Malls, Hospitality, Sports, Office/Workplace, Accessibility, Parking/Transport, Doors/Openings.

Fire has its own civic subcategory. Search includes names, collections, category/subcategory, tags, use cases and retained aliases. All ten requested example queries pass. Thirty-nine missing objects were added with explicitly illustrative editable defaults; they are not invented verified standards.

## Number of official objects with unique geometry

| Measure | Count |
| --- | ---: |
| Preserved existing reference records | 638 |
| Added illustrative reference records | 39 |
| Official records with explicit registered geometry | 677 of 677 |
| Distinct full-size plan geometries presented as cards | 623 |
| Reusable composition functions | 97 |
| Missing official definitions / silent fallbacks | 0 |

623 counts distinct exported plan geometry, including dimensional variants; it does not mean 623 independently hand-authored compositions. Exact duplicates browse once with their original IDs, names and height variants retained. Related objects reuse primitives/compositions. Existing calculation/lookup paths retain every original record.

Legacy details were recreated in the shared registry: Chesterfield tufting, wingback outline, recliner extension, grand-piano rim/keyboard, hospital-bed rails/casters, gym equipment and whirlpool jets. Preview and downloads use the same geometry. Audit corrections cover basins, SCBA, fire poles, ellipticals, checkout counters, drinking fountains, tracks, helipads and service equipment. Vegetation distinguishes palms, conifers, olive/ornamental/deciduous canopies, shrubs, flowers, grass, groundcover and climbing plants. Representative composition sheets were rendered and visually reviewed.

## Resize + DXF status

Implemented. Edit Size changes width, depth and relevant height in millimeters, with proportion lock, Reset Original, live preview and validation. Sizes belong to temporary instances; frozen references do not mutate. Invalid input disables export/copy/handoff until corrected or reset.

Actual resized hospital-bed downloads measure 1100 × 2400 mm in model space. DXF declares millimeters (`$INSUNITS = 4`), keeps 1:1 sizing and uses existing LINE/POLYLINE entities. Layers include A-FURN, A-DOOR, A-VEGETATION, A-VEHICLE, A-SITE and optional A-CLEARANCE. Paper scale leaves exports unchanged. Reference clearance is a separate allowance.

## Resize + SVG status

Implemented. SVG uses edited vector geometry, physical millimeter width/height and a bounds-based viewBox, with no raster image. The actual bed download reports 1100 mm width and 2400 mm height. At 1:50 its paper readout is 22 × 48 mm; changing that scale leaves the CAD asset unchanged.

## Plan Canvas cleanup status

Unused components/build entries and obsolete editor QA were removed after checking callers. Five dead panel-only assertions were removed. Shared constraints, geometry tools, math kernels, 3D helpers, DXF/SVG export and their regression suites remain. Legacy projects with deprecated drawing fields still migrate, round-trip and load safely. Current navigation contains no Plan Canvas. Obsolete nine-workspace/editor documentation was replaced with current contracts.

## Help system status

All major registered tools retain guidance. Purpose and timing appear in plain introductions. How to use reveals Overview, Example, CAD Workflow and Other/Technical notes. Original WHAT/WHY/WHEN/HOW/EXAMPLE/AutoCAD/Rhino/SketchUp/OTHER content remains represented. Object help explains editing and actual downloads.

## QA status

`qa-report.json` was regenerated from current navigation: Home plus 28 live modes at 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080. All 203 main mode/viewport checks pass, plus four Dimensions tabs, open resize controls and the shortcuts dialog at each size. Zero reported overflow/cut-off/readability/dialog findings and zero browser errors.

Workflow checks cover converter direction/custom ratio, actual resized downloads, scale independence, proportion lock, reset, invalid input and handoff. Phone/desktop screenshots were reviewed. The runner found real layout/hidden-overlay bugs; it does not force blocked clicks to pass. This is a targeted audit, not exhaustive testing of every saved state or native CAD program.

## Test results

- Full suite: 68 of 68 suites, 6101 counted assertions passed.
- Lint: 150 source files, zero errors/warnings.
- Existing browser suite: navigation, Dimensions tabs, saved research/source/site/concept, report preview/PDF and reload passed; zero browser errors.
- Existing report suite: all 10 physical-size/template combinations passed with long text, quotes, diagrams, sources and 95 table rows; static CLI handoff passed.
- Current responsive suite: all seven sizes and physical download workflows passed.

The bundled Node runtime ran the exact scripts behind npm commands because npm is not on this shell's PATH.

## Build result

Passed. The manifest/source regenerated `js/app.js`, size 2285.1 KB. The generated bundle was not edited manually. Build integrity and duplicate declaration checks pass.

## Known limitations

- Symbols are schematic planning references, not manufacturer models. Resizing stretches internal detail. Height is metadata in 2D exports, not a 3D solid.
- Added dimensions are illustrative defaults. Existing provenance remains unchanged; no new verified standard or manufacturer precision is claimed.
- Related dimensional variants reuse compositions. Exact duplicate plans browse once with aliases; these are not 677 independently drawn manufacturer-specific models.
- Thin openings and some specialist footprints remain diagrammatic. Curves use sampled CAD polylines. Reference clearances remain independent allowances, not recomputed certified access zones.
- Edits survive filtering/rerendering during the open library session but are not persisted as custom project assets.
- Native AutoCAD/Rhino/SketchUp import was not available. Coordinates, units, vector content and actual browser downloads were verified.

## Next recommended work

Smoke-test bed, tree, door and vehicle imports in the user's CAD software. Refine thin-opening/specialist detail where that workflow requires it, add source-backed manufacturer variants, and optionally persist custom instances in projects.

## Requested checklist

- [x] Converter direction sync fixed
- [x] Scale Converter simplified
- [x] Red primary calculation actions removed
- [x] Global UI clutter reduced
- [x] Help UX improved
- [x] Luxury Residential collection
- [x] Healthcare collection
- [x] Police collection
- [x] Fire Department collection
- [x] Parks/Landscape collection
- [x] Plants/Trees collection
- [x] Streets/Urban collection
- [x] Furniture geometry registry
- [x] Existing detailed symbols migrated/recreated
- [x] Official assets have recognizable schematic geometry (limitations above)
- [x] Edit Size implemented
- [x] Live resize preview implemented
- [x] Resized DXF implemented
- [x] Resized SVG implemented
- [x] DXF remains real-size 1:1
- [x] Furniture cards simplified
- [x] Search improved
- [x] Dead Plan Canvas code removed
- [x] Legacy projects remain safe
- [x] QA report updated
- [x] Full tests pass
- [x] Build passes
- [x] Lint passes
