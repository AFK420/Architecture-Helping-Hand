/**
 * Architecture Helping Hand - Rescaler View (Mode 2)
 * Extracted from ui/app.js during Stabilization 1. Owns Mode 2's
 * calculation controller for Sheet Scale A -> Scale B conversion.
 */

import { parseInput } from '../../core/parser.js';
import { rescaleDrawing } from '../../core/calculator.js';
import { formatNumber } from '../../core/formatter.js';

export function createRescalerView(context) {
  const { state, dom, setUnifiedResultState } = context;

  function calculateRescaler() {
    const origRatio = parseFloat(dom.rescaleOrigRatio?.value);
    const targetRatio = parseFloat(dom.rescaleTargetRatio?.value);
    const rawVal = dom.rescaleOrigVal?.value || '';

    // Actionable Scale Validation
    if (isNaN(origRatio) || origRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Original Scale (Scale A): Enter a scale denominator greater than 0 (e.g. 50 for 1:50).',
        btn: dom.btnRunRescale
      });
      return;
    }

    if (isNaN(targetRatio) || targetRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Target Scale (Scale B): Enter a scale denominator greater than 0 (e.g. 200 for 1:200).',
        btn: dom.btnRunRescale
      });
      return;
    }

    state.rescaleOrigRatio = origRatio;
    state.rescaleTargetRatio = targetRatio;
    state.rescaleOrigUnit = dom.rescaleOrigUnit?.value || 'cm';
    state.rescaleTargetUnit = dom.rescaleTargetUnit?.value || 'cm';

    // Actionable Dimension Empty Check
    if (!rawVal || rawVal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Measured Length: Enter a positive drawing length measured on Sheet A (e.g. 12, 15.5, 3 1/2).',
        btn: dom.btnRunRescale
      });
      if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.add('input-error');
      if (state.lastValidRescale) {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = state.lastValidRescale.val;
        if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.lastValidRescale.unit;
      }
      return;
    }

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid || parsed.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: `⚠️ Measured Length: Enter a positive drawing measurement greater than zero (${parsed.error || 'e.g. 12, 15.5'}).`,
        btn: dom.btnRunRescale
      });
      if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.add('input-error');

      // Preserve previous valid result
      if (state.lastValidRescale) {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = state.lastValidRescale.val;
        if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.lastValidRescale.unit;
      } else {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = '---';
      }
      return;
    }

    if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.remove('input-error');

    try {
      const res = rescaleDrawing({
        originalVal: parsed.value,
        originalUnitKey: state.rescaleOrigUnit,
        originalRatio: state.rescaleOrigRatio,
        targetRatio: state.rescaleTargetRatio,
        targetUnitKey: state.rescaleTargetUnit
      });

      const formatted = formatNumber(res.targetValue, state.precision);
      state.lastValidRescale = {
        val: formatted,
        unit: state.rescaleTargetUnit
      };

      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = formatted;
      if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.rescaleTargetUnit;
      if (dom.rescaleFactorBadge) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleFactorBadge.textContent = `${pct}% (${tag})`;
      }
      if (dom.rescaleRealSpan) {
        dom.rescaleRealSpan.textContent = `${formatNumber(res.realMeters, 3)} m`;
      }

      // Update Math Formula Microcopy
      if (dom.rescaleMathFormula) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleMathFormula.innerHTML = `<strong>Formula:</strong> New Length = Original (${formatNumber(parsed.value, 2)} ${state.rescaleOrigUnit} @ 1:${state.rescaleOrigRatio}) × (${state.rescaleOrigRatio} ÷ ${state.rescaleTargetRatio}) = <strong>${formatted} ${state.rescaleTargetUnit} (${pct}% ${tag})</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'success',
        context: {
          'Rescale': `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
          'Source Sheet A': `${formatNumber(parsed.value, 2)} ${state.rescaleOrigUnit}`,
          'Real Physical Distance': `${formatNumber(res.realMeters, 3)} m`
        },
        btn: dom.btnRunRescale
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: `⚠️ Rescale error: ${err.message}`,
        btn: dom.btnRunRescale
      });
    }
  }

  return {
    id: 'rescale',
    mount() {},
    getController() {
      return { calculateRescaler };
    }
  };
}
