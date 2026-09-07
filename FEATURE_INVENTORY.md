# Feature Inventory (Phase-1 forensic baseline)

Evidence legend: **B** = browser-verified this pass · **T** = unit/integration tests · **S** = static code only. No documentation used as evidence.

## A. Plan Canvas workstation

| Feature | Location | UI entry | Command | Tests | Browser | Persistence | Health |
|---|---|---|---|---|---|---|---|
| Line drawing | plan.js drag chain + entities.createLineEntity | palette `line`, `L` | `LINE` | cad-commands T | **B** drag→entity | project save | READY |
| Polyline chain | plan.js polyLineVertices + finishPolyline | palette `polyline`, `PL` | `PLINE`(tool) | ghost-tools T | **B** 3 clicks→2 segs | project save | READY |
| Wall drawing | plan.js createWallEntity | palette, `W` | `WALL`(+Width opt) | T | **B** | project save | READY |
| Room rect | plan.js createRoomEntity | palette, `R` | `REC 6 4`/`RECTANGLE` | T | **B** | project save | READY |
| Polygon room | polyRoomVertices + finishPolyRoom | palette, Shift+R | — | T | **B** | project save | READY |
| Dimension | createDimension | palette `dimension` | `DIMLIN` | T | **B** (creates; see D2) | project save | **PARTIAL — inspector crash D2** |
| Measure | computeMeasurement | palette `measure`, `M` | `DIST` | T | **B** (distance computed; crash D1 during drag) | scratchpad save | **PARTIAL — runtime error D1** |
| Stair entity | createStairEntity | palette, `S` | `STAIR` legacy | T | **B** | project save | READY |
| Ramp entity | createRampEntity | palette | — | T | **B** | project save | READY |
| Column / grid | grid-columns.js | palette | — | T | **B** | project save | READY |
| Door / window | wall-hosted placement | palette | — | T | **B** | project save | READY |
| Furniture | 215-item DB + symbols | palette `furniture` | — | furniture T | **B** | project save | READY |
| North arrow | createNorthArrow | palette `north` | — | S | **B** | project save | READY |
| Section cut / detail callout | sections-elevations/details | palette | — | T | **B** | project save | READY |
| Text annotation | placeTextAnnotation (window.prompt) | **none** — not in catalog/palette | — | S | **B** (prompt reachable only via `setTool('text')`) | project save | **HIDDEN** |
| Leader note | createLeaderNote | static palette `leader` only | — | S | **B** | project save | READY (catalog gap) |
| Hatch / material paint | hatch patterns | palette `hatch` | `HATCH brick` | T | S | project save | READY |
| Snap / ortho / grid | status bar toggles | status chips | — | T | S | prefs | READY |
| Undo/redo | createHistory command objects | buttons, Ctrl+Z/Y | `U`/`REDO` | T | **B** (2→1→2) | — | READY |
| Marquee box-select | marqueeOrPan + overlay div | Select tool empty-drag | — | ghost T | **B** "2 Items" + visible box | — | READY |
| Ctrl+A select all | keydown handler | keyboard | `SELECTALL`/`ALL` | — | **B** "4 Items" | — | READY |
| Document tabs | renderTabs/createDocument | tab bar | — | T | **B** | project save | READY |
| 3D massing | massing-3d.js | palette/pills | `PERSPECTIVE` | T | **B** | project save | READY |
| Elevation/section/detail/sheet | sections-elevations/details/sheet | tabs/menu | `FRONT`/`RIGHT` | T | **B** | project save | READY |
| 4-view split | render4ViewportSplit | `4VIEW` | `4VIEW` | S | **B** (renders 4 quadrants + pills; maximize verified) | project save | READY |
| Zoom/pan/fit | transform system | toolbar/compass | `ZOOM`/`PAN`/`FIT` | T | **B** | prefs | READY |
| Navigation compass | plan-nav-compass | on-canvas | `TOP` etc. | S | **B** | — | READY |
| Auto-reframe on off-screen draw | commitEntity guard | automatic | — | — | **B** | — | READY |

## B. Calculators / studio tools (converter, rescaler, detector, area-volume, workspace, expression, multiscale, chains, clipboard, batch, handoff, stairs, ramps, slopes, furniture, reference, survey, imports, export, projects)

All covered by dedicated suites (T); studio calculators previously browser-verified.
Not re-operated this pass (out of tool-matrix scope) — recorded as **TESTED (T), browser pass earlier**.

## C. AI system

| Feature | Evidence | Health |
|---|---|---|
| AI Studio job runner (jobRouter) | T (ai-*, provider tests) + **B** (UI reachability, question routing) | READY (execution needs user key — NOT verified) |
| AI Control Center (keys/models/tests) | T (services) + **B** (renders, honest confirm on endpoint change) | READY |
| Selection evidence packets | T (ai-context 21 assertions) + **B** (question content) | READY |
| Deterministic SUGGEST/INFO | **B** ("2 suggestions…", info rows) | READY |
| Provider real-request test | **NOT VERIFIED — requires user key** | UNKNOWN |

## D. Shell

| Feature | Evidence | Health |
|---|---|---|
| Ctrl+K command palette | T (ui-contracts) | READY (placeholder entry honest) |
| Command bar engine | cad-commands T (41) + **B** 26-command matrix | READY (see D4 note) |
| PWA/service worker | build T + **B** (cache busting verified) | READY |
| Themes | T | READY |

## Confirmed Phase-1 defect list (for the fix phase)

| ID | Defect | File:line | Trigger |
|---|---|---|---|
| D1 | measure preview reads `meas.distance`/`meas.angleDeg` (undefined) + `m.formatted` | plan.js:3628, 6019 | any measure drag |
| D2 | inspector `(depth \|\| run).toFixed` on horizontal dimension | cpanels.js:71 | select horizontal dim |
| D3 | `text` tool has no UI path (catalog + palette missing) | personas.js / index.html | discoverability |
| D4 | after setting a mid-command option, prompt stays at step 1 with only the log line as indicator | commandbar.js | WALL `Width=0.3` |
| D5 | `.tool-surface` max-width 1480px centered | main.css:728,6310 | viewport >1480 |
| D6 | canvas height `calc(100vh - 340px)` guess; 115px bottom gap at 1080p | main.css:907 | all viewports |
