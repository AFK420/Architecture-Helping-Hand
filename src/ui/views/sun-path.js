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
import {
  calculateSolarShading,
  shadingSectionToSVG,
  shadingSectionToDXF
} from '../../core/solar-shading.js';
import { downloadExport } from '../../services/export.js';
import { ensureSiteStudy } from '../../core/site.js';

export function createSunPathView(context) {
  const { dom, showToast, copyToClipboard, AudioService, projectStore } = context;

  let activeSubTab = 'sun_path'; // 'sun_path' or 'solar_shading'

  // UI state — defaults from the project's site study when present
  const ui = {
    lat: 31.9566, lon: 35.9454, tz: 3,           // Amman default; replaced by project coords
    date: new Date().toISOString().slice(0, 10),
    hour: 12, minute: 0,
    height: 10
  };

  const shadingUi = {
    facadeAz: 180,
    winH: 1.8,
    winW: 2.4,
    sillH: 0.9,
    gapH: 0.15,
    depth: null, // null = auto optimal
    louvers: 1,
    hour: 12
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

    if (activeSubTab === 'solar_shading') {
      const shading = calculateSolarShading({
        latitudeDeg: ui.lat,
        longitudeDeg: ui.lon,
        timezoneOffsetHours: ui.tz,
        facadeAzimuthDeg: shadingUi.facadeAz,
        windowHeightM: shadingUi.winH,
        windowWidthM: shadingUi.winW,
        sillHeightM: shadingUi.sillH,
        headToOverhangM: shadingUi.gapH,
        overhangDepthM: shadingUi.depth,
        louverCount: shadingUi.louvers,
        designHour: shadingUi.hour
      });

      host.innerHTML = `
        <div class="sun-tool-grid">
          <div class="sun-subnav-bar" style="grid-column: 1 / -1; display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
            <button type="button" class="action-tool-btn" id="btn-subtab-sun" style="padding: 0.45rem 1rem;">☀️ Sun Path &amp; Shadow</button>
            <button type="button" class="action-tool-btn primary" id="btn-subtab-shading" style="padding: 0.45rem 1rem; font-weight: 600;">🏛️ Solar Shading &amp; Overhang Calculator</button>
          </div>

          <!-- Facade & Window Inputs Card -->
          <section class="archi-card sun-input-card" aria-label="Facade and window geometry">
            <div class="result-header"><span class="result-label">FACADE &amp; OVERHANG GEOMETRY</span></div>
            <div class="sun-input-form">
              <label class="input-label" for="shading-lat-input">Site Latitude (° N+)</label>
              <input type="number" id="shading-lat-input" class="sun-input" step="0.1" min="-90" max="90" value="${ui.lat}" />

              <label class="input-label">Facade Orientation</label>
              <div class="orientation-pills" style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.5rem;">
                <button type="button" class="action-tool-btn compact ${shadingUi.facadeAz === 180 ? 'primary' : ''}" data-az="180">South (180°)</button>
                <button type="button" class="action-tool-btn compact ${shadingUi.facadeAz === 135 ? 'primary' : ''}" data-az="135">SE (135°)</button>
                <button type="button" class="action-tool-btn compact ${shadingUi.facadeAz === 225 ? 'primary' : ''}" data-az="225">SW (225°)</button>
                <button type="button" class="action-tool-btn compact ${shadingUi.facadeAz === 90 ? 'primary' : ''}" data-az="90">East (90°)</button>
                <button type="button" class="action-tool-btn compact ${shadingUi.facadeAz === 270 ? 'primary' : ''}" data-az="270">West (270°)</button>
                <button type="button" class="action-tool-btn compact ${shadingUi.facadeAz === 0 ? 'primary' : ''}" data-az="0">North (0°)</button>
              </div>
              <input type="number" id="shading-az-input" class="sun-input" step="1" min="0" max="360" value="${shadingUi.facadeAz}" placeholder="Facade Azimuth (0–360°)" />

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div>
                  <label class="input-label" for="shading-winh-input">Window Height (m)</label>
                  <input type="number" id="shading-winh-input" class="sun-input" step="0.05" min="0.2" value="${shadingUi.winH}" />
                </div>
                <div>
                  <label class="input-label" for="shading-winw-input">Window Width (m)</label>
                  <input type="number" id="shading-winw-input" class="sun-input" step="0.05" min="0.2" value="${shadingUi.winW}" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div>
                  <label class="input-label" for="shading-sillh-input">Sill Height (m)</label>
                  <input type="number" id="shading-sillh-input" class="sun-input" step="0.05" min="0" value="${shadingUi.sillH}" />
                </div>
                <div>
                  <label class="input-label" for="shading-gaph-input">Lintel Gap (m)</label>
                  <input type="number" id="shading-gaph-input" class="sun-input" step="0.05" min="0" value="${shadingUi.gapH}" />
                </div>
              </div>

              <label class="input-label" for="shading-depth-input">Overhang Projection (m)</label>
              <input type="number" id="shading-depth-input" class="sun-input" step="0.05" min="0.05" placeholder="Optimal auto (${shading.optimalOverhangDepthM} m)" value="${shadingUi.depth !== null ? shadingUi.depth : ''}" />

              <label class="input-label" for="shading-louvers-input">Shading System</label>
              <select id="shading-louvers-input" class="form-select sun-input" style="width: 100%;">
                <option value="1" ${shadingUi.louvers === 1 ? 'selected' : ''}>Solid Cantilever Overhang (1 Blade)</option>
                <option value="2" ${shadingUi.louvers === 2 ? 'selected' : ''}>Brise-Soleil (2 Horizontal Blades)</option>
                <option value="3" ${shadingUi.louvers === 3 ? 'selected' : ''}>Brise-Soleil (3 Horizontal Blades)</option>
                <option value="4" ${shadingUi.louvers === 4 ? 'selected' : ''}>Brise-Soleil (4 Horizontal Blades)</option>
                <option value="5" ${shadingUi.louvers === 5 ? 'selected' : ''}>Brise-Soleil (5 Horizontal Blades)</option>
                <option value="6" ${shadingUi.louvers === 6 ? 'selected' : ''}>Brise-Soleil (6 Horizontal Blades)</option>
              </select>

              <button type="button" class="result-action-btn primary sun-run-btn" id="shading-calc-btn">Update Shading Analysis</button>
              <button type="button" class="result-action-btn sun-copy-btn" id="shading-reset-depth-btn">Reset to Optimal Depth</button>
            </div>
          </section>

          <!-- Shading Performance & Seasonal Metrics Card -->
          <section class="archi-card sun-times-card" aria-label="Passive solar performance">
            <div class="result-header"><span class="result-label">PASSIVE SOLAR SHADING PERFORMANCE</span></div>
            <div class="sun-times-row" style="margin-bottom: 1rem;">
              <div class="sun-time-tile"><span class="sun-time-value" style="color: #4ade80;">${shading.summer.shadePercent}%</span><span class="sun-time-label">Summer Solstice Shade</span></div>
              <div class="sun-time-tile"><span class="sun-time-value" style="color: #fb923c;">${(100 - shading.winter.shadePercent).toFixed(1)}%</span><span class="sun-time-label">Winter Sun Gain</span></div>
              <div class="sun-time-tile"><span class="sun-time-value">${shading.actualOverhangDepthM}<span class="sun-time-unit">m</span></span><span class="sun-time-label">Overhang Depth</span></div>
              <div class="sun-time-tile"><span class="sun-time-value">${shading.winter.sunPenetrationM}<span class="sun-time-unit">m</span></span><span class="sun-time-label">Winter Sun Floor Depth</span></div>
            </div>

            <table class="standards-table" style="width: 100%; margin-top: 0.5rem;">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Solar Altitude</th>
                  <th>Profile Angle (VSA)</th>
                  <th>Window Shaded</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="standards-label">☀️ Summer Solstice</td>
                  <td class="standards-value">${shading.summer.altitudeDeg}°</td>
                  <td class="standards-value"><strong>${shading.summer.vsaDeg}°</strong></td>
                  <td class="standards-value">${shading.summer.shadedHeightM} m (${shading.summer.shadePercent}%)</td>
                  <td class="standards-value" style="color: #4ade80;">Full 100% Protection</td>
                </tr>
                <tr>
                  <td class="standards-label">❄️ Winter Solstice</td>
                  <td class="standards-value">${shading.winter.altitudeDeg}°</td>
                  <td class="standards-value"><strong>${shading.winter.vsaDeg}°</strong></td>
                  <td class="standards-value">${shading.winter.shadedHeightM} m (${shading.winter.shadePercent}%)</td>
                  <td class="standards-value" style="color: #fb923c;">${(100 - shading.winter.shadePercent).toFixed(1)}% Passive Heating</td>
                </tr>
                <tr>
                  <td class="standards-label">🌱 Equinox (Spring/Fall)</td>
                  <td class="standards-value">${shading.equinox.altitudeDeg}°</td>
                  <td class="standards-value"><strong>${shading.equinox.vsaDeg}°</strong></td>
                  <td class="standards-value">${shading.equinox.shadedHeightM} m (${shading.equinox.shadePercent}%)</td>
                  <td class="standards-value">Balanced Transition</td>
                </tr>
              </tbody>
            </table>

            ${shading.briseSoleil.louverCount > 1 ? `
              <div style="margin-top: 0.75rem; padding: 0.6rem; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 0.85rem;">
                <strong>Brise-Soleil Specification:</strong> ${shading.briseSoleil.louverCount} blades @ ${Math.round(shading.briseSoleil.louverSpacingM * 1000)} mm vertical spacing, blade projection: ${Math.round(shading.briseSoleil.bladeDepthM * 1000)} mm.
              </div>
            ` : ''}

            <div style="margin-top: 0.75rem; padding: 0.6rem; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 0.85rem;">
              <strong>Side Fin Recommendation:</strong> For low morning/afternoon sun protection, use vertical side fins of ${Math.round(shading.verticalFins.finDepthM * 1000)} mm projection.
            </div>
          </section>

          <!-- 2D Architectural Section Preview Card -->
          <section class="archi-card sun-path-card" style="grid-column: 1 / -1;" aria-label="Architectural section detail">
            <div class="result-header">
              <span class="result-label">1:1 ARCHITECTURAL DETAIL SECTION — PASSIVE SOLAR CUTOFF</span>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="action-tool-btn primary compact" id="shading-dxf-btn">Download 1:1 DXF (AutoCAD)</button>
                <button type="button" class="action-tool-btn compact" id="shading-svg-btn">Download SVG</button>
                <button type="button" class="action-tool-btn compact" id="shading-copy-btn">Copy Spec Report</button>
              </div>
            </div>
            <div style="padding: 0.5rem 0;">
              ${shadingSectionToSVG(shading)}
            </div>
            <p class="sun-hint">Real-scale architectural section detail showing wall, glazing, overhang profile, summer cutoff angle (${shading.summer.vsaDeg}°), and winter penetration ray. DXF exports true 1:1 millimeter AutoCAD entities on layers A-WALL, A-GLAZ, A-ROOF, and A-SITE.</p>
          </section>
        </div>
      `;

      document.getElementById('btn-subtab-sun')?.addEventListener('click', () => {
        activeSubTab = 'sun_path';
        AudioService.playTick();
        render();
      });

      document.querySelectorAll('.orientation-pills button').forEach(b => {
        b.addEventListener('click', () => {
          shadingUi.facadeAz = parseInt(b.dataset.az, 10);
          AudioService.playTick();
          render();
        });
      });

      document.getElementById('shading-calc-btn')?.addEventListener('click', () => {
        const g = id => document.getElementById(id);
        const latVal = parseFloat(g('shading-lat-input')?.value);
        if (Number.isFinite(latVal)) ui.lat = latVal;
        const azVal = parseFloat(g('shading-az-input')?.value);
        if (Number.isFinite(azVal)) shadingUi.facadeAz = azVal;
        shadingUi.winH = parseFloat(g('shading-winh-input')?.value || 1.8);
        shadingUi.winW = parseFloat(g('shading-winw-input')?.value || 2.4);
        shadingUi.sillH = parseFloat(g('shading-sillh-input')?.value || 0.9);
        shadingUi.gapH = parseFloat(g('shading-gaph-input')?.value || 0.15);
        const depthVal = parseFloat(g('shading-depth-input')?.value);
        shadingUi.depth = Number.isFinite(depthVal) && depthVal > 0 ? depthVal : null;
        shadingUi.louvers = parseInt(g('shading-louvers-input')?.value || 1, 10);
        AudioService.playTick();
        render();
      });

      document.getElementById('shading-reset-depth-btn')?.addEventListener('click', () => {
        shadingUi.depth = null;
        AudioService.playTick();
        render();
      });

      document.getElementById('shading-dxf-btn')?.addEventListener('click', () => {
        const dxf = shadingSectionToDXF(shading);
        const ok = downloadExport(dxf, `solar-shading-section-${Math.round(shading.actualOverhangDepthM * 1000)}mm.dxf`, 'dxf');
        showToast(ok ? 'Downloaded 1:1 AutoCAD Section DXF' : 'Download failed', ok ? 'success' : 'error');
      });

      document.getElementById('shading-svg-btn')?.addEventListener('click', () => {
        const svg = shadingSectionToSVG(shading);
        const ok = downloadExport(svg, `solar-shading-section.svg`, 'svg');
        showToast(ok ? 'Downloaded SVG Section Detail' : 'Download failed', ok ? 'success' : 'error');
      });

      document.getElementById('shading-copy-btn')?.addEventListener('click', () => {
        const report = [
          `Passive Solar Shading Report`,
          `Site Latitude: ${ui.lat}° | Facade Azimuth: ${shadingUi.facadeAz}°`,
          `Window: ${shadingUi.winW}m W x ${shadingUi.winH}m H | Sill: ${shadingUi.sillH}m | Head Gap: ${shadingUi.gapH}m`,
          `Optimal Overhang Depth: ${shading.optimalOverhangDepthM}m (${Math.round(shading.optimalOverhangDepthM * 1000)} mm)`,
          `Actual Depth: ${shading.actualOverhangDepthM}m (${Math.round(shading.actualOverhangDepthM * 1000)} mm)`,
          `Summer Solstice (June 21): VSA ${shading.summer.vsaDeg}° -> ${shading.summer.shadePercent}% Shade`,
          `Winter Solstice (Dec 21): VSA ${shading.winter.vsaDeg}° -> ${(100 - shading.winter.shadePercent).toFixed(1)}% Solar Heat Gain (Floor penetration: ${shading.winter.sunPenetrationM}m)`,
          shading.briseSoleil.louverCount > 1
            ? `Brise-Soleil: ${shading.briseSoleil.louverCount} louvers @ ${Math.round(shading.briseSoleil.louverSpacingM * 1000)}mm spacing, blade depth ${Math.round(shading.briseSoleil.bladeDepthM * 1000)}mm`
            : `Solid Cantilever Overhang`
        ].join('\n');
        copyToClipboard(report, 'Shading report');
      });

      return;
    }

    host.innerHTML = `
      <div class="sun-tool-grid">
        <div class="sun-subnav-bar" style="grid-column: 1 / -1; display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
          <button type="button" class="action-tool-btn primary" id="btn-subtab-sun" style="padding: 0.45rem 1rem; font-weight: 600;">☀️ Sun Path &amp; Shadow</button>
          <button type="button" class="action-tool-btn" id="btn-subtab-shading" style="padding: 0.45rem 1rem; font-weight: 600;">🏛️ Solar Shading &amp; Overhang Calculator</button>
        </div>
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

    document.getElementById('btn-subtab-shading')?.addEventListener('click', () => {
      activeSubTab = 'solar_shading';
      AudioService.playTick();
      render();
    });
    document.getElementById('btn-subtab-sun')?.addEventListener('click', () => {
      activeSubTab = 'sun_path';
      AudioService.playTick();
      render();
    });

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
