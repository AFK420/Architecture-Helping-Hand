/**
 * Architecture Helping Hand - Phase 6 Architectural Studio Test Suite
 * Tests:
 *  1. Zoning & Area Schedule Matrix (departments, IBC occupant loads, NIA/GIA, circulation)
 *  2. Multi-Story Building Stacking in 3D Massing (sequential vertical stacking, building metrics)
 *  3. Multi-Viewport Presentation Sheets (single, plan_3d vignette, plan_schedule CAD table)
 *  4. Schedule Export Formats (CSV and ASCII matrix)
 */

import {
  ZONING_CATEGORIES,
  OCCUPANCY_FACTORS,
  guessZoningFromRoomName,
  guessOccupancyCategory,
  calculateRoomPerimeter,
  calculateRoomSchedule,
  calculateFloorTotals,
  formatScheduleCSV,
  formatScheduleASCII
} from '../src/core/zoning-schedule.js';

import {
  buildMassing3DModel,
  buildMultiStoryMassing3DModel,
  generateMassingSVG,
  CAMERA_PRESETS
} from '../src/core/massing-3d.js';

import {
  createSheetConfig,
  computeViewportLayout,
  generateSheetSVG
} from '../src/core/sheet.js';

import { createRoom, createWall } from '../src/core/entities.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`  ❌ FAIL: ${message} (Expected ${expected}, got ${actual})`);
    failed++;
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  }
}

function assertClose(actual, expected, message, tolerance = 1e-3) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, got ${actual})`);
    failed++;
    throw new Error(`${message}: Expected ~${expected}, got ${actual}`);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  }
}

console.log('🧪 Running tests/studio-phase6.test.js...');

// -----------------------------------------------------------------------------
// 1. Architectural Zoning Categories & Inference Heuristics
// -----------------------------------------------------------------------------
console.log('\n--- 1. Architectural Zoning & IBC Occupancy Classification ---');

try {
  assertEqual(Object.keys(ZONING_CATEGORIES).length, 7, 'Seven standard zoning departments defined');
  assert(Boolean(ZONING_CATEGORIES.living), 'Living department exists');
  assert(Boolean(ZONING_CATEGORIES.sleeping), 'Sleeping department exists');
  assert(Boolean(ZONING_CATEGORIES.service), 'Service department exists');
  assert(Boolean(ZONING_CATEGORIES.sanitary), 'Sanitary department exists');
  assert(Boolean(ZONING_CATEGORIES.circulation), 'Circulation department exists');
  assert(Boolean(ZONING_CATEGORIES.commercial), 'Commercial department exists');
  assert(Boolean(ZONING_CATEGORIES.outdoor), 'Outdoor department exists');

  // Zoning inference
  assertEqual(guessZoningFromRoomName('Master Bedroom'), 'sleeping', 'Master Bedroom maps to sleeping');
  assertEqual(guessZoningFromRoomName('Living Room'), 'living', 'Living Room maps to living');
  assertEqual(guessZoningFromRoomName('Gourmet Kitchen'), 'service', 'Kitchen maps to service');
  assertEqual(guessZoningFromRoomName('Ensuite Bathroom'), 'sanitary', 'Bathroom maps to sanitary');
  assertEqual(guessZoningFromRoomName('Entrance Foyer / Corridor'), 'circulation', 'Corridor maps to circulation');
  assertEqual(guessZoningFromRoomName('Home Office / Study'), 'commercial', 'Office maps to commercial');
  assertEqual(guessZoningFromRoomName('Dining Balcony & Terrace'), 'outdoor', 'Balcony maps to outdoor');
  assertEqual(guessZoningFromRoomName('General Flex Space'), 'living', 'Fallback maps to living');

  // IBC Occupancy Category inference
  assertEqual(guessOccupancyCategory('Master Bedroom'), 'residential', 'Bedroom maps to residential load');
  assertEqual(guessOccupancyCategory('Conference / Dining Hall'), 'assembly_unconcentrated', 'Dining maps to assembly unconcentrated');
  assertEqual(guessOccupancyCategory('Corridor'), 'circulation', 'Corridor maps to circulation load');
  assertEqual(guessOccupancyCategory('Private Office'), 'business', 'Office maps to business load');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 2. Room Schedule Calculations & IBC Occupant Load
// -----------------------------------------------------------------------------
console.log('\n--- 2. Room Schedule Calculations & Occupant Load ---');

try {
  const testRooms = [
    { id: 'r1', kind: 'room', name: 'Living Room', x: 0, y: 0, width: 6, depth: 5 }, // 30 m2 -> 30/18.6 = ceil(1.61) = 2
    { id: 'r2', kind: 'room', name: 'Master Bedroom', x: 6, y: 0, width: 4, depth: 5 }, // 20 m2 -> 20/18.6 = ceil(1.07) = 2
    { id: 'r3', kind: 'room', name: 'Corridor', x: 0, y: 5, width: 10, depth: 1.5 }, // 15 m2 -> circulation
    { id: 'r4', kind: 'room', name: 'Kitchen', x: 0, y: 6.5, width: 4, depth: 3.5 } // 14 m2 -> 14/18.6 = 1
  ];

  const schedule = calculateRoomSchedule(testRooms);
  assertEqual(schedule.length, 4, 'Schedule generated 4 room entries');

  // Room 1 metrics
  assertEqual(schedule[0].name, 'Living Room', 'Room 1 name is Living Room');
  assertClose(schedule[0].areaM2, 30.0, 'Room 1 area is 30.0 m²');
  assertClose(schedule[0].perimeterM, 22.0, 'Room 1 perimeter is 22.0 m (2*(6+5))');
  assertEqual(schedule[0].zoningKey, 'living', 'Room 1 zoning is living');
  assertEqual(schedule[0].occupantCount, 2, 'Room 1 occupant load is 2 persons');

  // Room 3 (Corridor - circulation)
  assertEqual(schedule[2].zoningKey, 'circulation', 'Room 3 zoning is circulation');
  assert(schedule[2].percentOfFloor > 0, 'Room percentage of floor is computed');

  // Polygonal room perimeter test
  const polyRoom = {
    id: 'pr1',
    kind: 'room',
    name: 'L-Shaped Studio',
    boundary: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 6 },
      { x: 0, y: 6 }
    ]
  };
  const polyPerim = calculateRoomPerimeter(polyRoom);
  assertClose(polyPerim, 24.0, 'Polygonal L-room perimeter calculated accurately');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 3. Floor Summary Totals & Building Matrix
// -----------------------------------------------------------------------------
console.log('\n--- 3. Floor Summary Totals Matrix ---');

try {
  const floorPlan = {
    entities: [
      { id: 'r1', kind: 'room', name: 'Living Room', x: 0, y: 0, width: 8, depth: 5 }, // 40 m2
      { id: 'r2', kind: 'room', name: 'Corridor', x: 0, y: 5, width: 8, depth: 2 }, // 16 m2 (circulation)
      { id: 'w1', kind: 'wall', x1: 0, y1: 0, x2: 8, y2: 0, thickness: 0.2 }, // 8 * 0.2 = 1.6 m2 wall
      { id: 'w2', kind: 'wall', x1: 8, y1: 0, x2: 8, y2: 7, thickness: 0.2 }  // 7 * 0.2 = 1.4 m2 wall
    ]
  };

  const totals = calculateFloorTotals(floorPlan);

  assertEqual(totals.roomCount, 2, 'Total room count is 2');
  assertClose(totals.netInternalArea, 56.0, 'Net Internal Area (NIA) is 56.0 m²');
  assert(totals.grossInternalArea >= 56.0, 'Gross Internal Area (GIA) includes wall footprint');
  assertClose(totals.circulationArea, 16.0, 'Circulation Area is 16.0 m²');
  assertClose(totals.circulationRatioPercent, (16 / 56) * 100, 'Circulation ratio percentage is ~28.6%', 0.1);
  assert(totals.totalOccupants > 0, 'Total occupant load is positive');
  assert(totals.minEgressWidthMm >= 900, 'Minimum egress width meets IBC standard (>= 900mm)');

  // Formatted Exporters
  const schedule = calculateRoomSchedule(floorPlan);
  const csv = formatScheduleCSV(schedule, totals);
  assert(csv.includes('Room Name'), 'CSV contains column header');
  assert(csv.includes('Living Room'), 'CSV contains Living Room row');
  assert(csv.includes('TOTALS'), 'CSV contains totals row');

  const ascii = formatScheduleASCII(schedule, totals);
  assert(ascii.includes('---'), 'ASCII table contains border linework');
  assert(ascii.includes('Living Room'), 'ASCII table includes room name');
  assert(ascii.includes('TOTAL NET'), 'ASCII table includes summary footer');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 4. Multi-Story Building Stacking in 3D Massing
// -----------------------------------------------------------------------------
console.log('\n--- 4. Multi-Story Building Stacking in 3D Massing ---');

try {
  // Setup 3 stories: Ground Floor, Level 1, Roof / Terrace Level
  const documents = [
    {
      id: 'doc-gf',
      name: 'Ground Floor',
      type: '2d_plan',
      storyHeight: 3.2,
      entities: [
        { id: 'r1', kind: 'room', name: 'Lobby', x: 0, y: 0, width: 12, depth: 10 },
        { id: 'w1', kind: 'wall', x1: 0, y1: 0, x2: 12, y2: 0, thickness: 0.3 },
        { id: 'c1', kind: 'column', x: 6, y: 5, width: 0.5, depth: 0.5 }
      ]
    },
    {
      id: 'doc-l1',
      name: 'Level 1',
      type: '2d_plan',
      storyHeight: 3.0,
      entities: [
        { id: 'r2', kind: 'room', name: 'Offices', x: 0, y: 0, width: 12, depth: 10 },
        { id: 'w2', kind: 'wall', x1: 0, y1: 0, x2: 12, y2: 0, thickness: 0.25 }
      ]
    },
    {
      id: 'doc-l2',
      name: 'Level 2 Penthouse',
      type: '2d_plan',
      storyHeight: 2.8,
      entities: [
        { id: 'r3', kind: 'room', name: 'Suite', x: 2, y: 2, width: 8, depth: 6 }
      ]
    }
  ];

  const multiModel = buildMultiStoryMassing3DModel(documents, {
    slabThickness: 0.25,
    wireframe: false
  });

  assertEqual(multiModel.storyCount, 3, 'Building contains 3 stacked stories');
  assertClose(multiModel.totalHeight, 3.2 + 3.0 + 2.8, 'Total building height is sum of story heights (9.0m)');
  assert(multiModel.grossFloorArea > 0, 'Gross Floor Area is calculated across all levels');
  assert(multiModel.grossVolume > 0, 'Gross Volume is calculated across all levels');
  assert(multiModel.faces.length > 0, 'Multi-story model contains stacked 3D faces');

  // Verify elevations of slabs
  const slabs = multiModel.faces.filter(f => f.type === 'slab');
  assertEqual(slabs.length, 18, 'Model contains 18 floor slab prism faces (6 faces x 3 stories)');

  // Verify baseElevation offsets on faces
  const level2Faces = multiModel.faces.filter(f => f.storyIndex === 2);
  assert(level2Faces.length > 0, 'Level 2 faces exist');
  assertClose(level2Faces[0].baseElevation, 6.2, 'Level 2 base elevation is 3.2 + 3.0 = 6.2m');

  // Standalone multi-story SVG export
  const multiSvg = generateMassingSVG(multiModel, {
    multiStory: true,
    documents,
    width: 900,
    height: 700
  });

  assert(multiSvg.includes('<svg'), 'Multi-story export renders <svg root');
  assert(multiSvg.includes('polygon points='), 'Multi-story export renders shaded polygons');
  assert(multiSvg.includes('3 Stories'), 'Multi-story export contains building metadata HUD');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 5. Multi-Viewport Presentation Sheets
// -----------------------------------------------------------------------------
console.log('\n--- 5. Multi-Viewport Presentation Sheets ---');

try {
  const planEntities = [
    { id: 'r1', kind: 'room', name: 'Executive Suite', x: 2, y: 2, width: 8, depth: 6 },
    { id: 'w1', kind: 'wall', x1: 2, y1: 2, x2: 10, y2: 2, thickness: 0.2 },
    { id: 'c1', kind: 'column', x: 6, y: 5, width: 0.4, depth: 0.4 }
  ];

  // 1. Single Viewport Mode
  const cfgSingle = createSheetConfig({ sheetSize: 'A3', layoutMode: 'single' });
  assertEqual(cfgSingle.layoutMode, 'single', 'Default/specified layoutMode is single');
  const layoutSingle = computeViewportLayout(cfgSingle, planEntities);
  assertEqual(layoutSingle.layoutMode, 'single', 'Layout computes single mode');
  assertEqual(layoutSingle.vignette3D, null, 'Single mode has no 3D vignette');
  assertEqual(layoutSingle.scheduleTable, null, 'Single mode has no schedule table');

  // 2. Plan + 3D Axonometric Vignette Mode
  const cfgPlan3D = createSheetConfig({ sheetSize: 'A3', layoutMode: 'plan_3d' });
  const layoutPlan3D = computeViewportLayout(cfgPlan3D, planEntities);
  assertEqual(layoutPlan3D.layoutMode, 'plan_3d', 'Layout computes plan_3d mode');
  assert(Boolean(layoutPlan3D.vignette3D), 'plan_3d mode computes vignette3D coordinates');
  assert(layoutPlan3D.vignette3D.width > 0, 'Vignette width is positive');
  assert(layoutPlan3D.vignette3D.height > 0, 'Vignette height is positive');

  const svgPlan3D = generateSheetSVG(cfgPlan3D, planEntities);
  assert(svgPlan3D.includes('id="sheet-vignette-3d"'), 'SVG contains 3D vignette element');
  assert(svgPlan3D.includes('3D AXONOMETRIC MASSING'), 'SVG contains 3D vignette drawing title');

  // 3. Plan + CAD Schedule Table Mode
  const cfgSchedule = createSheetConfig({ sheetSize: 'A3', layoutMode: 'plan_schedule' });
  const layoutSchedule = computeViewportLayout(cfgSchedule, planEntities);
  assertEqual(layoutSchedule.layoutMode, 'plan_schedule', 'Layout computes plan_schedule mode');
  assert(Boolean(layoutSchedule.scheduleTable), 'plan_schedule mode computes scheduleTable coordinates');

  const svgSchedule = generateSheetSVG(cfgSchedule, planEntities);
  assert(svgSchedule.includes('id="sheet-schedule-table"'), 'SVG contains CAD schedule table element');
  assert(svgSchedule.includes('ROOM &amp; AREA SCHEDULE'), 'SVG contains CAD schedule header');
  assert(svgSchedule.includes('Executive Suite'), 'SVG schedule table includes room row');
  assert(svgSchedule.includes('TOTAL NET AREA:'), 'SVG schedule table includes totals footer');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log('\n========================================');
console.log(`Phase 6 Studio Test Summary: ${passed} passed, ${failed} failed.`);
console.log('========================================\n');

if (failed > 0) {
  console.error(`💥 ${failed} tests failed!`);
  process.exit(1);
} else {
  console.log('🎉 ALL ARCHITECTURAL STUDIO PHASE 6 TESTS PASSED!\n');
}
