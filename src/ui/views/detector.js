/**
 * Architecture Helping Hand - Detector View (Mode 3)
 * Extracted from ui/app.js during Stabilization 1. Owns Mode 3's
 * unknown-scale detection controller.
 */

import { parseInput } from '../../core/parser.js';
import { detectScale } from '../../core/calculator.js';
import { formatNumber } from '../../core/formatter.js';

export function createDetectorView(context) {
  const { state, dom, setUnifiedResultState } = context;

  function calculateDetector() {
    const rawPaper = dom.detectorPaperVal?.value || '';
    const rawReal = dom.detectorRealVal?.value || '';

    state.detectPaperUnit = dom.detectorPaperUnit?.value || 'cm';
    state.detectRealUnit = dom.detectorRealUnit?.value || 'm';

    // Actionable Empty Checks
    if (!rawPaper || rawPaper.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: '⚠️ Paper Dimension: Enter a measured drawing length (e.g. 4.5, 10, 2 1/4).',
        btn: dom.btnRunDetector
      });
      if (dom.detectorPaperVal) dom.detectorPaperVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    const paperP = parseInput(rawPaper, { allowNegative: false });
    if (!paperP.isValid || paperP.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Paper Dimension: Enter a positive drawing length greater than zero (${paperP.error || 'e.g. 4.5 cm'}).`,
        btn: dom.btnRunDetector
      });
      if (dom.detectorPaperVal) dom.detectorPaperVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    if (dom.detectorPaperVal) dom.detectorPaperVal.classList.remove('input-error');

    if (!rawReal || rawReal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: '⚠️ Real-World Dimension: Enter the known physical site distance (e.g. 9, 15, 30).',
        btn: dom.btnRunDetector
      });
      if (dom.detectorRealVal) dom.detectorRealVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    const realP = parseInput(rawReal, { allowNegative: false });
    if (!realP.isValid || realP.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Real-World Dimension: Enter a positive site dimension greater than zero (${realP.error || 'e.g. 9 m'}).`,
        btn: dom.btnRunDetector
      });
      if (dom.detectorRealVal) dom.detectorRealVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    if (dom.detectorRealVal) dom.detectorRealVal.classList.remove('input-error');

    try {
      const res = detectScale({
        paperVal: paperP.value,
        paperUnitKey: state.detectPaperUnit,
        realVal: realP.value,
        realUnitKey: state.detectRealUnit
      });

      if (res.ratio === null || res.ratio <= 0) {
        setUnifiedResultState({
          toolPrefix: 'detector',
          status: 'error',
          errorText: '⚠️ Scale Detection: Dimensions must be greater than zero to determine scale.',
          btn: dom.btnRunDetector
        });
        return;
      }

      state.lastDetectedRatio = res.ratio;
      state.lastValidDetector = {
        ratioString: res.ratioString,
        ratio: res.ratio
      };

      if (dom.detectorRatioVal) dom.detectorRatioVal.textContent = res.ratioString;
      if (dom.detectorPresetBadge) {
        if (res.closestPreset) {
          const matchLabel = res.isExactMatch ? 'Exact Match' : `Closest: Δ ${res.closestPreset.percentDiff}%`;
          dom.detectorPresetBadge.innerHTML = `${matchLabel}: <strong>${res.closestPreset.name} (${res.closestPreset.desc})</strong>`;
        } else {
          dom.detectorPresetBadge.textContent = 'Custom Ratio (No standard preset match)';
        }
      }

      // Update Math Formula Microcopy
      if (dom.detectorMathFormula) {
        dom.detectorMathFormula.innerHTML = `<strong>Formula:</strong> Scale 1:X = Real (${formatNumber(realP.value, 2)} ${state.detectRealUnit}) ÷ Paper (${formatNumber(paperP.value, 2)} ${state.detectPaperUnit}) = <strong>${res.ratioString}</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'success',
        context: {
          'Drawing Line': `${formatNumber(paperP.value, 2)} ${state.detectPaperUnit}`,
          'Physical Site': `${formatNumber(realP.value, 2)} ${state.detectRealUnit}`,
          'Detected Ratio': res.ratioString
        },
        btn: dom.btnRunDetector
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Detection error: ${err.message}`,
        btn: dom.btnRunDetector
      });
    }
  }

  return {
    id: 'detector',
    mount() {},
    getController() {
      return { calculateDetector };
    }
  };
}
