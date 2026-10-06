import { OBJECT_GEOMETRY_BINDINGS } from './geometry-bindings.js';
import { RESIDENTIAL_GEOMETRY } from './geometry/residential.js';
import { LUXURY_GEOMETRY } from './geometry/luxury.js';
import { HEALTHCARE_GEOMETRY } from './geometry/healthcare.js';
import { LANDSCAPE_GEOMETRY } from './geometry/landscape.js';
import { STREETS_GEOMETRY } from './geometry/streets.js';
import { INSTITUTIONAL_GEOMETRY } from './geometry/institutional.js';
import { SPORTS_GEOMETRY } from './geometry/sports.js';
import { SPECIALIST_GEOMETRY } from './geometry/specialist.js';
import { objectLayout } from './geometry/primitives.js';

export const OBJECT_GEOMETRY_FAMILIES = Object.freeze({...RESIDENTIAL_GEOMETRY,...LUXURY_GEOMETRY,...HEALTHCARE_GEOMETRY,...LANDSCAPE_GEOMETRY,...STREETS_GEOMETRY,...INSTITUTIONAL_GEOMETRY,...SPORTS_GEOMETRY,...SPECIALIST_GEOMETRY});

export function getObjectGeometryDefinition(geometryId) {
  const id=String(geometryId||'').replace(/^object:/,''),binding=OBJECT_GEOMETRY_BINDINGS[id];
  if (!binding) return null;
  const renderer=OBJECT_GEOMETRY_FAMILIES[binding.family];
  if (!renderer) throw new Error('Geometry composition is not registered: '+binding.family);
  return {...binding,render:()=>{
    const shape=renderer(binding.options);
    const layout=binding.layout;
    return layout?objectLayout(Array.from({length:layout.rows*layout.columns},(_,n)=>({geometry:shape,x:(n%layout.columns)/layout.columns,y:Math.floor(n/layout.columns)/layout.rows,w:.96/layout.columns,h:.96/layout.rows}))):shape;
  }};
}

export function geometryCoordinates(entities) {
  return entities.flatMap(e=>e.type==='polyline'?e.points:[[e.x1,e.y1],[e.x2,e.y2]]);
}

export function objectGeometryBounds(entities) {
  const points=geometryCoordinates(entities);
  if(!points.length||points.some(p=>p.some(v=>!Number.isFinite(v))))throw new Error('Object geometry is empty or invalid.');
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return {minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)};
}

export function buildObjectGeometry(geometryId,width,depth) {
  const definition=getObjectGeometryDefinition(geometryId);
  if(!definition)throw new Error('Official object has no registered geometry: '+geometryId);
  const shape=definition.render(),b=objectGeometryBounds(shape);
  const sx=width/(b.maxX-b.minX),sy=depth/(b.maxY-b.minY);
  if(!Number.isFinite(sx)||!Number.isFinite(sy))throw new Error('Object geometry has no physical extent.');
  return objectLayout([{geometry:shape,x:-b.minX*sx,y:-b.minY*sy,w:sx,h:sy}]);
}
