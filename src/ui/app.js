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
// NOTE: cad-clipboard / batch-cad / cad-targets core engines are imported by
// their view modules (src/ui/views/*) — app.js only needs the storage keys
// and the small helpers still referenced by listeners/state below.
import {
  CAD_STORAGE_KEY
} from '../core/cad-clipboard.js';
import {
  BATCH_STORAGE_KEY,
  detectBatchDelimiter
} from '../core/batch-cad.js';
import {
  DEFAULT_QUICK_SCALES,
  DEFAULT_QUICK_PREFS,
  QUICK_DIM_STORAGE_KEY,
  getArchitecturalContext,
  evaluateQuickDimension,
  formatQuickDimensionClipboard,
  createQuickHandoffPayload
} from '../core/quick-dimension.js';
import { createViewRegistry, validateViewContext } from './view-registry.js';
import { createConverterView } from './views/converter.js';
import { createRescalerView } from './views/rescaler.js';
import { createDetectorView } from './views/detector.js';
import { createAreaVolumeView } from './views/area-volume.js';
import { createExpressionView, createMultiScaleView } from './views/expression-multiscale.js';
import { createChainsView } from './views/dimension-chains.js';
import { createCadClipboardView, createCadHandoffView } from './views/cad-clipboard-handoff.js';
import { createBatchCadView } from './views/batch-cad.js';
import { createQuickDimensionView } from './views/quick-dimension.js';
import { createHistoryView } from './views/history.js';
import { createStairsView } from './views/stairs.js';
import { createRampsView } from './views/ramps.js';
import { createSlopesView } from './views/slopes.js';
import { createExportCenterView } from './views/export-center.js';
import { createProjectsView } from './views/projects.js';
import { createPlanView } from './views/plan.js';
import { createAiStudioView } from './views/ai-studio.js';
import { createAiControlCenterView } from './views/ai-control-center.js';
import { createImportsView } from './views/imports.js';
import { createSurveyView } from './views/survey.js';
import { buildScopedFactsPack } from '../ai/context/project-context.js';
import { createAiHttp } from '../services/ai/http.js';
import { createTransports } from '../services/ai/transports/index.js';
import { createProviderManager } from '../services/ai/provider-manager.js';
import { createModelCatalog } from '../services/ai/model-catalog.js';
import { createJobRouter } from '../services/ai/job-router.js';
import { StorageService } from '../services/storage.js';
import { createProjectStore } from '../services/store.js';
import { AudioService } from '../services/audio.js';
import { HistoryService } from '../services/history.js';
import { CommandRegistry } from '../services/commands.js';
import { updateVisualization, getFurniturePlanSVG } from './visualizer.js';

export function initializeApp() {
  /** Escapes user-controllable strings before innerHTML rendering (app-wide). */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const state = {
    currentMode: 'home',
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

    // Quick Dimension Strip (Micro-Tool & Glance Strip)
    quickDimension: (() => {
      try {
        const stored = StorageService.getItem(QUICK_DIM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
      return {
        isOpen: false,
        pinned: false,
        rawInput: '2400mm',
        selectedScale: 50,
        scales: [...DEFAULT_QUICK_SCALES],
        displayUnit: 'mm',
        drawingUnit: 'mm',
        precision: 2,
        mode: 'real_to_drawing',
        showContext: true,
        lastResult: null
      };
    })(),

    // Mode 13: CAD Application Helpers (Send-To Handoff)
    cadHandoff: (() => {
      try {
        const stored = StorageService.getItem(CAD_HANDOFF_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
      return {
        source: 'chain',
        target: 'rhino',
        format: 'raw',
        unit: null,          // null = follow target profile default
        precision: null,     // null = follow target profile default
        suffix: 'target',    // 'target' = follow profile/mode default
        chainLayout: 'segments',
        workspaceScope: 'all',
        batchScope: 'all',
        manualInput: '',
        lastPayload: null
      };
    })(),

    // Cached Previous Valid Calculations (Never wipe to empty on invalid keystroke)
    lastValidConverter: null,
    lastValidRescale: null,
    lastValidDetector: null,
    lastValidAreavol: null,

    // Mode 14: Stair Calculator
    stairs: {
      mode: 'rise_desired_riser',
      objective: 'comfortable_proportion',
      displayUnit: 'mm',
      lastResult: null
    },

    // Mode 15: Ramp Calculator
    ramps: {
      mode: 'rise_desired_slope',
      displayUnit: 'm',
      lastResult: null
    },

    // Mode 16: Slope Analyzer
    slopes: {
      mode: 'rise_run',
      displayUnit: 'm',
      lastResult: null
    },

    // Mode 17: Export Center
    exportCenter: {
      lastResult: null
    },

    // Mode 18: Project Workspace
    projects: {},

    // Application shell (UI state, never project data)
    sidebarCollapsedSections: new Set(),

    // Mode 19: Plan Canvas
    plan: {
      tool: 'select',
      grid: 0.5,
      selectedIds: new Set(),
      furnitureIndex: 0,
      furnitureRotated: false,
      entities: []
    },

    // Modes 20-21: AI Studio + AI Control Center (services attached at boot)
    ai: null,

    // Mode 23: Survey Notebook (user preferences only; data lives in the project)
    survey: {
      defaultSource: 'Measured'
    }
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
    batchSendCadHandoffBtn: document.getElementById('batch-send-cad-handoff-btn'),
    workspaceSendCadHandoffBtn: document.getElementById('workspace-send-cad-handoff-btn'),
    expressionSendCadHandoffBtn: document.getElementById('expression-send-cad-handoff-btn'),
    multiscaleSendCadHandoffBtn: document.getElementById('multiscale-send-cad-handoff-btn'),
    chainsSendCadHandoffBtn: document.getElementById('chains-send-cad-handoff-btn'),
    quickDimSendCadHandoffBtn: document.getElementById('quick-dim-send-cad-handoff-btn'),
    batchSendWorkspaceBtn: document.getElementById('batch-send-workspace-btn'),
    batchCompareMultiscaleBtn: document.getElementById('batch-compare-multiscale-btn'),
    batchCreateChainBtn: document.getElementById('batch-create-chain-btn'),
    batchSaveJournalBtn: document.getElementById('batch-save-journal-btn'),

    // Quick Dimension Strip (Micro-Tool & Glance Strip)
    quickDimToggleBtn: document.getElementById('quick-dim-toggle-btn'),
    quickDimStrip: document.getElementById('quick-dimension-strip'),
    quickDimStatusBadge: document.getElementById('quick-dim-status-badge'),
    quickDimModePills: document.getElementById('quick-dim-mode-pills'),
    quickDimPinBtn: document.getElementById('quick-dim-pin-btn'),
    quickDimCloseBtn: document.getElementById('quick-dim-close-btn'),
    quickDimInput: document.getElementById('quick-dim-input'),
    btnRunQuickDim: document.getElementById('btn-run-quick-dim'),
    quickDimErrorMsg: document.getElementById('quick-dim-error-msg'),
    quickDimRealVal: document.getElementById('quick-dim-real-val'),
    quickDimSelectedScaleLabel: document.getElementById('quick-dim-selected-scale-label'),
    quickDimDrawingVal: document.getElementById('quick-dim-drawing-val'),
    quickEquivMm: document.getElementById('quick-equiv-mm'),
    quickEquivCm: document.getElementById('quick-equiv-cm'),
    quickEquivM: document.getElementById('quick-equiv-m'),
    quickEquivIn: document.getElementById('quick-equiv-in'),
    quickEquivFtin: document.getElementById('quick-equiv-ftin'),
    quickDimScaleChips: document.getElementById('quick-dim-scale-chips'),
    quickDimCustomScaleInput: document.getElementById('quick-dim-custom-scale-input'),
    quickDimMatrixGrid: document.getElementById('quick-dim-matrix-grid'),
    quickDimContextCard: document.getElementById('quick-dim-context-card'),
    quickDimContextTitle: document.getElementById('quick-dim-context-title'),
    quickDimContextBody: document.getElementById('quick-dim-context-body'),
    quickDimCopyRealBtn: document.getElementById('quick-dim-copy-real-btn'),
    quickDimCopyDrawBtn: document.getElementById('quick-dim-copy-draw-btn'),
    quickDimCopyCadBtn: document.getElementById('quick-dim-copy-cad-btn'),
    quickDimCopyMatrixBtn: document.getElementById('quick-dim-copy-matrix-btn'),
    quickDimSendWorkspaceBtn: document.getElementById('quick-dim-send-workspace-btn'),
    quickDimSendMultiscaleBtn: document.getElementById('quick-dim-send-multiscale-btn'),
    quickDimSendChainBtn: document.getElementById('quick-dim-send-chain-btn'),
    quickDimSendCadBtn: document.getElementById('quick-dim-send-cad-btn'),
    quickDimSaveJournalBtn: document.getElementById('quick-dim-save-journal-btn'),

    // Mode 13: CAD Handoff Elements
    handoffSourceSelect: document.getElementById('handoff-source-select'),
    handoffSourceHint: document.getElementById('handoff-source-hint'),
    handoffManualGroup: document.getElementById('handoff-manual-group'),
    handoffManualInput: document.getElementById('handoff-manual-input'),
    handoffTargetPills: document.getElementById('handoff-target-pills'),
    handoffTargetDescription: document.getElementById('handoff-target-description'),
    handoffFormatSelect: document.getElementById('handoff-format-select'),
    handoffChainLayoutGroup: document.getElementById('handoff-chain-layout-group'),
    handoffChainLayoutSelect: document.getElementById('handoff-chain-layout-select'),
    handoffWorkspaceScopeGroup: document.getElementById('handoff-workspace-scope-group'),
    handoffWorkspaceScopeSelect: document.getElementById('handoff-workspace-scope-select'),
    handoffBatchScopeGroup: document.getElementById('handoff-batch-scope-group'),
    handoffBatchScopeSelect: document.getElementById('handoff-batch-scope-select'),
    handoffAdvancedDetails: document.getElementById('handoff-advanced-details'),
    handoffUnitSelect: document.getElementById('handoff-unit-select'),
    handoffPrecisionSelect: document.getElementById('handoff-precision-select'),
    handoffSuffixSelect: document.getElementById('handoff-suffix-select'),
    btnRunCadHandoff: document.getElementById('btn-run-cad-handoff'),
    handoffResultPanel: document.getElementById('handoff-result-panel'),
    handoffSummaryBadge: document.getElementById('handoff-summary-badge'),
    handoffPreviewBox: document.getElementById('handoff-preview-box'),
    btnHandoffCopy: document.getElementById('btn-handoff-copy'),
    handoffCopyTargetLabel: document.getElementById('handoff-copy-target-label'),
    btnHandoffExportTxt: document.getElementById('btn-handoff-export-txt'),
    btnHandoffOpenCadClipboard: document.getElementById('btn-handoff-open-cad-clipboard'),

    // Mode 14: Stair Calculator Elements
    stairsModeSelect: document.getElementById('stairs-mode-select'),
    stairsTotalRise: document.getElementById('stairs-total-rise'),
    stairsDesiredRiserGroup: document.getElementById('stairs-desired-riser-group'),
    stairsDesiredRiser: document.getElementById('stairs-desired-riser'),
    stairsRiserCountGroup: document.getElementById('stairs-riser-count-group'),
    stairsRiserCount: document.getElementById('stairs-riser-count'),
    stairsAvailableRunGroup: document.getElementById('stairs-available-run-group'),
    stairsAvailableRun: document.getElementById('stairs-available-run'),
    stairsTotalRunGroup: document.getElementById('stairs-total-run-group'),
    stairsTotalRun: document.getElementById('stairs-total-run'),
    stairsDesiredTreadGroup: document.getElementById('stairs-desired-tread-group'),
    stairsDesiredTread: document.getElementById('stairs-desired-tread'),
    stairsObjectiveSelect: document.getElementById('stairs-objective-select'),
    btnRunStairs: document.getElementById('btn-run-stairs'),
    stairsErrorMsg: document.getElementById('stairs-error-msg'),
    stairsRefRiserMin: document.getElementById('stairs-ref-riser-min'),
    stairsRefRiserMax: document.getElementById('stairs-ref-riser-max'),
    stairsRefBlondelMin: document.getElementById('stairs-ref-blondel-min'),
    stairsRefBlondelMax: document.getElementById('stairs-ref-blondel-max'),
    stairsReferenceNote: document.getElementById('stairs-reference-note'),
    stairsResultPanel: document.getElementById('stairs-result-panel'),
    stairsConventionBadge: document.getElementById('stairs-convention-badge'),
    stairsRiserCountVal: document.getElementById('stairs-riser-count-val'),
    stairsRiserVal: document.getElementById('stairs-riser-val'),
    stairsTreadVal: document.getElementById('stairs-tread-val'),
    stairsRunVal: document.getElementById('stairs-run-val'),
    stairsFlightVal: document.getElementById('stairs-flight-val'),
    stairsAngleVal: document.getElementById('stairs-angle-val'),
    stairsSlopeVal: document.getElementById('stairs-slope-val'),
    stairsSvgWrap: document.getElementById('stairs-svg-wrap'),
    stairsBlondelVal: document.getElementById('stairs-blondel-val'),
    stairsBlondelStatus: document.getElementById('stairs-blondel-status'),
    stairsCandidatesBody: document.getElementById('stairs-candidates-body'),
    stairsCopyResultBtn: document.getElementById('stairs-copy-result-btn'),
    stairsCopyScheduleBtn: document.getElementById('stairs-copy-schedule-btn'),
    stairsSendCadBtn: document.getElementById('stairs-send-cad-btn'),
    stairsSendWorkspaceBtn: document.getElementById('stairs-send-workspace-btn'),
    stairsSaveJournalBtn: document.getElementById('stairs-save-journal-btn'),
    stairsSaveProjectBtn: document.getElementById('stairs-save-project-btn'),

    // Mode 15: Ramp Calculator Elements
    rampsModeSelect: document.getElementById('ramps-mode-select'),
    rampsRiseGroup: document.getElementById('ramps-rise-group'),
    rampsRise: document.getElementById('ramps-rise'),
    rampsSlopeGroup: document.getElementById('ramps-slope-group'),
    rampsSlope: document.getElementById('ramps-slope'),
    rampsRunGroup: document.getElementById('ramps-run-group'),
    rampsRun: document.getElementById('ramps-run'),
    btnRunRamps: document.getElementById('btn-run-ramps'),
    rampsErrorMsg: document.getElementById('ramps-error-msg'),
    rampsRefTarget: document.getElementById('ramps-ref-target'),
    rampsRefMin: document.getElementById('ramps-ref-min'),
    rampsRefMax: document.getElementById('ramps-ref-max'),
    rampsReferenceNote: document.getElementById('ramps-reference-note'),
    rampsResultPanel: document.getElementById('ramps-result-panel'),
    rampsSummaryBadge: document.getElementById('ramps-summary-badge'),
    rampsHeroVal: document.getElementById('ramps-hero-val'),
    rampsHeroLabel: document.getElementById('ramps-hero-label'),
    rampsRiseVal: document.getElementById('ramps-rise-val'),
    rampsRunVal: document.getElementById('ramps-run-val'),
    rampsSlopeVal: document.getElementById('ramps-slope-val'),
    rampsRatioVal: document.getElementById('ramps-ratio-val'),
    rampsAngleVal: document.getElementById('ramps-angle-val'),
    rampsFlightVal: document.getElementById('ramps-flight-val'),
    rampsSvgWrap: document.getElementById('ramps-svg-wrap'),
    rampsRunAnalysis: document.getElementById('ramps-run-analysis'),
    rampsRunAnalysisBody: document.getElementById('ramps-run-analysis-body'),
    rampsRefStatus: document.getElementById('ramps-ref-status'),
    rampsRefDetail: document.getElementById('ramps-ref-detail'),
    rampsTargetsBody: document.getElementById('ramps-targets-body'),
    rampsCopyResultBtn: document.getElementById('ramps-copy-result-btn'),
    rampsCopyScheduleBtn: document.getElementById('ramps-copy-schedule-btn'),
    rampsSendCadBtn: document.getElementById('ramps-send-cad-btn'),
    rampsSendWorkspaceBtn: document.getElementById('ramps-send-workspace-btn'),
    rampsSaveJournalBtn: document.getElementById('ramps-save-journal-btn'),
    rampsSaveProjectBtn: document.getElementById('ramps-save-project-btn'),

    // Mode 16: Slope Analyzer Elements
    slopesModeSelect: document.getElementById('slopes-mode-select'),
    slopesRiseGroup: document.getElementById('slopes-rise-group'),
    slopesRise: document.getElementById('slopes-rise'),
    slopesRunGroup: document.getElementById('slopes-run-group'),
    slopesRun: document.getElementById('slopes-run'),
    slopesPercentGroup: document.getElementById('slopes-percent-group'),
    slopesPercent: document.getElementById('slopes-percent'),
    slopesRatioGroup: document.getElementById('slopes-ratio-group'),
    slopesRatio: document.getElementById('slopes-ratio'),
    slopesAngleGroup: document.getElementById('slopes-angle-group'),
    slopesAngle: document.getElementById('slopes-angle'),
    btnRunSlopes: document.getElementById('btn-run-slopes'),
    slopesErrorMsg: document.getElementById('slopes-error-msg'),
    slopesResultPanel: document.getElementById('slopes-result-panel'),
    slopesStateBadge: document.getElementById('slopes-state-badge'),
    slopesDirectionBadge: document.getElementById('slopes-direction-badge'),
    slopesRiseVal: document.getElementById('slopes-rise-val'),
    slopesRunVal: document.getElementById('slopes-run-val'),
    slopesSlopeVal: document.getElementById('slopes-slope-val'),
    slopesRatioVal: document.getElementById('slopes-ratio-val'),
    slopesAngleVal: document.getElementById('slopes-angle-val'),
    slopesFlightVal: document.getElementById('slopes-flight-val'),
    slopesSvgWrap: document.getElementById('slopes-svg-wrap'),
    slopesConsistencyRow: document.getElementById('slopes-consistency-row'),
    slopesConsistencyBody: document.getElementById('slopes-consistency-body'),
    slopesExplanation: document.getElementById('slopes-explanation'),
    slopesTargetsBody: document.getElementById('slopes-targets-body'),
    slopesCopyResultBtn: document.getElementById('slopes-copy-result-btn'),
    slopesCopyScheduleBtn: document.getElementById('slopes-copy-schedule-btn'),
    slopesSendCadBtn: document.getElementById('slopes-send-cad-btn'),
    slopesSendWorkspaceBtn: document.getElementById('slopes-send-workspace-btn'),
    slopesSaveJournalBtn: document.getElementById('slopes-save-journal-btn'),
    slopesSaveProjectBtn: document.getElementById('slopes-save-project-btn'),

    // Mode 17: Export Center Elements
    exportSourceSelect: document.getElementById('export-source-select'),
    exportFormatSelect: document.getElementById('export-format-select'),
    exportFormatInfo: document.getElementById('export-format-info'),
    exportDiagramGroup: document.getElementById('export-diagram-group'),
    exportDiagramSelect: document.getElementById('export-diagram-select'),
    exportDxfScaleGroup: document.getElementById('export-dxf-scale-group'),
    exportDxfScale: document.getElementById('export-dxf-scale'),
    btnRunExport: document.getElementById('btn-run-export'),
    exportErrorMsg: document.getElementById('export-error-msg'),
    exportResultPanel: document.getElementById('export-result-panel'),
    exportStateBadge: document.getElementById('export-state-badge'),
    exportSummaryBadge: document.getElementById('export-summary-badge'),
    exportProvenance: document.getElementById('export-provenance'),
    exportPreviewBox: document.getElementById('export-preview-box'),
    btnExportDownload: document.getElementById('btn-export-download'),
    btnExportCopy: document.getElementById('btn-export-copy'),
    btnExportPrint: document.getElementById('btn-export-print'),

    // Mode 18: Project Workspace Elements
    projectsNameInput: document.getElementById('projects-name-input'),
    projectsDescInput: document.getElementById('projects-desc-input'),
    projectsCurrentInfo: document.getElementById('projects-current-info'),
    btnProjectNew: document.getElementById('btn-project-new'),
    btnProjectSave: document.getElementById('btn-project-save'),
    btnProjectRename: document.getElementById('btn-project-rename'),
    btnProjectDuplicate: document.getElementById('btn-project-duplicate'),
    btnProjectDelete: document.getElementById('btn-project-delete'),
    btnProjectExportJson: document.getElementById('btn-project-export-json'),
    projectsErrorMsg: document.getElementById('projects-error-msg'),
    projectsImportBox: document.getElementById('projects-import-box'),
    btnProjectImport: document.getElementById('btn-project-import'),
    projectsResultPanel: document.getElementById('projects-result-panel'),
    projectsStateBadge: document.getElementById('projects-state-badge'),
    projectsCountBadge: document.getElementById('projects-count-badge'),
    projectsLibraryList: document.getElementById('projects-library-list'),
    projectsSnapshotLabel: document.getElementById('projects-snapshot-label'),
    btnProjectSnapshot: document.getElementById('btn-project-snapshot'),
    projectsSnapshotsList: document.getElementById('projects-snapshots-list'),

    // Mode 19: Plan Canvas Elements
    planToolSelect: document.getElementById('plan-tool-select'),
    planFurnitureGroup: document.getElementById('plan-furniture-group'),
    planFurnitureSelect: document.getElementById('plan-furniture-select'),
    planGridSelect: document.getElementById('plan-grid-select'),
    btnPlanUndo: document.getElementById('btn-plan-undo'),
    btnPlanRedo: document.getElementById('btn-plan-redo'),
    btnPlanDelete: document.getElementById('btn-plan-delete'),
    btnPlanClear: document.getElementById('btn-plan-clear'),
    planErrorMsg: document.getElementById('plan-error-msg'),
    planEntityList: document.getElementById('plan-entity-list'),
    planResultPanel: document.getElementById('plan-result-panel'),
    planStateBadge: document.getElementById('plan-state-badge'),
    planStatusBadge: document.getElementById('plan-status-badge'),
    planSvg: document.getElementById('plan-svg'),
    planSvgWrap: document.getElementById('plan-svg-wrap'),
    btnPlanSave: document.getElementById('btn-plan-save'),
    btnPlanExportSvg: document.getElementById('btn-plan-export-svg'),
    btnPlanExportDxf: document.getElementById('btn-plan-export-dxf'),

    // Mode 20: AI Studio Elements
    aiJobSelect: document.getElementById('ai-job-select'),
    aiImageGroup: document.getElementById('ai-image-group'),
    aiImageInput: document.getElementById('ai-image-input'),
    aiQuestionInput: document.getElementById('ai-question-input'),
    aiIncludeContextToggle: document.getElementById('ai-include-context-toggle'),
    aiRunBtn: document.getElementById('btn-ai-run'),
    aiOpenSettingsBtn: document.getElementById('btn-ai-open-settings'),
    aiErrorMsg: document.getElementById('ai-error-msg'),
    aiSaveNoteBtn: document.getElementById('btn-ai-save-note'),
    aiCopyBtn: document.getElementById('btn-ai-copy'),
    aiResultPanel: document.getElementById('ai-result-panel'),
    aiModelBadge: document.getElementById('ai-model-badge'),
    aiResponseEmpty: document.getElementById('ai-response-empty'),
    aiResponseBody: document.getElementById('ai-response-body'),
    aiConsistencyStrip: document.getElementById('ai-consistency-strip'),
    aiContextSummary: document.getElementById('ai-context-summary'),

    // Mode 21: AI Control Center Elements
    aiProvidersList: document.getElementById('ai-providers-list'),
    aiSettingsErrorMsg: document.getElementById('ai-settings-error-msg'),
    aiJobsList: document.getElementById('ai-jobs-list'),
    aiJobsReadyBadge: document.getElementById('ai-jobs-ready-badge'),
    aiCatalogCountBadge: document.getElementById('ai-catalog-count-badge'),
    aiCatalogSearch: document.getElementById('ai-catalog-search'),
    aiCatalogProviderFilter: document.getElementById('ai-catalog-provider-filter'),
    aiRefreshModelsBtn: document.getElementById('btn-ai-refresh-models'),
    aiFilterVision: document.getElementById('ai-filter-vision'),
    aiFilterStructured: document.getElementById('ai-filter-structured'),
    aiFilterImageGen: document.getElementById('ai-filter-imagegen'),
    aiCatalogList: document.getElementById('ai-catalog-list'),
    aiManualProvider: document.getElementById('ai-manual-provider'),
    aiManualModelId: document.getElementById('ai-manual-model-id'),
    aiManualModelName: document.getElementById('ai-manual-model-name'),
    aiManualCapText: document.getElementById('ai-manual-cap-text'),
    aiManualCapReasoning: document.getElementById('ai-manual-cap-reasoning'),
    aiManualCapStructured: document.getElementById('ai-manual-cap-structured'),
    aiManualCapVision: document.getElementById('ai-manual-cap-vision'),
    aiManualCapImagegen: document.getElementById('ai-manual-cap-imagegen'),
    aiAddManualModelBtn: document.getElementById('btn-ai-add-manual-model'),
    aiActivityList: document.getElementById('ai-activity-list'),
    aiClearActivityBtn: document.getElementById('btn-ai-clear-activity'),

    // Mode 22: Importer Elements
    importsFormatSelect: document.getElementById('imports-format-select'),
    importsFileInput: document.getElementById('imports-file-input'),
    importsTextBox: document.getElementById('imports-text-box'),
    importsRunBtn: document.getElementById('btn-run-imports'),
    importsSendPlanBtn: document.getElementById('btn-imports-send-plan'),
    importsErrorMsg: document.getElementById('imports-error-msg'),
    importsReportBox: document.getElementById('imports-report-box'),
    importsEntityList: document.getElementById('imports-entity-list'),

    // Mode 23: Survey Notebook Elements
    surveyLabel: document.getElementById('survey-label'),
    surveyValue: document.getElementById('survey-value'),
    surveySource: document.getElementById('survey-source'),
    surveyLocation: document.getElementById('survey-location'),
    surveyNote: document.getElementById('survey-note'),
    surveyRunBtn: document.getElementById('btn-run-survey'),
    surveyErrorMsg: document.getElementById('survey-error-msg'),
    surveySummary: document.getElementById('survey-summary'),
    surveyMeasurementList: document.getElementById('survey-measurement-list'),
    surveyRoomName: document.getElementById('survey-room-name'),
    surveyProposalBox: document.getElementById('survey-proposal-box'),
    surveyCalAx: document.getElementById('survey-cal-ax'),
    surveyCalAy: document.getElementById('survey-cal-ay'),
    surveyCalBx: document.getElementById('survey-cal-bx'),
    surveyCalBy: document.getElementById('survey-cal-by'),
    surveyCalDistance: document.getElementById('survey-cal-distance'),
    surveyCalibrateBtn: document.getElementById('btn-survey-calibrate'),
    surveyCalStatus: document.getElementById('survey-cal-status'),
    surveyMeasP1x: document.getElementById('survey-meas-p1x'),
    surveyMeasP1y: document.getElementById('survey-meas-p1y'),
    surveyMeasP2x: document.getElementById('survey-meas-p2x'),
    surveyMeasP2y: document.getElementById('survey-meas-p2y'),
    surveyMeasP3x: document.getElementById('survey-meas-p3x'),
    surveyMeasP3y: document.getElementById('survey-meas-p3y'),
    surveyMeasP4x: document.getElementById('survey-meas-p4x'),
    surveyMeasP4y: document.getElementById('survey-meas-p4y'),
    surveyMeasureDistanceBtn: document.getElementById('btn-survey-measure-distance'),
    surveyMeasureChainBtn: document.getElementById('btn-survey-measure-chain'),
    surveyMeasureAreaBtn: document.getElementById('btn-survey-measure-area')
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
  // 2b. Navigation Catalog & Sidebar (single source of truth for the shell)
  // ---------------------------------------------------------------------------
  // Every implemented screen appears exactly once here. The sidebar renders
  // from this catalog, the sidebar search filters it, and the command
  // palette derives its Navigation commands from it — no duplicate lists.
  const NAV_CATALOG = [
    { id: 'home', section: 'Home', label: 'Home', desc: 'Project snapshot, quick tools, orientation', icon: '⌂', keywords: ['home', 'start', 'dashboard', 'overview'] },
    { id: 'converter', section: 'Scale', label: 'Scale Converter', desc: 'Paper ⇄ real world at any scale', icon: '📐', shortcut: '1', keywords: ['scale', 'convert', 'drawing', 'real', 'paper', 'ratio'] },
    { id: 'rescale', section: 'Scale', label: 'Rescaler', desc: 'Move a measurement from one scale to another', icon: '🔄', shortcut: '2', keywords: ['rescale', 'sheet', 'transfer', 'a to b'] },
    { id: 'detector', section: 'Scale', label: 'Scale Finder', desc: 'Detect an unknown scale from paper + real sizes', icon: '🔍', shortcut: '3', keywords: ['detect', 'find', 'unknown', 'ratio'] },
    { id: 'area_volume', section: 'Scale', label: 'Area & Volume', desc: 'Scale areas (S²) and volumes (S³)', icon: '📦', shortcut: '4', keywords: ['area', 'volume', 'square', 'cubic', 'm2', 'm3'] },
    { id: 'workspace', section: 'Dimensions', label: 'Dimension Workspace', desc: 'Measurement schedule with live totals', icon: '📋', shortcut: '7', keywords: ['schedule', 'scratchpad', 'totals', 'segments', 'batch'] },
    { id: 'expression', section: 'Dimensions', label: 'Dimension Expression', desc: 'Mixed-unit architectural math', icon: '🧮', shortcut: '8', keywords: ['expression', 'math', 'arithmetic', 'sum', 'evaluate'] },
    { id: 'multiscale', section: 'Dimensions', label: 'Multi-Scale', desc: 'One dimension compared across many scales', icon: '📊', shortcut: '9', keywords: ['multi', 'compare', 'scales', 'paper fit'] },
    { id: 'chains', section: 'Dimensions', label: 'Dimension Chains', desc: 'Running sequences with cumulative coordinates', icon: '🔗', shortcut: '0', keywords: ['chain', 'sequence', 'cumulative', 'offsets', 'string'] },
    { id: 'cad_clipboard', section: 'CAD', label: 'CAD Clipboard', desc: 'CAD-ready copy formats for major tools', icon: '📌', shortcut: 'C', keywords: ['cad', 'clipboard', 'autocad', 'rhino', 'revit', 'sketchup'] },
    { id: 'batch_cad', section: 'CAD', label: 'Batch CAD', desc: 'Bulk conversion for schedules and lists', icon: '⚡', shortcut: 'B', keywords: ['batch', 'bulk', 'table', 'schedule'] },
    { id: 'cad_handoff', section: 'CAD', label: 'CAD Handoff', desc: 'Target-specific payloads for Rhino / AutoCAD / SketchUp', icon: '🚀', keywords: ['handoff', 'send', 'rhino', 'autocad', 'sketchup', 'paste'] },
    { id: 'stairs', section: 'Architecture', label: 'Stair Calculator', desc: 'Risers, goings, Blondel proportion, angle', icon: '🪜', keywords: ['stair', 'riser', 'tread', 'going', 'blondel', 'flight'] },
    { id: 'ramps', section: 'Architecture', label: 'Ramp Calculator', desc: 'Accessible ramp geometry and targets', icon: '♿', keywords: ['ramp', 'accessibility', '1:12', 'slope'] },
    { id: 'slopes', section: 'Architecture', label: 'Slope Analyzer', desc: 'General rise/run grading analysis', icon: '📉', keywords: ['slope', 'grade', 'gradient', 'drainage', 'terrain'] },
    { id: 'furniture', section: 'Space', label: 'Furniture & Clearances', desc: '179 scaled standards with footprints', icon: '🛋️', shortcut: '5', keywords: ['furniture', 'clearance', 'ada', 'sofa', 'bed', 'desk', 'door'] },
    { id: 'reference', section: 'Space', label: 'Reference Chart', desc: 'Printable scale ruler, benchmarks, tables', icon: '📚', shortcut: '6', keywords: ['reference', 'ruler', 'benchmark', 'print', 'neufert'] },
    { id: 'projects', section: 'Project', label: 'Projects', desc: 'Library, save, duplicates, snapshots', icon: '🗂', keywords: ['project', 'library', 'snapshot', 'save', 'open', 'duplicate'] },
    { id: 'plan', section: 'Project', label: 'Plan Canvas', desc: '2D plan editor: rooms, walls, furniture', icon: '▭', keywords: ['plan', 'canvas', 'room', 'wall', 'draw', 'layout'] },
    { id: 'survey', section: 'Project', label: 'Survey Notebook', desc: 'Field measurements, provenance, calibration', icon: '📏', keywords: ['survey', 'measurement', 'calibration', 'provenance', 'site'] },
    { id: 'imports', section: 'Project', label: 'Importer', desc: 'CSV/TSV, DXF, SVG ingestion with review', icon: '📥', keywords: ['import', 'csv', 'tsv', 'dxf', 'svg', 'ingest'] },
    { id: 'export', section: 'Project', label: 'Export Center', desc: 'JSON, DXF, SVG, CSV, TSV, TXT with preview', icon: '📤', keywords: ['export', 'download', 'json', 'dxf', 'svg', 'csv', 'backup'] },
    { id: 'ai', section: 'AI', label: 'AI Studio', desc: 'One job, one question, one validated answer', icon: '🤖', keywords: ['ai', 'studio', 'critique', 'tutor', 'jury', 'vision', 'brutal'] },
    { id: 'ai_settings', section: 'AI', label: 'AI Control Center', desc: 'Providers, keys, model catalog, assignments', icon: '⚙️', keywords: ['ai', 'provider', 'api key', 'gemini', 'glm', 'deepseek', 'model', 'catalog', 'job'] }
  ];

  const NAV_SECTIONS = ['Home', 'Scale', 'Dimensions', 'CAD', 'Architecture', 'Space', 'Project', 'AI'];

  /** Renders the sidebar nav from NAV_CATALOG, optionally filtered by query. */
  function renderSidebar(query = '') {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    const q = (query || '').trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    const matches = item => {
      if (!q) return true;
      const hay = [
        item.label, item.desc, item.section, (item.keywords || []).join(' '),
        (item.shortcut ? String(item.shortcut) : '')
      ].join(' ').toLowerCase();
      return tokens.every(t => hay.includes(t));
    };

    let html = '';
    for (const section of NAV_SECTIONS) {
      const items = NAV_CATALOG.filter(i => i.section === section && matches(i));
      if (items.length === 0) continue;
      const collapsed = state.sidebarCollapsedSections.has(section) && !q;
      html += `
        <div class="sidebar-section ${collapsed ? 'collapsed' : ''}" data-section="${section}">
          <button type="button" class="sidebar-section-header" data-section="${section}" aria-expanded="${collapsed ? 'false' : 'true'}">
            <span class="sidebar-section-title">${section}</span>
            <span class="sidebar-section-caret" aria-hidden="true">${collapsed ? '▸' : '▾'}</span>
          </button>
          <div class="sidebar-section-body">
            ${items.map(item => `
              <button type="button" class="sidebar-item ${state.currentMode === item.id ? 'active' : ''}" data-mode="${item.id}"
                title="${item.desc}" aria-label="${item.label} — ${item.desc}">
                <span class="sidebar-item-icon" aria-hidden="true">${item.icon}</span>
                <span class="sidebar-item-text">
                  <span class="sidebar-item-label">${item.label}</span>
                  <span class="sidebar-item-desc">${item.desc}</span>
                </span>
                ${item.shortcut ? `<span class="sidebar-item-key" aria-hidden="true">${item.shortcut}</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (!html) {
      html = '<div class="sidebar-empty">No tools match — try fewer words, or press Ctrl+K for the command palette.</div>';
    }
    nav.innerHTML = html;

    // Wire section collapse + item activation
    nav.querySelectorAll('.sidebar-section-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.dataset.section;
        if (state.sidebarCollapsedSections.has(sec)) state.sidebarCollapsedSections.delete(sec);
        else state.sidebarCollapsedSections.add(sec);
        renderSidebar(query);
      });
    });
    nav.querySelectorAll('.sidebar-item').forEach(btn => {
      btn.addEventListener('click', () => {
        switchMode(btn.dataset.mode);
        closeSidebarDrawer();
      });
    });
  }

  /** Highlights the active sidebar entry + top bar breadcrumb. */
  function syncSidebarActive() {
    document.querySelectorAll('.sidebar-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
    });
    const labelEl = document.getElementById('topbar-current-tool');
    if (labelEl) {
      const item = NAV_CATALOG.find(i => i.id === state.currentMode);
      labelEl.textContent = item ? item.label : 'Home';
    }
  }

  /** Sidebar drawer state for tablet/mobile; desktop uses body class. */
  function openSidebarDrawer() {
    document.body.classList.add('sidebar-open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.add('visible');
    const toggle = document.getElementById('sidebar-toggle-btn');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closeSidebarDrawer() {
    document.body.classList.remove('sidebar-open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  }

  function toggleSidebar() {
    if (window.innerWidth <= 1024) {
      if (document.body.classList.contains('sidebar-open')) closeSidebarDrawer();
      else openSidebarDrawer();
    } else {
      document.body.classList.toggle('sidebar-hidden');
      const toggle = document.getElementById('sidebar-toggle-btn');
      if (toggle) toggle.setAttribute('aria-expanded', document.body.classList.contains('sidebar-hidden') ? 'false' : 'true');
    }
  }

  /** Home screen: honest project snapshot + AI availability. */
  function renderHome() {
    const nameEl = document.getElementById('home-project-name');
    if (!nameEl) return;
    let p = null;
    try { p = projectStore.getProject(); } catch (e) { p = null; }

    const badge = document.getElementById('home-project-badge');
    const descEl = document.getElementById('home-project-desc');
    const statsEl = document.getElementById('home-project-stats');

    if (p && p.metadata) {
      nameEl.textContent = p.metadata.name || 'Untitled Project';
      if (badge) badge.textContent = 'ACTIVE';
      if (descEl) {
        const d = p.site?.description || p.metadata.description || '';
        descEl.textContent = d || 'Add a description in Projects to describe the site and concept.';
      }
      if (statsEl) {
        const rooms = (state.plan.entities || []).filter(e => e.kind === 'room').length;
        const entities = (state.plan.entities || []).length;
        const snapshots = (p.snapshots || []).length;
        const measurements = (p.measurements || []).length;
        const notes = (p.notes || []).length;
        statsEl.innerHTML = [
          { label: 'Rooms', value: rooms },
          { label: 'Plan entities', value: entities },
          { label: 'Measurements', value: measurements },
          { label: 'Decisions', value: (p.decisions || []).length },
          { label: 'Snapshots', value: snapshots },
          { label: 'Journal notes', value: notes }
        ].map(s => `<div class="home-stat"><span class="home-stat-value">${s.value}</span><span class="home-stat-label">${s.label}</span></div>`).join('');
      }
    } else {
      nameEl.textContent = 'No project yet';
      if (badge) badge.textContent = 'EMPTY';
      if (descEl) descEl.textContent = 'Create a project to organize rooms, dimensions, furniture, and layouts.';
      if (statsEl) statsEl.innerHTML = '';
    }

    const aiEl = document.getElementById('home-ai-status');
    if (aiEl) {
      const svc = state.ai;
      if (!svc) {
        aiEl.textContent = 'UNAVAILABLE';
        aiEl.style.color = 'var(--text-muted)';
      } else {
        const ready = svc.router ? svc.router.listJobStatuses().filter(s => s.status === 'READY').length : 0;
        aiEl.textContent = ready > 0 ? `${ready} JOB${ready === 1 ? '' : 'S'} READY` : 'NOT CONFIGURED';
        aiEl.style.color = ready > 0 ? 'var(--color-success)' : 'var(--text-muted)';
      }
    }
  }

  function switchMode(targetMode) {
    if (targetMode === 'home' || !NAV_CATALOG.some(i => i.id === targetMode) && targetMode !== 'furniture') {
      // unknown ids fall back to home so a stale link never dead-ends
      if (!NAV_CATALOG.some(i => i.id === targetMode)) targetMode = 'home';
    }
    state.currentMode = targetMode;

    // Sidebar + breadcrumb sync (mode tabs no longer exist; ids kept for tests)
    syncSidebarActive();
    document.getElementById('app-shell')?.classList.toggle('mode-home', targetMode === 'home');

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

    if (targetMode === 'home') {
      renderHome();
    }

    AudioService.playTick();

    // Trigger calculation refresh for active mode
    if (targetMode === 'converter') views.callController('converter', 'calculateConverter');
    else if (targetMode === 'rescale') views.callController('rescale', 'calculateRescaler');
    else if (targetMode === 'detector') views.callController('detector', 'calculateDetector');
    else if (targetMode === 'area_volume') views.callController('area_volume', 'calculateAreaVolume');
    else if (targetMode === 'furniture') renderFurnitureGrid();
    else if (targetMode === 'reference') renderReferenceChart();
    else if (targetMode === 'workspace') renderWorkspace();
    else if (targetMode === 'expression') {
      views.callController('expression', 'calculateExpression');
      views.callController('expression', 'renderRecentExpressions');
    }
    else if (targetMode === 'multiscale') {
      views.callController('multiscale', 'calculateMultiScale');
    }
    else if (targetMode === 'chains') {
      views.callController('chains', 'calculateAndRenderChain');
    }
    else if (targetMode === 'cad_clipboard') {
      views.callController('cad_clipboard', 'renderCadClipboard');
    }
    else if (targetMode === 'batch_cad') {
      views.callController('batch_cad', 'parseAndConvertBatch');
    }
    else if (targetMode === 'cad_handoff') {
      views.callController('cad_handoff', 'renderCadHandoff');
    }
    else if (targetMode === 'stairs') {
      views.callController('stairs', 'calculate');
    }
    else if (targetMode === 'ramps') {
      views.callController('ramps', 'calculate');
    }
    else if (targetMode === 'slopes') {
      views.callController('slopes', 'calculate');
    }
    else if (targetMode === 'export') {
      views.callController('export', 'build');
    }
    else if (targetMode === 'projects') {
      views.callController('projects', 'renderAll');
    }
    else if (targetMode === 'plan') {
      views.callController('plan', 'render');
    }
    else if (targetMode === 'ai') {
      views.callController('ai', 'populateJobs');
    }
    else if (targetMode === 'ai_settings') {
      views.callController('ai_settings', 'renderAll');
    }
    else if (targetMode === 'imports') {
      views.callController('imports', 'runImport');
    }
    else if (targetMode === 'survey') {
      views.callController('survey', 'renderMeasurements');
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

    // Area & Volume unit selects
    if (dom.areavolInputUnit) {
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
        views.callController('converter', 'calculateConverter');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Mode 5: Furniture Catalog (grid, filters, custom scaler)
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
      const activeFilterName = state.furnitureSearchQuery ? `"${escapeHtml(state.furnitureSearchQuery)}"` : state.furnitureActiveCategory;
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
  // 13b. Mode 7: Dimension Workspace Controller (v1.1 Polish)
  // ---------------------------------------------------------------------------
  // NOTE: workspace is still an inline controller in app.js but is registered
  // as a view so other views can reach saveWorkspace/renderWorkspace through
  // the shared context (see multiscale view's add-to-workspace action).
  const workspaceView = {
    id: 'workspace',
    mount() {},
    getController() {
      return { saveWorkspace, renderWorkspace };
    }
  };

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
                views.callController('multiscale', 'calculateMultiScale', true);
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
                views.callController('expression', 'calculateExpression', true);
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
                  views.callController('chains', 'addSegmentsToChain', chainQuery);
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
      case 'nav-cad-handoff':
        switchMode('cad_handoff');
        break;
      case 'nav-stairs':
        switchMode('stairs');
        break;
      case 'nav-ramps':
        switchMode('ramps');
        break;
      case 'nav-slopes':
        switchMode('slopes');
        break;
      case 'nav-export':
        switchMode('export');
        break;
      case 'nav-projects':
        switchMode('projects');
        break;
      case 'nav-plan':
        switchMode('plan');
        break;
      case 'nav-ai-studio':
        switchMode('ai');
        break;
      case 'nav-ai-control-center':
        switchMode('ai_settings');
        break;
      case 'nav-imports':
        switchMode('imports');
        break;
      case 'nav-survey':
        switchMode('survey');
        break;
      case 'ai-analyze-project':
        switchMode('ai');
        setTimeout(() => {
          if (dom.aiJobSelect) dom.aiJobSelect.value = 'projectAnalysis';
          views.callController('ai', 'refreshImageGroup');
        }, 0);
        break;
      case 'ai-critique-design':
        switchMode('ai');
        setTimeout(() => {
          if (dom.aiJobSelect) dom.aiJobSelect.value = 'studioCritic';
          views.callController('ai', 'refreshImageGroup');
        }, 0);
        break;
      case 'ai-test-provider':
        switchMode('ai_settings');
        break;
      case 'nav-cad-clipboard':
        switchMode('cad_clipboard');
        break;
      case 'nav-batch-cad':
        switchMode('batch_cad');
        break;
      case 'nav-history':
        views.callController('history', 'toggleHistoryDrawer');
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
        views.callController('history', 'renderHistoryList');
        showToast('Calculation history cleared');
        break;
      }
      case 'util-quick-dim': {
        views.callController('quick_dimension', 'toggleQuickDimension', true);
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

  // NOTE: Mode 8 (Expression) and Mode 9 (Multi-Scale) controllers now live in
  // src/ui/views/expression-multiscale.js and are called via views.callController.
  // The Quick Dimension Strip lives in src/ui/views/quick-dimension.js.

  // ---------------------------------------------------------------------------
  // 14. Event Listener Wire-up
  // ---------------------------------------------------------------------------
  function attachEventListeners() {
    // --- Application shell: sidebar toggle, drawer, search, home buttons ---
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebarDrawer);
    const topbarHome = document.getElementById('topbar-home-btn');
    if (topbarHome) topbarHome.addEventListener('click', () => switchMode('home'));

    const sidebarSearch = document.getElementById('sidebar-search');
    const sidebarSearchClear = document.getElementById('sidebar-search-clear');
    if (sidebarSearch) {
      sidebarSearch.addEventListener('input', () => {
        renderSidebar(sidebarSearch.value);
        if (sidebarSearchClear) sidebarSearchClear.hidden = !sidebarSearch.value;
      });
      // Esc inside the search clears it first, then blurs (global Esc handler closes drawers)
      sidebarSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarSearch.value) {
          e.stopPropagation();
          sidebarSearch.value = '';
          renderSidebar('');
          if (sidebarSearchClear) sidebarSearchClear.hidden = true;
        }
      });
    }
    if (sidebarSearchClear) {
      sidebarSearchClear.addEventListener('click', () => {
        sidebarSearch.value = '';
        renderSidebar('');
        sidebarSearchClear.hidden = true;
        sidebarSearch?.focus();
      });
    }

    // Home screen quick links
    document.querySelectorAll('.home-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

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
    if (dom.historyToggleBtn) dom.historyToggleBtn.addEventListener('click', () => views.callController('history', 'toggleHistoryDrawer'));
    if (dom.closeHistoryBtn) dom.closeHistoryBtn.addEventListener('click', () => views.callController('history', 'toggleHistoryDrawer'));
    if (dom.historyOverlay) dom.historyOverlay.addEventListener('click', () => views.callController('history', 'toggleHistoryDrawer'));

    if (dom.clearHistoryBtn) {
      dom.clearHistoryBtn.addEventListener('click', () => {
        HistoryService.clear();
        views.callController('history', 'renderHistoryList');
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
          views.callController('converter', 'calculateConverter');
        }
      });
    }

    // Converter Inputs & Run Action
    if (dom.converterInputVal) {
      dom.converterInputVal.addEventListener('input', () => {
        views.callController('converter', 'calculateConverter');
      });
      dom.converterInputVal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          views.callController('converter', 'calculateConverter');
          if (dom.btnSaveHistory && dom.converterResultVal?.textContent !== '---') {
            dom.btnSaveHistory.click();
          }
        }
      });
    }

    if (dom.converterInputUnit) dom.converterInputUnit.addEventListener('change', () => views.callController('converter', 'calculateConverter'));
    if (dom.converterOutputUnit) dom.converterOutputUnit.addEventListener('change', () => views.callController('converter', 'calculateConverter'));
    if (dom.swapDirectionBtn) dom.swapDirectionBtn.addEventListener('click', () => views.callController('converter', 'swapDirection'));
    if (dom.btnRunConverter) {
      dom.btnRunConverter.addEventListener('click', () => {
        views.callController('converter', 'calculateConverter');
        views.callController('history', 'logCurrentCalculationToHistory', 'converter');
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
        views.callController('history', 'logCurrentCalculationToHistory', 'converter');
      });
    }

    // Rescaler Listeners
    [dom.rescaleOrigRatio, dom.rescaleOrigVal, dom.rescaleOrigUnit, dom.rescaleTargetRatio, dom.rescaleTargetUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', () => views.callController('rescale', 'calculateRescaler'));
        el.addEventListener('change', () => views.callController('rescale', 'calculateRescaler'));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            views.callController('rescale', 'calculateRescaler');
            views.callController('history', 'logCurrentCalculationToHistory', 'rescale');
          }
        });
      }
    });
    if (dom.btnRunRescale) {
      dom.btnRunRescale.addEventListener('click', () => {
        views.callController('rescale', 'calculateRescaler');
        views.callController('history', 'logCurrentCalculationToHistory', 'rescale');
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
        el.addEventListener('input', () => views.callController('detector', 'calculateDetector'));
        el.addEventListener('change', () => views.callController('detector', 'calculateDetector'));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            views.callController('detector', 'calculateDetector');
            views.callController('history', 'logCurrentCalculationToHistory', 'detector');
          }
        });
      }
    });
    if (dom.btnRunDetector) {
      dom.btnRunDetector.addEventListener('click', () => {
        views.callController('detector', 'calculateDetector');
        views.callController('history', 'logCurrentCalculationToHistory', 'detector');
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
        views.callController('area_volume', 'updateAreaVolumeUnitSelects');
        views.callController('area_volume', 'calculateAreaVolume');
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
        views.callController('area_volume', 'calculateAreaVolume');
        AudioService.playTick();
      });
    });

    [dom.areavolRatioInput, dom.areavolInputVal, dom.areavolInputUnit, dom.areavolOutputUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', () => views.callController('area_volume', 'calculateAreaVolume'));
        el.addEventListener('change', () => views.callController('area_volume', 'calculateAreaVolume'));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            views.callController('area_volume', 'calculateAreaVolume');
            views.callController('history', 'logCurrentCalculationToHistory', 'area_volume');
          }
        });
      }
    });
    if (dom.btnRunAreavol) {
      dom.btnRunAreavol.addEventListener('click', () => {
        views.callController('area_volume', 'calculateAreaVolume');
        views.callController('history', 'logCurrentCalculationToHistory', 'area_volume');
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
        views.callController('history', 'logCurrentCalculationToHistory', 'furniture');
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
        views.callController('history', 'logCurrentCalculationToHistory', 'workspace');
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
        views.callController('expression', 'calculateExpression', false);
      });

      dom.expressionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            dom.expressionAddWorkspaceBtn?.click();
          } else {
            views.callController('expression', 'calculateExpression', true);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.expressionInput.value = '';
          views.callController('expression', 'calculateExpression', false);
          AudioService.playTick();
        }
      });
    }

    if (dom.expressionClearInputBtn) {
      dom.expressionClearInputBtn.addEventListener('click', () => {
        if (dom.expressionInput) {
          dom.expressionInput.value = '';
          dom.expressionInput.focus();
          views.callController('expression', 'calculateExpression', false);
          AudioService.playTick();
        }
      });
    }

    if (dom.expressionDefaultUnit) {
      dom.expressionDefaultUnit.addEventListener('change', () => {
        views.callController('expression', 'calculateExpression', true);
        AudioService.playTick();
      });
    }

    if (dom.expressionScaleSelect) {
      dom.expressionScaleSelect.addEventListener('change', (e) => {
        const isCustom = e.target.value === 'custom';
        if (dom.expressionCustomScaleGroup) {
          dom.expressionCustomScaleGroup.style.display = isCustom ? 'block' : 'none';
        }
        views.callController('expression', 'calculateExpression', true);
        AudioService.playTick();
      });
    }

    if (dom.expressionCustomScaleInput) {
      dom.expressionCustomScaleInput.addEventListener('input', () => {
        views.callController('expression', 'calculateExpression', false);
      });
    }

    if (dom.btnRunExpression) {
      dom.btnRunExpression.addEventListener('click', () => {
        views.callController('expression', 'calculateExpression', true);
      });
    }

    // Quick Template Chips
    document.querySelectorAll('.expr-template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const expr = chip.dataset.expr;
        if (dom.expressionInput && expr) {
          dom.expressionInput.value = expr;
          views.callController('expression', 'calculateExpression', true);
          AudioService.playTick();
        }
      });
    });

    if (dom.expressionCopyBtn) {
      dom.expressionCopyBtn.addEventListener('click', () => {
        views.callController('expression', 'calculateExpression', true);
        if (state.lastValidExpression && state.lastValidExpression.isValid) {
          copyToClipboard(state.lastValidExpression.formatted, 'Evaluated Expression Result');
        } else {
          showToast('No valid result to copy', 'warning');
        }
      });
    }

    if (dom.expressionCopyRawBtn) {
      dom.expressionCopyRawBtn.addEventListener('click', () => {
        views.callController('expression', 'calculateExpression', true);
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
        views.callController('expression', 'calculateExpression', true);
        if (state.lastValidExpression && state.lastValidExpression.isValid && state.lastValidExpression.drawingFormatted) {
          copyToClipboard(state.lastValidExpression.drawingFormatted, `Scaled Drawing (${state.lastValidExpression.drawingFormatted})`);
        } else {
          showToast('No scaled drawing dimension available', 'warning');
        }
      });
    }

    if (dom.expressionAddWorkspaceBtn) {
      dom.expressionAddWorkspaceBtn.addEventListener('click', () => {
        views.callController('expression', 'calculateExpression', true);
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
        views.callController('expression', 'calculateExpression', true);
        views.callController('history', 'logCurrentCalculationToHistory', 'expression');
      });
    }

    if (dom.expressionClearRecentBtn) {
      dom.expressionClearRecentBtn.addEventListener('click', () => {
        state.recentExpressions = [];
        views.callController('expression', 'renderRecentExpressions');
        AudioService.playTick();
        showToast('Recent expressions cleared');
      });
    }

    // Mode 8 -> Mode 9: Compare Across Scales Action
    if (dom.expressionCompareBtn) {
      dom.expressionCompareBtn.addEventListener('click', () => {
        views.callController('expression', 'calculateExpression', true);
        const exprToCompare = state.lastValidExpression?.formatted || dom.expressionInput?.value?.trim();
        if (exprToCompare) {
          switchMode('multiscale');
          if (dom.multiscaleInput) {
            dom.multiscaleInput.value = exprToCompare;
            views.callController('multiscale', 'calculateMultiScale', true);
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
        views.callController('multiscale', 'calculateMultiScale', false);
      });

      dom.multiscaleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          views.callController('multiscale', 'calculateMultiScale', true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.multiscaleInput.value = '';
          views.callController('multiscale', 'calculateMultiScale', false);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleClearInputBtn) {
      dom.multiscaleClearInputBtn.addEventListener('click', () => {
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = '';
          dom.multiscaleInput.focus();
          views.callController('multiscale', 'calculateMultiScale', false);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleDefaultUnit) {
      dom.multiscaleDefaultUnit.addEventListener('change', () => {
        views.callController('multiscale', 'calculateMultiScale', true);
        AudioService.playTick();
      });
    }

    if (dom.multiscaleDisplayUnit) {
      dom.multiscaleDisplayUnit.addEventListener('change', () => {
        views.callController('multiscale', 'calculateMultiScale', true);
        AudioService.playTick();
      });
    }

    // Preset Group Pills
    document.querySelectorAll('.multiscale-group-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.multiscale-group-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.multiscaleGroup = pill.dataset.group;
        views.callController('multiscale', 'calculateMultiScale', true);
        AudioService.playTick();
      });
    });

    if (dom.multiscaleAddScaleBtn) {
      dom.multiscaleAddScaleBtn.addEventListener('click', () => {
        const ratio = parseFloat(dom.multiscaleCustomScaleInput?.value);
        views.callController('multiscale', 'addCustomScale', ratio);
        if (dom.multiscaleCustomScaleInput) dom.multiscaleCustomScaleInput.value = '';
      });
    }

    if (dom.multiscaleSortSelect) {
      dom.multiscaleSortSelect.addEventListener('change', () => {
        views.callController('multiscale', 'calculateMultiScale', true);
        AudioService.playTick();
      });
    }

    if (dom.multiscalePaperSelect) {
      dom.multiscalePaperSelect.addEventListener('change', () => {
        views.callController('multiscale', 'calculateMultiScale', true);
        AudioService.playTick();
      });
    }

    if (dom.multiscaleFitMin) {
      dom.multiscaleFitMin.addEventListener('input', () => {
        views.callController('multiscale', 'calculateMultiScale', false);
      });
    }

    if (dom.multiscaleFitMax) {
      dom.multiscaleFitMax.addEventListener('input', () => {
        views.callController('multiscale', 'calculateMultiScale', false);
      });
    }

    // Example Chips
    document.querySelectorAll('.multiscale-example-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const dim = chip.dataset.dim;
        if (dom.multiscaleInput && dim) {
          dom.multiscaleInput.value = dim;
          views.callController('multiscale', 'calculateMultiScale', true);
          AudioService.playTick();
        }
      });
    });

    if (dom.btnRunMultiscale) {
      dom.btnRunMultiscale.addEventListener('click', () => {
        views.callController('multiscale', 'calculateMultiScale', true);
      });
    }

    if (dom.multiscaleLoadSampleBtn) {
      dom.multiscaleLoadSampleBtn.addEventListener('click', () => {
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = '2400 mm';
          views.callController('multiscale', 'calculateMultiScale', true);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleCopyTableBtn) {
      dom.multiscaleCopyTableBtn.addEventListener('click', () => {
        views.callController('multiscale', 'calculateMultiScale', true);
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
        views.callController('multiscale', 'calculateMultiScale', true);
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
        views.callController('multiscale', 'calculateMultiScale', true);
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
        views.callController('multiscale', 'calculateMultiScale', true);
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
        views.callController('chains', 'saveChain');
      });
    }

    if (dom.chainsScaleSelect) {
      dom.chainsScaleSelect.addEventListener('change', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
        AudioService.playTick();
      });
    }

    if (dom.chainsUnitSelect) {
      dom.chainsUnitSelect.addEventListener('change', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
        AudioService.playTick();
      });
    }

    if (dom.chainsStartOffsetInput) {
      dom.chainsStartOffsetInput.addEventListener('input', () => {
        views.callController('chains', 'calculateAndRenderChain', false);
      });
    }

    if (dom.chainsEndOffsetInput) {
      dom.chainsEndOffsetInput.addEventListener('input', () => {
        views.callController('chains', 'calculateAndRenderChain', false);
      });
    }

    if (dom.chainsQuickInput) {
      dom.chainsQuickInput.addEventListener('input', () => {
        views.callController('chains', 'calculateAndRenderChain', false);
      });

      dom.chainsQuickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = dom.chainsQuickInput.value.trim();
          if (val) {
            views.callController('chains', 'addSegmentsToChain', val);
            dom.chainsQuickInput.value = '';
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.chainsQuickInput.value = '';
          views.callController('chains', 'calculateAndRenderChain', false);
          AudioService.playTick();
        }
      });
    }

    if (dom.chainsAddBtn) {
      dom.chainsAddBtn.addEventListener('click', () => {
        const val = dom.chainsQuickInput?.value?.trim();
        if (val) {
          views.callController('chains', 'addSegmentsToChain', val);
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
          views.callController('chains', 'calculateAndRenderChain', false);
          AudioService.playTick();
        }
      });
    }

    if (dom.chainsClearAllBtn) {
      dom.chainsClearAllBtn.addEventListener('click', () => {
        state.activeChain.segments = [];
        state.chainSelectedSegmentId = null;
        views.callController('chains', 'calculateAndRenderChain', true);
        AudioService.playTick();
        showToast('Cleared all chain segments');
      });
    }

    if (dom.chainsZoomFitBtn) {
      dom.chainsZoomFitBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', false);
        AudioService.playTick();
        showToast('Viewport reset to fit chain');
      });
    }

    // Template Chips
    document.querySelectorAll('.chain-template-chip[data-template]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tplKey = chip.dataset.template;
        views.callController('chains', 'loadChainTemplate', tplKey);
      });
    });

    if (dom.btnRunChains) {
      dom.btnRunChains.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
      });
    }

    // Multi-Scale Comparison Handoff
    if (dom.chainsCompareMultiscaleBtn) {
      dom.chainsCompareMultiscaleBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
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
          views.callController('multiscale', 'calculateMultiScale', true);
        }
        AudioService.playTick();
        showToast(`Loaded ${dimToCompare} into Multi-Scale Comparison`);
      });
    }

    // Send to Dimension Workspace Handoff
    if (dom.chainsSendWorkspaceBtn) {
      dom.chainsSendWorkspaceBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
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
        views.callController('chains', 'calculateAndRenderChain', true);
        if (state.lastValidChain && state.lastValidChain.isValid) {
          views.callController('history', 'logCurrentCalculationToHistory', 'chains');
          AudioService.playTick();
        } else {
          showToast('No valid chain calculation to log', 'warning');
        }
      });
    }

    // Multi-Stream Copy Buttons
    if (dom.chainsCopyTableBtn) {
      dom.chainsCopyTableBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'table');
          copyToClipboard(out, 'Dimension Chain Table');
        }
      });
    }

    if (dom.chainsCopyCumBtn) {
      dom.chainsCopyCumBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'cumulative');
          copyToClipboard(out, 'Cumulative Running Coordinates');
        }
      });
    }

    if (dom.chainsCopySegsBtn) {
      dom.chainsCopySegsBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'segments');
          copyToClipboard(out, 'Segment Lengths');
        }
      });
    }

    if (dom.chainsCopyDrawBtn) {
      dom.chainsCopyDrawBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'drawing');
          copyToClipboard(out, 'Scaled Drawing Dimensions');
        }
      });
    }

    if (dom.chainsExportTsvBtn) {
      dom.chainsExportTsvBtn.addEventListener('click', () => {
        views.callController('chains', 'calculateAndRenderChain', true);
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
          views.callController('cad_clipboard', 'applyCadPreset', chip.dataset.preset);
        });
      });
    }

    if (dom.cadSourcePills) {
      dom.cadSourcePills.querySelectorAll('.cad-source-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          state.cadClipboard.source = pill.dataset.source;
          views.callController('cad_clipboard', 'renderCadClipboard', true);
          AudioService.playTick();
        });
      });
    }

    if (dom.cadManualInput) {
      dom.cadManualInput.addEventListener('input', (e) => {
        state.cadClipboard.manualInput = e.target.value;
        views.callController('cad_clipboard', 'renderCadClipboard', false);
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
          views.callController('cad_clipboard', 'renderCadClipboard', true);
          AudioService.playTick();
        });
      }
    });

    if (dom.btnRunCadClipboard) {
      dom.btnRunCadClipboard.addEventListener('click', () => {
        views.callController('cad_clipboard', 'renderCadClipboard', true);
      });
    }

    if (dom.btnCadCopyMain) {
      dom.btnCadCopyMain.addEventListener('click', () => {
        views.callController('cad_clipboard', 'copyCadClipboardData');
      });
    }

    if (dom.btnCadCopyRaw) {
      dom.btnCadCopyRaw.addEventListener('click', () => {
        views.callController('cad_clipboard', 'copyCadClipboardData', { suffix: 'none', format: 'generic', delimiter: 'space' });
      });
    }

    if (dom.btnCadCopyUnits) {
      dom.btnCadCopyUnits.addEventListener('click', () => {
        views.callController('cad_clipboard', 'copyCadClipboardData', { suffix: 'symbol' });
      });
    }

    if (dom.btnCadCopyTsv) {
      dom.btnCadCopyTsv.addEventListener('click', () => {
        views.callController('cad_clipboard', 'copyCadClipboardData', { format: 'spreadsheet', delimiter: 'tsv' });
      });
    }

    if (dom.btnCadExportTxt) {
      dom.btnCadExportTxt.addEventListener('click', () => {
        views.callController('cad_clipboard', 'renderCadClipboard', true);
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
        views.callController('cad_clipboard', 'openCadClipboardWithSource', 'workspace');
      });
    }

    if (dom.exprCadHandoffBtn) {
      dom.exprCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_clipboard', 'openCadClipboardWithSource', 'expression');
      });
    }

    if (dom.msCadHandoffBtn) {
      dom.msCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_clipboard', 'openCadClipboardWithSource', 'multiscale');
      });
    }

    if (dom.chainsCadHandoffBtn) {
      dom.chainsCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_clipboard', 'openCadClipboardWithSource', 'chain');
      });
    }

    // Mode 13: CAD Handoff Listeners
    if (dom.handoffSourceSelect) {
      dom.handoffSourceSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffManualInput) {
      dom.handoffManualInput.addEventListener('input', () => {
        state.cadHandoff.manualInput = dom.handoffManualInput.value;
        views.callController('cad_handoff', 'renderCadHandoff');
      });
      dom.handoffManualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          views.callController('cad_handoff', 'renderCadHandoff', true);
        }
      });
    }
    if (dom.handoffTargetPills) {
      dom.handoffTargetPills.querySelectorAll('.cad-source-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          state.cadHandoff.target = pill.dataset.target;
          views.callController('cad_handoff', 'renderCadHandoff', true);
        });
      });
    }
    if (dom.handoffFormatSelect) {
      dom.handoffFormatSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffChainLayoutSelect) {
      dom.handoffChainLayoutSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffWorkspaceScopeSelect) {
      dom.handoffWorkspaceScopeSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffBatchScopeSelect) {
      dom.handoffBatchScopeSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffUnitSelect) {
      dom.handoffUnitSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffPrecisionSelect) {
      dom.handoffPrecisionSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.handoffSuffixSelect) {
      dom.handoffSuffixSelect.addEventListener('change', () => renderCadHandoff(true));
    }
    if (dom.btnRunCadHandoff) {
      dom.btnRunCadHandoff.addEventListener('click', () => renderCadHandoff(true));
      dom.btnRunCadHandoff.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          views.callController('cad_handoff', 'renderCadHandoff', true);
        }
      });
    }
    if (dom.btnHandoffCopy) {
      dom.btnHandoffCopy.addEventListener('click', () => views.callController('cad_handoff', 'copyCadHandoffPayload'));
    }
    if (dom.btnHandoffExportTxt) {
      dom.btnHandoffExportTxt.addEventListener('click', () => {
        const payload = state.cadHandoff.lastPayload;
        if (!payload || payload.empty || !payload.text.trim()) {
          showToast('No CAD payload to export', 'warning');
          return;
        }
        downloadFile(payload.text, `cad-handoff-${state.cadHandoff.target}-${Date.now()}.txt`, 'text/plain');
        showToast('CAD payload exported as .txt');
      });
    }
    if (dom.btnHandoffOpenCadClipboard) {
      dom.btnHandoffOpenCadClipboard.addEventListener('click', () => {
        const sourceMap = { workspace: 'workspace', expression: 'expression', multiscale: 'multiscale', chain: 'chain', batch: 'workspace', quick: 'manual', manual: 'manual' };
        views.callController('cad_clipboard', 'openCadClipboardWithSource', sourceMap[state.cadHandoff.source] || 'workspace');
      });
    }

    // Mode 12: Batch CAD Conversion Listeners
    if (dom.batchQuickChips) {
      dom.batchQuickChips.querySelectorAll('.cad-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          views.callController('batch_cad', 'applyBatchPreset', chip.dataset.preset);
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
          views.callController('batch_cad', 'parseAndConvertBatch', true);
        }
      });
    }

    if (dom.batchModeSelect) {
      dom.batchModeSelect.addEventListener('change', () => {
        state.batchCad.mode = dom.batchModeSelect.value;
        views.callController('batch_cad', 'updateBatchModeVisibility');
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.batchSourceScaleSelect) {
      dom.batchSourceScaleSelect.addEventListener('change', () => {
        state.batchCad.sourceScale = parseInt(dom.batchSourceScaleSelect.value, 10) || 50;
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.batchTargetScaleSelect) {
      dom.batchTargetScaleSelect.addEventListener('change', () => {
        state.batchCad.targetScale = parseInt(dom.batchTargetScaleSelect.value, 10) || 50;
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.batchSourceUnitSelect) {
      dom.batchSourceUnitSelect.addEventListener('change', () => {
        state.batchCad.sourceUnit = dom.batchSourceUnitSelect.value;
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.batchTargetUnitSelect) {
      dom.batchTargetUnitSelect.addEventListener('change', () => {
        state.batchCad.targetUnit = dom.batchTargetUnitSelect.value;
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.batchPrecisionSelect) {
      dom.batchPrecisionSelect.addEventListener('change', () => {
        state.batchCad.precision = parseInt(dom.batchPrecisionSelect.value, 10) || 2;
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.batchDelimiterSelect) {
      dom.batchDelimiterSelect.addEventListener('change', () => {
        state.batchCad.delimiter = dom.batchDelimiterSelect.value;
        views.callController('batch_cad', 'parseAndConvertBatch', false);
      });
    }

    if (dom.btnRunBatchCad) {
      dom.btnRunBatchCad.addEventListener('click', () => {
        views.callController('batch_cad', 'parseAndConvertBatch', true);
      });
    }

    if (dom.batchFilterPills) {
      dom.batchFilterPills.querySelectorAll('.cad-preset-chip').forEach(pill => {
        pill.addEventListener('click', () => {
          state.batchCad.activeFilter = pill.dataset.filter;
          dom.batchFilterPills.querySelectorAll('.cad-preset-chip').forEach(p => {
            p.classList.toggle('active', p === pill);
          });
          views.callController('batch_cad', 'renderBatchResults');
          AudioService.playTick();
        });
      });
    }

    if (dom.batchSelectAllBtn) {
      dom.batchSelectAllBtn.addEventListener('click', () => {
        if (state.batchCad.lastResult && state.batchCad.lastResult.rows) {
          state.batchCad.lastResult.rows.forEach(r => state.batchCad.selectedIds.add(r.id));
          views.callController('batch_cad', 'renderBatchResults');
          AudioService.playTick();
        }
      });
    }

    if (dom.batchClearSelectionBtn) {
      dom.batchClearSelectionBtn.addEventListener('click', () => {
        state.batchCad.selectedIds.clear();
        views.callController('batch_cad', 'renderBatchResults');
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
          views.callController('batch_cad', 'renderBatchResults');
          AudioService.playTick();
        }
      });
    }

    if (dom.batchLoadSampleBtn) {
      dom.batchLoadSampleBtn.addEventListener('click', () => {
        const sample = `Wall North = 4800mm\nSEG Wall South = 3200mm\nWindow 1 = 1800 + 300\nALW Tolerance = 20mm\nDoor Entrance = 900\n2.4m\n7' 6"`;
        if (dom.batchPasteInput) dom.batchPasteInput.value = sample;
        state.batchCad.rawInput = sample;
        views.callController('batch_cad', 'parseAndConvertBatch', true);
      });
    }

    // Export & Action toolbar buttons
    if (dom.batchCopyResultsBtn) {
      dom.batchCopyResultsBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'copyBatchData', 'results_only');
      });
    }

    if (dom.batchCopyRawBtn) {
      dom.batchCopyRawBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'copyBatchData', 'raw_numbers');
      });
    }

    if (dom.batchCopyTsvBtn) {
      dom.batchCopyTsvBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'copyBatchData', 'tsv_schedule');
      });
    }

    if (dom.batchOpenCadBtn) {
      dom.batchOpenCadBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'sendBatchToCadClipboard');
      });
    }

    if (dom.batchSendCadHandoffBtn) {
      dom.batchSendCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_handoff', 'openCadHandoffWithSource', 'batch');
      });
    }

    if (dom.workspaceSendCadHandoffBtn) {
      dom.workspaceSendCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_handoff', 'openCadHandoffWithSource', 'workspace');
      });
    }

    if (dom.expressionSendCadHandoffBtn) {
      dom.expressionSendCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_handoff', 'openCadHandoffWithSource', 'expression');
      });
    }

    if (dom.multiscaleSendCadHandoffBtn) {
      dom.multiscaleSendCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_handoff', 'openCadHandoffWithSource', 'multiscale');
      });
    }

    if (dom.chainsSendCadHandoffBtn) {
      dom.chainsSendCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_handoff', 'openCadHandoffWithSource', 'chain');
      });
    }

    if (dom.quickDimSendCadHandoffBtn) {
      dom.quickDimSendCadHandoffBtn.addEventListener('click', () => {
        views.callController('cad_handoff', 'openCadHandoffWithSource', 'quick');
      });
    }

    if (dom.batchSendWorkspaceBtn) {
      dom.batchSendWorkspaceBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'sendBatchToWorkspace');
      });
    }

    if (dom.batchCompareMultiscaleBtn) {
      dom.batchCompareMultiscaleBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'sendBatchToMultiScale');
      });
    }

    if (dom.batchCreateChainBtn) {
      dom.batchCreateChainBtn.addEventListener('click', () => {
        views.callController('batch_cad', 'sendBatchToChains');
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
        views.callController('history', 'renderHistoryList');
        AudioService.playTick();
        showToast('Saved batch conversion to calculation journal');
      });
    }

    // Quick Dimension Strip Event Listeners
    if (dom.quickDimToggleBtn) {
      dom.quickDimToggleBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'toggleQuickDimension');
      });
    }

    if (dom.quickDimCloseBtn) {
      dom.quickDimCloseBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'toggleQuickDimension', false);
      });
    }

    if (dom.quickDimPinBtn) {
      dom.quickDimPinBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'toggleQuickDimPin');
      });
    }

    if (dom.quickDimModePills) {
      dom.quickDimModePills.querySelectorAll('.quick-mode-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          state.quickDimension.mode = pill.dataset.mode;
          dom.quickDimModePills.querySelectorAll('.quick-mode-pill').forEach(p => {
            p.classList.toggle('active', p === pill);
          });
          views.callController('quick_dimension', 'parseAndEvaluateQuickDimension', false);
          AudioService.playTick();
        });
      });
    }

    if (dom.quickDimScaleChips) {
      dom.quickDimScaleChips.querySelectorAll('.quick-scale-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const s = parseInt(chip.dataset.scale, 10);
          views.callController('quick_dimension', 'applyQuickScale', s);
        });
      });
    }

    if (dom.quickDimCustomScaleInput) {
      dom.quickDimCustomScaleInput.addEventListener('input', () => {
        const val = parseInt(dom.quickDimCustomScaleInput.value, 10);
        if (!isNaN(val) && val > 0) {
          views.callController('quick_dimension', 'applyQuickScale', val);
        }
      });
    }

    if (dom.quickDimInput) {
      dom.quickDimInput.addEventListener('input', () => {
        views.callController('quick_dimension', 'parseAndEvaluateQuickDimension', false);
      });

      dom.quickDimInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          views.callController('quick_dimension', 'parseAndEvaluateQuickDimension', true);
        } else if (e.key === 'Escape') {
          if (!state.quickDimension.pinned) {
            e.preventDefault();
            views.callController('quick_dimension', 'toggleQuickDimension', false);
          }
        }
      });
    }

    if (dom.btnRunQuickDim) {
      dom.btnRunQuickDim.addEventListener('click', () => {
        views.callController('quick_dimension', 'parseAndEvaluateQuickDimension', true);
      });
    }

    if (dom.quickDimCopyRealBtn) {
      dom.quickDimCopyRealBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'copyQuickDimension', 'real');
      });
    }

    if (dom.quickDimCopyDrawBtn) {
      dom.quickDimCopyDrawBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'copyQuickDimension', 'drawing');
      });
    }

    if (dom.quickDimCopyCadBtn) {
      dom.quickDimCopyCadBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'copyQuickDimension', 'cad_numbers');
      });
    }

    if (dom.quickDimCopyMatrixBtn) {
      dom.quickDimCopyMatrixBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'copyQuickDimension', 'all_scales');
      });
    }

    if (dom.quickDimSendWorkspaceBtn) {
      dom.quickDimSendWorkspaceBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'handoffQuickDimension', 'workspace');
      });
    }

    if (dom.quickDimSendMultiscaleBtn) {
      dom.quickDimSendMultiscaleBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'handoffQuickDimension', 'multiscale');
      });
    }

    if (dom.quickDimSendChainBtn) {
      dom.quickDimSendChainBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'handoffQuickDimension', 'chain');
      });
    }

    if (dom.quickDimSendCadBtn) {
      dom.quickDimSendCadBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'handoffQuickDimension', 'cad_clipboard');
      });
    }

    if (dom.quickDimSaveJournalBtn) {
      dom.quickDimSaveJournalBtn.addEventListener('click', () => {
        views.callController('quick_dimension', 'handoffQuickDimension', 'journal');
      });
    }

    // Mode 14: Stair Calculator Listeners
    if (dom.stairsModeSelect) {
      dom.stairsModeSelect.addEventListener('change', () => {
        state.stairs.mode = dom.stairsModeSelect.value;
        views.callController('stairs', 'syncModeVisibility');
        views.callController('stairs', 'calculate', true);
      });
    }
    if (dom.stairsObjectiveSelect) {
      dom.stairsObjectiveSelect.addEventListener('change', () => {
        state.stairs.objective = dom.stairsObjectiveSelect.value;
        views.callController('stairs', 'calculate', true);
      });
    }
    [dom.stairsTotalRise, dom.stairsDesiredRiser, dom.stairsRiserCount, dom.stairsAvailableRun, dom.stairsTotalRun, dom.stairsDesiredTread].forEach(el => {
      if (el) {
        el.addEventListener('input', () => views.callController('stairs', 'calculate'));
        el.addEventListener('change', () => views.callController('stairs', 'calculate', true));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            views.callController('stairs', 'calculate', true);
          }
        });
      }
    });
    [dom.stairsRefRiserMin, dom.stairsRefRiserMax, dom.stairsRefBlondelMin, dom.stairsRefBlondelMax].forEach(el => {
      if (el) el.addEventListener('input', () => views.callController('stairs', 'calculate'));
    });
    if (dom.btnRunStairs) {
      dom.btnRunStairs.addEventListener('click', () => views.callController('stairs', 'calculate', true));
    }
    if (dom.stairsCopyResultBtn) {
      dom.stairsCopyResultBtn.addEventListener('click', () => views.callController('stairs', 'copyResult'));
    }
    if (dom.stairsCopyScheduleBtn) {
      dom.stairsCopyScheduleBtn.addEventListener('click', () => views.callController('stairs', 'copySchedule'));
    }
    if (dom.stairsSendCadBtn) {
      dom.stairsSendCadBtn.addEventListener('click', () => views.callController('stairs', 'sendToCad'));
    }
    if (dom.stairsSendWorkspaceBtn) {
      dom.stairsSendWorkspaceBtn.addEventListener('click', () => views.callController('stairs', 'sendToWorkspace'));
    }
    if (dom.stairsSaveJournalBtn) {
      dom.stairsSaveJournalBtn.addEventListener('click', () => views.callController('stairs', 'saveToJournal'));
    }
    if (dom.stairsSaveProjectBtn) {
      dom.stairsSaveProjectBtn.addEventListener('click', () => views.callController('stairs', 'saveToProject'));
    }

    // Mode 15: Ramp Calculator Listeners
    if (dom.rampsModeSelect) {
      dom.rampsModeSelect.addEventListener('change', () => {
        state.ramps.mode = dom.rampsModeSelect.value;
        views.callController('ramps', 'syncModeVisibility');
        views.callController('ramps', 'calculate', true);
      });
    }
    [dom.rampsRise, dom.rampsSlope, dom.rampsRun].forEach(el => {
      if (el) {
        el.addEventListener('input', () => views.callController('ramps', 'calculate'));
        el.addEventListener('change', () => views.callController('ramps', 'calculate', true));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            views.callController('ramps', 'calculate', true);
          }
        });
      }
    });
    [dom.rampsRefTarget, dom.rampsRefMin, dom.rampsRefMax].forEach(el => {
      if (el) el.addEventListener('input', () => views.callController('ramps', 'calculate'));
    });
    if (dom.btnRunRamps) {
      dom.btnRunRamps.addEventListener('click', () => views.callController('ramps', 'calculate', true));
    }
    if (dom.rampsCopyResultBtn) {
      dom.rampsCopyResultBtn.addEventListener('click', () => views.callController('ramps', 'copyResult'));
    }
    if (dom.rampsCopyScheduleBtn) {
      dom.rampsCopyScheduleBtn.addEventListener('click', () => views.callController('ramps', 'copySchedule'));
    }
    if (dom.rampsSendCadBtn) {
      dom.rampsSendCadBtn.addEventListener('click', () => views.callController('ramps', 'sendToCad'));
    }
    if (dom.rampsSendWorkspaceBtn) {
      dom.rampsSendWorkspaceBtn.addEventListener('click', () => views.callController('ramps', 'sendToWorkspace'));
    }
    if (dom.rampsSaveJournalBtn) {
      dom.rampsSaveJournalBtn.addEventListener('click', () => views.callController('ramps', 'saveToJournal'));
    }
    if (dom.rampsSaveProjectBtn) {
      dom.rampsSaveProjectBtn.addEventListener('click', () => views.callController('ramps', 'saveToProject'));
    }

    // Mode 16: Slope Analyzer Listeners
    if (dom.slopesModeSelect) {
      dom.slopesModeSelect.addEventListener('change', () => {
        state.slopes.mode = dom.slopesModeSelect.value;
        views.callController('slopes', 'syncModeVisibility');
        views.callController('slopes', 'calculate', true);
      });
    }
    [dom.slopesRise, dom.slopesRun, dom.slopesPercent, dom.slopesRatio, dom.slopesAngle].forEach(el => {
      if (el) {
        el.addEventListener('input', () => views.callController('slopes', 'calculate'));
        el.addEventListener('change', () => views.callController('slopes', 'calculate', true));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            views.callController('slopes', 'calculate', true);
          }
        });
      }
    });
    if (dom.btnRunSlopes) {
      dom.btnRunSlopes.addEventListener('click', () => views.callController('slopes', 'calculate', true));
    }
    if (dom.slopesCopyResultBtn) {
      dom.slopesCopyResultBtn.addEventListener('click', () => views.callController('slopes', 'copyResult'));
    }
    if (dom.slopesCopyScheduleBtn) {
      dom.slopesCopyScheduleBtn.addEventListener('click', () => views.callController('slopes', 'copySchedule'));
    }
    if (dom.slopesSendCadBtn) {
      dom.slopesSendCadBtn.addEventListener('click', () => views.callController('slopes', 'sendToCad'));
    }
    if (dom.slopesSendWorkspaceBtn) {
      dom.slopesSendWorkspaceBtn.addEventListener('click', () => views.callController('slopes', 'sendToWorkspace'));
    }
    if (dom.slopesSaveJournalBtn) {
      dom.slopesSaveJournalBtn.addEventListener('click', () => views.callController('slopes', 'saveToJournal'));
    }
    if (dom.slopesSaveProjectBtn) {
      dom.slopesSaveProjectBtn.addEventListener('click', () => views.callController('slopes', 'saveToProject'));
    }

    // Mode 17: Export Center Listeners
    if (dom.exportSourceSelect) {
      dom.exportSourceSelect.addEventListener('change', () => views.callController('export', 'build', true));
    }
    if (dom.exportFormatSelect) {
      dom.exportFormatSelect.addEventListener('change', () => views.callController('export', 'build', true));
    }
    if (dom.exportDiagramSelect) {
      dom.exportDiagramSelect.addEventListener('change', () => views.callController('export', 'build', true));
    }
    if (dom.exportDxfScale) {
      dom.exportDxfScale.addEventListener('change', () => views.callController('export', 'build', true));
    }
    if (dom.btnRunExport) {
      dom.btnRunExport.addEventListener('click', () => views.callController('export', 'build', true));
      dom.btnRunExport.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          views.callController('export', 'build', true);
        }
      });
    }
    if (dom.btnExportDownload) {
      dom.btnExportDownload.addEventListener('click', () => views.callController('export', 'download'));
    }
    if (dom.btnExportCopy) {
      dom.btnExportCopy.addEventListener('click', () => views.callController('export', 'copy'));
    }
    if (dom.btnExportPrint) {
      dom.btnExportPrint.addEventListener('click', () => views.callController('export', 'print'));
    }

    // Mode 18: Project Workspace Listeners
    if (dom.btnProjectNew) {
      dom.btnProjectNew.addEventListener('click', () => views.callController('projects', 'newProject'));
    }
    if (dom.btnProjectSave) {
      dom.btnProjectSave.addEventListener('click', () => views.callController('projects', 'saveProject'));
    }
    if (dom.btnProjectRename) {
      dom.btnProjectRename.addEventListener('click', () => views.callController('projects', 'applyInfo'));
    }
    if (dom.btnProjectDuplicate) {
      dom.btnProjectDuplicate.addEventListener('click', () => views.callController('projects', 'duplicateProject'));
    }
    if (dom.btnProjectDelete) {
      dom.btnProjectDelete.addEventListener('click', () => views.callController('projects', 'deleteSelected'));
    }
    if (dom.btnProjectExportJson) {
      dom.btnProjectExportJson.addEventListener('click', () => views.callController('projects', 'exportJson'));
    }
    if (dom.btnProjectImport) {
      dom.btnProjectImport.addEventListener('click', () => views.callController('projects', 'importJson'));
    }
    if (dom.btnProjectSnapshot) {
      dom.btnProjectSnapshot.addEventListener('click', () => views.callController('projects', 'captureSnapshot'));
    }

    // Mode 19: Plan Canvas Listeners
    if (dom.planToolSelect) {
      dom.planToolSelect.addEventListener('change', () => {
        state.plan.tool = dom.planToolSelect.value;
        views.callController('plan', 'syncToolVisibility');
      });
    }
    if (dom.planGridSelect) {
      dom.planGridSelect.addEventListener('change', () => {
        state.plan.grid = parseFloat(dom.planGridSelect.value) || 0.5;
      });
    }
    if (dom.btnPlanUndo) {
      dom.btnPlanUndo.addEventListener('click', () => views.callController('plan', 'undo'));
    }
    if (dom.btnPlanRedo) {
      dom.btnPlanRedo.addEventListener('click', () => views.callController('plan', 'redo'));
    }
    if (dom.btnPlanDelete) {
      dom.btnPlanDelete.addEventListener('click', () => views.callController('plan', 'deleteSelected'));
    }
    if (dom.btnPlanClear) {
      dom.btnPlanClear.addEventListener('click', () => views.callController('plan', 'clearPlan'));
    }
    if (dom.btnPlanSave) {
      dom.btnPlanSave.addEventListener('click', () => views.callController('plan', 'saveToProject'));
    }
    if (dom.btnPlanExportSvg) {
      dom.btnPlanExportSvg.addEventListener('click', () => views.callController('plan', 'exportPlan', 'svg'));
    }
    if (dom.btnPlanExportDxf) {
      dom.btnPlanExportDxf.addEventListener('click', () => views.callController('plan', 'exportPlan', 'dxf'));
    }

    // Mode 20: AI Studio listeners
    if (dom.aiRunBtn) {
      dom.aiRunBtn.addEventListener('click', () => views.callController('ai', 'runJob'));
    }
    if (dom.aiOpenSettingsBtn) {
      dom.aiOpenSettingsBtn.addEventListener('click', () => switchMode('ai_settings'));
    }
    if (dom.aiJobSelect) {
      dom.aiJobSelect.addEventListener('change', () => views.callController('ai', 'refreshImageGroup'));
    }
    if (dom.aiImageInput) {
      dom.aiImageInput.addEventListener('change', () => {
        const file = dom.aiImageInput.files && dom.aiImageInput.files[0];
        if (file) views.callController('ai', 'handleImageFile', file);
      });
    }
    if (dom.aiSaveNoteBtn) {
      dom.aiSaveNoteBtn.addEventListener('click', () => views.callController('ai', 'saveToJournal'));
    }
    if (dom.aiCopyBtn) {
      dom.aiCopyBtn.addEventListener('click', () => views.callController('ai', 'copyResponse'));
    }

    // Mode 21: AI Control Center listeners
    if (dom.aiCatalogSearch) {
      dom.aiCatalogSearch.addEventListener('input', () => views.callController('ai_settings', 'renderCatalog'));
    }
    if (dom.aiCatalogProviderFilter) {
      dom.aiCatalogProviderFilter.addEventListener('change', () => views.callController('ai_settings', 'renderCatalog'));
    }
    for (const filterEl of [dom.aiFilterVision, dom.aiFilterStructured, dom.aiFilterImageGen]) {
      if (filterEl) filterEl.addEventListener('change', () => views.callController('ai_settings', 'renderCatalog'));
    }
    if (dom.aiRefreshModelsBtn) {
      dom.aiRefreshModelsBtn.addEventListener('click', () => {
        // Refresh discovery for every configured, enabled provider.
        const svc = state.ai;
        if (!svc) return;
        for (const p of svc.providerManager.listProviderStatuses()) {
          if (p.enabled && p.hasKey) views.callController('ai_settings', 'discoverModels', p.id, null);
        }
      });
    }
    if (dom.aiAddManualModelBtn) {
      dom.aiAddManualModelBtn.addEventListener('click', () => views.callController('ai_settings', 'addManualModel'));
    }
    if (dom.aiClearActivityBtn) {
      dom.aiClearActivityBtn.addEventListener('click', () => {
        state.ai?.router?.clearActivityLog();
        views.callController('ai_settings', 'renderActivity');
        showToast('AI activity log cleared');
      });
    }

    // Mode 22: Importer listeners
    if (dom.importsRunBtn) {
      dom.importsRunBtn.addEventListener('click', () => views.callController('imports', 'runImport'));
    }
    if (dom.importsSendPlanBtn) {
      dom.importsSendPlanBtn.addEventListener('click', () => views.callController('imports', 'sendToPlan'));
    }
    if (dom.importsFileInput) {
      dom.importsFileInput.addEventListener('change', () => {
        const file = dom.importsFileInput.files && dom.importsFileInput.files[0];
        if (file) views.callController('imports', 'handleFile', file);
      });
    }

    // Mode 23: Survey Notebook listeners
    if (dom.surveyRunBtn) {
      dom.surveyRunBtn.addEventListener('click', () => views.callController('survey', 'addMeasurement'));
    }
    if (dom.surveyCalibrateBtn) {
      dom.surveyCalibrateBtn.addEventListener('click', () => views.callController('survey', 'setCalibration'));
    }
    if (dom.surveyMeasureDistanceBtn) {
      dom.surveyMeasureDistanceBtn.addEventListener('click', () => views.callController('survey', 'measureCalibrated', 'distance'));
    }
    if (dom.surveyMeasureChainBtn) {
      dom.surveyMeasureChainBtn.addEventListener('click', () => views.callController('survey', 'measureCalibrated', 'chain'));
    }
    if (dom.surveyMeasureAreaBtn) {
      dom.surveyMeasureAreaBtn.addEventListener('click', () => views.callController('survey', 'measureCalibrated', 'area'));
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

      // Esc closes Command Palette first, then drawers/modals/selection/quick-strip
      if (e.key === 'Escape') {
        if (dom.commandPaletteModal?.classList.contains('open')) {
          e.preventDefault();
          e.stopPropagation();
          closeCommandPalette();
          return;
        }
        if (dom.historyDrawer?.classList.contains('open')) views.callController('history', 'toggleHistoryDrawer');
        if (dom.shortcutsModal?.classList.contains('open')) {
          dom.shortcutsModal.classList.remove('open');
          dom.modalBackdrop?.classList.remove('open');
        }
        if (state.currentMode === 'workspace' && state.workspaceSelectedIds.size > 0) {
          state.workspaceSelectedIds.clear();
          renderWorkspace();
          return;
        }
        if (state.quickDimension.isOpen && !state.quickDimension.pinned) {
          views.callController('quick_dimension', 'toggleQuickDimension', false);
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
      else if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); views.callController('quick_dimension', 'toggleQuickDimension'); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); views.callController('converter', 'swapDirection'); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); views.callController('history', 'toggleHistoryDrawer'); }
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
  // Feature views (Stabilization 1): each owns its mode's controller logic.
  // They receive one shared frozen context and never import each other.
  const views = createViewRegistry();
  // Project store (Stabilization 3+4): one instance for the session; views
  // that save PROJECT data (e.g. Stairs) reach it through the context.
  const projectStore = createProjectStore({ storage: StorageService });
  projectStore.loadProject(); // recover persisted project; failures stay controlled

  // AI services (Phase 15): one shared instance graph. Keys live only inside
  // the provider manager; the job router is the ONLY execution entry point.
  let aiServices = null;
  try {
    const http = createAiHttp();
    const transports = createTransports({ http });
    const providerManager = createProviderManager({ storage: StorageService });
    const modelCatalog = createModelCatalog({ storage: StorageService });
    const router = createJobRouter({
      providerManager,
      modelCatalog,
      transports,
      storage: StorageService,
      buildFactsPack: (args = {}) => buildScopedFactsPack({
        project: projectStore.getProject(),
        planEntities: state.plan.entities,
        request: { scopeHint: args.request?.scopeHint || args.options?.scopeHint || '' }
      })
    });
    aiServices = { http, transports, providerManager, modelCatalog, router };
  } catch (e) {
    // AI unavailable — the application remains fully functional (by design).
    console.warn('AI services unavailable:', e?.message || e);
    aiServices = null;
  }
  state.ai = aiServices;

  const viewContext = Object.freeze({
    state,
    dom,
    showToast,
    copyToClipboard,
    downloadFile,
    setUnifiedResultState,
    setRunButtonState,
    switchMode,
    views,
    AudioService,
    StorageService,
    HistoryService,
    CommandRegistry,
    projectStore,
    getController: (viewId, fnName, ...args) => views.callController(viewId, fnName, ...args)
  });
  validateViewContext(viewContext);

  views.register(createConverterView(viewContext));
  views.register(createRescalerView(viewContext));
  views.register(createDetectorView(viewContext));
  views.register(createAreaVolumeView(viewContext));
  views.register(workspaceView);
  views.register(createExpressionView(viewContext));
  views.register(createMultiScaleView(viewContext));
  views.register(createChainsView(viewContext));
  views.register(createCadClipboardView(viewContext));
  views.register(createCadHandoffView(viewContext));
  views.register(createBatchCadView(viewContext));
  views.register(createQuickDimensionView({ ...viewContext, renderHistoryListRef: () => views.callController('history', 'renderHistoryList') }));
  views.register(createHistoryView({
    ...viewContext,
    calculateCustomFurnitureRef: calculateCustomFurniture,
    renderWorkspaceRef: () => views.callController('workspace', 'renderWorkspace'),
    toggleHistoryDrawerRef: () => views.callController('history', 'toggleHistoryDrawer')
  }));
  views.register(createStairsView(viewContext));
  views.register(createRampsView(viewContext));
  views.register(createSlopesView(viewContext));
  views.register(createExportCenterView(viewContext));
  views.register(createProjectsView(viewContext));
  views.register(createPlanView(viewContext));
  views.register(createAiStudioView(viewContext));
  views.register(createAiControlCenterView(viewContext));
  views.register(createImportsView(viewContext));
  views.register(createSurveyView(viewContext));

  applyTheme(state.activeTheme);
  updateSoundUI();
  populateUnitSelects();
  renderPresetChips(state.selectedCategory);
  attachEventListeners();
  views.mountAll();
  renderSidebar('');
  if (state.quickDimension.isOpen || state.quickDimension.pinned) {
    views.callController('quick_dimension', 'toggleQuickDimension', true);
    if (state.quickDimension.pinned && dom.quickDimPinBtn) {
      dom.quickDimPinBtn.classList.add('pinned');
    }
  }
  // The app opens on Home so a new session always gets oriented.
  state.currentMode = 'home';
  switchMode('home');

  // QA/test hook (idempotent): lets browser automation drive mode switching
  // through the same entry point as the UI without touching internals.
  if (typeof window !== 'undefined') {
    window.__ahhSwitchMode = switchMode;
    window.__ahhState = state;
  }
}
