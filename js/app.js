/**
 * Architecture Helping Hand - Unified Standalone Engine & Controller
 * Standalone zero-dependency bundle. Works directly via file:/// and http:// protocols.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DATA STRUCTURES & PRESETS
  // =========================================================================

  const SCALE_PRESETS = [
    // Metric Detail Scales
    { id: '1:1', name: '1:1 (Full Size)', category: 'detail', ratio: 1, type: 'metric', description: 'True size, 1:1 prototypes and components' },
    { id: '1:2', name: '1:2 (Half Size)', category: 'detail', ratio: 2, type: 'metric', description: 'Large architectural details and fixtures' },
    { id: '1:5', name: '1:5 (Detail)', category: 'detail', ratio: 5, type: 'metric', description: 'Construction details, joinery, assembly' },
    { id: '1:10', name: '1:10 (Component)', category: 'detail', ratio: 10, type: 'metric', description: 'Cabinetry, furniture, interior details' },
    { id: '1:20', name: '1:20 (Interior/Section)', category: 'detail', ratio: 20, type: 'metric', description: 'Room layouts, interior elevations, detailed sections' },
    { id: '1:25', name: '1:25 (Interior)', category: 'detail', ratio: 25, type: 'metric', description: 'Detailed floor plans and structural bays' },

    // Metric Architectural Plans
    { id: '1:50', name: '1:50 (Standard Plan)', category: 'architectural', ratio: 50, type: 'metric', description: 'Standard floor plans, detailed elevations, building sections' },
    { id: '1:100', name: '1:100 (General Plan)', category: 'architectural', ratio: 100, type: 'metric', description: 'General building plans, residential schemes, full elevations' },
    { id: '1:200', name: '1:200 (Site / Large Building)', category: 'architectural', ratio: 200, type: 'metric', description: 'Complex layouts, large commercial buildings, site context' },
    { id: '1:250', name: '1:250 (Site Plan)', category: 'architectural', ratio: 250, type: 'metric', description: 'Intermediate site and plot layouts' },

    // Metric Urban & Topographic
    { id: '1:500', name: '1:500 (Master Plan)', category: 'urban', ratio: 500, type: 'metric', description: 'Master plans, campus layouts, block context' },
    { id: '1:1000', name: '1:1000 (Urban Planning)', category: 'urban', ratio: 1000, type: 'metric', description: 'Neighborhood planning, large site schemes' },
    { id: '1:1250', name: '1:1250 (OS Site Plan)', category: 'urban', ratio: 1250, type: 'metric', description: 'Ordnance survey site boundary plans' },
    { id: '1:2000', name: '1:2000 (District Plan)', category: 'urban', ratio: 2000, type: 'metric', description: 'District zones and infrastructural maps' },
    { id: '1:2500', name: '1:2500 (OS Town Plan)', category: 'urban', ratio: 2500, type: 'metric', description: 'Town masterplanning, survey boundaries' },
    { id: '1:5000', name: '1:5000 (Zoning/Topo)', category: 'urban', ratio: 5000, type: 'metric', description: 'Regional zoning, topographic mapping' },
    { id: '1:10000', name: '1:10000 (Regional Map)', category: 'urban', ratio: 10000, type: 'metric', description: 'Geographic and metropolitan maps' },

    // Imperial Architectural Scales
    { id: '1/16"=1\'', name: '1/16" = 1\'-0" (1:192)', category: 'imperial', ratio: 192, type: 'imperial', description: 'Large commercial buildings, site plans' },
    { id: '3/32"=1\'', name: '3/32" = 1\'-0" (1:128)', category: 'imperial', ratio: 128, type: 'imperial', description: 'Large commercial schemes' },
    { id: '1/8"=1\'', name: '1/8" = 1\'-0" (1:96)', category: 'imperial', ratio: 96, type: 'imperial', description: 'Large residential, small commercial plans' },
    { id: '3/16"=1\'', name: '3/16" = 1\'-0" (1:64)', category: 'imperial', ratio: 64, type: 'imperial', description: 'Intermediate architectural plans' },
    { id: '1/4"=1\'', name: '1/4" = 1\'-0" (1:48)', category: 'imperial', ratio: 48, type: 'imperial', description: 'Standard US residential floor plans & elevations' },
    { id: '3/8"=1\'', name: '3/8" = 1\'-0" (1:32)', category: 'imperial', ratio: 32, type: 'imperial', description: 'Kitchen/bath layouts, enlarged plans' },
    { id: '1/2"=1\'', name: '1/2" = 1\'-0" (1:24)', category: 'imperial', ratio: 24, type: 'imperial', description: 'Cabinetry, room interior elevations' },
    { id: '3/4"=1\'', name: '3/4" = 1\'-0" (1:16)', category: 'imperial', ratio: 16, type: 'imperial', description: 'Interior details, wall sections' },
    { id: '1"=1\'', name: '1" = 1\'-0" (1:12)', category: 'imperial', ratio: 12, type: 'imperial', description: 'Complex details, stair sections' },
    { id: '1-1/2"=1\'', name: '1-1/2" = 1\'-0" (1:8)', category: 'imperial', ratio: 8, type: 'imperial', description: 'Window, door, and millwork details' },
    { id: '3"=1\'', name: '3" = 1\'-0" (1:4)', category: 'imperial', ratio: 4, type: 'imperial', description: 'Full architectural detail drawings' }
  ];

  const UNITS = {
    mm: { name: 'Millimeters (mm)', symbol: 'mm', toMeters: 0.001, type: 'metric' },
    cm: { name: 'Centimeters (cm)', symbol: 'cm', toMeters: 0.01, type: 'metric' },
    dm: { name: 'Decimeters (dm)', symbol: 'dm', toMeters: 0.1, type: 'metric' },
    m:  { name: 'Meters (m)', symbol: 'm', toMeters: 1.0, type: 'metric' },
    km: { name: 'Kilometers (km)', symbol: 'km', toMeters: 1000.0, type: 'metric' },

    in: { name: 'Inches (in / ″)', symbol: 'in', toMeters: 0.0254, type: 'imperial' },
    ft: { name: 'Feet (ft / ′)', symbol: 'ft', toMeters: 0.3048, type: 'imperial' },
    yd: { name: 'Yards (yd)', symbol: 'yd', toMeters: 0.9144, type: 'imperial' },
    mi: { name: 'Miles (mi)', symbol: 'mi', toMeters: 1609.344, type: 'imperial' }
  };

  const AREA_UNITS = {
    mm2: { name: 'Square Millimeters (mm²)', symbol: 'mm²', toSqMeters: 0.000001, type: 'metric' },
    cm2: { name: 'Square Centimeters (cm²)', symbol: 'cm²', toSqMeters: 0.0001, type: 'metric' },
    m2:  { name: 'Square Meters (m²)', symbol: 'm²', toSqMeters: 1.0, type: 'metric' },
    km2: { name: 'Square Kilometers (km²)', symbol: 'km²', toSqMeters: 1000000.0, type: 'metric' },
    ha:  { name: 'Hectares (ha)', symbol: 'ha', toSqMeters: 10000.0, type: 'metric' },
    sq_in: { name: 'Square Inches (sq in)', symbol: 'sq in', toSqMeters: 0.00064516, type: 'imperial' },
    sq_ft: { name: 'Square Feet (sq ft)', symbol: 'sq ft', toSqMeters: 0.09290304, type: 'imperial' },
    sq_yd: { name: 'Square Yards (sq yd)', symbol: 'sq yd', toSqMeters: 0.83612736, type: 'imperial' },
    acre:  { name: 'Acres (ac)', symbol: 'ac', toSqMeters: 4046.8564224, type: 'imperial' }
  };

  const VOLUME_UNITS = {
    mm3: { name: 'Cubic Millimeters (mm³)', symbol: 'mm³', toCuMeters: 1e-9, type: 'metric' },
    cm3: { name: 'Cubic Centimeters (cm³ / cc)', symbol: 'cm³', toCuMeters: 1e-6, type: 'metric' },
    m3:  { name: 'Cubic Meters (m³)', symbol: 'm³', toCuMeters: 1.0, type: 'metric' },
    liters: { name: 'Liters (L)', symbol: 'L', toCuMeters: 0.001, type: 'metric' },
    cu_in: { name: 'Cubic Inches (cu in)', symbol: 'cu in', toCuMeters: 1.6387064e-5, type: 'imperial' },
    cu_ft: { name: 'Cubic Feet (cu ft)', symbol: 'cu ft', toCuMeters: 0.028316846592, type: 'imperial' },
    cu_yd: { name: 'Cubic Yards (cu yd)', symbol: 'cu yd', toCuMeters: 0.764554857984, type: 'imperial' }
  };

  const REAL_WORLD_REFERENCES = [
    { minMeters: 0.0, maxMeters: 0.25, name: 'Architectural Pen / Brick', icon: 'pen', defaultLength: 0.21, description: 'Standard drawing instrument or brick thickness (~215mm)' },
    { minMeters: 0.25, maxMeters: 0.75, name: 'Desk Chair / T-Square', icon: 'chair', defaultLength: 0.60, description: 'Standard desk chair width or drawing ruler (~60cm)' },
    { minMeters: 0.75, maxMeters: 1.5, name: 'Drafting Table / Desk', icon: 'desk', defaultLength: 1.20, description: 'Studio drafting desk or standard door opening (~1.2m)' },
    { minMeters: 1.5, maxMeters: 2.5, name: 'Human Figure / Doorway', icon: 'human', defaultLength: 1.80, description: 'Architectural human scale (1.8m) & standard door (2.1m)' },
    { minMeters: 2.5, maxMeters: 5.5, name: 'Compact Vehicle / Room Span', icon: 'car', defaultLength: 4.50, description: 'Standard vehicle length (4.5m) or bedroom dimension' },
    { minMeters: 5.5, maxMeters: 15.0, name: '2-Story House / City Bus', icon: 'house', defaultLength: 10.0, description: 'Residential townhouse footprint or transit bus' },
    { minMeters: 15.0, maxMeters: 60.0, name: 'Olympic Pool / Apartment Block', icon: 'building', defaultLength: 50.0, description: '50m competition pool or medium residential block' },
    { minMeters: 60.0, maxMeters: 250.0, name: 'Football Stadium / High-Rise', icon: 'tower', defaultLength: 120.0, description: 'Standard stadium (105m) or 30-story commercial tower' },
    { minMeters: 250.0, maxMeters: Infinity, name: 'Urban Masterplan / City Grid', icon: 'city', defaultLength: 1000.0, description: 'City blocks, transport corridors & regional masterplan' }
  ];

  // =========================================================================
  // 1.1 COMPREHENSIVE ARCHITECTURAL FURNITURE DATABASE
  // =========================================================================

  const FURNITURE_DATABASE = [
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
    { id: 'door-800', name: 'Standard Interior Door (800mm)', category: 'doors', wCm: 80, dCm: 10, hCm: 210, desc: 'Standard bedroom / bathroom single hinged door (swing zone included)', type: 'door' },
    { id: 'door-900', name: 'Main Entrance Door (900mm)', category: 'doors', wCm: 90, dCm: 10, hCm: 210, desc: 'Primary front entrance single leaf door', type: 'door' },
    { id: 'door-double', name: 'Double French Doors (1600mm)', category: 'doors', wCm: 160, dCm: 10, hCm: 210, desc: 'Double leaf swinging doors for living or balcony', type: 'door_double' },
    { id: 'door-sliding', name: 'Sliding Patio Door (1800mm)', category: 'doors', wCm: 180, dCm: 12, hCm: 210, desc: '2-panel glazed sliding patio door system', type: 'door_sliding' },
    { id: 'clearance-hall', name: 'Standard Walkway Clearance', category: 'doors', wCm: 90, dCm: 90, hCm: 240, desc: 'Minimum residential corridor & walking clearance (900mm)', type: 'clearance' },
    { id: 'clearance-wheelchair', name: 'Accessible Corridor Clearance', category: 'doors', wCm: 120, dCm: 120, hCm: 240, desc: 'ADA / Universal wheelchair turning and corridor span (1200mm)', type: 'clearance' }
  ];

  // =========================================================================
  // 2. MATHEMATICAL CALCULATION ENGINE
  // =========================================================================

  function parseArchitecturalInput(inputStr) {
    if (typeof inputStr === 'number') return inputStr;
    if (!inputStr) return 0;

    const clean = inputStr.toString().trim().replace(/,/g, '');

    const feetInchesMatch = clean.match(/^(\d+(?:\.\d+)?)\s*['′]\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*["″]?\s*)?$/);
    if (feetInchesMatch) {
      const feet = parseFloat(feetInchesMatch[1]) || 0;
      let inches = 0;
      if (feetInchesMatch[2]) {
        inches = parseFraction(feetInchesMatch[2]);
      }
      return feet * 12 + inches;
    }

    return parseFraction(clean);
  }

  function parseFraction(str) {
    const parts = str.trim().split(/\s+/);
    if (parts.length === 2) {
      const whole = parseFloat(parts[0]) || 0;
      const fracParts = parts[1].split('/');
      if (fracParts.length === 2) {
        const num = parseFloat(fracParts[0]) || 0;
        const den = parseFloat(fracParts[1]) || 1;
        return whole + (num / den);
      }
      return whole;
    } else if (parts.length === 1) {
      const fracParts = parts[0].split('/');
      if (fracParts.length === 2) {
        const num = parseFloat(fracParts[0]) || 0;
        const den = parseFloat(fracParts[1]) || 1;
        return num / den;
      }
      return parseFloat(parts[0]) || 0;
    }
    return 0;
  }

  function formatNumber(val, decimals = 3) {
    if (val === undefined || val === null || isNaN(val)) return '0';
    if (val === 0) return '0';

    const abs = Math.abs(val);
    if (abs < 0.00001 || abs >= 1e9) {
      return val.toExponential(4);
    }

    const factor = Math.pow(10, decimals);
    const rounded = Math.round((val + Number.EPSILON) * factor) / factor;
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  function formatFeetInches(totalInches, precision = 16) {
    if (isNaN(totalInches)) return '0"';
    const total = Math.abs(totalInches);
    const feet = Math.floor(total / 12);
    const inches = total % 12;
    const wholeInches = Math.floor(inches);
    const fraction = inches - wholeInches;

    let num16 = Math.round(fraction * precision);
    let den = precision;

    let extraInches = 0;
    if (num16 === den) {
      extraInches = 1;
      num16 = 0;
    }

    const finalInches = wholeInches + extraInches;
    let finalFeet = feet;
    let displayInches = finalInches;

    if (displayInches >= 12) {
      finalFeet += Math.floor(displayInches / 12);
      displayInches = displayInches % 12;
    }

    let fracStr = '';
    if (num16 > 0) {
      while (num16 % 2 === 0 && den % 2 === 0) {
        num16 /= 2;
        den /= 2;
      }
      fracStr = `${num16}/${den}`;
    }

    let inchPart = '';
    if (displayInches > 0 || fracStr) {
      if (fracStr && displayInches > 0) {
        inchPart = `${displayInches} ${fracStr}"`;
      } else if (fracStr) {
        inchPart = `${fracStr}"`;
      } else {
        inchPart = `${displayInches}"`;
      }
    }

    if (finalFeet > 0) {
      return (totalInches < 0 ? '-' : '') + `${finalFeet}'-${inchPart || '0"'}`;
    }
    return (totalInches < 0 ? '-' : '') + (inchPart || '0"');
  }

  function drawingToReal({ drawingVal, drawingUnitKey, scaleRatio, realUnitKey }) {
    const drawingUnit = UNITS[drawingUnitKey] || UNITS.cm;
    const realUnit = UNITS[realUnitKey] || UNITS.m;
    const drawingMeters = drawingVal * drawingUnit.toMeters;
    const realMeters = drawingMeters * scaleRatio;
    const realResult = realMeters / realUnit.toMeters;

    return {
      realValue: realResult,
      realMeters: realMeters,
      drawingMeters: drawingMeters,
      realUnit: realUnit,
      drawingUnit: drawingUnit
    };
  }

  function realToDrawing({ realVal, realUnitKey, scaleRatio, drawingUnitKey }) {
    const realUnit = UNITS[realUnitKey] || UNITS.m;
    const drawingUnit = UNITS[drawingUnitKey] || UNITS.cm;
    const realMeters = realVal * realUnit.toMeters;
    const drawingMeters = realMeters / scaleRatio;
    const drawingResult = drawingMeters / drawingUnit.toMeters;

    return {
      drawingValue: drawingResult,
      drawingMeters: drawingMeters,
      realMeters: realMeters,
      drawingUnit: drawingUnit,
      realUnit: realUnit
    };
  }

  function rescaleDrawing({ originalVal, originalUnitKey, originalRatio, targetRatio, targetUnitKey }) {
    const origUnit = UNITS[originalUnitKey] || UNITS.cm;
    const targetUnit = UNITS[targetUnitKey] || UNITS.cm;
    const realMeters = (originalVal * origUnit.toMeters) * originalRatio;
    const targetMeters = realMeters / targetRatio;
    const targetVal = targetMeters / targetUnit.toMeters;
    const factor = originalRatio / targetRatio;

    return {
      targetValue: targetVal,
      realMeters: realMeters,
      factor: factor,
      origUnit: origUnit,
      targetUnit: targetUnit
    };
  }

  function detectScale({ paperVal, paperUnitKey, realVal, realUnitKey }) {
    const paperUnit = UNITS[paperUnitKey] || UNITS.cm;
    const realUnit = UNITS[realUnitKey] || UNITS.m;
    const paperMeters = paperVal * paperUnit.toMeters;
    const realMeters = realVal * realUnit.toMeters;

    if (paperMeters <= 0 || realMeters <= 0) {
      return { ratio: 0, ratioString: 'N/A', closestPreset: null, error: 'Values must be greater than 0' };
    }

    const calculatedRatio = realMeters / paperMeters;
    let closestPreset = null;
    let minDiff = Infinity;

    for (const preset of SCALE_PRESETS) {
      const diff = Math.abs(preset.ratio - calculatedRatio) / preset.ratio;
      if (diff < minDiff) {
        minDiff = diff;
        closestPreset = {
          ...preset,
          percentDiff: (diff * 100).toFixed(1)
        };
      }
    }

    let ratioString = '';
    if (calculatedRatio >= 1) {
      const roundedRatio = Math.round(calculatedRatio * 100) / 100;
      ratioString = `1 : ${roundedRatio}`;
    } else {
      const enlargement = Math.round((1 / calculatedRatio) * 100) / 100;
      ratioString = `${enlargement} : 1`;
    }

    return {
      ratio: calculatedRatio,
      ratioString: ratioString,
      closestPreset: closestPreset,
      isExactMatch: minDiff < 0.0001
    };
  }

  function scaleArea({ areaVal, inputUnitKey, scaleRatio, outputUnitKey, isDrawingToReal = true }) {
    const inputUnit = AREA_UNITS[inputUnitKey] || AREA_UNITS.cm2;
    const outputUnit = AREA_UNITS[outputUnitKey] || AREA_UNITS.m2;
    const inputSqMeters = areaVal * inputUnit.toSqMeters;
    const scaleFactorSq = Math.pow(scaleRatio, 2);

    let outputSqMeters = isDrawingToReal
      ? inputSqMeters * scaleFactorSq
      : inputSqMeters / scaleFactorSq;

    return {
      resultValue: outputSqMeters / outputUnit.toSqMeters,
      sqMeters: outputSqMeters,
      factor: scaleFactorSq
    };
  }

  function scaleVolume({ volumeVal, inputUnitKey, scaleRatio, outputUnitKey, isDrawingToReal = true }) {
    const inputUnit = VOLUME_UNITS[inputUnitKey] || VOLUME_UNITS.cm3;
    const outputUnit = VOLUME_UNITS[outputUnitKey] || VOLUME_UNITS.m3;
    const inputCuMeters = volumeVal * inputUnit.toCuMeters;
    const scaleFactorCube = Math.pow(scaleRatio, 3);

    let outputCuMeters = isDrawingToReal
      ? inputCuMeters * scaleFactorCube
      : inputCuMeters / scaleFactorCube;

    return {
      resultValue: outputCuMeters / outputUnit.toCuMeters,
      cuMeters: outputCuMeters,
      factor: scaleFactorCube
    };
  }

  function getAllUnitEquivalents(meters) {
    const metric = [
      { key: 'mm', label: 'Millimeters', val: meters / UNITS.mm.toMeters, symbol: 'mm' },
      { key: 'cm', label: 'Centimeters', val: meters / UNITS.cm.toMeters, symbol: 'cm' },
      { key: 'dm', label: 'Decimeters', val: meters / UNITS.dm.toMeters, symbol: 'dm' },
      { key: 'm',  label: 'Meters', val: meters / UNITS.m.toMeters, symbol: 'm' },
      { key: 'km', label: 'Kilometers', val: meters / UNITS.km.toMeters, symbol: 'km' }
    ];

    const imperial = [
      { key: 'in', label: 'Inches', val: meters / UNITS.in.toMeters, symbol: 'in' },
      { key: 'ft', label: 'Feet (Decimal)', val: meters / UNITS.ft.toMeters, symbol: 'ft' },
      { key: 'ft_in', label: 'Architectural (Ft-In)', val: formatFeetInches(meters / UNITS.in.toMeters), symbol: '' },
      { key: 'yd', label: 'Yards', val: meters / UNITS.yd.toMeters, symbol: 'yd' },
      { key: 'mi', label: 'Miles', val: meters / UNITS.mi.toMeters, symbol: 'mi' }
    ];

    return { metric, imperial };
  }

  // =========================================================================
  // 3. TACTILE AUDIO SYNTHESIZER
  // =========================================================================

  let audioCtx = null;
  let soundEnabled = true;

  try {
    const saved = localStorage.getItem('archiscale_sound_enabled');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  } catch (e) {}

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function isSoundEnabled() {
    return soundEnabled;
  }

  function setSoundEnabled(enabled) {
    soundEnabled = enabled;
    try {
      localStorage.setItem('archiscale_sound_enabled', enabled ? 'true' : 'false');
    } catch (e) {}
  }

  function playTick() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {}
  }

  function playKeyClick() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }

  function playSwapSound() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  function playCopySuccess() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteTime = now + (i * 0.05);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.04, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.13);
      });
    } catch (e) {}
  }

  // =========================================================================
  // 4. VISUALIZATION & RULER ENGINE
  // =========================================================================

  function updateVisualization({
    containerElement,
    drawingVal,
    drawingUnit,
    realVal,
    realUnit,
    realMeters,
    scaleRatio
  }) {
    if (!containerElement) return;

    const ref = REAL_WORLD_REFERENCES.find(r => realMeters >= r.minMeters && realMeters < r.maxMeters) 
      || REAL_WORLD_REFERENCES[REAL_WORLD_REFERENCES.length - 1];

    const refRatio = realMeters / ref.defaultLength;
    let comparisonText = '';
    if (refRatio < 0.9) {
      comparisonText = `About ${(refRatio * 100).toFixed(0)}% the size of a ${ref.name}`;
    } else if (refRatio >= 0.9 && refRatio <= 1.1) {
      comparisonText = `Roughly equal to the size of a ${ref.name}`;
    } else {
      comparisonText = `About ${refRatio.toFixed(1)}× the size of a ${ref.name}`;
    }

    const refSvg = getReferenceSilhouette(ref.icon);
    const scaleBarHtml = renderGraphicScaleBar(scaleRatio, realMeters);

    containerElement.innerHTML = `
      <div class="visual-panel-inner">
        <div class="visual-header">
          <div class="visual-badge">
            <span class="visual-dot"></span>
            <span class="visual-label">Scale Proportions (1:${scaleRatio})</span>
          </div>
          <div class="visual-context-tag">${ref.name}</div>
        </div>

        <div class="visual-scene">
          <div class="scene-dimension-box">
            <div class="scene-dim-line">
              <span class="dim-tick left"></span>
              <span class="dim-label">${formatNumber(realVal, 2)} ${realUnit.symbol} <small>(${formatNumber(drawingVal, 2)} ${drawingUnit.symbol} on paper)</small></span>
              <span class="dim-tick right"></span>
            </div>
          </div>

          <div class="scene-graphics-row">
            <div class="silhouette-container">
              ${refSvg}
              <span class="silhouette-caption">${ref.name} (~${ref.defaultLength}m)</span>
            </div>
            <div class="scene-comparison-info">
              <div class="comp-headline">${comparisonText}</div>
              <div class="comp-subtext">${ref.description}</div>
            </div>
          </div>
        </div>

        <div class="scale-bar-wrapper">
          <div class="scale-bar-title">Architectural Graphical Scale (1:${scaleRatio})</div>
          ${scaleBarHtml}
        </div>
      </div>
    `;
  }

  function getReferenceSilhouette(iconType) {
    switch (iconType) {
      case 'human':
        return `
          <svg class="ref-silhouette" viewBox="0 0 100 180" fill="currentColor">
            <circle cx="50" cy="22" r="14"/>
            <path d="M30,48 C30,42 40,40 50,40 C60,40 70,42 70,48 L68,100 L58,100 L56,170 L44,170 L42,100 L32,100 Z" />
            <line x1="30" y1="50" x2="18" y2="105" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
            <line x1="70" y1="50" x2="82" y2="105" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
          </svg>
        `;
      case 'desk':
      case 'chair':
        return `
          <svg class="ref-silhouette" viewBox="0 0 140 100" fill="none" stroke="currentColor" stroke-width="4">
            <rect x="15" y="25" width="110" height="10" rx="3" fill="currentColor" fill-opacity="0.2"/>
            <line x1="25" y1="35" x2="25" y2="90" stroke-linecap="round"/>
            <line x1="115" y1="35" x2="115" y2="90" stroke-linecap="round"/>
            <rect x="50" y="45" width="40" height="40" rx="3" fill="currentColor" fill-opacity="0.1"/>
          </svg>
        `;
      case 'door':
        return `
          <svg class="ref-silhouette" viewBox="0 0 100 180" fill="none" stroke="currentColor" stroke-width="4">
            <rect x="15" y="10" width="70" height="160" rx="2" fill="currentColor" fill-opacity="0.1"/>
            <line x1="72" y1="90" x2="78" y2="90" stroke-width="6" stroke-linecap="round"/>
            <path d="M15,10 L15,170 L85,170" stroke-dasharray="4 4" stroke-opacity="0.4"/>
          </svg>
        `;
      case 'car':
        return `
          <svg class="ref-silhouette" viewBox="0 0 180 80" fill="currentColor">
            <path d="M20,50 L40,25 L110,25 L145,45 L170,48 C175,50 175,60 170,62 L15,62 C10,60 10,50 20,50 Z" fill-opacity="0.3" stroke="currentColor" stroke-width="3"/>
            <circle cx="45" cy="62" r="14" fill="currentColor"/>
            <circle cx="135" cy="62" r="14" fill="currentColor"/>
            <circle cx="45" cy="62" r="6" fill="var(--bg-app)"/>
            <circle cx="135" cy="62" r="6" fill="var(--bg-app)"/>
            <path d="M48,32 L105,32 L132,48 L48,48 Z" fill="var(--bg-app)" fill-opacity="0.7"/>
          </svg>
        `;
      case 'house':
        return `
          <svg class="ref-silhouette" viewBox="0 0 160 140" fill="none" stroke="currentColor" stroke-width="3">
            <polygon points="80,15 15,65 145,65" fill="currentColor" fill-opacity="0.25"/>
            <rect x="25" y="65" width="110" height="65" fill="currentColor" fill-opacity="0.1"/>
            <rect x="65" y="85" width="30" height="45" fill="currentColor" fill-opacity="0.4"/>
            <rect x="35" y="75" width="20" height="20"/>
            <rect x="105" y="75" width="20" height="20"/>
          </svg>
        `;
      case 'tower':
      case 'building':
        return `
          <svg class="ref-silhouette" viewBox="0 0 120 180" fill="none" stroke="currentColor" stroke-width="3">
            <rect x="25" y="20" width="70" height="150" fill="currentColor" fill-opacity="0.15"/>
            <line x1="25" y1="50" x2="95" y2="50"/>
            <line x1="25" y1="80" x2="95" y2="80"/>
            <line x1="25" y1="110" x2="95" y2="110"/>
            <line x1="25" y1="140" x2="95" y2="140"/>
            <line x1="60" y1="20" x2="60" y2="170"/>
          </svg>
        `;
      default:
        return `
          <svg class="ref-silhouette" viewBox="0 0 100 100" fill="currentColor">
            <polygon points="50,15 85,85 15,85" fill-opacity="0.2" stroke="currentColor" stroke-width="3"/>
            <circle cx="50" cy="50" r="15"/>
          </svg>
        `;
    }
  }

  function renderGraphicScaleBar(ratio, realMeters) {
    let stepMeters = 1;
    if (ratio <= 10) stepMeters = 0.1;
    else if (ratio <= 50) stepMeters = 1;
    else if (ratio <= 200) stepMeters = 5;
    else if (ratio <= 1000) stepMeters = 20;
    else if (ratio <= 5000) stepMeters = 100;
    else stepMeters = 500;

    const totalSteps = 4;
    const segments = [];

    for (let i = 0; i <= totalSteps; i++) {
      const val = i * stepMeters;
      let label = `${val}m`;
      if (val >= 1000) label = `${val / 1000}km`;
      else if (val < 1) label = `${(val * 100).toFixed(0)}cm`;
      segments.push({ stepIndex: i, label });
    }

    return `
      <div class="scale-bar-container">
        <div class="scale-bar-blocks">
          <div class="scale-segment solid"></div>
          <div class="scale-segment outline"></div>
          <div class="scale-segment solid"></div>
          <div class="scale-segment outline"></div>
        </div>
        <div class="scale-bar-labels">
          ${segments.map(s => `<span>${s.label}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 4.1 FURNITURE 2D ARCHITECTURAL TOP-DOWN PLAN RENDERER
  // =========================================================================

  function renderFurniturePlanSVG(item) {
    const type = item.type || 'table';
    switch (type) {
      case 'sofa':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="5" y="5" width="150" height="70" rx="8" fill="currentColor" fill-opacity="0.12"/>
            <path d="M5,22 L155,22" stroke-width="2" stroke-dasharray="2 2"/>
            <rect x="8" y="8" width="18" height="64" rx="4" fill="currentColor" fill-opacity="0.2"/>
            <rect x="134" y="8" width="18" height="64" rx="4" fill="currentColor" fill-opacity="0.2"/>
            <rect x="28" y="8" width="104" height="16" rx="3" fill="currentColor" fill-opacity="0.25"/>
            <line x1="62" y1="24" x2="62" y2="72" stroke="currentColor" stroke-width="1.5"/>
            <line x1="98" y1="24" x2="98" y2="72" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        `;
      case 'sectional':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5,5 L155,5 L155,60 L95,60 L95,105 L5,105 Z" rx="6" fill="currentColor" fill-opacity="0.15"/>
            <path d="M5,22 L155,22" stroke-width="2"/>
            <path d="M78,22 L78,105" stroke-width="2"/>
            <rect x="8" y="8" width="18" height="94" rx="3" fill="currentColor" fill-opacity="0.2"/>
          </svg>
        `;
      case 'bed':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="120" height="100" rx="4" fill="currentColor" fill-opacity="0.1"/>
            <rect x="10" y="10" width="120" height="18" rx="2" fill="currentColor" fill-opacity="0.3"/>
            <!-- Pillows -->
            <rect x="18" y="34" width="46" height="28" rx="4" fill="currentColor" fill-opacity="0.25"/>
            <rect x="76" y="34" width="46" height="28" rx="4" fill="currentColor" fill-opacity="0.25"/>
            <!-- Folded sheet line -->
            <path d="M10,72 Q70,80 130,72" stroke-width="2" stroke-dasharray="3 3"/>
          </svg>
        `;
      case 'bed_single':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 90 120" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="70" height="100" rx="4" fill="currentColor" fill-opacity="0.1"/>
            <rect x="10" y="10" width="70" height="16" rx="2" fill="currentColor" fill-opacity="0.3"/>
            <rect x="20" y="32" width="50" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
            <path d="M10,70 Q45,76 80,70" stroke-width="2" stroke-dasharray="3 3"/>
          </svg>
        `;
      case 'table':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="120" height="60" rx="4" fill="currentColor" fill-opacity="0.18"/>
            <circle cx="20" cy="20" r="4" fill="currentColor"/>
            <circle cx="120" cy="20" r="4" fill="currentColor"/>
            <circle cx="20" cy="60" r="4" fill="currentColor"/>
            <circle cx="120" cy="60" r="4" fill="currentColor"/>
          </svg>
        `;
      case 'table_round':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="50" cy="50" r="40" fill="currentColor" fill-opacity="0.18"/>
            <circle cx="50" cy="50" r="8" stroke-dasharray="2 2"/>
          </svg>
        `;
      case 'chair':
      case 'chair_small':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="15" y="15" width="50" height="50" rx="6" fill="currentColor" fill-opacity="0.15"/>
            <path d="M15,28 L65,28" stroke-width="2"/>
            <rect x="18" y="18" width="44" height="10" rx="3" fill="currentColor" fill-opacity="0.3"/>
          </svg>
        `;
      case 'chair_round':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="40" cy="40" r="28" fill="currentColor" fill-opacity="0.18"/>
            <line x1="40" y1="12" x2="40" y2="68" stroke-dasharray="2 2"/>
            <line x1="12" y1="40" x2="68" y2="40" stroke-dasharray="2 2"/>
          </svg>
        `;
      case 'toilet':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 80 100" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="15" y="10" width="50" height="22" rx="3" fill="currentColor" fill-opacity="0.25"/>
            <ellipse cx="40" cy="60" rx="22" ry="28" fill="currentColor" fill-opacity="0.12"/>
            <ellipse cx="40" cy="62" rx="14" ry="18" stroke-dasharray="2 2"/>
          </svg>
        `;
      case 'sink':
      case 'vanity':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="100" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
            <ellipse cx="60" cy="40" rx="30" ry="20" fill="currentColor" fill-opacity="0.2"/>
            <circle cx="60" cy="40" r="4" fill="currentColor"/>
          </svg>
        `;
      case 'bath':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 150 75" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="8" y="8" width="134" height="59" rx="16" fill="currentColor" fill-opacity="0.15"/>
            <ellipse cx="75" cy="37" rx="55" ry="22" stroke-dasharray="3 3"/>
            <circle cx="28" cy="37" r="4" fill="currentColor"/>
          </svg>
        `;
      case 'shower':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="70" height="70" fill="currentColor" fill-opacity="0.1"/>
            <line x1="10" y1="10" x2="80" y2="80" stroke-dasharray="3 3"/>
            <line x1="10" y1="80" x2="80" y2="10" stroke-dasharray="3 3"/>
            <circle cx="45" cy="45" r="8" fill="currentColor" fill-opacity="0.3"/>
          </svg>
        `;
      case 'cooktop':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="70" height="70" rx="3" fill="currentColor" fill-opacity="0.15"/>
            <circle cx="30" cy="30" r="12" stroke-width="2"/>
            <circle cx="60" cy="30" r="8" stroke-width="2"/>
            <circle cx="30" cy="60" r="9" stroke-width="2"/>
            <circle cx="60" cy="60" r="14" stroke-width="2"/>
          </svg>
        `;
      case 'door':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="12" height="8" fill="currentColor"/>
            <rect x="80" y="10" width="12" height="8" fill="currentColor"/>
            <line x1="22" y1="14" x2="22" y2="78" stroke-width="3"/>
            <path d="M22,78 A64,64 0 0,0 86,14" stroke-width="2" stroke-dasharray="4 4"/>
          </svg>
        `;
      case 'door_double':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="15" y1="15" x2="15" y2="55" stroke-width="3"/>
            <line x1="125" y1="15" x2="125" y2="55" stroke-width="3"/>
            <path d="M15,55 A40,40 0 0,0 55,15" stroke-width="2" stroke-dasharray="3 3"/>
            <path d="M125,55 A40,40 0 0,1 85,15" stroke-width="2" stroke-dasharray="3 3"/>
          </svg>
        `;
      case 'door_sliding':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 140 50" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="16" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
            <rect x="65" y="26" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
            <line x1="10" y1="20" x2="130" y2="20" stroke-dasharray="2 2"/>
          </svg>
        `;
      case 'clearance':
        return `
          <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="10" y="10" width="80" height="80" stroke-dasharray="4 4" fill="currentColor" fill-opacity="0.08"/>
            <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor"/>
            <polyline points="20 45 10 50 20 55"/>
            <polyline points="80 45 90 50 80 55"/>
          </svg>
        `;
      default:
        return `
          <svg class="furn-plan-svg" viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="10" y="10" width="80" height="40" rx="4" fill="currentColor" fill-opacity="0.18"/>
          </svg>
        `;
    }
  }

  // =========================================================================
  // 5. HISTORY ENGINE
  // =========================================================================

  const STORAGE_KEY = 'archiscale_calculation_history';
  let historyList = [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) historyList = JSON.parse(saved);
  } catch (e) {
    historyList = [];
  }

  function getHistory() {
    return [...historyList];
  }

  function addHistoryEntry(entry) {
    const item = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      ...entry
    };

    if (historyList.length > 0) {
      const last = historyList[0];
      if (last.mode === item.mode && last.inputStr === item.inputStr && last.outputStr === item.outputStr && last.scaleStr === item.scaleStr) {
        return;
      }
    }

    historyList.unshift(item);
    if (historyList.length > 50) historyList.pop();
    saveHistory();
    return item;
  }

  function removeHistoryEntry(id) {
    historyList = historyList.filter(item => item.id !== id);
    saveHistory();
  }

  function clearHistory() {
    historyList = [];
    saveHistory();
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyList));
    } catch (e) {}
  }

  function exportHistoryCSV() {
    if (historyList.length === 0) return null;
    const headers = ['Timestamp', 'Date', 'Mode', 'Scale', 'Input', 'Result', 'Notes'];
    const rows = historyList.map(h => [
      `"${h.timestamp}"`,
      `"${h.date}"`,
      `"${h.mode || 'Scale'}"`,
      `"${h.scaleStr || ''}"`,
      `"${h.inputStr || ''}"`,
      `"${h.outputStr || ''}"`,
      `"${h.notes || ''}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  function exportHistoryMarkdown() {
    if (historyList.length === 0) return null;
    let md = '# Architecture Helping Hand - Architectural Scaling Log\n\n';
    md += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    md += '| Time | Mode | Scale | Input | Result |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    historyList.forEach(h => {
      md += `| ${h.timestamp} | ${h.mode || 'Scale'} | ${h.scaleStr || '-'} | ${h.inputStr || '-'} | **${h.outputStr || '-'}** |\n`;
    });
    return md;
  }

  // =========================================================================
  // 6. MAIN APPLICATION CONTROLLER
  // =========================================================================

  const state = {
    currentMode: 'converter',
    activeTheme: 'dark',
    precision: 3,

    // Mode 1: Main Converter
    direction: 'drawing_to_real',
    scaleRatio: 50,
    selectedPresetId: '1:50',
    drawingVal: 10,
    drawingUnit: 'cm',
    realVal: 5,
    realUnit: 'm',

    // Mode 2: Rescale
    rescaleOrigVal: 12,
    rescaleOrigUnit: 'cm',
    rescaleOrigRatio: 50,
    rescaleTargetRatio: 200,
    rescaleTargetUnit: 'cm',

    // Mode 3: Detector
    detectorPaperVal: 4.5,
    detectorPaperUnit: 'cm',
    detectorRealVal: 9,
    detectorRealUnit: 'm',

    // Mode 4: Area & Volume
    areaVolType: 'area',
    areaVolRatio: 100,
    areaInputUnit: 'cm2',
    areaOutputUnit: 'm2',
    volInputUnit: 'cm3',
    volOutputUnit: 'm3',

    // Mode 6: Furniture Scaling
    furnRatio: 50,
    furnCategory: 'all',
    furnSearchQuery: '',
    furnPaperUnit: 'cm'
  };

  let dom = {};

  function initApp() {
    cacheDomElements();
    initThemes();
    initSoundToggle();
    populatePresets();
    populateUnitDropdowns();
    bindEventListeners();
    bindKeyboardShortcuts();
    calculateMainConverter();
    renderFurnitureGrid();
    renderHistoryList();
  }

  function cacheDomElements() {
    dom = {
      themeSelect: document.getElementById('theme-select'),
      soundToggleBtn: document.getElementById('sound-toggle-btn'),
      historyToggleBtn: document.getElementById('history-toggle-btn'),
      shortcutsModalBtn: document.getElementById('shortcuts-modal-btn'),
      shortcutsModal: document.getElementById('shortcuts-modal'),
      closeShortcutsBtn: document.getElementById('close-shortcuts-btn'),
      toastContainer: document.getElementById('toast-container'),

      // History Drawer
      historyDrawer: document.getElementById('history-drawer'),
      historyOverlay: document.getElementById('history-overlay'),
      closeHistoryBtn: document.getElementById('close-history-btn'),
      historyList: document.getElementById('history-list'),
      clearHistoryBtn: document.getElementById('clear-history-btn'),
      exportCsvBtn: document.getElementById('export-csv-btn'),
      exportMdBtn: document.getElementById('export-md-btn'),

      // Mode Navigation Tabs
      modeTabs: document.querySelectorAll('.mode-tab'),
      modeViews: document.querySelectorAll('.tool-mode-view'),

      // Main Converter Elements
      presetCategoryPills: document.getElementById('preset-category-pills'),
      presetsGrid: document.getElementById('presets-grid'),
      customScaleInput: document.getElementById('custom-scale-input'),
      mainInputVal: document.getElementById('main-input-val'),
      mainInputUnit: document.getElementById('main-input-unit'),
      mainInputBadge: document.getElementById('main-input-badge'),
      mainOutputBadge: document.getElementById('main-output-badge'),
      mainOutputUnit: document.getElementById('main-output-unit'),
      swapDirectionBtn: document.getElementById('swap-direction-btn'),
      resultDisplayVal: document.getElementById('result-display-val'),
      resultDisplayUnit: document.getElementById('result-display-unit'),
      copyResultBtn: document.getElementById('copy-result-btn'),
      saveHistoryBtn: document.getElementById('save-history-btn'),
      visualContainer: document.getElementById('visual-container'),
      equivGrid: document.getElementById('equiv-grid'),

      // Rescale Elements
      rescaleOrigInput: document.getElementById('rescale-orig-val'),
      rescaleOrigUnit: document.getElementById('rescale-orig-unit'),
      rescaleOrigRatio: document.getElementById('rescale-orig-ratio'),
      rescaleTargetRatio: document.getElementById('rescale-target-ratio'),
      rescaleTargetUnit: document.getElementById('rescale-target-unit'),
      rescaleResultVal: document.getElementById('rescale-result-val'),
      rescaleFactorVal: document.getElementById('rescale-factor-val'),
      copyRescaleBtn: document.getElementById('copy-rescale-btn'),

      // Detector Elements
      detectorPaperVal: document.getElementById('detector-paper-val'),
      detectorPaperUnit: document.getElementById('detector-paper-unit'),
      detectorRealVal: document.getElementById('detector-real-val'),
      detectorRealUnit: document.getElementById('detector-real-unit'),
      detectorRatioDisplay: document.getElementById('detector-ratio-display'),
      detectorClosestPreset: document.getElementById('detector-closest-preset'),
      useDetectedScaleBtn: document.getElementById('use-detected-scale-btn'),

      // Area & Volume Elements
      areaVolTypeSelect: document.getElementById('areavol-type-select'),
      areaVolRatioInput: document.getElementById('areavol-ratio-input'),
      areaVolInputVal: document.getElementById('areavol-input-val'),
      areaVolInputUnit: document.getElementById('areavol-input-unit'),
      areaVolOutputUnit: document.getElementById('areavol-output-unit'),
      areaVolResultVal: document.getElementById('areavol-result-val'),
      copyAreaVolBtn: document.getElementById('copy-areavol-btn'),

      // Furniture Scaling Elements
      furnitureSearchInput: document.getElementById('furniture-search-input'),
      clearFurnitureSearchBtn: document.getElementById('clear-furniture-search-btn'),
      furnResultsCount: document.getElementById('furn-results-count'),
      furnScalePresets: document.getElementById('furn-scale-presets'),
      furnCustomRatio: document.getElementById('furn-custom-ratio'),
      furnPaperUnitSelect: document.getElementById('furn-paper-unit-select'),
      furnCategoryNav: document.getElementById('furn-category-nav'),
      furnitureCardsGrid: document.getElementById('furniture-cards-grid'),
      customFurnName: document.getElementById('custom-furn-name'),
      customFurnW: document.getElementById('custom-furn-w'),
      customFurnD: document.getElementById('custom-furn-d'),
      customFurnUnit: document.getElementById('custom-furn-unit'),
      customFurnResult: document.getElementById('custom-furn-result'),

      // Reference Chart
      referenceScaleSelect: document.getElementById('ref-scale-select'),
      referenceTableBody: document.getElementById('ref-table-body')
    };
  }

  function initThemes() {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('archiscale_theme') || 'dark';
    } catch (e) {}
    setTheme(savedTheme);

    if (dom.themeSelect) {
      dom.themeSelect.value = savedTheme;
      dom.themeSelect.addEventListener('change', (e) => {
        setTheme(e.target.value);
        playTick();
      });
    }
  }

  function setTheme(theme) {
    state.activeTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('archiscale_theme', theme);
    } catch (e) {}
  }

  function initSoundToggle() {
    updateSoundButtonUI();
    if (dom.soundToggleBtn) {
      dom.soundToggleBtn.addEventListener('click', () => {
        const newState = !isSoundEnabled();
        setSoundEnabled(newState);
        updateSoundButtonUI();
        if (newState) playTick();
        showToast(newState ? 'Tactile sound enabled' : 'Tactile sound muted');
      });
    }
  }

  function updateSoundButtonUI() {
    if (!dom.soundToggleBtn) return;
    const enabled = isSoundEnabled();
    dom.soundToggleBtn.classList.toggle('active', enabled);
    dom.soundToggleBtn.innerHTML = enabled 
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Sound: On`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> Sound: Muted`;
  }

  function populatePresets(category = 'all') {
    if (!dom.presetsGrid) return;
    dom.presetsGrid.innerHTML = '';

    const filtered = category === 'all' 
      ? SCALE_PRESETS 
      : SCALE_PRESETS.filter(p => p.category === category || p.type === category);

    filtered.forEach(preset => {
      const chip = document.createElement('button');
      chip.className = `preset-chip ${state.selectedPresetId === preset.id ? 'active' : ''}`;
      chip.textContent = preset.id;
      chip.title = `${preset.name} - ${preset.description}`;
      chip.dataset.ratio = preset.ratio;
      chip.dataset.id = preset.id;

      chip.addEventListener('click', () => {
        selectScalePreset(preset);
        playKeyClick();
      });

      dom.presetsGrid.appendChild(chip);
    });
  }

  function selectScalePreset(preset) {
    state.scaleRatio = preset.ratio;
    state.selectedPresetId = preset.id;
    if (dom.customScaleInput) {
      dom.customScaleInput.value = preset.ratio;
    }

    document.querySelectorAll('.preset-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.id === preset.id);
    });

    calculateMainConverter();
  }

  function populateUnitDropdowns() {
    const lengthOptions = Object.entries(UNITS).map(([key, u]) => `<option value="${key}">${u.name}</option>`).join('');

    if (dom.mainInputUnit) dom.mainInputUnit.innerHTML = lengthOptions;
    if (dom.mainOutputUnit) dom.mainOutputUnit.innerHTML = lengthOptions;
    if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.innerHTML = lengthOptions;
    if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.innerHTML = lengthOptions;
    if (dom.detectorPaperUnit) dom.detectorPaperUnit.innerHTML = lengthOptions;
    if (dom.detectorRealUnit) dom.detectorRealUnit.innerHTML = lengthOptions;

    if (dom.mainInputUnit) dom.mainInputUnit.value = state.drawingUnit;
    if (dom.mainOutputUnit) dom.mainOutputUnit.value = state.realUnit;

    updateAreaVolUnitDropdowns();
    populateReferenceScaleDropdown();
  }

  function updateAreaVolUnitDropdowns() {
    if (!dom.areaVolInputUnit || !dom.areaVolOutputUnit) return;
    const isArea = state.areaVolType === 'area';
    const unitSet = isArea ? AREA_UNITS : VOLUME_UNITS;

    const options = Object.entries(unitSet).map(([key, u]) => `<option value="${key}">${u.name}</option>`).join('');
    dom.areaVolInputUnit.innerHTML = options;
    dom.areaVolOutputUnit.innerHTML = options;

    if (isArea) {
      dom.areaVolInputUnit.value = state.areaInputUnit;
      dom.areaVolOutputUnit.value = state.areaOutputUnit;
    } else {
      dom.areaVolInputUnit.value = state.volInputUnit;
      dom.areaVolOutputUnit.value = state.volOutputUnit;
    }
  }

  function populateReferenceScaleDropdown() {
    if (!dom.referenceScaleSelect) return;
    dom.referenceScaleSelect.innerHTML = SCALE_PRESETS.map(p => `<option value="${p.ratio}">${p.name}</option>`).join('');
    dom.referenceScaleSelect.value = state.scaleRatio;
  }

  function bindEventListeners() {
    dom.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchMode(tab.dataset.mode);
        playTick();
      });
    });

    document.querySelectorAll('.preset-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        populatePresets(btn.dataset.category);
        playTick();
      });
    });

    if (dom.customScaleInput) {
      dom.customScaleInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          state.scaleRatio = val;
          state.selectedPresetId = null;
          document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
          calculateMainConverter();
        }
      });
    }

    if (dom.mainInputVal) {
      dom.mainInputVal.addEventListener('input', () => calculateMainConverter());
    }

    if (dom.mainInputUnit) {
      dom.mainInputUnit.addEventListener('change', (e) => {
        if (state.direction === 'drawing_to_real') {
          state.drawingUnit = e.target.value;
        } else {
          state.realUnit = e.target.value;
        }
        playTick();
        calculateMainConverter();
      });
    }

    if (dom.mainOutputUnit) {
      dom.mainOutputUnit.addEventListener('change', (e) => {
        if (state.direction === 'drawing_to_real') {
          state.realUnit = e.target.value;
        } else {
          state.drawingUnit = e.target.value;
        }
        playTick();
        calculateMainConverter();
      });
    }

    if (dom.swapDirectionBtn) {
      dom.swapDirectionBtn.addEventListener('click', () => {
        swapDirection();
        playSwapSound();
      });
    }

    if (dom.copyResultBtn) {
      dom.copyResultBtn.addEventListener('click', () => {
        const resultText = `${dom.resultDisplayVal.textContent} ${dom.resultDisplayUnit.textContent}`;
        copyToClipboard(resultText);
      });
    }

    if (dom.saveHistoryBtn) {
      dom.saveHistoryBtn.addEventListener('click', () => {
        saveCurrentToHistory();
        playKeyClick();
      });
    }

    if (dom.historyToggleBtn) dom.historyToggleBtn.addEventListener('click', toggleHistoryDrawer);
    if (dom.closeHistoryBtn) dom.closeHistoryBtn.addEventListener('click', toggleHistoryDrawer);
    if (dom.historyOverlay) dom.historyOverlay.addEventListener('click', toggleHistoryDrawer);
    if (dom.clearHistoryBtn) {
      dom.clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear all calculation history?')) {
          clearHistory();
          renderHistoryList();
          showToast('History cleared');
        }
      });
    }
    if (dom.exportCsvBtn) dom.exportCsvBtn.addEventListener('click', handleExportCSV);
    if (dom.exportMdBtn) dom.exportMdBtn.addEventListener('click', handleExportMarkdown);

    if (dom.shortcutsModalBtn) {
      dom.shortcutsModalBtn.addEventListener('click', () => dom.shortcutsModal.classList.add('open'));
    }
    if (dom.closeShortcutsBtn) {
      dom.closeShortcutsBtn.addEventListener('click', () => dom.shortcutsModal.classList.remove('open'));
    }
    if (dom.shortcutsModal) {
      dom.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === dom.shortcutsModal) dom.shortcutsModal.classList.remove('open');
      });
    }

    [dom.rescaleOrigInput, dom.rescaleOrigUnit, dom.rescaleOrigRatio, dom.rescaleTargetRatio, dom.rescaleTargetUnit].forEach(el => {
      if (el) el.addEventListener('input', calculateRescale);
    });
    if (dom.copyRescaleBtn) {
      dom.copyRescaleBtn.addEventListener('click', () => {
        copyToClipboard(`${dom.rescaleResultVal.textContent} ${dom.rescaleTargetUnit.value}`);
      });
    }

    [dom.detectorPaperVal, dom.detectorPaperUnit, dom.detectorRealVal, dom.detectorRealUnit].forEach(el => {
      if (el) el.addEventListener('input', calculateDetector);
    });
    if (dom.useDetectedScaleBtn) {
      dom.useDetectedScaleBtn.addEventListener('click', useDetectedScaleInMain);
    }

    if (dom.areaVolTypeSelect) {
      dom.areaVolTypeSelect.addEventListener('change', (e) => {
        state.areaVolType = e.target.value;
        updateAreaVolUnitDropdowns();
        calculateAreaVolume();
      });
    }
    [dom.areaVolRatioInput, dom.areaVolInputVal, dom.areaVolInputUnit, dom.areaVolOutputUnit].forEach(el => {
      if (el) el.addEventListener('input', calculateAreaVolume);
    });
    if (dom.copyAreaVolBtn) {
      dom.copyAreaVolBtn.addEventListener('click', () => {
        copyToClipboard(`${dom.areaVolResultVal.textContent} ${dom.areaVolOutputUnit.options[dom.areaVolOutputUnit.selectedIndex].text}`);
      });
    }

    // Furniture Tab Event Listeners
    if (dom.furnitureSearchInput) {
      dom.furnitureSearchInput.addEventListener('input', (e) => {
        state.furnSearchQuery = e.target.value.trim().toLowerCase();
        if (dom.clearFurnitureSearchBtn) {
          dom.clearFurnitureSearchBtn.classList.toggle('visible', !!state.furnSearchQuery);
        }
        renderFurnitureGrid();
      });
    }

    if (dom.clearFurnitureSearchBtn) {
      dom.clearFurnitureSearchBtn.addEventListener('click', () => {
        if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
        state.furnSearchQuery = '';
        dom.clearFurnitureSearchBtn.classList.remove('visible');
        renderFurnitureGrid();
      });
    }

    document.querySelectorAll('.furn-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.furn-preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.furnRatio = parseFloat(chip.dataset.ratio);
        if (dom.furnCustomRatio) dom.furnCustomRatio.value = state.furnRatio;
        playTick();
        renderFurnitureGrid();
        calculateCustomFurniture();
      });
    });

    if (dom.furnCustomRatio) {
      dom.furnCustomRatio.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          state.furnRatio = val;
          document.querySelectorAll('.furn-preset-chip').forEach(c => c.classList.remove('active'));
          renderFurnitureGrid();
          calculateCustomFurniture();
        }
      });
    }

    if (dom.furnPaperUnitSelect) {
      dom.furnPaperUnitSelect.addEventListener('change', (e) => {
        state.furnPaperUnit = e.target.value;
        playTick();
        renderFurnitureGrid();
        calculateCustomFurniture();
      });
    }

    document.querySelectorAll('.furn-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.furn-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.furnCategory = pill.dataset.cat;
        playTick();
        renderFurnitureGrid();
      });
    });

    [dom.customFurnName, dom.customFurnW, dom.customFurnD, dom.customFurnUnit].forEach(el => {
      if (el) el.addEventListener('input', calculateCustomFurniture);
    });

    if (dom.referenceScaleSelect) {
      dom.referenceScaleSelect.addEventListener('change', (e) => {
        renderReferenceTable(parseFloat(e.target.value));
      });
    }
  }

  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        swapDirection();
        playSwapSound();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        toggleHistoryDrawer();
      } else if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        dom.shortcutsModal.classList.toggle('open');
      } else if (e.key >= '1' && e.key <= '6') {
        const modes = ['converter', 'rescale', 'detector', 'area_volume', 'furniture', 'reference'];
        const targetMode = modes[parseInt(e.key) - 1];
        if (targetMode) switchMode(targetMode);
      }
    });
  }

  function switchMode(modeKey) {
    state.currentMode = modeKey;
    dom.modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === modeKey));
    dom.modeViews.forEach(v => v.classList.toggle('active', v.id === `mode-view-${modeKey}`));

    if (modeKey === 'converter') calculateMainConverter();
    else if (modeKey === 'rescale') calculateRescale();
    else if (modeKey === 'detector') calculateDetector();
    else if (modeKey === 'area_volume') calculateAreaVolume();
    else if (modeKey === 'furniture') renderFurnitureGrid();
    else if (modeKey === 'reference') renderReferenceTable(state.scaleRatio);
  }

  function calculateMainConverter() {
    const rawInput = dom.mainInputVal ? dom.mainInputVal.value : '10';
    const inputVal = parseArchitecturalInput(rawInput);
    const ratio = state.scaleRatio || 50;

    let drawingValNum = 0;
    let drawingUnitKey = state.drawingUnit;
    let realValNum = 0;
    let realUnitKey = state.realUnit;
    let realMeters = 0;

    if (state.direction === 'drawing_to_real') {
      drawingValNum = inputVal;
      drawingUnitKey = dom.mainInputUnit.value;
      realUnitKey = dom.mainOutputUnit.value;

      const res = drawingToReal({
        drawingVal: drawingValNum,
        drawingUnitKey: drawingUnitKey,
        scaleRatio: ratio,
        realUnitKey: realUnitKey
      });

      realValNum = res.realValue;
      realMeters = res.realMeters;

      dom.resultDisplayVal.textContent = formatNumber(realValNum, state.precision);
      dom.resultDisplayUnit.textContent = res.realUnit.symbol;
    } else {
      realValNum = inputVal;
      realUnitKey = dom.mainInputUnit.value;
      drawingUnitKey = dom.mainOutputUnit.value;

      const res = realToDrawing({
        realVal: realValNum,
        realUnitKey: realUnitKey,
        scaleRatio: ratio,
        drawingUnitKey: drawingUnitKey
      });

      drawingValNum = res.drawingValue;
      realMeters = res.realMeters;

      dom.resultDisplayVal.textContent = formatNumber(drawingValNum, state.precision);
      dom.resultDisplayUnit.textContent = res.drawingUnit.symbol;
    }

    updateVisualization({
      containerElement: dom.visualContainer,
      drawingVal: drawingValNum,
      drawingUnit: UNITS[drawingUnitKey] || UNITS.cm,
      realVal: realValNum,
      realUnit: UNITS[realUnitKey] || UNITS.m,
      realMeters: realMeters,
      scaleRatio: ratio
    });

    updateEquivalentsGrid(realMeters);
  }

  function swapDirection() {
    const isDrawingToReal = state.direction === 'drawing_to_real';
    state.direction = isDrawingToReal ? 'real_to_drawing' : 'drawing_to_real';

    if (state.direction === 'drawing_to_real') {
      dom.mainInputBadge.textContent = 'Drawing Measurement (Paper)';
      dom.mainInputBadge.classList.remove('highlight');
      dom.mainOutputBadge.textContent = 'Real-World Dimension';
      dom.mainOutputBadge.classList.add('highlight');
      dom.mainInputUnit.value = state.drawingUnit;
      dom.mainOutputUnit.value = state.realUnit;
    } else {
      dom.mainInputBadge.textContent = 'Real-World Dimension';
      dom.mainInputBadge.classList.add('highlight');
      dom.mainOutputBadge.textContent = 'Drawing Measurement (Paper)';
      dom.mainOutputBadge.classList.remove('highlight');
      dom.mainInputUnit.value = state.realUnit;
      dom.mainOutputUnit.value = state.drawingUnit;
    }

    calculateMainConverter();
  }

  function updateEquivalentsGrid(realMeters) {
    if (!dom.equivGrid) return;
    const equivs = getAllUnitEquivalents(realMeters);

    let html = '';
    equivs.metric.forEach(item => {
      html += `
        <div class="equiv-item">
          <span class="equiv-label">${item.label}</span>
          <span class="equiv-val">${formatNumber(item.val, 3)} ${item.symbol}</span>
        </div>
      `;
    });

    equivs.imperial.forEach(item => {
      html += `
        <div class="equiv-item">
          <span class="equiv-label">${item.label}</span>
          <span class="equiv-val">${typeof item.val === 'string' ? item.val : formatNumber(item.val, 3) + ' ' + item.symbol}</span>
        </div>
      `;
    });

    dom.equivGrid.innerHTML = html;
  }

  function calculateRescale() {
    if (!dom.rescaleOrigInput || !dom.rescaleResultVal) return;

    const origVal = parseArchitecturalInput(dom.rescaleOrigInput.value || '12');
    const origUnitKey = dom.rescaleOrigUnit.value;
    const origRatio = parseFloat(dom.rescaleOrigRatio.value) || 50;
    const targetRatio = parseFloat(dom.rescaleTargetRatio.value) || 200;
    const targetUnitKey = dom.rescaleTargetUnit.value;

    const res = rescaleDrawing({
      originalVal: origVal,
      originalUnitKey: origUnitKey,
      originalRatio: origRatio,
      targetRatio: targetRatio,
      targetUnitKey: targetUnitKey
    });

    dom.rescaleResultVal.textContent = formatNumber(res.targetValue, state.precision);
    dom.rescaleFactorVal.textContent = `${(res.factor * 100).toFixed(1)}% (${res.factor >= 1 ? 'Enlarged' : 'Reduced'})`;
  }

  function calculateDetector() {
    if (!dom.detectorPaperVal || !dom.detectorRatioDisplay) return;

    const paperVal = parseArchitecturalInput(dom.detectorPaperVal.value || '4.5');
    const paperUnitKey = dom.detectorPaperUnit.value;
    const realVal = parseArchitecturalInput(dom.detectorRealVal.value || '9');
    const realUnitKey = dom.detectorRealUnit.value;

    const res = detectScale({
      paperVal: paperVal,
      paperUnitKey: paperUnitKey,
      realVal: realVal,
      realUnitKey: realUnitKey
    });

    if (res.error) {
      dom.detectorRatioDisplay.textContent = 'Invalid Input';
      dom.detectorClosestPreset.textContent = '';
      return;
    }

    dom.detectorRatioDisplay.textContent = res.ratioString;
    if (res.closestPreset) {
      dom.detectorClosestPreset.innerHTML = res.isExactMatch
        ? `Exact Match: <strong>${res.closestPreset.name}</strong>`
        : `Nearest Standard Scale: <strong>${res.closestPreset.name}</strong> (${res.closestPreset.percentDiff}% diff)`;
    }
  }

  function useDetectedScaleInMain() {
    const paperVal = parseArchitecturalInput(dom.detectorPaperVal.value);
    const paperUnitKey = dom.detectorPaperUnit.value;
    const realVal = parseArchitecturalInput(dom.detectorRealVal.value);
    const realUnitKey = dom.detectorRealUnit.value;

    const res = detectScale({ paperVal, paperUnitKey, realVal, realUnitKey });

    if (res.ratio > 0) {
      state.scaleRatio = Math.round(res.ratio * 100) / 100;
      if (dom.customScaleInput) dom.customScaleInput.value = state.scaleRatio;
      switchMode('converter');
      showToast(`Scale set to 1:${state.scaleRatio}`);
      playCopySuccess();
    }
  }

  function calculateAreaVolume() {
    if (!dom.areaVolInputVal || !dom.areaVolResultVal) return;

    const inputVal = parseArchitecturalInput(dom.areaVolInputVal.value || '10');
    const ratio = parseFloat(dom.areaVolRatioInput.value) || 100;
    const inputUnitKey = dom.areaVolInputUnit.value;
    const outputUnitKey = dom.areaVolOutputUnit.value;

    if (state.areaVolType === 'area') {
      const res = scaleArea({
        areaVal: inputVal,
        inputUnitKey: inputUnitKey,
        scaleRatio: ratio,
        outputUnitKey: outputUnitKey,
        isDrawingToReal: true
      });
      dom.areaVolResultVal.textContent = formatNumber(res.resultValue, state.precision);
    } else {
      const res = scaleVolume({
        volumeVal: inputVal,
        inputUnitKey: inputUnitKey,
        scaleRatio: ratio,
        outputUnitKey: outputUnitKey,
        isDrawingToReal: true
      });
      dom.areaVolResultVal.textContent = formatNumber(res.resultValue, state.precision);
    }
  }

  // =========================================================================
  // 6.1 FURNITURE SCALING RENDERER & SEARCH
  // =========================================================================

  function renderFurnitureGrid() {
    if (!dom.furnitureCardsGrid) return;

    const query = state.furnSearchQuery;
    const cat = state.furnCategory;
    const ratio = state.furnRatio || 50;
    const paperUnitKey = state.furnPaperUnit || 'cm';
    const paperUnit = UNITS[paperUnitKey] || UNITS.cm;

    // Filter items
    const filtered = FURNITURE_DATABASE.filter(item => {
      const matchCat = cat === 'all' || item.category === cat;
      const matchQuery = !query || 
        item.name.toLowerCase().includes(query) || 
        item.desc.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    // Update count labels
    if (dom.furnResultsCount) {
      dom.furnResultsCount.textContent = `Showing ${filtered.length} of ${FURNITURE_DATABASE.length} items`;
    }

    // Update category pills count badges
    updateCategoryCounts();

    if (filtered.length === 0) {
      dom.furnitureCardsGrid.innerHTML = `
        <div class="furniture-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p style="font-weight: 600; margin-bottom: 0.25rem;">No furniture found</p>
          <small>Try searching another keyword (e.g. "table", "bed", "sofa", "sink", "door")</small>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(item => {
      // Calculate real dimensions
      const realWMeters = item.wCm / 100;
      const realDMeters = item.dCm / 100;
      const realHMeters = item.hCm ? item.hCm / 100 : null;

      // Calculate scaled paper dimensions
      const paperWMeters = realWMeters / ratio;
      const paperDMeters = realDMeters / ratio;

      const paperWVal = paperWMeters / paperUnit.toMeters;
      const paperDVal = paperDMeters / paperUnit.toMeters;

      // Real dimensions in imperial
      const impW = formatFeetInches(realWMeters / UNITS.in.toMeters);
      const impD = formatFeetInches(realDMeters / UNITS.in.toMeters);

      const planSvg = renderFurniturePlanSVG(item);

      const paperDimFormatted = `${formatNumber(paperWVal, 2)} × ${formatNumber(paperDVal, 2)} ${paperUnit.symbol}`;
      const realDimMetricFormatted = item.hCm 
        ? `${item.wCm} × ${item.dCm} × ${item.hCm} cm`
        : `${item.wCm} × ${item.dCm} cm`;
      const realDimImpFormatted = `${impW} × ${impD}`;

      html += `
        <div class="furniture-card" data-id="${item.id}">
          <div>
            <div class="furn-card-top">
              <span class="furn-item-title">${item.name}</span>
              <span class="furn-category-badge">${item.category}</span>
            </div>

            <div class="furn-plan-preview-box">
              ${planSvg}
            </div>

            <div class="furn-specs-container">
              <div class="furn-spec-row">
                <span class="furn-spec-label">Real Dimensions:</span>
                <span class="furn-real-dim">${realDimMetricFormatted} <small style="color: var(--text-muted);">(${realDimImpFormatted})</small></span>
              </div>
              
              <div class="furn-scaled-dim-box">
                <span class="scale-tag">1:${ratio} Drawing Size:</span>
                <span class="furn-scaled-value">${paperDimFormatted}</span>
              </div>
            </div>
          </div>

          <div class="furn-card-actions">
            <button class="furn-action-btn copy-furn-dim-btn" data-dim="${paperDimFormatted}" title="Copy paper drawing size">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy Size
            </button>
            <button class="furn-action-btn open-furn-main-btn" data-val="${item.wCm}" title="Send width to main converter">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              To Converter
            </button>
          </div>
        </div>
      `;
    });

    dom.furnitureCardsGrid.innerHTML = html;

    // Bind item action buttons
    dom.furnitureCardsGrid.querySelectorAll('.copy-furn-dim-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.dim);
      });
    });

    dom.furnitureCardsGrid.querySelectorAll('.open-furn-main-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmVal = parseFloat(btn.dataset.val);
        state.scaleRatio = state.furnRatio;
        if (dom.customScaleInput) dom.customScaleInput.value = state.scaleRatio;
        if (dom.mainInputVal) dom.mainInputVal.value = cmVal;
        if (dom.mainInputUnit) dom.mainInputUnit.value = 'cm';
        state.direction = 'real_to_drawing';
        if (dom.mainInputBadge) {
          dom.mainInputBadge.textContent = 'Real-World Dimension';
          dom.mainInputBadge.classList.add('highlight');
        }
        if (dom.mainOutputBadge) {
          dom.mainOutputBadge.textContent = 'Drawing Measurement (Paper)';
          dom.mainOutputBadge.classList.remove('highlight');
        }
        switchMode('converter');
        showToast(`Sent dimension ${cmVal} cm to main converter`);
        playSwapSound();
      });
    });
  }

  function updateCategoryCounts() {
    const cats = ['living', 'bedroom', 'dining', 'kitchen', 'bathroom', 'office', 'doors'];
    const totalCount = FURNITURE_DATABASE.length;
    const countAllEl = document.getElementById('count-all');
    if (countAllEl) countAllEl.textContent = `(${totalCount})`;

    cats.forEach(c => {
      const count = FURNITURE_DATABASE.filter(item => item.category === c).length;
      const el = document.getElementById(`count-${c}`);
      if (el) el.textContent = `(${count})`;
    });
  }

  function calculateCustomFurniture() {
    if (!dom.customFurnW || !dom.customFurnD || !dom.customFurnResult) return;

    const w = parseFloat(dom.customFurnW.value) || 0;
    const d = parseFloat(dom.customFurnD.value) || 0;
    const unitKey = dom.customFurnUnit.value || 'cm';
    const unit = UNITS[unitKey] || UNITS.cm;
    const ratio = state.furnRatio || 50;

    const paperUnitKey = state.furnPaperUnit || 'cm';
    const paperUnit = UNITS[paperUnitKey] || UNITS.cm;

    const realWMeters = w * unit.toMeters;
    const realDMeters = d * unit.toMeters;

    const paperWVal = (realWMeters / ratio) / paperUnit.toMeters;
    const paperDVal = (realDMeters / ratio) / paperUnit.toMeters;

    dom.customFurnResult.textContent = `Paper (1:${ratio}): ${formatNumber(paperWVal, 2)} × ${formatNumber(paperDVal, 2)} ${paperUnit.symbol}`;
  }

  function renderReferenceTable(ratio = 100) {
    if (!dom.referenceTableBody) return;

    const testLengthsCm = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];
    let html = '';

    testLengthsCm.forEach(cm => {
      const res = drawingToReal({
        drawingVal: cm,
        drawingUnitKey: 'cm',
        scaleRatio: ratio,
        realUnitKey: 'm'
      });

      const realM = res.realValue;
      let formattedMetric = `${formatNumber(realM, 3)} m`;
      if (realM >= 1000) formattedMetric = `${formatNumber(realM / 1000, 3)} km`;
      else if (realM < 1) formattedMetric = `${formatNumber(realM * 100, 1)} cm`;

      const realInches = realM / UNITS.in.toMeters;
      const formattedArch = formatFeetInches(realInches);

      html += `
        <tr>
          <td style="padding: 0.65rem; font-family: var(--font-mono); font-weight: 600;">${cm} cm (${cm * 10} mm)</td>
          <td style="padding: 0.65rem; font-family: var(--font-mono); color: var(--accent-primary); font-weight: 600;">${formattedMetric}</td>
          <td style="padding: 0.65rem; font-family: var(--font-mono); color: var(--text-secondary);">${formattedArch}</td>
        </tr>
      `;
    });

    dom.referenceTableBody.innerHTML = html;
  }

  function saveCurrentToHistory() {
    const isDrawingToReal = state.direction === 'drawing_to_real';
    const inputStr = `${dom.mainInputVal.value} ${dom.mainInputUnit.value}`;
    const outputStr = `${dom.resultDisplayVal.textContent} ${dom.resultDisplayUnit.textContent}`;
    const scaleStr = `1:${state.scaleRatio}`;

    addHistoryEntry({
      mode: isDrawingToReal ? 'Drawing → Real' : 'Real → Drawing',
      scaleStr: scaleStr,
      inputStr: inputStr,
      outputStr: outputStr,
      notes: `Ratio ${state.scaleRatio}`
    });

    renderHistoryList();
    showToast('Saved to calculation history');
  }

  function renderHistoryList() {
    if (!dom.historyList) return;
    const history = getHistory();

    if (history.length === 0) {
      dom.historyList.innerHTML = `
        <div class="history-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>No calculation history yet.</p>
          <small style="opacity: 0.7;">Conversions will be logged here automatically.</small>
        </div>
      `;
      return;
    }

    let html = '';
    history.forEach(item => {
      html += `
        <div class="history-card" data-id="${item.id}">
          <div class="history-card-top">
            <span class="history-mode-tag">${item.mode || 'Scale'} (${item.scaleStr})</span>
            <span class="history-time">${item.timestamp}</span>
          </div>
          <div class="history-calc-main">
            <span>${item.inputStr}</span>
            <span class="hist-arrow">→</span>
            <span>${item.outputStr}</span>
          </div>
          <div class="history-actions-row">
            <button class="hist-btn copy-hist-btn" title="Copy result">Copy</button>
            <button class="hist-btn delete-hist-btn" title="Remove entry">Delete</button>
          </div>
        </div>
      `;
    });

    dom.historyList.innerHTML = html;

    dom.historyList.querySelectorAll('.copy-hist-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = history[index];
        if (item) copyToClipboard(item.outputStr);
      });
    });

    dom.historyList.querySelectorAll('.delete-hist-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = history[index];
        if (item) {
          removeHistoryEntry(item.id);
          renderHistoryList();
        }
      });
    });
  }

  function toggleHistoryDrawer() {
    const isOpen = dom.historyDrawer.classList.contains('open');
    dom.historyDrawer.classList.toggle('open', !isOpen);
    dom.historyOverlay.classList.toggle('open', !isOpen);
    playTick();
  }

  function handleExportCSV() {
    const csv = exportHistoryCSV();
    if (!csv) {
      showToast('History is empty');
      return;
    }
    downloadFile(csv, `architecture-helping-hand-history-${Date.now()}.csv`, 'text/csv');
    showToast('Exported history as CSV');
  }

  function handleExportMarkdown() {
    const md = exportHistoryMarkdown();
    if (!md) {
      showToast('History is empty');
      return;
    }
    downloadFile(md, `architecture-helping-hand-history-${Date.now()}.md`, 'text/markdown');
    showToast('Exported history as Markdown');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text) {
    if (!navigator.clipboard) {
      showToast(`Value: ${text}`);
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      playCopySuccess();
      showToast(`Copied "${text}" to clipboard`);
    }).catch(() => {
      showToast(`Selected: ${text}`);
    });
  }

  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  // Initialize immediately if DOM is ready, or on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
