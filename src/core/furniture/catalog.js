import {FURNITURE_DATABASE} from '../furniture.js';
import {createFurnitureAsset} from '../furniture-assets.js';

let objectBrowseCatalog=null;
/** Preserve reference IDs, but browse identical plan symbols once with their aliases. */
export function getObjectBrowseCatalog() {
  if(objectBrowseCatalog)return objectBrowseCatalog;
  const groups=new Map();
  for(const item of FURNITURE_DATABASE){
    const signature=JSON.stringify(createFurnitureAsset(item).planGeometry);
    const group=groups.get(signature)||[];group.push(item);groups.set(signature,group);
  }
  objectBrowseCatalog=Object.freeze([...groups.values()].map(group=>{
    const first=group[0];
    return Object.freeze({...first,aliases:group.slice(1).map(i=>({id:i.id,name:i.name,heightMm:i.hCm?i.hCm*10:null})),
      searchAliases:group.slice(1).map(i=>`${i.name} ${i.desc}`).join(' '),
      collections:[...new Set(group.flatMap(i=>i.collections))],collectionText:group.map(i=>i.collectionText).join(' '),
      tags:[...new Set(group.flatMap(i=>i.tags))]});
  }));
  return objectBrowseCatalog;
}
