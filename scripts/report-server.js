/** Optional local PDF service. Frontend remains a dependency-free file:// app. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { renderArchitectureDocument } from '../src/core/reports/templates.js';
import { validateArchitectureDocument } from '../src/core/reports/document-model.js';

const reportRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reportPort=Number(process.env.AHH_REPORT_PORT)||3510;
let reportBrowser=null,reportBrowserStart=null,reportActive=0;
export async function closeReportBrowser() {await reportBrowserStart?.catch(()=>{});await reportBrowser?.close();reportBrowser=null;}

async function getReportBrowser({playwrightModule=process.env.AHH_PLAYWRIGHT_MODULE,executablePath=process.env.AHH_CHROMIUM_PATH}={}) {
  if(reportBrowser)return reportBrowser;
  if(reportBrowserStart)return reportBrowserStart;
  reportBrowserStart=(async()=>{
  let playwright;
  if(playwrightModule)playwright=await import(pathToFileURL(playwrightModule).href);
  else {try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(reportRoot,'tools','report-runtime','node_modules','playwright','index.mjs')).href);}}
    const options={headless:true,...(executablePath?{executablePath}:{})};
    try{reportBrowser=await playwright.chromium.launch(options);}catch(error){if(executablePath)throw error;reportBrowser=await playwright.chromium.launch({...options,channel:'msedge'});}
    return reportBrowser;
  })();
  try{return await reportBrowserStart;}finally{reportBrowserStart=null;}
}

async function withPaginatedReport(html,options,render) {
  const browser=await getReportBrowser(options),page=await browser.newPage();
  try {
    await page.route('**/*',route=>route.abort()); // Document assets are embedded; no network access during rendering.
    await page.setContent(html,{waitUntil:'load'});
    await page.emulateMedia({media:'print'});
    await page.waitForFunction(()=>window.__reportReady===true||document.body.dataset.paginationError,{},{timeout:30000});
    const paginationError=await page.evaluate(()=>document.body.dataset.paginationError);
    if(paginationError)throw new Error(paginationError);
    return await render(page);
  } finally {await page.close();}
}

export async function renderWithChromium(html,options={}) {
  return withPaginatedReport(html,options,page=>page.pdf({preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false}));
}

export async function preparePaginatedReportHTML(html,options={}) {
  return withPaginatedReport(html,options,page=>page.evaluate(()=>{
    document.getElementById('report-flow')?.remove();
    document.querySelectorAll('script').forEach(script=>script.remove());
    return '<!doctype html>'+document.documentElement.outerHTML;
  }));
}

export async function renderWithVivliostyle(html,{cli=process.env.AHH_VIVLIOSTYLE_CLI_JS}={}) {
  if(!cli){const pkgPath=path.join(reportRoot,'tools','report-runtime','node_modules','@vivliostyle','cli','package.json');const pkg=JSON.parse(await fs.readFile(pkgPath,'utf8'));cli=path.resolve(path.dirname(pkgPath),typeof pkg.bin==='string'?pkg.bin:Object.values(pkg.bin)[0]);}
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'ahh-report-'));
  try {
    const input=path.join(temp,'document.html'),output=path.join(temp,'document.pdf');
    await fs.writeFile(input,await preparePaginatedReportHTML(html));
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[cli,'build',input,'-o',output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let errors='';
      child.stderr.on('data',data=>{errors=(errors+data).slice(-3000);});child.on('error',reject);
      const timer=setTimeout(()=>{child.kill();reject(new Error('Vivliostyle rendering timed out'));},120000);
      child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(errors||'Vivliostyle failed'));});
    });
    return await fs.readFile(output);
  } finally {await fs.rm(temp,{recursive:true,force:true});}
}

export async function renderArchitecturePDFOnServer(doc,{renderer=process.env.AHH_PDF_RENDERER||'chromium',chromium=renderWithChromium,vivliostyle=renderWithVivliostyle}={}) {
  const check=validateArchitectureDocument(doc);if(!check.ok)throw new Error(check.errors.join('; '));
  const html=renderArchitectureDocument(doc);
  if(renderer==='vivliostyle'){try{return {bytes:await vivliostyle(html),renderer:'vivliostyle'};}catch{return {bytes:await chromium(html),renderer:'chromium-fallback'};}}
  return {bytes:await chromium(html),renderer:'chromium'};
}

export function createReportServer() {
  return http.createServer(async(req,res)=>{
    const fail=(status,message,code='RENDERER_UNAVAILABLE')=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({message,code}));};
    if(req.headers.host!==`127.0.0.1:${reportPort}`&&req.headers.host!==`localhost:${reportPort}`){fail(403,'Local host required');return;}
    if(req.headers.origin && ![`http://127.0.0.1:${reportPort}`,`http://localhost:${reportPort}`].includes(req.headers.origin)){fail(403,'Same-origin requests required');return;}
    if(req.method==='POST'&&req.url==='/api/reports/pdf') {
      if(reportActive>=2){fail(429,'PDF renderer is busy; try again shortly.');return;}
      if(!String(req.headers['content-type']).startsWith('application/json')){fail(415,'A JSON document is required','INVALID_DOCUMENT');return;}
      let size=0,body='';
      try {for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024){fail(413,'Document too large','INVALID_DOCUMENT');return;}body+=chunk;}const doc=JSON.parse(body),check=validateArchitectureDocument(doc);if(!check.ok){fail(400,check.errors.join('; '),'INVALID_DOCUMENT');return;}
        reportActive++;try{const result=await renderArchitecturePDFOnServer(doc);res.writeHead(200,{'Content-Type':'application/pdf','X-AHH-Renderer':result.renderer,'Cache-Control':'no-store'});res.end(result.bytes);}finally{reportActive--;}
      } catch(error){fail(503,'PDF renderer unavailable. Install the isolated report runtime or configure a Chromium/Playwright path. '+error.message);}
      return;
    }
    if(req.method!=='GET'){fail(405,'Method not supported');return;}
    try {
      const url=new URL(req.url,'http://127.0.0.1');const segments=decodeURIComponent(url.pathname).split('/').filter(Boolean);
      if(segments.some(s=>s.startsWith('.')||['node_modules','scratch'].includes(s))){fail(403,'File is not served');return;}
      const target=path.resolve(reportRoot,segments.join(path.sep)||'index.html');
      if(!target.startsWith(reportRoot+path.sep)){fail(403,'Invalid file path');return;}
      const content=await fs.readFile(target);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
      res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
    }catch{fail(404,'File not found');}
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const server=createReportServer();server.listen(reportPort,'127.0.0.1',()=>console.log(`Architecture report server: http://127.0.0.1:${reportPort}`));
  const stop=async()=>{server.close();await closeReportBrowser();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
