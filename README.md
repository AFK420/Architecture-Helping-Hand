# Architecture Helping Hand 📐🏛️

**Architecture Helping Hand** is a modern, high-precision architectural scaling studio, furniture dimensioning reference, and multi-unit conversion suite designed for architects, interior designers, urban planners, physical model makers, civil engineers, and design students.

---

## 📑 Table of Contents
1. [Overview & Philosophy](#-overview--philosophy)
2. [User Interface & Layout Architecture](#-user-interface--layout-architecture)
3. [Core Tools & Calculation Modes](#-core-tools--calculation-modes)
   - [Mode 1: Scale Converter (Drawing ↔ Real World)](#1-scale-converter-drawing--real-world)
   - [Mode 2: Rescaler (Sheet Scale A ➔ Sheet Scale B)](#2-rescaler-sheet-scale-a--sheet-scale-b)
   - [Mode 3: Scale Finder & Detector](#3-scale-finder--detector)
   - [Mode 4: Area (S²) & Volume (S³) Scaler](#4-area-s²--volume-s³-scaler)
   - [Mode 5: Furniture Scales & Fixtures Catalog](#5-furniture-scales--fixtures-catalog)
   - [Mode 6: Multi-Length Reference Chart](#6-multi-length-reference-chart)
4. [Complete Architectural Scale Presets](#-complete-architectural-scale-presets)
5. [Complete Furniture & Fixtures Database (40+ Items)](#-complete-furniture--fixtures-database)
6. [Supported Measurement Units](#-supported-measurement-units)
7. [Mathematical Formulas & Engine](#-mathematical-formulas--engine)
8. [Themes & Tactile Acoustic Feedback](#-themes--tactile-acoustic-feedback)
9. [Calculation History & Export System](#-calculation-history--export-system)
10. [Keyboard Shortcuts](#-keyboard-shortcuts)
11. [How to Run & Technical Architecture](#-how-to-run--technical-architecture)

---

## 🌟 Overview & Philosophy
Scaling errors on architectural drawings cause costly delays in construction, incorrect millwork fabrication, and distorted physical models. **Architecture Helping Hand** eliminates manual calculation mistakes by providing instant, two-way, mathematically verified scaling across all international metric and imperial standards with a cozy drafting interface.

---

## 🖥️ User Interface & Layout Architecture

### 1. Application Header Bar
- **Brand Title**: `Architecture Helping Hand` with technical studio badge.
- **Theme Dropdown**: Quick selector between **📐 Studio Dark (Default)**, **📜 Drafting Paper**, and **🟦 Blueprint Cyan**.
- **Tactile Sound Toggle**: One-click enable/mute button for synthesized mechanical keystroke and click sounds.
- **History Drawer Toggle (<kbd>H</kbd>)**: Opens the sliding calculation log side panel.
- **Shortcuts Guide Modal (<kbd>?</kbd>)**: Interactive reference sheet for fast workflow shortcuts.

### 2. Navigation Tabs Bar
6 dedicated tool modes with quick numeric switching (<kbd>1</kbd> through <kbd>6</kbd>):
1. `Scale Converter`
2. `Rescaler (A ➔ B)`
3. `Scale Finder`
4. `Area & Volume`
5. `Furniture Scales`
6. `Reference Chart`

### 3. Drafting Visual Feedback
- **Live Visual Scale Bar**: Precision graphic scale bar generated dynamically based on active scale.
- **Context Silhouettes**: Visual proportion graphics against real-world items (Human figure 1.8m, Door 2.1m, Car 4.5m, House 10m, High-rise tower 120m).
- **Toast Notifications**: Non-intrusive floating feedback for copy actions, scale changes, and export status.

---

## 🛠️ Core Tools & Calculation Modes

### 1. Scale Converter (Drawing ↔ Real World)
- **Bidirectional Scaling**:
  - **Drawing $\rightarrow$ Real World**: Enter paper measurement (e.g. `15.5 cm` at `1:50`) $\rightarrow$ instantly calculates real-world length (`7.75 m` / `25'-5 1/8"`).
  - **Real World $\rightarrow$ Drawing**: Enter real dimension (e.g. `12.0 m` at `1:100`) $\rightarrow$ instantly calculates paper drawing length (`12.0 cm` / `120 mm`).
  - **Direction Swap (<kbd>S</kbd>)**: Instant animated reversal of input and output with acoustic confirmation.
- **Scale Presets Grid**: Quick category filters (*All, Architectural, Detail, Urban, Imperial*) and custom ratio input (`1 : X`).
- **Flexible Number & Fraction Parser**:
  - Decimals: `12.5`, `0.75`, `250`
  - Fractions: `3 1/2`, `5/8`, `1/4`
  - Architectural Feet/Inches: `12' 6"`, `12'-6 1/2"`, `8'4"`
- **Equivalent Breakdown Grid**: Real-time parallel readout across all metric and imperial units simultaneously.

---

### 2. Rescaler (Sheet Scale A ➔ Sheet Scale B)
- Calculates how long a drawn element will be when transferring or redrawing between drawings of different scales.
- **Inputs**: Original Scale A (`1:50`), Original Drawing Length (`12 cm`), Target Scale B (`1:200`), Target Unit (`cm`).
- **Outputs**: Calculated dimension on target sheet (`3.0 cm`), Magnification/Reduction factor (`25.0% - Reduced`).

---

### 3. Scale Finder & Detector
- Identifies the scale of an unlabelled drawing or scanned plan.
- **Inputs**: Measured length on paper (e.g. `4.5 cm`) + Known real-world length (e.g. `9.0 m`).
- **Outputs**:
  - Exact scale ratio (e.g. `1 : 200`).
  - Nearest standard architectural preset match with percentage difference.
  - One-click **"Apply Scale to Main Converter"** button.

---

### 4. Area (S²) & 3D Volume (S³) Scaler
- **Area Scaling ($S^2$)**: Accurately scales floor plans, site boundaries, and parcel areas ($\text{cm}^2 \leftrightarrow \text{m}^2$, $\text{m}^2 \leftrightarrow \text{sq ft}$, $\text{ha}$, $\text{acres}$).
- **Volume Scaling ($S^3$)**: Computes 3D massing, foam block model volumes, and structural material volumes ($\text{cm}^3 \leftrightarrow \text{m}^3$, $\text{liters}$, $\text{cu ft}$).

---

### 5. Furniture Scales & Fixtures Catalog
- **Live Search Bar**: Real-time keystroke filtering by keyword (e.g. `sofa`, `king bed`, `sink`, `door`, `desk`, `conference`, `wardrobe`) with dynamic result count.
- **Category Filter Navigation**:
  - `All Furniture` (40+ items)
  - `🛋️ Living Room`
  - `🛏️ Bedroom`
  - `🍽️ Dining`
  - `🍳 Kitchen & Utility`
  - `🚿 Bathroom & Fixtures`
  - `💼 Office & Workspace`
  - `🚪 Doors & Clearances`
- **Dynamic Scale Bar**: Scale all furniture pieces simultaneously across `1:10`, `1:20`, `1:25`, `1:50`, `1:100`, `1/4"=1'`, or custom ratios with unit toggle (`cm`, `mm`, `in`).
- **2D Top-Down Blueprint Visualizations**: Architectural plan view graphic with proportion cues for each piece.
- **Quick Custom Dimension Scaler**: Enter any custom $W \times D \times H$ to get both real-world specs and exact paper drawing size.
- **Action Buttons**: One-click **"Copy Size"** and **"To Converter"** (transfers dimensions to the main converter).

---

### 6. Multi-Length Reference Chart
- Print-ready reference table showing common drawing lengths (`0.1cm`, `0.5cm`, `1cm`, `2cm`, `5cm`, `10cm`, `20cm`, `50cm`, `100cm`) converted to real-world metric and imperial measurements at the chosen scale.
- One-click **"Print Reference Sheet"** for physical studio drafting boards.

---

## 📐 Complete Architectural Scale Presets

| Scale ID | Category | Ratio | Description & Standard Usage |
| :--- | :--- | :--- | :--- |
| **1:1** | Metric Detail | 1 | Full scale, 1:1 physical mockups & full fixtures |
| **1:2** | Metric Detail | 2 | Half size, large architectural details |
| **1:5** | Metric Detail | 5 | Joinery details, structural connections |
| **1:10** | Metric Detail | 10 | Cabinetry, custom millwork, interior details |
| **1:20** | Metric Detail | 20 | Room layouts, enlarged sections, interior elevations |
| **1:25** | Metric Detail | 25 | Structural bay layouts, detailed plans |
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

## 🛋️ Complete Furniture & Fixtures Database

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
- `mm` — Millimeters ($0.001\text{ m}$)
- `cm` — Centimeters ($0.01\text{ m}$)
- `dm` — Decimeters ($0.1\text{ m}$)
- `m` — Meters ($1.0\text{ m}$)
- `km` — Kilometers ($1000.0\text{ m}$)
- `in` — Inches ($0.0254\text{ m}$)
- `ft` — Decimal Feet ($0.3048\text{ m}$)
- `ft-in` — Architectural Notation ($X'\text{-}Y\text{ }Z/16"$)
- `yd` — Yards ($0.9144\text{ m}$)
- `mi` — Miles ($1609.344\text{ m}$)

### Area Units
- `mm²` — Square Millimeters ($10^{-6}\text{ m}^2$)
- `cm²` — Square Centimeters ($10^{-4}\text{ m}^2$)
- `m²` — Square Meters ($1.0\text{ m}^2$)
- `km²` — Square Kilometers ($10^6\text{ m}^2$)
- `ha` — Hectares ($10,000\text{ m}^2$)
- `sq in` — Square Inches ($0.00064516\text{ m}^2$)
- `sq ft` — Square Feet ($0.09290304\text{ m}^2$)
- `sq yd` — Square Yards ($0.83612736\text{ m}^2$)
- `ac` — Acres ($4046.8564\text{ m}^2$)

### Volume Units
- `mm³` — Cubic Millimeters ($10^{-9}\text{ m}^3$)
- `cm³` — Cubic Centimeters / cc ($10^{-6}\text{ m}^3$)
- `m³` — Cubic Meters ($1.0\text{ m}^3$)
- `L` — Liters ($0.001\text{ m}^3$)
- `cu in` — Cubic Inches ($1.6387 \times 10^{-5}\text{ m}^3$)
- `cu ft` — Cubic Feet ($0.0283168\text{ m}^3$)
- `cu yd` — Cubic Yards ($0.764554\text{ m}^3$)

---

## 🧮 Mathematical Formulas & Engine

1. **Drawing to Real-World Dimension:**
   $$\text{Real Meters} = (\text{Drawing Value} \times \text{Unit Factor}) \times \text{Scale Ratio}$$
   $$\text{Output Value} = \frac{\text{Real Meters}}{\text{Target Unit Factor}}$$

2. **Real-World to Drawing Dimension:**
   $$\text{Drawing Meters} = \frac{\text{Real Value} \times \text{Unit Factor}}{\text{Scale Ratio}}$$
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

## 🎨 Themes & Tactile Acoustic Feedback

### 3 Handcrafted Themes
1. **📐 Studio Dark (Default)**:
   - Deep slate graphite background (`#0d1117`), blueprint cyan accents (`#38bdf8`), glowing status tags, and high-contrast numbers for drafting sessions.
2. **📜 Drafting Paper**:
   - Warm architectural parchment (`#f6f3eb`), sepia ink, pencil charcoal text (`#1e2229`), and bronze borders.
3. **🟦 Blueprint Cyan**:
   - Classic cyanotype blueprint aesthetic (`#0a2540`), stark white technical drafting outlines, electric cyan accents.

### Synthesized Web Audio Engine
- Built-in zero-asset audio synthesizer using HTML5 Web Audio API:
  - Gentle mechanical keystroke clicks on numeric changes.
  - Soft pitch slide on direction swap.
  - Harmonized tri-tone chime on clipboard copy.
  - Completely toggleable and persistent via `localStorage`.

---

## 💾 Calculation History & Export System

- **Automatic Logging**: Every calculation is logged with timestamp, mode, input, ratio, and output.
- **Export CSV**: Generates a standard `.csv` spreadsheet ready for Excel, Google Sheets, or BIM schedule logs.
- **Export Markdown**: Formats calculation logs into a GitHub Flavored Markdown table for project documentation.
- **Persistent Storage**: Retained across browser restarts via `localStorage`.

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

## 🚀 How to Run & Technical Architecture

Architecture Helping Hand is built with **zero external dependencies** and requires no build step:

### Method 1: Instant Local Launch
Simply double-click `index.html` or open it with any web browser (Chrome, Edge, Safari, Firefox, Opera, Brave).

### Method 2: Local HTTP Server (Optional)
```bash
# Using Python
python -m http.server 3000

# Or using Node.js
npx serve -l 3000 .
```
Navigate to `http://localhost:3000` in your web browser.

### Automated Test Suite
To verify calculation formulas and unit conversions:
```bash
node tests/converter.test.js
```
*(All 14 unit test assertions pass with zero failures).*

---

*Architecture Helping Hand Studio • Precision Architectural Scaling & Reference Suite*
