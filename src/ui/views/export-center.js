/**
 * Architecture Helping Hand - Export Center View (Mode 17)
 * Phase 1: Universal Export Center. Owns the export picker, preview,
 * provenance display, and download/copy/print actions. All serialization is
 * delegated to core/export/export-model.js; side effects to services/export.js.
 */

import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_INFO,
  buildDXF,
  workspaceToTable,
  chainToTable,
  stairToTable,
  slopeToTable,
  decisionsToTable,
  notesToTable,
  chainToDXFEntities,
  roomsToDXFEntities,
  buildExport
} from '../../core/export/export-model.js';
import { generateChainSVG } from '../../core/dimension-chains.js';
import { generateStairSVG } from '../../core/stairs.js';
import { generateRampSVG } from '../../core/ramps.js';
import { generateSlopeSVG } from '../../core/slopes.js';
import { downloadExport, printExport } from '../../services/export.js';

export function createExportCenterView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    switchMode, views, projectStore
  } = context;

  function requireProject() {
    if (!projectStore) return null;
    try {
      return projectStore.getProject();
    } catch (e) {
      return null;
    }
  }

  function collectTables(source) {
    switch (source) {
      case 'workspace':
        return [workspaceToTable(state.workspace)];
      case 'chain':
        return [chainToTable(state.lastValidChain)];
      case 'stair':
        return [stairToTable(state.stairs.lastResult)];
      case 'ramp':
        return [slopeToTable(state.ramps.lastResult, 'Ramp Calculation')];
      case 'slope':
        return [slopeToTable(state.slopes.lastResult, 'Slope Analysis')];
      case 'decisions':
        return [decisionsToTable(requireProject())];
      case 'notes':
        return [notesToTable(requireProject())];
      default:
        return [];
    }
  }

  function collectSvgMarkup(source, diagramKey) {
    const key = diagramKey || source;
    try {
      if (key === 'chain' && state.lastValidChain) {
        return generateChainSVG(state.lastValidChain, { svgWidth: 860, svgHeight: 180 });
      }
      if (key === 'stair' && state.stairs.lastResult) {
        return generateStairSVG(state.stairs.lastResult, { width: 520, height: 240 });
      }
      if (key === 'ramp' && state.ramps.lastResult) {
        return generateRampSVG(state.ramps.lastResult, { width: 520, height: 220 });
      }
      if (key === 'slope' && state.slopes.lastResult) {
        return generateSlopeSVG(state.slopes.lastResult, { width: 520, height: 220 });
      }
    } catch (e) {
      // Diagram generators return safe empty SVG for invalid states
    }
    return null;
  }

  function collectDxfEntities(source, diagramKey) {
    const key = diagramKey || source;
    if (key === 'chain') return chainToDXFEntities(state.lastValidChain);
    if (key === 'rooms' || key === 'project') return roomsToDXFEntities(requireProject()?.rooms);
    return [];
  }

  function showError(message) {
    if (dom.exportErrorMsg) {
      dom.exportErrorMsg.textContent = `⚠️ ${message}`;
      dom.exportErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'export', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.exportErrorMsg) {
      dom.exportErrorMsg.style.display = 'none';
      dom.exportErrorMsg.textContent = '';
    }
  }

  function build(isExplicitRun = false) {
    const source = dom.exportSourceSelect?.value || 'project';
    const format = dom.exportFormatSelect?.value || EXPORT_FORMATS.JSON;
    const diagramKey = dom.exportDiagramSelect?.value || null;

    if (dom.exportFormatInfo) dom.exportFormatInfo.textContent = EXPORT_FORMAT_INFO[format] || '';
    if (dom.exportDiagramGroup) {
      dom.exportDiagramGroup.style.display = ['svg', 'dxf'].includes(format) ? 'block' : 'none';
    }
    if (dom.exportDxfScaleGroup) {
      dom.exportDxfScaleGroup.style.display = format === 'dxf' ? 'block' : 'none';
    }

    const request = { format, source, projectId: state.slopes ? null : null };
    const project = requireProject();
    if (project) request.projectId = project.id;

    if (format === 'json') {
      if (!project) {
        renderInvalid(isExplicitRun, 'No project available — run the project system first.');
        return;
      }
      request.project = project;
    } else if (format === 'svg') {
      request.svgMarkup = collectSvgMarkup(source, diagramKey);
      if (!request.svgMarkup) {
        renderInvalid(isExplicitRun, 'No diagram available for the selected geometry source — run that tool first.');
        return;
      }
    } else if (format === 'dxf') {
      request.dxfEntities = collectDxfEntities(source, diagramKey);
      request.dxfScale = parseFloat(dom.exportDxfScale?.value) || 1000;
    } else {
      request.tables = collectTables(source);
      if (!request.tables || request.tables.filter(Boolean).length === 0) {
        renderInvalid(isExplicitRun, 'No exportable data for this source — run the source tool first.');
        return;
      }
    }

    // DXF scale is applied through the model's option path
    let result;
    try {
      result = buildExport(request);
    } catch (e) {
      renderInvalid(isExplicitRun, e.message);
      return;
    }

    clearError();
    state.exportCenter.lastResult = result;

    if (dom.exportPreviewBox) dom.exportPreviewBox.value = result.content;
    if (dom.exportSummaryBadge) {
      dom.exportSummaryBadge.textContent = `${result.content.length} chars · ${result.fileName}`;
    }
    if (dom.exportProvenance) {
      dom.exportProvenance.textContent =
        `source: ${result.provenance.source} · format: ${result.provenance.format} · exported: ${result.provenance.exportedAt}${result.provenance.projectId ? ` · project: ${result.provenance.projectId}` : ''}`;
    }

    setUnifiedResultState({ toolPrefix: 'export', status: 'success' });
    if (isExplicitRun) AudioService.playTick();
  }

  function renderInvalid(isExplicitRun, message) {
    if (dom.exportPreviewBox) dom.exportPreviewBox.value = '';
    if (dom.exportSummaryBadge) dom.exportSummaryBadge.textContent = '—';
    showError(message);
    if (isExplicitRun) AudioService.playTick();
  }

  function download() {
    const r = state.exportCenter.lastResult;
    if (!r) {
      showToast('Build an export preview first', 'warning');
      return;
    }
    const ok = downloadExport(r.content, r.fileName, r.provenance.format);
    if (ok) {
      showToast(`Downloaded ${r.fileName}`);
      AudioService.playSuccess();
    } else {
      showToast('Download failed', 'warning');
    }
  }

  function copy() {
    const r = state.exportCenter.lastResult;
    if (!r) {
      showToast('Build an export preview first', 'warning');
      return;
    }
    context.copyToClipboard(r.content, 'Export content');
  }

  function print() {
    const r = state.exportCenter.lastResult;
    if (!r) {
      showToast('Build an export preview first', 'warning');
      return;
    }
    const ok = printExport(r.fileName, r.content);
    if (ok) showToast('Print window opened');
    else showToast('Print blocked — allow popups for this page', 'warning');
  }

  return {
    id: 'export',
    mount() {
      build(false);
    },
    getController() {
      return { build, download, copy, print };
    }
  };
}
