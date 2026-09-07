/**
 * Production Audit Regression Tests (September 2026 audit pass).
 * Each test pins a defect found and fixed during the full-scale audit:
 *   A1 — stair compliance inspector read nonexistent geometry fields (NaN passed as compliant)
 *   A2 — ramp compliance inspector read `ratio` instead of `ratioValue`
 *   A3 — StorageService swallowed quota errors, store reported false-positive saves
 *   A4 — decimal-comma inputs silently multiplied by 10 ("1,5" → 15)
 *   A5 — zoning floor totals summed display-rounded areas
 *   A6 — calculateAtScale 'ft_in' drawingValue was millimeters, not inches
 *   A7 — calculateMultiSegmentRamp accepted rise/slope ≤ 0 → Infinity footprint
 *   A8 — shortcuts: Shift+<letter> collapsed onto the bare letter
 *   A9 — shortcuts: cross-category duplicate combos were accepted
 */

import {
  parseInput
} from '../src/core/parser.js';
import {
  calculateStair
} from '../src/core/stairs.js';
import {
  calculateRamp,
  calculateMultiSegmentRamp,
  RAMP_ERROR_CODES
} from '../src/core/ramps.js';
import {
  inspectStairCompliance,
  inspectRampCompliance
} from '../src/core/building-codes.js';
import {
  calculateAtScale
} from '../src/core/multi-scale.js';
import {
  calculateFloorTotals
} from '../src/core/zoning-schedule.js';
import { StorageService } from '../src/services/storage.js';
import { createProjectStore } from '../src/services/store.js';
import {
  ShortcutsManagerClass,
  normalizeKeyCombo
} from '../src/core/shortcuts-manager.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

function assertEqual(actual, expected, msg) {
  const ok = actual === expected;
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}: ${msg}`);
}

// --- A1. Stair compliance inspector reads the real calculateStair model ---
console.log('\n--- A1. inspectStairCompliance on real calculateStair() output ---');
{
  // 250 mm riser is illegal under every supported code; previously NaN fields
  // made every check report 'pass'.
  const bad = calculateStair({ mode: 'rise_desired_riser', totalRise: 3, desiredRiser: 0.25 });
  const inspection = inspectStairCompliance(bad, 'jnbc');
  assert(inspection.overallStatus !== 'pass', 'Illegal 250 mm riser does NOT report overall pass');
  const riserCheck = inspection.checks.find(c => c.key === 'riser');
  assert(riserCheck && riserCheck.status === 'fail', 'Illegal riser check explicitly fails');
  assert(!String(riserCheck?.value || '').includes('NaN'), 'Riser value renders without NaN');
  assert(Number.isFinite(bad.risers?.heightMeters), 'calculateStair output has risers.heightMeters');

  const good = calculateStair({ mode: 'rise_desired_riser', totalRise: 2.56, desiredRiser: 0.16 });
  const goodInspection = inspectStairCompliance(good, 'jnbc');
  assert(goodInspection.overallStatus === 'pass', 'Genuine compliant stair still passes (legacy fixtures unaffected)');
}

// --- A2. Ramp compliance inspector reads ratioValue ---
console.log('\n--- A2. inspectRampCompliance ratio rendering ---');
{
  const ramp = calculateRamp({ mode: 'rise_run_direct', rise: 0.3, run: 3.6 });
  assert(Number.isFinite(ramp.geometry?.ratioValue), 'calculateRamp geometry exposes ratioValue');
  const inspection = inspectRampCompliance(ramp, 'jnbc');
  const slopeCheck = inspection.checks.find(c => c.key === 'slope');
  assert(slopeCheck && !String(slopeCheck.value).includes('NaN'), `Slope check renders without NaN (got "${slopeCheck?.value}")`);
  assert(inspection.overallStatus === 'pass', 'Exact 1:12 ramp still passes');
}

// --- A3. StorageService surfaces persistence failure to the store ---
console.log('\n--- A3. Storage quota failures are not reported as success ---');
{
  assert(StorageService.setItem('audit-a3', 'x') === true, 'setItem returns true when localStorage persists');

  const failingStorage = {
    getItem: () => null,
    setItem: () => false,           // StorageService contract: false = not persisted
    removeItem: () => {},
    clear: () => {}
  };
  const store = createProjectStore({ storage: failingStorage });
  const saveRes = store.saveProject({
    name: 'Audit Quota Probe',
    entities: [],
    documents: [{ id: 'doc-1', name: 'Plan', type: '2d_plan', entities: [] }]
  });
  assert(saveRes && saveRes.ok === false, 'saveProject reports failure when the adapter cannot persist');
}

// --- A4. Decimal-comma parsing ---
console.log('\n--- A4. Decimal-comma disambiguation in parseInput ---');
{
  assertEqual(parseInput('1,5').value, 1.5, '"1,5" parses as 1.5 (was 15 — 10× error)');
  assertEqual(parseInput('2,40 m').value, 2.4, '"2,40 m" parses as 2.4 m');
  assertEqual(parseInput('1,234.5').value, 1234.5, '"1,234.5" still strips thousands commas');
  assertEqual(parseInput('1,234').value, 1234, '"1,234" follows English thousands convention');
  assertEqual(parseInput('1.234,5').value, 1234.5, '"1.234,5" European mixed notation parses correctly');
  assertEqual(parseInput('12\'6"').value, 12 * 12 + 6, 'Feet-inches parsing unaffected');
  assertEqual(parseInput(3.5).value, 3.5, 'Numeric passthrough unaffected');
  assertEqual(parseInput('15').value, 15, 'Plain decimals unaffected');
}

// --- A5. Floor totals sum raw areas ---
console.log('\n--- A5. Zoning totals avoid rounded-accumulation error ---');
{
  const rooms = [];
  for (let i = 0; i < 60; i++) {
    rooms.push({ kind: 'room', id: `r${i}`, name: `R${i}`, width: 10, depth: 1 });
  }
  const totals = calculateFloorTotals({ entities: rooms });
  assertEqual(totals.netInternalArea, 600, '60 rooms of exactly 10 m² total exactly 600 m²');
}

// --- A6. calculateAtScale ft_in drawing value is inches ---
console.log('\n--- A6. calculateAtScale drawingUnit ft_in consistency ---');
{
  const r = calculateAtScale(2.4, 50, { displayUnit: 'm', drawingUnit: 'ft_in' });
  const inches = r.drawingMeters / 0.0254;
  assert(Math.abs(r.drawingValue - inches) < 1e-9, 'drawingValue is in inches when drawingUnit is ft_in');
  assert(r.formatted.includes('"') || /\d/.test(r.formatted), 'formatted remains feet-inches text');
}

// --- A7. Multi-segment ramp validation ---
console.log('\n--- A7. calculateMultiSegmentRamp rejects invalid inputs ---');
{
  let threw = null;
  try { calculateMultiSegmentRamp(1.5, 0); } catch (e) { threw = e; }
  assert(threw && threw.code === RAMP_ERROR_CODES.INVALID_SLOPE, 'Zero slope throws INVALID_SLOPE instead of producing Infinity');

  threw = null;
  try { calculateMultiSegmentRamp(0, 8.33); } catch (e) { threw = e; }
  assert(threw && threw.code === RAMP_ERROR_CODES.INVALID_RISE, 'Zero rise throws INVALID_RISE');

  const ok = calculateMultiSegmentRamp(1.5, 8.33);
  assert(Number.isFinite(ok.straight?.footprintAreaSqMeters), 'Valid inputs still produce finite footprints');
}

// --- A8. Shift modifier preserved for letters ---
console.log('\n--- A8. normalizeKeyCombo keeps Shift for uppercase letters ---');
{
  const event = { key: 'M', ctrlKey: false, altKey: false, shiftKey: true, metaKey: false };
  assertEqual(normalizeKeyCombo(event), 'shift+m', 'Shift+M normalizes to "shift+m" (was "m")');
  const plain = { key: 'm', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
  assertEqual(normalizeKeyCombo(plain), 'm', 'Plain m stays "m" — distinct from Shift+M');
  const punctuation = { key: '?', ctrlKey: false, altKey: false, shiftKey: true, metaKey: false };
  assertEqual(normalizeKeyCombo(punctuation), '?', 'Shifted punctuation keeps its existing shape');
}

// --- A9. Cross-category shortcut conflicts rejected ---
console.log('\n--- A9. bindShortcut rejects duplicates across categories ---');
{
  const sm = new ShortcutsManagerClass();
  const defaultWall = sm.getKeyForAction('tool_wall');
  const studioOwner = sm.shortcuts.find(s => s.key === defaultWall && s.id !== 'tool_wall');
  if (studioOwner) {
    // If a cross-category default duplicate existed this would be a A9 finding;
    // defaults are currently unique, so simulate by binding first.
  }
  const res1 = sm.bindShortcut('tool_wall', 'k');
  assert(res1.success, 'Binds tool_wall to K');
  const res2 = sm.bindShortcut('tool_measure', 'k');
  assert(!res2.success, 'Reusing K for another action is rejected (previously allowed cross-category)');
  sm.resetAllShortcuts();
  assertEqual(sm.getKeyForAction('tool_wall'), 'w', 'resetAllShortcuts restores defaults after A9 probing');
}

console.log(`\n========================================`);
console.log(`Audit Regression Test Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
