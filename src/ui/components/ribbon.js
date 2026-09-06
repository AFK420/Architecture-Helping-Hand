/**
 * Architecture Helping Hand - Top Ribbon Bar Component
 * Dynamically renders ribbon tabs, panels, flyouts, and persona switcher.
 */

import {
  STUDIO_PERSONAS,
  PERSONA_RIBBON_CONFIGS,
  STUDIO_TOOL_CATALOG
} from '../../core/personas.js';

export function renderStudioRibbon(container, options = {}) {
  if (!container) return;

  const currentPersona = options.activePersona || 'studio';
  const currentTabId = options.activeRibbonTab || PERSONA_RIBBON_CONFIGS[currentPersona]?.tabs[0]?.id || 'home';
  const activeToolId = options.activeToolId || 'select';

  const personaConfig = PERSONA_RIBBON_CONFIGS[currentPersona] || PERSONA_RIBBON_CONFIGS.studio;
  const tabs = personaConfig.tabs || [];
  const currentTab = tabs.find(t => t.id === currentTabId) || tabs[0] || { id: 'home', label: 'Home', panels: [] };

  const personaKeys = Object.keys(STUDIO_PERSONAS);

  let html = `
    <div class="studio-ribbon-bar">
      <!-- Persona Switcher Strip -->
      <div class="studio-persona-strip" role="tablist" aria-label="Software Persona Switcher">
        <div class="persona-pill-group">
          ${personaKeys.map(k => {
            const p = STUDIO_PERSONAS[k];
            const isActive = k === currentPersona;
            return `
              <button type="button" class="persona-pill-btn ${isActive ? 'active' : ''}" data-persona="${p.id}" title="${p.description}">
                <span class="persona-icon">${p.icon}</span>
                <span class="persona-label">${p.shortLabel}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Ribbon Suite Tabs -->
      <div class="studio-ribbon-tabs" role="tablist" aria-label="Ribbon Tabs">
        ${tabs.map(tab => {
          const isTabActive = tab.id === currentTab.id;
          return `
            <button type="button" class="ribbon-tab-btn ${isTabActive ? 'active' : ''}" data-ribbon-tab="${tab.id}">
              ${tab.label}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Ribbon Panels Area -->
      <div class="studio-ribbon-panels-wrap">
        ${(currentTab.panels || []).map(panel => {
          return `
            <div class="ribbon-panel-card" data-panel-id="${panel.id}">
              <div class="ribbon-panel-body">
                ${panel.tools.map(toolId => {
                  const tool = STUDIO_TOOL_CATALOG.find(t => t.id === toolId);
                  if (!tool) return '';
                  const isActive = tool.id === activeToolId;
                  const hasFlyout = Array.isArray(tool.flyout) && tool.flyout.length > 0;
                  return `
                    <div class="ribbon-tool-wrap ${hasFlyout ? 'has-flyout' : ''}">
                      <button type="button" class="ribbon-tool-btn ${isActive ? 'active' : ''}" data-tool="${tool.id}" title="${tool.name} (${tool.shortcut || tool.commandAlias || ''}) - ${tool.description}">
                        <span class="ribbon-tool-icon">${tool.icon}</span>
                        <span class="ribbon-tool-name">${tool.name}</span>
                        ${tool.shortcut ? `<kbd class="ribbon-tool-kbd">${tool.shortcut}</kbd>` : ''}
                        ${hasFlyout ? `<span class="flyout-arrow">▾</span>` : ''}
                      </button>
                      ${hasFlyout ? `
                        <div class="ribbon-flyout-popover" style="display: none;">
                          ${tool.flyout.map(sub => `
                            <button type="button" class="flyout-item-btn" data-tool="${sub.id}">
                              <span class="flyout-item-icon">${sub.icon}</span>
                              <span class="flyout-item-name">${sub.name}</span>
                              ${sub.shortcut ? `<kbd class="flyout-item-kbd">${sub.shortcut}</kbd>` : ''}
                            </button>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="ribbon-panel-footer">${panel.title}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event wiring
  container.querySelectorAll('.persona-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const persona = btn.dataset.persona;
      if (typeof options.onSelectPersona === 'function') {
        options.onSelectPersona(persona);
      }
    });
  });

  container.querySelectorAll('.ribbon-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.ribbonTab;
      if (typeof options.onSelectRibbonTab === 'function') {
        options.onSelectRibbonTab(tabId);
      }
    });
  });

  container.querySelectorAll('.ribbon-tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const toolId = btn.dataset.tool;
      if (typeof options.onSelectTool === 'function') {
        options.onSelectTool(toolId);
      }
    });
  });

  // Flyout popover toggle
  container.querySelectorAll('.ribbon-tool-wrap.has-flyout').forEach(wrap => {
    const popover = wrap.querySelector('.ribbon-flyout-popover');
    const arrow = wrap.querySelector('.flyout-arrow');
    if (popover && arrow) {
      arrow.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = popover.style.display !== 'none';
        container.querySelectorAll('.ribbon-flyout-popover').forEach(p => p.style.display = 'none');
        popover.style.display = isShown ? 'none' : 'flex';
      });
    }

    wrap.querySelectorAll('.flyout-item-btn').forEach(fBtn => {
      fBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.style.display = 'none';
        const subId = fBtn.dataset.tool;
        if (typeof options.onSelectTool === 'function') {
          options.onSelectTool(subId);
        }
      });
    });
  });
}
