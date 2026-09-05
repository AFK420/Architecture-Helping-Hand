/**
 * Architecture Helping Hand - Stair Calculator View (Mode 14)
 * Architectural Tools Phase: Stairs. Owns the stair mode's input handling,
 * result rendering, SVG diagram injection, candidate list, and quick
 * actions (copy / schedule / CAD / workspace / journal / project store).
 *
 * All math lives in src/core/stairs.js — this view only formats what the
 * engine already produced and routes persistence through the shared
 * context (ProjectStore, Journal, Workspace, CAD views).
 */

import {
  STAIR_INPUT_MODES,
  STAIR_REFERENCE_DEFAULTS,
  calculateStair,
  generateStairSVG
} from '../../core/stairs.js';
import { parseInput } from '../../core/parser.js';
import { createDimensionEntry } from '../../core/dimension-workspace.js';
import { UNITS } from '../../core/units.js';
import { createStairEntity } from '../../core/entities.js';

export function createStairsView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    HistoryService, switchMode, views, projectStore
  } = context;

  const STORAGE_PREFS_KEY = 'archiscale_stairs_prefs'; // user preferences only

  function savePrefs() {
    try {
      StorageServiceSafeSet(STORAGE_PREFS_KEY, JSON.stringify({
        mode: state.stairs.mode,
        objective: state.stairs.objective,
        displayUnit: state.stairs.displayUnit
      }));
    } catch (e) {}
  }

  // Small local indirection so prefs go through the app storage service
  // without importing it at module top-level twice.
  function StorageServiceSafeSet(key, value) {
    try {
      context.StorageService.setItem(key, value);
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      const raw = context.StorageService.getItem(STORAGE_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  /** Parses a user length field ("2.8m", "175mm", "300", "12'6\"") to meters. */
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
    const toMm = (el, fallback) => {
      const n = parseFloat(el?.value);
      return isFinite(n) && n > 0 ? n / 1000 : fallback;
    };
    return {
      riser: {
        minMeters: toMm(dom.stairsRefRiserMin, STAIR_REFERENCE_DEFAULTS.riser.minMeters),
        maxMeters: toMm(dom.stairsRefRiserMax, STAIR_REFERENCE_DEFAULTS.riser.maxMeters)
      },
      blondel: {
        minMeters: toMm(dom.stairsRefBlondelMin, STAIR_REFERENCE_DEFAULTS.blondel.minMeters),
        maxMeters: toMm(dom.stairsRefBlondelMax, STAIR_REFERENCE_DEFAULTS.blondel.maxMeters)
      }
    };
  }

  function syncModeVisibility() {
    const mode = state.stairs.mode;
    const show = (el, on) => { if (el) el.style.display = on ? 'block' : 'none'; };
    show(dom.stairsDesiredRiserGroup, mode === STAIR_INPUT_MODES.RISE_DESIRED_RISER);
    show(dom.stairsRiserCountGroup, mode === STAIR_INPUT_MODES.RISE_RISER_COUNT);
    show(dom.stairsAvailableRunGroup, mode === STAIR_INPUT_MODES.RISE_AVAILABLE_RUN);
    show(dom.stairsTotalRunGroup, mode === STAIR_INPUT_MODES.RISE_RUN_DIRECT);
    // Desired tread is optional in modes A/B; irrelevant in C/D where it's overridden by geometry
    show(dom.stairsDesiredTreadGroup, mode === STAIR_INPUT_MODES.RISE_DESIRED_RISER || mode === STAIR_INPUT_MODES.RISE_RISER_COUNT);
  }

  function showError(message) {
    if (dom.stairsErrorMsg) {
      dom.stairsErrorMsg.textContent = `⚠️ ${message}`;
      dom.stairsErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({
      toolPrefix: 'stairs',
      status: 'error',
      errorText: `⚠️ ${message}`
    });
  }

  function clearError() {
    if (dom.stairsErrorMsg) {
      dom.stairsErrorMsg.style.display = 'none';
      dom.stairsErrorMsg.textContent = '';
    }
  }

  function calculate(isExplicitRun = false) {
    const mode = state.stairs.mode;
    const input = { mode, displayUnit: state.stairs.displayUnit };

    const riseM = parseLengthField(dom.stairsTotalRise, 'm');
    if (riseM === null) {
      renderInvalid(isExplicitRun, 'Total rise must be greater than zero (e.g. 2.8m or 2800mm).');
      return;
    }
    input.totalRise = riseM;

    if (mode === STAIR_INPUT_MODES.RISE_DESIRED_RISER) {
      const riserM = parseLengthField(dom.stairsDesiredRiser, 'mm');
      if (riserM === null) {
        renderInvalid(isExplicitRun, 'Desired riser must be greater than zero (e.g. 175mm).');
        return;
      }
      input.desiredRiser = riserM;
    } else if (mode === STAIR_INPUT_MODES.RISE_RISER_COUNT) {
      const n = parseInt(dom.stairsRiserCount?.value, 10);
      input.riserCount = n; // engine validates integer/range and reports precise codes
    } else if (STAIR_INPUT_MODES.RISE_AVAILABLE_RUN === mode) {
      const runM = parseLengthField(dom.stairsAvailableRun, 'm');
      if (runM === null) {
        renderInvalid(isExplicitRun, 'Available run must be greater than zero (e.g. 4.8m).');
        return;
      }
      input.availableRun = runM;
    } else if (mode === STAIR_INPUT_MODES.RISE_RUN_DIRECT) {
      const runM = parseLengthField(dom.stairsTotalRun, 'm');
      if (runM === null) {
        renderInvalid(isExplicitRun, 'Total run must be greater than zero (e.g. 4.5m).');
        return;
      }
      input.totalRun = runM;
    }

    const treadM = parseLengthField(dom.stairsDesiredTread, 'mm');
    if (treadM !== null) input.desiredTread = treadM;

    input.objective = state.stairs.objective;
    input.references = currentReferences();

    const result = calculateStair(input);

    if (!result.valid) {
      state.stairs.lastResult = null;
      renderInvalid(isExplicitRun, result.errorMessage);
      return;
    }

    clearError();
    state.stairs.lastResult = result;
    renderResult(result);

    setUnifiedResultState({
      toolPrefix: 'stairs',
      status: 'success',
      context: {
        'Risers': String(result.risers.count),
        '2R+T': result.formatted.twoRPlusT
      }
    });

    if (isExplicitRun) AudioService.playTick();
  }

  function renderInvalid(isExplicitRun, message) {
    clearResultPanels();
    showError(message);
    if (isExplicitRun) AudioService.playTick();
  }

  function clearResultPanels() {
    if (dom.stairsRiserCountVal) dom.stairsRiserCountVal.textContent = '—';
    if (dom.stairsConventionBadge) dom.stairsConventionBadge.textContent = '— risers / — goings';
    ['stairsRiserVal', 'stairsTreadVal', 'stairsRunVal', 'stairsFlightVal', 'stairsAngleVal', 'stairsSlopeVal', 'stairsBlondelVal'].forEach(k => {
      if (dom[k]) dom[k].textContent = '—';
    });
    if (dom.stairsSvgWrap) dom.stairsSvgWrap.innerHTML = '';
    if (dom.stairsCandidatesBody) dom.stairsCandidatesBody.innerHTML = '';
    if (dom.stairsBlondelStatus) {
      dom.stairsBlondelStatus.textContent = '—';
      dom.stairsBlondelStatus.className = 'type-badge badge-seg';
    }
  }

  function renderResult(result) {
    const f = result.formatted;

    if (dom.stairsRiserCountVal) dom.stairsRiserCountVal.textContent = f.riserCount;
    if (dom.stairsConventionBadge) {
      dom.stairsConventionBadge.textContent = `${f.riserCount} risers / ${f.goingCount} goings`;
    }
    if (dom.stairsRiserVal) dom.stairsRiserVal.textContent = f.riser;
    if (dom.stairsTreadVal) dom.stairsTreadVal.textContent = f.tread;
    if (dom.stairsRunVal) dom.stairsRunVal.textContent = f.totalRun;
    if (dom.stairsFlightVal) dom.stairsFlightVal.textContent = f.slopedLength;
    if (dom.stairsAngleVal) dom.stairsAngleVal.textContent = f.angle;
    if (dom.stairsSlopeVal) dom.stairsSlopeVal.textContent = `${f.slopePercent} (${f.riseRunRatio})`;
    if (dom.stairsBlondelVal) dom.stairsBlondelVal.textContent = f.twoRPlusT;

    if (dom.stairsBlondelStatus) {
      dom.stairsBlondelStatus.textContent = f.proportionStatus;
      dom.stairsBlondelStatus.className = result.proportion.status === 'within'
        ? 'type-badge badge-seg'
        : 'type-badge badge-alw';
    }

    // SVG diagram drawn from the actual calculated geometry
    if (dom.stairsSvgWrap) {
      dom.stairsSvgWrap.innerHTML = generateStairSVG(result, { width: 520, height: 240 });
    }

    // Candidate options list
    if (dom.stairsCandidatesBody) {
      if (Array.isArray(f.candidates) && f.candidates.length > 0) {
        dom.stairsCandidatesBody.innerHTML = f.candidates.map((c, idx) => `
          <button type="button" class="stairs-candidate-row ${c.riserCount === result.risers.count ? 'is-selected' : ''}" data-count="${c.riserCount}" data-index="${idx}"
            style="display: grid; grid-template-columns: 70px 1fr 1fr 1fr; gap: 0.5rem; text-align: left; padding: 0.45rem 0.6rem; border: 1px solid var(--border-color-light); border-radius: 5px; background: ${c.riserCount === result.risers.count ? 'var(--bg-chip)' : 'transparent'}; cursor: pointer; font-family: var(--font-family-mono); font-size: 0.78rem;">
            <strong style="color: var(--accent-primary);">${c.riserCount} R</strong>
            <span>R ${c.riser}</span>
            <span>T ${c.tread}</span>
            <span>run ${c.totalRun}</span>
          </button>
        `).join('');

        dom.stairsCandidatesBody.querySelectorAll('.stairs-candidate-row').forEach(row => {
          row.addEventListener('click', () => {
            const count = parseInt(row.dataset.count, 10);
            // Switch to Mode B with the chosen count for exact control
            state.stairs.mode = STAIR_INPUT_MODES.RISE_RISER_COUNT;
            if (dom.stairsModeSelect) dom.stairsModeSelect.value = state.stairs.mode;
            if (dom.stairsRiserCount) dom.stairsRiserCount.value = String(count);
            syncModeVisibility();
            calculate(true);
            showToast(`Switched to exact ${count}-riser configuration`);
          });
        });
      } else {
        dom.stairsCandidatesBody.innerHTML = '';
      }
    }
  }

  // ------------------------------------------------------------------
  // Quick actions — all reuse existing engines/views, no duplicated logic
  // ------------------------------------------------------------------
  function requireResult() {
    const r = state.stairs.lastResult;
    if (!r || !r.valid) {
      showToast('Run a valid stair calculation first', 'warning');
      return null;
    }
    return r;
  }

  function copyResult() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const text = [
      `STAIR — ${f.riserCount} risers / ${f.goingCount} goings`,
      `Rise: ${f.totalRise} | Riser: ${f.riser} | Going: ${f.tread}`,
      `Total run: ${f.totalRun} | Flight: ${f.slopedLength} | Angle: ${f.angle} (${f.slopePercent})`,
      `2R+T: ${f.twoRPlusT} — ${f.proportionStatus}`,
      `Convention: N risers → N-1 goings (upper slab is the final tread)`
    ].join('\n');
    context.copyToClipboard(text, 'Stair Result');
  }

  function copySchedule() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    const header = ['Flights', 'Risers', 'Goings', 'Riser Height', 'Going Depth', 'Total Rise', 'Total Run', 'Flight Length', 'Angle', '2R+T'].join('\t');
    const row = ['1 (straight)', f.riserCount, f.goingCount, f.riser, f.tread, f.totalRise, f.totalRun, f.slopedLength, f.angle, f.twoRPlusT].join('\t');
    context.copyToClipboard(`${header}\n${row}`, 'Stair Schedule (TSV)');
  }

  function sendToCad() {
    const r = requireResult();
    if (!r) return;
    // Route through the CAD Handoff view's manual source with clean numbers
    const f = r.formatted;
    const numbers = [
      r.risers.heightMeters * 1000,   // riser in mm
      r.treads.depthMeters * 1000,    // going in mm
      r.geometry.totalRunMeters * 1000,
      r.input.totalRiseMeters * 1000
    ].map(v => v.toFixed(0)).join(' ');
    views.callController('cad_handoff', 'openCadHandoffWithSource', 'manual');
    if (dom.handoffManualInput) dom.handoffManualInput.value = numbers;
    state.cadHandoff.manualInput = numbers;
    views.callController('cad_handoff', 'renderCadHandoff', true);
    showToast('Stair values loaded into CAD Handoff');
  }

  function sendToWorkspace() {
    const r = requireResult();
    if (!r) return;
    const entries = [
      createDimensionEntry({ name: 'Stair Total Rise', rawInput: `${(r.input.totalRiseMeters * 1000).toFixed(0)}mm`, dimensionType: 'reference', notes: 'Stair Calculator' }, 'mm'),
      createDimensionEntry({ name: `Stair Riser (${r.risers.count}R)`, rawInput: `${(r.risers.heightMeters * 1000).toFixed(1)}mm`, dimensionType: 'segment', notes: 'Stair Calculator' }, 'mm'),
      createDimensionEntry({ name: `Stair Going (${r.risers.count - 1}T)`, rawInput: `${(r.treads.depthMeters * 1000).toFixed(1)}mm`, dimensionType: 'segment', notes: 'Stair Calculator' }, 'mm'),
      createDimensionEntry({ name: 'Stair Total Run', rawInput: `${(r.geometry.totalRunMeters * 1000).toFixed(0)}mm`, dimensionType: 'reference', notes: 'Stair Calculator' }, 'mm')
    ];
    state.workspace.entries.push(...entries);
    views.callController('workspace', 'saveWorkspace');
    views.callController('workspace', 'renderWorkspace');
    switchMode('workspace');
    showToast('Stair values added to Dimension Workspace');
  }

  function saveToJournal() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    HistoryService.addEntry({
      operation: 'Stair Calculator',
      mode: 'Stairs',
      scaleRatio: null,
      scaleStr: `${f.riserCount}R / ${f.goingCount}T`,
      inputStr: `Rise ${f.totalRise}`,
      outputStr: `${f.riserCount} risers @ ${f.riser} — run ${f.totalRun} — ${f.angle}`,
      stateSnapshot: {
        modeKey: 'stairs',
        rise: dom.stairsTotalRise?.value || '',
        riserCount: r.risers.count,
        mode: r.mode
      }
    });
    views.callController('history', 'renderHistoryList');
    AudioService.playTick();
    showToast('Saved stair to Calculation Journal');
  }

  function saveToProject() {
    const r = requireResult();
    if (!r) return;
    if (!context.projectStore) {
      showToast('Project store unavailable', 'warning');
      return;
    }
    const saved = context.projectStore.updateProject(draft => {
      draft.decisions.push({
        id: `dec-stair-${Date.now()}`,
        kind: 'stair',
        name: `Stair ${r.risers.count}R`,
        createdAt: new Date().toISOString(),
        result: {
          mode: r.mode,
          totalRiseMeters: r.input.totalRiseMeters,
          riserCount: r.risers.count,
          riserHeightMeters: r.risers.heightMeters,
          goingCount: r.treads.count,
          treadDepthMeters: r.treads.depthMeters,
          totalRunMeters: r.geometry.totalRunMeters,
          slopedLengthMeters: r.geometry.slopedLengthMeters,
          angleDegrees: r.geometry.angleDegrees,
          twoRPlusTMeters: r.proportion.twoRPlusTMeters,
          proportionStatus: r.proportion.status,
          referenceLabels: {
            riser: r.input.references.riser.label,
            blondel: r.input.references.blondel.label
          }
        }
      });
      return draft;
    });
    if (saved.ok) {
      showToast('Stair saved to project document');
      AudioService.playSuccess();
    } else {
      showToast(`Project save failed: ${saved.errors[0]}`, 'warning');
    }
  }

  function applyToPlan() {
    const r = requireResult();
    if (!r) return;
    const stair = createStairEntity({
      x: 1.0,
      y: 1.0,
      width: 1.0,
      run: r.geometry.totalRunMeters,
      riserCount: r.risers.count,
      totalRise: r.input.totalRiseMeters,
      going: r.treads.depthMeters,
      riser: r.risers.heightMeters,
      name: `Stair ${r.risers.count}R`
    });
    if (projectStore && typeof projectStore.updateProject === 'function') {
      projectStore.updateProject(draft => {
        if (!draft.plan) draft.plan = { rooms: [], walls: [], doors: [], windows: [], furniture: [], dimensions: [], stairs: [], ramps: [] };
        if (!Array.isArray(draft.plan.stairs)) draft.plan.stairs = [];
        draft.plan.stairs.push(stair);
        return draft;
      });
    }
    if (state.plan && state.plan.document) {
      if (!Array.isArray(state.plan.document.stairs)) state.plan.document.stairs = [];
      state.plan.document.stairs.push(stair);
      state.plan.selectedIds = new Set([stair.id]);
    }
    switchMode('plan');
    if (views && typeof views.callController === 'function') {
      views.callController('plan', 'render');
    }
    AudioService.playSuccess();
    showToast(`Stair (${r.risers.count}R) placed onto Plan Canvas`);
  }

  function sendToScratchpad() {
    const r = requireResult();
    if (!r) return;
    const f = r.formatted;
    if (views && typeof views.callController === 'function') {
      views.callController('scratchpad', 'addItem', {
        label: `Stair ${f.riserCount}R (${f.riser} × ${f.tread})`,
        value: `${f.totalRise} rise / ${f.totalRun} run`,
        unit: 'm',
        source: 'Stairs',
        metadata: {
          riserCount: r.risers.count,
          riser: r.risers.heightMeters,
          tread: r.treads.depthMeters,
          totalRise: r.input.totalRiseMeters,
          totalRun: r.geometry.totalRunMeters
        }
      });
    }
  }

  return {
    id: 'stairs',
    mount() {
      // Restore user preferences (preferences only — never project data)
      const prefs = loadPrefs();
      if (prefs.mode && Object.values(STAIR_INPUT_MODES).includes(prefs.mode)) {
        state.stairs.mode = prefs.mode;
        if (dom.stairsModeSelect) dom.stairsModeSelect.value = prefs.mode;
      }
      if (prefs.objective) {
        state.stairs.objective = prefs.objective;
        if (dom.stairsObjectiveSelect) dom.stairsObjectiveSelect.value = prefs.objective;
      }
      if (dom.stairsReferenceNote) {
        dom.stairsReferenceNote.textContent = STAIR_REFERENCE_DEFAULTS.riser.note + ' ' + STAIR_REFERENCE_DEFAULTS.blondel.note;
      }
      syncModeVisibility();
      calculate(false);
    },
    getController() {
      return {
        calculate, syncModeVisibility, copyResult, copySchedule,
        sendToCad, sendToWorkspace, saveToJournal, saveToProject,
        sendToScratchpad, applyToPlan
      };
    }
  };
}
