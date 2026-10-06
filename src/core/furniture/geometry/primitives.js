/** Normalized CAD primitives. Curves are sampled polylines, never raster images. */
export function objectDrawing(layer='A-FURN') {
  const entities=[];
  const path=(points,closed=false)=>entities.push({type:'polyline',points,closed,layer});
  const line=(x1,y1,x2,y2)=>entities.push({type:'line',x1,y1,x2,y2,layer});
  const rect=(x,y,w,h)=>path([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],true);
  const ellipse=(x,y,rx,ry=rx)=>path(Array.from({length:48},(_,i)=>{const a=i*Math.PI/24;return [x+rx*Math.cos(a),y+ry*Math.sin(a)];}),true);
  const arc=(x,y,rx,ry,start,end)=>path(Array.from({length:33},(_,i)=>{const a=start+(end-start)*i/32;return [x+rx*Math.cos(a),y+ry*Math.sin(a)];}));
  const seat=(x,y,w,h,arms=true)=>{rect(x+w*.12,y+h*.2,w*.76,h*.7);rect(x+w*.1,y,w*.8,h*.2);if(arms){rect(x,y+h*.08,w*.12,h*.82);rect(x+w*.88,y+h*.08,w*.12,h*.82);}};
  const wheels=(x,y,w,h)=>{for(const xx of [x,x+w])for(const yy of [y,y+h])ellipse(xx,yy,.025,.035);};
  return {entities,path,line,rect,ellipse,arc,seat,wheels};
}

export function objectLayout(parts) {
  return parts.flatMap(({geometry,x=0,y=0,w=1,h=1})=>geometry.map(e=>e.type==='line'?{...e,x1:x+e.x1*w,y1:y+e.y1*h,x2:x+e.x2*w,y2:y+e.y2*h}:{...e,points:e.points.map(([px,py])=>[x+px*w,y+py*h])}));
}
