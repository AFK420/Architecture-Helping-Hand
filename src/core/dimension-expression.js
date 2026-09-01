/**
 * Architecture Helping Hand - Dimension Expression Engine
 * Phase 2.5: Daily Architect Toolkit — Part 3: Dimension Expression Engine
 *
 * Deterministic architectural dimension expression engine with mixed-unit
 * dimensional arithmetic, operator precedence, parentheses, and live scale conversions.
 * Zero-dependency, pure mathematical parser. Never uses eval() or new Function().
 */

import { UNITS, requireUnit } from './units.js';
import { parseInput } from './parser.js';
import { formatNumber, formatFeetInches } from './formatter.js';

export const MAX_EXPRESSION_LENGTH = 1000;
export const MAX_TOKEN_COUNT = 200;
export const MAX_NESTING_DEPTH = 50;

/**
 * Standard Error Codes for Dimension Expressions
 */
export const EXPRESSION_ERROR_CODES = Object.freeze({
  EMPTY_EXPRESSION: 'EMPTY_EXPRESSION',
  EXPRESSION_TOO_LONG: 'EXPRESSION_TOO_LONG',
  MAX_TOKENS_EXCEEDED: 'MAX_TOKENS_EXCEEDED',
  MAX_DEPTH_EXCEEDED: 'MAX_DEPTH_EXCEEDED',
  UNEXPECTED_CHARACTER: 'UNEXPECTED_CHARACTER',
  UNEXPECTED_TOKEN: 'UNEXPECTED_TOKEN',
  UNEXPECTED_OPERATOR: 'UNEXPECTED_OPERATOR',
  MISSING_OPERAND: 'MISSING_OPERAND',
  UNBALANCED_PARENTHESES: 'UNBALANCED_PARENTHESES',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  INCOMPATIBLE_DIMENSIONS: 'INCOMPATIBLE_DIMENSIONS',
  NON_FINITE_RESULT: 'NON_FINITE_RESULT',
  INVALID_MEASUREMENT: 'INVALID_MEASUREMENT'
});

/**
 * Checks if a string contains expression-like operators or syntax
 * @param {string} input - Input query
 * @returns {boolean}
 */
export function isExpressionLike(input) {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed === '') return false;

  // Must contain at least one arithmetic operator (+, *, /, ×, ÷) or parentheses,
  // or a minus sign that is not merely an architectural hyphen separator (e.g. 12'-6")
  if (/[+*\/×÷()]/.test(trimmed)) return true;

  // Check for minus / subtract operator: e.g. "5m - 2m" or "2400 - 900" or "2400−900"
  if (/[\s\d][\-−][\s\d]/.test(trimmed) || /^[+\-−]\s*\(/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Tokenize a dimension expression string into a stream of tokens
 * @param {string} expression - Math expression string
 * @param {string} [defaultUnit='mm'] - Unit assumed for bare numbers
 * @returns {Array<Object>} Array of token objects
 */
export function tokenizeExpression(expression, defaultUnit = 'mm') {
  if (typeof expression !== 'string') {
    throw createExpressionError(EXPRESSION_ERROR_CODES.EMPTY_EXPRESSION, 'Expression must be a string', 0);
  }

  const str = expression.trim();
  if (str === '') {
    throw createExpressionError(EXPRESSION_ERROR_CODES.EMPTY_EXPRESSION, 'Expression is empty', 0);
  }

  if (str.length > MAX_EXPRESSION_LENGTH) {
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.EXPRESSION_TOO_LONG,
      `Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`,
      0
    );
  }

  const tokens = [];
  let pos = 0;
  const len = str.length;

  while (pos < len) {
    // 1. Skip whitespace
    if (/\s/.test(str[pos])) {
      pos++;
      continue;
    }

    const startPos = pos;
    const char = str[pos];

    // 2. Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', raw: '(', position: startPos });
      pos++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', raw: ')', position: startPos });
      pos++;
      continue;
    }

    // 3. Operators: +, -, *, /, ×, ÷, −
    if (char === '+' || char === '*' || char === '/' || char === '×' || char === '÷' || char === '−') {
      const normalizedOp = (char === '×') ? '*' : ((char === '÷') ? '/' : ((char === '−') ? '-' : char));
      tokens.push({ type: 'OPERATOR', value: normalizedOp, raw: char, position: startPos });
      pos++;
      continue;
    }

    // Special check for hyphen / minus operator:
    if (char === '-') {
      tokens.push({ type: 'OPERATOR', value: '-', raw: '-', position: startPos });
      pos++;
      continue;
    }

    // 4. Dimensional or Numeric Literals
    const remaining = str.slice(pos);

    // Pattern A: Feet & Inches (e.g. 7' 6", 7'-6 1/2", 12'6", 8', 6", 7' 6 1/2")
    const ftInMatch = remaining.match(/^(\d+(?:\.\d+)?)\s*['′]\s*[-–—]?\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*["″]?\s*)?/);
    if (ftInMatch && (ftInMatch[0].includes("'") || ftInMatch[0].includes("′"))) {
      const rawText = ftInMatch[0].trim();
      const parsed = parseInput(rawText, { allowNegative: true });
      if (parsed.isValid) {
        const unitDef = requireUnit('in', 'length');
        const meters = parsed.value * unitDef.toMeters;
        tokens.push({
          type: 'DIMENSION',
          value: meters,
          canonicalMeters: meters,
          dimension: 'length',
          detectedUnit: 'in',
          raw: rawText,
          position: startPos
        });
        pos += ftInMatch[0].length;
        continue;
      }
    }

    // Pattern B: Standalone Inches with fractions (e.g. 6 1/2" or 12")
    const inMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*["″]/);
    if (inMatch) {
      const rawText = inMatch[0].trim();
      const parsed = parseInput(rawText, { allowNegative: true });
      if (parsed.isValid) {
        const unitDef = requireUnit('in', 'length');
        const meters = parsed.value * unitDef.toMeters;
        tokens.push({
          type: 'DIMENSION',
          value: meters,
          canonicalMeters: meters,
          dimension: 'length',
          detectedUnit: 'in',
          raw: rawText,
          position: startPos
        });
        pos += inMatch[0].length;
        continue;
      }
    }

    // Pattern C: Number with Unit Suffix (e.g. 2400mm, 2.4m, 150cm, 12ft, 10yd)
    const unitMatch = remaining.match(/^(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*([a-zA-Z²³_]+)/);
    if (unitMatch) {
      const candidateUnit = unitMatch[2].toLowerCase();
      if (UNITS[candidateUnit]) {
        const rawText = unitMatch[0].trim();
        const parsed = parseInput(rawText, { allowNegative: true });
        if (parsed.isValid) {
          const unitDef = requireUnit(candidateUnit, 'length');
          const meters = parsed.value * unitDef.toMeters;
          tokens.push({
            type: 'DIMENSION',
            value: meters,
            canonicalMeters: meters,
            dimension: 'length',
            detectedUnit: candidateUnit,
            raw: rawText,
            position: startPos
          });
          pos += unitMatch[0].length;
          continue;
        }
      } else {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_CHARACTER,
          `Unknown unit suffix: "${unitMatch[2]}"`,
          startPos + unitMatch[1].length
        );
      }
    }

    // Pattern D: Standalone Fraction (e.g. "3 1/2", "5/8")
    const fractionMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+)/);
    if (fractionMatch) {
      const rawText = fractionMatch[0];
      const parsed = parseInput(rawText, { allowNegative: true });
      if (parsed.isValid) {
        tokens.push({
          type: 'NUMBER',
          value: parsed.value,
          dimension: 'scalar',
          raw: rawText,
          position: startPos
        });
        pos += fractionMatch[0].length;
        continue;
      }
    }

    // Pattern E: Standard Decimal or Integer (e.g. 2400, 900, 12.5)
    const numberMatch = remaining.match(/^(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const rawText = numberMatch[0];
      const val = parseFloat(rawText);
      if (!isNaN(val)) {
        tokens.push({
          type: 'NUMBER',
          value: val,
          dimension: 'scalar',
          raw: rawText,
          position: startPos
        });
        pos += numberMatch[0].length;
        continue;
      }
    }

    // If nothing matched, throw syntax error at current position
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.UNEXPECTED_CHARACTER,
      `Unexpected character "${str[pos]}" in expression`,
      pos
    );
  }

  if (tokens.length > MAX_TOKEN_COUNT) {
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.MAX_TOKENS_EXCEEDED,
      `Expression contains too many tokens (${tokens.length} > ${MAX_TOKEN_COUNT})`,
      0
    );
  }

  tokens.push({ type: 'EOF', value: null, raw: '', position: len });
  return tokens;
}

/**
 * Recursive Descent Expression Parser
 */
class ExpressionParser {
  constructor(tokens, defaultUnit = 'mm') {
    this.tokens = tokens;
    this.defaultUnit = defaultUnit;
    this.current = 0;
    this.depth = 0;
  }

  peek() {
    return this.tokens[this.current] || { type: 'EOF', value: null, position: 0 };
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  isAtEnd() {
    return this.peek().type === 'EOF';
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  matchOperator(...operators) {
    if (this.check('OPERATOR') && operators.includes(this.peek().value)) {
      this.advance();
      return true;
    }
    return false;
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  parse() {
    if (this.tokens.length === 1 && this.tokens[0].type === 'EOF') {
      throw createExpressionError(EXPRESSION_ERROR_CODES.EMPTY_EXPRESSION, 'Expression is empty', 0);
    }
    const ast = this.expression();
    if (!this.isAtEnd()) {
      const extraToken = this.peek();
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.UNEXPECTED_TOKEN,
        `Unexpected token "${extraToken.raw}" at end of expression`,
        extraToken.position
      );
    }
    return ast;
  }

  expression() {
    return this.addition();
  }

  addition() {
    let expr = this.multiplication();

    while (this.matchOperator('+', '-')) {
      const operator = this.previous();
      // Check for illegal consecutive operators e.g. 1200 + * 600 or 1200 + + 600
      if (this.check('OPERATOR')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
          `Unexpected operator "${this.peek().raw}" after "${operator.raw}"`,
          this.peek().position
        );
      }
      const right = this.multiplication();
      expr = {
        type: 'BINARY_OP',
        operator: operator.value,
        left: expr,
        right: right,
        position: operator.position
      };
    }

    return expr;
  }

  multiplication() {
    let expr = this.unary();

    while (this.matchOperator('*', '/')) {
      const operator = this.previous();
      // Check for illegal consecutive operators
      if (this.check('OPERATOR')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
          `Unexpected operator "${this.peek().raw}" after "${operator.raw}"`,
          this.peek().position
        );
      }
      const right = this.unary();
      expr = {
        type: 'BINARY_OP',
        operator: operator.value,
        left: expr,
        right: right,
        position: operator.position
      };
    }

    return expr;
  }

  unary() {
    if (this.matchOperator('+', '-')) {
      const operator = this.previous();
      if (this.check('OPERATOR')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
          `Unexpected operator "${this.peek().raw}" after "${operator.raw}"`,
          this.peek().position
        );
      }
      const right = this.primary();
      return {
        type: 'UNARY_OP',
        operator: operator.value,
        operand: right,
        position: operator.position
      };
    }

    return this.primary();
  }

  primary() {
    if (this.match('LPAREN')) {
      const lparen = this.previous();
      this.depth++;
      if (this.depth > MAX_NESTING_DEPTH) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.MAX_DEPTH_EXCEEDED,
          `Exceeded maximum nesting depth of ${MAX_NESTING_DEPTH}`,
          lparen.position
        );
      }

      const expr = this.expression();

      if (!this.match('RPAREN')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNBALANCED_PARENTHESES,
          'Missing closing parenthesis ")"',
          this.peek().position
        );
      }

      this.depth--;
      return {
        type: 'GROUPING',
        expression: expr,
        position: lparen.position
      };
    }

    if (this.match('DIMENSION')) {
      const tok = this.previous();
      return {
        type: 'LITERAL_DIMENSION',
        value: tok.value,
        canonicalMeters: tok.canonicalMeters,
        dimension: 'length',
        detectedUnit: tok.detectedUnit,
        raw: tok.raw,
        position: tok.position
      };
    }

    if (this.match('NUMBER')) {
      const tok = this.previous();
      return {
        type: 'LITERAL_NUMBER',
        value: tok.value,
        dimension: 'scalar',
        isBareNumber: true,
        raw: tok.raw,
        position: tok.position
      };
    }

    const unexpected = this.peek();
    if (unexpected.type === 'OPERATOR') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
        `Unexpected operator "${unexpected.raw}". Expected a measurement or number.`,
        unexpected.position
      );
    }

    throw createExpressionError(
      EXPRESSION_ERROR_CODES.MISSING_OPERAND,
      `Expected a measurement or number, but found "${unexpected.raw || 'end of expression'}"`,
      unexpected.position
    );
  }
}

/**
 * Parse an expression into an AST
 * @param {string} expression
 * @param {Object} [options]
 * @returns {Object} AST root node
 */
export function parseExpression(expression, options = {}) {
  const { defaultUnit = 'mm' } = options;
  const tokens = tokenizeExpression(expression, defaultUnit);
  const parser = new ExpressionParser(tokens, defaultUnit);
  return parser.parse();
}

/**
 * Evaluates an AST node with dimensional quantity semantics
 */
function evaluateASTNode(node, context) {
  if (!node) {
    throw createExpressionError(EXPRESSION_ERROR_CODES.EMPTY_EXPRESSION, 'Empty AST node', 0);
  }

  const { defaultUnit = 'mm' } = context;

  switch (node.type) {
    case 'LITERAL_DIMENSION':
      return {
        value: node.canonicalMeters,
        dimension: 'length',
        explicitUnit: node.detectedUnit,
        isBareNumber: false
      };

    case 'LITERAL_NUMBER':
      return {
        value: node.value,
        dimension: 'scalar',
        isBareNumber: true
      };

    case 'GROUPING':
      return evaluateASTNode(node.expression, context);

    case 'UNARY_OP': {
      const operand = evaluateASTNode(node.operand, context);
      if (node.operator === '-') {
        return {
          value: -operand.value,
          dimension: operand.dimension,
          explicitUnit: operand.explicitUnit,
          isBareNumber: operand.isBareNumber
        };
      }
      return operand;
    }

    case 'BINARY_OP': {
      const left = evaluateASTNode(node.left, context);
      const right = evaluateASTNode(node.right, context);

      return applyBinaryOperator(node.operator, left, right, defaultUnit, node.position);
    }

    default:
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.UNEXPECTED_TOKEN,
        `Unknown AST node type: ${node.type}`,
        node.position || 0
      );
  }
}

/**
 * Applies a binary arithmetic operator to two dimensional quantities
 */
function applyBinaryOperator(op, left, right, defaultUnit, position = 0) {
  const unitDef = requireUnit(defaultUnit, 'length');

  if (op === '+' || op === '-') {
    // 1. Both are lengths: length ± length -> length
    if (left.dimension === 'length' && right.dimension === 'length') {
      const val = (op === '+') ? (left.value + right.value) : (left.value - right.value);
      return {
        value: val,
        dimension: 'length',
        explicitUnit: left.explicitUnit || right.explicitUnit || defaultUnit,
        isBareNumber: false
      };
    }

    // 2. Length + Bare Scalar (e.g. 2400mm + 500)
    if (left.dimension === 'length' && right.dimension === 'scalar') {
      const rightMeters = right.value * unitDef.toMeters;
      const val = (op === '+') ? (left.value + rightMeters) : (left.value - rightMeters);
      return {
        value: val,
        dimension: 'length',
        explicitUnit: left.explicitUnit || defaultUnit,
        isBareNumber: false
      };
    }

    // 3. Bare Scalar + Length (e.g. 500 + 2400mm)
    if (left.dimension === 'scalar' && right.dimension === 'length') {
      const leftMeters = left.value * unitDef.toMeters;
      const val = (op === '+') ? (leftMeters + right.value) : (leftMeters - right.value);
      return {
        value: val,
        dimension: 'length',
        explicitUnit: right.explicitUnit || defaultUnit,
        isBareNumber: false
      };
    }

    // 4. Both are scalars:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {
      // If both are bare numbers (e.g. 2400 + 900): in defaultUnit context, treat as length in defaultUnit
      if (left.isBareNumber && right.isBareNumber) {
        const numSum = (op === '+') ? (left.value + right.value) : (left.value - right.value);
        return {
          value: numSum * unitDef.toMeters,
          dimension: 'length',
          explicitUnit: defaultUnit,
          isBareNumber: true
        };
      }

      // If one is a dimensionless scalar ratio:
      const val = (op === '+') ? (left.value + right.value) : (left.value - right.value);
      return {
        value: val,
        dimension: 'scalar',
        isBareNumber: false
      };
    }
  }

  if (op === '*') {
    // 1. length * scalar -> length (e.g. 250mm * 8)
    if (left.dimension === 'length' && right.dimension === 'scalar') {
      return {
        value: left.value * right.value,
        dimension: 'length',
        explicitUnit: left.explicitUnit || defaultUnit,
        isBareNumber: false
      };
    }

    // 2. scalar * length -> length (e.g. 8 * 250mm)
    if (left.dimension === 'scalar' && right.dimension === 'length') {
      return {
        value: left.value * right.value,
        dimension: 'length',
        explicitUnit: right.explicitUnit || defaultUnit,
        isBareNumber: false
      };
    }

    // 3. scalar * scalar:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {
      // If both are bare numbers in an architectural context (e.g. 250 * 8):
      if (left.isBareNumber && right.isBareNumber) {
        const product = left.value * right.value;
        return {
          value: product * unitDef.toMeters,
          dimension: 'length',
          explicitUnit: defaultUnit,
          isBareNumber: true
        };
      }
      return {
        value: left.value * right.value,
        dimension: 'scalar',
        isBareNumber: false
      };
    }

    // 4. length * length -> unsupported linear operation
    if (left.dimension === 'length' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Multiplying two lengths produces an area (m²); this linear expression engine calculates lengths and scalar counts. For area calculations, use the Area & Volume scaler.',
        position
      );
    }
  }

  if (op === '/') {
    // Check division by zero
    if (Math.abs(right.value) < 1e-15) {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO,
        'Division by zero is undefined',
        position
      );
    }

    // 1. length / scalar -> length (e.g. 2400mm / 3 = 800mm)
    if (left.dimension === 'length' && right.dimension === 'scalar') {
      return {
        value: left.value / right.value,
        dimension: 'length',
        explicitUnit: left.explicitUnit || defaultUnit,
        isBareNumber: false
      };
    }

    // 2. length / length -> scalar (dimensionless count / ratio, e.g. 2400mm / 800mm = 3)
    if (left.dimension === 'length' && right.dimension === 'length') {
      return {
        value: left.value / right.value,
        dimension: 'scalar',
        isBareNumber: false
      };
    }

    // 3. scalar / scalar:
    if (left.dimension === 'scalar' && right.dimension === 'scalar') {
      // If both are bare numbers (e.g. 2400 / 3):
      if (left.isBareNumber && right.isBareNumber) {
        const quotient = left.value / right.value;
        return {
          value: quotient * unitDef.toMeters,
          dimension: 'length',
          explicitUnit: defaultUnit,
          isBareNumber: true
        };
      }
      return {
        value: left.value / right.value,
        dimension: 'scalar',
        isBareNumber: false
      };
    }

    // 4. scalar / length -> unsupported
    if (left.dimension === 'scalar' && right.dimension === 'length') {
      throw createExpressionError(
        EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
        'Cannot divide a dimensionless scalar by a length measurement.',
        position
      );
    }
  }

  throw createExpressionError(
    EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
    `Unsupported operator: "${op}"`,
    position
  );
}

/**
 * Evaluates a mathematical dimension expression string
 * @param {string} expression - Architectural math expression
 * @param {Object} [options]
 * @param {string} [options.defaultUnit='mm'] - Default unit for bare numbers
 * @param {string} [options.displayUnit=null] - Preferred output unit key (e.g. 'mm', 'm', 'ft_in')
 * @param {number} [options.scaleRatio=50] - Scale ratio denominator for drawing representation
 * @param {number} [options.precision=3] - Decimal precision
 * @returns {Object} Structured expression result
 */
export function evaluateExpression(expression, options = {}) {
  const {
    defaultUnit = 'mm',
    displayUnit = null,
    scaleRatio = 50,
    precision = 3
  } = options;

  const ast = parseExpression(expression, { defaultUnit });
  const rawResult = evaluateASTNode(ast, { defaultUnit });

  if (!Number.isFinite(rawResult.value)) {
    throw createExpressionError(
      EXPRESSION_ERROR_CODES.NON_FINITE_RESULT,
      'Calculation resulted in a non-finite or invalid number',
      0
    );
  }

  return formatExpressionResult(rawResult, expression, {
    defaultUnit,
    displayUnit: displayUnit || rawResult.explicitUnit || defaultUnit,
    scaleRatio,
    precision
  });
}

/**
 * Non-throwing safe evaluation wrapper
 * @param {string} expression
 * @param {Object} [options]
 * @returns {Object} Result object with isValid boolean
 */
export function evaluateExpressionSafe(expression, options = {}) {
  try {
    return evaluateExpression(expression, options);
  } catch (err) {
    return {
      expression: expression || '',
      value: 0,
      dimension: 'length',
      canonicalMeters: 0,
      displayUnit: options.displayUnit || options.defaultUnit || 'mm',
      formatted: '---',
      secondaryFormatted: [],
      scaleRatio: options.scaleRatio || 50,
      drawingMeters: null,
      drawingFormatted: null,
      isNegative: false,
      isValid: false,
      error: {
        code: err.code || 'EVALUATION_ERROR',
        message: err.message || 'Invalid expression',
        position: typeof err.position === 'number' ? err.position : 0
      }
    };
  }
}

/**
 * Formats a calculated evaluation result into a standardized architectural object
 */
export function formatExpressionResult(rawResult, expression, options = {}) {
  const {
    defaultUnit = 'mm',
    displayUnit = 'mm',
    scaleRatio = 50,
    precision = 3
  } = options;

  const isScalar = rawResult.dimension === 'scalar';

  if (isScalar) {
    const formatted = formatNumber(rawResult.value, precision);
    return {
      expression: expression.trim(),
      value: rawResult.value,
      dimension: 'scalar',
      canonicalMeters: null,
      displayUnit: 'scalar',
      formatted: formatted,
      secondaryFormatted: [],
      scaleRatio: null,
      drawingMeters: null,
      drawingFormatted: null,
      isNegative: rawResult.value < 0,
      isValid: true,
      error: null
    };
  }

  // Linear Dimension (Length)
  const canonicalMeters = rawResult.value;
  const isNegative = canonicalMeters < 0;
  const absMeters = Math.abs(canonicalMeters);

  const unitKey = (displayUnit === 'scalar' || !displayUnit) ? defaultUnit : displayUnit;
  const unitDef = UNITS[unitKey] || UNITS.mm;
  const converted = canonicalMeters / unitDef.toMeters;

  let formatted = '';
  if (unitKey === 'ft_in') {
    const totalInches = canonicalMeters / UNITS.in.toMeters;
    formatted = `${isNegative ? '-' : ''}${formatFeetInches(Math.abs(totalInches))}`;
  } else {
    formatted = `${isNegative ? '-' : ''}${formatNumber(Math.abs(converted), precision)} ${unitDef.symbol}`;
  }

  // Secondary representations across standard units
  const secondaryFormatted = [
    { unit: 'm', value: canonicalMeters, formatted: `${isNegative ? '-' : ''}${formatNumber(absMeters, precision)} m` },
    { unit: 'cm', value: canonicalMeters * 100, formatted: `${isNegative ? '-' : ''}${formatNumber(absMeters * 100, precision > 1 ? precision - 1 : 1)} cm` },
    { unit: 'mm', value: canonicalMeters * 1000, formatted: `${isNegative ? '-' : ''}${formatNumber(absMeters * 1000, 0)} mm` },
    { unit: 'ft_in', value: canonicalMeters / 0.0254, formatted: `${isNegative ? '-' : ''}${formatFeetInches(absMeters / 0.0254)}` }
  ];

  // Scale drawing calculation
  let drawingMeters = null;
  let drawingFormatted = null;

  if (scaleRatio && scaleRatio > 0) {
    drawingMeters = canonicalMeters / scaleRatio;
    const drawingUnit = (unitKey === 'ft' || unitKey === 'in' || unitKey === 'ft_in') ? 'in' : 'mm';
    const drawUnitDef = UNITS[drawingUnit] || UNITS.mm;
    const drawConverted = drawingMeters / drawUnitDef.toMeters;
    drawingFormatted = `${isNegative ? '-' : ''}${formatNumber(Math.abs(drawConverted), precision)} ${drawUnitDef.symbol}`;
  }

  return {
    expression: expression.trim(),
    value: canonicalMeters,
    dimension: 'length',
    canonicalMeters: canonicalMeters,
    displayUnit: unitKey,
    formatted: formatted,
    secondaryFormatted: secondaryFormatted,
    scaleRatio: scaleRatio,
    drawingMeters: drawingMeters,
    drawingFormatted: drawingFormatted,
    isNegative: isNegative,
    isValid: true,
    error: null
  };
}

/**
 * Creates a structured expression error object
 */
function createExpressionError(code, message, position = 0) {
  const err = new Error(message);
  err.code = code;
  err.position = position;
  return err;
}
