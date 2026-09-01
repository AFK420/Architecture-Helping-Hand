/**
 * Automated test suite for ArchiScale mathematical conversion calculations
 */

import {
  parseArchitecturalInput,
  formatNumber,
  formatFeetInches,
  drawingToReal,
  realToDrawing,
  rescaleDrawing,
  detectScale,
  scaleArea,
  scaleVolume,
  getAllUnitEquivalents
} from '../js/converter.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function approxEqual(a, b, epsilon = 0.0001) {
  return Math.abs(a - b) < epsilon;
}

console.log('--- Testing Architecture Helping Hand Mathematical Engine ---');

// 1. Drawing to Real-World Tests
{
  // 10 cm @ 1:50 -> 5.0 m
  const res1 = drawingToReal({ drawingVal: 10, drawingUnitKey: 'cm', scaleRatio: 50, realUnitKey: 'm' });
  assert(approxEqual(res1.realValue, 5.0), `10 cm @ 1:50 = 5.0 m (Got: ${res1.realValue})`);

  // 25 mm @ 1:100 -> 2.5 m
  const res2 = drawingToReal({ drawingVal: 25, drawingUnitKey: 'mm', scaleRatio: 100, realUnitKey: 'm' });
  assert(approxEqual(res2.realValue, 2.5), `25 mm @ 1:100 = 2.5 m (Got: ${res2.realValue})`);

  // 15 cm @ 1:20 -> 3.0 m
  const res3 = drawingToReal({ drawingVal: 15, drawingUnitKey: 'cm', scaleRatio: 20, realUnitKey: 'm' });
  assert(approxEqual(res3.realValue, 3.0), `15 cm @ 1:20 = 3.0 m (Got: ${res3.realValue})`);

  // 24 cm @ 1:5000 -> 1.2 km
  const res4 = drawingToReal({ drawingVal: 24, drawingUnitKey: 'cm', scaleRatio: 5000, realUnitKey: 'km' });
  assert(approxEqual(res4.realValue, 1.2), `24 cm @ 1:5000 = 1.2 km (Got: ${res4.realValue})`);
}

// 2. Real-World to Drawing Tests (Inverse)
{
  // 5.0 m @ 1:50 -> 10.0 cm
  const res1 = realToDrawing({ realVal: 5.0, realUnitKey: 'm', scaleRatio: 50, drawingUnitKey: 'cm' });
  assert(approxEqual(res1.drawingValue, 10.0), `5.0 m @ 1:50 = 10.0 cm (Got: ${res1.drawingValue})`);

  // 17.5 m @ 1:100 -> 175 mm
  const res2 = realToDrawing({ realVal: 17.5, realUnitKey: 'm', scaleRatio: 100, drawingUnitKey: 'mm' });
  assert(approxEqual(res2.drawingValue, 175.0), `17.5 m @ 1:100 = 175 mm (Got: ${res2.drawingValue})`);
}

// 3. Rescaling Tests (Scale A -> Scale B)
{
  // 12 cm @ 1:50 rescaled to 1:200 -> 3.0 cm
  const res = rescaleDrawing({
    originalVal: 12,
    originalUnitKey: 'cm',
    originalRatio: 50,
    targetRatio: 200,
    targetUnitKey: 'cm'
  });
  assert(approxEqual(res.targetValue, 3.0), `12 cm @ 1:50 -> 1:200 = 3.0 cm (Got: ${res.targetValue})`);
  assert(approxEqual(res.factor, 0.25), `Magnification factor is 0.25 (Got: ${res.factor})`);
}

// 4. Scale Detector / Unknown Scale Finder Tests
{
  // 4.5 cm paper vs 9.0 m real -> 1:200
  const res = detectScale({ paperVal: 4.5, paperUnitKey: 'cm', realVal: 9.0, realUnitKey: 'm' });
  assert(approxEqual(res.ratio, 200), `4.5 cm vs 9.0 m detected ratio = 200 (Got: ${res.ratio})`);
  assert(res.closestPreset && res.closestPreset.id === '1:200', `Closest preset is 1:200 (Got: ${res.closestPreset?.id})`);
}

// 5. Area Scaling Tests (S^2)
{
  // 4 cm^2 @ 1:100 -> 40 m^2 (since 1 cm^2 at 1:100 = 0.0001 m^2 * 10000 = 1 m^2, so 4 cm^2 = 40000 cm^2 * 0.0001 = 4 m^2? Wait: 4 cm^2 * (100)^2 = 4 * 10000 cm^2 = 40000 cm^2 = 4 m^2)
  const res = scaleArea({
    areaVal: 4,
    inputUnitKey: 'cm2',
    scaleRatio: 100,
    outputUnitKey: 'm2',
    isDrawingToReal: true
  });
  // 4 cm^2 = 0.0004 m^2 * (100^2 = 10000) = 4 m^2
  assert(approxEqual(res.resultValue, 4.0), `4 cm² @ 1:100 = 4.0 m² (Got: ${res.resultValue})`);
}

// 6. Fractional & Architectural Parser Tests
{
  assert(approxEqual(parseArchitecturalInput('3 1/2'), 3.5), `Parse '3 1/2' = 3.5`);
  assert(approxEqual(parseArchitecturalInput('5/8'), 0.625), `Parse '5/8' = 0.625`);
  assert(approxEqual(parseArchitecturalInput('12.75'), 12.75), `Parse '12.75' = 12.75`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
