/**
 * Architecture Helping Hand — Complete Tool Guidance Catalog
 *
 * UNIQUE guidance for EVERY catalog tool: purpose, step-by-step workflow
 * (select what → then what), the relevant IBC/ADA/architectural standard,
 * and a tool-specific pro tip. No shared filler text; each entry is
 * written for how its tool is actually operated in this app.
 *
 * Shape: { name, icon, shortcut?, category, desc, usage: [steps],
 *          standards, proTip }
 */

export const TOOL_GUIDANCE_CATALOG = {

  // ------------------------------------------------------------------
  // Selection & navigation
  // ------------------------------------------------------------------
  select: {
    name: 'Select & Transform',
    icon: '➤', shortcut: 'V', category: 'Selection',
    desc: 'Picks a single entity for inspection, drag-move, and handle-resize; the inspector panel shows that entity\u2019s live properties.',
    usage: [
      'Click any entity to select it — the right C-Panel switches to its properties.',
      'Drag a selected entity to move it; snap + alignment guides keep it square.',
      'Drag the corner handles to resize; the rotate handle spins furniture 90°.',
      'Drag on empty space for a marquee box pick; Shift adds to the selection.',
      'Ctrl+A or SELECTALL selects the whole document; Del deletes the pick.'
    ],
    standards: 'Standard CAD picking conventions. Multi-select enables the batch modify ops (Mirror, Rotate, Scale, Array) in the contextual toolbar.',
    proTip: 'Click a user-created block once to reselect every member it groups — blocks are the fastest way to re-select whole assemblies.'
  },
  marquee: {
    name: 'Marquee Box Select',
    icon: '⬚', category: 'Selection',
    desc: 'Rubber-band rectangle selection: drag right for enclosed picks, drag left for crossing picks.',
    usage: [
      'Activate the Select tool, then drag on empty canvas.',
      'The dashed marquee shows the live count of captured entities.',
      'Release to select; Shift-drag adds to the current selection.'
    ],
    standards: 'Right→left crossing windows are the AutoCAD convention for including anything touched by the rectangle.',
    proTip: 'Watch the marquee\u2019s live "+ADD" badge — it tells you Shift is already appending before you release.'
  },
  lasso: {
    name: 'Freehand Lasso',
    icon: '➰', shortcut: 'L', category: 'Selection',
    desc: 'Draws a freehand loop around irregular clusters that a rectangular marquee can\u2019t isolate.',
    usage: [
      'Activate the lasso, then drag a loop around the target entities.',
      'Everything whose center is inside the loop is selected on release.',
      'Shift-drag adds the loop\u2019s catch to the existing selection.'
    ],
    standards: 'Same selection semantics as marquee (center-in-polygon).',
    proTip: 'For organic room shapes, circle just inside the boundary — the center-of-entity rule ignores walls that merely graze the loop.'
  },
  lasso_poly: {
    name: 'Polygonal Lasso',
    icon: '⬛', category: 'Selection',
    desc: 'Click-vertex polygon selection for precise, straight-edged capture areas.',
    usage: [
      'Click each vertex of the capture polygon in order.',
      'Enter (or the ✓ Select Inside button) commits; Esc cancels.',
      'Preview shows the closing segment live as you move the cursor.'
    ],
    standards: 'Same center-in-polygon rule; the click-vertex model matches AutoCAD\u2019s polygonal selection window.',
    proTip: 'Click back near your first vertex to auto-close with a snap — the loop highlights green before you commit.'
  },
  lasso_magnetic: {
    name: 'Magnetic Lasso',
    icon: '🧲', category: 'Selection',
    desc: 'Freehand loop that ALSO captures walls whose path crosses the loop edge — not just enclosed entities.',
    usage: [
      'Drag a loop that weaves across the walls you want.',
      'On release: enclosed entities + crossed walls/lines are selected.',
      'Ideal for grabbing a circulation spine with its bounding walls.'
    ],
    standards: 'Extends the freehand lasso with segment-intersection capture.',
    proTip: 'Trace ALONG a corridor once: the magnetic edge grabs the corridor walls even when their centers fall outside the loop.'
  },
  crop_tool: {
    name: 'Crop Window',
    icon: '✂', category: 'Selection',
    desc: 'Hides everything outside a dragged rectangle — a non-destructive working view filter.',
    usage: [
      'Activate Crop, then drag the window over the area you\u2019re working on.',
      'Entities outside become hidden (nothing is deleted).',
      'Click-drag a tiny/empty rectangle — or just click — to clear and reveal all.'
    ],
    standards: 'A presentation/working-view convenience; the underlying geometry is untouched, so exports and schedules remain complete.',
    proTip: 'Use it with the Issues panel: crop to one zone, run AUDIT, and the findings focus on what you can actually see.'
  },
  pan: {
    name: 'Pan Viewport',
    icon: '🤚', category: 'View',
    desc: 'Drags the drawing sheet under a fixed camera — the classic CAD pan hand.',
    usage: [
      'Activate Pan (or hold Space with any tool) and drag.',
      'Arrow keys nudge the view; the scrollbars-free canvas stays frameless.',
      'Fit (ZE) re-centers everything after long pans.'
    ],
    standards: '—',
    proTip: 'Space-hold-pan never deactivates your drawing tool — release Space and you\u2019re still on Wall or Dimension.'
  },
  orbit: {
    name: 'Orbit 3D',
    icon: '🔄', category: 'View',
    desc: 'Switches to the 3D massing view and rotates the camera by drag; the wheel zooms.',
    usage: [
      'Click Orbit to jump into the 3D massing document.',
      'Drag to orbit: horizontal motion changes azimuth, vertical changes elevation (±89.9°).',
      'Click a face to raycast-select its source plan entity.'
    ],
    standards: '—',
    proTip: 'Drag the elevation to −89.9° for a true underside view when checking soffits or the underside of a cantilever.'
  },
  zoom_extents: {
    name: 'Zoom Extents',
    icon: '⤢', category: 'View',
    desc: 'Frames every entity in the document — the fastest way back when you\u2019re lost in white space.',
    usage: [
      'Click the button, press ZE, or the Home key.',
      'Dimension standoff offsets are included so text never clips.'
    ],
    standards: '—',
    proTip: 'Hit ZE right after opening an imported drawing — imports land wherever their original coordinates put them.'
  },

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------
  wall: {
    name: 'Architectural Wall',
    icon: '─', shortcut: 'W', category: 'Architecture',
    desc: 'Draws thickness-aware wall segments between two points; assembly layers, openings, and junction mitres derive automatically.',
    usage: [
      'Click the start point (snaps light up near endpoints and intersections).',
      'Move — the HUD shows live length/angle; type a number to lock the length, Tab to reach the angle field.',
      'Click the end point, or press Enter to commit the typed length.',
      'Place doors/windows with the Door/Window tool: they snap onto the wall and punch it automatically.'
    ],
    standards: 'IBC 1020 corridors ≥ 1100 mm clear; typical thicknesses: exterior cavity 250–300 mm, interior partition 100–120 mm, concrete shear 200–300 mm. The WALL command\u2019s Width option sets the full thickness.',
    proTip: 'ORTHO (F8) locks walls to 0°/90° for rule-of-thumb layouts; turn it off and type @dist<angle for skewed party walls.'
  },
  polyline: {
    name: 'Polyline Chain',
    icon: '✏️', category: 'Drawing',
    desc: 'Chains connected line segments from vertex to vertex; close on the start point for a loop.',
    usage: [
      'Click each vertex in sequence — segments preview live with a running total.',
      'Click the start vertex (green CLOSE ✓) or press Enter to finish.',
      'Enter finishes OPEN; Esc cancels the whole chain; each segment is an undoable line entity.'
    ],
    standards: 'Closed chains are ideal for footprint outlines that later become Rooms (trace, then Select All inside).',
    proTip: 'The rubber band turns green + shows CLOSE ✓ when your cursor reaches the start vertex — that click adds the final segment and closes the loop.'
  },
  curve_nurbs: {
    name: 'NURBS Curve',
    icon: '〰️', shortcut: 'CRV', category: 'Curves',
    desc: 'Draws a smooth degree-3 B-spline through clicked control points (de Boor evaluation).',
    usage: [
      'Click control points in order — the live green curve re-evaluates after every click.',
      'Enter (or ✓ Commit Curve) commits the curve; Esc cancels.',
      'Select the committed curve to see its dashed control cage for editing context.'
    ],
    standards: 'Used for organic site boundaries, curved façades, and free-form circulation paths.',
    proTip: 'Fewer control points = smoother curvature. For an S-shaped driveway, 4 points usually beat 8 — add density only where the curve must turn hard.'
  },
  curve_fillet: {
    name: 'Curve Fillet',
    icon: '⌒', shortcut: 'F', category: 'Modify',
    desc: 'Rounds the corner between two intersecting walls: both trim back to the tangent points and an arc is inserted.',
    usage: [
      'Activate the tool, then click ON the first wall (anywhere along it — the toolbar confirms "Wall 1 picked ✓").',
      'Click ON the second wall near the corner where they cross.',
      'Type the radius in metres (e.g. 0.5) and OK — walls trim, arc appears, all as ONE undo step.'
    ],
    standards: 'Internal corners: typical radius 25–50 mm in concrete detailing, 300–600 mm at corridor junctions for accessibility; keep ≥ the wall thickness so the arc resolves cleanly.',
    proTip: 'The two walls must actually CROSS (share a corner). If they merely touch, the tool tells you — extend one onto the other first (EXTEND command).'
  },
  curve_offset: {
    name: 'Offset Curve',
    icon: '⫽', shortcut: 'O', category: 'Modify',
    desc: 'Creates a parallel copy of a wall at a typed distance — the standard double-wall / furred-wall generator.',
    usage: [
      'Activate the tool, then click the wall to offset (or select it first).',
      'Type the distance; positive = left of the wall\u2019s draw direction, negative = right.',
      'A new parallel wall is committed; the original stays untouched.'
    ],
    standards: 'Use for masonry cavities (50 mm), plaster furring (25–50 mm), or code-required double egress separation (200 mm+ rated).',
    proTip: 'Draw walls consistently left-to-right and +offsets always fall on the same side — muscle memory beats checking the sign every time.'
  },
  curve_boolean: {
    name: 'Curve Boolean',
    icon: '⚯', category: 'Modify',
    desc: 'Combines two closed shapes into a single clean region (union, subtract, or intersect).',
    usage: [
      'Select TWO closed shapes (rooms, boolean regions) — first picked is the base.',
      'Click the tool (or BOOLEAN_UNION / BOOLEAN_DIFF variants).',
      'Both sources are replaced by one region entity, net area shown; one undo restores both.'
    ],
    standards: 'Subtract renders as a region WITH A HOLE (the CAD-correct representation); union takes the convex hull; intersect is exact.',
    proTip: 'Merge a circulation blob with its rooms first, THEN dimension the outline — chained dims around a boolean region never double-count.'
  },
  boolean_union: {
    name: 'Boolean Union',
    icon: '⊕', category: 'Solids',
    desc: 'Fuses two selected closed shapes into their convex-hull union region.',
    usage: [
      'Select two rooms/regions (first = base).',
      'Click Union. Result area replaces both sources in one undoable step.'
    ],
    standards: 'Useful for zoning envelopes and amalgamated lease areas; area = the hull, so concave merges take the bounding outline.',
    proTip: 'Union then run ISSUES — overlapping-room findings for those two shapes vanish because there\u2019s now one region.'
  },
  boolean_diff: {
    name: 'Boolean Difference',
    icon: '⊖', category: 'Solids',
    desc: 'Cuts the second selected shape out of the first, producing a region with a hole.',
    usage: [
      'Select the KEEP shape first, then the shape to cut out.',
      'Click Difference — the result shows the net area and the hole.',
      'If the cut shape fully covers the base, the result is empty (and says so).'
    ],
    standards: 'The classic courtyard / light-well operation: subtract an interior rectangle and the net area feeds schedules correctly.',
    proTip: 'Hole boundaries render with the same region outline — dimension them like any edge; the area badge already excludes the hole.'
  },
  room: {
    name: 'Room Rectangle',
    icon: '▭', shortcut: 'R', category: 'Architecture',
    desc: 'Creates a named, area-aware room from a two-corner drag; boundary polygon, schedule zoning, and tags derive automatically.',
    usage: [
      'Click the first corner, drag diagonally, click the opposite corner.',
      'The HUD locks in typed dimensions (e.g. type 4.5 then Tab 3.2).',
      'Select the room to rename it — names drive the zoning schedule and QA rules.'
    ],
    standards: 'IBC 304 habitable minimums: living 13.9 m², bedrooms 11.1 m², kitchens 5.6 m²; ceiling height ≥ 2.13 m under beams. The QA panel flags small rooms and bad proportions automatically.',
    proTip: 'Name rooms on creation ("Bedroom 2", "Corridor") — the issue engine and schedule classify from the name, and room.missing_window checks bedrooms only.'
  },
  polyroom: {
    name: 'Polygonal Room',
    icon: '⬠', category: 'Architecture',
    desc: 'Click-vertex room for L-shapes, bays, and angled footprints; area is exact via the shoelace formula.',
    usage: [
      'Click 3+ corners in order (snaps respect grid + objects).',
      'Click the start vertex or ✓ Complete & Close to finish.',
      'Esc cancels; the boundary polygon stays editable in the inspector.'
    ],
    standards: 'Same habitable minimums as rectangular rooms; area checks run on the true polygon, not a bounding box.',
    proTip: 'For an L-shaped living room, close the polygon then check the inspector — it reports the real (non-rectangular) area the schedule needs.'
  },
  arc: {
    name: 'Arc (from Fillet)',
    icon: '⌒', category: 'Curves',
    desc: 'Arc entity created by the fillet tool; stored in AutoCAD bulge convention with exact derived geometry.',
    usage: [
      'Select an arc to inspect its bulge and endpoints.',
      'Arcs render in plan and feed the tangent snap engine (from a drafting start point).'
    ],
    standards: 'Bulge = tan(θ/4); the sign gives the sweep side — the convention AutoCAD LWPOLYLINE uses.',
    proTip: 'Need a standalone arc? Fillet two construction lines at the radius you want, then delete the lines — the arc survives as its own entity.'
  },

  // ------------------------------------------------------------------
  // Doors / windows
  // ------------------------------------------------------------------
  door: {
    name: 'Door',
    icon: '🚪', category: 'Architecture',
    desc: 'Places a hosted door opening on a wall: jambs, swing arc, and wall punching all derive from host + width + position.',
    usage: [
      'Activate Door, then click along a wall (it must land on a wall — they refuse free space).',
      'Drag the placed door along its host to reposition; width/swing edit in the inspector.',
      'The wall auto-punches at render; door tags annotate on demand (Auto-Tag).'
    ],
    standards: 'IBC 1010: egress leaf ≥ 914 mm clear; ADA 404: 813 mm min clear width, maneuvering clearance 457–610 mm beside the latch. The check panel flags jammed swings.',
    proTip: 'Type the width BEFORE dragging (inspector or WALL command options) — the swing arc and jambs re-derive instantly, and the wall punch follows.'
  },
  window: {
    name: 'Window',
    icon: '🪟', category: 'Architecture',
    desc: 'Places a hosted window on a wall with sill/head/glazing derived from its parameters.',
    usage: [
      'Activate Window, then click on a wall.',
      'Inspector edits: width, position along wall, sill height (head derives = sill + height).',
      'Glass panes render dashed in plan; wall punching is automatic.'
    ],
    standards: 'IBC 1030 emergency egress window: ≥ 0.53 m² clear, min 610 mm height; sill ≤ 1120 mm for sleeping rooms. Window schedule pulls width×height from the entity.',
    proTip: 'Change SILL in the inspector and HEAD recomputes — set sill 0.9 + height 1.2 for a standard 2.1 head; bedrooms needing egress start at sill ≤ 1.1 m.'
  },

  // ------------------------------------------------------------------
  // Vertical circulation
  // ------------------------------------------------------------------
  stair: {
    name: 'Stair Flight',
    icon: '🪜', category: 'Architecture',
    desc: 'Places a full stair flight: risers, treads, Blondel and pitch checks re-derive from your parameters.',
    usage: [
      'Activate Stair, then click-drag the plan footprint (or type in the stair tool panel).',
      'Inspector drives the full chain: change risers → riser height, run, pitch, Blondel, and the IBC flag all recompute.',
      'The issue engine flags risers >190 mm and Blondel outside 590–650 mm live.'
    ],
    standards: 'IBC 1011: riser ≤ 196 mm (7.75"), tread ≥ 254 mm (11"), 2R+T ≈ 620–650 mm; ADA 505 consistent risers. The QA badge turns green inside the band.',
    proTip: 'Fix the RISE first (floor-to-floor is a given), then adjust RISERS until riser height lands 170–180 mm — Blondel follows almost automatically.'
  },
  ramp: {
    name: 'Access Ramp',
    icon: '♿', category: 'Architecture',
    desc: 'Places a ramp run with live slope %, 1:X ratio, and landing guidance.',
    usage: [
      'Activate Ramp, then drag the run (or type rise + length in the ramp panel).',
      'Slope % and 1:X update live; the QA rules flag anything steeper than 1:12.',
      'Inspector edits re-derive run, ratio, and compliance together.'
    ],
    standards: 'ADA 405: slope ≤ 1:12 (8.33%), cross slope ≤ 1:48; landings every 9 m max, 1525 mm at turns. The slope check turns green only inside 1:12.',
    proTip: 'For a 750 mm rise at 1:12 you need 9 m of run + a mid landing — drag the ramp, note the flagged slope, then add the landing length before finalizing.'
  },

  // ------------------------------------------------------------------
  // Structure
  // ------------------------------------------------------------------
  column: {
    name: 'Structural Column',
    icon: '🏛️', category: 'Structure',
    desc: 'Places rect/circular columns with contour hatching and snap keypoints.',
    usage: [
      'Activate Column, then click the position (grid snap recommended).',
      'Profile (rect/circle) and size edit in the inspector; contour + hatch re-derive.',
      'Columns feed the 3D massing automatically at their story height.'
    ],
    standards: 'Typical: 300×300 concrete for residential; 400×400+ for commercial grids; circular 300–500 mm for lobbies. Grid tool pairs with columns at intersections.',
    proTip: 'Place columns on grid intersections with snap enabled — the intersection snap (X glyph) centers them perfectly, and 3D picking works on them too.'
  },
  grid: {
    name: 'Structural Grid Line',
    icon: '⏹️', category: 'Structure',
    desc: 'Draws numbered grid lines with bubbles at both ends — the coordinate spine for columns and setting-out.',
    usage: [
      'Activate Grid, then drag a line; numbering continues automatically (1, 2, 3…).',
      'The intersection snap keys columns precisely at grid crossings.',
      'Grid lines appear in the 3D view\u2019s pick set and dimension chains.'
    ],
    standards: 'Conventional A/1 naming runs letters one way, numbers the other; bubbles 300 mm circle per ISO 5457 convention.',
    proTip: 'Drag grids before walls: walls then snap to grid lines, and your dimension chain (DCO) can chain along the grids for true structural bays.'
  },

  // ------------------------------------------------------------------
  // Annotation
  // ------------------------------------------------------------------
  dimension: {
    name: 'Linear Dimension',
    icon: '📏', shortcut: 'D', category: 'Annotation',
    desc: 'Places a dimension entity between two points, with tick/arrow styles and unit options.',
    usage: [
      'Click the first measured point, click the second.',
      'The HUD accepts typed lengths; styles (tick/arrow/dot) edit in the inspector.',
      'Stale dimensions — moved geometry they no longer match — are flagged by AUDIT.'
    ],
    standards: 'ISO 129 / ASA Y14.5 drafting conventions: aligned dimensions read above the line; the tick style matches architectural practice.',
    proTip: 'The duplicate-dimension rule catches double-dimensioning a bay: if DIMLIN and a chain both cover it, ISSUES flags the redundant one.'
  },
  dim_aligned: {
    name: 'Aligned Dimension',
    icon: '📐', shortcut: 'DAL', category: 'Annotation',
    desc: 'Dimension aligned to a skewed element — measures the true length along any angle.',
    usage: [
      'Same two-click flow as DIMLIN; the dimension rotates to the measured line.',
      'For slanted party walls this reads the real length, not its X/Y components.'
    ],
    standards: 'Aligned dims are the correct call for non-orthogonal elements per ISO 129.',
    proTip: 'On a 45° boundary wall, DAL gives the boundary length directly — using DIMLIN there silently reports the shorter axis projection.'
  },
  dim_chain: {
    name: 'Dimension Chain',
    icon: '🔗', shortcut: 'DCO', category: 'Annotation',
    desc: 'One running dimension string across a whole bay sequence — click each junction point in order.',
    usage: [
      'Activate the tool, then click bay points along the dimension line (snaps give exact junctions).',
      'Enter or ✓ Finish Chain commits; Esc cancels; the preview shows each segment live.',
      'Each span becomes its own aligned dimension at one shared offset — a proper string.'
    ],
    standards: 'Running strings read left-to-right / bottom-to-top; the shared offset keeps the string on one line per ISO 129.',
    proTip: 'Chain along grid lines: snap to each grid intersection and the bays dimension EXACTLY — no cumulative rounding like manual dims.'
  },
  text: {
    name: 'Text Note',
    icon: '🔤', shortcut: 'TX', category: 'Annotation',
    desc: 'Places a fully formatable text annotation — fonts, size, color, transparency, rotation, backdrop.',
    usage: [
      'Activate Text, click the position, and type the label at the prompt.',
      'Select the note to open the full formatting tab: font, size slider, B/I/U, color, opacity %, rotation, backdrop chip.',
      'Architectural presets (Room Label, Dim Text, Sheet Title, Watermark, Revision) set everything in one click.'
    ],
    standards: 'Text on drawings: 2.5–3.5 mm cap height standard; watermarks sit at 25–30% opacity so measured data stays readable beneath.',
    proTip: 'For transparent room labels (the AutoCAD "background mask off" look), set Backdrop: None and Opacity: 100% — the note floats over linework without hiding it.'
  },
  leader: {
    name: 'Leader Note',
    icon: '➤', shortcut: 'LD', category: 'Annotation',
    desc: 'Arrow callout with a knee and attached text — keynotes, finish notes, and site remarks.',
    usage: [
      'Activate Leader, then drag from the target point to the knee, then to the text.',
      'Type the note text at the prompt; the arrowhead derives from the drag direction.',
      'Leader text edits in the inspector; the whole note is one entity.'
    ],
    standards: 'Keynote leaders point to the referenced material with a 45° elbow per CSI conventions.',
    proTip: 'Keep knees consistent (all 45°) — a sheet with mixed leader angles reads as unfinished to a reviewer.'
  },
  section_cut: {
    name: 'Section Cut',
    icon: '✂️', category: 'Documentation',
    desc: 'Places a section line (A-A, B-B…) and opens a live building section document.',
    usage: [
      'Drag the cut line across the plan.',
      'The generated section document shows cut pochë, slabs, and openings.',
      'Repositioning the cut line updates the section on the next render.'
    ],
    standards: 'Cut lines with directional arrows; letters run A→Z then Aa→ per sheet conventions.',
    proTip: 'Cut through the stairwell on the first pass — that single section usually resolves riser counts, landings, and headroom doubts at once.'
  },
  detail_callout: {
    name: 'Detail Callout',
    icon: '🔍', category: 'Documentation',
    desc: 'Marks an enlarged detail bubble that links to its assembly document.',
    usage: [
      'Drag the callout bubble over the region needing enlargement.',
      'The linked detail document (footings, parapets, sills…) renders the assembly at 1:5/1:10.',
      'Sheet layout picks up callouts for the detail index automatically.'
    ],
    standards: 'Callout circles reference detail sheets (e.g. 3/A-501); scale noted beneath each detail per ISO.',
    proTip: 'Call out the roof parapet + window sill on every job — reviewers look there first, and the parametric assemblies already have the layers drawn.'
  },
  north: {
    name: 'North Arrow',
    icon: '🧭', category: 'Documentation',
    desc: 'Places the orientation symbol; solar and orientation analyses reference it.',
    usage: [
      'Click to place; rotation edits in the inspector.',
      'Rotate to match TRUE north (site plan), not plan-north, for the brief\u2019s orientation checks.'
    ],
    standards: 'ISO 6709: north arrow with letter N; orientation drives daylight/heating-gain notes in the brief.',
    proTip: 'Set the arrow before generating elevations — South elevation labels follow the arrow, so a wrong north mislabels every façade.'
  },
  measure: {
    name: 'Tape Measure',
    icon: '📐', shortcut: 'M', category: 'Inquiry',
    desc: 'Non-destructive point-to-point inquiry: distance, angle, and deltas reported, nothing placed.',
    usage: [
      'Click the first point, drag, release — the HUD + toast report live distance and angle.',
      'Great for verifying clearances before committing a dimension string.'
    ],
    standards: '—',
    proTip: 'Measure a door swing before placing furniture: the live readout confirms ADA maneuvering clearance without adding annotation clutter.'
  },
  area_calc: {
    name: 'Area & Perimeter Inquiry',
    icon: '📦', category: 'Inquiry',
    desc: 'Reports the area/perimeter of a clicked room (the measure tool in area mode).',
    usage: [
      'Click a room; the inspector shows shoelace-exact area + perimeter.',
      'Compare with the schedule — discrepancies point at boundary edits that haven\u2019t been re-scheduled.'
    ],
    standards: '—',
    proTip: 'Verify NIA/GIA before client meetings — the inquiry reads the CURRENT polygon even if the schedule panel is stale.'
  },

  // ------------------------------------------------------------------
  // Finishes / painting
  // ------------------------------------------------------------------
  hatch: {
    name: 'Architectural Hatch',
    icon: '▨', category: 'Finishes',
    desc: 'Applies pattern hatching (brick, concrete, diagonal…) to a room footprint.',
    usage: [
      'Activate Hatch, pick the pattern in the toolbar chips, click a room.',
      'The room\u2019s fill re-renders with the pattern; undo removes it.'
    ],
    standards: 'ISO 128 patterns: concrete = dotted/dashed mix, brick = 45° diagonal, insulation = wavy. Consistency matters more than taste.',
    proTip: 'Match the pattern family to the CUT direction: sections use solid-poché-style hatches, plans use lighter material patterns — mixing them reads wrong.'
  },
  material_paint: {
    name: 'Material Paint',
    icon: '🎨', category: 'Finishes',
    desc: 'Fills a room with a solid material color ( Rhino "paint" workflow).',
    usage: [
      'Select a material color in the toolbar, click the room.',
      'Fill updates instantly and survives saves; paint over to change.'
    ],
    standards: '—',
    proTip: 'Color-code zones (public = warm, service = cool) for design review — the visual zoning survives into screenshots for the client pack.'
  },
  watercolor_brush: {
    name: 'Watercolor Brush',
    icon: '🖌️', category: 'Finishes',
    desc: 'Presentation-style translucent wash fill for concept plans.',
    usage: [
      'Activate the brush, click rooms to wash them in the active tint.',
      'Stacked washes deepen; keep it to presentation documents.'
    ],
    standards: 'Presentation layer only — never on construction sets.',
    proTip: 'Wash at 60% opacity over the hatch: the pattern shows through and the plan keeps its technical credibility.'
  },
  pushpull: {
    name: 'Push / Pull to 3D',
    icon: '⬆️', category: 'Massing',
    desc: 'Click a room to open its 3D massing extrusion at the working wall height.',
    usage: [
      'Activate Push/Pull, click the room.',
      'The 3D massing document opens showing the extrusion; the H button retunes the height.',
      'Real solid geometry (extrude/loft tools) is under the Surface/Solid tools.'
    ],
    standards: '—',
    proTip: 'Use it as a fast context check: push 2–3 key rooms to 3D, orbit, and confirm the massing BEFORE detailing anything.'
  },

  // ------------------------------------------------------------------
  // Surfaces / solids / meshes / subD
  // ------------------------------------------------------------------
  surface_planar: {
    name: 'Planar Surface',
    icon: '◫', category: 'Surfaces',
    desc: 'Converts a closed shape (room/region) into an area-exact planar surface entity.',
    usage: [
      'Select one closed shape (room or boolean region).',
      'Click the tool — a planar surface is created with its exact area (shoelace).',
      'Use it as the base for Extrude, or as a zone marker in plan.'
    ],
    standards: 'Planar surfaces feed area takeoffs exactly — the surface area equals the entity\u2019s reported m².',
    proTip: 'Turning a boolean union result into a planar surface "locks" the merged area — subsequent room edits can\u2019t silently change the takeoff.'
  },
  surface_extrude: {
    name: 'Extrude Solid',
    icon: '▮', category: 'Solids',
    desc: 'Pulls a closed profile up into a real 3D solid (sides + caps) at a typed height.',
    usage: [
      'Select one closed shape, click Extrude, type the height (m).',
      'The solid renders in the 3D massing view with pickable faces; the plan shows its footprint badge.'
    ],
    standards: 'Storey heights 2.7–3.2 m residential; 3.6–4.2 m commercial — match your level heightsToNext.',
    proTip: 'Extrude the merged boolean region of a whole floor (union first) for a single clean massing body instead of per-room boxes.'
  },
  surface_loft: {
    name: 'Loft Surface',
    icon: '🍱', category: 'Solids',
    desc: 'Ruled surface between two same-vertex-count profiles at different heights.',
    usage: [
      'Select TWO rooms/regions with the same vertex count (e.g. two 4-corner rooms).',
      'Click Loft, type the top height — sides connect profile-to-profile plus caps.'
    ],
    standards: 'Lofted plenum/atrium shapes stay ruled (straight edges) — true curved lofts need the NURBS surface path.',
    proTip: 'A bottom room + a smaller rotated-top copy = a twisted tower study in one step (rotate the top copy before lofting).'
  },
  surface_revolve: {
    name: 'Revolve Surface',
    icon: '壶', category: 'Solids',
    desc: 'Sweeps a profile 360° around a vertical axis — domes, silos, round stair voids.',
    usage: [
      'Select a profile (a closed shape or line-based profile), click Revolve.',
      'Segment count controls smoothness (12–96); the axis sits at the profile\u2019s start edge.'
    ],
    standards: '—',
    proTip: 'Model a dome as a revolve, then section-cut through the center with the 3D clip plane for a true spherical section drawing.'
  },
  solid_box: {
    name: 'Box Primitive',
    icon: '🧊', category: 'Solids',
    desc: 'A true 6-face box solid at typed dimensions.',
    usage: [
      'Click the tool (with any selection providing the base point), type width, depth, height.',
      'The box renders in plan (badge) and 3D (solid body, pickable).'
    ],
    standards: '—',
    proTip: 'Boxes are the seed for SubD: drop a box, run SubD Box, and sculpt — smoother than trying to model curves from scratch.'
  },
  mesh_from_srf: {
    name: 'Mesh from Surface',
    icon: '🕸️', category: 'Mesh',
    desc: 'Converts any solid/surface entity into a quad-mesh entity.',
    usage: [
      'Select one extrude/loft/revolve/box/subd entity, click the tool.',
      'The mesh lists its quad count in the name; use Quad Remesh for density.'
    ],
    standards: '—',
    proTip: 'Mesh-then-remesh gives you control the surface doesn\u2019t: 2 levels of remeshing before a heavy revolve is plenty for visual work.'
  },
  quad_remesh: {
    name: 'Quad Remesh',
    icon: '🔢', category: 'Mesh',
    desc: 'Deterministic 4-way quad subdivision of a mesh (levels 1–3).',
    usage: [
      'Select a MESH entity (make one with Mesh from Surface first).',
      'Click the tool, type 1–3 levels; 6→24→96→384 quads per level.',
      'The remeshed copy is a new entity — the source mesh stays.'
    ],
    standards: '—',
    proTip: 'Level 2 is the sweet spot for presentation: smooth silhouettes without the file weight of level 3.'
  },
  subd_box: {
    name: 'SubD Box',
    icon: '🧬', category: 'SubD',
    desc: 'Catmull-Clark subdivision solid seeded from a box — rounded forms with exact limit evaluation.',
    usage: [
      'Click the tool, type width, depth, height (levels 2 default).',
      'The limit mesh rounds the box corners; flat faces stay flat, edges soften.',
      'Render + 3D pick work on the evaluated limit body.'
    ],
    standards: '—',
    proTip: 'SubD boxes make convincing site boulders/planters at 2 levels — set dimensions, orbit, done.'
  },
  subd_crease: {
    name: 'SubD Crease',
    icon: '📐', category: 'SubD',
    desc: 'Marks faces of a SubD solid as HARD — limit evaluation keeps those edges sharp.',
    usage: [
      'Select a subd_solid, click the tool, type the face index (0–5) to harden.',
      'Crease list edits in the inspector; re-running the tool adds more creases.'
    ],
    standards: '—',
    proTip: 'Crease the bottom face (0) of a subd box so planters sit flat — the top corners keep rounding while the base stays square.'
  },
  block_create: {
    name: 'Create Block',
    icon: '📦', category: 'Organize',
    desc: 'Groups the current selection into a named block with a pickable proxy.',
    usage: [
      'Select the entities to group (walls + doors + furniture of a unit, say).',
      'Click the tool, type the block name.',
      'Click the block proxy any time to reselect ALL members at once.'
    ],
    standards: 'Blocks mirror CAD block/group conventions: one definition, many potential placements.',
    proTip: 'Block a whole hotel-unit fitout (walls + door + furniture) — then reselecting it for Array/Duplicate is one click instead of a marquee.'
  },

  // ------------------------------------------------------------------
  // Views / workspace
  // ------------------------------------------------------------------
  view_top: {
    name: 'Top (Plan) View', icon: '⬇️', category: 'View',
    desc: 'Returns to the 2D plan document.',
    usage: ['Click the button or run TOP.', 'The last plan viewport state is preserved.'],
    standards: '—', proTip: 'After orbiting, TOP drops you back exactly where you left the plan.'
  },
  view_south: {
    name: 'South Elevation', icon: '🏠', category: 'View',
    desc: 'Opens the live south (front) elevation document.',
    usage: ['Click or run FRONT.', 'The elevation derives from current plan entities — edits flow through on re-render.'],
    standards: 'Elevations reference the north arrow; south = front by convention.', proTip: 'Check parapet + door heads in elevation before the section — it catches wrong heights fastest.'
  },
  view_perspective: {
    name: '3D Massing View', icon: '👁️', category: 'View',
    desc: 'Opens the 3D massing document with orbit, presets, section clip, and perspective toggle.',
    usage: [
      'Click the button or run PERSP.',
      'Drag to orbit; wheel zooms; preset chips jump to standard views.',
      'Ortho/Perspective toggles projection; Section Cut clips horizontally.'
    ],
    standards: '—', proTip: 'Toggle Perspective ON, elevation ~25°: that\u2019s the eye-level view clients instantly read as "the building".'
  },
  view_4split: {
    name: '4-Viewport Split', icon: '⊞', category: 'View',
    desc: 'Top / axonometric / front / right in four quadrants with maximize pills.',
    usage: ['Click to split; quadrant pills maximize a view; click again to restore.'],
    standards: 'Rhino-style quad layout.', proTip: 'Use the 4-split for design reviews: plan changes show up in the elevation and 3D quadrants without switching tabs.'
  },
  undo: {
    name: 'Undo', icon: '↩️', category: 'Edit',
    desc: 'Steps back through the canvas command stack (100 deep).',
    usage: ['Click, Ctrl+Z, or run UNDO.'],
    standards: '—', proTip: 'Multi-step ops (fillet, boolean, arrays) undo as ONE step — no need to spam Ctrl+Z after a mistake.'
  },
  redo: {
    name: 'Redo', icon: '↪️', category: 'Edit',
    desc: 'Re-applies an undone canvas action.',
    usage: ['Click, Ctrl+Y, or run REDO.'],
    standards: '—', proTip: '—'
  },
  delete: {
    name: 'Delete Selection', icon: '🗑️', category: 'Edit',
    desc: 'Removes the selected entities (locked layers refuse).',
    usage: ['Select, then Del or run DELETE.'],
    standards: '—', proTip: 'Deleting a wall auto-cleans its hosted doors/windows — no orphan openings survive.'
  },
  furniture: {
    name: 'Place Object', icon: '🛋️', shortcut: 'F', category: 'Objects',
    desc: 'Places library objects at a click; flip (rotation) swaps the footprint.',
    usage: [
      'Choose a piece in the dropdown or click 🔍 Browse for the full library browser (search + categories + footprint previews).',
      'Click to place (grid-snapped); click with the flip toggle for the rotated footprint.',
      'The placed object clears furniture-fit and clearance checks automatically.'
    ],
    standards: 'ADA clearances: wheelchair turning Ø1525 mm; toilet centerline 405–510 mm from wall; the catalog stores real standards per piece.',
    proTip: 'Use the Browse popup for unfamiliar categories — the footprint preview warns you before you drop a 2.2 m bed in a 2 m room.'
  },
  paint_bucket: {
    name: 'Paint Bucket', icon: '🪣', category: 'Finishes',
    desc: 'Alias route: fills a clicked room with the active material color (same engine as Material Paint).',
    usage: ['Pick the color in the toolbar chips, click the room.'],
    standards: 'Presentation only.', proTip: 'Color-zone by use: one hue per room type reads instantly in review.'
  },
  line: {
    name: 'Line Segment', icon: '／', shortcut: 'L', category: 'Drawing',
    desc: 'Two-point construction line — dimension anchors, break symbols, and setting-out geometry.',
    usage: [
      'Click start, move (HUD shows length/angle), click end.',
      'Lines join walls in trim/extend ops and feed the endpoint/intersection snap pool.'
    ],
    standards: 'Construction lines are typically thin/continuous per ISO 128; this app renders them as annotation-layer geometry.',
    proTip: 'Draw a construction line first, then TRIM a wall against it — the classic way to force an exact junction.'
  },
  cpanel_properties: {
    name: 'Properties Panel', icon: '📋', category: 'C-Panels',
    desc: 'Right dock: the selected entity\u2019s live, editable properties.',
    usage: ['Click any entity; the panel follows the selection.'],
    standards: '—', proTip: 'Numeric fields accept scrubbing — drag the value horizontally for smooth live updates.'
  },
  cpanel_layers: {
    name: 'Layers Panel', icon: '🗂️', category: 'C-Panels',
    desc: 'AIA/ISO layer manager: visibility, lock, isolate (◎ solo), and custom layers.',
    usage: [
      'Eye toggles visibility; padlock toggles edit protection.',
      '◎ isolates one layer (click again restores the exact previous state).',
      'Auto-Tag re-keys entities onto their proper layers.'
    ],
    standards: 'AIA layer naming (A-WALL, A-DOOR…) enforced by default set.',
    proTip: 'Isolate A-DOOR before auditing swing conflicts — the ◎ restore returns every other layer precisely.'
  },
  cpanel_validation: {
    name: 'Code & Metrics Panel', icon: '✓', category: 'C-Panels',
    desc: 'Live IBC checklist (ramp slope, corridor width, stair Blondel) computed from THIS document\u2019s entities.',
    usage: ['Click the Code tab; checks re-run on every edit.'],
    standards: 'IBC 1011 stairs / 1020 corridors / ADA 405 ramps — the checks cite the clause.',
    proTip: 'A ✅ here means the CURRENT geometry passes — add the entity and watch it flip before your eyes.'
  },
  cpanel_details: {
    name: 'Details Panel', icon: '🔍', category: 'C-Panels',
    desc: 'Construction assembly library: footings, parapets, sills, nosings with material layers.',
    usage: ['Click a detail card to open its assembly document (1:5/1:10 scaled).'],
    standards: 'Assemblies follow typical cavity-wall / footing construction per ISO detail conventions.',
    proTip: 'Every detail card opens as an editable document — scale the assembly, then screenshot straight into your sheet.'
  },
  flyout_stairs: { name: 'Stairs Flyout', icon: '🪜', category: 'Ribbon', desc: 'Quick access to stair/ramp/vertical-circulation tools.', usage: ['Click the flyout arrow on the ribbon button.'], standards: '—', proTip: '—' },
  flyout_hatching: { name: 'Hatching Flyout', icon: '▨', category: 'Ribbon', desc: 'Pattern chips for the hatch/material tools.', usage: ['Pick a pattern, then click rooms.'], standards: '—', proTip: '—' },
  flyout_marquee: { name: 'Selection Flyout', icon: '⬚', category: 'Ribbon', desc: 'Selection modes (box, lasso family).', usage: ['Choose the selection style from the flyout.'], standards: '—', proTip: '—' },
  tab_switch_home: { name: 'Home Tab', icon: '⌂', category: 'Ribbon', desc: 'Core drawing + selection suite.', usage: ['Click to switch the ribbon suite.'], standards: '—', proTip: '—' },
  tab_switch_curves: { name: 'Curves Tab', icon: '〰️', category: 'Ribbon', desc: 'NURBS, fillet, offset, boolean curve tools.', usage: ['Click to switch the ribbon suite.'], standards: '—', proTip: '—' },
  tab_switch_surfaces: { name: 'Surfaces Tab', icon: '◫', category: 'Ribbon', desc: 'Planar/extrude/loft/revolve surface tools.', usage: ['Click to switch the ribbon suite.'], standards: '—', proTip: '—' },
  tab_switch_solids: { name: 'Solids Tab', icon: '🧊', category: 'Ribbon', desc: 'Box primitive + boolean solids.', usage: ['Click to switch the ribbon suite.'], standards: '—', proTip: '—' },
  tab_switch_views: { name: 'Set View Tab', icon: '📷', category: 'Ribbon', desc: 'Top/elevations/3D/4-split view switching.', usage: ['Click to switch the ribbon suite.'], standards: '—', proTip: '—' },
  panel_draw_primitives: { name: 'Draw Primitives Panel', icon: '✏️', category: 'Ribbon', desc: 'Line/polyline/wall/room grouping.', usage: ['Ribbon panel grouping only.'], standards: '—', proTip: '—' },
  panel_geometry_modify: { name: 'Geometry Modify Panel', icon: '🔧', category: 'Ribbon', desc: 'Mirror/rotate/scale/offset/array/trim/extend grouping.', usage: ['Ribbon panel grouping only.'], standards: '—', proTip: '—' },
  panel_annotations_dims: { name: 'Annotation Panel', icon: '📏', category: 'Ribbon', desc: 'Dimension/chain/text/leader grouping.', usage: ['Ribbon panel grouping only.'], standards: '—', proTip: '—' }
};

/** Guide for a tool, with a graceful generic fallback (never blank). */
export function getToolGuide(toolId) {
  return TOOL_GUIDANCE_CATALOG[toolId] || {
    name: toolId.replace(/_/g, ' '),
    icon: '🔧', category: 'Tool',
    desc: 'Tool guidance entry pending — this tool is implemented and tested; unique documentation is being expanded.',
    usage: ['Activate the tool and follow the contextual toolbar hint.'],
    standards: '—',
    proTip: 'The command line (F-key palette) lists aliases for every tool.'
  };
}
