/**
 * Architecture Helping Hand - Proportional Visualizer & Graphic Scale Bar Renderer
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
          <rect x="52" y="62" width="16" height="28" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
          <rect x="33" y="55" width="12" height="12" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
          <rect x="75" y="55" width="12" height="12" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
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
 * Generates high-precision 2D architectural blueprint top-down SVG drawings
 * for every architectural furniture piece, fixture, and clearance.
 */
export function getFurniturePlanSVG(item) {
  if (!item) return '';
  const type = item.type || 'table';

  switch (type) {
    case 'sofa':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Main Sofa Body Frame -->
          <rect x="6" y="6" width="148" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
          <!-- Back Cushion Band -->
          <rect x="24" y="9" width="112" height="16" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <!-- Left and Right Armrests -->
          <rect x="9" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="135" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <!-- Seat Cushion Seam Dividers -->
          <line x1="62" y1="26" x2="62" y2="70" stroke="currentColor" stroke-width="1.6"/>
          <line x1="98" y1="26" x2="98" y2="70" stroke="currentColor" stroke-width="1.6"/>
          <!-- Front Seam Stitch Line -->
          <path d="M26,26 L134,26" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
        </svg>
      `;

    case 'sectional':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="2">
          <!-- L-Shape Sofa Outline -->
          <path d="M6,6 L154,6 L154,62 L94,62 L94,104 L6,104 Z" fill="currentColor" fill-opacity="0.15"/>
          <!-- Backrests -->
          <rect x="22" y="9" width="128" height="14" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <rect x="9" y="9" width="14" height="92" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <!-- End Armrests -->
          <rect x="138" y="9" width="13" height="50" rx="3" fill="currentColor" fill-opacity="0.22"/>
          <rect x="78" y="90" width="13" height="12" rx="2" fill="currentColor" fill-opacity="0.22"/>
          <!-- Cushion Division Lines -->
          <line x1="60" y1="24" x2="60" y2="62" stroke="currentColor" stroke-width="1.5"/>
          <line x1="100" y1="24" x2="100" y2="62" stroke="currentColor" stroke-width="1.5"/>
          <line x1="24" y1="62" x2="94" y2="62" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;

    case 'chair':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Armchair Outer Body -->
          <rect x="10" y="10" width="70" height="70" rx="10" fill="currentColor" fill-opacity="0.15"/>
          <!-- Backrest Curved Cushion -->
          <rect x="20" y="14" width="50" height="16" rx="4" fill="currentColor" fill-opacity="0.3"/>
          <!-- Armrests -->
          <rect x="13" y="14" width="10" height="60" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="67" y="14" width="10" height="60" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <!-- Seat Cushion Center -->
          <rect x="24" y="32" width="42" height="42" rx="4" fill="currentColor" fill-opacity="0.1"/>
        </svg>
      `;

    case 'chair_round':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="45" cy="45" r="34" fill="currentColor" fill-opacity="0.18"/>
          <!-- Tufted Seam Cross -->
          <line x1="45" y1="15" x2="45" y2="75" stroke-dasharray="3 3" stroke-opacity="0.5"/>
          <line x1="15" y1="45" x2="75" y2="45" stroke-dasharray="3 3" stroke-opacity="0.5"/>
          <circle cx="45" cy="45" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'bed':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Mattress & Frame -->
          <rect x="10" y="8" width="120" height="104" rx="6" fill="currentColor" fill-opacity="0.12"/>
          <!-- Headboard -->
          <rect x="10" y="8" width="120" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
          <!-- Dual Pillows -->
          <rect x="18" y="28" width="46" height="26" rx="5" fill="currentColor" fill-opacity="0.25"/>
          <rect x="76" y="28" width="46" height="26" rx="5" fill="currentColor" fill-opacity="0.25"/>
          <!-- Folded Duvet Line -->
          <path d="M10,68 Q70,78 130,68" stroke-width="1.8" stroke-dasharray="3 3"/>
          <line x1="10" y1="88" x2="130" y2="88" stroke-width="1.2" stroke-opacity="0.4"/>
        </svg>
      `;

    case 'bed_single':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 120" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Single Bed Mattress -->
          <rect x="10" y="8" width="70" height="104" rx="6" fill="currentColor" fill-opacity="0.12"/>
          <!-- Headboard -->
          <rect x="10" y="8" width="70" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
          <!-- Single Pillow -->
          <rect x="18" y="28" width="54" height="24" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <!-- Folded Sheet -->
          <path d="M10,66 Q45,74 80,66" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'bed_small':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 80 110" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Crib / Toddler Frame -->
          <rect x="8" y="8" width="64" height="94" rx="4" fill="currentColor" fill-opacity="0.12"/>
          <!-- Slats Indicator -->
          <line x1="8" y1="20" x2="72" y2="20" stroke-width="1.2"/>
          <line x1="8" y1="90" x2="72" y2="90" stroke-width="1.2"/>
          <!-- Pillow -->
          <rect x="16" y="24" width="48" height="20" rx="3" fill="currentColor" fill-opacity="0.25"/>
        </svg>
      `;

    case 'table':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Table Top -->
          <rect x="8" y="10" width="124" height="60" rx="6" fill="currentColor" fill-opacity="0.18"/>
          <!-- Corner Legs -->
          <circle cx="18" cy="20" r="4" fill="currentColor"/>
          <circle cx="122" cy="20" r="4" fill="currentColor"/>
          <circle cx="18" cy="60" r="4" fill="currentColor"/>
          <circle cx="122" cy="60" r="4" fill="currentColor"/>
          <!-- Chair Indicator Dashes -->
          <rect x="36" y="4" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="76" y="4" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="36" y="71" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="76" y="71" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'table_round':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Circular Table -->
          <circle cx="50" cy="50" r="38" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="50" cy="50" r="8" stroke-dasharray="2 2" stroke-opacity="0.6"/>
          <!-- 4 Surrounding Chairs -->
          <circle cx="50" cy="6" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="50" cy="94" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="6" cy="50" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="94" cy="50" r="4" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'storage':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 70" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Wardrobe / Credenza Outer Box -->
          <rect x="8" y="10" width="124" height="50" rx="3" fill="currentColor" fill-opacity="0.15"/>
          <!-- Door / Drawer Division Panels -->
          <line x1="49" y1="10" x2="49" y2="60"/>
          <line x1="90" y1="10" x2="90" y2="60"/>
          <!-- Handles -->
          <line x1="45" y1="35" x2="45" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="53" y1="35" x2="53" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="86" y1="35" x2="86" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="94" y1="35" x2="94" y2="42" stroke-width="3" stroke-linecap="round"/>
          <!-- Internal Hanging Rail (Dashed) -->
          <line x1="12" y1="24" x2="128" y2="24" stroke-dasharray="2 2" stroke-opacity="0.4"/>
        </svg>
      `;

    case 'desk':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Desk Surface -->
          <rect x="10" y="10" width="120" height="60" rx="4" fill="currentColor" fill-opacity="0.15"/>
          <!-- Pedestal Drawers -->
          <rect x="95" y="12" width="33" height="56" fill="currentColor" fill-opacity="0.2"/>
          <line x1="95" y1="30" x2="128" y2="30" stroke-width="1.2"/>
          <line x1="95" y1="48" x2="128" y2="48" stroke-width="1.2"/>
          <!-- Laptop / Monitor Outline -->
          <rect x="42" y="16" width="36" height="20" rx="2" stroke-opacity="0.7"/>
          <rect x="48" y="40" width="24" height="12" rx="1" stroke-dasharray="2 2" stroke-opacity="0.5"/>
        </svg>
      `;

    case 'desk_l':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="2">
          <!-- L-Desk Surface -->
          <path d="M10,10 L130,10 L130,60 L70,60 L70,110 L10,110 Z" fill="currentColor" fill-opacity="0.15"/>
          <rect x="95" y="12" width="33" height="46" fill="currentColor" fill-opacity="0.2"/>
          <!-- Monitor Placement -->
          <rect x="35" y="18" width="36" height="20" rx="2" stroke-opacity="0.7"/>
        </svg>
      `;

    case 'structure':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 130 70" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Fireplace Hearth Frame -->
          <rect x="10" y="8" width="110" height="54" rx="2" fill="currentColor" fill-opacity="0.2"/>
          <!-- Inner Firebox Opening -->
          <rect x="32" y="8" width="66" height="34" fill="var(--bg-app)" stroke="currentColor" stroke-width="2"/>
          <!-- Flame Symbol / Hearth Fill -->
          <path d="M65,18 Q72,28 65,34 Q58,28 65,18 Z" fill="currentColor" fill-opacity="0.4"/>
          <line x1="10" y1="42" x2="120" y2="42" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'instrument':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Baby Grand Piano Rim Curve -->
          <path d="M15,10 L105,10 C105,45 85,75 80,105 L15,105 Z" fill="currentColor" fill-opacity="0.18"/>
          <!-- Keyboard Front -->
          <rect x="15" y="10" width="16" height="95" fill="currentColor" fill-opacity="0.35"/>
          ${[20, 32, 44, 56, 68, 80, 92].map(y => `
            <rect x="21" y="${y}" width="9" height="7" fill="currentColor"/>
          `).join('')}
        </svg>
      `;

    case 'sanitary':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 80 100" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Toilet Cistern Tank -->
          <rect x="14" y="8" width="52" height="22" rx="4" fill="currentColor" fill-opacity="0.3"/>
          <!-- Toilet Bowl Outline -->
          <ellipse cx="40" cy="62" rx="24" ry="30" fill="currentColor" fill-opacity="0.12"/>
          <!-- Inner Water Rim -->
          <ellipse cx="40" cy="64" rx="15" ry="20" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <!-- Flush Button -->
          <circle cx="40" cy="19" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'sink':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Countertop Vanity -->
          <rect x="8" y="10" width="104" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
          <!-- Oval Sink Basin -->
          <ellipse cx="60" cy="40" rx="34" ry="22" fill="currentColor" fill-opacity="0.22"/>
          <!-- Faucet Tap & Drain Hole -->
          <circle cx="60" cy="22" r="3" fill="currentColor"/>
          <circle cx="60" cy="42" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'bath':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 150 75" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Bathtub Outer Edge -->
          <rect x="6" y="8" width="138" height="59" rx="14" fill="currentColor" fill-opacity="0.15"/>
          <!-- Inner Ergonomic Contour -->
          <ellipse cx="75" cy="37.5" rx="58" ry="22" stroke-dasharray="3 3" stroke-opacity="0.7"/>
          <!-- Drain Hole & Overflow -->
          <circle cx="25" cy="37.5" r="4.5" fill="currentColor"/>
        </svg>
      `;

    case 'shower':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Shower Tray Perimeter -->
          <rect x="8" y="8" width="74" height="74" rx="2" fill="currentColor" fill-opacity="0.1"/>
          <!-- Drainage Fall Lines -->
          <line x1="8" y1="8" x2="82" y2="82" stroke-dasharray="3 3" stroke-opacity="0.4"/>
          <line x1="8" y1="82" x2="82" y2="8" stroke-dasharray="3 3" stroke-opacity="0.4"/>
          <!-- Center Drain Grate -->
          <circle cx="45" cy="45" r="7" fill="currentColor" fill-opacity="0.3"/>
          <circle cx="45" cy="45" r="3" fill="currentColor"/>
        </svg>
      `;

    case 'cooktop':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Cooktop Frame -->
          <rect x="8" y="8" width="74" height="74" rx="4" fill="currentColor" fill-opacity="0.18"/>
          <!-- 4 Burners of various standard wattages -->
          <circle cx="28" cy="28" r="12" stroke-width="2"/>
          <circle cx="28" cy="28" r="5" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="62" cy="28" r="9" stroke-width="2"/>
          <circle cx="62" cy="28" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="28" cy="62" r="9" stroke-width="2"/>
          <circle cx="28" cy="62" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="62" cy="62" r="14" stroke-width="2"/>
          <circle cx="62" cy="62" r="6" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'kitchen':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Kitchen Island / Counter Unit -->
          <rect x="8" y="10" width="124" height="60" rx="3" fill="currentColor" fill-opacity="0.15"/>
          <!-- Integrated Prep Sink -->
          <rect x="18" y="20" width="36" height="40" rx="4" fill="currentColor" fill-opacity="0.2"/>
          <circle cx="36" cy="40" r="3" fill="currentColor"/>
          <!-- Breakfast Bar Overhang (Dashed Line) -->
          <line x1="8" y1="52" x2="132" y2="52" stroke-dasharray="3 3" stroke-opacity="0.6"/>
        </svg>
      `;

    case 'appliance':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="4" fill="currentColor" fill-opacity="0.16"/>
          <!-- Appliance Front Handle / Door Swing -->
          <line x1="8" y1="20" x2="82" y2="20" stroke-width="2"/>
          <circle cx="45" cy="52" r="18" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="45" cy="52" r="7" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'door':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Wall / Door Jamb Blocks -->
          <rect x="8" y="8" width="12" height="10" fill="currentColor"/>
          <rect x="80" y="8" width="12" height="10" fill="currentColor"/>
          <!-- Door Leaf Open 90 Degrees -->
          <line x1="20" y1="13" x2="20" y2="82" stroke-width="3.5" stroke-linecap="round"/>
          <!-- 90 Degree Swing Arc -->
          <path d="M20,82 A68,68 0 0,0 88,13" stroke-width="2" stroke-dasharray="4 4" stroke-opacity="0.8"/>
        </svg>
      `;

    case 'door_double':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="8" width="10" height="10" fill="currentColor"/>
          <rect x="124" y="8" width="10" height="10" fill="currentColor"/>
          <!-- Left and Right Door Leaves -->
          <line x1="16" y1="13" x2="16" y2="60" stroke-width="3" stroke-linecap="round"/>
          <line x1="124" y1="13" x2="124" y2="60" stroke-width="3" stroke-linecap="round"/>
          <!-- Dual Swing Arcs -->
          <path d="M16,60 A47,47 0 0,0 63,13" stroke-width="1.8" stroke-dasharray="3 3"/>
          <path d="M124,60 A47,47 0 0,1 77,13" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'door_sliding':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 50" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Two Overlapping Sliding Panels -->
          <rect x="10" y="14" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
          <rect x="65" y="26" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
          <line x1="8" y1="18" x2="132" y2="18" stroke-dasharray="2 2" stroke-opacity="0.5"/>
          <line x1="8" y1="30" x2="132" y2="30" stroke-dasharray="2 2" stroke-opacity="0.5"/>
        </svg>
      `;

    case 'circulation':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Wheelchair 150cm Turning Circle / Clearance Area -->
          <rect x="10" y="10" width="80" height="80" stroke-dasharray="4 4" fill="currentColor" fill-opacity="0.08"/>
          <circle cx="50" cy="50" r="30" stroke-dasharray="2 2" stroke-opacity="0.6"/>
          <!-- Turning Arrow -->
          <path d="M68,50 A18,18 0 1,1 50,32" stroke-width="2" stroke-linecap="round"/>
          <polyline points="54 28 50 32 54 36" stroke-width="2"/>
        </svg>
      `;

    case 'stairs':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="104" height="74" fill="currentColor" fill-opacity="0.08"/>
          <!-- Parallel Treads -->
          ${[20, 32, 44, 56, 68].map(x => `
            <line x1="${x}" y1="8" x2="${x}" y2="82" stroke-width="1.5"/>
          `).join('')}
          <!-- UP Walking Line & Arrow -->
          <line x1="15" y1="45" x2="95" y2="45" stroke="currentColor" stroke-width="2"/>
          <circle cx="15" cy="45" r="3" fill="currentColor"/>
          <polyline points="88 39 95 45 88 51" stroke-width="2"/>
          <text x="75" y="38" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">UP</text>
        </svg>
      `;

    case 'elevator':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Shaft Wall -->
          <rect x="8" y="8" width="74" height="74" fill="currentColor" fill-opacity="0.12"/>
          <!-- Diagonal Structural Cross -->
          <line x1="8" y1="8" x2="82" y2="82" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <line x1="8" y1="82" x2="82" y2="8" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <!-- Elevator Cab -->
          <rect x="18" y="18" width="54" height="54" rx="2" stroke-width="1.8"/>
          <!-- Landing Doors -->
          <line x1="18" y1="8" x2="72" y2="8" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `;

    case 'ramp':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 130 60" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="114" height="40" fill="currentColor" fill-opacity="0.1"/>
          <!-- Handrails -->
          <line x1="8" y1="12" x2="122" y2="12" stroke-width="2"/>
          <line x1="8" y1="48" x2="122" y2="48" stroke-width="2"/>
          <!-- Slope Direction Arrow -->
          <line x1="20" y1="30" x2="105" y2="30" stroke-width="2"/>
          <polyline points="98 24 105 30 98 36" stroke-width="2"/>
          <text x="50" y="24" font-size="8" font-family="sans-serif" font-weight="700" fill="currentColor">1:12 SLOPE</text>
        </svg>
      `;

    case 'vehicle':
    case 'parking':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Parking Bay Stall Lines -->
          <line x1="10" y1="8" x2="130" y2="8" stroke-dasharray="4 4" stroke-opacity="0.5"/>
          <line x1="10" y1="72" x2="130" y2="72" stroke-dasharray="4 4" stroke-opacity="0.5"/>
          <!-- Top-down Car Blueprint Contour -->
          <path d="M22,58 C16,55 16,25 22,22 L40,18 L100,18 L122,24 C128,26 128,54 122,56 L100,62 L40,62 Z" fill="currentColor" fill-opacity="0.18"/>
          <!-- Windshield & Rear Window -->
          <path d="M48,22 L56,26 L56,54 L48,58 Z" fill="currentColor" fill-opacity="0.3"/>
          <path d="M96,24 L90,26 L90,54 L96,56 Z" fill="currentColor" fill-opacity="0.3"/>
          <!-- Side Mirrors -->
          <rect x="54" y="14" width="6" height="4" rx="1" fill="currentColor"/>
          <rect x="54" y="62" width="6" height="4" rx="1" fill="currentColor"/>
        </svg>
      `;

    case 'gym':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 110 80" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Treadmill / Bench Frame -->
          <rect x="15" y="15" width="80" height="50" rx="6" fill="currentColor" fill-opacity="0.15"/>
          <!-- Running Belt -->
          <rect x="28" y="20" width="54" height="40" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <line x1="20" y1="25" x2="20" y2="55" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `;

    case 'medical':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 130 75" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="110" height="55" rx="5" fill="currentColor" fill-opacity="0.14"/>
          <!-- Adjustable Head Section -->
          <line x1="38" y1="10" x2="38" y2="65" stroke-width="2"/>
          <rect x="16" y="20" width="16" height="35" rx="3" fill="currentColor" fill-opacity="0.3"/>
          <!-- Medical Cross Emblem -->
          <path d="M72,30 H78 V34 H82 V40 H78 V44 H72 V40 H68 V34 H72 Z" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'exterior':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <!-- Parasol Umbrella Ribs / Patio Plan -->
          <circle cx="50" cy="50" r="38" fill="currentColor" fill-opacity="0.14"/>
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const x2 = 50 + 38 * Math.cos(rad);
            const y2 = 50 + 38 * Math.sin(rad);
            return `<line x1="50" y1="50" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="1.4" stroke-opacity="0.6"/>`;
          }).join('')}
          <circle cx="50" cy="50" r="5" fill="currentColor"/>
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
