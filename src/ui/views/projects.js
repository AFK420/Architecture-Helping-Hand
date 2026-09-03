/**
 * Architecture Helping Hand - Project Workspace View (Mode 18)
 * Phase 2: user-facing project management over the existing project store.
 * New / Save / Open / Duplicate / Rename / Delete / Export / Import /
 * Snapshots. All persistence goes through src/services/store.js; imported
 * documents are validated through core/export/export-model.js + project model.
 */

import { deserializeProjectJSON } from '../../core/export/export-model.js';
import { cloneProject, touchProject } from '../../core/project.js';
import { generateProjectId } from '../../core/project.js';

export function createProjectsView(context) {
  const {
    state, dom, showToast, setUnifiedResultState, AudioService,
    switchMode, views, projectStore, StorageService
  } = context;

  function showError(message) {
    if (dom.projectsErrorMsg) {
      dom.projectsErrorMsg.textContent = `⚠️ ${message}`;
      dom.projectsErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'projects', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.projectsErrorMsg) {
      dom.projectsErrorMsg.style.display = 'none';
      dom.projectsErrorMsg.textContent = '';
    }
  }

  function currentProject() {
    try {
      return projectStore.getProject();
    } catch (e) {
      return null;
    }
  }

  function renderCurrentInfo() {
    const p = currentProject();
    if (!p || !dom.projectsCurrentInfo) return;
    if (dom.projectsNameInput && document.activeElement !== dom.projectsNameInput) {
      dom.projectsNameInput.value = p.metadata.name;
    }
    if (dom.projectsDescInput && document.activeElement !== dom.projectsDescInput) {
      dom.projectsDescInput.value = p.site?.description || p.metadata.description || '';
    }
    dom.projectsCurrentInfo.textContent =
      `id: ${p.id} · created: ${p.metadata.createdAt || '—'} · updated: ${p.metadata.updatedAt || '—'} · decisions: ${p.decisions.length} · dimensions: ${p.dimensions.length}`;
  }

  function renderLibrary() {
    if (!dom.projectsLibraryList) return;
    const res = projectStore.listProjects();
    if (!res.ok) {
      dom.projectsLibraryList.innerHTML = '<div style="color: var(--color-error); font-size: 0.75rem;">Library unavailable</div>';
      return;
    }
    if (dom.projectsCountBadge) {
      dom.projectsCountBadge.textContent = `${res.projects.length} SAVED`;
    }
    if (res.projects.length === 0) {
      dom.projectsLibraryList.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">No saved projects yet — press SAVE to keep the current one.</div>';
      return;
    }
    const activeId = currentProject()?.id;
    dom.projectsLibraryList.innerHTML = res.projects.map(p => `
      <div class="projects-library-row" role="listitem" style="display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: center; padding: 0.45rem 0.6rem; border: 1px solid var(--border-color-light); border-radius: 5px; background: ${p.id === activeId ? 'var(--bg-chip)' : 'transparent'};">
        <button type="button" class="projects-open-btn" data-id="${p.id}" title="Open this project"
          style="text-align: left; background: none; border: none; cursor: pointer; color: var(--text-primary); font-family: var(--font-family-mono); font-size: 0.78rem;">
          <strong style="color: var(--accent-primary);">${escapeHtml(p.name)}</strong>
          <span style="color: var(--text-muted);"> · ${p.id}</span>
        </button>
        <button type="button" class="projects-delete-lib-btn" data-id="${p.id}" title="Delete this library copy" aria-label="Delete ${escapeHtml(p.name)} from library"
          style="background: none; border: none; color: var(--text-muted); cursor: pointer;">✕</button>
      </div>
    `).join('');

    dom.projectsLibraryList.querySelectorAll('.projects-open-btn').forEach(btn => {
      btn.addEventListener('click', () => openProject(btn.dataset.id));
    });
    dom.projectsLibraryList.querySelectorAll('.projects-delete-lib-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const res2 = projectStore.deleteProject(btn.dataset.id);
        if (res2.ok) {
          showToast('Library copy deleted (open document untouched)');
          renderLibrary();
        } else {
          showToast(res2.errors[0], 'warning');
        }
      });
    });
  }

  function renderSnapshots() {
    if (!dom.projectsSnapshotsList) return;
    const p = currentProject();
    if (!p) return;
    if (!p.snapshots || p.snapshots.length === 0) {
      dom.projectsSnapshotsList.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">No snapshots yet. Capture one before a big design change.</div>';
      return;
    }
    dom.projectsSnapshotsList.innerHTML = p.snapshots.map(s => `
      <div class="projects-snapshot-row" role="listitem" style="display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: center; padding: 0.4rem 0.6rem; border: 1px solid var(--border-color-light); border-radius: 5px;">
        <div style="font-family: var(--font-family-mono); font-size: 0.75rem;">
          <strong style="color: var(--accent-primary);">${escapeHtml(s.label)}</strong>
          <span style="color: var(--text-muted);"> · ${new Date(s.createdAt).toLocaleString()}</span>
        </div>
        <button type="button" class="projects-restore-btn" data-id="${s.id}" title="Restore this snapshot (the snapshot itself is preserved)">↺ Restore</button>
      </div>
    `).join('');

    dom.projectsSnapshotsList.querySelectorAll('.projects-restore-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = projectStore.restoreSnapshot(btn.dataset.id);
        if (res.ok) {
          showToast('Snapshot restored — subsequent saves write the restored state');
          AudioService.playSuccess();
          renderAll();
        } else {
          showToast(res.errors[0], 'warning');
        }
      });
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderAll() {
    renderCurrentInfo();
    renderLibrary();
    renderSnapshots();
  }

  function newProject() {
    const name = dom.projectsNameInput?.value?.trim() || 'Untitled Project';
    projectStore.createNewProject({ name });
    clearError();
    renderAll();
    setUnifiedResultState({ toolPrefix: 'projects', status: 'success' });
    showToast(`New project "${name}" created — press SAVE to keep it`);
    AudioService.playTick();
  }

  function saveProject() {
    const p = currentProject();
    if (!p) {
      showError('No project open');
      return;
    }
    // Apply name/description fields before saving
    applyInfo({ silent: true });
    const saved = projectStore.saveProject();
    const lib = projectStore.saveProjectToLibrary();
    if (saved.ok && lib.ok) {
      clearError();
      setUnifiedResultState({ toolPrefix: 'projects', status: 'success' });
      showToast(`Project "${p.metadata.name}" saved`);
      AudioService.playSuccess();
      renderAll();
    } else {
      showError((saved.errors || lib.errors || ['save failed'])[0]);
    }
  }

  function openProject(id) {
    const res = projectStore.loadProjectFromLibrary(id);
    if (res.ok) {
      clearError();
      renderAll();
      showToast(`Opened "${res.project.metadata.name}"`);
      AudioService.playTick();
    } else {
      showError(res.errors[0]);
    }
  }

  function applyInfo({ silent = false } = {}) {
    const res = projectStore.updateProject(draft => {
      if (dom.projectsNameInput?.value?.trim()) draft.metadata.name = dom.projectsNameInput.value.trim();
      if (dom.projectsDescInput) {
        draft.metadata.description = dom.projectsDescInput.value;
        draft.site.description = dom.projectsDescInput.value;
      }
      return draft;
    });
    if (res.ok) {
      if (!silent) showToast('Project info updated');
      renderCurrentInfo();
    } else if (!silent) {
      showError(res.errors[0]);
    }
    return res.ok;
  }

  function duplicateProject() {
    const p = currentProject();
    if (!p) {
      showError('No project open to duplicate');
      return;
    }
    applyInfo({ silent: true });
    const copy = cloneProject(p);
    copy.id = generateProjectId();
    copy.metadata = { ...copy.metadata, name: `${p.metadata.name} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    copy.snapshots = [];
    const res = projectStore.setProject(copy);
    if (!res.ok) {
      showError(res.errors[0]);
      return;
    }
    const lib = projectStore.saveProjectToLibrary();
    if (lib.ok) {
      showToast(`Duplicated as "${copy.metadata.name}"`);
      renderAll();
      AudioService.playTick();
    } else {
      showError(lib.errors[0]);
    }
  }

  function deleteSelected() {
    // Deletes the LIBRARY copy of the currently open project if present.
    const p = currentProject();
    if (!p) return;
    const inLibrary = projectStore.listProjects().projects.some(x => x.id === p.id);
    if (!inLibrary) {
      showToast('Current project has no library copy to delete', 'warning');
      return;
    }
    if (!window.confirm(`Delete library copy of "${p.metadata.name}"? The open document stays in memory.`)) return;
    const res = projectStore.deleteProject(p.id);
    if (res.ok) {
      showToast('Library copy deleted');
      renderLibrary();
    } else {
      showError(res.errors[0]);
    }
  }

  function exportJson() {
    applyInfo({ silent: true });
    switchMode('export');
    // Pre-select the project source in the export center
    if (dom.exportSourceSelect) dom.exportSourceSelect.value = 'project';
    views.callController('export', 'build', true);
    showToast('Export Center opened with the full project');
  }

  function importJson() {
    const raw = dom.projectsImportBox?.value || '';
    if (!raw.trim()) {
      showError('Paste project JSON into the import box first.');
      return;
    }
    let project;
    try {
      project = deserializeProjectJSON(raw);
    } catch (e) {
      showError(`Import rejected: ${e.message}`);
      return;
    }
    // Validated — apply as the current project (original untouched on failure)
    const res = projectStore.setProject(project);
    if (res.ok) {
      clearError();
      if (dom.projectsImportBox) dom.projectsImportBox.value = '';
      showToast(`Imported "${res.project.metadata.name}"`);
      AudioService.playSuccess();
      renderAll();
    } else {
      showError(`Import rejected: ${res.errors[0]}`);
    }
  }

  function captureSnapshot() {
    const label = dom.projectsSnapshotLabel?.value?.trim() || undefined;
    const res = projectStore.createSnapshot(label);
    if (res.ok) {
      showToast(`Snapshot "${res.snapshot.label}" captured`);
      AudioService.playTick();
      renderSnapshots();
    } else {
      showError(res.errors[0]);
    }
  }

  return {
    id: 'projects',
    mount() {
      renderAll();
    },
    getController() {
      return { renderAll, renderLibrary, renderSnapshots, newProject, saveProject, openProject, applyInfo, duplicateProject, deleteSelected, exportJson, importJson, captureSnapshot };
    }
  };
}
