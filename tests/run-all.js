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
  'dimension-workspace.test.js',
  'dimension-expression.test.js',
  'multi-scale.test.js',
  'dimension-chains.test.js',
  'cad-clipboard.test.js',
  'batch-cad.test.js',
  'quick-dimension.test.js',
  'cad-targets.test.js',
  'project.test.js',
  'store.test.js',
  'stairs.test.js',
  'ramps.test.js',
  'slopes.test.js',
  'export.test.js',
  'project-workspace.test.js',
  'plan-canvas.test.js',
  'plan-canvas-accuracy.test.js',
  'space-planning.test.js',
  'ai.test.js',
  'visual-ai.test.js',
  'ai-providers.test.js',
  'ai-integration.test.js',
  'imports.test.js',
  'survey.test.js',
  'integration.test.js',
  'services.test.js',
  'commands.test.js',
  'data-integrity.test.js',
  'build-integrity.test.js',
  'ui-contracts.test.js',
  'contextual-studio.test.js',
  'responsive.test.js'
];

console.log('=================================================================');
console.log('🏛️  ARCHITECTURE HELPING HAND — CORE TEST RUNNER');
console.log('=================================================================\n');

let totalSuites = 0;
let passedSuites = 0;
let totalAssertions = 0;

/**
 * Extracts the assertion count from a suite's "Summary: N passed" output.
 * This makes the runner emit one authoritative total assertion count so
 * documentation never has to guess. Suites whose summary line cannot be
 * parsed (e.g. custom formats) count as 0 assertions and are reported so
 * the gap stays visible instead of silently undercounting.
 */
function extractAssertionCount(stdout, file) {
  const match = stdout.match(/(\d+)\s+passed/);
  if (!match) {
    console.warn(`⚠️  Could not parse assertion count for ${file} — not counted in total.`);
    return 0;
  }
  return parseInt(match[1], 10);
}

for (const file of testFiles) {
  totalSuites++;
  const filePath = path.join(__dirname, file);
  const res = spawnSync(process.execPath, [filePath], { encoding: 'utf-8' });

  if (res.status === 0) {
    passedSuites++;
    totalAssertions += extractAssertionCount(res.stdout || '', file);
    process.stdout.write(res.stdout || '');
  } else {
    // Surface everything from the failing suite, then abort the run.
    process.stdout.write(res.stdout || '');
    process.stderr.write(res.stderr || '');
    console.error(`❌ Test suite failed: ${file}\n`);
    process.exit(1);
  }
}

console.log('=================================================================');
console.log(`🎉 ALL ${passedSuites} OF ${totalSuites} TEST SUITES PASSED CLEANLY!`);
console.log(`📊 TOTAL ASSERTIONS: ${totalAssertions} passed`);
console.log('=================================================================\n');
