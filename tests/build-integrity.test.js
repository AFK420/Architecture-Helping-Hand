/**
 * Architecture Helping Hand - Build Integrity Test Suite
 * Guards the deterministic build pipeline against the exact failure that broke
 * the shipped bundle: source modules existing under src/ but never registered
 * in the build manifest, so js/app.js was missing them at runtime.
 *
 * Three layers of defense:
 *   1. MANIFEST COVERAGE  — every runtime module under src/ is registered in
 *      scripts/build.js (BUNDLE_MODULES or the NON_RUNTIME_MODULES allowlist),
 *      registered exactly once, and ordered dependency-first.
 *   2. BUNDLE CONTENT     — the generated js/app.js actually contains the
 *      distinctive definitions of every module (not just valid syntax).
 *   3. RUNTIME SMOKE      — the bundle executes end-to-end in a minimal mocked
 *      browser environment and the app boots without ReferenceErrors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUNDLE_MODULES, NON_RUNTIME_MODULES, generateBundleContent } from '../scripts/build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const bundlePath = path.join(rootDir, 'js', 'app.js');

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

console.log('🧪 Running tests/build-integrity.test.js...');

// ---------------------------------------------------------------------------
// RUNTIME MODULE RULE (documented contract):
//
// A "runtime source module" is any *.js file under src/. The project keeps
// test helpers, fixtures, and support code exclusively in tests/, never under
// src/. Therefore every src/**/*.js file must be a registered bundle module.
//
// If a future support-only file genuinely must live under src/, it must be
// added to NON_RUNTIME_MODULES in scripts/build.js with a documented reason.
// The coverage checks below enforce: src tree == BUNDLE_MODULES ∪ NON_RUNTIME_MODULES.
// ---------------------------------------------------------------------------

// 1. Discover the actual src tree recursively
function walkJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsFiles(full));
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const srcFiles = walkJsFiles(srcDir).map(f => path.relative(rootDir, f).split(path.sep).join('/')).sort();
const manifestFiles = BUNDLE_MODULES.map(m => path.relative(rootDir, m.file).split(path.sep).join('/')).sort();
const allowedNonRuntime = NON_RUNTIME_MODULES.map(f => f.split(path.sep).join('/')).sort();

// 1a. Every src file is accounted for by the manifest
{
  const missing = srcFiles.filter(f => !manifestFiles.includes(f) && !allowedNonRuntime.includes(f));
  assert(
    missing.length === 0,
    'Manifest coverage: every src/**/*.js runtime module is registered in the build manifest',
    missing.length > 0 ? `unregistered: ${missing.join(', ')}` : 'all covered'
  );
}

// 1b. The manifest does not reference phantom files
{
  const phantom = manifestFiles.filter(f => !srcFiles.includes(f));
  assert(
    phantom.length === 0,
    'Manifest accuracy: every manifest entry points to a real src file',
    phantom.length > 0 ? `phantom: ${phantom.join(', ')}` : 'none'
  );
}

// 1c. The NON_RUNTIME_MODULES allowlist stays honest
{
  const bogus = allowedNonRuntime.filter(f => srcFiles.includes(f));
  const unknown = allowedNonRuntime.filter(f => !srcFiles.includes(f) && !fs.existsSync(path.join(rootDir, f)));
  assert(
    bogus.length === 0,
    'Allowlist hygiene: NON_RUNTIME_MODULES entries are not bundled (never in BUNDLE_MODULES)',
    bogus.length > 0 ? `conflict: ${bogus.join(', ')}` : 'none'
  );
  assert(
    unknown.length === 0,
    'Allowlist hygiene: NON_RUNTIME_MODULES entries point at real files',
    unknown.length > 0 ? `stale: ${unknown.join(', ')}` : 'none'
  );
}

// 1d. No duplicate manifest registrations
{
  const dupes = manifestFiles.filter((f, i) => manifestFiles.indexOf(f) !== i);
  assert(
    dupes.length === 0,
    'Manifest uniqueness: no module is registered more than once',
    dupes.length > 0 ? `duplicated: ${dupes.join(', ')}` : 'none'
  );
}

// 1e. Dependency-first ordering: every relative import of a manifest module
//     must be declared at or before the importing module's position.
{
  const positionByAbsPath = new Map(BUNDLE_MODULES.map((m, i) => [path.resolve(m.file), i]));
  const resolvedByRelative = new Map();
  for (const mod of BUNDLE_MODULES) {
    resolvedByRelative.set('./' + path.basename(mod.file), path.resolve(mod.file));
  }

  const violations = [];
  for (const mod of BUNDLE_MODULES) {
    const code = fs.readFileSync(mod.file, 'utf-8');
    const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const spec = match[1];
      const targetAbs = path.resolve(path.dirname(mod.file), spec);
      const targetPos = positionByAbsPath.get(targetAbs);
      const selfPos = positionByAbsPath.get(path.resolve(mod.file));
      if (targetPos !== undefined && targetPos > selfPos) {
        const targetName = BUNDLE_MODULES[targetPos].name;
        violations.push(`${mod.name} imports ${targetName} which is bundled later`);
      }
    }
  }
  assert(
    violations.length === 0,
    'Dependency order: no module is bundled before a module it imports',
    violations.length > 0 ? violations.join('; ') : 'valid topological order'
  );
}

// 1f. All required toolkit modules are manifest entries (regression pin for
//     the six modules that were historically omitted)
{
  const required = [
    'src/core/dimension-expression.js',
    'src/core/multi-scale.js',
    'src/core/dimension-chains.js',
    'src/core/cad-clipboard.js',
    'src/core/batch-cad.js',
    'src/core/quick-dimension.js'
  ];
  const absent = required.filter(f => !manifestFiles.includes(f));
  assert(
    absent.length === 0,
    'Regression pin: all six historically-omitted toolkit modules are in the manifest',
    absent.length > 0 ? `still missing: ${absent.join(', ')}` : 'all present'
  );
}

// 2. Bundle content verification — definitions genuinely present in js/app.js
const bundleCode = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf-8') : '';
assert(fs.existsSync(bundlePath), 'Generated bundle js/app.js exists');
assert(bundleCode.includes('MODULE: QuickDimension'), 'Bundle contains MODULE: QuickDimension section');

// Regenerate from source and verify the shipped bundle matches byte-for-byte
// (trimmed) — the same invariant scripts/build.js --check enforces, but as a
// test so `npm test` alone catches drift.
assert(
  bundleCode.trim() === generateBundleContent().trim(),
  'Bundle regeneration check: js/app.js is byte-identical to a fresh build from src/'
);

// Probe table: distinctive exported definition per module that the runtime
// bundle MUST contain. Names chosen to be unique to their source module.
{
  const probes = [
    // Module:                    distinctive definition probe:
    ['Units',                 'function requireUnit('],
    ['Presets',               'const SCALE_PRESETS ='],
    ['Formatter',             'function formatFeetInches('],
    ['Parser',                'function parseArchitecturalInput('],
    ['Calculator',            'function scaleDimension('],
    ['Geometry',              'function calcPolygon('],
    ['Furniture',             'const FURNITURE_DATABASE ='],
    ['DimensionWorkspace',    'function createDimensionEntry('],
    ['DimensionExpression',   'function evaluateExpressionSafe('],
    ['CadClipboard',          'function formatCadValue('],
    ['MultiScale',            'function compareAcrossScales('],
    ['DimensionChains',       'function calculateChain('],
    ['BatchCad',              'function parseBatchInput('],
    ['QuickDimension',        'function evaluateQuickDimension('],
    ['Storage',               'const StorageService ='],
    ['Audio',                 'const AudioService ='],
    ['History',               'const HistoryService ='],
    ['Commands',              'class CommandRegistryClass'],
    ['Visualizer',            'function updateVisualization('],
    ['App',                   'function initializeApp(']
  ];
  for (const [moduleName, probe] of probes) {
    assert(
      bundleCode.includes(probe),
      `Bundle content: ${moduleName} definition present ("${probe}")`
    );
  }
}

// 3. Runtime smoke test — execute the bundle in a minimal mocked browser
//    environment. This catches ReferenceErrors from modules that are present
//    in the bundle but whose *dependencies* were not (the historical failure:
//    ui/app.js imported createDimensionChain, which was undefined at runtime).
{
  function makeMockElement() {
    const el = {
      style: {},
      dataset: {},
      classList: {
        add() {}, remove() {}, toggle() {}, contains() { return false; }
      },
      setAttribute() {},
      getAttribute() { return null; },
      removeAttribute() {},
      appendChild() { return el; },
      addEventListener() {},
      removeEventListener() {},
      focus() {},
      select() {},
      click() {},
      querySelector() { return makeMockElement(); },
      querySelectorAll() { return { forEach() {}, length: 0 }; },
      closest() { return null; },
      getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
      textContent: '',
      innerHTML: '',
      value: '',
      hidden: false,
      disabled: false,
      options: [],
      selectedIndex: 0
    };
    return el;
  }

  const documentMock = {
    readyState: 'complete',
    getElementById: () => makeMockElement(),
    querySelector: () => makeMockElement(),
    querySelectorAll: () => ({ forEach() {}, length: 0 }),
    createElement: () => makeMockElement(),
    addEventListener() {},
    documentElement: makeMockElement(),
    body: makeMockElement()
  };

  const store = new Map();
  const localStorageMock = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };

  let smokeError = null;
  try {
    const bootFn = new Function(
      'window', 'document', 'navigator', 'localStorage',
      bundleCode
    );
    bootFn(documentMock, documentMock, { clipboard: undefined }, localStorageMock);
  } catch (err) {
    smokeError = err;
  }

  assert(
    smokeError === null,
    `Runtime smoke: bundle boots end-to-end with mocked browser APIs`,
    smokeError ? `${smokeError.constructor.name}: ${smokeError.message}` : 'no errors'
  );
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
