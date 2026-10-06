/** Classification is independent from legacy dimensions and from CAD geometry. */
export const FURNITURE_CATEGORIES = Object.freeze({
  residential: ['living','bedroom','dining','kitchen','bathroom'],
  workplace: ['office','meeting','reception','collaborative'],
  healthcare: ['patient-room','waiting','examination','treatment','clinical','accessibility'],
  education: ['classroom','lecture','library','laboratory'],
  retail: ['display','checkout','storage','customer'],
  hospitality: ['restaurant','cafe','hotel','lobby','service'],
  civic: ['police','fire','government','security','community'],
  sports: ['gym','fitness','locker-room','courts'],
  outdoor: ['parking','landscape','street-furniture','recreation'],
  accessibility: ['mobility','clearance'],
  openings: ['doors','circulation']
});

export function classifyFurniture(record) {
  const legacyCategory = record.legacyCategory || record.category;
  const text = `${record.id} ${record.name} ${record.desc} ${record.type}`.toLowerCase();
  let category = 'workplace', subcategory = 'office';
  if (['living','bedroom','dining','kitchen','bathroom'].includes(legacyCategory)) { category='residential'; subcategory=legacyCategory; }
  if (legacyCategory === 'doors') { category='openings'; subcategory=/door/.test(text)?'doors':'circulation'; }
  if (/hospital|hosp-|clinic|medical|patient|dental|examination|exam-|nurse|infusion|x-ray|scanner|stretcher|dialysis|surgical|operating|therapy/.test(text) || legacyCategory==='healthcare') {
    category='healthcare'; subcategory=/waiting/.test(text)?'waiting':/bed|crib|bedside|overbed/.test(text)?'patient-room':/exam|dental|ophthalm|opto/.test(text)?'examination':/treatment|procedure|dialysis|operating/.test(text)?'treatment':/wheelchair|walker/.test(text)?'accessibility':'clinical';
  } else if (legacyCategory==='education' || /school|classroom|lecture|student|laboratory|lab bench/.test(text)) {
    category='education'; subcategory=/library|book/.test(text)?'library':/lab/.test(text)?'laboratory':/lecture|tier/.test(text)?'lecture':'classroom';
  } else if (legacyCategory==='emergency' || /police|security|custody|government|community|fire station|fire-engine/.test(text)) {
    category='civic'; subcategory=/police|custody|interview/.test(text)?'police':/security|guard|scanner/.test(text)?'security':/government/.test(text)?'government':'community';
  } else if (['sports','fitness'].includes(legacyCategory) || /gym|fitness|treadmill|locker|barbell|dumbbell|weight bench/.test(text)) {
    category='sports'; subcategory=/locker|changing/.test(text)?'locker-room':/court|field|pool|stadium/.test(text)?'courts':/gym|weight|barbell|bench/.test(text)?'gym':'fitness';
  } else if (legacyCategory==='hospitality' || /restaurant|cafe|café|hotel|bar stool|buffet|commercial kitchen|service cart/.test(text)) {
    category='hospitality'; subcategory=/hotel|guest|luggage/.test(text)?'hotel':/cafe|café/.test(text)?'cafe':/lobby/.test(text)?'lobby':/kitchen|buffet|service/.test(text)?'service':'restaurant';
  } else if (/retail|checkout|cashier|display rack|shop|mall|supermarket|gondola/.test(text)) {
    category='retail'; subcategory=/checkout|cashier/.test(text)?'checkout':/storage|shel/.test(text)?'storage':/customer/.test(text)?'customer':'display';
  } else if (['outdoor','transport','landscape','leisure'].includes(legacyCategory)) {
    category='outdoor'; subcategory=/parking|bay|car|bus|ambulance|vehicle|ev-/.test(text)?'parking':/tree|hedge|plant|garden|landscape/.test(text)?'landscape':/bench|bollard|bin|street/.test(text)?'street-furniture':'recreation';
  } else if (legacyCategory==='office' || legacyCategory==='commercial') {
    subcategory=/meeting|conference/.test(text)?'meeting':/reception/.test(text)?'reception':/collaborative/.test(text)?'collaborative':'office';
  }
  if (/wheelchair|turning circle|accessible clearance/.test(text) && category !== 'healthcare') {category='accessibility';subcategory=/clearance|circle/.test(text)?'clearance':'mobility';}
  const accessible = /ada|accessible|wheelchair|turning/.test(text);
  const tags = new Set([category, subcategory, legacyCategory, record.type, ...(record.tags || []), ...text.replace(/[^a-z0-9]+/g,' ').split(' ').filter(t=>t.length>2)]);
  if(category==='healthcare') {tags.add('hospital');tags.add('clinic');}
  if(category==='education') {tags.add('school');tags.add('university');}
  if(category==='civic') tags.add('public');
  if(/seating|chair|sofa|bench/.test(text)) tags.add('seating');
  if(/desk/.test(text) && category==='civic') tags.add('police');
  return Object.freeze({...record,legacyCategory,category,subcategory,tags:Object.freeze([...tags].filter(Boolean)),
    dimensionSourceType: accessible ? 'accessibility-guideline' : 'typical-reference',
    dimensionSource: { origin:'Existing planning reference library', verified:false, note: accessible ? 'Accessibility planning reference; verify the applicable local standard, clear space and manufacturer.' : 'Typical planning footprint, not a verified manufacturer model or jurisdictional requirement.' }});
}
