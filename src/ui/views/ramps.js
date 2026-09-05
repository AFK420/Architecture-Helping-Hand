/**
 * Architecture Helping Hand - Ramp Calculator View (Mode 15)
 * Architectural Tools Phase: Ramps. Owns the ramp mode's input handling,
 * result rendering, SVG diagram injection, target comparison table,
 * available-run analysis display, and quick actions. All math lives in
 * src/core/ramps.js; persistence routes through the shared context
 * (ProjectStore, Journal, Workspace, CAD views).
 */

import {
  RAMP_INPUT_MODES,
  RAMP_REFERENCE_DEFAULTS,
  calculateRamp,
  analyzeAvailableRun,
  buildTargetComparison,
  generateRampSVG
} from '../../core/ramps.js';
import { getBuildingCode, inspectRampCompliance } from '../../core/building-codes.js';
import { parseInput } from '../../core/parser.js';
import { createDimensionEntry } from '../../core/dimension-workspace.js';
import { UNITS } from '../../core/units.js';
import { createRampEntity } from '../../core/entities.js';

const RAMPS_PREFS_KEY = 'archiscale_ramps_prefs'; // user preferences only

export function createRampsView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    HistoryService, switchMode, views, projectStore, StorageService, copyToClipboard
  } = context;

  function savePrefs() {
    try {
      StorageService.setItem(RAMPS_PREFS_KEY, JSON.stringify({
        mode: state.ramps.mode,
        displayUnit: state.ramps.displayUnit
      }));
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      const raw = StorageService.getItem(RAMPS_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  /** Parses a user length field ("1.2m", "1200mm", "4'6\"") to meters. */
  function parseLengthField(el, fallbackUnit) {
    if (!el) return null;
    const raw = (el.value || '').trim();
    if (!raw) return null;
    const res = parseInput(raw, { allowNegative: false });
    if (!res.isValid || res.value <= 0) return null;
    const unitKey = res.detectedUnit || fallbackUnit;
    return res.value * UNITS[unitKey].toMeters;
  }

  function currentReferences() {
    const readRatio = (el, fallback) => {
      const n = parseFloat(el?.value);
      return isFinite(n) && n > 0 ? n : fallback;
    };
    return {
      slope: {
        targetRatio: readRatio(dom.rampsRefTarget, RAMP_REFERENCE_DEFAULTS.slope.targetRatio),
        minRatio: readRatio(dom.rampsRefMin, RAMP_REFERENCE_DEFAULTS.slope.minRatio),
        maxRatio: readRatio(dom.rampsRefMax, RAMP_REFERENCE_DEFAULTS.slope.maxRatio)
      }
    };
  }

  function syncModeVisibility() {
    const mode = state.ramps.mode;
    const show = (el, on) => { if (el) el.style.display = on ? 'block' : 'none'; };
    show(dom.rampsRiseGroup, mode !== RAMP_INPUT_MODES.RUN_DESIRED_SLOPE);
    show(dom.rampsSlopeGroup, mode === RAMP_INPUT_MODES.RISE_DESIRED_SLOPE || mode === RAMP_INPUT_MODES.RUN_DESIRED_SLOPE);
    show(dom.rampsRunGroup, mode !== RAMP_INPUT_MODES.RISE_DESIRED_SLOPE);
  }

  function showError(message) {
    if (dom.rampsErrorMsg) {
      dom.rampsErrorMsg.textContent = `⚠️ ${message}`;
      dom.rampsErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'ramps', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.rampsErrorMsg) {
      dom.rampsErrorMsg.style.display = 'none';
      dom.rampsErrorMsg.textContent = '';
    }
  }

  function calculate(isExplicitRun = false) {
    const mode = state.ramps.mode;
    const input = { mode, displayUnit: state.ramps.displayUnit };

    if (mode !== RAMP_INPUT_MODES.RUN_DESIRED_SLOPE) {
      const riseM = parseLengthField(dom.rampsRise, 'm');
      if (riseM === null) {
        renderInvalid(isExplicitRun, 'Rise must be greater than zero (e.g. 1.2m or 1200mm).');
        return;
      }
      input.rise = riseM;
    }
    if (mode === RAMP_INPUT_MODES.RISE_DESIRED_SLOPE || mode === RAMP_INPUT_MODES.RUN_DESIRED_SLOPE) {
      const pct = parseFloat(dom.rampsSlope?.value);
      if (!isFinite(pct) || pct <= 0) {
        renderInvalid(isExplicitRun, 'Slope must be greater than zero (e.g. 8.33 for 1:12).');
        return;
      }
      input.slopePercent = pct;
    }
    if (mode !== RAMP_INPUT_MODES.RISE_DESIRED_SLOPE) {
      const runM = parseLengthField(dom.rampsRun, 'm');
      if (runM === null) {
        renderInvalid(isExplicitRun, 'Run must be greater than zero (e.g. 14.4m).');
        return;
      }
      input.run = runM;
    }
    input.references = currentReferences();

    const result = calculateRamp(input);
    if (!result.valid) {
      state.ramps.lastResult = null;
      renderInvalid(isExplicitRun, result.errorMessage);
      return;
    }

    clearError();
    state.ramps.lastResult = result;
    renderResult(result);
    renderTargets();

    setUnifiedResultState({
      toolPrefix: 'ramps',
      status: 'success',
      context: { 'Slope': result.formatted.slopePercent, 'Ratio': result.formatted.ratio }
    });

    if (isExplicitRun) AudioService.playTick();
  }

  function renderInvalid(isExplicitRun, message) {
    clearResultPanels();
    showError(message);
    if (isExplicitRun) AudioService.playTick();
  }

  function clearResultPanels() {
    if (dom.rampsHeroVal) dom.rampsHeroVal.textContent = '—';
    if (dom.rampsSummaryBadge) dom.rampsSummaryBadge.textContent = '—';
    ['rampsRiseVal', 'rampsRunVal', 'rampsSlopeVal', 'rampsRatioVal', 'rampsAngleVal', 'rampsFlightVal'].forEach(k => {
      if (dom[k]) dom[k].textContent = '—';
    });
    if (dom.rampsSvgWrap) dom.rampsSvgWrap.innerHTML = '';
    if (dom.rampsCodeInspectorWrap) dom.rampsCodeInspectorWrap.innerHTML = '';
    if (dom.rampsRunAnalysis) dom.rampsRunAnalysis.style.display = 'none';
    if (dom.rampsRefStatus) {
      dom.rampsRefStatus.textContent = '—';
      dom.rampsRefStatus.className = 'type-badge badge-seg';
    }
    if (dom.rampsRefDetail) dom.rampsRefDetail.textContent = '';
  }

  function renderResult(result) {
    const f = result.formatted;
    const isRunMode = result.mode === RAMP_INPUT_MODES.RISE_DESIRED_SLOPE || result.mode === RAMP_INPUT_MODES.RUN_DESIRED_SLOPE;

    // Hero: the value the mode solved for
    if (dom.rampsHeroVal) dom.rampsHeroVal.textContent = isRunMode ? f.run : (result.mode === RAMP_INPUT_MODES.RUN_DESIRED_SLOPE ? f.rise : f.slopePercent);
    if (dom.rampsHeroLabel) {
      dom.rampsHeroLabel.textContent = isRunMode ? 'REQUIRED RUN' : (result.mode === RAMP_INPUT_MODES.RUN_DESIRED_SLOPE ? 'REQUIRED RISE' : 'ACHIEVED SLOPE');
    }
    if (dom.rampsSummaryBadge) {
      dom.rampsSummaryBadge.textContent = `${f.slopePercent} · ${f.ratio} · ${f.angle}`;
    }

    if (dom.rampsRiseVal) dom.rampsRiseVal.textContent = f.rise;
    if (dom.rampsRunVal) dom.rampsRunVal.textContent = f.run;
    if (dom.rampsSlopeVal) dom.rampsSlopeVal.textContent = f.slopePercent;
    if (dom.rampsRatioVal) dom.rampsRatioVal.textContent = f.ratio;
    if (dom.rampsAngleVal) dom.rampsAngleVal.textContent = f.angle;
    if (dom.rampsFlightVal) dom.rampsFlightVal.textContent = f.flightLength;

    // SVG diagram from actual geometry
    if (dom.rampsSvgWrap) {
      dom.rampsSvgWrap.innerHTML = generateRampSVG(result, { width: 520, height: 220 });
    }

    // Building Code Compliance Inspection
    if (dom.rampsCodeInspectorWrap) {
      const selectedCodeId = dom.rampsCodeSelect?.value || 'jnbc';
      const inspection = inspectRampCompliance(result, selectedCodeId);
      const statusClass = inspection.overallStatus === 'pass' ? 'status-pass' : (inspection.overallStatus === 'warn' ? 'status-warn' : 'status-fail');
      const badgeClass = inspection.overallStatus === 'pass' ? 'badge-pass' : (inspection.overallStatus === 'warn' ? 'badge-warn' : 'badge-fail');
      const badgeIcon = inspection.overallStatus === 'pass' ? '✓' : (inspection.overallStatus === 'warn' ? '⚠️' : '✗');
      const badgeText = inspection.overallStatus === 'pass' ? 'PASS · مطابق' : (inspection.overallStatus === 'warn' ? 'ADVISORY · تنبيه' : 'VIOLATION · مخالف');

      dom.rampsCodeInspectorWrap.innerHTML = `
        <div class="code-inspector-card ${statusClass}">
          <div class="code-inspector-header">
            <div class="code-inspector-title">
              <span>${inspection.code.flag}</span>
              <span>${inspection.code.name}</span>
            </div>
            <span class="code-badge-pill ${badgeClass}">
              <span>${badgeIcon}</span>
              <span>${badgeText}</span>
            </span>
          </div>
          <div class="code-inspector-summary">
            <span>${inspection.summaryText}</span>
            <span class="code-inspector-arabic">${inspection.summaryArabic}</span>
          </div>
          <div class="code-checks-list">
            ${inspection.checks.map(c => `
              <div class="code-check-item">
                <span class="code-check-icon">${c.status === 'pass' ? '🟢' : (c.status === 'warn' ? '🟡' : '🔴')}</span>
                <span class="code-check-label">${c.label}</span>
                <span class="code-check-val">${c.value}</span>
                <span class="code-check-rule">${c.rule}</span>
              </div>
            `).join('')}
          </div>
          <div class="code-citation-footer">
            <span><strong>Standard Citation:</strong> ${inspection.code.citation}</span>
            <span>Legal Clause: ${inspection.checks[0]?.citation || ''}</span>
          </div>
        </div>
      `;
    }

    // Available-run analysis for modes with an explicit available run
    if (dom.rampsRunAnalysis && dom.rampsRunAnalysisBody) {
      if (result.mode === RAMP_INPUT_MODES.RISE_AVAILABLE_RUN) {
        const analysis = analyzeAvailableRun(result.geometry.riseMeters, result.geometry.runMeters, result.input.references);
        dom.rampsRunAnalysis.style.display = 'block';
        dom.rampsRunAnalysisBody.innerHTML = [
          `<div>Available run: <strong>${f.run}</strong></div>`,
          `<div>Required for ${analysis.targetSlopePercent.toFixed(2)}% (1 : ${analysis.targetRatio}): <strong>${(analysis.targetRunMeters).toFixed(2)} m</strong></div>`,
          `<div>Difference: <strong>${Math.abs(analysis.differenceMeters).toFixed(2)} m ${analysis.sufficient ? 'surplus' : 'short'}</strong></div>`,
          `<div style="color: ${analysis.sufficient ? 'var(--color-success, #4ade80)' : 'var(--color-error, #ef4444)'}; font-weight: 700;">${analysis.sufficient ? 'Result: Sufficient run for the target slope.' : 'Result: Insufficient run for the target slope.'}</div>`
        ].join('');
      } else {
        dom.rampsRunAnalysis.style.display = 'none';
      }
    }

    // Reference status
    if (dom.rampsRefStatus) {
      dom.rampsRefStatus.textContent = f.referenceStatus;
      dom.rampsRefStatus.className = result.reference.status === 'within'
        ? 'type-badge badge-seg'
        : 'type-badge badge-alw';
    }
    if (dom.rampsRefDetail) {
      dom.rampsRefDetail.textContent = `${f.referenceLabel} · target ${f.referenceTargetRatio} · needs run ${f.referenceTargetRun}. Verify applicable local requirements.`;
    }
  }

  function renderTargets() {
    if (!dom.rampsTargetsBody) return;
    const riseM = parseLengthField(dom.rampsRise, 'm');
    if (riseM === null) {
      dom.rampsTargetsBody.innerHTML = '';
      return;
    }
    const targets = buildTargetComparison(riseM, currentReferences());
    const currentSlopePercent = state.ramps.lastResult?.slope?.percent;
    dom.rampsTargetsBody.innerHTML = targets.map(t => {
      const isSelected = currentSlopePercent !== undefined && Math.abs(t.percent - currentSlopePercent) < 0.05;
      return `
        <button type="button" class="ramps-target-row ${isSelected ? 'is-selected' : ''}" data-percent="${t.percent}"
          style="display: grid; grid-template-columns: 75px 85px 1fr; gap: 0.5rem; text-align: left; padding: 0.5rem 0.75rem; border: 1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle, rgba(255,255,255,0.12))'}; border-radius: 6px; background: ${isSelected ? 'var(--accent-primary-subtle, rgba(73,137,217,0.16))' : 'var(--bg-surface, #1e1f24)'}; color: var(--text-primary, #ffffff); cursor: pointer; font-family: var(--font-family-mono, monospace); font-size: 0.8rem;">
          <strong style="color: var(--accent-primary, #4989D9);">${t.percent}%</strong>
          <span style="color: var(--text-primary, #ffffff); font-weight: 500;">1 : ${t.ratioValue % 1 === 0 ? t.ratioValue : t.ratioValue.toFixed(2)}</span>
          <span style="color: rgba(255, 255, 255, 0.9);">run ${(t.runMeters).toFixed(2)} m</span>
        </button>
      `;
    }).join('');

    dom.rampsTargetsBody.querySelectorAll('.ramps-target-row').forEach(row => {
      row.addEventListener('click', () => {
        // Switch to Mode A with the chosen target slope
        state.ramps.mode = RAMP_INPUT_MODES.RISE_DESIRED_SLOPE;
        if (dom.rampsModeSelect) dom.rampsModeSelect.value = state.ramps.mode;
        if (dom.rampsSlope) dom.rampsSlope.value = row.dataset.percent;
        syncModeVisibility();
        calculate(true);
        showToast(`Switched to ${row.dataset.percent}% target`);
      });
    });
  }

  // ------------------------------------------------------------------
  // Quick actions — reuse existing engines/views, no duplicated logic
  // ------------------------------------------------------------------
  function requireResult() {
    const r = state.ramps.lastResult;
    if (!r || !r.valid) {
      showToast('Run a valid ramp calculation first', 'warning');
      return null;
    }
    return r;
  }

  function copyResult() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const text = [
      `RAMP — rise ${f.rise} · run ${f.run}`,
      `Slope: ${f.slopePercent} | Ratio: ${f.ratio} | Angle: ${f.angle}`,
      `Flight length: ${f.flightLength}`,
      `${f.referenceStatus} — ${f.referenceLabel}. Educational reference only; verify applicable local requirements.`
    ].join('\n');
    copyToClipboard(text, 'Ramp Result');
  }

  function copySchedule() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const header = ['Rise', 'Run', 'Slope %', 'Ratio', 'Angle', 'Flight Length'].join('\t');
    const row = [f.rise, f.run, f.slopePercent, f.ratio, f.angle, f.flightLength].join('\t');
    copyToClipboard(`${header}\n${row}`, 'Ramp Schedule (TSV)');
  }

  function sendToCad() {
    const r = requireResult();
    if (!r) return;
    const g = r.geometry;
    const numbers = [
      g.riseMeters * 1000,
      g.runMeters * 1000,
      g.flightLengthMeters * 1000
    ].map(v => v.toFixed(0)).join(' ');
    views.callController('cad_handoff', 'openCadHandoffWithSource', 'manual');
    if (dom.handoffManualInput) dom.handoffManualInput.value = numbers;
    state.cadHandoff.manualInput = numbers;
    views.callController('cad_handoff', 'renderCadHandoff', true);
    showToast('Ramp values loaded into CAD Handoff');
  }

  function sendToWorkspace() {
    const r = requireResult();
    if (!r) return;
    const g = r.geometry;
    const entries = [
      createDimensionEntry({ name: 'Ramp Rise', rawInput: `${(g.riseMeters * 1000).toFixed(0)}mm`, dimensionType: 'reference', notes: `Ramp Calculator — ${r.formatted.slopePercent}` }, 'mm'),
      createDimensionEntry({ name: 'Ramp Run', rawInput: `${(g.runMeters * 1000).toFixed(0)}mm`, dimensionType: 'segment', notes: `Ramp Calculator — ${r.formatted.ratio}` }, 'mm')
    ];
    state.workspace.entries.push(...entries);
    views.callController('workspace', 'saveWorkspace');
    views.callController('workspace', 'renderWorkspace');
    switchMode('workspace');
    showToast('Ramp rise/run added to Dimension Workspace');
  }

  function saveToJournal() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    HistoryService.addEntry({
      operation: 'Ramp Calculator',
      mode: 'Ramps',
      scaleStr: f.ratio,
      inputStr: `Rise ${f.rise}`,
      outputStr: `Run ${f.run} — ${f.slopePercent} — ${f.angle}`,
      stateSnapshot: {
        modeKey: 'ramps',
        rise: dom.rampsRise?.value || '',
        run: dom.rampsRun?.value || '',
        mode: r.mode
      }
    });
    views.callController('history', 'renderHistoryList');
    AudioService.playTick();
    showToast('Saved ramp to Calculation Journal');
  }

  function saveToProject() {
    const r = requireResult();
    if (!r) return;
    if (!projectStore) {
      showToast('Project store unavailable', 'warning');
      return;
    }
    const g = r.geometry;
    const saved = projectStore.updateProject(draft => {
      draft.decisions.push({
        id: `dec-ramp-${Date.now()}`,
        kind: 'ramp',
        name: `Ramp ${r.formatted.ratio}`,
        createdAt: new Date().toISOString(),
        result: {
          mode: r.mode,
          riseMeters: g.riseMeters,
          runMeters: g.runMeters,
          slopePercent: g.slopePercent,
          ratioValue: g.ratioValue,
          angleDegrees: g.angleDegrees,
          flightLengthMeters: g.flightLengthMeters,
          referenceStatus: r.reference.status,
          referenceLabel: r.reference.label
        }
      });
      return draft;
    });
    if (saved.ok) {
      showToast('Ramp saved to project document');
      AudioService.playSuccess();
    } else {
      showToast(`Project save failed: ${saved.errors[0]}`, 'warning');
    }
  }

  function applyToPlan() {
    const r = requireResult();
    if (!r) return;
    const g = r.geometry;
    const ramp = createRampEntity({
      x: 1.0,
      y: 1.0,
      width: 1.2,
      run: g.runMeters,
      rise: g.riseMeters,
      name: `Ramp ${r.formatted.ratio}`
    });
    if (projectStore && typeof projectStore.updateProject === 'function') {
      projectStore.updateProject(draft => {
        if (!draft.plan) draft.plan = { rooms: [], walls: [], doors: [], windows: [], furniture: [], dimensions: [], stairs: [], ramps: [] };
        if (!Array.isArray(draft.plan.ramps)) draft.plan.ramps = [];
        draft.plan.ramps.push(ramp);
        return draft;
      });
    }
    if (state.plan && state.plan.document) {
      if (!Array.isArray(state.plan.document.ramps)) state.plan.document.ramps = [];
      state.plan.document.ramps.push(ramp);
      state.plan.selectedIds = new Set([ramp.id]);
    }
    switchMode('plan');
    if (views && typeof views.callController === 'function') {
      views.callController('plan', 'render');
    }
    AudioService.playSuccess();
    showToast(`Ramp (${r.formatted.ratio}) placed onto Plan Canvas`);
  }

  function sendToScratchpad() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const g = r.geometry;
    if (views && typeof views.callController === 'function') {
      views.callController('scratchpad', 'addItem', {
        label: `Ramp ${f.ratio} (${f.slopePercent})`,
        value: `${f.rise} rise / ${f.run} run`,
        unit: 'm',
        source: 'Ramps',
        metadata: {
          rise: g.riseMeters,
          run: g.runMeters,
          slopePercent: g.slopePercent,
          ratio: f.ratio
        }
      });
    }
  }

  function syncCodeSelection() {
    if (!dom.rampsCodeSelect) return;
    const codeId = dom.rampsCodeSelect.value || 'jnbc';
    const code = getBuildingCode(codeId);
    if (dom.rampsCodeBadge) {
      dom.rampsCodeBadge.textContent = `${code.flag} ${code.id.toUpperCase()}`;
    }
    if (dom.rampsRefTarget) dom.rampsRefTarget.value = code.ramp.maxSlopeRatio;
    if (dom.rampsRefMin) dom.rampsRefMin.value = code.ramp.maxSlopeRatio;
    if (dom.rampsRefMax) dom.rampsRefMax.value = code.ramp.preferredSlopeRatio;
    if (dom.rampsReferenceNote) {
      dom.rampsReferenceNote.textContent = `${code.name}: ${code.citation}. Max slope 1:${code.ramp.maxSlopeRatio} (${code.ramp.maxSlopePercent}%), preferred accessible 1:${code.ramp.preferredSlopeRatio} (${code.ramp.preferredSlopePercent}%), max single run rise ${code.ramp.maxRunRiseMeters * 1000} mm, min landing ${code.ramp.minLandingLengthMm} mm.`;
    }
  }

  return {
    id: 'ramps',
    mount() {
      const prefs = loadPrefs();
      if (prefs.mode && Object.values(RAMP_INPUT_MODES).includes(prefs.mode)) {
        state.ramps.mode = prefs.mode;
        if (dom.rampsModeSelect) dom.rampsModeSelect.value = prefs.mode;
      }
      if (dom.rampsCodeSelect) {
        dom.rampsCodeSelect.addEventListener('change', () => {
          syncCodeSelection();
          calculate(true);
          const code = getBuildingCode(dom.rampsCodeSelect.value);
          showToast(`Applied ${code.shortName} standard`);
        });
      }
      syncCodeSelection();
      syncModeVisibility();
      calculate(false);
    },
    getController() {
      return {
        calculate, syncCodeSelection, syncModeVisibility, renderTargets, copyResult,
        copySchedule, sendToCad, sendToWorkspace, saveToJournal,
        saveToProject, sendToScratchpad, applyToPlan
      };
    }
  };
}
