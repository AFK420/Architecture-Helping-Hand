/**
 * Architecture Helping Hand - Batch CAD Conversion Engine
 * Phase 2.5: Daily Architect Toolkit — Part 7: Batch CAD Conversion
 *
 * Deterministic bulk dimension parsing, multi-format input extraction,
 * canonical normalization, transformation orchestration (Real↔Drawing,
 * Scale↔Scale, Unit↔Unit), non-destructive retention, and CAD/Workspace handoffs.
 * Zero-DOM, pure mathematical module.
 */

import { UNITS, requireUnit } from './units.js';
import { parseInput } from './parser.js';
import { isExpressionLike, evaluateExpression } from './dimension-expression.js';
import { scaleDimension, requireFiniteNumber } from './calculator.js';
import { formatNumber, formatFeetInches } from './formatter.js';
import { formatCadValue, escapeTSV, escapeCSV } from './cad-clipboard.js';
import { createDimensionEntry, createGroup } from './dimension-workspace.js';
import { createDimensionChain, createChainSegment } from './dimension-chains.js';

export const BATCH_STORAGE_KEY = 'archi_batch_cad_state';

/**
 * Standard Batch Conversion Presets
 */
export const BATCH_PRESETS = Object.freeze({
  real_to_1_50_mm: Object.freeze({
    id: 'real_to_1_50_mm',
    name: 'Real ➔ 1:50 (mm)',
    description: 'Convert real-world millimeters to drawing paper millimeters at 1:50 scale',
    mode: 'real_to_drawing',
    sourceUnit: 'mm',
    sourceScale: 1,
    targetUnit: 'mm',
    targetScale: 50,
    precision: 2
  }),
  real_to_1_100_mm: Object.freeze({
    id: 'real_to_1_100_mm',
    name: 'Real ➔ 1:100 (mm)',
    description: 'Convert real-world millimeters to drawing paper millimeters at 1:100 scale',
    mode: 'real_to_drawing',
    sourceUnit: 'mm',
    sourceScale: 1,
    targetUnit: 'mm',
    targetScale: 100,
    precision: 2
  }),
  scale_1_50_to_1_100: Object.freeze({
    id: 'scale_1_50_to_1_100',
    name: '1:50 ➔ 1:100 (Scale)',
    description: 'Rescale drawing dimensions from 1:50 floor plan to 1:100 arrangement',
    mode: 'scale_to_scale',
    sourceUnit: 'mm',
    sourceScale: 50,
    targetUnit: 'mm',
    targetScale: 100,
    precision: 2
  }),
  mm_to_m: Object.freeze({
    id: 'mm_to_m',
    name: 'mm ➔ m (Unit)',
    description: 'Convert millimeters to meters (real-world site dimensions)',
    mode: 'unit_to_unit',
    sourceUnit: 'mm',
    sourceScale: 1,
    targetUnit: 'm',
    targetScale: 1,
    precision: 3
  }),
  m_to_mm: Object.freeze({
    id: 'm_to_mm',
    name: 'm ➔ mm (Unit)',
    description: 'Convert meters to millimeters',
    mode: 'unit_to_unit',
    sourceUnit: 'm',
    sourceScale: 1,
    targetUnit: 'mm',
    targetScale: 1,
    precision: 0
  }),
  in_to_ft_in: Object.freeze({
    id: 'in_to_ft_in',
    name: 'in ➔ ft-in (Unit)',
    description: 'Convert fractional or decimal inches to architectural feet-inches',
    mode: 'unit_to_unit',
    sourceUnit: 'in',
    sourceScale: 1,
    targetUnit: 'ft-in',
    targetScale: 1,
    precision: 2
  })
});

/**
 * Deterministically detects the delimiter used in a raw pasted text block.
 * @param {string} rawText - Raw pasted text
 * @returns {'newline' | 'tab' | 'comma' | 'semicolon'} Detected delimiter
 */
export function detectBatchDelimiter(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'newline';

  const text = rawText.trim();
  if (!text) return 'newline';

  const newlineCount = (text.match(/\r?\n/g) || []).length;
  const tabCount = (text.match(/\t/g) || []).length;
  const semicolonCount = (text.match(/;/g) || []).length;

  // In architectural CAD, dots are decimal points (e.g. 2.4).
  // Comma is a delimiter if it's separating numbers and not followed by non-numbers.
  const commaCount = (text.match(/,/g) || []).length;

  if (tabCount > 0 && tabCount >= newlineCount) {
    return 'tab';
  }

  if (newlineCount > 0 && tabCount === 0 && (commaCount === 0 || newlineCount >= commaCount)) {
    return 'newline';
  }

  if (commaCount > 0 && newlineCount === 0) {
    return 'comma';
  }

  if (semicolonCount > 0 && newlineCount === 0) {
    return 'semicolon';
  }

  return 'newline';
}

/**
 * Parses a single raw row/line into a structured batch row item.
 * @param {string} rawLine - Single line or token
 * @param {number} index - Row index (0-based)
 * @param {Object} [options]
 * @param {string} [options.defaultUnit='mm']
 * @param {number} [options.defaultScale=50]
 * @param {string} [options.defaultSemanticRole='reference']
 * @returns {Object} Structured batch row item
 */
export function parseBatchRow(rawLine, index = 0, options = {}) {
  const {
    defaultUnit = 'mm',
    defaultScale = 50,
    defaultSemanticRole = 'reference'
  } = options;

  const raw = typeof rawLine === 'string' ? rawLine.trim() : String(rawLine || '').trim();
  const id = `batch-row-${index + 1}-${Math.random().toString(36).substring(2, 7)}`;
  const defaultName = `Dimension ${index + 1}`;

  if (!raw) {
    return {
      id,
      index: index + 1,
      name: defaultName,
      originalText: '',
      parsedValue: 0,
      sourceUnit: defaultUnit,
      canonicalMeters: 0,
      semanticRole: defaultSemanticRole,
      isExpression: false,
      valid: false,
      error: 'Empty input row'
    };
  }

  let textToParse = raw;
  let extractedName = null;
  let semanticRole = defaultSemanticRole;

  // 1. Check for explicit semantic role tags: [SEG], [REF], [ALW] or prefixes SEG:, REF:, ALW:
  const rolePrefixMatch = textToParse.match(/^\[?(SEG|REF|ALW)\]?[:\s\-]+(.+)$/i);
  if (rolePrefixMatch) {
    const roleTag = rolePrefixMatch[1].toUpperCase();
    if (roleTag === 'SEG') semanticRole = 'segment';
    else if (roleTag === 'ALW') semanticRole = 'allowance';
    else semanticRole = 'reference';
    textToParse = rolePrefixMatch[2].trim();
  }

  // 2. Extract optional row name
  // Pattern A: "Wall A = 4800" or "Door 1: 900"
  const nameSeparatorMatch = textToParse.match(/^([^=:\t]+?)\s*[=:]\s*(.+)$/);
  if (nameSeparatorMatch && isNaN(Number(nameSeparatorMatch[1].trim()))) {
    extractedName = nameSeparatorMatch[1].trim();
    textToParse = nameSeparatorMatch[2].trim();
  } else {
    // Pattern B: Tab-separated e.g. "Wall A\t4800"
    const tabParts = textToParse.split('\t');
    if (tabParts.length >= 2 && tabParts[0].trim() && tabParts[1].trim()) {
      extractedName = tabParts[0].trim();
      textToParse = tabParts.slice(1).join(' ').trim();
    } else if (!isExpressionLike(textToParse)) {
      // Pattern C: If the whole string is NOT directly a valid measurement (like "7' 6"" or "3 1/2in"):
      const directParse = parseInput(textToParse, { allowNegative: true });
      if (!directParse.isValid) {
        // Try space-separated name + measurement e.g. "Wall A 4800mm"
        const spaceParts = textToParse.split(/\s+/);
        if (spaceParts.length >= 2) {
          const lastToken = spaceParts[spaceParts.length - 1];
          const testParse = parseInput(lastToken, { allowNegative: true });
          if (testParse.isValid) {
            const potentialName = spaceParts.slice(0, spaceParts.length - 1).join(' ');
            if (potentialName && isNaN(Number(potentialName))) {
              extractedName = potentialName;
              textToParse = lastToken;
            }
          }
        }
      }
    }
  }

  // 3. Check for trailing role tag e.g. "4800 SEG"
  const trailingRoleMatch = textToParse.match(/^(.+?)\s+\[?(SEG|REF|ALW)\]?$/i);
  if (trailingRoleMatch) {
    const roleTag = trailingRoleMatch[2].toUpperCase();
    if (roleTag === 'SEG') semanticRole = 'segment';
    else if (roleTag === 'ALW') semanticRole = 'allowance';
    else semanticRole = 'reference';
    textToParse = trailingRoleMatch[1].trim();
  }

  const finalName = extractedName || defaultName;

  // 4. Parse Measurement / Math Expression
  const isExpr = isExpressionLike(textToParse);

  if (isExpr) {
    try {
      const exprRes = evaluateExpression(textToParse, {
        defaultUnit: defaultUnit,
        scaleRatio: defaultScale
      });

      if (!exprRes.isValid) {
        return {
          id,
          index: index + 1,
          name: finalName,
          originalText: raw,
          parsedValue: 0,
          sourceUnit: defaultUnit,
          canonicalMeters: 0,
          semanticRole,
          isExpression: true,
          valid: false,
          error: exprRes.error || 'Expression could not be evaluated'
        };
      }

      const canonicalMeters = exprRes.canonicalMeters !== null && exprRes.canonicalMeters !== undefined
        ? exprRes.canonicalMeters
        : (exprRes.value * (UNITS[defaultUnit]?.toMeters || 0.001));
      const detectedUnit = (exprRes.displayUnit && exprRes.displayUnit !== 'scalar') ? exprRes.displayUnit : defaultUnit;
      const unitDef = UNITS[detectedUnit] || UNITS.mm;
      const parsedValue = canonicalMeters / unitDef.toMeters;

      return {
        id,
        index: index + 1,
        name: finalName,
        originalText: raw,
        parsedValue: parsedValue,
        sourceUnit: detectedUnit,
        canonicalMeters: canonicalMeters,
        semanticRole,
        isExpression: true,
        valid: true,
        error: null
      };
    } catch (err) {
      return {
        id,
        index: index + 1,
        name: finalName,
        originalText: raw,
        parsedValue: 0,
        sourceUnit: defaultUnit,
        canonicalMeters: 0,
        semanticRole,
        isExpression: true,
        valid: false,
        error: err.message || 'Expression evaluation error'
      };
    }
  }

  // Standard Dimension Parsing
  const parseRes = parseInput(textToParse, { allowNegative: true });

  if (!parseRes.isValid) {
    return {
      id,
      index: index + 1,
      name: finalName,
      originalText: raw,
      parsedValue: 0,
      sourceUnit: defaultUnit,
      canonicalMeters: 0,
      semanticRole,
      isExpression: false,
      valid: false,
      error: parseRes.error || 'Invalid dimension format'
    };
  }

  const unitKey = parseRes.detectedUnit || defaultUnit;
  const unitDef = requireUnit(unitKey, 'length');
  const canonicalMeters = parseRes.value * unitDef.toMeters;

  return {
    id,
    index: index + 1,
    name: finalName,
    originalText: raw,
    parsedValue: parseRes.value,
    sourceUnit: unitKey,
    canonicalMeters: canonicalMeters,
    semanticRole,
    isExpression: false,
    valid: true,
    error: null
  };
}

/**
 * Splits and parses raw batch text into a list of structured row items.
 * @param {string} rawText - Raw input text
 * @param {Object} [options]
 * @param {'auto'|'newline'|'comma'|'tab'|'semicolon'} [options.delimiter='auto']
 * @param {string} [options.defaultUnit='mm']
 * @param {number} [options.defaultScale=50]
 * @param {string} [options.defaultSemanticRole='reference']
 * @returns {Object} { delimiter, rows: Array<Object> }
 */
export function parseBatchInput(rawText, options = {}) {
  const {
    delimiter = 'auto',
    defaultUnit = 'mm',
    defaultScale = 50,
    defaultSemanticRole = 'reference'
  } = options;

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      delimiter: delimiter === 'auto' ? 'newline' : delimiter,
      rows: []
    };
  }

  const detectedDelim = delimiter === 'auto' ? detectBatchDelimiter(rawText) : delimiter;
  let lines = [];

  if (detectedDelim === 'newline') {
    lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  } else if (detectedDelim === 'comma') {
    // Split by commas, handling potential whitespace
    lines = rawText.split(',').map(l => l.trim()).filter(l => l.length > 0);
  } else if (detectedDelim === 'semicolon') {
    lines = rawText.split(';').map(l => l.trim()).filter(l => l.length > 0);
  } else if (detectedDelim === 'tab') {
    // If multiline with tabs, split by line first, then tokens
    const rawLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length > 1) {
      lines = rawLines;
    } else {
      lines = rawText.split('\t').map(l => l.trim()).filter(l => l.length > 0);
    }
  } else {
    lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  }

  const rows = lines.map((line, idx) => parseBatchRow(line, idx, {
    defaultUnit,
    defaultScale,
    defaultSemanticRole
  }));

  return {
    delimiter: detectedDelim,
    rows
  };
}

/**
 * Converts a single parsed batch row according to configuration parameters.
 * @param {Object} row - Parsed batch row item
 * @param {Object} config - Conversion configuration
 * @returns {Object} Converted row item
 */
export function convertBatchRow(row, config = {}) {
  const {
    mode = 'real_to_drawing',
    sourceUnit = 'mm',
    sourceScale = 1,
    targetUnit = 'mm',
    targetScale = 50,
    precision = 2
  } = config;

  if (!row.valid) {
    return {
      ...row,
      targetValue: null,
      targetCanonicalMeters: null,
      sourceFormatted: row.originalText || '—',
      targetFormatted: '—',
      status: 'INVALID'
    };
  }

  let targetValue = 0;
  let targetCanonicalMeters = 0;
  const targetUnitDef = requireUnit(targetUnit === 'ft-in' ? 'ft' : targetUnit, 'length');

  if (mode === 'real_to_drawing') {
    const scaleRatio = requireFiniteNumber(targetScale, 'targetScale') || 50;
    targetCanonicalMeters = row.canonicalMeters / scaleRatio;
    targetValue = targetCanonicalMeters / targetUnitDef.toMeters;
  } else if (mode === 'drawing_to_real') {
    const scaleRatio = requireFiniteNumber(sourceScale, 'sourceScale') || 50;
    targetCanonicalMeters = row.canonicalMeters * scaleRatio;
    targetValue = targetCanonicalMeters / targetUnitDef.toMeters;
  } else if (mode === 'unit_to_unit') {
    targetCanonicalMeters = row.canonicalMeters;
    targetValue = row.canonicalMeters / targetUnitDef.toMeters;
  } else if (mode === 'scale_to_scale') {
    const srcRatio = requireFiniteNumber(sourceScale, 'sourceScale') || 50;
    const tgtRatio = requireFiniteNumber(targetScale, 'targetScale') || 100;
    const realMeters = row.canonicalMeters * srcRatio;
    targetCanonicalMeters = realMeters / tgtRatio;
    targetValue = targetCanonicalMeters / targetUnitDef.toMeters;
  } else {
    targetCanonicalMeters = row.canonicalMeters;
    targetValue = row.canonicalMeters / targetUnitDef.toMeters;
  }

  // Format Source String
  let sourceFormatted = '';
  if (row.sourceUnit === 'ft-in') {
    sourceFormatted = formatFeetInches(row.canonicalMeters / 0.0254);
  } else {
    sourceFormatted = formatCadValue(row.canonicalMeters, { unit: row.sourceUnit, precision, suffix: 'symbol' });
  }

  // Format Target String
  let targetFormatted = '';
  if (targetUnit === 'ft-in') {
    targetFormatted = formatFeetInches(targetCanonicalMeters / 0.0254);
  } else {
    targetFormatted = formatCadValue(targetCanonicalMeters, { unit: targetUnit, precision, suffix: 'symbol' });
  }

  const isUnchanged = (Math.abs(row.parsedValue - targetValue) < 1e-9) &&
                      (row.sourceUnit === targetUnit) &&
                      (sourceScale === targetScale);

  return {
    ...row,
    targetValue,
    targetCanonicalMeters,
    sourceFormatted,
    targetFormatted,
    status: isUnchanged ? 'UNCHANGED' : 'CONVERTED'
  };
}

/**
 * Transforms an array of batch rows according to configuration.
 * @param {Array<Object>} rows - Array of parsed batch rows
 * @param {Object} config - Conversion configuration
 * @returns {Object} Structured batch calculation result
 */
export function convertBatch(rows, config = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const convertedRows = safeRows.map(row => convertBatchRow(row, config));

  let validCount = 0;
  let invalidCount = 0;
  let convertedCount = 0;
  let unchangedCount = 0;
  let totalCanonicalMeters = 0;
  let totalTargetValue = 0;

  for (const row of convertedRows) {
    if (row.valid) {
      validCount++;
      totalCanonicalMeters += row.canonicalMeters;
      if (typeof row.targetValue === 'number' && !isNaN(row.targetValue)) {
        totalTargetValue += row.targetValue;
      }
      if (row.status === 'CONVERTED') convertedCount++;
      else if (row.status === 'UNCHANGED') unchangedCount++;
    } else {
      invalidCount++;
    }
  }

  return {
    config: { ...config },
    rows: convertedRows,
    summary: {
      totalRows: convertedRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      convertedRows: convertedCount,
      unchangedRows: unchangedCount,
      totalCanonicalMeters,
      totalTargetValue
    }
  };
}

/**
 * Non-destructively filters rows based on criteria.
 * @param {Array<Object>} rows - Converted batch rows
 * @param {string} filterKey - 'all' | 'valid' | 'invalid' | 'selected' | 'seg' | 'ref' | 'alw'
 * @param {Set<string>} [selectedIds=new Set()] - Set of selected row IDs
 * @returns {Array<Object>} Filtered rows
 */
export function filterBatchRows(rows, filterKey = 'all', selectedIds = new Set()) {
  if (!Array.isArray(rows)) return [];

  switch (filterKey) {
    case 'valid':
      return rows.filter(r => r.valid);
    case 'invalid':
      return rows.filter(r => !r.valid);
    case 'selected':
      return rows.filter(r => selectedIds.has(r.id));
    case 'seg':
      return rows.filter(r => r.semanticRole === 'segment');
    case 'ref':
      return rows.filter(r => r.semanticRole === 'reference');
    case 'alw':
      return rows.filter(r => r.semanticRole === 'allowance');
    case 'all':
    default:
      return rows;
  }
}

/**
 * Formats batch conversion results for clipboard or export.
 * @param {Object} batchResult - Converted batch result
 * @param {Object} [options]
 * @param {'results_only'|'raw_numbers'|'names_and_results'|'tsv_schedule'|'csv_schedule'|'cad_preset'} [options.format='results_only']
 * @param {boolean} [options.selectedOnly=false]
 * @param {Set<string>} [options.selectedIds=null]
 * @param {string} [options.cadPreset='generic']
 * @returns {string} Formatted string
 */
export function formatBatchResults(batchResult, options = {}) {
  if (!batchResult || !Array.isArray(batchResult.rows)) return '';

  const {
    format = 'results_only',
    selectedOnly = false,
    selectedIds = new Set(),
    cadPreset = 'generic'
  } = options;

  let targetRows = batchResult.rows;
  if (selectedOnly && selectedIds && selectedIds.size > 0) {
    targetRows = targetRows.filter(r => selectedIds.has(r.id));
  }

  // Filter out invalid rows for clean numerical formats
  const validRows = targetRows.filter(r => r.valid);

  if (format === 'raw_numbers') {
    return validRows
      .map(r => formatCadValue(r.targetCanonicalMeters, {
        unit: batchResult.config?.targetUnit || 'mm',
        precision: batchResult.config?.precision || 2,
        suffix: 'none'
      }))
      .join(' ');
  }

  if (format === 'results_only') {
    return validRows
      .map(r => formatCadValue(r.targetCanonicalMeters, {
        unit: batchResult.config?.targetUnit || 'mm',
        precision: batchResult.config?.precision || 2,
        suffix: 'symbol'
      }))
      .join('\n');
  }

  if (format === 'names_and_results') {
    return validRows
      .map(r => `${r.name}: ${r.targetFormatted}`)
      .join('\n');
  }

  if (format === 'tsv_schedule') {
    const headers = ['#', 'Name', 'Type', 'Input Value', 'Converted Result', 'Status'];
    const lines = [headers.join('\t')];
    for (const r of targetRows) {
      const typeTag = r.semanticRole === 'segment' ? 'SEG' : (r.semanticRole === 'allowance' ? 'ALW' : 'REF');
      lines.push([
        escapeTSV(r.index),
        escapeTSV(r.name),
        escapeTSV(typeTag),
        escapeTSV(r.sourceFormatted),
        escapeTSV(r.targetFormatted),
        escapeTSV(r.status)
      ].join('\t'));
    }
    return lines.join('\n');
  }

  if (format === 'csv_schedule') {
    const headers = ['#', 'Name', 'Type', 'Input Value', 'Converted Result', 'Status'];
    const lines = [headers.map(escapeCSV).join(',')];
    for (const r of targetRows) {
      const typeTag = r.semanticRole === 'segment' ? 'SEG' : (r.semanticRole === 'allowance' ? 'ALW' : 'REF');
      lines.push([
        escapeCSV(r.index),
        escapeCSV(r.name),
        escapeCSV(typeTag),
        escapeCSV(r.sourceFormatted),
        escapeCSV(r.targetFormatted),
        escapeCSV(r.status)
      ].join(','));
    }
    return lines.join('\n');
  }

  if (format === 'cad_preset') {
    const meterVals = validRows.map(r => r.targetCanonicalMeters);
    return meterVals
      .map(m => formatCadValue(m, {
        unit: batchResult.config?.targetUnit || 'mm',
        precision: batchResult.config?.precision || 2,
        suffix: 'none'
      }))
      .join(' ');
  }

  return validRows.map(r => r.targetFormatted).join('\n');
}

/**
 * Prepares a Dimension Workspace Group payload from batch rows.
 * @param {Object} batchResult - Converted batch result
 * @param {Object} [options]
 * @param {string} [options.groupName='Batch CAD Conversion']
 * @param {boolean} [options.selectedOnly=false]
 * @param {Set<string>} [options.selectedIds=null]
 * @returns {Object} { group, entries: Array<Object> }
 */
export function convertBatchToWorkspaceGroup(batchResult, options = {}) {
  if (!batchResult || !Array.isArray(batchResult.rows)) {
    return { group: null, entries: [] };
  }

  const {
    groupName = 'Batch CAD Conversion',
    selectedOnly = false,
    selectedIds = new Set()
  } = options;

  let targetRows = batchResult.rows.filter(r => r.valid);
  if (selectedOnly && selectedIds && selectedIds.size > 0) {
    targetRows = targetRows.filter(r => selectedIds.has(r.id));
  }

  const group = createGroup(groupName);
  const targetUnit = batchResult.config?.targetUnit || 'mm';

  const entries = targetRows.map(r => {
    return createDimensionEntry({
      name: r.name,
      rawInput: `${r.targetValue} ${targetUnit === 'ft-in' ? 'ft' : targetUnit}`,
      dimensionType: r.semanticRole || 'reference',
      groupId: group.id,
      notes: `Batch converted from ${r.sourceFormatted}`
    }, targetUnit === 'ft-in' ? 'ft' : targetUnit);
  });

  return { group, entries };
}

/**
 * Prepares a Dimension Chain structure from ordered batch rows.
 * @param {Object} batchResult - Converted batch result
 * @param {Object} [options]
 * @param {string} [options.chainName='Batch Dimension Chain']
 * @param {boolean} [options.selectedOnly=false]
 * @param {Set<string>} [options.selectedIds=null]
 * @returns {Object} Dimension Chain object
 */
export function convertBatchToDimensionChain(batchResult, options = {}) {
  if (!batchResult || !Array.isArray(batchResult.rows)) {
    return createDimensionChain();
  }

  const {
    chainName = 'Batch Dimension Chain',
    selectedOnly = false,
    selectedIds = new Set()
  } = options;

  let targetRows = batchResult.rows.filter(r => r.valid);
  if (selectedOnly && selectedIds && selectedIds.size > 0) {
    targetRows = targetRows.filter(r => selectedIds.has(r.id));
  }

  const targetUnit = batchResult.config?.targetUnit || 'mm';
  const scaleRatio = batchResult.config?.targetScale || 50;

  const segments = targetRows.map((r, idx) => {
    return createChainSegment({
      name: r.name,
      measurement: `${r.targetValue} ${targetUnit === 'ft-in' ? 'ft' : targetUnit}`,
      role: r.semanticRole || 'reference'
    }, targetUnit === 'ft-in' ? 'ft' : targetUnit);
  });

  return createDimensionChain({
    name: chainName,
    defaultUnit: targetUnit === 'ft-in' ? 'ft' : targetUnit,
    scaleRatio: scaleRatio,
    segments
  });
}
