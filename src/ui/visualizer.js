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
