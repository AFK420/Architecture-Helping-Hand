/**
 * Architecture Helping Hand - Left Vertical Tool Palette Component
 * Sleek 2-column iconic CAD toolstrip with live search, flyouts, and dual-tier guidance integration.
 */

import {
  STUDIO_TOOL_CATALOG,
  TOOL_CATEGORIES,
  searchStudioTools
} from '../../core/personas.js';
import { toolIcon, categoryIcon, icon } from '../../core/icons.js';
import { PLANNED_TOOLS } from '../../core/personas.js';

export function renderStudioPalette(container, options = {}) {
  if (!container) return;

  const currentPersona = options.activePersona || 'studio';
  const activeToolId = options.activeToolId || 'select';

  // Filter tools for current persona (or 'all')
  const personaTools = STUDIO_TOOL_CATALOG.filter(t =>
    t.personas.includes(currentPersona) || t.personas.includes('all')
  );

  // Group by category
  const categoriesPresent = TOOL_CATEGORIES.filter(cat =>
    personaTools.some(t => t.category === cat.id)
  );

  let html = `
    <div class="studio-vertical-toolstrip iconic-toolstrip">
      <!-- Universal Tool Search Header -->
      <div class="palette-search-wrap">
        <div class="palette-search-input-box" title="Search tools by name, hotkey or command (e.g. 'stair', 'W', 'loft')">
          <span class="search-icon">${icon("search", { size: 14 })}</span>
          <input type="text" id="palette-tool-search" class="palette-search-input" placeholder="Find…" autocomplete="off" spellcheck="false" />
        </div>
        <div id="palette-search-results" class="palette-search-dropdown" style="display: none;"></div>
      </div>

      <!-- 2-Column Iconic Tools Grid -->
      <div class="palette-categories-scroll iconic-scroll">
        ${categoriesPresent.map(cat => {
          const toolsInCat = personaTools.filter(t => t.category === cat.id);
          if (toolsInCat.length === 0) return '';
          return `
            <div class="palette-category-group iconic-group" data-category="${cat.id}">
              <div class="palette-category-divider" title="${cat.name}">
                <span class="divider-icon">${categoryIcon(cat.id, { size: 14 })}</span>
              </div>
              <div class="palette-tools-grid iconic-grid">
                ${toolsInCat.map(tool => {
                  const isActive = tool.id === activeToolId;
                  const hasFlyout = Array.isArray(tool.flyout) && tool.flyout.length > 0;
                  const isPlanned = PLANNED_TOOLS.has(tool.id);
                  let badge = tool.shortcut || (tool.commandAlias ? tool.commandAlias.slice(0, 3) : '');
                  if (badge === 'Space+Drag') badge = 'Pan';
                  if (badge === 'Z+E') badge = 'ZE';
                  if (badge === 'Shift+R') badge = '';
                  if (isPlanned) badge = '⏳';
                  const plannedTitle = isPlanned ? ' — PLANNED (not implemented yet)' : '';
                  return `
                    <div class="palette-tool-wrapper iconic-wrapper ${hasFlyout ? 'has-flyout' : ''} ${isPlanned ? 'planned-tool' : ''}">
                      <button type="button" class="palette-tool-btn iconic-tool-btn ${isActive ? 'active' : ''} ${isPlanned ? 'planned' : ''}" data-tool="${tool.id}" title="${tool.name} (${tool.shortcut || tool.commandAlias || ''}) — ${tool.description}${plannedTitle}">
                        <span class="tool-icon">${toolIcon(tool, { size: 18 })}</span>
                        ${badge ? `<kbd class="tool-badge">${badge}</kbd>` : ''}
                        ${hasFlyout ? `<span class="tool-flyout-indicator">▾</span>` : ''}
                      </button>
                      ${hasFlyout ? `
                        <div class="palette-flyout-menu iconic-flyout-menu" style="display: none;">
                          ${tool.flyout.map(sub => `
                            <button type="button" class="flyout-sub-btn ${PLANNED_TOOLS.has(sub.id) ? 'planned' : ''}" data-tool="${sub.id}" title="${sub.name}${PLANNED_TOOLS.has(sub.id) ? ' — PLANNED' : ''}">
                              <span class="sub-icon">${toolIcon(sub, { size: 14 })}</span>
                              <span class="sub-label">${sub.name}</span>
                              ${sub.shortcut ? `<kbd class="sub-kbd">${sub.shortcut}</kbd>` : ''}
                            </button>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Search input handler
  const searchInput = container.querySelector('#palette-tool-search');
  const searchResults = container.querySelector('#palette-search-results');

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (!q) {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
        return;
      }
      const matches = searchStudioTools(q, { persona: currentPersona });
      if (matches.length === 0) {
        const safeQ = q.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        searchResults.innerHTML = `<div class="search-empty-hint">No tools found matching "${safeQ}"</div>`;
        searchResults.style.display = 'block';
        return;
      }

      searchResults.innerHTML = matches.map(m => `
        <button type="button" class="search-result-item" data-tool="${m.id}" data-is-tab="${m.isRibbonTab ? '1' : '0'}" data-tab-id="${m.tabId || ''}" data-persona-id="${m.personaId || ''}" data-is-cat="${m.isCategory ? '1' : '0'}" data-cat-id="${m.categoryId || ''}">
          <span class="search-item-icon">${m.icon}</span>
          <div class="search-item-details">
            <div class="search-item-title-row">
              <span class="search-item-name">${m.name}</span>
              ${m.shortcut ? `<kbd class="search-item-kbd">${m.shortcut}</kbd>` : ''}
            </div>
            <span class="search-item-cat">${m.categoryIcon || '📁'} ${m.categoryName || 'Tools'}${m.commandAlias ? ` · [${m.commandAlias}]` : ''}</span>
          </div>
        </button>
      `).join('');
      searchResults.style.display = 'block';

      searchResults.querySelectorAll('.search-result-item').forEach(itemBtn => {
        itemBtn.addEventListener('click', () => {
          const isTab = itemBtn.dataset.isTab === '1';
          const isCat = itemBtn.dataset.isCat === '1';
          searchResults.style.display = 'none';
          searchInput.value = '';

          if (isTab) {
            const tabId = itemBtn.dataset.tabId;
            const pId = itemBtn.dataset.personaId;
            if (typeof options.onSelectRibbonTab === 'function') {
              options.onSelectRibbonTab(tabId, pId);
            }
          } else if (isCat) {
            const catId = itemBtn.dataset.catId;
            const catSection = container.querySelector(`.palette-category-group[data-category="${catId}"]`);
            if (catSection) {
              catSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          } else {
            const toolId = itemBtn.dataset.tool;
            if (typeof options.onSelectTool === 'function') {
              options.onSelectTool(toolId);
            }
          }
        });
      });
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
  }

  // Tool buttons
  container.querySelectorAll('.palette-tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const toolId = btn.dataset.tool;
      if (typeof options.onSelectTool === 'function') {
        options.onSelectTool(toolId);
      }
    });
  });

  // Flyout menus
  container.querySelectorAll('.palette-tool-wrapper.has-flyout').forEach(wrap => {
    const flyout = wrap.querySelector('.palette-flyout-menu');
    const indicator = wrap.querySelector('.tool-flyout-indicator');
    if (flyout && indicator) {
      indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = flyout.style.display !== 'none';
        container.querySelectorAll('.palette-flyout-menu').forEach(m => m.style.display = 'none');
        flyout.style.display = isOpen ? 'none' : 'flex';
      });
    }

    wrap.querySelectorAll('.flyout-sub-btn').forEach(sBtn => {
      sBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        flyout.style.display = 'none';
        const subId = sBtn.dataset.tool;
        if (typeof options.onSelectTool === 'function') {
          options.onSelectTool(subId);
        }
      });
    });
  });
}
