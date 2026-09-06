/**
 * Architecture Helping Hand - Software Personas, Tool Categories & Universal Search Engine
 * Provides dynamic workstation modes (AutoCAD, Rhino, Photoshop, SketchUp, Studio),
 * 16 structured tool categories, cascades & flyouts catalog, and real-time studio search.
 */

// ---------------------------------------------------------------------------
// 1. Software Personas
// ---------------------------------------------------------------------------

export const STUDIO_PERSONAS = {
  studio: {
    id: 'studio',
    name: 'Helping Hand Studio',
    label: 'Helping Hand Studio',
    shortLabel: 'Studio',
    icon: '🏛️',
    description: 'Integrated Architectural BIM, Space Planning, Detailing & Presentation Suite',
    accentColor: '#4989D9',
    themeColor: '#4989D9',
    defaultRibbonTab: 'home',
    defaultTool: 'select'
  },
  autocad: {
    id: 'autocad',
    name: 'AutoCAD Precision 2D',
    label: 'AutoCAD Precision 2D',
    shortLabel: 'AutoCAD',
    icon: '📐',
    description: 'CAD Drafting, Precision Geometry, Layers, Dimension Chains & CLI Commands',
    accentColor: '#E02424',
    themeColor: '#E02424',
    defaultRibbonTab: 'home',
    defaultTool: 'line'
  },
  rhino: {
    id: 'rhino',
    name: 'Rhino 3D & Computational',
    label: 'Rhino 3D & Computational',
    shortLabel: 'Rhino',
    icon: '🦏',
    description: 'NURBS Curves, Surfaces, Solid Booleans, Meshes, SubD & Osnap Views',
    accentColor: '#057A55',
    themeColor: '#057A55',
    defaultRibbonTab: 'curves',
    defaultTool: 'curve'
  },
  photoshop: {
    id: 'photoshop',
    name: 'Photoshop Presentation & Retouch',
    label: 'Photoshop Presentation & Retouch',
    shortLabel: 'Photoshop',
    icon: '🎨',
    description: 'Architectural Retouching, Render Post-Processing, Marquee/Lasso & Collaging',
    accentColor: '#3F83F8',
    themeColor: '#3F83F8',
    defaultRibbonTab: 'select_mask',
    defaultTool: 'marquee'
  },
  sketchup: {
    id: 'sketchup',
    name: 'SketchUp Conceptual Massing',
    label: 'SketchUp Conceptual Massing',
    shortLabel: 'SketchUp',
    icon: '📦',
    description: 'Rapid 3D Push-Pull, Architectural Components, Edge Inferencing & Sun Studies',
    accentColor: '#C27803',
    themeColor: '#C27803',
    defaultRibbonTab: 'draw',
    defaultTool: 'pushpull'
  }
};

// ---------------------------------------------------------------------------
// 2. The 16 Tool Categories
// ---------------------------------------------------------------------------

export const TOOL_CATEGORIES = [
  { id: 'measuring', name: 'Measuring', icon: '📏', description: 'Precision dimensions, distances, areas, and angles' },
  { id: 'selection_cropping', name: 'Selection & Cropping', icon: '⬚', description: 'Region selection, object picking, marquee, lasso, and crop boundary' },
  { id: 'retouching_painting', name: 'Retouching & Painting', icon: '🖌️', description: 'Architectural hatching, materials, color fills, texture stamps, and shading' },
  { id: 'selection_navigation', name: 'Selection and Navigation', icon: '🧭', description: 'Viewport pan, orbit 3D, zoom extents, camera modes, and look-around' },
  { id: 'drawing', name: 'Drawing Primitives', icon: '✏️', description: 'Core geometric creation: lines, polylines, rects, circles, and polygons' },
  { id: 'standard_cpanels', name: 'Standard C-Panels', icon: '🗂️', description: 'Dockable contextual panels: Properties, Layers, Space Planning, Details' },
  { id: 'set_view', name: 'Set View', icon: '📷', description: 'Camera angles: Top, South (Front), North (Rear), East, West, Perspective, 4-Split' },
  { id: 'curve_tools', name: 'Curve Tools', icon: '〰️', description: 'NURBS curves, control points, fillets, offsets, and curve booleans' },
  { id: 'surface_tools', name: 'Surface Tools', icon: '◫', description: 'Planar surfaces, lofts, extrusions, revolves, 1-rail/2-rail sweeps, and patches' },
  { id: 'solid_tools', name: 'Solid Tools', icon: '🧊', description: 'Solid primitives, CSG booleans (Union, Difference, Intersection), and edge fillets' },
  { id: 'mesh_tools', name: 'Mesh Tools', icon: '🕸️', description: 'Polygonal meshes, quad remesh, mesh booleans, triangulation, and decimation' },
  { id: 'subd', name: 'SubD Tools', icon: '🧬', description: 'Subdivision organic modeling primitives, edge extrusions, creases, and bridges' },
  { id: 'containers', name: 'Containers & Blocks', icon: '📦', description: 'CAD blocks, furniture components, architectural symbol assemblies, and groups' },
  { id: 'cascades_flyouts', name: 'Cascades / Flyouts', icon: '📑', description: 'Nested popover sub-menus attached to toolbar buttons' },
  { id: 'ribbon_tabs', name: 'Ribbon Tabs', icon: '📑', description: 'Top horizontal suite switchers: Home, Annotate, Set View, Curves, Surfaces' },
  { id: 'ribbon_panels', name: 'Ribbon Panels', icon: '▦', description: 'Grouped functional tool clusters with titles and parameter inputs' }
];

// ---------------------------------------------------------------------------
// 3. Studio Master Tool Catalog
// ---------------------------------------------------------------------------

export const STUDIO_TOOL_CATALOG = [
  // 1. Measuring
  {
    id: 'measure',
    name: 'Tape Measure',
    category: 'measuring',
    personas: ['studio', 'autocad', 'sketchup', 'rhino'],
    icon: '📐',
    shortcut: 'M',
    commandAlias: 'DIST',
    description: 'Measure point-to-point real-world distances and angles instantly without placing permanent annotations'
  },
  {
    id: 'dimension',
    name: 'Linear Dimension',
    category: 'measuring',
    personas: ['studio', 'autocad', 'sketchup'],
    icon: '📏',
    shortcut: 'D',
    commandAlias: 'DIMLIN',
    description: 'Place professional architectural linear dimension strings between geometric endpoints'
  },
  {
    id: 'dim_aligned',
    name: 'Aligned Dimension',
    category: 'measuring',
    personas: ['autocad', 'studio'],
    icon: '📐',
    shortcut: 'DAL',
    commandAlias: 'DIMALIGNED',
    description: 'Place dimension aligned parallel to slanted walls or angled edges'
  },
  {
    id: 'dim_chain',
    name: 'Dimension Chain',
    category: 'measuring',
    personas: ['studio', 'autocad'],
    icon: '🔗',
    shortcut: 'DCO',
    commandAlias: 'DIMCONTINUE',
    description: 'Generate continuous running dimension sequences across multiple structural bays'
  },
  {
    id: 'area_calc',
    name: 'Area & Perimeter',
    category: 'measuring',
    personas: ['studio', 'autocad'],
    icon: '⬛',
    shortcut: 'AA',
    commandAlias: 'AREA',
    description: 'Calculate enclosed polygonal area (m²), perimeter, and usable floor ratio'
  },

  // 2. Selection & Cropping
  {
    id: 'select',
    name: 'Select & Transform',
    category: 'selection_cropping',
    personas: ['studio', 'autocad', 'rhino', 'sketchup', 'photoshop'],
    icon: '➤',
    shortcut: 'V',
    commandAlias: 'SELECT',
    description: 'Pick, box-select, translate, scale, and inspect entities on the canvas'
  },
  {
    id: 'marquee',
    name: 'Rectangular Marquee',
    category: 'selection_cropping',
    personas: ['photoshop'],
    icon: '⬚',
    shortcut: 'M',
    commandAlias: 'MARQUEE',
    description: 'Select rectangular regions for architectural collage rendering, texturing, or masking',
    flyout: [
      { id: 'marquee_rect', name: 'Rectangular Marquee', icon: '⬚', shortcut: 'M' },
      { id: 'marquee_ellip', name: 'Elliptical Marquee', icon: '◯', shortcut: 'Shift+M' },
      { id: 'marquee_single_row', name: 'Single Row Marquee', icon: '━' }
    ]
  },
  {
    id: 'lasso',
    name: 'Polygonal Lasso',
    category: 'selection_cropping',
    personas: ['photoshop'],
    icon: '➰',
    shortcut: 'L',
    commandAlias: 'LASSO',
    description: 'Click-to-corner polygonal selection for complex building facades and entourage cutouts',
    flyout: [
      { id: 'lasso_poly', name: 'Polygonal Lasso', icon: '➰', shortcut: 'L' },
      { id: 'lasso_magnetic', name: 'Magnetic Lasso', icon: '🧲' }
    ]
  },
  {
    id: 'crop_tool',
    name: 'Crop Viewport Boundary',
    category: 'selection_cropping',
    personas: ['photoshop', 'studio'],
    icon: '◩',
    shortcut: 'C',
    commandAlias: 'CROP',
    description: 'Crop drawing canvas boundary, sheet viewport extents, or presentation frame'
  },

  // 3. Retouching & Painting
  {
    id: 'hatch',
    name: 'Architectural Hatch',
    category: 'retouching_painting',
    personas: ['autocad', 'studio'],
    icon: '🧱',
    shortcut: 'H',
    commandAlias: 'HATCH',
    description: 'Apply standard architectural hatching: Concrete stipple, Brick 45°, Earth grade, Sand, Wood grain, or Steel ANSI31',
    flyout: [
      { id: 'hatch_concrete', name: 'Concrete Stipple Pochè', icon: '🧱' },
      { id: 'hatch_earth', name: '45° Compacted Earth', icon: '▨' },
      { id: 'hatch_insulation', name: 'Zigzag Rigid Insulation', icon: '⚡' },
      { id: 'hatch_brick', name: 'Brick Bond Pattern', icon: '🧱' }
    ]
  },
  {
    id: 'paint_bucket',
    name: 'Paint Bucket / Material',
    category: 'retouching_painting',
    personas: ['sketchup', 'photoshop'],
    icon: '🪣',
    shortcut: 'B',
    commandAlias: 'PAINT',
    description: 'Apply architectural surface finishes: Terrazzo, Timber, Glass, Brushed Aluminum, or Concrete wash'
  },
  {
    id: 'watercolor_brush',
    name: 'Presentation Brush',
    category: 'retouching_painting',
    personas: ['photoshop'],
    icon: '🖌️',
    shortcut: 'B',
    commandAlias: 'BRUSH',
    description: 'Architectural watercolor and pencil stroke rendering for competition presentation boards'
  },

  // 4. Selection and Navigation
  {
    id: 'pan',
    name: 'Pan Hand',
    category: 'selection_navigation',
    personas: ['studio', 'autocad', 'rhino', 'photoshop', 'sketchup'],
    icon: '✋',
    shortcut: 'Space+Drag',
    commandAlias: 'PAN',
    description: 'Pan viewport canvas smoothly across real-world spatial coordinates'
  },
  {
    id: 'orbit',
    name: 'Orbit 3D',
    category: 'selection_navigation',
    personas: ['rhino', 'sketchup', 'studio'],
    icon: '🔄',
    shortcut: 'O',
    commandAlias: 'ORBIT',
    description: 'Rotate 3D isometric or perspective camera freely around building massing centroid'
  },
  {
    id: 'zoom_extents',
    name: 'Zoom Extents',
    category: 'selection_navigation',
    personas: ['studio', 'autocad', 'rhino'],
    icon: '🔍',
    shortcut: 'Z+E',
    commandAlias: 'ZOOM_E',
    description: 'Fit all drawing entities and geometries tightly within the center viewport'
  },

  // 5. Drawing Primitives
  {
    id: 'line',
    name: 'Line Segment',
    category: 'drawing',
    personas: ['autocad', 'rhino', 'sketchup', 'studio'],
    icon: '╱',
    shortcut: 'L',
    commandAlias: 'L',
    description: 'Draw precision 2-point line segments with orthogonal and polar snap tracking'
  },
  {
    id: 'polyline',
    name: 'Polyline',
    category: 'drawing',
    personas: ['autocad', 'rhino', 'studio'],
    icon: '─┘',
    shortcut: 'PL',
    commandAlias: 'PLINE',
    description: 'Draw continuous multi-segment 2D vector path with arc segments and closed boundaries'
  },
  {
    id: 'wall',
    name: 'Architectural Wall',
    category: 'drawing',
    personas: ['studio', 'autocad'],
    icon: '━',
    shortcut: 'W',
    commandAlias: 'WALL',
    description: 'Place double-line structural or partition wall with real-world thickness (0.10m - 0.35m) and automatic miter corner joins'
  },
  {
    id: 'room',
    name: 'Room Rectangle',
    category: 'drawing',
    personas: ['studio', 'sketchup'],
    icon: '▭',
    shortcut: 'R',
    commandAlias: 'REC',
    description: 'Create architectural enclosed space with live area calculation and floor zoning tags'
  },
  {
    id: 'polyroom',
    name: 'Polygonal Room',
    category: 'drawing',
    personas: ['studio'],
    icon: '⬡',
    shortcut: 'Shift+R',
    commandAlias: 'POLYROOM',
    description: 'Click arbitrary corner vertices to form complex L-shaped, T-shaped, or angled room boundaries'
  },
  {
    id: 'door',
    name: 'Hinged Door',
    category: 'drawing',
    personas: ['studio', 'autocad'],
    icon: '🚪',
    shortcut: 'DR',
    commandAlias: 'DOOR',
    description: 'Insert swing door into host wall with 90° arc swing clearance and frame jambs'
  },
  {
    id: 'window',
    name: 'Glazed Window',
    category: 'drawing',
    personas: ['studio', 'autocad'],
    icon: '🪟',
    shortcut: 'WN',
    commandAlias: 'WINDOW',
    description: 'Insert fenestration window into host wall with sill, frame, and double-pane glass linework'
  },
  {
    id: 'column',
    name: 'Structural Column',
    category: 'drawing',
    personas: ['studio', 'autocad', 'rhino'],
    icon: '🏛️',
    shortcut: 'C',
    commandAlias: 'COLUMN',
    description: 'Place rectangular or circular reinforced concrete / steel structural column with cross-pochè'
  },
  {
    id: 'grid',
    name: 'Structural Grid',
    category: 'drawing',
    personas: ['studio', 'autocad'],
    icon: '⌗',
    shortcut: 'G',
    commandAlias: 'GRID',
    description: 'Place numbered (1, 2, 3...) or lettered (A, B, C...) structural datum axis grid line'
  },
  {
    id: 'stair',
    name: 'Vertical Circulation Stair',
    category: 'drawing',
    personas: ['studio', 'autocad', 'sketchup'],
    icon: '🪜',
    shortcut: 'S',
    commandAlias: 'STAIR',
    description: 'Create code-compliant straight, L-shape, or switchback stair flights with breakline, walkline, and IBC compliance verification',
    flyout: [
      { id: 'stair_straight', name: 'Straight Flight Stair', icon: '🪜' },
      { id: 'stair_l_shape', name: 'L-Shape Quarter-Turn with Landing', icon: '↰' },
      { id: 'stair_u_shape', name: 'U-Shape Dog-Leg Switchback Stair', icon: '↺' }
    ]
  },
  {
    id: 'ramp',
    name: 'Accessible Ramp',
    category: 'drawing',
    personas: ['studio'],
    icon: '♿',
    shortcut: 'RP',
    commandAlias: 'RAMP',
    description: 'Design ADA/IBC compliant accessible ramp with slope ratio verification (1:12 maximum)'
  },
  {
    id: 'section_cut',
    name: 'Section Cut Line',
    category: 'drawing',
    personas: ['studio', 'autocad', 'sketchup'],
    icon: '✂️',
    shortcut: 'X',
    commandAlias: 'SECTION',
    description: 'Place section cut plane with direction arrows and reference bubbles (A / A-201) to slice building cross-sections'
  },
  {
    id: 'detail_callout',
    name: 'Detail Callout',
    category: 'drawing',
    personas: ['studio', 'autocad'],
    icon: '🔍',
    shortcut: 'J',
    commandAlias: 'CALLOUT',
    description: 'Place standard AIA detail bubble (1 / A-501) with dashed boundary region and keynote leader'
  },

  // 7. Set View
  {
    id: 'view_top',
    name: 'Top View (Plan)',
    category: 'set_view',
    personas: ['rhino', 'autocad', 'sketchup', 'studio'],
    icon: '⬆️',
    commandAlias: 'PLAN',
    description: 'Orient camera looking directly downwards along the -Z axis (Orthographic Plan View)'
  },
  {
    id: 'view_south',
    name: 'South Elevation (Front)',
    category: 'set_view',
    personas: ['rhino', 'studio'],
    icon: '🏛️',
    commandAlias: 'FRONT',
    description: 'Orient camera orthographically towards the front/south exterior facade'
  },
  {
    id: 'view_perspective',
    name: 'Perspective 3D',
    category: 'set_view',
    personas: ['rhino', 'sketchup', 'studio'],
    icon: '👁️',
    commandAlias: 'PERSP',
    description: 'Switch to 3-point perspective architectural eye-level camera view'
  },
  {
    id: 'view_4split',
    name: '4-Viewport Split',
    category: 'set_view',
    personas: ['rhino'],
    icon: '⊞',
    commandAlias: '4VIEW',
    description: 'Split center viewport into classic Rhino 4-quadrant layout (Top, Front, Right, Perspective)'
  },

  // 8. Curve Tools
  {
    id: 'curve_nurbs',
    name: 'NURBS Curve',
    category: 'curve_tools',
    personas: ['rhino'],
    icon: '〰️',
    shortcut: 'CRV',
    commandAlias: 'CURVE',
    description: 'Draw degree-3 smooth NURBS curve through control points or interpolated fit points'
  },
  {
    id: 'curve_fillet',
    name: 'Curve Fillet',
    category: 'curve_tools',
    personas: ['rhino', 'autocad'],
    icon: '⌒',
    shortcut: 'F',
    commandAlias: 'FILLET',
    description: 'Round corner between two intersecting lines or curve segments with specified radius'
  },
  {
    id: 'curve_offset',
    name: 'Offset Curve',
    category: 'curve_tools',
    personas: ['rhino', 'autocad', 'sketchup'],
    icon: '⫽',
    shortcut: 'O',
    commandAlias: 'OFFSET',
    description: 'Offset curve or wall centerline by precise parallel distance'
  },
  {
    id: 'curve_boolean',
    name: 'Curve Boolean',
    category: 'curve_tools',
    personas: ['rhino'],
    icon: '⚯',
    commandAlias: 'CRVBOOL',
    description: 'Union, subtract, or intersect overlapping closed 2D curves into clean planar boundaries'
  },

  // 9. Surface Tools
  {
    id: 'surface_planar',
    name: 'Planar Surface',
    category: 'surface_tools',
    personas: ['rhino'],
    icon: '▱',
    commandAlias: 'PLANARSrf',
    description: 'Create planar NURBS surface trimmed to closed boundary curves'
  },
  {
    id: 'surface_extrude',
    name: 'Extrude Curve to Surface',
    category: 'surface_tools',
    personas: ['rhino'],
    icon: '⬆️',
    commandAlias: 'EXTRUDE',
    description: 'Extrude 2D curve along Z-axis vector to generate architectural wall or facade surface'
  },
  {
    id: 'surface_loft',
    name: 'Loft Curves',
    category: 'surface_tools',
    personas: ['rhino'],
    icon: '🌊',
    commandAlias: 'LOFT',
    description: 'Loft smoothly across a sequence of open or closed profile cross-section curves'
  },
  {
    id: 'surface_revolve',
    name: 'Revolve 360°',
    category: 'surface_tools',
    personas: ['rhino'],
    icon: '🏺',
    commandAlias: 'REVOLVE',
    description: 'Revolve profile curve around central axis to create domes, columns, or cylindrical forms'
  },

  // 10. Solid Tools (Booleans)
  {
    id: 'solid_box',
    name: 'Solid Box Primitive',
    category: 'solid_tools',
    personas: ['rhino', 'sketchup'],
    icon: '📦',
    commandAlias: 'BOX',
    description: 'Generate 3D solid box with real-world width, length, and height dimensions'
  },
  {
    id: 'boolean_union',
    name: 'Boolean Union',
    category: 'solid_tools',
    personas: ['rhino', 'autocad'],
    icon: '➕',
    shortcut: 'BU',
    commandAlias: 'BOOLEANUNION',
    description: 'Combine multiple overlapping 3D solids or 2D floor areas into a single seamless mass'
  },
  {
    id: 'boolean_diff',
    name: 'Boolean Difference',
    category: 'solid_tools',
    personas: ['rhino', 'autocad'],
    icon: '➖',
    shortcut: 'BD',
    commandAlias: 'BOOLEANDIFF',
    description: 'Subtract one solid mass from another (e.g. cut courtyards, lightwells, or atriums)'
  },
  {
    id: 'pushpull',
    name: 'Push / Pull Massing',
    category: 'solid_tools',
    personas: ['sketchup'],
    icon: '⬆️',
    shortcut: 'P',
    commandAlias: 'PUSHPULL',
    description: 'Extrude any 2D planar face upwards into a 3D volume with intuitive cursor dragging'
  },

  // 11. Mesh Tools
  {
    id: 'mesh_from_srf',
    name: 'Mesh from Surface',
    category: 'mesh_tools',
    personas: ['rhino'],
    icon: '🕸️',
    commandAlias: 'MESH',
    description: 'Tessellate NURBS mathematical surface into editable polygon mesh with density control'
  },
  {
    id: 'quad_remesh',
    name: 'Quad Remesh',
    category: 'mesh_tools',
    personas: ['rhino'],
    icon: '▦',
    commandAlias: 'QUADREMESH',
    description: 'Re-topology irregular meshes into clean structured quad-faced architectural meshes'
  },

  // 12. SubD Tools
  {
    id: 'subd_box',
    name: 'SubD Box',
    category: 'subd',
    personas: ['rhino'],
    icon: '🧊',
    commandAlias: 'SUBDBOX',
    description: 'Organic subdivision modeling primitive for fluid architectural canopies and rooflines'
  },
  {
    id: 'subd_crease',
    name: 'SubD Crease Edge',
    category: 'subd',
    personas: ['rhino'],
    icon: '⚡',
    commandAlias: 'CREASE',
    description: 'Lock crisp sharp architectural edges on smooth subdivision curved forms'
  },

  // 13. Containers & Blocks
  {
    id: 'block_create',
    name: 'Create Block',
    category: 'containers',
    personas: ['autocad', 'studio'],
    icon: '📦',
    shortcut: 'B',
    commandAlias: 'BLOCK',
    description: 'Group multiple entities into a reusable CAD block definition'
  },
  {
    id: 'furniture',
    name: 'Insert Furniture / Component',
    category: 'containers',
    personas: ['studio', 'sketchup', 'autocad'],
    icon: '🛋️',
    shortcut: 'F',
    commandAlias: 'INSERT',
    description: 'Place parameterized architectural furnishings (desks, beds, sofas, tables) with clearance zones'
  }
];

// ---------------------------------------------------------------------------
// 4. Universal Studio Search Engine
// ---------------------------------------------------------------------------

/**
 * Searches across all tools, categories, and commands with fuzzy keyword matching.
 * @param {string} query Search text
 * @param {Object} [options] Filter options (e.g. persona)
 * @returns {Array<Object>} Matching tool descriptors ranked by relevance
 */
export function searchStudioTools(query, options = {}) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const filterPersona = options.persona || null;

  const results = [];

  for (const tool of STUDIO_TOOL_CATALOG) {
    if (filterPersona && !tool.personas.includes(filterPersona) && !tool.personas.includes('all')) {
      // Allow searching other personas, but deprioritize
    }

    const nameMatch = tool.name.toLowerCase().includes(q);
    const idMatch = tool.id.toLowerCase().includes(q);
    const aliasMatch = tool.commandAlias ? tool.commandAlias.toLowerCase().startsWith(q) : false;
    const catMatch = tool.category.toLowerCase().includes(q);
    const descMatch = tool.description ? tool.description.toLowerCase().includes(q) : false;
    const shortcutMatch = tool.shortcut ? tool.shortcut.toLowerCase() === q : false;

    if (nameMatch || idMatch || aliasMatch || catMatch || descMatch || shortcutMatch) {
      let score = 0;
      if (aliasMatch && tool.commandAlias.toLowerCase() === q) score += 100;
      if (shortcutMatch) score += 90;
      if (tool.name.toLowerCase().startsWith(q)) score += 80;
      else if (nameMatch) score += 60;
      if (idMatch) score += 50;
      if (catMatch) score += 30;
      if (descMatch) score += 10;
      if (filterPersona && tool.personas.includes(filterPersona)) score += 20;

      const catMeta = TOOL_CATEGORIES.find(c => c.id === tool.category) || { name: tool.category, icon: '🔧' };

      results.push({
        ...tool,
        categoryName: catMeta.name,
        categoryIcon: catMeta.icon,
        score
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 15);
}

// ---------------------------------------------------------------------------
// 5. Ribbon Tabs & Panels Configuration Per Persona
// ---------------------------------------------------------------------------

export const PERSONA_RIBBON_CONFIGS = {
  studio: {
    tabs: [
      {
        id: 'home',
        label: 'Home',
        panels: [
          { id: 'select', title: 'Selection', tools: ['select', 'pan'] },
          { id: 'draw_core', title: 'Architectural Draw', tools: ['room', 'polyroom', 'wall', 'door', 'window'] },
          { id: 'circulation', title: 'Circulation', tools: ['stair', 'ramp'] },
          { id: 'structure', title: 'Structure', tools: ['column', 'grid'] },
          { id: 'annotate', title: 'Annotations', tools: ['dimension', 'dim_chain', 'measure', 'section_cut', 'detail_callout'] }
        ]
      },
      {
        id: 'detailing',
        label: 'Construction Details',
        panels: [
          { id: 'callouts', title: 'Callout Bubbles', tools: ['detail_callout', 'section_cut'] },
          { id: 'hatching', title: 'Material Pochè', tools: ['hatch'] }
        ]
      },
      {
        id: 'views',
        label: 'Set View',
        panels: [
          { id: 'cameras', title: 'Orthographic Views', tools: ['view_top', 'view_south', 'view_perspective'] }
        ]
      }
    ]
  },
  autocad: {
    tabs: [
      {
        id: 'home',
        label: 'Home',
        panels: [
          { id: 'draw', title: 'Draw', tools: ['line', 'polyline', 'wall', 'column', 'grid', 'hatch'] },
          { id: 'modify', title: 'Modify', tools: ['select', 'curve_fillet', 'curve_offset', 'boolean_union', 'boolean_diff'] },
          { id: 'annotation', title: 'Annotation', tools: ['dimension', 'dim_aligned', 'dim_chain', 'section_cut', 'detail_callout'] },
          { id: 'measure', title: 'Utilities', tools: ['measure', 'area_calc'] }
        ]
      },
      {
        id: 'annotate',
        label: 'Annotate',
        panels: [
          { id: 'dims', title: 'Dimensions', tools: ['dimension', 'dim_aligned', 'dim_chain'] },
          { id: 'callouts', title: 'Callouts & Tags', tools: ['section_cut', 'detail_callout'] }
        ]
      },
      {
        id: 'view',
        label: 'View',
        panels: [
          { id: 'nav', title: 'Navigation', tools: ['pan', 'zoom_extents', 'view_top'] }
        ]
      }
    ]
  },
  rhino: {
    tabs: [
      {
        id: 'standard',
        label: 'Standard',
        panels: [
          { id: 'select', title: 'Select', tools: ['select', 'pan', 'orbit'] },
          { id: 'views', title: 'Set View', tools: ['view_top', 'view_south', 'view_perspective', 'view_4split'] }
        ]
      },
      {
        id: 'curves',
        label: 'Curve Tools',
        panels: [
          { id: 'lines', title: 'Lines & Polylines', tools: ['line', 'polyline', 'curve_nurbs'] },
          { id: 'curve_ops', title: 'Curve Edit', tools: ['curve_fillet', 'curve_offset', 'curve_boolean'] }
        ]
      },
      {
        id: 'surfaces',
        label: 'Surface Tools',
        panels: [
          { id: 'srf_gen', title: 'Surfaces', tools: ['surface_planar', 'surface_extrude', 'surface_loft', 'surface_revolve'] }
        ]
      },
      {
        id: 'solids',
        label: 'Solid Tools',
        panels: [
          { id: 'csg', title: 'Solids & Booleans', tools: ['solid_box', 'boolean_union', 'boolean_diff'] }
        ]
      },
      {
        id: 'mesh_subd',
        label: 'Mesh & SubD',
        panels: [
          { id: 'mesh', title: 'Mesh Tools', tools: ['mesh_from_srf', 'quad_remesh'] },
          { id: 'subd', title: 'SubD Tools', tools: ['subd_box', 'subd_crease'] }
        ]
      }
    ]
  },
  photoshop: {
    tabs: [
      {
        id: 'select_mask',
        label: 'Select & Mask',
        panels: [
          { id: 'selection', title: 'Selections', tools: ['select', 'marquee', 'lasso', 'crop_tool'] }
        ]
      },
      {
        id: 'paint_retouch',
        label: 'Retouch & Paint',
        panels: [
          { id: 'painting', title: 'Brushes & Fills', tools: ['watercolor_brush', 'paint_bucket', 'hatch'] }
        ]
      },
      {
        id: 'measure_nav',
        label: 'Measure & Nav',
        panels: [
          { id: 'navigation', title: 'View Navigation', tools: ['pan', 'zoom_extents', 'measure'] }
        ]
      }
    ]
  },
  sketchup: {
    tabs: [
      {
        id: 'draw',
        label: 'Draw',
        panels: [
          { id: 'primitives', title: 'Draw Primitives', tools: ['line', 'room', 'column', 'stair'] },
          { id: 'modify', title: 'Edit & Push/Pull', tools: ['pushpull', 'curve_offset', 'select'] }
        ]
      },
      {
        id: 'construction',
        label: 'Construction',
        panels: [
          { id: 'tools', title: 'Measure & Cut', tools: ['measure', 'dimension', 'section_cut', 'furniture'] }
        ]
      },
      {
        id: 'camera',
        label: 'Camera',
        panels: [
          { id: 'views', title: 'Set View', tools: ['orbit', 'pan', 'zoom_extents', 'view_perspective'] }
        ]
      }
    ]
  }
};
