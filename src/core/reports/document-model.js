import { ensureStructuredResearch, researchBibliography } from '../research-workspace.js';
import { ensureSiteAnalyses } from '../site-analysis.js';

export const REPORT_PAGE_SIZES = Object.freeze({
  'a4-portrait':{label:'A4 Portrait',widthMm:210,heightMm:297},
  'a4-landscape':{label:'A4 Landscape',widthMm:297,heightMm:210},
  'a3-portrait':{label:'A3 Portrait',widthMm:297,heightMm:420},
  'a3-landscape':{label:'A3 Landscape',widthMm:420,heightMm:297},
  'a2-landscape':{label:'A2 Landscape',widthMm:594,heightMm:420}
});
export const REPORT_TEMPLATES = Object.freeze({report:{label:'Minimal Architecture Report'},board:{label:'Architecture Analysis Board'}});
export const DOCUMENT_BLOCK_TYPES = Object.freeze(['heading','text','image','map','diagram','chart','table','quote','finding','recommendation','source','citation','case-study','comparison','page-break']);

export function validateArchitectureDocument(doc) {
  const errors=[];
  if(!doc||typeof doc!=='object'||Array.isArray(doc))return {ok:false,errors:['Document must be an object']};
  for(const field of ['title','author','location','documentType'])if(typeof doc[field]!=='string'||doc[field].length>2000)errors.push(field+' must be bounded text');
  if(doc.bibliography!==undefined&&(!Array.isArray(doc.bibliography)||doc.bibliography.length>3000||doc.bibliography.some(c=>!c||typeof c.id!=='string'||typeof c.label!=='string')))errors.push('Invalid bibliography');
  if(!REPORT_PAGE_SIZES[doc.pageSize])errors.push('Unknown physical page size');
  if(!REPORT_TEMPLATES[doc.template])errors.push('Unknown report template');
  if(!Array.isArray(doc.sections)||doc.sections.length>200)errors.push('Document needs at most 200 sections');
  const ids=new Set();let count=0;
  for(const section of Array.isArray(doc.sections)?doc.sections:[]) {
    if(!section||typeof section.id!=='string'||typeof section.title!=='string'||!Array.isArray(section.blocks)){errors.push('Section requires id, title and blocks');continue;}
    for(const block of section.blocks) {
      count++;
      if(!block||!DOCUMENT_BLOCK_TYPES.includes(block.type)||typeof block.id!=='string'){errors.push('Invalid document block');continue;}
      if(ids.has(block.id))errors.push('Duplicate document block id');ids.add(block.id);
      if(block.content!==undefined&&(typeof block.content!=='string'||block.content.length>100000))errors.push('Block content must be bounded text');
      if(block.sourceIds!==undefined&&(!Array.isArray(block.sourceIds)||block.sourceIds.some(id=>typeof id!=='string')))errors.push('Block source IDs must be strings');
      if(block.rows!==undefined&&(!Array.isArray(block.rows)||block.rows.length>500||block.rows.some(row=>!Array.isArray(row)||row.length>20)))errors.push('Table needs at most 500 rows and 20 columns');
      if(block.columns!==undefined&&(!Array.isArray(block.columns)||block.columns.length>20))errors.push('Invalid table columns');
      if(block.visual!==undefined&&(!block.visual||typeof block.visual!=='object'||Array.isArray(block.visual)||!['north','arrows','swot','bubbles','bar-chart','timeline','view-cone'].includes(block.visual.type)))errors.push('Unsupported stored visual');
      if(block.src!==undefined&&(typeof block.src!=='string'||block.src.length>4*1024*1024))errors.push('Image source is invalid or too large');
    }
  }
  if(count>3000)errors.push('Document has too many blocks');
  return {ok:!errors.length,errors};
}

/** Pure projection: evidence stays in the project; page/template decisions stay here. */
export function createArchitectureDocument(project,options={}) {
  const working=structuredClone(project),r=ensureStructuredResearch(working);
  const type=options.documentType||'research';
  const sections=[];
  if(['research','booklet','presentation','board'].includes(type)) {
    for(const section of r.sections.filter(s=>s.enabled)) {
      const blocks=[];
      if(section.body)blocks.push({id:section.id+'-body',type:'text',content:section.body,evidenceType:section.aiWritten?'ai-interpretation':'user-note',sourceIds:[]});
      for(const claim of r.claims.filter(c=>c.sectionId===section.id))blocks.push({id:claim.id,type:claim.evidenceType==='recommendation'?'recommendation':'finding',content:claim.text,evidenceType:claim.evidenceType,verification:claim.verification,sourceIds:claim.sourceIds});
      for(const image of r.images.filter(i=>i.sectionId===section.id))blocks.push({id:image.id,type:'image',src:image.src,caption:image.caption,attribution:image.attribution,evidenceType:image.kind==='ai-generated-visual'?'ai-generated-visual':'user-image',sourceIds:image.sourceId?[image.sourceId]:[]});
      sections.push({id:'research-'+section.id,title:section.title,blocks});
    }
  }
  if(['site','board','presentation'].includes(type)) {
    for(const analysis of ensureSiteAnalyses(working).filter(a=>a.enabled)) {
      const blocks=[];
      if(analysis.data)blocks.push({id:'site-'+analysis.id+'-data',type:'finding',content:analysis.data,evidenceType:'user-note',sourceIds:analysis.sourceIds});
      if(analysis.visual)blocks.push({id:'site-'+analysis.id+'-visual',type:'diagram',visual:analysis.visual,caption:analysis.title+' — schematic',sourceIds:analysis.sourceIds});
      if(analysis.interpretation)blocks.push({id:'site-'+analysis.id+'-interpretation',type:'text',content:analysis.interpretation,evidenceType:'interpretation',sourceIds:analysis.sourceIds});
      if(analysis.designImplication)blocks.push({id:'site-'+analysis.id+'-response',type:'recommendation',content:analysis.designImplication,evidenceType:'recommendation',sourceIds:analysis.sourceIds});
      sections.push({id:'site-'+analysis.id,title:analysis.title,blocks});
    }
  }
  if(type==='case-study'||type==='precedent') {
    for(const ref of r.references.filter(s=>['case_study','precedent'].includes(s.category)&&(!options.caseStudyId||s.id===options.caseStudyId)))sections.push({id:'case-'+ref.id,title:ref.title,blocks:[{id:ref.id+'-case',type:'case-study',content:ref.summary||'',sourceIds:[ref.id]},{id:ref.id+'-takeaway',type:'recommendation',content:ref.takeaway||'',sourceIds:[ref.id]}]});
  }
  if(working.concept && ['board','presentation'].includes(type)) {
    const c=working.concept;
    sections.push({id:'concept',title:'Design Concept',blocks:[{id:'concept-statement',type:'text',content:c.statement||'',sourceIds:[]},...((c.drivers||[]).map(d=>({id:d.id,type:'recommendation',content:d.text,sourceIds:r.claims.find(f=>f.id===d.findingId)?.sourceIds||[]}))),{id:'concept-bubbles',type:'diagram',visual:{type:'bubbles',nodes:[...new Set((c.spatialRelationships||[]).flat())],relationships:c.spatialRelationships||[]},caption:'Conceptual spatial relationships',sourceIds:[]},{id:'concept-narrative',type:'text',content:c.narrative||'',sourceIds:[]}]});
  }
  for(const block of options.customBlocks||[]) {
    const target=sections.find(s=>s.id===block.sectionId);
    if(target)target.blocks.push({...block});
  }
  const excluded=new Set(options.excludedSections||[]),disabled=new Set(options.disabledBlocks||[]),order=options.sectionOrder||[];
  const visible=sections.filter(s=>!excluded.has(s.id)).map(s=>({...s,blocks:s.blocks.filter(b=>!disabled.has(b.id)).map(b=>({...b,...(options.overrides?.[b.id]||{}),id:b.id,type:b.type}))}));
  visible.sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);});
  const used=[...new Set(visible.flatMap(s=>s.blocks.flatMap(b=>b.sourceIds||[])))];
  const bibliography=researchBibliography(r.references,used);
  const missing=used.filter(id=>!r.references.some(s=>s.id===id));
  if(bibliography.length)visible.push({id:'references',title:'References',blocks:bibliography.map(c=>({id:'citation-'+c.id,type:'source',content:`${c.label} ${c.text}`,url:c.url,verification:c.verification,sourceIds:[c.id]}))});
  const doc={version:1,projectId:project.id,title:project.metadata?.name||'Architecture Research',author:project.metadata?.author||'',location:r.metadata.location||project.site?.location||'',documentType:type,template:options.template|| (type==='board'?'board':'report'),pageSize:options.pageSize|| (type==='board'?'a3-landscape':'a4-portrait'),sections:visible,bibliography,warnings:missing.map(id=>'Missing source: '+id)};
  const check=validateArchitectureDocument(doc);if(!check.ok)throw new Error(check.errors.join('; '));return doc;
}
