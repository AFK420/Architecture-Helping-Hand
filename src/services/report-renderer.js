import { validateArchitectureDocument } from '../core/reports/document-model.js';

/** An adapter contract, not a dependency on one PDF renderer. */
export async function generateArchitecturePDF(doc,{endpoint='/api/reports/pdf',fetchImpl=globalThis.fetch,protocol=globalThis.location?.protocol||'http:'}={}) {
  const check=validateArchitectureDocument(doc);if(!check.ok)return {ok:false,code:'INVALID_DOCUMENT',message:check.errors.join('; ')};
  if(protocol==='file:')return {ok:false,code:'RENDERER_UNAVAILABLE',message:'Direct PDF export requires the local report server. Download HTML is available offline.'};
  if(typeof fetchImpl!=='function')return {ok:false,code:'RENDERER_UNAVAILABLE',message:'PDF renderer is unavailable.'};
  try {
    const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(doc)});
    if(!response.ok){const error=await response.json().catch(()=>({}));return {ok:false,code:error.code||'RENDERER_UNAVAILABLE',message:error.message||'Start the local report server for direct PDF export.'};}
    if(!String(response.headers.get('Content-Type')).includes('application/pdf'))return {ok:false,code:'INVALID_RENDERER_RESPONSE',message:'The renderer did not return a PDF.'};
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')return {ok:false,code:'INVALID_RENDERER_RESPONSE',message:'Invalid PDF response.'};
    return {ok:true,bytes,renderer:response.headers.get('X-AHH-Renderer')||'paged-media'};
  } catch(error){return {ok:false,code:'RENDERER_UNAVAILABLE',message:'PDF renderer connection failed. Download HTML or start the local report server.'};}
}
