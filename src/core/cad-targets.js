/**
 * Architecture Helping Hand - CAD Application Helpers & Target Profiles
 * Part 9: Daily Architect Toolkit — Rhino / AutoCAD / SketchUp Handoff
 *
 * Pure, deterministic, zero-DOM module that turns existing toolkit results
 * (Workspace, Expression, Multi-Scale, Chains, Batch, Quick Dimension) into
 * clipboard payloads shaped for a chosen CAD application target.
 *
 * IMPORTANT SCOPE NOTE: These are WORKFLOW PROFILES, not official product
 * integrations. No proprietary CAD command syntax is generated or executed.
 * Profiles describe output preferences (units, precision, suffix style,
 * line layout) that make manual paste into each application's command
 * prompt / Value Control Box fast and error-free.
 *
 * The module deliberately reuses the existing CAD formatting engine in
 * cad-clipboard.js (formatCadValue / escapeTSV / escapeCSV / formatCad*)
 * so there is exactly ONE formatting implementation, ONE unit system, and
 * ONE scale system underneath every target.
 */

import { UNITS, requireUnit } from './units.js';
import {
  formatCadValue,
  escapeTSV,
  escapeCSV
} from './cad-clipboard.js';

export const CAD_HANDOFF_STORAGE_KEY = 'archiscale_cad_handoff_prefs';

/**
 * CAD Target Profiles (workflow preferences, NOT official integrations).
 * Each profile encodes the conventions that make pasted values behave
 * predictably in the target application's numeric input fields.
 */
export const CAD_TARGET_PROFILES = Object.freeze({
  generic: {
    id: 'generic',
    label: 'Generic CAD',
    description: 'Neutral clean numbers that behave in any CAD command prompt or paste target.',
    preferredUnit: 'mm',
    preferredPrecision: 2,
    preferredSuffix: 'none',
    preferredDelimiter: 'newline'
  },
  rhino: {
    id: 'rhino',
    label: 'Rhino',
    description: 'Clean decimal command-prompt values; Rhino accepts plain numbers in its units.',
    preferredUnit: 'mm',
    preferredPrecision: 3,
    preferredSuffix: 'none',
    preferredDelimiter: 'newline'
  },
  autocad: {
    id: 'autocad',
    label: 'AutoCAD',
    description: 'Plain drawing-unit numbers for command-line entry and dimension schedules.',
    preferredUnit: 'mm',
    preferredPrecision: 2,
    preferredSuffix: 'none',
    preferredDelimiter: 'newline'
  },
  sketchup: {
    id: 'sketchup',
    label: 'SketchUp',
    description: 'Values with unit identifiers for the Value Control Box (VCB), e.g. 2400mm.',
    preferredUnit: 'mm',
    preferredPrecision: 1,
    preferredSuffix: 'symbol',
    preferredDelimiter: 'newline'
  }
});

/** Valid CAD target ids. */
export const CAD_TARGET_IDS = Object.freeze(Object.keys(CAD_TARGET_PROFILES));

/**
 * Copy/format modes exposed by the handoff UI. Each maps onto the single
 * underlying formatter with different options — no per-mode math exists.
 */
export const CAD_COPY_MODES = Object.freeze({
  raw: {
    id: 'raw',
    label: 'Raw Numbers',
    description: 'One clean number per line, no suffix.',
    suffix: 'none',
    delimiter: 'newline'
  },
  formatted: {
    id: 'formatted',
    label: 'Formatted Dimensions',
    description: 'Numbers with the chosen unit suffix style.',
    suffix: 'target',   // resolved against target profile
    delimiter: 'newline'
  },
  drawing: {
    id: 'drawing',
    label: 'Drawing Values',
    description: 'Values converted to drawing scale (paper dimensions).',
    suffix: 'none',
    delimiter: 'newline',
    targetValue: 'drawing'
  },
  schedule: {
    id: 'schedule',
    label: 'Schedule (Named Table)',
    description: 'Named rows with values, tab-separated.',
    suffix: 'none',
    delimiter: 'tsv'
  },
  tsv: {
    id: 'tsv',
    label: 'TSV',
    description: 'Tab-separated values only (spreadsheet friendly).',
    suffix: 'none',
    delimiter: 'tsv'
  },
  csv: {
    id: 'csv',
    label: 'CSV',
    description: 'Comma-separated values with RFC-4180 escaping.',
    suffix: 'none',
    delimiter: 'csv'
  }
});

export const CAD_COPY_MODE_IDS = Object.freeze(Object.keys(CAD_COPY_MODES));

/**
 * Source descriptors: what each supported handoff source is called and
 * whether it supports the richer output shapes (schedule rows, cumulative).
 */
export const CAD_SOURCE_IDS = Object.freeze([
  'workspace', 'expression', 'multiscale', 'chain', 'batch', 'quick', 'manual'
]);

/**
 * Resolves the effective formatting options for a target + copy mode.
 * User-explicit values (unit/precision) always win over profile defaults.
 *
 * @param {string} targetId - CAD target profile id
 * @param {string} modeId - copy mode id
 * @param {Object} [overrides] - { unit, precision, suffix, scaleRatio }
 * @returns {{ target: Object, mode: Object, unit: string, precision: number, suffix: string, delimiter: string, targetValue: 'real'|'drawing', scaleRatio: number }}
 */
export function resolveCadHandoffOptions(targetId, modeId, overrides = {}) {
  const target = CAD_TARGET_PROFILES[targetId];
  if (!target) {
    throw new Error(`Unknown CAD target profile: "${targetId}". Valid targets: ${CAD_TARGET_IDS.join(', ')}`);
  }
  const mode = CAD_COPY_MODES[modeId];
  if (!mode) {
    throw new Error(`Unknown CAD copy mode: "${modeId}". Valid modes: ${CAD_COPY_MODE_IDS.join(', ')}`);
  }

  const suffix = overrides.suffix && overrides.suffix !== 'target'
    ? overrides.suffix
    : (mode.suffix === 'target' ? target.preferredSuffix : mode.suffix);
  const delimiter = mode.delimiter;
  const targetValue = mode.targetValue || 'real';
  const scaleRatio = typeof overrides.scaleRatio === 'number' && overrides.scaleRatio > 0
    ? overrides.scaleRatio
    : 50;

  return {
    target,
    mode,
    unit: overrides.unit || target.preferredUnit,
    precision: typeof overrides.precision === 'number' ? overrides.precision : target.preferredPrecision,
    suffix,
    delimiter,
    targetValue,
    scaleRatio
  };
}

/**
 * Normalizes a chain-handoff layout selection for the chain source.
 * 'segments' (default) | 'cumulative' | 'pipe' | 'schedule'
 */
export function normalizeChainLayout(layout) {
  return ['segments', 'cumulative', 'pipe', 'schedule'].includes(layout) ? layout : 'segments';
}

/**
 * Builds the schedule rows for a calculated chain: one row per active
 * segment with start / end / length values (real or drawing scale).
 *
 * @param {Object} calculatedChain - result of calculateChain()
 * @param {Object} opts - resolved options from resolveCadHandoffOptions
 * @returns {Array<{ name: string, start: number, end: number, length: number, drawing: number, type: string }>} values in meters
 */
function chainScheduleRows(calculatedChain, opts) {
  const active = calculatedChain.segments.filter(s => s.enabled !== false && s.isValid !== false);
  const toVal = m => (opts.targetValue === 'drawing' ? m / opts.scaleRatio : m);
  return active.map((s, idx) => ({
    name: s.name || `Segment ${idx + 1}`,
    start: toVal(s.startMeters),
    end: toVal(s.endMeters),
    length: toVal(segLengthM(s)),
    drawing: segDrawingM(s, opts.scaleRatio),
    type: (s.dimensionType || 'segment').toUpperCase()
  }));
}

/**
 * Normalizes a calculated chain segment's length in meters.
 * calculateChain() emits `lengthMeters`; hand-built/mock chains may carry the
 * `realMeters` alias. Both are accepted, engine names take precedence.
 */
function segLengthM(s) {
  if (typeof s.lengthMeters === 'number' && isFinite(s.lengthMeters)) return s.lengthMeters;
  if (typeof s.realMeters === 'number' && isFinite(s.realMeters)) return s.realMeters;
  return 0;
}

function segDrawingM(s, scaleRatio) {
  if (typeof s.drawingLengthMeters === 'number' && isFinite(s.drawingLengthMeters)) return s.drawingLengthMeters;
  if (typeof s.drawingMeters === 'number' && isFinite(s.drawingMeters)) return s.drawingMeters;
  return segLengthM(s) / scaleRatio;
}

function joinNumbers(values, delimiter) {
  if (delimiter === 'tsv') return values.join('\t');
  if (delimiter === 'csv') return values.join(',');
  if (delimiter === 'comma') return values.join(', ');
  if (delimiter === 'pipe') return values.join(' | ');
  return values.join('\n');
}

function formatNumberList(meterList, opts) {
  const formatted = meterList.map(m => formatCadValue(m, {
    unit: opts.unit,
    precision: opts.precision,
    suffix: opts.suffix
  }));
  return joinNumbers(formatted, opts.delimiter);
}

/**
 * Builds a CAD handoff payload from any supported source result.
 * This is the single entry point used by the UI for every source; per-source
 * branches only differ in which existing core values they read.
 *
 * @param {string} sourceId - 'workspace' | 'expression' | 'multiscale' | 'chain' | 'batch' | 'quick' | 'manual'
 * @param {Object} sourceData - source-specific payload (see per-branch docs)
 * @param {Object} options - { targetId, modeId, unit, precision, suffix, scaleRatio, chainLayout, workspaceScope, selectedIds }
 * @returns {{ text: string, count: number, targetLabel: string, modeLabel: string, empty: boolean }}
 */
export function buildCadHandoffPayload(sourceId, sourceData, options = {}) {
  const targetId = options.targetId || 'generic';
  const modeId = options.modeId || 'raw';
  const opts = resolveCadHandoffOptions(targetId, modeId, {
    unit: options.unit,
    precision: options.precision,
    suffix: options.suffix,
    scaleRatio: options.scaleRatio
  });

  const meta = {
    targetLabel: opts.target.label,
    modeLabel: opts.mode.label,
    empty: false
  };

  const emptyResult = () => ({ text: '', count: 0, ...meta, empty: true });

  if (!CAD_SOURCE_IDS.includes(sourceId)) {
    throw new Error(`Unknown CAD handoff source: "${sourceId}". Valid sources: ${CAD_SOURCE_IDS.join(', ')}`);
  }

  // ------------------------------------------------------------------
  // WORKSPACE — full format parity with CAD Clipboard (formatCadWorkspace)
  // ------------------------------------------------------------------
  if (sourceId === 'workspace') {
    const ws = sourceData && sourceData.workspace;
    if (!ws || !Array.isArray(ws.entries)) return emptyResult();

    const scope = sourceData.scope || 'all';
    const selectedIds = sourceData.selectedIds instanceof Set ? sourceData.selectedIds : new Set();

    const filtered = ws.entries.filter(e => {
      if (e.enabled === false) return false;
      if (scope === 'selected') return selectedIds.has(e.id);
      if (scope === 'segments') return e.dimensionType === 'segment' || !e.dimensionType;
      if (scope === 'references') return e.dimensionType === 'reference';
      if (scope === 'allowances') return e.dimensionType === 'allowance';
      return true;
    });
    if (filtered.length === 0) return emptyResult();

    const toVal = m => (opts.targetValue === 'drawing' ? m / opts.scaleRatio : m);

    if (opts.delimiter === 'tsv' || opts.delimiter === 'csv') {
      const esc = opts.delimiter === 'csv' ? escapeCSV : escapeTSV;
      const sep = opts.delimiter === 'csv' ? ',' : '\t';
      const header = ['#', 'Name', `Value (${opts.unit})`, `Drawing @ 1:${opts.scaleRatio} (${opts.unit})`, 'Type', 'Notes'].map(esc).join(sep);
      const rows = filtered.map((e, idx) => {
        const realM = typeof e.realMeters === 'number' && isFinite(e.realMeters) ? e.realMeters : 0;
        return [
          idx + 1,
          esc(e.name || `Dimension ${idx + 1}`),
          formatCadValue(toVal(realM), { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
          formatCadValue(realM / opts.scaleRatio, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
          (e.dimensionType || 'segment').toUpperCase(),
          esc(e.notes || '')
        ].join(sep);
      });
      return { text: [header, ...rows].join('\n'), count: filtered.length, ...meta, empty: false };
    }

    const numbers = filtered.map(e => {
      const realM = typeof e.realMeters === 'number' && isFinite(e.realMeters) ? e.realMeters : 0;
      return formatCadValue(toVal(realM), { unit: opts.unit, precision: opts.precision, suffix: opts.suffix });
    });
    return { text: numbers.join('\n'), count: numbers.length, ...meta, empty: false };
  }

  // ------------------------------------------------------------------
  // EXPRESSION — single canonical value
  // ------------------------------------------------------------------
  if (sourceId === 'expression') {
    const expr = sourceData && sourceData.result;
    if (!expr || !expr.isValid || typeof expr.canonicalMeters !== 'number') return emptyResult();
    const valM = opts.targetValue === 'drawing'
      ? expr.canonicalMeters / opts.scaleRatio
      : expr.canonicalMeters;
    const text = formatCadValue(valM, { unit: opts.unit, precision: opts.precision, suffix: opts.suffix });
    return { text, count: 1, ...meta, empty: false };
  }

  // ------------------------------------------------------------------
  // MULTI-SCALE — one drawing value per compared scale
  // ------------------------------------------------------------------
  if (sourceId === 'multiscale') {
    const ms = sourceData && sourceData.result;
    // compareAcrossScales() emits `.scales`; accept `.results` alias.
    const scaleRows = ms && Array.isArray(ms.scales) ? ms.scales : (ms && Array.isArray(ms.results) ? ms.results : null);
    if (!scaleRows || scaleRows.length === 0) return emptyResult();

    if (opts.delimiter === 'tsv' || opts.delimiter === 'csv') {
      const esc = opts.delimiter === 'csv' ? escapeCSV : escapeTSV;
      const sep = opts.delimiter === 'csv' ? ',' : '\t';
      const header = ['Scale', `Drawing Length (${opts.unit})`, 'Paper'].map(esc).join(sep);
      const rows = scaleRows.map(r => [
        esc(r.label || `1:${r.ratio}`),
        formatCadValue(r.drawingMeters, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
        esc(r.fitsPaper === true ? `Fits ${r.paperSize || 'paper'}` : (r.fitsPaper === false ? 'Exceeds paper' : '—'))
      ].join(sep));
      return { text: [header, ...rows].join('\n'), count: scaleRows.length, ...meta, empty: false };
    }

    const values = scaleRows.map(r =>
      formatCadValue(r.drawingMeters, { unit: opts.unit, precision: opts.precision, suffix: opts.suffix })
    );
    return { text: values.join('\n'), count: values.length, ...meta, empty: false };
  }

  // ------------------------------------------------------------------
  // CHAIN — segments / cumulative / pipe / schedule (reuses chain engine output)
  // ------------------------------------------------------------------
  if (sourceId === 'chain') {
    const chain = sourceData && sourceData.result;
    if (!chain || !Array.isArray(chain.segments)) return emptyResult();

    const active = chain.segments.filter(s => s.enabled !== false && s.isValid !== false);
    if (active.length === 0) return emptyResult();

    const layout = normalizeChainLayout(sourceData.chainLayout || options.chainLayout);

    // Named pipe-formatted summary: 1200 | 1800 | 900
    if (layout === 'pipe') {
      return {
        text: formatNumberList(active.map(s => segLengthM(s)), { ...opts, delimiter: 'pipe', suffix: 'none' }),
        count: active.length,
        ...meta,
        empty: false
      };
    }

    // Full named schedule: name / start / end / length / drawing / type
    if (layout === 'schedule' || opts.delimiter === 'tsv' || opts.delimiter === 'csv') {
      const rows = chainScheduleRows(chain, opts);
      const esc = opts.delimiter === 'csv' ? escapeCSV : escapeTSV;
      const sep = opts.delimiter === 'csv' ? ',' : '\t';
      const header = ['#', 'Segment', `Start (${opts.unit})`, `End (${opts.unit})`, `Length (${opts.unit})`, `Drawing @ 1:${opts.scaleRatio}`, 'Type']
        .map(esc).join(sep);
      const body = rows.map((r, idx) => [
        idx + 1,
        esc(r.name),
        formatCadValue(r.start, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
        formatCadValue(r.end, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
        formatCadValue(r.length, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
        formatCadValue(r.drawing, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
        r.type
      ].join(sep));
      return { text: [header, ...body].join('\n'), count: rows.length, ...meta, empty: false };
    }

    // Cumulative running coordinates: 0 1200 3000 ...
    if (layout === 'cumulative') {
      const coords = [0];
      let running = 0;
      active.forEach(s => {
        if (s.dimensionType !== 'reference') {
          running += segLengthM(s);
          coords.push(opts.targetValue === 'drawing' ? running / opts.scaleRatio : running);
        }
      });
      return {
        text: formatNumberList(coords, { ...opts, suffix: 'none' }),
        count: coords.length,
        ...meta,
        empty: false
      };
    }

    // Default: segment lengths in chain order (order is preserved — pinned by tests)
    return {
      text: formatNumberList(active.map(s => segLengthM(s)), opts),
      count: active.length,
      ...meta,
      empty: false
    };
  }

  // ------------------------------------------------------------------
  // BATCH — preserves batch row order and names; valid-only filtering
  // ------------------------------------------------------------------
  if (sourceId === 'batch') {
    const batch = sourceData && sourceData.result;
    if (!batch || !Array.isArray(batch.rows)) return emptyResult();

    let rows = batch.rows;
    if (sourceData.selectedOnly && sourceData.selectedIds instanceof Set && sourceData.selectedIds.size > 0) {
      rows = rows.filter(r => sourceData.selectedIds.has(r.id));
    }
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) return emptyResult();

    if (opts.delimiter === 'tsv' || opts.delimiter === 'csv') {
      const esc = opts.delimiter === 'csv' ? escapeCSV : escapeTSV;
      const sep = opts.delimiter === 'csv' ? ',' : '\t';
      const header = ['#', 'Name', `Value (${opts.unit})`, 'Type'].map(esc).join(sep);
      const body = validRows.map((r, idx) => [
        idx + 1,
        esc(r.name || `Dimension ${idx + 1}`),
        formatCadValue(r.targetCanonicalMeters, { unit: opts.unit, precision: opts.precision, suffix: 'none' }),
        (r.semanticRole || 'reference').toUpperCase()
      ].join(sep));
      return { text: [header, ...body].join('\n'), count: validRows.length, ...meta, empty: false };
    }

    const numbers = validRows.map(r =>
      formatCadValue(r.targetCanonicalMeters, { unit: opts.unit, precision: opts.precision, suffix: opts.suffix })
    );
    return { text: numbers.join('\n'), count: numbers.length, ...meta, empty: false };
  }

  // ------------------------------------------------------------------
  // QUICK DIMENSION — single evaluated value (real or drawing)
  // ------------------------------------------------------------------
  if (sourceId === 'quick') {
    const res = sourceData && sourceData.result;
    if (!res || !res.valid || typeof res.canonicalMeters !== 'number') return emptyResult();
    const valM = opts.targetValue === 'drawing'
      ? res.canonicalMeters / opts.scaleRatio
      : res.canonicalMeters;
    const text = formatCadValue(valM, { unit: opts.unit, precision: opts.precision, suffix: opts.suffix });
    return { text, count: 1, ...meta, empty: false };
  }

  // ------------------------------------------------------------------
  // MANUAL — free numeric text (reuse existing manual formatter behavior)
  // ------------------------------------------------------------------
  if (sourceId === 'manual') {
    const raw = sourceData && sourceData.rawText;
    if (typeof raw !== 'string' || !raw.trim()) return emptyResult();
    const unitDef = requireUnit(opts.unit === 'ft-in' ? 'mm' : opts.unit, 'length');
    const tokens = raw.trim().split(/[\s,+/]+/).filter(t => t.length > 0);
    const meters = [];
    tokens.forEach(tok => {
      const num = parseFloat(tok);
      if (!isNaN(num) && isFinite(num)) {
        meters.push(num * unitDef.toMeters);
      }
    });
    if (meters.length === 0) return emptyResult();
    return { text: formatNumberList(meters, opts), count: meters.length, ...meta, empty: false };
  }

  return emptyResult();
}

/**
 * Builds a human-readable summary line for the handoff UI.
 */
export function getCadHandoffSummary(payload) {
  if (!payload || payload.empty) return 'No values available for the selected source';
  const unit = payload.unit || '';
  return `${payload.count} ${payload.count === 1 ? 'value' : 'values'} → ${payload.targetLabel} • ${payload.modeLabel}${unit ? ` (${unit})` : ''}`;
}

/**
 * Validates that a proposed target/mode pair is usable; returns a controlled
 * error object instead of throwing for invalid user selections.
 *
 * @returns {{ ok: boolean, error: string|null }}
 */
export function validateCadHandoffSelection(targetId, modeId, sourceId) {
  if (!CAD_TARGET_PROFILES[targetId]) {
    return { ok: false, error: `Unknown CAD target "${targetId}". Choose one of: ${CAD_TARGET_IDS.join(', ')}.` };
  }
  if (!CAD_COPY_MODES[modeId]) {
    return { ok: false, error: `Unknown copy mode "${modeId}". Choose one of: ${CAD_COPY_MODE_IDS.join(', ')}.` };
  }
  if (sourceId && !CAD_SOURCE_IDS.includes(sourceId)) {
    return { ok: false, error: `Unknown source "${sourceId}".` };
  }
  return { ok: true, error: null };
}

// Re-export for UI convenience so the UI never imports two CAD modules.
export { formatCadValue, getCadFormatSummary } from './cad-clipboard.js';

/**
 * Format a calculated stair result into standard Autodesk Revit Stair Type & Instance parameters.
 * @param {Object} stairResult
 * @returns {string} Text block formatted for Revit parameter entry
 */
export function formatRevitStairParameters(stairResult) {
  if (!stairResult || !stairResult.geometry || !stairResult.risers || !stairResult.treads) return '';
  const g = stairResult.geometry;
  const riserHeightM = stairResult.risers.heightMeters;
  const treadDepthM = stairResult.treads.depthMeters;
  const riserMm = (riserHeightM * 1000).toFixed(1);
  const treadMm = (treadDepthM * 1000).toFixed(1);
  const totalRiseMm = ((stairResult.input?.totalRiseMeters || (riserHeightM * stairResult.risers.count)) * 1000).toFixed(1);
  const totalRunMm = (g.totalRunMeters * 1000).toFixed(1);
  const riserCount = stairResult.risers.count;
  const blondelMm = ((stairResult.proportion?.twoRPlusTMeters || (2 * riserHeightM + treadDepthM)) * 1000).toFixed(1);

  return [
    '=== REVIT STAIR TYPE PROPERTIES (Assembled / Cast-in-Place) ===',
    `Maximum Riser Height = ${riserMm} mm`,
    `Minimum Tread Depth = ${treadMm} mm`,
    `Minimum Run Width = 1000.0 mm`,
    '',
    '=== REVIT STAIR INSTANCE DIMENSIONS ===',
    `Desired Number of Risers = ${riserCount}`,
    `Actual Number of Risers = ${riserCount}`,
    `Actual Riser Height = ${riserMm} mm`,
    `Actual Tread Depth = ${treadMm} mm`,
    `Total Run = ${totalRunMm} mm`,
    `Desired Stair Height (Base to Top) = ${totalRiseMm} mm`,
    `Blondel Calculation Rule (2R + T) = ${blondelMm} mm`
  ].join('\n');
}

/**
 * Format a calculated ramp result into standard Autodesk Revit Ramp Type & Instance parameters.
 * @param {Object} rampResult
 * @returns {string} Text block formatted for Revit parameter entry
 */
export function formatRevitRampParameters(rampResult) {
  if (!rampResult || !rampResult.geometry) return '';
  const g = rampResult.geometry;
  const f = rampResult.formatted;
  const riseMm = (g.riseMeters * 1000).toFixed(1);
  const runMm = (g.runMeters * 1000).toFixed(1);
  const maxIncline = Math.round(g.ratioValue * 10) / 10;

  return [
    '=== REVIT RAMP TYPE PROPERTIES ===',
    `Ramp Max Slope (1/x) = ${maxIncline}`,
    `Maximum Incline Ratio = 1 : ${maxIncline}`,
    `Shape = Straight Run`,
    '',
    '=== REVIT RAMP INSTANCE DIMENSIONS ===',
    `Base Offset to Top Offset (Total Rise) = ${riseMm} mm`,
    `Actual Horizontal Length (Run) = ${runMm} mm`,
    `Slope Percentage = ${f.slopePercent}`,
    `Slope Angle = ${f.angle}`
  ].join('\n');
}

void UNITS;
