# Architecture Helping Hand — Future Architecture & Geometry Readiness

**Date**: September 1, 2026  
**Status**: DESIGN & READINESS VERIFIED  
**Scope**: Readiness assessment for future mathematical modules (Geometry, Stairs, Slope, Rooms, CAD Vector Exports)

---

## 1. Architectural Compatibility Assessment

The frozen 3-tier architecture (`src/core/` $\rightarrow$ `src/services/` $\rightarrow$ `src/ui/`) was evaluated to ensure it can seamlessly accommodate future architectural geometry features without requiring architectural refactoring.

### Conclusion: **100% Compatible**
The current design—where `src/core/` houses pure calculation engines, `src/core/units.js` provides strict unit conversions, and `src/core/parser.js` handles user inputs—is directly extensible to future 2D/3D geometry calculations.

---

## 2. Planned Core Module Extensions (Future Phases)

When feature development begins in subsequent phases, new calculations will be added as dedicated pure mathematical modules under `src/core/`. *(Update, September 2, 2026: `src/core/geometry.js`, `src/core/stairs.js`, `src/core/ramps.js`, and `src/core/slopes.js` (Slope Analyzer) already exist and are verified by their test suites. The shared canonical rise/run conversion lives in `src/core/slope-math.js` — consumed by Ramps and Slopes. Contracts: STAIRS.md, RAMPS.md, SLOPES.md. Any new module must be registered in `BUNDLE_MODULES` in `scripts/build.js` per the build contract in ENGINEERING_RULES.md §6.1.)*

### 2.1 `src/core/geometry.js` (✅ IMPLEMENTED — verified by tests/geometry.test.js)
* **Pure Functions**:
  - `calcRectangle({ width, length, unitKey })` $\rightarrow$ `{ perimeter, area, diagonal }`
  - `calcCircle({ radius, diameter, unitKey })` $\rightarrow$ `{ circumference, area }`
  - `calcTriangle({ a, b, c, base, height, unitKey })` $\rightarrow$ `{ perimeter, area }`
  - `calcPolygon({ vertices })` $\rightarrow$ `{ perimeter, area }` (Shoelace formula)
* **Contract**:
  - Inputs: Validated finite numbers via `requireFiniteNumber`.
  - Units: Dimension-checked via `requireUnit`.
  - Outputs: Pure numeric results normalized in SI units and converted to target units.

### 2.2 `src/core/stairs.js` (✅ IMPLEMENTED — verified by tests/stairs.test.js; contract in STAIRS.md)
* **Implemented API** (straight flight; the planned riser/ramp work extends this):
  - `calculateStair({ mode, totalRise, ... })` — four input modes, deterministic candidates
  - `generateStairSVG(result)` — proportional side elevation from actual geometry
  - `resolveStairReferences(overrides)` — configurable, labelled reference ranges
* **Original plan (superseded naming)**: `calcStairRisers`, Blondel 2R+T, incline angle.

### 2.3 `src/core/slopes.js` (✅ IMPLEMENTED — Slope Analyzer, verified by tests/slopes.test.js; contract in SLOPES.md)
* **Implemented API** (general signed rise/run analysis):
  - `analyzeSlope({ mode, ... })` — seven input definitions incl. angle/ratio, signed geometry
  - `checkConsistency()` — documented-tolerance redundant-value verification
  - `generateSlopeSVG(result)` — directional diagram with visual-normalization disclosure
* **Shared math**: `src/core/slope-math.js` (also consumed by the Ramp Calculator).

---

## 3. Data Flow & Integration Pattern

*(Update, September 2, 2026 — Stabilization phase landed two foundations this document planned for:*
1. *`src/core/project.js` — the Project Document Model (versioned, validated, serializable envelope with unknown-field preservation).*
2. *`src/services/store.js` — the versioned project store (migration chain, non-destructive legacy import, pub/sub). New features holding PROJECT data must persist through it; user preferences stay in their own keys. UI controllers now live per-feature in `src/ui/views/` behind `src/ui/view-registry.js`.)*

Future UI modes (e.g. a Stair Calculator tab or Geometry Explorer) will strictly follow the established data flow:

```text
[ User Input (e.g. "Total Height: 2.8m", "Tread: 28cm") ]
                       │
                       ▼
             [ src/core/parser.js ] (parseInput -> values: 2.8, 28)
                       │
                       ▼
             [ src/core/stairs.js ] (calcStairRisers -> 16 risers @ 17.5cm)
                       │
                       ▼
             [ src/core/formatter.js ] (formatNumber / formatFeetInches)
                       │
                       ▼
             [ src/ui/stairsView.js ] (Render technical step diagram & SVG)
```

---

## 4. Architectural Boundaries Checklist for Future PRs

1. **No Math in UI**: All geometric equations ($A = \pi r^2$, $a^2 + b^2 = c^2$, Blondel's rule) must reside in `src/core/`.
2. **Deterministic Build**: Any new file added to `src/core/`, `src/services/`, or `src/ui/` must be registered in `BUNDLE_MODULES` in `scripts/build.js` (dependency-first order) — `tests/build-integrity.test.js` fails otherwise. See ENGINEERING_RULES.md §6.1.
3. **Strict Validation**: All geometric parameters must use `requireFiniteNumber` and `requireUnit`.
4. **Automated Unit Tests**: Every geometric formula must have an accompanying test file in `tests/`.

---

## 5. AI Integration Status (updated September 2026 — Phase 15)

The AI integration planned in early revisions is now real:

* **Provider transport** (`src/services/ai/`): Gemini, GLM, DeepSeek with a
  single injectable HTTP boundary; details in AI_PROVIDERS.md.
* **Model catalog + job router**: dynamic model discovery/manual entry, 11
  capability-gated AI jobs, default-never fallback; details in AI_JOBS.md.
* **AI Studio (Mode 20) + AI Control Center (Mode 21)**: task-focused
  assistant and provider/key/model management UI; details in
  AI_CONTROL_CENTER.md.
* **Import foundation** (`src/core/import/`): CSV/TSV, 2D ASCII DXF, flat
  SVG with normalized reports; details in IMPORTS.md.

Remaining AI-adjacent future work: visual apply-UI for PROPOSE_CHANGE
layout proposals, design-board reference collection, DXF blocks/INSERT
support, PDF page extraction, OBJ massing import.

All future AI work must respect ENGINEERING_RULES.md §10 (AI network
boundary, key privacy, free-cost safety, untrusted-output validation).
