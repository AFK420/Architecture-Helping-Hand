import { buildDXF } from './export/export-model.js';

/** Recognizable, simplified top views. Coordinates are always real meters. */
export function createFurnitureAsset(item, { includeClearance = false } = {}) {
  if (!item || !Number.isFinite(item.wCm) || !Number.isFinite(item.dCm) || item.wCm<=0 || item.dCm<=0) throw new Error('Furniture needs positive, finite width and depth.');
  const w=item.wCm/100, d=item.dCm/100;
  const geometry=[];
  const rect=(x,y,width,depth,layer='A-FURN')=>geometry.push({type:'polyline',closed:true,layer,points:[[x,y],[x+width,y],[x+width,y+depth],[x,y+depth]]});
  const line=(x1,y1,x2,y2)=>geometry.push({type:'line',layer:'A-FURN',x1,y1,x2,y2});
  const ellipse=(cx,cy,rx,ry,layer='A-FURN')=>geometry.push({type:'polyline',closed:true,layer,points:Array.from({length:40},(_,i)=>{const a=i*Math.PI/20;return [cx+rx*Math.cos(a),cy+ry*Math.sin(a)];})});
  const t=`${item.type} ${item.name}`.toLowerCase();
  if(/door/.test(t)) {
    line(0,0,w,0);line(0,0,0,w);
    geometry.push({type:'polyline',closed:false,layer:'A-DOOR',points:Array.from({length:33},(_,i)=>[w*Math.cos(i*Math.PI/64),w*Math.sin(i*Math.PI/64)])});
  } else if(/toilet|wc\b|urinal/.test(t)) {
    rect(w*.15,0,w*.7,d*.22);ellipse(w/2,d*.57,w*.43,d*.4);ellipse(w/2,d*.57,w*.27,d*.25);
  } else if(/sink|basin/.test(t)) {
    rect(0,0,w,d);ellipse(w/2,d*.55,w*.38,d*.33);geometry.push({type:'circle',x:w/2,y:d*.2,r:Math.min(w,d)*.025,layer:'A-FURN'});
  } else if(/bed|crib|stretcher/.test(t)) {
    rect(0,0,w,d);rect(w*.06,d*.06,w*.88,d*.88);rect(w*.12,d*.1,w*.32,d*.16);if(w>1.2)rect(w*.56,d*.1,w*.32,d*.16);line(w*.06,d*.35,w*.94,d*.35);
    if(/med|hospital|stretcher/.test(t)){line(0,d*.3,0,d*.8);line(w,d*.3,w,d*.8);}
  } else if(/chair|sofa|bench|seating/.test(t)) {
    if(/round/.test(t)) ellipse(w/2,d/2,w/2,d/2);
    else {rect(0,0,w,d);rect(w*.07,d*.2,w*.86,d*.73);line(w*.07,d*.2,w*.93,d*.2);if(/sofa|bench/.test(t)){const count=/4|quad/.test(t)?4:/3|triple/.test(t)?3:2;for(let i=1;i<count;i++)line(w*i/count,d*.2,w*i/count,d*.9);}}
  } else if(/desk/.test(t)) {
    rect(0,0,w,d);line(w*.75,0,w*.75,d);rect(w*.06,d*.12,w*.4,d*.15);
  } else if(/round|circle|tree/.test(t)) ellipse(w/2,d/2,w/2,d/2);
  else if(/parking|bay/.test(t)) {line(0,0,0,d);line(0,d,w,d);line(w,d,w,0);}
  else {rect(0,0,w,d);if(/storage|locker|shelf/.test(t)){line(0,d*.15,w,d*.15);line(w/2,d*.15,w/2,d);}}
  const clearanceGeometry=[];
  const c=Number.isFinite(item.clearance)&&item.clearance>0?item.clearance/100:0;
  if(c)clearanceGeometry.push({type:'polyline',closed:true,layer:'A-CLEARANCE',points:[[-c,-c],[w+c,-c],[w+c,d+c],[-c,d+c]]});
  return {id:item.id,name:item.name,category:item.category,subcategory:item.subcategory,tags:item.tags||[],width:w,depth:d,height:item.hCm?item.hCm/100:null,description:item.desc,dimensionSourceType:item.dimensionSourceType||'user-defined',planGeometry:geometry,clearanceGeometry,
    cadMetadata:{units:'m',exportUnits:'mm',scale:1,origin:[0,0],clearanceNote:'Reference planning allowance, not a certified access zone.'},includeClearance};
}

export function furnitureAssetDXF(asset, { includeClearance = asset.includeClearance } = {}) {
  return buildDXF([...asset.planGeometry,...(includeClearance?asset.clearanceGeometry:[])],{scale:1000});
}

export function furnitureAssetSVG(asset, { includeClearance = asset.includeClearance } = {}) {
  const entities=[...asset.planGeometry,...(includeClearance?asset.clearanceGeometry:[])];
  const coords=entities.flatMap(e=>e.type==='polyline'?e.points:e.type==='line'?[[e.x1,e.y1],[e.x2,e.y2]]:[[e.x-e.r,e.y-e.r],[e.x+e.r,e.y+e.r]]);
  const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const W=(maxX-minX)*1000,H=(maxY-minY)*1000;
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
