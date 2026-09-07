/**
 * Applies a binary arithmetic operator to two dimensional quantities with
 * full dimensional analysis:
 *   length + length = length        length * length = area
 *   area + area = area              length * area   = volume
 *   length / length = scalar        area / length   = length
 * Comparisons require matching dimensions and return booleans.
 */
function applyBinaryOperator(op, left, right, defaultUnit, position = 0) {
  const unitDef = requireUnit(defaultUnit, 'length');

  // --- additive -----------------------------------------------------------
  if (op === '+' || op === '-') {
    const sgn = (op === '+') ? 1 : -1;

    // mixed dimensions are invalid — explain WHAT and WHY
    const dims = new Set([left.dimension, right.dimension]);
    if (dims.size > 1 && !(dims.has('length') && dims.has('scalar'))) {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Cannot add or subtract ' + left.dimension + ' and ' + right.dimension +
          ' — both operands must measure the same kind of quantity (e.g. 2 m + 400 mm, or 4 m2 + 2 m2).',
        position
      );
    }

    if (left.dimension === right.dimension) {
      return {
        value: left.value + sgn * right.value,
        dimension: left.dimension,
        explicitUnit: left.explicitUnit || right.explicitUnit || defaultUnit,
        isBareNumber: left.isBareNumber && right.isBareNumber
      };
    }
    // length +/- bare scalar (scalar interpreted in the default unit)
    const leftIsLen = left.dimension === 'length';
    const lenVal = leftIsLen
      ? left.value + sgn * right.value * unitDef.toMeters
      : left.value * unitDef.toMeters + sgn * right.value;
    return {
      value: lenVal,
      dimension: 'length',
      explicitUnit: (leftIsLen ? left.explicitUnit : right.explicitUnit) || defaultUnit,
      isBareNumber: false
    };
  }

  // --- modulo ---------------------------------------------------------------
  if (op === '%') {
    if (left.dimension !== right.dimension) {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Cannot take "' + left.dimension + ' % ' + right.dimension + '" — both operands of "%" must share one dimension (e.g. 5 m % 1.2 m).',
        position
      );
    }
    if (Math.abs(right.value) < 1e-15) {
      throw createExpressionError(EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO, 'Modulo by zero is undefined', position);
    }
    return {
      value: left.value % right.value,
      dimension: left.dimension,
      explicitUnit: left.explicitUnit || right.explicitUnit || defaultUnit,
      isBareNumber: false
    };
  }

  // --- power ------------------------------------------------------------------
  if (op === '^') {
    if (right.dimension !== 'scalar' && right.dimension !== 'boolean') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'The exponent of "^" must be a plain number — received ' + right.dimension + '. E.g. 2 m ^ 2 = 4 m2.',
        position
      );
    }
    const exponent = right.value;
    if (left.dimension === 'scalar') {
      return { value: Math.pow(left.value, exponent), dimension: 'scalar', isBareNumber: left.isBareNumber && right.isBareNumber };
    }
    if (left.dimension === 'length') {
      if (Math.abs(exponent - 2) < 1e-9) return { value: left.value * left.value, dimension: 'area', explicitUnit: null, isBareNumber: false };
      if (Math.abs(exponent - 3) < 1e-9) return { value: left.value * left.value * left.value, dimension: 'volume', explicitUnit: null, isBareNumber: false };
      if (Math.abs(exponent - 1) < 1e-9) return { value: left.value, dimension: 'length', explicitUnit: left.explicitUnit, isBareNumber: false };
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'm ^ ' + exponent + ' is not an architectural unit — supported: m ^ 2 = m2, m ^ 3 = m3, m ^ 1 = m.',
        position
      );
    }
    if ((left.dimension === 'area' || left.dimension === 'volume') && Math.abs(exponent - 1) < 1e-9) {
      return { value: left.value, dimension: left.dimension, explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      '(' + left.dimension + ') ^ ' + exponent + ' is not dimensionally defined.',
      position
    );
  }

  // --- multiplication ---------------------------------------------------------
  if (op === '*') {
    // x * scalar keeps x
    if (right.dimension === 'scalar' || right.dimension === 'boolean') {
      return { value: left.value * right.value, dimension: left.dimension, explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'scalar' || left.dimension === 'boolean') {
      return { value: left.value * right.value, dimension: right.dimension, explicitUnit: right.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'length' && right.dimension === 'length') {
      return { value: left.value * right.value, dimension: 'area', explicitUnit: null, isBareNumber: false };
    }
    if ((left.dimension === 'area' && right.dimension === 'length') ||
        (left.dimension === 'length' && right.dimension === 'area')) {
      return { value: left.value * right.value, dimension: 'volume', explicitUnit: null, isBareNumber: false };
    }
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      'Cannot multiply ' + left.dimension + ' by ' + right.dimension +
        ' — supported: length*length = area, area*length = volume, x*scalar keeps x.',
      position
    );
  }

  // --- division -----------------------------------------------------------------
  if (op === '/') {
    if (Math.abs(right.value) < 1e-15) {
      throw createExpressionError(EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO, 'Division by zero is undefined', position);
    }
    // x / scalar keeps x
    if (right.dimension === 'scalar' || right.dimension === 'boolean') {
      return { value: left.value / right.value, dimension: left.dimension, explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === right.dimension) {
      return { value: left.value / right.value, dimension: 'scalar', isBareNumber: false };
    }
    if (left.dimension === 'area' && right.dimension === 'length') {
      return { value: left.value / right.value, dimension: 'length', explicitUnit: null, isBareNumber: false };
    }
    if (left.dimension === 'volume' && right.dimension === 'length') {
      return { value: left.value / right.value, dimension: 'area', explicitUnit: null, isBareNumber: false };
    }
    if (left.dimension === 'volume' && right.dimension === 'area') {
      return { value: left.value / right.value, dimension: 'length', explicitUnit: null, isBareNumber: false };
    }
    if (left.dimension === 'scalar' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Cannot divide a dimensionless scalar by a length measurement.',
        position
      );
    }
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      'Cannot divide ' + left.dimension + ' by ' + right.dimension +
        ' — supported: area/length = length, volume/length = area, volume/area = length, same/same = ratio.',
      position
    );
  }

  throw createExpressionError(
    EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
    'Unsupported operator: "' + op + '"',
    position
  );
}

