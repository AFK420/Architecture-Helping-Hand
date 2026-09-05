/**
 * Architecture Helping Hand - Customizable Shortcuts Test Suite
 * Tests architectural CAD defaults, rebinding, conflict detection,
 * formatting, event matching, and persistence.
 */

import { ShortcutsManagerClass, normalizeKeyCombo, formatDisplayKey, DEFAULT_SHORTCUTS } from '../src/core/shortcuts-manager.js';

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
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
    failed++;
  }
}

console.log('🧪 Running tests/custom-shortcuts.test.js...');

// --- 1. Architectural CAD Defaults ---
console.log('\n--- 1. Architectural CAD Defaults ---');
{
  const sm = new ShortcutsManagerClass();
  const wall = sm.getShortcut('tool_wall');
  assertEqual(wall.defaultKey, 'w', 'Wall tool defaults to "W" (Revit / AutoCAD WA standard)');

  const room = sm.getShortcut('tool_room');
  assertEqual(room.defaultKey, 'r', 'Room tool defaults to "R" (Rectangle / Space standard)');

  const select = sm.getShortcut('tool_select');
  assertEqual(select.defaultKey, 'v', 'Select tool defaults to "V" (Pointer / Modify tool standard)');

  const measure = sm.getShortcut('tool_measure');
  assertEqual(measure.defaultKey, 'm', 'Measure tool defaults to "M" (AutoCAD DIST/MEASURE standard)');

  const dimension = sm.getShortcut('tool_dimension');
  assertEqual(dimension.defaultKey, 'd', 'Dimension tool defaults to "D" (AutoCAD DIM / Revit DI standard)');

  const stair = sm.getShortcut('tool_stair');
  assertEqual(stair.defaultKey, 't', 'Stair tool defaults to "T" (Tread/Stair standard)');

  const ramp = sm.getShortcut('tool_ramp');
  assertEqual(ramp.defaultKey, 'p', 'Ramp tool defaults to "P" (Path/Ramp standard)');

  const grid = sm.getShortcut('plan_grid');
  assertEqual(grid.defaultKey, 'g', 'Grid snap defaults to "G" (AutoCAD GRID toggle standard)');

  const snap = sm.getShortcut('plan_snap');
  assertEqual(snap.defaultKey, 's', 'Snapping toggle defaults to "S"');

  const duplicate = sm.getShortcut('plan_duplicate');
  assertEqual(duplicate.defaultKey, 'ctrl+d', 'Duplicate entity defaults to "Ctrl+D"');

  const palette = sm.getShortcut('cmd_palette');
  assertEqual(palette.defaultKey, 'ctrl+k', 'Command palette defaults to "Ctrl+K"');
}

// --- 2. Key Normalization & Display Formatting ---
console.log('\n--- 2. Key Normalization & Formatting ---');
{
  assertEqual(normalizeKeyCombo('Ctrl + D'), 'ctrl+d', 'Normalizes "Ctrl + D" string');
  assertEqual(normalizeKeyCombo('⌘D'), 'ctrl+d', 'Normalizes Mac command string to ctrl+d');
  assertEqual(normalizeKeyCombo('Esc'), 'escape', 'Normalizes "Esc" to "escape"');
  assertEqual(normalizeKeyCombo('Del'), 'delete', 'Normalizes "Del" to "delete"');

  const keyEvent = { ctrlKey: true, key: 'd' };
  assertEqual(normalizeKeyCombo(keyEvent), 'ctrl+d', 'Normalizes KeyboardEvent with Ctrl+D');

  const soloModifier = { ctrlKey: true, key: 'Control' };
  assertEqual(normalizeKeyCombo(soloModifier), '', 'Solo modifier yields empty string');

  assertEqual(formatDisplayKey('ctrl+d'), 'Ctrl + D', 'Formats ctrl+d as "Ctrl + D"');
  assertEqual(formatDisplayKey('escape'), 'Esc', 'Formats escape as "Esc"');
  assertEqual(formatDisplayKey('w'), 'W', 'Formats single letter as uppercase');
}

// --- 3. Rebinding & Conflict Detection ---
console.log('\n--- 3. Rebinding & Conflict Detection ---');
{
  const sm = new ShortcutsManagerClass();

  // Custom rebind
  const res1 = sm.bindShortcut('tool_wall', 'x');
  assert(res1.success, 'Successfully rebinds wall tool to "X"');
  assertEqual(sm.getKeyForAction('tool_wall'), 'x', 'Wall tool now bound to "X"');
  assert(sm.getShortcut('tool_wall').isCustom, 'Wall tool marked as isCustom');

  // Conflict detection: Attempt to bind room tool to "X" (already used by wall)
  const res2 = sm.bindShortcut('tool_room', 'x');
  assert(!res2.success, 'Conflict detected when binding room tool to "X"');
  assert(res2.conflict && res2.conflict.id === 'tool_wall', 'Conflict reports colliding action ID');
  assertEqual(sm.getKeyForAction('tool_room'), 'r', 'Room tool retains its previous binding');

  // Force bind resolves collision
  const res3 = sm.forceBindShortcut('tool_room', 'x');
  assert(res3.success, 'forceBindShortcut succeeds');
  assertEqual(sm.getKeyForAction('tool_room'), 'x', 'Room tool now has "X"');

  // Reset single shortcut
  sm.resetShortcut('tool_wall');
  assertEqual(sm.getKeyForAction('tool_wall'), 'w', 'Wall tool reset to default "W"');

  // Reset all shortcuts
  sm.resetAllShortcuts();
  assertEqual(sm.getKeyForAction('tool_room'), 'r', 'All shortcuts reset to defaults');
  assert(!sm.getShortcut('tool_room').isCustom, 'isCustom is false after resetAll');
}

// --- 4. Persistence Round-Trip ---
console.log('\n--- 4. Persistence Round-Trip ---');
{
  const mockStorage = new Map();
  const storageAdapter = {
    getItem: k => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: k => mockStorage.delete(k)
  };

  const sm1 = new ShortcutsManagerClass();
  sm1.setStorage(storageAdapter);
  sm1.bindShortcut('tool_wall', 'e');
  sm1.bindShortcut('tool_measure', 'j');

  // Load from second instance
  const sm2 = new ShortcutsManagerClass();
  sm2.setStorage(storageAdapter);
  assertEqual(sm2.getKeyForAction('tool_wall'), 'e', 'Custom wall binding survived persistence');
  assertEqual(sm2.getKeyForAction('tool_measure'), 'j', 'Custom measure binding survived persistence');
  assertEqual(sm2.getKeyForAction('tool_room'), 'r', 'Unmodified shortcut keeps default');
}

// --- 5. KeyboardEvent Matching ---
console.log('\n--- 5. KeyboardEvent Matching ---');
{
  const sm = new ShortcutsManagerClass();

  assert(sm.matchesEvent('tool_wall', { key: 'w' }), 'matchesEvent identifies "W" for wall');
  assert(sm.matchesEvent('tool_wall', { key: 'W' }), 'matchesEvent handles uppercase "W"');
  assert(!sm.matchesEvent('tool_wall', { key: 'r' }), 'matchesEvent rejects mismatched key');
  assert(sm.matchesEvent('plan_duplicate', { ctrlKey: true, key: 'd' }), 'matchesEvent identifies Ctrl+D');
  assert(!sm.matchesEvent('plan_duplicate', { ctrlKey: false, key: 'd' }), 'matchesEvent rejects D without Ctrl');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
