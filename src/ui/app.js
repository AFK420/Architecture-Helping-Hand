/**
 * Architecture Helping Hand - Main Application UI Controller
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
import { updateVisualization } from './visualizer.js';

export function initializeApp() {
  const state = {
    currentMode: 'converter',
    activeTheme: 'dark',
    precision: 3,

    // Mode 1: Main Converter
    direction: 'drawing_to_real',
    scaleRatio: 50,
    selectedPresetId: '1:50',
    drawingVal: 10,
    drawingUnit: 'cm',
    realVal: 5,
    realUnit: 'm',

    // Mode 2: Rescale
    rescaleOrigVal: 12,
    rescaleOrigUnit: 'cm',
    rescaleOrigRatio: 50,
    rescaleTargetRatio: 200,
    rescaleTargetUnit: 'cm',

    // Mode 3: Detector
    detectPaperVal: 4.5,
    detectPaperUnit: 'cm',
    detectRealVal: 9.0,
    detectRealUnit: 'm',

    // Mode 4: Area & Volume
    calcType: 'area',
    calcDirection: 'drawing_to_real',
    areaVal: 4,
    areaInputUnit: 'cm2',
    areaRatio: 100,
    areaOutputUnit: 'm2',
    volumeVal: 1000,
    volumeInputUnit: 'cm3',
    volumeRatio: 50,
    volumeOutputUnit: 'm3',

    // Mode 5: Furniture
    furnitureSearchQuery: '',
    furnitureActiveCategory: 'all',
    furnitureScaleRatio: 50,
    furniturePaperUnit: 'cm',
    customFurnW: 240,
    customFurnD: 100,
    customFurnH: 75,
    customFurnUnit: 'cm',

    // Mode 6: Reference
    refScaleRatio: 50
  };

  // DOM Elements Cache
  const dom = {
    themeSelect: document.getElementById('theme-select'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
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
    navTabs: document.querySelectorAll('.nav-tab'),
    toolContainers: document.querySelectorAll('.tool-container'),

    // Mode 1 Elements
    inputDrawingVal: document.getElementById('input-drawing-val'),
    selectDrawingUnit: document.getElementById('select-drawing-unit'),
    inputRealVal: document.getElementById('input-real-val'),
    selectRealUnit: document.getElementById('select-real-unit'),
    swapDirectionBtn: document.getElementById('swap-direction-btn'),
    customRatioInput: document.getElementById('custom-ratio-input'),
    scalePresetPills: document.getElementById('scale-preset-pills'),
    presetCategoryTabs: document.querySelectorAll('.preset-cat-btn'),
    activeScaleBadge: document.getElementById('active-scale-badge'),
    visualizerContainer: document.getElementById('visualizer-container'),
    metricBreakdownList: document.getElementById('metric-breakdown-list'),
    imperialBreakdownList: document.getElementById('imperial-breakdown-list'),
    btnCopyResult: document.getElementById('btn-copy-result'),

    // Mode 2 Elements
    rescaleOrigInput: document.getElementById('rescale-orig-val'),
    rescaleOrigUnit: document.getElementById('rescale-orig-unit'),
    rescaleOrigRatioSelect: document.getElementById('rescale-orig-ratio-select'),
    rescaleTargetRatioSelect: document.getElementById('rescale-target-ratio-select'),
    rescaleTargetUnit: document.getElementById('rescale-target-unit'),
    rescaleResultVal: document.getElementById('rescale-result-val'),
    rescaleResultUnitBadge: document.getElementById('rescale-result-unit-badge'),
    rescaleFactorBadge: document.getElementById('rescale-factor-badge'),
    rescaleRealSpan: document.getElementById('rescale-real-span'),
    btnCopyRescale: document.getElementById('btn-copy-rescale'),

    // Mode 3 Elements
    detectPaperInput: document.getElementById('detect-paper-val'),
    detectPaperUnit: document.getElementById('detect-paper-unit'),
    detectRealInput: document.getElementById('detect-real-val'),
    detectRealUnit: document.getElementById('detect-real-unit'),
    detectedRatioBadge: document.getElementById('detected-ratio-badge'),
    closestPresetName: document.getElementById('closest-preset-name'),
    closestPresetDiff: document.getElementById('closest-preset-diff'),
    btnApplyDetected: document.getElementById('btn-apply-detected'),

    // Mode 4 Elements
    areaVolTypeTabs: document.querySelectorAll('.type-subtab'),
    areaVolDirTabs: document.querySelectorAll('.dir-subtab'),
    areaSection: document.getElementById('area-section'),
    volumeSection: document.getElementById('volume-section'),
    areaInputVal: document.getElementById('area-input-val'),
    areaInputUnit: document.getElementById('area-input-unit'),
    areaRatioSelect: document.getElementById('area-ratio-select'),
    areaOutputUnit: document.getElementById('area-output-unit'),
    areaResultVal: document.getElementById('area-result-val'),
    areaResultUnitBadge: document.getElementById('area-result-unit-badge'),
    btnCopyArea: document.getElementById('btn-copy-area'),
    volumeInputVal: document.getElementById('volume-input-val'),
    volumeInputUnit: document.getElementById('volume-input-unit'),
    volumeRatioSelect: document.getElementById('volume-ratio-select'),
    volumeOutputUnit: document.getElementById('volume-output-unit'),
    volumeResultVal: document.getElementById('volume-result-val'),
    volumeResultUnitBadge: document.getElementById('volume-result-unit-badge'),
    btnCopyVolume: document.getElementById('btn-copy-volume'),

    // Mode 5 Elements (Furniture)
    furnitureSearchInput: document.getElementById('furniture-search-input'),
    furnitureSearchClear: document.getElementById('furniture-search-clear'),
    furnitureCountBadge: document.getElementById('furniture-count-badge'),
    furnitureCategoryTabs: document.querySelectorAll('.furn-cat-btn'),
    furnitureScaleSelect: document.getElementById('furniture-scale-select'),
    furniturePaperUnitSelect: document.getElementById('furniture-paper-unit-select'),
    furnitureGrid: document.getElementById('furniture-grid'),
    customFurnWInput: document.getElementById('custom-furn-w'),
    customFurnDInput: document.getElementById('custom-furn-d'),
    customFurnHInput: document.getElementById('custom-furn-h'),
    customFurnUnitSelect: document.getElementById('custom-furn-unit'),
    customFurnPaperW: document.getElementById('custom-furn-paper-w'),
    customFurnPaperD: document.getElementById('custom-furn-paper-d'),
    btnCopyCustomFurn: document.getElementById('btn-copy-custom-furn'),
    btnSendCustomFurn: document.getElementById('btn-send-custom-furn'),

    // Mode 6 Elements
    refChartScaleSelect: document.getElementById('ref-chart-scale-select'),
    refChartTbody: document.getElementById('ref-chart-tbody'),
    btnPrintChart: document.getElementById('btn-print-chart')
  };

  // 1. Theme Initialization
  const savedTheme = StorageService.getItem('archiscale_theme') || 'dark';
  state.activeTheme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (dom.themeSelect) dom.themeSelect.value = savedTheme;

  // 2. Audio button status
  updateSoundButtonUI();

  // 3. Render Presets & Dropdowns
  populatePresetPills('architectural');
  populateSelectOptions();
  renderHistoryList();

  // 4. Initial Computations
  calculateConverter();
  calculateRescaler();
  calculateDetector();
  calculateAreaVolume();
  renderFurnitureGrid();
  calculateCustomFurniture();
  renderReferenceChart();

  // =========================================================================
  // CALCULATIONS & EVENT HANDLERS
  // =========================================================================

  function calculateConverter() {
    let rawInput = state.direction === 'drawing_to_real'
      ? dom.inputDrawingVal?.value
      : dom.inputRealVal?.value;

    const parseResult = parseInput(rawInput, { allowNegative: false });
    const numericVal = parseResult.isValid ? parseResult.value : 0;

    let res;
    if (state.direction === 'drawing_to_real') {
      state.drawingVal = numericVal;
      res = drawingToReal({
        drawingVal: state.drawingVal,
        drawingUnitKey: state.drawingUnit,
        scaleRatio: state.scaleRatio,
        realUnitKey: state.realUnit
      });
      state.realVal = res.realValue;
      if (dom.inputRealVal) dom.inputRealVal.value = formatNumber(res.realValue, state.precision);
    } else {
      state.realVal = numericVal;
      res = realToDrawing({
        realVal: state.realVal,
        realUnitKey: state.realUnit,
        scaleRatio: state.scaleRatio,
        drawingUnitKey: state.drawingUnit
      });
      state.drawingVal = res.drawingValue;
      if (dom.inputDrawingVal) dom.inputDrawingVal.value = formatNumber(res.drawingValue, state.precision);
    }

    if (dom.activeScaleBadge) {
      dom.activeScaleBadge.textContent = `1:${state.scaleRatio}`;
    }

    updateVisualization({
      containerElement: dom.visualizerContainer,
      drawingVal: formatNumber(state.drawingVal, state.precision),
      drawingUnit: state.drawingUnit,
      realVal: state.realVal,
      realUnit: state.realUnit,
      realMeters: res.realMeters,
      scaleRatio: state.scaleRatio
    });

    renderEquivalents(res.realMeters);
  }

  function renderEquivalents(realMeters) {
    const { metric, imperial } = getAllUnitEquivalents(realMeters);

    if (dom.metricBreakdownList) {
      dom.metricBreakdownList.innerHTML = metric.map(u => `
        <div class="equiv-item ${u.key === state.realUnit && state.direction === 'drawing_to_real' ? 'active' : ''}">
          <span class="equiv-label">${u.label}</span>
          <span class="equiv-val">${formatNumber(u.val, state.precision)} <small>${u.symbol}</small></span>
        </div>
      `).join('');
    }

    if (dom.imperialBreakdownList) {
      dom.imperialBreakdownList.innerHTML = imperial.map(u => `
        <div class="equiv-item ${u.key === state.realUnit && state.direction === 'drawing_to_real' ? 'active' : ''}">
          <span class="equiv-label">${u.label}</span>
          <span class="equiv-val">${typeof u.val === 'number' ? formatNumber(u.val, state.precision) : u.val} <small>${u.symbol}</small></span>
        </div>
      `).join('');
    }
  }

  function calculateRescaler() {
    const parsed = parseInput(dom.rescaleOrigInput?.value, { allowNegative: false });
    state.rescaleOrigVal = parsed.isValid ? parsed.value : 0;
    state.rescaleOrigRatio = parseFloat(dom.rescaleOrigRatioSelect?.value) || 50;
    state.rescaleTargetRatio = parseFloat(dom.rescaleTargetRatioSelect?.value) || 200;
    state.rescaleOrigUnit = dom.rescaleOrigUnit?.value || 'cm';
    state.rescaleTargetUnit = dom.rescaleTargetUnit?.value || 'cm';

    try {
      const res = rescaleDrawing({
        originalVal: state.rescaleOrigVal,
        originalUnitKey: state.rescaleOrigUnit,
        originalRatio: state.rescaleOrigRatio,
        targetRatio: state.rescaleTargetRatio,
        targetUnitKey: state.rescaleTargetUnit
      });

      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = formatNumber(res.targetValue, state.precision);
      if (dom.rescaleResultUnitBadge) dom.rescaleResultUnitBadge.textContent = state.rescaleTargetUnit;
      if (dom.rescaleFactorBadge) {
        const pct = (res.factor * 100).toFixed(1);
        dom.rescaleFactorBadge.textContent = `${pct}% (${res.factor < 1 ? 'Reduction' : res.factor > 1 ? 'Magnification' : '1:1'})`;
      }
      if (dom.rescaleRealSpan) {
        dom.rescaleRealSpan.textContent = `${formatNumber(res.realMeters, 2)} m`;
      }
    } catch (e) {}
  }

  function calculateDetector() {
    const paperP = parseInput(dom.detectPaperInput?.value, { allowNegative: false });
    const realP = parseInput(dom.detectRealInput?.value, { allowNegative: false });

    state.detectPaperVal = paperP.isValid ? paperP.value : 0;
    state.detectPaperUnit = dom.detectPaperUnit?.value || 'cm';
    state.detectRealVal = realP.isValid ? realP.value : 0;
    state.detectRealUnit = dom.detectRealUnit?.value || 'm';

    const res = detectScale({
      paperVal: state.detectPaperVal,
      paperUnitKey: state.detectPaperUnit,
      realVal: state.detectRealVal,
      realUnitKey: state.detectRealUnit
    });

    if (dom.detectedRatioBadge) {
      dom.detectedRatioBadge.textContent = res.ratioString;
    }

    if (res.closestPreset && dom.closestPresetName && dom.closestPresetDiff) {
      dom.closestPresetName.textContent = res.closestPreset.name;
      dom.closestPresetDiff.textContent = res.isExactMatch ? 'Exact match' : `Δ ${res.closestPreset.percentDiff}%`;
    } else {
      if (dom.closestPresetName) dom.closestPresetName.textContent = 'Enter measurements';
      if (dom.closestPresetDiff) dom.closestPresetDiff.textContent = '';
    }
  }

  function calculateAreaVolume() {
    if (state.calcType === 'area') {
      const parsed = parseInput(dom.areaInputVal?.value, { allowNegative: false });
      state.areaVal = parsed.isValid ? parsed.value : 0;
      state.areaInputUnit = dom.areaInputUnit?.value || 'cm2';
      state.areaRatio = parseFloat(dom.areaRatioSelect?.value) || 100;
      state.areaOutputUnit = dom.areaOutputUnit?.value || 'm2';

      try {
        const res = scaleArea({
          areaVal: state.areaVal,
          inputUnitKey: state.areaInputUnit,
          scaleRatio: state.areaRatio,
          outputUnitKey: state.areaOutputUnit,
          isDrawingToReal: state.calcDirection === 'drawing_to_real'
        });

        if (dom.areaResultVal) dom.areaResultVal.textContent = formatNumber(res.resultValue, state.precision);
        if (dom.areaResultUnitBadge) dom.areaResultUnitBadge.textContent = state.areaOutputUnit;
      } catch (e) {}
    } else {
      const parsed = parseInput(dom.volumeInputVal?.value, { allowNegative: false });
      state.volumeVal = parsed.isValid ? parsed.value : 0;
      state.volumeInputUnit = dom.volumeInputUnit?.value || 'cm3';
      state.volumeRatio = parseFloat(dom.volumeRatioSelect?.value) || 50;
      state.volumeOutputUnit = dom.volumeOutputUnit?.value || 'm3';

      try {
        const res = scaleVolume({
          volumeVal: state.volumeVal,
          inputUnitKey: state.volumeInputUnit,
          scaleRatio: state.volumeRatio,
          outputUnitKey: state.volumeOutputUnit,
          isDrawingToReal: state.calcDirection === 'drawing_to_real'
        });

        if (dom.volumeResultVal) dom.volumeResultVal.textContent = formatNumber(res.resultValue, state.precision);
        if (dom.volumeResultUnitBadge) dom.volumeResultUnitBadge.textContent = state.volumeOutputUnit;
      } catch (e) {}
    }
  }

  function renderFurnitureGrid() {
    if (!dom.furnitureGrid) return;

    state.furnitureScaleRatio = parseFloat(dom.furnitureScaleSelect?.value) || 50;
    state.furniturePaperUnit = dom.furniturePaperUnitSelect?.value || 'cm';

    const filtered = filterFurnitureCatalog(
      FURNITURE_DATABASE,
      state.furnitureSearchQuery,
      state.furnitureActiveCategory
    );

    if (dom.furnitureCountBadge) {
      dom.furnitureCountBadge.textContent = `Showing ${filtered.length} of ${FURNITURE_DATABASE.length} items`;
    }

    if (filtered.length === 0) {
      dom.furnitureGrid.innerHTML = `
        <div class="empty-furn-state">
          <div class="empty-furn-icon">🔍</div>
          <div class="empty-furn-title">No matching furniture pieces found</div>
          <div class="empty-furn-desc">Try searching for generic terms like "sofa", "bed", "sink", "desk", or choose another category.</div>
        </div>
      `;
      return;
    }

    dom.furnitureGrid.innerHTML = filtered.map(item => {
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
              <div class="furn-plan-desc">${item.desc}</div>
            </div>

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
            <button class="btn-furn-copy" data-text="${scaled.paperFormatted}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Size
            </button>
            <button class="btn-furn-send" data-w="${item.wCm}" data-d="${item.dCm}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              To Converter
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    dom.furnitureGrid.querySelectorAll('.btn-furn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.text);
      });
    });

    dom.furnitureGrid.querySelectorAll('.btn-furn-send').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseFloat(btn.dataset.w) || 0;
        sendDimensionToConverter(w, 'cm');
      });
    });
  }

  function calculateCustomFurniture() {
    const pw = parseInput(dom.customFurnWInput?.value, { allowNegative: false });
    const pd = parseInput(dom.customFurnDInput?.value, { allowNegative: false });

    state.customFurnW = pw.isValid ? pw.value : 0;
    state.customFurnD = pd.isValid ? pd.value : 0;
    state.customFurnUnit = dom.customFurnUnitSelect?.value || 'cm';
    state.furnitureScaleRatio = parseFloat(dom.furnitureScaleSelect?.value) || 50;
    state.furniturePaperUnit = dom.furniturePaperUnitSelect?.value || 'cm';

    const wRes = scaleDimension({
      value: state.customFurnW,
      unitKey: state.customFurnUnit,
      ratio: state.furnitureScaleRatio,
      direction: 'real_to_drawing',
      targetUnitKey: state.furniturePaperUnit
    });

    const dRes = scaleDimension({
      value: state.customFurnD,
      unitKey: state.customFurnUnit,
      ratio: state.furnitureScaleRatio,
      direction: 'real_to_drawing',
      targetUnitKey: state.furniturePaperUnit
    });

    if (dom.customFurnPaperW) dom.customFurnPaperW.textContent = `${formatNumber(wRes.value, 2)} ${state.furniturePaperUnit}`;
    if (dom.customFurnPaperD) dom.customFurnPaperD.textContent = `${formatNumber(dRes.value, 2)} ${state.furniturePaperUnit}`;
  }

  function renderReferenceChart() {
    if (!dom.refChartTbody) return;
    state.refScaleRatio = parseFloat(dom.refChartScaleSelect?.value) || 50;

    const lengthsCm = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];

    dom.refChartTbody.innerHTML = lengthsCm.map(cm => {
      const realMeters = (cm * 0.01) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr>
          <td class="col-paper"><strong>${cm} cm</strong> <small>(${cm * 10} mm)</small></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${formatFeetInches(realMeters / 0.0254)}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    }).join('');
  }

  function sendDimensionToConverter(val, unitKey) {
    state.direction = 'real_to_drawing';
    state.realVal = val;
    state.realUnit = unitKey;
    state.drawingUnit = state.furniturePaperUnit || 'cm';
    state.scaleRatio = state.furnitureScaleRatio || 50;

    switchMode('converter');
    if (dom.inputRealVal) dom.inputRealVal.value = val;
    if (dom.selectRealUnit) dom.selectRealUnit.value = unitKey;
    if (dom.selectDrawingUnit) dom.selectDrawingUnit.value = state.drawingUnit;
    if (dom.customRatioInput) dom.customRatioInput.value = state.scaleRatio;

    calculateConverter();
    showToast(`Transferred ${val} ${unitKey} to Converter`);
  }

  function switchMode(modeKey) {
    state.currentMode = modeKey;
    dom.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === modeKey);
    });
    dom.toolContainers.forEach(container => {
      container.classList.toggle('active', container.id === `tool-${modeKey}`);
    });
    AudioService.playTick();
  }

  function populatePresetPills(category = 'all') {
    if (!dom.scalePresetPills) return;
    const filtered = category === 'all' 
      ? SCALE_PRESETS 
      : SCALE_PRESETS.filter(p => p.category === category);

    dom.scalePresetPills.innerHTML = filtered.map(preset => `
      <button type="button" class="preset-pill ${preset.ratio === state.scaleRatio ? 'active' : ''}" data-ratio="${preset.ratio}" data-id="${preset.id}" title="${preset.description}">
        ${preset.name}
      </button>
    `).join('');

    dom.scalePresetPills.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.scaleRatio = parseFloat(btn.dataset.ratio) || 50;
        state.selectedPresetId = btn.dataset.id;
        if (dom.customRatioInput) dom.customRatioInput.value = state.scaleRatio;
        dom.scalePresetPills.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AudioService.playTick();
        calculateConverter();
      });
    });
  }

  function populateSelectOptions() {
    const scaleOptionsHtml = SCALE_PRESETS.map(p => `<option value="${p.ratio}">${p.name}</option>`).join('');

    if (dom.rescaleOrigRatioSelect) dom.rescaleOrigRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.rescaleTargetRatioSelect) dom.rescaleTargetRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.areaRatioSelect) dom.areaRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.volumeRatioSelect) dom.volumeRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.furnitureScaleSelect) dom.furnitureScaleSelect.innerHTML = scaleOptionsHtml;
    if (dom.refChartScaleSelect) dom.refChartScaleSelect.innerHTML = scaleOptionsHtml;

    if (dom.rescaleOrigRatioSelect) dom.rescaleOrigRatioSelect.value = "50";
    if (dom.rescaleTargetRatioSelect) dom.rescaleTargetRatioSelect.value = "200";
    if (dom.areaRatioSelect) dom.areaRatioSelect.value = "100";
    if (dom.volumeRatioSelect) dom.volumeRatioSelect.value = "50";
    if (dom.furnitureScaleSelect) dom.furnitureScaleSelect.value = "50";
    if (dom.refChartScaleSelect) dom.refChartScaleSelect.value = "50";
  }

  function renderHistoryList() {
    if (!dom.historyList) return;
    const history = HistoryService.getHistory();

    if (history.length === 0) {
      dom.historyList.innerHTML = `
        <div class="empty-history">
          <div class="empty-icon">📐</div>
          <p>No calculation history yet.<br>Your conversions will be logged here automatically.</p>
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-header">
          <span class="history-mode-tag">${item.mode || 'Scale'}</span>
          <span class="history-time">${item.timestamp}</span>
        </div>
        <div class="history-item-body">
          <div class="history-scale">Scale: <strong>1:${item.scaleRatio || '-'}</strong></div>
          <div class="history-calc">${item.inputStr} ➔ <strong class="history-res">${item.outputStr}</strong></div>
        </div>
        <div class="history-item-actions">
          <button class="hist-btn-copy" title="Copy Result">Copy</button>
          <button class="delete-hist-btn" title="Delete">✕</button>
        </div>
      </div>
    `).join('');

    dom.historyList.querySelectorAll('.hist-btn-copy').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = history[index];
        if (item) copyToClipboard(item.outputStr);
      });
    });

    dom.historyList.querySelectorAll('.delete-hist-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = history[index];
        if (item) {
          HistoryService.removeEntry(item.id);
          renderHistoryList();
        }
      });
    });
  }

  function toggleHistoryDrawer() {
    const isOpen = dom.historyDrawer.classList.contains('open');
    dom.historyDrawer.classList.toggle('open', !isOpen);
    dom.historyOverlay.classList.toggle('open', !isOpen);
    AudioService.playTick();
  }

  function handleExportCSV() {
    const csv = HistoryService.exportCSV();
    if (!csv) {
      showToast('History is empty');
      return;
    }
    downloadFile(csv, `architecture-helping-hand-history-${Date.now()}.csv`, 'text/csv');
    showToast('Exported history as CSV');
  }

  function handleExportMarkdown() {
    const md = HistoryService.exportMarkdown();
    if (!md) {
      showToast('History is empty');
      return;
    }
    downloadFile(md, `architecture-helping-hand-history-${Date.now()}.md`, 'text/markdown');
    showToast('Exported history as Markdown');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text) {
    if (!navigator.clipboard) {
      showToast(`Value: ${text}`);
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      AudioService.playCopySuccess();
      showToast(`Copied "${text}" to clipboard`);
    }).catch(() => {
      showToast(`Selected: ${text}`);
    });
  }

  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function updateSoundButtonUI() {
    if (!dom.soundToggleBtn) return;
    const enabled = AudioService.isEnabled();
    dom.soundToggleBtn.classList.toggle('muted', !enabled);
    dom.soundToggleBtn.title = enabled ? 'Mute Drafting Clicks' : 'Enable Drafting Clicks';
  }

  // =========================================================================
  // ATTACH GLOBAL EVENT LISTENERS
  // =========================================================================

  // Mode Tabs
  dom.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchMode(tab.dataset.mode);
    });
  });

  // Theme selector
  if (dom.themeSelect) {
    dom.themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      state.activeTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      StorageService.setItem('archiscale_theme', theme);
      AudioService.playTick();
    });
  }

  // Sound toggle
  if (dom.soundToggleBtn) {
    dom.soundToggleBtn.addEventListener('click', () => {
      AudioService.toggleSound();
      updateSoundButtonUI();
    });
  }

  // History Drawer
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

  if (dom.exportCsvBtn) dom.exportCsvBtn.addEventListener('click', handleExportCSV);
  if (dom.exportMdBtn) dom.exportMdBtn.addEventListener('click', handleExportMarkdown);

  // Shortcuts Modal
  if (dom.shortcutsHelpBtn) {
    dom.shortcutsHelpBtn.addEventListener('click', () => {
      dom.shortcutsModal.classList.add('open');
      dom.modalBackdrop.classList.add('open');
      AudioService.playTick();
    });
  }
  if (dom.closeShortcutsBtn) {
    dom.closeShortcutsBtn.addEventListener('click', () => {
      dom.shortcutsModal.classList.remove('open');
      dom.modalBackdrop.classList.remove('open');
    });
  }
  if (dom.modalBackdrop) {
    dom.modalBackdrop.addEventListener('click', () => {
      dom.shortcutsModal.classList.remove('open');
      dom.modalBackdrop.classList.remove('open');
    });
  }

  // Converter inputs & direction swap
  if (dom.inputDrawingVal) {
    dom.inputDrawingVal.addEventListener('input', () => {
      state.direction = 'drawing_to_real';
      calculateConverter();
    });
  }
  if (dom.inputRealVal) {
    dom.inputRealVal.addEventListener('input', () => {
      state.direction = 'real_to_drawing';
      calculateConverter();
    });
  }
  if (dom.selectDrawingUnit) {
    dom.selectDrawingUnit.addEventListener('change', (e) => {
      state.drawingUnit = e.target.value;
      calculateConverter();
    });
  }
  if (dom.selectRealUnit) {
    dom.selectRealUnit.addEventListener('change', (e) => {
      state.realUnit = e.target.value;
      calculateConverter();
    });
  }
  if (dom.customRatioInput) {
    dom.customRatioInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (val > 0) {
        state.scaleRatio = val;
        calculateConverter();
      }
    });
  }

  if (dom.swapDirectionBtn) {
    dom.swapDirectionBtn.addEventListener('click', () => {
      state.direction = state.direction === 'drawing_to_real' ? 'real_to_drawing' : 'drawing_to_real';
      AudioService.playSwapSound();
      calculateConverter();
    });
  }

  // Preset category filter tabs
  dom.presetCategoryTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.presetCategoryTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      populatePresetPills(btn.dataset.category);
      AudioService.playTick();
    });
  });

  // Copy buttons
  if (dom.btnCopyResult) {
    dom.btnCopyResult.addEventListener('click', () => {
      const outputVal = state.direction === 'drawing_to_real' ? dom.inputRealVal?.value : dom.inputDrawingVal?.value;
      const outputUnit = state.direction === 'drawing_to_real' ? state.realUnit : state.drawingUnit;
      const text = `${outputVal} ${outputUnit}`;
      copyToClipboard(text);

      HistoryService.addEntry({
        mode: 'Scale Converter',
        scaleRatio: state.scaleRatio,
        scaleStr: `1:${state.scaleRatio}`,
        inputStr: `${state.direction === 'drawing_to_real' ? state.drawingVal : state.realVal} ${state.direction === 'drawing_to_real' ? state.drawingUnit : state.realUnit}`,
        outputStr: text
      });
      renderHistoryList();
    });
  }

  // Rescaler inputs
  [dom.rescaleOrigInput, dom.rescaleOrigUnit, dom.rescaleOrigRatioSelect, dom.rescaleTargetRatioSelect, dom.rescaleTargetUnit].forEach(el => {
    if (el) el.addEventListener('input', calculateRescaler);
    if (el) el.addEventListener('change', calculateRescaler);
  });

  if (dom.btnCopyRescale) {
    dom.btnCopyRescale.addEventListener('click', () => {
      const text = `${dom.rescaleResultVal?.textContent} ${state.rescaleTargetUnit}`;
      copyToClipboard(text);
      HistoryService.addEntry({
        mode: 'Rescaler',
        scaleStr: `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
        inputStr: `${state.rescaleOrigVal} ${state.rescaleOrigUnit}`,
        outputStr: text
      });
      renderHistoryList();
    });
  }

  // Detector inputs
  [dom.detectPaperInput, dom.detectPaperUnit, dom.detectRealInput, dom.detectRealUnit].forEach(el => {
    if (el) el.addEventListener('input', calculateDetector);
    if (el) el.addEventListener('change', calculateDetector);
  });

  if (dom.btnApplyDetected) {
    dom.btnApplyDetected.addEventListener('click', () => {
      const res = detectScale({
        paperVal: state.detectPaperVal,
        paperUnitKey: state.detectPaperUnit,
        realVal: state.detectRealVal,
        realUnitKey: state.detectRealUnit
      });
      if (res.ratio !== null && res.ratio > 0) {
        state.scaleRatio = res.ratio;
        if (dom.customRatioInput) dom.customRatioInput.value = res.ratio;
        switchMode('converter');
        calculateConverter();
        showToast(`Applied scale 1:${res.ratio.toFixed(2)} to Converter`);
      } else {
        showToast('Please enter valid positive measurements to detect scale');
      }
    });
  }

  // Area / Volume Subtabs & Inputs
  dom.areaVolTypeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.areaVolTypeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.calcType = tab.dataset.type;
      if (dom.areaSection) dom.areaSection.classList.toggle('active', state.calcType === 'area');
      if (dom.volumeSection) dom.volumeSection.classList.toggle('active', state.calcType === 'volume');
      AudioService.playTick();
      calculateAreaVolume();
    });
  });

  dom.areaVolDirTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.areaVolDirTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.calcDirection = tab.dataset.dir;
      AudioService.playTick();
      calculateAreaVolume();
    });
  });

  [dom.areaInputVal, dom.areaInputUnit, dom.areaRatioSelect, dom.areaOutputUnit,
   dom.volumeInputVal, dom.volumeInputUnit, dom.volumeRatioSelect, dom.volumeOutputUnit].forEach(el => {
    if (el) el.addEventListener('input', calculateAreaVolume);
    if (el) el.addEventListener('change', calculateAreaVolume);
  });

  if (dom.btnCopyArea) {
    dom.btnCopyArea.addEventListener('click', () => {
      const text = `${dom.areaResultVal?.textContent} ${state.areaOutputUnit}`;
      copyToClipboard(text);
    });
  }
  if (dom.btnCopyVolume) {
    dom.btnCopyVolume.addEventListener('click', () => {
      const text = `${dom.volumeResultVal?.textContent} ${state.volumeOutputUnit}`;
      copyToClipboard(text);
    });
  }

  // Furniture Scaling Search & Categories
  if (dom.furnitureSearchInput) {
    dom.furnitureSearchInput.addEventListener('input', (e) => {
      state.furnitureSearchQuery = e.target.value;
      if (dom.furnitureSearchClear) {
        dom.furnitureSearchClear.style.display = state.furnitureSearchQuery ? 'block' : 'none';
      }
      renderFurnitureGrid();
    });
  }

  if (dom.furnitureSearchClear) {
    dom.furnitureSearchClear.addEventListener('click', () => {
      if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
      state.furnitureSearchQuery = '';
      dom.furnitureSearchClear.style.display = 'none';
      renderFurnitureGrid();
    });
  }

  dom.furnitureCategoryTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.furnitureCategoryTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.furnitureActiveCategory = btn.dataset.category;
      AudioService.playTick();
      renderFurnitureGrid();
    });
  });

  if (dom.furnitureScaleSelect) {
    dom.furnitureScaleSelect.addEventListener('change', () => {
      renderFurnitureGrid();
      calculateCustomFurniture();
    });
  }
  if (dom.furniturePaperUnitSelect) {
    dom.furniturePaperUnitSelect.addEventListener('change', () => {
      renderFurnitureGrid();
      calculateCustomFurniture();
    });
  }

  // Custom Furniture Inputs
  [dom.customFurnWInput, dom.customFurnDInput, dom.customFurnHInput, dom.customFurnUnitSelect].forEach(el => {
    if (el) el.addEventListener('input', calculateCustomFurniture);
    if (el) el.addEventListener('change', calculateCustomFurniture);
  });

  if (dom.btnCopyCustomFurn) {
    dom.btnCopyCustomFurn.addEventListener('click', () => {
      const text = `${dom.customFurnPaperW?.textContent} × ${dom.customFurnPaperD?.textContent}`;
      copyToClipboard(text);
    });
  }

  if (dom.btnSendCustomFurn) {
    dom.btnSendCustomFurn.addEventListener('click', () => {
      sendDimensionToConverter(state.customFurnW, state.customFurnUnit);
    });
  }

  // Reference Chart
  if (dom.refChartScaleSelect) {
    dom.refChartScaleSelect.addEventListener('change', renderReferenceChart);
  }
  if (dom.btnPrintChart) {
    dom.btnPrintChart.addEventListener('click', () => {
      window.print();
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

    if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (dom.swapDirectionBtn) dom.swapDirectionBtn.click();
    } else if (e.key === '1') {
      switchMode('converter');
    } else if (e.key === '2') {
      switchMode('rescale');
    } else if (e.key === '3') {
      switchMode('detect');
    } else if (e.key === '4') {
      switchMode('area-volume');
    } else if (e.key === '5') {
      switchMode('furniture');
    } else if (e.key === '6') {
      switchMode('reference');
    } else if (e.key.toLowerCase() === 'h') {
      toggleHistoryDrawer();
    } else if (e.key === '?') {
      if (dom.shortcutsHelpBtn) dom.shortcutsHelpBtn.click();
    } else if (e.key === 'Escape') {
      if (dom.shortcutsModal) dom.shortcutsModal.classList.remove('open');
      if (dom.modalBackdrop) dom.modalBackdrop.classList.remove('open');
      if (dom.historyDrawer) dom.historyDrawer.classList.remove('open');
      if (dom.historyOverlay) dom.historyOverlay.classList.remove('open');
    }
  });
}
