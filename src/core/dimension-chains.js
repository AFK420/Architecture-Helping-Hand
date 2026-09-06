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
    return `<svg viewBox="0 0 800 140" xmlns="http://www.w3.org/2000/svg" class="chain-svg-empty"><text x="400" y="75" text-anchor="middle" fill="currentColor" opacity="0.4" font-family="monospace" font-size="14" font-weight="600">No chain segments entered yet — add segments or select a template above</text></svg>`;
  }

  const {
    selectedSegmentId = null,
    svgWidth = 1000,
    svgHeight = 420
  } = options;

  const padLeft = 80;
  const padRight = 80;
  const usableWidth = svgWidth - padLeft - padRight;
  const totalExtent = Math.max(calculatedChain.overallExtentMeters, 0.001);

  function getX(meters) {
    return padLeft + (meters / totalExtent) * usableWidth;
  }

  // Key vertical layout bands
  const dimLineY = 85;
  const bandTopY = 142;
  const bandHeight = 56;
  const bandBottomY = bandTopY + bandHeight;
  const datumLineY = 245;
  const totalDimLineY = 325;
  const footerY = 385;

  let svgElements = [];

  // 1. Defs: Grid background & Architectural Poché patterns
  svgElements.push(`<defs>
    <pattern id="chainGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.04" />
    </pattern>
    <pattern id="brickPoche" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" />
      <line x1="8" y1="0" x2="8" y2="16" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
    </pattern>
    <pattern id="concretePoche" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="0.8" fill="rgba(255, 255, 255, 0.25)" />
      <circle cx="10" cy="9" r="0.8" fill="rgba(255, 255, 255, 0.25)" />
      <polygon points="6,6 8,4 9,7" fill="rgba(255, 255, 255, 0.18)" />
    </pattern>
    <pattern id="glassReflect" width="20" height="20" patternTransform="rotate(30 0 0)" patternUnits="userSpaceOnUse">
      <line x1="4" y1="0" x2="4" y2="20" stroke="rgba(56, 189, 248, 0.25)" stroke-width="2" />
    </pattern>
    <pattern id="allowancePoche" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(245, 158, 11, 0.35)" stroke-width="2" />
    </pattern>
    <filter id="chainGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#4989D9" flood-opacity="0.35" />
    </filter>
  </defs>`);

  // Background card
  svgElements.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="#111317" rx="8" />`);
  svgElements.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="url(#chainGrid)" rx="8" />`);

  // 2. Title & Scale Badge Header
  svgElements.push(`
    <text x="${padLeft}" y="32" font-family="var(--font-mono, monospace)" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="0.08em">
      SEQUENCE: <tspan fill="#f1f5f9" font-weight="800">${(calculatedChain.name || 'DRAFTING SEQUENCE').toUpperCase()}</tspan>
    </text>
    <g transform="translate(${svgWidth - 145}, 16)">
      <rect width="120" height="24" rx="4" fill="rgba(73, 137, 217, 0.15)" stroke="var(--accent-primary, #4989D9)" stroke-width="1.2" />
      <text x="60" y="16" font-family="var(--font-mono, monospace)" font-size="11" font-weight="800" fill="var(--accent-primary, #4989D9)" text-anchor="middle">SCALE 1:${calculatedChain.scaleRatio}</text>
    </g>
  `);

  // 3. Start Offset Indicator (if present)
  if (calculatedChain.startOffsetMeters > 0) {
    const startOffsetEndX = getX(calculatedChain.startOffsetMeters);
    svgElements.push(`
      <g class="chain-start-offset">
        <rect x="${padLeft}" y="${bandTopY}" width="${startOffsetEndX - padLeft}" height="${bandHeight}" fill="rgba(245, 158, 11, 0.10)" stroke="#f59e0b" stroke-dasharray="4 3" stroke-width="1.5" rx="3" />
        <text x="${(padLeft + startOffsetEndX) / 2}" y="${bandTopY + 32}" font-family="var(--font-mono, monospace)" font-size="11" font-weight="700" fill="#f59e0b" text-anchor="middle">START OFFSET: ${calculatedChain.startOffsetFormatted}</text>
      </g>
    `);
  }

  const startX = getX(0);
  const endX = getX(totalExtent);

  // 4. Render Architectural Elevation / Poché Band (Centerpiece)
  // Base background bar for continuous construction
  svgElements.push(`
    <!-- Continuous Sub-Base Track -->
    <rect x="${startX}" y="${bandTopY}" width="${Math.max(endX - startX, 1)}" height="${bandHeight}" fill="#16181e" stroke="#2a2d36" stroke-width="1.5" rx="4" />
  `);

  // 5. Render Individual Segments: Dimensions, Witness Lines, Poché Blocks, & Text
  calculatedChain.segments.forEach(seg => {
    if (!seg.isValid || !seg.enabled) return;

    const x1 = getX(seg.startMeters);
    const x2 = getX(seg.endMeters);
    const segWidth = Math.max(x2 - x1, 1);
    const midX = (x1 + x2) / 2;
    const isSelected = seg.id === selectedSegmentId;
    const isRef = seg.dimensionType === 'reference';
    const isAlw = seg.dimensionType === 'allowance';

    const segNameLower = (seg.name || '').toLowerCase();
    const isWindow = segNameLower.includes('window') || segNameLower.includes('glaz') || segNameLower.includes('light');
    const isDoor = segNameLower.includes('door') || segNameLower.includes('entr') || segNameLower.includes('exit') || segNameLower.includes('gate');
    const isColumn = segNameLower.includes('column') || segNameLower.includes('col') || segNameLower.includes('pier') && segNameLower.includes('center');

    // Architectural styling variables
    let strokeColor = isSelected ? '#38bdf8' : (isRef ? '#94a3b8' : (isAlw ? '#fbbf24' : '#4989D9'));
    let blockFill = '#1e2028';
    let blockPattern = 'url(#brickPoche)';
    let blockBorder = '#3f4350';
    let typeIcon = '🧱';

    if (isWindow) {
      blockFill = '#082f49';
      blockPattern = 'url(#glassReflect)';
      blockBorder = '#0284c7';
      typeIcon = '🪟';
    } else if (isDoor) {
      blockFill = '#451a03';
      blockPattern = '';
      blockBorder = '#d97706';
      typeIcon = '🚪';
    } else if (isColumn) {
      blockFill = '#3b0764';
      blockPattern = 'url(#concretePoche)';
      blockBorder = '#9333ea';
      typeIcon = '🏛️';
    } else if (isAlw) {
      blockFill = '#451a03';
      blockPattern = 'url(#allowancePoche)';
      blockBorder = '#f59e0b';
      typeIcon = '⚠️';
    } else if (isRef) {
      blockFill = '#1e222b';
      blockPattern = '';
      blockBorder = '#64748b';
      typeIcon = '📍';
    }

    // Top Extension Witness Lines
    svgElements.push(`
      <line x1="${x1}" y1="${dimLineY - 14}" x2="${x1}" y2="${bandTopY - 4}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.45" stroke-dasharray="3 2" />
      <line x1="${x2}" y1="${dimLineY - 14}" x2="${x2}" y2="${bandTopY - 4}" stroke="${strokeColor}" stroke-width="1.2" opacity="0.45" stroke-dasharray="3 2" />
    `);

    // Top Dimension Line Segment with Heavy 45° Architectural Slash Ticks
    svgElements.push(`
      <line x1="${x1}" y1="${dimLineY}" x2="${x2}" y2="${dimLineY}" stroke="${strokeColor}" stroke-width="2" />
      <!-- Left 45° Architectural Slash Tick -->
      <line x1="${x1 - 6}" y1="${dimLineY + 6}" x2="${x1 + 6}" y2="${dimLineY - 6}" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
      <!-- Right 45° Architectural Slash Tick -->
      <line x1="${x2 - 6}" y1="${dimLineY + 6}" x2="${x2 + 6}" y2="${dimLineY - 6}" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
    `);

    // Dimension Text Pill Badge
    const valText = seg.lengthFormatted;
    const drawText = `@ 1:${calculatedChain.scaleRatio}: ${seg.drawingFormatted}`;
    const pillWidth = Math.min(Math.max(valText.length * 10 + 16, 75), Math.max(segWidth - 4, 30));

    svgElements.push(`
      <g class="dim-text-pill">
        <rect x="${midX - pillWidth / 2}" y="${dimLineY - 30}" width="${pillWidth}" height="24" rx="4" fill="#0f172a" stroke="${strokeColor}" stroke-width="1.2" />
        <text x="${midX}" y="${dimLineY - 14}" font-family="var(--font-mono, monospace)" font-size="12" font-weight="800" fill="#f8fafc" text-anchor="middle">${valText}</text>
        ${segWidth >= 80 ? `
          <text x="${midX}" y="${dimLineY + 18}" font-family="var(--font-mono, monospace)" font-size="9.5" font-weight="600" fill="#94a3b8" text-anchor="middle">${drawText}</text>
        ` : ''}
      </g>
    `);

    // Architectural Elevation Poché Block
    svgElements.push(`
      <g class="chain-segment-block ${isSelected ? 'selected' : ''}" data-segment-id="${seg.id}" style="cursor: pointer;">
        <title>${seg.name}: ${seg.lengthFormatted} (Drawing: ${seg.drawingFormatted}) [${seg.startFormatted} ➔ ${seg.endFormatted}]</title>
        <!-- Solid background layer -->
        <rect x="${x1}" y="${bandTopY}" width="${segWidth}" height="${bandHeight}" fill="${blockFill}" rx="3" />
        ${blockPattern ? `
          <!-- Architectural Poché Hatch Pattern -->
          <rect x="${x1}" y="${bandTopY}" width="${segWidth}" height="${bandHeight}" fill="${blockPattern}" rx="3" opacity="0.9" />
        ` : ''}
        ${isWindow ? `
          <!-- Glazed Sill & Mullion Lines -->
          <line x1="${x1}" y1="${bandBottomY - 6}" x2="${x2}" y2="${bandBottomY - 6}" stroke="#38bdf8" stroke-width="2.5" />
          <line x1="${midX}" y1="${bandTopY}" x2="${midX}" y2="${bandBottomY - 6}" stroke="#0284c7" stroke-width="1.5" />
        ` : ''}
        ${isDoor ? `
          <!-- Door Frame & Swing Clearance Threshold -->
          <rect x="${x1}" y="${bandTopY}" width="4" height="${bandHeight}" fill="#d97706" />
          <rect x="${x2 - 4}" y="${bandTopY}" width="4" height="${bandHeight}" fill="#d97706" />
          <line x1="${x1 + 6}" y1="${bandBottomY - 4}" x2="${x2 - 6}" y2="${bandBottomY - 4}" stroke="#f59e0b" stroke-dasharray="3 2" stroke-width="1.5" />
        ` : ''}
        <!-- Segment Border Frame -->
        <rect x="${x1}" y="${bandTopY}" width="${segWidth}" height="${bandHeight}" fill="none" stroke="${isSelected ? '#38bdf8' : blockBorder}" stroke-width="${isSelected ? 2.5 : 1.5}" rx="3" ${isSelected ? 'filter="url(#chainGlow)"' : ''} />
        
        <!-- Segment Name Label in Center of Poché Band -->
        <rect x="${midX - Math.min(segWidth * 0.45, 55)}" y="${bandTopY + 16}" width="${Math.min(segWidth * 0.9, 110)}" height="22" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="0.8" />
        <text x="${midX}" y="${bandTopY + 31}" font-family="var(--font-mono, monospace)" font-size="${segWidth < 60 ? 9 : 11}" font-weight="700" fill="#f1f5f9" text-anchor="middle">
          ${segWidth < 50 ? typeIcon : `${typeIcon} ${seg.name}`}
        </text>
      </g>
    `);
  });

  // 6. Cumulative Position Coordinate Labels & Major Baseline Ticks
  const positionsSet = new Set();
  positionsSet.add(0);
  if (calculatedChain.startOffsetMeters > 0) positionsSet.add(calculatedChain.startOffsetMeters);

  calculatedChain.segments.forEach(seg => {
    if (seg.isValid && seg.enabled) {
      positionsSet.add(seg.startMeters);
      positionsSet.add(seg.endMeters);
    }
  });

  // Running Cumulative Axis Line
  svgElements.push(`
    <line x1="${startX}" y1="${datumLineY}" x2="${endX}" y2="${datumLineY}" stroke="currentColor" stroke-width="2" opacity="0.75" />
  `);

  const sortedPositions = Array.from(positionsSet).sort((a, b) => a - b);
  sortedPositions.forEach((posMeters, i) => {
    const px = getX(posMeters);
    const posFormatted = formatMeasurementValue(posMeters, calculatedChain.displayUnit, 1);
    const isFirst = i === 0;
    const isLast = i === sortedPositions.length - 1;

    // Vertical extension down to cumulative line
    svgElements.push(`
      <line x1="${px}" y1="${bandBottomY + 2}" x2="${px}" y2="${datumLineY + 6}" stroke="currentColor" stroke-width="1.2" opacity="0.4" stroke-dasharray="2 2" />
      <circle cx="${px}" cy="${datumLineY}" r="4.5" fill="#1e293b" stroke="${isFirst || isLast ? 'var(--accent-primary, #4989D9)' : 'currentColor'}" stroke-width="2" />
      <!-- Cumulative Position Badge -->
      <rect x="${px - 36}" y="${datumLineY + 12}" width="72" height="22" rx="4" fill="#0f172a" stroke="currentColor" stroke-width="1" opacity="0.85" />
      <text x="${px}" y="${datumLineY + 27}" font-family="var(--font-mono, monospace)" font-size="11" font-weight="800" fill="#f1f5f9" text-anchor="middle">${posFormatted}</text>
    `);
  });

  // 7. Bottom Overall Total Dimension Line
  if (calculatedChain.overallExtentMeters > 0) {
    const midTotal = (startX + endX) / 2;
    svgElements.push(`
      <!-- Overall Witness Drop Lines -->
      <line x1="${startX}" y1="${datumLineY + 36}" x2="${startX}" y2="${totalDimLineY + 10}" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
      <line x1="${endX}" y1="${datumLineY + 36}" x2="${endX}" y2="${totalDimLineY + 10}" stroke="currentColor" stroke-width="1.5" opacity="0.5" />

      <!-- Overall Continuous Dimension Line -->
      <line x1="${startX}" y1="${totalDimLineY}" x2="${endX}" y2="${totalDimLineY}" stroke="currentColor" stroke-width="2" opacity="0.8" />
      <!-- Heavy Architectural End Slash Ticks -->
      <line x1="${startX - 7}" y1="${totalDimLineY + 7}" x2="${startX + 7}" y2="${totalDimLineY - 7}" stroke="currentColor" stroke-width="3" opacity="0.9" stroke-linecap="round" />
      <line x1="${endX - 7}" y1="${totalDimLineY + 7}" x2="${endX + 7}" y2="${totalDimLineY - 7}" stroke="currentColor" stroke-width="3" opacity="0.9" stroke-linecap="round" />

      <!-- Prominent Overall Total Badge -->
      <rect x="${midTotal - 230}" y="${totalDimLineY - 18}" width="460" height="36" rx="6" fill="#0f172a" stroke="var(--accent-primary, #4989D9)" stroke-width="2" />
      <text x="${midTotal}" y="${totalDimLineY + 5}" font-family="var(--font-mono, monospace)" font-size="13" font-weight="900" fill="#38bdf8" text-anchor="middle">
        TOTAL: ${calculatedChain.overallExtentFormatted} (Drawing @ 1:${calculatedChain.scaleRatio}: ${calculatedChain.drawingOverallFormatted})
      </text>
    `);
  }

  // 8. Comprehensive Architectural Run Breakdown Footer Strip
  svgElements.push(`
    <g class="chain-footer-summary">
      <rect x="${padLeft - 10}" y="${footerY - 16}" width="${usableWidth + 20}" height="32" rx="6" fill="rgba(30, 41, 59, 0.65)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
      <text x="${padLeft + 15}" y="${footerY + 5}" font-family="var(--font-mono, monospace)" font-size="11" font-weight="700" fill="#94a3b8">
        📊 CHAIN SUMMARY: <tspan fill="#f8fafc" font-weight="800">${calculatedChain.segmentCount} Segments</tspan> · <tspan fill="#38bdf8" font-weight="800">Total Run: ${calculatedChain.overallExtentFormatted}</tspan> · <tspan fill="#a78bfa" font-weight="800">Drawing Sheet: ${calculatedChain.drawingOverallFormatted}</tspan> · <tspan fill="#34d399">Scale 1:${calculatedChain.scaleRatio}</tspan>
      </text>
    </g>
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
