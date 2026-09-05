# STAIRS — Stair Calculator (Mode 14)

**Status**: Implemented (Architectural Tools Phase)  
**Module**: `src/core/stairs.js` (pure engine) · `src/ui/views/stairs.js` (view)  
**Date**: September 2, 2026

---

## 1. Scope & Positioning

Straight-flight stair geometry calculator: rise, riser count, tread/going, run, Blondel 2R+T, and pitch. Headroom clearance must be verified separately against the project geometry and applicable requirements.

The tool is an educational and design calculation tool, NOT a jurisdiction-specific code-certification engine. All reference ranges are configurable heuristics carrying explicit semantic labels:

| Range | Label | Default | Meaning |
|---|---|---|---|
| Riser height | Typical Reference (configurable) | 130–190 mm | Common interior stair risers across many jurisdictions |
| Going / tread depth | Typical Reference (configurable) | 240–320 mm | Common interior goings |
| **Blondel: 2R + T** | **Educational Heuristic (Blondel, configurable)** | 600–660 mm | The classic teaching band for a comfortable stride |
| Stair angle | Typical Reference (configurable) | 20°–38° | Typical interior stair slope |

The UI never claims "code compliant". Status language is exactly:
`Within configured reference range` / `Below configured reference range` / `Above configured reference range`.

---

## 2. Input Modes

| Mode | Inputs | Engine behavior |
|---|---|---|
| **A — Rise + Desired Riser** | total rise, desired riser | Ranks all riser counts (2–60) by riser-distance to the desired riser, then by proportion distance to the Blondel midpoint, then by count ascending |
| **B — Rise + Number of Risers** | total rise, integer riser count | Exact geometry; tread comes from the supplied desired tread or the Blondel midpoint |
| **C — Rise + Available Run** | total run available | Filters candidates to those fitting the run **and** inside the riser reference range; reports `INSUFFICIENT_RUN` with an explanatory note if none qualify |
| **D — Rise + Run (Direct)** | total rise, total run | Pure geometry (angle, slope %, ratio, flight length) plus an explicitly-labelled whole-riser *interpretation* when one falls in range — never presented as an exact solution |

Length inputs accept the standard application parser formats (`2.8m`, `2800mm`, `11 1/4"`, `12'-6"`).

---

## 3. Conventions & Formulas

**Riser/going convention (explicit everywhere in the UI):** N risers produce **N − 1 goings**. The upper floor slab acts as the final tread. Total run = (N − 1) × going depth.

```
riserHeight      R = totalRise / N            (N = integer riser count)
goingCount       G = N − 1
totalRun         run = G × T
angle            θ = atan2(totalRise, run)    (degrees shown)
slope%           = totalRise / run × 100
rise:run ratio   = totalRise : run
flight length    L = √(rise² + run²)
Blondel          2R + T
```

The off-by-one between risers and goings is shown verbatim in the result header (`16 risers / 15 goings`) and inside the SVG diagram.

---

## 4. Candidate Logic (deterministic)

Candidates are enumerated over the whole supported count range (2–60) with the selected objective:

| Objective | Tread rule |
|---|---|
| Comfortable proportion | Solve 2R + T = Blondel midpoint for T |
| Minimize run | T = tread reference minimum |
| Target desired riser / tread / fit run | T = supplied desired tread, else tread minimum |

Ranking keys, in order: (1) |riser − desired riser| when a desired riser is supplied, (2) |2R+T − Blondel midpoint|, (3) riser count ascending. Riser counts are unique, so the ordering is a total order — identical inputs always produce identical output. The best eight candidates are shown; clicking one switches to Mode B with that exact count.

**Mode C guard:** a candidate must fit the run **and** produce a riser inside the riser reference range. Without the second condition, a degenerate 2-riser "stair" (1.4 m risers) would satisfy any run constraint.

---

## 5. Result Model

Raw canonical meters are kept separate from formatted strings:

```js
{
  valid, mode, convention: { risers, goings, rule },
  input: { totalRiseMeters, desiredRiserMeters, ..., references },
  risers:  { count, heightMeters },
  treads:  { count, depthMeters },      // count = N − 1
  geometry: { totalRunMeters, slopedLengthMeters, angleDegrees, slopePercent, riseRunRatio },
  proportion: { twoRPlusTMeters, status: 'within'|'below'|'above', reference },
  candidates: [...],                    // Modes A/C
  formatted: { ... }                    // UI strings only
}
```

Validation failures return `{ valid: false, errorCode, errorMessage }` with stable codes in `STAIR_ERROR_CODES` (e.g. `NON_INTEGER_RISERS`, `INSUFFICIENT_RUN`, `INVALID_UNIT`). Unknown units surface the strict `requireUnit` failure as `INVALID_UNIT` — no silent coercion.

---

## 6. SVG Diagram

`generateStairSVG(result)` draws a proportional side elevation **from the actual calculated geometry** (tested: the path's run:rise pixel ratio matches the numeric result to 0.1%; segment counts match the riser/going structure; labels carry the real formatted values). It re-renders on every input change.

---

## 7. Persistence & Handoffs

| Action | Path |
|---|---|
| Save to Project | **Project store** (`src/services/store.js`) → `project.decisions[]` with `kind: 'stair'` and the raw result values + reference labels. Versioned envelope; no stair-specific localStorage key. |
| Save to Journal | Existing `HistoryService` |
| To Workspace | Existing Dimension Workspace entries (rise / riser / going / run) |
| Send to CAD | Existing CAD Handoff view (Mode 13) with clean numeric values |
| Copy Result / Copy Schedule | Clipboard (summary text / TSV) |

User preferences (mode, objective, display unit) persist in `archiscale_stairs_prefs` — a **preference** key, deliberately separate from project data.

---

## 8. Limitations (intentional)

- Straight flight only. Multi-flight / U-shaped / L-shaped stairs are future work; the per-flight result model was shaped so a future `flights: [...]` wrapper can sum geometry without changing the math here.
- No headroom/height-above-landing checks, no handrail/guard modeling, no structural analysis, no construction detailing.
- Reference ranges are heuristics for study/exam work — always verify against the studio brief and local regulations.

---

## 9. Testing

`tests/stairs.test.js` (150 assertions) covers: all four modes, validation/error codes, exact math against hand-computed golden values, the riser/going convention, deterministic candidate ranking, boundary stairs (0.28 m and 9.9 m rises), repeating-decimal precision, reference-range semantics and override behavior, SVG-geometry correspondence, and project-store persistence round-trip (real store, in-memory adapter).
