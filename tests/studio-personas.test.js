/**
 * Architecture Helping Hand - Studio Personas & Adaptive Modality Test Suite
 * Validates software personas, 16 tool categories, universal search,
 * AI bridge serialization & action parsing, and UI containers.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  STUDIO_PERSONAS,
  TOOL_CATEGORIES,
  STUDIO_TOOL_CATALOG,
  searchStudioTools,
  parseStudioCommand,
  PERSONA_RIBBON_CONFIGS
} from '../src/core/personas.js';

import {
  serializeDrawingContext,
  buildArchitecturalPrompt,
  parseAiActions,
  executeAiAction
} from '../src/core/ai-bridge.js';

import {
  CAD_BLOCK_LIBRARY,
  createBlockInstanceEntity
} from '../src/core/entities.js';

import {
  evaluateNurbsCurve,
  evaluateNurbsSurface,
  tessellateNurbsSurface
} from '../src/core/massing-3d.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('🧪 Running tests/studio-personas.test.js...\n');

// -----------------------------------------------------------------------------
// 1. Studio Personas
// -----------------------------------------------------------------------------
test('Personas: All 5 core personas defined with required metadata', () => {
  const expected = ['studio', 'autocad', 'rhino', 'photoshop', 'sketchup'];
  for (const id of expected) {
    const p = STUDIO_PERSONAS[id];
    assert.ok(p, `Persona ${id} must exist`);
    assert.equal(p.id, id);
    assert.ok(p.name, `Persona ${id} must have a name`);
    assert.ok(p.icon, `Persona ${id} must have an icon`);
    assert.ok(p.accentColor, `Persona ${id} must have an accentColor`);
    assert.ok(p.description, `Persona ${id} must have a description`);
  }
});

// -----------------------------------------------------------------------------
// 2. 16 Tool Categories
// -----------------------------------------------------------------------------
test('Tool Categories: Exactly 16 deeply structured categories defined', () => {
  const expectedCats = [
    'measuring',
    'selection_cropping',
    'retouching_painting',
    'selection_navigation',
    'drawing',
    'standard_cpanels',
    'set_view',
    'curve_tools',
    'surface_tools',
    'solid_tools',
    'mesh_tools',
    'subd',
    'containers',
    'cascades_flyouts',
    'ribbon_tabs',
    'ribbon_panels'
  ];

  assert.equal(TOOL_CATEGORIES.length, 16, 'Must define exactly 16 tool categories');
  for (const id of expectedCats) {
    const cat = TOOL_CATEGORIES.find(c => c.id === id);
    assert.ok(cat, `Category ${id} must exist in TOOL_CATEGORIES`);
    assert.ok(cat.name, `Category ${id} must have a display name`);
    assert.ok(cat.icon, `Category ${id} must have an icon`);
  }
});

// -----------------------------------------------------------------------------
// 3. Studio Tool Catalog
// -----------------------------------------------------------------------------
test('Tool Catalog: Contains comprehensive tools with valid category and personas', () => {
  assert.ok(STUDIO_TOOL_CATALOG.length >= 30, 'Catalog must contain at least 30 tools');
  const validCatIds = new Set(TOOL_CATEGORIES.map(c => c.id));

  for (const tool of STUDIO_TOOL_CATALOG) {
    assert.ok(tool.id, 'Tool must have an id');
    assert.ok(tool.name, 'Tool must have a name');
    assert.ok(tool.icon, `Tool ${tool.id} must have an icon`);
    assert.ok(validCatIds.has(tool.category), `Tool ${tool.id} category "${tool.category}" must be in TOOL_CATEGORIES`);
    assert.ok(Array.isArray(tool.personas) && tool.personas.length > 0, `Tool ${tool.id} must have personas array`);

    if (tool.flyout) {
      assert.ok(Array.isArray(tool.flyout), `Tool ${tool.id} flyout must be an array`);
      for (const sub of tool.flyout) {
        assert.ok(sub.id && sub.name && sub.icon, `Flyout child in ${tool.id} must have id, name, icon`);
      }
    }
  }
});

test('Tool Catalog: Contains CAD and Rhino command aliases', () => {
  const lineTool = STUDIO_TOOL_CATALOG.find(t => t.id === 'wall' || t.commandAlias === 'L');
  assert.ok(lineTool, 'Must have tool aliased to L');

  const rectTool = STUDIO_TOOL_CATALOG.find(t => t.commandAlias === 'REC');
  assert.ok(rectTool, 'Must have tool aliased to REC');

  const distTool = STUDIO_TOOL_CATALOG.find(t => t.commandAlias === 'DIST');
  assert.ok(distTool, 'Must have tool aliased to DIST');

  const stairTool = STUDIO_TOOL_CATALOG.find(t => t.commandAlias === 'STAIR');
  assert.ok(stairTool, 'Must have tool aliased to STAIR');
});

// -----------------------------------------------------------------------------
// 4. Universal Search Engine
// -----------------------------------------------------------------------------
test('Search Engine: searchStudioTools finds tools by name, alias, and keyword', () => {
  const lineResults = searchStudioTools('line');
  assert.ok(lineResults.length > 0, 'Should find line tools');
  assert.ok(lineResults.some(t => t.id === 'wall'));

  const stairResults = searchStudioTools('stair');
  assert.ok(stairResults.length > 0, 'Should find stair tools');
  assert.ok(stairResults.some(t => t.id === 'stair'));

  const loftResults = searchStudioTools('loft');
  assert.ok(loftResults.length > 0, 'Should find loft tools');

  const aliasResults = searchStudioTools('REC');
  assert.ok(aliasResults.length > 0, 'Should find tool by command alias REC');

  const emptyResults = searchStudioTools('nonexistentxyz_tool');
  assert.equal(emptyResults.length, 0, 'Should return empty array for non-matching query');
});

test('Search Engine: Filters search results by persona', () => {
  const autocadResults = searchStudioTools('trim', { persona: 'autocad' });
  assert.ok(autocadResults.length > 0, 'Trim should be found under AutoCAD persona');

  const rhinoResults = searchStudioTools('loft', { persona: 'rhino' });
  assert.ok(rhinoResults.length > 0, 'Loft should be found under Rhino persona');
});

test('Search Engine: Expanded search finds ribbon tabs and category entries', () => {
  const tabResults = searchStudioTools('curves');
  assert.ok(tabResults.some(r => r.isRibbonTab && r.tabId === 'curves'), 'Should find Curves ribbon tab');

  const catResults = searchStudioTools('measuring');
  assert.ok(catResults.some(r => r.isCategory && r.categoryId === 'measuring'), 'Should find Measuring category');
});

test('CLI Parser: parseStudioCommand parses parametric rooms and walls', () => {
  const roomCmd = parseStudioCommand('REC 6 4');
  assert.equal(roomCmd.type, 'create_room');
  assert.equal(roomCmd.width, 6);
  assert.equal(roomCmd.depth, 4);

  const wallCmd1 = parseStudioCommand('WALL 8');
  assert.equal(wallCmd1.type, 'create_wall_length');
  assert.equal(wallCmd1.length, 8);

  const wallCmd2 = parseStudioCommand('WALL 0 0 10 0');
  assert.equal(wallCmd2.type, 'create_wall');
  assert.equal(wallCmd2.x1, 0);
  assert.equal(wallCmd2.x2, 10);

  const stairCmd = parseStudioCommand('STAIR 18 1.2');
  assert.equal(stairCmd.type, 'create_stair');
  assert.equal(stairCmd.risers, 18);
  assert.equal(stairCmd.width, 1.2);
});

test('CLI Parser: parseStudioCommand parses views, hatch, tools, and help', () => {
  const v4Cmd = parseStudioCommand('4VIEW');
  assert.equal(v4Cmd.type, 'set_view');
  assert.equal(v4Cmd.view, '4view');

  const planCmd = parseStudioCommand('PLAN');
  assert.equal(planCmd.type, 'set_view');
  assert.equal(planCmd.view, 'top');

  const hatchCmd = parseStudioCommand('HATCH wood');
  assert.equal(hatchCmd.type, 'set_hatch');
  assert.equal(hatchCmd.pattern, 'wood');

  const distCmd = parseStudioCommand('DIST');
  assert.equal(distCmd.type, 'set_tool');
  assert.equal(distCmd.toolId, 'measure');

  const helpCmd = parseStudioCommand('HELP');
  assert.equal(helpCmd.type, 'help');
});

// -----------------------------------------------------------------------------
// 5. Persona Ribbon Configs
// -----------------------------------------------------------------------------
test('Ribbon Configs: Every persona has valid ribbon tabs and panels', () => {
  const personas = ['studio', 'autocad', 'rhino', 'photoshop', 'sketchup'];
  const catalogIds = new Set(STUDIO_TOOL_CATALOG.map(t => t.id));

  for (const pid of personas) {
    const config = PERSONA_RIBBON_CONFIGS[pid];
    assert.ok(config, `Ribbon config for ${pid} must exist`);
    assert.ok(Array.isArray(config.tabs) && config.tabs.length > 0, `${pid} ribbon must have tabs`);

    for (const tab of config.tabs) {
      assert.ok(tab.id, `Tab in ${pid} must have id`);
      assert.ok(tab.label, `Tab in ${pid} must have label`);
      assert.ok(Array.isArray(tab.panels) && tab.panels.length > 0, `Tab ${tab.id} must have panels`);

      for (const panel of tab.panels) {
        assert.ok(panel.id && panel.title, `Panel in ${tab.id} must have id and title`);
        assert.ok(Array.isArray(panel.tools) && panel.tools.length > 0, `Panel ${panel.id} must list tools`);
        for (const tid of panel.tools) {
          assert.ok(catalogIds.has(tid), `Tool ${tid} in panel ${panel.id} must exist in STUDIO_TOOL_CATALOG`);
        }
      }
    }
  }
});

// -----------------------------------------------------------------------------
// 6. AI Bridge Serialization & Execution
// -----------------------------------------------------------------------------
test('AI Bridge: serializeDrawingContext correctly serializes mock plan state', () => {
  const mockPlanState = {
    plan: {
      tool: 'select',
      grid: 0.5,
      snap: true,
      activeDocId: 'doc-1',
      documents: [{
        id: 'doc-1',
        name: 'Ground Floor',
        type: '2d_plan',
        entities: [
          { id: 'r1', kind: 'room', name: 'Living Room', width: 6, depth: 4 },
          { id: 'w1', kind: 'wall', x1: 0, y1: 0, x2: 6, y2: 0, thickness: 0.2 },
          { id: 'f1', kind: 'furniture', name: 'Sofa 3-Seat', width: 2.2, depth: 0.95 }
        ]
      }]
    }
  };

  const serialized = serializeDrawingContext(mockPlanState);
  assert.equal(serialized.activeDocName, 'Ground Floor');
  assert.equal(serialized.entityCount, 3);
  assert.equal(serialized.roomsCount, 1);
  assert.equal(serialized.grossArea, 24);
  assert.equal(serialized.furnitureCount, 1);
});

test('AI Bridge: buildArchitecturalPrompt formats architectural system instructions', () => {
  const prompt = buildArchitecturalPrompt('Please add a master bedroom and ensuite bathroom', {
    activeDocName: 'Level 1',
    entityCount: 4,
    grossArea: 48
  });

  assert.ok(prompt.includes('Architecture Helping Hand AI Studio Assistant'));
  assert.ok(prompt.includes('Active Document: Level 1'));
  assert.ok(prompt.includes('Please add a master bedroom'));
  assert.ok(prompt.includes('CREATE_ROOM'));
});

test('AI Bridge: parseAiActions extracts structured commands from AI response', () => {
  const aiResponse = `
    Certainly! I will add a Master Bedroom and connect a door.
    \`\`\`json
    [
      { "action": "CREATE_ROOM", "name": "Master Bedroom", "width": 5.0, "depth": 4.5, "x": 10, "y": 5 },
      { "action": "CREATE_WALL", "x1": 10, "y1": 5, "x2": 15, "y2": 5, "thickness": 0.2 },
      { "action": "SET_VIEW", "viewType": "3d_massing" }
    ]
    \`\`\`
    Done!
  `;

  const actions = parseAiActions(aiResponse);
  assert.equal(actions.length, 3);
  assert.equal(actions[0].action, 'CREATE_ROOM');
  assert.equal(actions[0].name, 'Master Bedroom');
  assert.equal(actions[1].action, 'CREATE_WALL');
  assert.equal(actions[2].action, 'SET_VIEW');
});

test('AI Bridge: executeAiAction executes actions on plan state', () => {
  const planState = {
    plan: {
      tool: 'select',
      documents: [{
        id: 'doc-test',
        name: 'Test Level',
        type: '2d_plan',
        entities: []
      }],
      activeDocId: 'doc-test'
    }
  };

  const action1 = { action: 'CREATE_ROOM', name: 'Office', width: 4.0, depth: 3.5, x: 2, y: 2 };
  const res1 = executeAiAction(action1, planState);
  assert.equal(res1.success, true);
  assert.equal(planState.plan.documents[0].entities.length, 1);
  assert.equal(planState.plan.documents[0].entities[0].kind, 'room');
  assert.equal(planState.plan.documents[0].entities[0].name, 'Office');

  const action2 = { action: 'EXECUTE_TOOL', toolId: 'dimension' };
  const res2 = executeAiAction(action2, planState);
  assert.equal(res2.success, true);
  assert.equal(planState.plan.tool, 'dimension');
});

// -----------------------------------------------------------------------------
// 7. HTML & CSS Studio Integration Verification
// -----------------------------------------------------------------------------
test('DOM Integration: index.html has omnipresent AI drawer and studio containers', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
  assert.ok(indexHtml.includes('id="omnipresent-ai-drawer-host"'), 'Must have omnipresent AI drawer host');
  assert.ok(indexHtml.includes('id="studio-ribbon-container"'), 'Must have studio ribbon container');
  assert.ok(indexHtml.includes('id="studio-palette-container"'), 'Must have studio palette container');
  assert.ok(indexHtml.includes('id="studio-commandbar-container"'), 'Must have studio command bar container');
  assert.ok(indexHtml.includes('id="studio-cpanels-container"'), 'Must have studio C-panels container');
});

test('CSS Integration: css/main.css has Section 20 studio styles', () => {
  const css = fs.readFileSync(path.join(rootDir, 'css', 'main.css'), 'utf-8');
  assert.ok(css.includes('.studio-ribbon-bar'), 'Must define .studio-ribbon-bar');
  assert.ok(css.includes('.studio-persona-strip'), 'Must define .studio-persona-strip');
  assert.ok(css.includes('.studio-vertical-toolstrip'), 'Must define .studio-vertical-toolstrip');
  assert.ok(css.includes('.studio-cpanels-container'), 'Must define .studio-cpanels-container');
  assert.ok(css.includes('.studio-bottom-commandbar'), 'Must define .studio-bottom-commandbar');
  assert.ok(css.includes('.app-ai-drawer'), 'Must define .app-ai-drawer');
});

// -----------------------------------------------------------------------------
// 8. 16 Categories Completeness, Phase 9 NURBS & Phase 12 CAD Blocks
// -----------------------------------------------------------------------------
test('Tool Categories: All 16 categories have assigned tools in catalog', () => {
  for (const cat of TOOL_CATEGORIES) {
    const hasTools = STUDIO_TOOL_CATALOG.some(t => t.category === cat.id);
    assert.ok(hasTools, `Category ${cat.id} must have at least one tool in STUDIO_TOOL_CATALOG`);
  }
});

test('Phase 9: Rhino NURBS curve & surface evaluator evaluates smooth geometry', () => {
  // 1. Curve evaluation
  const controlPoints = [
    { x: 0, y: 0, z: 0 },
    { x: 2, y: 4, z: 0 },
    { x: 6, y: 4, z: 0 },
    { x: 8, y: 0, z: 0 }
  ];
  const startPt = evaluateNurbsCurve(controlPoints, 3, 0);
  assert.equal(startPt.x, 0);
  assert.equal(startPt.y, 0);

  const midPt = evaluateNurbsCurve(controlPoints, 3, 0.5);
  assert.ok(midPt.x > 3 && midPt.x < 5);
  assert.ok(midPt.y > 2);

  const endPt = evaluateNurbsCurve(controlPoints, 3, 1);
  assert.equal(endPt.x, 8);
  assert.equal(endPt.y, 0);

  // 2. Surface evaluation
  const grid = [
    [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 2 }, { x: 8, y: 0, z: 0 }],
    [{ x: 0, y: 4, z: 2 }, { x: 4, y: 4, z: 5 }, { x: 8, y: 4, z: 2 }],
    [{ x: 0, y: 8, z: 0 }, { x: 4, y: 8, z: 2 }, { x: 8, y: 8, z: 0 }]
  ];
  const srfPt = evaluateNurbsSurface(grid, 2, 2, 0.5, 0.5);
  assert.ok(srfPt.x > 3 && srfPt.x < 5);
  assert.ok(srfPt.z > 2);

  // 3. Tessellation into 3D quad faces
  const faces = tessellateNurbsSurface(grid, { samplesU: 4, samplesV: 4 });
  assert.equal(faces.length, 16);
  assert.equal(faces[0].vertices.length, 4);
});

test('Phase 12: CAD Block Library & Dynamic Insertion', () => {
  assert.ok(CAD_BLOCK_LIBRARY.DOOR_SINGLE_900, 'Must have DOOR_SINGLE_900');
  assert.ok(CAD_BLOCK_LIBRARY.WC_FIXTURE, 'Must have WC_FIXTURE');
  assert.ok(CAD_BLOCK_LIBRARY.DESK_EXECUTIVE, 'Must have DESK_EXECUTIVE');
  assert.ok(CAD_BLOCK_LIBRARY.TREE_DECIDUOUS, 'Must have TREE_DECIDUOUS');

  const blk = createBlockInstanceEntity({
    blockId: 'DOOR_SINGLE_900',
    x: 3.5,
    y: 5.0,
    rotation: 90,
    scale: 1.0
  });
  assert.equal(blk.kind, 'block_instance');
  assert.equal(blk.blockId, 'DOOR_SINGLE_900');
  assert.equal(blk.x, 3.5);
  assert.equal(blk.y, 5.0);
  assert.equal(blk.rotation, 90);

  const parsedInsert = parseStudioCommand('INSERT DOOR_SINGLE_900 3 4');
  assert.equal(parsedInsert.type, 'insert_block');
  assert.equal(parsedInsert.blockKey, 'DOOR_SINGLE_900');
  assert.equal(parsedInsert.x, 3);
  assert.equal(parsedInsert.y, 4);

  const parsedLayer = parseStudioCommand('LA');
  assert.equal(parsedLayer.type, 'switch_cpanel');
  assert.equal(parsedLayer.panelTab, 'layers');
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\nStudio Personas Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
