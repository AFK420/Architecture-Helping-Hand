/**
 * Architecture Helping Hand - Requirements Studio View
 * Phase 10: project brief, requirements, adjacency and design intent —
 * evaluated deterministically against the actual model.
 */

import {
  createProjectBrief, validateBrief, createRoomRequirement, createRequirement,
  createAdjacency, evaluateBriefCompliance, ADJACENCY_LEVELS
} from '../../core/requirements.js';

export function createRequirementsView(context) {
  const { state, dom, showToast, projectStore, views } = context;

  function brief() {
    const p = projectStore.getProject();
    if (!p.brief) p.brief = createProjectBrief();
    return p.brief;
  }

  function save() {
    projectStore.saveProject();
  }

  function renderAll() {
    renderBriefEditor();
    renderResults();
  }

  function renderBriefEditor() {
    const host = dom.reqBriefEditor;
    if (!host) return;
    const b = brief();
    host.innerHTML = `
      <div class="brief-editor">
        <div class="plan-prop-row"><span class="plan-prop-label">Building type</span>
          <input id="brief-building-type" class="text-input" value="${escapeAttr(b.buildingType)}" style="width: 140px;" /></div>
        <div class="plan-prop-row"><span class="plan-prop-label">Floors</span>
          <input id="brief-floors" class="text-input" type="number" min="1" value="${b.floors ?? ''}" style="width: 60px;" /></div>
        <div class="plan-prop-row"><span class="plan-prop-label">Net area target (m²)</span>
          <input id="brief-net-area" class="text-input" type="number" value="${b.areaTargets.netM2 ?? ''}" style="width: 80px;" /></div>
        <div class="plan-prop-row"><span class="plan-prop-label">Accessibility target</span>
          <input id="brief-access" class="text-input" value="${escapeAttr(b.accessibility.target)}" style="width: 140px;" placeholder="e.g. ADA 2010" /></div>
        <button type="button" id="brief-save-btn" class="plan-prop-btn"><span>Save Brief</span></button>
      </div>`;
    host.querySelector('#brief-save-btn')?.addEventListener('click', () => {
      const b2 = brief();
      b2.buildingType = host.querySelector('#brief-building-type').value.trim();
      const floors = parseInt(host.querySelector('#brief-floors').value, 10);
      b2.floors = Number.isFinite(floors) ? floors : null;
      const net = parseFloat(host.querySelector('#brief-net-area').value);
      b2.areaTargets.netM2 = Number.isFinite(net) ? net : null;
      b2.accessibility.target = host.querySelector('#brief-access').value.trim();
      save();
      showToast('Project brief saved', 'success');
      renderResults();
    });
  }

  function renderResults() {
    const host = dom.reqResults;
    if (!host) return;
    const b = brief();
    const entities = state.plan.entities || [];
    const report = evaluateBriefCompliance(b, entities);

    const statusBadge = (s) => {
      const cls = { PASS: 'info-check-pass', FAIL: 'info-check-fail' }[s] ||
        (s === 'WARNING' ? 'sug-med' : 'info-check');
      return `<span class="${cls}" style="padding:1px 6px; border-radius:4px; font-family:var(--font-mono); font-size:0.66rem;">${escapeHtml(s)}</span>`;
    };
    const rows = report.results.map(r => `
      <div class="plan-prop-row" style="align-items:flex-start; flex-direction:column; gap:2px;">
        <div style="display:flex; gap:6px; align-items:center;">
          ${statusBadge(r.status)}
          <strong style="font-size:0.74rem;">${escapeHtml(r.name)}</strong>
          <span style="font-size:0.64rem; color:var(--text-muted);">(${escapeHtml(r.kind)})</span>
        </div>
        <div style="font-size:0.66rem; color:var(--text-secondary);">${escapeHtml(r.message || '')}</div>
      </div>`).join('');

    const counts = report.counts;
    host.innerHTML = `
      <div class="requirements-panel">
        <div class="plan-prop-title">REQUIREMENTS vs MODEL</div>
        <div class="issues-summary">
          ${counts.PASS} PASS · ${counts.FAIL} FAIL · ${counts.WARNING} WARNING ·
          ${counts.NEEDS_INPUT} NEEDS INPUT · ${counts.NOT_APPLICABLE} N/A
        </div>
        ${rows || '<div class="issues-empty">No requirements defined yet. Add room requirements to evaluate against the model.</div>'}
        <div class="plan-prop-title" style="margin-top:0.5rem;">ROOM REQUIREMENTS</div>
        <div class="plan-prop-row"><span class="plan-prop-label">Name</span>
          <input id="req-room-name" class="text-input" placeholder="Bedroom" style="width:100px;" /></div>
        <div class="plan-prop-row"><span class="plan-prop-label">Count</span>
          <input id="req-room-count" class="text-input" type="number" min="1" value="1" style="width:50px;" /></div>
        <div class="plan-prop-row"><span class="plan-prop-label">Min area (m²)</span>
          <input id="req-room-area" class="text-input" type="number" placeholder="14" style="width:60px;" /></div>
        <button type="button" id="req-room-add" class="plan-prop-btn"><span>Add Room Requirement</span></button>
        <button type="button" id="req-adj-add" class="plan-prop-btn"><span>Add Adjacency (Kitchen↔Dining)</span></button>
      </div>`;

    host.querySelector('#req-room-add')?.addEventListener('click', () => {
      const name = host.querySelector('#req-room-name').value.trim();
      if (!name) { showToast('Room requirement needs a name (e.g. "Bedroom")', 'warning'); return; }
      const count = parseInt(host.querySelector('#req-room-count').value, 10) || 1;
      const area = parseFloat(host.querySelector('#req-room-area').value);
      try {
        brief().roomRequirements.push(
          createRoomRequirement(name, { count, minAreaM2: Number.isFinite(area) ? area : null }));
        save();
        showToast(`Requirement added: ${count} × "${name}"`, 'success');
        renderResults();
      } catch (e) { showToast(e.message, 'warning'); }
    });

    host.querySelector('#req-adj-add')?.addEventListener('click', () => {
      try {
        brief().adjacencies.push(
          createAdjacency('Kitchen', 'Dining', ADJACENCY_LEVELS.REQUIRED, 'HIGH'));
        save();
        showToast('Adjacency added: Kitchen ↔ Dining (required)', 'success');
        renderResults();
      } catch (e) { showToast(e.message, 'warning'); }
    });
  }

  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  return {
    id: 'requirements',
    mount() { renderAll(); },
    onModeEnter() { renderAll(); },
    getController() { return { renderAll, renderResults }; }
  };
}
