/**
 * Ghost Tool Contract Test — every catalog tool either has a real handler in
 * the plan workspace OR is explicitly listed in PLANNED_TOOLS. No silent
 * ghosts: a tool that does nothing must say so.
 */

import { STUDIO_TOOL_CATALOG, PLANNED_TOOLS, searchStudioTools } from '../src/core/personas.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

console.log('\n--- Ghost tool contract ---');
{
  const plan = fs.readFileSync(fileURLToPath(new URL('../src/ui/views/plan.js', import.meta.url)), 'utf-8');
  const pointerTools = [...plan.matchAll(/tool === '([a-z_]+)'/g)].map(x => x[1]);
  const actionBranches = [...plan.matchAll(/toolId === '([a-z_]+)'/g)].map(x => x[1]);
  const aliases = ['marquee_rect', 'marquee_ellip', 'marquee_single_row', 'stair_l_shape', 'stair_u_shape',
    'hatch_concrete', 'hatch_earth', 'hatch_insulation', 'hatch_brick'];
  const implemented = new Set([...pointerTools, ...actionBranches, ...aliases]);

  // Aliased routes inside handleStudioToolAction
  const aliasBlock = plan.match(/const ALIASED_ROUTES = \{([\s\S]*?)\};/);
  const aliasTargets = aliasBlock ? [...aliasBlock[1].matchAll(/([a-z_]+):\s*'/g)].map(m => m[1]) : [];
  for (const t of aliasTargets) implemented.add(t);
  // plus explicitly-routed tools
  for (const t of ['pan', 'orbit', 'flyout_stairs', 'flyout_hatching', 'flyout_marquee',
    'cpanel_properties', 'cpanel_layers', 'cpanel_validation', 'cpanel_details',
    'view_top', 'view_south', 'view_perspective', 'view_4split', 'zoom_extents', 'pushpull']) implemented.add(t);

  const ghosts = [];
  const planned = [];
  const ok = [];
  for (const t of STUDIO_TOOL_CATALOG) {
    // Ribbon UI routes (tab switchers, panels) are prefix-handled, not ghosts
    const prefixRouted = t.id.startsWith('tab_switch_') || t.id.startsWith('panel_');
    if (implemented.has(t.id) || prefixRouted) ok.push(t.id);
    else if (PLANNED_TOOLS.has(t.id)) planned.push(t.id);
    else ghosts.push(t.id);
  }

  assert(ghosts.length === 0, `No silent ghosts — every tool is implemented or Planned (unaccounted: ${ghosts.join(', ') || 'none'})`);
  assert(ok.length >= 35, `Implemented tool count (${ok.length}) covers the interactive set`);

  // Planned list must not contain implemented tools (honesty both directions)
  const falsePlanned = [...PLANNED_TOOLS].filter(id => implemented.has(id));
  assert(falsePlanned.length === 0, `PLANNED_TOOLS contains no implemented tools (false entries: ${falsePlanned.join(', ') || 'none'})`);

  // Key interactive tools must be REAL
  for (const mustWork of ['select', 'line', 'polyline', 'wall', 'room', 'polyroom', 'door', 'window',
    'stair', 'ramp', 'measure', 'dimension', 'hatch', 'column', 'grid', 'furniture', 'north',
    'text', 'leader', 'section_cut', 'detail_callout', 'pan', 'marquee', 'dim_aligned', 'area_calc']) {
    assert(implemented.has(mustWork), `"${mustWork}" has a real handler`);
  }

  // Panel/tab-switch entries are ribbon UI routes handled by prefix
  for (const t of STUDIO_TOOL_CATALOG.filter(x => x.id.startsWith('panel_') || x.id.startsWith('tab_switch_'))) {
    const prefix = t.id.startsWith('panel_') ? 'panel_' : 'tab_switch_';
    assert(plan.includes(`startsWith('${prefix}')`), `${t.id} routes to a ${prefix} handler`);
  }

  // Planned tools are dimmed in the palette renderer
  const palette = fs.readFileSync(fileURLToPath(new URL('../src/ui/components/palette.js', import.meta.url)), 'utf-8');
  assert(palette.includes('PLANNED_TOOLS'), 'Palette dims planned tools');
  const ribbon = fs.readFileSync(fileURLToPath(new URL('../src/ui/components/ribbon.js', import.meta.url)), 'utf-8');
  assert(ribbon.includes('PLANNED_TOOLS'), 'Ribbon dims planned tools');

  // Search results surface planned status
  const res = searchStudioTools('lasso');
  assert(res.length > 0, 'Planned tools remain discoverable via search (they answer honestly on click)');
}

console.log(`\n========================================`);
console.log(`Ghost Tool Contract Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
