/**
 * Architecture Helping Hand — Standards Explorer View (Phase F)
 *
 * Read-only browser over the REAL building-codes engine
 * (src/core/building-codes.js): 7 jurisdictions × 3 disciplines (stairs,
 * ramps, slopes) with numeric limits and legal citations. No invented data —
 * every value shown is the same one the Stairs/Ramps/Slopes calculators
 * enforce at runtime, which is exactly what makes this a research tool.
 */

import { BUILDING_CODES, listBuildingCodes, getBuildingCode } from '../../core/building-codes.js';

export function createStandardsExplorerView(context) {
  const { dom, showToast, copyToClipboard, AudioService, switchMode } = context;

  const DISCIPLINES = [
    { id: 'stair', label: 'Stairs' },
    { id: 'ramp', label: 'Ramps' },
    { id: 'slope', label: 'Pedestrian Slopes' }
  ];

  // Row definitions: [label, valueFn(code), unit, formatter?]
  const ROWS = {
    stair: [
      ['Riser range', c => `${c.stair.riserMinMm} – ${c.stair.riserMaxMm}`, 'mm'],
      ['Optimal riser', c => c.stair.riserOptimalMm, 'mm'],
      ['Tread min (public)', c => c.stair.treadMinMm, 'mm'],
      ['Tread min (residential)', c => c.stair.treadResidentialMinMm, 'mm'],
      ['Blondel 2R+G range', c => `${c.stair.blondelMinMm} – ${c.stair.blondelMaxMm}`, 'mm'],
      ['Max risers per flight', c => c.stair.maxFlightRisers, ''],
      ['Min headroom', c => c.stair.headroomMinMm, 'mm']
    ],
    ramp: [
      ['Max slope', c => `1:${c.ramp.maxSlopeRatio} (${c.ramp.maxSlopePercent}%)`, ''],
      ['Preferred slope', c => `1:${c.ramp.preferredSlopeRatio} (${c.ramp.preferredSlopePercent}%)`, ''],
      ['Max rise per flight', c => Math.round(c.ramp.maxRunRiseMeters * 1000), 'mm'],
      ['Max continuous run', c => c.ramp.maxRunLengthMeters, 'm'],
      ['Min landing length', c => c.ramp.minLandingLengthMm, 'mm'],
      ['Min landing width', c => c.ramp.minLandingWidthMm, 'mm'],
      ['Handrail required above rise', c => c.ramp.handrailRequiredRiseMm, 'mm']
    ],
    slope: [
      ['Max pedestrian walk', c => c.slope.maxPedestrianWalkPercent, '%'],
      ['Max cross slope', c => c.slope.maxCrossSlopePercent, '%']
    ]
  };

  let selected = null; // code id
  let query = '';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function exportTable() {
    const code = getBuildingCode(selected);
    if (!code) return;
    let md = `# ${code.name}\n**Citation:** ${code.citation}\n`;
    for (const d of DISCIPLINES) {
      md += `\n## ${d.label}\n`;
      for (const [label, fn, unit] of ROWS[d.id]) {
        md += `- ${label}: ${fn(code)}${unit ? ' ' + unit : ''}\n`;
      }
      const citation = code[d.id]?.citation;
      if (citation) md += `- Citation: ${citation}\n`;
    }
    copyToClipboard(md, `${code.shortName} standards as Markdown`);
  }

  function render() {
    const host = dom.standardsExplorer;
    if (!host) return;

    const codes = listBuildingCodes();
    if (!selected || !BUILDING_CODES[selected]) selected = codes[0].id;
    const code = getBuildingCode(selected);

    const codePills = codes.map(c => `
      <button type="button" class="research-pill ${c.id === selected ? 'active' : ''}" data-code="${c.id}"
        title="${escapeHtml(c.jurisdiction)}">${c.flag} ${escapeHtml(c.shortName)}</button>
    `).join('');

    const tablesHtml = DISCIPLINES.map(d => {
      const citation = code[d.id]?.citation;
      return `
      <section class="archi-card standards-discipline-card" aria-label="${d.label} standards for ${code.shortName}">
        <div class="result-header">
          <span class="result-label">${d.label} · Reference</span>
          <span class="standards-citation">${escapeHtml(citation || '')}</span>
        </div>
        <table class="standards-table">
          <tbody>
            ${ROWS[d.id].map(([label, fn, unit]) => `
              <tr>
                <td class="standards-label">${label}</td>
                <td class="standards-value">${fn(code)}${unit ? ` <span class="standards-unit">${unit}</span>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="standards-actions">
          <button type="button" class="result-action-btn" data-apply="${d.id}">Use reference in ${d.label === 'Pedestrian Slopes' ? 'Slopes' : d.label} calculator →</button>
        </div>
      </section>`;
    }).join('');

    host.innerHTML = `
      <div class="reference-search"><label for="standards-search-input">Find a guideline</label><input type="search" id="standards-search-input" class="form-input" value="${escapeHtml(query)}" placeholder="Search riser, landing, headroom…"><p>Recorded jurisdiction sources. Verify the current publication and project requirements; these comparisons do not certify compliance.</p></div>
      <section class="research-filter-bar" aria-label="Jurisdiction">
        <div class="research-pill-row">${codePills}</div>
        <div class="research-filter-meta">
          <span class="standards-count">${codes.length} recorded jurisdiction references · verify for your project</span>
          <button type="button" class="result-action-btn" id="standards-export">Export as Markdown</button>
        </div>
      </section>
      <div class="standards-head archi-card">
        <div class="result-header"><span class="result-label">Jurisdiction source</span></div>
        <h3 class="standards-code-name">${escapeHtml(code.name)}</h3>
        <div class="standards-code-jurisdiction">${escapeHtml(code.jurisdiction)}</div>
        <div class="standards-code-citation"><strong>Source citation:</strong> ${escapeHtml(code.citation)}</div>
      </div>
      <div class="standards-grid">${tablesHtml}</div>
    `;
    const filter = () => {
      host.querySelectorAll('.standards-discipline-card').forEach(card => {
        const rows = [...card.querySelectorAll('tbody tr')];
        for (const row of rows) row.hidden = !(`${card.getAttribute('aria-label')} ${row.textContent}`.toLowerCase().includes(query.toLowerCase()));
        card.hidden = !rows.some(row => !row.hidden);
      });
    };
    host.querySelector('#standards-search-input').addEventListener('input', event => { query = event.target.value.trim(); filter(); });
    filter();

    host.querySelectorAll('[data-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        selected = btn.dataset.code;
        AudioService.playTick();
        render();
      });
    });
    document.getElementById('standards-export')?.addEventListener('click', exportTable);
    host.querySelectorAll('[data-apply]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.apply === 'stair' ? 'stairs'
          : btn.dataset.apply === 'ramp' ? 'ramps' : 'slopes';
        switchMode(target);
        const select = document.getElementById(`${target}-code-select`);
        if (select) { select.value = selected; select.dispatchEvent(new Event('change', { bubbles: true })); }
        showToast(`Using ${code.shortName} as a reference. Verify it for your project.`, 'info');
      });
    });
  }

  return {
    id: 'standards_explorer',
    mount() { render(); },
    onModeEnter() { render(); },
    getController() { return { render }; }
  };
}
