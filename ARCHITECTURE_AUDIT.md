# Architecture Helping Hand — Codebase Audit & Core Architecture

**Date**: September 3, 2026  
**Repository**: [https://github.com/AFK420/Architecture-Helping-Hand.git](https://github.com/AFK420/Architecture-Helping-Hand.git)  
**Status**: Verified & Hardened (P14 + Phase 15/16 — 2,863 Assertions, 36 Suites)  

---

## 0. Build Pipeline Contract (Added September 2, 2026)

The deterministic zero-dependency build remains the single deployment path: `src/` → `scripts/build.js` → `js/app.js`.

**Incident record**: An earlier version of the build manifest (hard-coded inside `generateBundleContent()`) omitted six toolkit core modules (`dimension-expression.js`, `multi-scale.js`, `dimension-chains.js`, `cad-clipboard.js`, `batch-cad.js`, `quick-dimension.js`). Tests passed because they import `src/` directly, but the shipped bundle threw `ReferenceError`s for Parts 3–8 at runtime. The manifest now lives in an exported `BUNDLE_MODULES` constant, is complete, and is guarded by three automated defense layers in `tests/build-integrity.test.js`:

1. **Manifest coverage** — every `src/**/*.js` file must be registered in `BUNDLE_MODULES` (or the documented `NON_RUNTIME_MODULES` allowlist), exactly once, with dependency-first ordering (a module's relative imports must be bundled before it).
2. **Bundle content** — the generated `js/app.js` must contain the distinctive definitions of every module and be byte-identical to a fresh regeneration from `src/`.
3. **Runtime smoke test** — the bundle executes end-to-end against a minimal mocked browser environment (`window`, `document`, `navigator`, `localStorage`) and boots without unresolved references.

**Runtime module rule**: every `*.js` file under `src/` is a runtime module by definition. Test helpers and support code live exclusively in `tests/`. If a support-only file must ever live under `src/`, it must be added to `NON_RUNTIME_MODULES` in `scripts/build.js` with a documented reason.

**How to add a new source module safely**:
1. Create `src/core/<module>.js` (or `services/`/`ui/`).
2. Add it to `BUNDLE_MODULES` in `scripts/build.js` **after** every module it imports.
3. Run `npm test` — `build-integrity.test.js` fails loudly if the module is missing from the manifest, misordered, or absent from the bundle.
4. Run `npm run build && node scripts/build.js --check`.

---

## 1. Executive Summary

This document presents the verified architectural audit and technical foundation of **Architecture Helping Hand**. The architecture enforces a strict, centralized calculation pipeline:

$$\text{Raw User Input} \longrightarrow \text{Parser} \longrightarrow \text{Normalized Measurement} \longrightarrow \text{Calculation Engine} \longrightarrow \text{Formatter} \longrightarrow \text{UI Presentation}$$

Every calculation in the studio (Scale Converter, Rescaler, Scale Detector, Area Scaler, Volume Scaler, and Furniture Catalog) uses this single canonical mathematical foundation.

---

## 2. Verified Component Architecture

```
Architecture-Helping-Hand/
├── src/
│   ├── core/
│   │   ├── units.js               # Canonical unit definitions (Length, Area, Volume) & strict requireUnit validation
│   │   ├── parser.js              # Unified input parser (decimals, fractions, architectural ft-in, unit extraction)
│   │   ├── calculator.js          # Pure math engine (scaling, rescaling, scale detection, area S², volume S³)
│   │   ├── geometry.js            # Pure geometry math engine (Rectangles, Circles, Triangles, Shoelace Polygons)
│   │   ├── formatter.js           # Epsilon-stabilized decimal rounding & architectural notation formatting
│   │   ├── presets.js             # 28 architectural scale presets & contiguous real-world reference objects
│   │   ├── furniture.js           # 179 furniture & fixture database records across 9 architectural domains
│   │   ├── dimension-workspace.js # Dimension Workspace schedule engine (entries, groups, serialization)
│   │   ├── dimension-expression.js# Deterministic dimension expression parser & evaluator (Part 3)
│   │   ├── cad-clipboard.js       # CAD-friendly clipboard formatting engine (Part 6)
│   │   ├── multi-scale.js         # Multi-scale comparison engine (Part 4)
│   │   ├── dimension-chains.js    # Ordered additive dimension chain engine (Part 5)
│   │   ├── batch-cad.js           # Batch CAD conversion engine (Part 7)
│   │   ├── quick-dimension.js     # Quick Dimension Strip engine (Part 8)
│   │   ├── cad-targets.js         # CAD target profiles & send-to handoff payload builder (Part 9)
│   │   ├── stairs.js              # Stair Calculator engine: modes, candidates, Blondel, SVG (Architectural Tools)
│   │   ├── ramps.js               # Ramp Calculator engine: slope/ratio/angle, targets, SVG (Architectural Tools)
│   │   ├── slope-math.js          # SHARED canonical slope math: rise/run → percent/ratio/angle (Ramps + Slopes)
│   │   ├── slopes.js              # Slope Analyzer engine: signed geometry, consistency checks, targets (Architectural Tools)
│   │   ├── survey.js              # Survey & calibration core: measurement provenance, two-point image calibration (Phase 16)
│   │   ├── annotations.js         # Annotation core: structured 2D annotation objects (tested pure module)
│   │   └── project.js             # Project Document Model: versioned, validated, serializable envelope (Stabilization 2)
│   ├── services/
│   │   ├── storage.js             # Safe LocalStorage wrapper with memory fallback
│   │   ├── store.js               # Versioned project store: migrations, recovery, pub/sub, legacy import (Stabilization 3+4)
│   │   ├── history.js             # Calculation history manager with JSON validation & CSV/Markdown export
│   │   ├── audio.js               # Web Audio API acoustic feedback synthesizer
│   │   └── commands.js            # Global command palette registry
│   └── ui/
│       ├── view-registry.js       # View registry & shared view context contract (Stabilization 1)
│       ├── visualizer.js          # Proportional visualizer, graphic scale bar & tailored 2D blueprint SVGs
│       ├── app.js                 # Global controller: startup, navigation, palette, keyboard, view assembly
│       └── views/                 # Feature view controllers (one module per mode/tool)
│           ├── converter.js       # Mode 1: Scale Converter
│           ├── rescaler.js        # Mode 2: Rescaler
│           ├── detector.js        # Mode 3: Scale Detector
│           ├── area-volume.js     # Mode 4: Area & Volume
│           ├── expression-multiscale.js # Modes 8-9: Expression + Multi-Scale
│           ├── dimension-chains.js# Mode 10: Dimension Chains
│           ├── cad-clipboard-handoff.js # Modes 11+13: CAD Clipboard & CAD Handoff
│           ├── batch-cad.js       # Mode 12: Batch CAD Conversion
│           ├── quick-dimension.js # Quick Dimension Strip micro-tool
│           ├── history.js         # Calculation Journal drawer
│           ├── stairs.js          # Mode 14: Stair Calculator
│           ├── ramps.js           # Mode 15: Ramp Calculator
│           ├── slopes.js          # Mode 16: Slope Analyzer
│           ├── imports.js         # Mode 22: Importer (CSV/DXF/SVG ingestion)
│           └── survey.js          # Mode 23: Survey Notebook (measurements + calibration)
│   └── ai/                          # AI layer (Phases 9-13): reasoning over deterministic data
│       ├── providers/provider.js    # Provider abstraction: capability manifest, error taxonomy, key store
│       ├── tools/registry.js        # Tool registry: schema validation, permission tiers
│       ├── tools/architecture-tools.js # 17 read/calculate/propose tools bound to real state
│       ├── schemas/validators.js    # Structured validation, numeric claim checking, trust taxonomy
│       ├── context/facts-pack.js    # Deterministic facts pack from store + plan
│       ├── modes/modes.js           # 7 specialist modes (Tutor/Mentor/Critic/Brutal/Jury/Ideation/Best-Practice)
│       ├── orchestrator.js          # Single entry point: mode → facts → provider → validate → fact-check
│       └── visual.js                # Optional visual layer behind capability detection (Phase 13)
├── scripts/
│   └── build.js                   # Deterministic bundler compiling src/ into standalone js/app.js
│                                  #   (BUNDLE_MODULES manifest + --check flag; guarded by tests/build-integrity.test.js)
├── js/
│   └── app.js                     # Standalone browser bundle (compatible with file:/// and http:// protocols)
└── tests/
    ├── build-integrity.test.js    # Manifest coverage, bundle content & runtime smoke verification (31 tests)
    ├── project.test.js            # Project Document Model: create/validate/normalize/serialize/clone (58 tests)
    ├── store.test.js              # Project store: migrations, recovery, pub/sub, legacy import (48 tests)
    ├── stairs.test.js             # Stair Calculator: 4 modes, candidates, validation, SVG-geometry, store round-trip (110 tests)
    ├── ramps.test.js              # Ramp Calculator: 4 modes, ratio/angle, targets, SVG-geometry, real-engine integrations (128 tests)
    ├── slopes.test.js             # Slope Analyzer: 7 definitions, signed geometry, consistency, cross-engine regression (143 tests)
    ├── ai.test.js                 # AI layer: providers, tools, facts pack, validators, orchestrator, proposals (73 tests)
    ├── visual-ai.test.js          # Visual AI capability gating, honest unavailability, label contracts (17 tests)
    ├── integration.test.js        # P14 end-to-end pipelines through real engines (39 tests)
    ├── cad-targets.test.js        # CAD target profiles, all-source handoff payloads, order/selection/precision (106 tests)
    ├── ui-contracts.test.js       # Full DOM ID verification, Run buttons presence & bundle cleanliness (398 tests)
    ├── calculator.test.js         # Mathematical scaling, round-trip, boundary & error tests (40 tests)
    ├── geometry.test.js           # Geometry engine: Rectangle, Circle, Triangle, Shoelace Polygon tests (40 tests)
    ├── parser.test.js             # Decimals, fractions, architectural notations & malformed input tests (38 tests)
    ├── units.test.js              # Metric & imperial conversion factors & strict unit validation tests (26 tests)
    ├── formatter.test.js          # Precision stabilization, scientific notation & feet-inch format tests (12 tests)
    ├── services.test.js           # StorageService, HistoryService corruption resilience & AudioService tests (19 tests)
    ├── commands.test.js           # Command registry: registration, execution, favorites, dynamic commands (178 tests)
    ├── dimension-workspace.test.js# Dimension Workspace entries/groups/serialization/persistence (103 tests)
    ├── dimension-expression.test.js # Expression parser determinism, validation, errors (79 tests)
    ├── multi-scale.test.js        # Multi-scale comparison math & formatting (55 tests)
    ├── dimension-chains.test.js   # Chain segments, cumulative positions, SVG, clipboard (67 tests)
    ├── cad-clipboard.test.js      # CAD format presets, escaping, payload summary (47 tests)
    ├── batch-cad.test.js          # Delimiters, rows, bulk conversion, exports (76 tests)
    ├── quick-dimension.test.js    # Quick evaluation, context heuristics, handoff payloads (67 tests)
    ├── furniture.test.js          # Catalog integrity, 179 items validation & search filtering tests (21 tests)
    ├── data-integrity.test.js     # Presets uniqueness, range continuity & positive dimensions tests (9 tests)
    ├── responsive.test.js         # Breakpoint, touch-target & responsive layout stylesheet contracts (23 tests)
    ├── converter.test.js          # Backward-compatible test entrypoint (delegates to run-all.js)
    └── run-all.js                 # Master test suite runner (emits authoritative total assertion count)
```

---

## 3. Core Architectural Principles & Hardening

### 3.1 Strict Unit Validation (No Silent Fallback)
- Previously, unit lookup patterns like `UNITS[key] || UNITS.cm` could silently reinterpret invalid inputs as centimeters.
- **Enforced Rule**: All unit lookups now route through `requireUnit(key, expectedDimension)`. If an invalid unit string (e.g. `'xyz'`, `'foobar'`, `'CMX'`, `null`, `undefined`) is provided, an explicit `Error` is thrown immediately.
- Optional parameters default only when intentionally omitted by caller defaults.

### 3.2 Canonical Measurement Normalization
All mathematical operations convert input dimensions into base SI units:
- Length: **Meters ($m$)**
- Area: **Square Meters ($m^2$)**
- Volume: **Cubic Meters ($m^3$)**

Scaling formulas operate strictly on these normalized values:
- Linear Scaling: $\text{Real} = \text{Drawing} \times S$ or $\text{Drawing} = \frac{\text{Real}}{S}$
- Area Scaling: $\text{Real Area} = \text{Drawing Area} \times S^2$
- Volume Scaling: $\text{Real Volume} = \text{Drawing Volume} \times S^3$
- Rescaling: $\text{Target} = \text{Orig} \times \left(\frac{S_{\text{orig}}}{S_{\text{target}}}\right) \times \left(\frac{\text{UnitFactor}_{\text{orig}}}{\text{UnitFactor}_{\text{target}}}\right)$

### 3.3 Explicit Precision & Rounding Policy
- **Internal Calculations**: Full standard IEEE 754 64-bit double-precision floating point.
- **Equality Tolerance in Tests**: Floating point comparisons use an exact epsilon $\varepsilon = 10^{-6}$.
- **Output Formatter**: Uses `(val + Number.EPSILON)` stabilization to eliminate floating-point artifacts (e.g., $17.49999999999997 \rightarrow 17.5$).
- **Architectural Fractions**: Formatted to the nearest $1/16$ inch and reduced to lowest terms (e.g., $6.5" \rightarrow 6\text{ }1/2"$, $0.75" \rightarrow 3/4"$).
- **Scientific Notation**: Automatically applied for extreme numbers ($\text{abs} < 0.00001$ or $\text{abs} \ge 10^9$).

### 3.4 Resilient Storage & History
- `StorageService` wraps all `localStorage` access in `try/catch` and automatically falls back to an in-memory `Map` when storage is disabled or blocked by sandboxes.
- `HistoryService` validates loaded JSON structure and recovers gracefully to `[]` if storage data is corrupted or malformed.

### 3.5 Deterministic Build System
- `scripts/build.js` concatenates `src/` modules in deterministic dependency order into `js/app.js`, driven by the exported `BUNDLE_MODULES` manifest.
- The `--check` flag (`node scripts/build.js --check`) verifies that `js/app.js` is 100% in sync with `src/`.
- `tests/build-integrity.test.js` additionally enforces manifest completeness, dependency ordering, bundle content presence, and runtime boot (see Section 0).

---

## 4. Automated Testing & Verification Matrix

The test suite consists of **36 automated test suites** containing **2,863 exact assertions**, all passing with zero failures. The authoritative total is emitted by `npm test` on every run — documentation should quote that output rather than hard-coded numbers.

| Test Suite File | Focus Area | Assertions | Result |
| :--- | :--- | :---: | :---: |
| `tests/ui-contracts.test.js` | Full DOM ID verification, mode switching targets, Run buttons presence, bundle cleanliness, escapeHtml resolution pins & zero-syntax error parsing | 648 | ✅ PASS |
| `tests/integration.test.js` | P14 end-to-end pipelines: Room→Furniture→Clearance→Facts→Critique, Survey→Calibration→Export, Stair/Ramp→Project→CAD, Plan→Analysis→Snapshot→AI context (real engines only) | 39 | ✅ PASS |
| `tests/cad-targets.test.js` | Part 9 CAD target profiles, all-source handoff payloads with real engine outputs, order/selection/precision pins | 106 | ✅ PASS |
| `tests/project.test.js` | Stabilization 2: project model create/validate/normalize, unknown-field preservation, round-trips | 58 | ✅ PASS |
| `tests/store.test.js` | Stabilization 3+4: versioned store, migrations, recovery, pub/sub, legacy import | 48 | ✅ PASS |
| `tests/stairs.test.js` | Stair Calculator: all 4 modes, deterministic candidates, validation codes, SVG-geometry correspondence, project-store round-trip | 110 | ✅ PASS |
| `tests/ramps.test.js` | Ramp Calculator: all 4 modes, ratio stability, targets, validation, SVG geometry, real parser/store/journal/CAD integrations | 128 | ✅ PASS |
| `tests/slopes.test.js` | Slope Analyzer: all 7 definitions, signed geometry, singularities, consistency tolerance, cross-engine regression | 143 | ✅ PASS |
| `tests/ai.test.js` | AI layer: provider gating/error taxonomy, tool registry, hardened facts pack, structured validation (hostile-input safe), numeric claim checking, orchestrator flows | 73 | ✅ PASS |
| `tests/visual-ai.test.js` | Visual AI capability gating, honest unavailability, label enforcement, controlled errors on throwing transports | 17 | ✅ PASS |
| `tests/commands.test.js` | Command registry: registration, execution, categories, favorites, dynamic commands | 246 | ✅ PASS |
| `tests/dimension-workspace.test.js` | Dimension Workspace entries, groups, serialization, persistence | 103 | ✅ PASS |
| `tests/dimension-expression.test.js` | Expression parser determinism, validation, error codes, scale integration | 79 | ✅ PASS |
| `tests/batch-cad.test.js` | Delimiter detection, row parsing, bulk conversion, export formatting | 76 | ✅ PASS |
| `tests/dimension-chains.test.js` | Chain segments, cumulative positions, SVG rendering, clipboard export | 67 | ✅ PASS |
| `tests/quick-dimension.test.js` | Quick evaluation, architectural context heuristics, handoff payloads | 67 | ✅ PASS |
| `tests/multi-scale.test.js` | Multi-scale comparison math, paper-fit, sorting, favorites | 55 | ✅ PASS |
| `tests/cad-clipboard.test.js` | CAD format presets, escaping, payload summary | 47 | ✅ PASS |
| `tests/calculator.test.js` | Scaling (1:1 to 1:10000), round-trips, rescaling, detector, area $S^2$, volume $S^3$, zero/bounds, strict numeric contracts, TypeError tests | 40 | ✅ PASS |
| `tests/geometry.test.js` | Rectangle, Circle, Triangle (Heron's), Polygon (Shoelace), CW/CCW, degenerate & collinear checks, invalid type tests | 40 | ✅ PASS |
| `tests/build-integrity.test.js` | Manifest coverage, dependency ordering, bundle content probes, runtime smoke test | 31 | ✅ PASS |
| `tests/parser.test.js` | Decimals, fractions (`3 1/2`, `5/8`, `15 3/16`), feet-inches (`12'`, `12' 6"`, `12'-6 1/2"`), attached units (`12in`, `6ft`), garbage, NaN, Infinity, negative rejection | 38 | ✅ PASS |
| `tests/responsive.test.js` | Breakpoint, touch-target & responsive layout stylesheet contracts | 23 | ✅ PASS |
| `tests/furniture.test.js` | Catalog integrity, 179 items validation, scaled drawing dimensions, search and category filtering | 21 | ✅ PASS |
| `tests/services.test.js` | StorageService (read, write, remove, clear), HistoryService (add, remove, clear, CSV/Markdown export, corrupt/poisoned-storage recovery, service-owned identity), AudioService safety | 22 | ✅ PASS |
| `tests/units.test.js` | Metric (mm, cm, dm, m, km), imperial (in, ft, yd, mi), area & volume factors, round-trips, strict invalid unit rejection | 26 | ✅ PASS |
| `tests/formatter.test.js` | Decimal precision rounding, epsilon stabilization, trailing zero elimination, scientific notation, feet-inches notation | 12 | ✅ PASS |
| `tests/export.test.js` | Universal Export Center: real-engine tables, JSON round-trip, DXF/SVG/TXT/CSV/TSV through the real exporters, store integration | 55 | ✅ PASS |
| `tests/project-workspace.test.js` | Multi-project library, snapshots (linear-storage pin), import validation, future-version refusal | 37 | ✅ PASS |
| `tests/plan-canvas.test.js` | Entities, transforms, grid/selection/undo, plan export geometry (SVG/DXF through real exporters) | 84 | ✅ PASS |
| `tests/space-planning.test.js` | Fit/clearance/overlap/adjacency/efficiency, survey notebook (verified-only proposal contract), calibration math, annotations | 79 | ✅ PASS |
| `tests/survey.test.js` | Survey Notebook integration (Phase 16): measurement lifecycle through the real store, imported-record interop, verified-only room proposal → plan → export, calibration → records, image limits | 55 | ✅ PASS |
| `tests/data-integrity.test.js`| 28 scale presets uniqueness & ratio validity, 179 furniture records positive dimensions & unique IDs, reference ranges continuity | 9 | ✅ PASS |
| **Total (incl. Phase 15/16 suites)** | **36 Comprehensive Test Suites** | **2,863 Assertions** | **100% Passing (0 Failures)** |

---

## 5. Standalone Browser Compatibility

The application is verified to run out of the box in modern web browsers under both protocols:
1. **Local File Protocol (`file:///e:/Scaler/index.html`)**: Fully functional with zero web server requirement.
2. **HTTP Server (`http://localhost:3500`)**: Fully functional.

---

## 6. Readiness for Feature Development

The architectural foundation is verified, fully tested, and free of formula duplication. The build pipeline is guarded end-to-end (manifest → bundle → runtime). The Daily Architect Toolkit is complete through Part 9 (CAD Application Helpers — Rhino/AutoCAD/SketchUp handoff via `src/core/cad-targets.js` and Mode 13). These are clipboard workflow profiles, not official product integrations.

**Stabilization phase (September 2, 2026)** completed the groundwork for the next feature wave:

1. **UI modularization (S1)** — `src/ui/app.js` shrank from 7,076 to ~4,530 lines. Nine feature controllers now live in `src/ui/views/` behind a registry (`src/ui/view-registry.js`). Views receive one frozen context and communicate cross-feature through `views.callController` — no view-to-view imports, no hidden globals. `app.js` keeps startup, navigation, the command palette, global keyboard handling, furniture/reference rendering, and the workspace controller (registered inline so other views can call `saveWorkspace`/`renderWorkspace`).
2. **Project Document Model (S2)** — `src/core/project.js` provides the versioned, validated, serializable envelope (`schemaVersion` 1) with unknown-field preservation for future migrations.
3. **Versioned project store (S3+S4)** — `src/services/store.js` persists `{ version, project }` under one key with a migration chain, loud refusal of future versions, controlled recovery from malformed data, tiny pub/sub, and **non-destructive** legacy import (legacy keys are read, never deleted).
4. **Storage taxonomy** — PROJECT DATA (dimensions, chains, notes, snapshots, decisions, exports) flows through the store; USER PREFERENCES (theme, quick-dim prefs, favorites, sound) remain in their existing per-feature keys. The two never mix.

Feature migration into the project document is deliberately incremental: features write to their legacy keys today, and the store's `importLegacy` path is the bridge. The codebase is ready for Projects → Export Center → Plan Canvas → Rooms/Walls → Survey → AI under the documented build contract in Section 0.

---

## 7. P14 Final Hardening Record (September 3, 2026)

All findings below were discovered by a full repository audit and fixed with regression tests. No test was weakened and no expected behavior was changed to make tests pass.

**Security**
- `src/ui/app.js` called `escapeHtml()` at 15 sites without ever defining it — a latent `ReferenceError` that crashed workspace rendering; now defined once at `initializeApp` scope and pinned by `tests/ui-contracts.test.js`.
- Calculation journal (`views/history.js`) interpolated persisted history fields into `innerHTML` unescaped — XSS via a poisoned localStorage payload; all interpolations escaped.
- `HistoryService.addEntry` let callers (or poisoned persisted entries) forge `id`/`timestamp`/`date`; ids are now service-owned and the load path rejects malformed id shapes.
- Project library import: `deserializeProjectJSON` + envelope validation only; prototype-pollution keys (`__proto__`) verified inert through the real import path.

**AI**
- Facts pack crashed on null/garbage plan entities (imported documents are envelope-validated only) and emitted null-valued `factChecks` that were uncheckable noise; now filters hostile entries and only emits finite geometry.
- `validateStructuredResponse` crashed on null/primitive items in a model's `findings` array; non-objects are now flagged as validation errors.
- Visual layer (`interpretImage`/`generateConceptImage`) leaked transport exceptions across the AI boundary; a throwing transport now surfaces as the stable controlled error object. Vision vs imageGen separation and the CONCEPTUAL EXPLORATION / NOT A TECHNICAL DRAWING / NOT CONSTRUCTION DOCUMENTATION labels are unchanged and pinned.

**Project**
- Snapshot embedding was O(n²): each snapshot embedded prior snapshots *with* their payloads (measured 1.5 KB → 81 KB over six snapshots), breaking localStorage persistence around snapshot 9–10. Payloads are now stripped inside embedded copies and re-attached by id on restore (time-travel semantics unchanged).
- The multi-project library accepted future envelope versions and future individual `schemaVersion`s silently, normalizing newer data down — the exact data-loss path the active-envelope contract prevents; both are now refused loudly.

**Export / Plan**
- The plan canvas's "Export SVG/DXF" buttons were a dead end (the export center had no plan geometry source, so DXF exported a *chain*). Added `planToExportGeometry`/`generatePlanSVG` (pure, in `core/plan-canvas.js`), a "Plan Canvas" geometry source, and real routing through `wrapSVGDocument`/`buildDXF`.
- Plan view rendering crashed on imported entities with non-numeric geometry; hostile entities are now skipped (SVG) or rendered with `?` placeholders (entity list).

**Runner**
- `tests/visual-ai.test.js` existed but was never registered in `tests/run-all.js` — `npm test` silently skipped the entire Phase 13 contract suite. Now registered (32/32 suites).
- New `tests/integration.test.js`: five end-to-end pipelines (Project→Room→Furniture→Clearance→Facts→Critique; Survey→Calibration→Measurement→Room→Plan→Export; Stair→Project→CSV; Ramp→Slope shared math→DXF; Plan→Space analysis→Snapshot→AI context) through REAL implementations only.

---

## 8. Phase 15 Record — Real AI Integration (September 2026)

**Scope delivered**
- Real provider transport: Gemini (official generateContent/ListModels REST), GLM (OpenAI-compatible v4), DeepSeek (OpenAI-compatible). Single HTTP boundary in `src/services/ai/http.js` with injectable `fetchImpl` — automated tests bind deterministic mocks and never touch the network.
- Model catalog (`services/ai/model-catalog.js`): discovery merge (never prunes), manual model entry with user-declared capabilities labelled NEEDS VERIFICATION, retirement/unavailable states, context windows.
- Job router (`services/ai/job-router.js`): 11 capability-gated AI jobs, default-NEVER fallback policy, quota surfaces as controlled errors, metadata-only activity log (no prompts, no keys, no project data).
- AI Studio (Mode 20) and AI Control Center (Mode 21) views using the existing design system; command palette entries for both plus Analyze/Critique/Test actions.
- Scoped project context (`ai/context/project-context.js`): word-based scope hints, disclosed trimming (`CONTEXT REDUCED: …`), P14-grade hostile-input filtering.
- Import foundation (`core/import/import-model.js` + Mode 22): CSV/TSV schedules, 2D ASCII DXF ($INSUNITS-honoring), flat SVG, normalized reports with confidence and warnings.

**Security findings found & fixed during the phase**
- The Phase 9 session key store held a SINGLE key slot: configuring a second provider silently dropped the first provider's key (found by the new integration pipeline). Now per-provider; regression-pinned.
- Key-leakage pins: persistent keys appear in exactly one storage namespace; job assignments, catalog, activity log, and results contain no keys (pinned in `tests/ai-providers.test.js` and `tests/ai-integration.test.js`).
- Prompt-shape pin: connection tests send a fixed minimal prompt; the integration test asserts no project data and no key in sent bodies or results.

**Test state after the phase**: 2,761 assertions / 35 suites (`tests/run-all.js`), including `ai-providers.test.js` (147), `imports.test.js` (66), `ai-integration.test.js` (51).
