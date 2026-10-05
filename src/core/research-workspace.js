import { ensureResearchContainer, generateReferenceId } from './research.js';

export const RESEARCH_SECTIONS = Object.freeze([
  ['overview','Project Overview'],['background','Background'],['history','Historical Context'],['culture','Cultural Context'],['social','Social Context'],['demographics','Demographics'],['climate','Climate Context'],['urban','Urban Context'],['regulations','Building Regulations'],['spaces','Space Requirements'],['users','Users'],['functions','Functional Requirements'],['materials','Materials'],['sustainability','Sustainability'],['case-studies','Case Studies'],['precedents','Precedents'],['recommendations','Design Recommendations']
].map(([id,title])=>Object.freeze({id,title})));
export const EVIDENCE_TYPES = Object.freeze(['sourced-fact','ai-interpretation','user-note','recommendation']);

export function ensureStructuredResearch(project) {
  const r=ensureResearchContainer(project);
  if(!r.metadata || typeof r.metadata!=='object' || Array.isArray(r.metadata))r.metadata={projectType:'',location:'',summary:''};
  for(const key of ['sections','claims','images','generatedVisuals','caseStudies','recommendations'])if(!Array.isArray(r[key]))r[key]=[];
  for(const def of RESEARCH_SECTIONS)if(!r.sections.some(s=>s.id===def.id))r.sections.push({id:def.id,title:def.title,enabled:['overview','climate','users','spaces','precedents','recommendations'].includes(def.id),body:'',aiWritten:false});
  return r;
}

/** Source IDs are references in the existing research library, never a duplicate source store. */
export function validateSourceLinks(references, sourceIds) {
  if(!Array.isArray(sourceIds) || sourceIds.some(id=>typeof id!=='string'))return {ok:false,errors:['sourceIds must be a list of reference IDs']};
  const missing=[...new Set(sourceIds)].filter(id=>!references.some(r=>r?.id===id));
  return {ok:missing.length===0,errors:missing.map(id=>`Missing source: ${id}`),sourceIds:[...new Set(sourceIds)]};
}

export function createResearchClaim(input, references = []) {
  if(!input || typeof input!=='object')return {ok:false,errors:['Finding must be an object']};
  const text=typeof input.text==='string'?input.text.trim():'';
  const evidenceType=EVIDENCE_TYPES.includes(input.evidenceType)?input.evidenceType:'user-note';
  const links=validateSourceLinks(references,input.sourceIds||[]);
  const errors=[...links.errors];
  if(!text || text.length>10000)errors.push('Write a finding of 1–10000 characters');
  if(evidenceType==='sourced-fact' && !links.sourceIds?.length)errors.push('A sourced fact needs at least one stored reference');
  if(errors.length)return {ok:false,errors};
  return {ok:true,claim:{id:input.id||generateReferenceId(),sectionId:RESEARCH_SECTIONS.some(s=>s.id===input.sectionId)?input.sectionId:'overview',text,evidenceType,sourceIds:links.sourceIds,verification:input.verification==='verified' && evidenceType==='sourced-fact'?'verified':'unverified',notes:String(input.notes||''),createdAt:input.createdAt||new Date().toISOString()}};
}

export function citationForSource(source, index = 1) {
  return {id:source.id,label:`[${index}]`,text:[source.author||source.architect,source.title,source.publisher,source.publicationDate||source.year,source.url,source.retrievedAt?`Accessed ${source.retrievedAt}`:'',source.citationText,source.imageAttribution].filter(Boolean).join('. '),url:source.url||'',verification:source.verification||'unverified'};
}

export function researchBibliography(references, sourceIds = null) {
  const list=Array.isArray(references)?references:[];
  return list.filter(r=>!sourceIds || sourceIds.includes(r.id)).map((r,i)=>citationForSource(r,i+1));
}

export function validateResearchWorkspace(r) {
  const errors=[];
  if(!r || typeof r!=='object' || Array.isArray(r))return {ok:false,errors:['research must be an object']};
  for(const key of ['references','notes','sections','claims','images','generatedVisuals','caseStudies'])if(r[key]!==undefined&&!Array.isArray(r[key]))errors.push(`research.${key} must be an array`);
  for(const ref of Array.isArray(r.references)?r.references:[])if(!ref||typeof ref.id!=='string'||typeof ref.title!=='string')errors.push('Research reference requires id and title');
  for(const s of Array.isArray(r.sections)?r.sections:[])if(!s||typeof s.id!=='string'||typeof s.body!=='string'||typeof s.title!=='string'||typeof s.enabled!=='boolean')errors.push('Research section requires id, title, body and enabled');
  for(const c of Array.isArray(r.claims)?r.claims:[]){const check=createResearchClaim(c,Array.isArray(r.references)?r.references:[]);if(!check.ok)errors.push(...check.errors);}
  return {ok:!errors.length,errors};
}
