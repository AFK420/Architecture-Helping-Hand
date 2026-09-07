p = r'E:\Scaler\src\core\dimension-expression.js'
src = open(p, encoding='utf-8').read()

src = src.replace(
    """    case 'LITERAL_NUMBER':
      return {
        value: node.value,
        dimension: 'scalar',
        isBareNumber: true
      };""",
    """    case 'LITERAL_NUMBER':
      return {
        value: node.value,
        dimension: 'scalar',
        isBareNumber: true
      };

    case 'LITERAL_AREA':
      return { value: node.value, dimension: 'area', explicitUnit: node.detectedUnit, isBareNumber: false };

    case 'LITERAL_VOLUME':
      return { value: node.value, dimension: 'volume', explicitUnit: node.detectedUnit, isBareNumber: false };

    case 'COMPARISON_OP': {
      const cl = evaluateASTNode(node.left, context);
      const cr = evaluateASTNode(node.right, context);
      const cmp = applyComparisonOperator(node.operator, cl, cr, node.position);
      return { value: cmp, dimension: 'boolean', isBareNumber: false };
    }

    case 'FUNCTION_CALL': {
      const evaluatedArgs = node.args.map(a => evaluateASTNode(a, context));
      return applyFunction(node.name, evaluatedArgs, node.position);
    }""")

src = src.replace(
    """/**
 * Applies a binary arithmetic operator to two dimensional quantities
 */
function applyBinaryOperator(op, left, right, defaultUnit, position = 0) {
  const unitDef = requireUnit(defaultUnit, 'length');
""",
    """/**
 * Compares two same-dimension quantities. Bare scalars are compared against
 * lengths in the default unit (mirroring the additive behavior). Returns a
 * boolean.
 */
function applyComparisonOperator(op, left, right, position = 0) {
  const comparable = (l, r) =>
    l.dimension === r.dimension ||
    (l.dimension === 'length' && r.dimension === 'scalar' && r.isBareNumber) ||
    (r.dimension === 'length' && l.dimension === 'scalar' && l.isBareNumber);
  if (!comparable(left, right)) {
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      'Cannot compare ' + left.dimension + ' with ' + right.dimension +
        ' — both sides of "' + op + '" must measure the same kind of quantity.',
      position
    );
  }
  const EPSILON = 1e-9;
  const d = left.value - right.value;
  switch (op) {
    case '=': return Math.abs(d) <= EPSILON;
    case '!=': return Math.abs(d) > EPSILON;
    case '<': return d < -EPSILON;
    case '>': return d > EPSILON;
    case '<=': return d <= EPSILON;
    case '>=': return d >= -EPSILON;
    default:
      throw createExpressionError(EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR, 'Unsupported comparison: "' + op + '"', position);
  }
}

/**
 * Applies an architectural function to evaluated arguments. Dimensional
 * rules: min/max keep the common dimension; abs/round/ceil/floor keep the
 * argument's dimension; sqrt maps area->length (side length) and
 * scalar->scalar.
 */
function applyFunction(name, args, position = 0) {
  const badArgs = !args.length || args.some(a => a == null || typeof a.value !== 'number' || !Number.isFinite(a.value));
  if (badArgs) {
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.MISSING_OPERAND,
      'Function ' + name + '(...) expects 1+ finite numeric arguments — e.g. max(2.4m, 1.8m)',
      position
    );
  }
  const first = args[0];
  switch (name) {
    case 'min':
    case 'max': {
      const dims = new Set(args.map(a => a.dimension));
      if (dims.size > 1) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
          name + '(...) arguments must share one dimension — received ' + [...dims].join(' + ') + '.',
          position
        );
      }
      const values = args.map(a => a.value);
      const chosen = (name === 'min') ? Math.min(...values) : Math.max(...values);
      const winner = args[values.indexOf(chosen)];
      return { value: chosen, dimension: first.dimension, explicitUnit: winner.explicitUnit || first.explicitUnit, isBareNumber: args.every(a => a.isBareNumber) };
    }
    case 'abs':
      return { value: Math.abs(first.value), dimension: first.dimension, explicitUnit: first.explicitUnit, isBareNumber: first.isBareNumber };
    case 'round':
      return { value: Math.round(first.value), dimension: first.dimension, explicitUnit: first.explicitUnit, isBareNumber: first.isBareNumber };
    case 'ceil':
      return { value: Math.ceil(first.value), dimension: first.dimension, explicitUnit: first.explicitUnit, isBareNumber: first.isBareNumber };
    case 'floor':
      return { value: Math.floor(first.value), dimension: first.dimension, explicitUnit: first.explicitUnit, isBareNumber: first.isBareNumber };
    case 'sqrt': {
      if (first.dimension === 'area') {
        return { value: Math.sqrt(first.value), dimension: 'length', isBareNumber: false };
      }
      if (first.dimension === 'scalar') {
        return { value: Math.sqrt(first.value), dimension: 'scalar', isBareNumber: true };
      }
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'sqrt(' + first.dimension + ') is not defined — sqrt works on areas (sqrt(16 m2) = 4 m) or plain numbers.',
        position
      );
    }
    default:
      throw createExpressionError(EXPRESSION_ERROR_CODES.UNEXPECTED_TOKEN, 'Unknown function "' + name + '"', position);
  }
}

/**
 * Applies a binary arithmetic operator to two dimensional quantities
 */
function applyBinaryOperator(op, left, right, defaultUnit, position = 0) {
  const unitDef = requireUnit(defaultUnit, 'length');

  if (op === '%') {
    // Modulo: remainder within the SAME dimension (spacing/layout math)
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

  if (op === '^') {
    // Power: scalar ^ scalar = scalar; length ^ 2 = area; length ^ 3 = volume
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
    if (left.dimension === 'area' && Math.abs(exponent - 1) < 1e-9) {
      return { value: left.value, dimension: 'area', explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'volume' && Math.abs(exponent - 1) < 1e-9) {
      return { value: left.value, dimension: 'volume', explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
      '(' + left.dimension + ') ^ ' + exponent + ' is not dimensionally defined.',
      position
    );
  }
""", 1)

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('evaluator extended')
