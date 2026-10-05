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

// --- 1. Companion defaults ---
{
 const sm=new ShortcutsManagerClass();
 for(const [id,key] of [['cad_clipboard','c'],['batch_cad','b'],['quick_dim','q'],['cmd_palette','ctrl+k']])assertEqual(sm.getShortcut(id).defaultKey,key,id+' default');
 assert(!DEFAULT_SHORTCUTS.some(s=>s.category==='canvas'),'Canvas shortcuts are removed');
 for(const id of ['project','tools','cad','documents','ai','settings'])assert(sm.getShortcut('ws_'+id),'Workspace shortcut '+id);
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
  const res1 = sm.bindShortcut('cad_clipboard', 'x');
  assert(res1.success, 'Successfully rebinds CAD clipboard to "X"');
  assertEqual(sm.getKeyForAction('cad_clipboard'), 'x', 'CAD clipboard now bound to "X"');
  assert(sm.getShortcut('cad_clipboard').isCustom, 'CAD clipboard marked as isCustom');

  // Conflict detection: Attempt to bind Batch CAD to "X" (already used by wall)
  const res2 = sm.bindShortcut('batch_cad', 'x');
  assert(!res2.success, 'Conflict detected when binding Batch CAD to "X"');
  assert(res2.conflict && res2.conflict.id === 'cad_clipboard', 'Conflict reports colliding action ID');
  assertEqual(sm.getKeyForAction('batch_cad'), 'b', 'Batch CAD retains its previous binding');

  // Force bind resolves collision
  const res3 = sm.forceBindShortcut('batch_cad', 'x');
  assert(res3.success, 'forceBindShortcut succeeds');
  assertEqual(sm.getKeyForAction('batch_cad'), 'x', 'Batch CAD now has "X"');

  // Reset single shortcut
  sm.resetShortcut('cad_clipboard');
  assertEqual(sm.getKeyForAction('cad_clipboard'), 'c', 'CAD clipboard reset to default "W"');

  // Reset all shortcuts
  sm.resetAllShortcuts();
  assertEqual(sm.getKeyForAction('batch_cad'), 'b', 'All shortcuts reset to defaults');
  assert(!sm.getShortcut('batch_cad').isCustom, 'isCustom is false after resetAll');
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
  sm1.bindShortcut('cad_clipboard', 'e');
  sm1.bindShortcut('quick_dim', 'j');

  // Load from second instance
  const sm2 = new ShortcutsManagerClass();
  sm2.setStorage(storageAdapter);
  assertEqual(sm2.getKeyForAction('cad_clipboard'), 'e', 'Custom wall binding survived persistence');
  assertEqual(sm2.getKeyForAction('quick_dim'), 'j', 'Custom measure binding survived persistence');
  assertEqual(sm2.getKeyForAction('batch_cad'), 'b', 'Unmodified shortcut keeps default');
}

// --- 5. KeyboardEvent Matching ---
console.log('\n--- 5. KeyboardEvent Matching ---');
{
  const sm = new ShortcutsManagerClass();

  assert(sm.matchesEvent('cad_clipboard', { key: 'c' }), 'matchesEvent identifies "W" for wall');
  assert(sm.matchesEvent('cad_clipboard', { key: 'C' }), 'matchesEvent handles uppercase "W"');
  assert(!sm.matchesEvent('cad_clipboard', { key: 'r' }), 'matchesEvent rejects mismatched key');
  assert(sm.matchesEvent('cmd_palette', { ctrlKey: true, key: 'k' }), 'matchesEvent identifies Ctrl+K');
  assert(!sm.matchesEvent('cmd_palette', { ctrlKey: false, key: 'k' }), 'matchesEvent rejects D without Ctrl');
}

// --- 7. Legacy binding migration (defaults win, no duplicates) ---
console.log('\n--- 7. Legacy binding migration on load ---');
{
  function makeManager(stored) {
    const store = {
      data: JSON.stringify(stored),
      getItem: () => store.data,
      setItem: (k, v) => { store.data = v; },
      removeItem: () => { store.data = ''; }
    };
    const sm = new ShortcutsManagerClass();
    sm.setStorage(store);
    return { sm, store };
  }

  // Legacy duplicate: two customs collapsed onto the same key
  const c1 = makeManager({ batch_cad: 'q', quick_dim: 'q' });
  assertEqual(c1.sm.getKeyForAction('batch_cad'), 'b', 'Colliding custom resets to its default (room)');
  assertEqual(c1.sm.getKeyForAction('quick_dim'), 'q', 'Custom matching its default stays (measure)');
  assert(!c1.store.data.includes('batch_cad'), 'Discarded binding removed from persisted storage');

  // Custom colliding with another action's default is discarded
  const c2 = makeManager({ batch_cad: 'c' });
  assertEqual(c2.sm.getKeyForAction('batch_cad'), 'b', 'Custom that hijacks another default is discarded');

  // Collision-free custom survives
  const c3 = makeManager({ quick_dim: 'shift+m' });
  assertEqual(c3.sm.getKeyForAction('quick_dim'), 'shift+m', 'Collision-free custom binding is preserved');

  // Loaded set never contains duplicates
  const keys = c3.sm.getAllShortcuts().map(s => s.key);
  assert(keys.length === new Set(keys).size, 'Loaded bindings are duplicate-free');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
