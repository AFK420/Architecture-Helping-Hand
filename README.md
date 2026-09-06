# Architecture Helping Hand 📐🏛️

> **Professional Architectural Scale, Drafting, Plan Studio & Multi-Unit Calculation System**  
> *A high-precision, zero-dependency, tactile architectural workstation and drawing studio built for architects, interior designers, urban planners, physical model makers, BIM technologists, and design students.*

[![Tests](https://img.shields.io/badge/Tests-4583%20Passed%20(100%25)-38bdf8?style=flat-square&logo=node.js)](tests/)
[![Architecture](https://img.shields.io/badge/Architecture-3--Tier%20Core%20%7C%20Frozen-10b981?style=flat-square)](ENGINEERING_RULES.md)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Vanilla)-f59e0b?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](package.json)
[![PWA](https://img.shields.io/badge/PWA-v2.2.0%20Offline%20Ready-06b6d4?style=flat-square)](sw.js)
[![Test Suites](https://img.shields.io/badge/Suites-49%2F49%20Passing-a855f7?style=flat-square)](tests/)

---

## 📑 Table of Contents
1. [🎯 What is Architecture Helping Hand?](#-what-is-architecture-helping-hand)
2. [👥 Who is this Program For?](#-who-is-this-program-for)
3. [🚀 What Should You Do with It? (Core Workflows)](#-what-should-you-do-with-it-core-workflows)
4. [✨ Latest Updates & Architectural Milestones (v2.2.0)](#-latest-updates--architectural-milestones-v220)
5. [🏛️ Omni-Studio Personas System (AutoCAD · Rhino · Photoshop · SketchUp)](#️-omni-studio-personas-system)
6. [💡 Dual-Tier Architectural Tool Guidance System ("My GF" Guidance Engine)](#-dual-tier-architectural-tool-guidance-system)
7. [🖥️ Zero-Scroll Desktop Workstation & Docked CAD CLI](#️-zero-scroll-desktop-workstation--docked-cad-cli)
8. [🛠️ The 24 Complete Functional Modes](#️-the-24-complete-functional-modes)
9. [📐 Architectural Scale Presets (All 28 Presets)](#-architectural-scale-presets-all-28-presets)
10. [🛋️ Architectural Furniture & Fixtures Database (215 Items Across 9 Categories)](#️-architectural-furniture--fixtures-database-215-items-across-9-categories)
11. [📏 Supported Measurement Units](#-supported-measurement-units)
12. [🧮 Mathematical Formulas & Contracts](#-mathematical-formulas--contracts)
13. [🤖 Architectural AI Studio & AI Control Center](#-architectural-ai-studio--ai-control-center)
14. [⌨️ Keyboard Shortcuts & CAD Commands](#️-keyboard-shortcuts--cad-commands)
15. [💻 How to Run, Build & Test](#-how-to-run-build--test)
16. [📚 Complete Documentation Index](#-complete-documentation-index)

---

## 🎯 What is Architecture Helping Hand?

**Architecture Helping Hand** is a standalone, client-side architectural design, scaling, and drafting workstation designed to bridge the gap between abstract mathematical calculations, physical site measurements, and professional computer-aided drafting (CAD).

In professional architectural practice, designers constantly juggle three different realities:
1. **Real-World Site Dimensions**: Metric ($m$, $cm$, $mm$) and Imperial ($ft$, $in$, fractional feet-inches).
2. **Sheet Paper Dimensions**: Scaled physical drawings on A4 through A0 sheets ($1:20$, $1:50$, $1:100$, $1/4"=1'$).
3. **Software Environments**: AutoCAD, Rhino 3D, SketchUp, Adobe Photoshop, and Revit—each with distinct command interfaces, coordinate formats, and unit conventions.

Traditional calculators lack spatial understanding, and full BIM/CAD software packages (Revit, Archicad, Rhino) are heavy, slow to launch for quick checks, and do not provide immediate bidirectional tactile scaling, Blondel stair heuristics, or instant furniture clearance validations.

**Architecture Helping Hand solves this permanently.** It operates as an all-in-one, ultra-responsive architectural Swiss Army Knife that runs 100% offline in any web browser with **zero external dependencies** (`dependencies: {}`). It features:
* **Deterministic Scale Math**: Bidirectional converters, sheet-to-sheet rescalers, area ($S^2$), volume ($S^3$), and mystery scale detectors.
* **Interactive 2D Plan Studio & CAD Engine**: Snapping walls, doors, windows, parametric rooms, column grids, Rhino NURBS curves, and CAD blocks.
* **Multi-Story Elevation Stacking & Building Section Slicing**: Slices live plan models along arbitrary cut planes with real construction poché hatching.
* **Construction Detail Matrix Sheets**: Automatically generates parametric architectural details (Footing, Parapet, Window Sill, Stair Nosing) with keynote annotations.
* **Vertical Circulation Calculators**: Straight, L-shaped, and switchback stairs with Blondel $2R + T$ heuristics and IBC/ADA compliance, alongside ADA ramp slope analyzers.
* **Scale-Accurate Drafting Chains**: Physical construction poché bands (brick, glass, timber, concrete, allowances), heavy $45^\circ$ architectural slashes, and running cumulative datums.
* **Adaptive Software Personas**: UI that morphs to mirror **AutoCAD** (with interactive CLI), **Rhino 3D** (with 4-viewport 2x2 split), **Photoshop** (with selection masks & brushes), and **SketchUp** (with push-pull tools).
* **Dual-Tier Architectural Tool Guidance**: Contextual plain-English instructions and IBC/ADA building code standards displayed live on hover and in a dedicated inspector.
* **Deterministic Architectural AI**: Local (Ollama) and cloud (OpenAI, Gemini, Claude, DeepSeek) AI design co-pilot that consumes structured project facts with zero hallucinated measurements.

---

## 👥 Who is this Program For?

Architecture Helping Hand was custom-engineered for anyone who creates, measures, reviews, or builds physical space:

| User Role | How Architecture Helping Hand Empowers Their Daily Work |
| :--- | :--- |
| **🏛️ Practicing Architects & Project Leads** | Instantly verify drawing scales on unlabelled scanned plans, compute dimension chains across structural grid bays, generate building section cuts with poché, and review IBC code compliance for stair/ramp circulation. |
| **📐 Architectural Technologists & BIM Managers** | Eliminate unit translation errors between metric and imperial, format CAD clipboard payloads for instant pasting into AutoCAD/Rhino command prompts, and export clean 2D DXF/SVG geometry. |
| **🛋️ Interior Designers & Space Planners** | Search 215 standard furniture pieces across 9 domains, verify ADA $900\text{mm}$ wheelchair clearances and door swings, test custom millwork dimensions, and draft room layouts. |
| **🏙️ Urban Planners & Landscape Architects** | Scale large civil boundaries ($1:500$, $1:1250$, $1:2500$, $1:5000$), calculate site parcel areas in hectares/acres, analyze terrain drainage slopes, and verify pedestrian ramp gradients. |
| **✂️ Physical Architectural Model Makers** | Calculate the exact millimeter cutting dimensions for physical basswood, acrylic, or museum board models at $1:20$, $1:50$, $1:100$, or $1:200$ without manual division errors. |
| **🏗️ Construction Managers & Estimators** | Quickly audit contractor shop drawings, check take-off quantities (perimeter, area $S^2$, volume $S^3$), inspect multi-flight staircase riser heights, and calibrate on-site survey photographs. |
| **🎓 Architecture Students & Educators** | Master architectural conventions, learn the Blondel stair proportion formula ($2R + T \approx 63\text{cm}$), study standard construction detail assemblies (footing, parapet, sill), and explore CAD software personas. |

---

## 🚀 What Should You Do with It? (Core Workflows)

Here are the 7 primary workflows architects and designers perform daily using Architecture Helping Hand:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               ARCHITECTURAL STUDIO WORKFLOW MATRIX                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
  [1] SCHEMATIC DRAFTING     ➔  Plan Studio (Mode 19): Draw parametric rooms, walls, doors, windows
  [2] SCALE TRANSLATION      ➔  Converter & Rescaler (Modes 1-3): Convert paper mm ↔ real meters
  [3] CIRCULATION & CODES    ➔  Stairs & Ramps (Modes 14-16): Blondel 2R+T & IBC/ADA slope analysis
  [4] DIMENSIONING           ➔  Chains & Workspace (Modes 7-10): Scale-accurate poché dimension strings
  [5] DETAIL & PRESENTATION  ➔  Sections & Details: Generate building section slices & 4-detail sheets
  [6] MULTI-CAD HANDOFF      ➔  CAD Handoff (Modes 11-13): Copy formatted coordinate strings to Rhino/ACAD
  [7] AI DESIGN REVIEW       ➔  AI Studio (Modes 20-21): Fact-grounded architectural critique & co-pilot
```

### Workflow 1: Instant Scale Conversion & Scanned Drawing Detection
1. **Unlabelled Drawing**: You receive a scanned PDF or historical blueprint with no scale bar.
2. Open **Scale Finder** (<kbd>3</kbd>). Enter the paper length you measured with a physical ruler ($48\text{mm}$) and the known site dimension (a standard $2.4\text{m}$ door or parking space).
3. The detector immediately flags the exact ratio: **$1:50$ (Exact match, $0.0\%$ delta)**.
4. Press <kbd>1</kbd> to jump to **Scale Converter** and begin reading off all other room dimensions with real-world readouts.

### Workflow 2: Fast 2D Plan Drafting & OSNAP Snapping
1. Switch to **Plan Canvas** (Mode 19).
2. Select your preferred persona: **AutoCAD** (for command typing `L`, `PL`, `REC 6 4`), **Rhino** (for 4-viewport camera mode), or **Studio**.
3. Draw exterior walls with magnetic endpoint and perpendicular object snapping (`OSNAP`).
4. Insert doors and windows—walls auto-cut openings and render clear swing arcs.
5. Inspect real-time room areas ($m^2$, $sq\text{ }ft$) and zoning tags in the right C-Panel.

### Workflow 3: Multi-Flight Stair & Accessible Ramp Design
1. Open **Stair Calculator** (<kbd>Mode 14</kbd>).
2. Input a floor-to-floor rise of $2.80\text{m}$.
3. The engine computes $16$ risers at $175\text{mm}$ with $15$ treads at $280\text{mm}$.
4. Blondel compliance ($2R + T = 630\text{mm}$) displays green with IBC compliance flags.
5. Click **Apply to Plan** to instantly slice the stair into the 2D floor plan, complete with walking line and break line.
6. Check entrance access in **Ramp Calculator** (<kbd>Mode 15</kbd>) to ensure the slope does not exceed $1:12$ ($8.33\%$) ADA standards.

### Workflow 4: Scale-Accurate Poché Dimension Chains
1. Open **Dimension Chains** (<kbd>0</kbd>).
2. Type an architectural sequence into Quick Add: `1200 + 1500 + 600 + 900 + 1200` or template buttons (Wall Openings, Grid Bays).
3. The **Scale-Accurate Drafting Visualizer** renders an expansive $420\text{px}$ diagram:
   - Wall piers render with authentic **Brick Poché** hatching.
   - Window openings render with **Glazed Sills and light reflection lines**.
   - Door openings render with **Timber frames and clear threshold openings**.
   - Center piers render with **Structural Concrete crosshatching**.
4. Witness lines, $45^\circ$ architectural slashes, cumulative coordinate datums, and overall total badges render with millimetric accuracy.

### Workflow 5: Generating Building Sections & Construction Details
1. In the Plan Studio, place a section cut line $\text{A-A}$.
2. Switch document tab to **Building Section A**:
   - Walls sliced by the plane render with heavy architectural poché.
   - Suspended floor slabs ($0.25\text{m}$ thick) and roof slabs render with concrete aggregate hatching.
   - Sliced stairs project stepped treads and $900\text{mm}$ handrails.
   - Level datums (Ground Level $\pm 0.00$, Level 2 $+3.20\text{m}$, Roof $+6.20\text{m}$) align on the right axis.
3. Switch document tab to **Construction Details Matrix** to view 4 parametric assembly details:
   - **Footing Assembly** ($1:10$): Strip footing, rebar dots, perforated drain tile, waterproof membrane.
   - **Parapet Assembly** ($1:10$): Metal coping cap, EPDM membrane, exterior brick veneer.
   - **Window Sill Detail** ($1:5$): Clay brick veneer, sloped precast stone sill, thermal break.
   - **Stair Nosing Assembly** ($1:5$): Non-slip carborundum safety insert, concrete tread, stainless steel baluster.

### Workflow 6: Cross-CAD Export to Rhino, AutoCAD & SketchUp
1. Highlight any schedule in Dimension Workspace (<kbd>7</kbd>), Batch CAD (<kbd>B</kbd>), or Chains (<kbd>0</kbd>).
2. Click **🚀 Send to CAD** (<kbd>Mode 13</kbd>).
3. Choose your target CAD suite:
   - **AutoCAD**: Normalized decimal coordinates ready for command prompt entry.
   - **Rhino 3D**: Continuous curve distance prompts and point lists.
   - **SketchUp**: Measurement strings formatted for the Value Control Box (VCB).
   - **Revit**: Parameter schedules formatted for shared parameters.
4. Click **Copy to Clipboard** or export as DXF / SVG / TSV.

### Workflow 7: Fact-Grounded AI Design Consultation
1. Press <kbd>✨ AI Assistant</kbd> in the top bar to slide down the omnipresent AI co-pilot without losing your drawing context.
2. Select a persona: **Studio Critic**, **IBC Building Code Tutor**, or **General Assistant**.
3. Ask: *"Critique the bedroom proportions and verify if the corridor meets code clearances."*
4. The system automatically serializes the deterministic facts pack from your live plan (exact wall lengths, furniture clearances, room square meters) and passes it to your selected model (local Ollama, OpenAI, Gemini, or Claude).
5. The AI returns mathematically verified recommendations that cite your real project geometry.

---

## ✨ Latest Updates & Architectural Milestones (v2.2.0)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  WHAT'S NEW IN RELEASE v2.2.0                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
  [1] SCALE-ACCURATE POCHÉ ENGINE    • Physical wall, window, door, concrete, and allowance hatching
  [2] UNIVERSAL DARK BOX UI          • Seamless dark slate textareas, selects, and custom file pickers
  [3] ZERO-SCROLL WORKSTATION        • Single-screen fit, docked CLI, compact ribbon, 2-column palette
  [4] DUAL-TIER TOOL GUIDANCE        • Floating 1-2-3 cursor popover + permanent standards inspector
  [5] 5 SOFTWARE PERSONAS            • Studio, AutoCAD, Rhino 3D (4-viewport), Photoshop, SketchUp
  [6] PWA v2.2.0 & STRICT ISOLATION  • Instant cache bust, strict inline style view isolation, 100% offline
  [7] 4,583 AUTOMATED TESTS          • 49 of 49 test suites passing cleanly with zero dependencies
```

### 1. Architectural Poché & Drafting Chain Overhaul
* **Expansive Canvas**: Enlarged diagram viewport from a cramped wireframe to an expansive $420\text{px}$ high architectural drawing canvas.
* **Physical Construction Poché**: Replaced thin single lines with a $56\text{px}$ thick structural elevation band featuring authentic architectural patterns:
  - 🧱 **Brick Poché** (`#brickPoche`) for masonry wall piers.
  - 🪟 **Glazed Openings** (`#glassReflect`) with window sills and angled daylight reflection lines.
  - 🚪 **Door Openings** with timber jamb profiles and clear threshold widths.
  - 🏛️ **Concrete Crosshatching** (`#concretePoche`) for structural column piers.
  - ⚠️ **Allowance Diagonals** (`#allowancePoche`) for construction tolerances.
* **Top Dimension Strings**: Heavy $45^\circ$ architectural slash ticks ($16\text{px}$ long, $2.5\text{px}$ stroke) with high-contrast pills displaying real-world measurements ($12\text{px}$ bold) and paper drawing size ($9.5\text{px}$).
* **Running Cumulative Datums**: Continuous axis at $Y = 245$ with circular nodes, vertical drop lines, and coordinate badges ($0\text{ mm} \rightarrow 1,200\text{ mm} \rightarrow 2,700\text{ mm} \dots$).
* **Overall Total String**: Heavy dimension line with double end slashes and prominent callout badge.
* **Interactive Diagram Picking**: Clicking any segment in the SVG diagram instantly synchronizes selection with the properties inspector and table.

### 2. Universal Dark Box UI & Input Unification
* **Dark Theme Textareas**: Eliminated all stark white textareas across the entire application (Mode 22 Importer, Mode 20 AI Studio, Mode 18 Projects, etc.). Form controls now feature dark slate backgrounds (`#121316`), subtle $1.5\text{px}$ borders (`#3f3f46`), and high-contrast text (`#f4f4f5`).
* **Custom Architectural File Pickers**: Replaced raw browser file inputs with custom dashed slate containers and styled action buttons with luminous hover glow states.
* **Native Select Dark Styling**: Stylized all `<select>` dropdowns and native `<option>` menus with dark backgrounds.
* **Fail-Safe View Isolation**: Implemented inline style priority (`display: none !important;`) and HTML-level guards to guarantee that inactive mode views stay strictly hidden across all viewports and browser states.

### 3. PWA Service Worker v2.2.0 & Cache-Busting Pipeline
* **Progressive Web App (PWA) v2.2.0**: Updated [`sw.js`](sw.js) to `archiscale-v2.2.0` with instant cache purging of older versions upon activation.
* **Network-First Navigation**: Navigation requests fetch the latest markup with cache fallback, ensuring updates apply immediately upon refresh without lingering stale assets.
* **100% Offline Autonomy**: Operates seamlessly without an internet connection, preserving all mathematical cores, presets, and furniture catalogs.

---

## 🏛️ Omni-Studio Personas System

Architecture Helping Hand adapts to your preferred CAD software through 5 specialized workspace personas. Switching personas dynamically updates the ribbon tabs, command aliases, cursor behaviors, and drafting aids:

```text
┌─────────────────┬───────────┬────────────────────────────────────────────────────────────────────┐
│ Persona         │ Accent    │ Primary Specialization & Workspace Characteristics                  │
├─────────────────┼───────────┼────────────────────────────────────────────────────────────────────┤
│ 🏛️ Studio        │ Cyan      │ Balanced architectural drafting, BIM space planning, IBC checks.  │
│ 🔴 AutoCAD      │ Red       │ Interactive CAD Command Line (CLI), 2D precision drawing, blocks.  │
│ 🟢 Rhino 3D     │ Green     │ 4-Viewport orthographic split, NURBS curves, surfaces, solids.     │
│ 🔵 Photoshop    │ Blue      │ Marquee/lasso selection, raster masking, presentation brushes.     │
│ 🟡 SketchUp     │ Amber     │ Direct modeling primitives, push-pull 3D tools, inference locks.   │
└─────────────────┴───────────┴────────────────────────────────────────────────────────────────────┘
```

1. **🏛️ Studio Mode (Default)**: Combines architectural drafting, space planning compliance, stair/ramp calculators, and multi-viewport presentation sheets into a balanced workspace.
2. **🔴 AutoCAD Mode**:
   - **Interactive CLI**: Dedicated command-line interface docked at the bottom of the canvas (`Command: `).
   - **Command Aliases**: Type native commands such as `L` (Line), `PL` (Polyline), `W` (Wall), `WN` (Window), `DR` (Door), `REC 6 4` (Parametric Room), `WALL 5` (Wall Segment), `STAIR` (Staircase), `SNAP 0.5m`, `ORTHO`, `HATCH`, or `DIST`.
   - **Ribbon Tabs**: `HOME`, `DRAW`, `MODIFY`, `ANNOTATE`, `LAYERS`, `BLOCKS`.
3. **🟢 Rhino 3D Mode**:
   - **4-Viewport Split**: One-click toggle between single canvas and a 2x2 orthographic quad split (`Top`, `Front`, `Right`, `Perspective`) with synchronized camera panning and zooming.
   - **NURBS Geometry**: Evaluates smooth Bézier and NURBS curves, surface patches, and solid cross-sections.
   - **Ribbon Tabs**: `CURVES`, `SURFACES`, `SOLIDS`, `TRANSFORM`, `VIEWPORTS`.
4. **🔵 Photoshop Mode**:
   - **Graphic Presentation**: Designed for rendering post-processing, diagrammatic colored floor plans, and portfolio presentation.
   - **Tools**: Rectangular/elliptical marquee, polygonal lasso, architectural watercolor and marker brushes, material texture fills, and layer blending.
   - **Ribbon Tabs**: `SELECT`, `BRUSHES`, `TEXTURES`, `MASKS`, `EXPORT`.
5. **🟡 SketchUp Mode**:
   - **Direct Push-Pull**: Conceptual spatial massing, room volumetric extrusion, and component insertion.
   - **Inference Alignment**: Smart inferencing to axes (Red: X, Green: Y, Blue: Z), midpoint locks, and perpendicular constraints.
   - **Ribbon Tabs**: `PRIMITIVES`, `PUSH-PULL`, `COMPONENTS`, `CAMERA`, `SHADOWS`.

---

## 💡 Dual-Tier Architectural Tool Guidance System

To assist both students learning architectural standards and seasoned practitioners looking up exact code formulas, the studio includes the **Dual-Tier Architectural Tool Guidance System** ("My GF" Guidance Engine):

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      DUAL-TIER ARCHITECTURAL TOOL GUIDANCE ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ USER HOVERS OVER ANY TOOL ]
                │
                ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │ TIER 1: FLOATING CURSOR SMART POPOVER                            │
   │ • Plain-English Definition ("What is this tool?")                │
   │ • 1-2-3 Step Execution Guide ("How do I use it?")                │
   │ • Direct Building Code Rule (IBC / ADA / Blondel standard)       │
   └──────────────────────────────────────────────────────────────────┘
                │
                ▼ (Selected Tool Synchronizes to Inspector)
   ┌──────────────────────────────────────────────────────────────────┐
   │ TIER 2: PERMANENT ARCHITECTURAL STANDARDS INSPECTOR (C-PANEL)    │
   │ • Live Architectural Formulas (e.g. 2R + T = 63cm)               │
   │ • Standard Construction Dimensions (Cavity walls: 200-350mm)     │
   │ • ADA Clearance Benchmarks (Doors: 900mm clear swing)            │
   │ • Structural Spans (Concrete grid bays: 6m x 6m to 9m x 9m)      │
   │ • Pro CAD Power-User Tips and Keyboard Shortcuts                 │
   └──────────────────────────────────────────────────────────────────┘
```

* **Tier 1 (Floating Smart Popover `#studio-tool-popover`)**: Follows the cursor when hovering over any ribbon tool, toolstrip icon, or canvas control. Provides an instant 3-point briefing without clicking.
* **Tier 2 (Permanent Architectural Standards Inspector `#cpanel-tool-guide-card`)**: Anchored permanently in the right dockable C-Panel. Automatically updates whenever an active tool or entity is selected, giving deep technical formulas and construction tips while drafting.

---

## 🖥️ Zero-Scroll Desktop Workstation & Docked CAD CLI

The workspace layout is engineered to fit standard desktop and laptop displays ($1280\times 800$, $1440\times 900$, $1920\times 1080$) with **zero vertical page scrolling**:

* **Expansive Central Viewport**: Symmetrically framed drawing canvas maximizing visible drafting space.
* **Compact Single-Row Ribbon**: Streamlined ribbon panels with horizontal layout (`height: 72px`), saving over $115\text{px}$ of vertical space compared to multi-row menus.
* **2-Column Iconic Toolstrip**: Compact $92\text{px}$-wide toolstrip with categorized tools, keyboard shortcut badges, and an integrated micro-search box.
* **Docked CAD Command Line**: Permanently docked command prompt positioned immediately below the drawing canvas, ensuring command typing and OSNAP toggles remain 100% visible at all times.
* **Right C-Panels**: Dockable properties inspector with non-clipping tabs:
  - `📋 Props`: Entity parameters (dimensions, coordinates, materials).
  - `🗂️ Layers`: 10 standard architectural CAD layers (`A-WALL`, `A-DOOR`, `A-GLAZ`, etc.).
  - `✓ Code`: Live IBC space planning and clearance validator.
  - `🔍 Details`: Construction detail callouts and keynote assemblies.

---

## 🛠️ The 24 Complete Functional Modes

Architecture Helping Hand provides 24 dedicated functional modes accessible via the left sidebar, top breadcrumb menu, or the Global Command Palette (<kbd>Ctrl+K</kbd>):

### Core Scaling & Geometry Modes
1. **Mode 1: Bidirectional Scale Converter**: Converts drawing paper measurements to real-world dimensions (or vice versa) across all 28 presets with fraction and feet-inch parsing.
2. **Mode 2: Rescaler (Scale A ➔ Scale B)**: Directly recalculates drawing dimensions between sheets (e.g., what a $1:50$ detail measures at $1:200$ site plan scale).
3. **Mode 3: Scale Finder & Detector**: Determines the unknown scale of an unlabelled blueprint by comparing a measured paper length against its known real-world dimension.
4. **Mode 4: Area ($S^2$) & Volume ($S^3$) Scaler**: Scales square boundaries ($m^2$, $sq\text{ }ft$, hectares, acres) and cubic volumes ($m^3$, $cu\text{ }ft$, liters) using true quadratic and cubic scale factors.
5. **Mode 5: Furniture Scales & Fixtures Catalog**: Searchable database of 215 standard architectural items across 9 categories with proportional blueprint SVGs.
6. **Mode 6: Multi-Length Architectural Reference Sheet**: Printable matrix computing paper lengths ($0.1\text{cm}$ to $100\text{cm}$) into real-world equivalents for drafting boards.

### Architectural Dimensioning & Scheduling Modes
7. **Mode 7: Dimension Workspace & Dynamic Schedule**: Tabular schedule supporting additive structural segments (`SEG`), planning tolerances (`ALW`), and reference openings (`REF`) with subtotals.
8. **Mode 8: Dimension Expression Calculator**: Evaluates mixed-unit architectural math expressions (`(2.4m + 900mm) / 3`) with strict dimensional semantics.
9. **Mode 9: Multi-Scale Comparison Workspace**: Simultaneously evaluates a dimension across up to 10 standard scales with proportional visual drafting bars and paper-size fit checks (A4–A0).
10. **Mode 10: Scale-Accurate Dimension Chains**: Poché-backed continuous drafting string generator with cumulative datums, $45^\circ$ slashes, and material elevation bands.

### CAD Interoperability Modes
11. **Mode 11: CAD Clipboard**: Normalized numerical copy layer formatting dimensions for AutoCAD, Rhino, Revit, and spreadsheets.
12. **Mode 12: Batch CAD Conversion Engine**: Bulk scales and converts raw measurement tables (1,000+ rows in $<10\text{ms}$) with automatic delimiter detection.
13. **Mode 13: CAD Handoff Engine**: Target-specific clipboard profiles for Rhino, AutoCAD, SketchUp, and Revit with prefix/suffix formatting.

### Vertical Circulation & Architectural Systems
14. **Mode 14: Stair Calculator**: Straight, L-shaped, and U-shaped switchback stairs with riser/tread counts, Blondel $2R + T$ heuristics, and IBC compliance checks.
15. **Mode 15: Ramp Calculator**: Single-flight straight ramp slopes with rise, run, slope percentage, ratio ($1:12$), and ADA accessibility compliance.
16. **Mode 16: Slope & Grade Analyzer**: Universal rise/run analyzer for roofs, site grading, and drainage paths with signed ascend/descend directions.

### Project Management, Drafting & Presentation
17. **Mode 17: Universal Export Center**: Direct file export to 2D DXF, SVG, CSV, TSV, JSON, and print-ready PDF sheets.
18. **Mode 18: Project Manager & Versioned Snapshots**: Project library managing named design options, revision branches, and project metadata.
19. **Mode 19: Plan Studio & 2D CAD Canvas**: Interactive 2D floor plan drawing canvas with parametric walls, doors, windows, rooms, column grids, Rhino NURBS, section slice planes, and 4-detail presentation sheets.

### Intelligence, Import & Survey
20. **Mode 20: Architectural AI Studio**: Task-focused AI co-pilot consuming the deterministic project facts pack to critique designs, check codes, and suggest layouts.
21. **Mode 21: AI Control Center**: Multi-provider configuration hub managing API keys, connection tests, and model routing (Ollama, OpenAI, Anthropic, Gemini, DeepSeek, GLM).
22. **Mode 22: Universal Importer**: Ingests external geometry from 2D DXF, SVG, CSV, TSV, and native Project JSON.
23. **Mode 23: Survey Notebook & Calibration**: Field survey logging with measurement provenance and 2-point pixel-to-meter image calibration.
24. **Global Micro-Tool: Quick Dimension Strip (<kbd>Q</kbd>)**: Floating glance strip accessible from any tab to quickly evaluate measurements against building standards.

---

## 📐 Architectural Scale Presets (All 28 Presets)

| Preset Name | Category | Ratio (1:X) | Typical Architectural Application |
| :--- | :--- | :---: | :--- |
| **1:1** | Full Size | $1$ | Fabrication Details, Joinery Mockups & Hardware Profiles |
| **1:2** | Detail | $2$ | Custom Joinery Profiles & Large Construction Mockups |
| **1:5** | Detail | $5$ | Window Head, Jamb & Sill Assemblies, Cabinetry Sections |
| **1:10** | Detail | $10$ | Component Details, Interior Millwork & Stair Nosings |
| **1:20** | Interior / Detail | $20$ | Interior Elevations, Restrooms, Stairs & Custom Cabinetry |
| **1:25** | Interior | $25$ | Kitchen Plans, Millwork Elevations & Fit-Out Layouts |
| **1:50** | Architecture | $50$ | Standard General Arrangement Architectural Floor Plans |
| **1:100** | Architecture | $100$ | Building Plans, Building Sections & Exterior Elevations |
| **1:200** | Architecture / Site | $200$ | Large Commercial Floor Plates & Small Site Context Plans |
| **1:250** | Site Plan | $250$ | Site Layouts, Topographic Studies & Massing Models |
| **1:500** | Urban & Site | $500$ | Campus Masterplans & Site Development Schemes |
| **1:1000** | Urban & Site | $1,000$ | Urban Block Layouts, Zoning Envelopes & Infrastructure |
| **1:1250** | Urban & Site | $1,250$ | Ordnance Survey (UK) Context Plans & Property Boundaries |
| **1:2500** | Urban & Site | $2,500$ | Town Planning, Environmental Impact & Geographic Maps |
| **1:5000** | Regional | $5,000$ | Municipal Masterplans & Regional Topographic Surveys |
| **1:10000** | Regional | $10,000$ | Metropolitan Masterplans & Regional Highway Surveys |
| **1/16" = 1'-0"** | Imperial | $192$ | Large Facility Master Plans & Broad Building Outlines |
| **3/32" = 1'-0"** | Imperial | $128$ | Overall Building Footprints & Massing Sections |
| **1/8" = 1'-0"** | Imperial | $96$ | Commercial Floor Plans & General Building Sections |
| **3/16" = 1'-0"** | Imperial | $64$ | Residential Working Drawings & Detailed Sections |
| **1/4" = 1'-0"** | Imperial | $48$ | Standard US Residential Floor Plans & Elevations |
| **3/8" = 1'-0"** | Imperial | $32$ | Core Room Layouts, Kitchens & Staircase Enclosures |
| **1/2" = 1'-0"** | Imperial | $24$ | Enlarged Restrooms, Kitchen Plans & Interior Elevations |
| **3/4" = 1'-0"** | Imperial | $16$ | Detailed Wall Assemblies & Structural Framing Sections |
| **1" = 1'-0"** | Imperial | $12$ | Construction Details, Window Details & Cabinetry Joinery |
| **1-1/2" = 1'-0"** | Imperial | $8$ | Interior Millwork & Complex Assembly Sections |
| **3" = 1'-0"** | Imperial | $4$ | Large-Scale Threshold Details & Custom Jamb Profiles |
| **Full Size (1"=1")** | Imperial | $1$ | Full-Scale Architectural Details & Door Hardware Mockups |

---

## 🛋️ Architectural Furniture & Fixtures Database (215 Items Across 9 Categories)

The catalog provides **215 verified standard architectural items** with metric dimensions ($W \times D \times H\text{ cm}$), imperial equivalents, and proportional 2D top-down blueprint plan drawings:

| Category | Count | Sample Standard Pieces Included | Typical Dimensions ($W \times D \times H$) | Paper @ 1:50 |
| :--- | :---: | :--- | :---: | :---: |
| **Living & Lounge** | 31 | 3-Seater Sofa, 2-Seater Loveseat, 4-Seater Large Sofa, L-Sectional, U-Sectional, Chesterfield, Chaise Lounge, Recliner, Wingback, Coffee Tables, Console, Bookshelf, Fireplace Hearth, Grand Piano | $220 \times 90 \times 85\text{ cm}$ | $4.40 \times 1.80\text{ cm}$ |
| **Bedroom & Wardrobe** | 18 | Super King ($200 \times 200$), King ($180 \times 200$), Queen ($150 \times 200$), Double ($135 \times 190$), Twin XL, Bunk Bed, Trundle, Baby Crib, Nightstands, Wardrobes, Dressers | $180 \times 200 \times 110\text{ cm}$ | $3.60 \times 4.00\text{ cm}$ |
| **Dining & Bar** | 18 | Bistro Tables (2P Square/Round), 4P/6P/8P/10P/12P Dining Tables (Rectangular, Round, Oval), Dining Chairs, Bar Stools, Breakfast Nook Banquette, Sideboards, Credenza, Bar Cart | $160 \times 90 \times 75\text{ cm}$ | $3.20 \times 1.80\text{ cm}$ |
| **Kitchen & Utility** | 27 | Base Cabinets ($60/90\text{cm}$), Corner Lazy Susan, Kitchen Islands ($1.8\text{m}/2.4\text{m}$), Peninsula Bar, Tall Pantry, Oven Tower, Single/Double Sinks, Cooktops, Range Cookers, Fridge, Dishwasher, Laundry Washer/Dryer | $180 \times 90 \times 90\text{ cm}$ | $3.60 \times 1.80\text{ cm}$ |
| **Bathroom & Spa** | 28 | Close-Coupled WC, Wall-Hung WC, Accessible ADA Toilet, Bidet, Wall Urinal with Partition, Cloakroom Basin, Pedestal Basin, Single/Double Vanities ($60-160\text{cm}$), Inset/Oval/Corner Jacuzzi Tubs, Walk-In Showers | $170 \times 70 \times 55\text{ cm}$ | $3.40 \times 1.40\text{ cm}$ |
| **Office & Studio** | 24 | Compact Desk, Standard Workstation ($1.4\text{m}$), Studio Desk ($1.6\text{m}$), Sit-Stand Electric Desk, Executive Desk, L/U-Shaped Suites, Drafting Table, Benching Pods, Reception Counter, Phone Booth, Conference Tables | $140 \times 70 \times 75\text{ cm}$ | $2.80 \times 1.40\text{ cm}$ |
| **Doors & Openings** | 23 | Interior Doors ($700/800\text{mm}$), Entrance Door ($900\text{mm}$), ADA Accessible Door ($1000\text{mm}$), French Doors ($1.6/1.8\text{m}$), Pocket Door, Sliding Patio Doors ($1.8/2.7\text{m}$), Bi-fold Glass Wall ($3.0\text{m}$), Casement/Sliding Windows | $90 \times 10 \times 210\text{ cm}$ | $1.80 \times 0.20\text{ cm}$ |
| **Outdoor & Patio** | 24 | Patio Dining Sets, Terrace Chairs, Sun Loungers, Outdoor L-Sectional, Fire Pit Table, Cantilever Parasol ($	ext{Ø}300\text{cm}$), BBQ Kitchen Station, Planter Boxes, Bicycle Racks, Motorcycle Bays, Parking Bays, Single Garage | $250 \times 500\text{ cm}$ | $5.00 \times 10.00\text{ cm}$ |
| **Commercial & Industrial**| 22 | Restaurant Booths, Bar Service Counter, Retail Apparel Racks, Cashier Counter, Supermarket Conveyor, Gym Equipment, Hospital Beds, ICU Bed, Medical Exam Tables, Dental Chairs, Pallet Racks, Goods Lift | $120 \times 180 \times 100\text{ cm}$ | $2.40 \times 3.60\text{ cm}$ |

---

## 📏 Supported Measurement Units

### Length Units
* `mm` — Millimeters ($0.001\text{ m}$)
* `cm` — Centimeters ($0.01\text{ m}$)
* `dm` — Decimeters ($0.1\text{ m}$)
* `m` — Meters ($1.0\text{ m}$)
* `km` — Kilometers ($1000.0\text{ m}$)
* `in` — Decimal Inches ($0.0254\text{ m}$)
* `ft` — Decimal Feet ($0.3048\text{ m}$)
* `ft-in` — Fractional Feet & Inches (`12'-6 1/2"`)
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

All internal calculations convert measurements to base SI units (**meters**, **square meters**, **cubic meters**) before applying transformation ratios:

### Linear Scale Transformation
$$\text{Real Dimension} = \text{Drawing Dimension} \times \text{Scale Ratio}$$
$$\text{Drawing Dimension} = \frac{\text{Real Dimension}}{\text{Scale Ratio}}$$

### Sheet Rescaling (Scale A ➔ Scale B)
$$\text{Target Dimension} = \text{Original Dimension} \times \left( \frac{\text{Scale Ratio}_A}{\text{Scale Ratio}_B} \right) \times \left( \frac{\text{UnitFactor}_A}{\text{UnitFactor}_B} \right)$$

### Scale Detector (Mystery Scale)
$$\text{Scale Ratio } X = \frac{\text{Real Dimension in Meters}}{\text{Paper Dimension in Meters}}$$

### Quadratic Area Scaling
$$\text{Real Area} = \text{Drawing Area} \times \left( \text{Scale Ratio} \right)^2, \quad \text{Drawing Area} = \frac{\text{Real Area}}{\left( \text{Scale Ratio} \right)^2}$$

### Cubic Volume Scaling
$$\text{Real Volume} = \text{Drawing Volume} \times \left( \text{Scale Ratio} \right)^3, \quad \text{Drawing Volume} = \frac{\text{Real Volume}}{\left( \text{Scale Ratio} \right)^3}$$

### Blondel Stair Proportion Formula
$$2R + T \approx 630\text{ mm} \quad (600\text{ mm} \le 2R + T \le 660\text{ mm})$$

### Polygon Area (Shoelace Formula / Gauss Area)
$$\text{Area} = \frac{1}{2} \left| \sum_{i=1}^{n} (x_i y_{i+1} - x_{i+1} y_i) \right|$$

---

## 🤖 Architectural AI Studio & AI Control Center

Architecture Helping Hand incorporates a deterministic, fact-grounded architectural AI engine designed specifically to avoid hallucinations:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             FACT-GROUNDED AI ARCHITECTURAL ENGINE                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ ACTIVE DRAWING / PROJECT STATE ]
   • Exact wall polylines & room boundaries
   • Furniture items & ADA clearance offsets
   • Stair risers/treads & IBC calculations
   • Survey calibration & verified measurements
                │
                ▼ (Pure Serialization)
   ┌──────────────────────────────────────────────────────────────────┐
   │ DETERMINISTIC PROJECT FACTS PACK (src/ai/context/)               │
   │ • Formatted Markdown context with exact verified dimensions      │
   │ • Zero invented measurements, zero synthetic room numbers        │
   └──────────────────────────────────────────────────────────────────┘
                │
                ▼ (User Request + Persona System Prompt)
   ┌──────────────────────────────────────────────────────────────────┐
   │ MODEL ROUTING & TRANSPORT (src/services/ai/)                     │
   │ • Local Ollama (100% private, offline)                           │
   │ • OpenAI (GPT-4o, o3-mini) · Anthropic (Claude 3.5 Sonnet)       │
   │ • Google Gemini (Gemini 1.5 Pro, 2.0 Flash) · DeepSeek · GLM     │
   └──────────────────────────────────────────────────────────────────┘
                │
                ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │ STRUCTURED ACTION EXECUTION (src/ai/validators/)                 │
   │ • AI parses architectural critique, code alerts, and actions     │
   │ • Optional 1-click execution: adds walls, rooms, or furniture     │
   └──────────────────────────────────────────────────────────────────┘
```

* **Omnipresent Slide-Down AI Drawer**: Click <kbd>✨ AI Assistant</kbd> anywhere to slide down the AI co-pilot directly over your active drawing without losing your place.
* **Multi-Provider Support**: Connect your own keys or local endpoints:
  - **Local Ollama**: 100% offline, private, zero-cost AI execution.
  - **OpenAI**: GPT-4o, GPT-4o-mini.
  - **Anthropic**: Claude 3.5 Sonnet, Claude 3.7.
  - **Google Gemini**: Gemini 1.5 Pro, Gemini 2.0 Flash.
  - **DeepSeek**: DeepSeek-V3, DeepSeek-R1.
  - **Zhipu GLM**: GLM-4 series.
* **Architectural AI Jobs**: 11 specialized job roles: General Assistant, Design Critique (Studio Jury), Building Code Auditor (IBC/ADA), Space Planning Advisor, Concept Ideator, Specification Writer, and Structural Advisor.

---

## ⌨️ Keyboard Shortcuts & CAD Commands

### Global Application Shortcuts
| Key | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Open **Global Architectural Command Palette** |
| <kbd>Enter</kbd> | Run calculation for active tool / Execute CAD command |
| <kbd>S</kbd> | Swap Conversion Direction (Drawing ↔ Real World) |
| <kbd>Q</kbd> | Toggle **Quick Dimension Strip** (Micro-Tool) |
| <kbd>H</kbd> | Toggle Calculation History Drawer |
| <kbd>Esc</kbd> | Close Modals / Cancel Drawing Operation / Clear Selection |
| <kbd>1</kbd> – <kbd>0</kbd> | Quick-switch to Modes 1 through 10 |
| <kbd>C</kbd> | Open CAD Clipboard (Mode 11) |
| <kbd>B</kbd> | Open Batch CAD Converter (Mode 12) |
| <kbd>?</kbd> | Open Keyboard Shortcuts Cheat Sheet |

### AutoCAD / Plan CLI Commands
Type these directly into the docked command prompt (`Command: `):
| Command | Alias | Action / Parameters |
| :--- | :--- | :--- |
| `LINE` | `L` | Start continuous 2D line drafting |
| `PLINE` | `PL` | Start multi-segment polyline drafting |
| `WALL` | `W` | Start parametric wall segment drafting (`WALL 5m`) |
| `ROOM` | `REC` | Draw parametric room rectangle (`REC 6 4` for $6\text{m} \times 4\text{m}$) |
| `DOOR` | `DR` | Insert architectural hinged door with swing arc |
| `WINDOW` | `WN` | Insert glazed architectural window unit |
| `STAIR` | `STR` | Insert code-compliant staircase entity |
| `COLUMN` | `COL` | Insert structural column pier at coordinate |
| `DIMLIN` | `DAL` | Draw linear dimension string with witness lines |
| `SNAP` | — | Set snap grid increment (`SNAP 0.5m` or `SNAP 0.1m`) |
| `ORTHO` | — | Toggle orthogonal constraint mode (90° lock) |
| `OSNAP` | — | Toggle object snapping (`END`, `MID`, `INT`, `PERP`) |
| `HATCH` | `H` | Apply architectural poché or hatching pattern |
| `DIST` | `DI` | Measure distance between two points |
| `HELP` | `?` | Display active tool assistance and command list |

---

## 💻 How to Run, Build & Test

### 1. Instant Local Launch (Zero Installation)
Simply double-click `index.html` or open it in any modern browser (Chrome, Edge, Firefox, Safari, Brave, Opera). It works 100% offline via the `file:///` protocol.

### 2. Local HTTP Server (Full PWA Support)
```bash
# Using Node.js (serves on port 3500)
npm start

# Or using Python 3
python -m http.server 3500
```
Open `http://localhost:3500` in your browser to enable desktop installation and Service Worker offline caching.

### 3. Run the Complete Automated Test Suite
```bash
npm test
```
Executes all **49 test suites** and validates **4,583 assertions** (100% passing rate). The runner provides a complete summary of data integrity, geometry math, stair/ramp heuristics, CAD exporters, and DOM contracts.

### 4. Build the Standalone Bundle
```bash
npm run build
```
Compiles modular ES6 files from `src/` into the production bundle [`js/app.js`](js/app.js) with zero npm dependencies.

### 5. Verify Build Synchronization
```bash
node scripts/build.js --check
```
Ensures that the standalone bundle is 100% byte-synchronized with the source modules in `src/`.

---

## 📚 Complete Documentation Index

For in-depth architectural specifications and subsystem documentation, consult the specialized markdown references in this repository:

* [ENGINEERING_RULES.md](ENGINEERING_RULES.md) — The fundamental 3-tier architectural frozen rules, error handling contracts, and coding standards.
* [STUDIO_PERSONAS.md](STUDIO_PERSONAS.md) — Comprehensive technical design document for the 5 Software Personas and 16 Tool Categories.
* [DIMENSION_CHAINS.md](DIMENSION_CHAINS.md) — Mathematical specification for continuous dimension chains, datums, and architectural poché bands.
* [STAIRS.md](STAIRS.md) — Geometric formulas, riser/tread counts, Blondel heuristics, and IBC/ADA compliance contracts for stairs.
* [RAMPS.md](RAMPS.md) — Straight-run ramp slope ratios ($1:12$), percentages, and accessible landing heuristics.
* [SLOPES.md](SLOPES.md) — Universal rise/run mathematical engine, directional signing, and terrain gradient specifications.
* [CAD_CLIPBOARD.md](CAD_CLIPBOARD.md) — Numerical normalization formatting for AutoCAD, Rhino, Revit, and SketchUp.
* [BATCH_CAD.md](BATCH_CAD.md) — High-throughput bulk scaling engine and multi-delimiter table parser.
* [QUICK_DIMENSION.md](QUICK_DIMENSION.md) — Specification for the omnipresent floating micro-tool glance instrument.
* [SURVEY.md](SURVEY.md) — Field measurement logging, provenance tracking, and 2-point image calibration engine.
* [IMPORTS.md](IMPORTS.md) — Ingestion contracts for 2D DXF, SVG, CSV, TSV, and native Project JSON.
* [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) — Architecture of the deterministic facts pack generator and zero-hallucination AI pipeline.
* [AI_PROVIDERS.md](AI_PROVIDERS.md) — Configuration guide for local Ollama, OpenAI, Anthropic, Gemini, DeepSeek, and GLM.
* [AI_JOBS.md](AI_JOBS.md) — Task definition catalog for the 11 specialized architectural AI jobs.
* [AI_CONTROL_CENTER.md](AI_CONTROL_CENTER.md) — Specification for provider key management, connection testing, and model routing.
* [UI_UX.md](UI_UX.md) — UI design standards, WCAG AAA slate color palettes, typography pairings, and layout systems.

---

*Architecture Helping Hand • Built for Architects, Designers & Engineers • High-Precision Scaling Engine*
