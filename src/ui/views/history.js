/**
 * Architecture Helping Hand - Calculation Journal View (Global Drawer)
 * Extracted from ui/app.js during Stabilization 1. Owns the journal drawer:
 * history rendering, per-entry actions (restore/copy/remove), snapshot
 * logging for every tool, and drawer toggling.
 *
 * The restore logic reaches each feature's controller through the shared
 * context's views.callController, so the journal never imports views.
 */

import { calculateWorkspaceTotals } from '../../core/dimension-workspace.js';

export function createHistoryView(context) {
  const {
    state, dom, showToast, copyToClipboard, AudioService, HistoryService,
    switchMode, views, calculateCustomFurnitureRef, renderWorkspaceRef,
    toggleHistoryDrawerRef
  } = context;

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
        views.callController('converter', 'calculateConverter');
        break;
      case 'rescale':
        switchMode('rescale');
        if (dom.rescaleOrigRatio) dom.rescaleOrigRatio.value = snap.origRatio;
        if (dom.rescaleOrigVal) dom.rescaleOrigVal.value = snap.origVal;
        if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.value = snap.origUnit;
        if (dom.rescaleTargetRatio) dom.rescaleTargetRatio.value = snap.targetRatio;
        if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.value = snap.targetUnit;
        views.callController('rescale', 'calculateRescaler');
        break;
      case 'detector':
        switchMode('detector');
        if (dom.detectorPaperVal) dom.detectorPaperVal.value = snap.paperVal;
        if (dom.detectorPaperUnit) dom.detectorPaperUnit.value = snap.paperUnit;
        if (dom.detectorRealVal) dom.detectorRealVal.value = snap.realVal;
        if (dom.detectorRealUnit) dom.detectorRealUnit.value = snap.realUnit;
        views.callController('detector', 'calculateDetector');
        break;
      case 'area_volume':
        switchMode('area_volume');
        if (dom.areavolRatioInput) dom.areavolRatioInput.value = snap.ratio;
        if (dom.areavolInputVal) dom.areavolInputVal.value = snap.val;
        state.calcType = snap.type || 'area';
        state.calcDirection = snap.direction || 'drawing_to_real';
        dom.areavolTypeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === state.calcType));
        dom.areavolDirBtns.forEach(b => b.classList.toggle('active', b.dataset.dir === state.calcDirection));
        views.callController('area_volume', 'updateAreaVolumeUnitSelects');
        if (dom.areavolInputUnit) dom.areavolInputUnit.value = snap.inUnit;
        if (dom.areavolOutputUnit) dom.areavolOutputUnit.value = snap.outUnit;
        views.callController('area_volume', 'calculateAreaVolume');
        break;
      case 'furniture':
        switchMode('furniture');
        if (dom.customFurnName) dom.customFurnName.value = snap.name || 'Custom Piece';
        if (dom.customFurnW) dom.customFurnW.value = snap.w;
        if (dom.customFurnD) dom.customFurnD.value = snap.d;
        if (dom.customFurnUnit) dom.customFurnUnit.value = snap.unit || 'cm';
        if (dom.furnScaleRatioInput) dom.furnScaleRatioInput.value = snap.ratio || 50;
        if (dom.furnPaperUnitSelect) dom.furnPaperUnitSelect.value = snap.paperUnit || 'cm';
        if (typeof calculateCustomFurnitureRef === 'function') calculateCustomFurnitureRef();
        break;
      case 'workspace':
        switchMode('workspace');
        if (snap.scaleRatio) {
          state.workspace.scaleRatio = snap.scaleRatio;
        }
        if (snap.displayUnit) {
          state.workspace.displayUnit = snap.displayUnit;
        }
        if (typeof renderWorkspaceRef === 'function') renderWorkspaceRef();
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
        views.callController('expression', 'calculateExpression', true);
        break;
      case 'chains':
        switchMode('chains');
        if (snap.name && dom.chainsNameInput) dom.chainsNameInput.value = snap.name;
        if (snap.scaleRatio && dom.chainsScaleSelect) dom.chainsScaleSelect.value = String(snap.scaleRatio);
        if (snap.defaultUnit && dom.chainsUnitSelect) dom.chainsUnitSelect.value = snap.defaultUnit;
        views.callController('chains', 'calculateAndRenderChain', true);
        break;
    }
    AudioService.playTick();
    showToast(`↺ Restored calculation into ${item.operation || item.mode}`);
    if (window.innerWidth <= 768) {
      if (typeof toggleHistoryDrawerRef === 'function') toggleHistoryDrawerRef();
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

  return {
    id: 'history',
    mount() {},
    getController() {
      return { renderHistoryList, restoreCalculationById, logCurrentCalculationToHistory, toggleHistoryDrawer };
    }
  };
}
