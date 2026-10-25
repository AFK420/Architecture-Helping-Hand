import { buildDXF, buildMultiBlockDXF } from './export/export-model.js';
import { buildObjectGeometry } from './furniture/geometry-registry.js';
import { resolveObjectDimensions } from './furniture/scaling.js';
import { buildFrontElevation, buildSideElevation } from './furniture/projections.js';

/** Standard CAD insertion basepoint by architectural mounting type. */
export function resolveCadBasePoint(item, w, d) {
  const id = String(item.id || '').toLowerCase();
  const sub = String(item.subcategory || '').toLowerCase();
  // Wall-hosted fixtures: insertion basepoint on the wall face centerline
  if (id.includes('wall') || id.includes('vanity') || id.includes('urinal') || id.includes('basin') || sub.includes('sanitary') || id.includes('cabinet') || id.includes('shelf')) {
    return [w / 2, 0];
  }
  // Doors & windows: hinge/jamb corner insertion point (0, 0)
  if (id.startsWith('door-') || id.startsWith('window-') || sub.includes('doors') || sub.includes('openings')) {
    return [0, 0];
  }
  // Center-pivot elements: trees, circular shades, bollards, poles
  if (id.startsWith('tree-') || id.includes('bollard') || id.includes('fountain') || id.includes('mast') || id.includes('round')) {
    return [w / 2, d / 2];
  }
  // Standard freestanding CAD block origin (bottom-left)
  return [0, 0];
}

/** Generate regulatory code & accessibility clearances on A-CLEARANCE layer. */
export function buildClearanceGeometry(item, w, d) {
  const clearances = [];
  const id = String(item.id || '').toLowerCase();
  const sub = String(item.subcategory || '').toLowerCase();
  const cat = String(item.category || '').toLowerCase();

  // 1. Explicit user/item clearance attribute (converted from cm to meters)
  const c = Number.isFinite(item.clearance) && item.clearance > 0 ? item.clearance / 100 : 0;
  if (c > 0) {
    clearances.push({
      type: 'polyline',
      closed: true,
      layer: 'A-CLEARANCE',
      points: [[-c, -c], [w + c, -c], [w + c, d + c], [-c, d + c]]
    });
  }

  // 2. Restrooms, Stalls & ADA Accessible Fixtures
  if (id.includes('toilet') || id.includes('stall') || id.includes('ada') || sub.includes('sanitary') || id.includes('shampoo')) {
    if (id.includes('ada') || id.includes('accessible')) {
      // ADA 304 60-inch (1500mm = 1.5m) turning radius clearance circle
      clearances.push({
        type: 'circle',
        x: w / 2,
        y: d / 2,
        r: 0.75,
        layer: 'A-CLEARANCE'
      });
      // ADA 604.2 Water Closet clear transfer floor space (1525mm W x 1420mm D)
      clearances.push({
        type: 'polyline',
        closed: true,
        layer: 'A-CLEARANCE',
        points: [[0, 0], [1.525, 0], [1.525, 1.42], [0, 1.42]]
      });
    } else if (id.includes('toilet') || id.includes('stall')) {
      // Standard commercial stall approach clearance: 760mm (0.76m) in front of fixture
      clearances.push({
        type: 'polyline',
        closed: true,
        layer: 'A-CLEARANCE',
        points: [[0, d], [w, d], [w, d + 0.76], [0, d + 0.76]]
      });
    }
  } else if (id.startsWith('door-') || sub.includes('doors') || sub.includes('openings')) {
    // 3. Doors (ADA 404 Maneuvering Clearance boxes)
    // Pull side approach box: (w + 0.45m latch clearance) x 1.50m perpendicular depth
    clearances.push({
      type: 'polyline',
      closed: true,
      layer: 'A-CLEARANCE',
      points: [[0, 0], [w + 0.45, 0], [w + 0.45, 1.50], [0, 1.50]]
    });
    // Push side approach box: (w + 0.30m) x 1.20m perpendicular depth
    clearances.push({
      type: 'polyline',
      closed: true,
      layer: 'A-CLEARANCE',
      points: [[0, 0], [w + 0.30, 0], [w + 0.30, -1.20], [0, -1.20]]
    });
  } else if (cat === 'workplace' || id.includes('desk') || id.includes('workstation')) {
    // 4. Workplace Desks / Workstations: 1000mm (1.0m) chair roll-out and circulation aisle
    clearances.push({
      type: 'polyline',
      closed: true,
      layer: 'A-CLEARANCE',
      points: [[0, d], [w, d], [w, d + 1.0], [0, d + 1.0]]
    });
  } else if (cat === 'kitchen' || id.includes('kitchen') || id.includes('range') || id.includes('cooktop') || id.includes('fryer') || id.includes('oven')) {
    // 5. Commercial Kitchen & Cooking Appliances: 1050mm (1.05m) cook aisle clearance
    clearances.push({
      type: 'polyline',
      closed: true,
      layer: 'A-CLEARANCE',
      points: [[0, d], [w, d], [w, d + 1.05], [0, d + 1.05]]
    });
  }

  return clearances;
}

/** Recognizable, simplified top views. Coordinates are always real meters. */
export function createFurnitureAsset(item, options = {}) {
  if (!item || !Number.isFinite(item.wCm) || !Number.isFinite(item.dCm) || item.wCm<=0 || item.dCm<=0) throw new Error('Furniture needs positive, finite width and depth.');
  const dimensions=resolveObjectDimensions(item,options),w=dimensions.widthMm/1000,d=dimensions.depthMm/1000;
  const h=dimensions.heightMm==null?null:dimensions.heightMm/1000;
  const geometry=buildObjectGeometry(item.geometryId || 'object:'+item.id,w,d);
  const frontGeometry = buildFrontElevation(item, w, d, h);
  const sideGeometry = buildSideElevation(item, w, d, h);
  const clearanceGeometry = buildClearanceGeometry(item, w, d);
  const basePoint = resolveCadBasePoint(item, w, d);
  return {id:item.id,name:item.name,category:item.category,subcategory:item.subcategory,tags:item.tags||[],geometryId:item.geometryId||'object:'+item.id,
    width:w,depth:d,height:h,dimensions,basePoint,description:item.desc,dimensionSourceType:dimensions.modified?'user-defined':item.dimensionSourceType||'user-defined',
    planGeometry:geometry,frontGeometry,sideGeometry,clearanceGeometry,
    cadMetadata:{units:'m',exportUnits:'mm',scale:1,origin:basePoint,basePoint,clearanceNote:'Reference planning allowance, not a certified access zone.',resizeNote:dimensions.modified?'Edited schematic footprint; verify functional details.':''},includeClearance:!!options.includeClearance};
}

export function furnitureAssetDXF(asset, { includeClearance = asset.includeClearance, asBlock = false, view = 'plan' } = {}) {
  const suffix = view === 'front' ? '_FRONT' : view === 'side' ? '_SIDE' : '';
  const blockName = 'AHH_' + String(asset.id || 'OBJECT').toUpperCase().replace(/[^A-Za-z0-9_]/g, '_') + suffix;
  const baseEntities = view === 'front' ? (asset.frontGeometry || asset.planGeometry)
                     : view === 'side'  ? (asset.sideGeometry  || asset.planGeometry)
                     : asset.planGeometry;
  const clr = (includeClearance && view === 'plan') ? asset.clearanceGeometry : [];
  return buildDXF([...baseEntities, ...clr], {
    scale: 1000,
    blockName,
    asBlock,
    basePoint: view === 'plan' ? (asset.basePoint || [0, 0]) : [0, 0]
  });
}

/**
 * Exports multiple furniture assets as a unified AutoCAD Tool Palette sheet (.dxf).
 * Organizes each block into a labeled grid in Model Space with true BLOCK definitions.
 */
export function categoryToToolPaletteDXF(items, options = {}) {
  const assets = items.map(item => {
    const a = createFurnitureAsset(item, { includeClearance: options.includeClearance });
    return {
      id: a.id,
      name: a.name,
      dimensions: a.dimensions,
      entities: [...a.planGeometry, ...(options.includeClearance ? a.clearanceGeometry : [])],
      basePoint: a.basePoint
    };
  });
  return buildMultiBlockDXF(assets, options);
}

export function furnitureAssetSVG(asset, { includeClearance = asset.includeClearance, view = 'plan' } = {}) {
  const baseEntities = view === 'front' ? (asset.frontGeometry || asset.planGeometry)
                     : view === 'side'  ? (asset.sideGeometry  || asset.planGeometry)
                     : asset.planGeometry;
  const clr = (includeClearance && view === 'plan') ? asset.clearanceGeometry : [];
  const entities = [...baseEntities, ...clr];
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
  const labelSuffix = view === 'front' ? ' front elevation' : view === 'side' ? ' side elevation' : ' top view';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="${n(minX)} ${-n(maxY)} ${W} ${H}" role="img" aria-label="${safe(asset.name)}${labelSuffix}"><title>${safe(asset.name)} — real size, millimeters</title><g transform="scale(1,-1)" fill="none" stroke="currentColor" stroke-width="${Math.max(2,Math.min(W,H)*.006)}">${marks}</g></svg>`;
}
