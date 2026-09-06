/**
 * Architecture Helping Hand - Bottom CAD Command Bar & Drafting Aids Component
 * Features CLI prompt, Osnap toggles (End, Mid, Cen, Int, Perp), Ortho, and coordinate readout.
 */

import { STUDIO_TOOL_CATALOG } from '../../core/personas.js';

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
        <input type="text" id="commandbar-input" class="commandbar-input" placeholder="Type a command or alias (e.g. 'L', 'REC', 'WALL', 'STAIR', 'DIST')..." autocomplete="off" spellcheck="false" />
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
        const cmd = cliInput.value.trim().toUpperCase();
        cliInput.value = '';
        if (!cmd) return;

        // Lookup tool matching commandAlias or id
        const matchedTool = STUDIO_TOOL_CATALOG.find(t =>
          (t.commandAlias && t.commandAlias.toUpperCase() === cmd) ||
          (t.shortcut && t.shortcut.toUpperCase() === cmd) ||
          t.id.toUpperCase() === cmd
        );

        if (matchedTool) {
          if (typeof options.onExecuteCommand === 'function') {
            options.onExecuteCommand(matchedTool.id);
          }
        } else if (typeof options.onUnknownCommand === 'function') {
          options.onUnknownCommand(cmd);
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
