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
            <div class="checklist-item pass">
              <span class="check-icon">✅</span>
              <span class="check-text">IBC Headroom Clearance (≥ 2.0m)</span>
            </div>
            <div class="checklist-item pass">
              <span class="check-icon">✅</span>
              <span class="check-text">Egress Corridor Width (≥ 1.10m)</span>
            </div>
            <div class="checklist-item pass">
              <span class="check-icon">✅</span>
              <span class="check-text">Stair Blondel 2R+T Compliance</span>
            </div>
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
}
