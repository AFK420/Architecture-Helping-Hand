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
  assert(FURNITURE_DATABASE.length >= 170, `Catalog contains 170+ items (Found: ${FURNITURE_DATABASE.length})`, FURNITURE_DATABASE.length);

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
  assert(sofas.length >= 5, `Filter query "sofa" returns all sofas (Found: ${sofas.length})`, sofas.length);

  const bedroomItems = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'bedroom');
  assert(bedroomItems.length >= 15, `Filter category "bedroom" returns bedroom items (Found: ${bedroomItems.length})`, bedroomItems.length);

  const outdoorItems = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'outdoor');
  assert(outdoorItems.length >= 12, `Filter category "outdoor" returns outdoor items (Found: ${outdoorItems.length})`, outdoorItems.length);

  const commercialItems = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'commercial');
  assert(commercialItems.length >= 12, `Filter category "commercial" returns commercial items (Found: ${commercialItems.length})`, commercialItems.length);
}

// 4. Space-Planning Footprint & Confidence Classification
{
  const sofa = FURNITURE_DATABASE.find(i => i.id === 'sofa-3p');
  const scaled = getScaledFurnitureDimensions(sofa, 50, 'cm');
  assert(scaled.footprintM2 === '1.98', '3-Seater Sofa (220×90 cm) footprint is 1.98 m²', scaled.footprintM2);
  assert(parseFloat(scaled.footprintSqFt) > 20, '3-Seater Sofa footprint in sq ft is > 20 sq ft', scaled.footprintSqFt);
  assert(typeof scaled.standardTag === 'string' && scaled.standardTag.length > 0, 'Standard tag is defined', scaled.standardTag);
  assert(typeof scaled.dimensionType === 'string' && scaled.dimensionType.length > 0, 'Dimension type label is defined', scaled.dimensionType);

  const adaToilet = FURNITURE_DATABASE.find(i => i.id === 'toilet-ada');
  if (adaToilet) {
    const adaScaled = getScaledFurnitureDimensions(adaToilet, 50, 'cm');
    assert(adaScaled.standardTag.includes('ADA'), 'ADA toilet has ADA standard classification tag', adaScaled.standardTag);
  }
}

// 5. Multi-Criteria Fuzzy & Dimension Search
{
  const tokenMatches = filterFurnitureCatalog(FURNITURE_DATABASE, 'sofa 220', 'all');
  assert(tokenMatches.length >= 1 && tokenMatches.some(i => i.wCm === 220), 'Multi-token search "sofa 220" matches 220cm sofa', tokenMatches.length);

  const dimMatches = filterFurnitureCatalog(FURNITURE_DATABASE, '200x200', 'all');
  assert(dimMatches.length >= 1 && dimMatches.some(i => i.wCm === 200 && i.dCm === 200), 'Dimension search "200x200" matches California/Super King', dimMatches.length);

  const adaMatches = filterFurnitureCatalog(FURNITURE_DATABASE, 'ada', 'all');
  assert(adaMatches.length >= 3, 'Search "ada" returns accessibility fixtures and clearances', adaMatches.length);
}

// 6. Catalog Sorting Engine
{
  const sortedByWidth = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'all', 'width_desc');
  assert(sortedByWidth[0].wCm >= sortedByWidth[1].wCm, 'Sorting by width_desc orders widest first', sortedByWidth[0].wCm);

  const sortedByName = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'all', 'name_asc');
  assert(sortedByName[0].name.localeCompare(sortedByName[1].name) <= 0, 'Sorting by name_asc orders alphabetically', sortedByName[0].name);

  const sortedByArea = filterFurnitureCatalog(FURNITURE_DATABASE, '', 'all', 'area_desc');
  const area0 = sortedByArea[0].wCm * sortedByArea[0].dCm;
  const area1 = sortedByArea[1].wCm * sortedByArea[1].dCm;
  assert(area0 >= area1, 'Sorting by area_desc orders largest footprint first', area0);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
