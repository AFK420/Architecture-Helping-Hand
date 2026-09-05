# RAMPS — Ramp Calculator (Mode 15)

**Straight Ramp / Single Run — Landings Not Included.**

**Status**: Implemented (Architectural Tools Phase)  
**Module**: `src/core/ramps.js` (pure engine) · `src/ui/views/ramps.js` (view)  
**Date**: September 2, 2026

---

## 1. Scope & Positioning

The Ramp Calculator is an **educational/design calculation tool** for a straight ramp (single run). It is **NOT a jurisdiction-specific code-compliance engine** and does **NOT provide ADA or Part M compliance certification**. Landings, intermediate resting platforms, and switchbacks are not calculated. The single configurable reference carries the label *Educational Reference (configurable)*, its note explicitly requires local verification against applicable local regulations, and the UI never claims "code compliant".

**Negative slope is rejected** (`NEGATIVE_SLOPE`): the tool models ascent ramps; no downhill/terrain mode exists yet. This is a documented design decision, not an oversight.

---

## 2. One Canonical Geometry Source

All three slope representations derive from the same `rise`/`run` pair in `slopeConversions()` — they can never disagree:

```
slopePercent = rise / run × 100
ratio        = run / rise              (displayed "1 : X")
angle        = atan2(rise, run) × 180/π
flightLength = √(rise² + run²)
```

Angle is always computed from full-precision geometry, then formatted — never from a rounded display value.

---

## 3. Input Modes

| Mode | Inputs | Solves for | Notes |
|---|---|---|---|
| **A — Rise + Desired Slope** | rise, slope % | **required run** (hero) | run = rise / (slope/100) |
| **B — Rise + Available Run** | rise, run | slope % / ratio / angle | Includes the available-run shortfall analysis |
| **C — Run + Desired Slope** | run, slope % | **required rise** (hero) | rise = run × slope/100 |
| **D — Rise + Run (Direct)** | rise, run | pure geometry | No values are invented |

Length inputs accept the standard application parser (`1.2m`, `1200mm`, `4'6"`).

---

## 4. Ratio Convention & Formatting

`1 : (run / rise)` — "1 unit of rise per X units of run". Integer ratios display exactly (`1 : 12`); floating-point noise is normalized against the existing epsilon-stabilized formatter (`12.00000000002 → 1 : 12`); non-integer ratios are shown as controlled decimals (`1 : 8.5`, `1 : 33.33`) — never fabricated as exact integers.

---

## 5. Validation (stable error codes)

`INVALID_RISE`, `INVALID_RUN`, `INVALID_SLOPE`, `NEGATIVE_SLOPE`, `INVALID_UNIT`, `MISSING_INPUT`, `NON_FINITE_RESULT`.

- Zero/negative/NaN/Infinity rise, run, and slope are rejected with the right code.
- Unknown units surface the strict `requireUnit` failure as `INVALID_UNIT` — no silent coercion.
- Slopes above 100% (`MAX_SLOPE_PERCENT`) are outside the ramp study band.
- Derived runs beyond 200 m (`MAX_RUN_METERS`) fail with `INVALID_RUN`.
- Non-finite post-derivation results fail with `NON_FINITE_RESULT`.

---

## 6. Available-Run Analysis (Mode B focus)

For rise + available run the result includes a deterministic comparison against the configured reference target:

```text
Available run:              10.00 m
Required for 8.33% (1:12):  14.40 m
Difference:                  4.40 m short
Result: Insufficient run for the target slope.
```

`analyzeAvailableRun(rise, run, references)` is a pure export; the same block works in any mode that knows rise and run.

---

## 7. Target Comparison (deterministic)

`buildTargetComparison(rise, references)` maps the fixed `RAMP_TARGET_SLOPES` study values — 5%, 8.33% (1:12), 10%, 12.5% (1:8), 16.67% (1:6), 20% (1:5) — to the run each demands for the current rise. Ordering is fixed; equal inputs give identical output; runs are monotonic (higher percent → shorter run, pinned by test). Each target notes its meaning; the 1:12 row is labelled *"the widely taught accessibility reference"* — a study value, not a legal recommendation. Clicking a target switches to Mode A with that slope.

---

## 8. Reference System

| Field | Default |
|---|---|
| Target ratio | 1:12 (8.33%) |
| Study band | 1:8 – 1:20 |
| Label | Educational Reference (configurable) |
| Note | "…verify applicable local requirements for real projects." |

Status vocabulary: `Within configured reference` / `Steeper than configured reference` / `Shallower than configured reference`. All fields are user-overridable in the UI; no reference exists beyond what is configured.

---

## 9. SVG Diagram

`generateRampSVG(result)` draws a proportional side elevation **from the actual calculated geometry**: baseline, slope line, dashed rise dimension, and a slope/summary label. Tests verify the rendered slope line's run:rise pixel ratio matches the numeric result (≤1% tolerance from coordinate rounding), that different inputs produce different rendered geometry (no static art), and that labels carry the real formatted values. Deterministic output.

---

## 10. Persistence & Handoffs

| Action | Path |
|---|---|
| Save to Project | **Project store** (`src/services/store.js`) → `project.decisions[]` with `kind: 'ramp'`, raw numeric values + reference label. No ramp-specific localStorage key. |
| Save to Journal | Real `HistoryService` (ratio, slope %, angle recorded) |
| To Workspace | Rise + Run as Workspace entries via the existing workspace controller |
| Send to CAD | Existing CAD Handoff view (Mode 13), clean mm values (rise, run, flight length) |
| Copy Result / Copy Schedule | Clipboard summary / TSV |

Preferences (mode, display unit) persist in `archiscale_ramps_prefs` — a **preference** key, separate from project data.

---

## 11. Limitations (intentional)

- Straight ramp only — no landings, switchbacks, spiral ramps, or curbs/handrail modeling.
- No site grading, terrain, or civil engineering calculations.
- Not an accessibility certification: the 1:12 figure is a study reference, and real projects must be verified against the applicable local code by the student/designer.
- The future general Slope tool can reuse `slopeConversions()` (rise/run-based, deliberately generic) without this module gaining terrain features.

---

## 12. Testing

`tests/ramps.test.js` (128 assertions): all four modes with hand-computed golden values (1.2 m rise, 14.4 m run → exactly 1:12; 12 m run at 8% → 0.96 m rise), ratio formatting stability incl. float-noise normalization, full validation matrix, unit canonicalization through the REAL parser (`1200mm` → 1.2 m), boundary slopes (1% to ~100%), repeating decimals, reference semantics/overrides, target comparison determinism + monotonicity, SVG geometry correspondence, a stairs/ramps angle cross-check (both engines agree on `atan2`), project-store round-trip with the real store, journal via the real HistoryService, and CAD payload through the real `buildCadHandoffPayload`.
