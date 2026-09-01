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

When feature development begins in subsequent phases, new calculations will be added as dedicated pure mathematical modules under `src/core/`. *(Update, September 2, 2026: `src/core/geometry.js` already exists and is verified by `tests/geometry.test.js` — it is no longer future work. `stairs.js` and `slope.js` remain planned. Any new module must be registered in `BUNDLE_MODULES` in `scripts/build.js` per the build contract in ENGINEERING_RULES.md §6.1.)*

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

### 2.2 `src/core/stairs.js` (Future)
* **Pure Functions**:
  - `calcStairRisers({ totalHeight, targetRiserHeight, maxRiser, minTread })`
  - Validates Blondel's architectural rule ($2R + T \approx 60\text{--}64\text{ cm}$).
  - Computes exact headcount, riser count, tread depth, stair run, stringer length, and incline angle.

### 2.3 `src/core/slope.js` (Future)
* **Pure Functions**:
  - `calcSlope({ rise, run, angleDeg, gradePercent, ratio1InX })`
  - Converts between ADA ramp ratios (`1:12`), percentage grades (`8.33%`), and angular degrees ($4.76^\circ$).

---

## 3. Data Flow & Integration Pattern

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
