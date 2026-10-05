import {loadReportTestBrowser} from './helpers/report-browser-runtime.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { WORKSPACES } from '../src/core/workspaces.js';
process.env.AHH_REPORT_PORT=process.env.AHH_REPORT_TEST_PORT||'3511';
const {createReportServer,closeReportBrowser}=await import('../scripts/report-server.js');
const server=createReportServer();
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(process.env.AHH_REPORT_PORT),'127.0.0.1',resolve);});
await fs.mkdir('.report-test-artifacts',{recursive:true});
let browser;
try {
browser=await loadReportTestBrowser();
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR '+e.message);});
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
await page.goto('http://127.0.0.1:'+process.env.AHH_REPORT_PORT,{waitUntil:'networkidle'});
await page.waitForSelector('#sidebar-nav [data-workspace="project"]');
async function open(workspace,tool){await page.locator('#sidebar-nav [data-workspace="'+workspace+'"]').click();await page.locator('#sidebar-nav [data-mode="'+tool+'"]').first().click();await page.locator('#mode-view-'+tool).waitFor({state:'visible'});await page.evaluate(()=>scrollTo(0,0));}
for(const workspace of WORKSPACES)for(const tool of workspace.tools){await open(workspace.id,tool.toolId);console.log('VIEW '+tool.toolId);}
await open('project','projects');await page.fill('#projects-name-input','Browser QA Library');await page.click('#btn-project-new');
await open('tools','dimensions');
for(const workflow of ['expression','workspace','chains','multiscale']){await page.locator('[data-dimension-workflow="'+workflow+'"]').click();assert.equal(await page.locator('#dimension-panel-'+workflow).isVisible(),true);}
await open('project','research_dashboard');
await page.fill('#research-project-type','Community library');await page.fill('#research-location','Baghdad');await page.fill('#research-section-body','A community library with shaded public courtyards.');await page.click('#research-section-save');
await page.screenshot({path:'.report-test-artifacts/research-workspace.png',fullPage:true});
await open('project','research_library');await page.fill('#ref-title-input','Field survey record');await page.fill('#ref-url-input','https://example.org/survey');await page.fill('#ref-summary-input','User-supplied observations from fieldwork.');await page.click('#ref-add-btn');
await open('project','research_dashboard');await page.locator('summary').filter({hasText:'Add an evidence-linked finding'}).click();await page.fill('#research-claim-text','The western edge faces the main road.');await page.selectOption('#research-claim-type','sourced-fact');await page.selectOption('#research-claim-sources',{label:'Field survey record · unverified'});await page.click('#research-claim-add');
await open('project','site_dashboard');await page.click('[data-analysis-id="noise"]');await page.fill('#site-analysis-data','Traffic from the western road.');await page.fill('#site-analysis-interpretation','Potential acoustic discomfort.');await page.fill('#site-analysis-response','Consider a planted buffer and service core.');await page.locator('summary').filter({hasText:'Visual'}).first().click();await page.selectOption('#site-analysis-visual','arrows');await page.fill('#site-analysis-arrows','270,Noise from road\n90,Pedestrian access');await page.click('#site-analysis-save');
await page.screenshot({path:'.report-test-artifacts/site-workspace.png',fullPage:true});
await open('project','concept');await page.fill('#concept-statement','A shaded courtyard as a social and climatic threshold.');await page.fill('#concept-relationships','Entry → Courtyard\nCourtyard → Reading');await page.click('#concept-save');
await open('tools','furniture');
await page.fill('#furniture-search-input','hospital bed');assert.ok(await page.locator('[data-furniture-download="dxf"]').count());
const furnitureDownload=page.waitForEvent('download');await page.locator('[data-furniture-download="dxf"]').first().click();const cadDownload=await furnitureDownload;await cadDownload.saveAs('.report-test-artifacts/hospital-bed.dxf');assert.ok((await fs.readFile('.report-test-artifacts/hospital-bed.dxf','utf8')).includes('POLYLINE'));
await page.keyboard.press('Control+k');await page.fill('#command-palette-input','place king bed');await page.locator('.command-item').filter({hasText:'Find King Bed'}).first().click();assert.ok((await page.inputValue('#furniture-search-input')).toLowerCase().includes('king'));
await page.screenshot({path:'.report-test-artifacts/furniture-workspace.png',fullPage:true});
await open('settings','ai_settings');assert.equal(await page.locator('#ai-advanced-settings').getAttribute('open'),null);assert.ok(await page.locator('#ai-default-model option').count()>1);await page.selectOption('#ai-default-model',{index:1});await page.click('#ai-simple-save');assert.equal(await page.locator('#ai-simple-status').textContent(),'Settings saved');await page.screenshot({path:'.report-test-artifacts/ai-settings.png',fullPage:true});
await open('documents','reports');await page.waitForTimeout(800);const frame=page.frameLocator('#report-page-preview');await frame.locator('.report-sheet').first().waitFor();assert.ok(await frame.locator('.report-sheet').count()>=2);await page.screenshot({path:'.report-test-artifacts/report-composer.png',fullPage:true});
const downloadPromise=page.waitForEvent('download');await page.click('#report-export-pdf');const download=await downloadPromise;await download.saveAs('.report-test-artifacts/browser-research.pdf');assert.ok((await fs.readFile('.report-test-artifacts/browser-research.pdf')).subarray(0,5).toString()==='%PDF-');
await page.reload({waitUntil:'networkidle'});await open('project','research_dashboard');assert.equal(await page.inputValue('#research-section-body'),'A community library with shaded public courtyards.');
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.screenshot({path:'.report-test-artifacts/mobile-research.png',fullPage:false});
await fs.writeFile('.report-test-artifacts/browser-redesign-errors.json',JSON.stringify(errors,null,2));
console.log('Browser errors: '+JSON.stringify(errors));assert.deepEqual(errors,[]);console.log('PASS browser navigation, dimensions tabs, saved research/source/site/concept, preview, PDF and reload.');} finally {await browser?.close();await closeReportBrowser();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
