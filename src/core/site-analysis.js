import { ensureSiteStudy } from './site.js';
import { ensureStructuredResearch, validateSourceLinks } from './research-workspace.js';

export const SITE_ANALYSES = Object.freeze([
  ['location','Location & Context'],['boundaries','Site Boundaries'],['land-use','Surrounding Land Use'],['roads','Road Hierarchy'],['vehicles','Vehicular Access'],['pedestrians','Pedestrian Access'],['transit','Public Transport'],['sun','Sun Path & Solar Exposure'],['orientation','Orientation'],['wind','Prevailing Wind'],['temperature','Temperature'],['rainfall','Rainfall'],['topography','Topography & Contours'],['slope','Slope'],['noise','Noise'],['views','Views'],['vegetation','Vegetation'],['buildings','Existing Buildings & Heights'],['urban-grain','Urban Grain / Figure Ground'],['density','Density'],['utilities','Utilities'],['opportunities','Opportunities'],['constraints','Constraints'],['swot','SWOT'],['response','Design Response']
].map(([id,title])=>Object.freeze({id,title})));

export function ensureSiteAnalyses(project) {
  const study=ensureSiteStudy(project);
  if(!Array.isArray(study.analyses))study.analyses=[];
  for(const def of SITE_ANALYSES)if(!study.analyses.some(a=>a.id===def.id))study.analyses.push({id:def.id,title:def.title,enabled:['location','vehicles','pedestrians','sun','wind','noise','views','opportunities','constraints','response'].includes(def.id),data:'',interpretation:'',designImplication:'',sourceIds:[],visual:null});
  return study.analyses;
}

export function updateSiteAnalysis(project,id,input) {
  const analyses=ensureSiteAnalyses(project),analysis=analyses.find(a=>a.id===id);
  if(!analysis)return {ok:false,errors:['Unknown site analysis']};
  const links=validateSourceLinks(ensureStructuredResearch(project).references,input.sourceIds||[]);
  if(!links.ok)return links;
  for(const key of ['data','interpretation','designImplication'])if(typeof input[key]!=='string'||input[key].length>15000)return {ok:false,errors:[`${key} must be text of at most 15000 characters`]};
  Object.assign(analysis,{data:input.data,interpretation:input.interpretation,designImplication:input.designImplication,sourceIds:links.sourceIds,enabled:input.enabled!==false,visual:input.visual||null});
  return {ok:true,analysis};
}

export function siteAnalysisProgress(analyses) {
  const enabled=analyses.filter(a=>a.enabled);
  return {enabled:enabled.length,completed:enabled.filter(a=>a.data.trim()&&a.interpretation.trim()&&a.designImplication.trim()).length};
}
