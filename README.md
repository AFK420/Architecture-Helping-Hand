# Architecture Helping Hand 📐🏛️

> **Professional Architectural Scale, Furniture Sizing & Multi-Unit Calculation Studio**  
> *A high-precision, zero-dependency, tactile architectural conversion studio built for architects, interior designers, urban planners, physical model makers, and design students.*

[![Tests](https://img.shields.io/badge/Tests-299%20Passed%20(100%25)-38bdf8?style=flat-square&logo=node.js)](tests/)
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
3. **A Reliable Mathematical Core**: High-integrity domain calculations in `src/core/` verified by **299 automated test assertions across 9 test suites**.
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
| <kbd>1</kbd> | Switch to **Scale Converter** |
| <kbd>2</kbd> | Switch to **Rescaler (Scale A ➔ B)** |
| <kbd>3</kbd> | Switch to **Scale Finder / Detector** |
| <kbd>4</kbd> | Switch to **Area & Volume Scaler** |
| <kbd>5</kbd> | Switch to **Furniture Scales & Standards** |
| <kbd>6</kbd> | Switch to **Reference Chart Sheet** |
| <kbd>H</kbd> | Toggle Calculation History Drawer |
| <kbd>?</kbd> | Open Keyboard Shortcuts Modal |
| <kbd>Esc</kbd> | Close Palette / Modal / Drawer / Unfocus Inputs |

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
# Executes all 9 test suites (299 exact assertions, 100% passing)
```

### 4. Build Standalone Bundle
```bash
npm run build
# Compiles src/ into standalone js/app.js deterministically
```

### 5. Verify Bundle Synchronization
```bash
node scripts/build.js --check
# Asserts that js/app.js is 100% in sync with src/
```

---

## 🔮 Future Roadmap

* **Phase 3: Extended Architectural Geometry & Room Area Engine**:
  - Multi-room space planning & net-to-gross area scheduler.
  - Wall thickness offset and clearance envelope calculator.
* **Phase 4: Stair & Ramp Compliance Suite**:
  - Blondel's rule stair riser/tread calculator ($2R + T \approx 63\text{cm}$).
  - ADA ramp slope & gradient calculator with intermediate landing requirements.
* **Phase 5: CAD Vector Exports**:
  - Scaled SVG & DXF vector block export for AutoCAD, Rhino, Illustrator, and laser cutters.

---

*Architecture Helping Hand • Built for Architects, Designers & Engineers • High-Precision Scaling Engine*
