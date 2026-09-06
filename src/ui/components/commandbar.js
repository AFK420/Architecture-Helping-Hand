/**
 * Architecture Helping Hand - Bottom CAD Command Bar & Drafting Aids Component
 * Features CLI prompt, Osnap toggles (End, Mid, Cen, Int, Perp), Ortho, and coordinate readout.
 */

import { STUDIO_TOOL_CATALOG, parseStudioCommand } from '../../core/personas.js';

export function renderStudioCommandBar(container, options = {}) {
  if (!container) return;

  const currentCoords = options.coords || { x: 0, y: 0 };
  const currentGrid = options.grid || 0.5;
  const isOrtho = options.ortho !== false;
  const isSnap = options.snap !== false;

  let html = `
    <div class="studio-bottom-commandbar">
      <!-- AutoCAD / Rhino Command Prompt -->
      <div class="commandbar-cli-wrap">
        <label for="commandbar-input" class="commandbar-label">Command:</label>
        <input type="text" id="commandbar-input" class="commandbar-input" placeholder="Type a command or alias (e.g. 'REC 6 4', 'WALL 5', 'STAIR', '4VIEW', 'HELP')..." autocomplete="off" spellcheck="false" />
        <span id="commandbar-history-echo" class="commandbar-history-echo" style="display: none; font-size: 0.70rem; color: var(--color-warning, #fbbf24); font-family: var(--font-mono); white-space: nowrap;"></span>
      </div>

      <!-- Drafting Aids Toggles (Osnap, Ortho, Grid) -->
      <div class="commandbar-aids-strip">
        <button type="button" class="aid-toggle-btn ${isSnap ? 'active' : ''}" id="aid-toggle-snap" title="Grid Snap (F9)">
          SNAP (${currentGrid}m)
        </button>
        <button type="button" class="aid-toggle-btn ${isOrtho ? 'active' : ''}" id="aid-toggle-ortho" title="Ortho Mode 90° (F8)">
          ORTHO
        </button>
        <div class="aid-osnap-group" title="Object Snap (F3)">
          <span class="osnap-label">OSNAP:</span>
          <span class="osnap-chip active">END</span>
          <span class="osnap-chip active">MID</span>
          <span class="osnap-chip active">INT</span>
          <span class="osnap-chip">CEN</span>
          <span class="osnap-chip">PERP</span>
        </div>
      </div>

      <!-- Real-Time Cursor Coordinates & Scale -->
      <div class="commandbar-status-readout">
        <span class="coords-val" id="commandbar-coords">X: ${currentCoords.x.toFixed(2)} m &nbsp; Y: ${currentCoords.y.toFixed(2)} m</span>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const cliInput = container.querySelector('#commandbar-input');
  if (cliInput) {
    cliInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const raw = cliInput.value.trim();
        cliInput.value = '';
        if (!raw) return;

        const parsed = parseStudioCommand(raw, { coords: currentCoords });
        if (parsed) {
          const historyEl = container.querySelector('#commandbar-history-echo');
          if (historyEl) {
            historyEl.textContent = `Command: ${raw} [${parsed.type.toUpperCase()}]`;
            historyEl.style.display = 'inline-block';
            setTimeout(() => { if (historyEl) historyEl.style.display = 'none'; }, 4000);
          }

          if (typeof options.onExecuteParsedCommand === 'function') {
            options.onExecuteParsedCommand(parsed);
          } else if (typeof options.onExecuteCommand === 'function') {
            options.onExecuteCommand(parsed.toolId || parsed.verb || raw);
          }
        } else if (typeof options.onUnknownCommand === 'function') {
          options.onUnknownCommand(raw);
        }
      }
    });
  }

  container.querySelector('#aid-toggle-snap')?.addEventListener('click', () => {
    if (typeof options.onToggleSnap === 'function') options.onToggleSnap();
  });

  container.querySelector('#aid-toggle-ortho')?.addEventListener('click', () => {
    if (typeof options.onToggleOrtho === 'function') options.onToggleOrtho();
  });
}
