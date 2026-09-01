/**
 * Architecture Helping Hand - Unit Conversion System Tests
 */

import { UNITS, AREA_UNITS, VOLUME_UNITS, convertUnit, getUnit } from '../src/core/units.js';

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

function approxEqual(a, b, epsilon = 0.000001) {
  return Math.abs(a - b) < epsilon;
}

console.log('🧪 Running tests/units.test.js...');

// 1. Metric Length Conversions
{
  assert(approxEqual(convertUnit(1000, 'mm', 'm'), 1.0), '1000 mm = 1.0 m');
  assert(approxEqual(convertUnit(100, 'cm', 'm'), 1.0), '100 cm = 1.0 m');
  assert(approxEqual(convertUnit(10, 'dm', 'm'), 1.0), '10 dm = 1.0 m');
  assert(approxEqual(convertUnit(1, 'km', 'm'), 1000.0), '1 km = 1000 m');
}

// 2. Imperial Length Conversions
{
  assert(approxEqual(convertUnit(12, 'in', 'ft'), 1.0), '12 in = 1.0 ft');
  assert(approxEqual(convertUnit(3, 'ft', 'yd'), 1.0), '3 ft = 1.0 yd');
  assert(approxEqual(convertUnit(5280, 'ft', 'mi'), 1.0), '5280 ft = 1.0 mi');
  assert(approxEqual(convertUnit(1, 'in', 'cm'), 2.54), '1 in = 2.54 cm');
  assert(approxEqual(convertUnit(1, 'm', 'ft'), 3.280839895), '1 m = 3.28084 ft');
}

// 3. Area Conversions
{
  assert(approxEqual(convertUnit(10000, 'cm2', 'm2'), 1.0), '10,000 cm² = 1.0 m²');
  assert(approxEqual(convertUnit(1, 'ha', 'm2'), 10000.0), '1 ha = 10,000 m²');
  assert(approxEqual(convertUnit(1, 'sq_ft', 'sq_in'), 144.0), '1 sq ft = 144 sq in');
}

// 4. Volume Conversions
{
  assert(approxEqual(convertUnit(1000, 'liters', 'm3'), 1.0), '1000 L = 1.0 m³');
  assert(approxEqual(convertUnit(1000000, 'cm3', 'm3'), 1.0), '1,000,000 cm³ = 1.0 m³');
}

// 5. Incompatible Dimension Safety
{
  let errorCaught = false;
  try {
    convertUnit(10, 'cm', 'm2');
  } catch (e) {
    errorCaught = true;
  }
  assert(errorCaught, 'Throws error when converting length to area', errorCaught);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
