/**
 * Architecture Helping Hand - Phase 7 Studio Test Suite
 * Tests Orthographic Building Sections & Elevations Engine, Interactive Section Cut Tool,
 * Level Datums, and Multi-Viewport Elevation/Section Presentation Sheets.
 */

import {
  ELEVATION_DIRECTIONS,
  createSectionCut,
  generateBuildingElevation,
  generateBuildingSection,
  generateElevationSVG,
  generateSectionSVG
} from '../src/core/sections-elevations.js';

import {
  createRoom,
  createWall,
  createDoor,
  createWindow,
  createColumn
} from '../src/core/entities.js';

import {
  createSheetConfig,
  computeViewportLayout,
  generateSheetSVG
} from '../src/core/sheet.js';

import { DEFAULT_CAD_LAYERS, EXTENDED_CAD_LAYERS, resolveEntityLayer } from '../src/core/layers.js';

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

function assertEqual(actual, expected, message) {
  assert(actual === expected, message, actual);
}

function assertInRange(actual, min, max, message) {
  assert(actual >= min && actual <= max, message, actual);
}

console.log('🧪 Running tests/studio-phase7.test.js...');

// ---------------------------------------------------------------------------
// 1. Cardinal Elevation Directions & Section Cut Entity
// ---------------------------------------------------------------------------
console.log('\n--- 1. Elevation Directions & Section Cut Entity ---');
{
  assert(Boolean(ELEVATION_DIRECTIONS.south), 'South elevation direction defined');
  assert(Boolean(ELEVATION_DIRECTIONS.north), 'North elevation direction defined');
  assert(Boolean(ELEVATION_DIRECTIONS.east), 'East elevation direction defined');
  assert(Boolean(ELEVATION_DIRECTIONS.west), 'West elevation direction defined');

  // Test createSectionCut
  const sCut = createSectionCut({
    p1: { x: 2, y: 5 },
    p2: { x: 14, y: 5 },
    label: 'A',
    sheetRef: 'A-201'
  });

  assertEqual(sCut.kind, 'section_cut', 'Entity kind is section_cut');
  assertEqual(sCut.label, 'A', 'Section label is A');
  assertEqual(sCut.sheetRef, 'A-201', 'Sheet reference is A-201');
  assertEqual(sCut.p1.x, 2, 'p1.x is 2');
  assertEqual(sCut.p2.x, 14, 'p2.x is 14');
  assertEqual(sCut.width, 12, 'Width is 12m');
  assertEqual(sCut.layerId, 'A-SECT', 'Default layer is A-SECT');

  // Test layer resolution
  const resolvedLayer = resolveEntityLayer(sCut, EXTENDED_CAD_LAYERS);
  assertEqual(resolvedLayer.id, 'A-SECT', 'Resolved to A-SECT layer in extended layers');
  const defaultFallback = resolveEntityLayer(sCut, DEFAULT_CAD_LAYERS);
  assert(Boolean(defaultFallback), 'Resolves cleanly against default CAD layers');
}

// ---------------------------------------------------------------------------
// 2. Single-Story Building Elevation Projections
// ---------------------------------------------------------------------------
console.log('\n--- 2. Single-Story Building Elevation Projections ---');
{
  // Create simple house: 4 walls, 1 door, 2 windows, 1 column
  const walls = [
    createWall({ id: 'w1', x1: 0, y1: 0, x2: 10, y2: 0, thickness: 0.2 }),   // South wall
    createWall({ id: 'w2', x1: 10, y1: 0, x2: 10, y2: 8, thickness: 0.2 }),  // East wall
    createWall({ id: 'w3', x1: 10, y1: 8, x2: 0, y2: 8, thickness: 0.2 }),   // North wall
    createWall({ id: 'w4', x1: 0, y1: 8, x2: 0, y2: 0, thickness: 0.2 })     // West wall
  ];
  const door = createDoor({ id: 'd1', wallId: 'w1', position: 2.0, width: 1.0, height: 2.1 });
  const win1 = createWindow({ id: 'win1', wallId: 'w1', position: 5.0, width: 1.5, height: 1.2, sill: 0.9 });
  const col = createColumn({ id: 'c1', x: 0, y: 0, width: 0.4, depth: 0.4 });

  const entities = [...walls, door, win1, col];

  // South Elevation
  const southModel = generateBuildingElevation(entities, 'south', { storyHeight: 3.0 });
  assertEqual(southModel.direction, 'south', 'South elevation direction confirmed');
  assertInRange(southModel.span, 10, 11, 'Span matches 10m building width');
  assertEqual(southModel.totalHeight, 3.0, 'Total height is 3.0m');
  assert(southModel.walls.length >= 1, 'Contains projected walls');
  assert(southModel.openings.some(op => op.kind === 'door'), 'Door projected in elevation');
  assert(southModel.openings.some(op => op.kind === 'window'), 'Window projected in elevation');
  assert(southModel.columns.length >= 1, 'Column projected in elevation');
  assert(southModel.datums.length >= 2, 'Contains Ground and Roof datums');
  assertEqual(southModel.datums[0].elevation, 0, 'Ground level is 0.00m');
  assertEqual(southModel.datums[1].elevation, 3.0, 'Roof level is 3.00m');

  // North Elevation
  const northModel = generateBuildingElevation(entities, 'north');
  assertEqual(northModel.direction, 'north', 'North elevation direction confirmed');

  // East Elevation
  const eastModel = generateBuildingElevation(entities, 'east');
  assertEqual(eastModel.direction, 'east', 'East elevation direction confirmed');
  assertInRange(eastModel.span, 8, 9, 'East elevation span matches 8m depth');
}

// ---------------------------------------------------------------------------
// 3. Multi-Story Elevation Stacking & Datums
// ---------------------------------------------------------------------------
console.log('\n--- 3. Multi-Story Elevation Stacking & Datums ---');
{
  const level1 = {
    name: 'Ground Floor',
    type: '2d_plan',
    storyHeight: 3.2,
    entities: [
      createWall({ id: 'l1_w1', x1: 0, y1: 0, x2: 12, y2: 0 }),
      createDoor({ id: 'l1_d1', wallId: 'l1_w1', position: 3, width: 1.0 })
    ]
  };

  const level2 = {
    name: 'Level 2',
    type: '2d_plan',
    storyHeight: 3.0,
    entities: [
      createWall({ id: 'l2_w1', x1: 0, y1: 0, x2: 12, y2: 0 }),
      createWindow({ id: 'l2_win1', wallId: 'l2_w1', position: 4, width: 1.8 })
    ]
  };

  const docs = [level1, level2];
  const multiModel = generateBuildingElevation(docs, 'south');

  assertEqual(multiModel.stories.length, 2, '2 stories normalized');
  assertEqual(multiModel.totalHeight, 6.2, 'Total height is 3.2 + 3.0 = 6.2m');
  assertEqual(multiModel.datums.length, 3, '3 datums (Ground, Level 2, Roof)');
  assertEqual(multiModel.datums[0].label, 'EL +0.00m', 'Ground datum label');
  assertEqual(multiModel.datums[1].label, 'EL +3.20m', 'Level 2 datum label');
  assertEqual(multiModel.datums[2].label, 'EL +6.20m', 'Roof datum label');

  // SVG Export check
  const svg = generateElevationSVG(multiModel, 'south');
  assert(svg.includes('<svg'), 'Elevation SVG contains <svg tag');
  assert(svg.includes('SOUTH ELEVATION'), 'Elevation SVG contains title');
  assert(svg.includes('EL +3.20m'), 'Elevation SVG contains Level 2 datum text');
  assert(svg.includes('earth-hatch'), 'Elevation SVG contains earth grade hatch');
}

// ---------------------------------------------------------------------------
// 4. Building Section Cut Plane & Architectural Pochè
// ---------------------------------------------------------------------------
console.log('\n--- 4. Building Section Cut Plane & Architectural Pochè ---');
{
  const walls = [
    createWall({ id: 'w1', x1: 0, y1: 0, x2: 12, y2: 0, thickness: 0.25 }),
    createWall({ id: 'w2', x1: 12, y1: 0, x2: 12, y2: 10, thickness: 0.25 }),
    createWall({ id: 'w3', x1: 12, y1: 10, x2: 0, y2: 10, thickness: 0.25 }),
    createWall({ id: 'w4', x1: 0, y1: 10, x2: 0, y2: 0, thickness: 0.25 }),
    createWall({ id: 'w_mid', x1: 6, y1: 0, x2: 6, y2: 10, thickness: 0.20 }) // Spine wall
  ];

  const doorMid = createDoor({ id: 'd_mid', wallId: 'w_mid', position: 5.0, width: 1.0, height: 2.1 });
  const entities = [...walls, doorMid];

  // Section cut across Y = 5.0 (intersects w4 at x=0, w_mid at x=6, w2 at x=12)
  const cutEntity = createSectionCut({
    p1: { x: -1, y: 5 },
    p2: { x: 13, y: 5 },
    label: 'A'
  });

  const sectionModel = generateBuildingSection(entities, cutEntity, { storyHeight: 3.0, slabThickness: 0.25 });

  assertEqual(sectionModel.sectionLabel, 'A', 'Section label is A');
  assert(sectionModel.cutWalls.length >= 2, 'Cut walls detected along slice plane');
  assert(sectionModel.cutSlabs.length >= 2, 'Structural floor slab and roof slab generated');
  assertEqual(sectionModel.cutSlabs[0].thickness, 0.25, 'Slab thickness is 0.25m');
  assert(sectionModel.datums.length >= 2, 'Datums generated for section');

  // Verify door opening intersection
  const hasDoorCut = sectionModel.cutOpenings.some(co => co.kind === 'door');
  assert(hasDoorCut, 'Cut slice passes through door on w_mid');

  // SVG Export check
  const svg = generateSectionSVG(sectionModel, cutEntity);
  assert(svg.includes('<svg'), 'Section SVG contains <svg tag');
  assert(svg.includes('SECTION A-A'), 'Section SVG contains title');
  assert(svg.includes('poche-hatch'), 'Section SVG contains pochè hatch pattern');
  assert(svg.includes('concrete-slab-hatch'), 'Section SVG contains concrete slab hatch');
}

// ---------------------------------------------------------------------------
// 5. Multi-Viewport Sheets (Plan + Elevation & Plan + Section)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Multi-Viewport Sheets ---');
{
  const entities = [
    createWall({ id: 'w1', x1: 0, y1: 0, x2: 10, y2: 0 }),
    createWall({ id: 'w2', x1: 10, y1: 0, x2: 10, y2: 8 }),
    createWall({ id: 'w3', x1: 10, y1: 8, x2: 0, y2: 8 }),
    createWall({ id: 'w4', x1: 0, y1: 8, x2: 0, y2: 0 })
  ];

  // 1. Plan + Elevation layout
  const elevConfig = createSheetConfig({ layoutMode: 'plan_elevation', size: 'A3', sheetNumber: 'A-102' });
  const elevLayout = computeViewportLayout(elevConfig, entities);

  assertEqual(elevLayout.layoutMode, 'plan_elevation', 'Layout mode is plan_elevation');
  assert(Boolean(elevLayout.elevationViewport), 'Elevation viewport layout computed');
  assert(elevLayout.elevationViewport.width > 0, 'Elevation viewport has width');
  assert(elevLayout.elevationViewport.height > 0, 'Elevation viewport has height');

  const elevSheetSvg = generateSheetSVG(elevConfig, entities, { elevationDirection: 'south' });
  assert(elevSheetSvg.includes('sheet-elevation-viewport'), 'Sheet SVG includes elevation viewport element');
  assert(elevSheetSvg.includes('SOUTH ELEVATION'), 'Sheet SVG includes South Elevation title');

  // 2. Plan + Section layout
  const sectConfig = createSheetConfig({ layoutMode: 'plan_section', size: 'A3', sheetNumber: 'A-103' });
  const sectLayout = computeViewportLayout(sectConfig, entities);

  assertEqual(sectLayout.layoutMode, 'plan_section', 'Layout mode is plan_section');
  assert(Boolean(sectLayout.sectionViewport), 'Section viewport layout computed');
  assert(sectLayout.sectionViewport.width > 0, 'Section viewport has width');

  const sectSheetSvg = generateSheetSVG(sectConfig, entities);
  assert(sectSheetSvg.includes('sheet-section-viewport'), 'Sheet SVG includes section viewport element');
  assert(sectSheetSvg.includes('BUILDING SECTION'), 'Sheet SVG includes Building Section title');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log(`Phase 7 Studio Test Summary: ${passed} passed, ${failed} failed.`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL ARCHITECTURAL STUDIO PHASE 7 TESTS PASSED!');
}
