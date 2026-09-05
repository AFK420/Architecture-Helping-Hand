/**
 * Architecture Helping Hand - Customizable Keyboard Shortcuts Manager
 * Implements architectural CAD conventions (AutoCAD, Revit, Rhino, SketchUp)
 * with dynamic rebinding, conflict detection, and local storage persistence.
 */

export const DEFAULT_SHORTCUTS = [
  // Plan Canvas & Drafting (Architectural CAD Standard)
  { id: 'tool_select', label: 'Select & Transform', category: 'canvas', defaultKey: 'v', key: 'v', description: 'Switch to selection and transform tool' },
  { id: 'tool_wall', label: 'Draw Wall Segment', category: 'canvas', defaultKey: 'w', key: 'w', description: 'Switch to continuous wall placement' },
  { id: 'tool_room', label: 'Draw Room Rectangle', category: 'canvas', defaultKey: 'r', key: 'r', description: 'Draw rectangular room footprint' },
  { id: 'tool_furniture', label: 'Place Furniture', category: 'canvas', defaultKey: 'f', key: 'f', description: 'Place selected furniture block' },
  { id: 'tool_measure', label: 'Tape Measure', category: 'canvas', defaultKey: 'm', key: 'm', description: 'Measure distance between points' },
  { id: 'tool_dimension', label: 'Dimension String', category: 'canvas', defaultKey: 'd', key: 'd', description: 'Place aligned architectural dimension string' },
  { id: 'tool_stair', label: 'Place Stair Flight', category: 'canvas', defaultKey: 't', key: 't', description: 'Place parametric stair flight' },
  { id: 'tool_ramp', label: 'Place Ramp Wedge', category: 'canvas', defaultKey: 'p', key: 'p', description: 'Place accessible ramp entity' },
  { id: 'plan_grid', label: 'Cycle Grid Snap', category: 'canvas', defaultKey: 'g', key: 'g', description: 'Cycle grid snap increment' },
  { id: 'plan_snap', label: 'Toggle Snapping', category: 'canvas', defaultKey: 's', key: 's', description: 'Toggle smart snapping on/off' },
  { id: 'plan_zoom_fit', label: 'Zoom to Extents', category: 'canvas', defaultKey: 'z', key: 'z', description: 'Frame entire plan on canvas' },
  { id: 'plan_duplicate', label: 'Duplicate Entity', category: 'canvas', defaultKey: 'ctrl+d', key: 'ctrl+d', description: 'Duplicate selected entity with offset' },
  { id: 'plan_delete', label: 'Delete Selected', category: 'canvas', defaultKey: 'delete', key: 'delete', description: 'Remove selected entity from plan' },
  { id: 'plan_cancel', label: 'Cancel / Deselect', category: 'canvas', defaultKey: 'escape', key: 'escape', description: 'Clear selection or cancel active tool' },
  { id: 'plan_undo', label: 'Undo Plan Action', category: 'canvas', defaultKey: 'ctrl+z', key: 'ctrl+z', description: 'Undo last drafting step' },
  { id: 'plan_redo', label: 'Redo Plan Action', category: 'canvas', defaultKey: 'ctrl+y', key: 'ctrl+y', description: 'Redo undone drafting step' },

  // Studio Navigation & Tools
  { id: 'cmd_palette', label: 'Studio Command Bar', category: 'studio', defaultKey: 'ctrl+k', key: 'ctrl+k', description: 'Open natural language command palette' },
  { id: 'quick_dim', label: 'Quick Dimension Strip', category: 'studio', defaultKey: 'q', key: 'q', description: 'Toggle quick dimension flyout' },
  { id: 'cad_clipboard', label: 'Open CAD Clipboard', category: 'studio', defaultKey: 'c', key: 'c', description: 'Direct CAD clipboard formatter' },
  { id: 'batch_cad', label: 'Batch CAD Converter', category: 'studio', defaultKey: 'b', key: 'b', description: 'Multi-line CAD batch converter' },
  { id: 'history_drawer', label: 'Calculation Journal', category: 'studio', defaultKey: 'h', key: 'h', description: 'Toggle history journal drawer' },
  { id: 'shortcuts_modal', label: 'Shortcuts Reference', category: 'studio', defaultKey: '?', key: '?', description: 'View and customize keybindings' }
];

export const SHORTCUTS_STORAGE_KEY = 'archiscale_custom_shortcuts';

/**
 * Normalizes a keyboard event or string into a canonical lowercase combo string.
 * Examples: 'Ctrl + D' -> 'ctrl+d', KeyboardEvent(ctrlKey=true, key='D') -> 'ctrl+d'
 */
export function normalizeKeyCombo(input) {
  if (!input) return '';
  if (typeof input === 'string') {
    return input
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[⌘]/g, 'ctrl+')
      .replace(/cmd|command|meta/g, 'ctrl')
      .replace(/del/g, 'delete')
      .replace(/esc/g, 'escape');
  }

  // Handle KeyboardEvent
  if (typeof input === 'object' && input.key) {
    const rawKey = input.key;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(rawKey)) {
      return ''; // Modifiers alone are not a full combo
    }

    const parts = [];
    if (input.ctrlKey || input.metaKey) parts.push('ctrl');
    if (input.altKey) parts.push('alt');
    if (input.shiftKey && rawKey.length > 1) parts.push('shift');

    let keyName = rawKey.toLowerCase();
    if (keyName === 'escape' || keyName === 'esc') keyName = 'escape';
    else if (keyName === 'delete' || keyName === 'backspace') keyName = 'delete';

    parts.push(keyName);
    return parts.join('+');
  }

  return '';
}

/**
 * Formats a canonical combo string for elegant UI display.
 * Example: 'ctrl+d' -> 'Ctrl + D', 'escape' -> 'Esc'
 */
export function formatDisplayKey(combo) {
  if (!combo) return '';
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
  return combo
    .split('+')
    .map(part => {
      const p = part.trim().toLowerCase();
      if (p === 'ctrl') return isMac ? '⌘' : 'Ctrl';
      if (p === 'alt') return isMac ? '⌥' : 'Alt';
      if (p === 'shift') return isMac ? '⇧' : 'Shift';
      if (p === 'escape') return 'Esc';
      if (p === 'delete') return 'Del';
      if (p === 'enter') return '↵ Enter';
      if (p === 'space') return 'Space';
      return p.toUpperCase();
    })
    .join(isMac ? '' : ' + ');
}

/**
 * ShortcutsManager Class: handles loading, saving, rebinding, conflict detection,
 * and keydown event matching.
 */
export class ShortcutsManagerClass {
  constructor() {
    this.shortcuts = DEFAULT_SHORTCUTS.map(s => ({ ...s }));
    this.listeners = new Set();
    this.storage = null;
    this.initStorage();
    this.loadFromStorage();
  }

  initStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.storage = window.localStorage;
      }
    } catch {
      this.storage = null;
    }
  }

  /**
   * Set custom storage adapter (e.g. for testing)
   */
  setStorage(storageAdapter) {
    this.storage = storageAdapter;
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(SHORTCUTS_STORAGE_KEY);
      if (!raw) return;
      const customBindings = JSON.parse(raw);
      if (customBindings && typeof customBindings === 'object') {
        for (const item of this.shortcuts) {
          if (typeof customBindings[item.id] === 'string' && customBindings[item.id].trim().length > 0) {
            item.key = normalizeKeyCombo(customBindings[item.id]);
          }
        }
      }
    } catch {
      // Corrupt storage handled safely
    }
  }

  saveToStorage() {
    if (!this.storage) return;
    try {
      const bindings = {};
      for (const item of this.shortcuts) {
        if (item.key !== item.defaultKey) {
          bindings[item.id] = item.key;
        }
      }
      if (Object.keys(bindings).length === 0) {
        this.storage.removeItem(SHORTCUTS_STORAGE_KEY);
      } else {
        this.storage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(bindings));
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  /**
   * Returns all registered shortcuts with their current bindings.
   */
  getAllShortcuts() {
    return this.shortcuts.map(s => ({
      ...s,
      displayKey: formatDisplayKey(s.key),
      isCustom: s.key !== s.defaultKey
    }));
  }

  /**
   * Get a shortcut by its action ID.
   */
  getShortcut(id) {
    const s = this.shortcuts.find(x => x.id === id);
    if (!s) return null;
    return {
      ...s,
      displayKey: formatDisplayKey(s.key),
      isCustom: s.key !== s.defaultKey
    };
  }

  /**
   * Get the current key combo for an action ID.
   */
  getKeyForAction(id) {
    const s = this.shortcuts.find(x => x.id === id);
    return s ? s.key : '';
  }

  /**
   * Rebinds a shortcut to a new key combination with conflict detection.
   * @param {string} id - The action ID to rebind
   * @param {string|KeyboardEvent} newKeyCombo - The new shortcut
   * @returns {{ success: boolean, conflict?: Object, error?: string }}
   */
  bindShortcut(id, newKeyCombo) {
    const target = this.shortcuts.find(x => x.id === id);
    if (!target) {
      return { success: false, error: `Shortcut ID "${id}" not found.` };
    }

    const normalized = normalizeKeyCombo(newKeyCombo);
    if (!normalized) {
      return { success: false, error: 'Invalid key combination.' };
    }

    // Check for conflict in the same category or overall
    const conflict = this.shortcuts.find(x => x.id !== id && x.key === normalized && (x.category === target.category || ['escape', 'delete', 'ctrl+k'].includes(normalized)));
    if (conflict) {
      return {
        success: false,
        conflict: {
          id: conflict.id,
          label: conflict.label,
          category: conflict.category
        },
        error: `Key "${formatDisplayKey(normalized)}" is already assigned to "${conflict.label}".`
      };
    }

    target.key = normalized;
    this.saveToStorage();
    this.notifyListeners();
    return { success: true };
  }

  /**
   * Force rebinds a shortcut, taking over any conflicting shortcut by resetting the conflicting one.
   */
  forceBindShortcut(id, newKeyCombo) {
    const normalized = normalizeKeyCombo(newKeyCombo);
    if (!normalized) return { success: false, error: 'Invalid key combination.' };

    const target = this.shortcuts.find(x => x.id === id);
    if (!target) return { success: false, error: 'Shortcut not found.' };

    // Clear conflict
    const conflict = this.shortcuts.find(x => x.id !== id && x.key === normalized);
    if (conflict) {
      conflict.key = conflict.defaultKey === normalized ? '' : conflict.defaultKey;
    }

    target.key = normalized;
    this.saveToStorage();
    this.notifyListeners();
    return { success: true };
  }

  /**
   * Resets a single shortcut to its architectural default.
   */
  resetShortcut(id) {
    const target = this.shortcuts.find(x => x.id === id);
    if (!target) return false;
    target.key = target.defaultKey;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Resets all shortcuts to default architectural CAD keybindings.
   */
  resetAllShortcuts() {
    for (const item of this.shortcuts) {
      item.key = item.defaultKey;
    }
    if (this.storage) {
      try { this.storage.removeItem(SHORTCUTS_STORAGE_KEY); } catch {}
    }
    this.notifyListeners();
    return true;
  }

  /**
   * Tests if a native KeyboardEvent matches the bound shortcut for an action ID.
   * @param {string} id - Action ID
   * @param {KeyboardEvent} event - Native keyboard event
   * @returns {boolean}
   */
  matchesEvent(id, event) {
    if (!event || !id) return false;
    const target = this.shortcuts.find(x => x.id === id);
    if (!target || !target.key) return false;

    const eventCombo = normalizeKeyCombo(event);
    return eventCombo === target.key;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyListeners() {
    for (const fn of this.listeners) {
      try { fn(this.getAllShortcuts()); } catch {}
    }
  }
}

export const ShortcutsManager = new ShortcutsManagerClass();
