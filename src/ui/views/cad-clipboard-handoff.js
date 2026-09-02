/**
 * Architecture Helping Hand - CAD Clipboard & CAD Handoff Views (Modes 11, 13)
 * Extracted from ui/app.js during Stabilization 1.
 *   - Mode 11: legacy CAD Clipboard formatting surface (per-format presets)
 *   - Mode 13: target-profile handoff (Rhino/AutoCAD/SketchUp/Generic)
 * Both read the same tool state and share the cad-clipboard / cad-targets
 * core engines; no formatting math lives here.
 */

import { CAD_STORAGE_KEY, CAD_FORMAT_PRESETS } from '../../core/cad-clipboard.js';
import {
  formatCadWorkspace,
  formatCadChain,
  formatCadExpression,
  formatCadMultiScale,
  formatManualCadInput,
  getCadFormatSummary
} from '../../core/cad-clipboard.js';
import {
  CAD_TARGET_PROFILES,
  CAD_HANDOFF_STORAGE_KEY,
  buildCadHandoffPayload,
  getCadHandoffSummary,
  validateCadHandoffSelection
} from '../../core/cad-targets.js';

export function createCadClipboardView(context) {
  const { state, dom, showToast, copyToClipboard, setUnifiedResultState, AudioService, StorageService, switchMode } = context;

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

  return {
    id: 'cad_clipboard',
    mount() {},
    getController() {
      return { renderCadClipboard, copyCadClipboardData, applyCadPreset, openCadClipboardWithSource, saveCadClipboardSettings };
    }
  };
}

export function createCadHandoffView(context) {
  const { state, dom, showToast, copyToClipboard, setUnifiedResultState, AudioService, StorageService, switchMode } = context;

  function saveCadHandoffSettings() {
    try {
      const { lastPayload, ...serializable } = state.cadHandoff;
      void lastPayload;
      StorageService.setItem(CAD_HANDOFF_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {}
  }

  /**
   * Collects the current source data for the handoff payload builder from
   * whatever tool state is live. Never recomputes math — only reads the
   * last valid results the tools already produced.
   */
  function getCadHandoffSourceData() {
    const h = state.cadHandoff;
    switch (h.source) {
      case 'workspace':
        return {
          workspace: state.workspace,
          scope: h.workspaceScope || 'all',
          selectedIds: state.workspaceSelectedIds
        };
      case 'expression':
        return { result: state.lastValidExpression };
      case 'multiscale':
        return { result: state.lastValidMultiScale };
      case 'chain':
        return { result: state.lastValidChain, chainLayout: h.chainLayout || 'segments' };
      case 'batch':
        return {
          result: state.batchCad.lastResult,
          selectedOnly: h.batchScope === 'selected',
          selectedIds: state.batchCad.selectedIds
        };
      case 'quick':
        return { result: state.quickDimension.lastResult };
      case 'manual':
        return { rawText: dom.handoffManualInput?.value || h.manualInput || '' };
      default:
        return {};
    }
  }

  function renderCadHandoff(isExplicitRun = false) {
    const h = state.cadHandoff;

    // Sync form controls into state
    if (dom.handoffSourceSelect) h.source = dom.handoffSourceSelect.value || h.source;
    if (dom.handoffFormatSelect) h.format = dom.handoffFormatSelect.value || h.format;
    if (dom.handoffChainLayoutSelect) h.chainLayout = dom.handoffChainLayoutSelect.value || h.chainLayout;
    if (dom.handoffWorkspaceScopeSelect) h.workspaceScope = dom.handoffWorkspaceScopeSelect.value || h.workspaceScope;
    if (dom.handoffBatchScopeSelect) h.batchScope = dom.handoffBatchScopeSelect.value || h.batchScope;
    if (dom.handoffUnitSelect) h.unit = dom.handoffUnitSelect.value === 'auto' ? null : dom.handoffUnitSelect.value;
    if (dom.handoffPrecisionSelect) h.precision = dom.handoffPrecisionSelect.value === 'auto' ? null : parseInt(dom.handoffPrecisionSelect.value, 10);
    if (dom.handoffSuffixSelect) h.suffix = dom.handoffSuffixSelect.value || h.suffix;

    // Conditional groups
    if (dom.handoffManualGroup) dom.handoffManualGroup.style.display = h.source === 'manual' ? 'block' : 'none';
    if (dom.handoffChainLayoutGroup) dom.handoffChainLayoutGroup.style.display = h.source === 'chain' ? 'block' : 'none';
    if (dom.handoffWorkspaceScopeGroup) dom.handoffWorkspaceScopeGroup.style.display = h.source === 'workspace' ? 'block' : 'none';
    if (dom.handoffBatchScopeGroup) dom.handoffBatchScopeGroup.style.display = h.source === 'batch' ? 'block' : 'none';

    // Target pills sync + description
    dom.handoffTargetPills?.querySelectorAll('.cad-source-pill').forEach(pill => {
      const isActive = pill.dataset.target === h.target;
      pill.classList.toggle('active', isActive);
      pill.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
    const profile = CAD_TARGET_PROFILES[h.target];
    if (dom.handoffTargetDescription && profile) {
      dom.handoffTargetDescription.textContent = profile.description;
    }
    if (dom.handoffCopyTargetLabel && profile) {
      dom.handoffCopyTargetLabel.textContent = profile.label.toUpperCase();
    }

    // Build payload via the single core entry point
    let payload;
    const validation = validateCadHandoffSelection(h.target, h.format, h.source);
    if (!validation.ok) {
      payload = { text: '', count: 0, empty: true, targetLabel: '', modeLabel: '' };
      if (dom.handoffSummaryBadge) dom.handoffSummaryBadge.textContent = validation.error;
    } else {
      payload = buildCadHandoffPayload(h.source, getCadHandoffSourceData(), {
        targetId: h.target,
        modeId: h.format,
        unit: h.unit || undefined,
        precision: typeof h.precision === 'number' ? h.precision : undefined,
        suffix: h.suffix,
        scaleRatio: state.workspace?.scaleRatio || state.lastValidChain?.scaleRatio || 50,
        chainLayout: h.chainLayout
      });
      if (dom.handoffSummaryBadge) {
        dom.handoffSummaryBadge.textContent = payload.empty
          ? 'No values available — run the source tool first'
          : getCadHandoffSummary(payload);
      }
    }

    h.lastPayload = payload;

    if (dom.handoffPreviewBox) {
      dom.handoffPreviewBox.value = payload.text;
    }

    setUnifiedResultState({
      toolPrefix: 'handoff',
      status: payload.empty ? (validation.ok ? 'ready' : 'error') : 'success',
      errorText: validation.ok ? '' : validation.error
    });

    saveCadHandoffSettings();

    if (isExplicitRun) {
      AudioService.playTick();
    }
  }

  function copyCadHandoffPayload() {
    const payload = state.cadHandoff.lastPayload;
    const profile = CAD_TARGET_PROFILES[state.cadHandoff.target];
    const label = profile ? `Payload for ${profile.label}` : 'CAD payload';

    if (!payload || payload.empty || !payload.text || !payload.text.trim()) {
      showToast('No CAD payload to copy — run the source tool first', 'warning');
      return;
    }

    copyToClipboard(payload.text, label);
  }

  function openCadHandoffWithSource(sourceKey) {
    state.cadHandoff.source = sourceKey;
    if (dom.handoffSourceSelect) dom.handoffSourceSelect.value = sourceKey;
    switchMode('cad_handoff');
    renderCadHandoff(true);
    AudioService.playTick();
    showToast(`Loaded ${sourceKey.toUpperCase()} data into CAD Handoff`);
  }

  return {
    id: 'cad_handoff',
    mount() {},
    getController() {
      return { renderCadHandoff, copyCadHandoffPayload, openCadHandoffWithSource, saveCadHandoffSettings };
    }
  };
}
