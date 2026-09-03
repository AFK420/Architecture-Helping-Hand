/**
 * Architecture Helping Hand - Plan Canvas & Entities Test Suite
 * Phases 3+4: view transforms, grid/snapping, selection, undo/redo,
 * and the architectural entity model (rooms/walls/openings/furniture).
 * Real engines only — furniture footprints flow through the placement API
 * with catalog-scale cm dimensions; chain-derived geometry stays canonical.
 */

import {
  createViewTransform, worldToSvg, svgToWorld, zoomAt, panBy,
  buildGrid, snapToGrid, snapRect, pickEntities, wallRect,
  createHistory, entityAddRemoveCommand, entityMoveCommand
} from '../src/core/plan-canvas.js';
import {
  createRoom, roomArea, roomPerimeter, roomAspectRatio, roomContainsPoint, rectsIntersect,
  createWall, wallLength, wallDirection,
  createDoor, createWindow, SWING_TYPES, openingFitsWall,
  placeFurniture, furnitureRect
} from '../src/core/entities.js';
import { FURNITURE_DATABASE, getScaledFurnitureDimensions } from '../src/core/furniture.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

function assertClose(actual, expected, message, eps = 1e-9) {
  const ok = Math.abs(actual - expected) < eps;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected ~${expected}, Received: ${actual})`);
  }
}

console.log('🧪 Running tests/plan-canvas.test.js...');

// ---------------------------------------------------------------------------
// 1. View transforms (world ↔ SVG)
// ---------------------------------------------------------------------------
console.log('\n--- 1. View transforms ---');

{
  const t = createViewTransform({ offsetX: 60, offsetY: 420, zoom: 40 });
  const svg = worldToSvg(t, 2, 3);
  assertClose(svg.x, 60 + 80, 'world x → svg x');
  assertClose(svg.y, 420 - 120, 'world y flips to svg y (screen y down)');

  const back = svgToWorld(t, svg.x, svg.y);
  assertClose(back.x, 2, 'svg → world round-trip x');
  assertClose(back.y, 3, 'svg → world round-trip y');
}

{
  // Zoom-at-point keeps the world point under the cursor fixed
  const t = createViewTransform({});
  const anchor = { x: 300, y: 200 };
  const worldBefore = svgToWorld(t, anchor.x, anchor.y);
  const t2 = zoomAt(t, 2, anchor.x, anchor.y);
  const worldAfter = svgToWorld(t2, anchor.x, anchor.y);
  assertClose(worldAfter.x, worldBefore.x, 'zoom keeps world x anchored');
  assertClose(worldAfter.y, worldBefore.y, 'zoom keeps world y anchored');
  assertEqual(t2.zoom, t.zoom * 2, 'zoom doubled');

  const t3 = zoomAt(t, 1000, anchor.x, anchor.y);
  assertEqual(t3.zoom, 400, 'zoom clamped to max 400');
  const t4 = zoomAt(t, 0.0001, anchor.x, anchor.y);
  assertEqual(t4.zoom, 4, 'zoom clamped to min 4');
}

{
  const t = createViewTransform({});
  const t2 = panBy(t, 30, -15);
  assertEqual(t2.offsetX, t.offsetX + 30, 'pan changes offsetX');
  assertEqual(t2.offsetY, t.offsetY - 15, 'pan changes offsetY');
}

// ---------------------------------------------------------------------------
// 2. Grid & snapping
// ---------------------------------------------------------------------------
console.log('\n--- 2. Grid & snapping ---');

{
  const t = createViewTransform({ zoom: 40, offsetX: 60, offsetY: 420 });
  const grid = buildGrid(t, 800, 600, 0.5, 4);
  assert(grid.length > 0 && grid.length <= 400, 'Grid bounded for performance');
  assert(grid.some(l => l.major && l.axis === 'x'), 'Grid includes major x lines');
  const xLines = grid.filter(l => l.axis === 'x');
  assertClose(xLines[1].world - xLines[0].world, 0.5, 'Grid spacing 0.5 m');
}

{
  assertClose(snapToGrid(2.37, 0.5), 2.5, 'snap up to nearest 0.5');
  assertClose(snapToGrid(2.24, 0.5), 2.0, 'snap down to nearest 0.5');
  assertClose(snapToGrid(-0.2, 0.5), 0, 'negative value snaps to nearest grid point (-0.2 → 0)');
  assertClose(snapToGrid(-0.34, 0.5), -0.5, 'negative value beyond half-step snaps down');
  assertEqual(snapToGrid(0.0001, 0.5), 0, 'epsilon snap to exact 0');

  const r = snapRect({ x: 1.19, y: 0.94, width: 3.21, depth: 0.44 }, 0.5);
  assertEqual(JSON.stringify(r), JSON.stringify({ x: 1, y: 1, width: 3, depth: 0.5 }), 'Rect snapping (min size enforced)');
}

// ---------------------------------------------------------------------------
// 3. Rooms
// ---------------------------------------------------------------------------
console.log('\n--- 3. Rooms ---');

{
  const room = createRoom({ name: 'Living', x: 0, y: 0, width: 4.8, depth: 3.2 });
  assertClose(roomArea(room), 15.36, 'Area calculated from geometry (not stored)');
  assertClose(roomPerimeter(room), 16, 'Perimeter calculated');
  assertClose(roomAspectRatio(room), 1.5, 'Aspect ratio 4.8/3.2');
  assert(roomContainsPoint(room, 1, 1), 'Point inside detected');
  assert(!roomContainsPoint(room, 5, 1), 'Point outside rejected');
  assert(room.id.startsWith('room-'), 'Generated room id prefix');
}

{
  let threw = false;
  try { createRoom({ name: 'Bad', x: 0, y: 0, width: -2, depth: 3 }); } catch (e) { threw = true; }
  assert(threw, 'Negative width rejected');
  threw = false;
  try { createRoom({ name: 'Bad', x: 0, y: 0, width: NaN, depth: 3 }); } catch (e) { threw = true; }
  assert(threw, 'NaN width rejected');
}

{
  const a = { x: 0, y: 0, width: 2, depth: 2 };
  const b = { x: 1, y: 1, width: 2, depth: 2 };
  const c = { x: 5, y: 5, width: 1, depth: 1 };
  assert(rectsIntersect(a, b), 'Overlapping rects detected');
  assert(!rectsIntersect(a, c), 'Separated rects rejected');
}

// ---------------------------------------------------------------------------
// 4. Walls & openings
// ---------------------------------------------------------------------------
console.log('\n--- 4. Walls & openings ---');

{
  const wall = createWall({ name: 'North Wall', x1: 0, y1: 0, x2: 4.8, y2: 0, thickness: 0.2 });
  assertClose(wallLength(wall), 4.8, 'Wall length');
  assertEqual(wallDirection(wall), 'east', 'Direction east');
  assert(wall.id.startsWith('wall-'), 'Wall id prefix');

  let threw = false;
  try { createWall({ x1: 0, y1: 0, x2: 3, y2: 4 }); } catch (e) { threw = true; }
  assert(threw, 'Diagonal wall rejected (rectilinear scope, documented)');
  threw = false;
  try { createWall({ x1: 0, y1: 0, x2: 3, y2: 0, thickness: 0 }); } catch (e) { threw = true; }
  assert(threw, 'Zero thickness rejected');

  const rect = wallRect(wall);
  assertClose(rect.width, 4.8 + 0.2, 'Wall bounding rect includes thickness');
}

{
  const wall = createWall({ x1: 0, y1: 0, x2: 4.8, y2: 0 });
  const door = createDoor({ wallId: wall.id, position: 0.6, width: 0.9, swing: 'double' });
  assert(door.id.startsWith('door-'), 'Door id');
  assertEqual(door.swing, 'double', 'Swing type stored');
  assert(openingFitsWall(door, wall).fits, 'Door fits within wall');

  const bigDoor = createDoor({ wallId: wall.id, position: 4.0, width: 1.5 });
  const verdict = openingFitsWall(bigDoor, wall);
  assert(!verdict.fits, 'Oversized opening honestly reported (no silent fit)');

  const window1 = createWindow({ wallId: wall.id, position: 2.0, width: 1.2, sill: 0.9 });
  assertEqual(SWING_TYPES.includes('left'), true, 'Swing types registry');
  assert(openingFitsWall(window1, wall).fits, 'Window fits');
  assert(window1.id.startsWith('window-'), 'Window id');

  let threw = false;
  try { createDoor({ wallId: '', position: 0 }); } catch (e) { threw = true; }
  assert(threw, 'Door without wallId rejected');
  threw = false;
  try { createDoor({ wallId: wall.id, position: 0, swing: 'diagonal' }); } catch (e) { threw = true; }
  assert(threw, 'Invalid swing rejected');
}

// ---------------------------------------------------------------------------
// 5. Furniture placement — REAL catalog dimensions
// ---------------------------------------------------------------------------
console.log('\n--- 5. Furniture placement ---');

{
  const item = FURNITURE_DATABASE.find(f => f.wCm && f.dCm);
  assert(item, 'Real catalog item found with cm dimensions');
  const placed = placeFurniture({
    catalogId: item.id,
    displayName: item.name,
    wCm: item.wCm,
    dCm: item.dCm,
    x: 0.5, y: 0.5
  });
  // Real catalog → footprint in world meters (cm / 100)
  assertClose(placed.width, item.wCm / 100, 'Footprint width from real catalog (cm→m)');
  assertClose(placed.depth, item.dCm / 100, 'Footprint depth from real catalog');

  const rotated = placeFurniture({
    catalogId: item.id, wCm: item.wCm, dCm: item.dCm, x: 1, y: 1, rotated: true
  });
  assertClose(rotated.width, item.dCm / 100, 'Rotation swaps footprint width');
  assertClose(rotated.depth, item.wCm / 100, 'Rotation swaps footprint depth');

  // Cross-check against the existing scaler for the same item (50 scale)
  const scaled = getScaledFurnitureDimensions(item, 50, 'cm');
  assert(typeof scaled.paperFormatted === 'string' && scaled.paperFormatted.length > 0, 'Existing scaler still works alongside placement');
}

{
  const f = placeFurniture({ wCm: 120, dCm: 60, x: 2, y: 2 });
  const rect = furnitureRect(f);
  assertClose(rect.width, 1.2, 'Furniture rect width');
  assert(!pickEntities([f], { x: 10, y: 10, width: 0, depth: 0 }).includes(f.id), 'Point pick outside rejected');
  assert(pickEntities([f], { x: 2.5, y: 2.5, width: 0, depth: 0 }).includes(f.id), 'Point pick inside accepted');
}

// ---------------------------------------------------------------------------
// 6. Selection & picking
// ---------------------------------------------------------------------------
console.log('\n--- 6. Selection picking ---');

{
  const room = createRoom({ name: 'R1', x: 0, y: 0, width: 4, depth: 3 });
  const f1 = placeFurniture({ wCm: 100, dCm: 50, x: 0.5, y: 0.5 });
  const f2 = placeFurniture({ wCm: 100, dCm: 50, x: 6, y: 6 });
  const wall = createWall({ x1: 0, y1: 5, x2: 5, y2: 5 });
  const entities = [room, f1, f2, wall];

  const hits = pickEntities(entities, { x: 0.8, y: 0.8, width: 0, depth: 0 });
  assert(hits.includes(room.id) && hits.includes(f1.id), 'Point pick returns room + furniture');
  assert(!hits.includes(f2.id), 'Point pick excludes distant furniture');

  const wallHits = pickEntities(entities, { x: 2.5, y: 5, width: 0, depth: 0 });
  assert(wallHits.includes(wall.id), 'Wall pick includes thickness bounding rect');

  const boxHits = pickEntities(entities, { x: 0, y: 0, width: 6, depth: 6 });
  assert(boxHits.includes(room.id) && boxHits.includes(f1.id), 'Box pick finds contained entities');
}

// ---------------------------------------------------------------------------
// 7. Undo/Redo command stack
// ---------------------------------------------------------------------------
console.log('\n--- 7. Undo/Redo ---');

{
  const history = createHistory(50);
  const list = [];
  const room = createRoom({ name: 'Undo Room', x: 0, y: 0, width: 2, depth: 2 });

  const cmd = entityAddRemoveCommand(list, room, 'add room');
  cmd.redo();
  history.push(cmd);
  assertEqual(list.length, 1, 'Redo applied (add)');

  assertEqual(history.undo(), 'add room', 'Undo returns label');
  assertEqual(list.length, 0, 'Undo removed the room');

  assertEqual(history.redo(), 'add room', 'Redo returns label');
  assertEqual(list.length, 1, 'Redo re-added the room');

  assert(history.canUndo() && !history.canRedo(), 'Stack state consistent (redo cleared on push)');
  history.clear();
  assert(!history.canUndo(), 'Clear empties history');
}

{
  const history = createHistory();
  const f = placeFurniture({ wCm: 100, dCm: 50, x: 1, y: 1 });
  const move = entityMoveCommand(f, 2, 3, 'move desk');
  move.redo();
  history.push(move);
  assertClose(f.x, 3, 'Move applied');
  history.undo();
  assertClose(f.x, 1, 'Undo reverses move');
  assertClose(f.y, 1, 'Undo reverses move y');
  history.redo();
  assertClose(f.x, 3, 'Redo re-applies move');

  let threw = false;
  try { history.push({ label: 'bad' }); } catch (e) { threw = true; }
  assert(threw, 'Malformed command rejected');
}

{
  // History bounded
  const history = createHistory(3);
  const f = placeFurniture({ wCm: 10, dCm: 10, x: 0, y: 0 });
  for (let i = 0; i < 10; i++) {
    const cmd = entityMoveCommand(f, 0.1, 0, `move ${i}`);
    cmd.redo();
    history.push(cmd);
  }
  assert(history.depth() <= 3, 'History depth bounded');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
