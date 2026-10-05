/**
 * Architecture Helping Hand — Site Context Worksheet View (Phase G)
 *
 * Structured site capture stored on the project (site.study): coordinates,
 * climate notes, movement/access, views with bearings, opportunities and
 * constraints. External map services are offered as clearly-labeled
 * EXTERNAL LAUNCH links — nothing pretends to be embedded or synced.
 */

import {
  ensureSiteStudy,
  createCoordinates,
  createViewEntry,
  createSiteFactor,
  externalMapLinks,
  describeHemispheres,
  bearingToCompass
} from '../../core/site.js';

export function createSiteContextView(context) {
  const { dom, showToast, copyToClipboard, AudioService, projectStore, switchMode } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getProject() {
    try { return projectStore.getProject(); } catch { return null; }
  }

  function mutate(fn) {
    const res = projectStore.updateProject(draft => {
      const study = ensureSiteStudy(draft);
      fn(draft, study);
      return draft;
    });
    if (!res.ok) showToast('Could not save — project store refused the update', 'error');
    return res;
  }

  // -------------------------------------------------------------------------
  // Section actions
  // -------------------------------------------------------------------------
  function saveCoordinates() {
    const g = id => document.getElementById(id);
    const result = createCoordinates({
      latDeg: g('site-lat-input')?.value,
      lonDeg: g('site-lon-input')?.value,
      timezoneOffsetHours: g('site-tz-input')?.value,
      city: g('site-city-input')?.value
    });
    if (!result.ok) { showToast(result.errors[0], 'error'); AudioService.playError(); return; }
    mutate((draft, study) => { study.coordinates = result.coordinates; });
    AudioService.playSuccess();
    showToast('Site coordinates saved to the project', 'success');
    render();
  }

  function saveClimate() {
    const g = id => document.getElementById(id);
    const climate = {
      summary: g('climate-summary-input')?.value || '',
      temperatureNotes: g('climate-temp-input')?.value || '',
      precipitationNotes: g('climate-precip-input')?.value || ''
    };
    mutate((draft, study) => { study.climate = climate; });
    AudioService.playSuccess();
    showToast('Climate notes saved', 'success');
  }

  function saveMovement() {
    const g = id => document.getElementById(id);
    const movement = {
      vehicles: g('movement-vehicles-input')?.value || '',
      pedestrians: g('movement-pedestrians-input')?.value || '',
      publicTransport: g('movement-transit-input')?.value || '',
      serviceAccess: g('movement-service-input')?.value || ''
    };
    mutate((draft, study) => { study.movement = movement; });
    AudioService.playSuccess();
    showToast('Movement & access notes saved', 'success');
  }

  function addView() {
    const g = id => document.getElementById(id);
    const result = createViewEntry({
      bearingDeg: g('view-bearing-input')?.value,
      description: g('view-description-input')?.value,
      quality: g('view-quality-select')?.value
    });
    if (!result.ok) { showToast(result.errors[0], 'error'); AudioService.playError(); return; }
    mutate((draft, study) => { study.views.push(result.view); });
    document.getElementById('view-description-input').value = '';
    AudioService.playSuccess();
    showToast(`View ${result.view.compass} (${result.view.bearingDeg}°) added`, 'success');
    render();
  }

  function deleteView(id) {
    mutate((draft, study) => { study.views = study.views.filter(v => v.id !== id); });
    AudioService.playTick();
    showToast('View deleted');
    render();
  }

  function addFactor(kind) {
    const input = document.getElementById(kind === 'constraint' ? 'constraint-input' : 'opportunity-input');
    const result = createSiteFactor({ text: input?.value, kind });
    if (!result.ok) { showToast(result.errors[0], 'error'); AudioService.playError(); return; }
    mutate((draft, study) => {
      if (kind === 'constraint') study.constraints.push(result.factor);
      else study.opportunities.push(result.factor);
    });
    input.value = '';
    AudioService.playSuccess();
    showToast(`${kind === 'constraint' ? 'Constraint' : 'Opportunity'} saved`, 'success');
    render();
  }

  function deleteFactor(kind, id) {
    mutate((draft, study) => {
      if (kind === 'constraint') study.constraints = study.constraints.filter(f => f.id !== id);
      else study.opportunities = study.opportunities.filter(f => f.id !== id);
    });
    AudioService.playTick();
    showToast('Entry deleted');
    render();
  }

  function exportWorksheet() {
    const p = getProject();
    if (!p) return;
    const s = ensureSiteStudy(p);
    const lines = [`# Site Analysis — ${p.metadata?.name || 'Untitled Project'}`];
    if (s.coordinates) lines.push(`**Coordinates:** ${describeHemispheres(s.coordinates)} (UTC${s.coordinates.timezoneOffsetHours >= 0 ? '+' : ''}${s.coordinates.timezoneOffsetHours})${s.coordinates.city ? ' — ' + s.coordinates.city : ''}`);
    lines.push(`**Site location:** ${p.site?.location || '—'}${Number.isFinite(p.site?.areaM2) ? ` · Area: ${p.site.areaM2} m²` : ''}`);
    if (s.climate.summary || s.climate.temperatureNotes || s.climate.precipitationNotes) {
      lines.push('', '## Climate');
      if (s.climate.summary) lines.push(`- ${s.climate.summary}`);
      if (s.climate.temperatureNotes) lines.push(`- Temperature: ${s.climate.temperatureNotes}`);
      if (s.climate.precipitationNotes) lines.push(`- Precipitation: ${s.climate.precipitationNotes}`);
    }
    const mv = s.movement;
    if ([mv.vehicles, mv.pedestrians, mv.publicTransport, mv.serviceAccess].some(Boolean)) {
      lines.push('', '## Movement & Access');
      if (mv.vehicles) lines.push(`- Vehicles: ${mv.vehicles}`);
      if (mv.pedestrians) lines.push(`- Pedestrians: ${mv.pedestrians}`);
      if (mv.publicTransport) lines.push(`- Public transport: ${mv.publicTransport}`);
      if (mv.serviceAccess) lines.push(`- Service access: ${mv.serviceAccess}`);
    }
    if (s.views.length) {
      lines.push('', '## Views');
      for (const v of s.views) lines.push(`- ${v.bearingDeg}° (${v.compass}) — ${v.description} [${v.quality}]`);
    }
    if (s.opportunities.length) lines.push('', '## Opportunities', ...s.opportunities.map(o => `- ${o.text}`));
    if (s.constraints.length) lines.push('', '## Constraints', ...s.constraints.map(c => `- ${c.text}`));
    copyToClipboard(lines.join('\n'), 'Site worksheet as Markdown');
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  function render() {
    const host = dom.siteContext;
    if (!host) return;

    const p = getProject();
    if (!p) {
      host.innerHTML = `
        <div class="archi-card" style="padding: 1.4rem;">
          <div class="result-header"><span class="result-label">SITE CONTEXT WORKSHEET</span></div>
          <p class="landing-foundation-note">Site context lives inside a project — open or create one in the <strong>Project</strong> workspace (08) first.</p>
          <div class="landing-action-row"><button type="button" class="result-action-btn" data-goto="projects">Open the Project workspace</button></div>
        </div>`;
      host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.goto)));
      return;
    }

    const s = ensureSiteStudy(p);
    const coords = s.coordinates;
    const maps = coords ? externalMapLinks(coords) : [];

    host.innerHTML = `
      <div class="site-context-grid">
        <!-- Coordinates -->
        <section class="archi-card site-card" aria-label="Site coordinates">
          <div class="result-header"><span class="result-label">COORDINATES</span></div>
          <div class="site-coord-form">
            <div class="site-coord-row">
              <div><label class="input-label" for="site-lat-input">Latitude (°, N+)</label><input type="number" id="site-lat-input" class="sun-input" step="0.000001" min="-90" max="90" value="${coords ? coords.latDeg : ''}" /></div>
              <div><label class="input-label" for="site-lon-input">Longitude (°, E+)</label><input type="number" id="site-lon-input" class="sun-input" step="0.000001" min="-180" max="180" value="${coords ? coords.lonDeg : ''}" /></div>
            </div>
            <div class="site-coord-row">
              <div><label class="input-label" for="site-tz-input">UTC offset (h)</label><input type="number" id="site-tz-input" class="sun-input" step="1" min="-12" max="14" value="${coords ? coords.timezoneOffsetHours : 3}" /></div>
              <div><label class="input-label" for="site-city-input">City / area</label><input type="text" id="site-city-input" class="sun-input" placeholder="e.g. Amman — Jabal Amman" value="${escapeHtml(coords ? (coords.city || '') : '')}" /></div>
            </div>
            <button type="button" class="result-action-btn site-save-coords" id="site-save-coords-btn">Save coordinates</button>
          </div>
          ${coords ? `<p class="site-hemisphere">${escapeHtml(describeHemispheres(coords))}</p>` : '<p class="site-hint">Coordinates power the Sun Path tool — set them once here.</p>'}
          ${coords ? `
          <div class="result-header site-external-header"><span class="result-label">EXTERNAL MAP LAUNCH</span><span class="unit-system-tag" style="font-size:0.7rem;">OPENS OUTSIDE THIS APP</span></div>
          <div class="site-external-links">
            ${maps.map(m => `<a class="site-external-link" href="${m.url}" target="_blank" rel="noopener noreferrer"><strong>${m.label}</strong><span>${m.desc}</span></a>`).join('')}
          </div>` : ''}
        </section>

        <!-- Climate -->
        <section class="archi-card site-card" aria-label="Climate notes">
          <div class="result-header"><span class="result-label">CLIMATE</span></div>
          <textarea id="climate-summary-input" class="site-textarea" rows="2" placeholder="Overall climate — e.g. 'Hot-dry Mediterranean; summer peaks 35°C, winter rain Nov–Mar'">${escapeHtml(s.climate.summary || '')}</textarea>
          <textarea id="climate-temp-input" class="site-textarea" rows="2" placeholder="Temperature notes — ranges, extremes, design season">${escapeHtml(s.climate.temperatureNotes || '')}</textarea>
          <textarea id="climate-precip-input" class="site-textarea" rows="2" placeholder="Precipitation notes — rain, snow, drainage">${escapeHtml(s.climate.precipitationNotes || '')}</textarea>
          <button type="button" class="result-action-btn" id="climate-save-btn">Save climate notes</button>
        </section>

        <!-- Movement & access -->
        <section class="archi-card site-card" aria-label="Movement and access">
          <div class="result-header"><span class="result-label">MOVEMENT &amp; ACCESS</span></div>
          <textarea id="movement-vehicles-input" class="site-textarea" rows="2" placeholder="Vehicles — roads, traffic, parking">${escapeHtml(s.movement.vehicles || '')}</textarea>
          <textarea id="movement-pedestrians-input" class="site-textarea" rows="2" placeholder="Pedestrians — paths, desire lines, safety">${escapeHtml(s.movement.pedestrians || '')}</textarea>
          <textarea id="movement-transit-input" class="site-textarea" rows="2" placeholder="Public transport — stops, routes, distance">${escapeHtml(s.movement.publicTransport || '')}</textarea>
          <textarea id="movement-service-input" class="site-textarea" rows="2" placeholder="Service access — loading, refuse, fire access">${escapeHtml(s.movement.serviceAccess || '')}</textarea>
          <button type="button" class="result-action-btn" id="movement-save-btn">Save movement notes</button>
        </section>

        <!-- Views -->
        <section class="archi-card site-card" aria-label="Views">
          <div class="result-header"><span class="result-label">VIEWS</span></div>
          <div class="site-view-form">
            <input type="number" id="view-bearing-input" class="sun-input view-bearing" min="0" max="359" step="1" placeholder="Bearing ° (0=N)" />
            <select id="view-quality-select" class="sun-input view-quality">
              <option value="good">Good view</option>
              <option value="fair" selected>Fair view</option>
              <option value="blocked">Blocked / to preserve</option>
            </select>
            <input type="text" id="view-description-input" class="sun-input view-desc" placeholder="What you see — e.g. 'old city skyline to the NW'" />
            <button type="button" class="result-action-btn" id="view-add-btn">Add view</button>
          </div>
          ${s.views.length ? `<ul class="site-view-list">` + s.views.map(v => `
            <li class="site-view-item">
              <span class="site-view-bearing">${v.bearingDeg}° ${v.compass}</span>
              <span class="site-view-desc ${v.quality}">${escapeHtml(v.description)}</span>
              <span class="site-view-quality quality-${v.quality}">${v.quality}</span>
              <button type="button" class="result-action-btn" data-del-view="${escapeHtml(v.id)}">✕</button>
            </li>`).join('') + '</ul>'
          : '<p class="site-hint">Record bearings of the important views — they drive orientation and window placement.</p>'}
        </section>

        <!-- Opportunities & constraints -->
        <section class="archi-card site-card" aria-label="Opportunities and constraints">
          <div class="result-header"><span class="result-label">OPPORTUNITIES</span></div>
          <div class="site-factor-form">
            <input type="text" id="opportunity-input" class="sun-input factor-input" placeholder="An advantage of the site — e.g. 'south-facing slope, good solar gain'" />
            <button type="button" class="result-action-btn" id="opportunity-add-btn">Add</button>
          </div>
          <ul class="site-factor-list opportunities">${s.opportunities.map(o => `
            <li class="site-factor-item"><span>${escapeHtml(o.text)}</span><button type="button" class="result-action-btn" data-del-factor="opportunity:${escapeHtml(o.id)}">✕</button></li>`).join('')}</ul>
          <div class="result-header site-external-header"><span class="result-label">CONSTRAINTS</span></div>
          <div class="site-factor-form">
            <input type="text" id="constraint-input" class="sun-input factor-input" placeholder="A limitation — e.g. 'noise from the highway to the east'" />
            <button type="button" class="result-action-btn" id="constraint-add-btn">Add</button>
          </div>
          <ul class="site-factor-list constraints">${s.constraints.map(c => `
            <li class="site-factor-item"><span>${escapeHtml(c.text)}</span><button type="button" class="result-action-btn" data-del-factor="constraint:${escapeHtml(c.id)}">✕</button></li>`).join('')}</ul>
          <button type="button" class="result-action-btn site-export-btn" id="site-export-btn">Export worksheet as Markdown</button>
        </section>
      </div>
    `;

    document.getElementById('site-save-coords-btn')?.addEventListener('click', saveCoordinates);
    document.getElementById('climate-save-btn')?.addEventListener('click', saveClimate);
    document.getElementById('movement-save-btn')?.addEventListener('click', saveMovement);
    document.getElementById('view-add-btn')?.addEventListener('click', addView);
    document.getElementById('opportunity-add-btn')?.addEventListener('click', () => addFactor('opportunity'));
    document.getElementById('constraint-add-btn')?.addEventListener('click', () => addFactor('constraint'));
    document.getElementById('site-export-btn')?.addEventListener('click', exportWorksheet);
    host.querySelectorAll('[data-del-view]').forEach(b => b.addEventListener('click', () => deleteView(b.dataset.delView)));
    host.querySelectorAll('[data-del-factor]').forEach(b => b.addEventListener('click', () => {
      const [kind, id] = b.dataset.delFactor.split(':');
      deleteFactor(kind, id);
    }));
    host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.goto)));
  }

  return {
    id: 'site_context',
    mount() { render(); },
    onModeEnter() { render(); },
    getController() { return { render, saveCoordinates }; }
  };
}
