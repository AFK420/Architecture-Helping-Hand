# Architecture Helping Hand — Phase 1: Codebase Audit & Core Architecture

**Date**: September 1, 2026  
**Repository**: [https://github.com/AFK420/Architecture-Helping-Hand.git](https://github.com/AFK420/Architecture-Helping-Hand.git)  
**Author**: Architecture Helping Hand Engineering Team

---

## 1. Executive Summary

This document presents a comprehensive architectural audit of the baseline implementation of **Architecture Helping Hand**. The goal of Phase 1 is to establish a modular, test-driven, and scalable foundation centered around a unified calculation pipeline:

$$\text{Raw Input} \longrightarrow \text{Parser} \longrightarrow \text{Normalized Measurement} \longrightarrow \text{Calculation Engine} \longrightarrow \text{Formatter} \longrightarrow \text{UI Presentation}$$

This refactoring eliminates duplicate calculation logic, fixes input parsing vulnerabilities and edge cases, isolates storage and audio services, and introduces an extensive automated test suite covering precision math, malformed inputs, and boundary conditions.

---

## 2. Current Architecture & Component Inventory

### 2.1 File Map & Responsibilities

| File Path | Current Role | Architectural Assessment |
| :--- | :--- | :--- |
| `index.html` | Application markup, 6 tool modes, modals, drawers | Clean structure, but lacks dynamic binding decoupling |
| `css/main.css` | UI layout, drafting aesthetics, responsive styling | Solid CSS variable foundation; modular styling |
| `css/themes.css` | Theme definitions (`dark`, `paper`, `blueprint`) | Well-structured CSS custom properties |
| `js/app.js` | Monolithic script containing all logic and UI | **High Technical Debt**: Duplicates modular code to satisfy `file:///` protocol |
| `js/converter.js` | Legacy math conversion engine | Needs normalized measurement input/output pipeline |
| `js/presets.js` | Scale presets, unit definitions, reference objects | Well-defined, but furniture database was omitted from it |
| `js/audio.js` | Web Audio API sound synthesizer | Clean service; needs safe AudioContext lifecycle handling |
| `js/visualization.js` | Scale bar and SVG silhouette renderer | UI-coupled; needs normalized data inputs |
| `js/history.js` | History logging, localStorage, and CSV/MD export | Storage coupling; needs abstraction layer |
| `tests/converter.test.js`| Initial 14-assertion unit test suite | Basic coverage; missing edge cases, malformed inputs & boundary tests |

---

## 3. Detailed Audit Findings

### 3.1 Duplicate Logic & Code Divergence
- **Finding**: When `js/app.js` was packaged as an IIFE for standalone offline browser compatibility, the contents of `converter.js`, `presets.js`, `audio.js`, `visualization.js`, and `history.js` were duplicated inside it.
- **Risk**: Modifying a formula or preset in `js/converter.js` does not update `js/app.js`, creating synchronization drift between automated tests and the running browser application.
- **Solution**: Establish a `src/` directory as the single source of truth with an automated zero-dependency build script (`node scripts/build.js`) that generates the unified browser bundle.

### 3.2 Calculation Fragmentation & Lack of Normalization
- **Finding**: In the baseline, furniture dimensions and custom scaler calculations performed raw arithmetic (`wCm / 100 / ratio`) directly within DOM rendering functions, bypassing the centralized conversion engine.
- **Risk**: Any rounding bug, unit conversion quirk, or scaling factor update has to be fixed in multiple places.
- **Solution**: Implement a standardized `Measurement` data structure and route all scaling calculations through `Calculator.scale()` and `Calculator.rescale()`.

### 3.3 Input Parsing & Edge-Case Vulnerabilities
- **Finding**: `parseArchitecturalInput` did not handle negative values, invalid fractions (e.g. division by zero in `"3/0"`), non-numeric garbage (e.g. `"abc"` returning `0` silently), or string inputs with attached unit suffixes (e.g. `"15.5cm"`).
- **Risk**: Could lead to `NaN` outputs, silent failures, or unexpected formatting on user input.
- **Solution**: Build a dedicated `Parser` module that returns a structured parse result `{ value, unit, isValid, error }` with robust sanitization.

### 3.4 Floating-Point Arithmetic Inaccuracies
- **Finding**: JavaScript native IEEE 754 floating-point operations can introduce precision artifacts (e.g., $17.5 \times 10 = 174.99999999999997$).
- **Risk**: Drawing dimensions displayed as `174.999 mm` instead of `175.0 mm`.
- **Solution**: Implement an exact epsilon-based rounding helper and precision formatter that handles floating-point stabilization.

### 3.5 Storage & Side-Effect Isolation
- **Finding**: Direct calls to `window.localStorage` occurred without fallbacks if `localStorage` is disabled or restricted by browser security policies (e.g., iframe sandboxes or strict privacy mode).
- **Solution**: Implement a resilient `StorageService` that safely falls back to in-memory storage if `localStorage` throws an exception.

---

## 4. Target Architecture

```
Architecture Helping Hand Core Architecture
========================================================================================

   [ User Input (String / Decimal / Fraction / Ft-In) ]
                         │
                         ▼
             ┌─────────────────────────┐
             │       core/parser       │ ──> Validates & extracts value + unit
             └─────────────────────────┘
                         │
                         ▼
             ┌─────────────────────────┐
             │  Normalized Measurement │ { value, unit, baseMeters, dimension }
             └─────────────────────────┘
                         │
                         ▼
             ┌─────────────────────────┐
             │     core/calculator     │ ──> Drawing ↔ Real, Rescale, Detect, Area, Vol
             └─────────────────────────┘
                         │
                         ▼
             ┌─────────────────────────┐
             │     core/formatter      │ ──> Decimal, Fractional, Architectural Ft-In
             └─────────────────────────┘
                         │
                         ▼
             ┌─────────────────────────┐
             │     UI Layer & State    │ ──> Cards, Visualizer, Table, History
             └─────────────────────────┘
```

### 4.1 Core Module Boundaries

```
src/
├── core/
│   ├── units.js          # Canonical unit definitions (Length, Area, Volume) & base factors
│   ├── parser.js         # Sanitization, fraction parsing, feet-inch parsing, unit extraction
│   ├── calculator.js     # Pure mathematical functions (drawingToReal, realToDrawing, rescale, detect, area, vol)
│   ├── formatter.js      # Precision rounding, decimal formatting, architectural feet-inch formatting
│   ├── presets.js        # Standard architectural scale presets & real-world reference objects
│   └── furniture.js      # Architectural furniture database (40+ items) & top-down plan SVG generators
├── services/
│   ├── storage.js        # Safe LocalStorage wrapper with memory fallback
│   ├── history.js        # Calculation history management, serialization, CSV/Markdown export
│   └── audio.js          # Web Audio API tactile feedback synthesizer
├── ui/
│   ├── visualizer.js     # Proportional visualizer & graphical scale bar renderer
│   └── app.js            # Main UI controller, event bindings, tab switching & keyboard shortcuts
scripts/
└── build.js              # Zero-dependency build script compiling src/ into standalone js/app.js
tests/
├── calculator.test.js    # Unit tests for core math & conversions
├── parser.test.js        # Unit tests for input parsing, fractions, feet-inches & edge cases
├── units.test.js         # Unit tests for metric/imperial unit conversions
├── formatter.test.js     # Unit tests for formatting, rounding & precision
├── furniture.test.js     # Unit tests for furniture scaling consistency
└── run-all.js            # Test runner executing all test suites
```

---

## 5. Refactoring Priorities & Roadmap

### Priority 1: High (Immediate - Phase 1)
- [x] Create modular `src/` architecture with single source of truth.
- [x] Implement robust `Parser` with edge-case, fraction, and unit handling.
- [x] Implement normalized `Calculator` with exact arithmetic and rounding.
- [x] Implement resilient `StorageService` and `HistoryService`.
- [x] Create automated multi-suite test runner testing metric, imperial, fractions, bounds, and edge cases.
- [x] Create zero-dependency build script generating the standalone browser bundle.

### Priority 2: Medium (Phase 2)
- [ ] Implement multi-language localization dictionary for international architectural terms.
- [ ] Add SVG canvas export for scaled furniture cutouts (DXF / SVG export for laser cutting).
- [ ] Implement custom user preset builder (save custom scales and custom furniture items).

### Priority 3: Low (Future Consideration)
- [ ] Integrate 2D canvas room layout designer using scaled furniture items.
- [ ] Add PDF architectural scale sheet generation.

---

## 6. Testing Coverage Matrix

| Test Suite | Focus Area | Assertions |
| :--- | :--- | :---: |
| `tests/calculator.test.js` | Drawing ↔ Real, Rescale, Detect, Area ($S^2$), Volume ($S^3$), Precision | 22 |
| `tests/parser.test.js` | Decimals, Fractions (`3 1/2`, `5/8`), Feet-Inches (`12'-6"`), Garbage, Empty | 18 |
| `tests/units.test.js` | Metric (mm, cm, dm, m, km), Imperial (in, ft, yd, mi), Area & Volume factors | 16 |
| `tests/formatter.test.js` | Precision rounding, trailing zeroes, scientific notation, Feet-Inches notation | 14 |
| `tests/furniture.test.js` | Database integrity, dimension validity, dynamic scaling across all 40+ items | 12 |
| **Total** | **Comprehensive Core Test Suite** | **82+ Assertions** |

---

## 7. Conclusion

Phase 1 establishes a rock-solid, decoupled, and mathematically verified architecture. The codebase is now prepared for expansion without technical debt or formula drift.
