/**
 * ArchiScale - Visual Scale Bar & Architectural Reference Renderer
 */

import { REAL_WORLD_REFERENCES } from './presets.js';
import { formatNumber, formatFeetInches } from './converter.js';

/**
 * Render dynamic scale bar and comparison graphic
 */
export function updateVisualization({
  containerElement,
  drawingVal,
  drawingUnit,
  realVal,
  realUnit,
  realMeters,
  scaleRatio
}) {
  if (!containerElement) return;

  // Find appropriate real world reference context
  const ref = REAL_WORLD_REFERENCES.find(r => realMeters >= r.minMeters && realMeters < r.maxMeters) 
    || REAL_WORLD_REFERENCES[REAL_WORLD_REFERENCES.length - 1];

  // Calculate percentage comparison with reference object
  const refRatio = realMeters / ref.defaultLength;
  let comparisonText = '';
  if (refRatio < 0.9) {
    comparisonText = `About ${(refRatio * 100).toFixed(0)}% the size of a ${ref.name}`;
  } else if (refRatio >= 0.9 && refRatio <= 1.1) {
    comparisonText = `Roughly equal to the size of a ${ref.name}`;
  } else {
    comparisonText = `About ${refRatio.toFixed(1)}× the size of a ${ref.name}`;
  }

  // Generate reference SVG graphic
  const refSvg = getReferenceSilhouette(ref.icon);

  // Generate graphical scale bar ticks
  const scaleBarHtml = renderGraphicScaleBar(scaleRatio, realMeters);

  containerElement.innerHTML = `
    <div class="visual-panel-inner">
      <div class="visual-header">
        <div class="visual-badge">
          <span class="visual-dot"></span>
          <span class="visual-label">Scale Proportions (1:${scaleRatio})</span>
        </div>
        <div class="visual-context-tag">${ref.name}</div>
      </div>

      <!-- Real World Silhouette & Dimension Visualizer -->
      <div class="visual-scene">
        <div class="scene-dimension-box">
          <div class="scene-dim-line">
            <span class="dim-tick left"></span>
            <span class="dim-label">${formatNumber(realVal, 2)} ${realUnit.symbol} <small>(${formatNumber(drawingVal, 2)} ${drawingUnit.symbol} on paper)</small></span>
            <span class="dim-tick right"></span>
          </div>
        </div>

        <div class="scene-graphics-row">
          <div class="silhouette-container">
            ${refSvg}
            <span class="silhouette-caption">${ref.name} (~${ref.defaultLength}m)</span>
          </div>
          <div class="scene-comparison-info">
            <div class="comp-headline">${comparisonText}</div>
            <div class="comp-subtext">${ref.description}</div>
          </div>
        </div>
      </div>

      <!-- Architectural Scale Bar -->
      <div class="scale-bar-wrapper">
        <div class="scale-bar-title">Architectural Graphical Scale (1:${scaleRatio})</div>
        ${scaleBarHtml}
      </div>
    </div>
  `;
}

/**
 * Returns clean SVG silhouette for architectural reference objects
 */
function getReferenceSilhouette(iconType) {
  switch (iconType) {
    case 'human':
      return `
        <svg class="ref-silhouette" viewBox="0 0 100 180" fill="currentColor">
          <circle cx="50" cy="22" r="14"/>
          <path d="M30,48 C30,42 40,40 50,40 C60,40 70,42 70,48 L68,100 L58,100 L56,170 L44,170 L42,100 L32,100 Z" />
          <line x1="30" y1="50" x2="18" y2="105" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
          <line x1="70" y1="50" x2="82" y2="105" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
        </svg>
      `;
    case 'desk':
    case 'chair':
      return `
        <svg class="ref-silhouette" viewBox="0 0 140 100" fill="none" stroke="currentColor" stroke-width="4">
          <rect x="15" y="25" width="110" height="10" rx="3" fill="currentColor" fill-opacity="0.2"/>
          <line x1="25" y1="35" x2="25" y2="90" stroke-linecap="round"/>
          <line x1="115" y1="35" x2="115" y2="90" stroke-linecap="round"/>
          <rect x="50" y="45" width="40" height="40" rx="3" fill="currentColor" fill-opacity="0.1"/>
        </svg>
      `;
    case 'door':
      return `
        <svg class="ref-silhouette" viewBox="0 0 100 180" fill="none" stroke="currentColor" stroke-width="4">
          <rect x="15" y="10" width="70" height="160" rx="2" fill="currentColor" fill-opacity="0.1"/>
          <line x1="72" y1="90" x2="78" y2="90" stroke-width="6" stroke-linecap="round"/>
          <path d="M15,10 L15,170 L85,170" stroke-dasharray="4 4" stroke-opacity="0.4"/>
        </svg>
      `;
    case 'car':
      return `
        <svg class="ref-silhouette" viewBox="0 0 180 80" fill="currentColor">
          <path d="M20,50 L40,25 L110,25 L145,45 L170,48 C175,50 175,60 170,62 L15,62 C10,60 10,50 20,50 Z" fill-opacity="0.3" stroke="currentColor" stroke-width="3"/>
          <circle cx="45" cy="62" r="14" fill="currentColor"/>
          <circle cx="135" cy="62" r="14" fill="currentColor"/>
          <circle cx="45" cy="62" r="6" fill="var(--bg-main)"/>
          <circle cx="135" cy="62" r="6" fill="var(--bg-main)"/>
          <path d="M48,32 L105,32 L132,48 L48,48 Z" fill="var(--bg-main)" fill-opacity="0.7"/>
        </svg>
      `;
    case 'house':
      return `
        <svg class="ref-silhouette" viewBox="0 0 160 140" fill="none" stroke="currentColor" stroke-width="3">
          <polygon points="80,15 15,65 145,65" fill="currentColor" fill-opacity="0.25"/>
          <rect x="25" y="65" width="110" height="65" fill="currentColor" fill-opacity="0.1"/>
          <rect x="65" y="85" width="30" height="45" fill="currentColor" fill-opacity="0.4"/>
          <rect x="35" y="75" width="20" height="20"/>
          <rect x="105" y="75" width="20" height="20"/>
        </svg>
      `;
    case 'tower':
    case 'building':
      return `
        <svg class="ref-silhouette" viewBox="0 0 120 180" fill="none" stroke="currentColor" stroke-width="3">
          <rect x="25" y="20" width="70" height="150" fill="currentColor" fill-opacity="0.15"/>
          <line x1="25" y1="50" x2="95" y2="50"/>
          <line x1="25" y1="80" x2="95" y2="80"/>
          <line x1="25" y1="110" x2="95" y2="110"/>
          <line x1="25" y1="140" x2="95" y2="140"/>
          <line x1="60" y1="20" x2="60" y2="170"/>
        </svg>
      `;
    default:
      return `
        <svg class="ref-silhouette" viewBox="0 0 100 100" fill="currentColor">
          <polygon points="50,15 85,85 15,85" fill-opacity="0.2" stroke="currentColor" stroke-width="3"/>
          <circle cx="50" cy="50" r="15"/>
        </svg>
      `;
  }
}

/**
 * Generate a calibrated architectural alternating black/white scale bar
 */
function renderGraphicScaleBar(ratio, realMeters) {
  // Determine standard unit steps based on scale ratio
  let stepMeters = 1;
  if (ratio <= 10) stepMeters = 0.1;
  else if (ratio <= 50) stepMeters = 1;
  else if (ratio <= 200) stepMeters = 5;
  else if (ratio <= 1000) stepMeters = 20;
  else if (ratio <= 5000) stepMeters = 100;
  else stepMeters = 500;

  const totalSteps = 4;
  const segments = [];

  for (let i = 0; i <= totalSteps; i++) {
    const val = i * stepMeters;
    let label = `${val}m`;
    if (val >= 1000) label = `${val / 1000}km`;
    else if (val < 1) label = `${(val * 100).toFixed(0)}cm`;
    segments.push({ stepIndex: i, label });
  }

  return `
    <div class="scale-bar-container">
      <div class="scale-bar-blocks">
        <div class="scale-segment solid"></div>
        <div class="scale-segment outline"></div>
        <div class="scale-segment solid"></div>
        <div class="scale-segment outline"></div>
      </div>
      <div class="scale-bar-labels">
        ${segments.map(s => `<span>${s.label}</span>`).join('')}
      </div>
    </div>
  `;
}
