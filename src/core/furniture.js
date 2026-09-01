/**
 * Architecture Helping Hand - Furniture & Fixtures Database & Visualizer
 */

import { scaleDimension } from './calculator.js';
import { UNITS, requireUnit } from './units.js';
import { formatNumber, formatFeetInches } from './formatter.js';

export const FURNITURE_DATABASE = Object.freeze([
  // LIVING ROOM
  { id: 'sofa-3p', name: '3-Seater Sofa', category: 'living', wCm: 220, dCm: 90, hCm: 85, desc: 'Standard 3-person living room sofa', type: 'sofa' },
  { id: 'sofa-2p', name: '2-Seater Loveseat', category: 'living', wCm: 160, dCm: 90, hCm: 85, desc: 'Compact 2-person sofa', type: 'sofa' },
  { id: 'sofa-l', name: 'L-Shaped Sectional Sofa', category: 'living', wCm: 260, dCm: 160, hCm: 85, desc: 'Corner modular sectional with chaise', type: 'sectional' },
  { id: 'armchair', name: 'Armchair / Lounge Chair', category: 'living', wCm: 85, dCm: 85, hCm: 85, desc: 'Single accent / reading chair', type: 'chair' },
  { id: 'recliner', name: 'Recliner Chair', category: 'living', wCm: 90, dCm: 95, hCm: 100, desc: 'Single reclining comfort lounge chair', type: 'chair' },
  { id: 'coffee-rect', name: 'Coffee Table (Rectangular)', category: 'living', wCm: 120, dCm: 60, hCm: 45, desc: 'Standard living room central coffee table', type: 'table' },
  { id: 'coffee-round', name: 'Coffee Table (Round Ø90cm)', category: 'living', wCm: 90, dCm: 90, hCm: 45, desc: 'Circular low coffee table', type: 'table_round' },
  { id: 'side-table', name: 'Side / End Table', category: 'living', wCm: 50, dCm: 50, hCm: 55, desc: 'Couch side table for lamp or drinks', type: 'table' },
  { id: 'tv-console', name: 'TV Unit / Media Console', category: 'living', wCm: 180, dCm: 45, hCm: 50, desc: 'Low media unit for 55"-75" screens', type: 'storage' },
  { id: 'bookshelf-living', name: 'Bookshelf Unit', category: 'living', wCm: 100, dCm: 35, hCm: 200, desc: '5-shelf tall living display unit', type: 'storage' },

  // BEDROOM
  { id: 'bed-king', name: 'King Bed (180 × 200)', category: 'bedroom', wCm: 180, dCm: 200, hCm: 110, desc: 'Standard European / UK King size bed (6\'0" × 6\'8")', type: 'bed' },
  { id: 'bed-queen', name: 'Queen Bed (150 × 200)', category: 'bedroom', wCm: 150, dCm: 200, hCm: 110, desc: 'Standard Queen / Double bed (5\'0" × 6\'8")', type: 'bed' },
  { id: 'bed-double', name: 'Double / Full Bed (135 × 190)', category: 'bedroom', wCm: 135, dCm: 190, hCm: 100, desc: 'Full double bed (4\'6" × 6\'3")', type: 'bed' },
  { id: 'bed-single', name: 'Single / Twin Bed (90 × 190)', category: 'bedroom', wCm: 90, dCm: 190, hCm: 90, desc: 'Single / Twin bedroom layout (3\'0" × 6\'3")', type: 'bed_single' },
  { id: 'bed-bunk', name: 'Bunk Bed (90 × 190)', category: 'bedroom', wCm: 90, dCm: 190, hCm: 165, desc: 'Two-tier vertical bunk bed', type: 'bed_single' },
  { id: 'nightstand', name: 'Nightstand / Bedside Table', category: 'bedroom', wCm: 50, dCm: 40, hCm: 55, desc: 'Bedside drawer unit with clearance', type: 'table' },
  { id: 'wardrobe-2d', name: 'Wardrobe (2-Door Closet)', category: 'bedroom', wCm: 120, dCm: 60, hCm: 210, desc: 'Standard 2-door hinged/sliding clothes wardrobe', type: 'storage' },
  { id: 'wardrobe-3d', name: 'Wardrobe (3-Door Closet)', category: 'bedroom', wCm: 180, dCm: 60, hCm: 210, desc: 'Full master bedroom 3-door wardrobe', type: 'storage' },
  { id: 'dresser', name: 'Chest of Drawers / Dresser', category: 'bedroom', wCm: 100, dCm: 50, hCm: 90, desc: '4-drawer bedroom storage chest', type: 'storage' },
  { id: 'vanity-dressing', name: 'Dressing Table & Mirror', category: 'bedroom', wCm: 110, dCm: 45, hCm: 75, desc: 'Bedroom makeup/dressing table with stool', type: 'table' },

  // DINING
  { id: 'dining-4p-sq', name: 'Dining Table 4-Person (Square)', category: 'dining', wCm: 90, dCm: 90, hCm: 75, desc: 'Compact square 4-seater dining table', type: 'table' },
  { id: 'dining-4p-round', name: 'Dining Table 4-Person (Round Ø105cm)', category: 'dining', wCm: 105, dCm: 105, hCm: 75, desc: 'Circular 4-seater dining table', type: 'table_round' },
  { id: 'dining-6p-rect', name: 'Dining Table 6-Person (Rectangular)', category: 'dining', wCm: 160, dCm: 90, hCm: 75, desc: 'Standard 6-seater family dining table', type: 'table' },
  { id: 'dining-6p-round', name: 'Dining Table 6-Person (Round Ø140cm)', category: 'dining', wCm: 140, dCm: 140, hCm: 75, desc: 'Spacious circular dining table', type: 'table_round' },
  { id: 'dining-8p-rect', name: 'Dining Table 8-Person', category: 'dining', wCm: 220, dCm: 100, hCm: 75, desc: 'Large 8-seater entertaining dining table', type: 'table' },
  { id: 'dining-10p-rect', name: 'Dining Table 10-Person', category: 'dining', wCm: 280, dCm: 110, hCm: 75, desc: 'Formal 10-seater banquet dining table', type: 'table' },
  { id: 'dining-chair', name: 'Dining Chair', category: 'dining', wCm: 45, dCm: 50, hCm: 85, desc: 'Standard dining seat with backrest', type: 'chair_small' },
  { id: 'bar-stool', name: 'Kitchen Counter Bar Stool', category: 'dining', wCm: 40, dCm: 40, hCm: 95, desc: 'High counter / breakfast bar stool', type: 'chair_round' },
  { id: 'sideboard', name: 'Sideboard / Buffet Credenza', category: 'dining', wCm: 160, dCm: 45, hCm: 85, desc: 'Dining room crockery & serving sideboard', type: 'storage' },

  // KITCHEN & UTILITY
  { id: 'counter-base', name: 'Kitchen Base Counter (per 60cm module)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 90, desc: 'Standard 600mm modular kitchen countertop unit', type: 'counter' },
  { id: 'kitchen-island', name: 'Kitchen Island with Breakfast Bar', category: 'kitchen', wCm: 180, dCm: 90, hCm: 90, desc: 'Freestanding kitchen prep & dining island', type: 'counter' },
  { id: 'sink-single', name: 'Kitchen Sink (Single Bowl + Drainer)', category: 'kitchen', wCm: 85, dCm: 50, hCm: 20, desc: 'Standard stainless / composite kitchen sink unit', type: 'sink' },
  { id: 'sink-double', name: 'Kitchen Sink (Double Bowl)', category: 'kitchen', wCm: 100, dCm: 50, hCm: 20, desc: 'Twin bowl prep and wash kitchen sink', type: 'sink' },
  { id: 'cooktop-4b', name: '4-Burner Gas/Induction Cooktop', category: 'kitchen', wCm: 60, dCm: 60, hCm: 10, desc: 'Standard 60cm 4-zone cooking hob', type: 'cooktop' },
  { id: 'cooktop-5b', name: '5-Burner Wide Cooktop / Range', category: 'kitchen', wCm: 90, dCm: 60, hCm: 10, desc: 'Wide 90cm culinary gas/induction hob', type: 'cooktop' },
  { id: 'fridge-single', name: 'Single-Door Refrigerator', category: 'kitchen', wCm: 70, dCm: 70, hCm: 180, desc: 'Standard single-column tall fridge freezer', type: 'fridge' },
  { id: 'fridge-double', name: 'French Door Double Refrigerator', category: 'kitchen', wCm: 90, dCm: 80, hCm: 185, desc: 'Side-by-side American style fridge freezer', type: 'fridge' },
  { id: 'dishwasher', name: 'Dishwasher (Built-in / Freestanding)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 85, desc: 'Standard 60cm full-size dishwasher', type: 'appliance' },
  { id: 'washing-machine', name: 'Washing Machine / Dryer Unit', category: 'kitchen', wCm: 60, dCm: 60, hCm: 85, desc: 'Front-loading laundry appliance', type: 'appliance' },

  // BATHROOM & FIXTURES
  { id: 'toilet-std', name: 'Standard Toilet / Water Closet (WC)', category: 'bathroom', wCm: 40, dCm: 70, hCm: 75, desc: 'Floor-mounted close-coupled WC cistern & bowl', type: 'toilet' },
  { id: 'toilet-wall', name: 'Wall-Hung Concealed Cistern Toilet', category: 'bathroom', wCm: 38, dCm: 55, hCm: 40, desc: 'Modern wall-hung WC pan (excludes hidden cistern)', type: 'toilet' },
  { id: 'vanity-single', name: 'Single Basin Bathroom Vanity', category: 'bathroom', wCm: 60, dCm: 48, hCm: 85, desc: 'Standard single washbasin and under-sink cabinet', type: 'vanity' },
  { id: 'vanity-double', name: 'Double Basin Vanity Unit', category: 'bathroom', wCm: 120, dCm: 52, hCm: 85, desc: 'Master bathroom double vanity with two basins', type: 'vanity' },
  { id: 'bathtub-std', name: 'Standard Inset Bathtub', category: 'bathroom', wCm: 170, dCm: 75, hCm: 55, desc: 'Standard alcove/inset acrylic soaking tub', type: 'bath' },
  { id: 'bathtub-free', name: 'Freestanding Oval Bathtub', category: 'bathroom', wCm: 180, dCm: 80, hCm: 60, desc: 'Luxury standalone oval architectural bathtub', type: 'bath' },
  { id: 'shower-corner', name: 'Corner Shower Enclosure (90 × 90)', category: 'bathroom', wCm: 90, dCm: 90, hCm: 200, desc: 'Square corner glass shower cubicle', type: 'shower' },
  { id: 'shower-walkin', name: 'Walk-In Shower Zone (120 × 90)', category: 'bathroom', wCm: 120, dCm: 90, hCm: 200, desc: 'Spacious wetroom walk-in shower with screen', type: 'shower' },
  { id: 'bidet', name: 'Bathroom Bidet', category: 'bathroom', wCm: 38, dCm: 55, hCm: 40, desc: 'Floor or wall-mounted sanitary bidet unit', type: 'toilet' },

  // OFFICE & WORKSPACE
  { id: 'desk-std', name: 'Standard Workstation Desk', category: 'office', wCm: 140, dCm: 70, hCm: 75, desc: 'Single worker office desk with cable management', type: 'table' },
  { id: 'desk-exec', name: 'Executive Director Desk', category: 'office', wCm: 180, dCm: 90, hCm: 75, desc: 'Large executive office desk', type: 'table' },
  { id: 'desk-corner', name: 'L-Shaped Corner Desk', category: 'office', wCm: 160, dCm: 160, hCm: 75, desc: 'Corner modular dual-surface workstation', type: 'sectional' },
  { id: 'office-chair', name: 'Ergonomic Task Swivel Chair', category: 'office', wCm: 65, dCm: 65, hCm: 95, desc: '5-star wheeled ergonomic office chair space', type: 'chair_round' },
  { id: 'conf-8p', name: 'Conference Table (8-Person)', category: 'office', wCm: 240, dCm: 110, hCm: 75, desc: 'Boardroom meeting table for 8 chairs', type: 'table' },
  { id: 'conf-12p', name: 'Conference Table (12-Person)', category: 'office', wCm: 360, dCm: 120, hCm: 75, desc: 'Large meeting room executive table', type: 'table' },
  { id: 'file-cabinet', name: 'Filing Cabinet (4-Drawer)', category: 'office', wCm: 45, dCm: 60, hCm: 130, desc: 'Vertical document storage cabinet', type: 'storage' },

  // DOORS, CLEARANCES & ACCESS
  { id: 'door-800', name: 'Standard Interior Door (800mm)', category: 'doors', wCm: 80, dCm: 10, hCm: 210, desc: 'Standard bedroom / bathroom single hinged door', type: 'door' },
  { id: 'door-900', name: 'Main Entrance Door (900mm)', category: 'doors', wCm: 90, dCm: 10, hCm: 210, desc: 'Primary front entrance single leaf door', type: 'door' },
  { id: 'door-double', name: 'Double French Doors (1600mm)', category: 'doors', wCm: 160, dCm: 10, hCm: 210, desc: 'Double leaf swinging doors for living or balcony', type: 'door_double' },
  { id: 'door-sliding', name: 'Sliding Patio Door (1800mm)', category: 'doors', wCm: 180, dCm: 12, hCm: 210, desc: '2-panel glazed sliding patio door system', type: 'door_sliding' },
  { id: 'clearance-hall', name: 'Standard Walkway Clearance', category: 'doors', wCm: 90, dCm: 90, hCm: 240, desc: 'Minimum residential corridor clearance (900mm)', type: 'clearance' },
  { id: 'clearance-wheelchair', name: 'Accessible Corridor Clearance', category: 'doors', wCm: 120, dCm: 120, hCm: 240, desc: 'ADA / Universal wheelchair turning span (1200mm)', type: 'clearance' }
]);

/**
 * Calculate scaled dimensions for a furniture piece using the central calculator engine
 */
export function getScaledFurnitureDimensions(item, ratio = 50, paperUnitKey = 'cm') {
  const paperUnit = requireUnit(paperUnitKey, 'length');

  const wRes = scaleDimension({
    value: item.wCm,
    unitKey: 'cm',
    ratio: ratio,
    direction: 'real_to_drawing',
    targetUnitKey: paperUnitKey
  });

  const dRes = scaleDimension({
    value: item.dCm,
    unitKey: 'cm',
    ratio: ratio,
    direction: 'real_to_drawing',
    targetUnitKey: paperUnitKey
  });

  const impW = formatFeetInches(wRes.realMeters / UNITS.in.toMeters);
  const impD = formatFeetInches(dRes.realMeters / UNITS.in.toMeters);

  return {
    item: item,
    ratio: ratio,
    paperUnit: paperUnit,
    paperWidth: wRes.value,
    paperDepth: dRes.value,
    paperFormatted: `${formatNumber(wRes.value, 2)} × ${formatNumber(dRes.value, 2)} ${paperUnit.symbol}`,
    realFormattedMetric: item.hCm ? `${item.wCm} × ${item.dCm} × ${item.hCm} cm` : `${item.wCm} × ${item.dCm} cm`,
    realFormattedImperial: `${impW} × ${impD}`
  };
}

/**
 * Filter furniture catalog by search term and category
 */
export function filterFurnitureCatalog(items, query = '', category = 'all') {
  const cleanQuery = query ? query.trim().toLowerCase() : '';

  return items.filter(item => {
    const matchCat = category === 'all' || item.category === category;
    const matchQuery = !cleanQuery ||
      item.name.toLowerCase().includes(cleanQuery) ||
      item.desc.toLowerCase().includes(cleanQuery) ||
      item.category.toLowerCase().includes(cleanQuery);
    return matchCat && matchQuery;
  });
}
