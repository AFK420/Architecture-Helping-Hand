import { renderResearchSections } from './research-sections.js';
/**
 * Architecture Helping Hand — Research Dashboard View (Phase F)
 *
 * The Research workspace's home screen: an honest, project-linked snapshot
 * of what is known before design starts — brief summary, research
 * references by category, research notes, decisions — plus the starter-pack
 * curator and next-step guidance. Everything renders from the live project
 * store; nothing is invented.
 */

import {
  ensureResearchContainer,
  researchSnapshot,
  REFERENCE_CATEGORIES,
  RESEARCH_STARTER_PACK,
  createReference,
  createResearchNote
} from '../../core/research.js';

export function createResearchDashboardView(context) {
  const { state, dom, showToast, copyToClipboard, AudioService, switchMode, projectStore } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getProject() {
    try { return projectStore.getProject(); } catch { return null; }
  }

  function mutate(fn) {
    // updateProject contract: the mutator must RETURN the draft document.
    const res = projectStore.updateProject(draft => {
      ensureResearchContainer(draft);
      fn(draft);
      return draft;
    });
    if (!res.ok) showToast('Could not save research — project store refused the update', 'error');
    return res;
  }

  // -------------------------------------------------------------------------
  // Quick note composer (top of dashboard)
  // -------------------------------------------------------------------------
  function submitNote() {
    // Read live by id — the composer is re-created on every render, so
    // boot-time dom references would be stale.
    const textEl = document.getElementById('research-note-input');
    const topicEl = document.getElementById('research-note-topic');
    const sourceEl = document.getElementById('research-note-source');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) {
      showToast('Write the observation first', 'warning');
      return;
    }
    const result = createResearchNote({
      text,
      topic: topicEl ? topicEl.value.trim() : '',
      source: sourceEl ? sourceEl.value.trim() : ''
    });
    if (!result.ok) {
      showToast(result.errors[0], 'error');
      return;
    }
    mutate(draft => { draft.research.notes.unshift(result.note); });
    if (textEl) textEl.value = '';
    if (sourceEl) sourceEl.value = '';
    AudioService.playSuccess();
    showToast('Research note saved to the project', 'success');
    render();
  }

  function deleteNote(id) {
    mutate(draft => {
      draft.research.notes = draft.research.notes.filter(n => n.id !== id);
    });
    AudioService.playTick();
    showToast('Research note deleted');
    render();
  }

  // -------------------------------------------------------------------------
  // Starter-pack curation
  // -------------------------------------------------------------------------
  function addStarter(title) {
    const seed = RESEARCH_STARTER_PACK.find(p => p.title === title);
    if (!seed) return;
    const p = getProject();
    const research = p ? ensureResearchContainer(p) : { references: [] };
    const dupe = research.references.some(r => r.title.toLowerCase() === seed.title.toLowerCase());
    if (dupe) {
      showToast('Already in your references', 'info');
      return;
    }
    const result = createReference(seed);
    if (!result.ok) {
      showToast(result.errors[0], 'error');
      return;
    }
    mutate(draft => { draft.research.references.unshift(result.reference); });
    AudioService.playSuccess();
    showToast(`Added "${seed.title}" to project references`, 'success');
    render();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  function render() {
    const host = dom.researchDashboard;
    if (!host) return;

    const p = getProject();
    if (!p) {
      host.innerHTML = `
        <div class="archi-card" style="padding: 1.4rem;">
          <div class="result-header"><span class="result-label">RESEARCH DASHBOARD</span></div>
          <p class="landing-foundation-note">Research lives inside a project — create or open one in the <strong>Project</strong> workspace (08) and the dashboard will track its brief, references, notes, and decisions here.</p>
          <div class="landing-action-row">
            <button type="button" class="result-action-btn" data-goto="projects">Open the Project workspace</button>
          </div>
        </div>`;
      wireButtons(host);
      return;
    }

    const research = ensureResearchContainer(p);
    const snap = researchSnapshot(p);
    const brief = p.brief || {};
    const buildingType = brief.buildingType || '';
    const siteLocation = brief.site?.location || '';
    const decisions = Array.isArray(p.decisions) ? p.decisions : [];

    // Category coverage strip
    const catChips = REFERENCE_CATEGORIES.map(c => `
      <button type="button" class="research-cat-chip ${snap.byCategory[c.id] > 0 ? 'covered' : 'empty'}"
        data-cat="${c.id}" title="${c.desc}">
        <span class="research-cat-count">${snap.byCategory[c.id]}</span>
        <span class="research-cat-label">${c.label}</span>
      </button>
    `).join('');

    const notesHtml = research.notes.length === 0
      ? `<p class="landing-foundation-note">No research notes yet — capture what you learn as you go: observations, source names, questions to answer.</p>`
      : `<ul class="research-note-list">` + research.notes.slice(0, 12).map(n => `
          <li class="research-note-item">
            <div class="research-note-head">
              ${n.topic ? `<span class="research-note-topic">${escapeHtml(n.topic)}</span>` : ''}
              <span class="research-note-time">${n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}</span>
            </div>
            <div class="research-note-text">${escapeHtml(n.text)}</div>
            ${n.source ? `<div class="research-note-source">Source: ${escapeHtml(n.source)}</div>` : ''}
            <div class="research-note-actions">
              <button type="button" class="result-action-btn" data-copy-note="${escapeHtml(n.id)}">Copy</button>
              <button type="button" class="result-action-btn" data-del-note="${escapeHtml(n.id)}">Delete</button>
            </div>
          </li>`).join('') + '</ul>';

    const referencesHtml = research.references.length === 0
      ? `<p class="landing-foundation-note">No saved references yet. Add them in <strong>References Library</strong>, or start from the curated pack below.</p>`
      : `<ul class="research-ref-mini-list">` + research.references.slice(0, 6).map(r => {
          const cat = REFERENCE_CATEGORIES.find(c => c.id === r.category);
          return `
          <li class="research-ref-mini">
            <span class="research-ref-cat">${cat ? cat.label : 'Other'}</span>
            <span class="research-ref-title">${escapeHtml(r.title)}</span>
            ${r.architect ? `<span class="research-ref-meta">${escapeHtml(r.architect)}${r.year ? ' · ' + r.year : ''}</span>` : ''}
          </li>`;
        }).join('') + '</ul>';

    const usedStarterTitles = new Set(research.references.map(r => r.title.toLowerCase()));
    const starterHtml = RESEARCH_STARTER_PACK.map(s => `
      <button type="button" class="research-starter-btn ${usedStarterTitles.has(s.title.toLowerCase()) ? 'added' : ''}"
        data-starter="${escapeHtml(s.title)}" ${usedStarterTitles.has(s.title.toLowerCase()) ? 'disabled' : ''}
        title="${escapeHtml(s.summary)}">
        <strong>${escapeHtml(s.title)}</strong>
        <span>${escapeHtml(s.architect)}${s.year ? ' · ' + s.year : ''}</span>
        <span class="research-starter-state">${usedStarterTitles.has(s.title.toLowerCase()) ? 'In your library ✓' : '+ Add to project'}</span>
      </button>
    `).join('');

    host.innerHTML = `
      <div class="research-dash-grid">
        <!-- Project context -->
        <section class="archi-card research-dash-card" aria-label="Project research context">
          <div class="result-header"><span class="result-label">PROJECT CONTEXT</span></div>
          <h3 class="research-dash-project">${escapeHtml(p.metadata?.name || 'Untitled Project')}</h3>
          ${buildingType ? `<p class="research-dash-briefline"><strong>Building type:</strong> ${escapeHtml(buildingType)}</p>` : '<p class="research-dash-briefline research-dash-missing">No building type set — define it in Brief &amp; Requirements so research targets the right typology.</p>'}
          ${siteLocation ? `<p class="research-dash-briefline"><strong>Site:</strong> ${escapeHtml(siteLocation)}</p>` : '<p class="research-dash-briefline research-dash-missing">No site location recorded yet.</p>'}
          <div class="research-dash-stats">
            <div class="research-stat"><span class="research-stat-value">${snap.totalReferences}</span><span class="research-stat-label">References</span></div>
            <div class="research-stat"><span class="research-stat-value">${snap.totalNotes}</span><span class="research-stat-label">Notes</span></div>
            <div class="research-stat"><span class="research-stat-value">${decisions.length}</span><span class="research-stat-label">Decisions</span></div>
            <div class="research-stat"><span class="research-stat-value">${snap.categoriesCovered.length}/${REFERENCE_CATEGORIES.length}</span><span class="research-stat-label">Categories covered</span></div>
          </div>
        </section>

        <!-- Note composer -->
        <section class="archi-card research-dash-card" aria-label="Research notes">
          <div class="result-header"><span class="result-label">QUICK RESEARCH NOTE</span></div>
          <textarea id="research-note-input" class="research-note-input" rows="3"
            placeholder="What did you find? e.g. 'Double-height atrium improved daylight in 3 of 4 studied libraries'"></textarea>
          <div class="research-note-meta-row">
            <input type="text" id="research-note-topic" class="research-note-topic-input" placeholder="Topic (e.g. daylight, circulation)" />
            <input type="text" id="research-note-source" class="research-note-source-input" placeholder="Source (book, site visit, person)" />
            <button type="button" class="result-action-btn" id="research-note-submit">Save note</button>
          </div>
          ${notesHtml}
        </section>

        <!-- Coverage + references -->
        <section class="archi-card research-dash-card" aria-label="Research coverage">
          <div class="result-header"><span class="result-label">COVERAGE BY CATEGORY</span></div>
          <div class="research-cat-row">${catChips}</div>
          ${referencesHtml}
          <div class="landing-action-row">
            <button type="button" class="result-action-btn" data-goto="research_library">Open References Library</button>
          </div>
        </section>

        <!-- Starter pack -->
        <section class="archi-card research-dash-card" aria-label="Curated starter references">
          <div class="result-header"><span class="result-label">STARTER REFERENCES</span><span class="unit-system-tag" style="font-size:0.7rem;">CURATE — NOTHING AUTO-ADDED</span></div>
          <div class="research-starter-grid">${starterHtml}</div>
        </section>

        <!-- Decisions -->
        <section class="archi-card research-dash-card" aria-label="Design decisions">
          <div class="result-header"><span class="result-label">DECISIONS LOG</span></div>
          ${decisions.length === 0
            ? '<p class="landing-foundation-note">No design decisions recorded yet. Decisions you log in Research and Requirements appear here as research context.</p>'
            : `<ul class="research-note-list">` + decisions.slice(0, 6).map(d => `
                <li class="research-note-item"><div class="research-note-text">${escapeHtml(d.text || d.title || d.summary || JSON.stringify(d))}</div></li>`).join('') + '</ul>'}
        </section>
      </div>
    `;

    host.innerHTML = '<details class="companion-advanced"><summary>Reference summaries, research journal &amp; starter references</summary>'+host.innerHTML+'</details>';
    renderResearchSections(host,context);
    wireButtons(host);

    // Bind note composer
    const submitBtn = document.getElementById('research-note-submit');
    submitBtn?.addEventListener('click', submitNote);
    const noteInput = document.getElementById('research-note-input');
    noteInput?.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitNote(); }
    });
  }

  function wireButtons(host) {
    host.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.goto));
    });
    host.querySelectorAll('[data-starter]').forEach(btn => {
      btn.addEventListener('click', () => addStarter(btn.dataset.starter));
    });
    host.querySelectorAll('[data-del-note]').forEach(btn => {
      btn.addEventListener('click', () => deleteNote(btn.dataset.delNote));
    });
    host.querySelectorAll('[data-copy-note]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = getProject();
        const note = p ? ensureResearchContainer(p).notes.find(n => n.id === btn.dataset.copyNote) : null;
        if (note) copyToClipboard(note.text, 'Research note');
      });
    });
  }

  return {
    id: 'research_dashboard',
    mount() { render(); },
    onModeEnter() { render(); },
    getController() { return { render, submitNote }; }
  };
}
