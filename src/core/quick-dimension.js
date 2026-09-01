/**
 * Architecture Helping Hand - Quick Dimension Strip Core Model
 * Phase 2.5: Daily Architect Toolkit — Part 8: Quick Dimension Strip
 *
 * Headless, high-precision architectural dimension inspector & micro-tool.
 * Zero-DOM, pure mathematical functions, reusable across CLI, tests, and UI.
 */

import { UNITS, requireUnit } from './units.js';
import { parseInput } from './parser.js';
import { isExpressionLike, evaluateExpressionSafe } from './dimension-expression.js';
import { scaleDimension, requireFiniteNumber } from './calculator.js';
import { formatNumber, formatFeetInches } from './formatter.js';
import { formatCadValue } from './cad-clipboard.js';
import { createDimensionEntry, createGroup } from './dimension-workspace.js';
import { createDimensionChain, createChainSegment } from './dimension-chains.js';

export const QUICK_DIM_STORAGE_KEY = 'archiscale_quick_dimension_prefs';

export const DEFAULT_QUICK_SCALES = Object.freeze([
  10, 20, 25, 50, 75, 100, 125, 200, 250, 500
]);

export const DEFAULT_QUICK_PREFS = Object.freeze({
  defaultScale: 50,
  displayUnit: 'mm',
  drawingUnit: 'mm',
  precision: 2,
  showContext: true,
  mode: 'real_to_drawing',
  pinned: false
});

/**
 * Verified architectural reference heuristics and typical building standard dimension ranges.
 */
const ARCHITECTURAL_HEURISTICS = Object.freeze([
  {
    minM: 0.075,
    maxM: 0.105,
    label: 'Interior Partition Wall',
    detail: 'Standard drywall / metal stud partition thickness (75–100 mm / 3–4 in)'
  },
  {
    minM: 0.145,
    maxM: 0.185,
    label: 'Stair Riser Height',
    detail: 'Standard architectural stair step rise (150–180 mm / 6–7 in)'
  },
  {
    minM: 0.250,
    maxM: 0.310,
    label: 'Stair Tread Run Depth',
    detail: 'Standard stair going / foot tread depth (250–300 mm / 10–12 in)'
  },
  {
    minM: 0.600,
    maxM: 0.650,
    label: 'Countertop & Base Cabinet Depth',
    detail: 'Standard kitchen counter / base unit depth (600 mm / 24 in)'
  },
  {
    minM: 0.700,
    maxM: 0.820,
    label: 'Interior Passage Door / Desk Height',
    detail: 'Standard interior door width (700–800 mm) or standard desk/table work height (720–760 mm)'
  },
  {
    minM: 0.850,
    maxM: 0.950,
    label: 'Entry Door Width / Counter Height',
    detail: 'Standard main entry / ADA accessible doorway width (850–900 mm) or kitchen work counter height (900 mm / 36 in)'
  },
  {
    minM: 1.000,
    maxM: 1.150,
    label: 'Commercial Door / Balustrade Height',
    detail: 'Standard commercial door width (1000 mm) or stair guardrail/balustrade height (1050–1100 mm)'
  },
  {
    minM: 1.200,
    maxM: 1.500,
    label: 'Corridor Width / Double Circulation',
    detail: 'Comfortable residential corridor or 2-person commercial circulation path (1200–1500 mm)'
  },
  {
    minM: 1.500,
    maxM: 1.550,
    label: 'ADA Turning Circle',
    detail: 'Standard wheelchair 360° turning diameter clearance (1500–1524 mm / 60 in)'
  },
  {
    minM: 1.800,
    maxM: 2.050,
    label: 'King Bed Width / Double Door',
    detail: 'King size bed width (1800 mm) or double French door opening (1800–2000 mm)'
  },
  {
    minM: 2.100,
    maxM: 2.150,
    label: 'Standard Door Frame Height',
    detail: 'Standard interior/exterior door rough opening frame height (2100 mm / 7\'-0")'
  },
  {
    minM: 2.400,
    maxM: 2.500,
    label: 'Residential Ceiling Height',
    detail: 'Standard residential finished floor-to-ceiling height (2400 mm / 8\'-0")'
  },
  {
    minM: 2.700,
    maxM: 2.800,
    label: 'High Residential Ceiling',
    detail: 'Generous residential finished ceiling height (2700 mm / 9\'-0")'
  },
  {
    minM: 3.000,
    maxM: 3.200,
    label: 'Commercial Ceiling Height',
    detail: 'Standard commercial office or luxury residential finished ceiling height (3000 mm / 10\'-0")'
  }
]);

/**
 * Returns architectural contextual guidance for a given real-world dimension.
 * Explicitly returns "No stored reference" when no range matches to avoid false claims.
 * @param {number} canonicalMeters - Real-world length in meters
 * @returns {Object} Context result
 */
export function getArchitecturalContext(canonicalMeters) {
  if (typeof canonicalMeters !== 'number' || isNaN(canonicalMeters) || !isFinite(canonicalMeters) || canonicalMeters <= 0) {
    return {
      hasReference: false,
      message: 'No stored reference for this dimension.',
      matches: [],
      disclaimer: null
    };
  }

  const absMeters = Math.abs(canonicalMeters);
  const matched = ARCHITECTURAL_HEURISTICS.filter(h => absMeters >= h.minM && absMeters <= h.maxM);

  if (matched.length === 0) {
    return {
      hasReference: false,
      message: 'No stored reference for this dimension.',
      matches: [],
      disclaimer: null
    };
  }

  return {
    hasReference: true,
    message: `${matched.length} contextual architectural reference${matched.length > 1 ? 's' : ''} found`,
    matches: matched.map(m => ({ label: m.label, detail: m.detail })),
    disclaimer: 'Reference guidance only; verify with local building codes & project specifications.'
  };
}

/**
 * Evaluates a quick dimension string (bare number, attached unit, feet-inches, or math expression).
 * @param {string} rawInput - User input dimension string
 * @param {Object} [options]
 * @param {number} [options.selectedScale=50] - Active scale denominator (e.g. 50 for 1:50)
 * @param {number[]} [options.scales=DEFAULT_QUICK_SCALES] - Array of scale denominators to evaluate
 * @param {string} [options.displayUnit='mm'] - Unit for real dimension display
 * @param {string} [options.drawingUnit='mm'] - Unit for drawing dimension display
 * @param {number} [options.precision=2] - Fractional digits
 * @param {'real_to_drawing'|'drawing_to_real'} [options.mode='real_to_drawing'] - Conversion direction
 * @returns {Object} Structured quick dimension evaluation result
 */
export function evaluateQuickDimension(rawInput, options = {}) {
  const {
    selectedScale = DEFAULT_QUICK_PREFS.defaultScale,
    scales = DEFAULT_QUICK_SCALES,
    displayUnit = DEFAULT_QUICK_PREFS.displayUnit,
    drawingUnit = DEFAULT_QUICK_PREFS.drawingUnit,
    precision = DEFAULT_QUICK_PREFS.precision,
    mode = DEFAULT_QUICK_PREFS.mode
  } = options;

  const raw = typeof rawInput === 'string' ? rawInput.trim() : (rawInput !== undefined && rawInput !== null ? String(rawInput).trim() : '');

  const safeSelectedScale = (typeof selectedScale === 'number' && Number.isFinite(selectedScale) && selectedScale > 0)
    ? selectedScale
    : 50;

  const safeScales = Array.isArray(scales) && scales.length > 0
    ? Array.from(new Set(scales.filter(s => typeof s === 'number' && Number.isFinite(s) && s > 0)))
    : [...DEFAULT_QUICK_SCALES];

  // Include safeSelectedScale if not present in scale list
  if (!safeScales.includes(safeSelectedScale)) {
    safeScales.push(safeSelectedScale);
    safeScales.sort((a, b) => a - b);
  }

  const safeDisplayUnit = UNITS[displayUnit] || displayUnit === 'ft-in' ? displayUnit : 'mm';
  const safeDrawingUnit = UNITS[drawingUnit] || drawingUnit === 'ft-in' ? drawingUnit : 'mm';

  if (!raw) {
    return {
      rawInput: '',
      valid: false,
      isExpression: false,
      mode,
      canonicalMeters: 0,
      realValue: 0,
      realFormatted: '---',
      commonEquivalents: [],
      selectedScale: safeSelectedScale,
      selectedDrawingValue: 0,
      selectedDrawingFormatted: '---',
      scaleMatrix: [],
      context: { hasReference: false, message: 'Enter a dimension to view quick interpretations.', matches: [], disclaimer: null },
      cadNumbers: '',
      status: 'EMPTY',
      error: null
    };
  }

  let canonicalMeters = 0;
  let isExpression = false;
  let isValid = false;
  let errorMsg = null;

  // 1. Evaluate input (Expression vs Direct Parsing)
  if (isExpressionLike(raw)) {
    isExpression = true;
    const exprRes = evaluateExpressionSafe(raw, {
      defaultUnit: safeDisplayUnit === 'ft-in' ? 'ft' : safeDisplayUnit,
      scaleRatio: safeSelectedScale,
      precision
    });

    if (exprRes.isValid) {
      isValid = true;
      canonicalMeters = exprRes.canonicalMeters !== null && exprRes.canonicalMeters !== undefined
        ? exprRes.canonicalMeters
        : (exprRes.value * (UNITS[safeDisplayUnit]?.toMeters || 0.001));
    } else {
      isValid = false;
      errorMsg = exprRes.error?.message || 'Invalid mathematical expression';
    }
  } else {
    // Direct dimension parsing
    const parseRes = parseInput(raw, {
      defaultUnit: safeDisplayUnit === 'ft-in' ? 'ft' : safeDisplayUnit,
      allowNegative: true
    });

    if (parseRes.isValid) {
      isValid = true;
      const detectedUnitKey = parseRes.detectedUnit || (safeDisplayUnit === 'ft-in' ? 'mm' : safeDisplayUnit);
      const unitDef = UNITS[detectedUnitKey] || UNITS.mm;
      canonicalMeters = parseRes.value * unitDef.toMeters;
    } else {
      isValid = false;
      errorMsg = parseRes.error || 'Invalid dimension format';
    }
  }

  if (!isValid) {
    return {
      rawInput: raw,
      valid: false,
      isExpression,
      mode,
      canonicalMeters: 0,
      realValue: 0,
      realFormatted: '---',
      commonEquivalents: [],
      selectedScale: safeSelectedScale,
      selectedDrawingValue: 0,
      selectedDrawingFormatted: '---',
      scaleMatrix: [],
      context: { hasReference: false, message: 'No stored reference for this dimension.', matches: [], disclaimer: null },
      cadNumbers: '',
      status: 'INVALID',
      error: errorMsg
    };
  }

  // 2. Account for Mode (real_to_drawing vs drawing_to_real)
  let realCanonicalMeters = canonicalMeters;
  if (mode === 'drawing_to_real') {
    // Input is paper measurement at selected scale, calculate real-world size
    realCanonicalMeters = canonicalMeters * safeSelectedScale;
  }

  const isNegative = realCanonicalMeters < 0;
  const absMeters = Math.abs(realCanonicalMeters);

  // 3. Format Real-World Output
  let realFormatted = '';
  let realValue = 0;
  if (safeDisplayUnit === 'ft-in') {
    const totalInches = realCanonicalMeters / 0.0254;
    realValue = totalInches;
    realFormatted = formatFeetInches(totalInches);
  } else {
    const unitDef = UNITS[safeDisplayUnit] || UNITS.mm;
    realValue = realCanonicalMeters / unitDef.toMeters;
    realFormatted = formatCadValue(realCanonicalMeters, { unit: safeDisplayUnit, precision, suffix: 'symbol' });
  }

  // 4. Common Unit Equivalents
  const commonEquivalents = [
    {
      unit: 'mm',
      label: 'Millimeters',
      value: realCanonicalMeters / 0.001,
      formatted: formatCadValue(realCanonicalMeters, { unit: 'mm', precision: precision > 0 ? 0 : 0, suffix: 'symbol' })
    },
    {
      unit: 'cm',
      label: 'Centimeters',
      value: realCanonicalMeters / 0.01,
      formatted: formatCadValue(realCanonicalMeters, { unit: 'cm', precision: precision > 1 ? precision - 1 : 1, suffix: 'symbol' })
    },
    {
      unit: 'm',
      label: 'Meters',
      value: realCanonicalMeters,
      formatted: formatCadValue(realCanonicalMeters, { unit: 'm', precision: Math.max(precision, 3), suffix: 'symbol' })
    },
    {
      unit: 'in',
      label: 'Decimal Inches',
      value: realCanonicalMeters / 0.0254,
      formatted: formatCadValue(realCanonicalMeters, { unit: 'in', precision, suffix: 'symbol' })
    },
    {
      unit: 'ft-in',
      label: 'Feet & Inches',
      value: realCanonicalMeters / 0.0254,
      formatted: `${isNegative ? '-' : ''}${formatFeetInches(absMeters / 0.0254)}`
    }
  ];

  // 5. Multi-Scale Drawing Size Matrix
  const scaleMatrix = safeScales.map(sRatio => {
    const drawMeters = realCanonicalMeters / sRatio;
    let drawVal = 0;
    let drawFormatted = '';

    if (safeDrawingUnit === 'ft-in') {
      const drawInches = drawMeters / 0.0254;
      drawVal = drawInches;
      drawFormatted = formatFeetInches(drawInches);
    } else {
      const dUnitDef = UNITS[safeDrawingUnit] || UNITS.mm;
      drawVal = drawMeters / dUnitDef.toMeters;
      drawFormatted = formatCadValue(drawMeters, { unit: safeDrawingUnit, precision, suffix: 'symbol' });
    }

    return {
      scale: sRatio,
      scaleFormatted: `1:${sRatio}`,
      drawingValue: drawVal,
      drawingFormatted: drawFormatted,
      canonicalDrawingMeters: drawMeters,
      isSelected: sRatio === safeSelectedScale
    };
  });

  // 6. Selected Scale Result
  const selectedMatch = scaleMatrix.find(m => m.scale === safeSelectedScale) || scaleMatrix[0];

  // 7. Architectural Context Readout
  const context = getArchitecturalContext(realCanonicalMeters);

  // 8. Clean CAD Numbers
  const cadRealNum = formatCadValue(realCanonicalMeters, { unit: safeDisplayUnit === 'ft-in' ? 'in' : safeDisplayUnit, precision, suffix: 'none' });
  const cadDrawNum = formatCadValue(selectedMatch.canonicalDrawingMeters, { unit: safeDrawingUnit === 'ft-in' ? 'in' : safeDrawingUnit, precision, suffix: 'none' });
  const cadNumbers = `${cadRealNum} ${cadDrawNum}`;

  return {
    rawInput: raw,
    valid: true,
    isExpression,
    mode,
    canonicalMeters: realCanonicalMeters,
    realValue,
    realFormatted,
    commonEquivalents,
    selectedScale: safeSelectedScale,
    selectedDrawingValue: selectedMatch.drawingValue,
    selectedDrawingFormatted: selectedMatch.drawingFormatted,
    scaleMatrix,
    context,
    cadNumbers,
    status: 'VALID',
    error: null
  };
}

/**
 * Formats quick dimension evaluation results for clipboard copying.
 * @param {Object} evalResult - Result of evaluateQuickDimension
 * @param {'real'|'drawing'|'real_and_drawing'|'all_scales'|'cad_numbers'|'tsv_row'|'json'} [formatType='real']
 * @param {Object} [options]
 * @returns {string} Formatted clipboard text
 */
export function formatQuickDimensionClipboard(evalResult, formatType = 'real', options = {}) {
  if (!evalResult || !evalResult.valid) return '';

  switch (formatType) {
    case 'real':
      return evalResult.realFormatted;

    case 'drawing':
      return evalResult.selectedDrawingFormatted;

    case 'real_and_drawing':
      return `Real: ${evalResult.realFormatted} | 1:${evalResult.selectedScale}: ${evalResult.selectedDrawingFormatted}`;

    case 'all_scales':
      return evalResult.scaleMatrix
        .map(m => `${m.scaleFormatted}: ${m.drawingFormatted}`)
        .join('\n');

    case 'cad_numbers':
      return evalResult.cadNumbers;

    case 'tsv_row':
      return [
        evalResult.rawInput,
        evalResult.realFormatted,
        `1:${evalResult.selectedScale}`,
        evalResult.selectedDrawingFormatted,
        evalResult.context.hasReference ? evalResult.context.matches.map(m => m.label).join('; ') : 'None'
      ].join('\t');

    case 'json':
      return JSON.stringify({
        input: evalResult.rawInput,
        realMeters: evalResult.canonicalMeters,
        realFormatted: evalResult.realFormatted,
        selectedScale: evalResult.selectedScale,
        drawingFormatted: evalResult.selectedDrawingFormatted,
        equivalents: evalResult.commonEquivalents.map(e => ({ unit: e.unit, formatted: e.formatted })),
        context: evalResult.context
      }, null, 2);

    default:
      return evalResult.realFormatted;
  }
}

/**
 * Creates downstream handoff payloads for existing studio modes.
 * @param {Object} evalResult - Result of evaluateQuickDimension
 * @param {'workspace'|'multiscale'|'chain'|'cad_clipboard'|'journal'} targetTool
 * @param {Object} [options]
 * @returns {Object} Handoff payload
 */
export function createQuickHandoffPayload(evalResult, targetTool, options = {}) {
  if (!evalResult || !evalResult.valid) return null;

  switch (targetTool) {
    case 'workspace': {
      const entry = createDimensionEntry({
        name: options.name || `Quick Dim (${evalResult.rawInput})`,
        rawInput: evalResult.realFormatted,
        dimensionType: options.dimensionType || 'reference',
        notes: `Quick Dimension 1:${evalResult.selectedScale} = ${evalResult.selectedDrawingFormatted}`
      }, evalResult.displayUnit || 'mm');
      return { entry };
    }

    case 'multiscale': {
      return {
        dimensionInput: evalResult.realFormatted,
        sourceUnit: evalResult.displayUnit || 'mm'
      };
    }

    case 'chain': {
      const segment = createChainSegment({
        name: options.name || `Segment ${evalResult.rawInput}`,
        rawInput: evalResult.realFormatted,
        type: 'segment'
      }, evalResult.displayUnit || 'mm');
      return { segment };
    }

    case 'cad_clipboard': {
      return {
        manualInput: evalResult.cadNumbers,
        source: 'manual'
      };
    }

    case 'journal': {
      return {
        toolMode: 'quick_dim',
        title: `Quick Dim: ${evalResult.realFormatted}`,
        inputString: evalResult.rawInput,
        resultString: `1:${evalResult.selectedScale} = ${evalResult.selectedDrawingFormatted}`,
        metadata: {
          canonicalMeters: evalResult.canonicalMeters,
          selectedScale: evalResult.selectedScale,
          selectedDrawingFormatted: evalResult.selectedDrawingFormatted,
          hasContext: evalResult.context.hasReference
        }
      };
    }

    default:
      return null;
  }
}
