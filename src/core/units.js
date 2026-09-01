/**
 * Architecture Helping Hand - Canonical Unit System Definitions
 * Standard conversion factors normalized to base SI units (Meters, Square Meters, Cubic Meters).
 */

export const UNITS = Object.freeze({
  // Metric Length Units (Base: Meters)
  mm: Object.freeze({ key: 'mm', name: 'Millimeters (mm)', symbol: 'mm', toMeters: 0.001, type: 'metric', dimension: 'length' }),
  cm: Object.freeze({ key: 'cm', name: 'Centimeters (cm)', symbol: 'cm', toMeters: 0.01, type: 'metric', dimension: 'length' }),
  dm: Object.freeze({ key: 'dm', name: 'Decimeters (dm)', symbol: 'dm', toMeters: 0.1, type: 'metric', dimension: 'length' }),
  m:  Object.freeze({ key: 'm',  name: 'Meters (m)', symbol: 'm', toMeters: 1.0, type: 'metric', dimension: 'length' }),
  km: Object.freeze({ key: 'km', name: 'Kilometers (km)', symbol: 'km', toMeters: 1000.0, type: 'metric', dimension: 'length' }),

  // Imperial Length Units (Base: Meters)
  in: Object.freeze({ key: 'in', name: 'Inches (in / ″)', symbol: 'in', toMeters: 0.0254, type: 'imperial', dimension: 'length' }),
  ft: Object.freeze({ key: 'ft', name: 'Feet (ft / ′)', symbol: 'ft', toMeters: 0.3048, type: 'imperial', dimension: 'length' }),
  yd: Object.freeze({ key: 'yd', name: 'Yards (yd)', symbol: 'yd', toMeters: 0.9144, type: 'imperial', dimension: 'length' }),
  mi: Object.freeze({ key: 'mi', name: 'Miles (mi)', symbol: 'mi', toMeters: 1609.344, type: 'imperial', dimension: 'length' })
});

export const AREA_UNITS = Object.freeze({
  mm2:   Object.freeze({ key: 'mm2',   name: 'Square Millimeters (mm²)', symbol: 'mm²', toSqMeters: 0.000001, type: 'metric', dimension: 'area' }),
  cm2:   Object.freeze({ key: 'cm2',   name: 'Square Centimeters (cm²)', symbol: 'cm²', toSqMeters: 0.0001, type: 'metric', dimension: 'area' }),
  m2:    Object.freeze({ key: 'm2',    name: 'Square Meters (m²)', symbol: 'm²', toSqMeters: 1.0, type: 'metric', dimension: 'area' }),
  km2:   Object.freeze({ key: 'km2',   name: 'Square Kilometers (km²)', symbol: 'km²', toSqMeters: 1000000.0, type: 'metric', dimension: 'area' }),
  ha:    Object.freeze({ key: 'ha',    name: 'Hectares (ha)', symbol: 'ha', toSqMeters: 10000.0, type: 'metric', dimension: 'area' }),
  sq_in: Object.freeze({ key: 'sq_in', name: 'Square Inches (sq in)', symbol: 'sq in', toSqMeters: 0.00064516, type: 'imperial', dimension: 'area' }),
  sq_ft: Object.freeze({ key: 'sq_ft', name: 'Square Feet (sq ft)', symbol: 'sq ft', toSqMeters: 0.09290304, type: 'imperial', dimension: 'area' }),
  sq_yd: Object.freeze({ key: 'sq_yd', name: 'Square Yards (sq yd)', symbol: 'sq yd', toSqMeters: 0.83612736, type: 'imperial', dimension: 'area' }),
  acre:  Object.freeze({ key: 'acre',  name: 'Acres (ac)', symbol: 'ac', toSqMeters: 4046.8564224, type: 'imperial', dimension: 'area' })
});

export const VOLUME_UNITS = Object.freeze({
  mm3:    Object.freeze({ key: 'mm3',    name: 'Cubic Millimeters (mm³)', symbol: 'mm³', toCuMeters: 1e-9, type: 'metric', dimension: 'volume' }),
  cm3:    Object.freeze({ key: 'cm3',    name: 'Cubic Centimeters (cm³ / cc)', symbol: 'cm³', toCuMeters: 1e-6, type: 'metric', dimension: 'volume' }),
  m3:     Object.freeze({ key: 'm3',     name: 'Cubic Meters (m³)', symbol: 'm³', toCuMeters: 1.0, type: 'metric', dimension: 'volume' }),
  liters: Object.freeze({ key: 'liters', name: 'Liters (L)', symbol: 'L', toCuMeters: 0.001, type: 'metric', dimension: 'volume' }),
  cu_in:  Object.freeze({ key: 'cu_in',  name: 'Cubic Inches (cu in)', symbol: 'cu in', toCuMeters: 1.6387064e-5, type: 'imperial', dimension: 'volume' }),
  cu_ft:  Object.freeze({ key: 'cu_ft',  name: 'Cubic Feet (cu ft)', symbol: 'cu ft', toCuMeters: 0.028316846592, type: 'imperial', dimension: 'volume' }),
  cu_yd:  Object.freeze({ key: 'cu_yd',  name: 'Cubic Yards (cu yd)', symbol: 'cu yd', toCuMeters: 0.764554857984, type: 'imperial', dimension: 'volume' })
});

/**
 * Get unit definition safely by key across all dimension types
 */
export function getUnit(key) {
  return UNITS[key] || AREA_UNITS[key] || VOLUME_UNITS[key] || null;
}

/**
 * Convert a value between any two compatible units of the same dimension
 */
export function convertUnit(value, fromKey, toKey) {
  if (value === 0) return 0;
  if (fromKey === toKey) return value;

  const fromUnit = getUnit(fromKey);
  const toUnit = getUnit(toKey);

  if (!fromUnit || !toUnit || fromUnit.dimension !== toUnit.dimension) {
    throw new Error(`Incompatible unit conversion from "${fromKey}" to "${toKey}"`);
  }

  if (fromUnit.dimension === 'length') {
    const meters = value * fromUnit.toMeters;
    return meters / toUnit.toMeters;
  } else if (fromUnit.dimension === 'area') {
    const sqMeters = value * fromUnit.toSqMeters;
    return sqMeters / toUnit.toSqMeters;
  } else if (fromUnit.dimension === 'volume') {
    const cuMeters = value * fromUnit.toCuMeters;
    return cuMeters / toUnit.toCuMeters;
  }

  return value;
}
