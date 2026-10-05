/** Reusable, source-independent SVG diagrams; schematic unless data says otherwise. */
export function escapeDiagramText(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function svgAnalysisFrame(title,body,{width=640,height=360,caption='Schematic — not a measured map'}={}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeDiagramText(title)}"><title>${escapeDiagramText(title)}</title><rect width="100%" height="100%" fill="#f4f2ed"/><g font-family="Arial,sans-serif" fill="#243a3a"><text x="24" y="30" font-size="18" font-weight="bold">${escapeDiagramText(title)}</text>${body}<text x="24" y="${height-15}" font-size="11" fill="#526767">${escapeDiagramText(caption)}</text></g></svg>`;
}
export function northArrowSVG({bearing=0}={}) {
  if(!Number.isFinite(bearing))throw new Error('Bearing must be finite');
  return svgAnalysisFrame('Orientation',`<g transform="translate(320,180) rotate(${bearing})"><path d="M0 -95L-22 35L0 20L22 35Z" fill="#243a3a"/><text x="-8" y="-112" font-size="22">N</text></g>`,{caption:'User-defined north bearing'});
}
export function directionalAnalysisSVG({title='Site relationships',arrows=[]}={}) {
  const valid=(Array.isArray(arrows)?arrows:[]).slice(0,12).filter(a=>a&&Number.isFinite(a.bearing));
  const marks=valid.map((a,i)=>{const angle=(a.bearing-90)*Math.PI/180,dx=Math.cos(angle)*120,dy=Math.sin(angle)*120;return `<g stroke="${i%2?'#b78049':'#376f73'}" stroke-width="5"><path d="M320 180L${320+dx} ${180+dy}"/><path d="M${320+dx-Math.cos(angle-.5)*18} ${180+dy-Math.sin(angle-.5)*18}L${320+dx} ${180+dy}L${320+dx-Math.cos(angle+.5)*18} ${180+dy-Math.sin(angle+.5)*18}" fill="none"/></g><text x="${320+dx*1.12}" y="${180+dy*1.12}" text-anchor="middle" font-size="12">${escapeDiagramText(a.label)}</text>`;}).join('');
  return svgAnalysisFrame(title,`<rect x="245" y="115" width="150" height="130" fill="none" stroke="#7a9292" stroke-width="2"/>${marks}`);
}
export function bubbleDiagramSVG(nodes=[],relationships=[]) {
  const list=[...new Set((Array.isArray(nodes)?nodes:[]).map(String).filter(Boolean))].slice(0,12);
  const positions=list.map((label,i)=>({label,x:320+Math.cos(i*2*Math.PI/Math.max(1,list.length))*210,y:180+Math.sin(i*2*Math.PI/Math.max(1,list.length))*108}));
  const edges=(Array.isArray(relationships)?relationships:[]).filter(pair=>Array.isArray(pair)&&pair.length===2).slice(0,144).map(([from,to])=>[positions.find(p=>p.label===from),positions.find(p=>p.label===to)]).filter(([a,b])=>a&&b).map(([a,b])=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#b78049" stroke-width="3"/>`).join('');
  return svgAnalysisFrame('Spatial relationships',edges+positions.map(p=>`<ellipse cx="${p.x}" cy="${p.y}" rx="65" ry="28" fill="#dfebe6" stroke="#376f73"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="12">${escapeDiagramText(p.label.slice(0,25))}</text>`).join(''),{caption:'Conceptual relationships; bubble sizes do not encode area'});
}
export function swotDiagramSVG({strengths='',weaknesses='',opportunities='',threats=''}={}) {
  const items=[['Strengths',strengths],['Weaknesses',weaknesses],['Opportunities',opportunities],['Threats',threats]];
  return svgAnalysisFrame('SWOT',items.map(([label,text],i)=>{const x=24+(i%2)*300,y=60+Math.floor(i/2)*125;return `<rect x="${x}" y="${y}" width="285" height="110" fill="${i%2?'#eee1d5':'#dfebe6'}"/><text x="${x+12}" y="${y+24}" font-size="16" font-weight="bold">${label}</text>${String(text).slice(0,110).match(/.{1,38}(?:\s|$)|.{1,38}/g)?.slice(0,3).map((line,j)=>`<text x="${x+12}" y="${y+48+j*16}" font-size="12">${escapeDiagramText(line)}</text>`).join('')||''}`;}).join(''));
}
export function analysisLegendSVG(labels=[],{x=24,y=305}={}) {
  return (Array.isArray(labels)?labels:[]).slice(0,5).map((label,i)=>`<rect x="${x+i*118}" y="${y}" width="10" height="10" fill="${['#376f73','#b78049','#7a9292','#b0b979','#866b83'][i]}"/><text x="${x+15+i*118}" y="${y+9}" font-size="10">${escapeDiagramText(String(label).slice(0,18))}</text>`).join('');
}
export function analysisScaleBarSVG({distance,pixelsPerUnit,unit='m',x=24,y=300}={}) {
  if(!Number.isFinite(distance)||distance<=0||!Number.isFinite(pixelsPerUnit)||pixelsPerUnit<=0||distance*pixelsPerUnit>560)throw new Error('A scale bar needs verified positive distance and pixels per unit within the drawing bounds');
  const length=distance*pixelsPerUnit;
  return `<path d="M${x} ${y-5}V${y}H${x+length}V${y-5}" fill="none" stroke="#243a3a" stroke-width="2"/><text x="${x}" y="${y+15}" font-size="10">0</text><text x="${x+length}" y="${y+15}" font-size="10" text-anchor="end">${distance} ${escapeDiagramText(unit)}</text>`;
}
export function analysisBarChartSVG({title='Recorded values',values=[],unit=''}={}) {
  const data=(Array.isArray(values)?values:[]).slice(0,12).filter(v=>v&&Number.isFinite(v.value)&&v.value>=0),max=Math.max(1,...data.map(v=>v.value)),step=540/Math.max(1,data.length);
  const marks=data.map((v,i)=>{const x=70+i*step,h=v.value/max*195;return `<rect x="${x}" y="${270-h}" width="${step*.65}" height="${h}" fill="#376f73"/><text x="${x+step*.325}" y="${262-h}" text-anchor="middle" font-size="11">${v.value}</text><text x="${x+step*.325}" y="290" text-anchor="middle" font-size="10">${escapeDiagramText(String(v.label).slice(0,10))}</text>`;}).join('');
  return svgAnalysisFrame(title,`<path d="M55 60V270H615" stroke="#7a9292" fill="none"/>${marks}`,{caption:'User-recorded values'+(unit?' · '+unit:'')+'; verify original source and units'});
}
export function analysisTimelineSVG({title='Research timeline',events=[]}={}) {
  const data=(Array.isArray(events)?events:[]).slice(0,8).filter(v=>v&&v.label),step=540/Math.max(1,data.length-1);
  return svgAnalysisFrame(title,`<line x1="50" y1="175" x2="590" y2="175" stroke="#7a9292" stroke-width="3"/>`+data.map((event,i)=>`<circle cx="${50+i*step}" cy="175" r="6" fill="#376f73"/><text x="${50+i*step}" y="150" text-anchor="middle" font-size="11">${escapeDiagramText(String(event.date||'').slice(0,16))}</text><text x="${50+i*step}" y="${205+(i%2)*25}" text-anchor="middle" font-size="11">${escapeDiagramText(String(event.label).slice(0,22))}</text>`).join(''),{caption:'User-recorded events; spacing is sequential, not a time scale'});
}
export function analysisViewConeSVG({bearing=0,label='View corridor'}={}) {
  const rotation=Number.isFinite(bearing)?bearing:0;
  return svgAnalysisFrame('Views',`<g transform="translate(320,230) rotate(${rotation})"><path d="M0 0L-120 -170Q0 -220 120 -170Z" fill="#dfebe6" stroke="#376f73" stroke-width="2"/><circle r="7" fill="#376f73"/></g><text x="320" y="320" text-anchor="middle" font-size="13">${escapeDiagramText(label)}</text>`,{caption:'Schematic view corridor; not a surveyed visibility analysis'});
}
export function renderStoredAnalysisVisual(visual) {
  if(!visual)return '';
  if(visual.type==='north')return northArrowSVG({bearing:Number(visual.bearing)||0});
  if(visual.type==='swot')return swotDiagramSVG(visual);
  if(visual.type==='bubbles')return bubbleDiagramSVG(visual.nodes||[],visual.relationships||[]);
  if(visual.type==='arrows')return directionalAnalysisSVG(visual);
  if(visual.type==='bar-chart')return analysisBarChartSVG(visual);
  if(visual.type==='timeline')return analysisTimelineSVG(visual);
  if(visual.type==='view-cone')return analysisViewConeSVG(visual);
  return '';
}
