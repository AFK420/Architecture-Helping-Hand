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
import { StorageService } from '../services/storage.js';
import { AudioService } from '../services/audio.js';
import { HistoryService } from '../services/history.js';
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
    areavolRatio: 100,
    areavolInputVal: '4',
    areavolInputUnit: 'cm2',
    areavolOutputUnit: 'm2',

    // Mode 5: Furniture
    furnitureSearchQuery: '',
    furnitureActiveCategory: 'all',
    furnitureScaleRatio: 50,
    furniturePaperUnit: 'cm',
    customFurnName: 'Custom Piece',
    customFurnW: 240,
    customFurnD: 100,
    customFurnUnit: 'cm',

    // Mode 6: Reference
    refScaleRatio: 50
  };

  // DOM Elements Cache (Strictly normalized with index.html)
  const dom = {
    // Header & Global Modals
    themeSelect: document.getElementById('theme-select'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    soundToggleLabel: document.getElementById('sound-toggle-label'),
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

    // Mode 5: Furniture Elements
    furnitureSearchInput: document.getElementById('furniture-search-input'),
    clearFurnitureSearchBtn: document.getElementById('clear-furniture-search-btn'),
    furnitureResultsCount: document.getElementById('furniture-results-count'),
    furnScalePresets: document.getElementById('furn-scale-presets'),
    furnScaleRatioInput: document.getElementById('furn-scale-ratio-input'),
    furnPaperUnitSelect: document.getElementById('furn-paper-unit-select'),
    furnCategoryNav: document.getElementById('furn-category-nav'),
    furnitureCardsGrid: document.getElementById('furniture-cards-grid'),
    customFurnName: document.getElementById('custom-furn-name'),
    customFurnW: document.getElementById('custom-furn-w'),
    customFurnD: document.getElementById('custom-furn-d'),
    customFurnUnit: document.getElementById('custom-furn-unit'),
    btnRunCustomFurn: document.getElementById('btn-run-custom-furn'),
    customFurnResult: document.getElementById('custom-furn-result'),
    btnCopyCustomFurn: document.getElementById('btn-copy-custom-furn'),
    btnSendCustomFurn: document.getElementById('btn-send-custom-furn'),

    // Mode 6: Reference Elements
    refScaleSelect: document.getElementById('ref-scale-select'),
    btnPrintRef: document.getElementById('btn-print-ref'),
    refTableBody: document.getElementById('ref-table-body')
  };

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

    const parseRes = parseInput(rawInput, { allowNegative: false });

    // Handle Unit Suffix extraction if user typed e.g. "15.5cm"
    if (parseRes.isValid && parseRes.detectedUnit) {
      state.converterInputUnit = parseRes.detectedUnit;
      if (dom.converterInputUnit) dom.converterInputUnit.value = parseRes.detectedUnit;
    }

    if (!parseRes.isValid) {
      if (dom.converterErrorMsg) {
        dom.converterErrorMsg.textContent = `⚠️ Invalid input: ${parseRes.error || 'Please enter a positive numeric measurement'}`;
        dom.converterErrorMsg.style.display = 'block';
      }
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');
      if (dom.converterResultVal) dom.converterResultVal.textContent = '---';
      setRunButtonState(dom.btnRunConverter, 'error');
      return;
    }

    // Clear error state
    if (dom.converterErrorMsg) dom.converterErrorMsg.style.display = 'none';
    if (dom.converterInputVal) dom.converterInputVal.classList.remove('input-error');

    try {
      const calcRes = scaleDimension({
        value: parseRes.value,
        unitKey: state.converterInputUnit,
        ratio: state.scaleRatio,
        direction: state.direction,
        targetUnitKey: state.converterOutputUnit
      });

      // Update Result Display
      if (dom.converterResultVal) {
        dom.converterResultVal.textContent = formatNumber(calcRes.value, state.precision);
      }
      if (dom.converterResultUnit) {
        dom.converterResultUnit.textContent = state.converterOutputUnit;
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

      setRunButtonState(dom.btnRunConverter, 'success');
    } catch (err) {
      if (dom.converterErrorMsg) {
        dom.converterErrorMsg.textContent = `⚠️ Calculation error: ${err.message}`;
        dom.converterErrorMsg.style.display = 'block';
      }
      setRunButtonState(dom.btnRunConverter, 'error');
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
    } else {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Real-World Dimension';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Drawing Measurement (Paper)';
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

    state.rescaleOrigRatio = isNaN(origRatio) || origRatio <= 0 ? 50 : origRatio;
    state.rescaleTargetRatio = isNaN(targetRatio) || targetRatio <= 0 ? 200 : targetRatio;
    state.rescaleOrigUnit = dom.rescaleOrigUnit?.value || 'cm';
    state.rescaleTargetUnit = dom.rescaleTargetUnit?.value || 'cm';

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid) {
      if (dom.rescaleErrorMsg) {
        dom.rescaleErrorMsg.textContent = `⚠️ Invalid dimension: ${parsed.error || 'Enter a positive drawing measurement'}`;
        dom.rescaleErrorMsg.style.display = 'block';
      }
      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = '---';
      setRunButtonState(dom.btnRunRescale, 'error');
      return;
    }

    if (dom.rescaleErrorMsg) dom.rescaleErrorMsg.style.display = 'none';

    try {
      const res = rescaleDrawing({
        originalVal: parsed.value,
        originalUnitKey: state.rescaleOrigUnit,
        originalRatio: state.rescaleOrigRatio,
        targetRatio: state.rescaleTargetRatio,
        targetUnitKey: state.rescaleTargetUnit
      });

      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = formatNumber(res.targetValue, state.precision);
      if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.rescaleTargetUnit;
      if (dom.rescaleFactorBadge) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleFactorBadge.textContent = `${pct}% (${tag})`;
      }
      if (dom.rescaleRealSpan) {
        dom.rescaleRealSpan.textContent = `${formatNumber(res.realMeters, 3)} m`;
      }

      setRunButtonState(dom.btnRunRescale, 'success');
    } catch (err) {
      if (dom.rescaleErrorMsg) {
        dom.rescaleErrorMsg.textContent = `⚠️ Rescale error: ${err.message}`;
        dom.rescaleErrorMsg.style.display = 'block';
      }
      setRunButtonState(dom.btnRunRescale, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Mode 3: Scale Detector / Finder Engine
  // ---------------------------------------------------------------------------
  function calculateDetector() {
    const paperP = parseInput(dom.detectorPaperVal?.value, { allowNegative: false });
    const realP = parseInput(dom.detectorRealVal?.value, { allowNegative: false });

    state.detectPaperUnit = dom.detectorPaperUnit?.value || 'cm';
    state.detectRealUnit = dom.detectorRealUnit?.value || 'm';

    if (!paperP.isValid || !realP.isValid) {
      if (dom.detectorErrorMsg) {
        dom.detectorErrorMsg.textContent = '⚠️ Please enter valid positive measurements for both paper and real-world dimensions';
        dom.detectorErrorMsg.style.display = 'block';
      }
      if (dom.detectorRatioVal) dom.detectorRatioVal.textContent = '1 : ---';
      if (dom.detectorPresetBadge) dom.detectorPresetBadge.textContent = 'Enter measurements above';
      setRunButtonState(dom.btnRunDetector, 'error');
      return;
    }

    if (dom.detectorErrorMsg) dom.detectorErrorMsg.style.display = 'none';

    try {
      const res = detectScale({
        paperVal: paperP.value,
        paperUnitKey: state.detectPaperUnit,
        realVal: realP.value,
        realUnitKey: state.detectRealUnit
      });

      if (res.ratio === null) {
        if (dom.detectorRatioVal) dom.detectorRatioVal.textContent = '1 : ---';
        if (dom.detectorPresetBadge) dom.detectorPresetBadge.textContent = 'Measurements must be > 0';
        setRunButtonState(dom.btnRunDetector, 'error');
        return;
      }

      state.lastDetectedRatio = res.ratio;

      if (dom.detectorRatioVal) dom.detectorRatioVal.textContent = res.ratioString;
      if (dom.detectorPresetBadge) {
        if (res.closestPreset) {
          const matchLabel = res.isExactMatch ? 'Exact Match' : `Closest: Δ ${res.closestPreset.percentDiff}%`;
          dom.detectorPresetBadge.innerHTML = `${matchLabel}: <strong>${res.closestPreset.name} (${res.closestPreset.desc})</strong>`;
        } else {
          dom.detectorPresetBadge.textContent = 'Custom Ratio (No standard preset match)';
        }
      }

      setRunButtonState(dom.btnRunDetector, 'success');
    } catch (err) {
      if (dom.detectorErrorMsg) {
        dom.detectorErrorMsg.textContent = `⚠️ Error: ${err.message}`;
        dom.detectorErrorMsg.style.display = 'block';
      }
      setRunButtonState(dom.btnRunDetector, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Mode 4: Area & Volume Scaler Engine
  // ---------------------------------------------------------------------------
  function calculateAreaVolume() {
    const rawRatio = parseFloat(dom.areavolRatioInput?.value);
    state.areavolRatio = isNaN(rawRatio) || rawRatio <= 0 ? 100 : rawRatio;
    state.areavolInputUnit = dom.areavolInputUnit?.value || (state.calcType === 'area' ? 'cm2' : 'cm3');
    state.areavolOutputUnit = dom.areavolOutputUnit?.value || (state.calcType === 'area' ? 'm2' : 'm3');

    const parsed = parseInput(dom.areavolInputVal?.value, { allowNegative: false });

    if (!parsed.isValid) {
      if (dom.areavolErrorMsg) {
        dom.areavolErrorMsg.textContent = `⚠️ Invalid measurement: ${parsed.error || 'Enter a valid positive number'}`;
        dom.areavolErrorMsg.style.display = 'block';
      }
      if (dom.areavolResultVal) dom.areavolResultVal.textContent = '---';
      setRunButtonState(dom.btnRunAreavol, 'error');
      return;
    }

    if (dom.areavolErrorMsg) dom.areavolErrorMsg.style.display = 'none';

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

      if (dom.areavolResultVal) dom.areavolResultVal.textContent = formatNumber(res.resultValue, state.precision);
      if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.areavolOutputUnit;

      setRunButtonState(dom.btnRunAreavol, 'success');
    } catch (err) {
      if (dom.areavolErrorMsg) {
        dom.areavolErrorMsg.textContent = `⚠️ Scaling error: ${err.message}`;
        dom.areavolErrorMsg.style.display = 'block';
      }
      setRunButtonState(dom.btnRunAreavol, 'error');
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

    const filtered = filterFurnitureCatalog(
      FURNITURE_DATABASE,
      state.furnitureSearchQuery,
      state.furnitureActiveCategory
    );

    updateCategoryPillCounts();

    if (dom.furnitureResultsCount) {
      dom.furnitureResultsCount.textContent = `Showing ${filtered.length} of ${FURNITURE_DATABASE.length} items`;
    }

    if (filtered.length === 0) {
      dom.furnitureCardsGrid.innerHTML = `
        <div class="empty-furn-state">
          <div class="empty-furn-icon">🔍</div>
          <div class="empty-furn-title">No matching furniture pieces found</div>
          <div class="empty-furn-desc">Try searching for generic terms like "sofa", "bed", "sink", "desk", or choose another category.</div>
        </div>
      `;
      return;
    }

    dom.furnitureCardsGrid.innerHTML = filtered.map(item => {
      const scaled = getScaledFurnitureDimensions(item, state.furnitureScaleRatio, state.furniturePaperUnit);
      return `
        <div class="furniture-card" data-id="${item.id}">
          <div class="furn-card-header">
            <div>
              <div class="furn-name">${item.name}</div>
              <div class="furn-category-tag">${item.category.toUpperCase()}</div>
            </div>
            <div class="furn-dim-badge">1:${state.furnitureScaleRatio}</div>
          </div>

          <div class="furn-card-body">
            <div class="furn-plan-preview-box">
              ${getFurniturePlanSVG(item)}
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
            </div>
          </div>

          <div class="furn-card-footer">
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
    const pw = parseInput(dom.customFurnW?.value, { allowNegative: false });
    const pd = parseInput(dom.customFurnD?.value, { allowNegative: false });

    state.customFurnUnit = dom.customFurnUnit?.value || 'cm';
    state.furnitureScaleRatio = parseFloat(dom.furnScaleRatioInput?.value) || 50;
    state.furniturePaperUnit = dom.furnPaperUnitSelect?.value || 'cm';

    if (!pw.isValid || !pd.isValid) {
      if (dom.customFurnResult) dom.customFurnResult.textContent = 'Invalid dimensions';
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

      const formatted = `Paper @ 1:${state.furnitureScaleRatio}: ${formatNumber(wRes.value, 2)} × ${formatNumber(dRes.value, 2)} ${state.furniturePaperUnit}`;
      if (dom.customFurnResult) dom.customFurnResult.textContent = formatted;
      AudioService.playTick();
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 12. Mode 6: Reference Scale Chart
  // ---------------------------------------------------------------------------
  function renderReferenceChart() {
    if (!dom.refTableBody) return;
    state.refScaleRatio = parseFloat(dom.refScaleSelect?.value) || 50;

    const lengthsCm = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];

    dom.refTableBody.innerHTML = lengthsCm.map(cm => {
      const realMeters = (cm * 0.01) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr>
          <td class="col-paper"><strong>${cm} cm</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${cm * 10} mm)</span></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${realFtIn}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // 13. History Drawer Manager
  // ---------------------------------------------------------------------------
  function renderHistoryList() {
    if (!dom.historyList) return;
    const history = HistoryService.getHistory();

    if (history.length === 0) {
      dom.historyList.innerHTML = `
        <div class="empty-history-box">
          <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">📜</div>
          <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem;">No History Recorded</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">Calculations and conversions will be logged here.</div>
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = history.map(item => `
      <div class="history-item-card" data-id="${item.id}">
        <div class="hist-card-top">
          <span class="hist-mode-tag">${item.mode || 'Converter'}</span>
          <span class="hist-scale-tag">${item.scaleStr || ''}</span>
          <span class="hist-time-tag">${item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}</span>
        </div>
        <div class="hist-formula-row">
          <span class="hist-input">${item.inputStr}</span>
          <span class="hist-arrow">➔</span>
          <span class="hist-output">${item.outputStr}</span>
        </div>
        <div class="hist-card-actions">
          <button class="hist-btn-copy action-tool-btn compact" data-text="${item.outputStr}">Copy</button>
          <button class="hist-btn-del action-tool-btn compact" data-id="${item.id}" title="Delete entry">✕</button>
        </div>
      </div>
    `).join('');

    dom.historyList.querySelectorAll('.hist-btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.text, 'History Result');
      });
    });

    dom.historyList.querySelectorAll('.hist-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        HistoryService.removeEntry(btn.dataset.id);
        renderHistoryList();
        showToast('Entry removed from history');
      });
    });
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
        if (e.key === 'Enter') calculateConverter();
      });
    }

    if (dom.converterInputUnit) dom.converterInputUnit.addEventListener('change', calculateConverter);
    if (dom.converterOutputUnit) dom.converterOutputUnit.addEventListener('change', calculateConverter);
    if (dom.swapDirectionBtn) dom.swapDirectionBtn.addEventListener('click', swapDirection);
    if (dom.btnRunConverter) dom.btnRunConverter.addEventListener('click', calculateConverter);

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
        const val = dom.converterResultVal?.textContent;
        const unit = dom.converterResultUnit?.textContent;
        if (val && val !== '---') {
          HistoryService.addEntry({
            mode: 'Scale Converter',
            scaleRatio: state.scaleRatio,
            scaleStr: `1:${state.scaleRatio}`,
            inputStr: `${dom.converterInputVal?.value} ${state.converterInputUnit}`,
            outputStr: `${val} ${unit}`
          });
          showToast('Saved conversion to calculation log');
          AudioService.playTick();
        }
      });
    }

    // Rescaler Listeners
    [dom.rescaleOrigRatio, dom.rescaleOrigVal, dom.rescaleOrigUnit, dom.rescaleTargetRatio, dom.rescaleTargetUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateRescaler);
        el.addEventListener('change', calculateRescaler);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') calculateRescaler();
        });
      }
    });
    if (dom.btnRunRescale) dom.btnRunRescale.addEventListener('click', calculateRescaler);
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
          if (e.key === 'Enter') calculateDetector();
        });
      }
    });
    if (dom.btnRunDetector) dom.btnRunDetector.addEventListener('click', calculateDetector);
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
          if (e.key === 'Enter') calculateAreaVolume();
        });
      }
    });
    if (dom.btnRunAreavol) dom.btnRunAreavol.addEventListener('click', calculateAreaVolume);
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
    if (dom.btnRunCustomFurn) dom.btnRunCustomFurn.addEventListener('click', calculateCustomFurniture);
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

    if (dom.btnPrintRef) {
      dom.btnPrintRef.addEventListener('click', () => {
        window.print();
      });
    }

    // Keyboard Global Shortcuts
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');

      // Esc closes drawers/modals
      if (e.key === 'Escape') {
        if (dom.historyDrawer?.classList.contains('open')) toggleHistoryDrawer();
        if (dom.shortcutsModal?.classList.contains('open')) {
          dom.shortcutsModal.classList.remove('open');
          dom.modalBackdrop?.classList.remove('open');
        }
        if (activeEl && activeEl.blur) activeEl.blur();
        return;
      }

      // If user is focused inside an input field, do not hijack letter shortcuts
      if (isInputFocused) return;

      if (e.key === '1') { e.preventDefault(); switchMode('converter'); }
      else if (e.key === '2') { e.preventDefault(); switchMode('rescale'); }
      else if (e.key === '3') { e.preventDefault(); switchMode('detector'); }
      else if (e.key === '4') { e.preventDefault(); switchMode('area_volume'); }
      else if (e.key === '5') { e.preventDefault(); switchMode('furniture'); }
      else if (e.key === '6') { e.preventDefault(); switchMode('reference'); }
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
