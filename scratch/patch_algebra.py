p = r'E:\Scaler\src\core\dimension-expression.js'
src = open(p, encoding='utf-8').read()

# multiplication: area/volume algebra before the "length * length" error
src = src.replace(
    """    // 4. length * length -> unsupported linear operation
    if (left.dimension === 'length' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Multiplying two lengths produces an area (m2); this linear expression engine calculates lengths and scalar counts. For area calculations, use the Area & Volume scaler.',
        position
      );
    }
  }""",
    """    // 4. length * length -> area (dimensional analysis: m * m = m2)
    if (left.dimension === 'length' && right.dimension === 'length') {
      return { value: left.value * right.value, dimension: 'area', explicitUnit: null, isBareNumber: false };
    }

    // 5. area/volume scaling + area * length -> volume (dimensional analysis)
    if (left.dimension === 'area' && right.dimension === 'scalar') {
      return { value: left.value * right.value, dimension: 'area', explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'scalar' && right.dimension === 'area') {
      return { value: left.value * right.value, dimension: 'area', explicitUnit: right.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'volume' && right.dimension === 'scalar') {
      return { value: left.value * right.value, dimension: 'volume', explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'scalar' && right.dimension === 'volume') {
      return { value: left.value * right.value, dimension: 'volume', explicitUnit: right.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'area' && right.dimension === 'length') {
      return { value: left.value * right.value, dimension: 'volume', explicitUnit: null, isBareNumber: false };
    }
    if (left.dimension === 'length' && right.dimension === 'area') {
      return { value: left.value * right.value, dimension: 'volume', explicitUnit: null, isBareNumber: false };
    }
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      'Cannot multiply ' + left.dimension + ' by ' + right.dimension +
        ' — supported: length*length = area, area*length = volume, x*scalar keeps x.',
      position
    );
  }""", 1)

# division: area/volume algebra
src = src.replace(
    """    // 4. scalar / length -> unsupported
    if (left.dimension === 'scalar' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Cannot divide a dimensionless scalar by a length measurement.',
        position
      );
    }
  }""",
    """    // 4. scalar / length -> unsupported
    if (left.dimension === 'scalar' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Cannot divide a dimensionless scalar by a length measurement.',
        position
      );
    }

    // 5. area / length -> length (e.g. 20 m2 / 5 m = 4 m strip width)
    if (left.dimension === 'area' && right.dimension === 'length') {
      return { value: left.value / right.value, dimension: 'length', explicitUnit: null, isBareNumber: false };
    }
    // 6. volume / length -> area (e.g. 30 m3 / 6 m = 5 m2 section)
    if (left.dimension === 'volume' && right.dimension === 'length') {
      return { value: left.value / right.value, dimension: 'area', explicitUnit: null, isBareNumber: false };
    }
    // 7. volume / area -> length (e.g. 30 m3 / 5 m2 = 6 m depth)
    if (left.dimension === 'volume' && right.dimension === 'area') {
      return { value: left.value / right.value, dimension: 'length', explicitUnit: null, isBareNumber: false };
    }
    // 8. same-dimension cancels to a scalar ratio (area/area, volume/volume)
    if (left.dimension === right.dimension) {
      return { value: left.value / right.value, dimension: 'scalar', isBareNumber: false };
    }
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      'Cannot divide ' + left.dimension + ' by ' + right.dimension +
        ' — supported: area/length = length, volume/length = area, volume/area = length, same/same = ratio.',
      position
    );
  }""", 1)

# additive compatibility: area+area and volume+volume (before the scalar fallback in +/-)
add_marker = """    // 4. Both are scalars:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {"""
add_new = """    // 3b. area + area and volume + volume stay in their dimension
    if ((left.dimension === 'area' && right.dimension === 'area') ||
        (left.dimension === 'volume' && right.dimension === 'volume')) {
      const vv = (op === '+') ? (left.value + right.value) : (left.value - right.value);
      return { value: vv, dimension: left.dimension, explicitUnit: left.explicitUnit || right.explicitUnit, isBareNumber: false };
    }

    // 4. Both are scalars:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {"""
assert add_marker in src
src = src.replace(add_marker, add_new, 1)

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('dimensional algebra extended')
