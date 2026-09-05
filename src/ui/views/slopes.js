/**
 * Architecture Helping Hand - Slope Analyzer View (Mode 16)
 * Architectural Tools Phase: Slopes. General rise/run analysis with signed
 * geometry, consistency checking, and target comparison. All math lives in
 * src/core/slopes.js + the shared slope-math.js; this view only renders
 * engine results and routes persistence through the shared context.
 */

import {
  SLOPE_INPUT_MODES,
  analyzeSlope,
  buildSlopeTargetComparison,
  explainSlope,
  generateSlopeSVG
} from '../../core/slopes.js';
import { getBuildingCode, inspectSlopeCompliance } from '../../core/building-codes.js';
import { parseInput } from '../../core/parser.js';
import { evaluateExpressionSafe } from '../../core/dimension-expression.js';
import { createDimensionEntry } from '../../core/dimension-workspace.js';
import { UNITS } from '../../core/units.js';

const SLOPES_PREFS_KEY = 'archiscale_slopes_prefs'; // user preferences only

export function createSlopesView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    HistoryService, switchMode, views, projectStore, StorageService, copyToClipboard
  } = context;

  function savePrefs() {
    try {
      StorageService.setItem(SLOPES_PREFS_KEY, JSON.stringify({
        mode: state.slopes.mode,
        displayUnit: state.slopes.displayUnit
      }));
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      const raw = StorageService.getItem(SLOPES_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  /** Parses a signed user length field ("-1.2m", "1200mm", "2.8m - 15cm") to meters. */
  function parseSignedLengthField(el, fallbackUnit) {
    if (!el) return null;
    const raw = (el.value || '').trim();
    if (!raw) return null;
    const exprRes = evaluateExpressionSafe(raw, fallbackUnit || 'm');
    if (exprRes && exprRes.isValid && typeof exprRes.canonicalMeters === 'number' && exprRes.canonicalMeters !== 0) {
      return exprRes.canonicalMeters;
    }
    const negative = raw.startsWith('-');
    const res = parseInput(negative ? raw.slice(1) : raw, { allowNegative: false });
    if (!res.isValid || res.value <= 0) return null;
    const unitKey = res.detectedUnit || fallbackUnit;
    const meters = res.value * (UNITS[unitKey]?.toMeters ?? 1);
    return negative ? -meters : meters;
  }

  function syncModeVisibility() {
    const mode = state.slopes.mode;
    const show = (el, on) => { if (el) el.style.display = on ? 'block' : 'none'; };
    show(dom.slopesRiseGroup, mode !== SLOPE_INPUT_MODES.RUN_PERCENT && mode !== SLOPE_INPUT_MODES.RUN_RATIO && mode !== SLOPE_INPUT_MODES.RUN_ANGLE);
    show(dom.slopesRunGroup, mode !== SLOPE_INPUT_MODES.RISE_PERCENT && mode !== SLOPE_INPUT_MODES.RISE_RATIO && mode !== SLOPE_INPUT_MODES.RISE_ANGLE);
    show(dom.slopesPercentGroup, mode === SLOPE_INPUT_MODES.RISE_PERCENT || mode === SLOPE_INPUT_MODES.RUN_PERCENT);
    show(dom.slopesRatioGroup, mode === SLOPE_INPUT_MODES.RISE_RATIO || mode === SLOPE_INPUT_MODES.RUN_RATIO);
    show(dom.slopesAngleGroup, mode === SLOPE_INPUT_MODES.RISE_ANGLE || mode === SLOPE_INPUT_MODES.RUN_ANGLE);
  }

  function showError(message) {
    if (dom.slopesErrorMsg) {
      dom.slopesErrorMsg.textContent = `⚠️ ${message}`;
      dom.slopesErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'slopes', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.slopesErrorMsg) {
      dom.slopesErrorMsg.style.display = 'none';
      dom.slopesErrorMsg.textContent = '';
    }
  }

  function calculate(isExplicitRun = false) {
    const mode = state.slopes.mode;
    const input = { mode, displayUnit: state.slopes.displayUnit };

    if (mode === SLOPE_INPUT_MODES.RISE_RUN || mode === SLOPE_INPUT_MODES.RISE_PERCENT ||
        mode === SLOPE_INPUT_MODES.RISE_RATIO || mode === SLOPE_INPUT_MODES.RISE_ANGLE) {
      const riseM = parseSignedLengthField(dom.slopesRise, 'm');
      if (riseM === null || riseM === 0) {
        renderInvalid(isExplicitRun, 'Rise must be a non-zero value (use a negative value for descending slopes).');
        return;
      }
      input.rise = riseM;
    }
    if (mode === SLOPE_INPUT_MODES.RISE_RUN || mode === SLOPE_INPUT_MODES.RUN_PERCENT ||
        mode === SLOPE_INPUT_MODES.RUN_RATIO || mode === SLOPE_INPUT_MODES.RUN_ANGLE) {
      const runM = parseSignedLengthField(dom.slopesRun, 'm');
      if (runM === null || runM === 0) {
        renderInvalid(isExplicitRun, 'Run must be a non-zero value.');
        return;
      }
      input.run = runM;
    }
    if (mode === SLOPE_INPUT_MODES.RISE_PERCENT || mode === SLOPE_INPUT_MODES.RUN_PERCENT) {
      const pct = parseFloat(dom.slopesPercent?.value);
      if (!isFinite(pct)) {
        renderInvalid(isExplicitRun, 'Slope percent must be a finite number (e.g. 8.33).');
        return;
      }
      input.slopePercent = pct;
    }
    if (mode === SLOPE_INPUT_MODES.RISE_RATIO || mode === SLOPE_INPUT_MODES.RUN_RATIO) {
      const ratio = parseFloat(dom.slopesRatio?.value);
      if (!isFinite(ratio) || ratio <= 0) {
        renderInvalid(isExplicitRun, 'Ratio must be a positive number X (of 1 : X).');
        return;
      }
      input.ratioValue = ratio;
    }
    if (mode === SLOPE_INPUT_MODES.RISE_ANGLE || mode === SLOPE_INPUT_MODES.RUN_ANGLE) {
      const angle = parseFloat(dom.slopesAngle?.value);
      if (!isFinite(angle) || angle === 0 || Math.abs(angle) >= 90) {
        renderInvalid(isExplicitRun, 'Angle must be strictly between -90° and +90°.');
        return;
      }
      input.angleDegrees = angle;
    }

    const result = analyzeSlope(input);
    if (!result.valid) {
      state.slopes.lastResult = null;
      renderInvalid(isExplicitRun, result.errorMessage);
      return;
    }

    clearError();
    state.slopes.lastResult = result;
    renderResult(result);
    renderTargets();

    setUnifiedResultState({
      toolPrefix: 'slopes',
      status: 'success',
      context: { 'Slope': result.formatted.slopePercent, 'Direction': result.geometry.direction }
    });

    if (isExplicitRun) AudioService.playTick();
  }

  function renderInvalid(isExplicitRun, message) {
    clearResultPanels();
    showError(message);
    if (isExplicitRun) AudioService.playTick();
  }

  function clearResultPanels() {
    ['slopesSlopeVal', 'slopesRatioVal', 'slopesAngleVal', 'slopesFlightVal'].forEach(k => {
      if (dom[k]) dom[k].textContent = '—';
    });
    if (dom.slopesRiseVal) dom.slopesRiseVal.textContent = '—';
    if (dom.slopesRunVal) dom.slopesRunVal.textContent = '—';
    if (dom.slopesDirectionBadge) dom.slopesDirectionBadge.textContent = '—';
    if (dom.slopesSvgWrap) dom.slopesSvgWrap.innerHTML = '';
    if (dom.slopesCodeInspectorWrap) dom.slopesCodeInspectorWrap.innerHTML = '';
    if (dom.slopesExplanation) dom.slopesExplanation.textContent = '';
    if (dom.slopesConsistencyRow) dom.slopesConsistencyRow.style.display = 'none';
    if (dom.slopesTargetsBody) dom.slopesTargetsBody.innerHTML = '';
  }

  function renderResult(result) {
    const f = result.formatted;
    const g = result.geometry;

    if (dom.slopesRiseVal) dom.slopesRiseVal.textContent = f.rise;
    if (dom.slopesRunVal) dom.slopesRunVal.textContent = f.run;
    if (dom.slopesSlopeVal) dom.slopesSlopeVal.textContent = f.slopePercent;
    if (dom.slopesRatioVal) dom.slopesRatioVal.textContent = f.ratio;
    if (dom.slopesAngleVal) dom.slopesAngleVal.textContent = f.angle;
    if (dom.slopesFlightVal) dom.slopesFlightVal.textContent = f.flightLength;
    if (dom.slopesDirectionBadge) dom.slopesDirectionBadge.textContent = f.direction;

    if (dom.slopesSvgWrap) {
      dom.slopesSvgWrap.innerHTML = generateSlopeSVG(result, { width: 520, height: 220 });
    }

    // Building Code Compliance Inspection for Slopes / Walkways
    if (dom.slopesCodeInspectorWrap) {
      const selectedCodeId = dom.slopesCodeSelect?.value || 'jnbc';
      const inspection = inspectSlopeCompliance(result, selectedCodeId);
      const statusClass = inspection.overallStatus === 'pass' ? 'status-pass' : (inspection.overallStatus === 'warn' ? 'status-warn' : 'status-fail');
      const badgeClass = inspection.overallStatus === 'pass' ? 'badge-pass' : (inspection.overallStatus === 'warn' ? 'badge-warn' : 'badge-fail');
      const badgeIcon = inspection.overallStatus === 'pass' ? '✓' : (inspection.overallStatus === 'warn' ? '⚠️' : '✗');
      const badgeText = inspection.overallStatus === 'pass' ? 'PEDESTRIAN WALKWAY · مسار مشاة' : (inspection.overallStatus === 'warn' ? 'TREATED AS RAMP · يصنف كمنحدر' : 'VIOLATION · مخالف');

      dom.slopesCodeInspectorWrap.innerHTML = `
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
            <span>Ref: ${inspection.checks[0]?.citation || ''}</span>
          </div>
        </div>
      `;
    }

    if (dom.slopesExplanation) {
      dom.slopesExplanation.textContent = explainSlope(result);
    }

    // Consistency / conflict section
    if (dom.slopesConsistencyRow) {
      if (result.consistency.status === 'CONFLICT' && f.conflict) {
        dom.slopesConsistencyRow.style.display = 'flex';
        if (dom.slopesConsistencyBody) dom.slopesConsistencyBody.textContent = f.conflict;
      } else if (result.consistency.status === 'CONSISTENT') {
        dom.slopesConsistencyRow.style.display = 'flex';
        if (dom.slopesConsistencyBody) dom.slopesConsistencyBody.textContent = 'CONSISTENT — redundant values match the calculated geometry within tolerance.';
      } else {
        dom.slopesConsistencyRow.style.display = 'none';
      }
    }
  }

  function renderTargets() {
    if (!dom.slopesTargetsBody) return;
    // Use the magnitude of the current rise (or derived rise) for the table
    const riseMag = state.slopes.lastResult ? Math.abs(state.slopes.lastResult.geometry.riseMeters) : null;
    if (riseMag === null) {
      dom.slopesTargetsBody.innerHTML = '';
      return;
    }
    const targets = buildSlopeTargetComparison(riseMag);
    const rawCurrentPercent = state.slopes.lastResult?.geometry?.slopePercent ?? state.slopes.lastResult?.geometry?.percent;
    const currentSlopePercent = typeof rawCurrentPercent === 'number' ? Math.abs(rawCurrentPercent) : undefined;
    dom.slopesTargetsBody.innerHTML = targets.map(t => {
      const isSelected = currentSlopePercent !== undefined && Math.abs(t.percent - currentSlopePercent) < 0.05;
      return `
        <button type="button" class="slopes-target-row ${isSelected ? 'is-selected' : ''}" data-percent="${t.percent}"
          style="display: grid; grid-template-columns: 85px 95px 1fr; gap: 0.5rem; text-align: left; padding: 0.5rem 0.75rem; border: 1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle, rgba(255,255,255,0.12))'}; border-radius: 6px; background: ${isSelected ? 'var(--accent-primary-subtle, rgba(73,137,217,0.16))' : 'var(--bg-surface, #1e1f24)'}; color: var(--text-primary, #ffffff); cursor: pointer; font-family: var(--font-family-mono, monospace); font-size: 0.8rem;">
          <strong style="color: var(--accent-primary, #4989D9);">${t.percent}%</strong>
          <span style="color: var(--text-primary, #ffffff); font-weight: 500;">1 : ${(100 / t.percent) % 1 === 0 ? (100 / t.percent) : (100 / t.percent).toFixed(2)}</span>
          <span style="color: rgba(255, 255, 255, 0.9);">run ${(t.runMeters).toFixed(2)} m</span>
        </button>
      `;
    }).join('');

    dom.slopesTargetsBody.querySelectorAll('.slopes-target-row').forEach(row => {
      row.addEventListener('click', () => {
        // Apply the chosen percent to whichever definition uses percent
        const usesPercent = state.slopes.mode === SLOPE_INPUT_MODES.RISE_PERCENT || state.slopes.mode === SLOPE_INPUT_MODES.RUN_PERCENT;
        if (usesPercent) {
          if (dom.slopesPercent) dom.slopesPercent.value = row.dataset.percent;
          calculate(true);
          showToast(`Applied ${row.dataset.percent}% target`);
        } else {
          showToast('Switch to a percent-based definition to apply a target', 'warning');
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Quick actions — reuse existing engines/views
  // ------------------------------------------------------------------
  function requireResult() {
    const r = state.slopes.lastResult;
    if (!r || !r.valid) {
      showToast('Run a valid slope analysis first', 'warning');
      return null;
    }
    return r;
  }

  function copyResult() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const explanation = explainSlope(r);
    const text = [
      `SLOPE — rise ${f.rise} · run ${f.run}`,
      `Slope: ${f.slopePercent} | Ratio: ${f.ratio} | Angle: ${f.angle}`,
      `Direction: ${f.direction.replace(/[↑↓] /, '')} | Flight: ${f.flightLength}`,
      explanation
    ].join('\n');
    copyToClipboard(text, 'Slope Analysis');
  }

  function copySchedule() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const header = ['Rise', 'Run', 'Slope %', 'Ratio', 'Angle', 'Flight Length', 'Direction'].join('\t');
    const row = [f.rise, f.run, f.slopePercent, f.ratio, f.angle, f.flightLength, r.geometry.direction].join('\t');
    copyToClipboard(`${header}\n${row}`, 'Slope Schedule (TSV)');
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
    showToast('Slope values loaded into CAD Handoff');
  }

  function sendToWorkspace() {
    const r = requireResult();
    if (!r) return;
    const g = r.geometry;
    const entries = [
      createDimensionEntry({ name: 'Slope Rise', rawInput: `${(g.riseMeters * 1000).toFixed(0)}mm`, dimensionType: 'reference', notes: `Slope Analyzer — ${r.formatted.slopePercent}` }, 'mm'),
      createDimensionEntry({ name: 'Slope Run', rawInput: `${(g.runMeters * 1000).toFixed(0)}mm`, dimensionType: 'segment', notes: `Slope Analyzer — ${r.formatted.ratio}` }, 'mm')
    ];
    state.workspace.entries.push(...entries);
    views.callController('workspace', 'saveWorkspace');
    views.callController('workspace', 'renderWorkspace');
    switchMode('workspace');
    showToast('Slope rise/run added to Dimension Workspace');
  }

  function saveToJournal() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    HistoryService.addEntry({
      operation: 'Slope Analyzer',
      mode: 'Slopes',
      scaleStr: f.ratio,
      inputStr: `Rise ${f.rise}`,
      outputStr: `Run ${f.run} — ${f.slopePercent} — ${f.angle}`,
      stateSnapshot: {
        modeKey: 'slopes',
        rise: dom.slopesRise?.value || '',
        run: dom.slopesRun?.value || '',
        mode: r.mode
      }
    });
    views.callController('history', 'renderHistoryList');
    AudioService.playTick();
    showToast('Saved slope to Calculation Journal');
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
        id: `dec-slope-${Date.now()}`,
        kind: 'slope',
        name: `Slope ${r.formatted.slopePercent}`,
        createdAt: new Date().toISOString(),
        result: {
          mode: r.mode,
          riseMeters: g.riseMeters,
          runMeters: g.runMeters,
          slopePercent: g.slopePercent,
          ratioValue: g.ratioValue,
          angleDegrees: g.angleDegrees,
          flightLengthMeters: g.flightLengthMeters,
          direction: g.direction,
          kind: g.kind
        }
      });
      return draft;
    });
    if (saved.ok) {
      showToast('Slope saved to project document');
      AudioService.playSuccess();
    } else {
      showToast(`Project save failed: ${saved.errors[0]}`, 'warning');
    }
  }

  function syncCodeSelection() {
    if (!dom.slopesCodeSelect) return;
    const codeId = dom.slopesCodeSelect.value || 'jnbc';
    const code = getBuildingCode(codeId);
    if (dom.slopesCodeBadge) {
      dom.slopesCodeBadge.textContent = `${code.flag} ${code.id.toUpperCase()}`;
    }
  }

  return {
    id: 'slopes',
    mount() {
      const prefs = loadPrefs();
      if (prefs.mode && Object.values(SLOPE_INPUT_MODES).includes(prefs.mode)) {
        state.slopes.mode = prefs.mode;
        if (dom.slopesModeSelect) dom.slopesModeSelect.value = prefs.mode;
      }
      if (dom.slopesCodeSelect) {
        dom.slopesCodeSelect.addEventListener('change', () => {
          syncCodeSelection();
          calculate(true);
          const code = getBuildingCode(dom.slopesCodeSelect.value);
          showToast(`Applied ${code.shortName} standard`);
        });
      }
      syncCodeSelection();
      syncModeVisibility();
      calculate(false);
    },
    getController() {
      return { calculate, syncCodeSelection, syncModeVisibility, renderTargets, copyResult, copySchedule, sendToCad, sendToWorkspace, saveToJournal, saveToProject };
    }
  };
}
