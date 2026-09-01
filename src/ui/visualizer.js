/**
 * Architecture Helping Hand - Proportional Visualizer & Graphic Scale Bar Renderer
 * Rich 2D Top-Down Architectural Blueprint Drawings & Proportional Visualizer
 */

import { REAL_WORLD_REFERENCES } from '../core/presets.js';
import { formatNumber } from '../core/formatter.js';

export function getReferenceSilhouette(iconType) {
  switch (iconType) {
    case 'pen':
      return `
        <svg viewBox="0 0 100 100" class="silhouette-svg" fill="currentColor">
          <path d="M75,10 L90,25 L35,80 L15,85 L20,65 Z" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <path d="M15,85 L25,82 L18,75 Z" fill="currentColor"/>
          <line x1="30" y1="70" x2="80" y2="20" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
        </svg>
      `;
    case 'chair':
      return `
        <svg viewBox="0 0 100 100" class="silhouette-svg" fill="currentColor">
          <rect x="30" y="45" width="40" height="8" rx="2" fill-opacity="0.3"/>
          <path d="M35,20 L35,45 M65,20 L65,45 M35,25 L65,25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M33,53 L28,85 M67,53 L72,85 M40,53 L38,85 M60,53 L62,85" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `;
    case 'desk':
      return `
        <svg viewBox="0 0 120 100" class="silhouette-svg" fill="currentColor">
          <rect x="15" y="35" width="90" height="10" rx="2" fill-opacity="0.3"/>
          <line x1="22" y1="45" x2="22" y2="85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <line x1="98" y1="45" x2="98" y2="85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <rect x="70" y="45" width="25" height="35" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;
    case 'human':
      return `
        <svg viewBox="0 0 100 120" class="silhouette-svg" fill="currentColor">
          <circle cx="50" cy="18" r="8" fill-opacity="0.3" stroke="currentColor" stroke-width="2"/>
          <path d="M42,28 C38,28 35,32 35,38 L37,65 L43,65 L43,105 L47,105 L48,68 L52,68 L53,105 L57,105 L57,65 L63,65 L65,38 C65,32 62,28 58,28 Z" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
    case 'car':
      return `
        <svg viewBox="0 0 140 80" class="silhouette-svg" fill="currentColor">
          <path d="M15,50 L25,32 C28,26 35,24 45,24 L85,24 C95,24 105,30 115,38 L128,45 C133,48 135,52 135,56 L135,62 L15,62 Z" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <circle cx="40" cy="62" r="11" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2.5"/>
          <circle cx="105" cy="62" r="11" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2.5"/>
          <path d="M48,28 L80,28 L80,44 L38,44 Z" fill-opacity="0.3"/>
          <path d="M85,28 L108,38 L108,44 L85,44 Z" fill-opacity="0.3"/>
        </svg>
      `;
    case 'house':
      return `
        <svg viewBox="0 0 120 100" class="silhouette-svg" fill="currentColor">
          <polygon points="60,15 15,48 105,48" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <rect x="25" y="48" width="70" height="42" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          <rect x="52" y="62" width="16" height="28" fill-opacity="0.3" stroke-width="1.5"/>
          <rect x="33" y="55" width="12" height="12" fill-opacity="0.3" stroke-width="1.5"/>
          <rect x="75" y="55" width="12" height="12" fill-opacity="0.3" stroke-width="1.5"/>
        </svg>
      `;
    case 'building':
      return `
        <svg viewBox="0 0 100 120" class="silhouette-svg" fill="currentColor">
          <rect x="20" y="15" width="60" height="95" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          ${[25, 40, 55, 70, 85].map(y => `
            <rect x="28" y="${y}" width="10" height="8" fill-opacity="0.3"/>
            <rect x="45" y="${y}" width="10" height="8" fill-opacity="0.3"/>
            <rect x="62" y="${y}" width="10" height="8" fill-opacity="0.3"/>
          `).join('')}
        </svg>
      `;
    case 'tower':
      return `
        <svg viewBox="0 0 80 140" class="silhouette-svg" fill="currentColor">
          <polygon points="40,5 38,20 42,20" stroke="currentColor" stroke-width="1.5"/>
          <rect x="25" y="20" width="30" height="110" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          ${[28, 42, 56, 70, 84, 98, 112].map(y => `
            <line x1="25" y1="${y}" x2="55" y2="${y}" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/>
          `).join('')}
        </svg>
      `;
    case 'city':
    default:
      return `
        <svg viewBox="0 0 140 100" class="silhouette-svg" fill="currentColor">
          <rect x="10" y="40" width="25" height="50" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
          <rect x="40" y="20" width="30" height="70" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>
          <rect x="75" y="35" width="22" height="55" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
          <rect x="102" y="10" width="28" height="80" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
  }
}

export function renderGraphicScaleBar(scaleRatio, realMeters = 5) {
  let divisionMeters = 1;
  if (scaleRatio <= 10) divisionMeters = 0.1;
  else if (scaleRatio <= 25) divisionMeters = 0.5;
  else if (scaleRatio <= 100) divisionMeters = 1;
  else if (scaleRatio <= 500) divisionMeters = 5;
  else if (scaleRatio <= 2500) divisionMeters = 25;
  else divisionMeters = 100;

  const totalLengthM = divisionMeters * 4;
  const segments = [
    { start: 0, end: divisionMeters, filled: true },
    { start: divisionMeters, end: divisionMeters * 2, filled: false },
    { start: divisionMeters * 2, end: divisionMeters * 3, filled: true },
    { start: divisionMeters * 3, end: divisionMeters * 4, filled: false }
  ];

  return `
    <div class="scale-bar-wrapper">
      <div class="scale-bar-labels" style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
        <span>0</span>
        <span>${formatNumber(divisionMeters, 1)}m</span>
        <span>${formatNumber(divisionMeters * 2, 1)}m</span>
        <span>${formatNumber(divisionMeters * 3, 1)}m</span>
        <span>${formatNumber(totalLengthM, 1)}m</span>
      </div>
      <div class="scale-bar-track" style="display: flex; height: 10px; border: 1px solid var(--border-medium); border-radius: 2px; overflow: hidden; background: var(--bg-surface-elevated);">
        ${segments.map(s => `
          <div style="flex: 1; background: ${s.filled ? 'var(--accent-primary)' : 'transparent'}; border-right: 1px solid var(--border-subtle);"></div>
        `).join('')}
      </div>
      <div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted); text-align: center; margin-top: 0.35rem;">
        Graphic Architectural Scale Bar @ 1:${scaleRatio}
      </div>
    </div>
  `;
}

export function updateVisualization(params = {}) {
  const {
    containerId = 'visualizer-container',
    containerElement = document.getElementById(containerId),
    realMeters = 5,
    scaleRatio = 50,
    drawingMeters = 0.1
  } = params;

  if (!containerElement) return;

  const safeRealMeters = typeof realMeters === 'number' && !isNaN(realMeters) && isFinite(realMeters) && realMeters > 0
    ? realMeters
    : 5;

  const ref = REAL_WORLD_REFERENCES.find(r => safeRealMeters >= r.minMeters && safeRealMeters < r.maxMeters) 
    || REAL_WORLD_REFERENCES[REAL_WORLD_REFERENCES.length - 1];

  const refRatio = safeRealMeters / ref.defaultLength;
  let comparisonText = '';
  if (refRatio < 0.9) {
    comparisonText = `About ${(refRatio * 100).toFixed(0)}% the size of a ${ref.name}`;
  } else if (refRatio >= 0.9 && refRatio <= 1.1) {
    comparisonText = `Roughly equal to the size of a ${ref.name}`;
  } else {
    comparisonText = `About ${refRatio.toFixed(1)}× the size of a ${ref.name}`;
  }

  const refSvg = getReferenceSilhouette(ref.icon);
  const scaleBarHtml = renderGraphicScaleBar(scaleRatio, safeRealMeters);

  containerElement.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary);"></span>
          <span style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary);">Scale Proportions (1:${scaleRatio})</span>
        </div>
        <span style="font-size: 0.74rem; font-family: var(--font-mono); padding: 0.15rem 0.45rem; border-radius: 4px; background: var(--bg-chip); color: var(--accent-primary);">${ref.name}</span>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: 8px; border: 1px solid var(--border-subtle);">
        <div style="flex: 1;">
          <div style="font-size: 0.88rem; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); margin-bottom: 0.25rem;">
            ${formatNumber(safeRealMeters, 3)} m Site Dimension
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${comparisonText}</div>
        </div>

        <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; color: var(--accent-primary); flex-shrink: 0;">
          ${refSvg}
        </div>
      </div>

      <div style="padding-top: 0.25rem;">
        ${scaleBarHtml}
      </div>
    </div>
  `;
}

/**
 * Generates accurate 2D architectural blueprint top-down drawings
 * for every individual item in the architectural library.
 */
export function getFurniturePlanSVG(item) {
  if (!item) return '';
  const id = item.id || '';
  const type = item.type || 'table';

  // 1. Precise Individual Item ID Handlers
  if (id === 'sofa-2p') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 130 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="118" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
        <rect x="22" y="9" width="86" height="15" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="8" y="9" width="15" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="107" y="9" width="15" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <line x1="65" y1="24" x2="65" y2="70" stroke="currentColor" stroke-width="1.6"/>
        <path d="M23,24 L107,24" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
      </svg>
    `;
  }

  if (id === 'sofa-4p') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 180 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="168" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
        <rect x="24" y="9" width="132" height="15" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="8" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="156" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <line x1="57" y1="24" x2="57" y2="70" stroke="currentColor" stroke-width="1.5"/>
        <line x1="90" y1="24" x2="90" y2="70" stroke="currentColor" stroke-width="1.5"/>
        <line x1="123" y1="24" x2="123" y2="70" stroke="currentColor" stroke-width="1.5"/>
        <path d="M24,24 L156,24" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
      </svg>
    `;
  }

  if (id === 'sofa-u') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 170 120" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6,6 L164,6 L164,114 L114,114 L114,56 L56,56 L56,114 L6,114 Z" fill="currentColor" fill-opacity="0.15"/>
        <rect x="18" y="8" width="134" height="14" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="8" y="8" width="14" height="102" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="148" y="8" width="14" height="102" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <!-- Central Table Space -->
        <rect x="68" y="70" width="34" height="34" rx="4" stroke-dasharray="3 3" stroke-opacity="0.7"/>
      </svg>
    `;
  }

  if (id === 'sofa-chesterfield') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 160 85" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="148" height="72" rx="14" fill="currentColor" fill-opacity="0.15"/>
        <rect x="22" y="8" width="116" height="22" rx="6" fill="currentColor" fill-opacity="0.3"/>
        <circle cx="15" cy="42" r="9" fill="currentColor" fill-opacity="0.3"/>
        <circle cx="145" cy="42" r="9" fill="currentColor" fill-opacity="0.3"/>
        <!-- Tufted Button Grid -->
        ${[18, 42, 66, 90, 114, 138].map(x => `<circle cx="${x}" cy="18" r="2.5" fill="currentColor"/>`).join('')}
        ${[30, 54, 78, 102, 126].map(x => `<circle cx="${x}" cy="26" r="2.5" fill="currentColor"/>`).join('')}
        <line x1="80" y1="30" x2="80" y2="74" stroke-width="1.5"/>
      </svg>
    `;
  }

  if (id === 'chaise-lounge') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 150 75" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="8" width="138" height="58" rx="10" fill="currentColor" fill-opacity="0.15"/>
        <!-- Single Arm & Reclined Headrest -->
        <rect x="8" y="8" width="18" height="58" rx="6" fill="currentColor" fill-opacity="0.3"/>
        <rect x="26" y="10" width="34" height="54" rx="4" fill="currentColor" fill-opacity="0.2"/>
        <line x1="60" y1="8" x2="60" y2="66" stroke-dasharray="3 3"/>
      </svg>
    `;
  }

  if (id === 'wingback-chair') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="10" y="10" width="70" height="70" rx="8" fill="currentColor" fill-opacity="0.15"/>
        <!-- Wing Ears -->
        <path d="M10,24 C10,12 24,12 24,12 L66,12 C66,12 80,12 80,24" stroke-width="3.5" fill="currentColor" fill-opacity="0.25"/>
        <rect x="12" y="22" width="12" height="52" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <rect x="66" y="22" width="12" height="52" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <rect x="24" y="32" width="42" height="42" rx="4" fill="currentColor" fill-opacity="0.1"/>
      </svg>
    `;
  }

  if (id === 'recliner') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 95 95" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="10" y="10" width="75" height="75" rx="12" fill="currentColor" fill-opacity="0.15"/>
        <rect x="20" y="12" width="55" height="18" rx="6" fill="currentColor" fill-opacity="0.35"/>
        <rect x="12" y="16" width="12" height="64" rx="5" fill="currentColor" fill-opacity="0.3"/>
        <rect x="71" y="16" width="12" height="64" rx="5" fill="currentColor" fill-opacity="0.3"/>
        <!-- Footrest Line -->
        <line x1="24" y1="74" x2="71" y2="74" stroke-width="2" stroke-dasharray="3 3"/>
      </svg>
    `;
  }

  if (id === 'bed-super-king') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 150 130" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="134" height="114" rx="6" fill="currentColor" fill-opacity="0.12"/>
        <rect x="8" y="8" width="134" height="16" rx="2" fill="currentColor" fill-opacity="0.35"/>
        <!-- 3 King Pillows -->
        <rect x="14" y="28" width="36" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="57" y="28" width="36" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="100" y="28" width="36" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <!-- Luxury Quilt Line -->
        <path d="M8,72 Q75,84 142,72" stroke-width="2" stroke-dasharray="3 3"/>
        <line x1="8" y1="96" x2="142" y2="96" stroke-width="1.2" stroke-opacity="0.4"/>
      </svg>
    `;
  }

  if (id === 'bed-bunk') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 95 125" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="10" y="8" width="75" height="108" rx="4" fill="currentColor" fill-opacity="0.12"/>
        <rect x="10" y="8" width="75" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
        <rect x="18" y="26" width="59" height="24" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <!-- Bunk Bed Frame Posts & Foot Ladder -->
        <circle cx="14" cy="12" r="3" fill="currentColor"/>
        <circle cx="81" cy="12" r="3" fill="currentColor"/>
        <circle cx="14" cy="112" r="3" fill="currentColor"/>
        <circle cx="81" cy="112" r="3" fill="currentColor"/>
        <!-- Ladder Rungs at Foot -->
        <line x1="28" y1="102" x2="67" y2="102" stroke-width="2.5"/>
        <line x1="28" y1="108" x2="67" y2="108" stroke-width="2.5"/>
      </svg>
    `;
  }

  if (id === 'crib-baby') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 85 115" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="69" height="98" rx="6" fill="currentColor" fill-opacity="0.1"/>
        <!-- Safety Slats -->
        ${[18, 28, 38, 48, 58, 68].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="106" stroke-width="1" stroke-opacity="0.3"/>`).join('')}
        <rect x="16" y="16" width="53" height="82" rx="4" stroke="currentColor" stroke-width="1.8" fill="currentColor" fill-opacity="0.15"/>
        <!-- Baby Pillow -->
        <rect x="24" y="24" width="37" height="18" rx="4" fill="currentColor" fill-opacity="0.3"/>
      </svg>
    `;
  }

  if (id === 'fireplace-hearth') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 75" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="124" height="58" rx="2" fill="currentColor" fill-opacity="0.18"/>
        <!-- Firebox Opening -->
        <rect x="36" y="8" width="68" height="34" fill="var(--bg-app)" stroke="currentColor" stroke-width="2.2"/>
        <!-- Fire grate & flames -->
        <line x1="44" y1="30" x2="96" y2="30" stroke-width="2"/>
        <path d="M70,18 Q76,26 70,30 Q64,26 70,18 Z" fill="currentColor" fill-opacity="0.5"/>
        <line x1="8" y1="44" x2="132" y2="44" stroke-dasharray="3 3"/>
      </svg>
    `;
  }

  if (id === 'grand-piano') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 130 130" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Baby Grand Curved Rim -->
        <path d="M15,10 L115,10 C115,48 95,85 88,118 L15,118 Z" fill="currentColor" fill-opacity="0.2"/>
        <!-- Keyboard Front -->
        <rect x="15" y="10" width="18" height="108" fill="currentColor" fill-opacity="0.35"/>
        ${[18, 30, 42, 54, 66, 78, 90, 102].map(y => `
          <rect x="22" y="${y}" width="10" height="7" fill="currentColor"/>
        `).join('')}
        <!-- Piano Stool -->
        <rect x="4" y="45" width="8" height="38" rx="2" stroke="currentColor" fill="currentColor" fill-opacity="0.4"/>
      </svg>
    `;
  }

  if (id === 'sink-double') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="10" width="124" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
        <!-- Two Basins -->
        <rect x="16" y="18" width="48" height="44" rx="6" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="40" cy="40" r="3.5" fill="currentColor"/>
        <rect x="76" y="18" width="48" height="44" rx="6" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="100" cy="40" r="3.5" fill="currentColor"/>
        <!-- Center Mixer Tap -->
        <circle cx="70" cy="18" r="4" fill="currentColor"/>
        <line x1="70" y1="18" x2="70" y2="28" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (id === 'vanity-double-120' || id === 'vanity-double-160') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="10" width="144" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
        <!-- Left Basin -->
        <ellipse cx="45" cy="40" rx="24" ry="18" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="45" cy="40" r="3.5" fill="currentColor"/>
        <circle cx="45" cy="22" r="3" fill="currentColor"/>
        <!-- Right Basin -->
        <ellipse cx="115" cy="40" rx="24" ry="18" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="115" cy="40" r="3.5" fill="currentColor"/>
        <circle cx="115" cy="22" r="3" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'toilet-ada') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 100 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Wall Frame & Cistern -->
        <rect x="22" y="8" width="56" height="22" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <ellipse cx="50" cy="64" rx="24" ry="30" fill="currentColor" fill-opacity="0.14"/>
        <ellipse cx="50" cy="66" rx="15" ry="20" stroke-dasharray="3 3" stroke-opacity="0.6"/>
        <!-- Left & Right ADA Grab Bars -->
        <line x1="8" y1="30" x2="8" y2="95" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
        <line x1="92" y1="30" x2="92" y2="95" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
      </svg>
    `;
  }

  if (id === 'urinal-wall') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Wall Line -->
        <line x1="10" y1="12" x2="80" y2="12" stroke-width="3"/>
        <!-- Privacy Partition Fin -->
        <line x1="18" y1="8" x2="18" y2="75" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="72" y1="8" x2="72" y2="75" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Ceramic Urinal Bowl -->
        <path d="M30,12 L60,12 L56,65 C56,72 34,72 34,65 Z" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="45" cy="50" r="3" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'bathtub-corner-jacuzzi') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Corner Triangle / Quarter Round Tub -->
        <path d="M10,10 L100,10 A90,90 0 0,1 10,100 Z" fill="currentColor" fill-opacity="0.18"/>
        <!-- Inner Tub Contour -->
        <path d="M22,22 L86,22 A64,64 0 0,1 22,86 Z" stroke-dasharray="3 3" stroke-opacity="0.7"/>
        <circle cx="35" cy="35" r="4.5" fill="currentColor"/>
        <!-- Whirlpool Jet Nozzles -->
        ${[30, 48, 66].map(a => `<circle cx="${24 + a * 0.7}" cy="${86 - a * 0.7}" r="2" fill="currentColor"/>`).join('')}
      </svg>
    `;
  }

  if (id === 'shower-corner-neo') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Neo-Angle Corner (5-Sided Diamond) -->
        <path d="M10,10 L90,10 L90,45 L45,90 L10,90 Z" fill="currentColor" fill-opacity="0.14"/>
        <line x1="45" y1="90" x2="90" y2="45" stroke-width="3" stroke="var(--accent-primary)"/>
        <!-- Drain & Slopes -->
        <line x1="10" y1="10" x2="50" y2="50" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <line x1="90" y1="10" x2="50" y2="50" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <line x1="10" y1="90" x2="50" y2="50" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <circle cx="50" cy="50" r="5" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'shower-ada-rollin') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Zero Threshold Floor -->
        <rect x="8" y="8" width="94" height="94" stroke-dasharray="4 4" fill="currentColor" fill-opacity="0.1"/>
        <!-- Fold-Down Seat -->
        <rect x="12" y="12" width="30" height="30" rx="3" fill="currentColor" fill-opacity="0.35"/>
        <line x1="12" y1="12" x2="42" y2="42" stroke-width="1.5"/>
        <!-- Wall Grab Bars -->
        <line x1="10" y1="46" x2="10" y2="96" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
        <line x1="46" y1="10" x2="96" y2="10" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
        <!-- Linear Drain -->
        <rect x="14" y="90" width="82" height="6" rx="2" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'stair-straight') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 70" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="8" width="128" height="54" fill="currentColor" fill-opacity="0.08"/>
        <!-- 10 Parallel Treads -->
        ${[18, 30, 42, 54, 66, 78, 90, 102, 114].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="62" stroke-width="1.6"/>`).join('')}
        <!-- Walking Line with UP arrow -->
        <line x1="12" y1="35" x2="122" y2="35" stroke-width="2"/>
        <circle cx="12" cy="35" r="3.5" fill="currentColor"/>
        <polyline points="114 29 122 35 114 41" stroke-width="2"/>
        <text x="96" y="28" font-size="9" font-family="sans-serif" font-weight="800" fill="currentColor">UP</text>
      </svg>
    `;
  }

  if (id === 'stair-l-shaped') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- L-Shape Stairs -->
        <path d="M8,8 L102,8 L102,48 L48,48 L48,102 L8,102 Z" fill="currentColor" fill-opacity="0.08"/>
        <!-- Landing Square -->
        <rect x="8" y="8" width="40" height="40" fill="currentColor" fill-opacity="0.18"/>
        ${[58, 68, 78, 88, 98].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="48" stroke-width="1.5"/>`).join('')}
        ${[58, 68, 78, 88, 98].map(y => `<line x1="8" y1="${y}" x2="48" y2="${y}" stroke-width="1.5"/>`).join('')}
        <path d="M28,95 L28,28 L95,28" stroke-width="2" stroke-linejoin="round"/>
        <polyline points="88 22 95 28 88 34" stroke-width="2"/>
      </svg>
    `;
  }

  if (id === 'stair-spiral') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="50" cy="50" r="42" fill="currentColor" fill-opacity="0.08"/>
        <circle cx="50" cy="50" r="7" fill="currentColor"/>
        <!-- Radial Steps -->
        ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          return `<line x1="50" y1="50" x2="${(50 + 42 * Math.cos(rad)).toFixed(1)}" y2="${(50 + 42 * Math.sin(rad)).toFixed(1)}" stroke-width="1.4"/>`;
        }).join('')}
        <path d="M72,50 A22,22 0 1,1 50,28" stroke-width="2.2" stroke-linecap="round"/>
        <polyline points="54 24 50 28 54 32" stroke-width="2"/>
      </svg>
    `;
  }

  if (id === 'car-ada-bay') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 150 90" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Parking Stall -->
        <rect x="8" y="8" width="94" height="74" fill="currentColor" fill-opacity="0.1"/>
        <!-- Hatched Transfer Aisle -->
        <rect x="102" y="8" width="40" height="74" fill="currentColor" fill-opacity="0.05"/>
        ${[18, 30, 42, 54, 66].map(y => `<line x1="102" y1="${y}" x2="142" y2="${y + 12}" stroke-width="1.2" stroke-dasharray="2 2"/>`).join('')}
        <!-- International Symbol of Access (Wheelchair) -->
        <circle cx="55" cy="35" r="5" fill="var(--accent-primary)"/>
        <path d="M55,42 L55,56 L65,56" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="55" cy="56" r="10" stroke="var(--accent-primary)" stroke-width="2.5" fill="none"/>
      </svg>
    `;
  }

  if (id === 'gym-treadmill') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 130 75" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="114" height="58" rx="6" fill="currentColor" fill-opacity="0.14"/>
        <!-- Front Display Console & Handrails -->
        <rect x="12" y="14" width="22" height="46" rx="4" fill="currentColor" fill-opacity="0.4"/>
        <line x1="24" y1="12" x2="70" y2="12" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="24" y1="62" x2="70" y2="62" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Running Belt Surface -->
        <rect x="36" y="18" width="80" height="38" rx="3" fill="currentColor" fill-opacity="0.25"/>
      </svg>
    `;
  }

  if (id === 'gym-bench-press') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Padded Workout Bench -->
        <rect x="25" y="32" width="70" height="26" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <!-- Upright Support Posts -->
        <rect x="25" y="12" width="8" height="8" fill="currentColor"/>
        <rect x="25" y="70" width="8" height="8" fill="currentColor"/>
        <!-- Barbell with Weight Plates -->
        <line x1="29" y1="4" x2="29" y2="86" stroke-width="3.5"/>
        <rect x="24" y="6" width="10" height="8" rx="1" fill="currentColor"/>
        <rect x="24" y="76" width="10" height="8" rx="1" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'hospital-bed') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 85" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="10" width="124" height="65" rx="5" fill="currentColor" fill-opacity="0.12"/>
        <!-- Head Section & Pillow -->
        <line x1="42" y1="10" x2="42" y2="75" stroke-width="2"/>
        <rect x="14" y="24" width="22" height="37" rx="3" fill="currentColor" fill-opacity="0.3"/>
        <!-- Side Safety Rails -->
        <rect x="42" y="8" width="50" height="5" rx="2" fill="currentColor" fill-opacity="0.5"/>
        <rect x="42" y="72" width="50" height="5" rx="2" fill="currentColor" fill-opacity="0.5"/>
        <!-- Medical Cross -->
        <path d="M78,36 H84 V30 H90 V36 H96 V42 H90 V48 H84 V42 H78 Z" fill="currentColor" fill-opacity="0.3"/>
      </svg>
    `;
  }

  // 2. Specialized Type Fallbacks
  switch (type) {
    case 'sofa':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="148" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
          <rect x="24" y="9" width="112" height="16" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="9" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="135" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <line x1="62" y1="26" x2="62" y2="70" stroke="currentColor" stroke-width="1.6"/>
          <line x1="98" y1="26" x2="98" y2="70" stroke="currentColor" stroke-width="1.6"/>
          <path d="M26,26 L134,26" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
        </svg>
      `;

    case 'sectional':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6,6 L154,6 L154,62 L94,62 L94,104 L6,104 Z" fill="currentColor" fill-opacity="0.15"/>
          <rect x="22" y="9" width="128" height="14" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <rect x="9" y="9" width="14" height="92" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <rect x="138" y="9" width="13" height="50" rx="3" fill="currentColor" fill-opacity="0.22"/>
          <line x1="60" y1="24" x2="60" y2="62" stroke="currentColor" stroke-width="1.5"/>
          <line x1="100" y1="24" x2="100" y2="62" stroke="currentColor" stroke-width="1.5"/>
          <line x1="24" y1="62" x2="94" y2="62" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;

    case 'chair':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="70" height="70" rx="10" fill="currentColor" fill-opacity="0.15"/>
          <rect x="20" y="14" width="50" height="16" rx="4" fill="currentColor" fill-opacity="0.3"/>
          <rect x="13" y="14" width="10" height="60" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="67" y="14" width="10" height="60" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="24" y="32" width="42" height="42" rx="4" fill="currentColor" fill-opacity="0.1"/>
        </svg>
      `;

    case 'chair_small':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 75 75" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="12" y="12" width="51" height="51" rx="6" fill="currentColor" fill-opacity="0.15"/>
          <path d="M12,24 L63,24" stroke-width="2.5"/>
          <rect x="16" y="14" width="43" height="8" rx="2" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'chair_round':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="45" cy="45" r="34" fill="currentColor" fill-opacity="0.18"/>
          <line x1="45" y1="15" x2="45" y2="75" stroke-dasharray="3 3" stroke-opacity="0.5"/>
          <line x1="15" y1="45" x2="75" y2="45" stroke-dasharray="3 3" stroke-opacity="0.5"/>
          <circle cx="45" cy="45" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'bed':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="8" width="120" height="104" rx="6" fill="currentColor" fill-opacity="0.12"/>
          <rect x="10" y="8" width="120" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
          <rect x="18" y="28" width="46" height="26" rx="5" fill="currentColor" fill-opacity="0.25"/>
          <rect x="76" y="28" width="46" height="26" rx="5" fill="currentColor" fill-opacity="0.25"/>
          <path d="M10,68 Q70,78 130,68" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'bed_single':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 120" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="8" width="70" height="104" rx="6" fill="currentColor" fill-opacity="0.12"/>
          <rect x="10" y="8" width="70" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
          <rect x="18" y="28" width="54" height="24" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <path d="M10,66 Q45,74 80,66" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'table':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="124" height="60" rx="6" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="18" cy="20" r="4" fill="currentColor"/>
          <circle cx="122" cy="20" r="4" fill="currentColor"/>
          <circle cx="18" cy="60" r="4" fill="currentColor"/>
          <circle cx="122" cy="60" r="4" fill="currentColor"/>
          <rect x="36" y="4" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="76" y="4" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="36" y="71" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="76" y="71" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'table_round':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="50" cy="50" r="38" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="50" cy="50" r="8" stroke-dasharray="2 2" stroke-opacity="0.6"/>
          <circle cx="50" cy="6" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="50" cy="94" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="6" cy="50" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="94" cy="50" r="4" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'counter':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="124" height="60" rx="3" fill="currentColor" fill-opacity="0.15"/>
          <line x1="8" y1="52" x2="132" y2="52" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="40" cy="66" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="70" cy="66" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="100" cy="66" r="4" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'storage':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 70" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="124" height="50" rx="3" fill="currentColor" fill-opacity="0.15"/>
          <line x1="49" y1="10" x2="49" y2="60"/>
          <line x1="90" y1="10" x2="90" y2="60"/>
          <line x1="45" y1="35" x2="45" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="53" y1="35" x2="53" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="86" y1="35" x2="86" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="94" y1="35" x2="94" y2="42" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `;

    case 'toilet':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 80 100" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="14" y="8" width="52" height="22" rx="4" fill="currentColor" fill-opacity="0.3"/>
          <ellipse cx="40" cy="62" rx="24" ry="30" fill="currentColor" fill-opacity="0.12"/>
          <ellipse cx="40" cy="64" rx="15" ry="20" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="40" cy="19" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'sink':
    case 'vanity':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="104" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
          <ellipse cx="60" cy="40" rx="34" ry="22" fill="currentColor" fill-opacity="0.22"/>
          <circle cx="60" cy="22" r="3" fill="currentColor"/>
          <circle cx="60" cy="42" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'bath':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 150 75" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="8" width="138" height="59" rx="14" fill="currentColor" fill-opacity="0.15"/>
          <ellipse cx="75" cy="37.5" rx="58" ry="22" stroke-dasharray="3 3" stroke-opacity="0.7"/>
          <circle cx="25" cy="37.5" r="4.5" fill="currentColor"/>
        </svg>
      `;

    case 'shower':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="2" fill="currentColor" fill-opacity="0.1"/>
          <line x1="8" y1="8" x2="82" y2="82" stroke-dasharray="3 3" stroke-opacity="0.4"/>
          <line x1="8" y1="82" x2="82" y2="8" stroke-dasharray="3 3" stroke-opacity="0.4"/>
          <circle cx="45" cy="45" r="7" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'cooktop':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="4" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="28" cy="28" r="12" stroke-width="2"/>
          <circle cx="62" cy="28" r="9" stroke-width="2"/>
          <circle cx="28" cy="62" r="9" stroke-width="2"/>
          <circle cx="62" cy="62" r="14" stroke-width="2"/>
        </svg>
      `;

    case 'fridge':
    case 'appliance':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="4" fill="currentColor" fill-opacity="0.16"/>
          <line x1="8" y1="20" x2="82" y2="20" stroke-width="2"/>
          <circle cx="45" cy="52" r="18" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="45" cy="52" r="7" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'door':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="12" height="10" fill="currentColor"/>
          <rect x="80" y="8" width="12" height="10" fill="currentColor"/>
          <line x1="20" y1="13" x2="20" y2="82" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M20,82 A68,68 0 0,0 88,13" stroke-width="2" stroke-dasharray="4 4" stroke-opacity="0.8"/>
        </svg>
      `;

    case 'door_double':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="8" width="10" height="10" fill="currentColor"/>
          <rect x="124" y="8" width="10" height="10" fill="currentColor"/>
          <line x1="16" y1="13" x2="16" y2="60" stroke-width="3" stroke-linecap="round"/>
          <line x1="124" y1="13" x2="124" y2="60" stroke-width="3" stroke-linecap="round"/>
          <path d="M16,60 A47,47 0 0,0 63,13" stroke-width="1.8" stroke-dasharray="3 3"/>
          <path d="M124,60 A47,47 0 0,1 77,13" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'door_sliding':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 50" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="14" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
          <rect x="65" y="26" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
          <line x1="8" y1="18" x2="132" y2="18" stroke-dasharray="2 2" stroke-opacity="0.5"/>
          <line x1="8" y1="30" x2="132" y2="30" stroke-dasharray="2 2" stroke-opacity="0.5"/>
        </svg>
      `;

    case 'window':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 40" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="12" width="124" height="16" rx="2" fill="currentColor" fill-opacity="0.12"/>
          <line x1="8" y1="20" x2="132" y2="20" stroke-width="2.5" stroke="var(--accent-primary)"/>
          <rect x="6" y="8" width="8" height="24" fill="currentColor"/>
          <rect x="126" y="8" width="8" height="24" fill="currentColor"/>
        </svg>
      `;

    case 'stair':
    case 'stairs':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="104" height="64" fill="currentColor" fill-opacity="0.08"/>
          ${[20, 34, 48, 62, 76, 90].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="72" stroke-width="1.5"/>`).join('')}
          <line x1="15" y1="40" x2="95" y2="40" stroke-width="2"/>
          <circle cx="15" cy="40" r="3" fill="currentColor"/>
          <polyline points="88 34 95 40 88 46" stroke-width="2"/>
          <text x="76" y="32" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">UP</text>
        </svg>
      `;

    case 'clearance':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="80" height="80" stroke-dasharray="4 4" fill="currentColor" fill-opacity="0.08"/>
          <line x1="10" y1="50" x2="90" y2="50" stroke-width="2"/>
          <polyline points="20 44 10 50 20 56" stroke-width="2"/>
          <polyline points="80 44 90 50 80 56" stroke-width="2"/>
        </svg>
      `;

    case 'vehicle':
    case 'parking':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="10" y1="8" x2="130" y2="8" stroke-dasharray="4 4" stroke-opacity="0.5"/>
          <line x1="10" y1="72" x2="130" y2="72" stroke-dasharray="4 4" stroke-opacity="0.5"/>
          <path d="M22,58 C16,55 16,25 22,22 L40,18 L100,18 L122,24 C128,26 128,54 122,56 L100,62 L40,62 Z" fill="currentColor" fill-opacity="0.18"/>
          <path d="M48,22 L56,26 L56,54 L48,58 Z" fill="currentColor" fill-opacity="0.3"/>
          <path d="M96,24 L90,26 L90,54 L96,56 Z" fill="currentColor" fill-opacity="0.3"/>
          <rect x="54" y="14" width="6" height="4" rx="1" fill="currentColor"/>
          <rect x="54" y="62" width="6" height="4" rx="1" fill="currentColor"/>
        </svg>
      `;

    default:
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 70" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="100" height="50" rx="4" fill="currentColor" fill-opacity="0.15"/>
          <line x1="10" y1="10" x2="110" y2="60" stroke-dasharray="3 3" stroke-opacity="0.3"/>
        </svg>
      `;
  }
}
