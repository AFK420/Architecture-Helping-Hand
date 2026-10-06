import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadReportTestBrowser} from '../tests/helpers/report-browser-runtime.js';
import {QA_VIEWPORTS,QA_MODES} from './qa-config.mjs';
import {FURNITURE_DATABASE} from '../src/core/furniture.js';
process.env.AHH_REPORT_PORT=process.env.AHH_QA_PORT||'3513';
const {createReportServer,closeReportBrowser}=await import('./report-server.js');
const server=createReportServer();
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(process.env.AHH_REPORT_PORT),'127.0.0.1',resolve);});
let browser;
const qaReport={generatedAt:new Date().toISOString(),architecture:'six workspaces; registry-driven live tools',viewports:QA_VIEWPORTS,modes:QA_MODES,checks:{},workflows:[],errors:[]};
await fs.mkdir('.report-test-artifacts/responsive',{recursive:true});
try {
  browser=await loadReportTestBrowser();const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>qaReport.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')qaReport.errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+process.env.AHH_REPORT_PORT,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.__ahhSwitchMode==='function');
  const open=async mode=>{await page.evaluate(mode=>window.__ahhSwitchMode(mode),mode);await page.evaluate(()=>{scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await page.evaluate(()=>Promise.race([Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,500))]));};
  await open('projects');await page.fill('#projects-name-input','Current responsive QA project');await page.click('#btn-project-new');
  await open('research_dashboard');await page.fill('#research-project-type','Community library');await page.fill('#research-section-body','A shaded courtyard connects public arrival with quiet study. Recorded design notes for layout QA.');await page.click('#research-section-save');
  await open('site_dashboard');await page.click('[data-analysis-id="noise"]');await page.fill('#site-analysis-data','Road noise along the western boundary.');await page.fill('#site-analysis-interpretation','A quieter internal court may be useful.');await page.fill('#site-analysis-response','Consider separating arrival and reading spaces.');await page.click('#site-analysis-save');
  await open('converter');await page.fill('#converter-input-val','5');await page.selectOption('#converter-input-unit','m');await page.selectOption('#converter-output-unit','mm');await page.selectOption('#converter-scale-select','50');
  assert.equal(Number(await page.locator('#converter-result-val').textContent()),100);assert.equal(await page.locator('#converter-input-badge').textContent(),'Real measurement');
  await page.click('[data-direction="drawing_to_real"]');await page.fill('#converter-input-val','100');assert.equal(Number(await page.locator('#converter-result-val').textContent()),5);assert.equal(await page.locator('#converter-input-badge').textContent(),'Measurement on drawing');
  await page.locator('.converter-advanced').evaluate(e=>e.open=true);await page.fill('#scale-ratio-input','75');assert.equal(await page.locator('#converter-scale-select').inputValue(),'75');await page.locator('.converter-advanced').evaluate(e=>e.open=false);
  await open('furniture');await page.fill('#furniture-search-input','hospital bed');const card=page.locator('.object-card[data-id="hospital-bed"]');await card.locator('.object-size-editor>summary').click();
  await card.locator('[data-size=widthMm]').fill('1100');await card.locator('[data-size=depthMm]').fill('2400');assert.ok((await card.locator('[data-object-size]').textContent()).includes('2,400'));
  const saveDownload=async(format,path)=>{const ready=page.waitForEvent('download');await card.locator(`[data-furniture-download=${format}]`).click();const downloaded=await ready;await downloaded.saveAs(path);return fs.readFile(path,'utf8');};
  const dxf=await saveDownload('dxf','.report-test-artifacts/resized-hospital-bed.dxf');assert.ok(dxf.includes('1100.0000')&&dxf.includes('2400.0000'));
  const svg=await saveDownload('svg','.report-test-artifacts/resized-hospital-bed.svg');assert.ok(svg.includes('width="1100mm"')&&svg.includes('height="2400mm"'));
  await page.locator('.object-library-options').first().evaluate(e=>e.open=true);await page.fill('#furn-scale-ratio-input','100');assert.equal(await card.locator('[data-size=widthMm]').inputValue(),'1100');assert.equal(await saveDownload('svg','.report-test-artifacts/resized-bed-scale100.svg'),svg);
  await card.locator('.object-size-editor').evaluate(e=>e.open=true);await card.locator('[data-reset-size]').click();await card.locator('[data-lock-proportions]').check();await card.locator('[data-size=widthMm]').fill('1200');assert.equal(Number(await card.locator('[data-size=depthMm]').inputValue()),1200*FURNITURE_DATABASE.find(i=>i.id==='hospital-bed').dCm/FURNITURE_DATABASE.find(i=>i.id==='hospital-bed').wCm);await card.locator('[data-size=widthMm]').fill('');assert.equal(await card.locator('[data-furniture-download=dxf]').isDisabled(),true);await card.locator('[data-reset-size]').click();
  await card.locator('.object-information').evaluate(e=>e.open=true);await card.locator('[data-send-object]').click();assert.equal(await page.locator('#converter-flow-to').textContent(),'Drawing size');assert.equal(await page.locator('#converter-input-badge').textContent(),'Real measurement');assert.ok((await page.locator('#converter-explanation').textContent()).includes('on paper'));
  qaReport.workflows.push('Converter direction toggle and custom ratio','Physical resize and actual DXF/SVG download','Drawing scale leaves CAD unchanged','Proportion lock, invalid input and reset','Library → Converter direction synchronization');
  const inspect=()=>{
    const vw=document.documentElement.clientWidth,problems=[];
    const hiddenShell=el=>{if(el.closest('.app-sidebar')&&vw<=1024&&!document.body.classList.contains('sidebar-open'))return true;if(el.closest('.history-drawer')&&!el.closest('.history-drawer.open'))return true;if(el.closest('.quick-dim-strip')&&!el.closest('.quick-dim-strip.open'))return true;return false;};
    for(const el of document.querySelectorAll('button,input,select,textarea,summary,a[href]')){
      const r=el.getBoundingClientRect(),cs=getComputedStyle(el);if(r.width===0||r.height===0||cs.visibility==='hidden'||hiddenShell(el))continue;
      let scrollable=false;for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(['auto','scroll'].includes(s.overflowX)&&p.scrollWidth>p.clientWidth+2){scrollable=true;break;}}
      if(!scrollable&&(r.left< -2||r.right>vw+2))problems.push({kind:'cut-off-control',id:el.id||el.getAttribute('data-size')||el.tagName,left:Math.round(r.left),right:Math.round(r.right)});
      if(el.closest('.modal-overlay.open')&&(r.top< -2||r.bottom>innerHeight+2)){
        let reachable=false;for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){if(['auto','scroll'].includes(getComputedStyle(p).overflowY)&&p.scrollHeight>p.clientHeight+2){reachable=true;break;}}
        if(!reachable)problems.push({kind:'dialog-cut-off',id:el.id||el.tagName,top:Math.round(r.top),bottom:Math.round(r.bottom)});
      }
      if(el.closest('.tool-mode-view')&&parseFloat(cs.fontSize)<11)problems.push({kind:'small-control-text',id:el.id||el.tagName,fontSize:cs.fontSize});
    }
    return {overflowX:Math.max(0,document.documentElement.scrollWidth-vw),problems};
  };
  for(const [width,height] of QA_VIEWPORTS){
    await page.setViewportSize({width,height});const key=`${width}x${height}`;qaReport.checks[key]={};
    for(const mode of QA_MODES){await open(mode);if(mode==='reports')await page.frameLocator('#report-page-preview').locator('.report-sheet').first().waitFor();
      qaReport.checks[key][mode]=await page.evaluate(inspect);
      if(['converter','furniture','research_dashboard','site_dashboard','dimensions','reports','ai_settings','rescale','detector','area_volume','stairs','ramps','slopes','cad_clipboard','cad_handoff','batch_cad','reference','standards_explorer'].includes(mode))await page.screenshot({path:`.report-test-artifacts/responsive/${key}-${mode}.png`});
      const advanced=page.locator(`#mode-view-${mode}>.simple-advanced`);
      if(await advanced.count()){await advanced.evaluate(e=>{e.open=true;e.querySelectorAll('details').forEach(nested=>nested.open=true);});qaReport.checks[key][mode+':advanced']=await page.evaluate(inspect);await advanced.evaluate(e=>e.open=false);}
    }
    await open('dimensions');for(const tab of ['expression','workspace','chains','multiscale']){await page.click(`[data-dimension-workflow=${tab}]`);qaReport.checks[key]['dimensions:'+tab]=await page.evaluate(inspect);await page.screenshot({path:`.report-test-artifacts/responsive/${key}-dimensions-${tab}.png`});const details=page.locator(`#dimension-panel-${tab}>.simple-advanced`);await details.evaluate(e=>e.open=true);qaReport.checks[key]['dimensions:'+tab+':advanced']=await page.evaluate(inspect);await details.evaluate(e=>e.open=false);}
    await open('furniture');await card.locator('.object-size-editor').evaluate(e=>e.open=true);await card.locator('.object-information').evaluate(e=>e.open=true);qaReport.checks[key]['furniture:edit-size']=await page.evaluate(inspect);
    await page.locator('#global-options').evaluate(e=>e.open=true);await page.click('#shortcuts-help-btn');qaReport.checks[key]['dialog:shortcuts']=await page.evaluate(inspect);await page.click('#close-shortcuts-btn');
    console.log('QA '+key+' '+QA_MODES.length+' modes, four Dimensions workflows, resize controls and shortcuts dialog');
  }
  qaReport.summary={modeViewportChecks:QA_MODES.length*QA_VIEWPORTS.length,totalLayoutChecks:Object.values(qaReport.checks).reduce((count,checks)=>count+Object.keys(checks).length,0),advancedLayoutChecks:Object.values(qaReport.checks).reduce((count,checks)=>count+Object.keys(checks).filter(key=>key.endsWith(':advanced')).length,0),failures:Object.entries(qaReport.checks).flatMap(([viewport,v])=>Object.entries(v).filter(([,r])=>r.overflowX>2||r.problems.length).map(([mode,r])=>({viewport,mode,...r}))),consoleErrors:qaReport.errors.length};
  await fs.writeFile('qa-report.json',JSON.stringify(qaReport,null,2)+'\n');
  assert.equal(qaReport.errors.length,0,'No browser errors');assert.equal(qaReport.summary.failures.length,0,'Responsive QA findings saved in qa-report.json');
  console.log('PASS current registry-driven responsive QA and physical resize downloads.');
} finally {await browser?.close();await closeReportBrowser();await new Promise(r=>server.close(r));}
