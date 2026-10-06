export const OBJECT_COLLECTIONS = Object.freeze([
  ['luxury','Luxury Residential','luxury residential home cinema spa'],['healthcare','Healthcare / Hospital','hospital clinic healthcare'],
  ['police','Police Department','police security interview'],['fire','Fire Department','fire department fire station'],
  ['parks','Parks & Landscape','park parks landscape outdoor'],['plants','Plants & Trees','plant plants trees vegetation'],
  ['streets','Streets & Urban','street streets urban transport'],['education','Education','school university education'],
  ['retail','Retail / Malls','retail mall malls shop checkout'],['hospitality','Hospitality','hospitality restaurant hotel cafe'],
  ['sports','Sports','sport gym fitness'],['workplace','Office / Workplace','office workplace'],
  ['accessibility','Accessibility','wheelchair accessible accessibility'],['parking','Parking / Transport','parking transport vehicle'],['openings','Doors / Openings','door doors openings']
].map(([id,label,search])=>Object.freeze({id,label,search})));

export function objectCollections(item) {
  const t=`${item.id} ${item.name} ${item.desc}`.toLowerCase(),set=new Set();
  const luxury=/chesterfield|wingback|chaise|grand-piano|super-king|closet-island|vanity-dressing|vanity-double|kitchen-island|butler|wine-|fireplace|jacuzzi|massage|sauna|outdoor-kitchen|bbq|firepit|pool-table|cinema-home|sun-lounger|pergola-seating|outdoor-sectional|ornamental-fountain|lux-sectional/;
  if(luxury.test(t))set.add('luxury');
  if(item.category==='healthcare')set.add('healthcare');
  if(/police|interrogat|custody|evidence|riot|armory|weapons|fingerprint|metal-detector|secure|security|duty-desk/.test(t))set.add('police');
  if(/fire-|fire station|fire department|fire truck|gear-rack-fire|breathing-apparatus|hose-tower|ambulance/.test(t))set.add('fire');
  if(item.category==='outdoor'&&item.subcategory!=='parking')set.add('parks');
  if(/tree-|tree |hedge|shrub|plant|flower|groundcover|grass|lawn|wildflower|green-roof|vertical-garden/.test(t))set.add('plants');
  if(item.legacyCategory==='transport'||/street|bus-stop|bike-rack|crossing|traffic|bollard/.test(t))set.add('streets');
  for(const cat of ['education','retail','hospitality','sports','workplace','accessibility','openings'])if(item.category===cat)set.add(cat);
  if(/parking|vehicle|car-|fire-truck|ambulance|bus-|motor|train|tram|coach/.test(t)||item.subcategory==='parking')set.add('parking');
  if(/wheelchair|accessible|ada|clearance/.test(t))set.add('accessibility');
  return [...set];
}

export function annotateObjectCollections(item) {
  const collections=objectCollections(item);
  const collectionText=OBJECT_COLLECTIONS.filter(c=>collections.includes(c.id)).map(c=>c.search).join(' ');
  const aliases=/interrogat|police-interview/.test(item.id)?['police','interview']: /street-light/.test(item.id)?['streetlight']: /checkout/.test(item.id)?['mall','checkout']:[];
  return {...item,collections,collectionText,useCases:collectionText,tags:[...new Set([...item.tags,...aliases])],...(collections.includes('fire')?{category:'civic',subcategory:'fire'}:{})};
}
