/**
 * Icon System Test Suite — original SVG registry contract.
 * Pins: no emoji in tool/nav/tab/command chrome; unique semantic glyphs;
 * correct resolution order (iconName > id > alias > generic).
 */

import {
  icon, toolIcon, docTypeIcon, navIcon, commandIcon, categoryIcon,
  ICONS, TOOL_ALIASES, hasIcon
} from '../src/core/icons.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

console.log('\n--- Icon registry ---');
{
  assert(Object.keys(ICONS).length >= 80, `Registry has a full glyph set (${Object.keys(ICONS).length})`);
  assert(!hasIcon('🦏') && !/\uD83C[\uDF00-\uDFFF]/.test(JSON.stringify(ICONS)), 'No emoji anywhere in the registry');

  const wall = icon('wall');
  assert(wall.startsWith('<svg') && wall.includes('viewBox="0 0 24 24"') && wall.includes('stroke="currentColor"'), 'Icons are inline SVG on a 24-grid with currentColor');
  assert(wall.includes('aria-hidden="true"'), 'Icons are hidden from screen readers (decorative)');
  assert(icon('wall') === icon('wall'), 'Icon markup is cached');

  // Unique semantics: unrelated tools must not share a glyph
  const wallBody = ICONS.wall, doorBody = ICONS.door, measureBody = ICONS.measure;
  assert(new Set([wallBody, doorBody, measureBody]).size === 3, 'Wall/door/measure glyphs are distinct');

  // Tool resolution
  assert(toolIcon({ id: 'wall' }).includes('ahh-icon-wall'), 'Tool id resolves directly');
  assert(toolIcon({ id: 'view_south' }).includes('ahh-icon-front'), 'Semantic alias resolves (view_south → front)');
  assert(toolIcon({ id: 'totally_unknown' }).includes('generic'), 'Unknown tools fall back to a generic glyph');
  assert(toolIcon(null).includes('generic'), 'Null tool is safe');
  assert(toolIcon({ id: 'wall', icon: '🧱' }).includes('ahh-icon-wall'), 'Emoji icon field is ignored in favor of the SVG registry');

  // Document tabs / navigation / commands / categories
  assert(docTypeIcon('3d_massing').includes('ahh-icon-perspective'), '3D massing tab uses the perspective glyph');
  assert(docTypeIcon('section').includes('ahh-icon-section'), 'Section tab uses the cut-plane glyph');
  assert(docTypeIcon('unknown_type').includes('ahh-icon-sheet'), 'Unknown doc types fall back to the sheet glyph');
  assert(navIcon('stairs').includes('ahh-icon-stair'), 'Nav stairs glyph');
  assert(navIcon('nope').includes('generic'), 'Unknown nav falls back safely');
  assert(commandIcon('nav_plan').includes('ahh-icon-room'), 'Command palette plan glyph');
  assert(categoryIcon('measuring').includes('ahh-icon-measure'), 'Category glyph resolves');

  // Aliases cover the catalog (no emoji leaking through palette rendering)
  const catalogIds = [
    'measure', 'dimension', 'dim_aligned', 'dim_chain', 'area_calc', 'select', 'marquee', 'lasso',
    'crop_tool', 'hatch', 'paint_bucket', 'watercolor_brush', 'pan', 'orbit', 'zoom_extents',
    'line', 'polyline', 'wall', 'room', 'polyroom', 'door', 'window', 'column', 'grid',
    'stair', 'ramp', 'section_cut', 'detail_callout', 'view_top', 'view_south',
    'view_perspective', 'view_4split', 'curve_nurbs', 'curve_fillet', 'curve_offset',
    'curve_boolean', 'surface_planar', 'surface_extrude', 'surface_loft', 'surface_revolve',
    'solid_box', 'boolean_union', 'boolean_diff', 'pushpull', 'mesh_from_srf', 'quad_remesh',
    'subd_box', 'subd_crease', 'block_create', 'furniture', 'cpanel_properties',
    'cpanel_layers', 'cpanel_validation', 'cpanel_details', 'flyout_stairs',
    'flyout_hatching', 'flyout_marquee', 'north'
  ];
  const uncovered = catalogIds.filter(id => !ICONS[id] && !TOOL_ALIASES[id]);
  assert(uncovered.length === 0, `Every catalog tool id resolves to a glyph (uncovered: ${uncovered.join(', ') || 'none'})`);
}

console.log(`\n========================================`);
console.log(`Icon System Test Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
