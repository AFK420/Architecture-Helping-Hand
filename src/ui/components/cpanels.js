/**
 * Architecture Helping Hand - Right C-Panels & Containers Component
 * Rhino/AutoCAD style dockable side-panel container (Properties, Layers, Validation, Detailing).
 * Includes Tier 2 Permanent Architectural Standards & Guidance Inspector.
 */

import { updateInspectorGuide } from './tooltip.js';

export function renderStudioCPanels(container, options = {}) {
  if (!container) return;

  const activeTab = options.activePanelTab || 'properties';
  const selectedEntity = options.selectedEntity || null;
  const entityCount = options.entityCount || 0;
  const layerCount = options.layerCount || 10;
  const activeToolId = options.activeToolId || 'select';

  let html = `
    <div class="studio-cpanels-container">
      <!-- C-Panel Header Navigation Tabs (Compact & Responsive - Zero Text Overflow) -->
      <div class="cpanels-tab-bar" role="tablist">
        <button type="button" class="cpanel-tab-btn ${activeTab === 'properties' ? 'active' : ''}" data-panel-tab="properties" title="Object Properties Inspector">
          <span class="cpanel-tab-icon">📋</span>
          <span class="cpanel-tab-text">Props</span>
        </button>
        <button type="button" class="cpanel-tab-btn ${activeTab === 'layers' ? 'active' : ''}" data-panel-tab="layers" title="CAD Layers & Materials (${layerCount})">
          <span class="cpanel-tab-icon">🗂️</span>
          <span class="cpanel-tab-text">Layers</span>
        </button>
        <button type="button" class="cpanel-tab-btn ${activeTab === 'validation' ? 'active' : ''}" data-panel-tab="validation" title="Space Planning & IBC Code Compliance">
          <span class="cpanel-tab-icon">✓</span>
          <span class="cpanel-tab-text">Code</span>
        </button>
        <button type="button" class="cpanel-tab-btn ${activeTab === 'details' ? 'active' : ''}" data-panel-tab="details" title="Construction Details & Keynotes">
          <span class="cpanel-tab-icon">🔍</span>
          <span class="cpanel-tab-text">Details</span>
        </button>
        <button type="button" class="cpanel-tab-btn ${activeTab === 'constraints' ? 'active' : ''}" data-panel-tab="constraints" title="Deterministic Constraints — diagnose & satisfy">
          <span class="cpanel-tab-icon">🔗</span>
          <span class="cpanel-tab-text">Constr</span>
        </button>
        <button type="button" class="cpanel-tab-btn ${activeTab === 'transform' ? 'active' : ''}" data-panel-tab="transform" title="Transform — precise numeric position & size">
          <span class="cpanel-tab-icon">⤢</span>
          <span class="cpanel-tab-text">Xform</span>
        </button>
      </div>

      <!-- C-Panel Content Body -->
      <div class="cpanel-content-body">
        <!-- 1. Properties Inspector -->
        <div class="cpanel-pane ${activeTab === 'properties' ? 'active' : ''}" id="cpanel-pane-properties">
          ${selectedEntity ? `
            <div class="cpanel-section-title">
              <span>${selectedEntity.kind.toUpperCase()} PROPERTIES</span>
              <span class="cpanel-id-badge">${selectedEntity.id}</span>
            </div>
            <div class="cpanel-props-table">
              <div class="cpanel-prop-row">
                <span class="prop-key">Name</span>
                <span class="prop-val">${selectedEntity.name || '—'}</span>
              </div>
              <div class="cpanel-prop-row">
                <span class="prop-key">Kind</span>
                <span class="prop-val">${selectedEntity.kind}</span>
              </div>
              <div class="cpanel-prop-row">
                <span class="prop-key">Layer</span>
                <span class="prop-val">${selectedEntity.layerId || 'A-WALL'}</span>
              </div>
              ${typeof selectedEntity.width === 'number' ? `
                <div class="cpanel-prop-row">
                  <span class="prop-key">Width</span>
                  <span class="prop-val">${selectedEntity.width.toFixed(2)} m</span>
                </div>
              ` : ''}
              ${(typeof selectedEntity.depth === 'number' || typeof selectedEntity.run === 'number') ? `
                <div class="cpanel-prop-row">
                  <span class="prop-key">Length / Run</span>
                  <span class="prop-val">${(typeof selectedEntity.depth === 'number' ? selectedEntity.depth : selectedEntity.run ?? 0).toFixed(2)} m</span>
                </div>
              ` : ''}
              ${selectedEntity.kind === 'stair' ? `
                <div class="cpanel-prop-row">
                  <span class="prop-key">Risers</span>
                  <span class="prop-val">${selectedEntity.risers || 16}R @ ${(selectedEntity.riserHeight * 1000 || 175).toFixed(1)} mm</span>
                </div>
                <div class="cpanel-prop-row">
                  <span class="prop-key">Blondel 2R+T</span>
                  <span class="prop-val">${Math.round((selectedEntity.blondel || 0.63) * 1000)} mm (${selectedEntity.isCompliant ? '✅ IBC Pass' : '⚠️ Review'})</span>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="cpanel-empty-state">
              <span class="empty-icon">➤</span>
              <p>No entity selected</p>
              <span class="empty-hint">Click any entity on the drawing canvas to inspect and edit properties. (${entityCount} total entities)</span>
            </div>
          `}
        </div>

        <!-- 2. Layers Manager -->
        <div class="cpanel-pane ${activeTab === 'layers' ? 'active' : ''}" id="cpanel-pane-layers">
          <div class="cpanel-section-title">
            <span>CAD LAYERS</span>
            <button type="button" class="btn btn-xs btn-outline" id="cpanel-auto-tag-btn">🏷️ Auto-Tag</button>
          </div>
          <div id="cpanel-layers-target" class="cpanel-layers-list">
            <!-- Populated from state CAD layers -->
          </div>
        </div>

        <!-- 3. Space Planning & Code Validation -->
        <div class="cpanel-pane ${activeTab === 'validation' ? 'active' : ''}" id="cpanel-pane-validation">
          <div class="cpanel-section-title">
            <span>IBC CODE & AREA METRICS</span>
          </div>
          <div class="cpanel-validation-metrics">
            <div class="metric-card">
              <span class="metric-num" id="cpanel-metric-gross-area">—</span>
              <span class="metric-lbl">Total Gross Area</span>
            </div>
            <div class="metric-card">
              <span class="metric-num" id="cpanel-metric-rooms-count">—</span>
              <span class="metric-lbl">Rooms & Zones</span>
            </div>
          </div>
          <div class="cpanel-code-checklist">
            ${(options.codeChecks && options.codeChecks.length ? options.codeChecks : [
              { label: 'IBC Headroom Clearance (≥ 2.0m)', status: 'unknown', detail: 'No stairs/ramps in this document' },
              { label: 'Egress Corridor Width (≥ 1.10m)', status: 'unknown', detail: 'No corridor rooms named' },
              { label: 'Stair Blondel 2R+T Compliance', status: 'unknown', detail: 'No stairs in this document' }
            ]).map(check => {
              const cls = check.status === 'pass' ? 'pass' : check.status === 'fail' ? 'fail' : 'unknown';
              const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '—';
              return `
            <div class="checklist-item ${cls}" title="${check.detail || ''}">
              <span class="check-icon">${icon}</span>
              <span class="check-text">${check.label}${check.detail ? ` <small style="color: var(--text-muted);">· ${check.detail}</small>` : ''}</span>
            </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 4. Construction Detailing -->
        <div class="cpanel-pane ${activeTab === 'details' ? 'active' : ''}" id="cpanel-pane-details">
          <div class="cpanel-section-title">
            <span>CONSTRUCTION DETAILS</span>
          </div>
          <p class="cpanel-desc">Parametric standard assemblies linked to plan callouts:</p>
          <div class="cpanel-detail-links">
            <div class="detail-link-card" data-detail-key="footing">
              <span class="detail-icon">🧱</span>
              <div class="detail-meta">
                <span class="detail-title">Strip Footing & Stem Wall</span>
                <span class="detail-sub">Scale 1:10 · Rebar & Drain Tile</span>
              </div>
            </div>
            <div class="detail-link-card" data-detail-key="parapet">
              <span class="detail-icon">🏛️</span>
              <div class="detail-meta">
                <span class="detail-title">Roof Parapet & Coping</span>
                <span class="detail-sub">Scale 1:10 · EPDM & Insulation</span>
              </div>
            </div>
            <div class="detail-link-card" data-detail-key="window_sill">
              <span class="detail-icon">🪟</span>
              <div class="detail-meta">
                <span class="detail-title">Window Sill Cavity Wall</span>
                <span class="detail-sub">Scale 1:5 · Stone Sill & Flashing</span>
              </div>
            </div>
            <div class="detail-link-card" data-detail-key="stair_nosing">
              <span class="detail-icon">🪜</span>
              <div class="detail-meta">
                <span class="detail-title">Stair Nosing & Baluster</span>
                <span class="detail-sub">Scale 1:5 · Carborundum & Post</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Constraints (deterministic) -->
        <div class="cpanel-pane ${activeTab === 'constraints' ? 'active' : ''}" id="cpanel-pane-constraints">
          <div class="cpanel-section-title">
            <span>CONSTRAINTS</span>
            <span class="cpanel-id-badge" id="cpanel-constraint-count">${(options.constraints && options.constraints.length) || 0}</span>
          </div>
          <div id="cpanel-constraint-list" class="cpanel-constraint-list">
            ${(options.constraints && options.constraints.length > 0) ? options.constraints.map(c => `
              <div class="constraint-card status-${c.status || 'untested'}" data-constraint-id="${c.id}">
                <div class="constraint-head">
                  <span class="constraint-name">${c.label || c.type}</span>
                  <span class="constraint-status status-${c.status || 'untested'}">${(c.status || 'untested').toUpperCase()}</span>
                </div>
                ${c.message ? `<div class="constraint-msg">${c.message}</div>` : ''}
                <div class="constraint-targets">${(c.targetIds || []).join(' · ')}</div>
                ${c.resolutions && c.resolutions.length ? `
                  <div class="constraint-resolutions">
                    ${c.resolutions.map(r => `<div>→ ${r}</div>`).join('')}
                  </div>` : ''}
                <div class="constraint-actions">
                  <button type="button" class="btn btn-xs btn-outline" data-constraint-act="test" data-constraint-id="${c.id}">Diagnose</button>
                  <button type="button" class="btn btn-xs btn-primary" data-constraint-act="solve" data-constraint-id="${c.id}">Satisfy</button>
                  <button type="button" class="btn btn-xs btn-outline" data-constraint-act="remove" data-constraint-id="${c.id}">✕</button>
                </div>
              </div>
            `).join('') : `
              <div class="cpanel-empty-state">
                <span class="empty-icon">🔗</span>
                <p>No constraints on this document</p>
                <span class="empty-hint">Select entities, then add a constraint below. Every constraint is one deterministic rule — conflicts never distort geometry.</span>
              </div>
            `}
          </div>
          ${options.constraintTargets && options.constraintTargets.length > 0 ? `
            <div class="constraint-adder">
              <div class="cpanel-section-title" style="margin-top: 0.5rem;">
                <span>ADD ON SELECTION (${options.constraintTargets.length})</span>
              </div>
              <select id="cpanel-constraint-type" class="calc-input" style="width: 100%; font-size: 0.72rem; height: 26px;">
                ${(options.constraintChoices || []).map(ch => `<option value="${ch.value}">${ch.label}</option>`).join('')}
              </select>
              <input type="number" id="cpanel-constraint-param" class="calc-input" placeholder="value (m)" step="0.05" min="0" style="width: 100%; font-size: 0.72rem; height: 26px; margin-top: 4px;" />
              <button type="button" class="btn btn-xs btn-primary" id="cpanel-constraint-add" style="width: 100%; margin-top: 4px;">+ Add Constraint</button>
            </div>
          ` : ''}
        </div>

        <!-- 6. Transform — precise numeric control of the selection -->
        <div class="cpanel-pane ${activeTab === 'transform' ? 'active' : ''}" id="cpanel-pane-transform">
          <div class="cpanel-section-title"><span>TRANSFORM</span></div>
          ${(options.transformRows && options.transformRows.length > 0) ? `
            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
              ${options.transformRows.map(r => `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.68rem; color: var(--text-secondary); min-width: 2.6em; font-family: var(--font-mono);" title="${r.title || ''}">${r.label}</span>
                  <input type="number" class="calc-input xform-input" data-xform="${r.key}" value="${r.value}" step="${r.step || 0.1}"
                    style="flex: 1; height: 24px; font-size: 0.72rem; padding: 0 6px; font-family: var(--font-mono);" />
                  <span style="font-size: 0.62rem; color: var(--text-muted);">${r.unit || 'm'}</span>
                </div>`).join('')}
            </div>
            <div style="font-size: 0.63rem; color: var(--text-muted); margin-top: 0.4rem; line-height: 1.35;">
              Edit any value and press Enter to apply (undoable). Height applies to walls/solids; rotation spins about the selection center.
            </div>
          ` : `
            <div class="cpanel-empty-state">
              <span class="empty-icon">⤢</span>
              <p>No selection</p>
              <span class="empty-hint">Select any entity — its exact position, size, and rotation become editable numbers here.</span>
            </div>
          `}
          ${options.cameraRows && options.cameraRows.length > 0 ? `
            <div class="cpanel-section-title" style="margin-top: 0.6rem;"><span>3D CAMERA</span></div>
            <div style="display: flex; flex-direction: column; gap: 0.3rem;">
              ${options.cameraRows.map(r => `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.68rem; color: var(--text-secondary); min-width: 2.6em; font-family: var(--font-mono);">${r.label}</span>
                  <input type="number" class="calc-input xform-input" data-cam="${r.key}" value="${r.value}" step="${r.step || 1}"
                    style="flex: 1; height: 24px; font-size: 0.72rem; padding: 0 6px; font-family: var(--font-mono);" />
                  <span style="font-size: 0.62rem; color: var(--text-muted);">${r.unit || ''}</span>
                </div>`).join('')}
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                ${(options.cameraPresets || []).map(p => `<button type="button" class="btn btn-xs btn-outline" data-cam-shot="${p.id}" title="${p.title}">${p.label}</button>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Tier 2: Dedicated Architectural Tool Guide & Standards Inspector -->
      <div id="cpanel-tool-guide-card" class="cpanel-tool-guide-card">
        <!-- Populated dynamically by updateInspectorGuide() -->
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Initialize Tier 2 Architectural Guide
  updateInspectorGuide(activeToolId);

  container.querySelectorAll('.cpanel-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.panelTab;
      if (typeof options.onSelectPanelTab === 'function') {
        options.onSelectPanelTab(tab);
      }
    });
  });

  container.querySelectorAll('.detail-link-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.detailKey;
      if (typeof options.onSelectDetailLink === 'function') {
        options.onSelectDetailLink(key);
      }
    });
  });

  container.querySelectorAll('[data-constraint-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = btn.dataset.constraintAct;
      const id = btn.dataset.constraintId;
      if (typeof options.onConstraintAction === 'function') {
        options.onConstraintAction(act, id);
      }
    });
  });

  const addBtn = container.querySelector('#cpanel-constraint-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const typeSel = container.querySelector('#cpanel-constraint-type');
      const paramInput = container.querySelector('#cpanel-constraint-param');
      if (typeof options.onAddConstraint === 'function') {
        options.onAddConstraint(
          typeSel ? typeSel.value : null,
          paramInput ? parseFloat(paramInput.value) : null
        );
      }
    });
  }

  // Transform tab: numeric edits apply on Enter/blur; camera fields likewise.
  container.querySelectorAll('[data-xform]').forEach(inp => {
    const apply = () => {
      if (typeof options.onTransformField === 'function') {
        options.onTransformField(inp.dataset.xform, parseFloat(inp.value));
      }
    };
    inp.addEventListener('change', apply);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  });
  container.querySelectorAll('[data-cam]').forEach(inp => {
    const apply = () => {
      if (typeof options.onCameraField === 'function') {
        options.onCameraField(inp.dataset.cam, parseFloat(inp.value));
      }
    };
    inp.addEventListener('change', apply);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  });
  container.querySelectorAll('[data-cam-shot]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof options.onCameraShot === 'function') options.onCameraShot(btn.dataset.camShot);
    });
  });
}
