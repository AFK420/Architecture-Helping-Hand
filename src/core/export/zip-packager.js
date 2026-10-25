/**
 * Architecture Helping Hand — Zero-Dependency Standalone ZIP Packager
 *
 * Implements standard PKZIP 2.0 (Store / Method 0) in pure JavaScript.
 * Allows client-side bundling of multiple CAD files (DXF, LSP, SCR, TXT)
 * into a single archive so modern browsers never block multi-file downloads.
 */

import { furnitureAssetDXF, categoryToToolPaletteDXF } from '../furniture-assets.js';
import { generateAutoLispBlock, generateAutoCadBatchDwgScript } from './autocad-scripts.js';
import { generateAiaLayersAutoLisp } from '../cad-bim-automation.js';

/** Pre-computed CRC32 lookup table for high-speed checksumming */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/**
 * Calculates standard IEEE 802.3 32-bit CRC.
 *
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Creates a valid, uncompressed standard ZIP archive buffer (PKZIP 2.0).
 *
 * @param {Array<{name: string, content: string|Uint8Array}>} files
 * @returns {Uint8Array} Valid ZIP file binary bytes
 */
export function createZipArchive(files) {
  const enc = new TextEncoder();
  const fileEntries = [];
  let offset = 0;
  const parts = [];

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const dataBytes = typeof file.content === 'string' ? enc.encode(file.content) : file.content;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header: 30 bytes + filename
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed: 2.0
    view.setUint16(6, 0x0800, true);      // General purpose bit flag (UTF-8 filename)
    view.setUint16(8, 0, true);           // Compression: 0 (Store)
    view.setUint16(10, 0, true);          // Last mod time
    view.setUint16(12, 0, true);          // Last mod date
    view.setUint32(14, crc, true);        // CRC-32
    view.setUint32(18, size, true);       // Compressed size
    view.setUint32(22, size, true);       // Uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);          // Extra field length
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(dataBytes);

    fileEntries.push({ nameBytes, crc, size, offset });
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirStart = offset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    // Central directory file header: 46 bytes + filename
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central dir signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed: 2.0
    view.setUint16(8, 0x0800, true);      // UTF-8 flag
    view.setUint16(10, 0, true);          // Compression: 0
    view.setUint16(12, 0, true);          // Last mod time
    view.setUint16(14, 0, true);          // Last mod date
    view.setUint32(16, entry.crc, true);  // CRC-32
    view.setUint32(20, entry.size, true); // Compressed size
    view.setUint32(24, entry.size, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);          // Extra field length
    view.setUint16(32, 0, true);          // File comment length
    view.setUint16(34, 0, true);          // Disk number start
    view.setUint16(36, 0, true);          // Internal attributes
    view.setUint32(38, 0, true);          // External attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header
    cdHeader.set(entry.nameBytes, 46);

    parts.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of central directory record (EOCD): 22 bytes
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);                  // Disk number
  eocdView.setUint16(6, 0, true);                  // CD disk number
  eocdView.setUint16(8, files.length, true);       // Total entries on this disk
  eocdView.setUint16(10, files.length, true);      // Total entries
  eocdView.setUint32(12, centralDirSize, true);    // Size of central directory
  eocdView.setUint32(16, centralDirStart, true);   // Offset of central directory
  eocdView.setUint16(20, 0, true);                 // Comment length
  parts.push(eocd);

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const archive = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    archive.set(part, pos);
    pos += part.length;
  }
  return archive;
}

/**
 * Builds a complete CAD Package (.zip) for an individual object.
 *
 * @param {object} asset
 * @param {object} [options]
 * @param {string} [options.view='plan'] 'plan', 'front', or 'side'
 * @param {boolean} [options.includeClearance=false]
 * @returns {Uint8Array}
 */
export function generateCadPackageZip(asset, options = {}) {
  const view = options.view || 'plan';
  const suffix = view !== 'plan' ? `-${view}` : '';
  const baseName = `${asset.id}${suffix}-${asset.dimensions.widthMm}x${asset.dimensions.depthMm}mm`;
  const dxfName = `${baseName}.dxf`;
  const lspName = `${asset.id}${suffix}-injector.lsp`;
  const scrName = `convert_to_dwg.scr`;

  const dxfData = furnitureAssetDXF(asset, { view, includeClearance: options.includeClearance });
  const lspData = generateAutoLispBlock(asset, { view, includeClearance: options.includeClearance });
  const scrData = generateAutoCadBatchDwgScript([dxfName]);

  const blockCmd = 'AHH_' + String(asset.id || 'OBJECT').toUpperCase().replace(/[^A-Za-z0-9_]/g, '_') + (view === 'front' ? '_FRONT' : view === 'side' ? '_SIDE' : '');

  const guide = [
    `========================================================================`,
    `ARCHITECTURE HELPING HAND — CAD BLOCK PACKAGE (1:1 MILLIMETERS)`,
    `========================================================================`,
    `Asset Name:   ${asset.name}`,
    `View:         ${view.toUpperCase()}`,
    `Size:         ${asset.dimensions.widthMm} x ${asset.dimensions.depthMm}${asset.dimensions.heightMm ? ' x ' + asset.dimensions.heightMm : ''} mm`,
    `CAD Layer:    ${asset.planGeometry[0]?.layer || 'A-FURN'}`,
    `Standards:    AIA NCS 6.0 / ISO 13567 Standard Layer Names`,
    ``,
    `------------------------------------------------------------------------`,
    `METHOD 1: OPEN DIRECTLY IN AUTOCAD & SAVE AS .DWG (RECOMMENDED)`,
    `------------------------------------------------------------------------`,
    `1. Double-click '${dxfName}'. AutoCAD opens it natively right away.`,
    `2. Press Ctrl + Shift + S (or type SAVEAS in the command line).`,
    `3. Select "AutoCAD Drawing (*.dwg)" and click Save.`,
    `   -> You now have the native .dwg file!`,
    ``,
    `------------------------------------------------------------------------`,
    `METHOD 2: INSERT DIRECTLY INTO AN EXISTING DWG PROJECT`,
    `------------------------------------------------------------------------`,
    `1. Open your project drawing (.dwg) in AutoCAD.`,
    `2. Type INSERT (or CLASSICINSERT) in the AutoCAD command prompt.`,
    `3. Browse to '${dxfName}' and click OK.`,
    `4. Click where you want to place the block in your drawing.`,
    ``,
    `------------------------------------------------------------------------`,
    `METHOD 3: DRAG & DROP AUTOLISP BLOCK INJECTOR (.LSP)`,
    `------------------------------------------------------------------------`,
    `1. Drag and drop '${lspName}' directly into any open AutoCAD .dwg window.`,
    `2. Type the command: ${blockCmd}`,
    `3. The block is created and inserted directly into your drawing.`,
    ``,
    `------------------------------------------------------------------------`,
    `METHOD 4: 1-CLICK AUTOCAD BATCH CONVERTER (.SCR)`,
    `------------------------------------------------------------------------`,
    `1. Drag and drop '${scrName}' into AutoCAD, or type SCRIPT and select it.`,
    `2. AutoCAD will automatically import '${dxfName}', zoom extents, and save`,
    `   a native .dwg drawing file in the same folder.`,
    `========================================================================`
  ].join('\r\n');

  return createZipArchive([
    { name: dxfName, content: dxfData },
    { name: lspName, content: lspData },
    { name: scrName, content: scrData },
    { name: 'AUTOCAD_DWG_GUIDE.txt', content: guide }
  ]);
}

/**
 * Builds a complete Category CAD Palette Pack (.zip) for all objects in a category.
 *
 * @param {Array<object>} items
 * @param {object} [options]
 * @returns {Uint8Array}
 */
export function generateCategoryPackZip(items, options = {}) {
  const dxfName = `autocad-palette-${items.length}-blocks.dxf`;
  const scrName = `convert_palette_to_dwg.scr`;
  const lspName = `setup_aia_layers.lsp`;

  const dxfData = categoryToToolPaletteDXF(items, { includeClearance: options.includeClearance });
  const scrData = generateAutoCadBatchDwgScript([dxfName]);
  const lspData = generateAiaLayersAutoLisp();

  const guide = [
    `========================================================================`,
    `ARCHITECTURE HELPING HAND — AUTOCAD PALETTE PACK (${items.length} CAD BLOCKS)`,
    `========================================================================`,
    `Total Blocks: ${items.length} 1:1 Millimeter CAD Blocks`,
    `Standards:    AIA NCS 6.0 Standard Layers (A-FURN, A-DOOR, A-CLEARANCE)`,
    ``,
    `FILES INCLUDED:`,
    `1. '${dxfName}'`,
    `   Full multi-block sheet. Double-click to open in AutoCAD at 1:1 scale.`,
    ``,
    `2. '${scrName}'`,
    `   AutoCAD script for 1-click batch conversion from DXF to native .dwg.`,
    ``,
    `3. '${lspName}'`,
    `   AutoLISP script that instantly creates all 24 certified AIA NCS layers`,
    `   in any active DWG with standard colors, linetypes, and lineweights.`,
    `========================================================================`
  ].join('\r\n');

  return createZipArchive([
    { name: dxfName, content: dxfData },
    { name: scrName, content: scrData },
    { name: lspName, content: lspData },
    { name: 'AUTOCAD_PALETTE_GUIDE.txt', content: guide }
  ]);
}
