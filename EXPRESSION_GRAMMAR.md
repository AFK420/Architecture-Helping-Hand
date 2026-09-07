# Expression Grammar

**Engine:** `src/core/dimension-expression.js` — tokenizer + recursive-descent
parser + AST + dimensional evaluator. Precedence is explicit in the grammar.

## Grammar (EBNF, precedence high → low)

```ebnf
expression    = comparison ;
comparison    = addition , { ("=" | "==" | "!=" | "<>" | "<" | ">" | "<=" | ">=") , addition } ;
addition      = multiplication , { ("+" | "-") , multiplication } ;
multiplication= power , { ("*" | "/" | "%") , power } ;
power         = unary , [ "^" , power ] ;           (* right-associative *)
unary         = [ "+" | "-" ] , primary ;
primary       = "(" , expression , ")"
              | function-call
              | dimension
              | area-dimension
              | volume-dimension
              | number
              | fraction ;
function-call = ( "min" | "max" | "abs" | "sqrt" | "round" | "ceil" | "floor" ) ,
                "(" , [ expression , { "," , expression } ] , ")" ;
dimension     = number | fraction , length-unit ;
area-dimension= number , area-unit ;
volume-dimension = number , volume-unit ;
length-unit   = "mm" | "cm" | "dm" | "m" | "km" | "in" | "ft" | "yd" | "mi" ;
area-unit     = "m2" | "m²" | "cm2" | "mm2" | "km2" | "ha" | "sq_ft" | "sq_in" | "sq_yd" | "acre" ;
volume-unit   = "m3" | "m³" | "cm3" | "mm3" | "liters" | "L" | "cu_ft" | "cu_in" | "cu_yd" ;
number        = digit , { digit | "." } , [ ("e" | "E") , ["+" | "-"] , digit , { digit } ] ;
fraction      = digit , { digit } , "/" , digit , { digit }
              | digit , { digit } , [ "." , digit ] , " " , fraction ;   (* 6 1/2 *)
```

Special architectural literals (tokenized before generic number):

```ebnf
feet-inches   = feet , [ "-" | "–" | "—" ] , [ inches ] ;
feet          = number , ( "'" | "′" ) ;
inches        = ( number | fraction ) , [ '"' | '″' ] ;
```

Examples: `7' 6"` · `2'-6"` · `12'6"` · `8'` · `6"` · `7' 6 1/2"` · `6 1/2"` · `1/4"`

## Dimensional evaluation table

| Expression | Result dimension |
|---|---|
| length ± length | length |
| length ± bare number | length (number in default unit) |
| area ± area, volume ± volume | area / volume |
| length ± area (etc.) | **INVALID — INCOMPATIBLE_DIMENSIONS** |
| length * length | area |
| area * length, length * area | volume |
| x * scalar, scalar * x | x (bare*bare = length in default unit) |
| length ^ 2, length ^ 3 | area, volume |
| length ^ other | **INVALID** (explained: only 1, 2, 3 are architectural) |
| length / length | scalar (ratio) |
| area / length | length |
| volume / length | area |
| volume / area | length |
| same / same | scalar (ratio) |
| scalar / length | **INVALID** |
| a % b | remainder, a's dimension (b ≠ 0) |
| comparison | boolean |

## AST node types

`LITERAL_DIMENSION` (length) · `LITERAL_AREA` · `LITERAL_VOLUME` ·
`LITERAL_NUMBER` · `UNARY_OP` · `BINARY_OP` (+ − * / % ^) · `COMPARISON_OP` ·
`FUNCTION_CALL` · `GROUPING`.

## Limits (deterministic rejection, not truncation)

- expression ≤ 1000 characters → `EXPRESSION_TOO_LONG`
- ≤ 200 tokens → `MAX_TOKENS_EXCEEDED`
- nesting ≤ 50 → `MAX_DEPTH_EXCEEDED`
- zero-dependency: no `eval`, no `new Function`

## Error codes

`EMPTY_EXPRESSION` · `EXPRESSION_TOO_LONG` · `MAX_TOKENS_EXCEEDED` ·
`MAX_DEPTH_EXCEEDED` · `UNEXPECTED_CHARACTER` · `UNEXPECTED_TOKEN` ·
`UNEXPECTED_OPERATOR` · `MISSING_OPERAND` · `UNBALANCED_PARENTHESES` ·
`INCOMPATIBLE_DIMENSIONS` · `DIVISION_BY_ZERO` · `NON_FINITE_RESULT`.
Every error message answers WHAT failed, WHY, and shows the expected form.
