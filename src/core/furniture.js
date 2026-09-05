/**
 * Architecture Helping Hand - Comprehensive Furniture, Fixtures & Standards Library
 * 215 verified architectural standard dimensions across 9 categories spanning residential, commercial,
 * sanitary, circulation, clearances, outdoor, fitness, and accessibility domains.
 */

import { scaleDimension } from './calculator.js';
import { UNITS, requireUnit } from './units.js';
import { formatNumber, formatFeetInches } from './formatter.js';

export const FURNITURE_DATABASE = Object.freeze([
  // =========================================================================
  // 1. LIVING ROOM & ENTERTAINMENT (23 Items)
  // =========================================================================
  { id: 'sofa-3p', name: '3-Seater Sofa', category: 'living', wCm: 220, dCm: 90, hCm: 85, desc: 'Standard 3-person living room sofa', type: 'sofa' },
  { id: 'sofa-2p', name: '2-Seater Loveseat', category: 'living', wCm: 160, dCm: 90, hCm: 85, desc: 'Compact 2-person sofa for apartments & dens', type: 'sofa' },
  { id: 'sofa-4p', name: '4-Seater Large Sofa', category: 'living', wCm: 260, dCm: 95, hCm: 85, desc: 'Extended 4-person living room family sofa', type: 'sofa' },
  { id: 'sofa-l', name: 'L-Shaped Sectional Sofa', category: 'living', wCm: 260, dCm: 160, hCm: 85, desc: 'Corner modular sectional with chaise lounge', type: 'sectional' },
  { id: 'sofa-u', name: 'U-Shaped Modular Sectional', category: 'living', wCm: 340, dCm: 200, hCm: 85, desc: 'Large U-shaped central family sectional', type: 'sectional' },
  { id: 'sofa-chesterfield', name: 'Chesterfield Deep Sofa', category: 'living', wCm: 230, dCm: 100, hCm: 78, desc: 'Classic tufted deep-seat lounge sofa', type: 'sofa' },
  { id: 'chaise-lounge', name: 'Chaise Lounge / Daybed', category: 'living', wCm: 170, dCm: 75, hCm: 80, desc: 'Single reclining upholstered lounge chaise', type: 'chair' },
  { id: 'armchair', name: 'Armchair / Lounge Chair', category: 'living', wCm: 85, dCm: 85, hCm: 85, desc: 'Single accent / reading club chair', type: 'chair' },
  { id: 'recliner', name: 'Recliner Chair', category: 'living', wCm: 90, dCm: 95, hCm: 100, desc: 'Single reclining comfort lounge armchair', type: 'chair' },
  { id: 'wingback-chair', name: 'Wingback Accent Chair', category: 'living', wCm: 80, dCm: 85, hCm: 110, desc: 'High-back traditional reading armchair', type: 'chair' },
  { id: 'ottoman-rect', name: 'Storage Ottoman (Rectangular)', category: 'living', wCm: 100, dCm: 50, hCm: 45, desc: 'Upholstered footrest with interior storage', type: 'table' },
  { id: 'pouf-round', name: 'Round Accent Pouf (Ø50cm)', category: 'living', wCm: 50, dCm: 50, hCm: 40, desc: 'Circular soft seating pouf / footstool', type: 'chair_round' },
  { id: 'coffee-rect', name: 'Coffee Table (Rectangular 120×60)', category: 'living', wCm: 120, dCm: 60, hCm: 45, desc: 'Standard living room central coffee table', type: 'table' },
  { id: 'coffee-square', name: 'Coffee Table (Square 90×90)', category: 'living', wCm: 90, dCm: 90, hCm: 45, desc: 'Square central coffee table', type: 'table' },
  { id: 'coffee-round', name: 'Coffee Table (Round Ø90cm)', category: 'living', wCm: 90, dCm: 90, hCm: 45, desc: 'Circular low coffee table', type: 'table_round' },
  { id: 'coffee-nesting', name: 'Nesting Coffee Tables (Set of 2)', category: 'living', wCm: 110, dCm: 65, hCm: 48, desc: 'Dual overlapping modular nesting tables', type: 'table' },
  { id: 'side-table', name: 'Side / End Table', category: 'living', wCm: 50, dCm: 50, hCm: 55, desc: 'Sofa side table for table lamps or drinks', type: 'table' },
  { id: 'console-table', name: 'Entryway / Sofa Console Table', category: 'living', wCm: 120, dCm: 35, hCm: 78, desc: 'Narrow hallway / behind-sofa console table', type: 'table' },
  { id: 'tv-console-180', name: 'TV Media Unit (180cm)', category: 'living', wCm: 180, dCm: 45, hCm: 50, desc: 'Low media sideboard for 55"-70" screens', type: 'storage' },
  { id: 'tv-console-240', name: 'TV Media Wall Unit (240cm)', category: 'living', wCm: 240, dCm: 48, hCm: 55, desc: 'Large credenza for 75"+ ultra-wide home cinema', type: 'storage' },
  { id: 'bookshelf-living', name: 'Bookshelf Display Unit', category: 'living', wCm: 100, dCm: 35, hCm: 200, desc: '5-shelf tall living display storage unit', type: 'storage' },
  { id: 'fireplace-hearth', name: 'Fireplace & Mantel Hearth', category: 'living', wCm: 140, dCm: 45, hCm: 110, desc: 'Living room architectural fireplace surround', type: 'structure' },
  { id: 'grand-piano', name: 'Grand Piano (Baby / Salon)', category: 'living', wCm: 150, dCm: 170, hCm: 102, desc: 'Acoustic baby grand piano floor footprint', type: 'instrument' },

  // =========================================================================
  // 2. BEDROOM & WARDROBE (20 Items)
  // =========================================================================
  { id: 'bed-super-king', name: 'Super King / Cal King Bed (200×200)', category: 'bedroom', wCm: 200, dCm: 200, hCm: 115, desc: 'Luxury Super King size bed (6\'6" × 6\'6")', type: 'bed' },
  { id: 'bed-king', name: 'King Bed (180 × 200)', category: 'bedroom', wCm: 180, dCm: 200, hCm: 110, desc: 'Standard European / UK King size bed (6\'0" × 6\'8")', type: 'bed' },
  { id: 'bed-queen', name: 'Queen Bed (150 × 200)', category: 'bedroom', wCm: 150, dCm: 200, hCm: 110, desc: 'Standard Queen / Double bed (5\'0" × 6\'8")', type: 'bed' },
  { id: 'bed-double', name: 'Double / Full Bed (135 × 190)', category: 'bedroom', wCm: 135, dCm: 190, hCm: 100, desc: 'Full double bed (4\'6" × 6\'3")', type: 'bed' },
  { id: 'bed-twin-xl', name: 'Twin XL Bed (100 × 200)', category: 'bedroom', wCm: 100, dCm: 200, hCm: 90, desc: 'Extended single bed for tall individuals / dorms', type: 'bed_single' },
  { id: 'bed-single', name: 'Single / Twin Bed (90 × 190)', category: 'bedroom', wCm: 90, dCm: 190, hCm: 90, desc: 'Single / Twin bedroom layout (3\'0" × 6\'3")', type: 'bed_single' },
  { id: 'bed-bunk', name: 'Bunk Bed (90 × 190)', category: 'bedroom', wCm: 90, dCm: 190, hCm: 165, desc: 'Two-tier vertical bunk bed frame', type: 'bed_single' },
  { id: 'bed-trundle', name: 'Daybed with Pop-up Trundle', category: 'bedroom', wCm: 100, dCm: 200, hCm: 85, desc: 'Pull-out secondary guest sleeping unit', type: 'bed_single' },
  { id: 'crib-baby', name: 'Baby Crib / Cot (70 × 140)', category: 'bedroom', wCm: 75, dCm: 145, hCm: 90, desc: 'Standard infant nursery crib with slatted rails', type: 'bed_small' },
  { id: 'bed-toddler', name: 'Toddler Junior Bed (80 × 160)', category: 'bedroom', wCm: 85, dCm: 165, hCm: 70, desc: 'Junior child bed with low safety rails', type: 'bed_small' },
  { id: 'nightstand', name: 'Nightstand / Bedside Table', category: 'bedroom', wCm: 50, dCm: 40, hCm: 55, desc: 'Bedside drawer unit with surface clearance', type: 'table' },
  { id: 'nightstand-wide', name: 'Wide Bedside Chest (65cm)', category: 'bedroom', wCm: 65, dCm: 45, hCm: 60, desc: 'Generous 2-drawer master bedside nightstand', type: 'table' },
  { id: 'wardrobe-2d', name: 'Wardrobe (2-Door Closet 120cm)', category: 'bedroom', wCm: 120, dCm: 60, hCm: 210, desc: 'Standard 2-door hinged/sliding clothes wardrobe', type: 'storage' },
  { id: 'wardrobe-3d', name: 'Wardrobe (3-Door Closet 180cm)', category: 'bedroom', wCm: 180, dCm: 60, hCm: 210, desc: 'Full master bedroom 3-door wardrobe unit', type: 'storage' },
  { id: 'wardrobe-4d', name: 'Wardrobe (4-Door Master 240cm)', category: 'bedroom', wCm: 240, dCm: 60, hCm: 220, desc: 'Extensive master bedroom fitted wardrobe', type: 'storage' },
  { id: 'wardrobe-sliding', name: 'Sliding Door Wardrobe (200cm)', category: 'bedroom', wCm: 200, dCm: 65, hCm: 215, desc: '2-panel sliding wardrobe for tight clearance rooms', type: 'storage' },
  { id: 'closet-island', name: 'Walk-in Closet Island', category: 'bedroom', wCm: 120, dCm: 80, hCm: 90, desc: 'Center jewelry / accessory drawer island', type: 'storage' },
  { id: 'dresser-4d', name: 'Chest of Drawers (4-Drawer 100cm)', category: 'bedroom', wCm: 100, dCm: 50, hCm: 90, desc: '4-drawer bedroom clothes chest', type: 'storage' },
  { id: 'dresser-6d', name: 'Double Dresser (6-Drawer 150cm)', category: 'bedroom', wCm: 150, dCm: 50, hCm: 85, desc: 'Wide 6-drawer master bedroom dresser', type: 'storage' },
  { id: 'vanity-dressing', name: 'Dressing Table & Mirror', category: 'bedroom', wCm: 110, dCm: 45, hCm: 75, desc: 'Bedroom makeup/dressing table with stool clearance', type: 'table' },

  // =========================================================================
  // 3. DINING & ENTERTAINING (18 Items)
  // =========================================================================
  { id: 'dining-2p-bistro', name: 'Bistro Table (2-Person 70×70)', category: 'dining', wCm: 70, dCm: 70, hCm: 75, desc: 'Compact square cafe / balcony dining table', type: 'table' },
  { id: 'dining-2p-round', name: 'Bistro Round Table (Ø75cm)', category: 'dining', wCm: 75, dCm: 75, hCm: 75, desc: 'Circular 2-seater intimate dining table', type: 'table_round' },
  { id: 'dining-4p-sq', name: 'Dining Table 4-Person (Square 90×90)', category: 'dining', wCm: 90, dCm: 90, hCm: 75, desc: 'Compact square 4-seater dining table', type: 'table' },
  { id: 'dining-4p-round', name: 'Dining Table 4-Person (Round Ø105cm)', category: 'dining', wCm: 105, dCm: 105, hCm: 75, desc: 'Circular 4-seater dining table', type: 'table_round' },
  { id: 'dining-6p-rect', name: 'Dining Table 6-Person (Rectangular 160×90)', category: 'dining', wCm: 160, dCm: 90, hCm: 75, desc: 'Standard 6-seater family dining table', type: 'table' },
  { id: 'dining-6p-round', name: 'Dining Table 6-Person (Round Ø140cm)', category: 'dining', wCm: 140, dCm: 140, hCm: 75, desc: 'Spacious circular 6-person dining table', type: 'table_round' },
  { id: 'dining-6p-oval', name: 'Dining Table 6-Person (Oval 180×100)', category: 'dining', wCm: 180, dCm: 100, hCm: 75, desc: 'Oval architectural 6-seater dining table', type: 'table_round' },
  { id: 'dining-8p-rect', name: 'Dining Table 8-Person (220×100)', category: 'dining', wCm: 220, dCm: 100, hCm: 75, desc: 'Large 8-seater entertaining dining table', type: 'table' },
  { id: 'dining-8p-oval', name: 'Dining Table 8-Person (Oval 240×110)', category: 'dining', wCm: 240, dCm: 110, hCm: 75, desc: 'Spacious 8-person oval formal dining table', type: 'table_round' },
  { id: 'dining-10p-rect', name: 'Dining Table 10-Person (280×110)', category: 'dining', wCm: 280, dCm: 110, hCm: 75, desc: 'Formal 10-seater banquet dining table', type: 'table' },
  { id: 'dining-12p-rect', name: 'Dining Table 12-Person (340×120)', category: 'dining', wCm: 340, dCm: 120, hCm: 75, desc: 'Grand 12-seater formal dining banquet table', type: 'table' },
  { id: 'dining-chair', name: 'Dining Chair', category: 'dining', wCm: 45, dCm: 50, hCm: 85, desc: 'Standard dining seat with backrest', type: 'chair_small' },
  { id: 'dining-armchair', name: 'Dining Carver / Host Armchair', category: 'dining', wCm: 58, dCm: 58, hCm: 88, desc: 'Head-of-table dining chair with armrests', type: 'chair_small' },
  { id: 'bar-stool', name: 'Kitchen Counter Bar Stool', category: 'dining', wCm: 40, dCm: 40, hCm: 95, desc: 'High counter / breakfast bar stool', type: 'chair_round' },
  { id: 'banquette-nook', name: 'Breakfast Nook L-Banquette', category: 'dining', wCm: 180, dCm: 140, hCm: 88, desc: 'Corner built-in kitchen bench banquette seating', type: 'sectional' },
  { id: 'sideboard', name: 'Sideboard / Buffet Credenza (160cm)', category: 'dining', wCm: 160, dCm: 45, hCm: 85, desc: 'Dining room crockery & serving sideboard', type: 'storage' },
  { id: 'sideboard-large', name: 'Grand Buffet Credenza (200cm)', category: 'dining', wCm: 200, dCm: 50, hCm: 88, desc: '4-door formal dining storage credenza', type: 'storage' },
  { id: 'bar-cart', name: 'Bar Cart / Beverage Trolley', category: 'dining', wCm: 80, dCm: 45, hCm: 85, desc: 'Mobile 2-tier cocktail serving cart', type: 'table' },

  // =========================================================================
  // 4. KITCHEN & APPLIANCES (22 Items)
  // =========================================================================
  { id: 'counter-base-60', name: 'Kitchen Base Counter (600mm module)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 90, desc: 'Standard 600mm modular kitchen countertop unit', type: 'counter' },
  { id: 'counter-base-90', name: 'Kitchen Base Unit Wide (900mm)', category: 'kitchen', wCm: 90, dCm: 60, hCm: 90, desc: 'Double door / 3-drawer kitchen base unit', type: 'counter' },
  { id: 'counter-corner', name: 'Corner Base Unit (900×900mm)', category: 'kitchen', wCm: 90, dCm: 90, hCm: 90, desc: 'Corner L-cabinet with revolving Lazy Susan', type: 'counter' },
  { id: 'kitchen-island-180', name: 'Kitchen Island with Seating (180×90)', category: 'kitchen', wCm: 180, dCm: 90, hCm: 90, desc: 'Freestanding prep island with 3-stool overhang', type: 'counter' },
  { id: 'kitchen-island-sink', name: 'Kitchen Island with Prep Sink (240×100)', category: 'kitchen', wCm: 240, dCm: 100, hCm: 90, desc: 'Chef island with integrated prep sink & cooktop zone', type: 'counter' },
  { id: 'peninsula-bar', name: 'Kitchen Peninsula Counter (180×75)', category: 'kitchen', wCm: 180, dCm: 75, hCm: 90, desc: 'Attached breakfast bar countertop return', type: 'counter' },
  { id: 'tall-pantry-60', name: 'Tall Pantry Cabinet (60×60)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 215, desc: 'Full-height floor-to-ceiling food larder unit', type: 'storage' },
  { id: 'oven-tower-60', name: 'Oven & Microwave Tower (60×60)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 215, desc: 'Eye-level built-in double oven/microwave column', type: 'appliance' },
  { id: 'sink-single', name: 'Kitchen Sink (Single Bowl + Drainer)', category: 'kitchen', wCm: 85, dCm: 50, hCm: 20, desc: 'Standard stainless/composite single bowl sink', type: 'sink' },
  { id: 'sink-double', name: 'Kitchen Sink (Double Bowl 100×50)', category: 'kitchen', wCm: 100, dCm: 50, hCm: 20, desc: 'Twin bowl prep & wash kitchen sink unit', type: 'sink' },
  { id: 'sink-undermount', name: 'Undermount Kitchen Basin (55×45)', category: 'kitchen', wCm: 55, dCm: 45, hCm: 22, desc: 'Seamless stone/quartz undermount single sink', type: 'sink' },
  { id: 'sink-apron', name: 'Belfast / Farmhouse Apron Sink (80×50)', category: 'kitchen', wCm: 80, dCm: 50, hCm: 25, desc: 'Deep ceramic front-apron country sink', type: 'sink' },
  { id: 'cooktop-4b', name: '4-Burner Cooktop (60cm)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 10, desc: 'Standard 60cm 4-zone induction/gas hob', type: 'cooktop' },
  { id: 'cooktop-5b', name: '5-Burner Cooktop / Range (90cm)', category: 'kitchen', wCm: 90, dCm: 60, hCm: 10, desc: 'Wide 90cm culinary gas/induction hob', type: 'cooktop' },
  { id: 'range-cooker-90', name: 'Freestanding Range Cooker (90cm)', category: 'kitchen', wCm: 90, dCm: 65, hCm: 90, desc: 'Double oven professional range cooker', type: 'cooktop' },
  { id: 'range-hood-90', name: 'Range Extractor Hood (90cm)', category: 'kitchen', wCm: 90, dCm: 50, hCm: 70, desc: 'Overhead kitchen extraction canopy', type: 'appliance' },
  { id: 'fridge-single', name: 'Single-Door Refrigerator (70×70)', category: 'kitchen', wCm: 70, dCm: 70, hCm: 185, desc: 'Standard tall fridge-freezer column', type: 'fridge' },
  { id: 'fridge-french', name: 'French Door Double Refrigerator (90×80)', category: 'kitchen', wCm: 90, dCm: 80, hCm: 185, desc: 'American style side-by-side ice fridge', type: 'fridge' },
  { id: 'dishwasher-std', name: 'Built-in Dishwasher (60cm)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 85, desc: 'Standard 14-place setting dishwasher', type: 'appliance' },
  { id: 'dishwasher-slim', name: 'Slimline Dishwasher (45cm)', category: 'kitchen', wCm: 45, dCm: 60, hCm: 85, desc: 'Compact 9-place setting dishwasher for small flats', type: 'appliance' },
  { id: 'washing-machine', name: 'Washing Machine (Front-Load)', category: 'kitchen', wCm: 60, dCm: 60, hCm: 85, desc: 'Standard 8kg laundry washing appliance', type: 'appliance' },
  { id: 'tumble-dryer', name: 'Tumble Dryer Appliance', category: 'kitchen', wCm: 60, dCm: 60, hCm: 85, desc: 'Heat-pump / condenser laundry dryer', type: 'appliance' },

  // =========================================================================
  // 5. BATHROOM & SANITARY FIXTURES (20 Items)
  // =========================================================================
  { id: 'toilet-std', name: 'Standard Toilet / WC (Close-Coupled)', category: 'bathroom', wCm: 40, dCm: 70, hCm: 75, desc: 'Floor-mounted close-coupled WC cistern & pan', type: 'toilet' },
  { id: 'toilet-wall', name: 'Wall-Hung Concealed WC (38×55)', category: 'bathroom', wCm: 38, dCm: 55, hCm: 40, desc: 'Modern wall-hung WC pan (excludes concealed frame)', type: 'toilet' },
  { id: 'toilet-ada', name: 'Accessible ADA Compliant Toilet', category: 'bathroom', wCm: 45, dCm: 75, hCm: 85, desc: 'High-seat accessible WC with grab bar clearances', type: 'toilet' },
  { id: 'bidet-std', name: 'Sanitary Bidet Unit', category: 'bathroom', wCm: 38, dCm: 55, hCm: 40, desc: 'Floor or wall-mounted sanitary bidet unit', type: 'toilet' },
  { id: 'urinal-wall', name: 'Wall-Hung Urinal with Partition', category: 'bathroom', wCm: 40, dCm: 35, hCm: 70, desc: 'Commercial wall-hung ceramic urinal with privacy fin', type: 'toilet' },
  { id: 'basin-cloakroom', name: 'Compact Cloakroom Hand Basin (40×28)', category: 'bathroom', wCm: 40, dCm: 28, hCm: 15, desc: 'Powder room / guest WC space-saving mini basin', type: 'sink' },
  { id: 'basin-pedestal', name: 'Pedestal Washbasin (55×45)', category: 'bathroom', wCm: 55, dCm: 45, hCm: 85, desc: 'Classic ceramic pedestal bathroom sink', type: 'sink' },
  { id: 'vanity-single-60', name: 'Single Vanity Unit (60cm)', category: 'bathroom', wCm: 60, dCm: 48, hCm: 85, desc: 'Standard single basin with storage cabinet', type: 'vanity' },
  { id: 'vanity-single-90', name: 'Wide Single Vanity (90cm)', category: 'bathroom', wCm: 90, dCm: 50, hCm: 85, desc: 'Spacious single basin with drawers & counter area', type: 'vanity' },
  { id: 'vanity-double-120', name: 'Double Basin Vanity (120cm)', category: 'bathroom', wCm: 120, dCm: 52, hCm: 85, desc: 'Master bathroom double vanity with two sinks', type: 'vanity' },
  { id: 'vanity-double-160', name: 'Luxury Double Vanity (160cm)', category: 'bathroom', wCm: 160, dCm: 55, hCm: 85, desc: 'Executive double vanity with central linen drawers', type: 'vanity' },
  { id: 'bathtub-std', name: 'Standard Inset Bathtub (170×70)', category: 'bathroom', wCm: 170, dCm: 70, hCm: 55, desc: 'Standard alcove acrylic soaking bathtub', type: 'bath' },
  { id: 'bathtub-large', name: 'Wide Inset Bathtub (180×80)', category: 'bathroom', wCm: 180, dCm: 80, hCm: 58, desc: 'Generous 1.8m family soaking bathtub', type: 'bath' },
  { id: 'bathtub-free-oval', name: 'Freestanding Oval Bathtub (180×80)', category: 'bathroom', wCm: 180, dCm: 80, hCm: 60, desc: 'Luxury standalone oval architectural tub', type: 'bath' },
  { id: 'bathtub-corner-jacuzzi', name: 'Corner Whirlpool Jacuzzi (150×150)', category: 'bathroom', wCm: 150, dCm: 150, hCm: 65, desc: 'Corner hydrotherapy jacuzzi spa bath', type: 'bath' },
  { id: 'shower-corner-90', name: 'Corner Shower Cubicle (90×90)', category: 'bathroom', wCm: 90, dCm: 90, hCm: 200, desc: 'Square corner glass shower enclosure', type: 'shower' },
  { id: 'shower-corner-neo', name: 'Neo-Angle Corner Shower (100×100)', category: 'bathroom', wCm: 100, dCm: 100, hCm: 200, desc: 'Diamond neo-angle corner glass shower', type: 'shower' },
  { id: 'shower-walkin-120', name: 'Walk-In Shower Enclosure (120×90)', category: 'bathroom', wCm: 120, dCm: 90, hCm: 200, desc: 'Spacious wetroom shower with glass deflector', type: 'shower' },
  { id: 'shower-walkin-150', name: 'Walk-In Double Shower (150×90)', category: 'bathroom', wCm: 150, dCm: 90, hCm: 200, desc: 'Double-head luxury wetroom walk-in zone', type: 'shower' },
  { id: 'shower-ada-rollin', name: 'Accessible ADA Roll-in Shower (150×150)', category: 'bathroom', wCm: 150, dCm: 150, hCm: 200, desc: 'Zero-threshold ADA wheelchair roll-in shower', type: 'shower' },

  // =========================================================================
  // 6. OFFICE & WORKSPACE (22 Items)
  // =========================================================================
  { id: 'desk-compact', name: 'Compact Study / Bedroom Desk (100×50)', category: 'office', wCm: 100, dCm: 50, hCm: 75, desc: 'Small space study desk for laptops', type: 'table' },
  { id: 'desk-std-140', name: 'Standard Office Desk (140×70)', category: 'office', wCm: 140, dCm: 70, hCm: 75, desc: 'Standard single workstation desk with cable grommet', type: 'table' },
  { id: 'desk-studio-160', name: 'Studio Workstation Desk (160×80)', category: 'office', wCm: 160, dCm: 80, hCm: 75, desc: 'Dual-monitor engineering & design desk', type: 'table' },
  { id: 'desk-standing-150', name: 'Electric Standing Desk (150×75)', category: 'office', wCm: 150, dCm: 75, hCm: 120, desc: 'Motorized height-adjustable ergonomic sit-stand desk', type: 'table' },
  { id: 'desk-exec-180', name: 'Executive Director Desk (180×90)', category: 'office', wCm: 180, dCm: 90, hCm: 75, desc: 'Large executive office managerial desk', type: 'table' },
  { id: 'desk-corner-160', name: 'L-Shaped Corner Workstation (160×160)', category: 'office', wCm: 160, dCm: 160, hCm: 75, desc: 'Corner modular dual-surface workstation', type: 'sectional' },
  { id: 'desk-u-shaped', name: 'U-Shaped Executive Suite (240×240)', category: 'office', wCm: 240, dCm: 240, hCm: 75, desc: 'Complete executive suite with desk, bridge & credenza', type: 'sectional' },
  { id: 'drafting-table', name: 'Architectural Drafting Table (120×80)', category: 'office', wCm: 120, dCm: 80, hCm: 95, desc: 'Tilt-top manual architectural drawing & sketching table', type: 'table' },
  { id: 'desk-pod-2p', name: '2-Person Bench Desk Pod (140×140)', category: 'office', wCm: 140, dCm: 140, hCm: 75, desc: 'Face-to-face dual worker benching system', type: 'table' },
  { id: 'desk-pod-4p', name: '4-Person Workstation Pod (280×140)', category: 'office', wCm: 280, dCm: 140, hCm: 75, desc: 'Open office 4-person collaborative team pod', type: 'table' },
  { id: 'desk-pod-6p', name: '6-Person Workstation Cluster (420×140)', category: 'office', wCm: 420, dCm: 140, hCm: 75, desc: 'Large commercial open-plan work benching system', type: 'table' },
  { id: 'reception-desk', name: 'Reception Counter Desk (220×85)', category: 'office', wCm: 220, dCm: 85, hCm: 110, desc: 'Lobby reception desk with raised customer transaction ledge', type: 'counter' },
  { id: 'phone-booth', name: 'Acoustic Privacy Phone Booth (100×100)', category: 'office', wCm: 100, dCm: 100, hCm: 220, desc: 'Soundproof single-person video call pod', type: 'structure' },
  { id: 'conf-table-round', name: 'Round Meeting Table (Ø120cm - 4P)', category: 'office', wCm: 120, dCm: 120, hCm: 75, desc: 'Circular 4-person collaboration meeting table', type: 'table_round' },
  { id: 'conf-table-8p', name: 'Conference Table 8-Person (240×110)', category: 'office', wCm: 240, dCm: 110, hCm: 75, desc: 'Boardroom conference table with cable hatches', type: 'table' },
  { id: 'conf-table-12p', name: 'Conference Table 12-Person (360×120)', category: 'office', wCm: 360, dCm: 120, hCm: 75, desc: 'Executive boardroom table for 12 participants', type: 'table' },
  { id: 'chair-task', name: 'Ergonomic Task Swivel Chair', category: 'office', wCm: 65, dCm: 65, hCm: 95, desc: '5-star wheeled ergonomic office chair clearance', type: 'chair_round' },
  { id: 'chair-exec', name: 'Executive High-Back Leather Chair', category: 'office', wCm: 70, dCm: 70, hCm: 120, desc: 'Managerial high-back reclining office chair', type: 'chair_round' },
  { id: 'chair-visitor', name: 'Visitor / Conference Sled Chair', category: 'office', wCm: 55, dCm: 55, hCm: 82, desc: 'Cantilever sled-base meeting room chair', type: 'chair_small' },
  { id: 'file-cabinet-4d', name: 'Vertical Filing Cabinet (4-Drawer)', category: 'office', wCm: 45, dCm: 60, hCm: 130, desc: 'Standard A4/Foolscap document drawer cabinet', type: 'storage' },
  { id: 'printer-station', name: 'Printer / Plotter Copier Station', category: 'office', wCm: 100, dCm: 75, hCm: 100, desc: 'Commercial A3 multifunctional printer footprint', type: 'appliance' },
  { id: 'server-rack-42u', name: 'Data Center Server Rack (42U 60×100)', category: 'office', wCm: 60, dCm: 100, hCm: 200, desc: 'Standard 19-inch IT network & server enclosure', type: 'storage' },

  // =========================================================================
  // 7. DOORS, WINDOWS, STAIRS & CIRCULATION (22 Items)
  // =========================================================================
  { id: 'door-700', name: 'Narrow Interior Door (700mm)', category: 'doors', wCm: 70, dCm: 10, hCm: 210, desc: 'Small storage / closet single hinged door', type: 'door' },
  { id: 'door-800', name: 'Standard Interior Door (800mm)', category: 'doors', wCm: 80, dCm: 10, hCm: 210, desc: 'Standard bedroom / bathroom single hinged door', type: 'door' },
  { id: 'door-900', name: 'Main Entrance Door (900mm)', category: 'doors', wCm: 90, dCm: 10, hCm: 210, desc: 'Primary residential front entrance single leaf door', type: 'door' },
  { id: 'door-1000-ada', name: 'Accessible Entrance Door (1000mm)', category: 'doors', wCm: 100, dCm: 10, hCm: 210, desc: 'ADA compliant wide barrier-free entrance door', type: 'door' },
  { id: 'door-double-160', name: 'Double French Doors (1600mm)', category: 'doors', wCm: 160, dCm: 10, hCm: 210, desc: 'Double leaf swinging doors for living or balcony', type: 'door_double' },
  { id: 'door-double-180', name: 'Wide Double French Doors (1800mm)', category: 'doors', wCm: 180, dCm: 10, hCm: 210, desc: 'Grand patio / veranda double swinging door set', type: 'door_double' },
  { id: 'door-pocket-90', name: 'Pocket Sliding Door (900mm)', category: 'doors', wCm: 90, dCm: 10, hCm: 210, desc: 'In-wall concealed sliding door for tight spaces', type: 'door_sliding' },
  { id: 'door-patio-180', name: 'Sliding Patio Door 2-Panel (1800mm)', category: 'doors', wCm: 180, dCm: 12, hCm: 210, desc: '2-panel glazed sliding terrace/balcony door', type: 'door_sliding' },
  { id: 'door-patio-270', name: 'Sliding Patio Door 3-Panel (2700mm)', category: 'doors', wCm: 270, dCm: 15, hCm: 210, desc: '3-panel wide panoramic sliding glazed door', type: 'door_sliding' },
  { id: 'door-bifold-300', name: 'Bi-Fold Folding Doors (3000mm)', category: 'doors', wCm: 300, dCm: 12, hCm: 210, desc: 'Full-opening 4-panel folding glass wall system', type: 'door_sliding' },
  { id: 'window-casement-120', name: 'Standard Casement Window (1200mm)', category: 'doors', wCm: 120, dCm: 15, hCm: 140, desc: '2-pane side-hung residential exterior window', type: 'window' },
  { id: 'window-picture-200', name: 'Large Picture Window (2000mm)', category: 'doors', wCm: 200, dCm: 15, hCm: 160, desc: 'Fixed panoramic daylight architectural window', type: 'window' },
  { id: 'window-sliding-150', name: 'Sliding Glazed Window (1500mm)', category: 'doors', wCm: 150, dCm: 12, hCm: 120, desc: 'Horizontal 2-track sliding window unit', type: 'window' },
  { id: 'stair-straight', name: 'Straight Run Staircase (900×3000)', category: 'doors', wCm: 90, dCm: 300, hCm: 280, desc: 'Single flight straight residential staircase footprint', type: 'stair' },
  { id: 'stair-l-shaped', name: 'L-Shaped Quarter-Turn Staircase (200×200)', category: 'doors', wCm: 200, dCm: 200, hCm: 280, desc: 'Quarter-turn staircase with intermediate landing', type: 'stair' },
  { id: 'stair-u-shaped', name: 'U-Shaped Half-Turn Switchback (200×220)', category: 'doors', wCm: 200, dCm: 220, hCm: 280, desc: 'Double flight switchback staircase with landing', type: 'stair' },
  { id: 'stair-spiral', name: 'Spiral Staircase (Ø160cm)', category: 'doors', wCm: 160, dCm: 160, hCm: 280, desc: 'Circular metal/timber space-saving spiral stair', type: 'stair' },
  { id: 'clearance-hall', name: 'Residential Hallway Clearance (900mm)', category: 'doors', wCm: 90, dCm: 90, hCm: 240, desc: 'Minimum residential corridor width clearance', type: 'clearance' },
  { id: 'clearance-commercial', name: 'Commercial Corridor Clearance (1500mm)', category: 'doors', wCm: 150, dCm: 150, hCm: 240, desc: 'Standard 2-way commercial egress passage', type: 'clearance' },
  { id: 'clearance-wheelchair', name: 'ADA Wheelchair 150cm Turning Circle', category: 'doors', wCm: 150, dCm: 150, hCm: 240, desc: 'ADA / Universal wheelchair 360-degree turning circle', type: 'clearance' },
  { id: 'ramp-ada', name: 'ADA Access Ramp (1:12 Slope 100×300)', category: 'doors', wCm: 100, dCm: 300, hCm: 25, desc: 'Standard 1:12 accessible building entry ramp', type: 'structure' },
  { id: 'elevator-shaft', name: '8-Person Passenger Elevator (180×180)', category: 'doors', wCm: 180, dCm: 180, hCm: 240, desc: 'Standard commercial passenger lift shaft footprint', type: 'structure' },

  // =========================================================================
  // 8. OUTDOOR, PATIO & PARKING (16 Items)
  // =========================================================================
  { id: 'outdoor-dining-6p', name: 'Outdoor Dining Table 6-Person (180×90)', category: 'outdoor', wCm: 180, dCm: 90, hCm: 75, desc: 'Teak / aluminum weather-resistant patio table', type: 'table' },
  { id: 'outdoor-chair', name: 'Outdoor Patio Armchair', category: 'outdoor', wCm: 58, dCm: 60, hCm: 85, desc: 'Weatherproof stacking terrace dining chair', type: 'chair_small' },
  { id: 'sun-lounger', name: 'Poolside Sun Lounger (200×65)', category: 'outdoor', wCm: 200, dCm: 65, hCm: 35, desc: 'Reclining poolside sunbathing deck chair', type: 'chair' },
  { id: 'outdoor-sectional', name: 'Outdoor L-Sectional Lounge (240×240)', category: 'outdoor', wCm: 240, dCm: 240, hCm: 75, desc: 'All-weather modular garden sofa set', type: 'sectional' },
  { id: 'outdoor-firepit', name: 'Fire Pit Lounge Table (120×120)', category: 'outdoor', wCm: 120, dCm: 120, hCm: 50, desc: 'Central gas fire pit with perimeter drink ledge', type: 'table' },
  { id: 'patio-umbrella', name: 'Cantilever Patio Parasol (Ø300cm)', category: 'outdoor', wCm: 300, dCm: 300, hCm: 260, desc: 'Large 3m cantilever sun shade umbrella', type: 'structure' },
  { id: 'bbq-grill-station', name: 'Outdoor BBQ Grill Kitchen (160×65)', category: 'outdoor', wCm: 160, dCm: 65, hCm: 95, desc: 'Freestanding 4-burner BBQ station with prep side-shelves', type: 'counter' },
  { id: 'planter-rect', name: 'Rectangular Planter Box (120×40)', category: 'outdoor', wCm: 120, dCm: 40, hCm: 60, desc: 'Balcony / terrace dividing green planter trough', type: 'structure' },
  { id: 'planter-square', name: 'Square Architectural Planter (60×60)', category: 'outdoor', wCm: 60, dCm: 60, hCm: 70, desc: 'Entryway specimen plant ornamental container', type: 'structure' },
  { id: 'bike-parking', name: 'Bicycle Parking Bay (180×60)', category: 'outdoor', wCm: 180, dCm: 60, hCm: 100, desc: 'Standard single bicycle rack stall clearance', type: 'vehicle' },
  { id: 'motorcycle-bay', name: 'Motorcycle Parking Space (120×250)', category: 'outdoor', wCm: 120, dCm: 250, hCm: 120, desc: 'Dedicated motorcycle / scooter parking stall', type: 'vehicle' },
  { id: 'car-compact', name: 'Compact Car Parking Bay (230×480)', category: 'outdoor', wCm: 230, dCm: 480, hCm: 160, desc: 'Urban small vehicle parking bay dimension', type: 'vehicle' },
  { id: 'car-standard', name: 'Standard Car Parking Space (250×500)', category: 'outdoor', wCm: 250, dCm: 500, hCm: 180, desc: 'Standard 2.5m × 5.0m car parking bay footprint', type: 'vehicle' },
  { id: 'car-ada-bay', name: 'Accessible ADA Parking Space (350×500)', category: 'outdoor', wCm: 350, dCm: 500, hCm: 180, desc: 'Disabled parking stall with 1.0m side transfer aisle', type: 'vehicle' },
  { id: 'ev-charger-bay', name: 'EV Charging Parking Space (250×500)', category: 'outdoor', wCm: 250, dCm: 500, hCm: 180, desc: 'Electric vehicle charging bay with bollard pedestal', type: 'vehicle' },
  { id: 'garage-single', name: 'Single Car Garage Footprint (320×600)', category: 'outdoor', wCm: 320, dCm: 600, hCm: 240, desc: 'Standard single residential garage internal clearance', type: 'structure' },

  // =========================================================================
  // 9. COMMERCIAL, RETAIL, FITNESS & HEALTHCARE (16 Items)
  // =========================================================================
  { id: 'restaurant-booth-2p', name: 'Restaurant 2-Person Booth (120×100)', category: 'commercial', wCm: 120, dCm: 100, hCm: 100, desc: 'Opposing double bench booth with central table', type: 'sectional' },
  { id: 'restaurant-booth-4p', name: 'Restaurant 4-Person Booth (120×180)', category: 'commercial', wCm: 120, dCm: 180, hCm: 100, desc: 'Standard 4-person dining booth for cafes & bistros', type: 'sectional' },
  { id: 'bar-service-counter', name: 'Bar Service Counter (300×75)', category: 'commercial', wCm: 300, dCm: 75, hCm: 110, desc: 'Commercial bar top with undercounter sink & tap run', type: 'counter' },
  { id: 'retail-clothing-rack', name: 'Retail Apparel Garment Rack (150×60)', category: 'commercial', wCm: 150, dCm: 60, hCm: 150, desc: 'Double-sided rolling clothes display rack', type: 'storage' },
  { id: 'retail-pos-counter', name: 'Retail POS Cashier Counter (180×80)', category: 'commercial', wCm: 180, dCm: 80, hCm: 95, desc: 'Store checkout cash wrap counter with till space', type: 'counter' },
  { id: 'supermarket-checkout', name: 'Supermarket Conveyor Checkout (240×100)', category: 'commercial', wCm: 240, dCm: 100, hCm: 90, desc: 'Belt conveyor grocery checkout lane unit', type: 'counter' },
  { id: 'gym-treadmill', name: 'Gym Commercial Treadmill (200×90)', category: 'commercial', wCm: 200, dCm: 90, hCm: 150, desc: 'Motorized fitness running machine footprint', type: 'appliance' },
  { id: 'gym-exercise-bike', name: 'Stationary Upright Exercise Bike (120×60)', category: 'commercial', wCm: 120, dCm: 60, hCm: 130, desc: 'Cardio exercise spin / upright bike space', type: 'appliance' },
  { id: 'gym-elliptical', name: 'Elliptical Cross Trainer (180×70)', category: 'commercial', wCm: 180, dCm: 70, hCm: 170, desc: 'Cross trainer cardio fitness footprint', type: 'appliance' },
  { id: 'gym-bench-press', name: 'Weightlifting Bench Press (150×120)', category: 'commercial', wCm: 150, dCm: 120, hCm: 120, desc: 'Olympic flat bench press with barbell clearance', type: 'structure' },
  { id: 'gym-multigym', name: 'Multi-Gym Cable Weight Stack (200×150)', category: 'commercial', wCm: 200, dCm: 150, hCm: 215, desc: 'Corner multi-exercise cable strength machine', type: 'structure' },
  { id: 'hospital-bed', name: 'Hospital / Patient Bed (100×210)', category: 'commercial', wCm: 100, dCm: 210, hCm: 90, desc: 'Adjustable motorized medical bed with side rails', type: 'bed' },
  { id: 'medical-exam-table', name: 'Medical Examination Table (70×190)', category: 'commercial', wCm: 70, dCm: 190, hCm: 80, desc: 'Clinic doctor examination bed with paper roll holder', type: 'table' },
  { id: 'dental-chair', name: 'Dental Operatory Chair & Delivery (90×180)', category: 'commercial', wCm: 90, dCm: 180, hCm: 140, desc: 'Dental patient treatment chair with instrument arm', type: 'chair' },
  { id: 'massage-treatment-table', name: 'Spa / Massage Treatment Table (80×195)', category: 'commercial', wCm: 80, dCm: 195, hCm: 75, desc: 'Physiotherapy & spa massage therapy table', type: 'table' },
  { id: 'salon-styling-chair', name: 'Hair Salon Hydraulic Chair & Mirror (80×90)', category: 'commercial', wCm: 80, dCm: 90, hCm: 110, desc: 'Styling station swivel chair with floor clearance', type: 'chair_round' },

  // =========================================================================
  // 10. HEALTHCARE, EDUCATIONAL & INSTITUTIONAL (18 Items)
  // Typical/reference planning dimensions — verify against local guidance.
  // =========================================================================
  { id: 'waiting-room-chair', name: 'Waiting Room Beam Seating (4-Seat)', category: 'commercial', wCm: 260, dCm: 65, hCm: 85, desc: 'Typical linked waiting-area bench row unit', type: 'chair' },
  { id: 'hospital-bed-icu', name: 'ICU Bed with Surround Zone (120×230)', category: 'commercial', wCm: 120, dCm: 230, hCm: 95, desc: 'Critical-care bed allowing staff access both sides', type: 'bed' },
  { id: 'bedside-screen', name: 'Medical Privacy Screen (3-Panel)', category: 'commercial', wCm: 170, dCm: 20, hCm: 180, desc: 'Foldable ward privacy screening panel', type: 'structure' },
  { id: 'medication-cart', name: 'Medication / Treatment Trolley (90×55)', category: 'commercial', wCm: 90, dCm: 55, hCm: 95, desc: 'Ward mobile medicine distribution cart', type: 'appliance' },
  { id: 'wheelchair-parking-bay', name: 'Wheelchair Storage Bay (90×120)', category: 'commercial', wCm: 90, dCm: 120, hCm: 120, desc: 'Typical indoor wheelchair parking footprint', type: 'clearance' },
  { id: 'classroom-desk-single', name: 'Classroom Single Student Desk (60×45)', category: 'commercial', wCm: 60, dCm: 45, hCm: 73, desc: 'Typical primary/secondary school pupil desk', type: 'table' },
  { id: 'classroom-desk-double', name: 'Classroom Double Student Desk (120×50)', category: 'commercial', wCm: 120, dCm: 50, hCm: 73, desc: 'Two-student shared school desk footprint', type: 'table' },
  { id: 'lecture-hall-seat', name: 'Lecture Hall Tip-Up Seat Row (55 deep)', category: 'commercial', wCm: 55, dCm: 55, hCm: 85, desc: 'Per-seat module of tiered lecture seating', type: 'chair_small' },
  { id: 'teacher-desk', name: 'Teacher / Lecturer Desk (160×80)', category: 'commercial', wCm: 160, dCm: 80, hCm: 75, desc: 'Classroom front teaching desk with storage', type: 'table' },
  { id: 'whiteboard-wall', name: 'Wall Whiteboard Panel (240×120)', category: 'commercial', wCm: 240, dCm: 10, hCm: 120, desc: 'Classroom wall-mounted writing surface', type: 'window' },
  { id: 'library-stack-double', name: 'Library Double-Sided Stack (200×60)', category: 'commercial', wCm: 200, dCm: 60, hCm: 180, desc: 'Double-faced book shelving stack run', type: 'storage' },
  { id: 'library-carrel', name: 'Library Study Carrel (120×75)', category: 'commercial', wCm: 120, dCm: 75, hCm: 120, desc: 'Individual study carrel with side screens', type: 'table' },
  { id: 'lab-bench-island', name: 'Laboratory Bench Island (300×150)', category: 'commercial', wCm: 300, dCm: 150, hCm: 90, desc: 'Science lab double-sided working island', type: 'counter' },
  { id: 'fume-hood', name: 'Laboratory Fume Hood (120×90)', category: 'commercial', wCm: 120, dCm: 90, hCm: 250, desc: 'Walk-up chemical fume extraction cabinet', type: 'appliance' },
  { id: 'kindergarten-cot', name: 'Kindergarten Nap Cot (60×140)', category: 'commercial', wCm: 60, dCm: 140, hCm: 30, desc: 'Stackable preschool rest cot footprint', type: 'bed_small' },
  { id: 'cafeteria-table-8', name: 'Cafeteria Long Table (8-Seat 240×75)', category: 'commercial', wCm: 240, dCm: 75, hCm: 75, desc: 'Institutional canteen fixed bench table unit', type: 'table' },
  { id: 'prayer-room-screen', name: 'Multi-Faith Room Screen (160×50)', category: 'commercial', wCm: 160, dCm: 50, hCm: 190, desc: 'Quiet-room partition and ablation screen', type: 'structure' },
  { id: 'childcare-cubby', name: 'Childcare Cubby Locker Unit (150×40)', category: 'commercial', wCm: 150, dCm: 40, hCm: 110, desc: 'Children coat & bag pigeonhole storage', type: 'storage' },

  // =========================================================================
  // 11. INDUSTRIAL, STORAGE & SERVICE SPACES (18 Items)
  // =========================================================================
  { id: 'pallet-standard', name: 'Standard Euro Pallet (120×80)', category: 'commercial', wCm: 120, dCm: 80, hCm: 15, desc: 'Standard EUR-pallet logistics footprint', type: 'structure' },
  { id: 'pallet-rack-bay', name: 'Pallet Racking Bay (270×110)', category: 'commercial', wCm: 270, dCm: 110, hCm: 500, desc: 'Typical single warehouse racking bay', type: 'storage' },
  { id: 'forklift-aisle', name: 'Counterbalance Forklift Aisle (350 wide)', category: 'commercial', wCm: 350, dCm: 110, hCm: 300, desc: 'Minimum counterbalance forklift aisle envelope', type: 'clearance' },
  { id: 'workbench-heavy', name: 'Heavy-Duty Workbench (200×75)', category: 'commercial', wCm: 200, dCm: 75, hCm: 90, desc: 'Industrial steel workbench with lower shelf', type: 'table' },
  { id: 'packing-station', name: 'Packing / Dispatch Station (150×80)', category: 'commercial', wCm: 150, dCm: 80, hCm: 95, desc: 'Warehouse parcel packing bench with roll holder', type: 'table' },
  { id: 'loading-dock', name: 'Loading Dock Door Bay (300×350)', category: 'commercial', wCm: 300, dCm: 350, hCm: 300, desc: 'Typical dock leveler and door opening envelope', type: 'structure' },
  { id: 'chest-freezer-comm', name: 'Commercial Chest Freezer (200×70)', category: 'commercial', wCm: 200, dCm: 70, hCm: 90, desc: 'Back-of-house commercial chest freezer', type: 'fridge' },
  { id: 'prep-table-ss', name: 'Stainless Prep Table (180×70)', category: 'commercial', wCm: 180, dCm: 70, hCm: 90, desc: 'Commercial kitchen stainless steel prep table', type: 'counter' },
  { id: 'walkin-coldroom', name: 'Walk-In Cold Room (300×300)', category: 'commercial', wCm: 300, dCm: 300, hCm: 250, desc: 'Modular insulated cold room footprint', type: 'structure' },
  { id: 'dishwasher-hood', name: 'Pass-Through Hood Dishwasher (75×75)', category: 'commercial', wCm: 75, dCm: 75, hCm: 150, desc: 'Commercial hood-type dishwashing machine', type: 'appliance' },
  { id: 'laundry-industrial', name: 'Industrial Washer-Extractor (95×95)', category: 'commercial', wCm: 95, dCm: 95, hCm: 145, desc: 'On-premise laundry heavy washer footprint', type: 'appliance' },
  { id: 'cleaners-cupboard', name: 'Cleaner’s Cupboard (120×90)', category: 'commercial', wCm: 120, dCm: 90, hCm: 220, desc: 'Janitorial store with mop sink allowance', type: 'storage' },
  { id: 'server-room-rack-row', name: 'Data Rack Cold-Aisle Containment (600×300)', category: 'commercial', wCm: 600, dCm: 300, hCm: 220, desc: 'Small server room twin rack row envelope', type: 'storage' },
  { id: 'waste-compound', name: 'Refuse / Waste Compound (300×200)', category: 'commercial', wCm: 300, dCm: 200, hCm: 200, desc: 'External bin store enclosure footprint', type: 'structure' },
  { id: 'goods-lift', name: 'Goods Elevator Car (200×250)', category: 'commercial', wCm: 200, dCm: 250, hCm: 250, desc: 'Typical 2-tonne goods lift car footprint', type: 'structure' },
  { id: 'mezz-stair-industrial', name: 'Industrial Mezzanine Stair (100×280)', category: 'commercial', wCm: 100, dCm: 280, hCm: 300, desc: 'Steep-service mezzanine access stair footprint', type: 'stair' },
  { id: 'fire-hose-cabinet', name: 'Fire Hose / Extinguisher Cabinet (60×30)', category: 'commercial', wCm: 60, dCm: 30, hCm: 80, desc: 'Wall-recessed firefighting equipment cabinet', type: 'structure' },
  { id: 'ev-charger-wall', name: 'Wall-Mounted EV Charger (40×20)', category: 'commercial', wCm: 40, dCm: 20, hCm: 60, desc: 'Parking bay wall-pedestal charging unit', type: 'appliance' }
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
  const impH = item.hCm ? formatFeetInches((item.hCm / 100) / UNITS.in.toMeters) : null;

  // Real Footprint Area
  const areaM2 = (item.wCm * item.dCm) / 10000;
  const areaSqFt = areaM2 * 10.7639;

  // Paper Footprint Area
  const paperArea = wRes.value * dRes.value;

  // Classification Tag
  let standardTag = 'Architectural Standard (Neufert)';
  let dimensionType = 'Typical Architectural Standard';
  
  if (item.id.includes('ada') || (item.desc && item.desc.toLowerCase().includes('ada')) || item.name.toLowerCase().includes('ada')) {
    standardTag = 'ADA / Universal Accessible Standard';
    dimensionType = 'Code Mandated Clearance';
  } else if (item.id.includes('bed-') || item.category === 'bedroom') {
    standardTag = 'Standard Mattress Specification';
    dimensionType = 'Exact Standard Size';
  } else if (item.category === 'kitchen' && (item.wCm === 60 || item.wCm === 90 || item.dCm === 60)) {
    standardTag = 'Modular Millwork Standard (600mm)';
    dimensionType = 'Modular System Standard';
  } else if (item.category === 'doors') {
    standardTag = 'Building Code Opening Standard';
    dimensionType = 'Clearance & Egress Standard';
  } else if (item.category === 'living' || item.category === 'dining') {
    standardTag = 'Typical Residential Furniture Range';
    dimensionType = 'Typical Dimension (Allow ±5cm)';
  }

  return {
    item: item,
    ratio: ratio,
    paperUnit: paperUnit,
    paperWidth: wRes.value,
    paperDepth: dRes.value,
    paperFormatted: `${formatNumber(wRes.value, 2)} × ${formatNumber(dRes.value, 2)} ${paperUnit.symbol}`,
    realFormattedMetric: item.hCm ? `${item.wCm} × ${item.dCm} × ${item.hCm} cm` : `${item.wCm} × ${item.dCm} cm`,
    realFormattedImperial: impH ? `${impW} × ${impD} × ${impH}` : `${impW} × ${impD}`,
    footprintM2: formatNumber(areaM2, 2),
    footprintSqFt: formatNumber(areaSqFt, 1),
    paperAreaFormatted: `${formatNumber(paperArea, 2)} ${paperUnit.symbol}²`,
    standardTag: standardTag,
    dimensionType: dimensionType
  };
}

/**
 * Filter furniture catalog by search term, category, and sort order
 * Supports multi-token search by name, category, type, description, and dimensions (e.g. "200", "90x190")
 */
export function filterFurnitureCatalog(catalog, searchQuery = '', category = 'all', sortKey = 'default') {
  const query = searchQuery ? searchQuery.trim().toLowerCase() : '';
  const tokens = query.split(/\s+/).filter(t => t.length > 0);

  let filtered = catalog.filter(item => {
    const matchesCategory = category === 'all' || item.category === category;
    if (!matchesCategory) return false;

    if (tokens.length === 0) return true;

    // Build searchable haystack
    const name = (item.name || '').toLowerCase();
    const desc = (item.desc || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const dimW = `${item.wCm}`;
    const dimD = `${item.dCm}`;
    const dimH = `${item.hCm || ''}`;
    const dimCombo = `${item.wCm}x${item.dCm} ${item.wCm}*${item.dCm} ${item.wCm}×${item.dCm} ${item.wCm}cm ${item.dCm}cm`;

    const haystack = `${name} ${desc} ${cat} ${type} ${dimW} ${dimD} ${dimH} ${dimCombo}`;

    // Every token must match somewhere in the haystack (multi-word tokenized search)
    return tokens.every(token => {
      // Direct substring match
      if (haystack.includes(token)) return true;

      // Handle dimension patterns like 200x200 or 90x190
      if (token.includes('x') || token.includes('*')) {
        const parts = token.split(/[x*]/).filter(Boolean);
        if (parts.length === 2 && parts.every(p => haystack.includes(p))) {
          return true;
        }
      }

      return false;
    });
  });

  // Apply sorting
  if (sortKey && sortKey !== 'default') {
    filtered = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'width_desc':
          return b.wCm - a.wCm;
        case 'width_asc':
          return a.wCm - b.wCm;
        case 'depth_desc':
          return b.dCm - a.dCm;
        case 'depth_asc':
          return a.dCm - b.dCm;
        case 'area_desc':
          return (b.wCm * b.dCm) - (a.wCm * a.dCm);
        case 'area_asc':
          return (a.wCm * a.dCm) - (b.wCm * b.dCm);
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }

  return filtered;
}
