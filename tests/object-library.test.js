/**
 * Object Library Test Suite — domain packs + parametric runs integrity.
 * 638 unique objects across 17 categories, all with real dimensions,
 * no duplicate ids, and every category resolvable to a label.
 */

import { FURNITURE_DATABASE } from '../src/core/furniture.js';
import { OBJECT_LIBRARY_PACKS, OBJECT_CATEGORY_LABELS } from '../src/core/object-library.js';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

const ALL = [...FURNITURE_DATABASE, ...OBJECT_LIBRARY_PACKS];

console.log('\n--- 1. Size + uniqueness ---');
assert(ALL.length >= 600, `library size ≥ 600 (got ${ALL.length})`);
const ids = new Set();
let dupes = 0;
for (const o of ALL) { if (ids.has(o.id)) dupes++; ids.add(o.id); }
assert(dupes === 0, `zero duplicate ids (${ids.size} unique)`);

console.log('\n--- 2. Data integrity ---');
assert(ALL.every(o => o.id && typeof o.id === 'string'), 'every item has a string id');
assert(ALL.every(o => Number.isFinite(o.wCm) && o.wCm > 0), 'every item has a positive width');
assert(ALL.every(o => Number.isFinite(o.dCm) && o.dCm > 0), 'every item has a positive depth');
assert(ALL.every(o => typeof o.name === 'string' && o.name.length > 0), 'every item has a name');

console.log('\n--- 3. Requested domains present ---');
const byCat = new Map();
for (const o of ALL) byCat.set(o.category, (byCat.get(o.category) || 0) + 1);
for (const [cat, min] of [
  ['healthcare', 40], ['emergency', 25], ['sports', 30], ['fitness', 15],
  ['leisure', 30], ['education', 15], ['hospitality', 20], ['transport', 20], ['landscape', 40]
]) {
  assert((byCat.get(cat) || 0) >= min, `${cat} pack ≥ ${min} items (got ${byCat.get(cat) || 0})`);
}
// The specific things the user asked for:
const has = (needle) => assert(ALL.some(o => o.name.toLowerCase().includes(needle)), `library contains "${needle}"`);
has('hospital bed'); has('dental'); has('ambulance'); has('police'); has('fire engine');
has('helipad'); has('stadium'); has('football pitch'); has('tennis'); has('caravan');
has('motorhome'); has('arcade'); has('esports'); has('cinema'); has('tree'); has('hedge');
has('planter'); has('rain garden'); has('wheelchair');

console.log('\n--- 4. Category labels resolve ---');
const unlabeled = [...byCat.keys()].filter(c => !OBJECT_CATEGORY_LABELS[c]);
assert(unlabeled.length === 0, `every category has a browser label (missing: ${unlabeled.join(',') || 'none'})`);

console.log('\n--- 5. Real-dimension spot checks ---');
const spot = (id, w, d) => {
  const o = ALL.find(x => x.id === id);
  assert(o && o.wCm === w && o.dCm === d, `${id} is ${w}×${d}cm`);
};
spot('court-tennis', 1097, 2377);   // ITF doubles court
spot('field-football', 6800, 10500); // FIFA pitch
spot('pool-olympic', 2500, 5000);   // 10-lane 50m
spot('ambulance', 210, 560);        // Type II van
spot('parking-bay-dis-ada', 360, 500); // ADA bay incl. aisle

console.log(`\n========================================`);
console.log(`Object Library: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
