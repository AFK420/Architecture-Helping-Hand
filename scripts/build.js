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

export function stripImportsAndExports(code) {
  return code
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+['"][^'"]+['"];?/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ')
    .replace(/export\s*\{[\s\S]*?\};?/g, '');
}

export function generateBundleContent() {
  const modules = [
    { name: 'Units', file: path.join(srcDir, 'core', 'units.js') },
    { name: 'Presets', file: path.join(srcDir, 'core', 'presets.js') },
    { name: 'Formatter', file: path.join(srcDir, 'core', 'formatter.js') },
    { name: 'Parser', file: path.join(srcDir, 'core', 'parser.js') },
    { name: 'Calculator', file: path.join(srcDir, 'core', 'calculator.js') },
    { name: 'Geometry', file: path.join(srcDir, 'core', 'geometry.js') },
    { name: 'Furniture', file: path.join(srcDir, 'core', 'furniture.js') },
    { name: 'Storage', file: path.join(srcDir, 'services', 'storage.js') },
    { name: 'Audio', file: path.join(srcDir, 'services', 'audio.js') },
    { name: 'History', file: path.join(srcDir, 'services', 'history.js') },
    { name: 'Commands', file: path.join(srcDir, 'services', 'commands.js') },
    { name: 'Visualizer', file: path.join(srcDir, 'ui', 'visualizer.js') },
    { name: 'App', file: path.join(srcDir, 'ui', 'app.js') }
  ];

  let bundleContent = `/**
 * Architecture Helping Hand - Standalone Bundle v2.0.0
 * Compiled automatically from src/ modules. Works with file:/// and http:// protocols.
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
