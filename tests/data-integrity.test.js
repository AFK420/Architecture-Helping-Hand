/**
 * Architecture Helping Hand - Data Integrity Tests
 */

import { SCALE_PRESETS, REAL_WORLD_REFERENCES } from '../src/core/presets.js';
import { FURNITURE_DATABASE } from '../src/core/furniture.js';
import { UNITS, AREA_UNITS, VOLUME_UNITS } from '../src/core/units.js';

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

console.log('🧪 Running tests/data-integrity.test.js...');

// 1. Scale Presets Integrity
{
  const presetIds = new Set();
  let uniqueIds = true;
  let validRatios = true;
  const validCategories = new Set(['detail', 'architectural', 'urban', 'imperial']);

  for (const preset of SCALE_PRESETS) {
    if (presetIds.has(preset.id)) {
      uniqueIds = false;
      break;
    }
    presetIds.add(preset.id);

    if (typeof preset.ratio !== 'number' || preset.ratio <= 0 || !isFinite(preset.ratio)) {
      validRatios = false;
    }

    if (!validCategories.has(preset.category)) {
      assert(false, `Preset ${preset.id} has invalid category "${preset.category}"`);
    }
  }

  assert(uniqueIds, `All ${SCALE_PRESETS.length} scale preset IDs are strictly unique`);
  assert(validRatios, 'All scale preset ratios are positive finite numbers');
}

// 2. Furniture Database Integrity
{
  const furnIds = new Set();
  let uniqueFurnIds = true;
  let validDimensions = true;
  const validFurnCategories = new Set(['living', 'bedroom', 'dining', 'kitchen', 'bathroom', 'office', 'doors']);

  for (const item of FURNITURE_DATABASE) {
    if (furnIds.has(item.id)) {
      uniqueFurnIds = false;
      break;
    }
    furnIds.add(item.id);

    if (typeof item.wCm !== 'number' || item.wCm <= 0 || !isFinite(item.wCm) ||
        typeof item.dCm !== 'number' || item.dCm <= 0 || !isFinite(item.dCm)) {
      validDimensions = false;
    }

    if (!validFurnCategories.has(item.category)) {
      assert(false, `Furniture item ${item.id} has invalid category "${item.category}"`);
    }
  }

  assert(uniqueFurnIds, `All ${FURNITURE_DATABASE.length} furniture items have unique IDs`);
  assert(validDimensions, 'All furniture items have positive finite Width and Depth dimensions');
}

// 3. Real World References Integrity
{
  let rangesContiguous = true;
  for (let i = 0; i < REAL_WORLD_REFERENCES.length; i++) {
    const ref = REAL_WORLD_REFERENCES[i];
    if (ref.minMeters >= ref.maxMeters || ref.minMeters < 0) {
      rangesContiguous = false;
    }
    if (i > 0) {
      if (ref.minMeters !== REAL_WORLD_REFERENCES[i - 1].maxMeters) {
        rangesContiguous = false;
      }
    }
  }
  assert(rangesContiguous, 'Real-world reference ranges are contiguous and non-overlapping from 0m to Infinity');
}

// 4. Units Definitions Integrity
{
  const lengthKeys = Object.keys(UNITS);
  const areaKeys = Object.keys(AREA_UNITS);
  const volumeKeys = Object.keys(VOLUME_UNITS);

  assert(lengthKeys.length >= 9, `Length units catalog has ${lengthKeys.length} units`);
  assert(areaKeys.length >= 9, `Area units catalog has ${areaKeys.length} units`);
  assert(volumeKeys.length >= 7, `Volume units catalog has ${volumeKeys.length} units`);

  let validFactors = true;
  for (const u of Object.values(UNITS)) {
    if (typeof u.toMeters !== 'number' || u.toMeters <= 0) validFactors = false;
  }
  for (const u of Object.values(AREA_UNITS)) {
    if (typeof u.toSqMeters !== 'number' || u.toSqMeters <= 0) validFactors = false;
  }
  for (const u of Object.values(VOLUME_UNITS)) {
    if (typeof u.toCuMeters !== 'number' || u.toCuMeters <= 0) validFactors = false;
  }
  assert(validFactors, 'All unit conversion factors are positive numbers');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
