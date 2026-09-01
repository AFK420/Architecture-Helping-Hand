/**
 * Architecture Helping Hand - UI & DOM Contract Test Suite
 * Asserts that all DOM IDs, classes, buttons, and mode targets match between src/ui/ and index.html.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

console.log('🧪 Running tests/ui-contracts.test.js...');

const htmlPath = path.join(rootDir, 'index.html');
const appJsPath = path.join(rootDir, 'src', 'ui', 'app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
const appJsContent = fs.readFileSync(appJsPath, 'utf-8');

// 1. Verify Mode Navigation Targets in HTML
{
  const expectedModes = ['converter', 'rescale', 'detector', 'area_volume', 'furniture', 'reference'];
  
  for (const mode of expectedModes) {
    const hasTab = htmlContent.includes(`data-mode="${mode}"`);
    const hasView = htmlContent.includes(`id="mode-view-${mode}"`);
    assert(hasTab, `index.html has navigation tab for mode "${mode}"`);
    assert(hasView, `index.html has view container "mode-view-${mode}"`);
  }
}

// 2. Verify Critical DOM Element IDs exist in index.html
{
  const requiredIds = [
    // Header & Modals
    'theme-select',
    'sound-toggle-btn',
    'sound-toggle-label',
    'history-toggle-btn',
    'shortcuts-help-btn',
    'shortcuts-modal',
    'modal-backdrop',
    'close-shortcuts-btn',
    'history-drawer',
    'history-overlay',
    'close-history-btn',
    'clear-history-btn',
    'export-csv-btn',
    'export-md-btn',
    'history-count-badge',
    'history-list',
    'toast-container',

    // Mode 1: Converter
    'active-scale-badge',
    'preset-category-pills',
    'presets-grid',
    'scale-ratio-input',
    'converter-input-val',
    'converter-input-unit',
    'converter-input-badge',
    'swap-direction-btn',
    'converter-output-unit',
    'converter-output-badge',
    'btn-run-converter',
    'converter-error-msg',
    'converter-result-val',
    'converter-result-unit',
    'btn-copy-result',
    'btn-save-history',
    'visualizer-container',
    'metric-breakdown-list',
    'imperial-breakdown-list',

    // Mode 2: Rescaler
    'rescale-orig-ratio',
    'rescale-orig-val',
    'rescale-orig-unit',
    'rescale-target-ratio',
    'rescale-target-unit',
    'btn-run-rescale',
    'rescale-error-msg',
    'rescale-result-val',
    'rescale-result-unit',
    'rescale-factor-badge',
    'rescale-real-span',
    'btn-copy-rescale',

    // Mode 3: Detector
    'detector-paper-val',
    'detector-paper-unit',
    'detector-real-val',
    'detector-real-unit',
    'btn-run-detector',
    'detector-error-msg',
    'detector-ratio-val',
    'detector-preset-badge',
    'btn-apply-detected',

    // Mode 4: Area & Volume
    'areavol-ratio-input',
    'areavol-input-val',
    'areavol-input-unit',
    'areavol-output-unit',
    'areavol-input-badge',
    'areavol-output-badge',
    'btn-run-areavol',
    'areavol-error-msg',
    'areavol-result-val',
    'areavol-result-unit',
    'areavol-factor-badge',
    'btn-copy-areavol',

    // Mode 5: Furniture
    'furniture-search-input',
    'clear-furniture-search-btn',
    'furniture-results-count',
    'furn-scale-presets',
    'furn-scale-ratio-input',
    'furn-paper-unit-select',
    'furn-sort-select',
    'furn-category-nav',
    'furniture-cards-grid',
    'custom-furn-name',
    'custom-furn-w',
    'custom-furn-d',
    'custom-furn-unit',
    'btn-run-custom-furn',
    'custom-furn-result',
    'btn-planner-custom-furn',
    'btn-copy-custom-furn',
    'btn-send-custom-furn',

    // Mode 6: Reference
    'ref-scale-select',
    'btn-print-ref',
    'ref-table-body',
    'ref-active-scale-badge',
    'ref-quick-chips',
    'ref-ruler-container',
    'ref-benchmarks-grid',
    'ref-data-table',
    'ref-density-btn-standard',
    'ref-density-btn-compact',

    // Workflow Pipeline & Mathematical Explanation IDs
    'converter-math-formula',
    'converter-flow-from',
    'converter-flow-to',
    'converter-secondary-readout',
    'converter-result-stale-tag',
    'rescale-math-formula',
    'rescale-result-stale-tag',
    'detector-math-formula',
    'detector-result-stale-tag',
    'areavol-math-formula',
    'areavol-result-stale-tag',

    // Unified Result Pattern & State Badges
    'converter-state-badge',
    'converter-context-strip',
    'rescale-state-badge',
    'rescale-context-strip',
    'detector-state-badge',
    'detector-context-strip',
    'areavol-state-badge',
    'areavol-context-strip',
    'custom-furn-state-badge'
  ];

  for (const id of requiredIds) {
    const existsInHtml = htmlContent.includes(`id="${id}"`);
    assert(existsInHtml, `index.html contains required ID: #${id}`);
  }
}

// 3. Verify RUN CALCULATION Buttons Exist for all calculation tools
{
  const runButtons = [
    'btn-run-converter',
    'btn-run-rescale',
    'btn-run-detector',
    'btn-run-areavol',
    'btn-run-custom-furn'
  ];

  for (const rBtn of runButtons) {
    const inHtml = htmlContent.includes(`id="${rBtn}"`);
    const inJs = appJsContent.includes(rBtn);
    assert(inHtml && inJs, `Run calculation button #${rBtn} is present in HTML and hooked in app.js`);
  }
}

// 4. Verify Script Bundle Inclusions & Cleanliness
{
  assert(htmlContent.includes('src="js/app.js'), 'index.html includes compiled js/app.js');
  assert(!htmlContent.includes('react') && !htmlContent.includes('vue'), 'index.html is 100% zero-framework vanilla HTML');

  const bundlePath = path.join(rootDir, 'js', 'app.js');
  assert(fs.existsSync(bundlePath), 'js/app.js bundle exists');

  const bundleCode = fs.readFileSync(bundlePath, 'utf-8');
  assert(!/^\s*import\s+/m.test(bundleCode), 'js/app.js contains no unstripped import statements');
  assert(!/^\s*export\s+/m.test(bundleCode), 'js/app.js contains no unstripped export statements');

  let syntaxValid = false;
  try {
    new Function('window', 'document', 'navigator', 'localStorage', bundleCode);
    syntaxValid = true;
  } catch (err) {
    console.error(`Syntax Error in bundle: ${err.message}`);
  }
  assert(syntaxValid, 'js/app.js parses with zero syntax errors');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
