/**
 * Architecture Helping Hand - Furniture Catalog & Scaling Tests
 */

import {
  FURNITURE_DATABASE,
  getScaledFurnitureDimensions,
  filterFurnitureCatalog
} from '../src/core/furniture.js';

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

console.log('🧪 Running tests/furniture.test.js...');

// 1. Database Integrity Checks
{
  assert(FURNITURE_DATABASE.length >= 40, `Catalog contains 40+ items (Found: ${FURNITURE_DATABASE.length})`, FURNITURE_DATABASE.length);

  let allValid = true;
  for (const item of FURNITURE_DATABASE) {
    if (!item.id || !item.name || !item.category || item.wCm <= 0 || item.dCm <= 0) {
      allValid = false;
      break;
    }
  }
  assert(allValid, 'All furniture items have valid IDs, names, categories, and positive dimensions');
}

// 2. Scaling Accuracy Tests
{
  const sofa = FURNITURE_DATABASE.find(i => i.id === 'sofa-3p');
  const scaled50 = getScaledFurnitureDimensions(sofa, 50, 'cm');
  assert(approxEqual(scaled50.paperWidth, 4.40), '3-Seater Sofa (220cm) @ 1:50 = 4.40 cm on paper', scaled50.paperWidth);
  assert(approxEqual(scaled50.paperDepth, 1.80), '3-Seater Sofa (90cm) @ 1:50 = 1.80 cm on paper', scaled50.paperDepth);

  const kingBed = FURNITURE_DATABASE.find(i => i.id === 'bed-king');
  const scaled100 = getScaledFurnitureDimensions(kingBed, 100, 'cm');
  assert(approxEqual(scaled100.paperWidth, 1.80), 'King Bed (180cm) @ 1:100 = 1.80 cm on paper', scaled100.paperWidth);
  assert(approxEqual(scaled100.paperDepth, 2.00), 'King Bed (200cm) @ 1:100 = 2.00 cm on paper', scaled100.paperDepth);
}

// 3. Search and Category Filter Tests
{
  const sofas = filterFurnitureCatalog(FURNITURE_DATABASE, 'sofa', 'all');
  assert(sofas.length >= 3, `Filter query "sofa" returns all sofas (Found: ${sofas.length})`, sofas.length);

  const bedroomItems = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'bedroom');
  assert(bedroomItems.length >= 8, `Filter category "bedroom" returns bedroom items (Found: ${bedroomItems.length})`, bedroomItems.length);

  const kitchenSink = filterFurnitureCatalog(FURNITURE_DATABASE, 'sink', 'kitchen');
  assert(kitchenSink.length >= 2, `Filter "sink" in "kitchen" returns sinks (Found: ${kitchenSink.length})`, kitchenSink.length);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
