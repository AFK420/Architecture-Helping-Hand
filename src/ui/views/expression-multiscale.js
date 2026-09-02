/**
 * Architecture Helping Hand - Expression & Multi-Scale Views (Modes 8-9)
 * Extracted from ui/app.js during Stabilization 1. Mode 8 owns the dimension
 * expression controller and recent-expression history; Mode 9 owns the
 * multi-scale comparison table, favorites, and custom scales.
 */

import { SCALE_PRESET_GROUPS } from '../../core/multi-scale.js';
import { compareAcrossScales, getDefaultComparisonScales } from '../../core/multi-scale.js';
import { evaluateExpressionSafe } from '../../core/dimension-expression.js';
import { createDimensionEntry } from '../../core/dimension-workspace.js';

export function createExpressionView(context) {
  const { state, dom, setUnifiedResultState, AudioService, views } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function calculateExpression(isExplicitRun = false) {
    if (!dom.expressionInput) return;

    const rawExpr = dom.expressionInput.value.trim();
    const defaultUnit = dom.expressionDefaultUnit?.value || 'mm';
    let scaleRatio = 50;
    if (dom.expressionScaleSelect) {
      if (dom.expressionScaleSelect.value === 'custom') {
        scaleRatio = parseFloat(dom.expressionCustomScaleInput?.value) || 50;
      } else {
        scaleRatio = parseFloat(dom.expressionScaleSelect.value) || 50;
      }
    }

    // Empty input state
    if (rawExpr === '') {
      if (dom.expressionLivePreview) dom.expressionLivePreview.textContent = 'Live: Ready';
      if (dom.expressionErrorMsg) dom.expressionErrorMsg.style.display = 'none';
      if (dom.expressionResultVal) dom.expressionResultVal.textContent = '0';
      if (dom.expressionResultUnit) dom.expressionResultUnit.textContent = defaultUnit;
      if (dom.expressionDrawingVal) dom.expressionDrawingVal.textContent = `0 ${defaultUnit}`;
      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'ready'
      });
      return;
    }

    const evalResult = evaluateExpressionSafe(rawExpr, {
      defaultUnit,
      scaleRatio,
      precision: state.precision
    });

    if (evalResult.isValid) {
      state.lastValidExpression = evalResult;

      // Update Live Preview Pill
      if (dom.expressionLivePreview) {
        dom.expressionLivePreview.textContent = `Live: = ${evalResult.formatted}`;
        dom.expressionLivePreview.style.color = 'var(--text-accent)';
      }
      if (dom.expressionErrorMsg) dom.expressionErrorMsg.style.display = 'none';

      // Update Primary Result Value & Unit
      if (dom.expressionResultVal) dom.expressionResultVal.textContent = evalResult.formatted.replace(/\s*[a-zA-Z²³_"-]+$/, '') || evalResult.formatted;
      if (dom.expressionResultUnit) dom.expressionResultUnit.textContent = (evalResult.dimension === 'scalar') ? 'scalar count' : evalResult.displayUnit;

      // Update Dimension Badge
      if (dom.expressionDimBadge) {
        dom.expressionDimBadge.textContent = evalResult.dimension.toUpperCase();
        dom.expressionDimBadge.className = evalResult.dimension === 'scalar' ? 'type-badge badge-alw' : 'type-badge badge-seg';
      }

      // Update Drawing Scale Output
      if (dom.expressionDrawingLabel) {
        dom.expressionDrawingLabel.textContent = `Scale 1:${scaleRatio}`;
      }
      if (dom.expressionDrawingVal) {
        dom.expressionDrawingVal.textContent = evalResult.drawingFormatted || '---';
      }

      // Update Secondary Unit Equivalents
      if (dom.expressionSecondaryReadout && evalResult.secondaryFormatted.length > 0) {
        dom.expressionSecondaryReadout.innerHTML = evalResult.secondaryFormatted.map(sec => `
          <div class="secondary-item"><span class="sec-unit">${sec.unit}</span><span class="sec-val">${sec.formatted}</span></div>
        `).join('');
      } else if (dom.expressionSecondaryReadout && evalResult.dimension === 'scalar') {
        dom.expressionSecondaryReadout.innerHTML = `
          <div class="secondary-item"><span class="sec-unit">count</span><span class="sec-val">${evalResult.formatted}</span></div>
        `;
      }

      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'success'
      });

      if (isExplicitRun) {
        addRecentExpression(rawExpr, evalResult.formatted);
        AudioService.playTick();
      }
    } else {
      // Invalid or incomplete syntax
      if (dom.expressionLivePreview) {
        dom.expressionLivePreview.textContent = `Live: Incomplete`;
        dom.expressionLivePreview.style.color = 'var(--color-error)';
      }
      if (dom.expressionErrorMsg) {
        dom.expressionErrorMsg.textContent = `⚠️ ${evalResult.error.message}`;
        dom.expressionErrorMsg.style.display = 'block';
      }

      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'error',
        errorText: `⚠️ ${evalResult.error.message}`
      });
    }
  }

  function addRecentExpression(expr, formatted) {
    if (!state.recentExpressions) state.recentExpressions = [];
    // Prevent duplicate adjacent
    if (state.recentExpressions.length > 0 && state.recentExpressions[0].expr === expr) return;
    state.recentExpressions.unshift({ expr, formatted, time: Date.now() });
    if (state.recentExpressions.length > 10) state.recentExpressions.pop();
    renderRecentExpressions();
  }

  function renderRecentExpressions() {
    if (!dom.expressionRecentList) return;
    if (!state.recentExpressions || state.recentExpressions.length === 0) {
      dom.expressionRecentList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No recent expressions evaluated yet.</span>';
      return;
    }

    dom.expressionRecentList.innerHTML = state.recentExpressions.map(item => `
      <div class="recent-expr-item" data-expr="${escapeHtml(item.expr)}" title="Click to load expression">
        <span class="recent-expr-formula">${escapeHtml(item.expr)}</span>
        <span class="recent-expr-result">= ${escapeHtml(item.formatted)}</span>
      </div>
    `).join('');

    dom.expressionRecentList.querySelectorAll('.recent-expr-item').forEach(el => {
      el.addEventListener('click', () => {
        const expr = el.dataset.expr;
        if (dom.expressionInput) {
          dom.expressionInput.value = expr;
          calculateExpression(true);
          AudioService.playTick();
        }
      });
    });
  }

  return {
    id: 'expression',
    mount() {},
    getController() {
      return { calculateExpression, renderRecentExpressions, addRecentExpression };
    }
  };
}

export function createMultiScaleView(context) {
  const { state, dom, showToast, setUnifiedResultState, copyToClipboard, AudioService, StorageService, views } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function calculateMultiScale(isExplicitRun = false) {
    if (!dom.multiscaleInput) return;

    const rawInput = dom.multiscaleInput.value.trim();
    const defaultUnit = dom.multiscaleDefaultUnit?.value || 'mm';
    const displayUnit = dom.multiscaleDisplayUnit?.value || 'mm';
    const sortOrder = dom.multiscaleSortSelect?.value || 'ratio_asc';
    const paperSize = dom.multiscalePaperSelect?.value === 'none' ? null : dom.multiscalePaperSelect?.value;
    const minFit = dom.multiscaleFitMin?.value ? parseFloat(dom.multiscaleFitMin.value) : null;
    const maxFit = dom.multiscaleFitMax?.value ? parseFloat(dom.multiscaleFitMax.value) : null;

    // Determine scale ratios to compare
    let baseRatios = [];
    if (state.multiscaleGroup === 'favorites') {
      baseRatios = state.multiscaleFavorites && state.multiscaleFavorites.length > 0
        ? [...state.multiscaleFavorites]
        : [20, 50, 100];
    } else if (SCALE_PRESET_GROUPS[state.multiscaleGroup]) {
      baseRatios = [...SCALE_PRESET_GROUPS[state.multiscaleGroup]];
    } else {
      baseRatios = getDefaultComparisonScales();
    }

    // Merge custom scale ratios
    if (Array.isArray(state.multiscaleCustomScales)) {
      for (const cr of state.multiscaleCustomScales) {
        if (!baseRatios.includes(cr)) baseRatios.push(cr);
      }
    }

    // Empty input check
    if (rawInput === '') {
      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = 'Live: Ready';
        dom.multiscaleLivePreview.style.color = 'var(--text-muted)';
      }
      if (dom.multiscaleErrorMsg) dom.multiscaleErrorMsg.style.display = 'none';
      if (dom.multiscaleRealVal) dom.multiscaleRealVal.textContent = `0 ${displayUnit}`;
      if (dom.multiscaleCountBadge) dom.multiscaleCountBadge.textContent = '0 SCALES';
      if (dom.multiscaleTableBody) dom.multiscaleTableBody.innerHTML = '';
      if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'block';
      if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'none';
      setUnifiedResultState({ toolPrefix: 'multiscale', status: 'ready' });
      return;
    }

    const comparison = compareAcrossScales(rawInput, baseRatios, {
      defaultUnit,
      displayUnit,
      currentScaleRatio: state.scaleRatio || 50,
      sortOrder,
      paperSize,
      targetFitMinMm: minFit,
      targetFitMaxMm: maxFit,
      favoriteRatios: state.multiscaleFavorites,
      precision: state.precision
    });

    if (comparison.isValid) {
      state.lastValidMultiScale = comparison;

      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = `Live: = ${comparison.input.formattedReal}`;
        dom.multiscaleLivePreview.style.color = 'var(--text-accent)';
      }
      if (dom.multiscaleErrorMsg) dom.multiscaleErrorMsg.style.display = 'none';
      if (dom.multiscaleRealVal) dom.multiscaleRealVal.textContent = comparison.input.formattedReal;
      if (dom.multiscaleRealLabel) {
        dom.multiscaleRealLabel.textContent = comparison.input.isExpression
          ? `Evaluated: ${comparison.input.raw}`
          : `Real Dimension (${comparison.input.displayUnit})`;
      }
      if (dom.multiscaleCountBadge) {
        dom.multiscaleCountBadge.textContent = `${comparison.count} SCALES`;
      }

      renderMultiScaleTable(comparison);
      setUnifiedResultState({ toolPrefix: 'multiscale', status: 'success' });

      if (isExplicitRun) {
        AudioService.playTick();
      }
    } else {
      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = 'Live: Incomplete';
        dom.multiscaleLivePreview.style.color = 'var(--color-error)';
      }
      if (dom.multiscaleErrorMsg) {
        dom.multiscaleErrorMsg.textContent = `⚠️ ${comparison.errorMessage}`;
        dom.multiscaleErrorMsg.style.display = 'block';
      }
      setUnifiedResultState({
        toolPrefix: 'multiscale',
        status: 'error',
        errorText: `⚠️ ${comparison.errorMessage}`
      });
    }
  }

  function renderMultiScaleTable(comparison) {
    if (!dom.multiscaleTableBody) return;

    if (!comparison || !comparison.isValid || comparison.scales.length === 0) {
      if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'block';
      if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'none';
      dom.multiscaleTableBody.innerHTML = '';
      return;
    }

    if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'none';
    if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'block';

    dom.multiscaleTableBody.innerHTML = comparison.scales.map(s => {
      const isFav = state.multiscaleFavorites && state.multiscaleFavorites.includes(s.ratio);
      let statusHtml = '';
      if (s.isCurrent) {
        statusHtml += `<span class="badge-current-scale">★ CURRENT</span> `;
      }
      if (s.fitStatus === 'suggested') {
        statusHtml += `<span class="badge-suggested-fit">✓ FIT</span> `;
      }
      if (s.fitsPaper === false) {
        statusHtml += `<span class="badge-sheet-exceed" title="Exceeds sheet width">⚠️ EXCEEDS</span> `;
      }

      return `
        <tr class="multiscale-row ${s.isCurrent ? 'is-current' : ''}">
          <td style="text-align: center;">
            <button type="button" class="scale-fav-btn ${isFav ? 'is-fav' : ''}" data-ratio="${s.ratio}" title="${isFav ? 'Remove from favorites' : 'Mark as favorite'}">
              ${isFav ? '★' : '☆'}
            </button>
          </td>
          <td>
            <strong style="font-family: var(--font-family-mono); color: var(--text-primary);">${escapeHtml(s.label)}</strong>
          </td>
          <td>
            <span style="font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-primary);">${escapeHtml(s.formatted)}</span>
          </td>
          <td class="multiscale-bar-cell">
            <div class="multiscale-bar-track" title="Drawing length at ${s.label}: ${s.formatted} (${s.barPercent}% of max)">
              <div class="multiscale-bar-fill" style="width: ${s.barPercent}%;"></div>
            </div>
          </td>
          <td>
            ${statusHtml || '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
          </td>
          <td style="text-align: right;">
            <button type="button" class="multiscale-row-action-btn ms-add-ws-btn" data-ratio="${s.ratio}" data-formatted="${escapeHtml(s.formatted)}" data-label="${escapeHtml(s.label)}" title="Add ${s.formatted} to Dimension Workspace">
              + WS
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row favorite toggles
    dom.multiscaleTableBody.querySelectorAll('.scale-fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        toggleScaleFavorite(ratio);
      });
    });

    // Attach row add-to-workspace buttons
    dom.multiscaleTableBody.querySelectorAll('.ms-add-ws-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        const formatted = btn.dataset.formatted;
        const label = btn.dataset.label;
        const rawDim = comparison.input.formattedReal;

        const entry = createDimensionEntry({
          name: `Scale ${label} (${rawDim})`,
          rawInput: formatted,
          dimensionType: 'reference',
          defaultUnit: comparison.input.displayUnit,
          notes: `Source: Multi-Scale Comparison (${label})`
        }, comparison.input.displayUnit);

        state.workspace.entries.push(entry);
        views.callController('workspace', 'saveWorkspace');
        views.callController('workspace', 'renderWorkspace');
        AudioService.playTick();
        showToast(`Added [REF] "Scale ${label}" (${formatted}) to Workspace`);
      });
    });
  }

  function toggleScaleFavorite(ratio) {
    if (!Array.isArray(state.multiscaleFavorites)) state.multiscaleFavorites = [];
    const idx = state.multiscaleFavorites.indexOf(ratio);
    if (idx >= 0) {
      state.multiscaleFavorites.splice(idx, 1);
      showToast(`Removed 1:${ratio} from favorites`);
    } else {
      state.multiscaleFavorites.push(ratio);
      showToast(`Saved 1:${ratio} to favorites`);
    }
    StorageService.setItem('archiscale_multiscale_favs', JSON.stringify(state.multiscaleFavorites));
    calculateMultiScale(false);
  }

  function addCustomScale(ratio) {
    if (isNaN(ratio) || ratio <= 0 || !isFinite(ratio)) {
      showToast('Enter a valid positive scale ratio (e.g. 33 for 1:33)', 'warning');
      return;
    }
    if (!Array.isArray(state.multiscaleCustomScales)) state.multiscaleCustomScales = [];
    if (!state.multiscaleCustomScales.includes(ratio)) {
      state.multiscaleCustomScales.push(ratio);
      showToast(`Added custom scale 1:${ratio}`);
      calculateMultiScale(true);
    } else {
      showToast(`Custom scale 1:${ratio} is already present`);
    }
  }

  return {
    id: 'multiscale',
    mount() {},
    getController() {
      return { calculateMultiScale, toggleScaleFavorite, addCustomScale };
    }
  };
}
