/**
 * Architecture Helping Hand — Standalone ZIP Packager Test Suite
 *
 * Verifies:
 *   1. Standard CRC32 calculation
 *   2. PKZIP 2.0 uncompressed archive generation (local headers, CD headers, EOCD)
 *   3. CAD Package ZIP generation for individual furniture assets (DXF + LSP + SCR + TXT)
 *   4. Category Pack ZIP generation for multi-block catalogs
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ZP = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'export', 'zip-packager.js')).href);
const FA = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'furniture-assets.js')).href);
const F = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'furniture.js')).href);

const { createZipArchive, crc32, generateCadPackageZip, generateCategoryPackZip } = ZP;
const { createFurnitureAsset } = FA;
const { FURNITURE_DATABASE } = F;

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

console.log('🧪 Running tests/zip-packager.test.js...');

// --- 1. CRC32 Checksums ---
const enc = new TextEncoder();
assert(crc32(enc.encode('123456789')) === 0xCBF43926, 'crc32 computes standard 0xCBF43926 for "123456789"');
assert(crc32(enc.encode('')) === 0, 'crc32 computes 0 for empty string');

// --- 2. Archive Generation & Structure ---
const files = [
  { name: 'test.dxf', content: '0\nSECTION\n0\nEOF\n' },
  { name: 'test.lsp', content: '; AutoLISP block' },
  { name: 'AUTOCAD_DWG_GUIDE.txt', content: 'AutoCAD instructions' }
];
const zip = createZipArchive(files);
assert(zip instanceof Uint8Array, 'createZipArchive returns Uint8Array');
assert(zip.length > 200, 'Zip file has expected minimum length');
assert(zip[0] === 0x50 && zip[1] === 0x4B && zip[2] === 0x03 && zip[3] === 0x04, 'Zip starts with PK\\x03\\x04 local header magic');

const eocdPos = zip.length - 22;
assert(zip[eocdPos] === 0x50 && zip[eocdPos + 1] === 0x4B && zip[eocdPos + 2] === 0x05 && zip[eocdPos + 3] === 0x06, 'Zip ends with PK\\x05\\x06 EOCD magic');

// --- 3. Individual CAD Package ZIP ---
const item = FURNITURE_DATABASE.find(f => f.id === 'sofa-3p') || FURNITURE_DATABASE[0];
const asset = createFurnitureAsset(item);
const cadZip = generateCadPackageZip(asset, { view: 'plan', includeClearance: true });
assert(cadZip instanceof Uint8Array, 'generateCadPackageZip returns binary Uint8Array');
assert(cadZip.length > 500, 'CAD package zip size is substantial');
assert(cadZip[0] === 0x50 && cadZip[1] === 0x4B, 'CAD package zip starts with PK magic');

// Check elevation CAD packages
const frontZip = generateCadPackageZip(asset, { view: 'front' });
assert(frontZip instanceof Uint8Array && frontZip.length > 500, 'Generates front elevation CAD pack');
const sideZip = generateCadPackageZip(asset, { view: 'side' });
assert(sideZip instanceof Uint8Array && sideZip.length > 500, 'Generates side elevation CAD pack');

// --- 4. Category Pack ZIP ---
const catItems = FURNITURE_DATABASE.filter(f => f.category === 'living-room').slice(0, 4);
const catZip = generateCategoryPackZip(catItems, { includeClearance: true });
assert(catZip instanceof Uint8Array, 'generateCategoryPackZip returns binary Uint8Array');
assert(catZip.length > 1000, 'Category pack zip contains multi-block DXF and script');
assert(catZip[0] === 0x50 && catZip[1] === 0x4B, 'Category pack starts with PK magic');

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
