/**
 * Architecture Helping Hand - Main Application UI Controller
 * High-precision, zero-dependency, tactile architectural scaling studio.
 */

import { UNITS, AREA_UNITS, VOLUME_UNITS } from '../core/units.js';
import { SCALE_PRESETS } from '../core/presets.js';
import { parseInput } from '../core/parser.js';
import { formatNumber, formatFeetInches } from '../core/formatter.js';
import {
  scaleDimension,
  drawingToReal,
  realToDrawing,
  rescaleDrawing,
  detectScale,
  scaleArea,
  scaleVolume,
  getAllUnitEquivalents
} from '../core/calculator.js';
import {
  FURNITURE_DATABASE,
  getScaledFurnitureDimensions,
  filterFurnitureCatalog
} from '../core/furniture.js';
import {
  createDimensionEntry,
  updateDimensionEntry,
  duplicateDimensionEntry,
  createGroup,
  parseQuickAddString,
  formatMeasurementValue,
  calculateEntryValues,
  calculateWorkspaceTotals,
  calculateGroupTotals,
  formatWorkspaceForClipboard,
  createDefaultWorkspace,
  serializeWorkspace,
  deserializeWorkspace,
  WORKSPACE_STORAGE_KEY,
  DEFAULT_WORKSPACE_SCALE,
  DEFAULT_DISPLAY_UNIT,
  DEFAULT_DIMENSION_TYPE,
  DEFAULT_DENSITY,
  SUPPORTED_DISPLAY_UNITS,
  SUPPORTED_DIMENSION_TYPES
} from '../core/dimension-workspace.js';
import {
  evaluateExpression,
  evaluateExpressionSafe,
  isExpressionLike,
  EXPRESSION_ERROR_CODES
} from '../core/dimension-expression.js';
import {
  getDefaultComparisonScales,
  getScalePresetGroups,
  parseMultiScaleInput,
  calculateAtScale,
  compareAcrossScales,
  formatScaleComparison,
  STANDARD_PAPER_SIZES,
  SCALE_PRESET_GROUPS
} from '../core/multi-scale.js';
import {
  createDimensionChain,
  createChainSegment,
  parseSegmentMeasurement,
  parseQuickChainInput,
  calculateChain,
  generateChainSVG,
  formatChainForClipboard,
  convertChainToWorkspaceGroup,
  CHAIN_TEMPLATES,
  CHAIN_STORAGE_KEY
} from '../core/dimension-chains.js';
import {
  CAD_FORMAT_PRESETS,
  CAD_STORAGE_KEY,
  formatCadValue,
  formatCadValues,
  formatCadWorkspace,
  formatCadChain,
  formatCadMultiScale,
  formatCadExpression,
  formatManualCadInput,
  getCadFormatSummary
} from '../core/cad-clipboard.js';
import {
  BATCH_PRESETS,
  BATCH_STORAGE_KEY,
  detectBatchDelimiter,
  parseBatchRow,
  parseBatchInput,
  convertBatchRow,
  convertBatch,
  filterBatchRows,
  formatBatchResults,
  convertBatchToWorkspaceGroup,
  convertBatchToDimensionChain
} from '../core/batch-cad.js';
import { StorageService } from '../services/storage.js';
import { AudioService } from '../services/audio.js';
import { HistoryService } from '../services/history.js';
import { CommandRegistry } from '../services/commands.js';
import { updateVisualization, getFurniturePlanSVG } from './visualizer.js';

export function initializeApp() {
  const state = {
    currentMode: 'converter',
    activeTheme: StorageService.getItem('archi_theme') || 'dark',
    precision: 3,

    // Mode 1: Converter
    direction: 'drawing_to_real',
    scaleRatio: 50,
    selectedPresetId: '1:50',
    selectedCategory: 'all',
    converterInputVal: '10',
    converterInputUnit: 'cm',
    converterOutputUnit: 'm',

    // Mode 2: Rescale
    rescaleOrigRatio: 50,
    rescaleOrigVal: '12',
    rescaleOrigUnit: 'cm',
    rescaleTargetRatio: 200,
    rescaleTargetUnit: 'cm',

    // Mode 3: Detector
    detectPaperVal: '4.5',
    detectPaperUnit: 'cm',
    detectRealVal: '9',
    detectRealUnit: 'm',
    lastDetectedRatio: null,

    // Mode 4: Area & Volume
    calcType: 'area', // 'area' | 'volume'
    calcDirection: 'drawing_to_real', // 'drawing_to_real' | 'real_to_drawing'
    areaOrigVal: '25',
    areaOrigUnit: 'sq_m',
    areaRatio: 50,
    areaTargetUnit: 'sq_cm',
    volOrigVal: '100',
    volOrigUnit: 'cu_m',
    volRatio: 50,
    volTargetUnit: 'cu_cm',

    // Mode 5: Furniture
    furnitureSearchQuery: '',
    furnitureActiveCategory: 'all',
    selectedCategory: 'all',
    furnitureScaleRatio: 50,
    furnitureDisplayUnit: 'cm',
    furnitureCustomWidth: '',
    furnitureCustomDepth: '',
    furnitureCustomHeight: '',
    furniturePaperUnit: 'cm',
    furnitureSortKey: 'default',
    furnitureDensity: 'comfortable',
    customFurnName: 'Custom Piece',
    customFurnW: 240,
    customFurnD: 100,
    customFurnUnit: 'cm',

    // Mode 6: Reference
    refScaleRatio: 50,
    refSheetDensity: 'standard', // 'standard' | 'compact'

    // Mode 7: Dimension Workspace
    workspace: deserializeWorkspace(StorageService.getItem(WORKSPACE_STORAGE_KEY)),
    workspaceSelectedIds: new Set(),
    workspaceEditingCell: null, // { id: string, field: string }

    // Mode 8: Dimension Expression
    lastValidExpression: null,
    recentExpressions: [],

    // Mode 9: Multi-Scale Comparison
    multiscaleInput: '2400',
    multiscaleDefaultUnit: 'mm',
    multiscaleDisplayUnit: 'mm',
    multiscaleGroup: 'all',
    multiscaleCustomScales: [],
    multiscaleSortOrder: 'ratio_asc',
    multiscalePaperSize: 'none',
    multiscaleFitMin: null,
    multiscaleFitMax: null,
    multiscaleFavorites: (() => {
      try {
        const stored = StorageService.getItem('archiscale_multiscale_favs');
        return stored ? JSON.parse(stored) : [20, 50, 100];
      } catch (e) {
        return [20, 50, 100];
      }
    })(),
    lastValidMultiScale: null,

    // Mode 10: Dimension Chains
    activeChain: (() => {
      try {
        const stored = StorageService.getItem(CHAIN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.segments)) return parsed;
        }
      } catch (e) {}
      return createDimensionChain({
        name: 'North Wall Sequence',
        defaultUnit: 'mm',
        scaleRatio: 50,
        segments: [ ...CHAIN_TEMPLATES.wall_opening.segments ]
      });
    })(),
    chainSelectedSegmentId: null,
    lastValidChain: null,

    // Mode 11: CAD Clipboard
    cadClipboard: (() => {
      try {
        const stored = StorageService.getItem(CAD_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
      return {
        source: 'workspace',
        preset: 'generic',
        targetValue: 'real',
        unit: 'mm',
        precision: 2,
        suffix: 'none',
        delimiter: 'space',
        filterScope: 'all',
        manualInput: '',
        lastFormattedText: ''
      };
    })(),

    // Mode 12: Batch CAD Conversion
    batchCad: (() => {
      try {
        const stored = StorageService.getItem(BATCH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.selectedIds)) {
              parsed.selectedIds = new Set(parsed.selectedIds);
            } else {
              parsed.selectedIds = new Set();
            }
            return parsed;
          }
        }
      } catch (e) {}
      return {
        rawInput: 'Wall North = 4800mm\nSEG Wall South = 3200mm\nWindow 1 = 1800 + 300\nALW Tolerance = 20mm\nDoor Entrance = 900\n2.4m\n7\' 6"',
        mode: 'real_to_drawing',
        sourceUnit: 'mm',
        sourceScale: 1,
        targetUnit: 'mm',
        targetScale: 50,
        precision: 2,
        delimiter: 'auto',
        activeFilter: 'all',
        selectedIds: new Set(),
        lastResult: null
      };
    })(),

    // Cached Previous Valid Calculations (Never wipe to empty on invalid keystroke)
    lastValidConverter: null,
    lastValidRescale: null,
    lastValidDetector: null,
    lastValidAreavol: null
  };

  // DOM Elements Cache (Strictly normalized with index.html)
  const dom = {
    // Header & Global Modals
    themeSelect: document.getElementById('theme-select'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    soundToggleLabel: document.getElementById('sound-toggle-label'),
    commandPaletteBtn: document.getElementById('command-palette-btn'),
    commandPaletteModal: document.getElementById('command-palette-modal'),
    commandPaletteOverlay: document.getElementById('command-palette-overlay'),
    commandPaletteInput: document.getElementById('command-palette-input'),
    commandPaletteList: document.getElementById('command-palette-list'),
    closeCommandPaletteBtn: document.getElementById('close-command-palette-btn'),
    historyToggleBtn: document.getElementById('history-toggle-btn'),
    shortcutsHelpBtn: document.getElementById('shortcuts-help-btn'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    closeShortcutsBtn: document.getElementById('close-shortcuts-btn'),
    historyDrawer: document.getElementById('history-drawer'),
    historyOverlay: document.getElementById('history-overlay'),
    closeHistoryBtn: document.getElementById('close-history-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    exportMdBtn: document.getElementById('export-md-btn'),
    historyCountBadge: document.getElementById('history-count-badge'),
    historyList: document.getElementById('history-list'),
    toastContainer: document.getElementById('toast-container'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    modeViews: document.querySelectorAll('.tool-mode-view'),

    // Mode 1: Converter Elements
    activeScaleBadge: document.getElementById('active-scale-badge'),
    presetCategoryPills: document.getElementById('preset-category-pills'),
    presetPillBtns: document.querySelectorAll('.preset-pill-btn'),
    presetsGrid: document.getElementById('presets-grid'),
    scaleRatioInput: document.getElementById('scale-ratio-input'),
    converterInputVal: document.getElementById('converter-input-val'),
    converterInputUnit: document.getElementById('converter-input-unit'),
    converterInputBadge: document.getElementById('converter-input-badge'),
    swapDirectionBtn: document.getElementById('swap-direction-btn'),
    converterOutputUnit: document.getElementById('converter-output-unit'),
    converterOutputBadge: document.getElementById('converter-output-badge'),
    btnRunConverter: document.getElementById('btn-run-converter'),
    converterErrorMsg: document.getElementById('converter-error-msg'),
    converterResultVal: document.getElementById('converter-result-val'),
    converterResultUnit: document.getElementById('converter-result-unit'),
    btnCopyResult: document.getElementById('btn-copy-result'),
    btnSaveHistory: document.getElementById('btn-save-history'),
    visualizerContainer: document.getElementById('visualizer-container'),
    metricBreakdownList: document.getElementById('metric-breakdown-list'),
    imperialBreakdownList: document.getElementById('imperial-breakdown-list'),
    converterMathFormula: document.getElementById('converter-math-formula'),
    converterFlowFrom: document.getElementById('converter-flow-from'),
    converterFlowTo: document.getElementById('converter-flow-to'),
    converterSecondaryReadout: document.getElementById('converter-secondary-readout'),
    converterResultStaleTag: document.getElementById('converter-result-stale-tag'),

    // Mode 2: Rescaler Elements
    rescaleOrigRatio: document.getElementById('rescale-orig-ratio'),
    rescaleOrigVal: document.getElementById('rescale-orig-val'),
    rescaleOrigUnit: document.getElementById('rescale-orig-unit'),
    rescaleTargetRatio: document.getElementById('rescale-target-ratio'),
    rescaleTargetUnit: document.getElementById('rescale-target-unit'),
    btnRunRescale: document.getElementById('btn-run-rescale'),
    rescaleErrorMsg: document.getElementById('rescale-error-msg'),
    rescaleResultVal: document.getElementById('rescale-result-val'),
    rescaleResultUnit: document.getElementById('rescale-result-unit'),
    rescaleFactorBadge: document.getElementById('rescale-factor-badge'),
    rescaleRealSpan: document.getElementById('rescale-real-span'),
    btnCopyRescale: document.getElementById('btn-copy-rescale'),
    rescaleMathFormula: document.getElementById('rescale-math-formula'),
    rescaleResultStaleTag: document.getElementById('rescale-result-stale-tag'),

    // Mode 3: Detector Elements
    detectorPaperVal: document.getElementById('detector-paper-val'),
    detectorPaperUnit: document.getElementById('detector-paper-unit'),
    detectorRealVal: document.getElementById('detector-real-val'),
    detectorRealUnit: document.getElementById('detector-real-unit'),
    btnRunDetector: document.getElementById('btn-run-detector'),
    detectorErrorMsg: document.getElementById('detector-error-msg'),
    detectorRatioVal: document.getElementById('detector-ratio-val'),
    detectorPresetBadge: document.getElementById('detector-preset-badge'),
    btnApplyDetected: document.getElementById('btn-apply-detected'),
    detectorMathFormula: document.getElementById('detector-math-formula'),
    detectorResultStaleTag: document.getElementById('detector-result-stale-tag'),

    // Mode 4: Area & Volume Elements
    areavolTypeBtns: document.querySelectorAll('.areavol-type-btn'),
    areavolDirBtns: document.querySelectorAll('.areavol-dir-btn'),
    areavolRatioInput: document.getElementById('areavol-ratio-input'),
    areavolInputVal: document.getElementById('areavol-input-val'),
    areavolInputUnit: document.getElementById('areavol-input-unit'),
    areavolOutputUnit: document.getElementById('areavol-output-unit'),
    areavolInputBadge: document.getElementById('areavol-input-badge'),
    areavolOutputBadge: document.getElementById('areavol-output-badge'),
    btnRunAreavol: document.getElementById('btn-run-areavol'),
    areavolErrorMsg: document.getElementById('areavol-error-msg'),
    areavolResultVal: document.getElementById('areavol-result-val'),
    areavolResultUnit: document.getElementById('areavol-result-unit'),
    areavolFactorBadge: document.getElementById('areavol-factor-badge'),
    btnCopyAreavol: document.getElementById('btn-copy-areavol'),
    areavolMathFormula: document.getElementById('areavol-math-formula'),
    areavolResultStaleTag: document.getElementById('areavol-result-stale-tag'),

    // Mode 5: Furniture Elements
    furnitureSearchInput: document.getElementById('furniture-search-input'),
    clearFurnitureSearchBtn: document.getElementById('clear-furniture-search-btn'),
    furnitureResultsCount: document.getElementById('furniture-results-count'),
    furnScalePresets: document.getElementById('furn-scale-presets'),
    furnScaleRatioInput: document.getElementById('furn-scale-ratio-input'),
    furnPaperUnitSelect: document.getElementById('furn-paper-unit-select'),
    furnSortSelect: document.getElementById('furn-sort-select'),
    furnDensityBtns: document.querySelectorAll('.furn-density-btn'),
    furnCategoryNav: document.getElementById('furn-category-nav'),
    furnitureCardsGrid: document.getElementById('furniture-cards-grid'),
    customFurnName: document.getElementById('custom-furn-name'),
    customFurnW: document.getElementById('custom-furn-w'),
    customFurnD: document.getElementById('custom-furn-d'),
    customFurnUnit: document.getElementById('custom-furn-unit'),
    btnRunCustomFurn: document.getElementById('btn-run-custom-furn'),
    customFurnResult: document.getElementById('custom-furn-result'),
    btnPlannerCustomFurn: document.getElementById('btn-planner-custom-furn'),
    btnCopyCustomFurn: document.getElementById('btn-copy-custom-furn'),
    btnSendCustomFurn: document.getElementById('btn-send-custom-furn'),

    // Mode 6: Reference Elements
    refScaleSelect: document.getElementById('ref-scale-select'),
    btnPrintRef: document.getElementById('btn-print-ref'),
    refTableBody: document.getElementById('ref-table-body'),
    refActiveScaleBadge: document.getElementById('ref-active-scale-badge'),
    refQuickChips: document.getElementById('ref-quick-chips'),
    refDensityBtnStandard: document.getElementById('ref-density-btn-standard'),
    refDensityBtnCompact: document.getElementById('ref-density-btn-compact'),
    refRulerContainer: document.getElementById('ref-ruler-container'),
    refRulerScaleLabel: document.getElementById('ref-ruler-scale-label'),
    refBenchmarksGrid: document.getElementById('ref-benchmarks-grid'),
    refBenchmarksScaleLabel: document.getElementById('ref-benchmarks-scale-label'),
    refDataTable: document.getElementById('ref-data-table'),
    refTbScale: document.getElementById('ref-tb-scale'),
    refTbDate: document.getElementById('ref-tb-date'),

    // Unified Result State Elements
    converterStateBadge: document.getElementById('converter-state-badge'),
    converterContextStrip: document.getElementById('converter-context-strip'),
    rescaleStateBadge: document.getElementById('rescale-state-badge'),
    rescaleContextStrip: document.getElementById('rescale-context-strip'),
    detectorStateBadge: document.getElementById('detector-state-badge'),
    detectorContextStrip: document.getElementById('detector-context-strip'),
    areavolStateBadge: document.getElementById('areavol-state-badge'),
    areavolContextStrip: document.getElementById('areavol-context-strip'),
    customFurnStateBadge: document.getElementById('custom-furn-state-badge'),

    // Mode 7: Dimension Workspace Elements
    workspaceDensityStandard: document.getElementById('workspace-density-standard'),
    workspaceDensityCompact: document.getElementById('workspace-density-compact'),
    workspaceStateBadge: document.getElementById('workspace-state-badge'),
    workspaceScaleSelect: document.getElementById('workspace-scale-select'),
    workspaceCustomScaleGroup: document.getElementById('workspace-custom-scale-group'),
    workspaceCustomScaleInput: document.getElementById('workspace-custom-scale-input'),
    workspaceUnitSelect: document.getElementById('workspace-unit-select'),
    workspaceQuickChips: document.getElementById('workspace-quick-chips'),
    workspaceAddForm: document.getElementById('workspace-add-form'),
    workspaceAddType: document.getElementById('workspace-add-type'),
    workspaceAddName: document.getElementById('workspace-add-name'),
    workspaceAddInput: document.getElementById('workspace-add-input'),
    workspaceAddUnit: document.getElementById('workspace-add-unit'),
    workspaceAddNotes: document.getElementById('workspace-add-notes'),
    workspaceAddBtn: document.getElementById('workspace-add-btn'),
    workspaceAddError: document.getElementById('workspace-add-error'),
    workspaceBreakdownBadge: document.getElementById('workspace-breakdown-badge'),
    workspaceSelectionStatus: document.getElementById('workspace-selection-status'),
    workspaceSelectionCount: document.getElementById('workspace-selection-count'),
    workspaceSelectAll: document.getElementById('workspace-select-all'),
    workspaceTable: document.getElementById('workspace-table'),
    workspaceTableBody: document.getElementById('workspace-table-body'),
    workspaceThDrawing: document.getElementById('workspace-th-drawing'),
    workspaceCardsList: document.getElementById('workspace-cards-list'),
    workspaceEmptyState: document.getElementById('workspace-empty-state'),
    workspaceLoadSamplesBtn: document.getElementById('workspace-load-samples-btn'),
    workspaceTotalsCard: document.getElementById('workspace-totals-card'),
    workspaceActiveCount: document.getElementById('workspace-active-count'),
    workspaceTotalSegmentsReal: document.getElementById('workspace-total-segments-real'),
    workspaceTotalSegmentsDrawing: document.getElementById('workspace-total-segments-drawing'),
    workspaceTotalAllowancesReal: document.getElementById('workspace-total-allowances-real'),
    workspaceTotalAllowancesDrawing: document.getElementById('workspace-total-allowances-drawing'),
    workspaceTotalCombinedReal: document.getElementById('workspace-total-combined-real'),
    workspaceTotalCombinedDrawing: document.getElementById('workspace-total-combined-drawing'),
    workspaceTotalReferencesReal: document.getElementById('workspace-total-references-real'),
    workspaceReferencesCountLabel: document.getElementById('workspace-references-count-label'),
    workspaceTotalRealVal: document.getElementById('workspace-total-real-val'),
    workspaceTotalDrawingVal: document.getElementById('workspace-total-drawing-val'),
    workspaceTotalDrawingLabel: document.getElementById('workspace-total-drawing-label'),
    workspaceActionsToolbar: document.getElementById('workspace-actions-toolbar'),
    workspaceCopySelectedBtn: document.getElementById('workspace-copy-selected-btn'),
    workspaceCopySegmentsBtn: document.getElementById('workspace-copy-segments-btn'),
    workspaceCopyReferencesBtn: document.getElementById('workspace-copy-references-btn'),
    workspaceCopyAllBtn: document.getElementById('workspace-copy-all-btn'),
    workspaceCopyRawBtn: document.getElementById('workspace-copy-raw-btn'),
    workspaceCopyDrawingBtn: document.getElementById('workspace-copy-drawing-btn'),
    workspaceExportTsvBtn: document.getElementById('workspace-export-tsv-btn'),
    workspaceAddGroupBtn: document.getElementById('workspace-add-group-btn'),
    workspaceSaveJournalBtn: document.getElementById('workspace-save-journal-btn'),
    workspaceClearBtn: document.getElementById('workspace-clear-btn'),

    // Mode 8: Dimension Expression
    expressionStateBadge: document.getElementById('expression-state-badge'),
    expressionInput: document.getElementById('expression-input'),
    expressionLivePreview: document.getElementById('expression-live-preview'),
    expressionClearInputBtn: document.getElementById('expression-clear-input-btn'),
    expressionErrorMsg: document.getElementById('expression-error-msg'),
    expressionDefaultUnit: document.getElementById('expression-default-unit'),
    expressionScaleSelect: document.getElementById('expression-scale-select'),
    expressionCustomScaleGroup: document.getElementById('expression-custom-scale-group'),
    expressionCustomScaleInput: document.getElementById('expression-custom-scale-input'),
    btnRunExpression: document.getElementById('btn-run-expression'),
    expressionDimBadge: document.getElementById('expression-dim-badge'),
    expressionResultVal: document.getElementById('expression-result-val'),
    expressionResultUnit: document.getElementById('expression-result-unit'),
    expressionDrawingLabel: document.getElementById('expression-drawing-label'),
    expressionDrawingVal: document.getElementById('expression-drawing-val'),
    expressionSecondaryReadout: document.getElementById('expression-secondary-readout'),
    expressionCopyBtn: document.getElementById('expression-copy-btn'),
    expressionCopyRawBtn: document.getElementById('expression-copy-raw-btn'),
    expressionCopyDrawingBtn: document.getElementById('expression-copy-drawing-btn'),
    expressionAddName: document.getElementById('expression-add-name'),
    expressionAddRoleSelect: document.getElementById('expression-add-role-select'),
    expressionAddWorkspaceBtn: document.getElementById('expression-add-workspace-btn'),
    expressionSaveJournalBtn: document.getElementById('expression-save-journal-btn'),
    expressionRecentList: document.getElementById('expression-recent-list'),
    expressionClearRecentBtn: document.getElementById('expression-clear-recent-btn'),
    expressionCompareBtn: document.getElementById('expression-compare-btn'),

    // Mode 9: Multi-Scale Comparison
    multiscaleStateBadge: document.getElementById('multiscale-state-badge'),
    multiscaleInput: document.getElementById('multiscale-input'),
    multiscaleLivePreview: document.getElementById('multiscale-live-preview'),
    multiscaleClearInputBtn: document.getElementById('multiscale-clear-input-btn'),
    multiscaleErrorMsg: document.getElementById('multiscale-error-msg'),
    multiscaleDefaultUnit: document.getElementById('multiscale-default-unit'),
    multiscaleDisplayUnit: document.getElementById('multiscale-display-unit'),
    multiscaleCustomScaleInput: document.getElementById('multiscale-custom-scale-input'),
    multiscaleAddScaleBtn: document.getElementById('multiscale-add-scale-btn'),
    multiscaleSortSelect: document.getElementById('multiscale-sort-select'),
    multiscalePaperSelect: document.getElementById('multiscale-paper-select'),
    multiscaleFitMin: document.getElementById('multiscale-fit-min'),
    multiscaleFitMax: document.getElementById('multiscale-fit-max'),
    btnRunMultiscale: document.getElementById('btn-run-multiscale'),
    multiscaleCountBadge: document.getElementById('multiscale-count-badge'),
    multiscaleRealLabel: document.getElementById('multiscale-real-label'),
    multiscaleRealVal: document.getElementById('multiscale-real-val'),
    multiscaleTableContainer: document.getElementById('multiscale-table-container'),
    multiscaleTable: document.getElementById('multiscale-table'),
    multiscaleTableBody: document.getElementById('multiscale-table-body'),
    multiscaleEmptyState: document.getElementById('multiscale-empty-state'),
    multiscaleLoadSampleBtn: document.getElementById('multiscale-load-sample-btn'),
    multiscaleCopyTableBtn: document.getElementById('multiscale-copy-table-btn'),
    multiscaleCopyAllBtn: document.getElementById('multiscale-copy-all-btn'),
    multiscaleCopyCurrentBtn: document.getElementById('multiscale-copy-current-btn'),
    multiscaleCopyRawBtn: document.getElementById('multiscale-copy-raw-btn'),

    // Mode 10: Dimension Chains
    chainsStateBadge: document.getElementById('chains-state-badge'),
    chainsNameInput: document.getElementById('chains-name-input'),
    chainsScaleSelect: document.getElementById('chains-scale-select'),
    chainsUnitSelect: document.getElementById('chains-unit-select'),
    chainsStartOffsetInput: document.getElementById('chains-start-offset-input'),
    chainsEndOffsetInput: document.getElementById('chains-end-offset-input'),
    chainsQuickInput: document.getElementById('chains-quick-input'),
    chainsLivePreview: document.getElementById('chains-live-preview'),
    chainsAddBtn: document.getElementById('chains-add-btn'),
    chainsClearInputBtn: document.getElementById('chains-clear-input-btn'),
    chainsErrorMsg: document.getElementById('chains-error-msg'),
    chainsClearAllBtn: document.getElementById('chains-clear-all-btn'),
    chainsZoomFitBtn: document.getElementById('chains-zoom-fit-btn'),
    chainsSvgViewportWrapper: document.getElementById('chains-svg-viewport-wrapper'),
    chainsSelectedInspector: document.getElementById('chains-selected-inspector'),
    chainsInspectorName: document.getElementById('chains-inspector-name'),
    chainsInspectorLen: document.getElementById('chains-inspector-len'),
    chainsInspectorStart: document.getElementById('chains-inspector-start'),
    chainsInspectorEnd: document.getElementById('chains-inspector-end'),
    chainsInspectorDraw: document.getElementById('chains-inspector-draw'),
    chainsTable: document.getElementById('chains-table'),
    chainsTableBody: document.getElementById('chains-table-body'),
    btnRunChains: document.getElementById('btn-run-chains'),
    chainsCountBadge: document.getElementById('chains-count-badge'),
    chainsOverallVal: document.getElementById('chains-overall-val'),
    chainsDrawingOverall: document.getElementById('chains-drawing-overall'),
    chainsSegTotalVal: document.getElementById('chains-seg-total-val'),
    chainsAlwTotalVal: document.getElementById('chains-alw-total-val'),
    chainsStartOffsetVal: document.getElementById('chains-start-offset-val'),
    chainsEndOffsetVal: document.getElementById('chains-end-offset-val'),
    chainsCompareMultiscaleBtn: document.getElementById('chains-compare-multiscale-btn'),
    chainsSendWorkspaceBtn: document.getElementById('chains-send-workspace-btn'),
    chainsSaveJournalBtn: document.getElementById('chains-save-journal-btn'),
    chainsCopyTableBtn: document.getElementById('chains-copy-table-btn'),
    chainsCopyCumBtn: document.getElementById('chains-copy-cum-btn'),
    chainsCopySegsBtn: document.getElementById('chains-copy-segs-btn'),
    chainsCopyDrawBtn: document.getElementById('chains-copy-draw-btn'),
    chainsExportTsvBtn: document.getElementById('chains-export-tsv-btn'),

    // Mode 11: CAD Clipboard
    cadStateBadge: document.getElementById('cad-state-badge'),
    cadQuickChips: document.getElementById('cad-quick-chips'),
    cadSourcePills: document.getElementById('cad-source-pills'),
    cadSourceCountBadge: document.getElementById('cad-source-count-badge'),
    cadManualGroup: document.getElementById('cad-manual-group'),
    cadManualInput: document.getElementById('cad-manual-input'),
    cadTargetSelect: document.getElementById('cad-target-select'),
    cadUnitSelect: document.getElementById('cad-unit-select'),
    cadPrecisionSelect: document.getElementById('cad-precision-select'),
    cadSuffixSelect: document.getElementById('cad-suffix-select'),
    cadDelimiterSelect: document.getElementById('cad-delimiter-select'),
    cadScopeSelect: document.getElementById('cad-scope-select'),
    btnRunCadClipboard: document.getElementById('btn-run-cad-clipboard'),
    cadResultPanel: document.getElementById('cad-result-panel'),
    cadSummaryBadge: document.getElementById('cad-summary-badge'),
    cadPreviewBox: document.getElementById('cad-preview-box'),
    btnCadCopyMain: document.getElementById('btn-cad-copy-main'),
    btnCadCopyRaw: document.getElementById('btn-cad-copy-raw'),
    btnCadCopyUnits: document.getElementById('btn-cad-copy-units'),
    btnCadCopyTsv: document.getElementById('btn-cad-copy-tsv'),
    btnCadExportTxt: document.getElementById('btn-cad-export-txt'),

    // Cross-Mode CAD Handoff Buttons
    wsOpenCadBtn: document.getElementById('workspace-open-cad-btn'),
    exprCadHandoffBtn: document.getElementById('expression-cad-handoff-btn'),
    msCadHandoffBtn: document.getElementById('multiscale-cad-handoff-btn'),
    chainsCadHandoffBtn: document.getElementById('chains-cad-handoff-btn'),

    // Mode 12: Batch CAD Conversion
    batchStateBadge: document.getElementById('batch-state-badge'),
    batchQuickChips: document.getElementById('batch-quick-chips'),
    batchDelimiterBadge: document.getElementById('batch-delimiter-badge'),
    batchPasteInput: document.getElementById('batch-paste-input'),
    batchModeSelect: document.getElementById('batch-mode-select'),
    batchSourceScaleGroup: document.getElementById('batch-source-scale-group'),
    batchSourceScaleSelect: document.getElementById('batch-source-scale-select'),
    batchTargetScaleGroup: document.getElementById('batch-target-scale-group'),
    batchTargetScaleSelect: document.getElementById('batch-target-scale-select'),
    batchSourceUnitSelect: document.getElementById('batch-source-unit-select'),
    batchTargetUnitSelect: document.getElementById('batch-target-unit-select'),
    batchPrecisionSelect: document.getElementById('batch-precision-select'),
    batchDelimiterSelect: document.getElementById('batch-delimiter-select'),
    btnRunBatchCad: document.getElementById('btn-run-batch-cad'),
    batchResultPanel: document.getElementById('batch-result-panel'),
    batchMetricTotal: document.getElementById('batch-metric-total'),
    batchMetricValid: document.getElementById('batch-metric-valid'),
    batchMetricInvalid: document.getElementById('batch-metric-invalid'),
    batchFilterPills: document.getElementById('batch-filter-pills'),
    filterCountAll: document.getElementById('filter-count-all'),
    filterCountValid: document.getElementById('filter-count-valid'),
    filterCountInvalid: document.getElementById('filter-count-invalid'),
    filterCountSelected: document.getElementById('filter-count-selected'),
    batchSelectAllBtn: document.getElementById('batch-select-all-btn'),
    batchClearSelectionBtn: document.getElementById('batch-clear-selection-btn'),
    batchTable: document.getElementById('batch-table'),
    batchTableBody: document.getElementById('batch-table-body'),
    batchMasterCheckbox: document.getElementById('batch-master-checkbox'),
    batchEmptyState: document.getElementById('batch-empty-state'),
    batchLoadSampleBtn: document.getElementById('batch-load-sample-btn'),
    batchCopyResultsBtn: document.getElementById('batch-copy-results-btn'),
    batchCopyRawBtn: document.getElementById('batch-copy-raw-btn'),
    batchCopyTsvBtn: document.getElementById('batch-copy-tsv-btn'),
    batchOpenCadBtn: document.getElementById('batch-open-cad-btn'),
    batchSendWorkspaceBtn: document.getElementById('batch-send-workspace-btn'),
    batchCompareMultiscaleBtn: document.getElementById('batch-compare-multiscale-btn'),
    batchCreateChainBtn: document.getElementById('batch-create-chain-btn'),
    batchSaveJournalBtn: document.getElementById('batch-save-journal-btn')
  };

  // ---------------------------------------------------------------------------
  // Unified Result Pattern & Lifecycle Manager (READY -> RUNNING -> SUCCESS / ERROR)
  // ---------------------------------------------------------------------------
  function setUnifiedResultState({
    toolPrefix,
    status, // 'ready' | 'running' | 'success' | 'error'
    errorText = '',
    context = null,
    btn = null
  }) {
    const panel = document.getElementById(`${toolPrefix}-result-panel`) || document.querySelector(`.${toolPrefix}-result-box`) || document.querySelector(`.${toolPrefix}-result-row`);
    const badge = document.getElementById(`${toolPrefix}-state-badge`);
    const errorBanner = document.getElementById(`${toolPrefix}-error-msg`);
    const staleTag = document.getElementById(`${toolPrefix}-result-stale-tag`);
    const contextStrip = document.getElementById(`${toolPrefix}-context-strip`);

    if (panel) panel.dataset.state = status;

    if (badge) {
      badge.className = `result-state-pill state-${status}`;
      switch (status) {
        case 'ready': badge.textContent = 'READY'; break;
        case 'running': badge.textContent = 'CALCULATING...'; break;
        case 'success': badge.textContent = 'SUCCESS'; break;
        case 'error': badge.textContent = 'CORRECTION REQUIRED'; break;
      }
    }

    if (status === 'error') {
      if (errorBanner) {
        errorBanner.textContent = errorText;
        errorBanner.style.display = 'flex';
      }
      if (staleTag) staleTag.style.display = 'inline-block';
      if (btn) setRunButtonState(btn, 'error');
    } else if (status === 'success') {
      if (errorBanner) errorBanner.style.display = 'none';
      if (staleTag) staleTag.style.display = 'none';
      if (panel) {
        panel.classList.remove('result-pulse');
        void panel.offsetWidth;
        panel.classList.add('result-pulse');
        setTimeout(() => panel.classList.remove('result-pulse'), 200);
      }
      if (btn) setRunButtonState(btn, 'success');
    } else if (status === 'running') {
      if (btn) setRunButtonState(btn, 'running');
    }

    if (contextStrip && context) {
      contextStrip.innerHTML = Object.entries(context)
        .map(([k, v]) => `<span class="context-pill"><strong>${k}:</strong> ${v}</span>`)
        .join('');
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Toast Notification System
  // ---------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  function copyToClipboard(text, label = 'Copied to clipboard') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          AudioService.playCopySuccess();
          showToast(`📋 ${label}: ${text}`);
        })
        .catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      AudioService.playCopySuccess();
      showToast(`📋 ${label}: ${text}`);
    } catch (err) {
      showToast('Could not copy to clipboard', 'error');
    }
    document.body.removeChild(el);
  }

  // ---------------------------------------------------------------------------
  // 2. Theme & Sound Management
  // ---------------------------------------------------------------------------
  function applyTheme(themeName) {
    state.activeTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    StorageService.setItem('archi_theme', themeName);
    if (dom.themeSelect) dom.themeSelect.value = themeName;
  }

  function updateSoundUI() {
    const isEnabled = AudioService.isEnabled();
    if (dom.soundToggleBtn) {
      dom.soundToggleBtn.classList.toggle('active', isEnabled);
      if (dom.soundToggleLabel) {
        dom.soundToggleLabel.textContent = isEnabled ? 'Sound: On' : 'Sound: Muted';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Mode Navigation Switching
  // ---------------------------------------------------------------------------
  function switchMode(targetMode) {
    state.currentMode = targetMode;

    // Update Mode Tabs
    dom.modeTabs.forEach(tab => {
      const mode = tab.dataset.mode;
      const isActive = mode === targetMode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update Tool Views
    dom.modeViews.forEach(view => {
      const expectedId = `mode-view-${targetMode}`;
      const isTarget = view.id === expectedId;
      view.classList.toggle('active', isTarget);
      if (isTarget) {
        view.removeAttribute('hidden');
      } else {
        view.setAttribute('hidden', '');
      }
    });

    AudioService.playTick();

    // Trigger calculation refresh for active mode
    if (targetMode === 'converter') calculateConverter();
    else if (targetMode === 'rescale') calculateRescaler();
    else if (targetMode === 'detector') calculateDetector();
    else if (targetMode === 'area_volume') calculateAreaVolume();
    else if (targetMode === 'furniture') renderFurnitureGrid();
    else if (targetMode === 'reference') renderReferenceChart();
    else if (targetMode === 'workspace') renderWorkspace();
    else if (targetMode === 'expression') {
      calculateExpression();
      renderRecentExpressions();
    }
    else if (targetMode === 'multiscale') {
      calculateMultiScale();
    }
    else if (targetMode === 'chains') {
      calculateAndRenderChain();
    }
    else if (targetMode === 'cad_clipboard') {
      renderCadClipboard();
    }
    else if (targetMode === 'batch_cad') {
      parseAndConvertBatch();
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Run Button State Controller
  // ---------------------------------------------------------------------------
  function setRunButtonState(btn, status, errorMsg = '') {
    if (!btn) return;
    btn.dataset.state = status;
    const btnText = btn.querySelector('.btn-text');

    if (status === 'running') {
      if (btnText) btnText.textContent = 'CALCULATING...';
      btn.disabled = true;
    } else if (status === 'success') {
      if (btnText) btnText.textContent = 'CALCULATED ✓';
      btn.disabled = false;
      setTimeout(() => {
        if (btn.dataset.state === 'success' && btnText) {
          btnText.textContent = 'RUN CALCULATION';
          btn.dataset.state = 'ready';
        }
      }, 1200);
    } else if (status === 'error') {
      if (btnText) btnText.textContent = 'CHECK INPUTS ⚠';
      btn.disabled = false;
    } else {
      if (btnText) btnText.textContent = 'RUN CALCULATION';
      btn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Populate Dropdowns (Units, Scales)
  // ---------------------------------------------------------------------------
  function populateUnitSelects() {
    const lengthEntries = Object.entries(UNITS);
    const areaEntries = Object.entries(AREA_UNITS);
    const volumeEntries = Object.entries(VOLUME_UNITS);

    const lengthOptions = lengthEntries.map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
    
    // Converter unit selects
    if (dom.converterInputUnit) dom.converterInputUnit.innerHTML = lengthOptions;
    if (dom.converterOutputUnit) dom.converterOutputUnit.innerHTML = lengthOptions;
    if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.innerHTML = lengthOptions;
    if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.innerHTML = lengthOptions;
    if (dom.detectorPaperUnit) dom.detectorPaperUnit.innerHTML = lengthOptions;
    if (dom.detectorRealUnit) dom.detectorRealUnit.innerHTML = lengthOptions;

    // Set initial values
    if (dom.converterInputUnit) dom.converterInputUnit.value = state.converterInputUnit;
    if (dom.converterOutputUnit) dom.converterOutputUnit.value = state.converterOutputUnit;
    if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.value = state.rescaleOrigUnit;
    if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.value = state.rescaleTargetUnit;
    if (dom.detectorPaperUnit) dom.detectorPaperUnit.value = state.detectPaperUnit;
    if (dom.detectorRealUnit) dom.detectorRealUnit.value = state.detectRealUnit;

    // Reference Scale Select
    if (dom.refScaleSelect) {
      dom.refScaleSelect.innerHTML = SCALE_PRESETS.map(p => `<option value="${p.ratio}">${p.name} — ${p.desc}</option>`).join('');
      dom.refScaleSelect.value = state.refScaleRatio;
    }

    updateAreaVolumeUnitSelects();
  }

  function updateAreaVolumeUnitSelects() {
    if (!dom.areavolInputUnit || !dom.areavolOutputUnit) return;
    if (state.calcType === 'area') {
      const opts = Object.entries(AREA_UNITS).map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
      dom.areavolInputUnit.innerHTML = opts;
      dom.areavolOutputUnit.innerHTML = opts;
      dom.areavolInputUnit.value = 'cm2';
      dom.areavolOutputUnit.value = 'm2';
    } else {
      const opts = Object.entries(VOLUME_UNITS).map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
      dom.areavolInputUnit.innerHTML = opts;
      dom.areavolOutputUnit.innerHTML = opts;
      dom.areavolInputUnit.value = 'cm3';
      dom.areavolOutputUnit.value = 'm3';
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Scale Preset Chips Renderer
  // ---------------------------------------------------------------------------
  function renderPresetChips(category = 'all') {
    if (!dom.presetsGrid) return;
    state.selectedCategory = category;

    const filtered = category === 'all'
      ? SCALE_PRESETS
      : SCALE_PRESETS.filter(p => p.category === category);

    dom.presetsGrid.innerHTML = filtered.map(preset => {
      const isSelected = preset.ratio === state.scaleRatio;
      return `
        <button class="preset-chip ${isSelected ? 'active' : ''}" data-ratio="${preset.ratio}" data-id="${preset.id}" title="${preset.desc}">
          <span class="preset-name">${preset.name}</span>
          <span class="preset-sub">${preset.category}</span>
        </button>
      `;
    }).join('');

    // Attach click listeners to preset chips
    dom.presetsGrid.querySelectorAll('.preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        state.scaleRatio = ratio;
        state.selectedPresetId = btn.dataset.id;
        if (dom.scaleRatioInput) dom.scaleRatioInput.value = ratio;
        if (dom.activeScaleBadge) dom.activeScaleBadge.textContent = `SCALE 1:${ratio}`;
        renderPresetChips(state.selectedCategory);
        AudioService.playTick();
        calculateConverter();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Mode 1: Scale Converter Engine
  // ---------------------------------------------------------------------------
  function calculateConverter() {
    const rawRatio = parseFloat(dom.scaleRatioInput?.value);
    const parsedRatio = isNaN(rawRatio) || rawRatio <= 0 ? 50 : rawRatio;
    state.scaleRatio = parsedRatio;

    const rawInput = dom.converterInputVal?.value || '';
    state.converterInputVal = rawInput;
    state.converterInputUnit = dom.converterInputUnit?.value || 'cm';
    state.converterOutputUnit = dom.converterOutputUnit?.value || 'm';

    // Actionable Empty Check
    if (!rawInput || rawInput.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: '⚠️ Drawing Measurement: Enter a measurement dimension (e.g. 10, 12.5, 3 1/2, or 12\'-6").',
        btn: dom.btnRunConverter
      });
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');
      if (state.lastValidConverter) {
        if (dom.converterResultVal) dom.converterResultVal.textContent = state.lastValidConverter.val;
        if (dom.converterResultUnit) dom.converterResultUnit.textContent = state.lastValidConverter.unit;
      }
      return;
    }

    const parseRes = parseInput(rawInput, { allowNegative: false });

    // Handle Unit Suffix extraction if user typed e.g. "15.5cm"
    if (parseRes.isValid && parseRes.detectedUnit) {
      state.converterInputUnit = parseRes.detectedUnit;
      if (dom.converterInputUnit) dom.converterInputUnit.value = parseRes.detectedUnit;
    }

    if (!parseRes.isValid || parseRes.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: `⚠️ Drawing Measurement: Enter a positive dimension greater than zero (${parseRes.error || 'e.g. 10, 12.5, 3 1/2'}).`,
        btn: dom.btnRunConverter
      });
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');

      // Preserve previous valid result if available
      if (state.lastValidConverter) {
        if (dom.converterResultVal) dom.converterResultVal.textContent = state.lastValidConverter.val;
        if (dom.converterResultUnit) dom.converterResultUnit.textContent = state.lastValidConverter.unit;
      } else {
        if (dom.converterResultVal) dom.converterResultVal.textContent = '---';
      }
      return;
    }

    if (dom.converterInputVal) dom.converterInputVal.classList.remove('input-error');

    try {
      const calcRes = scaleDimension({
        value: parseRes.value,
        unitKey: state.converterInputUnit,
        ratio: state.scaleRatio,
        direction: state.direction,
        targetUnitKey: state.converterOutputUnit
      });

      const formattedVal = formatNumber(calcRes.value, state.precision);

      // Cache valid result
      state.lastValidConverter = {
        val: formattedVal,
        unit: state.converterOutputUnit,
        realMeters: calcRes.realMeters
      };

      // Update Result Display
      if (dom.converterResultVal) {
        dom.converterResultVal.textContent = formattedVal;
      }
      if (dom.converterResultUnit) {
        dom.converterResultUnit.textContent = state.converterOutputUnit;
      }

      // Update Secondary Architectural Readout
      if (dom.converterSecondaryReadout) {
        const isMetric = ['mm', 'cm', 'm', 'km'].includes(state.converterOutputUnit);
        if (isMetric) {
          const inInches = calcRes.realMeters / UNITS.in.toMeters;
          const ftIn = formatFeetInches(inInches);
          const decFt = formatNumber(calcRes.realMeters / UNITS.ft.toMeters, 2);
          dom.converterSecondaryReadout.textContent = `${ftIn} (${decFt} ft)`;
        } else {
          const mVal = formatNumber(calcRes.realMeters, 3);
          const cmVal = formatNumber(calcRes.realMeters * 100, 1);
          dom.converterSecondaryReadout.textContent = `${mVal} m (${cmVal} cm)`;
        }
      }

      // Update Math Transformation Microcopy
      if (dom.converterMathFormula) {
        if (state.direction === 'drawing_to_real') {
          dom.converterMathFormula.innerHTML = `<strong>Formula:</strong> Real Site = Drawing (${formatNumber(parseRes.value, 2)} ${state.converterInputUnit}) × Scale (${state.scaleRatio}) = <strong>${formattedVal} ${state.converterOutputUnit}</strong>`;
        } else {
          dom.converterMathFormula.innerHTML = `<strong>Formula:</strong> Drawing Paper = Real Site (${formatNumber(parseRes.value, 2)} ${state.converterInputUnit}) ÷ Scale (${state.scaleRatio}) = <strong>${formattedVal} ${state.converterOutputUnit}</strong>`;
        }
      }

      // Update Breakdown Equivalents Table
      renderEquivalentsBreakdown(calcRes.realMeters);

      // Update Visual Scale Bar & Silhouette
      updateVisualization({
        realMeters: calcRes.realMeters,
        scaleRatio: state.scaleRatio,
        drawingMeters: calcRes.drawingMeters,
        containerId: 'visualizer-container'
      });

      // Update Unified Result Lifecycle State & Context Strip
      const directionLabel = state.direction === 'drawing_to_real' ? 'Paper Drawing' : 'Real Site';
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'success',
        context: {
          'Scale': `1:${state.scaleRatio}`,
          'Source Input': `${formatNumber(parseRes.value, 2)} ${state.converterInputUnit} (${directionLabel})`
        },
        btn: dom.btnRunConverter
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: `⚠️ Conversion error: ${err.message}`,
        btn: dom.btnRunConverter
      });
    }
  }

  function renderEquivalentsBreakdown(realMeters) {
    if (!dom.metricBreakdownList || !dom.imperialBreakdownList) return;
    try {
      const equivalents = getAllUnitEquivalents(realMeters);

      dom.metricBreakdownList.innerHTML = equivalents.metric.map(item => `
        <div class="equiv-row">
          <span class="equiv-name">${item.label}</span>
          <span class="equiv-val">${formatNumber(item.val, 3)} ${item.symbol}</span>
        </div>
      `).join('');

      dom.imperialBreakdownList.innerHTML = equivalents.imperial.map(item => `
        <div class="equiv-row">
          <span class="equiv-name">${item.label}</span>
          <span class="equiv-val">${item.key === 'ft_in' ? item.val : `${formatNumber(item.val, 3)} ${item.symbol}`}</span>
        </div>
      `).join('');
    } catch (e) {
      // Guard against non-finite breakdown
    }
  }

  function swapDirection() {
    state.direction = state.direction === 'drawing_to_real' ? 'real_to_drawing' : 'drawing_to_real';

    // Swap input/output unit selections
    const prevInUnit = dom.converterInputUnit?.value || 'cm';
    const prevOutUnit = dom.converterOutputUnit?.value || 'm';
    
    if (dom.converterInputUnit) dom.converterInputUnit.value = prevOutUnit;
    if (dom.converterOutputUnit) dom.converterOutputUnit.value = prevInUnit;

    state.converterInputUnit = prevOutUnit;
    state.converterOutputUnit = prevInUnit;

    if (state.direction === 'drawing_to_real') {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Drawing Measurement (Paper)';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Real-World Dimension';
      if (dom.converterFlowFrom) dom.converterFlowFrom.textContent = '📐 Paper Drawing';
      if (dom.converterFlowTo) dom.converterFlowTo.textContent = '🏛️ Real-World Site';
    } else {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Real-World Dimension';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Drawing Measurement (Paper)';
      if (dom.converterFlowFrom) dom.converterFlowFrom.textContent = '🏛️ Real-World Site';
      if (dom.converterFlowTo) dom.converterFlowTo.textContent = '📐 Paper Drawing';
    }

    AudioService.playSwapSound();
    calculateConverter();
  }

  // ---------------------------------------------------------------------------
  // 8. Mode 2: Rescaler Engine (Scale A -> Scale B)
  // ---------------------------------------------------------------------------
  function calculateRescaler() {
    const origRatio = parseFloat(dom.rescaleOrigRatio?.value);
    const targetRatio = parseFloat(dom.rescaleTargetRatio?.value);
    const rawVal = dom.rescaleOrigVal?.value || '';

    // Actionable Scale Validation
    if (isNaN(origRatio) || origRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Original Scale (Scale A): Enter a scale denominator greater than 0 (e.g. 50 for 1:50).',
        btn: dom.btnRunRescale
      });
      return;
    }

    if (isNaN(targetRatio) || targetRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Target Scale (Scale B): Enter a scale denominator greater than 0 (e.g. 200 for 1:200).',
        btn: dom.btnRunRescale
      });
      return;
    }

    state.rescaleOrigRatio = origRatio;
    state.rescaleTargetRatio = targetRatio;
    state.rescaleOrigUnit = dom.rescaleOrigUnit?.value || 'cm';
    state.rescaleTargetUnit = dom.rescaleTargetUnit?.value || 'cm';

    // Actionable Dimension Empty Check
    if (!rawVal || rawVal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Measured Length: Enter a positive drawing length measured on Sheet A (e.g. 12, 15.5, 3 1/2).',
        btn: dom.btnRunRescale
      });
      if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.add('input-error');
      if (state.lastValidRescale) {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = state.lastValidRescale.val;
        if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.lastValidRescale.unit;
      }
      return;
    }

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid || parsed.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: `⚠️ Measured Length: Enter a positive drawing measurement greater than zero (${parsed.error || 'e.g. 12, 15.5'}).`,
        btn: dom.btnRunRescale
      });
      if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.add('input-error');

      // Preserve previous valid result
      if (state.lastValidRescale) {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = state.lastValidRescale.val;
        if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.lastValidRescale.unit;
      } else {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = '---';
      }
      return;
    }

    if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.remove('input-error');

    try {
      const res = rescaleDrawing({
        originalVal: parsed.value,
        originalUnitKey: state.rescaleOrigUnit,
        originalRatio: state.rescaleOrigRatio,
        targetRatio: state.rescaleTargetRatio,
        targetUnitKey: state.rescaleTargetUnit
      });

      const formatted = formatNumber(res.targetValue, state.precision);
      state.lastValidRescale = {
        val: formatted,
        unit: state.rescaleTargetUnit
      };

      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = formatted;
      if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.rescaleTargetUnit;
      if (dom.rescaleFactorBadge) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleFactorBadge.textContent = `${pct}% (${tag})`;
      }
      if (dom.rescaleRealSpan) {
        dom.rescaleRealSpan.textContent = `${formatNumber(res.realMeters, 3)} m`;
      }

      // Update Math Formula Microcopy
      if (dom.rescaleMathFormula) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleMathFormula.innerHTML = `<strong>Formula:</strong> New Length = Original (${formatNumber(parsed.value, 2)} ${state.rescaleOrigUnit} @ 1:${state.rescaleOrigRatio}) × (${state.rescaleOrigRatio} ÷ ${state.rescaleTargetRatio}) = <strong>${formatted} ${state.rescaleTargetUnit} (${pct}% ${tag})</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'success',
        context: {
          'Rescale': `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
          'Source Sheet A': `${formatNumber(parsed.value, 2)} ${state.rescaleOrigUnit}`,
          'Real Physical Distance': `${formatNumber(res.realMeters, 3)} m`
        },
        btn: dom.btnRunRescale
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: `⚠️ Rescale error: ${err.message}`,
        btn: dom.btnRunRescale
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Mode 3: Scale Detector / Finder Engine
  // ---------------------------------------------------------------------------
  function calculateDetector() {
    const rawPaper = dom.detectorPaperVal?.value || '';
    const rawReal = dom.detectorRealVal?.value || '';

    state.detectPaperUnit = dom.detectorPaperUnit?.value || 'cm';
    state.detectRealUnit = dom.detectorRealUnit?.value || 'm';

    // Actionable Empty Checks
    if (!rawPaper || rawPaper.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: '⚠️ Paper Dimension: Enter a measured drawing length (e.g. 4.5, 10, 2 1/4).',
        btn: dom.btnRunDetector
      });
      if (dom.detectorPaperVal) dom.detectorPaperVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    const paperP = parseInput(rawPaper, { allowNegative: false });
    if (!paperP.isValid || paperP.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Paper Dimension: Enter a positive drawing length greater than zero (${paperP.error || 'e.g. 4.5 cm'}).`,
        btn: dom.btnRunDetector
      });
      if (dom.detectorPaperVal) dom.detectorPaperVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    if (dom.detectorPaperVal) dom.detectorPaperVal.classList.remove('input-error');

    if (!rawReal || rawReal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: '⚠️ Real-World Dimension: Enter the known physical site distance (e.g. 9, 15, 30).',
        btn: dom.btnRunDetector
      });
      if (dom.detectorRealVal) dom.detectorRealVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    const realP = parseInput(rawReal, { allowNegative: false });
    if (!realP.isValid || realP.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Real-World Dimension: Enter a positive site dimension greater than zero (${realP.error || 'e.g. 9 m'}).`,
        btn: dom.btnRunDetector
      });
      if (dom.detectorRealVal) dom.detectorRealVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    if (dom.detectorRealVal) dom.detectorRealVal.classList.remove('input-error');

    try {
      const res = detectScale({
        paperVal: paperP.value,
        paperUnitKey: state.detectPaperUnit,
        realVal: realP.value,
        realUnitKey: state.detectRealUnit
      });

      if (res.ratio === null || res.ratio <= 0) {
        setUnifiedResultState({
          toolPrefix: 'detector',
          status: 'error',
          errorText: '⚠️ Scale Detection: Dimensions must be greater than zero to determine scale.',
          btn: dom.btnRunDetector
        });
        return;
      }

      state.lastDetectedRatio = res.ratio;
      state.lastValidDetector = {
        ratioString: res.ratioString,
        ratio: res.ratio
      };

      if (dom.detectorRatioVal) dom.detectorRatioVal.textContent = res.ratioString;
      if (dom.detectorPresetBadge) {
        if (res.closestPreset) {
          const matchLabel = res.isExactMatch ? 'Exact Match' : `Closest: Δ ${res.closestPreset.percentDiff}%`;
          dom.detectorPresetBadge.innerHTML = `${matchLabel}: <strong>${res.closestPreset.name} (${res.closestPreset.desc})</strong>`;
        } else {
          dom.detectorPresetBadge.textContent = 'Custom Ratio (No standard preset match)';
        }
      }

      // Update Math Formula Microcopy
      if (dom.detectorMathFormula) {
        dom.detectorMathFormula.innerHTML = `<strong>Formula:</strong> Scale 1:X = Real (${formatNumber(realP.value, 2)} ${state.detectRealUnit}) ÷ Paper (${formatNumber(paperP.value, 2)} ${state.detectPaperUnit}) = <strong>${res.ratioString}</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'success',
        context: {
          'Drawing Line': `${formatNumber(paperP.value, 2)} ${state.detectPaperUnit}`,
          'Physical Site': `${formatNumber(realP.value, 2)} ${state.detectRealUnit}`,
          'Detected Ratio': res.ratioString
        },
        btn: dom.btnRunDetector
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Detection error: ${err.message}`,
        btn: dom.btnRunDetector
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Mode 4: Area & Volume Scaler Engine
  // ---------------------------------------------------------------------------
  function calculateAreaVolume() {
    const rawRatio = parseFloat(dom.areavolRatioInput?.value);
    if (isNaN(rawRatio) || rawRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: '⚠️ Scale Ratio: Enter a scale denominator ratio greater than 0 (e.g. 100 for 1:100).',
        btn: dom.btnRunAreavol
      });
      return;
    }

    state.areavolRatio = rawRatio;
    state.areavolInputUnit = dom.areavolInputUnit?.value || (state.calcType === 'area' ? 'cm2' : 'cm3');
    state.areavolOutputUnit = dom.areavolOutputUnit?.value || (state.calcType === 'area' ? 'm2' : 'm3');

    const rawVal = dom.areavolInputVal?.value || '';
    if (!rawVal || rawVal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: '⚠️ Measurement Input: Enter a positive area or volume dimension (e.g. 4 m² or 25 sq ft).',
        btn: dom.btnRunAreavol
      });
      if (dom.areavolInputVal) dom.areavolInputVal.classList.add('input-error');
      if (state.lastValidAreavol) {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = state.lastValidAreavol.val;
        if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.lastValidAreavol.unit;
      }
      return;
    }

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid || parsed.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: `⚠️ Measurement Input: Enter a positive value greater than zero (${parsed.error || 'e.g. 4 m²'}).`,
        btn: dom.btnRunAreavol
      });
      if (dom.areavolInputVal) dom.areavolInputVal.classList.add('input-error');

      // Preserve previous valid result
      if (state.lastValidAreavol) {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = state.lastValidAreavol.val;
        if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.lastValidAreavol.unit;
      } else {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = '---';
      }
      return;
    }

    if (dom.areavolInputVal) dom.areavolInputVal.classList.remove('input-error');

    try {
      const isDrawingToReal = state.calcDirection === 'drawing_to_real';
      let res;

      if (state.calcType === 'area') {
        res = scaleArea({
          areaVal: parsed.value,
          inputUnitKey: state.areavolInputUnit,
          scaleRatio: state.areavolRatio,
          outputUnitKey: state.areavolOutputUnit,
          isDrawingToReal: isDrawingToReal
        });
        if (dom.areavolFactorBadge) {
          dom.areavolFactorBadge.textContent = `× ${formatNumber(res.factor, 0)} (${state.areavolRatio}²)`;
        }
      } else {
        res = scaleVolume({
          volumeVal: parsed.value,
          inputUnitKey: state.areavolInputUnit,
          scaleRatio: state.areavolRatio,
          outputUnitKey: state.areavolOutputUnit,
          isDrawingToReal: isDrawingToReal
        });
        if (dom.areavolFactorBadge) {
          dom.areavolFactorBadge.textContent = `× ${formatNumber(res.factor, 0)} (${state.areavolRatio}³)`;
        }
      }

      const formatted = formatNumber(res.resultValue, state.precision);
      state.lastValidAreavol = {
        val: formatted,
        unit: state.areavolOutputUnit
      };

      if (dom.areavolResultVal) dom.areavolResultVal.textContent = formatted;
      if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.areavolOutputUnit;

      // Update Math Formula Microcopy
      if (dom.areavolMathFormula) {
        const powStr = state.calcType === 'area' ? '²' : '³';
        const typeLabel = state.calcType === 'area' ? 'Area' : 'Volume';
        const op = isDrawingToReal ? '×' : '÷';
        const targetTitle = isDrawingToReal ? `Real Site ${typeLabel}` : `Drawing Paper ${typeLabel}`;
        dom.areavolMathFormula.innerHTML = `<strong>Formula:</strong> ${targetTitle} = Input (${formatNumber(parsed.value, 2)} ${state.areavolInputUnit}) ${op} Scale${powStr} (${state.areavolRatio}${powStr} = ${formatNumber(res.factor, 0)}) = <strong>${formatted} ${state.areavolOutputUnit}</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'success',
        context: {
          'Scale Ratio': `1:${state.areavolRatio}`,
          'Source Value': `${formatNumber(parsed.value, 2)} ${state.areavolInputUnit}`,
          'Multiplier': `× ${formatNumber(res.factor, 0)}`
        },
        btn: dom.btnRunAreavol
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: `⚠️ Scaling error: ${err.message}`,
        btn: dom.btnRunAreavol
      });
    }
  }

  // ---------------------------------------------------------------------------
  function updateCategoryPillCounts() {
    const counts = { all: FURNITURE_DATABASE.length };
    for (const item of FURNITURE_DATABASE) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    dom.furnCategoryNav?.querySelectorAll('.furn-cat-pill').forEach(pill => {
      const cat = pill.dataset.cat;
      const badge = pill.querySelector('.furn-cat-count');
      if (badge && counts[cat] !== undefined) {
        badge.textContent = counts[cat];
      }
    });
  }

  function renderFurnitureGrid() {
    if (!dom.furnitureCardsGrid) return;

    const rawScale = parseFloat(dom.furnScaleRatioInput?.value);
    state.furnitureScaleRatio = isNaN(rawScale) || rawScale <= 0 ? 50 : rawScale;
    state.furniturePaperUnit = dom.furnPaperUnitSelect?.value || 'cm';
    state.furnitureSortKey = dom.furnSortSelect?.value || state.furnitureSortKey || 'default';

    // Apply compact / comfortable density class to grid container
    dom.furnitureCardsGrid.classList.toggle('compact-mode', state.furnitureDensity === 'compact');

    const filtered = filterFurnitureCatalog(
      FURNITURE_DATABASE,
      state.furnitureSearchQuery,
      state.furnitureActiveCategory,
      state.furnitureSortKey
    );

    updateCategoryPillCounts();

    if (dom.furnitureResultsCount) {
      dom.furnitureResultsCount.textContent = `Showing ${filtered.length} of ${FURNITURE_DATABASE.length} items`;
    }

    if (filtered.length === 0) {
      const activeFilterName = state.furnitureSearchQuery ? `"${state.furnitureSearchQuery}"` : state.furnitureActiveCategory;
      dom.furnitureCardsGrid.innerHTML = `
        <div class="empty-furn-state">
          <div class="empty-furn-icon">📐</div>
          <div class="empty-furn-title">No matching furniture pieces found for ${activeFilterName}</div>
          <div class="empty-furn-desc">Try searching for generic terms, specific dimensions (e.g. <code>200</code>, <code>200x200</code>, <code>60cm</code>), or explore suggested standards:</div>
          <div class="empty-furn-suggestions">
            <button class="empty-suggest-chip" data-search="sofa">Sofa</button>
            <button class="empty-suggest-chip" data-search="king bed">King Bed</button>
            <button class="empty-suggest-chip" data-search="dining table">Dining Table</button>
            <button class="empty-suggest-chip" data-search="island">Kitchen Island</button>
            <button class="empty-suggest-chip" data-search="desk">Office Desk</button>
            <button class="empty-suggest-chip" data-search="ada">ADA Accessibility</button>
            <button class="empty-suggest-chip" data-search="door">Doors</button>
            <button class="empty-suggest-chip" data-search="200">200cm Pieces</button>
          </div>
          <button id="btn-reset-furn-filter" class="action-tool-btn primary" style="margin-top: 1rem;">Reset Search & Show All Standards</button>
        </div>
      `;

      const resetBtn = dom.furnitureCardsGrid.querySelector('#btn-reset-furn-filter');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
          state.furnitureSearchQuery = '';
          state.furnitureActiveCategory = 'all';
          dom.furnCategoryNav?.querySelectorAll('.furn-cat-pill').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === 'all');
          });
          renderFurnitureGrid();
        });
      }

      dom.furnitureCardsGrid.querySelectorAll('.empty-suggest-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const q = chip.dataset.search;
          if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = q;
          state.furnitureSearchQuery = q;
          renderFurnitureGrid();
        });
      });

      return;
    }

    dom.furnitureCardsGrid.innerHTML = filtered.map(item => {
      const scaled = getScaledFurnitureDimensions(item, state.furnitureScaleRatio, state.furniturePaperUnit);
      const isAda = item.id.includes('ada') || (item.desc && item.desc.toLowerCase().includes('ada')) || item.name.toLowerCase().includes('ada');
      const isCompact = state.furnitureDensity === 'compact';

      return `
        <div class="furniture-card ${isCompact ? 'compact-card' : ''}" data-id="${item.id}">
          <div class="furn-card-header">
            <div class="furn-title-area">
              <div class="furn-name">${item.name}</div>
              <div class="furn-header-meta">
                <span class="furn-category-tag">${item.category.toUpperCase()}</span>
                <span class="furn-std-badge ${isAda ? 'ada-badge' : ''}">${scaled.standardTag}</span>
              </div>
            </div>
            <div class="furn-dim-badge">1:${state.furnitureScaleRatio}</div>
          </div>

          <div class="furn-card-body">
            <div class="furn-plan-preview-box" title="Architectural Blueprint Top-Down Plan">
              ${getFurniturePlanSVG(item)}
            </div>

            <div class="furn-footprint-row">
              <span class="footprint-label">Space Footprint:</span>
              <span class="footprint-val"><strong>${scaled.footprintM2} m²</strong><span class="footprint-imperial">(${scaled.footprintSqFt} sq ft)</span></span>
            </div>

            <div class="furn-item-desc">${item.desc}</div>

            <div class="furn-specs-grid">
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Real Dimensions:</span>
                <span class="furn-spec-val highlight">${scaled.realFormattedMetric}</span>
              </div>
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Imperial Equiv:</span>
                <span class="furn-spec-val">${scaled.realFormattedImperial}</span>
              </div>
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Scaled on Paper:</span>
                <span class="furn-spec-val paper-result">${scaled.paperFormatted}</span>
              </div>
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Dimension Standard:</span>
                <span class="furn-spec-val std-type-tag">${scaled.dimensionType}</span>
              </div>
            </div>
          </div>

          <div class="furn-card-footer">
            <button class="btn-furn-planner action-tool-btn compact" data-name="${item.name}" data-dims="${scaled.realFormattedMetric}" title="Add piece to active room plan">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3h18v18H3z"/><path d="M9 3v18M3 9h18"/></svg>
              + Use in Planner
            </button>
            <button class="btn-furn-copy action-tool-btn compact" data-text="${scaled.paperFormatted}" title="Copy scaled drawing dimensions">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Size
            </button>
            <button class="btn-furn-send action-tool-btn compact" data-w="${item.wCm}" title="Send width to Converter">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              To Converter
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to dynamically rendered card buttons
    dom.furnitureCardsGrid.querySelectorAll('.btn-furn-planner').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`📐 Added ${btn.dataset.name} (${btn.dataset.dims}) to Room Planner layout`);
        AudioService.playTick();
      });
    });

    dom.furnitureCardsGrid.querySelectorAll('.btn-furn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.text, 'Scaled Furniture Size');
      });
    });

    dom.furnitureCardsGrid.querySelectorAll('.btn-furn-send').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.dataset.w;
        if (dom.converterInputVal) dom.converterInputVal.value = w;
        if (dom.converterInputUnit) dom.converterInputUnit.value = 'cm';
        state.direction = 'real_to_drawing';
        switchMode('converter');
        showToast(`Sent dimension ${w} cm to Converter`);
      });
    });
  }

  function calculateCustomFurniture() {
    const rawW = dom.customFurnW?.value || '';
    const rawD = dom.customFurnD?.value || '';

    state.customFurnUnit = dom.customFurnUnit?.value || 'cm';
    state.furnitureScaleRatio = parseFloat(dom.furnScaleRatioInput?.value) || 50;
    state.furniturePaperUnit = dom.furnPaperUnitSelect?.value || 'cm';

    if (!rawW || rawW.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Width (W): Enter a positive width dimension (e.g. 240 cm).'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Please enter a positive width dimension</span>';
      return;
    }

    const pw = parseInput(rawW, { allowNegative: false });
    if (!pw.isValid || pw.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Width (W): Width must be greater than zero.'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Width must be greater than zero</span>';
      return;
    }

    if (!rawD || rawD.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Depth (D): Enter a positive depth dimension (e.g. 100 cm).'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Please enter a positive depth dimension</span>';
      return;
    }

    const pd = parseInput(rawD, { allowNegative: false });
    if (!pd.isValid || pd.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Depth (D): Depth must be greater than zero.'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Depth must be greater than zero</span>';
      return;
    }

    try {
      const wRes = scaleDimension({
        value: pw.value,
        unitKey: state.customFurnUnit,
        ratio: state.furnitureScaleRatio,
        direction: 'real_to_drawing',
        targetUnitKey: state.furniturePaperUnit
      });

      const dRes = scaleDimension({
        value: pd.value,
        unitKey: state.customFurnUnit,
        ratio: state.furnitureScaleRatio,
        direction: 'real_to_drawing',
        targetUnitKey: state.furniturePaperUnit
      });

      // Real Footprint Area
      const unitFactor = UNITS[state.customFurnUnit]?.toMeters || 0.01;
      const wMeters = pw.value * unitFactor;
      const dMeters = pd.value * unitFactor;
      const realAreaM2 = wMeters * dMeters;
      const realAreaSqFt = realAreaM2 * 10.7639;

      // Scaled Drawing Paper Area
      const paperArea = wRes.value * dRes.value;

      const paperFormatted = `${formatNumber(wRes.value, 2)} × ${formatNumber(dRes.value, 2)} ${state.furniturePaperUnit}`;
      const formatted = `Paper @ 1:${state.furnitureScaleRatio}: <strong>${paperFormatted}</strong> (${formatNumber(paperArea, 2)} ${state.furniturePaperUnit}²) | Real Footprint: <strong>${formatNumber(realAreaM2, 2)} m²</strong> (${formatNumber(realAreaSqFt, 1)} sq ft)`;
      
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = formatted;
      
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'success'
      });
      AudioService.playTick();
    } catch (e) {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: `⚠️ Scaling error: ${e.message}`
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 12. Mode 6: Architectural Drafting Reference Sheet
  // ---------------------------------------------------------------------------
  function renderReferenceChart() {
    if (!dom.refTableBody) return;
    state.refScaleRatio = parseFloat(dom.refScaleSelect?.value) || 50;

    // 1. Update Active Scale Indicators
    const scaleString = `SCALE 1:${state.refScaleRatio}`;
    if (dom.refActiveScaleBadge) dom.refActiveScaleBadge.textContent = scaleString;
    if (dom.refRulerScaleLabel) dom.refRulerScaleLabel.textContent = scaleString;
    if (dom.refBenchmarksScaleLabel) dom.refBenchmarksScaleLabel.textContent = scaleString;
    if (dom.refTbScale) dom.refTbScale.textContent = `1:${state.refScaleRatio}`;
    if (dom.refTbDate) dom.refTbDate.textContent = new Date().toISOString().slice(0, 10);

    // 2. Sync Quick Scale Preset Chips
    if (dom.refQuickChips) {
      dom.refQuickChips.querySelectorAll('.ref-chip-btn').forEach(btn => {
        const r = parseFloat(btn.dataset.ratio);
        btn.classList.toggle('active', r === state.refScaleRatio);
      });
    }

    // 3. Render Printable Architectural Scale Ruler Graphic (150 mm on paper)
    if (dom.refRulerContainer) {
      const rulerMm = 150; // 15 cm printable ruler
      const siteMetersTotal = (rulerMm / 1000) * state.refScaleRatio;
      
      let siteStep = 1;
      if (state.refScaleRatio <= 20) siteStep = 0.2;
      else if (state.refScaleRatio <= 50) siteStep = 0.5;
      else if (state.refScaleRatio <= 100) siteStep = 1;
      else if (state.refScaleRatio <= 250) siteStep = 2;
      else siteStep = 5;

      let siteTicksSvg = '';
      for (let s = 0; s <= siteMetersTotal + 0.001; s += siteStep) {
        const xPosMm = (s / state.refScaleRatio) * 1000;
        if (xPosMm > rulerMm + 0.5) break;
        const isMajor = Math.abs(s % (siteStep * 2)) < 0.001 || s === 0;
        const tickH = isMajor ? 14 : 9;
        const xPct = (xPosMm / rulerMm) * 100;
        siteTicksSvg += `
          <line x1="${xPct}%" y1="0" x2="${xPct}%" y2="${tickH}" stroke="currentColor" stroke-width="${isMajor ? 1.5 : 1}"/>
          ${isMajor ? `<text x="${xPct}%" y="24" font-size="8" font-family="monospace" text-anchor="middle" fill="currentColor">${formatNumber(s, s < 1 ? 1 : 0)}m</text>` : ''}
        `;
      }

      // Bottom edge: Paper cm ticks (every 10mm and 1mm)
      let paperTicksSvg = '';
      for (let cm = 0; cm <= rulerMm / 10; cm++) {
        const xPct = ((cm * 10) / rulerMm) * 100;
        paperTicksSvg += `
          <line x1="${xPct}%" y1="52" x2="${xPct}%" y2="40" stroke="currentColor" stroke-width="1.5"/>
          <text x="${xPct}%" y="37" font-size="7" font-family="monospace" text-anchor="middle" fill="currentColor">${cm}</text>
        `;
        if (cm < rulerMm / 10) {
          const midPct = (((cm * 10) + 5) / rulerMm) * 100;
          paperTicksSvg += `<line x1="${midPct}%" y1="52" x2="${midPct}%" y2="44" stroke="currentColor" stroke-width="1"/>`;
        }
      }

      dom.refRulerContainer.innerHTML = `
        <svg class="ruler-svg" viewBox="0 0 100 52" preserveAspectRatio="none" style="width: 150mm; max-width: 100%; height: 52px; color: var(--accent-primary);">
          <rect x="0" y="0" width="100%" height="52" fill="none" stroke="currentColor" stroke-width="1"/>
          ${siteTicksSvg}
          ${paperTicksSvg}
        </svg>
      `;
    }

    // 4. Render Architectural Neufert Benchmarks
    if (dom.refBenchmarksGrid) {
      const benchmarks = [
        { name: 'Standard Interior Door', wM: 0.90, hM: 2.10 },
        { name: 'Ceiling Clearance (Min)', wM: 2.70, hM: null },
        { name: 'Adult Human Stature', wM: 1.75, hM: null },
        { name: 'Kitchen Counter Height', wM: 0.90, hM: null },
        { name: 'Standard Parking Stall', wM: 2.50, hM: 5.00 },
        { name: 'Stair Step Riser', wM: 0.17, hM: null },
        { name: 'Office Desk Surface', wM: 1.60, hM: 0.80 },
        { name: 'Corridor Width (Code)', wM: 1.20, hM: null }
      ];

      dom.refBenchmarksGrid.innerHTML = benchmarks.map(b => {
        const siteText = b.hM ? `${b.wM.toFixed(2)} × ${b.hM.toFixed(2)} m` : `${b.wM.toFixed(2)} m`;
        const paperW = (b.wM / state.refScaleRatio) * 100;
        const paperH = b.hM ? (b.hM / state.refScaleRatio) * 100 : null;
        const paperText = paperH ? `${formatNumber(paperW, 2)} × ${formatNumber(paperH, 2)} cm` : `${formatNumber(paperW, 2)} cm`;
        return `
          <div class="benchmark-card">
            <span class="bm-name">${b.name}</span>
            <span class="bm-site">Site: ${siteText}</span>
            <span class="bm-paper">Paper: ${paperText}</span>
          </div>
        `;
      }).join('');
    }

    // 5. Render Master Dimension Data Table (Metric & Imperial Dual Data)
    const metricLengthsCm = [
      { cm: 0.05, label: '0.5 mm', isBenchmark: false },
      { cm: 0.1, label: '1 mm (0.1 cm)', isBenchmark: false },
      { cm: 0.2, label: '2 mm (0.2 cm)', isBenchmark: false },
      { cm: 0.5, label: '5 mm (0.5 cm)', isBenchmark: true },
      { cm: 1.0, label: '10 mm (1.0 cm)', isBenchmark: true },
      { cm: 2.0, label: '20 mm (2.0 cm)', isBenchmark: false },
      { cm: 5.0, label: '50 mm (5.0 cm)', isBenchmark: true },
      { cm: 10.0, label: '100 mm (10.0 cm)', isBenchmark: true },
      { cm: 15.0, label: '150 mm (15.0 cm)', isBenchmark: false },
      { cm: 20.0, label: '200 mm (20.0 cm)', isBenchmark: true },
      { cm: 25.0, label: '250 mm (25.0 cm)', isBenchmark: false },
      { cm: 30.0, label: '300 mm (30.0 cm - Ruler)', isBenchmark: true },
      { cm: 42.0, label: '420 mm (A3 Width)', isBenchmark: false },
      { cm: 50.0, label: '500 mm (50.0 cm)', isBenchmark: true },
      { cm: 100.0, label: '1000 mm (1.0 m Paper)', isBenchmark: true }
    ];

    const imperialLengthsIn = [
      { in: 0.0625, label: '1/16" (1.59 mm)', isBenchmark: false },
      { in: 0.125, label: '1/8" (3.18 mm)', isBenchmark: false },
      { in: 0.25, label: '1/4" (6.35 mm)', isBenchmark: true },
      { in: 0.375, label: '3/8" (9.53 mm)', isBenchmark: false },
      { in: 0.5, label: '1/2" (12.70 mm)', isBenchmark: true },
      { in: 0.75, label: '3/4" (19.05 mm)', isBenchmark: false },
      { in: 1.0, label: '1" (25.40 mm)', isBenchmark: true },
      { in: 1.5, label: '1-1/2" (38.10 mm)', isBenchmark: false },
      { in: 2.0, label: '2" (50.80 mm)', isBenchmark: false },
      { in: 3.0, label: '3" (76.20 mm)', isBenchmark: false },
      { in: 6.0, label: '6" (152.40 mm)', isBenchmark: true },
      { in: 12.0, label: '12" (1 ft on Paper)', isBenchmark: true }
    ];

    const metricRows = metricLengthsCm.map(item => {
      const realMeters = (item.cm * 0.01) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr class="${item.isBenchmark ? 'benchmark-row' : ''}">
          <td class="col-paper"><strong>${item.label}</strong></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm col-mm-th">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${realFtIn}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    });

    const imperialRows = imperialLengthsIn.map(item => {
      const realMeters = (item.in * 0.0254) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr class="${item.isBenchmark ? 'benchmark-row' : ''}">
          <td class="col-paper"><strong>${item.label}</strong></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm col-mm-th">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${realFtIn}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    });

    dom.refTableBody.innerHTML = `
      <tr class="table-section-divider"><td colspan="6" style="background: var(--bg-surface-elevated); color: var(--text-tertiary); font-weight: 800; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.4rem 0.75rem;">— METRIC DRAWING MEASUREMENTS —</td></tr>
      ${metricRows.join('')}
      <tr class="table-section-divider"><td colspan="6" style="background: var(--bg-surface-elevated); color: var(--text-tertiary); font-weight: 800; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.4rem 0.75rem;">— IMPERIAL DRAWING MEASUREMENTS —</td></tr>
      ${imperialRows.join('')}
    `;
  }

  // ---------------------------------------------------------------------------
  // 13. Calculation Journal & History Manager
  // ---------------------------------------------------------------------------
  function renderHistoryList() {
    if (!dom.historyList) return;
    const history = HistoryService.getHistory();

    if (dom.historyCountBadge) {
      dom.historyCountBadge.textContent = `${history.length} ${history.length === 1 ? 'entry' : 'entries'}`;
    }

    if (history.length === 0) {
      dom.historyList.innerHTML = `
        <div class="empty-history-box">
          <div class="empty-hist-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="empty-hist-title">No calculations yet.</div>
          <div class="empty-hist-desc">Run a calculation and it will appear here.</div>
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = history.map(item => `
      <div class="history-item-card" data-id="${item.id}">
        <div class="hist-card-top">
          <div class="hist-title-group">
            <span class="hist-mode-tag">${item.operation || item.mode || 'Scale Converter'}</span>
            <span class="hist-scale-tag">${item.scaleStr || '-'}</span>
          </div>
          <span class="hist-time-tag">${item.timestamp || ''}</span>
        </div>
        
        <div class="hist-details-grid">
          <div class="hist-data-row">
            <span class="hist-lbl">INPUT</span>
            <span class="hist-val hist-input-val">${item.inputStr || '-'}</span>
          </div>
          <div class="hist-data-row highlight">
            <span class="hist-lbl">RESULT</span>
            <span class="hist-val hist-output-val">${item.outputStr || '-'}</span>
          </div>
        </div>

        <div class="hist-card-actions">
          ${item.stateSnapshot ? `
            <button class="hist-btn-restore action-tool-btn compact primary" data-id="${item.id}" title="Restore and rerun this calculation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Restore
            </button>
          ` : ''}
          <button class="hist-btn-copy action-tool-btn compact" data-text="${item.outputStr || item.inputStr}" title="Copy calculated result">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
          <button class="hist-btn-del action-tool-btn compact danger" data-id="${item.id}" title="Remove entry from journal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');

    dom.historyList.querySelectorAll('.hist-btn-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreCalculationById(btn.dataset.id);
      });
    });

    dom.historyList.querySelectorAll('.hist-btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.text, 'Calculation Result');
      });
    });

    dom.historyList.querySelectorAll('.hist-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        HistoryService.removeEntry(btn.dataset.id);
        renderHistoryList();
        showToast('Entry removed from journal');
      });
    });
  }

  function restoreCalculationById(id) {
    const item = HistoryService.getHistory().find(h => h.id === id);
    if (!item || !item.stateSnapshot) {
      showToast('Cannot restore state for this entry', 'warning');
      return;
    }
    const snap = item.stateSnapshot;
    switch (snap.modeKey) {
      case 'converter':
        switchMode('converter');
        if (dom.scaleRatioInput) dom.scaleRatioInput.value = snap.ratio;
        if (dom.converterInputVal) dom.converterInputVal.value = snap.val;
        if (dom.converterInputUnit) dom.converterInputUnit.value = snap.inUnit;
        if (dom.converterOutputUnit) dom.converterOutputUnit.value = snap.outUnit;
        state.direction = snap.direction || 'drawing_to_real';
        updateDirectionUI();
        calculateConverter();
        break;
      case 'rescale':
        switchMode('rescale');
        if (dom.rescaleOrigRatio) dom.rescaleOrigRatio.value = snap.origRatio;
        if (dom.rescaleOrigVal) dom.rescaleOrigVal.value = snap.origVal;
        if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.value = snap.origUnit;
        if (dom.rescaleTargetRatio) dom.rescaleTargetRatio.value = snap.targetRatio;
        if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.value = snap.targetUnit;
        calculateRescaler();
        break;
      case 'detector':
        switchMode('detector');
        if (dom.detectorPaperVal) dom.detectorPaperVal.value = snap.paperVal;
        if (dom.detectorPaperUnit) dom.detectorPaperUnit.value = snap.paperUnit;
        if (dom.detectorRealVal) dom.detectorRealVal.value = snap.realVal;
        if (dom.detectorRealUnit) dom.detectorRealUnit.value = snap.realUnit;
        calculateDetector();
        break;
      case 'area_volume':
        switchMode('area_volume');
        if (dom.areavolRatioInput) dom.areavolRatioInput.value = snap.ratio;
        if (dom.areavolInputVal) dom.areavolInputVal.value = snap.val;
        state.calcType = snap.type || 'area';
        state.calcDirection = snap.direction || 'drawing_to_real';
        updateAreaVolumeTypeUI();
        updateAreaVolumeDirUI();
        updateAreaVolumeUnitSelects();
        if (dom.areavolInputUnit) dom.areavolInputUnit.value = snap.inUnit;
        if (dom.areavolOutputUnit) dom.areavolOutputUnit.value = snap.outUnit;
        calculateAreaVolume();
        break;
      case 'furniture':
        switchMode('furniture');
        if (dom.customFurnName) dom.customFurnName.value = snap.name || 'Custom Piece';
        if (dom.customFurnW) dom.customFurnW.value = snap.w;
        if (dom.customFurnD) dom.customFurnD.value = snap.d;
        if (dom.customFurnUnit) dom.customFurnUnit.value = snap.unit || 'cm';
        if (dom.furnScaleRatioInput) dom.furnScaleRatioInput.value = snap.ratio || 50;
        if (dom.furnPaperUnitSelect) dom.furnPaperUnitSelect.value = snap.paperUnit || 'cm';
        calculateCustomFurniture();
        break;
      case 'workspace':
        switchMode('workspace');
        if (snap.scaleRatio) {
          state.workspace.scaleRatio = snap.scaleRatio;
        }
        if (snap.displayUnit) {
          state.workspace.displayUnit = snap.displayUnit;
        }
        renderWorkspace();
        break;
      case 'expression':
        switchMode('expression');
        if (dom.expressionInput) dom.expressionInput.value = snap.expression || item.inputStr || '';
        if (dom.expressionDefaultUnit && snap.defaultUnit) dom.expressionDefaultUnit.value = snap.defaultUnit;
        if (dom.expressionScaleSelect && snap.scaleRatio) {
          const ratioStr = String(snap.scaleRatio);
          if (dom.expressionScaleSelect.querySelector(`option[value="${ratioStr}"]`)) {
            dom.expressionScaleSelect.value = ratioStr;
            if (dom.expressionCustomScaleGroup) dom.expressionCustomScaleGroup.style.display = 'none';
          } else {
            dom.expressionScaleSelect.value = 'custom';
            if (dom.expressionCustomScaleGroup) dom.expressionCustomScaleGroup.style.display = 'block';
            if (dom.expressionCustomScaleInput) dom.expressionCustomScaleInput.value = snap.scaleRatio;
          }
        }
        calculateExpression(true);
        break;
      case 'chains':
        switchMode('chains');
        if (snap.name && dom.chainsNameInput) dom.chainsNameInput.value = snap.name;
        if (snap.scaleRatio && dom.chainsScaleSelect) dom.chainsScaleSelect.value = String(snap.scaleRatio);
        if (snap.defaultUnit && dom.chainsUnitSelect) dom.chainsUnitSelect.value = snap.defaultUnit;
        calculateAndRenderChain(true);
        break;
    }
    AudioService.playTick();
    showToast(`↺ Restored calculation into ${item.operation || item.mode}`);
    if (window.innerWidth <= 768) {
      toggleHistoryDrawer();
    }
  }

  function logCurrentCalculationToHistory(modeKey) {
    let entry = null;

    if (modeKey === 'converter') {
      const val = dom.converterResultVal?.textContent;
      const unit = dom.converterResultUnit?.textContent;
      const inputVal = dom.converterInputVal?.value;
      if (val && val !== '---' && inputVal) {
        const dirLabel = state.direction === 'drawing_to_real' ? 'Drawing Paper' : 'Real Site';
        const outDirLabel = state.direction === 'drawing_to_real' ? 'Real Site' : 'Drawing Paper';
        entry = {
          operation: 'Scale Converter',
          mode: 'Scale Converter',
          scaleRatio: state.scaleRatio,
          scaleStr: `1:${state.scaleRatio}`,
          inputStr: `${inputVal} ${state.converterInputUnit} (${dirLabel})`,
          outputStr: `${val} ${unit} (${outDirLabel})`,
          stateSnapshot: {
            modeKey: 'converter',
            ratio: state.scaleRatio,
            val: inputVal,
            inUnit: state.converterInputUnit,
            outUnit: state.converterOutputUnit,
            direction: state.direction
          }
        };
      }
    } else if (modeKey === 'rescale') {
      const val = dom.rescaleResultVal?.textContent;
      const unit = dom.rescaleResultUnit?.textContent;
      const origVal = dom.rescaleOrigVal?.value;
      if (val && val !== '---' && origVal) {
        entry = {
          operation: 'Rescaler',
          mode: 'Rescaler',
          scaleRatio: state.rescaleOrigRatio,
          scaleStr: `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
          inputStr: `${origVal} ${state.rescaleOrigUnit} (@ 1:${state.rescaleOrigRatio})`,
          outputStr: `${val} ${unit} (@ 1:${state.rescaleTargetRatio})`,
          stateSnapshot: {
            modeKey: 'rescale',
            origRatio: state.rescaleOrigRatio,
            origVal: origVal,
            origUnit: state.rescaleOrigUnit,
            targetRatio: state.rescaleTargetRatio,
            targetUnit: state.rescaleTargetUnit
          }
        };
      }
    } else if (modeKey === 'detector') {
      const ratioStr = dom.detectorRatioVal?.textContent;
      const paperVal = dom.detectorPaperVal?.value;
      const realVal = dom.detectorRealVal?.value;
      if (ratioStr && !ratioStr.includes('---') && paperVal && realVal) {
        entry = {
          operation: 'Scale Detector',
          mode: 'Scale Detector',
          scaleStr: ratioStr,
          inputStr: `Paper: ${paperVal} ${state.detectPaperUnit} | Real: ${realVal} ${state.detectRealUnit}`,
          outputStr: ratioStr,
          stateSnapshot: {
            modeKey: 'detector',
            paperVal: paperVal,
            paperUnit: state.detectPaperUnit,
            realVal: realVal,
            realUnit: state.detectRealUnit
          }
        };
      }
    } else if (modeKey === 'area_volume') {
      const val = dom.areavolResultVal?.textContent;
      const unit = dom.areavolResultUnit?.textContent;
      const inputVal = dom.areavolInputVal?.value;
      if (val && val !== '---' && inputVal) {
        const isArea = state.calcType === 'area';
        const typeLabel = isArea ? 'Area (S²)' : 'Volume (S³)';
        const dirLabel = state.calcDirection === 'drawing_to_real' ? 'Paper ➔ Site' : 'Site ➔ Paper';
        entry = {
          operation: `${typeLabel} (${dirLabel})`,
          mode: 'Area & Volume',
          scaleRatio: state.areavolRatio,
          scaleStr: `1:${state.areavolRatio}`,
          inputStr: `${inputVal} ${state.areavolInputUnit}`,
          outputStr: `${val} ${unit}`,
          stateSnapshot: {
            modeKey: 'area_volume',
            type: state.calcType,
            direction: state.calcDirection,
            ratio: state.areavolRatio,
            val: inputVal,
            inUnit: state.areavolInputUnit,
            outUnit: state.areavolOutputUnit
          }
        };
      }
    } else if (modeKey === 'furniture') {
      const w = dom.customFurnW?.value;
      const d = dom.customFurnD?.value;
      const val = dom.customFurnResult?.textContent;
      if (w && d && val && val !== '---') {
        const name = dom.customFurnName?.value || 'Custom Piece';
        entry = {
          operation: `Furniture: ${name}`,
          mode: 'Furniture Scales',
          scaleRatio: state.furnitureScaleRatio,
          scaleStr: `1:${state.furnitureScaleRatio}`,
          inputStr: `Real: ${w} × ${d} ${state.customFurnUnit}`,
          outputStr: `Paper: ${val}`,
          stateSnapshot: {
            modeKey: 'furniture',
            name: name,
            w: parseFloat(w),
            d: parseFloat(d),
            unit: state.customFurnUnit,
            ratio: state.furnitureScaleRatio,
            paperUnit: state.furniturePaperUnit
          }
        };
      }
    } else if (modeKey === 'workspace') {
      const totals = calculateWorkspaceTotals(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, state.precision);
      if (totals.validCount > 0) {
        entry = {
          operation: 'Dimension Schedule',
          mode: 'Dimension Workspace',
          scaleRatio: state.workspace.scaleRatio,
          scaleStr: `1:${state.workspace.scaleRatio}`,
          inputStr: `${totals.enabledCount} active measurements (${totals.totalRealFormatted})`,
          outputStr: `Drawing: ${totals.totalDrawingFormatted}`,
          stateSnapshot: {
            modeKey: 'workspace',
            scaleRatio: state.workspace.scaleRatio,
            displayUnit: state.workspace.displayUnit
          }
        };
      }
    } else if (modeKey === 'expression') {
      const res = state.lastValidExpression;
      if (res && res.isValid) {
        entry = {
          operation: 'Dimension Expression',
          mode: 'Dimension Expression',
          scaleRatio: res.scaleRatio,
          scaleStr: res.scaleRatio ? `1:${res.scaleRatio}` : '—',
          inputStr: res.expression,
          outputStr: `${res.formatted}${res.drawingFormatted ? ` (Drawing: ${res.drawingFormatted})` : ''}`,
          stateSnapshot: {
            modeKey: 'expression',
            expression: res.expression,
            scaleRatio: res.scaleRatio,
            defaultUnit: dom.expressionDefaultUnit?.value || 'mm'
          }
        };
      }
    } else if (modeKey === 'chains') {
      const calc = state.lastValidChain;
      if (calc && calc.isValid) {
        entry = {
          operation: 'Dimension Chain',
          mode: 'Dimension Chains',
          scaleRatio: calc.scaleRatio,
          scaleStr: `1:${calc.scaleRatio}`,
          inputStr: `${calc.name} (${calc.segmentCount} segments: ${calc.segments.map(s => s.lengthFormatted).join(' + ')})`,
          outputStr: `Overall: ${calc.overallExtentFormatted} (Drawing: ${calc.drawingOverallFormatted})`,
          stateSnapshot: {
            modeKey: 'chains',
            name: calc.name,
            scaleRatio: calc.scaleRatio,
            defaultUnit: calc.defaultUnit
          }
        };
      }
    }

    if (entry) {
      HistoryService.addEntry(entry);
      renderHistoryList();
      AudioService.playTick();
      showToast(`Saved ${entry.operation} to journal`);
    }
  }

  function toggleHistoryDrawer() {
    if (!dom.historyDrawer || !dom.historyOverlay) return;
    const isOpen = dom.historyDrawer.classList.contains('open');
    dom.historyDrawer.classList.toggle('open', !isOpen);
    dom.historyOverlay.classList.toggle('open', !isOpen);
    AudioService.playTick();
    if (!isOpen) renderHistoryList();
  }

  // ---------------------------------------------------------------------------
  // 13b. Mode 7: Dimension Workspace Controller (v1.1 Polish)
  // ---------------------------------------------------------------------------
  function saveWorkspace() {
    try {
      StorageService.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspace(state.workspace));
    } catch (e) {
      console.error('Failed to save dimension workspace:', e);
    }
  }

  function renderWorkspace() {
    if (!dom.workspaceTableBody && !dom.workspaceCardsList) return;

    const ws = state.workspace;
    const totals = calculateWorkspaceTotals(ws.entries, ws.scaleRatio, ws.displayUnit, state.precision);

    // 1. Sync Scale Select
    if (dom.workspaceScaleSelect) {
      const knownValues = ['1', '2', '5', '10', '20', '25', '50', '100', '200', '500', '1000'];
      if (knownValues.includes(String(ws.scaleRatio))) {
        dom.workspaceScaleSelect.value = String(ws.scaleRatio);
        if (dom.workspaceCustomScaleGroup) dom.workspaceCustomScaleGroup.style.display = 'none';
      } else {
        dom.workspaceScaleSelect.value = 'custom';
        if (dom.workspaceCustomScaleGroup) {
          dom.workspaceCustomScaleGroup.style.display = 'flex';
          if (dom.workspaceCustomScaleInput) dom.workspaceCustomScaleInput.value = ws.scaleRatio;
        }
      }
    }

    // 2. Sync Display Unit Select
    if (dom.workspaceUnitSelect) {
      dom.workspaceUnitSelect.value = ws.displayUnit;
    }

    // 3. Sync Quick Scale Chips
    if (dom.workspaceQuickChips) {
      dom.workspaceQuickChips.querySelectorAll('.scale-chip').forEach(chip => {
        const chipScale = parseFloat(chip.dataset.scale);
        chip.classList.toggle('active', chipScale === ws.scaleRatio);
      });
    }

    // 4. Sync Density Toggles
    if (dom.workspaceDensityStandard && dom.workspaceDensityCompact) {
      const isCompact = ws.density === 'compact';
      dom.workspaceDensityStandard.classList.toggle('active', !isCompact);
      dom.workspaceDensityCompact.classList.toggle('active', isCompact);
      if (dom.workspaceTable) dom.workspaceTable.classList.toggle('compact-mode', isCompact);
    }

    // 5. Update Table Column Header & Totals Labels
    if (dom.workspaceThDrawing) {
      dom.workspaceThDrawing.textContent = `Drawing @ 1:${ws.scaleRatio}`;
    }
    if (dom.workspaceTotalDrawingLabel) {
      dom.workspaceTotalDrawingLabel.textContent = `TOTAL DRAWING @ 1:${ws.scaleRatio}`;
    }

    // 6. Update Breakdown Badge & Selection Status
    if (dom.workspaceBreakdownBadge) {
      dom.workspaceBreakdownBadge.textContent = totals.breakdownLabel;
    }

    const selectedCount = state.workspaceSelectedIds.size;
    if (dom.workspaceSelectionStatus) {
      dom.workspaceSelectionStatus.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }
    if (dom.workspaceSelectionCount) {
      dom.workspaceSelectionCount.textContent = `${selectedCount} selected`;
    }
    if (dom.workspaceSelectAll) {
      dom.workspaceSelectAll.checked = ws.entries.length > 0 && ws.entries.every(e => state.workspaceSelectedIds.has(e.id));
    }

    // 7. Group indexing
    const groupMap = new Map((ws.groups || []).map(g => [g.id, g]));
    const collapsedGroupIds = new Set((ws.groups || []).filter(g => g.collapsed).map(g => g.id));

    // Render Table Rows (Desktop) & Cards (Mobile)
    let tableHtml = '';
    let cardsHtml = '';
    let currentGroupId = undefined;

    ws.entries.forEach((entry, index) => {
      const calc = calculateEntryValues(entry, ws.scaleRatio, ws.displayUnit, state.precision);
      const isInvalid = !calc.isValid;
      const isFirst = index === 0;
      const isLast = index === ws.entries.length - 1;
      const isSelected = state.workspaceSelectedIds.has(entry.id);
      const dimType = entry.dimensionType || DEFAULT_DIMENSION_TYPE;
      const badgeClass = dimType === 'segment' ? 'badge-seg' : (dimType === 'allowance' ? 'badge-alw' : 'badge-ref');
      const badgeLabel = dimType === 'segment' ? 'SEG' : (dimType === 'allowance' ? 'ALW' : 'REF');
      const groupObj = entry.groupId ? groupMap.get(entry.groupId) : null;

      // Check for group boundary header
      if (entry.groupId && entry.groupId !== currentGroupId) {
        currentGroupId = entry.groupId;
        const grp = groupObj || { id: entry.groupId, name: 'Group', collapsed: false };
        const grpTotals = calculateGroupTotals(ws.entries, grp.id, ws.scaleRatio, ws.displayUnit, state.precision);
        tableHtml += `
          <tr class="workspace-group-header" data-group-id="${grp.id}">
            <td colspan="10">
              <div class="group-title-wrap">
                <button type="button" class="group-collapse-btn ws-group-toggle" data-group-id="${grp.id}" title="${grp.collapsed ? 'Expand group' : 'Collapse group'}">
                  <span>${grp.collapsed ? '▶' : '▼'}</span>
                  <span>📁 ${escapeHtml(grp.name)}</span>
                  <small style="color: var(--text-muted); font-weight: normal;">(${grpTotals.totalCount} items)</small>
                </button>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="group-subtotal-badge">Segments: ${grpTotals.segmentRealFormatted} ➔ ${grpTotals.segmentDrawingFormatted}</span>
                  <button type="button" class="row-action-btn ws-ungroup-btn" data-group-id="${grp.id}" title="Remove all from group" style="font-size: 0.65rem;">Ungroup</button>
                </div>
              </div>
            </td>
          </tr>
        `;
      } else if (!entry.groupId && currentGroupId !== null) {
        currentGroupId = null;
      }

      // If entry belongs to a collapsed group, skip rendering in table/cards
      if (entry.groupId && collapsedGroupIds.has(entry.groupId)) {
        return;
      }

      // Inline Editing state
      const isEditingName = state.workspaceEditingCell?.id === entry.id && state.workspaceEditingCell?.field === 'name';
      const isEditingInput = state.workspaceEditingCell?.id === entry.id && state.workspaceEditingCell?.field === 'rawInput';
      const isEditingNotes = state.workspaceEditingCell?.id === entry.id && state.workspaceEditingCell?.field === 'notes';

      // Table Row
      tableHtml += `
        <tr class="${!entry.enabled ? 'row-disabled' : ''} ${isInvalid ? 'row-invalid' : ''} ${isSelected ? 'row-selected' : ''}" data-id="${entry.id}">
          <td style="text-align: center;">
            <input type="checkbox" class="ws-select-row-checkbox form-checkbox" data-id="${entry.id}" ${isSelected ? 'checked' : ''} title="Select row">
          </td>
          <td>
            <span class="type-badge ${badgeClass} ws-type-toggle" data-id="${entry.id}" title="Click to cycle type (Segment / Allowance / Reference)">${badgeLabel}</span>
          </td>
          <td class="cell-editable ws-cell-name" data-id="${entry.id}" data-field="name" title="Click to edit name">
            ${isEditingName ? `<input type="text" class="inline-edit-input ws-inline-input" data-id="${entry.id}" data-field="name" value="${escapeHtml(entry.name)}">` : `<strong class="ws-name-text">${escapeHtml(entry.name)}</strong>`}
          </td>
          <td class="cell-editable ws-cell-input" data-id="${entry.id}" data-field="rawInput" title="Click to edit measurement">
            ${isEditingInput ? `<input type="text" class="inline-edit-input ws-inline-input" data-id="${entry.id}" data-field="rawInput" value="${escapeHtml(entry.rawInput)}">` : `<span class="col-input-badge">${escapeHtml(entry.rawInput)}</span>`}
          </td>
          <td class="col-real">
            ${isInvalid ? `<span class="col-err" title="${escapeHtml(calc.errorMessage || 'Invalid')}">⚠️ ${escapeHtml(calc.errorMessage || 'Invalid')}</span>` : calc.realFormatted}
          </td>
          <td class="col-drawing">
            ${isInvalid ? '---' : calc.drawingFormatted}
          </td>
          <td>
            ${groupObj ? `<span class="col-group-tag" title="Group: ${escapeHtml(groupObj.name)}">${escapeHtml(groupObj.name)}</span>` : '<span style="color: var(--text-muted); font-size: 0.7rem;">—</span>'}
          </td>
          <td class="cell-editable ws-cell-notes" data-id="${entry.id}" data-field="notes" title="Click to edit notes">
            ${isEditingNotes ? `<input type="text" class="inline-edit-input ws-inline-input" data-id="${entry.id}" data-field="notes" value="${escapeHtml(entry.notes)}">` : `<span class="col-notes">${escapeHtml(entry.notes || '—')}</span>`}
          </td>
          <td style="text-align: center;">
            <input type="checkbox" class="ws-toggle-btn form-checkbox" data-id="${entry.id}" ${entry.enabled ? 'checked' : ''} title="${entry.enabled ? 'Disable row' : 'Enable row'}" aria-label="Toggle ${escapeHtml(entry.name)}">
          </td>
          <td>
            <div class="row-actions-group">
              <button type="button" class="row-action-btn ws-copy-row-btn" data-id="${entry.id}" title="Copy measurement">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
              </button>
              <button type="button" class="row-action-btn ws-dup-row-btn" data-id="${entry.id}" title="Duplicate row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button type="button" class="row-action-btn ws-up-row-btn" data-id="${entry.id}" ${isFirst ? 'disabled style="opacity: 0.3;"' : ''} title="Move up">↑</button>
              <button type="button" class="row-action-btn ws-down-row-btn" data-id="${entry.id}" ${isLast ? 'disabled style="opacity: 0.3;"' : ''} title="Move down">↓</button>
              <button type="button" class="row-action-btn danger ws-del-row-btn" data-id="${entry.id}" title="Delete row">✕</button>
            </div>
          </td>
        </tr>
      `;

      // Mobile Card
      cardsHtml += `
        <div class="dim-card ${!entry.enabled ? 'row-disabled' : ''} ${isInvalid ? 'row-invalid' : ''} ${isSelected ? 'row-selected' : ''}" data-id="${entry.id}">
          <div class="dim-card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="ws-select-row-checkbox form-checkbox" data-id="${entry.id}" ${isSelected ? 'checked' : ''} aria-label="Select ${escapeHtml(entry.name)}">
              <span class="type-badge ${badgeClass} ws-type-toggle" data-id="${entry.id}">${badgeLabel}</span>
              <span class="dim-card-title">${escapeHtml(entry.name)}</span>
            </div>
            <span class="col-input-badge">${escapeHtml(entry.rawInput)}</span>
          </div>
          <div class="dim-card-values">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800;">REAL WORLD</span>
              <span class="col-real" style="font-size: 0.95rem;">${isInvalid ? `⚠️ ${escapeHtml(calc.errorMessage || 'Invalid')}` : calc.realFormatted}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800;">DRAWING @ 1:${ws.scaleRatio}</span>
              <span class="col-drawing" style="font-size: 0.95rem;">${isInvalid ? '---' : calc.drawingFormatted}</span>
            </div>
          </div>
          ${entry.notes ? `<div style="font-size: 0.72rem; color: var(--text-secondary);">📝 ${escapeHtml(entry.notes)}</div>` : ''}
          <div class="dim-card-actions">
            <button type="button" class="row-action-btn ws-toggle-btn" data-id="${entry.id}">${entry.enabled ? 'Disable' : 'Enable'}</button>
            <button type="button" class="row-action-btn ws-copy-row-btn" data-id="${entry.id}" title="Copy value">Copy</button>
            <button type="button" class="row-action-btn ws-dup-row-btn" data-id="${entry.id}" title="Duplicate">Duplicate</button>
            <button type="button" class="row-action-btn ws-up-row-btn" data-id="${entry.id}" ${isFirst ? 'disabled' : ''}>↑</button>
            <button type="button" class="row-action-btn ws-down-row-btn" data-id="${entry.id}" ${isLast ? 'disabled' : ''}>↓</button>
            <button type="button" class="row-action-btn danger ws-del-row-btn" data-id="${entry.id}">Delete</button>
          </div>
        </div>
      `;
    });

    if (dom.workspaceTableBody) dom.workspaceTableBody.innerHTML = tableHtml;
    if (dom.workspaceCardsList) dom.workspaceCardsList.innerHTML = cardsHtml;

    // Toggle Empty State vs Table
    const isEmpty = ws.entries.length === 0;
    if (dom.workspaceEmptyState) dom.workspaceEmptyState.style.display = isEmpty ? 'flex' : 'none';
    if (dom.workspaceTable) dom.workspaceTable.style.display = isEmpty ? 'none' : 'table';

    // Update Multi-Metric Semantic Totals Display
    if (dom.workspaceActiveCount) {
      dom.workspaceActiveCount.textContent = `${totals.enabledCount} of ${totals.totalCount} active measurements`;
    }
    if (dom.workspaceTotalSegmentsReal) {
      dom.workspaceTotalSegmentsReal.textContent = totals.segmentRealFormatted;
    }
    if (dom.workspaceTotalSegmentsDrawing) {
      dom.workspaceTotalSegmentsDrawing.textContent = totals.segmentDrawingFormatted;
    }
    if (dom.workspaceTotalAllowancesReal) {
      dom.workspaceTotalAllowancesReal.textContent = totals.allowanceRealFormatted;
    }
    if (dom.workspaceTotalAllowancesDrawing) {
      dom.workspaceTotalAllowancesDrawing.textContent = totals.allowanceDrawingFormatted;
    }
    if (dom.workspaceTotalCombinedReal) {
      dom.workspaceTotalCombinedReal.textContent = totals.totalRealFormatted;
    }
    if (dom.workspaceTotalCombinedDrawing) {
      dom.workspaceTotalCombinedDrawing.textContent = totals.totalDrawingFormatted;
    }
    if (dom.workspaceTotalReferencesReal) {
      dom.workspaceTotalReferencesReal.textContent = totals.referenceRealFormatted;
    }
    if (dom.workspaceReferencesCountLabel) {
      dom.workspaceReferencesCountLabel.textContent = `${totals.referenceCount} reference items`;
    }

    // Backwards compatibility elements
    if (dom.workspaceTotalRealVal) dom.workspaceTotalRealVal.textContent = totals.totalRealFormatted;
    if (dom.workspaceTotalDrawingVal) dom.workspaceTotalDrawingVal.textContent = totals.totalDrawingFormatted;

    // Update State Badge
    if (dom.workspaceStateBadge) {
      if (totals.invalidCount > 0) {
        dom.workspaceStateBadge.className = 'state-badge state-error';
        dom.workspaceStateBadge.textContent = 'CORRECTION REQUIRED';
      } else {
        dom.workspaceStateBadge.className = 'state-badge state-ready';
        dom.workspaceStateBadge.textContent = 'READY';
      }
    }

    attachWorkspaceRowEvents();

    // Focus active inline input if editing
    if (state.workspaceEditingCell) {
      const inlineInput = dom.workspaceTableBody?.querySelector('.ws-inline-input');
      if (inlineInput) {
        inlineInput.focus();
        inlineInput.select();
      }
    }
  }

  function attachWorkspaceRowEvents() {
    // 1. Select Row Checkboxes
    document.querySelectorAll('.ws-select-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          state.workspaceSelectedIds.add(id);
        } else {
          state.workspaceSelectedIds.delete(id);
        }
        renderWorkspace();
      });
    });

    // 2. Type Badges Click to Cycle (reference -> segment -> allowance -> reference)
    document.querySelectorAll('.ws-type-toggle').forEach(badge => {
      badge.addEventListener('click', () => {
        const id = badge.dataset.id;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          const current = entry.dimensionType || DEFAULT_DIMENSION_TYPE;
          const next = current === 'reference' ? 'segment' : (current === 'segment' ? 'allowance' : 'reference');
          entry.dimensionType = next;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Set ${entry.name} type to ${next.toUpperCase()}`);
        }
      });
    });

    // 3. Group toggle collapse
    document.querySelectorAll('.ws-group-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const grpId = btn.dataset.groupId;
        const grp = (state.workspace.groups || []).find(g => g.id === grpId);
        if (grp) {
          grp.collapsed = !grp.collapsed;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 4. Ungroup all entries in group
    document.querySelectorAll('.ws-ungroup-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const grpId = btn.dataset.groupId;
        state.workspace.entries.forEach(e => {
          if (e.groupId === grpId) e.groupId = null;
        });
        state.workspace.groups = (state.workspace.groups || []).filter(g => g.id !== grpId);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast('Ungrouped entries');
      });
    });

    // 5. Inline Editing Cell Activation
    document.querySelectorAll('.cell-editable').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const id = cell.dataset.id;
        const field = cell.dataset.field;
        state.workspaceEditingCell = { id, field };
        renderWorkspace();
      });
    });

    // 6. Inline Input Event Handlers
    document.querySelectorAll('.ws-inline-input').forEach(input => {
      let isCommitted = false;
      const commitEdit = () => {
        if (isCommitted || !state.workspaceEditingCell) return;
        isCommitted = true;
        const { id, field } = state.workspaceEditingCell;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          const newVal = input.value.trim();
          if (field === 'rawInput') {
            const updated = updateDimensionEntry(entry, { rawInput: newVal });
            const idx = state.workspace.entries.findIndex(x => x.id === id);
            if (idx !== -1) state.workspace.entries[idx] = updated;
          } else if (field === 'name') {
            entry.name = newVal || 'Dimension';
          } else if (field === 'notes') {
            entry.notes = newVal;
          }
          saveWorkspace();
        }
        state.workspaceEditingCell = null;
        renderWorkspace();
        AudioService.playTick();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          isCommitted = true;
          state.workspaceEditingCell = null;
          renderWorkspace();
        }
      });

      input.addEventListener('blur', () => {
        commitEdit();
      });
    });

    // 7. Toggle on/off checkboxes
    document.querySelectorAll('.ws-toggle-btn').forEach(btn => {
      btn.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          entry.enabled = e.target.checked;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 8. Copy single row measurement
    document.querySelectorAll('.ws-copy-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          const calc = calculateEntryValues(entry, state.workspace.scaleRatio, state.workspace.displayUnit, state.precision);
          if (calc.isValid) {
            copyToClipboard(`${calc.realFormatted}`, `${entry.name} Real Dimension`);
          } else {
            showToast('Cannot copy invalid measurement', 'warning');
          }
        }
      });
    });

    // 9. Duplicate row
    document.querySelectorAll('.ws-dup-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx !== -1) {
          const dup = duplicateDimensionEntry(state.workspace.entries[idx]);
          state.workspace.entries.splice(idx + 1, 0, dup);
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Duplicated "${state.workspace.entries[idx].name}"`);
        }
      });
    });

    // 10. Move row up
    document.querySelectorAll('.ws-up-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx > 0) {
          const temp = state.workspace.entries[idx];
          state.workspace.entries[idx] = state.workspace.entries[idx - 1];
          state.workspace.entries[idx - 1] = temp;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 11. Move row down
    document.querySelectorAll('.ws-down-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx !== -1 && idx < state.workspace.entries.length - 1) {
          const temp = state.workspace.entries[idx];
          state.workspace.entries[idx] = state.workspace.entries[idx + 1];
          state.workspace.entries[idx + 1] = temp;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 12. Delete row
    document.querySelectorAll('.ws-del-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx !== -1) {
          const deletedName = state.workspace.entries[idx].name;
          state.workspace.entries.splice(idx, 1);
          state.workspaceSelectedIds.delete(id);
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Deleted "${deletedName}"`);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 13c. Global Architect Command Palette Controller (Ctrl+K / ⌘K)
  // ---------------------------------------------------------------------------
  let paletteQuery = '';
  let paletteSelectedIndex = 0;
  let paletteItems = [];
  let previousActiveElement = null;

  function openCommandPalette() {
    if (!dom.commandPaletteModal || !dom.commandPaletteOverlay) return;
    previousActiveElement = document.activeElement;
    dom.commandPaletteModal.classList.add('open');
    dom.commandPaletteOverlay.classList.add('open');
    paletteQuery = '';
    paletteSelectedIndex = 0;
    if (dom.commandPaletteInput) {
      dom.commandPaletteInput.value = '';
      dom.commandPaletteInput.focus();
    }
    renderCommandPalette('');
    AudioService.playTick();
  }

  function closeCommandPalette() {
    if (!dom.commandPaletteModal || !dom.commandPaletteModal.classList.contains('open')) return;
    dom.commandPaletteModal.classList.remove('open');
    dom.commandPaletteOverlay?.classList.remove('open');
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try { previousActiveElement.focus(); } catch (e) {}
    }
    AudioService.playTick();
  }

  function renderCommandPalette(query) {
    if (!dom.commandPaletteList) return;
    const searchData = CommandRegistry.searchCommands(query);
    paletteItems = [];
    let html = '';

    const isSearching = Boolean(query && query.trim() !== '');

    if (isSearching) {
      // 0a. Live Multi-Scale Command Detection (e.g. "compare 2400mm" or "2400mm")
      let compQuery = query.trim();
      const isCompareCommand = compQuery.toLowerCase().startsWith('compare ') || compQuery.toLowerCase().startsWith('scales ');
      if (isCompareCommand) {
        compQuery = compQuery.replace(/^(compare|scales)\s+/i, '').trim();
      }

      if (compQuery) {
        const parsedComp = parseMultiScaleInput(compQuery, {
          defaultUnit: state.workspace?.displayUnit || 'mm',
          precision: 2
        });
        if (parsedComp.isValid) {
          const s20 = calculateAtScale(parsedComp.canonicalMeters, 20, { displayUnit: parsedComp.displayUnit });
          const s50 = calculateAtScale(parsedComp.canonicalMeters, 50, { displayUnit: parsedComp.displayUnit });
          const s100 = calculateAtScale(parsedComp.canonicalMeters, 100, { displayUnit: parsedComp.displayUnit });
          const compItem = {
            id: 'multiscale-live-preview',
            title: `Compare scales: ${parsedComp.rawInput}`,
            description: `1:20 ➔ ${s20.formatted} | 1:50 ➔ ${s50.formatted} | 1:100 ➔ ${s100.formatted} • Open comparison →`,
            icon: '📊',
            shortcut: '↵ Open',
            available: true,
            isLiveMultiScale: true,
            action: () => {
              switchMode('multiscale');
              if (dom.multiscaleInput) {
                dom.multiscaleInput.value = compQuery;
                calculateMultiScale(true);
              }
            }
          };
          paletteItems.push(compItem);
          html += `<div class="command-section-header">📊 MULTI-SCALE COMPARISON PREVIEW</div>`;
          html += renderCommandItemHTML(compItem, paletteItems.length - 1);
        }
      }

      // 0b. Live Expression Detection Preview in Command Palette
      if (isExpressionLike(query)) {
        const liveCalc = evaluateExpressionSafe(query, {
          defaultUnit: state.workspace?.displayUnit || 'mm',
          scaleRatio: state.workspace?.scaleRatio || 50,
          precision: state.precision
        });
        if (liveCalc.isValid) {
          const exprItem = {
            id: 'expr-live-preview',
            title: `${query.trim()} = ${liveCalc.formatted}`,
            description: `Live Dimension Expression (Drawing: ${liveCalc.drawingFormatted || '---'} @ 1:50) • Press Enter to open in Expression Tool`,
            icon: '🧮',
            shortcut: '↵ Open',
            available: true,
            isLiveExpr: true,
            action: () => {
              switchMode('expression');
              if (dom.expressionInput) {
                dom.expressionInput.value = query.trim();
                calculateExpression(true);
              }
            }
          };
          paletteItems.push(exprItem);
          html += `<div class="command-section-header">🧮 LIVE DIMENSION MATH PREVIEW</div>`;
          html += renderCommandItemHTML(exprItem, paletteItems.length - 1);
        }
      }

      // 0c. Live Dimension Chain Detection (e.g. "chain 1200 1800 900" or "chain 1200+1800+900")
      let chainQuery = query.trim();
      const isChainCommand = chainQuery.toLowerCase().startsWith('chain ');
      if (isChainCommand) {
        chainQuery = chainQuery.slice(6).trim();
      }

      if (isChainCommand && chainQuery) {
        const segs = parseQuickChainInput(chainQuery, { defaultUnit: state.activeChain?.defaultUnit || 'mm' });
        if (segs.length > 0) {
          const tempChain = createDimensionChain({ name: 'Quick Chain', segments: segs, scaleRatio: state.activeChain?.scaleRatio || 50 });
          const calc = calculateChain(tempChain);
          if (calc.isValid) {
            const chainItem = {
              id: 'chain-live-preview',
              title: `Dimension Chain: ${calc.segmentCount} segments = ${calc.overallExtentFormatted}`,
              description: `Sequence: ${calc.segments.map(s => s.lengthFormatted).join(' ➔ ')} (Drawing @ 1:50: ${calc.drawingOverallFormatted}) • Open in Chains →`,
              icon: '🔗',
              shortcut: '↵ Open',
              available: true,
              isLiveChain: true,
              action: () => {
                switchMode('chains');
                if (dom.chainsQuickInput) {
                  dom.chainsQuickInput.value = chainQuery;
                  addSegmentsToChain(chainQuery);
                }
              }
            };
            paletteItems.push(chainItem);
            html += `<div class="command-section-header">🔗 LIVE DIMENSION CHAIN PREVIEW</div>`;
            html += renderCommandItemHTML(chainItem, paletteItems.length - 1);
          }
        }
      }

      if (searchData.results.length === 0 && paletteItems.length === 0) {
        html = `
          <div class="command-palette-empty">
            <div style="font-size: 1.4rem; margin-bottom: 0.35rem;">🔍</div>
            <div style="font-weight: 700; color: var(--text-primary);">No commands found</div>
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">No tools match "${escapeHtml(query)}"</div>
          </div>
        `;
      } else {
        if (searchData.results.length > 0) {
          html += `<div class="command-section-header">MATCHING COMMANDS (${searchData.results.length})</div>`;
          searchData.results.forEach(cmd => {
            paletteItems.push(cmd);
            html += renderCommandItemHTML(cmd, paletteItems.length - 1);
          });
        }
      }
    } else {
      // 1. Favorites
      const favs = CommandRegistry.getFavoriteCommands();
      if (favs.length > 0) {
        html += `<div class="command-section-header">★ FAVORITES (${favs.length})</div>`;
        favs.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1, true);
        });
      }

      // 2. Recent Commands
      const recents = CommandRegistry.getRecentCommands();
      if (recents.length > 0) {
        html += `<div class="command-section-header">RECENTLY USED (${recents.length})</div>`;
        recents.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }

      // 3. Navigation Tools
      const navCmds = CommandRegistry.getAllCommands().filter(c => c.category === 'Navigation');
      if (navCmds.length > 0) {
        html += `<div class="command-section-header">NAVIGATION TOOLS</div>`;
        navCmds.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }

      // 4. Utility Actions
      const utilCmds = CommandRegistry.getAllCommands().filter(c => c.category === 'Utility');
      if (utilCmds.length > 0) {
        html += `<div class="command-section-header">UTILITY ACTIONS</div>`;
        utilCmds.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }

      // 5. Upcoming Phase 2.5 Tools
      const upcomingCmds = CommandRegistry.getAllCommands().filter(c => !c.available);
      if (upcomingCmds.length > 0) {
        html += `<div class="command-section-header">UPCOMING ARCHITECT TOOLS (PHASE 2.5)</div>`;
        upcomingCmds.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }
    }

    dom.commandPaletteList.innerHTML = html;

    if (paletteSelectedIndex >= paletteItems.length) {
      paletteSelectedIndex = Math.max(0, paletteItems.length - 1);
    }

    updatePaletteSelection(false);

    // Attach Click and Favorite Listeners
    dom.commandPaletteList.querySelectorAll('.command-item').forEach(el => {
      const idx = parseInt(el.dataset.index, 10);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.cmd-fav-btn')) return;
        if (paletteItems[idx]) executeCommand(paletteItems[idx]);
      });
      el.addEventListener('mouseenter', () => {
        paletteSelectedIndex = idx;
        updatePaletteSelection(false);
      });
    });

    dom.commandPaletteList.querySelectorAll('.cmd-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmdId = btn.dataset.id;
        CommandRegistry.toggleFavorite(cmdId);
        renderCommandPalette(paletteQuery);
        AudioService.playTick();
      });
    });
  }

  function renderCommandItemHTML(cmd, index) {
    const isFav = CommandRegistry.isFavorite(cmd.id);
    const isSelected = index === paletteSelectedIndex;
    const isUnavailable = !cmd.available;

    return `
      <div
        class="command-item ${isSelected ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''}"
        data-id="${cmd.id}"
        data-index="${index}"
        role="option"
        aria-selected="${isSelected ? 'true' : 'false'}"
      >
        <div class="command-item-left">
          <span class="command-icon">${cmd.icon || '⚡'}</span>
          <div class="command-text-group">
            <div class="command-title">
              <span>${cmd.title}</span>
              ${cmd.badge ? `<span class="command-badge ${isUnavailable ? 'badge-upcoming' : ''}">${cmd.badge}</span>` : ''}
            </div>
            <div class="command-desc">${cmd.description}</div>
          </div>
        </div>
        <div class="command-item-right">
          ${cmd.shortcut ? `<span class="command-shortcut-badge"><kbd>${cmd.shortcut}</kbd></span>` : ''}
          <button
            class="cmd-fav-btn ${isFav ? 'is-fav' : ''}"
            data-id="${cmd.id}"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
            aria-label="Toggle favorite"
          >
            ${isFav ? '★' : '☆'}
          </button>
        </div>
      </div>
    `;
  }

  function updatePaletteSelection(scrollIntoView = true) {
    const items = dom.commandPaletteList?.querySelectorAll('.command-item');
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const isSel = idx === paletteSelectedIndex;
      item.classList.toggle('selected', isSel);
      item.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel && scrollIntoView) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function executeCommand(cmd) {
    if (!cmd) return;

    if (!cmd.available) {
      showToast(`ℹ️ ${cmd.title} is an upcoming Phase 2.5 feature`, 'info');
      AudioService.playKeyClick();
      return;
    }

    CommandRegistry.addRecentCommand(cmd.id);
    closeCommandPalette();

    switch (cmd.id) {
      case 'nav-converter':
        switchMode('converter');
        break;
      case 'nav-rescale':
        switchMode('rescale');
        break;
      case 'nav-detector':
        switchMode('detector');
        break;
      case 'nav-areavol':
        switchMode('area_volume');
        break;
      case 'nav-furniture':
        switchMode('furniture');
        break;
      case 'nav-reference':
        switchMode('reference');
        break;
      case 'nav-workspace':
        switchMode('workspace');
        break;
      case 'nav-expression':
        switchMode('expression');
        break;
      case 'nav-multiscale':
        switchMode('multiscale');
        break;
      case 'nav-chains':
        switchMode('chains');
        break;
      case 'nav-cad-clipboard':
        switchMode('cad_clipboard');
        break;
      case 'nav-batch-cad':
        switchMode('batch_cad');
        break;
      case 'nav-history':
        toggleHistoryDrawer();
        break;
      case 'nav-shortcuts':
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
        break;
      case 'util-copy-result': {
        let val = null;
        let unit = '';
        if (state.currentMode === 'converter') {
          val = dom.converterResultVal?.textContent;
          unit = dom.converterResultUnit?.textContent || '';
        } else if (state.currentMode === 'rescale') {
          val = dom.rescaleResultVal?.textContent;
          unit = dom.rescaleResultUnit?.textContent || '';
        } else if (state.currentMode === 'detector') {
          val = dom.detectorRatioVal?.textContent;
        } else if (state.currentMode === 'area_volume') {
          val = dom.areavolResultVal?.textContent;
          unit = dom.areavolResultUnit?.textContent || '';
        } else if (state.currentMode === 'furniture') {
          val = dom.customFurnResult?.textContent;
        } else if (state.currentMode === 'workspace') {
          val = dom.workspaceTotalRealVal?.textContent;
          unit = '';
        } else if (state.currentMode === 'expression') {
          val = dom.expressionResultVal?.textContent;
          unit = dom.expressionResultUnit?.textContent || '';
        } else if (state.currentMode === 'multiscale') {
          if (state.lastValidMultiScale) {
            val = formatScaleComparison(state.lastValidMultiScale, 'table');
            unit = '';
          }
        } else if (state.currentMode === 'chains') {
          if (state.lastValidChain) {
            val = formatChainForClipboard(state.lastValidChain, 'table');
            unit = '';
          }
        }
        if (val && val !== '---') {
          copyToClipboard(`${val} ${unit}`.trim(), 'Active Result');
        } else {
          showToast('No active calculation result to copy', 'warning');
        }
        break;
      }
      case 'util-toggle-theme': {
        const themeOrder = ['dark', 'paper', 'blueprint'];
        const currentIdx = themeOrder.indexOf(state.activeTheme);
        const nextTheme = themeOrder[(currentIdx + 1) % themeOrder.length];
        applyTheme(nextTheme);
        if (dom.themeSelect) dom.themeSelect.value = nextTheme;
        showToast(`Theme switched to ${nextTheme.toUpperCase()}`);
        break;
      }
      case 'util-toggle-sound': {
        const newState = AudioService.toggleSound();
        updateSoundUI();
        showToast(newState ? '🔊 Tactile sound enabled' : '🔇 Sound muted');
        break;
      }
      case 'util-export-csv': {
        const csv = HistoryService.exportCSV();
        if (csv) {
          downloadFile(csv, `architecture-helping-hand-${Date.now()}.csv`, 'text/csv');
          showToast('Exported history as CSV');
        } else {
          showToast('History is empty', 'warning');
        }
        break;
      }
      case 'util-export-md': {
        const md = HistoryService.exportMarkdown();
        if (md) {
          copyToClipboard(md, 'Markdown History Table');
        } else {
          showToast('History is empty', 'warning');
        }
        break;
      }
      case 'util-clear-history': {
        HistoryService.clear();
        renderHistoryList();
        showToast('Calculation history cleared');
        break;
      }
      default:
        if (typeof cmd.action === 'function') {
          cmd.action();
        }
        break;
    }

    AudioService.playTick();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // 13d. Mode 8: Dimension Expression Controller
  // ---------------------------------------------------------------------------
  function calculateExpression(isExplicitRun = false) {
    if (!dom.expressionInput) return;

    const rawExpr = dom.expressionInput.value.trim();
    const defaultUnit = dom.expressionDefaultUnit?.value || 'mm';
    let scaleRatio = 50;
    if (dom.expressionScaleSelect) {
      if (dom.expressionScaleSelect.value === 'custom') {
        scaleRatio = parseFloat(dom.expressionCustomScaleInput?.value) || 50;
      } else {
        scaleRatio = parseFloat(dom.expressionScaleSelect.value) || 50;
      }
    }

    // Empty input state
    if (rawExpr === '') {
      if (dom.expressionLivePreview) dom.expressionLivePreview.textContent = 'Live: Ready';
      if (dom.expressionErrorMsg) dom.expressionErrorMsg.style.display = 'none';
      if (dom.expressionResultVal) dom.expressionResultVal.textContent = '0';
      if (dom.expressionResultUnit) dom.expressionResultUnit.textContent = defaultUnit;
      if (dom.expressionDrawingVal) dom.expressionDrawingVal.textContent = `0 ${defaultUnit}`;
      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'ready'
      });
      return;
    }

    const evalResult = evaluateExpressionSafe(rawExpr, {
      defaultUnit,
      scaleRatio,
      precision: state.precision
    });

    if (evalResult.isValid) {
      state.lastValidExpression = evalResult;

      // Update Live Preview Pill
      if (dom.expressionLivePreview) {
        dom.expressionLivePreview.textContent = `Live: = ${evalResult.formatted}`;
        dom.expressionLivePreview.style.color = 'var(--text-accent)';
      }
      if (dom.expressionErrorMsg) dom.expressionErrorMsg.style.display = 'none';

      // Update Primary Result Value & Unit
      if (dom.expressionResultVal) dom.expressionResultVal.textContent = evalResult.formatted.replace(/\s*[a-zA-Z²³_"-]+$/, '') || evalResult.formatted;
      if (dom.expressionResultUnit) dom.expressionResultUnit.textContent = (evalResult.dimension === 'scalar') ? 'scalar count' : evalResult.displayUnit;

      // Update Dimension Badge
      if (dom.expressionDimBadge) {
        dom.expressionDimBadge.textContent = evalResult.dimension.toUpperCase();
        dom.expressionDimBadge.className = evalResult.dimension === 'scalar' ? 'type-badge badge-alw' : 'type-badge badge-seg';
      }

      // Update Drawing Scale Output
      if (dom.expressionDrawingLabel) {
        dom.expressionDrawingLabel.textContent = `Scale 1:${scaleRatio}`;
      }
      if (dom.expressionDrawingVal) {
        dom.expressionDrawingVal.textContent = evalResult.drawingFormatted || '---';
      }

      // Update Secondary Unit Equivalents
      if (dom.expressionSecondaryReadout && evalResult.secondaryFormatted.length > 0) {
        dom.expressionSecondaryReadout.innerHTML = evalResult.secondaryFormatted.map(sec => `
          <div class="secondary-item"><span class="sec-unit">${sec.unit}</span><span class="sec-val">${sec.formatted}</span></div>
        `).join('');
      } else if (dom.expressionSecondaryReadout && evalResult.dimension === 'scalar') {
        dom.expressionSecondaryReadout.innerHTML = `
          <div class="secondary-item"><span class="sec-unit">count</span><span class="sec-val">${evalResult.formatted}</span></div>
        `;
      }

      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'success'
      });

      if (isExplicitRun) {
        addRecentExpression(rawExpr, evalResult.formatted);
        AudioService.playTick();
      }
    } else {
      // Invalid or incomplete syntax
      if (dom.expressionLivePreview) {
        dom.expressionLivePreview.textContent = `Live: Incomplete`;
        dom.expressionLivePreview.style.color = 'var(--color-error)';
      }
      if (dom.expressionErrorMsg) {
        dom.expressionErrorMsg.textContent = `⚠️ ${evalResult.error.message}`;
        dom.expressionErrorMsg.style.display = 'block';
      }

      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'error',
        errorText: `⚠️ ${evalResult.error.message}`
      });
    }
  }

  function addRecentExpression(expr, formatted) {
    if (!state.recentExpressions) state.recentExpressions = [];
    // Prevent duplicate adjacent
    if (state.recentExpressions.length > 0 && state.recentExpressions[0].expr === expr) return;
    state.recentExpressions.unshift({ expr, formatted, time: Date.now() });
    if (state.recentExpressions.length > 10) state.recentExpressions.pop();
    renderRecentExpressions();
  }

  function renderRecentExpressions() {
    if (!dom.expressionRecentList) return;
    if (!state.recentExpressions || state.recentExpressions.length === 0) {
      dom.expressionRecentList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No recent expressions evaluated yet.</span>';
      return;
    }

    dom.expressionRecentList.innerHTML = state.recentExpressions.map(item => `
      <div class="recent-expr-item" data-expr="${escapeHtml(item.expr)}" title="Click to load expression">
        <span class="recent-expr-formula">${escapeHtml(item.expr)}</span>
        <span class="recent-expr-result">= ${escapeHtml(item.formatted)}</span>
      </div>
    `).join('');

    dom.expressionRecentList.querySelectorAll('.recent-expr-item').forEach(el => {
      el.addEventListener('click', () => {
        const expr = el.dataset.expr;
        if (dom.expressionInput) {
          dom.expressionInput.value = expr;
          calculateExpression(true);
          AudioService.playTick();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 13e. Mode 9: Multi-Scale Comparison Controller
  // ---------------------------------------------------------------------------
  function calculateMultiScale(isExplicitRun = false) {
    if (!dom.multiscaleInput) return;

    const rawInput = dom.multiscaleInput.value.trim();
    const defaultUnit = dom.multiscaleDefaultUnit?.value || 'mm';
    const displayUnit = dom.multiscaleDisplayUnit?.value || 'mm';
    const sortOrder = dom.multiscaleSortSelect?.value || 'ratio_asc';
    const paperSize = dom.multiscalePaperSelect?.value === 'none' ? null : dom.multiscalePaperSelect?.value;
    const minFit = dom.multiscaleFitMin?.value ? parseFloat(dom.multiscaleFitMin.value) : null;
    const maxFit = dom.multiscaleFitMax?.value ? parseFloat(dom.multiscaleFitMax.value) : null;

    // Determine scale ratios to compare
    let baseRatios = [];
    if (state.multiscaleGroup === 'favorites') {
      baseRatios = state.multiscaleFavorites && state.multiscaleFavorites.length > 0
        ? [...state.multiscaleFavorites]
        : [20, 50, 100];
    } else if (SCALE_PRESET_GROUPS[state.multiscaleGroup]) {
      baseRatios = [...SCALE_PRESET_GROUPS[state.multiscaleGroup]];
    } else {
      baseRatios = getDefaultComparisonScales();
    }

    // Merge custom scale ratios
    if (Array.isArray(state.multiscaleCustomScales)) {
      for (const cr of state.multiscaleCustomScales) {
        if (!baseRatios.includes(cr)) baseRatios.push(cr);
      }
    }

    // Empty input check
    if (rawInput === '') {
      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = 'Live: Ready';
        dom.multiscaleLivePreview.style.color = 'var(--text-muted)';
      }
      if (dom.multiscaleErrorMsg) dom.multiscaleErrorMsg.style.display = 'none';
      if (dom.multiscaleRealVal) dom.multiscaleRealVal.textContent = `0 ${displayUnit}`;
      if (dom.multiscaleCountBadge) dom.multiscaleCountBadge.textContent = '0 SCALES';
      if (dom.multiscaleTableBody) dom.multiscaleTableBody.innerHTML = '';
      if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'block';
      if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'none';
      setUnifiedResultState({ toolPrefix: 'multiscale', status: 'ready' });
      return;
    }

    const comparison = compareAcrossScales(rawInput, baseRatios, {
      defaultUnit,
      displayUnit,
      currentScaleRatio: state.scaleRatio || 50,
      sortOrder,
      paperSize,
      targetFitMinMm: minFit,
      targetFitMaxMm: maxFit,
      favoriteRatios: state.multiscaleFavorites,
      precision: state.precision
    });

    if (comparison.isValid) {
      state.lastValidMultiScale = comparison;

      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = `Live: = ${comparison.input.formattedReal}`;
        dom.multiscaleLivePreview.style.color = 'var(--text-accent)';
      }
      if (dom.multiscaleErrorMsg) dom.multiscaleErrorMsg.style.display = 'none';
      if (dom.multiscaleRealVal) dom.multiscaleRealVal.textContent = comparison.input.formattedReal;
      if (dom.multiscaleRealLabel) {
        dom.multiscaleRealLabel.textContent = comparison.input.isExpression
          ? `Evaluated: ${comparison.input.raw}`
          : `Real Dimension (${comparison.input.displayUnit})`;
      }
      if (dom.multiscaleCountBadge) {
        dom.multiscaleCountBadge.textContent = `${comparison.count} SCALES`;
      }

      renderMultiScaleTable(comparison);
      setUnifiedResultState({ toolPrefix: 'multiscale', status: 'success' });

      if (isExplicitRun) {
        AudioService.playTick();
      }
    } else {
      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = `Live: Incomplete`;
        dom.multiscaleLivePreview.style.color = 'var(--color-error)';
      }
      if (dom.multiscaleErrorMsg) {
        dom.multiscaleErrorMsg.textContent = `⚠️ ${comparison.errorMessage}`;
        dom.multiscaleErrorMsg.style.display = 'block';
      }
      setUnifiedResultState({
        toolPrefix: 'multiscale',
        status: 'error',
        errorText: `⚠️ ${comparison.errorMessage}`
      });
    }
  }

  function renderMultiScaleTable(comparison) {
    if (!dom.multiscaleTableBody) return;

    if (!comparison || !comparison.isValid || comparison.scales.length === 0) {
      if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'block';
      if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'none';
      dom.multiscaleTableBody.innerHTML = '';
      return;
    }

    if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'none';
    if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'block';

    dom.multiscaleTableBody.innerHTML = comparison.scales.map(s => {
      const isFav = state.multiscaleFavorites && state.multiscaleFavorites.includes(s.ratio);
      let statusHtml = '';
      if (s.isCurrent) {
        statusHtml += `<span class="badge-current-scale">★ CURRENT</span> `;
      }
      if (s.fitStatus === 'suggested') {
        statusHtml += `<span class="badge-suggested-fit">✓ FIT</span> `;
      }
      if (s.fitsPaper === false) {
        statusHtml += `<span class="badge-sheet-exceed" title="Exceeds sheet width">⚠️ EXCEEDS</span> `;
      }

      return `
        <tr class="multiscale-row ${s.isCurrent ? 'is-current' : ''}">
          <td style="text-align: center;">
            <button type="button" class="scale-fav-btn ${isFav ? 'is-fav' : ''}" data-ratio="${s.ratio}" title="${isFav ? 'Remove from favorites' : 'Mark as favorite'}">
              ${isFav ? '★' : '☆'}
            </button>
          </td>
          <td>
            <strong style="font-family: var(--font-family-mono); color: var(--text-primary);">${escapeHtml(s.label)}</strong>
          </td>
          <td>
            <span style="font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-primary);">${escapeHtml(s.formatted)}</span>
          </td>
          <td class="multiscale-bar-cell">
            <div class="multiscale-bar-track" title="Drawing length at ${s.label}: ${s.formatted} (${s.barPercent}% of max)">
              <div class="multiscale-bar-fill" style="width: ${s.barPercent}%;"></div>
            </div>
          </td>
          <td>
            ${statusHtml || '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
          </td>
          <td style="text-align: right;">
            <button type="button" class="multiscale-row-action-btn ms-add-ws-btn" data-ratio="${s.ratio}" data-formatted="${escapeHtml(s.formatted)}" data-label="${escapeHtml(s.label)}" title="Add ${s.formatted} to Dimension Workspace">
              + WS
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row favorite toggles
    dom.multiscaleTableBody.querySelectorAll('.scale-fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        toggleScaleFavorite(ratio);
      });
    });

    // Attach row add-to-workspace buttons
    dom.multiscaleTableBody.querySelectorAll('.ms-add-ws-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        const formatted = btn.dataset.formatted;
        const label = btn.dataset.label;
        const rawDim = comparison.input.formattedReal;

        const entry = createDimensionEntry({
          name: `Scale ${label} (${rawDim})`,
          rawInput: formatted,
          dimensionType: 'reference',
          defaultUnit: comparison.input.displayUnit,
          notes: `Source: Multi-Scale Comparison (${label})`
        }, comparison.input.displayUnit);

        state.workspace.entries.push(entry);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast(`Added [REF] "Scale ${label}" (${formatted}) to Workspace`);
      });
    });
  }

  function toggleScaleFavorite(ratio) {
    if (!Array.isArray(state.multiscaleFavorites)) state.multiscaleFavorites = [];
    const idx = state.multiscaleFavorites.indexOf(ratio);
    if (idx >= 0) {
      state.multiscaleFavorites.splice(idx, 1);
      showToast(`Removed 1:${ratio} from favorites`);
    } else {
      state.multiscaleFavorites.push(ratio);
      showToast(`Saved 1:${ratio} to favorites`);
    }
    StorageService.setItem('archiscale_multiscale_favs', JSON.stringify(state.multiscaleFavorites));
    calculateMultiScale(false);
  }

  function addCustomScale(ratio) {
    if (isNaN(ratio) || ratio <= 0 || !isFinite(ratio)) {
      showToast('Enter a valid positive scale ratio (e.g. 33 for 1:33)', 'warning');
      return;
    }
    if (!Array.isArray(state.multiscaleCustomScales)) state.multiscaleCustomScales = [];
    if (!state.multiscaleCustomScales.includes(ratio)) {
      state.multiscaleCustomScales.push(ratio);
      showToast(`Added custom scale 1:${ratio}`);
      calculateMultiScale(true);
    } else {
      showToast(`Custom scale 1:${ratio} is already present`);
    }
  }

  // ---------------------------------------------------------------------------
  // 13f. Mode 10: Dimension Chains Controller
  // ---------------------------------------------------------------------------
  function saveChain() {
    if (state.activeChain) {
      StorageService.setItem(CHAIN_STORAGE_KEY, JSON.stringify(state.activeChain));
    }
  }

  function calculateAndRenderChain(isExplicitRun = false) {
    if (!state.activeChain) return;

    // Sync input fields to state.activeChain
    if (dom.chainsNameInput) state.activeChain.name = dom.chainsNameInput.value.trim() || 'Dimension Chain';
    if (dom.chainsScaleSelect) state.activeChain.scaleRatio = parseFloat(dom.chainsScaleSelect.value) || 50;
    if (dom.chainsUnitSelect) state.activeChain.defaultUnit = dom.chainsUnitSelect.value || 'mm';
    if (dom.chainsStartOffsetInput) state.activeChain.startOffsetRaw = dom.chainsStartOffsetInput.value.trim() || '0';
    if (dom.chainsEndOffsetInput) state.activeChain.endOffsetRaw = dom.chainsEndOffsetInput.value.trim() || '0';

    const calc = calculateChain(state.activeChain, {
      displayUnit: state.activeChain.defaultUnit,
      scaleRatio: state.activeChain.scaleRatio,
      precision: state.precision
    });

    state.lastValidChain = calc;

    // Update Result Hero and Breakdown Metrics
    if (dom.chainsOverallVal) dom.chainsOverallVal.textContent = calc.overallExtentFormatted;
    if (dom.chainsDrawingOverall) {
      dom.chainsDrawingOverall.textContent = `Drawing @ 1:${calc.scaleRatio}: ${calc.drawingOverallFormatted}`;
    }
    if (dom.chainsCountBadge) {
      dom.chainsCountBadge.textContent = `${calc.segmentCount} SEGMENTS`;
    }
    if (dom.chainsSegTotalVal) dom.chainsSegTotalVal.textContent = calc.segmentTotalFormatted;
    if (dom.chainsAlwTotalVal) dom.chainsAlwTotalVal.textContent = calc.allowanceTotalFormatted;
    if (dom.chainsStartOffsetVal) dom.chainsStartOffsetVal.textContent = calc.startOffsetFormatted;
    if (dom.chainsEndOffsetVal) dom.chainsEndOffsetVal.textContent = calc.endOffsetFormatted;

    // Update Live Input Preview
    if (dom.chainsQuickInput) {
      const quickVal = dom.chainsQuickInput.value.trim();
      if (quickVal) {
        const segs = parseQuickChainInput(quickVal, { defaultUnit: state.activeChain.defaultUnit });
        if (segs.length > 0) {
          dom.chainsLivePreview.textContent = `Live: +${segs.length} segment(s)`;
          dom.chainsLivePreview.style.color = 'var(--text-accent)';
        }
      } else {
        dom.chainsLivePreview.textContent = 'Live: Ready';
        dom.chainsLivePreview.style.color = 'var(--text-muted)';
      }
    }

    // Render SVG Visualizer and Schedule Table
    renderChainSVGView(calc);
    renderChainTable(calc);
    updateSelectedSegmentInspector(calc);

    setUnifiedResultState({
      toolPrefix: 'chains',
      status: calc.isValid ? 'success' : (calc.invalidCount > 0 ? 'error' : 'ready'),
      errorText: calc.invalidCount > 0 ? `⚠️ ${calc.invalidCount} segment(s) have invalid measurement inputs` : ''
    });

    saveChain();

    if (isExplicitRun) {
      AudioService.playTick();
    }
  }

  function renderChainSVGView(calc) {
    if (!dom.chainsSvgViewportWrapper) return;
    const svgMarkup = generateChainSVG(calc, {
      selectedSegmentId: state.chainSelectedSegmentId,
      svgWidth: 860,
      svgHeight: 180
    });
    dom.chainsSvgViewportWrapper.innerHTML = svgMarkup;
  }

  function updateSelectedSegmentInspector(calc) {
    if (!dom.chainsSelectedInspector) return;

    if (!state.chainSelectedSegmentId) {
      dom.chainsSelectedInspector.style.display = 'none';
      return;
    }

    const seg = (calc.segments || []).find(s => s.id === state.chainSelectedSegmentId);
    if (!seg) {
      dom.chainsSelectedInspector.style.display = 'none';
      return;
    }

    dom.chainsSelectedInspector.style.display = 'flex';
    if (dom.chainsInspectorName) dom.chainsInspectorName.textContent = seg.name;
    if (dom.chainsInspectorLen) dom.chainsInspectorLen.textContent = seg.lengthFormatted;
    if (dom.chainsInspectorStart) dom.chainsInspectorStart.textContent = seg.startFormatted;
    if (dom.chainsInspectorEnd) dom.chainsInspectorEnd.textContent = seg.endFormatted;
    if (dom.chainsInspectorDraw) dom.chainsInspectorDraw.textContent = seg.drawingFormatted;
  }

  function renderChainTable(calc) {
    if (!dom.chainsTableBody) return;

    if (!calc.segments || calc.segments.length === 0) {
      dom.chainsTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic;">
            No segments in this dimension chain. Type numbers above (e.g. 1200 + 1800 + 900) or pick a template to get started.
          </td>
        </tr>
      `;
      return;
    }

    dom.chainsTableBody.innerHTML = calc.segments.map((seg, idx) => {
      const isSelected = seg.id === state.chainSelectedSegmentId;
      const typeBadgeClass = seg.dimensionType === 'reference'
        ? 'badge-role-ref'
        : seg.dimensionType === 'allowance'
        ? 'badge-role-alw'
        : 'badge-role-seg';

      const typeShortLabel = seg.dimensionType === 'reference'
        ? 'REF'
        : seg.dimensionType === 'allowance'
        ? 'ALW'
        : 'SEG';

      return `
        <tr class="chain-row ${isSelected ? 'is-selected' : ''}" data-id="${seg.id}" data-index="${idx}">
          <td style="text-align: center; font-family: var(--font-family-mono); font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="text-align: center;">
            <input type="checkbox" class="chain-toggle-chk" data-index="${idx}" ${seg.enabled !== false ? 'checked' : ''} title="Toggle segment enable/disable" />
          </td>
          <td>
            <input type="text" class="chain-inline-name" data-index="${idx}" value="${escapeHtml(seg.name)}" placeholder="Name" style="background: transparent; border: 1px solid transparent; width: 100%; font-weight: 600; color: var(--text-primary);" />
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${seg.startFormatted}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${seg.endFormatted}</td>
          <td>
            <input type="text" class="chain-inline-input" data-index="${idx}" value="${escapeHtml(seg.rawInput)}" style="background: transparent; border: 1px solid var(--border-color-light); border-radius: 3px; padding: 2px 4px; width: 90px; font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-primary);" />
          </td>
          <td style="text-align: center;">
            <button type="button" class="dim-type-badge ${typeBadgeClass} chain-type-cycle-btn" data-index="${idx}" title="Click to cycle type (SEG ➔ REF ➔ ALW)">
              ${typeShortLabel}
            </button>
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">${seg.drawingFormatted}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="chain-reorder-btn chain-move-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move segment up">↑</button>
            <button type="button" class="chain-reorder-btn chain-move-down" data-index="${idx}" ${idx === calc.segments.length - 1 ? 'disabled' : ''} title="Move segment down">↓</button>
          </td>
          <td style="text-align: center;">
            <button type="button" class="chain-row-del-btn" data-index="${idx}" title="Delete segment">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row selection click listeners
    dom.chainsTableBody.querySelectorAll('.chain-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        const id = row.dataset.id;
        selectChainSegment(state.chainSelectedSegmentId === id ? null : id);
      });
    });

    // Toggle segment enabled checkbox
    dom.chainsTableBody.querySelectorAll('.chain-toggle-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].enabled = e.target.checked;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Inline name edit
    dom.chainsTableBody.querySelectorAll('.chain-inline-name').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].name = e.target.value.trim() || `Segment ${idx + 1}`;
          calculateAndRenderChain(false);
        }
      });
    });

    // Inline measurement edit
    dom.chainsTableBody.querySelectorAll('.chain-inline-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].rawInput = e.target.value.trim();
          calculateAndRenderChain(true);
        }
      });
    });

    // Cycle type button
    dom.chainsTableBody.querySelectorAll('.chain-type-cycle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          const curType = state.activeChain.segments[idx].dimensionType;
          const nextType = curType === 'segment' ? 'reference' : (curType === 'reference' ? 'allowance' : 'segment');
          state.activeChain.segments[idx].dimensionType = nextType;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Move Up / Down buttons
    dom.chainsTableBody.querySelectorAll('.chain-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx > 0) {
          const temp = state.activeChain.segments[idx];
          state.activeChain.segments[idx] = state.activeChain.segments[idx - 1];
          state.activeChain.segments[idx - 1] = temp;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    dom.chainsTableBody.querySelectorAll('.chain-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx < state.activeChain.segments.length - 1) {
          const temp = state.activeChain.segments[idx];
          state.activeChain.segments[idx] = state.activeChain.segments[idx + 1];
          state.activeChain.segments[idx + 1] = temp;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Delete segment button
    dom.chainsTableBody.querySelectorAll('.chain-row-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          const delId = state.activeChain.segments[idx].id;
          if (state.chainSelectedSegmentId === delId) state.chainSelectedSegmentId = null;
          state.activeChain.segments.splice(idx, 1);
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });
  }

  function selectChainSegment(id) {
    state.chainSelectedSegmentId = id;
    if (state.lastValidChain) {
      renderChainSVGView(state.lastValidChain);
      updateSelectedSegmentInspector(state.lastValidChain);
      // Highlight row in table
      dom.chainsTableBody?.querySelectorAll('.chain-row').forEach(row => {
        row.classList.toggle('is-selected', row.dataset.id === id);
      });
    }
  }

  function addSegmentsToChain(rawStr) {
    if (!rawStr || typeof rawStr !== 'string' || !rawStr.trim()) return;
    const newSegs = parseQuickChainInput(rawStr.trim(), { defaultUnit: state.activeChain.defaultUnit });
    if (newSegs.length > 0) {
      if (!Array.isArray(state.activeChain.segments)) state.activeChain.segments = [];
      state.activeChain.segments.push(...newSegs);
      calculateAndRenderChain(true);
      AudioService.playTick();
      showToast(`Added ${newSegs.length} segment(s) to chain`);
    }
  }

  function loadChainTemplate(templateKey) {
    const tpl = CHAIN_TEMPLATES[templateKey];
    if (!tpl) return;
    state.activeChain = createDimensionChain({
      name: tpl.name,
      defaultUnit: tpl.defaultUnit || 'mm',
      scaleRatio: state.activeChain?.scaleRatio || 50,
      segments: tpl.segments.map(s => createChainSegment(s, tpl.defaultUnit || 'mm'))
    });
    if (dom.chainsNameInput) dom.chainsNameInput.value = state.activeChain.name;
    if (dom.chainsUnitSelect) dom.chainsUnitSelect.value = state.activeChain.defaultUnit;
    state.chainSelectedSegmentId = null;
    calculateAndRenderChain(true);
    AudioService.playTick();
    showToast(`Loaded "${tpl.name}" template`);
  }

  // ---------------------------------------------------------------------------
  // 13g. Mode 11: CAD Clipboard Controller
  // ---------------------------------------------------------------------------
  function saveCadClipboardSettings() {
    try {
      StorageService.setItem(CAD_STORAGE_KEY, JSON.stringify(state.cadClipboard));
    } catch (e) {}
  }

  function applyCadPreset(presetKey) {
    const preset = CAD_FORMAT_PRESETS[presetKey];
    if (!preset) return;

    state.cadClipboard.preset = presetKey;
    state.cadClipboard.unit = preset.defaultUnit;
    state.cadClipboard.precision = preset.defaultPrecision;
    state.cadClipboard.suffix = preset.defaultSuffix;
    state.cadClipboard.delimiter = preset.defaultDelimiter;
    state.cadClipboard.targetValue = preset.targetValue;

    // Sync UI elements
    if (dom.cadTargetSelect) dom.cadTargetSelect.value = state.cadClipboard.targetValue;
    if (dom.cadUnitSelect) dom.cadUnitSelect.value = state.cadClipboard.unit;
    if (dom.cadPrecisionSelect) dom.cadPrecisionSelect.value = String(state.cadClipboard.precision);
    if (dom.cadSuffixSelect) dom.cadSuffixSelect.value = state.cadClipboard.suffix;
    if (dom.cadDelimiterSelect) dom.cadDelimiterSelect.value = state.cadClipboard.delimiter;

    // Sync active chip
    dom.cadQuickChips?.querySelectorAll('.cad-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === presetKey);
    });

    renderCadClipboard(true);
    AudioService.playTick();
    showToast(`Loaded preset "${preset.name}"`);
  }

  function renderCadClipboard(isExplicitRun = false) {
    const cad = state.cadClipboard;

    // Sync form values into state
    if (dom.cadTargetSelect) cad.targetValue = dom.cadTargetSelect.value || 'real';
    if (dom.cadUnitSelect) cad.unit = dom.cadUnitSelect.value || 'mm';
    if (dom.cadPrecisionSelect) cad.precision = parseInt(dom.cadPrecisionSelect.value, 10) || 0;
    if (dom.cadSuffixSelect) cad.suffix = dom.cadSuffixSelect.value || 'none';
    if (dom.cadDelimiterSelect) cad.delimiter = dom.cadDelimiterSelect.value || 'space';
    if (dom.cadScopeSelect) cad.filterScope = dom.cadScopeSelect.value || 'all';

    // Show/hide manual input group
    if (dom.cadManualGroup) {
      dom.cadManualGroup.style.display = cad.source === 'manual' ? 'block' : 'none';
    }

    // Sync active source pill
    dom.cadSourcePills?.querySelectorAll('.cad-source-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.source === cad.source);
    });

    // Sync active preset chip
    dom.cadQuickChips?.querySelectorAll('.cad-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === cad.preset);
    });

    let outputResult = { text: '', count: 0 };

    if (cad.source === 'workspace') {
      outputResult = formatCadWorkspace(state.workspace, {
        filterScope: cad.filterScope,
        selectedIds: state.workspaceSelectedIds,
        targetValue: cad.targetValue,
        format: cad.preset,
        unit: cad.unit,
        precision: cad.precision,
        suffix: cad.suffix,
        delimiter: cad.delimiter,
        scaleRatio: state.workspace?.scaleRatio || 50
      });
    } else if (cad.source === 'chain') {
      if (state.lastValidChain) {
        outputResult = formatCadChain(state.lastValidChain, {
          chainOutputMode: cad.preset === 'spreadsheet' ? 'table' : 'segments',
          targetValue: cad.targetValue,
          unit: cad.unit,
          precision: cad.precision,
          suffix: cad.suffix,
          delimiter: cad.delimiter
        });
      }
    } else if (cad.source === 'expression') {
      if (state.lastValidExpression) {
        outputResult = formatCadExpression(state.lastValidExpression, {
          targetValue: cad.targetValue,
          unit: cad.unit,
          precision: cad.precision,
          suffix: cad.suffix
        });
      }
    } else if (cad.source === 'multiscale') {
      if (state.lastValidMultiScale) {
        outputResult = formatCadMultiScale(state.lastValidMultiScale, {
          format: cad.preset,
          unit: cad.unit,
          precision: cad.precision,
          suffix: cad.suffix,
          delimiter: cad.delimiter
        });
      }
    } else if (cad.source === 'manual') {
      const raw = dom.cadManualInput?.value || cad.manualInput || '';
      outputResult = formatManualCadInput(raw, {
        unit: cad.unit,
        precision: cad.precision,
        suffix: cad.suffix,
        delimiter: cad.delimiter
      });
    }

    cad.lastFormattedText = outputResult.text;

    // Update Preview Textarea
    if (dom.cadPreviewBox) {
      dom.cadPreviewBox.value = outputResult.text;
    }

    // Update Summary Metadata Tag
    if (dom.cadSummaryBadge) {
      dom.cadSummaryBadge.textContent = getCadFormatSummary(outputResult.count, {
        targetValue: cad.targetValue,
        unit: cad.unit,
        precision: cad.precision,
        suffix: cad.suffix
      });
    }

    // Update Item Count Badge in Source Strip
    if (dom.cadSourceCountBadge) {
      dom.cadSourceCountBadge.textContent = `${outputResult.count} ${outputResult.count === 1 ? 'ITEM' : 'ITEMS'}`;
    }

    setUnifiedResultState({
      toolPrefix: 'cad',
      status: outputResult.count > 0 ? 'success' : 'ready'
    });

    saveCadClipboardSettings();

    if (isExplicitRun) {
      AudioService.playTick();
    }
  }

  function copyCadClipboardData(optionsOverride = null) {
    let textToCopy = state.cadClipboard.lastFormattedText;

    if (optionsOverride && typeof optionsOverride === 'object') {
      const mergedOpts = { ...state.cadClipboard, ...optionsOverride };
      if (state.cadClipboard.source === 'workspace') {
        textToCopy = formatCadWorkspace(state.workspace, mergedOpts).text;
      } else if (state.cadClipboard.source === 'chain') {
        textToCopy = formatCadChain(state.lastValidChain, mergedOpts).text;
      } else if (state.cadClipboard.source === 'expression') {
        textToCopy = formatCadExpression(state.lastValidExpression, mergedOpts).text;
      } else if (state.cadClipboard.source === 'multiscale') {
        textToCopy = formatCadMultiScale(state.lastValidMultiScale, mergedOpts).text;
      } else if (state.cadClipboard.source === 'manual') {
        textToCopy = formatManualCadInput(dom.cadManualInput?.value || '', mergedOpts).text;
      }
    }

    if (!textToCopy || !textToCopy.trim()) {
      showToast('No CAD dimension data to copy', 'warning');
      return;
    }

    copyToClipboard(textToCopy, 'CAD Dimension Data');
  }

  function openCadClipboardWithSource(sourceKey) {
    state.cadClipboard.source = sourceKey;
    switchMode('cad_clipboard');
    renderCadClipboard(true);
    AudioService.playTick();
    showToast(`Loaded ${sourceKey.toUpperCase()} data into CAD Clipboard`);
  }

  // ---------------------------------------------------------------------------
  // 13h. Mode 12: Batch CAD Conversion Controller
  // ---------------------------------------------------------------------------
  function saveBatchCadSettings() {
    try {
      const serializable = {
        ...state.batchCad,
        selectedIds: Array.from(state.batchCad.selectedIds)
      };
      StorageService.setItem(BATCH_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {}
  }

  function updateBatchModeVisibility() {
    const mode = dom.batchModeSelect?.value || state.batchCad.mode;
    if (dom.batchSourceScaleGroup) {
      dom.batchSourceScaleGroup.style.display = (mode === 'drawing_to_real' || mode === 'scale_to_scale') ? 'block' : 'none';
    }
    if (dom.batchTargetScaleGroup) {
      dom.batchTargetScaleGroup.style.display = (mode === 'real_to_drawing' || mode === 'scale_to_scale') ? 'block' : 'none';
    }
  }

  function applyBatchPreset(presetKey) {
    const preset = BATCH_PRESETS[presetKey];
    if (!preset) return;

    state.batchCad.mode = preset.mode;
    state.batchCad.sourceUnit = preset.sourceUnit;
    state.batchCad.sourceScale = preset.sourceScale;
    state.batchCad.targetUnit = preset.targetUnit;
    state.batchCad.targetScale = preset.targetScale;
    state.batchCad.precision = preset.precision;

    // Sync dropdowns
    if (dom.batchModeSelect) dom.batchModeSelect.value = preset.mode;
    if (dom.batchSourceUnitSelect) dom.batchSourceUnitSelect.value = preset.sourceUnit;
    if (dom.batchSourceScaleSelect) dom.batchSourceScaleSelect.value = String(preset.sourceScale);
    if (dom.batchTargetUnitSelect) dom.batchTargetUnitSelect.value = preset.targetUnit;
    if (dom.batchTargetScaleSelect) dom.batchTargetScaleSelect.value = String(preset.targetScale);
    if (dom.batchPrecisionSelect) dom.batchPrecisionSelect.value = String(preset.precision);

    // Sync active chip
    dom.batchQuickChips?.querySelectorAll('.cad-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === presetKey);
    });

    updateBatchModeVisibility();
    parseAndConvertBatch(true);
    AudioService.playTick();
    showToast(`Loaded preset "${preset.name}"`);
  }

  function parseAndConvertBatch(isExplicitRun = false) {
    const batch = state.batchCad;

    // Sync parameters from DOM
    if (dom.batchPasteInput) batch.rawInput = dom.batchPasteInput.value;
    if (dom.batchModeSelect) batch.mode = dom.batchModeSelect.value || 'real_to_drawing';
    if (dom.batchSourceUnitSelect) batch.sourceUnit = dom.batchSourceUnitSelect.value || 'mm';
    if (dom.batchSourceScaleSelect) batch.sourceScale = parseInt(dom.batchSourceScaleSelect.value, 10) || 50;
    if (dom.batchTargetUnitSelect) batch.targetUnit = dom.batchTargetUnitSelect.value || 'mm';
    if (dom.batchTargetScaleSelect) batch.targetScale = parseInt(dom.batchTargetScaleSelect.value, 10) || 50;
    if (dom.batchPrecisionSelect) batch.precision = parseInt(dom.batchPrecisionSelect.value, 10) || 2;
    if (dom.batchDelimiterSelect) batch.delimiter = dom.batchDelimiterSelect.value || 'auto';

    updateBatchModeVisibility();

    const raw = (batch.rawInput || '').trim();
    if (!raw) {
      batch.lastResult = { rows: [], summary: { totalRows: 0, validRows: 0, invalidRows: 0, convertedRows: 0 } };
      renderBatchResults();
      setUnifiedResultState({ toolPrefix: 'batch', status: 'ready' });
      return;
    }

    const detected = detectBatchDelimiter(raw);
    if (dom.batchDelimiterBadge) {
      dom.batchDelimiterBadge.textContent = `FORMAT: ${detected.toUpperCase()}`;
    }

    const parsed = parseBatchInput(raw, {
      delimiter: batch.delimiter,
      defaultUnit: batch.sourceUnit,
      defaultScale: batch.sourceScale
    });

    const converted = convertBatch(parsed.rows, {
      mode: batch.mode,
      sourceUnit: batch.sourceUnit,
      sourceScale: batch.sourceScale,
      targetUnit: batch.targetUnit,
      targetScale: batch.targetScale,
      precision: batch.precision
    });

    batch.lastResult = converted;

    renderBatchResults();

    setUnifiedResultState({
      toolPrefix: 'batch',
      status: converted.summary.invalidRows > 0 ? (converted.summary.validRows > 0 ? 'success' : 'error') : 'success'
    });

    saveBatchCadSettings();

    if (isExplicitRun) {
      AudioService.playTick();
      showToast(`Batch converted ${converted.summary.validRows} of ${converted.summary.totalRows} rows`);
    }
  }

  function renderBatchResults() {
    const batch = state.batchCad;
    const result = batch.lastResult || { rows: [], summary: { totalRows: 0, validRows: 0, invalidRows: 0, convertedRows: 0 } };
    const rows = result.rows || [];
    const summary = result.summary || { totalRows: 0, validRows: 0, invalidRows: 0, convertedRows: 0 };

    // Update Summary Metrics
    if (dom.batchMetricTotal) dom.batchMetricTotal.textContent = `${summary.totalRows} ${summary.totalRows === 1 ? 'ROW' : 'ROWS'}`;
    if (dom.batchMetricValid) dom.batchMetricValid.textContent = `${summary.validRows} VALID`;
    if (dom.batchMetricInvalid) {
      dom.batchMetricInvalid.textContent = `${summary.invalidRows} INVALID`;
      dom.batchMetricInvalid.style.display = summary.invalidRows > 0 ? 'inline-flex' : 'none';
    }

    // Update Filter Counts
    const validCount = rows.filter(r => r.valid).length;
    const invalidCount = rows.filter(r => !r.valid).length;
    const selectedCount = rows.filter(r => batch.selectedIds.has(r.id)).length;

    if (dom.filterCountAll) dom.filterCountAll.textContent = String(rows.length);
    if (dom.filterCountValid) dom.filterCountValid.textContent = String(validCount);
    if (dom.filterCountInvalid) dom.filterCountInvalid.textContent = String(invalidCount);
    if (dom.filterCountSelected) dom.filterCountSelected.textContent = String(selectedCount);

    // Empty State vs Table
    if (rows.length === 0) {
      if (dom.batchTable) dom.batchTable.style.display = 'none';
      if (dom.batchEmptyState) dom.batchEmptyState.style.display = 'block';
      if (dom.batchTableBody) dom.batchTableBody.innerHTML = '';
      return;
    }

    if (dom.batchTable) dom.batchTable.style.display = 'table';
    if (dom.batchEmptyState) dom.batchEmptyState.style.display = 'none';

    // Filter Rows
    const filteredRows = filterBatchRows(rows, batch.activeFilter, batch.selectedIds);

    // Master Checkbox State
    if (dom.batchMasterCheckbox) {
      dom.batchMasterCheckbox.checked = rows.length > 0 && selectedCount === rows.length;
      dom.batchMasterCheckbox.indeterminate = selectedCount > 0 && selectedCount < rows.length;
    }

    // Render Table Body via DocumentFragment for High Performance
    if (dom.batchTableBody) {
      const fragment = document.createDocumentFragment();

      filteredRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = `batch-row ${row.valid ? '' : 'is-invalid'} ${batch.selectedIds.has(row.id) ? 'is-selected' : ''}`;
        tr.dataset.id = row.id;

        const roleTag = row.semanticRole === 'segment' ? 'SEG' : (row.semanticRole === 'allowance' ? 'ALW' : 'REF');
        const roleBadgeClass = row.semanticRole === 'segment' ? 'badge-seg' : (row.semanticRole === 'allowance' ? 'badge-alw' : 'badge-ref');

        tr.innerHTML = `
          <td style="text-align: center;">
            <input type="checkbox" class="batch-row-checkbox" data-id="${row.id}" ${batch.selectedIds.has(row.id) ? 'checked' : ''} aria-label="Select row ${row.index}" />
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--text-muted);">${row.index}</td>
          <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(row.name)}</td>
          <td><span class="type-badge ${roleBadgeClass}" style="font-size: 0.65rem;">${roleTag}</span></td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(row.sourceFormatted)}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.85rem; font-weight: 700; color: ${row.valid ? 'var(--accent-primary)' : 'var(--color-error, #ef4444)'};">${escapeHTML(row.targetFormatted)}</td>
          <td style="text-align: center;">
            <span class="batch-status-pill ${row.valid ? (row.status === 'UNCHANGED' ? 'unchanged' : 'valid') : 'invalid'}">
              ${row.valid ? (row.status === 'UNCHANGED' ? 'UNCHANGED' : '✓ VALID') : '⚠ INVALID'}
            </span>
          </td>
          <td style="text-align: right;">
            <button type="button" class="chain-row-del-btn batch-delete-row-btn" data-id="${row.id}" title="Remove row">✕</button>
          </td>
        `;

        fragment.appendChild(tr);
      });

      dom.batchTableBody.innerHTML = '';
      dom.batchTableBody.appendChild(fragment);

      // Attach row event listeners
      dom.batchTableBody.querySelectorAll('.batch-row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          const id = cb.dataset.id;
          if (cb.checked) batch.selectedIds.add(id);
          else batch.selectedIds.delete(id);
          renderBatchResults();
        });
      });

      dom.batchTableBody.querySelectorAll('.batch-delete-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          deleteBatchRow(id);
        });
      });
    }
  }

  function deleteBatchRow(id) {
    if (!state.batchCad.lastResult || !Array.isArray(state.batchCad.lastResult.rows)) return;
    state.batchCad.lastResult.rows = state.batchCad.lastResult.rows.filter(r => r.id !== id);
    state.batchCad.selectedIds.delete(id);
    // Re-index
    state.batchCad.lastResult.rows.forEach((r, idx) => { r.index = idx + 1; });
    // Recalculate summary
    const rows = state.batchCad.lastResult.rows;
    state.batchCad.lastResult.summary = {
      totalRows: rows.length,
      validRows: rows.filter(r => r.valid).length,
      invalidRows: rows.filter(r => !r.valid).length,
      convertedRows: rows.filter(r => r.status === 'CONVERTED').length,
      unchangedRows: rows.filter(r => r.status === 'UNCHANGED').length,
      totalCanonicalMeters: rows.filter(r => r.valid).reduce((acc, r) => acc + r.canonicalMeters, 0),
      totalTargetValue: rows.filter(r => r.valid).reduce((acc, r) => acc + (r.targetValue || 0), 0)
    };
    renderBatchResults();
    AudioService.playTick();
    showToast('Removed row');
  }

  function copyBatchData(formatKey = 'results_only') {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch conversion results to copy', 'warning');
      return;
    }

    const hasSelected = state.batchCad.selectedIds.size > 0;
    const text = formatBatchResults(result, {
      format: formatKey,
      selectedOnly: hasSelected,
      selectedIds: state.batchCad.selectedIds
    });

    if (!text || !text.trim()) {
      showToast('No valid dimension data to copy', 'warning');
      return;
    }

    const label = hasSelected ? `${state.batchCad.selectedIds.size} Selected Results` : 'Batch Conversion Results';
    copyToClipboard(text, label);
  }

  function sendBatchToWorkspace() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch conversion results to send', 'warning');
      return;
    }

    const hasSelected = state.batchCad.selectedIds.size > 0;
    const payload = convertBatchToWorkspaceGroup(result, {
      groupName: `Batch (${result.config?.mode || 'Conversion'})`,
      selectedOnly: hasSelected,
      selectedIds: state.batchCad.selectedIds
    });

    if (payload.entries.length === 0) {
      showToast('No valid rows to add to Dimension Workspace', 'warning');
      return;
    }

    if (!Array.isArray(state.workspace.groups)) state.workspace.groups = [];
    if (!Array.isArray(state.workspace.entries)) state.workspace.entries = [];

    state.workspace.groups.push(payload.group);
    state.workspace.entries.push(...payload.entries);

    saveWorkspace();
    switchMode('workspace');
    renderWorkspace();
    AudioService.playTick();
    showToast(`Added ${payload.entries.length} rows to Dimension Workspace`);
  }

  function sendBatchToMultiScale() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch rows to compare', 'warning');
      return;
    }

    const validRows = result.rows.filter(r => r.valid);
    if (validRows.length === 0) {
      showToast('No valid rows to compare', 'warning');
      return;
    }

    // Use first valid row or selected row
    const targetRow = (state.batchCad.selectedIds.size > 0
      ? validRows.find(r => state.batchCad.selectedIds.has(r.id))
      : validRows[0]) || validRows[0];

    state.multiScale.dimensionInput = `${targetRow.targetValue || targetRow.parsedValue} ${result.config?.targetUnit || 'mm'}`;
    if (dom.msDimensionInput) dom.msDimensionInput.value = state.multiScale.dimensionInput;

    switchMode('multiscale');
    calculateMultiScale();
    AudioService.playTick();
    showToast(`Comparing "${targetRow.name}" across multiple scales`);
  }

  function sendBatchToChains() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch rows to convert to chain', 'warning');
      return;
    }

    const hasSelected = state.batchCad.selectedIds.size > 0;
    const chain = convertBatchToDimensionChain(result, {
      chainName: `Batch Chain (${result.config?.targetUnit || 'mm'})`,
      selectedOnly: hasSelected,
      selectedIds: state.batchCad.selectedIds
    });

    if (!chain.segments || chain.segments.length === 0) {
      showToast('No valid rows for dimension chain', 'warning');
      return;
    }

    state.activeChain = chain;
    if (dom.chainsNameInput) dom.chainsNameInput.value = chain.name;
    if (dom.chainsUnitSelect) dom.chainsUnitSelect.value = chain.defaultUnit;

    switchMode('chains');
    calculateAndRenderChain(true);
    AudioService.playTick();
    showToast(`Created Dimension Chain with ${chain.segments.length} segments`);
  }

  function sendBatchToCadClipboard() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch rows to format for CAD', 'warning');
      return;
    }

    // Set CAD Clipboard source to manual with raw text
    const rawNumbers = formatBatchResults(result, {
      format: 'raw_numbers',
      selectedOnly: state.batchCad.selectedIds.size > 0,
      selectedIds: state.batchCad.selectedIds
    });

    state.cadClipboard.source = 'manual';
    state.cadClipboard.manualInput = rawNumbers;
    if (dom.cadManualInput) dom.cadManualInput.value = rawNumbers;

    switchMode('cad_clipboard');
    renderCadClipboard(true);
    AudioService.playTick();
    showToast('Loaded batch numbers into CAD Clipboard');
  }

  // ---------------------------------------------------------------------------
  // 14. Event Listener Wire-up
  // ---------------------------------------------------------------------------
  function attachEventListeners() {
    // Theme Selector
    if (dom.themeSelect) {
      dom.themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        AudioService.playTick();
        showToast(`Theme set to ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    // Sound Toggle
    if (dom.soundToggleBtn) {
      dom.soundToggleBtn.addEventListener('click', () => {
        const newState = AudioService.toggleSound();
        updateSoundUI();
        showToast(newState ? '🔊 Tactile sound enabled' : '🔇 Sound muted');
      });
    }

    // Command Palette Trigger & Modal Listeners
    if (dom.commandPaletteBtn) dom.commandPaletteBtn.addEventListener('click', openCommandPalette);
    if (dom.closeCommandPaletteBtn) dom.closeCommandPaletteBtn.addEventListener('click', closeCommandPalette);
    if (dom.commandPaletteOverlay) dom.commandPaletteOverlay.addEventListener('click', closeCommandPalette);

    if (dom.commandPaletteInput) {
      dom.commandPaletteInput.addEventListener('input', (e) => {
        paletteQuery = e.target.value;
        renderCommandPalette(paletteQuery);
      });

      dom.commandPaletteInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (paletteItems.length > 0) {
            paletteSelectedIndex = (paletteSelectedIndex + 1) % paletteItems.length;
            updatePaletteSelection();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (paletteItems.length > 0) {
            paletteSelectedIndex = (paletteSelectedIndex - 1 + paletteItems.length) % paletteItems.length;
            updatePaletteSelection();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (paletteItems[paletteSelectedIndex]) {
            executeCommand(paletteItems[paletteSelectedIndex]);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeCommandPalette();
        }
      });
    }

    // History Toggle & Actions
    if (dom.historyToggleBtn) dom.historyToggleBtn.addEventListener('click', toggleHistoryDrawer);
    if (dom.closeHistoryBtn) dom.closeHistoryBtn.addEventListener('click', toggleHistoryDrawer);
    if (dom.historyOverlay) dom.historyOverlay.addEventListener('click', toggleHistoryDrawer);

    if (dom.clearHistoryBtn) {
      dom.clearHistoryBtn.addEventListener('click', () => {
        HistoryService.clear();
        renderHistoryList();
        showToast('Calculation history cleared');
      });
    }

    if (dom.exportCsvBtn) {
      dom.exportCsvBtn.addEventListener('click', () => {
        const csv = HistoryService.exportCSV();
        if (!csv) {
          showToast('History is empty', 'warning');
          return;
        }
        downloadFile(csv, `architecture-helping-hand-${Date.now()}.csv`, 'text/csv');
        showToast('Exported history as CSV');
      });
    }

    if (dom.exportMdBtn) {
      dom.exportMdBtn.addEventListener('click', () => {
        const md = HistoryService.exportMarkdown();
        if (!md) {
          showToast('History is empty', 'warning');
          return;
        }
        copyToClipboard(md, 'Markdown History Table');
      });
    }

    // Shortcuts Modal
    if (dom.shortcutsHelpBtn) {
      dom.shortcutsHelpBtn.addEventListener('click', () => {
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
        AudioService.playTick();
      });
    }

    if (dom.closeShortcutsBtn) {
      dom.closeShortcutsBtn.addEventListener('click', () => {
        dom.shortcutsModal?.classList.remove('open');
        dom.modalBackdrop?.classList.remove('open');
      });
    }

    if (dom.modalBackdrop) {
      dom.modalBackdrop.addEventListener('click', () => {
        dom.shortcutsModal?.classList.remove('open');
        dom.modalBackdrop?.classList.remove('open');
      });
    }

    // Mode Navigation Tabs
    dom.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetMode = tab.dataset.mode;
        if (targetMode) switchMode(targetMode);
      });
    });

    // Preset Category Pills
    dom.presetPillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.presetPillBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPresetChips(btn.dataset.category);
        AudioService.playTick();
      });
    });

    // Custom Scale Ratio Input
    if (dom.scaleRatioInput) {
      dom.scaleRatioInput.addEventListener('input', () => {
        const r = parseFloat(dom.scaleRatioInput.value);
        if (!isNaN(r) && r > 0) {
          state.scaleRatio = r;
          if (dom.activeScaleBadge) dom.activeScaleBadge.textContent = `SCALE 1:${r}`;
          calculateConverter();
        }
      });
    }

    // Converter Inputs & Run Action
    if (dom.converterInputVal) {
      dom.converterInputVal.addEventListener('input', () => {
        calculateConverter();
      });
      dom.converterInputVal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          calculateConverter();
          if (dom.btnSaveHistory && dom.converterResultVal?.textContent !== '---') {
            dom.btnSaveHistory.click();
          }
        }
      });
    }

    if (dom.converterInputUnit) dom.converterInputUnit.addEventListener('change', calculateConverter);
    if (dom.converterOutputUnit) dom.converterOutputUnit.addEventListener('change', calculateConverter);
    if (dom.swapDirectionBtn) dom.swapDirectionBtn.addEventListener('click', swapDirection);
    if (dom.btnRunConverter) {
      dom.btnRunConverter.addEventListener('click', () => {
        calculateConverter();
        logCurrentCalculationToHistory('converter');
      });
    }

    // Copy Result & Save Log
    if (dom.btnCopyResult) {
      dom.btnCopyResult.addEventListener('click', () => {
        const val = dom.converterResultVal?.textContent;
        const unit = dom.converterResultUnit?.textContent;
        if (val && val !== '---') {
          copyToClipboard(`${val} ${unit}`);
        }
      });
    }

    if (dom.btnSaveHistory) {
      dom.btnSaveHistory.addEventListener('click', () => {
        logCurrentCalculationToHistory('converter');
      });
    }

    // Rescaler Listeners
    [dom.rescaleOrigRatio, dom.rescaleOrigVal, dom.rescaleOrigUnit, dom.rescaleTargetRatio, dom.rescaleTargetUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateRescaler);
        el.addEventListener('change', calculateRescaler);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            calculateRescaler();
            logCurrentCalculationToHistory('rescale');
          }
        });
      }
    });
    if (dom.btnRunRescale) {
      dom.btnRunRescale.addEventListener('click', () => {
        calculateRescaler();
        logCurrentCalculationToHistory('rescale');
      });
    }
    if (dom.btnCopyRescale) {
      dom.btnCopyRescale.addEventListener('click', () => {
        const val = dom.rescaleResultVal?.textContent;
        const unit = dom.rescaleResultUnit?.textContent;
        if (val && val !== '---') copyToClipboard(`${val} ${unit}`, 'Rescaled Dimension');
      });
    }

    // Scale Detector Listeners
    [dom.detectorPaperVal, dom.detectorPaperUnit, dom.detectorRealVal, dom.detectorRealUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateDetector);
        el.addEventListener('change', calculateDetector);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            calculateDetector();
            logCurrentCalculationToHistory('detector');
          }
        });
      }
    });
    if (dom.btnRunDetector) {
      dom.btnRunDetector.addEventListener('click', () => {
        calculateDetector();
        logCurrentCalculationToHistory('detector');
      });
    }
    if (dom.btnApplyDetected) {
      dom.btnApplyDetected.addEventListener('click', () => {
        if (state.lastDetectedRatio !== null && state.lastDetectedRatio > 0) {
          state.scaleRatio = state.lastDetectedRatio;
          if (dom.scaleRatioInput) dom.scaleRatioInput.value = state.lastDetectedRatio;
          if (dom.activeScaleBadge) dom.activeScaleBadge.textContent = `SCALE 1:${state.lastDetectedRatio.toFixed(1)}`;
          switchMode('converter');
          showToast(`Applied detected scale 1:${state.lastDetectedRatio.toFixed(2)} to Converter`);
        } else {
          showToast('Please enter valid measurements to detect scale', 'warning');
        }
      });
    }

    // Area & Volume Listeners
    dom.areavolTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.areavolTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.calcType = btn.dataset.type;
        updateAreaVolumeUnitSelects();
        calculateAreaVolume();
        AudioService.playTick();
      });
    });

    dom.areavolDirBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.areavolDirBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.calcDirection = btn.dataset.dir;
        if (state.calcDirection === 'drawing_to_real') {
          if (dom.areavolInputBadge) dom.areavolInputBadge.textContent = 'Drawing Area/Volume';
          if (dom.areavolOutputBadge) dom.areavolOutputBadge.textContent = 'Real-World Unit';
        } else {
          if (dom.areavolInputBadge) dom.areavolInputBadge.textContent = 'Real-World Dimension';
          if (dom.areavolOutputBadge) dom.areavolOutputBadge.textContent = 'Drawing Unit on Paper';
        }
        calculateAreaVolume();
        AudioService.playTick();
      });
    });

    [dom.areavolRatioInput, dom.areavolInputVal, dom.areavolInputUnit, dom.areavolOutputUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateAreaVolume);
        el.addEventListener('change', calculateAreaVolume);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            calculateAreaVolume();
            logCurrentCalculationToHistory('area_volume');
          }
        });
      }
    });
    if (dom.btnRunAreavol) {
      dom.btnRunAreavol.addEventListener('click', () => {
        calculateAreaVolume();
        logCurrentCalculationToHistory('area_volume');
      });
    }
    if (dom.btnCopyAreavol) {
      dom.btnCopyAreavol.addEventListener('click', () => {
        const val = dom.areavolResultVal?.textContent;
        const unit = dom.areavolResultUnit?.textContent;
        if (val && val !== '---') copyToClipboard(`${val} ${unit}`, 'Area/Volume Result');
      });
    }

    // Furniture Database Listeners
    if (dom.furnitureSearchInput) {
      dom.furnitureSearchInput.addEventListener('input', (e) => {
        state.furnitureSearchQuery = e.target.value;
        renderFurnitureGrid();
      });
    }

    if (dom.clearFurnitureSearchBtn) {
      dom.clearFurnitureSearchBtn.addEventListener('click', () => {
        if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
        state.furnitureSearchQuery = '';
        renderFurnitureGrid();
      });
    }

    // Furniture Scale Chips
    if (dom.furnScalePresets) {
      dom.furnScalePresets.querySelectorAll('.furn-scale-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          dom.furnScalePresets.querySelectorAll('.furn-scale-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const ratio = parseFloat(btn.dataset.ratio);
          state.furnitureScaleRatio = ratio;
          if (dom.furnScaleRatioInput) dom.furnScaleRatioInput.value = ratio;
          renderFurnitureGrid();
          calculateCustomFurniture();
          AudioService.playTick();
        });
      });
    }

    if (dom.furnScaleRatioInput) {
      dom.furnScaleRatioInput.addEventListener('input', () => {
        const r = parseFloat(dom.furnScaleRatioInput.value);
        if (!isNaN(r) && r > 0) {
          state.furnitureScaleRatio = r;
          renderFurnitureGrid();
          calculateCustomFurniture();
        }
      });
    }

    if (dom.furnPaperUnitSelect) {
      dom.furnPaperUnitSelect.addEventListener('change', () => {
        state.furniturePaperUnit = dom.furnPaperUnitSelect.value;
        renderFurnitureGrid();
        calculateCustomFurniture();
      });
    }

    // Furniture Sort Dropdown Listener
    if (dom.furnSortSelect) {
      dom.furnSortSelect.addEventListener('change', () => {
        state.furnitureSortKey = dom.furnSortSelect.value;
        renderFurnitureGrid();
      });
    }

    // Furniture Density Toggle Listeners (Comfortable vs Compact)
    dom.furnDensityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.furnDensityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.furnitureDensity = btn.dataset.density;
        renderFurnitureGrid();
        AudioService.playTick();
      });
    });

    // Furniture Category Pills
    if (dom.furnCategoryNav) {
      dom.furnCategoryNav.querySelectorAll('.furn-cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          dom.furnCategoryNav.querySelectorAll('.furn-cat-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.furnitureActiveCategory = btn.dataset.cat;
          renderFurnitureGrid();
          AudioService.playTick();
        });
      });
    }

    // Custom Furniture Scaler
    [dom.customFurnW, dom.customFurnD, dom.customFurnUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateCustomFurniture);
        el.addEventListener('change', calculateCustomFurniture);
      }
    });
    if (dom.btnRunCustomFurn) {
      dom.btnRunCustomFurn.addEventListener('click', () => {
        calculateCustomFurniture();
        logCurrentCalculationToHistory('furniture');
      });
    }
    if (dom.btnPlannerCustomFurn) {
      dom.btnPlannerCustomFurn.addEventListener('click', () => {
        const name = dom.customFurnName?.value || 'Custom Piece';
        const w = dom.customFurnW?.value || '0';
        const d = dom.customFurnD?.value || '0';
        const u = dom.customFurnUnit?.value || 'cm';
        showToast(`📐 Added ${name} (${w}×${d} ${u}) to Room Planner layout`);
        AudioService.playTick();
      });
    }
    if (dom.btnCopyCustomFurn) {
      dom.btnCopyCustomFurn.addEventListener('click', () => {
        const text = dom.customFurnResult?.textContent;
        if (text) copyToClipboard(text, 'Custom Furniture Size');
      });
    }
    if (dom.btnSendCustomFurn) {
      dom.btnSendCustomFurn.addEventListener('click', () => {
        const w = dom.customFurnW?.value || '240';
        if (dom.converterInputVal) dom.converterInputVal.value = w;
        if (dom.converterInputUnit) dom.converterInputUnit.value = dom.customFurnUnit?.value || 'cm';
        state.direction = 'real_to_drawing';
        switchMode('converter');
        showToast(`Sent custom width ${w} to Converter`);
      });
    }

    // Reference Chart
    if (dom.refScaleSelect) {
      dom.refScaleSelect.addEventListener('change', (e) => {
        state.refScaleRatio = parseFloat(e.target.value) || 50;
        renderReferenceChart();
        AudioService.playTick();
      });
    }

    if (dom.refQuickChips) {
      dom.refQuickChips.querySelectorAll('.ref-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = parseFloat(btn.dataset.ratio);
          state.refScaleRatio = r;
          if (dom.refScaleSelect) dom.refScaleSelect.value = r;
          renderReferenceChart();
          AudioService.playTick();
        });
      });
    }

    if (dom.refDensityBtnStandard) {
      dom.refDensityBtnStandard.addEventListener('click', () => {
        dom.refDensityBtnStandard.classList.add('active');
        dom.refDensityBtnCompact?.classList.remove('active');
        dom.refDataTable?.classList.remove('compact-table');
        AudioService.playTick();
      });
    }

    if (dom.refDensityBtnCompact) {
      dom.refDensityBtnCompact.addEventListener('click', () => {
        dom.refDensityBtnCompact.classList.add('active');
        dom.refDensityBtnStandard?.classList.remove('active');
        dom.refDataTable?.classList.add('compact-table');
        AudioService.playTick();
      });
    }

    if (dom.btnPrintRef) {
      dom.btnPrintRef.addEventListener('click', () => {
        showToast('🖨️ Opening print dialog: Set Scale to 100% / Actual Size', 'info');
        window.print();
      });
    }

    // Mode 7: Dimension Workspace Listeners
    if (dom.workspaceDensityStandard) {
      dom.workspaceDensityStandard.addEventListener('click', () => {
        state.workspace.density = 'comfortable';
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
      });
    }

    if (dom.workspaceDensityCompact) {
      dom.workspaceDensityCompact.addEventListener('click', () => {
        state.workspace.density = 'compact';
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
      });
    }

    if (dom.workspaceSelectAll) {
      dom.workspaceSelectAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.workspace.entries.forEach(item => state.workspaceSelectedIds.add(item.id));
        } else {
          state.workspaceSelectedIds.clear();
        }
        renderWorkspace();
      });
    }

    if (dom.workspaceScaleSelect) {
      dom.workspaceScaleSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
          if (dom.workspaceCustomScaleGroup) dom.workspaceCustomScaleGroup.style.display = 'flex';
          if (dom.workspaceCustomScaleInput) dom.workspaceCustomScaleInput.focus();
        } else {
          if (dom.workspaceCustomScaleGroup) dom.workspaceCustomScaleGroup.style.display = 'none';
          state.workspace.scaleRatio = parseFloat(val) || 50;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    }

    if (dom.workspaceCustomScaleInput) {
      dom.workspaceCustomScaleInput.addEventListener('input', (e) => {
        const r = parseFloat(e.target.value);
        if (!isNaN(r) && r > 0) {
          state.workspace.scaleRatio = r;
          saveWorkspace();
          renderWorkspace();
        }
      });
    }

    if (dom.workspaceUnitSelect) {
      dom.workspaceUnitSelect.addEventListener('change', (e) => {
        state.workspace.displayUnit = e.target.value;
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
      });
    }

    if (dom.workspaceQuickChips) {
      dom.workspaceQuickChips.querySelectorAll('.scale-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const r = parseFloat(chip.dataset.scale);
          if (!isNaN(r) && r > 0) {
            state.workspace.scaleRatio = r;
            saveWorkspace();
            renderWorkspace();
            AudioService.playTick();
          }
        });
      });
    }

    if (dom.workspaceAddForm) {
      dom.workspaceAddForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let rawInput = dom.workspaceAddInput?.value?.trim() || '';
        if (!rawInput) return;

        let name = dom.workspaceAddName?.value?.trim() || '';
        let dimensionType = dom.workspaceAddType?.value || DEFAULT_DIMENSION_TYPE;
        const defaultUnit = dom.workspaceAddUnit?.value || state.workspace.displayUnit || 'mm';
        const notes = dom.workspaceAddNotes?.value?.trim() || '';

        // Deterministic Natural Quick Add Syntax (e.g. "Wall A 4800")
        if (name === '' && rawInput !== '') {
          const quickParsed = parseQuickAddString(rawInput, defaultUnit, dimensionType);
          if (quickParsed.isValid) {
            name = quickParsed.name;
            rawInput = quickParsed.rawInput;
            dimensionType = quickParsed.dimensionType;
          } else {
            name = 'Dimension';
          }
        } else if (name === '') {
          name = 'Dimension';
        }

        const newEntry = createDimensionEntry({ name, rawInput, dimensionType, defaultUnit, notes }, defaultUnit);
        state.workspace.entries.push(newEntry);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();

        if (dom.workspaceAddInput) dom.workspaceAddInput.value = '';
        if (dom.workspaceAddName) dom.workspaceAddName.value = '';
        if (dom.workspaceAddNotes) dom.workspaceAddNotes.value = '';
        if (dom.workspaceAddInput) dom.workspaceAddInput.focus();

        if (newEntry.isValid) {
          showToast(`Added [${newEntry.dimensionType.toUpperCase()}] ${newEntry.name} (${newEntry.rawInput})`);
        } else {
          showToast(`Added "${newEntry.name}" ⚠️ (Check measurement syntax)`, 'warning');
        }
      });
    }

    if (dom.workspaceLoadSamplesBtn) {
      dom.workspaceLoadSamplesBtn.addEventListener('click', () => {
        state.workspace = createDefaultWorkspace();
        state.workspaceSelectedIds.clear();
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast('Loaded sample architectural dimension schedule');
      });
    }

    if (dom.workspaceCopySelectedBtn) {
      dom.workspaceCopySelectedBtn.addEventListener('click', () => {
        if (state.workspaceSelectedIds.size === 0) {
          showToast('No dimensions selected to copy', 'warning');
          return;
        }
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'selected',
          selectedIds: Array.from(state.workspaceSelectedIds),
          groups: state.workspace.groups
        });
        copyToClipboard(text, `${state.workspaceSelectedIds.size} Selected Dimensions`);
      });
    }

    if (dom.workspaceCopySegmentsBtn) {
      dom.workspaceCopySegmentsBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'segments',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Additive Segment Dimensions');
      });
    }

    if (dom.workspaceCopyReferencesBtn) {
      dom.workspaceCopyReferencesBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'references',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Reference Dimensions');
      });
    }

    if (dom.workspaceCopyAllBtn) {
      dom.workspaceCopyAllBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'both',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Full Dimension Schedule');
      });
    }

    if (dom.workspaceCopyRawBtn) {
      dom.workspaceCopyRawBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'raw',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Raw CAD Numbers');
      });
    }

    if (dom.workspaceCopyDrawingBtn) {
      dom.workspaceCopyDrawingBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'drawing',
          groups: state.workspace.groups
        });
        copyToClipboard(text, `Drawing Values (@ 1:${state.workspace.scaleRatio})`);
      });
    }

    if (dom.workspaceExportTsvBtn) {
      dom.workspaceExportTsvBtn.addEventListener('click', () => {
        const tsv = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'tsv',
          groups: state.workspace.groups
        });
        downloadFile(tsv, `dimension-schedule-1to${state.workspace.scaleRatio}-${Date.now()}.tsv`, 'text/tab-separated-values');
        showToast('Exported schedule as TSV spreadsheet');
      });
    }

    if (dom.workspaceAddGroupBtn) {
      dom.workspaceAddGroupBtn.addEventListener('click', () => {
        const grpNum = (state.workspace.groups?.length || 0) + 1;
        const grpName = window.prompt('Enter group name (e.g. Wall North, Bay Grid):', `Group ${grpNum}`);
        if (grpName && grpName.trim()) {
          const newGrp = createGroup(grpName.trim());
          if (!Array.isArray(state.workspace.groups)) state.workspace.groups = [];
          state.workspace.groups.push(newGrp);

          // If rows are selected, assign them to this group
          if (state.workspaceSelectedIds.size > 0) {
            state.workspace.entries.forEach(entry => {
              if (state.workspaceSelectedIds.has(entry.id)) {
                entry.groupId = newGrp.id;
              }
            });
            state.workspaceSelectedIds.clear();
          }

          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Created group "${newGrp.name}"`);
        }
      });
    }

    if (dom.workspaceSaveJournalBtn) {
      dom.workspaceSaveJournalBtn.addEventListener('click', () => {
        logCurrentCalculationToHistory('workspace');
      });
    }

    if (dom.workspaceClearBtn) {
      dom.workspaceClearBtn.addEventListener('click', () => {
        if (state.workspace.entries.length === 0) {
          showToast('Workspace is already empty', 'warning');
          return;
        }
        if (window.confirm('Clear all dimensions and groups from the workspace?')) {
          state.workspace.entries = [];
          state.workspace.groups = [];
          state.workspaceSelectedIds.clear();
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast('Dimension workspace cleared');
        }
      });
    }

    // Mode 8: Dimension Expression Listeners
    if (dom.expressionInput) {
      dom.expressionInput.addEventListener('input', () => {
        calculateExpression(false);
      });

      dom.expressionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            dom.expressionAddWorkspaceBtn?.click();
          } else {
            calculateExpression(true);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.expressionInput.value = '';
          calculateExpression(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.expressionClearInputBtn) {
      dom.expressionClearInputBtn.addEventListener('click', () => {
        if (dom.expressionInput) {
          dom.expressionInput.value = '';
          dom.expressionInput.focus();
          calculateExpression(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.expressionDefaultUnit) {
      dom.expressionDefaultUnit.addEventListener('change', () => {
        calculateExpression(true);
        AudioService.playTick();
      });
    }

    if (dom.expressionScaleSelect) {
      dom.expressionScaleSelect.addEventListener('change', (e) => {
        const isCustom = e.target.value === 'custom';
        if (dom.expressionCustomScaleGroup) {
          dom.expressionCustomScaleGroup.style.display = isCustom ? 'block' : 'none';
        }
        calculateExpression(true);
        AudioService.playTick();
      });
    }

    if (dom.expressionCustomScaleInput) {
      dom.expressionCustomScaleInput.addEventListener('input', () => {
        calculateExpression(false);
      });
    }

    if (dom.btnRunExpression) {
      dom.btnRunExpression.addEventListener('click', () => {
        calculateExpression(true);
      });
    }

    // Quick Template Chips
    document.querySelectorAll('.expr-template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const expr = chip.dataset.expr;
        if (dom.expressionInput && expr) {
          dom.expressionInput.value = expr;
          calculateExpression(true);
          AudioService.playTick();
        }
      });
    });

    if (dom.expressionCopyBtn) {
      dom.expressionCopyBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (state.lastValidExpression && state.lastValidExpression.isValid) {
          copyToClipboard(state.lastValidExpression.formatted, 'Evaluated Expression Result');
        } else {
          showToast('No valid result to copy', 'warning');
        }
      });
    }

    if (dom.expressionCopyRawBtn) {
      dom.expressionCopyRawBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (state.lastValidExpression && state.lastValidExpression.isValid) {
          const valStr = state.lastValidExpression.dimension === 'scalar'
            ? String(state.lastValidExpression.value)
            : formatNumber(state.lastValidExpression.canonicalMeters, state.precision);
          copyToClipboard(valStr, 'Raw Numeric Value');
        } else {
          showToast('No valid result to copy', 'warning');
        }
      });
    }

    if (dom.expressionCopyDrawingBtn) {
      dom.expressionCopyDrawingBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (state.lastValidExpression && state.lastValidExpression.isValid && state.lastValidExpression.drawingFormatted) {
          copyToClipboard(state.lastValidExpression.drawingFormatted, `Scaled Drawing (${state.lastValidExpression.drawingFormatted})`);
        } else {
          showToast('No scaled drawing dimension available', 'warning');
        }
      });
    }

    if (dom.expressionAddWorkspaceBtn) {
      dom.expressionAddWorkspaceBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (!state.lastValidExpression || !state.lastValidExpression.isValid) {
          showToast('Cannot add invalid expression to workspace', 'warning');
          return;
        }

        const res = state.lastValidExpression;
        const name = dom.expressionAddName?.value?.trim() || 'Expression Result';
        const role = dom.expressionAddRoleSelect?.value || 'reference';
        const rawInput = res.dimension === 'scalar' ? String(res.value) : res.formatted;
        const unit = res.dimension === 'scalar' ? (dom.expressionDefaultUnit?.value || 'mm') : res.displayUnit;

        const newEntry = createDimensionEntry({
          name,
          rawInput,
          dimensionType: role,
          defaultUnit: unit,
          notes: `Evaluated: ${res.expression}`
        }, unit);

        state.workspace.entries.push(newEntry);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast(`Added [${role.toUpperCase()}] "${name}" (${rawInput}) to Workspace`);
      });
    }

    if (dom.expressionSaveJournalBtn) {
      dom.expressionSaveJournalBtn.addEventListener('click', () => {
        calculateExpression(true);
        logCurrentCalculationToHistory('expression');
      });
    }

    if (dom.expressionClearRecentBtn) {
      dom.expressionClearRecentBtn.addEventListener('click', () => {
        state.recentExpressions = [];
        renderRecentExpressions();
        AudioService.playTick();
        showToast('Recent expressions cleared');
      });
    }

    // Mode 8 -> Mode 9: Compare Across Scales Action
    if (dom.expressionCompareBtn) {
      dom.expressionCompareBtn.addEventListener('click', () => {
        calculateExpression(true);
        const exprToCompare = state.lastValidExpression?.formatted || dom.expressionInput?.value?.trim();
        if (exprToCompare) {
          switchMode('multiscale');
          if (dom.multiscaleInput) {
            dom.multiscaleInput.value = exprToCompare;
            calculateMultiScale(true);
          }
          AudioService.playTick();
          showToast(`Loaded "${exprToCompare}" into Multi-Scale Comparison`);
        } else {
          showToast('Enter and evaluate an expression first', 'warning');
        }
      });
    }

    // Mode 9: Multi-Scale Comparison Listeners
    if (dom.multiscaleInput) {
      dom.multiscaleInput.addEventListener('input', () => {
        calculateMultiScale(false);
      });

      dom.multiscaleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          calculateMultiScale(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.multiscaleInput.value = '';
          calculateMultiScale(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleClearInputBtn) {
      dom.multiscaleClearInputBtn.addEventListener('click', () => {
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = '';
          dom.multiscaleInput.focus();
          calculateMultiScale(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleDefaultUnit) {
      dom.multiscaleDefaultUnit.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    if (dom.multiscaleDisplayUnit) {
      dom.multiscaleDisplayUnit.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    // Preset Group Pills
    document.querySelectorAll('.multiscale-group-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.multiscale-group-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.multiscaleGroup = pill.dataset.group;
        calculateMultiScale(true);
        AudioService.playTick();
      });
    });

    if (dom.multiscaleAddScaleBtn) {
      dom.multiscaleAddScaleBtn.addEventListener('click', () => {
        const ratio = parseFloat(dom.multiscaleCustomScaleInput?.value);
        addCustomScale(ratio);
        if (dom.multiscaleCustomScaleInput) dom.multiscaleCustomScaleInput.value = '';
      });
    }

    if (dom.multiscaleSortSelect) {
      dom.multiscaleSortSelect.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    if (dom.multiscalePaperSelect) {
      dom.multiscalePaperSelect.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    if (dom.multiscaleFitMin) {
      dom.multiscaleFitMin.addEventListener('input', () => {
        calculateMultiScale(false);
      });
    }

    if (dom.multiscaleFitMax) {
      dom.multiscaleFitMax.addEventListener('input', () => {
        calculateMultiScale(false);
      });
    }

    // Example Chips
    document.querySelectorAll('.multiscale-example-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const dim = chip.dataset.dim;
        if (dom.multiscaleInput && dim) {
          dom.multiscaleInput.value = dim;
          calculateMultiScale(true);
          AudioService.playTick();
        }
      });
    });

    if (dom.btnRunMultiscale) {
      dom.btnRunMultiscale.addEventListener('click', () => {
        calculateMultiScale(true);
      });
    }

    if (dom.multiscaleLoadSampleBtn) {
      dom.multiscaleLoadSampleBtn.addEventListener('click', () => {
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = '2400 mm';
          calculateMultiScale(true);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleCopyTableBtn) {
      dom.multiscaleCopyTableBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'table');
          copyToClipboard(out, 'Scale Comparison Table');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    if (dom.multiscaleCopyAllBtn) {
      dom.multiscaleCopyAllBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'all');
          copyToClipboard(out, 'All Scales List');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    if (dom.multiscaleCopyCurrentBtn) {
      dom.multiscaleCopyCurrentBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'current');
          copyToClipboard(out, 'Current Scale Comparison');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    if (dom.multiscaleCopyRawBtn) {
      dom.multiscaleCopyRawBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'raw');
          copyToClipboard(out, 'Raw Drawing Numbers (CAD)');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    // Mode 10: Dimension Chains Listeners
    if (dom.chainsNameInput) {
      dom.chainsNameInput.addEventListener('input', () => {
        state.activeChain.name = dom.chainsNameInput.value.trim() || 'Dimension Chain';
        saveChain();
      });
    }

    if (dom.chainsScaleSelect) {
      dom.chainsScaleSelect.addEventListener('change', () => {
        calculateAndRenderChain(true);
        AudioService.playTick();
      });
    }

    if (dom.chainsUnitSelect) {
      dom.chainsUnitSelect.addEventListener('change', () => {
        calculateAndRenderChain(true);
        AudioService.playTick();
      });
    }

    if (dom.chainsStartOffsetInput) {
      dom.chainsStartOffsetInput.addEventListener('input', () => {
        calculateAndRenderChain(false);
      });
    }

    if (dom.chainsEndOffsetInput) {
      dom.chainsEndOffsetInput.addEventListener('input', () => {
        calculateAndRenderChain(false);
      });
    }

    if (dom.chainsQuickInput) {
      dom.chainsQuickInput.addEventListener('input', () => {
        calculateAndRenderChain(false);
      });

      dom.chainsQuickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = dom.chainsQuickInput.value.trim();
          if (val) {
            addSegmentsToChain(val);
            dom.chainsQuickInput.value = '';
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.chainsQuickInput.value = '';
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.chainsAddBtn) {
      dom.chainsAddBtn.addEventListener('click', () => {
        const val = dom.chainsQuickInput?.value?.trim();
        if (val) {
          addSegmentsToChain(val);
          if (dom.chainsQuickInput) dom.chainsQuickInput.value = '';
        } else {
          showToast('Enter segment measurement(s) to add', 'warning');
        }
      });
    }

    if (dom.chainsClearInputBtn) {
      dom.chainsClearInputBtn.addEventListener('click', () => {
        if (dom.chainsQuickInput) {
          dom.chainsQuickInput.value = '';
          dom.chainsQuickInput.focus();
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.chainsClearAllBtn) {
      dom.chainsClearAllBtn.addEventListener('click', () => {
        state.activeChain.segments = [];
        state.chainSelectedSegmentId = null;
        calculateAndRenderChain(true);
        AudioService.playTick();
        showToast('Cleared all chain segments');
      });
    }

    if (dom.chainsZoomFitBtn) {
      dom.chainsZoomFitBtn.addEventListener('click', () => {
        calculateAndRenderChain(false);
        AudioService.playTick();
        showToast('Viewport reset to fit chain');
      });
    }

    // Template Chips
    document.querySelectorAll('.chain-template-chip[data-template]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tplKey = chip.dataset.template;
        loadChainTemplate(tplKey);
      });
    });

    if (dom.btnRunChains) {
      dom.btnRunChains.addEventListener('click', () => {
        calculateAndRenderChain(true);
      });
    }

    // Multi-Scale Comparison Handoff
    if (dom.chainsCompareMultiscaleBtn) {
      dom.chainsCompareMultiscaleBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (!state.lastValidChain || !state.lastValidChain.isValid) {
          showToast('No valid chain calculation to compare', 'warning');
          return;
        }

        let dimToCompare = state.lastValidChain.overallExtentFormatted;
        if (state.chainSelectedSegmentId) {
          const sel = state.lastValidChain.segments.find(s => s.id === state.chainSelectedSegmentId);
          if (sel) {
            dimToCompare = sel.lengthFormatted;
          }
        }

        switchMode('multiscale');
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = dimToCompare;
          calculateMultiScale(true);
        }
        AudioService.playTick();
        showToast(`Loaded ${dimToCompare} into Multi-Scale Comparison`);
      });
    }

    // Send to Dimension Workspace Handoff
    if (dom.chainsSendWorkspaceBtn) {
      dom.chainsSendWorkspaceBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (!state.lastValidChain || !state.lastValidChain.isValid) {
          showToast('No valid chain to send to Workspace', 'warning');
          return;
        }

        const wsGroup = convertChainToWorkspaceGroup(state.lastValidChain);
        if (wsGroup.entries.length === 0) {
          showToast('No segments in chain to send', 'warning');
          return;
        }

        if (!state.workspace.groups) state.workspace.groups = [];
        state.workspace.groups.push(wsGroup.group);
        state.workspace.entries.push(...wsGroup.entries);

        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast(`Added group "${wsGroup.group.name}" with ${wsGroup.entries.length} entries to Workspace`);
      });
    }

    // Save to Calculation Journal Handoff
    if (dom.chainsSaveJournalBtn) {
      dom.chainsSaveJournalBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain && state.lastValidChain.isValid) {
          logCurrentCalculationToHistory('chains');
          AudioService.playTick();
        } else {
          showToast('No valid chain calculation to log', 'warning');
        }
      });
    }

    // Multi-Stream Copy Buttons
    if (dom.chainsCopyTableBtn) {
      dom.chainsCopyTableBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'table');
          copyToClipboard(out, 'Dimension Chain Table');
        }
      });
    }

    if (dom.chainsCopyCumBtn) {
      dom.chainsCopyCumBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'cumulative');
          copyToClipboard(out, 'Cumulative Running Coordinates');
        }
      });
    }

    if (dom.chainsCopySegsBtn) {
      dom.chainsCopySegsBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'segments');
          copyToClipboard(out, 'Segment Lengths');
        }
      });
    }

    if (dom.chainsCopyDrawBtn) {
      dom.chainsCopyDrawBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'drawing');
          copyToClipboard(out, 'Scaled Drawing Dimensions');
        }
      });
    }

    if (dom.chainsExportTsvBtn) {
      dom.chainsExportTsvBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const tsvContent = formatChainForClipboard(state.lastValidChain, 'tsv');
          const fileName = `${(state.activeChain.name || 'Dimension_Chain').replace(/\s+/g, '_')}.tsv`;
          downloadFile(tsvContent, fileName, 'text/tab-separated-values');
          AudioService.playTick();
          showToast(`Exported ${fileName}`);
        }
      });
    }

    // Mode 11: CAD Clipboard Listeners
    if (dom.cadQuickChips) {
      dom.cadQuickChips.querySelectorAll('.cad-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          applyCadPreset(chip.dataset.preset);
        });
      });
    }

    if (dom.cadSourcePills) {
      dom.cadSourcePills.querySelectorAll('.cad-source-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          state.cadClipboard.source = pill.dataset.source;
          renderCadClipboard(true);
          AudioService.playTick();
        });
      });
    }

    if (dom.cadManualInput) {
      dom.cadManualInput.addEventListener('input', (e) => {
        state.cadClipboard.manualInput = e.target.value;
        renderCadClipboard(false);
      });
    }

    const cadSelects = [
      dom.cadTargetSelect,
      dom.cadUnitSelect,
      dom.cadPrecisionSelect,
      dom.cadSuffixSelect,
      dom.cadDelimiterSelect,
      dom.cadScopeSelect
    ];
    cadSelects.forEach(sel => {
      if (sel) {
        sel.addEventListener('change', () => {
          renderCadClipboard(true);
          AudioService.playTick();
        });
      }
    });

    if (dom.btnRunCadClipboard) {
      dom.btnRunCadClipboard.addEventListener('click', () => {
        renderCadClipboard(true);
      });
    }

    if (dom.btnCadCopyMain) {
      dom.btnCadCopyMain.addEventListener('click', () => {
        copyCadClipboardData();
      });
    }

    if (dom.btnCadCopyRaw) {
      dom.btnCadCopyRaw.addEventListener('click', () => {
        copyCadClipboardData({ suffix: 'none', format: 'generic', delimiter: 'space' });
      });
    }

    if (dom.btnCadCopyUnits) {
      dom.btnCadCopyUnits.addEventListener('click', () => {
        copyCadClipboardData({ suffix: 'symbol' });
      });
    }

    if (dom.btnCadCopyTsv) {
      dom.btnCadCopyTsv.addEventListener('click', () => {
        copyCadClipboardData({ format: 'spreadsheet', delimiter: 'tsv' });
      });
    }

    if (dom.btnCadExportTxt) {
      dom.btnCadExportTxt.addEventListener('click', () => {
        renderCadClipboard(true);
        const text = state.cadClipboard.lastFormattedText;
        if (text) {
          downloadFile(text, 'CAD_Dimensions.txt', 'text/plain');
          AudioService.playTick();
          showToast('Exported CAD_Dimensions.txt');
        } else {
          showToast('No CAD dimension data to export', 'warning');
        }
      });
    }

    // Cross-Mode CAD Handoff Buttons
    if (dom.wsOpenCadBtn) {
      dom.wsOpenCadBtn.addEventListener('click', () => {
        openCadClipboardWithSource('workspace');
      });
    }

    if (dom.exprCadHandoffBtn) {
      dom.exprCadHandoffBtn.addEventListener('click', () => {
        openCadClipboardWithSource('expression');
      });
    }

    if (dom.msCadHandoffBtn) {
      dom.msCadHandoffBtn.addEventListener('click', () => {
        openCadClipboardWithSource('multiscale');
      });
    }

    if (dom.chainsCadHandoffBtn) {
      dom.chainsCadHandoffBtn.addEventListener('click', () => {
        openCadClipboardWithSource('chain');
      });
    }

    // Mode 12: Batch CAD Conversion Listeners
    if (dom.batchQuickChips) {
      dom.batchQuickChips.querySelectorAll('.cad-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          applyBatchPreset(chip.dataset.preset);
        });
      });
    }

    if (dom.batchPasteInput) {
      dom.batchPasteInput.addEventListener('input', () => {
        const val = dom.batchPasteInput.value;
        const detected = detectBatchDelimiter(val);
        if (dom.batchDelimiterBadge) {
          dom.batchDelimiterBadge.textContent = `FORMAT: ${detected.toUpperCase()}`;
        }
      });

      dom.batchPasteInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          parseAndConvertBatch(true);
        }
      });
    }

    if (dom.batchModeSelect) {
      dom.batchModeSelect.addEventListener('change', () => {
        state.batchCad.mode = dom.batchModeSelect.value;
        updateBatchModeVisibility();
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchSourceScaleSelect) {
      dom.batchSourceScaleSelect.addEventListener('change', () => {
        state.batchCad.sourceScale = parseInt(dom.batchSourceScaleSelect.value, 10) || 50;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchTargetScaleSelect) {
      dom.batchTargetScaleSelect.addEventListener('change', () => {
        state.batchCad.targetScale = parseInt(dom.batchTargetScaleSelect.value, 10) || 50;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchSourceUnitSelect) {
      dom.batchSourceUnitSelect.addEventListener('change', () => {
        state.batchCad.sourceUnit = dom.batchSourceUnitSelect.value;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchTargetUnitSelect) {
      dom.batchTargetUnitSelect.addEventListener('change', () => {
        state.batchCad.targetUnit = dom.batchTargetUnitSelect.value;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchPrecisionSelect) {
      dom.batchPrecisionSelect.addEventListener('change', () => {
        state.batchCad.precision = parseInt(dom.batchPrecisionSelect.value, 10) || 2;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchDelimiterSelect) {
      dom.batchDelimiterSelect.addEventListener('change', () => {
        state.batchCad.delimiter = dom.batchDelimiterSelect.value;
        parseAndConvertBatch(false);
      });
    }

    if (dom.btnRunBatchCad) {
      dom.btnRunBatchCad.addEventListener('click', () => {
        parseAndConvertBatch(true);
      });
    }

    if (dom.batchFilterPills) {
      dom.batchFilterPills.querySelectorAll('.cad-preset-chip').forEach(pill => {
        pill.addEventListener('click', () => {
          state.batchCad.activeFilter = pill.dataset.filter;
          dom.batchFilterPills.querySelectorAll('.cad-preset-chip').forEach(p => {
            p.classList.toggle('active', p === pill);
          });
          renderBatchResults();
          AudioService.playTick();
        });
      });
    }

    if (dom.batchSelectAllBtn) {
      dom.batchSelectAllBtn.addEventListener('click', () => {
        if (state.batchCad.lastResult && state.batchCad.lastResult.rows) {
          state.batchCad.lastResult.rows.forEach(r => state.batchCad.selectedIds.add(r.id));
          renderBatchResults();
          AudioService.playTick();
        }
      });
    }

    if (dom.batchClearSelectionBtn) {
      dom.batchClearSelectionBtn.addEventListener('click', () => {
        state.batchCad.selectedIds.clear();
        renderBatchResults();
        AudioService.playTick();
      });
    }

    if (dom.batchMasterCheckbox) {
      dom.batchMasterCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (state.batchCad.lastResult && state.batchCad.lastResult.rows) {
          if (checked) {
            state.batchCad.lastResult.rows.forEach(r => state.batchCad.selectedIds.add(r.id));
          } else {
            state.batchCad.selectedIds.clear();
          }
          renderBatchResults();
          AudioService.playTick();
        }
      });
    }

    if (dom.batchLoadSampleBtn) {
      dom.batchLoadSampleBtn.addEventListener('click', () => {
        const sample = `Wall North = 4800mm\nSEG Wall South = 3200mm\nWindow 1 = 1800 + 300\nALW Tolerance = 20mm\nDoor Entrance = 900\n2.4m\n7' 6"`;
        if (dom.batchPasteInput) dom.batchPasteInput.value = sample;
        state.batchCad.rawInput = sample;
        parseAndConvertBatch(true);
      });
    }

    // Export & Action toolbar buttons
    if (dom.batchCopyResultsBtn) {
      dom.batchCopyResultsBtn.addEventListener('click', () => {
        copyBatchData('results_only');
      });
    }

    if (dom.batchCopyRawBtn) {
      dom.batchCopyRawBtn.addEventListener('click', () => {
        copyBatchData('raw_numbers');
      });
    }

    if (dom.batchCopyTsvBtn) {
      dom.batchCopyTsvBtn.addEventListener('click', () => {
        copyBatchData('tsv_schedule');
      });
    }

    if (dom.batchOpenCadBtn) {
      dom.batchOpenCadBtn.addEventListener('click', () => {
        sendBatchToCadClipboard();
      });
    }

    if (dom.batchSendWorkspaceBtn) {
      dom.batchSendWorkspaceBtn.addEventListener('click', () => {
        sendBatchToWorkspace();
      });
    }

    if (dom.batchCompareMultiscaleBtn) {
      dom.batchCompareMultiscaleBtn.addEventListener('click', () => {
        sendBatchToMultiScale();
      });
    }

    if (dom.batchCreateChainBtn) {
      dom.batchCreateChainBtn.addEventListener('click', () => {
        sendBatchToChains();
      });
    }

    if (dom.batchSaveJournalBtn) {
      dom.batchSaveJournalBtn.addEventListener('click', () => {
        const result = state.batchCad.lastResult;
        if (!result || !result.rows || result.rows.length === 0) {
          showToast('No batch conversion to save', 'warning');
          return;
        }
        HistoryService.addEntry({
          toolMode: 'batch_cad',
          title: `Batch CAD (${result.summary?.validRows || 0} rows)`,
          inputString: `${result.config?.mode || 'Batch'} (${result.config?.sourceUnit || 'mm'} ➔ ${result.config?.targetUnit || 'mm'})`,
          resultString: `${result.summary?.validRows || 0} valid / ${result.summary?.totalRows || 0} total`,
          metadata: {
            mode: result.config?.mode,
            totalRows: result.summary?.totalRows,
            validRows: result.summary?.validRows,
            totalCanonicalMeters: result.summary?.totalCanonicalMeters
          }
        });
        renderHistoryList();
        AudioService.playTick();
        showToast('Saved batch conversion to calculation journal');
      });
    }

    // Keyboard Global Shortcuts
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');

      // Global CAD Clipboard Shortcut: Ctrl+Shift+C or Cmd+Shift+C (Works everywhere)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        switchMode('cad_clipboard');
        return;
      }

      // Global Command Palette Shortcut: Ctrl+K or Cmd+K (Works everywhere)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dom.commandPaletteModal?.classList.contains('open')) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // Esc closes Command Palette first, then drawers/modals/selection
      if (e.key === 'Escape') {
        if (dom.commandPaletteModal?.classList.contains('open')) {
          e.preventDefault();
          e.stopPropagation();
          closeCommandPalette();
          return;
        }
        if (dom.historyDrawer?.classList.contains('open')) toggleHistoryDrawer();
        if (dom.shortcutsModal?.classList.contains('open')) {
          dom.shortcutsModal.classList.remove('open');
          dom.modalBackdrop?.classList.remove('open');
        }
        if (state.currentMode === 'workspace' && state.workspaceSelectedIds.size > 0) {
          state.workspaceSelectedIds.clear();
          renderWorkspace();
          return;
        }
        if (activeEl && activeEl.blur) activeEl.blur();
        return;
      }

      // Quick Add form shortcut: Ctrl+Enter or Cmd+Enter inside form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && state.currentMode === 'workspace') {
        if (dom.workspaceAddForm) {
          e.preventDefault();
          dom.workspaceAddForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          return;
        }
      }

      // If user is focused inside an input field, do not hijack letter/number shortcuts
      if (isInputFocused) return;

      // Mode 7 Workspace-specific shortcuts (when not focused in inputs)
      if (state.currentMode === 'workspace') {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          dom.workspaceAddInput?.focus();
          dom.workspaceAddInput?.select();
          return;
        }
        if (e.key === 'd' || e.key === 'D') {
          if (state.workspaceSelectedIds.size === 1) {
            e.preventDefault();
            const id = Array.from(state.workspaceSelectedIds)[0];
            const idx = state.workspace.entries.findIndex(x => x.id === id);
            if (idx !== -1) {
              const dup = duplicateDimensionEntry(state.workspace.entries[idx]);
              state.workspace.entries.splice(idx + 1, 0, dup);
              saveWorkspace();
              renderWorkspace();
              AudioService.playTick();
              showToast(`Duplicated "${dup.name}"`);
            }
            return;
          }
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (state.workspaceSelectedIds.size > 0) {
            e.preventDefault();
            const count = state.workspaceSelectedIds.size;
            state.workspace.entries = state.workspace.entries.filter(x => !state.workspaceSelectedIds.has(x.id));
            state.workspaceSelectedIds.clear();
            saveWorkspace();
            renderWorkspace();
            AudioService.playTick();
            showToast(`Deleted ${count} selected dimension${count > 1 ? 's' : ''}`);
            return;
          }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          if (state.workspaceSelectedIds.size > 0) {
            e.preventDefault();
            const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
              mode: 'selected',
              selectedIds: Array.from(state.workspaceSelectedIds),
              groups: state.workspace.groups
            });
            copyToClipboard(text, `${state.workspaceSelectedIds.size} Selected Dimensions`);
            return;
          }
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (state.workspace.entries.length > 0) {
            e.preventDefault();
            const ids = state.workspace.entries.map(x => x.id);
            const currentSelectedId = Array.from(state.workspaceSelectedIds)[0];
            let currentIdx = ids.indexOf(currentSelectedId);
            let nextIdx = 0;
            if (e.key === 'ArrowDown') {
              nextIdx = currentIdx === -1 ? 0 : Math.min(ids.length - 1, currentIdx + 1);
            } else {
              nextIdx = currentIdx === -1 ? ids.length - 1 : Math.max(0, currentIdx - 1);
            }
            state.workspaceSelectedIds.clear();
            state.workspaceSelectedIds.add(ids[nextIdx]);
            renderWorkspace();
            return;
          }
        }
      }

      if (e.key === '1') { e.preventDefault(); switchMode('converter'); }
      else if (e.key === '2') { e.preventDefault(); switchMode('rescale'); }
      else if (e.key === '3') { e.preventDefault(); switchMode('detector'); }
      else if (e.key === '4') { e.preventDefault(); switchMode('area_volume'); }
      else if (e.key === '5') { e.preventDefault(); switchMode('furniture'); }
      else if (e.key === '6') { e.preventDefault(); switchMode('reference'); }
      else if (e.key === '7') { e.preventDefault(); switchMode('workspace'); }
      else if (e.key === '8') { e.preventDefault(); switchMode('expression'); }
      else if (e.key === '9') { e.preventDefault(); switchMode('multiscale'); }
      else if (e.key === '0') { e.preventDefault(); switchMode('chains'); }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); switchMode('cad_clipboard'); }
      else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); switchMode('batch_cad'); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); swapDirection(); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleHistoryDrawer(); }
      else if (e.key === '?') {
        e.preventDefault();
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
      }
    });
  }

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------------------------------------------------------------------------
  // 15. Initial Bootstrapping
  // ---------------------------------------------------------------------------
  applyTheme(state.activeTheme);
  updateSoundUI();
  populateUnitSelects();
  renderPresetChips(state.selectedCategory);
  attachEventListeners();
  switchMode(state.currentMode);
}
