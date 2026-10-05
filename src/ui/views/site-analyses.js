import { ensureSiteAnalyses, updateSiteAnalysis, siteAnalysisProgress } from '../../core/site-analysis.js';
import { ensureStructuredResearch } from '../../core/research-workspace.js';
import { renderStoredAnalysisVisual } from '../../core/analysis-diagrams.js';
import { requestResearchAI } from '../../services/research-assistant.js';
import { workspaceEscape, workspaceTextField, workspaceSourcePicker, workspaceSelectedSources, workspaceSave } from '../components/workspace-ui.js';

export function renderSiteAnalyses(parent,context) {
  const {projectStore,state,showToast}=context;
  const project=projectStore.getProject(),analyses=ensureSiteAnalyses(project),sources=ensureStructuredResearch(project).references;
  const active=analyses.find(a=>a.id===(state.siteAnalysisId||'location'))||analyses[0],progress=siteAnalysisProgress(analyses);
  let host=parent.querySelector('#site-analysis-workspace');if(!host){host=document.createElement('div');host.id='site-analysis-workspace';parent.prepend(host);}
  host.innerHTML=`<div class="companion-workspace"><aside class="companion-index"><h3>Analysis checklist</h3><p>${progress.completed} / ${progress.enabled} complete</p>${analyses.map(a=>`<div class="companion-index-row"><input type="checkbox" data-analysis-enabled="${a.id}" aria-label="Include ${workspaceEscape(a.title)}" ${a.enabled?'checked':''}><button type="button" data-analysis-id="${a.id}" aria-current="${a.id===active.id?'true':'false'}">${a.data&&a.interpretation&&a.designImplication?'✓':'○'} ${workspaceEscape(a.title)}</button></div>`).join('')}</aside><main class="archi-card companion-card"><h2>${workspaceEscape(active.title)}</h2><p class="field-hint">Observations and recommendations are recorded by you. The app does not fetch climate, transport or regulatory evidence.</p>${workspaceTextField('site-analysis-data','Data / observation',active.data)}${workspaceTextField('site-analysis-interpretation','Interpretation',active.interpretation)}${workspaceTextField('site-analysis-response','Design implication / recommendation',active.designImplication)}${workspaceSourcePicker(sources,active.sourceIds,'site-analysis-sources')}<details class="companion-advanced"><summary>Visual</summary><label>Diagram<select id="site-analysis-visual" class="calc-select"><option value="">No diagram</option><option value="north">North arrow</option><option value="arrows">Directional relationships</option><option value="swot">SWOT</option><option value="bar-chart">Recorded-value chart</option><option value="timeline">Research timeline</option><option value="view-cone">View corridor</option></select></label>${workspaceTextField('site-analysis-bearing','North bearing (degrees)',active.visual?.bearing||0,{type:'number'})}${workspaceTextField('site-analysis-arrows','Directions: one bearing,label per line',active.visual?.arrows?.map(a=>a.bearing+','+a.label).join('\n')||'',{placeholder:'270,Noise from road\n90,Main access'})}${workspaceTextField('site-chart-data','Chart: one label,value per line',active.visual?.values?.map(v=>v.label+','+v.value).join('\n')||'',{placeholder:'Jan,12\nFeb,16'})}${workspaceTextField('site-chart-unit','Chart unit (required)',active.visual?.unit||'',{type:'text',placeholder:'mm rainfall, °C, count, etc.'})}${workspaceTextField('site-timeline-data','Timeline: one date,label per line',active.visual?.events?.map(v=>v.date+','+v.label).join('\n')||'')}${['strengths','weaknesses','opportunities','threats'].map(key=>workspaceTextField('site-swot-'+key,key,active.visual?.[key]||'',{rows:2})).join('')}</details><div class="companion-actions"><button type="button" id="site-analysis-save" class="action-tool-btn primary">Save analysis</button><button type="button" data-site-tool="site_context" class="action-tool-btn">Context worksheet</button><button type="button" data-site-tool="sun_path" class="action-tool-btn">Calculate sun</button><button type="button" data-site-tool="survey" class="action-tool-btn">Survey notebook</button></div><div class="analysis-visual">${renderStoredAnalysisVisual(active.visual)}</div><details class="companion-advanced"><summary>AI interpretation</summary><button type="button" id="site-analysis-ai" class="action-tool-btn">Interpret supplied observations</button><p id="site-analysis-ai-status" role="status">Review AI interpretations before using them.</p>${workspaceTextField('site-analysis-ai-draft','Unverified AI interpretation','',{rows:7})}<button type="button" id="site-analysis-ai-accept" class="action-tool-btn">Use reviewed interpretation</button></details></main></div>`;
  const get=id=>host.querySelector('#'+id),refresh=()=>renderSiteAnalyses(parent,context);get('site-analysis-visual').value=active.visual?.type||'';
  host.querySelectorAll('[data-analysis-id]').forEach(b=>b.addEventListener('click',()=>{state.siteAnalysisId=b.dataset.analysisId;refresh();}));
  host.querySelectorAll('[data-analysis-enabled]').forEach(b=>b.addEventListener('change',()=>workspaceSave(context,p=>{ensureSiteAnalyses(p).find(a=>a.id===b.dataset.analysisEnabled).enabled=b.checked;})));
  host.querySelectorAll('[data-site-tool]').forEach(b=>b.addEventListener('click',()=>context.switchMode(b.dataset.siteTool)));
  get('site-analysis-save').addEventListener('click',()=>{
    let visual=null;const type=get('site-analysis-visual').value;
    if(type==='north'){const bearing=Number(get('site-analysis-bearing').value);if(!Number.isFinite(bearing)){showToast('Use a finite bearing','error');return;}visual={type,bearing};}
    if(type==='arrows') {
      const lines=get('site-analysis-arrows').value.split('\n').filter(Boolean),arrows=[];
      for(const line of lines){const [value,...label]=line.split(',');const bearing=Number(value);if(!Number.isFinite(bearing)||!label.join(',').trim()){showToast('Directions need bearing,label on each line','error');return;}arrows.push({bearing,label:label.join(',').trim()});}
      visual={type,title:active.title,arrows};
    }
    if(type==='view-cone')visual={type,bearing:Number(get('site-analysis-bearing').value),label:active.title};
    if(type==='bar-chart') {
      const values=get('site-chart-data').value.split('\n').filter(Boolean).map(line=>{const [label,...value]=line.split(',');return {label:label.trim(),value:Number(value.join(','))};});
      const unit=get('site-chart-unit').value.trim();
      if(!unit||!values.length||values.some(v=>!v.label||!Number.isFinite(v.value)||v.value<0)){showToast('Chart values need label,non-negative number on each line and explicit units','error');return;}
      visual={type,title:active.title,values,unit};
    }
    if(type==='timeline') {
      const events=get('site-timeline-data').value.split('\n').filter(Boolean).map(line=>{const [date,...label]=line.split(',');return {date:date.trim(),label:label.join(',').trim()};});
      if(!events.length||events.some(e=>!e.date||!e.label)){showToast('Use date,label on each timeline line','error');return;}visual={type,title:active.title,events};
    }
    if(type==='swot')visual={type,...Object.fromEntries(['strengths','weaknesses','opportunities','threats'].map(k=>[k,get('site-swot-'+k).value]))};
    const input={enabled:active.enabled,data:get('site-analysis-data').value,interpretation:get('site-analysis-interpretation').value,designImplication:get('site-analysis-response').value,sourceIds:workspaceSelectedSources(host,'site-analysis-sources'),visual};
    const check=updateSiteAnalysis(structuredClone(project),active.id,input);if(!check.ok){showToast(check.errors.join('; '),'error');return;}
    if(workspaceSave(context,p=>updateSiteAnalysis(p,active.id,input)).ok){showToast('Site analysis saved','success');refresh();}
  });
  get('site-analysis-ai').addEventListener('click',async()=>{
    const b=get('site-analysis-ai');b.disabled=true;get('site-analysis-ai-status').textContent='Interpreting…';
    const draft=structuredClone(project);updateSiteAnalysis(draft,active.id,{...active,data:get('site-analysis-data').value,interpretation:get('site-analysis-interpretation').value,designImplication:get('site-analysis-response').value});
    try{const result=await requestResearchAI(state.ai?.router,draft,{task:'site',sectionId:active.id});get('site-analysis-ai-status').textContent=result.ok?'Unverified AI interpretation; recommendations are not code requirements.':result.message;if(result.ok)get('site-analysis-ai-draft').value=result.text||'';}finally{b.disabled=false;}
  });
  get('site-analysis-ai-accept').addEventListener('click',()=>{const value=get('site-analysis-ai-draft').value.trim();if(!value)return;if(workspaceSave(context,p=>{ensureSiteAnalyses(p).find(a=>a.id===active.id).interpretation=value;}).ok)refresh();});
}
