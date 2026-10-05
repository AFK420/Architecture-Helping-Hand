import { ensureStructuredResearch, createResearchClaim, RESEARCH_SECTIONS } from '../../core/research-workspace.js';
import { requestResearchAI, RESEARCH_AI_TASKS } from '../../services/research-assistant.js';
import { workspaceEscape, workspaceTextField, workspaceSourcePicker, workspaceSelectedSources, workspaceSave } from '../components/workspace-ui.js';

/** Structured workspace extends the existing dashboard rather than duplicating its store. */
export function renderResearchSections(parent,context) {
  const {projectStore,state,showToast}=context;
  const project=projectStore.getProject(),r=ensureStructuredResearch(project);
  const id=state.researchSectionId||'overview',section=r.sections.find(s=>s.id===id)||r.sections[0];
  let host=parent.querySelector('#research-sections-workspace');
  if(!host){host=document.createElement('div');host.id='research-sections-workspace';parent.prepend(host);}
  host.innerHTML=`<div class="companion-workspace"><aside class="companion-index"><h3>Research sections</h3>${r.sections.map(s=>`<div class="companion-index-row"><input type="checkbox" aria-label="Include ${workspaceEscape(s.title)}" data-section-enabled="${s.id}" ${s.enabled?'checked':''}><button type="button" data-section-id="${s.id}" aria-current="${s.id===section.id?'true':'false'}">${workspaceEscape(s.title)}</button></div>`).join('')}<button type="button" class="action-tool-btn" data-open-sources>Sources &amp; citations</button></aside><main class="archi-card companion-card"><h2>${workspaceEscape(section.title)}</h2><p class="field-hint">Research is saved as project data. Reports use these sections without storing layout in your findings.</p><div class="companion-form-grid">${workspaceTextField('research-project-type','Project type',r.metadata.projectType,{type:'text'})}${workspaceTextField('research-location','Location',r.metadata.location,{type:'text'})}</div>${workspaceTextField('research-section-body','Section text',section.body,{rows:8,placeholder:'Write research questions, evidence, context and design implications.'})}<p>${section.aiWritten?'AI-written draft reviewed by the user; evidence still needs verification.':''}</p><button type="button" class="action-tool-btn primary" id="research-section-save">Save section</button><details class="companion-advanced"><summary>Add an evidence-linked finding</summary>${workspaceTextField('research-claim-text','Finding or recommendation','')}<label>Evidence type<select id="research-claim-type" class="calc-select"><option value="user-note">User note</option><option value="sourced-fact">Sourced fact</option><option value="ai-interpretation">AI interpretation</option><option value="recommendation">Design recommendation</option></select></label>${workspaceSourcePicker(r.references,[],'research-claim-sources')}<label><input type="checkbox" id="research-claim-verified"> I checked this sourced fact against its source</label><button type="button" id="research-claim-add" class="action-tool-btn">Add finding</button></details><div class="companion-findings">${r.claims.filter(c=>c.sectionId===section.id).map(c=>`<article><small>${workspaceEscape(c.evidenceType)} · ${workspaceEscape(c.verification)}</small><p>${workspaceEscape(c.text)}</p><p class="field-hint">${c.sourceIds.map(sid=>workspaceEscape(r.references.find(s=>s.id===sid)?.title||'Missing source '+sid)).join(' · ')}</p><button type="button" data-remove-claim="${workspaceEscape(c.id)}" class="action-tool-btn compact">Remove finding</button></article>`).join('')}</div><details class="companion-advanced"><summary>Images &amp; attribution</summary><label>Image<input id="research-image-file" type="file" accept="image/png,image/jpeg,image/webp"></label>${workspaceTextField('research-image-caption','Caption','',{type:'text'})}${workspaceTextField('research-image-attribution','Attribution / source','',{type:'text'})}<label><input type="checkbox" id="research-image-generated"> This is an AI-generated visual</label><p class="field-hint">Images stay in the project. Use reduced-size images for browser storage; save failures are reported.</p>${r.images.filter(i=>i.sectionId===section.id).map(i=>`<p>${workspaceEscape(i.kind)}: ${workspaceEscape(i.caption)} <button type="button" data-remove-image="${workspaceEscape(i.id)}">Remove</button></p>`).join('')}</details><details class="companion-advanced"><summary>AI research assistance</summary><label for="research-ai-task">Task</label><select id="research-ai-task" class="calc-select">${Object.entries(RESEARCH_AI_TASKS).filter(([key])=>!['site','concept'].includes(key)).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><button type="button" id="research-ai-request" class="action-tool-btn">Request draft</button><p id="research-ai-status" role="status">AI uses your stored excerpts; it cannot verify or fetch sources.</p>${workspaceTextField('research-ai-draft','AI interpretation — review before saving','',{rows:8})}<button type="button" id="research-ai-accept" class="action-tool-btn">Use reviewed draft in this section</button></details></main></div>`;
  const get=id=>host.querySelector('#'+id);
  const refresh=()=>renderResearchSections(parent,context);
  host.querySelectorAll('[data-section-id]').forEach(b=>b.addEventListener('click',()=>{state.researchSectionId=b.dataset.sectionId;refresh();}));
  host.querySelectorAll('[data-section-enabled]').forEach(b=>b.addEventListener('change',()=>{workspaceSave(context,p=>{ensureStructuredResearch(p).sections.find(s=>s.id===b.dataset.sectionEnabled).enabled=b.checked;});}));
  host.querySelector('[data-open-sources]').addEventListener('click',()=>context.switchMode('research_library'));
  get('research-section-save').addEventListener('click',()=>{
    const res=workspaceSave(context,p=>{const data=ensureStructuredResearch(p);data.metadata={...data.metadata,projectType:get('research-project-type').value,location:get('research-location').value};data.sections.find(s=>s.id===section.id).body=get('research-section-body').value;});
    if(res.ok)showToast('Research section saved','success');
  });
  get('research-claim-add').addEventListener('click',()=>{
    const result=createResearchClaim({sectionId:section.id,text:get('research-claim-text').value,evidenceType:get('research-claim-type').value,sourceIds:workspaceSelectedSources(host,'research-claim-sources'),verification:get('research-claim-verified').checked?'verified':'unverified'},r.references);
    if(!result.ok){showToast(result.errors.join('; '),'error');return;}
    if(workspaceSave(context,p=>ensureStructuredResearch(p).claims.push(result.claim)).ok)refresh();
  });
  host.querySelectorAll('[data-remove-claim]').forEach(b=>b.addEventListener('click',()=>{workspaceSave(context,p=>{const data=ensureStructuredResearch(p);data.claims=data.claims.filter(c=>c.id!==b.dataset.removeClaim);});refresh();}));
  host.querySelectorAll('[data-remove-image]').forEach(b=>b.addEventListener('click',()=>{workspaceSave(context,p=>{const data=ensureStructuredResearch(p);data.images=data.images.filter(i=>i.id!==b.dataset.removeImage);});refresh();}));
  get('research-image-file').addEventListener('change',async()=>{
    const file=get('research-image-file').files?.[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){showToast('Use PNG, JPEG or WebP up to 2 MB for local project storage','error');return;}
    const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);}).catch(()=>null);
    if(!src){showToast('Image read failed','error');return;}
    const image={id:'image-'+Date.now(),sectionId:section.id,src,caption:get('research-image-caption').value,attribution:get('research-image-attribution').value,kind:get('research-image-generated').checked?'ai-generated-visual':'user-image'};
    if(workspaceSave(context,p=>ensureStructuredResearch(p).images.push(image)).ok)refresh();
  });
  get('research-ai-request').addEventListener('click',async()=>{
    const button=get('research-ai-request');button.disabled=true;get('research-ai-status').textContent='Drafting…';
    try {const result=await requestResearchAI(state.ai?.router,projectStore.getProject(),{task:get('research-ai-task').value,sectionId:section.id});get('research-ai-status').textContent=result.ok?'Unverified AI draft — review evidence and source IDs.':result.message;if(result.ok)get('research-ai-draft').value=result.text||'';}finally{button.disabled=false;}
  });
  get('research-ai-accept').addEventListener('click',()=>{
    const body=get('research-ai-draft').value.trim();if(!body){showToast('Request or write a draft first','warning');return;}
    if(workspaceSave(context,p=>{const data=ensureStructuredResearch(p);const s=data.sections.find(s=>s.id===section.id);s.body=body;s.aiWritten=true;}).ok)refresh();
  });
}
