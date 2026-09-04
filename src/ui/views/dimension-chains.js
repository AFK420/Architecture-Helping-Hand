/**
 * Architecture Helping Hand - Dimension Chains View (Mode 10)
 * Extracted from ui/app.js during Stabilization 1. Owns the chain
 * calculation, SVG/table rendering, inline row editing, segment selection,
 * and template loading.
 */

import { CHAIN_STORAGE_KEY } from '../../core/dimension-chains.js';
import { CHAIN_TEMPLATES, calculateChain, generateChainSVG, parseQuickChainInput, createDimensionChain, createChainSegment } from '../../core/dimension-chains.js';

export function createChainsView(context) {
  const { state, dom, showToast, setUnifiedResultState, AudioService, StorageService } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function saveChain() {
    if (state.activeChain) {
      StorageService.setItem(CHAIN_STORAGE_KEY, JSON.stringify(state.activeChain));
    }
  }

  function calculateAndRenderChain(isExplicitRun = false) {
    if (!state.activeChain) return;

    // Sync input fields to state.activeChain
    if (dom.chainsNameInput) state.activeChain.name = dom.chainsNameInput.value.trim() || 'Dimension Chain';
    if (dom.chainsScaleSelect) state.activeChain.scaleRatio = parseFloat(dom.chainsScaleSelect.value) || 50;
    if (dom.chainsUnitSelect) state.activeChain.defaultUnit = dom.chainsUnitSelect.value || 'mm';
    if (dom.chainsStartOffsetInput) state.activeChain.startOffsetRaw = dom.chainsStartOffsetInput.value.trim() || '0';
    if (dom.chainsEndOffsetInput) state.activeChain.endOffsetRaw = dom.chainsEndOffsetInput.value.trim() || '0';

    const calc = calculateChain(state.activeChain, {
      displayUnit: state.activeChain.defaultUnit,
      scaleRatio: state.activeChain.scaleRatio,
      precision: state.precision
    });

    state.lastValidChain = calc;

    // Update Result Hero and Breakdown Metrics
    if (dom.chainsOverallVal) dom.chainsOverallVal.textContent = calc.overallExtentFormatted;
    if (dom.chainsDrawingOverall) {
      dom.chainsDrawingOverall.textContent = `Drawing @ 1:${calc.scaleRatio}: ${calc.drawingOverallFormatted}`;
    }
    if (dom.chainsCountBadge) {
      dom.chainsCountBadge.textContent = `${calc.segmentCount} SEGMENTS`;
    }
    if (dom.chainsSegTotalVal) dom.chainsSegTotalVal.textContent = calc.segmentTotalFormatted;
    if (dom.chainsAlwTotalVal) dom.chainsAlwTotalVal.textContent = calc.allowanceTotalFormatted;
    if (dom.chainsStartOffsetVal) dom.chainsStartOffsetVal.textContent = calc.startOffsetFormatted;
    if (dom.chainsEndOffsetVal) dom.chainsEndOffsetVal.textContent = calc.endOffsetFormatted;

    // Update Live Input Preview
    if (dom.chainsQuickInput) {
      const quickVal = dom.chainsQuickInput.value.trim();
      if (quickVal) {
        const segs = parseQuickChainInput(quickVal, { defaultUnit: state.activeChain.defaultUnit });
        if (segs.length > 0) {
          dom.chainsLivePreview.textContent = `Live: +${segs.length} segment(s)`;
          dom.chainsLivePreview.style.color = 'var(--text-accent)';
        }
      } else {
        dom.chainsLivePreview.textContent = 'Live: Ready';
        dom.chainsLivePreview.style.color = 'var(--text-muted)';
      }
    }

    // Render SVG Visualizer and Schedule Table
    renderChainSVGView(calc);
    renderChainTable(calc);
    updateSelectedSegmentInspector(calc);

    setUnifiedResultState({
      toolPrefix: 'chains',
      status: calc.isValid ? 'success' : (calc.invalidCount > 0 ? 'error' : 'ready'),
      errorText: calc.invalidCount > 0 ? `⚠️ ${calc.invalidCount} segment(s) have invalid measurement inputs` : ''
    });

    saveChain();

    if (isExplicitRun) {
      AudioService.playTick();
    }
  }

  function renderChainSVGView(calc) {
    if (!dom.chainsSvgViewportWrapper) return;
    // Large drafting viewport: taller canvas with more label headroom. The
    // SVG keeps its aspect via CSS (.chain-svg-viewport) and scales to fill
    // the wide chain container.
    const svgMarkup = generateChainSVG(calc, {
      selectedSegmentId: state.chainSelectedSegmentId,
      svgWidth: 1000,
      svgHeight: 340
    });
    dom.chainsSvgViewportWrapper.innerHTML = svgMarkup;
  }

  function updateSelectedSegmentInspector(calc) {
    if (!dom.chainsSelectedInspector) return;

    if (!state.chainSelectedSegmentId) {
      dom.chainsSelectedInspector.style.display = 'none';
      return;
    }

    const seg = (calc.segments || []).find(s => s.id === state.chainSelectedSegmentId);
    if (!seg) {
      dom.chainsSelectedInspector.style.display = 'none';
      return;
    }

    dom.chainsSelectedInspector.style.display = 'flex';
    if (dom.chainsInspectorName) dom.chainsInspectorName.textContent = seg.name;
    if (dom.chainsInspectorLen) dom.chainsInspectorLen.textContent = seg.lengthFormatted;
    if (dom.chainsInspectorStart) dom.chainsInspectorStart.textContent = seg.startFormatted;
    if (dom.chainsInspectorEnd) dom.chainsInspectorEnd.textContent = seg.endFormatted;
    if (dom.chainsInspectorDraw) dom.chainsInspectorDraw.textContent = seg.drawingFormatted;
  }

  function renderChainTable(calc) {
    if (!dom.chainsTableBody) return;

    if (!calc.segments || calc.segments.length === 0) {
      dom.chainsTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic;">
            No segments in this dimension chain. Type numbers above (e.g. 1200 + 1800 + 900) or pick a template to get started.
          </td>
        </tr>
      `;
      return;
    }

    dom.chainsTableBody.innerHTML = calc.segments.map((seg, idx) => {
      const isSelected = seg.id === state.chainSelectedSegmentId;
      const typeBadgeClass = seg.dimensionType === 'reference'
        ? 'badge-role-ref'
        : seg.dimensionType === 'allowance'
        ? 'badge-role-alw'
        : 'badge-role-seg';

      const typeShortLabel = seg.dimensionType === 'reference'
        ? 'REF'
        : seg.dimensionType === 'allowance'
        ? 'ALW'
        : 'SEG';

      return `
        <tr class="chain-row ${isSelected ? 'is-selected' : ''}" data-id="${seg.id}" data-index="${idx}">
          <td style="text-align: center; font-family: var(--font-family-mono); font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="text-align: center;">
            <input type="checkbox" class="chain-toggle-chk" data-index="${idx}" ${seg.enabled !== false ? 'checked' : ''} title="Toggle segment enable/disable" />
          </td>
          <td>
            <input type="text" class="chain-inline-name" data-index="${idx}" value="${escapeHtml(seg.name)}" placeholder="Name" style="background: transparent; border: 1px solid transparent; width: 100%; font-weight: 600; color: var(--text-primary);" />
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${seg.startFormatted}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${seg.endFormatted}</td>
          <td>
            <input type="text" class="chain-inline-input" data-index="${idx}" value="${escapeHtml(seg.rawInput)}" style="background: transparent; border: 1px solid var(--border-color-light); border-radius: 3px; padding: 2px 4px; width: 90px; font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-primary);" />
          </td>
          <td style="text-align: center;">
            <button type="button" class="dim-type-badge ${typeBadgeClass} chain-type-cycle-btn" data-index="${idx}" title="Click to cycle type (SEG ➔ REF ➔ ALW)">
              ${typeShortLabel}
            </button>
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">${seg.drawingFormatted}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="chain-reorder-btn chain-move-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move segment up">↑</button>
            <button type="button" class="chain-reorder-btn chain-move-down" data-index="${idx}" ${idx === calc.segments.length - 1 ? 'disabled' : ''} title="Move segment down">↓</button>
          </td>
          <td style="text-align: center;">
            <button type="button" class="chain-row-del-btn" data-index="${idx}" title="Delete segment">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row selection click listeners
    dom.chainsTableBody.querySelectorAll('.chain-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        const id = row.dataset.id;
        selectChainSegment(state.chainSelectedSegmentId === id ? null : id);
      });
    });

    // Toggle segment enabled checkbox
    dom.chainsTableBody.querySelectorAll('.chain-toggle-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].enabled = e.target.checked;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Inline name edit
    dom.chainsTableBody.querySelectorAll('.chain-inline-name').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].name = e.target.value.trim() || `Segment ${idx + 1}`;
          calculateAndRenderChain(false);
        }
      });
    });

    // Inline measurement edit
    dom.chainsTableBody.querySelectorAll('.chain-inline-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].rawInput = e.target.value.trim();
          calculateAndRenderChain(true);
        }
      });
    });

    // Cycle type button
    dom.chainsTableBody.querySelectorAll('.chain-type-cycle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          const curType = state.activeChain.segments[idx].dimensionType;
          const nextType = curType === 'segment' ? 'reference' : (curType === 'reference' ? 'allowance' : 'segment');
          state.activeChain.segments[idx].dimensionType = nextType;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Move Up / Down buttons
    dom.chainsTableBody.querySelectorAll('.chain-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx > 0) {
          const temp = state.activeChain.segments[idx];
          state.activeChain.segments[idx] = state.activeChain.segments[idx - 1];
          state.activeChain.segments[idx - 1] = temp;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    dom.chainsTableBody.querySelectorAll('.chain-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx < state.activeChain.segments.length - 1) {
          const temp = state.activeChain.segments[idx];
          state.activeChain.segments[idx] = state.activeChain.segments[idx + 1];
          state.activeChain.segments[idx + 1] = temp;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Delete segment button
    dom.chainsTableBody.querySelectorAll('.chain-row-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          const delId = state.activeChain.segments[idx].id;
          if (state.chainSelectedSegmentId === delId) state.chainSelectedSegmentId = null;
          state.activeChain.segments.splice(idx, 1);
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });
  }

  function selectChainSegment(id) {
    state.chainSelectedSegmentId = id;
    if (state.lastValidChain) {
      renderChainSVGView(state.lastValidChain);
      updateSelectedSegmentInspector(state.lastValidChain);
      // Highlight row in table
      dom.chainsTableBody?.querySelectorAll('.chain-row').forEach(row => {
        row.classList.toggle('is-selected', row.dataset.id === id);
      });
    }
  }

  function addSegmentsToChain(rawStr) {
    if (!rawStr || typeof rawStr !== 'string' || !rawStr.trim()) return;
    const newSegs = parseQuickChainInput(rawStr.trim(), { defaultUnit: state.activeChain.defaultUnit });
    if (newSegs.length > 0) {
      if (!Array.isArray(state.activeChain.segments)) state.activeChain.segments = [];
      state.activeChain.segments.push(...newSegs);
      calculateAndRenderChain(true);
      AudioService.playTick();
      showToast(`Added ${newSegs.length} segment(s) to chain`);
    }
  }

  function loadChainTemplate(templateKey) {
    const tpl = CHAIN_TEMPLATES[templateKey];
    if (!tpl) return;
    state.activeChain = createDimensionChain({
      name: tpl.name,
      defaultUnit: tpl.defaultUnit || 'mm',
      scaleRatio: state.activeChain?.scaleRatio || 50,
      segments: tpl.segments.map(s => createChainSegment(s, tpl.defaultUnit || 'mm'))
    });
    if (dom.chainsNameInput) dom.chainsNameInput.value = state.activeChain.name;
    if (dom.chainsUnitSelect) dom.chainsUnitSelect.value = state.activeChain.defaultUnit;
    state.chainSelectedSegmentId = null;
    calculateAndRenderChain(true);
    AudioService.playTick();
    showToast(`Loaded "${tpl.name}" template`);
  }

  return {
    id: 'chains',
    mount() {},
    getController() {
      return {
        saveChain,
        calculateAndRenderChain,
        addSegmentsToChain,
        loadChainTemplate,
        selectChainSegment
      };
    }
  };
}
