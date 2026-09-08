/**
 * Architecture Helping Hand — CAD Command Engine
 *
 * A real, interactive command system for the Plan workspace, in the spirit of
 * professional CAD command lines but built entirely on this project's own
 * deterministic engines:
 *
 *   - Command REGISTRY derives from the live STUDIO_TOOL_CATALOG (personas.js)
 *     plus drafting/view/system commands, so the AI, palette, shortcuts and
 *     command line all share one source of truth.
 *   - Interactive multi-step commands (LINE, WALL, RECT, DIST, …) run as an
 *     explicit prompt state machine: each step accepts a canvas point, a
 *     coordinate string ("10,20", "@5,0", "@5<90"), a unit-bearing length
 *     ("2400mm", "8'"), or an option token ("Width=0.3").
 *   - Coordinate/length input reuses src/core/parser.js — there is exactly one
 *     unit engine in the application.
 *   - Autocomplete ranks prefix/alias/fuzzy matches and boosts recent history.
 *   - History supports up/down replay, search, clear, and session persistence
 *     through an injected storage adapter.
 *
 * The engine is pure: it never touches the DOM. The UI (commandbar.js/plan.js)
 * supplies an executor and receives state transitions from step()/submit().
 */

import { parseInput } from './parser.js';
import { UNITS } from './units.js';
import { isExpressionLike, evaluateExpressionSafe } from './dimension-expression.js';

// ---------------------------------------------------------------------------
// Command lifecycle: IDLE → START → PROMPT → INPUT → PREVIEW → CONFIRM →
// EXECUTE → COMMIT → COMPLETE (or CANCELLED at any point). The session maps
// draft progress onto these states in state().
// ---------------------------------------------------------------------------
export const COMMAND_LIFECYCLE = Object.freeze([
  'IDLE', 'START', 'PROMPT', 'INPUT', 'PREVIEW', 'CONFIRM', 'EXECUTE', 'COMMIT', 'COMPLETE', 'CANCELLED'
]);

// ---------------------------------------------------------------------------
// Command definitions
// Each def: name, aliases[], description, category, interactive?, steps[],
// options[], result, selection ('none'|'optional'|'required'), undo,
// shortcut, help (usage text), aiDescription (for AI tool recommendation).
// ---------------------------------------------------------------------------

/**
 * Interactive drafting commands. steps describe the prompts in order:
 *   point  — a canvas/coordinate input
 *   length — a unit-bearing numeric input
 *   index  — an integer
 * Options are named settings the user can set mid-command ("Width=0.3").
 */
const INTERACTIVE = [
  {
    id: 'cmd.line',
    name: 'LINE', aliases: ['L', 'LINESEG'],
    description: 'Draw a straight line between two points',
    category: 'draw',
    selection: 'none',
    undo: true,
    help: "LINE → First point → Second point. Example: LINE 0,0 2m+400mm",
    aiDescription: 'Creates one straight 2D line segment between two picked or typed points.',
    steps: [
      { kind: 'point', prompt: 'First point' },
      { kind: 'point', prompt: 'Second point', relative: true, preview: 'line' }
    ],
    result: 'create_line'
  },
  {
    id: 'cmd.wall',
    name: 'WALL', aliases: ['W'],
    description: 'Draw an architectural wall with thickness and alignment options',
    category: 'draw',
    selection: 'none',
    undo: true,
    options: [
      { token: 'WIDTH', label: 'Width', kind: 'length', min: 0.05, max: 2, fallback: 0.2 },
      { token: 'ALIGN', label: 'Align', kind: 'option', values: ['Center', 'Left', 'Right'], fallback: 'Center' },
      { token: 'REVERSE', label: 'Reverse', kind: 'boolean', fallback: false }
    ],
    steps: [
      { kind: 'point', prompt: 'Wall start point' },
      { kind: 'point', prompt: 'Wall end point', relative: true, preview: 'wall' }
    ],
    result: 'create_wall_points',
    help: "WALL → Start point → End point. Options: Width=0.2, Align=Center|Left|Right, Reverse=true. Example: WALL 0,0 @4m<0",
    aiDescription: 'Creates an architectural wall segment between two points with configurable thickness and alignment.'
  },
  {
    name: 'RECTANGLE', aliases: ['REC', 'RECT'],
    id: 'cmd.rectangle',
    description: 'Draw a rectangular room from two corners',
    category: 'draw',
    selection: 'none',
    undo: true,
    help: 'RECTANGLE → First corner → Opposite corner. Example: REC 0,0 4,3',
    aiDescription: 'Creates a rectangular room entity from two opposite corner points.',
    steps: [
      { kind: 'point', prompt: 'First corner' },
      { kind: 'point', prompt: 'Opposite corner', relative: true, preview: 'rect' }
    ],
    result: 'create_room_points'
  },
  {
    id: 'cmd.dist',
    name: 'DIST', aliases: ['DI', 'MEASURE'],
    description: 'Measure the distance and angle between two points',
    category: 'inquiry',
    selection: 'none',
    undo: false,
    help: 'DIST → First point → Second point. Result is reported, not drawn.',
    aiDescription: 'Reports the deterministic distance, angle and delta between two points.',
    steps: [
      { kind: 'point', prompt: 'First point' },
      { kind: 'point', prompt: 'Second point', relative: true }
    ],
    result: 'measure_points'
  },
  {
    id: 'cmd.dimlin',
    name: 'DIMLIN', aliases: ['DIM', 'DAL', 'DCO'],
    description: 'Place a linear dimension between two points',
    category: 'annotate',
    selection: 'none',
    undo: true,
    help: 'DIMLIN → Dimension start → Dimension end. Example: DIMLIN 0,0 4.2,0',
    aiDescription: 'Places a linear dimension entity measuring the span between two points.',
    steps: [
      { kind: 'point', prompt: 'Dimension start' },
      { kind: 'point', prompt: 'Dimension end', relative: true }
    ],
    result: 'create_dimension'
  }
];

/** Non-interactive commands executed in one shot. args: [] = none accepted. */
const SIMPLE = [
  { name: 'UNDO', aliases: ['U'], description: 'Undo the last action', category: 'edit', run: 'undo' },
  { name: 'REDO', aliases: ['R'], description: 'Redo the previously undone action', category: 'edit', run: 'redo' },
  { name: 'DELETE', aliases: ['E', 'ERASE', 'DEL'], description: 'Delete the current selection', category: 'edit', run: 'delete' },
  { name: 'ZOOM', aliases: ['Z'], description: 'Zoom: ZOOM E (extents), ZOOM 100, ZOOM IN, ZOOM OUT', category: 'view', run: 'zoom' },
  { name: 'PAN', aliases: ['P'], description: 'Activate the pan tool (drag to pan)', category: 'view', run: 'pan' },
  { name: 'FIT', aliases: ['ZE', 'ZOOMEXTENTS'], description: 'Zoom to fit all content', category: 'view', run: 'zoom_extents' },
  { name: 'TOP', aliases: ['PLAN'], description: 'Switch to the plan (top) view', category: 'view', run: 'view_top' },
  { name: 'FRONT', aliases: ['ELEV', 'SOUTH'], description: 'Switch to the front (south) elevation', category: 'view', run: 'view_front' },
  { name: 'RIGHT', aliases: ['EAST'], description: 'Switch to the right (east) elevation', category: 'view', run: 'view_right' },
  { name: 'PERSPECTIVE', aliases: ['PERSP', '3D', 'MASSING'], description: 'Switch to the 3D massing view', category: 'view', run: 'view_perspective' },
  { name: '4VIEW', aliases: ['SPLIT', 'QUAD'], description: 'Switch to the 4-viewport workspace', category: 'view', run: 'view_4split' },
  { name: 'SELECT', aliases: ['SEL', 'V'], description: 'Activate the selection tool', category: 'tool', run: 'tool:select' },
  { name: 'SELECTALL', aliases: ['ALL', 'CTRLA'], description: 'Select every entity in the document', category: 'tool', run: 'select_all' },
  { name: 'PROPERTIES', aliases: ['PROPS', 'CH'], description: 'Inspect the current selection in the properties panel', category: 'inquiry', run: 'properties' },
  { name: 'INFO', aliases: ['INSPECT'], description: 'Show detailed information about the current selection', category: 'inquiry', run: 'info' },
  { name: 'SUGGEST', aliases: ['SUGGESTIONS'], description: 'Ranked, evidence-backed suggestions for the current selection or document', category: 'ai', run: 'suggest' },
  { name: 'ISSUES', aliases: ['AUDIT'], description: 'Deterministic project audit — geometry, rooms, doors, dimensions, documentation', category: 'ai', run: 'issues' },
  { name: 'AI', aliases: ['ASK', 'AIQUERY'], description: 'Ask the AI about the current selection: AI <question…>', category: 'ai', run: 'ai_query' },
  { name: 'ANALYZE', aliases: ['AICRITIQUE'], description: 'Project-wide AI review with deterministic evidence', category: 'ai', run: 'ai_analyze' },
  { name: 'LAYER', aliases: ['LA'], description: 'Open the layers panel', category: 'organize', run: 'panel:layers' },
  { name: 'HELP', aliases: ['?'], description: 'List commands: HELP [search…]', category: 'system', run: 'help' }
];

/**
 * Builds the full command registry. toolCatalog entries that expose a
 * commandAlias become instant tool-activation commands, so the palette,
 * shortcuts and the command line stay a single source of truth.
 */
export function buildCommandRegistry(toolCatalog = []) {
  const commands = new Map();
  const aliasIndex = new Map();

  function register(def) {
    commands.set(def.name, def);
    aliasIndex.set(def.name.toLowerCase(), def.name);
    for (const a of def.aliases || []) aliasIndex.set(a.toLowerCase(), def.name);
  }

  for (const def of INTERACTIVE) {
    register({ ...def, interactive: true, aliases: [...(def.aliases || [])] });
  }
  for (const def of SIMPLE) register({
    ...def,
    id: def.id || 'cmd.' + def.name.toLowerCase(),
    interactive: false,
    aliases: [...(def.aliases || [])],
    selection: def.selection || 'none',
    undo: def.undo !== undefined ? def.undo : (def.category === 'edit'),
    aiDescription: def.aiDescription || def.description
  });

  for (const tool of toolCatalog) {
    if (!tool || !tool.commandAlias) continue;
    const alias = String(tool.commandAlias).toUpperCase();
    if (aliasIndex.has(alias.toLowerCase())) continue;
    register({
      name: alias,
      aliases: [],
      id: 'cmd.tool.' + tool.id,
      description: tool.description || `Activate ${tool.name} tool`,
      category: 'tool',
      run: `tool:${tool.id}`,
      toolId: tool.id,
      toolName: tool.name,
      shortcut: tool.shortcut || null,
      selection: 'none',
      undo: false,
      aiDescription: `Activates the ${tool.name} tool on the canvas.`
    });
  }

  return { commands, aliasIndex };
}

// ---------------------------------------------------------------------------
// Coordinate & numeric input (single unit engine: parseInput)
// ---------------------------------------------------------------------------

/**
 * Parses a point token: "10,20", "10,20,0", "@5,0" (relative), "@5<90"
 * (polar relative), or a bare unit-bearing length for guided entry.
 * @returns {{ value: {x,y}, relative: boolean } | { error: string }}
 */
export function parsePointToken(token, lastPoint = null) {
  if (!token || typeof token !== 'string') return { error: 'Enter a coordinate like 10,20 or @5<90.' };
  const t = token.trim();
  if (!t) return { error: 'Enter a coordinate like 10,20 or @5<90.' };

  if (t.startsWith('@')) {
    const rest = t.slice(1);
    const polar = rest.match(/^([^<]+)<(.+)$/);
    if (polar) {
      const dist = parseLengthToken(polar[1]);
      if (dist.error) return { error: dist.error };
      const ang = parseInput(polar[2].replace(/°|deg|°/gi, ''));
      if (!ang.isValid) return { error: `Invalid angle "${polar[2]}" — try @5<90.` };
      const rad = (ang.value * Math.PI) / 180;
      return { value: { x: dist.value * Math.cos(rad), y: dist.value * Math.sin(rad) }, relative: true };
    }
    const parts = rest.split(',');
    if (parts.length < 2) return { error: 'Relative entry needs @dx,dy (or @dist<angle).' };
    const dx = parseLengthToken(parts[0]);
    const dy = parseLengthToken(parts[1]);
    if (dx.error) return { error: dx.error };
    if (dy.error) return { error: dy.error };
    return { value: { x: dx.value, y: dy.value }, relative: true };
  }

  const parts = t.split(',');
  if (parts.length >= 2) {
    const x = parseLengthToken(parts[0]);
    const y = parseLengthToken(parts[1]);
    if (x.error) return { error: x.error };
    if (y.error) return { error: y.error };
    return { value: { x: x.value, y: y.value }, relative: false };
  }

  if (lastPoint) {
    // Guided length entry while the cursor previews a direction.
    const len = parseLengthToken(t);
    if (!len.error) return { value: { x: len.value, y: 0 }, relative: true, guided: true };
  }
  return { error: `"${t}" is not a coordinate — try 10,20 · @5,0 · @5<90 · 2400mm.` };
}

/** Parses a unit-bearing length: expressions ("2m+400mm") via the math
 *  engine, single values via the shared parser ("2400mm", "2.4m", "8'"). */
export function parseLengthToken(token) {
  const t = String(token ?? '').trim();
  // Expression path: any input with an operator runs through the
  // deterministic math engine (same units, same parser family).
  if (/[+\-*/%^]/.test(t.slice(1)) && isExpressionLike(t)) {
    const res = evaluateExpressionSafe(t, { defaultUnit: 'm', displayUnit: 'm' });
    if (res.isValid && (res.dimension === 'length' || res.dimension === 'scalar')) {
      return { value: res.value };
    }
    if (res.isValid && (res.dimension === 'area' || res.dimension === 'volume')) {
      return { error: `"${t}" results in an ${res.dimension} — a point or length is required here (e.g. 2m+400mm).` };
    }
    // fall through to parseInput for non-expression strings
  }
  const res = parseInput(t, { allowNegative: true });
  if (!res.isValid) {
    return { error: `"${token}" is not a valid length — try 2400mm, 2.4m, 8', or an expression like 2m+400mm.` };
  }
  // parseInput returns the value in the DETECTED unit ("2400mm" → 2400 mm);
  // the command engine's canonical unit is meters (canvas world space).
  let meters = res.value;
  if (res.detectedUnit && UNITS[res.detectedUnit]?.toMeters) {
    meters = res.value * UNITS[res.detectedUnit].toMeters;
  }
  return { value: meters };
}

// ---------------------------------------------------------------------------
// Session: interactive multi-step state machine
// ---------------------------------------------------------------------------

export function createCommandSession({ registry, execute, storage = null, historyLimit = 100 } = {}) {
  if (!registry || !registry.commands) throw new Error('createCommandSession requires a registry');
  if (typeof execute !== 'function') throw new Error('createCommandSession requires an execute(command, args) function');

  let history = [];
  let historyCursor = -1;
  let draft = null; // active interactive command state
  let recents = [];

  // Restore session history
  if (storage) {
    try {
      const raw = storage.getItem('ahh_command_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) history = parsed.filter(x => typeof x === 'string').slice(-historyLimit);
      }
      const rawRecents = storage.getItem('ahh_command_recents');
      if (rawRecents) {
        const parsed = JSON.parse(rawRecents);
        if (Array.isArray(parsed)) recents = parsed.filter(x => typeof x === 'string').slice(0, 12);
      }
    } catch { /* corrupt storage is ignored by design */ }
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem('ahh_command_history', JSON.stringify(history.slice(-historyLimit)));
      storage.setItem('ahh_command_recents', JSON.stringify(recents.slice(0, 12)));
    } catch { /* quota — session history is best-effort */ }
  }

  function remember(raw) {
    // Consecutive duplicates collapse; cursor always restarts at the newest.
    if (history[history.length - 1] !== raw) {
      history.push(raw);
      if (history.length > historyLimit) history.shift();
    }
    historyCursor = -1;
    const verb = raw.trim().split(/\s+/)[0].toUpperCase();
    recents = [verb, ...recents.filter(r => r !== verb)].slice(0, 12);
    persist();
  }

  /**
   * Begin an interactive command programmatically (e.g. from a palette click).
   */
  function start(name) {
    const def = registry.commands.get(String(name).toUpperCase());
    if (!def || !def.interactive) return { ok: false, error: `"${name}" is not an interactive command.` };
    draft = { def, stepIndex: 0, points: [], options: {} };
    for (const opt of def.options || []) draft.options[opt.token] = opt.fallback;
    return { ok: true, state: state() };
  }

  function state() {
    if (!draft) return { active: false, lifecycle: 'IDLE' };
    const def = draft.def;
    const step = def.steps[draft.stepIndex];
    return {
      active: true,
      lifecycle: 'PROMPT',
      command: def.name,
      stepIndex: draft.stepIndex,
      stepCount: def.steps.length,
      prompt: `${step.prompt}:`,
      options: (def.options || []).map(o => ({ ...o, value: draft.options[o.token] })),
      collected: draft.points.length
    };
  }

  function cancel(reason = 'canceled') {
    const name = draft ? draft.def.name : null;
    draft = null;
    return { ok: true, message: name ? `${name} ${reason}.` : 'Nothing to cancel.' };
  }

  /**
   * Feed one line of input into the session. Handles: option tokens
   * ("Width=0.3"), point/length tokens for the current step, and completion.
   * @param {string} text - raw user text for this step
   * @param {{ currentPoint?: {x,y}, snap?: (p:{x,y})=>{x,y} }} ctx
   */
  function submit(text, ctx = {}) {
    if (!draft) return { ok: false, error: 'No active command.' };
    const def = draft.def;
    const trimmed = String(text || '').trim();
    if (!trimmed) return { ok: false, error: `${def.steps[draft.stepIndex].prompt}:` };

    // Option token? "WIDTH=0.3" / "ALIGN=Left" / bare option name cycles values
    const optMatch = trimmed.match(/^([A-Za-z]+)\s*=?\s*(.*)$/);
    if (optMatch && def.options) {
      const opt = def.options.find(o => o.token === optMatch[1].toUpperCase());
      if (opt) {
        let arg = optMatch[2].trim();
        // bare option name cycles/toggles its values (AutoCAD-style)
        if (!arg) {
          if (opt.kind === 'boolean') {
            draft.options[opt.token] = !draft.options[opt.token];
            return { ok: true, optionSet: { token: opt.token, value: draft.options[opt.token] }, state: state() };
          }
          if (opt.kind === 'option') {
            const i = opt.values.indexOf(draft.options[opt.token]);
            draft.options[opt.token] = opt.values[(i + 1) % opt.values.length];
            return { ok: true, optionSet: { token: opt.token, value: draft.options[opt.token] }, state: state() };
          }
          return { ok: false, error: `${opt.label} needs a value — e.g. ${opt.token}=${opt.fallback}` };
        }
        if (opt.kind === 'option') {
          const match = opt.values.find(v => v.toLowerCase() === arg.toLowerCase());
          if (!match) {
            return { ok: false, error: `${opt.label} must be one of: ${opt.values.join(', ')} (received "${arg}")` };
          }
          draft.options[opt.token] = match;
          return { ok: true, optionSet: { token: opt.token, value: match }, state: state() };
        }
        const val = parseLengthToken(arg);
        if (val.error) return { ok: false, error: `${opt.label}: ${val.error}` };
        const clamped = Math.max(opt.min, Math.min(opt.max, val.value));
        draft.options[opt.token] = clamped;
        return { ok: true, optionSet: { token: opt.token, value: clamped }, state: state() };
      }
    }

    const step = def.steps[draft.stepIndex];
    let point = null;
    if (step.kind === 'point') {
      const parsed = parsePointToken(trimmed, ctx.currentPoint || draft.points[draft.points.length - 1] || null);
      if (parsed.error) return { ok: false, error: parsed.error };
      point = parsed.relative
        ? {
            x: (draft.points.length ? draft.points[draft.points.length - 1].x : (ctx.currentPoint ? ctx.currentPoint.x : 0)) + parsed.value.x,
            y: (draft.points.length ? draft.points[draft.points.length - 1].y : (ctx.currentPoint ? ctx.currentPoint.y : 0)) + parsed.value.y
          }
        : parsed.value;
      if (typeof ctx.snap === 'function') point = ctx.snap(point);
    } else if (step.kind === 'length') {
      const len = parseLengthToken(trimmed);
      if (len.error) return { ok: false, error: len.error };
      point = { value: len.value };
    } else {
      return { ok: false, error: `Unsupported step kind "${step.kind}".` };
    }

    draft.points.push(point);
    if (draft.stepIndex < def.steps.length - 1) {
      draft.stepIndex += 1;
      return { ok: true, accepted: true, state: state() };
    }

    // Command complete — build args and hand to the executor.
    const args = {
      command: def.name,
      result: def.result,
      points: draft.points.map(p => ({ x: p.x, y: p.y })),
      options: { ...draft.options }
    };
    const wasCommand = def.name;
    draft = null;
    let outcome;
    try {
      outcome = execute(def.result, args);
    } catch (e) {
      outcome = { ok: false, error: e.message };
    }
    return {
      ok: true,
      completed: wasCommand,
      outcome: outcome || { ok: true },
      state: state()
    };
  }

  /**
   * Feeds a canvas point directly into the active step (pointer input path).
   * @param {{x,y}} point - resolved world coordinate (already un-projected)
   * @param {{ snap?: Function }} [ctx]
   */
  function submitPoint(point, ctx = {}) {
    if (!draft) return { ok: false, error: 'No active command.' };
    const def = draft.def;
    const step = def.steps[draft.stepIndex];
    if (!step || step.kind !== 'point') {
      return { ok: false, error: `${def.name}: the current step does not accept a canvas point.` };
    }
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' ||
        !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return { ok: false, error: 'Invalid canvas point.' };
    }
    let pt = { x: point.x, y: point.y };
    if (typeof ctx.snap === 'function') pt = ctx.snap(pt);
    draft.points.push(pt);
    if (draft.stepIndex < def.steps.length - 1) {
      draft.stepIndex += 1;
      return { ok: true, accepted: true, state: state() };
    }
    const args = {
      command: def.name,
      result: def.result,
      points: draft.points.map(p => ({ x: p.x, y: p.y })),
      options: { ...draft.options }
    };
    const wasCommand = def.name;
    draft = null;
    let outcome;
    try {
      outcome = execute(def.result, args);
    } catch (e) {
      outcome = { ok: false, error: e.message };
    }
    return { ok: true, completed: wasCommand, outcome: outcome || { ok: true }, state: state() };
  }

  // ---------------------------------------------------------------------------
  // One-shot execution + autocomplete + history navigation
  // ---------------------------------------------------------------------------

  /**
   * Executes a full command line. Returns a structured outcome:
   *   { handled, kind: 'interactive'|'simple'|'tool'|'unknown', ... }
   */
  function run(rawLine, ctx = {}) {
    const raw = String(rawLine || '').trim();
    if (!raw) return { handled: false, kind: 'empty', message: '' };
    const tokens = raw.split(/\s+/);
    const verb = tokens[0].toUpperCase();
    const rest = tokens.slice(1);
    remember(raw);

    const name = registry.aliasIndex.get(verb.toLowerCase());
    if (!name) {
      const suggestion = suggestCommands(verb, { registry, limit: 1 })[0];
      return {
        handled: false,
        kind: 'unknown',
        command: verb,
        message: suggestion
          ? `Unknown command "${verb}". Did you mean ${suggestion.name}?`
          : `Unknown command "${verb}". Type HELP for the command list.`
      };
    }
    const def = registry.commands.get(name);

    if (def.interactive) {
      const started = start(name);
      if (!started.ok) return { handled: false, kind: 'error', message: started.error };
      // Remaining tokens feed the interactive steps (e.g. "LINE 0,0 2.4,0").
      for (const token of rest) {
        const stepRes = submit(token, ctx);
        if (!stepRes.ok) return { handled: true, kind: 'interactive', command: def.name, error: stepRes.error, state: state() };
        if (stepRes.completed) return { handled: true, kind: 'interactive', command: def.name, completed: def.name, outcome: stepRes.outcome, state: state() };
      }
      return { handled: true, kind: 'interactive', command: def.name, state: state() };
    }

    let outcome;
    try {
      outcome = execute(def.run, { command: def.name, args: rest, raw });
    } catch (e) {
      outcome = { ok: false, error: e.message };
    }
    return { handled: true, kind: 'simple', command: def.name, run: def.run, outcome: outcome || { ok: true } };
  }

  function historyStep(direction) {
    if (history.length === 0) return { ok: false, message: 'No command history yet.' };
    if (direction === 'up') {
      historyCursor = historyCursor === -1 ? history.length - 1 : Math.max(0, historyCursor - 1);
    } else {
      if (historyCursor === -1) return { ok: false, message: 'Already at the newest command.' };
      historyCursor += 1;
      if (historyCursor >= history.length) { historyCursor = -1; return { ok: true, value: '' }; }
    }
    return { ok: true, value: history[historyCursor] };
  }

  function historySearch(query, limit = 10) {
    const q = String(query || '').toLowerCase();
    if (!q) return history.slice(-limit).reverse();
    return history.filter(h => h.toLowerCase().includes(q)).slice(-limit).reverse();
  }

  function clearHistory() {
    history = [];
    historyCursor = -1;
    persist();
    return { ok: true, message: 'Command history cleared.' };
  }

  return {
    run, submit, submitPoint, start, cancel, state,
    autocomplete: (q, opts) => suggestCommands(q, { registry, recents, ...opts }),
    historyStep, historySearch, clearHistory,
    getHistory: () => history.slice(),
    getRecents: () => recents.slice()
  };
}

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------

function fuzzySubsequence(query, target) {
  let i = 0;
  for (const ch of target) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return true;
  }
  return false;
}

/**
 * Ranks commands for a query: exact > prefix (name) > prefix (alias) >
 * substring > fuzzy. Recent history and catalog metadata boost ordering.
 */
export function suggestCommands(query, { registry, recents = [], limit = 8 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    return [...registry.commands.values()].slice(0, limit).map(def => describeCommand(def));
  }
  const results = [];
  for (const def of registry.commands.values()) {
    const name = def.name.toLowerCase();
    const aliases = (def.aliases || []).map(a => a.toLowerCase());
    let score = -1;
    if (name === q) score = 120;
    else if (aliases.includes(q)) score = 110;
    else if (name.startsWith(q)) score = 100 - name.length;
    else if (aliases.some(a => a.startsWith(q))) score = 90 - name.length;
    else if (name.includes(q) || aliases.some(a => a.includes(q))) score = 60;
    else if (fuzzySubsequence(q, name) || fuzzySubsequence(q, def.description?.toLowerCase() || '')) score = 40;
    if (score < 0) continue;
    if (recents.includes(def.name)) score += 15;
    results.push({ def, score });
  }
  results.sort((a, b) => b.score - a.score || a.def.name.localeCompare(b.def.name));
  return results.slice(0, limit).map(({ def }) => describeCommand(def));
}

function describeCommand(def) {
  return {
    name: def.name,
    id: def.id || null,
    aliases: def.aliases || [],
    description: def.description || '',
    category: def.category,
    interactive: !!def.interactive,
    shortcut: def.shortcut || null,
    toolId: def.toolId || null,
    selection: def.selection || 'none',
    undo: def.undo !== undefined ? def.undo : !def.interactive,
    help: def.help || def.description || '',
    aiDescription: def.aiDescription || def.description || ''
  };
}
