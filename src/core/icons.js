/**
 * Architecture Helping Hand — Original SVG Icon Registry
 *
 * A dedicated, original architectural/CAD visual language. No emoji, no
 * third-party icon sets: every glyph is a simple 24×24 stroke drawing drawn
 * specifically for this application's tool semantics (selection geometry,
 * wall sections, hinge swings, witness lines, cut planes, …).
 *
 * Contract:
 *   icon(name, { size })            -> inline <svg> markup (or '' if unknown)
 *   toolIcon(tool, { size })        -> resolves a STUDIO_TOOL_CATALOG entry by
 *                                      id, falling back tool.iconName → tool.id
 *                                      → category → generic
 *   docTypeIcon(type, { size })     -> plan document tab icons
 *   navIcon(id, { size })           -> sidebar navigation icons
 *   commandIcon(id, { size })       -> command palette icons
 *
 * All paths use stroke="currentColor" so themes and active states work.
 */

const P = {
  select: '<path d="M6 3l12 7.5-5.2 1.1L15 18l-2.4 1-2.2-6.3L6 15z"/>',
  marquee: '<rect x="4" y="6" width="13" height="11" rx="1" stroke-dasharray="3 2.4"/><path d="M19 4v3M21 5.5h-4" stroke-linecap="round"/>',
  lasso: '<path d="M12 5c4.4 0 8 2.2 8 5s-3.6 5-8 5c-1.5 0-2.9-.2-4.1-.7"/><path d="M8 14.5c-1.9 2.6-2.6 4.6-1.6 5.4 1.2 1 3.6-1 5.1-4"/>',
  line: '<circle cx="5" cy="19" r="1.8"/><circle cx="19" cy="5" r="1.8"/><path d="M6.3 17.7L17.7 6.3"/>',
  polyline: '<circle cx="4" cy="18" r="1.7"/><circle cx="12" cy="6" r="1.7"/><circle cx="20" cy="14" r="1.7"/><path d="M5.4 16.9L10.8 7.5M13.4 7.1l5.2 5.8"/>',
  wall: '<rect x="3" y="9" width="18" height="6" rx="0.5"/><path d="M9 9v6M15 9v6M3 12h6M15 12h6" stroke-width="1"/>',
  door: '<path d="M6 20V5.5A1.5 1.5 0 017.5 4H17"/><path d="M17 4a11 11 0 01-9.6 11.4" stroke-dasharray="2.6 2.4"/><circle cx="6" cy="20" r="1.4"/>',
  window: '<rect x="4" y="8" width="16" height="9" rx="0.6"/><path d="M4 12.5h16M12 8v9" stroke-width="1"/><path d="M12 8V4.5M7 8V6M17 8V6" stroke-linecap="round"/>',
  measure: '<circle cx="4.5" cy="19" r="1.5"/><circle cx="19.5" cy="19" r="1.5"/><path d="M6 19h12M6 16.5v5M18 16.5v5" stroke-width="1.2"/><path d="M9.5 17.2v1.6M12 17.2v1.6M14.5 17.2v1.6" stroke-width="1"/>',
  dimension: '<path d="M4 8v8M20 8v8" stroke-linecap="round"/><path d="M4 12h16M6.5 9.5L4 12l2.5 2.5M17.5 9.5L20 12l-2.5 2.5" stroke-width="1.2"/>',
  room: '<rect x="5" y="5" width="14" height="14" rx="1"/><path d="M9.5 9.5h5v5h-5z" stroke-width="1" stroke-dasharray="2.2 1.8"/>',
  polyroom: '<path d="M5 9l5-4 9 3v7l-6 4-8-3z" stroke-linejoin="round"/><circle cx="5" cy="9" r="1.1"/><circle cx="10" cy="5" r="1.1"/><circle cx="19" cy="8" r="1.1"/><circle cx="19" cy="15" r="1.1"/><circle cx="13" cy="19" r="1.1"/><circle cx="5" cy="16" r="1.1"/>',
  furniture: '<path d="M5 11V7.5A1.5 1.5 0 016.5 6h11A1.5 1.5 0 0119 7.5V11"/><path d="M4 11h16a1 1 0 011 1v3h-18v-3a1 1 0 011-1zM6 15v3M18 15v3" stroke-width="1.2"/>',
  column: '<rect x="9" y="4" width="6" height="16" rx="0.8"/><path d="M7 4h10M7 20h10M9 8v8M12 8v8M15 8v8" stroke-width="1"/>',
  grid: '<path d="M4 9h16M4 15h16M9 4v16M15 4v16" stroke-width="1.2" stroke-linecap="round"/><circle cx="9" cy="9" r="0.9" fill="currentColor" stroke="none"/>',
  stair: '<path d="M4 20h4v-4h4v-4h4V8h4" stroke-linejoin="round"/><path d="M4 20L20 8" stroke-dasharray="2.4 2.2" stroke-width="1"/>',
  ramp: '<path d="M3 19h18M4 19L20 9" stroke-linecap="round"/><path d="M8.5 14.8l0 2.4M12.5 12.4v2.4M16.5 10v2.4" stroke-width="1"/><circle cx="4" cy="19" r="1.2"/>',
  section: '<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="4 2.4"/><path d="M12 3v18" stroke-linecap="round"/><path d="M12 3l-2.4 2.6M12 3l2.4 2.6" stroke-width="1.1" stroke-linecap="round"/>',
  elevation: '<path d="M4 20V8l8-4 8 4v12" stroke-linejoin="round"/><path d="M4 20h16M9 20v-5h6v5" stroke-width="1.1"/>',
  hatch: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12l8-8M4 20L20 4M12 20l8-8" stroke-width="0.9"/>',
  north: '<circle cx="12" cy="12" r="8.5"/><path d="M12 5.5l2.8 9-2.8-2-2.8 2z" fill="currentColor" stroke="none"/><path d="M12 15.5v3" stroke-width="1"/>',
  curve: '<path d="M4 19c8 0 12-6 16-15" stroke-linecap="round"/><circle cx="4" cy="19" r="1.5"/><circle cx="20" cy="4" r="1.5"/>',
  fillet: '<path d="M4 20V10C4 6.7 6.7 4 10 4h10" stroke-linecap="round"/><path d="M4 20l2.5-2.5M20 4l-2.5 2.5" stroke-width="1"/>',
  offset: '<path d="M4 18L18 4M8 20L20 8" stroke-linecap="round"/><path d="M14 4h4v4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  move: '<path d="M12 3v18M3 12h18" stroke-linecap="round"/><path d="M12 3l-2.2 2.2M12 3l2.2 2.2M12 21l-2.2-2.2M12 21l2.2-2.2M3 12l2.2-2.2M3 12l2.2 2.2M21 12l-2.2-2.2M21 12l-2.2 2.2" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  rotate: '<path d="M20 12a8 8 0 11-2.3-5.6" stroke-linecap="round"/><path d="M20 3v4h-4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  scale: '<rect x="4" y="10" width="7" height="7" rx="0.8"/><rect x="13" y="4" width="10" height="10" rx="0.8" stroke-dasharray="2.6 2" /><path d="M9.5 15.5L16 9M16 9h-3.4M16 9v3.4" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  trim: '<path d="M5 19L15 9" stroke-linecap="round"/><path d="M9 5h10v10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2.2"/><path d="M15 9l4 4M15 9l-4 4" stroke-width="1.1" stroke-linecap="round"/>',
  extend: '<path d="M4 19L12 11" stroke-linecap="round"/><path d="M12 11l8-8M14 3h6v6" stroke-dasharray="3 2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  join: '<circle cx="5" cy="19" r="1.7"/><circle cx="19" cy="5" r="1.7"/><path d="M6.5 17.5C10 14 14 10 17.5 6.5M12 4.5l3.8 1M19.5 12l-1-3.8" stroke-width="1.1" stroke-linecap="round"/>',
  explode: '<rect x="8" y="8" width="8" height="8" rx="0.8" stroke-dasharray="2.4 2"/><path d="M10.5 5.5L12 8l1.5-2.5M18.5 10.5L16 12l2.5 1.5M13.5 18.5L12 16l-1.5 2.5M5.5 13.5L8 12l-2.5-1.5" stroke-width="1.1" stroke-linecap="round"/>',
  layer: '<path d="M12 4l8 4-8 4-8-4z" stroke-linejoin="round"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4" stroke-width="1.1" stroke-linejoin="round"/>',
  properties: '<path d="M5 7h14M5 12h14M5 17h14" stroke-linecap="round"/><circle cx="9" cy="7" r="1.8" fill="var(--bg, #18181b)"/><circle cx="15" cy="12" r="1.8" fill="var(--bg, #18181b)"/><circle cx="8" cy="17" r="1.8" fill="var(--bg, #18181b)"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>',
  zoom_in: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5M8 10.5h5M10.5 8v5" stroke-linecap="round"/>',
  zoom_out: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5M8 10.5h5" stroke-linecap="round"/>',
  fit: '<path d="M4 9V5.5A1.5 1.5 0 015.5 4H9M15 4h3.5A1.5 1.5 0 0120 5.5V9M20 15v3.5a1.5 1.5 0 01-1.5 1.5H15M9 20H5.5A1.5 1.5 0 014 18.5V15" stroke-linecap="round"/><rect x="9.5" y="9.5" width="5" height="5" rx="0.6" stroke-width="1"/>',
  top: '<rect x="4" y="4" width="16" height="16" rx="1" transform="skewX(0)"/><path d="M4 4l4-2h12l-4 2M20 4l-4-2" stroke-width="1" stroke-linejoin="round" opacity="0.55"/>',
  front: '<rect x="5" y="6" width="14" height="13" rx="0.8"/><path d="M5 10h14M9 10v9M15 10v9" stroke-width="1"/><path d="M5 6l2.5-2h14L19 6" stroke-width="1" stroke-linejoin="round" opacity="0.55"/>',
  right: '<path d="M4 6h11l5 4v10H4z" stroke-linejoin="round"/><path d="M15 6v4h5M4 10h11M8 6v4" stroke-width="1" opacity="0.9"/>',
  perspective: '<path d="M4 18L8 6h8l4 12z" stroke-linejoin="round"/><path d="M8 6l3 12M16 6l-3 12M4 18h16" stroke-width="0.9" opacity="0.7"/>',
  view4: '<rect x="4" y="4" width="7" height="7" rx="0.8"/><rect x="13" y="4" width="7" height="7" rx="0.8" stroke-dasharray="2.4 1.8"/><rect x="4" y="13" width="7" height="7" rx="0.8" stroke-dasharray="2.4 1.8"/><rect x="13" y="13" width="7" height="7" rx="0.8"/>',
  pan: '<path d="M9 11V5.8a1.4 1.4 0 012.8 0V11m0-3.2a1.4 1.4 0 012.8 0V11m0-2.2a1.4 1.4 0 012.8 0V14c0 3.3-2.2 6-5.6 6-2.6 0-4-1-5.4-3.2L4.6 14c-.8-1.2.8-2.6 2-1.6l1.6 1.4" stroke-linejoin="round" stroke-linecap="round"/>',
  orbit: '<circle cx="12" cy="12" r="3.2"/><path d="M2.5 12c0-2 4.3-3.6 9.5-3.6s9.5 1.6 9.5 3.6-4.3 3.6-9.5 3.6S2.5 14 2.5 12z" transform="rotate(-24 12 12)" stroke-width="1.1"/>',
  undo: '<path d="M8 6L4 10l4 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10h10a6 6 0 016 6v0" stroke-linecap="round"/>',
  redo: '<path d="M16 6l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 10H10a6 6 0 00-6 6v0" stroke-linecap="round"/>',
  delete: '<path d="M5 7h14M10 7V5.5A1.5 1.5 0 0111.5 4h1A1.5 1.5 0 0114 5.5V7M7 7l1 12a1.5 1.5 0 001.5 1.4h5A1.5 1.5 0 0016 19l1-12M10.2 10.5l.4 6M13.8 10.5l-.4 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.15"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="1.4"/><path d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5" stroke-linecap="round" stroke-width="1.1"/>',
  command: '<path d="M8 5L3.5 12 8 19M16 5l4.5 7L16 19" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5l-3 11" stroke-linecap="round" stroke-width="1.1"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2" stroke-linecap="round"/><path d="M3.5 12a8.5 8.5 0 011.4-4.7" opacity="0.5"/>',
  ai: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" stroke-linejoin="round"/><circle cx="18.5" cy="16.5" r="1.6"/><circle cx="6" cy="17.5" r="1.2"/><path d="M7.4 16.8l2.6-1.4M15.2 15.9l1.8.4" stroke-width="1" opacity="0.7"/>',
  suggest: '<path d="M12 4v3M5.6 6.6l2.1 2.1M4 13h3M17.5 8.7l2.1-2.1M20 13h-3" stroke-linecap="round"/><path d="M9.5 13a2.5 2.5 0 115 0c0 1.4-1 2-1 3.4h-3c0-1.4-1-2-1-3.4z" stroke-linejoin="round"/><path d="M10.5 19h3M11 21h2" stroke-linecap="round" stroke-width="1"/>',
  sheet: '<path d="M6 3h9l4 4v14H6z" stroke-linejoin="round"/><path d="M15 3v4h4M9 12h7M9 15.5h7M9 8.5h3" stroke-width="1" stroke-linecap="round"/>',
  detail: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3" stroke-width="1"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" stroke-linecap="round"/>',
  home: '<path d="M4 11l8-7 8 7" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 9.5V20h11V9.5M10 20v-5.5h4V20" stroke-width="1.1" stroke-linejoin="round"/>',
  converter: '<path d="M4 8h13M14 4.5L17.5 8 14 11.5M20 16H7M10 12.5L6.5 16l3.5 3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  rescale: '<path d="M4 14l5-5 4 4 7-7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6h5v5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20h16" stroke-width="1" opacity="0.5"/>',
  detector: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20" stroke-linecap="round"/><path d="M7.5 10a2.5 2.5 0 012.5-2.5" stroke-width="1" stroke-linecap="round" opacity="0.7"/>',
  area: '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3.4 2.4"/><path d="M8 16v-3.5M8 12.5h3M13 8h3.5v8" stroke-width="1.2" stroke-linecap="round"/>',
  volume: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" stroke-linejoin="round"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" stroke-width="0.9" opacity="0.7"/>',
  workspace: '<rect x="3.5" y="5" width="17" height="12" rx="1.2"/><path d="M3.5 8.5h17M7 5v3.5" stroke-width="1"/><path d="M8 20h8" stroke-linecap="round"/>',
  expression: '<path d="M5 7h6M8 4.5v5M14 5.5l5 5M19 5.5l-5 5" stroke-linecap="round"/><path d="M5 17h2.5l1.5 3 2-6 1.5 3H19" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.15"/>',
  multiscale: '<path d="M4 18h16M4 13h10M4 8h5" stroke-linecap="round"/><path d="M17 4v10M17 14l-2.5-2.5M17 14l2.5-2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  chains: '<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4" stroke-linecap="round"/>',
  clipboard: '<rect x="5" y="5" width="14" height="16" rx="1.4"/><path d="M9 5V3.8A1.3 1.3 0 0110.3 2.5h3.4A1.3 1.3 0 0115 3.8V5M8.5 10.5h7M8.5 14h7M8.5 17.5h4.5" stroke-linecap="round" stroke-width="1.1"/>',
  batch: '<path d="M4 6h10M4 10h7M4 14h10M4 18h7" stroke-linecap="round"/><path d="M16.5 4.5l4 3.5-4 3.5M20.5 8H13" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.15"/>',
  handoff: '<path d="M4 7h9l3 3-3 3H4z" stroke-linejoin="round"/><path d="M13 10h7M17 7.5L20 10l-3 2.5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.1"/><path d="M4 16h16" stroke-width="1" opacity="0.5" stroke-dasharray="2.6 2"/>',
  reference: '<path d="M5 4h6a2 2 0 012 2v13a1.6 1.6 0 00-1.6-1.6H5z" stroke-linejoin="round"/><path d="M19 4h-6a2 2 0 00-2 2v13a1.6 1.6 0 011.6-1.6H19z" stroke-linejoin="round" stroke-width="0.9" opacity="0.75"/>',
  projects: '<path d="M3.5 7.5A1.5 1.5 0 015 6h4l2 2.5h8A1.5 1.5 0 0120.5 10v7A1.5 1.5 0 0119 18.5H5A1.5 1.5 0 013.5 17z" stroke-linejoin="round"/>',
  survey: '<path d="M4 20L14.5 9.5M4 20h16" stroke-linecap="round"/><path d="M4 20L4 6M4 6l10.5 3.5" stroke-dasharray="2.6 2" stroke-width="0.9"/><circle cx="16.5" cy="7.5" r="2.5"/><path d="M18.5 9.5L20.5 11.5" stroke-linecap="round"/>',
  imports: '<rect x="4" y="4" width="16" height="16" rx="1.4"/><path d="M12 7.5v7M12 14.5L9 11.5M12 14.5l3-3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 17h9" stroke-width="1" opacity="0.6" stroke-linecap="round"/>',
  export: '<rect x="4" y="4" width="16" height="16" rx="1.4"/><path d="M12 16.5v-7M12 9.5L9 12.5M12 9.5l3 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 7h9" stroke-width="1" opacity="0.6" stroke-linecap="round"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" stroke-linecap="round"/>',
  save: '<path d="M5 4h11l3 3v13H5z" stroke-linejoin="round"/><path d="M8 4v5h7V4M8 20v-6h8v6" stroke-width="1.1" stroke-linejoin="round"/>',
  studio: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16l3-8 2.5 5 1.5-3 1.5 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"/>',
  generic: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z" stroke-width="1"/>'
};

const ICONS = {
  select: P.select, marquee: P.marquee, lasso: P.lasso, line: P.line, polyline: P.polyline,
  wall: P.wall, door: P.door, window: P.window, measure: P.measure, dimension: P.dimension,
  room: P.room, polyroom: P.polyroom, furniture: P.furniture, column: P.column, grid: P.grid,
  stair: P.stair, ramp: P.ramp, section: P.section, elevation: P.elevation, hatch: P.hatch,
  north: P.north, curve: P.curve, fillet: P.fillet, offset: P.offset, move: P.move,
  rotate: P.rotate, scale: P.scale, trim: P.trim, extend: P.extend, join: P.join,
  explode: P.explode, layer: P.layer, properties: P.properties, info: P.info,
  zoom_in: P.zoom_in, zoom_out: P.zoom_out, fit: P.fit, top: P.top, front: P.front,
  right: P.right, perspective: P.perspective, view4: P.view4, pan: P.pan, orbit: P.orbit,
  undo: P.undo, redo: P.redo, delete: P.delete, copy: P.copy, command: P.command,
  history: P.history, ai: P.ai, suggest: P.suggest, sheet: P.sheet, detail: P.detail,
  home: P.home, converter: P.converter, rescale: P.rescale, detector: P.detector,
  area: P.area, volume: P.volume, workspace: P.workspace, expression: P.expression,
  multiscale: P.multiscale, chains: P.chains, clipboard: P.clipboard, batch: P.batch,
  handoff: P.handoff, reference: P.reference, projects: P.projects, survey: P.survey,
  imports: P.imports, export: P.export, settings: P.settings, save: P.save,
  studio: P.studio,
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5" stroke-linecap="round"/>',
  surface: '<path d="M3 14l9-5 9 5-9 5z" stroke-linejoin="round"/><path d="M3 14v3l9 5 9-5v-3M12 9v9" stroke-width="0.9" stroke-linejoin="round" opacity="0.7"/>',
  solid: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" stroke-linejoin="round"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" stroke-width="0.9" opacity="0.7"/>',
  boolean: '<circle cx="9.5" cy="12" r="5.5"/><circle cx="14.5" cy="12" r="5.5" stroke-dasharray="2.6 2"/><path d="M12 7.2a5.5 5.5 0 010 9.6" stroke-width="1.4"/>',
  pushpull: '<path d="M5 14l7-4 7 4-7 4z" stroke-linejoin="round"/><path d="M12 10V4M12 4l-2.2 2.2M12 4l2.2 2.2" stroke-linecap="round"/>',
  mesh: '<path d="M4 18L8 7l4 11 4-11 4 11z" stroke-linejoin="round"/><path d="M6.2 14.5h11.6M8 7l2.2 7.5L12 7l1.8 7.5L16 7" stroke-width="0.8" opacity="0.7"/>',
  subd: '<rect x="6" y="6" width="12" height="12" rx="4"/><rect x="3.5" y="3.5" width="17" height="17" rx="6" stroke-dasharray="2.8 2.2" stroke-width="1"/>',
  block: '<rect x="4" y="4" width="10" height="10" rx="1.2"/><rect x="10" y="10" width="10" height="10" rx="1.2" stroke-dasharray="2.6 2"/><path d="M4 4l6 6" stroke-width="0.9" opacity="0.7"/>',
  visible: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  persona_studio: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16" stroke-width="1"/><path d="M4 4l16 16" stroke-width="0.8" opacity="0.6"/>',
  persona_autocad: '<path d="M4 18L12 4l8 14" stroke-linejoin="round"/><path d="M8 13h8" stroke-linecap="round"/><path d="M4 21h16" stroke-width="1" opacity="0.6"/>',
  persona_rhino: '<path d="M4 18V8a4 4 0 014-4h4a4 4 0 014 4v10" stroke-linejoin="round"/><path d="M8 18v-6h8v6" stroke-width="1" opacity="0.8"/><path d="M20 18v3" stroke-linecap="round"/>',
  persona_photoshop: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8.5 16.5v-9h2.8a2.4 2.4 0 010 4.8H8.5M13.5 13.5a2.75 2.75 0 105.5 0c0-2.2-5.5-1.4-5.5-3.6" stroke-width="1.1" opacity="0"/>',
  persona_sketchup: '<path d="M4 17l8-4 8 4-8 4z" stroke-linejoin="round"/><path d="M12 13V4M4 17l8-9 8 9" stroke-width="0.9" stroke-linejoin="round" opacity="0.7"/>',
  hidden: '<path d="M4 4l16 16" stroke-linecap="round"/><path d="M9.9 5.2A10 10 0 0112 5c6 0 9.5 7 9.5 7a17 17 0 01-2.9 3.5M6.2 6.9A16.6 16.6 0 002.5 12s3.5 7 9.5 7a10 10 0 004-.8" stroke-width="1.1"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.4"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" stroke-width="1.2"/>',
  unlock: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.4"/><path d="M8.5 10.5V8a3.5 3.5 0 016.6-1.7" stroke-width="1.2"/>',
  generic: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z" stroke-width="1"/>'
};

/**
 * Tool-catalog ids that do not have a glyph of their own map onto the closest
 * semantic icon (dim_aligned → dimension, view_south → front, …). Tool ids
 * present in ICONS resolve directly.
 */
const TOOL_ALIASES = {
  dim_aligned: 'dimension', dim_chain: 'chains', area_calc: 'area',
  crop_tool: 'marquee', paint_bucket: 'hatch', watercolor_brush: 'hatch',
  zoom_extents: 'fit', view_top: 'top', view_south: 'front',
  view_perspective: 'perspective', view_4split: 'view4',
  curve_nurbs: 'curve', curve_fillet: 'fillet', curve_offset: 'offset',
  curve_boolean: 'boolean', surface_planar: 'surface', surface_extrude: 'pushpull',
  surface_loft: 'surface', surface_revolve: 'surface',
  solid_box: 'solid', boolean_union: 'boolean', boolean_diff: 'boolean',
  pushpull: 'pushpull', mesh_from_srf: 'mesh', quad_remesh: 'mesh',
  subd_box: 'subd', subd_crease: 'subd', block_create: 'block',
  cpanel_properties: 'properties', cpanel_layers: 'layer',
  cpanel_validation: 'info', cpanel_details: 'detail',
  flyout_stairs: 'stair', flyout_hatching: 'hatch', flyout_marquee: 'marquee',
  stair_l_shape: 'stair', stair_u_shape: 'stair',
  hatch_concrete: 'hatch', hatch_earth: 'hatch', hatch_insulation: 'hatch', hatch_brick: 'hatch',
  marquee_rect: 'marquee', marquee_ellip: 'marquee', marquee_single_row: 'marquee',
  lasso_poly: 'lasso', lasso_magnetic: 'lasso',
  section_cut: 'section', detail_callout: 'detail',
  north: 'north'
};

/** Persona ids → icon names. */
const PERSONA = {
  studio: 'persona_studio', autocad: 'persona_autocad', rhino: 'persona_rhino',
  photoshop: 'persona_photoshop', sketchup: 'persona_sketchup'
};

/** Tool-category ids → icon names. */
const CATEGORY = {
  measuring: 'measure', selection_cropping: 'marquee', retouching_painting: 'hatch',
  selection_navigation: 'pan', drawing: 'line', standard_cpanels: 'properties',
  set_view: 'perspective', curve_tools: 'curve', surface_tools: 'surface',
  solid_tools: 'solid', mesh_tools: 'mesh', subd: 'subd', containers: 'block',
  cascades_flyouts: 'layer', ribbon_tabs: 'workspace', ribbon_panels: 'workspace'
};

/** Map plan document types to icon names. */
const DOC_TYPES = {
  '2d_plan': 'room',
  '3d_massing': 'perspective',
  'elevation': 'elevation',
  'section': 'section',
  'detail': 'detail',
  'sheet': 'sheet',
  'view_4split': 'view4',
  '4view': 'view4'
};

/** Sidebar navigation ids -> icon names. */
const NAV = {
  home: 'home', converter: 'converter', rescale: 'rescale', detector: 'detector',
  area_volume: 'area', workspace: 'workspace', expression: 'expression',
  multiscale: 'multiscale', chains: 'chains', cad_clipboard: 'clipboard',
  batch_cad: 'batch', cad_handoff: 'handoff', stairs: 'stair', ramps: 'ramp',
  slopes: 'measure', furniture: 'furniture', reference: 'reference',
  projects: 'projects', plan: 'room', survey: 'survey', imports: 'imports',
  export: 'export', ai: 'ai', ai_settings: 'settings'
};

/** Command palette command ids -> icon names (fallback: generic). */
const COMMANDS = {
  nav_home: 'home', nav_converter: 'converter', nav_plan: 'room', nav_ai: 'ai',
  nav_stairs: 'stair', nav_ramps: 'ramp', nav_projects: 'projects',
  nav_export: 'export', nav_imports: 'imports', nav_survey: 'survey',
  nav_furniture: 'furniture', nav_reference: 'reference',
  tool_palette: 'select', zoom_fit: 'fit', undo: 'undo', redo: 'redo',
  save_project: 'save', export_report: 'export', analyze_plan: 'ai'
};

const cache = new Map();

function icon(name, options = {}) {
  const body = ICONS[name] || ICONS.generic;
  const size = options.size || 24;
  const key = `${name}@${size}`;
  if (!cache.has(key)) {
    cache.set(key, `<svg class="ahh-icon ahh-icon-${name}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);
  }
  return cache.get(key);
}

/**
 * Resolve the icon for a tool-catalog entry: explicit iconName, then the
 * tool's own id, then a semantic alias, then a generic glyph. Never emoji.
 */
export function toolIcon(tool, options = {}) {
  if (!tool || typeof tool !== 'object') return icon('generic', options);
  const name = ICONS[tool.iconName] ? tool.iconName
    : ICONS[tool.id] ? tool.id
    : TOOL_ALIASES[tool.id] || null;
  return icon(name || 'generic', options);
}

export function categoryIcon(id, options = {}) {
  return icon(CATEGORY[id] || 'generic', options);
}

export function personaIcon(id, options = {}) {
  return icon(PERSONA[id] || 'generic', options);
}

export function docTypeIcon(type, options = {}) {
  return icon(DOC_TYPES[type] || 'sheet', options);
}

export function navIcon(id, options = {}) {
  return icon(NAV[id] || 'generic', options);
}

export function commandIcon(id, options = {}) {
  return icon(COMMANDS[id] || 'generic', options);
}

export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

export { icon, ICONS, TOOL_ALIASES, CATEGORY, PERSONA, DOC_TYPES, NAV, COMMANDS };
