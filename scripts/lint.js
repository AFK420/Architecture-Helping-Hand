/**
 * Architecture Helping Hand - Zero-Dependency Lint
 *
 * Static checks that complement the build-integrity test suite. Run via
 * `npm run lint` (also wired into CI).
 *
 * Checks:
 *  1. Duplicate top-level declarations (function/const/let/class) across all
 *     src/ modules. The build concatenates every module into ONE IIFE scope:
 *     duplicate function declarations silently merge (last one wins — the
 *     historical stair/ramp buildGeometry corruption), and duplicate
 *     const/let declarations throw at bundle parse time. Either way the
 *     mistake surfaces here with file names, not as a runtime mystery.
 *  2. No eval() / new Function() in src/ (CSP/XSS hardening).
 *  3. No debugger statements left in src/.
 *  4. Warning: console.* calls in src/core (pure calculation modules should
 *     not log; UI layers own all console output).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..', 'src');

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = listJsFiles(srcDir);

/** Strip line/block comments so declaration regexes never match inside them. */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

const DECLARATION_RE = /^(?:export\s+)?(?:default\s+)?(function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/gm;
const errors = [];
const warnings = [];

const declarations = new Map(); // name -> [file:line, kind]
const fileSources = new Map();

for (const file of files) {
  const rel = path.relative(srcDir, file).replace(/\\/g, '/');
  const raw = fs.readFileSync(file, 'utf-8');
  const code = stripComments(raw);
  fileSources.set(rel, code);

  // Top-level only: declarations must start at line start (no indentation).
  // Exported or not, the bundle shares one scope, so both count.
  const re = /^((?:export\s+)?(?:default\s+)?)(function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/gm;
  let m;
  while ((m = re.exec(code)) !== null) {
    const [, , kind, name] = m;
    const line = code.slice(0, m.index).split('\n').length;
    const key = `${kind.startsWith('function') || kind === 'class' ? kind : 'var'}:${name}`;
    if (!declarations.has(key)) declarations.set(key, []);
    declarations.get(key).push(`${rel}:${line} (${kind} ${name})`);
  }

  if (/\beval\s*\(/.test(code)) errors.push(`${rel}: eval() is banned in src/`);
  if (/\bnew\s+Function\s*\(/.test(code)) errors.push(`${rel}: new Function() is banned in src/`);
  if (/\bdebugger\b/.test(code)) errors.push(`${rel}: debugger statement left in source`);
  if (rel.startsWith('core/') && /\bconsole\.(log|info|debug)\b/.test(code)) {
    for (const lineMatch of code.matchAll(/\bconsole\.(log|info|debug)\b/g)) {
      const line = code.slice(0, lineMatch.index).split('\n').length;
      warnings.push(`${rel}:${line}: console.${lineMatch[1]} in a pure core module`);
    }
  }
}

for (const [key, sites] of declarations) {
  if (sites.length > 1) {
    errors.push(`Duplicate top-level declaration "${key}" — the bundle shares ONE scope: ${sites.join(' | ')}`);
  }
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
for (const e of errors) console.error(`❌ ${e}`);

console.log(`\nLinted ${files.length} source files: ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length > 0) process.exit(1);
