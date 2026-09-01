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
  getAllUnitEquivalents
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

// 1. Drawing to Real-World Tests
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
}

// 2. Real-World to Drawing Tests
{
  const r1 = realToDrawing({ realVal: 5.0, realUnitKey: 'm', scaleRatio: 50, drawingUnitKey: 'cm' });
  assert(approxEqual(r1.drawingValue, 10.0), '5.0 m @ 1:50 = 10.0 cm', r1.drawingValue);

  const r2 = realToDrawing({ realVal: 17.5, realUnitKey: 'm', scaleRatio: 100, drawingUnitKey: 'mm' });
  assert(approxEqual(r2.drawingValue, 175.0), '17.5 m @ 1:100 = 175.0 mm', r2.drawingValue);

  const r3 = realToDrawing({ realVal: 24.0, realUnitKey: 'ft', scaleRatio: 48, drawingUnitKey: 'in' });
  assert(approxEqual(r3.drawingValue, 6.0), '24 ft @ 1:48 = 6.0 in', r3.drawingValue);
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
}

// 5. Area & Volume Scaler Tests
{
  const r1 = scaleArea({ areaVal: 4, inputUnitKey: 'cm2', scaleRatio: 100, outputUnitKey: 'm2', isDrawingToReal: true });
  assert(approxEqual(r1.resultValue, 4.0), '4 cm² @ 1:100 = 4.0 m²', r1.resultValue);

  const r2 = scaleArea({ areaVal: 50, inputUnitKey: 'm2', scaleRatio: 50, outputUnitKey: 'cm2', isDrawingToReal: false });
  assert(approxEqual(r2.resultValue, 200.0), '50 m² @ 1:50 = 200 cm²', r2.resultValue);

  const r3 = scaleVolume({ volumeVal: 1000, inputUnitKey: 'cm3', scaleRatio: 50, outputUnitKey: 'm3', isDrawingToReal: true });
  assert(approxEqual(r3.resultValue, 125.0), '1000 cm³ @ 1:50 = 125.0 m³', r3.resultValue);
}

// 6. Zero Values & Boundary Tests
{
  const rZero = drawingToReal({ drawingVal: 0, drawingUnitKey: 'cm', scaleRatio: 50, realUnitKey: 'm' });
  assert(rZero.realValue === 0, 'Zero drawing dimension produces zero real dimension', rZero.realValue);

  const rLarge = drawingToReal({ drawingVal: 1000, drawingUnitKey: 'm', scaleRatio: 10000, realUnitKey: 'km' });
  assert(approxEqual(rLarge.realValue, 10000), '1000m @ 1:10000 = 10,000 km', rLarge.realValue);

  const rSmall = drawingToReal({ drawingVal: 0.1, drawingUnitKey: 'mm', scaleRatio: 1, realUnitKey: 'mm' });
  assert(approxEqual(rSmall.realValue, 0.1), '0.1mm @ 1:1 = 0.1 mm', rSmall.realValue);
}

// 7. Error Handling for Invalid Ratios
{
  let errorCaught = false;
  try {
    scaleDimension({ value: 10, unitKey: 'cm', ratio: 0, direction: 'drawing_to_real' });
  } catch (e) {
    errorCaught = true;
  }
  assert(errorCaught, 'Throws error on ratio <= 0', errorCaught);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
