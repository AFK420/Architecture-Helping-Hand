/**
 * Architecture Helping Hand - Master Test Suite Runner
 * Executes all modular unit and regression test suites.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'calculator.test.js',
  'geometry.test.js',
  'parser.test.js',
  'units.test.js',
  'formatter.test.js',
  'furniture.test.js',
  'services.test.js',
  'data-integrity.test.js',
  'ui-contracts.test.js'
];

console.log('=================================================================');
console.log('🏛️  ARCHITECTURE HELPING HAND — CORE TEST RUNNER');
console.log('=================================================================\n');

let totalSuites = 0;
let passedSuites = 0;

for (const file of testFiles) {
  totalSuites++;
  const filePath = path.join(__dirname, file);
  const res = spawnSync(process.execPath, [filePath], { stdio: 'inherit' });

  if (res.status === 0) {
    passedSuites++;
  } else {
    console.error(`❌ Test suite failed: ${file}\n`);
    process.exit(1);
  }
}

console.log('=================================================================');
console.log(`🎉 ALL ${passedSuites} OF ${totalSuites} TEST SUITES PASSED CLEANLY!`);
console.log('=================================================================\n');
