import { renderSiteAnalyses } from './site-analyses.js';
/**
 * Architecture Helping Hand — Site Analysis Dashboard View (Phase G)
 *
 * The Site workspace home: a project-linked overview of the captured site
 * study (coordinates, climate, movement, views, opportunities/constraints)
 * plus live sun quick-facts computed by the solar engine at the project's
 * coordinates. Empty sections point to where to fill them — guidance, not
 * filler.
 */

import {
  ensureSiteStudy,
  siteStudySnapshot,
  externalMapLinks,
  describeHemispheres
} from '../../core/site.js';
import { sunTimes, solarPosition, sunPathForDay } from '../../core/solar.js';

export function createSiteDashboardView(context) {
  const { dom, showToast, switchMode, projectStore } = context;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getProject() {
    try { return projectStore.getProject(); } catch { return null; }
  }

  function render() {
    const host = dom.siteDashboard;
    if (!host) return;

    const p = getProject();
    if (!p) {
      host.innerHTML = `
        <div class="archi-card" style="padding: 1.4rem;">
          <div class="result-header"><span class="result-label">SITE DASHBOARD</span></div>
          <p class="landing-foundation-note">Site analysis lives inside a project — create or open one in the <strong>Project</strong> workspace (08), then capture the site here.</p>
          <div class="landing-action-row"><button type="button" class="result-action-btn" data-goto="projects">Open the Project workspace</button></div>
        </div>`;
      host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.goto)));
      return;
    }

    const s = ensureSiteStudy(p);
    const snap = siteStudySnapshot(p);
    const today = new Date().toISOString().slice(0, 10);

    // Sun quick facts (only if coordinates exist — honest otherwise)
    let sunFacts = null;
    if (s.coordinates) {
      const times = sunTimes({
        latitudeDeg: s.coordinates.latDeg, longitudeDeg: s.coordinates.lonDeg,
        date: today, timezoneOffsetHours: s.coordinates.timezoneOffsetHours
      });
      if (times.ok) {
        const pos = solarPosition({
          latitudeDeg: s.coordinates.latDeg, longitudeDeg: s.coordinates.lonDeg,
          date: today, hour: 12, minute: 0, timezoneOffsetHours: s.coordinates.timezoneOffsetHours
        });
        sunFacts = { times: times.times, noon: pos.ok ? pos.position : null };
      }
    }

    const sectionCard = (label, body, gotoId) => `
      <section class="archi-card site-dash-card">
        <div class="result-header"><span class="result-label">${label}</span></div>
        ${body}
        ${gotoId ? `<div class="landing-action-row"><button type="button" class="result-action-btn" data-goto="${gotoId}">Open ${gotoId === 'site_context' ? 'the worksheet' : 'tool'} →</button></div>` : ''}
      </section>`;

    const viewsBody = s.views.length === 0
      ? '<p class="site-hint">No views recorded yet.</p>'
      : `<ul class="site-view-list">` + s.views.map(v => `
          <li class="site-view-item"><span class="site-view-bearing">${v.bearingDeg}° ${v.compass}</span><span class="site-view-desc ${v.quality}">${escapeHtml(v.description)}</span></li>`).join('') + '</ul>';

    host.innerHTML = `
      <div class="research-dash-grid">
        ${sectionCard('SITE SNAPSHOT', `
          <h3 class="research-dash-project">${escapeHtml(p.site?.location || snap.city || 'Unnamed site')}</h3>
          ${s.coordinates
            ? `<p class="research-dash-briefline"><strong>Coordinates:</strong> ${escapeHtml(describeHemispheres(s.coordinates))} (UTC${s.coordinates.timezoneOffsetHours >= 0 ? '+' : ''}${s.coordinates.timezoneOffsetHours})</p>`
            : '<p class="research-dash-briefline research-dash-missing">No coordinates yet — set them in the worksheet to unlock sun analysis.</p>'}
          ${Number.isFinite(snap.siteAreaM2) ? `<p class="research-dash-briefline"><strong>Area:</strong> ${snap.siteAreaM2} m²</p>` : ''}
          ${snap.siteNotes ? `<p class="research-dash-briefline">${escapeHtml(snap.siteNotes)}</p>` : ''}
          <div class="research-dash-stats">
            <div class="research-stat"><span class="research-stat-value">${snap.opportunityCount}</span><span class="research-stat-label">Opportunities</span></div>
            <div class="research-stat"><span class="research-stat-value">${snap.constraintCount}</span><span class="research-stat-label">Constraints</span></div>
            <div class="research-stat"><span class="research-stat-value">${snap.viewCount}</span><span class="research-stat-label">Views</span></div>
            <div class="research-stat"><span class="research-stat-value">${snap.completeness}/${snap.completenessTotal}</span><span class="research-stat-label">Sections filled</span></div>
          </div>`, 'site_context')}

        ${sunFacts ? sectionCard('SUN TODAY — LIVE ENGINE', `
          <div class="sun-times-row">
            <div class="sun-time-tile"><span class="sun-time-value">${sunFacts.times.sunrise || '—'}</span><span class="sun-time-label">Sunrise</span></div>
            <div class="sun-time-tile"><span class="sun-time-value">${sunFacts.times.solarNoon || '—'}</span><span class="sun-time-label">Solar noon</span></div>
            <div class="sun-time-tile"><span class="sun-time-value">${sunFacts.times.sunset || '—'}</span><span class="sun-time-label">Sunset</span></div>
            <div class="sun-time-tile"><span class="sun-time-value">${sunFacts.times.daylightHours}<span class="sun-time-unit">h</span></span><span class="sun-time-label">Daylight</span></div>
          </div>
          ${sunFacts.noon ? `<p class="research-dash-briefline">At solar noon the sun sits at <strong>${sunFacts.noon.altitudeDeg}°</strong> altitude, bearing <strong>${sunFacts.noon.azimuthDeg}°</strong> — the highest it gets today.</p>` : ''}
          `, 'sun_path')
        : sectionCard('SUN TODAY', '<p class="site-hint">Sun quick-facts appear once the site has coordinates.</p>', 'site_context')}

        ${sectionCard('CLIMATE', s.climate.summary || s.climate.temperatureNotes
          ? `<p class="research-dash-briefline">${escapeHtml(s.climate.summary)}</p>${s.climate.temperatureNotes ? `<p class="research-dash-briefline">${escapeHtml(s.climate.temperatureNotes)}</p>` : ''}`
          : '<p class="site-hint">No climate notes yet.</p>', 'site_context')}

        ${sectionCard('MOVEMENT & ACCESS', [s.movement.vehicles, s.movement.pedestrians, s.movement.publicTransport].some(Boolean)
          ? [s.movement.vehicles && `<p class="research-dash-briefline"><strong>Vehicles:</strong> ${escapeHtml(s.movement.vehicles)}</p>`,
             s.movement.pedestrians && `<p class="research-dash-briefline"><strong>Pedestrians:</strong> ${escapeHtml(s.movement.pedestrians)}</p>`,
             s.movement.publicTransport && `<p class="research-dash-briefline"><strong>Transit:</strong> ${escapeHtml(s.movement.publicTransport)}</p>`].filter(Boolean).join('')
          : '<p class="site-hint">No movement notes yet.</p>', 'site_context')}

        ${sectionCard('VIEWS', viewsBody, 'site_context')}

        ${sectionCard('OPPORTUNITIES', s.opportunities.length
          ? `<ul class="site-factor-list opportunities">` + s.opportunities.map(o => `<li class="site-factor-item"><span>${escapeHtml(o.text)}</span></li>`).join('') + '</ul>'
          : '<p class="site-hint">None recorded yet.</p>', 'site_context')}

        ${sectionCard('CONSTRAINTS', s.constraints.length
          ? `<ul class="site-factor-list constraints">` + s.constraints.map(c => `<li class="site-factor-item"><span>${escapeHtml(c.text)}</span></li>`).join('') + '</ul>'
          : '<p class="site-hint">None recorded yet.</p>', 'site_context')}
      </div>
    `;

    host.innerHTML = '<details class="companion-advanced"><summary>Site snapshot &amp; calculated solar summary</summary>'+host.innerHTML+'</details>';
    renderSiteAnalyses(host,context);
    host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.goto)));
  }

  return {
    id: 'site_dashboard',
    mount() { render(); },
    onModeEnter() { render(); },
    getController() { return { render }; }
  };
}
