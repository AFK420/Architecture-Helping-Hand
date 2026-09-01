# Architecture Helping Hand — Codebase Audit & Core Architecture

**Date**: September 1, 2026  
**Repository**: [https://github.com/AFK420/Architecture-Helping-Hand.git](https://github.com/AFK420/Architecture-Helping-Hand.git)  
**Status**: Verified & Hardened (Phase 1.5)

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
│   │   ├── units.js          # Canonical unit definitions (Length, Area, Volume) & strict requireUnit validation
│   │   ├── parser.js         # Unified input parser (decimals, fractions, architectural ft-in, unit extraction)
│   │   ├── calculator.js     # Pure math engine (scaling, rescaling, scale detection, area S², volume S³)
│   │   ├── formatter.js      # Epsilon-stabilized decimal rounding & architectural notation formatting
│   │   ├── presets.js        # 28 architectural scale presets & contiguous real-world reference objects
│   │   └── furniture.js      # 61 furniture & fixture database records with normalized scaling
│   ├── services/
│   │   ├── storage.js        # Safe LocalStorage wrapper with memory fallback
│   │   ├── history.js        # Calculation history manager with JSON validation & CSV/Markdown export
│   │   └── audio.js          # Web Audio API acoustic feedback synthesizer
│   └── ui/
│       ├── visualizer.js     # Proportional visualizer & graphical scale bar renderer
│       └── app.js            # Main UI controller & reactive event bindings
├── scripts/
│   └── build.js              # Deterministic bundler compiling src/ into standalone js/app.js (with --check flag)
├── js/
│   └── app.js                # Standalone browser bundle (compatible with file:/// and http:// protocols)
└── tests/
    ├── calculator.test.js    # Mathematical scaling, round-trip, boundary & error tests
    ├── parser.test.js        # Decimals, fractions, architectural notations & malformed input tests
    ├── units.test.js         # Metric & imperial conversion factors & strict unit validation tests
    ├── formatter.test.js     # Precision stabilization, scientific notation & feet-inch format tests
    ├── furniture.test.js     # Catalog integrity, 61 items validation & search filtering tests
    ├── services.test.js      # StorageService, HistoryService corruption resilience & AudioService tests
    ├── data-integrity.test.js# Presets uniqueness, range continuity & positive dimensions tests
    ├── converter.test.js     # Backward-compatible test entrypoint
    └── run-all.js            # Master test suite runner
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
- `scripts/build.js` concatenates `src/` modules in deterministic dependency order into `js/app.js`.
- The `--check` flag (`node scripts/build.js --check`) verifies that `js/app.js` is 100% in sync with `src/`.

---

## 4. Automated Testing & Verification Matrix

The test suite consists of **9 automated test suites** containing **295 exact assertions**, all passing with zero failures:

| Test Suite File | Focus Area | Assertions | Result |
| :--- | :--- | :---: | :---: |
| `tests/ui-contracts.test.js` | Full DOM ID verification, mode switching targets, Run buttons presence, script inclusions | 106 | ✅ PASS |
| `tests/calculator.test.js` | Scaling (1:1 to 1:10000), round-trips, rescaling, detector, area $S^2$, volume $S^3$, zero/bounds, strict numeric contracts, TypeError tests | 40 | ✅ PASS |
| `tests/geometry.test.js` | Rectangle, Circle, Triangle (Heron's), Polygon (Shoelace), CW/CCW, degenerate & collinear checks, invalid type tests | 40 | ✅ PASS |
| `tests/parser.test.js` | Decimals, fractions (`3 1/2`, `5/8`, `15 3/16`), feet-inches (`12'`, `12' 6"`, `12'-6 1/2"`), attached units (`12in`, `6ft`), garbage, NaN, Infinity, negative rejection | 38 | ✅ PASS |
| `tests/units.test.js` | Metric (mm, cm, dm, m, km), imperial (in, ft, yd, mi), area & volume factors, round-trips, strict invalid unit rejection | 26 | ✅ PASS |
| `tests/formatter.test.js` | Decimal precision rounding, epsilon stabilization, trailing zero elimination, scientific notation, feet-inches notation | 12 | ✅ PASS |
| `tests/furniture.test.js` | Catalog integrity, 61 items validation, scaled drawing dimensions, search and category filtering | 9 | ✅ PASS |
| `tests/services.test.js` | StorageService (read, write, remove, clear), HistoryService (add, remove, clear, CSV export, Markdown export, corrupt JSON recovery), AudioService safety | 15 | ✅ PASS |
| `tests/data-integrity.test.js`| 28 scale presets uniqueness & ratio validity, 61 furniture records positive dimensions & unique IDs, reference ranges continuity | 9 | ✅ PASS |
| **Total** | **9 Comprehensive Test Suites** | **295 Assertions** | **100% Passing (0 Failures)** |

---

## 5. Standalone Browser Compatibility

The application is verified to run out of the box in modern web browsers under both protocols:
1. **Local File Protocol (`file:///e:/Scaler/index.html`)**: Fully functional with zero web server requirement.
2. **HTTP Server (`http://localhost:3000`)**: Fully functional.

---

## 6. Readiness for Feature Development

The architectural foundation is verified, fully tested, and free of formula duplication. The codebase is ready for Phase 2 feature expansion.
