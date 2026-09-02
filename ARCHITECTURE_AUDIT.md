# Architecture Helping Hand — Codebase Audit & Core Architecture

**Date**: September 2, 2026  
**Repository**: [https://github.com/AFK420/Architecture-Helping-Hand.git](https://github.com/AFK420/Architecture-Helping-Hand.git)  
**Status**: Verified & Hardened (Post Build-Pipeline Repair — 1,582 Assertions, 22 Suites)  

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
│           └── history.js         # Calculation Journal drawer
├── scripts/
│   └── build.js                   # Deterministic bundler compiling src/ into standalone js/app.js
│                                  #   (BUNDLE_MODULES manifest + --check flag; guarded by tests/build-integrity.test.js)
├── js/
│   └── app.js                     # Standalone browser bundle (compatible with file:/// and http:// protocols)
└── tests/
    ├── build-integrity.test.js    # Manifest coverage, bundle content & runtime smoke verification (31 tests)
    ├── project.test.js            # Project Document Model: create/validate/normalize/serialize/clone (58 tests)
    ├── store.test.js              # Project store: migrations, recovery, pub/sub, legacy import (48 tests)
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

The test suite consists of **22 automated test suites** containing **1,582 exact assertions**, all passing with zero failures. The authoritative total is emitted by `npm test` on every run — documentation should quote that output rather than hard-coded numbers.

| Test Suite File | Focus Area | Assertions | Result |
| :--- | :--- | :---: | :---: |
| `tests/ui-contracts.test.js` | Full DOM ID verification, mode switching targets, Run buttons presence, bundle cleanliness & zero-syntax error parsing | 398 | ✅ PASS |
| `tests/cad-targets.test.js` | Part 9 CAD target profiles, all-source handoff payloads with real engine outputs, order/selection/precision pins | 106 | ✅ PASS |
| `tests/project.test.js` | Stabilization 2: project model create/validate/normalize, unknown-field preservation, round-trips | 58 | ✅ PASS |
| `tests/store.test.js` | Stabilization 3+4: versioned store, migrations, recovery, pub/sub, legacy import | 48 | ✅ PASS |
| `tests/commands.test.js` | Command registry: registration, execution, categories, favorites, dynamic commands | 178 | ✅ PASS |
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
| `tests/services.test.js` | StorageService (read, write, remove, clear), HistoryService (add, remove, clear, CSV export, Markdown export, corrupt JSON recovery), AudioService safety | 19 | ✅ PASS |
| `tests/units.test.js` | Metric (mm, cm, dm, m, km), imperial (in, ft, yd, mi), area & volume factors, round-trips, strict invalid unit rejection | 26 | ✅ PASS |
| `tests/formatter.test.js` | Decimal precision rounding, epsilon stabilization, trailing zero elimination, scientific notation, feet-inches notation | 12 | ✅ PASS |
| `tests/data-integrity.test.js`| 28 scale presets uniqueness & ratio validity, 179 furniture records positive dimensions & unique IDs, reference ranges continuity | 9 | ✅ PASS |
| **Total** | **22 Comprehensive Test Suites** | **1,582 Assertions** | **100% Passing (0 Failures)** |

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
