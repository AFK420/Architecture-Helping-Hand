/**
 * Architecture Helping Hand - Quick Dimension Strip View (Micro-Tool)
 * Extracted from ui/app.js during Stabilization 1. Owns the glance strip:
 * evaluation, rendering, scale/unit application, copy formats, and
 * cross-tool handoffs. Cross-feature actions route through the shared
 * context's views.callController.
 */

import { QUICK_DIM_STORAGE_KEY, DEFAULT_QUICK_SCALES } from '../../core/quick-dimension.js';
import { evaluateQuickDimension, formatQuickDimensionClipboard, createQuickHandoffPayload } from '../../core/quick-dimension.js';

export function createQuickDimensionView(context) {
  const {
    state, dom, showToast, copyToClipboard, AudioService, StorageService,
    HistoryService, switchMode, views, renderHistoryListRef
  } = context;

  function saveQuickDimSettings() {
    try {
      StorageService.setItem(QUICK_DIM_STORAGE_KEY, JSON.stringify({
        isOpen: state.quickDimension.isOpen,
        pinned: state.quickDimension.pinned,
        selectedScale: state.quickDimension.selectedScale,
        displayUnit: state.quickDimension.displayUnit,
        drawingUnit: state.quickDimension.drawingUnit,
        precision: state.quickDimension.precision,
        mode: state.quickDimension.mode,
        showContext: state.quickDimension.showContext
      }));
    } catch (e) {}
  }

  function toggleQuickDimension(forceState) {
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !state.quickDimension.isOpen;
    state.quickDimension.isOpen = shouldOpen;
    if (dom.quickDimStrip) {
      dom.quickDimStrip.hidden = !shouldOpen;
    }
    if (dom.quickDimToggleBtn) {
      dom.quickDimToggleBtn.classList.toggle('active', shouldOpen);
    }
    if (shouldOpen) {
      if (dom.quickDimInput) {
        dom.quickDimInput.focus();
        dom.quickDimInput.select();
      }
      parseAndEvaluateQuickDimension(false);
    }
    saveQuickDimSettings();
  }

  function toggleQuickDimPin() {
    state.quickDimension.pinned = !state.quickDimension.pinned;
    if (dom.quickDimPinBtn) {
      dom.quickDimPinBtn.classList.toggle('pinned', state.quickDimension.pinned);
    }
    saveQuickDimSettings();
    showToast(state.quickDimension.pinned ? 'Quick Dimension Strip pinned open' : 'Quick Dimension Strip unpinned');
  }

  function applyQuickScale(scaleRatio) {
    if (typeof scaleRatio !== 'number' || isNaN(scaleRatio) || scaleRatio <= 0) return;
    state.quickDimension.selectedScale = scaleRatio;
    if (dom.quickDimScaleChips) {
      dom.quickDimScaleChips.querySelectorAll('.quick-scale-chip').forEach(chip => {
        const s = parseInt(chip.dataset.scale, 10);
        chip.classList.toggle('active', s === scaleRatio);
      });
    }
    if (dom.quickDimCustomScaleInput) {
      const isPreset = DEFAULT_QUICK_SCALES.includes(scaleRatio);
      dom.quickDimCustomScaleInput.value = isPreset ? '' : scaleRatio;
    }
    parseAndEvaluateQuickDimension(false);
    AudioService.playTick();
  }

  function parseAndEvaluateQuickDimension(isExplicitRun = false) {
    const rawInput = dom.quickDimInput ? dom.quickDimInput.value : state.quickDimension.rawInput;
    state.quickDimension.rawInput = rawInput;

    const evalResult = evaluateQuickDimension(rawInput, {
      selectedScale: state.quickDimension.selectedScale,
      scales: state.quickDimension.scales,
      displayUnit: state.quickDimension.displayUnit,
      drawingUnit: state.quickDimension.drawingUnit,
      precision: state.quickDimension.precision,
      mode: state.quickDimension.mode
    });

    state.quickDimension.lastResult = evalResult;
    renderQuickDimensionResults(evalResult);

    if (isExplicitRun && evalResult.valid) {
      AudioService.playSuccess();
    }
  }

  function renderQuickDimensionResults(res) {
    if (!res) return;

    if (dom.quickDimStatusBadge) {
      dom.quickDimStatusBadge.textContent = res.valid ? 'VALID' : (res.status === 'EMPTY' ? 'READY' : 'INVALID');
      dom.quickDimStatusBadge.className = res.valid ? 'badge-status-valid' : (res.status === 'EMPTY' ? 'badge-status-ready' : 'badge-status-invalid');
    }

    if (dom.quickDimErrorMsg) {
      if (res.valid || res.status === 'EMPTY') {
        dom.quickDimErrorMsg.style.display = 'none';
        dom.quickDimErrorMsg.textContent = '';
      } else {
        dom.quickDimErrorMsg.style.display = 'block';
        dom.quickDimErrorMsg.textContent = res.error || 'Invalid dimension or expression';
      }
    }

    // Hero Readouts
    if (dom.quickDimRealVal) {
      dom.quickDimRealVal.textContent = res.valid ? res.realFormatted : '---';
    }
    if (dom.quickDimSelectedScaleLabel) {
      dom.quickDimSelectedScaleLabel.textContent = `DRAWING @ 1:${res.selectedScale}`;
    }
    if (dom.quickDimDrawingVal) {
      dom.quickDimDrawingVal.textContent = res.valid ? res.selectedDrawingFormatted : '---';
    }

    // Common Unit Equivalents
    if (res.valid && res.commonEquivalents) {
      const mmEq = res.commonEquivalents.find(e => e.unit === 'mm');
      const cmEq = res.commonEquivalents.find(e => e.unit === 'cm');
      const mEq = res.commonEquivalents.find(e => e.unit === 'm');
      const inEq = res.commonEquivalents.find(e => e.unit === 'in');
      const ftinEq = res.commonEquivalents.find(e => e.unit === 'ft-in');

      if (dom.quickEquivMm) dom.quickEquivMm.textContent = mmEq ? mmEq.formatted : '---';
      if (dom.quickEquivCm) dom.quickEquivCm.textContent = cmEq ? cmEq.formatted : '---';
      if (dom.quickEquivM) dom.quickEquivM.textContent = mEq ? mEq.formatted : '---';
      if (dom.quickEquivIn) dom.quickEquivIn.textContent = inEq ? inEq.formatted : '---';
      if (dom.quickEquivFtin) dom.quickEquivFtin.textContent = ftinEq ? ftinEq.formatted : '---';
    } else {
      if (dom.quickEquivMm) dom.quickEquivMm.textContent = '---';
      if (dom.quickEquivCm) dom.quickEquivCm.textContent = '---';
      if (dom.quickEquivM) dom.quickEquivM.textContent = '---';
      if (dom.quickEquivIn) dom.quickEquivIn.textContent = '---';
      if (dom.quickEquivFtin) dom.quickEquivFtin.textContent = '---';
    }

    // Multi-Scale Matrix Grid
    if (dom.quickDimMatrixGrid) {
      if (res.valid && res.scaleMatrix && res.scaleMatrix.length > 0) {
        dom.quickDimMatrixGrid.innerHTML = res.scaleMatrix.map(item => `
          <div class="quick-matrix-cell ${item.isSelected ? 'selected' : ''}" data-scale="${item.scale}">
            <span class="quick-matrix-scale">${item.scaleFormatted}</span>
            <span class="quick-matrix-val">${item.drawingFormatted}</span>
          </div>
        `).join('');

        dom.quickDimMatrixGrid.querySelectorAll('.quick-matrix-cell').forEach(cell => {
          cell.addEventListener('click', () => {
            const sc = parseInt(cell.dataset.scale, 10);
            applyQuickScale(sc);
          });
        });
      } else {
        dom.quickDimMatrixGrid.innerHTML = '';
      }
    }

    // Context Card
    if (dom.quickDimContextCard && dom.quickDimContextBody) {
      if (res.valid && res.context) {
        if (res.context.hasReference && res.context.matches.length > 0) {
          dom.quickDimContextBody.innerHTML = res.context.matches.map(m => `
            <div><strong>${m.label}:</strong> ${m.detail}</div>
          `).join('') + `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;"><em>${res.context.disclaimer}</em></div>`;
        } else {
          dom.quickDimContextBody.textContent = res.context.message || 'No stored reference for this dimension.';
        }
      } else {
        dom.quickDimContextBody.textContent = 'Enter a dimension to view contextual reference standards.';
      }
    }
  }

  function copyQuickDimension(formatType) {
    const res = state.quickDimension.lastResult;
    if (!res || !res.valid) {
      showToast('Enter a valid dimension to copy', 'warning');
      return;
    }
    const text = formatQuickDimensionClipboard(res, formatType);
    if (!text) return;
    copyToClipboard(text, `Quick Dimension (${formatType.replace(/_/g, ' ')})`);
  }

  function handoffQuickDimension(targetTool) {
    const res = state.quickDimension.lastResult;
    if (!res || !res.valid) {
      showToast('Enter a valid dimension first', 'warning');
      return;
    }
    const payload = createQuickHandoffPayload(res, targetTool);
    if (!payload) return;

    if (targetTool === 'workspace') {
      state.workspace.entries.push(payload.entry);
      views.callController('workspace', 'saveWorkspace');
      switchMode('workspace');
      views.callController('workspace', 'renderWorkspace');
      showToast(`Added "${payload.entry.name}" to Dimension Workspace`);
    } else if (targetTool === 'multiscale') {
      if (dom.multiscaleInput) {
        dom.multiscaleInput.value = payload.dimensionInput;
      }
      switchMode('multiscale');
      views.callController('multiscale', 'calculateMultiScale', true);
      showToast('Loaded dimension in Multi-Scale Comparison');
    } else if (targetTool === 'chain') {
      state.activeChain.segments.push(payload.segment);
      views.callController('chains', 'saveChain');
      switchMode('chains');
      views.callController('chains', 'calculateAndRenderChain', true);
      showToast(`Added "${payload.segment.name}" to Dimension Chain`);
    } else if (targetTool === 'cad_clipboard') {
      state.cadClipboard.manualInput = payload.manualInput;
      state.cadClipboard.source = 'manual';
      if (dom.cadSourceSelect) dom.cadSourceSelect.value = 'manual';
      if (dom.cadManualGroup) dom.cadManualGroup.style.display = 'block';
      if (dom.cadManualInput) dom.cadManualInput.value = payload.manualInput;
      switchMode('cad_clipboard');
      views.callController('cad_clipboard', 'renderCadClipboard');
      showToast('Transferred dimensions to CAD Clipboard');
    } else if (targetTool === 'cad_handoff') {
      views.callController('cad_handoff', 'openCadHandoffWithSource', 'quick');
    } else if (targetTool === 'journal') {
      HistoryService.addEntry(payload);
      if (typeof renderHistoryListRef === 'function') renderHistoryListRef();
      AudioService.playTick();
      showToast('Saved snapshot to Calculation Journal');
    }
  }

  return {
    id: 'quick_dimension',
    mount() {},
    getController() {
      return {
        toggleQuickDimension,
        toggleQuickDimPin,
        applyQuickScale,
        parseAndEvaluateQuickDimension,
        copyQuickDimension,
        handoffQuickDimension,
        saveQuickDimSettings
      };
    }
  };
}
