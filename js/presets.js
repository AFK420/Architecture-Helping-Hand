/**
 * ArchiScale - Architectural Scale Presets & Definitions
 */

export const SCALE_PRESETS = [
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

export const UNITS = {
  // Metric length units (base = meters)
  mm: { name: 'Millimeters (mm)', symbol: 'mm', toMeters: 0.001, type: 'metric' },
  cm: { name: 'Centimeters (cm)', symbol: 'cm', toMeters: 0.01, type: 'metric' },
  dm: { name: 'Decimeters (dm)', symbol: 'dm', toMeters: 0.1, type: 'metric' },
  m:  { name: 'Meters (m)', symbol: 'm', toMeters: 1.0, type: 'metric' },
  km: { name: 'Kilometers (km)', symbol: 'km', toMeters: 1000.0, type: 'metric' },

  // Imperial length units (base = meters)
  in: { name: 'Inches (in / ″)', symbol: 'in', toMeters: 0.0254, type: 'imperial' },
  ft: { name: 'Feet (ft / ′)', symbol: 'ft', toMeters: 0.3048, type: 'imperial' },
  yd: { name: 'Yards (yd)', symbol: 'yd', toMeters: 0.9144, type: 'imperial' },
  mi: { name: 'Miles (mi)', symbol: 'mi', toMeters: 1609.344, type: 'imperial' }
};

export const AREA_UNITS = {
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

export const VOLUME_UNITS = {
  mm3: { name: 'Cubic Millimeters (mm³)', symbol: 'mm³', toCuMeters: 1e-9, type: 'metric' },
  cm3: { name: 'Cubic Centimeters (cm³ / cc)', symbol: 'cm³', toCuMeters: 1e-6, type: 'metric' },
  m3:  { name: 'Cubic Meters (m³)', symbol: 'm³', toCuMeters: 1.0, type: 'metric' },
  liters: { name: 'Liters (L)', symbol: 'L', toCuMeters: 0.001, type: 'metric' },
  cu_in: { name: 'Cubic Inches (cu in)', symbol: 'cu in', toCuMeters: 1.6387064e-5, type: 'imperial' },
  cu_ft: { name: 'Cubic Feet (cu ft)', symbol: 'cu ft', toCuMeters: 0.028316846592, type: 'imperial' },
  cu_yd: { name: 'Cubic Yards (cu yd)', symbol: 'cu yd', toCuMeters: 0.764554857984, type: 'imperial' }
};

export const REAL_WORLD_REFERENCES = [
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
