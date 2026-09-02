/**
 * Architecture Helping Hand - UI View Registry & Shared View Context
 * Stabilization 1: UI modularization infrastructure.
 *
 * Views own one feature's controller logic (state transitions, rendering,
 * feature event wiring). The main app controller stays responsible for
 * startup, global navigation, the command palette, global keyboard handling,
 * and lifecycle. Views never import each other — cross-feature actions go
 * through the shared context that the app passes in on mount.
 *
 * View contract (deliberately minimal — matches how the app already works):
 *   createXView(context) -> {
 *     id,                  // stable view id, e.g. 'converter'
 *     mount(),             // called once at startup, after DOM is available
 *     onModeEnter?(),      // called when the user switches into the mode
 *     onModeLeave?(),      // called when the user switches out of the mode
 *     getController?()     // returns named functions other code may call
 *                          // via context.getController(viewId, name)
 *   }
 *
 * The context is a single frozen object assembled by app.js:
 *   { state, dom, showToast, copyToClipboard, downloadFile, setUnifiedResultState,
 *     setRunButtonState, switchMode, getController, AudioService, StorageService,
 *     HistoryService, CommandRegistry, logCurrentCalculationToHistory }
 *
 * No view may reach module-global mutable state; everything flows through the
 * context so ownership stays explicit and testable.
 */

/**
 * Creates the view registry. The registry enforces:
 *  - unique view ids
 *  - each view exposes mount
 *  - controller lookups fail loudly (no silent undefined calls)
 */
export function createViewRegistry() {
  const views = new Map();

  function register(view) {
    if (!view || typeof view !== 'object') {
      throw new Error('View must be an object');
    }
    if (typeof view.id !== 'string' || !view.id) {
      throw new Error('View must have a string id');
    }
    if (typeof view.mount !== 'function') {
      throw new Error(`View "${view.id}" must expose mount()`);
    }
    if (views.has(view.id)) {
      throw new Error(`View "${view.id}" is already registered`);
    }
    views.set(view.id, view);
    return view;
  }

  function get(id) {
    return views.get(id) || null;
  }

  function requireView(id) {
    const view = views.get(id);
    if (!view) {
      throw new Error(`Unknown view "${id}". Registered: ${ids().join(', ')}`);
    }
    return view;
  }

  /**
   * Calls a named controller function exposed by a view. Throws when either
   * the view or the function is missing so wiring mistakes surface at the
   * call site instead of failing silently in an event handler.
   */
  function callController(id, fnName, ...args) {
    const view = requireView(id);
    const controller = typeof view.getController === 'function' ? view.getController() : null;
    if (!controller || typeof controller[fnName] !== 'function') {
      throw new Error(`View "${id}" does not expose controller function "${fnName}"`);
    }
    return controller[fnName](...args);
  }

  function hasController(id, fnName) {
    const view = views.get(id);
    if (!view) return false;
    const controller = typeof view.getController === 'function' ? view.getController() : null;
    return !!(controller && typeof controller[fnName] === 'function');
  }

  function ids() {
    return Array.from(views.keys());
  }

  function mountAll() {
    for (const id of ids()) {
      views.get(id).mount();
    }
  }

  /**
   * Notifies the active and previous views of a mode switch. Views without
   * the hooks are skipped silently — the hooks are optional by contract.
   */
  function notifyModeChange(previousMode, nextMode) {
    const prev = views.get(previousMode);
    if (prev && typeof prev.onModeLeave === 'function') prev.onModeLeave();
    const next = views.get(nextMode);
    if (next && typeof next.onModeEnter === 'function') next.onModeEnter();
  }

  return { register, get, requireView, callController, hasController, ids, mountAll, notifyModeChange };
}

/**
 * Validates the shared context shape once at startup so a missing helper
 * fails loudly during boot instead of inside a random event handler.
 * Global services (AudioService etc.) are optional entries — some views
 * may not need them, but the core interaction helpers must exist.
 */
export function validateViewContext(context) {
  const required = [
    'state', 'dom', 'showToast', 'copyToClipboard', 'setUnifiedResultState',
    'getController', 'views'
  ];
  const missing = required.filter(key => !context || context[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`View context is missing required entries: ${missing.join(', ')}`);
  }
  return true;
}
