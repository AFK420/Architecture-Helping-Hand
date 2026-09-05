/**
 * Architecture Helping Hand - Universal Studio Scratchpad View
 * Milestone 5: Global drawer and cross-tool scratchpad.
 *
 * Persists measurements, notes, and calculation values directly into the
 * active project document (draft.scratchpad), with fallback to in-memory state.
 * Supports quick-add, copy-to-clipboard, export as Markdown table,
 * and dispatching to Dimension Workspace.
 */

import { createDimensionEntry } from '../../core/dimension-workspace.js';

export function createScratchpadView(context) {
  const {
    state, dom, showToast, copyToClipboard, AudioService,
    switchMode, views, projectStore
  } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Local fallback if project store not yet initialized
  let localScratchpad = [];

  function getItems() {
    if (projectStore && typeof projectStore.getProject === 'function') {
      try {
        const p = projectStore.getProject();
        if (p && Array.isArray(p.scratchpad)) {
          return p.scratchpad;
        }
      } catch (err) {
        // Fall back to local
      }
    }
    return localScratchpad;
  }

  function updateBadge(count) {
    if (dom.scratchpadCounterBadge) {
      if (count > 0) {
        dom.scratchpadCounterBadge.textContent = String(count);
        dom.scratchpadCounterBadge.style.display = 'inline-block';
      } else {
        dom.scratchpadCounterBadge.style.display = 'none';
      }
    }
    if (dom.scratchpadCountBadge) {
      dom.scratchpadCountBadge.textContent = `${count} saved`;
    }
  }

  function render() {
    const items = getItems();
    updateBadge(items.length);

    if (!dom.scratchpadList) return;

    if (items.length === 0) {
      dom.scratchpadList.innerHTML = `
        <div class="empty-history-box" style="padding: 2.5rem 1rem; text-align: center;">
          <div class="empty-hist-icon" style="margin-bottom: 0.5rem; opacity: 0.5;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
          </div>
          <div class="empty-hist-title" style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Scratchpad is empty</div>
          <div class="empty-hist-desc" style="color: var(--text-muted); font-size: 0.78rem; margin-top: 0.25rem;">
            Send values from Scale, Stairs, Ramps, or enter quick measurements above.
          </div>
        </div>
      `;
      return;
    }

    dom.scratchpadList.innerHTML = items.map(item => `
      <div class="history-item-card" data-id="${escapeHtml(item.id)}" style="margin-bottom: 0.6rem;">
        <div class="hist-card-top" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <div class="hist-title-group" style="display: flex; gap: 0.4rem; align-items: center;">
            <span class="hist-mode-tag" style="font-size: 0.7rem; padding: 2px 6px; border-radius: 3px; background: var(--bg-chip); color: var(--accent-primary); font-weight: 600;">
              ${escapeHtml(item.source || 'Manual')}
            </span>
            <strong style="font-size: 0.82rem; color: var(--text-primary);">${escapeHtml(item.label || 'Measurement')}</strong>
          </div>
          <span class="hist-time-tag" style="font-size: 0.68rem; color: var(--text-muted);">${escapeHtml(item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
        </div>

        <div style="background: var(--bg-card-header); padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid var(--border-color-light); margin-bottom: 0.45rem;">
          <div style="font-family: var(--font-family-mono); font-size: 1.05rem; font-weight: 700; color: var(--accent-primary); word-break: break-all;">
            ${escapeHtml(item.value)}
          </div>
        </div>

        <div class="hist-card-actions" style="display: flex; gap: 0.4rem; justify-content: flex-end;">
          <button class="scratch-btn-copy action-tool-btn compact" data-text="${escapeHtml(item.value)}" title="Copy value to clipboard" style="font-size: 0.72rem; padding: 2px 8px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy
          </button>
          <button class="scratch-btn-workspace action-tool-btn compact" data-val="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label || item.source || 'Scratchpad')}" title="Send to Dimension Workspace" style="font-size: 0.72rem; padding: 2px 8px;">
            ?? Workspace
          </button>
          <button class="scratch-btn-del action-tool-btn compact danger" data-id="${escapeHtml(item.id)}" title="Delete item" style="font-size: 0.72rem; padding: 2px 8px; color: var(--color-error);">
            ?
          </button>
        </div>
      </div>
    `).join('');

    // Wire item buttons
    dom.scratchpadList.querySelectorAll('.scratch-btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        if (text) {
          copyToClipboard(text, 'Scratchpad Value');
        }
      });
    });

    dom.scratchpadList.querySelectorAll('.scratch-btn-workspace').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        const lbl = btn.dataset.label;
        if (val && state.workspace) {
          const entry = createDimensionEntry({
            name: lbl,
            rawInput: val,
            dimensionType: 'segment',
            notes: 'Imported from Scratchpad'
          }, 'mm');
          state.workspace.entries.push(entry);
          views.callController('workspace', 'saveWorkspace');
          views.callController('workspace', 'renderWorkspace');
          switchMode('workspace');
          showToast(`Sent "${lbl}" to Dimension Workspace`);
        }
      });
    });

    dom.scratchpadList.querySelectorAll('.scratch-btn-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (id) removeItem(id);
      });
    });
  }

  function addItem({ value, label = '', unit = '', source = 'Studio', metadata = null }) {
    if (!value || !String(value).trim()) {
      showToast('Cannot add empty value to scratchpad', 'warning');
      return;
    }

    const item = {
      id: `scratch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      value: String(value).trim(),
      label: String(label).trim(),
      unit: String(unit).trim(),
      source: String(source).trim(),
      metadata,
      timestamp: new Date().toISOString()
    };

    if (projectStore && typeof projectStore.updateProject === 'function') {
      projectStore.updateProject(draft => {
        if (!Array.isArray(draft.scratchpad)) draft.scratchpad = [];
        draft.scratchpad.unshift(item);
        return draft;
      });
    } else {
      localScratchpad.unshift(item);
    }

    render();
    AudioService.playTick();
    showToast(`Added to Scratchpad: ${item.label || item.value}`);
  }

  function removeItem(id) {
    if (projectStore && typeof projectStore.updateProject === 'function') {
      projectStore.updateProject(draft => {
        if (Array.isArray(draft.scratchpad)) {
          draft.scratchpad = draft.scratchpad.filter(x => x.id !== id);
        }
        return draft;
      });
    } else {
      localScratchpad = localScratchpad.filter(x => x.id !== id);
    }
    render();
    showToast('Removed from scratchpad');
  }

  function clearAll() {
    const items = getItems();
    if (items.length === 0) return;
    if (projectStore && typeof projectStore.updateProject === 'function') {
      projectStore.updateProject(draft => {
        draft.scratchpad = [];
        return draft;
      });
    } else {
      localScratchpad = [];
    }
    render();
    showToast('Scratchpad cleared');
  }

  function exportMarkdown() {
    const items = getItems();
    if (items.length === 0) {
      showToast('Scratchpad is empty', 'warning');
      return;
    }
    const header = '| Source | Label | Value | Time |\n| --- | --- | --- | --- |';
    const rows = items.map(item => {
      const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `| ${item.source || 'Manual'} | ${item.label || '-'} | \`${item.value}\` | ${time} |`;
    }).join('\n');

    const md = `### Project Scratchpad (${items.length} items)\n\n${header}\n${rows}\n`;
    copyToClipboard(md, 'Scratchpad (Markdown Table)');
  }

  function toggleDrawer(open) {
    if (!dom.scratchpadDrawer || !dom.scratchpadOverlay) return;
    const shouldOpen = open !== undefined ? Boolean(open) : !dom.scratchpadDrawer.classList.contains('open');
    dom.scratchpadDrawer.classList.toggle('open', shouldOpen);
    dom.scratchpadOverlay.classList.toggle('open', shouldOpen);
    if (shouldOpen) {
      render();
      if (dom.scratchpadQuickVal) dom.scratchpadQuickVal.focus();
    }
  }

  function handleQuickAdd() {
    if (!dom.scratchpadQuickVal) return;
    const val = dom.scratchpadQuickVal.value.trim();
    const lbl = dom.scratchpadQuickLabel ? dom.scratchpadQuickLabel.value.trim() : '';
    if (!val) {
      showToast('Enter a measurement or note first', 'warning');
      return;
    }
    addItem({ value: val, label: lbl, source: 'Quick Entry' });
    dom.scratchpadQuickVal.value = '';
    if (dom.scratchpadQuickLabel) dom.scratchpadQuickLabel.value = '';
    dom.scratchpadQuickVal.focus();
  }

  return {
    id: 'scratchpad',
    mount() {
      // Wire topbar toggle & overlay
      if (dom.scratchpadToggleBtn) {
        dom.scratchpadToggleBtn.addEventListener('click', () => toggleDrawer());
      }
      if (dom.scratchpadOverlay) {
        dom.scratchpadOverlay.addEventListener('click', () => toggleDrawer(false));
      }
      if (dom.scratchpadCloseBtn) {
        dom.scratchpadCloseBtn.addEventListener('click', () => toggleDrawer(false));
      }
      if (dom.scratchpadClearBtn) {
        dom.scratchpadClearBtn.addEventListener('click', clearAll);
      }
      if (dom.scratchpadExportMdBtn) {
        dom.scratchpadExportMdBtn.addEventListener('click', exportMarkdown);
      }
      if (dom.scratchpadQuickAddBtn) {
        dom.scratchpadQuickAddBtn.addEventListener('click', handleQuickAdd);
      }
      if (dom.scratchpadQuickVal) {
        dom.scratchpadQuickVal.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleQuickAdd();
        });
      }
      if (dom.scratchpadQuickLabel) {
        dom.scratchpadQuickLabel.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleQuickAdd();
        });
      }

      render();
    },
    getController() {
      return {
        getItems,
        addItem,
        removeItem,
        clearAll,
        exportMarkdown,
        toggleDrawer,
        render
      };
    }
  };
}
