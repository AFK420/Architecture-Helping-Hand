export function workspaceEscape(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function workspaceTextField(id,label,value='',{rows=4,type='textarea',placeholder=''}={}) {
  return `<label class="companion-field" for="${id}"><span>${workspaceEscape(label)}</span>${type==='textarea'?`<textarea id="${id}" class="text-input" rows="${rows}" placeholder="${workspaceEscape(placeholder)}">${workspaceEscape(value)}</textarea>`:`<input id="${id}" type="${type}" class="text-input" value="${workspaceEscape(value)}" placeholder="${workspaceEscape(placeholder)}">`}</label>`;
}
export function workspaceSourcePicker(references,selected=[],id='workspace-source-picker') {
  return `<label class="companion-field" for="${id}"><span>Sources (Ctrl/Cmd to select more than one)</span><select multiple id="${id}" class="calc-select" size="${Math.min(5,Math.max(2,references.length))}">${references.map(r=>`<option value="${workspaceEscape(r.id)}" ${selected.includes(r.id)?'selected':''}>${workspaceEscape(r.title)} · ${workspaceEscape(r.verification||'unverified')}</option>`).join('')}</select></label>`;
}
export function workspaceSelectedSources(host,id) {return Array.from(host.querySelector('#'+id)?.selectedOptions||[]).map(o=>o.value);}
export function workspaceSave(context,mutator) {
  const result=context.projectStore.updateProject(draft=>{mutator(draft);return draft;});
  if(!result.ok)context.showToast(result.errors?.join('; ')||'Project save failed','error');
  return result;
}

export function workspaceRequireProject(context,host) {
  const project=context.projectStore.getProject();
  if(project)return project;
  host.innerHTML='<div class="archi-card companion-card"><h2>Open a project to begin</h2><p>Research, site analysis, concepts and documents are saved together in your project.</p><button type="button" class="action-tool-btn primary" data-open-project>Open or create a project</button></div>';
  host.querySelector('[data-open-project]').addEventListener('click',()=>context.switchMode('projects'));
  return null;
}
