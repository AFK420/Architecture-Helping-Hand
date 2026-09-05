/**
 * Architecture Helping Hand - Global Command Center & Registry Service
 * Phase 2.5: Daily Architect Toolkit — Part 1: Global Command Palette
 */

import { StorageService } from './storage.js';
import { parseInput } from '../core/parser.js';
import { UNITS } from '../core/units.js';
import { FURNITURE_DATABASE } from '../core/furniture.js';
import { calculateStair, STAIR_REFERENCE_DEFAULTS } from '../core/stairs.js';
import { calculateRamp, RAMP_REFERENCE_DEFAULTS } from '../core/ramps.js';

export const RECENT_COMMANDS_KEY = 'archiscale_recent_commands';
export const FAVORITE_COMMANDS_KEY = 'archiscale_favorite_commands';
const MAX_RECENT_COMMANDS = 10;
const MAX_FAVORITE_COMMANDS = 10;

/**
 * Default Built-in Commands Definition
 */
const DEFAULT_COMMANDS = [
  // 1. Navigation Commands
  {
    id: 'nav-converter',
    title: 'Scale Converter',
    description: 'Convert dimensions between paper drawing and real-world site',
    category: 'Navigation',
    icon: '📐',
    keywords: ['scale', 'converter', 'drawing', 'real', 'paper', 'metric', 'imperial', 'ratio', 'dimension', 'mode 1'],
    shortcut: '1',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-rescale',
    title: 'Rescaler (Sheet A ➔ Sheet B)',
    description: 'Convert drawing measurements between different architectural scales',
    category: 'Navigation',
    icon: '🔄',
    keywords: ['rescale', 'sheet', 'transfer', 'ratio', 'sheet a', 'sheet b', 're-scale', 'mode 2'],
    shortcut: '2',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-detector',
    title: 'Scale Detector',
    description: 'Detect unknown scale ratio from paper drawing and real dimensions',
    category: 'Navigation',
    icon: '🔍',
    keywords: ['detector', 'find', 'identify', 'ratio', 'unknown scale', 'calculate scale', 'mode 3'],
    shortcut: '3',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-areavol',
    title: 'Area & Volume Scaler',
    description: 'Scale 2D floor surface areas (m², sq ft) and 3D volumes (m³, cu ft)',
    category: 'Navigation',
    icon: '📦',
    keywords: ['area', 'volume', 'square', 'cubic', 'm2', 'sqft', 'floor area', 'room', 'mode 4'],
    shortcut: '4',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-furniture',
    title: 'Furniture & Space Planning',
    description: 'Browse 215 standard architectural furniture pieces across 9 categories, clearances, and top-down blueprints',
    category: 'Navigation',
    icon: '🛋️',
    keywords: ['furniture', 'fixture', 'desk', 'bed', 'door', 'chair', 'table', 'ada', 'clearance', 'catalog', 'planner', 'mode 5'],
    shortcut: '5',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-reference',
    title: 'Drafting Reference Sheet',
    description: 'Architectural scale ruler, benchmark lengths, and 100mm print calibration sheet',
    category: 'Navigation',
    icon: '📚',
    keywords: ['reference', 'chart', 'ruler', 'calibration', 'print', 'sheet', 'benchmarks', 'metric', 'imperial', 'mode 6'],
    shortcut: '6',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-workspace',
    title: 'Dimension Workspace',
    description: 'Multi-dimension schedule scratchpad, batch scaling & live totals',
    category: 'Navigation',
    icon: '📐',
    keywords: ['dimension', 'workspace', 'schedule', 'scratchpad', 'batch', 'multi', 'totals', 'mode 7'],
    shortcut: '7',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-history',
    title: 'Calculation Journal',
    description: 'Open calculation log, restore previous math, and export CSV / Markdown',
    category: 'Navigation',
    icon: '📜',
    keywords: ['history', 'journal', 'log', 'restore', 'records', 'csv', 'markdown', 'drawer'],
    shortcut: 'H',
    actionType: 'action',
    available: true
  },
  {
    id: 'nav-shortcuts',
    title: 'Keyboard Shortcuts & Guide',
    description: 'View all workstation hotkeys, supported input syntax, and drafting tips',
    category: 'Navigation',
    icon: '⌨️',
    keywords: ['shortcuts', 'keys', 'hotkeys', 'help', 'guide', 'keyboard', 'tips'],
    shortcut: '?',
    actionType: 'action',
    available: true
  },

  // 2. Utility & Quick Actions
  {
    id: 'util-copy-result',
    title: 'Copy Active Result',
    description: 'Copy the most recent calculation result to your clipboard',
    category: 'Utility',
    icon: '📋',
    keywords: ['copy', 'clipboard', 'result', 'active', 'latest', 'value'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-toggle-theme',
    title: 'Cycle Studio Theme',
    description: 'Cycle interface theme (Studio Dark ➔ Drafting Paper ➔ Blueprint Cyan)',
    category: 'Utility',
    icon: '🎨',
    keywords: ['theme', 'dark', 'light', 'blueprint', 'paper', 'color', 'appearance', 'mode'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-toggle-sound',
    title: 'Toggle Tactile Audio Feedback',
    description: 'Enable or mute tactile audio synthesis for button clicks and calculations',
    category: 'Utility',
    icon: '🔊',
    keywords: ['sound', 'audio', 'mute', 'unmute', 'click', 'feedback', 'tactile'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-export-csv',
    title: 'Export Journal as CSV',
    description: 'Download calculation journal entries as a CSV spreadsheet',
    category: 'Utility',
    icon: '📥',
    keywords: ['export', 'csv', 'spreadsheet', 'download', 'history', 'journal'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-export-md',
    title: 'Export Journal as Markdown',
    description: 'Copy calculation journal table formatted in GitHub Markdown to clipboard',
    category: 'Utility',
    icon: '📝',
    keywords: ['export', 'markdown', 'table', 'copy', 'history', 'journal', 'md'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-clear-history',
    title: 'Clear Calculation Journal',
    description: 'Wipe all saved calculations from the calculation history log',
    category: 'Utility',
    icon: '🗑️',
    keywords: ['clear', 'history', 'reset', 'wipe', 'delete', 'journal'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-quick-dim',
    title: 'Quick Dimension Strip',
    description: 'Glanceable architectural dimension inspector, multi-scale sizes & instant CAD copy',
    category: 'Utility',
    icon: '⚡',
    keywords: ['quick', 'dimension', 'strip', 'glance', 'micro', 'scale', 'inspect', 'q'],
    shortcut: 'Q',
    actionType: 'action',
    available: true
  },

  {
    id: 'nav-expression',
    title: 'Dimension Expression Calculator',
    description: 'Evaluate mixed-unit architectural math expressions with live scaling and workspace insertion',
    category: 'Navigation',
    icon: '🧮',
    keywords: ['expression', 'calculator', 'math', 'eval', 'mixed units', 'arithmetic', 'sum', 'subtraction', 'multiply', 'divide', 'mode 8'],
    shortcut: '8',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-multiscale',
    title: 'Multi-Scale Comparison',
    description: 'Compare a real-world dimension or math expression across multiple architectural scales simultaneously',
    category: 'Navigation',
    icon: '📊',
    keywords: ['multi-scale', 'compare', 'comparison', 'scales', 'drawing size', 'fit', 'paper', 'proportions', 'mode 9', 'batch scale'],
    shortcut: '9',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-chains',
    title: 'Dimension Chains',
    description: 'Evaluate ordered dimension sequences, cumulative coordinates, scale-accurate SVG drafting chains, and offsets',
    category: 'Navigation',
    icon: '🔗',
    keywords: ['chain', 'dimension string', 'cumulative', 'running totals', 'grid', 'sequence', 'offsets', 'mode 10', '0'],
    shortcut: '0',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-cad-handoff',
    title: 'CAD Handoff (Rhino · AutoCAD · SketchUp)',
    description: 'Send dimensions from any tool into Rhino, AutoCAD, or SketchUp with target-specific clipboard payloads and preview',
    category: 'Navigation',
    icon: '🚀',
    keywords: ['cad', 'handoff', 'send', 'rhino', 'autocad', 'sketchup', 'paste', 'copy', 'helper', 'mode 13'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-export',
    title: 'Export Center',
    description: 'One universal export architecture: JSON (round-trip), TXT, CSV, TSV, SVG, DXF — preview before download',
    category: 'Navigation',
    icon: '📤',
    keywords: ['export', 'json', 'csv', 'tsv', 'svg', 'dxf', 'download', 'print', 'backup', 'mode 17'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-projects',
    title: 'Project Workspace',
    description: 'Manage design projects: new, open, save, duplicate, snapshots (design options), and validated JSON import',
    category: 'Navigation',
    icon: '🗂',
    keywords: ['project', 'workspace', 'open', 'save', 'snapshot', 'duplicate', 'import', 'new', 'mode 18'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-plan',
    title: 'Plan Canvas',
    description: 'Lightweight 2D SVG plan editor: rooms, walls, furniture placement, grid snapping, undo/redo',
    category: 'Navigation',
    icon: 'Plot',
    keywords: ['plan', 'canvas', 'draw', 'room', 'wall', 'furniture', 'layout', '2d', 'mode 19'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-cad-clipboard',
    title: 'CAD Clipboard & Formats',
    description: 'Instant CAD-ready copy formatting for AutoCAD, Rhino, Revit, SketchUp, and Spreadsheets',
    category: 'Navigation',
    icon: '📋',
    keywords: ['cad', 'clipboard', 'autocad', 'rhino', 'revit', 'sketchup', 'paste', 'tsv', 'schedule', 'mode 11', 'c'],
    shortcut: 'C',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-batch-cad',
    title: 'Batch CAD Dimension Converter',
    description: 'Bulk scale & unit conversion for tables, schedules, and raw CAD dimension lists',
    category: 'Navigation',
    icon: '⚡',
    keywords: ['batch', 'cad', 'bulk', 'multi-scale', 'schedule', 'table', 'mode 12', 'b'],
    shortcut: 'B',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-stairs',
    title: 'Stair Calculator',
    description: 'Straight-flight stair proportions: risers, goings, Blondel 2R+T, angle, run, and candidate options',
    category: 'Navigation',
    icon: '🪜',
    keywords: ['stair', 'stairs', 'riser', 'tread', 'going', 'blondel', 'angle', 'run', 'flight', 'mode 14'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-ramps',
    title: 'Ramp Calculator',
    description: 'Straight-ramp slope geometry: rise, run, percentage, 1:X ratio, angle, and target comparison',
    category: 'Navigation',
    icon: '📐',
    keywords: ['ramp', 'slope', 'ratio', 'angle', 'run', 'rise', 'accessibility', '1:12', 'mode 15'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-slopes',
    title: 'Slope Analyzer',
    description: 'General rise/run analysis: signed slopes, percentage, 1:X ratio, angle, consistency checks, and study targets',
    category: 'Navigation',
    icon: '📉',
    keywords: ['slope', 'analyzer', 'grade', 'gradient', 'terrain', 'drainage', 'roof', 'ratio', 'angle', 'mode 16'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-ai-studio',
    title: 'Open AI Studio',
    description: 'Task-focused AI workspace: critique, analyze, tutor, jury, ideate over the current project',
    category: 'Navigation',
    icon: '🤖',
    keywords: ['ai', 'studio', 'assistant', 'critique', 'critic', 'tutor', 'jury', 'ideation', 'brutal', 'analyze', 'mode 20'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-ai-control-center',
    title: 'AI Control Center',
    description: 'Configure providers, API keys, model catalog, and AI job assignments',
    category: 'Navigation',
    icon: '⚙️',
    keywords: ['ai', 'settings', 'provider', 'api key', 'gemini', 'glm', 'deepseek', 'model', 'catalog', 'jobs', 'configure', 'mode 21'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-imports',
    title: 'Importer',
    description: 'Bring in CSV/TSV dimension schedules, 2D DXF, and flat SVG geometry with a review report before anything touches the project',
    category: 'Navigation',
    icon: '📥',
    keywords: ['import', 'importer', 'csv', 'tsv', 'dxf', 'svg', 'schedule', 'ingest', 'mode 22'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-survey',
    title: 'Survey Notebook',
    description: 'Measurement notebook with provenance and verification, room proposals from verified records, and two-point image calibration',
    category: 'Navigation',
    icon: '📏',
    keywords: ['survey', 'notebook', 'measurement', 'provenance', 'verify', 'calibration', 'calibrate', 'image', 'scale', 'mode 23'],
    actionType: 'navigation',
    available: true
  },
  {
    id: 'ai-analyze-project',
    title: 'Analyze Current Project',
    description: 'Run the whole-project AI analysis job (structured strengths/problems report)',
    category: 'AI Actions',
    icon: '🏗️',
    keywords: ['ai', 'analyze', 'project', 'review', 'critique', 'whole'],
    actionType: 'action',
    available: true
  },
  {
    id: 'ai-critique-design',
    title: 'Critique Current Design',
    description: 'Run the Studio Critic job against the live project facts pack',
    category: 'AI Actions',
    icon: '🎯',
    keywords: ['ai', 'critique', 'critic', 'design', 'review'],
    actionType: 'action',
    available: true
  },
  {
    id: 'ai-test-provider',
    title: 'Test AI Provider Connection',
    description: 'Open the AI Control Center to run an explicit provider connection test',
    category: 'AI Actions',
    icon: '🔌',
    keywords: ['ai', 'test', 'connection', 'provider', 'key', 'check'],
    actionType: 'action',
    available: true
  },

  {
    id: 'future-space-planner',
    title: 'Interactive Space Planner',
    description: 'Interactive top-down 2D canvas for room layout and furniture placement',
    category: 'Upcoming Tool',
    icon: '🏢',
    keywords: ['planner', 'space', 'canvas', 'room', 'layout', '2d', 'phase 2.5'],
    actionType: 'placeholder',
    available: false,
    badge: 'Phase 2.5'
  }
];

class CommandRegistryClass {
  constructor() {
    this.commands = new Map();
    this.initDefaultCommands();
  }

  initDefaultCommands() {
    this.commands.clear();
    for (const cmd of DEFAULT_COMMANDS) {
      this.register(cmd);
    }
  }

  register(command) {
    if (!command || typeof command !== 'object') {
      throw new Error('Command must be an object');
    }
    if (!command.id || typeof command.id !== 'string') {
      throw new Error('Command must have a valid string id');
    }
    if (!command.title || typeof command.title !== 'string') {
      throw new Error('Command must have a valid string title');
    }
    if (!command.category || typeof command.category !== 'string') {
      throw new Error('Command must have a valid string category');
    }

    const entry = {
      id: command.id,
      title: command.title,
      description: command.description || '',
      category: command.category,
      icon: command.icon || '⚡',
      keywords: Array.isArray(command.keywords) ? [...command.keywords] : [],
      shortcut: command.shortcut || null,
      action: typeof command.action === 'function' ? command.action : null,
      actionType: command.actionType || 'action',
      available: command.available !== false,
      badge: command.badge || null
    };

    this.commands.set(entry.id, entry);
    return entry;
  }

  unregister(id) {
    return this.commands.delete(id);
  }

  getCommand(id) {
    return this.commands.get(id) || null;
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }

  getAvailableCommands() {
    return this.getAllCommands().filter(c => c.available);
  }

  searchCommands(query) {
    const all = this.getAllCommands();
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return {
        query: '',
        results: all,
        favorites: this.getFavoriteCommands(),
        recent: this.getRecentCommands(),
        total: all.length
      };
    }

    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const favorites = new Set(this.getFavoriteIds());

    const matched = all.filter(cmd => {
      const titleLower = cmd.title.toLowerCase();
      const descLower = cmd.description.toLowerCase();
      const catLower = cmd.category.toLowerCase();
      const idLower = cmd.id.toLowerCase();
      const keywords = cmd.keywords.map(k => k.toLowerCase());

      return tokens.every(token => {
        return (
          titleLower.includes(token) ||
          descLower.includes(token) ||
          catLower.includes(token) ||
          idLower.includes(token) ||
          keywords.some(k => k.includes(token))
        );
      });
    });

    // Sort matching results: Available first, then Favorites, then upcoming
    matched.sort((a, b) => {
      // 1. Available vs Upcoming
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;

      // 2. Favorites first
      const aFav = favorites.has(a.id);
      const bFav = favorites.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // 3. Exact prefix match boost
      const queryLower = query.trim().toLowerCase();
      const aTitleStarts = a.title.toLowerCase().startsWith(queryLower);
      const bTitleStarts = b.title.toLowerCase().startsWith(queryLower);
      if (aTitleStarts && !bTitleStarts) return -1;
      if (!aTitleStarts && bTitleStarts) return 1;

      return 0;
    });

    return {
      query: query.trim(),
      results: matched,
      favorites: [],
      recent: [],
      total: matched.length
    };
  }

  // ---------------------------------------------------------------------------
  // Recent Commands Management
  // ---------------------------------------------------------------------------
  getRecentIds() {
    try {
      const raw = StorageService.getItem(RECENT_COMMANDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => typeof id === 'string' && this.commands.has(id));
        }
      }
    } catch (e) {
      // Storage corrupted, fallback gracefully
    }
    return [];
  }

  getRecentCommands() {
    const ids = this.getRecentIds();
    return ids.map(id => this.getCommand(id)).filter(Boolean);
  }

  addRecentCommand(commandId) {
    if (!commandId || !this.commands.has(commandId)) return;

    let recents = this.getRecentIds();
    // Remove if already present (to move to top)
    recents = recents.filter(id => id !== commandId);
    recents.unshift(commandId);

    if (recents.length > MAX_RECENT_COMMANDS) {
      recents = recents.slice(0, MAX_RECENT_COMMANDS);
    }

    try {
      StorageService.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recents));
    } catch (e) {}
  }

  clearRecentCommands() {
    try {
      StorageService.removeItem(RECENT_COMMANDS_KEY);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Favorites Management
  // ---------------------------------------------------------------------------
  getFavoriteIds() {
    try {
      const raw = StorageService.getItem(FAVORITE_COMMANDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => typeof id === 'string' && this.commands.has(id));
        }
      }
    } catch (e) {
      // Storage corrupted, fallback gracefully
    }
    return [];
  }

  getFavoriteCommands() {
    const ids = this.getFavoriteIds();
    return ids.map(id => this.getCommand(id)).filter(Boolean);
  }

  isFavorite(commandId) {
    return this.getFavoriteIds().includes(commandId);
  }

  toggleFavorite(commandId) {
    if (!commandId || !this.commands.has(commandId)) return false;

    let favs = this.getFavoriteIds();
    let isNowFav = false;

    if (favs.includes(commandId)) {
      favs = favs.filter(id => id !== commandId);
      isNowFav = false;
    } else {
      if (favs.length >= MAX_FAVORITE_COMMANDS) {
        favs.pop();
      }
      favs.unshift(commandId);
      isNowFav = true;
    }

    try {
      StorageService.setItem(FAVORITE_COMMANDS_KEY, JSON.stringify(favs));
    } catch (e) {}

    return isNowFav;
  }
}

export const CommandRegistry = new CommandRegistryClass();

/**
 * Parses natural language commands for direct architectural studio operations.
 * Strictly avoids arbitrary code execution; compiles only into validated data payloads.
 *
 * @param {string} query
 * @returns {Object|null}
 */
export function parseNaturalLanguageCommand(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim();

  // 1. Scale calculation: "scale 4.2m at 1:50" or "scale 2400mm 1:20"
  const scaleMatch = q.match(/^scale\s+([0-9.]+\s*[a-z]*)\s+(?:at\s+|@\s+)?(?:1\s*:\s*)?([0-9.]+)/i);
  if (scaleMatch) {
    const dimStr = scaleMatch[1].trim();
    const ratio = parseFloat(scaleMatch[2]);
    if (ratio > 0) {
      const parsed = parseInput(dimStr);
      if (parsed && parsed.isValid) {
        const canonicalM = parsed.canonicalMeters;
        const drawM = canonicalM / ratio;
        const drawMm = drawM * 1000;
        const drawFormatted = drawMm >= 1000
          ? `${drawM.toFixed(3)} m`
          : (drawMm % 1 === 0 ? `${drawMm.toFixed(0)} mm` : `${drawMm.toFixed(1)} mm`);
        return {
          type: 'scale',
          query: q,
          inputStr: dimStr,
          ratio,
          canonicalMeters: canonicalM,
          drawingMeters: drawM,
          drawingFormatted: drawFormatted,
          formattedResult: drawFormatted,
          title: `Scale ${dimStr} at 1:${ratio} = ${drawFormatted}`,
          description: `Real: ${parsed.formattedCanonical} | Drawing: ${drawFormatted} @ 1:${ratio}`
        };
      }
    }
  }

  // 2. Stair geometry: "stair rise 2.7m" or "stair 2700mm"
  const stairMatch = q.match(/^stair(?:s)?(?:\s+rise)?\s+([0-9.]+\s*[a-z]+)/i);
  if (stairMatch) {
    const riseStr = stairMatch[1].trim();
    const parsed = parseInput(riseStr);
    if (parsed && parsed.isValid && parsed.canonicalMeters > 0) {
      const stairRes = calculateStair({
        mode: 'rise_target_riser',
        totalRise: parsed.canonicalMeters,
        desiredRiser: 0.175,
        desiredTread: 0.28,
        references: STAIR_REFERENCE_DEFAULTS
      });
      if (stairRes && stairRes.valid) {
        const f = stairRes.formatted;
        return {
          type: 'stair',
          query: q,
          inputStr: riseStr,
          totalRiseMeters: parsed.canonicalMeters,
          riserCount: stairRes.risers.count,
          riserHeightMeters: stairRes.risers.heightMeters,
          treadDepthMeters: stairRes.treads.depthMeters,
          totalRunMeters: stairRes.geometry.totalRunMeters,
          formattedResult: `${f.riserCount}R (${f.riser} × ${f.tread}) — run ${f.totalRun}`,
          result: stairRes,
          title: `Stair: ${f.riserCount} risers @ ${f.riser}, run ${f.totalRun}`,
          description: `Total Rise: ${f.totalRise} | 2R+T: ${f.twoRPlusT} (${f.proportionStatus})`
        };
      }
    }
  }

  // 3. Ramp geometry: "ramp rise 1.2m at 1:12" or "ramp 1.2m 1:12"
  const rampMatch = q.match(/^ramp(?:s)?(?:\s+rise)?\s+([0-9.]+\s*[a-z]+)(?:\s+(?:(?:at|slope)\s+)?1\s*:\s*([0-9.]+))?/i);
  if (rampMatch) {
    const riseStr = rampMatch[1].trim();
    const ratio = rampMatch[2] ? parseFloat(rampMatch[2]) : 12;
    const parsed = parseInput(riseStr);
    if (parsed && parsed.isValid && parsed.canonicalMeters > 0 && ratio > 0) {
      const desiredSlope = (1 / ratio) * 100;
      const rampRes = calculateRamp({
        mode: 'rise_desired_slope',
        rise: parsed.canonicalMeters,
        slopePercent: desiredSlope,
        references: RAMP_REFERENCE_DEFAULTS
      });
      if (rampRes && rampRes.valid) {
        const f = rampRes.formatted;
        return {
          type: 'ramp',
          query: q,
          inputStr: riseStr,
          riseMeters: parsed.canonicalMeters,
          ratio,
          runMeters: rampRes.geometry.runMeters,
          slopePercent: desiredSlope,
          formattedResult: `Run ${f.run} @ 1:${ratio} (${f.slopePercent})`,
          result: rampRes,
          title: `Ramp 1:${ratio}: run ${f.run} (rise ${f.rise})`,
          description: `Slope: ${f.slopePercent} | Ratio: ${f.ratio} | Flight: ${f.flightLength}`
        };
      }
    }
  }

  // 4. Place furniture: "place king bed" or "add desk"
  const placeMatch = q.match(/^(?:place|add|insert)\s+([a-z0-9\s-]+)/i);
  if (placeMatch) {
    const furnName = placeMatch[1].trim().toLowerCase();
    const piece = FURNITURE_DATABASE.find(f =>
      f.name.toLowerCase().includes(furnName) ||
      f.id.toLowerCase().includes(furnName) ||
      f.category.toLowerCase() === furnName
    );
    if (piece) {
      return {
        type: 'place',
        query: q,
        furniture: piece,
        formattedResult: `${piece.name} (${(piece.width * 1000).toFixed(0)} × ${(piece.depth * 1000).toFixed(0)}mm)`,
        title: `Place ${piece.name} (${(piece.width * 1000).toFixed(0)} × ${(piece.depth * 1000).toFixed(0)}mm)`,
        description: `Category: ${piece.category} | Clearance: ${piece.clearance ? (piece.clearance * 1000).toFixed(0) + 'mm' : 'None'}`
      };
    }
  }

  // 5. Unit conversion: "convert 12ft to m" or "convert 2400mm to in"
  const convMatch = q.match(/^convert\s+([0-9.]+)\s*([a-z]+|\"|\')\s+(?:to\s+|in\s+)?([a-z]+|\"|\')/i);
  if (convMatch) {
    const val = parseFloat(convMatch[1]);
    let fromKey = convMatch[2].toLowerCase().replace('"', 'in').replace("'", 'ft');
    let toKey = convMatch[3].toLowerCase().replace('"', 'in').replace("'", 'ft');
    if (UNITS[fromKey] && UNITS[toKey]) {
      const canonicalM = val * UNITS[fromKey].toMeters;
      const convertedVal = canonicalM / UNITS[toKey].toMeters;
      const formattedRes = convertedVal % 1 === 0 ? `${convertedVal} ${toKey}` : `${convertedVal.toFixed(3)} ${toKey}`;
      return {
        type: 'convert',
        query: q,
        val,
        fromKey,
        toKey,
        convertedValue: convertedVal,
        formattedResult: formattedRes,
        title: `Convert ${val} ${fromKey} = ${formattedRes}`,
        description: `${val} ${UNITS[fromKey].name} = ${formattedRes}`
      };
    }
  }

  return null;
}