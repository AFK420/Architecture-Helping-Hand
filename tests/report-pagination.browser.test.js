import {loadReportTestBrowser} from './helpers/report-browser-runtime.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createProject } from '../src/core/project.js';
import { ensureStructuredResearch,createResearchClaim } from '../src/core/research-workspace.js';
import { createReference } from '../src/core/research.js';
import { ensureSiteAnalyses,updateSiteAnalysis } from '../src/core/site-analysis.js';
import { createArchitectureDocument,REPORT_PAGE_SIZES } from '../src/core/reports/document-model.js';
import { renderArchitectureDocument } from '../src/core/reports/templates.js';
import { preparePaginatedReportHTML,closeReportBrowser } from '../scripts/report-server.js';
await fs.mkdir('.report-test-artifacts',{recursive:true});
const browser=await loadReportTestBrowser(),page=await browser.newPage();
try {
const p=createProject({name:'Courtyard Library — Research & Site Analysis',author:'Architecture studio'}),r=ensureStructuredResearch(p);
r.metadata.location='Baghdad / user-supplied site observations';
r.references.push(createReference({id:'qa-source',title:'Project field notebook',url:'https://example.org/field-notebook',author:'Project team',publisher:'User-supplied reference',retrievedAt:'2026-10-06'}).reference);
r.sections.find(s=>s.id==='overview').body='The proposed library connects a shaded public court to quiet reading rooms. The study compares access, afternoon exposure and the relationship between social space and learning. All observations in this fixture are illustrative user notes.';
r.claims.push(createResearchClaim({id:'qa-finding',sectionId:'overview',text:'Western access faces the traffic edge; separate quieter reading spaces from the public arrival route.',evidenceType:'sourced-fact',sourceIds:['qa-source']},r.references).claim);
ensureSiteAnalyses(p);updateSiteAnalysis(p,'noise',{data:'Traffic edge on the western boundary.',interpretation:'The main approach may experience acoustic discomfort.',designImplication:'Explore a landscape buffer and service core as a design option.',sourceIds:['qa-source'],visual:{type:'arrows',title:'Access & acoustic context',arrows:[{bearing:270,label:'Traffic edge'},{bearing:90,label:'Quiet approach'}]}});
p.concept={statement:'The courtyard is a climatic and social threshold.',drivers:[],narrative:'A sequence of shaded entry, social courtyard and quiet study.',spatialRelationships:[['Entry','Courtyard'],['Courtyard','Reading'],['Reading','Garden']]};
const results=[];
for(const [size,paper] of Object.entries(REPORT_PAGE_SIZES))for(const template of ['report','board']){
  const doc=createArchitectureDocument(p,{documentType:'board',template,pageSize:size});
  doc.sections.push({id:'overflow',title:'Evidence comparison & extended notes',blocks:[{id:'long-text',type:'text',content:'Sequential field observations retain context and explicit uncertainty. '.repeat(250),sourceIds:[]},{id:'long-quote',type:'quote',content:'A reflective studio note with a long explanation of design alternatives. '.repeat(85),sourceIds:[]},{id:'table',type:'table',caption:'Illustrative comparison of observations',columns:['Record','Observation','Implication'],rows:Array.from({length:95},(_,i)=>['Record '+i,'Illustrative observation '+i,'Verify in the original drawing before using this recommendation.'])}]});
  await page.emulateMedia({media:'print'});await page.setContent(renderArchitectureDocument(doc));await page.waitForFunction(()=>window.__reportReady||document.body.dataset.paginationError);
  const metrics=await page.evaluate(()=>({error:document.body.dataset.paginationError,pages:[...document.querySelectorAll('.report-page-body')].map(body=>({height:body.clientHeight,scroll:body.scrollHeight,width:body.clientWidth,scrollWidth:body.scrollWidth,children:[...body.children].map(c=>({tag:c.tagName,bottom:c.getBoundingClientRect().bottom-body.getBoundingClientRect().top}))})),text:document.body.innerText,longText:[...document.querySelectorAll('[data-report-block="long-text"]')].map(p=>p.textContent).join(' ').replace(/\s+/g,' ')}));
  assert.equal(metrics.error,undefined,template+' '+size);assert.ok(metrics.pages.every(p=>p.scroll<=p.height+1&&p.scrollWidth<=p.width+1),'No page overflow '+template+' '+size);assert.ok(metrics.text.includes('Record 94'),'Last table row preserved');assert.equal((metrics.longText.match(/Sequential field observations/g)||[]).length,250,'All paragraphs preserved');
  const filename='.report-test-artifacts/qa-'+template+'-'+size+'.pdf';await page.pdf({path:filename,preferCSSPageSize:true,printBackground:true});
  if(size==='a3-landscape')await page.locator('.report-sheet').nth(template==='board'?0:1).screenshot({path:'.report-test-artifacts/qa-'+template+'-page.png'});
  if(size==='a4-portrait'&&template==='report'){
    const staticHTML=await preparePaginatedReportHTML(renderArchitectureDocument(doc));
    await page.setContent(staticHTML);
    assert.equal(await page.locator('script,#report-flow').count(),0,'CLI handoff needs no JavaScript or hidden source flow');
    assert.equal(await page.locator('.report-sheet').count(),metrics.pages.length,'CLI handoff retains physical pages');
    assert.ok((await page.locator('#report-pages').innerText()).includes('Record 94'),'CLI handoff retains final table row');
  }
  results.push({template,size,widthMm:paper.widthMm,heightMm:paper.heightMm,pages:metrics.pages.length,overflow:false});console.log(JSON.stringify(results.at(-1)));
}
await fs.writeFile('.report-test-artifacts/pdf-qa-results.json',JSON.stringify(results,null,2));} finally {await browser.close();await closeReportBrowser();}console.log('PASS 10 physical-size template combinations with long text, quotes, diagrams, sources and 95 table rows; static CLI page handoff verified.');
