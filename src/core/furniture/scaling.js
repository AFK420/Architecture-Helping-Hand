/** Physical dimensions create temporary instances; paper scale never changes CAD. */
export function resolveObjectDimensions(item,options={}) {
  const original={widthMm:item.wCm*10,depthMm:item.dCm*10,heightMm:item.hCm==null?null:item.hCm*10};
  let widthMm=options.widthMm??original.widthMm,depthMm=options.depthMm??original.depthMm;
  if(options.preserveProportions){
    if(options.widthMm!=null&&options.depthMm==null)depthMm=original.depthMm*widthMm/original.widthMm;
    else if(options.depthMm!=null&&options.widthMm==null)widthMm=original.widthMm*depthMm/original.depthMm;
    else if(Math.abs(widthMm/depthMm-original.widthMm/original.depthMm)>1e-7)throw new Error('Locked proportions need matching width and depth.');
  }
  const heightMm=options.heightMm??original.heightMm;
  if(![widthMm,depthMm].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1000000)||heightMm!=null&&(!Number.isFinite(heightMm)||heightMm<0||heightMm>1000000))throw new Error('Enter positive, finite dimensions in millimeters (maximum 1,000,000 mm).');
  return {widthMm,depthMm,heightMm,original,modified:widthMm!==original.widthMm||depthMm!==original.depthMm||heightMm!==original.heightMm};
}

export function objectPaperDimensions(dimensions,scale=50) {
  if(!Number.isFinite(scale)||scale<=0)throw new Error('Drawing scale must be positive.');
  return {widthMm:dimensions.widthMm/scale,depthMm:dimensions.depthMm/scale};
}
