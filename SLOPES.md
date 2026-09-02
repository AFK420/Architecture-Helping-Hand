# SLOPES — Slope Analyzer (Mode 16)

**Status**: Implemented (Architectural Tools Phase)  
**Module**: `src/core/slope-math.js` (shared canonical math) · `src/core/slopes.js` (pure engine) · `src/ui/views/slopes.js` (view)  
**Date**: September 2, 2026

---

## 1. Purpose & Positioning

The Ramp Calculator answers *"I am designing a ramp."* The **Slope Analyzer** answers *"I have a rise/run relationship and I want to understand it."*

It is a universal rise/run analysis tool for site studies, terrain studies, roof slopes, drainage direction, path gradients, ramp/stair analysis, and model making. It is **NOT** a civil engineering, grading, terrain, road design, drainage engineering, or compliance application.

**Key distinction from the Ramp Calculator:** the ramp engine models *ascent ramps* and rejects negative slope. The Slope Analyzer supports **signed geometry** because drainage/terrain direction is architecturally meaningful.

---

## 2. One Canonical Math Source

`src/core/slope-math.js` is the application's single definition of slope. The Ramp Calculator's internal `slopeConversions()` now delegates to it, and the Slope Analyzer is built on it — so the two tools **cannot** produce divergent numbers for identical geometry (pinned by cross-engine regression tests).

```
slopePercent = rise / run × 100
ratioValue   = |run / rise|          (displayed "1 : X"; magnitude positive —
                                      the direction WORD carries the sign)
angleDegrees = atan2(rise, run) × 180/π
```

Angle is always computed from full-precision geometry, then formatted.

---

## 3. Signed Slope Semantics (documented sign convention)

| Value | Meaning |
|---|---|
| positive rise | **ASCENDING** (↑) |
| negative rise | **DESCENDING** (↓) — terrain fall, drainage direction |
| positive run | forward direction |
| negative run | traversing the same slope in reverse; direction classification follows the **rise** sign |
| ratio display | `1 : 12 ascending` / `1 : 12 descending` — never a confusing `-1 : 10`; the numeric slope percent keeps its sign internally |

---

## 4. Input Definitions

| Definition | Solves |
|---|---|
| **Rise + Run** (primary) | percent, ratio, angle |
| Rise + Slope % | run = rise / (pct/100) |
| Rise + Ratio (1 : X) | run = rise × X |
| Rise + Angle | run = rise / tan(angle) |
| Run + Slope % | rise = run × pct/100 |
| Run + Ratio | rise = run / X |
| Run + Angle | rise = run × tan(angle) |

Redundant pairs (percent+ratio, percent+angle, ratio+angle) are intentionally **not** separate modes: without an absolute rise or run they have no geometry. Instead, any of them can be attached to a rise/run definition as a **consistency check** (see §6).

Units: the standard application parser (`1.2m`, `1200mm`, `4'6"`, signed values like `-0.5m`). Internally canonical meters — no slope-specific unit code.

---

## 5. Zero / Vertical Behavior (structured, never fabricated)

| Geometry | Classification | Percent | Ratio | Angle |
|---|---|---|---|---|
| rise > 0, run = 0 | `vertical` | `Undefined / Infinite (vertical)` | `1 : 0` | 90° |
| rise = 0, run ≠ 0 | `flat` | `0%` | `—` (honestly undefined) | 0° |
| rise = 0, run = 0 | `invalid` | — | — | — |

The UI displays the structured wording above; it never prints a bare `Infinity%` as if it were a normal slope.

---

## 6. Consistency Check (deterministic tolerance)

When a redundant value is supplied (`checkSlopePercent`, `checkRatioValue`, `checkAngleDegrees`), it is compared with the value calculated from the geometry using a **relative tolerance of 0.05%** (`CONSISTENCY_TOLERANCE = 0.0005`), not raw `===`.

- Match → `CONSISTENT`
- Mismatch → `CONFLICT — calculated slopePercent = 10, provided = 8.33 (difference 1.67)` with full numeric detail

Example: Rise 1.20 m, Run 12 m, provided slope 8.33% → actual is 10% → CONFLICT. The tool never silently picks one value.

---

## 7. Target Comparison

`buildSlopeTargetComparison(riseMagnitude)` maps fixed study targets — 1%, 2%, 5%, 8.33%, 12.5%, 45%, 100% — to the run each demands. Deterministic order, monotonic; labelled *Study Targets (design values, not laws)*. Notes give architectural context (e.g. 2% = typical minimum drainage). The 1:12 row is the widely taught accessibility **reference** — verify applicable local requirements for real projects.

---

## 8. Educational Explanation

Every result includes a plain-language sentence built from the actual geometry: *"For every 12 units horizontally, the surface rises 1 unit."* (or *falls* for descending slopes). This explanation is the core reason a general tool exists alongside the Ramp Calculator.

---

## 9. SVG Diagram

`generateSlopeSVG(result)` draws a proportional side elevation from the actual geometry: baseline, slope line, rise/run labels, angle, and direction. **Ascending lines render upward; descending lines render downward** (pinned by tests). For extreme ratios (beyond 20:1 or steeper than 1:1.2) the diagram is **visually normalized for readability** with an explicit disclosure: *"Diagram visually normalized for readability. Numeric values shown are exact."* Deterministic output.

---

## 10. Persistence & Handoffs

| Action | Path |
|---|---|
| Save to Project | **Project store** (`src/services/store.js`) → `project.decisions[]` with `kind: 'slope'`, signed values + direction. No slope-specific localStorage key. |
| Save to Journal | Real `HistoryService` |
| To Workspace | Rise + Run via the existing workspace controller |
| Send to CAD | Existing CAD Handoff view (Mode 13), clean mm values |
| Copy Result / Copy Schedule | Clipboard summary / TSV |

Preferences (definition mode, display unit) persist in `archiscale_slopes_prefs` — a **preference** key, separate from project data.

---

## 11. Limitations (intentional)

- Single straight slope — no terrain meshes, contours, grading, road/drainage design, or GIS.
- Angle inputs are bounded to ±89.9° (tan(90°) singularity handled structurally).
- |run| magnitude bounded to 500 m for the analyzer.
- Not an accessibility or compliance certification.
- Redundant-only definitions (percent+ratio etc.) are deliberately not standalone modes.

---

## 12. Testing

`tests/slopes.test.js` (176 assertions): canonical math including structured vertical/flat/invalid classification, all seven definitions, signed geometry with the documented ratio/direction convention, full validation matrix, real-parser unit canonicalization (`1200mm` → 1.2 m), deterministic consistency tolerance (within/beyond/deterministic), ratio formatting with direction words, explanation sentences (rises/falls), target determinism and monotonicity, SVG correspondence for both directions plus normalization disclosure, **cross-engine regression** (ramp and stair engines agree exactly on the golden 1.2/14.4 geometry after the shared-math extraction), project-store round-trip with the real store, journal via the real HistoryService, and CAD payload via the real `buildCadHandoffPayload`.
