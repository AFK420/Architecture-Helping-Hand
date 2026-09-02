/**
 * Architecture Helping Hand - Area & Volume Scaler View (Mode 4)
 * Extracted from ui/app.js during Stabilization 1. Owns Mode 4's S²/S³
 * scaling controller including unit-select syncing for area vs volume.
 */

import { AREA_UNITS, VOLUME_UNITS } from '../../core/units.js';
import { parseInput } from '../../core/parser.js';
import { scaleArea, scaleVolume } from '../../core/calculator.js';
import { formatNumber } from '../../core/formatter.js';

export function createAreaVolumeView(context) {
  const { state, dom, setUnifiedResultState } = context;

  function updateAreaVolumeUnitSelects() {
    if (!dom.areavolInputUnit || !dom.areavolOutputUnit) return;
    if (state.calcType === 'area') {
      const opts = Object.entries(AREA_UNITS).map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
      dom.areavolInputUnit.innerHTML = opts;
      dom.areavolOutputUnit.innerHTML = opts;
      dom.areavolInputUnit.value = 'cm2';
      dom.areavolOutputUnit.value = 'm2';
    } else {
      const opts = Object.entries(VOLUME_UNITS).map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
      dom.areavolInputUnit.innerHTML = opts;
      dom.areavolOutputUnit.innerHTML = opts;
      dom.areavolInputUnit.value = 'cm3';
      dom.areavolOutputUnit.value = 'm3';
    }
  }

  function calculateAreaVolume() {
    const rawRatio = parseFloat(dom.areavolRatioInput?.value);
    if (isNaN(rawRatio) || rawRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: '⚠️ Scale Ratio: Enter a scale denominator ratio greater than 0 (e.g. 100 for 1:100).',
        btn: dom.btnRunAreavol
      });
      return;
    }

    state.areavolRatio = rawRatio;
    state.areavolInputUnit = dom.areavolInputUnit?.value || (state.calcType === 'area' ? 'cm2' : 'cm3');
    state.areavolOutputUnit = dom.areavolOutputUnit?.value || (state.calcType === 'area' ? 'm2' : 'm3');

    const rawVal = dom.areavolInputVal?.value || '';
    if (!rawVal || rawVal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: '⚠️ Measurement Input: Enter a positive area or volume dimension (e.g. 4 m² or 25 sq ft).',
        btn: dom.btnRunAreavol
      });
      if (dom.areavolInputVal) dom.areavolInputVal.classList.add('input-error');
      if (state.lastValidAreavol) {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = state.lastValidAreavol.val;
        if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.lastValidAreavol.unit;
      }
      return;
    }

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid || parsed.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: `⚠️ Measurement Input: Enter a positive value greater than zero (${parsed.error || 'e.g. 4 m²'}).`,
        btn: dom.btnRunAreavol
      });
      if (dom.areavolInputVal) dom.areavolInputVal.classList.add('input-error');

      // Preserve previous valid result
      if (state.lastValidAreavol) {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = state.lastValidAreavol.val;
        if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.lastValidAreavol.unit;
      } else {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = '---';
      }
      return;
    }

    if (dom.areavolInputVal) dom.areavolInputVal.classList.remove('input-error');

    try {
      const isDrawingToReal = state.calcDirection === 'drawing_to_real';
      let res;

      if (state.calcType === 'area') {
        res = scaleArea({
          areaVal: parsed.value,
          inputUnitKey: state.areavolInputUnit,
          scaleRatio: state.areavolRatio,
          outputUnitKey: state.areavolOutputUnit,
          isDrawingToReal: isDrawingToReal
        });
        if (dom.areavolFactorBadge) {
          dom.areavolFactorBadge.textContent = `× ${formatNumber(res.factor, 0)} (${state.areavolRatio}²)`;
        }
      } else {
        res = scaleVolume({
          volumeVal: parsed.value,
          inputUnitKey: state.areavolInputUnit,
          scaleRatio: state.areavolRatio,
          outputUnitKey: state.areavolOutputUnit,
          isDrawingToReal: isDrawingToReal
        });
        if (dom.areavolFactorBadge) {
          dom.areavolFactorBadge.textContent = `× ${formatNumber(res.factor, 0)} (${state.areavolRatio}³)`;
        }
      }

      const formatted = formatNumber(res.resultValue, state.precision);
      state.lastValidAreavol = {
        val: formatted,
        unit: state.areavolOutputUnit
      };

      if (dom.areavolResultVal) dom.areavolResultVal.textContent = formatted;
      if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.areavolOutputUnit;

      // Update Math Formula Microcopy
      if (dom.areavolMathFormula) {
        const powStr = state.calcType === 'area' ? '²' : '³';
        const typeLabel = state.calcType === 'area' ? 'Area' : 'Volume';
        const op = isDrawingToReal ? '×' : '÷';
        const targetTitle = isDrawingToReal ? `Real Site ${typeLabel}` : `Drawing Paper ${typeLabel}`;
        dom.areavolMathFormula.innerHTML = `<strong>Formula:</strong> ${targetTitle} = Input (${formatNumber(parsed.value, 2)} ${state.areavolInputUnit}) ${op} Scale${powStr} (${state.areavolRatio}${powStr} = ${formatNumber(res.factor, 0)}) = <strong>${formatted} ${state.areavolOutputUnit}</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'success',
        context: {
          'Scale Ratio': `1:${state.areavolRatio}`,
          'Source Value': `${formatNumber(parsed.value, 2)} ${state.areavolInputUnit}`,
          'Multiplier': `× ${formatNumber(res.factor, 0)}`
        },
        btn: dom.btnRunAreavol
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: `⚠️ Scaling error: ${err.message}`,
        btn: dom.btnRunAreavol
      });
    }
  }

  return {
    id: 'area_volume',
    mount() {},
    getController() {
      return { calculateAreaVolume, updateAreaVolumeUnitSelects };
    }
  };
}
