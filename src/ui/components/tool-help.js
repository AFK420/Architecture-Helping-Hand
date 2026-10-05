import { getWorkflowGuide } from '../../core/tool-guides.js';

/** Collapsed, keyboard-accessible help reuses the application's guide catalog. */
export function mountWorkflowHelp(toolId) {
  const host = document.getElementById(`mode-view-${toolId}`);
  if (!host || host.querySelector('.workflow-help')) return;
  const guide = getWorkflowGuide(toolId);
  if (!guide) return;
  const safe = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const details = document.createElement('details');
  details.className = 'workflow-help';
  details.innerHTML = `<summary>How to use ${safe(guide.name)}</summary><div class="workflow-help-grid">${['what','why','when','how','example','autocad','rhino','sketchup','other'].map(key => `<div><strong>${safe(key.toUpperCase())}</strong><p>${safe(guide[key])}</p></div>`).join('')}</div>`;
  host.prepend(details);
}
