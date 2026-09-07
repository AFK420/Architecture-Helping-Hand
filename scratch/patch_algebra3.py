p = r'E:\Scaler\src\core\dimension-expression.js'
src = open(p, encoding='utf-8').read()

applied = []

old = """    // 4. length * length -> unsupported linear operation
    if (left.dimension === 'length' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Multiplying two lengths produces an area (m²); this linear expression engine calculates lengths and scalar counts. For area calculations, use the Area & Volume scaler.',
        position
      );
    }
  }"""
new = """    // 4. length * length -> area (dimensional analysis: m * m = m²)
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
  }"""
if old in src:
    src = src.replace(old, new, 1)
    applied.append('multiplication')

if "3b. area + area and volume + volume" not in src:
    marker = """    // 4. Both are scalars:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {"""
    addition = """    // 3b. area + area and volume + volume stay in their dimension
    if ((left.dimension === 'area' && right.dimension === 'area') ||
        (left.dimension === 'volume' && right.dimension === 'volume')) {
      const vv = (op === '+') ? (left.value + right.value) : (left.value - right.value);
      return { value: vv, dimension: left.dimension, explicitUnit: left.explicitUnit || right.explicitUnit, isBareNumber: false };
    }

    // 4. Both are scalars:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {"""
    assert marker in src
    src = src.replace(marker, addition, 1)
    applied.append('additive')

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('applied:', applied)
