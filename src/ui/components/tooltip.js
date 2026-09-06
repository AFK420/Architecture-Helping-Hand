/**
 * Architecture Helping Hand - Dual-Tier Tool Guidance System
 * Provides:
 * 1. Tier 1: Floating cursor-following smart card popover near hovered tool
 *    ("What is it?" + "How to use it 1-2-3")
 * 2. Tier 2: Permanent Architectural Standards Inspector card in C-Panels
 *    (IBC / ADA Building codes, formulas, cavity wall thicknesses, and pro tips)
 */

import { STUDIO_TOOL_CATALOG } from '../../core/personas.js';

export const TOOL_GUIDANCE_CATALOG = {
  select: {
    name: 'Select & Transform',
    icon: '➤',
    shortcut: 'V',
    alias: 'SEL',
    category: 'Selection',
    desc: 'Selects, moves, and manipulates architectural elements on the drawing canvas.',
    usage: [
      'Click any element on canvas to select and inspect its properties.',
      'Drag selected elements to relocate them with automatic snap alignment.',
      'Press Del or Backspace to delete selected elements. Press Esc to clear.'
    ],
    standards: 'Standard CAD picking. Left-to-right window selects enclosed items; right-to-left crossing window selects touched items.',
    proTip: 'Hold Space and drag canvas to pan without losing your active selection.'
  },
  wall: {
    name: 'Architectural Wall',
    icon: '─',
    shortcut: 'W',
    alias: 'WALL',
    category: 'Architecture',
    desc: 'Draws structural or partition walls with realistic thicknesses and automatic corner joins.',
    usage: [
      'Click start point on drawing canvas.',
      'Move cursor in desired direction or type exact length (e.g. 5m).',
      'Click end point or press Enter. Wall corners automatically join and heal.'
    ],
    standards: 'IBC 1020: Minimum corridor clearance = 1100 mm (44"). Standard thicknesses: Exterior cavity wall = 250–300 mm, Interior partition = 100–120 mm, Structural concrete shear wall = 200–300 mm.',
    proTip: 'Hold Shift to constrain walls to 90° ortho angles. Walls snap to existing corner endpoints.'
  },
  room: {
    name: 'Room Rectangle',
    icon: '▭',
    shortcut: 'R',
    alias: 'REC',
    category: 'Architecture',
    desc: 'Generates a fully enclosed room with 4 boundary walls, floor area, and zoning schedule tags.',
    usage: [
      'Click initial corner point on drawing canvas.',
      'Drag cursor diagonally to define room size or type "REC 5 4" in CLI.',
      'Click opposite corner to place enclosed space and auto-generate walls.'
    ],
    standards: 'IBC 1208: Minimum habitable room area = 70 sq ft (6.5 m²) with minimum 7 ft (2.13 m) ceiling height. Master bedroom standard: 14–18 m², living room standard: 20–30 m².',
    proTip: 'Doors and windows snap directly to any of the room boundary walls.'
  },
  polyroom: {
    name: 'Polygonal Room',
    icon: '⬡',
    shortcut: 'Shift+R',
    alias: 'POLYROOM',
    category: 'Architecture',
    desc: 'Draws custom L-shaped, T-shaped, or irregular multi-corner rooms by clicking sequential vertices.',
    usage: [
      'Click sequentially on canvas to place each corner vertex.',
      'Click the starting point or press "Complete" button to seal polygon.',
      'Net usable floor area is calculated automatically using the Shoelace formula.'
    ],
    standards: 'Irregular spaces must maintain 1200 mm (48") clear passage between architectural alcoves and pinch points.',
    proTip: 'Press Esc or click Cancel in the contextual toolbar to discard an unfinished polygon chain.'
  },
  door: {
    name: 'Hinged Door',
    icon: '🚪',
    shortcut: 'DR',
    alias: 'DOOR',
    category: 'Openings',
    desc: 'Places standard hinged swing doors on walls with 90° clear swing arcs and wall punch-outs.',
    usage: [
      'Hover cursor over any architectural wall on canvas.',
      'Click on the wall to install door opening at cursor location.',
      'Swing arc and wall cut-out are generated automatically.'
    ],
    standards: 'ADA 404 & IBC 1010: Minimum clear opening = 813 mm (32"), standard interior door = 900 mm (36"), main entrance = 950–1000 mm. Requires 1525 mm (60") turning clearance on pull side.',
    proTip: 'Deleting a door instantly heals the wall back to a solid continuous segment.'
  },
  window: {
    name: 'Glazed Window',
    icon: '🪟',
    shortcut: 'WN',
    alias: 'WINDOW',
    category: 'Openings',
    desc: 'Places exterior glazed window openings with sill, glass mullions, and wall punch-outs.',
    usage: [
      'Hover cursor over any exterior wall on canvas.',
      'Click to install window opening at cursor location.',
      'Wall geometry automatically punches through with glazed frame.'
    ],
    standards: 'IBC 1205: Natural light glazed openings must equal at least 8% of room floor area. Standard sill height = 900 mm (36") above finished floor level.',
    proTip: 'Locate windows on South/East facades for optimal passive solar heating and daylighting.'
  },
  stair: {
    name: 'Vertical Circulation Stair',
    icon: '🪜',
    shortcut: 'S',
    alias: 'STAIR',
    category: 'Circulation',
    desc: 'Drafts code-compliant stairs with calculated risers, goings, travel line, and break-line symbol.',
    usage: [
      'Click start point at bottom of staircase flight.',
      'Drag along flight travel direction to desired length.',
      'Riser count, tread depth, and Blondel formula calculate in real time.'
    ],
    standards: 'Blondel Formula: 2R + T = 620–640 mm (24–25"). IBC 1011: Max riser height = 178 mm (7"), Min tread run = 279 mm (11"), Min stair width = 1100 mm (44"), Min headroom = 2032 mm (6\'8").',
    proTip: 'Type "STAIR 16 1.1" in the bottom command prompt for an instant 16-riser, 1.1m wide compliant staircase.'
  },
  ramp: {
    name: 'Accessible Ramp',
    icon: '♿',
    shortcut: 'RP',
    alias: 'RAMP',
    category: 'Circulation',
    desc: 'Drafts barrier-free accessible ramps with ADA slope limits and intermediate level landings.',
    usage: [
      'Click start of ramp run on canvas.',
      'Drag along slope direction. Live slope indicator shows gradient (1:12).',
      'Click end point to place ramp and directional slope arrow.'
    ],
    standards: 'ADA 405: Maximum slope = 1:12 (8.33% grade). Max rise for single run = 760 mm (30"). Min clear width = 915 mm (36"). Level landing required every 9m of run.',
    proTip: 'Handrails required on both sides for any ramp with a rise greater than 150 mm (6").'
  },
  column: {
    name: 'Structural Column',
    icon: '🏛️',
    shortcut: 'C',
    alias: 'COL',
    category: 'Structure',
    desc: 'Places reinforced concrete square columns, round piers, or steel universal columns.',
    usage: [
      'Hover near structural grid lines or wall junctions.',
      'Click to drop column. Snaps automatically to grid intersections.',
      'Renders standard structural diagonal crosshatch pochè.'
    ],
    standards: 'Typical column sizing: Low-rise residential = 300×300 mm; Multi-story commercial = 500×500 mm to 800×800 mm. Minimum concrete cover to rebar = 40 mm.',
    proTip: 'Columns snap cleanly to grid axis intersections with high magnetic priority.'
  },
  grid: {
    name: 'Structural Grid Line',
    icon: '⌗',
    shortcut: 'G',
    alias: 'GRID',
    category: 'Structure',
    desc: 'Places modular structural datum axes with labeled bubbles (1, 2, 3... or A, B, C...).',
    usage: [
      'Click start point for structural datum axis.',
      'Drag along building bay and click to place axis line.',
      'Automatic bubble index labels sequence (1, 2, 3... or A, B, C...).'
    ],
    standards: 'Structural bays typically modularized on 6.0m, 7.2m, 8.4m, or 9.0m grids to optimize basement parking stall layout and standard beam spans.',
    proTip: 'Standard convention: Numbered bubbles for horizontal axes, Lettered bubbles for vertical axes.'
  },
  dimension: {
    name: 'Linear Dimension',
    icon: '📏',
    shortcut: 'D',
    alias: 'DIMLIN',
    category: 'Annotations',
    desc: 'Places architectural dimension strings between two points with witness lines and metric/imperial readout.',
    usage: [
      'Click first measurement reference point.',
      'Click second measurement reference point.',
      'Drag offset away from object and click to place dimension line.'
    ],
    standards: 'Architectural Dimension Hierarchy: Line 1 = Window/Door openings & piers; Line 2 = Wall-to-wall exterior envelope; Line 3 = Overall building footprint.',
    proTip: 'Type "DCO" in command line to chain continuous dimensions along a facade.'
  },
  measure: {
    name: 'Tape Measure',
    icon: '📐',
    shortcut: 'M',
    alias: 'DIST',
    category: 'Measuring',
    desc: 'Quick glance measurement tool to inspect distances, angles, and clearances without placing permanent drawing elements.',
    usage: [
      'Click starting reference point.',
      'Move cursor to target point. Live real-world meters display on ruler.',
      'Glance at delta-X and delta-Y distances in real-time. Press Esc to exit.'
    ],
    standards: 'Clearance guidelines: 900 mm behind dining chairs, 1200 mm between opposing kitchen counters, 750 mm beside master bed.',
    proTip: 'Does not alter drawing geometry; perfect for checking code clearances on the fly.'
  },
  hatch: {
    name: 'Architectural Hatch',
    icon: '🖌️',
    shortcut: 'H',
    alias: 'HATCH',
    category: 'Finishes',
    desc: 'Fills rooms, walls, or sections with standardized architectural pochè material patterns.',
    usage: [
      'Select hatch pattern (Brick, Concrete, Diagonal, Wood, Terrazzo).',
      'Click inside any room or cut wall boundary on the drawing canvas.',
      'Material fills boundary with scalable vector pattern.'
    ],
    standards: 'ANSI31 (45° diagonal) = Brick/Masonry; AR-CONC (stipple & triangles) = Reinforced Concrete; Solid Black/Grey = Sliced structural walls.',
    proTip: 'Patterns automatically adapt and scale smoothly with viewport zoom.'
  },
  section_cut: {
    name: 'Section Cut Line',
    icon: '✂️',
    shortcut: 'X',
    alias: 'SECTION',
    category: 'Drafting',
    desc: 'Places a cross-section cutting plane line (A-A) with directional viewing arrows and callout bubble.',
    usage: [
      'Click start point of cutting plane line.',
      'Drag through building model and click end point.',
      'Switch to Section A tab to view the live sliced architectural section.'
    ],
    standards: 'Section cuts should pass through vertical circulation (stairs/elevators) and major exterior openings to communicate vertical spatial relationships.',
    proTip: 'Arrowhead points toward the viewing direction of the projected section cut.'
  },
  detail_callout: {
    name: 'Detail Callout',
    icon: '🔍',
    shortcut: 'J',
    alias: 'CALLOUT',
    category: 'Drafting',
    desc: 'Places an enlarged callout bubble linking plan areas to 1:5 or 1:10 construction details.',
    usage: [
      'Click target location on plan to place callout bubble.',
      'Choose assembly type (Footing, Parapet, Window Sill, Stair Nosing).',
      'Click detail link in right C-Panel to open full construction detail sheet.'
    ],
    standards: 'Architectural Detail Standard: Top number = Detail Callout # (e.g. 1), Bottom number = Sheet reference # (e.g. A-501). Standard scales: 1:5, 1:10, 1:20.',
    proTip: 'Directly linked to parametric construction details in the Detailing C-panel.'
  },
  insert_block: {
    name: 'CAD Block Library',
    icon: '📦',
    shortcut: 'I',
    alias: 'INSERT',
    category: 'Blocks',
    desc: 'Inserts parametric 2D architectural CAD blocks: desks, doors, WC fixtures, trees, and sofas.',
    usage: [
      'Select block symbol from catalog or type "INSERT [BLOCK_ID]" in CLI.',
      'Click location on canvas to place block instance.',
      'Blocks scale and snap cleanly to architectural grid modules.'
    ],
    standards: 'Standard CAD block footprints: Executive Desk = 1800×900 mm, Door = 900 mm, WC Fixture = 400×700 mm with 800 mm clear frontage.',
    proTip: 'Blocks maintain CAD layer standards (e.g. A-FURN, A-EQPM, A-DOOR).'
  },
  pan: {
    name: 'Pan Hand',
    icon: '✋',
    shortcut: 'Space+Drag',
    alias: 'PAN',
    category: 'Navigation',
    desc: 'Pans the drafting canvas viewport in any direction smoothly.',
    usage: [
      'Click and drag on empty canvas to slide viewport.',
      'Or hold Spacebar and drag mouse anywhere across the drawing.'
    ],
    standards: 'Preserves exact viewport zoom level and drawing scale.',
    proTip: 'Arrow keys (Up, Down, Left, Right) also pan viewport in calibrated increments.'
  },
  zoom_extents: {
    name: 'Zoom Extents',
    icon: '🔍',
    shortcut: 'Z+E',
    alias: 'ZOOM_E',
    category: 'Navigation',
    desc: 'Fits all drawing entities centered within the viewport with comfortable padding.',
    usage: [
      'Click to instantly center and frame all plan walls, rooms, and elements.'
    ],
    standards: 'AutoCAD / Rhino equivalent of "Zoom Extents" / "Fit to View".',
    proTip: 'Click "Fit" in the floating HUD or type "ZOOM" in command bar.'
  }
};

let activePopoverEl = null;
let popoverTimeout = null;

/**
 * Initializes the Dual-Tier Tool Guidance System
 * Attaches event listeners to ribbon buttons, toolstrip buttons, and HUD controls.
 */
export function initToolGuidance(container) {
  if (!container) return;

  // Ensure Tier 1 Popover DOM exists
  let popover = document.getElementById('studio-tool-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'studio-tool-popover';
    popover.className = 'studio-tool-popover';
    popover.style.display = 'none';
    document.body.appendChild(popover);
  }
  activePopoverEl = popover;

  const toolSelectors = [
    '.ribbon-tool-btn',
    '.palette-tool-btn',
    '.iconic-tool-btn',
    '.hud-btn',
    '[data-tool]'
  ];

  const elements = container.querySelectorAll(toolSelectors.join(', '));
  elements.forEach(btn => {
    btn.addEventListener('mouseenter', (e) => {
      const toolId = btn.dataset.tool;
      if (!toolId) return;
      showToolPopover(e, toolId);
      updateInspectorGuide(toolId);
    });

    btn.addEventListener('mouseleave', () => {
      hideToolPopover();
    });

    btn.addEventListener('mousemove', (e) => {
      positionPopoverNearMouse(e);
    });
  });
}

/**
 * Shows Tier 1 Floating Popover near the mouse cursor
 */
export function showToolPopover(e, toolId) {
  if (!activePopoverEl) return;
  clearTimeout(popoverTimeout);

  const guide = TOOL_GUIDANCE_CATALOG[toolId] || {
    name: (toolId || 'TOOL').toUpperCase(),
    icon: '🛠️',
    shortcut: '',
    desc: 'Architectural studio drawing and editing tool.',
    usage: ['Click to activate tool and interact with drawing canvas.'],
    standards: 'Standard CAD drawing entity with real-world precision.',
    proTip: 'Check bottom command bar for shortcuts and aliases.'
  };

  activePopoverEl.innerHTML = `
    <div class="popover-header">
      <span class="popover-icon">${guide.icon}</span>
      <div class="popover-title-group">
        <span class="popover-title">${guide.name}</span>
        ${guide.shortcut ? `<span class="popover-badge"><kbd>${guide.shortcut}</kbd></span>` : ''}
      </div>
    </div>
    <div class="popover-section">
      <span class="popover-sublabel">WHAT IS IT?</span>
      <p class="popover-desc">${guide.desc}</p>
    </div>
    <div class="popover-section">
      <span class="popover-sublabel">HOW TO USE IT:</span>
      <ol class="popover-steps">
        ${guide.usage.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
    ${guide.standards ? `
      <div class="popover-section standards">
        <span class="popover-sublabel">📐 STANDARD / CODE:</span>
        <p class="popover-code">${guide.standards}</p>
      </div>
    ` : ''}
  `;

  popoverTimeout = setTimeout(() => {
    if (activePopoverEl) {
      activePopoverEl.style.display = 'block';
      positionPopoverNearMouse(e);
    }
  }, 120);
}

/**
 * Hides Tier 1 Floating Popover
 */
export function hideToolPopover() {
  clearTimeout(popoverTimeout);
  if (activePopoverEl) {
    activePopoverEl.style.display = 'none';
  }
}

/**
 * Positions Tier 1 popover near cursor, keeping it within viewport boundaries
 */
function positionPopoverNearMouse(e) {
  if (!activePopoverEl || activePopoverEl.style.display === 'none') return;

  const pad = 16;
  let x = e.clientX + pad;
  let y = e.clientY + pad;

  const rect = activePopoverEl.getBoundingClientRect();
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  if (x + rect.width > winW - 12) {
    x = e.clientX - rect.width - pad;
  }
  if (y + rect.height > winH - 12) {
    y = e.clientY - rect.height - pad;
  }
  if (x < 12) x = 12;
  if (y < 12) y = 12;

  activePopoverEl.style.left = `${x}px`;
  activePopoverEl.style.top = `${y}px`;
}

/**
 * Updates Tier 2 Dedicated Permanent Inspector Card in Right C-Panels
 */
export function updateInspectorGuide(toolId) {
  const guideCard = document.getElementById('cpanel-tool-guide-card');
  if (!guideCard) return;

  const guide = TOOL_GUIDANCE_CATALOG[toolId] || TOOL_GUIDANCE_CATALOG.select;

  guideCard.innerHTML = `
    <div class="tool-guide-header">
      <div class="guide-title-row">
        <span class="guide-icon">${guide.icon}</span>
        <span class="guide-name">${guide.name}</span>
      </div>
      ${guide.shortcut ? `<span class="guide-shortcut"><kbd>${guide.shortcut}</kbd></span>` : ''}
    </div>

    <div class="tool-guide-body">
      <div class="guide-block">
        <span class="guide-label">PURPOSE</span>
        <p class="guide-text">${guide.desc}</p>
      </div>

      <div class="guide-block">
        <span class="guide-label">WORKFLOW</span>
        <div class="guide-steps">
          ${guide.usage.map((step, i) => `
            <div class="guide-step-item">
              <span class="step-num">${i + 1}</span>
              <span class="step-text">${step}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="guide-block standards-block">
        <span class="guide-label">IBC / ADA BUILDING STANDARD</span>
        <p class="guide-code">${guide.standards}</p>
      </div>

      <div class="guide-block protip-block">
        <span class="guide-label">PRO ARCHITECT TIP</span>
        <p class="guide-protip">💡 ${guide.proTip}</p>
      </div>
    </div>
  `;
}
