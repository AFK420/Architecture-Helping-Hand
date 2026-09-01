/**
 * Architecture Helping Hand - Multi-Scale Comparison Engine
 * Phase 2.5: Daily Architect Toolkit — Part 4: Multi-Scale Comparison
 *
 * Deterministic multi-scale comparison module. Evaluates a single real-world
 * dimension or mathematical expression across multiple architectural scales simultaneously.
 * Zero DOM access, pure mathematical functions, reusable across CLI, tests, and UI.
 */

import { UNITS, requireUnit } from './units.js';
import { SCALE_PRESETS } from './presets.js';
import { parseInput } from './parser.js';
import { evaluateExpressionSafe, isExpressionLike } from './dimension-expression.js';
import { formatNumber, formatFeetInches } from './formatter.js';
import { formatMeasurementValue } from './dimension-workspace.js';

export const DEFAULT_COMPARISON_SCALES = Object.freeze([
  10, 20, 25, 50, 75, 100, 150, 200, 250, 500
]);

export const STANDARD_PAPER_SIZES = Object.freeze({
  A4: { key: 'A4', name: 'A4 Sheet (297 × 210 mm)', widthMm: 297, heightMm: 210, usableWidthMm: 277, usableHeightMm: 190 },
  A3: { key: 'A3', name: 'A3 Sheet (420 × 297 mm)', widthMm: 420, heightMm: 297, usableWidthMm: 387, usableHeightMm: 267 },
  A2: { key: 'A2', name: 'A2 Sheet (594 × 420 mm)', widthMm: 594, heightMm: 420, usableWidthMm: 554, usableHeightMm: 380 },
  A1: { key: 'A1', name: 'A1 Sheet (841 × 594 mm)', widthMm: 841, heightMm: 594, usableWidthMm: 801, usableHeightMm: 554 },
  A0: { key: 'A0', name: 'A0 Sheet (1189 × 841 mm)', widthMm: 1189, heightMm: 841, usableWidthMm: 1139, usableHeightMm: 791 }
});

export const SCALE_PRESET_GROUPS = Object.freeze({
  all: Object.freeze([1, 2, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000]),
  architectural: Object.freeze([20, 25, 50, 75, 100, 200]),
  detail: Object.freeze([1, 2, 5, 10, 20]),
  site: Object.freeze([100, 200, 250, 500, 1000, 1250, 2500, 5000]),
  imperial: Object.freeze([4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192])
});

/**
 * Returns the default array of comparison scale ratio denominators
 * @returns {number[]}
 */
export function getDefaultComparisonScales() {
  return [...DEFAULT_COMPARISON_SCALES];
}

/**
 * Returns preset scale groups
 * @returns {Object}
 */
export function getScalePresetGroups() {
  return { ...SCALE_PRESET_GROUPS };
}

/**
 * Parses user input for multi-scale comparison (direct dimension, bare number, or expression)
 * @param {string} inputStr - Input dimension or math expression
 * @param {Object} [options]
 * @param {string} [options.defaultUnit='mm']
 * @param {number} [options.precision=3]
 * @returns {Object} Parsed input result
 */
export function parseMultiScaleInput(inputStr, options = {}) {
  const { defaultUnit = 'mm', precision = 3 } = options;

  if (inputStr === undefined || inputStr === null || String(inputStr).trim() === '') {
    return {
      isValid: false,
      canonicalMeters: 0,
      displayUnit: defaultUnit,
      rawInput: '',
      isExpression: false,
      errorMessage: 'Enter a dimension or expression'
    };
  }

  const trimmed = String(inputStr).trim();

  // 1. Check if input is a mathematical expression (e.g. 2400 + 900 or 5.4m - 1200mm)
  if (isExpressionLike(trimmed)) {
    const exprEval = evaluateExpressionSafe(trimmed, { defaultUnit, precision });
    if (exprEval.isValid) {
      if (exprEval.dimension === 'scalar') {
        // Scalar count: convert to defaultUnit
        const unitDef = requireUnit(defaultUnit, 'length');
        const meters = exprEval.value * unitDef.toMeters;
        return {
          isValid: true,
          canonicalMeters: meters,
          displayUnit: defaultUnit,
          rawInput: trimmed,
          isExpression: true,
          expressionResult: exprEval,
          errorMessage: null
        };
      }
      return {
        isValid: true,
        canonicalMeters: exprEval.canonicalMeters,
        displayUnit: exprEval.displayUnit || defaultUnit,
        rawInput: trimmed,
        isExpression: true,
        expressionResult: exprEval,
        errorMessage: null
      };
    } else {
      return {
        isValid: false,
        canonicalMeters: 0,
        displayUnit: defaultUnit,
        rawInput: trimmed,
        isExpression: true,
        expressionResult: null,
        errorMessage: exprEval.error?.message || 'Invalid mathematical expression'
      };
    }
  }

  // 2. Direct Dimension or Bare Number
  const parsed = parseInput(trimmed, { allowNegative: true });
  if (parsed.isValid) {
    let meters = 0;
    let detectedUnit = parsed.detectedUnit;

    if (detectedUnit) {
      const unitDef = requireUnit(detectedUnit, 'length');
      meters = parsed.value * unitDef.toMeters;
    } else {
      // Bare number: assume defaultUnit
      detectedUnit = defaultUnit;
      const unitDef = requireUnit(defaultUnit, 'length');
      meters = parsed.value * unitDef.toMeters;
    }

    return {
      isValid: true,
      canonicalMeters: meters,
      displayUnit: detectedUnit,
      rawInput: trimmed,
      isExpression: false,
      expressionResult: null,
      errorMessage: null
    };
  }

  return {
    isValid: false,
    canonicalMeters: 0,
    displayUnit: defaultUnit,
    rawInput: trimmed,
    isExpression: false,
    errorMessage: parsed.errorMessage || 'Invalid measurement input'
  };
}

/**
 * Pure calculation of a canonical dimension at a specific scale ratio
 * @param {number} canonicalMeters - Real-world measurement in canonical meters
 * @param {number} scaleRatio - Scale ratio denominator (e.g. 50 for 1:50)
 * @param {Object} [options]
 * @param {string} [options.displayUnit='mm'] - Preferred unit for real world
 * @param {string} [options.drawingUnit=null] - Preferred drawing unit ('mm' or 'in')
 * @param {number} [options.precision=3]
 * @returns {Object} Single scale result
 */
export function calculateAtScale(canonicalMeters, scaleRatio, options = {}) {
  if (typeof scaleRatio !== 'number' || isNaN(scaleRatio) || !isFinite(scaleRatio) || scaleRatio <= 0) {
    throw new Error(`Scale ratio must be a positive finite number greater than 0 (received: ${scaleRatio})`);
  }

  if (typeof canonicalMeters !== 'number' || isNaN(canonicalMeters) || !isFinite(canonicalMeters)) {
    throw new Error(`canonicalMeters must be a valid finite number (received: ${canonicalMeters})`);
  }

  const {
    displayUnit = 'mm',
    drawingUnit = null,
    precision = 3
  } = options;

  const drawingMeters = canonicalMeters / scaleRatio;

  // Determine drawing unit: if imperial real unit, default drawing unit is inches ('in'), otherwise millimeters ('mm')
  const isImperial = (displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'ft_in' || displayUnit === 'yd');
  const targetDrawingUnit = drawingUnit || (isImperial ? 'in' : 'mm');
  const drawUnitDef = UNITS[targetDrawingUnit] || UNITS.mm;

  const drawingValue = drawingMeters / drawUnitDef.toMeters;
  const isNegative = canonicalMeters < 0;
  const absDrawingMeters = Math.abs(drawingMeters);

  let formatted = '';
  if (targetDrawingUnit === 'ft_in') {
    const totalInches = absDrawingMeters / UNITS.in.toMeters;
    formatted = `${isNegative ? '-' : ''}${formatFeetInches(totalInches)}`;
  } else {
    formatted = `${isNegative ? '-' : ''}${formatNumber(Math.abs(drawingValue), precision)} ${drawUnitDef.symbol}`;
  }

  // Find standard preset label if available
  const preset = SCALE_PRESETS.find(p => Math.abs(p.ratio - scaleRatio) < 1e-6);
  const label = preset ? preset.id : `1:${formatNumber(scaleRatio, precision > 2 ? precision : 2)}`;
  const description = preset ? preset.description : `Custom scale 1:${scaleRatio}`;
  const category = preset ? preset.category : 'custom';

  return {
    ratio: scaleRatio,
    label: label,
    description: description,
    category: category,
    canonicalMeters: canonicalMeters,
    drawingMeters: drawingMeters,
    drawingValue: drawingValue,
    drawingUnit: targetDrawingUnit,
    formatted: formatted,
    isNegative: isNegative
  };
}

/**
 * Compare a dimension or expression across multiple architectural scale ratios
 * @param {string|number|Object} input - Raw string, canonical meter number, or parsed input object
 * @param {number[]} scaleRatios - Array of scale ratio denominators
 * @param {Object} [options]
 * @param {string} [options.defaultUnit='mm']
 * @param {string} [options.displayUnit=null]
 * @param {number} [options.currentScaleRatio=50]
 * @param {string} [options.sortOrder='ratio_asc'] - 'ratio_asc' | 'ratio_desc' | 'drawing_desc' | 'drawing_asc'
 * @param {string} [options.paperSize=null] - 'A4' | 'A3' | 'A2' | 'A1' | 'A0'
 * @param {number} [options.customPaperWidthMm=null]
 * @param {number} [options.targetFitMinMm=null]
 * @param {number} [options.targetFitMaxMm=null]
 * @param {number[]} [options.favoriteRatios=[]]
 * @param {number} [options.precision=3]
 * @returns {Object} Structured comparison result
 */
export function compareAcrossScales(input, scaleRatios = DEFAULT_COMPARISON_SCALES, options = {}) {
  const {
    defaultUnit = 'mm',
    displayUnit = null,
    currentScaleRatio = 50,
    sortOrder = 'ratio_asc',
    paperSize = null,
    customPaperWidthMm = null,
    targetFitMinMm = null,
    targetFitMaxMm = null,
    favoriteRatios = [],
    precision = 3
  } = options;

  let parsed = null;
  if (typeof input === 'object' && input !== null && input.isValid !== undefined) {
    parsed = input;
  } else if (typeof input === 'number') {
    parsed = {
      isValid: Number.isFinite(input),
      canonicalMeters: input,
      displayUnit: displayUnit || defaultUnit,
      rawInput: String(input),
      isExpression: false,
      errorMessage: Number.isFinite(input) ? null : 'Invalid number'
    };
  } else {
    parsed = parseMultiScaleInput(String(input || ''), { defaultUnit, precision });
  }

  const activeDisplayUnit = displayUnit || parsed.displayUnit || defaultUnit;

  if (!parsed.isValid) {
    return {
      isValid: false,
      errorMessage: parsed.errorMessage || 'Invalid dimension input',
      input: {
        raw: parsed.rawInput || '',
        canonicalMeters: 0,
        formattedReal: '---',
        displayUnit: activeDisplayUnit,
        isExpression: parsed.isExpression || false
      },
      scales: [],
      currentScaleRatio: currentScaleRatio,
      maxDrawingMeters: 0,
      paperContext: null,
      targetFitRange: null,
      count: 0
    };
  }

  const canonicalMeters = parsed.canonicalMeters;
  const formattedReal = formatMeasurementValue(canonicalMeters, activeDisplayUnit, precision);

  // Validate and sanitize unique scale ratios
  const validRatios = [];
  const seenRatios = new Set();

  for (const r of (Array.isArray(scaleRatios) ? scaleRatios : DEFAULT_COMPARISON_SCALES)) {
    const num = Number(r);
    if (Number.isFinite(num) && num > 0 && !seenRatios.has(num)) {
      seenRatios.add(num);
      validRatios.push(num);
    }
  }

  if (validRatios.length === 0) {
    validRatios.push(50);
  }

  // Calculate drawing sizes at each scale
  const calculatedScales = validRatios.map(ratio => {
    return calculateAtScale(canonicalMeters, ratio, {
      displayUnit: activeDisplayUnit,
      precision
    });
  });

  // Calculate maximum drawing meters in the set for true physical proportional bars
  const maxDrawingMeters = calculatedScales.reduce((max, s) => Math.max(max, Math.abs(s.drawingMeters)), 0);

  // Paper Context Helper
  let paperContext = null;
  if (paperSize && (STANDARD_PAPER_SIZES[paperSize] || paperSize === 'custom')) {
    const paperDef = STANDARD_PAPER_SIZES[paperSize] || {
      key: 'custom',
      name: `Custom Sheet (${customPaperWidthMm || 300} mm)`,
      usableWidthMm: customPaperWidthMm || 300
    };
    paperContext = {
      key: paperDef.key,
      name: paperDef.name,
      usableWidthMm: paperDef.usableWidthMm
    };
  }

  // Target Fit Heuristic
  let targetFitRange = null;
  if (targetFitMinMm !== null && targetFitMaxMm !== null && targetFitMinMm >= 0 && targetFitMaxMm >= targetFitMinMm) {
    targetFitRange = {
      minMm: targetFitMinMm,
      maxMm: targetFitMaxMm
    };
  }

  // Enrich each scale row with proportional bar, current scale status, favorites, and heuristics
  const favSet = new Set(Array.isArray(favoriteRatios) ? favoriteRatios.map(Number) : []);

  const enrichedScales = calculatedScales.map(item => {
    const absDrawingMeters = Math.abs(item.drawingMeters);
    const drawingMm = absDrawingMeters * 1000;
    const barPercent = maxDrawingMeters > 0 ? Math.round((absDrawingMeters / maxDrawingMeters) * 100) : 0;
    const isCurrent = Math.abs(item.ratio - currentScaleRatio) < 1e-6;
    const isFavorite = favSet.has(item.ratio);

    let fitsPaper = null;
    if (paperContext) {
      fitsPaper = drawingMm <= paperContext.usableWidthMm;
    }

    let fitStatus = null; // 'suggested' | 'too_small' | 'too_large' | null
    if (targetFitRange) {
      if (drawingMm >= targetFitRange.minMm && drawingMm <= targetFitRange.maxMm) {
        fitStatus = 'suggested';
      } else if (drawingMm < targetFitRange.minMm) {
        fitStatus = 'too_small';
      } else {
        fitStatus = 'too_large';
      }
    }

    return {
      ...item,
      barPercent,
      isCurrent,
      isFavorite,
      fitsPaper,
      fitStatus
    };
  });

  // Apply Sorting
  enrichedScales.sort((a, b) => {
    if (sortOrder === 'ratio_desc') return b.ratio - a.ratio;
    if (sortOrder === 'drawing_desc') return b.drawingMeters - a.drawingMeters;
    if (sortOrder === 'drawing_asc') return a.drawingMeters - b.drawingMeters;
    return a.ratio - b.ratio; // default: ratio_asc
  });

  return {
    isValid: true,
    errorMessage: null,
    input: {
      raw: parsed.rawInput || '',
      canonicalMeters: canonicalMeters,
      formattedReal: formattedReal,
      displayUnit: activeDisplayUnit,
      isExpression: parsed.isExpression || false
    },
    scales: enrichedScales,
    currentScaleRatio: currentScaleRatio,
    maxDrawingMeters: maxDrawingMeters,
    paperContext: paperContext,
    targetFitRange: targetFitRange,
    count: enrichedScales.length
  };
}

/**
 * Formats multi-scale comparison results for clipboard, table, or CAD preparation
 * @param {Object} comparisonResult - Result from compareAcrossScales
 * @param {'table'|'all'|'current'|'raw'} [formatType='table']
 * @returns {string} Formatted text
 */
export function formatScaleComparison(comparisonResult, formatType = 'table') {
  if (!comparisonResult || !comparisonResult.isValid || !Array.isArray(comparisonResult.scales) || comparisonResult.scales.length === 0) {
    return 'No valid scale comparison data.';
  }

  const { input, scales, currentScaleRatio } = comparisonResult;

  if (formatType === 'raw') {
    // Space-delimited raw drawing numbers (e.g. "120 96 48 32 24 12")
    return scales.map(s => formatNumber(s.drawingValue, 2)).join(' ');
  }

  if (formatType === 'current') {
    const current = scales.find(s => s.isCurrent) || scales[0];
    return `Scale ${current.label}: Real ${input.formattedReal} ➔ Drawing ${current.formatted}`;
  }

  if (formatType === 'all') {
    return scales.map(s => `${s.label.padEnd(8)} ${s.formatted}`).join('\n');
  }

  // Format 'table' (Markdown Table with headers)
  let out = `### Multi-Scale Comparison: ${input.formattedReal}\n\n`;
  out += `| Scale | Drawing Size | Status |\n`;
  out += `| :--- | :--- | :--- |\n`;

  for (const s of scales) {
    let status = '';
    if (s.isCurrent) status += '★ Current Scale ';
    if (s.fitStatus === 'suggested') status += '✓ Suggested Fit ';
    if (s.fitsPaper === false) status += '⚠️ Exceeds Sheet ';
    out += `| **${s.label}** | \`${s.formatted}\` | ${status.trim() || '—'} |\n`;
  }

  return out;
}
