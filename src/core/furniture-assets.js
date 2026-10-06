import { buildDXF } from './export/export-model.js';
import { buildObjectGeometry } from './furniture/geometry-registry.js';
import { resolveObjectDimensions } from './furniture/scaling.js';

/** Recognizable, simplified top views. Coordinates are always real meters. */
export function createFurnitureAsset(item, options = {}) {
  if (!item || !Number.isFinite(item.wCm) || !Number.isFinite(item.dCm) || item.wCm<=0 || item.dCm<=0) throw new Error('Furniture needs positive, finite width and depth.');
  const dimensions=resolveObjectDimensions(item,options),w=dimensions.widthMm/1000,d=dimensions.depthMm/1000;
  const geometry=buildObjectGeometry(item.geometryId || 'object:'+item.id,w,d);
  const clearanceGeometry=[];
  const c=Number.isFinite(item.clearance)&&item.clearance>0?item.clearance/100:0;
  if(c)clearanceGeometry.push({type:'polyline',closed:true,layer:'A-CLEARANCE',points:[[-c,-c],[w+c,-c],[w+c,d+c],[-c,d+c]]});
  return {id:item.id,name:item.name,category:item.category,subcategory:item.subcategory,tags:item.tags||[],geometryId:item.geometryId||'object:'+item.id,
    width:w,depth:d,height:dimensions.heightMm==null?null:dimensions.heightMm/1000,dimensions,description:item.desc,dimensionSourceType:dimensions.modified?'user-defined':item.dimensionSourceType||'user-defined',planGeometry:geometry,clearanceGeometry,
    cadMetadata:{units:'m',exportUnits:'mm',scale:1,origin:[0,0],clearanceNote:'Reference planning allowance, not a certified access zone.',resizeNote:dimensions.modified?'Edited schematic footprint; verify functional details.':''},includeClearance:!!options.includeClearance};
}

export function furnitureAssetDXF(asset, { includeClearance = asset.includeClearance } = {}) {
  return buildDXF([...asset.planGeometry,...(includeClearance?asset.clearanceGeometry:[])],{scale:1000});
}

export function furnitureAssetSVG(asset, { includeClearance = asset.includeClearance } = {}) {
  const entities=[...asset.planGeometry,...(includeClearance?asset.clearanceGeometry:[])];
  const coords=entities.flatMap(e=>e.type==='polyline'?e.points:e.type==='line'?[[e.x1,e.y1],[e.x2,e.y2]]:[[e.x-e.r,e.y-e.r],[e.x+e.r,e.y+e.r]]);
  const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const W=Number(((maxX-minX)*1000).toFixed(4)),H=Number(((maxY-minY)*1000).toFixed(4));
  const n=v=>Number((v*1000).toFixed(4));
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const marks=entities.map(e=>{
    const cls=e.layer==='A-CLEARANCE'?'stroke-dasharray="60 30" opacity=".55"':'';
    if(e.type==='polyline')return `<${e.closed?'polygon':'polyline'} points="${e.points.map(([x,y])=>`${n(x)},${n(y)}`).join(' ')}" ${cls}/>`;
    if(e.type==='line')return `<line x1="${n(e.x1)}" y1="${n(e.y1)}" x2="${n(e.x2)}" y2="${n(e.y2)}"/>`;
    return `<circle cx="${n(e.x)}" cy="${n(e.y)}" r="${n(e.r)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="${n(minX)} ${-n(maxY)} ${W} ${H}" role="img" aria-label="${safe(asset.name)} top view"><title>${safe(asset.name)} — real size, millimeters</title><g transform="scale(1,-1)" fill="none" stroke="currentColor" stroke-width="${Math.max(2,Math.min(W,H)*.006)}">${marks}</g></svg>`;
}
