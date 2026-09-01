/**
 * Architecture Helping Hand - Centralized Calculation Engine
 * Pure mathematical scaling, rescaling, scale detection, area, and volume algorithms.
 */

import { UNITS, AREA_UNITS, VOLUME_UNITS, requireUnit } from './units.js';
import { SCALE_PRESETS } from './presets.js';
import { formatFeetInches } from './formatter.js';

/**
 * Validates that an input is a finite JavaScript number.
 * Throws TypeError if the input is NaN, Infinity, a string, null, undefined, or other non-number.
 * @param {*} val - Value to check
 * @param {string} [paramName='value'] - Parameter name for the error message
 * @returns {number}
 */
export function requireFiniteNumber(val, paramName = 'value') {
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
export function scaleDimension(params) {
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
export function drawingToReal({ drawingVal = 0, drawingUnitKey = 'cm', scaleRatio = 50, realUnitKey = 'm' } = {}) {
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
export function realToDrawing({ realVal = 0, realUnitKey = 'm', scaleRatio = 50, drawingUnitKey = 'cm' } = {}) {
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
export function rescaleDrawing({ originalVal = 0, originalUnitKey = 'cm', originalRatio = 50, targetRatio = 200, targetUnitKey = 'cm' } = {}) {
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
export function detectScale({ paperVal = 0, paperUnitKey = 'cm', realVal = 0, realUnitKey = 'm' } = {}) {
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
export function scaleArea({ areaVal = 0, inputUnitKey = 'cm2', scaleRatio = 100, outputUnitKey = 'm2', isDrawingToReal = true } = {}) {
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
export function scaleVolume({ volumeVal = 0, inputUnitKey = 'cm3', scaleRatio = 100, outputUnitKey = 'm3', isDrawingToReal = true } = {}) {
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
export function getAllUnitEquivalents(meters) {
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
