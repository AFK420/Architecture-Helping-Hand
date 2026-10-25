/**
 * Architecture Helping Hand — Standalone Distribution Packager
 *
 * Gathers only the essential runtime files required to run Architecture Helping Hand
 * on any other computer (Windows 10/11) without Node.js, Python, or dev dependencies.
 *
 * Produces:
 *  1. dist/Architecture-Helping-Hand/  (Unpacked portable folder)
 *  2. dist/Architecture-Helping-Hand-v2.8.0.zip  (Ready-to-share ZIP archive)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createZipArchive } from '../src/core/export/zip-packager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TARGET_DIR = path.join(DIST_DIR, 'Architecture-Helping-Hand');
const ZIP_PATH = path.join(DIST_DIR, 'Architecture-Helping-Hand-v2.8.0.zip');

console.log('🚀 Packaging Architecture Helping Hand Standalone Edition...');

// 1. Ensure production bundle is freshly built
console.log('🔨 Step 1: Rebuilding production bundle...');
execSync(`"${process.execPath}" scripts/build.js`, { cwd: ROOT_DIR, stdio: 'inherit' });

// 2. Clean and create dist directories
if (fs.existsSync(TARGET_DIR)) {
  fs.rmSync(TARGET_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TARGET_DIR, { recursive: true });

// 3. Define essential runtime files and folders
const ESSENTIAL_ITEMS = [
  'Launch Architecture App.bat',
  'Install Desktop Shortcut.bat',
  'Uninstall Shortcut.bat',
  'HOW_TO_USE_AND_SHARE.txt',
  'index.html',
  'manifest.json',
  'sw.js',
  'assets',
  'css',
  'js/app.js'
];

/**
 * Recursively copies files or directories
 */
function copyItem(srcRelative) {
  const src = path.join(ROOT_DIR, srcRelative);
  const dest = path.join(TARGET_DIR, srcRelative);

  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Warning: item not found: ${srcRelative}`);
    return;
  }

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const children = fs.readdirSync(src);
    for (const child of children) {
      copyItem(path.join(srcRelative, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('📦 Step 2: Gathering essential runtime files into dist/Architecture-Helping-Hand...');
for (const item of ESSENTIAL_ITEMS) {
  copyItem(item);
  console.log(`  ✓ Included: ${item}`);
}

// 4. Collect all copied files for the ZIP packager
console.log('🗜️ Step 3: Compressing into portable ZIP archive...');
const zipEntries = [];

function collectZipFiles(currentDir, relativePrefix = '') {
  const entries = fs.readdirSync(currentDir);
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry);
    const relPath = relativePrefix ? `${relativePrefix}/${entry}` : entry;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectZipFiles(fullPath, relPath);
    } else {
      const buffer = fs.readFileSync(fullPath);
      zipEntries.push({
        name: `Architecture-Helping-Hand/${relPath}`,
        content: new Uint8Array(buffer)
      });
    }
  }
}

collectZipFiles(TARGET_DIR);

const zipBytes = createZipArchive(zipEntries);
fs.writeFileSync(ZIP_PATH, Buffer.from(zipBytes));

const zipStats = fs.statSync(ZIP_PATH);
const zipSizeMb = (zipStats.size / (1024 * 1024)).toFixed(2);

console.log('\n======================================================================');
console.log('🎉 STANDALONE DISTRIBUTION PACKAGE CREATED SUCCESSFULLY!');
console.log('======================================================================');
console.log(`📁 Unpacked Folder : ${TARGET_DIR}`);
console.log(`📦 Shareable ZIP   : ${ZIP_PATH} (${zipSizeMb} MB, ${zipEntries.length} files)`);
console.log('======================================================================\n');
