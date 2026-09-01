/**
 * Architecture Helping Hand - Dimension Workspace Core Model
 * Phase 2.5: Daily Architect Toolkit — Part 2: Dimension Workspace
 * Headless, high-precision architectural scratchpad and batch scaling engine.
 */

import { UNITS } from './units.js';
import { parseInput } from './parser.js';
import { realToDrawing, drawingToReal } from './calculator.js';
import { formatNumber, formatFeetInches } from './formatter.js';

export const WORKSPACE_STORAGE_KEY = 'archiscale_dimension_workspace';
export const DEFAULT_WORKSPACE_SCALE = 50;
export const DEFAULT_DISPLAY_UNIT = 'mm';

export const SUPPORTED_DISPLAY_UNITS = Object.freeze([
  { key: 'mm', label: 'Millimeters (mm)', type: 'metric' },
  { key: 'cm', label: 'Centimeters (cm)', type: 'metric' },
  { key: 'm', label: 'Meters (m)', type: 'metric' },
  { key: 'in', label: 'Inches (in)', type: 'imperial' },
  { key: 'ft', label: 'Decimal Feet (ft)', type: 'imperial' },
  { key: 'ft_in', label: 'Architectural (Ft-In)', type: 'imperial' }
]);

let entryIdCounter = 0;

/**
 * Generate a collision-resistant unique ID for workspace entries
 * @returns {string}
 */
export function generateEntryId() {
  entryIdCounter++;
  return `dim_${Date.now()}_${entryIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Creates and normalizes a single dimension entry
 * @param {Object} data
 * @param {string} [defaultUnit='mm']
 * @returns {Object} DimensionEntry
 */
export function createDimensionEntry(data = {}, defaultUnit = DEFAULT_DISPLAY_UNIT) {
  const id = data.id || generateEntryId();
  const name = typeof data.name === 'string' && data.name.trim() !== '' ? data.name.trim() : 'Dimension';
  const rawInput = data.rawInput !== undefined && data.rawInput !== null ? String(data.rawInput).trim() : '';
  const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
  const enabled = data.enabled !== false;
  const groupId = typeof data.groupId === 'string' ? data.groupId : null;
  const fallbackUnit = UNITS[defaultUnit] ? defaultUnit : 'mm';

  let realMeters = null;
  let parsedUnit = fallbackUnit;
  let isValid = false;
  let errorMessage = null;

  if (rawInput === '') {
    isValid = false;
    errorMessage = 'Enter a measurement';
  } else {
    const parseRes = parseInput(rawInput);
    if (parseRes.isValid && parseRes.value > 0) {
      const activeUnitKey = parseRes.detectedUnit || fallbackUnit;
      const unitDef = UNITS[activeUnitKey] || UNITS[fallbackUnit];

      if (unitDef) {
        parsedUnit = unitDef.key;
        realMeters = parseRes.value * unitDef.toMeters;
        isValid = true;
        errorMessage = null;
      } else {
        isValid = false;
        errorMessage = `Unknown unit: ${activeUnitKey}`;
      }
    } else {
      isValid = false;
      errorMessage = parseRes.error || 'Invalid measurement';
    }
  }

  return {
    id,
    name,
    rawInput,
    defaultUnit: fallbackUnit,
    parsedUnit,
    realMeters,
    isValid,
    errorMessage,
    notes,
    enabled,
    groupId
  };
}

/**
 * Updates an existing dimension entry and re-evaluates parsed measurement
 * @param {Object} entry
 * @param {Object} updates
 * @returns {Object} Updated DimensionEntry
 */
export function updateDimensionEntry(entry, updates = {}) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('updateDimensionEntry requires a valid entry object');
  }

  return createDimensionEntry({
    id: entry.id,
    name: updates.name !== undefined ? updates.name : entry.name,
    rawInput: updates.rawInput !== undefined ? updates.rawInput : entry.rawInput,
    defaultUnit: updates.defaultUnit !== undefined ? updates.defaultUnit : entry.defaultUnit,
    notes: updates.notes !== undefined ? updates.notes : entry.notes,
    enabled: updates.enabled !== undefined ? updates.enabled : entry.enabled,
    groupId: updates.groupId !== undefined ? updates.groupId : entry.groupId
  }, updates.defaultUnit || entry.defaultUnit);
}

/**
 * Duplicates a dimension entry with a new ID and copy suffix
 * @param {Object} entry
 * @returns {Object} Duplicated DimensionEntry
 */
export function duplicateDimensionEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('duplicateDimensionEntry requires a valid entry object');
  }

  return createDimensionEntry({
    id: generateEntryId(),
    name: `${entry.name} (Copy)`,
    rawInput: entry.rawInput,
    defaultUnit: entry.defaultUnit,
    notes: entry.notes,
    enabled: entry.enabled,
    groupId: entry.groupId
  }, entry.defaultUnit);
}

/**
 * Formats a measurement in meters into a specific display unit string
 * @param {number|null} meters - Canonical dimension in meters
 * @param {string} displayUnit - Target display unit ('mm', 'cm', 'm', 'in', 'ft', 'ft_in')
 * @param {number} [precision=3] - Fractional decimals
 * @returns {string}
 */
export function formatMeasurementValue(meters, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  if (meters === null || meters === undefined || isNaN(meters) || !isFinite(meters) || meters <= 0) {
    return '---';
  }

  if (displayUnit === 'ft_in') {
    const totalInches = meters / UNITS.in.toMeters;
    return formatFeetInches(totalInches);
  }

  const unitDef = UNITS[displayUnit] || UNITS.mm;
  const converted = meters / unitDef.toMeters;
  return `${formatNumber(converted, precision)} ${unitDef.symbol}`;
}

/**
 * Calculates live real-world and scaled drawing representations for an entry
 * @param {Object} entry
 * @param {number} scaleRatio - Scale denominator (e.g. 50 for 1:50)
 * @param {string} displayUnit - Target display unit key
 * @param {number} [precision=3]
 * @returns {Object}
 */
export function calculateEntryValues(entry, scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  if (!entry || !entry.isValid || entry.realMeters === null || scaleRatio <= 0) {
    return {
      isValid: false,
      errorMessage: entry?.errorMessage || 'Invalid entry',
      realMeters: null,
      drawingMeters: null,
      realFormatted: '---',
      drawingFormatted: '---',
      rawInput: entry?.rawInput || ''
    };
  }

  const realMeters = entry.realMeters;
  const drawingMeters = realMeters / scaleRatio;

  return {
    isValid: true,
    errorMessage: null,
    realMeters,
    drawingMeters,
    realFormatted: formatMeasurementValue(realMeters, displayUnit, precision),
    drawingFormatted: formatMeasurementValue(drawingMeters, displayUnit, precision),
    rawInput: entry.rawInput
  };
}

/**
 * Computes workspace totals across all enabled valid dimension rows
 * @param {Array<Object>} entries
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {number} [precision=3]
 * @returns {Object}
 */
export function calculateWorkspaceTotals(entries = [], scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  if (!Array.isArray(entries)) {
    entries = [];
  }

  let totalRealMeters = 0;
  let totalDrawingMeters = 0;
  let enabledCount = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const entry of entries) {
    if (!entry) continue;
    if (entry.enabled) {
      enabledCount++;
      if (entry.isValid && typeof entry.realMeters === 'number' && entry.realMeters > 0) {
        validCount++;
        totalRealMeters += entry.realMeters;
      } else {
        invalidCount++;
      }
    }
  }

  if (scaleRatio > 0) {
    totalDrawingMeters = totalRealMeters / scaleRatio;
  }

  return {
    totalCount: entries.length,
    enabledCount,
    validCount,
    invalidCount,
    scaleRatio,
    displayUnit,
    totalRealMeters,
    totalDrawingMeters,
    totalRealFormatted: validCount > 0 ? formatMeasurementValue(totalRealMeters, displayUnit, precision) : '0 ' + (displayUnit === 'ft_in' ? 'ft-in' : displayUnit),
    totalDrawingFormatted: validCount > 0 ? formatMeasurementValue(totalDrawingMeters, displayUnit, precision) : '0 ' + (displayUnit === 'ft_in' ? 'ft-in' : displayUnit)
  };
}

/**
 * Formats all active workspace entries into clean architectural text for clipboard
 * @param {Array<Object>} entries
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {'both'|'real'|'drawing'|'tsv'} [mode='both']
 * @returns {string}
 */
export function formatWorkspaceForClipboard(entries = [], scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, mode = 'both') {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'Workspace is empty.';
  }

  const totals = calculateWorkspaceTotals(entries, scaleRatio, displayUnit);

  if (mode === 'tsv') {
    let tsv = 'Item Name\tRaw Input\tReal Dimension\tDrawing Dimension (1:' + scaleRatio + ')\tNotes\tStatus\n';
    entries.forEach(entry => {
      const calc = calculateEntryValues(entry, scaleRatio, displayUnit);
      tsv += `${entry.name}\t${entry.rawInput}\t${calc.realFormatted}\t${calc.drawingFormatted}\t${entry.notes}\t${entry.enabled ? 'Active' : 'Disabled'}\n`;
    });
    tsv += `TOTAL\t\t${totals.totalRealFormatted}\t${totals.totalDrawingFormatted}\t\t${totals.enabledCount} active rows\n`;
    return tsv;
  }

  let lines = [];
  lines.push(`DIMENSION SCHEDULE (Scale 1:${scaleRatio} | Display: ${displayUnit.toUpperCase()})`);
  lines.push('─────────────────────────────────────────────────────────────────');

  entries.forEach(entry => {
    if (!entry.enabled) {
      lines.push(`[DISABLED] ${entry.name}: ${entry.rawInput} (Excluded from totals)`);
      return;
    }

    const calc = calculateEntryValues(entry, scaleRatio, displayUnit);
    const noteSuffix = entry.notes ? ` [${entry.notes}]` : '';

    if (!calc.isValid) {
      lines.push(`${entry.name}: ${entry.rawInput} ⚠ (Invalid input)${noteSuffix}`);
    } else if (mode === 'real') {
      lines.push(`${entry.name}: ${calc.realFormatted}${noteSuffix}`);
    } else if (mode === 'drawing') {
      lines.push(`${entry.name}: ${calc.drawingFormatted} (1:${scaleRatio})${noteSuffix}`);
    } else {
      lines.push(`${entry.name}: ${calc.realFormatted} ➔ Drawing: ${calc.drawingFormatted}${noteSuffix}`);
    }
  });

  lines.push('─────────────────────────────────────────────────────────────────');
  if (mode === 'real') {
    lines.push(`TOTAL REAL: ${totals.totalRealFormatted} (${totals.enabledCount} active measurements)`);
  } else if (mode === 'drawing') {
    lines.push(`TOTAL DRAWING @ 1:${scaleRatio}: ${totals.totalDrawingFormatted} (${totals.enabledCount} active measurements)`);
  } else {
    lines.push(`TOTAL REAL: ${totals.totalRealFormatted}`);
    lines.push(`TOTAL DRAWING @ 1:${scaleRatio}: ${totals.totalDrawingFormatted}`);
  }

  return lines.join('\n');
}

/**
 * Creates default initial workspace populated with sample architectural measurements
 * @returns {Object}
 */
export function createDefaultWorkspace() {
  const sampleEntries = [
    { name: 'Exterior Wall A', rawInput: '4.8m', defaultUnit: 'm', notes: 'North elevation' },
    { name: 'Main Entry Door', rawInput: '900mm', defaultUnit: 'mm', notes: 'Clear opening' },
    { name: 'Ribbon Window', rawInput: '2.4m', defaultUnit: 'm', notes: 'Sill height 900mm' },
    { name: 'Interior Partition', rawInput: '3250mm', defaultUnit: 'mm', notes: 'Drywall partition' }
  ];

  return {
    scaleRatio: DEFAULT_WORKSPACE_SCALE,
    displayUnit: DEFAULT_DISPLAY_UNIT,
    entries: sampleEntries.map(s => createDimensionEntry(s))
  };
}

/**
 * Safely serializes a workspace state to JSON string
 * @param {Object} workspace
 * @returns {string}
 */
export function serializeWorkspace(workspace) {
  if (!workspace || typeof workspace !== 'object') {
    return JSON.stringify(createDefaultWorkspace());
  }

  const payload = {
    version: '2.5.0',
    scaleRatio: typeof workspace.scaleRatio === 'number' && workspace.scaleRatio > 0 ? workspace.scaleRatio : DEFAULT_WORKSPACE_SCALE,
    displayUnit: typeof workspace.displayUnit === 'string' ? workspace.displayUnit : DEFAULT_DISPLAY_UNIT,
    entries: Array.isArray(workspace.entries) ? workspace.entries : []
  };

  return JSON.stringify(payload);
}

/**
 * Safely deserializes a workspace state with error recovery and sanitation
 * @param {string|Object} raw
 * @returns {Object}
 */
export function deserializeWorkspace(raw) {
  if (!raw) {
    return createDefaultWorkspace();
  }

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultWorkspace();
    }

    const scaleRatio = typeof parsed.scaleRatio === 'number' && parsed.scaleRatio > 0 ? parsed.scaleRatio : DEFAULT_WORKSPACE_SCALE;
    const displayUnit = typeof parsed.displayUnit === 'string' ? parsed.displayUnit : DEFAULT_DISPLAY_UNIT;

    let entries = [];
    if (Array.isArray(parsed.entries)) {
      entries = parsed.entries.map(item => {
        if (!item || typeof item !== 'object') return null;
        return createDimensionEntry(item, item.defaultUnit || displayUnit);
      }).filter(Boolean);
    }

    return {
      scaleRatio,
      displayUnit,
      entries
    };
  } catch (e) {
    // Corrupted storage recovery
    return createDefaultWorkspace();
  }
}
