/**
 * Architecture Helping Hand - Dimension Workspace Core Model
 * Phase 2.5: Daily Architect Toolkit — Part 2.5: Dimension Workspace v1.1
 * Headless, high-precision architectural scratchpad, batch scaling engine & schedule generator.
 */

import { UNITS } from './units.js';
import { parseInput } from './parser.js';
import { formatNumber, formatFeetInches } from './formatter.js';

export const WORKSPACE_STORAGE_KEY = 'archiscale_dimension_workspace';
export const DEFAULT_WORKSPACE_SCALE = 50;
export const DEFAULT_DISPLAY_UNIT = 'mm';
export const DEFAULT_DIMENSION_TYPE = 'reference';
export const DEFAULT_DENSITY = 'comfortable';

export const SUPPORTED_DISPLAY_UNITS = Object.freeze([
  { key: 'mm', label: 'Millimeters (mm)', type: 'metric' },
  { key: 'cm', label: 'Centimeters (cm)', type: 'metric' },
  { key: 'm', label: 'Meters (m)', type: 'metric' },
  { key: 'in', label: 'Inches (in)', type: 'imperial' },
  { key: 'ft', label: 'Decimal Feet (ft)', type: 'imperial' },
  { key: 'ft_in', label: 'Architectural (Ft-In)', type: 'imperial' }
]);

export const SUPPORTED_DIMENSION_TYPES = Object.freeze([
  { key: 'reference', label: 'Reference', shortLabel: 'REF', isAdditive: false, desc: 'Object / condition dimension (excluded from cumulative totals)' },
  { key: 'segment', label: 'Segment', shortLabel: 'SEG', isAdditive: true, desc: 'Additive segment participating in cumulative totals' },
  { key: 'allowance', label: 'Allowance', shortLabel: 'ALW', isAdditive: true, desc: 'Tolerance or clearance allowance added to totals' }
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
 * Create a new dimension group container
 * @param {string} [name='Group']
 * @returns {Object} Group
 */
export function createGroup(name = 'Group') {
  return {
    id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: typeof name === 'string' && name.trim() !== '' ? name.trim() : 'Group',
    collapsed: false
  };
}

/**
 * Deterministically parse natural quick-add input string into name, measurement and type
 * Examples: "Wall A 4800", "Door 900", "Gap 50mm allowance", "seg Bay 1 6m"
 * @param {string} inputString
 * @param {string} [defaultUnit='mm']
 * @param {'reference'|'segment'|'allowance'} [fallbackType='reference']
 * @returns {Object}
 */
export function parseQuickAddString(inputString, defaultUnit = DEFAULT_DISPLAY_UNIT, fallbackType = DEFAULT_DIMENSION_TYPE) {
  if (!inputString || typeof inputString !== 'string') {
    return { name: 'Dimension', rawInput: '', dimensionType: fallbackType, isValid: false };
  }

  let text = inputString.trim();
  if (!text) {
    return { name: 'Dimension', rawInput: '', dimensionType: fallbackType, isValid: false };
  }

  let detectedType = fallbackType;

  // 1. Check for type prefixes: "seg: Wall A 4800", "ref: Door 900", "alw: Gap 50", "[segment] Bay 1 6000"
  const prefixMatch = text.match(/^(?:\[(segment|seg|reference|ref|allowance|alw)\]|(segment|seg|reference|ref|allowance|alw)[:\s]+)/i);
  if (prefixMatch) {
    const rawTag = (prefixMatch[1] || prefixMatch[2] || '').toLowerCase();
    if (rawTag.startsWith('seg')) detectedType = 'segment';
    else if (rawTag.startsWith('ref')) detectedType = 'reference';
    else if (rawTag.startsWith('alw') || rawTag.startsWith('all')) detectedType = 'allowance';
    text = text.slice(prefixMatch[0].length).trim();
  } else {
    // Check for trailing type suffix: "Gap 50 [allowance]" or "Wall A 4800 segment"
    const suffixMatch = text.match(/\s+(?:\[(segment|seg|reference|ref|allowance|alw)\]|(segment|seg|reference|ref|allowance|alw))$/i);
    if (suffixMatch) {
      const rawTag = (suffixMatch[1] || suffixMatch[2] || '').toLowerCase();
      if (rawTag.startsWith('seg')) detectedType = 'segment';
      else if (rawTag.startsWith('ref')) detectedType = 'reference';
      else if (rawTag.startsWith('alw') || rawTag.startsWith('all')) detectedType = 'allowance';
      text = text.slice(0, suffixMatch.index).trim();
    }
  }

  const tokens = text.split(/\s+/);
  if (tokens.length === 1) {
    const testParse = parseInput(tokens[0]);
    if (testParse.isValid && testParse.value > 0) {
      return {
        name: 'Dimension',
        rawInput: tokens[0],
        dimensionType: detectedType,
        isValid: true
      };
    } else {
      return {
        name: tokens[0],
        rawInput: '',
        dimensionType: detectedType,
        isValid: false
      };
    }
  }

  // Scan backwards from the right for the measurement token(s)
  let measurementPart = '';
  let namePart = '';

  for (let take = Math.min(3, tokens.length - 1); take >= 1; take--) {
    const candidateMeas = tokens.slice(tokens.length - take).join(' ');
    const testParse = parseInput(candidateMeas);
    if (testParse.isValid && testParse.value > 0) {
      measurementPart = candidateMeas;
      namePart = tokens.slice(0, tokens.length - take).join(' ');
      break;
    }
  }

  if (measurementPart) {
    return {
      name: namePart.trim() || 'Dimension',
      rawInput: measurementPart.trim(),
      dimensionType: detectedType,
      isValid: true
    };
  }

  return {
    name: text,
    rawInput: '',
    dimensionType: detectedType,
    isValid: false
  };
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
  const groupId = typeof data.groupId === 'string' && data.groupId.trim() !== '' ? data.groupId.trim() : null;

  // Semantic dimension type: 'reference' (default), 'segment', 'allowance'
  let dimensionType = DEFAULT_DIMENSION_TYPE;
  if (data.dimensionType === 'segment' || data.dimensionType === 'allowance' || data.dimensionType === 'reference') {
    dimensionType = data.dimensionType;
  }

  // Strict unit check
  const fallbackUnit = UNITS[defaultUnit] ? defaultUnit : 'mm';

  let realMeters = null;
  let parsedUnit = fallbackUnit;
  let parsedNumericValue = 0;
  let isValid = false;
  let errorMessage = null;

  if (rawInput === '') {
    isValid = false;
    errorMessage = 'Enter a measurement';
  } else {
    const parseRes = parseInput(rawInput);
    if (parseRes.isValid && parseRes.value > 0) {
      parsedNumericValue = parseRes.value;
      if (parseRes.detectedUnit) {
        if (UNITS[parseRes.detectedUnit]) {
          parsedUnit = parseRes.detectedUnit;
          realMeters = parseRes.value * UNITS[parseRes.detectedUnit].toMeters;
          isValid = true;
          errorMessage = null;
        } else {
          isValid = false;
          errorMessage = `Unknown unit: ${parseRes.detectedUnit}`;
        }
      } else {
        if (UNITS[fallbackUnit]) {
          parsedUnit = fallbackUnit;
          realMeters = parseRes.value * UNITS[fallbackUnit].toMeters;
          isValid = true;
          errorMessage = null;
        } else {
          isValid = false;
          errorMessage = `Invalid default unit: ${fallbackUnit}`;
        }
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
    dimensionType,
    defaultUnit: fallbackUnit,
    parsedUnit,
    parsedNumericValue,
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
    dimensionType: updates.dimensionType !== undefined ? updates.dimensionType : entry.dimensionType,
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
    dimensionType: entry.dimensionType,
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
  if (meters === null || meters === undefined || isNaN(meters) || !isFinite(meters) || meters < 0) {
    return '---';
  }

  if (meters === 0) {
    if (displayUnit === 'ft_in') return '0"';
    const unitDef = UNITS[displayUnit] || UNITS.mm;
    return `0 ${unitDef.symbol}`;
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
      rawInput: entry?.rawInput || '',
      dimensionType: entry?.dimensionType || DEFAULT_DIMENSION_TYPE
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
    rawInput: entry.rawInput,
    dimensionType: entry.dimensionType || DEFAULT_DIMENSION_TYPE
  };
}

/**
 * Computes workspace totals with semantic segment, allowance, and combined totals
 * Reference dimensions are excluded from cumulative totals.
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

  let segmentRealMeters = 0;
  let allowanceRealMeters = 0;
  let referenceRealMeters = 0;

  let segmentCount = 0;
  let allowanceCount = 0;
  let referenceCount = 0;

  let enabledCount = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const entry of entries) {
    if (!entry) continue;
    if (entry.enabled) {
      enabledCount++;
      const type = entry.dimensionType || 'reference';
      if (entry.isValid && typeof entry.realMeters === 'number' && entry.realMeters > 0) {
        validCount++;
        if (type === 'segment') {
          segmentRealMeters += entry.realMeters;
          segmentCount++;
        } else if (type === 'allowance') {
          allowanceRealMeters += entry.realMeters;
          allowanceCount++;
        } else {
          // reference
          referenceRealMeters += entry.realMeters;
          referenceCount++;
        }
      } else {
        invalidCount++;
      }
    }
  }

  const combinedRealMeters = segmentRealMeters + allowanceRealMeters;

  const segmentDrawingMeters = scaleRatio > 0 ? segmentRealMeters / scaleRatio : 0;
  const allowanceDrawingMeters = scaleRatio > 0 ? allowanceRealMeters / scaleRatio : 0;
  const combinedDrawingMeters = scaleRatio > 0 ? combinedRealMeters / scaleRatio : 0;
  const referenceDrawingMeters = scaleRatio > 0 ? referenceRealMeters / scaleRatio : 0;

  return {
    totalCount: entries.length,
    enabledCount,
    validCount,
    invalidCount,
    segmentCount,
    allowanceCount,
    referenceCount,
    scaleRatio,
    displayUnit,

    // Segment Totals
    segmentRealMeters,
    segmentDrawingMeters,
    segmentRealFormatted: formatMeasurementValue(segmentRealMeters, displayUnit, precision),
    segmentDrawingFormatted: formatMeasurementValue(segmentDrawingMeters, displayUnit, precision),

    // Allowance Totals
    allowanceRealMeters,
    allowanceDrawingMeters,
    allowanceRealFormatted: formatMeasurementValue(allowanceRealMeters, displayUnit, precision),
    allowanceDrawingFormatted: formatMeasurementValue(allowanceDrawingMeters, displayUnit, precision),

    // Combined Totals (Segments + Allowances)
    totalRealMeters: combinedRealMeters,
    totalDrawingMeters: combinedDrawingMeters,
    totalRealFormatted: formatMeasurementValue(combinedRealMeters, displayUnit, precision),
    totalDrawingFormatted: formatMeasurementValue(combinedDrawingMeters, displayUnit, precision),

    // Reference Totals (Informational only)
    referenceRealMeters,
    referenceDrawingMeters,
    referenceRealFormatted: formatMeasurementValue(referenceRealMeters, displayUnit, precision),
    referenceDrawingFormatted: formatMeasurementValue(referenceDrawingMeters, displayUnit, precision),

    // Summary breakdown
    breakdownLabel: `${entries.length} items • ${segmentCount} segments • ${allowanceCount} allowances • ${referenceCount} references`
  };
}

/**
 * Computes subtotal for a specific group of entries
 * @param {Array<Object>} entries
 * @param {string} groupId
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {number} [precision=3]
 * @returns {Object}
 */
export function calculateGroupTotals(entries = [], groupId, scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  const groupEntries = (entries || []).filter(e => e && e.groupId === groupId);
  return calculateWorkspaceTotals(groupEntries, scaleRatio, displayUnit, precision);
}

/**
 * Formats all or filtered workspace entries into clean architectural text for clipboard or CAD
 * @param {Array<Object>} entries
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {'both'|'real'|'drawing'|'tsv'|'raw'|'segments'|'references'|'allowances'|'selected'|Object} [options='both']
 * @returns {string}
 */
export function formatWorkspaceForClipboard(entries = [], scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, options = 'both') {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'Workspace is empty.';
  }

  const mode = typeof options === 'string' ? options : (options?.mode || 'both');
  const selectedIds = Array.isArray(options?.selectedIds) ? new Set(options.selectedIds) : null;
  const groups = Array.isArray(options?.groups) ? options.groups : [];
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  let targetEntries = entries;
  if (mode === 'selected' && selectedIds) {
    targetEntries = entries.filter(e => selectedIds.has(e.id));
  } else if (mode === 'segments') {
    targetEntries = entries.filter(e => (e.dimensionType || 'reference') === 'segment');
  } else if (mode === 'references') {
    targetEntries = entries.filter(e => (e.dimensionType || 'reference') === 'reference');
  } else if (mode === 'allowances') {
    targetEntries = entries.filter(e => (e.dimensionType || 'reference') === 'allowance');
  }

  if (targetEntries.length === 0) {
    return 'No matching dimensions found.';
  }

  // 1. Raw numbers only for CAD/BIM pasting
  if (mode === 'raw') {
    return targetEntries.map(e => {
      const calc = calculateEntryValues(e, scaleRatio, displayUnit);
      return calc.isValid ? e.rawInput : '0';
    }).join('\n');
  }

  // 2. TSV format for Excel / Google Sheets / Numbers
  if (mode === 'tsv') {
    let tsv = 'Type\tItem Name\tRaw Input\tReal Dimension\tDrawing Dimension (1:' + scaleRatio + ')\tGroup\tNotes\tStatus\n';
    targetEntries.forEach(entry => {
      const calc = calculateEntryValues(entry, scaleRatio, displayUnit);
      const grpName = entry.groupId ? (groupMap.get(entry.groupId) || 'Group') : '—';
      tsv += `${(entry.dimensionType || 'reference').toUpperCase()}\t${entry.name}\t${entry.rawInput}\t${calc.realFormatted}\t${calc.drawingFormatted}\t${grpName}\t${entry.notes}\t${entry.enabled ? 'Active' : 'Disabled'}\n`;
    });
    const totals = calculateWorkspaceTotals(targetEntries, scaleRatio, displayUnit);
    tsv += `TOTAL SEGMENTS\t\t\t${totals.segmentRealFormatted}\t${totals.segmentDrawingFormatted}\t\t${totals.segmentCount} segments\n`;
    tsv += `TOTAL ALLOWANCES\t\t\t${totals.allowanceRealFormatted}\t${totals.allowanceDrawingFormatted}\t\t${totals.allowanceCount} allowances\n`;
    tsv += `COMBINED TOTAL\t\t\t${totals.totalRealFormatted}\t${totals.totalDrawingFormatted}\t\t${totals.enabledCount} active rows\n`;
    return tsv;
  }

  // 3. Structured Architectural Schedule Text
  const totals = calculateWorkspaceTotals(targetEntries, scaleRatio, displayUnit);
  let lines = [];
  lines.push(`ARCHITECTURAL DIMENSION SCHEDULE`);
  lines.push(`Scale: 1:${scaleRatio} | Display Unit: ${displayUnit.toUpperCase()}`);
  lines.push('──────────────────────────────────────────────────────────────────────────');
  lines.push(`[TYPE] ITEM NAME ➔ REAL DIMENSION | DRAWING @ 1:${scaleRatio}`);
  lines.push('──────────────────────────────────────────────────────────────────────────');

  targetEntries.forEach(entry => {
    const typeTag = `[${(entry.dimensionType || 'reference').toUpperCase().slice(0, 3)}]`;
    if (!entry.enabled) {
      lines.push(`${typeTag} [DISABLED] ${entry.name}: ${entry.rawInput}`);
      return;
    }

    const calc = calculateEntryValues(entry, scaleRatio, displayUnit);
    const noteSuffix = entry.notes ? ` (${entry.notes})` : '';
    const grpSuffix = entry.groupId ? ` <${groupMap.get(entry.groupId) || 'Group'}>` : '';

    if (!calc.isValid) {
      lines.push(`${typeTag} ${entry.name}: ${entry.rawInput} ⚠️ (Invalid)${noteSuffix}${grpSuffix}`);
    } else if (mode === 'real') {
      lines.push(`${typeTag} ${entry.name}: ${calc.realFormatted}${noteSuffix}${grpSuffix}`);
    } else if (mode === 'drawing') {
      lines.push(`${typeTag} ${entry.name}: ${calc.drawingFormatted} (1:${scaleRatio})${noteSuffix}${grpSuffix}`);
    } else {
      lines.push(`${typeTag} ${entry.name}: ${calc.realFormatted} ➔ Drawing: ${calc.drawingFormatted}${noteSuffix}${grpSuffix}`);
    }
  });

  lines.push('──────────────────────────────────────────────────────────────────────────');
  lines.push(`TOTAL SEGMENTS:   ${totals.segmentRealFormatted} (Drawing: ${totals.segmentDrawingFormatted}) [${totals.segmentCount} segments]`);
  if (totals.allowanceCount > 0) {
    lines.push(`TOTAL ALLOWANCES: ${totals.allowanceRealFormatted} (Drawing: ${totals.allowanceDrawingFormatted}) [${totals.allowanceCount} allowances]`);
  }
  lines.push(`COMBINED TOTAL:   ${totals.totalRealFormatted} (Drawing: ${totals.totalDrawingFormatted})`);
  lines.push(`REFERENCES:       ${totals.referenceRealFormatted} (${totals.referenceCount} reference dimensions, excluded from total)`);

  return lines.join('\n');
}

/**
 * Creates default initial workspace populated with sample architectural measurements
 * @returns {Object}
 */
export function createDefaultWorkspace() {
  const sampleEntries = [
    { name: 'Exterior Wall A', rawInput: '4.8m', dimensionType: 'segment', defaultUnit: 'm', notes: 'North elevation run' },
    { name: 'Main Entry Door', rawInput: '900mm', dimensionType: 'reference', defaultUnit: 'mm', notes: 'Clear opening' },
    { name: 'Ribbon Window', rawInput: '2.4m', dimensionType: 'reference', defaultUnit: 'm', notes: 'Sill height 900mm' },
    { name: 'Interior Partition', rawInput: '3200mm', dimensionType: 'segment', defaultUnit: 'mm', notes: 'Drywall partition' },
    { name: 'Expansion Joint', rawInput: '50mm', dimensionType: 'allowance', defaultUnit: 'mm', notes: 'Thermal gap' }
  ];

  return {
    scaleRatio: DEFAULT_WORKSPACE_SCALE,
    displayUnit: DEFAULT_DISPLAY_UNIT,
    density: DEFAULT_DENSITY,
    groups: [],
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
    version: '2.5.1',
    scaleRatio: typeof workspace.scaleRatio === 'number' && workspace.scaleRatio > 0 ? workspace.scaleRatio : DEFAULT_WORKSPACE_SCALE,
    displayUnit: typeof workspace.displayUnit === 'string' ? workspace.displayUnit : DEFAULT_DISPLAY_UNIT,
    density: workspace.density === 'compact' ? 'compact' : DEFAULT_DENSITY,
    groups: Array.isArray(workspace.groups) ? workspace.groups : [],
    entries: Array.isArray(workspace.entries) ? workspace.entries : []
  };

  return JSON.stringify(payload);
}

/**
 * Safely deserializes a workspace state with error recovery and backwards compatibility
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
    const density = parsed.density === 'compact' ? 'compact' : DEFAULT_DENSITY;
    const groups = Array.isArray(parsed.groups) ? parsed.groups.map(g => ({
      id: g.id || `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: g.name || 'Group',
      collapsed: Boolean(g.collapsed)
    })) : [];

    let entries = [];
    if (Array.isArray(parsed.entries)) {
      entries = parsed.entries.map(item => {
        if (!item || typeof item !== 'object') return null;
        return createDimensionEntry({
          id: item.id,
          name: item.name,
          rawInput: item.rawInput,
          dimensionType: item.dimensionType || 'reference',
          defaultUnit: item.defaultUnit || displayUnit,
          notes: item.notes,
          enabled: item.enabled,
          groupId: item.groupId
        }, item.defaultUnit || displayUnit);
      }).filter(Boolean);
    }

    return {
      scaleRatio,
      displayUnit,
      density,
      groups,
      entries
    };
  } catch (e) {
    // Corrupted storage recovery
    return createDefaultWorkspace();
  }
}
