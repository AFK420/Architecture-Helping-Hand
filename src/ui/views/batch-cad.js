/**
 * Architecture Helping Hand - Batch CAD Conversion View (Mode 12)
 * Extracted from ui/app.js during Stabilization 1. Owns batch parsing,
 * conversion, result rendering, row management, and multi-stream handoffs.
 */

import { BATCH_STORAGE_KEY, BATCH_PRESETS } from '../../core/batch-cad.js';
import {
  detectBatchDelimiter,
  parseBatchInput,
  convertBatch,
  filterBatchRows,
  formatBatchResults,
  convertBatchToWorkspaceGroup,
  convertBatchToDimensionChain
} from '../../core/batch-cad.js';

export function createBatchCadView(context) {
  const {
    state, dom, showToast, copyToClipboard, downloadFile, setUnifiedResultState,
    setRunButtonState, AudioService, StorageService, HistoryService, switchMode,
    views
  } = context;

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

  /**
   * Escapes user-entered batch text for safe interpolation into row HTML.
   * Row names come from pasted user input, so `<`, `>`, `&`, quotes must be
   * escaped before entering tr.innerHTML.
   */
  function escapeBatchCell(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
          <td style="font-weight: 600; color: var(--text-primary);">${escapeBatchCell(row.name)}</td>
          <td><span class="type-badge ${roleBadgeClass}" style="font-size: 0.65rem;">${roleTag}</span></td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${escapeBatchCell(row.sourceFormatted)}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.85rem; font-weight: 700; color: ${row.valid ? 'var(--accent-primary)' : 'var(--color-error, #ef4444)'};">${escapeBatchCell(row.targetFormatted)}</td>
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

    views.callController('workspace', 'saveWorkspace');
    switchMode('workspace');
    views.callController('workspace', 'renderWorkspace');
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
    views.callController('multiscale', 'calculateMultiScale');
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
    views.callController('chains', 'calculateAndRenderChain', true);
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
    views.callController('cad_clipboard', 'renderCadClipboard', true);
    AudioService.playTick();
    showToast('Loaded batch numbers into CAD Clipboard');
  }

  return {
    id: 'batch_cad',
    mount() {},
    getController() {
      return {
        parseAndConvertBatch,
        renderBatchResults,
        updateBatchModeVisibility,
        applyBatchPreset,
        deleteBatchRow,
        copyBatchData,
        sendBatchToWorkspace,
        sendBatchToMultiScale,
        sendBatchToChains,
        sendBatchToCadClipboard,
        saveBatchCadSettings
      };
    }
  };
}
