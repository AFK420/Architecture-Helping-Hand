/**
 * Architecture Helping Hand - Dual-Tier Tool Guidance System
 * Provides:
 * 1. Tier 1: Floating cursor-following smart card popover near hovered tool
 *    ("What is it?" + "How to use it 1-2-3")
 * 2. Tier 2: Permanent Architectural Standards Inspector card in C-Panels
 *    (IBC / ADA Building codes, formulas, cavity wall thicknesses, and pro tips)
 */

import { STUDIO_TOOL_CATALOG } from '../../core/personas.js';
import { getToolGuide } from '../../core/tool-guides.js';


let activePopoverEl = null;
let popoverTimeout = null;

/**
 * Initializes the Dual-Tier Tool Guidance System
 * Attaches event listeners to ribbon buttons, toolstrip buttons, and HUD controls.
 */
export function initToolGuidance(container) {
  if (!container) return;

  // Ensure Tier 1 Popover DOM exists
  let popover = document.getElementById('studio-tool-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'studio-tool-popover';
    popover.className = 'studio-tool-popover';
    popover.style.display = 'none';
    document.body.appendChild(popover);
  }
  activePopoverEl = popover;

  const toolSelectors = [
    '.ribbon-tool-btn',
    '.palette-tool-btn',
    '.iconic-tool-btn',
    '.hud-btn',
    '[data-tool]'
  ];

  const elements = container.querySelectorAll(toolSelectors.join(', '));
  elements.forEach(btn => {
    btn.addEventListener('mouseenter', (e) => {
      const toolId = btn.dataset.tool;
      if (!toolId) return;
      showToolPopover(e, toolId);
      updateInspectorGuide(toolId);
    });

    btn.addEventListener('mouseleave', () => {
      hideToolPopover();
    });

    btn.addEventListener('mousemove', (e) => {
      positionPopoverNearMouse(e);
    });
  });
}

/**
 * Shows Tier 1 Floating Popover near the mouse cursor
 */
export function showToolPopover(e, toolId) {
  if (!activePopoverEl) return;
  clearTimeout(popoverTimeout);

  const guide = getToolGuide(toolId);

  activePopoverEl.innerHTML = `
    <div class="popover-header">
      <span class="popover-icon">${guide.icon}</span>
      <div class="popover-title-group">
        <span class="popover-title">${guide.name}</span>
        ${guide.shortcut ? `<span class="popover-badge"><kbd>${guide.shortcut}</kbd></span>` : ''}
      </div>
    </div>
    <div class="popover-section">
      <span class="popover-sublabel">WHAT IS IT?</span>
      <p class="popover-desc">${guide.desc}</p>
    </div>
    <div class="popover-section">
      <span class="popover-sublabel">HOW TO USE IT:</span>
      <ol class="popover-steps">
        ${guide.usage.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
    ${guide.standards ? `
      <div class="popover-section standards">
        <span class="popover-sublabel">📐 STANDARD / CODE:</span>
        <p class="popover-code">${guide.standards}</p>
      </div>
    ` : ''}
  `;

  popoverTimeout = setTimeout(() => {
    if (activePopoverEl) {
      activePopoverEl.style.display = 'block';
      positionPopoverNearMouse(e);
    }
  }, 120);
}

/**
 * Hides Tier 1 Floating Popover
 */
export function hideToolPopover() {
  clearTimeout(popoverTimeout);
  if (activePopoverEl) {
    activePopoverEl.style.display = 'none';
  }
}

/**
 * Positions Tier 1 popover near cursor, keeping it within viewport boundaries
 */
function positionPopoverNearMouse(e) {
  if (!activePopoverEl || activePopoverEl.style.display === 'none') return;

  const pad = 16;
  let x = e.clientX + pad;
  let y = e.clientY + pad;

  const rect = activePopoverEl.getBoundingClientRect();
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  if (x + rect.width > winW - 12) {
    x = e.clientX - rect.width - pad;
  }
  if (y + rect.height > winH - 12) {
    y = e.clientY - rect.height - pad;
  }
  if (x < 12) x = 12;
  if (y < 12) y = 12;

  activePopoverEl.style.left = `${x}px`;
  activePopoverEl.style.top = `${y}px`;
}

/**
 * Updates Tier 2 Dedicated Permanent Inspector Card in Right C-Panels
 */
export function updateInspectorGuide(toolId) {
  const guideCard = document.getElementById('cpanel-tool-guide-card');
  if (!guideCard) return;

  const guide = getToolGuide(toolId);

  guideCard.innerHTML = `
    <div class="tool-guide-header">
      <div class="guide-title-row">
        <span class="guide-icon">${guide.icon}</span>
        <span class="guide-name">${guide.name}</span>
      </div>
      ${guide.shortcut ? `<span class="guide-shortcut"><kbd>${guide.shortcut}</kbd></span>` : ''}
    </div>

    <div class="tool-guide-body">
      <div class="guide-block">
        <span class="guide-label">PURPOSE</span>
        <p class="guide-text">${guide.desc}</p>
      </div>

      <div class="guide-block">
        <span class="guide-label">WORKFLOW</span>
        <div class="guide-steps">
          ${guide.usage.map((step, i) => `
            <div class="guide-step-item">
              <span class="step-num">${i + 1}</span>
              <span class="step-text">${step}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="guide-block standards-block">
        <span class="guide-label">IBC / ADA BUILDING STANDARD</span>
        <p class="guide-code">${guide.standards}</p>
      </div>

      <div class="guide-block protip-block">
        <span class="guide-label">PRO ARCHITECT TIP</span>
        <p class="guide-protip">💡 ${guide.proTip}</p>
      </div>
    </div>
  `;
}
