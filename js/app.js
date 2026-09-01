/**
 * Architecture Helping Hand - Standalone Bundle v2.0.0
 * Compiled automatically from src/ modules. Works with file:/// and http:// protocols.
 * Generated on: 2026-09-01T02:21:27.737Z
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
 */
function getUnit(key) {
  return UNITS[key] || AREA_UNITS[key] || VOLUME_UNITS[key] || null;
}

/**
 * Convert a value between any two compatible units of the same dimension
 */
function convertUnit(value, fromKey, toKey) {
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

  // 1. Check for attached unit suffix (e.g. "15.5cm", "2.4m", "100mm", "12in", "6ft")
  const unitSuffixMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*([a-zA-Z²³_]+)$/);
  let rawNumericPart = trimmed;
  let detectedUnit = null;

  if (unitSuffixMatch) {
    const candidateUnit = unitSuffixMatch[2].toLowerCase();
    if (UNITS[candidateUnit]) {
      rawNumericPart = unitSuffixMatch[1];
      detectedUnit = candidateUnit;
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
      inches = Math.abs(parseFraction(feetInchesMatch[2])) || 0;
    }
    const totalInches = (feet * 12 + inches) * (isNegative ? -1 : 1);

    if (!allowNegative && totalInches < 0) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: totalInches, detectedUnit: 'in', isValid: true, error: null };
  }

  // 3. Standalone inch pattern: e.g. 6 1/2" or 12"
  const onlyInchesMatch = rawNumericPart.match(/^([+-]?\d+(?:\.\d+)?|[+-]?\d+\s+\d+\/\d+|\d+\/\d+)\s*["″]$/);
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
 */
function parseFraction(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;

  const clean = str.trim();
  const parts = clean.split(/\s+/);

  if (parts.length === 2) {
    const whole = parseFloat(parts[0]);
    if (isNaN(whole)) return NaN;

    const fracParts = parts[1].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (isNaN(num) || isNaN(den) || den === 0) return NaN;
      return whole >= 0 ? whole + (num / den) : whole - (num / den);
    }
    return NaN;
  } else if (parts.length === 1) {
    const fracParts = parts[0].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (isNaN(num) || isNaN(den) || den === 0) return NaN;
      return num / den;
    }
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
 * Scale linear dimension between Drawing (paper) and Real-World measurements
 * @param {Object} params
 * @param {number} params.value - Measured value
 * @param {string} params.unitKey - Unit key of the input (e.g. 'cm', 'm', 'in')
 * @param {number} params.ratio - Scale denominator ratio (e.g. 50 for 1:50)
 * @param {'drawing_to_real'|'real_to_drawing'} [params.direction='drawing_to_real']
 * @param {string} [params.targetUnitKey] - Desired output unit key
 * @returns {Object} Normalized result object with realMeters, drawingMeters, targetValue, etc.
 */
function scaleDimension(params) {
  const {
    value = 0,
    unitKey = 'cm',
    ratio = 50,
    direction = 'drawing_to_real',
    targetUnitKey
  } = params;

  if (ratio <= 0 || isNaN(ratio) || !isFinite(ratio)) {
    throw new Error('Scale ratio must be a positive finite number greater than 0');
  }

  const inputUnit = UNITS[unitKey] || UNITS.cm;
  let targetUnit;
  let realMeters = 0;
  let drawingMeters = 0;
  let targetValue = 0;

  if (direction === 'drawing_to_real') {
    targetUnit = UNITS[targetUnitKey] || UNITS.m;
    drawingMeters = value * inputUnit.toMeters;
    realMeters = drawingMeters * ratio;
    targetValue = realMeters / targetUnit.toMeters;
  } else {
    targetUnit = UNITS[targetUnitKey] || UNITS.cm;
    realMeters = value * inputUnit.toMeters;
    drawingMeters = realMeters / ratio;
    targetValue = drawingMeters / targetUnit.toMeters;
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
function drawingToReal({ drawingVal, drawingUnitKey = 'cm', scaleRatio = 50, realUnitKey = 'm' }) {
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
function realToDrawing({ realVal, realUnitKey = 'm', scaleRatio = 50, drawingUnitKey = 'cm' }) {
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
function rescaleDrawing({ originalVal = 0, originalUnitKey = 'cm', originalRatio = 50, targetRatio = 200, targetUnitKey = 'cm' }) {
  if (originalRatio <= 0 || targetRatio <= 0) {
    throw new Error('Scale ratios must be greater than 0');
  }

  const origUnit = UNITS[originalUnitKey] || UNITS.cm;
  const targetUnit = UNITS[targetUnitKey] || UNITS.cm;

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
 * Detect unknown scale ratio from measured paper distance and known real-world dimension
 */
function detectScale({ paperVal = 0, paperUnitKey = 'cm', realVal = 0, realUnitKey = 'm' }) {
  const paperUnit = UNITS[paperUnitKey] || UNITS.cm;
  const realUnit = UNITS[realUnitKey] || UNITS.m;

  const paperMeters = paperVal * paperUnit.toMeters;
  const realMeters = realVal * realUnit.toMeters;

  if (paperMeters <= 0 || realMeters <= 0 || isNaN(paperMeters) || isNaN(realMeters)) {
    return { ratio: 0, ratioString: 'N/A', closestPreset: null, error: 'Dimensions must be positive numbers greater than 0' };
  }

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
function scaleArea({ areaVal = 0, inputUnitKey = 'cm2', scaleRatio = 100, outputUnitKey = 'm2', isDrawingToReal = true }) {
  if (scaleRatio <= 0) throw new Error('Scale ratio must be greater than 0');

  const inputUnit = AREA_UNITS[inputUnitKey] || AREA_UNITS.cm2;
  const outputUnit = AREA_UNITS[outputUnitKey] || AREA_UNITS.m2;
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
function scaleVolume({ volumeVal = 0, inputUnitKey = 'cm3', scaleRatio = 100, outputUnitKey = 'm3', isDrawingToReal = true }) {
  if (scaleRatio <= 0) throw new Error('Scale ratio must be greater than 0');

  const inputUnit = VOLUME_UNITS[inputUnitKey] || VOLUME_UNITS.cm3;
  const outputUnit = VOLUME_UNITS[outputUnitKey] || VOLUME_UNITS.m3;
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
 * Generate parallel breakdown of all unit equivalents for a given real dimension in meters
 */
function getAllUnitEquivalents(meters) {
  const safeMeters = isNaN(meters) || !isFinite(meters) ? 0 : meters;

  const metric = [
    { key: 'mm', label: 'Millimeters', val: safeMeters / UNITS.mm.toMeters, symbol: 'mm' },
    { key: 'cm', label: 'Centimeters', val: safeMeters / UNITS.cm.toMeters, symbol: 'cm' },
    { key: 'dm', label: 'Decimeters', val: safeMeters / UNITS.dm.toMeters, symbol: 'dm' },
    { key: 'm',  label: 'Meters', val: safeMeters / UNITS.m.toMeters, symbol: 'm' },
    { key: 'km', label: 'Kilometers', val: safeMeters / UNITS.km.toMeters, symbol: 'km' }
  ];

  const imperial = [
    { key: 'in', label: 'Inches', val: safeMeters / UNITS.in.toMeters, symbol: 'in' },
    { key: 'ft', label: 'Feet (Decimal)', val: safeMeters / UNITS.ft.toMeters, symbol: 'ft' },
    { key: 'ft_in', label: 'Architectural (Ft-In)', val: formatFeetInches(safeMeters / UNITS.in.toMeters), symbol: '' },
    { key: 'yd', label: 'Yards', val: safeMeters / UNITS.yd.toMeters, symbol: 'yd' },
    { key: 'mi', label: 'Miles', val: safeMeters / UNITS.mi.toMeters, symbol: 'mi' }
  ];

  return { metric, imperial };
}


  // =========================================================================
  // MODULE: Furniture
  // =========================================================================

/**
 * Architecture Helping Hand - Furniture & Fixtures Database & Visualizer
 */
const FURNITURE_DATABASE = Object.freeze([
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
function getScaledFurnitureDimensions(item, ratio = 50, paperUnitKey = 'cm') {
  const paperUnit = UNITS[paperUnitKey] || UNITS.cm;

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
function filterFurnitureCatalog(items, query = '', category = 'all') {
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

try {
  const saved = StorageService.getItem(HISTORY_STORAGE_KEY);
  if (saved) {
    historyList = JSON.parse(saved);
  }
} catch (e) {
  historyList = [];
}
const HistoryService = {
  getHistory() {
    return [...historyList];
  },

  addEntry(entry) {
    const item = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
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
  },

  exportMarkdown() {
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
};


  // =========================================================================
  // MODULE: Visualizer
  // =========================================================================

/**
 * Architecture Helping Hand - Proportional Visualizer & Graphic Scale Bar Renderer
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
          <circle cx="40" cy="62" r="11" fill="var(--bg-card)" stroke="currentColor" stroke-width="3"/>
          <circle cx="40" cy="62" r="4" fill="currentColor"/>
          <circle cx="105" cy="62" r="11" fill="var(--bg-card)" stroke="currentColor" stroke-width="3"/>
          <circle cx="105" cy="62" r="4" fill="currentColor"/>
          <path d="M48,28 L80,28 L80,44 L38,44 Z" fill-opacity="0.3"/>
          <path d="M85,28 L108,38 L108,44 L85,44 Z" fill-opacity="0.3"/>
        </svg>
      `;
    case 'house':
      return `
        <svg viewBox="0 0 120 100" class="silhouette-svg" fill="currentColor">
          <polygon points="60,15 15,48 105,48" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
          <rect x="25" y="48" width="70" height="42" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>
          <rect x="52" y="62" width="16" height="28" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
          <rect x="33" y="55" width="12" height="12" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
          <rect x="75" y="55" width="12" height="12" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
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
function renderGraphicScaleBar(scaleRatio, realMeters) {
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
      <div class="scale-bar-labels">
        <span>0</span>
        <span>${formatNumber(divisionMeters, 1)}m</span>
        <span>${formatNumber(divisionMeters * 2, 1)}m</span>
        <span>${formatNumber(divisionMeters * 3, 1)}m</span>
        <span>${formatNumber(totalLengthM, 1)}m</span>
      </div>
      <div class="scale-bar-track">
        ${segments.map(s => `
          <div class="scale-bar-segment ${s.filled ? 'filled' : 'empty'}"></div>
        `).join('')}
      </div>
      <div class="scale-bar-caption">Graphic Architectural Scale Bar @ 1:${scaleRatio}</div>
    </div>
  `;
}
function updateVisualization({ containerElement, drawingVal, drawingUnit, realVal, realUnit, realMeters, scaleRatio }) {
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
            <div class="dim-tick start"></div>
            <div class="dim-label">${drawingVal} ${drawingUnit} on paper = ${formatNumber(realVal, 2)} ${realUnit}</div>
            <div class="dim-tick end"></div>
          </div>
          <div class="scene-comparison-text">${comparisonText}</div>
        </div>

        <div class="scene-silhouette-box">
          ${refSvg}
        </div>
      </div>

      <div class="visual-scale-bar-container">
        ${scaleBarHtml}
      </div>
    </div>
  `;
}


  // =========================================================================
  // MODULE: App
  // =========================================================================

/**
 * Architecture Helping Hand - Main Application UI Controller
 */




import {
  scaleDimension,
  drawingToReal,
  realToDrawing,
  rescaleDrawing,
  detectScale,
  scaleArea,
  scaleVolume,
  getAllUnitEquivalents
} from '../core/calculator.js';
import {
  FURNITURE_DATABASE,
  getScaledFurnitureDimensions,
  filterFurnitureCatalog
} from '../core/furniture.js';
function initializeApp() {
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
    detectPaperVal: 4.5,
    detectPaperUnit: 'cm',
    detectRealVal: 9.0,
    detectRealUnit: 'm',

    // Mode 4: Area & Volume
    calcType: 'area',
    calcDirection: 'drawing_to_real',
    areaVal: 4,
    areaInputUnit: 'cm2',
    areaRatio: 100,
    areaOutputUnit: 'm2',
    volumeVal: 1000,
    volumeInputUnit: 'cm3',
    volumeRatio: 50,
    volumeOutputUnit: 'm3',

    // Mode 5: Furniture
    furnitureSearchQuery: '',
    furnitureActiveCategory: 'all',
    furnitureScaleRatio: 50,
    furniturePaperUnit: 'cm',
    customFurnW: 240,
    customFurnD: 100,
    customFurnH: 75,
    customFurnUnit: 'cm',

    // Mode 6: Reference
    refScaleRatio: 50
  };

  // DOM Elements Cache
  const dom = {
    themeSelect: document.getElementById('theme-select'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
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
    historyList: document.getElementById('history-list'),
    toastContainer: document.getElementById('toast-container'),
    navTabs: document.querySelectorAll('.nav-tab'),
    toolContainers: document.querySelectorAll('.tool-container'),

    // Mode 1 Elements
    inputDrawingVal: document.getElementById('input-drawing-val'),
    selectDrawingUnit: document.getElementById('select-drawing-unit'),
    inputRealVal: document.getElementById('input-real-val'),
    selectRealUnit: document.getElementById('select-real-unit'),
    swapDirectionBtn: document.getElementById('swap-direction-btn'),
    customRatioInput: document.getElementById('custom-ratio-input'),
    scalePresetPills: document.getElementById('scale-preset-pills'),
    presetCategoryTabs: document.querySelectorAll('.preset-cat-btn'),
    activeScaleBadge: document.getElementById('active-scale-badge'),
    visualizerContainer: document.getElementById('visualizer-container'),
    metricBreakdownList: document.getElementById('metric-breakdown-list'),
    imperialBreakdownList: document.getElementById('imperial-breakdown-list'),
    btnCopyResult: document.getElementById('btn-copy-result'),

    // Mode 2 Elements
    rescaleOrigInput: document.getElementById('rescale-orig-val'),
    rescaleOrigUnit: document.getElementById('rescale-orig-unit'),
    rescaleOrigRatioSelect: document.getElementById('rescale-orig-ratio-select'),
    rescaleTargetRatioSelect: document.getElementById('rescale-target-ratio-select'),
    rescaleTargetUnit: document.getElementById('rescale-target-unit'),
    rescaleResultVal: document.getElementById('rescale-result-val'),
    rescaleResultUnitBadge: document.getElementById('rescale-result-unit-badge'),
    rescaleFactorBadge: document.getElementById('rescale-factor-badge'),
    rescaleRealSpan: document.getElementById('rescale-real-span'),
    btnCopyRescale: document.getElementById('btn-copy-rescale'),

    // Mode 3 Elements
    detectPaperInput: document.getElementById('detect-paper-val'),
    detectPaperUnit: document.getElementById('detect-paper-unit'),
    detectRealInput: document.getElementById('detect-real-val'),
    detectRealUnit: document.getElementById('detect-real-unit'),
    detectedRatioBadge: document.getElementById('detected-ratio-badge'),
    closestPresetName: document.getElementById('closest-preset-name'),
    closestPresetDiff: document.getElementById('closest-preset-diff'),
    btnApplyDetected: document.getElementById('btn-apply-detected'),

    // Mode 4 Elements
    areaVolTypeTabs: document.querySelectorAll('.type-subtab'),
    areaVolDirTabs: document.querySelectorAll('.dir-subtab'),
    areaSection: document.getElementById('area-section'),
    volumeSection: document.getElementById('volume-section'),
    areaInputVal: document.getElementById('area-input-val'),
    areaInputUnit: document.getElementById('area-input-unit'),
    areaRatioSelect: document.getElementById('area-ratio-select'),
    areaOutputUnit: document.getElementById('area-output-unit'),
    areaResultVal: document.getElementById('area-result-val'),
    areaResultUnitBadge: document.getElementById('area-result-unit-badge'),
    btnCopyArea: document.getElementById('btn-copy-area'),
    volumeInputVal: document.getElementById('volume-input-val'),
    volumeInputUnit: document.getElementById('volume-input-unit'),
    volumeRatioSelect: document.getElementById('volume-ratio-select'),
    volumeOutputUnit: document.getElementById('volume-output-unit'),
    volumeResultVal: document.getElementById('volume-result-val'),
    volumeResultUnitBadge: document.getElementById('volume-result-unit-badge'),
    btnCopyVolume: document.getElementById('btn-copy-volume'),

    // Mode 5 Elements (Furniture)
    furnitureSearchInput: document.getElementById('furniture-search-input'),
    furnitureSearchClear: document.getElementById('furniture-search-clear'),
    furnitureCountBadge: document.getElementById('furniture-count-badge'),
    furnitureCategoryTabs: document.querySelectorAll('.furn-cat-btn'),
    furnitureScaleSelect: document.getElementById('furniture-scale-select'),
    furniturePaperUnitSelect: document.getElementById('furniture-paper-unit-select'),
    furnitureGrid: document.getElementById('furniture-grid'),
    customFurnWInput: document.getElementById('custom-furn-w'),
    customFurnDInput: document.getElementById('custom-furn-d'),
    customFurnHInput: document.getElementById('custom-furn-h'),
    customFurnUnitSelect: document.getElementById('custom-furn-unit'),
    customFurnPaperW: document.getElementById('custom-furn-paper-w'),
    customFurnPaperD: document.getElementById('custom-furn-paper-d'),
    btnCopyCustomFurn: document.getElementById('btn-copy-custom-furn'),
    btnSendCustomFurn: document.getElementById('btn-send-custom-furn'),

    // Mode 6 Elements
    refChartScaleSelect: document.getElementById('ref-chart-scale-select'),
    refChartTbody: document.getElementById('ref-chart-tbody'),
    btnPrintChart: document.getElementById('btn-print-chart')
  };

  // 1. Theme Initialization
  const savedTheme = StorageService.getItem('archiscale_theme') || 'dark';
  state.activeTheme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (dom.themeSelect) dom.themeSelect.value = savedTheme;

  // 2. Audio button status
  updateSoundButtonUI();

  // 3. Render Presets & Dropdowns
  populatePresetPills('architectural');
  populateSelectOptions();
  renderHistoryList();

  // 4. Initial Computations
  calculateConverter();
  calculateRescaler();
  calculateDetector();
  calculateAreaVolume();
  renderFurnitureGrid();
  calculateCustomFurniture();
  renderReferenceChart();

  // =========================================================================
  // CALCULATIONS & EVENT HANDLERS
  // =========================================================================

  function calculateConverter() {
    let rawInput = state.direction === 'drawing_to_real'
      ? dom.inputDrawingVal?.value
      : dom.inputRealVal?.value;

    const parseResult = parseInput(rawInput, { allowNegative: false });
    const numericVal = parseResult.isValid ? parseResult.value : 0;

    let res;
    if (state.direction === 'drawing_to_real') {
      state.drawingVal = numericVal;
      res = drawingToReal({
        drawingVal: state.drawingVal,
        drawingUnitKey: state.drawingUnit,
        scaleRatio: state.scaleRatio,
        realUnitKey: state.realUnit
      });
      state.realVal = res.realValue;
      if (dom.inputRealVal) dom.inputRealVal.value = formatNumber(res.realValue, state.precision);
    } else {
      state.realVal = numericVal;
      res = realToDrawing({
        realVal: state.realVal,
        realUnitKey: state.realUnit,
        scaleRatio: state.scaleRatio,
        drawingUnitKey: state.drawingUnit
      });
      state.drawingVal = res.drawingValue;
      if (dom.inputDrawingVal) dom.inputDrawingVal.value = formatNumber(res.drawingValue, state.precision);
    }

    if (dom.activeScaleBadge) {
      dom.activeScaleBadge.textContent = `1:${state.scaleRatio}`;
    }

    updateVisualization({
      containerElement: dom.visualizerContainer,
      drawingVal: formatNumber(state.drawingVal, state.precision),
      drawingUnit: state.drawingUnit,
      realVal: state.realVal,
      realUnit: state.realUnit,
      realMeters: res.realMeters,
      scaleRatio: state.scaleRatio
    });

    renderEquivalents(res.realMeters);
  }

  function renderEquivalents(realMeters) {
    const { metric, imperial } = getAllUnitEquivalents(realMeters);

    if (dom.metricBreakdownList) {
      dom.metricBreakdownList.innerHTML = metric.map(u => `
        <div class="equiv-item ${u.key === state.realUnit && state.direction === 'drawing_to_real' ? 'active' : ''}">
          <span class="equiv-label">${u.label}</span>
          <span class="equiv-val">${formatNumber(u.val, state.precision)} <small>${u.symbol}</small></span>
        </div>
      `).join('');
    }

    if (dom.imperialBreakdownList) {
      dom.imperialBreakdownList.innerHTML = imperial.map(u => `
        <div class="equiv-item ${u.key === state.realUnit && state.direction === 'drawing_to_real' ? 'active' : ''}">
          <span class="equiv-label">${u.label}</span>
          <span class="equiv-val">${typeof u.val === 'number' ? formatNumber(u.val, state.precision) : u.val} <small>${u.symbol}</small></span>
        </div>
      `).join('');
    }
  }

  function calculateRescaler() {
    const parsed = parseInput(dom.rescaleOrigInput?.value, { allowNegative: false });
    state.rescaleOrigVal = parsed.isValid ? parsed.value : 0;
    state.rescaleOrigRatio = parseFloat(dom.rescaleOrigRatioSelect?.value) || 50;
    state.rescaleTargetRatio = parseFloat(dom.rescaleTargetRatioSelect?.value) || 200;
    state.rescaleOrigUnit = dom.rescaleOrigUnit?.value || 'cm';
    state.rescaleTargetUnit = dom.rescaleTargetUnit?.value || 'cm';

    try {
      const res = rescaleDrawing({
        originalVal: state.rescaleOrigVal,
        originalUnitKey: state.rescaleOrigUnit,
        originalRatio: state.rescaleOrigRatio,
        targetRatio: state.rescaleTargetRatio,
        targetUnitKey: state.rescaleTargetUnit
      });

      if (dom.rescaleResultVal) dom.rescaleResultVal.textContent = formatNumber(res.targetValue, state.precision);
      if (dom.rescaleResultUnitBadge) dom.rescaleResultUnitBadge.textContent = state.rescaleTargetUnit;
      if (dom.rescaleFactorBadge) {
        const pct = (res.factor * 100).toFixed(1);
        dom.rescaleFactorBadge.textContent = `${pct}% (${res.factor < 1 ? 'Reduction' : res.factor > 1 ? 'Magnification' : '1:1'})`;
      }
      if (dom.rescaleRealSpan) {
        dom.rescaleRealSpan.textContent = `${formatNumber(res.realMeters, 2)} m`;
      }
    } catch (e) {}
  }

  function calculateDetector() {
    const paperP = parseInput(dom.detectPaperInput?.value, { allowNegative: false });
    const realP = parseInput(dom.detectRealInput?.value, { allowNegative: false });

    state.detectPaperVal = paperP.isValid ? paperP.value : 0;
    state.detectPaperUnit = dom.detectPaperUnit?.value || 'cm';
    state.detectRealVal = realP.isValid ? realP.value : 0;
    state.detectRealUnit = dom.detectRealUnit?.value || 'm';

    const res = detectScale({
      paperVal: state.detectPaperVal,
      paperUnitKey: state.detectPaperUnit,
      realVal: state.detectRealVal,
      realUnitKey: state.detectRealUnit
    });

    if (dom.detectedRatioBadge) {
      dom.detectedRatioBadge.textContent = res.ratioString;
    }

    if (res.closestPreset && dom.closestPresetName && dom.closestPresetDiff) {
      dom.closestPresetName.textContent = res.closestPreset.name;
      dom.closestPresetDiff.textContent = res.isExactMatch ? 'Exact match' : `Δ ${res.closestPreset.percentDiff}%`;
    }
  }

  function calculateAreaVolume() {
    if (state.calcType === 'area') {
      const parsed = parseInput(dom.areaInputVal?.value, { allowNegative: false });
      state.areaVal = parsed.isValid ? parsed.value : 0;
      state.areaInputUnit = dom.areaInputUnit?.value || 'cm2';
      state.areaRatio = parseFloat(dom.areaRatioSelect?.value) || 100;
      state.areaOutputUnit = dom.areaOutputUnit?.value || 'm2';

      try {
        const res = scaleArea({
          areaVal: state.areaVal,
          inputUnitKey: state.areaInputUnit,
          scaleRatio: state.areaRatio,
          outputUnitKey: state.areaOutputUnit,
          isDrawingToReal: state.calcDirection === 'drawing_to_real'
        });

        if (dom.areaResultVal) dom.areaResultVal.textContent = formatNumber(res.resultValue, state.precision);
        if (dom.areaResultUnitBadge) dom.areaResultUnitBadge.textContent = state.areaOutputUnit;
      } catch (e) {}
    } else {
      const parsed = parseInput(dom.volumeInputVal?.value, { allowNegative: false });
      state.volumeVal = parsed.isValid ? parsed.value : 0;
      state.volumeInputUnit = dom.volumeInputUnit?.value || 'cm3';
      state.volumeRatio = parseFloat(dom.volumeRatioSelect?.value) || 50;
      state.volumeOutputUnit = dom.volumeOutputUnit?.value || 'm3';

      try {
        const res = scaleVolume({
          volumeVal: state.volumeVal,
          inputUnitKey: state.volumeInputUnit,
          scaleRatio: state.volumeRatio,
          outputUnitKey: state.volumeOutputUnit,
          isDrawingToReal: state.calcDirection === 'drawing_to_real'
        });

        if (dom.volumeResultVal) dom.volumeResultVal.textContent = formatNumber(res.resultValue, state.precision);
        if (dom.volumeResultUnitBadge) dom.volumeResultUnitBadge.textContent = state.volumeOutputUnit;
      } catch (e) {}
    }
  }

  function renderFurnitureGrid() {
    if (!dom.furnitureGrid) return;

    state.furnitureScaleRatio = parseFloat(dom.furnitureScaleSelect?.value) || 50;
    state.furniturePaperUnit = dom.furniturePaperUnitSelect?.value || 'cm';

    const filtered = filterFurnitureCatalog(
      FURNITURE_DATABASE,
      state.furnitureSearchQuery,
      state.furnitureActiveCategory
    );

    if (dom.furnitureCountBadge) {
      dom.furnitureCountBadge.textContent = `Showing ${filtered.length} of ${FURNITURE_DATABASE.length} items`;
    }

    if (filtered.length === 0) {
      dom.furnitureGrid.innerHTML = `
        <div class="empty-furn-state">
          <div class="empty-furn-icon">🔍</div>
          <div class="empty-furn-title">No matching furniture pieces found</div>
          <div class="empty-furn-desc">Try searching for generic terms like "sofa", "bed", "sink", "desk", or choose another category.</div>
        </div>
      `;
      return;
    }

    dom.furnitureGrid.innerHTML = filtered.map(item => {
      const scaled = getScaledFurnitureDimensions(item, state.furnitureScaleRatio, state.furniturePaperUnit);
      return `
        <div class="furniture-card" data-id="${item.id}">
          <div class="furn-card-header">
            <div>
              <div class="furn-name">${item.name}</div>
              <div class="furn-category-tag">${item.category.toUpperCase()}</div>
            </div>
            <div class="furn-dim-badge">1:${state.furnitureScaleRatio}</div>
          </div>

          <div class="furn-card-body">
            <div class="furn-plan-preview-box">
              <div class="furn-plan-desc">${item.desc}</div>
            </div>

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
            </div>
          </div>

          <div class="furn-card-footer">
            <button class="btn-furn-copy" data-text="${scaled.paperFormatted}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Size
            </button>
            <button class="btn-furn-send" data-w="${item.wCm}" data-d="${item.dCm}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              To Converter
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    dom.furnitureGrid.querySelectorAll('.btn-furn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(btn.dataset.text);
      });
    });

    dom.furnitureGrid.querySelectorAll('.btn-furn-send').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseFloat(btn.dataset.w) || 0;
        sendDimensionToConverter(w, 'cm');
      });
    });
  }

  function calculateCustomFurniture() {
    const pw = parseInput(dom.customFurnWInput?.value, { allowNegative: false });
    const pd = parseInput(dom.customFurnDInput?.value, { allowNegative: false });

    state.customFurnW = pw.isValid ? pw.value : 0;
    state.customFurnD = pd.isValid ? pd.value : 0;
    state.customFurnUnit = dom.customFurnUnitSelect?.value || 'cm';
    state.furnitureScaleRatio = parseFloat(dom.furnitureScaleSelect?.value) || 50;
    state.furniturePaperUnit = dom.furniturePaperUnitSelect?.value || 'cm';

    const wRes = scaleDimension({
      value: state.customFurnW,
      unitKey: state.customFurnUnit,
      ratio: state.furnitureScaleRatio,
      direction: 'real_to_drawing',
      targetUnitKey: state.furniturePaperUnit
    });

    const dRes = scaleDimension({
      value: state.customFurnD,
      unitKey: state.customFurnUnit,
      ratio: state.furnitureScaleRatio,
      direction: 'real_to_drawing',
      targetUnitKey: state.furniturePaperUnit
    });

    if (dom.customFurnPaperW) dom.customFurnPaperW.textContent = `${formatNumber(wRes.value, 2)} ${state.furniturePaperUnit}`;
    if (dom.customFurnPaperD) dom.customFurnPaperD.textContent = `${formatNumber(dRes.value, 2)} ${state.furniturePaperUnit}`;
  }

  function renderReferenceChart() {
    if (!dom.refChartTbody) return;
    state.refScaleRatio = parseFloat(dom.refChartScaleSelect?.value) || 50;

    const lengthsCm = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];

    dom.refChartTbody.innerHTML = lengthsCm.map(cm => {
      const realMeters = (cm * 0.01) * state.refScaleRatio;
      const realMm = realMeters * 1000;
      const realCm = realMeters * 100;
      const realFt = realMeters / 0.3048;
      const realFtIn = formatFeetInches(realMeters / 0.0254);

      return `
        <tr>
          <td class="col-paper"><strong>${cm} cm</strong> <small>(${cm * 10} mm)</small></td>
          <td class="col-real-m">${formatNumber(realMeters, 3)} m</td>
          <td class="col-real-cm">${formatNumber(realCm, 1)} cm</td>
          <td class="col-real-mm">${formatNumber(realMm, 0)} mm</td>
          <td class="col-real-ft">${formatFeetInches(realMeters / 0.0254)}</td>
          <td class="col-real-dec-ft">${formatNumber(realFt, 2)} ft</td>
        </tr>
      `;
    }).join('');
  }

  function sendDimensionToConverter(val, unitKey) {
    state.direction = 'real_to_drawing';
    state.realVal = val;
    state.realUnit = unitKey;
    state.drawingUnit = state.furniturePaperUnit || 'cm';
    state.scaleRatio = state.furnitureScaleRatio || 50;

    switchMode('converter');
    if (dom.inputRealVal) dom.inputRealVal.value = val;
    if (dom.selectRealUnit) dom.selectRealUnit.value = unitKey;
    if (dom.selectDrawingUnit) dom.selectDrawingUnit.value = state.drawingUnit;
    if (dom.customRatioInput) dom.customRatioInput.value = state.scaleRatio;

    calculateConverter();
    showToast(`Transferred ${val} ${unitKey} to Converter`);
  }

  function switchMode(modeKey) {
    state.currentMode = modeKey;
    dom.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === modeKey);
    });
    dom.toolContainers.forEach(container => {
      container.classList.toggle('active', container.id === `tool-${modeKey}`);
    });
    AudioService.playTick();
  }

  function populatePresetPills(category = 'all') {
    if (!dom.scalePresetPills) return;
    const filtered = category === 'all' 
      ? SCALE_PRESETS 
      : SCALE_PRESETS.filter(p => p.category === category);

    dom.scalePresetPills.innerHTML = filtered.map(preset => `
      <button type="button" class="preset-pill ${preset.ratio === state.scaleRatio ? 'active' : ''}" data-ratio="${preset.ratio}" data-id="${preset.id}" title="${preset.description}">
        ${preset.name}
      </button>
    `).join('');

    dom.scalePresetPills.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.scaleRatio = parseFloat(btn.dataset.ratio) || 50;
        state.selectedPresetId = btn.dataset.id;
        if (dom.customRatioInput) dom.customRatioInput.value = state.scaleRatio;
        dom.scalePresetPills.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AudioService.playTick();
        calculateConverter();
      });
    });
  }

  function populateSelectOptions() {
    const scaleOptionsHtml = SCALE_PRESETS.map(p => `<option value="${p.ratio}">${p.name}</option>`).join('');

    if (dom.rescaleOrigRatioSelect) dom.rescaleOrigRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.rescaleTargetRatioSelect) dom.rescaleTargetRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.areaRatioSelect) dom.areaRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.volumeRatioSelect) dom.volumeRatioSelect.innerHTML = scaleOptionsHtml;
    if (dom.furnitureScaleSelect) dom.furnitureScaleSelect.innerHTML = scaleOptionsHtml;
    if (dom.refChartScaleSelect) dom.refChartScaleSelect.innerHTML = scaleOptionsHtml;

    if (dom.rescaleOrigRatioSelect) dom.rescaleOrigRatioSelect.value = "50";
    if (dom.rescaleTargetRatioSelect) dom.rescaleTargetRatioSelect.value = "200";
    if (dom.areaRatioSelect) dom.areaRatioSelect.value = "100";
    if (dom.volumeRatioSelect) dom.volumeRatioSelect.value = "50";
    if (dom.furnitureScaleSelect) dom.furnitureScaleSelect.value = "50";
    if (dom.refChartScaleSelect) dom.refChartScaleSelect.value = "50";
  }

  function renderHistoryList() {
    if (!dom.historyList) return;
    const history = HistoryService.getHistory();

    if (history.length === 0) {
      dom.historyList.innerHTML = `
        <div class="empty-history">
          <div class="empty-icon">📐</div>
          <p>No calculation history yet.<br>Your conversions will be logged here automatically.</p>
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-header">
          <span class="history-mode-tag">${item.mode || 'Scale'}</span>
          <span class="history-time">${item.timestamp}</span>
        </div>
        <div class="history-item-body">
          <div class="history-scale">Scale: <strong>1:${item.scaleRatio || '-'}</strong></div>
          <div class="history-calc">${item.inputStr} ➔ <strong class="history-res">${item.outputStr}</strong></div>
        </div>
        <div class="history-item-actions">
          <button class="hist-btn-copy" title="Copy Result">Copy</button>
          <button class="delete-hist-btn" title="Delete">✕</button>
        </div>
      </div>
    `).join('');

    dom.historyList.querySelectorAll('.hist-btn-copy').forEach((btn, index) => {
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
          HistoryService.removeEntry(item.id);
          renderHistoryList();
        }
      });
    });
  }

  function toggleHistoryDrawer() {
    const isOpen = dom.historyDrawer.classList.contains('open');
    dom.historyDrawer.classList.toggle('open', !isOpen);
    dom.historyOverlay.classList.toggle('open', !isOpen);
    AudioService.playTick();
  }

  function handleExportCSV() {
    const csv = HistoryService.exportCSV();
    if (!csv) {
      showToast('History is empty');
      return;
    }
    downloadFile(csv, `architecture-helping-hand-history-${Date.now()}.csv`, 'text/csv');
    showToast('Exported history as CSV');
  }

  function handleExportMarkdown() {
    const md = HistoryService.exportMarkdown();
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
      AudioService.playCopySuccess();
      showToast(`Copied "${text}" to clipboard`);
    }).catch(() => {
      showToast(`Selected: ${text}`);
    });
  }

  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function updateSoundButtonUI() {
    if (!dom.soundToggleBtn) return;
    const enabled = AudioService.isEnabled();
    dom.soundToggleBtn.classList.toggle('muted', !enabled);
    dom.soundToggleBtn.title = enabled ? 'Mute Drafting Clicks' : 'Enable Drafting Clicks';
  }

  // =========================================================================
  // ATTACH GLOBAL EVENT LISTENERS
  // =========================================================================

  // Mode Tabs
  dom.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchMode(tab.dataset.mode);
    });
  });

  // Theme selector
  if (dom.themeSelect) {
    dom.themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      state.activeTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      StorageService.setItem('archiscale_theme', theme);
      AudioService.playTick();
    });
  }

  // Sound toggle
  if (dom.soundToggleBtn) {
    dom.soundToggleBtn.addEventListener('click', () => {
      AudioService.toggleSound();
      updateSoundButtonUI();
    });
  }

  // History Drawer
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

  if (dom.exportCsvBtn) dom.exportCsvBtn.addEventListener('click', handleExportCSV);
  if (dom.exportMdBtn) dom.exportMdBtn.addEventListener('click', handleExportMarkdown);

  // Shortcuts Modal
  if (dom.shortcutsHelpBtn) {
    dom.shortcutsHelpBtn.addEventListener('click', () => {
      dom.shortcutsModal.classList.add('open');
      dom.modalBackdrop.classList.add('open');
      AudioService.playTick();
    });
  }
  if (dom.closeShortcutsBtn) {
    dom.closeShortcutsBtn.addEventListener('click', () => {
      dom.shortcutsModal.classList.remove('open');
      dom.modalBackdrop.classList.remove('open');
    });
  }
  if (dom.modalBackdrop) {
    dom.modalBackdrop.addEventListener('click', () => {
      dom.shortcutsModal.classList.remove('open');
      dom.modalBackdrop.classList.remove('open');
    });
  }

  // Converter inputs & direction swap
  if (dom.inputDrawingVal) {
    dom.inputDrawingVal.addEventListener('input', () => {
      state.direction = 'drawing_to_real';
      calculateConverter();
    });
  }
  if (dom.inputRealVal) {
    dom.inputRealVal.addEventListener('input', () => {
      state.direction = 'real_to_drawing';
      calculateConverter();
    });
  }
  if (dom.selectDrawingUnit) {
    dom.selectDrawingUnit.addEventListener('change', (e) => {
      state.drawingUnit = e.target.value;
      calculateConverter();
    });
  }
  if (dom.selectRealUnit) {
    dom.selectRealUnit.addEventListener('change', (e) => {
      state.realUnit = e.target.value;
      calculateConverter();
    });
  }
  if (dom.customRatioInput) {
    dom.customRatioInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (val > 0) {
        state.scaleRatio = val;
        calculateConverter();
      }
    });
  }

  if (dom.swapDirectionBtn) {
    dom.swapDirectionBtn.addEventListener('click', () => {
      state.direction = state.direction === 'drawing_to_real' ? 'real_to_drawing' : 'drawing_to_real';
      AudioService.playSwapSound();
      calculateConverter();
    });
  }

  // Preset category filter tabs
  dom.presetCategoryTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.presetCategoryTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      populatePresetPills(btn.dataset.category);
      AudioService.playTick();
    });
  });

  // Copy buttons
  if (dom.btnCopyResult) {
    dom.btnCopyResult.addEventListener('click', () => {
      const outputVal = state.direction === 'drawing_to_real' ? dom.inputRealVal?.value : dom.inputDrawingVal?.value;
      const outputUnit = state.direction === 'drawing_to_real' ? state.realUnit : state.drawingUnit;
      const text = `${outputVal} ${outputUnit}`;
      copyToClipboard(text);

      HistoryService.addEntry({
        mode: 'Scale Converter',
        scaleRatio: state.scaleRatio,
        scaleStr: `1:${state.scaleRatio}`,
        inputStr: `${state.direction === 'drawing_to_real' ? state.drawingVal : state.realVal} ${state.direction === 'drawing_to_real' ? state.drawingUnit : state.realUnit}`,
        outputStr: text
      });
      renderHistoryList();
    });
  }

  // Rescaler inputs
  [dom.rescaleOrigInput, dom.rescaleOrigUnit, dom.rescaleOrigRatioSelect, dom.rescaleTargetRatioSelect, dom.rescaleTargetUnit].forEach(el => {
    if (el) el.addEventListener('input', calculateRescaler);
    if (el) el.addEventListener('change', calculateRescaler);
  });

  if (dom.btnCopyRescale) {
    dom.btnCopyRescale.addEventListener('click', () => {
      const text = `${dom.rescaleResultVal?.textContent} ${state.rescaleTargetUnit}`;
      copyToClipboard(text);
      HistoryService.addEntry({
        mode: 'Rescaler',
        scaleStr: `1:${state.rescaleOrigRatio} ➔ 1:${state.rescaleTargetRatio}`,
        inputStr: `${state.rescaleOrigVal} ${state.rescaleOrigUnit}`,
        outputStr: text
      });
      renderHistoryList();
    });
  }

  // Detector inputs
  [dom.detectPaperInput, dom.detectPaperUnit, dom.detectRealInput, dom.detectRealUnit].forEach(el => {
    if (el) el.addEventListener('input', calculateDetector);
    if (el) el.addEventListener('change', calculateDetector);
  });

  if (dom.btnApplyDetected) {
    dom.btnApplyDetected.addEventListener('click', () => {
      const res = detectScale({
        paperVal: state.detectPaperVal,
        paperUnitKey: state.detectPaperUnit,
        realVal: state.detectRealVal,
        realUnitKey: state.detectRealUnit
      });
      if (res.ratio > 0) {
        state.scaleRatio = res.ratio;
        if (dom.customRatioInput) dom.customRatioInput.value = res.ratio;
        switchMode('converter');
        calculateConverter();
        showToast(`Applied scale 1:${res.ratio.toFixed(2)} to Converter`);
      }
    });
  }

  // Area / Volume Subtabs & Inputs
  dom.areaVolTypeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.areaVolTypeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.calcType = tab.dataset.type;
      if (dom.areaSection) dom.areaSection.classList.toggle('active', state.calcType === 'area');
      if (dom.volumeSection) dom.volumeSection.classList.toggle('active', state.calcType === 'volume');
      AudioService.playTick();
      calculateAreaVolume();
    });
  });

  dom.areaVolDirTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.areaVolDirTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.calcDirection = tab.dataset.dir;
      AudioService.playTick();
      calculateAreaVolume();
    });
  });

  [dom.areaInputVal, dom.areaInputUnit, dom.areaRatioSelect, dom.areaOutputUnit,
   dom.volumeInputVal, dom.volumeInputUnit, dom.volumeRatioSelect, dom.volumeOutputUnit].forEach(el => {
    if (el) el.addEventListener('input', calculateAreaVolume);
    if (el) el.addEventListener('change', calculateAreaVolume);
  });

  if (dom.btnCopyArea) {
    dom.btnCopyArea.addEventListener('click', () => {
      const text = `${dom.areaResultVal?.textContent} ${state.areaOutputUnit}`;
      copyToClipboard(text);
    });
  }
  if (dom.btnCopyVolume) {
    dom.btnCopyVolume.addEventListener('click', () => {
      const text = `${dom.volumeResultVal?.textContent} ${state.volumeOutputUnit}`;
      copyToClipboard(text);
    });
  }

  // Furniture Scaling Search & Categories
  if (dom.furnitureSearchInput) {
    dom.furnitureSearchInput.addEventListener('input', (e) => {
      state.furnitureSearchQuery = e.target.value;
      if (dom.furnitureSearchClear) {
        dom.furnitureSearchClear.style.display = state.furnitureSearchQuery ? 'block' : 'none';
      }
      renderFurnitureGrid();
    });
  }

  if (dom.furnitureSearchClear) {
    dom.furnitureSearchClear.addEventListener('click', () => {
      if (dom.furnitureSearchInput) dom.furnitureSearchInput.value = '';
      state.furnitureSearchQuery = '';
      dom.furnitureSearchClear.style.display = 'none';
      renderFurnitureGrid();
    });
  }

  dom.furnitureCategoryTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.furnitureCategoryTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.furnitureActiveCategory = btn.dataset.category;
      AudioService.playTick();
      renderFurnitureGrid();
    });
  });

  if (dom.furnitureScaleSelect) {
    dom.furnitureScaleSelect.addEventListener('change', () => {
      renderFurnitureGrid();
      calculateCustomFurniture();
    });
  }
  if (dom.furniturePaperUnitSelect) {
    dom.furniturePaperUnitSelect.addEventListener('change', () => {
      renderFurnitureGrid();
      calculateCustomFurniture();
    });
  }

  // Custom Furniture Inputs
  [dom.customFurnWInput, dom.customFurnDInput, dom.customFurnHInput, dom.customFurnUnitSelect].forEach(el => {
    if (el) el.addEventListener('input', calculateCustomFurniture);
    if (el) el.addEventListener('change', calculateCustomFurniture);
  });

  if (dom.btnCopyCustomFurn) {
    dom.btnCopyCustomFurn.addEventListener('click', () => {
      const text = `${dom.customFurnPaperW?.textContent} × ${dom.customFurnPaperD?.textContent}`;
      copyToClipboard(text);
    });
  }

  if (dom.btnSendCustomFurn) {
    dom.btnSendCustomFurn.addEventListener('click', () => {
      sendDimensionToConverter(state.customFurnW, state.customFurnUnit);
    });
  }

  // Reference Chart
  if (dom.refChartScaleSelect) {
    dom.refChartScaleSelect.addEventListener('change', renderReferenceChart);
  }
  if (dom.btnPrintChart) {
    dom.btnPrintChart.addEventListener('click', () => {
      window.print();
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

    if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (dom.swapDirectionBtn) dom.swapDirectionBtn.click();
    } else if (e.key === '1') {
      switchMode('converter');
    } else if (e.key === '2') {
      switchMode('rescale');
    } else if (e.key === '3') {
      switchMode('detect');
    } else if (e.key === '4') {
      switchMode('area-volume');
    } else if (e.key === '5') {
      switchMode('furniture');
    } else if (e.key === '6') {
      switchMode('reference');
    } else if (e.key.toLowerCase() === 'h') {
      toggleHistoryDrawer();
    } else if (e.key === '?') {
      if (dom.shortcutsHelpBtn) dom.shortcutsHelpBtn.click();
    } else if (e.key === 'Escape') {
      if (dom.shortcutsModal) dom.shortcutsModal.classList.remove('open');
      if (dom.modalBackdrop) dom.modalBackdrop.classList.remove('open');
      if (dom.historyDrawer) dom.historyDrawer.classList.remove('open');
      if (dom.historyOverlay) dom.historyOverlay.classList.remove('open');
    }
  });
}



  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

})();
