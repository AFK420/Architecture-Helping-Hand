/**
 * Architecture Helping Hand - Importer View (Mode 22)
 * Phase 15 (M10): normalized ingestion surface. Paste or choose a file,
 * preview the outcome (entities / units / confidence / warnings),
 * then send accepted geometry to the Plan Canvas or the dimension
 * workspace. The importer NEVER mutates the project directly — entities
 * land in the plan state through the same user-visible path as drawing.
 */

import {
  importSource, detectImportFormat, formatImportReport, detectImportDelimiter
} from '../../core/import/import-model.js';

const IMPORT_PREFS_KEY = 'archiscale_import_prefs';

export function createImportsView(context) {
  const { state, dom, showToast, setUnifiedResultState, AudioService, switchMode } = context;

  let lastReport = null;

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
    if (dom.importsErrorMsg) {
      dom.importsErrorMsg.textContent = `⚠️ ${message}`;
      dom.importsErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'imports', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.importsErrorMsg) {
      dom.importsErrorMsg.style.display = 'none';
      dom.importsErrorMsg.textContent = '';
    }
  }

  function readPrefs() {
    try {
      const raw = context.StorageService?.getItem(IMPORT_PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      context.StorageService?.setItem(IMPORT_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError('File is larger than 2 MB — export a trimmed selection first.');
      return;
    }
    try {
      const text = await file.text();
      if (dom.importsTextBox) {
        dom.importsTextBox.value = text.slice(0, 200000);
      }
      const detected = detectImportFormat(text);
      if (detected && dom.importsFormatSelect) {
        dom.importsFormatSelect.value = detected;
      }
      runImport();
    } catch (e) {
      showError('File could not be read.');
    }
  }

  function runImport() {
    const text = dom.importsTextBox?.value || '';
    if (!text.trim()) {
      showError('Paste content or choose a file first.');
      return;
    }
    let format = dom.importsFormatSelect?.value || 'auto';
    if (format === 'auto') {
      format = detectImportFormat(text) || 'csv';
    }
    const report = importSource(text, format, { delimiter: detectImportDelimiter(text) });
    lastReport = report;
    renderReport();
    if (report.ok) {
      clearError();
      AudioService.playSuccess();
      setUnifiedResultState({ toolPrefix: 'imports', status: 'success' });
    } else {
      AudioService.playKeyClick();
      setUnifiedResultState({ toolPrefix: 'imports', status: 'error', errorText: 'Import produced no entities' });
    }
  }

  function renderReport() {
    if (!dom.importsReportBox) return;
    if (!lastReport) {
      dom.importsReportBox.textContent = 'No import run yet.';
      return;
    }
    dom.importsReportBox.textContent = formatImportReport(lastReport);
    renderEntityPreview();
  }

  function renderEntityPreview() {
    if (!dom.importsEntityList) return;
    if (!lastReport || !lastReport.ok) {
      dom.importsEntityList.innerHTML = '';
      dom.importsEntityList.style.display = 'none';
      return;
    }
    dom.importsEntityList.style.display = 'flex';
    dom.importsEntityList.innerHTML = lastReport.entities.slice(0, 50).map((e, i) => {
      const dims = e.kind === 'line'
        ? `${fmt(e.x1)},${fmt(e.y1)} → ${fmt(e.x2)},${fmt(e.y2)} m`
        : e.kind === 'polyline'
          ? `${e.points.length} pts`
          : e.kind === 'circle'
            ? `r=${fmt(e.radius)} m`
            : e.kind === 'label'
              ? `at ${fmt(e.x)},${fmt(e.y)}`
              : `${fmt(e.width)} × ${fmt(e.depth)} m`;
      return `<div style="border: 1px solid var(--border-color-light); border-radius: 4px; padding: 0.25rem 0.5rem; font-family: var(--font-family-mono); font-size: 0.68rem; display: flex; justify-content: space-between; gap: 0.5rem;">
        <span>${escape(e.name || e.kind)} <span style="color: var(--text-muted);">· ${escape(e.kind)}</span></span>
        <span style="color: var(--text-muted);">${escape(dims)}</span>
      </div>`;
    }).join('') + (lastReport.entities.length > 50
      ? `<div style="font-size: 0.66rem; color: var(--text-muted);">… and ${lastReport.entities.length - 50} more</div>`
      : '');
  }

  function fmt(v) {
    return typeof v === 'number' && isFinite(v) ? v.toFixed(2) : '?';
  }

  function sendToPlan() {
    if (!lastReport || !lastReport.ok) {
      showToast('Run a successful import first', 'warning');
      return;
    }
    // Convert import entities into plan-canvas entity candidates (meters).
    const convert = e => {
      const id = `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      if (e.kind === 'room') {
        return { kind: 'room', id, name: e.name, x: e.x, y: e.y, width: e.width, depth: e.depth };
      }
      if (e.kind === 'line') {
        return { kind: 'wall', id, name: e.name, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, thickness: 0.1 };
      }
      if (e.kind === 'furniture') {
        return { kind: 'furniture', id, name: e.name, x: 0, y: 0, width: e.width, depth: e.depth };
      }
      if (e.kind === 'measurement') {
        return null; // measurements go to workspace, not the canvas
      }
      return null; // polylines/labels/circles: plan canvas supports rects+walls in scope
    };
    const imported = [];
    let skipped = 0;
    for (const e of lastReport.entities) {
      const c = convert(e);
      if (c) imported.push(c); else skipped++;
    }
    const measurements = lastReport.entities.filter(e => e.kind === 'measurement');
    if (measurements.length > 0 && context.projectStore) {
      context.projectStore.updateProject(draft => {
        for (const m of measurements) {
          draft.measurements.push({
            id: `meas-imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            label: m.name, value: Number(m.value.toFixed(3)), unit: 'm',
            source: 'Imported', status: 'Needs Verification', createdAt: new Date().toISOString()
          });
        }
        return draft;
      });
    }
    if (imported.length === 0 && measurements.length === 0) {
      showToast(`Nothing sendable — ${skipped} unsupported elements`, 'warning');
      return;
    }
    state.plan.entities.push(...imported);
    showToast(`Sent ${imported.length} entities to the Plan Canvas${measurements.length ? ` and ${measurements.length} measurements to the project (Needs Verification)` : ''}`);
    savePrefs({ lastFormat: dom.importsFormatSelect?.value });
    AudioService.playSuccess();
    if (imported.length > 0) {
      switchMode('plan');
      views.callController('plan', 'render');
    }
  }

  const views = context.views;

  return {
    id: 'imports',
    mount() {
      const prefs = readPrefs();
      if (prefs.lastFormat && dom.importsFormatSelect) {
        dom.importsFormatSelect.value = prefs.lastFormat;
      }
      renderReport();
    },
    onModeEnter() {
      renderReport();
    },
    getController() {
      return { runImport, handleFile, sendToPlan };
    }
  };
}
