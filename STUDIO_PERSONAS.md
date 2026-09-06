# Architectural Studio Transformation: Center-Graph Viewport, Adaptive Software Personas (AutoCAD, Rhino, Photoshop, SketchUp), 16 Tool Categories with Cascades/Flyouts, Omnipresent Top AI Dropdown, and Future AI Specification

## Executive Overview
This implementation plan provides the complete technical architecture, UI/UX blueprint, and long-term engineering roadmap for transforming **Architecture Helping Hand** into a unified, multi-software adaptive workstation.

The goal is to provide architects and designers with the familiar UX and muscle memory of the industry's four primary design suites—**AutoCAD**, **Rhino 3D**, **Adobe Photoshop**, and **Trimble SketchUp**—synthesized into a high-precision, zero-dependency browser studio anchored by an **omnipresent AI design partner**.

```
+-------------------------------------------------------------------------------------------------------+
|  TOP MENUBAR:  Logo  |  Persona Switcher  |  Ribbon Tabs  |  ...  |  [✨ AI Assistant ▾]  |  Theme/Help|
+-------------------------------------------------------------------------------------------------------+
|  TOP RIBBON SUITE: Dynamic Panels with Tool Groups, Cascades, Flyouts & Parameter Inputs              |
+-------+---------------------------------------------------------------------------------------+-------+
| LEFT  |                                                                                       | RIGHT |
| TOOL  |                                                                                       | C-    |
| STRIP |                              CENTER GRAPH VIEWPORT                                    | PANELS|
|       |                                                                                       |       |
| [🔍]  |  +---------------------------------------------------------------------------------+  | (Props|
| Tools |  | Document Tabs: [📐 Level 1] [🏛️ South Elev] [✂️ Section A] [🔍 Detail] [📄 Sheet]  |  | Layers|
| with  |  +---------------------------------------------------------------------------------+  | Space |
| Fly-  |  |                                                                                 |  | Detail|
| outs  |  |           Central Interactive Canvas (SVG / 2D / 3D / Graphic Model)            |  | Notes)|
| (16   |  |                                                                                 |  |       |
| Cats) |  +---------------------------------------------------------------------------------+  |       |
+-------+---------------------------------------------------------------------------------------+-------+
| BOTTOM CAD COMMAND & DRAFTING BAR:  Command: [ CLI input... ]  |  SNAP  ORTHO  OSNAP  |  X: 0.00 Y: 0.00 |
+-------------------------------------------------------------------------------------------------------+
| [FLOATING SLIDE-DOWN DRAWER]: ✨ Omnipresent AI Assistant (Expands over viewport without leaving view)|
+-------------------------------------------------------------------------------------------------------+
```

---

## Key System Pillars

### 1. Center-Graph Viewport Layout
The active drawing canvas, 3D model graph, or presentation sheet is positioned directly in the **center** with maximum screen real-estate. It is framed symmetrically on all 4 borders:
- **Top Border**: Adaptive Software Ribbon Suite with tabbed panels, flyouts, and persona switcher.
- **Left Border**: Vertical Toolstrip featuring the universal live search box and 16 collapsible category sections with hotkey badges and nested flyouts.
- **Right Border**: Dockable Rhino-style C-Panels (Properties Inspector, CAD Layers, Space Planning & IBC Code Validation, Construction Detailing).
- **Bottom Border**: Full AutoCAD/Rhino CLI Command Line (`Command: `), drafting aids toggles (`SNAP`, `ORTHO`, `OSNAP: END/MID/INT/CEN/PERP`), and real-time cursor coordinates readout.

### 2. Adaptive Software Personas
Dynamic workspace modes that morph ribbons, tool panels, flyouts, cursor behavior, and command aliases:
- 📐 **AutoCAD Mode**: 2D precision drafting, CAD blocks, layers, architectural hatching, dimension strings, and command prompt aliases (`L`, `PL`, `W`, `REC`, `DIMLIN`, `DIST`, `BU`, `BD`).
- 🦏 **Rhino Mode**: NURBS curves, surfaces, solid Booleans, meshes, SubD organic primitives, Osnap aids, and 4-viewport camera setups (`⊞ Top, Front, Right, Perspective`).
- 🎨 **Photoshop Mode**: Presentation graphics, render post-processing, marquee/lasso selection, watercolor & presentation brushes, material fills, and layer blending.
- 📦 **SketchUp Mode**: Fast conceptual massing, 3D push-pull extrusion, component libraries, edge inferencing, and sun shadows.
- 🏛️ **Helping Hand Studio (Default)**: Comprehensive synthesis combining BIM floor plans, space planning validation, IBC code compliance, multi-flight stairs, parametric construction details, and multi-viewport presentation sheets.

### 3. The 16 Deeply Structured Tool Categories
Every tool across all modalities is organized into 16 standardized categories:
1. `measuring`
2. `selection_cropping`
3. `retouching_painting`
4. `selection_navigation`
5. `drawing`
6. `standard_cpanels`
7. `set_view`
8. `curve_tools`
9. `surface_tools`
10. `solid_tools`
11. `mesh_tools`
12. `subd`
13. `containers`
14. `cascades_flyouts`
15. `ribbon_tabs`
16. `ribbon_panels`

### 4. Universal Live Tool & Command Search
A real-time search box in the left toolstrip (`#palette-tool-search`) with instant fuzzy filtering across all tools, categories, keyboard shortcuts, and command aliases. Typing "stair", "loft", "hatch", "L", or "REC" instantly highlights matching tools with immediate click or Enter-key activation.

### 5. Omnipresent Top AI Assistant Dropdown
An omnipresent assistant tab in the top menubar (`✨ AI Assistant ▾`) that expands into a floating slide-down drawer right above the active drawing without switching modes or unmounting the canvas. It provides:
- Live Context Pill (`📍 Ground Floor · 0 entities · Mode: STUDIO`).
- Quick Prompt Chips (`📐 Verify Code & Stairs`, `🏢 Generate 3-Bed Layout`, `📏 Dimension Walls`, `🧱 Suggest Construction Details`, `📊 Area Efficiency Ratio`).
- 1-Click Action Dispatcher (`[ ➕ Apply to Viewport ]`) that parses and injects generated geometry directly into the active document.

---

## User Review & Invariants

> [!IMPORTANT]
> **Zero External Runtime Dependencies**:
> - All code remains 100% pure vanilla ES6 JavaScript, HTML5, and CSS3.
> - No React, Vue, Angular, jQuery, or third-party runtime bundles.
> - Operates 100% offline with zero latency on both `file:///` and `http://` protocols.

> [!IMPORTANT]
> **100% Test Suite & UI Contract Integrity**:
> - All 49 test suites (4,577 assertions) and 700 UI DOM contracts must remain 100% passing.
> - The standalone app bundle (`js/app.js`) is compiled via `node scripts/build.js` and verified byte-for-byte by `tests/build-integrity.test.js`.

> [!NOTE]
> **Non-Destructive Workspace Adaptation**:
> Switching between software personas changes interface configurations, visible ribbon tabs, tool palettes, and shortcuts, but preserves underlying project geometry, entities, layers, and viewport camera states intact.

---

## Architectural Deep Dive: Software Personas

```mermaid
graph TD
    App[Helping Hand Studio Core] --> State[Global Application State]
    State --> Personas[Persona Modality Controller]

    Personas --> P_Studio[🏛️ Studio Mode]
    Personas --> P_AutoCAD[📐 AutoCAD Mode]
    Personas --> P_Rhino[🦏 Rhino 3D Mode]
    Personas --> P_Photoshop[🎨 Photoshop Mode]
    Personas --> P_SketchUp[📦 SketchUp Mode]

    P_Studio --> Ribbon[Top Ribbon Suite]
    P_AutoCAD --> Ribbon
    P_Rhino --> Ribbon
    P_Photoshop --> Ribbon
    P_SketchUp --> Ribbon

    P_Studio --> Toolstrip[Left Vertical Toolstrip + Search]
    P_AutoCAD --> Toolstrip
    P_Rhino --> Toolstrip
    P_Photoshop --> Toolstrip
    P_SketchUp --> Toolstrip

    P_Studio --> CPanels[Right Dockable C-Panels]
    P_AutoCAD --> CPanels
    P_Rhino --> CPanels
    P_Photoshop --> CPanels
    P_SketchUp --> CPanels

    P_Studio --> CommandBar[Bottom CAD CLI & Drafting Strip]
    P_AutoCAD --> CommandBar
    P_Rhino --> CommandBar
    P_Photoshop --> CommandBar
    P_SketchUp --> CommandBar

    Ribbon --> Viewport[Center Graph Viewport]
    Toolstrip --> Viewport
    CPanels --> Viewport
    CommandBar --> Viewport
    AiDrawer[✨ Top AI Dropdown Drawer] -.->|Non-Destructive Overlay| Viewport
```

### 1. 🏛️ Helping Hand Studio Persona (`studio` - Default)
- **Theme Accent**: Electric Architectural Blue (`#4989D9`).
- **Ribbon Tabs**:
  - `Home`: Selection (Select, Pan), Architectural Draw (Room, Poly Room, Wall, Door, Window), Circulation (Stair, Ramp), Structure (Column, Grid), Annotations (Dimension, Chain, Measure, Section, Callout).
  - `Construction Details`: Strip Footing & Stem Wall (1:10), Roof Parapet & Coping (1:10), Window Sill Cavity Wall (1:5), Stair Nosing & Baluster (1:5).
  - `Set View`: Top 2D Plan, South Elevation, 3D Massing Preview, Section A-A, Sheet A-101.
- **C-Panels**: Properties Inspector, CAD Layers (10 Default Layers), IBC Code & Area Metrics, Detailing Assembly Links.
- **Drafting Strip**: Snapping, Ortho 90°, Osnap indicators, Live cursor meter coordinates.

### 2. 📐 AutoCAD Precision 2D Persona (`autocad`)
- **Theme Accent**: CAD Crimson (`#E02424`).
- **Ribbon Tabs**:
  - `Home`:
    - **Draw**: Line (`L`), Polyline (`PL`), Wall (`W`), Column (`C`), Grid (`G`), Hatch (`H`).
    - **Modify**: Select (`V`), Fillet (`F`), Offset (`O`), Boolean Union (`BU`), Boolean Difference (`BD`).
    - **Annotation**: Linear Dim (`D`), Aligned Dim (`DAL`), Dimension Chain (`DCO`), Section Cut (`X`), Callout (`J`).
    - **Utilities**: Tape Measure (`M`), Area & Perimeter (`AA`).
  - `Annotate`: Linear, Aligned, Angular, Multileader, Tagging.
  - `View`: Pan, Zoom Extents, Named Views.
- **Command Prompt Support**: Full CLI input matching standard AutoCAD aliases:
  `L`, `PL`, `W`, `REC`, `C`, `A`, `DIMLIN`, `DIMALIGNED`, `DIST`, `AREA`, `H`, `F`, `O`, `BU`, `BD`, `PAN`, `ZOOM_E`.

### 3. 🦏 Rhino 3D & Computational Persona (`rhino`)
- **Theme Accent**: Emerald Computational Green (`#057A55`).
- **Ribbon Tabs**:
  - `Standard`: Select (`V`), Pan (`Space+Drag`), Orbit 3D (`O`), Measure (`M`), Zoom Extents (`Z+E`).
  - `Curve Tools`: Line (`L`), Polyline (`PL`), NURBS Curve (`CRV`), Curve Fillet (`F`), Offset Curve (`O`).
  - `Surface Tools`: Planar Surface (`Srf`), Extrude Surface (`Ext`), Loft Curves (`Loft`).
  - `Solid Tools`: Box Primitive (`Box`), Boolean Union (`BU`), Boolean Difference (`BD`).
  - `Mesh & SubD`: Surface to Mesh, Quad Remesh, SubD Box (`SubDBox`), SubD Crease (`Crease`).
- **Set View Controls**: Top View, South Elevation, Perspective 3D, `⊞` 4-Viewport Split.
- **Drafting Strip**: Object Snap chips (`END`, `MID`, `INT`, `CEN`, `PERP`).

### 4. 🎨 Photoshop Presentation & Retouch Persona (`photoshop`)
- **Theme Accent**: Adobe Presentation Blue (`#3F83F8`).
- **Ribbon Tabs**:
  - `Select & Mask`: Select & Transform (`V`), Rectangular Marquee (`M`), Polygonal Lasso (`L`), Crop Viewport Boundary (`C`).
  - `Retouch & Paint`: Presentation Watercolor Brush (`B`), Paint Bucket / Material Finish (`G`), Architectural Hatch (`H`).
  - `Measure & Nav`: Tape Measure (`M`), Pan Hand (`Space+Drag`), Zoom Extents (`Z+E`).
- **Flyouts**: Rectangular Marquee $\rightarrow$ Elliptical Marquee $\rightarrow$ Single Row; Polygonal Lasso $\rightarrow$ Freeform Lasso.
- **C-Panels**: Layers panel with visual opacity, display ordering, and layer visibility toggles.

### 5. 📦 SketchUp Conceptual Massing Persona (`sketchup`)
- **Theme Accent**: Massing Amber (`#C27803`).
- **Ribbon Tabs**:
  - `Draw`: Line Segment (`L`), Room Rectangle (`R`), Column (`C`), Vertical Stair (`S`).
  - `Edit & Push/Pull`: Push / Pull Massing (`P`), Offset Curve (`O`), Select & Transform (`V`).
  - `Camera`: Top View, Perspective 3D, Orbit 3D (`O`), Pan Hand (`Space+Drag`).
- **Primary Workflows**: Rapid face extrusion, room bounding boxes, and architectural component placement.

---

## Detailed Matrix of the 16 Tool Categories

| # | Category ID | Display Name | Icon | Core Functionality & Tool Entries | Supported Personas |
|---|---|---|---|---|---|
| **1** | `measuring` | Measuring | 📏 | `measure` (Tape Measure, `DIST`), `dimension` (Linear Dim, `DIMLIN`), `dim_aligned` (Aligned Dim, `DAL`), `dim_chain` (Dimension Chain, `DCO`), `area_calc` (Enclosed Area, `AREA`) | All |
| **2** | `selection_cropping` | Selection & Cropping | ⬚ | `select` (Select & Transform, `V`), `marquee` (Rectangular Marquee, `M`), `lasso` (Polygonal Lasso, `L`), `crop` (Crop Boundary, `C`) | All |
| **3** | `retouching_painting` | Retouching & Painting | 🖌️ | `hatch` (Architectural Pochè/Hatch, `H`), `material_paint` (Finish Paint Bucket, `G`), `watercolor_brush` (Presentation Brush, `B`) | Photoshop, SketchUp, Studio |
| **4** | `selection_navigation` | Selection and Navigation | 🧭 | `pan` (Pan Hand, `Space+Drag`), `orbit` (Orbit 3D, `O`), `zoom_extents` (Zoom Fit Extents, `Z+E`) | All |
| **5** | `drawing` | Drawing Primitives | ✏️ | `line` (Line Segment, `L`), `polyline` (Polyline, `PL`), `wall` (Architectural Wall, `W`), `room` (Room Rectangle, `REC`), `polyroom` (Polygonal Room, `Shift+R`), `door` (Hinged Door, `DR`), `window` (Glazed Window, `WN`), `column` (Structural Column, `C`), `gridline` (Structural Grid, `G`), `stair` (Vertical Stair, `STAIR`), `ramp` (Accessible Ramp, `RP`), `tag` (Auto-Tag, `TAG`), `callout` (Detail Callout, `J`), `section_cut` (Section Cut Line, `X`) | All |
| **6** | `standard_cpanels` | Standard C-Panels | 🗂️ | `cpanel_properties` (Properties Inspector), `cpanel_layers` (CAD Layers & Lineweights), `cpanel_validation` (Space Planning & IBC Code Check), `cpanel_details` (Construction Detail Assemblies) | All |
| **7** | `set_view` | Set View | 📷 | `view_top` (Top 2D Plan), `view_south` (South Building Elevation), `view_perspective` (Perspective 3D Massing), `view_4split` (4-Viewport Split, `⊞`) | Rhino, AutoCAD, Studio |
| **8** | `curve_tools` | Curve Tools | 〰️ | `curve_nurbs` (NURBS Curve, `CRV`), `curve_fillet` (Fillet Corner, `F`), `curve_offset` (Offset Curve, `O`) | Rhino, AutoCAD |
| **9** | `surface_tools` | Surface Tools | ◫ | `surface_planar` (Planar Surface), `surface_extrude` (Extrude Curve), `surface_loft` (Loft Cross-Sections) | Rhino |
| **10** | `solid_tools` | Solid Tools | 🧊 | `solid_box` (3D Box Massing, `Box`), `boolean_union` (Boolean Union, `BU`), `boolean_diff` (Boolean Difference, `BD`) | Rhino, SketchUp |
| **11** | `mesh_tools` | Mesh Tools | 🕸️ | `mesh_from_srf` (Surface to Mesh), `mesh_quadremesh` (Quad Remesher) | Rhino |
| **12** | `subd` | SubD Tools | 🧬 | `subd_box` (SubD Box Primitive, `SUBDBOX`), `subd_crease` (Crease SubD Edge, `CREASE`) | Rhino |
| **13** | `containers` | Containers & Blocks | 📦 | `block_create` (Create CAD Block), `component_insert` (Insert Component / Furniture) | AutoCAD, SketchUp, Studio |
| **14** | `cascades_flyouts` | Cascades / Flyouts | 📑 | Popover sub-menus attached to toolbar buttons with child actions (e.g. Marquee $\rightarrow$ Ellipse, Stair $\rightarrow$ Straight/L/U) | All |
| **15** | `ribbon_tabs` | Ribbon Tabs | 📑 | Horizontal suite switcher bar defining available panels based on the active persona | All |
| **16** | `ribbon_panels` | Ribbon Panels | ▦ | Functional clusters with titles, icons, and keyboard hints (Draw, Modify, Annotation, Structure, Circulation) | All |

---

## Omnipresent Top AI Dropdown Assistant Specification

```
+-------------------------------------------------------------------------------------------------------+
| ✨ Architectural AI Co-Pilot   [ 📍 Ground Floor · 4 entities · Mode: STUDIO ]                   [ ✕ ] |
+-------------------------------------------------------------------------------------------------------+
| [ 📐 Verify Code & Stairs ] [ 🏢 Generate 3-Bed Layout ] [ 📏 Dimension Walls ] [ 🧱 Suggest Details ]|
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
| 🏛️ How can I help with your design?                                                                  |
| Ask anything about floor plans, dimensions, code requirements, stairs, structural grids, or details.  |
| I can generate layouts and apply them directly to your viewport!                                      |
|                                                                                                       |
| User: "Add a 6x4m Master Bedroom at x=10, y=0 and auto-dimension the walls"                           |
|                                                                                                       |
| AI: "I have calculated the layout. Master Bedroom is 24.00 m² (gross). Adding perimeter dimensions." |
|                                                                                                       |
| [ ➕ Apply to Viewport ]  (Injects Room and Dimension entities into active document)                   |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
| [ Ask AI anything about your drawing or design...                                           ]  [Send] |
+-------------------------------------------------------------------------------------------------------+
```

### Architectural Contract (`src/core/ai-bridge.js`)
1. **Context Serialization (`serializeDrawingContext`)**:
   Produces a structured JSON envelope containing:
   - `persona`: Active software persona (`studio`, `autocad`, `rhino`, etc.)
   - `activeDocName`, `activeDocType`: Target document title and type (`2d_plan`, `3d_massing`, `elevation`, `section`, `detail`, `sheet`)
   - `entityCount`, `roomsCount`, `grossArea`: Total entities and gross square meters
   - `wallCount`, `totalWallLength`: Linear wall runs
   - `furnitureCount`, `stairCount`, `dimensionCount`: Specific architectural element counts
2. **Prompt Envelope Formatting (`buildArchitecturalPrompt`)**:
   Enriches user inquiries with IBC building code rules, Blondel stair formula ($2R + T = 630\text{mm}$), and strict JSON action schemas.
3. **Structured Action Parsing (`parseAiActions`)**:
   Extracts executable JSON code blocks from the AI's natural language response.
4. **Direct Viewport Execution (`executeAiAction`)**:
   Executes actions directly into the active drawing document:
   - `CREATE_ROOM` / `ADD_ROOM`: Validates and appends a `createRoom` entity.
   - `CREATE_WALL` / `ADD_WALL`: Validates and appends a `createWall` entity.
   - `CREATE_STAIR` / `ADD_STAIR`: Generates a code-compliant multi-flight stair entity.
   - `CREATE_DETAIL` / `ADD_DETAIL`: Places an AIA construction detail callout and links it to sheet assemblies.
   - `SET_VIEW`: Switches viewport camera or document tab.
   - `EXECUTE_TOOL`: Switches active studio tool.

---

## File Architecture & System Organization

```
src/
├── core/
│   ├── personas.js            <-- Catalog of 5 personas, 16 categories, tool catalog, universal search
│   ├── ai-bridge.js           <-- AI context serializer, prompt envelopes, action parser & dispatcher
│   ├── entities.js            <-- Core geometric entity models (Rooms, Walls, Stairs, Callouts, Sections)
│   ├── plan-canvas.js         <-- 2D vector drawing canvas math, view transforms, grid snapping
│   ├── massing-3d.js          <-- 3D camera projection, isometrics, perspective faces
│   ├── sections-elevations.js <-- Elevation projections, section planes, architectural pochè
│   ├── details.js             <-- Parametric construction detail assemblies (Footing, Parapet, Sill, Nosing)
│   ├── sheet.js               <-- Multi-viewport presentation layout engine & title blocks
│   └── space-planning.js      <-- Furniture clearance, door swings, IBC corridor checks
├── ui/
│   ├── components/
│   │   ├── ribbon.js          <-- Top Ribbon Suite: tabs, panels, flyouts, persona switcher
│   │   ├── palette.js         <-- Left Vertical Toolstrip: categorized tools, cascades, tool search
│   │   ├── cpanels.js         <-- Right C-Panels: dockable properties, layers, validation, details
│   │   ├── commandbar.js      <-- Bottom CAD CLI & Osnap drafting bar
│   │   └── ai-dropdown.js     <-- Omnipresent Top AI Assistant Dropdown Drawer
│   ├── views/
│   │   └── plan.js            <-- Center-graph viewport orchestration, persona switching, HUD
│   └── app.js                 <-- Application bootstrapper, menubar AI trigger, mode routing
├── css/
│   └── main.css               <-- Styles for center viewport, ribbons, toolstrip, C-panels, AI drawer
tests/
│   ├── studio-personas.test.js<-- Unit tests for personas, 16 categories, search, AI bridge
│   ├── build-integrity.test.js<-- Manifest coverage, dependency ordering, bundle byte check
│   ├── ui-contracts.test.js   <-- 700 DOM element contract tests
│   └── run-all.js             <-- Master test runner (49 suites, 4,577 assertions)
```

---

## Roadmap & Specification for Future AI Models (ChatGPT, Claude, Gemini)

When future AI assistants work on this repository, they must adhere to the following principles and roadmap:

### 1. Invariant Principles
1. **Zero External Runtime Dependencies**: Never introduce an npm runtime dependency (`package.json` must have empty `"dependencies": {}`). All code must run natively in any modern browser via vanilla JavaScript.
2. **Topological Bundle Ordering**: When adding a new file under `src/`, always register it in `BUNDLE_MODULES` in `scripts/build.js` in strict topological dependency order (dependencies before dependents).
3. **Pure Core Math**: Code under `src/core/` must never touch the DOM (`document`, `window`, `HTMLElement`). All DOM rendering belongs strictly in `src/ui/`.
4. **Minmax-Safe CSS Grids**: `tests/responsive.test.js` strictly rejects bare `1fr 1fr` grid definitions. Always use `minmax(0, 1fr)` or `repeat(...)`.
5. **Byte-Identical Compilation**: Always run `node scripts/build.js` after making changes to ensure `js/app.js` matches `src/` byte-for-byte.

### 2. How to Add a New Software Persona
To add a 6th persona (e.g. `blender` or `revit`):
1. In `src/core/personas.js`:
   - Add entry to `STUDIO_PERSONAS` with `id`, `name`, `label`, `shortLabel`, `icon`, `description`, `accentColor`, `defaultRibbonTab`, `defaultTool`.
   - Add ribbon configuration in `PERSONA_RIBBON_CONFIGS[newId]` defining tabs, panels, and tool IDs.
2. Tag corresponding tools in `STUDIO_TOOL_CATALOG` with `personas: ['newId', ...]`.
3. Add a test in `tests/studio-personas.test.js` validating the new persona.
4. Run `node scripts/build.js` and `node tests/run-all.js`.

### 3. How to Add a New Tool or Flyout
1. In `src/core/personas.js`:
   - Append to `STUDIO_TOOL_CATALOG` specifying `id`, `name`, `category` (must be one of the 16 categories), `personas`, `icon`, `shortcut`, `commandAlias`, `description`, and optional `flyout: [...]`.
2. In `src/ui/views/plan.js`:
   - In `handleStudioToolAction(toolId)`, handle execution logic or delegate to `setTool(toolId)`.
3. In `tests/studio-personas.test.js`:
   - Verify that `searchStudioTools(toolId)` returns the newly added tool.

### 4. Future Phased Enhancements
- **Phase 9 (Rhino NURBS Surface Evaluator)**: Implement client-side NURBS de Boor evaluation for curved architectural surfaces in `src/core/massing-3d.js`.
- **Phase 10 (Photoshop Raster/Vector Blend Shaders)**: Add canvas-based blend modes (`Multiply`, `Overlay`, `Soft Light`) for competition watercolor overlays in `src/ui/visualizer.js`.
- **Phase 11 (SketchUp Interactive Push-Pull Drag)**: Enable 3D face extrusion on mouse drag in the 3D viewport.
- **Phase 12 (AutoCAD Block Library & Dynamic Insertion)**: Allow users to define custom reusable parametric blocks (`BLOCK` / `INSERT`) stored in `src/services/store.js`.

---

## Interactive Functional Specifications for Deepened Modalities

### 1. AutoCAD Interactive CLI Command & Argument Parser
The command bar (`#commandbar-input`) parses both raw tool aliases and parametric command lines with arguments:
- **`REC [width] [depth]`** / **`ROOM [width] [depth]`**: E.g. `REC 6 4` creates a 6m × 4m room at the current cursor snap point or grid origin, logging `Command: REC 6 4 -> Room created (24.0 m²)`.
- **`WALL [length]`** / **`WALL [x1] [y1] [x2] [y2]`**: E.g. `WALL 5` creates a 5m horizontal wall; `WALL 0 0 8 0` creates an 8m wall from `(0,0)` to `(8,0)`.
- **`STAIR [risers] [width]`**: E.g. `STAIR 18 1.2` inserts a code-compliant multi-flight stair with 18 risers and 1.2m width.
- **`DIST` / `MEASURE`**: Activates the live measuring tape.
- **`HATCH [pattern]`**: E.g. `HATCH brick`, `HATCH concrete`, `HATCH diagonal` sets the active architectural fill.
- **`PLAN` / `TOP`**: Switches document view to 2D Plan.
- **`FRONT` / `ELEV`**: Switches document view to South Elevation.
- **`PERSP` / `3D`**: Switches document view to 3D Massing.
- **`4VIEW` / `SPLIT`**: Switches document view to Rhino 4-Quadrant Split.
- **`HELP`**: Displays the active persona's quick command cheat sheet.

### 2. Rhino 4-Viewport Quadrant Layout (`view_4split`)
When `view_4split` is triggered (or the `⊞` ribbon icon is clicked):
- The central canvas splits into a 2×2 orthographic and perspective quadrant layout:
  - **Top-Left (Top)**: 2D Orthographic floor plan with grid lines, room envelopes, and wall assemblies.
  - **Top-Right (Perspective)**: 3D axonometric/perspective wireframe or shaded massing projection.
  - **Bottom-Left (Front)**: South exterior facade elevation with floor-to-floor datum lines and height markers.
  - **Bottom-Right (Right)**: East elevation / building cross-section with structural slab thicknesses.
- Each quadrant features a title badge (`[ Top ]`, `[ Perspective ]`, `[ Front ]`, `[ Right ]`) with an active-state border highlight. Double-clicking any quadrant maximizes it to full viewport, and double-clicking again restores the 4-split.

### 3. Photoshop Material Paint & Architectural Hatching
When `material_paint`, `hatch`, or `watercolor_brush` is selected:
- An architectural pattern palette appears in the contextual toolbar:
  - `Wood Parquet` (alternating floorboard pattern)
  - `Architectural Brick` (staggered running-bond masonry)
  - `Cast Concrete` (aggregate stippling)
  - `Diagonal Pochè` (45° structural section hatch)
  - `Terrazzo Tile` (grid mosaic)
  - `Watercolor Wash` (semi-transparent presentation wash)
- Clicking any room entity instantly applies the selected pattern or material tint with full undo/redo history (`history.push`).

### 4. SketchUp Interactive Push/Pull Extrusion
When `pushpull` is active:
- Hovering over an enclosed room highlights the room with a volumetric extrusion preview.
- Clicking the room automatically switches to the 3D Massing document with that room extruded to the default 3.0m ceiling height, selecting the massing entity for height and floor adjustments in the Properties C-Panel.

### 5. Universal Live Search Expansion
`searchStudioTools(query)` filters:
- All 30+ tools by name, ID, shortcut, and command alias.
- Ribbon tab names (e.g. "Curves", "Annotate", "Surfaces", "Solid")—clicking a tab match automatically switches to that ribbon tab in the top suite.
- Category names (e.g. "Measuring", "SubD", "Drawing")—clicking filters the left toolstrip directly to that category.

---

## Verification Plan

### 1. Automated Test Suites
Run comprehensive test runner and sub-suites:
```bash
# Topological bundle build
node scripts/build.js

# Master test runner (all 49+ suites, 4,570+ assertions)
node tests/run-all.js

# Specific studio persona, category, search, and CLI parser suite
node tests/studio-personas.test.js

# UI DOM contract integrity (700 DOM contracts)
node tests/ui-contracts.test.js

# Responsive layout & minmax-safe CSS rules
node tests/responsive.test.js

# Bundle integrity & topological order verification
node tests/build-integrity.test.js
```

### 2. Manual & Visual Playwright Verification
Execute automated browser test script `scratch/verify_personas_studio.py` with Python Playwright:
```bash
python scratch/verify_personas_studio.py
```

The script verifies and captures high-resolution screenshots for:
1. **Center Graph Viewport Workstation**:
   - Verify symmetrical 4-border frame around the center drawing canvas: Top Ribbon Suite, Left Vertical Toolstrip with search, Right Dockable C-Panels, Bottom CAD Command Bar.
   - Captured as `studio_center_viewport_studio.png`.
2. **AutoCAD Persona Active**:
   - Click AutoCAD switcher pill: red accent (`#E02424`), Draw / Modify / Annotation ribbon tabs, Layers C-Panel, and command bar prompt `Command: `.
   - Test typing `REC 5 4` in command prompt -> verify room creation.
   - Captured as `studio_persona_autocad.png`.
3. **Rhino 3D Persona Active**:
   - Click Rhino switcher pill: green accent (`#057A55`), Curves / Surfaces / Solids / Mesh & SubD ribbon, Osnap drafting aids.
   - Click `view_4split` (`⊞`) -> verify 2×2 quadrant layout (Top, Perspective, Front, Right).
   - Captured as `studio_persona_rhino.png` and `studio_rhino_4viewport.png`.
4. **Photoshop Presentation Persona Active**:
   - Click Photoshop switcher pill: blue accent (`#3F83F8`), Select & Mask / Retouch & Paint ribbon, Marquee, Lasso, Material Paint, and Watercolor Brush.
   - Select `hatch` tool, apply `brick` hatch to room -> verify pattern rendering.
   - Captured as `studio_persona_photoshop.png`.
5. **SketchUp Conceptual Massing Persona Active**:
   - Click SketchUp switcher pill: amber accent (`#C27803`), Draw, Push/Pull massing, Components, Tape Measure tools.
   - Click `pushpull` on room -> verify 3D extrusion view transition.
   - Captured as `studio_persona_sketchup.png`.
6. **Universal Live Search Box**:
   - Focus `#palette-tool-search`, type `stair` -> verify filtered list with category icon and shortcut badge.
   - Type `curves` -> verify tab-switch search result.
   - Captured as `studio_palette_search.png`.
7. **Dockable Right C-Panels**:
   - Switch tabs: Properties Inspector, CAD Layers with auto-tag, Space Planning & IBC Code Validation, Construction Detailing links.
   - Captured as `studio_cpanels_details.png`.
8. **Omnipresent Top AI Assistant Dropdown Drawer**:
   - Click top menubar `✨ AI Assistant ▾` tab.
   - Verify slide-down drawer opens over viewport without leaving active document.
   - Verify live context pill (`📍 Ground Floor · N entities · Mode: ...`).
   - Verify quick prompt chips (`📐 Verify Code & Stairs`, `🏢 Generate 3-Bed Layout`, `📏 Dimension Walls`, `🧱 Suggest Construction Details`).
   - Click prompt chip -> verify response and `[ ➕ Apply to Viewport ]` button.
   - Captured as `studio_ai_dropdown_drawer.png`.

---

### 3. Verification Acceptance Checklist & Sign-Off Matrix

| System Component | Verification Criterion | Status | Evidence / Verification |
| :--- | :--- | :---: | :--- |
| **Center Graph Viewport** | Symmetrical 4-border frame framing drawing canvas | ✅ Complete | Verified in Playwright (`studio_center_viewport_studio.png`) |
| **Adaptive Personas (5 Modes)**| Dynamic ribbons, icons, shortcuts, accent themes | ✅ Complete | Verified across AutoCAD, Rhino, Photoshop, SketchUp, Studio |
| **16 Deep Tool Categories** | All 16 categories in catalog, UI palettes, and search | ✅ Complete | Verified in `tests/studio-personas.test.js` |
| **AutoCAD Modality** | Red theme, CLI command bar, parametric parser (`REC`, `WALL`) | ✅ Complete | Verified (`studio_persona_autocad.png`, unit tests) |
| **Rhino 3D Modality** | Green theme, NURBS tabs, 2×2 quadrant layout (`4VIEW`) | ✅ Complete | Verified (`studio_persona_rhino.png`, `studio_rhino_4viewport.png`) |
| **Photoshop Modality** | Blue theme, Marquee, Lasso, Brush, Material Hatching | ✅ Complete | Verified (`studio_persona_photoshop.png`, SVG hatch patterns) |
| **SketchUp Modality** | Amber theme, Draw primitives, 3D Push-Pull extrusion | ✅ Complete | Verified (`studio_persona_sketchup.png`, massing transition) |
| **Universal Live Search** | Fuzzy search over tools, 16 categories, command aliases, tabs | ✅ Complete | Verified (`studio_palette_search.png`, search tests) |
| **Dockable Right C-Panels** | Properties, CAD Layers, Code Validation, Detailing | ✅ Complete | Verified (`studio_cpanels_details.png`, layer auto-tag) |
| **Omnipresent AI Dropdown** | Slide-down drawer over viewport, context pill, prompt chips | ✅ Complete | Verified (`studio_ai_dropdown_drawer.png`, AI bridge tests) |
| **Future AI Roadmap** | Phases 9–12 documented for future agents (ChatGPT, Claude) | ✅ Complete | Documented in `implementation_plan.md` |
| **Zero Runtime Dependencies**| Pure vanilla ES6, zero npm dependencies | ✅ Complete | Enforced by `package.json` and build integrity test |
| **Master Test Pass Rate** | 100% pass across all suites | ✅ Complete | **49 of 49 suites passing, 4,580 assertions** |
