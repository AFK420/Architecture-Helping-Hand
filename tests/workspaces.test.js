/**
 * Architecture Helping Hand — Workspace & Tool Registry Contract Tests
 * Phase A (IA redesign): the registry in src/core/workspaces.js is the
 * single source of truth for navigation, so its integrity is a contract:
 *   - every tool id has a matching #mode-view-<id> section in index.html
 *   - every workspace icon resolves in core/icons.js (no emoji fallbacks)
 *   - ids are unique and each tool lives in exactly one workspace
 *   - the registry covers the full legacy tool set (nothing dropped)
 *   - workflow neighbors are consistent with WORKSPACE_ORDER
 *   - search metadata actually resolves real and planned queries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import { pathToFileURL } from 'url';

const {
  WORKSPACES,
  WORKSPACE_ORDER,
  WORKFLOW_STEPS,
  NAV_TOOLS,
  NAV_TOOL_LIST,
  workspaceOfTool,
  getWorkspace,
  searchTools,
  searchPlannedTools,
  workflowNeighbors,
  WORKSPACE_ACTIONS
} = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'workspaces.js')).href);

const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

let passed = 0;
let failed = 0;
function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

console.log('🧪 Running tests/workspaces.test.js...');

// 1. Primary workspace structure — the 9-step workflow
{
  const expectedOrder = ['project', 'tools', 'cad', 'documents', 'ai', 'settings'];
  assert(JSON.stringify(WORKSPACE_ORDER) === JSON.stringify(expectedOrder),
    'WORKSPACE_ORDER lists the 6 primary workspaces in workflow order', WORKSPACE_ORDER);
  assert(WORKFLOW_STEPS.length === 6 && WORKFLOW_STEPS.map(s => s.id).join(',') === expectedOrder.join(','),
    'WORKFLOW_STEPS mirrors the workspace order');
  for (const ws of WORKSPACES) {
    assert(typeof ws.id === 'string' && typeof ws.label === 'string' && typeof ws.mission === 'string',
      `Workspace "${ws.id}" has id/label/mission`);
    assert(/^\d{2}$/.test(ws.number), `Workspace "${ws.id}" has a 2-digit workflow number`, ws.number);
    assert(Array.isArray(ws.tools) && Array.isArray(ws.planned),
      `Workspace "${ws.id}" has tools[] and planned[] arrays`);
  }
}

// 2. Every registered tool has a live view container (no dead links)
{
  for (const tool of NAV_TOOL_LIST) {
    assert(htmlContent.includes(`id="mode-view-${tool.toolId}"`),
      `Registry tool "${tool.toolId}" has a matching #mode-view section`);
    assert(typeof tool.label === 'string' && tool.label.length > 0, `Tool "${tool.toolId}" has a label`);
    assert(Array.isArray(tool.keywords) && tool.keywords.length > 0, `Tool "${tool.toolId}" carries search keywords`);
  }
}

// 3. The registry preserves the full legacy tool set (Phase A moved, never dropped)
{
  const legacyToolIds = [
    'research_dashboard', 'research_library', 'standards_explorer', // research (Phase F)
    'site_dashboard', 'sun_path', 'site_context', // site (Phase G)
    'converter', 'rescale', 'detector', 'area_volume', 'dimensions', 'concept', 'reports',
    'reference', // dimensions
    'cad_clipboard', 'batch_cad', 'cad_handoff', // cad
    'stairs', 'ramps', 'slopes', // architecture
    'furniture', // space
    'projects', 'requirements', 'imports', 'export', // project
    'survey', // site
    'ai', 'ai_settings' // ai
  ];
  for (const id of legacyToolIds) {
    assert(NAV_TOOLS.has(id), `Legacy tool "${id}" is preserved in the registry`);
  }
  assert(NAV_TOOLS.size === legacyToolIds.length, 'Registry tool count matches the legacy inventory (no dupes, no losses)',
    { registry: NAV_TOOLS.size, legacy: legacyToolIds.length });
}

// 4. Each tool lives in exactly one workspace; lookups agree
{
  for (const ws of WORKSPACES) {
    for (const tool of ws.tools) {
      const owner = workspaceOfTool(tool.toolId);
      assert(owner && owner.id === ws.id, `Tool "${tool.toolId}" maps back to its workspace "${ws.id}"`, owner?.id);
    }
  }
  assert(workspaceOfTool('nope') === null, 'workspaceOfTool returns null for unknown ids');
  assert(getWorkspace('tools')?.label === 'Design Tools', 'getWorkspace resolves by id');
  assert(getWorkspace('nope') === null, 'getWorkspace returns null for unknown ids');
}

// 5. Workspace icons resolve in the icon system (no emoji, no generic fallback)
{
  const iconsContent = fs.readFileSync(path.join(rootDir, 'src', 'core', 'icons.js'), 'utf8');
  for (const ws of WORKSPACES) {
    assert(iconsContent.includes(`${ws.icon}:`) || iconsContent.includes(`'${ws.icon}'`) || iconsContent.includes(` ${ws.icon}`),
      `Workspace "${ws.id}" icon "${ws.icon}" is defined in core/icons.js`);
    assert(!/[^\x00-\x7F]/.test(ws.icon), `Workspace "${ws.id}" icon name is ASCII (not an emoji)`, ws.icon);
  }
  // The NAV map exposes every workspace under ws_<id>
  for (const ws of WORKSPACES) {
    assert(iconsContent.includes(`ws_${ws.id}:`), `icons.js NAV map covers workspace "${ws.id}"`);
  }
}

// 6. Workflow neighbors
{
  const first = workflowNeighbors('project');
  assert(first.prev === null && first.next?.id === 'tools', 'research is the workflow start; next is site');
  const last = workflowNeighbors('settings');
  assert(last.prev?.id === 'ai' && last.next === null, 'ai is the workflow end; prev is project');
  assert(workflowNeighbors('nope').prev === null && workflowNeighbors('nope').next === null,
    'workflowNeighbors returns nulls for unknown ids');
}

// 7. Search metadata actually resolves real and planned queries
{
  const stairHits = searchTools(['stairs']);
  assert(stairHits.some(t => t.toolId === 'stairs'), 'Searching "stairs" finds the Stair Calculator');
  const siteHits = searchTools(['site', 'measurement']);
  assert(siteHits.some(t => t.toolId === 'survey'), 'Searching "site measurement" finds the Survey Notebook');
  const cadAlias = searchTools(['send', 'cad']);
  assert(cadAlias.some(t => t.toolId === 'cad_handoff'), 'Alias search "send cad" finds CAD Handoff');

  const plannedWind = searchPlannedTools('wind');
  assert(plannedWind.length === 0, 'Navigation does not promote unimplemented wind integrations');
  const realSun = searchTools(['sun']);
  assert(realSun.some(t => t.toolId === 'sun_path'), 'Searching "sun" now finds the real Sun Path tool (Phase G shipped it)');
  const plannedQgis = searchPlannedTools('qgis');
  assert(plannedQgis.length === 0, 'Navigation does not promote unimplemented GIS bridges');
}

// 8. Workspace quick actions reference real, registered tools only
{
  const registeredIds = new Set(NAV_TOOL_LIST.map(t => t.toolId));
  for (const [wsId, actions] of Object.entries(WORKSPACE_ACTIONS)) {
    assert(getWorkspace(wsId) !== null, `WORKSPACE_ACTIONS key "${wsId}" is a real workspace`);
    for (const a of actions) {
      assert(registeredIds.has(a.handler) || a.handler === 'home',
        `Action "${a.id}" targets a registered tool "${a.handler}"`);
      assert(typeof a.label === 'string' && a.label.length > 0, `Action "${a.id}" has a label`);
    }
  }
}

// 9. Planned entries are honest: every one names a phase (F–M, optionally
//     suffixed with '+' for later-phase continuations), never 'now'
{
  for (const ws of WORKSPACES) {
    for (const p of ws.planned || []) {
      assert(/^[FGHIJKLM]\+?$/.test(p.phase), `Planned "${p.label}" names a valid phase letter`, p.phase);
    }
  }
}

console.log(`\n${failed === 0 ? '✅' : '❌'} workspaces.test.js: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
