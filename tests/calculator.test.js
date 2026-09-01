/**
 * Architecture Helping Hand - Calculator Engine Unit & Regression Tests
 */

import {
  scaleDimension,
  drawingToReal,
  realToDrawing,
  rescaleDrawing,
  detectScale,
  scaleArea,
  scaleVolume,
  getAllUnitEquivalents,
  requireFiniteNumber
} from '../src/core/calculator.js';

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

console.log('🧪 Running tests/calculator.test.js...');

// 1. Drawing to Real-World Tests (Various Scales & Units)
{
  const r1 = drawingToReal({ drawingVal: 10, drawingUnitKey: 'cm', scaleRatio: 50, realUnitKey: 'm' });
  assert(approxEqual(r1.realValue, 5.0), '10 cm @ 1:50 = 5.0 m', r1.realValue);

  const r2 = drawingToReal({ drawingVal: 25, drawingUnitKey: 'mm', scaleRatio: 100, realUnitKey: 'm' });
  assert(approxEqual(r2.realValue, 2.5), '25 mm @ 1:100 = 2.5 m', r2.realValue);

  const r3 = drawingToReal({ drawingVal: 15, drawingUnitKey: 'cm', scaleRatio: 20, realUnitKey: 'm' });
  assert(approxEqual(r3.realValue, 3.0), '15 cm @ 1:20 = 3.0 m', r3.realValue);

  const r4 = drawingToReal({ drawingVal: 24, drawingUnitKey: 'cm', scaleRatio: 5000, realUnitKey: 'km' });
  assert(approxEqual(r4.realValue, 1.2), '24 cm @ 1:5000 = 1.2 km', r4.realValue);

  const r5 = drawingToReal({ drawingVal: 3, drawingUnitKey: 'in', scaleRatio: 48, realUnitKey: 'ft' });
  assert(approxEqual(r5.realValue, 12.0), '3 in @ 1:48 (1/4"=1\') = 12 ft', r5.realValue);

  const r6 = drawingToReal({ drawingVal: 50, drawingUnitKey: 'mm', scaleRatio: 1, realUnitKey: 'mm' });
  assert(approxEqual(r6.realValue, 50.0), '50 mm @ 1:1 = 50.0 mm', r6.realValue);

  const r7 = drawingToReal({ drawingVal: 20, drawingUnitKey: 'cm', scaleRatio: 2, realUnitKey: 'cm' });
  assert(approxEqual(r7.realValue, 40.0), '20 cm @ 1:2 = 40.0 cm', r7.realValue);

  const r8 = drawingToReal({ drawingVal: 10, drawingUnitKey: 'cm', scaleRatio: 500, realUnitKey: 'm' });
  assert(approxEqual(r8.realValue, 50.0), '10 cm @ 1:500 = 50.0 m', r8.realValue);

  const r9 = drawingToReal({ drawingVal: 10, drawingUnitKey: 'cm', scaleRatio: 10000, realUnitKey: 'km' });
  assert(approxEqual(r9.realValue, 1.0), '10 cm @ 1:10000 = 1.0 km', r9.realValue);
}

// 2. Real-World to Drawing Tests & Round-Trips
{
  const r1 = realToDrawing({ realVal: 5.0, realUnitKey: 'm', scaleRatio: 50, drawingUnitKey: 'cm' });
  assert(approxEqual(r1.drawingValue, 10.0), '5.0 m @ 1:50 = 10.0 cm', r1.drawingValue);

  const r2 = realToDrawing({ realVal: 17.5, realUnitKey: 'm', scaleRatio: 100, drawingUnitKey: 'mm' });
  assert(approxEqual(r2.drawingValue, 175.0), '17.5 m @ 1:100 = 175.0 mm', r2.drawingValue);

  const r3 = realToDrawing({ realVal: 24.0, realUnitKey: 'ft', scaleRatio: 48, drawingUnitKey: 'in' });
  assert(approxEqual(r3.drawingValue, 6.0), '24 ft @ 1:48 = 6.0 in', r3.drawingValue);

  // Round-trip: Drawing -> Real -> Drawing
  const originalDrawing = 14.75;
  const computedReal = drawingToReal({ drawingVal: originalDrawing, drawingUnitKey: 'cm', scaleRatio: 50, realUnitKey: 'm' }).realValue;
  const backToDrawing = realToDrawing({ realVal: computedReal, realUnitKey: 'm', scaleRatio: 50, drawingUnitKey: 'cm' }).drawingValue;
  assert(approxEqual(originalDrawing, backToDrawing), 'Round-trip drawing (14.75cm) -> real -> drawing preserves dimension', backToDrawing);
}

// 3. Rescaling Tests (Scale A -> Scale B)
{
  const r1 = rescaleDrawing({ originalVal: 12, originalUnitKey: 'cm', originalRatio: 50, targetRatio: 200, targetUnitKey: 'cm' });
  assert(approxEqual(r1.targetValue, 3.0), '12 cm @ 1:50 -> 1:200 = 3.0 cm', r1.targetValue);
  assert(approxEqual(r1.factor, 0.25), 'Magnification factor is 0.25 (25%)', r1.factor);

  const r2 = rescaleDrawing({ originalVal: 5, originalUnitKey: 'cm', originalRatio: 100, targetRatio: 20, targetUnitKey: 'cm' });
  assert(approxEqual(r2.targetValue, 25.0), '5 cm @ 1:100 -> 1:20 = 25.0 cm', r2.targetValue);
  assert(approxEqual(r2.factor, 5.0), 'Magnification factor is 5.0 (500%)', r2.factor);
}

// 4. Scale Detection Tests
{
  const r1 = detectScale({ paperVal: 4.5, paperUnitKey: 'cm', realVal: 9.0, realUnitKey: 'm' });
  assert(approxEqual(r1.ratio, 200), '4.5 cm vs 9.0 m detects scale ratio 200', r1.ratio);
  assert(r1.closestPreset?.id === '1:200', 'Closest preset identified as 1:200', r1.closestPreset?.id);
  assert(r1.isExactMatch === true, 'Exact match flagged as true', r1.isExactMatch);

  const r2 = detectScale({ paperVal: 10, paperUnitKey: 'cm', realVal: 5.0, realUnitKey: 'm' });
  assert(approxEqual(r2.ratio, 50), '10 cm vs 5.0 m detects scale ratio 50', r2.ratio);
  assert(r2.closestPreset?.id === '1:50', 'Closest preset identified as 1:50', r2.closestPreset?.id);

  // Invalid scale detection semantic test: returns ratio: null (NOT 0)
  const rInvalid1 = detectScale({ paperVal: 0, paperUnitKey: 'cm', realVal: 0, realUnitKey: 'm' });
  assert(rInvalid1.ratio === null && rInvalid1.ratioString === 'N/A' && rInvalid1.closestPreset === null, 'detectScale returns ratio: null on zero dimensions', rInvalid1);

  const rInvalid2 = detectScale({ paperVal: -5, paperUnitKey: 'cm', realVal: 10, realUnitKey: 'm' });
  assert(rInvalid2.ratio === null && rInvalid2.ratioString === 'N/A', 'detectScale returns ratio: null on negative paper dimension', rInvalid2);
}

// 5. Area & Volume Scaler Tests (Bidirectional: Drawing <-> Real)
{
  // Area Drawing -> Real
  const a1 = scaleArea({ areaVal: 4, inputUnitKey: 'cm2', scaleRatio: 100, outputUnitKey: 'm2', isDrawingToReal: true });
  assert(approxEqual(a1.resultValue, 4.0), '4 cm² @ 1:100 (Drawing->Real) = 4.0 m²', a1.resultValue);

  // Area Real -> Drawing
  const a2 = scaleArea({ areaVal: 4, inputUnitKey: 'm2', scaleRatio: 100, outputUnitKey: 'cm2', isDrawingToReal: false });
  assert(approxEqual(a2.resultValue, 4.0), '4 m² @ 1:100 (Real->Drawing) = 4.0 cm²', a2.resultValue);

  // Volume Drawing -> Real
  const v1 = scaleVolume({ volumeVal: 1000, inputUnitKey: 'cm3', scaleRatio: 50, outputUnitKey: 'm3', isDrawingToReal: true });
  assert(approxEqual(v1.resultValue, 125.0), '1000 cm³ @ 1:50 (Drawing->Real) = 125.0 m³', v1.resultValue);

  // Volume Real -> Drawing
  const v2 = scaleVolume({ volumeVal: 125, inputUnitKey: 'm3', scaleRatio: 50, outputUnitKey: 'cm3', isDrawingToReal: false });
  assert(approxEqual(v2.resultValue, 1000.0), '125 m³ @ 1:50 (Real->Drawing) = 1000.0 cm³', v2.resultValue);
}

// 6. Zero Values & Precision Boundary Tests
{
  const rZero = drawingToReal({ drawingVal: 0, drawingUnitKey: 'cm', scaleRatio: 50, realUnitKey: 'm' });
  assert(rZero.realValue === 0, 'Zero drawing dimension produces zero real dimension', rZero.realValue);

  const rLarge = drawingToReal({ drawingVal: 1000, drawingUnitKey: 'm', scaleRatio: 10000, realUnitKey: 'km' });
  assert(approxEqual(rLarge.realValue, 10000), '1000m @ 1:10000 = 10,000 km', rLarge.realValue);

  const rSmall = drawingToReal({ drawingVal: 0.1, drawingUnitKey: 'mm', scaleRatio: 1, realUnitKey: 'mm' });
  assert(approxEqual(rSmall.realValue, 0.1), '0.1mm @ 1:1 = 0.1 mm', rSmall.realValue);

  // Floating point test (0.1 + 0.2 precision)
  const rFloat = drawingToReal({ drawingVal: 0.3, drawingUnitKey: 'm', scaleRatio: 1, realUnitKey: 'm' });
  assert(approxEqual(rFloat.realValue, 0.3), 'Floating point 0.3m @ 1:1 = 0.3m', rFloat.realValue);
}

// 7. Strict Numeric Contracts & Error Handling
{
  // requireFiniteNumber tests
  assert(requireFiniteNumber(42) === 42, 'requireFiniteNumber accepts valid numbers');

  let stringThrew = false;
  try {
    requireFiniteNumber('10');
  } catch (e) {
    stringThrew = e instanceof TypeError;
  }
  assert(stringThrew, 'requireFiniteNumber rejects string "10" with TypeError');

  let nanThrew = false;
  try {
    requireFiniteNumber(NaN);
  } catch (e) {
    nanThrew = e instanceof TypeError;
  }
  assert(nanThrew, 'requireFiniteNumber rejects NaN with TypeError');

  let infThrew = false;
  try {
    requireFiniteNumber(Infinity);
  } catch (e) {
    infThrew = e instanceof TypeError;
  }
  assert(infThrew, 'requireFiniteNumber rejects Infinity with TypeError');

  // scaleDimension with non-numeric value
  let scaleStringThrew = false;
  try {
    scaleDimension({ value: '10', unitKey: 'cm', ratio: 50 });
  } catch (e) {
    scaleStringThrew = e instanceof TypeError;
  }
  assert(scaleStringThrew, 'scaleDimension rejects numeric string "10" with TypeError');

  // getAllUnitEquivalents with invalid input
  let equivThrew = false;
  try {
    getAllUnitEquivalents('abc');
  } catch (e) {
    equivThrew = e instanceof TypeError;
  }
  assert(equivThrew, 'getAllUnitEquivalents rejects string input with TypeError instead of silent zero');

  let ratioZeroThrew = false;
  try {
    scaleDimension({ value: 10, unitKey: 'cm', ratio: 0, direction: 'drawing_to_real' });
  } catch (e) {
    ratioZeroThrew = true;
  }
  assert(ratioZeroThrew, 'Throws error on ratio <= 0', ratioZeroThrew);

  let invalidUnitThrew = false;
  try {
    scaleDimension({ value: 10, unitKey: 'invalid_unit', ratio: 50 });
  } catch (e) {
    invalidUnitThrew = true;
  }
  assert(invalidUnitThrew, 'Throws error on invalid unit key "invalid_unit"', invalidUnitThrew);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
