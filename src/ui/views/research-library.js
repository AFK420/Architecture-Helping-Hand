import { reportSafeURL } from '../../core/reports/templates.js';
import { citationForSource } from '../../core/research-workspace.js';
/**
 * Architecture Helping Hand — References Library View (Phase F)
 *
 * Project-linked library of architectural references: precedents, case
 * studies, materials, standards, typology and context research. Supports
 * add/edit-free workflow (create + delete), category pills, tag filters,
 * free search, URL links, and per-reference takeaway notes. All data lives
 * in the project store (research.references) — the library is empty until
 * the user fills it; the starter pack is one click away from the dashboard.
 */

import {
  ensureResearchContainer,
  createReference,
  filterReferences,
  collectReferenceTags,
  REFERENCE_CATEGORIES
} from '../../core/research.js';

export function createReferencesLibraryView(context) {
  const { dom, showToast, copyToClipboard, AudioService, projectStore, switchMode } = context;

  // Local UI filter state
  const ui = { tokens: [], category: '', tag: '', editId: '' };

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
    if (!res.ok) showToast('Could not save — project store refused the update', 'error');
    return res;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  function addReference() {
    const get = id => document.getElementById(id);
    const result = createReference({
      ...(ui.editId?{id:ui.editId,createdAt:getProject()?.research?.references.find(r=>r.id===ui.editId)?.createdAt}:{}),
      title: get('ref-title-input')?.value,
      ...Object.fromEntries(['author','publisher','publicationDate','retrievedAt','citationText','imageAttribution','notes','verification'].map(k=>[k,get('ref-'+k)?.value||''])),
      category: get('ref-category-select')?.value,
      architect: get('ref-architect-input')?.value,
      year: get('ref-year-input')?.value ? parseInt(get('ref-year-input').value, 10) : null,
      location: get('ref-location-input')?.value,
      url: get('ref-url-input')?.value,
      summary: get('ref-summary-input')?.value,
      takeaway: get('ref-takeaway-input')?.value,
      tags: (get('ref-tags-input')?.value || '').split(',').map(t => t.trim()).filter(Boolean)
    });
    if (!result.ok) {
      showToast(result.errors[0], 'error');
      AudioService.playError();
      return;
    }
    const saved=mutate(draft => {
      if(ui.editId){const index=draft.research.references.findIndex(r=>r.id===ui.editId);if(index>=0)draft.research.references[index]={...draft.research.references[index],...result.reference};}
      else draft.research.references.unshift(result.reference);
    });
    if(!saved.ok)return;
    ui.editId='';
    for (const id of ['ref-title-input', 'ref-architect-input', 'ref-year-input', 'ref-location-input', 'ref-url-input', 'ref-summary-input', 'ref-takeaway-input', 'ref-tags-input']) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
    AudioService.playSuccess();
    showToast(`Reference "${result.reference.title}" saved`, 'success');
    render();
  }

  function deleteReference(id) {
    const project=getProject();
    if((project?.research?.claims||[]).some(c=>c.sourceIds?.includes(id)) || (project?.site?.study?.analyses||[]).some(a=>a.sourceIds?.includes(id))) {showToast('This source is cited by a finding or site analysis. Remove those links before deleting it.','warning');return;}
    mutate(draft => {
      draft.research.references = draft.research.references.filter(r => r.id !== id);
    });
    AudioService.playTick();
    showToast('Reference deleted');
    render();
  }

  function exportMarkdown() {
    const p = getProject();
    if (!p) return;
    const refs = ensureResearchContainer(p).references;
    if (refs.length === 0) { showToast('Library is empty', 'warning'); return; }
    const md = ['# Research References — ' + (p.metadata?.name || 'Untitled Project'), '']
      .concat(refs.map(r => {
        const cat = REFERENCE_CATEGORIES.find(c => c.id === r.category);
        return [
          `## ${r.title}`,
          `- **Category:** ${cat ? cat.label : 'Other'}`,
          r.architect ? `- **Architect:** ${r.architect}` : '',
          r.year ? `- **Year:** ${r.year}` : '',
          r.location ? `- **Location:** ${r.location}` : '',
          r.url ? `- **URL:** ${r.url}` : '',
          r.summary ? `- **Summary:** ${r.summary}` : '',
          r.takeaway ? `- **Takeaway:** ${r.takeaway}` : '',
          (r.tags || []).length ? `- **Tags:** ${r.tags.join(', ')}` : ''
        ].filter(Boolean).join('\n');
      })).join('\n\n');
    copyToClipboard(md, 'References as Markdown');
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  function render() {
    const host = dom.researchLibrary;
    if (!host) return;

    const p = getProject();
    if (!p) {
      host.innerHTML = `
        <div class="archi-card" style="padding: 1.4rem;">
          <div class="result-header"><span class="result-label">REFERENCES LIBRARY</span></div>
          <p class="landing-foundation-note">References are saved inside a project. Open or create one in the <strong>Project</strong> workspace first.</p>
          <div class="landing-action-row"><button type="button" class="result-action-btn" data-goto="projects">Open the Project workspace</button></div>
        </div>`;
      host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.goto)));
      return;
    }

    const research = ensureResearchContainer(p);
    const allTags = collectReferenceTags(research.references);
    const filtered = filterReferences(research.references, {
      tokens: ui.tokens,
      category: ui.category,
      ... (ui.tag ? { tokens: [...ui.tokens, ui.tag] } : {})
    });

    // --- Add form ---
    const formHtml = `
      <section class="archi-card research-lib-card" aria-label="Add a reference">
        <div class="result-header"><span class="result-label">ADD A REFERENCE</span></div>
        <div class="research-lib-form">
          <input type="text" id="ref-title-input" class="research-lib-input research-lib-title" placeholder="Title (required) — building, book, material, standard…" />
          <select id="ref-category-select" class="research-lib-input research-lib-category">
            ${REFERENCE_CATEGORIES.map(c => `<option value="${c.id}">${c.label} — ${c.desc}</option>`).join('')}
          </select>
          <input type="text" id="ref-architect-input" class="research-lib-input" placeholder="Architect / author (optional)" />
          <input type="number" id="ref-year-input" class="research-lib-input research-lib-year" placeholder="Year" min="0" max="2100" />
          <input type="text" id="ref-location-input" class="research-lib-input" placeholder="Location (optional)" />
          <input type="text" id="ref-url-input" class="research-lib-input research-lib-url" placeholder="URL — http(s):// or www. (optional)" />
          <textarea id="ref-summary-input" class="research-lib-input research-lib-summary" rows="2" placeholder="What is it? (short factual summary)"></textarea>
          <textarea id="ref-takeaway-input" class="research-lib-input research-lib-takeaway" rows="2" placeholder="Why it matters to YOUR project (the takeaway you will cite later)"></textarea>
          <input type="text" id="ref-tags-input" class="research-lib-input" placeholder="Tags, comma separated (e.g. daylight, courtyard, library)" />
          <details class="companion-advanced"><summary>Source provenance &amp; attribution</summary><div class="companion-form-grid">${['author','publisher','publicationDate','retrievedAt','citationText','imageAttribution','notes'].map(k=>`<label for="ref-${k}">${escapeHtml(k.replace(/([A-Z])/g,' $1'))}<input type="${k.includes('Date')||k==='retrievedAt'?'date':'text'}" id="ref-${k}" class="text-input"></label>`).join('')}<label for="ref-verification">Verification<select id="ref-verification" class="calc-select"><option value="unverified">Unverified / recorded</option><option value="verified">Checked by user</option></select></label></div></details>
          <button type="button" class="result-action-btn research-lib-add-btn" id="ref-add-btn">Save reference</button>
        </div>
      </section>
    `;

    // --- Filter bar ---
    const catPills = [{ id: '', label: 'All' }].concat(REFERENCE_CATEGORIES).map(c => `
      <button type="button" class="research-pill ${ui.category === c.id ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>
    `).join('');
    const tagPills = allTags.length === 0 ? '' : `<div class="research-tag-row">` + [''].concat(allTags).map(t => t === ''
      ? `<button type="button" class="research-pill research-tag-pill ${ui.tag === '' ? 'active' : ''}" data-tag="">All tags</button>`
      : `<button type="button" class="research-pill research-tag-pill ${ui.tag === t ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('') + '</div>';

    const filterBar = `
      <section class="research-filter-bar" aria-label="Filter references">
        <input type="text" id="ref-search-input" class="research-lib-input research-lib-search" placeholder="Search references…"
          value="${escapeHtml(ui.tokens.join(' '))}" />
        <div class="research-pill-row">${catPills}</div>
        ${tagPills}
        <div class="research-filter-meta">
          <span>${filtered.length} of ${research.references.length} shown</span>
          <button type="button" class="result-action-btn" id="ref-export-md">Export as Markdown</button>
        </div>
      </section>
    `;

    // --- List ---
    const listHtml = filtered.length === 0
      ? `<div class="archi-card research-lib-empty"><p class="landing-foundation-note">${research.references.length === 0
          ? 'The library is empty. Add your first reference above — or open the <strong>Research Dashboard</strong> and curate the starter pack.'
          : 'No references match the current filters.'}</p></div>`
      : `<div class="research-lib-grid">` + filtered.map(r => {
          const cat = REFERENCE_CATEGORIES.find(c => c.id === r.category);
          return `
          <article class="archi-card research-ref-card" data-id="${escapeHtml(r.id)}">
            <div class="result-header">
              <span class="result-label">${cat ? cat.label.toUpperCase() : 'OTHER'}</span>
              <span class="research-ref-year">${r.year || ''}</span>
            </div>
            <h4 class="research-ref-title">${reportSafeURL(r.url) ? `<a href="${escapeHtml(reportSafeURL(r.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>` : escapeHtml(r.title)}</h4>
            ${r.architect ? `<div class="research-ref-byline">${escapeHtml(r.architect)}${r.location ? ' · ' + escapeHtml(r.location) : ''}</div>` : (r.location ? `<div class="research-ref-byline">${escapeHtml(r.location)}</div>` : '')}
            ${r.summary ? `<p class="research-ref-summary">${escapeHtml(r.summary)}</p>` : ''}
            ${r.takeaway ? `<div class="research-ref-takeaway"><strong>Takeaway:</strong> ${escapeHtml(r.takeaway)}</div>` : ''}
            ${(r.tags || []).length ? `<div class="research-ref-tags">${r.tags.map(t => `<span class="research-ref-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            <div class="research-ref-actions">
              <button type="button" class="result-action-btn" data-copy-ref="${escapeHtml(r.id)}">Copy citation</button>
              <button type="button" class="result-action-btn" data-edit-ref="${escapeHtml(r.id)}">Edit source</button>
              <button type="button" class="result-action-btn" data-del-ref="${escapeHtml(r.id)}">Delete</button>
            </div>
          </article>`;
        }).join('') + '</div>';

    host.innerHTML = formHtml + filterBar + listHtml;
    const editing=research.references.find(r=>r.id===ui.editId);
    if(editing){
      for(const [field,key] of [['ref-title-input','title'],['ref-category-select','category'],['ref-architect-input','architect'],['ref-year-input','year'],['ref-location-input','location'],['ref-url-input','url'],['ref-summary-input','summary'],['ref-takeaway-input','takeaway']])host.querySelector('#'+field).value=editing[key]||'';
      host.querySelector('#ref-tags-input').value=(editing.tags||[]).join(', ');
      for(const key of ['author','publisher','publicationDate','retrievedAt','citationText','imageAttribution','notes','verification'])host.querySelector('#ref-'+key).value=editing[key]|| (key==='verification'?'unverified':'');
      host.querySelector('#ref-add-btn').textContent='Save source changes';
    }
    host.querySelectorAll('input,textarea,select').forEach(field=>{if(!field.getAttribute('aria-label') && !host.querySelector('label[for="'+field.id+'"]'))field.setAttribute('aria-label',field.placeholder||field.id);});
    wire(host);
  }

  function citationOf(ref) {
    const cat = REFERENCE_CATEGORIES.find(c => c.id === ref.category);
    const bits = [ref.architect, ref.year].filter(Boolean);
    return citationForSource(ref).text;
    // Legacy formatting retained only for historical reference.
    /* return `${ref.title}${bits.length ? ' (' + bits.join(', ') + ')' : ''}${ref.location ? ' — ' + ref.location : ''}${cat ? ' [' + cat.label + ']' : ''}${ref.url ? ' ' + ref.url : ''}`.trim(); */
  }

  function wire(host) {
    document.getElementById('ref-add-btn')?.addEventListener('click', addReference);

    const search = document.getElementById('ref-search-input');
    search?.addEventListener('input', () => {
      ui.tokens = search.value.trim() ? search.value.trim().split(/\s+/) : [];
      // Re-render only the list + meta, keeping focus: simplest correct
      // approach is a light re-render that preserves the input value.
      const pos = search.selectionStart;
      render();
      const next = document.getElementById('ref-search-input');
      if (next) { next.focus(); next.setSelectionRange(pos, pos); }
    });

    host.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => { ui.category = btn.dataset.cat; render(); });
    });
    host.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', () => { ui.tag = ui.tag === btn.dataset.tag ? '' : btn.dataset.tag; render(); });
    });
    document.getElementById('ref-export-md')?.addEventListener('click', exportMarkdown);
    host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.goto)));

    host.querySelectorAll('[data-del-ref]').forEach(btn => {
      btn.addEventListener('click', () => deleteReference(btn.dataset.delRef));
    });
    host.querySelectorAll('[data-edit-ref]').forEach(btn=>btn.addEventListener('click',()=>{ui.editId=btn.dataset.editRef;render();document.getElementById('ref-title-input')?.focus();}));
    host.querySelectorAll('[data-copy-ref]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = getProject();
        const ref = p ? ensureResearchContainer(p).references.find(r => r.id === btn.dataset.copyRef) : null;
        if (ref) copyToClipboard(citationOf(ref), 'Citation');
      });
    });
  }

  return {
    id: 'research_library',
    mount() { render(); },
    onModeEnter() { render(); },
    getController() { return { render, addReference }; }
  };
}
