/**
 * Architecture Helping Hand — Sun Path & Shadow Tool View (Phase G)
 *
 * Deterministic solar analysis for the site: sunrise/sunset/solar noon,
 * live sun position, shadow length for a chosen obstruction height, a
 * sampled day-path diagram drawn as SVG (the UI draws only what the pure
 * engine computes), and a design-critical shadow summary.
 *
 * Location defaults to the project's stored site coordinates (if set in
 * the Site Context Worksheet) — otherwise the architect types a location.
 */

import {
  sunTimes,
  solarPosition,
  shadowAtTime,
  sunPathForDay,
  shadowSummaryForDay
} from '../../core/solar.js';
import { ensureSiteStudy } from '../../core/site.js';

export function createSunPathView(context) {
  const { dom, showToast, copyToClipboard, AudioService, projectStore } = context;

  // UI state — defaults from the project's site study when present
  const ui = {
    lat: 31.9566, lon: 35.9454, tz: 3,           // Amman default; replaced by project coords
    date: new Date().toISOString().slice(0, 10),
    hour: 12, minute: 0,
    height: 10
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getProject() {
    try { return projectStore.getProject(); } catch { return null; }
  }

  function loadFromProject() {
    const p = getProject();
    if (!p) return;
    const study = ensureSiteStudy(p);
    if (study.coordinates && Number.isFinite(study.coordinates.latDeg)) {
      ui.lat = study.coordinates.latDeg;
      ui.lon = study.coordinates.lonDeg;
      ui.tz = study.coordinates.timezoneOffsetHours || 0;
    }
  }

  function readInputs() {
    const g = id => document.getElementById(id);
    ui.lat = parseFloat(g('sun-lat-input')?.value);
    ui.lon = parseFloat(g('sun-lon-input')?.value);
    ui.tz = parseFloat(g('sun-tz-input')?.value || 0);
    ui.date = g('sun-date-input')?.value || ui.date;
    ui.hour = parseInt(g('sun-hour-input')?.value || 12, 10);
    ui.minute = parseInt(g('sun-minute-input')?.value || 0, 10);
    ui.height = parseFloat(g('sun-height-input')?.value || 10);
  }

  // -------------------------------------------------------------------------
  // SVG sun-path diagram (plan view: N up, azimuth clockwise)
  // -------------------------------------------------------------------------
  function renderPathSvg(path, currentPos) {
    const W = 360, H = 360, cx = W / 2, cy = H / 2;
    const R = 152;
    const pt = (az, alt) => {
      // Plan projection: distance from center shrinks as altitude rises
      // (altitude 0° = horizon ring, 90° = directly overhead/center)
      const r = R * Math.cos(alt * Math.PI / 180);
      const a = (az - 90) * Math.PI / 180; // N up: azimuth 0 = up
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    };

    let rings = '';
    for (const alt of [0, 15, 30, 45, 60, 75]) {
      const r = R * Math.cos(alt * Math.PI / 180);
      rings += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="var(--border-subtle)" stroke-width="1" ${alt === 0 ? 'stroke-dasharray=""' : 'stroke-dasharray="2 3"'}/>`;
      if (alt % 30 === 0 && alt > 0) {
        const [lx, ly] = [cx + 4, cy - r];
        rings += `<text x="${lx}" y="${ly}" class="sun-diagram-altlabel">${alt}°</text>`;
      }
    }
    let spokes = '';
    for (const az of [0, 90, 180, 270]) {
      const [x2, y2] = pt(az, 0);
      spokes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--border-subtle)" stroke-width="1"/>`;
    }
    const labels = [['N', cx, 16], ['E', W - 10, cy + 4], ['S', cx, H - 6], ['W', 10, cy + 4]]
      .map(([t, x, y]) => `<text x="${x}" y="${y}" class="sun-diagram-cardinal">${t}</text>`).join('');

    const pathPts = path.map(p => pt(p.azimuthDeg, p.altitudeDeg));
    let pathLine = '';
    let pathDots = '';
    if (pathPts.length > 1) {
      pathLine = `<polyline points="${pathPts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--accent-primary)" stroke-width="2"/>`;
      pathDots = path.filter((p, i) => i % 2 === 0).map((p, i) => {
        const idx = path.indexOf(p);
        const [x, y] = pathPts[idx];
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="var(--accent-primary)"/>
          <text x="${(x + 5).toFixed(1)}" y="${(y - 4).toFixed(1)}" class="sun-diagram-timelabel">${p.time}</text>`;
      }).join('');
    }

    let currentMark = '';
    if (currentPos && currentPos.isAboveHorizon) {
      const [x, y] = pt(currentPos.azimuthDeg, currentPos.altitudeDeg);
      currentMark = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="var(--accent-primary)" opacity="0.35"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--accent-primary)"/>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" class="sun-path-svg" role="img" aria-label="Sun path plan diagram">
      ${rings}${spokes}${labels}${pathLine}${pathDots}${currentMark}
    </svg>`;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  function render() {
    const host = dom.sunPathTool;
    if (!host) return;

    const times = sunTimes({ latitudeDeg: ui.lat, longitudeDeg: ui.lon, date: ui.date, timezoneOffsetHours: ui.tz });
    const pos = solarPosition({ latitudeDeg: ui.lat, longitudeDeg: ui.lon, date: ui.date, hour: ui.hour, minute: ui.minute, timezoneOffsetHours: ui.tz });
    const shadow = shadowAtTime({ latitudeDeg: ui.lat, longitudeDeg: ui.lon, date: ui.date, hour: ui.hour, minute: ui.minute, obstructionHeightM: ui.height, timezoneOffsetHours: ui.tz });
    const dayPath = sunPathForDay({ latitudeDeg: ui.lat, longitudeDeg: ui.lon, date: ui.date, timezoneOffsetHours: ui.tz, sampleStepMinutes: 30 });
    const summary = shadowSummaryForDay({ latitudeDeg: ui.lat, longitudeDeg: ui.lon, date: ui.date, timezoneOffsetHours: ui.tz, obstructionHeightM: ui.height });

    const engineError = !times.ok ? times.errors[0]
      : !pos.ok ? pos.errors[0]
      : !shadow.ok ? shadow.errors[0] : null;

    const timesOk = times.ok && times.times;
    const posOk = pos.ok && pos.position;
    const shadowOk = shadow.ok && shadow.shadow;

    host.innerHTML = `
      <div class="sun-tool-grid">
        <!-- Location & time inputs -->
        <section class="archi-card sun-input-card" aria-label="Location and time">
          <div class="result-header"><span class="result-label">SITE &amp; TIME</span></div>
          <div class="sun-input-form">
            <label class="input-label" for="sun-lat-input">Latitude (°, N+)</label>
            <input type="number" id="sun-lat-input" class="sun-input" step="0.0001" min="-90" max="90" value="${Number.isFinite(ui.lat) ? ui.lat : ''}" />
            <label class="input-label" for="sun-lon-input">Longitude (°, E+)</label>
            <input type="number" id="sun-lon-input" class="sun-input" step="0.0001" min="-180" max="180" value="${Number.isFinite(ui.lon) ? ui.lon : ''}" />
            <label class="input-label" for="sun-tz-input">UTC offset (h)</label>
            <input type="number" id="sun-tz-input" class="sun-input sun-tz-input" step="1" min="-12" max="14" value="${ui.tz}" />
            <label class="input-label" for="sun-date-input">Date</label>
            <input type="date" id="sun-date-input" class="sun-input" value="${ui.date}" />
            <label class="input-label" for="sun-height-input">Obstruction height (m)</label>
            <input type="number" id="sun-height-input" class="sun-input" step="0.1" min="0.1" value="${ui.height}" />
            <label class="input-label" for="sun-hour-input">Time (hour : minute)</label>
            <div class="sun-time-row">
              <input type="number" id="sun-hour-input" class="sun-input sun-hour-input" step="1" min="0" max="23" value="${ui.hour}" />
              <span class="sun-time-sep">:</span>
              <input type="number" id="sun-minute-input" class="sun-input sun-minute-input" step="1" min="0" max="59" value="${ui.minute}" />
            </div>
            <button type="button" class="result-action-btn sun-run-btn" id="sun-run-btn">Calculate</button>
            <button type="button" class="result-action-btn sun-copy-btn" id="sun-copy-btn">Copy report</button>
          </div>
          ${engineError ? `<div class="sun-error">${escapeHtml(engineError)}</div>` : ''}
        </section>

        <!-- Sun times + position -->
        <section class="archi-card sun-times-card" aria-label="Sun times">
          <div class="result-header"><span class="result-label">SUN — ${escapeHtml(ui.date)}</span></div>
          ${timesOk ? `
          <div class="sun-times-row">
            <div class="sun-time-tile"><span class="sun-time-value">${times.times.polarNight ? '—' : times.times.sunrise || '—'}</span><span class="sun-time-label">Sunrise</span></div>
            <div class="sun-time-tile"><span class="sun-time-value">${times.times.polarNight ? '—' : times.times.solarNoon || '—'}</span><span class="sun-time-label">Solar noon</span></div>
            <div class="sun-time-tile"><span class="sun-time-value">${times.times.polarNight ? '—' : times.times.sunset || '—'}</span><span class="sun-time-label">Sunset</span></div>
            <div class="sun-time-tile"><span class="sun-time-value">${times.times.daylightHours}<span class="sun-time-unit">h</span></span><span class="sun-time-label">Daylight</span></div>
          </div>
          ${times.times.polarNight ? '<p class="sun-polar-note">Polar night — the sun does not rise on this date.</p>' : ''}
          ${times.times.midnightSun ? '<p class="sun-polar-note">Midnight sun — the sun does not set on this date.</p>' : ''}
          ` : ''}
          ${posOk ? `
          <div class="sun-position-block">
            <div class="result-header"><span class="result-label">POSITION AT ${String(ui.hour).padStart(2, '0')}:${String(ui.minute).padStart(2, '0')}</span></div>
            <div class="sun-times-row">
              <div class="sun-time-tile"><span class="sun-time-value">${pos.position.azimuthDeg}°</span><span class="sun-time-label">Azimuth (from N, clockwise)</span></div>
              <div class="sun-time-tile"><span class="sun-time-value">${pos.position.altitudeDeg}°</span><span class="sun-time-label">Altitude (above horizon)</span></div>
              <div class="sun-time-tile"><span class="sun-time-value">${pos.position.isAboveHorizon ? 'ABOVE' : 'BELOW'}</span><span class="sun-time-label">Horizon</span></div>
            </div>
          </div>` : ''}
          ${shadowOk ? `
          <div class="sun-shadow-block">
            <div class="result-header"><span class="result-label">SHADOW — ${escapeHtml(String(ui.height))} M OBSTRUCTION</span></div>
            ${shadow.shadow.sunBelowHorizon
              ? '<p class="sun-polar-note">The sun is below the horizon at this time — no shadow is cast.</p>'
              : `<div class="sun-times-row">
                  <div class="sun-time-tile"><span class="sun-time-value">${shadow.shadow.lengthM}<span class="sun-time-unit">m</span></span><span class="sun-time-label">Shadow length</span></div>
                  <div class="sun-time-tile"><span class="sun-time-value">${shadow.shadow.shadowAzimuthDeg}°</span><span class="sun-time-label">Shadow bearing</span></div>
                  <div class="sun-time-tile"><span class="sun-time-value">${shadow.shadow.lengthM >= ui.height ? (shadow.shadow.lengthM / ui.height).toFixed(2) + '×' : (shadow.shadow.lengthM / ui.height).toFixed(2) + '×'}</span><span class="sun-time-label">Length / height ratio</span></div>
                </div>
                <p class="sun-hint">The shadow points ${shadow.shadow.shadowAzimuthDeg}° (from north, clockwise) — away from the sun's ${shadow.shadow.sunAzimuthDeg}° bearing.</p>`}
          </div>` : ''}
        </section>

        <!-- Sun path diagram -->
        <section class="archi-card sun-path-card" aria-label="Sun path diagram">
          <div class="result-header"><span class="result-label">SUN PATH — PLAN VIEW</span><span class="unit-system-tag" style="font-size:0.7rem;">N UP · SAMPLED 30 MIN</span></div>
          ${dayPath.ok ? renderPathSvg(dayPath.path, posOk ? pos.position : null) : '<p class="sun-polar-note">No path available.</p>'}
          <p class="sun-hint">Rings are altitude (0° horizon → 90° overhead). The blue curve is today's path; the solid dot is the position at the chosen time.</p>
        </section>

        <!-- Shadow summary -->
        ${summary.ok ? `
        <section class="archi-card sun-summary-card" aria-label="Shadow summary">
          <div class="result-header"><span class="result-label">SHADOW SUMMARY — ${escapeHtml(ui.date)}</span></div>
          <table class="standards-table">
            <tbody>
              ${summary.summary.shadows.map(s => `
              <tr>
                <td class="standards-label">${s.label}</td>
                <td class="standards-value">${s.sunBelowHorizon ? 'sun below horizon' : `${s.shadowLengthM} <span class="standards-unit">m</span>`}</td>
                <td class="standards-value">${s.sunBelowHorizon ? '—' : `${s.shadowAzimuthDeg}° <span class="standards-unit">bearing</span>`}</td>
                <td class="standards-value">${s.sunBelowHorizon ? '—' : `${s.sunAltitudeDeg}° <span class="standards-unit">alt</span>`}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <p class="sun-hint">For a ${escapeHtml(String(summary.summary.obstructionHeightM))} m obstruction: at solar noon the shadow is shortest and points due ${ui.lat >= 0 ? 'north' : 'south'} (tropics aside); morning/afternoon shadows stretch toward ${ui.lon >= 0 ? 'west' : 'east'} over the day.</p>
        </section>` : ''}
      </div>
    `;

    document.getElementById('sun-run-btn')?.addEventListener('click', () => {
      readInputs();
      AudioService.playTick();
      render();
    });
    document.getElementById('sun-copy-btn')?.addEventListener('click', () => {
      if (!timesOk || !posOk) { showToast('Nothing to copy yet — check the inputs', 'warning'); return; }
      const lines = [
        `Sun analysis — ${ui.date}`,
        `Location: ${ui.lat}°, ${ui.lon}° (UTC${ui.tz >= 0 ? '+' : ''}${ui.tz})`,
        `Sunrise ${times.times.sunrise || '—'} · Solar noon ${times.times.solarNoon || '—'} · Sunset ${times.times.sunset || '—'} · Daylight ${times.times.daylightHours}h`,
        `At ${String(ui.hour).padStart(2, '0')}:${String(ui.minute).padStart(2, '0')}: azimuth ${pos.position.azimuthDeg}°, altitude ${pos.position.altitudeDeg}°`,
        shadowOk && !shadow.shadow.sunBelowHorizon
          ? `Shadow of ${ui.height} m obstruction: ${shadow.shadow.lengthM} m pointing ${shadow.shadow.shadowAzimuthDeg}°`
          : 'Sun below horizon — no shadow.'
      ];
      copyToClipboard(lines.join('\n'), 'Sun report');
    });
  }

  return {
    id: 'sun_path',
    mount() { loadFromProject(); render(); },
    onModeEnter() { loadFromProject(); render(); },
    getController() { return { render, refreshFromProject: loadFromProject }; }
  };
}
