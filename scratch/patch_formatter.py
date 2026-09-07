p = r'E:\Scaler\src\core\dimension-expression.js'
src = open(p, encoding='utf-8').read()

# Formatter: area / volume / boolean result rendering (before the scalar branch)
marker = """  const isScalar = rawResult.dimension === 'scalar';

  if (isScalar) {"""
addition = """  const isScalar = rawResult.dimension === 'scalar';

  // Boolean (comparison) results
  if (rawResult.dimension === 'boolean') {
    return {
      expression: expression.trim(),
      value: rawResult.value ? 1 : 0,
      dimension: 'boolean',
      canonicalMeters: null,
      displayUnit: 'boolean',
      formatted: rawResult.value ? 'true' : 'false',
      secondaryFormatted: [],
      scaleRatio: null,
      drawingMeters: null,
      drawingFormatted: null,
      isNegative: false,
      isValid: true,
      error: null
    };
  }

  // Area results (m2 canonical)
  if (rawResult.dimension === 'area') {
    const v = rawResult.value;
    const display = AREA_UNITS[displayUnit] || AREA_UNITS.m2;
    const converted = v / display.toSqMeters;
    return {
      expression: expression.trim(),
      value: v,
      dimension: 'area',
      canonicalSqMeters: v,
      displayUnit: display.key,
      formatted: formatNumber(converted, precision) + ' ' + display.symbol,
      secondaryFormatted: [
        { unit: 'm2', value: v, formatted: formatNumber(v, precision) + ' m²' },
        { unit: 'cm2', value: v * 10000, formatted: formatNumber(v * 10000, precision) + ' cm²' },
        { unit: 'sq_ft', value: v / 0.09290304, formatted: formatNumber(v / 0.09290304, precision) + ' sq ft' }
      ],
      scaleRatio: null,
      drawingMeters: null,
      drawingFormatted: null,
      isNegative: v < 0,
      isValid: true,
      error: null
    };
  }

  // Volume results (m3 canonical)
  if (rawResult.dimension === 'volume') {
    const v = rawResult.value;
    const display = VOLUME_UNITS[displayUnit] || VOLUME_UNITS.m3;
    const converted = v / display.toCuMeters;
    return {
      expression: expression.trim(),
      value: v,
      dimension: 'volume',
      canonicalCuMeters: v,
      displayUnit: display.key,
      formatted: formatNumber(converted, precision) + ' ' + display.symbol,
      secondaryFormatted: [
        { unit: 'm3', value: v, formatted: formatNumber(v, precision) + ' m³' },
        { unit: 'liters', value: v * 1000, formatted: formatNumber(v * 1000, precision) + ' L' },
        { unit: 'cu_ft', value: v / 0.028316846592, formatted: formatNumber(v / 0.028316846592, precision) + ' cu ft' }
      ],
      scaleRatio: null,
      drawingMeters: null,
      drawingFormatted: null,
      isNegative: v < 0,
      isValid: true,
      error: null
    };
  }

  if (isScalar) {"""
assert marker in src
src = src.replace(marker, addition, 1)
open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('formatter extended')
