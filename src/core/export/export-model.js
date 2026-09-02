/**
 * Architecture Helping Hand - Universal Export Model
 * Phase: Universal Export Center.
 *
 * One normalized export architecture for the whole application. Tools
 * produce (or already hold) project data; this module shapes it into a
 * provenance-stamped export document and provides PURE serializers for
 * every supported format. Side effects (download/clipboard/print) live in
 * services/export.js — nothing here touches the DOM.
 *
 * Formats: JSON (round-trip), TXT (human-readable), CSV, TSV, SVG (vector),
 * DXF (conservative 2D subset). PDF is handled by the print stylesheet +
 * window.print() (services), not by a heavy library.
 *
 * Every export carries provenance: source, format, timestamp, projectId.
 */

import { serializeProject, validateProject } from '../project.js';
import { escapeTSV, escapeCSV } from '../cad-clipboard.js';

/** Format identifiers. */
export const EXPORT_FORMATS = Object.freeze({
  JSON: 'json',
  TXT: 'txt',
  CSV: 'csv',
  TSV: 'tsv',
  SVG: 'svg',
  DXF: 'dxf'
});

/** Content-type mapping for downloads. */
export const EXPORT_CONTENT_TYPES = Object.freeze({
  json: 'application/json',
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  svg: 'image/svg+xml',
  dxf: 'application/dxf'
});

/** Human-readable format descriptions for the export UI. */
export const EXPORT_FORMAT_INFO = Object.freeze({
  json: 'Full structured export — round-trips back into the project system.',
  txt: 'Human-readable report of the exported data.',
  csv: 'Comma-separated schedule (RFC-4180 escaping).',
  tsv: 'Tab-separated schedule — CAD/spreadsheet friendly.',
  svg: 'Vector drawing of geometry (chains, plans, diagrams).',
  dxf: 'AutoCAD DXF (ASCII R12 subset: LINE, POLYLINE, TEXT). Conservative 2D only.'
});

/** Provenance stamp embedded in every export document. */
export function createExportProvenance(source, format, projectId = null, extra = {}) {
  return {
    application: 'Architecture Helping Hand',
    source,
    format,
    projectId,
    exportedAt: new Date().toISOString(),
    ...extra
  };
}

// ---------------------------------------------------------------------------
// Data collection: normalized table shape used by tabular serializers
// ---------------------------------------------------------------------------

/**
 * Normalizes arbitrary exportable content into a table description:
 * { title, columns: [{key,label}], rows: [{...}] } — consumed by CSV/TSV/TXT.
 *
 * @param {string} title
 * @param {Array<{key:string,label:string}>} columns
 * @param {Array<Object>} rows
 */
export function createExportTable(title, columns, rows) {
  return { title, columns, rows };
}

/** Collects the workspace (dimensions) as a normalized table. */
export function workspaceToTable(workspace) {
  if (!workspace || !Array.isArray(workspace.entries)) return null;
  return createExportTable(
    'Dimension Schedule',
    [
      { key: 'name', label: 'Name' },
      { key: 'rawInput', label: 'Input' },
      { key: 'type', label: 'Type' },
      { key: 'realMeters', label: 'Real (m)' },
      { key: 'drawingMeters', label: 'Drawing (m)' },
      { key: 'notes', label: 'Notes' }
    ],
    workspace.entries.map(e => ({
      name: e.name || 'Dimension',
      rawInput: e.rawInput || '',
      type: (e.dimensionType || 'segment').toUpperCase(),
      realMeters: typeof e.realMeters === 'number' ? e.realMeters : '',
      drawingMeters: typeof e.realMeters === 'number' && workspace.scaleRatio ? e.realMeters / workspace.scaleRatio : '',
      notes: e.notes || ''
    }))
  );
}

/** Collects chain segments as a normalized table. */
export function chainToTable(calculatedChain) {
  if (!calculatedChain || !Array.isArray(calculatedChain.segments)) return null;
  return createExportTable(
    `Dimension Chain — ${calculatedChain.name || 'Chain'}`,
    [
      { key: 'index', label: '#' },
      { key: 'name', label: 'Segment' },
      { key: 'startMeters', label: 'Start (m)' },
      { key: 'endMeters', label: 'End (m)' },
      { key: 'lengthMeters', label: 'Length (m)' },
      { key: 'type', label: 'Type' }
    ],
    calculatedChain.segments
      .filter(s => s.enabled !== false && s.isValid !== false)
      .map((s, idx) => ({
        index: idx + 1,
        name: s.name || `Segment ${idx + 1}`,
        startMeters: s.startMeters,
        endMeters: s.endMeters,
        lengthMeters: typeof s.lengthMeters === 'number' ? s.lengthMeters : (typeof s.realMeters === 'number' ? s.realMeters : 0),
        type: (s.dimensionType || 'segment').toUpperCase()
      }))
  );
}

/** Collects a stair result as a normalized single-row table. */
export function stairToTable(stairResult) {
  if (!stairResult || !stairResult.valid) return null;
  const g = stairResult.geometry;
  return createExportTable(
    'Stair Calculation',
    [
      { key: 'risers', label: 'Risers' },
      { key: 'goings', label: 'Goings' },
      { key: 'riserHeight', label: 'Riser (m)' },
      { key: 'treadDepth', label: 'Going (m)' },
      { key: 'totalRise', label: 'Total Rise (m)' },
      { key: 'totalRun', label: 'Total Run (m)' },
      { key: 'angle', label: 'Angle (°)' },
      { key: 'twoRPlusT', label: '2R+T (m)' }
    ],
    [{
      risers: stairResult.risers.count,
      goings: stairResult.treads.count,
      riserHeight: stairResult.risers.heightMeters,
      treadDepth: stairResult.treads.depthMeters,
      totalRise: stairResult.input.totalRiseMeters,
      totalRun: g.totalRunMeters,
      angle: g.angleDegrees,
      twoRPlusT: stairResult.proportion.twoRPlusTMeters
    }]
  );
}

/** Collects a ramp/slope result (shared geometry shape) as a table. */
export function slopeToTable(geometryResult, kindLabel) {
  if (!geometryResult || !geometryResult.valid || !geometryResult.geometry) return null;
  const g = geometryResult.geometry;
  return createExportTable(
    kindLabel || 'Slope Calculation',
    [
      { key: 'rise', label: 'Rise (m)' },
      { key: 'run', label: 'Run (m)' },
      { key: 'slopePercent', label: 'Slope (%)' },
      { key: 'ratio', label: 'Ratio (1:X)' },
      { key: 'angle', label: 'Angle (°)' },
      { key: 'flight', label: 'Flight Length (m)' }
    ],
    [{
      rise: g.riseMeters,
      run: g.runMeters,
      slopePercent: g.slopePercent,
      ratio: g.ratioValue,
      angle: g.angleDegrees,
      flight: g.flightLengthMeters !== undefined ? g.flightLengthMeters : (g.slopedLengthMeters !== undefined ? g.slopedLengthMeters : '')
    }]
  );
}

/** Collects project decisions as a normalized table. */
export function decisionsToTable(project) {
  if (!project || !Array.isArray(project.decisions)) return null;
  return createExportTable(
    'Design Decisions',
    [
      { key: 'id', label: 'ID' },
      { key: 'kind', label: 'Kind' },
      { key: 'name', label: 'Name' },
      { key: 'createdAt', label: 'Created' },
      { key: 'data', label: 'Result Data (JSON)' }
    ],
    project.decisions.map(d => ({
      id: d.id || '',
      kind: d.kind || '',
      name: d.name || '',
      createdAt: d.createdAt || '',
      data: d.result ? JSON.stringify(d.result) : ''
    }))
  );
}

/** Collects project notes as a normalized table. */
export function notesToTable(project) {
  if (!project || !Array.isArray(project.notes)) return null;
  return createExportTable(
    'Project Notes',
    [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'body', label: 'Note' },
      { key: 'createdAt', label: 'Created' }
    ],
    project.notes.map(n => ({
      id: n.id || '',
      title: n.title || 'Note',
      body: n.body || n.text || '',
      createdAt: n.createdAt || ''
    }))
  );
}

// ---------------------------------------------------------------------------
// Pure serializers
// ---------------------------------------------------------------------------

/** Serializes a table to TSV (with header). Reuses CAD-safe escaping. */
export function tableToTSV(table) {
  if (!table) return '';
  const header = table.columns.map(c => escapeTSV(c.label)).join('\t');
  const rows = table.rows.map(row => table.columns.map(c => escapeTSV(row[c.key])).join('\t'));
  return [table.title, header, ...rows].join('\n');
}

/** Serializes a table to CSV (with header). Reuses RFC-4180 escaping. */
export function tableToCSV(table) {
  if (!table) return '';
  const header = table.columns.map(c => escapeCSV(c.label)).join(',');
  const rows = table.rows.map(row => table.columns.map(c => escapeCSV(row[c.key])).join(','));
  return [escapeCSV(table.title), header, ...rows].join('\n');
}

/** Serializes a table to human-readable TXT. */
export function tableToTXT(table) {
  if (!table) return '';
  const lines = [table.title.toUpperCase(), '='.repeat(Math.max(table.title.length, 8)), ''];
  for (const row of table.rows) {
    for (const col of table.columns) {
      const val = row[col.key];
      lines.push(`${col.label}: ${val === '' ? '—' : val}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Full JSON export of a project document (round-trip capable).
 * Provenance lives in a sibling envelope, never inside the project itself,
 * so the project part re-imports cleanly.
 */
export function serializeProjectJSON(project, provenance) {
  const check = validateProject(project);
  if (!check.ok) {
    throw new Error(`Cannot export invalid project: ${check.errors[0]}`);
  }
  return JSON.stringify({
    _provenance: provenance || createExportProvenance('project', EXPORT_FORMATS.JSON, project.id),
    project
  }, null, 2);
}

/**
 * Parses a JSON export back into a validated project document.
 * Throws on malformed input; callers decide recovery policy.
 */
export function deserializeProjectJSON(json) {
  const parsed = JSON.parse(json);
  const project = parsed && typeof parsed === 'object' && parsed.project ? parsed.project : parsed;
  const check = validateProject(project);
  if (!check.ok) {
    throw new Error(`Imported document is not a valid project: ${check.errors[0]}`);
  }
  return project;
}

// ---------------------------------------------------------------------------
// DXF writer — conservative ASCII R12 subset
// ---------------------------------------------------------------------------

/**
 * DXF scope (documented limitation): ASCII R12, ENTITIES section only with
 * LINE, POLYLINE (as LWPOLLINE-free classic VERTEX chain), TEXT, and CIRCLE.
 * Coordinates are plain 2D (X, Y); no layers beyond '0', no blocks, no dims,
 * no 3D. Units are interpreted by the recipient — exported values are the
 * canonical meters multiplied by the caller's scale (mm by default).
 */

function dxfPair(code, value) {
  return `${code}\n${value}`;
}

function dxfLine(x1, y1, x2, y2, layer = '0') {
  return [
    dxfPair(0, 'LINE'),
    dxfPair(8, layer),
    dxfPair(10, x1), dxfPair(20, y1),
    dxfPair(11, x2), dxfPair(21, y2)
  ].join('\n');
}

function dxfPolyline(points, layer = '0', closed = false) {
  const parts = [
    dxfPair(0, 'POLYLINE'),
    dxfPair(8, layer),
    dxfPair(66, 1),
    dxfPair(70, closed ? 1 : 0)
  ];
  for (const [x, y] of points) {
    parts.push(dxfPair(0, 'VERTEX'));
    parts.push(dxfPair(8, layer));
    parts.push(dxfPair(10, x));
    parts.push(dxfPair(20, y));
  }
  parts.push(dxfPair(0, 'SEQEND'));
  return parts.join('\n');
}

function dxfText(x, y, text, height = 0.2, layer = '0') {
  const safe = String(text).replace(/[\r\n]+/g, ' ');
  return [
    dxfPair(0, 'TEXT'),
    dxfPair(8, layer),
    dxfPair(10, x), dxfPair(20, y),
    dxfPair(40, height),
    dxfPair(1, safe)
  ].join('\n');
}

/**
 * Builds a DXF document from a normalized entity list.
 *
 * @param {Array<Object>} entities - { type: 'line'|'polyline'|'text'|'circle', ... }
 *   line: { x1, y1, x2, y2 }
 *   polyline: { points: [[x,y]...], closed }
 *   text: { x, y, text, height }
 *   circle: { x, y, r }
 * @param {Object} [options] - { scale (default 1000 → m to mm), header }
 * @returns {string} DXF text
 */
export function buildDXF(entities, options = {}) {
  const scale = typeof options.scale === 'number' && options.scale > 0 ? options.scale : 1000;
  const list = Array.isArray(entities) ? entities : [];
  const S = v => (v * scale).toFixed(4);

  const body = [];
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    if (e.type === 'line') {
      body.push(dxfLine(S(e.x1), S(e.y1), S(e.x2), S(e.y2), e.layer || '0'));
    } else if (e.type === 'polyline' && Array.isArray(e.points) && e.points.length >= 2) {
      body.push(dxfPolyline(e.points.map(p => [S(p[0]), S(p[1])]), e.layer || '0', !!e.closed));
    } else if (e.type === 'text') {
      body.push(dxfText(S(e.x), S(e.y), e.text || '', (e.height || 0.2) * scale, e.layer || '0'));
    } else if (e.type === 'circle') {
      body.push([
        dxfPair(0, 'CIRCLE'),
        dxfPair(8, e.layer || '0'),
        dxfPair(10, S(e.x)), dxfPair(20, S(e.y)),
        dxfPair(40, S(e.r || 0))
      ].join('\n'));
    }
  }

  return [
    dxfPair(0, 'SECTION'),
    dxfPair(2, 'HEADER'),
    dxfPair(9, '$ACADVER'), dxfPair(1, 'AC1009'),
    dxfPair(9, '$INSUNITS'), dxfPair(70, 4), // 4 = millimeters
    dxfPair(0, 'ENDSEC'),
    dxfPair(0, 'SECTION'),
    dxfPair(2, 'ENTITIES'),
    body.join('\n'),
    dxfPair(0, 'ENDSEC'),
    dxfPair(0, 'EOF')
  ].join('\n');
}

/** Chain geometry → DXF entities (closed room-style outline of cumulative points). */
export function chainToDXFEntities(calculatedChain) {
  if (!calculatedChain || !Array.isArray(calculatedChain.segments)) return [];
  const entities = [];
  for (const s of calculatedChain.segments) {
    if (s.enabled === false || s.isValid === false) continue;
    entities.push({
      type: 'line',
      x1: s.startMeters, y1: 0,
      x2: s.endMeters, y2: 0,
      layer: (s.dimensionType || 'segment') === 'reference' ? 'REF' : 'CHAIN'
    });
  }
  return entities;
}

/** Room rectangles → DXF entities (initial rectilinear scope). */
export function roomsToDXFEntities(rooms) {
  if (!Array.isArray(rooms)) return [];
  const entities = [];
  for (const room of rooms) {
    if (!room || typeof room.x !== 'number' || typeof room.y !== 'number') continue;
    const w = room.widthMeters ?? room.width ?? 0;
    const h = room.depthMeters ?? room.depth ?? 0;
    if (w <= 0 || h <= 0) continue;
    entities.push({
      type: 'polyline',
      closed: true,
      layer: 'ROOM',
      points: [
        [room.x, room.y],
        [room.x + w, room.y],
        [room.x + w, room.y + h],
        [room.x, room.y + h]
      ]
    });
    if (room.name) {
      entities.push({ type: 'text', x: room.x + w / 2 - 0.4, y: room.y + h / 2, text: room.name, height: 0.2 });
    }
  }
  return entities;
}

// ---------------------------------------------------------------------------
// SVG export (wraps existing diagram generators' output into a standalone file)
// ---------------------------------------------------------------------------

/**
 * Wraps SVG markup (from generateChainSVG / generateStairSVG / generateRampSVG
 * / generateSlopeSVG / the plan canvas) into a standalone, namespaced SVG
 * document with provenance metadata.
 */
export function wrapSVGDocument(svgMarkup, provenance) {
  if (typeof svgMarkup !== 'string' || !svgMarkup.includes('<svg')) {
    throw new Error('wrapSVGDocument requires valid SVG markup containing an <svg> element.');
  }
  const meta = provenance || createExportProvenance('diagram', EXPORT_FORMATS.SVG);
  const comment = `<!-- ${meta.application} | source: ${meta.source} | exported: ${meta.exportedAt} -->`;
  // Ensure xmlns exists on the root element
  const withNs = svgMarkup.includes('xmlns=')
    ? svgMarkup
    : svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${comment}\n${withNs}\n`;
}

/**
 * Master entry: serializes any supported export request.
 *
 * @param {Object} request
 * @param {string} request.format - one of EXPORT_FORMATS
 * @param {string} request.source - provenance label (e.g. 'dimension-workspace')
 * @param {Object} [request.project] - project document (JSON format / provenance)
 * @param {Array<Object>} [request.tables] - normalized tables (CSV/TSV/TXT)
 * @param {string} [request.svgMarkup] - SVG markup (SVG format)
 * @param {Array<Object>} [request.dxfEntities] - DXF entities (DXF format)
 * @param {string} [request.projectId]
 * @returns {{ content: string, contentType: string, fileName: string, provenance: Object }}
 */
export function buildExport(request) {
  const format = request && request.format;
  if (!Object.values(EXPORT_FORMATS).includes(format)) {
    throw new Error(`Unknown export format: "${format}". Supported: ${Object.values(EXPORT_FORMATS).join(', ')}`);
  }
  const provenance = createExportProvenance(request.source || 'unknown', format, request.projectId || null);
  const stamp = provenance.exportedAt.replace(/[:.]/g, '-').slice(0, 19);
  const baseName = (request.source || 'export').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();

  switch (format) {
    case EXPORT_FORMATS.JSON: {
      if (!request.project) throw new Error('JSON export requires a project document.');
      const content = serializeProjectJSON(request.project, provenance);
      return { content, contentType: EXPORT_CONTENT_TYPES.json, fileName: `${baseName}-${stamp}.json`, provenance };
    }
    case EXPORT_FORMATS.TXT: {
      const tables = (request.tables || []).filter(Boolean);
      if (tables.length === 0) throw new Error('TXT export requires at least one table.');
      return { content: tables.map(tableToTXT).join('\n'), contentType: EXPORT_CONTENT_TYPES.txt, fileName: `${baseName}-${stamp}.txt`, provenance };
    }
    case EXPORT_FORMATS.CSV: {
      const tables = (request.tables || []).filter(Boolean);
      if (tables.length === 0) throw new Error('CSV export requires at least one table.');
      return { content: tables.map(tableToCSV).join('\n'), contentType: EXPORT_CONTENT_TYPES.csv, fileName: `${baseName}-${stamp}.csv`, provenance };
    }
    case EXPORT_FORMATS.TSV: {
      const tables = (request.tables || []).filter(Boolean);
      if (tables.length === 0) throw new Error('TSV export requires at least one table.');
      return { content: tables.map(tableToTSV).join('\n'), contentType: EXPORT_CONTENT_TYPES.tsv, fileName: `${baseName}-${stamp}.tsv`, provenance };
    }
    case EXPORT_FORMATS.SVG: {
      if (!request.svgMarkup) throw new Error('SVG export requires svgMarkup.');
      return { content: wrapSVGDocument(request.svgMarkup, provenance), contentType: EXPORT_CONTENT_TYPES.svg, fileName: `${baseName}-${stamp}.svg`, provenance };
    }
    case EXPORT_FORMATS.DXF: {
      const entities = request.dxfEntities || [];
      const content = buildDXF(entities, { scale: request.dxfScale || 1000 });
      return { content, contentType: EXPORT_CONTENT_TYPES.dxf, fileName: `${baseName}-${stamp}.dxf`, provenance };
    }
    default:
      throw new Error('Unhandled export format.');
  }
}
