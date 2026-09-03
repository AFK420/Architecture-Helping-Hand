/**
 * Architecture Helping Hand - Import Model (Phase 15, M10)
 * Normalized ingestion foundation: source text → classified entities →
 * import report. Pure core: no DOM, no fetch, no storage.
 *
 * Supported initial formats (documented scope — see IMPORTS.md):
 *   CSV/TSV  — dimension schedules: "label,value,unit" rows
 *   DXF      — ASCII R12+ LINE / LWPOLYLINE / POLYLINE / TEXT entities (2D)
 *   SVG      — line / rect / polyline / polygon / circle / text elements
 *
 * Every importer returns the SAME report shape:
 *   { ok, sourceType, entities, warnings, stats: { found, imported, units, scale, confidence } }
 *
 * Imported geometry is CANDIDATE data: coordinates are meters, flagged
 * NEEDS VERIFICATION until the user confirms scale. Nothing here mutates a
 * project — the imports view applies accepted entities to the plan state.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Parses a numeric string (dot or comma decimal), null when not numeric. */
export function parseNumeric(token) {
  if (typeof token !== 'string' || !token.trim()) return null;
  const cleaned = token.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const v = parseFloat(cleaned);
  return isFinite(v) ? v : null;
}

/** Infers the length unit from a header row or tokens; defaults to meters. */
export function inferUnit(tokens) {
  const joined = tokens.join(' ').toLowerCase();
  if (/\bmm\b/.test(joined)) return 'mm';
  if (/\bcm\b/.test(joined)) return 'cm';
  if (/\b(in|inch|inches)\b/.test(joined)) return 'in';
  if (/\b(ft|foot|feet)\b/.test(joined)) return 'ft';
  return 'm';
}

const UNIT_TO_METERS = Object.freeze({
  mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048
});

/** Converts a value in the given unit to canonical meters. */
export function toMeters(value, unit) {
  const factor = UNIT_TO_METERS[unit];
  if (factor === undefined || typeof value !== 'number' || !isFinite(value)) return null;
  return value * factor;
}

/** Detects the delimiter used in tabular text. */
export function detectImportDelimiter(text) {
  if (!text) return ',';
  const firstLine = text.split(/\r?\n/).find(l => l.trim()) || '';
  const counts = {
    '\t': (firstLine.match(/\t/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    ',': (firstLine.match(/,/g) || []).length
  };
  let best = ',';
  let bestCount = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = delim;
      bestCount = count;
    }
  }
  return bestCount > 0 ? best : ',';
}

// ---------------------------------------------------------------------------
// CSV / TSV importer — dimension schedules
// ---------------------------------------------------------------------------

/**
 * Imports a CSV/TSV dimension schedule. Expected shapes (header optional):
 *   label, width, depth [, unit]     → furniture/room footprint candidates
 *   label, length [, unit]           → linear measurement candidates
 * Accepts extra columns; ignores empty rows. Numbers may carry a unit suffix
 * in the value cell ("2400mm"); an explicit unit column wins.
 */
export function importCsvTable(text, { delimiter } = {}) {
  const report = {
    ok: false,
    sourceType: 'csv',
    entities: [],
    warnings: [],
    stats: { found: 0, imported: 0, units: 'm', scale: null, confidence: 'medium' }
  };
  if (typeof text !== 'string' || !text.trim()) {
    report.warnings.push('File is empty.');
    return report;
  }
  const delim = delimiter || detectImportDelimiter(text);
  const rows = text.split(/\r?\n/).map(r => r.split(delim).map(c => c.trim())).filter(r => r.some(c => c));
  if (rows.length === 0) {
    report.warnings.push('No rows found.');
    return report;
  }
  report.stats.found = rows.length;

  // Header detection: first row contains no numeric cell.
  const firstIsHeader = rows[0].every(c => parseNumeric(c.replace(/[a-z%]+/gi, '')) === null);
  const header = firstIsHeader ? rows[0].map(c => c.toLowerCase()) : null;
  const dataRows = firstIsHeader ? rows.slice(1) : rows;
  let unit = header ? inferUnit(header) : 'm';

  // An explicit "Unit" header column is authoritative for the whole file —
  // per-row unit cells below override it where present.
  let unitColumnIndex = -1;
  if (header) {
    const idx = header.findIndex(h => /^(unit|units|uom)$/.test(h.trim()));
    if (idx >= 0) unitColumnIndex = idx;
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.every(c => !c)) continue;
    let rowUnit = null;
    if (unitColumnIndex >= 0) {
      const cellUnit = (row[unitColumnIndex] || '').toLowerCase().match(/(mm|cm|in|ft|m)\b/);
      if (cellUnit) rowUnit = cellUnit[1];
    }
    const label = row[0] || `Row ${i + 1}`;
    const numericCells = [];
    const maxCol = unitColumnIndex >= 0 ? Math.min(row.length, unitColumnIndex) : row.length;
    for (let c = 1; c < maxCol; c++) {
      const cell = row[c];
      if (!cell) continue;
      const suffix = cell.toLowerCase().match(/(mm|cm|in|ft|m)\b/);
      const value = parseNumeric(cell.replace(/(mm|cm|in|ft|m)\b/gi, ''));
      if (value !== null) {
        numericCells.push({ value, unit: suffix ? suffix[1] : null });
      }
    }
    if (rowUnit) unit = rowUnit;
    if (numericCells.length === 0) {
      report.warnings.push(`Row ${i + 1} ("${label}"): no numeric value found — skipped.`);
      continue;
    }

    const meters = numericCells.map(nc => toMeters(nc.value, nc.unit || unit));
    if (meters.some(m => m === null)) {
      report.warnings.push(`Row ${i + 1} ("${label}"): unknown unit — skipped.`);
      continue;
    }
    if (meters.length >= 2) {
      report.entities.push({
        kind: 'furniture',
        name: label,
        width: meters[0],
        depth: meters[1],
        provenance: 'imported'
      });
    } else {
      report.entities.push({
        kind: 'measurement',
        name: label,
        value: meters[0],
        unit: 'm',
        provenance: 'imported'
      });
    }
    report.stats.imported++;
  }

  report.stats.units = unit;
  report.stats.confidence = report.warnings.length === 0 ? 'high' : (report.stats.imported > 0 ? 'medium' : 'low');
  report.ok = report.stats.imported > 0;
  if (!report.ok && report.warnings.length === 0) {
    report.warnings.push('No importable rows found.');
  }
  return report;
}

// ---------------------------------------------------------------------------
// DXF importer — ASCII 2D subset
// ---------------------------------------------------------------------------

/**
 * Imports LINE, LWPOLYLINE, POLYLINE (VERTEX chain), TEXT and CIRCLE
 * entities from an ASCII DXF. Coordinates are imported as-is into meters
 * (canonical app unit) with the declared $INSUNITS recorded when present.
 * Confidence is 'medium': DXF units are receiver-interpreted by convention.
 */
export function importDxf(text) {
  const report = {
    ok: false,
    sourceType: 'dxf',
    entities: [],
    warnings: [],
    stats: { found: 0, imported: 0, units: 'm', scale: null, confidence: 'medium' }
  };
  if (typeof text !== 'string' || !text.trim()) {
    report.warnings.push('File is empty.');
    return report;
  }
  const lines = text.split(/\r?\n/).map(l => l.trim());
  // Pair up (code, value) records
  const records = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i], 10);
    if (isNaN(code)) {
      // Resync on malformed pair (some DXFs carry extra whitespace)
      i -= 1;
      continue;
    }
    records.push({ code, value: lines[i + 1] });
  }

  // $INSUNITS header (code 70 inside $INSUNITS variable): 1=in, 2=ft, 4=mm, 5=cm, 6=m
  let unit = 'm';
  for (let i = 0; i < records.length; i++) {
    if (records[i].code === 9 && records[i].value === '$INSUNITS') {
      const next = records[i + 1];
      if (next && next.code === 70) {
        unit = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' }[next.value] || 'm';
      }
      break;
    }
  }
  report.stats.units = unit;
  const scale = UNIT_TO_METERS[unit];

  // Group entity records between 0-markers
  let current = null;
  const groups = [];
  for (const rec of records) {
    if (rec.code === 0) {
      if (current) groups.push(current);
      current = { type: rec.value, props: [] };
    } else if (current) {
      current.props.push(rec);
    }
  }
  if (current) groups.push(current);

  const prop = (group, code) => {
    const found = group.props.filter(p => p.code === code).map(p => parseNumeric(p.value));
    return found.length === 1 ? found[0] : found;
  };
  const text10 = group => {
    const t = group.props.find(p => p.code === 1);
    return t ? String(t.value) : '';
  };

  for (const g of groups) {
    report.stats.found++;
    if (g.type === 'LINE') {
      const x1 = prop(g, 10), y1 = prop(g, 20), x2 = prop(g, 11), y2 = prop(g, 20 + 1);
      const X1 = Array.isArray(x1) ? x1[0] : x1;
      const Y1 = Array.isArray(y1) ? y1[0] : y1;
      const X2 = Array.isArray(x2) ? x2[0] : x2;
      const Y2v = Array.isArray(prop(g, 21)) ? prop(g, 21)[0] : prop(g, 21);
      const Y2 = Array.isArray(Y2v) ? Y2v[0] : Y2v;
      if ([X1, Y1, X2, Y2].every(v => typeof v === 'number')) {
        report.entities.push({
          kind: 'line',
          name: text10(g) || 'Line',
          x1: X1 * scale, y1: Y1 * scale, x2: X2 * scale, y2: Y2 * scale,
          provenance: 'imported'
        });
        report.stats.imported++;
      }
    } else if (g.type === 'LWPOLYLINE' || g.type === 'POLYLINE') {
      const xs = g.props.filter(p => p.code === 10).map(p => parseNumeric(p.value));
      const ys = g.props.filter(p => p.code === (g.type === 'LWPOLYLINE' ? 20 : 10 + 10)).map(p => parseNumeric(p.value));
      const ysAlt = g.props.filter(p => p.code === 20).map(p => parseNumeric(p.value));
      const useYs = ys.length >= xs.length ? ys : ysAlt;
      if (xs.length >= 2 && useYs.length >= 2) {
        report.entities.push({
          kind: 'polyline',
          name: 'Polyline',
          points: xs.map((x, i) => [x * scale, (useYs[i] ?? useYs[useYs.length - 1]) * scale]),
          closed: g.type === 'POLYLINE',
          provenance: 'imported'
        });
        report.stats.imported++;
      }
    } else if (g.type === 'TEXT' || g.type === 'MTEXT') {
      const label = text10(g);
      if (label) {
        const x = prop(g, 10), y = prop(g, 20);
        const X = Array.isArray(x) ? x[0] : x;
        const Y = Array.isArray(y) ? y[0] : y;
        report.entities.push({
          kind: 'label',
          name: label.replace(/\\[A-Za-z0-9]+;/g, '').replace(/[{}]/g, ''),
          x: (typeof X === 'number' ? X : 0) * scale,
          y: (typeof Y === 'number' ? Y : 0) * scale,
          provenance: 'imported'
        });
        report.stats.imported++;
      }
    } else if (g.type === 'CIRCLE') {
      const cx = prop(g, 10), cy = prop(g, 20), r = prop(g, 40);
      const CX = Array.isArray(cx) ? cx[0] : cx;
      const CY = Array.isArray(cy) ? cy[0] : cy;
      const R = Array.isArray(r) ? r[0] : r;
      if (typeof R === 'number' && R > 0) {
        report.entities.push({
          kind: 'circle',
          name: 'Circle',
          cx: (typeof CX === 'number' ? CX : 0) * scale,
          cy: (typeof CY === 'number' ? CY : 0) * scale,
          radius: R * scale,
          provenance: 'imported'
        });
        report.stats.imported++;
      }
    }
  }

  if (report.stats.found > 0 && report.stats.imported === 0) {
    report.warnings.push('No supported 2D entities (LINE/LWPOLYLINE/TEXT/CIRCLE) found — the file may use unsupported entity types or binary DXF.');
  }
  if (unit === 'm') {
    report.warnings.push('No $INSUNITS header found — coordinates imported as meters. Verify the scale.');
  }
  report.stats.confidence = report.stats.imported > 0 ? 'medium' : 'low';
  report.ok = report.stats.imported > 0;
  return report;
}

// ---------------------------------------------------------------------------
// SVG importer — safe 2D geometry subset
// ---------------------------------------------------------------------------

/**
 * Imports geometry from SVG source using the browser DOMParser when
 * available (headless tests inject a tiny parser mock via options.parser).
 * Supports line, rect, polyline, polygon, circle, text. Transform attributes
 * are NOT applied (documented limitation) — flat-coordinate SVGs only.
 */
export function importSvg(text, { parser } = {}) {
  const report = {
    ok: false,
    sourceType: 'svg',
    entities: [],
    warnings: [],
    stats: { found: 0, imported: 0, units: 'm', scale: null, confidence: 'low' }
  };
  if (typeof text !== 'string' || !text.trim()) {
    report.warnings.push('File is empty.');
    return report;
  }

  let doc;
  try {
    const domParser = parser || (typeof DOMParser === 'function' ? new DOMParser() : null);
    if (!domParser) throw new Error('no parser');
    doc = domParser.parseFromString(text, 'image/svg+xml');
  } catch (e) {
    report.warnings.push('SVG could not be parsed.');
    return report;
  }
  const svgRoot = doc.querySelector ? doc.querySelector('svg') : null;
  if (!svgRoot) {
    report.warnings.push('No <svg> root element found.');
    return report;
  }

  // Optional scale: pxPerMeter user-declared; otherwise px→m at 100 px/m.
  const num = el => {
    const v = parseFloat(el);
    return isFinite(v) ? v : null;
  };

  const elements = svgRoot.querySelectorAll
    ? Array.from(svgRoot.querySelectorAll('line, rect, polyline, polygon, circle, text'))
    : [];
  report.stats.found = elements.length;

  for (const el of elements) {
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'line') {
      const x1 = num(el.getAttribute('x1')), y1 = num(el.getAttribute('y1'));
      const x2 = num(el.getAttribute('x2')), y2 = num(el.getAttribute('y2'));
      if ([x1, y1, x2, y2].every(v => v !== null)) {
        report.entities.push({ kind: 'line', name: 'Line', x1, y1, x2, y2, provenance: 'imported' });
        report.stats.imported++;
      }
    } else if (tag === 'rect') {
      const x = num(el.getAttribute('x')) || 0, y = num(el.getAttribute('y')) || 0;
      const w = num(el.getAttribute('width')), h = num(el.getAttribute('height'));
      if (w !== null && h !== null && w > 0 && h > 0) {
        report.entities.push({ kind: 'room', name: (el.getAttribute('data-name') || 'Rect').slice(0, 40), x, y, width: w, depth: h, provenance: 'imported' });
        report.stats.imported++;
      }
    } else if (tag === 'polyline' || tag === 'polygon') {
      const pointsAttr = el.getAttribute('points') || '';
      const nums = pointsAttr.trim().split(/[\s,]+/).map(num).filter(v => v !== null);
      if (nums.length >= 4) {
        const points = [];
        for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
        report.entities.push({ kind: 'polyline', name: tag === 'polygon' ? 'Polygon' : 'Polyline', points, closed: tag === 'polygon', provenance: 'imported' });
        report.stats.imported++;
      }
    } else if (tag === 'circle') {
      const cx = num(el.getAttribute('cx')), cy = num(el.getAttribute('cy')), r = num(el.getAttribute('r'));
      if (r !== null && r > 0) {
        report.entities.push({ kind: 'circle', name: 'Circle', cx: cx || 0, cy: cy || 0, radius: r, provenance: 'imported' });
        report.stats.imported++;
      }
    } else if (tag === 'text') {
      const label = (el.textContent || '').trim();
      if (label) {
        const x = num(el.getAttribute('x')) || 0, y = num(el.getAttribute('y')) || 0;
        report.entities.push({ kind: 'label', name: label.slice(0, 80), x, y, provenance: 'imported' });
        report.stats.imported++;
      }
    }
  }

  if (report.stats.found > 0 && report.stats.imported === 0) {
    report.warnings.push('No supported geometry found (transform matrices are not applied).');
  }
  report.warnings.push('SVG pixel coordinates were imported 1:1 into meters — set the true scale before trusting dimensions.');
  report.stats.confidence = report.stats.imported > 0 ? 'low' : 'low';
  report.ok = report.stats.imported > 0;
  return report;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/** Imports by explicit format id: 'csv' | 'dxf' | 'svg'. */
export function importSource(text, format, options = {}) {
  switch (format) {
    case 'csv':
    case 'tsv':
      return importCsvTable(text, options);
    case 'dxf':
      return importDxf(text);
    case 'svg':
      return importSvg(text, options);
    default:
      return {
        ok: false,
        sourceType: format || 'unknown',
        entities: [],
        warnings: [`Unsupported import format "${format}". Supported: CSV/TSV, DXF, SVG.`],
        stats: { found: 0, imported: 0, units: 'm', scale: null, confidence: 'low' }
      };
  }
}

/** Detects the likely format from content sniffing (best effort). */
export function detectImportFormat(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const head = text.slice(0, 2048);
  if (/^\s*<\?xml|<svg[\s>]/i.test(head)) return 'svg';
  if (/\bSECTION\b/.test(head) && /\bENTITIES\b/.test(text) && /\bAcDb/i.test(text)) return 'dxf';
  if (/\bLINE\b/.test(head) && /\s\d+\r?\n/.test(head)) return 'dxf';
  return 'csv';
}

/** Builds the user-facing summary lines from a report (rule 37). */
export function formatImportReport(report) {
  const s = report.stats || {};
  const lines = [];
  lines.push(`Imported: ${s.imported ?? 0} of ${s.found ?? 0} elements (${report.sourceType?.toUpperCase() || '?'})`);
  lines.push(`Units: ${s.units || 'm'} · Confidence: ${s.confidence || 'low'}`);
  if (report.warnings?.length) {
    lines.push(`Warnings (${report.warnings.length}):`);
    for (const w of report.warnings.slice(0, 5)) lines.push(`  ⚠ ${w}`);
    if (report.warnings.length > 5) lines.push(`  … and ${report.warnings.length - 5} more`);
  }
  return lines.join('\n');
}
