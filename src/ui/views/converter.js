/**
 * Architecture Helping Hand - Converter View (Mode 1)
 * Extracted from ui/app.js during Stabilization 1. Owns Mode 1's calculation
 * controller: result rendering, equivalents breakdown, direction swap.
 * Event wiring for this feature remains in app.js's attachEventListeners via
 * the shared context (controller lookups), keeping one wiring surface.
 */

import { UNITS } from '../../core/units.js';
import { parseInput } from '../../core/parser.js';
import { scaleDimension, getAllUnitEquivalents } from '../../core/calculator.js';
import { formatNumber, formatFeetInches } from '../../core/formatter.js';
import { updateVisualization } from '../visualizer.js';

export function createConverterView(context) {
  const { state, dom, setUnifiedResultState, AudioService } = context;

  function calculateConverter() {
    const rawRatio = parseFloat(dom.scaleRatioInput?.value);
    const parsedRatio = isNaN(rawRatio) || rawRatio <= 0 ? 50 : rawRatio;
    state.scaleRatio = parsedRatio;

    const rawInput = dom.converterInputVal?.value || '';
    state.converterInputVal = rawInput;
    state.converterInputUnit = dom.converterInputUnit?.value || 'cm';
    state.converterOutputUnit = dom.converterOutputUnit?.value || 'm';

    // Actionable Empty Check
    if (!rawInput || rawInput.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: '⚠️ Drawing Measurement: Enter a measurement dimension (e.g. 10, 12.5, 3 1/2, or 12\'-6").',
        btn: dom.btnRunConverter
      });
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');
      if (state.lastValidConverter) {
        if (dom.converterResultVal) dom.converterResultVal.textContent = state.lastValidConverter.val;
        if (dom.converterResultUnit) dom.converterResultUnit.textContent = state.lastValidConverter.unit;
      }
      return;
    }

    const parseRes = parseInput(rawInput, { allowNegative: false });

    // Handle Unit Suffix extraction if user typed e.g. "15.5cm"
    if (parseRes.isValid && parseRes.detectedUnit) {
      state.converterInputUnit = parseRes.detectedUnit;
      if (dom.converterInputUnit) dom.converterInputUnit.value = parseRes.detectedUnit;
    }

    if (!parseRes.isValid || parseRes.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: `⚠️ Drawing Measurement: Enter a positive dimension greater than zero (${parseRes.error || 'e.g. 10, 12.5, 3 1/2'}).`,
        btn: dom.btnRunConverter
      });
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');

      // Preserve previous valid result if available
      if (state.lastValidConverter) {
        if (dom.converterResultVal) dom.converterResultVal.textContent = state.lastValidConverter.val;
        if (dom.converterResultUnit) dom.converterResultUnit.textContent = state.lastValidConverter.unit;
      } else {
        if (dom.converterResultVal) dom.converterResultVal.textContent = '---';
      }
      return;
    }

    if (dom.converterInputVal) dom.converterInputVal.classList.remove('input-error');

    try {
      const calcRes = scaleDimension({
        value: parseRes.value,
        unitKey: state.converterInputUnit,
        ratio: state.scaleRatio,
        direction: state.direction,
        targetUnitKey: state.converterOutputUnit
      });

      const formattedVal = formatNumber(calcRes.value, state.precision);

      // Cache valid result
      state.lastValidConverter = {
        val: formattedVal,
        unit: state.converterOutputUnit,
        realMeters: calcRes.realMeters
      };

      // Update Result Display
      if (dom.converterResultVal) {
        dom.converterResultVal.textContent = formattedVal;
      }
      if (dom.converterResultUnit) {
        dom.converterResultUnit.textContent = state.converterOutputUnit;
      }

      // Update Secondary Architectural Readout
      if (dom.converterSecondaryReadout) {
        const isMetric = ['mm', 'cm', 'm', 'km'].includes(state.converterOutputUnit);
        if (isMetric) {
          const inInches = calcRes.realMeters / UNITS.in.toMeters;
          const ftIn = formatFeetInches(inInches);
          const decFt = formatNumber(calcRes.realMeters / UNITS.ft.toMeters, 2);
          dom.converterSecondaryReadout.textContent = `${ftIn} (${decFt} ft)`;
        } else {
          const mVal = formatNumber(calcRes.realMeters, 3);
          const cmVal = formatNumber(calcRes.realMeters * 100, 1);
          dom.converterSecondaryReadout.textContent = `${mVal} m (${cmVal} cm)`;
        }
      }

      // Update Math Transformation Microcopy
      if (dom.converterMathFormula) {
        if (state.direction === 'drawing_to_real') {
          dom.converterMathFormula.innerHTML = `<strong>Formula:</strong> Real Site = Drawing (${formatNumber(parseRes.value, 2)} ${state.converterInputUnit}) × Scale (${state.scaleRatio}) = <strong>${formattedVal} ${state.converterOutputUnit}</strong>`;
        } else {
          dom.converterMathFormula.innerHTML = `<strong>Formula:</strong> Drawing Paper = Real Site (${formatNumber(parseRes.value, 2)} ${state.converterInputUnit}) ÷ Scale (${state.scaleRatio}) = <strong>${formattedVal} ${state.converterOutputUnit}</strong>`;
        }
      }

      // Update Breakdown Equivalents Table
      renderEquivalentsBreakdown(calcRes.realMeters);

      // Update Visual Scale Bar & Silhouette
      updateVisualization({
        realMeters: calcRes.realMeters,
        scaleRatio: state.scaleRatio,
        drawingMeters: calcRes.drawingMeters,
        containerId: 'visualizer-container'
      });

      // Update Unified Result Lifecycle State & Context Strip
      const directionLabel = state.direction === 'drawing_to_real' ? 'Paper Drawing' : 'Real Site';
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'success',
        context: {
          'Scale': `1:${state.scaleRatio}`,
          'Source Input': `${formatNumber(parseRes.value, 2)} ${state.converterInputUnit} (${directionLabel})`
        },
        btn: dom.btnRunConverter
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: `⚠️ Conversion error: ${err.message}`,
        btn: dom.btnRunConverter
      });
    }
  }

  function renderEquivalentsBreakdown(realMeters) {
    if (!dom.metricBreakdownList || !dom.imperialBreakdownList) return;
    try {
      const equivalents = getAllUnitEquivalents(realMeters);

      dom.metricBreakdownList.innerHTML = equivalents.metric.map(item => `
        <div class="equiv-row">
          <span class="equiv-name">${item.label}</span>
          <span class="equiv-val">${formatNumber(item.val, 3)} ${item.symbol}</span>
        </div>
      `).join('');

      dom.imperialBreakdownList.innerHTML = equivalents.imperial.map(item => `
        <div class="equiv-row">
          <span class="equiv-name">${item.label}</span>
          <span class="equiv-val">${item.key === 'ft_in' ? item.val : `${formatNumber(item.val, 3)} ${item.symbol}`}</span>
        </div>
      `).join('');
    } catch (e) {
      // Guard against non-finite breakdown
    }
  }

  function swapDirection() {
    state.direction = state.direction === 'drawing_to_real' ? 'real_to_drawing' : 'drawing_to_real';

    // Swap input/output unit selections
    const prevInUnit = dom.converterInputUnit?.value || 'cm';
    const prevOutUnit = dom.converterOutputUnit?.value || 'm';

    if (dom.converterInputUnit) dom.converterInputUnit.value = prevOutUnit;
    if (dom.converterOutputUnit) dom.converterOutputUnit.value = prevInUnit;

    state.converterInputUnit = prevOutUnit;
    state.converterOutputUnit = prevInUnit;

    if (state.direction === 'drawing_to_real') {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Drawing Measurement (Paper)';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Real-World Dimension';
      if (dom.converterFlowFrom) dom.converterFlowFrom.textContent = '📐 Paper Drawing';
      if (dom.converterFlowTo) dom.converterFlowTo.textContent = '🏛️ Real-World Site';
    } else {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Real-World Dimension';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Drawing Measurement (Paper)';
      if (dom.converterFlowFrom) dom.converterFlowFrom.textContent = '🏛️ Real-World Site';
      if (dom.converterFlowTo) dom.converterFlowTo.textContent = '📐 Paper Drawing';
    }

    AudioService.playSwapSound();
    calculateConverter();
  }

  return {
    id: 'converter',
    mount() {
      // Initial calculation once DOM is available
      calculateConverter();
    },
    getController() {
      return { calculateConverter, swapDirection, renderEquivalentsBreakdown };
    }
  };
}
