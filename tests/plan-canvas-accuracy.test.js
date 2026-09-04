/**
 * Architecture Helping Hand - Plan Canvas Coordinate Pipeline & Numerical Accuracy Test Suite
 * Validates the complete coordinate pipeline:
 * screen coordinates -> viewport coordinates -> transformed canvas coordinates -> world coordinates -> entity coordinates
 * Across zoom levels, pan offsets, sidebar offsets, DPR scaling, and grid snapping.
 */

import {
  createViewTransform, worldToSvg, svgToWorld, zoomAt, panBy,
  snapToGrid, snapRect, pickEntities, wallRect
} from '../src/core/plan-canvas.js';
import { createRoom, roomContainsPoint } from '../src/core/entities.js';
import { checkFurnitureFit, checkClearance } from '../src/core/space-planning.js';

let passed = 0;
let failed = 0;

function assert(condition, message, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Detail: ${JSON.stringify(detail)})`);
  }
}

function assertClose(actual, expected, message, eps = 1e-9) {
  const diff = Math.abs(actual - expected);
  if (diff <= eps) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, got ${actual}, diff: ${diff})`);
  }
}

console.log('🧪 Running tests/plan-canvas-accuracy.test.js...\n');

// 1. Invertibility of worldToSvg <-> svgToWorld across zoom & pan ranges
const testZooms = [5, 10, 20, 40, 50, 80, 100, 200, 400];
const testPans = [
  { ox: 0, oy: 0 },
  { ox: 60, oy: 420 },
  { ox: 280, oy: 64 },
  { ox: -1250, oy: 850 },
  { ox: 450.75, oy: 320.25 }
];

for (const z of testZooms) {
  for (const p of testPans) {
    const t = createViewTransform({ zoom: z, offsetX: p.ox, offsetY: p.oy });
    const testPoints = [
      { sx: 0, sy: 0 },
      { sx: 100, sy: 200 },
      { sx: 512.5, sy: 384.2 },
      { sx: 1920, sy: 1080 }
    ];
    for (const pt of testPoints) {
      const world = svgToWorld(t, pt.sx, pt.sy);
      const back = worldToSvg(t, world.x, world.y);
      assertClose(back.x, pt.sx, `Round-trip identity X at zoom=${z}px/m, offset=(${p.ox},${p.oy})`);
      assertClose(back.y, pt.sy, `Round-trip identity Y at zoom=${z}px/m, offset=(${p.ox},${p.oy})`);
    }
  }
}

// 2. ZoomAt Cursor Invariant: World coordinate under cursor MUST remain unchanged
const zoomFactors = [0.5, 0.87, 1.15, 1.5, 2.0];
const testCursors = [{ cx: 400, cy: 300 }, { cx: 100, cy: 100 }, { cx: 800, cy: 600 }];

for (const factor of zoomFactors) {
  for (const cursor of testCursors) {
    const tBefore = createViewTransform({ zoom: 40, offsetX: 150, offsetY: 250 });
    const wBefore = svgToWorld(tBefore, cursor.cx, cursor.cy);
    const tAfter = zoomAt(tBefore, factor, cursor.cx, cursor.cy);
    const wAfter = svgToWorld(tAfter, cursor.cx, cursor.cy);
    assertClose(wAfter.x, wBefore.x, `zoomAt cursor X locked under factor=${factor}`);
    assertClose(wAfter.y, wBefore.y, `zoomAt cursor Y locked under factor=${factor}`);
  }
}

// 3. PanBy Invariant: Pure translation shifts SVG coordinates linearly
const tBase = createViewTransform({ zoom: 50, offsetX: 100, offsetY: 200 });
const wFixed = { x: 3.5, y: -2.0 };
const svgOrig = worldToSvg(tBase, wFixed.x, wFixed.y);
const tPanned = panBy(tBase, 45, -30);
const svgPanned = worldToSvg(tPanned, wFixed.x, wFixed.y);
assertClose(svgPanned.x - svgOrig.x, 45, 'panBy shifted SVG X by exactly 45px');
assertClose(svgPanned.y - svgOrig.y, -30, 'panBy shifted SVG Y by exactly -30px');

// 4. Viewport / Sidebar Offset & Coordinate Simulation
// In standard desktop layout, SVG client rect is offset by sidebar width (280px) and topbar (64px)
function simulateScreenToWorld(clientX, clientY, sidebarWidth, topbarHeight, transform) {
  const sx = clientX - sidebarWidth;
  const sy = clientY - topbarHeight;
  return svgToWorld(transform, sx, sy);
}

const tStudio = createViewTransform({ zoom: 50, offsetX: 500, offsetY: 400 });
const worldOrigin = simulateScreenToWorld(780, 464, 280, 64, tStudio);
assertClose(worldOrigin.x, 0.0, 'Simulated screen click maps accurately to world origin X');
assertClose(worldOrigin.y, 0.0, 'Simulated screen click maps accurately to world origin Y');

const worldPt = simulateScreenToWorld(1030, 364, 280, 64, tStudio);
assertClose(worldPt.x, 5.0, 'Simulated screen click maps accurately to world (5.0m) X');
assertClose(worldPt.y, 2.0, 'Simulated screen click maps accurately to world (2.0m) Y');

// 5. Grid Snapping Bounds: Every snapped coordinate must be within grid/2 of raw coordinate
const testGrids = [0.1, 0.25, 0.5, 1.0];
for (const g of testGrids) {
  for (let raw = -10.0; raw <= 10.0; raw += 0.37) {
    const snapped = snapToGrid(raw, g);
    assert(Math.abs(snapped - raw) <= g / 2 + 1e-9, `snapToGrid(${raw}, ${g}) within tolerance`, { raw, snapped, g });
    const remainder = Math.abs(snapped % g);
    assert(remainder < 1e-9 || Math.abs(remainder - g) < 1e-9, `snapToGrid(${raw}, ${g}) is exact multiple of grid`, { raw, snapped, g });
  }
}

// 6. Entity Selection & Pick Precision
const room = createRoom({ name: 'Studio', x: 2.0, y: 1.0, width: 6.0, depth: 4.0 });
const insideClick = { x: 5.0, y: 3.0, width: 0, depth: 0 };
const outsideClick = { x: 1.5, y: 3.0, width: 0, depth: 0 };
const cornerClick = { x: 2.0, y: 1.0, width: 0, depth: 0 };

const hitInside = pickEntities([room], insideClick);
assert(hitInside.includes(room.id), 'Inside click successfully picks room');

const hitOutside = pickEntities([room], outsideClick);
assert(!hitOutside.includes(room.id), 'Outside click does not pick room');

const hitCorner = pickEntities([room], cornerClick);
assert(hitCorner.includes(room.id), 'Boundary/corner click picks room');

// 7. Space Planning Clearance Calculations & Labels
const fInside = { id: 'f1', name: 'Workstation', x: 3.5, y: 2.0, width: 1.6, depth: 0.8 };
const fitResult = checkFurnitureFit(fInside, room);
assert(fitResult.verdict === 'fits', 'Furniture cleanly inside room reports fits verdict');
assertClose(fitResult.evidence.marginWest, 1.5, 'Margin West computed accurately (3.5 - 2.0 = 1.5m)');
assertClose(fitResult.evidence.marginSouth, 1.0, 'Margin South computed accurately (2.0 - 1.0 = 1.0m)');

// Check clearance with 0.9m educational reference
const clear90 = checkClearance(fInside, room, 0.9, 'Educational Reference');
assert(clear90.satisfied === true, 'Clearance of 0.9m satisfied in spacious room');
assert(clear90.clearanceLabel === 'Educational Reference', 'Clearance label accurately preserves reference designation');

// Check clearance with 2.0m threshold (too large for this 4m deep room with 0.8m furniture)
const clear200 = checkClearance(fInside, room, 2.0, 'User Configured');
assert(clear200.satisfied === false, 'Clearance of 2.0m breached as expected');
assert(clear200.clearanceLabel === 'User Configured', 'User configured clearance label preserved');

console.log(`\nAccuracy tests complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
