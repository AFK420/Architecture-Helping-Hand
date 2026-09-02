/**
 * Architecture Helping Hand - CAD Clipboard & Drafting Handoff Engine
 * Pure, deterministic, zero-DOM formatting module for copying normalized
 * dimension data, continuous chains, and schedules into AutoCAD, Rhino,
 * SketchUp, Revit, spreadsheets, and CAD command prompts.
 */

import { UNITS } from './units.js';
import { formatNumber, formatFeetInches } from './formatter.js';

export const CAD_STORAGE_KEY = 'archiscale_cad_clipboard_settings';

/**
 * Standard CAD Application Formatting Presets
 */
export const CAD_FORMAT_PRESETS = Object.freeze({
  generic: {
    id: 'generic',
    name: 'Generic CAD',
    description: 'Clean space or newline-separated numbers with dot decimal separator, no prose or emojis.',
    defaultUnit: 'mm',
    defaultPrecision: 2,
    defaultSuffix: 'none',
    defaultDelimiter: 'space',
    targetValue: 'real'
  },
  autocad: {
    id: 'autocad',
    name: 'AutoCAD-style',
    description: 'Direct command-line and prompt values formatted for AutoCAD drafting inputs.',
    defaultUnit: 'mm',
    defaultPrecision: 2,
    defaultSuffix: 'none',
    defaultDelimiter: 'space',
    targetValue: 'real'
  },
  rhino: {
    id: 'rhino',
    name: 'Rhino-style',
    description: 'Clean numerical inputs formatted for Rhino command prompts and curve lengths.',
    defaultUnit: 'mm',
    defaultPrecision: 3,
    defaultSuffix: 'none',
    defaultDelimiter: 'space',
    targetValue: 'real'
  },
  sketchup: {
    id: 'sketchup',
    name: 'SketchUp-style',
    description: 'Values formatted with unit identifiers suitable for SketchUp Value Control Box (VCB).',
    defaultUnit: 'mm',
    defaultPrecision: 1,
    defaultSuffix: 'symbol',
    defaultDelimiter: 'space',
    targetValue: 'real'
  },
  spreadsheet: {
    id: 'spreadsheet',
    name: 'Spreadsheet (TSV)',
    description: 'Tab-separated schedule table with clean column headers for Excel, Google Sheets, and LibreOffice.',
    defaultUnit: 'mm',
    defaultPrecision: 2,
    defaultSuffix: 'none',
    defaultDelimiter: 'tsv',
    targetValue: 'real'
  },
  csv: {
    id: 'csv',
    name: 'CSV Schedule',
    description: 'Comma-separated values with RFC-4180 standard escaping for CAD tables and BIM schedules.',
    defaultUnit: 'mm',
    defaultPrecision: 2,
    defaultSuffix: 'none',
    defaultDelimiter: 'csv',
    targetValue: 'real'
  },
  plaintext: {
    id: 'plaintext',
    name: 'Plain Text Notes',
    description: 'Readable list with dimension labels and formatted units for general architectural notes.',
    defaultUnit: 'mm',
    defaultPrecision: 2,
    defaultSuffix: 'symbol',
    defaultDelimiter: 'newline',
    targetValue: 'real'
  }
});

/**
 * Escapes a string for safe inclusion in Tab-Separated Values (TSV).
 * Strips tab characters and converts newlines to spaces to prevent row breaks.
 * @param {*} val 
 * @returns {string}
 */
export function escapeTSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

/**
 * Escapes a string for RFC-4180 compliant Comma-Separated Values (CSV).
 * Encloses field in double quotes if it contains commas, quotes, or newlines.
 * @param {*} val 
 * @returns {string}
 */
export function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a single numerical value (in canonical meters) into a CAD-compliant string.
 * Ensures dot (.) decimal separator, handles negative values and 0 correctly.
 * 
 * @param {number} meters - The canonical length in meters
 * @param {Object} options
 * @param {string} [options.unit='mm'] - Output unit: 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'ft-in'
 * @param {number} [options.precision=2] - Decimal precision (0 to 4)
 * @param {string} [options.suffix='none'] - Suffix mode: 'none' | 'symbol' | 'full'
 * @param {number} [options.scaleRatio=null] - If provided and targetValue is 'drawing', scale is applied
 * @returns {string}
 */
export function formatCadValue(meters, options = {}) {
  if (typeof meters !== 'number' || isNaN(meters) || !isFinite(meters)) {
    return '0';
  }

  const unit = options.unit || 'mm';
  const precision = typeof options.precision === 'number' ? Math.max(0, Math.min(4, options.precision)) : 2;
  const suffix = options.suffix || 'none';

  // Feet-inches special formatting
  if (unit === 'ft-in') {
    const formattedFeetInches = formatFeetInches(meters, precision);
    if (suffix === 'none') {
      // Return unadorned feet-inches format e.g. "7'-6 1/2""
      return formattedFeetInches;
    }
    return formattedFeetInches;
  }

  const unitDef = UNITS[unit] || UNITS.mm;
  const convertedValue = meters / unitDef.toMeters;

  // Format to exact decimal precision with standard dot decimal point
  const fixedStr = convertedValue.toFixed(precision);

  // Strip trailing zeros if precision > 0 when using generic CAD or if requested
  let cleanNumberStr = fixedStr;
  if (options.stripTrailingZeros && precision > 0 && cleanNumberStr.includes('.')) {
    cleanNumberStr = cleanNumberStr.replace(/\.?0+$/, '');
  }

  // Handle unit suffix
  if (suffix === 'symbol') {
    return `${cleanNumberStr} ${unitDef.symbol}`;
  } else if (suffix === 'full') {
    return `${cleanNumberStr} ${unitDef.name}`;
  }

  return cleanNumberStr;
}

/**
 * Formats an array of canonical meter values into a formatted CAD string with chosen delimiter.
 * 
 * @param {Array<number>} meterValues 
 * @param {Object} options 
 * @returns {string}
 */
export function formatCadValues(meterValues, options = {}) {
  if (!Array.isArray(meterValues) || meterValues.length === 0) {
    return '';
  }

  const formattedItems = meterValues.map(m => formatCadValue(m, options));
  const delimiter = options.delimiter || 'space';

  if (delimiter === 'newline') {
    return formattedItems.join('\n');
  } else if (delimiter === 'comma') {
    return formattedItems.join(', ');
  } else if (delimiter === 'tsv') {
    return formattedItems.join('\t');
  } else if (delimiter === 'pipe') {
    return formattedItems.join(' | ');
  }

  return formattedItems.join(' ');
}

/**
 * Formats a Dimension Workspace collection for CAD clipboard export.
 * 
 * @param {Object} workspace - The dimension workspace object { entries: [...], groups: [...], scaleRatio, displayUnit }
 * @param {Object} options
 * @param {string} [options.filterScope='all'] - 'all' | 'selected' | 'segments' | 'references' | 'allowances'
 * @param {Set<string>} [options.selectedIds=null] - Selected entry IDs
 * @param {string} [options.targetValue='real'] - 'real' | 'drawing'
 * @param {string} [options.format='generic'] - 'generic' | 'autocad' | 'rhino' | 'sketchup' | 'spreadsheet' | 'csv' | 'plaintext'
 * @param {string} [options.unit='mm'] - Target unit
 * @param {number} [options.precision=2] - Decimal precision
 * @param {string} [options.suffix='none'] - Suffix mode
 * @param {string} [options.delimiter='space'] - Delimiter for linear modes
 * @returns {{ text: string, count: number, totalRealMeters: number, totalDrawingMeters: number }}
 */
export function formatCadWorkspace(workspace, options = {}) {
  if (!workspace || !Array.isArray(workspace.entries)) {
    return { text: '', count: 0, totalRealMeters: 0, totalDrawingMeters: 0 };
  }

  const scaleRatio = typeof options.scaleRatio === 'number' && options.scaleRatio > 0
    ? options.scaleRatio
    : (workspace.scaleRatio || 50);

  const filterScope = options.filterScope || 'all';
  const selectedIds = options.selectedIds instanceof Set ? options.selectedIds : new Set();
  const targetValue = options.targetValue || 'real';
  const format = options.format || 'generic';
  const unit = options.unit || workspace.displayUnit || 'mm';
  const precision = typeof options.precision === 'number' ? options.precision : 2;
  const suffix = options.suffix || 'none';
  const delimiter = options.delimiter || (format === 'spreadsheet' ? 'tsv' : (format === 'csv' ? 'csv' : (format === 'plaintext' ? 'newline' : 'space')));

  // Filter entries based on scope
  const filteredEntries = workspace.entries.filter(entry => {
    if (entry.enabled === false) return false;

    if (filterScope === 'selected') {
      return selectedIds.has(entry.id);
    }
    if (filterScope === 'segments') {
      return entry.dimensionType === 'segment' || !entry.dimensionType;
    }
    if (filterScope === 'references') {
      return entry.dimensionType === 'reference';
    }
    if (filterScope === 'allowances') {
      return entry.dimensionType === 'allowance';
    }
    return true;
  });

  if (filteredEntries.length === 0) {
    return { text: '', count: 0, totalRealMeters: 0, totalDrawingMeters: 0 };
  }

  let totalRealMeters = 0;
  let totalDrawingMeters = 0;

  filteredEntries.forEach(e => {
    const realMeters = typeof e.realMeters === 'number' && isFinite(e.realMeters) ? e.realMeters : 0;
    if (e.dimensionType !== 'reference') {
      totalRealMeters += realMeters;
      totalDrawingMeters += realMeters / scaleRatio;
    }
  });

  // Table Schedule Format (Spreadsheet TSV or CSV)
  if (format === 'spreadsheet' || delimiter === 'tsv') {
    const header = ['#', 'Name', `Real (${unit})`, `Drawing @ 1:${scaleRatio} (${unit})`, 'Type', 'Notes'].join('\t');
    const rows = filteredEntries.map((entry, idx) => {
      const realM = typeof entry.realMeters === 'number' ? entry.realMeters : 0;
      const drawM = realM / scaleRatio;
      const realStr = formatCadValue(realM, { unit, precision, suffix: 'none' });
      const drawStr = formatCadValue(drawM, { unit, precision, suffix: 'none' });
      const roleStr = (entry.dimensionType || 'segment').toUpperCase();
      return [
        idx + 1,
        escapeTSV(entry.name || `Dimension ${idx + 1}`),
        realStr,
        drawStr,
        roleStr,
        escapeTSV(entry.notes || '')
      ].join('\t');
    });
    return {
      text: [header, ...rows].join('\n'),
      count: filteredEntries.length,
      totalRealMeters,
      totalDrawingMeters
    };
  }

  if (format === 'csv' || delimiter === 'csv') {
    const header = ['#', 'Name', `Real (${unit})`, `Drawing @ 1:${scaleRatio} (${unit})`, 'Type', 'Notes'].map(escapeCSV).join(',');
    const rows = filteredEntries.map((entry, idx) => {
      const realM = typeof entry.realMeters === 'number' ? entry.realMeters : 0;
      const drawM = realM / scaleRatio;
      const realStr = formatCadValue(realM, { unit, precision, suffix: 'none' });
      const drawStr = formatCadValue(drawM, { unit, precision, suffix: 'none' });
      const roleStr = (entry.dimensionType || 'segment').toUpperCase();
      return [
        idx + 1,
        escapeCSV(entry.name || `Dimension ${idx + 1}`),
        escapeCSV(realStr),
        escapeCSV(drawStr),
        escapeCSV(roleStr),
        escapeCSV(entry.notes || '')
      ].join(',');
    });
    return {
      text: [header, ...rows].join('\n'),
      count: filteredEntries.length,
      totalRealMeters,
      totalDrawingMeters
    };
  }

  // Plain Text Descriptive List
  if (format === 'plaintext') {
    const rows = filteredEntries.map((entry, idx) => {
      const realM = typeof entry.realMeters === 'number' ? entry.realMeters : 0;
      const valM = targetValue === 'drawing' ? realM / scaleRatio : realM;
      const valStr = formatCadValue(valM, { unit, precision, suffix });
      const roleTag = entry.dimensionType === 'reference' ? ' [REF]' : (entry.dimensionType === 'allowance' ? ' [ALW]' : '');
      return `${idx + 1}. ${entry.name || 'Dimension'}${roleTag}: ${valStr}`;
    });
    return {
      text: rows.join('\n'),
      count: filteredEntries.length,
      totalRealMeters,
      totalDrawingMeters
    };
  }

  // Linear Numbers Mode (Generic / AutoCAD / Rhino / SketchUp)
  const numbers = filteredEntries.map(entry => {
    const realM = typeof entry.realMeters === 'number' ? entry.realMeters : 0;
    const valM = targetValue === 'drawing' ? realM / scaleRatio : realM;
    return formatCadValue(valM, { unit, precision, suffix });
  });

  const text = delimiter === 'newline' ? numbers.join('\n') : (delimiter === 'comma' ? numbers.join(', ') : numbers.join(' '));

  return {
    text,
    count: filteredEntries.length,
    totalRealMeters,
    totalDrawingMeters
  };
}

/**
 * Formats a calculated Dimension Chain for CAD clipboard export.
 * 
 * @param {Object} calculatedChain - Result from calculateChain()
 * @param {Object} options
 * @param {string} [options.chainOutputMode='segments'] - 'segments' | 'cumulative' | 'table' | 'schedule'
 * @param {string} [options.targetValue='real'] - 'real' | 'drawing'
 * @param {string} [options.unit='mm'] - Target unit
 * @param {number} [options.precision=2] - Decimal precision
 * @param {string} [options.suffix='none'] - Suffix mode
 * @param {string} [options.delimiter='space'] - Delimiter
 * @returns {{ text: string, count: number }}
 */
export function formatCadChain(calculatedChain, options = {}) {
  if (!calculatedChain || !Array.isArray(calculatedChain.segments)) {
    return { text: '', count: 0 };
  }

  const chainOutputMode = options.chainOutputMode || 'segments';
  const unit = options.unit || calculatedChain.defaultUnit || 'mm';
  const precision = typeof options.precision === 'number' ? options.precision : 2;
  const suffix = options.suffix || 'none';
  const scaleRatio = calculatedChain.scaleRatio || 50;
  const targetValue = options.targetValue || 'real';
  const delimiter = options.delimiter || 'space';

  const activeSegments = calculatedChain.segments.filter(s => s.enabled !== false && s.isValid !== false);

  if (activeSegments.length === 0) {
    return { text: '', count: 0 };
  }

  // Normalize segment meter fields: calculateChain() emits lengthMeters /
  // drawingLengthMeters, while tests and hand-built chains may use the
  // realMeters / drawingMeters aliases. Accept both, prefer the engine names.
  const segLengthM = s => {
    if (typeof s.lengthMeters === 'number' && isFinite(s.lengthMeters)) return s.lengthMeters;
    if (typeof s.realMeters === 'number' && isFinite(s.realMeters)) return s.realMeters;
    return 0;
  };
  const segDrawingM = s => {
    if (typeof s.drawingLengthMeters === 'number' && isFinite(s.drawingLengthMeters)) return s.drawingLengthMeters;
    if (typeof s.drawingMeters === 'number' && isFinite(s.drawingMeters)) return s.drawingMeters;
    return segLengthM(s) / scaleRatio;
  };

  // 1. Cumulative Running Coordinates (e.g. 0 1200 3000 3900 5400)
  if (chainOutputMode === 'cumulative') {
    const runningCoords = [0];
    let runningMeters = 0;

    activeSegments.forEach(s => {
      if (s.dimensionType !== 'reference') {
        runningMeters += segLengthM(s);
        runningCoords.push(targetValue === 'drawing' ? runningMeters / scaleRatio : runningMeters);
      }
    });

    const formattedCoords = runningCoords.map(m => formatCadValue(m, { unit, precision, suffix }));
    const text = delimiter === 'newline' ? formattedCoords.join('\n') : (delimiter === 'comma' ? formattedCoords.join(', ') : formattedCoords.join(' '));
    return { text, count: formattedCoords.length };
  }

  // 2. Tabular TSV Chain Schedule
  if (chainOutputMode === 'table' || chainOutputMode === 'schedule') {
    const header = ['#', 'Segment Name', `Start (${unit})`, `End (${unit})`, `Length (${unit})`, `Drawing @ 1:${scaleRatio}`, 'Type'].join('\t');
    const rows = activeSegments.map((s, idx) => {
      const lenM = targetValue === 'drawing' ? segLengthM(s) / scaleRatio : segLengthM(s);
      const startM = targetValue === 'drawing' ? s.startMeters / scaleRatio : s.startMeters;
      const endM = targetValue === 'drawing' ? s.endMeters / scaleRatio : s.endMeters;

      const startStr = formatCadValue(startM, { unit, precision, suffix: 'none' });
      const endStr = formatCadValue(endM, { unit, precision, suffix: 'none' });
      const lenStr = formatCadValue(lenM, { unit, precision, suffix: 'none' });
      const drawStr = formatCadValue(segDrawingM(s), { unit, precision, suffix: 'none' });
      const typeStr = (s.dimensionType || 'segment').toUpperCase();

      return [
        idx + 1,
        escapeTSV(s.name || `Segment ${idx + 1}`),
        startStr,
        endStr,
        lenStr,
        drawStr,
        typeStr
      ].join('\t');
    });

    return {
      text: [header, ...rows].join('\n'),
      count: activeSegments.length
    };
  }

  // 3. Segment Lengths (Default)
  const segmentValues = activeSegments.map(s => {
    const valM = targetValue === 'drawing' ? segLengthM(s) / scaleRatio : segLengthM(s);
    return formatCadValue(valM, { unit, precision, suffix });
  });

  const text = delimiter === 'newline' ? segmentValues.join('\n') : (delimiter === 'comma' ? segmentValues.join(', ') : segmentValues.join(' '));
  return { text, count: activeSegments.length };
}

/**
 * Formats a Multi-Scale Comparison evaluation for CAD clipboard export.
 * 
 * @param {Object} calculatedMultiScale - Result from compareAcrossScales()
 * @param {Object} options
 * @returns {{ text: string, count: number }}
 */
export function formatCadMultiScale(calculatedMultiScale, options = {}) {
  // compareAcrossScales() emits its per-scale rows as `.scales`; accept the
  // `.results` alias too so hand-built/mocked results keep working.
  const scaleRows = calculatedMultiScale && Array.isArray(calculatedMultiScale.scales)
    ? calculatedMultiScale.scales
    : (calculatedMultiScale && Array.isArray(calculatedMultiScale.results) ? calculatedMultiScale.results : null);

  if (!scaleRows || scaleRows.length === 0) {
    return { text: '', count: 0 };
  }

  const unit = options.unit || (calculatedMultiScale.input && calculatedMultiScale.input.displayUnit) || 'mm';
  const precision = typeof options.precision === 'number' ? options.precision : 2;
  const suffix = options.suffix || 'none';
  const delimiter = options.delimiter || 'space';
  const format = options.format || 'generic';

  if (format === 'spreadsheet' || delimiter === 'tsv') {
    const header = ['Scale', 'Ratio', `Drawing Length (${unit})`, 'Paper Usable Check'].join('\t');
    const rows = scaleRows.map(r => {
      const drawStr = formatCadValue(r.drawingMeters, { unit, precision, suffix: 'none' });
      const fitsStr = r.fitsPaper === true
        ? `Fits ${r.paperSize || 'paper'}`
        : (r.fitsPaper === false ? 'Exceeds paper' : '—');
      return [
        r.label || `1:${r.ratio}`,
        `1:${r.ratio}`,
        drawStr,
        fitsStr
      ].join('\t');
    });
    return {
      text: [header, ...rows].join('\n'),
      count: scaleRows.length
    };
  }

  const drawingValues = scaleRows.map(r => {
    return formatCadValue(r.drawingMeters, { unit, precision, suffix });
  });

  const text = delimiter === 'newline' ? drawingValues.join('\n') : (delimiter === 'comma' ? drawingValues.join(', ') : drawingValues.join(' '));
  return { text, count: drawingValues.length };
}

/**
 * Formats a Dimension Expression result for CAD clipboard export.
 * 
 * @param {Object} calculatedExpression - Result from evaluateExpressionSafe()
 * @param {Object} options
 * @returns {{ text: string, count: number }}
 */
export function formatCadExpression(calculatedExpression, options = {}) {
  if (!calculatedExpression || !calculatedExpression.isValid) {
    return { text: '', count: 0 };
  }

  const unit = options.unit || calculatedExpression.displayUnit || 'mm';
  const precision = typeof options.precision === 'number' ? options.precision : 2;
  const suffix = options.suffix || 'none';
  const targetValue = options.targetValue || 'real';
  const scaleRatio = calculatedExpression.scaleRatio || 50;

  const metersToFormat = targetValue === 'drawing'
    ? calculatedExpression.canonicalMeters / scaleRatio
    : calculatedExpression.canonicalMeters;

  const formatted = formatCadValue(metersToFormat, { unit, precision, suffix });
  return { text: formatted, count: 1 };
}

/**
 * Formats manual text input containing space or comma-separated measurements.
 * 
 * @param {string} rawInput 
 * @param {Object} options 
 * @returns {{ text: string, count: number }}
 */
export function formatManualCadInput(rawInput, options = {}) {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return { text: '', count: 0 };
  }

  const defaultUnit = options.unit || 'mm';
  const unitDef = UNITS[defaultUnit] || UNITS.mm;

  // Split by whitespace, commas, or plus signs
  const tokens = rawInput.trim().split(/[\s,+/]+/).filter(t => t.length > 0);
  const meterValues = [];

  tokens.forEach(tok => {
    const num = parseFloat(tok);
    if (!isNaN(num) && isFinite(num)) {
      meterValues.push(num * unitDef.toMeters);
    }
  });

  if (meterValues.length === 0) {
    return { text: '', count: 0 };
  }

  const text = formatCadValues(meterValues, options);
  return { text, count: meterValues.length };
}

/**
 * Generates a human-friendly format summary string for user confirmation.
 * Example: "4 values • mm • 2 decimal places • No unit suffix"
 * 
 * @param {number} count 
 * @param {Object} options 
 * @returns {string}
 */
export function getCadFormatSummary(count, options = {}) {
  const unit = options.unit || 'mm';
  const precision = typeof options.precision === 'number' ? options.precision : 2;
  const suffix = options.suffix || 'none';
  const target = options.targetValue === 'drawing' ? 'Drawing @ scale' : 'Real-world';

  const suffixLabel = suffix === 'symbol' ? 'Unit symbol' : (suffix === 'full' ? 'Full unit name' : 'No suffix');
  const countLabel = `${count} ${count === 1 ? 'value' : 'values'}`;
  const precLabel = `${precision} ${precision === 1 ? 'decimal' : 'decimals'}`;

  return `${countLabel} • ${target} (${unit}) • ${precLabel} • ${suffixLabel}`;
}
