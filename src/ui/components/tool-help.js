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
  details.innerHTML = `<summary>How to use</summary><div class="workflow-help-grid"><section><h3>Overview</h3><p>${safe(guide.what)}</p><p>${safe(guide.why)}</p><p>${safe(guide.how)}</p></section><section><h3>Example</h3><p>${safe(guide.example)}</p></section><section><h3>CAD workflow</h3>${['autocad','rhino','sketchup'].map(key=>`<h4>${safe({autocad:'AutoCAD',rhino:'Rhino',sketchup:'SketchUp'}[key])}</h4><p>${safe(guide[key])}</p>`).join('')}</section><section><h3>Other tools and technical notes</h3><p>${safe(guide.other)}</p></section></div>`;
  const intro = document.createElement('div');
  intro.className = 'workflow-intro';
  intro.innerHTML = `<p>${safe(guide.what)}</p><p><strong>Use this when</strong> ${safe(guide.when)}</p>`;
  const heading=host.querySelector('h2');
  if(heading && toolId!=='converter')heading.textContent=guide.name;
  const anchor=toolId==='converter'?host.querySelector('.tool-intro'):host.querySelector('.instrument-header-bar,.card-title-row')||heading;
  if(anchor){if(toolId==='converter')anchor.after(details);else anchor.after(intro,details);}
  else host.prepend(intro,details);
}
