/**
 * Architecture Helping Hand - Phase 4 Studio Tests
 * CAD Layer Management System, Architectural Callouts & Universal CAD Export
 */

import {
  DEFAULT_CAD_LAYERS,
  cloneDefaultLayers,
  normalizeDocumentLayers,
  resolveEntityLayer,
  isEntityVisible,
  isEntityLocked,
  toggleLayerVisibility,
  toggleLayerLock,
  addCustomLayer,
  deleteCustomLayer,
  setEntityLayer
} from '../src/core/layers.js';

import {
  createRoom,
  createWall,
  createDoor,
  createWindow,
  placeFurniture,
  createDimension,
  createRoomTag,
  createDoorTag,
  createWindowTag,
  createLeaderNote,
  createNorthArrow,
  autoTagDocument
} from '../src/core/entities.js';

import { planToExportGeometry } from '../src/core/plan-canvas.js';
import { buildDXF } from '../src/core/export/export-model.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

function assertClose(actual, expected, tol = 1e-3, message) {
  if (Math.abs(actual - expected) <= tol) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (expected ~${expected}, got ${actual})`);
  }
}

console.log('\n--- 1. CAD Layer Management Engine ---');
{
  // 1a. Standard AIA/ISO layer defaults
  assertEqual(DEFAULT_CAD_LAYERS.length, 10, '10 Standard CAD layers defined');
  const wallLayer = DEFAULT_CAD_LAYERS.find(l => l.id === 'A-WALL');
  assert(wallLayer !== undefined, 'A-WALL layer exists');
  assertEqual(wallLayer.color, '#4989D9', 'A-WALL has standard linework color');
  assertEqual(wallLayer.lineweight, 0.35, 'A-WALL has 0.35mm lineweight');
  assertEqual(wallLayer.visible, true, 'Default layer is visible');
  assertEqual(wallLayer.locked, false, 'Default layer is unlocked');

  // 1b. cloneDefaultLayers
  const cloned = cloneDefaultLayers();
  assertEqual(cloned.length, 10, 'cloneDefaultLayers returns 10 layers');
  cloned[0].visible = false;
  assertEqual(DEFAULT_CAD_LAYERS[0].visible, true, 'cloneDefaultLayers returns isolated deep copy');

  // 1c. normalizeDocumentLayers
  const docEmpty = {};
  normalizeDocumentLayers(docEmpty);
  assert(Array.isArray(docEmpty.layers), 'Initializes layers array if missing');
  assertEqual(docEmpty.layers.length, 10, 'Normalized layers has all 10 defaults');

  // Legacy boolean layers migration
  const docLegacy = {
    layers: {
      walls: false,
      doors: true,
      windows: false,
      furniture: false
    }
  };
  normalizeDocumentLayers(docLegacy);
  const legWall = docLegacy.layers.find(l => l.id === 'A-WALL');
  const legDoor = docLegacy.layers.find(l => l.id === 'A-DOOR');
  const legGlaz = docLegacy.layers.find(l => l.id === 'A-GLAZ');
  const legFurn = docLegacy.layers.find(l => l.id === 'A-FURN');
  assertEqual(legWall.visible, false, 'Legacy walls=false migrated to A-WALL visible=false');
  assertEqual(legDoor.visible, true, 'Legacy doors=true migrated to A-DOOR visible=true');
  assertEqual(legGlaz.visible, false, 'Legacy windows=false migrated to A-GLAZ visible=false');
  assertEqual(legFurn.visible, false, 'Legacy furniture=false migrated to A-FURN visible=false');

  // 1d. Layer Resolution by Kind and Explicit Layer ID
  const doc = { layers: cloneDefaultLayers() };
  const wall = createWall({ id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0 });
  const door = createDoor({ id: 'd1', wallId: 'w1', position: 2.0 });
  const room = createRoom({ id: 'r1', name: 'Master Suite', x: 0, y: 0, width: 5, depth: 4 });

  assertEqual(resolveEntityLayer(wall, doc).id, 'A-WALL', 'Wall resolves to A-WALL');
  assertEqual(resolveEntityLayer(door, doc).id, 'A-DOOR', 'Door resolves to A-DOOR');
  assertEqual(resolveEntityLayer(room, doc).id, 'A-AREA', 'Room resolves to A-AREA');

  // Explicit layer assignment
  setEntityLayer(wall, 'A-GRID');
  assertEqual(resolveEntityLayer(wall, doc).id, 'A-GRID', 'Explicit layerId takes precedence');

  // 1e. Visibility & Locking Toggles
  assertEqual(isEntityVisible(door, doc), true, 'Door is initially visible');
  assertEqual(isEntityLocked(door, doc), false, 'Door is initially unlocked');

  toggleLayerVisibility(doc, 'A-DOOR');
  assertEqual(isEntityVisible(door, doc), false, 'Door becomes hidden when A-DOOR visibility toggled');

  toggleLayerLock(doc, 'A-DOOR');
  assertEqual(isEntityLocked(door, doc), true, 'Door becomes locked when A-DOOR lock toggled');

  toggleLayerVisibility(doc, 'A-DOOR');
  toggleLayerLock(doc, 'A-DOOR');
  assertEqual(isEntityVisible(door, doc), true, 'Door visible restored');
  assertEqual(isEntityLocked(door, doc), false, 'Door unlocked restored');

  // 1f. Custom Layer Addition & Deletion
  const custom = addCustomLayer(doc, { name: 'E-LIGHTS', color: '#f59e0b', lineweight: 0.18 });
  assert(custom !== null, 'Custom layer created');
  assert(custom.id.startsWith('CUSTOM-') || custom.id === 'E-LIGHTS', 'Custom layer has valid ID');
  assertEqual(doc.layers.length, 11, 'Layer count increased to 11');

  // Built-in layer deletion protection
  let caughtError = false;
  try {
    deleteCustomLayer(doc, 'A-WALL');
  } catch (e) {
    caughtError = true;
  }
  assertEqual(caughtError, true, 'Standard architectural CAD layers cannot be deleted');
  assertEqual(doc.layers.length, 11, 'Layer count unchanged after prevented builtin deletion');

  // Custom layer deletion
  const delCustom = deleteCustomLayer(doc, custom.id);
  assertEqual(delCustom, true, 'Custom layer deleted successfully');
  assertEqual(doc.layers.length, 10, 'Layer count restored to 10');
}

console.log('\n--- 2. Architectural Callouts & Tag Entities ---');
{
  // 2a. createRoomTag
  const rTag = createRoomTag({
    roomId: 'r-101',
    name: 'Living Room Tag',
    roomNumber: '101',
    area: 28.5,
    x: 4.5,
    y: 3.2
  });
  assertEqual(rTag.kind, 'room_tag', 'Room tag kind is room_tag');
  assertEqual(rTag.roomId, 'r-101', 'Room tag linked to roomId');
  assertEqual(rTag.name, 'Living Room Tag', 'Room tag name matches');
  assertEqual(rTag.roomNumber, '101', 'Room tag number matches');
  assertClose(rTag.area, 28.5, 1e-4, 'Room tag area matches');
  assertEqual(rTag.layerId, 'A-ANNO-TAGS', 'Room tag assigned to A-ANNO-TAGS');

  // 2b. createDoorTag
  const dTag = createDoorTag({
    doorId: 'd-01',
    tagText: 'D01',
    x: 2.5,
    y: 0.2
  });
  assertEqual(dTag.kind, 'door_tag', 'Door tag kind is door_tag');
  assertEqual(dTag.doorId, 'd-01', 'Door tag linked to doorId');
  assertEqual(dTag.tagText, 'D01', 'Door tag label is D01');
  assertEqual(dTag.layerId, 'A-ANNO-TAGS', 'Door tag assigned to A-ANNO-TAGS');

  // 2c. createWindowTag
  const wTag = createWindowTag({
    windowId: 'w-01',
    tagText: 'W01',
    x: 3.5,
    y: 0.2
  });
  assertEqual(wTag.kind, 'window_tag', 'Window tag kind is window_tag');
  assertEqual(wTag.windowId, 'w-01', 'Window tag linked to windowId');
  assertEqual(wTag.tagText, 'W01', 'Window tag label is W01');
  assertEqual(wTag.layerId, 'A-ANNO-TAGS', 'Window tag assigned to A-ANNO-TAGS');

  // 2d. createLeaderNote
  const leader = createLeaderNote({
    p1: { x: 5.0, y: 5.0 }, // Target point
    knee: { x: 6.0, y: 6.0 }, // Shoulder break
    p2: { x: 7.5, y: 6.0 }, // Landing / shelf end
    text: '200mm Reinforced Concrete Wall'
  });
  assertEqual(leader.kind, 'leader', 'Leader note kind is leader');
  assertClose(leader.p1.x, 5.0, 1e-4, 'Leader p1.x is 5.0');
  assertClose(leader.knee.x, 6.0, 1e-4, 'Leader knee.x is 6.0');
  assertClose(leader.p2.x, 7.5, 1e-4, 'Leader p2.x is 7.5');
  assertEqual(leader.text, '200mm Reinforced Concrete Wall', 'Leader text matches');
  assertEqual(leader.arrowStyle, 'arrow', 'Leader default arrowStyle is arrow');
  assertEqual(leader.layerId, 'A-ANNO-TEXT', 'Leader note assigned to A-ANNO-TEXT');

  // 2e. createNorthArrow
  const north = createNorthArrow({
    x: 10.0,
    y: 1.5,
    rotation: 15,
    size: 1.2
  });
  assertEqual(north.kind, 'north_arrow', 'North arrow kind is north_arrow');
  assertClose(north.x, 10.0, 1e-4, 'North arrow x is 10.0');
  assertClose(north.y, 1.5, 1e-4, 'North arrow y is 1.5');
  assertEqual(north.rotation, 15, 'North arrow rotation is 15 deg');
  assertEqual(north.size, 1.2, 'North arrow size is 1.2');

  // 2f. autoTagDocument
  const hostWall = createWall({ id: 'w-test', x1: 0, y1: 0, x2: 10, y2: 0, thickness: 0.2 });
  const testEntities = [
    hostWall,
    createRoom({ id: 'rm-1', name: 'Kitchen', x: 0, y: 0, width: 4, depth: 3 }),
    createRoom({ id: 'rm-2', name: 'Bedroom', x: 4, y: 0, width: 4, depth: 4 }),
    createDoor({ id: 'dr-1', wallId: 'w-test', position: 1.5 }),
    createDoor({ id: 'dr-2', wallId: 'w-test', position: 3.5 }),
    createWindow({ id: 'wn-1', wallId: 'w-test', position: 7.0 })
  ];

  const generatedTags = autoTagDocument(testEntities);
  assertEqual(generatedTags.length, 5, 'Generates 2 room tags, 2 door tags, 1 window tag = 5 total');

  const rm1Tag = generatedTags.find(t => t.kind === 'room_tag' && t.roomId === 'rm-1');
  const rm2Tag = generatedTags.find(t => t.kind === 'room_tag' && t.roomId === 'rm-2');
  const dr1Tag = generatedTags.find(t => t.kind === 'door_tag' && t.doorId === 'dr-1');
  const dr2Tag = generatedTags.find(t => t.kind === 'door_tag' && t.doorId === 'dr-2');
  const wn1Tag = generatedTags.find(t => t.kind === 'window_tag' && t.windowId === 'wn-1');

  assert(rm1Tag !== undefined, 'Generated tag for Kitchen');
  assertEqual(rm1Tag.name, 'Kitchen Tag', 'Kitchen tag name matches');
  assert(rm2Tag !== undefined, 'Generated tag for Bedroom');
  assertEqual(dr1Tag.tagText, 'D01', 'First door tag is D01');
  assertEqual(dr2Tag.tagText, 'D02', 'Second door tag is D02');
  assertEqual(wn1Tag.tagText, 'W01', 'First window tag is W01');

  // Test idempotency: autoTagDocument skips already tagged elements
  const mixedEntities = [...testEntities, ...generatedTags];
  const secondPassTags = autoTagDocument(mixedEntities);
  assertEqual(secondPassTags.length, 0, 'Does not re-tag already tagged entities');
}

console.log('\n--- 3. Universal CAD Export & Layer Section Mapping ---');
{
  const doc = {
    layers: cloneDefaultLayers(),
    entities: [
      createWall({ id: 'w1', x1: 0, y1: 0, x2: 6, y2: 0, thickness: 0.2 }),
      createDoor({ id: 'd1', wallId: 'w1', position: 2.0, width: 0.9 }),
      createWindow({ id: 'win1', wallId: 'w1', position: 4.5, width: 1.2 }),
      createRoom({ id: 'r1', name: 'Studio', x: 0, y: 0, width: 6, depth: 4 }),
      createDimension({ id: 'dim1', p1: { x: 0, y: 0 }, p2: { x: 6, y: 0 }, offset: 0.6 }),
      createRoomTag({ id: 'rt1', roomId: 'r1', name: 'Studio Tag', roomNumber: '101', area: 24, x: 3, y: 2 }),
      createDoorTag({ id: 'dt1', doorId: 'd1', tagText: 'D01', x: 2, y: 0 }),
      createWindowTag({ id: 'wt1', windowId: 'win1', tagText: 'W01', x: 4.5, y: 0 }),
      createLeaderNote({ id: 'ln1', p1: { x: 1, y: 0 }, knee: { x: 1.5, y: -0.5 }, p2: { x: 2.5, y: -0.5 }, text: 'Foundation Note' }),
      createNorthArrow({ id: 'na1', x: 7, y: 5, rotation: 0 })
    ]
  };

  // 3a. planToExportGeometry
  const exportGeom = planToExportGeometry(doc);
  assert(exportGeom !== null && typeof exportGeom === 'object', 'Export geometry generated');

  const allItems = [...(exportGeom.lines || []), ...(exportGeom.polygons || []), ...(exportGeom.texts || [])];
  assert(allItems.length > 0, 'Export contains geometry items');

  // Verify all geometry items have layer strings
  const itemsWithoutLayer = allItems.filter(item => !item.layer || typeof item.layer !== 'string');
  assertEqual(itemsWithoutLayer.length, 0, 'Every exported geometry item has a CAD layer assigned');

  // Verify specific layer assignments
  const wallGeoms = allItems.filter(item => item.layer === 'A-WALL');
  const doorGeoms = allItems.filter(item => item.layer === 'A-DOOR');
  const dimGeoms = allItems.filter(item => item.layer === 'A-DIMS');
  const tagGeoms = allItems.filter(item => item.layer === 'A-ANNO-TAGS');
  const textGeoms = allItems.filter(item => item.layer === 'A-ANNO-TEXT');

  assert(wallGeoms.length > 0, 'Export includes A-WALL geometry');
  assert(doorGeoms.length > 0, 'Export includes A-DOOR geometry');
  assert(dimGeoms.length > 0, 'Export includes A-DIMS geometry');
  assert(tagGeoms.length > 0, 'Export includes A-ANNO-TAGS geometry (room, door, window tags)');
  assert(textGeoms.length > 0, 'Export includes A-ANNO-TEXT geometry (leader note, north arrow)');

  // 3b. buildDXF TABLES and LAYER generation
  const dxfEntities = [
    ...exportGeom.polygons.map(p => ({ type: 'polyline', closed: true, layer: p.layer, points: p.points })),
    ...exportGeom.lines.map(l => ({ type: 'line', x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, layer: l.layer })),
    ...exportGeom.texts.map(t => ({ type: 'text', x: t.x, y: t.y, text: t.text, height: t.height || 0.2, layer: t.layer }))
  ];

  const dxfContent = buildDXF(dxfEntities, { title: 'Studio Plan Phase 4' });
  assert(typeof dxfContent === 'string', 'DXF output is string');
  assert(dxfContent.includes('SECTION\n2\nTABLES'), 'DXF contains TABLES section');
  assert(dxfContent.includes('TABLE\n2\nLAYER'), 'DXF contains LAYER table');

  // Verify standard CAD layers are present in DXF LAYER table
  assert(dxfContent.includes('2\nA-WALL'), 'DXF TABLES contains A-WALL layer');
  assert(dxfContent.includes('2\nA-DOOR'), 'DXF TABLES contains A-DOOR layer');
  assert(dxfContent.includes('2\nA-GLAZ'), 'DXF TABLES contains A-GLAZ layer');
  assert(dxfContent.includes('2\nA-DIMS'), 'DXF TABLES contains A-DIMS layer');
  assert(dxfContent.includes('2\nA-ANNO-TAGS'), 'DXF TABLES contains A-ANNO-TAGS layer');
  assert(dxfContent.includes('2\nA-ANNO-TEXT'), 'DXF TABLES contains A-ANNO-TEXT layer');

  // Verify ENTITIES section contains geometry and annotations
  assert(dxfContent.includes('SECTION\n2\nENTITIES'), 'DXF contains ENTITIES section');
  assert(dxfContent.includes('8\nA-WALL'), 'DXF ENTITIES has lines on layer A-WALL');
  assert(dxfContent.includes('8\nA-DIMS'), 'DXF ENTITIES has lines on layer A-DIMS');
  assert(dxfContent.includes('8\nA-ANNO-TAGS'), 'DXF ENTITIES has geometry on layer A-ANNO-TAGS');
  assert(dxfContent.includes('8\nA-ANNO-TEXT'), 'DXF ENTITIES has geometry on layer A-ANNO-TEXT');
  assert(dxfContent.includes('Foundation Note'), 'DXF contains leader note text');
  assert(dxfContent.includes('D01'), 'DXF contains door tag text');
  assert(dxfContent.includes('W01'), 'DXF contains window tag text');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 4 STUDIO TESTS PASSED!\n');
}
