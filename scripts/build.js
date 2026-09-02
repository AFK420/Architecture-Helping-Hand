/**
 * Architecture Helping Hand - Zero-Dependency Build Script
 * Compiles modular ES6 files in src/ into the standalone browser bundle js/app.js.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srcDir = path.join(rootDir, 'src');
const distFile = path.join(rootDir, 'js', 'app.js');

/**
 * Build manifest — the single source of truth for bundle composition.
 *
 * CONTRACT:
 * - Every runtime source module under src/ MUST be registered here exactly once.
 * - Order MUST be dependency-first: a module's relative imports must all be
 *   listed above it (enforced by tests/build-integrity.test.js).
 * - Test-only/support files are never placed under src/ (they live in tests/),
 *   so at present every JS file under src/ is a runtime module. If a future
 *   support-only file must live under src/, add it to NON_RUNTIME_MODULES
 *   with a documented reason — the coverage test enforces the union.
 */
export const BUNDLE_MODULES = [
  // --- Core foundations (no intra-core dependencies beyond those listed) ---
  { name: 'Units', file: path.join(srcDir, 'core', 'units.js') },
  { name: 'Presets', file: path.join(srcDir, 'core', 'presets.js') },
  { name: 'Formatter', file: path.join(srcDir, 'core', 'formatter.js') },
  { name: 'Parser', file: path.join(srcDir, 'core', 'parser.js') },
  { name: 'Calculator', file: path.join(srcDir, 'core', 'calculator.js') },
  { name: 'Geometry', file: path.join(srcDir, 'core', 'geometry.js') },
  { name: 'Furniture', file: path.join(srcDir, 'core', 'furniture.js') },

  // --- Toolkit feature core (dependency order: workspace -> expression ->
  //     cad-clipboard -> multi-scale/chains -> batch-cad/quick-dimension) ---
  { name: 'DimensionWorkspace', file: path.join(srcDir, 'core', 'dimension-workspace.js') },
  { name: 'DimensionExpression', file: path.join(srcDir, 'core', 'dimension-expression.js') },
  { name: 'CadClipboard', file: path.join(srcDir, 'core', 'cad-clipboard.js') },
  { name: 'MultiScale', file: path.join(srcDir, 'core', 'multi-scale.js') },
  { name: 'DimensionChains', file: path.join(srcDir, 'core', 'dimension-chains.js') },
  { name: 'BatchCad', file: path.join(srcDir, 'core', 'batch-cad.js') },
  { name: 'QuickDimension', file: path.join(srcDir, 'core', 'quick-dimension.js') },
  { name: 'CadTargets', file: path.join(srcDir, 'core', 'cad-targets.js') },
  { name: 'Project', file: path.join(srcDir, 'core', 'project.js') },

  // --- Services ---
  { name: 'Storage', file: path.join(srcDir, 'services', 'storage.js') },
  { name: 'Audio', file: path.join(srcDir, 'services', 'audio.js') },
  { name: 'History', file: path.join(srcDir, 'services', 'history.js') },
  { name: 'Commands', file: path.join(srcDir, 'services', 'commands.js') },

  // --- UI (last: imports everything above) ---
  { name: 'ViewRegistry', file: path.join(srcDir, 'ui', 'view-registry.js') },
  { name: 'Visualizer', file: path.join(srcDir, 'ui', 'visualizer.js') },
  { name: 'ViewConverter', file: path.join(srcDir, 'ui', 'views', 'converter.js') },
  { name: 'ViewRescaler', file: path.join(srcDir, 'ui', 'views', 'rescaler.js') },
  { name: 'ViewDetector', file: path.join(srcDir, 'ui', 'views', 'detector.js') },
  { name: 'ViewAreaVolume', file: path.join(srcDir, 'ui', 'views', 'area-volume.js') },
  { name: 'ViewExpressionMultiScale', file: path.join(srcDir, 'ui', 'views', 'expression-multiscale.js') },
  { name: 'ViewDimensionChains', file: path.join(srcDir, 'ui', 'views', 'dimension-chains.js') },
  { name: 'ViewCadClipboardHandoff', file: path.join(srcDir, 'ui', 'views', 'cad-clipboard-handoff.js') },
  { name: 'ViewBatchCad', file: path.join(srcDir, 'ui', 'views', 'batch-cad.js') },
  { name: 'ViewQuickDimension', file: path.join(srcDir, 'ui', 'views', 'quick-dimension.js') },
  { name: 'ViewHistory', file: path.join(srcDir, 'ui', 'views', 'history.js') },
  { name: 'App', file: path.join(srcDir, 'ui', 'app.js') }
];

/**
 * Explicit allowlist of src/ files that are intentionally NOT runtime modules
 * (test helpers, type-only modules, etc.). Keep this empty unless a file has a
 * documented reason to live under src/ without being bundled. The coverage test
 * in tests/build-integrity.test.js enforces: every JS file under src/ must appear
 * in BUNDLE_MODULES or here.
 */
export const NON_RUNTIME_MODULES = [];

export function stripImportsAndExports(code) {
  return code
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+['"][^'"]+['"];?/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ')
    // Re-exports: `export { A, B } from './module.js';` (must run before bare export-braces form)
    .replace(/export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, '')
    .replace(/export\s*\{[\s\S]*?\};?/g, '');
}

export function generateBundleContent() {
  const modules = BUNDLE_MODULES;

  let bundleContent = `/**
 * Architecture Helping Hand - Standalone Bundle v2.1.0
 * Compiled automatically from src/ modules (see BUNDLE_MODULES in scripts/build.js).
 * Works with file:/// and http:// protocols.
 */

(function() {
  'use strict';

`;

  for (const mod of modules) {
    if (!fs.existsSync(mod.file)) {
      throw new Error(`Missing source file: ${mod.file}`);
    }
    const raw = fs.readFileSync(mod.file, 'utf-8');
    const cleaned = stripImportsAndExports(raw);
    bundleContent += `  // =========================================================================\n`;
    bundleContent += `  // MODULE: ${mod.name}\n`;
    bundleContent += `  // =========================================================================\n\n`;
    bundleContent += cleaned + '\n\n';
  }

  bundleContent += `
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

})();

`;

  return bundleContent;
}

export function build() {
  console.log('📦 Building Architecture Helping Hand standalone bundle...');
  const bundleContent = generateBundleContent();
  fs.mkdirSync(path.dirname(distFile), { recursive: true });
  fs.writeFileSync(distFile, bundleContent, 'utf-8');
  console.log(`✅ Built successfully to ${distFile} (${(bundleContent.length / 1024).toFixed(1)} KB)`);
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(distFile)) {
      console.error(`❌ Bundle ${distFile} does not exist.`);
      process.exit(1);
    }
    const current = fs.readFileSync(distFile, 'utf-8');
    const expected = generateBundleContent();
    if (current.trim() !== expected.trim()) {
      console.error(`❌ Bundle ${distFile} is out of sync with src/. Run "node scripts/build.js" to update it.`);
      process.exit(1);
    }
    console.log(`✅ Bundle ${distFile} is in sync with src/.`);
  } else {
    build();
  }
}
