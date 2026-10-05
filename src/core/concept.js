export function ensureConcept(project) {
  if(!project.concept || typeof project.concept!=='object' || Array.isArray(project.concept))project.concept={};
  const c=project.concept;
  for(const key of ['statement','goals','constraints','precedentInspiration','massingIdeas','materialIdeas','narrative'])if(typeof c[key]!=='string')c[key]='';
  for(const key of ['keywords','drivers','spatialRelationships','generatedVisuals'])if(!Array.isArray(c[key]))c[key]=[];
  return c;
}
export function createDesignDriver({text,findingId='',siteAnalysisId=''},project) {
  if(typeof text!=='string'||!text.trim())return {ok:false,error:'Write a design driver'};
  if(findingId&&!project.research?.claims?.some(c=>c.id===findingId))return {ok:false,error:'Unknown research finding'};
  if(siteAnalysisId&&!project.site?.study?.analyses?.some(a=>a.id===siteAnalysisId))return {ok:false,error:'Unknown site analysis'};
  return {ok:true,driver:{id:'driver-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),text:text.trim(),findingId,siteAnalysisId,kind:'recommendation'}};
}
