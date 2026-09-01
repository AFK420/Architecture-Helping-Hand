/**
 * ArchiScale - Mathematical Conversion Engine
 */

import { UNITS, AREA_UNITS, VOLUME_UNITS, SCALE_PRESETS } from './presets.js';

/**
 * Parses user numeric or fractional input (e.g., "12.5", "3 1/2", "5/8", "12' 6 1/2\"")
 */
export function parseArchitecturalInput(inputStr) {
  if (typeof inputStr === 'number') return inputStr;
  if (!inputStr) return 0;

  const clean = inputStr.trim().replace(/,/g, '');

  // Check for feet & inches pattern: e.g. 12' 6" or 12'-6 1/2" or 12'6
  const feetInchesMatch = clean.match(/^(\d+(?:\.\d+)?)\s*['′]\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*["″]?\s*)?$/);
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]) || 0;
    let inches = 0;
    if (feetInchesMatch[2]) {
      inches = parseFraction(feetInchesMatch[2]);
    }
    return feet * 12 + inches; // returns inches total
  }

  // Handle standard fractions: "3 1/2", "1/4", "0.75"
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

/**
 * Format a number cleanly with decimal precision or scientific notation if extremely large/small
 */
export function formatNumber(val, decimals = 3) {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (val === 0) return '0';

  const abs = Math.abs(val);
  if (abs < 0.00001 || abs >= 1e9) {
    return val.toExponential(4);
  }

  // Round to specified precision without trailing unneeded zeroes
  const factor = Math.pow(10, decimals);
  const rounded = Math.round((val + Number.EPSILON) * factor) / factor;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Converts decimal feet or inches to architectural notation: X'-Y Z/16"
 */
export function formatFeetInches(totalInches, precision = 16) {
  if (isNaN(totalInches)) return '0"';
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

  // Simplify fraction
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

/**
 * Convert Drawing Measurement -> Real-World Measurement
 */
export function drawingToReal({ drawingVal, drawingUnitKey, scaleRatio, realUnitKey }) {
  const drawingUnit = UNITS[drawingUnitKey] || UNITS.cm;
  const realUnit = UNITS[realUnitKey] || UNITS.m;

  // 1. Drawing dimension in meters
  const drawingMeters = drawingVal * drawingUnit.toMeters;

  // 2. Real dimension in meters = Drawing * Ratio
  const realMeters = drawingMeters * scaleRatio;

  // 3. Convert to target real unit
  const realResult = realMeters / realUnit.toMeters;

  return {
    realValue: realResult,
    realMeters: realMeters,
    drawingMeters: drawingMeters,
    realUnit: realUnit,
    drawingUnit: drawingUnit
  };
}

/**
 * Convert Real-World Measurement -> Drawing Measurement
 */
export function realToDrawing({ realVal, realUnitKey, scaleRatio, drawingUnitKey }) {
  const realUnit = UNITS[realUnitKey] || UNITS.m;
  const drawingUnit = UNITS[drawingUnitKey] || UNITS.cm;

  // 1. Real dimension in meters
  const realMeters = realVal * realUnit.toMeters;

  // 2. Drawing dimension in meters = Real / Ratio
  const drawingMeters = realMeters / scaleRatio;

  // 3. Convert to target drawing unit
  const drawingResult = drawingMeters / drawingUnit.toMeters;

  return {
    drawingValue: drawingResult,
    drawingMeters: drawingMeters,
    realMeters: realMeters,
    drawingUnit: drawingUnit,
    realUnit: realUnit
  };
}

/**
 * Rescaling: Convert from one drawing scale to another drawing scale
 * Example: A line is 12 cm at 1:50. What is its length at 1:200?
 */
export function rescaleDrawing({ originalVal, originalUnitKey, originalRatio, targetRatio, targetUnitKey }) {
  const origUnit = UNITS[originalUnitKey] || UNITS.cm;
  const targetUnit = UNITS[targetUnitKey] || UNITS.cm;

  // 1. Calculate the true real-world dimension in meters
  const realMeters = (originalVal * origUnit.toMeters) * originalRatio;

  // 2. Calculate the new drawing dimension at targetRatio
  const targetMeters = realMeters / targetRatio;
  const targetVal = targetMeters / targetUnit.toMeters;

  const factor = originalRatio / targetRatio; // Rescale magnification factor

  return {
    targetValue: targetVal,
    realMeters: realMeters,
    factor: factor,
    origUnit: origUnit,
    targetUnit: targetUnit
  };
}

/**
 * Detect / Find Unknown Scale
 * Given a paper measurement and known real-world measurement, find the scale ratio
 */
export function detectScale({ paperVal, paperUnitKey, realVal, realUnitKey }) {
  const paperUnit = UNITS[paperUnitKey] || UNITS.cm;
  const realUnit = UNITS[realUnitKey] || UNITS.m;

  const paperMeters = paperVal * paperUnit.toMeters;
  const realMeters = realVal * realUnit.toMeters;

  if (paperMeters <= 0 || realMeters <= 0) {
    return { ratio: 0, ratioString: 'N/A', closestPreset: null, error: 'Values must be greater than 0' };
  }

  const calculatedRatio = realMeters / paperMeters;

  // Find closest standard architectural preset
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

  // Format ratio string
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
export function scaleArea({ areaVal, inputUnitKey, scaleRatio, outputUnitKey, isDrawingToReal = true }) {
  const inputUnit = AREA_UNITS[inputUnitKey] || AREA_UNITS.cm2;
  const outputUnit = AREA_UNITS[outputUnitKey] || AREA_UNITS.m2;

  const inputSqMeters = areaVal * inputUnit.toSqMeters;
  const scaleFactorSq = Math.pow(scaleRatio, 2);

  let outputSqMeters = 0;
  if (isDrawingToReal) {
    outputSqMeters = inputSqMeters * scaleFactorSq;
  } else {
    outputSqMeters = inputSqMeters / scaleFactorSq;
  }

  const result = outputSqMeters / outputUnit.toSqMeters;

  return {
    resultValue: result,
    sqMeters: outputSqMeters,
    factor: scaleFactorSq
  };
}

/**
 * Volume Scaling (Scale Ratio cubed: S^3)
 */
export function scaleVolume({ volumeVal, inputUnitKey, scaleRatio, outputUnitKey, isDrawingToReal = true }) {
  const inputUnit = VOLUME_UNITS[inputUnitKey] || VOLUME_UNITS.cm3;
  const outputUnit = VOLUME_UNITS[outputUnitKey] || VOLUME_UNITS.m3;

  const inputCuMeters = volumeVal * inputUnit.toCuMeters;
  const scaleFactorCube = Math.pow(scaleRatio, 3);

  let outputCuMeters = 0;
  if (isDrawingToReal) {
    outputCuMeters = inputCuMeters * scaleFactorCube;
  } else {
    outputCuMeters = inputCuMeters / scaleFactorCube;
  }

  const result = outputCuMeters / outputUnit.toCuMeters;

  return {
    resultValue: result,
    cuMeters: outputCuMeters,
    factor: scaleFactorCube
  };
}

/**
 * Multi-unit conversion table for a given real dimension
 */
export function getAllUnitEquivalents(meters) {
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
