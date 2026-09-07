src = open(r'E:\Scaler\src\core\dimension-expression.js', encoding='utf-8').read()
start = src.index('/**\n * Applies a binary arithmetic operator to two dimensional quantities')
end = src.index('/**\n * Evaluates a mathematical dimension expression string')
clean = open(r'E:\Scaler\scratch\clean_binary_op.js', encoding='utf-8').read()
src = src[:start] + clean + src[end:]
open(r'E:\Scaler\src\core\dimension-expression.js', 'w', encoding='utf-8', newline='\n').write(src)
print('applyBinaryOperator rewritten cleanly, size', len(clean))
