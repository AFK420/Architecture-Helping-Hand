/**
 * Architecture Helping Hand - Dimension Chains Core Model & Engine
 * Phase 2.5: Daily Architect Toolkit — Part 5: Dimension Chains
 *
 * Headless, deterministic architectural dimension-string engine. Evaluates ordered,
 * continuous sequences of measured segments, cumulative running coordinates,
 * start/end offsets, scale-accurate SVG drafting geometry, and multi-format exports.
 */

import { UNITS, requireUnit } from './units.js';
import { SCALE_PRESETS } from './presets.js';
import { parseInput } from './parser.js';
import { formatNumber, formatFeetInches } from './formatter.js';
import { evaluateExpressionSafe, isExpressionLike } from './dimension-expression.js';
import { formatMeasurementValue, generateEntryId, createGroup, createDimensionEntry } from './dimension-workspace.js';

export const CHAIN_STORAGE_KEY = 'archiscale_dimension_chains';
export const DEFAULT_CHAIN_SCALE = 50;
export const DEFAULT_CHAIN_UNIT = 'mm';

let chainIdCounter = 0;
let segmentIdCounter = 0;

/**
 * Generate a unique ID for a dimension chain
 * @returns {string}
 */
export function generateChainId() {
  chainIdCounter++;
  return `chain_${Date.now()}_${chainIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique ID for a chain segment
 * @returns {string}
 */
export function generateSegmentId() {
  segmentIdCounter++;
  return `cseg_${Date.now()}_${segmentIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Create a new normalized DimensionChain object
 * @param {Object} [options]
 * @returns {Object} DimensionChain
 */
export function createDimensionChain(options = {}) {
  return {
    id: options.id || generateChainId(),
    name: typeof options.name === 'string' && options.name.trim() !== '' ? options.name.trim() : 'Dimension Chain',
    defaultUnit: options.defaultUnit || DEFAULT_CHAIN_UNIT,
    scaleRatio: typeof options.scaleRatio === 'number' && options.scaleRatio > 0 ? options.scaleRatio : DEFAULT_CHAIN_SCALE,
    startOffsetRaw: options.startOffsetRaw || '0',
    endOffsetRaw: options.endOffsetRaw || '0',
    segments: Array.isArray(options.segments) ? options.segments.map(s => createChainSegment(s, options.defaultUnit || DEFAULT_CHAIN_UNIT)) : []
  };
}

/**
 * Create a new normalized ChainSegment object
 * @param {Object} [options]
 * @param {string} [defaultUnit='mm']
 * @returns {Object} ChainSegment
 */
export function createChainSegment(options = {}, defaultUnit = DEFAULT_CHAIN_UNIT) {
  const type = (options.dimensionType === 'reference' || options.dimensionType === 'allowance')
    ? options.dimensionType
    : 'segment';

  return {
    id: options.id || generateSegmentId(),
    name: typeof options.name === 'string' && options.name.trim() !== '' ? options.name.trim() : 'Segment',
    rawInput: typeof options.rawInput === 'string' ? options.rawInput.trim() : (options.rawInput !== undefined ? String(options.rawInput) : '1200'),
    dimensionType: type, // 'segment' (default, additive) | 'reference' (annotation) | 'allowance' (tolerance)
    enabled: options.enabled !== false,
    startLabel: typeof options.startLabel === 'string' ? options.startLabel.trim() : '',
    endLabel: typeof options.endLabel === 'string' ? options.endLabel.trim() : '',
    notes: typeof options.notes === 'string' ? options.notes.trim() : ''
  };
}

/**
 * Parse a segment's raw input string (direct dimension or math expression)
 * @param {string} rawInput
 * @param {string} [defaultUnit='mm']
 * @param {number} [precision=3]
 * @returns {Object}
 */
export function parseSegmentMeasurement(rawInput, defaultUnit = DEFAULT_CHAIN_UNIT, precision = 3) {
  if (rawInput === undefined || rawInput === null || String(rawInput).trim() === '') {
    return { isValid: false, canonicalMeters: 0, detectedUnit: defaultUnit, error: 'Empty measurement' };
  }

  const trimmed = String(rawInput).trim();

  // 1. Check if input is a math expression
  if (isExpressionLike(trimmed)) {
    const exprEval = evaluateExpressionSafe(trimmed, { defaultUnit, precision });
    if (exprEval.isValid) {
      const meters = exprEval.dimension === 'scalar'
        ? exprEval.value * (UNITS[defaultUnit] || UNITS.mm).toMeters
        : exprEval.canonicalMeters;

      return {
        isValid: true,
        canonicalMeters: meters,
        detectedUnit: exprEval.displayUnit || defaultUnit,
        isExpression: true,
        expressionFormatted: exprEval.formatted,
        error: null
      };
    } else {
      return {
        isValid: false,
        canonicalMeters: 0,
        detectedUnit: defaultUnit,
        isExpression: true,
        expressionFormatted: '',
        error: exprEval.error?.message || 'Invalid expression'
      };
    }
  }

  // 2. Direct Dimension or Bare Number
  const parsed = parseInput(trimmed, { allowNegative: false });
  if (parsed.isValid) {
    const unitKey = parsed.detectedUnit || defaultUnit;
    const unitDef = requireUnit(unitKey, 'length');
    const meters = parsed.value * unitDef.toMeters;

    return {
      isValid: true,
      canonicalMeters: meters,
      detectedUnit: unitKey,
      isExpression: false,
      expressionFormatted: '',
      error: null
    };
  }

  return {
    isValid: false,
    canonicalMeters: 0,
    detectedUnit: defaultUnit,
    isExpression: false,
    expressionFormatted: '',
    error: parsed.error || 'Invalid measurement value'
  };
}

/**
 * Rapidly parse multi-segment quick-add input strings
 * Supports:
 * - Delimited: "1200 + 1800 + 900 + 1500" or "1200 1800 900 1500" -> 4 segments
 * - Comma-separated: "Bay 1 1200, Bay 2 1800, Door 900 ref" -> 3 segments
 * - Single Expression: { expressionAsSingleSegment: true } -> 1 segment
 * @param {string} inputStr
 * @param {Object} [options]
 * @returns {Object[]} Array of ChainSegment objects
 */
export function parseQuickChainInput(inputStr, options = {}) {
  const { defaultUnit = DEFAULT_CHAIN_UNIT, expressionAsSingleSegment = false } = options;

  if (!inputStr || typeof inputStr !== 'string' || inputStr.trim() === '') {
    return [];
  }

  const text = inputStr.trim();

  // If explicitly flagged as single expression
  if (expressionAsSingleSegment) {
    return [createChainSegment({ name: 'Segment 1', rawInput: text, dimensionType: 'segment' }, defaultUnit)];
  }

  // Comma-separated list with optional names (e.g. "Bay 1 1200, Door 900 ref, Bay 2 1800")
  if (text.includes(',')) {
    const parts = text.split(',').map(p => p.trim()).filter(Boolean);
    return parts.map((part, idx) => {
      let type = 'segment';
      let cleanPart = part;
      if (/\b(ref|reference)\b/i.test(cleanPart)) {
        type = 'reference';
        cleanPart = cleanPart.replace(/\b(ref|reference)\b/ig, '').trim();
      } else if (/\b(alw|allowance|tolerance)\b/i.test(cleanPart)) {
        type = 'allowance';
        cleanPart = cleanPart.replace(/\b(alw|allowance|tolerance)\b/ig, '').trim();
      }

      // Check if there is a name prefix before the numeric measurement
      const match = cleanPart.match(/^(.*?)\s+([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)(?:[a-zA-Z²³_'"′″\s\/-]+)?)$/);
      if (match && match[1].trim()) {
        return createChainSegment({
          name: match[1].trim(),
          rawInput: match[2].trim(),
          dimensionType: type
        }, defaultUnit);
      }

      return createChainSegment({
        name: `Segment ${idx + 1}`,
        rawInput: cleanPart,
        dimensionType: type
      }, defaultUnit);
    });
  }

  // Plus-separated chain (e.g. "1200 + 1800 + 900 + 1500")
  if (text.includes('+')) {
    const parts = text.split('+').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((part, idx) => createChainSegment({
        name: `Segment ${idx + 1}`,
        rawInput: part,
        dimensionType: 'segment'
      }, defaultUnit));
    }
  }

  // Space-separated numbers without operator (e.g. "1200 1800 900 1500")
  const spaceTokens = text.split(/\s+/).filter(Boolean);
  if (spaceTokens.length > 1 && spaceTokens.every(t => /^\d+(\.\d+)?([a-zA-Z'"′″]+)?$/.test(t))) {
    return spaceTokens.map((tok, idx) => createChainSegment({
      name: `Segment ${idx + 1}`,
      rawInput: tok,
      dimensionType: 'segment'
    }, defaultUnit));
  }

  // Single segment fallback
  return [createChainSegment({ name: 'Segment 1', rawInput: text, dimensionType: 'segment' }, defaultUnit)];
}

/**
 * Calculate running cumulative positions, totals, drawing sizes, and offsets for a DimensionChain
 * @param {Object} chain - DimensionChain object
 * @param {Object} [options]
 * @param {string} [options.displayUnit=null]
 * @param {number} [options.scaleRatio=null]
 * @param {number} [options.precision=3]
 * @returns {Object} Calculated chain result
 */
export function calculateChain(chain, options = {}) {
  if (!chain || typeof chain !== 'object') {
    throw new TypeError('calculateChain requires a DimensionChain object');
  }

  const defaultUnit = chain.defaultUnit || DEFAULT_CHAIN_UNIT;
  const displayUnit = options.displayUnit || defaultUnit;
  const scaleRatio = typeof options.scaleRatio === 'number' && options.scaleRatio > 0
    ? options.scaleRatio
    : (chain.scaleRatio || DEFAULT_CHAIN_SCALE);
  const precision = typeof options.precision === 'number' ? options.precision : 3;

  // 1. Calculate Start and End Offsets
  const startOffsetParsed = parseSegmentMeasurement(chain.startOffsetRaw || '0', displayUnit, precision);
  const startOffsetMeters = (startOffsetParsed.isValid && startOffsetParsed.canonicalMeters > 0)
    ? startOffsetParsed.canonicalMeters
    : 0;

  const endOffsetParsed = parseSegmentMeasurement(chain.endOffsetRaw || '0', displayUnit, precision);
  const endOffsetMeters = (endOffsetParsed.isValid && endOffsetParsed.canonicalMeters > 0)
    ? endOffsetParsed.canonicalMeters
    : 0;

  // 2. Iterate segments sequentially and calculate running coordinates
  let currentPositionMeters = startOffsetMeters;
  let segmentTotalMeters = 0;
  let allowanceTotalMeters = 0;
  let validCount = 0;
  let invalidCount = 0;

  const calculatedSegments = (chain.segments || []).map((seg, idx) => {
    const parsed = parseSegmentMeasurement(seg.rawInput, displayUnit, precision);

    if (!parsed.isValid) {
      invalidCount++;
      return {
        ...seg,
        index: idx + 1,
        isValid: false,
        error: parsed.error,
        startMeters: currentPositionMeters,
        endMeters: currentPositionMeters,
        lengthMeters: 0,
        startFormatted: formatMeasurementValue(currentPositionMeters, displayUnit, precision),
        endFormatted: formatMeasurementValue(currentPositionMeters, displayUnit, precision),
        lengthFormatted: '---',
        drawingLengthMeters: 0,
        drawingFormatted: '---'
      };
    }

    validCount++;
    const lengthMeters = parsed.canonicalMeters;
    const isEnabled = seg.enabled !== false;

    let segStartMeters = currentPositionMeters;
    let segEndMeters = currentPositionMeters;

    if (isEnabled) {
      if (seg.dimensionType === 'segment') {
        // Additive segment
        segStartMeters = currentPositionMeters;
        segEndMeters = currentPositionMeters + lengthMeters;
        currentPositionMeters = segEndMeters;
        segmentTotalMeters += lengthMeters;
      } else if (seg.dimensionType === 'allowance') {
        // Additive allowance / tolerance
        segStartMeters = currentPositionMeters;
        segEndMeters = currentPositionMeters + lengthMeters;
        currentPositionMeters = segEndMeters;
        allowanceTotalMeters += lengthMeters;
      } else {
        // Reference dimension (annotation): DOES NOT advance structural baseline
        segStartMeters = currentPositionMeters;
        segEndMeters = currentPositionMeters; // Stays at current position
      }
    }

    // Drawing scale values
    const drawingLengthMeters = lengthMeters / scaleRatio;
    const isImperial = (displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'ft_in');
    const drawUnitKey = isImperial ? 'in' : 'mm';
    const drawUnitDef = UNITS[drawUnitKey] || UNITS.mm;
    const drawingValue = drawingLengthMeters / drawUnitDef.toMeters;

    let drawingFormatted = '';
    if (drawUnitKey === 'ft_in') {
      const totalInches = drawingLengthMeters / UNITS.in.toMeters;
      drawingFormatted = formatFeetInches(totalInches);
    } else {
      drawingFormatted = `${formatNumber(drawingValue, precision)} ${drawUnitDef.symbol}`;
    }

    return {
      ...seg,
      index: idx + 1,
      isValid: true,
      error: null,
      startMeters: segStartMeters,
      endMeters: segEndMeters,
      lengthMeters: lengthMeters,
      startFormatted: formatMeasurementValue(segStartMeters, displayUnit, precision),
      endFormatted: formatMeasurementValue(segEndMeters, displayUnit, precision),
      lengthFormatted: formatMeasurementValue(lengthMeters, displayUnit, precision),
      drawingLengthMeters: drawingLengthMeters,
      drawingFormatted: drawingFormatted
    };
  });

  // Overall Extent = Start Offset + Segments + Allowances + End Offset
  const overallExtentMeters = startOffsetMeters + segmentTotalMeters + allowanceTotalMeters + endOffsetMeters;
  const drawingOverallMeters = overallExtentMeters / scaleRatio;
  const isImperialOverall = (displayUnit === 'ft' || displayUnit === 'in' || displayUnit === 'ft_in');
  const drawOverallUnit = isImperialOverall ? 'in' : 'mm';
  const drawOverallUnitDef = UNITS[drawOverallUnit] || UNITS.mm;
  const drawingOverallValue = drawingOverallMeters / drawOverallUnitDef.toMeters;

  let drawingOverallFormatted = '';
  if (drawOverallUnit === 'ft_in') {
    drawingOverallFormatted = formatFeetInches(drawingOverallMeters / UNITS.in.toMeters);
  } else {
    drawingOverallFormatted = `${formatNumber(drawingOverallValue, precision)} ${drawOverallUnitDef.symbol}`;
  }

  return {
    id: chain.id,
    name: chain.name || 'Dimension Chain',
    defaultUnit: defaultUnit,
    displayUnit: displayUnit,
    scaleRatio: scaleRatio,
    startOffsetMeters: startOffsetMeters,
    startOffsetFormatted: formatMeasurementValue(startOffsetMeters, displayUnit, precision),
    endOffsetMeters: endOffsetMeters,
    endOffsetFormatted: formatMeasurementValue(endOffsetMeters, displayUnit, precision),
    segmentTotalMeters: segmentTotalMeters,
    segmentTotalFormatted: formatMeasurementValue(segmentTotalMeters, displayUnit, precision),
    allowanceTotalMeters: allowanceTotalMeters,
    allowanceTotalFormatted: formatMeasurementValue(allowanceTotalMeters, displayUnit, precision),
    overallExtentMeters: overallExtentMeters,
    overallExtentFormatted: formatMeasurementValue(overallExtentMeters, displayUnit, precision),
    drawingOverallMeters: drawingOverallMeters,
    drawingOverallFormatted: drawingOverallFormatted,
    segments: calculatedSegments,
    segmentCount: calculatedSegments.length,
    validCount: validCount,
    invalidCount: invalidCount,
    isValid: invalidCount === 0 && calculatedSegments.length > 0
  };
}

/**
 * Generate a scale-accurate SVG drafting representation of the dimension chain
 * @param {Object} calculatedChain - Output from calculateChain
 * @param {Object} [options]
 * @param {string} [options.selectedSegmentId=null]
 * @param {number} [options.svgWidth=860]
 * @param {number} [options.svgHeight=180]
 * @returns {string} SVG markup
 */
export function generateChainSVG(calculatedChain, options = {}) {
  if (!calculatedChain || !Array.isArray(calculatedChain.segments) || calculatedChain.segments.length === 0) {
    return `<svg viewBox="0 0 800 120" xmlns="http://www.w3.org/2000/svg" class="chain-svg-empty"><text x="400" y="65" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="monospace" font-size="13">No chain segments entered yet</text></svg>`;
  }

  const {
    selectedSegmentId = null,
    svgWidth = 860,
    svgHeight = 180
  } = options;

  const padLeft = 60;
  const padRight = 60;
  const usableWidth = svgWidth - padLeft - padRight;

  const baselineY = 90;
  const dimLineY = 52;
  const totalDimLineY = 145;

  const totalExtent = Math.max(calculatedChain.overallExtentMeters, 0.001);

  function getX(meters) {
    return padLeft + (meters / totalExtent) * usableWidth;
  }

  let svgElements = [];

  // 1. Grid Background lines & Ticks
  svgElements.push(`<defs>
    <pattern id="chainGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.05" />
    </pattern>
  </defs>`);
  svgElements.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="url(#chainGrid)" rx="6" />`);

  // 2. Start Offset Indicator
  if (calculatedChain.startOffsetMeters > 0) {
    const startOffsetEndX = getX(calculatedChain.startOffsetMeters);
    svgElements.push(`
      <rect x="${padLeft}" y="${baselineY - 12}" width="${startOffsetEndX - padLeft}" height="24" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" stroke-dasharray="3 3" stroke-width="1" />
      <text x="${(padLeft + startOffsetEndX) / 2}" y="${baselineY + 4}" font-family="monospace" font-size="9" font-weight="600" fill="#f59e0b" text-anchor="middle">OFFSET: ${calculatedChain.startOffsetFormatted}</text>
    `);
  }

  // 3. Main Continuous Baseline Axis
  const startX = getX(0);
  const endX = getX(totalExtent);
  svgElements.push(`<line x1="${startX}" y1="${baselineY}" x2="${endX}" y2="${baselineY}" stroke="currentColor" stroke-width="2" opacity="0.8" />`);

  // 4. Cumulative Position Coordinate Labels & Major Baseline Ticks
  const positionsSet = new Set();
  positionsSet.add(0);
  if (calculatedChain.startOffsetMeters > 0) positionsSet.add(calculatedChain.startOffsetMeters);

  calculatedChain.segments.forEach(seg => {
    if (seg.isValid && seg.enabled) {
      positionsSet.add(seg.startMeters);
      positionsSet.add(seg.endMeters);
    }
  });

  const sortedPositions = Array.from(positionsSet).sort((a, b) => a - b);
  sortedPositions.forEach(posMeters => {
    const px = getX(posMeters);
    const posFormatted = formatMeasurementValue(posMeters, calculatedChain.displayUnit, 1);
    svgElements.push(`
      <line x1="${px}" y1="${baselineY - 8}" x2="${px}" y2="${baselineY + 8}" stroke="currentColor" stroke-width="1.5" opacity="0.7" />
      <text x="${px}" y="${baselineY - 14}" font-family="monospace" font-size="10" font-weight="700" fill="currentColor" opacity="0.9" text-anchor="middle">${posFormatted}</text>
    `);
  });

  // 5. Render Individual Segments, Extension Lines, Dimension Witness Arrows & Text
  calculatedChain.segments.forEach(seg => {
    if (!seg.isValid || !seg.enabled) return;

    const x1 = getX(seg.startMeters);
    const x2 = getX(seg.endMeters);
    const segWidth = Math.max(x2 - x1, 1);
    const isSelected = seg.id === selectedSegmentId;
    const isRef = seg.dimensionType === 'reference';
    const isAlw = seg.dimensionType === 'allowance';

    const strokeColor = isSelected
      ? '#38bdf8'
      : isRef
      ? '#94a3b8'
      : isAlw
      ? '#f59e0b'
      : 'var(--accent-primary, #38bdf8)';

    // Highlight background slice if selected
    if (isSelected) {
      svgElements.push(`
        <rect x="${x1}" y="20" width="${segWidth}" height="110" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 2" rx="4" />
      `);
    }

    if (isRef) {
      // Reference Dimension (Annotation Pin at coordinate)
      svgElements.push(`
        <circle cx="${x1}" cy="${baselineY}" r="4" fill="#94a3b8" />
        <line x1="${x1}" y1="${baselineY - 20}" x2="${x1}" y2="${baselineY + 20}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2" />
        <text x="${x1}" y="${baselineY + 34}" font-family="monospace" font-size="9" fill="#94a3b8" text-anchor="middle">${seg.name} [REF]</text>
      `);
    } else {
      // Standard or Allowance Dimension Segment
      // Extension Witness Lines
      svgElements.push(`
        <line x1="${x1}" y1="${dimLineY - 4}" x2="${x1}" y2="${baselineY - 4}" stroke="${strokeColor}" stroke-width="1" opacity="0.4" stroke-dasharray="2 2" />
        <line x1="${x2}" y1="${dimLineY - 4}" x2="${x2}" y2="${baselineY - 4}" stroke="${strokeColor}" stroke-width="1" opacity="0.4" stroke-dasharray="2 2" />
      `);

      // Dimension Horizontal Line with architectural 45° slash ticks
      svgElements.push(`
        <line x1="${x1}" y1="${dimLineY}" x2="${x2}" y2="${dimLineY}" stroke="${strokeColor}" stroke-width="1.5" />
        <line x1="${x1 - 4}" y1="${dimLineY + 4}" x2="${x1 + 4}" y2="${dimLineY - 4}" stroke="${strokeColor}" stroke-width="1.8" />
        <line x1="${x2 - 4}" y1="${dimLineY + 4}" x2="${x2 + 4}" y2="${dimLineY - 4}" stroke="${strokeColor}" stroke-width="1.8" />
      `);

      // Segment Dimension Text (Real & Drawing)
      const midX = (x1 + x2) / 2;
      svgElements.push(`
        <text x="${midX}" y="${dimLineY - 7}" font-family="monospace" font-size="11" font-weight="700" fill="${strokeColor}" text-anchor="middle">${seg.lengthFormatted}</text>
      `);

      // Segment Name & Markers below baseline
      const markerText = (seg.startLabel && seg.endLabel)
        ? `${seg.startLabel} ➔ ${seg.endLabel}`
        : seg.name;

      svgElements.push(`
        <text x="${midX}" y="${baselineY + 22}" font-family="sans-serif" font-size="10" font-weight="600" fill="currentColor" opacity="0.85" text-anchor="middle">${markerText}</text>
      `);
    }
  });

  // 6. Bottom Overall Total Dimension Line & Scale Legend
  if (calculatedChain.overallExtentMeters > 0) {
    svgElements.push(`
      <line x1="${startX}" y1="${totalDimLineY}" x2="${endX}" y2="${totalDimLineY}" stroke="currentColor" stroke-width="1.5" opacity="0.6" />
      <line x1="${startX - 4}" y1="${totalDimLineY + 4}" x2="${startX + 4}" y2="${totalDimLineY - 4}" stroke="currentColor" stroke-width="2" opacity="0.8" />
      <line x1="${endX - 4}" y1="${totalDimLineY + 4}" x2="${endX + 4}" y2="${totalDimLineY - 4}" stroke="currentColor" stroke-width="2" opacity="0.8" />
      <text x="${(startX + endX) / 2}" y="${totalDimLineY - 6}" font-family="monospace" font-size="11" font-weight="800" fill="currentColor" text-anchor="middle">TOTAL: ${calculatedChain.overallExtentFormatted} (Drawing @ 1:${calculatedChain.scaleRatio}: ${calculatedChain.drawingOverallFormatted})</text>
    `);
  }

  // 7. Scale Ratio Stamp Badge (Top Right)
  svgElements.push(`
    <rect x="${svgWidth - 110}" y="8" width="95" height="20" rx="3" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1" />
    <text x="${svgWidth - 62}" y="22" font-family="monospace" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">SCALE 1:${calculatedChain.scaleRatio}</text>
  `);

  return `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" class="chain-svg-viewport" role="img" aria-label="${calculatedChain.name} dimension chain with ${calculatedChain.segmentCount} segments, total length ${calculatedChain.overallExtentFormatted}">
      ${svgElements.join('\n')}
    </svg>
  `;
}

/**
 * Format calculated chain data for multi-stream clipboard export or TSV download
 * @param {Object} calculatedChain - Output from calculateChain
 * @param {'tsv'|'table'|'cumulative'|'segments'|'drawing'} [formatType='tsv']
 * @returns {string} Formatted text
 */
export function formatChainForClipboard(calculatedChain, formatType = 'tsv') {
  if (!calculatedChain || !Array.isArray(calculatedChain.segments) || calculatedChain.segments.length === 0) {
    return 'No dimension chain data available.';
  }

  const { segments, name, overallExtentFormatted, scaleRatio, drawingOverallFormatted } = calculatedChain;

  if (formatType === 'cumulative') {
    // Running coordinate stream (e.g. "0 1200 3000 3900 5400")
    const positions = [calculatedChain.startOffsetFormatted];
    segments.forEach(s => {
      if (s.isValid && s.enabled && s.dimensionType !== 'reference') {
        positions.push(s.endFormatted);
      }
    });
    return positions.join('   ');
  }

  if (formatType === 'segments') {
    // Raw segment lengths stream (e.g. "1200 1800 900 1500")
    return segments.filter(s => s.isValid && s.enabled).map(s => s.lengthFormatted).join('   ');
  }

  if (formatType === 'drawing') {
    // Scaled drawing lengths stream
    return segments.filter(s => s.isValid && s.enabled).map(s => s.drawingFormatted).join('   ');
  }

  if (formatType === 'table') {
    // Markdown Table
    let md = `### Dimension Chain: ${name}\n`;
    md += `**Overall Extent:** ${overallExtentFormatted} (Drawing @ 1:${scaleRatio}: ${drawingOverallFormatted})\n\n`;
    md += `| # | Name | Start | End | Length | Type | Drawing @ 1:${scaleRatio} |\n`;
    md += `| :---: | :--- | :--- | :--- | :--- | :---: | :--- |\n`;

    segments.forEach((s, idx) => {
      md += `| ${idx + 1} | ${s.name} | ${s.startFormatted} | ${s.endFormatted} | **${s.lengthFormatted}** | ${s.dimensionType.toUpperCase()} | \`${s.drawingFormatted}\` |\n`;
    });

    return md;
  }

  // Default: TSV (Tab-Separated Values for CAD/Excel)
  let tsv = `Index\tName\tStart\tEnd\tLength\tType\tDrawing_1_${scaleRatio}\tNotes\n`;
  segments.forEach((s, idx) => {
    tsv += `${idx + 1}\t${s.name}\t${s.startFormatted}\t${s.endFormatted}\t${s.lengthFormatted}\t${s.dimensionType}\t${s.drawingFormatted}\t${s.notes || ''}\n`;
  });

  return tsv;
}

/**
 * Converts a calculated chain into a grouped set of Dimension Workspace entries
 * @param {Object} calculatedChain - Output from calculateChain
 * @returns {Object} { group: Object, entries: Object[] }
 */
export function convertChainToWorkspaceGroup(calculatedChain) {
  if (!calculatedChain || !Array.isArray(calculatedChain.segments)) {
    return { group: createGroup('Dimension Chain'), entries: [] };
  }

  const group = createGroup(calculatedChain.name || 'Dimension Chain');
  const unit = calculatedChain.displayUnit || DEFAULT_CHAIN_UNIT;

  const entries = calculatedChain.segments.map((s, idx) => {
    return createDimensionEntry({
      name: s.name || `Chain Segment ${idx + 1}`,
      rawInput: s.rawInput,
      dimensionType: s.dimensionType || 'segment',
      defaultUnit: unit,
      groupId: group.id,
      notes: `Chain: ${calculatedChain.name} (#${idx + 1}, Start: ${s.startFormatted}, End: ${s.endFormatted})`
    }, unit);
  });

  return { group, entries };
}

/**
 * Built-in architectural chain templates
 */
export const CHAIN_TEMPLATES = Object.freeze({
  wall_opening: {
    id: 'wall_opening',
    name: 'Wall Opening Sequence',
    defaultUnit: 'mm',
    segments: [
      { name: 'Wall Pier A', rawInput: '1200', dimensionType: 'segment' },
      { name: 'Window Opening', rawInput: '1500', dimensionType: 'segment' },
      { name: 'Center Pier', rawInput: '600', dimensionType: 'segment' },
      { name: 'Door Opening', rawInput: '900', dimensionType: 'segment' },
      { name: 'Wall Pier B', rawInput: '1200', dimensionType: 'segment' }
    ]
  },
  grid_bays: {
    id: 'grid_bays',
    name: 'Structural Grid Line Bays',
    defaultUnit: 'mm',
    segments: [
      { name: 'Bay 1–2', rawInput: '6000', dimensionType: 'segment', startLabel: 'Grid 1', endLabel: 'Grid 2' },
      { name: 'Bay 2–3', rawInput: '6000', dimensionType: 'segment', startLabel: 'Grid 2', endLabel: 'Grid 3' },
      { name: 'Bay 3–4 (Core)', rawInput: '7500', dimensionType: 'segment', startLabel: 'Grid 3', endLabel: 'Grid 4' },
      { name: 'Bay 4–5', rawInput: '6000', dimensionType: 'segment', startLabel: 'Grid 4', endLabel: 'Grid 5' }
    ]
  },
  facade_rhythm: {
    id: 'facade_rhythm',
    name: 'Curtain Wall Facade Rhythm',
    defaultUnit: 'mm',
    segments: [
      { name: 'Corner Mullion', rawInput: '150', dimensionType: 'segment' },
      { name: 'Vision Glass 1', rawInput: '1350', dimensionType: 'segment' },
      { name: 'Intermediate Mullion', rawInput: '150', dimensionType: 'segment' },
      { name: 'Vision Glass 2', rawInput: '1350', dimensionType: 'segment' },
      { name: 'End Mullion', rawInput: '150', dimensionType: 'segment' }
    ]
  },
  room_perimeter: {
    id: 'room_perimeter',
    name: 'Interior Corridor Partitions',
    defaultUnit: 'mm',
    segments: [
      { name: 'Entry Foyer', rawInput: '2400', dimensionType: 'segment' },
      { name: 'Corridor Spine', rawInput: '1800', dimensionType: 'segment' },
      { name: 'Main Gallery', rawInput: '5400', dimensionType: 'segment' }
    ]
  }
});
