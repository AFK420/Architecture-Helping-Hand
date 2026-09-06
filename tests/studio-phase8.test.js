/**
 * Architecture Helping Hand - Phase 8 Test Suite
 * Comprehensive verification of Vertical Circulation (multi-flight stairs, section slicing),
 * Construction Detail Callouts & Assemblies Engine, and Enlarged Multi-Viewport Sheets.
 */

import {
  createStairEntity,
  createStair,
  createDetailCallout,
  createWall,
  createDoor,
  createWindow,
  createSectionCut
} from '../src/core/entities.js';

import {
  DEFAULT_CAD_LAYERS,
  EXTENDED_CAD_LAYERS,
  resolveEntityLayer
} from '../src/core/layers.js';

import {
  DETAIL_ASSEMBLIES,
  generateDetailAssembly,
  generateDetailSVG
} from '../src/core/details.js';

import {
  generateBuildingElevation,
  generateBuildingSection,
  generateElevationSVG,
  generateSectionSVG
} from '../src/core/sections-elevations.js';

import {
  createSheetConfig,
  computeViewportLayout,
  generateSheetSVG
} from '../src/core/sheet.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
    failed++;
  }
}

console.log('\n🧪 Running tests/studio-phase8.test.js...');

// ---------------------------------------------------------------------------
// 1. Advanced Vertical Circulation & Multi-Flight Staircase Engine
// ---------------------------------------------------------------------------
console.log('\n--- 1. Advanced Vertical Circulation & Multi-Flight Staircase Engine ---');

{
  const stair = createStairEntity({
    x: 4.0,
    y: 2.0,
    width: 1.10,
    run: 3.20,
    rise: 2.80,
    risers: 16
  });

  assertEqual(stair.kind, 'stair', 'Entity kind is stair');
  assertEqual(stair.stairType, 'straight', 'Default stair type is straight');
  assertEqual(stair.riserCount, 16, 'Riser count is 16');
  assertEqual(stair.width, 1.10, 'Width is 1.10m');
  assertEqual(stair.run, 3.20, 'Run is 3.20m');
  assertEqual(stair.rise, 2.80, 'Total rise is 2.80m');
  assert(Math.abs(stair.riserHeight - 0.175) < 1e-4, 'Riser height is ~175mm (2.80 / 16)');
  assert(Math.abs(stair.going - (3.20 / 15)) < 1e-4, 'Going / tread depth is ~213mm (3.20 / 15)');
  assert(typeof stair.blondel === 'number', 'Blondel 2R+T is calculated');
  assert(stair.showBreakLine === true, 'Break line enabled by default');
  assertEqual(stair.direction, 'up', 'Default travel direction is up');
  assertEqual(stair.layerId, 'A-FLOR-STRS', 'Default layer is A-FLOR-STRS');
}

{
  // L-Shape and U-Shape stairs
  const lStair = createStair({
    name: 'Main L-Stair',
    stairType: 'l_shape',
    x: 1, y: 1,
    width: 1.0,
    run: 3.0,
    rise: 3.0,
    risers: 18,
    landingDepth: 1.2
  });
  assertEqual(lStair.stairType, 'l_shape', 'L-shaped stair recognized');
  assertEqual(lStair.landingDepth, 1.2, 'Custom landing depth set');

  const uStair = createStair({
    name: 'Fire Switchback Stair',
    stairType: 'u_shape',
    x: 0, y: 0,
    width: 1.2,
    run: 2.8,
    rise: 2.7,
    risers: 16
  });
  assertEqual(uStair.stairType, 'u_shape', 'U-shaped switchback stair recognized');
  assertEqual(createStair, createStairEntity, 'createStair is an alias for createStairEntity');
}

{
  // Code compliance check (IBC / Blondel)
  const compliantStair = createStairEntity({
    x: 0, y: 0,
    width: 1.20,
    run: 4.20, // 15 treads @ 0.28m
    rise: 2.70, // 16 risers @ 0.16875m
    risers: 16,
    tread: 0.28
  });
  // 2*0.16875 + 0.28 = 0.6175m (within 0.60 - 0.66m)
  assert(compliantStair.isCompliant, 'Comfortable stair meets IBC / Blondel compliance criteria');

  const steepStair = createStairEntity({
    x: 0, y: 0,
    width: 0.8,
    run: 1.5,
    rise: 3.0,
    risers: 10 // 300mm risers - steep!
  });
  assert(!steepStair.isCompliant, 'Excessively steep stair flagged as non-compliant');
}

// ---------------------------------------------------------------------------
// 2. Construction Detail Callouts & Layer Architecture
// ---------------------------------------------------------------------------
console.log('\n--- 2. Construction Detail Callouts & Layer Architecture ---');

{
  const callout = createDetailCallout({
    x: 8.5,
    y: 4.0,
    width: 1.8,
    depth: 1.8,
    detailNum: '2',
    sheetRef: 'A-501',
    title: 'Roof Parapet & Coping Detail',
    detailKey: 'parapet'
  });

  assertEqual(callout.kind, 'detail_callout', 'Entity kind is detail_callout');
  assertEqual(callout.detailNum, '2', 'Detail number is 2');
  assertEqual(callout.sheetRef, 'A-501', 'Sheet reference is A-501');
  assertEqual(callout.detailKey, 'parapet', 'Detail key is parapet');
  assertEqual(callout.width, 1.8, 'Callout width is 1.8m');
  assertEqual(callout.shape, 'circle', 'Default shape is circle');
  assertEqual(callout.layerId, 'A-ANNO-TAGS', 'Default layer is A-ANNO-TAGS');

  // Layer resolution
  const resolved = resolveEntityLayer(callout, DEFAULT_CAD_LAYERS);
  assertEqual(resolved.id, 'A-ANNO-TAGS', 'Resolves to A-ANNO-TAGS in default CAD layers');
  assertEqual(DEFAULT_CAD_LAYERS.length, 10, 'DEFAULT_CAD_LAYERS retains exactly 10 layers');

  const extResolved = resolveEntityLayer(callout, EXTENDED_CAD_LAYERS);
  assert(extResolved.id === 'A-ANNO-TAGS' || extResolved.id === 'A-DETL', 'Resolves cleanly in extended CAD layers');
}

// ---------------------------------------------------------------------------
// 3. Construction Detail Assemblies Engine (src/core/details.js)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Construction Detail Assemblies Engine ---');

{
  assert(Boolean(DETAIL_ASSEMBLIES.footing), 'Catalog includes footing assembly');
  assert(Boolean(DETAIL_ASSEMBLIES.parapet), 'Catalog includes parapet assembly');
  assert(Boolean(DETAIL_ASSEMBLIES.window_sill), 'Catalog includes window_sill assembly');
  assert(Boolean(DETAIL_ASSEMBLIES.stair_nosing), 'Catalog includes stair_nosing assembly');

  // Detail 1: Footing
  const footing = generateDetailAssembly('footing');
  assertEqual(footing.key, 'footing', 'Footing assembly key verified');
  assertEqual(footing.scaleRatio, 10, 'Footing scale is 1:10');
  assert(footing.components.length >= 6, 'Footing has >= 6 detailed components');
  const stripFootingComp = footing.components.find(c => c.id === 'footing');
  assert(Boolean(stripFootingComp), 'Contains strip footing component');
  assert(Array.isArray(stripFootingComp.rebar) && stripFootingComp.rebar.length > 0, 'Footing has rebar dots');
  const drainTile = footing.components.find(c => c.id === 'drain_tile');
  assert(Boolean(drainTile), 'Contains perforated drain tile pipe component');
  assert(footing.keynotes.length >= 5, 'Footing has >= 5 annotated keynotes');

  // Detail 2: Parapet
  const parapet = generateDetailAssembly('parapet');
  assertEqual(parapet.key, 'parapet', 'Parapet assembly key verified');
  assertEqual(parapet.scaleRatio, 10, 'Parapet scale is 1:10');
  const coping = parapet.components.find(c => c.id === 'coping_cap');
  assert(Boolean(coping), 'Contains metal coping cap component');
  const epdm = parapet.components.find(c => c.id === 'epdm_membrane');
  assert(Boolean(epdm), 'Contains EPDM waterproof membrane');

  // Detail 3: Window Sill
  const sill = generateDetailAssembly('window_sill');
  assertEqual(sill.key, 'window_sill', 'Window sill assembly key verified');
  assertEqual(sill.scaleRatio, 5, 'Window sill scale is 1:5');
  const brick = sill.components.find(c => c.id === 'brick_veneer');
  assert(Boolean(brick), 'Contains clay brick veneer component');
  const stoneSill = sill.components.find(c => c.id === 'stone_sill');
  assert(Boolean(stoneSill), 'Contains sloped precast stone sill');

  // Detail 4: Stair Nosing
  const nosing = generateDetailAssembly('stair_nosing');
  assertEqual(nosing.key, 'stair_nosing', 'Stair nosing assembly key verified');
  assertEqual(nosing.scaleRatio, 5, 'Stair nosing scale is 1:5');
  const carborundum = nosing.components.find(c => c.id === 'abrasive_insert');
  assert(Boolean(carborundum), 'Contains carborundum non-slip safety insert');
  const baluster = nosing.components.find(c => c.id === 'baluster_post');
  assert(Boolean(baluster), 'Contains stainless steel baluster post');

  // SVG Export
  const svg = generateDetailSVG('footing');
  assert(svg.includes('<svg'), 'Detail SVG output starts with <svg');
  assert(svg.includes('concreteHatch'), 'Detail SVG includes concrete stipple hatch pattern');
  assert(svg.includes('earthDetailHatch'), 'Detail SVG includes 45° earth hatch pattern');
  assert(svg.includes('EXTERIOR WALL &amp; STRIP FOOTING DETAIL') || svg.includes('STRIP FOOTING'), 'Detail SVG includes title');
  assert(svg.includes('A-501'), 'Detail SVG references sheet A-501');
}

// ---------------------------------------------------------------------------
// 4. Section & Elevation Stair Slicing and Projection
// ---------------------------------------------------------------------------
console.log('\n--- 4. Section & Elevation Stair Slicing and Projection ---');

{
  const entities = [
    createWall({ x1: 0, y1: 0, x2: 12, y2: 0, thickness: 0.25 }),
    createWall({ x1: 12, y1: 0, x2: 12, y2: 8, thickness: 0.25 }),
    createWall({ x1: 12, y1: 8, x2: 0, y2: 8, thickness: 0.25 }),
    createWall({ x1: 0, y1: 8, x2: 0, y2: 0, thickness: 0.25 }),
    // Place a staircase along Y = 3 to 6
    createStairEntity({
      name: 'Central Flight',
      x: 5.0,
      y: 3.0,
      width: 1.2,
      run: 3.2,
      rise: 3.0,
      risers: 18
    })
  ];

  // Section cut slicing right through the stair at Y = 4.5
  const sectionCut = createSectionCut({
    p1: { x: -1.0, y: 4.5 },
    p2: { x: 13.0, y: 4.5 },
    label: 'A'
  });

  const sectionModel = generateBuildingSection(entities, sectionCut);
  assert(Array.isArray(sectionModel.cutStairs), 'Section model produces cutStairs array');
  assertEqual(sectionModel.cutStairs.length, 1, 'Detected 1 stair sliced by the cut plane');
  const cutStair = sectionModel.cutStairs[0];
  assertEqual(cutStair.isCut, true, 'Stair flagged as cut');
  assertEqual(cutStair.numRisers, 18, 'Cut stair has 18 risers');
  assertEqual(cutStair.steps.length, 18, 'Generated 18 stepped profile segments');
  assert(Boolean(cutStair.handrail), 'Generated 900mm handrail with baluster posts');

  // Verify section SVG includes stair stepped linework & concrete waist slab
  const sectionSVG = generateSectionSVG(sectionModel, sectionCut);
  assert(sectionSVG.includes('<svg'), 'Section SVG generated');
  assert(sectionSVG.includes('polyline'), 'Section SVG includes stepped polylines');
  assert(sectionSVG.includes('concrete-slab-hatch'), 'Section SVG includes concrete slab hatch for waist');

  // Elevation projection
  const elevationModel = generateBuildingElevation(entities, 'south');
  assert(Array.isArray(elevationModel.stairs), 'Elevation model produces stairs array');
  assertEqual(elevationModel.stairs.length, 1, 'Elevation detected 1 stair in projection');
  const elevSVG = generateElevationSVG(elevationModel, 'south');
  assert(elevSVG.includes('<svg'), 'Elevation SVG generated');
  assert(elevSVG.includes('polyline'), 'Elevation SVG renders projected stair steps');
}

// ---------------------------------------------------------------------------
// 5. Multi-Viewport Presentation Sheets with Detail Views
// ---------------------------------------------------------------------------
console.log('\n--- 5. Multi-Viewport Presentation Sheets with Detail Views ---');

{
  const entities = [
    createWall({ x1: 0, y1: 0, x2: 10, y2: 0, thickness: 0.2 }),
    createWall({ x1: 10, y1: 0, x2: 10, y2: 8, thickness: 0.2 }),
    createWall({ x1: 10, y1: 8, x2: 0, y2: 8, thickness: 0.2 }),
    createWall({ x1: 0, y1: 8, x2: 0, y2: 0, thickness: 0.2 }),
    createDetailCallout({ x: 5, y: 0, width: 1.5, depth: 1.5, detailNum: '1', sheetRef: 'A-501', detailKey: 'footing' })
  ];

  // 1. Plan + Detail layout mode
  const planDetailCfg = createSheetConfig({
    sheetNumber: 'A-101',
    sheetTitle: 'GROUND PLAN & FOUNDATION DETAIL',
    layoutMode: 'plan_detail'
  });
  const layout1 = computeViewportLayout(planDetailCfg, entities);
  assertEqual(layout1.layoutMode, 'plan_detail', 'Layout computes plan_detail mode');
  assert(Boolean(layout1.detailViewport), 'Detail viewport layout computed');
  assert(layout1.detailViewport.width > 0, 'Detail viewport has valid width');
  assert(layout1.detailViewport.height > 0, 'Detail viewport has valid height');

  const sheetSVG1 = generateSheetSVG(planDetailCfg, entities, { detailKey: 'footing' });
  assert(sheetSVG1.includes('<svg'), 'Sheet SVG generated for plan_detail mode');
  assert(sheetSVG1.includes('sheet-detail-viewport'), 'Sheet SVG includes detail viewport container');
  assert(sheetSVG1.includes('CONSTRUCTION DETAIL'), 'Sheet SVG includes construction detail title');

  // 2. Full details_sheet matrix mode
  const detailsSheetCfg = createSheetConfig({
    sheetNumber: 'A-501',
    sheetTitle: 'TYPICAL CONSTRUCTION DETAILS',
    layoutMode: 'details_sheet'
  });
  const layout2 = computeViewportLayout(detailsSheetCfg, entities);
  assertEqual(layout2.layoutMode, 'details_sheet', 'Layout computes details_sheet mode');
  assert(Array.isArray(layout2.detailsSheetMatrix), 'Matrix of detail viewports computed');
  assertEqual(layout2.detailsSheetMatrix.length, 4, 'Matrix contains 4 standard construction details');

  const sheetSVG2 = generateSheetSVG(detailsSheetCfg, entities);
  assert(sheetSVG2.includes('<svg'), 'Sheet SVG generated for details_sheet mode');
  assert(sheetSVG2.includes('sheet-details-matrix'), 'Sheet SVG contains 4-detail matrix container');
  assert(sheetSVG2.includes('sheet-matrix-detail-1'), 'Sheet SVG contains matrix cell 1 (Footing)');
  assert(sheetSVG2.includes('sheet-matrix-detail-2'), 'Sheet SVG contains matrix cell 2 (Parapet)');
  assert(sheetSVG2.includes('sheet-matrix-detail-3'), 'Sheet SVG contains matrix cell 3 (Window Sill)');
  assert(sheetSVG2.includes('sheet-matrix-detail-4'), 'Sheet SVG contains matrix cell 4 (Stair Nosing)');
}

console.log('\n========================================');
console.log(`Phase 8 Studio Test Summary: ${passed} passed, ${failed} failed.`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ARCHITECTURAL STUDIO PHASE 8 TESTS PASSED!');
}
