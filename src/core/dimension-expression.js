/**
 * Architecture Helping Hand - Dimension Expression Engine
 * Phase 2.5: Daily Architect Toolkit — Part 3: Dimension Expression Engine
 *
 * Deterministic architectural dimension expression engine with mixed-unit
 * dimensional arithmetic, operator precedence, parentheses, and live scale conversions.
 * Zero-dependency, pure mathematical parser. Never uses eval() or new Function().
 */

import { UNITS, AREA_UNITS, VOLUME_UNITS, requireUnit } from './units.js';
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

    // 2b. Comma (function argument separator)
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',', raw: ',', position: startPos });
      pos++;
      continue;
    }

    // 3. Comparison operators: <= >= != <> == = < >
    const remaining = str.slice(pos);
    const cmpMatch = remaining.match(/^(<=|>=|!=|<>|==|=|<|>)/);
    if (cmpMatch) {
      const normalized = { '<=': '<=', '>=': '>=', '!=': '!=', '<>': '!=', '==': '=', '=': '=', '<': '<', '>': '>' }[cmpMatch[1]];
      tokens.push({ type: 'COMPARISON', value: normalized, raw: cmpMatch[1], position: startPos });
      pos += cmpMatch[1].length;
      continue;
    }

    // 3b. Operators: +, -, *, /, %, ^, ×, ÷, −
    if (char === '+' || char === '*' || char === '/' || char === '%' || char === '^' || char === '×' || char === '÷' || char === '−') {
      const normalizedOp = (char === '×') ? '*' : ((char === '÷') ? '/' : ((char === '−') ? '-' : ((char === '^') ? '^' : char)));
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

    // 3c. Function identifiers: min( max( abs( sqrt( round( ceil( floor(
    const fnMatch = remaining.match(/^(min|max|abs|sqrt|round|ceil|floor)\s*\(/i);
    if (fnMatch) {
      tokens.push({ type: 'FUNCTION', value: fnMatch[1].toLowerCase(), raw: fnMatch[1], position: startPos });
      pos += fnMatch[0].length - 1; // leave the '(' for the LPAREN branch
      continue;
    }

    // 4. Dimensional or Numeric Literals
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

    // Pattern C: Number with Unit Suffix (e.g. 2400mm, 2.4m, 150cm, 12ft, 10yd,
    // 4m2/m², 2.5m3/m³, 120sq_ft, 2ha — with optional thin space)
    // Pattern C0: Scientific notation with a known unit (e.g. 1e3mm, 2.5e-1m)
    const sciUnitMatch = remaining.match(/^(\d+(?:\.\d+)?[eE][+-]?\d+)\s*([a-zA-Z²³_]+)/);
    if (sciUnitMatch) {
      const candidateUnit = sciUnitMatch[2].toLowerCase();
      if (UNITS[candidateUnit]) {
        const unitDef = requireUnit(candidateUnit, 'length');
        const meters = parseFloat(sciUnitMatch[1]) * unitDef.toMeters;
        tokens.push({ type: 'DIMENSION', value: meters, canonicalMeters: meters, dimension: 'length', detectedUnit: candidateUnit, raw: sciUnitMatch[0].trim(), position: startPos });
        pos += sciUnitMatch[0].length;
        continue;
      } else {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_CHARACTER,
          `Unknown unit suffix: "${sciUnitMatch[2]}"`,
          startPos + sciUnitMatch[1].length
        );
      }
    }

    const unitMatch = remaining.match(/^(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*([a-zA-Z][a-zA-Z0-9²³_]*)/);
    if (unitMatch) {
      const candidateUnit = unitMatch[2].toLowerCase().replace('²', '2').replace('³', '3');
      const areaUnit = AREA_UNITS[candidateUnit] || AREA_UNITS[candidateUnit.replace(/ft2$|ft²$/, 'sq_ft').replace(/in2$|in²$/, 'sq_in').replace(/yd2$|yd²$/, 'sq_yd')];
      const volUnit = VOLUME_UNITS[candidateUnit] || VOLUME_UNITS[candidateUnit.replace(/ft3$|ft³$/, 'cu_ft').replace(/in3$|in³$/, 'cu_in').replace(/yd3$|yd³$/, 'cu_yd')];
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
      } else if (areaUnit) {
        const rawText = unitMatch[0].trim();
        const value = unitMatch[1].includes('/') || unitMatch[1].includes(' ')
          ? parseInput(unitMatch[1], { allowNegative: true }).value
          : parseFloat(unitMatch[1].replace(/\s+/g, ''));
        if (Number.isFinite(value)) {
          tokens.push({
            type: 'DIMENSION',
            value: value * areaUnit.toSqMeters,
            canonicalSqMeters: value * areaUnit.toSqMeters,
            dimension: 'area',
            detectedUnit: areaUnit.key,
            raw: rawText,
            position: startPos
          });
          pos += unitMatch[0].length;
          continue;
        }
      } else if (volUnit) {
        const rawText = unitMatch[0].trim();
        const value = unitMatch[1].includes('/') || unitMatch[1].includes(' ')
          ? parseInput(unitMatch[1], { allowNegative: true }).value
          : parseFloat(unitMatch[1].replace(/\s+/g, ''));
        if (Number.isFinite(value)) {
          tokens.push({
            type: 'DIMENSION',
            value: value * volUnit.toCuMeters,
            canonicalCuMeters: value * volUnit.toCuMeters,
            dimension: 'volume',
            detectedUnit: volUnit.key,
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

    // Pattern E: Standard Decimal or Integer with optional scientific notation
    // (e.g. 2400, 900, 12.5, 1e3, 2.5E-2) — notation must not swallow a unit
    // letter, so the exponent is only consumed when followed by a digit/+/-.
    const numberMatch = remaining.match(/^(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![a-zA-Z²³_])/);
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
    return this.comparison();
  }

  // Lowest precedence: comparisons produce booleans (e.g. 2m = 2000mm)
  comparison() {
    let expr = this.addition();
    while (this.check('COMPARISON')) {
      const operator = this.advance();
      const right = this.addition();
      expr = {
        type: 'COMPARISON_OP',
        operator: operator.value,
        left: expr,
        right: right,
        position: operator.position
      };
    }
    return expr;
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
    let expr = this.power();

    while (this.matchOperator('*', '/', '%')) {
      const operator = this.previous();
      // Check for illegal consecutive operators
      if (this.check('OPERATOR')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
          `Unexpected operator "${this.peek().raw}" after "${operator.raw}"`,
          this.peek().position
        );
      }
      const right = this.power();
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

  // Right-associative power: 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2)
  power() {
    const base = this.unary();
    if (this.matchOperator('^')) {
      const operator = this.previous();
      if (this.check('OPERATOR')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
          `Unexpected operator "${this.peek().raw}" after "${operator.raw}"`,
          this.peek().position
        );
      }
      const exponent = this.power();
      return {
        type: 'BINARY_OP',
        operator: '^',
        left: base,
        right: exponent,
        position: operator.position
      };
    }
    return base;
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

    if (this.match('FUNCTION')) {
      const fnTok = this.previous();
      if (!this.match('LPAREN')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.MISSING_OPERAND,
          `Function "${fnTok.value}" expects "(" and its arguments — e.g. ${fnTok.value}(2m, 500mm)`,
          fnTok.position
        );
      }
      const args = [];
      if (!this.check('RPAREN')) {
        args.push(this.expression());
        while (this.match('COMMA')) {
          args.push(this.expression());
        }
      }
      if (!this.match('RPAREN')) {
        throw createExpressionError(
          EXPRESSION_ERROR_CODES.UNBALANCED_PARENTHESES,
          `Missing closing parenthesis ")" for ${fnTok.value}(...)`,
          this.peek().position
        );
      }
      return {
        type: 'FUNCTION_CALL',
        name: fnTok.value,
        args,
        position: fnTok.position
      };
    }

    if (this.match('DIMENSION')) {
      const tok = this.previous();
      if (tok.dimension === 'area') {
        return { type: 'LITERAL_AREA', value: tok.canonicalSqMeters, dimension: 'area', detectedUnit: tok.detectedUnit, raw: tok.raw, position: tok.position };
      }
      if (tok.dimension === 'volume') {
        return { type: 'LITERAL_VOLUME', value: tok.canonicalCuMeters, dimension: 'volume', detectedUnit: tok.detectedUnit, raw: tok.raw, position: tok.position };
      }
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
    }

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
      let lv = left.value, rv = right.value;
      // bare + bare: interpret both in the default unit (2400 + 900 mm → 3.3 m)
      if (left.isBareNumber && right.isBareNumber) {
        lv = left.value * unitDef.toMeters;
        rv = right.value * unitDef.toMeters;
      }
      return {
        value: lv + sgn * rv,
        dimension: (left.isBareNumber && right.isBareNumber) ? 'length' : left.dimension,
        explicitUnit: (left.isBareNumber && right.isBareNumber) ? defaultUnit : (left.explicitUnit || right.explicitUnit || defaultUnit),
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
    // x * scalar keeps x — except bare * bare, which is a length in the
    // default unit (250 * 8 → 2000 mm), matching the additive semantics
    if (right.dimension === 'scalar' || right.dimension === 'boolean') {
      if (left.isBareNumber && right.isBareNumber && left.dimension === 'scalar') {
        return { value: left.value * right.value * unitDef.toMeters, dimension: 'length', explicitUnit: defaultUnit, isBareNumber: true };
      }
      return { value: left.value * right.value, dimension: left.dimension, explicitUnit: left.explicitUnit, isBareNumber: false };
    }
    if (left.dimension === 'scalar' || left.dimension === 'boolean') {
      if (left.isBareNumber && right.isBareNumber && right.dimension === 'scalar') {
        return { value: left.value * right.value * unitDef.toMeters, dimension: 'length', explicitUnit: defaultUnit, isBareNumber: true };
      }
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

  // Boolean results (comparisons) bypass the numeric finite check
  if (rawResult.dimension !== 'boolean' && !Number.isFinite(rawResult.value)) {
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
