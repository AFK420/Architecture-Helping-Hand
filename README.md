# Architecture Helping Hand 📐🏛️

> **Professional Architectural Scale, Furniture Sizing & Multi-Unit Calculation Studio**  
> *A high-precision, zero-dependency, tactile architectural conversion studio built for architects, interior designers, urban planners, physical model makers, and design students.*

[![Tests](https://img.shields.io/badge/Tests-2544%20Passed%20(100%25)-38bdf8?style=flat-square&logo=node.js)](tests/)
[![Architecture](https://img.shields.io/badge/Architecture-3--Tier%20Core%20%7C%20Frozen-10b981?style=flat-square)](ENGINEERING_RULES.md)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Vanilla)-f59e0b?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](package.json)
[![Platform](https://img.shields.io/badge/Platform-Browser%20%7C%20Offline%20file%3A%2F%2F%2F%20%7C%20PWA-06b6d4?style=flat-square)](index.html)

---

## 📑 Table of Contents
1. [🎯 Why Architecture Helping Hand Was Created](#-why-architecture-helping-hand-was-created)
2. [🚀 What Has Been Done Until Now (Development History)](#-what-has-been-done-until-now-development-history)
3. [🌐 What This Project Does on GitHub](#-what-this-project-does-on-github)
4. [🛠️ Core Tools & Capabilities](#️-core-tools--capabilities)
   - [1. Bidirectional Scale Converter (Drawing ↔ Real World)](#1-bidirectional-scale-converter-drawing--real-world)
   - [2. Rescaler (Sheet Scale A ➔ Sheet Scale B)](#2-rescaler-sheet-scale-a--sheet-scale-b)
   - [3. Scale Finder & Detector](#3-scale-finder--detector)
   - [4. Area (S²) & Volume (S³) Scaler](#4-area-s²--volume-s³-scaler)
   - [5. Furniture Scales & Fixtures Catalog (179 Items Across 9 Domains)](#5-furniture-scales--fixtures-catalog-with-live-search)
   - [6. Multi-Length Architectural Reference Sheet](#6-multi-length-architectural-reference-sheet)
   - [7. Architectural Geometry Engine (Core Math)](#7-architectural-geometry-engine-core-math)
   - [8. Dimension Workspace & Dynamic Schedule (v1.1)](#8-dimension-workspace--dynamic-schedule-v11)
   - [9. Dimension Expression Calculator](#9-dimension-expression-calculator)
   - [10. Multi-Scale Comparison Workspace](#10-multi-scale-comparison-workspace)
   - [11. Dimension Chains (Continuous Strings)](#11-dimension-chains-continuous-strings)
   - [12. CAD Clipboard & Drafting Handoff](#12-cad-clipboard--drafting-handoff)
   - [13. Batch CAD Conversion (Bulk Scaling & Unit Engine)](#13-batch-cad-conversion-bulk-scaling--unit-engine)
   - [14. Quick Dimension Strip (Micro-Tool Glance Instrument)](#14-quick-dimension-strip-micro-tool-glance-instrument)
   - [15. CAD Handoff — Rhino · AutoCAD · SketchUp Helpers (Mode 13)](#15-cad-handoff--rhino--autocad--sketchup-helpers-mode-13)
   - [16. Stair Calculator (Mode 14) — Architectural Tools](#16-stair-calculator-mode-14--architectural-tools)
   - [17. Ramp Calculator (Mode 15) — Architectural Tools](#17-ramp-calculator-mode-15--architectural-tools)
   - [18. Slope Analyzer (Mode 16) — Architectural Tools](#18-slope-analyzer-mode-16--architectural-tools)
5. [📐 Architectural Scale Presets (All 28 Presets)](#-architectural-scale-presets-all-28-presets)
6. [🛋️ Architectural Furniture & Fixtures Database (179 Items Across 9 Domains)](#️-architectural-furniture--fixtures-database-179-items-across-9-domains)
7. [📏 Supported Measurement Units](#-supported-measurement-units)
8. [🧮 Mathematical Formulas & Contracts](#-mathematical-formulas--contracts)
9. [🎨 Visual Proportions, 2D Blueprint SVGs & Tactile Audio](#-visual-proportions-2d-blueprint-svgs--tactile-audio)
10. [💾 Calculation History & Export](#-calculation-history--export)
11. [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
12. [💻 How to Run, Build & Test](#-how-to-run-build--test)
13. [🔮 Future Roadmap](#-future-roadmap)

---

## 🎯 Why Architecture Helping Hand Was Created

### The Architectural Problem
Architects, interior designers, urban planners, physical model makers, and civil engineers constantly translate measurements between **real-world site dimensions** (meters, feet, kilometers) and **physical drawings or physical model sheets** (millimeters, centimeters, inches).

Manual scale calculations often cause:
* **Costly Site & Millwork Errors**: Misinterpreting drawing units or scale ratios leads to fabricated cabinetry, doors, or partitions that do not fit.
* **Redrawing & Rescaling Friction**: Moving a scheme from a $1:50$ detail or general arrangement plan to a $1:200$ site plan requires tedious line-by-line recalculations.
* **Unlabelled Drawings**: Working with imported PDF scans, surveyor drawings, or historical blueprints with missing scale bars leaves designers guessing the scale.
* **Furniture Clearance Uncertainties**: Hand-drafting and CAD block sizing require looking up standard clearances and real-world dimensions across multiple reference manuals.

### The Solution: Architecture Helping Hand
**Architecture Helping Hand** eliminates manual calculation errors by providing a unified, tactile, mathematically verified studio that runs 100% client-side with **zero external dependencies**. It parses fractions (`3 1/2`), feet-inches (`12'-6 1/2"`), scales areas ($S^2$) and volumes ($S^3$), detects unknown scales, and provides an instant searchable database of **179 architectural furniture and fixture standards** across 9 domains with accurate 2D top-down blueprint drawings.

---

## 🚀 What Has Been Done Until Now (Development History)

The codebase has evolved through rigorous engineering, auditing, hardening, and feature rollout phases:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  COMPLETE DEVELOPMENT TIMELINE                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
  Phase 0      • Initial MVP with Bidirectional Converter & Rescaler
               • Cozy Studio Dark (default), Drafting Paper & Blueprint themes
               • Web Audio API synthesized mechanical tactile clicks
               • Visual proportional silhouette comparison & graphic scale bar
               ────────────────────────────────────────────────────────────────────────────────────
  Phase 0.5    • Added Dedicated Furniture Scaling Catalog with 61 items
               • Instant keystroke search bar & dynamic category filters
               • Scaled 2D plan blueprint previews & custom dimension scaler
               ────────────────────────────────────────────────────────────────────────────────────
  Phase 1.0    • Baseline Git Repository established on GitHub
               • Comprehensive 24-point codebase audit (ARCHITECTURE_AUDIT.md)
               • Refactored into a strict 3-tier modular architecture (src/core, src/services, src/ui)
               • Built pure-Node zero-dependency bundler (scripts/build.js)
               ────────────────────────────────────────────────────────────────────────────────────
  Phase 1.5    • Architecture Verification & Hardening
               • Implemented strict requireUnit validation (no silent fallbacks)
               • Added multi-suite automated test framework in tests/
               • Fixed architectural hyphen separator parsing bug (12'-6 1/2")
               ────────────────────────────────────────────────────────────────────────────────────
  Phase 1.75   • Foundation Freeze & Engineering Rules established (ENGINEERING_RULES.md)
               • Verified deterministic build synchronization (scripts/build.js --check)
               • Hardened input parser against malformed fractions & trailing letters
               ────────────────────────────────────────────────────────────────────────────────────
  Phase 1.9    • Final Core Contract Hardening
               • Implemented requireFiniteNumber to reject non-numeric types & strings
               • Updated detectScale to return ratio: null on invalid dimensions
               • Verified architectural geometry readiness (FUTURE_ARCHITECTURE.md)
               • Reached 149 exact automated test assertions with 100% pass rate
               ────────────────────────────────────────────────────────────────────────────────────
  Phase 2.0    • Architectural Geometry Engine Implementation (src/core/geometry.js)
               • Headless pure calculation functions: Rectangle, Circle, Triangle (Heron's formula),
                 Arbitrary Polygon (Shoelace formula / Gauss area algorithm)
               • Automatic polygon orientation detection (Clockwise vs Counter-Clockwise)
               • Collinear, self-intersecting, and degenerate polygon edge-case detection
               • 40 automated geometry test assertions in tests/geometry.test.js
               ────────────────────────────────────────────────────────────────────────────────────
  Phase UI-1   • Full DOM Contract Audit & Studio Tactile Redesign
               • Harmonized all DOM IDs and CSS selectors between index.html and src/ui/app.js
               • Added prominent tactile "RUN CALCULATION" buttons with state machine
                 (READY, RUNNING, SUCCESS, ERROR) across Converter, Rescaler, Detector, Area/Vol
               • Added Enter key keyboard trigger across all inputs
               • Fixed bundler multiline regex for clean ES5/ES6 vanilla bundling
               • Configured local development server port to 3500 (npm start)
               • Reached 295 automated test assertions across 9 test suites
               ────────────────────────────────────────────────────────────────────────────────────
  Phase UI-2   • Architectural Standards & Furniture Database Enlargement (179 Items)
               • Expanded database from 61 to 179 verified pieces across 9 specialized domains:
                 Living (23), Bedroom (20), Dining (18), Kitchen (22), Bathroom (20), Office (22),
                 Doors & Circulation (22), Outdoor & Patio (16), Commercial & Gym (16)
               • Added dynamic category tab count badges in real-time
               • Reached 299 automated test assertions with 100% pass rate
               ────────────────────────────────────────────────────────────────────────────────────
  Phase UI-3   • Comfortable Typography & High-Contrast Overhaul
               • Switched primary interface font to humanistic Plus Jakarta Sans
               • Paired with JetBrains Mono for technical architectural numbers and measurements
               • Upgraded text colors to WCAG AAA high-contrast slate palette (slate-300 / slate-400)
               • Increased base sizing, relaxed line-height (1.55–1.6), and enlarged input fields
               ────────────────────────────────────────────────────────────────────────────────────
  Phase UI-4   • Accurate 2D Blueprint Plan Visuals, 3-Column Card Layout & Distinct Button Borders
               • Tailored individual 2D top-down CAD/drafting blueprint plan SVGs for each item:
                 exact cushion divisions, Chesterfield tufting buttons, bed pillows, ADA grab bars,
                 urinal privacy fins, double vanity sinks, jacuzzi jets, stair treads with UP arrows,
                 ADA wheelchair turning circles, parking bays with vehicles, treadmill belts, gym bench
               • Redesigned catalog into a spacious 3-column drafting card grid
               • Enlarged blueprint preview height to 135px with glowing drafting crosshair grid
               • Added distinct 1.5px / 2px tactile borders to every button across the studio
```

---

## 🌐 What This Project Does on GitHub

This repository serves as:
1. **An Open-Source Reference Studio**: A tactile, zero-friction architectural scaling studio for architects, interior designers, landscape architects, students, and educators.
2. **Zero-Dependency Architecture**: No React, no Vue, no webpack, no runtime `node_modules`. Anyone can clone the repository, double-click `index.html`, and use it immediately offline via `file:///`.
3. **A Reliable Mathematical Core**: High-integrity domain calculations in `src/core/` verified by **2,544 automated test assertions across 32 test suites** (authoritative count emitted by `npm test`).
4. **An Extensible Platform**: Prepared for future architectural geometry engines, CAD vector exports (SVG/DXF), and stair/ramp calculations.

---

## 🛠️ Core Tools & Capabilities

### 1. Bidirectional Scale Converter (Drawing ↔ Real World)
* **Mode Switch**: Convert physical drawing measurements to real-world site dimensions, or vice versa, with a single click or keyboard shortcut (<kbd>S</kbd>).
* **Flexible Input Parser**: Accepts decimals (`12.5`), architectural fractions (`3 1/2`), and feet-inch notations (`12'-6 1/2"`).
* **28 Scale Presets**: Instant one-click selection of standard metric and imperial architectural scales ($1:1$, $1:20$, $1:50$, $1:100$, $1/4"=1'$, etc.).
* **Result-First Display**: Large, high-contrast monospace result readout with instant clipboard copy (<kbd>Enter</kbd> to run).

### 2. Rescaler (Sheet Scale A ➔ Sheet Scale B)
* **Cross-Sheet Dimension Conversion**: Calculate what an existing measurement on Scale A ($1:50$) measures when drafted on Scale B ($1:200$).
* **Magnification & Reduction Factor**: Real-time calculation of sheet resizing percentage and real site dimension.

### 3. Scale Finder & Detector
* **Detect Unknown Scales**: Enter a measured length on an unlabelled paper drawing alongside its known real-world dimension.
* **Automatic Preset Matching**: Instantly detects the exact ratio ($1:X$) and identifies the nearest standard architectural scale preset with percentage delta.

### 4. Area ($S^2$) & Volume ($S^3$) Scaler
* **Quadratic Area Scaling**: Accurate $S^2$ area scaling for floor plates, room boundaries, site areas ($m^2$, $ft^2$, hectares, acres).
* **Cubic Volume Scaling**: Accurate $S^3$ volume scaling for physical massing models, HVAC airflow volumes, and water features ($m^3$, $ft^3$, liters).

### 5. Furniture Scales & Fixtures Catalog (179 Items Across 9 Domains)
* **179 Verified Standard Pieces**: Real-world dimensions ($W \times D \times H\text{ cm}$) and imperial equivalents.
* **Tailored 2D Architectural Blueprint SVGs**: Top-down CAD/drafting drawings for each individual piece (cushions, pillows, basins, burners, door swings, stair treads).
* **Spacious 3-Column Grid Layout**: Large, comfortable drafting cards with `135px` blueprint preview viewports.
* **Real-Time Search & Category Filters**: Search by keyword or filter across 9 domains with dynamic item count badges.
* **Custom Dimension Scaler**: Enter any bespoke custom furniture or millwork dimension and see its exact scaled drawing size.

### 6. Multi-Length Architectural Reference Sheet
* **Quick Reference Matrix**: Computes drawing paper lengths ($0.1\text{cm}$ to $100\text{cm}$) into real-world metric and imperial feet-inches for any selected scale ratio.
* **Print-Ready Sheet**: Formatted for physical printouts and drafting studio pin-up boards.

### 7. Architectural Geometry Engine (Core Math)
* **Rectangle**: Width, length, area, perimeter, and diagonal calculations.
* **Circle**: Radius, diameter, circumference, and area calculations.
* **Triangle**: Three-side calculations using Heron's formula ($s = \frac{a+b+c}{2}$, $A = \sqrt{s(s-a)(s-b)(s-c)}$).
* **Arbitrary Polygon**: Multi-vertex 2D coordinates using the Shoelace formula (Gauss area algorithm) with signed clockwise/counter-clockwise orientation and collinearity detection.

### 8. Dimension Workspace & Dynamic Schedule (v1.1)
* **Semantic Dimension Types**: Distinct roles for additive structural segments (`SEG`), planning tolerances (`ALW`), and non-additive reference openings (`REF`, default).
* **Multi-Metric Totals Hero**: Calculates separate Segments Total, Allowances Total, Combined Total, and Reference Totals.
* **Deterministic Quick Add**: Type natural single-line entries like `Wall A 4800`, `Door Opening 900mm`, `seg Bay 1 6m`, or `Gap 50 allowance`.
* **Fast Inline Editing**: Double-click or click any name, measurement, or note cell to edit directly in place; click type badge to cycle roles.
* **Grouping & Subtotals**: Organize dimensions into named groups with group subtotals and collapsible sections.
* **CAD Clipboard Preparation**: Copy formatted schedules, additive segments, reference dimensions, or raw CAD numbers (`4800\n3200\n900`) for direct pasting into Rhino, AutoCAD, or SketchUp.
* **Keyboard-First Workflow**: Full keyboard productivity (<kbd>N</kbd> new/focus, <kbd>D</kbd> duplicate, <kbd>Del</kbd> delete selected, <kbd>↑</kbd>/<kbd>↓</kbd> navigate, <kbd>Ctrl+C</kbd> copy).
* **Display Density Modes**: Switch between Comfortable drafting mode and high-density Compact schedule view.

### 9. Dimension Expression Calculator (Mode 8)
* **Deterministic Expression Parser**: Evaluates mixed-unit architectural math expressions (`2400 + 900 + 1200`, `5.4m - 1200mm`, `(2.4m + 900mm) / 3`, `250mm * 8`, `7' 6" + 2' 6"`) with standard operator precedence without using `eval()`.
* **Physical Dimensional Semantics**: Enforces `length ± length -> length`, `length * scalar -> length`, `length / length -> scalar count`.
* **Live Scaled Drawing Output**: Computes the exact scaled drawing dimensions on paper alongside unit equivalents ($m$, $cm$, $mm$, $ft\text{-}in$).
* **Workspace Insertion Pipeline**: Directly send evaluated expressions into the active Dimension Workspace schedule with custom role selector (<kbd>Shift+Enter</kbd>).
* **Command Palette Math Detection**: Type math expressions directly in <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> for instant live evaluation preview.

### 10. Multi-Scale Comparison Workspace (Mode 9)
* **Simultaneous Multi-Scale Evaluation**: Evaluates a single real-world dimension or math expression across multiple architectural scales simultaneously ($1:10$, $1:20$, $1:25$, $1:50$, $1:75$, $1:100$, $1:200$, $1:500$, and custom ratios).
* **Proportional Visual Drafting Bars**: Displays true physical length proportions relative to the largest scale in the set.
* **Paper-Size Usable Width Checks**: Instant context checks for standard sheet sizes (A4, A3, A2, A1, A0) to determine if a dimension fits on paper.
* **Heuristic Suggested Fit**: Optional target drawing range heuristic to highlight suggested scale options.
* **Workspace & Expression Integration**: Insert individual scale drawing results into the active Dimension Workspace (`+ WS`) and launch multi-scale comparison directly from Mode 8.
* **Command Palette Live Preview**: Typing `compare 2400mm` or `2400mm` in <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> generates an instant 3-scale comparison preview.

### 11. Dimension Chains (Continuous Strings) (Mode 10)
* **Sequential Cumulative Coordinates**: Evaluates continuous measured segments end-to-end to compute running start and end positions ($0 \rightarrow 1200 \rightarrow 3000 \rightarrow 3900 \rightarrow 5400\text{ mm}$).
* **Scale-Accurate SVG Drafting Visualizer**: Pure mathematical SVG drafting centerpiece rendering baseline axes, witness lines, architectural $45^\circ$ tick slashes, and interactive slice highlighting.
* **Semantic Roles**: Supports `SEG` (additive segments), `REF` (non-additive annotation pins), and `ALW` (allowance/tolerance clearances).
* **Datum Start & End Offsets**: Handles structural baseline offsets independently from segment totals ($\text{Overall} = \text{StartOffset} + \text{Segments} + \text{Allowances} + \text{EndOffset}$).
* **Workspace & Multi-Scale Handoffs**: Transfer entire chains as named groups to Dimension Workspace or compare chain extents across scales in Mode 9.
* **Command Palette Chain Preview**: Typing `chain 1200 1800 900` in <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> instantly parses and previews multi-segment chains.

### 12. CAD Clipboard & Drafting Handoff (Mode 11)
* **Normalized Numerical Copy Layer**: Formats clean real or drawing dimensions for rapid entry into AutoCAD, Rhino, Revit, SketchUp, and Spreadsheets.
* **Application Formatting Presets**: Built-in format presets for Generic CAD, AutoCAD command lines, Rhino curve distance prompts, SketchUp VCB, and Tab-separated (TSV) / CSV schedules.
* **Non-Destructive Formatting Engine**: Pure zero-DOM formatter ensuring standard `.` decimal separators, negative number preservation, and legitimate `0` coordinate preservation without modifying source calculation state.
* **1-Click Cross-Mode Handoffs**: Direct CAD Clipboard handoff buttons across Dimension Workspace, Chains, Expressions, and Multi-Scale Comparison.

### 13. Batch CAD Conversion (Bulk Scaling & Unit Engine) (Mode 12)
* **Bulk Scale & Unit Transformations**: Pastes entire dimension lists, schedules, or architectural measurement tables and converts every entry simultaneously across scales ($1:10 \dots 1:500$) and units (`mm`, `cm`, `m`, `in`, `ft`, `ft-in`).
* **Intelligent Auto-Detected Delimiters**: Automatically detects line breaks, commas, tabs, and semicolons without requiring manual format selection.
* **Non-Destructive Parsing & Expression Evaluation**: Retains raw pasted strings (`originalText`), parses named rows (`Wall North = 4800mm`), semantic roles (`SEG`, `REF`, `ALW`), and evaluates arithmetic expressions (`2400 + 900`, `5.4m - 1200mm`).
* **Row-by-Row Status Isolation**: Malformed or invalid rows are flagged individually (`INVALID`) without halting or corrupting valid conversions.
* **Multi-Format Downstream Handoffs**: 1-click export to CAD Clipboard (Mode 11), Dimension Workspace groups (Mode 7), Multi-Scale Comparison (Mode 9), Dimension Chains (Mode 10), and Calculation Journal.
* **High-Throughput Benchmark**: Benchmarked to process **1,000+ rows in < 10ms** with zero external dependencies.

### 14. Quick Dimension Strip (Micro-Tool Glance Instrument)
* **Always-Accessible Compact Drafting Strip**: Open from any mode or workspace via <kbd>Q</kbd> to immediately inspect real-world measurements, scale equivalents, and arithmetic expressions.
* **Live Multi-Scale Matrix**: Instant drawing size evaluations across 10 standard architectural scale ratios ($1:10 \dots 1:500$) plus custom ratios.
* **Common Unit Readouts**: Instant equivalents across Millimeters (`mm`), Centimeters (`cm`), Meters (`m`), Decimal Inches (`in`), and Architectural Feet-Inches (`ft-in`).
* **Verified Standard Context**: Evaluates dimensions against physical building standards (doors, circulation, stairs, counters, ceiling heights) and returns explicit no-reference notices for unindexed values.
* **1-Click Copy & Cross-Tool Handoffs**: Fast exports to clipboard (Real, Drawing, All Scales, CAD Numbers, TSV row) and direct transfers to Dimension Workspace, Multi-Scale, Chains, CAD Clipboard, and Journal.

### 15. CAD Handoff — Rhino · AutoCAD · SketchUp Helpers (Mode 13)
* **One Send-To Workflow for Every Tool**: A final handoff layer that turns the last valid result from any toolkit tool (Dimension Workspace, Expression, Multi-Scale, Chains, Batch CAD, Quick Dimension, or manual values) into a target-specific clipboard payload. Every source exposes a **🚀 Send to CAD** action; the Command Palette exposes `CAD Handoff (Rhino · AutoCAD · SketchUp)`.
* **CAD Target Profiles**: Choose Rhino, AutoCAD, SketchUp, or Generic CAD. Each profile encodes output conventions (default unit, precision, suffix style) — e.g. plain decimals for Rhino/AutoCAD command prompts, unit-suffixed values for the SketchUp Value Control Box.
* **Copy Formats**: Raw Numbers (one per line), Formatted Dimensions (with unit), Drawing Values (@ scale), named Schedule tables, TSV, and CSV. Advanced unit/precision/suffix controls are tucked into a collapsed section.
* **Chain-Aware Outputs**: Dimension Chains hand off as segment lengths (`1200 / 1800 / 900 / 1500`), cumulative positions (`0 / 1200 / 3000 / 3900 / 5400`), pipe summaries (`1200 | 1800 | 900`), or full named schedules with start/end/length/drawing columns.
* **Selection Semantics Preserved**: Workspace scope (all / selected / segments / references / allowances) and Batch row selection carry through to the payload; batch order and chain order are preserved and pinned by tests.
* **Preview Before Copy**: The exact clipboard text is always visible in a read-only preview with a live summary (count → target • format • unit) before copying or exporting as `.txt`.
* **Scope Note — Workflow Profiles, Not Integrations**: These are clipboard formatting conventions for fast manual pasting. Part 9 does **not** provide direct AutoCAD, Rhino, or SketchUp API/plugin integration, generates no proprietary command syntax, and never executes copied content.

### 16. Stair Calculator (Mode 14) — Architectural Tools
* **Four Deterministic Input Modes**: Rise + Desired Riser · Rise + Number of Risers · Rise + Available Run · Rise + Run (direct geometry). Lengths accept the full application parser (`2.8m`, `2800mm`, `12'-6"`).
* **Riser/Going Convention Made Explicit**: N risers → N − 1 goings (the upper slab is the final tread). The result header and SVG diagram show `16 risers / 15 goings` verbatim — the off-by-one is never hidden.
* **Blondel Proportion Check**: shows Riser, Going, and 2R+T against a configurable 600–660 mm teaching band, labelled *Educational Heuristic (configurable)*. Status language is "Within/Below/Above configured reference range" — never "code compliant". Riser/going/angle ranges are equally configurable Typical References.
* **Candidate Options**: up to eight ranked alternatives (e.g. 15/16/17 risers with their riser, going, run, and 2R+T), deterministic ordering, one click switches to an exact configuration. Objectives: comfortable proportion, minimize run, target riser, target tread.
* **Proportional SVG Diagram**: side elevation drawn from the actual calculated geometry — rise, run, flight angle, and the step outline all match the numeric result (pinned by tests).
* **Project Persistence**: *Save to Project* stores the stair as a decision in the versioned Project Document (`src/services/store.js`) — no stair-specific localStorage silo. Journal / Workspace / CAD Handoff handoffs reuse the existing systems. See **STAIRS.md** for the full contract.

### 17. Ramp Calculator (Mode 15) — Architectural Tools
* **One Canonical Geometry Source**: percentage (`rise/run × 100`), ratio (`1 : run/rise`), and angle (`atan2(rise, run)`) all derive from the same rise/run pair — they can never disagree. Angle is computed at full precision, then formatted.
* **Four Input Modes**: Rise + Desired Slope (hero: *required run*) · Rise + Available Run · Run + Desired Slope (hero: *required rise*) · Rise + Run (direct geometry, nothing invented). Lengths accept the full application parser.
* **Ratio Stability**: `1 : 12` renders exactly; float noise (`12.00000000002`) is normalized; non-integer ratios show controlled decimals (`1 : 8.5`) — never fabricated exactness.
* **Available-Run Analysis**: for a given rise and available run the tool reports required run for the reference target, the surplus/shortfall in meters, and an explicit *Sufficient / Insufficient* result.
* **Target Comparison**: fixed study values (5% / 8.33% / 10% / 12.5% / 16.67% / 20%) mapped to the run each demands — deterministic order, monotonic, labelled *Common Study Values (design targets, not legal requirements)*. One click switches the calculator to that target.
* **Configurable Educational Reference**: 1:12 target inside a 1:8–1:20 study band, labelled *Educational Reference (configurable)* with an explicit "verify applicable local requirements" note. Negative slope is rejected (`NEGATIVE_SLOPE`) — this models ascent ramps only.
* **Proportional SVG Diagram**: side elevation derived from the actual calculated geometry (rendered run:rise ratio pinned to the numeric result by tests).
* **Persistence & Handoffs**: *Save to Project* writes a decision to the versioned Project Document via the project store (no ramp-specific silo); Journal / Workspace / CAD Handoff reuse the existing systems. See **RAMPS.md** for the full contract.

### 18. Slope Analyzer (Mode 16) — Architectural Tools
* **Universal Rise/Run Analysis**: "I have a rise/run relationship and I want to understand it" — site studies, terrain, roof slopes, drainage direction, path gradients, ramp/stair analysis.
* **One Shared Math Source**: all slope representations come from `src/core/slope-math.js`, the same canonical converter the Ramp Calculator consumes — cross-engine regression tests prove identical numbers for identical geometry.
* **Seven Input Definitions**: Rise + Run (primary) · Rise/Run + Slope % · Rise/Run + Ratio (1 : X) · Rise/Run + Angle — each solves the missing geometry, then routes through the canonical conversion so all representations agree.
* **Signed Geometry**: positive rise = ↑ ASCENDING, negative rise = ↓ DESCENDING (drainage/terrain direction). Ratio displays as `1 : 12 ascending/descending` — the direction word carries the sign, never a confusing negative ratio. Unlike the Ramp Calculator, negative slope is intentionally supported here.
* **Structured Singularities**: vertical (run = 0) is classified explicitly with "Undefined / Infinite (vertical)" and 1 : 0; flat (rise = 0) shows 0% with an honestly-undefined ratio — no fabricated `Infinity%`.
* **Consistency Checking**: redundant values (e.g. rise + run + a claimed slope %) are compared against the calculated geometry with a documented 0.05% relative tolerance; mismatches surface as `CONFLICT — calculated 10, provided 8.33 (difference 1.67)` — never silently resolved.
* **Educational Explanation**: every result explains itself in plain language ("For every 12 units horizontally, the surface rises 1 unit") built from the actual geometry.
* **Study Targets & Diagram**: fixed target table (1% drainage → 100%) mapped to required runs; directional SVG side elevation with a visual-normalization disclosure for extreme ratios (numeric values always exact).
* **Persistence & Handoffs**: *Save to Project* → versioned Project Document via the project store; Journal / Workspace / CAD Handoff reuse the existing systems. See **SLOPES.md** for the full contract.

---

## 📐 Architectural Scale Presets (All 28 Presets)

| Preset Name | Category | Ratio (1:X) | Typical Architectural Application |
| :--- | :--- | :---: | :--- |
| **1:1** | Full Size | $1$ | 1:1 Fabrication Details & Millwork Mockups |
| **1:2** | Half Size | $2$ | Joinery Profiles & Large Construction Details |
| **1:5** | Detail | $5$ | Window Head/Sill Details & Cabinetry Sections |
| **1:10** | Detail | $10$ | Component Details & Interior Millwork |
| **1:20** | Detail / Interior | $20$ | Interior Elevations, Restrooms, Stairs & Joinery |
| **1:25** | Interior | $25$ | Kitchen Plans, Custom Millwork & Fitting Out |
| **1:50** | Architecture | $50$ | Standard General Arrangement Floor Plans |
| **1:100** | Architecture | $100$ | Standard Building Plans, Sections & Elevations |
| **1:200** | Architecture / Site | $200$ | Large Commercial Buildings & Small Site Plans |
| **1:250** | Site Plan | $250$ | Site Layouts & Massing Studies |
| **1:500** | Urban & Site | $500$ | Campus Masterplans & Site Development Plans |
| **1:1000** | Urban & Site | $1,000$ | Urban Block Plans, Zoning & Infrastructure |
| **1:1250** | Urban & Site | $1,250$ | Ordnance Survey & UK Location Context Plans |
| **1:2500** | Urban & Site | $2,500$ | Town Planning & Geographic Mapping |
| **1:5000** | Urban & Site | $5,000$ | Regional Planning & Municipal Overview Maps |
| **1:10000** | Regional | $10,000$ | Metropolitan Masterplans & Topographic Surveys |
| **1/16" = 1'-0"** | Imperial | $192$ | Large Facility Plans & Broad Elevation Schemes |
| **3/32" = 1'-0"** | Imperial | $128$ | Overall Building Floor Plans |
| **1/8" = 1'-0"** | Imperial | $96$ | Commercial Floor Plans & General Building Sections |
| **3/16" = 1'-0"** | Imperial | $64$ | Residential Floor Plans & Complex Sections |
| **1/4" = 1'-0"** | Imperial | $48$ | Standard US Residential Drafting Plan Scale |
| **3/8" = 1'-0"** | Imperial | $32$ | Core Room Layouts, Kitchens & Stair Plans |
| **1/2" = 1'-0"** | Imperial | $24$ | Enlarged Room Plans, Restroom Layouts & Elevations |
| **3/4" = 1'-0"** | Imperial | $16$ | Detailed Architectural Sections & Wall Assemblies |
| **1" = 1'-0"** | Imperial | $12$ | Construction Details & Cabinetry Joinery |
| **1-1/2" = 1'-0"** | Imperial | $8$ | Interior Millwork & Complex Assembly Details |
| **3" = 1'-0"** | Imperial | $4$ | Large Scale Threshold Details & Jamb Profiles |
| **Full Size (1"=1")** | Imperial | $1$ | Full-Scale Architectural Mockups & Door Hardware |

---

## 🛋️ Architectural Furniture & Fixtures Database (179 Items Across 9 Domains)

The studio contains **179 standard architectural pieces** across 9 domains with exact metric dimensions, imperial equivalents, and proportional paper dimensions computed across any scale ratio ($1:10$, $1:20$, $1:25$, $1:50$, $1:100$, $1:200$, $1/4"=1'$):

| Category | Typical Standard Pieces Included | Real-World Dimensions (Metric) | Imperial Equiv | Paper @ 1:50 |
| :--- | :--- | :---: | :---: | :---: |
| **Living & Lounge** (23) | 3-Seater Sofa, 2-Seater Loveseat, 4-Seater Large Sofa, L-Sectional, U-Sectional, Chesterfield, Chaise Lounge, Recliner, Wingback, Coffee Tables, Console, Bookshelf, Fireplace Hearth, Grand Piano | $220 \times 90 \times 85\text{ cm}$ | $7\text{'-}3" \times 2\text{'-}11"$ | $4.40 \times 1.80\text{ cm}$ |
| **Bedroom & Wardrobe** (20) | Super King ($200 \times 200$), King ($180 \times 200$), Queen ($150 \times 200$), Double ($135 \times 190$), Twin XL, Single/Twin, Bunk Bed, Trundle, Baby Crib, Toddler Bed, Nightstands, 2/3/4-Door Wardrobes, Sliding Wardrobes, Closet Island, Dressers, Vanity | $180 \times 200 \times 110\text{ cm}$ | $5\text{'-}11" \times 6\text{'-}7"$ | $3.60 \times 4.00\text{ cm}$ |
| **Dining & Bar** (18) | Bistro Tables (2P Square/Round), 4P/6P/8P/10P/12P Dining Tables (Square, Rectangular, Round, Oval), Dining Chairs, Carver Armchair, Bar Stools, Breakfast Nook Banquette, Sideboards, Credenza, Bar Cart | $160 \times 90 \times 75\text{ cm}$ | $5\text{'-}3" \times 2\text{'-}11"$ | $3.20 \times 1.80\text{ cm}$ |
| **Kitchen & Utility** (22) | Base Cabinets ($60/90\text{cm}$), Corner Lazy Susan, Kitchen Islands ($1.8\text{m}/2.4\text{m}$ with Prep Sink), Peninsula Bar, Tall Pantry, Oven/Microwave Tower, Single/Double/Apron Sinks, 4/5-Burner Cooktops, Range Cookers, French-Door Fridge, Dishwasher, Laundry Washer/Dryer | $180 \times 90 \times 90\text{ cm}$ | $5\text{'-}11" \times 2\text{'-}11"$ | $3.60 \times 1.80\text{ cm}$ |
| **Bathroom & Spa** (20) | Close-Coupled WC, Wall-Hung WC, Accessible ADA Toilet, Bidet, Wall Urinal with Partition, Cloakroom Basin, Pedestal Basin, Single/Double/Luxury Vanities ($60-160\text{cm}$), Inset/Oval/Corner Jacuzzi Tubs, Corner/Neo/Walk-In/ADA Roll-In Showers | $170 \times 70 \times 55\text{ cm}$ | $5\text{'-}7" \times 2\text{'-}4"$ | $3.40 \times 1.40\text{ cm}$ |
| **Office & Studio** (22) | Compact Desk, Standard Workstation ($1.4\text{m}$), Studio Desk ($1.6\text{m}$), Sit-Stand Electric Desk, Executive Desk, L/U-Shaped Executive Suites, Drafting Table, 2P/4P/6P Benching Pods, Reception Counter, Phone Booth, 8P/12P Conference Tables, Task/Exec Chairs, Filing, Server Rack | $140 \times 70 \times 75\text{ cm}$ | $4\text{'-}7" \times 2\text{'-}4"$ | $2.80 \times 1.40\text{ cm}$ |
| **Doors & Circulation** (22) | Interior Doors ($700/800\text{mm}$), Entrance Door ($900\text{mm}$), ADA Accessible Door ($1000\text{mm}$), French Doors ($1.6/1.8\text{m}$), Pocket Door, Sliding Patio Doors ($1.8/2.7\text{m}$), Bi-fold Glass Wall ($3.0\text{m}$), Casement/Picture/Sliding Windows, Straight/L/U/Spiral Stairs, Corridors, ADA Turning Circle ($1.5\text{m}$), Access Ramp, Elevator Shaft | $90 \times 10 \times 210\text{ cm}$ | $2\text{'-}11" \times 6\text{'-}11"$ | $1.80 \times 0.20\text{ cm}$ |
| **Outdoor & Patio** (16) | Patio Dining Sets, Terrace Chairs, Sun Loungers, Outdoor L-Sectional, Fire Pit Table, Cantilever Parasol ($\text{Ø}300\text{cm}$), BBQ Kitchen Station, Planter Boxes, Bicycle Racks, Motorcycle Bays, Compact/Standard/ADA Car Parking Bays, EV Charging Bay, Single Garage | $250 \times 500\text{ cm}$ | $8\text{'-}2" \times 16\text{'-}5"$ | $5.00 \times 10.00\text{ cm}$ |
| **Commercial & Gym** (16) | Restaurant 2P/4P Booths, Bar Service Counter with Taps, Retail Apparel Racks, POS Cashier Counter, Supermarket Conveyor, Gym Treadmills, Spin Bikes, Ellipticals, Olympic Bench Press, Multi-Gym Cable Stack, Hospital Patient Beds, Medical Clinic Exam Tables, Dental Operatory Chairs | $120 \times 180 \times 100\text{ cm}$ | $3\text{'-}11" \times 5\text{'-}11"$ | $2.40 \times 3.60\text{ cm}$ |

---

## 📏 Supported Measurement Units

### Length Units
* `mm` — Millimeters ($0.001\text{ m}$)
* `cm` — Centimeters ($0.01\text{ m}$)
* `dm` — Decimeters ($0.1\text{ m}$)
* `m` — Meters ($1.0\text{ m}$)
* `km` — Kilometers ($1000.0\text{ m}$)
* `in` — Inches ($0.0254\text{ m}$)
* `ft` — Decimal Feet ($0.3048\text{ m}$)
* `yd` — Yards ($0.9144\text{ m}$)
* `mi` — Statute Miles ($1609.344\text{ m}$)

### Area Units
* `mm²` — Square Millimeters
* `cm²` — Square Centimeters
* `m²` — Square Meters
* `ha` — Hectares ($10,000\text{ m}^2$)
* `km²` — Square Kilometers
* `sq in` — Square Inches
* `sq ft` — Square Feet
* `sq yd` — Square Yards
* `ac` — Acres ($4046.8564224\text{ m}^2$)

### Volume Units
* `cm³` — Cubic Centimeters
* `m³` — Cubic Meters
* `L` — Liters ($0.001\text{ m}^3$)
* `cu in` — Cubic Inches
* `cu ft` — Cubic Feet
* `cu yd` — Cubic Yards
* `gal` — US Liquid Gallons ($0.00378541\text{ m}^3$)

---

## 🧮 Mathematical Formulas & Contracts

All internal calculations convert input measurements to base SI units (**meters**, **square meters**, **cubic meters**) before applying scale factors:

### Linear Scale Conversion
$$\text{Real Dimension} = \text{Drawing Dimension} \times \text{Scale Ratio}$$
$$\text{Drawing Dimension} = \frac{\text{Real Dimension}}{\text{Scale Ratio}}$$

### Drawing Rescaling (Scale A ➔ Scale B)
$$\text{Target Dimension} = \text{Original Dimension} \times \left( \frac{\text{Scale Ratio}_A}{\text{Scale Ratio}_B} \right) \times \left( \frac{\text{UnitFactor}_A}{\text{UnitFactor}_B} \right)$$

### Scale Detector Formula
$$\text{Scale Ratio } X = \frac{\text{Real Dimension in Meters}}{\text{Paper Dimension in Meters}}$$

### Area Scaling
$$\text{Real Area} = \text{Drawing Area} \times \left( \text{Scale Ratio} \right)^2$$
$$\text{Drawing Area} = \frac{\text{Real Area}}{\left( \text{Scale Ratio} \right)^2}$$

### Volume Scaling
$$\text{Real Volume} = \text{Drawing Volume} \times \left( \text{Scale Ratio} \right)^3$$
$$\text{Drawing Volume} = \frac{\text{Real Volume}}{\left( \text{Scale Ratio} \right)^3}$$

### Triangle Area (Heron's Formula)
$$s = \frac{a + b + c}{2}, \quad \text{Area} = \sqrt{s(s - a)(s - b)(s - c)}$$

### Polygon Area (Shoelace Theorem)
$$\text{Area} = \frac{1}{2} \left| \sum_{i=1}^{n} (x_i y_{i+1} - x_{i+1} y_i) \right|$$

---

## 🎨 Visual Proportions, 2D Blueprint SVGs & Tactile Audio

* **Accurate 2D Blueprint Figures**: Top-down architectural plan drawings rendered dynamically for every item with cushions, basins, burners, door swings, and vehicle silhouettes.
* **Proportional Real-World Silhouettes**: Dynamic silhouettes comparing real site dimensions against familiar objects (Pen, Ergonomic Chair, Workstation, Standing Human, Car, Suburban House, 5-Story Building, Skyscraper Tower, City Block).
* **Graphic Architectural Scale Bar**: Proportional graphic scale bar rendered dynamically for the active ratio.
* **Tactile Mechanical Audio**: Pure Web Audio API synthesized mechanical switch click feedback on conversions, resets, and preset changes.
* **Three Professional Themes**:
  - **Studio Dark** (Default): Slate graphite palette with technical cyan accents.
  - **Drafting Paper**: High-contrast warm drafting vellum paper with terracotta drafting accents.
  - **Blueprint Cyan**: Deep royal drafting blueprint blue with luminescent cyan line work.
* **Borders on All Buttons**: Tactile 1.5px / 2px borders with illuminated hover and active states on all buttons and controls.

---

## 💾 Calculation History & Export

* **Persistent History**: Stores conversion records in LocalStorage with sandboxed in-memory fallback.
* **One-Click Clipboard Copying**: Copies clean, formatted values ready for specification notes and CAD text blocks.
* **CSV Export**: Clean spreadsheet format (`Timestamp, Mode, Scale, Input, Output, Notes`).
* **Markdown Export**: Formatted GitHub-compatible tables for design journals and project documentation.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Open **Architect's Global Command Palette** |
| <kbd>Enter</kbd> | Run Calculation for active tool / Execute command |
| <kbd>S</kbd> | Swap Conversion Direction (Drawing ↔ Real World) |
| <kbd>1</kbd> | Switch to **Scale Converter** (Mode 1) |
| <kbd>2</kbd> | Switch to **Rescaler (Scale A ➔ B)** (Mode 2) |
| <kbd>3</kbd> | Switch to **Scale Finder / Detector** (Mode 3) |
| <kbd>4</kbd> | Switch to **Area & Volume Scaler** (Mode 4) |
| <kbd>5</kbd> | Switch to **Furniture Scales & Standards** (Mode 5) |
| <kbd>6</kbd> | Switch to **Reference Chart Sheet** (Mode 6) |
| <kbd>7</kbd> | Switch to **Dimension Workspace** (Mode 7) |
| <kbd>8</kbd> | Switch to **Dimension Expression** (Mode 8) |
| <kbd>9</kbd> | Switch to **Multi-Scale Comparison** (Mode 9) |
| <kbd>0</kbd> | Switch to **Dimension Chains** (Mode 10) |
| <kbd>C</kbd> / <kbd>Ctrl+Shift+C</kbd> | Switch to **CAD Clipboard** (Mode 11) |
| <kbd>B</kbd> | Switch to **Batch CAD Converter** (Mode 12) |
| Command Palette (<kbd>Ctrl+K</kbd> → "CAD Handoff") / 🚀 **Send to CAD** buttons | Open **CAD Handoff** (Mode 13) — deliberately has no single-letter shortcut to avoid conflicts; reachable from Modes 7–12, Quick Dimension Strip, and the palette |
| <kbd>Q</kbd> | Toggle **Quick Dimension Strip** (Micro-Tool) |
| <kbd>H</kbd> | Toggle Calculation History Drawer |
| <kbd>?</kbd> | Open Keyboard Shortcuts Modal |
| <kbd>Esc</kbd> | Close Palette / Modal / Quick Strip / Drawer / Unfocus |

---

## 💻 How to Run, Build & Test

### 1. Instant Local Launch (100% Offline)
Simply double-click `index.html` or open it with any web browser (Chrome, Edge, Safari, Firefox, Opera, Brave).

### 2. Local HTTP Server
```bash
# Using Node.js (Serves on port 3500)
npm start

# Or using Python
python -m http.server 3500
```

### 3. Run Automated Test Suite
```bash
npm test
# Executes all 32 test suites (2,544 assertions, 100% passing).
# The runner emits the authoritative total assertion count on completion.
```

### 4. Build Standalone Bundle
```bash
npm run build
# Compiles src/ into standalone js/app.js deterministically.
# The manifest (BUNDLE_MODULES in scripts/build.js) must list every src/ module
# in dependency order — enforced by tests/build-integrity.test.js.
```

### 5. Verify Bundle Synchronization
```bash
node scripts/build.js --check
# Asserts that js/app.js is 100% in sync with src/
```

### 6. Build Integrity Verification (automatic, part of `npm test`)
`tests/build-integrity.test.js` guards the bundle pipeline in three layers:
1. **Manifest coverage** — every `src/**/*.js` runtime module must be registered
   in `BUNDLE_MODULES` (or the documented `NON_RUNTIME_MODULES` allowlist),
   exactly once, in dependency-first order.
2. **Bundle content** — the generated `js/app.js` must contain the distinctive
   definitions of every module (not merely be valid syntax), and must be
   byte-identical to a fresh regeneration.
3. **Runtime smoke test** — the bundle executes end-to-end against a minimal
   mocked browser environment and boots without unresolved references.

---

## 🔮 Future Roadmap

* **Status (September 3, 2026)**: Phases 1–13 are complete — Universal Export Center, Project Workspace, Plan Canvas, Architectural Entities, Space Planning, Survey/Calibration, Annotations, AI Foundation (provider abstraction, tool registry, facts pack, orchestrator, 7 specialist modes), and the Visual AI capability layer. P14 final hardening is complete (see ARCHITECTURE_AUDIT.md §7).
* **AI transports not yet implemented (by design)**: the provider abstraction and key store are ready for real Gemini/GLM fetch transports in `src/services/`, but none exist yet — the app makes no network calls and is fully usable without AI. The Free AI requirement (no hidden keys, no paid fallback, no anonymous requests) is enforced by construction: no network code exists in the repository.
* **AI proposal UI not yet surfaced**: the store's apply/undo/notify flow exists and is tested, but no UI panel exposes AI proposals yet.
* **Survey/Calibration/Annotations UI not yet surfaced**: the three cores (`src/core/survey.js`, `annotations.js`) are tested pure modules; dedicated modes are future work.
* **Phase 3 (legacy numbering): Extended Architectural Geometry**:
  - Wall thickness offset and clearance envelope calculator — partially covered by the space-planning core (`checkClearance`, wall footprints in `wallRect`); advanced envelope tools remain future work.
* **Phase 4 (legacy numbering): Stair & Ramp Compliance Suite**:
  - ✅ **Stair Calculator** (Mode 14) — implemented; see STAIRS.md.
  - ✅ **Ramp Calculator** (Mode 15) — implemented; see RAMPS.md.
  - ✅ **Slope Analyzer** (Mode 16) — implemented; see SLOPES.md.
  - Landing/switchback configurations remain future work.
* **Phase 5 (legacy numbering): CAD Vector Exports**:
  - ✅ **SVG & DXF vector export** — implemented in the Universal Export Center (Mode 17): SVG (chains, stairs, ramps, slopes, plan canvas) and DXF R12 subset (chain segments, room outlines, plan geometry) through `src/core/export/export-model.js`.
* **Note on Part 9 (CAD Handoff)**: Completed as clipboard workflow profiles (Mode 13). Direct AutoCAD / Rhino / SketchUp API or plugin integration remains out of scope by design.

---

*Architecture Helping Hand • Built for Architects, Designers & Engineers • High-Precision Scaling Engine*
