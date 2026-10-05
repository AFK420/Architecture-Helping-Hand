/**
 * Architecture Helping Hand - UI & DOM Contract Test Suite
 * Asserts that all DOM IDs, classes, buttons, and mode targets match between src/ui/ and index.html.
 */

import fs from 'fs';
import { NAV_TOOLS } from '../src/core/workspaces.js';
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

// 1. Verify Mode Navigation Targets
// Navigation is rendered from the workspace registry (src/core/workspaces.js)
// consumed by src/ui/app.js, so the registry must list every tool and
// index.html must contain every view container — no dead sidebar links.
{
  const expectedModes = [...NAV_TOOLS.keys()];

  const registryPath = path.join(rootDir, 'src', 'core', 'workspaces.js');
  const registryContent = fs.readFileSync(registryPath, 'utf-8');
  assert(appJsContent.includes("from '../core/workspaces.js'"), 'src/ui/app.js imports the workspace registry');

  for (const mode of expectedModes) {
    const inRegistry = NAV_TOOLS.has(mode);
    const hasView = htmlContent.includes(`id="mode-view-${mode}"`);
    assert(inRegistry, `Workspace registry lists tool "${mode}"`);
    assert(hasView, `index.html has view container "mode-view-${mode}"`);
  }

  // Every registry tool id must have a view container (no dead links)
  const registryToolIds = [...NAV_TOOLS.keys()];
  const missingViews = registryToolIds.filter(id => !htmlContent.includes(`id="mode-view-${id}"`));
  assert(missingViews.length === 0, 'Every registry tool has a matching view container', missingViews);

  // The landing screen is a real view with a container
  assert(htmlContent.includes('id="mode-view-landing"'), 'index.html has the workspace landing container');
}

// 1b. Application shell contract: sidebar, top bar, landing, and Home screen
//     elements must exist and the shell CSS must be present (regression pins
//     for the Phase A workspace-navigation layout that replaced the old
//     section list + duplicate menubar ribbon).
{
  const shellIds = [
    'app-shell', 'app-sidebar', 'app-workbench', 'app-topbar',
    'tool-surface', 'sidebar-toggle-btn', 'sidebar-backdrop',
    'sidebar-search', 'sidebar-search-clear', 'sidebar-nav',
    'topbar-home-btn', 'topbar-crumb-workspace', 'topbar-crumb-tool',
    'topbar-project-chip', 'topbar-file-menu', 'topbar-ai-btn',
    'mode-view-landing', 'landing-content',
    // Home screen
    'mode-view-home', 'home-project-name', 'home-project-badge',
    'home-project-desc', 'home-project-stats', 'home-ai-status',
    // AI Studio job hint
    'ai-job-hint'
  ];
  for (const id of shellIds) {
    assert(htmlContent.includes(`id="${id}"`), `index.html contains shell element: #${id}`);
  }
  assert(appJsContent.includes('renderSidebar'), 'app.js renders the sidebar (renderSidebar)');
  assert(appJsContent.includes('NAV_TOOLS'), 'app.js derives navigation from the workspace registry (NAV_TOOLS)');
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
    'btn-run-quick-dim',

    // Mode 23: Survey Notebook
    'survey-label',
    'survey-value',
    'survey-source',
    'survey-location',
    'survey-note',
    'btn-run-survey',
    'survey-error-msg',
    'survey-summary',
    'survey-measurement-list',
    'survey-room-name',
    'survey-proposal-box',
    'survey-cal-ax',
    'survey-cal-ay',
    'survey-cal-bx',
    'survey-cal-by',
    'survey-cal-distance',
    'btn-survey-calibrate',
    'survey-cal-status',
    'survey-meas-p1x',
    'survey-meas-p1y',
    'survey-meas-p2x',
    'survey-meas-p2y',
    'survey-meas-p3x',
    'survey-meas-p3y',
    'survey-meas-p4x',
    'survey-meas-p4y',
    'btn-survey-measure-distance',
    'btn-survey-measure-chain',
    'btn-survey-measure-area'
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

// 6. Verify Top Bar, Workspace Navigation & Shortcuts Guide Modal Contracts
{
  const cssPath = path.join(rootDir, 'css', 'main.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // ONE navigation hierarchy: the sidebar registry. The duplicate menubar
  // ribbon was removed in the Phase A IA redesign — pin its absence so it
  // cannot quietly return as a second competing navigation system.
  assert(!htmlContent.includes('id="app-menubar"'), 'index.html no longer contains the duplicate #app-menubar ribbon');
  assert(!appJsContent.includes('function renderMenuBar'), 'src/ui/app.js no longer defines renderMenuBar');
  assert(!appJsContent.includes('NAV_CATALOG'), 'src/ui/app.js derives navigation from the workspace registry (NAV_CATALOG removed)');

  // Workspace navigation contracts (sidebar + landing + registry)
  assert(appJsContent.includes('from \'../core/workspaces.js\''), 'src/ui/app.js imports the workspace registry');
  assert(appJsContent.includes('function openWorkspace'), 'src/ui/app.js defines openWorkspace');
  assert(appJsContent.includes('function renderLanding'), 'src/ui/app.js defines renderLanding');
  assert(appJsContent.includes('function renderSidebar'), 'src/ui/app.js renders the sidebar (renderSidebar)');
  assert(htmlContent.includes('id="mode-view-landing"'), 'index.html contains the #mode-view-landing landing section');
  assert(htmlContent.includes('id="landing-content"'), 'index.html contains #landing-content host');
  assert(cssContent.includes('.sidebar-workspace'), 'css/main.css defines .sidebar-workspace styles');
  assert(cssContent.includes('.sidebar-tool'), 'css/main.css defines .sidebar-tool styles');
  assert(cssContent.includes('body.sidebar-rail .app-sidebar'), 'css/main.css defines the collapsed icon-rail mode');

  // Top bar contracts: breadcrumb (workspace + tool crumbs), project chip,
  // compact File menu, AI drawer trigger
  assert(htmlContent.includes('id="topbar-crumb-workspace"'), 'index.html contains #topbar-crumb-workspace breadcrumb crumb');
  assert(htmlContent.includes('id="topbar-crumb-tool"'), 'index.html contains #topbar-crumb-tool breadcrumb crumb');
  assert(htmlContent.includes('id="topbar-project-chip"'), 'index.html contains #topbar-project-chip');
  assert(htmlContent.includes('id="topbar-file-menu"'), 'index.html contains #topbar-file-menu');
  assert(htmlContent.includes('id="topbar-ai-btn"'), 'index.html contains #topbar-ai-btn AI drawer trigger');
  assert(appJsContent.includes('function wireTopBar'), 'src/ui/app.js wires the top bar (wireTopBar)');
  assert(appJsContent.includes('function closeTopFileMenu'), 'src/ui/app.js defines closeTopFileMenu');
  assert(cssContent.includes('.topbar-project-chip'), 'css/main.css defines .topbar-project-chip styles');
  assert(cssContent.includes('.topbar-file-dropdown'), 'css/main.css defines .topbar-file-dropdown styles');

  // Home workflow orientation
  assert(htmlContent.includes('home-ws-btn'), 'index.html Home view includes workspace workflow buttons');
  assert(htmlContent.includes('STUDIO WORKFLOW'), 'index.html Home view includes the studio workflow card');

  // QA hooks
  assert(appJsContent.includes('__ahhOpenWorkspace'), 'src/ui/app.js exposes the __ahhOpenWorkspace QA hook');

  // Guide Modal scrollability & reference content contracts
  assert(cssContent.includes('max-height: 88vh') || cssContent.includes('max-height:88vh'), 'css/main.css bounds .modal-card with max-height: 88vh');
  assert(cssContent.includes('overflow-y: auto') || cssContent.includes('overflow-y:auto'), 'css/main.css enables overflow-y: auto on .modal-body for vertical scrolling');
  assert(htmlContent.includes('Architectural Studio Quick Reference &amp; Formulas') || htmlContent.includes('Architectural Studio Quick Reference & Formulas'), 'index.html includes Architectural Studio Quick Reference in guide modal');
  assert(htmlContent.includes('Ctrl + B'), 'index.html includes Ctrl + B shortcut documentation for sidebar toggle');
  assert(htmlContent.includes('sidebar-toggle-text'), 'index.html includes visible text for sidebar toggle button');

  // Progressive Web App (PWA) contracts
  const manifestPath = path.join(rootDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists in root');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifest.name === 'Architecture Helping Hand', 'manifest.json specifies full application name');
  assert(manifest.display === 'standalone', 'manifest.json specifies display: standalone for borderless app window');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'manifest.json specifies at least 3 icon variants');

  const swPath = path.join(rootDir, 'sw.js');
  assert(fs.existsSync(swPath), 'sw.js Service Worker exists in root');
  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert(swContent.includes('addEventListener(\'install\'') || swContent.includes('addEventListener("install"'), 'sw.js handles install event');
  assert(swContent.includes('addEventListener(\'fetch\'') || swContent.includes('addEventListener("fetch"'), 'sw.js handles fetch event');

  assert(htmlContent.includes('rel="manifest"'), 'index.html links to manifest.json');
  assert(htmlContent.includes('id="pwa-install-btn"'), 'index.html includes #pwa-install-btn desktop install trigger');
  assert(cssContent.includes('.pwa-install-btn'), 'css/main.css defines .pwa-install-btn styles');
  assert(appJsContent.includes('function initPwa'), 'src/ui/app.js defines initPwa lifecycle');
  assert(fs.existsSync(path.join(rootDir, 'assets', 'icon-192.png')), 'assets/icon-192.png exists');
  assert(fs.existsSync(path.join(rootDir, 'assets', 'icon-512.png')), 'assets/icon-512.png exists');
  assert(fs.existsSync(path.join(rootDir, 'assets', 'icon-maskable-512.png')), 'assets/icon-maskable-512.png exists');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);

