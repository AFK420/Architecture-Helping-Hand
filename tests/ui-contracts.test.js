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
  const expectedModes = ['converter', 'rescale', 'detector', 'area_volume', 'furniture', 'reference', 'workspace', 'expression', 'multiscale', 'chains', 'cad_clipboard', 'batch_cad', 'cad_handoff', 'stairs', 'ramps', 'slopes', 'export', 'projects', 'plan', 'ai', 'ai_settings'];
  
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
    'command-palette-btn',
    'command-palette-modal',
    'command-palette-overlay',
    'command-palette-input',
    'command-palette-list',
    'close-command-palette-btn',
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

    // Mode 7: Dimension Workspace
    'workspace-density-standard',
    'workspace-density-compact',
    'workspace-state-badge',
    'workspace-scale-select',
    'workspace-custom-scale-group',
    'workspace-custom-scale-input',
    'workspace-unit-select',
    'workspace-quick-chips',
    'workspace-add-form',
    'workspace-add-type',
    'workspace-add-name',
    'workspace-add-input',
    'workspace-add-unit',
    'workspace-add-notes',
    'workspace-add-btn',
    'workspace-add-error',
    'workspace-breakdown-badge',
    'workspace-select-all',
    'workspace-table',
    'workspace-table-body',
    'workspace-th-drawing',
    'workspace-cards-list',
    'workspace-empty-state',
    'workspace-load-samples-btn',
    'workspace-totals-card',
    'workspace-active-count',
    'workspace-total-segments-real',
    'workspace-total-segments-drawing',
    'workspace-total-allowances-real',
    'workspace-total-allowances-drawing',
    'workspace-total-combined-real',
    'workspace-total-combined-drawing',
    'workspace-total-references-real',
    'workspace-total-real-val',
    'workspace-total-drawing-val',
    'workspace-total-drawing-label',
    'workspace-actions-toolbar',
    'workspace-copy-selected-btn',
    'workspace-copy-segments-btn',
    'workspace-copy-references-btn',
    'workspace-copy-all-btn',
    'workspace-copy-raw-btn',
    'workspace-copy-drawing-btn',
    'workspace-export-tsv-btn',
    'workspace-add-group-btn',
    'workspace-save-journal-btn',
    'workspace-clear-btn',

    // Mode 8: Dimension Expression IDs
    'expression-state-badge',
    'expression-input',
    'expression-live-preview',
    'expression-clear-input-btn',
    'expression-error-msg',
    'expression-default-unit',
    'expression-scale-select',
    'expression-custom-scale-group',
    'expression-custom-scale-input',
    'btn-run-expression',
    'expression-dim-badge',
    'expression-result-val',
    'expression-result-unit',
    'expression-drawing-label',
    'expression-drawing-val',
    'expression-secondary-readout',
    'expression-copy-btn',
    'expression-copy-raw-btn',
    'expression-copy-drawing-btn',
    'expression-add-name',
    'expression-add-role-select',
    'expression-add-workspace-btn',
    'expression-save-journal-btn',
    'expression-recent-list',
    'expression-clear-recent-btn',
    'expression-compare-btn',

    // Mode 9: Multi-Scale Comparison IDs
    'multiscale-state-badge',
    'multiscale-input',
    'multiscale-live-preview',
    'multiscale-clear-input-btn',
    'multiscale-error-msg',
    'multiscale-default-unit',
    'multiscale-display-unit',
    'multiscale-custom-scale-input',
    'multiscale-add-scale-btn',
    'multiscale-sort-select',
    'multiscale-paper-select',
    'multiscale-fit-min',
    'multiscale-fit-max',
    'btn-run-multiscale',
    'multiscale-count-badge',
    'multiscale-real-label',
    'multiscale-real-val',
    'multiscale-table-container',
    'multiscale-table',
    'multiscale-table-body',
    'multiscale-empty-state',
    'multiscale-load-sample-btn',
    'multiscale-copy-table-btn',
    'multiscale-copy-all-btn',
    'multiscale-copy-current-btn',
    'multiscale-copy-raw-btn',

    // Mode 10: Dimension Chains IDs
    'chains-state-badge',
    'chains-name-input',
    'chains-scale-select',
    'chains-unit-select',
    'chains-start-offset-input',
    'chains-end-offset-input',
    'chains-quick-input',
    'chains-live-preview',
    'chains-add-btn',
    'chains-clear-input-btn',
    'chains-error-msg',
    'chains-clear-all-btn',
    'chains-zoom-fit-btn',
    'chains-svg-viewport-wrapper',
    'chains-selected-inspector',
    'chains-inspector-name',
    'chains-inspector-len',
    'chains-inspector-start',
    'chains-inspector-end',
    'chains-inspector-draw',
    'chains-table',
    'chains-table-body',
    'btn-run-chains',
    'chains-count-badge',
    'chains-overall-val',
    'chains-drawing-overall',
    'chains-seg-total-val',
    'chains-alw-total-val',
    'chains-start-offset-val',
    'chains-end-offset-val',
    'chains-compare-multiscale-btn',
    'chains-send-workspace-btn',
    'chains-save-journal-btn',
    'chains-copy-table-btn',
    'chains-copy-cum-btn',
    'chains-copy-segs-btn',
    'chains-copy-draw-btn',
    'chains-export-tsv-btn',

    // Mode 11: CAD Clipboard IDs
    'cad-state-badge',
    'cad-quick-chips',
    'cad-source-pills',
    'cad-source-count-badge',
    'cad-manual-group',
    'cad-manual-input',
    'cad-target-select',
    'cad-unit-select',
    'cad-precision-select',
    'cad-suffix-select',
    'cad-delimiter-select',
    'cad-scope-select',
    'btn-run-cad-clipboard',
    'cad-result-panel',
    'cad-summary-badge',
    'cad-preview-box',
    'btn-cad-copy-main',
    'btn-cad-copy-raw',
    'btn-cad-copy-units',
    'btn-cad-copy-tsv',
    'btn-cad-export-txt',

    // Cross-Mode CAD Handoff IDs
    'workspace-open-cad-btn',
    'expression-cad-handoff-btn',
    'multiscale-cad-handoff-btn',
    'chains-cad-handoff-btn',

    // Mode 12: Batch CAD Conversion IDs
    'batch-state-badge',
    'batch-quick-chips',
    'batch-delimiter-badge',
    'batch-paste-input',
    'batch-mode-select',
    'batch-source-scale-group',
    'batch-source-scale-select',
    'batch-target-scale-group',
    'batch-target-scale-select',
    'batch-source-unit-select',
    'batch-target-unit-select',
    'batch-precision-select',
    'batch-delimiter-select',
    'btn-run-batch-cad',
    'batch-result-panel',
    'batch-metric-total',
    'batch-metric-valid',
    'batch-metric-invalid',
    'batch-filter-pills',
    'filter-count-all',
    'filter-count-valid',
    'filter-count-invalid',
    'filter-count-selected',
    'batch-select-all-btn',
    'batch-clear-selection-btn',
    'batch-table',
    'batch-table-body',
    'batch-master-checkbox',
    'batch-empty-state',
    'batch-load-sample-btn',
    'batch-copy-results-btn',
    'batch-copy-raw-btn',
    'batch-copy-tsv-btn',
    'batch-open-cad-btn',
    'batch-send-workspace-btn',
    'batch-compare-multiscale-btn',
    'batch-create-chain-btn',
    'batch-save-journal-btn',
    'batch-send-cad-handoff-btn',
    // Part 9: Mode 13 CAD Handoff
    'handoff-source-select',
    'handoff-source-hint',
    'handoff-manual-group',
    'handoff-manual-input',
    'handoff-target-pills',
    'handoff-target-description',
    'handoff-format-select',
    'handoff-chain-layout-group',
    'handoff-chain-layout-select',
    'handoff-workspace-scope-group',
    'handoff-workspace-scope-select',
    'handoff-batch-scope-group',
    'handoff-batch-scope-select',
    'handoff-advanced-details',
    'handoff-unit-select',
    'handoff-precision-select',
    'handoff-suffix-select',
    'btn-run-cad-handoff',
    'handoff-result-panel',
    'handoff-state-badge',
    'handoff-summary-badge',
    'handoff-preview-box',
    'btn-handoff-copy',
    'handoff-copy-target-label',
    'btn-handoff-export-txt',
    'btn-handoff-open-cad-clipboard',
    'workspace-send-cad-handoff-btn',
    'expression-send-cad-handoff-btn',
    'multiscale-send-cad-handoff-btn',
    'chains-send-cad-handoff-btn',
    'quick-dim-send-cad-handoff-btn',
    // Stair Calculator (Mode 14)
    'stairs-mode-select',
    'stairs-total-rise',
    'stairs-desired-riser-group',
    'stairs-desired-riser',
    'stairs-riser-count-group',
    'stairs-riser-count',
    'stairs-available-run-group',
    'stairs-available-run',
    'stairs-total-run-group',
    'stairs-total-run',
    'stairs-desired-tread-group',
    'stairs-desired-tread',
    'stairs-objective-select',
    'stairs-error-msg',
    'stairs-ref-riser-min',
    'stairs-ref-riser-max',
    'stairs-ref-blondel-min',
    'stairs-ref-blondel-max',
    'stairs-reference-note',
    'stairs-result-panel',
    'stairs-state-badge',
    'stairs-convention-badge',
    'stairs-riser-count-val',
    'stairs-riser-val',
    'stairs-tread-val',
    'stairs-run-val',
    'stairs-flight-val',
    'stairs-angle-val',
    'stairs-slope-val',
    'stairs-svg-wrap',
    'stairs-blondel-val',
    'stairs-blondel-status',
    'stairs-candidates-body',
    'stairs-copy-result-btn',
    'stairs-copy-schedule-btn',
    'stairs-send-cad-btn',
    'stairs-send-workspace-btn',
    'stairs-save-journal-btn',
    'stairs-save-project-btn',
    // Ramp Calculator (Mode 15)
    'ramps-mode-select',
    'ramps-rise-group',
    'ramps-rise',
    'ramps-slope-group',
    'ramps-slope',
    'ramps-run-group',
    'ramps-run',
    'ramps-error-msg',
    'ramps-ref-target',
    'ramps-ref-min',
    'ramps-ref-max',
    'ramps-reference-note',
    'ramps-result-panel',
    'ramps-state-badge',
    'ramps-summary-badge',
    'ramps-hero-val',
    'ramps-hero-label',
    'ramps-rise-val',
    'ramps-run-val',
    'ramps-slope-val',
    'ramps-ratio-val',
    'ramps-angle-val',
    'ramps-flight-val',
    'ramps-svg-wrap',
    'ramps-run-analysis',
    'ramps-run-analysis-body',
    'ramps-ref-status',
    'ramps-ref-detail',
    'ramps-targets-body',
    'ramps-copy-result-btn',
    'ramps-copy-schedule-btn',
    'ramps-send-cad-btn',
    'ramps-send-workspace-btn',
    'ramps-save-journal-btn',
    'ramps-save-project-btn',
    // Slope Analyzer (Mode 16)
    'slopes-mode-select',
    'slopes-rise-group',
    'slopes-rise',
    'slopes-run-group',
    'slopes-run',
    'slopes-percent-group',
    'slopes-percent',
    'slopes-ratio-group',
    'slopes-ratio',
    'slopes-angle-group',
    'slopes-angle',
    'slopes-error-msg',
    'slopes-result-panel',
    'slopes-state-badge',
    'slopes-direction-badge',
    'slopes-rise-val',
    'slopes-run-val',
    'slopes-slope-val',
    'slopes-ratio-val',
    'slopes-angle-val',
    'slopes-flight-val',
    'slopes-svg-wrap',
    'slopes-consistency-row',
    'slopes-consistency-body',
    'slopes-explanation',
    'slopes-targets-body',
    'slopes-copy-result-btn',
    'slopes-copy-schedule-btn',
    'slopes-send-cad-btn',
    'slopes-send-workspace-btn',
    'slopes-save-journal-btn',
    'slopes-save-project-btn',
    // Export Center (Mode 17)
    'export-source-select',
    'export-format-select',
    'export-format-info',
    'export-diagram-group',
    'export-diagram-select',
    'export-dxf-scale-group',
    'export-dxf-scale',
    'export-error-msg',
    'export-result-panel',
    'export-state-badge',
    'export-summary-badge',
    'export-provenance',
    'export-preview-box',
    'btn-export-download',
    'btn-export-copy',
    'btn-export-print',
    // Project Workspace (Mode 18)
    'projects-name-input',
    'projects-desc-input',
    'projects-current-info',
    'btn-project-new',
    'btn-project-save',
    'btn-project-rename',
    'btn-project-duplicate',
    'btn-project-delete',
    'btn-project-export-json',
    'projects-error-msg',
    'projects-import-box',
    'btn-project-import',
    'projects-result-panel',
    'projects-state-badge',
    'projects-count-badge',
    'projects-library-list',
    'projects-snapshot-label',
    'btn-project-snapshot',
    'projects-snapshots-list',
    // Plan Canvas (Mode 19)
    'plan-tool-select',
    'plan-furniture-group',
    'plan-furniture-select',
    'plan-grid-select',
    'btn-plan-undo',
    'btn-plan-redo',
    'btn-plan-delete',
    'btn-plan-clear',
    'plan-error-msg',
    'plan-entity-list',
    'plan-result-panel',
    'plan-state-badge',
    'plan-status-badge',
    'plan-svg',
    'plan-svg-wrap',
    'btn-plan-save',
    'btn-plan-export-svg',
    'btn-plan-export-dxf',

    // Quick Dimension Strip IDs
    'quick-dimension-strip',
    'quick-dim-toggle-btn',
    'quick-dim-status-badge',
    'quick-dim-mode-pills',
    'quick-dim-pin-btn',
    'quick-dim-close-btn',
    'quick-dim-input',
    'btn-run-quick-dim',
    'quick-dim-error-msg',
    'quick-dim-real-val',
    'quick-dim-selected-scale-label',
    'quick-dim-drawing-val',
    'quick-dim-equivalents-row',
    'quick-dim-equiv-chips',
    'quick-equiv-mm',
    'quick-equiv-cm',
    'quick-equiv-m',
    'quick-equiv-in',
    'quick-equiv-ftin',
    'quick-dim-scale-chips',
    'quick-dim-custom-scale-input',
    'quick-dim-matrix-grid',
    'quick-dim-context-card',
    'quick-dim-context-title',
    'quick-dim-context-body',
    'quick-dim-copy-real-btn',
    'quick-dim-copy-draw-btn',
    'quick-dim-copy-cad-btn',
    'quick-dim-copy-matrix-btn',
    'quick-dim-send-workspace-btn',
    'quick-dim-send-multiscale-btn',
    'quick-dim-send-chain-btn',
    'quick-dim-send-cad-btn',
    'quick-dim-save-journal-btn',

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
    'btn-run-custom-furn',
    'btn-run-expression',
    'btn-run-multiscale',
    'btn-run-chains',
    'btn-run-cad-clipboard',
    'btn-run-batch-cad',
    'btn-run-cad-handoff',
    'btn-run-stairs',
    'btn-run-ramps',
    'btn-run-slopes',
    'btn-run-export',
    'btn-run-quick-dim'
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

// 5. P14 regression pin: every app.js escapeHtml( usage must resolve to a
//    definition inside initializeApp. The workspace render previously called
//    escapeHtml with NO definition anywhere in app.js — a latent ReferenceError
//    that crashed workspace rendering at runtime (the smoke test's mock DOM
//    never exercised that render path).
{
  const defCount = (appJsContent.match(/function escapeHtml\s*\(/g) || []).length;
  assert(defCount >= 1, 'app.js defines escapeHtml (workspace render previously referenced it undefined)');

  const defIdx = appJsContent.indexOf('function escapeHtml');
  const initIdx = appJsContent.indexOf('export function initializeApp');
  const firstUseIdx = appJsContent.indexOf('escapeHtml(', defIdx + 1);
  assert(initIdx !== -1 && defIdx > initIdx, 'escapeHtml is defined inside initializeApp (all usage sites are within its scope)');
  assert(firstUseIdx !== -1, 'escapeHtml is actually used to guard user-controllable strings');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
