/**
 * Architecture Helping Hand - Unit Conversion System Tests
 */

import { UNITS, AREA_UNITS, VOLUME_UNITS, convertUnit, getUnit, requireUnit } from '../src/core/units.js';

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

// 3. Round-Trip Conversions (Metric <-> Imperial)
{
  const origMeters = 25.4;
  const inFeet = convertUnit(origMeters, 'm', 'ft');
  const backToMeters = convertUnit(inFeet, 'ft', 'm');
  assert(approxEqual(origMeters, backToMeters), 'Round-trip meters -> feet -> meters preserves value within 1e-6 epsilon');

  const origInches = 144;
  const inCm = convertUnit(origInches, 'in', 'cm');
  const backToInches = convertUnit(inCm, 'cm', 'in');
  assert(approxEqual(origInches, backToInches), 'Round-trip inches -> cm -> inches preserves value within 1e-6 epsilon');
}

// 4. Area Conversions
{
  assert(approxEqual(convertUnit(10000, 'cm2', 'm2'), 1.0), '10,000 cm² = 1.0 m²');
  assert(approxEqual(convertUnit(1, 'ha', 'm2'), 10000.0), '1 ha = 10,000 m²');
  assert(approxEqual(convertUnit(1, 'sq_ft', 'sq_in'), 144.0), '1 sq ft = 144 sq in');
  assert(approxEqual(convertUnit(1, 'km2', 'ha'), 100.0), '1 km² = 100 ha');
}

// 5. Volume Conversions
{
  assert(approxEqual(convertUnit(1000, 'liters', 'm3'), 1.0), '1000 L = 1.0 m³');
  assert(approxEqual(convertUnit(1000000, 'cm3', 'm3'), 1.0), '1,000,000 cm³ = 1.0 m³');
  assert(approxEqual(convertUnit(27, 'cu_ft', 'cu_yd'), 1.0), '27 cu ft = 1.0 cu yd');
}

// 6. Unit Validation & Invalid Unit Errors (No Silent Fallback)
{
  const invalidUnits = ['xyz', 'foobar', 'CMX', 'unknown', null, undefined];
  for (const bad of invalidUnits) {
    let threw = false;
    try {
      requireUnit(bad);
    } catch (e) {
      threw = true;
    }
    assert(threw, `requireUnit rejects invalid unit ${JSON.stringify(bad)}`);
  }

  let dimMismatchThrew = false;
  try {
    requireUnit('m', 'area');
  } catch (e) {
    dimMismatchThrew = true;
  }
  assert(dimMismatchThrew, 'requireUnit throws when unit dimension mismatches expected dimension');

  let convertMismatchThrew = false;
  try {
    convertUnit(10, 'cm', 'm2');
  } catch (e) {
    convertMismatchThrew = true;
  }
  assert(convertMismatchThrew, 'convertUnit throws when converting between incompatible dimensions (length to area)');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
