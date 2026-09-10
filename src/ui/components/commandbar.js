/**
 * Architecture Helping Hand - Bottom CAD Command Bar (real command engine UI)
 *
 * Backed by src/core/cad-commands.js: live autocomplete, up/down history
 * replay, multi-step interactive prompts (LINE/WALL/RECTANGLE/DIST/DIMLIN),
 * clickable command options, coordinate entry (10,20 · @5,0 · @5<90 ·
 * 2400mm), and a persistent result log. The engine is the single source of
 * truth; this component only renders its state.
 */

import { icon } from '../../core/icons.js';

export function renderStudioCommandBar(container, options = {}) {
  if (!container) return;
  const session = options.session || null;
  const currentCoords = options.coords || { x: 0, y: 0 };
  const currentGrid = options.grid || 0.5;
  const isOrtho = options.ortho !== false;
  const isSnap = options.snap !== false;

  // Rebuild-safe: if the bar already exists, update dynamic parts only so the
  // input keeps focus while a command is being typed.
  if (container.querySelector('#commandbar-input')) {
    updateCoords(container, currentCoords);
    updatePrompt(container, session);
    return;
  }

  container.innerHTML = `
    <div class="studio-bottom-commandbar">
      <div class="commandbar-cli-wrap">
        <span class="commandbar-label" id="commandbar-prompt">Command:</span>
        <input type="text" id="commandbar-input" class="commandbar-input" placeholder="Type a command — REC 6 4 · WALL · LINE 0,0 2.4,0 · @5<90 · HELP" autocomplete="off" spellcheck="false" />
        <div id="commandbar-suggestions" class="commandbar-suggestions" hidden></div>
      </div>
      <div id="commandbar-options" class="commandbar-options" hidden></div>
      <div class="commandbar-aids-strip">
        <button type="button" class="aid-toggle-btn ${isSnap ? 'active' : ''}" id="aid-toggle-snap" title="Grid Snap (F9)">SNAP (${currentGrid}m)</button>
        <button type="button" class="aid-toggle-btn ${isOrtho ? 'active' : ''}" id="aid-toggle-ortho" title="Ortho Mode 90° (F8)">ORTHO</button>
        <button type="button" class="aid-toggle-btn" id="commandbar-history-btn" title="Command history (ArrowUp to replay)">${icon('history', { size: 14 })}</button>
      </div>
      <div class="commandbar-status-readout">
        <span class="coords-val" id="commandbar-coords">X: ${currentCoords.x.toFixed(2)} m &nbsp; Y: ${currentCoords.y.toFixed(2)} m</span>
      </div>
    </div>
    <div id="commandbar-log" class="commandbar-log" role="status" aria-live="polite"></div>
  `;

  const input = container.querySelector('#commandbar-input');
  const suggestions = container.querySelector('#commandbar-suggestions');
  const optionsEl = container.querySelector('#commandbar-options');
  const logEl = container.querySelector('#commandbar-log');
  let highlighted = -1;
  let matches = [];

  function closeSuggestions() {
    suggestions.hidden = true;
    suggestions.innerHTML = '';
    highlighted = -1;
    matches = [];
  }

  function log(message, kind = 'info') {
    if (!logEl) return;
    logEl.textContent = message || '';
    logEl.dataset.kind = kind;
  }

  function showSuggestions(query) {
    if (!session) { closeSuggestions(); return; }
    const q = String(query || '').trim();
    matches = q ? session.autocomplete(q, { limit: 8 }) : [];
    if (!matches.length) { closeSuggestions(); return; }
    suggestions.innerHTML = matches.map((m, i) => `
      <button type="button" class="commandbar-suggestion${i === highlighted ? ' highlighted' : ''}" data-cmd="${m.name}">
        ${icon(m.toolId ? 'select' : 'command', { size: 14 })}
        <span class="suggestion-name">${m.name}</span>
        ${m.aliases.length ? `<span class="suggestion-alias">${m.aliases.join(', ')}</span>` : ''}
        <span class="suggestion-desc">${m.interactive ? '↵ starts prompts · ' : ''}${m.description}</span>
      </button>`).join('');
    suggestions.hidden = false;
    suggestions.querySelectorAll('.commandbar-suggestion').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep input focus
        const name = btn.dataset.cmd;
        input.value = `${name} `;
        closeSuggestions();
        updatePrompt(container, session);
        input.focus();
      });
    });
  }

  function refreshOptions(sessionState) {
    if (!optionsEl) return;
    if (!sessionState || !sessionState.active) {
      optionsEl.hidden = true;
      optionsEl.innerHTML = '';
      return;
    }
    const chips = sessionState.options.map(o => {
      // option-kind and boolean chips cycle/toggle on click; text options prefill
      const clickable = o.kind === 'option' || o.kind === 'boolean';
      return `<button type="button" class="commandbar-option-chip" data-token="${o.token}" data-clickable="${clickable}">[${o.label}=${o.value}]</button>`;
    }).join('');
    optionsEl.innerHTML = `${chips}<button type="button" class="commandbar-option-chip cancel" data-cancel="1">[Cancel Esc]</button>`;
    optionsEl.hidden = false;
    optionsEl.querySelectorAll('[data-token]').forEach(chip => {
      chip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (chip.dataset.clickable === 'true') {
          const res = session.submit(`${chip.dataset.token}=${chip.dataset.token === 'REVERSE' ? 'true' : ''}`, ctxFrom(null));
          handleSubmitResult(res);
          refreshOptions(session.state());
          updatePrompt(container, session);
        } else {
          input.value = `${chip.dataset.token}=`;
        }
        input.focus();
      });
    });
    optionsEl.querySelector('[data-cancel]')?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const res = session.cancel();
      log(res.message, 'info');
      refreshOptions(session.state());
      updatePrompt(container, session);
    });
  }

  function completeFromSuggestion() {
    if (highlighted >= 0 && matches[highlighted]) {
      input.value = `${matches[highlighted].name} `;
      closeSuggestions();
      return true;
    }
    if (matches.length === 1) {
      input.value = `${matches[0].name} `;
      closeSuggestions();
      return true;
    }
    return false;
  }

  if (session) {
    input.addEventListener('input', () => {
      highlighted = -1;
      showSuggestions(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && suggestions.hidden) {
        e.preventDefault();
        const step = session.historyStep('up');
        if (step.ok) input.value = step.value;
        else log(step.message, 'info');
        return;
      }
      if (e.key === 'ArrowDown' && suggestions.hidden) {
        e.preventDefault();
        const step = session.historyStep('down');
        if (step.ok) input.value = step.value;
        return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !suggestions.hidden) {
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        highlighted = Math.max(0, Math.min(matches.length - 1, highlighted + delta));
        suggestions.querySelectorAll('.commandbar-suggestion').forEach((el, i) => {
          el.classList.toggle('highlighted', i === highlighted);
        });
        return;
      }
      if (e.key === 'Tab' && !suggestions.hidden) {
        e.preventDefault();
        completeFromSuggestion();
        return;
      }
      if (e.key === 'Escape') {
        if (!suggestions.hidden) { closeSuggestions(); return; }
        e.preventDefault();
        const res = session.cancel();
        log(res.message, 'info');
        input.value = '';
        refreshOptions(session.state());
        updatePrompt(container, session);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!suggestions.hidden && highlighted >= 0) { completeFromSuggestion(); return; }
        const raw = input.value.trim();
        input.value = '';
        closeSuggestions();
        if (!raw) return;
        // While an interactive prompt is active, Enter feeds the CURRENT
        // step (point/length/option) — not a new command.
        if (session.state().active) {
          const res = session.submit(raw, ctxFrom(null));
          handleSubmitResult(res);
          if (typeof options.onAfterRun === 'function') options.onAfterRun({ handled: true, kind: 'interactive', state: session.state() });
          input.focus();
          return;
        }
        submitLine(raw);
      }
    });
  }

  function submitLine(raw) {
    if (!session) return;
    const ctx = {
      currentPoint: typeof options.getCurrentPoint === 'function' ? options.getCurrentPoint() : null,
      snap: typeof options.snapPoint === 'function' ? options.snapPoint : null
    };
    let res = session.run(raw, ctx);
    // Legacy parametric shortcuts (REC 6 4 · WALL 5 · STAIR 16 1.1 · HATCH brick ·
    // INSERT key · 4VIEW …) stay available beneath the engine.
    if (res.kind === 'unknown' && typeof options.onLegacyCommand === 'function') {
      const legacy = options.onLegacyCommand(raw);
      if (legacy && legacy.handled) {
        res = { handled: true, kind: 'legacy', command: legacy.verb || raw, outcome: { ok: true } };
      }
    }
    if (res.kind === 'unknown') {
      log(res.message, 'error');
    } else if (res.error) {
      log(`${res.command}: ${res.error}`, 'error');
    } else if (res.kind === 'interactive' && res.state && res.state.active) {
      log(`${res.state.command} — ${res.state.prompt}`, 'prompt');
    } else if (res.outcome && res.outcome.ok === false) {
      log(res.outcome.error || 'Command failed.', 'error');
    } else if (res.kind === 'interactive' && res.completed) {
      log(`${res.command} completed.`, 'success');
    } else if (res.kind === 'simple' && res.outcome && res.outcome.message) {
      log(res.outcome.message, 'success');
    } else {
      log(`${res.command || raw} executed.`, 'success');
    }
    refreshOptions(session.state());
    updatePrompt(container, session);
    if (typeof options.onAfterRun === 'function') options.onAfterRun(res);
  }

  // Exported micro-API so plan.js can feed canvas clicks and log outcomes.
  container.__commandbar = {
    submitPoint(worldPoint) {
      if (!session || !session.state().active) return false;
      const res = session.submitPoint ? session.submitPoint(worldPoint, ctxFrom(worldPoint)) : session.submit('', ctxFrom(worldPoint));
      handleSubmitResult(res);
      return true;
    },
    submitText(text, worldPoint) {
      if (!session || !session.state().active) return false;
      const res = session.submit(text, ctxFrom(worldPoint));
      handleSubmitResult(res);
      return true;
    },
    /** Cancels any active interactive command (tool switch, Esc-from-canvas). */
    cancelActive() {
      if (session && session.state().active && typeof session.cancel === 'function') {
        const res = session.cancel('canceled by tool switch');
        if (res && res.message) log(res.message, 'info');
        updatePrompt(container, session);
        return true;
      }
      return false;
    },
    log,
    isActive: () => !!(session && session.state().active)
  };

  function ctxFrom(worldPoint) {
    return {
      currentPoint: worldPoint || (typeof options.getCurrentPoint === 'function' ? options.getCurrentPoint() : null),
      snap: typeof options.snapPoint === 'function' ? options.snapPoint : null
    };
  }

  function handleSubmitResult(res) {
    if (!res.ok) {
      log(res.error, 'error');
    } else if (res.completed) {
      log(`${res.completed} completed.`, 'success');
    } else if (res.optionSet) {
      log(`${res.optionSet.token} = ${res.optionSet.value}`, 'info');
    } else if (res.state && res.state.active) {
      log(`${res.state.command} — ${res.state.prompt}`, 'prompt');
    }
    refreshOptions(session.state());
    updatePrompt(container, session);
  }

  container.querySelector('#aid-toggle-snap')?.addEventListener('click', () => {
    if (typeof options.onToggleSnap === 'function') options.onToggleSnap();
  });
  container.querySelector('#aid-toggle-ortho')?.addEventListener('click', () => {
    if (typeof options.onToggleOrtho === 'function') options.onToggleOrtho();
  });
  container.querySelector('#commandbar-history-btn')?.addEventListener('click', () => {
    const items = session ? session.historySearch('', 8) : [];
    log(items.length ? `Recent: ${items.join(' · ')}` : 'No command history yet.', 'info');
  });
}

/** Updates the prompt label + placeholder to reflect the active command. */
export function updatePrompt(container, session) {
  const prompt = container?.querySelector('#commandbar-prompt');
  if (!prompt || !session) return;
  const s = session.state();
  if (s.active) {
    prompt.textContent = `${s.command} [${s.stepIndex + 1}/${s.stepCount}]`;
    prompt.classList.add('active');
  } else {
    prompt.textContent = 'Command:';
    prompt.classList.remove('active');
  }
}

function updateCoords(container, coords) {
  const el = container.querySelector('#commandbar-coords');
  if (el) el.innerHTML = `X: ${coords.x.toFixed(2)} m &nbsp; Y: ${coords.y.toFixed(2)} m`;
}
