# Architecture Helping Hand 📐🏛️

> **Professional Architectural Scale, Furniture Sizing & Multi-Unit Calculation Studio**  
> *A high-precision, zero-dependency, tactile architectural conversion tool built for architects, interior designers, urban planners, physical model makers, and design students.*

[![Tests](https://img.shields.io/badge/Tests-189%20Passed%20(100%25)-38bdf8?style=flat-square&logo=node.js)](tests/)
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
   - [5. Furniture Scales & Fixtures Catalog (with Live Search)](#5-furniture-scales--fixtures-catalog-with-live-search)
   - [6. Multi-Length Architectural Reference Sheet](#6-multi-length-architectural-reference-sheet)
5. [📐 Architectural Scale Presets (All 28 Presets)](#-architectural-scale-presets-all-28-presets)
6. [🛋️ Architectural Furniture & Fixtures Database (61 Items)](#️-architectural-furniture--fixtures-database-61-items)
7. [📏 Supported Measurement Units](#-supported-measurement-units)
8. [🧮 Mathematical Formulas & Contracts](#-mathematical-formulas--contracts)
9. [🎨 Visual Proportions & Tactile Audio](#-visual-proportions--tactile-audio)
10. [💾 Calculation History & Export](#-calculation-history--export)
11. [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
12. [💻 How to Run, Build & Test](#-how-to-run-build--test)
13. [🔮 Future Roadmap](#-future-roadmap)

---

## 🎯 Why Architecture Helping Hand Was Created

### The Architectural Problem
Architects, interior designers, urbanists, and physical model makers constantly translate dimensions between **real-world site measurements** (meters, feet, kilometers) and **physical drawing/model sheets** (millimeters, centimeters, inches).

Manual scale calculations often cause:
* **Costly Site & Millwork Errors**: Misinterpreting drawing units leads to fabricated cabinetry or partitions that do not fit.
* **Redrawing & Rescaling Friction**: Moving a scheme from a $1:50$ general arrangement plan to a $1:200$ site plan requires recalculating every drawn line.
* **Unlabelled Drawings**: Working with imported PDF scans or historical blueprints with missing scale bars leaves architects guessing the scale.
* **Furniture Placement Uncertainties**: Hand-drafting and CAD block sizing require looking up standard clearances and real-world dimensions across multiple reference manuals.

### The Solution: Architecture Helping Hand
**Architecture Helping Hand** eliminates manual calculation errors by providing a unified, tactile, mathematically verified studio that runs 100% client-side with **zero external dependencies**. It parses fractions (`3 1/2`), feet-inches (`12'-6 1/2"`), scales areas ($S^2$) and volumes ($S^3$), detects unknown scales, and provides an instant searchable database of 61 architectural furniture standards.

---

## 🚀 What Has Been Done Until Now (Development History)

The codebase has evolved through rigorous engineering, auditing, and hardening phases:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DEVELOPMENT TIMELINE & PHASES                          │
└─────────────────────────────────────────────────────────────────────────────────┘
  Phase 0      • Initial MVP with Bidirectional Converter & Rescaler
               • Cozy Studio Dark (default), Drafting Paper & Blueprint themes
               • Web Audio API synthesized mechanical tactile clicks
               • Visual proportional silhouette comparison & graphic scale bar
               ─────────────────────────────────────────────────────────────
  Phase 0.5    • Added Dedicated Furniture Scaling Catalog with 61 items
               • Instant keystroke search bar & dynamic category filters
               • Scaled 2D plan blueprint previews & custom dimension scaler
               ─────────────────────────────────────────────────────────────
  Phase 1.0    • Baseline Git Repository established on GitHub
               • Comprehensive 24-point codebase audit (ARCHITECTURE_AUDIT.md)
               • Refactored into a strict 3-tier modular architecture (src/core, src/services, src/ui)
               • Built pure-Node zero-dependency bundler (scripts/build.js)
               ─────────────────────────────────────────────────────────────
  Phase 1.5    • Architecture Verification & Hardening
               • Implemented strict requireUnit validation (no silent fallbacks)
               • Added multi-suite automated test framework in tests/
               • Fixed architectural hyphen separator parsing bug (12'-6 1/2")
               ─────────────────────────────────────────────────────────────
  Phase 1.75   • Foundation Freeze & Engineering Rules established (ENGINEERING_RULES.md)
               • Verified deterministic build synchronization (scripts/build.js --check)
               • Hardened input parser against malformed fractions & trailing letters
               ─────────────────────────────────────────────────────────────
  Phase 1.9    • Final Core Contract Hardening
               • Implemented requireFiniteNumber to reject non-numeric types & strings
               • Updated detectScale to return ratio: null on invalid dimensions
               • Verified architectural geometry readiness (FUTURE_ARCHITECTURE.md)
               • Reached 149 exact automated test assertions with 100% pass rate
```

---

## 🌐 What This Project Does on GitHub

This repository serves as:
1. **An Open-Source Reference Tool**: An accessible, zero-friction architectural scaling studio for professionals, students, and educators.
2. **Zero-Dependency Architecture**: No React, no bundler frameworks, no `node_modules` runtime requirements. Anyone can double-click `index.html` and use it immediately offline via `file:///`.
3. **A Reliable Mathematical Core**: High-integrity domain calculations in `src/core/` verified by **149 automated test assertions**.
4. **An Extensible Platform**: Prepared for future architectural geometry engines, CAD vector exports (SVG/DXF), and stair/ramp calculations.

---

## 🛠️ Core Tools & Capabilities

### 1. Bidirectional Scale Converter (Drawing ↔ Real World)
* **Drawing $\rightarrow$ Real World**: Convert drawing measurements (e.g. `15 cm` at `1:50`) $\rightarrow$ real world (`7.5 m` / `24'-7 1/4"`).
* **Real World $\rightarrow$ Drawing**: Convert real dimensions (e.g. `12.0 m` at `1:100`) $\rightarrow$ paper drawing length (`12.0 cm` / `120 mm`).
* **Direction Swap (<kbd>S</kbd>)**: Instant animated toggle with acoustic feedback.
* **Flexible Parsing**: Accepts decimals (`12.5`), fractions (`3 1/2`, `5/8`), attached units (`15.5cm`, `2.4m`, `12in`, `6ft`), and architectural notations (`12'-6 1/2"`).
* **Parallel Equivalents**: Real-time breakdown across Metric (`mm`, `cm`, `dm`, `m`, `km`) and Imperial (`in`, `ft`, `ft-in`, `yd`, `mi`).

### 2. Rescaler (Sheet Scale A ➔ Sheet Scale B)
* Recalculates drawing lengths when redrawing plans between different sheet scales (e.g., `12 cm` at `1:50` $\rightarrow$ `3.0 cm` at `1:200`).
* Displays magnification/reduction percentages (e.g., `25.0% - Reduction`).

### 3. Scale Finder & Detector
* Determines the exact scale of unlabelled drawings or scanned plans from measured paper distance and known real-world length (e.g. `4.5 cm` paper vs `9.0 m` real $\rightarrow$ detects `1:200`).
* Identifies the closest standard architectural preset with percentage deviation.
* Includes one-click **"Apply Scale to Converter"** button.

### 4. Area (S²) & Volume (S³) Scaler
* **Area Scaling ($S^2$)**: Exponential scaling for floor plans, room zoning, and plot boundaries ($\text{cm}^2 \leftrightarrow \text{m}^2$, $\text{sq ft}$, $\text{ha}$, $\text{acres}$).
* **Volume Scaling ($S^3$)**: Computes 3D massing, foam model block volumes, and concrete structural volumes ($\text{cm}^3 \leftrightarrow \text{m}^3$, $\text{liters}$, $\text{cu ft}$).

### 5. Furniture Scales & Fixtures Catalog (with Live Search)
* **61 Architectural Furniture & Fixture Records**: Across Living, Bedroom, Dining, Kitchen, Bathroom, Office, and Doors/Clearances.
* **Real-Time Search Bar**: Instant keystroke filtering by keyword (e.g. `sofa`, `king bed`, `sink`, `door`, `desk`, `toilet`).
* **Dynamic Scale Bar**: Scale all furniture dimensions simultaneously across `1:10`, `1:20`, `1:25`, `1:50`, `1:100`, `1/4"=1'`, or custom ratios with paper unit toggle (`cm`, `mm`, `in`).
* **2D Top-Down Blueprint Visualizations**: Scaled vector diagrams showing layout proportions and clearance footprints.
* **Custom Dimension Scaler**: Input custom $W \times D \times H$ to get exact paper drawing dimensions immediately.

### 6. Multi-Length Architectural Reference Sheet
* Print-ready reference table showing common drafting lengths (`0.1cm`, `0.5cm`, `1cm`, `2cm`, `5cm`, `10cm`, `20cm`, `50cm`, `100cm`) converted to real metric and imperial dimensions at the active scale.
* One-click **"Print Reference Sheet"** formatted for studio drafting boards.

---

## 📐 Architectural Scale Presets (All 28 Presets)

| Scale ID | Category | Ratio | Description & Standard Usage |
| :--- | :--- | :---: | :--- |
| **1:1** | Metric Detail | 1 | Full size, 1:1 physical prototypes & joinery mockups |
| **1:2** | Metric Detail | 2 | Half size, large architectural details & fixtures |
| **1:5** | Metric Detail | 5 | Construction details, joinery, assemblies |
| **1:10** | Metric Detail | 10 | Cabinetry, custom millwork, interior details |
| **1:20** | Metric Detail | 20 | Room layouts, enlarged sections, interior elevations |
| **1:25** | Metric Detail | 25 | Structural bay layouts, detailed floor plans |
| **1:50** | Architectural | 50 | **Standard floor plans**, elevations, building sections |
| **1:100** | Architectural | 100 | **General building plans**, residential schemes, full elevations |
| **1:200** | Architectural | 200 | Large commercial plans, complex site layouts |
| **1:250** | Architectural | 250 | Intermediate site and zoning schemes |
| **1:500** | Urban / Site | 500 | Master plans, campus layouts, block context |
| **1:1000** | Urban / Site | 1000 | Neighborhood schemes, urban infrastructure |
| **1:1250** | Urban / Site | 1250 | Ordnance Survey site boundary plans |
| **1:2000** | Urban / Site | 2000 | District zoning and infrastructural layouts |
| **1:2500** | Urban / Site | 2500 | Town masterplanning, boundary surveys |
| **1:5000** | Urban / Site | 5000 | Regional zoning, topographic mapping |
| **1:10000** | Urban / Site | 10000 | Regional and metropolitan masterplanning |
| **1/16"=1'-0"** | Imperial | 192 | Large commercial buildings, site plans |
| **3/32"=1'-0"** | Imperial | 128 | Commercial architectural plans |
| **1/8"=1'-0"** | Imperial | 96 | Large residential, small commercial plans |
| **3/16"=1'-0"** | Imperial | 64 | Intermediate architectural drawings |
| **1/4"=1'-0"** | Imperial | 48 | **Standard US residential floor plans & elevations** |
| **3/8"=1'-0"** | Imperial | 32 | Kitchen & bath layout plans |
| **1/2"=1'-0"** | Imperial | 24 | Cabinetry, enlarged interior elevations |
| **3/4"=1'-0"** | Imperial | 16 | Wall sections, interior detail sheets |
| **1"=1'-0"** | Imperial | 12 | Complex details, stair sections |
| **1-1/2"=1'-0"**| Imperial | 8 | Window, door, and millwork details |
| **3"=1'-0"** | Imperial | 4 | Full architectural detail drawings |

---

## 🛋️ Architectural Furniture & Fixtures Database (61 Items)

| Category | Item Name | Real Dimensions ($W \times D \times H$) | Real Imperial | Scaled at 1:50 (Paper) |
| :--- | :--- | :--- | :--- | :--- |
| **Living** | 3-Seater Sofa | $220 \times 90 \times 85\text{ cm}$ | $7\text{'-}3" \times 2\text{'-}11"$ | $4.40 \times 1.80\text{ cm}$ |
| **Living** | 2-Seater Loveseat | $160 \times 90 \times 85\text{ cm}$ | $5\text{'-}3" \times 2\text{'-}11"$ | $3.20 \times 1.80\text{ cm}$ |
| **Living** | L-Shaped Sectional Sofa | $260 \times 160 \times 85\text{ cm}$ | $8\text{'-}6" \times 5\text{'-}3"$ | $5.20 \times 3.20\text{ cm}$ |
| **Living** | Armchair / Lounge Chair | $85 \times 85 \times 85\text{ cm}$ | $2\text{'-}9" \times 2\text{'-}9"$ | $1.70 \times 1.70\text{ cm}$ |
| **Living** | Recliner Chair | $90 \times 95 \times 100\text{ cm}$ | $2\text{'-}11" \times 3\text{'-}1"$ | $1.80 \times 1.90\text{ cm}$ |
| **Living** | Coffee Table (Rectangular) | $120 \times 60 \times 45\text{ cm}$ | $3\text{'-}11" \times 2\text{'-}0"$ | $2.40 \times 1.20\text{ cm}$ |
| **Living** | Coffee Table (Round Ø90) | $90 \times 90 \times 45\text{ cm}$ | $2\text{'-}11" \text{ dia}$ | $1.80 \times 1.80\text{ cm}$ |
| **Living** | Side / End Table | $50 \times 50 \times 55\text{ cm}$ | $1\text{'-}8" \times 1\text{'-}8"$ | $1.00 \times 1.00\text{ cm}$ |
| **Living** | TV Media Console | $180 \times 45 \times 50\text{ cm}$ | $5\text{'-}11" \times 1\text{'-}6"$ | $3.60 \times 0.90\text{ cm}$ |
| **Living** | Bookshelf Unit | $100 \times 35 \times 200\text{ cm}$ | $3\text{'-}3" \times 1\text{'-}2"$ | $2.00 \times 0.70\text{ cm}$ |
| **Bedroom**| King Bed (180×200) | $180 \times 200 \times 110\text{ cm}$ | $5\text{'-}11" \times 6\text{'-}7"$ | $3.60 \times 4.00\text{ cm}$ |
| **Bedroom**| Queen Bed (150×200) | $150 \times 200 \times 110\text{ cm}$ | $4\text{'-}11" \times 6\text{'-}7"$ | $3.00 \times 4.00\text{ cm}$ |
| **Bedroom**| Double / Full Bed | $135 \times 190 \times 100\text{ cm}$ | $4\text{'-}5" \times 6\text{'-}3"$ | $2.70 \times 3.80\text{ cm}$ |
| **Bedroom**| Single / Twin Bed | $90 \times 190 \times 90\text{ cm}$ | $2\text{'-}11" \times 6\text{'-}3"$ | $1.80 \times 3.80\text{ cm}$ |
| **Bedroom**| Bunk Bed | $90 \times 190 \times 165\text{ cm}$ | $2\text{'-}11" \times 6\text{'-}3"$ | $1.80 \times 3.80\text{ cm}$ |
| **Bedroom**| Nightstand / Bedside Table | $50 \times 40 \times 55\text{ cm}$ | $1\text{'-}8" \times 1\text{'-}4"$ | $1.00 \times 0.80\text{ cm}$ |
| **Bedroom**| Wardrobe (2-Door) | $120 \times 60 \times 210\text{ cm}$ | $3\text{'-}11" \times 2\text{'-}0"$ | $2.40 \times 1.20\text{ cm}$ |
| **Bedroom**| Wardrobe (3-Door) | $180 \times 60 \times 210\text{ cm}$ | $5\text{'-}11" \times 2\text{'-}0"$ | $3.60 \times 1.20\text{ cm}$ |
| **Bedroom**| Chest of Drawers / Dresser | $100 \times 50 \times 90\text{ cm}$ | $3\text{'-}3" \times 1\text{'-}8"$ | $2.00 \times 1.00\text{ cm}$ |
| **Bedroom**| Dressing Table & Mirror | $110 \times 45 \times 75\text{ cm}$ | $3\text{'-}7" \times 1\text{'-}6"$ | $2.20 \times 0.90\text{ cm}$ |
| **Dining** | 4-Person Table (Square) | $90 \times 90 \times 75\text{ cm}$ | $2\text{'-}11" \times 2\text{'-}11"$ | $1.80 \times 1.80\text{ cm}$ |
| **Dining** | 4-Person Table (Round Ø105) | $105 \times 105 \times 75\text{ cm}$ | $3\text{'-}5" \text{ dia}$ | $2.10 \times 2.10\text{ cm}$ |
| **Dining** | 6-Person Table (Rectangular)| $160 \times 90 \times 75\text{ cm}$ | $5\text{'-}3" \times 2\text{'-}11"$ | $3.20 \times 1.80\text{ cm}$ |
| **Dining** | 6-Person Table (Round Ø140) | $140 \times 140 \times 75\text{ cm}$ | $4\text{'-}7" \text{ dia}$ | $2.80 \times 2.80\text{ cm}$ |
| **Dining** | 8-Person Table | $220 \times 100 \times 75\text{ cm}$ | $7\text{'-}3" \times 3\text{'-}3"$ | $4.40 \times 2.00\text{ cm}$ |
| **Dining** | 10-Person Table | $280 \times 110 \times 75\text{ cm}$ | $9\text{'-}2" \times 3\text{'-}7"$ | $5.60 \times 2.20\text{ cm}$ |
| **Dining** | Dining Chair | $45 \times 50 \times 85\text{ cm}$ | $1\text{'-}6" \times 1\text{'-}8"$ | $0.90 \times 1.00\text{ cm}$ |
| **Dining** | Bar Stool | $40 \times 40 \times 95\text{ cm}$ | $1\text{'-}4" \times 1\text{'-}4"$ | $0.80 \times 0.80\text{ cm}$ |
| **Dining** | Sideboard / Credenza | $160 \times 45 \times 85\text{ cm}$ | $5\text{'-}3" \times 1\text{'-}6"$ | $3.20 \times 0.90\text{ cm}$ |
| **Kitchen** | Base Counter (60cm module)| $60 \times 60 \times 90\text{ cm}$ | $2\text{'-}0" \times 2\text{'-}0"$ | $1.20 \times 1.20\text{ cm}$ |
| **Kitchen** | Island with Breakfast Bar | $180 \times 90 \times 90\text{ cm}$ | $5\text{'-}11" \times 2\text{'-}11"$ | $3.60 \times 1.80\text{ cm}$ |
| **Kitchen** | Single Sink & Drainer | $85 \times 50 \times 20\text{ cm}$ | $2\text{'-}9" \times 1\text{'-}8"$ | $1.70 \times 1.00\text{ cm}$ |
| **Kitchen** | Double Bowl Sink | $100 \times 50 \times 20\text{ cm}$ | $3\text{'-}3" \times 1\text{'-}8"$ | $2.00 \times 1.00\text{ cm}$ |
| **Kitchen** | 4-Burner Cooktop | $60 \times 60 \times 10\text{ cm}$ | $2\text{'-}0" \times 2\text{'-}0"$ | $1.20 \times 1.20\text{ cm}$ |
| **Kitchen** | 5-Burner Wide Cooktop | $90 \times 60 \times 10\text{ cm}$ | $2\text{'-}11" \times 2\text{'-}0"$ | $1.80 \times 1.20\text{ cm}$ |
| **Kitchen** | Single Refrigerator | $70 \times 70 \times 180\text{ cm}$ | $2\text{'-}4" \times 2\text{'-}4"$ | $1.40 \times 1.40\text{ cm}$ |
| **Kitchen** | French-Door Refrigerator | $90 \times 80 \times 185\text{ cm}$ | $2\text{'-}11" \times 2\text{'-}7"$ | $1.80 \times 1.60\text{ cm}$ |
| **Kitchen** | Dishwasher | $60 \times 60 \times 85\text{ cm}$ | $2\text{'-}0" \times 2\text{'-}0"$ | $1.20 \times 1.20\text{ cm}$ |
| **Kitchen** | Washing Machine / Dryer | $60 \times 60 \times 85\text{ cm}$ | $2\text{'-}0" \times 2\text{'-}0"$ | $1.20 \times 1.20\text{ cm}$ |
| **Bathroom**| Standard Toilet (WC) | $40 \times 70 \times 75\text{ cm}$ | $1\text{'-}4" \times 2\text{'-}4"$ | $0.80 \times 1.40\text{ cm}$ |
| **Bathroom**| Wall-Hung Toilet | $38 \times 55 \times 40\text{ cm}$ | $1\text{'-}3" \times 1\text{'-}10"$ | $0.76 \times 1.10\text{ cm}$ |
| **Bathroom**| Single Basin Vanity | $60 \times 48 \times 85\text{ cm}$ | $2\text{'-}0" \times 1\text{'-}7"$ | $1.20 \times 0.96\text{ cm}$ |
| **Bathroom**| Double Basin Vanity | $120 \times 52 \times 85\text{ cm}$ | $3\text{'-}11" \times 1\text{'-}8"$ | $2.40 \times 1.04\text{ cm}$ |
| **Bathroom**| Standard Inset Bathtub | $170 \times 75 \times 55\text{ cm}$ | $5\text{'-}7" \times 2\text{'-}6"$ | $3.40 \times 1.50\text{ cm}$ |
| **Bathroom**| Freestanding Oval Tub | $180 \times 80 \times 60\text{ cm}$ | $5\text{'-}11" \times 2\text{'-}7"$ | $3.60 \times 1.60\text{ cm}$ |
| **Bathroom**| Corner Shower Enclosure | $90 \times 90 \times 200\text{ cm}$ | $2\text{'-}11" \times 2\text{'-}11"$ | $1.80 \times 1.80\text{ cm}$ |
| **Bathroom**| Walk-In Wetroom Shower | $120 \times 90 \times 200\text{ cm}$ | $3\text{'-}11" \times 2\text{'-}11"$ | $2.40 \times 1.80\text{ cm}$ |
| **Bathroom**| Bathroom Bidet | $38 \times 55 \times 40\text{ cm}$ | $1\text{'-}3" \times 1\text{'-}10"$ | $0.76 \times 1.10\text{ cm}$ |
| **Office** | Standard Workstation Desk | $140 \times 70 \times 75\text{ cm}$ | $4\text{'-}7" \times 2\text{'-}4"$ | $2.80 \times 1.40\text{ cm}$ |
| **Office** | Executive Director Desk | $180 \times 90 \times 75\text{ cm}$ | $5\text{'-}11" \times 2\text{'-}11"$ | $3.60 \times 1.80\text{ cm}$ |
| **Office** | L-Shaped Corner Desk | $160 \times 160 \times 75\text{ cm}$ | $5\text{'-}3" \times 5\text{'-}3"$ | $3.20 \times 3.20\text{ cm}$ |
| **Office** | Ergonomic Task Chair | $65 \times 65 \times 95\text{ cm}$ | $2\text{'-}2" \times 2\text{'-}2"$ | $1.30 \times 1.30\text{ cm}$ |
| **Office** | 8-Person Conference Table | $240 \times 110 \times 75\text{ cm}$ | $7\text{'-}10" \times 3\text{'-}7"$ | $4.80 \times 2.20\text{ cm}$ |
| **Office** | 12-Person Conference Table | $360 \times 120 \times 75\text{ cm}$ | $11\text{'-}10" \times 3\text{'-}11"$ | $7.20 \times 2.40\text{ cm}$ |
| **Office** | Filing Cabinet (4-Drawer) | $45 \times 60 \times 130\text{ cm}$ | $1\text{'-}6" \times 2\text{'-}0"$ | $0.90 \times 1.20\text{ cm}$ |
| **Doors** | Interior Door (800mm) | $80 \times 10 \times 210\text{ cm}$ | $2\text{'-}8" \times 6\text{'-}11"$ | $1.60 \times 0.20\text{ cm}$ |
| **Doors** | Main Entrance Door (900mm)| $90 \times 10 \times 210\text{ cm}$ | $2\text{'-}11" \times 6\text{'-}11"$ | $1.80 \times 0.20\text{ cm}$ |
| **Doors** | Double French Doors (1600mm)| $160 \times 10 \times 210\text{ cm}$ | $5\text{'-}3" \times 6\text{'-}11"$ | $3.20 \times 0.20\text{ cm}$ |
| **Doors** | Sliding Patio Door (1800mm)| $180 \times 12 \times 210\text{ cm}$ | $5\text{'-}11" \times 6\text{'-}11"$ | $3.60 \times 0.24\text{ cm}$ |
| **Doors** | Standard Walkway Clearance | $90 \times 90\text{ cm min}$ | $2\text{'-}11" \text{ min}$ | $1.80 \times 1.80\text{ cm}$ |
| **Doors** | Accessible Corridor (ADA) | $120 \times 120\text{ cm min}$| $3\text{'-}11" \text{ min}$ | $2.40 \times 2.40\text{ cm}$ |

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
* `ft-in` — Architectural Notation ($X'\text{-}Y\text{ }Z/16"$)
* `yd` — Yards ($0.9144\text{ m}$)
* `mi` — Miles ($1609.344\text{ m}$)

### Area Units
* `mm²` — Square Millimeters ($10^{-6}\text{ m}^2$)
* `cm²` — Square Centimeters ($10^{-4}\text{ m}^2$)
* `m²` — Square Meters ($1.0\text{ m}^2$)
* `km²` — Square Kilometers ($10^6\text{ m}^2$)
* `ha` — Hectares ($10,000\text{ m}^2$)
* `sq in` — Square Inches ($0.00064516\text{ m}^2$)
* `sq ft` — Square Feet ($0.09290304\text{ m}^2$)
* `sq yd` — Square Yards ($0.83612736\text{ m}^2$)
* `ac` — Acres ($4046.8564\text{ m}^2$)

### Volume Units
* `mm³` — Cubic Millimeters ($10^{-9}\text{ m}^3$)
* `cm³` — Cubic Centimeters / cc ($10^{-6}\text{ m}^3$)
* `m³` — Cubic Meters ($1.0\text{ m}^3$)
* `L` — Liters ($0.001\text{ m}^3$)
* `cu in` — Cubic Inches ($1.6387 \times 10^{-5}\text{ m}^3$)
* `cu ft` — Cubic Feet ($0.0283168\text{ m}^3$)
* `cu yd` — Cubic Yards ($0.764554\text{ m}^3$)

---

## 🧮 Mathematical Formulas & Contracts

1. **Drawing to Real-World Dimension:**
   $$\text{Real Meters} = (\text{Drawing Value} \times \text{Input Unit Factor}) \times \text{Scale Ratio}$$
   $$\text{Output Value} = \frac{\text{Real Meters}}{\text{Target Unit Factor}}$$

2. **Real-World to Drawing Dimension:**
   $$\text{Drawing Meters} = \frac{\text{Real Value} \times \text{Input Unit Factor}}{\text{Scale Ratio}}$$
   $$\text{Output Value} = \frac{\text{Drawing Meters}}{\text{Target Unit Factor}}$$

3. **Scale Rescaling Magnification ($A \rightarrow B$):**
   $$\text{Target Drawing Value} = \text{Original Value} \times \left( \frac{\text{Ratio}_A}{\text{Ratio}_B} \right) \times \left(\frac{\text{Factor}_A}{\text{Factor}_B}\right)$$

4. **Scale Ratio Detection:**
   $$\text{Scale Ratio} = \frac{\text{Real Measurement (in meters)}}{\text{Paper Measurement (in meters)}}$$

5. **Area Scaling ($S^2$):**
   $$\text{Real Area} = \text{Drawing Area} \times (\text{Scale Ratio})^2$$

6. **3D Volume Scaling ($S^3$):**
   $$\text{Real Volume} = \text{Drawing Volume} \times (\text{Scale Ratio})^3$$

---

## 🎨 Visual Proportions & Tactile Audio

### 3 Handcrafted Themes
* 📐 **Studio Dark (Default)**: Deep graphite slate (`#0d1117`), technical blueprint cyan accents (`#38bdf8`), and high-contrast numbers for extended drafting sessions.
* 📜 **Drafting Paper**: Warm architectural parchment (`#f6f3eb`), sepia tones, pencil charcoal text (`#1e2229`), and bronze borders.
* 🟦 **Blueprint Cyan**: Classic cyanotype blueprint aesthetic (`#0a2540`), stark white drafting outlines, and electric cyan accents.

### Synthesized Web Audio Engine
* Built-in zero-asset audio synthesizer using HTML5 Web Audio API:
  * Gentle mechanical keystroke clicks on numeric changes.
  * Soft pitch slide on direction swap (<kbd>S</kbd>).
  * Harmonized tri-tone chime on clipboard copy.
  * Completely toggleable and persistent in storage.

---

## 💾 Calculation History & Export

* **Automatic Logging**: Every calculation is logged with timestamp, mode, input, ratio, and output.
* **Export CSV**: Generates a standard `.csv` spreadsheet ready for Excel, Google Sheets, or BIM schedule logs.
* **Export Markdown**: Formats calculation logs into a GitHub Flavored Markdown table for project documentation.
* **Resilient Persistence**: Safe storage layer with memory fallback.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>S</kbd> | Swap Conversion Direction (Drawing ↔ Real World) |
| <kbd>1</kbd> | Switch to **Scale Converter** |
| <kbd>2</kbd> | Switch to **Rescaler (Scale A ➔ B)** |
| <kbd>3</kbd> | Switch to **Scale Finder / Detector** |
| <kbd>4</kbd> | Switch to **Area & Volume Scaler** |
| <kbd>5</kbd> | Switch to **Furniture Scales & Search** |
| <kbd>6</kbd> | Switch to **Reference Chart Sheet** |
| <kbd>H</kbd> | Toggle Calculation History Drawer |
| <kbd>?</kbd> | Open Keyboard Shortcuts Modal |
| <kbd>Esc</kbd> | Close Modal / Drawer / Unfocus Inputs |

---

## 💻 How to Run, Build & Test

### 1. Instant Local Launch (Offline)
Simply double-click `index.html` or open it with any web browser (Chrome, Edge, Safari, Firefox, Opera, Brave).

### 2. Local HTTP Server (Optional)
```bash
# Using Node.js
npm start

# Or using Python
python -m http.server 3000
```

### 3. Run Automated Tests
```bash
npm test
# Executes all 7 test suites (149 assertions)
```

### 4. Build Standalone Bundle
```bash
npm run build
# Compiles src/ into js/app.js deterministically
```

### 5. Verify Bundle Synchronization
```bash
node scripts/build.js --check
# Asserts that js/app.js is 100% in sync with src/
```

---

## 🔮 Future Roadmap

* **Phase 2: Custom User Presets & CAD Vector Exports**:
  - Custom drawing scale creator with LocalStorage persistence.
  - Bespoke furniture dimension creator and organizer.
  - Scaled SVG & DXF vector block export for AutoCAD, Rhino, Illustrator, and laser cutters.
* **Phase 3: Architectural Geometry & Stair/Ramp Suite**:
  - Blondel's rule stair riser/tread calculator ($2R + T \approx 63\text{cm}$).
  - ADA ramp slope & gradient calculator.
  - 2D perimeter, area, and polygon massing tools.

---

*Architecture Helping Hand • Built for Architects, Designers & Engineers • High-Precision Scaling Engine*
