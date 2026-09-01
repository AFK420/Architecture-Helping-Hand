/**
 * Architecture Helping Hand - Standalone Bundle v2.0.0
 * Compiled automatically from src/ modules. Works with file:/// and http:// protocols.
 */

(function() {
  'use strict';

  // =========================================================================
  // MODULE: Units
  // =========================================================================

/**
 * Architecture Helping Hand - Canonical Unit System Definitions
 * Standard conversion factors normalized to base SI units (Meters, Square Meters, Cubic Meters).
 */

const UNITS = Object.freeze({
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

const AREA_UNITS = Object.freeze({
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

const VOLUME_UNITS = Object.freeze({
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
 * @param {string} key
 * @returns {Object|null}
 */
function getUnit(key) {
  if (!key || typeof key !== 'string') return null;
  return UNITS[key] || AREA_UNITS[key] || VOLUME_UNITS[key] || null;
}

/**
 * Validates and returns a unit object. Throws an explicit Error if unit is unknown or dimension mismatches.
 * @param {string} key - Unit key
 * @param {'length'|'area'|'volume'} [expectedDimension] - Optional dimension check
 * @returns {Object}
 */
function requireUnit(key, expectedDimension) {
  if (!key || typeof key !== 'string') {
    throw new Error(`Unit key is required and must be a string (received: ${JSON.stringify(key)})`);
  }

  const unit = getUnit(key);
  if (!unit) {
    throw new Error(`Unknown measurement unit: "${key}"`);
  }

  if (expectedDimension && unit.dimension !== expectedDimension) {
    throw new Error(`Unit "${key}" is of dimension "${unit.dimension}", expected "${expectedDimension}"`);
  }

  return unit;
}

/**
 * Convert a value between any two compatible units of the same dimension
 */
function convertUnit(value, fromKey, toKey) {
  if (value === 0) return 0;
  if (fromKey === toKey) return value;

  const fromUnit = requireUnit(fromKey);
  const toUnit = requireUnit(toKey);

  if (fromUnit.dimension !== toUnit.dimension) {
    throw new Error(`Incompatible unit conversion from "${fromKey}" (${fromUnit.dimension}) to "${toKey}" (${toUnit.dimension})`);
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


  // =========================================================================
  // MODULE: Presets
  // =========================================================================

/**
 * Architecture Helping Hand - Scale Presets & Real-World Reference Standards
 */

const SCALE_PRESETS = Object.freeze([
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
]);

const REAL_WORLD_REFERENCES = Object.freeze([
  { minMeters: 0.0, maxMeters: 0.25, name: 'Architectural Pen / Brick', icon: 'pen', defaultLength: 0.21, description: 'Standard drawing instrument or brick thickness (~215mm)' },
  { minMeters: 0.25, maxMeters: 0.75, name: 'Desk Chair / T-Square', icon: 'chair', defaultLength: 0.60, description: 'Standard desk chair width or drawing ruler (~60cm)' },
  { minMeters: 0.75, maxMeters: 1.5, name: 'Drafting Table / Desk', icon: 'desk', defaultLength: 1.20, description: 'Studio drafting desk or standard door opening (~1.2m)' },
  { minMeters: 1.5, maxMeters: 2.5, name: 'Human Figure / Doorway', icon: 'human', defaultLength: 1.80, description: 'Architectural human scale (1.8m) & standard door (2.1m)' },
  { minMeters: 2.5, maxMeters: 5.5, name: 'Compact Vehicle / Room Span', icon: 'car', defaultLength: 4.50, description: 'Standard vehicle length (4.5m) or bedroom dimension' },
  { minMeters: 5.5, maxMeters: 15.0, name: '2-Story House / City Bus', icon: 'house', defaultLength: 10.0, description: 'Residential townhouse footprint or transit bus' },
  { minMeters: 15.0, maxMeters: 60.0, name: 'Olympic Pool / Apartment Block', icon: 'building', defaultLength: 50.0, description: '50m competition pool or medium residential block' },
  { minMeters: 60.0, maxMeters: 250.0, name: 'Football Stadium / High-Rise', icon: 'tower', defaultLength: 120.0, description: 'Standard stadium (105m) or 30-story commercial tower' },
  { minMeters: 250.0, maxMeters: Infinity, name: 'Urban Masterplan / City Grid', icon: 'city', defaultLength: 1000.0, description: 'City blocks, transport corridors & regional masterplan' }
]);


  // =========================================================================
  // MODULE: Formatter
  // =========================================================================

/**
 * Architecture Helping Hand - Unified Output Formatter
 * Precision number formatting, scientific notation thresholds, and architectural feet-inch conversions.
 */

/**
 * Format a number with exact decimal precision and epsilon stabilization
 * @param {number} val - Input number
 * @param {number} [decimals=3] - Maximum fractional digits
 * @returns {string}
 */
function formatNumber(val, decimals = 3) {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '0';
  if (val === 0) return '0';

  const abs = Math.abs(val);
  if (abs < 0.00001 || abs >= 1e9) {
    return val.toExponential(4);
  }

  // Stabilize floating-point arithmetic using rounded epsilon
  const factor = Math.pow(10, decimals);
  const stabilized = Math.round((val + Number.EPSILON) * factor) / factor;

  return stabilized.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Converts decimal total inches to architectural feet-and-inches: X'-Y Z/16"
 * @param {number} totalInches - Total dimension in inches
 * @param {number} [precision=16] - Fraction denominator (default 16 for 1/16")
 * @returns {string}
 */
function formatFeetInches(totalInches, precision = 16) {
  if (isNaN(totalInches) || !isFinite(totalInches)) return '0"';
  
  const isNegative = totalInches < 0;
  const total = Math.abs(totalInches);
  const feet = Math.floor(total / 12);
  const inches = total % 12;
  const wholeInches = Math.floor(inches);
  const fraction = inches - wholeInches;

  // Round to nearest fraction denominator (e.g. 16ths)
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

  // Reduce fraction to lowest terms
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

  const sign = isNegative ? '-' : '';

  if (finalFeet > 0) {
    return sign + `${finalFeet}'-${inchPart || '0"'}`;
  }
  return sign + (inchPart || '0"');
}


  // =========================================================================
  // MODULE: Parser
  // =========================================================================

/**
 * Architecture Helping Hand - Unified Input Parser
 * Robust parsing of architectural notations, fractions, feet-inches, decimals, and attached units.
 */



/**
 * Normalized Parse Result Structure
 * @typedef {Object} ParseResult
 * @property {number} value - Numeric value in the recognized or default unit
 * @property {string|null} detectedUnit - Explicit unit key if found in the input string (e.g. 'cm', 'm')
 * @property {boolean} isValid - Whether input was successfully parsed into a finite number
 * @property {string|null} error - Description of parse error if invalid
 */

/**
 * Parse an architectural input string into a structured measurement
 * @param {string|number} input - Raw user input
 * @param {Object} [options]
 * @param {boolean} [options.allowNegative=false] - Whether negative values are permissible
 * @returns {ParseResult}
 */
function parseInput(input, options = {}) {
  const { allowNegative = false } = options;

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return { value: 0, detectedUnit: null, isValid: false, error: 'Non-finite numeric value' };
    }
    if (!allowNegative && input < 0) {
      return { value: 0, detectedUnit: null, isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: input, detectedUnit: null, isValid: true, error: null };
  }

  if (input === null || input === undefined || typeof input !== 'string') {
    return { value: 0, detectedUnit: null, isValid: false, error: 'Empty or invalid input type' };
  }

  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '') {
    return { value: 0, detectedUnit: null, isValid: false, error: 'Input is empty' };
  }

  // 1. Check for attached unit suffix (e.g. "15.5cm", "2.4m", "100mm", "12in", "6ft", "12abc")
  const unitSuffixMatch = trimmed.match(/^([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))\s*([a-zA-Z²³_]+)$/);
  let rawNumericPart = trimmed;
  let detectedUnit = null;

  if (unitSuffixMatch) {
    const candidateUnit = unitSuffixMatch[2].toLowerCase();
    if (UNITS[candidateUnit]) {
      rawNumericPart = unitSuffixMatch[1];
      detectedUnit = candidateUnit;
    } else {
      return { value: 0, detectedUnit: null, isValid: false, error: `Unknown unit suffix: "${unitSuffixMatch[2]}"` };
    }
  }

  // 2. Check for Feet & Inches pattern (e.g. 12' 6", 12'-6 1/2", 12'6, 8', 6")
  // Handles architectural hyphen separators like 12'-6"
  const feetInchesMatch = rawNumericPart.match(/^([+-]?\d+(?:\.\d+)?)\s*['′]\s*[-–—]?\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*["″]?\s*)?$/);
  if (feetInchesMatch) {
    const feetRaw = parseFloat(feetInchesMatch[1]);
    const isNegative = feetInchesMatch[1].startsWith('-');
    const feet = Math.abs(isNaN(feetRaw) ? 0 : feetRaw);
    let inches = 0;
    if (feetInchesMatch[2]) {
      const parsedInch = parseFraction(feetInchesMatch[2]);
      if (isNaN(parsedInch)) {
        return { value: 0, detectedUnit: 'in', isValid: false, error: `Invalid inch fraction: "${feetInchesMatch[2]}"` };
      }
      inches = Math.abs(parsedInch);
    }
    const totalInches = (feet * 12 + inches) * (isNegative ? -1 : 1);

    if (!allowNegative && totalInches < 0) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: totalInches, detectedUnit: 'in', isValid: true, error: null };
  }

  // 3. Standalone inch pattern: e.g. 6 1/2" or 12"
  const onlyInchesMatch = rawNumericPart.match(/^([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))\s*["″]$/);
  if (onlyInchesMatch) {
    const inches = parseFraction(onlyInchesMatch[1]);
    if (isNaN(inches)) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Could not parse inch fraction' };
    }
    if (!allowNegative && inches < 0) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: inches, detectedUnit: 'in', isValid: true, error: null };
  }

  // 4. Standard Fraction or Decimal: e.g. "3 1/2", "5/8", "12.75"
  const parsedVal = parseFraction(rawNumericPart);

  if (isNaN(parsedVal) || !isFinite(parsedVal)) {
    return { value: 0, detectedUnit: null, isValid: false, error: 'Could not parse numeric expression' };
  }

  if (!allowNegative && parsedVal < 0) {
    return { value: 0, detectedUnit: detectedUnit, isValid: false, error: 'Negative dimensions are not valid' };
  }

  return { value: parsedVal, detectedUnit: detectedUnit, isValid: true, error: null };
}

/**
 * Parses fractional strings like "3 1/2", "5/8", "0.75"
 * Returns NaN if input is malformed or invalid.
 */
function parseFraction(str) {
  if (typeof str === 'number') return isFinite(str) ? str : NaN;
  if (!str || typeof str !== 'string') return NaN;

  const clean = str.trim();
  if (!clean) return NaN;

  // Reject strings containing multiple slashes (e.g. 1/2/3) or invalid characters
  const slashCount = (clean.match(/\//g) || []).length;
  if (slashCount > 1) return NaN;

  const parts = clean.split(/\s+/);

  if (parts.length === 2) {
    // Check whole number: must be purely numeric (e.g. "3")
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(parts[0])) return NaN;
    const whole = parseFloat(parts[0]);
    if (isNaN(whole)) return NaN;

    // Check fraction part (e.g. "1/2")
    if (!/^\d+\/\d+$/.test(parts[1])) return NaN;
    const fracParts = parts[1].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (isNaN(num) || isNaN(den) || den === 0) return NaN;
      return whole >= 0 ? whole + (num / den) : whole - (num / den);
    }
    return NaN;
  } else if (parts.length === 1) {
    if (parts[0].includes('/')) {
      if (!/^[+-]?\d+\/\d+$/.test(parts[0])) return NaN;
      const fracParts = parts[0].split('/');
      if (fracParts.length === 2) {
        const num = parseFloat(fracParts[0]);
        const den = parseFloat(fracParts[1]);
        if (isNaN(num) || isNaN(den) || den === 0) return NaN;
        return num / den;
      }
      return NaN;
    }
    // Pure decimal/integer test (reject e.g. "12abc" or "15..5")
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(parts[0])) return NaN;
    const val = parseFloat(parts[0]);
    return isNaN(val) ? NaN : val;
  }

  return NaN;
}

/**
 * Legacy compatibility wrapper for existing code
 */
function parseArchitecturalInput(inputStr) {
  const res = parseInput(inputStr, { allowNegative: false });
  return res.isValid ? res.value : 0;
}


  // =========================================================================
  // MODULE: Calculator
  // =========================================================================

/**
 * Architecture Helping Hand - Centralized Calculation Engine
 * Pure mathematical scaling, rescaling, scale detection, area, and volume algorithms.
 */





/**
 * Validates that an input is a finite JavaScript number.
 * Throws TypeError if the input is NaN, Infinity, a string, null, undefined, or other non-number.
 * @param {*} val - Value to check
 * @param {string} [paramName='value'] - Parameter name for the error message
 * @returns {number}
 */
function requireFiniteNumber(val, paramName = 'value') {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    throw new TypeError(`${paramName} must be a valid finite number (received: ${typeof val === 'string' ? JSON.stringify(val) : val})`);
  }
  return val;
}

/**
 * Scale linear dimension between Drawing (paper) and Real-World measurements
 * @param {Object} params
 * @param {number} params.value - Measured value (must be a finite number)
 * @param {string} [params.unitKey='cm'] - Unit key of the input (e.g. 'cm', 'm', 'in')
 * @param {number} [params.ratio=50] - Scale denominator ratio (e.g. 50 for 1:50)
 * @param {'drawing_to_real'|'real_to_drawing'} [params.direction='drawing_to_real']
 * @param {string} [params.targetUnitKey] - Desired output unit key (defaults to 'm' for drawing_to_real, 'cm' for real_to_drawing)
 * @returns {Object} Normalized result object with realMeters, drawingMeters, targetValue, etc.
 */
function scaleDimension(params) {
  if (!params || typeof params !== 'object') {
    throw new TypeError('scaleDimension expects a parameters object');
  }

  const {
    value = 0,
    unitKey = 'cm',
    ratio = 50,
    direction = 'drawing_to_real',
    targetUnitKey = direction === 'drawing_to_real' ? 'm' : 'cm'
  } = params;

  requireFiniteNumber(value, 'value');
  requireFiniteNumber(ratio, 'ratio');

  if (ratio <= 0) {
    throw new Error(`Scale ratio must be a positive finite number greater than 0 (received: ${ratio})`);
  }

  const inputUnit = requireUnit(unitKey, 'length');
  const targetUnit = requireUnit(targetUnitKey, 'length');

  let realMeters = 0;
  let drawingMeters = 0;
  let targetValue = 0;

  if (direction === 'drawing_to_real') {
    drawingMeters = value * inputUnit.toMeters;
    realMeters = drawingMeters * ratio;
    targetValue = realMeters / targetUnit.toMeters;
  } else if (direction === 'real_to_drawing') {
    realMeters = value * inputUnit.toMeters;
    drawingMeters = realMeters / ratio;
    targetValue = drawingMeters / targetUnit.toMeters;
  } else {
    throw new Error(`Invalid scaling direction: "${direction}"`);
  }

  return {
    value: targetValue,
    unit: targetUnit,
    realMeters: realMeters,
    drawingMeters: drawingMeters,
    inputUnit: inputUnit,
    ratio: ratio,
    direction: direction
  };
}

/**
 * Shorthand Drawing -> Real calculation
 */
function drawingToReal({ drawingVal = 0, drawingUnitKey = 'cm', scaleRatio = 50, realUnitKey = 'm' } = {}) {
  requireFiniteNumber(drawingVal, 'drawingVal');
  requireFiniteNumber(scaleRatio, 'scaleRatio');

  const res = scaleDimension({
    value: drawingVal,
    unitKey: drawingUnitKey,
    ratio: scaleRatio,
    direction: 'drawing_to_real',
    targetUnitKey: realUnitKey
  });

  return {
    realValue: res.value,
    realMeters: res.realMeters,
    drawingMeters: res.drawingMeters,
    realUnit: res.unit,
    drawingUnit: res.inputUnit
  };
}

/**
 * Shorthand Real -> Drawing calculation
 */
function realToDrawing({ realVal = 0, realUnitKey = 'm', scaleRatio = 50, drawingUnitKey = 'cm' } = {}) {
  requireFiniteNumber(realVal, 'realVal');
  requireFiniteNumber(scaleRatio, 'scaleRatio');

  const res = scaleDimension({
    value: realVal,
    unitKey: realUnitKey,
    ratio: scaleRatio,
    direction: 'real_to_drawing',
    targetUnitKey: drawingUnitKey
  });

  return {
    drawingValue: res.value,
    drawingMeters: res.drawingMeters,
    realMeters: res.realMeters,
    drawingUnit: res.unit,
    realUnit: res.inputUnit
  };
}

/**
 * Rescale drawing dimension between two different sheet scales (Scale A -> Scale B)
 */
function rescaleDrawing({ originalVal = 0, originalUnitKey = 'cm', originalRatio = 50, targetRatio = 200, targetUnitKey = 'cm' } = {}) {
  requireFiniteNumber(originalVal, 'originalVal');
  requireFiniteNumber(originalRatio, 'originalRatio');
  requireFiniteNumber(targetRatio, 'targetRatio');

  if (originalRatio <= 0 || targetRatio <= 0) {
    throw new Error('Scale ratios must be positive finite numbers greater than 0');
  }

  const origUnit = requireUnit(originalUnitKey, 'length');
  const targetUnit = requireUnit(targetUnitKey, 'length');

  // Real dimension in meters
  const realMeters = (originalVal * origUnit.toMeters) * originalRatio;
  
  // New drawing dimension at target ratio
  const targetMeters = realMeters / targetRatio;
  const targetValue = targetMeters / targetUnit.toMeters;
  const factor = originalRatio / targetRatio;

  return {
    targetValue: targetValue,
    realMeters: realMeters,
    factor: factor,
    origUnit: origUnit,
    targetUnit: targetUnit
  };
}

/**
 * Detect unknown scale ratio from measured paper distance and known real-world dimension.
 * Returns ratio: null if inputs are invalid or non-positive.
 */
function detectScale({ paperVal = 0, paperUnitKey = 'cm', realVal = 0, realUnitKey = 'm' } = {}) {
  requireFiniteNumber(paperVal, 'paperVal');
  requireFiniteNumber(realVal, 'realVal');

  const paperUnit = requireUnit(paperUnitKey, 'length');
  const realUnit = requireUnit(realUnitKey, 'length');

  if (paperVal <= 0 || realVal <= 0) {
    return {
      ratio: null,
      ratioString: 'N/A',
      closestPreset: null,
      error: 'Paper and real dimensions must be positive numbers greater than 0'
    };
  }

  const paperMeters = paperVal * paperUnit.toMeters;
  const realMeters = realVal * realUnit.toMeters;
  const calculatedRatio = realMeters / paperMeters;

  // Identify closest standard preset
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

/**
 * Area Scaling (Scale Ratio squared: S^2)
 */
function scaleArea({ areaVal = 0, inputUnitKey = 'cm2', scaleRatio = 100, outputUnitKey = 'm2', isDrawingToReal = true } = {}) {
  requireFiniteNumber(areaVal, 'areaVal');
  requireFiniteNumber(scaleRatio, 'scaleRatio');

  if (scaleRatio <= 0) {
    throw new Error(`Scale ratio must be greater than 0 (received: ${scaleRatio})`);
  }

  const inputUnit = requireUnit(inputUnitKey, 'area');
  const outputUnit = requireUnit(outputUnitKey, 'area');
  const inputSqMeters = areaVal * inputUnit.toSqMeters;
  const scaleFactorSq = Math.pow(scaleRatio, 2);

  const outputSqMeters = isDrawingToReal
    ? inputSqMeters * scaleFactorSq
    : inputSqMeters / scaleFactorSq;

  return {
    resultValue: outputSqMeters / outputUnit.toSqMeters,
    sqMeters: outputSqMeters,
    factor: scaleFactorSq
  };
}

/**
 * Volume Scaling (Scale Ratio cubed: S^3)
 */
function scaleVolume({ volumeVal = 0, inputUnitKey = 'cm3', scaleRatio = 100, outputUnitKey = 'm3', isDrawingToReal = true } = {}) {
  requireFiniteNumber(volumeVal, 'volumeVal');
  requireFiniteNumber(scaleRatio, 'scaleRatio');

  if (scaleRatio <= 0) {
    throw new Error(`Scale ratio must be greater than 0 (received: ${scaleRatio})`);
  }

  const inputUnit = requireUnit(inputUnitKey, 'volume');
  const outputUnit = requireUnit(outputUnitKey, 'volume');
  const inputCuMeters = volumeVal * inputUnit.toCuMeters;
  const scaleFactorCube = Math.pow(scaleRatio, 3);

  const outputCuMeters = isDrawingToReal
    ? inputCuMeters * scaleFactorCube
    : inputCuMeters / scaleFactorCube;

  return {
    resultValue: outputCuMeters / outputUnit.toCuMeters,
    cuMeters: outputCuMeters,
    factor: scaleFactorCube
  };
}

/**
 * Generate parallel breakdown of all unit equivalents for a given real dimension in meters.
 * Throws TypeError if meters is not a finite number.
 */
function getAllUnitEquivalents(meters) {
  requireFiniteNumber(meters, 'meters');

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
  // MODULE: Geometry
  // =========================================================================

/**
 * Architecture Helping Hand - Architectural Geometry Engine
 * Pure mathematical functions for 2D architectural shapes, perimeters, areas, diagonals, and polygons.
 */




/**
 * Calculate geometric properties of an architectural rectangle (room, wall, floor slab)
 * @param {Object} params
 * @param {number} params.width - Width dimension (> 0)
 * @param {number} params.length - Length dimension (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ area: number, perimeter: number, diagonal: number }}
 */
function calcRectangle({ width, length, unitKey = 'm' } = {}) {
  requireFiniteNumber(width, 'width');
  requireFiniteNumber(length, 'length');
  requireUnit(unitKey, 'length');

  if (width <= 0 || length <= 0) {
    throw new Error('Rectangle width and length must be strictly greater than 0');
  }

  const area = width * length;
  const perimeter = 2 * (width + length);
  const diagonal = Math.sqrt(width * width + length * length);

  return {
    area,
    perimeter,
    diagonal
  };
}

/**
 * Calculate geometric properties of an architectural circle (round column, circular window, fountain)
 * @param {Object} params
 * @param {number} params.radius - Radius (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ diameter: number, circumference: number, area: number }}
 */
function calcCircle({ radius, unitKey = 'm' } = {}) {
  requireFiniteNumber(radius, 'radius');
  requireUnit(unitKey, 'length');

  if (radius <= 0) {
    throw new Error('Circle radius must be strictly greater than 0');
  }

  const diameter = 2 * radius;
  const circumference = 2 * Math.PI * radius;
  const area = Math.PI * radius * radius;

  return {
    diameter,
    circumference,
    area
  };
}

/**
 * Calculate geometric properties of a triangle using Heron's formula
 * @param {Object} params
 * @param {number} params.a - First side length (> 0)
 * @param {number} params.b - Second side length (> 0)
 * @param {number} params.c - Third side length (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ perimeter: number, area: number }}
 */
function calcTriangle({ a, b, c, unitKey = 'm' } = {}) {
  requireFiniteNumber(a, 'a');
  requireFiniteNumber(b, 'b');
  requireFiniteNumber(c, 'c');
  requireUnit(unitKey, 'length');

  if (a <= 0 || b <= 0 || c <= 0) {
    throw new Error('Triangle side lengths must be strictly greater than 0');
  }

  // Triangle Inequality Theorem: sum of any two sides must be strictly greater than the third
  if (a + b <= c || a + c <= b || b + c <= a) {
    throw new Error(`Triangle inequality violated: sides (${a}, ${b}, ${c}) cannot form a valid triangle`);
  }

  const perimeter = a + b + c;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));

  return {
    perimeter,
    area
  };
}

/**
 * Calculate geometric properties of a 2D planar polygon using the Shoelace formula
 * @param {Object} params
 * @param {Array<{ x: number, y: number }>} params.vertices - Ordered list of vertices
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ perimeter: number, area: number }}
 */
function calcPolygon({ vertices, unitKey = 'm' } = {}) {
  if (!Array.isArray(vertices)) {
    throw new TypeError('calcPolygon expects vertices to be an array of {x, y} coordinate objects');
  }

  if (vertices.length < 3) {
    throw new Error(`Polygon must have at least 3 vertices (received ${vertices.length})`);
  }

  requireUnit(unitKey, 'length');

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    if (!v || typeof v !== 'object') {
      throw new TypeError(`Vertex at index ${i} is not a valid object`);
    }
    requireFiniteNumber(v.x, `vertex[${i}].x`);
    requireFiniteNumber(v.y, `vertex[${i}].y`);
  }

  let doubleArea = 0;
  let perimeter = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    // Shoelace formula term
    doubleArea += (xi * yj) - (xj * yi);

    // Euclidean distance between adjacent vertices
    const dx = xj - xi;
    const dy = yj - yi;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  const area = Math.abs(doubleArea) / 2;

  if (area === 0) {
    throw new Error('Degenerate polygon: vertices are collinear or form a zero-area polygon');
  }

  return {
    perimeter,
    area
  };
}


  // =========================================================================
  // MODULE: Furniture
  // =========================================================================

/**
 * Architecture Helping Hand - Comprehensive Furniture, Fixtures & Standards Library
 * Over 175+ verified architectural standard dimensions spanning residential, commercial,
 * sanitary, circulation, clearances, outdoor, fitness, and accessibility domains.
 */





const FURNITURE_DATABASE = Object.freeze([
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
  { id: 'salon-styling-chair', name: 'Hair Salon Hydraulic Chair & Mirror (80×90)', category: 'commercial', wCm: 80, dCm: 90, hCm: 110, desc: 'Styling station swivel chair with floor clearance', type: 'chair_round' }
]);

/**
 * Calculate scaled dimensions for a furniture piece using the central calculator engine
 */
function getScaledFurnitureDimensions(item, ratio = 50, paperUnitKey = 'cm') {
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
function filterFurnitureCatalog(catalog, searchQuery = '', category = 'all', sortKey = 'default') {
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


  // =========================================================================
  // MODULE: DimensionWorkspace
  // =========================================================================

/**
 * Architecture Helping Hand - Dimension Workspace Core Model
 * Phase 2.5: Daily Architect Toolkit — Part 2.5: Dimension Workspace v1.1
 * Headless, high-precision architectural scratchpad, batch scaling engine & schedule generator.
 */





const WORKSPACE_STORAGE_KEY = 'archiscale_dimension_workspace';
const DEFAULT_WORKSPACE_SCALE = 50;
const DEFAULT_DISPLAY_UNIT = 'mm';
const DEFAULT_DIMENSION_TYPE = 'reference';
const DEFAULT_DENSITY = 'comfortable';

const SUPPORTED_DISPLAY_UNITS = Object.freeze([
  { key: 'mm', label: 'Millimeters (mm)', type: 'metric' },
  { key: 'cm', label: 'Centimeters (cm)', type: 'metric' },
  { key: 'm', label: 'Meters (m)', type: 'metric' },
  { key: 'in', label: 'Inches (in)', type: 'imperial' },
  { key: 'ft', label: 'Decimal Feet (ft)', type: 'imperial' },
  { key: 'ft_in', label: 'Architectural (Ft-In)', type: 'imperial' }
]);

const SUPPORTED_DIMENSION_TYPES = Object.freeze([
  { key: 'reference', label: 'Reference', shortLabel: 'REF', isAdditive: false, desc: 'Object / condition dimension (excluded from cumulative totals)' },
  { key: 'segment', label: 'Segment', shortLabel: 'SEG', isAdditive: true, desc: 'Additive segment participating in cumulative totals' },
  { key: 'allowance', label: 'Allowance', shortLabel: 'ALW', isAdditive: true, desc: 'Tolerance or clearance allowance added to totals' }
]);

let entryIdCounter = 0;

/**
 * Generate a collision-resistant unique ID for workspace entries
 * @returns {string}
 */
function generateEntryId() {
  entryIdCounter++;
  return `dim_${Date.now()}_${entryIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Create a new dimension group container
 * @param {string} [name='Group']
 * @returns {Object} Group
 */
function createGroup(name = 'Group') {
  return {
    id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: typeof name === 'string' && name.trim() !== '' ? name.trim() : 'Group',
    collapsed: false
  };
}

/**
 * Deterministically parse natural quick-add input string into name, measurement and type
 * Examples: "Wall A 4800", "Door 900", "Gap 50mm allowance", "seg Bay 1 6m"
 * @param {string} inputString
 * @param {string} [defaultUnit='mm']
 * @param {'reference'|'segment'|'allowance'} [fallbackType='reference']
 * @returns {Object}
 */
function parseQuickAddString(inputString, defaultUnit = DEFAULT_DISPLAY_UNIT, fallbackType = DEFAULT_DIMENSION_TYPE) {
  if (!inputString || typeof inputString !== 'string') {
    return { name: 'Dimension', rawInput: '', dimensionType: fallbackType, isValid: false };
  }

  let text = inputString.trim();
  if (!text) {
    return { name: 'Dimension', rawInput: '', dimensionType: fallbackType, isValid: false };
  }

  let detectedType = fallbackType;

  // 1. Check for type prefixes: "seg: Wall A 4800", "ref: Door 900", "alw: Gap 50", "[segment] Bay 1 6000"
  const prefixMatch = text.match(/^(?:\[(segment|seg|reference|ref|allowance|alw)\]|(segment|seg|reference|ref|allowance|alw)[:\s]+)/i);
  if (prefixMatch) {
    const rawTag = (prefixMatch[1] || prefixMatch[2] || '').toLowerCase();
    if (rawTag.startsWith('seg')) detectedType = 'segment';
    else if (rawTag.startsWith('ref')) detectedType = 'reference';
    else if (rawTag.startsWith('alw') || rawTag.startsWith('all')) detectedType = 'allowance';
    text = text.slice(prefixMatch[0].length).trim();
  } else {
    // Check for trailing type suffix: "Gap 50 [allowance]" or "Wall A 4800 segment"
    const suffixMatch = text.match(/\s+(?:\[(segment|seg|reference|ref|allowance|alw)\]|(segment|seg|reference|ref|allowance|alw))$/i);
    if (suffixMatch) {
      const rawTag = (suffixMatch[1] || suffixMatch[2] || '').toLowerCase();
      if (rawTag.startsWith('seg')) detectedType = 'segment';
      else if (rawTag.startsWith('ref')) detectedType = 'reference';
      else if (rawTag.startsWith('alw') || rawTag.startsWith('all')) detectedType = 'allowance';
      text = text.slice(0, suffixMatch.index).trim();
    }
  }

  const tokens = text.split(/\s+/);
  if (tokens.length === 1) {
    const testParse = parseInput(tokens[0]);
    if (testParse.isValid && testParse.value > 0) {
      return {
        name: 'Dimension',
        rawInput: tokens[0],
        dimensionType: detectedType,
        isValid: true
      };
    } else {
      return {
        name: tokens[0],
        rawInput: '',
        dimensionType: detectedType,
        isValid: false
      };
    }
  }

  // Scan backwards from the right for the measurement token(s)
  let measurementPart = '';
  let namePart = '';

  for (let take = Math.min(3, tokens.length - 1); take >= 1; take--) {
    const candidateMeas = tokens.slice(tokens.length - take).join(' ');
    const testParse = parseInput(candidateMeas);
    if (testParse.isValid && testParse.value > 0) {
      measurementPart = candidateMeas;
      namePart = tokens.slice(0, tokens.length - take).join(' ');
      break;
    }
  }

  if (measurementPart) {
    return {
      name: namePart.trim() || 'Dimension',
      rawInput: measurementPart.trim(),
      dimensionType: detectedType,
      isValid: true
    };
  }

  return {
    name: text,
    rawInput: '',
    dimensionType: detectedType,
    isValid: false
  };
}

/**
 * Creates and normalizes a single dimension entry
 * @param {Object} data
 * @param {string} [defaultUnit='mm']
 * @returns {Object} DimensionEntry
 */
function createDimensionEntry(data = {}, defaultUnit = DEFAULT_DISPLAY_UNIT) {
  const id = data.id || generateEntryId();
  const name = typeof data.name === 'string' && data.name.trim() !== '' ? data.name.trim() : 'Dimension';
  const rawInput = data.rawInput !== undefined && data.rawInput !== null ? String(data.rawInput).trim() : '';
  const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
  const enabled = data.enabled !== false;
  const groupId = typeof data.groupId === 'string' && data.groupId.trim() !== '' ? data.groupId.trim() : null;

  // Semantic dimension type: 'reference' (default), 'segment', 'allowance'
  let dimensionType = DEFAULT_DIMENSION_TYPE;
  if (data.dimensionType === 'segment' || data.dimensionType === 'allowance' || data.dimensionType === 'reference') {
    dimensionType = data.dimensionType;
  }

  // Strict unit check
  const fallbackUnit = UNITS[defaultUnit] ? defaultUnit : 'mm';

  let realMeters = null;
  let parsedUnit = fallbackUnit;
  let parsedNumericValue = 0;
  let isValid = false;
  let errorMessage = null;

  if (rawInput === '') {
    isValid = false;
    errorMessage = 'Enter a measurement';
  } else {
    const parseRes = parseInput(rawInput);
    if (parseRes.isValid && parseRes.value > 0) {
      parsedNumericValue = parseRes.value;
      if (parseRes.detectedUnit) {
        if (UNITS[parseRes.detectedUnit]) {
          parsedUnit = parseRes.detectedUnit;
          realMeters = parseRes.value * UNITS[parseRes.detectedUnit].toMeters;
          isValid = true;
          errorMessage = null;
        } else {
          isValid = false;
          errorMessage = `Unknown unit: ${parseRes.detectedUnit}`;
        }
      } else {
        if (UNITS[fallbackUnit]) {
          parsedUnit = fallbackUnit;
          realMeters = parseRes.value * UNITS[fallbackUnit].toMeters;
          isValid = true;
          errorMessage = null;
        } else {
          isValid = false;
          errorMessage = `Invalid default unit: ${fallbackUnit}`;
        }
      }
    } else {
      isValid = false;
      errorMessage = parseRes.error || 'Invalid measurement';
    }
  }

  return {
    id,
    name,
    rawInput,
    dimensionType,
    defaultUnit: fallbackUnit,
    parsedUnit,
    parsedNumericValue,
    realMeters,
    isValid,
    errorMessage,
    notes,
    enabled,
    groupId
  };
}

/**
 * Updates an existing dimension entry and re-evaluates parsed measurement
 * @param {Object} entry
 * @param {Object} updates
 * @returns {Object} Updated DimensionEntry
 */
function updateDimensionEntry(entry, updates = {}) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('updateDimensionEntry requires a valid entry object');
  }

  return createDimensionEntry({
    id: entry.id,
    name: updates.name !== undefined ? updates.name : entry.name,
    rawInput: updates.rawInput !== undefined ? updates.rawInput : entry.rawInput,
    dimensionType: updates.dimensionType !== undefined ? updates.dimensionType : entry.dimensionType,
    defaultUnit: updates.defaultUnit !== undefined ? updates.defaultUnit : entry.defaultUnit,
    notes: updates.notes !== undefined ? updates.notes : entry.notes,
    enabled: updates.enabled !== undefined ? updates.enabled : entry.enabled,
    groupId: updates.groupId !== undefined ? updates.groupId : entry.groupId
  }, updates.defaultUnit || entry.defaultUnit);
}

/**
 * Duplicates a dimension entry with a new ID and copy suffix
 * @param {Object} entry
 * @returns {Object} Duplicated DimensionEntry
 */
function duplicateDimensionEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('duplicateDimensionEntry requires a valid entry object');
  }

  return createDimensionEntry({
    id: generateEntryId(),
    name: `${entry.name} (Copy)`,
    rawInput: entry.rawInput,
    dimensionType: entry.dimensionType,
    defaultUnit: entry.defaultUnit,
    notes: entry.notes,
    enabled: entry.enabled,
    groupId: entry.groupId
  }, entry.defaultUnit);
}

/**
 * Formats a measurement in meters into a specific display unit string
 * @param {number|null} meters - Canonical dimension in meters
 * @param {string} displayUnit - Target display unit ('mm', 'cm', 'm', 'in', 'ft', 'ft_in')
 * @param {number} [precision=3] - Fractional decimals
 * @returns {string}
 */
function formatMeasurementValue(meters, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  if (meters === null || meters === undefined || isNaN(meters) || !isFinite(meters) || meters < 0) {
    return '---';
  }

  if (meters === 0) {
    if (displayUnit === 'ft_in') return '0"';
    const unitDef = UNITS[displayUnit] || UNITS.mm;
    return `0 ${unitDef.symbol}`;
  }

  if (displayUnit === 'ft_in') {
    const totalInches = meters / UNITS.in.toMeters;
    return formatFeetInches(totalInches);
  }

  const unitDef = UNITS[displayUnit] || UNITS.mm;
  const converted = meters / unitDef.toMeters;
  return `${formatNumber(converted, precision)} ${unitDef.symbol}`;
}

/**
 * Calculates live real-world and scaled drawing representations for an entry
 * @param {Object} entry
 * @param {number} scaleRatio - Scale denominator (e.g. 50 for 1:50)
 * @param {string} displayUnit - Target display unit key
 * @param {number} [precision=3]
 * @returns {Object}
 */
function calculateEntryValues(entry, scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  if (!entry || !entry.isValid || entry.realMeters === null || scaleRatio <= 0) {
    return {
      isValid: false,
      errorMessage: entry?.errorMessage || 'Invalid entry',
      realMeters: null,
      drawingMeters: null,
      realFormatted: '---',
      drawingFormatted: '---',
      rawInput: entry?.rawInput || '',
      dimensionType: entry?.dimensionType || DEFAULT_DIMENSION_TYPE
    };
  }

  const realMeters = entry.realMeters;
  const drawingMeters = realMeters / scaleRatio;

  return {
    isValid: true,
    errorMessage: null,
    realMeters,
    drawingMeters,
    realFormatted: formatMeasurementValue(realMeters, displayUnit, precision),
    drawingFormatted: formatMeasurementValue(drawingMeters, displayUnit, precision),
    rawInput: entry.rawInput,
    dimensionType: entry.dimensionType || DEFAULT_DIMENSION_TYPE
  };
}

/**
 * Computes workspace totals with semantic segment, allowance, and combined totals
 * Reference dimensions are excluded from cumulative totals.
 * @param {Array<Object>} entries
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {number} [precision=3]
 * @returns {Object}
 */
function calculateWorkspaceTotals(entries = [], scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  if (!Array.isArray(entries)) {
    entries = [];
  }

  let segmentRealMeters = 0;
  let allowanceRealMeters = 0;
  let referenceRealMeters = 0;

  let segmentCount = 0;
  let allowanceCount = 0;
  let referenceCount = 0;

  let enabledCount = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const entry of entries) {
    if (!entry) continue;
    if (entry.enabled) {
      enabledCount++;
      const type = entry.dimensionType || 'reference';
      if (entry.isValid && typeof entry.realMeters === 'number' && entry.realMeters > 0) {
        validCount++;
        if (type === 'segment') {
          segmentRealMeters += entry.realMeters;
          segmentCount++;
        } else if (type === 'allowance') {
          allowanceRealMeters += entry.realMeters;
          allowanceCount++;
        } else {
          // reference
          referenceRealMeters += entry.realMeters;
          referenceCount++;
        }
      } else {
        invalidCount++;
      }
    }
  }

  const combinedRealMeters = segmentRealMeters + allowanceRealMeters;

  const segmentDrawingMeters = scaleRatio > 0 ? segmentRealMeters / scaleRatio : 0;
  const allowanceDrawingMeters = scaleRatio > 0 ? allowanceRealMeters / scaleRatio : 0;
  const combinedDrawingMeters = scaleRatio > 0 ? combinedRealMeters / scaleRatio : 0;
  const referenceDrawingMeters = scaleRatio > 0 ? referenceRealMeters / scaleRatio : 0;

  return {
    totalCount: entries.length,
    enabledCount,
    validCount,
    invalidCount,
    segmentCount,
    allowanceCount,
    referenceCount,
    scaleRatio,
    displayUnit,

    // Segment Totals
    segmentRealMeters,
    segmentDrawingMeters,
    segmentRealFormatted: formatMeasurementValue(segmentRealMeters, displayUnit, precision),
    segmentDrawingFormatted: formatMeasurementValue(segmentDrawingMeters, displayUnit, precision),

    // Allowance Totals
    allowanceRealMeters,
    allowanceDrawingMeters,
    allowanceRealFormatted: formatMeasurementValue(allowanceRealMeters, displayUnit, precision),
    allowanceDrawingFormatted: formatMeasurementValue(allowanceDrawingMeters, displayUnit, precision),

    // Combined Totals (Segments + Allowances)
    totalRealMeters: combinedRealMeters,
    totalDrawingMeters: combinedDrawingMeters,
    totalRealFormatted: formatMeasurementValue(combinedRealMeters, displayUnit, precision),
    totalDrawingFormatted: formatMeasurementValue(combinedDrawingMeters, displayUnit, precision),

    // Reference Totals (Informational only)
    referenceRealMeters,
    referenceDrawingMeters,
    referenceRealFormatted: formatMeasurementValue(referenceRealMeters, displayUnit, precision),
    referenceDrawingFormatted: formatMeasurementValue(referenceDrawingMeters, displayUnit, precision),

    // Summary breakdown
    breakdownLabel: `${entries.length} items • ${segmentCount} segments • ${allowanceCount} allowances • ${referenceCount} references`
  };
}

/**
 * Computes subtotal for a specific group of entries
 * @param {Array<Object>} entries
 * @param {string} groupId
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {number} [precision=3]
 * @returns {Object}
 */
function calculateGroupTotals(entries = [], groupId, scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, precision = 3) {
  const groupEntries = (entries || []).filter(e => e && e.groupId === groupId);
  return calculateWorkspaceTotals(groupEntries, scaleRatio, displayUnit, precision);
}

/**
 * Formats all or filtered workspace entries into clean architectural text for clipboard or CAD
 * @param {Array<Object>} entries
 * @param {number} scaleRatio
 * @param {string} displayUnit
 * @param {'both'|'real'|'drawing'|'tsv'|'raw'|'segments'|'references'|'allowances'|'selected'|Object} [options='both']
 * @returns {string}
 */
function formatWorkspaceForClipboard(entries = [], scaleRatio = DEFAULT_WORKSPACE_SCALE, displayUnit = DEFAULT_DISPLAY_UNIT, options = 'both') {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'Workspace is empty.';
  }

  const mode = typeof options === 'string' ? options : (options?.mode || 'both');
  const selectedIds = Array.isArray(options?.selectedIds) ? new Set(options.selectedIds) : null;
  const groups = Array.isArray(options?.groups) ? options.groups : [];
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  let targetEntries = entries;
  if (mode === 'selected' && selectedIds) {
    targetEntries = entries.filter(e => selectedIds.has(e.id));
  } else if (mode === 'segments') {
    targetEntries = entries.filter(e => (e.dimensionType || 'reference') === 'segment');
  } else if (mode === 'references') {
    targetEntries = entries.filter(e => (e.dimensionType || 'reference') === 'reference');
  } else if (mode === 'allowances') {
    targetEntries = entries.filter(e => (e.dimensionType || 'reference') === 'allowance');
  }

  if (targetEntries.length === 0) {
    return 'No matching dimensions found.';
  }

  // 1. Raw numbers only for CAD/BIM pasting
  if (mode === 'raw') {
    return targetEntries.map(e => {
      const calc = calculateEntryValues(e, scaleRatio, displayUnit);
      return calc.isValid ? e.rawInput : '0';
    }).join('\n');
  }

  // 2. TSV format for Excel / Google Sheets / Numbers
  if (mode === 'tsv') {
    let tsv = 'Type\tItem Name\tRaw Input\tReal Dimension\tDrawing Dimension (1:' + scaleRatio + ')\tGroup\tNotes\tStatus\n';
    targetEntries.forEach(entry => {
      const calc = calculateEntryValues(entry, scaleRatio, displayUnit);
      const grpName = entry.groupId ? (groupMap.get(entry.groupId) || 'Group') : '—';
      tsv += `${(entry.dimensionType || 'reference').toUpperCase()}\t${entry.name}\t${entry.rawInput}\t${calc.realFormatted}\t${calc.drawingFormatted}\t${grpName}\t${entry.notes}\t${entry.enabled ? 'Active' : 'Disabled'}\n`;
    });
    const totals = calculateWorkspaceTotals(targetEntries, scaleRatio, displayUnit);
    tsv += `TOTAL SEGMENTS\t\t\t${totals.segmentRealFormatted}\t${totals.segmentDrawingFormatted}\t\t${totals.segmentCount} segments\n`;
    tsv += `TOTAL ALLOWANCES\t\t\t${totals.allowanceRealFormatted}\t${totals.allowanceDrawingFormatted}\t\t${totals.allowanceCount} allowances\n`;
    tsv += `COMBINED TOTAL\t\t\t${totals.totalRealFormatted}\t${totals.totalDrawingFormatted}\t\t${totals.enabledCount} active rows\n`;
    return tsv;
  }

  // 3. Structured Architectural Schedule Text
  const totals = calculateWorkspaceTotals(targetEntries, scaleRatio, displayUnit);
  let lines = [];
  lines.push(`ARCHITECTURAL DIMENSION SCHEDULE`);
  lines.push(`Scale: 1:${scaleRatio} | Display Unit: ${displayUnit.toUpperCase()}`);
  lines.push('──────────────────────────────────────────────────────────────────────────');
  lines.push(`[TYPE] ITEM NAME ➔ REAL DIMENSION | DRAWING @ 1:${scaleRatio}`);
  lines.push('──────────────────────────────────────────────────────────────────────────');

  targetEntries.forEach(entry => {
    const typeTag = `[${(entry.dimensionType || 'reference').toUpperCase().slice(0, 3)}]`;
    if (!entry.enabled) {
      lines.push(`${typeTag} [DISABLED] ${entry.name}: ${entry.rawInput}`);
      return;
    }

    const calc = calculateEntryValues(entry, scaleRatio, displayUnit);
    const noteSuffix = entry.notes ? ` (${entry.notes})` : '';
    const grpSuffix = entry.groupId ? ` <${groupMap.get(entry.groupId) || 'Group'}>` : '';

    if (!calc.isValid) {
      lines.push(`${typeTag} ${entry.name}: ${entry.rawInput} ⚠️ (Invalid)${noteSuffix}${grpSuffix}`);
    } else if (mode === 'real') {
      lines.push(`${typeTag} ${entry.name}: ${calc.realFormatted}${noteSuffix}${grpSuffix}`);
    } else if (mode === 'drawing') {
      lines.push(`${typeTag} ${entry.name}: ${calc.drawingFormatted} (1:${scaleRatio})${noteSuffix}${grpSuffix}`);
    } else {
      lines.push(`${typeTag} ${entry.name}: ${calc.realFormatted} ➔ Drawing: ${calc.drawingFormatted}${noteSuffix}${grpSuffix}`);
    }
  });

  lines.push('──────────────────────────────────────────────────────────────────────────');
  lines.push(`TOTAL SEGMENTS:   ${totals.segmentRealFormatted} (Drawing: ${totals.segmentDrawingFormatted}) [${totals.segmentCount} segments]`);
  if (totals.allowanceCount > 0) {
    lines.push(`TOTAL ALLOWANCES: ${totals.allowanceRealFormatted} (Drawing: ${totals.allowanceDrawingFormatted}) [${totals.allowanceCount} allowances]`);
  }
  lines.push(`COMBINED TOTAL:   ${totals.totalRealFormatted} (Drawing: ${totals.totalDrawingFormatted})`);
  lines.push(`REFERENCES:       ${totals.referenceRealFormatted} (${totals.referenceCount} reference dimensions, excluded from total)`);

  return lines.join('\n');
}

/**
 * Creates default initial workspace populated with sample architectural measurements
 * @returns {Object}
 */
function createDefaultWorkspace() {
  const sampleEntries = [
    { name: 'Exterior Wall A', rawInput: '4.8m', dimensionType: 'segment', defaultUnit: 'm', notes: 'North elevation run' },
    { name: 'Main Entry Door', rawInput: '900mm', dimensionType: 'reference', defaultUnit: 'mm', notes: 'Clear opening' },
    { name: 'Ribbon Window', rawInput: '2.4m', dimensionType: 'reference', defaultUnit: 'm', notes: 'Sill height 900mm' },
    { name: 'Interior Partition', rawInput: '3200mm', dimensionType: 'segment', defaultUnit: 'mm', notes: 'Drywall partition' },
    { name: 'Expansion Joint', rawInput: '50mm', dimensionType: 'allowance', defaultUnit: 'mm', notes: 'Thermal gap' }
  ];

  return {
    scaleRatio: DEFAULT_WORKSPACE_SCALE,
    displayUnit: DEFAULT_DISPLAY_UNIT,
    density: DEFAULT_DENSITY,
    groups: [],
    entries: sampleEntries.map(s => createDimensionEntry(s))
  };
}

/**
 * Safely serializes a workspace state to JSON string
 * @param {Object} workspace
 * @returns {string}
 */
function serializeWorkspace(workspace) {
  if (!workspace || typeof workspace !== 'object') {
    return JSON.stringify(createDefaultWorkspace());
  }

  const payload = {
    version: '2.5.1',
    scaleRatio: typeof workspace.scaleRatio === 'number' && workspace.scaleRatio > 0 ? workspace.scaleRatio : DEFAULT_WORKSPACE_SCALE,
    displayUnit: typeof workspace.displayUnit === 'string' ? workspace.displayUnit : DEFAULT_DISPLAY_UNIT,
    density: workspace.density === 'compact' ? 'compact' : DEFAULT_DENSITY,
    groups: Array.isArray(workspace.groups) ? workspace.groups : [],
    entries: Array.isArray(workspace.entries) ? workspace.entries : []
  };

  return JSON.stringify(payload);
}

/**
 * Safely deserializes a workspace state with error recovery and backwards compatibility
 * @param {string|Object} raw
 * @returns {Object}
 */
function deserializeWorkspace(raw) {
  if (!raw) {
    return createDefaultWorkspace();
  }

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultWorkspace();
    }

    const scaleRatio = typeof parsed.scaleRatio === 'number' && parsed.scaleRatio > 0 ? parsed.scaleRatio : DEFAULT_WORKSPACE_SCALE;
    const displayUnit = typeof parsed.displayUnit === 'string' ? parsed.displayUnit : DEFAULT_DISPLAY_UNIT;
    const density = parsed.density === 'compact' ? 'compact' : DEFAULT_DENSITY;
    const groups = Array.isArray(parsed.groups) ? parsed.groups.map(g => ({
      id: g.id || `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: g.name || 'Group',
      collapsed: Boolean(g.collapsed)
    })) : [];

    let entries = [];
    if (Array.isArray(parsed.entries)) {
      entries = parsed.entries.map(item => {
        if (!item || typeof item !== 'object') return null;
        return createDimensionEntry({
          id: item.id,
          name: item.name,
          rawInput: item.rawInput,
          dimensionType: item.dimensionType || 'reference',
          defaultUnit: item.defaultUnit || displayUnit,
          notes: item.notes,
          enabled: item.enabled,
          groupId: item.groupId
        }, item.defaultUnit || displayUnit);
      }).filter(Boolean);
    }

    return {
      scaleRatio,
      displayUnit,
      density,
      groups,
      entries
    };
  } catch (e) {
    // Corrupted storage recovery
    return createDefaultWorkspace();
  }
}


  // =========================================================================
  // MODULE: Storage
  // =========================================================================

/**
 * Architecture Helping Hand - Safe Storage Service
 * Resilient localStorage wrapper with in-memory fallback for sandboxed environments.
 */

const memoryStore = new Map();

const StorageService = {
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Fallback to memory store
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },

  setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      // Fallback to memory store
    }
    memoryStore.set(key, String(value));
  },

  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    memoryStore.delete(key);
  },

  clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    memoryStore.clear();
  }
};


  // =========================================================================
  // MODULE: Audio
  // =========================================================================

/**
 * Architecture Helping Hand - Tactile Audio Feedback Synthesizer
 * Zero-asset synthesized acoustic feedback using the HTML5 Web Audio API.
 */



let audioCtx = null;
let isSoundEnabled = true;

const SOUND_STORAGE_KEY = 'archiscale_sound_enabled';

try {
  const saved = StorageService.getItem(SOUND_STORAGE_KEY);
  if (saved !== null) {
    isSoundEnabled = saved === 'true';
  }
} catch (e) {}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

const AudioService = {
  isEnabled() {
    return isSoundEnabled;
  },

  setEnabled(enabled) {
    isSoundEnabled = !!enabled;
    StorageService.setItem(SOUND_STORAGE_KEY, String(isSoundEnabled));
  },

  toggleSound() {
    this.setEnabled(!isSoundEnabled);
    if (isSoundEnabled) {
      this.playTick();
    }
    return isSoundEnabled;
  },

  playTick() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  },

  playKeyClick() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.015);

      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  },

  playSwapSound() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  },

  playCopySuccess() {
    if (!isSoundEnabled) return;
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
};


  // =========================================================================
  // MODULE: History
  // =========================================================================

/**
 * Architecture Helping Hand - History & Logging Service
 */



const HISTORY_STORAGE_KEY = 'archiscale_calculation_history';
let historyList = [];

function loadHistoryFromStorage() {
  try {
    const saved = StorageService.getItem(HISTORY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Validate items
        return parsed.filter(item => item && typeof item === 'object' && item.id);
      }
    }
  } catch (e) {
    // Corrupted data handling
  }
  return [];
}

historyList = loadHistoryFromStorage();

const HistoryService = {
  getHistory() {
    return [...historyList];
  },

  reload() {
    historyList = loadHistoryFromStorage();
    return [...historyList];
  },

  addEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('History entry must be a valid object');
    }

    const item = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      operation: entry.operation || entry.mode || 'Scale Converter',
      mode: entry.mode || entry.operation || 'Scale Converter',
      scaleStr: entry.scaleStr || (entry.scaleRatio ? `1:${entry.scaleRatio}` : '-'),
      inputStr: entry.inputStr || '',
      outputStr: entry.outputStr || '',
      stateSnapshot: entry.stateSnapshot || null,
      ...entry
    };

    historyList.unshift(item);
    if (historyList.length > 100) {
      historyList.pop();
    }
    this.save();
    return item;
  },

  removeEntry(id) {
    historyList = historyList.filter(item => item.id !== id);
    this.save();
  },

  clear() {
    historyList = [];
    this.save();
  },

  save() {
    try {
      StorageService.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyList));
    } catch (e) {}
  },

  exportCSV() {
    if (historyList.length === 0) return null;
    const headers = ['Timestamp', 'Date', 'Operation', 'Scale', 'Input', 'Result', 'Notes'];
    const rows = historyList.map(h => [
      `"${h.timestamp || ''}"`,
      `"${h.date || ''}"`,
      `"${h.operation || h.mode || 'Scale'}"`,
      `"${h.scaleStr || ''}"`,
      `"${h.inputStr || ''}"`,
      `"${h.outputStr || ''}"`,
      `"${h.notes || ''}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  exportMarkdown() {
    if (historyList.length === 0) return null;
    let md = '# Architecture Helping Hand - Architectural Calculation Journal\n\n';
    md += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    md += '| Time | Operation | Scale | Input | Result |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    historyList.forEach(h => {
      md += `| ${h.timestamp || ''} | ${h.operation || h.mode || 'Scale'} | ${h.scaleStr || '-'} | ${h.inputStr || '-'} | **${h.outputStr || '-'}** |\n`;
    });
    return md;
  }
};


  // =========================================================================
  // MODULE: Commands
  // =========================================================================

/**
 * Architecture Helping Hand - Global Command Center & Registry Service
 * Phase 2.5: Daily Architect Toolkit — Part 1: Global Command Palette
 */



const RECENT_COMMANDS_KEY = 'archiscale_recent_commands';
const FAVORITE_COMMANDS_KEY = 'archiscale_favorite_commands';
const MAX_RECENT_COMMANDS = 10;
const MAX_FAVORITE_COMMANDS = 10;

/**
 * Default Built-in Commands Definition
 */
const DEFAULT_COMMANDS = [
  // 1. Navigation Commands
  {
    id: 'nav-converter',
    title: 'Scale Converter',
    description: 'Convert dimensions between paper drawing and real-world site',
    category: 'Navigation',
    icon: '📐',
    keywords: ['scale', 'converter', 'drawing', 'real', 'paper', 'metric', 'imperial', 'ratio', 'dimension', 'mode 1'],
    shortcut: '1',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-rescale',
    title: 'Rescaler (Sheet A ➔ Sheet B)',
    description: 'Convert drawing measurements between different architectural scales',
    category: 'Navigation',
    icon: '🔄',
    keywords: ['rescale', 'sheet', 'transfer', 'ratio', 'sheet a', 'sheet b', 're-scale', 'mode 2'],
    shortcut: '2',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-detector',
    title: 'Scale Detector',
    description: 'Detect unknown scale ratio from paper drawing and real dimensions',
    category: 'Navigation',
    icon: '🔍',
    keywords: ['detector', 'find', 'identify', 'ratio', 'unknown scale', 'calculate scale', 'mode 3'],
    shortcut: '3',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-areavol',
    title: 'Area & Volume Scaler',
    description: 'Scale 2D floor surface areas (m², sq ft) and 3D volumes (m³, cu ft)',
    category: 'Navigation',
    icon: '📦',
    keywords: ['area', 'volume', 'square', 'cubic', 'm2', 'sqft', 'floor area', 'room', 'mode 4'],
    shortcut: '4',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-furniture',
    title: 'Furniture & Space Planning',
    description: 'Browse 179 standard architectural furniture pieces, clearances, and top-down blueprints',
    category: 'Navigation',
    icon: '🛋️',
    keywords: ['furniture', 'fixture', 'desk', 'bed', 'door', 'chair', 'table', 'ada', 'clearance', 'catalog', 'planner', 'mode 5'],
    shortcut: '5',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-reference',
    title: 'Drafting Reference Sheet',
    description: 'Architectural scale ruler, benchmark lengths, and 100mm print calibration sheet',
    category: 'Navigation',
    icon: '📚',
    keywords: ['reference', 'chart', 'ruler', 'calibration', 'print', 'sheet', 'benchmarks', 'metric', 'imperial', 'mode 6'],
    shortcut: '6',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-workspace',
    title: 'Dimension Workspace',
    description: 'Multi-dimension schedule scratchpad, batch scaling & live totals',
    category: 'Navigation',
    icon: '📐',
    keywords: ['dimension', 'workspace', 'schedule', 'scratchpad', 'batch', 'multi', 'totals', 'mode 7'],
    shortcut: '7',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-history',
    title: 'Calculation Journal',
    description: 'Open calculation log, restore previous math, and export CSV / Markdown',
    category: 'Navigation',
    icon: '📜',
    keywords: ['history', 'journal', 'log', 'restore', 'records', 'csv', 'markdown', 'drawer'],
    shortcut: 'H',
    actionType: 'action',
    available: true
  },
  {
    id: 'nav-shortcuts',
    title: 'Keyboard Shortcuts & Guide',
    description: 'View all workstation hotkeys, supported input syntax, and drafting tips',
    category: 'Navigation',
    icon: '⌨️',
    keywords: ['shortcuts', 'keys', 'hotkeys', 'help', 'guide', 'keyboard', 'tips'],
    shortcut: '?',
    actionType: 'action',
    available: true
  },

  // 2. Utility & Quick Actions
  {
    id: 'util-copy-result',
    title: 'Copy Active Result',
    description: 'Copy the most recent calculation result to your clipboard',
    category: 'Utility',
    icon: '📋',
    keywords: ['copy', 'clipboard', 'result', 'active', 'latest', 'value'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-toggle-theme',
    title: 'Cycle Studio Theme',
    description: 'Cycle interface theme (Studio Dark ➔ Drafting Paper ➔ Blueprint Cyan)',
    category: 'Utility',
    icon: '🎨',
    keywords: ['theme', 'dark', 'light', 'blueprint', 'paper', 'color', 'appearance', 'mode'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-toggle-sound',
    title: 'Toggle Tactile Audio Feedback',
    description: 'Enable or mute tactile audio synthesis for button clicks and calculations',
    category: 'Utility',
    icon: '🔊',
    keywords: ['sound', 'audio', 'mute', 'unmute', 'click', 'feedback', 'tactile'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-export-csv',
    title: 'Export Journal as CSV',
    description: 'Download calculation journal entries as a CSV spreadsheet',
    category: 'Utility',
    icon: '📥',
    keywords: ['export', 'csv', 'spreadsheet', 'download', 'history', 'journal'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-export-md',
    title: 'Export Journal as Markdown',
    description: 'Copy calculation journal table formatted in GitHub Markdown to clipboard',
    category: 'Utility',
    icon: '📝',
    keywords: ['export', 'markdown', 'table', 'copy', 'history', 'journal', 'md'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-clear-history',
    title: 'Clear Calculation Journal',
    description: 'Wipe all saved calculations from the calculation history log',
    category: 'Utility',
    icon: '🗑️',
    keywords: ['clear', 'history', 'reset', 'wipe', 'delete', 'journal'],
    actionType: 'action',
    available: true
  },
  {
    id: 'util-quick-dim',
    title: 'Quick Dimension Strip',
    description: 'Glanceable architectural dimension inspector, multi-scale sizes & instant CAD copy',
    category: 'Utility',
    icon: '⚡',
    keywords: ['quick', 'dimension', 'strip', 'glance', 'micro', 'scale', 'inspect', 'q'],
    shortcut: 'Q',
    actionType: 'action',
    available: true
  },

  {
    id: 'nav-expression',
    title: 'Dimension Expression Calculator',
    description: 'Evaluate mixed-unit architectural math expressions with live scaling and workspace insertion',
    category: 'Navigation',
    icon: '🧮',
    keywords: ['expression', 'calculator', 'math', 'eval', 'mixed units', 'arithmetic', 'sum', 'subtraction', 'multiply', 'divide', 'mode 8'],
    shortcut: '8',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-multiscale',
    title: 'Multi-Scale Comparison',
    description: 'Compare a real-world dimension or math expression across multiple architectural scales simultaneously',
    category: 'Navigation',
    icon: '📊',
    keywords: ['multi-scale', 'compare', 'comparison', 'scales', 'drawing size', 'fit', 'paper', 'proportions', 'mode 9', 'batch scale'],
    shortcut: '9',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-chains',
    title: 'Dimension Chains',
    description: 'Evaluate ordered dimension sequences, cumulative coordinates, scale-accurate SVG drafting chains, and offsets',
    category: 'Navigation',
    icon: '🔗',
    keywords: ['chain', 'dimension string', 'cumulative', 'running totals', 'grid', 'sequence', 'offsets', 'mode 10', '0'],
    shortcut: '0',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-cad-clipboard',
    title: 'CAD Clipboard & Formats',
    description: 'Instant CAD-ready copy formatting for AutoCAD, Rhino, Revit, SketchUp, and Spreadsheets',
    category: 'Navigation',
    icon: '📋',
    keywords: ['cad', 'clipboard', 'autocad', 'rhino', 'revit', 'sketchup', 'paste', 'tsv', 'schedule', 'mode 11', 'c'],
    shortcut: 'C',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'nav-batch-cad',
    title: 'Batch CAD Dimension Converter',
    description: 'Bulk scale & unit conversion for tables, schedules, and raw CAD dimension lists',
    category: 'Navigation',
    icon: '⚡',
    keywords: ['batch', 'cad', 'bulk', 'multi-scale', 'schedule', 'table', 'mode 12', 'b'],
    shortcut: 'B',
    actionType: 'navigation',
    available: true
  },
  {
    id: 'future-stair-calc',
    title: 'Stair & Riser Calculator',
    description: 'Calculate stair riser count, tread depths, slope angles, and building code compliance',
    category: 'Upcoming Tool',
    icon: '🪜',
    keywords: ['stair', 'riser', 'tread', 'slope', 'code', 'headroom', 'phase 2.5'],
    actionType: 'placeholder',
    available: false,
    badge: 'Phase 2.5'
  },
  {
    id: 'future-ramp-calc',
    title: 'ADA Ramp Slope Calculator',
    description: 'Calculate ramp run, total rise, landings, and ADA 1:12 slope standard',
    category: 'Upcoming Tool',
    icon: '♿',
    keywords: ['ramp', 'slope', 'ada', 'incline', 'gradient', 'accessibility', 'phase 2.5'],
    actionType: 'placeholder',
    available: false,
    badge: 'Phase 2.5'
  },
  {
    id: 'future-space-planner',
    title: 'Interactive Space Planner',
    description: 'Interactive top-down 2D canvas for room layout and furniture placement',
    category: 'Upcoming Tool',
    icon: '🏢',
    keywords: ['planner', 'space', 'canvas', 'room', 'layout', '2d', 'phase 2.5'],
    actionType: 'placeholder',
    available: false,
    badge: 'Phase 2.5'
  }
];

class CommandRegistryClass {
  constructor() {
    this.commands = new Map();
    this.initDefaultCommands();
  }

  initDefaultCommands() {
    this.commands.clear();
    for (const cmd of DEFAULT_COMMANDS) {
      this.register(cmd);
    }
  }

  register(command) {
    if (!command || typeof command !== 'object') {
      throw new Error('Command must be an object');
    }
    if (!command.id || typeof command.id !== 'string') {
      throw new Error('Command must have a valid string id');
    }
    if (!command.title || typeof command.title !== 'string') {
      throw new Error('Command must have a valid string title');
    }
    if (!command.category || typeof command.category !== 'string') {
      throw new Error('Command must have a valid string category');
    }

    const entry = {
      id: command.id,
      title: command.title,
      description: command.description || '',
      category: command.category,
      icon: command.icon || '⚡',
      keywords: Array.isArray(command.keywords) ? [...command.keywords] : [],
      shortcut: command.shortcut || null,
      action: typeof command.action === 'function' ? command.action : null,
      actionType: command.actionType || 'action',
      available: command.available !== false,
      badge: command.badge || null
    };

    this.commands.set(entry.id, entry);
    return entry;
  }

  unregister(id) {
    return this.commands.delete(id);
  }

  getCommand(id) {
    return this.commands.get(id) || null;
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }

  getAvailableCommands() {
    return this.getAllCommands().filter(c => c.available);
  }

  searchCommands(query) {
    const all = this.getAllCommands();
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return {
        query: '',
        results: all,
        favorites: this.getFavoriteCommands(),
        recent: this.getRecentCommands(),
        total: all.length
      };
    }

    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const favorites = new Set(this.getFavoriteIds());

    const matched = all.filter(cmd => {
      const titleLower = cmd.title.toLowerCase();
      const descLower = cmd.description.toLowerCase();
      const catLower = cmd.category.toLowerCase();
      const idLower = cmd.id.toLowerCase();
      const keywords = cmd.keywords.map(k => k.toLowerCase());

      return tokens.every(token => {
        return (
          titleLower.includes(token) ||
          descLower.includes(token) ||
          catLower.includes(token) ||
          idLower.includes(token) ||
          keywords.some(k => k.includes(token))
        );
      });
    });

    // Sort matching results: Available first, then Favorites, then upcoming
    matched.sort((a, b) => {
      // 1. Available vs Upcoming
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;

      // 2. Favorites first
      const aFav = favorites.has(a.id);
      const bFav = favorites.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // 3. Exact prefix match boost
      const queryLower = query.trim().toLowerCase();
      const aTitleStarts = a.title.toLowerCase().startsWith(queryLower);
      const bTitleStarts = b.title.toLowerCase().startsWith(queryLower);
      if (aTitleStarts && !bTitleStarts) return -1;
      if (!aTitleStarts && bTitleStarts) return 1;

      return 0;
    });

    return {
      query: query.trim(),
      results: matched,
      favorites: [],
      recent: [],
      total: matched.length
    };
  }

  // ---------------------------------------------------------------------------
  // Recent Commands Management
  // ---------------------------------------------------------------------------
  getRecentIds() {
    try {
      const raw = StorageService.getItem(RECENT_COMMANDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => typeof id === 'string' && this.commands.has(id));
        }
      }
    } catch (e) {
      // Storage corrupted, fallback gracefully
    }
    return [];
  }

  getRecentCommands() {
    const ids = this.getRecentIds();
    return ids.map(id => this.getCommand(id)).filter(Boolean);
  }

  addRecentCommand(commandId) {
    if (!commandId || !this.commands.has(commandId)) return;

    let recents = this.getRecentIds();
    // Remove if already present (to move to top)
    recents = recents.filter(id => id !== commandId);
    recents.unshift(commandId);

    if (recents.length > MAX_RECENT_COMMANDS) {
      recents = recents.slice(0, MAX_RECENT_COMMANDS);
    }

    try {
      StorageService.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recents));
    } catch (e) {}
  }

  clearRecentCommands() {
    try {
      StorageService.removeItem(RECENT_COMMANDS_KEY);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Favorites Management
  // ---------------------------------------------------------------------------
  getFavoriteIds() {
    try {
      const raw = StorageService.getItem(FAVORITE_COMMANDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => typeof id === 'string' && this.commands.has(id));
        }
      }
    } catch (e) {
      // Storage corrupted, fallback gracefully
    }
    return [];
  }

  getFavoriteCommands() {
    const ids = this.getFavoriteIds();
    return ids.map(id => this.getCommand(id)).filter(Boolean);
  }

  isFavorite(commandId) {
    return this.getFavoriteIds().includes(commandId);
  }

  toggleFavorite(commandId) {
    if (!commandId || !this.commands.has(commandId)) return false;

    let favs = this.getFavoriteIds();
    let isNowFav = false;

    if (favs.includes(commandId)) {
      favs = favs.filter(id => id !== commandId);
      isNowFav = false;
    } else {
      if (favs.length >= MAX_FAVORITE_COMMANDS) {
        favs.pop();
      }
      favs.unshift(commandId);
      isNowFav = true;
    }

    try {
      StorageService.setItem(FAVORITE_COMMANDS_KEY, JSON.stringify(favs));
    } catch (e) {}

    return isNowFav;
  }
}

const CommandRegistry = new CommandRegistryClass();

  // =========================================================================
  // MODULE: Visualizer
  // =========================================================================

/**
 * Architecture Helping Hand - Proportional Visualizer & Graphic Scale Bar Renderer
 * Rich 2D Top-Down Architectural Blueprint Drawings & Proportional Visualizer
 */




function getReferenceSilhouette(iconType) {
  switch (iconType) {
    case 'pen':
      return `
        <svg viewBox="0 0 100 100" class="silhouette-svg" fill="currentColor">
          <path d="M75,10 L90,25 L35,80 L15,85 L20,65 Z" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <path d="M15,85 L25,82 L18,75 Z" fill="currentColor"/>
          <line x1="30" y1="70" x2="80" y2="20" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
        </svg>
      `;
    case 'chair':
      return `
        <svg viewBox="0 0 100 100" class="silhouette-svg" fill="currentColor">
          <rect x="30" y="45" width="40" height="8" rx="2" fill-opacity="0.3"/>
          <path d="M35,20 L35,45 M65,20 L65,45 M35,25 L65,25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M33,53 L28,85 M67,53 L72,85 M40,53 L38,85 M60,53 L62,85" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `;
    case 'desk':
      return `
        <svg viewBox="0 0 120 100" class="silhouette-svg" fill="currentColor">
          <rect x="15" y="35" width="90" height="10" rx="2" fill-opacity="0.3"/>
          <line x1="22" y1="45" x2="22" y2="85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <line x1="98" y1="45" x2="98" y2="85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <rect x="70" y="45" width="25" height="35" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;
    case 'human':
      return `
        <svg viewBox="0 0 100 120" class="silhouette-svg" fill="currentColor">
          <circle cx="50" cy="18" r="8" fill-opacity="0.3" stroke="currentColor" stroke-width="2"/>
          <path d="M42,28 C38,28 35,32 35,38 L37,65 L43,65 L43,105 L47,105 L48,68 L52,68 L53,105 L57,105 L57,65 L63,65 L65,38 C65,32 62,28 58,28 Z" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
    case 'car':
      return `
        <svg viewBox="0 0 140 80" class="silhouette-svg" fill="currentColor">
          <path d="M15,50 L25,32 C28,26 35,24 45,24 L85,24 C95,24 105,30 115,38 L128,45 C133,48 135,52 135,56 L135,62 L15,62 Z" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <circle cx="40" cy="62" r="11" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2.5"/>
          <circle cx="105" cy="62" r="11" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2.5"/>
          <path d="M48,28 L80,28 L80,44 L38,44 Z" fill-opacity="0.3"/>
          <path d="M85,28 L108,38 L108,44 L85,44 Z" fill-opacity="0.3"/>
        </svg>
      `;
    case 'house':
      return `
        <svg viewBox="0 0 120 100" class="silhouette-svg" fill="currentColor">
          <polygon points="60,15 15,48 105,48" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <rect x="25" y="48" width="70" height="42" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          <rect x="52" y="62" width="16" height="28" fill-opacity="0.3" stroke-width="1.5"/>
          <rect x="33" y="55" width="12" height="12" fill-opacity="0.3" stroke-width="1.5"/>
          <rect x="75" y="55" width="12" height="12" fill-opacity="0.3" stroke-width="1.5"/>
        </svg>
      `;
    case 'building':
      return `
        <svg viewBox="0 0 100 120" class="silhouette-svg" fill="currentColor">
          <rect x="20" y="15" width="60" height="95" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          ${[25, 40, 55, 70, 85].map(y => `
            <rect x="28" y="${y}" width="10" height="8" fill-opacity="0.3"/>
            <rect x="45" y="${y}" width="10" height="8" fill-opacity="0.3"/>
            <rect x="62" y="${y}" width="10" height="8" fill-opacity="0.3"/>
          `).join('')}
        </svg>
      `;
    case 'tower':
      return `
        <svg viewBox="0 0 80 140" class="silhouette-svg" fill="currentColor">
          <polygon points="40,5 38,20 42,20" stroke="currentColor" stroke-width="1.5"/>
          <rect x="25" y="20" width="30" height="110" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          ${[28, 42, 56, 70, 84, 98, 112].map(y => `
            <line x1="25" y1="${y}" x2="55" y2="${y}" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/>
          `).join('')}
        </svg>
      `;
    case 'city':
    default:
      return `
        <svg viewBox="0 0 140 100" class="silhouette-svg" fill="currentColor">
          <rect x="10" y="40" width="25" height="50" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
          <rect x="40" y="20" width="30" height="70" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>
          <rect x="75" y="35" width="22" height="55" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
          <rect x="102" y="10" width="28" height="80" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
  }
}

function renderGraphicScaleBar(scaleRatio, realMeters = 5) {
  let divisionMeters = 1;
  if (scaleRatio <= 10) divisionMeters = 0.1;
  else if (scaleRatio <= 25) divisionMeters = 0.5;
  else if (scaleRatio <= 100) divisionMeters = 1;
  else if (scaleRatio <= 500) divisionMeters = 5;
  else if (scaleRatio <= 2500) divisionMeters = 25;
  else divisionMeters = 100;

  const totalLengthM = divisionMeters * 4;
  const segments = [
    { start: 0, end: divisionMeters, filled: true },
    { start: divisionMeters, end: divisionMeters * 2, filled: false },
    { start: divisionMeters * 2, end: divisionMeters * 3, filled: true },
    { start: divisionMeters * 3, end: divisionMeters * 4, filled: false }
  ];

  return `
    <div class="scale-bar-wrapper">
      <div class="scale-bar-labels" style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
        <span>0</span>
        <span>${formatNumber(divisionMeters, 1)}m</span>
        <span>${formatNumber(divisionMeters * 2, 1)}m</span>
        <span>${formatNumber(divisionMeters * 3, 1)}m</span>
        <span>${formatNumber(totalLengthM, 1)}m</span>
      </div>
      <div class="scale-bar-track" style="display: flex; height: 10px; border: 1px solid var(--border-medium); border-radius: 2px; overflow: hidden; background: var(--bg-surface-elevated);">
        ${segments.map(s => `
          <div style="flex: 1; background: ${s.filled ? 'var(--accent-primary)' : 'transparent'}; border-right: 1px solid var(--border-subtle);"></div>
        `).join('')}
      </div>
      <div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted); text-align: center; margin-top: 0.35rem;">
        Graphic Architectural Scale Bar @ 1:${scaleRatio}
      </div>
    </div>
  `;
}

function updateVisualization(params = {}) {
  const {
    containerId = 'visualizer-container',
    containerElement = document.getElementById(containerId),
    realMeters = 5,
    scaleRatio = 50,
    drawingMeters = 0.1
  } = params;

  if (!containerElement) return;

  const safeRealMeters = typeof realMeters === 'number' && !isNaN(realMeters) && isFinite(realMeters) && realMeters > 0
    ? realMeters
    : 5;

  const ref = REAL_WORLD_REFERENCES.find(r => safeRealMeters >= r.minMeters && safeRealMeters < r.maxMeters) 
    || REAL_WORLD_REFERENCES[REAL_WORLD_REFERENCES.length - 1];

  const refRatio = safeRealMeters / ref.defaultLength;
  let comparisonText = '';
  if (refRatio < 0.9) {
    comparisonText = `About ${(refRatio * 100).toFixed(0)}% the size of a ${ref.name}`;
  } else if (refRatio >= 0.9 && refRatio <= 1.1) {
    comparisonText = `Roughly equal to the size of a ${ref.name}`;
  } else {
    comparisonText = `About ${refRatio.toFixed(1)}× the size of a ${ref.name}`;
  }

  const refSvg = getReferenceSilhouette(ref.icon);
  const scaleBarHtml = renderGraphicScaleBar(scaleRatio, safeRealMeters);

  containerElement.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary);"></span>
          <span style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary);">Scale Proportions (1:${scaleRatio})</span>
        </div>
        <span style="font-size: 0.74rem; font-family: var(--font-mono); padding: 0.15rem 0.45rem; border-radius: 4px; background: var(--bg-chip); color: var(--accent-primary);">${ref.name}</span>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: 8px; border: 1px solid var(--border-subtle);">
        <div style="flex: 1;">
          <div style="font-size: 0.88rem; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); margin-bottom: 0.25rem;">
            ${formatNumber(safeRealMeters, 3)} m Site Dimension
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${comparisonText}</div>
        </div>

        <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; color: var(--accent-primary); flex-shrink: 0;">
          ${refSvg}
        </div>
      </div>

      <div style="padding-top: 0.25rem;">
        ${scaleBarHtml}
      </div>
    </div>
  `;
}

/**
 * Generates accurate 2D architectural blueprint top-down drawings
 * for every individual item in the architectural library.
 */
function getFurniturePlanSVG(item) {
  if (!item) return '';
  const id = item.id || '';
  const type = item.type || 'table';

  // 1. Precise Individual Item ID Handlers
  if (id === 'sofa-2p') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 130 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="118" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
        <rect x="22" y="9" width="86" height="15" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="8" y="9" width="15" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="107" y="9" width="15" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <line x1="65" y1="24" x2="65" y2="70" stroke="currentColor" stroke-width="1.6"/>
        <path d="M23,24 L107,24" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
      </svg>
    `;
  }

  if (id === 'sofa-4p') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 180 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="168" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
        <rect x="24" y="9" width="132" height="15" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="8" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="156" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <line x1="57" y1="24" x2="57" y2="70" stroke="currentColor" stroke-width="1.5"/>
        <line x1="90" y1="24" x2="90" y2="70" stroke="currentColor" stroke-width="1.5"/>
        <line x1="123" y1="24" x2="123" y2="70" stroke="currentColor" stroke-width="1.5"/>
        <path d="M24,24 L156,24" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
      </svg>
    `;
  }

  if (id === 'sofa-u') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 170 120" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6,6 L164,6 L164,114 L114,114 L114,56 L56,56 L56,114 L6,114 Z" fill="currentColor" fill-opacity="0.15"/>
        <rect x="18" y="8" width="134" height="14" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="8" y="8" width="14" height="102" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <rect x="148" y="8" width="14" height="102" rx="3" fill="currentColor" fill-opacity="0.25"/>
        <!-- Central Table Space -->
        <rect x="68" y="70" width="34" height="34" rx="4" stroke-dasharray="3 3" stroke-opacity="0.7"/>
      </svg>
    `;
  }

  if (id === 'sofa-chesterfield') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 160 85" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="148" height="72" rx="14" fill="currentColor" fill-opacity="0.15"/>
        <rect x="22" y="8" width="116" height="22" rx="6" fill="currentColor" fill-opacity="0.3"/>
        <circle cx="15" cy="42" r="9" fill="currentColor" fill-opacity="0.3"/>
        <circle cx="145" cy="42" r="9" fill="currentColor" fill-opacity="0.3"/>
        <!-- Tufted Button Grid -->
        ${[18, 42, 66, 90, 114, 138].map(x => `<circle cx="${x}" cy="18" r="2.5" fill="currentColor"/>`).join('')}
        ${[30, 54, 78, 102, 126].map(x => `<circle cx="${x}" cy="26" r="2.5" fill="currentColor"/>`).join('')}
        <line x1="80" y1="30" x2="80" y2="74" stroke-width="1.5"/>
      </svg>
    `;
  }

  if (id === 'chaise-lounge') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 150 75" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="8" width="138" height="58" rx="10" fill="currentColor" fill-opacity="0.15"/>
        <!-- Single Arm & Reclined Headrest -->
        <rect x="8" y="8" width="18" height="58" rx="6" fill="currentColor" fill-opacity="0.3"/>
        <rect x="26" y="10" width="34" height="54" rx="4" fill="currentColor" fill-opacity="0.2"/>
        <line x1="60" y1="8" x2="60" y2="66" stroke-dasharray="3 3"/>
      </svg>
    `;
  }

  if (id === 'wingback-chair') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="10" y="10" width="70" height="70" rx="8" fill="currentColor" fill-opacity="0.15"/>
        <!-- Wing Ears -->
        <path d="M10,24 C10,12 24,12 24,12 L66,12 C66,12 80,12 80,24" stroke-width="3.5" fill="currentColor" fill-opacity="0.25"/>
        <rect x="12" y="22" width="12" height="52" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <rect x="66" y="22" width="12" height="52" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <rect x="24" y="32" width="42" height="42" rx="4" fill="currentColor" fill-opacity="0.1"/>
      </svg>
    `;
  }

  if (id === 'recliner') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 95 95" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="10" y="10" width="75" height="75" rx="12" fill="currentColor" fill-opacity="0.15"/>
        <rect x="20" y="12" width="55" height="18" rx="6" fill="currentColor" fill-opacity="0.35"/>
        <rect x="12" y="16" width="12" height="64" rx="5" fill="currentColor" fill-opacity="0.3"/>
        <rect x="71" y="16" width="12" height="64" rx="5" fill="currentColor" fill-opacity="0.3"/>
        <!-- Footrest Line -->
        <line x1="24" y1="74" x2="71" y2="74" stroke-width="2" stroke-dasharray="3 3"/>
      </svg>
    `;
  }

  if (id === 'bed-super-king') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 150 130" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="134" height="114" rx="6" fill="currentColor" fill-opacity="0.12"/>
        <rect x="8" y="8" width="134" height="16" rx="2" fill="currentColor" fill-opacity="0.35"/>
        <!-- 3 King Pillows -->
        <rect x="14" y="28" width="36" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="57" y="28" width="36" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <rect x="100" y="28" width="36" height="26" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <!-- Luxury Quilt Line -->
        <path d="M8,72 Q75,84 142,72" stroke-width="2" stroke-dasharray="3 3"/>
        <line x1="8" y1="96" x2="142" y2="96" stroke-width="1.2" stroke-opacity="0.4"/>
      </svg>
    `;
  }

  if (id === 'bed-bunk') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 95 125" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="10" y="8" width="75" height="108" rx="4" fill="currentColor" fill-opacity="0.12"/>
        <rect x="10" y="8" width="75" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
        <rect x="18" y="26" width="59" height="24" rx="4" fill="currentColor" fill-opacity="0.25"/>
        <!-- Bunk Bed Frame Posts & Foot Ladder -->
        <circle cx="14" cy="12" r="3" fill="currentColor"/>
        <circle cx="81" cy="12" r="3" fill="currentColor"/>
        <circle cx="14" cy="112" r="3" fill="currentColor"/>
        <circle cx="81" cy="112" r="3" fill="currentColor"/>
        <!-- Ladder Rungs at Foot -->
        <line x1="28" y1="102" x2="67" y2="102" stroke-width="2.5"/>
        <line x1="28" y1="108" x2="67" y2="108" stroke-width="2.5"/>
      </svg>
    `;
  }

  if (id === 'crib-baby') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 85 115" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="69" height="98" rx="6" fill="currentColor" fill-opacity="0.1"/>
        <!-- Safety Slats -->
        ${[18, 28, 38, 48, 58, 68].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="106" stroke-width="1" stroke-opacity="0.3"/>`).join('')}
        <rect x="16" y="16" width="53" height="82" rx="4" stroke="currentColor" stroke-width="1.8" fill="currentColor" fill-opacity="0.15"/>
        <!-- Baby Pillow -->
        <rect x="24" y="24" width="37" height="18" rx="4" fill="currentColor" fill-opacity="0.3"/>
      </svg>
    `;
  }

  if (id === 'fireplace-hearth') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 75" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="124" height="58" rx="2" fill="currentColor" fill-opacity="0.18"/>
        <!-- Firebox Opening -->
        <rect x="36" y="8" width="68" height="34" fill="var(--bg-app)" stroke="currentColor" stroke-width="2.2"/>
        <!-- Fire grate & flames -->
        <line x1="44" y1="30" x2="96" y2="30" stroke-width="2"/>
        <path d="M70,18 Q76,26 70,30 Q64,26 70,18 Z" fill="currentColor" fill-opacity="0.5"/>
        <line x1="8" y1="44" x2="132" y2="44" stroke-dasharray="3 3"/>
      </svg>
    `;
  }

  if (id === 'grand-piano') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 130 130" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Baby Grand Curved Rim -->
        <path d="M15,10 L115,10 C115,48 95,85 88,118 L15,118 Z" fill="currentColor" fill-opacity="0.2"/>
        <!-- Keyboard Front -->
        <rect x="15" y="10" width="18" height="108" fill="currentColor" fill-opacity="0.35"/>
        ${[18, 30, 42, 54, 66, 78, 90, 102].map(y => `
          <rect x="22" y="${y}" width="10" height="7" fill="currentColor"/>
        `).join('')}
        <!-- Piano Stool -->
        <rect x="4" y="45" width="8" height="38" rx="2" stroke="currentColor" fill="currentColor" fill-opacity="0.4"/>
      </svg>
    `;
  }

  if (id === 'sink-double') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="10" width="124" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
        <!-- Two Basins -->
        <rect x="16" y="18" width="48" height="44" rx="6" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="40" cy="40" r="3.5" fill="currentColor"/>
        <rect x="76" y="18" width="48" height="44" rx="6" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="100" cy="40" r="3.5" fill="currentColor"/>
        <!-- Center Mixer Tap -->
        <circle cx="70" cy="18" r="4" fill="currentColor"/>
        <line x1="70" y1="18" x2="70" y2="28" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (id === 'vanity-double-120' || id === 'vanity-double-160') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="10" width="144" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
        <!-- Left Basin -->
        <ellipse cx="45" cy="40" rx="24" ry="18" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="45" cy="40" r="3.5" fill="currentColor"/>
        <circle cx="45" cy="22" r="3" fill="currentColor"/>
        <!-- Right Basin -->
        <ellipse cx="115" cy="40" rx="24" ry="18" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="115" cy="40" r="3.5" fill="currentColor"/>
        <circle cx="115" cy="22" r="3" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'toilet-ada') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 100 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Wall Frame & Cistern -->
        <rect x="22" y="8" width="56" height="22" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <ellipse cx="50" cy="64" rx="24" ry="30" fill="currentColor" fill-opacity="0.14"/>
        <ellipse cx="50" cy="66" rx="15" ry="20" stroke-dasharray="3 3" stroke-opacity="0.6"/>
        <!-- Left & Right ADA Grab Bars -->
        <line x1="8" y1="30" x2="8" y2="95" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
        <line x1="92" y1="30" x2="92" y2="95" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
      </svg>
    `;
  }

  if (id === 'urinal-wall') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Wall Line -->
        <line x1="10" y1="12" x2="80" y2="12" stroke-width="3"/>
        <!-- Privacy Partition Fin -->
        <line x1="18" y1="8" x2="18" y2="75" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="72" y1="8" x2="72" y2="75" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Ceramic Urinal Bowl -->
        <path d="M30,12 L60,12 L56,65 C56,72 34,72 34,65 Z" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="45" cy="50" r="3" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'bathtub-corner-jacuzzi') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Corner Triangle / Quarter Round Tub -->
        <path d="M10,10 L100,10 A90,90 0 0,1 10,100 Z" fill="currentColor" fill-opacity="0.18"/>
        <!-- Inner Tub Contour -->
        <path d="M22,22 L86,22 A64,64 0 0,1 22,86 Z" stroke-dasharray="3 3" stroke-opacity="0.7"/>
        <circle cx="35" cy="35" r="4.5" fill="currentColor"/>
        <!-- Whirlpool Jet Nozzles -->
        ${[30, 48, 66].map(a => `<circle cx="${24 + a * 0.7}" cy="${86 - a * 0.7}" r="2" fill="currentColor"/>`).join('')}
      </svg>
    `;
  }

  if (id === 'shower-corner-neo') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Neo-Angle Corner (5-Sided Diamond) -->
        <path d="M10,10 L90,10 L90,45 L45,90 L10,90 Z" fill="currentColor" fill-opacity="0.14"/>
        <line x1="45" y1="90" x2="90" y2="45" stroke-width="3" stroke="var(--accent-primary)"/>
        <!-- Drain & Slopes -->
        <line x1="10" y1="10" x2="50" y2="50" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <line x1="90" y1="10" x2="50" y2="50" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <line x1="10" y1="90" x2="50" y2="50" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <circle cx="50" cy="50" r="5" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'shower-ada-rollin') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Zero Threshold Floor -->
        <rect x="8" y="8" width="94" height="94" stroke-dasharray="4 4" fill="currentColor" fill-opacity="0.1"/>
        <!-- Fold-Down Seat -->
        <rect x="12" y="12" width="30" height="30" rx="3" fill="currentColor" fill-opacity="0.35"/>
        <line x1="12" y1="12" x2="42" y2="42" stroke-width="1.5"/>
        <!-- Wall Grab Bars -->
        <line x1="10" y1="46" x2="10" y2="96" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
        <line x1="46" y1="10" x2="96" y2="10" stroke-width="4.5" stroke-linecap="round" stroke="var(--accent-primary)"/>
        <!-- Linear Drain -->
        <rect x="14" y="90" width="82" height="6" rx="2" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'stair-straight') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 70" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="8" width="128" height="54" fill="currentColor" fill-opacity="0.08"/>
        <!-- 10 Parallel Treads -->
        ${[18, 30, 42, 54, 66, 78, 90, 102, 114].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="62" stroke-width="1.6"/>`).join('')}
        <!-- Walking Line with UP arrow -->
        <line x1="12" y1="35" x2="122" y2="35" stroke-width="2"/>
        <circle cx="12" cy="35" r="3.5" fill="currentColor"/>
        <polyline points="114 29 122 35 114 41" stroke-width="2"/>
        <text x="96" y="28" font-size="9" font-family="sans-serif" font-weight="800" fill="currentColor">UP</text>
      </svg>
    `;
  }

  if (id === 'stair-l-shaped') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 110 110" fill="none" stroke="currentColor" stroke-width="2">
        <!-- L-Shape Stairs -->
        <path d="M8,8 L102,8 L102,48 L48,48 L48,102 L8,102 Z" fill="currentColor" fill-opacity="0.08"/>
        <!-- Landing Square -->
        <rect x="8" y="8" width="40" height="40" fill="currentColor" fill-opacity="0.18"/>
        ${[58, 68, 78, 88, 98].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="48" stroke-width="1.5"/>`).join('')}
        ${[58, 68, 78, 88, 98].map(y => `<line x1="8" y1="${y}" x2="48" y2="${y}" stroke-width="1.5"/>`).join('')}
        <path d="M28,95 L28,28 L95,28" stroke-width="2" stroke-linejoin="round"/>
        <polyline points="88 22 95 28 88 34" stroke-width="2"/>
      </svg>
    `;
  }

  if (id === 'stair-spiral') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="50" cy="50" r="42" fill="currentColor" fill-opacity="0.08"/>
        <circle cx="50" cy="50" r="7" fill="currentColor"/>
        <!-- Radial Steps -->
        ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          return `<line x1="50" y1="50" x2="${(50 + 42 * Math.cos(rad)).toFixed(1)}" y2="${(50 + 42 * Math.sin(rad)).toFixed(1)}" stroke-width="1.4"/>`;
        }).join('')}
        <path d="M72,50 A22,22 0 1,1 50,28" stroke-width="2.2" stroke-linecap="round"/>
        <polyline points="54 24 50 28 54 32" stroke-width="2"/>
      </svg>
    `;
  }

  if (id === 'car-ada-bay') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 150 90" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Parking Stall -->
        <rect x="8" y="8" width="94" height="74" fill="currentColor" fill-opacity="0.1"/>
        <!-- Hatched Transfer Aisle -->
        <rect x="102" y="8" width="40" height="74" fill="currentColor" fill-opacity="0.05"/>
        ${[18, 30, 42, 54, 66].map(y => `<line x1="102" y1="${y}" x2="142" y2="${y + 12}" stroke-width="1.2" stroke-dasharray="2 2"/>`).join('')}
        <!-- International Symbol of Access (Wheelchair) -->
        <circle cx="55" cy="35" r="5" fill="var(--accent-primary)"/>
        <path d="M55,42 L55,56 L65,56" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="55" cy="56" r="10" stroke="var(--accent-primary)" stroke-width="2.5" fill="none"/>
      </svg>
    `;
  }

  if (id === 'gym-treadmill') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 130 75" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="114" height="58" rx="6" fill="currentColor" fill-opacity="0.14"/>
        <!-- Front Display Console & Handrails -->
        <rect x="12" y="14" width="22" height="46" rx="4" fill="currentColor" fill-opacity="0.4"/>
        <line x1="24" y1="12" x2="70" y2="12" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="24" y1="62" x2="70" y2="62" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Running Belt Surface -->
        <rect x="36" y="18" width="80" height="38" rx="3" fill="currentColor" fill-opacity="0.25"/>
      </svg>
    `;
  }

  if (id === 'gym-bench-press') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Padded Workout Bench -->
        <rect x="25" y="32" width="70" height="26" rx="4" fill="currentColor" fill-opacity="0.3"/>
        <!-- Upright Support Posts -->
        <rect x="25" y="12" width="8" height="8" fill="currentColor"/>
        <rect x="25" y="70" width="8" height="8" fill="currentColor"/>
        <!-- Barbell with Weight Plates -->
        <line x1="29" y1="4" x2="29" y2="86" stroke-width="3.5"/>
        <rect x="24" y="6" width="10" height="8" rx="1" fill="currentColor"/>
        <rect x="24" y="76" width="10" height="8" rx="1" fill="currentColor"/>
      </svg>
    `;
  }

  if (id === 'hospital-bed') {
    return `
      <svg class="furn-plan-svg" viewBox="0 0 140 85" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="10" width="124" height="65" rx="5" fill="currentColor" fill-opacity="0.12"/>
        <!-- Head Section & Pillow -->
        <line x1="42" y1="10" x2="42" y2="75" stroke-width="2"/>
        <rect x="14" y="24" width="22" height="37" rx="3" fill="currentColor" fill-opacity="0.3"/>
        <!-- Side Safety Rails -->
        <rect x="42" y="8" width="50" height="5" rx="2" fill="currentColor" fill-opacity="0.5"/>
        <rect x="42" y="72" width="50" height="5" rx="2" fill="currentColor" fill-opacity="0.5"/>
        <!-- Medical Cross -->
        <path d="M78,36 H84 V30 H90 V36 H96 V42 H90 V48 H84 V42 H78 Z" fill="currentColor" fill-opacity="0.3"/>
      </svg>
    `;
  }

  // 2. Specialized Type Fallbacks
  switch (type) {
    case 'sofa':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="148" height="68" rx="8" fill="currentColor" fill-opacity="0.14"/>
          <rect x="24" y="9" width="112" height="16" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="9" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="135" y="9" width="16" height="62" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <line x1="62" y1="26" x2="62" y2="70" stroke="currentColor" stroke-width="1.6"/>
          <line x1="98" y1="26" x2="98" y2="70" stroke="currentColor" stroke-width="1.6"/>
          <path d="M26,26 L134,26" stroke-width="1.5" stroke-dasharray="2 2" stroke-opacity="0.6"/>
        </svg>
      `;

    case 'sectional':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6,6 L154,6 L154,62 L94,62 L94,104 L6,104 Z" fill="currentColor" fill-opacity="0.15"/>
          <rect x="22" y="9" width="128" height="14" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <rect x="9" y="9" width="14" height="92" rx="3" fill="currentColor" fill-opacity="0.25"/>
          <rect x="138" y="9" width="13" height="50" rx="3" fill="currentColor" fill-opacity="0.22"/>
          <line x1="60" y1="24" x2="60" y2="62" stroke="currentColor" stroke-width="1.5"/>
          <line x1="100" y1="24" x2="100" y2="62" stroke="currentColor" stroke-width="1.5"/>
          <line x1="24" y1="62" x2="94" y2="62" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;

    case 'chair':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="70" height="70" rx="10" fill="currentColor" fill-opacity="0.15"/>
          <rect x="20" y="14" width="50" height="16" rx="4" fill="currentColor" fill-opacity="0.3"/>
          <rect x="13" y="14" width="10" height="60" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="67" y="14" width="10" height="60" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <rect x="24" y="32" width="42" height="42" rx="4" fill="currentColor" fill-opacity="0.1"/>
        </svg>
      `;

    case 'chair_small':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 75 75" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="12" y="12" width="51" height="51" rx="6" fill="currentColor" fill-opacity="0.15"/>
          <path d="M12,24 L63,24" stroke-width="2.5"/>
          <rect x="16" y="14" width="43" height="8" rx="2" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'chair_round':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="45" cy="45" r="34" fill="currentColor" fill-opacity="0.18"/>
          <line x1="45" y1="15" x2="45" y2="75" stroke-dasharray="3 3" stroke-opacity="0.5"/>
          <line x1="15" y1="45" x2="75" y2="45" stroke-dasharray="3 3" stroke-opacity="0.5"/>
          <circle cx="45" cy="45" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'bed':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="8" width="120" height="104" rx="6" fill="currentColor" fill-opacity="0.12"/>
          <rect x="10" y="8" width="120" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
          <rect x="18" y="28" width="46" height="26" rx="5" fill="currentColor" fill-opacity="0.25"/>
          <rect x="76" y="28" width="46" height="26" rx="5" fill="currentColor" fill-opacity="0.25"/>
          <path d="M10,68 Q70,78 130,68" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'bed_single':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 120" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="8" width="70" height="104" rx="6" fill="currentColor" fill-opacity="0.12"/>
          <rect x="10" y="8" width="70" height="14" rx="2" fill="currentColor" fill-opacity="0.35"/>
          <rect x="18" y="28" width="54" height="24" rx="4" fill="currentColor" fill-opacity="0.25"/>
          <path d="M10,66 Q45,74 80,66" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'table':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="124" height="60" rx="6" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="18" cy="20" r="4" fill="currentColor"/>
          <circle cx="122" cy="20" r="4" fill="currentColor"/>
          <circle cx="18" cy="60" r="4" fill="currentColor"/>
          <circle cx="122" cy="60" r="4" fill="currentColor"/>
          <rect x="36" y="4" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="76" y="4" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="36" y="71" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
          <rect x="76" y="71" width="28" height="5" rx="1" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'table_round':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="50" cy="50" r="38" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="50" cy="50" r="8" stroke-dasharray="2 2" stroke-opacity="0.6"/>
          <circle cx="50" cy="6" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="50" cy="94" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="6" cy="50" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="94" cy="50" r="4" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'counter':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="124" height="60" rx="3" fill="currentColor" fill-opacity="0.15"/>
          <line x1="8" y1="52" x2="132" y2="52" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="40" cy="66" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="70" cy="66" r="4" fill="currentColor" fill-opacity="0.4"/>
          <circle cx="100" cy="66" r="4" fill="currentColor" fill-opacity="0.4"/>
        </svg>
      `;

    case 'storage':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 70" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="124" height="50" rx="3" fill="currentColor" fill-opacity="0.15"/>
          <line x1="49" y1="10" x2="49" y2="60"/>
          <line x1="90" y1="10" x2="90" y2="60"/>
          <line x1="45" y1="35" x2="45" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="53" y1="35" x2="53" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="86" y1="35" x2="86" y2="42" stroke-width="3" stroke-linecap="round"/>
          <line x1="94" y1="35" x2="94" y2="42" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `;

    case 'toilet':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 80 100" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="14" y="8" width="52" height="22" rx="4" fill="currentColor" fill-opacity="0.3"/>
          <ellipse cx="40" cy="62" rx="24" ry="30" fill="currentColor" fill-opacity="0.12"/>
          <ellipse cx="40" cy="64" rx="15" ry="20" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="40" cy="19" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'sink':
    case 'vanity':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="10" width="104" height="60" rx="4" fill="currentColor" fill-opacity="0.12"/>
          <ellipse cx="60" cy="40" rx="34" ry="22" fill="currentColor" fill-opacity="0.22"/>
          <circle cx="60" cy="22" r="3" fill="currentColor"/>
          <circle cx="60" cy="42" r="4" fill="currentColor"/>
        </svg>
      `;

    case 'bath':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 150 75" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="8" width="138" height="59" rx="14" fill="currentColor" fill-opacity="0.15"/>
          <ellipse cx="75" cy="37.5" rx="58" ry="22" stroke-dasharray="3 3" stroke-opacity="0.7"/>
          <circle cx="25" cy="37.5" r="4.5" fill="currentColor"/>
        </svg>
      `;

    case 'shower':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="2" fill="currentColor" fill-opacity="0.1"/>
          <line x1="8" y1="8" x2="82" y2="82" stroke-dasharray="3 3" stroke-opacity="0.4"/>
          <line x1="8" y1="82" x2="82" y2="8" stroke-dasharray="3 3" stroke-opacity="0.4"/>
          <circle cx="45" cy="45" r="7" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'cooktop':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="4" fill="currentColor" fill-opacity="0.18"/>
          <circle cx="28" cy="28" r="12" stroke-width="2"/>
          <circle cx="62" cy="28" r="9" stroke-width="2"/>
          <circle cx="28" cy="62" r="9" stroke-width="2"/>
          <circle cx="62" cy="62" r="14" stroke-width="2"/>
        </svg>
      `;

    case 'fridge':
    case 'appliance':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="74" height="74" rx="4" fill="currentColor" fill-opacity="0.16"/>
          <line x1="8" y1="20" x2="82" y2="20" stroke-width="2"/>
          <circle cx="45" cy="52" r="18" stroke-dasharray="3 3" stroke-opacity="0.6"/>
          <circle cx="45" cy="52" r="7" fill="currentColor" fill-opacity="0.3"/>
        </svg>
      `;

    case 'door':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="12" height="10" fill="currentColor"/>
          <rect x="80" y="8" width="12" height="10" fill="currentColor"/>
          <line x1="20" y1="13" x2="20" y2="82" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M20,82 A68,68 0 0,0 88,13" stroke-width="2" stroke-dasharray="4 4" stroke-opacity="0.8"/>
        </svg>
      `;

    case 'door_double':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="8" width="10" height="10" fill="currentColor"/>
          <rect x="124" y="8" width="10" height="10" fill="currentColor"/>
          <line x1="16" y1="13" x2="16" y2="60" stroke-width="3" stroke-linecap="round"/>
          <line x1="124" y1="13" x2="124" y2="60" stroke-width="3" stroke-linecap="round"/>
          <path d="M16,60 A47,47 0 0,0 63,13" stroke-width="1.8" stroke-dasharray="3 3"/>
          <path d="M124,60 A47,47 0 0,1 77,13" stroke-width="1.8" stroke-dasharray="3 3"/>
        </svg>
      `;

    case 'door_sliding':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 50" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="14" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
          <rect x="65" y="26" width="65" height="8" rx="2" fill="currentColor" fill-opacity="0.4"/>
          <line x1="8" y1="18" x2="132" y2="18" stroke-dasharray="2 2" stroke-opacity="0.5"/>
          <line x1="8" y1="30" x2="132" y2="30" stroke-dasharray="2 2" stroke-opacity="0.5"/>
        </svg>
      `;

    case 'window':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 40" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="12" width="124" height="16" rx="2" fill="currentColor" fill-opacity="0.12"/>
          <line x1="8" y1="20" x2="132" y2="20" stroke-width="2.5" stroke="var(--accent-primary)"/>
          <rect x="6" y="8" width="8" height="24" fill="currentColor"/>
          <rect x="126" y="8" width="8" height="24" fill="currentColor"/>
        </svg>
      `;

    case 'stair':
    case 'stairs':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="8" width="104" height="64" fill="currentColor" fill-opacity="0.08"/>
          ${[20, 34, 48, 62, 76, 90].map(x => `<line x1="${x}" y1="8" x2="${x}" y2="72" stroke-width="1.5"/>`).join('')}
          <line x1="15" y1="40" x2="95" y2="40" stroke-width="2"/>
          <circle cx="15" cy="40" r="3" fill="currentColor"/>
          <polyline points="88 34 95 40 88 46" stroke-width="2"/>
          <text x="76" y="32" font-size="9" font-family="sans-serif" font-weight="700" fill="currentColor">UP</text>
        </svg>
      `;

    case 'clearance':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="80" height="80" stroke-dasharray="4 4" fill="currentColor" fill-opacity="0.08"/>
          <line x1="10" y1="50" x2="90" y2="50" stroke-width="2"/>
          <polyline points="20 44 10 50 20 56" stroke-width="2"/>
          <polyline points="80 44 90 50 80 56" stroke-width="2"/>
        </svg>
      `;

    case 'vehicle':
    case 'parking':
      return `
        <svg class="furn-plan-svg" viewBox="0 0 140 80" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="10" y1="8" x2="130" y2="8" stroke-dasharray="4 4" stroke-opacity="0.5"/>
          <line x1="10" y1="72" x2="130" y2="72" stroke-dasharray="4 4" stroke-opacity="0.5"/>
          <path d="M22,58 C16,55 16,25 22,22 L40,18 L100,18 L122,24 C128,26 128,54 122,56 L100,62 L40,62 Z" fill="currentColor" fill-opacity="0.18"/>
          <path d="M48,22 L56,26 L56,54 L48,58 Z" fill="currentColor" fill-opacity="0.3"/>
          <path d="M96,24 L90,26 L90,54 L96,56 Z" fill="currentColor" fill-opacity="0.3"/>
          <rect x="54" y="14" width="6" height="4" rx="1" fill="currentColor"/>
          <rect x="54" y="62" width="6" height="4" rx="1" fill="currentColor"/>
        </svg>
      `;

    default:
      return `
        <svg class="furn-plan-svg" viewBox="0 0 120 70" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="10" y="10" width="100" height="50" rx="4" fill="currentColor" fill-opacity="0.15"/>
          <line x1="10" y1="10" x2="110" y2="60" stroke-dasharray="3 3" stroke-opacity="0.3"/>
        </svg>
      `;
  }
}


  // =========================================================================
  // MODULE: App
  // =========================================================================

/**
 * Architecture Helping Hand - Main Application UI Controller
 * High-precision, zero-dependency, tactile architectural scaling studio.
 */




















function initializeApp() {
  const state = {
    currentMode: 'converter',
    activeTheme: StorageService.getItem('archi_theme') || 'dark',
    precision: 3,

    // Mode 1: Converter
    direction: 'drawing_to_real',
    scaleRatio: 50,
    selectedPresetId: '1:50',
    selectedCategory: 'all',
    converterInputVal: '10',
    converterInputUnit: 'cm',
    converterOutputUnit: 'm',

    // Mode 2: Rescale
    rescaleOrigRatio: 50,
    rescaleOrigVal: '12',
    rescaleOrigUnit: 'cm',
    rescaleTargetRatio: 200,
    rescaleTargetUnit: 'cm',

    // Mode 3: Detector
    detectPaperVal: '4.5',
    detectPaperUnit: 'cm',
    detectRealVal: '9',
    detectRealUnit: 'm',
    lastDetectedRatio: null,

    // Mode 4: Area & Volume
    calcType: 'area', // 'area' | 'volume'
    calcDirection: 'drawing_to_real', // 'drawing_to_real' | 'real_to_drawing'
    areaOrigVal: '25',
    areaOrigUnit: 'sq_m',
    areaRatio: 50,
    areaTargetUnit: 'sq_cm',
    volOrigVal: '100',
    volOrigUnit: 'cu_m',
    volRatio: 50,
    volTargetUnit: 'cu_cm',

    // Mode 5: Furniture
    furnitureSearchQuery: '',
    furnitureActiveCategory: 'all',
    selectedCategory: 'all',
    furnitureScaleRatio: 50,
    furnitureDisplayUnit: 'cm',
    furnitureCustomWidth: '',
    furnitureCustomDepth: '',
    furnitureCustomHeight: '',
    furniturePaperUnit: 'cm',
    furnitureSortKey: 'default',
    furnitureDensity: 'comfortable',
    customFurnName: 'Custom Piece',
    customFurnW: 240,
    customFurnD: 100,
    customFurnUnit: 'cm',

    // Mode 6: Reference
    refScaleRatio: 50,
    refSheetDensity: 'standard', // 'standard' | 'compact'

    // Mode 7: Dimension Workspace
    workspace: deserializeWorkspace(StorageService.getItem(WORKSPACE_STORAGE_KEY)),
    workspaceSelectedIds: new Set(),
    workspaceEditingCell: null, // { id: string, field: string }

    // Mode 8: Dimension Expression
    lastValidExpression: null,
    recentExpressions: [],

    // Mode 9: Multi-Scale Comparison
    multiscaleInput: '2400',
    multiscaleDefaultUnit: 'mm',
    multiscaleDisplayUnit: 'mm',
    multiscaleGroup: 'all',
    multiscaleCustomScales: [],
    multiscaleSortOrder: 'ratio_asc',
    multiscalePaperSize: 'none',
    multiscaleFitMin: null,
    multiscaleFitMax: null,
    multiscaleFavorites: (() => {
      try {
        const stored = StorageService.getItem('archiscale_multiscale_favs');
        return stored ? JSON.parse(stored) : [20, 50, 100];
      } catch (e) {
        return [20, 50, 100];
      }
    })(),
    lastValidMultiScale: null,

    // Mode 10: Dimension Chains
    activeChain: (() => {
      try {
        const stored = StorageService.getItem(CHAIN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.segments)) return parsed;
        }
      } catch (e) {}
      return createDimensionChain({
        name: 'North Wall Sequence',
        defaultUnit: 'mm',
        scaleRatio: 50,
        segments: [ ...CHAIN_TEMPLATES.wall_opening.segments ]
      });
    })(),
    chainSelectedSegmentId: null,
    lastValidChain: null,

    // Mode 11: CAD Clipboard
    cadClipboard: (() => {
      try {
        const stored = StorageService.getItem(CAD_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
      return {
        source: 'workspace',
        preset: 'generic',
        targetValue: 'real',
        unit: 'mm',
        precision: 2,
        suffix: 'none',
        delimiter: 'space',
        filterScope: 'all',
        manualInput: '',
        lastFormattedText: ''
      };
    })(),

    // Mode 12: Batch CAD Conversion
    batchCad: (() => {
      try {
        const stored = StorageService.getItem(BATCH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.selectedIds)) {
              parsed.selectedIds = new Set(parsed.selectedIds);
            } else {
              parsed.selectedIds = new Set();
            }
            return parsed;
          }
        }
      } catch (e) {}
      return {
        rawInput: 'Wall North = 4800mm\nSEG Wall South = 3200mm\nWindow 1 = 1800 + 300\nALW Tolerance = 20mm\nDoor Entrance = 900\n2.4m\n7\' 6"',
        mode: 'real_to_drawing',
        sourceUnit: 'mm',
        sourceScale: 1,
        targetUnit: 'mm',
        targetScale: 50,
        precision: 2,
        delimiter: 'auto',
        activeFilter: 'all',
        selectedIds: new Set(),
        lastResult: null
      };
    })(),

    // Quick Dimension Strip (Micro-Tool & Glance Strip)
    quickDimension: (() => {
      try {
        const stored = StorageService.getItem(QUICK_DIM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
      return {
        isOpen: false,
        pinned: false,
        rawInput: '2400mm',
        selectedScale: 50,
        scales: [...DEFAULT_QUICK_SCALES],
        displayUnit: 'mm',
        drawingUnit: 'mm',
        precision: 2,
        mode: 'real_to_drawing',
        showContext: true,
        lastResult: null
      };
    })(),

    // Cached Previous Valid Calculations (Never wipe to empty on invalid keystroke)
    lastValidConverter: null,
    lastValidRescale: null,
    lastValidDetector: null,
    lastValidAreavol: null
  };

  // DOM Elements Cache (Strictly normalized with index.html)
  const dom = {
    // Header & Global Modals
    themeSelect: document.getElementById('theme-select'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    soundToggleLabel: document.getElementById('sound-toggle-label'),
    commandPaletteBtn: document.getElementById('command-palette-btn'),
    commandPaletteModal: document.getElementById('command-palette-modal'),
    commandPaletteOverlay: document.getElementById('command-palette-overlay'),
    commandPaletteInput: document.getElementById('command-palette-input'),
    commandPaletteList: document.getElementById('command-palette-list'),
    closeCommandPaletteBtn: document.getElementById('close-command-palette-btn'),
    historyToggleBtn: document.getElementById('history-toggle-btn'),
    shortcutsHelpBtn: document.getElementById('shortcuts-help-btn'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    closeShortcutsBtn: document.getElementById('close-shortcuts-btn'),
    historyDrawer: document.getElementById('history-drawer'),
    historyOverlay: document.getElementById('history-overlay'),
    closeHistoryBtn: document.getElementById('close-history-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    exportMdBtn: document.getElementById('export-md-btn'),
    historyCountBadge: document.getElementById('history-count-badge'),
    historyList: document.getElementById('history-list'),
    toastContainer: document.getElementById('toast-container'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    modeViews: document.querySelectorAll('.tool-mode-view'),

    // Mode 1: Converter Elements
    activeScaleBadge: document.getElementById('active-scale-badge'),
    presetCategoryPills: document.getElementById('preset-category-pills'),
    presetPillBtns: document.querySelectorAll('.preset-pill-btn'),
    presetsGrid: document.getElementById('presets-grid'),
    scaleRatioInput: document.getElementById('scale-ratio-input'),
    converterInputVal: document.getElementById('converter-input-val'),
    converterInputUnit: document.getElementById('converter-input-unit'),
    converterInputBadge: document.getElementById('converter-input-badge'),
    swapDirectionBtn: document.getElementById('swap-direction-btn'),
    converterOutputUnit: document.getElementById('converter-output-unit'),
    converterOutputBadge: document.getElementById('converter-output-badge'),
    btnRunConverter: document.getElementById('btn-run-converter'),
    converterErrorMsg: document.getElementById('converter-error-msg'),
    converterResultVal: document.getElementById('converter-result-val'),
    converterResultUnit: document.getElementById('converter-result-unit'),
    btnCopyResult: document.getElementById('btn-copy-result'),
    btnSaveHistory: document.getElementById('btn-save-history'),
    visualizerContainer: document.getElementById('visualizer-container'),
    metricBreakdownList: document.getElementById('metric-breakdown-list'),
    imperialBreakdownList: document.getElementById('imperial-breakdown-list'),
    converterMathFormula: document.getElementById('converter-math-formula'),
    converterFlowFrom: document.getElementById('converter-flow-from'),
    converterFlowTo: document.getElementById('converter-flow-to'),
    converterSecondaryReadout: document.getElementById('converter-secondary-readout'),
    converterResultStaleTag: document.getElementById('converter-result-stale-tag'),

    // Mode 2: Rescaler Elements
    rescaleOrigRatio: document.getElementById('rescale-orig-ratio'),
    rescaleOrigVal: document.getElementById('rescale-orig-val'),
    rescaleOrigUnit: document.getElementById('rescale-orig-unit'),
    rescaleTargetRatio: document.getElementById('rescale-target-ratio'),
    rescaleTargetUnit: document.getElementById('rescale-target-unit'),
    btnRunRescale: document.getElementById('btn-run-rescale'),
    rescaleErrorMsg: document.getElementById('rescale-error-msg'),
    rescaleResultVal: document.getElementById('rescale-result-val'),
    rescaleResultUnit: document.getElementById('rescale-result-unit'),
    rescaleFactorBadge: document.getElementById('rescale-factor-badge'),
    rescaleRealSpan: document.getElementById('rescale-real-span'),
    btnCopyRescale: document.getElementById('btn-copy-rescale'),
    rescaleMathFormula: document.getElementById('rescale-math-formula'),
    rescaleResultStaleTag: document.getElementById('rescale-result-stale-tag'),

    // Mode 3: Detector Elements
    detectorPaperVal: document.getElementById('detector-paper-val'),
    detectorPaperUnit: document.getElementById('detector-paper-unit'),
    detectorRealVal: document.getElementById('detector-real-val'),
    detectorRealUnit: document.getElementById('detector-real-unit'),
    btnRunDetector: document.getElementById('btn-run-detector'),
    detectorErrorMsg: document.getElementById('detector-error-msg'),
    detectorRatioVal: document.getElementById('detector-ratio-val'),
    detectorPresetBadge: document.getElementById('detector-preset-badge'),
    btnApplyDetected: document.getElementById('btn-apply-detected'),
    detectorMathFormula: document.getElementById('detector-math-formula'),
    detectorResultStaleTag: document.getElementById('detector-result-stale-tag'),

    // Mode 4: Area & Volume Elements
    areavolTypeBtns: document.querySelectorAll('.areavol-type-btn'),
    areavolDirBtns: document.querySelectorAll('.areavol-dir-btn'),
    areavolRatioInput: document.getElementById('areavol-ratio-input'),
    areavolInputVal: document.getElementById('areavol-input-val'),
    areavolInputUnit: document.getElementById('areavol-input-unit'),
    areavolOutputUnit: document.getElementById('areavol-output-unit'),
    areavolInputBadge: document.getElementById('areavol-input-badge'),
    areavolOutputBadge: document.getElementById('areavol-output-badge'),
    btnRunAreavol: document.getElementById('btn-run-areavol'),
    areavolErrorMsg: document.getElementById('areavol-error-msg'),
    areavolResultVal: document.getElementById('areavol-result-val'),
    areavolResultUnit: document.getElementById('areavol-result-unit'),
    areavolFactorBadge: document.getElementById('areavol-factor-badge'),
    btnCopyAreavol: document.getElementById('btn-copy-areavol'),
    areavolMathFormula: document.getElementById('areavol-math-formula'),
    areavolResultStaleTag: document.getElementById('areavol-result-stale-tag'),

    // Mode 5: Furniture Elements
    furnitureSearchInput: document.getElementById('furniture-search-input'),
    clearFurnitureSearchBtn: document.getElementById('clear-furniture-search-btn'),
    furnitureResultsCount: document.getElementById('furniture-results-count'),
    furnScalePresets: document.getElementById('furn-scale-presets'),
    furnScaleRatioInput: document.getElementById('furn-scale-ratio-input'),
    furnPaperUnitSelect: document.getElementById('furn-paper-unit-select'),
    furnSortSelect: document.getElementById('furn-sort-select'),
    furnDensityBtns: document.querySelectorAll('.furn-density-btn'),
    furnCategoryNav: document.getElementById('furn-category-nav'),
    furnitureCardsGrid: document.getElementById('furniture-cards-grid'),
    customFurnName: document.getElementById('custom-furn-name'),
    customFurnW: document.getElementById('custom-furn-w'),
    customFurnD: document.getElementById('custom-furn-d'),
    customFurnUnit: document.getElementById('custom-furn-unit'),
    btnRunCustomFurn: document.getElementById('btn-run-custom-furn'),
    customFurnResult: document.getElementById('custom-furn-result'),
    btnPlannerCustomFurn: document.getElementById('btn-planner-custom-furn'),
    btnCopyCustomFurn: document.getElementById('btn-copy-custom-furn'),
    btnSendCustomFurn: document.getElementById('btn-send-custom-furn'),

    // Mode 6: Reference Elements
    refScaleSelect: document.getElementById('ref-scale-select'),
    btnPrintRef: document.getElementById('btn-print-ref'),
    refTableBody: document.getElementById('ref-table-body'),
    refActiveScaleBadge: document.getElementById('ref-active-scale-badge'),
    refQuickChips: document.getElementById('ref-quick-chips'),
    refDensityBtnStandard: document.getElementById('ref-density-btn-standard'),
    refDensityBtnCompact: document.getElementById('ref-density-btn-compact'),
    refRulerContainer: document.getElementById('ref-ruler-container'),
    refRulerScaleLabel: document.getElementById('ref-ruler-scale-label'),
    refBenchmarksGrid: document.getElementById('ref-benchmarks-grid'),
    refBenchmarksScaleLabel: document.getElementById('ref-benchmarks-scale-label'),
    refDataTable: document.getElementById('ref-data-table'),
    refTbScale: document.getElementById('ref-tb-scale'),
    refTbDate: document.getElementById('ref-tb-date'),

    // Unified Result State Elements
    converterStateBadge: document.getElementById('converter-state-badge'),
    converterContextStrip: document.getElementById('converter-context-strip'),
    rescaleStateBadge: document.getElementById('rescale-state-badge'),
    rescaleContextStrip: document.getElementById('rescale-context-strip'),
    detectorStateBadge: document.getElementById('detector-state-badge'),
    detectorContextStrip: document.getElementById('detector-context-strip'),
    areavolStateBadge: document.getElementById('areavol-state-badge'),
    areavolContextStrip: document.getElementById('areavol-context-strip'),
    customFurnStateBadge: document.getElementById('custom-furn-state-badge'),

    // Mode 7: Dimension Workspace Elements
    workspaceDensityStandard: document.getElementById('workspace-density-standard'),
    workspaceDensityCompact: document.getElementById('workspace-density-compact'),
    workspaceStateBadge: document.getElementById('workspace-state-badge'),
    workspaceScaleSelect: document.getElementById('workspace-scale-select'),
    workspaceCustomScaleGroup: document.getElementById('workspace-custom-scale-group'),
    workspaceCustomScaleInput: document.getElementById('workspace-custom-scale-input'),
    workspaceUnitSelect: document.getElementById('workspace-unit-select'),
    workspaceQuickChips: document.getElementById('workspace-quick-chips'),
    workspaceAddForm: document.getElementById('workspace-add-form'),
    workspaceAddType: document.getElementById('workspace-add-type'),
    workspaceAddName: document.getElementById('workspace-add-name'),
    workspaceAddInput: document.getElementById('workspace-add-input'),
    workspaceAddUnit: document.getElementById('workspace-add-unit'),
    workspaceAddNotes: document.getElementById('workspace-add-notes'),
    workspaceAddBtn: document.getElementById('workspace-add-btn'),
    workspaceAddError: document.getElementById('workspace-add-error'),
    workspaceBreakdownBadge: document.getElementById('workspace-breakdown-badge'),
    workspaceSelectionStatus: document.getElementById('workspace-selection-status'),
    workspaceSelectionCount: document.getElementById('workspace-selection-count'),
    workspaceSelectAll: document.getElementById('workspace-select-all'),
    workspaceTable: document.getElementById('workspace-table'),
    workspaceTableBody: document.getElementById('workspace-table-body'),
    workspaceThDrawing: document.getElementById('workspace-th-drawing'),
    workspaceCardsList: document.getElementById('workspace-cards-list'),
    workspaceEmptyState: document.getElementById('workspace-empty-state'),
    workspaceLoadSamplesBtn: document.getElementById('workspace-load-samples-btn'),
    workspaceTotalsCard: document.getElementById('workspace-totals-card'),
    workspaceActiveCount: document.getElementById('workspace-active-count'),
    workspaceTotalSegmentsReal: document.getElementById('workspace-total-segments-real'),
    workspaceTotalSegmentsDrawing: document.getElementById('workspace-total-segments-drawing'),
    workspaceTotalAllowancesReal: document.getElementById('workspace-total-allowances-real'),
    workspaceTotalAllowancesDrawing: document.getElementById('workspace-total-allowances-drawing'),
    workspaceTotalCombinedReal: document.getElementById('workspace-total-combined-real'),
    workspaceTotalCombinedDrawing: document.getElementById('workspace-total-combined-drawing'),
    workspaceTotalReferencesReal: document.getElementById('workspace-total-references-real'),
    workspaceReferencesCountLabel: document.getElementById('workspace-references-count-label'),
    workspaceTotalRealVal: document.getElementById('workspace-total-real-val'),
    workspaceTotalDrawingVal: document.getElementById('workspace-total-drawing-val'),
    workspaceTotalDrawingLabel: document.getElementById('workspace-total-drawing-label'),
    workspaceActionsToolbar: document.getElementById('workspace-actions-toolbar'),
    workspaceCopySelectedBtn: document.getElementById('workspace-copy-selected-btn'),
    workspaceCopySegmentsBtn: document.getElementById('workspace-copy-segments-btn'),
    workspaceCopyReferencesBtn: document.getElementById('workspace-copy-references-btn'),
    workspaceCopyAllBtn: document.getElementById('workspace-copy-all-btn'),
    workspaceCopyRawBtn: document.getElementById('workspace-copy-raw-btn'),
    workspaceCopyDrawingBtn: document.getElementById('workspace-copy-drawing-btn'),
    workspaceExportTsvBtn: document.getElementById('workspace-export-tsv-btn'),
    workspaceAddGroupBtn: document.getElementById('workspace-add-group-btn'),
    workspaceSaveJournalBtn: document.getElementById('workspace-save-journal-btn'),
    workspaceClearBtn: document.getElementById('workspace-clear-btn'),

    // Mode 8: Dimension Expression
    expressionStateBadge: document.getElementById('expression-state-badge'),
    expressionInput: document.getElementById('expression-input'),
    expressionLivePreview: document.getElementById('expression-live-preview'),
    expressionClearInputBtn: document.getElementById('expression-clear-input-btn'),
    expressionErrorMsg: document.getElementById('expression-error-msg'),
    expressionDefaultUnit: document.getElementById('expression-default-unit'),
    expressionScaleSelect: document.getElementById('expression-scale-select'),
    expressionCustomScaleGroup: document.getElementById('expression-custom-scale-group'),
    expressionCustomScaleInput: document.getElementById('expression-custom-scale-input'),
    btnRunExpression: document.getElementById('btn-run-expression'),
    expressionDimBadge: document.getElementById('expression-dim-badge'),
    expressionResultVal: document.getElementById('expression-result-val'),
    expressionResultUnit: document.getElementById('expression-result-unit'),
    expressionDrawingLabel: document.getElementById('expression-drawing-label'),
    expressionDrawingVal: document.getElementById('expression-drawing-val'),
    expressionSecondaryReadout: document.getElementById('expression-secondary-readout'),
    expressionCopyBtn: document.getElementById('expression-copy-btn'),
    expressionCopyRawBtn: document.getElementById('expression-copy-raw-btn'),
    expressionCopyDrawingBtn: document.getElementById('expression-copy-drawing-btn'),
    expressionAddName: document.getElementById('expression-add-name'),
    expressionAddRoleSelect: document.getElementById('expression-add-role-select'),
    expressionAddWorkspaceBtn: document.getElementById('expression-add-workspace-btn'),
    expressionSaveJournalBtn: document.getElementById('expression-save-journal-btn'),
    expressionRecentList: document.getElementById('expression-recent-list'),
    expressionClearRecentBtn: document.getElementById('expression-clear-recent-btn'),
    expressionCompareBtn: document.getElementById('expression-compare-btn'),

    // Mode 9: Multi-Scale Comparison
    multiscaleStateBadge: document.getElementById('multiscale-state-badge'),
    multiscaleInput: document.getElementById('multiscale-input'),
    multiscaleLivePreview: document.getElementById('multiscale-live-preview'),
    multiscaleClearInputBtn: document.getElementById('multiscale-clear-input-btn'),
    multiscaleErrorMsg: document.getElementById('multiscale-error-msg'),
    multiscaleDefaultUnit: document.getElementById('multiscale-default-unit'),
    multiscaleDisplayUnit: document.getElementById('multiscale-display-unit'),
    multiscaleCustomScaleInput: document.getElementById('multiscale-custom-scale-input'),
    multiscaleAddScaleBtn: document.getElementById('multiscale-add-scale-btn'),
    multiscaleSortSelect: document.getElementById('multiscale-sort-select'),
    multiscalePaperSelect: document.getElementById('multiscale-paper-select'),
    multiscaleFitMin: document.getElementById('multiscale-fit-min'),
    multiscaleFitMax: document.getElementById('multiscale-fit-max'),
    btnRunMultiscale: document.getElementById('btn-run-multiscale'),
    multiscaleCountBadge: document.getElementById('multiscale-count-badge'),
    multiscaleRealLabel: document.getElementById('multiscale-real-label'),
    multiscaleRealVal: document.getElementById('multiscale-real-val'),
    multiscaleTableContainer: document.getElementById('multiscale-table-container'),
    multiscaleTable: document.getElementById('multiscale-table'),
    multiscaleTableBody: document.getElementById('multiscale-table-body'),
    multiscaleEmptyState: document.getElementById('multiscale-empty-state'),
    multiscaleLoadSampleBtn: document.getElementById('multiscale-load-sample-btn'),
    multiscaleCopyTableBtn: document.getElementById('multiscale-copy-table-btn'),
    multiscaleCopyAllBtn: document.getElementById('multiscale-copy-all-btn'),
    multiscaleCopyCurrentBtn: document.getElementById('multiscale-copy-current-btn'),
    multiscaleCopyRawBtn: document.getElementById('multiscale-copy-raw-btn'),

    // Mode 10: Dimension Chains
    chainsStateBadge: document.getElementById('chains-state-badge'),
    chainsNameInput: document.getElementById('chains-name-input'),
    chainsScaleSelect: document.getElementById('chains-scale-select'),
    chainsUnitSelect: document.getElementById('chains-unit-select'),
    chainsStartOffsetInput: document.getElementById('chains-start-offset-input'),
    chainsEndOffsetInput: document.getElementById('chains-end-offset-input'),
    chainsQuickInput: document.getElementById('chains-quick-input'),
    chainsLivePreview: document.getElementById('chains-live-preview'),
    chainsAddBtn: document.getElementById('chains-add-btn'),
    chainsClearInputBtn: document.getElementById('chains-clear-input-btn'),
    chainsErrorMsg: document.getElementById('chains-error-msg'),
    chainsClearAllBtn: document.getElementById('chains-clear-all-btn'),
    chainsZoomFitBtn: document.getElementById('chains-zoom-fit-btn'),
    chainsSvgViewportWrapper: document.getElementById('chains-svg-viewport-wrapper'),
    chainsSelectedInspector: document.getElementById('chains-selected-inspector'),
    chainsInspectorName: document.getElementById('chains-inspector-name'),
    chainsInspectorLen: document.getElementById('chains-inspector-len'),
    chainsInspectorStart: document.getElementById('chains-inspector-start'),
    chainsInspectorEnd: document.getElementById('chains-inspector-end'),
    chainsInspectorDraw: document.getElementById('chains-inspector-draw'),
    chainsTable: document.getElementById('chains-table'),
    chainsTableBody: document.getElementById('chains-table-body'),
    btnRunChains: document.getElementById('btn-run-chains'),
    chainsCountBadge: document.getElementById('chains-count-badge'),
    chainsOverallVal: document.getElementById('chains-overall-val'),
    chainsDrawingOverall: document.getElementById('chains-drawing-overall'),
    chainsSegTotalVal: document.getElementById('chains-seg-total-val'),
    chainsAlwTotalVal: document.getElementById('chains-alw-total-val'),
    chainsStartOffsetVal: document.getElementById('chains-start-offset-val'),
    chainsEndOffsetVal: document.getElementById('chains-end-offset-val'),
    chainsCompareMultiscaleBtn: document.getElementById('chains-compare-multiscale-btn'),
    chainsSendWorkspaceBtn: document.getElementById('chains-send-workspace-btn'),
    chainsSaveJournalBtn: document.getElementById('chains-save-journal-btn'),
    chainsCopyTableBtn: document.getElementById('chains-copy-table-btn'),
    chainsCopyCumBtn: document.getElementById('chains-copy-cum-btn'),
    chainsCopySegsBtn: document.getElementById('chains-copy-segs-btn'),
    chainsCopyDrawBtn: document.getElementById('chains-copy-draw-btn'),
    chainsExportTsvBtn: document.getElementById('chains-export-tsv-btn'),

    // Mode 11: CAD Clipboard
    cadStateBadge: document.getElementById('cad-state-badge'),
    cadQuickChips: document.getElementById('cad-quick-chips'),
    cadSourcePills: document.getElementById('cad-source-pills'),
    cadSourceCountBadge: document.getElementById('cad-source-count-badge'),
    cadManualGroup: document.getElementById('cad-manual-group'),
    cadManualInput: document.getElementById('cad-manual-input'),
    cadTargetSelect: document.getElementById('cad-target-select'),
    cadUnitSelect: document.getElementById('cad-unit-select'),
    cadPrecisionSelect: document.getElementById('cad-precision-select'),
    cadSuffixSelect: document.getElementById('cad-suffix-select'),
    cadDelimiterSelect: document.getElementById('cad-delimiter-select'),
    cadScopeSelect: document.getElementById('cad-scope-select'),
    btnRunCadClipboard: document.getElementById('btn-run-cad-clipboard'),
    cadResultPanel: document.getElementById('cad-result-panel'),
    cadSummaryBadge: document.getElementById('cad-summary-badge'),
    cadPreviewBox: document.getElementById('cad-preview-box'),
    btnCadCopyMain: document.getElementById('btn-cad-copy-main'),
    btnCadCopyRaw: document.getElementById('btn-cad-copy-raw'),
    btnCadCopyUnits: document.getElementById('btn-cad-copy-units'),
    btnCadCopyTsv: document.getElementById('btn-cad-copy-tsv'),
    btnCadExportTxt: document.getElementById('btn-cad-export-txt'),

    // Cross-Mode CAD Handoff Buttons
    wsOpenCadBtn: document.getElementById('workspace-open-cad-btn'),
    exprCadHandoffBtn: document.getElementById('expression-cad-handoff-btn'),
    msCadHandoffBtn: document.getElementById('multiscale-cad-handoff-btn'),
    chainsCadHandoffBtn: document.getElementById('chains-cad-handoff-btn'),

    // Mode 12: Batch CAD Conversion
    batchStateBadge: document.getElementById('batch-state-badge'),
    batchQuickChips: document.getElementById('batch-quick-chips'),
    batchDelimiterBadge: document.getElementById('batch-delimiter-badge'),
    batchPasteInput: document.getElementById('batch-paste-input'),
    batchModeSelect: document.getElementById('batch-mode-select'),
    batchSourceScaleGroup: document.getElementById('batch-source-scale-group'),
    batchSourceScaleSelect: document.getElementById('batch-source-scale-select'),
    batchTargetScaleGroup: document.getElementById('batch-target-scale-group'),
    batchTargetScaleSelect: document.getElementById('batch-target-scale-select'),
    batchSourceUnitSelect: document.getElementById('batch-source-unit-select'),
    batchTargetUnitSelect: document.getElementById('batch-target-unit-select'),
    batchPrecisionSelect: document.getElementById('batch-precision-select'),
    batchDelimiterSelect: document.getElementById('batch-delimiter-select'),
    btnRunBatchCad: document.getElementById('btn-run-batch-cad'),
    batchResultPanel: document.getElementById('batch-result-panel'),
    batchMetricTotal: document.getElementById('batch-metric-total'),
    batchMetricValid: document.getElementById('batch-metric-valid'),
    batchMetricInvalid: document.getElementById('batch-metric-invalid'),
    batchFilterPills: document.getElementById('batch-filter-pills'),
    filterCountAll: document.getElementById('filter-count-all'),
    filterCountValid: document.getElementById('filter-count-valid'),
    filterCountInvalid: document.getElementById('filter-count-invalid'),
    filterCountSelected: document.getElementById('filter-count-selected'),
    batchSelectAllBtn: document.getElementById('batch-select-all-btn'),
    batchClearSelectionBtn: document.getElementById('batch-clear-selection-btn'),
    batchTable: document.getElementById('batch-table'),
    batchTableBody: document.getElementById('batch-table-body'),
    batchMasterCheckbox: document.getElementById('batch-master-checkbox'),
    batchEmptyState: document.getElementById('batch-empty-state'),
    batchLoadSampleBtn: document.getElementById('batch-load-sample-btn'),
    batchCopyResultsBtn: document.getElementById('batch-copy-results-btn'),
    batchCopyRawBtn: document.getElementById('batch-copy-raw-btn'),
    batchCopyTsvBtn: document.getElementById('batch-copy-tsv-btn'),
    batchOpenCadBtn: document.getElementById('batch-open-cad-btn'),
    batchSendWorkspaceBtn: document.getElementById('batch-send-workspace-btn'),
    batchCompareMultiscaleBtn: document.getElementById('batch-compare-multiscale-btn'),
    batchCreateChainBtn: document.getElementById('batch-create-chain-btn'),
    batchSaveJournalBtn: document.getElementById('batch-save-journal-btn'),

    // Quick Dimension Strip (Micro-Tool & Glance Strip)
    quickDimToggleBtn: document.getElementById('quick-dim-toggle-btn'),
    quickDimStrip: document.getElementById('quick-dimension-strip'),
    quickDimStatusBadge: document.getElementById('quick-dim-status-badge'),
    quickDimModePills: document.getElementById('quick-dim-mode-pills'),
    quickDimPinBtn: document.getElementById('quick-dim-pin-btn'),
    quickDimCloseBtn: document.getElementById('quick-dim-close-btn'),
    quickDimInput: document.getElementById('quick-dim-input'),
    btnRunQuickDim: document.getElementById('btn-run-quick-dim'),
    quickDimErrorMsg: document.getElementById('quick-dim-error-msg'),
    quickDimRealVal: document.getElementById('quick-dim-real-val'),
    quickDimSelectedScaleLabel: document.getElementById('quick-dim-selected-scale-label'),
    quickDimDrawingVal: document.getElementById('quick-dim-drawing-val'),
    quickEquivMm: document.getElementById('quick-equiv-mm'),
    quickEquivCm: document.getElementById('quick-equiv-cm'),
    quickEquivM: document.getElementById('quick-equiv-m'),
    quickEquivIn: document.getElementById('quick-equiv-in'),
    quickEquivFtin: document.getElementById('quick-equiv-ftin'),
    quickDimScaleChips: document.getElementById('quick-dim-scale-chips'),
    quickDimCustomScaleInput: document.getElementById('quick-dim-custom-scale-input'),
    quickDimMatrixGrid: document.getElementById('quick-dim-matrix-grid'),
    quickDimContextCard: document.getElementById('quick-dim-context-card'),
    quickDimContextTitle: document.getElementById('quick-dim-context-title'),
    quickDimContextBody: document.getElementById('quick-dim-context-body'),
    quickDimCopyRealBtn: document.getElementById('quick-dim-copy-real-btn'),
    quickDimCopyDrawBtn: document.getElementById('quick-dim-copy-draw-btn'),
    quickDimCopyCadBtn: document.getElementById('quick-dim-copy-cad-btn'),
    quickDimCopyMatrixBtn: document.getElementById('quick-dim-copy-matrix-btn'),
    quickDimSendWorkspaceBtn: document.getElementById('quick-dim-send-workspace-btn'),
    quickDimSendMultiscaleBtn: document.getElementById('quick-dim-send-multiscale-btn'),
    quickDimSendChainBtn: document.getElementById('quick-dim-send-chain-btn'),
    quickDimSendCadBtn: document.getElementById('quick-dim-send-cad-btn'),
    quickDimSaveJournalBtn: document.getElementById('quick-dim-save-journal-btn')
  };

  // ---------------------------------------------------------------------------
  // Unified Result Pattern & Lifecycle Manager (READY -> RUNNING -> SUCCESS / ERROR)
  // ---------------------------------------------------------------------------
  function setUnifiedResultState({
    toolPrefix,
    status, // 'ready' | 'running' | 'success' | 'error'
    errorText = '',
    context = null,
    btn = null
  }) {
    const panel = document.getElementById(`${toolPrefix}-result-panel`) || document.querySelector(`.${toolPrefix}-result-box`) || document.querySelector(`.${toolPrefix}-result-row`);
    const badge = document.getElementById(`${toolPrefix}-state-badge`);
    const errorBanner = document.getElementById(`${toolPrefix}-error-msg`);
    const staleTag = document.getElementById(`${toolPrefix}-result-stale-tag`);
    const contextStrip = document.getElementById(`${toolPrefix}-context-strip`);

    if (panel) panel.dataset.state = status;

    if (badge) {
      badge.className = `result-state-pill state-${status}`;
      switch (status) {
        case 'ready': badge.textContent = 'READY'; break;
        case 'running': badge.textContent = 'CALCULATING...'; break;
        case 'success': badge.textContent = 'SUCCESS'; break;
        case 'error': badge.textContent = 'CORRECTION REQUIRED'; break;
      }
    }

    if (status === 'error') {
      if (errorBanner) {
        errorBanner.textContent = errorText;
        errorBanner.style.display = 'flex';
      }
      if (staleTag) staleTag.style.display = 'inline-block';
      if (btn) setRunButtonState(btn, 'error');
    } else if (status === 'success') {
      if (errorBanner) errorBanner.style.display = 'none';
      if (staleTag) staleTag.style.display = 'none';
      if (panel) {
        panel.classList.remove('result-pulse');
        void panel.offsetWidth;
        panel.classList.add('result-pulse');
        setTimeout(() => panel.classList.remove('result-pulse'), 200);
      }
      if (btn) setRunButtonState(btn, 'success');
    } else if (status === 'running') {
      if (btn) setRunButtonState(btn, 'running');
    }

    if (contextStrip && context) {
      contextStrip.innerHTML = Object.entries(context)
        .map(([k, v]) => `<span class="context-pill"><strong>${k}:</strong> ${v}</span>`)
        .join('');
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Toast Notification System
  // ---------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  function copyToClipboard(text, label = 'Copied to clipboard') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          AudioService.playCopySuccess();
          showToast(`📋 ${label}: ${text}`);
        })
        .catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      AudioService.playCopySuccess();
      showToast(`📋 ${label}: ${text}`);
    } catch (err) {
      showToast('Could not copy to clipboard', 'error');
    }
    document.body.removeChild(el);
  }

  // ---------------------------------------------------------------------------
  // 2. Theme & Sound Management
  // ---------------------------------------------------------------------------
  function applyTheme(themeName) {
    state.activeTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    StorageService.setItem('archi_theme', themeName);
    if (dom.themeSelect) dom.themeSelect.value = themeName;
  }

  function updateSoundUI() {
    const isEnabled = AudioService.isEnabled();
    if (dom.soundToggleBtn) {
      dom.soundToggleBtn.classList.toggle('active', isEnabled);
      if (dom.soundToggleLabel) {
        dom.soundToggleLabel.textContent = isEnabled ? 'Sound: On' : 'Sound: Muted';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Mode Navigation Switching
  // ---------------------------------------------------------------------------
  function switchMode(targetMode) {
    state.currentMode = targetMode;

    // Update Mode Tabs
    dom.modeTabs.forEach(tab => {
      const mode = tab.dataset.mode;
      const isActive = mode === targetMode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update Tool Views
    dom.modeViews.forEach(view => {
      const expectedId = `mode-view-${targetMode}`;
      const isTarget = view.id === expectedId;
      view.classList.toggle('active', isTarget);
      if (isTarget) {
        view.removeAttribute('hidden');
      } else {
        view.setAttribute('hidden', '');
      }
    });

    AudioService.playTick();

    // Trigger calculation refresh for active mode
    if (targetMode === 'converter') calculateConverter();
    else if (targetMode === 'rescale') calculateRescaler();
    else if (targetMode === 'detector') calculateDetector();
    else if (targetMode === 'area_volume') calculateAreaVolume();
    else if (targetMode === 'furniture') renderFurnitureGrid();
    else if (targetMode === 'reference') renderReferenceChart();
    else if (targetMode === 'workspace') renderWorkspace();
    else if (targetMode === 'expression') {
      calculateExpression();
      renderRecentExpressions();
    }
    else if (targetMode === 'multiscale') {
      calculateMultiScale();
    }
    else if (targetMode === 'chains') {
      calculateAndRenderChain();
    }
    else if (targetMode === 'cad_clipboard') {
      renderCadClipboard();
    }
    else if (targetMode === 'batch_cad') {
      parseAndConvertBatch();
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Run Button State Controller
  // ---------------------------------------------------------------------------
  function setRunButtonState(btn, status, errorMsg = '') {
    if (!btn) return;
    btn.dataset.state = status;
    const btnText = btn.querySelector('.btn-text');

    if (status === 'running') {
      if (btnText) btnText.textContent = 'CALCULATING...';
      btn.disabled = true;
    } else if (status === 'success') {
      if (btnText) btnText.textContent = 'CALCULATED ✓';
      btn.disabled = false;
      setTimeout(() => {
        if (btn.dataset.state === 'success' && btnText) {
          btnText.textContent = 'RUN CALCULATION';
          btn.dataset.state = 'ready';
        }
      }, 1200);
    } else if (status === 'error') {
      if (btnText) btnText.textContent = 'CHECK INPUTS ⚠';
      btn.disabled = false;
    } else {
      if (btnText) btnText.textContent = 'RUN CALCULATION';
      btn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Populate Dropdowns (Units, Scales)
  // ---------------------------------------------------------------------------
  function populateUnitSelects() {
    const lengthEntries = Object.entries(UNITS);
    const areaEntries = Object.entries(AREA_UNITS);
    const volumeEntries = Object.entries(VOLUME_UNITS);

    const lengthOptions = lengthEntries.map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
    
    // Converter unit selects
    if (dom.converterInputUnit) dom.converterInputUnit.innerHTML = lengthOptions;
    if (dom.converterOutputUnit) dom.converterOutputUnit.innerHTML = lengthOptions;
    if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.innerHTML = lengthOptions;
    if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.innerHTML = lengthOptions;
    if (dom.detectorPaperUnit) dom.detectorPaperUnit.innerHTML = lengthOptions;
    if (dom.detectorRealUnit) dom.detectorRealUnit.innerHTML = lengthOptions;

    // Set initial values
    if (dom.converterInputUnit) dom.converterInputUnit.value = state.converterInputUnit;
    if (dom.converterOutputUnit) dom.converterOutputUnit.value = state.converterOutputUnit;
    if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.value = state.rescaleOrigUnit;
    if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.value = state.rescaleTargetUnit;
    if (dom.detectorPaperUnit) dom.detectorPaperUnit.value = state.detectPaperUnit;
    if (dom.detectorRealUnit) dom.detectorRealUnit.value = state.detectRealUnit;

    // Reference Scale Select
    if (dom.refScaleSelect) {
      dom.refScaleSelect.innerHTML = SCALE_PRESETS.map(p => `<option value="${p.ratio}">${p.name} — ${p.desc}</option>`).join('');
      dom.refScaleSelect.value = state.refScaleRatio;
    }

    updateAreaVolumeUnitSelects();
  }

  function updateAreaVolumeUnitSelects() {
    if (!dom.areavolInputUnit || !dom.areavolOutputUnit) return;
    if (state.calcType === 'area') {
      const opts = Object.entries(AREA_UNITS).map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
      dom.areavolInputUnit.innerHTML = opts;
      dom.areavolOutputUnit.innerHTML = opts;
      dom.areavolInputUnit.value = 'cm2';
      dom.areavolOutputUnit.value = 'm2';
    } else {
      const opts = Object.entries(VOLUME_UNITS).map(([k, u]) => `<option value="${k}">${u.name} (${u.symbol})</option>`).join('');
      dom.areavolInputUnit.innerHTML = opts;
      dom.areavolOutputUnit.innerHTML = opts;
      dom.areavolInputUnit.value = 'cm3';
      dom.areavolOutputUnit.value = 'm3';
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Scale Preset Chips Renderer
  // ---------------------------------------------------------------------------
  function renderPresetChips(category = 'all') {
    if (!dom.presetsGrid) return;
    state.selectedCategory = category;

    const filtered = category === 'all'
      ? SCALE_PRESETS
      : SCALE_PRESETS.filter(p => p.category === category);

    dom.presetsGrid.innerHTML = filtered.map(preset => {
      const isSelected = preset.ratio === state.scaleRatio;
      return `
        <button class="preset-chip ${isSelected ? 'active' : ''}" data-ratio="${preset.ratio}" data-id="${preset.id}" title="${preset.desc}">
          <span class="preset-name">${preset.name}</span>
          <span class="preset-sub">${preset.category}</span>
        </button>
      `;
    }).join('');

    // Attach click listeners to preset chips
    dom.presetsGrid.querySelectorAll('.preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        state.scaleRatio = ratio;
        state.selectedPresetId = btn.dataset.id;
        if (dom.scaleRatioInput) dom.scaleRatioInput.value = ratio;
        if (dom.activeScaleBadge) dom.activeScaleBadge.textContent = `SCALE 1:${ratio}`;
        renderPresetChips(state.selectedCategory);
        AudioService.playTick();
        calculateConverter();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Mode 1: Scale Converter Engine
  // ---------------------------------------------------------------------------
  function calculateConverter() {
    const rawRatio = parseFloat(dom.scaleRatioInput?.value);
    const parsedRatio = isNaN(rawRatio) || rawRatio <= 0 ? 50 : rawRatio;
    state.scaleRatio = parsedRatio;

    const rawInput = dom.converterInputVal?.value || '';
    state.converterInputVal = rawInput;
    state.converterInputUnit = dom.converterInputUnit?.value || 'cm';
    state.converterOutputUnit = dom.converterOutputUnit?.value || 'm';

    // Actionable Empty Check
    if (!rawInput || rawInput.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: '⚠️ Drawing Measurement: Enter a measurement dimension (e.g. 10, 12.5, 3 1/2, or 12\'-6").',
        btn: dom.btnRunConverter
      });
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');
      if (state.lastValidConverter) {
        if (dom.converterResultVal) dom.converterResultVal.textContent = state.lastValidConverter.val;
        if (dom.converterResultUnit) dom.converterResultUnit.textContent = state.lastValidConverter.unit;
      }
      return;
    }

    const parseRes = parseInput(rawInput, { allowNegative: false });

    // Handle Unit Suffix extraction if user typed e.g. "15.5cm"
    if (parseRes.isValid && parseRes.detectedUnit) {
      state.converterInputUnit = parseRes.detectedUnit;
      if (dom.converterInputUnit) dom.converterInputUnit.value = parseRes.detectedUnit;
    }

    if (!parseRes.isValid || parseRes.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: `⚠️ Drawing Measurement: Enter a positive dimension greater than zero (${parseRes.error || 'e.g. 10, 12.5, 3 1/2'}).`,
        btn: dom.btnRunConverter
      });
      if (dom.converterInputVal) dom.converterInputVal.classList.add('input-error');

      // Preserve previous valid result if available
      if (state.lastValidConverter) {
        if (dom.converterResultVal) dom.converterResultVal.textContent = state.lastValidConverter.val;
        if (dom.converterResultUnit) dom.converterResultUnit.textContent = state.lastValidConverter.unit;
      } else {
        if (dom.converterResultVal) dom.converterResultVal.textContent = '---';
      }
      return;
    }

    if (dom.converterInputVal) dom.converterInputVal.classList.remove('input-error');

    try {
      const calcRes = scaleDimension({
        value: parseRes.value,
        unitKey: state.converterInputUnit,
        ratio: state.scaleRatio,
        direction: state.direction,
        targetUnitKey: state.converterOutputUnit
      });

      const formattedVal = formatNumber(calcRes.value, state.precision);

      // Cache valid result
      state.lastValidConverter = {
        val: formattedVal,
        unit: state.converterOutputUnit,
        realMeters: calcRes.realMeters
      };

      // Update Result Display
      if (dom.converterResultVal) {
        dom.converterResultVal.textContent = formattedVal;
      }
      if (dom.converterResultUnit) {
        dom.converterResultUnit.textContent = state.converterOutputUnit;
      }

      // Update Secondary Architectural Readout
      if (dom.converterSecondaryReadout) {
        const isMetric = ['mm', 'cm', 'm', 'km'].includes(state.converterOutputUnit);
        if (isMetric) {
          const inInches = calcRes.realMeters / UNITS.in.toMeters;
          const ftIn = formatFeetInches(inInches);
          const decFt = formatNumber(calcRes.realMeters / UNITS.ft.toMeters, 2);
          dom.converterSecondaryReadout.textContent = `${ftIn} (${decFt} ft)`;
        } else {
          const mVal = formatNumber(calcRes.realMeters, 3);
          const cmVal = formatNumber(calcRes.realMeters * 100, 1);
          dom.converterSecondaryReadout.textContent = `${mVal} m (${cmVal} cm)`;
        }
      }

      // Update Math Transformation Microcopy
      if (dom.converterMathFormula) {
        if (state.direction === 'drawing_to_real') {
          dom.converterMathFormula.innerHTML = `<strong>Formula:</strong> Real Site = Drawing (${formatNumber(parseRes.value, 2)} ${state.converterInputUnit}) × Scale (${state.scaleRatio}) = <strong>${formattedVal} ${state.converterOutputUnit}</strong>`;
        } else {
          dom.converterMathFormula.innerHTML = `<strong>Formula:</strong> Drawing Paper = Real Site (${formatNumber(parseRes.value, 2)} ${state.converterInputUnit}) ÷ Scale (${state.scaleRatio}) = <strong>${formattedVal} ${state.converterOutputUnit}</strong>`;
        }
      }

      // Update Breakdown Equivalents Table
      renderEquivalentsBreakdown(calcRes.realMeters);

      // Update Visual Scale Bar & Silhouette
      updateVisualization({
        realMeters: calcRes.realMeters,
        scaleRatio: state.scaleRatio,
        drawingMeters: calcRes.drawingMeters,
        containerId: 'visualizer-container'
      });

      // Update Unified Result Lifecycle State & Context Strip
      const directionLabel = state.direction === 'drawing_to_real' ? 'Paper Drawing' : 'Real Site';
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'success',
        context: {
          'Scale': `1:${state.scaleRatio}`,
          'Source Input': `${formatNumber(parseRes.value, 2)} ${state.converterInputUnit} (${directionLabel})`
        },
        btn: dom.btnRunConverter
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'converter',
        status: 'error',
        errorText: `⚠️ Conversion error: ${err.message}`,
        btn: dom.btnRunConverter
      });
    }
  }

  function renderEquivalentsBreakdown(realMeters) {
    if (!dom.metricBreakdownList || !dom.imperialBreakdownList) return;
    try {
      const equivalents = getAllUnitEquivalents(realMeters);

      dom.metricBreakdownList.innerHTML = equivalents.metric.map(item => `
        <div class="equiv-row">
          <span class="equiv-name">${item.label}</span>
          <span class="equiv-val">${formatNumber(item.val, 3)} ${item.symbol}</span>
        </div>
      `).join('');

      dom.imperialBreakdownList.innerHTML = equivalents.imperial.map(item => `
        <div class="equiv-row">
          <span class="equiv-name">${item.label}</span>
          <span class="equiv-val">${item.key === 'ft_in' ? item.val : `${formatNumber(item.val, 3)} ${item.symbol}`}</span>
        </div>
      `).join('');
    } catch (e) {
      // Guard against non-finite breakdown
    }
  }

  function swapDirection() {
    state.direction = state.direction === 'drawing_to_real' ? 'real_to_drawing' : 'drawing_to_real';

    // Swap input/output unit selections
    const prevInUnit = dom.converterInputUnit?.value || 'cm';
    const prevOutUnit = dom.converterOutputUnit?.value || 'm';
    
    if (dom.converterInputUnit) dom.converterInputUnit.value = prevOutUnit;
    if (dom.converterOutputUnit) dom.converterOutputUnit.value = prevInUnit;

    state.converterInputUnit = prevOutUnit;
    state.converterOutputUnit = prevInUnit;

    if (state.direction === 'drawing_to_real') {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Drawing Measurement (Paper)';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Real-World Dimension';
      if (dom.converterFlowFrom) dom.converterFlowFrom.textContent = '📐 Paper Drawing';
      if (dom.converterFlowTo) dom.converterFlowTo.textContent = '🏛️ Real-World Site';
    } else {
      if (dom.converterInputBadge) dom.converterInputBadge.textContent = 'Real-World Dimension';
      if (dom.converterOutputBadge) dom.converterOutputBadge.textContent = 'Drawing Measurement (Paper)';
      if (dom.converterFlowFrom) dom.converterFlowFrom.textContent = '🏛️ Real-World Site';
      if (dom.converterFlowTo) dom.converterFlowTo.textContent = '📐 Paper Drawing';
    }

    AudioService.playSwapSound();
    calculateConverter();
  }

  // ---------------------------------------------------------------------------
  // 8. Mode 2: Rescaler Engine (Scale A -> Scale B)
  // ---------------------------------------------------------------------------
  function calculateRescaler() {
    const origRatio = parseFloat(dom.rescaleOrigRatio?.value);
    const targetRatio = parseFloat(dom.rescaleTargetRatio?.value);
    const rawVal = dom.rescaleOrigVal?.value || '';

    // Actionable Scale Validation
    if (isNaN(origRatio) || origRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Original Scale (Scale A): Enter a scale denominator greater than 0 (e.g. 50 for 1:50).',
        btn: dom.btnRunRescale
      });
      return;
    }

    if (isNaN(targetRatio) || targetRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Target Scale (Scale B): Enter a scale denominator greater than 0 (e.g. 200 for 1:200).',
        btn: dom.btnRunRescale
      });
      return;
    }

    state.rescaleOrigRatio = origRatio;
    state.rescaleTargetRatio = targetRatio;
    state.rescaleOrigUnit = dom.rescaleOrigUnit?.value || 'cm';
    state.rescaleTargetUnit = dom.rescaleTargetUnit?.value || 'cm';

    // Actionable Dimension Empty Check
    if (!rawVal || rawVal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: '⚠️ Measured Length: Enter a positive drawing length measured on Sheet A (e.g. 12, 15.5, 3 1/2).',
        btn: dom.btnRunRescale
      });
      if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.add('input-error');
      if (state.lastValidRescale) {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = state.lastValidRescale.val;
        if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.lastValidRescale.unit;
      }
      return;
    }

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid || parsed.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: `⚠️ Measured Length: Enter a positive drawing measurement greater than zero (${parsed.error || 'e.g. 12, 15.5'}).`,
        btn: dom.btnRunRescale
      });
      if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.add('input-error');

      // Preserve previous valid result
      if (state.lastValidRescale) {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = state.lastValidRescale.val;
        if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.lastValidRescale.unit;
      } else {
        if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = '---';
      }
      return;
    }

    if (dom.rescaleOrigVal) dom.rescaleOrigVal.classList.remove('input-error');

    try {
      const res = rescaleDrawing({
        originalVal: parsed.value,
        originalUnitKey: state.rescaleOrigUnit,
        originalRatio: state.rescaleOrigRatio,
        targetRatio: state.rescaleTargetRatio,
        targetUnitKey: state.rescaleTargetUnit
      });

      const formatted = formatNumber(res.targetValue, state.precision);
      state.lastValidRescale = {
        val: formatted,
        unit: state.rescaleTargetUnit
      };

      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = formatted;
      if (dom.rescaleResultUnit) dom.rescaleResultUnit.textContent = state.rescaleTargetUnit;
      if (dom.rescaleFactorBadge) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleFactorBadge.textContent = `${pct}% (${tag})`;
      }
      if (dom.rescaleRealSpan) {
        dom.rescaleRealSpan.textContent = `${formatNumber(res.realMeters, 3)} m`;
      }

      // Update Math Formula Microcopy
      if (dom.rescaleMathFormula) {
        const pct = (res.factor * 100).toFixed(1);
        const tag = res.factor > 1 ? 'Enlarged' : res.factor < 1 ? 'Reduced' : 'Same';
        dom.rescaleMathFormula.innerHTML = `<strong>Formula:</strong> New Length = Original (${formatNumber(parsed.value, 2)} ${state.rescaleOrigUnit} @ 1:${state.rescaleOrigRatio}) × (${state.rescaleOrigRatio} ÷ ${state.rescaleTargetRatio}) = <strong>${formatted} ${state.rescaleTargetUnit} (${pct}% ${tag})</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'success',
        context: {
          'Rescale': `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
          'Source Sheet A': `${formatNumber(parsed.value, 2)} ${state.rescaleOrigUnit}`,
          'Real Physical Distance': `${formatNumber(res.realMeters, 3)} m`
        },
        btn: dom.btnRunRescale
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'rescale',
        status: 'error',
        errorText: `⚠️ Rescale error: ${err.message}`,
        btn: dom.btnRunRescale
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Mode 3: Scale Detector / Finder Engine
  // ---------------------------------------------------------------------------
  function calculateDetector() {
    const rawPaper = dom.detectorPaperVal?.value || '';
    const rawReal = dom.detectorRealVal?.value || '';

    state.detectPaperUnit = dom.detectorPaperUnit?.value || 'cm';
    state.detectRealUnit = dom.detectorRealUnit?.value || 'm';

    // Actionable Empty Checks
    if (!rawPaper || rawPaper.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: '⚠️ Paper Dimension: Enter a measured drawing length (e.g. 4.5, 10, 2 1/4).',
        btn: dom.btnRunDetector
      });
      if (dom.detectorPaperVal) dom.detectorPaperVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    const paperP = parseInput(rawPaper, { allowNegative: false });
    if (!paperP.isValid || paperP.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Paper Dimension: Enter a positive drawing length greater than zero (${paperP.error || 'e.g. 4.5 cm'}).`,
        btn: dom.btnRunDetector
      });
      if (dom.detectorPaperVal) dom.detectorPaperVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    if (dom.detectorPaperVal) dom.detectorPaperVal.classList.remove('input-error');

    if (!rawReal || rawReal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: '⚠️ Real-World Dimension: Enter the known physical site distance (e.g. 9, 15, 30).',
        btn: dom.btnRunDetector
      });
      if (dom.detectorRealVal) dom.detectorRealVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    const realP = parseInput(rawReal, { allowNegative: false });
    if (!realP.isValid || realP.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Real-World Dimension: Enter a positive site dimension greater than zero (${realP.error || 'e.g. 9 m'}).`,
        btn: dom.btnRunDetector
      });
      if (dom.detectorRealVal) dom.detectorRealVal.classList.add('input-error');
      if (state.lastValidDetector && dom.detectorRatioVal) {
        dom.detectorRatioVal.textContent = state.lastValidDetector.ratioString;
      }
      return;
    }

    if (dom.detectorRealVal) dom.detectorRealVal.classList.remove('input-error');

    try {
      const res = detectScale({
        paperVal: paperP.value,
        paperUnitKey: state.detectPaperUnit,
        realVal: realP.value,
        realUnitKey: state.detectRealUnit
      });

      if (res.ratio === null || res.ratio <= 0) {
        setUnifiedResultState({
          toolPrefix: 'detector',
          status: 'error',
          errorText: '⚠️ Scale Detection: Dimensions must be greater than zero to determine scale.',
          btn: dom.btnRunDetector
        });
        return;
      }

      state.lastDetectedRatio = res.ratio;
      state.lastValidDetector = {
        ratioString: res.ratioString,
        ratio: res.ratio
      };

      if (dom.detectorRatioVal) dom.detectorRatioVal.textContent = res.ratioString;
      if (dom.detectorPresetBadge) {
        if (res.closestPreset) {
          const matchLabel = res.isExactMatch ? 'Exact Match' : `Closest: Δ ${res.closestPreset.percentDiff}%`;
          dom.detectorPresetBadge.innerHTML = `${matchLabel}: <strong>${res.closestPreset.name} (${res.closestPreset.desc})</strong>`;
        } else {
          dom.detectorPresetBadge.textContent = 'Custom Ratio (No standard preset match)';
        }
      }

      // Update Math Formula Microcopy
      if (dom.detectorMathFormula) {
        dom.detectorMathFormula.innerHTML = `<strong>Formula:</strong> Scale 1:X = Real (${formatNumber(realP.value, 2)} ${state.detectRealUnit}) ÷ Paper (${formatNumber(paperP.value, 2)} ${state.detectPaperUnit}) = <strong>${res.ratioString}</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'success',
        context: {
          'Drawing Line': `${formatNumber(paperP.value, 2)} ${state.detectPaperUnit}`,
          'Physical Site': `${formatNumber(realP.value, 2)} ${state.detectRealUnit}`,
          'Detected Ratio': res.ratioString
        },
        btn: dom.btnRunDetector
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'detector',
        status: 'error',
        errorText: `⚠️ Detection error: ${err.message}`,
        btn: dom.btnRunDetector
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Mode 4: Area & Volume Scaler Engine
  // ---------------------------------------------------------------------------
  function calculateAreaVolume() {
    const rawRatio = parseFloat(dom.areavolRatioInput?.value);
    if (isNaN(rawRatio) || rawRatio <= 0) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: '⚠️ Scale Ratio: Enter a scale denominator ratio greater than 0 (e.g. 100 for 1:100).',
        btn: dom.btnRunAreavol
      });
      return;
    }

    state.areavolRatio = rawRatio;
    state.areavolInputUnit = dom.areavolInputUnit?.value || (state.calcType === 'area' ? 'cm2' : 'cm3');
    state.areavolOutputUnit = dom.areavolOutputUnit?.value || (state.calcType === 'area' ? 'm2' : 'm3');

    const rawVal = dom.areavolInputVal?.value || '';
    if (!rawVal || rawVal.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: '⚠️ Measurement Input: Enter a positive area or volume dimension (e.g. 4 m² or 25 sq ft).',
        btn: dom.btnRunAreavol
      });
      if (dom.areavolInputVal) dom.areavolInputVal.classList.add('input-error');
      if (state.lastValidAreavol) {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = state.lastValidAreavol.val;
        if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.lastValidAreavol.unit;
      }
      return;
    }

    const parsed = parseInput(rawVal, { allowNegative: false });

    if (!parsed.isValid || parsed.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: `⚠️ Measurement Input: Enter a positive value greater than zero (${parsed.error || 'e.g. 4 m²'}).`,
        btn: dom.btnRunAreavol
      });
      if (dom.areavolInputVal) dom.areavolInputVal.classList.add('input-error');

      // Preserve previous valid result
      if (state.lastValidAreavol) {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = state.lastValidAreavol.val;
        if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.lastValidAreavol.unit;
      } else {
        if (dom.areavolResultVal) dom.areavolResultVal.textContent = '---';
      }
      return;
    }

    if (dom.areavolInputVal) dom.areavolInputVal.classList.remove('input-error');

    try {
      const isDrawingToReal = state.calcDirection === 'drawing_to_real';
      let res;

      if (state.calcType === 'area') {
        res = scaleArea({
          areaVal: parsed.value,
          inputUnitKey: state.areavolInputUnit,
          scaleRatio: state.areavolRatio,
          outputUnitKey: state.areavolOutputUnit,
          isDrawingToReal: isDrawingToReal
        });
        if (dom.areavolFactorBadge) {
          dom.areavolFactorBadge.textContent = `× ${formatNumber(res.factor, 0)} (${state.areavolRatio}²)`;
        }
      } else {
        res = scaleVolume({
          volumeVal: parsed.value,
          inputUnitKey: state.areavolInputUnit,
          scaleRatio: state.areavolRatio,
          outputUnitKey: state.areavolOutputUnit,
          isDrawingToReal: isDrawingToReal
        });
        if (dom.areavolFactorBadge) {
          dom.areavolFactorBadge.textContent = `× ${formatNumber(res.factor, 0)} (${state.areavolRatio}³)`;
        }
      }

      const formatted = formatNumber(res.resultValue, state.precision);
      state.lastValidAreavol = {
        val: formatted,
        unit: state.areavolOutputUnit
      };

      if (dom.areavolResultVal) dom.areavolResultVal.textContent = formatted;
      if (dom.areavolResultUnit) dom.areavolResultUnit.textContent = state.areavolOutputUnit;

      // Update Math Formula Microcopy
      if (dom.areavolMathFormula) {
        const powStr = state.calcType === 'area' ? '²' : '³';
        const typeLabel = state.calcType === 'area' ? 'Area' : 'Volume';
        const op = isDrawingToReal ? '×' : '÷';
        const targetTitle = isDrawingToReal ? `Real Site ${typeLabel}` : `Drawing Paper ${typeLabel}`;
        dom.areavolMathFormula.innerHTML = `<strong>Formula:</strong> ${targetTitle} = Input (${formatNumber(parsed.value, 2)} ${state.areavolInputUnit}) ${op} Scale${powStr} (${state.areavolRatio}${powStr} = ${formatNumber(res.factor, 0)}) = <strong>${formatted} ${state.areavolOutputUnit}</strong>`;
      }

      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'success',
        context: {
          'Scale Ratio': `1:${state.areavolRatio}`,
          'Source Value': `${formatNumber(parsed.value, 2)} ${state.areavolInputUnit}`,
          'Multiplier': `× ${formatNumber(res.factor, 0)}`
        },
        btn: dom.btnRunAreavol
      });
    } catch (err) {
      setUnifiedResultState({
        toolPrefix: 'areavol',
        status: 'error',
        errorText: `⚠️ Scaling error: ${err.message}`,
        btn: dom.btnRunAreavol
      });
    }
  }

  // ---------------------------------------------------------------------------
  function updateCategoryPillCounts() {
    const counts = { all: FURNITURE_DATABASE.length };
    for (const item of FURNITURE_DATABASE) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    dom.furnCategoryNav?.querySelectorAll('.furn-cat-pill').forEach(pill => {
      const cat = pill.dataset.cat;
      const badge = pill.querySelector('.furn-cat-count');
      if (badge && counts[cat] !== undefined) {
        badge.textContent = counts[cat];
      }
    });
  }

  function renderFurnitureGrid() {
    if (!dom.furnitureCardsGrid) return;

    const rawScale = parseFloat(dom.furnScaleRatioInput?.value);
    state.furnitureScaleRatio = isNaN(rawScale) || rawScale <= 0 ? 50 : rawScale;
    state.furniturePaperUnit = dom.furnPaperUnitSelect?.value || 'cm';
    state.furnitureSortKey = dom.furnSortSelect?.value || state.furnitureSortKey || 'default';

    // Apply compact / comfortable density class to grid container
    dom.furnitureCardsGrid.classList.toggle('compact-mode', state.furnitureDensity === 'compact');

    const filtered = filterFurnitureCatalog(
      FURNITURE_DATABASE,
      state.furnitureSearchQuery,
      state.furnitureActiveCategory,
      state.furnitureSortKey
    );

    updateCategoryPillCounts();

    if (dom.furnitureResultsCount) {
      dom.furnitureResultsCount.textContent = `Showing ${filtered.length} of ${FURNITURE_DATABASE.length} items`;
    }

    if (filtered.length === 0) {
      const activeFilterName = state.furnitureSearchQuery ? `"${state.furnitureSearchQuery}"` : state.furnitureActiveCategory;
      dom.furnitureCardsGrid.innerHTML = `
        <div class="empty-furn-state">
          <div class="empty-furn-icon">📐</div>
          <div class="empty-furn-title">No matching furniture pieces found for ${activeFilterName}</div>
          <div class="empty-furn-desc">Try searching for generic terms, specific dimensions (e.g. <code>200</code>, <code>200x200</code>, <code>60cm</code>), or explore suggested standards:</div>
          <div class="empty-furn-suggestions">
            <button class="empty-suggest-chip" data-search="sofa">Sofa</button>
            <button class="empty-suggest-chip" data-search="king bed">King Bed</button>
            <button class="empty-suggest-chip" data-search="dining table">Dining Table</button>
            <button class="empty-suggest-chip" data-search="island">Kitchen Island</button>
            <button class="empty-suggest-chip" data-search="desk">Office Desk</button>
            <button class="empty-suggest-chip" data-search="ada">ADA Accessibility</button>
            <button class="empty-suggest-chip" data-search="door">Doors</button>
            <button class="empty-suggest-chip" data-search="200">200cm Pieces</button>
          </div>
          <button id="btn-reset-furn-filter" class="action-tool-btn primary" style="margin-top: 1rem;">Reset Search & Show All Standards</button>
        </div>
      `;

      const resetBtn = dom.furnitureCardsGrid.querySelector('#btn-reset-furn-filter');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
          state.furnitureSearchQuery = '';
          state.furnitureActiveCategory = 'all';
          dom.furnCategoryNav?.querySelectorAll('.furn-cat-pill').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === 'all');
          });
          renderFurnitureGrid();
        });
      }

      dom.furnitureCardsGrid.querySelectorAll('.empty-suggest-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const q = chip.dataset.search;
          if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = q;
          state.furnitureSearchQuery = q;
          renderFurnitureGrid();
        });
      });

      return;
    }

    dom.furnitureCardsGrid.innerHTML = filtered.map(item => {
      const scaled = getScaledFurnitureDimensions(item, state.furnitureScaleRatio, state.furniturePaperUnit);
      const isAda = item.id.includes('ada') || (item.desc && item.desc.toLowerCase().includes('ada')) || item.name.toLowerCase().includes('ada');
      const isCompact = state.furnitureDensity === 'compact';

      return `
        <div class="furniture-card ${isCompact ? 'compact-card' : ''}" data-id="${item.id}">
          <div class="furn-card-header">
            <div class="furn-title-area">
              <div class="furn-name">${item.name}</div>
              <div class="furn-header-meta">
                <span class="furn-category-tag">${item.category.toUpperCase()}</span>
                <span class="furn-std-badge ${isAda ? 'ada-badge' : ''}">${scaled.standardTag}</span>
              </div>
            </div>
            <div class="furn-dim-badge">1:${state.furnitureScaleRatio}</div>
          </div>

          <div class="furn-card-body">
            <div class="furn-plan-preview-box" title="Architectural Blueprint Top-Down Plan">
              ${getFurniturePlanSVG(item)}
            </div>

            <div class="furn-footprint-row">
              <span class="footprint-label">Space Footprint:</span>
              <span class="footprint-val"><strong>${scaled.footprintM2} m²</strong><span class="footprint-imperial">(${scaled.footprintSqFt} sq ft)</span></span>
            </div>

            <div class="furn-item-desc">${item.desc}</div>

            <div class="furn-specs-grid">
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Real Dimensions:</span>
                <span class="furn-spec-val highlight">${scaled.realFormattedMetric}</span>
              </div>
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Imperial Equiv:</span>
                <span class="furn-spec-val">${scaled.realFormattedImperial}</span>
              </div>
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Scaled on Paper:</span>
                <span class="furn-spec-val paper-result">${scaled.paperFormatted}</span>
              </div>
              <div class="furn-spec-row">
                <span class="furn-spec-lbl">Dimension Standard:</span>
                <span class="furn-spec-val std-type-tag">${scaled.dimensionType}</span>
              </div>
            </div>
          </div>

          <div class="furn-card-footer">
            <button class="btn-furn-planner action-tool-btn compact" data-name="${item.name}" data-dims="${scaled.realFormattedMetric}" title="Add piece to active room plan">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3h18v18H3z"/><path d="M9 3v18M3 9h18"/></svg>
              + Use in Planner
            </button>
            <button class="btn-furn-copy action-tool-btn compact" data-text="${scaled.paperFormatted}" title="Copy scaled drawing dimensions">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Size
            </button>
            <button class="btn-furn-send action-tool-btn compact" data-w="${item.wCm}" title="Send width to Converter">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              To Converter
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to dynamically rendered card buttons
    dom.furnitureCardsGrid.querySelectorAll('.btn-furn-planner').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`📐 Added ${btn.dataset.name} (${btn.dataset.dims}) to Room Planner layout`);
        AudioService.playTick();
      });
    });

    dom.furnitureCardsGrid.querySelectorAll('.btn-furn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.text, 'Scaled Furniture Size');
      });
    });

    dom.furnitureCardsGrid.querySelectorAll('.btn-furn-send').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.dataset.w;
        if (dom.converterInputVal) dom.converterInputVal.value = w;
        if (dom.converterInputUnit) dom.converterInputUnit.value = 'cm';
        state.direction = 'real_to_drawing';
        switchMode('converter');
        showToast(`Sent dimension ${w} cm to Converter`);
      });
    });
  }

  function calculateCustomFurniture() {
    const rawW = dom.customFurnW?.value || '';
    const rawD = dom.customFurnD?.value || '';

    state.customFurnUnit = dom.customFurnUnit?.value || 'cm';
    state.furnitureScaleRatio = parseFloat(dom.furnScaleRatioInput?.value) || 50;
    state.furniturePaperUnit = dom.furnPaperUnitSelect?.value || 'cm';

    if (!rawW || rawW.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Width (W): Enter a positive width dimension (e.g. 240 cm).'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Please enter a positive width dimension</span>';
      return;
    }

    const pw = parseInput(rawW, { allowNegative: false });
    if (!pw.isValid || pw.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Width (W): Width must be greater than zero.'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Width must be greater than zero</span>';
      return;
    }

    if (!rawD || rawD.trim() === '') {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Depth (D): Enter a positive depth dimension (e.g. 100 cm).'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Please enter a positive depth dimension</span>';
      return;
    }

    const pd = parseInput(rawD, { allowNegative: false });
    if (!pd.isValid || pd.value <= 0) {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: '⚠️ Custom Piece Depth (D): Depth must be greater than zero.'
      });
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = '<span style="color: var(--color-error);">⚠️ Depth must be greater than zero</span>';
      return;
    }

    try {
      const wRes = scaleDimension({
        value: pw.value,
        unitKey: state.customFurnUnit,
        ratio: state.furnitureScaleRatio,
        direction: 'real_to_drawing',
        targetUnitKey: state.furniturePaperUnit
      });

      const dRes = scaleDimension({
        value: pd.value,
        unitKey: state.customFurnUnit,
        ratio: state.furnitureScaleRatio,
        direction: 'real_to_drawing',
        targetUnitKey: state.furniturePaperUnit
      });

      // Real Footprint Area
      const unitFactor = UNITS[state.customFurnUnit]?.toMeters || 0.01;
      const wMeters = pw.value * unitFactor;
      const dMeters = pd.value * unitFactor;
      const realAreaM2 = wMeters * dMeters;
      const realAreaSqFt = realAreaM2 * 10.7639;

      // Scaled Drawing Paper Area
      const paperArea = wRes.value * dRes.value;

      const paperFormatted = `${formatNumber(wRes.value, 2)} × ${formatNumber(dRes.value, 2)} ${state.furniturePaperUnit}`;
      const formatted = `Paper @ 1:${state.furnitureScaleRatio}: <strong>${paperFormatted}</strong> (${formatNumber(paperArea, 2)} ${state.furniturePaperUnit}²) | Real Footprint: <strong>${formatNumber(realAreaM2, 2)} m²</strong> (${formatNumber(realAreaSqFt, 1)} sq ft)`;
      
      if (dom.customFurnResult) dom.customFurnResult.innerHTML = formatted;
      
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'success'
      });
      AudioService.playTick();
    } catch (e) {
      setUnifiedResultState({
        toolPrefix: 'custom-furn',
        status: 'error',
        errorText: `⚠️ Scaling error: ${e.message}`
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 12. Mode 6: Architectural Drafting Reference Sheet
  // ---------------------------------------------------------------------------
  function renderReferenceChart() {
    if (!dom.refTableBody) return;
    state.refScaleRatio = parseFloat(dom.refScaleSelect?.value) || 50;

    // 1. Update Active Scale Indicators
    const scaleString = `SCALE 1:${state.refScaleRatio}`;
    if (dom.refActiveScaleBadge) dom.refActiveScaleBadge.textContent = scaleString;
    if (dom.refRulerScaleLabel) dom.refRulerScaleLabel.textContent = scaleString;
    if (dom.refBenchmarksScaleLabel) dom.refBenchmarksScaleLabel.textContent = scaleString;
    if (dom.refTbScale) dom.refTbScale.textContent = `1:${state.refScaleRatio}`;
    if (dom.refTbDate) dom.refTbDate.textContent = new Date().toISOString().slice(0, 10);

    // 2. Sync Quick Scale Preset Chips
    if (dom.refQuickChips) {
      dom.refQuickChips.querySelectorAll('.ref-chip-btn').forEach(btn => {
        const r = parseFloat(btn.dataset.ratio);
        btn.classList.toggle('active', r === state.refScaleRatio);
      });
    }

    // 3. Render Printable Architectural Scale Ruler Graphic (150 mm on paper)
    if (dom.refRulerContainer) {
      const rulerMm = 150; // 15 cm printable ruler
      const siteMetersTotal = (rulerMm / 1000) * state.refScaleRatio;
      
      let siteStep = 1;
      if (state.refScaleRatio <= 20) siteStep = 0.2;
      else if (state.refScaleRatio <= 50) siteStep = 0.5;
      else if (state.refScaleRatio <= 100) siteStep = 1;
      else if (state.refScaleRatio <= 250) siteStep = 2;
      else siteStep = 5;

      let siteTicksSvg = '';
      for (let s = 0; s <= siteMetersTotal + 0.001; s += siteStep) {
        const xPosMm = (s / state.refScaleRatio) * 1000;
        if (xPosMm > rulerMm + 0.5) break;
        const isMajor = Math.abs(s % (siteStep * 2)) < 0.001 || s === 0;
        const tickH = isMajor ? 14 : 9;
        const xPct = (xPosMm / rulerMm) * 100;
        siteTicksSvg += `
          <line x1="${xPct}%" y1="0" x2="${xPct}%" y2="${tickH}" stroke="currentColor" stroke-width="${isMajor ? 1.5 : 1}"/>
          ${isMajor ? `<text x="${xPct}%" y="24" font-size="8" font-family="monospace" text-anchor="middle" fill="currentColor">${formatNumber(s, s < 1 ? 1 : 0)}m</text>` : ''}
        `;
      }

      // Bottom edge: Paper cm ticks (every 10mm and 1mm)
      let paperTicksSvg = '';
      for (let cm = 0; cm <= rulerMm / 10; cm++) {
        const xPct = ((cm * 10) / rulerMm) * 100;
        paperTicksSvg += `
          <line x1="${xPct}%" y1="52" x2="${xPct}%" y2="40" stroke="currentColor" stroke-width="1.5"/>
          <text x="${xPct}%" y="37" font-size="7" font-family="monospace" text-anchor="middle" fill="currentColor">${cm}</text>
        `;
        if (cm < rulerMm / 10) {
          const midPct = (((cm * 10) + 5) / rulerMm) * 100;
          paperTicksSvg += `<line x1="${midPct}%" y1="52" x2="${midPct}%" y2="44" stroke="currentColor" stroke-width="1"/>`;
        }
      }

      dom.refRulerContainer.innerHTML = `
        <svg class="ruler-svg" viewBox="0 0 100 52" preserveAspectRatio="none" style="width: 150mm; max-width: 100%; height: 52px; color: var(--accent-primary);">
          <rect x="0" y="0" width="100%" height="52" fill="none" stroke="currentColor" stroke-width="1"/>
          ${siteTicksSvg}
          ${paperTicksSvg}
        </svg>
      `;
    }

    // 4. Render Architectural Neufert Benchmarks
    if (dom.refBenchmarksGrid) {
      const benchmarks = [
        { name: 'Standard Interior Door', wM: 0.90, hM: 2.10 },
        { name: 'Ceiling Clearance (Min)', wM: 2.70, hM: null },
        { name: 'Adult Human Stature', wM: 1.75, hM: null },
        { name: 'Kitchen Counter Height', wM: 0.90, hM: null },
        { name: 'Standard Parking Stall', wM: 2.50, hM: 5.00 },
        { name: 'Stair Step Riser', wM: 0.17, hM: null },
        { name: 'Office Desk Surface', wM: 1.60, hM: 0.80 },
        { name: 'Corridor Width (Code)', wM: 1.20, hM: null }
      ];

      dom.refBenchmarksGrid.innerHTML = benchmarks.map(b => {
        const siteText = b.hM ? `${b.wM.toFixed(2)} × ${b.hM.toFixed(2)} m` : `${b.wM.toFixed(2)} m`;
        const paperW = (b.wM / state.refScaleRatio) * 100;
        const paperH = b.hM ? (b.hM / state.refScaleRatio) * 100 : null;
        const paperText = paperH ? `${formatNumber(paperW, 2)} × ${formatNumber(paperH, 2)} cm` : `${formatNumber(paperW, 2)} cm`;
        return `
          <div class="benchmark-card">
            <span class="bm-name">${b.name}</span>
            <span class="bm-site">Site: ${siteText}</span>
            <span class="bm-paper">Paper: ${paperText}</span>
          </div>
        `;
      }).join('');
    }

    // 5. Render Master Dimension Data Table (Metric & Imperial Dual Data)
    const metricLengthsCm = [
      { cm: 0.05, label: '0.5 mm', isBenchmark: false },
      { cm: 0.1, label: '1 mm (0.1 cm)', isBenchmark: false },
      { cm: 0.2, label: '2 mm (0.2 cm)', isBenchmark: false },
      { cm: 0.5, label: '5 mm (0.5 cm)', isBenchmark: true },
      { cm: 1.0, label: '10 mm (1.0 cm)', isBenchmark: true },
      { cm: 2.0, label: '20 mm (2.0 cm)', isBenchmark: false },
      { cm: 5.0, label: '50 mm (5.0 cm)', isBenchmark: true },
      { cm: 10.0, label: '100 mm (10.0 cm)', isBenchmark: true },
      { cm: 15.0, label: '150 mm (15.0 cm)', isBenchmark: false },
      { cm: 20.0, label: '200 mm (20.0 cm)', isBenchmark: true },
      { cm: 25.0, label: '250 mm (25.0 cm)', isBenchmark: false },
      { cm: 30.0, label: '300 mm (30.0 cm - Ruler)', isBenchmark: true },
      { cm: 42.0, label: '420 mm (A3 Width)', isBenchmark: false },
      { cm: 50.0, label: '500 mm (50.0 cm)', isBenchmark: true },
      { cm: 100.0, label: '1000 mm (1.0 m Paper)', isBenchmark: true }
    ];

    const imperialLengthsIn = [
      { in: 0.0625, label: '1/16" (1.59 mm)', isBenchmark: false },
      { in: 0.125, label: '1/8" (3.18 mm)', isBenchmark: false },
      { in: 0.25, label: '1/4" (6.35 mm)', isBenchmark: true },
      { in: 0.375, label: '3/8" (9.53 mm)', isBenchmark: false },
      { in: 0.5, label: '1/2" (12.70 mm)', isBenchmark: true },
      { in: 0.75, label: '3/4" (19.05 mm)', isBenchmark: false },
      { in: 1.0, label: '1" (25.40 mm)', isBenchmark: true },
      { in: 1.5, label: '1-1/2" (38.10 mm)', isBenchmark: false },
      { in: 2.0, label: '2" (50.80 mm)', isBenchmark: false },
      { in: 3.0, label: '3" (76.20 mm)', isBenchmark: false },
      { in: 6.0, label: '6" (152.40 mm)', isBenchmark: true },
      { in: 12.0, label: '12" (1 ft on Paper)', isBenchmark: true }
    ];

    const metricRows = metricLengthsCm.map(item => {
      const realMeters = (item.cm * 0.01) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr class="${item.isBenchmark ? 'benchmark-row' : ''}">
          <td class="col-paper"><strong>${item.label}</strong></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm col-mm-th">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${realFtIn}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    });

    const imperialRows = imperialLengthsIn.map(item => {
      const realMeters = (item.in * 0.0254) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr class="${item.isBenchmark ? 'benchmark-row' : ''}">
          <td class="col-paper"><strong>${item.label}</strong></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm col-mm-th">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${realFtIn}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    });

    dom.refTableBody.innerHTML = `
      <tr class="table-section-divider"><td colspan="6" style="background: var(--bg-surface-elevated); color: var(--text-tertiary); font-weight: 800; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.4rem 0.75rem;">— METRIC DRAWING MEASUREMENTS —</td></tr>
      ${metricRows.join('')}
      <tr class="table-section-divider"><td colspan="6" style="background: var(--bg-surface-elevated); color: var(--text-tertiary); font-weight: 800; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.4rem 0.75rem;">— IMPERIAL DRAWING MEASUREMENTS —</td></tr>
      ${imperialRows.join('')}
    `;
  }

  // ---------------------------------------------------------------------------
  // 13. Calculation Journal & History Manager
  // ---------------------------------------------------------------------------
  function renderHistoryList() {
    if (!dom.historyList) return;
    const history = HistoryService.getHistory();

    if (dom.historyCountBadge) {
      dom.historyCountBadge.textContent = `${history.length} ${history.length === 1 ? 'entry' : 'entries'}`;
    }

    if (history.length === 0) {
      dom.historyList.innerHTML = `
        <div class="empty-history-box">
          <div class="empty-hist-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="empty-hist-title">No calculations yet.</div>
          <div class="empty-hist-desc">Run a calculation and it will appear here.</div>
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = history.map(item => `
      <div class="history-item-card" data-id="${item.id}">
        <div class="hist-card-top">
          <div class="hist-title-group">
            <span class="hist-mode-tag">${item.operation || item.mode || 'Scale Converter'}</span>
            <span class="hist-scale-tag">${item.scaleStr || '-'}</span>
          </div>
          <span class="hist-time-tag">${item.timestamp || ''}</span>
        </div>
        
        <div class="hist-details-grid">
          <div class="hist-data-row">
            <span class="hist-lbl">INPUT</span>
            <span class="hist-val hist-input-val">${item.inputStr || '-'}</span>
          </div>
          <div class="hist-data-row highlight">
            <span class="hist-lbl">RESULT</span>
            <span class="hist-val hist-output-val">${item.outputStr || '-'}</span>
          </div>
        </div>

        <div class="hist-card-actions">
          ${item.stateSnapshot ? `
            <button class="hist-btn-restore action-tool-btn compact primary" data-id="${item.id}" title="Restore and rerun this calculation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Restore
            </button>
          ` : ''}
          <button class="hist-btn-copy action-tool-btn compact" data-text="${item.outputStr || item.inputStr}" title="Copy calculated result">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
          <button class="hist-btn-del action-tool-btn compact danger" data-id="${item.id}" title="Remove entry from journal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');

    dom.historyList.querySelectorAll('.hist-btn-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreCalculationById(btn.dataset.id);
      });
    });

    dom.historyList.querySelectorAll('.hist-btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.text, 'Calculation Result');
      });
    });

    dom.historyList.querySelectorAll('.hist-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        HistoryService.removeEntry(btn.dataset.id);
        renderHistoryList();
        showToast('Entry removed from journal');
      });
    });
  }

  function restoreCalculationById(id) {
    const item = HistoryService.getHistory().find(h => h.id === id);
    if (!item || !item.stateSnapshot) {
      showToast('Cannot restore state for this entry', 'warning');
      return;
    }
    const snap = item.stateSnapshot;
    switch (snap.modeKey) {
      case 'converter':
        switchMode('converter');
        if (dom.scaleRatioInput) dom.scaleRatioInput.value = snap.ratio;
        if (dom.converterInputVal) dom.converterInputVal.value = snap.val;
        if (dom.converterInputUnit) dom.converterInputUnit.value = snap.inUnit;
        if (dom.converterOutputUnit) dom.converterOutputUnit.value = snap.outUnit;
        state.direction = snap.direction || 'drawing_to_real';
        updateDirectionUI();
        calculateConverter();
        break;
      case 'rescale':
        switchMode('rescale');
        if (dom.rescaleOrigRatio) dom.rescaleOrigRatio.value = snap.origRatio;
        if (dom.rescaleOrigVal) dom.rescaleOrigVal.value = snap.origVal;
        if (dom.rescaleOrigUnit) dom.rescaleOrigUnit.value = snap.origUnit;
        if (dom.rescaleTargetRatio) dom.rescaleTargetRatio.value = snap.targetRatio;
        if (dom.rescaleTargetUnit) dom.rescaleTargetUnit.value = snap.targetUnit;
        calculateRescaler();
        break;
      case 'detector':
        switchMode('detector');
        if (dom.detectorPaperVal) dom.detectorPaperVal.value = snap.paperVal;
        if (dom.detectorPaperUnit) dom.detectorPaperUnit.value = snap.paperUnit;
        if (dom.detectorRealVal) dom.detectorRealVal.value = snap.realVal;
        if (dom.detectorRealUnit) dom.detectorRealUnit.value = snap.realUnit;
        calculateDetector();
        break;
      case 'area_volume':
        switchMode('area_volume');
        if (dom.areavolRatioInput) dom.areavolRatioInput.value = snap.ratio;
        if (dom.areavolInputVal) dom.areavolInputVal.value = snap.val;
        state.calcType = snap.type || 'area';
        state.calcDirection = snap.direction || 'drawing_to_real';
        updateAreaVolumeTypeUI();
        updateAreaVolumeDirUI();
        updateAreaVolumeUnitSelects();
        if (dom.areavolInputUnit) dom.areavolInputUnit.value = snap.inUnit;
        if (dom.areavolOutputUnit) dom.areavolOutputUnit.value = snap.outUnit;
        calculateAreaVolume();
        break;
      case 'furniture':
        switchMode('furniture');
        if (dom.customFurnName) dom.customFurnName.value = snap.name || 'Custom Piece';
        if (dom.customFurnW) dom.customFurnW.value = snap.w;
        if (dom.customFurnD) dom.customFurnD.value = snap.d;
        if (dom.customFurnUnit) dom.customFurnUnit.value = snap.unit || 'cm';
        if (dom.furnScaleRatioInput) dom.furnScaleRatioInput.value = snap.ratio || 50;
        if (dom.furnPaperUnitSelect) dom.furnPaperUnitSelect.value = snap.paperUnit || 'cm';
        calculateCustomFurniture();
        break;
      case 'workspace':
        switchMode('workspace');
        if (snap.scaleRatio) {
          state.workspace.scaleRatio = snap.scaleRatio;
        }
        if (snap.displayUnit) {
          state.workspace.displayUnit = snap.displayUnit;
        }
        renderWorkspace();
        break;
      case 'expression':
        switchMode('expression');
        if (dom.expressionInput) dom.expressionInput.value = snap.expression || item.inputStr || '';
        if (dom.expressionDefaultUnit && snap.defaultUnit) dom.expressionDefaultUnit.value = snap.defaultUnit;
        if (dom.expressionScaleSelect && snap.scaleRatio) {
          const ratioStr = String(snap.scaleRatio);
          if (dom.expressionScaleSelect.querySelector(`option[value="${ratioStr}"]`)) {
            dom.expressionScaleSelect.value = ratioStr;
            if (dom.expressionCustomScaleGroup) dom.expressionCustomScaleGroup.style.display = 'none';
          } else {
            dom.expressionScaleSelect.value = 'custom';
            if (dom.expressionCustomScaleGroup) dom.expressionCustomScaleGroup.style.display = 'block';
            if (dom.expressionCustomScaleInput) dom.expressionCustomScaleInput.value = snap.scaleRatio;
          }
        }
        calculateExpression(true);
        break;
      case 'chains':
        switchMode('chains');
        if (snap.name && dom.chainsNameInput) dom.chainsNameInput.value = snap.name;
        if (snap.scaleRatio && dom.chainsScaleSelect) dom.chainsScaleSelect.value = String(snap.scaleRatio);
        if (snap.defaultUnit && dom.chainsUnitSelect) dom.chainsUnitSelect.value = snap.defaultUnit;
        calculateAndRenderChain(true);
        break;
    }
    AudioService.playTick();
    showToast(`↺ Restored calculation into ${item.operation || item.mode}`);
    if (window.innerWidth <= 768) {
      toggleHistoryDrawer();
    }
  }

  function logCurrentCalculationToHistory(modeKey) {
    let entry = null;

    if (modeKey === 'converter') {
      const val = dom.converterResultVal?.textContent;
      const unit = dom.converterResultUnit?.textContent;
      const inputVal = dom.converterInputVal?.value;
      if (val && val !== '---' && inputVal) {
        const dirLabel = state.direction === 'drawing_to_real' ? 'Drawing Paper' : 'Real Site';
        const outDirLabel = state.direction === 'drawing_to_real' ? 'Real Site' : 'Drawing Paper';
        entry = {
          operation: 'Scale Converter',
          mode: 'Scale Converter',
          scaleRatio: state.scaleRatio,
          scaleStr: `1:${state.scaleRatio}`,
          inputStr: `${inputVal} ${state.converterInputUnit} (${dirLabel})`,
          outputStr: `${val} ${unit} (${outDirLabel})`,
          stateSnapshot: {
            modeKey: 'converter',
            ratio: state.scaleRatio,
            val: inputVal,
            inUnit: state.converterInputUnit,
            outUnit: state.converterOutputUnit,
            direction: state.direction
          }
        };
      }
    } else if (modeKey === 'rescale') {
      const val = dom.rescaleResultVal?.textContent;
      const unit = dom.rescaleResultUnit?.textContent;
      const origVal = dom.rescaleOrigVal?.value;
      if (val && val !== '---' && origVal) {
        entry = {
          operation: 'Rescaler',
          mode: 'Rescaler',
          scaleRatio: state.rescaleOrigRatio,
          scaleStr: `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
          inputStr: `${origVal} ${state.rescaleOrigUnit} (@ 1:${state.rescaleOrigRatio})`,
          outputStr: `${val} ${unit} (@ 1:${state.rescaleTargetRatio})`,
          stateSnapshot: {
            modeKey: 'rescale',
            origRatio: state.rescaleOrigRatio,
            origVal: origVal,
            origUnit: state.rescaleOrigUnit,
            targetRatio: state.rescaleTargetRatio,
            targetUnit: state.rescaleTargetUnit
          }
        };
      }
    } else if (modeKey === 'detector') {
      const ratioStr = dom.detectorRatioVal?.textContent;
      const paperVal = dom.detectorPaperVal?.value;
      const realVal = dom.detectorRealVal?.value;
      if (ratioStr && !ratioStr.includes('---') && paperVal && realVal) {
        entry = {
          operation: 'Scale Detector',
          mode: 'Scale Detector',
          scaleStr: ratioStr,
          inputStr: `Paper: ${paperVal} ${state.detectPaperUnit} | Real: ${realVal} ${state.detectRealUnit}`,
          outputStr: ratioStr,
          stateSnapshot: {
            modeKey: 'detector',
            paperVal: paperVal,
            paperUnit: state.detectPaperUnit,
            realVal: realVal,
            realUnit: state.detectRealUnit
          }
        };
      }
    } else if (modeKey === 'area_volume') {
      const val = dom.areavolResultVal?.textContent;
      const unit = dom.areavolResultUnit?.textContent;
      const inputVal = dom.areavolInputVal?.value;
      if (val && val !== '---' && inputVal) {
        const isArea = state.calcType === 'area';
        const typeLabel = isArea ? 'Area (S²)' : 'Volume (S³)';
        const dirLabel = state.calcDirection === 'drawing_to_real' ? 'Paper ➔ Site' : 'Site ➔ Paper';
        entry = {
          operation: `${typeLabel} (${dirLabel})`,
          mode: 'Area & Volume',
          scaleRatio: state.areavolRatio,
          scaleStr: `1:${state.areavolRatio}`,
          inputStr: `${inputVal} ${state.areavolInputUnit}`,
          outputStr: `${val} ${unit}`,
          stateSnapshot: {
            modeKey: 'area_volume',
            type: state.calcType,
            direction: state.calcDirection,
            ratio: state.areavolRatio,
            val: inputVal,
            inUnit: state.areavolInputUnit,
            outUnit: state.areavolOutputUnit
          }
        };
      }
    } else if (modeKey === 'furniture') {
      const w = dom.customFurnW?.value;
      const d = dom.customFurnD?.value;
      const val = dom.customFurnResult?.textContent;
      if (w && d && val && val !== '---') {
        const name = dom.customFurnName?.value || 'Custom Piece';
        entry = {
          operation: `Furniture: ${name}`,
          mode: 'Furniture Scales',
          scaleRatio: state.furnitureScaleRatio,
          scaleStr: `1:${state.furnitureScaleRatio}`,
          inputStr: `Real: ${w} × ${d} ${state.customFurnUnit}`,
          outputStr: `Paper: ${val}`,
          stateSnapshot: {
            modeKey: 'furniture',
            name: name,
            w: parseFloat(w),
            d: parseFloat(d),
            unit: state.customFurnUnit,
            ratio: state.furnitureScaleRatio,
            paperUnit: state.furniturePaperUnit
          }
        };
      }
    } else if (modeKey === 'workspace') {
      const totals = calculateWorkspaceTotals(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, state.precision);
      if (totals.validCount > 0) {
        entry = {
          operation: 'Dimension Schedule',
          mode: 'Dimension Workspace',
          scaleRatio: state.workspace.scaleRatio,
          scaleStr: `1:${state.workspace.scaleRatio}`,
          inputStr: `${totals.enabledCount} active measurements (${totals.totalRealFormatted})`,
          outputStr: `Drawing: ${totals.totalDrawingFormatted}`,
          stateSnapshot: {
            modeKey: 'workspace',
            scaleRatio: state.workspace.scaleRatio,
            displayUnit: state.workspace.displayUnit
          }
        };
      }
    } else if (modeKey === 'expression') {
      const res = state.lastValidExpression;
      if (res && res.isValid) {
        entry = {
          operation: 'Dimension Expression',
          mode: 'Dimension Expression',
          scaleRatio: res.scaleRatio,
          scaleStr: res.scaleRatio ? `1:${res.scaleRatio}` : '—',
          inputStr: res.expression,
          outputStr: `${res.formatted}${res.drawingFormatted ? ` (Drawing: ${res.drawingFormatted})` : ''}`,
          stateSnapshot: {
            modeKey: 'expression',
            expression: res.expression,
            scaleRatio: res.scaleRatio,
            defaultUnit: dom.expressionDefaultUnit?.value || 'mm'
          }
        };
      }
    } else if (modeKey === 'chains') {
      const calc = state.lastValidChain;
      if (calc && calc.isValid) {
        entry = {
          operation: 'Dimension Chain',
          mode: 'Dimension Chains',
          scaleRatio: calc.scaleRatio,
          scaleStr: `1:${calc.scaleRatio}`,
          inputStr: `${calc.name} (${calc.segmentCount} segments: ${calc.segments.map(s => s.lengthFormatted).join(' + ')})`,
          outputStr: `Overall: ${calc.overallExtentFormatted} (Drawing: ${calc.drawingOverallFormatted})`,
          stateSnapshot: {
            modeKey: 'chains',
            name: calc.name,
            scaleRatio: calc.scaleRatio,
            defaultUnit: calc.defaultUnit
          }
        };
      }
    }

    if (entry) {
      HistoryService.addEntry(entry);
      renderHistoryList();
      AudioService.playTick();
      showToast(`Saved ${entry.operation} to journal`);
    }
  }

  function toggleHistoryDrawer() {
    if (!dom.historyDrawer || !dom.historyOverlay) return;
    const isOpen = dom.historyDrawer.classList.contains('open');
    dom.historyDrawer.classList.toggle('open', !isOpen);
    dom.historyOverlay.classList.toggle('open', !isOpen);
    AudioService.playTick();
    if (!isOpen) renderHistoryList();
  }

  // ---------------------------------------------------------------------------
  // 13b. Mode 7: Dimension Workspace Controller (v1.1 Polish)
  // ---------------------------------------------------------------------------
  function saveWorkspace() {
    try {
      StorageService.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspace(state.workspace));
    } catch (e) {
      console.error('Failed to save dimension workspace:', e);
    }
  }

  function renderWorkspace() {
    if (!dom.workspaceTableBody && !dom.workspaceCardsList) return;

    const ws = state.workspace;
    const totals = calculateWorkspaceTotals(ws.entries, ws.scaleRatio, ws.displayUnit, state.precision);

    // 1. Sync Scale Select
    if (dom.workspaceScaleSelect) {
      const knownValues = ['1', '2', '5', '10', '20', '25', '50', '100', '200', '500', '1000'];
      if (knownValues.includes(String(ws.scaleRatio))) {
        dom.workspaceScaleSelect.value = String(ws.scaleRatio);
        if (dom.workspaceCustomScaleGroup) dom.workspaceCustomScaleGroup.style.display = 'none';
      } else {
        dom.workspaceScaleSelect.value = 'custom';
        if (dom.workspaceCustomScaleGroup) {
          dom.workspaceCustomScaleGroup.style.display = 'flex';
          if (dom.workspaceCustomScaleInput) dom.workspaceCustomScaleInput.value = ws.scaleRatio;
        }
      }
    }

    // 2. Sync Display Unit Select
    if (dom.workspaceUnitSelect) {
      dom.workspaceUnitSelect.value = ws.displayUnit;
    }

    // 3. Sync Quick Scale Chips
    if (dom.workspaceQuickChips) {
      dom.workspaceQuickChips.querySelectorAll('.scale-chip').forEach(chip => {
        const chipScale = parseFloat(chip.dataset.scale);
        chip.classList.toggle('active', chipScale === ws.scaleRatio);
      });
    }

    // 4. Sync Density Toggles
    if (dom.workspaceDensityStandard && dom.workspaceDensityCompact) {
      const isCompact = ws.density === 'compact';
      dom.workspaceDensityStandard.classList.toggle('active', !isCompact);
      dom.workspaceDensityCompact.classList.toggle('active', isCompact);
      if (dom.workspaceTable) dom.workspaceTable.classList.toggle('compact-mode', isCompact);
    }

    // 5. Update Table Column Header & Totals Labels
    if (dom.workspaceThDrawing) {
      dom.workspaceThDrawing.textContent = `Drawing @ 1:${ws.scaleRatio}`;
    }
    if (dom.workspaceTotalDrawingLabel) {
      dom.workspaceTotalDrawingLabel.textContent = `TOTAL DRAWING @ 1:${ws.scaleRatio}`;
    }

    // 6. Update Breakdown Badge & Selection Status
    if (dom.workspaceBreakdownBadge) {
      dom.workspaceBreakdownBadge.textContent = totals.breakdownLabel;
    }

    const selectedCount = state.workspaceSelectedIds.size;
    if (dom.workspaceSelectionStatus) {
      dom.workspaceSelectionStatus.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }
    if (dom.workspaceSelectionCount) {
      dom.workspaceSelectionCount.textContent = `${selectedCount} selected`;
    }
    if (dom.workspaceSelectAll) {
      dom.workspaceSelectAll.checked = ws.entries.length > 0 && ws.entries.every(e => state.workspaceSelectedIds.has(e.id));
    }

    // 7. Group indexing
    const groupMap = new Map((ws.groups || []).map(g => [g.id, g]));
    const collapsedGroupIds = new Set((ws.groups || []).filter(g => g.collapsed).map(g => g.id));

    // Render Table Rows (Desktop) & Cards (Mobile)
    let tableHtml = '';
    let cardsHtml = '';
    let currentGroupId = undefined;

    ws.entries.forEach((entry, index) => {
      const calc = calculateEntryValues(entry, ws.scaleRatio, ws.displayUnit, state.precision);
      const isInvalid = !calc.isValid;
      const isFirst = index === 0;
      const isLast = index === ws.entries.length - 1;
      const isSelected = state.workspaceSelectedIds.has(entry.id);
      const dimType = entry.dimensionType || DEFAULT_DIMENSION_TYPE;
      const badgeClass = dimType === 'segment' ? 'badge-seg' : (dimType === 'allowance' ? 'badge-alw' : 'badge-ref');
      const badgeLabel = dimType === 'segment' ? 'SEG' : (dimType === 'allowance' ? 'ALW' : 'REF');
      const groupObj = entry.groupId ? groupMap.get(entry.groupId) : null;

      // Check for group boundary header
      if (entry.groupId && entry.groupId !== currentGroupId) {
        currentGroupId = entry.groupId;
        const grp = groupObj || { id: entry.groupId, name: 'Group', collapsed: false };
        const grpTotals = calculateGroupTotals(ws.entries, grp.id, ws.scaleRatio, ws.displayUnit, state.precision);
        tableHtml += `
          <tr class="workspace-group-header" data-group-id="${grp.id}">
            <td colspan="10">
              <div class="group-title-wrap">
                <button type="button" class="group-collapse-btn ws-group-toggle" data-group-id="${grp.id}" title="${grp.collapsed ? 'Expand group' : 'Collapse group'}">
                  <span>${grp.collapsed ? '▶' : '▼'}</span>
                  <span>📁 ${escapeHtml(grp.name)}</span>
                  <small style="color: var(--text-muted); font-weight: normal;">(${grpTotals.totalCount} items)</small>
                </button>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="group-subtotal-badge">Segments: ${grpTotals.segmentRealFormatted} ➔ ${grpTotals.segmentDrawingFormatted}</span>
                  <button type="button" class="row-action-btn ws-ungroup-btn" data-group-id="${grp.id}" title="Remove all from group" style="font-size: 0.65rem;">Ungroup</button>
                </div>
              </div>
            </td>
          </tr>
        `;
      } else if (!entry.groupId && currentGroupId !== null) {
        currentGroupId = null;
      }

      // If entry belongs to a collapsed group, skip rendering in table/cards
      if (entry.groupId && collapsedGroupIds.has(entry.groupId)) {
        return;
      }

      // Inline Editing state
      const isEditingName = state.workspaceEditingCell?.id === entry.id && state.workspaceEditingCell?.field === 'name';
      const isEditingInput = state.workspaceEditingCell?.id === entry.id && state.workspaceEditingCell?.field === 'rawInput';
      const isEditingNotes = state.workspaceEditingCell?.id === entry.id && state.workspaceEditingCell?.field === 'notes';

      // Table Row
      tableHtml += `
        <tr class="${!entry.enabled ? 'row-disabled' : ''} ${isInvalid ? 'row-invalid' : ''} ${isSelected ? 'row-selected' : ''}" data-id="${entry.id}">
          <td style="text-align: center;">
            <input type="checkbox" class="ws-select-row-checkbox form-checkbox" data-id="${entry.id}" ${isSelected ? 'checked' : ''} title="Select row">
          </td>
          <td>
            <span class="type-badge ${badgeClass} ws-type-toggle" data-id="${entry.id}" title="Click to cycle type (Segment / Allowance / Reference)">${badgeLabel}</span>
          </td>
          <td class="cell-editable ws-cell-name" data-id="${entry.id}" data-field="name" title="Click to edit name">
            ${isEditingName ? `<input type="text" class="inline-edit-input ws-inline-input" data-id="${entry.id}" data-field="name" value="${escapeHtml(entry.name)}">` : `<strong class="ws-name-text">${escapeHtml(entry.name)}</strong>`}
          </td>
          <td class="cell-editable ws-cell-input" data-id="${entry.id}" data-field="rawInput" title="Click to edit measurement">
            ${isEditingInput ? `<input type="text" class="inline-edit-input ws-inline-input" data-id="${entry.id}" data-field="rawInput" value="${escapeHtml(entry.rawInput)}">` : `<span class="col-input-badge">${escapeHtml(entry.rawInput)}</span>`}
          </td>
          <td class="col-real">
            ${isInvalid ? `<span class="col-err" title="${escapeHtml(calc.errorMessage || 'Invalid')}">⚠️ ${escapeHtml(calc.errorMessage || 'Invalid')}</span>` : calc.realFormatted}
          </td>
          <td class="col-drawing">
            ${isInvalid ? '---' : calc.drawingFormatted}
          </td>
          <td>
            ${groupObj ? `<span class="col-group-tag" title="Group: ${escapeHtml(groupObj.name)}">${escapeHtml(groupObj.name)}</span>` : '<span style="color: var(--text-muted); font-size: 0.7rem;">—</span>'}
          </td>
          <td class="cell-editable ws-cell-notes" data-id="${entry.id}" data-field="notes" title="Click to edit notes">
            ${isEditingNotes ? `<input type="text" class="inline-edit-input ws-inline-input" data-id="${entry.id}" data-field="notes" value="${escapeHtml(entry.notes)}">` : `<span class="col-notes">${escapeHtml(entry.notes || '—')}</span>`}
          </td>
          <td style="text-align: center;">
            <input type="checkbox" class="ws-toggle-btn form-checkbox" data-id="${entry.id}" ${entry.enabled ? 'checked' : ''} title="${entry.enabled ? 'Disable row' : 'Enable row'}" aria-label="Toggle ${escapeHtml(entry.name)}">
          </td>
          <td>
            <div class="row-actions-group">
              <button type="button" class="row-action-btn ws-copy-row-btn" data-id="${entry.id}" title="Copy measurement">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
              </button>
              <button type="button" class="row-action-btn ws-dup-row-btn" data-id="${entry.id}" title="Duplicate row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button type="button" class="row-action-btn ws-up-row-btn" data-id="${entry.id}" ${isFirst ? 'disabled style="opacity: 0.3;"' : ''} title="Move up">↑</button>
              <button type="button" class="row-action-btn ws-down-row-btn" data-id="${entry.id}" ${isLast ? 'disabled style="opacity: 0.3;"' : ''} title="Move down">↓</button>
              <button type="button" class="row-action-btn danger ws-del-row-btn" data-id="${entry.id}" title="Delete row">✕</button>
            </div>
          </td>
        </tr>
      `;

      // Mobile Card
      cardsHtml += `
        <div class="dim-card ${!entry.enabled ? 'row-disabled' : ''} ${isInvalid ? 'row-invalid' : ''} ${isSelected ? 'row-selected' : ''}" data-id="${entry.id}">
          <div class="dim-card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="ws-select-row-checkbox form-checkbox" data-id="${entry.id}" ${isSelected ? 'checked' : ''} aria-label="Select ${escapeHtml(entry.name)}">
              <span class="type-badge ${badgeClass} ws-type-toggle" data-id="${entry.id}">${badgeLabel}</span>
              <span class="dim-card-title">${escapeHtml(entry.name)}</span>
            </div>
            <span class="col-input-badge">${escapeHtml(entry.rawInput)}</span>
          </div>
          <div class="dim-card-values">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800;">REAL WORLD</span>
              <span class="col-real" style="font-size: 0.95rem;">${isInvalid ? `⚠️ ${escapeHtml(calc.errorMessage || 'Invalid')}` : calc.realFormatted}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
              <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800;">DRAWING @ 1:${ws.scaleRatio}</span>
              <span class="col-drawing" style="font-size: 0.95rem;">${isInvalid ? '---' : calc.drawingFormatted}</span>
            </div>
          </div>
          ${entry.notes ? `<div style="font-size: 0.72rem; color: var(--text-secondary);">📝 ${escapeHtml(entry.notes)}</div>` : ''}
          <div class="dim-card-actions">
            <button type="button" class="row-action-btn ws-toggle-btn" data-id="${entry.id}">${entry.enabled ? 'Disable' : 'Enable'}</button>
            <button type="button" class="row-action-btn ws-copy-row-btn" data-id="${entry.id}" title="Copy value">Copy</button>
            <button type="button" class="row-action-btn ws-dup-row-btn" data-id="${entry.id}" title="Duplicate">Duplicate</button>
            <button type="button" class="row-action-btn ws-up-row-btn" data-id="${entry.id}" ${isFirst ? 'disabled' : ''}>↑</button>
            <button type="button" class="row-action-btn ws-down-row-btn" data-id="${entry.id}" ${isLast ? 'disabled' : ''}>↓</button>
            <button type="button" class="row-action-btn danger ws-del-row-btn" data-id="${entry.id}">Delete</button>
          </div>
        </div>
      `;
    });

    if (dom.workspaceTableBody) dom.workspaceTableBody.innerHTML = tableHtml;
    if (dom.workspaceCardsList) dom.workspaceCardsList.innerHTML = cardsHtml;

    // Toggle Empty State vs Table
    const isEmpty = ws.entries.length === 0;
    if (dom.workspaceEmptyState) dom.workspaceEmptyState.style.display = isEmpty ? 'flex' : 'none';
    if (dom.workspaceTable) dom.workspaceTable.style.display = isEmpty ? 'none' : 'table';

    // Update Multi-Metric Semantic Totals Display
    if (dom.workspaceActiveCount) {
      dom.workspaceActiveCount.textContent = `${totals.enabledCount} of ${totals.totalCount} active measurements`;
    }
    if (dom.workspaceTotalSegmentsReal) {
      dom.workspaceTotalSegmentsReal.textContent = totals.segmentRealFormatted;
    }
    if (dom.workspaceTotalSegmentsDrawing) {
      dom.workspaceTotalSegmentsDrawing.textContent = totals.segmentDrawingFormatted;
    }
    if (dom.workspaceTotalAllowancesReal) {
      dom.workspaceTotalAllowancesReal.textContent = totals.allowanceRealFormatted;
    }
    if (dom.workspaceTotalAllowancesDrawing) {
      dom.workspaceTotalAllowancesDrawing.textContent = totals.allowanceDrawingFormatted;
    }
    if (dom.workspaceTotalCombinedReal) {
      dom.workspaceTotalCombinedReal.textContent = totals.totalRealFormatted;
    }
    if (dom.workspaceTotalCombinedDrawing) {
      dom.workspaceTotalCombinedDrawing.textContent = totals.totalDrawingFormatted;
    }
    if (dom.workspaceTotalReferencesReal) {
      dom.workspaceTotalReferencesReal.textContent = totals.referenceRealFormatted;
    }
    if (dom.workspaceReferencesCountLabel) {
      dom.workspaceReferencesCountLabel.textContent = `${totals.referenceCount} reference items`;
    }

    // Backwards compatibility elements
    if (dom.workspaceTotalRealVal) dom.workspaceTotalRealVal.textContent = totals.totalRealFormatted;
    if (dom.workspaceTotalDrawingVal) dom.workspaceTotalDrawingVal.textContent = totals.totalDrawingFormatted;

    // Update State Badge
    if (dom.workspaceStateBadge) {
      if (totals.invalidCount > 0) {
        dom.workspaceStateBadge.className = 'state-badge state-error';
        dom.workspaceStateBadge.textContent = 'CORRECTION REQUIRED';
      } else {
        dom.workspaceStateBadge.className = 'state-badge state-ready';
        dom.workspaceStateBadge.textContent = 'READY';
      }
    }

    attachWorkspaceRowEvents();

    // Focus active inline input if editing
    if (state.workspaceEditingCell) {
      const inlineInput = dom.workspaceTableBody?.querySelector('.ws-inline-input');
      if (inlineInput) {
        inlineInput.focus();
        inlineInput.select();
      }
    }
  }

  function attachWorkspaceRowEvents() {
    // 1. Select Row Checkboxes
    document.querySelectorAll('.ws-select-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          state.workspaceSelectedIds.add(id);
        } else {
          state.workspaceSelectedIds.delete(id);
        }
        renderWorkspace();
      });
    });

    // 2. Type Badges Click to Cycle (reference -> segment -> allowance -> reference)
    document.querySelectorAll('.ws-type-toggle').forEach(badge => {
      badge.addEventListener('click', () => {
        const id = badge.dataset.id;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          const current = entry.dimensionType || DEFAULT_DIMENSION_TYPE;
          const next = current === 'reference' ? 'segment' : (current === 'segment' ? 'allowance' : 'reference');
          entry.dimensionType = next;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Set ${entry.name} type to ${next.toUpperCase()}`);
        }
      });
    });

    // 3. Group toggle collapse
    document.querySelectorAll('.ws-group-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const grpId = btn.dataset.groupId;
        const grp = (state.workspace.groups || []).find(g => g.id === grpId);
        if (grp) {
          grp.collapsed = !grp.collapsed;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 4. Ungroup all entries in group
    document.querySelectorAll('.ws-ungroup-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const grpId = btn.dataset.groupId;
        state.workspace.entries.forEach(e => {
          if (e.groupId === grpId) e.groupId = null;
        });
        state.workspace.groups = (state.workspace.groups || []).filter(g => g.id !== grpId);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast('Ungrouped entries');
      });
    });

    // 5. Inline Editing Cell Activation
    document.querySelectorAll('.cell-editable').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const id = cell.dataset.id;
        const field = cell.dataset.field;
        state.workspaceEditingCell = { id, field };
        renderWorkspace();
      });
    });

    // 6. Inline Input Event Handlers
    document.querySelectorAll('.ws-inline-input').forEach(input => {
      let isCommitted = false;
      const commitEdit = () => {
        if (isCommitted || !state.workspaceEditingCell) return;
        isCommitted = true;
        const { id, field } = state.workspaceEditingCell;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          const newVal = input.value.trim();
          if (field === 'rawInput') {
            const updated = updateDimensionEntry(entry, { rawInput: newVal });
            const idx = state.workspace.entries.findIndex(x => x.id === id);
            if (idx !== -1) state.workspace.entries[idx] = updated;
          } else if (field === 'name') {
            entry.name = newVal || 'Dimension';
          } else if (field === 'notes') {
            entry.notes = newVal;
          }
          saveWorkspace();
        }
        state.workspaceEditingCell = null;
        renderWorkspace();
        AudioService.playTick();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          isCommitted = true;
          state.workspaceEditingCell = null;
          renderWorkspace();
        }
      });

      input.addEventListener('blur', () => {
        commitEdit();
      });
    });

    // 7. Toggle on/off checkboxes
    document.querySelectorAll('.ws-toggle-btn').forEach(btn => {
      btn.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          entry.enabled = e.target.checked;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 8. Copy single row measurement
    document.querySelectorAll('.ws-copy-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const entry = state.workspace.entries.find(x => x.id === id);
        if (entry) {
          const calc = calculateEntryValues(entry, state.workspace.scaleRatio, state.workspace.displayUnit, state.precision);
          if (calc.isValid) {
            copyToClipboard(`${calc.realFormatted}`, `${entry.name} Real Dimension`);
          } else {
            showToast('Cannot copy invalid measurement', 'warning');
          }
        }
      });
    });

    // 9. Duplicate row
    document.querySelectorAll('.ws-dup-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx !== -1) {
          const dup = duplicateDimensionEntry(state.workspace.entries[idx]);
          state.workspace.entries.splice(idx + 1, 0, dup);
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Duplicated "${state.workspace.entries[idx].name}"`);
        }
      });
    });

    // 10. Move row up
    document.querySelectorAll('.ws-up-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx > 0) {
          const temp = state.workspace.entries[idx];
          state.workspace.entries[idx] = state.workspace.entries[idx - 1];
          state.workspace.entries[idx - 1] = temp;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 11. Move row down
    document.querySelectorAll('.ws-down-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx !== -1 && idx < state.workspace.entries.length - 1) {
          const temp = state.workspace.entries[idx];
          state.workspace.entries[idx] = state.workspace.entries[idx + 1];
          state.workspace.entries[idx + 1] = temp;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    });

    // 12. Delete row
    document.querySelectorAll('.ws-del-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const idx = state.workspace.entries.findIndex(x => x.id === id);
        if (idx !== -1) {
          const deletedName = state.workspace.entries[idx].name;
          state.workspace.entries.splice(idx, 1);
          state.workspaceSelectedIds.delete(id);
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Deleted "${deletedName}"`);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 13c. Global Architect Command Palette Controller (Ctrl+K / ⌘K)
  // ---------------------------------------------------------------------------
  let paletteQuery = '';
  let paletteSelectedIndex = 0;
  let paletteItems = [];
  let previousActiveElement = null;

  function openCommandPalette() {
    if (!dom.commandPaletteModal || !dom.commandPaletteOverlay) return;
    previousActiveElement = document.activeElement;
    dom.commandPaletteModal.classList.add('open');
    dom.commandPaletteOverlay.classList.add('open');
    paletteQuery = '';
    paletteSelectedIndex = 0;
    if (dom.commandPaletteInput) {
      dom.commandPaletteInput.value = '';
      dom.commandPaletteInput.focus();
    }
    renderCommandPalette('');
    AudioService.playTick();
  }

  function closeCommandPalette() {
    if (!dom.commandPaletteModal || !dom.commandPaletteModal.classList.contains('open')) return;
    dom.commandPaletteModal.classList.remove('open');
    dom.commandPaletteOverlay?.classList.remove('open');
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try { previousActiveElement.focus(); } catch (e) {}
    }
    AudioService.playTick();
  }

  function renderCommandPalette(query) {
    if (!dom.commandPaletteList) return;
    const searchData = CommandRegistry.searchCommands(query);
    paletteItems = [];
    let html = '';

    const isSearching = Boolean(query && query.trim() !== '');

    if (isSearching) {
      // 0a. Live Multi-Scale Command Detection (e.g. "compare 2400mm" or "2400mm")
      let compQuery = query.trim();
      const isCompareCommand = compQuery.toLowerCase().startsWith('compare ') || compQuery.toLowerCase().startsWith('scales ');
      if (isCompareCommand) {
        compQuery = compQuery.replace(/^(compare|scales)\s+/i, '').trim();
      }

      if (compQuery) {
        const parsedComp = parseMultiScaleInput(compQuery, {
          defaultUnit: state.workspace?.displayUnit || 'mm',
          precision: 2
        });
        if (parsedComp.isValid) {
          const s20 = calculateAtScale(parsedComp.canonicalMeters, 20, { displayUnit: parsedComp.displayUnit });
          const s50 = calculateAtScale(parsedComp.canonicalMeters, 50, { displayUnit: parsedComp.displayUnit });
          const s100 = calculateAtScale(parsedComp.canonicalMeters, 100, { displayUnit: parsedComp.displayUnit });
          const compItem = {
            id: 'multiscale-live-preview',
            title: `Compare scales: ${parsedComp.rawInput}`,
            description: `1:20 ➔ ${s20.formatted} | 1:50 ➔ ${s50.formatted} | 1:100 ➔ ${s100.formatted} • Open comparison →`,
            icon: '📊',
            shortcut: '↵ Open',
            available: true,
            isLiveMultiScale: true,
            action: () => {
              switchMode('multiscale');
              if (dom.multiscaleInput) {
                dom.multiscaleInput.value = compQuery;
                calculateMultiScale(true);
              }
            }
          };
          paletteItems.push(compItem);
          html += `<div class="command-section-header">📊 MULTI-SCALE COMPARISON PREVIEW</div>`;
          html += renderCommandItemHTML(compItem, paletteItems.length - 1);
        }
      }

      // 0b. Live Expression Detection Preview in Command Palette
      if (isExpressionLike(query)) {
        const liveCalc = evaluateExpressionSafe(query, {
          defaultUnit: state.workspace?.displayUnit || 'mm',
          scaleRatio: state.workspace?.scaleRatio || 50,
          precision: state.precision
        });
        if (liveCalc.isValid) {
          const exprItem = {
            id: 'expr-live-preview',
            title: `${query.trim()} = ${liveCalc.formatted}`,
            description: `Live Dimension Expression (Drawing: ${liveCalc.drawingFormatted || '---'} @ 1:50) • Press Enter to open in Expression Tool`,
            icon: '🧮',
            shortcut: '↵ Open',
            available: true,
            isLiveExpr: true,
            action: () => {
              switchMode('expression');
              if (dom.expressionInput) {
                dom.expressionInput.value = query.trim();
                calculateExpression(true);
              }
            }
          };
          paletteItems.push(exprItem);
          html += `<div class="command-section-header">🧮 LIVE DIMENSION MATH PREVIEW</div>`;
          html += renderCommandItemHTML(exprItem, paletteItems.length - 1);
        }
      }

      // 0c. Live Dimension Chain Detection (e.g. "chain 1200 1800 900" or "chain 1200+1800+900")
      let chainQuery = query.trim();
      const isChainCommand = chainQuery.toLowerCase().startsWith('chain ');
      if (isChainCommand) {
        chainQuery = chainQuery.slice(6).trim();
      }

      if (isChainCommand && chainQuery) {
        const segs = parseQuickChainInput(chainQuery, { defaultUnit: state.activeChain?.defaultUnit || 'mm' });
        if (segs.length > 0) {
          const tempChain = createDimensionChain({ name: 'Quick Chain', segments: segs, scaleRatio: state.activeChain?.scaleRatio || 50 });
          const calc = calculateChain(tempChain);
          if (calc.isValid) {
            const chainItem = {
              id: 'chain-live-preview',
              title: `Dimension Chain: ${calc.segmentCount} segments = ${calc.overallExtentFormatted}`,
              description: `Sequence: ${calc.segments.map(s => s.lengthFormatted).join(' ➔ ')} (Drawing @ 1:50: ${calc.drawingOverallFormatted}) • Open in Chains →`,
              icon: '🔗',
              shortcut: '↵ Open',
              available: true,
              isLiveChain: true,
              action: () => {
                switchMode('chains');
                if (dom.chainsQuickInput) {
                  dom.chainsQuickInput.value = chainQuery;
                  addSegmentsToChain(chainQuery);
                }
              }
            };
            paletteItems.push(chainItem);
            html += `<div class="command-section-header">🔗 LIVE DIMENSION CHAIN PREVIEW</div>`;
            html += renderCommandItemHTML(chainItem, paletteItems.length - 1);
          }
        }
      }

      if (searchData.results.length === 0 && paletteItems.length === 0) {
        html = `
          <div class="command-palette-empty">
            <div style="font-size: 1.4rem; margin-bottom: 0.35rem;">🔍</div>
            <div style="font-weight: 700; color: var(--text-primary);">No commands found</div>
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">No tools match "${escapeHtml(query)}"</div>
          </div>
        `;
      } else {
        if (searchData.results.length > 0) {
          html += `<div class="command-section-header">MATCHING COMMANDS (${searchData.results.length})</div>`;
          searchData.results.forEach(cmd => {
            paletteItems.push(cmd);
            html += renderCommandItemHTML(cmd, paletteItems.length - 1);
          });
        }
      }
    } else {
      // 1. Favorites
      const favs = CommandRegistry.getFavoriteCommands();
      if (favs.length > 0) {
        html += `<div class="command-section-header">★ FAVORITES (${favs.length})</div>`;
        favs.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1, true);
        });
      }

      // 2. Recent Commands
      const recents = CommandRegistry.getRecentCommands();
      if (recents.length > 0) {
        html += `<div class="command-section-header">RECENTLY USED (${recents.length})</div>`;
        recents.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }

      // 3. Navigation Tools
      const navCmds = CommandRegistry.getAllCommands().filter(c => c.category === 'Navigation');
      if (navCmds.length > 0) {
        html += `<div class="command-section-header">NAVIGATION TOOLS</div>`;
        navCmds.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }

      // 4. Utility Actions
      const utilCmds = CommandRegistry.getAllCommands().filter(c => c.category === 'Utility');
      if (utilCmds.length > 0) {
        html += `<div class="command-section-header">UTILITY ACTIONS</div>`;
        utilCmds.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }

      // 5. Upcoming Phase 2.5 Tools
      const upcomingCmds = CommandRegistry.getAllCommands().filter(c => !c.available);
      if (upcomingCmds.length > 0) {
        html += `<div class="command-section-header">UPCOMING ARCHITECT TOOLS (PHASE 2.5)</div>`;
        upcomingCmds.forEach(cmd => {
          paletteItems.push(cmd);
          html += renderCommandItemHTML(cmd, paletteItems.length - 1);
        });
      }
    }

    dom.commandPaletteList.innerHTML = html;

    if (paletteSelectedIndex >= paletteItems.length) {
      paletteSelectedIndex = Math.max(0, paletteItems.length - 1);
    }

    updatePaletteSelection(false);

    // Attach Click and Favorite Listeners
    dom.commandPaletteList.querySelectorAll('.command-item').forEach(el => {
      const idx = parseInt(el.dataset.index, 10);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.cmd-fav-btn')) return;
        if (paletteItems[idx]) executeCommand(paletteItems[idx]);
      });
      el.addEventListener('mouseenter', () => {
        paletteSelectedIndex = idx;
        updatePaletteSelection(false);
      });
    });

    dom.commandPaletteList.querySelectorAll('.cmd-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmdId = btn.dataset.id;
        CommandRegistry.toggleFavorite(cmdId);
        renderCommandPalette(paletteQuery);
        AudioService.playTick();
      });
    });
  }

  function renderCommandItemHTML(cmd, index) {
    const isFav = CommandRegistry.isFavorite(cmd.id);
    const isSelected = index === paletteSelectedIndex;
    const isUnavailable = !cmd.available;

    return `
      <div
        class="command-item ${isSelected ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''}"
        data-id="${cmd.id}"
        data-index="${index}"
        role="option"
        aria-selected="${isSelected ? 'true' : 'false'}"
      >
        <div class="command-item-left">
          <span class="command-icon">${cmd.icon || '⚡'}</span>
          <div class="command-text-group">
            <div class="command-title">
              <span>${cmd.title}</span>
              ${cmd.badge ? `<span class="command-badge ${isUnavailable ? 'badge-upcoming' : ''}">${cmd.badge}</span>` : ''}
            </div>
            <div class="command-desc">${cmd.description}</div>
          </div>
        </div>
        <div class="command-item-right">
          ${cmd.shortcut ? `<span class="command-shortcut-badge"><kbd>${cmd.shortcut}</kbd></span>` : ''}
          <button
            class="cmd-fav-btn ${isFav ? 'is-fav' : ''}"
            data-id="${cmd.id}"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
            aria-label="Toggle favorite"
          >
            ${isFav ? '★' : '☆'}
          </button>
        </div>
      </div>
    `;
  }

  function updatePaletteSelection(scrollIntoView = true) {
    const items = dom.commandPaletteList?.querySelectorAll('.command-item');
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const isSel = idx === paletteSelectedIndex;
      item.classList.toggle('selected', isSel);
      item.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel && scrollIntoView) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function executeCommand(cmd) {
    if (!cmd) return;

    if (!cmd.available) {
      showToast(`ℹ️ ${cmd.title} is an upcoming Phase 2.5 feature`, 'info');
      AudioService.playKeyClick();
      return;
    }

    CommandRegistry.addRecentCommand(cmd.id);
    closeCommandPalette();

    switch (cmd.id) {
      case 'nav-converter':
        switchMode('converter');
        break;
      case 'nav-rescale':
        switchMode('rescale');
        break;
      case 'nav-detector':
        switchMode('detector');
        break;
      case 'nav-areavol':
        switchMode('area_volume');
        break;
      case 'nav-furniture':
        switchMode('furniture');
        break;
      case 'nav-reference':
        switchMode('reference');
        break;
      case 'nav-workspace':
        switchMode('workspace');
        break;
      case 'nav-expression':
        switchMode('expression');
        break;
      case 'nav-multiscale':
        switchMode('multiscale');
        break;
      case 'nav-chains':
        switchMode('chains');
        break;
      case 'nav-cad-clipboard':
        switchMode('cad_clipboard');
        break;
      case 'nav-batch-cad':
        switchMode('batch_cad');
        break;
      case 'nav-history':
        toggleHistoryDrawer();
        break;
      case 'nav-shortcuts':
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
        break;
      case 'util-copy-result': {
        let val = null;
        let unit = '';
        if (state.currentMode === 'converter') {
          val = dom.converterResultVal?.textContent;
          unit = dom.converterResultUnit?.textContent || '';
        } else if (state.currentMode === 'rescale') {
          val = dom.rescaleResultVal?.textContent;
          unit = dom.rescaleResultUnit?.textContent || '';
        } else if (state.currentMode === 'detector') {
          val = dom.detectorRatioVal?.textContent;
        } else if (state.currentMode === 'area_volume') {
          val = dom.areavolResultVal?.textContent;
          unit = dom.areavolResultUnit?.textContent || '';
        } else if (state.currentMode === 'furniture') {
          val = dom.customFurnResult?.textContent;
        } else if (state.currentMode === 'workspace') {
          val = dom.workspaceTotalRealVal?.textContent;
          unit = '';
        } else if (state.currentMode === 'expression') {
          val = dom.expressionResultVal?.textContent;
          unit = dom.expressionResultUnit?.textContent || '';
        } else if (state.currentMode === 'multiscale') {
          if (state.lastValidMultiScale) {
            val = formatScaleComparison(state.lastValidMultiScale, 'table');
            unit = '';
          }
        } else if (state.currentMode === 'chains') {
          if (state.lastValidChain) {
            val = formatChainForClipboard(state.lastValidChain, 'table');
            unit = '';
          }
        }
        if (val && val !== '---') {
          copyToClipboard(`${val} ${unit}`.trim(), 'Active Result');
        } else {
          showToast('No active calculation result to copy', 'warning');
        }
        break;
      }
      case 'util-toggle-theme': {
        const themeOrder = ['dark', 'paper', 'blueprint'];
        const currentIdx = themeOrder.indexOf(state.activeTheme);
        const nextTheme = themeOrder[(currentIdx + 1) % themeOrder.length];
        applyTheme(nextTheme);
        if (dom.themeSelect) dom.themeSelect.value = nextTheme;
        showToast(`Theme switched to ${nextTheme.toUpperCase()}`);
        break;
      }
      case 'util-toggle-sound': {
        const newState = AudioService.toggleSound();
        updateSoundUI();
        showToast(newState ? '🔊 Tactile sound enabled' : '🔇 Sound muted');
        break;
      }
      case 'util-export-csv': {
        const csv = HistoryService.exportCSV();
        if (csv) {
          downloadFile(csv, `architecture-helping-hand-${Date.now()}.csv`, 'text/csv');
          showToast('Exported history as CSV');
        } else {
          showToast('History is empty', 'warning');
        }
        break;
      }
      case 'util-export-md': {
        const md = HistoryService.exportMarkdown();
        if (md) {
          copyToClipboard(md, 'Markdown History Table');
        } else {
          showToast('History is empty', 'warning');
        }
        break;
      }
      case 'util-clear-history': {
        HistoryService.clear();
        renderHistoryList();
        showToast('Calculation history cleared');
        break;
      }
      case 'util-quick-dim': {
        toggleQuickDimension(true);
        break;
      }
      default:
        if (typeof cmd.action === 'function') {
          cmd.action();
        }
        break;
    }

    AudioService.playTick();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // 13d. Mode 8: Dimension Expression Controller
  // ---------------------------------------------------------------------------
  function calculateExpression(isExplicitRun = false) {
    if (!dom.expressionInput) return;

    const rawExpr = dom.expressionInput.value.trim();
    const defaultUnit = dom.expressionDefaultUnit?.value || 'mm';
    let scaleRatio = 50;
    if (dom.expressionScaleSelect) {
      if (dom.expressionScaleSelect.value === 'custom') {
        scaleRatio = parseFloat(dom.expressionCustomScaleInput?.value) || 50;
      } else {
        scaleRatio = parseFloat(dom.expressionScaleSelect.value) || 50;
      }
    }

    // Empty input state
    if (rawExpr === '') {
      if (dom.expressionLivePreview) dom.expressionLivePreview.textContent = 'Live: Ready';
      if (dom.expressionErrorMsg) dom.expressionErrorMsg.style.display = 'none';
      if (dom.expressionResultVal) dom.expressionResultVal.textContent = '0';
      if (dom.expressionResultUnit) dom.expressionResultUnit.textContent = defaultUnit;
      if (dom.expressionDrawingVal) dom.expressionDrawingVal.textContent = `0 ${defaultUnit}`;
      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'ready'
      });
      return;
    }

    const evalResult = evaluateExpressionSafe(rawExpr, {
      defaultUnit,
      scaleRatio,
      precision: state.precision
    });

    if (evalResult.isValid) {
      state.lastValidExpression = evalResult;

      // Update Live Preview Pill
      if (dom.expressionLivePreview) {
        dom.expressionLivePreview.textContent = `Live: = ${evalResult.formatted}`;
        dom.expressionLivePreview.style.color = 'var(--text-accent)';
      }
      if (dom.expressionErrorMsg) dom.expressionErrorMsg.style.display = 'none';

      // Update Primary Result Value & Unit
      if (dom.expressionResultVal) dom.expressionResultVal.textContent = evalResult.formatted.replace(/\s*[a-zA-Z²³_"-]+$/, '') || evalResult.formatted;
      if (dom.expressionResultUnit) dom.expressionResultUnit.textContent = (evalResult.dimension === 'scalar') ? 'scalar count' : evalResult.displayUnit;

      // Update Dimension Badge
      if (dom.expressionDimBadge) {
        dom.expressionDimBadge.textContent = evalResult.dimension.toUpperCase();
        dom.expressionDimBadge.className = evalResult.dimension === 'scalar' ? 'type-badge badge-alw' : 'type-badge badge-seg';
      }

      // Update Drawing Scale Output
      if (dom.expressionDrawingLabel) {
        dom.expressionDrawingLabel.textContent = `Scale 1:${scaleRatio}`;
      }
      if (dom.expressionDrawingVal) {
        dom.expressionDrawingVal.textContent = evalResult.drawingFormatted || '---';
      }

      // Update Secondary Unit Equivalents
      if (dom.expressionSecondaryReadout && evalResult.secondaryFormatted.length > 0) {
        dom.expressionSecondaryReadout.innerHTML = evalResult.secondaryFormatted.map(sec => `
          <div class="secondary-item"><span class="sec-unit">${sec.unit}</span><span class="sec-val">${sec.formatted}</span></div>
        `).join('');
      } else if (dom.expressionSecondaryReadout && evalResult.dimension === 'scalar') {
        dom.expressionSecondaryReadout.innerHTML = `
          <div class="secondary-item"><span class="sec-unit">count</span><span class="sec-val">${evalResult.formatted}</span></div>
        `;
      }

      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'success'
      });

      if (isExplicitRun) {
        addRecentExpression(rawExpr, evalResult.formatted);
        AudioService.playTick();
      }
    } else {
      // Invalid or incomplete syntax
      if (dom.expressionLivePreview) {
        dom.expressionLivePreview.textContent = `Live: Incomplete`;
        dom.expressionLivePreview.style.color = 'var(--color-error)';
      }
      if (dom.expressionErrorMsg) {
        dom.expressionErrorMsg.textContent = `⚠️ ${evalResult.error.message}`;
        dom.expressionErrorMsg.style.display = 'block';
      }

      setUnifiedResultState({
        toolPrefix: 'expression',
        status: 'error',
        errorText: `⚠️ ${evalResult.error.message}`
      });
    }
  }

  function addRecentExpression(expr, formatted) {
    if (!state.recentExpressions) state.recentExpressions = [];
    // Prevent duplicate adjacent
    if (state.recentExpressions.length > 0 && state.recentExpressions[0].expr === expr) return;
    state.recentExpressions.unshift({ expr, formatted, time: Date.now() });
    if (state.recentExpressions.length > 10) state.recentExpressions.pop();
    renderRecentExpressions();
  }

  function renderRecentExpressions() {
    if (!dom.expressionRecentList) return;
    if (!state.recentExpressions || state.recentExpressions.length === 0) {
      dom.expressionRecentList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No recent expressions evaluated yet.</span>';
      return;
    }

    dom.expressionRecentList.innerHTML = state.recentExpressions.map(item => `
      <div class="recent-expr-item" data-expr="${escapeHtml(item.expr)}" title="Click to load expression">
        <span class="recent-expr-formula">${escapeHtml(item.expr)}</span>
        <span class="recent-expr-result">= ${escapeHtml(item.formatted)}</span>
      </div>
    `).join('');

    dom.expressionRecentList.querySelectorAll('.recent-expr-item').forEach(el => {
      el.addEventListener('click', () => {
        const expr = el.dataset.expr;
        if (dom.expressionInput) {
          dom.expressionInput.value = expr;
          calculateExpression(true);
          AudioService.playTick();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 13e. Mode 9: Multi-Scale Comparison Controller
  // ---------------------------------------------------------------------------
  function calculateMultiScale(isExplicitRun = false) {
    if (!dom.multiscaleInput) return;

    const rawInput = dom.multiscaleInput.value.trim();
    const defaultUnit = dom.multiscaleDefaultUnit?.value || 'mm';
    const displayUnit = dom.multiscaleDisplayUnit?.value || 'mm';
    const sortOrder = dom.multiscaleSortSelect?.value || 'ratio_asc';
    const paperSize = dom.multiscalePaperSelect?.value === 'none' ? null : dom.multiscalePaperSelect?.value;
    const minFit = dom.multiscaleFitMin?.value ? parseFloat(dom.multiscaleFitMin.value) : null;
    const maxFit = dom.multiscaleFitMax?.value ? parseFloat(dom.multiscaleFitMax.value) : null;

    // Determine scale ratios to compare
    let baseRatios = [];
    if (state.multiscaleGroup === 'favorites') {
      baseRatios = state.multiscaleFavorites && state.multiscaleFavorites.length > 0
        ? [...state.multiscaleFavorites]
        : [20, 50, 100];
    } else if (SCALE_PRESET_GROUPS[state.multiscaleGroup]) {
      baseRatios = [...SCALE_PRESET_GROUPS[state.multiscaleGroup]];
    } else {
      baseRatios = getDefaultComparisonScales();
    }

    // Merge custom scale ratios
    if (Array.isArray(state.multiscaleCustomScales)) {
      for (const cr of state.multiscaleCustomScales) {
        if (!baseRatios.includes(cr)) baseRatios.push(cr);
      }
    }

    // Empty input check
    if (rawInput === '') {
      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = 'Live: Ready';
        dom.multiscaleLivePreview.style.color = 'var(--text-muted)';
      }
      if (dom.multiscaleErrorMsg) dom.multiscaleErrorMsg.style.display = 'none';
      if (dom.multiscaleRealVal) dom.multiscaleRealVal.textContent = `0 ${displayUnit}`;
      if (dom.multiscaleCountBadge) dom.multiscaleCountBadge.textContent = '0 SCALES';
      if (dom.multiscaleTableBody) dom.multiscaleTableBody.innerHTML = '';
      if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'block';
      if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'none';
      setUnifiedResultState({ toolPrefix: 'multiscale', status: 'ready' });
      return;
    }

    const comparison = compareAcrossScales(rawInput, baseRatios, {
      defaultUnit,
      displayUnit,
      currentScaleRatio: state.scaleRatio || 50,
      sortOrder,
      paperSize,
      targetFitMinMm: minFit,
      targetFitMaxMm: maxFit,
      favoriteRatios: state.multiscaleFavorites,
      precision: state.precision
    });

    if (comparison.isValid) {
      state.lastValidMultiScale = comparison;

      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = `Live: = ${comparison.input.formattedReal}`;
        dom.multiscaleLivePreview.style.color = 'var(--text-accent)';
      }
      if (dom.multiscaleErrorMsg) dom.multiscaleErrorMsg.style.display = 'none';
      if (dom.multiscaleRealVal) dom.multiscaleRealVal.textContent = comparison.input.formattedReal;
      if (dom.multiscaleRealLabel) {
        dom.multiscaleRealLabel.textContent = comparison.input.isExpression
          ? `Evaluated: ${comparison.input.raw}`
          : `Real Dimension (${comparison.input.displayUnit})`;
      }
      if (dom.multiscaleCountBadge) {
        dom.multiscaleCountBadge.textContent = `${comparison.count} SCALES`;
      }

      renderMultiScaleTable(comparison);
      setUnifiedResultState({ toolPrefix: 'multiscale', status: 'success' });

      if (isExplicitRun) {
        AudioService.playTick();
      }
    } else {
      if (dom.multiscaleLivePreview) {
        dom.multiscaleLivePreview.textContent = `Live: Incomplete`;
        dom.multiscaleLivePreview.style.color = 'var(--color-error)';
      }
      if (dom.multiscaleErrorMsg) {
        dom.multiscaleErrorMsg.textContent = `⚠️ ${comparison.errorMessage}`;
        dom.multiscaleErrorMsg.style.display = 'block';
      }
      setUnifiedResultState({
        toolPrefix: 'multiscale',
        status: 'error',
        errorText: `⚠️ ${comparison.errorMessage}`
      });
    }
  }

  function renderMultiScaleTable(comparison) {
    if (!dom.multiscaleTableBody) return;

    if (!comparison || !comparison.isValid || comparison.scales.length === 0) {
      if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'block';
      if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'none';
      dom.multiscaleTableBody.innerHTML = '';
      return;
    }

    if (dom.multiscaleEmptyState) dom.multiscaleEmptyState.style.display = 'none';
    if (dom.multiscaleTableContainer) dom.multiscaleTableContainer.style.display = 'block';

    dom.multiscaleTableBody.innerHTML = comparison.scales.map(s => {
      const isFav = state.multiscaleFavorites && state.multiscaleFavorites.includes(s.ratio);
      let statusHtml = '';
      if (s.isCurrent) {
        statusHtml += `<span class="badge-current-scale">★ CURRENT</span> `;
      }
      if (s.fitStatus === 'suggested') {
        statusHtml += `<span class="badge-suggested-fit">✓ FIT</span> `;
      }
      if (s.fitsPaper === false) {
        statusHtml += `<span class="badge-sheet-exceed" title="Exceeds sheet width">⚠️ EXCEEDS</span> `;
      }

      return `
        <tr class="multiscale-row ${s.isCurrent ? 'is-current' : ''}">
          <td style="text-align: center;">
            <button type="button" class="scale-fav-btn ${isFav ? 'is-fav' : ''}" data-ratio="${s.ratio}" title="${isFav ? 'Remove from favorites' : 'Mark as favorite'}">
              ${isFav ? '★' : '☆'}
            </button>
          </td>
          <td>
            <strong style="font-family: var(--font-family-mono); color: var(--text-primary);">${escapeHtml(s.label)}</strong>
          </td>
          <td>
            <span style="font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-primary);">${escapeHtml(s.formatted)}</span>
          </td>
          <td class="multiscale-bar-cell">
            <div class="multiscale-bar-track" title="Drawing length at ${s.label}: ${s.formatted} (${s.barPercent}% of max)">
              <div class="multiscale-bar-fill" style="width: ${s.barPercent}%;"></div>
            </div>
          </td>
          <td>
            ${statusHtml || '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
          </td>
          <td style="text-align: right;">
            <button type="button" class="multiscale-row-action-btn ms-add-ws-btn" data-ratio="${s.ratio}" data-formatted="${escapeHtml(s.formatted)}" data-label="${escapeHtml(s.label)}" title="Add ${s.formatted} to Dimension Workspace">
              + WS
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row favorite toggles
    dom.multiscaleTableBody.querySelectorAll('.scale-fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        toggleScaleFavorite(ratio);
      });
    });

    // Attach row add-to-workspace buttons
    dom.multiscaleTableBody.querySelectorAll('.ms-add-ws-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ratio = parseFloat(btn.dataset.ratio);
        const formatted = btn.dataset.formatted;
        const label = btn.dataset.label;
        const rawDim = comparison.input.formattedReal;

        const entry = createDimensionEntry({
          name: `Scale ${label} (${rawDim})`,
          rawInput: formatted,
          dimensionType: 'reference',
          defaultUnit: comparison.input.displayUnit,
          notes: `Source: Multi-Scale Comparison (${label})`
        }, comparison.input.displayUnit);

        state.workspace.entries.push(entry);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast(`Added [REF] "Scale ${label}" (${formatted}) to Workspace`);
      });
    });
  }

  function toggleScaleFavorite(ratio) {
    if (!Array.isArray(state.multiscaleFavorites)) state.multiscaleFavorites = [];
    const idx = state.multiscaleFavorites.indexOf(ratio);
    if (idx >= 0) {
      state.multiscaleFavorites.splice(idx, 1);
      showToast(`Removed 1:${ratio} from favorites`);
    } else {
      state.multiscaleFavorites.push(ratio);
      showToast(`Saved 1:${ratio} to favorites`);
    }
    StorageService.setItem('archiscale_multiscale_favs', JSON.stringify(state.multiscaleFavorites));
    calculateMultiScale(false);
  }

  function addCustomScale(ratio) {
    if (isNaN(ratio) || ratio <= 0 || !isFinite(ratio)) {
      showToast('Enter a valid positive scale ratio (e.g. 33 for 1:33)', 'warning');
      return;
    }
    if (!Array.isArray(state.multiscaleCustomScales)) state.multiscaleCustomScales = [];
    if (!state.multiscaleCustomScales.includes(ratio)) {
      state.multiscaleCustomScales.push(ratio);
      showToast(`Added custom scale 1:${ratio}`);
      calculateMultiScale(true);
    } else {
      showToast(`Custom scale 1:${ratio} is already present`);
    }
  }

  // ---------------------------------------------------------------------------
  // 13f. Mode 10: Dimension Chains Controller
  // ---------------------------------------------------------------------------
  function saveChain() {
    if (state.activeChain) {
      StorageService.setItem(CHAIN_STORAGE_KEY, JSON.stringify(state.activeChain));
    }
  }

  function calculateAndRenderChain(isExplicitRun = false) {
    if (!state.activeChain) return;

    // Sync input fields to state.activeChain
    if (dom.chainsNameInput) state.activeChain.name = dom.chainsNameInput.value.trim() || 'Dimension Chain';
    if (dom.chainsScaleSelect) state.activeChain.scaleRatio = parseFloat(dom.chainsScaleSelect.value) || 50;
    if (dom.chainsUnitSelect) state.activeChain.defaultUnit = dom.chainsUnitSelect.value || 'mm';
    if (dom.chainsStartOffsetInput) state.activeChain.startOffsetRaw = dom.chainsStartOffsetInput.value.trim() || '0';
    if (dom.chainsEndOffsetInput) state.activeChain.endOffsetRaw = dom.chainsEndOffsetInput.value.trim() || '0';

    const calc = calculateChain(state.activeChain, {
      displayUnit: state.activeChain.defaultUnit,
      scaleRatio: state.activeChain.scaleRatio,
      precision: state.precision
    });

    state.lastValidChain = calc;

    // Update Result Hero and Breakdown Metrics
    if (dom.chainsOverallVal) dom.chainsOverallVal.textContent = calc.overallExtentFormatted;
    if (dom.chainsDrawingOverall) {
      dom.chainsDrawingOverall.textContent = `Drawing @ 1:${calc.scaleRatio}: ${calc.drawingOverallFormatted}`;
    }
    if (dom.chainsCountBadge) {
      dom.chainsCountBadge.textContent = `${calc.segmentCount} SEGMENTS`;
    }
    if (dom.chainsSegTotalVal) dom.chainsSegTotalVal.textContent = calc.segmentTotalFormatted;
    if (dom.chainsAlwTotalVal) dom.chainsAlwTotalVal.textContent = calc.allowanceTotalFormatted;
    if (dom.chainsStartOffsetVal) dom.chainsStartOffsetVal.textContent = calc.startOffsetFormatted;
    if (dom.chainsEndOffsetVal) dom.chainsEndOffsetVal.textContent = calc.endOffsetFormatted;

    // Update Live Input Preview
    if (dom.chainsQuickInput) {
      const quickVal = dom.chainsQuickInput.value.trim();
      if (quickVal) {
        const segs = parseQuickChainInput(quickVal, { defaultUnit: state.activeChain.defaultUnit });
        if (segs.length > 0) {
          dom.chainsLivePreview.textContent = `Live: +${segs.length} segment(s)`;
          dom.chainsLivePreview.style.color = 'var(--text-accent)';
        }
      } else {
        dom.chainsLivePreview.textContent = 'Live: Ready';
        dom.chainsLivePreview.style.color = 'var(--text-muted)';
      }
    }

    // Render SVG Visualizer and Schedule Table
    renderChainSVGView(calc);
    renderChainTable(calc);
    updateSelectedSegmentInspector(calc);

    setUnifiedResultState({
      toolPrefix: 'chains',
      status: calc.isValid ? 'success' : (calc.invalidCount > 0 ? 'error' : 'ready'),
      errorText: calc.invalidCount > 0 ? `⚠️ ${calc.invalidCount} segment(s) have invalid measurement inputs` : ''
    });

    saveChain();

    if (isExplicitRun) {
      AudioService.playTick();
    }
  }

  function renderChainSVGView(calc) {
    if (!dom.chainsSvgViewportWrapper) return;
    const svgMarkup = generateChainSVG(calc, {
      selectedSegmentId: state.chainSelectedSegmentId,
      svgWidth: 860,
      svgHeight: 180
    });
    dom.chainsSvgViewportWrapper.innerHTML = svgMarkup;
  }

  function updateSelectedSegmentInspector(calc) {
    if (!dom.chainsSelectedInspector) return;

    if (!state.chainSelectedSegmentId) {
      dom.chainsSelectedInspector.style.display = 'none';
      return;
    }

    const seg = (calc.segments || []).find(s => s.id === state.chainSelectedSegmentId);
    if (!seg) {
      dom.chainsSelectedInspector.style.display = 'none';
      return;
    }

    dom.chainsSelectedInspector.style.display = 'flex';
    if (dom.chainsInspectorName) dom.chainsInspectorName.textContent = seg.name;
    if (dom.chainsInspectorLen) dom.chainsInspectorLen.textContent = seg.lengthFormatted;
    if (dom.chainsInspectorStart) dom.chainsInspectorStart.textContent = seg.startFormatted;
    if (dom.chainsInspectorEnd) dom.chainsInspectorEnd.textContent = seg.endFormatted;
    if (dom.chainsInspectorDraw) dom.chainsInspectorDraw.textContent = seg.drawingFormatted;
  }

  function renderChainTable(calc) {
    if (!dom.chainsTableBody) return;

    if (!calc.segments || calc.segments.length === 0) {
      dom.chainsTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic;">
            No segments in this dimension chain. Type numbers above (e.g. 1200 + 1800 + 900) or pick a template to get started.
          </td>
        </tr>
      `;
      return;
    }

    dom.chainsTableBody.innerHTML = calc.segments.map((seg, idx) => {
      const isSelected = seg.id === state.chainSelectedSegmentId;
      const typeBadgeClass = seg.dimensionType === 'reference'
        ? 'badge-role-ref'
        : seg.dimensionType === 'allowance'
        ? 'badge-role-alw'
        : 'badge-role-seg';

      const typeShortLabel = seg.dimensionType === 'reference'
        ? 'REF'
        : seg.dimensionType === 'allowance'
        ? 'ALW'
        : 'SEG';

      return `
        <tr class="chain-row ${isSelected ? 'is-selected' : ''}" data-id="${seg.id}" data-index="${idx}">
          <td style="text-align: center; font-family: var(--font-family-mono); font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="text-align: center;">
            <input type="checkbox" class="chain-toggle-chk" data-index="${idx}" ${seg.enabled !== false ? 'checked' : ''} title="Toggle segment enable/disable" />
          </td>
          <td>
            <input type="text" class="chain-inline-name" data-index="${idx}" value="${escapeHtml(seg.name)}" placeholder="Name" style="background: transparent; border: 1px solid transparent; width: 100%; font-weight: 600; color: var(--text-primary);" />
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${seg.startFormatted}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${seg.endFormatted}</td>
          <td>
            <input type="text" class="chain-inline-input" data-index="${idx}" value="${escapeHtml(seg.rawInput)}" style="background: transparent; border: 1px solid var(--border-color-light); border-radius: 3px; padding: 2px 4px; width: 90px; font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-primary);" />
          </td>
          <td style="text-align: center;">
            <button type="button" class="dim-type-badge ${typeBadgeClass} chain-type-cycle-btn" data-index="${idx}" title="Click to cycle type (SEG ➔ REF ➔ ALW)">
              ${typeShortLabel}
            </button>
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">${seg.drawingFormatted}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="chain-reorder-btn chain-move-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move segment up">↑</button>
            <button type="button" class="chain-reorder-btn chain-move-down" data-index="${idx}" ${idx === calc.segments.length - 1 ? 'disabled' : ''} title="Move segment down">↓</button>
          </td>
          <td style="text-align: center;">
            <button type="button" class="chain-row-del-btn" data-index="${idx}" title="Delete segment">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row selection click listeners
    dom.chainsTableBody.querySelectorAll('.chain-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        const id = row.dataset.id;
        selectChainSegment(state.chainSelectedSegmentId === id ? null : id);
      });
    });

    // Toggle segment enabled checkbox
    dom.chainsTableBody.querySelectorAll('.chain-toggle-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].enabled = e.target.checked;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Inline name edit
    dom.chainsTableBody.querySelectorAll('.chain-inline-name').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].name = e.target.value.trim() || `Segment ${idx + 1}`;
          calculateAndRenderChain(false);
        }
      });
    });

    // Inline measurement edit
    dom.chainsTableBody.querySelectorAll('.chain-inline-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          state.activeChain.segments[idx].rawInput = e.target.value.trim();
          calculateAndRenderChain(true);
        }
      });
    });

    // Cycle type button
    dom.chainsTableBody.querySelectorAll('.chain-type-cycle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          const curType = state.activeChain.segments[idx].dimensionType;
          const nextType = curType === 'segment' ? 'reference' : (curType === 'reference' ? 'allowance' : 'segment');
          state.activeChain.segments[idx].dimensionType = nextType;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Move Up / Down buttons
    dom.chainsTableBody.querySelectorAll('.chain-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx > 0) {
          const temp = state.activeChain.segments[idx];
          state.activeChain.segments[idx] = state.activeChain.segments[idx - 1];
          state.activeChain.segments[idx - 1] = temp;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    dom.chainsTableBody.querySelectorAll('.chain-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx < state.activeChain.segments.length - 1) {
          const temp = state.activeChain.segments[idx];
          state.activeChain.segments[idx] = state.activeChain.segments[idx + 1];
          state.activeChain.segments[idx + 1] = temp;
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });

    // Delete segment button
    dom.chainsTableBody.querySelectorAll('.chain-row-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (state.activeChain.segments[idx]) {
          const delId = state.activeChain.segments[idx].id;
          if (state.chainSelectedSegmentId === delId) state.chainSelectedSegmentId = null;
          state.activeChain.segments.splice(idx, 1);
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    });
  }

  function selectChainSegment(id) {
    state.chainSelectedSegmentId = id;
    if (state.lastValidChain) {
      renderChainSVGView(state.lastValidChain);
      updateSelectedSegmentInspector(state.lastValidChain);
      // Highlight row in table
      dom.chainsTableBody?.querySelectorAll('.chain-row').forEach(row => {
        row.classList.toggle('is-selected', row.dataset.id === id);
      });
    }
  }

  function addSegmentsToChain(rawStr) {
    if (!rawStr || typeof rawStr !== 'string' || !rawStr.trim()) return;
    const newSegs = parseQuickChainInput(rawStr.trim(), { defaultUnit: state.activeChain.defaultUnit });
    if (newSegs.length > 0) {
      if (!Array.isArray(state.activeChain.segments)) state.activeChain.segments = [];
      state.activeChain.segments.push(...newSegs);
      calculateAndRenderChain(true);
      AudioService.playTick();
      showToast(`Added ${newSegs.length} segment(s) to chain`);
    }
  }

  function loadChainTemplate(templateKey) {
    const tpl = CHAIN_TEMPLATES[templateKey];
    if (!tpl) return;
    state.activeChain = createDimensionChain({
      name: tpl.name,
      defaultUnit: tpl.defaultUnit || 'mm',
      scaleRatio: state.activeChain?.scaleRatio || 50,
      segments: tpl.segments.map(s => createChainSegment(s, tpl.defaultUnit || 'mm'))
    });
    if (dom.chainsNameInput) dom.chainsNameInput.value = state.activeChain.name;
    if (dom.chainsUnitSelect) dom.chainsUnitSelect.value = state.activeChain.defaultUnit;
    state.chainSelectedSegmentId = null;
    calculateAndRenderChain(true);
    AudioService.playTick();
    showToast(`Loaded "${tpl.name}" template`);
  }

  // ---------------------------------------------------------------------------
  // 13g. Mode 11: CAD Clipboard Controller
  // ---------------------------------------------------------------------------
  function saveCadClipboardSettings() {
    try {
      StorageService.setItem(CAD_STORAGE_KEY, JSON.stringify(state.cadClipboard));
    } catch (e) {}
  }

  function applyCadPreset(presetKey) {
    const preset = CAD_FORMAT_PRESETS[presetKey];
    if (!preset) return;

    state.cadClipboard.preset = presetKey;
    state.cadClipboard.unit = preset.defaultUnit;
    state.cadClipboard.precision = preset.defaultPrecision;
    state.cadClipboard.suffix = preset.defaultSuffix;
    state.cadClipboard.delimiter = preset.defaultDelimiter;
    state.cadClipboard.targetValue = preset.targetValue;

    // Sync UI elements
    if (dom.cadTargetSelect) dom.cadTargetSelect.value = state.cadClipboard.targetValue;
    if (dom.cadUnitSelect) dom.cadUnitSelect.value = state.cadClipboard.unit;
    if (dom.cadPrecisionSelect) dom.cadPrecisionSelect.value = String(state.cadClipboard.precision);
    if (dom.cadSuffixSelect) dom.cadSuffixSelect.value = state.cadClipboard.suffix;
    if (dom.cadDelimiterSelect) dom.cadDelimiterSelect.value = state.cadClipboard.delimiter;

    // Sync active chip
    dom.cadQuickChips?.querySelectorAll('.cad-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === presetKey);
    });

    renderCadClipboard(true);
    AudioService.playTick();
    showToast(`Loaded preset "${preset.name}"`);
  }

  function renderCadClipboard(isExplicitRun = false) {
    const cad = state.cadClipboard;

    // Sync form values into state
    if (dom.cadTargetSelect) cad.targetValue = dom.cadTargetSelect.value || 'real';
    if (dom.cadUnitSelect) cad.unit = dom.cadUnitSelect.value || 'mm';
    if (dom.cadPrecisionSelect) cad.precision = parseInt(dom.cadPrecisionSelect.value, 10) || 0;
    if (dom.cadSuffixSelect) cad.suffix = dom.cadSuffixSelect.value || 'none';
    if (dom.cadDelimiterSelect) cad.delimiter = dom.cadDelimiterSelect.value || 'space';
    if (dom.cadScopeSelect) cad.filterScope = dom.cadScopeSelect.value || 'all';

    // Show/hide manual input group
    if (dom.cadManualGroup) {
      dom.cadManualGroup.style.display = cad.source === 'manual' ? 'block' : 'none';
    }

    // Sync active source pill
    dom.cadSourcePills?.querySelectorAll('.cad-source-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.source === cad.source);
    });

    // Sync active preset chip
    dom.cadQuickChips?.querySelectorAll('.cad-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === cad.preset);
    });

    let outputResult = { text: '', count: 0 };

    if (cad.source === 'workspace') {
      outputResult = formatCadWorkspace(state.workspace, {
        filterScope: cad.filterScope,
        selectedIds: state.workspaceSelectedIds,
        targetValue: cad.targetValue,
        format: cad.preset,
        unit: cad.unit,
        precision: cad.precision,
        suffix: cad.suffix,
        delimiter: cad.delimiter,
        scaleRatio: state.workspace?.scaleRatio || 50
      });
    } else if (cad.source === 'chain') {
      if (state.lastValidChain) {
        outputResult = formatCadChain(state.lastValidChain, {
          chainOutputMode: cad.preset === 'spreadsheet' ? 'table' : 'segments',
          targetValue: cad.targetValue,
          unit: cad.unit,
          precision: cad.precision,
          suffix: cad.suffix,
          delimiter: cad.delimiter
        });
      }
    } else if (cad.source === 'expression') {
      if (state.lastValidExpression) {
        outputResult = formatCadExpression(state.lastValidExpression, {
          targetValue: cad.targetValue,
          unit: cad.unit,
          precision: cad.precision,
          suffix: cad.suffix
        });
      }
    } else if (cad.source === 'multiscale') {
      if (state.lastValidMultiScale) {
        outputResult = formatCadMultiScale(state.lastValidMultiScale, {
          format: cad.preset,
          unit: cad.unit,
          precision: cad.precision,
          suffix: cad.suffix,
          delimiter: cad.delimiter
        });
      }
    } else if (cad.source === 'manual') {
      const raw = dom.cadManualInput?.value || cad.manualInput || '';
      outputResult = formatManualCadInput(raw, {
        unit: cad.unit,
        precision: cad.precision,
        suffix: cad.suffix,
        delimiter: cad.delimiter
      });
    }

    cad.lastFormattedText = outputResult.text;

    // Update Preview Textarea
    if (dom.cadPreviewBox) {
      dom.cadPreviewBox.value = outputResult.text;
    }

    // Update Summary Metadata Tag
    if (dom.cadSummaryBadge) {
      dom.cadSummaryBadge.textContent = getCadFormatSummary(outputResult.count, {
        targetValue: cad.targetValue,
        unit: cad.unit,
        precision: cad.precision,
        suffix: cad.suffix
      });
    }

    // Update Item Count Badge in Source Strip
    if (dom.cadSourceCountBadge) {
      dom.cadSourceCountBadge.textContent = `${outputResult.count} ${outputResult.count === 1 ? 'ITEM' : 'ITEMS'}`;
    }

    setUnifiedResultState({
      toolPrefix: 'cad',
      status: outputResult.count > 0 ? 'success' : 'ready'
    });

    saveCadClipboardSettings();

    if (isExplicitRun) {
      AudioService.playTick();
    }
  }

  function copyCadClipboardData(optionsOverride = null) {
    let textToCopy = state.cadClipboard.lastFormattedText;

    if (optionsOverride && typeof optionsOverride === 'object') {
      const mergedOpts = { ...state.cadClipboard, ...optionsOverride };
      if (state.cadClipboard.source === 'workspace') {
        textToCopy = formatCadWorkspace(state.workspace, mergedOpts).text;
      } else if (state.cadClipboard.source === 'chain') {
        textToCopy = formatCadChain(state.lastValidChain, mergedOpts).text;
      } else if (state.cadClipboard.source === 'expression') {
        textToCopy = formatCadExpression(state.lastValidExpression, mergedOpts).text;
      } else if (state.cadClipboard.source === 'multiscale') {
        textToCopy = formatCadMultiScale(state.lastValidMultiScale, mergedOpts).text;
      } else if (state.cadClipboard.source === 'manual') {
        textToCopy = formatManualCadInput(dom.cadManualInput?.value || '', mergedOpts).text;
      }
    }

    if (!textToCopy || !textToCopy.trim()) {
      showToast('No CAD dimension data to copy', 'warning');
      return;
    }

    copyToClipboard(textToCopy, 'CAD Dimension Data');
  }

  function openCadClipboardWithSource(sourceKey) {
    state.cadClipboard.source = sourceKey;
    switchMode('cad_clipboard');
    renderCadClipboard(true);
    AudioService.playTick();
    showToast(`Loaded ${sourceKey.toUpperCase()} data into CAD Clipboard`);
  }

  // ---------------------------------------------------------------------------
  // 13h. Mode 12: Batch CAD Conversion Controller
  // ---------------------------------------------------------------------------
  function saveBatchCadSettings() {
    try {
      const serializable = {
        ...state.batchCad,
        selectedIds: Array.from(state.batchCad.selectedIds)
      };
      StorageService.setItem(BATCH_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {}
  }

  function updateBatchModeVisibility() {
    const mode = dom.batchModeSelect?.value || state.batchCad.mode;
    if (dom.batchSourceScaleGroup) {
      dom.batchSourceScaleGroup.style.display = (mode === 'drawing_to_real' || mode === 'scale_to_scale') ? 'block' : 'none';
    }
    if (dom.batchTargetScaleGroup) {
      dom.batchTargetScaleGroup.style.display = (mode === 'real_to_drawing' || mode === 'scale_to_scale') ? 'block' : 'none';
    }
  }

  function applyBatchPreset(presetKey) {
    const preset = BATCH_PRESETS[presetKey];
    if (!preset) return;

    state.batchCad.mode = preset.mode;
    state.batchCad.sourceUnit = preset.sourceUnit;
    state.batchCad.sourceScale = preset.sourceScale;
    state.batchCad.targetUnit = preset.targetUnit;
    state.batchCad.targetScale = preset.targetScale;
    state.batchCad.precision = preset.precision;

    // Sync dropdowns
    if (dom.batchModeSelect) dom.batchModeSelect.value = preset.mode;
    if (dom.batchSourceUnitSelect) dom.batchSourceUnitSelect.value = preset.sourceUnit;
    if (dom.batchSourceScaleSelect) dom.batchSourceScaleSelect.value = String(preset.sourceScale);
    if (dom.batchTargetUnitSelect) dom.batchTargetUnitSelect.value = preset.targetUnit;
    if (dom.batchTargetScaleSelect) dom.batchTargetScaleSelect.value = String(preset.targetScale);
    if (dom.batchPrecisionSelect) dom.batchPrecisionSelect.value = String(preset.precision);

    // Sync active chip
    dom.batchQuickChips?.querySelectorAll('.cad-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === presetKey);
    });

    updateBatchModeVisibility();
    parseAndConvertBatch(true);
    AudioService.playTick();
    showToast(`Loaded preset "${preset.name}"`);
  }

  function parseAndConvertBatch(isExplicitRun = false) {
    const batch = state.batchCad;

    // Sync parameters from DOM
    if (dom.batchPasteInput) batch.rawInput = dom.batchPasteInput.value;
    if (dom.batchModeSelect) batch.mode = dom.batchModeSelect.value || 'real_to_drawing';
    if (dom.batchSourceUnitSelect) batch.sourceUnit = dom.batchSourceUnitSelect.value || 'mm';
    if (dom.batchSourceScaleSelect) batch.sourceScale = parseInt(dom.batchSourceScaleSelect.value, 10) || 50;
    if (dom.batchTargetUnitSelect) batch.targetUnit = dom.batchTargetUnitSelect.value || 'mm';
    if (dom.batchTargetScaleSelect) batch.targetScale = parseInt(dom.batchTargetScaleSelect.value, 10) || 50;
    if (dom.batchPrecisionSelect) batch.precision = parseInt(dom.batchPrecisionSelect.value, 10) || 2;
    if (dom.batchDelimiterSelect) batch.delimiter = dom.batchDelimiterSelect.value || 'auto';

    updateBatchModeVisibility();

    const raw = (batch.rawInput || '').trim();
    if (!raw) {
      batch.lastResult = { rows: [], summary: { totalRows: 0, validRows: 0, invalidRows: 0, convertedRows: 0 } };
      renderBatchResults();
      setUnifiedResultState({ toolPrefix: 'batch', status: 'ready' });
      return;
    }

    const detected = detectBatchDelimiter(raw);
    if (dom.batchDelimiterBadge) {
      dom.batchDelimiterBadge.textContent = `FORMAT: ${detected.toUpperCase()}`;
    }

    const parsed = parseBatchInput(raw, {
      delimiter: batch.delimiter,
      defaultUnit: batch.sourceUnit,
      defaultScale: batch.sourceScale
    });

    const converted = convertBatch(parsed.rows, {
      mode: batch.mode,
      sourceUnit: batch.sourceUnit,
      sourceScale: batch.sourceScale,
      targetUnit: batch.targetUnit,
      targetScale: batch.targetScale,
      precision: batch.precision
    });

    batch.lastResult = converted;

    renderBatchResults();

    setUnifiedResultState({
      toolPrefix: 'batch',
      status: converted.summary.invalidRows > 0 ? (converted.summary.validRows > 0 ? 'success' : 'error') : 'success'
    });

    saveBatchCadSettings();

    if (isExplicitRun) {
      AudioService.playTick();
      showToast(`Batch converted ${converted.summary.validRows} of ${converted.summary.totalRows} rows`);
    }
  }

  function renderBatchResults() {
    const batch = state.batchCad;
    const result = batch.lastResult || { rows: [], summary: { totalRows: 0, validRows: 0, invalidRows: 0, convertedRows: 0 } };
    const rows = result.rows || [];
    const summary = result.summary || { totalRows: 0, validRows: 0, invalidRows: 0, convertedRows: 0 };

    // Update Summary Metrics
    if (dom.batchMetricTotal) dom.batchMetricTotal.textContent = `${summary.totalRows} ${summary.totalRows === 1 ? 'ROW' : 'ROWS'}`;
    if (dom.batchMetricValid) dom.batchMetricValid.textContent = `${summary.validRows} VALID`;
    if (dom.batchMetricInvalid) {
      dom.batchMetricInvalid.textContent = `${summary.invalidRows} INVALID`;
      dom.batchMetricInvalid.style.display = summary.invalidRows > 0 ? 'inline-flex' : 'none';
    }

    // Update Filter Counts
    const validCount = rows.filter(r => r.valid).length;
    const invalidCount = rows.filter(r => !r.valid).length;
    const selectedCount = rows.filter(r => batch.selectedIds.has(r.id)).length;

    if (dom.filterCountAll) dom.filterCountAll.textContent = String(rows.length);
    if (dom.filterCountValid) dom.filterCountValid.textContent = String(validCount);
    if (dom.filterCountInvalid) dom.filterCountInvalid.textContent = String(invalidCount);
    if (dom.filterCountSelected) dom.filterCountSelected.textContent = String(selectedCount);

    // Empty State vs Table
    if (rows.length === 0) {
      if (dom.batchTable) dom.batchTable.style.display = 'none';
      if (dom.batchEmptyState) dom.batchEmptyState.style.display = 'block';
      if (dom.batchTableBody) dom.batchTableBody.innerHTML = '';
      return;
    }

    if (dom.batchTable) dom.batchTable.style.display = 'table';
    if (dom.batchEmptyState) dom.batchEmptyState.style.display = 'none';

    // Filter Rows
    const filteredRows = filterBatchRows(rows, batch.activeFilter, batch.selectedIds);

    // Master Checkbox State
    if (dom.batchMasterCheckbox) {
      dom.batchMasterCheckbox.checked = rows.length > 0 && selectedCount === rows.length;
      dom.batchMasterCheckbox.indeterminate = selectedCount > 0 && selectedCount < rows.length;
    }

    // Render Table Body via DocumentFragment for High Performance
    if (dom.batchTableBody) {
      const fragment = document.createDocumentFragment();

      filteredRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = `batch-row ${row.valid ? '' : 'is-invalid'} ${batch.selectedIds.has(row.id) ? 'is-selected' : ''}`;
        tr.dataset.id = row.id;

        const roleTag = row.semanticRole === 'segment' ? 'SEG' : (row.semanticRole === 'allowance' ? 'ALW' : 'REF');
        const roleBadgeClass = row.semanticRole === 'segment' ? 'badge-seg' : (row.semanticRole === 'allowance' ? 'badge-alw' : 'badge-ref');

        tr.innerHTML = `
          <td style="text-align: center;">
            <input type="checkbox" class="batch-row-checkbox" data-id="${row.id}" ${batch.selectedIds.has(row.id) ? 'checked' : ''} aria-label="Select row ${row.index}" />
          </td>
          <td style="font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--text-muted);">${row.index}</td>
          <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(row.name)}</td>
          <td><span class="type-badge ${roleBadgeClass}" style="font-size: 0.65rem;">${roleTag}</span></td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(row.sourceFormatted)}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.85rem; font-weight: 700; color: ${row.valid ? 'var(--accent-primary)' : 'var(--color-error, #ef4444)'};">${escapeHTML(row.targetFormatted)}</td>
          <td style="text-align: center;">
            <span class="batch-status-pill ${row.valid ? (row.status === 'UNCHANGED' ? 'unchanged' : 'valid') : 'invalid'}">
              ${row.valid ? (row.status === 'UNCHANGED' ? 'UNCHANGED' : '✓ VALID') : '⚠ INVALID'}
            </span>
          </td>
          <td style="text-align: right;">
            <button type="button" class="chain-row-del-btn batch-delete-row-btn" data-id="${row.id}" title="Remove row">✕</button>
          </td>
        `;

        fragment.appendChild(tr);
      });

      dom.batchTableBody.innerHTML = '';
      dom.batchTableBody.appendChild(fragment);

      // Attach row event listeners
      dom.batchTableBody.querySelectorAll('.batch-row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          const id = cb.dataset.id;
          if (cb.checked) batch.selectedIds.add(id);
          else batch.selectedIds.delete(id);
          renderBatchResults();
        });
      });

      dom.batchTableBody.querySelectorAll('.batch-delete-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          deleteBatchRow(id);
        });
      });
    }
  }

  function deleteBatchRow(id) {
    if (!state.batchCad.lastResult || !Array.isArray(state.batchCad.lastResult.rows)) return;
    state.batchCad.lastResult.rows = state.batchCad.lastResult.rows.filter(r => r.id !== id);
    state.batchCad.selectedIds.delete(id);
    // Re-index
    state.batchCad.lastResult.rows.forEach((r, idx) => { r.index = idx + 1; });
    // Recalculate summary
    const rows = state.batchCad.lastResult.rows;
    state.batchCad.lastResult.summary = {
      totalRows: rows.length,
      validRows: rows.filter(r => r.valid).length,
      invalidRows: rows.filter(r => !r.valid).length,
      convertedRows: rows.filter(r => r.status === 'CONVERTED').length,
      unchangedRows: rows.filter(r => r.status === 'UNCHANGED').length,
      totalCanonicalMeters: rows.filter(r => r.valid).reduce((acc, r) => acc + r.canonicalMeters, 0),
      totalTargetValue: rows.filter(r => r.valid).reduce((acc, r) => acc + (r.targetValue || 0), 0)
    };
    renderBatchResults();
    AudioService.playTick();
    showToast('Removed row');
  }

  function copyBatchData(formatKey = 'results_only') {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch conversion results to copy', 'warning');
      return;
    }

    const hasSelected = state.batchCad.selectedIds.size > 0;
    const text = formatBatchResults(result, {
      format: formatKey,
      selectedOnly: hasSelected,
      selectedIds: state.batchCad.selectedIds
    });

    if (!text || !text.trim()) {
      showToast('No valid dimension data to copy', 'warning');
      return;
    }

    const label = hasSelected ? `${state.batchCad.selectedIds.size} Selected Results` : 'Batch Conversion Results';
    copyToClipboard(text, label);
  }

  function sendBatchToWorkspace() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch conversion results to send', 'warning');
      return;
    }

    const hasSelected = state.batchCad.selectedIds.size > 0;
    const payload = convertBatchToWorkspaceGroup(result, {
      groupName: `Batch (${result.config?.mode || 'Conversion'})`,
      selectedOnly: hasSelected,
      selectedIds: state.batchCad.selectedIds
    });

    if (payload.entries.length === 0) {
      showToast('No valid rows to add to Dimension Workspace', 'warning');
      return;
    }

    if (!Array.isArray(state.workspace.groups)) state.workspace.groups = [];
    if (!Array.isArray(state.workspace.entries)) state.workspace.entries = [];

    state.workspace.groups.push(payload.group);
    state.workspace.entries.push(...payload.entries);

    saveWorkspace();
    switchMode('workspace');
    renderWorkspace();
    AudioService.playTick();
    showToast(`Added ${payload.entries.length} rows to Dimension Workspace`);
  }

  function sendBatchToMultiScale() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch rows to compare', 'warning');
      return;
    }

    const validRows = result.rows.filter(r => r.valid);
    if (validRows.length === 0) {
      showToast('No valid rows to compare', 'warning');
      return;
    }

    // Use first valid row or selected row
    const targetRow = (state.batchCad.selectedIds.size > 0
      ? validRows.find(r => state.batchCad.selectedIds.has(r.id))
      : validRows[0]) || validRows[0];

    state.multiScale.dimensionInput = `${targetRow.targetValue || targetRow.parsedValue} ${result.config?.targetUnit || 'mm'}`;
    if (dom.msDimensionInput) dom.msDimensionInput.value = state.multiScale.dimensionInput;

    switchMode('multiscale');
    calculateMultiScale();
    AudioService.playTick();
    showToast(`Comparing "${targetRow.name}" across multiple scales`);
  }

  function sendBatchToChains() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch rows to convert to chain', 'warning');
      return;
    }

    const hasSelected = state.batchCad.selectedIds.size > 0;
    const chain = convertBatchToDimensionChain(result, {
      chainName: `Batch Chain (${result.config?.targetUnit || 'mm'})`,
      selectedOnly: hasSelected,
      selectedIds: state.batchCad.selectedIds
    });

    if (!chain.segments || chain.segments.length === 0) {
      showToast('No valid rows for dimension chain', 'warning');
      return;
    }

    state.activeChain = chain;
    if (dom.chainsNameInput) dom.chainsNameInput.value = chain.name;
    if (dom.chainsUnitSelect) dom.chainsUnitSelect.value = chain.defaultUnit;

    switchMode('chains');
    calculateAndRenderChain(true);
    AudioService.playTick();
    showToast(`Created Dimension Chain with ${chain.segments.length} segments`);
  }

  function sendBatchToCadClipboard() {
    const result = state.batchCad.lastResult;
    if (!result || !result.rows || result.rows.length === 0) {
      showToast('No batch rows to format for CAD', 'warning');
      return;
    }

    // Set CAD Clipboard source to manual with raw text
    const rawNumbers = formatBatchResults(result, {
      format: 'raw_numbers',
      selectedOnly: state.batchCad.selectedIds.size > 0,
      selectedIds: state.batchCad.selectedIds
    });

    state.cadClipboard.source = 'manual';
    state.cadClipboard.manualInput = rawNumbers;
    if (dom.cadManualInput) dom.cadManualInput.value = rawNumbers;

    switchMode('cad_clipboard');
    renderCadClipboard(true);
    AudioService.playTick();
    showToast('Loaded batch numbers into CAD Clipboard');
  }

  // ---------------------------------------------------------------------------
  // 13i. Quick Dimension Strip Controller (Phase 2.5 Part 8: Glance Micro-Tool)
  // ---------------------------------------------------------------------------
  function saveQuickDimSettings() {
    try {
      StorageService.setItem(QUICK_DIM_STORAGE_KEY, JSON.stringify({
        isOpen: state.quickDimension.isOpen,
        pinned: state.quickDimension.pinned,
        selectedScale: state.quickDimension.selectedScale,
        displayUnit: state.quickDimension.displayUnit,
        drawingUnit: state.quickDimension.drawingUnit,
        precision: state.quickDimension.precision,
        mode: state.quickDimension.mode,
        showContext: state.quickDimension.showContext
      }));
    } catch (e) {}
  }

  function toggleQuickDimension(forceState) {
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !state.quickDimension.isOpen;
    state.quickDimension.isOpen = shouldOpen;
    if (dom.quickDimStrip) {
      dom.quickDimStrip.hidden = !shouldOpen;
    }
    if (dom.quickDimToggleBtn) {
      dom.quickDimToggleBtn.classList.toggle('active', shouldOpen);
    }
    if (shouldOpen) {
      if (dom.quickDimInput) {
        dom.quickDimInput.focus();
        dom.quickDimInput.select();
      }
      parseAndEvaluateQuickDimension(false);
    }
    saveQuickDimSettings();
  }

  function toggleQuickDimPin() {
    state.quickDimension.pinned = !state.quickDimension.pinned;
    if (dom.quickDimPinBtn) {
      dom.quickDimPinBtn.classList.toggle('pinned', state.quickDimension.pinned);
    }
    saveQuickDimSettings();
    showToast(state.quickDimension.pinned ? 'Quick Dimension Strip pinned open' : 'Quick Dimension Strip unpinned');
  }

  function applyQuickScale(scaleRatio) {
    if (typeof scaleRatio !== 'number' || isNaN(scaleRatio) || scaleRatio <= 0) return;
    state.quickDimension.selectedScale = scaleRatio;
    if (dom.quickDimScaleChips) {
      dom.quickDimScaleChips.querySelectorAll('.quick-scale-chip').forEach(chip => {
        const s = parseInt(chip.dataset.scale, 10);
        chip.classList.toggle('active', s === scaleRatio);
      });
    }
    if (dom.quickDimCustomScaleInput) {
      const isPreset = DEFAULT_QUICK_SCALES.includes(scaleRatio);
      dom.quickDimCustomScaleInput.value = isPreset ? '' : scaleRatio;
    }
    parseAndEvaluateQuickDimension(false);
    AudioService.playTick();
  }

  function parseAndEvaluateQuickDimension(isExplicitRun = false) {
    const rawInput = dom.quickDimInput ? dom.quickDimInput.value : state.quickDimension.rawInput;
    state.quickDimension.rawInput = rawInput;

    const evalResult = evaluateQuickDimension(rawInput, {
      selectedScale: state.quickDimension.selectedScale,
      scales: state.quickDimension.scales,
      displayUnit: state.quickDimension.displayUnit,
      drawingUnit: state.quickDimension.drawingUnit,
      precision: state.quickDimension.precision,
      mode: state.quickDimension.mode
    });

    state.quickDimension.lastResult = evalResult;
    renderQuickDimensionResults(evalResult);

    if (isExplicitRun && evalResult.valid) {
      AudioService.playSuccess();
    }
  }

  function renderQuickDimensionResults(res) {
    if (!res) return;

    if (dom.quickDimStatusBadge) {
      dom.quickDimStatusBadge.textContent = res.valid ? 'VALID' : (res.status === 'EMPTY' ? 'READY' : 'INVALID');
      dom.quickDimStatusBadge.className = res.valid ? 'badge-status-valid' : (res.status === 'EMPTY' ? 'badge-status-ready' : 'badge-status-invalid');
    }

    if (dom.quickDimErrorMsg) {
      if (res.valid || res.status === 'EMPTY') {
        dom.quickDimErrorMsg.style.display = 'none';
        dom.quickDimErrorMsg.textContent = '';
      } else {
        dom.quickDimErrorMsg.style.display = 'block';
        dom.quickDimErrorMsg.textContent = res.error || 'Invalid dimension or expression';
      }
    }

    // Hero Readouts
    if (dom.quickDimRealVal) {
      dom.quickDimRealVal.textContent = res.valid ? res.realFormatted : '---';
    }
    if (dom.quickDimSelectedScaleLabel) {
      dom.quickDimSelectedScaleLabel.textContent = `DRAWING @ 1:${res.selectedScale}`;
    }
    if (dom.quickDimDrawingVal) {
      dom.quickDimDrawingVal.textContent = res.valid ? res.selectedDrawingFormatted : '---';
    }

    // Common Unit Equivalents
    if (res.valid && res.commonEquivalents) {
      const mmEq = res.commonEquivalents.find(e => e.unit === 'mm');
      const cmEq = res.commonEquivalents.find(e => e.unit === 'cm');
      const mEq = res.commonEquivalents.find(e => e.unit === 'm');
      const inEq = res.commonEquivalents.find(e => e.unit === 'in');
      const ftinEq = res.commonEquivalents.find(e => e.unit === 'ft-in');

      if (dom.quickEquivMm) dom.quickEquivMm.textContent = mmEq ? mmEq.formatted : '---';
      if (dom.quickEquivCm) dom.quickEquivCm.textContent = cmEq ? cmEq.formatted : '---';
      if (dom.quickEquivM) dom.quickEquivM.textContent = mEq ? mEq.formatted : '---';
      if (dom.quickEquivIn) dom.quickEquivIn.textContent = inEq ? inEq.formatted : '---';
      if (dom.quickEquivFtin) dom.quickEquivFtin.textContent = ftinEq ? ftinEq.formatted : '---';
    } else {
      if (dom.quickEquivMm) dom.quickEquivMm.textContent = '---';
      if (dom.quickEquivCm) dom.quickEquivCm.textContent = '---';
      if (dom.quickEquivM) dom.quickEquivM.textContent = '---';
      if (dom.quickEquivIn) dom.quickEquivIn.textContent = '---';
      if (dom.quickEquivFtin) dom.quickEquivFtin.textContent = '---';
    }

    // Multi-Scale Matrix Grid
    if (dom.quickDimMatrixGrid) {
      if (res.valid && res.scaleMatrix && res.scaleMatrix.length > 0) {
        dom.quickDimMatrixGrid.innerHTML = res.scaleMatrix.map(item => `
          <div class="quick-matrix-cell ${item.isSelected ? 'selected' : ''}" data-scale="${item.scale}">
            <span class="quick-matrix-scale">${item.scaleFormatted}</span>
            <span class="quick-matrix-val">${item.drawingFormatted}</span>
          </div>
        `).join('');

        dom.quickDimMatrixGrid.querySelectorAll('.quick-matrix-cell').forEach(cell => {
          cell.addEventListener('click', () => {
            const sc = parseInt(cell.dataset.scale, 10);
            applyQuickScale(sc);
          });
        });
      } else {
        dom.quickDimMatrixGrid.innerHTML = '';
      }
    }

    // Context Card
    if (dom.quickDimContextCard && dom.quickDimContextBody) {
      if (res.valid && res.context) {
        if (res.context.hasReference && res.context.matches.length > 0) {
          dom.quickDimContextBody.innerHTML = res.context.matches.map(m => `
            <div><strong>${m.label}:</strong> ${m.detail}</div>
          `).join('') + `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;"><em>${res.context.disclaimer}</em></div>`;
        } else {
          dom.quickDimContextBody.textContent = res.context.message || 'No stored reference for this dimension.';
        }
      } else {
        dom.quickDimContextBody.textContent = 'Enter a dimension to view contextual reference standards.';
      }
    }
  }

  function copyQuickDimension(formatType) {
    const res = state.quickDimension.lastResult;
    if (!res || !res.valid) {
      showToast('Enter a valid dimension to copy', 'warning');
      return;
    }
    const text = formatQuickDimensionClipboard(res, formatType);
    if (!text) return;
    copyToClipboard(text, `Quick Dimension (${formatType.replace(/_/g, ' ')})`);
  }

  function handoffQuickDimension(targetTool) {
    const res = state.quickDimension.lastResult;
    if (!res || !res.valid) {
      showToast('Enter a valid dimension first', 'warning');
      return;
    }
    const payload = createQuickHandoffPayload(res, targetTool);
    if (!payload) return;

    if (targetTool === 'workspace') {
      state.workspace.entries.push(payload.entry);
      saveWorkspaceState();
      switchMode('workspace');
      showToast(`Added "${payload.entry.name}" to Dimension Workspace`);
    } else if (targetTool === 'multiscale') {
      if (dom.multiscaleInput) {
        dom.multiscaleInput.value = payload.dimensionInput;
      }
      switchMode('multiscale');
      runMultiScaleComparison(true);
      showToast('Loaded dimension in Multi-Scale Comparison');
    } else if (targetTool === 'chain') {
      state.chains.segments.push(payload.segment);
      saveChainState();
      switchMode('chains');
      showToast(`Added "${payload.segment.name}" to Dimension Chain`);
    } else if (targetTool === 'cad_clipboard') {
      state.cadClipboard.manualInput = payload.manualInput;
      state.cadClipboard.source = 'manual';
      if (dom.cadSourceSelect) dom.cadSourceSelect.value = 'manual';
      if (dom.cadManualGroup) dom.cadManualGroup.style.display = 'block';
      if (dom.cadManualInput) dom.cadManualInput.value = payload.manualInput;
      switchMode('cad_clipboard');
      updateCadPreview();
      showToast('Transferred dimensions to CAD Clipboard');
    } else if (targetTool === 'journal') {
      HistoryService.addEntry(payload);
      renderHistoryList();
      AudioService.playTick();
      showToast('Saved snapshot to Calculation Journal');
    }
  }

  // ---------------------------------------------------------------------------
  // 14. Event Listener Wire-up
  // ---------------------------------------------------------------------------
  function attachEventListeners() {
    // Theme Selector
    if (dom.themeSelect) {
      dom.themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        AudioService.playTick();
        showToast(`Theme set to ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    // Sound Toggle
    if (dom.soundToggleBtn) {
      dom.soundToggleBtn.addEventListener('click', () => {
        const newState = AudioService.toggleSound();
        updateSoundUI();
        showToast(newState ? '🔊 Tactile sound enabled' : '🔇 Sound muted');
      });
    }

    // Command Palette Trigger & Modal Listeners
    if (dom.commandPaletteBtn) dom.commandPaletteBtn.addEventListener('click', openCommandPalette);
    if (dom.closeCommandPaletteBtn) dom.closeCommandPaletteBtn.addEventListener('click', closeCommandPalette);
    if (dom.commandPaletteOverlay) dom.commandPaletteOverlay.addEventListener('click', closeCommandPalette);

    if (dom.commandPaletteInput) {
      dom.commandPaletteInput.addEventListener('input', (e) => {
        paletteQuery = e.target.value;
        renderCommandPalette(paletteQuery);
      });

      dom.commandPaletteInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (paletteItems.length > 0) {
            paletteSelectedIndex = (paletteSelectedIndex + 1) % paletteItems.length;
            updatePaletteSelection();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (paletteItems.length > 0) {
            paletteSelectedIndex = (paletteSelectedIndex - 1 + paletteItems.length) % paletteItems.length;
            updatePaletteSelection();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (paletteItems[paletteSelectedIndex]) {
            executeCommand(paletteItems[paletteSelectedIndex]);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeCommandPalette();
        }
      });
    }

    // History Toggle & Actions
    if (dom.historyToggleBtn) dom.historyToggleBtn.addEventListener('click', toggleHistoryDrawer);
    if (dom.closeHistoryBtn) dom.closeHistoryBtn.addEventListener('click', toggleHistoryDrawer);
    if (dom.historyOverlay) dom.historyOverlay.addEventListener('click', toggleHistoryDrawer);

    if (dom.clearHistoryBtn) {
      dom.clearHistoryBtn.addEventListener('click', () => {
        HistoryService.clear();
        renderHistoryList();
        showToast('Calculation history cleared');
      });
    }

    if (dom.exportCsvBtn) {
      dom.exportCsvBtn.addEventListener('click', () => {
        const csv = HistoryService.exportCSV();
        if (!csv) {
          showToast('History is empty', 'warning');
          return;
        }
        downloadFile(csv, `architecture-helping-hand-${Date.now()}.csv`, 'text/csv');
        showToast('Exported history as CSV');
      });
    }

    if (dom.exportMdBtn) {
      dom.exportMdBtn.addEventListener('click', () => {
        const md = HistoryService.exportMarkdown();
        if (!md) {
          showToast('History is empty', 'warning');
          return;
        }
        copyToClipboard(md, 'Markdown History Table');
      });
    }

    // Shortcuts Modal
    if (dom.shortcutsHelpBtn) {
      dom.shortcutsHelpBtn.addEventListener('click', () => {
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
        AudioService.playTick();
      });
    }

    if (dom.closeShortcutsBtn) {
      dom.closeShortcutsBtn.addEventListener('click', () => {
        dom.shortcutsModal?.classList.remove('open');
        dom.modalBackdrop?.classList.remove('open');
      });
    }

    if (dom.modalBackdrop) {
      dom.modalBackdrop.addEventListener('click', () => {
        dom.shortcutsModal?.classList.remove('open');
        dom.modalBackdrop?.classList.remove('open');
      });
    }

    // Mode Navigation Tabs
    dom.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetMode = tab.dataset.mode;
        if (targetMode) switchMode(targetMode);
      });
    });

    // Preset Category Pills
    dom.presetPillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.presetPillBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPresetChips(btn.dataset.category);
        AudioService.playTick();
      });
    });

    // Custom Scale Ratio Input
    if (dom.scaleRatioInput) {
      dom.scaleRatioInput.addEventListener('input', () => {
        const r = parseFloat(dom.scaleRatioInput.value);
        if (!isNaN(r) && r > 0) {
          state.scaleRatio = r;
          if (dom.activeScaleBadge) dom.activeScaleBadge.textContent = `SCALE 1:${r}`;
          calculateConverter();
        }
      });
    }

    // Converter Inputs & Run Action
    if (dom.converterInputVal) {
      dom.converterInputVal.addEventListener('input', () => {
        calculateConverter();
      });
      dom.converterInputVal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          calculateConverter();
          if (dom.btnSaveHistory && dom.converterResultVal?.textContent !== '---') {
            dom.btnSaveHistory.click();
          }
        }
      });
    }

    if (dom.converterInputUnit) dom.converterInputUnit.addEventListener('change', calculateConverter);
    if (dom.converterOutputUnit) dom.converterOutputUnit.addEventListener('change', calculateConverter);
    if (dom.swapDirectionBtn) dom.swapDirectionBtn.addEventListener('click', swapDirection);
    if (dom.btnRunConverter) {
      dom.btnRunConverter.addEventListener('click', () => {
        calculateConverter();
        logCurrentCalculationToHistory('converter');
      });
    }

    // Copy Result & Save Log
    if (dom.btnCopyResult) {
      dom.btnCopyResult.addEventListener('click', () => {
        const val = dom.converterResultVal?.textContent;
        const unit = dom.converterResultUnit?.textContent;
        if (val && val !== '---') {
          copyToClipboard(`${val} ${unit}`);
        }
      });
    }

    if (dom.btnSaveHistory) {
      dom.btnSaveHistory.addEventListener('click', () => {
        logCurrentCalculationToHistory('converter');
      });
    }

    // Rescaler Listeners
    [dom.rescaleOrigRatio, dom.rescaleOrigVal, dom.rescaleOrigUnit, dom.rescaleTargetRatio, dom.rescaleTargetUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateRescaler);
        el.addEventListener('change', calculateRescaler);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            calculateRescaler();
            logCurrentCalculationToHistory('rescale');
          }
        });
      }
    });
    if (dom.btnRunRescale) {
      dom.btnRunRescale.addEventListener('click', () => {
        calculateRescaler();
        logCurrentCalculationToHistory('rescale');
      });
    }
    if (dom.btnCopyRescale) {
      dom.btnCopyRescale.addEventListener('click', () => {
        const val = dom.rescaleResultVal?.textContent;
        const unit = dom.rescaleResultUnit?.textContent;
        if (val && val !== '---') copyToClipboard(`${val} ${unit}`, 'Rescaled Dimension');
      });
    }

    // Scale Detector Listeners
    [dom.detectorPaperVal, dom.detectorPaperUnit, dom.detectorRealVal, dom.detectorRealUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateDetector);
        el.addEventListener('change', calculateDetector);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            calculateDetector();
            logCurrentCalculationToHistory('detector');
          }
        });
      }
    });
    if (dom.btnRunDetector) {
      dom.btnRunDetector.addEventListener('click', () => {
        calculateDetector();
        logCurrentCalculationToHistory('detector');
      });
    }
    if (dom.btnApplyDetected) {
      dom.btnApplyDetected.addEventListener('click', () => {
        if (state.lastDetectedRatio !== null && state.lastDetectedRatio > 0) {
          state.scaleRatio = state.lastDetectedRatio;
          if (dom.scaleRatioInput) dom.scaleRatioInput.value = state.lastDetectedRatio;
          if (dom.activeScaleBadge) dom.activeScaleBadge.textContent = `SCALE 1:${state.lastDetectedRatio.toFixed(1)}`;
          switchMode('converter');
          showToast(`Applied detected scale 1:${state.lastDetectedRatio.toFixed(2)} to Converter`);
        } else {
          showToast('Please enter valid measurements to detect scale', 'warning');
        }
      });
    }

    // Area & Volume Listeners
    dom.areavolTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.areavolTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.calcType = btn.dataset.type;
        updateAreaVolumeUnitSelects();
        calculateAreaVolume();
        AudioService.playTick();
      });
    });

    dom.areavolDirBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.areavolDirBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.calcDirection = btn.dataset.dir;
        if (state.calcDirection === 'drawing_to_real') {
          if (dom.areavolInputBadge) dom.areavolInputBadge.textContent = 'Drawing Area/Volume';
          if (dom.areavolOutputBadge) dom.areavolOutputBadge.textContent = 'Real-World Unit';
        } else {
          if (dom.areavolInputBadge) dom.areavolInputBadge.textContent = 'Real-World Dimension';
          if (dom.areavolOutputBadge) dom.areavolOutputBadge.textContent = 'Drawing Unit on Paper';
        }
        calculateAreaVolume();
        AudioService.playTick();
      });
    });

    [dom.areavolRatioInput, dom.areavolInputVal, dom.areavolInputUnit, dom.areavolOutputUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateAreaVolume);
        el.addEventListener('change', calculateAreaVolume);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            calculateAreaVolume();
            logCurrentCalculationToHistory('area_volume');
          }
        });
      }
    });
    if (dom.btnRunAreavol) {
      dom.btnRunAreavol.addEventListener('click', () => {
        calculateAreaVolume();
        logCurrentCalculationToHistory('area_volume');
      });
    }
    if (dom.btnCopyAreavol) {
      dom.btnCopyAreavol.addEventListener('click', () => {
        const val = dom.areavolResultVal?.textContent;
        const unit = dom.areavolResultUnit?.textContent;
        if (val && val !== '---') copyToClipboard(`${val} ${unit}`, 'Area/Volume Result');
      });
    }

    // Furniture Database Listeners
    if (dom.furnitureSearchInput) {
      dom.furnitureSearchInput.addEventListener('input', (e) => {
        state.furnitureSearchQuery = e.target.value;
        renderFurnitureGrid();
      });
    }

    if (dom.clearFurnitureSearchBtn) {
      dom.clearFurnitureSearchBtn.addEventListener('click', () => {
        if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
        state.furnitureSearchQuery = '';
        renderFurnitureGrid();
      });
    }

    // Furniture Scale Chips
    if (dom.furnScalePresets) {
      dom.furnScalePresets.querySelectorAll('.furn-scale-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          dom.furnScalePresets.querySelectorAll('.furn-scale-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const ratio = parseFloat(btn.dataset.ratio);
          state.furnitureScaleRatio = ratio;
          if (dom.furnScaleRatioInput) dom.furnScaleRatioInput.value = ratio;
          renderFurnitureGrid();
          calculateCustomFurniture();
          AudioService.playTick();
        });
      });
    }

    if (dom.furnScaleRatioInput) {
      dom.furnScaleRatioInput.addEventListener('input', () => {
        const r = parseFloat(dom.furnScaleRatioInput.value);
        if (!isNaN(r) && r > 0) {
          state.furnitureScaleRatio = r;
          renderFurnitureGrid();
          calculateCustomFurniture();
        }
      });
    }

    if (dom.furnPaperUnitSelect) {
      dom.furnPaperUnitSelect.addEventListener('change', () => {
        state.furniturePaperUnit = dom.furnPaperUnitSelect.value;
        renderFurnitureGrid();
        calculateCustomFurniture();
      });
    }

    // Furniture Sort Dropdown Listener
    if (dom.furnSortSelect) {
      dom.furnSortSelect.addEventListener('change', () => {
        state.furnitureSortKey = dom.furnSortSelect.value;
        renderFurnitureGrid();
      });
    }

    // Furniture Density Toggle Listeners (Comfortable vs Compact)
    dom.furnDensityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.furnDensityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.furnitureDensity = btn.dataset.density;
        renderFurnitureGrid();
        AudioService.playTick();
      });
    });

    // Furniture Category Pills
    if (dom.furnCategoryNav) {
      dom.furnCategoryNav.querySelectorAll('.furn-cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          dom.furnCategoryNav.querySelectorAll('.furn-cat-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.furnitureActiveCategory = btn.dataset.cat;
          renderFurnitureGrid();
          AudioService.playTick();
        });
      });
    }

    // Custom Furniture Scaler
    [dom.customFurnW, dom.customFurnD, dom.customFurnUnit].forEach(el => {
      if (el) {
        el.addEventListener('input', calculateCustomFurniture);
        el.addEventListener('change', calculateCustomFurniture);
      }
    });
    if (dom.btnRunCustomFurn) {
      dom.btnRunCustomFurn.addEventListener('click', () => {
        calculateCustomFurniture();
        logCurrentCalculationToHistory('furniture');
      });
    }
    if (dom.btnPlannerCustomFurn) {
      dom.btnPlannerCustomFurn.addEventListener('click', () => {
        const name = dom.customFurnName?.value || 'Custom Piece';
        const w = dom.customFurnW?.value || '0';
        const d = dom.customFurnD?.value || '0';
        const u = dom.customFurnUnit?.value || 'cm';
        showToast(`📐 Added ${name} (${w}×${d} ${u}) to Room Planner layout`);
        AudioService.playTick();
      });
    }
    if (dom.btnCopyCustomFurn) {
      dom.btnCopyCustomFurn.addEventListener('click', () => {
        const text = dom.customFurnResult?.textContent;
        if (text) copyToClipboard(text, 'Custom Furniture Size');
      });
    }
    if (dom.btnSendCustomFurn) {
      dom.btnSendCustomFurn.addEventListener('click', () => {
        const w = dom.customFurnW?.value || '240';
        if (dom.converterInputVal) dom.converterInputVal.value = w;
        if (dom.converterInputUnit) dom.converterInputUnit.value = dom.customFurnUnit?.value || 'cm';
        state.direction = 'real_to_drawing';
        switchMode('converter');
        showToast(`Sent custom width ${w} to Converter`);
      });
    }

    // Reference Chart
    if (dom.refScaleSelect) {
      dom.refScaleSelect.addEventListener('change', (e) => {
        state.refScaleRatio = parseFloat(e.target.value) || 50;
        renderReferenceChart();
        AudioService.playTick();
      });
    }

    if (dom.refQuickChips) {
      dom.refQuickChips.querySelectorAll('.ref-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = parseFloat(btn.dataset.ratio);
          state.refScaleRatio = r;
          if (dom.refScaleSelect) dom.refScaleSelect.value = r;
          renderReferenceChart();
          AudioService.playTick();
        });
      });
    }

    if (dom.refDensityBtnStandard) {
      dom.refDensityBtnStandard.addEventListener('click', () => {
        dom.refDensityBtnStandard.classList.add('active');
        dom.refDensityBtnCompact?.classList.remove('active');
        dom.refDataTable?.classList.remove('compact-table');
        AudioService.playTick();
      });
    }

    if (dom.refDensityBtnCompact) {
      dom.refDensityBtnCompact.addEventListener('click', () => {
        dom.refDensityBtnCompact.classList.add('active');
        dom.refDensityBtnStandard?.classList.remove('active');
        dom.refDataTable?.classList.add('compact-table');
        AudioService.playTick();
      });
    }

    if (dom.btnPrintRef) {
      dom.btnPrintRef.addEventListener('click', () => {
        showToast('🖨️ Opening print dialog: Set Scale to 100% / Actual Size', 'info');
        window.print();
      });
    }

    // Mode 7: Dimension Workspace Listeners
    if (dom.workspaceDensityStandard) {
      dom.workspaceDensityStandard.addEventListener('click', () => {
        state.workspace.density = 'comfortable';
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
      });
    }

    if (dom.workspaceDensityCompact) {
      dom.workspaceDensityCompact.addEventListener('click', () => {
        state.workspace.density = 'compact';
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
      });
    }

    if (dom.workspaceSelectAll) {
      dom.workspaceSelectAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.workspace.entries.forEach(item => state.workspaceSelectedIds.add(item.id));
        } else {
          state.workspaceSelectedIds.clear();
        }
        renderWorkspace();
      });
    }

    if (dom.workspaceScaleSelect) {
      dom.workspaceScaleSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
          if (dom.workspaceCustomScaleGroup) dom.workspaceCustomScaleGroup.style.display = 'flex';
          if (dom.workspaceCustomScaleInput) dom.workspaceCustomScaleInput.focus();
        } else {
          if (dom.workspaceCustomScaleGroup) dom.workspaceCustomScaleGroup.style.display = 'none';
          state.workspace.scaleRatio = parseFloat(val) || 50;
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
        }
      });
    }

    if (dom.workspaceCustomScaleInput) {
      dom.workspaceCustomScaleInput.addEventListener('input', (e) => {
        const r = parseFloat(e.target.value);
        if (!isNaN(r) && r > 0) {
          state.workspace.scaleRatio = r;
          saveWorkspace();
          renderWorkspace();
        }
      });
    }

    if (dom.workspaceUnitSelect) {
      dom.workspaceUnitSelect.addEventListener('change', (e) => {
        state.workspace.displayUnit = e.target.value;
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
      });
    }

    if (dom.workspaceQuickChips) {
      dom.workspaceQuickChips.querySelectorAll('.scale-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const r = parseFloat(chip.dataset.scale);
          if (!isNaN(r) && r > 0) {
            state.workspace.scaleRatio = r;
            saveWorkspace();
            renderWorkspace();
            AudioService.playTick();
          }
        });
      });
    }

    if (dom.workspaceAddForm) {
      dom.workspaceAddForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let rawInput = dom.workspaceAddInput?.value?.trim() || '';
        if (!rawInput) return;

        let name = dom.workspaceAddName?.value?.trim() || '';
        let dimensionType = dom.workspaceAddType?.value || DEFAULT_DIMENSION_TYPE;
        const defaultUnit = dom.workspaceAddUnit?.value || state.workspace.displayUnit || 'mm';
        const notes = dom.workspaceAddNotes?.value?.trim() || '';

        // Deterministic Natural Quick Add Syntax (e.g. "Wall A 4800")
        if (name === '' && rawInput !== '') {
          const quickParsed = parseQuickAddString(rawInput, defaultUnit, dimensionType);
          if (quickParsed.isValid) {
            name = quickParsed.name;
            rawInput = quickParsed.rawInput;
            dimensionType = quickParsed.dimensionType;
          } else {
            name = 'Dimension';
          }
        } else if (name === '') {
          name = 'Dimension';
        }

        const newEntry = createDimensionEntry({ name, rawInput, dimensionType, defaultUnit, notes }, defaultUnit);
        state.workspace.entries.push(newEntry);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();

        if (dom.workspaceAddInput) dom.workspaceAddInput.value = '';
        if (dom.workspaceAddName) dom.workspaceAddName.value = '';
        if (dom.workspaceAddNotes) dom.workspaceAddNotes.value = '';
        if (dom.workspaceAddInput) dom.workspaceAddInput.focus();

        if (newEntry.isValid) {
          showToast(`Added [${newEntry.dimensionType.toUpperCase()}] ${newEntry.name} (${newEntry.rawInput})`);
        } else {
          showToast(`Added "${newEntry.name}" ⚠️ (Check measurement syntax)`, 'warning');
        }
      });
    }

    if (dom.workspaceLoadSamplesBtn) {
      dom.workspaceLoadSamplesBtn.addEventListener('click', () => {
        state.workspace = createDefaultWorkspace();
        state.workspaceSelectedIds.clear();
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast('Loaded sample architectural dimension schedule');
      });
    }

    if (dom.workspaceCopySelectedBtn) {
      dom.workspaceCopySelectedBtn.addEventListener('click', () => {
        if (state.workspaceSelectedIds.size === 0) {
          showToast('No dimensions selected to copy', 'warning');
          return;
        }
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'selected',
          selectedIds: Array.from(state.workspaceSelectedIds),
          groups: state.workspace.groups
        });
        copyToClipboard(text, `${state.workspaceSelectedIds.size} Selected Dimensions`);
      });
    }

    if (dom.workspaceCopySegmentsBtn) {
      dom.workspaceCopySegmentsBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'segments',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Additive Segment Dimensions');
      });
    }

    if (dom.workspaceCopyReferencesBtn) {
      dom.workspaceCopyReferencesBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'references',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Reference Dimensions');
      });
    }

    if (dom.workspaceCopyAllBtn) {
      dom.workspaceCopyAllBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'both',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Full Dimension Schedule');
      });
    }

    if (dom.workspaceCopyRawBtn) {
      dom.workspaceCopyRawBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'raw',
          groups: state.workspace.groups
        });
        copyToClipboard(text, 'Raw CAD Numbers');
      });
    }

    if (dom.workspaceCopyDrawingBtn) {
      dom.workspaceCopyDrawingBtn.addEventListener('click', () => {
        const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'drawing',
          groups: state.workspace.groups
        });
        copyToClipboard(text, `Drawing Values (@ 1:${state.workspace.scaleRatio})`);
      });
    }

    if (dom.workspaceExportTsvBtn) {
      dom.workspaceExportTsvBtn.addEventListener('click', () => {
        const tsv = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
          mode: 'tsv',
          groups: state.workspace.groups
        });
        downloadFile(tsv, `dimension-schedule-1to${state.workspace.scaleRatio}-${Date.now()}.tsv`, 'text/tab-separated-values');
        showToast('Exported schedule as TSV spreadsheet');
      });
    }

    if (dom.workspaceAddGroupBtn) {
      dom.workspaceAddGroupBtn.addEventListener('click', () => {
        const grpNum = (state.workspace.groups?.length || 0) + 1;
        const grpName = window.prompt('Enter group name (e.g. Wall North, Bay Grid):', `Group ${grpNum}`);
        if (grpName && grpName.trim()) {
          const newGrp = createGroup(grpName.trim());
          if (!Array.isArray(state.workspace.groups)) state.workspace.groups = [];
          state.workspace.groups.push(newGrp);

          // If rows are selected, assign them to this group
          if (state.workspaceSelectedIds.size > 0) {
            state.workspace.entries.forEach(entry => {
              if (state.workspaceSelectedIds.has(entry.id)) {
                entry.groupId = newGrp.id;
              }
            });
            state.workspaceSelectedIds.clear();
          }

          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast(`Created group "${newGrp.name}"`);
        }
      });
    }

    if (dom.workspaceSaveJournalBtn) {
      dom.workspaceSaveJournalBtn.addEventListener('click', () => {
        logCurrentCalculationToHistory('workspace');
      });
    }

    if (dom.workspaceClearBtn) {
      dom.workspaceClearBtn.addEventListener('click', () => {
        if (state.workspace.entries.length === 0) {
          showToast('Workspace is already empty', 'warning');
          return;
        }
        if (window.confirm('Clear all dimensions and groups from the workspace?')) {
          state.workspace.entries = [];
          state.workspace.groups = [];
          state.workspaceSelectedIds.clear();
          saveWorkspace();
          renderWorkspace();
          AudioService.playTick();
          showToast('Dimension workspace cleared');
        }
      });
    }

    // Mode 8: Dimension Expression Listeners
    if (dom.expressionInput) {
      dom.expressionInput.addEventListener('input', () => {
        calculateExpression(false);
      });

      dom.expressionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            dom.expressionAddWorkspaceBtn?.click();
          } else {
            calculateExpression(true);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.expressionInput.value = '';
          calculateExpression(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.expressionClearInputBtn) {
      dom.expressionClearInputBtn.addEventListener('click', () => {
        if (dom.expressionInput) {
          dom.expressionInput.value = '';
          dom.expressionInput.focus();
          calculateExpression(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.expressionDefaultUnit) {
      dom.expressionDefaultUnit.addEventListener('change', () => {
        calculateExpression(true);
        AudioService.playTick();
      });
    }

    if (dom.expressionScaleSelect) {
      dom.expressionScaleSelect.addEventListener('change', (e) => {
        const isCustom = e.target.value === 'custom';
        if (dom.expressionCustomScaleGroup) {
          dom.expressionCustomScaleGroup.style.display = isCustom ? 'block' : 'none';
        }
        calculateExpression(true);
        AudioService.playTick();
      });
    }

    if (dom.expressionCustomScaleInput) {
      dom.expressionCustomScaleInput.addEventListener('input', () => {
        calculateExpression(false);
      });
    }

    if (dom.btnRunExpression) {
      dom.btnRunExpression.addEventListener('click', () => {
        calculateExpression(true);
      });
    }

    // Quick Template Chips
    document.querySelectorAll('.expr-template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const expr = chip.dataset.expr;
        if (dom.expressionInput && expr) {
          dom.expressionInput.value = expr;
          calculateExpression(true);
          AudioService.playTick();
        }
      });
    });

    if (dom.expressionCopyBtn) {
      dom.expressionCopyBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (state.lastValidExpression && state.lastValidExpression.isValid) {
          copyToClipboard(state.lastValidExpression.formatted, 'Evaluated Expression Result');
        } else {
          showToast('No valid result to copy', 'warning');
        }
      });
    }

    if (dom.expressionCopyRawBtn) {
      dom.expressionCopyRawBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (state.lastValidExpression && state.lastValidExpression.isValid) {
          const valStr = state.lastValidExpression.dimension === 'scalar'
            ? String(state.lastValidExpression.value)
            : formatNumber(state.lastValidExpression.canonicalMeters, state.precision);
          copyToClipboard(valStr, 'Raw Numeric Value');
        } else {
          showToast('No valid result to copy', 'warning');
        }
      });
    }

    if (dom.expressionCopyDrawingBtn) {
      dom.expressionCopyDrawingBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (state.lastValidExpression && state.lastValidExpression.isValid && state.lastValidExpression.drawingFormatted) {
          copyToClipboard(state.lastValidExpression.drawingFormatted, `Scaled Drawing (${state.lastValidExpression.drawingFormatted})`);
        } else {
          showToast('No scaled drawing dimension available', 'warning');
        }
      });
    }

    if (dom.expressionAddWorkspaceBtn) {
      dom.expressionAddWorkspaceBtn.addEventListener('click', () => {
        calculateExpression(true);
        if (!state.lastValidExpression || !state.lastValidExpression.isValid) {
          showToast('Cannot add invalid expression to workspace', 'warning');
          return;
        }

        const res = state.lastValidExpression;
        const name = dom.expressionAddName?.value?.trim() || 'Expression Result';
        const role = dom.expressionAddRoleSelect?.value || 'reference';
        const rawInput = res.dimension === 'scalar' ? String(res.value) : res.formatted;
        const unit = res.dimension === 'scalar' ? (dom.expressionDefaultUnit?.value || 'mm') : res.displayUnit;

        const newEntry = createDimensionEntry({
          name,
          rawInput,
          dimensionType: role,
          defaultUnit: unit,
          notes: `Evaluated: ${res.expression}`
        }, unit);

        state.workspace.entries.push(newEntry);
        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast(`Added [${role.toUpperCase()}] "${name}" (${rawInput}) to Workspace`);
      });
    }

    if (dom.expressionSaveJournalBtn) {
      dom.expressionSaveJournalBtn.addEventListener('click', () => {
        calculateExpression(true);
        logCurrentCalculationToHistory('expression');
      });
    }

    if (dom.expressionClearRecentBtn) {
      dom.expressionClearRecentBtn.addEventListener('click', () => {
        state.recentExpressions = [];
        renderRecentExpressions();
        AudioService.playTick();
        showToast('Recent expressions cleared');
      });
    }

    // Mode 8 -> Mode 9: Compare Across Scales Action
    if (dom.expressionCompareBtn) {
      dom.expressionCompareBtn.addEventListener('click', () => {
        calculateExpression(true);
        const exprToCompare = state.lastValidExpression?.formatted || dom.expressionInput?.value?.trim();
        if (exprToCompare) {
          switchMode('multiscale');
          if (dom.multiscaleInput) {
            dom.multiscaleInput.value = exprToCompare;
            calculateMultiScale(true);
          }
          AudioService.playTick();
          showToast(`Loaded "${exprToCompare}" into Multi-Scale Comparison`);
        } else {
          showToast('Enter and evaluate an expression first', 'warning');
        }
      });
    }

    // Mode 9: Multi-Scale Comparison Listeners
    if (dom.multiscaleInput) {
      dom.multiscaleInput.addEventListener('input', () => {
        calculateMultiScale(false);
      });

      dom.multiscaleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          calculateMultiScale(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.multiscaleInput.value = '';
          calculateMultiScale(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleClearInputBtn) {
      dom.multiscaleClearInputBtn.addEventListener('click', () => {
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = '';
          dom.multiscaleInput.focus();
          calculateMultiScale(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleDefaultUnit) {
      dom.multiscaleDefaultUnit.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    if (dom.multiscaleDisplayUnit) {
      dom.multiscaleDisplayUnit.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    // Preset Group Pills
    document.querySelectorAll('.multiscale-group-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.multiscale-group-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.multiscaleGroup = pill.dataset.group;
        calculateMultiScale(true);
        AudioService.playTick();
      });
    });

    if (dom.multiscaleAddScaleBtn) {
      dom.multiscaleAddScaleBtn.addEventListener('click', () => {
        const ratio = parseFloat(dom.multiscaleCustomScaleInput?.value);
        addCustomScale(ratio);
        if (dom.multiscaleCustomScaleInput) dom.multiscaleCustomScaleInput.value = '';
      });
    }

    if (dom.multiscaleSortSelect) {
      dom.multiscaleSortSelect.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    if (dom.multiscalePaperSelect) {
      dom.multiscalePaperSelect.addEventListener('change', () => {
        calculateMultiScale(true);
        AudioService.playTick();
      });
    }

    if (dom.multiscaleFitMin) {
      dom.multiscaleFitMin.addEventListener('input', () => {
        calculateMultiScale(false);
      });
    }

    if (dom.multiscaleFitMax) {
      dom.multiscaleFitMax.addEventListener('input', () => {
        calculateMultiScale(false);
      });
    }

    // Example Chips
    document.querySelectorAll('.multiscale-example-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const dim = chip.dataset.dim;
        if (dom.multiscaleInput && dim) {
          dom.multiscaleInput.value = dim;
          calculateMultiScale(true);
          AudioService.playTick();
        }
      });
    });

    if (dom.btnRunMultiscale) {
      dom.btnRunMultiscale.addEventListener('click', () => {
        calculateMultiScale(true);
      });
    }

    if (dom.multiscaleLoadSampleBtn) {
      dom.multiscaleLoadSampleBtn.addEventListener('click', () => {
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = '2400 mm';
          calculateMultiScale(true);
          AudioService.playTick();
        }
      });
    }

    if (dom.multiscaleCopyTableBtn) {
      dom.multiscaleCopyTableBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'table');
          copyToClipboard(out, 'Scale Comparison Table');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    if (dom.multiscaleCopyAllBtn) {
      dom.multiscaleCopyAllBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'all');
          copyToClipboard(out, 'All Scales List');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    if (dom.multiscaleCopyCurrentBtn) {
      dom.multiscaleCopyCurrentBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'current');
          copyToClipboard(out, 'Current Scale Comparison');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    if (dom.multiscaleCopyRawBtn) {
      dom.multiscaleCopyRawBtn.addEventListener('click', () => {
        calculateMultiScale(true);
        if (state.lastValidMultiScale && state.lastValidMultiScale.isValid) {
          const out = formatScaleComparison(state.lastValidMultiScale, 'raw');
          copyToClipboard(out, 'Raw Drawing Numbers (CAD)');
        } else {
          showToast('No scale comparison data to copy', 'warning');
        }
      });
    }

    // Mode 10: Dimension Chains Listeners
    if (dom.chainsNameInput) {
      dom.chainsNameInput.addEventListener('input', () => {
        state.activeChain.name = dom.chainsNameInput.value.trim() || 'Dimension Chain';
        saveChain();
      });
    }

    if (dom.chainsScaleSelect) {
      dom.chainsScaleSelect.addEventListener('change', () => {
        calculateAndRenderChain(true);
        AudioService.playTick();
      });
    }

    if (dom.chainsUnitSelect) {
      dom.chainsUnitSelect.addEventListener('change', () => {
        calculateAndRenderChain(true);
        AudioService.playTick();
      });
    }

    if (dom.chainsStartOffsetInput) {
      dom.chainsStartOffsetInput.addEventListener('input', () => {
        calculateAndRenderChain(false);
      });
    }

    if (dom.chainsEndOffsetInput) {
      dom.chainsEndOffsetInput.addEventListener('input', () => {
        calculateAndRenderChain(false);
      });
    }

    if (dom.chainsQuickInput) {
      dom.chainsQuickInput.addEventListener('input', () => {
        calculateAndRenderChain(false);
      });

      dom.chainsQuickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = dom.chainsQuickInput.value.trim();
          if (val) {
            addSegmentsToChain(val);
            dom.chainsQuickInput.value = '';
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dom.chainsQuickInput.value = '';
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.chainsAddBtn) {
      dom.chainsAddBtn.addEventListener('click', () => {
        const val = dom.chainsQuickInput?.value?.trim();
        if (val) {
          addSegmentsToChain(val);
          if (dom.chainsQuickInput) dom.chainsQuickInput.value = '';
        } else {
          showToast('Enter segment measurement(s) to add', 'warning');
        }
      });
    }

    if (dom.chainsClearInputBtn) {
      dom.chainsClearInputBtn.addEventListener('click', () => {
        if (dom.chainsQuickInput) {
          dom.chainsQuickInput.value = '';
          dom.chainsQuickInput.focus();
          calculateAndRenderChain(false);
          AudioService.playTick();
        }
      });
    }

    if (dom.chainsClearAllBtn) {
      dom.chainsClearAllBtn.addEventListener('click', () => {
        state.activeChain.segments = [];
        state.chainSelectedSegmentId = null;
        calculateAndRenderChain(true);
        AudioService.playTick();
        showToast('Cleared all chain segments');
      });
    }

    if (dom.chainsZoomFitBtn) {
      dom.chainsZoomFitBtn.addEventListener('click', () => {
        calculateAndRenderChain(false);
        AudioService.playTick();
        showToast('Viewport reset to fit chain');
      });
    }

    // Template Chips
    document.querySelectorAll('.chain-template-chip[data-template]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tplKey = chip.dataset.template;
        loadChainTemplate(tplKey);
      });
    });

    if (dom.btnRunChains) {
      dom.btnRunChains.addEventListener('click', () => {
        calculateAndRenderChain(true);
      });
    }

    // Multi-Scale Comparison Handoff
    if (dom.chainsCompareMultiscaleBtn) {
      dom.chainsCompareMultiscaleBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (!state.lastValidChain || !state.lastValidChain.isValid) {
          showToast('No valid chain calculation to compare', 'warning');
          return;
        }

        let dimToCompare = state.lastValidChain.overallExtentFormatted;
        if (state.chainSelectedSegmentId) {
          const sel = state.lastValidChain.segments.find(s => s.id === state.chainSelectedSegmentId);
          if (sel) {
            dimToCompare = sel.lengthFormatted;
          }
        }

        switchMode('multiscale');
        if (dom.multiscaleInput) {
          dom.multiscaleInput.value = dimToCompare;
          calculateMultiScale(true);
        }
        AudioService.playTick();
        showToast(`Loaded ${dimToCompare} into Multi-Scale Comparison`);
      });
    }

    // Send to Dimension Workspace Handoff
    if (dom.chainsSendWorkspaceBtn) {
      dom.chainsSendWorkspaceBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (!state.lastValidChain || !state.lastValidChain.isValid) {
          showToast('No valid chain to send to Workspace', 'warning');
          return;
        }

        const wsGroup = convertChainToWorkspaceGroup(state.lastValidChain);
        if (wsGroup.entries.length === 0) {
          showToast('No segments in chain to send', 'warning');
          return;
        }

        if (!state.workspace.groups) state.workspace.groups = [];
        state.workspace.groups.push(wsGroup.group);
        state.workspace.entries.push(...wsGroup.entries);

        saveWorkspace();
        renderWorkspace();
        AudioService.playTick();
        showToast(`Added group "${wsGroup.group.name}" with ${wsGroup.entries.length} entries to Workspace`);
      });
    }

    // Save to Calculation Journal Handoff
    if (dom.chainsSaveJournalBtn) {
      dom.chainsSaveJournalBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain && state.lastValidChain.isValid) {
          logCurrentCalculationToHistory('chains');
          AudioService.playTick();
        } else {
          showToast('No valid chain calculation to log', 'warning');
        }
      });
    }

    // Multi-Stream Copy Buttons
    if (dom.chainsCopyTableBtn) {
      dom.chainsCopyTableBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'table');
          copyToClipboard(out, 'Dimension Chain Table');
        }
      });
    }

    if (dom.chainsCopyCumBtn) {
      dom.chainsCopyCumBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'cumulative');
          copyToClipboard(out, 'Cumulative Running Coordinates');
        }
      });
    }

    if (dom.chainsCopySegsBtn) {
      dom.chainsCopySegsBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'segments');
          copyToClipboard(out, 'Segment Lengths');
        }
      });
    }

    if (dom.chainsCopyDrawBtn) {
      dom.chainsCopyDrawBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const out = formatChainForClipboard(state.lastValidChain, 'drawing');
          copyToClipboard(out, 'Scaled Drawing Dimensions');
        }
      });
    }

    if (dom.chainsExportTsvBtn) {
      dom.chainsExportTsvBtn.addEventListener('click', () => {
        calculateAndRenderChain(true);
        if (state.lastValidChain) {
          const tsvContent = formatChainForClipboard(state.lastValidChain, 'tsv');
          const fileName = `${(state.activeChain.name || 'Dimension_Chain').replace(/\s+/g, '_')}.tsv`;
          downloadFile(tsvContent, fileName, 'text/tab-separated-values');
          AudioService.playTick();
          showToast(`Exported ${fileName}`);
        }
      });
    }

    // Mode 11: CAD Clipboard Listeners
    if (dom.cadQuickChips) {
      dom.cadQuickChips.querySelectorAll('.cad-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          applyCadPreset(chip.dataset.preset);
        });
      });
    }

    if (dom.cadSourcePills) {
      dom.cadSourcePills.querySelectorAll('.cad-source-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          state.cadClipboard.source = pill.dataset.source;
          renderCadClipboard(true);
          AudioService.playTick();
        });
      });
    }

    if (dom.cadManualInput) {
      dom.cadManualInput.addEventListener('input', (e) => {
        state.cadClipboard.manualInput = e.target.value;
        renderCadClipboard(false);
      });
    }

    const cadSelects = [
      dom.cadTargetSelect,
      dom.cadUnitSelect,
      dom.cadPrecisionSelect,
      dom.cadSuffixSelect,
      dom.cadDelimiterSelect,
      dom.cadScopeSelect
    ];
    cadSelects.forEach(sel => {
      if (sel) {
        sel.addEventListener('change', () => {
          renderCadClipboard(true);
          AudioService.playTick();
        });
      }
    });

    if (dom.btnRunCadClipboard) {
      dom.btnRunCadClipboard.addEventListener('click', () => {
        renderCadClipboard(true);
      });
    }

    if (dom.btnCadCopyMain) {
      dom.btnCadCopyMain.addEventListener('click', () => {
        copyCadClipboardData();
      });
    }

    if (dom.btnCadCopyRaw) {
      dom.btnCadCopyRaw.addEventListener('click', () => {
        copyCadClipboardData({ suffix: 'none', format: 'generic', delimiter: 'space' });
      });
    }

    if (dom.btnCadCopyUnits) {
      dom.btnCadCopyUnits.addEventListener('click', () => {
        copyCadClipboardData({ suffix: 'symbol' });
      });
    }

    if (dom.btnCadCopyTsv) {
      dom.btnCadCopyTsv.addEventListener('click', () => {
        copyCadClipboardData({ format: 'spreadsheet', delimiter: 'tsv' });
      });
    }

    if (dom.btnCadExportTxt) {
      dom.btnCadExportTxt.addEventListener('click', () => {
        renderCadClipboard(true);
        const text = state.cadClipboard.lastFormattedText;
        if (text) {
          downloadFile(text, 'CAD_Dimensions.txt', 'text/plain');
          AudioService.playTick();
          showToast('Exported CAD_Dimensions.txt');
        } else {
          showToast('No CAD dimension data to export', 'warning');
        }
      });
    }

    // Cross-Mode CAD Handoff Buttons
    if (dom.wsOpenCadBtn) {
      dom.wsOpenCadBtn.addEventListener('click', () => {
        openCadClipboardWithSource('workspace');
      });
    }

    if (dom.exprCadHandoffBtn) {
      dom.exprCadHandoffBtn.addEventListener('click', () => {
        openCadClipboardWithSource('expression');
      });
    }

    if (dom.msCadHandoffBtn) {
      dom.msCadHandoffBtn.addEventListener('click', () => {
        openCadClipboardWithSource('multiscale');
      });
    }

    if (dom.chainsCadHandoffBtn) {
      dom.chainsCadHandoffBtn.addEventListener('click', () => {
        openCadClipboardWithSource('chain');
      });
    }

    // Mode 12: Batch CAD Conversion Listeners
    if (dom.batchQuickChips) {
      dom.batchQuickChips.querySelectorAll('.cad-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          applyBatchPreset(chip.dataset.preset);
        });
      });
    }

    if (dom.batchPasteInput) {
      dom.batchPasteInput.addEventListener('input', () => {
        const val = dom.batchPasteInput.value;
        const detected = detectBatchDelimiter(val);
        if (dom.batchDelimiterBadge) {
          dom.batchDelimiterBadge.textContent = `FORMAT: ${detected.toUpperCase()}`;
        }
      });

      dom.batchPasteInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          parseAndConvertBatch(true);
        }
      });
    }

    if (dom.batchModeSelect) {
      dom.batchModeSelect.addEventListener('change', () => {
        state.batchCad.mode = dom.batchModeSelect.value;
        updateBatchModeVisibility();
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchSourceScaleSelect) {
      dom.batchSourceScaleSelect.addEventListener('change', () => {
        state.batchCad.sourceScale = parseInt(dom.batchSourceScaleSelect.value, 10) || 50;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchTargetScaleSelect) {
      dom.batchTargetScaleSelect.addEventListener('change', () => {
        state.batchCad.targetScale = parseInt(dom.batchTargetScaleSelect.value, 10) || 50;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchSourceUnitSelect) {
      dom.batchSourceUnitSelect.addEventListener('change', () => {
        state.batchCad.sourceUnit = dom.batchSourceUnitSelect.value;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchTargetUnitSelect) {
      dom.batchTargetUnitSelect.addEventListener('change', () => {
        state.batchCad.targetUnit = dom.batchTargetUnitSelect.value;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchPrecisionSelect) {
      dom.batchPrecisionSelect.addEventListener('change', () => {
        state.batchCad.precision = parseInt(dom.batchPrecisionSelect.value, 10) || 2;
        parseAndConvertBatch(false);
      });
    }

    if (dom.batchDelimiterSelect) {
      dom.batchDelimiterSelect.addEventListener('change', () => {
        state.batchCad.delimiter = dom.batchDelimiterSelect.value;
        parseAndConvertBatch(false);
      });
    }

    if (dom.btnRunBatchCad) {
      dom.btnRunBatchCad.addEventListener('click', () => {
        parseAndConvertBatch(true);
      });
    }

    if (dom.batchFilterPills) {
      dom.batchFilterPills.querySelectorAll('.cad-preset-chip').forEach(pill => {
        pill.addEventListener('click', () => {
          state.batchCad.activeFilter = pill.dataset.filter;
          dom.batchFilterPills.querySelectorAll('.cad-preset-chip').forEach(p => {
            p.classList.toggle('active', p === pill);
          });
          renderBatchResults();
          AudioService.playTick();
        });
      });
    }

    if (dom.batchSelectAllBtn) {
      dom.batchSelectAllBtn.addEventListener('click', () => {
        if (state.batchCad.lastResult && state.batchCad.lastResult.rows) {
          state.batchCad.lastResult.rows.forEach(r => state.batchCad.selectedIds.add(r.id));
          renderBatchResults();
          AudioService.playTick();
        }
      });
    }

    if (dom.batchClearSelectionBtn) {
      dom.batchClearSelectionBtn.addEventListener('click', () => {
        state.batchCad.selectedIds.clear();
        renderBatchResults();
        AudioService.playTick();
      });
    }

    if (dom.batchMasterCheckbox) {
      dom.batchMasterCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (state.batchCad.lastResult && state.batchCad.lastResult.rows) {
          if (checked) {
            state.batchCad.lastResult.rows.forEach(r => state.batchCad.selectedIds.add(r.id));
          } else {
            state.batchCad.selectedIds.clear();
          }
          renderBatchResults();
          AudioService.playTick();
        }
      });
    }

    if (dom.batchLoadSampleBtn) {
      dom.batchLoadSampleBtn.addEventListener('click', () => {
        const sample = `Wall North = 4800mm\nSEG Wall South = 3200mm\nWindow 1 = 1800 + 300\nALW Tolerance = 20mm\nDoor Entrance = 900\n2.4m\n7' 6"`;
        if (dom.batchPasteInput) dom.batchPasteInput.value = sample;
        state.batchCad.rawInput = sample;
        parseAndConvertBatch(true);
      });
    }

    // Export & Action toolbar buttons
    if (dom.batchCopyResultsBtn) {
      dom.batchCopyResultsBtn.addEventListener('click', () => {
        copyBatchData('results_only');
      });
    }

    if (dom.batchCopyRawBtn) {
      dom.batchCopyRawBtn.addEventListener('click', () => {
        copyBatchData('raw_numbers');
      });
    }

    if (dom.batchCopyTsvBtn) {
      dom.batchCopyTsvBtn.addEventListener('click', () => {
        copyBatchData('tsv_schedule');
      });
    }

    if (dom.batchOpenCadBtn) {
      dom.batchOpenCadBtn.addEventListener('click', () => {
        sendBatchToCadClipboard();
      });
    }

    if (dom.batchSendWorkspaceBtn) {
      dom.batchSendWorkspaceBtn.addEventListener('click', () => {
        sendBatchToWorkspace();
      });
    }

    if (dom.batchCompareMultiscaleBtn) {
      dom.batchCompareMultiscaleBtn.addEventListener('click', () => {
        sendBatchToMultiScale();
      });
    }

    if (dom.batchCreateChainBtn) {
      dom.batchCreateChainBtn.addEventListener('click', () => {
        sendBatchToChains();
      });
    }

    if (dom.batchSaveJournalBtn) {
      dom.batchSaveJournalBtn.addEventListener('click', () => {
        const result = state.batchCad.lastResult;
        if (!result || !result.rows || result.rows.length === 0) {
          showToast('No batch conversion to save', 'warning');
          return;
        }
        HistoryService.addEntry({
          toolMode: 'batch_cad',
          title: `Batch CAD (${result.summary?.validRows || 0} rows)`,
          inputString: `${result.config?.mode || 'Batch'} (${result.config?.sourceUnit || 'mm'} ➔ ${result.config?.targetUnit || 'mm'})`,
          resultString: `${result.summary?.validRows || 0} valid / ${result.summary?.totalRows || 0} total`,
          metadata: {
            mode: result.config?.mode,
            totalRows: result.summary?.totalRows,
            validRows: result.summary?.validRows,
            totalCanonicalMeters: result.summary?.totalCanonicalMeters
          }
        });
        renderHistoryList();
        AudioService.playTick();
        showToast('Saved batch conversion to calculation journal');
      });
    }

    // Quick Dimension Strip Event Listeners
    if (dom.quickDimToggleBtn) {
      dom.quickDimToggleBtn.addEventListener('click', () => {
        toggleQuickDimension();
      });
    }

    if (dom.quickDimCloseBtn) {
      dom.quickDimCloseBtn.addEventListener('click', () => {
        toggleQuickDimension(false);
      });
    }

    if (dom.quickDimPinBtn) {
      dom.quickDimPinBtn.addEventListener('click', () => {
        toggleQuickDimPin();
      });
    }

    if (dom.quickDimModePills) {
      dom.quickDimModePills.querySelectorAll('.quick-mode-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          state.quickDimension.mode = pill.dataset.mode;
          dom.quickDimModePills.querySelectorAll('.quick-mode-pill').forEach(p => {
            p.classList.toggle('active', p === pill);
          });
          parseAndEvaluateQuickDimension(false);
          AudioService.playTick();
        });
      });
    }

    if (dom.quickDimScaleChips) {
      dom.quickDimScaleChips.querySelectorAll('.quick-scale-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const s = parseInt(chip.dataset.scale, 10);
          applyQuickScale(s);
        });
      });
    }

    if (dom.quickDimCustomScaleInput) {
      dom.quickDimCustomScaleInput.addEventListener('input', () => {
        const val = parseInt(dom.quickDimCustomScaleInput.value, 10);
        if (!isNaN(val) && val > 0) {
          applyQuickScale(val);
        }
      });
    }

    if (dom.quickDimInput) {
      dom.quickDimInput.addEventListener('input', () => {
        parseAndEvaluateQuickDimension(false);
      });

      dom.quickDimInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          parseAndEvaluateQuickDimension(true);
        } else if (e.key === 'Escape') {
          if (!state.quickDimension.pinned) {
            e.preventDefault();
            toggleQuickDimension(false);
          }
        }
      });
    }

    if (dom.btnRunQuickDim) {
      dom.btnRunQuickDim.addEventListener('click', () => {
        parseAndEvaluateQuickDimension(true);
      });
    }

    if (dom.quickDimCopyRealBtn) {
      dom.quickDimCopyRealBtn.addEventListener('click', () => {
        copyQuickDimension('real');
      });
    }

    if (dom.quickDimCopyDrawBtn) {
      dom.quickDimCopyDrawBtn.addEventListener('click', () => {
        copyQuickDimension('drawing');
      });
    }

    if (dom.quickDimCopyCadBtn) {
      dom.quickDimCopyCadBtn.addEventListener('click', () => {
        copyQuickDimension('cad_numbers');
      });
    }

    if (dom.quickDimCopyMatrixBtn) {
      dom.quickDimCopyMatrixBtn.addEventListener('click', () => {
        copyQuickDimension('all_scales');
      });
    }

    if (dom.quickDimSendWorkspaceBtn) {
      dom.quickDimSendWorkspaceBtn.addEventListener('click', () => {
        handoffQuickDimension('workspace');
      });
    }

    if (dom.quickDimSendMultiscaleBtn) {
      dom.quickDimSendMultiscaleBtn.addEventListener('click', () => {
        handoffQuickDimension('multiscale');
      });
    }

    if (dom.quickDimSendChainBtn) {
      dom.quickDimSendChainBtn.addEventListener('click', () => {
        handoffQuickDimension('chain');
      });
    }

    if (dom.quickDimSendCadBtn) {
      dom.quickDimSendCadBtn.addEventListener('click', () => {
        handoffQuickDimension('cad_clipboard');
      });
    }

    if (dom.quickDimSaveJournalBtn) {
      dom.quickDimSaveJournalBtn.addEventListener('click', () => {
        handoffQuickDimension('journal');
      });
    }

    // Keyboard Global Shortcuts
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');

      // Global CAD Clipboard Shortcut: Ctrl+Shift+C or Cmd+Shift+C (Works everywhere)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        switchMode('cad_clipboard');
        return;
      }

      // Global Command Palette Shortcut: Ctrl+K or Cmd+K (Works everywhere)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dom.commandPaletteModal?.classList.contains('open')) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // Esc closes Command Palette first, then drawers/modals/selection/quick-strip
      if (e.key === 'Escape') {
        if (dom.commandPaletteModal?.classList.contains('open')) {
          e.preventDefault();
          e.stopPropagation();
          closeCommandPalette();
          return;
        }
        if (dom.historyDrawer?.classList.contains('open')) toggleHistoryDrawer();
        if (dom.shortcutsModal?.classList.contains('open')) {
          dom.shortcutsModal.classList.remove('open');
          dom.modalBackdrop?.classList.remove('open');
        }
        if (state.currentMode === 'workspace' && state.workspaceSelectedIds.size > 0) {
          state.workspaceSelectedIds.clear();
          renderWorkspace();
          return;
        }
        if (state.quickDimension.isOpen && !state.quickDimension.pinned) {
          toggleQuickDimension(false);
          return;
        }
        if (activeEl && activeEl.blur) activeEl.blur();
        return;
      }

      // Quick Add form shortcut: Ctrl+Enter or Cmd+Enter inside form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && state.currentMode === 'workspace') {
        if (dom.workspaceAddForm) {
          e.preventDefault();
          dom.workspaceAddForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          return;
        }
      }

      // If user is focused inside an input field, do not hijack letter/number shortcuts
      if (isInputFocused) return;

      // Mode 7 Workspace-specific shortcuts (when not focused in inputs)
      if (state.currentMode === 'workspace') {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          dom.workspaceAddInput?.focus();
          dom.workspaceAddInput?.select();
          return;
        }
        if (e.key === 'd' || e.key === 'D') {
          if (state.workspaceSelectedIds.size === 1) {
            e.preventDefault();
            const id = Array.from(state.workspaceSelectedIds)[0];
            const idx = state.workspace.entries.findIndex(x => x.id === id);
            if (idx !== -1) {
              const dup = duplicateDimensionEntry(state.workspace.entries[idx]);
              state.workspace.entries.splice(idx + 1, 0, dup);
              saveWorkspace();
              renderWorkspace();
              AudioService.playTick();
              showToast(`Duplicated "${dup.name}"`);
            }
            return;
          }
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (state.workspaceSelectedIds.size > 0) {
            e.preventDefault();
            const count = state.workspaceSelectedIds.size;
            state.workspace.entries = state.workspace.entries.filter(x => !state.workspaceSelectedIds.has(x.id));
            state.workspaceSelectedIds.clear();
            saveWorkspace();
            renderWorkspace();
            AudioService.playTick();
            showToast(`Deleted ${count} selected dimension${count > 1 ? 's' : ''}`);
            return;
          }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          if (state.workspaceSelectedIds.size > 0) {
            e.preventDefault();
            const text = formatWorkspaceForClipboard(state.workspace.entries, state.workspace.scaleRatio, state.workspace.displayUnit, {
              mode: 'selected',
              selectedIds: Array.from(state.workspaceSelectedIds),
              groups: state.workspace.groups
            });
            copyToClipboard(text, `${state.workspaceSelectedIds.size} Selected Dimensions`);
            return;
          }
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (state.workspace.entries.length > 0) {
            e.preventDefault();
            const ids = state.workspace.entries.map(x => x.id);
            const currentSelectedId = Array.from(state.workspaceSelectedIds)[0];
            let currentIdx = ids.indexOf(currentSelectedId);
            let nextIdx = 0;
            if (e.key === 'ArrowDown') {
              nextIdx = currentIdx === -1 ? 0 : Math.min(ids.length - 1, currentIdx + 1);
            } else {
              nextIdx = currentIdx === -1 ? ids.length - 1 : Math.max(0, currentIdx - 1);
            }
            state.workspaceSelectedIds.clear();
            state.workspaceSelectedIds.add(ids[nextIdx]);
            renderWorkspace();
            return;
          }
        }
      }

      if (e.key === '1') { e.preventDefault(); switchMode('converter'); }
      else if (e.key === '2') { e.preventDefault(); switchMode('rescale'); }
      else if (e.key === '3') { e.preventDefault(); switchMode('detector'); }
      else if (e.key === '4') { e.preventDefault(); switchMode('area_volume'); }
      else if (e.key === '5') { e.preventDefault(); switchMode('furniture'); }
      else if (e.key === '6') { e.preventDefault(); switchMode('reference'); }
      else if (e.key === '7') { e.preventDefault(); switchMode('workspace'); }
      else if (e.key === '8') { e.preventDefault(); switchMode('expression'); }
      else if (e.key === '9') { e.preventDefault(); switchMode('multiscale'); }
      else if (e.key === '0') { e.preventDefault(); switchMode('chains'); }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); switchMode('cad_clipboard'); }
      else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); switchMode('batch_cad'); }
      else if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); toggleQuickDimension(); }
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); swapDirection(); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleHistoryDrawer(); }
      else if (e.key === '?') {
        e.preventDefault();
        dom.shortcutsModal?.classList.add('open');
        dom.modalBackdrop?.classList.add('open');
      }
    });
  }

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------------------------------------------------------------------------
  // 15. Initial Bootstrapping
  // ---------------------------------------------------------------------------
  applyTheme(state.activeTheme);
  updateSoundUI();
  populateUnitSelects();
  renderPresetChips(state.selectedCategory);
  attachEventListeners();
  if (state.quickDimension.isOpen || state.quickDimension.pinned) {
    toggleQuickDimension(true);
    if (state.quickDimension.pinned && dom.quickDimPinBtn) {
      dom.quickDimPinBtn.classList.add('pinned');
    }
  }
  switchMode(state.currentMode);
}



  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

})();
