/**
 * tests/studio-phase5.test.js
 * Comprehensive unit and integration test suite for Architectural Studio Phase 5:
 * - Structural Columns & Grid System (`A-GRID`, profiles, snap points, intersections, grid system generator)
 * - Lightweight 3D Massing & Axonometric Engine (projection, model builder, wall openings, depth sorting, SVG export)
 * - Presentation Sheet Engine (ISO sizes A4-A1, scales, viewport layout, title blocks, SVG export)
 * - CAD & Layer Integration (export geometry mapping to A-GRID)
 */

import {
  COLUMN_PROFILES,
  BUBBLE_POSITIONS,
  createColumn,
  createGridLine,
  columnContour,
  columnHatchLines,
  columnSnapPoints,
  gridLineIntersection,
  generateGridSystem
} from '../src/core/grid-columns.js';

import {
  CAMERA_PRESETS,
  projectPoint3D,
  buildMassing3DModel,
  projectAndSortFaces,
  generateMassingSVG
} from '../src/core/massing-3d.js';

import {
  SHEET_SIZES,
  ARCHITECTURAL_SCALES,
  createSheetConfig,
  computePlanBounds,
  computeViewportLayout,
  generateSheetSVG
} from '../src/core/sheet.js';

import { planToExportGeometry } from '../src/core/plan-canvas.js';
import { DEFAULT_CAD_LAYERS, resolveEntityLayer } from '../src/core/layers.js';

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

function assertClose(actual, expected, message, tolerance = 1e-4) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, got ${actual})`);
    failed++;
    throw new Error(`${message}: Expected ~${expected}, got ${actual}`);
  } else {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  }
}

console.log('\n🧪 Running tests/studio-phase5.test.js...\n');

// -----------------------------------------------------------------------------
// 1. Column Profiles & Snapping Tests
// -----------------------------------------------------------------------------
console.log('--- 1. Structural Column System ---');

try {
  const col = createColumn({ x: 5, y: 5, profile: 'rect', width: 0.4, depth: 0.4, label: 'C1' });
  assertEqual(col.kind, 'column', 'Column entity kind is "column"');
  assertEqual(col.layer, 'A-GRID', 'Column assigned to layer A-GRID');
  assertEqual(col.profile, 'rect', 'Column profile is "rect"');
  assertClose(col.width, 0.4, 'Column width is 0.4m');

  // Rect contour
  const contour = columnContour(col);
  assertEqual(contour.length, 4, 'Rectangular column contour has 4 vertices');
  assertClose(contour[0].x, 4.8, 'Rect column vertex 0 x is 4.8');
  assertClose(contour[0].y, 4.8, 'Rect column vertex 0 y is 4.8');

  // Rect hatch
  const hatch = columnHatchLines(col);
  assertEqual(hatch.length, 2, 'Rect cross-hatch has 2 diagonal lines');

  // Snap points
  const snaps = columnSnapPoints(col);
  assertEqual(snaps.length, 9, 'Rect column has 9 snap points (center + 4 corners + 4 midpoints)');
  const centerSnap = snaps.find(s => s.type === 'center' || s.type === 'column_center');
  assert(Boolean(centerSnap), 'Rect column has center snap point');
  assertClose(centerSnap.x, 5, 'Center snap x matches column x');
  assertClose(centerSnap.y, 5, 'Center snap y matches column y');

  // Circular Column
  const roundCol = createColumn({ x: 10, y: 10, profile: 'circle', radius: 0.25, label: 'C2' });
  const roundContour = columnContour(roundCol);
  assert(roundContour.length >= 16, 'Circular column contour has at least 16 polygon points');
  const roundHatch = columnHatchLines(roundCol);
  assertEqual(roundHatch.length, 2, 'Circular column has cross-hair hatch lines');
  const roundSnaps = columnSnapPoints(roundCol);
  assertEqual(roundSnaps.length, 5, 'Circular column has 5 snap points (center + 4 quadrants)');

  // H-Beam Column
  const hCol = createColumn({ x: 2, y: 2, profile: 'h_beam', width: 0.3, depth: 0.3, label: 'W12x26' });
  const hContour = columnContour(hCol);
  assertEqual(hContour.length, 12, 'H-beam column contour has 12 points (I-shape contour)');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 2. Grid Line System & Intersection Math
// -----------------------------------------------------------------------------
console.log('\n--- 2. Grid Line System & Intersections ---');

try {
  const g1 = createGridLine({ x1: 0, y1: 0, x2: 20, y2: 0, label: 'A', bubble: 'both' });
  assertEqual(g1.kind, 'grid_line', 'Grid line entity kind is "grid_line"');
  assertEqual(g1.layer, 'A-GRID', 'Grid line layer is A-GRID');
  assertEqual(g1.bubble, 'both', 'Grid line bubble is "both"');

  const g2 = createGridLine({ x1: 10, y1: -10, x2: 10, y2: 10, label: '1', bubble: 'end' });
  const isect = gridLineIntersection(g1, g2);
  assert(Boolean(isect), 'Grid lines A and 1 intersect');
  assertClose(isect.x, 10, 'Intersection x is 10.0');
  assertClose(isect.y, 0, 'Intersection y is 0.0');

  // Parallel non-intersecting
  const g3 = createGridLine({ x1: 0, y1: 5, x2: 20, y2: 5, label: 'B' });
  const noIsect = gridLineIntersection(g1, g3);
  assertEqual(noIsect, null, 'Parallel horizontal grid lines return null intersection');

  // Grid system generation helper
  const system = generateGridSystem({
    xOrigin: 0,
    yOrigin: 0,
    xSpacings: [6, 6, 6],
    ySpacings: [8, 8],
    xLabels: ['1', '2', '3', '4'],
    yLabels: ['A', 'B', 'C'],
    extension: 2.0
  });

  assertEqual(system.gridLines.length, 7, 'Generated 7 grid lines (4 vertical + 3 horizontal)');
  assertEqual(system.columns.length, 12, 'Generated 12 columns at all grid intersections');
  assertEqual(system.columns[0].layer, 'A-GRID', 'Generated columns have A-GRID layer');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 3. Lightweight 3D Massing & Axonometric Engine
// -----------------------------------------------------------------------------
console.log('\n--- 3. 3D Massing & Axonometric Engine ---');

try {
  // 3D Point projection
  const cam = { azimuth: 45, elevation: 35.264, zoom: 40, panX: 400, panY: 300 };
  const projOrigin = projectPoint3D(0, 0, 0, cam);
  assertClose(projOrigin.x, 400, 'Projected origin panX is 400');
  assertClose(projOrigin.y, 300, 'Projected origin panY is 300');

  // Presets exist
  assert(Boolean(CAMERA_PRESETS.iso_ne), 'ISO NE camera preset exists');
  assert(Boolean(CAMERA_PRESETS.iso_nw), 'ISO NW camera preset exists');
  assert(Boolean(CAMERA_PRESETS.axonometric), 'Axonometric camera preset exists');

  // Model builder with walls, door openings, window openings, and room slab
  const testEntities = [
    { id: 'r1', kind: 'room', name: 'Main Hall', x: 0, y: 0, width: 10, depth: 8 },
    { id: 'w1', kind: 'wall', x1: 0, y1: 0, x2: 10, y2: 0, thickness: 0.2 },
    { id: 'w2', kind: 'wall', x1: 10, y1: 0, x2: 10, y2: 8, thickness: 0.2 },
    { id: 'w3', kind: 'wall', x1: 10, y1: 8, x2: 0, y2: 8, thickness: 0.2 },
    { id: 'w4', kind: 'wall', x1: 0, y1: 8, x2: 0, y2: 0, thickness: 0.2 },
    { id: 'd1', kind: 'door', hostWallId: 'w1', offset: 2.0, width: 0.9, height: 2.1 },
    { id: 'win1', kind: 'window', hostWallId: 'w2', offset: 3.0, width: 1.5, sillHeight: 0.9, height: 1.2 },
    { id: 'c1', kind: 'column', x: 5, y: 4, profile: 'rect', width: 0.4, depth: 0.4 }
  ];

  const model = buildMassing3DModel(testEntities, { wallHeight: 3.0, doorHeight: 2.1, windowSill: 0.9, windowHeight: 1.2 });
  assert(model.faces.length > 0, 'Extruded model contains faces');

  // Slabs, walls, lintels, columns check
  const faceTypes = new Set(model.faces.map(f => f.type));
  assert(faceTypes.has('slab'), 'Model contains ground slab face');
  assert(faceTypes.has('wall'), 'Model contains extruded wall faces');
  assert(faceTypes.has('lintel'), 'Model contains door/window lintel faces');
  assert(faceTypes.has('glass'), 'Model contains window glass faces');
  assert(faceTypes.has('column'), 'Model contains extruded column faces');

  // Project & depth sort
  const sorted = projectAndSortFaces(model.faces, cam);
  assertEqual(sorted.length, model.faces.length, 'All faces projected and sorted');
  for (let i = 0; i < sorted.length - 1; i++) {
    assert(sorted[i].depth <= sorted[i + 1].depth, `Faces properly depth-sorted at index ${i}`);
  }

  // Standalone SVG export
  const svgString = generateMassingSVG(testEntities, {
    camera: cam,
    width: 800,
    height: 600,
    title: 'Test Building Axo'
  });
  assert(svgString.includes('<svg'), 'Massing export contains <svg root');
  assert(svgString.includes('Test Building Axo'), 'Massing export contains title');
  assert(svgString.includes('polygon points='), 'Massing export renders shaded polygons');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 4. Presentation Sheet Engine
// -----------------------------------------------------------------------------
console.log('\n--- 4. Presentation Sheet Engine ---');

try {
  // ISO sheet definitions
  assertEqual(SHEET_SIZES.A3.widthMm, 420, 'A3 width is 420mm');
  assertEqual(SHEET_SIZES.A3.heightMm, 297, 'A3 height is 297mm');
  assertEqual(SHEET_SIZES.A4.widthMm, 297, 'A4 landscape width is 297mm');
  assertEqual(SHEET_SIZES.A4.heightMm, 210, 'A4 landscape height is 210mm');
  assertEqual(SHEET_SIZES.A1.widthMm, 841, 'A1 width is 841mm');

  // Sheet config creation
  const cfg = createSheetConfig({
    sheetSize: 'A3',
    scaleRatio: 100,
    projectName: 'Skyline Residence',
    sheetTitle: 'GROUND FLOOR PLAN',
    sheetNumber: 'A-101'
  });
  assertEqual(cfg.sheetSize, 'A3', 'Config sheet size is A3');
  assertEqual(cfg.scaleRatio, 100, 'Config scale is 1:100');
  assertEqual(cfg.sheetNumber, 'A-101', 'Config sheet number is A-101');

  // Plan bounding box computation
  const testEntities = [
    { kind: 'wall', x1: 2, y1: 3, x2: 12, y2: 3 },
    { kind: 'wall', x1: 12, y1: 3, x2: 12, y2: 13 },
    { kind: 'column', x: 20, y: 20, width: 0.5, depth: 0.5 }
  ];
  const bounds = computePlanBounds(testEntities);
  assertClose(bounds.minX, 2, 'Plan bounds minX is 2');
  assertClose(bounds.minY, 3, 'Plan bounds minY is 3');
  assertClose(bounds.maxX, 20.25, 'Plan bounds maxX is 20.25');
  assertClose(bounds.maxY, 20.25, 'Plan bounds maxY is 20.25');

  // Viewport layout computation
  const layout = computeViewportLayout(cfg, bounds);
  assert(layout.viewportWidth > 0, 'Viewport width is positive');
  assert(layout.viewportHeight > 0, 'Viewport height is positive');
  assert(layout.scaleRatio === 100, 'Layout reflects 1:100 scale ratio');

  // Standalone SVG Sheet generation
  const sheetSvg = generateSheetSVG(testEntities, cfg);
  assert(sheetSvg.includes('<svg'), 'Sheet export contains <svg');
  assert(sheetSvg.includes('Skyline Residence'), 'Sheet export contains project name');
  assert(sheetSvg.includes('GROUND FLOOR PLAN'), 'Sheet export contains sheet title');
  assert(sheetSvg.includes('A-101'), 'Sheet export contains sheet number');
  assert(sheetSvg.includes('1:100'), 'Sheet export contains scale notation');
  assert(sheetSvg.includes('id="north-arrow"'), 'Sheet export contains North arrow');
  assert(sheetSvg.includes('id="title-block"'), 'Sheet export contains title block');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// 5. Layer Assignment & CAD Export Integration
// -----------------------------------------------------------------------------
console.log('\n--- 5. CAD Export & Layer Integration ---');

try {
  // Layer roster mapping
  assertEqual(resolveEntityLayer({ kind: 'column' }).id, 'A-GRID', 'column kind maps to A-GRID');
  assertEqual(resolveEntityLayer({ kind: 'grid_line' }).id, 'A-GRID', 'grid_line kind maps to A-GRID');
  const aGridLayer = DEFAULT_CAD_LAYERS.find(l => l.id === 'A-GRID');
  assert(Boolean(aGridLayer && aGridLayer.printable), 'A-GRID is printable');

  // planToExportGeometry with columns and grid lines
  const entities = [
    createColumn({ x: 5, y: 5, profile: 'rect', width: 0.4, depth: 0.4 }),
    createGridLine({ x1: 0, y1: 5, x2: 10, y2: 5, label: '1', bubble: 'both' })
  ];

  const exportGeom = planToExportGeometry(entities);
  assert(Array.isArray(exportGeom.lines), 'Export geometry has lines array');
  assert(Array.isArray(exportGeom.polygons), 'Export geometry has polygons array');
  assert(Array.isArray(exportGeom.circles), 'Export geometry has circles array');
  assert(Array.isArray(exportGeom.texts), 'Export geometry has texts array');

  // Column contour polygon
  const colPolys = exportGeom.polygons.filter(p => p.layer === 'A-GRID');
  assertEqual(colPolys.length, 1, 'Column contour polygon is exported on layer A-GRID');

  // Column cross-hatch lines + Grid centerline
  const gridLines = exportGeom.lines.filter(l => l.layer === 'A-GRID');
  assertEqual(gridLines.length, 3, 'Exported 3 lines on A-GRID (2 column hatch lines + 1 grid centerline)');

  // Grid line bubbles & text
  const gridCircles = exportGeom.circles.filter(c => c.layer === 'A-GRID');
  assertEqual(gridCircles.length, 2, 'Exported 2 circle bubbles for grid line with bubble="both"');

  const gridTexts = exportGeom.texts.filter(t => t.layer === 'A-GRID');
  assertEqual(gridTexts.length, 2, 'Exported 2 text labels for grid line bubbles');
  assertEqual(gridTexts[0].text, '1', 'Grid text matches label "1"');
} catch (e) {
  console.error(e);
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Phase 5 Studio Test Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
