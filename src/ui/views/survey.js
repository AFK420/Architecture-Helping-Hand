/**
 * Architecture Helping Hand - Survey Notebook View (Mode 23)
 * Phase 16 (M1): surfaces the tested pure cores (src/core/survey.js,
 * annotations.js) as a measurement notebook. Survey measurements keep
 * provenance (source + verification status) and may stay uncertain —
 * recording never forces geometry. The room proposal is a PROPOSAL: the
 * student accepts/edits it before the plan changes, through the same
 * entity path as drawing on the Plan Canvas.
 *
 * Image calibration is pure math (two-point known distance); image blobs
 * never enter localStorage — only the calibration numbers persist.
 */

import {
  MEASUREMENT_SOURCES,
  MEASUREMENT_STATUSES,
  createMeasurement,
  setMeasurementStatus,
  summarizeSurvey,
  proposeRoomFromMeasurements,
  createCalibration,
  calibratedDistance,
  calibratedChainDistance,
  calibratedPolygonArea,
  validateImageMeta
} from '../../core/survey.js';
import { createRoom, roomArea } from '../../core/entities.js';
import { parseInput } from '../../core/parser.js';
import { UNITS } from '../../core/units.js';

const SURVEY_PREFS_KEY = 'archiscale_survey_prefs'; // user preferences only

export function createSurveyView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    switchMode, views, projectStore, StorageService
  } = context;

  // Working calibration (numbers only — image data never persists)
  let calibration = null;
  let calPending = { a: null, b: null }; // pixel points clicked in order

  function savePrefs() {
    try {
      StorageService.setItem(SURVEY_PREFS_KEY, JSON.stringify({
        defaultSource: state.survey.defaultSource
      }));
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      const raw = StorageService.getItem(SURVEY_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  }

  function escape(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showError(message) {
    if (dom.surveyErrorMsg) {
      dom.surveyErrorMsg.textContent = `⚠️ ${message}`;
      dom.surveyErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'survey', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.surveyErrorMsg) {
      dom.surveyErrorMsg.style.display = 'none';
      dom.surveyErrorMsg.textContent = '';
    }
  }

  /** Returns the live measurements array from the project document (never null). */
  function measurements() {
    const p = projectStore?.getProject();
    if (!p) return [];
    if (!Array.isArray(p.measurements)) return [];
    return p.measurements;
  }

  /** Parses a user length field ("4.8m", "3200mm", "12'6") into meters. */
  function parseLengthField(el) {
    if (!el) return null;
    const raw = (el.value || '').trim();
    if (!raw) return null;
    const res = parseInput(raw, { allowNegative: false });
    if (!res.isValid || res.value <= 0) return null;
    const unitKey = res.detectedUnit || 'm';
    return res.value * UNITS[unitKey].toMeters;
  }

  // ------------------------------------------------------------------
  // Recording measurements (provenance + status preserved)
  // ------------------------------------------------------------------
  function addMeasurement() {
    const label = (dom.surveyLabel?.value || '').trim();
    if (!label) {
      showError('Give the measurement a label (e.g. "Room W").');
      return;
    }
    const meters = parseLengthField(dom.surveyValue);
    if (meters === null) {
      showError('Enter a valid length (e.g. "4.8m", "3200mm", "12\'6").');
      return;
    }
    const source = dom.surveySource?.value || 'Measured';
    if (!MEASUREMENT_SOURCES.includes(source)) {
      showError(`Unknown source "${source}".`);
      return;
    }
    const note = (dom.surveyNote?.value || '').trim();
    // Canonical display unit drives both the record and the meters field.
    const displayUnit = 'm';
    const record = createMeasurement({
      label,
      value: Number(meters.toFixed(4)),
      unit: displayUnit,
      source,
      status: 'Unverified',
      note,
      location: (dom.surveyLocation?.value || '').trim()
    });
    record.meters = meters;

    const saved = projectStore.updateProject(draft => {
      draft.measurements = Array.isArray(draft.measurements) ? draft.measurements : [];
      draft.measurements.push(record);
      return draft;
    });
    if (!saved.ok) {
      showError(`Project save failed: ${saved.errors[0]}`);
      return;
    }
    if (dom.surveyLabel) dom.surveyLabel.value = '';
    if (dom.surveyValue) dom.surveyValue.value = '';
    if (dom.surveyNote) dom.surveyNote.value = '';
    clearError();
    renderMeasurements();
    AudioService.playTick();
    showToast(`Recorded "${label}" (${meters.toFixed(2)} m, Unverified)`);
  }

  function verifyMeasurement(id) {
    transitionMeasurement(id, 'Verified');
  }

  function reviewMeasurement(id) {
    transitionMeasurement(id, 'Needs Review');
  }

  function transitionMeasurement(id, status) {
    const current = measurements().find(m => m.id === id);
    if (!current) {
      showError('Measurement not found.');
      return;
    }
    try {
      const updated = setMeasurementStatus(current, status);
      const saved = projectStore.updateProject(draft => {
        draft.measurements = draft.measurements.map(m => (m.id === id ? { ...m, ...updated } : m));
        return draft;
      });
      if (!saved.ok) {
        showError(`Project save failed: ${saved.errors[0]}`);
        return;
      }
      renderMeasurements();
      AudioService.playTick();
      showToast(`"${current.label}" marked ${status}`);
    } catch (e) {
      showError(e.message);
    }
  }

  function deleteMeasurement(id) {
    const target = measurements().find(m => m.id === id);
    const saved = projectStore.updateProject(draft => {
      draft.measurements = (draft.measurements || []).filter(m => m.id !== id);
      return draft;
    });
    if (!saved.ok) {
      showError(`Project save failed: ${saved.errors[0]}`);
      return;
    }
    renderMeasurements();
    showToast(`Deleted "${target ? target.label : id}"`);
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function renderMeasurements() {
    if (!dom.surveyMeasurementList) return;
    const list = measurements();
    const summary = summarizeSurvey(list);

    if (dom.surveySummary) {
      if (list.length === 0) {
        dom.surveySummary.textContent = 'No measurements recorded yet.';
      } else {
        const parts = MEASUREMENT_STATUSES
          .filter(s => summary.byStatus[s] > 0)
          .map(s => `${summary.byStatus[s]} ${s}`);
        dom.surveySummary.textContent = `${summary.total} recorded · ${parts.join(' · ')}`;
      }
    }

    if (list.length === 0) {
      dom.surveyMeasurementList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Empty notebook — record a measurement above, or import one through the Importer.</div>';
      renderProposal();
      return;
    }

    dom.surveyMeasurementList.innerHTML = list.map(m => {
      const meters = typeof m.meters === 'number' && isFinite(m.meters)
        ? m.meters
        : (typeof m.value === 'number' ? m.value : null);
      const display = meters !== null ? `${meters.toFixed(2)} m` : '?';
      const statusColor = m.status === 'Verified'
        ? 'var(--color-success, #4ade80)'
        : m.status === 'Needs Review' ? 'var(--color-warning, #fbbf24)' : 'var(--text-muted)';
      return `<div class="survey-measurement-row" data-id="${escape(m.id)}" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.45rem 0.6rem; border: 1px solid var(--border-color-light); border-radius: 5px;">
        <div style="min-width: 0;">
          <div style="display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap;">
            <strong style="color: var(--accent-primary); font-family: var(--font-family-mono);">${escape(m.label)}</strong>
            <span style="font-family: var(--font-family-mono); font-size: 0.8rem;">${escape(display)}</span>
            <span style="font-size: 0.66rem; padding: 0.05rem 0.4rem; border: 1px solid var(--border-color-light); border-radius: 999px; color: ${statusColor};">${escape(m.status)}</span>
          </div>
          <div style="font-size: 0.66rem; color: var(--text-muted);">${escape(m.source)}${m.location ? ' · ' + escape(m.location) : ''}${m.note ? ' · ' + escape(m.note) : ''}</div>
        </div>
        <div style="display: flex; gap: 0.3rem; flex-shrink: 0;">
          ${m.status !== 'Verified' ? `<button type="button" class="survey-verify-btn result-action-btn" data-id="${escape(m.id)}" title="Mark verified" style="padding: 0.2rem 0.5rem; font-size: 0.68rem;"><span>✓</span></button>` : ''}
          ${m.status !== 'Needs Review' ? `<button type="button" class="survey-review-btn result-action-btn" data-id="${escape(m.id)}" title="Mark needs review" style="padding: 0.2rem 0.5rem; font-size: 0.68rem;"><span>?</span></button>` : ''}
          <button type="button" class="survey-delete-btn result-action-btn" data-id="${escape(m.id)}" title="Delete record" style="padding: 0.2rem 0.5rem; font-size: 0.68rem;"><span>🗑</span></button>
        </div>
      </div>`;
    }).join('');

    dom.surveyMeasurementList.querySelectorAll('.survey-verify-btn').forEach(btn =>
      btn.addEventListener('click', () => verifyMeasurement(btn.dataset.id)));
    dom.surveyMeasurementList.querySelectorAll('.survey-review-btn').forEach(btn =>
      btn.addEventListener('click', () => reviewMeasurement(btn.dataset.id)));
    dom.surveyMeasurementList.querySelectorAll('.survey-delete-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteMeasurement(btn.dataset.id)));

    renderProposal();
  }

  // ------------------------------------------------------------------
  // Room proposal (never applied silently)
  // ------------------------------------------------------------------
  function renderProposal() {
    if (!dom.surveyProposalBox) return;
    const result = proposeRoomFromMeasurements(measurements(), (dom.surveyRoomName?.value || '').trim() || 'Surveyed Room');
    if (!result.proposal) {
      dom.surveyProposalBox.innerHTML = `<span style="color: var(--text-muted); font-size: 0.75rem;">Needs two verified W/D measurements (labels like "Room W" / "Room D") to propose a room${result.unverifiedCount ? ` — ${result.unverifiedCount} unverified record(s) waiting` : ''}.</span>`;
      return;
    }
    const p = result.proposal;
    dom.surveyProposalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
        <div>
          <strong style="color: var(--accent-primary); font-family: var(--font-family-mono);">${escape(p.name)}</strong>
          <span style="font-family: var(--font-family-mono); font-size: 0.8rem;"> — ${p.widthMeters.toFixed(2)} × ${p.depthMeters.toFixed(2)} m (${(p.widthMeters * p.depthMeters).toFixed(2)} m²)</span>
          <div style="font-size: 0.66rem; color: var(--text-muted);">${escape(p.note)}${result.unverifiedCount ? ` (${result.unverifiedCount} unverified)` : ''}</div>
        </div>
        <button type="button" id="btn-survey-accept-proposal" class="result-action-btn" title="Create this room on the Plan Canvas">
          <span>➜ Send to Plan</span>
        </button>
      </div>`;
    const accept = dom.surveyProposalBox.querySelector('#btn-survey-accept-proposal');
    if (accept) accept.addEventListener('click', acceptProposal);
  }

  function acceptProposal() {
    const result = proposeRoomFromMeasurements(measurements(), (dom.surveyRoomName?.value || '').trim() || 'Surveyed Room');
    if (!result.proposal) {
      showToast('No verified proposal available', 'warning');
      return;
    }
    const p = result.proposal;
    let room;
    try {
      room = createRoom({ name: p.name, x: 0, y: 0, width: p.widthMeters, depth: p.depthMeters });
    } catch (e) {
      showError(e.message);
      return;
    }
    state.plan.entities.push(room);
    if (views.hasController('plan', 'render')) {
      switchMode('plan');
      views.callController('plan', 'render');
    }
    AudioService.playSuccess();
    showToast(`Proposal accepted: room "${room.name}" ${p.widthMeters.toFixed(2)} × ${p.depthMeters.toFixed(2)} m added to the Plan Canvas (edit it there)`);
  }

  // ------------------------------------------------------------------
  // Image calibration (pure numbers; image bytes never persist)
  // ------------------------------------------------------------------
  function setCalibration() {
    const realMeters = parseLengthField(dom.surveyCalDistance);
    if (realMeters === null) {
      showError('Enter the known real distance (e.g. "4.8m").');
      return;
    }
    const ax = parseFloat(dom.surveyCalAx?.value);
    const ay = parseFloat(dom.surveyCalAy?.value);
    const bx = parseFloat(dom.surveyCalBx?.value);
    const by = parseFloat(dom.surveyCalBy?.value);
    try {
      calibration = createCalibration({
        pointA: { x: ax, y: ay },
        pointB: { x: bx, y: by },
        realMeters
      });
    } catch (e) {
      showError(e.message);
      return;
    }
    clearError();
    renderCalibration();
    AudioService.playTick();
    showToast(`Calibrated: ${calibration.metersPerPixel.toFixed(4)} m/px`);
  }

  function renderCalibration() {
    if (!dom.surveyCalStatus) return;
    if (!calibration) {
      dom.surveyCalStatus.textContent = 'Not calibrated — enter two image points and the known real distance.';
      return;
    }
    dom.surveyCalStatus.textContent = `${calibration.metersPerPixel.toFixed(4)} m/px · ${calibration.pixelsPerMeter.toFixed(2)} px/m (from ${calibration.pixelDistance.toFixed(1)} px = ${calibration.realMeters.toFixed(2)} m)`;
  }

  function measureCalibrated(kind) {
    if (!calibration) {
      showError('Calibrate first (two points + known distance).');
      return;
    }
    const readPoints = (n) => {
      const pts = [];
      for (let i = 1; i <= n; i++) {
        const x = parseFloat(dom[`surveyMeasP${i}x`]?.value);
        const y = parseFloat(dom[`surveyMeasP${i}y`]?.value);
        if (!isFinite(x) || !isFinite(y)) return null;
        pts.push({ x, y });
      }
      return pts;
    };

    try {
      if (kind === 'distance') {
        const pts = readPoints(2);
        if (!pts) {
          showError('Enter both points (P1, P2).');
          return;
        }
        recordCalibrated('Calibrated distance', calibratedDistance(calibration, pts[0], pts[1]), 'point-to-point');
      } else if (kind === 'chain') {
        const pts = [];
        for (let i = 1; i <= 4; i++) {
          const x = parseFloat(dom[`surveyMeasP${i}x`]?.value);
          const y = parseFloat(dom[`surveyMeasP${i}y`]?.value);
          if (isFinite(x) && isFinite(y)) pts.push({ x, y });
        }
        if (pts.length < 2) {
          showError('A chained walk needs at least two filled points.');
          return;
        }
        recordCalibrated('Calibrated chain', calibratedChainDistance(calibration, pts), `${pts.length}-point walk`);
      } else if (kind === 'area') {
        const pts = [];
        for (let i = 1; i <= 4; i++) {
          const x = parseFloat(dom[`surveyMeasP${i}x`]?.value);
          const y = parseFloat(dom[`surveyMeasP${i}y`]?.value);
          if (isFinite(x) && isFinite(y)) pts.push({ x, y });
        }
        if (pts.length < 3) {
          showError('A polygon area needs at least three filled points.');
          return;
        }
        recordCalibrated('Calibrated area', calibratedPolygonArea(calibration, pts), `${pts.length}-point polygon`, 'm2');
      }
    } catch (e) {
      showError(e.message);
    }
  }

  /** Records a calibrated result as a measurement (m² values flagged in the label). */
  function recordCalibrated(label, value, note, unitKind = 'm') {
    const record = createMeasurement({
      label,
      value: Number(value.toFixed(4)),
      unit: 'm',
      source: 'Measured',
      status: 'Unverified',
      note: `Calibrated ${note}`
    });
    record.meters = unitKind === 'm2' ? null : value;
    if (unitKind === 'm2') {
      record.unit = 'm²';
      record.value = Number(value.toFixed(4));
    }
    const saved = projectStore.updateProject(draft => {
      draft.measurements = Array.isArray(draft.measurements) ? draft.measurements : [];
      draft.measurements.push(record);
      return draft;
    });
    if (!saved.ok) {
      showError(`Project save failed: ${saved.errors[0]}`);
      return;
    }
    renderMeasurements();
    AudioService.playSuccess();
    showToast(`${label}: ${value.toFixed(3)} ${unitKind === 'm2' ? 'm²' : 'm'} recorded (Unverified)`);
  }

  // ------------------------------------------------------------------
  // Image descriptor gate (weak-laptop limits; bytes never stored)
  // ------------------------------------------------------------------
  function handleImage(file) {
    if (!file) return;
    const meta = validateImageMeta({
      widthPx: file.widthPx,
      heightPx: file.heightPx,
      bytes: file.size
    });
    if (!meta.ok) {
      showError(meta.problems.join(' '));
      return;
    }
    showToast('Image constraints OK — calibrate below with two points and a known distance (image bytes stay local).');
  }

  return {
    id: 'survey',
    mount() {
      const prefs = loadPrefs();
      if (prefs.defaultSource && MEASUREMENT_SOURCES.includes(prefs.defaultSource) && dom.surveySource) {
        dom.surveySource.value = prefs.defaultSource;
      }
      renderMeasurements();
      renderCalibration();
    },
    onModeEnter() {
      renderMeasurements();
      renderCalibration();
    },
    getController() {
      return {
        addMeasurement, verifyMeasurement, deleteMeasurement,
        renderMeasurements, setCalibration, measureCalibrated, handleImage, acceptProposal
      };
    }
  };
}
